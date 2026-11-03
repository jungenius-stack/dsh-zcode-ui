// probe12：齿轮点击后连拍——portal/menu/url/焦点态；菜单项若出现则报告其内容
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const SNAP = `(() => ({
  hasFocus: document.hasFocus(),
  href: location.href.slice(-60),
  bodyChildren: document.body.children.length,
  menus: [...document.querySelectorAll('[role="menu"], [data-radix-popper-content-wrapper], [data-state="open"]')]
    .map(e => ({ tag: e.tagName, role: e.getAttribute('role'), cls: (e.className||'').toString().slice(0,80),
      text: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,80),
      rect: (()=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)}})() }))
    .filter(e => e.rect.w > 0),
  settingsBig: [...document.querySelectorAll('[class*="settings" i]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 400 && r.height > 300 }).length,
}))()`

const t0 = await evaluate(SNAP)
const frames = [t0]
await mouse('mouseMoved', 236, 768); await sleep(100)
await mouse('mousePressed', 236, 768, 'left')
await mouse('mouseReleased', 236, 768, 'left')
for (const delay of [300, 800, 1600, 3000]) { await sleep(delay === 300 ? 300 : delay - (frames.length === 2 ? 300 : frames.length === 3 ? 800 : 1600)); frames.push(await evaluate(SNAP)) }

writeFileSync(join(OUT, 'cdp-probe12.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, frames }, null, 2))
let i = 0
for (const f of frames) { console.log(`-- t${i++}:`, 'hasFocus', f.hasFocus, 'bodyChildren', f.bodyChildren, 'settingsBig', f.settingsBig, 'href', f.href); for (const m of f.menus.slice(0, 4)) console.log('   menu:', JSON.stringify(m)) }
c.ws.close()
