// ZCode ⌘K 命令浮层：Cmd+K 打开 → 采样 → Esc
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

for (const type of ['keyDown','keyUp']) {
  await call('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 40, modifiers: 4, text: 'k' })
  await sleep(80)
}
await sleep(800)

const out = await evl(`(() => {
  const root = document.querySelector('[cmdk-root],[role="dialog"][aria-label*="命令"],[role="dialog"]')
  if (!root) return { none: true, bodyStart: (document.body.innerText||'').slice(0,120) }
  const cs = getComputedStyle(root), r = root.getBoundingClientRect()
  const box = e => { const rr=e.getBoundingClientRect(); return {w:Math.round(rr.width),h:Math.round(rr.height),x:Math.round(rr.x),y:Math.round(rr.y)} }
  const kids = [...root.querySelectorAll('*')].slice(0,10).map(e=>{const c=getComputedStyle(e)
    return {tag:e.tagName, cls:(e.className||'').toString().slice(0,60), box:box(e), pad:c.padding, gap:c.gap,
      radius:c.borderTopLeftRadius, h:c.height, fs:c.fontSize, text:(e.innerText||'').trim().slice(0,24).replace(/\\n/g,' | ')}})
  const item = root.querySelector('[cmdk-item]')
  return { root: { cls:(root.className||'').toString().slice(0,70), box:box(root), pad:cs.padding, gap:cs.gap,
      radius:cs.borderTopLeftRadius, bg:cs.backgroundColor, border:cs.borderTopWidth+' '+cs.borderTopColor,
      shadow:cs.boxShadow, maxW:cs.maxWidth, pos:cs.position },
    kids,
    item: item ? (()=>{const c=getComputedStyle(item), rr=item.getBoundingClientRect(); return {box:box(item), pad:c.padding, radius:c.borderTopLeftRadius, h:Math.round(rr.height), bg:c.backgroundColor, fs:c.fontSize, lh:c.lineHeight}})() : null }
})()`)
console.log(JSON.stringify(out, null, 1))

for (const type of ['keyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 53 })
await sleep(400)
console.log('after_esc:', await evl(`document.querySelectorAll('[cmdk-root]').length`))
ws.close()
