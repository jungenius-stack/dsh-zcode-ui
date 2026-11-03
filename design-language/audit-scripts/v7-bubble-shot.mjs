// G17 用户轮气泡截图存证（DSH 9223，只读，不 reload）
import fs from 'node:fs'

const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const page = list.find(x => x.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)

let id = 0
const call = (m, p = {}) => new Promise(res => {
  const i = ++id
  const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }
  ws.addEventListener('message', h)
  ws.send(JSON.stringify({ id: i, method: m, params: p }))
})
const evl = async e => {
  const r = await call('Runtime.evaluate', { expression: e, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result.value
}

await call('Page.enable')

const rect = await evl(`(() => {
  const col = document.querySelector('[data-conversation-scroll] .icaHSq_column')
  if (!col) return {error:'no column'}
  const bubbles = [...col.querySelectorAll('.IzP3Va_bubble')]
  if (!bubbles.length) return {error:'no bubble'}
  const b = bubbles[bubbles.length - 1]
  b.scrollIntoView({ block: 'start' })
  const br = b.getBoundingClientRect()
  const colR = col.getBoundingClientRect()
  return { x: br.x, y: br.y, w: br.width, h: br.height, colRight: colR.right, colLeft: colR.left }
})()`)
console.log('rect:', JSON.stringify(rect))
await new Promise(r => setTimeout(r, 500))

const pad = 28
const clip = {
  x: Math.max(0, rect.x - pad),
  y: Math.max(0, rect.y - pad),
  width: Math.min(1400, rect.w + pad * 2),
  height: Math.min(600, rect.h + pad * 2),
  scale: 2,
}
const shot = await call('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })
if (!shot || !shot.data) throw new Error('screenshot failed: ' + JSON.stringify(shot).slice(0, 200))

const outDir = '/Users/m1/Downloads/优化UI插件区/design-language/screenshots'
fs.mkdirSync(outDir, { recursive: true })
const outPath = `${outDir}/g17-bubble-dsh-20261028.png`
fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'))
console.log('saved:', outPath, fs.statSync(outPath).size, 'bytes')
ws.close()
