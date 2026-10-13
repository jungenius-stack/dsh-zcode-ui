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

test('菜单顺序对齐 ZCode：重命名 → 归档 → 标记未读', () => {
  // ZCode TaskActionMenuContent 的行操作顺序为 pin → rename → archive → markUnread；
  // 本插件无会话置顶能力（见 session-tree.assert），其余顺序必须一致。
  const items = ids(sessionMenuItems(t, { unread: false, canDelete: false }))
  expect(items.indexOf('rename')).toBeGreaterThanOrEqual(0)
  expect(items.indexOf('rename')).toBeLessThan(items.indexOf('archive'))
  expect(items.indexOf('archive')).toBeLessThan(items.indexOf('unread'))
})
