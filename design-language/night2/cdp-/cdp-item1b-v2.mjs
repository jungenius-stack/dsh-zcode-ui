// item1b v2：⌘K → 点击「设置」命令 → 读设置页底色（深/浅两轮）→ 还原 → 关闭 → 验证
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

const READ_SETTINGS = `(() => {
  const bigs = [...document.querySelectorAll('div, section, aside')].filter(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 500 && r.height > 400 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
  }).sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return rb.width * rb.height - ra.width * ra.height; });
  const pick = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,150), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius }; };
  const root2 = getComputedStyle(document.documentElement);
  const vars = {};
  for (const n of ['--color-sidebar','--color-background','--color-background-alt','--color-foreground','--color-card','--color-border']) vars[n] = root2.getPropertyValue(n).trim();
  const cards = [];
  for (const e of document.querySelectorAll('div')) {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (r.width > 200 && r.height > 50 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cards.length < 8)
      cards.push({ cls: (e.className||'').toString().slice(0,90), bg: cs.backgroundColor, radius: cs.borderRadius, rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} });
  }
  const input = document.querySelector('main input, [role="dialog"] input, input[type="text"]');
  return { bgRoots: bigs.slice(0, 4).map(pick), vars, cards, inputBg: input ? getComputedStyle(input).backgroundColor : null,
    title: (document.querySelector('h1, h2')?.textContent||'').trim().slice(0,40),
    asideVisible: (() => { const a = document.querySelector('aside'); if (!a) return false; const r = a.getBoundingClientRect(); return r.width > 50 && getComputedStyle(a).visibility !== 'hidden'; })() };
})()`

const MARK = `(() => ({
  mainText: (document.querySelector('main')?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,50),
  chatScrollTop: (() => { const ch = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return ch ? ch.scrollTop : null })(),
}))()`

const mark0 = await evaluate(MARK)
const themeSnap = await evaluate(snapTheme())

// ⌘K
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75, modifiers: 4 }, S)
await sleep(900)
// 找「设置」项
const item = await evaluate(`(() => {
  const el = [...document.querySelectorAll('[cmdk-item], [role="option"]')].find(e => (e.textContent||'').replace(/\\s+/g,' ').trim().startsWith('设置'));
  if (!el) return null; const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
})()`)
console.log('设置 item:', JSON.stringify(item))
let opened = false, readDark = null, readLight = null, restore = null, afterClose = null, mark2 = null, closeHow = null

if (item) {
  await mouse('mouseMoved', item.x, item.y); await sleep(120)
  await mouse('mousePressed', item.x, item.y, 'left')
  await mouse('mouseReleased', item.x, item.y, 'left')
  await sleep(1500)
  readDark = await evaluate(READ_SETTINGS)
  opened = readDark.bgRoots.length > 0 || /设置|Settings/i.test(readDark.title || '')
  console.log('opened:', opened, 'title:', readDark.title, 'bgRoots:', readDark.bgRoots.length)
}

if (opened) {
  // 浅色
  await evaluate(`document.documentElement.classList.remove('theme-zai-dark'); document.documentElement.classList.add('theme-zai-light'); true`)
  await sleep(500)
  readLight = await evaluate(READ_SETTINGS)
  // 还原
  restore = await evaluate(restoreTheme(themeSnap))
  await sleep(400)
  // 关闭：Esc 最多 3 次
  for (let i = 0; i < 3; i++) {
    for (const type of ['rawKeyDown', 'keyUp'])
      await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
    await sleep(700)
    const t = await evaluate(`(document.querySelector('main')?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30)`)
    if (t === mark0.mainText.slice(0, 30)) { closeHow = 'Escape×' + (i + 1); break }
    closeHow = 'escape-attempted'
  }
  mark2 = await evaluate(MARK)
  afterClose = mark2.mainText.slice(0, 30) === mark0.mainText.slice(0, 30)
}

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, viewBefore: mark0, cmdkItem: item, opened,
  settings_dark: readDark, settings_light: readLight, themeClassRestore: restore, closeHow,
  viewAfterClose: mark2, backToConversation: afterClose,
  chatScrollRestored: mark2 && mark0.chatScrollTop !== null ? mark2.chatScrollTop === mark0.chatScrollTop : null }
writeFileSync(join(OUT, 'cdp-item1b-settings.json'), JSON.stringify(out, null, 2))
console.log('opened:', opened, 'closed:', afterClose, 'scrollRestored:', out.chatScrollRestored)
if (readDark) {
  console.log('DARK bgRoots:', JSON.stringify(readDark.bgRoots, null, 1))
  console.log('DARK vars:', JSON.stringify(readDark.vars))
  console.log('DARK cards:', JSON.stringify(readDark.cards, null, 1).slice(0, 1100))
}
if (readLight) {
  console.log('LIGHT bgRoots:', JSON.stringify(readLight.bgRoots, null, 1))
  console.log('LIGHT cards:', JSON.stringify(readLight.cards, null, 1).slice(0, 700))
}
c.ws.close()
