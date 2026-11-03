// ZCode 9224：工具行 / 推理行 / 表格 / 引用 实测（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const out = await evl(`(() => {
  const box = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) } }
  const info = e => { const c = getComputedStyle(e); return { tag: e.tagName, cls: (e.className||'').toString().slice(0,90), box: box(e),
    bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor, radius: c.borderTopLeftRadius,
    pad: c.padding, gap: c.gap, fs: c.fontSize, lh: c.lineHeight, fw: c.fontWeight, color: c.color }
  }
  // 工具行：文本以「已运行/写入/读取/搜索」等开头的紧凑元素
  const all = [...document.querySelectorAll('main *, [class*="scroll"] *')]
  const toolRows = all.filter(e => { const t=(e.innerText||'').trim(); const r=e.getBoundingClientRect()
    return /^(已运行|写入|读取|搜索|编辑|运行|思考)/.test(t) && t.length < 60 && r.height > 12 && r.height < 90 && e.children.length <= 3 })
    .slice(-6).map(info)
  const tables = [...document.querySelectorAll('table')].slice(0,1).map(t => ({ table: info(t), th: t.querySelector('th')?info(t.querySelector('th')):null, td: t.querySelector('td')?info(t.querySelector('td')):null }))
  const bq = [...document.querySelectorAll('blockquote')].slice(0,1).map(info)
  const links = [...document.querySelectorAll('article a, .prose a, main a')].slice(0,2).map(info)
  return { toolRows, tables, bq, links, total: all.length }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
