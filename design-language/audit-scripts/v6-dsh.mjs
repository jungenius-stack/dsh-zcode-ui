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

await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
await new Promise(r=>setTimeout(r,900))

// ===== 1) aria / 属性对等性 =====
const aria = await evl(`(() => {
  const nav=${NAV}
  const b=nav.querySelector('button[data-index]')
  return {navAttrs:[...nav.attributes].map(a=>a.name+':'+(a.value.length>20?a.value.slice(0,20)+'…':a.value)),
    btnAttrs:[...b.attributes].map(a=>a.name), ariaBusy: nav.getAttribute('aria-busy'),
    posinset: b.getAttribute('aria-posinset'), setsize: b.getAttribute('aria-setsize')}
})()`)
console.log('1) aria对等:', JSON.stringify(aria))

// ===== 2) markUnloaded 有无视觉区分 =====
const unloadedStyle = await evl(`(() => {
  const bs=[...${NAV}.querySelectorAll('button[data-index]')]
  const un=bs.find(b=>b.className.includes('Unloaded')), ld=bs.find(b=>!b.className.includes('Unloaded'))
  if(!un||!ld) return {unloaded: !!un, loaded: !!ld}
  const cu=getComputedStyle(un,'::before'), cl=getComputedStyle(ld,'::before')
  return {unloadedCount: bs.filter(b=>b.className.includes('Unloaded')).length,
    unOp:cu.opacity, ldOp:cl.opacity, unW:cu.width, ldW:cl.width, unBg:cu.backgroundColor, ldBg:cl.backgroundColor,
    unBtnOp:getComputedStyle(un).opacity, ldBtnOp:getComputedStyle(ld).opacity}
})()`)
console.log('2) markUnloaded样式:', JSON.stringify(unloadedStyle))

// ===== 3) rail 自动跟滚（滚会话到顶，rail 是否滚到露出当前条）=====
await evl(`(() => { const s=${RS}; s.scrollTop=s.scrollHeight; return Math.round(s.scrollTop) })()`)
await new Promise(r=>setTimeout(r,200))
const railBefore = await evl(`Math.round(${RS}.scrollTop)`)
const cpos = await evl(`(() => { const r=${SC}.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
for (let k=0;k<25;k++){ await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:cpos.x,y:cpos.y,deltaX:0,deltaY:-600}); await new Promise(r=>setTimeout(r,45)) }
await new Promise(r=>setTimeout(r,600))
const railAfter = await evl(`(() => { const a=${NAV}.querySelector('[aria-current]'); const s=${RS}
  const ar=a?.getBoundingClientRect()
  const sr=s.getBoundingClientRect()
  return {railScrollTop: Math.round(s.scrollTop), ariaIdx: a?.dataset.index,
    activeVisible: ar ? (ar.top>=sr.top-1 && ar.bottom<=sr.bottom+1) : null} })()`)
console.log('3) rail跟滚:', JSON.stringify({railBefore, ...railAfter}), railAfter.activeVisible ? '✅当前条可见' : '❌当前条被滚出视野')

// ===== 4) 点击落点语义：被点轮次的第一条内容距视口顶 =====
// 先点一条中段的
const t38 = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===38); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:t38.x,y:t38.y})
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:t38.x,y:t38.y,button:'left',clickCount:1})
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:t38.x,y:t38.y,button:'left',clickCount:1})
await new Promise(r=>setTimeout(r,2600))
const landing = await evl(`(() => {
  const sc=${SC}, sr=sc.getBoundingClientRect()
  // 找视口内最顶部的一条用户消息/轮次起点：宿主行有没有可识别标记
  const rows=[...sc.querySelectorAll('[class*="row"],[class*="turn"],[class*="message"]')].filter(r=>{const r2=r.getBoundingClientRect(); return r2.top>sr.top-50 && r2.top<sr.top+400 && r2.height>20})
  const first=rows.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0]
  return {scTop:Math.round(sc.scrollTop), firstRowTop: first? +(first.getBoundingClientRect().top-sr.top).toFixed(0):null,
    firstRowCls: first? (first.className||'').toString().slice(0,50):null}
})()`)
console.log('4) 点击落点(轮首距视口顶):', JSON.stringify(landing))

// ===== 5) 连续快速点击两条 =====
const p10 = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===10); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await evl(`(() => { const el=${SC}; window.__s=[]; const t0=performance.now(); const t=()=>{window.__s.push([Math.round(performance.now()-t0),Math.round(el.scrollTop)]); if(performance.now()-t0<3500) requestAnimationFrame(t)}; requestAnimationFrame(t); return 1 })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p10.x,y:p10.y})
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p10.x,y:p10.y,button:'left',clickCount:1})
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p10.x,y:p10.y,button:'left',clickCount:1})
await new Promise(r=>setTimeout(r,250))
const p44 = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===44); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p44.x,y:p44.y})
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p44.x,y:p44.y,button:'left',clickCount:1})
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p44.x,y:p44.y,button:'left',clickCount:1})
await new Promise(r=>setTimeout(r,3300))
const rapid = await evl(`(() => {
  const s=window.__s, vals=s.map(x=>x[1])
  const dirs=[]; for(let i=1;i<vals.length;i++){ if(vals[i]!==vals[i-1]) dirs.push(Math.sign(vals[i]-vals[i-1])) }
  let flips=0; for(let i=1;i<dirs.length;i++) if(dirs[i]!==dirs[i-1]) flips++
  return {finalTop: Math.round(${SC}.scrollTop), active: ${NAV}.querySelector('[aria-current]')?.dataset.index,
    maxScrolled: Math.max(...vals), minScrolled: Math.min(...vals), dirFlips: flips}
})()`)
console.log('5) 连点10→44:', JSON.stringify(rapid), rapid.active==='44'?'✅最终落对':'❌落错')

// ===== 6) reduced-motion 下点击是否瞬跳 =====
await call('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]})
await new Promise(r=>setTimeout(r,200))
const p20 = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===20); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await evl(`(() => { const el=${SC}; window.__s2=[]; const t0=performance.now(); const t=()=>{window.__s2.push([Math.round(performance.now()-t0),Math.round(el.scrollTop)]); if(performance.now()-t0<2000) requestAnimationFrame(t)}; requestAnimationFrame(t); return 1 })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p20.x,y:p20.y})
await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p20.x,y:p20.y,button:'left',clickCount:1})
await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p20.x,y:p20.y,button:'left',clickCount:1})
await new Promise(r=>setTimeout(r,2300))
const rmClick = await evl(`(() => {
  const s=window.__s2, vals=s.map(x=>x[1])
  const changes=[]; for(let i=1;i<vals.length;i++) if(vals[i]!==vals[i-1]) changes.push([s[i][0],vals[i-1],vals[i]])
  return {changeCount: changes.length, changes: changes.slice(0,8), active: ${NAV}.querySelector('[aria-current]')?.dataset.index}
})()`)
await call('Emulation.setEmulatedMedia', {features:[]})
console.log('6) reduced-motion点击:', JSON.stringify(rmClick), rmClick.changeCount<=2?'✅瞬跳(ZCode语义)':'❌仍在动画')

// ===== 7) 浮层关闭时延 + 结构 =====
const p29 = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===29); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p29.x,y:p29.y})
await new Promise(r=>setTimeout(r,500))
const tipDom = await evl(`(() => { const t=${NAV}.querySelector('[role=tooltip]'); if(!t) return null
  return {children:[...t.children].map(c=>c.tagName+'.'+(c.className||'').toString().replace(/JXrxFq_/g,'').slice(0,20)),
    text: t.textContent.slice(0,60), lineClamp:getComputedStyle(t.firstElementChild||t).webkitLineClamp || getComputedStyle(t.firstElementChild||t).lineClamp} })()`)
await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:p29.x+340,y:p29.y+320})
let closeDelay=null
const t0=Date.now()
for(let k=0;k<25;k++){ const has=await evl(`!!${NAV}.querySelector('[role=tooltip]')`); if(!has){closeDelay=Date.now()-t0;break} await new Promise(r=>setTimeout(r,25)) }
console.log('7) 浮层结构:', JSON.stringify(tipDom), ' 关闭时延:', closeDelay, 'ms (ZCode closeDelay=80)')

// ===== 8) focus-visible 焦点环 =====
await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===25); b.focus(); return 1 })()`)
await new Promise(r=>setTimeout(r,150))
const ring = await evl(`(() => { const b=[...${NAV}.querySelectorAll('button[data-index]')].find(x=>+x.dataset.index===25)
  const cs=getComputedStyle(b)
  return {outline: cs.outlineStyle+' '+cs.outlineWidth, shadow: cs.boxShadow.slice(0,60)} })()`)
console.log('8) focus样式:', JSON.stringify(ring))
await evl(`document.activeElement?.blur()`)

// ===== 9) 空会话/单轮边界 =====
const edge = await evl(`(() => { const navs=[...document.querySelectorAll('nav[aria-label="轮次导航"]')]
  return {navCount: navs.length, hidden: navs.map(n=>getComputedStyle(n).display)} })()`)
console.log('9) nav状态:', JSON.stringify(edge))

// 恢复
await evl(`(() => { const el=${SC}; el.scrollTop=el.scrollHeight; return 1 })()`)
ws.close()
