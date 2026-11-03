const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value
const NAV=`document.querySelector('nav[aria-label="轮次导航"]')`
const SC=`document.querySelector('[data-conversation-scroll]')`

// 回底
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,800))

// A) 宿主会话行 DOM 属性探针（看是否存在「轮次→位置」的直接映射）
const domProbe = await evl(`(() => {
  const sc = ${SC}
  const rows = [...sc.querySelectorAll('[data-index],[data-row-id],[data-turn-id],[data-message-id],article,[data-testid]')].slice(0,5)
  const sample = rows.map(r => ({tag:r.tagName, attrs:[...r.attributes].map(a=>a.name).slice(0,8)}))
  return {rowCount: sc.querySelectorAll('[data-index]').length, sample}
})()`)
console.log('A) 会话行 DOM:', JSON.stringify(domProbe).slice(0,700))

// B) 提示框几何：中段 + 首尾
async function tipAt(idx){
  const geo = await evl(`(() => {
    const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===${idx})
    if(!b) return null
    const r=b.getBoundingClientRect(); const rail=${NAV}.getBoundingClientRect()
    return {x:r.x+r.width/2, y:r.y+r.height/2, tickLeft:+r.x.toFixed(1), tickRight:+(r.x+r.width).toFixed(1),
      vis: r.top>=rail.top-1 && r.bottom<=rail.bottom+1}
  })()`)
  if(!geo) return {idx, err:'no btn'}
  if(!geo.vis) return {idx, err:'out of rail viewport'}
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:geo.x+300,y:geo.y})
  await new Promise(r=>setTimeout(r,120))
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:geo.x,y:geo.y})
  await new Promise(r=>setTimeout(r,450))
  const t = await evl(`(() => {
    const nav=${NAV}; const tip=nav.querySelector('[role=tooltip]')
    if(!tip) return null
    const wrap=tip.closest('[data-radix-popper-content-wrapper]')||tip
    const wr=wrap.getBoundingClientRect()
    const b=[...nav.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===${idx}); const br=b.getBoundingClientRect()
    return {w:+wr.width.toFixed(1), h:+wr.height.toFixed(1),
      leftGapFromTickLeft:+(wr.x-br.x).toFixed(1), leftGapFromTickRight:+(wr.x-br.right).toFixed(1),
      topDelta:+(wr.y-br.y).toFixed(1)}
  })()`)
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:geo.x+340,y:geo.y+320})
  await new Promise(r=>setTimeout(r,150))
  return t?{idx, ...t}:{idx, err:'no tooltip'}
}
console.log('\nB) DSH 提示框几何:')
const railMax = await evl(`(() => { const s=${NAV}.querySelector('[class*="scroller"]'); s.scrollTop=0; return 1 })()`)
await new Promise(r=>setTimeout(r,220))
for (const i of [0,1,2]) console.log('  ', JSON.stringify(await tipAt(i)))
await evl(`(() => { const s=${NAV}.querySelector('[class*="scroller"]'); s.scrollTop=s.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,220))
const cnt = await evl(`${NAV}.querySelectorAll('button[data-index]').length`)
for (const i of [cnt-3, cnt-2, cnt-1]) console.log('  ', JSON.stringify(await tipAt(i)))
// 中段
const mid = await evl(`(() => { const s=${NAV}.querySelector('[class*="scroller"]'); s.scrollTop=Math.round(s.scrollHeight/2); return ${NAV}.querySelectorAll('button[data-index]').length })()`)
await new Promise(r=>setTimeout(r,220))
const midIdx = await evl(`(() => { const s=${NAV}.querySelector('[class*="scroller"]'); const sr=s.getBoundingClientRect()
  const bs=[...${NAV}.querySelectorAll('button[data-index]')]
  const vis=bs.filter(b=>{const r=b.getBoundingClientRect(); return r.top>=sr.top+5&&r.bottom<=sr.bottom-5})
  return vis.length? +vis[Math.floor(vis.length/2)].dataset.index : null })()`)
if (midIdx !== null) console.log('  ', JSON.stringify(await tipAt(midIdx)))
ws.close()
