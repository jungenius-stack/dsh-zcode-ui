/** 完整链路：侧栏 + 真实会话，测一次按键的真实总成本（React 提交 + 布局 + 绘制预算）。 */
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
const msgs = JSON.parse(readFileSync('/tmp/replay/messages.json', 'utf8'))

const b = await chromium.launch({ headless: true })
for (const memoRows of [false, true]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
    #thread{height:60vh;overflow-y:auto;padding:8px}
    .msg{margin:0 0 12px}.msg pre{background:#f6f6f6;padding:8px;font-size:12px}
    .msg p{margin:0 0 6px;line-height:1.6}</style><div id="root"></div>`)
  await p.addStyleTag({ content: fixtureTokenStyle('light') })
  await p.addStyleTag({ content: theme })
  await p.addStyleTag({ content: skin })
  await p.addStyleTag({ content: wbLayers })
  await p.addScriptTag({ content: react })
  await p.addScriptTag({ content: reactDom })
  await p.addScriptTag({ content: `window.__MSGS__ = ${JSON.stringify(msgs)};` })
  await p.addScriptTag({ path: '/tmp/mount-both.js' })
  await p.evaluate(m => { document.getElementById('root').innerHTML = ''; window.mountBoth(300, 0, m) }, memoRows)
  await p.waitForTimeout(900)
  const r = await p.evaluate(async () => {
    document.getElementById('ed').focus()
    const nodes = document.querySelectorAll('*').length
    const total = [], commit = [], layout = []
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now()
      ReactDOM.flushSync(() => window.__set('x' + i))
      const t1 = performance.now()
      void document.body.offsetHeight
      layout.push(performance.now() - t1); commit.push(t1 - t0)
      total.push(performance.now() - t0)
    }
    const med = a => { a.sort((x, y) => x - y); return a[7] }
    return { nodes, commit: med(commit), layout: med(layout), total: med(total) }
  })
  console.log(`${(memoRows ? 'memo' : '无memo').padEnd(8)} 节点 ${String(r.nodes).padEnd(7)} React提交 ${r.commit.toFixed(2).padStart(6)}ms  布局 ${r.layout.toFixed(2).padStart(5)}ms  合计 ${r.total.toFixed(2).padStart(6)}ms`)
  await p.close()
}
await b.close()
