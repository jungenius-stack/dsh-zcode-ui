// ZCode 9224：任务行（group/task-item）逐项规格（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result.value }

const res = await evl(`(() => {
  const items = [...document.querySelectorAll('li.group\\\\/task-item')]
  if (!items.length) return { err: 'no task-item' }
  const short = items.find(li => (li.innerText||'').length < 30) || items[0]
  const cs = e => getComputedStyle(e)
  const box = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) } }
  const pick = (s, keys) => Object.fromEntries(keys.map(k => [k, s[k]]))
  const s = cs(short)
  const inner = [...short.querySelectorAll('*')].slice(0, 8).map(e => ({
    tag: e.tagName, cls: (e.className||'').toString().slice(0, 90),
    box: box(e), text: (e.innerText||'').trim().slice(0, 30),
    fs: cs(e).fontSize, lh: cs(e).lineHeight, fw: cs(e).fontWeight, color: cs(e).color,
    bg: cs(e).backgroundColor, radius: cs(e).borderTopLeftRadius
  }))
  return {
    count: items.length,
    item: {
      cls: (short.className||'').toString(),
      box: box(short),
      padding: s.padding, gap: s.gap, radius: s.borderTopLeftRadius,
      bg: s.backgroundColor, color: s.color,
      fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight,
      fontFamily: s.fontFamily.split(',')[0], letterSpacing: s.letterSpacing
    },
    inner,
    // 时间戳/图标元素
    timeish: [...short.querySelectorAll('span,time,div')].map(e=>({cls:(e.className||'').toString().slice(0,50), t:(e.innerText||'').trim().slice(0,12), fs:cs(e).fontSize, color:cs(e).color})).filter(x=>x.t && x.t.length<10).slice(0,6),
    // 父容器（分组）
    group: (() => { const g = short.closest('div.flex.flex-col'); if(!g) return null; const gs = cs(g); return { cls:(g.className||'').toString().slice(0,70), box: box(g), gap: gs.gap, children: g.children.length } })(),
    // 侧栏根宽度
    sidebarW: (() => { const n = document.querySelector('[class*="anchor-" i]'); return n ? Math.round(n.getBoundingClientRect().width) : null })()
  }
})()`)
console.log(JSON.stringify(res, null, 1))
ws.close()
