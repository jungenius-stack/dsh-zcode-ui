// 带附件气泡的结构：附件节点在气泡内还是气泡外？（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const stacks = [...document.querySelectorAll('.icaHSq_column .IzP3Va_userStack')]
  const s = stacks[stacks.length - 1]
  if (!s) return { none: true }
  const box = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) } }
  const kind = e => e.tagName + '.' + ((e.className||'').toString().split(' ')[0] || '-') + (e.getAttribute('data-slot') ? '[slot=' + e.getAttribute('data-slot') + ']' : '')
  const kids = [...s.children].map(e => ({ el: kind(e), box: box(e), text: (e.innerText||'').trim().slice(0,24), hasImg: !!e.querySelector('img') }))
  const bubble = s.querySelector('.IzP3Va_bubble')
  const imgInBubble = bubble ? bubble.querySelectorAll('img').length : null
  const imgInStack = s.querySelectorAll('img').length
  const root = s.querySelector('.B0oWoG_root')
  const rootMaxH = root ? getComputedStyle(root).maxHeight : null
  const toggle = s.querySelector('.dcu-bubble-toggle')
  const actionRow = s.querySelector('[class*="action" i]') || bubble?.nextElementSibling || null
  return { n: stacks.length, kids, imgInBubble, imgInStack, rootMaxH,
    hasToggle: !!toggle,
    bubbleBox: bubble ? box(bubble) : null,
    bubbleScrollH: bubble ? bubble.scrollHeight : null,
    bubbleIsLastChild: bubble ? bubble === s.lastElementChild : null,
    actionRow: actionRow ? kind(actionRow) : null,
    stackText: (s.innerText||'').trim().slice(0,40).replace(/\\n/g,' | ') }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
