/**
 * 决定性实验：MutationObserver + 全文档 querySelectorAll 在真实 DOM 规模下的成本。
 *
 * 对标插件现状（composer-tool-menus.ts:148-153）：
 *   observer.observe(document.body, { childList: true, subtree: true })
 *   回调里 for (const menu of document.querySelectorAll('[role="menu"],[role="listbox"]'))
 */
import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
const units = n => { let h=''; for(let i=0;i<n;i++) h+=`<div class="row" role="listitem"><p>消息 ${i} 第 1 段内容</p><p>第 2 段内容文本</p><p>第 3 段</p></div>`; return h }

console.log('渲染单元  节点数   200次DOM变动耗时   每次us   有图querySelectorAll   每次us')
for (const n of [100, 540, 1000, 2000]) {
  for (const withQs of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.setContent(`<div id="t">${units(n)}</div><div id="tail"></div>`)
    await p.waitForTimeout(300)
    const r = await p.evaluate(async (withQs) => {
      const nodes = document.querySelectorAll('*').length
      let fired = 0
      const obs = new MutationObserver(() => {
        fired++
        if (withQs) document.querySelectorAll('[role="menu"],[role="listbox"]')
      })
      obs.observe(document.body, { childList: true, subtree: true })
      const tail = document.getElementById('tail')
      const N = 200
      const t0 = performance.now()
      for (let i = 0; i < N; i++) {
        const d = document.createElement('div')
        d.textContent = '流式片段' + i
        tail.appendChild(d)
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
      }
      await new Promise(r => setTimeout(r, 0))
      const dt = performance.now() - t0
      obs.disconnect()
      return { nodes, fired, dt, per: dt / N * 1000 }
    }, withQs)
    console.log([String(n).padEnd(9), String(r.nodes).padEnd(8), r.dt.toFixed(1).padEnd(19), r.per.toFixed(0).padEnd(9),
      withQs ? '' : r.dt.toFixed(1).padEnd(22), withQs ? r.per.toFixed(0) : ''].join(''))
    await p.close()
  }
}
await b.close()
