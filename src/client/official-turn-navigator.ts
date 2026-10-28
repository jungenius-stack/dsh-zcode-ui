import { CODEX_UI_API_ENDPOINTS } from '../business-api.ts'

const OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE = 'data-dcu-official-turn-navigator'
// 仅用于清除旧版注入或热更新残留；新版不再给内部部件添加这些属性。
const OFFICIAL_TURN_MARK_ATTRIBUTE = 'data-dcu-official-turn-mark'
const OFFICIAL_TURN_TOOLTIP_ATTRIBUTE = 'data-dcu-official-turn-tooltip'
const OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE = 'data-dcu-official-turn-navigator-supported'
/** G11：宿主 marks 有高度但零刻度时标记，交由自绘导航接管。 */
const OFFICIAL_TURN_EMPTY_ATTRIBUTE = 'data-dcu-official-turn-empty'
/** 侧栏开合动画期间打在同 frame 上的标记（sidebar-width.ts 写入），用于暂停布局读取。 */
const SIDEBAR_MOTION_ATTRIBUTE = 'data-dcu-sidebar-motion'
const CAPABILITIES_ENDPOINT = `${CODEX_UI_API_ENDPOINTS.dependencies}?action=capabilities`

function isOfficialTurnNavigator(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.tagName !== 'NAV') return false
  /*
   * 结构锚点：宿主轮次导航的标志是内含 .JXrxFq_marks（刻度容器）。
   * 用结构判定而不是「必须已有按钮」——G11 要解决的正是「按钮一个都没有」的形态，
   * 若把「有按钮」当前置条件，就永远识别不到那种 nav，接管逻辑也就永远不触发。
   */
  const hasMarks = element.querySelector('.JXrxFq_marks') !== null
  if (hasMarks) return true
  if (element.querySelector('button[type="button"][aria-label]') === null) return false
  // 0.1.5 把自然高度写进行内样式；0.1.7 去掉了这个变量，刻度按钮改为带 data-index。
  return element.style.getPropertyValue('--turn-natural-height') !== ''
    || element.querySelector('button[type="button"][data-index][aria-label]') !== null
}

/** 标记实际挂载的官方轮次导航，避免依赖宿主样式文件名或会话 DOM 层级。 */
export function markOfficialTurnNavigators(root: ParentNode = document): number {
  for (const element of root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)) {
    if (isOfficialTurnNavigator(element)) continue
    element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
    for (const part of element.querySelectorAll(`[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
      part.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE)
      part.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE)
    }
  }
  for (const element of root.querySelectorAll('nav')) {
    if (!isOfficialTurnNavigator(element)) continue
    element.setAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE, 'true')
    markEmptyMarks(element)
  }
  return root.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`).length
}

/**
 * G11：宿主 marks 容器「有高度但零刻度」时打标记，让自绘导航接管。
 *
 * 背景（2026-10-27 实测）：会话深度压缩后，宿主 `.JXrxFq_marks` 会同时满足
 *   ① 高度正常（572px，说明宿主知道轮次数）
 *   ② 子元素 = 0，innerHTML 空串，3 秒 MutationObserver 零事件（宿主根本不渲染按钮）
 * 整条索引就在视觉上消失了。ZCode 靠目录水合保证压缩下索引仍完整，这是真实能力差。
 *
 * 插件侧本来就有完整自绘导航（TurnNavigator.tsx，239 行，数据源是会话锚点、
 * 与宿主 marks 无关），只是被一条 CSS 在「宿主支持」时隐藏了。
 * 这里只负责「让 CSS 知道现在该接管」，不改宿主 DOM、不写会话数据。
 *
 * 交还条件：marks.children > 0 时立刻移除该属性，自绘退回 display:none。
 */
function markEmptyMarks(nav: HTMLElement): void {
  const marks = nav.querySelector<HTMLElement>('.JXrxFq_marks')
  if (marks === null) {
    nav.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE)
    return
  }
  const hasBox = marks.getBoundingClientRect().height > 0
  const isEmpty = marks.children.length === 0
  if (hasBox && isEmpty) nav.setAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE, 'true')
  else nav.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE)
}

function nodeTouchesTurnNavigator(node: Node): boolean {
  return node instanceof Element && (
    node.matches(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)
    || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
    || node.querySelector(`nav,[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
  )
}

function nodeInsideTurnNavigator(node: Node): boolean {
  return node instanceof Element && (
    node.matches(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`)
    || node.closest(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}]`) !== null
  )
}

function turnNavigatorMutationRelevant(records: readonly MutationRecord[]): boolean {
  return records.some(record => record.type === 'attributes'
    ? record.target instanceof Element && record.target.matches('nav')
    : nodeInsideTurnNavigator(record.target)
      || [...record.addedNodes].some(nodeTouchesTurnNavigator)
      || [...record.removedNodes].some(nodeTouchesTurnNavigator))
}

async function runtimeSupportsOfficialTurnNavigator(fetchImpl: typeof fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(CAPABILITIES_ENDPOINT, { cache: 'no-store' })
    if (!response.ok) return false
    const payload = await response.json() as unknown
    if (payload === null || typeof payload !== 'object') return false
    const capabilities = (payload as Record<string, unknown>).capabilities
    return capabilities !== null && typeof capabilities === 'object'
      && (capabilities as Record<string, unknown>).officialTurnNavigator === true
  } catch {
    return false
  }
}

/** 官方导航可能在会话切换后异步挂载；仅对相关变更按帧检测，并在停用时清理标记。 */
export function observeOfficialTurnNavigators(doc: Document = document, fetchImpl: typeof fetch = fetch): () => void {
  if (doc.body === null || doc.documentElement === null) return () => {}
  let active = true
  let frame: number | undefined
  let pending = false
  const run = (): void => {
    frame = undefined
    // 2026-10-28 性能修复（T2 深审）：侧栏开合动画期间每帧都有 style 写入 → 观察器每帧触发 →
    // 这里做「全文档 querySelectorAll('nav') + marks.getBoundingClientRect()」，而 marks 的布局
    // 正被动画改写，读取即强制同步布局。实测 900ms 开合内 Layout 33 次 / 232ms、
    // getBoundingClientRect 累计 249ms —— 就是用户感知到的那一下卡顿。
    // 动画期间导航与刻度不可能变化，直接跳过；属性移除（动画结束）时由观察器补跑。
    if (doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) !== null) {
      pending = true
      // 兜底：宿主要是连属性一起重建、移除事件没触达观察器，400ms 后自己补一次。
      window.setTimeout(() => {
        if (pending && doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) === null) schedule()
      }, 400)
      return
    }
    pending = false
    markOfficialTurnNavigators(doc)
  }
  const schedule = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(run)
  }
  // 2026-10-18：官方轮次导航是**懒挂载**的。实测点击会话后，先是 <div class="JXrxFq_slot">
  // 插入（此刻内部还是空的，querySelector('nav') 为 null），19ms 之后 nav 才被填进去。
  // 旧实现只在挂载瞬间判定一次，那一帧 nav 还不存在 → 永远标不上 → 本插件以为「宿主没有
  // 官方导航」，于是自绘的那条一直存在，视觉上就是「左右各一条索引栏」。
  // 因此只要 childList 有变更就调度一次（markOfficialTurnNavigators 本身是幂等的，
  // 且已被 rAF 合并），不再依赖那次注定落空的「插入节点自身匹配 nav」判定。
  const observer = new MutationObserver(records => {
    // 开合动画的开始/结束都记在这条属性上：结束时补跑一次（run 在动画期间是空转的）。
    if (records.some(record => record.type === 'attributes' && record.attributeName === SIDEBAR_MOTION_ATTRIBUTE)) {
      if (doc.querySelector(`[${SIDEBAR_MOTION_ATTRIBUTE}]`) === null) schedule()
      return
    }
    if (records.some(record => record.type === 'childList') || turnNavigatorMutationRelevant(records)) schedule()
  })
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', SIDEBAR_MOTION_ATTRIBUTE] })
  schedule()
  void runtimeSupportsOfficialTurnNavigator(fetchImpl).then(supported => {
    if (!active) return
    if (supported) doc.documentElement.setAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE, 'true')
    else doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE)
    // 探测结果只决定 CSS 兜底属性；真正的互斥依赖 nav 上的标记，这里补跑一次避免竞态。
    schedule()
  })
  return () => {
    active = false
    observer.disconnect()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    doc.documentElement.removeAttribute(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE)
    for (const element of doc.querySelectorAll(`[${OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE}],[${OFFICIAL_TURN_MARK_ATTRIBUTE}],[${OFFICIAL_TURN_TOOLTIP_ATTRIBUTE}]`)) {
      element.removeAttribute(OFFICIAL_TURN_NAVIGATOR_ATTRIBUTE)
      element.removeAttribute(OFFICIAL_TURN_EMPTY_ATTRIBUTE)
      element.removeAttribute(OFFICIAL_TURN_MARK_ATTRIBUTE)
      element.removeAttribute(OFFICIAL_TURN_TOOLTIP_ATTRIBUTE)
    }
  }
}
