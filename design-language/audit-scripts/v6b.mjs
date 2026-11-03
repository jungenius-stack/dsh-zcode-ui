const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value
const NAV=`document.querySelector('nav[aria-label="轮次导航"]')`
const SC=`document.querySelector('[data-conversation-scroll]')`
const RS=`${NAV}?.querySelector('[class*="scroller"]')`

const st = await evl(`(() => { if(!${NAV}) return {nav:false}
  return {nav:true, sh:${SC}.scrollHeight, top:Math.round(${SC}.scrollTop), ticks:${NAV}.querySelectorAll('button[data-index]').length,
    active:${NAV}.querySelector('[aria-current]')?.dataset.index,
    loaded:${NAV}.querySelectorAll('button:not([class*="Unloaded"])').length}})()`)
console.log('环境:', JSON.stringify(st))
if (!st.nav) { console.log('nav 不在，结束'); ws.close(); process.exit(0) }

// A) 已加载非当前刻度的亮度复核（新发现）
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,800))
const bright = await evl(`(() => {
  const bs=[...${NAV}.querySelectorAll('button[data-index]')]
  const act=${NAV}.querySelector('[aria-current]')
  const ld=bs.filter(b=>!b.className.includes('Unloaded') && b!==act)
  return ld.slice(0,3).map(b=>({i:b.dataset.index, cls:b.className.replace(/JXrxFq_/g,''),
    inlineOp:b.style.getPropertyValue('--dcu-zcode-opacity'), inlineColor:b.style.getPropertyValue('--dcu-zcode-color')||'(unset)',
    compOp:+getComputedStyle(b,'::before').opacity, compBg:getComputedStyle(b,'::before').backgroundColor}))
})()`)
console.log('A) 已加载非当前条:', JSON.stringify(bright))

// B) rail 自动跟滚（可靠版）：滚会话到顶，看 rail 滚动与当前条可见性
await evl(`(() => { const s=${RS}; s.scrollTop=s.scrollHeight; return Math.round(s.scrollTop) })()`)
await new Promise(r=>setTimeout(r,250))
const rb = await evl(`Math.round(${RS}.scrollTop)`)
// 用多次小步滚轮到顶
const c = await evl(`(() => { const r=${SC}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
let lastTop = await evl(`Math.round(${SC}.scrollTop)`)
for (let k=0;k<40;k++){
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:c.x,y:c.y,deltaX:0,deltaY:-800})
  await new Promise(r=>setTimeout(r,50))
  const t = await evl(`Math.round(${SC}.scrollTop)`)
  if (t === 0) break
  lastTop = t
}
await new Promise(r=>setTimeout(r,700))
const ra = await evl(`(() => { const a=${NAV}.querySelector('[aria-current]'); const s=${RS}
  const ar=a?.getBoundingClientRect(), sr=s.getBoundingClientRect()
  return {scTop: Math.round(${SC}.scrollTop), railScrollTop: Math.round(s.scrollTop), railMax: s.scrollHeight-s.clientHeight,
    ariaIdx: a?.dataset.index, activeVisible: ar?(ar.top>=sr.top-1&&ar.bottom<=sr.bottom+1):null} })()`)
console.log('B) rail跟滚:', JSON.stringify({railBefore: rb, ...ra}), ra.ariaIdx!=='49' ? '(aria已移动)' : '(aria未动!)')

// C) 浮层结构 + 关闭时延（稳定版）
const mid = await evl(`(() => { const s=${RS}; const sr=s.getBoundingClientRect()
  const bs=[...${NAV}.querySelectorAll('button[data-index]')]
  const vis=bs.filter(b=>{const r=b.getBoundingClientRect(); return r.top>=sr.top+5&&r.bottom<=sr.bottom-5})
  return vis.length? {i:+vis[Math.floor(vis.length/2)].dataset.index, r:vis[Math.floor(vis.length/2)].getBoundingClientRect()} : null})()`)
if (mid) {
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:mid.r.x+mid.r.width/2,y:mid.r.y+mid.r.height/2})
  await new Promise(r=>setTimeout(r,550))
  const tipDom = await evl(`(() => { const t=${NAV}.querySelector('[role=tooltip]'); if(!t) return null
    return {childCount:t.children.length, children:[...t.children].map(c=>c.tagName+' cls='+(c.className||'').toString().replace(/JXrxFq_/g,'').slice(0,24)+' clamp='+getComputedStyle(c).webkitLineClamp),
      h:+t.getBoundingClientRect().height.toFixed(0)} })()`)
  console.log('C) 浮层结构:', JSON.stringify(tipDom))
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:mid.r.x+mid.r.width/2+360,y:mid.r.y+340})
  let closeDelay=null; const t0=Date.now()
  for(let k=0;k<30;k++){ const has=await evl(`!!${NAV}.querySelector('[role=tooltip]')`); if(!has){closeDelay=Date.now()-t0;break} await new Promise(r=>setTimeout(r,25)) }
  console.log('   关闭时延:', closeDelay, 'ms (ZCode closeDelay=80)')
}

// D) focus-visible 焦点环
await evl(`(() => { const b=${NAV}.querySelector('button[data-index]'); b?.focus(); return !!b })()`)
await new Promise(r=>setTimeout(r,150))
const ring = await evl(`(() => { const b=${NAV}.querySelector('button[data-index]:focus')
  if(!b) return null
  const cs=getComputedStyle(b)
  return {outline: cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor, shadow: cs.boxShadow==='none'?'none':cs.boxShadow.slice(0,80)} })()`)
console.log('D) focus环:', JSON.stringify(ring))
await evl(`document.activeElement?.blur?.()`)

// 恢复
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
ws.close()
