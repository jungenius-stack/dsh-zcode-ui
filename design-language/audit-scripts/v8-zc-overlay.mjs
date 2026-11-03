// 当前打开的任何带遮罩的浮层（ZCode 9224）：遮罩 + 居中面板都抓
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const vw = innerWidth, vh = innerHeight
  const all = [...document.querySelectorAll('body > div, body > div > div, [data-radix-portal], [data-state="open"]')]
  const rows = all.map(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return { cls:(e.className||'').toString().slice(0,80), tag:e.tagName, pos:c.position, z:c.zIndex,
      w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y),
      bg:c.backgroundColor, backdrop:c.backdropFilter, radius:c.borderTopLeftRadius, shadow:c.boxShadow.slice(0,120),
      pad:c.padding, gap:c.gap, ariaRole:e.getAttribute('role'), ariaModal:e.getAttribute('aria-modal'),
      fullscreen: Math.round(r.width)>=vw-2 && Math.round(r.height)>=vh-2,
      text:(e.innerText||'').trim().slice(0,40).replace(/\\n/g,' | ') }
  }).filter(x => x.w > 200 && x.h > 100)
  const dim = rows.filter(x => /rgba?\\(0, 0, 0/.test(x.bg) && x.bg !== 'rgba(0, 0, 0, 0)')
  const centered = rows.filter(x => !x.fullscreen && x.w < vw - 40 && x.h < vh - 40)
  return { vw, vh, dim: dim.slice(0,4), centered: centered.slice(0,6), n: rows.length }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
