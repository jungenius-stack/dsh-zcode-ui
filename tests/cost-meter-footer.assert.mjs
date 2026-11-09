// cost-meter 页脚兼容护栏（night15 晨间三轮活体定位后定稿，用户裁决「锁死这个设定」）
//
// ## 背景
//
// 第三方插件 dsh-cost-meter 的侧栏页脚（cm-footer-stack）有两个布局缺陷，皮肤侧以
// CSS 覆盖修复（CodexSidebar.tsx 内，目标第三方类名，未装该插件时选择器空匹配零影响）：
//
// 1. 横向滚动条灰条：倒计时 pill 长态比容器宽 25px，cm-footer-stack 出现可拖动的
//    横向滚动条。修复 = overflow-x:hidden（需 important 级，插件样式表注入顺序在皮肤
//    之后，普通声明被压回 auto——CDP computed 实证）。
// 2. 倒计时裁尾：同缺口使「进入高峰」尾字被视口裁掉。修复 = 字距 -.5px + 去左右内距
//    + 左移 8px 与色条对齐，凑 28px（25px 缺口 + 3px 浮动），字号与单行格式保持原样
//    （换行/缩字号两方案用户均否）。
//
// ## 锁什么
//
// 三条覆盖规则的存在与关键声明。这些值即意图本身（25px 预算的分配方案），故锁字面量；
// 若 dsh-cost-meter 未来版本改了类名或自身修掉该缺陷，本文件应随之删除或重谈。
// 证据：night15 CDP 活体实测（over=-4px、单行 17px、文本完整「进入高峰」），截图存档
// 于会话记录；规则原文见 CodexSidebar.tsx 内 2026-11-07 注释块。
//
// 双向断言口径与 night7-gaps 一致：正确形态存在 + 已知坏形态不存在。
// 本文件为纯 JavaScript（.assert.mjs）：全量门禁含 tsc --noEmit，断言文件不用 TS 语法。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sidebar = readFileSync(resolve(root, 'src/client/CodexSidebar.tsx'), 'utf8')

// ── 1. 页脚横向溢出兜底：灰条治理不得丢失，且必须是重要级（否则被插件注入样式压回）──
assert.match(
  sidebar,
  /\.cm-footer-stack\{overflow-x:hidden!important\}/,
  'cost-meter 页脚横向滚动条兜底（overflow-x:hidden 重要级）被删——灰条会复发（night15 活体实证普通声明被插件压回 auto）',
)

// ── 2. 倒计时全文本三件套：字距 + 去内距 + 左移，缺一即裁尾复发 ──────────────
// 2026-11-09：三件套改为**条件补偿**（挂 [data-dcu-cm-compact]，由 cost-meter-chip.ts
// 按实际溢出打标）——长文本仍拿到全部 28px 余量，短文本不再被过度补偿拉出 8px 错位。
assert.match(
  sidebar,
  /\.dcu-foot \.cm-footer-stack\.simple \.cm-peak-classic-chip\[data-dcu-cm-compact\]\{letter-spacing:-\.5px;padding-left:0;padding-right:0;margin-left:-8px\}/,
  'cost-meter 倒计时全文本三件套（字距 -.5px / 去内距 / 左移 8px）被改或丢了条件门——长态「进入高峰」会再次裁尾，短态会重新错位',
)
assert.match(
  readFileSync(new URL('../src/client/cost-meter-chip.ts', import.meta.url), 'utf8'),
  /const overflowing = chip\.scrollWidth > chip\.clientWidth \+ OVERFLOW_TOLERANCE/,
  'chip 自适应必须按真实溢出（scrollWidth > clientWidth）判定，不允许无条件补偿',
)

// ── 3. 字号必须留在令牌上：防止未来以裸 px 重引（design-system 刻度棘轮同口径）──
assert.match(
  sidebar,
  /\.dcu-foot \.cm-peak-classic-chip\{font-size:var\(--dsw-font-size-sm\)/,
  'cost-meter 倒计时字号必须走 var(--dsw-font-size-sm) 令牌——缩字号方案已被用户否决，不得以裸 px 回归',
)
assert.doesNotMatch(
  sidebar,
  /\.cm-peak-classic-chip\{[^}]*font-size:\d+px/,
  'cost-meter 倒计时出现了裸 px 字号（刻度外）——换行/缩字号均非定稿，走令牌',
)

console.log('✓ cost-meter-footer: 灰条兜底 + 条件化全文本三件套（自适应）+ 令牌字号，四项护栏在位')
