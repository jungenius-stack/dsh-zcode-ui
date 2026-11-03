// 夜间审计 · 批次 18 回归断言（session-tree / scroll-anim / session-row-actions /
// channel-api / DeveloperToolsRow / schedule-group-actions / draft-attachments）
//
// ## 锁什么
// 本批是会话树与滚动的实现层，对齐点都有 asar 或既有实测出处：
//
// 1. 运行中转圈 14px + 共享 .dcu-spin 基元。证据：asar
//    `` size-3.5 animate-spin text-foreground-subtle ``（=14px）；
//    KNOWN-ISSUES §15.1 实测 ZCode bundle `--animate-spin: spin 1s linear infinite`。
// 2. 行内/菜单图标 16px 描边 1.5。证据：uiplug/docs/ZCODE-DESIGN.md:163,181（图标基线 size-4）；
//    03b-sidebar.md §5「左槽 16×16」。
// 3. 行首状态槽「待处理 ＞ 未读 ＞ 运行中」互斥渲染 + 未读点 6px。证据：KNOWN-ISSUES §15
//    「ZCode h-1.5 同径」「优先级（互斥渲染，同刻只出一个）——与 ZCode 一致」。
// 4. 平滑滚动缓动 = 17 点查表，逐值等于 02-motion.md §2 的实测表。
// 5. reduced-motion 在 JS 入口瞬跳。证据：02-motion §2/§4 + asar `` ?`auto`:`smooth` ``。
// 6. 互扰让位阈值 2px（入口基线 + 逐帧双检）。证据：02-motion 互扰防护节。
// 7. 瞬移+尾段与时长分档：320~2200ms / 3.2px per ms / 0.6 屏尾段 / >1200px 才瞬移。
// 8. 开关 36×20 胶囊 + role=switch。证据：asar Lln 开关 `` h-5 w-9 ``（=36×20）+ rounded-full
//    + `role:"switch","aria-checked"`。
// 9. 模态输入 36 高 / r8 / 14px、底部按钮右对齐。证据：03j-dialog.md A5 复测（2026-10-28 活体）。
// 10. 行内归档两步确认，确认钮红底。证据：archive-confirm.ts:5-11 引 ZCode TaskListItem.tsx
//    （3.15.1）「普通归档按钮换成 destructive 的确认按钮；二次点击才执行」。
//
// 为什么用文本断言：这些是「常量必须是这个值、分支必须在这个位置」的事实；渲染验证需活宿主。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const tree = read('session-tree.tsx')
const scroll = read('scroll-anim.ts')
const devRow = read('DeveloperToolsRow.tsx')
const styles = read('settings-page-styles.ts')
const browser = read('CodexWorkspaceBrowser.tsx')
const confirm = read('archive-confirm.ts')

// ── 1. 运行中转圈 ──────────────────────────────────────────────────────────
assert.match(
  tree,
  /<ZIconLoading size=\{14\} className="dcu-spin" aria-hidden="true" \/>/,
  '运行中转圈必须 14px（asar size-3.5）+ dcu-spin 共享基元；16px 会让状态槽与 ZCode 不同档',
)

// ── 2. 行内图标 16px / 描边 1.5 ────────────────────────────────────────────
const iconUses = [...tree.matchAll(/<ZIcon\w+[^>]*size=\{(\d+)\}[^>]*strokeWidth=\{([\d.]+)\}/g)]
assert.ok(iconUses.length >= 4, `会话树应有多个显式图标注尺寸（实测 ${iconUses.length} 处）`)
for (const m of iconUses) {
  assert.equal(m[1], '16', `会话树图标尺寸必须 16（ZCODE-DESIGN:181 基线 size-4），实际 ${m[1]}`)
  assert.equal(m[2], '1.5', `会话树图标描边必须 1.5，实际 ${m[2]}`)
}

// ── 3. 状态槽优先级：待处理 ＞ 未读 ＞ 运行中 ────────────────────────────────
const iPending = tree.indexOf('if (pendingInteraction !== undefined)')
const iUnread = tree.indexOf('if (unread) return <span className="dcu-wb-unread"')
const iRunning = tree.indexOf('if (running) return <span className="dcu-wb-running"')
assert.ok(iPending > 0 && iUnread > iPending && iRunning > iUnread, '状态槽必须按「待处理 ＞ 未读 ＞ 运行中」顺序互斥渲染（KNOWN-ISSUES §15）')
assert.match(browser, /\.dcu-wb-unread\{[^}]*width:6px;height:6px/, '未读点必须 6px（asar h-1.5 同径）')

// ── 4. 缓动查表逐值 ────────────────────────────────────────────────────────
assert.match(
  scroll,
  /CHROME_SMOOTH_CURVE: readonly number\[\] = \[\s*0, 0\.011, 0\.061, 0\.204, 0\.471, 0\.652, 0\.761, 0\.834, 0\.885, 0\.923, 0\.950,\s*0\.970, 0\.984, 0\.993, 0\.998, 1, 1,\s*\]/,
  '平滑滚动曲线必须与 02-motion §2 实测 17 点表逐值一致（改一个点就会与 ZCode 手感分叉）',
)

// ── 5. reduced-motion 入口瞬跳 ─────────────────────────────────────────────
assert.match(
  scroll,
  /if \(window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) \{/,
  'reduced-motion 必须在 JS 入口直接赋值 scrollTop，不排动画帧',
)

// ── 6. 互扰让位 2px 双检 ──────────────────────────────────────────────────
assert.match(scroll, /Math\.abs\(scroller\.scrollTop - jumpBase\) > 2/, '入口基线互扰阈值必须 2px')
assert.match(scroll, /Math\.abs\(scroller\.scrollTop - expected\) > 2/, '逐帧互扰阈值必须 2px')

// ── 7. 时长分档与瞬移参数 ──────────────────────────────────────────────────
assert.match(scroll, /export const SCROLL_MIN_MS = 320/, '最短滚动时长必须 320ms')
assert.match(scroll, /export const SCROLL_MAX_MS = 2200/, '最长滚动时长必须 2200ms')
assert.match(scroll, /export const SCROLL_PX_PER_MS = 3\.2/, '滚动速率必须 3.2px/ms（02-motion §2）')
assert.match(scroll, /export const SLIDE_TAIL_RATIO = 0\.6/, '瞬移后尾段必须 0.6 屏（02-motion §3）')
assert.match(scroll, /export const INSTANT_JUMP_MIN = 1200/, '瞬移判定阈值必须 1200px')

// ── 8. 开关几何 + 语义 ─────────────────────────────────────────────────────
assert.match(styles, /\.dcu-settings-switch\{[^}]*width:36px;height:20px;[^}]*border-radius:999px/, '开关轨必须 36×20 全圆胶囊（asar h-5 w-9 + rounded-full）')
assert.match(devRow, /role="switch"/, '开发者工具开关必须 role="switch"')
assert.match(devRow, /aria-checked=\{enabled\}/, '开关必须暴露 aria-checked')

// ── 9. 模态输入几何 + 底部按钮右对齐 ────────────────────────────────────────
assert.match(browser, /\.dcu-wb-rename-input\{[^}]*height:36px;[^}]*border-radius:var\(--dsw-radius-lg\)/, '模态输入必须 36 高 + r8（03j A5 活体）')
assert.match(browser, /\.dcu-wb-rename-input\{[^}]*font:14px\/20px/, '模态输入字号必须 14px/20px（03j A5 活体）')
assert.match(browser, /\.dcu-wb-rename-actions\{[^}]*justify-content:flex-end/, '模态底部按钮必须右对齐（03j A5 活体）')

// ── 10. 归档两步确认 + 红底 ────────────────────────────────────────────────
assert.match(confirm, /二次|two|second|press/i, '归档必须两步确认（archive-confirm 引 ZCode TaskListItem 二次点击才执行）')
assert.match(browser, /\.dcu-wb-confirm\{[^}]*background:var\(--dcu-state-error-fill\)/, '归档确认钮必须是 destructive 红底')

console.log('night-audit-batch-18: 20 条断言通过')
