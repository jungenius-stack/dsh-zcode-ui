/** 对比：推理过程渲染 / 不渲染 对打字与按键成本的影响。 */
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
const msgs = JSON.parse(readFileSync('/tmp/replay/sess-bbb-reason.json', 'utf8'))

const b = await chromium.launch({ headless: true })
console.log('reasoning 节点数   打字中位ms  React提交ms  布局ms   样式重算ms')
for (const withReasoning of [false, true]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.setContent(`<style>html,body{margin:0;height:100%}
    #thread{height:60vh;overflow-y:auto}
    .msg{margin:0 0 12px}.msg p{margin:0 0 6px;line-height:1.6}
    .reasoning{background:#f8f8f8;border-left:2px solid #ddd;padding:6px;margin:6px 0}
    .reason-body{max-height:80px;overflow:hidden}</style><div id="root"></div>`)
  await p.addStyleTag({ content: fixtureTokenStyle('light') })
  await p.addStyleTag({ content: theme })
  await p.addStyleTag({ content: skin })
  await p.addStyleTag({ content: wbLayers })
  await p.addScriptTag({ content: react })
  await p.addScriptTag({ content: reactDom })
  await p.addScriptTag({ content: `window.MSGS = ${JSON.stringify(msgs)};` })
  await p.addScriptTag({ path: '/tmp/mount-reasoning.js' })
  await p.evaluate(w => { document.getElementById('root').innerHTML = ''; window.mountReasoning(54, w) }, withReasoning)
  await p.waitForTimeout(1200)

  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Performance.enable')
  const G = (m, k) => (m.metrics.find(x => x.name === k) || {}).value || 0

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
  const before = await cdp.send('Performance.getMetrics')
  await p.evaluate(() => { document.body.classList.toggle('probe') })
  const after = await cdp.send('Performance.getMetrics')
  const recalc = (G(after, 'RecalcStyleDuration') - G(before, 'RecalcStyleDuration')) * 1000

  console.log([(withReasoning ? '有' : '无').padEnd(9), String(r.nodes).padEnd(9),
    r.total.toFixed(2).padEnd(10), r.commit.toFixed(2).padEnd(12), r.layout.toFixed(2).padEnd(8), recalc.toFixed(2)].join(''))
  await p.close()
}
await b.close()
