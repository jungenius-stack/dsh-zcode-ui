// 宽扫：ZCode 浮层候选 + DSH 最新用户消息结构（只读）
async function attach(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const p = list.find(x => x.type === 'page')
  const ws = new WebSocket(p.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let id = 0
  const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
  const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }
  return { evl, close: () => ws.close() }
}

const zc = await attach(9224)
const z = await zc.evl(`(() => {
  const cands = [...document.querySelectorAll('body *')].filter(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return (c.position === 'fixed' || c.position === 'absolute') && r.width > 240 && r.height > 100
      && (+c.zIndex || 0) >= 20 && !e.closest('[class*="task-item"]')
  }).map(e => { const c = getComputedStyle(e), r = e.getBoundingClientRect()
    return { cls:(e.className||'').toString().slice(0,60), tag:e.tagName, pos:c.position, z:c.zIndex,
      w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y),
      bg:c.backgroundColor, radius:c.borderTopLeftRadius, shadow:c.boxShadow.slice(0,80), pad:c.padding,
      role:e.getAttribute('role'), text:(e.innerText||'').trim().slice(0,30).replace(/\\n/g,' | ') } })
  return { n: cands.length, cands: cands.slice(0, 10) }
})()`)
zc.close()

const dsh = await attach(9223)
const d = await dsh.evl(`(() => {
  const col = document.querySelector('[data-conversation-scroll] .icaHSq_column')
  const stacks = [...col.querySelectorAll('.IzP3Va_userStack')]
  const last = stacks[stacks.length-1]
  const html = last ? last.innerHTML.slice(0, 700) : null
  const tails = stacks.slice(-3).map((s,i) => ({ i, html: s.innerHTML.slice(0,320) }))
  // 整列里的图片/附件卡
  const media = [...col.querySelectorAll('img, video, [class*="attach" i], [class*="file" i], [class*="upload" i]')]
    .map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,cls:(e.className||'').toString().slice(0,50),w:Math.round(r.width),h:Math.round(r.height),src:(e.getAttribute('src')||'').slice(0,50)}}).filter(x=>x.w>20)
  return { stackCount: stacks.length, lastHTML: html, tails, media: media.slice(0,8) }
})()`)
dsh.close()
console.log('=== ZCODE layers ==='); console.log(JSON.stringify(z, null, 1))
console.log('=== DSH last msg ==='); console.log(JSON.stringify(d, null, 1))
