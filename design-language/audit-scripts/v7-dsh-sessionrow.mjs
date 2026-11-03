// DSH 9223：侧栏会话行规格（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const res = await evl(`(() => {
  const aside = document.querySelector('aside, [class*="IzP3Va_sidebar" i], [class*="sidebar" i]')
  const cands = [...document.querySelectorAll('[class*="sessionRow" i],[class*="session-row" i],[data-session-id],li')]
  const rows = cands.filter(e => { const r=e.getBoundingClientRect(); const t=(e.innerText||'').trim(); return r.width>100 && r.width<300 && r.height>18 && r.height<50 && t.length>3 })
  if (!rows.length) return { err:'no rows', candCount: cands.length, classes: [...new Set(cands.map(c=>(c.className||'').toString().slice(0,40)))].slice(0,10) }
  const pick = rows[1] || rows[0]
  const cs = getComputedStyle(pick), r = pick.getBoundingClientRect()
  const kids = [...pick.querySelectorAll('*')].slice(0,6).map(e => { const k=getComputedStyle(e); const kr=e.getBoundingClientRect(); return {
    tag:e.tagName, cls:(e.className||'').toString().slice(0,70), text:(e.innerText||'').trim().slice(0,24),
    w:Math.round(kr.width), h:Math.round(kr.height), fs:k.fontSize, lh:k.lineHeight, fw:k.fontWeight, color:k.color, bg:k.backgroundColor } })
  return {
    pick: { cls:(pick.className||'').toString(), w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y),
      padding:cs.padding, gap:cs.gap, radius:cs.borderTopLeftRadius, bg:cs.backgroundColor, color:cs.color,
      fs:cs.fontSize, lh:cs.lineHeight, fw:cs.fontWeight, letterSpacing:cs.letterSpacing },
    kids,
    count: rows.length,
    asideW: aside ? Math.round(aside.getBoundingClientRect().width) : null
  }
})()`)
console.log(JSON.stringify(res, null, 1))
ws.close()
