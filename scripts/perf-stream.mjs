/**
 * 关键实验：流式输出时 store 高频更新，侧栏是否会跟着重渲染。
 *
 * ## 假设
 *
 * 插件用 `useSessions(state => state)` 全量订阅。若宿主在流式输出时高频推送
 * 新快照，侧栏就会**每次推送都重渲染整棵树**（哪怕显示的会话没有任何可见变化）。
 * 这能解释「长上下文下打字/按键都慢」——因为流式期间 store 一直在变。
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
const msgs = JSON.parse(readFileSync('/tmp/replay/messages.json', 'utf8'))

const b = await chromium.launch({ headless: true })
console.log('会话数 行memo  100 次 store 推送总耗时   每次ms')
for (const sessionCount of [54, 300]) {
  for (const memoRows of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.setContent(`<style>html,body{margin:0;height:100%}
      #thread{height:60vh;overflow-y:auto}.msg{margin:0 0 12px}
      .msg pre{background:#f6f6f6;padding:8px;font-size:12px}.msg p{margin:0 0 6px}</style><div id="root"></div>`)
    await p.addStyleTag({ content: fixtureTokenStyle('light') })
    await p.addStyleTag({ content: theme })
    await p.addStyleTag({ content: skin })
    await p.addStyleTag({ content: wbLayers })
    await p.addScriptTag({ content: react })
    await p.addScriptTag({ content: reactDom })
    await p.addScriptTag({ content: `window.MSGS = ${JSON.stringify(msgs)};` })
    await p.addScriptTag({ path: '/tmp/mount-stream.js' })
    await p.evaluate(({s,m}) => { document.getElementById('root').innerHTML=''; window.mountStream(s,m) }, {s:sessionCount,m:memoRows})
    await p.waitForTimeout(700)

    const r = await p.evaluate(async () => {
      const t = []
      for (let i = 0; i < 100; i++) {
        const t0 = performance.now()
        ReactDOM.flushSync(() => window.__store.push(i))
        void document.body.offsetHeight
        t.push(performance.now() - t0)
      }
      t.sort((a, b) => a - b)
      return { total: t.reduce((a, c) => a + c, 0), median: t[50], max: t[99] }
    })
    console.log([String(sessionCount).padEnd(6), (memoRows?'memo':'无memo').padEnd(6),
      r.total.toFixed(1).padStart(10), '           ', r.median.toFixed(3)].join(''))
    await p.close()
  }
}
await b.close()
