// DSH 是否空闲（有无正在生成的轮次）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const a = await evl(`(() => {
  const stopish = [...document.querySelectorAll('button')].filter(b=>/停止|stop/i.test((b.getAttribute('aria-label')||'')+(b.innerText||''))).map(b=>b.getAttribute('aria-label')||b.innerText)
  return { stopish, streaming: document.querySelectorAll('[data-streaming],[class*="streaming" i],[aria-busy="true"]').length,
    composerVal: (document.querySelector('[contenteditable="true"],textarea')?.value || document.querySelector('[contenteditable="true"]')?.innerText || '').slice(0,20) }
})()`)
await new Promise(r=>setTimeout(r,1500))
const b = await evl(`document.querySelectorAll('[data-conversation-scroll] .icaHSq_flowItem').length`)
console.log(JSON.stringify({ a, flowItems: b }))
ws.close()
