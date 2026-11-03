// DSH 会话区「表面」清单：data-slot 全量 + 类族计数（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const root = document.querySelector('[data-conversation-scroll]') || document.body
  const slots = new Map()
  for (const el of root.querySelectorAll('[data-slot]')) {
    const s = el.getAttribute('data-slot')
    const cur = slots.get(s) || { n: 0, sample: '' }
    cur.n++
    if (!cur.sample && (el.innerText || '').trim()) cur.sample = (el.innerText || '').trim().slice(0, 30).replace(/\\n/g, ' ')
    slots.set(s, cur)
  }
  const fam = new Map()
  for (const el of root.querySelectorAll('[class]')) {
    for (const c of el.classList) {
      const m = /^([A-Za-z0-9]{4,8})_/.exec(c)
      if (m) fam.set(m[1], (fam.get(m[1]) || 0) + 1)
    }
  }
  // 语义探测：工具卡 / 推理块 / 表格 / 图片 / 引用 / diff
  const probe = (sel) => root.querySelectorAll(sel).length
  return {
    slots: [...slots.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0, 40),
    fams: [...fam.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 30),
    counts: {
      table: probe('table'),
      img: probe('.icaHSq_column img'),
      pre: probe('.icaHSq_column pre'),
      details: probe('.icaHSq_column details'),
      summary: probe('.icaHSq_column summary'),
      blockquote: probe('.icaHSq_column blockquote'),
      hr: probe('.icaHSq_column hr'),
      h1: probe('.icaHSq_column h1'), h2: probe('.icaHSq_column h2'), h3: probe('.icaHSq_column h3'),
      a: probe('.icaHSq_column a'),
      ul: probe('.icaHSq_column ul'), ol: probe('.icaHSq_column ol'),
      attachRow: probe('.IzP3Va_attachmentRow'),
      toolish: probe('[class*="tool" i]'),
      thinkish: probe('[class*="think" i],[class*="reason" i]'),
      errish: probe('[class*="error" i]')
    }
  }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
