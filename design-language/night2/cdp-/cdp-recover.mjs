// 恢复现场：Esc/返回按钮关设置，验证 main 回来
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const STATE = `(() => ({
  main: !!document.querySelector('main'),
  mainText: (document.querySelector('main')?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40),
  settingsHeadings: [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent||'').trim()).filter(t => /外观|界面|代码|通用|账户|设置/.test(t)).slice(0,6),
  backBtn: (() => { const b = [...document.querySelectorAll('button[aria-label]')].find(x => /返回|关闭|back|close/i.test(x.getAttribute('aria-label'))); if (!b) return null; const r = b.getBoundingClientRect(); return { aria: b.getAttribute('aria-label'), x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), w: Math.round(r.width), h: Math.round(r.height) }; })(),
}))()`

let s = await evaluate(STATE)
console.log('state0:', JSON.stringify(s))

// 尝试 Esc×3
for (let i = 0; i < 3 && !s.main; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
  await sleep(800)
  s = await evaluate(STATE)
  console.log('after Esc', i + 1, ':', JSON.stringify({ main: s.main, mainText: s.mainText.slice(0,20) }))
}
// 若有返回按钮
if (!s.main && s.backBtn && s.backBtn.w > 0) {
  await mouse('mouseMoved', s.backBtn.x, s.backBtn.y); await sleep(120)
  await mouse('mousePressed', s.backBtn.x, s.backBtn.y, 'left'); await mouse('mouseReleased', s.backBtn.x, s.backBtn.y, 'left')
  await sleep(1000)
  s = await evaluate(STATE)
  console.log('after backBtn:', JSON.stringify({ main: s.main, mainText: s.mainText.slice(0,20) }))
}
// 兜底：点侧栏第一个会话行（回到会话）
if (!s.main) {
  const row = await evaluate(`(() => { const b = document.querySelector('aside button'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) }; })()`)
  await mouse('mouseMoved', row.x, row.y); await sleep(120)
  await mouse('mousePressed', row.x, row.y, 'left'); await mouse('mouseReleased', row.x, row.y, 'left')
  await sleep(1200)
  s = await evaluate(STATE)
  console.log('after session row:', JSON.stringify({ main: s.main, mainText: s.mainText.slice(0,25) }))
}
writeFileSync(join(OUT, 'cdp-recover.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, final: s }, null, 2))
c.ws.close()
