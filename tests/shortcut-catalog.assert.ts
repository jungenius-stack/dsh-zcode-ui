import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// 运行面行为在 session-menu-items.spec.ts（shortcutOf 透传键帽）；这里锁接线与架构约束——
// 它们出错时不会让测试变红，只会让提示静默消失或退回两份各自维护的目录。

const catalog = readFileSync(new URL('../src/client/shortcut-catalog.ts', import.meta.url), 'utf8')
const index = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const browser = readFileSync(new URL('../src/client/CodexWorkspaceBrowser.tsx', import.meta.url), 'utf8')

assert.match(catalog, /ctx\.inject\(\['shortcuts'\]/, '目录桥必须等服务就绪后订阅（服务可能晚于插件启动）')
assert.match(catalog, /export function useShortcutLookup/, '目录查询必须提供共享钩子（侧栏与行菜单同一份实现）')

assert.match(index, /const shortcutCatalog = liveShortcutCatalog\(ctx\)/, '插件入口必须建立唯一目录源')
assert.match(index, /registerSettingsPage\(ctx, shortcutCatalog\)/, '设置页必须复用同一份目录源')
assert.match(index, /workspaceShortcuts,\n\s+shortcuts: shortcutCatalog,/, '侧栏注入必须带命令目录')
assert.match(index, /openConversation\(ctx, ctx\.layout, sessionId\) \},\n\s+shortcuts: shortcutCatalog,/, '工作区树注入必须带命令目录')

assert.match(sidebar, /aria-keyshortcuts=\{shortcutOf\('session\.search'\)\?\.aria\}/, '搜索按钮必须标出宿主 session.search 键位')
assert.match(sidebar, /aria-keyshortcuts=\{shortcutOf\('session\.new'\)\?\.aria\}/, '新建按钮必须标出宿主 session.new 键位')
assert.equal((sidebar.match(/aria-keyshortcuts=\{shortcutOf\('session\.search'\)/g) ?? []).length, 2, '宽/窄两种侧栏形态的搜索按钮都要标注')
assert.equal((sidebar.match(/aria-keyshortcuts=\{shortcutOf\('session\.new'\)/g) ?? []).length, 2, '宽/窄两种侧栏形态的新建按钮都要标注')

assert.match(browser, /shortcutOf,\n  \}\)/, '任务树菜单必须把目录透传给行菜单（键帽后缀）')
assert.match(browser, /aria-keyshortcuts=\{shortcutOf\('session\.new'\)\?\.aria\}/, '项目新建会话按钮必须标出 session.new 键位')

console.log('命令目录桥接线断言通过')
