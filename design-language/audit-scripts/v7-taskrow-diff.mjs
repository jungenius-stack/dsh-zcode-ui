// 任务行完整差异采集：ZCode 9224 + DSH 9223 各一次（只读）
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
const zcOut = await zc.evl(`(() => {
  const li = [...document.querySelectorAll('li.group\\\\/task-item')].find(x=>(x.innerText||'').length<25)
  const cs = getComputedStyle(li)
  const icon = li.querySelector('div.relative.flex.size-4, span.flex.size-4')
  const ir = icon ? icon.getBoundingClientRect() : null
  const lr = li.getBoundingClientRect()
  const time = [...li.querySelectorAll('*')].find(e=>e.className && /text-ui-sm/.test(e.className))
  const tc = time ? getComputedStyle(time) : null
  const root = getComputedStyle(document.documentElement)
  const body = getComputedStyle(document.body)
  const vars = {}
  for (const v of ['--color-surface-hover','--color-surface','--color-foreground-subtle','--color-border','--color-card']) vars[v] = root.getPropertyValue(v).trim() || body.getPropertyValue(v).trim()
  // 行间距：同组内两条 li 的 y 差
  const lis = [...document.querySelectorAll('li.group\\\\/task-item')].map(e=>Math.round(e.getBoundingClientRect().y)).sort((a,b)=>a-b)
  const gaps = lis.slice(1).map((y,i)=>y-lis[i]).filter(g=>g>0 && g<60)
  return {
    row: { w: Math.round(lr.width), h: Math.round(lr.height), x: Math.round(lr.x), pad: cs.padding, gap: cs.gap, radius: cs.borderTopLeftRadius },
    icon: ir ? { w: Math.round(ir.width), h: Math.round(ir.height), x: Math.round(ir.x), leftOffset: Math.round(ir.x - lr.x) } : null,
    title: { fs: getComputedStyle(li.querySelector('p')).fontSize, lh: getComputedStyle(li.querySelector('p')).lineHeight, color: getComputedStyle(li.querySelector('p')).color, leftOffset: Math.round(li.querySelector('p').getBoundingClientRect().x - lr.x) },
    time: tc ? { fs: tc.fontSize, color: tc.color, text: (time.innerText||'').trim(), cls: time.className.toString().slice(0,60) } : null,
    rowGaps: gaps.slice(0,4), vars
  }
})()`)
zc.close()

const dsh = await attach(9223)
const dshOut = await dsh.evl(`(() => {
  const row = [...document.querySelectorAll('.dcu-wb-session')].find(e=>{const r=e.getBoundingClientRect(); return r.height>20})
  const cs = getComputedStyle(row)
  const r = row.getBoundingClientRect()
  const icon = row.querySelector('svg, [class*="icon" i], img, span:first-child')
  const ir = icon ? icon.getBoundingClientRect() : null
  const title = row.querySelector('.dcu-wb-session-title, .dcu-wb-session-title-text')
  const tc = title ? getComputedStyle(title) : null
  const tr = title ? title.getBoundingClientRect() : null
  const time = row.querySelector('[class*="time" i]')
  const tmc = time ? getComputedStyle(time) : null
  const rows = [...document.querySelectorAll('.dcu-wb-session')].map(e=>Math.round(e.getBoundingClientRect().y)).sort((a,b)=>a-b)
  const gaps = rows.slice(1).map((y,i)=>y-rows[i]).filter(g=>g>0&&g<60)
  // hover 规则文本（从样式表里找 dcu-wb-session 的 hover 声明）
  const hoverRules = []
  for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules } catch { continue }
    for (const x of rs) { if (x.selectorText && /dcu-wb-session/.test(x.selectorText) && /hover|selected|active/.test(x.selectorText)) hoverRules.push(x.cssText.slice(0,200)) } }
  return {
    row: { cls: row.className.toString().slice(0,90), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), pad: cs.padding, gap: cs.gap, radius: cs.borderTopLeftRadius, lh: cs.lineHeight },
    icon: ir ? { w: Math.round(ir.width), h: Math.round(ir.height), x: Math.round(ir.x), leftOffset: Math.round(ir.x - r.x), tag: icon.tagName, cls:(icon.className||'').toString().slice(0,40) } : null,
    title: tc ? { fs: tc.fs || tc.fontSize, lh: tc.lineHeight, color: tc.color, leftOffset: tr?Math.round(tr.x - r.x):null } : null,
    time: tmc ? { fs: tmc.fontSize, color: tmc.color, text: (time.innerText||'').trim(), cls: time.className.toString().slice(0,50) } : null,
    rowGaps: gaps.slice(0,4), hoverRules: hoverRules.slice(0,6)
  }
})()`)
dsh.close()

console.log('=== ZCODE ==='); console.log(JSON.stringify(zcOut, null, 1))
console.log('=== DSH ==='); console.log(JSON.stringify(dshOut, null, 1))
