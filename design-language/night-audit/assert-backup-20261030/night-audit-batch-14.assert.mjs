/**
 * 夜审第 14 批 —— ZCode 对齐项的回归契约（纯 JS，过 tsc --noEmit 全仓门禁）。
 *
 * ## 锁什么（10 条已复核对齐项）
 *
 * 1-4. **TurnNavigator.tsx 刻度几何 / hover 波 / reduced-motion / 焦点环**
 *    - 静息刻度 12×2px、按钮 36×10 且 padding:0、列表 gap:0 + padding 4px 0（⇒ 纵向
 *      pitch = 按钮高 10px）、`transform-origin:0 50%` + `border-radius:var(--dsw-radius-full,999px)`。
 *      出处：ZCode 3.16.3 源码 `block h-0.5 w-3 origin-left rounded-full`（h-0.5=2px、w-3=12px，
 *      `--spacing:.25rem`）、`estimateSize:10`、按钮 `h-2.5 w-9`（36×10）且无 padding；
 *      ZCODE-INDEX-SPEC §二 同款记录。
 *    - hover 是**四档离散表**，不是连续曲线：scaleX 2.6/1.7/1.25、opacity 1/0.86/0.72、
 *      静息 0.58，只影响 ±2 条（距离 ≥3 落 `?? 1` / `?? ZCODE_IDLE_OPACITY`）。出处：ZCode
 *      conversationTurnNavigatorHelpers.ts:323-338 同表；生产 asar 内原文
 *      `opacity:.58,scaleX:1 … opacity:1,scaleX:2.6 … opacity:.86,scaleX:1.7 … opacity:.72,scaleX:1.25`。
 *      注意本仓把 scaleX 换算成宽度（12×2.6=31.2），数值表等价。
 *    - reduced-motion 两侧都把过渡归零：本仓两条 `@media (prefers-reduced-motion:reduce)`，
 *      ZCode 侧为 `motion-reduce:transition-none`（源码 :158,:224，asar 同串）。
 *    - 焦点环是**无 offset 的 solid 2px 语义令牌**：
 *      `box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dcu-focus))`，对应 ZCode
 *      `focus-visible:ring-2 ring-input-border-focused`（源码 :220，asar 同串）；键盘
 *      onFocus/onBlur 并入 hover 波，Tab 走查时也能看到刻度放大。
 *      `--dsw-focus-ring-color` 的运行时值（brand #0b7fff，07-delivery-ledger.md A1/A2）由宿主
 *      主题解析，插件源码里只有引用 —— 故这里锁「引用 + offset=0 的写法」，不锁色值。
 * 5. **TurnNavigator.tsx 点击滚动**：G11b 的根因是参数正确的原生 `scrollTo smooth` 在本容器
 *    **完全无效**（实测 20 帧 scrollTop 恒定，宿主接管滚动），所以点击改为 scrollTop
 *    **直接赋值**（含 −12 视觉偏移），跨距离平滑交给 turn-rail-zcode.ts → scroll-anim.ts
 *    的 animateScroll。勘误：审计员引的 turn-rail-zcode.ts ':235-243' 已过时——第 27 轮重构
 *    后实现移到 scroll-anim.ts（02-motion.md「实现副本已消灭」），:235-243 现为 scan()；
 *    机制本身成立，故按现状锁「直赋 + import + 调用 + 唯一实现」，并反向锁「不得再出现
 *    `.scrollTo(` 调用」。
 * 6. **official-turn-navigator.ts 宿主 nav 结构判定**：认 `.JXrxFq_marks` 即认宿主导航，
 *    **不要求已有按钮** —— G11 要解决的正是"一个按钮都没有"的形态，若把"有按钮"当前置
 *    条件，接管逻辑永远不触发；marks 有高度但 children=0 时打 `data-dcu-official-turn-empty`
 *    交自绘接管，否则撤属性交还。该类名在宿主 asar 里实跑
 *    `grep -a -o JXrxFq_marks …app.asar` 得 2 命中（CSS `.JXrxFq_marks{position:relative}` 与
 *    类名映射 `"marks":"JXrxFq_marks"`），说明它是真实宿主锚点而非猜测（"0 命中"的说法已勘误）。
 * 7. **official-turn-navigator.ts 侧栏动画期跳过**：开合动画期间每帧 style 写入 ⇒ 观察器每帧
 *    触发 ⇒ 全文档 querySelectorAll('nav') + marks.getBoundingClientRect() 强制同步布局
 *    （08-performance-audit.md §2 实测 Layout 33 次/232ms、getBoundingClientRect 249ms）。
 *    修法：动画期置 pending 并直接 return（不跑 markOfficialTurnNavigators），加 400ms
 *    setTimeout 兜底（宿主连属性一起重建时移除事件不触达观察器），并在观察器看到该属性消失
 *    后补跑。§4 记录 p95 33.4→16.7ms、长任务 0。
 * 8. **CSS 互斥 = 能力探测 ∩ 结构标记双条件**：自绘导航只在「探测命中 ∩ 宿主 nav 已标」
 *    同时成立时隐藏，后者用 `html:has(...)`。08-performance-audit.md §6 要求补的 has 已在位。
 *    任一条被删都会让两条索引栏并存或两条全消失，所以整串逐字锁。
 * 9. **conversation-bubbles.ts 撤回旧版气泡覆盖**：两个样式节点 id + `?.remove()`、清掉
 *    `[data-dcu-user-card]` 节点、撤 `data-dcu-user-source` / `data-dcu-expandable-user-bubble`
 *    两属性，接线在 conversation-header.ts:272,286（文档级 + 每个补丁根）。03c-conversation.md
 *    C-0 记录活体 8/8 命中（--dsw-specific-bubble / 12px 2px 12px 12px / 12px 16px / max-w 576 /
 *    21px），即用户轮形态已归宿主；"计数=0"属运行时行为，这里只锁撤回函数的结构。
 * 10. **InputHistoryDock.tsx hint 字号走 sm 档**：`[data-composer-placeholder]::after` 用
 *    `font-size:var(--dsw-font-size-sm)`。04-open-gaps.md:325 记录该令牌解析为
 *    calc(14px - 2px) = 12px；03n-typography.md A2「sm 12 / base 14 / lg 16 / xl 18」。12px 是
 *    宿主运行时解析值、插件源码里只有引用，故锁「引用 sm 档」+ 令牌的派生式（防止有人把
 *    sm 改成固定 px，让"比 base 小一档"的语义消失）。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 这批锁的全是「移植取值 + 接线关系」：像素几何、离散数值表、CSS 令牌引用、DOM 标记名。
 * 渲染测试要活宿主、真实主题和 ZCode 侧对照，而取值写错时照样可能绿（把 2.6 写成 2.5 只差
 * 0.5px，肉眼与快照都不一定抓到）。源码文本断言能确定地钉住"源里写着什么"：谁改对齐值、
 * 顺手删掉一条 `html:has`、或把直赋改回 smooth scrollTo，门禁立刻红。像素级是否真的还原，
 * 由 ZCODE-INDEX-SPEC 的实测表与活体验收保证；这里保证它的输入不再漂移。
 * 用纯 JS（.mjs）是硬要求：全量门禁第一步是 tsc --noEmit 全仓类型检查，断言文件不该进类型图。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const nav = read('TurnNavigator.tsx')
const official = read('official-turn-navigator.ts')
const bubbles = read('conversation-bubbles.ts')
const header = read('conversation-header.ts')
const dock = read('InputHistoryDock.tsx')
const sidebar = read('CodexSidebar.tsx')

// ── 1. TurnNavigator.tsx：刻度静息几何 12×2 / 按钮 36×10 / pitch 10px ───────
assert.match(
  nav,
  /const ZCODE_TICK_BASE_W = 12\b/,
  '刻度静息宽变了：ZCode w-3 = 12px（ZCODE-INDEX-SPEC §二 实测）',
)
assert.match(
  nav,
  /const ZCODE_TICK_BASE_H = 2\b/,
  '刻度静息高变了：ZCode h-0.5 = 2px',
)
assert.match(
  nav,
  /\.dcu-turn-link\{[^}]*width:36px;height:10px;overflow:visible;padding:0;/,
  '刻度按钮必须 36×10 且 padding:0（ZCode h-2.5 w-9 = 36×10、无 padding）；加内距会改掉 pitch',
)
assert.match(
  nav,
  /\.dcu-turn-list\{[^}]*gap:0;margin:0;padding:4px 0;/,
  '列表必须 gap:0：ZCode estimateSize:10 + 按钮高 10px ⇒ 纵向 pitch 恰好 10px，加 gap 会让刻度间距失真',
)
assert.match(
  nav,
  /\.dcu-turn-link::before\{[^}]*border-radius:var\(--dsw-radius-full,999px\)[^}]*transform-origin:0 50%/,
  '刻度必须胶囊圆角 + 左侧变形原点（ZCode rounded-full + origin-left），否则 hover 放大方向变错',
)
assert.match(
  nav,
  /opacity:var\(--dcu-tick-op,\.58\)/,
  '刻度 CSS 的透明度兜底必须与常量 ZCODE_IDLE_OPACITY 同为 .58；两处漂移会让静息态前后不一致',
)

// ── 2. TurnNavigator.tsx：hover 四档离散波（±2 条窗口）────────────────────
assert.match(
  nav,
  /const ZCODE_HOVER_SCALE = \[2\.6, 1\.7, 1\.25\]/,
  'hover 缩放表变了：ZCode 只有四档 scaleX 2.6/1.7/1.25（+ 静息 1），不是连续高斯曲线',
)
assert.match(
  nav,
  /const ZCODE_HOVER_OPACITY = \[1, 0\.86, 0\.72\]/,
  'hover 透明度表变了：ZCode 为 1/0.86/0.72（生产 asar 原文逐字命中）',
)
assert.match(
  nav,
  /const ZCODE_IDLE_OPACITY = 0\.58\b/,
  '静息透明度变了：ZCode opacity:.58',
)
assert.match(
  nav,
  /ZCODE_HOVER_SCALE\[distance\] \?\? 1/,
  '距离 ≥3 必须落回 scaleX 1：档位表只覆盖 ±2 条，窗口外不得继续放大',
)
assert.match(
  nav,
  /ZCODE_HOVER_OPACITY\[distance\] \?\? ZCODE_IDLE_OPACITY/,
  '距离 ≥3 必须落回静息透明度，否则远处刻度会莫名变实/变淡',
)
assert.match(
  nav,
  /if \(hoverAt === null\) return \{ width: ZCODE_TICK_BASE_W, height: ZCODE_TICK_BASE_H, opacity: ZCODE_IDLE_OPACITY \}/,
  'hoverAt 为 null（指针离开）必须整体回静息几何，不能残留任何一档 hover 值',
)
assert.match(
  nav,
  /width: Number\(\(ZCODE_TICK_BASE_W \* scale\)\.toFixed\(1\)\)/,
  '宽度必须由 12×scale 派生（12×2.6=31.2）：这是"scaleX 换算成宽"的等价实现，写死像素会与档位表脱钩',
)

// ── 3. TurnNavigator.tsx：reduced-motion 把过渡归零（两条规则都要）──────────
assert.match(
  nav,
  /@media \(prefers-reduced-motion:reduce\)\{\.dcu-turn-navigator\[data-dcu-rail-sync\]\{transition:none\}\}/,
  '侧栏同步位移缺 reduced-motion 归零：减弱动效用户仍会看到索引栏跟着滑（ZCode motion-reduce:transition-none）',
)
assert.match(
  nav,
  /@media \(prefers-reduced-motion:reduce\)\{\.dcu-turn-link,\.dcu-turn-link::before\{transition:none\}\}/,
  '刻度 hover 波缺 reduced-motion 归零：减弱动效用户仍会看到刻度缩放',
)

// ── 4. TurnNavigator.tsx：焦点环 2px 语义令牌 + focus 并入 hover 波 ────────
assert.match(
  nav,
  /\.dcu-turn-link:focus-visible\{outline:0;box-shadow:0 0 0 2px var\(--dsw-focus-ring-color,var\(--dcu-focus\)\)\}/,
  '焦点环必须是 0 0 0 2px 语义令牌（无 offset、无写死色值）：对应 ZCode focus-visible:ring-2 ring-input-border-focused',
)
assert.ok(
  !/:focus-visible\{[^}]*box-shadow[^}]*box-shadow/.test(nav),
  '焦点环不得叠第二层 box-shadow：刻度行高只有 10px，任何额外偏移环都会压到相邻刻度',
)
assert.match(
  nav,
  /onFocus=\{\(\) => \{ setHoverAt\(index\) \}\} onBlur=\{\(\) => \{ setHoverAt\(null\) \}\}/,
  '键盘 focus 必须并入 hover 波（Tab 走查时也要有刻度放大反馈）；删掉后键盘用户失去定位提示',
)

// ── 5. TurnNavigator.tsx：点击直赋 scrollTop，平滑交 animateScroll ─────────
assert.match(
  nav,
  /host\.scrollTop = host\.scrollTop \+ anchor\.getBoundingClientRect\(\)\.top - host\.getBoundingClientRect\(\)\.top - 12/,
  '点击滚动必须 scrollTop 直接赋值（含 −12 视觉偏移）：G11b 实测原生 scrollTo smooth 在本容器 20 帧 scrollTop 恒定',
)
assert.ok(
  !/\.scrollTo\(/.test(nav),
  '不得再用 .scrollTo(...)：本容器滚动被宿主接管，该调用无效，点击会静默无反应',
)
assert.match(
  read('turn-rail-zcode.ts'),
  /import \{ animateScroll, conversationScroller, scrollAnims \} from '\.\/scroll-anim\.ts'/,
  '平滑滚动实现必须来自 scroll-anim.ts（第 27 轮重构已消灭副本，别在 rail 里再写一份）',
)
assert.match(
  read('turn-rail-zcode.ts'),
  /animateScroll\(scroller, now\)/,
  'rail 的滚轮/按键路径必须调用 animateScroll，否则长距离跳转失去 Chrome 21 点曲线与自适应时长',
)
assert.match(
  read('scroll-anim.ts'),
  /export function animateScroll\(scroller: HTMLElement, to: number\): void \{/,
  'animateScroll 实现必须存在于 scroll-anim.ts（第 27 轮重构后的唯一实现地）',
)

// ── 6. official-turn-navigator.ts：结构判定 + 空刻度接管/交还 ────────────────
assert.match(
  official,
  /const hasMarks = element\.querySelector\('\.JXrxFq_marks'\) !== null\n\s*if \(hasMarks\) return true/,
  '宿主 nav 必须在"有 .JXrxFq_marks 容器"时就认下（该类名在宿主 asar 有 CSS + 类名映射两处命中）；不得等到出现按钮',
)
assert.match(
  official,
  /const hasBox = marks\.getBoundingClientRect\(\)\.height > 0\n\s*const isEmpty = marks\.children\.length === 0\n\s*if \(hasBox && isEmpty\) nav\.setAttribute\(OFFICIAL_TURN_EMPTY_ATTRIBUTE, 'true'\)\n\s*else nav\.removeAttribute\(OFFICIAL_TURN_EMPTY_ATTRIBUTE\)/,
  '空刻度接管条件必须是「有高度但零子元素」，且 else 必须撤属性交还：只加不撤会让自绘永久霸占',
)
assert.match(
  official,
  /const OFFICIAL_TURN_EMPTY_ATTRIBUTE = 'data-dcu-official-turn-empty'/,
  '接管属性名变了：自绘导航按这个属性决定是否接管',
)
assert.match(
  official,
  /function markEmptyMarks\(nav: HTMLElement\): void \{\n\s*const marks = nav\.querySelector<HTMLElement>\('\.JXrxFq_marks'\)\n\s*if \(marks === null\) \{\n\s*nav\.removeAttribute\(OFFICIAL_TURN_EMPTY_ATTRIBUTE\)/,
  '找不到 marks 时必须撤接管标记（不能保持上一轮的 true），否则宿主重建 nav 后自绘仍被顶着',
)
assert.match(
  official,
  /element\.removeAttribute\(OFFICIAL_TURN_EMPTY_ATTRIBUTE\)/,
  '卸载必须清掉接管标记，否则回滚后自绘导航不再显示（标记没人撤）',
)

// ── 7. official-turn-navigator.ts：侧栏动画期跳过 + 400ms 兜底 ───────────────
assert.match(
  official,
  /const SIDEBAR_MOTION_ATTRIBUTE = 'data-dcu-sidebar-motion'/,
  '侧栏动画期标记名变了：sidebar-width.ts 写入、这里读取，改名即失去同步',
)
assert.match(
  official,
  /if \(doc\.querySelector\(`\[\$\{SIDEBAR_MOTION_ATTRIBUTE\}\]`\) !== null\) \{\n\s*pending = true/,
  '必须在读布局之前就退出：晚一步就是每帧一次强制同步布局（实测 900ms 开合内 232ms Layout）',
)
assert.match(
  official,
  /if \(pending && doc\.querySelector\(`\[\$\{SIDEBAR_MOTION_ATTRIBUTE\}\]`\) === null\) schedule\(\)\n\s*\}, 400\)/,
  '400ms 兜底必须还在：宿主连属性一起重建时移除事件不触达观察器，没兜底就永久 pending（索引停更）',
)
assert.match(
  official,
  /if \(records\.some\(record => record\.type === 'attributes' && record\.attributeName === SIDEBAR_MOTION_ATTRIBUTE\)\) \{\n\s*if \(doc\.querySelector\(`\[\$\{SIDEBAR_MOTION_ATTRIBUTE\}\]`\) === null\) schedule\(\)\n\s*return\n\s*\}/,
  '观察器必须在动画属性移除时补跑一次：run 在动画期间是空转的，不补跑就漏掉这一轮',
)
assert.match(
  official,
  /attributeFilter: \['style', SIDEBAR_MOTION_ATTRIBUTE\]/,
  '观察器必须监听 data-dcu-sidebar-motion，否则动画结束无从得知',
)

// ── 8. 能力探测 ∩ 结构标记：CSS 互斥双条件逐字锁 ────────────────────────────
assert.match(
  official,
  /runtimeSupportsOfficialTurnNavigator\(fetchImpl\)\.then\(supported => \{\n\s*if \(!active\) return\n\s*if \(supported\) doc\.documentElement\.setAttribute\(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE, 'true'\)\n\s*else doc\.documentElement\.removeAttribute\(OFFICIAL_TURN_NAVIGATOR_SUPPORTED_ATTRIBUTE\)/,
  '能力探测结果必须双态写回 html 属性（supported→set / 否则 remove），且探测前检查 active 防卸载后再写',
)
assert.ok(
  sidebar.includes(
    'html[data-dcu-official-turn-navigator-supported=true] .dcu-turn-navigator,html:has([data-dcu-official-turn-navigator]) .dcu-turn-navigator{display:none}',
  ),
  '互斥选择器必须逐字保留「能力探测 ∩ 结构标记(html:has)」双条件：缺 has 时压缩态（宿主 nav 在但零刻度）会连自绘一起隐藏，索引凭空消失',
)

// ── 9. conversation-bubbles.ts：撤回旧版气泡覆盖 ────────────────────────────
assert.match(
  bubbles,
  /export const USER_BUBBLE_STYLE_ID = 'dcu-user-bubble-style'/,
  '旧版气泡样式节点 id 变了：撤回逻辑靠它精确摘掉自己注入的 <style>',
)
assert.match(
  bubbles,
  /export const USER_BUBBLE_EXPAND_STYLE_ID = 'dcu-user-bubble-expand-style'/,
  '旧版长文本展开样式节点 id 变了：漏摘会让用户轮仍被旧规则接管',
)
assert.match(
  bubbles,
  /doc\?\.getElementById\(USER_BUBBLE_STYLE_ID\)\?\.remove\(\)\n\s*doc\?\.getElementById\(USER_BUBBLE_EXPAND_STYLE_ID\)\?\.remove\(\)/,
  '两个样式节点都必须被移除（只移一个会留下半套覆盖样式）',
)
assert.match(
  bubbles,
  /for \(const card of root\.querySelectorAll\('\[data-dcu-user-card\]'\)\) card\.remove\(\)/,
  '旧版注入的用户卡片节点必须整批移除：留着就是同一轮出现双份气泡',
)
assert.match(
  bubbles,
  /const selector = '\[data-dcu-user-source\],\[data-dcu-expandable-user-bubble\]'/,
  '清理选择器必须同时覆盖两个属性（漏一个就留下"可展开"残留标记）',
)
assert.match(
  bubbles,
  /source\.removeAttribute\('data-dcu-user-source'\)\n\s*source\.removeAttribute\('data-dcu-expandable-user-bubble'\)/,
  '两个覆盖期标记属性都必须撤掉，否则宿主气泡仍按旧版形态渲染',
)
assert.match(
  bubbles,
  /if \(root instanceof HTMLElement && root\.matches\(selector\)\) sources\.unshift\(root\)/,
  '补丁根自身也要进清理名单：querySelectorAll 不含自身，漏了会把根节点上的标记留成孤儿',
)
assert.match(
  header,
  /import \{ restoreOfficialUserBubbles \} from '\.\/conversation-bubbles\.ts'/,
  '撤回函数必须真被主流程导入：没有接线时它是死代码，旧覆盖永远不会被摘',
)
assert.match(
  header,
  /ensureStyle\(doc\)\n\s*restoreOfficialUserBubbles\(doc\)/,
  '装载时必须立刻在文档级撤一次旧覆盖：即使宿主本轮不再重渲染，旧样式也得马上摘掉',
)
assert.match(
  header,
  /for \(const root of roots\) restoreOfficialUserBubbles\(root\)/,
  '每个补丁根也要补撤（宿主可能用影子根，只看 document 会漏）',
)

// ── 10. InputHistoryDock.tsx：hint 字号走 sm 档 ─────────────────────────────
assert.match(
  dock,
  /\[data-composer-card\] \[data-composer-placeholder\]::after\{[\s\S]*?font-size:var\(--dsw-font-size-sm\)/,
  'hint 字号必须引用 --dsw-font-size-sm：写死 px 会在宿主改字号档时不同步',
)
assert.match(
  dock,
  /content:\$\{JSON\.stringify\(t\('input\.historyHint'\)\)\}/,
  'hint 文案必须走 i18n 键 input.historyHint（写死中文会让其他语言包失效）',
)
assert.match(
  read('zcode-tokens.ts'),
  /'--dsw-font-size-sm': 'calc\(var\(--dsw-font-size-base\) - 2px\)'/,
  'sm 档必须仍由 base 派生（=14-2=12px，04-open-gaps.md:325 记录值）：改成固定值会让"比 base 小一档"的语义消失',
)

console.log('night-audit batch-14 对齐契约：48 条断言全部通过')
