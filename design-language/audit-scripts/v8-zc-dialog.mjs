// A5/A6：ZCode 9224 当前对话框规格（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const out = await evl(`(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>150&&r.height>80})
  if (!dlg.length) return { none: true, overlays: [...document.querySelectorAll('[class*="dialog" i],[class*="modal" i],[class*="popover" i],[data-state="open"]')].map(e=>{const r=e.getBoundingClientRect();return{cls:(e.className||'').toString().slice(0,50),tag:e.tagName,w:Math.round(r.width),h:Math.round(r.height),role:e.getAttribute('role'),ds:e.getAttribute('data-state')}}).filter(x=>x.w>150).slice(0,8) }
  const el = dlg[0]
  const cs = getComputedStyle(el), r = el.getBoundingClientRect()
  const chain = []
  let cur = el
  for (let i=0;i<4 && cur;i++){ const c=getComputedStyle(cur), rr=cur.getBoundingClientRect()
    chain.push({tag:cur.tagName, cls:(cur.className||'').toString().slice(0,70), w:Math.round(rr.width), h:Math.round(rr.height),
      pad:c.padding, radius:c.borderTopLeftRadius, bg:c.backgroundColor, border:c.borderTopWidth+' '+c.borderTopColor, shadow:c.boxShadow.slice(0,160)})
    cur = cur.firstElementChild }
  const inner = [...el.querySelectorAll('*')].slice(0,10).map(e=>{const c=getComputedStyle(e),rr=e.getBoundingClientRect()
    return {tag:e.tagName, cls:(e.className||'').toString().slice(0,60), w:Math.round(rr.width), h:Math.round(rr.height),
      pad:c.padding, gap:c.gap, margin:c.margin, radius:c.borderTopLeftRadius, fs:c.fontSize, text:(e.innerText||'').trim().slice(0,24).replace(/\\n/g,' | ')} })
  return { count: dlg.length, box: {w:Math.round(r.width), h:Math.round(r.height)},
    dlg: { pad:cs.padding, radius:cs.borderTopLeftRadius, bg:cs.backgroundColor, border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor, shadow:cs.boxShadow, maxW:cs.maxWidth, gap:cs.gap },
    chain, inner, title: (el.innerText||'').trim().slice(0,60) }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
