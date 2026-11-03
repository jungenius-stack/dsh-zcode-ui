// probe6：①复刻 probe4 前置（finder 原生 title 悬停 2.5s → 齿轮）看 693ms 孤例可否复现 ②--color-ring 等 token 值 ③Tab 走到输入框读环
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

const ARM = `(() => { delete window.__ttProbe;
  const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) { if (n.nodeType===1 && (n.matches('[role="tooltip"],[data-radix-popper-content-wrapper]') || n.querySelector('[role="tooltip"],[data-radix-popper-content-wrapper]'))) { if (!window.__ttProbe) window.__ttProbe = { at: performance.now() }; } } });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.__ttArm = performance.now(); window.__ttMo = mo; return true; })()`
const READ = `(() => { const p = window.__ttProbe; return p ? p.at - window.__ttArm : null; })()`
const CLEAN = `(() => { delete window.__ttProbe; delete window.__ttArm; if (window.__ttMo) { window.__ttMo.disconnect(); delete window.__ttMo; } return true; })()`

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url }

// ① 复刻 probe4：finder 悬停 2.5s → 齿轮
out.replica = []
for (let i = 0; i < 2; i++) {
  await mouse('mouseMoved', 5, 400); await sleep(700)
  await mouse('mouseMoved', 678, 43)
  await sleep(2500) // finder title 悬停
  await evaluate(ARM)
  await mouse('mouseMoved', 236, 768)
  let d = null
  for (let k = 0; k < 80; k++) { await sleep(100); d = await evaluate(READ); if (d !== null) break }
  await evaluate(CLEAN)
  await mouse('mouseMoved', 5, 400); await sleep(800)
  out.replica.push({ run: i + 1, deltaMs: d })
}

// ② ring token 现值
out.ringTokens = await evaluate(`(() => {
  const cs = getComputedStyle(document.documentElement);
  const o = {}; for (const n of ['--color-ring','--color-input-border-focused','--color-focus','--color-border-hover','--color-selected'])
    o[n] = cs.getPropertyValue(n).trim();
  return o;
})()`)

// ③ Tab 找输入框/composer 落点（最多 16 次）
const RING = `(() => { const el = document.activeElement; if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  return { tag: el.tagName, type: el.type || null, aria: el.getAttribute('aria-label'), ph: (el.placeholder||'').slice(0,30),
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor + ' off ' + cs.outlineOffset,
    boxShadow: cs.boxShadow.slice(0,140), fv: el.matches(':focus-visible'),
    cls: (el.className||'').toString().slice(0,90) }; })()`
await mouse('mouseMoved', 5, 400); await sleep(250)
out.tabHunt = []
for (let i = 0; i < 16; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, text: '\t', unmodifiedText: '\t' }, S)
  await sleep(200)
  const f = await evaluate(RING)
  out.tabHunt.push(f)
  if (f && (f.tag === 'TEXTAREA' || f.tag === 'INPUT' || /composer|editor/i.test(f.cls || ''))) break
}
// 归位：点空白
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)

writeFileSync(join(OUT, 'cdp-probe6.json'), JSON.stringify(out, null, 2))
console.log('replica:', JSON.stringify(out.replica))
console.log('ringTokens:', JSON.stringify(out.ringTokens, null, 1))
for (const f of out.tabHunt) console.log('tab:', JSON.stringify(f))
c.ws.close()
