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
/** 位移量变量（px），由 CSS 消费。 */
const SIDEBAR_SHIFT_VAR = '--dcu-sidebar-shift'
/** 宿主侧栏列 / 内容列标记，由 CSS 消费。 */
const SIDEBAR_COLUMN_ATTRIBUTE = 'data-dcu-sidebar-column'
const CENTER_COLUMN_ATTRIBUTE = 'data-dcu-center-column'

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
  frame.style.removeProperty(SIDEBAR_SHIFT_VAR)
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

/** 动画基准轨道：收起动画停在展开几何，展开动画停在收起几何。 */
function pinMotionBase(frame: HTMLElement, kind: 'collapse' | 'expand'): void {
  const tracks = parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks === undefined) return
  const base = kind === 'collapse' ? targetExpandedWidth(frame) : CODEX_SIDEBAR_RAIL_PX
  const next = `${base}px ${tracks.middle} ${tracks.details}`
  if (frame.style.gridTemplateColumns === next) return
  writeFrameTrackPaused(frame, next)
}

/** 取消飞行中的动画样式（不落定——调用方自己决定轨道归谁）。 */
function cancelMotionStyles(frame: HTMLElement): void {
  cancelSidebarMotion(frame)
  frame.removeAttribute(SIDEBAR_MOTION_ATTRIBUTE)
  frame.style.removeProperty(SIDEBAR_SHIFT_VAR)
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
    frame.style.removeProperty(SIDEBAR_SHIFT_VAR)
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
  const columns = markColumns(frame)
  if (columns === undefined) return false
  const expandedWidth = targetExpandedWidth(frame)
  const shift = expandedWidth - CODEX_SIDEBAR_RAIL_PX
  if (!(shift > 0)) return false
  const kind = collapsed ? 'collapse' : 'expand'
  const duration = readMoveDuration(frame)
  const motion: SidebarMotion = { kind, timer: 0 }
  motions.set(frame, motion)

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
    // 基准轨道：收起=展开几何（内容列留在宽轨道上位移），展开=收起几何。
    const base = collapsed ? expandedWidth : CODEX_SIDEBAR_RAIL_PX
    if (tracks !== undefined) frame.style.gridTemplateColumns = `${base}px ${tracks.middle} ${tracks.details}`
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
  frame.style.setProperty(SIDEBAR_SHIFT_VAR, `${shift}px`)
  frame.setAttribute(SIDEBAR_MOTION_ATTRIBUTE, kind)
  // 手柄位移：left 过渡从收起视觉位滑到展开位，与内容列 transform 同曲线同步。
  // （写在动画标记之后，过渡规则才生效；transform 方向由 CSS 规则决定，不适用于手柄。）
  if (handle !== null && !collapsed) handle.style.left = `${expandedWidth}px`

  let done = false
  const finish = (): void => {
    if (done) return
    done = true
    win.clearTimeout(motion.timer)
    settleMotion(frame, collapsed)
  }
  // 快路径：transform 过渡自然结束；兜底：页面不可见/过渡被跳过时超时落定。
  columns.center.addEventListener('transitionend', (event) => {
    if (event.target === columns.center && event.propertyName === 'transform') finish()
  }, { once: true })
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
