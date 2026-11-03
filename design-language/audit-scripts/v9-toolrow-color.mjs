// 工具/推理行：ZCode 与 DSH 的内层文字色对比（只读）
async function attach(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const p = list.find(x => x.type === 'page')
  const ws = new WebSocket(p.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let id = 0
  const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
  const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
  return { evl, close: () => ws.close() }
}

const zc = await attach(9224)
const a = await zc.evl(`(() => {
  const btn = [...document.querySelectorAll('button[class*="group/reasoning"]')].pop()
  const dump = (root, label) => {
    if (!root) return null
    const kids = [...root.querySelectorAll('*')].slice(0, 4).map(e => { const c = getComputedStyle(e)
      return { tag: e.tagName, cls: (e.className||'').toString().slice(0,50), color: c.color, fs: c.fontSize, lh: c.lineHeight, fw: c.fontWeight, opacity: c.opacity } })
    const c = getComputedStyle(root)
    return { label, root: { color: c.color, fs: c.fontSize, fw: c.fontWeight, opacity: c.opacity }, kids }
  }
  const tool = [...document.querySelectorAll('[data-slot],[class]')].filter(e => /^写入 |^已运行/.test((e.innerText||'').trim()) && e.getBoundingClientRect().height > 12 && e.getBoundingClientRect().height < 40 && e.children.length <= 3).pop()
  return { theme: document.documentElement.className,
    fg: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground').trim(),
    subtle: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground-subtle').trim(),
    subtlest: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground-subtlest').trim(),
    reasoning: dump(btn, 'reasoning'), tool: dump(tool, 'tool') }
})()`)
zc.close()

const dsh = await attach(9223)
const b = await dsh.evl(`(() => {
  const btn = document.querySelector('[data-process-activity]')
  if (!btn) return { none: true }
  const c = getComputedStyle(btn)
  const kids = [...btn.querySelectorAll('*')].slice(0, 3).map(e => { const k = getComputedStyle(e)
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,40), color: k.color, fs: k.fontSize, fw: k.fontWeight } })
  return { text: (btn.innerText||'').trim().slice(0,26), color: c.color, fs: c.fontSize, fw: c.fontWeight, kids }
})()`)
dsh.close()
console.log('=== ZCODE ==='); console.log(JSON.stringify(a, null, 1))
console.log('=== DSH ==='); console.log(JSON.stringify(b, null, 1))
