/** 量化「MutationObserver 里做全文档 querySelectorAll」的成本。 */
import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
const units = n => { let h=''; for(let i=0;i<n;i++) h+=`<div class="row" role="listitem"><p>消息 ${i} 内容文本</p></div>`; return h }
console.log('节点数   querySelectorAll 耗时us   每秒可执行次数')
for (const n of [500, 3000, 10000, 30000]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.setContent(`<div id="t">${units(n)}</div><div id="tail"></div>`)
  await p.waitForTimeout(300)
  const r = await p.evaluate(async () => {
    const nodes = document.querySelectorAll('*').length
    // 模拟每次 mutation 触发一次全文档查询
    const N = 200
    const t0 = performance.now()
    for (let i = 0; i < N; i++) document.querySelectorAll('[role="menu"],[role="listbox"]')
    const per = (performance.now() - t0) / N
    return { nodes, perUs: per * 1000 }
  })
  console.log([String(r.nodes).padEnd(8), r.perUs.toFixed(0).padEnd(26), (1000/r.perUs).toFixed(0)].join(''))
  await p.close()
}
await b.close()
