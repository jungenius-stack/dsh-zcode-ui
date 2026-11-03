const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, p={}) => new Promise(res => { const i = ++id
  const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }
  ws.addEventListener('message', h); ws.send(JSON.stringify({id: i, method: m, params: p})) })
const evl = async e => (await call('Runtime.evaluate', {expression: e, returnByValue: true})).result.value

const rect = await evl(`(() => {
  const b = document.querySelector('[data-testid="v4-turn-navigator"] button[data-item-index="0"]')
  const r = b.getBoundingClientRect()
  return {x: r.x + r.width/2, y: r.y + r.height/2}
})()`)
// 鼠标先到远处，再移入，保证产生 over/out 对
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 700, y: 700})
await new Promise(r => setTimeout(r, 120))
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: rect.x, y: rect.y})
await new Promise(r => setTimeout(r, 500))
const hov = await evl(`(() => {
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  const btns = [...nav.querySelectorAll('button[data-item-index]')]
  const items = btns.map(b => {
    const s = b.querySelector('span'); const cs = getComputedStyle(s); const sr = s.getBoundingClientRect()
    return {idx: b.dataset.itemIndex, w: +sr.width.toFixed(1), h: +sr.height.toFixed(1),
      opacity: +cs.opacity, bg: cs.backgroundColor, tone: b.dataset.visualTone, scale: b.dataset.visualScale}
  })
  const tip = document.querySelector('[data-testid^="v4-turn-navigator-tooltip"]')
  const wrap = tip?.closest('[data-radix-popper-content-wrapper]') || tip
  const tr = wrap?.getBoundingClientRect()
  const br = btns[0].getBoundingClientRect()
  return {items, tooltip: tip ? {w: +tr.width.toFixed(0), h: +tr.height.toFixed(0),
    leftDeltaFromBtnRight: +(tr.x - br.right).toFixed(1), topDeltaFromBtnTop: +(tr.y - br.y).toFixed(1)} : null}
})()`)
console.log('== ZCode hover idx=0（真鼠标事件）==')
console.log(JSON.stringify(hov, null, 1))
// 移开还原
await call('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 700, y: 700})
ws.close()
