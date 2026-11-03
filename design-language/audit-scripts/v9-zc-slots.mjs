// ZCode 9224：主题确认 + data-slot 组件清单 + 工具/推理行干净实测（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const out = await evl(`(() => {
  const theme = { cls: document.documentElement.className, scheme: getComputedStyle(document.documentElement).colorScheme,
    fg: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground').trim(),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() }
  const slots = new Map()
  for (const el of document.querySelectorAll('[data-slot]')) {
    const s = el.getAttribute('data-slot'); const cur = slots.get(s) || { n: 0, sample: '' }
    cur.n++; const t = (el.innerText || '').trim(); if (!cur.sample && t) cur.sample = t.slice(0, 26).replace(/\\n/g, ' ')
    slots.set(s, cur)
  }
  const box = e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) } }
  const info = e => { const c = getComputedStyle(e); return { cls: (e.className||'').toString().slice(0,95), box: box(e),
    bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor, radius: c.borderTopLeftRadius, pad: c.padding,
    gap: c.gap, fs: c.fontSize, lh: c.lineHeight, color: c.color, text: (e.innerText||'').trim().slice(0, 28).replace(/\\n/g,' ') } }
  const reasoning = [...document.querySelectorAll('button[class*="group/reasoning"]')].slice(-2).map(info)
  const toolBtns = [...document.querySelectorAll('button, div')].filter(e => /^(已运行|写入|读取|搜索文件|编辑)/.test((e.innerText||'').trim()) && e.getBoundingClientRect().height > 12 && e.getBoundingClientRect().height < 80 && e.children.length <= 4).slice(-3).map(info)
  const tables = [...document.querySelectorAll('table')].slice(0,1).map(t => ({ t: info(t), th: t.querySelector('th') ? info(t.querySelector('th')) : null, td: t.querySelector('td') ? info(t.querySelector('td')) : null }))
  return { theme, slots: [...slots.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,30), reasoning, toolBtns, tables }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
