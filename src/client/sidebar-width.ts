/** OpenAI Codex desktop sidebar geometry, measured from the installed client bundle. */
export const CODEX_SIDEBAR_MIN_PX = 240
export const CODEX_SIDEBAR_RAIL_PX = 56

/** Backward-compatible name for the width used while a collapsed rail expands. */
export const SLIM_SIDEBAR_PX = CODEX_SIDEBAR_MIN_PX

export type SidebarGridTracks = {
  sidebar: number
  middle: string
  /** 第三列原文。0.1.5 是 `0px`，0.1.7 是 `minmax(0px, Npx)`，写回时不能改格式。 */
  details: string
}

const visibleSidebarWidths = new WeakMap<HTMLElement, number>()

type HostSidebarSnapshot = {
  grid: string
  handleLeft: string
  windowsWidth: string
}

const hostSidebarSnapshots = new WeakMap<HTMLElement, HostSidebarSnapshot>()

/* ---------------------------------------------------------------------------
 * 侧栏开合动画（2026-10-13，1.3.0）
 *
 * ## 为什么不再是 grid-template-columns 过渡
 *
 * 旧实现让过渡直接跑在宿主 AppFrame 的 `grid-template-columns` 上：每一帧都会
 * 触发整棵网格树的重新布局，而布局成本随会话内容增长——用户实测「侧栏拉出的
 * 帧率受当前对话上下文长度影响」。120Hz（帧预算 8.33ms）上长会话几乎每帧超预算；
 * 60Hz 无头环境复现：1200 条消息时收起动画 500ms 内掉 4 帧、最大帧 33.8ms
 * （10 条消息时全程 ~16.6ms 无掉帧）。
 *
 * ## 现在的做法：轨道静止，内容位移
 *
 * - 动画期间网格轨道保持静止（收起=展开几何，展开=收起几何），内容列与拖拽柄
 *   改用 `transform` 位移——合成层属性，不触发布局，帧成本与内容量无关；
 * - 轨道只在动画两端的「快照」里一次性切换，且切换时暂停样式过渡（宿主
 *   `.frame[data-animating]` 与伴随插件都可能给 grid/left 挂过渡，不暂停会把
 *   一次性修正动画化，出现可见漂移）；
 * - 收起时内容列在动画开始时加宽一个 shift（一次性重排），末端轨道切成 56px
 *   后两者宽度一致，无第二次重排；展开反向，末端一次重排。即每次开合最多
 *   一次布局，而不是每帧一次。
 * ------------------------------------------------------------------------- */

/** 飞行中的动画：目标方向 + 收尾定时器。 */
type SidebarMotion = { kind: 'collapse' | 'expand'; timer: number }

/** 每帧当前飞行中的动画（同一帧只可能有一个）。 */
const motions = new WeakMap<HTMLElement, SidebarMotion>()

/** 每帧当前已落定的静止态（收起与否），用于识别「状态翻转」。 */
const restStates = new WeakMap<HTMLElement, boolean>()

/** 动画标记：取值 'collapse' | 'expand'，由 CSS 消费。 */
const SIDEBAR_MOTION_ATTRIBUTE = 'data-dcu-sidebar-motion'
/**
 * 节点数阈值——**已废弃，不再参与决策**（2026-10-19 移除）。
 *
 * 历史：这里曾有 `SIDEBAR_MOTION_MAX_ELEMENTS = 8000`，超过就不播动画直接落定。
 * 它的前提假设是「长会话里动画的每帧绘制比动画本身贵」，但该假设在位移改走
 * `transform`（合成层属性，见 `beginAnimation`）之后已经不成立：
 *
 *   实测（2026-10-19，同一套 fixture，300ms linear 位移）——
 *   节点 2,007 / 8,007 / 15,007 / 25,007：平均帧间隔 16.65 / 16.23 / 15.82 / 16.01ms，
 *   最大 17.4ms。**帧成本与内容量完全脱钩**，2.5 万节点照样满帧。
 *
 * 而阈值本身造成的伤害是可量化的：用户的真实会话 12,685 个节点 = 阈值的 1.6 倍，
 * 于是侧栏开合**长期完全不播动画**（`beginSidebarMotion` 直接返回 false），
 * 用户感知到的「不丝滑」不是动画卡，而是**根本没有动画**——点一下瞬间跳到位。
 *
 * 与此同时，跳过动画并不能省掉那次同步重排（轨道真的要从 240px 变 56px）：
 * 12,685 节点实测重排 27ms，跳不跳都要付。所以「跳动画」只损失了过渡，
 * 没有换来任何流畅度。
 *
 * 真正该保留的自适应判据在 `beginSidebarMotion` 末尾：**按实测阻塞时间**
 * （`blocked > duration / 2`）决定是否跳过——那是纯测量驱动、随内容量自适应、
 * 不依赖任何魔法节点常量。节点数阈值与它重复，且更粗糙。
 */

/**
 * 旧版位移变量名。2026-10-16 起位移改由 JS 直接写内容列的 transform（原因见
 * `beginSidebarMotion` 里的长注释），本变量**不再写入**，只在清理路径上移除历史残留
 * （热更新或旧版本页面可能还留着它）。
 */
const SIDEBAR_SHIFT_VAR = '--dcu-sidebar-shift'
/** 宿主侧栏列 / 内容列标记，由 CSS 消费。 */
const SIDEBAR_COLUMN_ATTRIBUTE = 'data-dcu-sidebar-column'
const CENTER_COLUMN_ATTRIBUTE = 'data-dcu-center-column'

/**
 * 清除内容列上的位移动画痕迹（内联 transform / transition）。
 *
 * 位移改走内联 transform 后，「落定」「取消」「卸载」三条路径都必须把内联值撤掉，
 * 否则残留的 transform 会盖住 CSS 规则、让内容列停在半程位置。
 * 同时顺手移除历史遗留的 `--dcu-sidebar-shift`（旧版本会写在 frame 上）。
 */
function clearCenterShift(frame: HTMLElement): void {
  const center = frame.querySelector<HTMLElement>(`[${CENTER_COLUMN_ATTRIBUTE}]`)
  if (center !== null) {
    center.style.removeProperty('transform')
    center.style.removeProperty('transition')
  }
  frame.style.removeProperty(SIDEBAR_SHIFT_VAR)
  // 轮次索引栏的同步位移也必须一并撤掉，否则它会停在半程、与内容列错位（见 beginAnimation）。
  clearRailShift(frame)
}

/* ---------------------------------------------------------------------------
 * 轮次索引栏与内容列的同步位移（2026-10-19）
 *
 * ## 问题
 *
 * 内容列的滑动是**伪造**的：轨道宽度在一帧内切到目标，视觉位移由内容列自己的
 * `transform` 补齐（见 beginSidebarMotion 的长注释）。而轮次索引栏
 * （`.dcu-turn-navigator`，见 TurnNavigator.tsx）是 `position: fixed`，按
 * `.dcu-root` 的**真实几何**定位——它不吃内容列的 transform。
 *
 * 于是开合期间两者各走各的：
 *
 *   t=0    索引栏 256px ／ 内容列 256px        偏差 0
 *   t=15   索引栏  72px ／ 内容列 146px        偏差 −74px   ← 索引栏一帧到位
 *   t=98   索引栏  72px ／ 内容列  71px        偏差 +1px
 *   落定   索引栏  72px ／ 内容列  56px        偏差 +16px（设计间距）
 *
 * 用户看到的就是「索引栏不跟着侧栏走，漂移」。官方轮次导航（宿主的 nav）不受影响——
 * 它用 `position: sticky` 挂在内容列里，天然跟随（实测全程偏差恒为 12px）。
 *
 * ## 做法：让索引栏付同一段位移，只是取反
 *
 * 内容列位移 `+X`（向右推开）时，索引栏视觉上要跟着往右，但它的定位基准已经一帧
 * 到位了，所以要额外补 `+X` 才会「看起来还在路上」。这里把内容列实际写入的位移量
 * 发布成变量 `--dcu-rail-sync-shift`，由 TurnNavigator 的 CSS 消费。
 *
 * 三个约束：
 *  1. **同一时间轴**：起点、时长、曲线必须与内容列完全一致，否则两者会互相追赶；
 *  2. **零额外 JS**：只写一个自定义属性，索引栏的跟随交给 CSS 过渡完成，不产生
 *     每帧读布局的成本（这类每帧 JS 同步正是 §27 里长对话变慢的根源）；
 *  3. 不改变索引栏的定位语义：落定后位移归零，它仍在 `root.right + 16` 上。
 * ------------------------------------------------------------------------- */

/** 索引栏消费的同步位移变量。由本文件在动画期间写入，落定时归零移除。 */
const RAIL_SYNC_VAR = '--dcu-rail-sync-shift'
/** 索引栏标记：只有真挂载了自绘索引栏时才写变量，避免无谓的样式失效。 */
const RAIL_ATTRIBUTE = 'data-dcu-rail-sync'

/**
 * 让索引栏跟着内容列走同一段位移。
 *
 * @param shiftPx 内容列本轮起点位移（带符号，像素）。索引栏补同样方向同样大小。
 */
function applyRailShift(frame: HTMLElement, shiftPx: number): void {
  const rail = frame.ownerDocument.querySelector<HTMLElement>(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`)
  if (rail === null) return
  // 起点必须与内容列一样「无过渡地落上去」，否则浏览器会把「从 0 到起点」也当成一次过渡，
  // 索引栏会先滞后再追赶，偏差反而更大。
  rail.style.transition = 'none'
  rail.style.setProperty(RAIL_SYNC_VAR, `${shiftPx}px`)
  void rail.offsetWidth
  // 交回 CSS 的过渡规则（与内容列同为 move-duration + move-ease），从起点平滑归零。
  rail.style.removeProperty('transition')
  rail.style.setProperty(RAIL_SYNC_VAR, '0px')
}

/** 移除索引栏的同步位移与内联过渡痕迹。 */
function clearRailShift(frame: HTMLElement): void {
  const rail = frame.ownerDocument.querySelector<HTMLElement>(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`)
  if (rail === null) return
  rail.style.removeProperty('transition')
  rail.style.removeProperty(RAIL_SYNC_VAR)
}

/** 导出给 TurnNavigator：声明自己需要参与位移同步。 */
export const TURN_RAIL_SYNC_ATTRIBUTE = RAIL_ATTRIBUTE

/** 记下插件改写前的宿主列宽。已经带初始化标记的列宽是本插件留下的，不能当成宿主原值。 */
export function rememberHostSidebar(frame: HTMLElement): void {
  if (hostSidebarSnapshots.has(frame) || frame.hasAttribute('data-dcu-codex-sidebar-initialized')) return
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  hostSidebarSnapshots.set(frame, {
    grid: frame.style.gridTemplateColumns,
    handleLeft: handle?.style.left ?? '',
    windowsWidth: frame.style.getPropertyValue('--dsh-windows-sidebar-width'),
  })
}

/** 停用或卸载时撤回列宽、拖拽柄、动画标记和初始化标记，让官方侧栏按宿主宽度重排。 */
export function restoreHostSidebar(frame: HTMLElement): void {
  cancelSidebarMotion(frame)
  frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE)
  clearCenterShift(frame)
  clearColumnMarkers(frame)
  frame.removeAttribute('data-dcu-codex-sidebar-initialized')
  frame.style.removeProperty('--dcu-sidebar-expanded-width')
  const html = frame.ownerDocument.documentElement
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (frame.hasAttribute('data-sidebar-collapsed')) {
    const collapsedDesktop = html.hasAttribute('data-windows-titlebar') || html.dataset.platform === 'darwin'
    if (collapsedDesktop && tracks?.sidebar === CODEX_SIDEBAR_RAIL_PX) {
      frame.style.gridTemplateColumns = `0px ${tracks.middle} ${tracks.details}`
      if (html.hasAttribute('data-windows-titlebar')) frame.style.setProperty('--dsh-windows-sidebar-width', '0px')
    }
    return
  }
  const snapshot = hostSidebarSnapshots.get(frame)
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  if (snapshot !== undefined) {
    frame.style.gridTemplateColumns = snapshot.grid
    if (handle !== null) {
      if (snapshot.handleLeft === '') handle.style.removeProperty('left')
      else handle.style.left = snapshot.handleLeft
    }
    if (snapshot.windowsWidth === '') frame.style.removeProperty('--dsh-windows-sidebar-width')
    else frame.style.setProperty('--dsh-windows-sidebar-width', snapshot.windowsWidth)
    return
  }
  // 本会话已经把宿主列宽覆盖成 240，且没有快照时退回官方默认 280。
  if (tracks?.sidebar === CODEX_SIDEBAR_MIN_PX) {
    frame.style.gridTemplateColumns = `280px ${tracks.middle} ${tracks.details}`
    if (handle !== null) handle.style.left = '280px'
  }
}

/** 解析宿主 AppFrame 的 grid-template-columns。 */
export function parseSidebarGrid(value: string): SidebarGridTracks | undefined {
  const match = /^(\d+(?:\.\d+)?)px\s+(minmax\(\d+(?:px)?,\s*1fr\))\s+(minmax\(0(?:px)?,\s*\d+(?:\.\d+)?px\)|\d+(?:\.\d+)?px)$/.exec(value.trim())
  if (match === null) return undefined
  return { sidebar: Number(match[1]), middle: match[2], details: match[3] }
}

export function findSidebarFrame(root: ParentNode): HTMLElement | undefined {
  const marked = root.querySelector<HTMLElement>('[data-sidebar-collapsed]')
  if (marked !== null) return marked
  for (const node of root.querySelectorAll<HTMLElement>('div')) {
    if (parseSidebarGrid(node.style.gridTemplateColumns) !== undefined) return node
  }
  return undefined
}

/** Settings is portaled to body, so explicitly carry over the expanded width. */
export function settingsSidebarWidth(root: ParentNode): number {
  const frame = findSidebarFrame(root)
  const expanded = Number.parseFloat(frame?.style.getPropertyValue('--dcu-sidebar-expanded-width') ?? '')
  if (Number.isFinite(expanded) && expanded >= CODEX_SIDEBAR_MIN_PX) return expanded
  const width = frame === undefined ? undefined : parseSidebarGrid(frame.style.gridTemplateColumns)?.sidebar
  return width !== undefined && width >= CODEX_SIDEBAR_MIN_PX ? width : CODEX_SIDEBAR_MIN_PX
}

/** 同步侧栏网格和拖拽柄，保证两者始终使用同一个可见宽度。 */
export function applySidebarWidth(frame: HTMLElement, width: number): boolean {
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined || frame.hasAttribute('data-sidebar-collapsed')) return false
  visibleSidebarWidths.set(frame, width)
  const next = `${width}px ${tracks.middle} ${tracks.details}`
  const changed = frame.style.gridTemplateColumns !== next
  if (changed) frame.style.gridTemplateColumns = next
  // 保存展开宽度，让内容在宿主网格动画中只被裁切，不逐帧重排。
  const contentWidth = `${width}px`
  if (frame.style.getPropertyValue('--dcu-sidebar-expanded-width') !== contentWidth) {
    frame.style.setProperty('--dcu-sidebar-expanded-width', contentWidth)
  }
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  if (handle !== null && handle.style.left !== contentWidth) handle.style.left = contentWidth
  return changed
}

/** 自动宽度调整与初始化过渡共用前置条件；手动拖拽不受此限制。 */
function canApplySlimSidebar(frame: HTMLElement): boolean {
  return !frame.hasAttribute('data-dragging')
    && parseSidebarGrid(frame.style.gridTemplateColumns) !== undefined
}

export function applySlimSidebar(frame: HTMLElement): boolean {
  if (!canApplySlimSidebar(frame)) return false
  if (frame.hasAttribute('data-sidebar-collapsed')) {
    const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)!
    const next = `${CODEX_SIDEBAR_RAIL_PX}px ${tracks.middle} ${tracks.details}`
    const changed = frame.style.gridTemplateColumns !== next
    if (changed) frame.style.gridTemplateColumns = next
    // Windows caption material follows the visible column; keep the saved expanded width intact.
    if (frame.ownerDocument.documentElement.hasAttribute('data-windows-titlebar')
      && frame.style.getPropertyValue('--dsh-windows-sidebar-width') !== `${CODEX_SIDEBAR_RAIL_PX}px`) {
      frame.style.setProperty('--dsh-windows-sidebar-width', `${CODEX_SIDEBAR_RAIL_PX}px`)
    }
    // 收起分支也必须打初始化标记：否则「冷启动即收起态」的帧永远拿不到标记，
    // 第一次展开会被误判成冷启动而跳过开合动画（1.3.0 起动画依赖标记区分翻转）。
    // 注意加守卫：相同值的 setAttribute 同样会触发 MutationObserver，
    // 无守卫会在静止态被观察器反复触发，形成死循环。
    if (!frame.hasAttribute('data-dcu-codex-sidebar-initialized')) {
      frame.setAttribute('data-dcu-codex-sidebar-initialized', '')
    }
    return changed
  }
  const initialized = frame.hasAttribute('data-dcu-codex-sidebar-initialized')
  const width = initialized ? visibleSidebarWidths.get(frame) ?? CODEX_SIDEBAR_MIN_PX : CODEX_SIDEBAR_MIN_PX
  const changed = applySidebarWidth(frame, width)
  // 相同值的 setAttribute 也会触发 MutationObserver，必须保持写入幂等。
  if (!initialized) frame.setAttribute('data-dcu-codex-sidebar-initialized', '')
  return changed
}

/** 仅在首帧覆盖宿主默认宽度时关闭过渡，避免刷新出现收缩动画。 */
function pauseInitialSidebarTransition(frame: HTMLElement): () => void {
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  const frameTransition = frame.style.transition
  const handleTransition = handle?.style.transition
  frame.style.transition = 'none'
  if (handle !== null) handle.style.transition = 'none'
  return () => {
    frame.style.transition = frameTransition
    if (handle !== null && handleTransition !== undefined) handle.style.transition = handleTransition
  }
}

/** 展开态要恢复到的宽度（拖拽改过的宽度优先，否则默认 240）。 */
function targetExpandedWidth(frame: HTMLElement): number {
  return visibleSidebarWidths.get(frame) ?? CODEX_SIDEBAR_MIN_PX
}

function prefersReducedMotion(win: Window): boolean {
  return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** 读取「移动」档时长（令牌缺失时退回 180ms，与 ZCode 动效分档一致）。 */
function readMoveDuration(frame: HTMLElement): number {
  const raw = getComputedStyle(frame).getPropertyValue('--dcu-motion-move-duration').trim()
  const match = /^(\d+(?:\.\d+)?)ms$/.exec(raw)
  return match === null ? 180 : Number(match[1])
}

/** 帧上是否挂着会动画化 grid-template-columns 的过渡（宿主或伴随插件）。 */
function transitionsTrackGrid(frame: HTMLElement): boolean {
  return getComputedStyle(frame).transitionProperty.includes('grid-template-columns')
}

/**
 * 带过渡暂停的轨道写入。宿主 `.frame[data-animating]`（以及 dsh-better-sidebar 的
 * 同类规则）会在离散开关时给 grid/left 挂过渡；不暂停就会把「修正宿主写回值」
 * 和「快照切轨」动画化，出现可见漂移。两次强制回流保证 none 先生效、写入被提交。
 */
function writeFrameTrackPaused(frame: HTMLElement, next: string): void {
  if (!transitionsTrackGrid(frame)) {
    frame.style.gridTemplateColumns = next
    return
  }
  const frameTransition = frame.style.transition
  frame.style.transition = 'none'
  void frame.offsetWidth
  frame.style.gridTemplateColumns = next
  void frame.offsetWidth
  frame.style.transition = frameTransition
}

/** 把宿主侧栏列与内容列打上标记（宿主重建 DOM 时重新标记）。 */
function markColumns(frame: HTMLElement): { sidebar: HTMLElement; center: HTMLElement } | undefined {
  const markedCenter = frame.querySelector<HTMLElement>(`[${CENTER_COLUMN_ATTRIBUTE}]`)
  const markedSidebar = frame.querySelector<HTMLElement>(`[${SIDEBAR_COLUMN_ATTRIBUTE}]`)
  if (markedCenter !== null && markedSidebar !== null
    && markedCenter.parentElement === frame && markedSidebar.parentElement === frame) {
    return { sidebar: markedSidebar, center: markedCenter }
  }
  const root = frame.querySelector<HTMLElement>('.dcu-root')
  if (root === null) return undefined
  // 侧栏列 = 从插件外壳向上找到的第一个「帧的直接子元素」。
  let sidebarColumn: HTMLElement | null = root
  while (sidebarColumn !== null && sidebarColumn.parentElement !== frame) sidebarColumn = sidebarColumn.parentElement
  if (sidebarColumn === null) return undefined
  // 内容列 = 侧栏列之后第一个不带宿主功能性标记的子元素（跳过拖拽柄与 shell.* 座位）。
  let centerColumn: HTMLElement | undefined
  let seenSidebar = false
  for (const child of Array.from(frame.children)) {
    if (child === sidebarColumn) { seenSidebar = true; continue }
    if (!seenSidebar) continue
    if (child.hasAttribute('data-side')) continue
    if (child.hasAttribute('data-shell-bottom') || child.hasAttribute('data-shell-overlay') || child.hasAttribute('data-shell-leading')) continue
    centerColumn = child as HTMLElement
    break
  }
  if (centerColumn === undefined) return undefined
  sidebarColumn.setAttribute(SIDEBAR_COLUMN_ATTRIBUTE, '')
  centerColumn.setAttribute(CENTER_COLUMN_ATTRIBUTE, '')
  return { sidebar: sidebarColumn, center: centerColumn }
}

function clearColumnMarkers(frame: HTMLElement): void {
  frame.querySelector(`[${SIDEBAR_COLUMN_ATTRIBUTE}]`)?.removeAttribute(SIDEBAR_COLUMN_ATTRIBUTE)
  frame.querySelector(`[${CENTER_COLUMN_ATTRIBUTE}]`)?.removeAttribute(CENTER_COLUMN_ATTRIBUTE)
}

/**
 * 动画期间把轨道钉回**目标几何**（2026-10-14 架构修正）。
 *
 * 宿主状态翻转后会写回它自己的列值（可能是 0px 而不是 56px），动画期间这会把轨道带偏。
 * 本函数在每个飞行帧把轨道重新钉成「本次动画的目标宽度」，于是宽度全程恒定，
 * 落定时无需再改宽度 → 落定零重排。
 *
 * 历史：旧实现钉的是「动画基准」（收起钉展开几何、展开钉收起几何），
 * 落定时才切到目标宽度，导致落定那一刻整列文本重排（8000 条实测 137ms）。
 */
function pinMotionBase(frame: HTMLElement, kind: 'collapse' | 'expand'): void {
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined) return
  const target = kind === 'collapse' ? CODEX_SIDEBAR_RAIL_PX : targetExpandedWidth(frame)
  const next = `${target}px ${tracks.middle} ${tracks.details}`
  if (frame.style.gridTemplateColumns === next) return
  writeFrameTrackPaused(frame, next)
}

/** 取消飞行中的动画样式（不落定——调用方自己决定轨道归谁）。 */
function cancelMotionStyles(frame: HTMLElement): void {
  cancelSidebarMotion(frame)
  frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE)
  clearCenterShift(frame)
}

/** 取消飞行中的动画（不落定——调用方自己决定落到哪）。 */
function cancelSidebarMotion(frame: HTMLElement): void {
  const motion = motions.get(frame)
  if (motion === undefined) return
  frame.ownerDocument.defaultView?.clearTimeout(motion.timer)
  motions.delete(frame)
}

/**
 * 落定到目标静止态：轨道、拖拽柄、动画标记在同一 flush 内写完（过渡暂停），
 * 视觉上与动画末帧完全一致，不产生跳变。
 */
function settleMotion(frame: HTMLElement, collapsed: boolean): void {
  cancelSidebarMotion(frame)
  const width = collapsed ? CODEX_SIDEBAR_RAIL_PX : targetExpandedWidth(frame)
  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  const center = frame.querySelector<HTMLElement>(`[${CENTER_COLUMN_ATTRIBUTE}]`)
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  const frameTransition = frame.style.transition
  const handleTransition = handle?.style.transition
  const centerTransition = center?.style.transition
  const pause = transitionsTrackGrid(frame)
  if (pause) {
    frame.style.transition = 'none'
    if (handle !== null) handle.style.transition = 'none'
    if (center !== null) center.style.transition = 'none'
    void frame.offsetWidth
  }
  try {
    frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE)
    clearCenterShift(frame)
    if (tracks !== undefined) frame.style.gridTemplateColumns = `${width}px ${tracks.middle} ${tracks.details}`
    if (handle !== null) handle.style.left = `${width}px`
    if (collapsed && frame.ownerDocument.documentElement.hasAttribute('data-windows-titlebar')) {
      frame.style.setProperty('--dsh-windows-sidebar-width', `${CODEX_SIDEBAR_RAIL_PX}px`)
    }
    if (pause) void frame.offsetWidth
  } finally {
    if (pause) {
      frame.style.transition = frameTransition
      if (handle !== null && handleTransition !== undefined) handle.style.transition = handleTransition
      if (center !== null && centerTransition !== undefined) center.style.transition = centerTransition
    }
  }
  restStates.set(frame, collapsed)
}

/**
 * 开始一次合成层开合动画。返回 false 表示条件不满足（调用方应立即落定）。
 *
 * 时序：先暂停过渡写「基准轨道 + 手柄位置」，再挂动画标记让 transform 过渡起跑——
 * 同一次任务里先 none 后恢复，保证 left/轨道的修正不过渡、transform 正常过渡。
 */
function beginSidebarMotion(frame: HTMLElement, collapsed: boolean): boolean {
  const win = frame.ownerDocument.defaultView
  if (win === null || prefersReducedMotion(win)) return false
  if (frame.hasAttribute('data-dragging')) return false
  // 这里曾有「节点数 > 8000 就跳过动画」的闸门，2026-10-19 移除：
  // 位移走 transform 后帧成本已与内容量脱钩（2.5 万节点仍满帧），该闸门只让长会话
  // 彻底失去动画、且省不掉那次同步重排。是否跳过改由末尾的**实测阻塞时间**决定。
  const columns = markColumns(frame)
  if (columns === undefined) return false
  const expandedWidth = targetExpandedWidth(frame)
  const shift = expandedWidth - CODEX_SIDEBAR_RAIL_PX
  if (!(shift > 0)) return false
  const kind = collapsed ? 'collapse' : 'expand'
  const duration = readMoveDuration(frame)
  const motion: SidebarMotion = { kind, timer: 0 }
  motions.set(frame, motion)
  // 计时起点：**写轨道之前**。同步重排会在下面那次强制布局里发生，
  // 由此得到的耗时才是「切换轨道真实阻塞了主线程多久」。
  const reflowStarted = win.performance.now()

  const handle = frame.querySelector<HTMLElement>('[data-side="sidebar"]')
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  const frameTransition = frame.style.transition
  const handleTransition = handle?.style.transition
  // 手柄的 left 修正必须无条件暂停过渡：宿主 `.frame[data-animating] .handle` 规则
  // 独立于帧上有没有 grid 过渡，随时可能把这次修正动画化（出现 280→56 的可见滑移）。
  const pauseFrame = transitionsTrackGrid(frame)
  if (pauseFrame || handle !== null) {
    if (pauseFrame) frame.style.transition = 'none'
    if (handle !== null) handle.style.transition = 'none'
    void frame.offsetWidth
  }
  try {
    // 动画期间轨道**直接切到目标几何**（2026-10-14 架构修正）。
    //
    // 旧做法是把轨道钉在「动画基准」（收起=展开几何、展开=收起几何），让内容列留在宽轨道上位移。
    // 问题：会话列宽度在动画期间是一个值、落定后是另一个值 → **落定那一刻整列文本重新排版**。
    // 实测 8000 条消息（4 万节点）落定重排 137ms，用户感知是「收起后卡一下」。
    //
    // 现在的做法：一开始就切到目标几何（宽度只变这一次，且必然发生——宿主状态真的翻了），
    // 之后宽度全程恒定；起点的「视觉位置」改由 transform 伪造（见 CodexSidebar.tsx 的位移规则，
    // 取 half-shift 的原因也在那里）。于是落定时只需移除 transform 与 shift 变量，
    // 不再改宽度 → **落定零重排**。
    const target = collapsed ? CODEX_SIDEBAR_RAIL_PX : expandedWidth
    if (tracks !== undefined) frame.style.gridTemplateColumns = `${target}px ${tracks.middle} ${tracks.details}`
    // 手柄先钉到收起视觉位（56px）：展开时它由宿主按自己的宽度挂载（如 280），
    // 随后在动画标记挂上后交给 left 过渡滑到展开位；收起时它随宿主卸载，存在则直接钉位。
    if (handle !== null) handle.style.left = `${CODEX_SIDEBAR_RAIL_PX}px`
    // Windows 标题栏材质跟随目标列宽（与旧实现同时机：状态翻转即写）。
    if (frame.ownerDocument.documentElement.hasAttribute('data-windows-titlebar')) {
      frame.style.setProperty('--dsh-windows-sidebar-width', `${collapsed ? CODEX_SIDEBAR_RAIL_PX : expandedWidth}px`)
    }
    if (pauseFrame || handle !== null) void frame.offsetWidth
  } finally {
    if (pauseFrame) frame.style.transition = frameTransition
    if (handle !== null && handleTransition !== undefined) handle.style.transition = handleTransition
  }
  // 关键时序（2026-10-14 长对话修复）：轨道切换引起的**整页重排**必须真的付掉，
  // 动画才能跑满；否则它会被这次重排整个吃掉。
  //
  // 实测 8000 条消息（4 万节点）分步计时：
  //   写轨道 = 0ms（只改样式）｜同帧强读 offsetWidth = 24ms（仅同步样式计算）
  //   ｜**等到下一帧 = 432ms**（真正的重排 + 绘制在这里）
  // 若 motion 标记与轨道写在同一帧，180ms 的位移动画会在 432ms 的重排期间"走完"，
  // `animationend` 随即触发 → 用户看到「点了没反应，直接跳过去」。
  //
  // 因此：本帧只负责切轨道（把重排交给这一帧），**下一帧才挂 motion 标记起跑动画**。
  // 这样动画时间轴从一个已经排好版的干净环境开始，能完整跑满 180ms。
  void frame.offsetWidth
  let done = false
  const finish = (): void => {
    if (done) return
    done = true
    win.clearTimeout(motion.timer)
    settleMotion(frame, collapsed)
  }
  const beginAnimation = (): void => {
    if (!frame.isConnected || motions.get(frame) !== motion) return
    // 位移动画（2026-10-16 性能修正）：**直接给内容列写 transform**，不再写 CSS 变量。
    //
    // 旧写法是把 `--dcu-sidebar-shift` 写在 frame 上、由 keyframes 的 var() 消费。
    // 该变量是**未注册的继承型自定义属性**：写在 frame 上时 Chromium 无法预知谁会用 var()
    // 消费它，只能作废 frame 全部后代的样式——真实宿主里 frame 是会话区祖先，长对话下
    // 后代 1.2 万个（实测：frame 写一次 44ms ／ 只含侧栏的子元素 4ms）。
    // 而 transform 是**非继承属性**，写它只作废该元素自身（实测 0.3ms）。
    // 另外 @keyframes 里含 var() 会让动画无法交给合成器；去掉后整次开合的样式重算
    // 从 172.6ms 降到 90.4ms、重算次数 17000 降到 8000。详见 KNOWN-ISSUES §27。
    //
    // 起点必须**无过渡地**落上去，否则浏览器会把「从 0 到起点」也当成一次过渡。
    const startX = collapsed ? shift / 2 : -shift / 2
    columns.center.style.transition = 'none'
    columns.center.style.transform = `translateX(${startX}px)`
    void columns.center.offsetWidth
    frame.setAttribute(SIDEBAR_MOTION_ATTRIBUTE, kind)
    // 索引栏同步位移（2026-10-19）：内容列是「伪滑动」（轨道已一帧到位），而索引栏按真实
    // 几何定位、不吃这段 transform，两者会各走各的（实测最大偏差 74px）。
    // 这里让索引栏补上同一段位移、同一时长与曲线，视觉上与内容列严格同步。
    // 必须紧跟在 motion 标记之后写入：CSS 的过渡规则以该标记为前提。
    applyRailShift(frame, startX)
    // 交回 CSS 的过渡规则（本规则只过渡 transform），从起点平滑归零到天然终点。
    columns.center.style.removeProperty('transition')
    columns.center.style.transform = 'translateX(0px)'
    // 手柄位移：left 过渡从收起视觉位滑到展开位，与内容列 transform 同曲线同步。
    // （写在动画标记之后，过渡规则才生效；transform 方向由 CSS 规则决定，不适用于手柄。）
    if (handle !== null && !collapsed) handle.style.left = `${expandedWidth}px`
    // 快路径：内容列的位移动画自然结束即落定。
    // 由 animationend 改回 transitionend：位移改走 transition（见上），且监听必须挂在
    // **起点已落、过渡已开始之后**，否则拿不到结束事件。
    columns.center.addEventListener('transitionend', (event) => {
      if (event.target === columns.center && event.propertyName === 'transform') finish()
    }, { once: true })
  }
  // 起跑**排到下一帧**：本帧留给轨道切换引发的整页重排（长对话下可达数百毫秒），
  // 下一帧才挂 motion 标记，动画时间轴因此从干净环境开始、能完整跑满。详见上方注释。
  //
  // ## 自适应跳过：从「按阻塞时长」改为「按是否失控」（2026-10-19 重做）
  //
  // 旧判据是 `blocked > duration / 2`：一旦这次重排吃掉半个动画时长就跳过动画。
  // 问题在于**它把已经付掉的成本当成了继续改进的理由**：
  //
  //   `blocked` 是轨道从 240px 切到 56px 引起的那次整页重排，**已经发生完了**。
  //   跳过动画既不能把它省回来，也不能让用户早一点看到结果——只是少了一段过渡。
  //   于是「卡一下然后瞬移」和「卡一下然后平滑滑过去」在总耗时上几乎一样，
  //   但后者至少让状态变化可被眼睛追踪到。
  //
  // 实测（2026-10-19，真实夹具）：
  //   1200 条 → 节点 8,413，blocked 26ms
  //   3000 条 → 节点 21,013，blocked 86ms（duration/2 = 90ms，就在临界点上抖动）
  // 也就是说阈值附近完全由机器抖动决定播不播，同一份代码跑两次结论可能不同。
  //
  // 新判据只拦**真正失控**的情形：重排本身已经长到用户明确感到「卡住了」
  // （> 2×duration，默认 360ms），此时再叠 180ms 动画确实只会让人更烦。
  // 这个界仍然锚定在 duration 上、随动效档位缩放，不依赖节点数常量。
  const SKIP_ANIMATION_BLOCK_MS = duration * 2
  win.requestAnimationFrame(() => {
    const blocked = win.performance.now() - reflowStarted
    if (blocked > SKIP_ANIMATION_BLOCK_MS) {
      // 失控：重排本身已经远超一个动画时长，用户早已感到「点下去没反应」。
      // 此时再补 180ms 滑动只会让总时长更长，直接到位更诚实。
      finish()
      return
    }
    beginAnimation()
  })
  // 超时兜底：动画起跑失败（标记被移除 / 帧被吞 / 页面不可见）时仍要落定。
  motion.timer = win.setTimeout(finish, duration + 120)
  return true
}

/**
 * 拖拽按下时调用：把飞行中的动画立即落定到当前静止态，
 * 避免拖拽基准读到动画中间值（展开动画中手柄已在 56px 视觉位）。
 */
export function settleSidebarMotion(frame: HTMLElement): void {
  if (motions.get(frame) === undefined) return
  settleMotion(frame, frame.hasAttribute('data-sidebar-collapsed'))
}

export function observeSlimSidebar(): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {}
  let applying = false
  let frame: HTMLElement | undefined
  let pending: number | undefined
  let frameObserver: MutationObserver | undefined
  const watchFrame = (next: HTMLElement | undefined): void => {
    if (frame === next) return
    frameObserver?.disconnect()
    frame = next
    if (frame === undefined) return
    // 在下一次绘制前修正宿主宽度，避免先向宿主默认值展开一帧再重启动画。
    frameObserver = new MutationObserver(apply)
    frameObserver.observe(frame, { attributes: true, attributeFilter: ['style', 'data-sidebar-collapsed', 'data-dragging', 'data-dcu-codex-sidebar-initialized'] })
  }
  const apply = (): void => {
    if (applying) return
    applying = true
    try {
      if (frame === undefined || !frame.isConnected) watchFrame(findSidebarFrame(document))
      if (frame === undefined) return
      rememberHostSidebar(frame)
      if (frame.hasAttribute('data-dragging')) {
        // 拖拽接管轨道：取消飞行中的开合动画（不落定——轨道归拖拽所有），
        // 否则动画定时器稍后照样落定，会和拖拽的逐帧写入打架。
        if (motions.get(frame) !== undefined) cancelMotionStyles(frame)
        return
      }
      // 尚不能应用宽度时不要写入过渡样式，否则初始化标记缺失会让监听反复触发自身。
      if (!canApplySlimSidebar(frame)) return
      const collapsed = frame.hasAttribute('data-sidebar-collapsed')
      if (!frame.hasAttribute('data-dcu-codex-sidebar-initialized')) {
        // 冷启动（含「打开时就是收起态」）：直接落定，不播动画。
        const restoreTransition = collapsed ? undefined : pauseInitialSidebarTransition(frame)
        const changed = applySlimSidebar(frame)
        if (restoreTransition !== undefined) {
          if (!changed) restoreTransition()
          else window.requestAnimationFrame(() => window.requestAnimationFrame(restoreTransition))
        }
        restStates.set(frame, collapsed)
        return
      }
      const motion = motions.get(frame)
      if (motion !== undefined) {
        // 动画飞行中：目标与宿主状态一致 → 只把轨道钉回动画基准（宿主渲染会写回自己的列值）；
        // 状态反手 → 立即落定到新状态，不留半程动画。
        if ((motion.kind === 'collapse') === collapsed) {
          pinMotionBase(frame, motion.kind)
          return
        }
        settleMotion(frame, collapsed)
        return
      }
      if (collapsed === restStates.get(frame)) {
        // 已落在目标态：仅幂等修正宿主写回的列值。
        applySlimSidebar(frame)
        return
      }
      // 状态翻转：条件满足就走合成层动画，否则（减少动态效果/拖拽中/找不到内容列）直接落定。
      if (!beginSidebarMotion(frame, collapsed)) {
        applySlimSidebar(frame)
        restStates.set(frame, collapsed)
      }
    } finally {
      applying = false
    }
  }
  const schedule = (): void => {
    if (pending !== undefined) return
    pending = window.requestAnimationFrame(() => { pending = undefined; apply() })
  }
  apply()
  const observer = new MutationObserver(() => {
    if (frame === undefined || !frame.isConnected) schedule()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    frameObserver?.disconnect()
    if (pending !== undefined) window.cancelAnimationFrame(pending)
    if (frame !== undefined) restoreHostSidebar(frame)
  }
}
