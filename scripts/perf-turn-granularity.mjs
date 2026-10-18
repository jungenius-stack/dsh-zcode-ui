/**
 * 验证「turn 级虚拟滚动」的失效条件。
 *
 * ## 宿主机制（读 dsh-client-ui-chat 源码确认）
 *
 * ```
 * useVirtualizer({
 *   count: items.length,          // ← items 是 **turn** 列表，不是消息列表
 *   estimateSize: () => 10,       // ← 固定估算 10px
 *   measureElement: () => 10,     // ← 不测量真实高度
 *   overscan: 1,
 * })
 * ```
 *
 * **一个 turn 内的所有消息全部渲染**。所以：
 *   · 内容分散在多个 turn → 虚拟滚动生效，只渲染 2–3 个 turn
 *   · 内容集中在单个 turn → 该 turn 的全部消息同时进 DOM，虚拟滚动失效
 *
 * 两个真实会话正好是这两种极端：
 *   A（不卡）：13 turn / 5994 事件
 *   B（卡）  ： 3 turn / 1428 事件，但 **turn 3 独占 540 个渲染单元**
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const read = n => readFileSync('src/client/' + n, 'utf8')
const grab = (n, re) => read(n).match(re)[1]
const theme = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)
const skin = grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/)
const wb = read('CodexWorkspaceBrowser.tsx')
const wbLayers = ['stylesheet','runningStyles','typographyStyles','collectionLayoutStyles']
  .map(k => { const m = wb.match(new RegExp('const ' + k + ' = `([\\s\\S]*?)`')); return m ? m[1] : '' }).join('\n')
const react = readFileSync('node_modules/react/umd/react.production.min.js', 'utf8')
const reactDom = readFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'utf8')

const b = await chromium.launch({ headless: true })
console.log('渲染单元数  节点数   打字ms  React提交ms  布局ms   首屏ms')
for (const units of [60, 200, 540, 1000]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const t0 = Date.now()
  await p.setContent(`<style>html,body{margin:0;height:100%}
    #thread{height:70vh;overflow-y:auto}
    .row{margin:0 0 8px;border-left:2px solid #ddd;padding:4px 8px}
    .row p{margin:0 0 4px;line-height:1.6}
    .reason{max-height:80px;overflow:hidden;background:#f8f8f8;font-size:12px}</style><div id="root"></div>`)
  await p.addStyleTag({ content: fixtureTokenStyle('light') })
  await p.addStyleTag({ content: theme })
  await p.addStyleTag({ content: skin })
  await p.addStyleTag({ content: wbLayers })
  await p.addScriptTag({ content: react })
  await p.addScriptTag({ content: reactDom })
  await p.addScriptTag({ path: '/tmp/mount-units.js' })
  await p.evaluate(u => { window.mountUnits(u) }, units)
  await p.waitForTimeout(1000)
  const loadMs = Date.now() - t0

  const r = await p.evaluate(async () => {
    document.getElementById('ed').focus()
    const nodes = document.querySelectorAll('*').length
    const total = [], commit = [], layout = []
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now()
      ReactDOM.flushSync(() => window.__set('x' + i))
      const t1 = performance.now()
      void document.body.offsetHeight
      layout.push(performance.now() - t1); commit.push(t1 - t0); total.push(performance.now() - t0)
    }
    const med = a => { a.sort((x, y) => x - y); return a[7] }
    return { nodes, total: med(total), commit: med(commit), layout: med(layout) }
  })
  console.log([String(units).padEnd(12), String(r.nodes).padEnd(8),
    r.total.toFixed(2).padEnd(8), r.commit.toFixed(2).padEnd(12), r.layout.toFixed(2).padEnd(8), String(loadMs)].join(''))
  await p.close()
}
await b.close()
