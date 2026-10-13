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
  // 分隔后是「在访达中打开 → 复制 …」组，辅助动作之后收尾。本插件无会话置顶、删除为本产品能力。
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
