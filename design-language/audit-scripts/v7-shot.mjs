// 会话区截图（只读，不 reload）
import { writeFileSync } from 'node:fs'
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, p = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
const evl = async e => (await call('Runtime.evaluate', { expression: e, returnByValue: true })).result.value
const clip = await evl(`(() => { const c=document.querySelector('[data-conversation-scroll]'); c.scrollTop=c.scrollHeight; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:Math.min(r.height,1100),scale:1} })()`)
await new Promise(r => setTimeout(r, 400))
const shot = await call('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
writeFileSync('/tmp/dsh-bubble.png', Buffer.from(shot.data, 'base64'))
console.log('ok', JSON.stringify(clip))
ws.close()
