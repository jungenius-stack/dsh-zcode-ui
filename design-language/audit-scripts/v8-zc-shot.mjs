// ZCode 9224 截图（只读）
import { writeFileSync } from 'node:fs'
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const shot = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/zc-now.png', Buffer.from(shot.data, 'base64'))
const vp = await call('Runtime.evaluate', { expression: 'JSON.stringify({w:innerWidth,h:innerHeight})', returnByValue: true })
console.log('saved', vp.result.value)
ws.close()
