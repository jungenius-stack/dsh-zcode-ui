/**
 * 隔离「React 提交」与「浏览器帧」成本。
 *
 * ## 上一版的错误
 *
 * 用 `requestAnimationFrame` 两次等 React 提交，读数恒为 33.3ms —— 那是**两帧的固定时长**
 * （16.67×2），不是渲染成本。「消息树完全隔离、仅 12 节点」也是 33.3ms 就是铁证：
 * 测到的是等待时钟，不是被测对象。
 *
 * ## 正确做法
 *
 * 用 `ReactDOM.flushSync` 强制同步提交，在同一个宏任务里计时——
 * 测到的才是「state 更新 → DOM 提交完成」的真实成本。
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
const msgs = JSON.parse(readFileSync('/tmp/replay/messages.json', 'utf8'))
const react = readFileSync('node_modules/react/umd/react.production.min.js', 'utf8')
const reactDom = readFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'utf8')

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.setContent(`<style>html,body{margin:0;height:100%}
  #thread{height:60vh;overflow-y:auto;padding:8px}
  .msg{margin:0 0 12px}.msg pre{background:#f6f6f6;padding:8px;font-size:12px}
  .msg p{margin:0 0 6px;line-height:1.6}</style><div id="root"></div>`)
await p.addScriptTag({ content: react })
await p.addScriptTag({ content: reactDom })
await p.addScriptTag({ content: `
window.MSGS = ${JSON.stringify(msgs)};
window.mount = function(limit, isolated, memoRows){
  const h = React.createElement
  const list = limit ? MSGS.slice(0, limit) : MSGS
  function Row({m,i}){
    return h('div',{className:'msg'},
      h('div',null, m.r==='tool' ? '工具 '+i : '助手 '+i),
      m.r==='tool' ? h('pre',null,m.t) : h('div',null,m.t.split('\\n\\n').map((x,k)=>h('p',{key:k},x))))
  }
  const Comp = memoRows ? React.memo(Row) : Row
  function App(){
    const [t,setT] = React.useState('')
    window.__set = setT
    return h('div',null,
      h('input',{id:'ed',value:t,onChange:e=>setT(e.target.value)}),
      h('div',{id:'thread'}, isolated ? h('div',null,'[隔离]')
        : list.map((m,i)=>h(Comp,{key:i,m,i}))))
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App))
}
`})

const run = async (limit, isolated, memoRows, label) => {
  await p.evaluate(({limit,isolated,memoRows}) => { document.getElementById('root').innerHTML=''; window.mount(limit,isolated,memoRows) }, {limit,isolated,memoRows})
  await p.waitForTimeout(700)
  const r = await p.evaluate(async () => {
    const ed=document.getElementById('ed'); ed.focus()
    const nodes=document.querySelectorAll('*').length
    const commit=[], layout=[]
    for(let i=0;i<15;i++){
      const t0=performance.now()
      // 强制同步提交：测「state → DOM」的真实成本
      ReactDOM.flushSync(() => window.__set('x'+i))
      const t1=performance.now()
      void document.body.offsetHeight   // 强制布局结算
      layout.push(performance.now()-t1)
      commit.push(t1-t0)
    }
    const med=a=>{a.sort((x,y)=>x-y);return a[7]}
    return {nodes, commit:med(commit), layout:med(layout)}
  })
  console.log(`${label.padEnd(28)} 节点 ${String(r.nodes).padEnd(7)} React提交 ${r.commit.toFixed(1).padStart(6)}ms  布局 ${r.layout.toFixed(1)}ms`)
}

await run(0, true, false, '隔离(仅输入框)')
await run(200, false, false, '200 条 · 无 memo')
await run(200, false, true,  '200 条 · memo')
await run(1000, false, false,'1000 条 · 无 memo')
await run(1000, false, true, '1000 条 · memo')
await run(2113, false, false,'2113 条(全量) · 无 memo')
await run(2113, false, true, '2113 条(全量) · memo')
await b.close()
