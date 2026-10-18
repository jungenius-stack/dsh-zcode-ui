/**
 * 真实 React 重渲染重放：用生产版 React UMD + 真实会话数据。
 *
 * ## 为什么必须这样测
 *
 * 前七轮的「打字」都是改 textContent，**不会触发 React 重渲染**——
 * 而真实打字是「输入框 state 更新 → 父组件重渲染 → 消息列表整棵重渲染」。
 * 如果消息行没有 memo，2113 条消息每次按键都会全部重渲染，这才是卡顿的机制。
 *
 * 用法：node scripts/perf-react-replay.mjs
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const msgs = JSON.parse(readFileSync('/tmp/replay/messages.json', 'utf8'))
const react = readFileSync('node_modules/react/umd/react.production.min.js', 'utf8')
const reactDom = readFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'utf8')

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
  #thread{height:60vh;overflow-y:auto;padding:8px}
  .msg{margin:0 0 12px}.msg .hdr{font-size:12px;color:#888}
  .msg pre{background:#f6f6f6;padding:8px;overflow-x:auto;font-size:12px}
  .msg p{margin:0 0 6px;line-height:1.6}
  #ed{width:100%;height:80px;font-size:14px}</style>
  <div id="root"></div>`)
await p.addStyleTag({ content: fixtureTokenStyle('light') })
await p.addScriptTag({ content: react })
await p.addScriptTag({ content: reactDom })
await p.addScriptTag({ content: `
window.MSGS = ${JSON.stringify(msgs)};
window.mountApp = function (useMemo) {
  const h = React.createElement
  function Row({ m, i }) {
    if (m.r === 'tool') return h('div', { className: 'msg tool' }, h('div', { className: 'hdr' }, '工具结果 ' + i), h('pre', null, m.t))
    return h('div', { className: 'msg assistant' }, h('div', { className: 'hdr' }, '助手 ' + i),
      h('div', { className: 'reasoning' }, h('span', null, '推理过程')),
      h('div', { className: 'body' }, m.t.split('\\n\\n').map((x, k) => h('p', { key: k }, x))))
  }
  const RowMemo = React.memo(Row)
  const Comp = useMemo ? RowMemo : Row
  function App() {
    const [text, setText] = React.useState('')
    window.__setText = setText
    return h('div', null,
      h('input', { id: 'ed', value: text, onChange: e => setText(e.target.value) }),
      h('div', { id: 'thread' }, MSGS.map((m, i) => h(Comp, { key: i, m, i }))))
  }
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(h(App))
}
`})

for (const useMemo of [false, true]) {
  await p.evaluate(m => { document.getElementById('root').innerHTML = ''; window.mountApp(m) }, useMemo)
  await p.waitForTimeout(800)
  const nodes = await p.evaluate(() => document.querySelectorAll('*').length)

  const r = await p.evaluate(async () => {
    const ed = document.getElementById('ed')
    const nodes = document.querySelectorAll('*').length
    ed.focus()
    const ticks = []
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now()
      window.__setText('输入内容' + i)
      // 等 React 提交完成
      await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
      ticks.push(performance.now() - t0)
    }
    ticks.sort((a, b) => a - b)
    return { median: ticks[Math.floor(ticks.length / 2)], max: ticks[ticks.length - 1], nodes }
  })
  console.log(`${useMemo ? 'memo 包裹' : '无 memo '} | 节点 ${String(r.nodes).padEnd(7)} | 按键中位 ${r.median.toFixed(1).padStart(7)}ms | 最差 ${r.max.toFixed(1)}ms`)
}
await b.close()
