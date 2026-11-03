// ZCode 9224 浅色主题令牌与任务行实值（只读，ZT2）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const html = document.documentElement, body = document.body
  const names = ['--color-surface-hover','--color-surface','--color-border','--color-card','--color-menu','--color-menu-hover',
    '--color-popover','--color-popover-border','--color-tag','--color-hover','--color-input-border','--color-input',
    '--color-foreground','--color-foreground-subtle','--color-foreground-subtlest','--color-background',
    '--color-muted','--color-primary','--color-destructive']
  const readVar = n => { for (const el of [html, body]) { const v = getComputedStyle(el).getPropertyValue(n).trim(); if (v) return v } return '' }
  const vars = Object.fromEntries(names.map(n => [n, readVar(n)]))
  const themeFlags = { htmlClass: html.className, htmlData: [...html.attributes].map(a=>a.name).filter(x=>/theme|dark|light/i.test(x)),
    bodyClass: body.className, bodyData: [...body.attributes].map(a=>a.name).filter(x=>/theme|dark|light/i.test(x)),
    colorScheme: getComputedStyle(html).colorScheme }
  const li = [...document.querySelectorAll('li.group\\\\/task-item')].find(x=>(x.innerText||'').length<25)
  const rowInfo = li ? (() => {
    const p2 = li.querySelector('p'), t = [...li.querySelectorAll('*')].find(e=>e.className && /text-ui-sm/.test(e.className))
    return { bg: getComputedStyle(li).backgroundColor, titleColor: p2?getComputedStyle(p2).color:null,
      timeColor: t?getComputedStyle(t).color:null, timeText: t?(t.innerText||'').trim():null } })() : null
  return { themeFlags, vars, rowInfo }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
