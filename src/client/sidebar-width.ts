/** OpenAI Codex desktop sidebar geometry, measured from the installed client bundle. */
/**
 * 最小可拖拽宽度。
 *
 * 2026-10-26 由 240 降到 200。这不是「对齐 ZCode」——ZCode 的拖拽下限实测是 264px
 * （它确实能拖，264–599，见 cdp-capture/zcode-drag-limits.json；此前误判为「不可拖」已纠正）。
 * 我们取 200 是**主动放宽**，目的是给用户更多收窄空间，属可用性取舍而非规格对齐：
 *   默认 264 与下限 240 只差 24px，实测拖窄行程几乎为零，
 *   用户拖到 32px 处宽度就卡住，之后全是空转。
 * 取 200 的依据：会话行固定 40px 左缩进 + 64px 时间位预留 = 104px，
 * 200px 下标题仍有约 96px 可用，是「装得下标题」的下限。
 */
export const CODEX_SIDEBAR_MIN_PX = 200

/** 默认展开宽度。ZCode 实测 264（spec-final.metrics.sidebarWidth）。 */
export const CODEX_SIDEBAR_DEFAULT_PX = 264
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
  // 侧栏面的临时宽度与裁剪同理：留着会让侧栏停在展开宽度、右缘被裁掉。
  clearSidebarSlide(frame)
}

/* ---------------------------------------------------------------------------
 * 侧栏面自身的滑动（2026-10-19）
 *
 * ## 为什么侧栏也得动
 *
 * 上一版只让索引栏跟内容带走（位移取半段），结果「索引栏到侧栏右缘」的间距在开合期间
 * 从 16px 变到 108px 再回来（展开时最差为负：索引栏整段落在侧栏内部，实测重叠 76px）。
 * 根因不是同步写错了，而是**侧栏边缘自己没有运动**：网格轨道一帧就切到目标，视觉位移
 * 全靠内容列自己的 transform 伪造，所以「贴住侧栏」和「平滑滑动」在那一版里互斥。
 *
 * 这一版把侧栏面也做进同一段动画：
 *   - 飞行期间把 `.dcu-root` 的宽度**钉在展开宽度**（布局只算一次，之后不再变）；
 *   - 右缘用 `clip-path: inset(...)` 从旧宽度裁到目标宽度，时长与曲线与内容列/索引栏一致。
 * 裁剪不触发布局，因此每帧零重排；被裁掉的部分也自动退出命中测试。
 *
 * 三个量各走各的距离，这是**真实布局变化**本来就该有的结果，不是妥协：
 *   侧栏右缘走整段 shift（240 → 56）｜两条轮次索引栏同样走整段（贴边，间距恒定）
 *   ｜居中内容带只有 shift/2（列变宽后居中带自动右移一半，这是宿主居中布局的性质）
 * 索引栏的整段 = 继承内容列的半段 + applyRailShift 补的半段，见下一节。
 * ------------------------------------------------------------------------- */

/** 侧栏外壳（面）的临时宽度/裁剪由本文件写入，落定、取消、卸载三条路径都要撤掉。 */
const SIDEBAR_ROOT_SELECTOR = '.dcu-root'

/** 侧栏面裁掉的右缘宽度（= 展开宽度 - 收起轨宽）。 */
function slideClipPx(expandedWidth: number): number {
  return Math.max(0, expandedWidth - CODEX_SIDEBAR_RAIL_PX)
}

/**
 * 写入侧栏面的裁剪**起点**（无过渡）。
 *
 * 必须在挂 `data-dcu-sidebar-motion` 标记**之前**调用：过渡规则以该标记为前提，
 * 先写起点再挂标记，才不会被浏览器当成一次「从 0 到起点」的过渡。
 */
function primeSidebarSlide(frame: HTMLElement, collapsed: boolean, expandedWidth: number): void {
  const root = frame.querySelector<HTMLElement>(SIDEBAR_ROOT_SELECTOR)
  if (root === null) return
  root.style.width = `${expandedWidth}px`
  root.style.transition = 'none'
  root.style.clipPath = collapsed ? 'inset(0 0 0 0)' : `inset(0 ${slideClipPx(expandedWidth)}px 0 0)`
}

/** 交回过渡规则，让裁剪从起点跑到终点（收起=裁到 56，展开=裁到 0）。 */
function runSidebarSlide(frame: HTMLElement, collapsed: boolean, expandedWidth: number): void {
  const root = frame.querySelector<HTMLElement>(SIDEBAR_ROOT_SELECTOR)
  if (root === null) return
  root.style.removeProperty('transition')
  root.style.clipPath = collapsed ? `inset(0 ${slideClipPx(expandedWidth)}px 0 0)` : 'inset(0 0 0 0)'
}

/** 撤掉侧栏面的临时宽度、裁剪与内联过渡，交还给样式表与宿主宽度。 */
function clearSidebarSlide(frame: HTMLElement): void {
  const root = frame.querySelector<HTMLElement>(SIDEBAR_ROOT_SELECTOR)
  if (root === null) return
  root.style.removeProperty('transition')
  root.style.removeProperty('clip-path')
  root.style.removeProperty('width')
}

/* ---------------------------------------------------------------------------
 * 轮次索引栏与侧栏右缘的同步位移（2026-10-19 第三轮；判据全部来自真宿主实测）
 *
 * ## 生产环境的真实结构（2026-10-20 实测，DeepSeek Harness web profile）
 *
 * 自绘索引栏（`.dcu-turn-navigator`，TurnNavigator.tsx）与**官方轮次导航**
 * （`nav[data-dcu-official-turn-navigator]`，宿主自带、44 个刻度按钮那条）都渲染在
 * `conversation.session.header.utilities` 里，也就是**内容列内部**。因此：
 *
 *   - 两者的定位基准随网格轨道一帧切到目标（`left` 一上来就是落定值）；
 *   - 动画期间内容列带 `transform`，两者作为后代**只继承那半段位移**（shift/2）。
 *
 * 而侧栏右缘走的是整段 shift（240 → 56，见 primeSidebarSlide）。三者距离不等，
 * 间距必然变化——这就是用户反复报的「索引不跟着侧栏走、漂移」。
 * 官方导航此前**从未被补偿过**：1.16.3 的同步只写给自绘索引栏，而宿主一提供官方
 * 导航，自绘那条就被 `display:none` 藏掉（CodexSidebar.tsx 的 official 规则），
 * 用户看到的始终是官方那条——所以「改了没效果」。
 *
 * ## 做法：补偿量现算，不写死
 *
 * 每条索引栏该补多少 = **侧栏边缘的整段位移 − 它自己会继承的那段**。
 * 继承量不假设：开合前先量一次落定位，内容列位移生效后再量一次自然起点，
 * 两者之差就是继承量（真宿主实测 = startX；若某条索引栏挂在列外、不吃 transform，
 * 继承量为 0，则补整段——桌面端回报的「慢一拍、错位」正是补半段时的现象）。
 * 每次开合只多两次 layout 读取，不引入每帧读布局的成本。
 *
 * 官方导航用 `translate` 属性而非 `transform`：宿主可能自己给 nav 挂 transform，
 * 独立属性可以叠加而不覆盖。
 *
 * 三个约束不变：① 同一时间轴（起点、时长、曲线与内容列一致）；
 * ② 零额外 JS（只写自定义属性，跟随交给 CSS 过渡）；
 * ③ 落定后位移归零，定位语义不变。
 * ------------------------------------------------------------------------- */

/** 自绘索引栏消费的同步位移变量。 */
const RAIL_SYNC_VAR = '--dcu-rail-sync-shift'
/** 官方轮次导航消费的同步位移变量（同值，挂在宿主 nav 上）。 */
const OFFICIAL_RAIL_SYNC_VAR = '--dcu-official-rail-shift'
/** 索引栏标记：只有真挂载了自绘索引栏时才写变量，避免无谓的样式失效。 */
const RAIL_ATTRIBUTE = 'data-dcu-rail-sync'
/** 自绘索引栏的左缘变量（由 TurnNavigator 的 React 写入；开合时这里同步补写一次）。 */
const TURN_LEFT_VAR = '--dcu-turn-left'
/**
 * 官方轮次导航的选择器。优先用插件打过的标记；未打标时（导航刚挂载、观察器还没跑）
 * 用结构特征兜底——判定规则与 official-turn-navigator.ts 的 isOfficialTurnNavigator 一致。
 */
const OFFICIAL_RAIL_SELECTOR = 'nav[data-dcu-official-turn-navigator],nav:has(button[type="button"][data-index][aria-label])'

/**
 * 一条待补偿的轮次索引栏。
 *
 * `compensation` 由 beginAnimation 现算（见那里的推导）：不是写死的半段或整段，
 * 而是「侧栏边缘的整段位移 − 这条索引栏自己会继承的那段」。
 */
type RailShift = {
  element: HTMLElement
  /** 该元素消费的 CSS 自定义属性名。 */
  varName: string
  /** 本次要补的位移（带符号，像素）。 */
  compensation: number
}

/** 收集当前文档里所有需要补偿的轮次索引栏（自绘 + 官方，可能只有一条，也可能都没有）。 */
function collectRails(frame: HTMLElement): RailShift[] {
  const doc = frame.ownerDocument
  const rails: RailShift[] = []
  const own = doc.querySelector<HTMLElement>(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`)
  if (own !== null) rails.push({ element: own, varName: RAIL_SYNC_VAR, compensation: 0 })
  for (const nav of doc.querySelectorAll<HTMLElement>(OFFICIAL_RAIL_SELECTOR)) {
    rails.push({ element: nav, varName: OFFICIAL_RAIL_SYNC_VAR, compensation: 0 })
  }
  // display:none 的元素量不到位置（rect 全 0），补了也看不见；跳过以免算出无意义的量。
  return rails.filter(rail => rail.element.getBoundingClientRect().width > 0)
}

/** 写起点 → 强制回流 → 交回过渡 → 跑向 0。所有索引栏共用这套时间轴。 */
function primeShift(element: HTMLElement, varName: string, shiftPx: number): void {
  // 起点必须**无过渡地**落上去，否则浏览器会把「从 0 到起点」也当成一次过渡，
  // 索引栏会先滞后再追赶，偏差反而更大。
  element.style.transition = 'none'
  element.style.setProperty(varName, `${shiftPx}px`)
  void element.offsetWidth
  // 交回 CSS 的过渡规则（与内容列同为 move-duration + move-ease），从起点平滑归零。
  element.style.removeProperty('transition')
  element.style.setProperty(varName, '0px')
}

function clearShift(element: HTMLElement, varName: string): void {
  element.style.removeProperty('transition')
  element.style.removeProperty(varName)
}

/** 让所有轮次索引栏同时补上各自算好的位移。 */
function applyRailShifts(rails: readonly RailShift[]): void {
  for (const rail of rails) {
    // 兜底：自绘索引栏的 left 走 React state，比轨道切换晚一拍，那一拍里它可能压在侧栏上。
    // 侧栏面不透明（--dcu-sidebar-background 为 #f0f0f0 / #161616），落到它下面即可藏掉。
    if (rail.element.classList.contains('dcu-turn-navigator')) rail.element.style.zIndex = '0'
    primeShift(rail.element, rail.varName, rail.compensation)
  }
}

/** 移除所有轮次索引栏的同步位移与内联过渡痕迹。 */
function clearRailShift(frame: HTMLElement): void {
  const doc = frame.ownerDocument
  const own = doc.querySelector<HTMLElement>(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`)
  if (own !== null) {
    clearShift(own, RAIL_SYNC_VAR)
    // 层级必须一起还原：留在 0 会让索引栏在静止态被内容列的层叠上下文压住。
    own.style.removeProperty('z-index')
  }
  for (const nav of doc.querySelectorAll<HTMLElement>(OFFICIAL_RAIL_SELECTOR)) {
    clearShift(nav, OFFICIAL_RAIL_SYNC_VAR)
  }
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
  if (tracks?.sidebar === CODEX_SIDEBAR_DEFAULT_PX) {
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
  const width = initialized ? visibleSidebarWidths.get(frame) ?? CODEX_SIDEBAR_DEFAULT_PX : CODEX_SIDEBAR_DEFAULT_PX
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
  return visibleSidebarWidths.get(frame) ?? CODEX_SIDEBAR_DEFAULT_PX
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
    // 自绘索引栏的 left 由 React 经 ResizeObserver 异步写入，比轨道切换晚一拍——
    // 那一拍里它仍停在旧位置，用户看到的就是「索引慢一拍、错位」。这里按已知的目标轨道
    // 宽度**同步**补写一次（值与 React 最终写入的相同，因此不会互相覆盖）。
    const ownRail = frame.ownerDocument.querySelector<HTMLElement>(`.dcu-turn-navigator[${RAIL_ATTRIBUTE}]`)
    if (ownRail !== null) {
      ownRail.style.setProperty(TURN_LEFT_VAR, `${(collapsed ? CODEX_SIDEBAR_RAIL_PX : expandedWidth) + 16}px`)
    }
    // 索引栏清单：自绘 + 官方（可能都没有，也可能只有一条）。
    const rails = collectRails(frame)
    // 基准位：轨道已经在上一帧切到目标几何，内容列还没 transform，此时量到的是
    // 每条索引栏的**落定位**（= 它自己不含任何位移时的位置）。
    const baseLefts = rails.map(rail => rail.element.getBoundingClientRect().left)
    columns.center.style.transition = 'none'
    columns.center.style.transform = `translateX(${startX}px)`
    // 侧栏面的裁剪起点：与内容列同一拍、同样无过渡（见 primeSidebarSlide 的时间轴说明）。
    primeSidebarSlide(frame, collapsed, expandedWidth)
    void columns.center.offsetWidth
    // 自然起点：内容列的位移已生效，此时量到的是「索引栏自己会到的位置」。
    // 两条索引栏挂在内容列内部，会继承这段位移（实测继承量 = startX）；但**不假设**——
    // 真宿主里不同版本/不同挂载点的继承量可能不同（桌面端实测回报「慢一拍、错位」，
    // 与继承量为 0 时补半段的现象一致）。这里现算：补多少 = 侧栏边缘整段 − 自己继承的那段。
    // 侧栏边缘的位移量，取「起点 − 终点」：收起 = 240 − 56 = +shift；展开 = 56 − 240 = −shift。
    const edgeTravel = collapsed ? shift : -shift
    rails.forEach((rail, index) => {
      const naturalStart = rail.element.getBoundingClientRect().left
      rail.compensation = edgeTravel - (naturalStart - baseLefts[index])
    })
    frame.setAttribute(SIDEBAR_MOTION_ATTRIBUTE, kind)
    applyRailShifts(rails)
    // 侧栏面与内容列、索引栏同时开跑，三者共用 move-duration + move-ease。
    runSidebarSlide(frame, collapsed, expandedWidth)
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
