// ZCode 任务行图标语义 + DSH 相关令牌实际值（只读）
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
  const lis = [...document.querySelectorAll('li.group\\\\/task-item')]
  return lis.slice(0,5).map(li => {
    const holder = li.querySelector('div.relative.flex.size-4')
    const svg = holder ? holder.querySelector('svg') : null
    return { text: (li.innerText||'').trim().slice(0,18),
      html: holder ? holder.innerHTML.slice(0,220) : null,
      svgCls: svg ? (svg.getAttribute('class')||'') : null,
      svgPath: svg ? (svg.innerHTML||'').slice(0,120) : null,
      svgColor: svg ? getComputedStyle(svg).color : null }
  })
})()`)
zc.close()

const dsh = await attach(9223)
const b = await dsh.evl(`(() => {
  const row = document.querySelector('.dcu-wb-session')
  const cs = getComputedStyle(row)
  const pick = n => (cs.getPropertyValue(n)||'').trim()
  const theme = document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
  return { theme,
    selected: pick('--dcu-sidebar-selected'), hover: pick('--dcu-sidebar-hover'),
    secondary: pick('--dcu-sidebar-secondary'), tertiary: pick('--dcu-sidebar-tertiary'),
    primary: pick('--dcu-sidebar-primary'),
    titleColor: getComputedStyle(row.querySelector('.dcu-wb-session-title')).color,
    timeColor: row.querySelector('.dcu-wb-session-time') ? getComputedStyle(row.querySelector('.dcu-wb-session-time')).color : null,
    rowHasIcon: !!row.querySelector('.dcu-wb-session-icon, svg[class*="icon" i]'),
    rowHTMLHead: row.innerHTML.slice(0,300)
  }
})()`)
dsh.close()
console.log('=== ZCODE rows ==='); console.log(JSON.stringify(a, null, 1))
console.log('=== DSH ==='); console.log(JSON.stringify(b, null, 1))
