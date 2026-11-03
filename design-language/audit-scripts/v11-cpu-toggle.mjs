// 侧栏开合期间的 CPU profile：按函数聚合自身耗时
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const pending = new Map()
ws.addEventListener('message', ev => { const d = JSON.parse(ev.data); if (d.id !== undefined) { const h = pending.get(d.id); if (h) { pending.delete(d.id); h(d.result) } } })
const call = (m, par = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); return r.exceptionDetails ? { err: JSON.stringify(r.exceptionDetails).slice(0, 200) } : r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))
for (let i = 0; i < 20; i++) { if (await evl(`!!document.querySelector('[data-dcu-codex-sidebar-initialized]')`)) break; await sleep(400) }

// 保证展开态
const lbl = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); return b?b.getAttribute('aria-label'):null })()`)
if (lbl && lbl.includes('展开')) {
  const pos = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/展开侧边栏/.test(e.getAttribute('aria-label')||'')}); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
  for (const t of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type: t, x: pos.x, y: pos.y, button: 'left', clickCount: 1 }); await sleep(60) }
  await sleep(1000)
}

await call('Profiler.enable')
await call('Profiler.setSamplingInterval', { interval: 200 })
await call('Profiler.start')
const t = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
for (const type of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type, x: t.x, y: t.y, button: 'left', clickCount: 1 }); await sleep(60) }
await sleep(900)
const prof = await call('Profiler.stop')
await call('Profiler.disable')

const nodes = prof.profile.nodes
const self = new Map()
const total = prof.profile.samples.length
// timeDeltas: 微秒
for (let i = 0; i < prof.profile.samples.length; i++) {
  const nodeId = prof.profile.samples[i]
  const dt = (prof.profile.timeDeltas[i] || 0) / 1000
  self.set(nodeId, (self.get(nodeId) || 0) + dt)
}
const byFn = new Map()
for (const n of nodes) {
  const s = self.get(n.id) || 0
  if (!s) continue
  const cf = n.callFrame
  const key = (cf.functionName || '(anonymous)') + ' @' + (cf.url || '').split('/').pop().slice(0, 40) + ':' + (cf.lineNumber + 1)
  byFn.set(key, (byFn.get(key) || 0) + s)
}
console.log('samples:', total)
for (const [k, v] of [...byFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${v.toFixed(1).padStart(7)}ms  ${k}`)
}
ws.close()
