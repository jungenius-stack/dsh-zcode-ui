// 点开 ZCode「插件」dialog → 采样 → Esc 关闭（可逆，只读采样）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 1) 定位「插件」按钮中心
const pos = await evl(`(() => {
  const b = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find(e => (e.innerText||'').includes('插件'))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
})()`)
console.log('trigger:', JSON.stringify(pos))
if (!pos) { ws.close(); process.exit(0) }

// 2) 真鼠标点击
for (const type of ['mousePressed','mouseReleased']) {
  await call('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', clickCount: 1 })
  await sleep(70)
}
await sleep(700)

// 3) 采样
const sample = await evl(`(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>150&&r.height>60})
  if (!dlg.length) return { none: true }
  const el = dlg[0], cs = getComputedStyle(el), r = el.getBoundingClientRect()
  const box = e => { const rr=e.getBoundingClientRect(); return {w:Math.round(rr.width), h:Math.round(rr.height), x:Math.round(rr.x), y:Math.round(rr.y)} }
  const chain = []
  let cur = el
  for (let i=0;i<3 && cur;i++){ const c=getComputedStyle(cur)
    chain.push({tag:cur.tagName, cls:(cur.className||'').toString().slice(0,100), box:box(cur),
      pad:c.padding, gap:c.gap, radius:c.borderTopLeftRadius, bg:c.backgroundColor,
      border:c.borderTopWidth+' '+c.borderTopColor, shadow:c.boxShadow, ring:c.getPropertyValue('--tw-ring-shadow')||null,
      outline:c.outline}) 
    cur = cur.firstElementChild }
  const kids = [...el.children].slice(0,5).map(e=>{const c=getComputedStyle(e)
    return {tag:e.tagName, cls:(e.className||'').toString().slice(0,90), box:box(e), pad:c.padding, gap:c.gap,
      fs:c.fontSize, text:(e.innerText||'').trim().slice(0,40).replace(/\\n/g,' | ')}})
  // 遮罩层
  const overlay = el.parentElement ? (()=>{const o=getComputedStyle(el.parentElement); const rr=el.parentElement.getBoundingClientRect()
    return {cls:(el.parentElement.className||'').toString().slice(0,60), bg:o.backgroundColor, backdrop:o.backdropFilter, box:{w:Math.round(rr.width),h:Math.round(rr.height)}, pad:o.padding, display:o.display, align:o.alignItems, justify:o.justifyContent}})() : null
  return { dlg: { pad:cs.padding, gap:cs.gap, radius:cs.borderTopLeftRadius, bg:cs.backgroundColor,
      border:cs.borderTopWidth+' '+cs.borderTopColor, shadow:cs.boxShadow, maxW:cs.maxWidth, box:box(el),
      width:cs.width, maxHeight:cs.maxHeight }, chain, kids, overlay,
    title: (el.innerText||'').trim().slice(0,50) }
})()`)
console.log('SAMPLE', JSON.stringify(sample, null, 1))

// 4) Esc 关闭
for (const type of ['keyDown','keyUp']) {
  await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
}
await sleep(500)
const closed = await evl(`document.querySelectorAll('[role="dialog"]').length`)
console.log('dialogs_after_esc:', closed)
ws.close()
