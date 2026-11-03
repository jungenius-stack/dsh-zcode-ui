const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value
const NAV=`document.querySelector('nav[aria-label="轮次导航"]')`
const SC=`document.querySelector('[data-conversation-scroll]')`

// 回底基线
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return Math.round(el.scrollTop) })()`)
await new Promise(r=>setTimeout(r,800))
const base = await evl(`(() => ({scTop: Math.round(${SC}.scrollTop), max: ${SC}.scrollHeight-${SC}.clientHeight, active: ${NAV}.querySelector('[aria-current]')?.dataset.index, ticks: ${NAV}.querySelectorAll('button[data-index]').length}))()`)
console.log('基线:', JSON.stringify(base))

async function clickSample(idx, ms=2600){
  const pt = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===${idx}); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  if(!pt) return {err:'no btn'}
  await evl(`(() => { const el=${SC}; window.__s=[]; const t0=performance.now()
    const t=()=>{ window.__s.push([Math.round(performance.now()-t0), Math.round(el.scrollTop)]); if(performance.now()-t0<${ms}) requestAnimationFrame(t) }
    requestAnimationFrame(t); return 1 })()`)
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pt.x,y:pt.y})
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:pt.x,y:pt.y,button:'left',clickCount:1})
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pt.x,y:pt.y,button:'left',clickCount:1})
  await new Promise(r=>setTimeout(r,ms+300))
  const seq = await evl(`window.__s`)
  const after = await evl(`(() => ({scTop: Math.round(${SC}.scrollTop), active: ${NAV}.querySelector('[aria-current]')?.dataset.index}))()`)
  const vals=seq.map(x=>x[1]); const d=[]; for(let i=1;i<vals.length;i++) d.push(Math.abs(vals[i]-vals[i-1]))
  const from=vals[0], to=vals[vals.length-1]
  // 闪跳：出现「远离 from 且远离 to」或「先到 to 附近又回 from 附近」的中间帧
  let flash=false, flashMs=null
  const iTo = vals.findIndex(v=>Math.abs(v-to)<5)
  if (iTo>=0) { const iBack = vals.findIndex((v,i)=>i>iTo&&Math.abs(v-from)<5); if(iBack>iTo){flash=true;flashMs=seq[iBack][0]-seq[iTo][0]} }
  return {idx, frames:seq.length, from, to, span:Math.abs(to-from),
    visibleSteps: d.filter(x=>x>1).length, bigJumps:d.filter(x=>x>400).length,
    flash, flashMs, finalActive: after.active, landedCorrectly: String(after.active)===String(idx),
    head: seq.slice(0,10)}
}
console.log('\n== 点击手感 ==')
for (const i of [43, 12]) {
  const r = await clickSample(i)
  console.log(JSON.stringify(r))
  await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
  await new Promise(r=>setTimeout(r,900))
}
ws.close()
