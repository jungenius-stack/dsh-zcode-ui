// 探针4：rail hover 显形验证 + tooltip 触发形态试测（均为瞬时交互，指针移走即还原）
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c

const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mousePressed' ? 'left' : 'none', pointerType: 'mouse' }, S)

const readRail = `(() => {
  const nav = [...document.querySelectorAll('nav')].find(n => (n.className||'').includes('w-12'));
  if (!nav) return { nav: null };
  const cs = getComputedStyle(nav);
  const sc = nav.querySelector('[data-scrollbar-container]');
  const inner = sc ? sc.firstElementChild : null;
  return {
    navCls: nav.className.slice(0, 160),
    visible: cs.visibility, opacity: cs.opacity,
    scroller: sc ? { scrollH: sc.scrollHeight, clientH: sc.clientHeight, scrollTop: sc.scrollTop } : null,
    innerH: inner ? inner.style.height || getComputedStyle(inner).height : null,
    children: inner ? [...inner.children].slice(0, 12).map(e => {
      const r = e.getBoundingClientRect(); const c2 = getComputedStyle(e);
      return { tag: e.tagName, cls: (e.className||'').toString().slice(0,120), h: Math.round(r.height), w: Math.round(r.width),
        bg: c2.backgroundColor, opacity: c2.opacity, radius: c2.borderRadius, boxShadow: c2.boxShadow.slice(0,80),
        before: c2.content === 'none' ? 'none' : c2.content.slice(0,20), afterEl: null,
        aria: e.getAttribute('aria-label'), dataState: e.getAttribute('data-state') };
    }) : [],
    childCount: inner ? inner.children.length : 0,
  };
})()`

const readTooltips = `(() => {
  const els = [...document.querySelectorAll('[role="tooltip"], [data-radix-popper-content-wrapper], [class*="tooltip" i]')];
  return els.map(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName, role: e.getAttribute('role'), cls: (e.className||'').toString().slice(0,140),
      rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      bg: cs.backgroundColor, color: cs.color, opacity: cs.opacity, zIndex: cs.zIndex,
      text: (e.textContent||'').slice(0, 60),
      parentCls: e.parentElement ? (e.parentElement.className||'').toString().slice(0,80) : null };
  });
})()`

const log = []

// 1) rail baseline
log.push({ step: 'rail-baseline', rail: await evaluate(readRail) })

// 2) hover 主区中央
await mouse('mouseMoved', 523, 400)
await sleep(700)
log.push({ step: 'hover-main-523-400', rail: await evaluate(readRail) })

// 3) 若有点，hover 第一个可见点
const railNow = await evaluate(`(() => {
  const nav = [...document.querySelectorAll('nav')].find(n => (n.className||'').includes('w-12'));
  const sc = nav && nav.querySelector('[data-scrollbar-container]');
  if (!sc) return null;
  return [...sc.querySelectorAll('*')].filter(e => e.getBoundingClientRect().height > 2).slice(0, 6)
    .map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), cls: (e.className||'').toString().slice(0,90), aria: e.getAttribute('aria-label') } });
})()`)
log.push({ step: 'rail-clickables', railClickables: railNow })
if (railNow && railNow.length) {
  await mouse('mouseMoved', railNow[0].x, railNow[0].y)
  await sleep(500)
  log.push({ step: 'hover-rail-dot', rail: await evaluate(readRail), hoverTarget: railNow[0] })
}

// 4) 移开指针，rail 应回隐
await mouse('mouseMoved', 5, 400)
await sleep(700)
log.push({ step: 'pointer-away', rail: await evaluate(readRail) })

// 5) tooltip 试测：hover「在 Finder 中打开」按钮 (678,43)
await mouse('mouseMoved', 678, 43)
const t0 = Date.now()
let ttLog = []
for (let i = 0; i < 40; i++) {
  await sleep(50)
  const tt = await evaluate(readTooltips)
  if (tt.length) { ttLog.push({ elapsedMs: Date.now() - t0, tooltips: tt }); break }
}
ttLog.push({ elapsedMs: Date.now() - t0, note: 'poll-end', tooltipsFinal: await evaluate(readTooltips) })
log.push({ step: 'tooltip-hover-finder-btn', tooltip: ttLog })

// 6) 移开，看 tooltip 是否消失
await mouse('mouseMoved', 5, 400)
await sleep(600)
log.push({ step: 'tooltip-after-away', tooltips: await evaluate(readTooltips) })

// 7) 试齿轮 (236,768)
await mouse('mouseMoved', 236, 768)
const t1 = Date.now()
let tt2 = []
for (let i = 0; i < 40; i++) {
  await sleep(50)
  const tt = await evaluate(readTooltips)
  if (tt.length) { tt2.push({ elapsedMs: Date.now() - t1, tooltips: tt }); break }
}
if (!tt2.length) tt2.push({ elapsedMs: Date.now() - t1, note: 'no-tooltip-in-2s' })
log.push({ step: 'tooltip-hover-gear', tooltip: tt2 })
await mouse('mouseMoved', 5, 400)
await sleep(500)

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, steps: log }
writeFileSync(join(OUT, 'cdp-probe4.json'), JSON.stringify(out, null, 2))
for (const s of log) {
  console.log('==', s.step)
  console.log(JSON.stringify(s.rail ?? s.tooltip ?? s.railClickables ?? s.tooltips, null, 1).slice(0, 1600))
}
c.ws.close()
