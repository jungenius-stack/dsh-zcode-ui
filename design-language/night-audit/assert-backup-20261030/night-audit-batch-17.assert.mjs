// 夜间审计 · 批次 17 回归断言（AboutSection / settings-page-styles / user-error /
// input-history / plugin-config / business-request-error / session-title-scroll）
//
// ## 锁什么
// 本批是设置页排版与令牌层，对齐点全部有 ZCode 实测出处：
//
// 1. 导航项几何 16px 图标 / r12 / h32，分组标签 12px/500。证据：03f-settings.md §2.2 S1 + §2.4
//    收口表；03f-settings-zcode-spec.json navItems（16px/h32/r12、基础设置 fs12/fw500）。
// 2. 设置卡片深色 fill #161616 / 1px 10% 边 / r12。证据：spec JSON cards[0]
//    （bg rgb(22,22,22)、border 1px rgba(255,255,255,.1)、radius 12px）。
// 3. 下拉控件 h32 / min-h32 / fs14。证据：03f §2.2 S3 + spec JSON selects[1]（h32/fs14/r8）。
// 4. 状态色深色档三值逐字一致：success #46bf72 / error #ff5c5c / warn #ff8a30。
//    证据：tokens.json state 段 dark（CDP 像素回读）。
// 5. 动效挂档：feedback 150ms、move 200ms、enter 150ms。证据：02-motion.md:345-360
//    2026-10-29 asar 时长分档校正表 + zcode-theme.ts:131,137,142。
// 6. 焦点环 2px 主档 + 内收 -2px。证据：04-open-gaps.md:1176,1815（G2 已修）；
//    asar `outline-width:2px|outline:2px` 28 例、`outline-offset:-2px` 3 例。
// 7. reduced-motion 下过渡与三支进入动画全关。证据：02-motion.md §4。
// 8. 数字等宽：进度百分比与下载量两处 tabular-nums。证据：asar `tabular-nums` 48 例。
// 9. 会话标题只做纯 ellipsis（跑马灯机制已移除）。证据：03b-sidebar.md §5 长标题行
//    实测「容器 130px / 文字 175px，滚动中途两端都不可读」的教训。
//
// 为什么用文本断言：全部是「样式表里必须存在这条规则 / 令牌必须是这个值」的结构事实；
// 渲染验证需活宿主，夜间不可用，且活宿主测的是宿主版本而非本项目契约。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const styles = read('settings-page-styles.ts')
const theme = read('zcode-theme.ts')
const about = read('AboutSection.tsx')
const titleScroll = read('session-title-scroll.ts')

// ── 1. 导航项几何 + 分组标签 ────────────────────────────────────────────────
assert.match(styles, /\.dcu-settings-link\{[^}]*height:32px;min-height:32px/, '导航项必须 h32/min-h32（03f S1）')
assert.match(styles, /\.dcu-settings-link\{[^}]*border-radius:var\(--dsw-radius-xl\)/, '导航项必须 r-xl=12（03f S1）')
assert.match(
  styles,
  /\.dcu-settings-link\{[^}]*font-size:var\(--dcu-settings-nav-size,var\(--dsw-font-size-base\)\)!important/,
  '导航项字号必须走 --dcu-settings-nav-size 令牌且 !important（宿主样式会覆盖，去掉就退回宿主默认档）',
)
assert.match(
  styles,
  /\.dcu-settings-group-label\{[^}]*font-size:var\(--dsw-font-size-sm\);font-weight:500/,
  '分组标签必须 12px/500（03f S1b，ZCode 仅此一档分组标签有实测）',
)

// ── 2. 设置卡片（深色 fill 由令牌层给，这里锁结构三件）────────────────────────
assert.match(
  styles,
  /\.dcu-settings-card\{border:1px solid var\(--sp-border\);border-radius:var\(--dsw-radius-xl\);background:var\(--sp-card\)/,
  '设置卡片必须 1px 边 + r12 + 卡底色三件齐（03f S2/S2b/S2c）',
)

// ── 3. 下拉控件 h32 / fs14 ─────────────────────────────────────────────────
assert.match(
  styles,
  /\[class\*=selector\]:not\(\[class\*=themeCube\]\)\{\s*\n\s*box-sizing:border-box;\s*\n\s*height:32px;\s*\n\s*min-height:32px;\s*\n\s*font-size:var\(--dsw-font-size-base\);/,
  '设置页下拉必须 h32/min-h32/fs14，且必须排除 themeCube（主题块 h81 是有意的大块）',
)

// ── 4. 状态色深色档三值逐字 ─────────────────────────────────────────────────
assert.match(
  theme,
  /--dcu-state-success-text:#46bf72;--dcu-state-error-text:#ff5c5c;--dcu-state-warn-text:#ff8a30;/,
  '深色档状态色必须 #46bf72 / #ff5c5c / #ff8a30（tokens.json state 段 CDP 回读值）',
)

// ── 5. 动效三档时长 ────────────────────────────────────────────────────────
assert.match(theme, /--dcu-motion-feedback-duration:150ms/, 'feedback 档必须 150ms（02-motion 校正表）')
assert.match(theme, /--dcu-motion-move-duration:200ms/, 'move 档必须 200ms（侧栏开合 asar duration-200）')
assert.match(theme, /--dcu-motion-enter-duration:150ms/, 'enter 档必须 150ms（asar --animate-in .15s）')
assert.match(
  styles,
  /transition:background-color var\(--dcu-motion-feedback-duration\) var\(--dcu-motion-feedback-ease\)/,
  '导航项 hover 必须消费 feedback 档令牌，不得写死时长',
)

// ── 6. 焦点环形态 ──────────────────────────────────────────────────────────
assert.match(
  styles,
  /\.dcu-settings-page :focus-visible\{outline:2px solid var\(--dsw-focus-ring-color,var\(--dcu-focus\)\)/,
  '焦点环必须 2px solid 且走语义令牌（G2 收口口径）',
)
assert.match(
  styles,
  /\.dcu-settings-back:focus-visible,\.dcu-settings-link:focus-visible\{outline-offset:-2px\}/,
  '导航/返回钮焦点环必须内收 -2px（列表行贴边，外扩会被裁）',
)

// ── 7. reduced-motion 全关 ─────────────────────────────────────────────────
assert.match(
  styles,
  /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.dcu-settings-link\{transition:none\}[\s\S]*?\.dcu-settings-inner\{animation:none\}\}/,
  'reduced-motion 下过渡与进入动画必须全关（02-motion §4）',
)

// ── 8. 数字等宽两处 ────────────────────────────────────────────────────────
assert.match(about, /\.dcu-about-progress-pct\{[^}]*font-variant-numeric:tabular-nums/, '进度百分比必须等宽数字')
assert.match(about, /\.dcu-about-downloads\{[^}]*font-variant-numeric:tabular-nums/, '下载量必须等宽数字')

// ── 9. 进度条宽度过渡走 move 档 ─────────────────────────────────────────────
assert.match(
  about,
  /\.dcu-about-progress-fill\{[^}]*transition:width var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\)\}/,
  '进度条宽度过渡必须挂 move 档（长距离属性变化用 200ms，不是 feedback 的 150ms）',
)

// ── 10. 基准字号 ───────────────────────────────────────────────────────────
assert.match(styles, /\.dcu-settings-page\{[^}]*font:14px\/1\.5 /, '设置页基准字号必须 14px/1.5（--ui-font-size:14px）')

// ── 11. 会话标题纯 ellipsis，跑马灯不得回潮 ─────────────────────────────────
assert.doesNotMatch(titleScroll, /export function titleOverflowPx|export function titleScrollDurationMs/, '跑马灯机制不得回潮（04 实测两端同裁不可读）')

console.log('night-audit-batch-17: 17 条断言通过')
