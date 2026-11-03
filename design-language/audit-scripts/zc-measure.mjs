// ZCode 轮次导航同口径实测：几何 + 静息/hover 状态 + 颜色
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (method, params={}) => new Promise(res => {
  const i = ++id
  const h = ev => { const m = JSON.parse(ev.data); if (m.id === i) { ws.removeEventListener('message', h); res(m.result) } }
  ws.addEventListener('message', h)
  ws.send(JSON.stringify({id: i, method, params}))
})
const evl = async expr => (await call('Runtime.evaluate', {expression: expr, returnByValue: true})).result.value

// 静息状态测量
const rest = await evl(`(() => {
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  if (!nav) return {error: 'nav not found'}
  const navR = nav.getBoundingClientRect()
  const btns = [...nav.querySelectorAll('button[data-item-index]')]
  const bs = btns.slice(0, 12).map(b => {
    const s = b.querySelector('span')
    const cs = getComputedStyle(s)
    const br = b.getBoundingClientRect()
    const sr = s.getBoundingClientRect()
    return {idx: b.dataset.itemIndex, btnW: +br.width.toFixed(1), btnH: +br.height.toFixed(1),
      gapY: null, spanW: +sr.width.toFixed(1), spanH: +sr.height.toFixed(1),
      scaleX: cs.transform === 'none' ? 1 : +cs.transform.match(/,([-\d.]+)\\)$/)?.[1],
      opacity: +cs.opacity, bg: cs.backgroundColor, radius: cs.borderRadius,
      active: b.dataset.active, running: b.dataset.running, tone: b.dataset.visualTone}
  })
  for (let i = 1; i < bs.length; i++) bs[i].gapY = +(bs[i].btnH && (btns[i].getBoundingClientRect().top - btns[i-1].getBoundingClientRect().top)).toFixed(1)
  const cs = getComputedStyle(nav)
  return {navRect: {x: +navR.x.toFixed(1), y: +navR.y.toFixed(1), w: +navR.width.toFixed(1), h: +navR.height.toFixed(1)},
    navOpacity: cs.opacity, itemCount: btns.length, items: bs,
    winW: innerWidth, theme: document.documentElement.className}
})()`)
console.log('== ZCode 静息 ==')
console.log(JSON.stringify(rest, null, 1))

// hover 第 6 条（idx=5）后测渐进
const hoverExpr = `(() => {
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  const btns = [...nav.querySelectorAll('button[data-item-index]')]
  const b = btns[5]
  const r = b.getBoundingClientRect()
  b.dispatchEvent(new PointerEvent('pointerenter', {bubbles: true, clientX: r.x + 5, clientY: r.y + 5}))
  return 'dispatched'
})()`
await evl(hoverExpr)
await new Promise(r => setTimeout(r, 400))
const hov = await evl(`(() => {
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  const btns = [...nav.querySelectorAll('button[data-item-index]')]
  return btns.slice(2, 9).map(b => {
    const s = b.querySelector('span')
    const cs = getComputedStyle(s)
    const sr = s.getBoundingClientRect()
    return {idx: b.dataset.itemIndex, w: +sr.width.toFixed(1), h: +sr.height.toFixed(1),
      scaleX: cs.transform === 'none' ? 1 : +cs.transform.match(/,([-\d.]+)\\)$/)?.[1],
      opacity: +cs.opacity, bg: cs.backgroundColor, tone: b.dataset.visualTone}
  })
})()`)
console.log('== ZCode hover idx=5 ==')
console.log(JSON.stringify(hov))
// 清理 hover
await evl(`(() => {
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  const btns = [...nav.querySelectorAll('button[data-item-index]')]
  btns[5]?.dispatchEvent(new PointerEvent('pointerleave', {bubbles: true}))
  return 'cleared'
})()`)
ws.close()
