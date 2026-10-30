// 夜间审计 · 批次 13 回归断言（CodexSettingsPage / host-anchor-contract /
// settings-navigation / sidebar-search / global-panels / settings-page-model /
// workspace-archive）
//
// ## 锁什么
// 本批是设置页的语义与结构层，四个对齐点都有 ZCode 一手对照：
//
// 1. 当前项 aria 模式 `active ? 'page' : undefined`。证据：asar 本轮提取
//    `aria-current": active ? "page" : void 0`（命中 2 处）——与 ZCode 三元写法逐字同构；
//    02-motion.md 第 28 轮实测「连点 10 次 aria-current 唯一」。
// 2. 退出动画的 reduced-motion 分支：命中即直接 finish()，不排 JS 动画。证据：02-motion §2
//    「reduced-motion 时点击必须瞬跳…这是 ZCode 明确语义（源码 c?'auto':'smooth'）」+ §4；
//    asar `grep -a -c 'prefers-reduced-motion'` = 58。
// 3. 导航分组标签 = 12px/500 的独立小标签行。证据：03f-settings.md S1b（ZCode 导航分组标签
//    12px/500）+ 03f-settings-zcode-spec.json navItems[0]「基础设置」fs12/fw500/h22；
//    消费侧 settings-page-styles.ts `.dcu-settings-group-label` 同值。
// 4. 通用设置「分组标题 + 单卡包多条目」两级结构，条目不裸排。证据：03f §2.2 S2/S2b/S2c
//    （ZCode 卡片 bg rgb(22,22,22) / r12 / 边 1px 10% 白，双主题复核 ✅）+ spec JSON cards[0]。
//
// 边界说明：ZCode 侧只采到「分组标签」这一条形态，**分组数量与归属没有实测**，
// 因此这里不锁分组枚举，只锁「每组一枚标签 + 单卡包条目」的结构。
//
// 为什么用文本断言：以上是属性写法与 DOM 结构的结构事实；渲染验证需活宿主，夜间不可用。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const page = read('CodexSettingsPage.tsx')
const panels = read('global-panels.tsx')
const styles = read('settings-page-styles.ts')

// ── 1. aria-current 三元写法（两处）────────────────────────────────────────
assert.match(
  page,
  /aria-current=\{row\.id === active\?\.id \? 'page' : undefined\}/,
  '设置导航当前项必须 aria-current={active ? "page" : undefined}（asar 逐字同构；写成 \'true\' 会让辅助技术读成布尔而非页码）',
)
assert.match(
  panels,
  /aria-current=\{activeId === panel\.id \? 'page' : undefined\}/,
  '面板当前项必须同款三元写法；两处必须一致，否则读屏在两种导航间切换语义',
)

// ── 2. reduced-motion 走 finish() 分支 ─────────────────────────────────────
assert.match(
  page,
  /if \(element\?\.animate === undefined \|\| window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)\.matches\) \{ finish\(\); return \}/,
  'reduced-motion（或宿主无 animate API）必须直接 finish() 瞬跳，不得排 JS 动画（02-motion §2/§4）',
)

// ── 3. 分组标签 h2 + 12px/500 ─────────────────────────────────────────────
assert.match(page, /<h2 className="dcu-settings-group-label">/, '导航分组标签必须是 h2.dcu-settings-group-label（语义层级 + 样式挂钩）')
assert.match(
  styles,
  /\.dcu-settings-group-label\{[^}]*font-size:var\(--dsw-font-size-sm\);font-weight:500/,
  '分组标签必须 12px/500（03f S1b 唯一有实测的分组标签档）',
)

// ── 4. 通用设置两级结构：h2 + 单个卡片包多条目 ──────────────────────────────
assert.match(
  page,
  /<section className="dcu-settings-general-group" key=\{group\}><h2>\{t\(groupLabels\[group\]\)\}<\/h2><div className="dcu-settings-card">/,
  '通用设置必须「h2 分组标题 + 单个 dcu-settings-card 包全部条目」；条目不裸排（03f S2 结构）',
)
assert.match(
  page,
  /<div className="dcu-settings-row" data-dcu-settings-item=\{row\.id\}/,
  '卡片内条目必须带 data-dcu-settings-item 锚（槽位渲染与后续断言都依赖它）',
)
assert.match(
  styles,
  /\.dcu-settings-card\{border:1px solid var\(--sp-border\);border-radius:var\(--dsw-radius-xl\);background:var\(--sp-card\)/,
  '卡片三件（1px 边 / r12 / 卡底色）缺一即与 ZCode 卡片形态分叉',
)

// ── 5. 导航项图标 16px / 描边 1.6 ─────────────────────────────────────────
assert.match(
  page,
  /<Icon size=\{16\} strokeWidth=\{1\.5\} aria-hidden="true"\/>/,
  '导航项必须 16px / strokeWidth 1.5（ZCode 侧栏图标统一 1.5 描边）且 aria-hidden（图标是装饰，名称由文本承担）',
)

console.log('night-audit-batch-13: 8 条断言通过')
