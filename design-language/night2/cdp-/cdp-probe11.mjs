// probe11：click 是否到达 React root；否则直接调用 React onClick 打开设置
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const VIEW = `(() => ({
  mainText: (document.querySelector('main')?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60),
  settingsBig: [...document.querySelectorAll('[class*="settings" i]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 400 && r.height > 300 }).length,
}))()`

// 1) root 容器 capture 监听
await evaluate(`(() => {
  window.__rootClick = [];
  const root = document.body.firstElementChild;
  root.addEventListener('click', e => window.__rootClick.push({ reachedRoot: true, target: (e.target.className||'').toString().slice(0,50) }), { capture: true });
  return true;
})()`)
await mouse('mouseMoved', 236, 768); await sleep(100)
await mouse('mousePressed', 236, 768, 'left')
await mouse('mouseReleased', 236, 768, 'left')
await sleep(700)
const reached = await evaluate(`(() => { const r = window.__rootClick || []; window.__rootClick && (window.__rootClick = []); return r; })()`)
console.log('reachedRoot:', JSON.stringify(reached))

let how = null
const v0 = await evaluate(VIEW)
if (!reached.length) {
  // 直接调用 React onClick
  how = 'direct-react-onClick'
  await evaluate(`(() => {
    const gear = document.querySelector('aside button[aria-label="设置"]');
    const pk = Object.keys(gear).find(k => k.startsWith('__reactProps$'));
    const ev = { preventDefault(){}, stopPropagation(){}, persist(){}, nativeEvent: new MouseEvent('click', { bubbles: true, clientX: 236, clientY: 768, button: 0 }), type: 'click', clientX: 236, clientY: 768, button: 0, detail: 1, currentTarget: gear, target: gear };
    gear[pk].onClick(ev);
    return 'invoked';
  })()`)
  await sleep(1500)
}
const v1 = await evaluate(VIEW)
console.log('how:', how, 'before:', JSON.stringify(v0), 'after:', JSON.stringify(v1))
writeFileSync(join(OUT, 'cdp-probe11.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, reachedRoot: reached, method: how, viewBefore: v0, viewAfter: v1 }, null, 2))
c.ws.close()
