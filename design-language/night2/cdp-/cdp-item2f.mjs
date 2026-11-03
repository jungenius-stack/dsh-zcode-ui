// item2 v5（终）：设置面板内 scrollIntoView「代码预览」→ 读 pre
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const themeSnap = await evaluate(snapTheme())
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75, modifiers: 4 }, S)
await sleep(900)
const item = await evaluate(`(() => { const el = [...document.querySelectorAll('[cmdk-item], [role="option"]')].find(e => (e.textContent||'').trim().startsWith('设置')); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
await mouse('mouseMoved', item.x, item.y); await sleep(120)
await mouse('mousePressed', item.x, item.y, 'left'); await mouse('mouseReleased', item.x, item.y, 'left')
await sleep(1500)

const roll = await evaluate(`(() => {
  const p = [...document.querySelectorAll('div')].find(e => { const r = e.getBoundingClientRect(); return Math.abs(r.x - 268) < 6 && Math.abs(r.width - 930) < 10 && r.height > 700 && (e.className||'').toString().includes('rounded-xl'); });
  if (!p) return { found: false, why: 'no panel' };
  const h = [...p.querySelectorAll('h3, h2, h4, [class*="title" i]')].find(x => (x.textContent||'').trim() === '代码预览');
  if (!h) return { found: false, why: 'no heading in panel', headings: [...p.querySelectorAll('h1,h2,h3,h4')].map(x => (x.textContent||'').trim().slice(0,20)).slice(0,10) };
  h.scrollIntoView({ block: 'center' });
  return { found: true, y: Math.round(h.getBoundingClientRect().y), preInPanel: p.querySelectorAll('pre').length };
})()`)
console.log('roll:', JSON.stringify(roll))
await sleep(800)

const res = await evaluate(`(() => {
  const pres = [...document.querySelectorAll('pre')];
  return { preCount: pres.length, texts: pres.slice(0,4).map(p => (p.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40)) };
})()`)
console.log('pre check:', JSON.stringify(res))

let preStyles = null
if (res.preCount > 0) {
  preStyles = await evaluate(`(() => {
    return [...document.querySelectorAll('pre')].slice(0, 6).map(p => {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      const code = p.querySelector('code'); const codeCs = code ? getComputedStyle(code) : null;
      let shell = null; let e = p.parentElement;
      for (let i = 0; e && i < 6; i++, e = e.parentElement) {
        const c2 = getComputedStyle(e);
        if (c2.backgroundColor !== 'rgba(0, 0, 0, 0)') { shell = { cls: (e.className||'').toString().slice(0,110), bg: c2.backgroundColor, radius: c2.borderRadius, padding: [c2.paddingTop,c2.paddingRight,c2.paddingBottom,c2.paddingLeft].join('/') }; break; }
      }
      return { cls: (p.className||'').toString().slice(0,120), rect: {w:Math.round(r.width),h:Math.round(r.height)},
        padding: {top:cs.paddingTop,right:cs.paddingRight,bottom:cs.paddingBottom,left:cs.paddingLeft},
        margin: cs.marginTop + '/' + cs.marginRight + '/' + cs.marginBottom + '/' + cs.marginLeft,
        bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily.slice(0,60),
        codePadding: codeCs ? {top:codeCs.paddingTop,right:codeCs.paddingRight,bottom:codeCs.paddingBottom,left:codeCs.paddingLeft,display:codeCs.display} : null,
        text: (p.textContent||'').replace(/\\s+/g,' ').trim().slice(0,70) };
    });
  })()`)
  const sr = await send('Page.captureScreenshot', { format: 'png' }, S)
  writeFileSync(join(OUT, 'cdp-shot-pre-in-settings.png'), Buffer.from(sr.data, 'base64'))
}

const restored = await evaluate(restoreTheme(themeSnap))
for (let i = 0; i < 2; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
  await sleep(600)
  const ok = await evaluate(`(document.querySelector('main')?.textContent||'').includes('计划议题①裁决')`)
  if (ok) break
}
const backOk = await evaluate(`(document.querySelector('main')?.textContent||'').includes('计划议题①裁决')`)
const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, roll, preCheck: res, preStyles, themeRestored: restored, backToConversation: backOk }
writeFileSync(join(OUT, 'cdp-item2-pre.json'), JSON.stringify(out, null, 2))
if (preStyles) for (const p of preStyles) console.log('PRE padding', JSON.stringify(p.padding), '| margin', p.margin, '| code', JSON.stringify(p.codePadding), '| shell', JSON.stringify(p.shell), '|', p.text.slice(0,40))
console.log('backToConversation:', backOk)
c.ws.close()
