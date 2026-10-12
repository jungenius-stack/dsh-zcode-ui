import { useEffect } from 'react'
import { ZIconBranch, ZIconChannels, ZIconFolder, ZIconSettings } from './zcode-icons.tsx'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { useHoverDispatch, useHoverValue } from './hover-shell.tsx'
import { PinIcon } from './session-tree.tsx'

/** 只订阅悬停值，避免工作区树随鼠标移动整树重绘。 */
export function WorkspaceHoverCard({ t, onEditWorkspace, onToggleWorkspacePin }: { t: TranslateNS<typeof NS>; onEditWorkspace: (id: string, title: string) => void; onToggleWorkspacePin: (id: string) => void }) {
  const hoverTip = useHoverValue()
  const { keepTip, hideTip, dismissTip } = useHoverDispatch()
  useEffect(() => {
    if (hoverTip === undefined) return
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.dcu-wb-tip') !== null || target.closest('[data-dcu-title-folder]') !== null || target.closest('.dcu-wb-project-head') !== null) return
      dismissTip()
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => { window.removeEventListener('pointerdown', onPointerDown, true) }
  }, [hoverTip, dismissTip])
  if (hoverTip === undefined) return null
  const workspace = hoverTip.kind === 'workspace'
  const workspaceId = workspace ? hoverTip.id : undefined
  const taskSummary = hoverTip.unreadCount !== undefined && hoverTip.unreadCount > 0
    ? t('workspace.taskSummary', { count: hoverTip.count ?? 0, unreadCount: hoverTip.unreadCount })
    : t('workspace.taskCount', { count: hoverTip.count ?? 0 })
  return <div className={`dcu-wb-tip${workspace ? ' dcu-wb-tip-workspace' : ''}`} style={{ left: hoverTip.left, top: hoverTip.top }} onMouseEnter={keepTip} onMouseLeave={hideTip}>
    <div className="dcu-wb-tip-title">
      {workspace && <span className="dcu-wb-folder"><ZIconFolder size={16} /></span>}
      <span className="dcu-wb-tip-title-main">{hoverTip.title}</span>
      {/* 2026-10-12 实测反馈：会话行的行内右侧已常驻时长、所属项目已由树形层级表达，
          重复展示只会把卡片撑大并遮挡正文。本组件同时服务工作区行与会话行，因此只对会话行去掉这两项。
          （另注：定时任务/IM 频道浏览器里的会话卡是 session-tree.tsx 的 SessionHoverCard，与这里不是同一个组件。） */}
      {workspaceId !== undefined && <button type="button" className="dcu-wb-tip-pin" aria-label={t(hoverTip.pinned === true ? 'workspace.unpin' : 'workspace.pin')} onClick={() => { onToggleWorkspacePin(workspaceId); dismissTip() }}><PinIcon /></button>}
    </div>
    {workspace && hoverTip.count !== undefined && <div className="dcu-wb-tip-meta"><ZIconChannels aria-hidden="true" size={16} strokeWidth={1.5} /><span>{taskSummary}</span></div>}
    {workspace && hoverTip.path !== undefined && hoverTip.path !== '' && <div className="dcu-wb-tip-row dcu-wb-tip-path"><span className="dcu-wb-folder"><ZIconFolder size={16} /></span><span className="dcu-wb-tip-path-copy">{hoverTip.path}</span></div>}
    {!workspace && hoverTip.branch !== undefined && hoverTip.branch !== '' && <div className="dcu-wb-tip-row"><span className="dcu-wb-folder"><ZIconBranch size={16} /></span><span>{hoverTip.branch}</span></div>}
    {workspaceId !== undefined && <><div className="dcu-wb-tip-sep" /><button type="button" className="dcu-wb-tip-edit" onClick={() => { onEditWorkspace(workspaceId, hoverTip.title); dismissTip() }}><ZIconSettings size={16} />{t('workspace.edit')}</button></>}
  </div>
}
