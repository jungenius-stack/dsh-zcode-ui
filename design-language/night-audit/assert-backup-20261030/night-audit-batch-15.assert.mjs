/**
 * 夜审第十五批回归断言（night-audit batch 15）—— 圆角标度 / 建议菜单壳 / 焦点环 /
 * 建议卡图标色 / 离屏跳过手法 / 工具按钮高度，共 7 条已复核对齐项。
 *
 * ## 锁什么
 * 全部是「已经正确」的行为（复核 verdict=verified），锁的是防回归，不是提期望：
 *  1. zcode-tokens.ts 圆角标度 = ZCode Tailwind 标度逐值复刻：
 *     xs 2px / sm 4px / md 6px / lg 8px / xl 12px / 2xl 16px / full 999px
 *  2. composer-tool-menus.ts @/指令建议菜单壳走 --dsw-radius-lg（宪章 §Menus：
 *     建议面板明确不继承主输入壳的 2xl 例外）
 *  3. composer-tool-menus.ts 过滤输入焦点环 = :focus-visible + outline 2px solid +
 *     offset -2px（WCAG 2.1 AA 2.4.7）
 *  4. 焦点环色 = 亮 #0b7fff / 暗 #4099ff，zcode-tokens（--dsw-focus-ring-color）与
 *     zcode-theme（--dcu-focus）双处同值
 *  5. NewConversationSuggestions.tsx 四张建议卡共用唯一中性图标色 --dsw-alias-menu-icon；
 *     旧四高饱和色只允许留在 P0-1 注释里，出现在任何代码行即为回归
 *  6. virtual-skip.ts 离屏跳过手法 = CSS-only：data-dcu-viskip 属性标记 +
 *     content-visibility:auto + contain-intrinsic-size:auto 275px，不插任何 DOM 节点
 *  7. composer-tool-menus.ts 工具按钮最小高度 28px
 *
 * ## 取值为什么来自 ZCode（证据来源）
 * 每条取值来自夜审复核记录（verdict=verified，含 ZCode asar 逐字提取），
 * 本文件写作时已逐行重读本仓源码确认与记录一致：
 *  - 圆角标度：ZCode asar 逐字提取 --radius-xs .125rem=2px / sm .25rem=4px /
 *    md .375rem=6px / lg .5rem=8px / xl .75rem=12px / 2xl 1rem=16px，六档逐值一致；
 *    full 本仓 999px vs ZCode --radius-full 9999px，两者语义同为「全圆」，字面不同，
 *    按本仓现状锁（改动需重新论证）。活体证据：03b-sidebar.md:31「圆角 8px」
 *    （复核注：evidence 原引 :30 实为行高一行，偏 1 行）；04-open-gaps.md:425-431
 *    C9 按钮全部 8px。
 *  - 菜单壳：宪章 §Menus 原文「Dropdown menus … use rounded-lg shells. This includes
 *    the main input's @ / suggestion panel; it does not inherit the main-input
 *    exception」逐字引用于 composer-tool-menus.ts:40-43 注释；ZCode asar 命中
 *    .rounded-lg{border-radius:var(--radius-lg)} 且 --radius-lg:.5rem=8px。
 *  - 焦点环形态：04-open-gaps.md:1815 G2「真实 Tab → outline solid 2px，
 *    :focus-visible 命中」与 :1623「outline=solid/2px ✅（10 次连续）」活体命中；
 *    源码 L30-35 注释保留了「20% alpha 内环数学上达不到 3:1（WCAG 2.1 AA 2.4.7）」
 *    的推导，删注释 = 丢掉这条规则的回归理由。
 *  - 焦点环色：ZCode asar --color-terminal-blue 亮 #0b7fff（light 段）/ 暗 #4099ff
 *    （dark 段）；本仓 provenance 直接写在 zcode-tokens.ts:187/:418 注释。
 *    复核注：evidence 举例 '.border-[#4099FF]' 实测 0 处，实际存在的是
 *    .text-[#4099ff]/.bg-[#4099FF] 等工具类——类名举例不准但「工具类存在」成立，
 *    不影响色值锁定。
 *  - 图标色：--dsw-alias-menu-icon 恰为 label-primary 的 60% α
 *    （亮 #262626 → rgba(38,38,38,.6)，暗 #d4d4d4 → rgba(212,212,212,.6)）；
 *    ZCode tokens.json 的彩色键全部是状态/git/terminal/usage/数据可视化等功能语境，
 *    无多彩装饰色相组；旧四色 #27aaff/#a478e8/#44bd83/#f48235 全仓仅存于组件头注释
 *    （设计审计 P0-1 记录）。
 *  - 离屏跳过：ZCode 原生虚拟列表（leadingBoundaryRows）消费 Tailwind 任意值类
 *    [content-visibility:auto] [contain-intrinsic-size:0_420px]（asar 实测）；
 *    本仓同构手法 = 属性标记 + auto/估算高度，275 为校准常量
 *    （08-performance-audit.md:63 登记的「超长会话滚动未测」即此手法的适用域边界）。
 *  - 28px：ZCode asar h-7（=28px）类存在（grep 计数 104 处）；
 *    03d-composer.md:16「按钮高度 28px ✅ 完全相同」。
 *
 * ## 为什么用文本断言而不是渲染测试
 * 这些对齐项的「正确」定义在本仓源码常量与令牌引用上（ZCode 实测值的复刻）；渲染结果
 * 还取决于宿主下发的 --dsw-* 令牌，随 DSH 版本变化。锁源码文本才能把「本仓改动导致的
 * 回归」（这条必须红）与「宿主令牌版本差异」（不该由本仓断言背锅）分开。涉及的样式
 * 全部是模板字符串常量 / 令牌表 / 注入字符串，文本断言等价于锁最终注入的 CSS。
 *
 * 本文件是纯 JavaScript（.mjs）：全量门禁第 1 步是 tsc --noEmit 全仓类型检查，
 * 此前 .assert.ts 版本因类型检查被撤回（tsx 能跑不等于 tsc 能过），.mjs 不进 tsc。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = readFileSync(resolve(root, 'src/client/zcode-tokens.ts'), 'utf8')
const menus = readFileSync(resolve(root, 'src/client/composer-tool-menus.ts'), 'utf8')
const theme = readFileSync(resolve(root, 'src/client/zcode-theme.ts'), 'utf8')
const suggestions = readFileSync(resolve(root, 'src/client/NewConversationSuggestions.tsx'), 'utf8')
const virtualSkip = readFileSync(resolve(root, 'src/client/virtual-skip.ts'), 'utf8')

// ── 1. 圆角标度 = ZCode Tailwind 标度逐值复刻（zcode-tokens.ts）───────────────
assert.match(
  tokens,
  /'--dsw-radius-xs': '2px'/,
  '圆角 xs 必须保持 2px（ZCode asar --radius-xs:.125rem=2px，六档标度逐值复刻）',
)
assert.match(
  tokens,
  /'--dsw-radius-sm': '4px'/,
  '圆角 sm 必须保持 4px（ZCode asar --radius-sm:.25rem=4px；03b-sidebar.md:31 圆角 8px 活体记录所在标度）',
)
assert.match(
  tokens,
  /'--dsw-radius-md': '6px'/,
  '圆角 md 必须保持 6px（ZCode asar --radius-md:.375rem=6px）',
)
assert.match(
  tokens,
  /'--dsw-radius-lg': '8px'/,
  '圆角 lg 必须保持 8px（ZCode asar --radius-lg:.5rem=8px；菜单壳/弹层/状态外壳都消费这一档）',
)
assert.match(
  tokens,
  /'--dsw-radius-xl': '12px'/,
  '圆角 xl 必须保持 12px（ZCode asar --radius-xl:.75rem=12px）',
)
assert.match(
  tokens,
  /'--dsw-radius-2xl': '16px'/,
  '圆角 2xl 必须保持 16px（ZCode asar --radius-2xl:1rem=16px；白名单大圆角档）',
)
assert.match(
  tokens,
  /'--dsw-radius-full': '999px'/,
  '圆角 full 必须保持 999px（语义为「全圆」；ZCode 用 9999px，字面不同但语义等价——改动需重新论证而不是顺手改数）',
)

// ── 2. @/指令建议菜单壳 = rounded-lg，不是 2xl（composer-tool-menus.ts）────────
// 宪章 §Menus：Dropdown menus 用 rounded-lg 壳，建议面板不继承主输入壳的 2xl 例外。
assert.match(
  menus,
  /\[data-conversation-scroll\] \[data-trigger-menu\]\{box-sizing:border-box;left:0;right:0;width:auto;min-width:0;max-width:none;padding:4px;border-radius:var\(--dsw-radius-lg\);background:var\(--dcu-tip-bg\);box-shadow:var\(--dcu-tip-shadow\)\}/,
  '建议菜单壳必须走 --dsw-radius-lg（8px）：宪章 §Menus 明文「rounded-lg shells … does not inherit the main-input exception」，此前沿用 12px 属违规已收敛',
)
assert.match(
  menus,
  /rounded-lg shells/,
  '宪章 §Menus 原文引用必须留在注释里（rounded-lg shells）：它是「为什么不是 2xl」的判据来源',
)
assert.match(
  menus,
  /it does not inherit the main-input exception/,
  '宪章原文「不继承主输入壳例外」半句必须保留：删掉它后人会再次把建议菜单当成主输入壳升级到 2xl',
)
assert.ok(
  !/\[data-trigger-menu\]\{[^}]*--dsw-radius-2xl/.test(menus),
  '建议菜单壳规则不得出现 --dsw-radius-2xl：宪章只给了主聊天输入壳 2xl 例外，建议面板明确不在白名单',
)

// ── 3. 过滤输入焦点环形态：:focus-visible + 2px solid + offset -2px ───────────
assert.match(
  menus,
  /\[data-dcu-tool-filter\]:focus-visible\{outline:2px solid var\(--dsw-focus-ring-color,var\(--dcu-focus\)\);outline-offset:-2px\}/,
  '过滤输入焦点环必须保持 :focus-visible + outline 2px solid（实色，回退链 --dsw-focus-ring-color → --dcu-focus）+ offset -2px；20% alpha 内环数学上达不到 3:1（WCAG 2.1 AA 2.4.7）',
)
assert.match(
  menus,
  /WCAG 2\.1 AA 2\.4\.7/,
  '焦点环注释必须保留 WCAG 2.4.7 的推导：它解释了「为什么必须是实色 outline」，删掉后人会再改回 alpha 内环',
)

// ── 4. 焦点环色 = ZCode --color-terminal-blue：亮 #0b7fff / 暗 #4099ff ────────
assert.match(
  tokens,
  /'--dsw-focus-ring-color': '#0b7fff'/,
  '焦点环令牌亮色必须保持 #0b7fff（ZCode asar --color-terminal-blue light 段；provenance 见 zcode-tokens.ts:187 注释）',
)
assert.match(
  tokens,
  /'--dsw-focus-ring-color': '#4099ff'/,
  '焦点环令牌暗色必须保持 #4099ff（ZCode asar --color-terminal-blue dark 段；provenance 见 zcode-tokens.ts:418 注释）',
)
assert.match(
  tokens,
  /ZCode: --color-terminal-blue #0b7fff/,
  '亮色档的 ZCode provenance 注释（--color-terminal-blue #0b7fff）必须保留：它是色值的取值依据',
)
assert.match(
  tokens,
  /ZCode Zai Dark: --color-terminal-blue #4099ff/,
  '暗色档的 ZCode provenance 注释（--color-terminal-blue #4099ff）必须保留：它是色值的取值依据',
)
assert.match(
  theme,
  /--dcu-sidebar-border:rgba\(13,13,13,\.1\);--dcu-focus:#0b7fff/,
  'zcode-theme 亮色 --dcu-focus 必须与焦点环令牌同值 #0b7fff（两处表达同一 ZCode 实测值，漂移即分叉）',
)
assert.match(
  theme,
  /--dcu-sidebar-border:rgba\(255,255,255,\.1\);--dcu-focus:#4099ff/,
  'zcode-theme 暗色 --dcu-focus 必须与焦点环令牌同值 #4099ff（回退链末端，两处漂移会让焦点环随主题变色）',
)

// ── 5. 建议卡图标唯一中性色（NewConversationSuggestions.tsx）──────────────────
assert.match(
  suggestions,
  /const ICON_COLOR = 'var\(--dsw-alias-menu-icon\)'/,
  '建议卡图标色必须是唯一常量 ICON_COLOR = var(--dsw-alias-menu-icon)：每卡各带高饱和 hex 是设计审计 P0-1 修掉的旧病',
)
assert.match(
  suggestions,
  /categories\.map\(\(\{ id, label, Icon \}\) => <button type="button" key=\{id\} disabled=\{hasDraft\} className="dcu-home-card" style=\{\{ '--dcu-home-icon': ICON_COLOR \}/,
  '四张卡必须在 categories.map 内共用同一个 style 变量注入 --dcu-home-icon：四卡同色的保证是「单一来源」，不是四处各写一份',
)
assert.match(
  tokens,
  /'--dsw-alias-menu-icon': 'rgba\(38, 38, 38, 0\.6\)'/,
  'menu-icon 亮色必须保持 label-primary(#262626) 的 60% α 形态（ZCode 语义：图标 = 前景降档，不是独立彩色）',
)
assert.match(
  tokens,
  /'--dsw-alias-menu-icon': 'rgba\(212, 212, 212, 0\.6\)'/,
  'menu-icon 暗色必须保持 label-primary(#d4d4d4) 的 60% α 形态（与亮色档同一推导）',
)
assert.match(
  tokens,
  /'--dsw-alias-label-primary': '#262626'/,
  '亮色 label-primary 必须保持 #262626：menu-icon 的 60% α 以它为基（基色漂移则图标色跟着漂）',
)
assert.match(
  tokens,
  /'--dsw-alias-label-primary': '#d4d4d4'/,
  '暗色 label-primary 必须保持 #d4d4d4：menu-icon 暗档的 60% α 以它为基',
)
// 旧四高饱和色（设计审计 P0-1 移除）只允许以注释形式留档，出现在代码行即为回归。
const suggestionLines = suggestions.split('\n').map((text, index) => ({ line: index + 1, text: text.trim() }))
for (const hex of ['#27aaff', '#a478e8', '#44bd83', '#f48235']) {
  const hits = suggestionLines.filter(entry => entry.text.includes(hex))
  assert.ok(
    hits.length >= 1,
    `旧高饱和色 ${hex} 必须仍以注释形式留档（设计审计 P0-1 记录）：连历史依据一起抹掉会让「为什么不能用装饰色相」失传`,
  )
  for (const hit of hits) {
    assert.ok(
      /^(\/\*|\*|\/\/)/.test(hit.text),
      `旧高饱和色 ${hex} 只允许出现在注释里，代码行 ${hit.line} 出现即为 P0-1 回归：${hit.text}`,
    )
  }
}

// ── 6. 离屏跳过手法 = 与 ZCode 原生虚拟列表同构（virtual-skip.ts）──────────────
// ZCode 原生虚拟列表消费 [content-visibility:auto] [contain-intrinsic-size:0_420px]；
// 本仓同构：属性标记 + auto/估算高度，且 CSS-only 不插节点（插 wrapper 方案已实测回滚）。
assert.match(
  virtualSkip,
  /export const VIRTUAL_SKIP_UNIT_PX = 275/,
  '消息单元估算高度必须保持校准值 275（含推理块长会话实测均值；总量误差实测约 0.3%，改动需按注释里的校准方法重新量）',
)
assert.match(
  virtualSkip,
  /`\[\$\{UNIT_ATTR\}\]\{content-visibility:auto;contain-intrinsic-size:auto \$\{VIRTUAL_SKIP_UNIT_PX\}px\}`/,
  '离屏跳过必须以 UNIT_ATTR 属性选择器 + content-visibility:auto + contain-intrinsic-size:auto <常量>px 注入（与 ZCode 原生虚拟列表同构；高度必须消费常量，避免双源漂移）',
)
assert.match(
  virtualSkip,
  /const UNIT_ATTR = 'data-dcu-viskip'/,
  '标记属性必须保持 data-dcu-viskip：样式注入与卸载清理共用这个名字，改名会让旧标记残留',
)
assert.ok(
  !/createElement\('div'\)/.test(virtualSkip),
  '不得插入 DOM 节点：本手法与失败方案（插 wrapper → React 感知 → 组件乱飘，已实测回滚）的分界就是 CSS-only',
)

// ── 7. 工具按钮最小高度 28px（composer-tool-menus.ts）────────────────────────
assert.match(
  menus,
  /\[class\*="_heroWorkspaceRow"\] button\{min-height:28px;border-radius:var\(--dsw-radius-full\);font-size:var\(--dsw-font-size-caption\);line-height:20px\}/,
  '工具按钮必须保持 min-height:28px（ZCode asar h-7=28px，03d-composer.md:16「完全相同」）+ 胶囊圆角走 --dsw-radius-full',
)

console.log('night-audit batch 15：7 项对齐（34 条断言）全部通过')
