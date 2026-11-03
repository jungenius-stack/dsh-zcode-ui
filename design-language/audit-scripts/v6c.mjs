const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value
const NAV=`document.querySelector('nav[aria-label="轮次导航"]')`
const SC=`document.querySelector('[data-conversation-scroll]')`
const RS=`${NAV}.querySelector('[class*="scroller"]')`

// A) 键盘 Tab 进入 rail：焦点环是否可见（keyboard-origin focus-visible）
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:400})  // 鼠标先落在内容区，避免指针态
await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
let found=null
for (let k=0;k<40;k++){
  const r = await evl(`(() => { const el=document.activeElement
    if(el && el.tagName==='BUTTON' && ${NAV} && ${NAV}.contains(el)) return {idx:el.dataset.index, outline:getComputedStyle(el).outlineStyle, ow:getComputedStyle(el).outlineWidth, oc:getComputedStyle(el).outlineColor, shadow:getComputedStyle(el).boxShadow.slice(0,70), fv: el.matches(':focus-visible')}
    return null })()`)
  if (r) { found=r; break }
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
}
console.log('A) Tab进入rail后焦点态:', JSON.stringify(found))
await evl(`document.activeElement?.blur?.()`)

// B) 点击顶部刻度：aria 是否移动 + rail 是否自动滚到露出它
await evl(`(() => { const s=${RS}; s.scrollTop=s.scrollHeight; const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,700))
const b3 = await evl(`(() => { const b=${NAV}.querySelector('button[data-index="3"]'); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2, vis:(()=>{const s=${RS}.getBoundingClientRect(); return r.top>=s.top-1&&r.bottom<=s.bottom+1})()} })()`)
if (b3) {
  // 如果 tick3 在 rail 视野外，先记录（预期：点击后应被自动滚进来）
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:b3.x,y:b3.y})
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x:b3.x,y:b3.y,button:'left',clickCount:1})
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:b3.x,y:b3.y,button:'left',clickCount:1})
  await new Promise(r=>setTimeout(r,2500))
  const r3 = await evl(`(() => { const a=${NAV}.querySelector('[aria-current]'); const s=${RS}
    const ar=a?.getBoundingClientRect(), sr=s.getBoundingClientRect()
    return {ariaIdx:a?.dataset.index, railScrollTop:Math.round(s.scrollTop), railMax:Math.round(s.scrollHeight-s.clientHeight),
      activeVisible: ar?(ar.top>=sr.top-1&&ar.bottom<=sr.bottom+1):null, scTop:Math.round(${SC}.scrollTop)} })()`)
  console.log('B) 点tick3后:', JSON.stringify({tick3WasVisible: b3.vis, ...r3}),
    r3.ariaIdx==='3' ? (r3.activeVisible ? '✅aria到3且rail露出' : '⚠️aria到3但rail没跟(看不见高亮)') : `aria=${r3.ariaIdx}`)
}

// C) 浮层关闭时延（正确退出路径：移出浮层范围）
await evl(`(() => { const s=${RS}; s.scrollTop=s.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,300))
const mid = await evl(`(() => { const s=${RS}; const sr=s.getBoundingClientRect()
  const bs=[...${NAV}.querySelectorAll('button[data-index]')]
  const vis=bs.filter(b=>{const r=b.getBoundingClientRect(); return r.top>=sr.top+5&&r.bottom<=sr.bottom-5})
  return vis.length? vis[Math.floor(vis.length/2)].getBoundingClientRect() : null})()`)
if (mid) {
  const px = mid.x+mid.width/2, py = mid.y+mid.height/2
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:px,y:py})
  await new Promise(r=>setTimeout(r,550))
  const open = await evl(`!!${NAV}.querySelector('[role=tooltip]')`)
  // 退出：向下移 60px（出按钮、出浮层——浮层在右侧，向下离开即可）
  const t0=Date.now()
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:px,y:py+70})
  let closeDelay=null
  for(let k=0;k<40;k++){ const has=await evl(`!!${NAV}.querySelector('[role=tooltip]')`); if(!has){closeDelay=Date.now()-t0;break} await new Promise(r=>setTimeout(r,25)) }
  console.log('C) 浮层打开:', open, ' 关闭时延:', closeDelay, 'ms (ZCode: open 120 / close 80)')
}

// 恢复
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:900,y:700})
ws.close()
