/**
 * 滚动条自动隐藏状态机（night2 surface-6 M5，对照 ZCode asar js@6019110 起的工作区根实现）。
 *
 * ZCode 语义：三常驻滚动区（侧栏面板 / 会话框 / 侧板框）的滚动条静息透明，滚动才现形，
 * 1s 空闲渐灭；指针进入右/底缘判定区提亮，压住拇指几何再进一步提亮，拖拽最重。
 * DSH 侧对应物映射：
 *   · 会话框 → 宿主 `[data-conversation-scroll]`（conversation-dom.ts 的 scrollRoot）；
 *   · 侧栏面板 → 插件树 `.dcu-wb-tree` 维持 P0-6「滚动条隐藏 + 页脚交代」裁决（surface-6 D2），
 *     不加入本状态机；设置页 main 按 ZCode 语义也不加入（它是全局药丸基座面）。
 * 注入点 = 宿主现成变量 `--dsh-scrollbar-thumb`：宿主 scrollbar.css 全局面消费它，
 * 本模块只改写容器作用域的变量值（菜单/pane 的更近作用域默认值天然不被波及）。
 *
 * 状态（属性挂在**实际滚动的元素**上——容器或其内部嵌套滚动面，CSS 两种位置都认）：
 *   data-dcu-scrollbar-active   滚动中/未 decay（thumb = alias bg 档，10%）
 *   data-dcu-scrollbar-hover    指针在缘判定区（thumb = alias hover 档，30%）
 *   data-dcu-scrollbar-dragging 按住拇指拖拽（thumb = 45%）
 * CSS 侧（zcode-theme.ts 滚动条段）以 `html[data-dcu-scrollbar-autohide]` 为总闸：
 * 模块卸载或未运行时容器回落宿主默认（thumb 常显），不存在「滚动条永久消失」的失败态。
 *
 * reduced-motion：跳过 WAAPI 渐变，状态切换瞬时完成（ZCode 同款）。
 */

const CONTAINER_SELECTOR = '[data-conversation-scroll]'
const ROOT_FLAG = 'data-dcu-scrollbar-autohide'
const ATTR_ACTIVE = 'data-dcu-scrollbar-active'
const ATTR_HOVER = 'data-dcu-scrollbar-hover'
const ATTR_DRAGGING = 'data-dcu-scrollbar-dragging'
const THUMB_VAR = '--dsh-scrollbar-thumb'
/** 空闲熄灭延时（ZCode setTimeout(…,1e3)）。 */
const IDLE_MS = 1000
/** 显/灭渐变时长与曲线（ZCode el.animate(duration:200,easing:'ease')）。 */
const FADE_MS = 200
/** 主判定区：右/底缘 10px；对已登记容器兜底扫描放宽到 14px（ZCode 同参）。 */
const EDGE_PRIMARY = 10
const EDGE_FALLBACK = 14
/** 拇指最小长度（ZCode max(32, r*r/total)）。 */
const MIN_THUMB = 32

interface ContainerState {
  timer: number | undefined
  animation: Animation | undefined
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia !== undefined
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function computedThumb(el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue(THUMB_VAR).trim()
}

/** 拇指几何（ZCode 原式）：length=轨道长，total=全内容长，offset=已滚距离。 */
function thumbHit(length: number, total: number, offset: number, pointer: number, trackStart: number): boolean {
  if (total <= length) return false
  const size = Math.min(length, Math.max(MIN_THUMB, (length * length) / total))
  const pos = (offset / (total - length)) * (length - size)
  return pointer >= trackStart + pos && pointer <= trackStart + pos + size
}

export function installScrollbarAutohide(): () => void {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  if (root.hasAttribute(ROOT_FLAG)) return () => {}
  root.setAttribute(ROOT_FLAG, '')

  const states = new Map<HTMLElement, ContainerState>()
  let hovered: HTMLElement | null = null
  let dragging: HTMLElement | null = null
  let pendingMove: MouseEvent | null = null
  let moveFrame = 0

  const setState = (el: HTMLElement, attr: string, on: boolean): void => {
    if (on) el.setAttribute(attr, '')
    else el.removeAttribute(attr)
  }

  const animateThumb = (el: HTMLElement, from: string, to: string): void => {
    const state = states.get(el)
    if (state === undefined || from === to || typeof el.animate !== 'function') return
    if (prefersReducedMotion()) return
    state.animation?.cancel()
    try {
      const keyframes = [{ [THUMB_VAR]: from }, { [THUMB_VAR]: to }] as unknown as Keyframe[]
      state.animation = el.animate(keyframes, { duration: FADE_MS, easing: 'ease' })
    } catch { /* 自定义属性动画不可用时按瞬时切换降级 */ }
  }

  const deactivate = (el: HTMLElement): void => {
    const state = states.get(el)
    if (state?.timer !== undefined) { clearTimeout(state.timer); state.timer = undefined }
    if (el === hovered || el === dragging || !el.hasAttribute(ATTR_ACTIVE)) return
    const from = computedThumb(el)
    el.removeAttribute(ATTR_ACTIVE)
    animateThumb(el, from, computedThumb(el))
  }

  const armDecay = (el: HTMLElement): void => {
    let state = states.get(el)
    if (state === undefined) { state = { timer: undefined, animation: undefined }; states.set(el, state) }
    if (state.timer !== undefined) clearTimeout(state.timer)
    state.timer = window.setTimeout(() => {
      state!.timer = undefined
      deactivate(el)
    }, IDLE_MS)
  }

  /** 滚动显形：旧值 → 挂属性 → 新值，200ms ease 渐变（ZCode 同款；已显形时只重置计时）。 */
  const activate = (el: HTMLElement): void => {
    if (!el.hasAttribute(ATTR_ACTIVE)) {
      const from = computedThumb(el)
      el.setAttribute(ATTR_ACTIVE, '')
      animateThumb(el, from, computedThumb(el))
    }
    armDecay(el)
  }

  const clearHover = (el: HTMLElement): void => {
    el.removeAttribute(ATTR_HOVER)
    if (el.hasAttribute(ATTR_ACTIVE)) armDecay(el)
  }

  const withinEdge = (el: HTMLElement, x: number, y: number, zone: number): 'v' | 'h' | null => {
    const rect = el.getBoundingClientRect()
    const vertical = el.scrollHeight > el.clientHeight
    const horizontal = el.scrollWidth > el.clientWidth
    if (vertical && x >= rect.right - zone && x <= rect.right) return 'v'
    if (horizontal && y >= rect.bottom - zone && y <= rect.bottom) return 'h'
    return null
  }

  const evaluateHover = (event: MouseEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    let el: HTMLElement | null = null
    // 主路径：从 target 上溯容器作用域内第一个「真可滚」元素（ZCode 同款判定）。
    let node: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement
    while (node !== null) {
      if (node.closest(CONTAINER_SELECTOR) !== null
        && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) { el = node; break }
      node = node.parentElement
    }
    // 兜底：已登记容器右/底缘 14px（ZCode 扫 [data-scrollbar-container] 的同构降级）。
    if (el === null) {
      for (const candidate of states.keys()) {
        if (candidate.isConnected && withinEdge(candidate, event.clientX, event.clientY, EDGE_FALLBACK) !== null) { el = candidate; break }
      }
    }
    if (el !== null) {
      const zone = withinEdge(el, event.clientX, event.clientY, EDGE_PRIMARY)
        ?? withinEdge(el, event.clientX, event.clientY, EDGE_FALLBACK)
      if (zone !== null) {
        if (hovered !== null && hovered !== el) clearHover(hovered)
        hovered = el
        if (!el.hasAttribute(ATTR_HOVER)) {
          const from = computedThumb(el)
          el.setAttribute(ATTR_HOVER, '')
          animateThumb(el, from, computedThumb(el))
        }
        return
      }
    }
    if (hovered !== null) {
      const still = hovered.isConnected && withinEdge(hovered, event.clientX, event.clientY, EDGE_FALLBACK) !== null
      if (!still) { clearHover(hovered); hovered = null }
    }
  }

  const onScroll = (event: Event): void => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.closest(CONTAINER_SELECTOR) === null) return
    activate(target)
  }

  const onMouseMove = (event: MouseEvent): void => {
    pendingMove = event
    if (moveFrame !== 0) return
    moveFrame = window.requestAnimationFrame(() => {
      moveFrame = 0
      const pending = pendingMove
      pendingMove = null
      if (pending !== null) evaluateHover(pending)
    })
  }

  const onMouseDown = (event: MouseEvent): void => {
    if (hovered === null) return
    const zone = withinEdge(hovered, event.clientX, event.clientY, EDGE_FALLBACK)
    if (zone === null) return
    dragging = hovered
    setState(dragging, ATTR_DRAGGING, true)
  }

  const endDrag = (): void => {
    if (dragging === null) return
    dragging.removeAttribute(ATTR_DRAGGING)
    if (dragging.hasAttribute(ATTR_ACTIVE)) armDecay(dragging)
    dragging = null
  }

  const onPointerLeave = (event: PointerEvent): void => {
    if (hovered === null) return
    const related = event.relatedTarget
    if (related instanceof Node && hovered.contains(related)) return
    clearHover(hovered)
    hovered = null
  }

  document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  document.addEventListener('mousemove', onMouseMove, { capture: true })
  document.addEventListener('mousedown', onMouseDown, { capture: true })
  document.addEventListener('pointerleave', onPointerLeave as EventListener, { capture: true })
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('pointercancel', endDrag)
  window.addEventListener('blur', endDrag)

  return () => {
    document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
    document.removeEventListener('mousemove', onMouseMove, { capture: true })
    document.removeEventListener('mousedown', onMouseDown, { capture: true })
    document.removeEventListener('pointerleave', onPointerLeave as EventListener, { capture: true })
    window.removeEventListener('mouseup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
    window.removeEventListener('blur', endDrag)
    if (moveFrame !== 0) window.cancelAnimationFrame(moveFrame)
    for (const [el, state] of states) {
      if (state.timer !== undefined) clearTimeout(state.timer)
      state.animation?.cancel()
      el.removeAttribute(ATTR_ACTIVE)
      el.removeAttribute(ATTR_HOVER)
      el.removeAttribute(ATTR_DRAGGING)
    }
    states.clear()
    hovered = null
    dragging = null
    root.removeAttribute(ROOT_FLAG)
  }
}
