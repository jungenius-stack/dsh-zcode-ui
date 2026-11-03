// probe8：设置窗口去哪了——Target.getTargets 全量 + 主窗口 root 内部结构对比
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page, targets } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const all1 = (await send('Target.getTargets')).targetInfos.map(t => ({ type: t.type, url: t.url.slice(0, 110), title: t.title, attached: t.attached }))

const INNER = `(() => {
  const root = document.body.firstElementChild;
  const main = document.querySelector('main');
  const gear = document.querySelector('aside button[aria-label="设置"]');
  return {
    gearAriaDisabled: gear ? gear.getAttribute('aria-disabled') : null,
    gearDisabled: gear ? gear.disabled : null,
    gearClasses: gear ? (gear.className||'').toString().slice(0,180) : null,
    mainText: main ? (main.textContent||'').replace(/\\s+/g,' ').trim().slice(0,80) : null,
    rootChildCount: root ? root.children.length : null,
    overlayLike: [...document.querySelectorAll('div')].filter(e => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return cs.position === 'fixed' && r.width > 500 && r.height > 400;
    }).slice(0, 5).map(e => ({ cls: (e.className||'').toString().slice(0,110), rect: (()=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}})(), bg: getComputedStyle(e).backgroundColor })),
  };
})()`
const inner1 = await evaluate(INNER)

await mouse('mouseMoved', 236, 768); await sleep(120)
await mouse('mousePressed', 236, 768, 'left')
await mouse('mouseReleased', 236, 768, 'left')
await sleep(1800)

const all2 = (await send('Target.getTargets')).targetInfos.map(t => ({ type: t.type, url: t.url.slice(0, 110), title: t.title, attached: t.attached }))
const inner2 = await evaluate(INNER)

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, targetsBefore: all1, targetsAfter: all2, innerBefore: inner1, innerAfter: inner2 }
writeFileSync(join(OUT, 'cdp-probe8.json'), JSON.stringify(out, null, 2))
console.log('targets before:', JSON.stringify(all1, null, 1))
console.log('targets after :', JSON.stringify(all2, null, 1))
console.log('gear:', JSON.stringify({ d: inner2.gearDisabled, ad: inner2.gearAriaDisabled }))
console.log('mainText:', inner2.mainText)
console.log('overlayLike:', JSON.stringify(inner2.overlayLike, null, 1).slice(0, 700))
c.ws.close()
