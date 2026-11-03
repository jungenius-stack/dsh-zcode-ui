// ZCode 9224：找出会打开 dialog 的触发器（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const els = [...document.querySelectorAll('[aria-haspopup],[data-state],[aria-expanded]')]
  const mapped = els.map(e => {
    const r = e.getBoundingClientRect()
    return { tag: e.tagName, role: e.getAttribute('role'), haspopup: e.getAttribute('aria-haspopup'),
      expanded: e.getAttribute('aria-expanded'), state: e.getAttribute('data-state'),
      w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
      label: (e.getAttribute('aria-label') || e.innerText || e.title || '').trim().slice(0, 24).replace(/\\n/g,' | '),
      cls: (e.className || '').toString().slice(0, 40) }
  }).filter(x => x.w > 0 && x.h > 0)
  const dialogTriggers = mapped.filter(x => x.haspopup === 'dialog')
  const menus = mapped.filter(x => x.haspopup === 'menu' || x.haspopup === 'listbox')
  return { dialogTriggers: dialogTriggers.slice(0, 10), menuCount: menus.length, menus: menus.slice(0, 8) }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
