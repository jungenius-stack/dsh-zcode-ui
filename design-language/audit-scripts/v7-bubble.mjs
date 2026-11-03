// G17 用户轮气泡验收探针（DSH 9223，只读，不 reload）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, p = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value }

const out = await evl(`(() => {
  const col = document.querySelector('[data-conversation-scroll] .icaHSq_column')
  if (!col) return {error:'no column'}
  const colR = col.getBoundingClientRect()
  const rows = [...col.querySelectorAll('.IzP3Va_userRow')]
  const bubbles = [...col.querySelectorAll('.IzP3Va_bubble')]
  const b = bubbles[bubbles.length - 1]
  if (!b) return {error:'no bubble', rows: rows.length}
  const cs = getComputedStyle(b)
  const br = b.getBoundingClientRect()
  const row = b.closest('.IzP3Va_userRow')
  const stack = b.closest('.IzP3Va_userStack')
  const rcs = getComputedStyle(row), scs = stack ? getComputedStyle(stack) : null
  const ownedRules = []
  for (const sh of document.styleSheets) {
    let rules
    try { rules = sh.cssRules } catch { continue }
    for (const r of rules) {
      if (!r.selectorText || !r.cssText.includes('IzP3Va_')) continue
      if (!/IzP3Va_bubble|IzP3Va_userRow|IzP3Va_userStack/.test(r.selectorText)) continue
      ownedRules.push(r.cssText.slice(0, 260))
    }
  }
  return {
    counts: {rows: rows.length, bubbles: bubbles.length},
    bubble: {
      bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      radius: cs.borderTopLeftRadius + ' ' + cs.borderTopRightRadius + ' ' + cs.borderBottomRightRadius + ' ' + cs.borderBottomLeftRadius,
      padding: cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      maxW: cs.maxWidth, fontSize: cs.fontSize, lineHeight: cs.lineHeight, whiteSpace: cs.whiteSpace,
      width: Math.round(br.width), rightGapToColumn: Math.round(colR.right - br.right),
      text: (b.textContent || '').slice(0, 28)
    },
    row: {direction: rcs.flexDirection, align: rcs.alignItems, gap: rcs.gap},
    stack: scs ? {align: scs.alignItems, gap: scs.gap, maxW: scs.maxWidth, width: Math.round(stack.getBoundingClientRect().width), rightGapToColumn: Math.round(colR.right - stack.getBoundingClientRect().right)} : null,
    rules: ownedRules
  }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
