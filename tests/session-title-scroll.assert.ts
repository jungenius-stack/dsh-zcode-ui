import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sessionTitleLine } from '../src/client/session-title-scroll.ts'

assert.equal(sessionTitleLine('第一行\n第二行'), '第一行')
assert.equal(sessionTitleLine('只有一行'), '只有一行')
assert.equal(sessionTitleLine('a\r\nb'), 'a')

// 防复发：标题跑马灯机制已移除。
// 原实现让内层 width:max-content 后叠加 translateX，而父容器是 overflow:hidden，
// 导致长标题滚动时两端同时被裁（实测容器 130px、文字 175px）。现改为纯 ellipsis，
// 完整标题由 tooltip 承担。
const tree = readFileSync(new URL('../src/client/session-tree.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(tree, /data-overflow/, '会话标题不得再启用溢出测量（跑马灯已移除）')
assert.doesNotMatch(tree, /titleScrollDurationMs|titleOverflowPx/, '标题滚动时长 / 溢出计算不得再被引用')

const browser = readFileSync(new URL('../src/client/CodexWorkspaceBrowser.tsx', import.meta.url), 'utf8')
assert.doesNotMatch(browser, /dcu-wb-title-scroll/, '标题跑马灯动画不得再出现在样式表中')
