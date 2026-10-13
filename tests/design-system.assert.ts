import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * 设计系统断言（2026-10-13 新增）。
 *
 * 这个文件保护的不是某个界面元素，而是**设计系统本身的制度**：
 * 字号刻度、动效意图、外来内容契约、签名细节。此前这三类问题只能靠人眼发现——
 * 例外会繁殖、动效会各写各的、第三方插件改个类名覆盖就静默失效。
 *
 * 全部断言都在源码层做，不依赖活宿主，因此可以进默认门禁。
 */

const read = (name: string): string => readFileSync(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
const tokens = read('zcode-tokens.ts')
const theme = read('zcode-theme.ts')
const sidebar = read('CodexSidebar.tsx')
const contract = read('foreign-content-contract.ts')

const clientFiles = readdirSync(new URL('../src/client', import.meta.url))
  .filter(name => /\.tsx?$/.test(name))
  .map(name => ({ name, text: read(name) }))

// ── 1. 字号刻度：展示档必须存在，且与界面档一样由基准推导 ─────────────────────
// 背景：display/headline/title 三档此前是 §3.2 的「刻度外例外」，靠登记存活。
// 例外会繁殖——一处「暂不归并」会变成后来人照抄的借口。现在它们必须真的在刻度里。
for (const [token, offset] of [['display', 20], ['headline', 8], ['title', 6]] as const) {
  assert.match(
    tokens,
    new RegExp(`'--dsw-font-size-${token}': 'calc\\(var\\(--dsw-font-size-base\\) \\+ ${offset}px\\)'`),
    `展示档 ${token} 必须以 calc 相对基准表达（基准 +${offset}px），否则「改一处即整体缩放」的性质会在版面层失效`,
  )
}

// ── 2. 界面代码里不得再有刻度外字号 ──────────────────────────────────────────
// 允许的例外只有一种：CSS `font:` 简写内的字号（见 docs/ZCODE-DESIGN.md §3.1，
// 简写里嵌 var() 会让整条声明进入待替换状态，风险高于收益）。
const strayFontSizes: string[] = []
for (const { name, text } of clientFiles) {
  if (name === 'zcode-tokens.ts') continue
  for (const match of text.matchAll(/font-size:\s*(\d+)px/g)) {
    strayFontSizes.push(`${name}: font-size:${match[1]}px`)
  }
}
assert.deepEqual(strayFontSizes, [], `界面代码不得出现刻度外字号，改用 var(--dsw-font-size-*)：${strayFontSizes.join(', ')}`)

// ── 3. 动效：五档意图令牌齐备，且减少动态效果只需一处归零 ─────────────────────
for (const intent of ['feedback', 'move', 'enter', 'exit', 'press']) {
  assert.match(theme, new RegExp(`--dcu-motion-${intent}-duration:\\d+ms`), `动效令牌缺少 ${intent} 档时长`)
  assert.match(theme, new RegExp(`--dcu-motion-${intent}-ease:cubic-bezier\\(`), `动效令牌缺少 ${intent} 档曲线`)
}
const reducedMotion = theme.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/)?.[1] ?? ''
assert.ok(
  reducedMotion.includes(':root{'),
  '减少动态效果必须在令牌层一处归零——这是令牌化的主要收益，退化成逐个元素写 transition:none 就白做了',
)
for (const intent of ['feedback', 'move', 'enter', 'exit', 'press']) {
  assert.match(reducedMotion, new RegExp(`--dcu-motion-${intent}-duration:0ms`), `减少动态效果时 ${intent} 档时长必须归零`)
}

// ── 4. 不得有未令牌化的过渡字面量（循环装饰动画除外）─────────────────────────
// 循环装饰动画（加载旋转、进度条波浪）不属于过渡规范适用范围，见 docs/ZCODE-DESIGN.md §7.1。
const strayMotion: string[] = []
for (const { name, text } of clientFiles) {
  if (name === 'zcode-theme.ts') continue
  for (const match of text.matchAll(/(?:transition|animation)[^;{}"]*\d+(?:\.\d+)?m?s\s+(?:ease[a-z-]*|linear|steps\([^)]*\))[^;{}"]*/g)) {
    if (match[0].includes('infinite')) continue
    strayMotion.push(`${name}: ${match[0].slice(0, 70)}`)
  }
}
assert.deepEqual(strayMotion, [], `过渡必须取自动效令牌，不得写死时长与曲线：${strayMotion.join(' | ')}`)

// ── 5. 外来内容契约：只覆盖锚点，且锚点失配时会响亮报警 ───────────────────────
const anchors = [...contract.matchAll(/'(\.cm-[a-z-]+)'/g)].map(match => match[1])
assert.ok(anchors.length >= 4, '外来内容契约必须登记具体的锚点类名，而不是匹配任意外来类名')

const overridden = [...new Set([...sidebar.matchAll(/\.(cm-[a-z-]+)/g)].map(match => `.${match[1]}`))]
for (const selector of overridden) {
  assert.ok(
    anchors.includes(selector),
    `侧栏覆盖了未登记的锚点 ${selector}——覆盖范围必须可审查，新增锚点要同时写进 FOREIGN_FOOTER_ANCHORS`,
  )
}
assert.doesNotMatch(
  sidebar,
  /\.dcu-foot \[class[*^|]?=?"?cm-/,
  '不得用属性通配匹配任意外来类名（覆盖范围会随对方改版漂移且无法审查）',
)
assert.match(
  sidebar,
  /auditForeignFooterContent\(footer\)/,
  '外来内容契约必须有运行时哨兵：锚点被对方改名时要报警，而不是静默失效',
)
assert.match(sidebar, /<footer ref=\{footRef\} className="dcu-foot">/, '页脚必须挂 ref，哨兵才有观察对象')

// ── 6. var(--dcu-motion-*) 引用必须命中已定义的档位 ───────────────────────────
// 令牌拼错时 CSS 不报错，只会让整条 transition 静默失效——合成页面里就量到过 0s
// （见 scripts/fixture-tokens.mjs 的说明）。这里从源头拦一次。
const definedMotion = new Set([...theme.matchAll(/--dcu-motion-([a-z]+)-(?:duration|ease):/g)].map(match => match[1]))
const usedMotion = new Set<string>()
for (const { text } of clientFiles) {
  for (const match of text.matchAll(/var\(--dcu-motion-([a-z]+)-(?:duration|ease)/g)) usedMotion.add(match[1])
}
const unknownMotion = [...usedMotion].filter(intent => !definedMotion.has(intent)).sort()
assert.deepEqual(
  unknownMotion,
  [],
  `引用了未定义的动效档位：${unknownMotion.join(', ')}（已定义：${[...definedMotion].sort().join(', ')}）`,
)

// ── 7. 签名细节：发送键的回应只用位移与明度，不引入新色 ───────────────────────
// 单色系统里没有色相可用，签名只能靠位移、明度与节奏——如果它引入了颜色，就不是这套系统的签名。
const signature = sidebar.match(/\/\* 签名细节[\s\S]*?\*\//)?.[0] ?? ''
assert.ok(signature.length > 0, '签名细节必须保留说明注释：读者要知道这处动效是有意为之，不是随手加的')
assert.doesNotMatch(signature, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, '签名细节不得引入颜色，只能用位移与明度')
assert.match(
  sidebar,
  /button\[class\$=_primary\]:active:not\(:disabled\)\{transform:scale\(\.94\)\}/,
  '发送键按下必须有回应（压到 .94 并回弹）——这是本插件唯一的签名交互',
)
assert.match(
  sidebar,
  /button\[class\$=_primary\]:hover:not\(:disabled\) svg\{transform:translateX\(1px\)\}/,
  '发送键悬停时箭头必须前倾 1px',
)
assert.match(
  sidebar,
  /button\[class\$=_primary\]\{[^}]*transition:background-color var\(--dcu-motion-feedback-duration\)[^}]*transform var\(--dcu-motion-press-duration\)/,
  '发送键的底色与按压必须分别取反馈档与按压档令牌',
)

// ── 8. 宿主锚点契约：登记全部、自检可确定的那部分 ─────────────────────────────
// 上游哈希类名改了不会报错，界面只是悄悄少一块（详见 docs/ZCODE-DESIGN.md §12）。
// 这里强制「源码里出现的每个锚点都必须登记」——新增锚点的人必须显式回答一次
// 「它能不能自检」，而不是默默加一个没人盯着的选择器。
const anchorContract = read('host-anchor-contract.ts')
const bareName = (selector: string): string | undefined => selector.match(/(_[A-Za-z][A-Za-z0-9]*)/)?.[1]

const ANCHOR_IN_SOURCE = /\[class[*^$|]?=?("|')?(_[A-Za-z][A-Za-z0-9]*)/g
const anchorsInSource = new Set<string>()
for (const { name, text } of clientFiles) {
  if (name === 'host-anchor-contract.ts') continue
  for (const match of text.matchAll(ANCHOR_IN_SOURCE)) anchorsInSource.add(match[2])
}

const checkedAnchors = new Set(
  [...anchorContract.matchAll(/'(?=\[class)([^']+)'/g)].map(match => bareName(match[1])).filter((v): v is string => v !== undefined),
)
const uncheckedAnchors = new Set(
  [...anchorContract.matchAll(/\{ anchor: '(_[A-Za-z][A-Za-z0-9]*)'/g)].map(match => match[1]),
)

assert.ok(checkedAnchors.size >= 4, `运行时自检的锚点太少（${checkedAnchors.size} 个），契约形同虚设`)
assert.ok(uncheckedAnchors.size >= 4, `未自检锚点清单应有登记（当前 ${uncheckedAnchors.size} 个）`)

const unregistered = [...anchorsInSource].filter(anchor => !checkedAnchors.has(anchor) && !uncheckedAnchors.has(anchor)).sort()
assert.deepEqual(
  unregistered,
  [],
  `源码里出现了未登记的宿主锚点：${unregistered.join(', ')}。`
  + ' 请加入 HOST_ANCHOR_GROUPS（前置条件可确定、要自检）或 UNCHECKED_HOST_ANCHORS（前置条件不确定、仅登记）',
)

// ── 9. 几何：圆角必须走令牌，不得写成字面量（2026-10-13 新增 / 同日收紧）────────
// 第一版这条写的是「值 ∈ 允许集」，那是**假断言**：把 `var(--dsw-radius-full)` 改回 `999px`
// 照样绿（评审反向推演证实）。现在改成**棘轮**：任何圆角字面量都必须在此显式登记，
// 未登记即红——包括把令牌改回字面量这种"看起来没差别"的回退。
//
// 登记口径：`文件:值 → 出现次数`。存量只允许两类：
//   · `0`    —— 语义是「没有圆角」，为它造令牌反而增加噪音
//   · `50%`  —— 几何圆（圆形状态点/旋转指示），表达的是形状而不是标度档位
// 其余 2/4/6/8/12/16px 都应走 `var(--dsw-radius-*)`——它们的令牌值与字面量完全相同，
// 迁移是零视觉变更；本轮已迁走 16px×3 与 12px×2，剩余为已量化的存量（见交付说明）。
const RADIUS_LITERAL_BASELINE: Record<string, number> = {
  'AboutSection.tsx:2px': 2,
  'AboutSection.tsx:8px': 2,
  'CodexSidebar.tsx:0': 1,
  'CodexSidebar.tsx:6px': 2,
  'CodexSidebar.tsx:8px': 9,
  'CodexWorkspaceBrowser.tsx:4px': 1,
  'CodexWorkspaceBrowser.tsx:50%': 3,
  'CodexWorkspaceBrowser.tsx:6px': 3,
  'CodexWorkspaceBrowser.tsx:8px': 9,
  'DesktopNavigationControls.tsx:50%': 1,
  'TurnNavigator.tsx:4px': 1,
  'new-conversation-style.ts:8px': 1,
  'settings-page-styles.ts:0': 1,
  'settings-page-styles.ts:8px': 6,
}
const radiusLiterals = new Map<string, number>()
for (const { name, text } of clientFiles) {
  // zcode-tokens.ts 是标度真值源，令牌的「值」当然写成字面量。
  if (name === 'zcode-tokens.ts') continue
  for (const match of text.matchAll(/border-radius:\s*([^;"'}]+)/g)) {
    const value = match[1].trim()
    if (value.startsWith('var(--dsw-radius-')) continue
    const key = `${name}:${value}`
    radiusLiterals.set(key, (radiusLiterals.get(key) ?? 0) + 1)
  }
}
const unregisteredRadii = [...radiusLiterals]
  .filter(([key, count]) => RADIUS_LITERAL_BASELINE[key] !== count)
  .map(([key, count]) => `${key}×${count}`)
assert.deepEqual(
  unregisteredRadii,
  [],
  `圆角必须走 var(--dsw-radius-*)，未登记的字面量：${unregisteredRadii.join(', ')}`
  + '（把令牌改回字面量也会在这里报红；确有理由请连同原因登记进 RADIUS_LITERAL_BASELINE）',
)
const staleRadiusBaseline = Object.entries(RADIUS_LITERAL_BASELINE)
  .filter(([key, count]) => radiusLiterals.get(key) !== count)
  .map(([key]) => key)
assert.deepEqual(
  staleRadiusBaseline,
  [],
  `圆角基线里的条目已与现状不符（已迁移或数量变了），请从 RADIUS_LITERAL_BASELINE 移除：${staleRadiusBaseline.join(', ')}`,
)
// --dsw-radius-panel 是**宿主令牌的覆盖**（宿主 :root 定义 28px 并被 Modal/设置面板/浮动面板消费），
// 删掉它会让这些表面回落到 28px。因此要求它存在，且取值落在宪章认可的容器/对话框档位内。
assert.match(
  tokens,
  /'--dsw-radius-panel': '(12|16)px'/,
  '必须保留对宿主 --dsw-radius-panel 的覆盖（删除等于把宿主对话框/面板放回 28px），取值限 12px（一级容器）或 16px（对话框）',
)

// ── 10. 焦点环不得被清掉（2026-10-13 新增）────────────────────────────────────
// ZCode 上游用全局 `outline:none!important` 清焦点环，是它自己要打 `!shadow-md` 补丁的根因，
// 不能照抄。本插件改的是焦点环消费的变量，所以必须始终留得下可见焦点。
const skin = read('zcode-skin.ts')
assert.doesNotMatch(skin, /outline:\s*(none|0)\b/, '皮肤层不得清掉焦点环——那会让键盘用户失去位置感')
assert.match(tokens, /'--dsw-focus-ring-color': '#0b7fff'/, '亮色焦点环必须取 ZCode icon-blue')
assert.match(tokens, /'--dsw-focus-ring-color': '#4099ff'/, '暗色焦点环必须取 ZCode icon-blue')

// ── 11. 减少动态效果必须停掉无限装饰动画（2026-10-13 新增）────────────────────
// 时长令牌归零管不到 `infinite` 动画：波浪与旋转会继续动。ZCode 的做法是「停静止帧」——
// 动作归零，但保留「进行中」的可读性（进度停在当前进度，而不是变回 0）。
assert.match(reducedMotion, /animation:none/, '减少动态效果必须停掉无限装饰动画（时长归零对 infinite 无效）')
assert.match(
  reducedMotion,
  /\.dcu-about-progress-fill\[data-wave=true\]\{animation:none;width:28%\}/,
  '进度波浪应停在静止帧（28%），保留「进行中」的可读性',
)
// 加载转圈（2026-10-13 复刻）：节奏与曲线是 ZCode 的锁定量，直接钉在原值上——
// 任何"再设计"（改时长、改曲线、改关键帧）都会在这里变红。定义收归主题层共享基元，
// 侧栏运行中与设置页安装中共用同一份，归零也只写一处。
assert.match(theme, /\.dcu-spin\{animation:dcu-spin 1s linear infinite\}/, '加载转圈必须锁定 ZCode 原版节奏（1s linear infinite）')
assert.match(theme, /@keyframes dcu-spin\{to\{transform:rotate\(360deg\)\}\}/, '转圈关键帧必须是 ZCode 原版的整圈旋转')
assert.match(reducedMotion, /:root:root \.dcu-spin\{animation:none\}/, '转圈在减少动态效果下必须停静止帧（图标停在原角度、不消失）')
const sessionTree = read('session-tree.tsx')
assert.match(sessionTree, /dcu-wb-running[^>]*><ZIconLoading size=\{16\} className="dcu-spin"/, '侧栏运行中指示必须消费共享转圈基元（LoaderIcon size-4）')
const aboutSection = read('AboutSection.tsx')
assert.match(aboutSection, /<ZIconLoading size=\{14\} className="dcu-spin" \/>/, '设置页安装中指示必须消费共享转圈基元')
// 图标唯一来源：宿主图标桥接模块退场后，设置区不得再出现第二套图标语言。
assert.doesNotMatch(aboutSection + sessionTree + read('ConnectorsSection.tsx') + read('ScheduleBrowser.tsx'), /OutlineMedium|host-icons/, '设置区不得再引用宿主图标（图标唯一来源 = zcode-icons）')

// 清单里登记了但源码已不再使用的锚点（改名或删除后的残留），提示清理。
const staleInventory = [...checkedAnchors, ...uncheckedAnchors].filter(anchor => !anchorsInSource.has(anchor)).sort()
assert.deepEqual(staleInventory, [], `锚点清单里有源码已不再使用的条目：${staleInventory.join(', ')}`)

// 哨兵必须真的接在应用层（挂在组件上会随组件卸载而失效）。
const clientIndex = read('index.ts')
assert.match(clientIndex, /observeHostAnchors\(\)/, '宿主锚点哨兵必须以应用级 effect 注册在 index.ts')
assert.match(clientIndex, /installThemeStyle\(\)/, '主题样式表必须由 index.ts 注入——挂在侧栏组件上会让会话区的动效令牌随侧栏卸载而消失')
assert.match(clientIndex, /syncZCodeTheme\(\)/, '主题镜像必须以应用级 effect 注册在 index.ts')
assert.doesNotMatch(
  sidebar,
  /syncZCodeTheme|ZCODE_THEME_STYLE/,
  '侧栏不得再承担主题职责（它只是主题的消费者之一，会话区的轮次导航与页签滑块同样依赖 :root 令牌）',
)

// ── 13. 模板串抽取不得被截断（2026-10-13 新增 / 同日补尾标记）──────────────────
// 布局脚本与断言都靠正则从源码里抽 `const X = <反引号>…<反引号>` 的内容。CSS 注释里一旦出现
// **成对**的反引号，模板串会被提前闭合又重开：**tsc 未必报错**，但抽出来的 CSS 会缺一大截，
// 于是所有基于抽取的断言都在测空靶（本仓库已因此踩坑三次：主题层两次截断 + 侧栏色板一次）。
// 这里对**抽取结果本身**做校验——原文里有 `--dcu-*` 不等于抽出来还有。
//
// ⚠ 只校验"前中部有标志串"是不够的：截断恰好发生在尾部时，前中部的标志串仍在，断言照样绿。
// 因此每条都补一个**尾标记**（模板最后一条声明或收尾字符）。
const extractedTheme = theme.match(/export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)?.[1] ?? ''
assert.ok(
  extractedTheme.includes('--dcu-motion-feedback-duration:120ms'),
  'ZCODE_THEME_STYLE 的抽取内容必须含动效令牌——被反引号截断时这里会失败（注释里不要写反引号）',
)
assert.ok(
  extractedTheme.includes('--dcu-sidebar-primary'),
  'ZCODE_THEME_STYLE 的抽取内容必须含侧栏色板——被截断时侧栏文字会全部回退成黑色',
)
assert.ok(
  extractedTheme.includes('--dcu-focus:#4099ff') && extractedTheme.trimEnd().endsWith('}'),
  'ZCODE_THEME_STYLE 的抽取内容必须延伸到模板末尾（含暗色块的收尾）——只校验前中部会漏掉尾部截断',
)
const extractedStructure = skin.match(/const STRUCTURE_CSS = `([\s\S]*?)`/)?.[1] ?? ''
assert.ok(
  extractedStructure.includes(':root:root body{color-scheme:light}'),
  'STRUCTURE_CSS 的抽取内容必须含 color-scheme 规则——被截断时该规则静默消失',
)
assert.ok(
  extractedStructure.trimEnd().endsWith(':root:root body[data-ds-dark-theme]{color-scheme:dark}'),
  'STRUCTURE_CSS 的抽取内容必须延伸到**最后一条声明**（尾标记）——截在中段时前一条仍会绿',
)

// ── 9. 皮肤信封与外来表面发现 ────────────────────────────────────────────────
// 目标：让「将来加入的任何插件」不靠枚举类名也能收敛。信封管继承属性（字体/盒模型），
// 发现哨兵管剩下的（报不达标的外来根）。两边都必须真的接上线。
const envelope = read('skin-envelope.ts')
const discovery = read('foreign-surface-discovery.ts')
const indexSource = read('index.ts')

for (const surface of ['.dcu-root', '.dcu-settings-page', '.dcu-home', '[data-conversation-scroll]']) {
  assert.ok(envelope.includes(surface), `信封未覆盖表面 ${surface}——外来内容落在那里就不受约束`)
}
assert.match(envelope, /font-family:var\(--dsw-font-family\)/, '信封必须在表面上设字体（继承属性，后代自动跟随）')
assert.match(envelope, /box-sizing:border-box/, '信封必须统一盒模型（box-sizing 不继承，需逐元素）')
// 表单控件字体不继承（UA 显式设定），必须用零特异性 :where() 归一：
// 任何作者样式都能覆盖我们、只有 UA 会被压过——裸控件跟随皮肤，插件的有意设定胜出。
assert.match(envelope, /:where\(\$\{SURFACE_LIST\}\) :where\(button,input,select,textarea\)/, '表单控件归一必须用零特异性 :where()（插件自己的字体声明必须仍能胜出）')
assert.match(envelope, /\$\{FORM_CONTROLS\}\{font:inherit\}/, '表单控件字体必须归一成继承（裸控件跟随皮肤）')
// 信封**不得**碰外来内容的字号/颜色/圆角——越过这条线就是"修复别人的组件"。
assert.doesNotMatch(envelope, /font-size|color:|border-radius/, '信封不得规定字号/颜色/圆角，那是外来内容的功能结构与语义')

// 契约锚点必须全部登记为已知外来根，否则哨兵会把已收敛的插件当未知重复报。
for (const prefix of ['cm']) {
  assert.match(discovery, new RegExp(`prefix: '${prefix}'`), `${prefix} 已在 foreign-content-contract 收敛，必须登记进 KNOWN_FOREIGN_ROOTS`)
}
// 等宽判定必须看计算字体：哈希类名里没有 code/mo no 字样，靠类名必漏（实测误报过）。
assert.match(discovery, /isMono = \/mono\|menlo\|consolas\|courier\/i\.test/, '等宽语境必须按计算字体判定')
// 自动检测**不得**对外来内容的背景底色下结论：有白底不等于错（浮层/菜单本该有底），
// 这是设计判断，实测它把白底浮层全误报了。
assert.doesNotMatch(discovery, /不透明底色/, '发现机制不得对背景底色下结论（那是设计判断，不是可自动判定的缺陷）')
assert.match(indexSource, /observeForeignSurfaces\(\)/, '外来表面发现哨兵必须以应用级 effect 注册')
