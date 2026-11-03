// 从 ZCode 活页面提取设计令牌（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value

const out = await evl(`(() => {
  const root = document.documentElement
  const rootCs = getComputedStyle(root)
  // 1) 全部 CSS 变量（root 上声明的）
  const vars = {}
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { continue }
    const walk = rs => { for (const r of rs) {
      if (r.style) { for (const p of r.style) if (p.startsWith('--')) { const v = r.style.getPropertyValue(p).trim(); if (v && !vars[p]) vars[p] = v }
      if (r.cssRules) walk(r.cssRules) } }
    }
    walk(rules)
  }
  // 2) 关键 computed 值
  const body = getComputedStyle(document.body)
  const nav = document.querySelector('[data-testid="v4-turn-navigator"]')
  const btn = nav?.querySelector('button')
  const theme = {htmlClass: root.className, bodyBg: body.backgroundColor, bodyColor: body.color,
    fontFamily: body.fontFamily.slice(0,120), fontSize: body.fontSize}
  // 3) 分类变量
  const byPrefix = {}
  for (const [k,v] of Object.entries(vars)) { const p = k.split('-').slice(0,3).join('-'); (byPrefix[p] ||= []).push(k+'='+v) }
  return {theme, varCount: Object.keys(vars).length,
    prefixes: Object.fromEntries(Object.entries(byPrefix).map(([k,v])=>[k, v.length])),
    bgVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/bg|background|surface/i.test(k)).slice(0,40)),
    labelVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/label|foreground|text/i.test(k)).slice(0,40)),
    borderVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/border|ring|input/i.test(k)).slice(0,30)),
    radiusVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/radius/i.test(k))),
    fontVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/font/i.test(k)).slice(0,25)),
    shadowVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/shadow/i.test(k)).slice(0,20)),
    spaceVars: Object.fromEntries(Object.entries(vars).filter(([k])=>/space|spacing|gap|size-[0-9]/i.test(k)).slice(0,30))}
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
