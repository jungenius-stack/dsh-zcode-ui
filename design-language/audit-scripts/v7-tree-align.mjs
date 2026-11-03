// 树内对齐：ZCode 项目标题 vs 任务标题 的左缘；DSH 项目头 vs 会话行 的左缘
async function attach(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const p = list.find(x => x.type === 'page')
  const ws = new WebSocket(p.webSocketDebuggerUrl)
  await new Promise(r => ws.onopen = r)
  let id = 0
  const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
  const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
  return { evl, close: () => ws.close() }
}

const zc = await attach(9224)
const a = await zc.evl(`(() => {
  const proj = document.querySelector('[class*="project-row"]')
  const task = document.querySelector('li.group\\\\/task-item')
  const pText = proj ? [...proj.querySelectorAll('p,span')].find(e=>(e.innerText||'').trim().length>1 && e.getBoundingClientRect().width>20) : null
  const tText = task ? [...task.querySelectorAll('p,span')].find(e=>(e.innerText||'').trim().length>1 && e.getBoundingClientRect().width>20) : null
  const b = e => e ? Math.round(e.getBoundingClientRect().x) : null
  return { projRowX: b(proj), projTextX: b(pText), projText: pText?(pText.innerText||'').trim().slice(0,14):null,
    taskRowX: b(task), taskTextX: b(tText), taskText: tText?(tText.innerText||'').trim().slice(0,14):null,
    projPad: proj?getComputedStyle(proj).padding:null }
})()`)
zc.close()

const dsh = await attach(9223)
const b = await dsh.evl(`(() => {
  const head = document.querySelector('.dcu-wb-project-head')
  const row = document.querySelector('.dcu-wb-session')
  const hText = head ? head.querySelector('.dcu-wb-project-title, .dcu-wb-project-name, span') : null
  const rText = row ? row.querySelector('.dcu-wb-session-title') : null
  const bx = e => e ? Math.round(e.getBoundingClientRect().x) : null
  return { headX: bx(head), headTextX: bx(hText), headText: hText?(hText.innerText||'').trim().slice(0,14):null, headPad: head?getComputedStyle(head).padding:null,
    rowX: bx(row), rowTextX: bx(rText), rowText: rText?(rText.innerText||'').trim().slice(0,14):null }
})()`)
dsh.close()
console.log('ZCODE', JSON.stringify(a, null, 1))
console.log('DSH', JSON.stringify(b, null, 1))
