// DSH 浅色下插件关键表面（只读）
import { writeFileSync } from 'node:fs'
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }

const out = await evl(`(() => {
  const body = document.body
  const dark = body.hasAttribute('data-ds-dark-theme')
  const row = document.querySelector('.dcu-wb-session')
  const cs = row ? getComputedStyle(row) : null
  const bubble = [...document.querySelectorAll('.icaHSq_column .IzP3Va_bubble')].pop()
  const bs = bubble ? getComputedStyle(bubble) : null
  const code = document.querySelector('.md-code-block')
  const csBlock = code ? getComputedStyle(code) : null
  const pre = document.querySelector('.md-code-block pre')
  const csPre = pre ? getComputedStyle(pre) : null
  const inline = document.querySelector('.icaHSq_column :not(pre) > code')
  const csInline = inline ? getComputedStyle(inline) : null
  return {
    dark,
    sidebar: row ? { selected: cs.getPropertyValue('--dcu-sidebar-selected').trim(), hover: cs.getPropertyValue('--dcu-sidebar-hover').trim(),
      primary: cs.getPropertyValue('--dcu-sidebar-primary').trim(), titleColor: getComputedStyle(row.querySelector('.dcu-wb-session-title')).color,
      bg: cs.backgroundColor, radius: cs.borderTopLeftRadius } : null,
    bubble: bs ? { bg: bs.backgroundColor, border: bs.borderTopWidth + ' ' + bs.borderTopColor, radius: bs.borderTopLeftRadius + ' ' + bs.borderTopRightRadius, pad: bs.padding, lh: bs.lineHeight } : null,
    codeBlock: csBlock ? { bg: csBlock.backgroundColor, border: csBlock.borderTopWidth + ' ' + csBlock.borderTopColor, radius: csBlock.borderTopLeftRadius } : 'none-present',
    pre: csPre ? { bg: csPre.backgroundColor, color: csPre.color, radius: csPre.borderTopLeftRadius } : null,
    inlineCode: csInline ? { bg: csInline.backgroundColor, radius: csInline.borderTopLeftRadius } : null,
    bodyBg: getComputedStyle(document.querySelector('.icaHSq_column') || body).color
  }
})()`)
console.log(JSON.stringify(out, null, 1))
const shot = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/dsh-light.png', Buffer.from(shot.data, 'base64'))
ws.close()
