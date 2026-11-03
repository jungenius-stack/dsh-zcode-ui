// 输入区双端实测：ZCode 9224 vs DSH 9223（只读，均浅色）
async function attach(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const p = list.find(x => x.type === 'page')
  const ws = new WebSocket(p.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let id = 0
  const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
  const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result.value }
  return { evl, close: () => ws.close() }
}

const zc = await attach(9224)
const z = await zc.evl(`(() => {
  const theme = document.documentElement.className
  // ZCode 输入卡片：找包含 textarea/contenteditable 的最近的大圆角容器
  const ed = document.querySelector('[contenteditable="true"], textarea')
  if (!ed) return { none: true, theme }
  const info = e => { if (!e) return null; const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return { cls: (e.className||'').toString().slice(0, 70), w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.x), y: Math.round(r.y), bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor,
      radius: c.borderTopLeftRadius, pad: c.padding, gap: c.gap, shadow: c.boxShadow.slice(0, 90),
      fs: c.fontSize, lh: c.lineHeight, color: c.color } }
  // 往上找 5 层
  const chain = []
  let cur = ed
  for (let i = 0; i < 5 && cur; i++) { chain.push(info(cur)); cur = cur.parentElement }
  const placeholder = ed.getAttribute('aria-placeholder') || ed.getAttribute('data-placeholder') || ed.getAttribute('placeholder') || ''
  const btns = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.height > 20 && r.height < 44 && r.y > innerHeight - 220 })
  return { theme, placeholder, chain,
    buttons: btns.slice(0, 14).map(b => ({ label: (b.getAttribute('aria-label')||b.innerText||'').trim().slice(0, 12), ...info(b) })) }
})()`)
zc.close()

const dsh = await attach(9223)
const d = await dsh.evl(`(() => {
  const card = document.querySelector('[data-composer-card]')
  const ed = document.querySelector('[contenteditable="true"], textarea')
  const info = e => { if (!e) return null; const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return { cls: (e.className||'').toString().slice(0, 70), w: Math.round(r.width), h: Math.round(r.height),
      x: Math.round(r.x), y: Math.round(r.y), bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor,
      radius: c.borderTopLeftRadius, pad: c.padding, gap: c.gap, shadow: c.boxShadow.slice(0, 90),
      fs: c.fontSize, lh: c.lineHeight, color: c.color } }
  const chain = []
  let cur = ed
  for (let i = 0; i < 5 && cur; i++) { chain.push(info(cur)); cur = cur.parentElement }
  const btns = [...card.querySelectorAll('button')].slice(0, 14)
  return { theme: document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light',
    card: info(card), chain,
    placeholder: ed ? (ed.getAttribute('aria-placeholder') || ed.getAttribute('placeholder') || ed.getAttribute('data-placeholder') || '') : '',
    buttons: btns.map(b => ({ label: (b.getAttribute('aria-label')||b.innerText||'').trim().slice(0, 12), ...info(b) })) }
})()`)
dsh.close()
console.log('=== ZCODE ==='); console.log(JSON.stringify(z, null, 1))
console.log('=== DSH ==='); console.log(JSON.stringify(d, null, 1))
