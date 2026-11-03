// probe9：⌘, 打开设置 + window 桥枚举（只读）+ 视图变化检测
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const VIEW = `(() => {
  const main = document.querySelector('main');
  const bigs = [...document.querySelectorAll('div, section')].filter(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return cs.position === 'fixed' && r.width > 600 && r.height > 500;
  }).length;
  return { mainText: main ? (main.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60) : null,
    fixedBigs: bigs,
    settingsBig: [...document.querySelectorAll('[class*="settings" i]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 400 && r.height > 300 }).length };
})()`

const bridges = await evaluate(`(() => {
  const names = Object.keys(window).filter(k => /zcode|electron|app|ds|h/i.test(k)).slice(0, 40);
  const zc = window.zcode || window.ZCode || null;
  return { names, zcodeType: zc ? typeof zc : null, zcodeKeys: zc && typeof zc === 'object' ? Object.keys(zc).slice(0, 40) : null };
})()`)
console.log('bridges:', JSON.stringify(bridges))

const v0 = await evaluate(VIEW)
// ⌘,
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: ',', code: 'Comma', windowsVirtualKeyCode: 188, nativeVirtualKeyCode: 188, modifiers: 4, unmodifiedText: ',' }, S)
await sleep(1800)
const v1 = await evaluate(VIEW)

writeFileSync(join(OUT, 'cdp-probe9.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, bridges, before: v0, afterCmdComma: v1 }, null, 2))
console.log('before:', JSON.stringify(v0))
console.log('afterCmdComma:', JSON.stringify(v1))
c.ws.close()
