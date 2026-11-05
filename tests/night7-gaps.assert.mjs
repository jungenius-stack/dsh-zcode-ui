// night7 缺口补断言（G-①..⑤：任务菜单宽 / 置顶空态 gap / 空态图标尺寸 / 空态排版 / ⌘K 浮层 B14）
//
// ## 锁什么（均为 zcode-theme.ts 内的确定取值，grep 实读取证）
//
// 1. G-① 任务右键菜单宽 224px：`.dcu-ctx-menu.dcu-ctx-menu-task{width:224px}`。
//    证据：zcode-theme.ts:395 实读。
// 2. G-② 置顶空态占位槽内距 gap 6px：`.dcu-wb-pinned-list>.dcu-wb-empty` 规则体内 `gap:6px`
//    （与 display:flex/align-items:center 同体，构成「加号图标 + 文案」的水平排布）。
//    证据：zcode-theme.ts:439 实读。
// 3. G-③ 置顶空态加号图标 14×14：`.dcu-wb-pinned-list>.dcu-wb-empty svg{width:14px;height:14px;flex:none}`。
//    证据：zcode-theme.ts:443 实读。
// 4. G-④ 空态排版 14px/21px：`.dcu-wb-empty` 字号必须走 var(--dsw-font-size-base)（=14px）、
//    行高 21px 字面量；13px/18px 是迁移前旧值（HEAD 版本注释「night2 surface-5 M3 待落：钉死 13px/18px」），
//    不得以任何形式回归。14px 的 token 值已由 night-audit-batch-10.assert.mjs:97 锁定，
//    此处不重复登记；计算值另由 scripts/verify-workspace-drop-layout.mjs:97 钉死
//    （fontSize!=='14px' || lineHeight!=='21px' 即红），本组锁的是源码字面量层。
//    证据：CodexWorkspaceBrowser.tsx:288（基础规则 font-size 走 var）、:317（排版规则
//    font-size var + line-height:21px 成对）、:339（集合内变体与 .dcu-wb-nochat 共用同对）。
// 5. G-⑤ ⌘K 搜索浮层（COVERAGE-MATRIX B14，night4 H4 补锁）：512 宽 / 壳 radius 2xl(=16px) /
//    内 gap 16 / 影两层 var(--dcu-tip-shadow) / 输入胶囊 32px+9999px / 选中底=tag 令牌。
//    证据：design-language/03i-command-palette.md E1–E4（活体）+ 同文件 2026-10-28 阴影更正注
//    （早期「无阴影」量的是内层，根节点实为 shadow-md；插件已由 box-shadow:none 改为
//    var(--dcu-tip-shadow) 并活体复核）——因此本组锁「影=tip-shadow 存在 + 不得回退 none」，
//    不锁已被推翻的「无影」；CodexSidebar.tsx .dcu-search-dialog/.dcu-search-input/
//    .dcu-search-row 规则实读。
//
// ## 为什么双向（期望是 + 期望不是）
// 每组同时断言「正确值存在」和「错误值不存在」：只断存在，将来有人在该选择器上追加
// 一条覆盖规则（如 176px 的旧宽度、8px 的旧 gap、12px 的旧图标）时，存在断言依旧全绿，
// 漂移静默发生；双向断言让覆盖一旦出现即红。
//
// 本文件为纯 JavaScript（.assert.mjs）：全量门禁含 tsc --noEmit，断言文件不用 TS 语法。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const theme = readFileSync(resolve(root, 'src/client/zcode-theme.ts'), 'utf8')
const browser = readFileSync(resolve(root, 'src/client/CodexWorkspaceBrowser.tsx'), 'utf8')
const sidebar = readFileSync(resolve(root, 'src/client/CodexSidebar.tsx'), 'utf8')

// ── G-① 任务菜单宽度：**已整条回退**（2026-11-05，用户裁决 B）
// 历史：night3 加过 width:224px（照 ZCode w-56），night13 我改成 min-width+视口上限，
// 但 9223 实测四个菜单（会话管理/项目右键/任务右键/项目子菜单）**均未越界**，
// 且用户反馈的错乱是「子菜单 y 坐标跳了 174px」的定位问题，与宽度无关。
// 结论：这条宽度覆盖既无收益又反复引入问题，整条删除，回到 e2e69f8 的原始状态
// （.dcu-ctx-menu 只有 min-width:176px）。
// 守卫：不得再出现任何 dcu-ctx-menu-task 的宽度声明。
assert.doesNotMatch(
  theme,
  /\.dcu-ctx-menu\.dcu-ctx-menu-task\{(min-)?width:/,
  'dcu-ctx-menu-task 不得声明宽度——该覆盖已于 2026-11-05 整条回退（实测无越界，且会干扰宿主定位）',
)

// ── G-② 置顶空态 gap 6px（zcode-theme.ts:439）───────────────────────────────
// 期望是：规则体内含 gap:6px。
assert.match(
  theme,
  /\.dcu-wb-pinned-list>\.dcu-wb-empty\{[^}]*gap:6px/,
  '置顶空态占位槽必须 gap:6px（图标与文案的间距被删了）',
)
// 期望不是：同一规则体内不得出现 6px 之外的任何其他 gap 值。
assert.doesNotMatch(
  theme,
  /\.dcu-wb-pinned-list>\.dcu-wb-empty\{[^}]*gap:(?!6px)\d+px/,
  '置顶空态占位槽的 gap 被改成 6px 以外的值（或追加了覆盖），必须唯一为 6px',
)

// ── G-③ 空态图标 14×14（zcode-theme.ts:443）─────────────────────────────────
// 期望是：svg 规则 width/height 均为 14px。
assert.match(
  theme,
  /\.dcu-wb-pinned-list>\.dcu-wb-empty svg\{width:14px;height:14px/,
  '置顶空态加号图标必须 14×14（zcode-theme.ts 的 svg 尺寸规则被删了）',
)
// 期望不是：svg 宽或高不得是 14px 之外的任何其他值。
assert.doesNotMatch(
  theme,
  /\.dcu-wb-pinned-list>\.dcu-wb-empty svg\{width:(?!14px)\d+px/,
  '置顶空态加号图标的 width 被改成 14px 以外的值，必须为 14px',
)
assert.doesNotMatch(
  theme,
  /\.dcu-wb-pinned-list>\.dcu-wb-empty svg\{width:14px;height:(?!14px)\d+px/,
  '置顶空态加号图标的 height 被改成 14px 以外的值，必须为 14px',
)

// ── G-④ 空态排版 14px/21px（CodexWorkspaceBrowser.tsx:288/:317/:339）─────────
// 期望是：字号走 base 档（=14px，token 值已由 night-audit-batch-10:97 锁定），行高 21px。
assert.match(
  browser,
  /\.dcu-wb-empty\{[^}]*font-size:var\(--dsw-font-size-base\)/,
  '空态字号必须走 --dsw-font-size-base（=14px）：直接删掉或改名 token 都算漂移',
)
assert.match(
  browser,
  /\.dcu-wb-empty\{[^}]*font-size:var\(--dsw-font-size-base\);line-height:21px/,
  '空态排版必须 14px/21px 成对（night2 surface-5 N1 活体 21px 实测档）：基础排版规则缺一半即漂移',
)
assert.match(
  browser,
  /\.dcu-wb-collection-body>\.dcu-wb-empty,\.dcu-wb-nochat\{font-size:var\(--dsw-font-size-base\);line-height:21px/,
  '集合内空态与空聊天必须共用 14px/21px（layout 检查要求两者字号行高一致）',
)
// 期望不是：点名旧值 13px/18px 不得以任何形式回归；该选择器不得出现字面量 px 字号
// （防止直写 13px 或漂移值绕过 token），行高字面量只能是 21px。
assert.doesNotMatch(
  browser,
  /\.dcu-wb-empty[^{]*\{[^}]*font-size:13px/,
  '空态字号出现 13px 旧值——不得回退，必须走 base 档（14px）',
)
assert.doesNotMatch(
  browser,
  /\.dcu-wb-empty[^{]*\{[^}]*line-height:18px/,
  '空态行高出现 18px 旧值——不得回退，必须是 21px',
)
assert.doesNotMatch(
  browser,
  /\.dcu-wb-empty[^{]*\{[^}]*font-size:(?!var\(--dsw-font-size-base\))[\d.]+px/,
  '空态选择器上出现字面量 px 字号（绕过 token 直写），字号必须走 --dsw-font-size-base',
)
assert.doesNotMatch(
  browser,
  /\.dcu-wb-empty[^{]*\{[^}]*line-height:(?!21px)\d+px/,
  '空态选择器上的行高字面量不是 21px（覆盖或漂移），必须唯一为 21px',
)

// ── G-⑤ ⌘K 搜索浮层（CodexSidebar.tsx .dcu-search-*，COVERAGE-MATRIX B14）────
// 期望是：03i E1–E4 逐值。
assert.match(
  sidebar,
  /\.dcu-search-dialog\{[^}]*width:min\(512px,100%\)/,
  '⌘K 浮层壳宽必须 min(512px,100%)（03i E1 活体 512）',
)
assert.match(
  sidebar,
  /\.dcu-search-dialog\{[^}]*border-radius:var\(--dsw-radius-2xl\)/,
  '⌘K 浮层壳圆角必须走 2xl 档（=16px，03i E1 radius 16px；令牌值由标度层守护）',
)
assert.match(
  sidebar,
  /\.dcu-search-dialog\{[^}]*gap:16px/,
  '⌘K 浮层壳内 gap 必须 16px（03i E1 gap-4）',
)
assert.match(
  sidebar,
  /\.dcu-search-dialog\{[^}]*box-shadow:var\(--dcu-tip-shadow\)/,
  '⌘K 浮层壳影必须是 tip-shadow 两层小影（03i 2026-10-28 阴影更正：根节点实为 shadow-md，早期「无阴影」量的是内层）',
)
assert.match(
  sidebar,
  /\.dcu-search-input>:first-child\{[^}]*height:32px[^}]*border-radius:9999px/,
  '搜索输入必须 32px 高胶囊（rounded-full，03i E2）',
)
assert.match(
  sidebar,
  /\.dcu-search-row:hover,\.dcu-search-row\[data-active=true\]\{background:var\(--dsw-alias-markdown-tag\)/,
  '命令项选中底必须是 tag 同源令牌（03i E4：选中=抬亮一档灰）',
)
// 期望不是：512/2xl/16/胶囊/tag 任一被改值或覆盖即红；影不得回退 none（更正结论）。
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-dialog\{[^}]*width:(?!min\(512px,100%\))[^;}]*[;}]/,
  '⌘K 浮层壳宽被改成 512 以外的值（覆盖或漂移），必须唯一为 min(512px,100%)',
)
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-dialog\{[^}]*border-radius:(?!var\(--dsw-radius-2xl\))[^;}]*[;}]/,
  '⌘K 浮层壳圆角被改成 2xl 以外的值，必须唯一为 var(--dsw-radius-2xl)',
)
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-dialog\{[^}]*gap:(?!16px)\d+px/,
  '⌘K 浮层壳内 gap 被改成 16px 以外的值，必须唯一为 16px',
)
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-dialog\{[^}]*box-shadow:none/,
  '⌘K 浮层壳不得回退 box-shadow:none（03i 更正已推翻「无影」，那是错锚内层的结论）',
)
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-input>:first-child\{[^}]*border-radius:(?!9999px)[^;}]*[;}]/,
  '搜索输入胶囊圆角被改成 9999px 以外的值，必须唯一为 rounded-full',
)
assert.doesNotMatch(
  sidebar,
  /\.dcu-search-row\[data-active=true\]\{background:(?!var\(--dsw-alias-markdown-tag\))[^;}]*[;}]/,
  '命令项选中底被改成 tag 令牌以外的值，必须唯一为 var(--dsw-alias-markdown-tag)',
)

console.log('night7-gaps: 25 条断言通过')
