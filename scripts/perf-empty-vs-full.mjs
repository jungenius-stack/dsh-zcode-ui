/**
 * 最终对照：同一套样式、同样的输入框，只有「消息区渲染量」不同。
 * 用来回答：打字卡顿是否随渲染单元数增长。
 *
 * 关键是**同一次页面会话内切换**，排除启动开销差异。
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
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
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

console.log('同一页面内切换渲染量（排除启动差异）')
console.log('渲染单元  memo  节点数   打字中位ms  打字p95ms  React提交ms')
for (const noMemo of [false, true]) for (const units of [100, 540, 1000, 2000]) {
  await p.evaluate(v => { window.__NO_MEMO__ = v }, noMemo)
  await p.evaluate(u => { document.getElementById('root').innerHTML = ''; window.mountUnits(u) }, units)
  await p.waitForTimeout(900)
  const r = await p.evaluate(async () => {
    document.getElementById('ed').focus()
    const nodes = document.querySelectorAll('*').length
    const total = [], commit = []
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now()
      ReactDOM.flushSync(() => window.__set('x' + i))
      const t1 = performance.now()
      void document.body.offsetHeight
      commit.push(t1 - t0); total.push(performance.now() - t0)
    }
    total.sort((a, b) => a - b); commit.sort((a, b) => a - b)
    return { nodes, med: total[10], p95: total[18], cmed: commit[10] }
  })
  console.log([String(units).padEnd(10), (noMemo?'无':'有').padEnd(5), String(r.nodes).padEnd(8), r.med.toFixed(2).padEnd(11), r.p95.toFixed(2).padEnd(10), r.cmed.toFixed(2)].join(''))
}
await b.close()
