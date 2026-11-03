// 完整令牌提取：当前主题全部变量 + 切换浅色主题再取一份（只读+恢复）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value

const COLLECT = `(() => {
  const vars = {}
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { continue }
    const walk = rs => { for (const r of rs) {
      if (r.style) { for (const p of r.style) if (p.startsWith('--')) { const v = r.style.getPropertyValue(p).trim(); if (v && vars[p]===undefined) vars[p]=v }
      if (r.cssRules) walk(r.cssRules) } }
    }
    walk(rules)
  }
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const resolved = {}
  for (const k of Object.keys(vars)) { try { resolved[k] = cs.getPropertyValue(k).trim() } catch {} }
  return {themeClass: root.className, vars, resolved,
    computed: {bg: getComputedStyle(document.body).backgroundColor,
      fg: getComputedStyle(document.body).color, uiFontSize: cs.getPropertyValue('--ui-font-size')}}
})()`

const dark = await evl(COLLECT)
console.log('深色主题变量数:', Object.keys(dark.vars).length, dark.themeClass)

// 尝试切浅色：临时移除 dark 类（写类名属于可逆视图操作，测完恢复）
const light = await evl(`(() => {
  const root = document.documentElement
  const prev = root.className
  root.className = prev.replace(/\\bdark\\b/g,'').replace(/theme-zai-dark/g,'theme-zai-light')
  return prev
})()`)
await new Promise(r=>setTimeout(r,300))
const lightData = await evl(COLLECT)
await evl(`document.documentElement.className = ${JSON.stringify(light)}`)
await new Promise(r=>setTimeout(r,200))
const restored = await evl(`document.documentElement.className`)
console.log('浅色主题变量数:', Object.keys(lightData.vars).length, '| 恢复校验:', restored === light ? 'OK' : 'MISMATCH!')

const fs = await import('node:fs')
fs.writeFileSync('/tmp/zcode-tokens-raw.json', JSON.stringify({dark, light: lightData}, null, 1))
console.log('已写入 /tmp/zcode-tokens-raw.json, size:', fs.statSync('/tmp/zcode-tokens-raw.json').size)

// 摘要：两主题差异最大的变量（= 主题映射逻辑）
const diffs = []
for (const k of Object.keys(dark.resolved)) {
  const d = dark.resolved[k], l = lightData.resolved[k]
  if (d && l && d !== l) diffs.push([k, l, d])
}
console.log('两主题有差异的变量数:', diffs.length)
console.log('样例(前25):')
diffs.slice(0,25).forEach(([k,l,d])=>console.log(' ', k, '| light:', l, '| dark:', d))
ws.close()
