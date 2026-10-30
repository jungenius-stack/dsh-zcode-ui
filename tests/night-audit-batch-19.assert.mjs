// 夜间审计 · 批次 19 回归断言
// 覆盖模块：zcode-icons.tsx（图标语言 + spinner 基元）、composer-visuals.ts（输入区两处静态修正）、
//          WorkspaceShortcutBridge.tsx（错误模态走宿主原语）
//
// ## 锁什么
//
// 1. **全站图标唯一语言 = lucide-react，且本模块只做「别名再导出」**。
//    证据：ZCODE-DESIGN.md:181「全站 Lucide」；ZCode asar 内 `grep -a -o 'lucide-react'` = 5420 处，
//    说明宿主界面本身全部由 lucide 构成。任何第二套图标来源（宿主 @deepseek-ai 图标、自绘 SVG）
//    都会让同一屏出现两种 stroke 几何与视觉重量，是对齐目标里最容易被悄悄破坏的一条。
// 2. **spinner 是共享基元且三个参数不可拆**：`1s linear infinite` + `to{rotate(360deg)}` +
//    reduced-motion 下停帧。证据：ZCode app bundle CSS 原文 `--animate-spin:spin 1s linear infinite`；
//    停帧策略取自 ZCode 对 prefers-reduced-motion 的处理（动作归零但保留「进行中」可读性）。
// 3. **加号按钮静止态无圆形底，仅 hover / focus-visible 出现，且规则不得溢出输入区**。
//    证据：03d-composer-zcode-spec.json buttons[0]（aria「添加上下文」，28×28 / radius 8px /
//    bg transparent，CDP 实测）；04-open-gaps.md:496 `yhfFVG_add(28)` 记录宿主的常驻灰圆。
// 4. **「回到底部」水平居中，且只改对齐方式**。证据：ZCode asar 回到底部按钮
//    `absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm`（label `chat.scrollToBottom`）；
//    03c-conversation-dsh-side.md:128 记录本仓 composer-visuals.ts:35 由 flex-end 改居中。
// 5. **错误模态不自绘样式，复用宿主 Modal/Button**。证据：03j-dialog.md:13 A5 定案
//    「插件无自有表单模态；宿主模态 12px（宿主自有，未覆盖）」。
//
// ## 为什么用文本断言而不是渲染测试
//
// 以上五条都是「源码里必须出现 / 必须不出现某种写法」的事实，读文本即可判定，且改动会立刻可见。
// 渲染层验证需要活宿主 + CDP，夜间不可用；本轮 CDP 实测环节未重跑，浏览器侧数值仍以上面
// 引用的设计文档记录为准 —— 本条局限在此显式标注，不假装已验。
//
// 说明：本文件是纯 JavaScript（.mjs），全仓门禁第 1 步是 `tsc --noEmit`，写成 .ts 会引入
// 类型检查负担；这里只读源码字符串，不需要任何类型。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const icons = read('zcode-icons.tsx')
const theme = read('zcode-theme.ts')
const visuals = read('composer-visuals.ts')
const bridge = read('WorkspaceShortcutBridge.tsx')


// ── 1. 图标唯一来源：lucide-react ───────────────────────────────────────────

// 只允许一个 lucide import 块。两个块意味着有人在文件里绕开统一入口另开一扇门。
assert.equal(
  (icons.match(/from 'lucide-react'/g) ?? []).length,
  1,
  'zcode-icons 必须且只能有一处 `from \'lucide-react\'`（asar 实测 5420 处命中，全站唯一语言）',
)

// 不得从宿主包或任何绝对包取图标（宿主图标为 IconXxxMedium 系列，已退役）。
assert.doesNotMatch(
  icons,
  /from\s+'@[^']*'/,
  '不得从宿主/第三方包取图标：混入宿主图标会让同一屏出现两套图标语言',
)

// 每个导出都必须是「ZIcon* = 某个已 import 的标识符」，即零包装、零渲染逻辑。
// 一旦有人在这里写装饰器/包一层 <span>，图标尺寸约定就从「使用处给」变成「模块内写死」。
const iconExportLines = icons.split('\n').filter(line => line.startsWith('export const '))
assert.ok(iconExportLines.length > 40, `图标导出数量异常（实得 ${iconExportLines.length} 条），可能整块被删`)
for (const line of iconExportLines) {
  assert.match(
    line,
    /^export const ZIcon[A-Za-z0-9]+ = [A-Z][A-Za-z0-9]+$/,
    `图标导出必须是纯别名（ZIcon* = 标识符），实际行：${line}`,
  )
}

// 转圈图标的来源锁定为 lucide 的 LoaderIcon —— ZCode Spinner 组件就是 LoaderIcon + animate-spin。
assert.match(
  icons,
  /export const ZIconLoading = LoaderIcon/,
  'ZIconLoading 必须仍是 lucide LoaderIcon（ZCode Spinner 同款，8 芒路径与 1.17.0 一致）',
)

// 不得引入自绘 SVG / forwardRef 包装：那是第二套图标语言的入口。
assert.doesNotMatch(
  icons,
  /createElement|forwardRef|<svg/,
  '不得在图标模块内自绘 SVG 或包 forwardRef：这会绕开「全站 Lucide」的唯一来源约定',
)


// ── 2. spinner：1s linear infinite 共享基元 ────────────────────────────────

assert.match(
  theme,
  /\.dcu-spin\{animation:dcu-spin 1s linear infinite\}/,
  'spinner 必须是 1s linear infinite（与 asar `--animate-spin:spin 1s linear infinite` 逐字同值）',
)
assert.match(
  theme,
  /@keyframes dcu-spin\{to\{transform:rotate\(360deg\)\}\}/,
  'spinner 关键帧必须只转到 360deg：加 ease / 多段关键帧会让转速与 ZCode 不一致',
)

// 停帧规则必须落在 prefers-reduced-motion 媒体块内，而不是被挪到全局。
// 判据：媒体块起始位置在停帧规则之前，且两者之间没有出现行首的块结束 `}`。
const reducedMotionAt = theme.indexOf('@media (prefers-reduced-motion:reduce)')
const spinStopAt = theme.indexOf(':root:root .dcu-spin{animation:none}')
assert.ok(
  reducedMotionAt >= 0 && spinStopAt > reducedMotionAt,
  'reduced-motion 停帧规则必须存在且位于 @media (prefers-reduced-motion:reduce) 之后',
)
assert.ok(
  !/\n\}/.test(theme.slice(reducedMotionAt, spinStopAt)),
  '停帧规则必须留在 prefers-reduced-motion 媒体块内（中间出现了块结束，说明它被挪到了媒体查询之外）',
)


// ── 3. 加号：静止态裸图标，hover / focus-visible 才出圆底 ───────────────────

// 规则体必须**只有** background:transparent —— 多写一条属性就是在动宿主几何。
const addStatic = visuals.match(/button\[class\*="_add"\]:not\(:hover\):not\(:focus-visible\)\{([^}]*)\}/)
assert.ok(addStatic !== null, '缺少加号静止态规则：宿主会保留常驻灰圆（--dsw-specific-selector）')
assert.equal(
  addStatic[1].replace(/\s+/g, ''),
  'background:transparent;',
  '加号静止态只许把背景清零（ZCode CDP 实测 bg transparent），不得顺手改尺寸/边框/圆角',
)

// hover（非 disabled）与 focus-visible 必须同时出圆底，且用语义令牌而非硬编码色值 ——
// 键盘用户与鼠标用户必须看到同一状态，否则等于丢掉 focus 可见性。
assert.match(
  visuals,
  /button\[class\*="_add"\]:hover:not\(:disabled\),\n\[data-conversation-scroll\] \[data-composer-card\] button\[class\*="_add"\]:focus-visible\{\n {2}background:var\(--dsw-alias-interactive-bg-hover-solid\);\n\}/,
  '加号圆底必须由 hover:not(:disabled) 与 focus-visible 共同触发，且取宿主语义令牌',
)

// 每条加号选择器都必须带 [data-conversation-scroll] [data-composer-card] 前缀。
// 少一个前缀，这条规则就会命中宿主其它带 `_add` 的按钮（列表行、面板工具条）。
const addSelectorCount = (visuals.match(/button\[class\*="_add"\]/g) ?? []).length
const scopedAddCount = (visuals.match(/\[data-composer-card\] button\[class\*="_add"\]/g) ?? []).length
assert.ok(addSelectorCount > 0, '未找到任何加号选择器，模块主体可能已被清空')
assert.equal(
  scopedAddCount,
  addSelectorCount,
  `加号规则有 ${addSelectorCount - scopedAddCount} 条未加输入区作用域前缀，会溢出到宿主其它按钮`,
)


// ── 4. 回到底部：居中，且只改对齐方式 ─────────────────────────────────────

const toBottom = visuals.match(/\[class\*="_toBottomSlot"\]\{([^}]*)\}/)
assert.ok(toBottom !== null, '缺少回到底部对齐规则：宿主 flex-end 会把圆形按钮贴在右缘')
assert.equal(
  toBottom[1].replace(/\s+/g, ''),
  'justify-content:center;padding-right:0;',
  '回到底部必须 justify-content:center + padding-right:0（宿主留了 195px 右内边距，只居中会偏左约 97px），且不得顺手改尺寸/sticky 偏移',
)

// 整个模块不得写几何属性，也不得靠 !important 硬压宿主 —— 否则宿主升级时会打架。
assert.doesNotMatch(
  visuals,
  /\b(width|height|position|z-index|!important)\s*[:,]/,
  'composer-visuals 只许写颜色与对齐；出现尺寸/定位/!important 说明越界改写了宿主布局',
)


// ── 5. 错误模态：复用宿主 Modal / Button，不自绘样式 ──────────────────────

assert.match(
  bridge,
  /import \{ Button, Modal \} from '@deepseek-ai\/dsh-client-ui-primitives'/,
  '错误模态必须复用宿主 Modal/Button 原语（03j-dialog.md:13 A5 定案）',
)

assert.match(
  bridge,
  /<Modal open=\{error !== undefined\}/,
  '错误模态必须由 error 状态受控（open={error !== undefined}），不得另建显示开关',
)

// 全文件不得出现自绘样式通道：className / style= / position / z-index / createElement。
// 宿主 Modal 负责遮罩与层级，插件一旦自带 z-index 就会与宿主弹窗穿插。
assert.doesNotMatch(
  bridge,
  /className=|style=|\bposition:|z-index|createElement/,
  '插件不得自绘模态样式（层/遮罩/定位由宿主 Modal 负责）',
)

// 错误正文用语义化的 role="alert" 表达，而不是靠颜色块。
assert.match(
  bridge,
  /<p role="alert">\{error\}<\/p>/,
  '错误正文必须用 <p role="alert">（03j-dialog A5：语义靠 aria，不靠自绘底色）',
)

// 不得混用小写原生 <button>：footer 里的操作必须全部是宿主 Button。
assert.doesNotMatch(
  bridge,
  /<button[\s>]/,
  '不得在模态里自绘原生 <button>：尺寸/焦点环会与宿主 Button 不一致',
)

console.log('night-audit-batch-19: 23 条断言通过')
