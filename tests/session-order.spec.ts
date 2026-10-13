import { expect, test } from 'vitest'
import { flattenSidebarSessionOrder, resolveAdjacentSessionNavigation } from '../src/client/session-order.ts'

/** 会话行的最小形状（与宿主快照结构一致）。 */
type Row = { id?: string; blank?: boolean; origin?: string; title?: string; displayTitle?: string; updatedAt?: number }

const task = (id: string, updatedAt = 0): Row => ({ id, updatedAt })

// ── resolveAdjacentSessionNavigation：ZCode `resolveQuickPickConversationNavigation` 语义逐条 ──

test('中间位置：前后各取相邻一项', () => {
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b', 'c'], currentId: 'b' }))
    .toEqual({ previousSessionId: 'a', nextSessionId: 'c' })
})

test('边界不循环：头部 previous 为 null，尾部 next 为 null', () => {
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b'], currentId: 'a' }))
    .toEqual({ previousSessionId: null, nextSessionId: 'b' })
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b'], currentId: 'b' }))
    .toEqual({ previousSessionId: 'a', nextSessionId: null })
})

test('单项与空列表：双向都是 null（命令据此报 blocked）', () => {
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a'], currentId: 'a' }))
    .toEqual({ previousSessionId: null, nextSessionId: null })
  expect(resolveAdjacentSessionNavigation({ sessionIds: [], currentId: 'a' }))
    .toEqual({ previousSessionId: null, nextSessionId: null })
})

test('当前会话不在列表（含 null / undefined）：previous 取末位、next 取首位（ZCode 回退）', () => {
  const fallback = { previousSessionId: 'c', nextSessionId: 'a' }
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b', 'c'], currentId: 'x' })).toEqual(fallback)
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b', 'c'], currentId: null })).toEqual(fallback)
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b', 'c'], currentId: undefined })).toEqual(fallback)
})

test('先去重、再滤空串，邻接关系按净化后的列表计算（ZCode 同序）', () => {
  expect(resolveAdjacentSessionNavigation({ sessionIds: ['a', 'b', 'a', '', 'c'], currentId: 'b' }))
    .toEqual({ previousSessionId: 'a', nextSessionId: 'c' })
})

// ── flattenSidebarSessionOrder：与侧栏树同段序、同行序 ──

const ws = (workspaceId: string, sessionIds: string[]): { workspaceId: string; sessionIds: string[] } => ({ workspaceId, sessionIds })
const group = (id: string, workspaceIds: string[]): { id: string; title: string; workspaceIds: string[] } => ({ id, title: id, workspaceIds })

test('默认段序：项目顺序 × 项目内行序', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1', 's2']), ws('w2', ['s3'])] },
    sessions: { byId: { s1: task('s1'), s2: task('s2'), s3: task('s3') } },
    pinnedWorkspaceIds: [],
    workspaceGroups: [],
  })
  expect(order).toEqual(['s1', 's2', 's3'])
})

test('置顶项目最先，且按置顶顺序而非项目列表顺序', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1']), ws('w2', ['s2']), ws('w3', ['s3'])] },
    sessions: { byId: { s1: task('s1'), s2: task('s2'), s3: task('s3') } },
    pinnedWorkspaceIds: ['w3', 'w1'],
    workspaceGroups: [],
  })
  expect(order).toEqual(['s3', 's1', 's2'])
})

test('分组段：组内按组员顺序，未分组项目排在其后', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1']), ws('w2', ['s2']), ws('w3', ['s3'])] },
    sessions: { byId: { s1: task('s1'), s2: task('s2'), s3: task('s3') } },
    pinnedWorkspaceIds: [],
    workspaceGroups: [group('g1', ['w3', 'w1'])],
  })
  expect(order).toEqual(['s3', 's1', 's2'])
})

test('归档会话与未加载行被剔除（与侧栏可见性一致）', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1', 's2', 's3', 's4', 's5'])], archivedSessionIds: ['s2'] },
    sessions: { byId: { s1: task('s1'), s2: task('s2'), s3: task('s3'), s5: task('s5') } },
    pinnedWorkspaceIds: [],
    workspaceGroups: [],
  })
  expect(order).toEqual(['s1', 's3', 's5'])
})

test('空会话（blank）与子代理（origin=subagent）不进导航', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1', 's2', 's3'])] },
    sessions: { byId: { s1: task('s1'), s2: { id: 's2', blank: true }, s3: { id: 's3', origin: 'subagent' } } },
    pinnedWorkspaceIds: [],
    workspaceGroups: [],
  })
  expect(order).toEqual(['s1'])
})

test('最近段：未分配到项目的会话按更新时间降序附在最后', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1'])] },
    sessions: { byId: { s1: task('s1'), r1: task('r1', 1), r2: task('r2', 2) }, ids: ['s1', 'r1', 'r2'] },
    pinnedWorkspaceIds: [],
    workspaceGroups: [],
  })
  expect(order).toEqual(['s1', 'r2', 'r1'])
})

test('未知的置顶 id 与组内未知 id 被忽略，不影响全序', () => {
  const order = flattenSidebarSessionOrder({
    workspaces: { items: [ws('w1', ['s1'])] },
    sessions: { byId: { s1: task('s1') } },
    pinnedWorkspaceIds: ['nope'],
    workspaceGroups: [group('g1', ['nope'])],
  })
  expect(order).toEqual(['s1'])
})
