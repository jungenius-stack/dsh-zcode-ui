// 确认设置页身份（面板文本+截图，两主题）+ 深色下齿轮 tooltip 实例补采
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }, S); writeFileSync(join(OUT, `cdp-shot-${name}.png`), Buffer.from(r.data, 'base64')); return `cdp-shot-${name}.png` }

const PANEL_TEXT = `(() => {
  const panel = [...document.querySelectorAll('div')].find(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.x > 250 && r.x < 280 && r.width > 900 && r.height > 750 && (cs.borderRadius.includes('12px') || cs.borderRadius === '12px');
  });
  if (!panel) return { found: false };
  return { found: true, bg: getComputedStyle(panel).backgroundColor, cls: (panel.className||'').toString().slice(0,120),
    headings: [...panel.querySelectorAll('h1,h2,h3,[class*="title" i]')].slice(0, 10).map(h => (h.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30)).filter(Boolean),
    navTexts: [...panel.querySelectorAll('button, a, [role="menuitem"], [role="tab"]')].slice(0, 15).map(b => (b.textContent||'').replace(/\\s+/g,' ').trim().slice(0,20)).filter(t => t) };
})()`

const themeSnap = await evaluate(snapTheme())
const mark0 = await evaluate(`(document.querySelector('main')?.textContent||'').slice(0,40)`)

// ⌘K → 设置
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75, modifiers: 4 }, S)
await sleep(900)
const item = await evaluate(`(() => { const el = [...document.querySelectorAll('[cmdk-item], [role="option"]')].find(e => (e.textContent||'').trim().startsWith('设置')); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
if (!item) throw new Error('设置 item not found')
await mouse('mouseMoved', item.x, item.y); await sleep(120)
await mouse('mousePressed', item.x, item.y, 'left'); await mouse('mouseReleased', item.x, item.y, 'left')
await sleep(1500)

const darkPanel = await evaluate(PANEL_TEXT)
const darkShot = await shot('settings-dark')

// 浅色
await evaluate(`document.documentElement.classList.remove('theme-zai-dark'); document.documentElement.classList.add('theme-zai-light'); true`)
await sleep(500)
const lightPanel = await evaluate(PANEL_TEXT)
const lightShot = await shot('settings-light')

// 还原类 + Esc 关
const restored = await evaluate(restoreTheme(themeSnap))
await sleep(300)
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
await sleep(800)
const mark1 = await evaluate(`(document.querySelector('main')?.textContent||'').slice(0,40)`)

// 深色下齿轮 tooltip 实例
await mouse('mouseMoved', 5, 400); await sleep(600)
const ARM = `(() => { delete window.__ttProbe;
  const mo = new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) { if (n.nodeType===1 && n.querySelector && n.querySelector('[role="tooltip"]')) { if (!window.__ttProbe) window.__ttProbe = performance.now(); } } });
  mo.observe(document.documentElement, { childList: true, subtree: true }); window.__ttMo = mo; return true; })()`
await evaluate(ARM)
await mouse('mouseMoved', 236, 768)
let ttAppeared = false
for (let k = 0; k < 90; k++) { await sleep(100); if (await evaluate(`!!window.__ttProbe`)) { ttAppeared = true; break } }
const tooltipDark = ttAppeared ? await evaluate(`(() => {
  const content = document.querySelector('[data-radix-popper-content-wrapper] > div, [data-radix-popper-content-wrapper] *');
  const wrapper = document.querySelector('[data-radix-popper-content-wrapper]');
  const el = wrapper && [...wrapper.querySelectorAll('*')].find(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)');
  if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return { cls: (el.className||'').toString().slice(0,140), bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderRadius, text: (el.textContent||'').slice(0,20), rect: {w:Math.round(r.width),h:Math.round(r.height)} };
})()`) : null
await evaluate(`(() => { if (window.__ttMo) { window.__ttMo.disconnect(); delete window.__ttMo; } delete window.__ttProbe; return true; })()`)
await mouse('mouseMoved', 5, 400); await sleep(500)

const back = await evaluate(`(document.querySelector('main')?.textContent||'').slice(0,40)`)
const out = { capturedAt: new Date().toISOString(), pageUrl: page.url,
  settingsIdentity: { dark: darkPanel, light: lightPanel },
  shots: { dark: darkShot, light: lightShot },
  themeRestored: restored, conversationBack: mark0 === back, mainTextBefore: mark0, mainTextAfter: back,
  tooltipDarkInstance: tooltipDark, tooltipAppeared: ttAppeared }
writeFileSync(join(OUT, 'cdp-item1b-confirm.json'), JSON.stringify(out, null, 2))
console.log('dark panel:', JSON.stringify(darkPanel, null, 1).slice(0, 900))
console.log('light panel:', JSON.stringify(lightPanel, null, 1).slice(0, 700))
console.log('conversationBack:', mark0 === back, '| tooltipAppeared:', ttAppeared, '| tooltipDark:', JSON.stringify(tooltipDark))
c.ws.close()
