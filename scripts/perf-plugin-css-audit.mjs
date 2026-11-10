/**
 * 插件注入的 CSS：真实规则数，以及哪些选择器在样式匹配时最贵。
 *
 * ## 口径
 *
 * 把 `src/client` 下**每一个**模板串都交给真实 Chromium 解析，只统计能产出
 * `cssRules` 的那些——**让浏览器当裁判**，不自己用正则猜「这看起来像 CSS」。
 *
 * 为什么必须这样：正则筛「含 { 和 冒号」会同时收进 URL 模板串、JS 对象字面量、
 * 内联样式片段。实测 565 个模板串里只有几十个是真 CSS，正则筛选的召回率不到 10%，
 * 而误判会让"规则总数"这个数字既虚高又不可复现。
 *
 * ## 量什么
 *
 * 1. 规则总数（含 @media 递归）；
 * 2. 四类「已知会拖慢样式匹配」的选择器形态：
 *    - `[class*=]` / `[class$=]` 属性子串匹配：要对**每个元素的 class 字符串**做子串搜索
 *    - `:has(...)`：需要回溯检查祖先/兄弟，最坏情况打穿整棵子树
 *    - 深层后代组合（≥4 层）：最坏情况从根逐层回溯
 *    - 后代通配 `*`：对每个后代元素都尝试匹配
 * 3. 在真实规模 DOM 上量「这批规则」的增量成本。
 *
 * 用法：node scripts/perf-plugin-css-audit.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const files = readdirSync('src/client').filter(f => /\.(ts|tsx)$/.test(f))
const candidates = []
for (const f of files) {
  const src = readFileSync('src/client/' + f, 'utf8')
  for (const m of src.matchAll(/`([\s\S]*?)`/g)) candidates.push([f, m[1]])
}

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })

const result = await p.evaluate((list) => {
  const perFile = {}
  const selectors = []
  const rejected = []
  let realBlocks = 0
  for (const [f, body] of list) {
    const s = document.createElement('style')
    s.textContent = body
    document.head.appendChild(s)
    const rules = []
    if (s.sheet) {
      // ⚠️ 必须先判 selectorText，再判 cssRules。
      // Chromium 为支持 CSS 嵌套，给普通 CSSStyleRule 也挂了一个**空的** `cssRules`
      // （CSSRuleList）。若写成 `if (r.cssRules) walk(...) else if (r.selectorText)`，
      // 就会钻进空表、永远不记录 selectorText —— 表现为「565 个模板串全部解析出 0 条规则」。
      // 这个假 0 曾被误读成「模板串里没有真 CSS」，白折腾两轮。
      const walk = (rs) => {
        for (const r of rs) {
          if (r.selectorText) rules.push(r.selectorText)
          if (r.cssRules && r.cssRules.length > 0) walk(r.cssRules)
        }
      }
      walk(s.sheet.cssRules)
    }
    s.remove()
    if (rules.length === 0) { rejected.push(f); continue }
    realBlocks++
    perFile[f] = (perFile[f] ?? 0) + rules.length
    selectors.push(...rules)
  }
  const cls = {
    attrSubstring: selectors.filter(s => /\[class[*^$]=/.test(s)),
    hasPseudo: selectors.filter(s => s.includes(':has(')),
    deep4: selectors.filter(s => (s.match(/[\s>]/g) || []).length >= 4),
    descendantStar: selectors.filter(s => /[ >]\*/.test(s)),
  }
  return {
    perFile, total: selectors.length, realBlocks, rejected: rejected.length,
    counts: Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, v.length])),
    samples: {
      attrSubstring: cls.attrSubstring.slice(0, 12),
      deep4: cls.deep4.slice(0, 10),
      descendantStar: cls.descendantStar.slice(0, 6),
    },
  }
}, candidates)

const ranked = Object.entries(result.perFile).sort((a, b) => b[1] - a[1])
console.log('插件注入 CSS（浏览器 CSSOM 口径，浏览器自己判定哪些模板串是 CSS）')
console.log(`  模板串 ${candidates.length} 个 → 真 CSS 样式块 ${result.realBlocks} 个（其余 ${result.rejected} 个不是 CSS，已丢弃）`)
console.log(`  真实规则总数: ${result.total}`)
console.log('')
console.log('分类计数:')
for (const [k, v] of Object.entries(result.counts)) {
  console.log(`  ${k.padEnd(16)} ${String(v).padStart(4)}  (${(v / result.total * 100).toFixed(1)}%)`)
}
console.log('')
console.log('按文件（Top 12）:')
for (const [f, n] of ranked.slice(0, 12)) console.log(`  ${String(n).padStart(4)}  ${f}`)
console.log('')
console.log('【属性子串选择器】每个元素每次重算都要对其 class 字符串做子串搜索:')
for (const s of result.samples.attrSubstring) console.log('   ', s.slice(0, 140))
console.log('')
console.log('【深层后代 ≥4 层】最坏情况从根逐层回溯:')
for (const s of result.samples.deep4) console.log('   ', s.slice(0, 140))
console.log('')
console.log('【后代通配】:')
for (const s of result.samples.descendantStar) console.log('   ', s.slice(0, 140))

await b.close()
