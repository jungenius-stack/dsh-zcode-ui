// item4 对照实验：指针路径对 Radix tooltip 延迟的影响
//   A 组：路径不掠过任何其他 trigger（从正下方 (236,700) 直达齿轮）
//   B 组：从 (5,400) 斜穿会话列表到齿轮
// item5 补测：焦点环在 activeElement 子树中找 boxShadow 实体
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

const TOOLTIP_PRESENT = `(() => {
  const els = [...document.querySelectorAll('[role="tooltip"], [data-radix-popper-content-wrapper]')];
  return els.some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
})()`

const measure = async (from) => {
  await mouse('mouseMoved', from[0], from[1])
  let gone = false
  for (let k = 0; k < 30; k++) { await sleep(60); if (!(await evaluate(TOOLTIP_PRESENT))) { gone = true; break } }
  await sleep(600)
  const t0 = Date.now()
  await mouse('mouseMoved', 236, 768)
  let elapsed = null
  for (let k = 0; k < 250; k++) {
    await sleep(16)
    if (await evaluate(TOOLTIP_PRESENT)) { elapsed = Date.now() - t0; break }
  }
  await mouse('mouseMoved', 5, 400)
  await sleep(800)
  return { from, elapsed, tooltipGoneBeforeStart: gone }
}

const A = [], B = []
for (let i = 0; i < 3; i++) A.push(await measure([236, 700]))
for (let i = 0; i < 3; i++) B.push(await measure([5, 400]))
const med = a => { const s = a.filter(x => x !== null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null }

// ---- item5 补测：焦点环实体查找 ----
await mouse('mouseMoved', 5, 400); await sleep(300)
const FOCUS_RING = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focused: null };
  const withShadow = [];
  const scan = (e, depth) => {
    if (depth > 4 || withShadow.length >= 3) return;
    for (const ch of e.children || []) {
      const cs = getComputedStyle(ch);
      if (cs.boxShadow && cs.boxShadow !== 'none') {
        const r = ch.getBoundingClientRect();
        withShadow.push({ tag: ch.tagName, cls: (ch.className||'').toString().slice(0,120), boxShadow: cs.boxShadow,
          rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} });
      }
      scan(ch, depth + 1);
    }
  };
  scan(el, 0);
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return { focused: { tag: el.tagName, cls: (el.className||'').toString().slice(0,120), aria: el.getAttribute('aria-label'),
      rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow,
      ringColorVar: cs.getPropertyValue('--tw-ring-color').trim() || null,
      matchesFocusVisible: el.matches(':focus-visible') },
    shadowChildren: withShadow };
})()`
const focus2 = []
focus2.push({ step: 'baseline', ...(await evaluate(FOCUS_RING)) })
for (let i = 0; i < 4; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, text: '\t', unmodifiedText: '\t' }, S)
  await sleep(250)
  focus2.push({ step: 'tab-' + (i + 1), ...(await evaluate(FOCUS_RING)) })
}
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await sleep(200)
focus2.push({ step: 'after-click-blank', ...(await evaluate(FOCUS_RING)) })

const out = {
  capturedAt: new Date().toISOString(), pageUrl: page.url,
  tooltipPathAB: {
    A_cleanPath: { runs: A, medianMs: med(A.map(r => r.elapsed)) },
    B_diagonalThroughSessionList: { runs: B, medianMs: med(B.map(r => r.elapsed)) },
    note: 'A=路径不掠过其他 trigger；B=斜穿会话列表（会路过多个潜在 trigger）',
  },
  focusRingDeep: focus2,
}
writeFileSync(join(OUT, 'cdp-item4b-5b.json'), JSON.stringify(out, null, 2))
console.log('A clean:', A.map(r => r.elapsed), 'median', med(A.map(r => r.elapsed)))
console.log('B diagonal:', B.map(r => r.elapsed), 'median', med(B.map(r => r.elapsed)))
for (const f of focus2) console.log('==', f.step, JSON.stringify(f.focused ?? null).slice(0, 300), '| shadows:', JSON.stringify(f.shadowChildren ?? []).slice(0, 300))
c.ws.close()
