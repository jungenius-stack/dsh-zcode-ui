// 扫 ZCode 9224：任务区 / 任务行 / 对话框 是否出现样本（只读）
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const pages = list.filter(x => x.type === 'page')
const out = []
for (const p of pages) {
  const ws = new WebSocket(p.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let id = 0
  const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
  const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result ? r.result.value : null }
  const info = await evl(`(() => {
    const txt = document.body ? document.body.innerText : ''
    return {
      title: document.title, url: location.href.slice(0,80),
      dialogs: document.querySelectorAll('[role="dialog"],[role="alertdialog"]').length,
      taskish: [...document.querySelectorAll('[class*="task"],[data-task-id],li[role="listitem"]')].length,
      navItems: [...document.querySelectorAll('nav a,nav button,[role="tab"],[role="menuitem"]')].map(e=>(e.innerText||'').trim().slice(0,12)).filter(Boolean).slice(0,24),
      bodyLen: txt.length
    }
  })()`)
  out.push(info)
  ws.close()
}
console.log(JSON.stringify(out, null, 1))
