import { expect, test } from 'vitest'
import { sessionMenuItems } from '../src/client/session-tree.tsx'

const t = ((key: string) => key) as Parameters<typeof sessionMenuItems>[0]

function ids(items: ReturnType<typeof sessionMenuItems>): string[] {
  return items.map(item => item.id)
}

test('允许删除时菜单底部包含删除会话', () => {
  expect(ids(sessionMenuItems(t, { unread: false, canDelete: true }))).toContain('delete')
})

test('未安装归档删除能力时不出现删除会话和删除分隔线', () => {
  const items = sessionMenuItems(t, { unread: false, canDelete: false })
  expect(ids(items)).not.toContain('delete')
  expect(ids(items)).not.toContain('delete-separator')
})

test('菜单结构对齐 ZCode：管理组（含衍生/去向）‖ 路径与复制组 ‖ 删除', () => {
  // ZCode TaskActionMenuContent：管理组以「打开/衍生」动作收尾（pin/rename/archive/unread/split），
  // 分隔后是「在访达中打开 → 复制 …」组，辅助动作之后收尾。删除为本产品能力。
  expect(ids(sessionMenuItems(t, { unread: false, canDelete: true }))).toEqual(
    ['rename', 'archive', 'unread', 'fork', 'main-separator', 'copyId', 'copyTitle', 'delete-separator', 'delete'],
  )
  expect(ids(sessionMenuItems(t, {
    unread: false,
    includePath: true,
    path: 'D:\\Work\\demo',
    moveTargets: [{ id: 'move:target', label: '目标项目' }],
    canDelete: true,
  }))).toEqual(
    ['rename', 'archive', 'unread', 'fork', 'moveWorkspace', 'main-separator', 'openPath', 'copyId', 'copyTitle', 'copyPath', 'delete-separator', 'delete'],
  )
})

test('置顶项只在声明状态时出现，且位于管理组最前（pin → rename → archive → unread，ZCode 同序）', () => {
  const withUnpinned = sessionMenuItems(t, { unread: false, canDelete: true, pinned: false })
  expect(ids(withUnpinned)[0]).toBe('pin')
  expect(withUnpinned[0]).toMatchObject({ label: 'sessions.pin' })
  const withPinned = sessionMenuItems(t, { unread: false, canDelete: true, pinned: true })
  expect(withPinned[0]).toMatchObject({ id: 'pin', label: 'sessions.unpin' })
  // 置顶项在重命名之前，其余顺序不变。
  expect(ids(withPinned).slice(1, 4)).toEqual(['rename', 'archive', 'unread'])
  // 不声明 pinned 的调用方（频道/定时树）不得出现置顶项。
  expect(ids(sessionMenuItems(t, { unread: false, canDelete: true }))).not.toContain('pin')
})

test('shortcutOf 提供目录时重命名/归档/继续显示生效键帽，无目录的动作不显示', () => {
  const catalog = new Map([
    ['session.rename', { keys: ['⌘', '⌥', 'G'], aria: 'Meta+Alt+G' }],
    ['session.archive', { keys: ['⌘', '⇧', 'A'], aria: 'Meta+Shift+A' }],
    ['session.fork', { keys: ['⌘', '⌥', 'F'], aria: 'Meta+Alt+F' }],
  ])
  const items = sessionMenuItems(t, { unread: false, canDelete: true, shortcutOf: id => catalog.get(id) })
  const byId = new Map(items.map(item => [item.id, item as { shortcut?: unknown }]))
  expect(byId.get('rename')?.shortcut).toEqual({ keys: ['⌘', '⌥', 'G'], aria: 'Meta+Alt+G' })
  expect(byId.get('archive')?.shortcut).toEqual({ keys: ['⌘', '⇧', 'A'], aria: 'Meta+Shift+A' })
  expect(byId.get('fork')?.shortcut).toEqual({ keys: ['⌘', '⌥', 'F'], aria: 'Meta+Alt+F' })
  // 无对应官方命令的动作（标记未读/删除）不得凭空显示键帽。
  expect(byId.get('unread')?.shortcut).toBeUndefined()
  expect(byId.get('delete')?.shortcut).toBeUndefined()
  // 未提供目录（旧宿主）时所有项都不带键帽。
  expect(sessionMenuItems(t, { unread: false, canDelete: true }).every(item => (item as { shortcut?: unknown }).shortcut === undefined)).toBe(true)
})
