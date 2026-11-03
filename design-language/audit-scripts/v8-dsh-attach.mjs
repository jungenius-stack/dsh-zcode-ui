// DSH 9223：带附件消息 + 折叠钮挂载情况（只读，不 reload）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const out = await evl(`(() => {
  const stacks = [...document.querySelectorAll('.icaHSq_column .IzP3Va_userStack')]
  const rows = stacks.map((s, i) => {
    const bubble = s.querySelector('.IzP3Va_bubble')
    const r = bubble ? bubble.getBoundingClientRect() : null
    const btn = s.querySelector('.dcu-bubble-toggle')
    const br = btn ? btn.getBoundingClientRect() : null
    // 附件迹象：图片 / 文件名 / 附件卡
    const att = s.querySelectorAll('img, [class*="attach" i], [class*="file" i], [class*="preview" i]').length
    const imgs = s.querySelectorAll('img').length
    return { i, h: r ? Math.round(r.height) : null, scrollH: bubble ? bubble.scrollHeight : null,
      att, imgs, hasBtn: !!btn, btnText: btn ? (btn.innerText||'').trim() : null,
      btnBox: br ? {w:Math.round(br.width), h:Math.round(br.height)} : null,
      text: bubble ? (bubble.innerText||'').trim().slice(0,28).replace(/\\n/g,' | ') : null }
  })
  const withAtt = rows.filter(x => x.att > 0)
  return { total: rows.length, withAttachment: withAtt.length, attRows: withAtt.slice(-4),
    overflowNoBtn: rows.filter(x=>x.scrollH && x.h && x.scrollH > x.h + 1 && !x.hasBtn).length,
    btnCount: rows.filter(x=>x.hasBtn).length }
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
