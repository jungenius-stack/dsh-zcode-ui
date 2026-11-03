// item1b：设置页底色——点齿轮打开 → 读当前(深)底色 → 挂 html theme-zai-light/dark 各读一遍 → 还原类 → Esc 关闭 → 验证回会话视图
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, pointerType: 'mouse' }, S)

// 会话视图标记（还原验证用）
const MARK = `(() => ({
  chatScrollTop: (() => { const ch = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return ch ? ch.scrollTop : null })(),
  asidePresent: !!document.querySelector('aside'),
  settingsBig: (() => { const els = [...document.querySelectorAll('[class*="settings" i]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 400 && r.height > 300 }); return els.length })(),
  dialogCount: document.querySelectorAll('[role="dialog"]').length,
}))()`

const READ_SETTINGS = `(() => {
  // 设置页主容器：视口内最大的 settings/pane 容器
  const cands = [...document.querySelectorAll('[class*="settings" i], [class*="preference" i], [role="dialog"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 400 && r.height > 300 });
  const pick = el => { if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,140), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius }; };
  const root2 = getComputedStyle(document.documentElement);
  const vars = {};
  for (const n of ['--color-sidebar','--color-background','--color-background-alt','--color-foreground','--color-card','--color-border'])
    vars[n] = root2.getPropertyValue(n).trim();
  // 内容卡片样本：设置页内的圆角块
  const cards = [];
  const scope = cands[0] || document.body;
  for (const e of scope.querySelectorAll('div, section')) {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    if (r.width > 150 && r.height > 40 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cards.length < 6)
      cards.push({ tag: e.tagName, cls: (e.className||'').toString().slice(0,100), bg: cs.backgroundColor, radius: cs.borderRadius, rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} });
  }
  return { pageUrl: location.href, settingRoot: pick(cands[0]), allRoots: cands.slice(0,3).map(pick), vars, cards,
    bodyBg: getComputedStyle(document.body).backgroundColor, htmlBg: getComputedStyle(document.documentElement).backgroundColor };
})()`

const mark0 = await evaluate(MARK)
const themeSnap = await evaluate(snapTheme())

// 打开设置
await mouse('mouseMoved', 236, 768); await sleep(150)
await mouse('mousePressed', 236, 768, 'left')
await mouse('mouseReleased', 236, 768, 'left')
await sleep(1200)
const mark1 = await evaluate(MARK)

const opened = mark1.settingsBig > 0 || mark1.dialogCount > 0
let readDark = null, readLight = null, restore = null, closed = null, mark2 = null
if (opened) {
  readDark = await evaluate(READ_SETTINGS)   // 当前 = 深色
  // 浅色
  await evaluate(`document.documentElement.classList.remove('theme-zai-dark'); document.documentElement.classList.add('theme-zai-light'); true`)
  await sleep(450)
  readLight = await evaluate(READ_SETTINGS)
  // 还原类
  restore = await evaluate(restoreTheme(themeSnap))
  await sleep(350)
  // 关闭：Esc
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
  await sleep(900)
  mark2 = await evaluate(MARK)
  closed = mark2.settingsBig === 0 && mark2.dialogCount === 0
  // Esc 失败兜底：找关闭按钮
  if (!closed) {
    const closeBtn = await evaluate(`(() => {
      const b = [...document.querySelectorAll('[aria-label*="关闭" i], [aria-label*="close" i], [aria-label*="返回" i], [aria-label*="back" i]')]
        .find(e => { const r = e.getBoundingClientRect(); return r.width > 0 });
      if (!b) return null; const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), aria: b.getAttribute('aria-label') };
    })()`)
    if (closeBtn) {
      await mouse('mouseMoved', closeBtn.x, closeBtn.y); await sleep(120)
      await mouse('mousePressed', closeBtn.x, closeBtn.y, 'left')
      await mouse('mouseReleased', closeBtn.x, closeBtn.y, 'left')
      await sleep(900)
      mark2 = await evaluate(MARK)
      closed = mark2.settingsBig === 0 && mark2.dialogCount === 0
    }
  }
}

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url,
  viewBefore: mark0, viewAfterOpen: mark1, opened,
  settings_dark: readDark, settings_light: readLight,
  themeClassRestore: restore, viewAfterClose: mark2, closed,
  chatScrollRestored: mark2 && mark0.chatScrollTop !== null ? mark2.chatScrollTop === mark0.chatScrollTop : null }
writeFileSync(join(OUT, 'cdp-item1b-settings.json'), JSON.stringify(out, null, 2))
console.log('opened:', opened, 'closed:', closed, 'chatScrollRestored:', out.chatScrollRestored)
if (readDark) {
  console.log('DARK root:', JSON.stringify(readDark.settingRoot), 'bodyBg:', readDark.bodyBg, 'htmlBg:', readDark.htmlBg)
  console.log('DARK vars:', JSON.stringify(readDark.vars))
  console.log('DARK cards:', JSON.stringify(readDark.cards, null, 1).slice(0, 900))
}
if (readLight) {
  console.log('LIGHT root:', JSON.stringify(readLight.settingRoot))
  console.log('LIGHT cards:', JSON.stringify(readLight.cards, null, 1).slice(0, 600))
}
c.ws.close()
