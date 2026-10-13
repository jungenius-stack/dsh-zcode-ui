import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 运行面行为在 tests/session-navigation-shortcuts.spec.ts（伪造命令服务逐项断言）；
// 这里只锁接线与架构约束——它们出错时不会让测试变红，只会让功能静默缺失。

const index = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const module = readFileSync(new URL('../src/client/session-navigation-shortcuts.ts', import.meta.url), 'utf8')

assert.match(index, /installSessionNavigationShortcuts\(ctx, \{/, '插件入口必须安装上/下一个会话的键盘命令')
assert.match(index, /readOrder: \(\) => flattenSidebarSessionOrder\(\{/, '顺序必须每次触发现读（不缓存快照），否则偏好与列表变化后导航会走错行')
assert.match(index, /currentId: \(\) => currentSessionId\(ctx\.sessions\.list\.getSnapshot\(\)\)/, '当前会话必须取自会话列表快照')
assert.match(index, /openSession: sessionId => \{ openConversation\(ctx, ctx\.layout, sessionId\) \}/, '打开必须走既有 openConversation（与侧栏点击同一条路径）')
assert.match(index, /readPinnedWorkspaceIds\(shortcutStorage\)/, '导航顺序必须读置顶偏好缓存（与侧栏树同源）')
assert.match(index, /readWorkspaceGroupsCache\(shortcutStorage\)\.workspaceGroups/, '导航顺序必须读分组偏好缓存（与侧栏树同源）')

assert.doesNotMatch(index, /export const inject = \[[^\]]*'shortcuts'/, "不得把 shortcuts 放进静态 inject：旧宿主没有该服务时会整体拒绝加载插件；改用 ctx.inject 延迟注册")
assert.match(module, /ctx\.inject\(\['shortcuts'\]/, '命令注册必须等服务就绪（ctx.inject），提前 ctx.get 会永久丢掉注册机会')
assert.match(module, /context\.modal != null/, '模态打开时不得接管键盘（与官方 rename 同类防御）')

console.log('会话导航快捷键接线断言通过')
