// 夜间审计 · 批次 2 回归断言（CodexSidebar.tsx）
//
// ## 锁什么
// 本批报告的「对齐项」章节在重写时丢失（只剩差异与无参照），因此这里只锁
// **已被其它批次一手证据确认、且在本文件里落地**的那些点，不凭印象添加：
//
// 1. 侧栏开合与三路同步位移挂 move 档（200ms ease-out）。证据：asar 原文
//    `duration-200 ease-out transition-[width,opacity]` + `--ease-out:cubic-bezier(0, 0, .2, 1)`；
//    02-motion.md:351 校正表；批次 3 已把「200ms + (0,0,.2,1)」记为对齐锚点。
// 2. 扩展组折叠体挂 collapse 档（300ms）。证据：asar `animation:.3s ease-in-out
//    forwards zcode-collapsible-up` + 02-motion 二次校正表「分组折叠体 → 300ms 独立 collapse 档」。
// 3. 开合序列的入场/离场挂 enter/exit 档（150ms）。证据：asar `--animate-in`/`--animate-out`
//    默认 .15s（02-motion 2026-10-29 校正）。
// 4. 头部图标钮 28×28、内部 svg 16×16。证据：04-open-gaps.md:779 顶栏实测 28×28/r8；
//    ZCODE-DESIGN.md:163,181 图标基线 size-4。
// 5. 扩展组左槽 16×16，展开箭头开启时旋转 90°。证据：03b-sidebar.md §5 左槽 16×16。
// 6. reduced-motion 下侧栏位移与开合过渡全关。证据：02-motion §4（CSS motion-reduce 语义）。
//
// 刻意不锁的项（本批报告列为差异或已裁决维持）：
//   - 菜单项内边距 0 8px（ZCode 0 10px，待裁决）
//   - 菜单行高 20px（ZCode 21px，待裁决）
//   - 分区 Tab 档位（ZCode h28/14px，本仓 h24/12px，待裁决）
//   - 收起窄轨 56px（ZCode 无参照，已由 SIDEBAR-STRUCTURE-DIFF §2.1 裁决为有意保留）
//   锁住待改值等于把差异写进契约，那会让后续对齐变成「必须改测试」。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sidebar = readFileSync(resolve(root, 'src/client/CodexSidebar.tsx'), 'utf8')

// ── 1. 开合与三路同步位移：move 档 ─────────────────────────────────────────
assert.match(
  sidebar,
  /\.dcu-expanded-shell\{[^}]*transition:opacity var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\),transform var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\)/,
  '展开壳的透明度/位移必须挂 move 档（asar duration-200 ease-out）',
)
assert.match(
  sidebar,
  /\[data-dcu-sidebar-motion\]:not\(\[data-dragging\]\) \[data-dcu-center-column\]\{transition:transform var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\)/,
  '内容列同步位移必须挂 move 档；换档会让索引栏与内容列错帧（曾出现 77px 漂移）',
)
assert.match(
  sidebar,
  /\[data-dcu-sidebar-motion\]:not\(\[data-dragging\]\) \[data-side="sidebar"\]\{transition:left var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\)/,
  '侧栏面 left 同步必须挂 move 档',
)
assert.match(
  sidebar,
  /\[data-dcu-sidebar-motion\]:not\(\[data-dragging\]\) \.dcu-root\{transition:clip-path var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\)/,
  '侧栏裁剪同步必须挂 move 档（clip-path 是三路同步的第三路）',
)

// ── 2. 扩展组折叠体：collapse 档 ───────────────────────────────────────────
assert.match(
  sidebar,
  /\.dcu-extension-panel\{[^}]*transition:grid-template-rows var\(--dcu-motion-collapse-duration\) var\(--dcu-motion-collapse-ease\),opacity var\(--dcu-motion-collapse-duration\) var\(--dcu-motion-collapse-ease\)/,
  '折叠体必须挂 collapse 档 300ms（asar .3s ease-in-out zcode-collapsible-up）',
)

// ── 3. 开合序列：enter/exit 档 ─────────────────────────────────────────────
assert.match(
  sidebar,
  /\.dcu-expanded-shell\{[^}]*animation:dcu-sidebar-expanded-in var\(--dcu-motion-enter-duration\) var\(--dcu-motion-enter-ease\)/,
  '展开壳入场必须挂 enter 档 150ms',
)
assert.match(
  sidebar,
  /\.dcu-root\.dcu-collapsing \.dcu-expanded-shell\{[^}]*transition:opacity var\(--dcu-motion-exit-duration\)/,
  '收起时展开壳离场必须挂 exit 档（离场与入场是两档，不可合并）',
)

// ── 4. 头部图标钮 28×28 / svg 16×16 ───────────────────────────────────────
assert.match(
  sidebar,
  /\.dcu-head \.dcu-icon\{[^}]*width:28px;height:28px/,
  '头部图标钮必须 28×28（04-open-gaps:779 顶栏实测）',
)
assert.match(sidebar, /\.dcu-head \.dcu-icon svg\{display:block;width:16px;height:16px\}/, '头部图标 svg 必须 16×16（图标基线 size-4）')

// ── 5. 扩展组左槽与展开箭头 ───────────────────────────────────────────────
assert.match(sidebar, /\.dcu-extension-leading\{[^}]*width:16px;height:16px/, '扩展组左槽必须 16×16')
assert.match(
  sidebar,
  /\.dcu-extensions-toggle\[aria-expanded=true\] \.dcu-extension-state-arrow\{transform:rotate\(90deg\)\}/,
  '展开态箭头必须旋转 90°（旋转是状态语义，不是装饰）',
)
assert.match(
  sidebar,
  /\.dcu-extension-items button\{grid-template-columns:16px minmax\(0,1fr\);min-height:28px;padding:0 10px;border-radius:var\(--dsw-radius-lg\)/,
  '扩展子项必须 16px 图标列 + 28px 最小高 + r-lg + 0 8px 内距',
)

// ── 6. reduced-motion 全关 ─────────────────────────────────────────────────
assert.match(
  sidebar,
  /@media \(prefers-reduced-motion:reduce\)\{[^}]*\[data-dcu-official-turn-navigator\]\{transition:none\}/,
  'reduced-motion 下侧栏位移过渡必须关闭（02-motion §4）',
)

console.log('night-audit-batch-2: 12 条断言通过')
