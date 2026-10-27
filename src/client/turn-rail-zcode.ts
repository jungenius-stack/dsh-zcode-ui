/**
 * 宿主轮次导航 → ZCode 3.16.3 索引 hover 递进。
 *
 * 背景：宿主 nav[aria-label="轮次导航"] 的动效只做「当前条」：
 *   静息 scaleX(.4) → hover 条 scaleX(.9)，邻居完全不动（2026-10-26 CDP 实测）。
 * ZCode 的动效是**递进波**：hover 第 N 条时，±2 条一起胀开：
 *   距离 0 → 12px × 2.6 = 31.2px，opacity 1
 *   距离 1 → 12px × 1.7 = 20.4px，opacity .86
 *   距离 2 → 12px × 1.25 = 15px，opacity .72
 *   距离 ≥3 → 12px × 1，opacity .58
 * 全部过渡 .15s cubic-bezier(0, 0, .2, 1)。
 *
 * 宿主只给一个状态位，无法从 CSS 表达「按距离递进」，所以这里接管指针：
 * 监听 nav 上的 pointermove，按 clientY 反算命中的第几条，再给每条按钮的
 * ::before 写内联 --dcu-zcode-* 变量。
 *
 * 规格来源：优化UI插件区/ZCODE-INDEX-SPEC.md（CDP 实测，非推测）。
 */

import { animateScroll, conversationScroller, scrollAnims } from './scroll-anim.ts'

const NAV_SELECTOR = 'nav[data-dcu-official-turn-navigator]'
const BUTTON_SELECTOR = 'button'
const ITEM_HEIGHT = 10
const TAILWIND_EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)'
const DURATION = '0.15s'
const IDLE_OPACITY = '0.58'
/**
 * 距离 → [缩放, 透明度, 是否用全前景色]。
 *
 * 前两列来自 CDP 实测；第三列来自 ZCode bundle 源码 + 实测：
 * hover d0 时 `colorTone: 'focus'` → `bg-foreground`（全前景色），
 * 而静息与 d1/d2 都是 `oklab(0.87 0 0 / 0.3)`（30% 半透明）。
 * 只调 opacity 不变色会让峰值一眼看出不是 ZCode（2026-10-26 对照报告坑 2）。
 */
const WAVE: readonly [number, number, boolean][] = [
  [2.6, 1, true],
  [1.7, 0.86, false],
  [1.25, 0.72, false],
]
/** 当前轮（滚动所在位置）的静息强调：ZCode 实测 opacity .9 + 全前景色。 */
const ACTIVE_OPACITY = '0.9'

interface RailState {
  buttons: HTMLElement[]
  activeIndex: number | null
  /** 是否已真正写过一次样式；undefined = 有待写（配合 syncButtonCount 重建）。 */
  applied?: boolean
}

const rails = new WeakMap<HTMLElement, RailState>()
let observer: MutationObserver | undefined
let bound = false

function applyHover(rail: HTMLElement, hoverIndex: number | null): void {
  const state = rails.get(rail)
  if (state === undefined) return
  // 用哨兵 undefined 表示「尚未写过」，区别于 null（静息态）。
  // 否则 syncButtonCount 重建 state（activeIndex=null）后紧接着 applyHover(rail, null)
  // 会被早退挡掉，当前轮高亮永远不生效。
  if (state.activeIndex === hoverIndex && hoverIndex !== null) return
  if (state.activeIndex === hoverIndex && state.applied === true) return
  state.activeIndex = hoverIndex
  state.applied = true
  // 当前轮：宿主自己维护 aria-current 并随滚动更新，直接读它，不要用指针几何重算
  // （重算会因 scroller 滚动位移而错位，见对照报告坑 3）。
  const activeButton = rail.querySelector<HTMLElement>('button[aria-current]')
  state.buttons.forEach((button, index) => {
    const distance = hoverIndex === null ? Number.POSITIVE_INFINITY : Math.abs(index - hoverIndex)
    const wave = WAVE[distance]
    const scale = wave === undefined ? 1 : wave[0]
    // 静息时：当前轮用 .9 强调；其余 .58。hover 时整条波覆盖，当前轮让位（ZCode 语义）。
    const isActive = button === activeButton
    const opacity = wave === undefined
      ? (hoverIndex === null && isActive ? ACTIVE_OPACITY : IDLE_OPACITY)
      : String(wave[1])
    const full = wave !== undefined && wave[2]
    button.style.setProperty('--dcu-zcode-scale', String(scale))
    button.style.setProperty('--dcu-zcode-opacity', opacity)
    if (full || (hoverIndex === null && isActive)) {
      button.style.setProperty('--dcu-zcode-color', 'var(--dsw-alias-label-primary)')
    } else {
      button.style.removeProperty('--dcu-zcode-color')
    }
  })
  /* 时序：applyHover 跑在 pointermove 里，此刻预览框的内容与高度都还是上一条的
     （实测滞后一拍：idx20 该补 9px 却读到 h=98 没补；idx30 该补 0 却按旧值补了 9px）。
     双 rAF 后宿主已完成内容渲染与布局，量到的 height 才对应本条。
     再叠一层 setTimeout(0) 是因为宿主在 rAF 之后还有一次状态提交。 */
  if (hoverIndex !== null) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { setTimeout(() => { fixPreviewOffset(rail) }, 0) })
    })
  }
}

function indexFromPoint(rail: HTMLElement, clientY: number): number | null {
  const state = rails.get(rail)
  if (state === undefined || state.buttons.length === 0) return null
  // 优先用按钮自身几何逐个命中——不依赖「nav 顶部 + 固定 10px 反推」，
  // 因为 nav 内含 scroller（max-height 420px、可滚动），滚动后 nav rect 不含
  // 滚动位移，反推会整体错位（2026-10-26 对照报告坑 3，39 条即贴上限）。
  for (let index = 0; index < state.buttons.length; index += 1) {
    const rect = state.buttons[index].getBoundingClientRect()
    if (rect.height > 0 && clientY >= rect.top && clientY < rect.bottom) return index
  }
  // 兜底：找不到精确命中时按 marks 容器（自带滚动位移）平均分配。
  const first = state.buttons[0].getBoundingClientRect()
  const last = state.buttons[state.buttons.length - 1].getBoundingClientRect()
  const span = last.bottom - first.top
  if (span <= 0) return null
  const ratio = (clientY - first.top) / span
  if (ratio < 0 || ratio >= 1) return null
  return Math.min(state.buttons.length - 1, Math.floor(ratio * state.buttons.length))
}

/**
 * G5（04-open-gaps）：补齐读屏用的次级 aria 属性。
 *
 * ZCode：每个刻度带 aria-posinset（第几条）/ aria-setsize（共几条），
 * nav 在水合期间带 aria-busy="true"。
 *
 * 近似说明（按要求写明近似）：
 * 宿主没有暴露「是否已水合完成」的状态，这里用「未加载刻度占比」近似 ——
 * 仍有 markUnloaded 的条目时视为仍在加载，给 nav 挂 aria-busy="true"。
 * 这是近似，不是宿主的真实水合信号。
 */
function applyAriaMetadata(rail: HTMLElement, buttons: HTMLElement[]): void {
  const size = buttons.length
  let unloaded = 0
  buttons.forEach((button, index) => {
    button.setAttribute('aria-posinset', String(index + 1))
    button.setAttribute('aria-setsize', String(size))
    if (button.className.includes('Unloaded')) unloaded += 1
  })
  if (unloaded > 0) {
    rail.setAttribute('aria-busy', 'true')
    rail.setAttribute('data-dcu-rail-unloaded', String(unloaded))
  } else {
    rail.removeAttribute('aria-busy')
    rail.removeAttribute('data-dcu-rail-unloaded')
  }
}

function syncButtonCount(rail: HTMLElement): void {
  const buttons = Array.from(rail.querySelectorAll<HTMLElement>(BUTTON_SELECTOR))
  applyAriaMetadata(rail, buttons)
  const state = rails.get(rail)
  if (state === undefined || state.buttons.length !== buttons.length) {
    rails.set(rail, { buttons, activeIndex: null, applied: false })
    buttons.forEach((button) => {
      button.style.setProperty('--dcu-zcode-scale', '1')
      button.style.setProperty('--dcu-zcode-opacity', IDLE_OPACITY)
    })
    return
  }
  state.buttons = buttons
}

function bindRail(rail: HTMLElement): void {
  if (rails.has(rail) && (rail as HTMLElement & { __dcuZcodeBound?: boolean }).__dcuZcodeBound === true) {
    syncButtonCount(rail)
    return
  }
  ;(rail as HTMLElement & { __dcuZcodeBound?: boolean }).__dcuZcodeBound = true
  installClickSmooth(rail)
  syncButtonCount(rail)
  // 先应用一次静息态，让「当前轮」的强调立即生效（否则要等第一次 hover）。
  applyHover(rail, null)
  // 宿主滚动时会改 aria-current，跟着重算一次静息强调。
  rail.addEventListener('scroll', () => { applyHover(rail, rails.get(rail)?.activeIndex ?? null) }, true)
  rail.addEventListener('pointermove', (event) => {
    applyHover(rail, indexFromPoint(rail, event.clientY))
  })
  rail.addEventListener('pointerleave', () => {
    applyHover(rail, null)
  })
  /* 键盘焦点波：ZCode 在 onFocus 时也会触发 ±2 条的递进（源码 visualFocus）。
     指针事件不会因 focus 触发，必须单独接 focusin/focusout，否则键盘用户
     看不到任何焦点反馈（2026-10-26 验收实测：focus 第 10 条时 litIdx=-1）。 */
  rail.addEventListener('focusin', (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const index = rails.get(rail)?.buttons.indexOf(target) ?? -1
    if (index >= 0) applyHover(rail, index)
  })
  rail.addEventListener('focusout', (event) => {
    const next = event.relatedTarget
    if (next instanceof Node && rail.contains(next)) return
    applyHover(rail, null)
  })
}

/**
 * G3（04-open-gaps）：让当前条始终留在 rail 视野内。
 *
 * ZCode：aria-current 变化时 `scrollToIndex(active, align:'auto')`，
 * 当前条永不被滚出导航区。
 * DSH 之前完全没有这个机制：rail 可滚（如 45 条 = 450px > 420px）时，
 * 用户滚会话到中段，当前条可能在 rail 视口外，rail 永远停在原位。
 *
 * 注意：只滚 **rail 内部 scroller**，不要用 scrollIntoView 的默认行为
 * ——它会连带滚动所有可滚祖先，把会话区（[data-conversation-scroll]）也拽走。
 * 这里手算偏移，直接改 rail scroller 的 scrollTop。
 */
function keepActiveVisible(rail: HTMLElement): void {
  const active = rail.querySelector<HTMLElement>('button[aria-current]')
  if (active === null) return
  // 宿主的可滚动容器是 rail 内第一个 overflow-y:auto 的后代
  let scroller: HTMLElement | null = null
  for (const el of Array.from(rail.querySelectorAll<HTMLElement>('*'))) {
    const overflowY = window.getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      scroller = el
      break
    }
  }
  if (scroller === null) return
  const box = scroller.getBoundingClientRect()
  const rect = active.getBoundingClientRect()
  if (rect.height <= 0 || box.height <= 0) return
  // align:'auto' 语义：完全可见就不动；越界多少补多少，不做居中。
  if (rect.top < box.top) {
    scroller.scrollTop -= box.top - rect.top
  } else if (rect.bottom > box.bottom) {
    scroller.scrollTop += rect.bottom - box.bottom
  }
}

function scan(): void {
  document.querySelectorAll<HTMLElement>(NAV_SELECTOR).forEach((rail) => {
    bindRail(rail)
    /* 宿主的 aria-current 是「随滚动异步出现」的：nav 刚挂载时还没有任何一条被标记，
       此时 applyHover(rail, null) 写不出当前轮强调。每次 scan 都重算一次，
       MutationObserver 会在 aria-current 加上/变化时再触发 scan。 */
    const state = rails.get(rail)
    if (state !== undefined) {
      state.applied = false
      applyHover(rail, state.activeIndex)
    }
  })
}

/**
 * 浮层垂直补偿（只在宿主**未钳制**时生效）。
 *
 * 宿主定位：`top = --turn-preview-center - 50`（固定 50，不是 height/2），
 * 且两端会被钳制：顶部 `top >= 0`、底部 `top <= 容器高 - 框高 - 2`。
 * 框高常态 98px，此时 `-50` 恰好≈半高，看不出问题；
 * 但「只有提问、没有回答」的轮次框高只有 40px，按 50 偏移就偏上 30px。
 *
 * 2026-10-26 验收补充：均匀补偿 `(98px - 100%)/2` 在**钳制区**会变成双重位移
 * （宿主先钳 top，我再 translate，实测 idx3 偏差 35px、idx42 偏差 -35px）。
 * 所以必须判断「理想 top 是否越界」：越界说明宿主已经钳过，不能再补偿。
 */
const PREVIEW_SELECTOR = '.JXrxFq_preview'
const PREVIEW_HALF = 50
const PREVIEW_NORMAL_H = 98

function fixPreviewOffset(rail: HTMLElement): void {
  const preview = rail.querySelector<HTMLElement>(PREVIEW_SELECTOR)
  if (preview === null) return
  const railRect = rail.getBoundingClientRect()
  const rect = preview.getBoundingClientRect()
  if (rect.height <= 0) return
  const target = Number.parseFloat(preview.style.getPropertyValue('--turn-preview-center'))
  if (!Number.isFinite(target)) return
  /*
   * 只在「宿主未钳制」时补偿高度差；一旦钳制就设 0。
   *
   * 原因（2026-10-26 实测三次确认）：宿主先把 top 夹到 [0, railH - h - 2]，
   * 钳制后框已经贴着容器边缘。此时若再加任何 offset，等于在已贴边的位置上
   * 再推一把，会把框推离目标更远——实测加「贴边避让」后末条误差从 -35px 恶化到 -69px。
   * 所以钳制区的正确做法是 offset = 0，让宿主的贴边行为自己生效。
   */
  /*
   * 2026-10-26 起改为 **ZCode 口径：顶对齐**（CDP 实测 ZCode 三条刻度 topDelta 恒为 0）。
   * 顶对齐后不再需要任何垂直补偿：浮层顶 = 当前 hover 刻度顶，
   * 也就不会出现「居中在容器两端被钳位导致 28~48px 偏差」的问题。
   *
   * 宿主的 top 由 --turn-preview-center（中心位置）驱动，我们要把它换算成刻度顶：
   *   previewTop = 刻度顶相对导航的偏移 = center - 5（每条刻度高 10px，中心距顶 5px）
   * 这里直接读被 hover 的按钮几何，不猜。
   */
  const state = rails.get(rail)
  const hoverIndex = state?.activeIndex
  const activeButton = hoverIndex !== null && hoverIndex !== undefined
    ? state?.buttons[hoverIndex]
    : null
  if (activeButton !== undefined && activeButton !== null) {
    const btnRect = activeButton.getBoundingClientRect()
    preview.style.setProperty('--dcu-preview-top', `${btnRect.top - railRect.top}px`)
  }
  preview.style.setProperty('--dcu-preview-shift', '0px')
}

/**
 * 点击刻度的平滑滚动。
 *
 * 宿主点击后是**瞬跳**（实测 scrollTop 7796 → 5231，只有 2 个不同值，bigJump=true）。
 * ZCode 是 `behavior:'smooth'` 的缓动动画，这是用户「一比一复刻」口径里最明显的一项。
 *
 * 做法（不逆向宿主内部映射，零猜测）：
 *   capture 阶段拦下 click → 记 scrollTop₀ → 放行宿主完成跳转
 *   → 下一帧读 scrollTop₁ → 回写 scrollTop₀ → 自己缓动到 scrollTop₁。
 *
 * 为什么不用容器上的 `scroll-behavior:smooth`：
 * 宿主「跟随底部」会在每次流式 tick 赋值 scrollTop，那条 CSS 会把那些赋值
 * 也变成动画，导致滚动永远追不上新消息（报告二已把这个陷阱拦下）。
 * 这里只在点击时临时接管，动画结束立刻释放，不影响跟随底部。
 */

/**
 * 点击后的即时反馈（解决「点了没反应」）。
 *
 * 实测（五轮验收报告坑 2）：点击远距离刻度时，宿主跨数万像素挂载内容需要 ~1 秒，
 * 这段期间 scrollTop 完全不动、界面上没有任何变化——用户会以为点击没生效而重复点。
 * 这段等待是宿主侧成本，插件无法缩短，但可以**把「无响应」变成「已受理」**：
 * 让被点击的刻度立刻进入 peak 态（scaleX 2.6 / 全前景色），停留 ~260ms 再交还给正常 hover 逻辑。
 *
 * 纯视觉、不改滚动、无副作用；即使后续宿主跳转失败，用户也只会看到刻度闪了一下。
 */
const CLICK_FEEDBACK_MS = 260

function flashClickedTick(rail: HTMLElement, button: HTMLElement): void {
  button.style.setProperty('--dcu-zcode-scale', '2.6')
  button.style.setProperty('--dcu-zcode-opacity', '1')
  button.style.setProperty('--dcu-zcode-color', 'var(--dsw-alias-label-primary)')
  window.setTimeout(() => {
    // 交还：把当前 hover 状态重新应用一次，避免与指针位置脱节。
    const state = rails.get(rail)
    if (state !== undefined) {
      state.applied = false
      applyHover(rail, state.activeIndex)
    }
  }, CLICK_FEEDBACK_MS)
}

function installClickSmooth(rail: HTMLElement): void {
  if ((rail as HTMLElement & { __dcuSmoothBound?: boolean }).__dcuSmoothBound === true) return
  ;(rail as HTMLElement & { __dcuSmoothBound?: boolean }).__dcuSmoothBound = true
  rail.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button')
    if (button === null || !rail.contains(button)) return
    const scroller = conversationScroller()
    if (scroller === null) return
    // 已加载的轮次才有意义；markUnloaded 的按钮点下去会触发异步加载，交给宿主。
    if (button.className.includes('Unloaded')) return

    /*
     * 核心：**彻底阻止宿主的瞬跳**，而不是"放行再回滚"。
     *
     * 实测（2026-10-26 四轮验收，高频 5ms 采样）：
     *   "放行 → setTimeout(0) 回滚" 会留下 280~700ms 的闪跳窗口：
     *   604ms 起点 4214 → 670ms 宿主已跳到 64269 → 989ms 我才开始回滚，
     *   用户先看到"跳到远处的另一处"，再看到"慢慢滑回来"，全程 10 个可见步。
     *   原因是 setTimeout 的下界不是 0ms，且宿主跳转在渲染上先于我的回滚落地。
     *
     * 改为：**preventDefault + stopPropagation 直接掐断**，宿主拿不到这次点击，
     * 再由我读目标位置自己要滚到哪里。
     *
     * 目标位置从哪来？宿主的按钮带 `data-index`，但没有暴露「该轮对应的 scrollTop」。
     * 所以这里用一个**无副作用的探测**：临时阻止事件、记录 scrollTop，
     * 然后**主动调用宿主同一次点击但只读结果**是做不到的（宿主没有公开 API）。
     * 因此改为**几何推算**：用相邻轮次在本轮的相对位置估算目标滚动量。
     * —— 但实测发现宿主每轮高度差异很大（含代码块/工具调用），几何推算误差大。
     *
     * 最终采用：仍然放行宿主跳转，但把回滚提前到**同一个任务内同步完成**，
     * 借助 `scroll` 事件的 capture 阶段在宿主写入后立刻截获并回滚，
     * 从而把闪跳窗口压到 1 帧以内（宿主写入与我的回滚在同一帧渲染前）。
     */
    const from = scroller.scrollTop
    flashClickedTick(rail, button)
    let hijacked = false
    const onScroll = (): void => {
      if (hijacked) return
      const now = scroller.scrollTop
      if (Math.abs(now - from) < 4) return
      hijacked = true
      scroller.scrollTop = from
      scroller.removeEventListener('scroll', onScroll, true)
      animateScroll(scroller, now)
    }
    scroller.addEventListener('scroll', onScroll, true)
    // 兜底：若宿主这一下没有改 scrollTop（比如点的是当前轮），1 帧后自行卸掉监听。
    requestAnimationFrame(() => {
      if (!hijacked) scroller.removeEventListener('scroll', onScroll, true)
    })
  }, true)
}

/** 启动：宿主导航是懒挂载的，用 MutationObserver 等它出现。 */
export function observeZcodeTurnRail(): void {
  if (bound || typeof document === 'undefined') return
  bound = true
  scan()
  observer = new MutationObserver((records) => {
    /* 属性变更（aria-current 移位）不改变 DOM 结构，只跑 scan() 会走同一个入口，
       但 scan 里有「applied=false 后重量」的逻辑，足够让高亮跟上。
       2026-10-26 验收实测：只订阅 childList 时，滚到中段/底部后高亮钉在旧条
       （aria-current=32 而强调仍是 18），滚动到顶恰好碰上一次 childList 才碰巧对。 */
    const hasAttributeChange = records.some((record) => record.type === 'attributes')
    if (hasAttributeChange) {
      document.querySelectorAll<HTMLElement>(NAV_SELECTOR).forEach((rail) => {
        const state = rails.get(rail)
        if (state === undefined) return
        state.applied = false
        applyHover(rail, state.activeIndex)
        keepActiveVisible(rail)
      })
      return
    }
    scan()
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-current'],
  })
}

export function stopZcodeTurnRail(): void {
  observer?.disconnect()
  observer = undefined
  bound = false
}

/** 导出给断言用：距离 → 期望的实际宽度。 */
export function zcodeTickWidth(distance: number): number {
  const wave = WAVE[distance]
  return 12 * (wave === undefined ? 1 : wave[0])
}

export const ZCODE_RAIL_TIMING = { duration: DURATION, easing: TAILWIND_EASE_OUT, itemHeight: ITEM_HEIGHT }
