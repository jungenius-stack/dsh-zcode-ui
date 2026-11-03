// DSH 未覆盖表面实测：工具卡 / 表格 / 引用 / 推理折叠（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const col = document.querySelector('[data-conversation-scroll] .icaHSq_column')
  const pick = e => { if (!e) return null; const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return { cls: (e.className||'').toString().slice(0,80), w: Math.round(r.width), h: Math.round(r.height),
      bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor, radius: c.borderTopLeftRadius,
      pad: c.padding, margin: c.margin, fs: c.fontSize, lh: c.lineHeight, color: c.color, gap: c.gap } }
  const tool = [...col.querySelectorAll('[data-slot="tool.call.toolview"]')]
  const toolInner = tool.map(t => pick(t.firstElementChild))
  const table = col.querySelector('table')
  const th = table ? table.querySelector('th') : null
  const td = table ? table.querySelector('td') : null
  const bq = col.querySelector('blockquote')
  const details = [...col.querySelectorAll('details')].slice(0, 3).map(d => ({ summary: pick(d.querySelector('summary')),
    open: d.open, text: (d.innerText||'').trim().slice(0, 30).replace(/\\n/g,' ') }))
  const reasoning = [...col.querySelectorAll('*')].filter(e => /思考|reasoning|thinking/i.test((e.innerText||'').slice(0, 12)) && e.children.length <= 4 && e.getBoundingClientRect().height < 60 && e.getBoundingClientRect().height > 10).slice(0,2).map(e => ({ tag: e.tagName, text: (e.innerText||'').trim().slice(0, 24), ...pick(e) }))
  return {
    toolCount: tool.length,
    tool: pick(tool[tool.length-1]),
    toolInner: toolInner.slice(-2),
    table: { box: pick(table), th: pick(th), td: pick(td), rows: table ? table.rows.length : 0 },
    blockquote: pick(bq),
    details,
    reasoning
  }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
