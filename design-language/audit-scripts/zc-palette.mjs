const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, p={}) => new Promise(res => { const i = ++id
  const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }
  ws.addEventListener('message', h); ws.send(JSON.stringify({id: i, method: m, params: p})) })
const evl = async e => (await call('Runtime.evaluate', {expression: e, returnByValue: true})).result.value

// 查有没有卡住的命令面板/弹层
const state = await evl(`(() => {
  const dlg = document.querySelector('[role="dialog"], [cmdk-root], [data-radix-popper-content-wrapper]')
  const pal = document.querySelector('[cmdk-root]')
  return {hasDialog: !!dlg, isPalette: !!pal,
    dlgDesc: dlg ? (dlg.getAttribute('aria-label') || dlg.className.toString().slice(0,60)) : null}
})()`)
console.log('ZCode 弹层状态:', JSON.stringify(state))
if (state.hasDialog) {
  // 连发 Escape 关闭
  for (let k = 0; k < 3; k++) {
    await call('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27})
    await call('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27})
    await new Promise(r => setTimeout(r, 150))
  }
  const after = await evl(`(() => { const dlg = document.querySelector('[role="dialog"], [cmdk-root]'); return {hasDialog: !!dlg} })()`)
  console.log('Escape 后:', JSON.stringify(after))
}
// 重测 ZCode 浮层几何（权威口径）
const pt = await evl(`(() => { const b = document.querySelector('[data-testid="v4-turn-navigator"] button[data-item-index="0"]'); const r = b.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2} })()`)
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 700, y: 700})
await new Promise(r => setTimeout(r, 120))
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: pt.x, y: pt.y})
await new Promise(r => setTimeout(r, 500))
const tip = await evl(`(() => {
  const t = document.querySelector('[data-testid^="v4-turn-navigator-tooltip"]')
  if (!t) return null
  const wrap = t.closest('[data-radix-popper-content-wrapper]') || t
  const wr = wrap.getBoundingClientRect()
  const br = document.querySelector('[data-testid="v4-turn-navigator"] button[data-item-index="0"]').getBoundingClientRect()
  return {w: +wr.width.toFixed(0), leftDelta: +(wr.x - br.right).toFixed(1), topDelta: +(wr.y - br.y).toFixed(1)}
})()`)
console.log('ZCode 浮层权威口径:', JSON.stringify(tip))
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 700, y: 700})
ws.close()
