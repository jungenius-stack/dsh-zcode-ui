/**
 * 夜审第 8 批回归断言：zcode-theme.ts 的 ZCode 视觉规范落点（10 条已复核项）。
 *
 * ## 锁什么
 *
 * 逐行锁定 2026-10-30 夜审复核通过的 10 个取值点，全部落在
 * `src/client/zcode-theme.ts` 的 `ZCODE_THEME_STYLE` 模板字符串里：
 *
 *  1. 主色双主题       —— :20 浅色 `--dcu-primary:#000000` / 前景反色；:21 暗色反转。
 *  2. 动效时长五档     —— :131 feedback 150ms、:137 move 200ms、:138 collapse 300ms、
 *                         :142 enter 150ms、:143 exit 150ms。
 *  3. spinner 基元     —— :185 `dcu-spin 1s linear infinite`；:203 keyframes rotate(360deg)。
 *  4. 行 hover/选中底  —— :288 浅色 hover=selected=rgba(13,13,13,.05)；
 *                         :339 暗 hover rgba(255,255,255,.05) / selected .1。
 *  5. 侧栏边线         —— :310 浅 rgba(13,13,13,.1)；:353 暗 rgba(255,255,255,.1)。
 *  6. surface 叠加     —— :311 浅 rgba(13,13,13,.03)；:354 暗 rgba(255,255,255,.05)。
 *  7. 状态填充档六值   —— ZCode 六值（destructive #e03131/#ff5c5c、success #1e8a3e/#46bf72、
 *                         warning #e07b00/#ff8a30）在本仓的**实际落点**：浅色填充档只有
 *                         error 一对（:52），success/warn 浅值仅存于 :25 注释；暗色三值在
 *                         :77 文字档令牌、error 填充在 :78。不得按「:52 含全部三浅值」断言。
 *  8. 浮层底色         —— :58 `--dcu-tip-bg:#f0f0f0`；:81 暗色 `#2b2b2b`。
 *  9. 设置页导航项     —— :302 size 16px；:303 radius 12px。
 * 10. 文档隐藏全停     —— :217 `html[data-document-hidden] *` 通配停 transition+animation；
 *                         :204 注释保留移植出处（ZCode styles.css:84-92）。
 *
 * ## 这些取值为什么来自 ZCode（证据来源）
 *
 * 全部取值经 ZCode 3.16.3 安装包（asar）内的编译产物实测比对：
 * `.theme-zai-light` / `.theme-zai-dark` 覆盖层的 `--color-*` 变量逐值 grep 命中
 * （如 `--color-primary:#000`/`#fff`、`--color-hover:#0d0d0d0d`、`--animate-spin: spin 1s
 * linear infinite`、`--animate-in/out` 的 `.15s`），并以 CDP 活体 resolved 值双验
 * （暗色 primary resolved=#fff、hover 0x0d≈5.1%、selected 0x1a≈10.2%）。
 * 动效两档另见 02-motion.md:345「ZCode asar 二次校正」记录；设置页几何见 03f-settings.md
 * S1 行与 §2.4 实测记录；surface 定案见 03b-sidebar.md:138。源文件头部注释
 * （zcode-theme.ts:1-9）也写明了色值提取自 zai-org/ZCode 的 styles.css。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 本模块是纯 CSS 变量声明（一个模板字符串），不渲染 UI、无逻辑分支；它承诺的是
 * 「声明了哪些值」。渲染级对比度/观感验证已在复审时于活宿主里人工做过并记录在案，
 * 断言层能且只需锁「文本未被漂移」：任何人改动这些字面量（或移动/删除所在行），
 * 即视为脱离已复核状态、必须重新走夜审。真实体感仍以活宿主为准，本文件不替代它。
 *
 * ## 为什么是 .mjs 纯 JavaScript
 *
 * 全量门禁第一步是 `tsc --noEmit` 全仓类型检查；.assert.ts 版本曾因类型问题被整批撤回
 * （tsx 能跑不等于 tsc 能过）。本文件只用 node:assert/strict 与 node:fs，无类型语法、
 * 无仓库导入，`node --check` 与断言运行器（node --import tsx）均可直接执行。
 *
 * 行定位说明：断言按「行号 + 去缩进后整行/锚定前缀」匹配——与复核记录的「:N 行字面量
 * 匹配」一一对应；同行的未复核令牌（--dcu-focus、--dcu-tip-border/shadow/hover、
 * --dcu-state-error-fill-hover 等）不在本批复核范围内，故用锚定 match 只锁已复核前缀，
 * 不冻结它们的取值。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/client/zcode-theme.ts'), 'utf8')
const lines = source.split('\n')
/** 取第 n 行（1 起）；越界时返回占位文本，让断言以清晰的 diff 失败而非 TypeError。 */
const line = (n) => lines[n - 1] ?? `<zcode-theme.ts 不足 ${n} 行>`

// ── 1. 主色双主题：浅黑白、暗反色（asar --color-primary/--color-primary-foreground 逐字）──
assert.equal(
  line(20).trim(),
  ':root{--dcu-primary:#000000;--dcu-primary-foreground:#ffffff}',
  '主色浅色档漂移：ZCode zai-light 实测 primary=#000 / foreground=#fff',
)
assert.equal(
  line(21).trim(),
  'body[data-ds-dark-theme],.theme-zai-dark{--dcu-primary:#ffffff;--dcu-primary-foreground:#000000}',
  '主色暗色档必须反转（asar 暗色 #fff/#000，活体 resolved=#fff）；选择器须同时认宿主属性与 ZCode class',
)

// ── 2. 动效时长五档（02-motion.md:345 二次校正记录 + asar --animate-in/out .15s）──────────
assert.match(
  line(131).trim(),
  /^--dcu-motion-feedback-duration:150ms;/,
  '反馈档时长必须 150ms（ZCode CDP 实测：颜色/背景类 0.15s）',
)
assert.match(
  line(137).trim(),
  /^--dcu-motion-move-duration:200ms;/,
  '移动档时长必须 200ms（ZCode 侧栏开合 duration-200，旧 300ms 收起拖沓）',
)
assert.match(
  line(138).trim(),
  /^--dcu-motion-collapse-duration:300ms;/,
  '折叠体时长必须 300ms（ZCode animation .3s ease-in-out，与侧栏开合本是两个值）',
)
assert.match(
  line(142).trim(),
  /^--dcu-motion-enter-duration:150ms;/,
  '进入档时长必须 150ms（asar --animate-in 默认 .15s，旧值 160 是估的）',
)
assert.match(
  line(143).trim(),
  /^--dcu-motion-exit-duration:150ms;/,
  '退出档时长必须 150ms（asar --animate-out 默认 .15s，与 enter 同档）',
)

// ── 3. spinner 基元：1s/linear/无限是 ZCode 锁定的状态动画常量，参数不得改 ────────────────
assert.equal(
  line(185).trim(),
  '.dcu-spin{animation:dcu-spin 1s linear infinite}',
  'spinner 参数漂移：ZCode 主题原文 --animate-spin: spin 1s linear infinite，不得令牌化或改参',
)
assert.equal(
  line(203).trim(),
  '@keyframes dcu-spin{to{transform:rotate(360deg)}}',
  'spinner keyframes 漂移：ZCode @keyframes spin{to{transform:rotate(360deg)}} 的等价复刻',
)

// ── 4. 行 hover/选中底四值（asar #f0f0f0 同块 --color-hover/-selected:#0d0d0d0d；暗 #ffffff0d/#ffffff1a）──
assert.equal(
  line(288).trim(),
  '--dcu-sidebar-hover:rgba(13,13,13,.05);--dcu-sidebar-selected:rgba(13,13,13,.05);',
  '浅色行 hover/选中底漂移：ZCode 浅色两值相同（0x0d alpha ≈ 5.1%）',
)
assert.equal(
  line(339).trim(),
  '--dcu-sidebar-hover:rgba(255,255,255,.05);--dcu-sidebar-selected:rgba(255,255,255,.1);',
  '暗色行 hover/选中底漂移：ZCode 暗色 hover 5%、selected 10%（0x1a ≈ 10.2%）',
)

// ── 5. 侧栏边线（asar --color-border:#0d0d0d1a / 暗 #ffffff1a）───────────────────────────
assert.match(
  line(310).trim(),
  /^--dcu-sidebar-border:rgba\(13,13,13,\.1\);/,
  '浅色侧栏边线漂移：ZCode --color-border:#0d0d0d1a（黑 10% alpha）',
)
assert.match(
  line(353).trim(),
  /^--dcu-sidebar-border:rgba\(255,255,255,\.1\);/,
  '暗色侧栏边线漂移：ZCode 暗色 #ffffff1a（白 10% alpha，活体 resolved 同值）',
)

// ── 6. surface 叠加（03b-sidebar.md:138 定案 #0d0d0d08；暗 #ffffff0d）─────────────────────
assert.equal(
  line(311).trim(),
  '--dcu-surface:rgba(13,13,13,.03);',
  '浅色 surface 漂移：ZCode --color-surface:#0d0d0d08（黑 3% alpha）',
)
assert.equal(
  line(354).trim(),
  '--dcu-surface:rgba(255,255,255,.05);',
  '暗色 surface 漂移：ZCode 暗色 #ffffff0d（白 5% alpha，活体 resolved 同值）',
)

// ── 7. 状态填充档六值：按实际落点断言，不得假设三浅值同在一行 ──────────────────────────────
// 填充令牌只有 error 一对（:52/:78）；success/warn 的浅色值只作为 Zai 原值记录在 :25 注释里
// （本仓亮色文字档另按 AA 重取，见 :44 注释），暗色三值落在 :77 文字档令牌。
assert.match(
  line(52).trim(),
  /^--dcu-state-error-fill:#e03131;/,
  '浅色错误填充漂移：ZCode destructive 浅色 #e03131（填充档沿用 Zai 原值）',
)
assert.match(
  line(25).trim(),
  /^#e03131 \/ #1e8a3e \/ #e07b00/,
  'Zai 三浅值记录行漂移：#1e8a3e/#e07b00 是 success/warning 的 ZCode 原值，本仓仅作注释记录',
)
assert.equal(
  line(77).trim(),
  '--dcu-state-success-text:#46bf72;--dcu-state-error-text:#ff5c5c;--dcu-state-warn-text:#ff8a30;',
  '暗色状态三值漂移：ZCode success #46bf72 / destructive #ff5c5c / warning #ff8a30（暗色活体同值）',
)
assert.match(
  line(78).trim(),
  /^--dcu-state-error-fill:#ff5c5c;/,
  '暗色错误填充漂移：ZCode destructive 暗色 #ff5c5c',
)
assert.ok(
  !/--dcu-state-(success|warn)-fill/.test(source),
  '填充令牌必须仅 error 一对（已复核状态如此）；新增 success/warn-fill 需先过夜审，不得静默加入',
)

// ── 8. 浮层底色（asar zai-light --color-tooltip:#f0f0f0 / zai-dark #2b2b2b）───────────────
assert.match(
  line(58).trim(),
  /^--dcu-tip-bg:#f0f0f0;/,
  '浅色浮层底漂移：ZCode zai-light --color-tooltip:#f0f0f0',
)
assert.match(
  line(81).trim(),
  /^--dcu-tip-bg:#2b2b2b;/,
  '暗色浮层底漂移：ZCode zai-dark --color-tooltip:#2b2b2b（暗色活体 resolved 同值）',
)

// ── 9. 设置页导航项（03f-settings.md S1：ZCode 16px/r12 vs 旧 14px/r8）────────────────────
assert.equal(
  line(302).trim(),
  '--dcu-settings-nav-size:16px;',
  '设置页导航项字号漂移：ZCode 实测 16px/400（DSH 原 14px）',
)
assert.equal(
  line(303).trim(),
  '--dcu-settings-nav-radius:12px;',
  '设置页导航项圆角漂移：ZCode 实测 r12（DSH 原 r8）',
)

// ── 10. 文档隐藏全停（移植自 ZCode styles.css:84-92，asar 内 data-document-hidden 命中 2 处）──
assert.equal(
  line(217).trim(),
  'html[data-document-hidden] *,html[data-document-hidden] *::before,html[data-document-hidden] *::after{transition:none!important;animation:none!important}',
  '文档隐藏全停规则漂移：星号通配是内存泄漏修复的唯一正当场景，选择器与 !important 不得收窄',
)
assert.match(
  line(204).trim(),
  /移植自 ZCode styles\.css:84-92 的 html\[data-document-hidden\]/,
  '移植出处注释丢失：该规则的上游原文与根因说明依赖这条注释可追溯',
)

console.log(`night-audit-batch-8: 26 条断言全部通过（zcode-theme.ts 十项 ZCode 视觉规范落点）`)
