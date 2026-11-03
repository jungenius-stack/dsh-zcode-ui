// DSH 9223：输入区附件缩略图的 DOM 结构（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const imgs = [...document.querySelectorAll('img')].filter(e => { const r=e.getBoundingClientRect(); return r.width>20 && r.width<200 && r.height>20 && r.height<200 && r.y > innerHeight*0.5 })
  const cards = [...document.querySelectorAll('[class*="attach" i],[class*="chip" i],[class*="upload" i],[class*="file" i]')]
    .map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,60),tag:e.tagName,w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y),text:(e.innerText||'').trim().slice(0,24)}})
    .filter(x=>x.w>30&&x.h>15)
  return { imgs: imgs.map(e=>{const r=e.getBoundingClientRect();return{w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y),cls:(e.className||'').toString().slice(0,50),parentCls:(e.parentElement?.className||'').toString().slice(0,60)}}),
    cards: cards.slice(0,8) }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
