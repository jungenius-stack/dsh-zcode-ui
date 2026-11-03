// 点「选择项目」菜单 → 列出菜单项（不点任何创建动作）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

const pos = await evl(`(() => {
  const b = [...document.querySelectorAll('button')].find(e => (e.innerText||'').trim().startsWith('选择项目'))
  if (!b) return null
  const r = b.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) }
})()`)
console.log('trigger', JSON.stringify(pos))
for (const type of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', clickCount: 1 }); await sleep(70) }
await sleep(600)
const items = await evl(`(() => {
  const menus = [...document.querySelectorAll('[role="menu"]')]
  const m = menus[menus.length-1]
  if (!m) return { none: true }
  const its = [...m.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],button,[data-value]')].map(e=>{const r=e.getBoundingClientRect()
    return {tag:e.tagName, role:e.getAttribute('role'), w:Math.round(r.width), h:Math.round(r.height), text:(e.innerText||'').trim().slice(0,30).replace(/\\n/g,' | ')}}).filter(x=>x.h>0)
  const cs = getComputedStyle(m), r = m.getBoundingClientRect()
  return { menu: {cls:(m.className||'').toString().slice(0,60), w:Math.round(r.width), h:Math.round(r.height), bg:cs.backgroundColor, radius:cs.borderTopLeftRadius, pad:cs.padding}, items: its.slice(0,15) }
})()`)
console.log(JSON.stringify(items, null, 1))
// 关闭菜单
for (const type of ['keyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
await sleep(400)
console.log('menus_after_esc:', await evl(`document.querySelectorAll('[role="menu"]').length`))
ws.close()
