// item4: tooltip 出现延迟 ×5 取中位（齿轮按钮，Radix Tooltip）
// item5: 键盘 Tab 触发焦点环，读 outline/boxShadow
// 全程只 Input.dispatch* + Runtime.evaluate 读值；指针/焦点结束时归位。
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

const TOOLTIP_SNAPSHOT = `(() => {
  const w = document.querySelector('[data-radix-popper-content-wrapper]');
  const content = w && (w.querySelector('[class*="bg-tooltip"]') || w.firstElementChild);
  const tag = document.querySelector('[role="tooltip"]');
  const pick = e => { if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { cls: (e.className||'').toString().slice(0,180), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      bg: cs.backgroundColor, color: cs.color, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderRadius,
      boxShadow: cs.boxShadow, padding: [cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].join('/'),
      fontSize: cs.fontSize, transition: cs.transitionProperty + ' ' + cs.transitionDuration };
  };
  return { wrapper: pick(w), content: pick(content), roleTooltipEl: pick(tag), text: content ? (content.textContent||'').slice(0,40) : null,
    triggerAria: document.activeElement && document.activeElement.getAttribute('aria-label') };
})()`

// ---------- item4: tooltip 延迟 ----------
const runs = []
for (let i = 0; i < 5; i++) {
  // 指针远离，等 tooltip 消失
  await mouse('mouseMoved', 5, 400)
  let gone = false
  for (let k = 0; k < 30; k++) { await sleep(60); if (!(await evaluate(TOOLTIP_PRESENT))) { gone = true; break } }
  await sleep(400) // radix 关闭动画 + delay 重置余量

  const t0 = Date.now()
  await mouse('mouseMoved', 236, 768) // 齿轮中心
  let elapsed = null
  for (let k = 0; k < 100; k++) {
    await sleep(16)
    if (await evaluate(TOOLTIP_PRESENT)) { elapsed = Date.now() - t0; break }
  }
  const snap = elapsed !== null ? await evaluate(TOOLTIP_SNAPSHOT) : null
  runs.push({ run: i + 1, appeared: elapsed !== null, elapsedMs: elapsed, pollIntervalMs: 16, snapshot: snap })
  await mouse('mouseMoved', 5, 400)
  await sleep(700)
}
const sorted = runs.filter(r => r.elapsedMs !== null).map(r => r.elapsedMs).sort((a, b) => a - b)
const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)) : null

// ---------- item5: Tab 焦点环 ----------
// 先把指针停开，避免 hover 干扰；记录 activeElement 基线
await mouse('mouseMoved', 5, 400); await sleep(300)
const focusSteps = []
const readFocus = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focused: null };
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return { focused: { tag: el.tagName, cls: (el.className||'').toString().slice(0,140), aria: el.getAttribute('aria-label'), text: (el.textContent||'').trim().slice(0,40),
      rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineOffset: cs.outlineOffset,
      boxShadow: cs.boxShadow, ringVar: getComputedStyle(el).getPropertyValue('--tw-ring-color') || null,
      matchesFocusVisible: el.matches(':focus-visible'), matchesFocus: el.matches(':focus') } };
})()`
focusSteps.push({ step: 'baseline', ...(await evaluate(readFocus)) })
for (let i = 0; i < 4; i++) {
  for (const type of ['rawKeyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, text: '\t', unmodifiedText: '\t' }, S)
  }
  await sleep(250)
  focusSteps.push({ step: 'tab-' + (i + 1), ...(await evaluate(readFocus)) })
}
// 焦点归位：点一下非交互区（pointer press/release 在空白处）恢复；先试 Escape + blur 只读……点击空白处最接近用户自然操作
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await sleep(300)
focusSteps.push({ step: 'after-click-blank', ...(await evaluate(readFocus)) })

const out = {
  capturedAt: new Date().toISOString(), pageUrl: page.url,
  item4_tooltipDelay: { target: '齿轮按钮 aria=设置, center(236,768), Radix Tooltip', runs, appearedCount: sorted.length, medianMs: median, method: 'CDP Input.dispatchMouseEvent + 16ms 轮询 [role=tooltip]/[data-radix-popper-content-wrapper]' },
  item5_focusRing: { method: 'CDP Input.dispatchKeyEvent Tab(rawKeyDown+keyUp, vk=9)', steps: focusSteps },
}
writeFileSync(join(OUT, 'cdp-item4-5.json'), JSON.stringify(out, null, 2))
console.log('tooltip runs:', runs.map(r => r.elapsedMs), 'median:', median)
console.log('tooltip snapshot:', JSON.stringify(runs.find(r => r.snapshot)?.snapshot, null, 1).slice(0, 900))
for (const s of focusSteps) console.log('==', s.step, JSON.stringify(s.focused ?? null).slice(0, 500))
c.ws.close()
