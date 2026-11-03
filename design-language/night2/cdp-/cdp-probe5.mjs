// 探针5：rail 显形条件——多点鼠标轨迹 / 滚动触发 / conversation group 结构
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

const readRail = `(() => {
  const nav = [...document.querySelectorAll('nav')].find(n => (n.className||'').includes('w-12'));
  if (!nav) return { nav: null };
  const cs = getComputedStyle(nav);
  const sc = nav.querySelector('[data-scrollbar-container]');
  const inner = sc ? sc.firstElementChild : null;
  return {
    visible: cs.visibility, opacity: cs.opacity, transform: cs.transform.slice(0,40),
    scroller: sc ? { scrollH: sc.scrollHeight, clientH: sc.clientHeight, scrollTop: sc.scrollTop } : null,
    childCount: inner ? inner.children.length : 0,
    dots: inner ? [...inner.querySelectorAll('button, [role="button"], a, div[class*="dot" i], div[data-state]')].slice(0, 10)
      .map(e => { const r = e.getBoundingClientRect(); const c2 = getComputedStyle(e);
        return { x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), w: Math.round(r.width), h: Math.round(r.height),
          cls: (e.className||'').toString().slice(0,110), aria: e.getAttribute('aria-label'), dataState: e.getAttribute('data-state'),
          bg: c2.backgroundColor, boxShadow: c2.boxShadow.slice(0,60) } }) : [],
    navFullCls: nav.className,
  };
})()`

const log = []
const snap = async step => { log.push({ step, ...(await evaluate(readRail)) }); }

// 0) baseline + conversation 容器 class（找 hover group）
await snap('baseline')
log.push({ step: 'conv-classes', conv: await evaluate(`(() => {
  const conv = document.querySelector('[class*="@container/conversation"]');
  return conv ? { cls: conv.className.slice(0,200), parentCls: conv.parentElement.className.slice(0,120) } : null;
})()`) })

// 1) 多点轨迹移入主区
for (const [x, y] of [[300, 200], [400, 300], [523, 400], [600, 450]]) {
  await mouse('mouseMoved', x, y); await sleep(120)
}
await sleep(1500)
await snap('after-trajectory-1.5s')

// 2) 滚动 chat 一小段再 hover
const st0 = await evaluate(`(() => { const chat = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return chat ? chat.scrollTop : null; })()`)
log.push({ step: 'chat-scrollTop-before', st: st0 })
if (st0 !== null) {
  await evaluate(`(() => { const chat = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); if (chat) chat.scrollTop = chat.scrollTop - 1500; return true; })()`)
  await sleep(400)
  for (const [x, y] of [[350, 300], [523, 400]]) { await mouse('mouseMoved', x, y); await sleep(120) }
  await sleep(1200)
  await snap('after-chat-scroll-minus-1500-plus-hover')
  // 还原滚动位
  await evaluate(`(() => { const chat = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); if (chat) chat.scrollTop = ${st0}; return true; })()`)
  await sleep(300)
  log.push({ step: 'chat-scroll-restored', st: await evaluate(`(() => { const chat = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return chat ? chat.scrollTop : null; })()`) })
}

// 3) hover 主区左缘（rail 正上方区域）
for (const [x, y] of [[290, 300], [295, 420]]) { await mouse('mouseMoved', x, y); await sleep(150) }
await sleep(1000)
await snap('after-hover-left-edge')

// 4) 移开
await mouse('mouseMoved', 5, 400); await sleep(600)
await snap('pointer-away')

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, steps: log }
writeFileSync(join(OUT, 'cdp-probe5.json'), JSON.stringify(out, null, 2))
for (const s of log) console.log('==', s.step, JSON.stringify(s).slice(0, 700))
c.ws.close()
