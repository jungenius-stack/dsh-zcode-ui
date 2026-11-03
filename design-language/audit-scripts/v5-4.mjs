const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value

const pt = await evl(`(() => { const b=document.querySelector('[data-testid="v4-turn-navigator"] button[data-item-index="0"]'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:700,y:700})
await new Promise(r=>setTimeout(r,120))
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pt.x,y:pt.y})
await new Promise(r=>setTimeout(r,500))
const geo = await evl(`(() => {
  const nav=document.querySelector('[data-testid="v4-turn-navigator"]')
  const btn=nav.querySelector('button[data-item-index="0"]')
  const span=btn.querySelector('span')
  const tip=document.querySelector('[data-testid^="v4-turn-navigator-tooltip"]')
  const wrap=tip? (tip.closest('[data-radix-popper-content-wrapper]')||tip) : null
  const nr=nav.getBoundingClientRect(), br=btn.getBoundingClientRect(), sr=span.getBoundingClientRect(), wr=wrap?wrap.getBoundingClientRect():null
  return wr ? {
    navW:+nr.width.toFixed(1), navX:+nr.x.toFixed(1),
    btnX:+br.x.toFixed(1), btnW:+br.width.toFixed(1),
    tickX:+sr.x.toFixed(1), tickW:+sr.width.toFixed(1),
    tipX:+wr.x.toFixed(1), tipW:+wr.width.toFixed(1), tipY:+wr.y.toFixed(1), tipH:+wr.height.toFixed(1),
    gapFromTickLeft:+(wr.x-sr.x).toFixed(1),
    gapFromTickRight:+(wr.x-(sr.x+sr.width)).toFixed(1),
    gapFromBtnRight:+(wr.x-br.right).toFixed(1),
    topDelta:+(wr.y-br.y).toFixed(1),
    tipXFromNav:+(wr.x-nr.x).toFixed(1)
  } : null
})()`)
console.log('ZCode 权威几何:', JSON.stringify(geo, null, 1))
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:700,y:700})
ws.close()
