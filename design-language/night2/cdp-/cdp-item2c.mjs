// item2 v2：设置页「代码设置 → 代码预览」里找 pre，读内边距；读完 Esc 还原
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const themeSnap = await evaluate(snapTheme())

// ⌘K → 设置
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75, modifiers: 4 }, S)
await sleep(900)
const item = await evaluate(`(() => { const el = [...document.querySelectorAll('[cmdk-item], [role="option"]')].find(e => (e.textContent||'').trim().startsWith('设置')); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
if (!item) throw new Error('设置 item not found')
await mouse('mouseMoved', item.x, item.y); await sleep(120)
await mouse('mousePressed', item.x, item.y, 'left'); await mouse('mouseReleased', item.x, item.y, 'left')
await sleep(1500)

// 设置页里找 pre
let r1 = await evaluate(`(() => {
  const pres = [...document.querySelectorAll('pre')];
  return { preCount: pres.length,
    navCandidates: [...document.querySelectorAll('button, [role="tab"], a')].map(b => (b.textContent||'').replace(/\\s+/g,' ').trim()).filter(t => /代码|code/i.test(t)).slice(0, 6),
    headings: [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent||'').trim().slice(0,25)).filter(Boolean).slice(0, 12) };
})()`)
console.log('settings pre count:', r1.preCount, '| code nav:', JSON.stringify(r1.navCandidates), '| headings:', JSON.stringify(r1.headings))

// 若无 pre，点「代码设置」导航
if (r1.preCount === 0 && r1.navCandidates.length) {
  const nav = await evaluate(`(() => { const el = [...document.querySelectorAll('button, [role="tab"], a')].find(b => (b.textContent||'').replace(/\\s+/g,' ').trim().includes('代码设置')); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
  if (nav) {
    await mouse('mouseMoved', nav.x, nav.y); await sleep(120)
    await mouse('mousePressed', nav.x, nav.y, 'left'); await mouse('mouseReleased', nav.x, nav.y, 'left')
    await sleep(900)
    r1 = await evaluate(`(() => ({ preCount: document.querySelectorAll('pre').length, headings: [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent||'').trim().slice(0,25)).filter(Boolean).slice(0,12) }))()`)
    console.log('after nav 代码设置:', JSON.stringify(r1))
  }
}

let preStyles = null
if (r1.preCount > 0) {
  preStyles = await evaluate(`(() => {
    return [...document.querySelectorAll('pre')].slice(0, 6).map(p => {
      const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
      const code = p.querySelector('code'); const codeCs = code ? getComputedStyle(code) : null;
      let shell = null; let e = p.parentElement;
      for (let i = 0; e && i < 6; i++, e = e.parentElement) {
        const c2 = getComputedStyle(e);
        if (c2.backgroundColor !== 'rgba(0, 0, 0, 0)') { shell = { cls: (e.className||'').toString().slice(0,100), bg: c2.backgroundColor, radius: c2.borderRadius, padding: [c2.paddingTop,c2.paddingRight,c2.paddingBottom,c2.paddingLeft].join('/') }; break; }
      }
      return { cls: (p.className||'').toString().slice(0,110), rect: {w:Math.round(r.width),h:Math.round(r.height)},
        padding: {top:cs.paddingTop,right:cs.paddingRight,bottom:cs.paddingBottom,left:cs.paddingLeft},
        margin: cs.marginTop + '/' + cs.marginRight + '/' + cs.marginBottom + '/' + cs.marginLeft,
        bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily.slice(0,60),
        codePadding: codeCs ? {top:codeCs.paddingTop,right:codeCs.paddingRight,bottom:codeCs.paddingBottom,left:codeCs.paddingLeft} : null,
        text: (p.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60) };
    });
  })()`)
  await send('Page.captureScreenshot', { format: 'png' }, S).then(r => writeFileSync(join(OUT, 'cdp-shot-pre-in-settings.png'), Buffer.from(r.data, 'base64')))
}

// Esc×2 关设置 + 还原主题类
const restored = await evaluate(restoreTheme(themeSnap))
for (let i = 0; i < 2; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
  await sleep(600)
  const t = await evaluate(`!!document.querySelector('main')`)
  if (t) break
}
const backOk = await evaluate(`!!document.querySelector('main') && document.querySelectorAll('pre').length`)

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, initialProbe: r1, preStyles, themeRestored: restored, mainBack: backOk[0] === true, preCountAfterClose: backOk[1] }
writeFileSync(join(OUT, 'cdp-item2-pre.json'), JSON.stringify(out, null, 2))
if (preStyles) for (const p of preStyles) console.log('PRE padding', JSON.stringify(p.padding), '| code', JSON.stringify(p.codePadding), '| shell', JSON.stringify(p.shell), '|', p.text.slice(0, 40))
console.log('mainBack:', backOk, 'themeRestored:', restored.htmlClass === themeSnap.htmlClass && restored.bodyClass === themeSnap.bodyClass)
c.ws.close()
