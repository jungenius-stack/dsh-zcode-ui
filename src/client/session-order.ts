/**
 * 侧栏会话全序与相邻切换（对齐 ZCode 的「上/下一个任务」）。
 *
 * 调用方（快捷键命令）在触发时现读快照与本地偏好缓存，因此这里全是纯函数：
 * 顺序的段序与行序同侧栏树（CodexWorkspaceBrowser）共用同一批助手
 * （visibleSessionIds / ungroupedSessionIds / orderByIds / groupedWorkspaceIds），
 * 保证「快捷键走到的会话」就是「侧栏里看到的相邻行」。
 *
 * 段序：置顶项目 → 项目分组（组内按组员顺序）→ 未分组项目 → 最近。
 * 折叠状态不参与（与 ZCode 相同：折叠不改变任务集合，只改变显示）。
 */
import { orderByIds, ungroupedSessionIds, visibleSessionIds } from './workspace-browser.ts'
import { groupedWorkspaceIds, type WorkspaceGroup } from '../workspace-groups.ts'

type WorkspaceItemLike = { readonly workspaceId: string; readonly sessionIds: readonly string[] }

type SessionRowLike = {
  readonly id?: string
  readonly origin?: string | undefined
  readonly blank?: boolean | undefined
  readonly title?: string | undefined
  readonly displayTitle?: string | undefined
  readonly updatedAt?: number
}

export type SessionOrderInput = {
  readonly workspaces: {
    readonly items: readonly WorkspaceItemLike[]
    readonly archivedSessionIds?: readonly string[]
  }
  readonly sessions: {
    readonly byId: Readonly<Record<string, SessionRowLike | undefined>>
    readonly ids?: readonly string[]
  }
  readonly pinnedWorkspaceIds: readonly string[]
  readonly workspaceGroups: readonly WorkspaceGroup[]
}

/** 可见行形状（与 workspace-browser 的 SessionSummary 结构一致；那个类型未导出，这里显式复述）。 */
type VisibleRow = { id: string; origin?: string | undefined; blank?: boolean | undefined; title?: string | undefined; displayTitle?: string | undefined }

/** 侧栏可见会话的全序：置顶项目 → 分组 → 未分组 → 最近。 */
export function flattenSidebarSessionOrder(input: SessionOrderInput): string[] {
  const archived = input.workspaces.archivedSessionIds ?? []
  const byId = input.sessions.byId as Readonly<Record<string, VisibleRow | undefined>>
  const items = input.workspaces.items.map(workspace => ({ ...workspace, visibleIds: visibleSessionIds(workspace.sessionIds, byId, archived) }))
  const pinned = new Set(input.pinnedWorkspaceIds)
  const pinnedItems = orderByIds(items, input.pinnedWorkspaceIds, workspace => String(workspace.workspaceId))
  const regular = items.filter(workspace => !pinned.has(String(workspace.workspaceId)))
  const grouped = new Set(groupedWorkspaceIds(input.workspaceGroups))
  const ungrouped = regular.filter(workspace => !grouped.has(String(workspace.workspaceId)))
  const regularById = new Map(regular.map(workspace => [String(workspace.workspaceId), workspace]))
  const order: string[] = []
  for (const workspace of pinnedItems) order.push(...workspace.visibleIds)
  for (const group of input.workspaceGroups) {
    for (const id of group.workspaceIds) {
      const workspace = regularById.get(String(id))
      if (workspace !== undefined) order.push(...workspace.visibleIds)
    }
  }
  for (const workspace of ungrouped) order.push(...workspace.visibleIds)
  // 最近：未分配到任何项目的会话，按最后更新时间降序（同侧栏 recentIds）。
  const assigned = input.workspaces.items.flatMap(workspace => workspace.sessionIds.map(id => String(id)))
  const recent = ungroupedSessionIds(input.sessions.ids ?? Object.keys(input.sessions.byId), byId, assigned, archived)
    .sort((left, right) => (input.sessions.byId[right]?.updatedAt ?? 0) - (input.sessions.byId[left]?.updatedAt ?? 0))
  order.push(...recent)
  return order
}

/**
 * 上/下一个会话解析 —— ZCode `resolveQuickPickConversationNavigation` 的逐字移植
 * （packages/ui/src/lib/quickPickConversationNavigation.ts）。语义：
 * - 先对传入列表去重、滤空串，保持原顺序（调用方给的是侧栏顺序）；
 * - 不循环：走到边界返回 null（命令据此报 blocked，而不是绕回另一端）；
 * - 当前会话不在列表时（如正停在首页）：previous = 列表最后一个，next = 列表第一个。
 */
export function resolveAdjacentSessionNavigation(params: {
  readonly sessionIds: readonly string[]
  readonly currentId: string | null | undefined
}): { previousSessionId: string | null; nextSessionId: string | null } {
  const sessionIds = [...new Set(params.sessionIds.filter(id => id.length > 0))]
  const activeIndex = params.currentId ? sessionIds.indexOf(params.currentId) : -1
  const previousBaseIndex = activeIndex === -1 ? sessionIds.length : activeIndex
  const nextBaseIndex = activeIndex === -1 ? -1 : activeIndex
  const previousSessionId = sessionIds[previousBaseIndex - 1] ?? null
  const nextSessionId = sessionIds[nextBaseIndex + 1] ?? null
  return { previousSessionId, nextSessionId }
}
