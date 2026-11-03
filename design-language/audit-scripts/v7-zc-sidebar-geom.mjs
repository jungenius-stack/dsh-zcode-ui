// ZCode 9224：侧栏容器几何（行缩进 8 是否来自容器 padding）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const li = document.querySelector('li.group\\\\/task-item')
  // 源到侧的祖先链：找带 padding 且宽度 ~264 的容器
  const chain = []
  let cur = li
  while (cur && cur !== document.body) {
    const r = cur.getBoundingClientRect(), c = getComputedStyle(cur)
    chain.push({ tag: cur.tagName, cls:(cur.className||'').toString().slice(0,50), w: Math.round(r.width), x: Math.round(r.x),
      pad: c.padding, overflowY: c.overflowY, clientW: cur.clientWidth, offsetW: cur.offsetWidth, sbW: cur.offsetWidth - cur.clientWidth })
    cur = cur.parentElement
  }
  // 项目头位置
  const heads = [...document.querySelectorAll('[class*="project" i]')].map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,40),x:Math.round(r.x),w:Math.round(r.width),y:Math.round(r.y)}}).filter(h=>h.w>150&&h.w<300).slice(0,4)
  return { chain: chain.slice(0,7), heads }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
