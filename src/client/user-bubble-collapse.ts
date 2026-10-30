/**
 * G18 用户气泡长文本折叠 —— 对齐 ZCode（asar 静态提取 + 9224 活页实测，2026-10-28）。
 *
 * ZCode 真实参数（MessageResponse 的 O4t 组件）：
 *   折叠高度 120px；溢出判定 scrollHeight > 120 + 1；
 *   展开高度 max(scrollHeight, 120)px；过渡走 collapse 档令牌（300ms / .4,0,.2,1）；
 *   溢出且未展开时内容底部渐隐（mask 70% → 100%）；prefers-reduced-motion 关闭过渡；
 *   展开钮仅在溢出时出现，aria-expanded / aria-label=展开|收起，图标 16px；
 *   正文变化后回到折叠态。
 *
 * 宿主结构（9223 实测 9/9 一致）：
 *   .IzP3Va_userStack > .IzP3Va_bubble > span.B0oWoG_root(display:contents) > 正文
 * 根节点是 display:contents，没有盒子可限高 —— 由 conversation-layout 的 CSS 把它
 * 变成块盒（只改属性）。本模块只写 inline max-height、注入一个按钮、维护
 * data-dcu-bubble-* 状态；不隐藏、不搬移、不拆分宿主任何节点。
 *
 * 历史教训：旧版「用户卡片 + 长文本展开」因改写气泡结构、且把 data 标记误打到
 * 应答尾部而被撤回（见 conversation-bubbles.ts 与 tests/conversation-bubbles.assert.ts）。
 * 因此这里只认 .IzP3Va_userStack 内的气泡，且不碰附件/引用节点。
 */

const BUBBLE_SELECTOR = '[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble'
const USER_STACK_SELECTOR = '.IzP3Va_userStack'
/** 侧栏开合动画期间的标记（与 official-turn-navigator / sidebar-width 共用同一属性名）。 */
const SIDEBAR_MOTION_ATTRIBUTE = 'data-dcu-sidebar-motion'
const TOGGLE_CLASS = 'dcu-bubble-toggle'
const OVERFLOW_ATTR = 'data-dcu-bubble-overflow'
const STATE_ATTR = 'data-dcu-bubble-state'

/** ZCode 折叠高度（内容区，不含气泡 padding）。 */
const COLLAPSED_PX = 120
/** ZCode 的溢出余量：scrollHeight > 120 + 1 才算溢出，避免 1px 取整误判。 */
const OVERFLOW_SLACK = 1

const CHEVRON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5 8 10l4-3.5"/></svg>'

interface BubbleState {
  text: string
  expanded: boolean
}

const states = new WeakMap<HTMLElement, BubbleState>()

function toggleLabel(expanded: boolean): string {
  const lang = (document.documentElement.lang || navigator.language || 'zh').toLowerCase()
  const zh = lang.startsWith('zh')
  if (expanded) return zh ? '收起' : 'Collapse'
  return zh ? '展开' : 'Expand'
}

function findToggle(bubble: HTMLElement): HTMLButtonElement | null {
  for (const child of bubble.children) {
    if (child instanceof HTMLButtonElement && child.classList.contains(TOGGLE_CLASS)) return child
  }
  return null
}

function ensureToggle(bubble: HTMLElement): HTMLButtonElement {
  const existing = findToggle(bubble)
  if (existing !== null) return existing
  const button = document.createElement('button')
  button.type = 'button'
  button.className = TOGGLE_CLASS
  button.innerHTML = CHEVRON
  button.addEventListener('click', () => {
    const state = states.get(bubble)
    if (state === undefined) return
    state.expanded = !state.expanded
    apply(bubble, state)
  })
  bubble.append(button)
  return button
}

function contentOf(bubble: HTMLElement): HTMLElement | null {
  for (const child of bubble.children) {
    if (child.classList.contains(TOGGLE_CLASS)) continue
    return child instanceof HTMLElement ? child : null
  }
  return null
}

function apply(bubble: HTMLElement, state: BubbleState): void {
  const content = contentOf(bubble)
  if (content === null) return

  const fullHeight = content.scrollHeight
  const overflow = fullHeight > COLLAPSED_PX + OVERFLOW_SLACK
  if (!overflow) {
    content.style.maxHeight = ''
    bubble.removeAttribute(OVERFLOW_ATTR)
    bubble.removeAttribute(STATE_ATTR)
    findToggle(bubble)?.remove()
    state.expanded = false
    return
  }

  const collapsed = !state.expanded
  bubble.setAttribute(OVERFLOW_ATTR, '')
  bubble.setAttribute(STATE_ATTR, collapsed ? 'collapsed' : 'expanded')
  content.style.maxHeight = `${collapsed ? COLLAPSED_PX : Math.max(fullHeight, COLLAPSED_PX)}px`

  const button = ensureToggle(bubble)
  button.setAttribute('aria-expanded', String(state.expanded))
  button.setAttribute('aria-label', toggleLabel(state.expanded))
  button.title = toggleLabel(state.expanded)
}

/**
 * 同步单个气泡的折叠状态。只处理用户轮（.IzP3Va_userStack 内），
 * 避免旧版那样把应答尾部误判成用户提问。
 */
export function syncUserBubble(bubble: HTMLElement): void {
  if (bubble.closest(USER_STACK_SELECTOR) === null) return
  const content = contentOf(bubble)
  if (content === null) return

  const text = content.textContent ?? ''
  let state = states.get(bubble)
  if (state === undefined) {
    state = { text, expanded: false }
    states.set(bubble, state)
  } else if (state.text !== text) {
    // ZCode：正文变化后回到折叠态。
    state.text = text
    state.expanded = false
  }
  apply(bubble, state)
}

function cleanup(): void {
  for (const bubble of document.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) {
    findToggle(bubble)?.remove()
    bubble.removeAttribute(OVERFLOW_ATTR)
    bubble.removeAttribute(STATE_ATTR)
    const content = contentOf(bubble)
    if (content !== null) content.style.maxHeight = ''
  }
}

/**
 * 安装折叠控制器：首次扫描 + MutationObserver（新增节点/正文变化）+ 窗口缩放重算。
 * 返回卸载函数，行为与 installConversationLayout 等模块一致。
 */
export function installUserBubbleCollapse(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}

  let frame = 0
  let pending = new Set<HTMLElement>()
  let waitingForMotion = false

  const motionActive = (): boolean => document.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) !== null

  const schedule = (): void => {
    if (frame === 0) frame = window.requestAnimationFrame(flush)
  }

  const flush = (): void => {
    frame = 0
    // 2026-10-30（夜审批次 20）：侧栏开合动画期间布局每帧被改写，而 syncUserBubble 会读
    // scrollHeight（强制同步布局）。动画期间气泡的尺寸不会变，整批延后到动画结束即可。
    // 与 official-turn-navigator 同一套写法：跳过 → 属性移除时补跑 → 400ms 兜底
    // （宿主要是连属性一起重建、移除事件没触达观察器，这条兜底负责收尾）。
    if (motionActive()) {
      waitingForMotion = true
      window.setTimeout(() => {
        if (waitingForMotion && !motionActive()) schedule()
      }, 400)
      return
    }
    waitingForMotion = false
    const batch = pending
    pending = new Set()
    for (const bubble of batch) syncUserBubble(bubble)
  }

  const queue = (bubble: HTMLElement): void => {
    pending.add(bubble)
    schedule()
  }

  const queueFrom = (node: Node): void => {
    if (!(node instanceof HTMLElement)) return
    const owner = node.closest<HTMLElement>(BUBBLE_SELECTOR)
    if (owner !== null) queue(owner)
    if (node.matches(BUBBLE_SELECTOR)) queue(node)
    for (const inner of node.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) queue(inner)
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        // 动画结束（属性被移除）时把跳过的那批补跑一次。
        if (waitingForMotion && motionActive() === false) schedule()
        continue
      }
      if (record.type === 'characterData') {
        const bubble = record.target.parentElement?.closest<HTMLElement>(BUBBLE_SELECTOR)
        if (bubble) queue(bubble)
        continue
      }
      for (const node of record.addedNodes) queueFrom(node)
    }
  })
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: [SIDEBAR_MOTION_ATTRIBUTE],
  })

  const onResize = (): void => {
    for (const bubble of document.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) queue(bubble)
  }
  window.addEventListener('resize', onResize)

  // 首次扫描同样受守卫约束：安装时若正好在开合动画中，走队列而不是立刻读布局。
  if (motionActive()) {
    waitingForMotion = true
    for (const bubble of document.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) pending.add(bubble)
  } else {
    for (const bubble of document.querySelectorAll<HTMLElement>(BUBBLE_SELECTOR)) syncUserBubble(bubble)
  }

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', onResize)
    if (frame !== 0) window.cancelAnimationFrame(frame)
    frame = 0
    pending = new Set()
    cleanup()
  }
}
