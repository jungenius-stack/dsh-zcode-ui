/**
 * 侧栏会话行的重渲染成本：模拟真实会话数（用户有数百个会话）。
 *
 * ## 测什么
 *
 * `CodexWorkspaceBrowser` 里 `recentIds.map(...)` 每次渲染都重建全部 SessionRow，
 * 且每行传入 10+ 个内联箭头函数。真实打字若触发侧栏重渲染，
 * 这部分成本随会话数线性增长。
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
await p.setContent('<div id="root"></div>')
await p.addStyleTag({ content: fixtureTokenStyle('light') })
await p.addStyleTag({ content: theme })
await p.addStyleTag({ content: skin })
await p.addStyleTag({ content: wbLayers })
await p.addScriptTag({ content: react })
await p.addScriptTag({ content: reactDom })
await p.addScriptTag({ path: '/tmp/mount-sidebar.js' })


for (const count of [100, 300, 800]) {
  for (const memoRows of [false, true]) {
    await p.evaluate(({count,memoRows}) => { document.getElementById('root').innerHTML=''; window.mountSidebar(count,memoRows) }, {count,memoRows})
    await p.waitForTimeout(600)
    const r = await p.evaluate(async () => {
      document.getElementById('ed').focus()
      const nodes=document.querySelectorAll('*').length
      const commit=[], layout=[]
      for(let i=0;i<15;i++){
        const t0=performance.now()
        ReactDOM.flushSync(()=>window.__set('x'+i))
        const t1=performance.now()
        void document.body.offsetHeight
        layout.push(performance.now()-t1); commit.push(t1-t0)
      }
      const med=a=>{a.sort((x,y)=>x-y);return a[7]}
      return {nodes, commit:med(commit), layout:med(layout)}
    })
    console.log(`${String(count).padEnd(5)} 行 · ${(memoRows?'memo':'无memo').padEnd(7)} 节点 ${String(r.nodes).padEnd(6)} React提交 ${r.commit.toFixed(2).padStart(6)}ms  布局 ${r.layout.toFixed(2)}ms`)
  }
}
await b.close()
