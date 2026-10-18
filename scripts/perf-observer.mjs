/**
 * MutationObserver 成本探针。
 *
 * ## 怀疑点
 *
 * 插件有 **9 处** `observe(document.body, { childList:true, subtree:true })`。
 * `subtree:true` 让 observer 覆盖整棵 DOM 树——长对话下 body 有数万节点，
 * 流式输出/打字/滚动都可能持续产生 mutation，每次回调都要遍历 record 列表。
 *
 * ## 为什么这个在合成页里测不出来
 *
 * 合成页没有「持续 DOM 变动」的驱动源。真实宿主有流式 token 追加、
 * 会话状态更新、时间戳刷新……所以必须**主动制造变动**才能测到差异。
 *
 * 用法：node scripts/perf-observer.mjs
 */
import { chromium } from 'playwright'

const msgs = n => { let h=''; for(let i=0;i<n;i++) h+=`<div class="msg"><p>第 ${i} 条：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里。</p></div>`; return h }

const b = await chromium.launch({ headless: true })
console.log('线程条数  observer数  mutation次数  总耗时ms   每次ms')
for (const n of [500, 3000, 8000]) {
  for (const nObs of [0, 9]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.setContent(`<style>html,body{margin:0;height:100%}#thread{height:70vh;overflow-y:auto}#thread p{margin:0 0 6px;line-height:1.6}</style>
      <div id="thread">${msgs(n)}</div><div id="tail"></div>`)
    await p.waitForTimeout(250)

    const r = await p.evaluate(async (nObs) => {
      // 模拟插件的 9 个 body-subtree observer（回调做轻量工作：累加 + 读一个属性）
      let fired = 0
      const observers = []
      for (let i = 0; i < nObs; i++) {
        const o = new MutationObserver(records => {
          fired += records.length
          // 真实插件回调通常还会做 querySelector / getBoundingClientRect
          void document.body.getAttribute('data-x')
        })
        o.observe(document.body, { childList: true, subtree: true })
        observers.push(o)
      }
      const tail = document.getElementById('tail')
      const N = 200
      const t0 = performance.now()
      // 制造 mutation：模拟流式输出持续追加节点
      for (let i = 0; i < N; i++) {
        const d = document.createElement('div')
        d.textContent = '流式片段' + i
        tail.appendChild(d)
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
      }
      // 等 observer 回调结算
      await new Promise(r => setTimeout(r, 0))
      const dt = performance.now() - t0
      observers.forEach(o => o.disconnect())
      return { dt, fired, per: dt / N }
    }, nObs)

    console.log([String(n).padEnd(9), String(nObs).padEnd(11), String(r.fired).padEnd(13),
      r.dt.toFixed(1).padEnd(10), r.per.toFixed(3)].join(''))
    await p.close()
  }
}
await b.close()
