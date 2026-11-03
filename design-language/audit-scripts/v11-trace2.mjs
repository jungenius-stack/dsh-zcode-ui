// 侧栏开合 tracing：常驻消息监听，聚合 Layout / Style / Paint / JS
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)

let id = 0
const pending = new Map()
const events = []
let tracingDone = null
const tracingDonePromise = new Promise(res => { tracingDone = res })

ws.addEventListener('message', ev => {
  const d = JSON.parse(ev.data)
  if (d.id !== undefined) {
    const h = pending.get(d.id)
    if (h) { pending.delete(d.id); h(d.result) }
    return
  }
  if (d.method === 'Tracing.dataCollected' && d.params && d.params.value) events.push(...d.params.value)
  if (d.method === 'Tracing.tracingComplete') tracingDone()
})

const call = (m, par = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); return r.exceptionDetails ? { err: JSON.stringify(r.exceptionDetails).slice(0, 200) } : r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

for (let i = 0; i < 20; i++) { if (await evl(`!!document.querySelector('[data-dcu-codex-sidebar-initialized]')`)) break; await sleep(400) }

// 确保从展开态开始
const label = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); return b?b.getAttribute('aria-label'):null })()`)
console.log('current toggle label:', label)
if (label && label.includes('展开')) {
  const pos = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开)侧边栏/.test(e.getAttribute('aria-label')||'')}); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
  for (const t of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type: t, x: pos.x, y: pos.y, button: 'left', clickCount: 1 }); await sleep(60) }
  await sleep(1000)
}

await call('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' })
const t = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),label:b.getAttribute('aria-label')} })()`)
console.log('toggling:', JSON.stringify(t))
for (const type of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type, x: t.x, y: t.y, button: 'left', clickCount: 1 }); await sleep(60) }
await sleep(800)
await call('Tracing.end')
await Promise.race([tracingDonePromise, sleep(8000)])
await sleep(200)

const byName = new Map()
for (const e of events) {
  if (!e.dur || (e.ph !== 'X' && e.ph !== 'B')) continue
  const cur = byName.get(e.name) || { total: 0, count: 0, max: 0 }
  cur.total += e.dur / 1000; cur.count++; cur.max = Math.max(cur.max, e.dur / 1000)
  byName.set(e.name, cur)
}
console.log('events collected:', events.length)
for (const [n, v] of [...byName.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 16)) {
  console.log(`  ${n.padEnd(34)} total ${v.total.toFixed(1)}ms  n=${v.count}  max ${v.max.toFixed(1)}ms`)
}
ws.close()
