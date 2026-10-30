/**
 * 夜审第九批回归断言：conversation-layout.ts × 7 项 + composer-width.ts × 1 项。
 * （第三轮重写：前两轮文件因门禁机器高负载崩溃被保险丝撤回，非内容问题；要求不变。）
 *
 * ## 锁什么
 * 锁夜审已逐行复核通过（verdict=verified）的 8 个对齐点，每条断言锚定源码中的一个确定取值：
 *   1. 内容列两档宽 848/1104 + 容器查询切宽阈值 1188 + 输入卡 calc(列宽+16) 跟随；
 *   2. 轮组间距 20px（宿主变量 --dsh-chat-flow-gap）/ 正文行高 24.5px / 等宽字号
 *      var(--dsw-font-size-sm,12px) + 21px（1.75 比例，与正文同）；
 *   3. 正文操作行全套：gap 4 / mt 4 / 默认 opacity 0、hover+focus-within → 1、
 *      过渡只动 opacity 走 feedback 档；按钮 min-width 24×24 / r-md / 0 4px / 透明底 /
 *      全前景（:146 是本文件唯一的颜色类 !important）；图标 14×14 / stroke 1.5；
 *   4. G17 用户气泡：右对齐 / max-w 576 / border 1px border-l2 / radius xl·xs·xl·xl
 *      （右上 2px = rounded-tr-xs 尾巴角）/ padding 12px 16px / 行高 calc(21px + delta)；
 *   5. T1 排版节奏：字距 0.025em（p 钉 0.35px，pre/code/kbd 归零）/ h1 18·31.5·600、
 *      h2 16·28·600、h3-h6 与正文同字号靠字重分层（600/500/400）、标题一律 24px 0 16px /
 *      列表 my12·pl20·li pl4·项距 6·marker 30% / 嵌套 6 / li>p 归零且行内；
 *   6. 尾行系：hr 抹线保距（24px 0）/ 时间戳 sm=12px + 30% / 工具行 30% + 500 + 内层继承；
 *   7. X1 会话区禁横向滚动（[data-conversation-scroll]{overflow-x:hidden}）；
 *   8. composer-width：hero 宽度手柄只删视觉线（样式串无 ::after）而拖拽能力
 *      （pointerdown/move/up/lostpointercapture/keydown + col-resize）与
 *      localStorage 'dsh.conversation.contentWidth' 偏好写读全保留（03d §6 W2 裁决）。
 *
 * ## 这些取值为什么来自 ZCode
 * 不是本仓自创，而是 ZCode 真值三路证据交叉定型，夜审时逐行核对过：
 *   - ZCode 活页 CDP 实测（9224 = ZCode 侧、9223 = DSH 宿主侧）：列宽 1280→848/864、
 *     2000→1104/1120；p 14px/24.5px/0.35px；h2 16/28/600/24/16；气泡 radius
 *     `12px 2px 12px 12px`、padding `12px 16px`、border rgba(255,255,255,0.1)；
 *     操作行 gap 4 / mt 4 / 默认 opacity 0 / 按钮 24×24·透明底 / svg 14px·1.5。
 *   - ZCode asar 静态提取（grep -a 复跑一致）：rounded-tr-xs、overflow-x-hidden 等。
 *   - 审计文档在案：03c-conversation.md 矩阵 C1/C2/C3、03c-conversation-zcode-spec.json、
 *     03n-typography.md A1-A13+B1-B9、02-motion.md「正文操作行」实测表（:355-370）、
 *     03d §6 W2 裁决原文（只删视觉线，拖动热区/光标/偏好保留）。
 *   - 令牌锚点一并锁死（本仓对 ZCode 值的落地处，防令牌漂移连坐样式）：
 *     zcode-theme.ts:131 feedback 档 150ms + cubic-bezier(.4,0,.2,1)；
 *     zcode-tokens.ts r-xs 2px / r-md 6px / r-xl 12px / border-l2 rgba(255,255,255,0.1) /
 *     font-size-sm = base − 2px。
 *
 * ## 为什么用文本断言而不是渲染测试
 *   1. 本模块只产出一段 CSS 文本、注入宿主 <style>（installConversationLayout），
 *      真实渲染依赖宿主 DOM 与哈希类名，单测环境没有宿主可渲染；
 *   2. 计算值已由 CDP 活体实测核过（见上），本文件防的是「源码取值漂移」——
 *      任何一处字面量被改动，文本断言立刻红，无需起浏览器；
 *   3. 本机 OS 开启 reduced-motion 时主题层统一把 computed 过渡时长归零
 *      （zcode-theme.ts:221，设计内），渲染级时长断言在这台机器上不可复现，
 *      150ms 以源码令牌为准。
 *
 * 纯 JS（.mjs）：全量门禁第 1 步是 tsc --noEmit 全仓类型检查，.assert.ts 版本
 * 因类型检查被整批撤回（tsx 能跑 ≠ tsc 能过）；.mjs 不进 tsc，且本文件不 import
 * 任何 .ts 模块，只 readFileSync 读源码文本。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 读源码文本并统一换行，避免 CRLF 环境下多行正则失配。 */
function readSource(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8').replace(/\r\n/g, '\n')
}

const layout = readSource('src/client/conversation-layout.ts')
const composer = readSource('src/client/composer-width.ts')
const theme = readSource('src/client/zcode-theme.ts')
const tokens = readSource('src/client/zcode-tokens.ts')

// ── 1. 内容列两档宽 + 切宽阈值 + 输入卡跟随 ─────────────────────────────────
// ZCode 实测：窄档文字列 848（容器 896 − 两侧内衬）、宽档 1104（容器 1152 − 内衬）；
// 切宽阈值 1188 = 与 ZCode 同视口 1554 切换的换算（1554 − DSH 滚动区侧内衬 366）；
// 输入卡 = 文字列 + 16（实测 1280→864 / 2000→1120）。
assert.match(
  layout,
  /const ZCODE_CONTENT_WIDTH = 848/,
  '窄档列宽必须是 848：ZCode 实测文字列宽，改掉即与 ZCode 每行字数不一致',
)
assert.match(
  layout,
  /const ZCODE_CONTENT_WIDTH_WIDE = 1104/,
  '宽档列宽必须是 1104：ZCode 容器 ≥1280 时把 896 提到 1152（含内衬 → 文字 1104）',
)
assert.match(
  layout,
  /const ZCODE_CONTENT_WIDE_MIN = 1188/,
  '切宽阈值必须是 1188：按「与 ZCode 同视口 1554 切宽」校准（1554 − 366）',
)
assert.match(
  layout,
  /\[data-conversation-scroll\]\{container-type:inline-size\}/,
  '必须用容器查询（container-type:inline-size）：侧栏收起改变可用宽而视口不变，媒体查询会漏',
)
assert.match(
  layout,
  /\[data-conversation-scroll\] \.icaHSq_column\{max-width:min\(\$\{ZCODE_CONTENT_WIDTH\}px,100%\)\}/,
  '窄档规则必须引用 ZCODE_CONTENT_WIDTH 常量（848），避免字面量与常量漂移',
)
assert.match(
  layout,
  /@container \(min-width:\$\{ZCODE_CONTENT_WIDE_MIN\}px\)\{\[data-conversation-scroll\] \.icaHSq_column\{max-width:min\(\$\{ZCODE_CONTENT_WIDTH_WIDE\}px,100%\)\}\}/,
  '宽档必须在 @container (min-width:1188px) 内把列宽切到 1104',
)
assert.match(
  layout,
  /\[data-composer-card\]\{max-width:min\(calc\(\$\{ZCODE_CONTENT_WIDTH\}px \+ 16px\),100%\)\}/,
  '输入卡窄档必须跟随正文列：calc(848 + 16)，ZCode 实测卡宽 = 文字列 + 16',
)
assert.match(
  layout,
  /@container \(min-width:\$\{ZCODE_CONTENT_WIDE_MIN\}px\)\{\[data-conversation-scroll\] \[data-composer-card\]\{max-width:min\(calc\(\$\{ZCODE_CONTENT_WIDTH_WIDE\}px \+ 16px\),100%\)\}\}/,
  '输入卡宽档必须同样在容器查询内切到 calc(1104 + 16)',
)

// ── 2. 轮组间距 / 正文行高 / 等宽字号 ──────────────────────────────────────
// 间距走宿主自留变量 --dsh-chat-flow-gap（全站未定义、一直吃回退 6px），
// 在 column 上定义它即可，不需要和宿主抢特异性（三次尝试的血泪史结论）。
assert.match(
  layout,
  /const ZCODE_TURN_GAP = 20/,
  '轮组间距必须是 20：ZCode 轮组制间距实测值',
)
assert.match(
  layout,
  /const ZCODE_LINE_HEIGHT = 24\.5/,
  '正文行高必须是 24.5：ZCode 14px 字号下 1.75 倍的实测定值',
)
assert.match(
  layout,
  /\{--dsh-chat-flow-gap:\$\{ZCODE_TURN_GAP\}px\}/,
  '轮组间距必须通过宿主变量入口 --dsh-chat-flow-gap 注入（比特异性抢规则稳）',
)
assert.match(
  layout,
  /\.icaHSq_column p\{line-height:\$\{ZCODE_LINE_HEIGHT\}px\}/,
  '正文段落行高必须引用 ZCODE_LINE_HEIGHT 常量（24.5px）',
)
assert.match(
  layout,
  /\.icaHSq_column pre code\{/,
  '等宽字号必须同时覆盖 pre 与其中的 code（宿主把字号写在 pre、code 有自己的 computed 值）',
)
assert.match(
  layout,
  /font-size:var\(--dsw-font-size-sm,12px\);\n  line-height:21px;/,
  '等宽字号必须走 sm 令牌（=12px）+ 行高 21px：21/12 = 1.75 与正文同比例',
)
assert.match(
  tokens,
  /'--dsw-font-size-sm': 'calc\(var\(--dsw-font-size-base\) - 2px\)',/,
  'sm 令牌必须保持 base−2px（zcode-tokens.ts:558）：12px = ZCode 等宽实测字号',
)

// ── 3. 正文操作行全套 ──────────────────────────────────────────────────────
// 02-motion.md「正文操作行」实测表（:355-370）逐项对应；过渡时长以源码令牌为
// 准（本机 OS reduced-motion 时 computed 归零是 zcode-theme.ts:221 的统一设计）。
assert.match(
  layout,
  /\.d1vkyW_actions\{\n  gap:4px;\n  margin-top:4px;\n  opacity:0;/,
  '操作行容器必须 gap 4 / mt 4 / 默认 opacity 0（ZCode 真值：行默认隐藏）',
)
assert.match(
  layout,
  /transition:opacity var\(--dcu-motion-feedback-duration\) var\(--dcu-motion-feedback-ease\);/,
  '操作行过渡必须只动 opacity 且走 feedback 档令牌（150ms cubic-bezier(.4,0,.2,1)）',
)
assert.match(
  layout,
  /\.icaHSq_flowItem:hover \.ppByMG_actions,\n\[data-conversation-scroll\] \.icaHSq_column \.icaHSq_flowItem:hover \.d1vkyW_actions,\n\[data-conversation-scroll\] \.icaHSq_column \.icaHSq_flowItem:focus-within \.ppByMG_actions,\n\[data-conversation-scroll\] \.icaHSq_column \.icaHSq_flowItem:focus-within \.d1vkyW_actions\{\n  opacity:1;/,
  'hover 消息行 或 focus-within 时操作行必须现形（opacity 1），四条选择器缺一不可',
)
assert.match(
  layout,
  /\.oB5zFG_action\{\n  width:auto;\n  min-width:24px;\n  height:24px;\n  border-radius:var\(--dsw-radius-md\);\n  padding:0 4px;\n  white-space:nowrap;\n  background:transparent;\n  color:var\(--dsw-alias-label-primary\);\n\}/,
  '操作按钮必须 min-width 24×24 / r-md / 左右 4px 内衬 / 透明底 / 全前景（min-width 化是防带文字钮溢出的在案 DSH 适配）',
)
assert.match(
  layout,
  /:is\(\.ppByMG_actions,\.d1vkyW_actions\) button\{color:var\(--dsw-alias-label-primary\)!important\}/,
  'dsh-session-kit 内联 50% 色只能用 !important 压过（本文件唯一颜色类重要级覆盖，范围仅限操作行按钮颜色）',
)
assert.match(
  layout,
  /\.oB5zFG_action svg\{\n  width:14px;\n  height:14px;\n  stroke-width:1\.5;\n\}/,
  '操作图标必须 14×14 / stroke 1.5（ZCode 真值）',
)
assert.match(
  theme,
  /--dcu-motion-feedback-duration:150ms;--dcu-motion-feedback-ease:cubic-bezier\(\.4,0,\.2,1\);/,
  'feedback 档必须保持 150ms + cubic-bezier(.4,0,.2,1)（zcode-theme.ts:131，ZCode asar 实测校正）',
)
assert.match(
  tokens,
  /'--dsw-radius-md': '6px',/,
  'r-md 必须保持 6px（zcode-tokens.ts:506）：操作按钮圆角引用它',
)

// ── 4. G17 用户气泡 ────────────────────────────────────────────────────────
// ZCode 活页 .history-message > .group/user-row（CDP 9224 实测）：
// 右对齐 / 气泡 border 1px 10% 前景 / radius 12·2·12·12（rounded-xl + rounded-tr-xs 尾巴角）/
// padding 12px 16px（px-4 py-3）/ max-w 576 / 文字 14px 行高 21px（1.5 倍）。
assert.match(
  layout,
  /\.IzP3Va_userStack\{align-items:flex-end\}/,
  '用户轮容器必须右对齐（align-items:flex-end）：这是 user 行与 assistant 行的根本分界',
)
assert.match(
  layout,
  /\.IzP3Va_userRow\{gap:4px\}/,
  '用户轮行内间距必须 4px（气泡与动作行之间，ZCode mt-1 口径）',
)
assert.match(
  layout,
  /\.IzP3Va_userStack\{max-width:576px\}/,
  '气泡限宽必须 576：ZCode max-w-xl 实测值',
)
assert.match(
  layout,
  /\.IzP3Va_bubble\{\n  border:1px solid var\(--dsw-alias-border-l2,rgba\(255,255,255,\.1\)\);/,
  '气泡必须有 1px border-l2 边框（宿主默认无边框，这是 G17 补的差之一）',
)
assert.match(
  layout,
  /border-radius:var\(--dsw-radius-xl\) var\(--dsw-radius-xs\) var\(--dsw-radius-xl\) var\(--dsw-radius-xl\);/,
  '气泡圆角必须是 xl·xs·xl·xl：右上 2px 是 rounded-tr-xs「尾巴」角，其余 12px',
)
assert.match(
  layout,
  /  padding:12px 16px;/,
  '气泡内边距必须 12px 16px（px-4 py-3）',
)
assert.match(
  layout,
  /line-height:calc\(21px \+ var\(--dsh-content-font-delta,0px\)\);/,
  '气泡行高必须 21px + delta：ZCode text-ui-base 1.5 倍，delta 保住宿主字号缩放',
)
assert.match(
  tokens,
  /'--dsw-radius-xs': '2px',/,
  'r-xs 必须保持 2px（zcode-tokens.ts:504）：气泡尾巴角引用它',
)
assert.match(
  tokens,
  /'--dsw-radius-xl': '12px',/,
  'r-xl 必须保持 12px（zcode-tokens.ts:508）：气泡主体圆角引用它',
)
assert.match(
  tokens,
  /'--dsw-alias-border-l2': 'rgba\(255, 255, 255, 0\.1\)',/,
  'border-l2 必须保持 10% 前景（zcode-tokens.ts:321 = ZCode --color-border）',
)

// ── 5. T1 排版节奏 ─────────────────────────────────────────────────────────
// 03n-typography.md A1-A13 + B1-B9 全表在案；「工整感」四因缺一即散：
// 字距 / 标题克制（h3 起与正文同字号靠字重分层）/ 列表呼吸 / 列表内段落归零。
assert.match(
  layout,
  /\{letter-spacing:0\.025em\}/,
  '会话列字距必须 0.025em（tracking-wide，@14px = 0.35px）',
)
assert.match(
  layout,
  /\.icaHSq_column p\{letter-spacing:0\.35px\}/,
  '正文段落字距必须钉成绝对值 0.35px（对齐 ZCode 实测）',
)
assert.match(
  layout,
  /\.icaHSq_column kbd\{letter-spacing:normal\}/,
  'pre/code/kbd 字距必须显式归零：等宽代码加字距会破坏对齐',
)
assert.match(
  layout,
  /\.icaHSq_column h1\{font-size:var\(--dsw-font-size-xl,18px\);line-height:31\.5px;font-weight:600;margin:24px 0 16px\}/,
  'h1 必须 18px / 31.5 / 600 / 上下 24·16',
)
assert.match(
  layout,
  /\.icaHSq_column h2\{font-size:var\(--dsw-font-size-lg,16px\);line-height:28px;font-weight:600;margin:24px 0 16px\}/,
  'h2 必须 16px / 28 / 600 / 上下 24·16（活体 computed 已核）',
)
assert.match(
  layout,
  /\.icaHSq_column h3,\n\[data-conversation-scroll\] \.icaHSq_column h4\{font-size:var\(--dsw-font-size-base,14px\);line-height:24\.5px;font-weight:600;margin:24px 0 16px\}/,
  'h3-h4 必须回落正文 14px / 24.5 / 600：克制靠字重不靠字号',
)
assert.match(
  layout,
  /\.icaHSq_column h5\{font-size:var\(--dsw-font-size-base,14px\);line-height:24\.5px;font-weight:500;margin:24px 0 16px\}/,
  'h5 必须 14px / 500：字重阶梯 600→500→400 的中档',
)
assert.match(
  layout,
  /\.icaHSq_column h6\{font-size:var\(--dsw-font-size-base,14px\);line-height:24\.5px;font-weight:400;margin:24px 0 16px\}/,
  'h6 必须 14px / 400：字重阶梯最低档',
)
assert.match(
  layout,
  /\.icaHSq_column ol\{margin:12px 0;padding-left:20px\}/,
  'ul/ol 必须上下 12（my-3）左缩进 20（pl-5）',
)
assert.match(
  layout,
  /\.icaHSq_column li\{padding-left:4px;line-height:24\.5px\}/,
  'li 必须左内衬 4（pl-1）且行高与正文一致 24.5',
)
assert.match(
  layout,
  /\.icaHSq_column li \+ li\{margin-top:6px\}/,
  '列表项间距必须 6px（space-y-1.5）',
)
assert.match(
  layout,
  /\.icaHSq_column li::marker\{color:var\(--dsw-alias-label-dimmed,rgba\(212,212,212,\.3\)\)\}/,
  '列表 marker 必须 30% 前景（foreground-subtlest）',
)
assert.match(
  layout,
  /ul ul,\n\[data-conversation-scroll\] \.icaHSq_column ul ol,\n\[data-conversation-scroll\] \.icaHSq_column ol ul,\n\[data-conversation-scroll\] \.icaHSq_column ol ol\{margin:6px 0\}/,
  '四种嵌套列表组合必须都压到上下 6：嵌套不改则列表越套越散',
)
assert.match(
  layout,
  /\.icaHSq_column li > p\{margin:0;display:inline\}/,
  '列表内段落必须归零且行内：避免 p 的下边距把列表撑散',
)

// ── 6. 尾行系 ──────────────────────────────────────────────────────────────
// ZCode 全文档 0 个可见 hr（章节只靠留白分层）；时间戳 = 12px / 30%；
// 工具行（已运行命令 / 思考…）= 30% / 500。
assert.match(
  layout,
  /\.icaHSq_column hr\{\n  border:0;\n  height:0;\n  background:transparent;\n  margin:24px 0;\n\}/,
  'hr 必须抹线保距：高度 0 + 透明底 + 上下 24（DSH 的 1px 格子线是「毛坯感」主因）',
)
assert.match(
  layout,
  /\.ppByMG_timeEnd\{\n  font-size:var\(--dsw-font-size-sm,12px\);\n  color:var\(--dsw-alias-label-dimmed,rgba\(212,212,212,\.3\)\);\n\}/,
  '时间戳必须 12px / 30%（text-ui-sm + foreground-subtlest，DSH 原为 13px/12px、50%）',
)
assert.match(
  layout,
  /\[data-process-activity\]\{\n  color:var\(--dsw-alias-label-dimmed,rgba\(212,212,212,\.3\)\);\n  font-weight:500;\n\}/,
  '工具行必须 30% / 500：DSH 原为 50% / 400，偏亮偏细',
)
assert.match(
  layout,
  /\[data-process-activity\] \*\{color:inherit\}/,
  '工具行内层必须显式继承 30%：内层 label 自带 50% 声明，不继承则外层规则被架空',
)

// ── 7. X1 会话区禁横向滚动 ─────────────────────────────────────────────────
// ZCode 会话滚动容器显式 overflow-x-hidden，横滚内容（pre/表格）自己滚。
assert.match(
  layout,
  /\[data-conversation-scroll\]\{overflow-x:hidden\}/,
  '会话滚动区必须 overflow-x:hidden：DSH 宿主是 auto，任何宽内容都会冒横向滚动条',
)

// ── 8. composer-width：手柄只删视觉线、拖拽能力保留（03d §6 W2 裁决）────────
// 手柄样式是 :20 的单行模板串；::after 只允许出现在 :18 的「已删除」注释里，
// 所以必须提取样式串本身判断，不能对整个文件做否定检查。
assert.match(
  composer,
  /const key = 'dsh\.conversation\.contentWidth'/,
  '宽度偏好键名必须保持 dsh.conversation.contentWidth（初始化与拖拽保存共用）',
)
assert.match(
  composer,
  /const saved = Number\(storage\.getItem\(key\)\)/,
  '初始化必须先读已有偏好：有效偏好不重置（拖拽起点沿用宿主存储）',
)
assert.match(
  composer,
  /storage\.setItem\(key, String\(COMPOSER_MIN_WIDTH\)\)/,
  '无偏好时初始化必须写入最窄宽度兜底',
)
const heroStyle = composer.match(/style\.textContent = `([^`]*)`/)?.[1] ?? ''
assert.equal(
  heroStyle.length > 0,
  true,
  'hero 宽度手柄必须仍以 style.textContent 模板串注入（提取失败说明注入结构被改）',
)
assert.equal(
  heroStyle.includes('::after'),
  false,
  '手柄视觉线必须保持删除：::after 100px 渐变竖线在阅读时会突然亮起（用户实测反馈，W2 裁决只删线）',
)
assert.equal(
  heroStyle.includes('cursor:col-resize'),
  true,
  '拖拽光标必须保留：删的是视觉线不是交互能力（W2 裁决另一半）',
)
assert.match(
  composer,
  /handle\.addEventListener\('pointerdown'/,
  '拖拽链必须保留 pointerdown（起点记录 + setPointerCapture）',
)
assert.match(
  composer,
  /handle\.addEventListener\('pointermove'/,
  '拖拽链必须保留 pointermove（实时发布宽度）',
)
assert.match(
  composer,
  /handle\.addEventListener\('pointerup'/,
  '拖拽链必须保留 pointerup（落点保存偏好）',
)
assert.match(
  composer,
  /handle\.addEventListener\('lostpointercapture'/,
  '拖拽链必须保留 lostpointercapture（捕获丢失时回弹，防宽度悬空）',
)
assert.match(
  composer,
  /handle\.addEventListener\('keydown'/,
  '键盘可达性必须保留：ArrowLeft/Right/Home 微调宽度',
)
assert.match(
  composer,
  /localStorage\.setItem\('dsh\.conversation\.contentWidth', String\(value\)\)/,
  '拖拽结束必须把宽度写回 localStorage 偏好键（写读闭环的写侧）',
)

console.log('night-audit-batch-9：8 个对齐点、64 条断言全部通过（conversation-layout ×7 + composer-width ×1）')
