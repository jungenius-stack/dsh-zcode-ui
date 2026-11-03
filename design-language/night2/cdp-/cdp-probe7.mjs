// probe7：诊断设置页打开——点击前后全屏容器 diff + click 监听验证
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const TOPVIEW = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const tops = [...document.body.children].map(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,110), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      position: cs.position, zIndex: cs.zIndex, display: cs.display, opacity: cs.opacity, bg: cs.backgroundColor };
  });
  return { vw, vh, tops, bodyChildren: document.body.children.length };
})()`

const before = await evaluate(TOPVIEW)

// click 事件监听验证（瞬时探针，读完删）
await evaluate(`(() => { window.__clicks = []; document.addEventListener('click', e => window.__clicks.push({ t: performance.now(), x: e.clientX, y: e.clientY, trusted: e.isTrusted, target: (e.target.className||'').toString().slice(0,60) }), { capture: true, once: false }); return true; })()`)
await mouse('mouseMoved', 236, 768); await sleep(120)
await mouse('mousePressed', 236, 768, 'left')
await sleep(80)
await mouse('mouseReleased', 236, 768, 'left')
await sleep(1500)
const clicks = await evaluate(`(() => { const cl = window.__clicks || []; delete window.__clicks; return cl; })()`)
const after = await evaluate(TOPVIEW)

writeFileSync(join(OUT, 'cdp-probe7.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, before, clicks, after }, null, 2))
console.log('clicks:', JSON.stringify(clicks))
console.log('before bodyChildren:', before.bodyChildren, 'after:', after.bodyChildren)
console.log('before tops:', JSON.stringify(before.tops, null, 1).slice(0, 700))
console.log('after tops:', JSON.stringify(after.tops, null, 1).slice(0, 700))
c.ws.close()
