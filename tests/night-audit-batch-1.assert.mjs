/**
 * 夜审第一批回归断言（night-audit batch 1）—— CodexWorkspaceBrowser.tsx 侧栏 10 条已复核对齐项。
 *
 * ## 锁什么
 * 全部是「已经正确」的行为（复核 verdict=verified），锁的是防回归，不是提期望：
 *  1. 行 hover 背景过渡走 feedback 档令牌（150ms + cubic-bezier(.4,0,.2,1)）
 *  2. 行 hover / 菜单打开 / 选中底色 = --dcu-sidebar-selected（浅深两套取值同锁）
 *  3. 会话标题排版 = --dsw-font-size-base + 21px 行高 + 500 字重
 *  4. 项目标题色走语义令牌 --dcu-sidebar-secondary（浅/深均为 color-mix alpha 形态）
 *  5. 时间戳 = --dsw-font-size-sm + tabular-nums
 *  6. 折叠体离场 = DISCLOSURE_EXIT_MS = 300ms（独立 collapse 档）
 *  7. reduced-motion 全链路停动（JS 动画守卫 / caret+分区入场 / 悬停卡 / 主题层六档归零 + spin 停帧）
 *  8. 运行中 spinner 挂 .dcu-spin 共享基元 = 1s linear infinite + 360° 关键帧
 *  9. 重命名输入框 = height 36px + 圆角走 --dsw-radius-lg 令牌
 * 10. 悬停卡底/边/影走 tip 令牌（--dcu-tip-bg / 1px --dcu-sidebar-border / --dcu-tip-shadow）
 *
 * ## 取值为什么来自 ZCode（证据来源）
 * 每条取值来自夜审复核记录（verdict=verified，含 ZCode asar 逐字提取），本文件写作时
 * 已逐行重读本仓源码确认与记录一致：
 *  - 动效：zcode-theme.ts:131 feedback=150ms/cubic-bezier(.4,0,.2,1)（记录引 02-motion.md:355
 *    asar 二次校正表「微交互 duration-150 ease-out + 实测 (.4,0,.2,1)」；§1 旧表 :9 的
 *    (0,0,0.2,1) 是被二次校正推翻的旧值，不得回退）；
 *  - 底色：zcode-theme.ts:288 浅 rgba(13,13,13,.05) / :339 深 rgba(255,255,255,.1)
 *    （记录引 03b-sidebar.md:116 深色 #ffffff1a、:136-137 浅色定案 #0d0d0d0d，同值）；
 *  - 排版：typographyStyles 段 21px/500（记录引 03b-sidebar.md:113 实测 14px/21px，
 *    G13 字重已修、base=14px 已在 settings-integration.assert.ts:249 登记）；
 *  - G14 alpha 形态：zcode-theme.ts:277/:333 color-mix(in oklab,…)（记录引 03b-sidebar.md:37/:66
 *    判定表「写死灰 → alpha 叠加」）；
 *  - 折叠 300ms：DISCLOSURE_EXIT_MS=300（记录引 02-motion.md:352「asar animation:.3s ease-in-out
 *    → 300ms 独立 collapse 档」，zcode-theme.ts:138 collapse 档同值）；
 *  - spinner：zcode-theme.ts:176-185 注释即 ZCode 3.15.1 原文 --animate-spin: spin 1s linear
 *    infinite；session-tree.tsx:174 挂类、主题层持定义，拆开任何一半都会静默丢动画；
 *  - 输入框 36px：记录引 03j-dialog.md:19 复测「输入/下拉 36 高 radius 8」；
 *  - tip 三件套：记录引 03j-dialog.md A3/A4/A6（底 #2b2b2b、边 1px 10%、双层影）。
 *    边走 --dcu-sidebar-border 而非 --dcu-tip-border 是已核实的等值别名
 *    （zcode-theme.ts:310 vs :58、:353 vs :81），渲染无差，按现状锁。
 *
 * ## 为什么用文本断言而不是渲染测试
 * 这些对齐项的「正确」定义在本仓源码常量与令牌引用上（ZCode 实测值的复刻）；渲染结果还取决于
 * 宿主下发的 --dsw-* 令牌，随 DSH 版本变化。锁源码文本才能把「本仓改动导致的回归」（这条必须红）
 * 与「宿主令牌版本差异」（不该由本仓断言背锅）分开。本模块样式是模板字符串常量，文本断言
 * 等价于锁最终注入的 CSS。
 *
 * ## 已知边界（明确不锁的内容）
 * --dsw-font-size-base / --dsw-font-size-sm / --dsw-radius-lg 的运行时解析值来自宿主 asar。
 * 当前安装的 DSH 0.2.1-rc.2 中 --dsw-radius-lg 唯一定义为 16px，与登记的 8px 冲突
 * （宿主令牌版本差异，未做运行时验证）。因此第 3/5 条只锁令牌引用 + 21px/500 等本仓自有取值，
 * 第 9 条只锁 height:36px + 圆角走令牌，均不锁 14px/12px/8px 的宿主解析结果。
 *
 * 本文件是纯 JavaScript（.mjs）：全量门禁第 1 步是 tsc --noEmit 全仓类型检查，
 * 此前 .assert.ts 版本因类型检查被撤回（tsx 能跑不等于 tsc 能过），.mjs 不进 tsc。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/client/CodexWorkspaceBrowser.tsx'), 'utf8')
const theme = readFileSync(resolve(root, 'src/client/zcode-theme.ts'), 'utf8')
const sessionTree = readFileSync(resolve(root, 'src/client/session-tree.tsx'), 'utf8')

// ── 1. 行 hover 背景过渡 = feedback 档 ──────────────────────────────────────
assert.match(
  source,
  /transition:background-color var\(--dcu-motion-feedback-duration\) var\(--dcu-motion-feedback-ease\)/,
  '行 hover 背景过渡必须走 feedback 档令牌；改回写死时长/曲线会偏离 ZCode 实测（150ms + (.4,0,.2,1)）',
)
assert.match(
  theme,
  /--dcu-motion-feedback-duration:150ms;--dcu-motion-feedback-ease:cubic-bezier\(\.4,0,\.2,1\)/,
  'feedback 档取值必须保持 ZCode CDP 实测 150ms / cubic-bezier(.4,0,.2,1)（02-motion.md:355 二次校正，§1 旧曲线 (0,0,0.2,1) 已被推翻）',
)

// ── 2. 行 hover / 菜单打开 / 选中底色 = --dcu-sidebar-selected ───────────────
assert.match(
  source,
  /\.dcu-wb-project-head:hover,\.dcu-wb-project-head\.dcu-wb-menu-open,\.dcu-wb-session:hover,\.dcu-wb-session\.dcu-wb-menu-open\{background:var\(--dcu-sidebar-selected\)\}/,
  '行 hover / 菜单打开的底色必须走 --dcu-sidebar-selected，不得写死灰（03b-sidebar.md:136-137 定案）',
)
assert.match(
  source,
  /\.dcu-wb-session\.dcu-wb-selected\{background:var\(--dcu-sidebar-selected\)\}/,
  '选中行底色必须与 hover 同源（--dcu-sidebar-selected），两态异色即偏离 ZCode',
)
assert.match(
  theme,
  /--dcu-sidebar-hover:rgba\(13,13,13,\.05\);--dcu-sidebar-selected:rgba\(13,13,13,\.05\)/,
  '浅色 sidebar-selected 必须保持 rgba(13,13,13,.05)（#0d0d0d0d，03b-sidebar.md:136-137）',
)
assert.match(
  theme,
  /--dcu-sidebar-selected:rgba\(255,255,255,\.1\)/,
  '深色 sidebar-selected 必须保持白 10%（#ffffff1a，03b-sidebar.md:116）',
)

// ── 3. 会话标题排版：base 刻度（14px）+ 21px 行高 + 500 字重 ──────────────────
assert.match(
  source,
  /\.dcu-wb-session-title\{font-size:var\(--dsw-font-size-base\);line-height:21px;font-weight:500;color:var\(--dcu-sidebar-primary\)\}/,
  '会话标题排版必须锁 21px 行高 + 500 字重（typographyStyles 覆盖段；G13 字重已修，03b-sidebar.md:113 实测 14px/21px）',
)

// ── 4. 项目标题色走语义令牌，且令牌本体是 alpha 形态 ──────────────────────────
assert.match(
  source,
  /\.dcu-wb-project-title\{font-size:var\(--dsw-font-size-base\);line-height:21px;font-weight:400;color:var\(--dcu-sidebar-secondary\)\}/,
  '项目标题色必须走语义令牌 --dcu-sidebar-secondary，写死灰即回退 G14 判定表（03b-sidebar.md:37/:66）',
)
assert.match(
  theme,
  /--dcu-sidebar-secondary:color-mix\(in oklab,#404040 85%,transparent\)/,
  '浅色 secondary 必须保持 alpha 叠加形态（color-mix 85%，G14 终版）',
)
assert.match(
  theme,
  /--dcu-sidebar-secondary:color-mix\(in oklab,#d4d4d4 68%,transparent\)/,
  '深色 secondary 必须保持 alpha 叠加形态（color-mix 68%，G14 终版）',
)

// ── 5. 时间戳：--dsw-font-size-sm（ZCode 实测 12px）+ tabular-nums ───────────
assert.match(
  source,
  /\.dcu-wb-session-time\{[^}]*font-size:var\(--dsw-font-size-sm\);line-height:18px;font-weight:400;font-variant-numeric:tabular-nums/,
  '时间戳必须用 --dsw-font-size-sm（03b-sidebar.md:115 实测 12px）+ tabular-nums：列表数字不等宽会随秒数抖动',
)

// ── 6. 折叠体离场 300ms（独立 collapse 档）───────────────────────────────────
assert.match(
  source,
  /const DISCLOSURE_EXIT_MS = 300/,
  '折叠体离场必须是 300ms（ZCode asar 逐字提取 animation:.3s ease-in-out，02-motion.md:352 独立 collapse 档）',
)
assert.match(
  source,
  /duration: DISCLOSURE_EXIT_MS/,
  '折叠动画 duration 必须消费 DISCLOSURE_EXIT_MS 常量；另写字面量会造成双源漂移',
)
assert.match(
  theme,
  /--dcu-motion-collapse-duration:300ms/,
  '主题层 collapse 档必须与 DISCLOSURE_EXIT_MS 同为 300ms（两处表达同一 ZCode 实测值）',
)

// ── 7. reduced-motion 全链路停动（四层缺一不可）──────────────────────────────
assert.match(
  source,
  /wasOpen === open \|\| window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return undefined/,
  'JS 折叠动画必须先过 reduced-motion 守卫：JS 层动效不受 @media 管，缺这层 = 无障碍回归',
)
assert.match(
  source,
  /@media \(prefers-reduced-motion:reduce\)\{\.dcu-wb-section-caret\{transition:none\}\.dcu-wb-section-body\[data-open=true\]>div\{animation:none\}\}/,
  'caret 过渡与分区入场动画必须在 CSS 层对 reduced-motion 全停',
)
assert.match(
  source,
  /@media \(prefers-reduced-motion:reduce\)\{\.dcu-wb-tip\{animation:none\}\}/,
  '悬停卡入场动画必须对 reduced-motion 全停',
)
assert.match(
  theme,
  /:root\{--dcu-motion-feedback-duration:0ms;--dcu-motion-move-duration:0ms;--dcu-motion-collapse-duration:0ms;--dcu-motion-enter-duration:0ms;--dcu-motion-exit-duration:0ms;--dcu-motion-press-duration:0ms\}/,
  '主题层六档动效时长必须在 reduced-motion 下全归零（含 collapse；归零是令牌化后所有消费方的统一停动通道）',
)
assert.match(
  theme,
  /:root:root \.dcu-spin\{animation:none\}/,
  'reduced-motion 下 .dcu-spin 必须停静止帧：时长归零管不到 infinite 动画',
)

// ── 8. 运行中 spinner = .dcu-spin 共享基元，1s linear infinite ───────────────
assert.match(
  sessionTree,
  /<ZIconLoading size=\{14\} className="dcu-spin"/,
  '运行中图标必须挂 .dcu-spin 共享基元（ZCode TaskListItem 的 LoaderIcon + animate-spin 写法，size 3.5=14px）',
)
assert.match(
  theme,
  /\.dcu-spin\{animation:dcu-spin 1s linear infinite\}/,
  'spinner 动画必须保持 ZCode --animate-spin 原文 1s linear infinite：它是锁定的状态动画常量，不得令牌化改值',
)
assert.match(
  theme,
  /@keyframes dcu-spin\{to\{transform:rotate\(360deg\)\}\}/,
  'dcu-spin 关键帧必须转满 360°（ZCode @keyframes spin 原文）',
)

// ── 9. 重命名输入框几何：36px 高 + 圆角走 --dsw-radius-lg 令牌 ────────────────
// 边界：--dsw-radius-lg 的宿主解析值随 DSH 版本变化（当前 0.2.1-rc.2 asar 实测 16px，
// 与登记的 8px 冲突，见文件头「已知边界」），故只锁 height 与令牌引用，不锁解析结果。
assert.match(
  source,
  /\.dcu-wb-rename-input\{[^}]*height:36px;[^}]*border-radius:var\(--dsw-radius-lg\)/,
  '弹窗内输入框高度必须 36px、圆角必须走 --dsw-radius-lg 令牌（03j-dialog.md:19 复测「输入/下拉 36 高」）',
)

// ── 10. 悬停卡底/边/影走 tip 令牌 ────────────────────────────────────────────
assert.match(
  source,
  /\.dcu-wb-tip\{[^}]*border:1px solid var\(--dcu-sidebar-border\)[^}]*background:var\(--dcu-tip-bg\)[^}]*box-shadow:var\(--dcu-tip-shadow\)/,
  '悬停卡必须走 tip 令牌三件套：边 1px（--dcu-sidebar-border 与 --dcu-tip-border 等值别名）、底 --dcu-tip-bg、影 --dcu-tip-shadow（03j-dialog A3/A4/A6）',
)

console.log('night-audit batch 1：10 项对齐（24 条断言）全部通过')
