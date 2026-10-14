import type { DragEvent, MouseEvent, ReactNode } from 'react'
import { Menu, type MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ZIconArchive,
  ZIconBranch,
  ZIconCopy,
  ZIconDelete,
  ZIconEye,
  ZIconEyeOff,
  ZIconFolder,
  ZIconFolderOpen,
  ZIconLink,
  ZIconLoading,
  ZIconMore,
  ZIconPin,
  ZIconRename,
} from './zcode-icons.tsx'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import type { PendingInteractionKind } from './session-pending.ts'
import { sessionTitleLine } from './session-title-scroll.ts'
import { useArchiveConfirm } from './archive-confirm.ts'

export function PinIcon() {
  return <ZIconPin aria-hidden="true" size={16} strokeWidth={1.5} />
}

export function QuickArchiveIcon() {
  return <ZIconArchive aria-hidden="true" size={16} strokeWidth={1.5} />
}

/**
 * 行首置顶按钮（对齐 ZCode TaskListItem 的 pinActionButton：同一枚 16px 图钉兼作
 * 「已置顶」状态显示与「置顶/取消置顶」操作）。显示时机全部由 CSS 控制（常显 =
 * 已置顶且行首槽空闲；悬停/聚焦 = 临时接管行首槽），组件只负责属性与事件。
 * 置顶状态来自宿主（`workspaces.pinnedSessionIds`），本组件不持有任何状态。
 */
export function SessionPinButton({ pinned, label, onToggle }: { pinned: boolean; label: string; onToggle: () => void }) {
  return <button type="button" className="dcu-wb-pin" aria-label={label} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }} onClick={(event) => { event.stopPropagation(); onToggle() }}><PinIcon /></button>
}

export type SessionHoverTip = {
  title: string
  project?: string
  branch?: string
  time?: string
  left: number
  top: number
}

export function SessionHoverCard({ tip, onEnter, onLeave }: { tip: SessionHoverTip; onEnter: () => void; onLeave: () => void }) {
  // 只展示侧栏里看不到的信息：完整标题 + 分支。
  // 时长已在行内右侧常驻、所属项目已由树形层级表达，重复展示只会把卡片撑大并遮挡正文
  // （DSH 内实测反馈：卡片显示「标题 + 19小时 + 测试1」，后两项与侧栏重复）。
  return <div className="dcu-wb-tip" style={{ left: tip.left, top: tip.top }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
    <div className="dcu-wb-tip-title"><span className="dcu-wb-tip-title-main">{tip.title}</span></div>
    {tip.branch !== undefined && tip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><ZIconBranch size={16} /></span><span>{tip.branch}</span></div>}
  </div>
}

export function sessionMenuItems(t: TranslateNS<typeof NS>, options: { unread: boolean; path?: string; includePath?: boolean; moveTargets?: readonly { id: string; label: string }[]; canDelete?: boolean; pinned?: boolean; shortcutOf?: (commandId: string) => { keys: readonly string[]; aria?: string | undefined } | undefined }): MenuEntry[] {
  // 结构对齐 ZCode TaskActionMenuContent：管理组（置顶 → 重命名 → 归档 → 标记未读 → 衍生/去向，
  // 同 ZCode 以「在分屏打开」收尾）‖ 路径与复制组（「打开位置」打头，与 ZCode 的
  // 「在访达中打开」同位）‖ 删除单列（本产品能力）。
  // 置顶项只在调用方声明 `pinned` 状态时出现（工作区树声明；频道/定时树不声明——
  // 置顶是宿主的工作区账户级概念，见 KNOWN-ISSUES §20）。
  // shortcutOf 由调用方接宿主命令目录（catalog）：有官方命令的动作在行尾显示生效键帽
  // （ZCode 菜单带快捷键后缀；菜单键位一律以宿主目录为真源，不在本地硬编码）。
  const shortcut = (commandId: string): { shortcut?: { keys: readonly string[]; aria?: string | undefined } } => {
    const found = options.shortcutOf?.(commandId)
    return found === undefined ? {} : { shortcut: found }
  }
  const items: MenuEntry[] = [
    ...(options.pinned === undefined ? [] : [{ id: 'pin', label: t(options.pinned ? 'sessions.unpin' : 'sessions.pin'), icon: <PinIcon /> } satisfies MenuEntry]),
    { id: 'rename', label: t('sessions.rename'), icon: <ZIconRename size={16} />, ...shortcut('session.rename') },
    { id: 'archive', label: t('sessions.archive'), icon: <ZIconArchive size={16} />, ...shortcut('session.archive') },
    { id: 'unread', label: t(options.unread ? 'sessions.markRead' : 'sessions.markUnread'), icon: options.unread ? <ZIconEyeOff aria-hidden="true" size={16} strokeWidth={1.5} /> : <ZIconEye aria-hidden="true" size={16} strokeWidth={1.5} /> },
    { id: 'fork', label: t('sessions.fork'), icon: <ZIconBranch size={16} />, ...shortcut('session.fork') },
  ]
  if (options.moveTargets !== undefined) {
    items.push({
      id: 'moveWorkspace',
      label: t('sessions.moveWorkspace'),
      icon: <ZIconFolder size={16} />,
      disabled: options.moveTargets.length === 0,
      submenu: options.moveTargets.map(target => ({ id: target.id, label: target.label, icon: <ZIconFolder size={16} /> })),
    })
  }
  items.push(
    { type: 'separator', id: 'main-separator' },
    ...(options.includePath === true ? [{ id: 'openPath', label: t('sessions.openPath'), icon: <ZIconFolderOpen size={16} />, disabled: options.path === undefined } satisfies MenuEntry] : []),
    { id: 'copyId', label: t('sessions.copyId'), icon: <ZIconLink size={16} /> },
    { id: 'copyTitle', label: t('sessions.copyTitle'), icon: <ZIconCopy size={16} /> },
    ...(options.includePath === true ? [{ id: 'copyPath', label: t('sessions.copyPath'), icon: <ZIconCopy size={16} />, disabled: options.path === undefined } satisfies MenuEntry] : []),
  )
  if (options.canDelete !== false) {
    items.push(
      { type: 'separator', id: 'delete-separator' },
      { id: 'delete', label: t('sessions.delete'), icon: <ZIconDelete size={16} />, danger: true },
    )
  }
  return items
}

/** 把右键落点收成 Menu 的锚点矩形，让列表贴着指针打开。 */
export function pointerMenuRect(x: number, y: number): DOMRect {
  return new DOMRect(x, y, 0, 0)
}

export type SessionRowProps = {
  id: string
  title: string
  selected: boolean
  menuOpen: boolean
  unread: boolean
  running: boolean
  pendingInteraction?: PendingInteractionKind
  t: TranslateNS<typeof NS>
  menuItems: MenuEntry[]
  onOpen: () => void
  onMenuChange: (open: boolean) => void
  onSelectAction: (id: string) => void
  onArchive: () => void
  onHover: (event: MouseEvent<HTMLDivElement>) => void
  onLeave: () => void
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void
  menuPoint?: { x: number; y: number }
  subtitle?: string
  flat?: boolean
  draggable?: boolean
  dropActive?: boolean
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  time?: string
  /** 宿主置顶状态（`workspaces.pinnedSessionIds`）；不给 pin 能力的调用方不传。 */
  pinned?: boolean
  /** 提供后该行渲染行首置顶按钮（工作区树传；频道/定时树不传）。 */
  onTogglePin?: () => void
}

function pendingLabel(kind: PendingInteractionKind, t: TranslateNS<typeof NS>): string {
  switch (kind) {
    case 'approval': return t('sessions.waitingApproval')
    case 'plan-review': return t('sessions.planReview')
    case 'question': return t('sessions.waitingAnswer')
  }
}

export function SessionState({ pendingInteraction, unread, running, t }: Pick<SessionRowProps, 'pendingInteraction' | 'unread' | 'running' | 't'>) {
  // 状态指示互斥渲染、按优先级取最高（对齐 ZCode TaskListItem 的前置状态槽）：
  // 待处理胶囊（右侧）＞ 未读点（行首 16px 槽）＞ 运行中转圈（行首 16px 槽）。
  // 未读与运行中共用同一个行首槽位，同一时刻只出现一个。
  //
  // 可访问名（2026-10-14 补）：三个分支**都必须能被读出**。
  //  - 光秃的 `<span aria-label>` 是无效的：span 映射到 `generic` 角色，而 ARIA 1.2
  //    对 generic 的规定是「Name From: prohibited」，标签会被直接忽略。
  //    因此未读点与运行中必须显式给 `role="img"` 才有名字。
  //  - 运行中此前是 `aria-hidden="true"` 且无文本替代——视觉用户看得到转圈，
  //    屏幕阅读器用户得到的是**零信息**，而这是并发多会话场景最需要的状态之一。
  if (pendingInteraction !== undefined) {
    const label = pendingLabel(pendingInteraction, t)
    return <span className="dcu-wb-pending" data-state="warning" data-pending-kind={pendingInteraction}><span className="dcu-wb-pending-dot" aria-hidden="true" /><span className="dcu-wb-pending-label">{label}</span></span>
  }
  if (unread) return <span className="dcu-wb-unread" role="img" aria-label={t('sessions.unread')} />
  // 运行中：ZCode Spinner（LoaderIcon，size-4，1s linear 由 .dcu-spin 提供）。见 zcode-icons 的 ZIconLoading。
  if (running) return <span className="dcu-wb-running" role="img" aria-label={t('sessions.running')}><ZIconLoading size={16} className="dcu-spin" aria-hidden="true" /></span>
  return null
}

export function SessionTime({ time }: { time?: string }) {
  if (time === undefined || time === '') return null
  return <span className="dcu-wb-session-time">{time}</span>
}

export function SessionRowTitle({ title }: { title: string }) {
  // 纯 ellipsis 截断，完整标题交给 tooltip 承担。
  // 原先的「hover 跑马灯」已移除：父容器 `.dcu-wb-session-title` 是 overflow:hidden，
  // 而滚动时内层被撑成 width:max-content 再叠加 translateX，导致标题**两端同时被裁**
  // （实测容器 130px、文字 175px，滚动中途左右都不可读）。
  return <span className="dcu-wb-session-title"><span className="dcu-wb-session-title-text">{sessionTitleLine(title)}</span></span>
}

export function SessionRow({
  id, title, selected, menuOpen, unread, running, pendingInteraction, t, menuItems,
  onOpen, onMenuChange, onSelectAction, onArchive, onHover, onLeave, onContextMenu, menuPoint,
  subtitle, flat, draggable, dropActive, onDragStart, onDragEnd, onDragOver, onDrop, time,
  pinned, onTogglePin,
}: SessionRowProps) {
  // 行内归档两步确认 + 行键盘语义（对齐 ZCode TaskListItem：行可聚焦、Enter/空格打开、
  // 首次点击归档进确认态、Escape / 条目外 pointerdown 取消、二次点击才执行）。
  const archiveConfirm = useArchiveConfirm()
  const confirmingArchive = archiveConfirm.confirmingId === id
  const requestArchive = (): void => { if (archiveConfirm.press(id)) onArchive() }
  return <div data-dcu-session={id} data-pinned={pinned === true ? 'true' : undefined} className={`dcu-wb-session${selected ? ' dcu-wb-selected' : ''}${menuOpen ? ' dcu-wb-menu-open' : ''}${dropActive === true ? ' dcu-wb-drop' : ''}${flat === true ? ' dcu-wb-session-flat' : ''}${confirmingArchive ? ' dcu-wb-archive-confirming' : ''}`} role="treeitem" aria-selected={selected} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop} onClick={onOpen} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen() } }} onContextMenu={onContextMenu} onMouseEnter={onHover} onMouseLeave={onLeave}>
    {subtitle !== undefined && subtitle !== '' ? <span className="dcu-wb-session-copy"><SessionRowTitle title={title} /><span className="dcu-wb-session-sub">{subtitle}</span></span> : <SessionRowTitle title={title} />}
    <SessionState pendingInteraction={pendingInteraction} unread={unread} running={running} t={t} />
    {onTogglePin !== undefined && <SessionPinButton pinned={pinned === true} label={t(pinned === true ? 'sessions.unpin' : 'sessions.pin')} onToggle={onTogglePin} />}
    <SessionTime time={time} />
    <span className="dcu-wb-quick-actions">
      {confirmingArchive
        ? <button type="button" className="dcu-wb-confirm" onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }} onClick={(event) => { event.stopPropagation(); requestArchive() }}>{t('sessions.confirm')}</button>
        : <button type="button" className="dcu-wb-more" aria-label={t('sessions.archive')} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }} onClick={(event) => { event.stopPropagation(); requestArchive() }}><QuickArchiveIcon /></button>}
    </span>
    <span className="dcu-wb-actions">
      <Menu open={menuOpen} onClose={() => { onMenuChange(false) }} items={menuItems} onSelect={onSelectAction} portal dense getAnchorRect={menuPoint === undefined ? undefined : () => pointerMenuRect(menuPoint.x, menuPoint.y)} anchor={<button type="button" className="dcu-wb-more dcu-wb-context-anchor" aria-label={t('sessions.actions', { name: title })} onClick={(event) => { event.stopPropagation(); onMenuChange(!menuOpen) }}><ZIconMore size={16} /></button>} />
    </span>
  </div>
}

export function GroupHead({ expanded, title, icon, onToggle, actions, menuOpen }: { expanded: boolean; title: string; icon: ReactNode; onToggle: () => void; actions?: ReactNode; menuOpen?: boolean }) {
  // tabindex 由 tree-keyboard 的 roving 统一管理，行内不再写死 tabIndex={0}
  // （写死会让全树每一行都进 Tab 序列，100 个会话就是 100 次 Tab）。
  return <div className={`dcu-wb-project-head${menuOpen === true ? ' dcu-wb-menu-open' : ''}`} role="treeitem" aria-expanded={expanded} onClick={onToggle} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onToggle() } }}>
    <span className="dcu-wb-folder">{icon}</span>
    <span className="dcu-wb-project-title">{title}</span>
    {actions !== undefined && <span className="dcu-wb-actions">{actions}</span>}
  </div>
}
