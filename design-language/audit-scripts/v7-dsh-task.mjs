// DSH 9223：侧栏是否存在任务行/自动化行（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const res = await evl(`(() => {
  const hits = [...document.querySelectorAll('[class*="task" i],[class*="schedule" i],[class*="automation" i]')]
    .map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e)
      return { cls:(e.className||'').toString().slice(0,70), tag:e.tagName, text:(e.innerText||'').trim().slice(0,30).replace(/\\n/g,' | '),
        w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y), show:c.display!=='none'&&r.width>0 } })
    .filter(x => x.show && x.w > 20)
  const sidebar = document.querySelector('aside, nav, [class*="sidebar" i]')
  return { hits: hits.slice(0, 15), sidebarText: sidebar ? (sidebar.innerText||'').replace(/\\n+/g,' | ').slice(0,300) : null }
})()`)
console.log(JSON.stringify(res, null, 1))
ws.close()
