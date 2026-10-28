import assert from 'node:assert/strict'
import ts from 'typescript'
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

/**
 * 客户端文件清单：**递归**扫 `src/client`，包含 `.ts` / `.tsx` / `.css`。
 *
 * ⚠ 2026-10-18（第三轮复核 R6）：首版用非递归 `readdirSync` + 只收 `.tsx?$`，
 * 于是 `src/client/widgets/panel.ts` 或 `src/client/panel.css` 里的 `#ff0000`
 * 完全不在射程内 —— 而 tsc 会编译 `src` 下的子目录。任何人建个子目录放组件，
 * 就绕过了全部颜色与样式守卫。改成递归后这个绕过面消失。
 */
const CLIENT_ROOT = new URL('../src/client', import.meta.url)
const collectClientFiles = (dir: URL, prefix: string): { name: string, text: string }[] => {
  const out: { name: string, text: string }[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // 拼在父目录下：目录补 `/`，文件名直接接上（URL 基址必须以 / 结尾才按目录解析）。
    const base = dir.href.endsWith('/') ? dir : new URL(dir.href + '/')
    const childUrl = new URL(encodeURIComponent(entry.name) + (entry.isDirectory() ? '/' : ''), base)
    const childName = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...collectClientFiles(childUrl, childName))
    else if (/\.(?:ts|tsx|css)$/.test(entry.name)) out.push({ name: childName, text: readFileSync(childUrl, 'utf8') })
  }
  return out
}
const clientFiles = collectClientFiles(CLIENT_ROOT, '')

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

// ⚠ 必须**先剥掉注释**再扫：2026-10-16 实测，覆盖样式的注释里为了说明「哪条外来规则
// 的特异性更高」而提到了 .cm-peak-high 等类名，被这条断言当成"覆盖了未登记的锚点"报红。
// 注释不是覆盖——它选不中任何元素。（同一个「正则扫全文」的坑在本仓库出现过多次：
// 间距棘轮也曾把注释里的 gap:22px 当真声明。）
const sidebarDeclarations = sidebar.replace(/\/\*[\s\S]*?\*\//g, '')
const overridden = [...new Set([...sidebarDeclarations.matchAll(/\.(cm-[a-z-]+)/g)].map(match => `.${match[1]}`))]
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
// 其余 2/4/6/8/12/16px 都必须走 `var(--dsw-radius-*)`——它们的令牌值与字面量完全相同，
// 迁移是零视觉变更。
//
// 2026-10-14（本轮）：把剩余的 35 处标度内字面量全部迁到令牌，基线相应清空，
// 只留下三类**不是标度档位**的形状值：`0`（无圆角）、`50%`（几何圆）、
// `999px`（胶囊开关轨道——半高全圆是开关的形状语义，见 settings-page-styles.ts）。
// 现在这条棘轮的含义从「不许劣化」升级为「标度内不得再出现字面量」。
const RADIUS_LITERAL_BASELINE: Record<string, number> = {
  'CodexSidebar.tsx:0': 1,
  'CodexWorkspaceBrowser.tsx:50%': 3,
  'DesktopNavigationControls.tsx:50%': 1,
  'settings-page-styles.ts:0': 1,
  // 999px 是胶囊开关轨道（半高全圆是开关的形状语义，不是圆角标度上的档位）；
  // 50% 是圆形拇指。两者均随 --dsw-alias-* 令牌走配色，几何形状本身保持字面量。
  'settings-page-styles.ts:999px': 1,
  'settings-page-styles.ts:50%': 1,
  // 2026-10-28 03i 搜索输入胶囊：rounded-full 是「全圆形状」语义（同 999px 先例）
  'CodexSidebar.tsx:9999px': 1,
  // 2026-10-28 D1 围栏码卡扁平化：`.md-code-block` 与其 banner 同为 0——
  // ZCode 码卡无圆角（`border border-border bg-card`，无 rounded 类）。
  // （G17 用户气泡已按 ZCode 实测改回 var(--dsw-radius-*) 标度，不再占字面量额度。）
  'conversation-layout.ts:0': 2,
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
assert.match(sessionTree, /dcu-wb-running[^>]*><ZIconLoading size=\{14\} className="dcu-spin"/, '侧栏运行中指示必须消费共享转圈基元（LoaderIcon size-3.5，与 ZCode task-row 一致）')
const aboutSection = read('AboutSection.tsx')
assert.match(aboutSection, /<ZIconLoading size=\{14\} className="dcu-spin" \/>/, '设置页安装中指示必须消费共享转圈基元')
// 状态槽的三个分支必须都能被读出（2026-10-14 补）。
// 光秃的 `<span aria-label>` 是无效的：span 映射到 `generic` 角色，而 ARIA 1.2 对
// generic 的规定是「Name From: prohibited」——标签会被直接忽略。必须显式给 role。
// 运行中此前是 `aria-hidden="true"` 且无文本替代：视觉用户看得到转圈，
// 屏幕阅读器用户得到零信息，而这是并发多会话场景最需要的状态之一。
assert.match(sessionTree, /dcu-wb-unread" role="img" aria-label=\{t\('sessions\.unread'\)\}/, '未读点必须带 role="img" 才有可访问名（generic 角色的 aria-label 被 ARIA 1.2 禁止）')
assert.match(sessionTree, /dcu-wb-running" role="img" aria-label=\{t\('sessions\.running'\)\}/, '运行中必须对辅助技术可见')
assert.doesNotMatch(sessionTree, /dcu-wb-running" aria-hidden/, '运行中不得再对辅助技术隐藏')
assert.match(sessionTree, /dcu-wb-pending-label">\{label\}/, '待处理胶囊的可访问名由可见文本提供（不靠 generic 上的 aria-label）')
const localesSource = read('locales.ts')
assert.match(localesSource, /'sessions\.running': '运行中'/, '运行中必须提供中文文案')
assert.match(localesSource, /'sessions\.running': 'Running'/, '运行中必须提供英文文案')
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
  extractedTheme.includes('--dcu-motion-feedback-duration:150ms'),
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

// 13c. **已删除**：通用模板串守卫（2026-10-16 新增 → 2026-10-18 移除）
//
// 它曾用字符扫描（`/=\s*`/g` + `indexOf` 找闭合 + 花括号配平）覆盖全部客户端文件，
// 用来抓"注释里的反引号把模板串提前闭合"。当时的理由是：逐文件的 13/13b 只能抓住
// 恰好被校验过的那几个文件。
//
// 2026-10-18 移除，原因有三：
//   ① **职责已被 §26 的 AST 版接管**：`ts.createSourceFile` 直接按语法节点取模板串，
//      转义反引号不再构成截断问题，"注释里的反引号"这个风险类别被结构性消除。
//   ② 它开始**误杀合法代码**：AST 版下 `font-family:\`SF Mono\`` 是完全合法的写法，
//      但 §13c 数花括号时会把转义反引号之后的内容丢掉，报"花括号不配平"。
//      实测第三轮复核用它误判 via `export const _ = \`.dcu-mono{font-family:\`SF Mono\`,...}\``。
//   ③ 它对字符串里的反引号仍然失明（`const H = "用 \` 包裹"` 会让整段错位），
//      所以留着它既不能补足覆盖，又会指错方向 —— 复核员一开始就被它误导，
//      以为 §26 抓到了，实际是 §13c 在报。
//
// 保留一条极廉价的兜底：`COMPOSER_TOOL_MENU_STYLE` 这类**被构建期提取**的串必须可提取
// （由下面 13b 与 §26 的登记表共同保证）。


// 13b. 样式表抽取必须按**变量名**取，且首条必须是一条 CSS 规则（2026-10-14）
// 2026-10-14 给 settings-page-styles.ts 补了含反引号的文件头注释后，三个用
// indexOf 找第一个反引号的布局脚本从**注释正文**开始切，量到设置页宽 1264 ≠ 1280、
// 标题栏安全区断言假失败。那几个脚本已改成变量名正则，但那只修了结果、不防复发。
// 这里双保险：按变量名抽 + 检首条必须是 .dcu-settings-page{ ——文件头再出现反引号、
// 或变量被改名，首条就不再是规则，立即变红。
const settingsPageStyle = read('settings-page-styles.ts')
  .match(/(?:export )?const settingsPageStyles = `([\s\S]*?)`/)?.[1] ?? ''
assert.ok(
  settingsPageStyle.trimStart().startsWith('.dcu-settings-page{'),
  'settingsPageStyles 的抽取内容必须以 .dcu-settings-page{ 开头——文件头注释里不得出现反引号（indexOf 会从注释开始切）',
)
assert.ok(
  settingsPageStyle.includes('--sp-muted-on-card'),
  'settingsPageStyles 的抽取内容必须含卡片档次要色（--sp-muted 与卡片底同用会掉到 4.38:1）',
)
// 关键守卫：**文件里第一个反引号必须就是模板串的起始反引号**。
// 上面那条用变量名正则，文件头有反引号也能抽对——但另外几个布局脚本用的是
// 「找第一个反引号」，它们会从注释正文开始切。所以必须直接断言这个位置关系，
// 否则本文件头的注释迟早又会把别人带偏一次。
const settingsPageSource = read('settings-page-styles.ts')
const firstBacktick = settingsPageSource.indexOf('`')
const templateOpen = settingsPageSource.indexOf('const settingsPageStyles = `')
assert.ok(firstBacktick !== -1 && templateOpen !== -1, '必须能在 settings-page-styles.ts 里定位模板串')
assert.equal(
  firstBacktick,
  templateOpen + 'const settingsPageStyles = '.length,
  'settings-page-styles.ts 的第一个反引号必须是 settingsPageStyles 模板串的起始——文件头注释里出现反引号会让 indexOf 式切片从注释正文开始',
)

// ── 21. 设置页 --sp-* 不得再复制宿主色值（2026-10-14 新增）─────────────────────
// 背景：KNOWN-ISSUES §22.3 登记的「--sp-* 与 --dcu-* 两套并行命名空间」。
// 逐项核对后用真实 Chromium 比对 computed value，确认其中 6 个与宿主语义令牌**逐一相等**
// （bg-base / settings-card-fill / border-l2 / label-primary / interactive-bg-hover /
// dcu-sidebar-selected），即它们只是宿主令牌的复制品。复制品会漂移：宿主换色板时
// 设置页不跟随，而且没有任何报错。现改为引用宿主令牌。
//
// 棘轮口径：这 6 个角色**必须**以 var() 引用宿主令牌；只有 -sp-muted / -sp-muted-on-card
// 允许保留字面量——静态色阶在明暗之间反向（static-500 亮色 #8f8f8f、暗色 #5c5c5c），
// 按档位引用会拿到相反的值，故它们令牌化不了。新基线若要把这两个也令牌化，
// 必须先证明明暗两套计算值不变（见交付说明里的 Chromium 比对脚本）。
for (const [role, hostToken] of [
  ['--sp-bg', '--dsw-alias-bg-base'],
  ['--sp-card', '--dsw-alias-settings-card-fill'],
  ['--sp-border', '--dsw-alias-border-l2'],
  ['--sp-text', '--dsw-alias-label-primary'],
  ['--sp-hover', '--dsw-alias-interactive-bg-hover'],
  ['--sp-active', '--dcu-sidebar-selected'],
] as const) {
  assert.match(
    settingsPageStyle,
    new RegExp(`${role}:var\\(${hostToken}[,)]`),
    `${role} 必须引用宿主令牌 ${hostToken}，不得复制其色值（复制品会在宿主换色板时静默漂移）`,
  )
}
assert.match(
  settingsPageStyle,
  /--sp-muted-on-card:/,
  '--sp-muted-on-card 必须存在：卡片内次级文字与页面级次级文字是两档（共用会掉到 4.38:1）',
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

// ── 14. 焦点环必须单一来源、且不得用低透明度颜色（2026-10-14 新增）────────────
// 背景：一次 UI 审查实测到两件事。
//  ① 焦点环颜色同仓并存 6 种来源（--dcu-focus / --dsw-alias-button-info-fill /
//     --dsw-alias-state-business-primary / --dsw-alias-label-primary / --sp-muted /
//     --dsw-alias-state-success-primary），其中**绿色成功色**被当作焦点环，焦点与
//     「已安装」两种语义撞色；--sp-muted 是**文字色**，被当成环用。
//  ② 工具菜单过滤框的焦点环是 `color-mix(… 20%, transparent)` 的 1px 内环——
//     20% alpha 的环**数学上不可能达到 3:1**（实测上限亮色 1.61:1 / 暗色 1.91:1，
//     即使基准色取纯黑/纯白），键盘用户看不到焦点在哪。
// 设计依据：ZCODE-DESIGN.md §9.1 明确「唯一允许出现色相的地方是状态色与**焦点环**」，
// 所以焦点环走宿主一等令牌 --dsw-focus-ring-color（亮 #0b7fff / 暗 #4099ff，
// 在侧栏/页面/卡片三种底色上 3.35–6.22:1）是合规的，且它已是设置页原有取值。
const FOCUS_RING_TOKEN = 'var(--dsw-focus-ring-color,var(--dcu-focus))'
// 按「选择器 + 声明体」成对抽取焦点规则——只看声明会漏掉 box-shadow 形式的环。
const focusRules = clientFiles.flatMap(({ name, text }) =>
  [...text.matchAll(/([^{}]*:focus(?:-visible|-within)?[^{}]*)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    name,
    sel: sel.trim().replace(/\s+/g, ' '),
    body,
  })),
)
/** 焦点规则里的「环」声明：outline / box-shadow 中带颜色的那条。 */
const ringDecls = focusRules.flatMap(rule =>
  [...rule.body.matchAll(/(?:outline|box-shadow)\s*:[^;]*/g)]
    .map(([decl]) => ({ ...rule, decl: decl.trim() }))
    .filter(({ decl }) => /var\(--|color-mix|#|rgb/.test(decl)),
)
// A. 环颜色只允许 --dsw-focus-ring-color。其余令牌（尤其是状态色、文字色）一律是语义/角色错配。
const ringTokenOffenders = ringDecls
  .filter(({ decl }) => !/--dsw-focus-ring-color|--dcu-focus/.test(decl))
  .map(({ name, sel, decl }) => `${name} → ${sel} { ${decl} }`)
assert.deepEqual(
  ringTokenOffenders,
  [],
  `焦点环颜色必须只取 ${FOCUS_RING_TOKEN}，以下声明用了其它令牌：\n${ringTokenOffenders.join('\n')}`,
)
// B. 环不得是低透明度颜色：alpha < 60% 的环在两种主题下都不可能达到 3:1。
// 例外：同一条规则里另有实色指示（border-color / outline 实色）时，低透明度的只是叠加光晕。
const lowAlphaOnly = ringDecls
  .filter(({ decl }) => /color-mix\([^)]*?\b([0-5]?\d)%/.test(decl))
  .filter(({ body }) => !/(?:border-color|outline)\s*:\s*[^;]*(?:var\(--|#|rgb)[^;]*/.test(body.replace(/(?:outline|box-shadow)\s*:[^;]*/g, '')))
  .map(({ name, sel, decl }) => `${name} → ${sel} { ${decl} }`)
assert.deepEqual(
  lowAlphaOnly,
  [],
  `焦点环不得用低透明度颜色（实测 20% 环上限仅亮色 1.61:1 / 暗色 1.91:1，达不到 3:1）：\n${lowAlphaOnly.join('\n')}`,
)
assert.doesNotMatch(
  read('AboutSection.tsx'),
  /focus-visible\{outline:2px solid var\(--dsw-alias-state-success-primary\)/,
  '焦点环不得挪用成功色（绿色在本仓表示「已安装」，与焦点语义撞色）',
)

// ── 15. 状态色必须分「填充档 / 文字档」（2026-10-14 新增）──────────────────────
// Zai 的 --dsw-alias-state-* 是按**填充**用途推导的：#e03131 / #1e8a3e / #e07b00。
// 作小字用时亮色档全部不达 WCAG AA（实测 2.63 / 2.82 / 3.34 / 4.15 / 4.25:1），
// 而 §10.2 外来内容契约第 4 条恰恰明令第三方插件「语义色只约束填充，不得用于文字」。
// 这里锁住分档本身：文字必须走 --dcu-state-*-text，填充档仍可保留 Zai 原值。
assert.match(theme, /--dcu-state-success-text:#176c31;--dcu-state-error-text:#b3261e;--dcu-state-warn-text:#8a4b00;/, '亮色状态色文字档必须是按实际底色重取的值（≥4.5:1）')
assert.match(theme, /--dcu-state-success-text:#46bf72;--dcu-state-error-text:#ff5c5c;--dcu-state-warn-text:#ff8a30;/, '暗色状态色文字档必须定义（暗色沿用 Zai 原值即达标）')
// 错误底按钮的悬停方向必须随主题相反——旧实现两档一律变亮，实测亮色 3.91:1 / 暗色 3.93:1 双双掉线。
assert.match(theme, /--dcu-state-error-fill-hover:#c52b2b;/, '亮色错误底按钮悬停必须**变暗**（前景是白，变亮会掉到 3.91:1）')
assert.match(theme, /--dcu-state-error-fill-hover:#ff7070;/, '暗色错误底按钮悬停必须**变亮**（前景是深色，变暗会掉到 3.68:1）')
// 状态色作文字处不得回退到填充档令牌。
const stateTextOffenders = clientFiles
  .filter(({ text }) => /[^-]color:var\(--dsw-alias-state-(?:success|error|warn|warning)-[a-z-]+\)/.test(text))
  .map(({ name }) => name)
assert.deepEqual(
  stateTextOffenders,
  [],
  `以下文件把状态色**填充档**当文字色用（亮色档不达 4.5:1，应用 --dcu-state-*-text）：${stateTextOffenders.join(', ')}`,
)

// ── 16. 浮层表面不得硬编码底色（2026-10-14 新增）──────────────────────────────
// 2026-10-14 前，输入区工具菜单与 Git 弹窗的底色是 `background:#fff!important`、
// 投影是 `#0002` / `#0000000a`，另有一条 `body[data-ds-dark-theme] …{background:#2b2b2b}`
// 暗色补丁。硬编码 + 补丁意味着：改一次主题要改三处，且补丁与主规则值容易漂移。
// 现在统一走 --dcu-tip-bg / --dcu-tip-shadow（见 zcode-theme.ts 的 :root 段）。
// 只查**声明行**：先把 CSS 注释整体剥掉再扫。按「行是否以 * 开头」过滤是不可靠的——
// 注释续行常常不以星号开头（本仓 2026-10-14 正好这样误报过一次）。
const toolMenuStyle = read('composer-tool-menus.ts')
const toolMenuDeclarations = toolMenuStyle.replace(/\/\*[\s\S]*?\*\//g, '')
const hardcodedSurface = toolMenuDeclarations
  .split('\n')
  .filter((line: string) => /(?:background|box-shadow)\s*:[^;]*#[0-9a-fA-F]{3,8}/.test(line))
assert.deepEqual(hardcodedSurface, [], `浮层表面不得硬编码颜色（应走 --dcu-tip-bg / --dcu-tip-shadow）：\n${hardcodedSurface.map(l => l.trim().slice(0, 120)).join('\n')}`)
assert.match(toolMenuStyle, /background:var\(--dsw-specific-menu,var\(--dcu-tip-bg\)\)/, '工具菜单底色必须宿主菜单令牌优先、自家浮层色兜底')
assert.match(toolMenuStyle, /backdrop-filter:var\(--dsw-menu-backdrop-filter,none\)/, '必须保留宿主菜单的毛玻璃（不再用 !important 抹掉）')
assert.match(toolMenuStyle, /box-shadow:var\(--dcu-tip-shadow\)/, '菜单投影必须取 --dcu-tip-shadow')
// 浮层三件套必须挂在 :root：菜单经 portal 渲染到 body，挂在侧栏作用域上 var() 会静默失效。
assert.match(theme, /:root\{[^}]*--dcu-tip-bg:#f0f0f0/, '浮层底色令牌必须挂在 :root（portal 到 body 的表面才取得到）；2026-10-28 03m 浅色 #f0f0f0=ZCode tooltip 实测')
assert.match(theme, /body\[data-ds-dark-theme\][^}]*--dcu-tip-bg:#2b2b2b/, '暗色下浮层底色必须重取（不能靠亮色值 + 补丁）')

// ── 17. 合成夹具必须按 modality 注入令牌（2026-10-14 新增）────────────────────
// `zcode-tokens.ts` 里 ZCODE_LIGHT / ZCODE_DARK 是同名令牌的两份定义。旧 fixture-tokens
// 把两份一起塞进同一个 :root，于是**暗色恒胜**——亮色趟也拿暗色令牌，且 `--dsw-alias-bg-layer-3`
// 这种前景色会让对比度算出「物理上不可能」的数（#2b2b2b on #ff5c5c = 1.19:1）。
// 见 docs/KNOWN-ISSUES.md §12.3 #2。
const fixtureTokens = readFileSync(new URL('../scripts/fixture-tokens.mjs', import.meta.url), 'utf8')
assert.match(fixtureTokens, /export const ZCODE_DARK/, 'fixture-tokens 必须按 ZCODE_DARK 切分明暗两份令牌')
assert.match(fixtureTokens, /fixtureTokenStyle = \(modality = 'light'\)/, 'fixtureTokenStyle 必须接受 modality 参数（默认 light）')
// 覆盖全部**在门禁布局链里**的令牌消费方。verify-session-coarse-actions 今天只测几何，
// 但一并纳入：它显式传 'light'，将来若有人在这里加颜色断言，modality 契约已经就位。
for (const caller of ['verify-a11y-and-overflow.mjs', 'verify-composer-style.mjs', 'verify-new-conversation.mjs', 'verify-composer-tools.mjs', 'verify-session-coarse-actions.mjs', 'verify-state-shells.mjs']) {
  const text = readFileSync(new URL(`../scripts/${caller}`, import.meta.url), 'utf8')
  // 允许的形态：直接传三元、传字面量、或包一层「modality 透传」的辅助函数
  // （a11y 的 cssFor / composer-tools 的 tokenStylesFor 都是后者）。
  assert.ok(
    /fixtureTokenStyle\((?:dark|modal) \? 'dark' : 'light'\)/.test(text)
      || /fixtureTokenStyle\('light'\)/.test(text)
      || /fixtureTokenStyle\(modal\)/.test(text),
    `${caller} 必须按主题态注入令牌（fixtureTokenStyle 不再默认暗色）`,
  )
}
// 背景：此前侧栏**声明**了 tree/treeitem，但没有方向键、每个 treeitem 都写死
// tabIndex={0}（100 个会话 = 100 次 Tab）、没有 aria-level、treeitem 的归属还被
// 纯结构 div 夹断。声明了更强的语义却不兑现，比不声明更差——辅助技术按树呈现，
// 用户按树操作，然后失败。这里锁住「声明必须与实现一致」。
// ── 18. role="tree" 必须兑现树的契约（2026-10-14 新增）──────────────────────
// 背景：此前侧栏**声明**了 tree/treeitem，但契约一条都没兑现——没有方向键、
// 每行写死 tabIndex={0}、没有 aria-level、treeitem 归属被纯结构层夹断。
// 声明更强的语义却不兑现，比不声明更差：辅助技术按树呈现，用户按树操作，然后失败。
const treeKeyboard = read('tree-keyboard.ts')
const workspaceBrowserSource = read('CodexWorkspaceBrowser.tsx')
assert.match(workspaceBrowserSource, /role="tree"/, '侧栏必须声明 role="tree"')
assert.match(workspaceBrowserSource, /installTreeKeyboard\(tree\)/, '声明了 role="tree" 就必须安装键盘模型（tree-keyboard）')
for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
  assert.ok(treeKeyboard.includes(`'${key}'`), `树键盘模型必须处理 ${key}（树的全部意义就是一个 Tab 站 + 方向键遍历）`)
}
assert.match(treeKeyboard, /item\.tabIndex = -1/, 'roving tabindex：非活动项必须置 -1')
assert.match(treeKeyboard, /item\.setAttribute\('aria-level'/, 'treeitem 必须写 aria-level（ARIA 必填属性）')
assert.match(treeKeyboard, /setAttribute\('role', 'presentation'\)/, '纯结构包裹层必须标为 presentation，否则 treeitem 的归属被打断')
// 只观察 childList：本模块自己要写 aria-level / role / tabindex，
// 若观察 attributes 就会自触发（相同值的 setAttribute 同样触发属性观察器，本仓库踩过）。
assert.match(treeKeyboard, /observer\.observe\(root, \{ childList: true, subtree: true \}\)/, '观察器必须只观察 childList，不得观察 attributes（会自触发成死循环）')
// 结构层：折叠体必须是 group，否则其中的 treeitem 归属不成立。
assert.match(workspaceBrowserSource, /<DisclosureBody className="dcu-wb-project-body" open=\{isExpanded\} role="group">/, '项目折叠体必须是 role="group"')
assert.match(workspaceBrowserSource, /className="dcu-wb-section-body" role="group"/, '分区体必须是 role="group"')
// 行内不得写死 tabIndex={0}（那会把全树每一行都塞进 Tab 序列）。
// 只看 .tsx：tree-keyboard.ts 的注释里就引用了这个写法，扫 .ts 会自指误报。
const hardcodedTabStops = clientFiles
  .filter(({ name, text }) => name.endsWith('.tsx') && /role="treeitem"[^>]*tabIndex=\{0\}/.test(text))
  .map(({ name }) => name)
assert.deepEqual(hardcodedTabStops, [], `以下文件给 treeitem 写死了 tabIndex={0}（应由 tree-keyboard 的 roving 管理）：${hardcodedTabStops.join(', ')}`)

// ── 22. 搜索弹窗的键盘与 ARIA 契约必须可守护（2026-10-14 新增）────────────────
// 背景：宿主在 window 上先注册了 Escape/方向键处理器，插件若把键盘监听挂在**冒泡相**，
// 宿主会先吃掉事件——活宿主实测「按 Escape 关不掉弹窗，用户被困在弹窗里」。
// 修复是挂捕获相。但这条知识此前只写在源码注释里，没有任何断言守护：
// 有人把 `true` 去掉、或把监听挪回 React 的 onKeyDown，测试不会变红，坑会原地复发。
//
// 断言锁的是**契约**（有 Escape 关闭 + 有方向键漫游 + 有 dialog 语义 + 捕获相），
// 不是具体实现写法。真机行为另由 verify-settings-exit / verify-compat-host 覆盖。
// 注意切片起点：样式表里也有 .dcu-search-scrim（CSS 规则），必须从 **JSX** 里取。
// JSX 中出现的是 className="dcu-search-scrim"（带引号），样式表里是裸选择器 .dcu-search-scrim，
// 故按 className 定位，避免又切到 CSS 上去（这一版第一稿就切错了，被断言自己拦下）。
// ARIA 契约在 JSX 里；键盘契约在它上方的 useEffect 里，两者位置不同，分别定位。
const searchDialogRegion = sidebar.slice(
  sidebar.indexOf('className="dcu-search-scrim"'),
  sidebar.indexOf('className="dcu-search-scrim"') + 2600,
)
const searchKeyHandler = sidebar.slice(
  sidebar.indexOf('const onKeyDown = (event: KeyboardEvent)'),
  sidebar.indexOf('const onKeyDown = (event: KeyboardEvent)') + 1200,
)
assert.match(searchDialogRegion, /role="dialog"/, '搜索弹窗必须声明 role="dialog"（否则辅助技术只看到一个普通容器）')
assert.match(searchDialogRegion, /aria-modal="true"/, '模态弹窗必须标 aria-modal="true"')
assert.match(searchDialogRegion, /aria-label=/, '弹窗必须有可访问名（标签来自本地化文案，不得是硬编码英文）')
assert.match(
  searchKeyHandler,
  /event\.key === 'Escape'[\s\S]{0,120}?close\(\)/,
  '搜索弹窗必须能用 Escape 关闭（真机上曾因监听相错误而关不掉）',
)
for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) {
  assert.ok(searchKeyHandler.includes(`'${key}'`), `搜索弹窗必须处理 ${key}（键盘用户要能在结果间移动并确认）`)
}
// 捕获相是修复的核心：冒泡相会被宿主的窗口级处理器抢先拦截。
assert.match(
  sidebar,
  /addEventListener\('keydown', onKeyDown, true\)/,
  '搜索弹窗的键盘监听必须挂**捕获相**（第三个参数 true）——挂冒泡相会被宿主的窗口级处理器拦截，Escape 关不掉弹窗',
)
assert.match(
  sidebar,
  /removeEventListener\('keydown', onKeyDown, true\)/,
  '捕获相监听必须在卸载时用同样的捕获相移除，否则监听器泄漏',
)
// 关闭时必须把焦点还给触发点，否则键盘用户的落点丢在 body 上。
assert.match(searchDialogRegion, /autoFocus/, '弹窗打开必须把焦点移入（键盘用户不应还需自己找输入框）')

// ── 20. 断点必须收归单一真源，且同一区域不得用两个相邻阈值（2026-10-14 新增）──
// 背景：ZCode DESIGN.md「Responsive Behavior」要求「Start with a stable base layout,
// then enhance with breakpoints」并给出 sm/md/lg/xl/2xl 的角色表。本插件此前是 7 个散落的
// `max-width` 字面量（480/600/639/640/720/760/900），其中 **639 与 640 分属两个文件却管
// 同一块 composer 区**（一个设阴影、一个隐藏历史提示），中间存在 1px 的不一致窗口：
// 那个窗口里阴影已按窄屏加强、提示却还没隐藏。这是同一个区域被两个阈值切成两半，
// 不是两个断点。
//
// 为什么不做成 CSS 变量令牌：**CSS media query 不支持 var()**，
// 而布局夹具是用正则从源码模板串里抽 CSS 的（见 §19），引入 ${} 插值会让夹具抽到变量名。
// 因此断点的可执行形式与圆角（§9）一致：**注册表 + 棘轮**，而不是令牌。
//
// 登记口径：`阈值 -> 用途`。新增断点必须在此登记；同一阈值若被两个文件用于同一区域，
// 必须合并为一个值（下方 duplicate-window 断言负责拦截）。
const BREAKPOINT_BASELINE: Record<number, string> = {
  480: '关于页：依赖行换行（窄栏极限）',
  600: '设置页：单列栅格 + 导航横排',
  640: 'composer：窄屏收窄阴影 + 隐藏历史提示（原 639/640 合并）',
  720: '关于页：标题行换行',
  760: '轮次导航：摘要浮层收窄',
  900: '设置页：标题块转纵向',
}
const breakpointHits = new Map<number, string[]>()
for (const { name, text } of clientFiles) {
  for (const match of text.matchAll(/@media\s*\(\s*max-width:\s*(\d+)px\s*\)/g)) {
    const px = Number(match[1])
    breakpointHits.set(px, [...(breakpointHits.get(px) ?? []), name])
  }
}
const unregisteredBreakpoints = [...breakpointHits.keys()]
  .filter(px => BREAKPOINT_BASELINE[px] === undefined)
  .sort((a, b) => a - b)
assert.deepEqual(
  unregisteredBreakpoints,
  [],
  `出现未登记的 viewport 断点：${unregisteredBreakpoints.map(px => `${px}px`).join(', ')}`
  + '（新断点请连同用途登记进 BREAKPOINT_BASELINE；若与已有断点管同一区域，应复用而不是新增）',
)
const staleBreakpoints = Object.keys(BREAKPOINT_BASELINE)
  .map(Number)
  .filter(px => !breakpointHits.has(px))
  .sort((a, b) => a - b)
assert.deepEqual(
  staleBreakpoints,
  [],
  `断点基线里的条目已不存在，请从 BREAKPOINT_BASELINE 移除：${staleBreakpoints.map(px => `${px}px`).join(', ')}`,
)
// 相邻 1px 的断点对是「同一区域被切成两半」的典型形态：真实布局阈值不会需要 639/640
// 这种区分（设备像素宽度差 1px 不构成布局分界）。此断言把这类重复挡在门外。
const adjacentPairs: string[] = []
const sortedBreakpoints = [...breakpointHits.keys()].sort((a, b) => a - b)
for (let i = 1; i < sortedBreakpoints.length; i += 1) {
  if (sortedBreakpoints[i] - sortedBreakpoints[i - 1] === 1) {
    adjacentPairs.push(`${sortedBreakpoints[i - 1]}px 与 ${sortedBreakpoints[i]}px`)
  }
}
assert.deepEqual(
  adjacentPairs,
  [],
  `存在相邻 1px 的断点对：${adjacentPairs.join(', ')}——同一区域应共用一个阈值，`
  + '两档相邻值只会制造不一致窗口（KNOWN-ISSUES §22.3「断点无体系」的实际形态）',
)

// ── 19. 布局脚本不得用「第一个反引号」抽样式（2026-10-14 新增）────────────────
// §13 已经防住了「源码里的 CSS 注释出现反引号会把模板串截断」，但只校验了源码侧。
// 消费侧同样脆：两个布局脚本用 `indexOf('\`')` 定位模板串，文件头 JSDoc 一旦出现
// 反引号（标记 CSS 变量名极自然），抽出的「样式」就成了注释正文，CSS 规则被切碎。
// 2026-10-14 实踩：给 settings-page-styles.ts 补了含反引号的注释后，
// verify-settings-backdrop 量到设置页宽 1264 ≠ 1280、verify-settings-geometry
// 的标题栏安全区断言假失败——都是**夹具坏了**，不是产品坏了。
const layoutScripts = [...readdirSync(new URL('../scripts', import.meta.url))].filter(name => name.endsWith('.mjs'))
const fragileSlicers = layoutScripts.filter(name => {
  const text = readFileSync(new URL(`../scripts/${name}`, import.meta.url), 'utf8')
  // 匹配用「第一个反引号」/「最后一个反引号」切片模板串的写法（注释里的提及不算）。
  return /source\.slice\(\s*source\.indexOf\(/s.test(text) || /source\.slice\([^)]*indexOf\(/s.test(text)
})
assert.deepEqual(fragileSlicers, [], `以下布局脚本用「第一个反引号」抽样式，文件头注释一旦含反引号就会静默抽错：${fragileSlicers.join(', ')}`)
assert.match(indexSource, /observeForeignSurfaces\(\)/, '外来表面发现哨兵必须以应用级 effect 注册')

// ── 23. 两条布局入口必须跑同一批脚本（2026-10-14 新增）──────────────────────
// 背景：本仓库有两条跑布局脚本的入口——`scripts/gate.mjs` 的 LAYOUT 数组（完整门禁，
// pre-push 钩子执行）与 package.json 的 `test:layout`（开发时单跑）。2026-10-14 实测发现
// 两者**已经漂移**：1.11.0 新增的 `verify-state-shells.mjs` 只接进了 gate.mjs，
// `test:layout` 里没有它。后果是：开发者单跑 `npm run test:layout` 看到全绿，
// 却有一条门禁从未执行——正是本仓库最反对的「静默失效」。
//
// 断言口径：两个集合必须完全相等（不是包含）。少一条 = 开发者本地跑不到；
// 多一条 = gate 漏接、pre-push 拦不住。两种情况都要红。
const gateSource = readFileSync(new URL('../scripts/gate.mjs', import.meta.url), 'utf8')
const layoutBlock = /const LAYOUT = \[([\s\S]*?)\n\]/.exec(gateSource)?.[1] ?? ''
assert.ok(layoutBlock.length > 0, '必须能在 gate.mjs 里定位 LAYOUT 数组')
const gateLayoutScripts = [...new Set([...layoutBlock.matchAll(/'(scripts\/verify-[a-z0-9-]+\.mjs)'/g)].map(m => m[1]))].sort()
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> }
const chainScripts = [...new Set(
  [...(packageJson.scripts['test:layout'] ?? '').matchAll(/scripts\/([A-Za-z0-9_.-]+\.mjs)/g)].map(m => `scripts/${m[1]}`),
)].sort()
assert.ok(
  gateLayoutScripts.length > 0 && chainScripts.length > 0,
  '两条布局入口都必须解析出脚本清单（正则或脚本结构变了就需要同步本断言）',
)
assert.deepEqual(
  chainScripts.filter(s => !gateLayoutScripts.includes(s)),
  [],
  '以下脚本在 `npm run test:layout` 里跑、但没接进 gate.mjs 的 LAYOUT——pre-push 门禁不会拦它们',
)
assert.deepEqual(
  gateLayoutScripts.filter(s => !chainScripts.includes(s)),
  [],
  '以下脚本接进了 gate.mjs 的 LAYOUT、但 `npm run test:layout` 里没有——开发者单跑布局套件时它们从不执行（2026-10-14 verify-state-shells.mjs 就是这样漏的）',
)

// ── 24. 皮肤版本串必须有守护，且不许与包版本混为一谈（2026-10-14 新增）────────
// 背景：KNOWN-ISSUES §13 记录过一次「发漏内部版本串对齐」——`SKIN_VERSION` 停在 '1.0.0'
// 而 package.json 已到 1.1.0，两边没人核对，本地实机排查时一度无法确认加载的是哪版皮肤。
// 该串没有任何断言守护（全仓 grep 只有定义与两处消费），所以同样的事可以再发生一次。
//
// 语义澄清（防止后人"顺手对齐"）：它**不是**包版本，而是**样式表内容版本**，
// 只在「令牌口径或样式表产出发生变化」时递增。两条序列故意独立——
// 包版本跟着功能与上游移植走（1.12.0），皮肤版本跟着样式表走（1.3.0）。
// 断言只锁「格式合法 + 已接线到两个消费点」，**不锁具体数值**（锁死数值会每次都红，
// 反而会被人随手改成"别再报红"的形状）。
const skinSource = read('zcode-skin.ts')
const skinVersion = /export const SKIN_VERSION = '(\d+\.\d+\.\d+)'/.exec(skinSource)?.[1]
assert.ok(
  skinVersion !== undefined,
  'SKIN_VERSION 必须是 x.y.z 形式的语义化版本串（实机靠它确认加载的皮肤版本）',
)
assert.match(
  skinSource,
  /皮肤 v\$\{SKIN_VERSION\}/,
  'SKIN_VERSION 必须写进注入样式表的版本注释里，否则实机无法从 DOM 辨认皮肤版本',
)
assert.match(
  skinSource,
  /setAttribute\(SKIN_ATTRIBUTE, SKIN_VERSION\)/,
  'SKIN_VERSION 必须写进 data-dsh-zcode-skin 属性，否则 DevTools 里看不出皮肤版本',
)
// 与包版本解耦：不允许写成"等于 package.json 版本"的形态（那会引入一条必然漂移的耦合）。
assert.doesNotMatch(
  skinSource,
  /SKIN_VERSION\s*=\s*(?:pkg|package)\w*\.version/,
  'SKIN_VERSION 不得直接取 package.json 的版本——它是样式表内容版本，与包版本是两条独立序列',
)

// ── 25. 间距必须落在标度上，且离刻度值必须显式登记（2026-10-16 新增）────────────
// 背景：ZCode DESIGN.md §Spacing 把间距列为设计系统的独立一层（基准 4px，推荐节奏
// 4/8/12/16/20-24），并明令「Prefer a small set of repeated gaps and paddings instead of
// arbitrary values」。本插件此前**没有这一层**——几何值直接写字面量，于是长出了
// 5/7/9/14/18/22px 这类一次性数字（实测 39 处），同一界面里同义间距出现两三种值。
// 它们不是错，但没有体系：改动时没人知道该跟哪个值，于是继续长新的。
//
// 做法沿用 §9（圆角）与 §21（断点）的**注册表 + 棘轮**：允许的例外必须显式登记，
// 未登记即红。这里的例外分两类，都必须写明理由：
//   · 对齐型：会话行的左内距让会话文字相对项目标题缩进——编码的是**层级从属关系**，
//     不是节奏。2026-10-18（设计审计 P0-4）它从 30px 改为 40px（标度内，故已退出本表）；
//     仍在表里的 `padding:1px 8px 5px 40px` 是同一对齐关系 + 上下 1/5px 的**光学补偿**
//     （对 32px 行高把 18px 行高的文字压回视觉中线），整体写法保留。
//   · 光学型：`margin-top:-10px`、`margin:-3px 0 0` 是**视觉居中补偿**（让 8px 的点
//     在 20px 行高的文字旁看起来居中），同样不是节奏。
//
// 断言口径：扫所有 `padding*` / `gap*` / `margin*` 声明，取出其中的 px 数值；
// 标度内（4 的倍数，或 2px 半步）视为合规；标度外必须出现在 OFFSET_BASELINE 里。
const SPACING_SCALE = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96])
/**
 * 离刻度间距登记表：`文件:属性:完整值 → 出现次数`。
 * 每条都必须能回答「为什么不走标度」——对齐型 / 光学型 / 功能性预留，理由见行内注释。
 *
 * ⚠ 用**完整值**作 key（不是单个数字）：`margin:-3px 0 0` 里那个 3px 只有连同
 * 上下文才有意义——把它拆成裸 `3px` 会丢掉负号与其余分量，人工审查时看不出它在做什么。
 * （第一版就是这么写的，棘轮立刻报出 `CodexWorkspaceBrowser.tsx:margin:3px×1` 这种
 * 读不懂的 key，等于把登记表变成了噪音。）
 */
const OFFSET_BASELINE: Record<string, number> = {
  // 发丝级：扩展项列表用 1px 让密集行紧密相邻（同「1px 分隔线」性质，不是节奏间隔）。
  // 2026-10-17 起计数为 2：菜单行键帽 `.dcu-menu-kbd` 的 `gap:1px` 同属发丝级——
  // 它分隔的是「⌘」「K」两个键帽，ZCode KbdGroup 原文为 gap-1(4px)，但那是键与键之间；
  // 本仓把一次组合的两个键装在同**一个**键帽里（ZCode 是两个 chip），故用 1px 表示它们是同一组合，
  // 语义上更接近「字距微调」而非「节奏间隔」。
  'CodexSidebar.tsx:gap:1px': 2,
  // 发丝级：把扩展项列表整体收紧 1px 并对齐 24px 图标列。
  'CodexSidebar.tsx:margin:1px 0 4px 24px': 1,
  // 光学：未读圆点与 20px 行高的文字基线对齐（负值，故必须用完整值作 key）。
  'CodexWorkspaceBrowser.tsx:margin:-3px 0 0': 1,
  // 对齐：会话行文字与父级图标列（24px 图标 + 6px 间隙）对齐。改标度值会错位。
  // 功能性预留：会话行右侧要留出「时间 / 等待标签」的绝对定位空间，不是节奏间隔。
  // 两个值差 8px 是因为等待标签比时间戳宽——内容驱动的尺寸，不该压成标度值。
  'CodexWorkspaceBrowser.tsx:padding-right:120px': 1,
  'CodexWorkspaceBrowser.tsx:padding-right:112px': 1,
  // 光学非对称：左 30px 与图标列对齐，上 1-5px 补偿行高。
  'CodexWorkspaceBrowser.tsx:padding:1px 8px 5px 40px': 1,
  // 子层缩进：空态文案与集合标题的图标列对齐。
  'CodexWorkspaceBrowser.tsx:padding:8px 8px 8px 26px': 1,
  // 光学：1px 微调让次要文字与主文字的视觉基线对齐（不是节奏间隔）。
  'ConnectorsSection.tsx:margin-top:1px': 1,
  'settings-page-styles.ts:margin-top:1px': 1,
  // 发丝级：菜单项底部 1px（与相邻行的分隔密度一致）。
  'composer-tool-menus.ts:margin:0 0 1px': 1,
  // ⚠ 几何耦合值，**不是**节奏：设置导航的 18px 上边距是「macOS 标题栏安全区」的组成部分——
  // 全屏时另有 `padding-top:calc(var(--dsh-frame-top-clearance,48px) + 8px)` 接管，
  // 普通窗口下 18px = 安全区 8px + 基础 10px。本轮曾把它当节奏值迁成 var(--dcu-space-4)=16px，
  // 结果是 verify-settings-geometry.mjs 立刻报「macOS 全屏时不得额外留标题栏空白 0 !== 18」——
  // 门禁抓住了这次误迁移。教训：**与安全区/绝对定位耦合的值不能按节奏标度收归**。
  'settings-page-styles.ts:padding:18px 8px': 1,
}
const spacingLiterals = new Map<string, number>()
for (const { name, text } of clientFiles) {
  // zcode-theme.ts / zcode-tokens.ts 是标度真值源，令牌的值当然写成字面量。
  if (name === 'zcode-theme.ts' || name === 'zcode-tokens.ts') continue
  // **必须先剥掉 CSS 注释**：注释里引用间距值时（例如解释「原先是 gap:22px」）
  // 会被正则当成真声明扫进来。第一版没剥，棘轮报出了一个把整段注释当 key 的条目。
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of stripped.matchAll(/((?:padding|gap|margin)(?:-top|-right|-bottom|-left)?)\s*:\s*([^;}'"]+)/g)) {
    const prop = match[1]
    const value = match[2].trim()
    if (value.includes('var(') || value.includes('calc(') || value.includes('%') || value.includes('auto')) continue
    const nums = [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
    if (nums.length === 0) continue
    if (nums.every(n => SPACING_SCALE.has(n))) continue
    const key = `${name}:${prop}:${value}`
    spacingLiterals.set(key, (spacingLiterals.get(key) ?? 0) + 1)
  }
}
const unregisteredSpacing = [...spacingLiterals]
  .filter(([key, count]) => OFFSET_BASELINE[key] !== count)
  .map(([key, count]) => `${key}×${count}`)
assert.deepEqual(
  unregisteredSpacing,
  [],
  `间距必须落在标度上（4px 基数，含 2px 半步），未登记的离刻度值：${unregisteredSpacing.join(', ')}`
  + '。若确为对齐型/光学型/功能性预留（不是节奏），请连同理由登记进 OFFSET_BASELINE；'
  + '否则请改用 var(--dcu-space-N)（N=1..6 对应 4/8/12/16/20/24px）',
)
const staleSpacingBaseline = Object.entries(OFFSET_BASELINE)
  .filter(([key, count]) => spacingLiterals.get(key) !== count)
  .map(([key]) => key)
assert.deepEqual(
  staleSpacingBaseline,
  [],
  `间距基线里的条目已与现状不符（已迁移或数量变了），请从 OFFSET_BASELINE 移除：${staleSpacingBaseline.join(', ')}`,
)
// 标度令牌本身的守护。**不锁档位清单**——第一版写了 `for n of [1,2,3,4,5,6]` 要求六档全在，
// 收尾自检发现 space-half/space-5 与全部尺寸档**零消费**（投机设计，AGENTS.md 第 2 条），
// 删掉后那条断言反而红了。锁死档位清单等于把"预置死令牌"变成契约，方向正好相反。
// 正确的口径是三条：
//   1) 每个**实际定义**的 space 档必须是 4 的倍数（ZCode 基准单位 4px）；
//   2) 每个**被消费**的 var(--dcu-space-N) 必须有对应定义（否则静默失效、退回继承值）；
//   3) 不允许出现零消费的令牌（死令牌 = 后人误以为"有约定俗成用法"）。
const definedSpaceTokens = [...theme.matchAll(/--dcu-space-(\d+):\s*(\d+)px/g)].map(m => ({ n: Number(m[1]), px: Number(m[2]), name: `--dcu-space-${m[1]}` }))
assert.ok(definedSpaceTokens.length > 0, '主题层必须定义间距标度令牌（ZCode §Spacing 的 4px 基数节奏）')
for (const t of definedSpaceTokens) {
  assert.equal(t.px % 4, 0, `${t.name} 必须是 4 的倍数（ZCode 基准单位 4px），实测 ${t.px}px`)
}
const usedSpaceTokens = new Set<string>()
for (const { text } of clientFiles) {
  for (const m of text.matchAll(/var\((--dcu-space-\d+)\)/g)) usedSpaceTokens.add(m[1])
}
const definedNames = new Set(definedSpaceTokens.map(t => t.name))
const missingDefinitions = [...usedSpaceTokens].filter(n => !definedNames.has(n))
assert.deepEqual(
  missingDefinitions,
  [],
  `以下间距令牌被消费但没有定义（var() 会解析失败并退回继承值，属静默失效）：${missingDefinitions.join(', ')}`,
)
const deadSpaceTokens = [...definedNames].filter(n => !usedSpaceTokens.has(n))
assert.deepEqual(
  deadSpaceTokens,
  [],
  `以下间距令牌定义了但零消费（投机档位——档位是用出来的，不是定出来的；`
  + `真需要时再加一行即可）：${deadSpaceTokens.join(', ')}`,
)


// ── 2026-10-17 菜单行键帽（ZCode Kbd/KbdGroup 的等价物）─────────────────────────
// 背景：本轮之前快捷键只有 aria-keyshortcuts，视觉上完全不可见，可发现性为零。
// ZCode 侧栏的「新建任务」「命令中心」两行都在右侧常显键帽（NewTaskButtonGroup.tsx:42、
// WorkspaceSidebar.tsx:1514），规格取自 components/ui/kbd.tsx：h-5(20px) / min-w-5 /
// rounded-sm(4px) / bg-muted / text-ui-xs / font-medium / px-1 / gap-1。
const kbdCss = sidebar.match(/\.dcu-menu-kbd\{([^}]*)\}/)?.[1]
assert.ok(kbdCss, '必须定义 .dcu-menu-kbd（菜单行键帽）')
assert.match(kbdCss, /height:20px/, '键帽高度必须是 ZCode 的 h-5（20px）')
assert.match(kbdCss, /min-width:20px/, '键帽最小宽度必须是 ZCode 的 min-w-5（20px），保证单符号键与字母键等宽')
assert.match(kbdCss, /border-radius:var\(--dsw-radius-sm\)/, '键帽圆角必须是 ZCode 的 rounded-sm（4px）')
assert.match(kbdCss, /font-size:var\(--dsw-font-size-xs\)/, '键帽字号必须走 ZCode 的 text-ui-xs 档（刻度，不得字面量）')
assert.match(kbdCss, /color:var\(--dcu-kbd-foreground/, '键帽文字必须消费 --dcu-kbd-foreground（分档取色，保证两套主题都过 AA）')
assert.match(kbdCss, /pointer-events:none/, '键帽是纯展示，不得抢走行点击')
assert.doesNotMatch(kbdCss, /font-size:\d+px/, '键帽字号不得使用字面量（ZCode 宪章：字号必须走系统刻度）')

// 菜单行必须留出键帽列；否则键帽会把文字挤出可视区。
assert.match(sidebar, /\.dcu-menu button,\.dcu-footer-link\{display:grid;grid-template-columns:16px minmax\(0,1fr\) auto;/, '菜单行必须为键帽保留第三列（auto），且文字列可收缩')

// 紧凑轨没有横向空间：键帽必须让位，否则图标被挤出 56px 轨道。
assert.match(sidebar, /\.dcu-compact-nav \.dcu-menu-kbd\{display:none\}/, '紧凑轨必须隐藏键帽（56px 轨道放不下）')

// 分档令牌必须两套主题都有定义，且被消费（否则 var() 静默回退）。
const kbdTokenDefs = [...theme.matchAll(/--dcu-kbd-foreground:(#[0-9a-f]{6})/gi)].map(m => m[1])
assert.equal(kbdTokenDefs.length, 2, `--dcu-kbd-foreground 必须在亮/暗两档各定义一次（实测 ${kbdTokenDefs.length} 处）`)

// 对比度硬门槛：键帽文字 vs 键帽底色必须 ≥ 4.5:1（WCAG AA 正文）。
const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const over = (fg: string, alpha: number, bgHex: string): string => {
  const bg = parseInt(bgHex.slice(1), 16)
  const ch = [(bg >> 16) & 255, (bg >> 8) & 255, bg & 255]
  const f = parseInt(fg.slice(1), 16)
  const fch = [(f >> 16) & 255, (f >> 8) & 255, f & 255]
  const mix = ch.map((v, i) => Math.round(fch[i] * alpha + v * (1 - alpha)))
  return `#${mix.map(v => v.toString(16).padStart(2, '0')).join('')}`
}
// 键帽底 = 侧栏底叠 --dcu-surface：亮 rgba(13,13,13,.03) / 暗 rgba(255,255,255,.05)
const kbdBgLight = over('#0d0d0d', 0.03, '#f0f0f0')
const kbdBgDark = over('#ffffff', 0.05, '#161616')
const [kbdLight, kbdDark] = kbdTokenDefs
assert.ok(contrast(kbdLight, kbdBgLight) >= 4.5,
  `亮色键帽对比度必须 ≥4.5:1（实测 ${contrast(kbdLight, kbdBgLight).toFixed(2)}:1，色 ${kbdLight} on ${kbdBgLight}）`)
assert.ok(contrast(kbdDark, kbdBgDark) >= 4.5,
  `暗色键帽对比度必须 ≥4.5:1（实测 ${contrast(kbdDark, kbdBgDark).toFixed(2)}:1，色 ${kbdDark} on ${kbdBgDark}）`)
console.log('✓ 菜单行键帽：规格对齐 ZCode Kbd、分档取色、双主题对比度达标')

// ── 2026-10-17 选中行可读性（真实缺陷修复的守护）──────────────────────────────
// 缺陷：选中行底色比侧栏底深/亮一档，落其上的次要文字掉出 WCAG AA。
//   亮 选中底 #e5e5e5 上 tertiary #686868 = 4.42:1 ❌
//   暗 选中底 #2d2d2d 上 tertiary #828282 = 3.58:1 ❌
// 受影响的是会话行时间戳与集合子标题这类小字。修法：只在选中行内提一档，不动普通底色。
assert.match(workspaceBrowserSource,
  /\.dcu-wb-session\.dcu-wb-selected \.dcu-wb-session-time\{color:var\(--dcu-selected-secondary/,
  '选中行的时间戳必须改用选中态专用档（普通底色下的 tertiary 在选中底上不过 AA）')

// 2026-10-18（红队复核）：--dcu-selected-tertiary 零消费，已删除（本仓纪律：零消费档位不留）。
// 断言从「两档成对定义」改为「只定义有消费点的 secondary，且两档各一次」。
const selTokenDefs = [...theme.matchAll(/--dcu-selected-secondary:(#[0-9a-f]{6})/gi)]
assert.equal(selTokenDefs.length, 2, `--dcu-selected-secondary 必须在亮暗两档各定义一次（实测 ${selTokenDefs.length}）`)
// 只查**声明**（`--name:` 后跟值），不查注释里提到的名字——注释解释「为什么删」是正当的。
assert.doesNotMatch(theme, /--dcu-selected-tertiary:\s*[#a-zA-Z]/, '不得保留零消费的 --dcu-selected-tertiary（无消费点的档位是投机设计）')

// 选中底 = 侧栏底叠 --dcu-sidebar-selected（亮 rgba(13,13,13,.05) / 暗 rgba(255,255,255,.10)）
const selBgLight = over('#0d0d0d', 0.05, '#f0f0f0')
const selBgDark = over('#ffffff', 0.10, '#161616')
const [selLight, selDark] = selTokenDefs
// 2026-10-18：--dcu-selected-tertiary 已删除（零消费），故只校验实际存在的那一档。
assert.ok(contrast(selLight[1], selBgLight) >= 4.5,
  `亮色选中行次要文字对比度必须 ≥4.5:1（实测 ${contrast(selLight[1], selBgLight).toFixed(2)}:1）`)
assert.ok(contrast(selDark[1], selBgDark) >= 4.5,
  `暗色选中行次要文字对比度必须 ≥4.5:1（实测 ${contrast(selDark[1], selBgDark).toFixed(2)}:1）`)
console.log('✓ 选中行可读性：双主题次要/弱化文字在选中底上均达 AA')

// ── 2026-10-17 开关轨道（ZCode switch.tsx 口径）────────────────────────────────
// ZCode 用 data-checked:bg-primary / data-unchecked:bg-primary/30，滑块 bg-primary-foreground，
// 两侧随主题同时反转。本仓此前用 --dsw-alias-border-l3，亮色下滑块/轨道只有 1.30:1（几乎不可见）。
const settingsCss = read('settings-page-styles.ts')
const switchRule = settingsCss.match(/\.dcu-settings-switch\{([^}]*)\}/)?.[1]
assert.ok(switchRule, '必须定义 .dcu-settings-switch')
assert.match(switchRule, /color-mix\(in srgb,var\(--dcu-primary,#000\) 30%,transparent\)/,
  '开关未选中轨道必须用 primary 的 30%（ZCode data-unchecked:bg-primary/30），不得用 border 档')
assert.doesNotMatch(switchRule, /--dsw-alias-border-l3/,
  '开关轨道不得再用 border-l3：亮色下滑块与轨道只有 1.30:1，视觉上几乎融为一体')

// ── 2026-10-19 自适应跳过：只拦「真正失控」，不再锁 duration/2 ─────────────────
// 历史：这里曾断言源码里必须出现 `if (blocked > duration / 2)`，理由是「阻塞吃掉半个
// 动画时长就跳过播动画」。实测推翻了它：
//
//   · `blocked` 是轨道切换引发的那次重排，**已经付完**。跳过动画既省不回它，
//     也不会让用户更早看到结果，只少了过渡——等于「让用户永远看不到动画」。
//   · 1200 条 blocked=26ms、3000 条 blocked=86ms，而 duration/2=90ms。
//     阈值就压在临界点上，播不播由机器抖动决定，同代码两次跑结论可能相反。
//   · 叠加 `SIDEBAR_MOTION_MAX_ELEMENTS=8000`，长会话（1.2 万节点）动画被整个跳过，
//     用户报的「不丝滑」其实是**没有动画**。
//
// 现在锁的是**意图**而不是字面写法（这是 CODE-040：把当时的实现值写成契约）：
//   ① 判据必须基于实测阻塞时间 blocked，不得按节点数常量决定；
//   ② 阈值必须锚定 duration（随动效档位缩放），不得写成魔法毫秒数；
//   ③ 不得退回「节点数 > N 就跳过」的闸门。
const sidebarWidthSrc = read('sidebar-width.ts')
assert.match(sidebarWidthSrc, /blocked\s*>\s*SKIP_ANIMATION_BLOCK_MS/,
  '自适应跳过判据必须基于实测阻塞时间（blocked），不得按节点数常量决定是否播动画')
assert.match(sidebarWidthSrc, /SKIP_ANIMATION_BLOCK_MS\s*=\s*duration\s*\*/,
  '跳过阈值必须锚定动画时长 duration（随动效档位自动缩放），不得写成魔法毫秒数')
assert.doesNotMatch(sidebarWidthSrc, /getElementsByTagName\('\*'\)\.length\s*>\s*\w+/,
  '不得用「frame 后代节点数超过某个常数」决定播不播动画——帧成本已与内容量脱钩（2.5 万节点仍满帧），节点数闸门只会让长会话彻底失去动画')
console.log('✓ 侧栏自适应跳过：按实测阻塞时间、阈值锚定动画时长、无节点数闸门')

// ── 2026-10-17 动效曲线真值（用户反馈「不够丝滑」后修正）──────────────────────
// 缺口：此前所有断言只检查「有没有用 --dcu-motion-*-ease 令牌」，
// **没有一条检查令牌里的值对不对**。于是 feedback/move 两档长期用着 ease-in-out
// 的值却被判为绿——这是「断言锁了形式、没锁内容」的典型。
//
// ZCode 真值（/Applications/ZCode.app .../styles-Cg6LSa5A.css）：
//   --ease-out:    cubic-bezier(0, 0, .2, 1)   ← 单向位移/淡入用它
//   --ease-in-out: cubic-bezier(.4, 0, .2, 1)  ← 我们误用的正是这条
// 两者前 10% 时间进度相差 12 倍（2.6% vs 30.4%），单向动效会显得「不跟手」。
const easeOf = (name: string): string => {
  const m = theme.match(new RegExp(`--dcu-motion-${name}-ease:([^;]+);`))
  assert.ok(m, `必须定义 --dcu-motion-${name}-ease`)
  return m[1].trim()
}

// 2026-10-26：CDP 现场实测推翻旧判断。ZCode 侧栏内两条曲线各 7 处并列，
// 而**会话行悬停**（color/background-color/border-color，0.15s）实测用的正是 (.4,0,.2,1)。
// 旧断言的理由「起步迟滞」在数学上成立（前 15% 时间只走 6.6% vs 41%），
// 但总时长同为 150ms，15% 仅 22ms，且这是 ZCode 的真实选择。跟被测对象优先于理论偏好。
// 实测数据：cdp-capture/zcode-motion.json
assert.equal(easeOf('feedback'), 'cubic-bezier(.4,0,.2,1)',
  'feedback 必须跟 ZCode 实测：会话行悬停用 (.4,0,.2,1) + 150ms')
assert.equal(easeOf('move'), 'cubic-bezier(0,0,.2,1)',
  'move 必须是 ZCode ease-out(0,0,.2,1)；侧栏开合等单向位移用 ease-in-out 会「点了不跟手」')
assert.equal(easeOf('enter'), 'cubic-bezier(.2,0,0,1)',
  'enter 必须是减速收尾曲线 (.2,0,0,1)')
assert.equal(easeOf('exit'), 'cubic-bezier(.4,0,1,1)',
  'exit 必须是加速离场曲线 (.4,0,1,1)')

// 反向守护：move 档（侧栏开合等单向位移）仍不得用回缓入缓出。
// 2026-10-26：feedback 档已排除在本守护之外——CDP 实测 ZCode 的会话行悬停
// （color/background-color，单向）用的正是 (.4,0,.2,1) + 150ms。
// 理论分类（.4 = 双向曲线）与实测冲突时，以实测为准；move 档仍是 (0,0,.2,1)。
assert.doesNotMatch(theme, /--dcu-motion-move-ease:cubic-bezier\(\.4,0,\.2,1\)/,
  '单向位移（move）不得使用 ease-in-out(.4,0,.2,1)——那是双向运动的曲线')

// 曲线进度自检：ease-out 在 10% 时间必须已走过 ≥20%（旧曲线只有 2.6%）。
const curveProgressAt = (x1: number, y1: number, x2: number, y2: number, targetX: number): number => {
  let lo = 0, hi = 1
  for (let i = 0; i < 60; i++) {
    const u = (lo + hi) / 2
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3
    if (x < targetX) lo = u
    else hi = u
  }
  const u = (lo + hi) / 2
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3
}
const moveProgress10 = curveProgressAt(0, 0, .2, 1, 0.1)
assert.ok(moveProgress10 >= 0.2,
  `move 曲线在 10% 时间应已走 ≥20%（实测 ${(moveProgress10 * 100).toFixed(1)}%）——低于此值用户会感到起步迟滞`)
console.log(`✓ 动效曲线：四档对齐 ZCode 真值，move 在 10% 时间已走 ${(moveProgress10 * 100).toFixed(1)}%`)

// ── 2026-10-17 动画合成层提示（实测 -20% 任务耗时）────────────────────────────
// 实测（1500 条消息，12 帧窗口）：无 will-change 时 Layout +1 / Task 10ms；
// 有时 Layout +0 / Task 8ms。动画中途不再触发布局，是「丝滑」的可量化来源。
// 约束：**只在动画期间**生效（motion 标记存在时），否则会常驻显存并新增层叠上下文。
assert.match(sidebar,
  /\[data-dcu-sidebar-motion\][^{]*\[data-dcu-center-column\]\{transition:transform var\(--dcu-motion-move-duration\) var\(--dcu-motion-move-ease\);will-change:transform\}/,
  '内容列在动画期间必须加 will-change:transform（实测消除动画中途的 Layout）')
// 反向守护：不得把 will-change 挂在没有 motion 标记的静态规则上（会常驻）。
assert.doesNotMatch(sidebar,
  /\[data-dcu-center-column\]\{[^}]*will-change:transform[^}]*\}(?![\s\S]*data-dcu-sidebar-motion)/,
  'will-change 不得常驻在静态规则上——必须由 [data-dcu-sidebar-motion] 限定在动画期间')
console.log('✓ 动画合成层提示：will-change 限定在 motion 标记期间')

// ── 2026-10-17 浮层文字色必须与浮层底「成对」（用户报「灰底白字看不清」）──────
// 根因有两层，都已修：
//   ① 宿主 Tooltip.module.css 用 `color: var(--dsw-static-neutral-bluish-00)` 当文字色。
//      本仓把该变量当「纯白」映射成 #ffffff，于是亮色下变成 #f0f0f0 底 + #ffffff 字 = **1.14:1**。
//      ZCode 的做法是成对定义（--color-tooltip / --color-tooltip-foreground）：
//      亮 #f0f0f0+#0d0d0d = 17.05:1 ／ 暗 #2b2b2b+#f8f8f8 = 13.33:1。
//   ② 自有浮层 .dcu-wb-tip 复用了**侧栏**色板做文字色，而浮层底是白/深灰、不是侧栏底：
//      暗色下 secondary 3.99:1、tertiary 3.68:1，均掉出 AA。
//
// 这条断言锁「成对」这件事本身：浮层内不得直接消费侧栏色板。
const tipBlock = workspaceBrowserSource.match(/\.dcu-wb-tip\{[^}]*\}/)?.[0]
assert.ok(tipBlock, '必须定义 .dcu-wb-tip')
assert.match(tipBlock, /background:var\(--dcu-tip-bg\)/, '浮层底必须用 --dcu-tip-bg')
assert.match(tipBlock, /color:var\(--dcu-tip-primary\)/,
  '浮层文字色必须与浮层底成对（--dcu-tip-primary），不得复用侧栏 primary')

// 浮层内所有文字色都必须来自 --dcu-tip-* 色板。
const tipRules = [...workspaceBrowserSource.matchAll(/\.dcu-wb-tip[a-z-]*(?::hover)?\{([^}]*)\}/g)].map(m => m[1])
const tipTextColors = tipRules
  .flatMap(body => [...body.matchAll(/(?<![-\w])color:\s*(var\(--[a-z0-9-]+\))/g)].map(m => m[1]))
assert.ok(tipTextColors.length > 0, '浮层必须有文字色规则')
const leaked = tipTextColors.filter(v => !v.startsWith('var(--dcu-tip-'))
assert.deepEqual(leaked, [],
  `浮层内不得使用非 --dcu-tip-* 文字色（实测泄漏：${leaked.join(', ')}）——侧栏色板在浮层底上会掉出 AA`)

// bluish-00 必须取「与背景反向的前景色」，不能是纯白。
const bluish00 = [...tokens.matchAll(/'--dsw-static-neutral-bluish-00':\s*'(#[0-9a-f]{6})'/gi)].map(m => m[1])
assert.equal(bluish00.length, 2, `--dsw-static-neutral-bluish-00 必须在亮/暗两档各定义一次（实测 ${bluish00.length}）`)
assert.notEqual(bluish00[0].toLowerCase(), '#ffffff',
  '亮的 bluish-00 不得是纯白——宿主 Tooltip 拿它当文字色压在 #f0f0f0 上，纯白只有 1.14:1')

// 对比度硬门槛：浮层三档 × 两主题，全部 ≥4.5:1。
const tipPairs: Array<[string, string, string[]]> = [
  ['亮', '#ffffff', ['#262626', '#5c5c5c', '#686868']],
  ['暗', '#2b2b2b', ['#d4d4d4', '#9a9a9a', '#a3a3a3']],
]
for (const [themeName, bg, fgs] of tipPairs) {
  for (const fg of fgs) {
    const ratio = contrast(fg, bg)
    assert.ok(ratio >= 4.5,
      `${themeName}色浮层 ${fg} on ${bg} 对比度必须 ≥4.5:1（实测 ${ratio.toFixed(2)}:1）`)
  }
}
// 宿主 tooltip 组合：亮 #f0f0f0 + #0d0d0d；暗 #2b2b2b + #f8f8f8
assert.ok(contrast('#0d0d0d', '#f0f0f0') >= 4.5, '宿主 tooltip 亮色配对必须达标')
assert.ok(contrast('#f8f8f8', '#2b2b2b') >= 4.5, '宿主 tooltip 暗色配对必须达标')
console.log('✓ 浮层文字色：与底色成对、无侧栏色泄漏、双主题全部 ≥AA')

// ── 26. 样式模板串完整性（2026-10-18 第三版：TypeScript AST）────────────────────
//
// ## 为什么推翻前两版
//
// v1：按「文件名 + 变量名」两张表放行 → 反向扫描根本没写（零调用死代码）。
// v2：补上反向扫描但只认 `const X = ` → `const X:string=` / `let` / `var` / 三元 /
//     解构 / `String.raw` 六种写法全部逃逸。
// v2.5：改成「逐字符扫反引号 + 猜注释」→ 被两种极常见的构造整体致盲：
//     · 行尾注释 `const L = 12 // 别和 \` 混用` —— 注释判据只认行首 `//`；
//     · 字符串里出现 `/*`（如 glob `'src/**/*'`）—— `lastIndexOf` 不认识字符串，
//       于是"块注释未闭合"永久成立，**该文件之后的所有反引号全被跳过**。
//     仓库现有 6 个文件的字符串里就有反引号，只要其中一个多一个 CSS 串就完全失守。
//
// **病根：用字符扫描去模拟语法解析。** 反引号是否属于模板串、注释边界在哪，
// 是语法问题，交给解析器回答才不会错。
//
// ## 现在：AST
//
// 用 `ts.createSourceFile` 解析每个客户端文件，遍历 AST 只看两种节点：
//   · `NoSubstitutionTemplateLiteral`（无插值模板串）
//   · `TemplateExpression`（有插值，取其 head + 所有 spans 的文字部分）
// 注释、字符串、正则里的反引号**天然不会被当成模板串**，不需要任何启发式。
// 每个模板串再判断「像不像 CSS」，判定规则见 looksLikeCss。
const truncatedTemplates: string[] = []
const unregisteredStyleTemplates: string[] = []

/**
 * 已登记的文件 → 该文件里**含样式**的模板串数量（仅用于报告未登记，不用于跳过检查）。
 * 数字来自 AST 统计的真值，随代码演进必须同步；不一致即报。
 */
const STYLE_BLOCK_BUDGET: Record<string, number> = {
  'AboutSection.tsx': 1,
  'CodexSidebar.tsx': 1,
  'CodexWorkspaceBrowser.tsx': 4,
  'ConnectorsSection.tsx': 4,
  'DesktopNavigationControls.tsx': 1,
  'InputHistoryDock.tsx': 1,
  'TurnNavigator.tsx': 1,
  'composer-tool-menus.ts': 1,
  'composer-visuals.ts': 1,
  /* 2026-10-27：会话区骨架三件（C1 列宽 / C2 轮组间距 / C3 行高）的样式块。
     单独成文件而不并入 CodexSidebar，是因为会话区后续还会加气泡、代码块、工具卡等
     多批覆盖，集中在 CodexSidebar 会让那个文件继续膨胀（已 1100+ 行）。
     当前 1 个样式块。 */
  'conversation-layout.ts': 1,
  'composer-width.ts': 1,
  'conversation-header.ts': 1,
  'new-conversation-style.ts': 1,
  'settings-page-styles.ts': 1,
  'skin-envelope.ts': 5,
  'virtual-skip.ts': 2,
  'zcode-skin.ts': 1,
  'zcode-theme.ts': 1,
}

/**
 * 块内容是否"像 CSS"。
 *
 * 判据（足够宽松，不漏常见写法；同时排除 JS 对象字面量）：
 *   ① 必须同时含 `{` 与 `}`；
 *   ② 必须出现至少一条 `属性: 值`（属性名允许 `--` 前缀）；
 *   ③ 排除 JS 对象/JSON 字面量特征：整块只有 `"key": "value"` 且以逗号分隔、
 *      或块内没有任何 CSS 特有 token（`;` / `var(--` / `--x:` / `px` / `#hex` / `!important`）。
 *
 * 2026-10-18（第三轮复核）：前版要求"有分号或变量"，导致
 * `body{margin:0}`（元素选择器 + 单条无分号声明）被判非 CSS，而这是本仓真实写法
 * （skin-envelope.ts 的插值样式块就是这样，一直被漏数）。
 */
const looksLikeCss = (body: string): boolean => {
  if (!body.includes('{') || !body.includes('}')) return false
  // ① 必须出现 `属性: 值`（属性名允许 `--` 前缀）。
  // ⚠ 属性名可以是 `color`（无前缀）、`-webkit-x`（单横线）或 `--var`（双横线）。
  // 首版写成 `(?:--?[a-zA-Z]...)` 把横线做成了**必选**前缀，于是 `color:var(...)`
  // 这种最常见的声明全部匹配不上 —— 整个守卫会静默失效。实测：`.brand-new{color:var(--a)}`
  // 被判为非 CSS。改为 `-{0,2}` 允许零到两条横线。
  if (!/(?:-{0,2}[a-zA-Z][\w-]*)\s*:\s*[^\s]/.test(body)) return false
  // ② 排除 JS 对象字面量：键被引号包裹（CSS 属性名从不加引号）。
  //    单个被引号包住的键就足以判定为对象 —— CSS 里不会有 `"font": inherit`。
  if (/\{\s*["'][\w-]+["']\s*:/.test(body) || /,\s*["'][\w-]+["']\s*:/.test(body)) return false
  // ⚠ 2026-10-18（第三轮复核 R2）：首版写「值以引号开头且无 content: → 判为对象字面量」，
  // 这会把 `font-family:"SF Mono"`、`grid-template-areas:"a b"` 这类**合法 CSS** 整块漏判
  // （本仓 skin-envelope / AboutSection 都用 `font-family`）。攻击者只需在样式表里加一条
  // `font-family:"x"` 就能让整块隐身。
  // 正确判据：看是否存在**整块都是** `key: "value"` 且用**逗号**分隔的形态 —— 那才是对象字面量。
  // CSS 用分号分隔，且有 `{` 包裹的规则结构。
  const quotedPairs = body.match(/[\w-]+\s*:\s*["'][^"']*["']/g) ?? []
  if (quotedPairs.length > 0 && !/[;]/.test(body) && /,\s*[\w-]+\s*:/.test(body)) return false
  // ③ 允许"片段式"样式串：本仓 skin-envelope.ts 大量使用
  //    `{font:inherit}`、`:where(${X}) :where(button){box-sizing:border-box}` 这种
  //    由插值拼出选择器/属性名的短片段。它们是真的 CSS，只是没有分号与单位。
  //    因此不再要求"必须有 px/;/var()"等 CSS 特有 token —— 那会把它们全部漏掉。
  return true
}

/**
 * 插值位置的占位符。
 *
 * ⚠ 2026-10-18（第三轮复核 R1）：首版用 `${…}` 当占位符，而它**自带 `{`、`}` 和 `:`** ——
 * 于是 `session:${id}`、`pin:${id}`、`https://a.com/${p}`、`error:${e}` 这类普通插值串
 * 全部"自我满足"了 looksLikeCss 的判据，被当成样式块。
 * 后果不是单纯多算几个数：`CodexWorkspaceBrowser.tsx` 登记 10 块里有 5 个是这种假阳性，
 * 而**假阳性会抵扣真实新增的块** —— 把其中一个假阳性换成一份真正的样式表，数量仍是 10，
 * 门禁全绿。这等于"严格相等"保护的是一个掺假的数字。
 *
 * 现在用 U+0000 哨兵：它不可能凑出 `{`、`}`、`:`、`;` 或任何属性名形态，
 * 插值位置对内容判据完全透明。
 */
const INTERPOLATION_SENTINEL = String.fromCharCode(0)
const templateText = (node: ts.Node): string | undefined => {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join(INTERPOLATION_SENTINEL)
  }
  return undefined
}

for (const { name, text } of clientFiles) {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  let cssBlocks = 0
  let anyTemplate = 0
  const visit = (node: ts.Node): void => {
    const body = templateText(node)
    if (body !== undefined) {
      anyTemplate += 1
      const label = `${name}:<template#${anyTemplate}>`
      // ① 截断特征检查（先于内容判定：被截断的块内容已不完整，不能靠"像不像 CSS"过滤）
      if (body.includes(String.fromCharCode(92) + String.fromCharCode(96))) {
        if (looksLikeCss(body) || /\{[^{}]*:/.test(body)) truncatedTemplates.push(`${label}（含转义反引号 → 提取脚本会在此截断）`)
      } else if (/\/\*(?:(?!\*\/)[\s\S])*$/.test(body) && looksLikeCss(body)) {
        truncatedTemplates.push(`${label}（块尾有未闭合注释 → 已被截断）`)
      }
      // ② 样式块计数
      if (looksLikeCss(body)) cssBlocks += 1
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  const expected = STYLE_BLOCK_BUDGET[name]
  if (expected === undefined) {
    if (cssBlocks > 0) unregisteredStyleTemplates.push(`${name}（${cssBlocks} 个样式块，文件未登记）`)
  } else if (cssBlocks !== expected) {
    unregisteredStyleTemplates.push(`${name}（AST 实测 ${cssBlocks} 个样式块 ≠ 登记 ${expected} 个）`)
  }
}

assert.deepEqual(
  unregisteredStyleTemplates,
  [],
  `样式块数量与登记表不符：${unregisteredStyleTemplates.join('、')}。`
  + '多了 = 新增样式串未登记；少了 = 有样式串不再被识别（或登记表腐烂）。',
)
assert.deepEqual(
  truncatedTemplates,
  [],
  `样式模板串被提前截断：${truncatedTemplates.join('、')}。`
  + '真凶是**转义反引号**：语法合法，但提取脚本的非贪婪正则会在那里停下，样式表会静默少一大半。'
  + '注释里要写反引号时，请用「」或普通文字代替。'
  + '（本检查基于 TypeScript AST，不受注释/字符串里的反引号干扰。）',
)
console.log(`✓ 样式模板串完整性：AST 解析 ${clientFiles.length} 个文件，无截断、无未登记样式串`)

// ── 27. 颜色字面量全量扫描（2026-10-18 第三版：AST + 令牌存在性）──────────────
//
// ## 为什么推翻前两版
//
// v1 枚举 17 个属性名 → `border-top` / `linear-gradient` / `oklch()` / 命名色 /
//    `--brand:#hex` 全部逃逸。
// v2 改成「扫所有颜色 token」→ 被三条**放行规则**打穿：
//   · `var(--tok, #hex)` 无条件放行 → 令牌名打错（`--dcu-zzz-brand`）就静默落到字面色，
//     而 `--dcu-*` 在全仓**没有任何存在性校验**；
//   · `color-mix` 的中性分支按"是否含命名中性色"判，`#ff0000 90% + black 10%` 出的
//     不透明新色被当成"叠中性"剔除（写成 `#000` 才被抓）；
//   · 注释剥离用 `/\*...\*/` 正则跨全文件 → 文件里只要出现 `const A='/*'` 与
//     `const B='*/'`，两者之间的颜色全部被抹掉。
//
// ## 现在
//
// ① 字符串来源用 AST（`StringLiteral` / 模板串），注释天然不参与 —— 不再剥注释；
// ② `var(--tok, fallback)` 的回退值：**只有 `--tok` 确实在主题/令牌里定义过**才豁免。
//    未定义的令牌 + 字面回退 = 静默的硬编码，一律报出；
// ③ `color-mix` 按"是否由两个不同颜色混合 / 是否含 100% 分量"判定，中性一侧不看**写法**
//    （`black` 与 `#000` 一视同仁）；
// ④ 半透明 `rgba()/hsla()`（alpha<1，支持数字/百分比/slash 三种语法）放行。
const COLOR_LITERAL_ALLOW: Record<string, Record<string, string>> = {
  'zcode-theme.ts': { '*': '令牌真值源' },
  'zcode-tokens.ts': { '*': '令牌真值源' },
  // 第三方品牌图标：Telegram/微信/QQ/Slack 等商标色，不属设计系统、不该改。
  'channel-brand.tsx': { '*': '第三方品牌商标色' },
  'ConnectorsSection.tsx': { CUSTOM_PROPERTY_IFRAME: 'iframe 注入串（跨文档不继承令牌）' },
  'CodexSidebar.tsx': {
    '#f0f0f0': '玻璃皮肤 @supports 回退（镜像亮色侧栏底）',
    '#161616': '玻璃皮肤 @supports 回退（镜像暗色侧栏底）',
  },
  'TurnNavigator.tsx': {
    '#3a3d3c': '画布浮层固定深底（双主题共用）',
    '#e8ebe9': '画布浮层固定浅字（双主题共用，9.14:1）',
  },
  'settings-page-styles.ts': {
    '#6b6b6b': '--sp-muted 亮色档（设置页专用底色上 AA）',
    '#8f8f8f': '--sp-muted 暗色档',
    '#9a9a9a': '--sp-muted-on-card 暗色档',
  },
}

/** 全仓真实定义过的自定义属性名（用于校验 var() 回退是否安全）。 */
const DEFINED_CUSTOM_PROPERTIES = new Set<string>()
for (const { text } of clientFiles) {
  for (const m of text.matchAll(/(--[a-z][\w-]*)\s*:/g)) DEFINED_CUSTOM_PROPERTIES.add(m[1])
}

const NAMED_COLORS = new Set([
  'aliceblue','antiquewhite','aqua','aquamarine','azure','beige','bisque','black','blanchedalmond',
  'blue','blueviolet','brown','burlywood','cadetblue','chartreuse','chocolate','coral','cornflowerblue',
  'cornsilk','crimson','cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkgrey',
  'darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon',
  'darkseagreen','darkslateblue','darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink',
  'deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','fuchsia',
  'gainsboro','ghostwhite','gold','goldenrod','gray','green','greenyellow','grey','honeydew','hotpink',
  'indianred','indigo','ivory','khaki','lavender','lavenderblush','lawngreen','lemonchiffon','lightblue',
  'lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen','lightgrey','lightpink',
  'lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue',
  'lightyellow','lime','limegreen','linen','magenta','maroon','mediumaquamarine','mediumblue',
  'mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise',
  'mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','navy','oldlace',
  'olive','olivedrab','orange','orangered','orchid','palegoldenrod','palegreen','paleturquoise',
  'palevioletred','papayawhip','peachpuff','peru','pink','plum','powderblue','purple','rebeccapurple',
  'red','rosybrown','royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell','sienna',
  'silver','skyblue','slateblue','slategray','slategrey','snow','springgreen','steelblue','tan','teal',
  'thistle','tomato','turquoise','violet','wheat','white','whitesmoke','yellow','yellowgreen',
])
const NEUTRALS = new Set(['black', 'white', 'transparent', 'currentcolor', 'grey', 'gray',
  '#000', '#000000', '#fff', '#ffffff'])

/** 取一个颜色函数的 alpha 段，判定是否真的半透明。 */
const alphaOf = (token: string): number | undefined => {
  // 现代语法 `rgb(... / 50%)` / `hsl(... / .5)` 也带 alpha，不能只认 rgba/hsla 前缀。
  const inner = /^(?:rgba?|hsla?)\(([^)]*)\)$/i.exec(token)?.[1]
  if (inner === undefined) return undefined
  let alpha: string | undefined
  if (inner.includes('/')) alpha = inner.split('/')[1]?.trim()
  else {
    const parts = inner.split(',').map(part => part.trim())
    if (parts.length >= 4) alpha = parts[3]
  }
  if (alpha === undefined) return undefined
  const value = alpha.endsWith('%') ? Number.parseFloat(alpha) / 100 : Number.parseFloat(alpha)
  return Number.isNaN(value) ? undefined : value
}

const isTranslucent = (token: string): boolean => {
  const alpha = alphaOf(token)
  if (alpha !== undefined) return alpha < 1
  if (/^color-mix\(/i.test(token)) {
    // 含 100% 分量 → 等于纯色，算字面量。
    if (/[\s,(]100%/i.test(token)) return false
    // 2026-10-18（第三轮复核 R4）：首版「颜色数 <= 1 就当叠中性」是错的 ——
    // `color-mix(in srgb, var(--dcu-primary) 90%, black 10%)` 只数到 black 一个颜色
    // （var() 不是 hex/命名色），于是被判半透明放行，而它结果**完全不透明**。
    // 正确判据：只有当**中性一侧是 transparent** 时才是"叠一层透明"；
    // 叠到 black/white 上会改变明度，属于造新档位，必须算字面量。
    const lower = token.toLowerCase()
    const hasTransparent = /\btransparent\b/.test(lower)
    if (hasTransparent) return true
    // 一侧是中性（NEUTRALS 真正派上用场）、另一侧是颜色 → 结果是新的不透明档位。
    const neutralSide = [...NEUTRALS].some(neutral => new RegExp('(?:^|[\\s,(])' + escapeRegexLiteral(neutral) + '(?=[\\s,)]|$)').test(lower))
    if (neutralSide) return false
    return true
  }
  return false
}

const colorViolations: string[] = []
const COLOR_TOKEN_PATTERN = new RegExp(
  '#[0-9a-fA-F]{3,8}\\b'
  + '|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\\([^()]*(?:\\([^()]*\\)[^()]*)*\\)'
  + '|(?<![\\w-])(?:' + [...NAMED_COLORS].join('|') + ')(?![\\w-])',
  'gi',
)

for (const { name, text } of clientFiles) {
  const allow = COLOR_LITERAL_ALLOW[name] ?? {}
  if (allow['*'] !== undefined) continue
  // ① 用 AST 取所有字符串（注释天然不在其中，不会被跨字符串"擦除"）
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const chunks: string[] = []
  const collect = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) chunks.push(node.text)
    else if (ts.isTemplateExpression(node)) {
      chunks.push(node.head.text, ...node.templateSpans.map(span => span.literal.text))
    }
    ts.forEachChild(node, collect)
  }
  collect(source)
  // 模板串内部的 CSS 注释（`/* … */`）是字符串内容，AST 不会剥；
  // 而本仓把设计理由直接写在样式表里（settings-page-styles.ts 有整段注释说明为何保留字面量），
  // 那些注释里提到的颜色不能被当成真实声明。这里逐块剥 CSS 注释。
  const pool = chunks.map(chunk => chunk.replace(/\/\*[\s\S]*?\*\//g, '')).join('\n')
  // iframe 注入串 = 该文件里那三个 `frame*Theme` 模板串。只有落在它们内部的色值才享受结构豁免。
  const iframeInjectionText = allow.CUSTOM_PROPERTY_IFRAME === undefined
    ? null
    : (() => {
        const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
        const parts: string[] = []
        const walk = (node: ts.Node): void => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^frame(?:Light|Dark|Surface)Theme$/.test(node.name.text)) {
            if (node.initializer !== undefined) {
              const body = templateText(node.initializer)
              if (body !== undefined) parts.push(body)
            }
          }
          ts.forEachChild(node, walk)
        }
        walk(source)
        return parts.join('\n')
      })()
  // ② 剥 var(--tok, fallback)：只有 tok 已定义时才豁免该回退
  // 回退值豁免的判据：
  //   · `--dsw-*` 是**宿主**令牌，本仓库不定义（由 DSH 注入），必须留回退 → 豁免；
  //   · `--dcu-*` / 其他前缀是本仓自己的令牌 → **必须真的定义过**，否则令牌名打错
  //     就是静默硬编码（第三轮复核用 `--dcu-zzz-brand,#ff0000` 实证了这一点）。
  const withoutSafeFallback = pool.replace(/var\(\s*(--[\w-]+)\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/g,
    (whole, token: string) => {
      // `--dsw-*` 是 DSH 宿主令牌，`--we-*` 是 Wallpaper Engine 注入的令牌，
      // 两者都由外部提供、本仓库不定义，必须留回退。
      if (token.startsWith('--dsw-') || token.startsWith('--we-')) return 'var(--ok)'
      return DEFINED_CUSTOM_PROPERTIES.has(token) ? 'var(--ok)' : whole
    })
  for (const token of new Set(collectTokens(withoutSafeFallback))) {
    if (isTranslucent(token)) continue
    if (allow[token] !== undefined) continue
    // ⚠ 2026-10-18（第三轮复核 R7）：首版判据是「文件里出现过 `--x: <token>` 就放行」，
    // 这是**全局形态匹配**而非「位置匹配」—— 在 ConnectorsSection 里随便写 `--brand:#ff0000`
    // 也会被豁免。正确判据：该 token 必须出现在 iframe 注入模板串**内部**。
    if (allow.CUSTOM_PROPERTY_IFRAME !== undefined
      && iframeInjectionText !== null
      && new RegExp('--[\\w-]+\\s*:\\s*' + escapeRegExp(token)).test(iframeInjectionText)) continue
    colorViolations.push(`${name}: ${token}`)
  }
}

function collectTokens(source: string): string[] {
  return [...source.matchAll(COLOR_TOKEN_PATTERN)].map(m => m[0])
}
function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

assert.deepEqual(
  colorViolations.sort(),
  [],
  `发现未登记的颜色字面量：${colorViolations.sort().join('、')}。\n`
  + '扫描口径：AST 取出的所有字符串里的颜色 token（hex/rgb/hsl/命名色/oklch 等），'
  + '不区分属性名，包含自定义属性定义。\n'
  + '`var(--tok, #hex)` 仅在 `--tok` **确实定义过**时豁免 —— 令牌名打错就是静默硬编码。',
)
console.log('✓ 颜色字面量全量扫描：CSS 声明与 JS 赋值均无未登记字面量')

// ── 11. 输入区视觉：加号 hover-only / 回到底部居中 ─────────────────────────────
// 用户要求（2026-10-18）：加号的圆形底只在 hover/focus 出现；回到底部按钮居中。
// 这里锁住两条意图，防止后续样式重构把它们悄悄改回常驻圆/靠右。
const composerVisuals = read('composer-visuals.ts')
assert.ok(
  composerVisuals.includes(':not(:hover):not(:focus-visible)'),
  '加号的圆形底必须只在 hover/focus-visible 出现（静止态透明）',
)
assert.ok(
  composerVisuals.includes('var(--dsw-alias-interactive-bg-hover-solid)'),
  '加号 hover 的圆形底必须走宿主语义令牌，不能硬编码颜色',
)
assert.ok(
  composerVisuals.includes('justify-content:center'),
  '回到底部按钮必须居中（覆盖宿主的 flex-end）',
)
assert.ok(
  composerVisuals.includes('padding-right:0'),
  '回到底部槽的 195px 右内边距必须清零，否则只是“内容盒居中”仍偏左',
)
console.log('✓ 输入区视觉：加号圆底 hover-only、回到底部居中')
