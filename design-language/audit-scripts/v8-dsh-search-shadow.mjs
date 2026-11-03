// DSH 9223：⌘K 打开插件搜索浮层 → 验阴影 → Esc
import { writeFileSync } from 'node:fs'
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 等插件装载
for (let i = 0; i < 20; i++) { if (await evl(`!!document.querySelector('[data-dcu-codex-sidebar-initialized]')`)) break; await sleep(500) }
console.log('plugin ready')

for (const type of ['rawKeyDown','keyUp']) {
  await call('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 40, modifiers: 4, commands: type === 'rawKeyDown' ? ['selectAll'] : undefined })
  await sleep(100)
}
await sleep(900)
const out = await evl(`(() => {
  const d = document.querySelector('.dcu-search-dialog')
  if (!d) return { none: true }
  const cs = getComputedStyle(d), r = d.getBoundingClientRect()
  return { box: { w: Math.round(r.width), h: Math.round(r.height) }, radius: cs.borderTopLeftRadius, pad: cs.padding,
    bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, shadow: cs.boxShadow,
    scrim: (()=>{const s=document.querySelector('.dcu-search-scrim'); return s?getComputedStyle(s).backgroundColor:null})() }
})()`)
console.log(JSON.stringify(out, null, 1))
const shot = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/dsh-search.png', Buffer.from(shot.data, 'base64'))
for (const type of ['rawKeyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 53 })
await sleep(400)
console.log('closed:', await evl(`document.querySelectorAll('.dcu-search-dialog').length`))
ws.close()
