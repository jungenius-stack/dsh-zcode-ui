// item4 裁决实验：处女 trigger（从未 hover 过）的 tooltip 首延 vs 复延
//   若首延 ~700ms 且复延 ~6s → ZCode「首次快、复次慢」；若首延也 ~6s → delay 本来就长
// item5 修正：CSSOM 递归（含嵌套规则）找 :focus-visible 的 outline/box-shadow
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

// 找侧栏底部未碰过的图标按钮
const pick = await evaluate(`(() => {
  const btns = [...document.querySelectorAll('aside button[aria-label]')].filter(b => b.getAttribute('aria-label') !== '设置');
  return btns.slice(0, 6).map(b => { const r = b.getBoundingClientRect(); return { aria: b.getAttribute('aria-label'), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: Math.round(r.width), h: Math.round(r.height) } });
})()`)
console.log('candidates:', JSON.stringify(pick))
const target = pick.find(b => b.w > 4 && b.h > 4)
if (!target) throw new Error('no fresh trigger found')

const ARM = `(() => {
  delete window.__ttProbe;
  const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) { if (n.nodeType===1 && (n.matches('[role="tooltip"],[data-radix-popper-content-wrapper]') || n.querySelector('[role="tooltip"],[data-radix-popper-content-wrapper]'))) { if (!window.__ttProbe) window.__ttProbe = { at: performance.now() }; } } });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.__ttArm = performance.now(); window.__ttMo = mo;
  return true;
})()`
const READ = `(() => { const p = window.__ttProbe; return p ? p.at - window.__ttArm : null; })()`
const CLEAN = `(() => { delete window.__ttProbe; delete window.__ttArm; if (window.__ttMo) { window.__ttMo.disconnect(); delete window.__ttMo; } return true; })()`

const measure = async (x, y) => {
  await mouse('mouseMoved', 5, 400)
  await sleep(900)
  await evaluate(ARM)
  await mouse('mouseMoved', x, y)
  let d = null
  for (let k = 0; k < 80; k++) { await sleep(100); d = await evaluate(READ); if (d !== null) break }
  await evaluate(CLEAN)
  await mouse('mouseMoved', 5, 400)
  await sleep(800)
  return d
}

const verdict = { target, firstHover: null, repeatHovers: [] }
verdict.firstHover = await measure(target.x, target.y)          // 1st ever on this trigger
for (let i = 0; i < 2; i++) verdict.repeatHovers.push(await measure(target.x, target.y))
// 再回齿轮（已被 hover 过多次的）确认仍 ~6s
const gear = await evaluate(`(() => { const b = document.querySelector('aside button[aria-label="设置"]'); const r = b.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
verdict.gearRepeat = await measure(gear.x, gear.y)

// ---- item5 修正 CSSOM ----
const CSSOM = `(() => {
  const hits = [];
  const walk = (list, depth) => {
    for (const rule of list) {
      if (depth > 6 || hits.length > 60) return;
      const t = rule.selectorText || '';
      if (t.includes(':focus-visible')) {
        const body = rule.style ? rule.style.cssText : '';
        if (/outline|box-shadow|ring/.test(body)) hits.push({ sel: t.slice(0, 200), css: body.slice(0, 240) });
      }
      if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules, depth + 1);
    }
  };
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; if (!rules || !rules.length) continue } catch { continue }
    walk(rules, 0);
    if (hits.length > 60) break;
  }
  return { sheetCount: document.styleSheets.length, hits };
})()`
const css = await evaluate(CSSOM)

// 聚焦一个「行」类元素读环（Tab 后）
await mouse('mouseMoved', 5, 400); await sleep(200)
const focusSeq = []
const RING = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  return { tag: el.tagName, aria: el.getAttribute('aria-label'), cls: (el.className||'').toString().slice(0,100),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' offset ' + cs.outlineOffset,
    boxShadow: cs.boxShadow, fv: el.matches(':focus-visible') };
})()`
focusSeq.push(await evaluate(RING))
for (let i = 0; i < 3; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, text: '\t', unmodifiedText: '\t' }, S)
  await sleep(220)
  focusSeq.push(await evaluate(RING))
}
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url,
  item4_verdict: { ...verdict, note: 'firstHover=该按钮首次 hover；repeatHovers=第2/3次；gearRepeat=齿轮（已多次 hover）' },
  item5_cssom: css, item5_tabSeq: focusSeq }
writeFileSync(join(OUT, 'cdp-item4d-5d.json'), JSON.stringify(out, null, 2))
console.log('verdict:', JSON.stringify(verdict, null, 1))
console.log('cssom sheets:', css.sheetCount, 'hits:', css.hits.length)
for (const h of css.hits.slice(0, 15)) console.log('  ', h.sel.slice(0, 90), '=>', h.css.slice(0, 130))
for (const f of focusSeq) console.log('focus:', JSON.stringify(f))
c.ws.close()
