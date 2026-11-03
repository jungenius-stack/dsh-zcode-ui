// DSH 9223：会话行之上的容器链（找 4px 内边距来源）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const row = document.querySelector('.dcu-wb-session')
  const chain = []
  let cur = row
  for (let i=0;i<8 && cur;i++) {
    const r = cur.getBoundingClientRect(), c = getComputedStyle(cur)
    chain.push({ tag: cur.tagName, cls:(cur.className||'').toString().slice(0,60), w:Math.round(r.width), x:Math.round(r.x),
      pad: c.padding, margin: c.margin, overflowY: c.overflowY })
    cur = cur.parentElement
  }
  return chain
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
