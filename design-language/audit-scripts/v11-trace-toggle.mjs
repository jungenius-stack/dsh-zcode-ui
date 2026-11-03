// 侧栏开合期间的 tracing 事件聚合：看清耗时在 Layout / StyleRecalc / Paint / JS 哪一段
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } else if (d.method) { const hh = listeners.get(d.method); if (hh) hh(d.params) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const listeners = new Map()
const on = (m, fn) => listeners.set(m, fn)
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); return r.exceptionDetails ? { err: JSON.stringify(r.exceptionDetails).slice(0, 200) } : r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

for (let i = 0; i < 20; i++) { if (await evl(`!!document.querySelector('[data-dcu-codex-sidebar-initialized]')`)) break; await sleep(400) }

const events = []
on('Tracing.dataCollected', params => { if (params && params.value) events.push(...params.value) })
const done = new Promise(res => on('Tracing.tracingComplete', res))

await call('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' })

const t = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); if(!b) return null; const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),label:b.getAttribute('aria-label')} })()`)
console.log('toggle:', JSON.stringify(t))
for (const type of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type, x: t.x, y: t.y, button: 'left', clickCount: 1 }); await sleep(60) }
await sleep(700)
await call('Tracing.end')
await done
await sleep(300)

// 聚合：只统计主线程（renderer）上的事件
const byName = new Map()
for (const e of events) {
  if (e.ph !== 'X' && e.ph !== 'B') continue
  if (!e.dur) continue
  const n = e.name
  const cur = byName.get(n) || { total: 0, count: 0, max: 0 }
  cur.total += e.dur / 1000
  cur.count++
  cur.max = Math.max(cur.max, e.dur / 1000)
  byName.set(n, cur)
}
const top = [...byName.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 14)
console.log('top by total ms:')
for (const [n, v] of top) console.log(`  ${n}: total ${v.total.toFixed(1)}ms  count ${v.count}  max ${v.max.toFixed(1)}ms`)
ws.close()
