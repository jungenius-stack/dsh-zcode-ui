// 选择项目 → 创建项目 → 采 dialog → 截图 → Esc（不提交）
import { writeFileSync } from 'node:fs'
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0,300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const click = async (x, y) => { for (const type of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(70) } }
const esc = async () => { for (const type of ['keyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }) }

// 1) 打开项目菜单
const t1 = await evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.innerText||'').trim().startsWith('选择项目')); if(!b) return null; const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
if (!t1) { console.log('no trigger'); ws.close(); process.exit(0) }
await click(t1.x, t1.y); await sleep(600)

// 2) 点「创建项目」
const t2 = await evl(`(() => { const it=[...document.querySelectorAll('[role="menuitem"]')].find(e=>(e.innerText||'').trim()==='创建项目'); if(!it) return null; const r=it.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
if (!t2) { console.log('no create item'); await esc(); ws.close(); process.exit(0) }
await click(t2.x, t2.y); await sleep(900)

// 3) 采样
const sample = await evl(`(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>150&&r.height>60})
  if (!dlg.length) return { none: true, bodyText: (document.body.innerText||'').slice(0,200) }
  const el = dlg[0], cs = getComputedStyle(el), r = el.getBoundingClientRect()
  const box = e => { const rr=e.getBoundingClientRect(); return {w:Math.round(rr.width), h:Math.round(rr.height), x:Math.round(rr.x), y:Math.round(rr.y)} }
  const kids = [...el.querySelectorAll('*')].slice(0,12).map(e=>{const c=getComputedStyle(e)
    return {tag:e.tagName, cls:(e.className||'').toString().slice(0,70), box:box(e), pad:c.padding, gap:c.gap,
      fs:c.fontSize, fw:c.fontWeight, radius:c.borderTopLeftRadius, bg:c.backgroundColor,
      text:(e.innerText||'').trim().slice(0,30).replace(/\\n/g,' | ')}})
  const overlayEl = el.closest('[data-radix-portal]') || el.parentElement
  const ov = overlayEl ? getComputedStyle(overlayEl) : null
  return {
    ariaModal: el.getAttribute('aria-modal'),
    dlg: { pad: cs.padding, gap: cs.gap, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor,
      border: cs.borderTopWidth + ' ' + cs.borderTopColor, shadow: cs.boxShadow,
      maxW: cs.maxWidth, width: cs.width, box: box(el), overflow: cs.overflow },
    kids,
    overlay: ov ? { bg: ov.backgroundColor, backdrop: ov.backdropFilter, pos: ov.position, display: ov.display, align: ov.alignItems, justify: ov.justifyContent } : null
  }
})()`)
console.log('SAMPLE', JSON.stringify(sample, null, 1))

// 4) 截图
const shot = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/zc-dialog.png', Buffer.from(shot.data, 'base64'))
console.log('shot saved')

// 5) 关闭
await esc(); await sleep(500)
console.log('dialogs_after_esc:', await evl(`document.querySelectorAll('[role="dialog"]').length`))
ws.close()
