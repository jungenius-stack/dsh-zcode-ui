// DSH 9223：按文本定位侧栏会话行（只读）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,400) }; return r.result.value }

const res = await evl(`(() => {
  // 取侧栏里含「鹈鹕」的最小元素，往上找行容器
  const all = [...document.querySelectorAll('*')].filter(e => {
    const r = e.getBoundingClientRect()
    return r.width > 80 && r.width < 320 && r.height >= 18 && r.height <= 48 && r.x < 300
      && (e.innerText||'').includes('鹈鹕') && e.children.length <= 6
  })
  const smallest = all.sort((a,b)=>a.innerText.length-b.innerText.length)[0]
  if (!smallest) return { err: 'no match' }
  const chain = []
  let cur = smallest
  for (let i=0; i<5 && cur; i++) {
    const r = cur.getBoundingClientRect(), c = getComputedStyle(cur)
    chain.push({ tag: cur.tagName, cls:(cur.className||'').toString().slice(0,80), w:Math.round(r.width), h:Math.round(r.height),
      x:Math.round(r.x), y:Math.round(r.y), pad:c.padding, gap:c.gap, radius:c.borderTopLeftRadius,
      bg:c.backgroundColor, fs:c.fontSize, lh:c.lineHeight, color:c.color, display:c.display, align:c.alignItems })
    cur = cur.parentElement
  }
  const leafInfo = [...smallest.querySelectorAll('*')].slice(0,6).map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,cls:(e.className||'').toString().slice(0,60),text:(e.innerText||'').trim().slice(0,20),w:Math.round(r.width),h:Math.round(r.height),fs:c.fontSize,lh:c.lineHeight,color:c.color,bg:c.backgroundColor,radius:c.borderTopLeftRadius}})
  return { chain, leafInfo, text: (smallest.innerText||'').trim().slice(0,40) }
})()`)
console.log(JSON.stringify(res, null, 1))
ws.close()
