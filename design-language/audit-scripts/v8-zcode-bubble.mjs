// G17b ZCode 用户气泡长文本夹取规格探针（9224，只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, p = {}) => new Promise(res => {
  const i = ++id
  const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }
  ws.addEventListener('message', h)
  ws.send(JSON.stringify({ id: i, method: m, params: p }))
})
const evl = async e => {
  const r = await call('Runtime.evaluate', { expression: e, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

const out = await evl(`(() => {
  const bubbles = [...document.querySelectorAll('[data-v4-user-input-bubble]')]
  const info = bubbles.map((b, i) => {
    const cs = getComputedStyle(b)
    const r = b.getBoundingClientRect()
    return {
      i,
      h: Math.round(r.height),
      textLen: (b.textContent || '').length,
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      lineClamp: cs.webkitLineClamp,
      display: cs.display,
      cls: b.className,
      parentCls: b.parentElement ? b.parentElement.className : null,
      grandCls: b.parentElement && b.parentElement.parentElement ? b.parentElement.parentElement.className : null,
    }
  })
  // 找展开/收起控件
  const btnHits = []
  for (const b of bubbles) {
    let p = b.parentElement
    for (let d = 0; p && d < 5; d++, p = p.parentElement) {
      for (const el of p.querySelectorAll('button, [role="button"], a')) {
        const t = (el.textContent || '').trim()
        if (/展开|收起|更多|显示全部|expand|collapse|show more/i.test(t + ' ' + el.className)) {
          btnHits.push({ text: t.slice(0, 24), cls: String(el.className).slice(0, 120), tag: el.tagName, depth: d })
        }
      }
    }
  }
  // 扫样式表里与气泡相关的规则
  const rules = []
  for (const sh of document.styleSheets) {
    let rs
    try { rs = sh.cssRules } catch { continue }
    for (const r of rs) {
      if (!r.cssText) continue
      if (!/user-input-bubble|line-clamp|max-h-\\[120px\\]|max-h-\\[\\d+px\\]/.test(r.cssText)) continue
      rules.push(r.cssText.slice(0, 320))
    }
  }
  return {
    count: bubbles.length,
    bubbles: info,
    btnHits: btnHits.slice(0, 10),
    rules: rules.slice(0, 24),
    sampleHtml: bubbles.length ? bubbles[bubbles.length - 1].outerHTML.slice(0, 1200) : null,
  }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
