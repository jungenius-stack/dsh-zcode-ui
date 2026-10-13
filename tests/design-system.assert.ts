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
