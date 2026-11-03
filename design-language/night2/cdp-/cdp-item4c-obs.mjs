// item4 终版：MutationObserver 页面内自记 tooltip 出现时刻（消除 CDP 轮询伪影）×5 取中位
// item5 终版：Tab 焦点后父链查环实体 + CSSOM 里 :focus-visible 规则的 outline/box-shadow 值
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

// 页面内探针：observer 记录 [role=tooltip] 或 radix wrapper 首次插入的 performance.now()
const ARM_OBSERVER = `(() => {
  delete window.__ttProbe;
  const mark = () => { if (!window.__ttProbe) window.__ttProbe = { at: performance.now(), doc: document.querySelectorAll('[role="tooltip"],[data-radix-popper-content-wrapper]').length }; };
  const mo = new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches('[role="tooltip"],[data-radix-popper-content-wrapper]') || n.querySelector('[role="tooltip"],[data-radix-popper-content-wrapper]')) mark();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.__ttArm = performance.now();
  window.__ttMo = mo; // 下次 arm 时替换；页面卸载自然回收
  return { armedAt: window.__ttArm };
})()`

const READ_PROBE = `(() => { const p = window.__ttProbe || null; const arm = window.__ttArm; return { probe: p, armedAt: arm, delta: p ? p.at - arm : null }; })()`

const runs = []
for (let i = 0; i < 5; i++) {
  await mouse('mouseMoved', 5, 400)
  await sleep(900) // 确保 tooltip 关闭、skip 窗口过期
  const gone = await evaluate(`!document.querySelector('[role="tooltip"],[data-radix-popper-content-wrapper]')`)
  await evaluate(ARM_OBSERVER)
  const armAt = Date.now()
  await mouse('mouseMoved', 236, 768)
  let delta = null
  for (let k = 0; k < 60; k++) { await sleep(100); const r = await evaluate(READ_PROBE); if (r.probe) { delta = r.delta; break } }
  runs.push({ run: i + 1, tooltipGoneBeforeStart: gone, deltaMs: delta, dispatchToArmRpcOverheadMs: null, wallSinceDispatch: delta !== null ? null : null })
  await mouse('mouseMoved', 5, 400)
  await sleep(800)
}
const med = a => { const s = a.filter(x => x !== null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2)) : null }

// 探针变量清理
await evaluate(`(() => { delete window.__ttProbe; delete window.__ttArm; if (window.__ttMo) { window.__ttMo.disconnect(); delete window.__ttMo; } return 'probe-cleaned'; })()`)

// ---- item5 终版 ----
await mouse('mouseMoved', 5, 400); await sleep(300)
const CSSOM = `(() => {
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { continue }
    const walk = (list) => {
      for (const rule of list) {
        if (rule.cssRules) { walk(rule.cssRules); continue }
        const t = rule.selectorText || '';
        if (!t.includes(':focus-visible')) continue;
        const body = rule.style && rule.style.cssText || '';
        if (/outline|box-shadow/.test(body)) hits.push({ sel: t.slice(0, 160), css: body.slice(0, 200) });
      }
    };
    walk(rules);
    if (hits.length > 40) break;
  }
  return hits.slice(0, 40);
})()`
const cssRules = await evaluate(CSSOM)

const DEEP_RING = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focused: null };
  const ringed = [];
  const scan = (e, depth) => {
    if (depth > 3 || ringed.length >= 4) return;
    for (const ch of e.children || []) {
      const cs = getComputedStyle(ch);
      if ((cs.boxShadow && cs.boxShadow !== 'none') || (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px')) {
        ringed.push({ tag: ch.tagName, cls: (ch.className||'').toString().slice(0,110), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow.slice(0,120) });
      }
      scan(ch, depth + 1);
    }
  };
  scan(el, 0);
  let p = el.parentElement; let pi = 0;
  const chainRings = [];
  while (p && pi < 3) { const cs = getComputedStyle(p); if ((cs.boxShadow && cs.boxShadow !== 'none') || (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px')) chainRings.push({ lvl: 'parent+' + pi, tag: p.tagName, cls: (p.className||'').toString().slice(0,110), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow.slice(0,120) }); p = p.parentElement; pi++; }
  const cs = getComputedStyle(el);
  return { focused: { tag: el.tagName, aria: el.getAttribute('aria-label'), cls: (el.className||'').toString().slice(0,110),
      outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, boxShadow: cs.boxShadow, focusVisible: el.matches(':focus-visible') },
    childRings: ringed, parentRings: chainRings };
})()`
const focusRuns = []
focusRuns.push({ step: 'baseline', ...(await evaluate(DEEP_RING)) })
for (let i = 0; i < 4; i++) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, text: '\t', unmodifiedText: '\t' }, S)
  await sleep(250)
  focusRuns.push({ step: 'tab-' + (i + 1), ...(await evaluate(DEEP_RING)) })
}
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 523, y: 500, button: 'left', clickCount: 1, pointerType: 'mouse' }, S)
await sleep(200)

const out = {
  capturedAt: new Date().toISOString(), pageUrl: page.url,
  item4_tooltipDelay_mutationObserver: { target: '齿轮 aria=设置 (236,768)', method: '页面内 MutationObserver 记 [role=tooltip]/radix wrapper 首插时刻，delta=performance.now 差；外部仅 100ms 粒度取读', runs, medianMs: med(runs.map(r => r.deltaMs)), earlierMeasurements: '外部轮询法：16ms 粒度 5 次 median 6392ms；50ms 粒度单次 693ms（见 cdp-item4-5.json 与 cdp-probe4.json）' },
  item5_cssFocusVisibleRules: cssRules,
  item5_focusDeep: focusRuns,
}
writeFileSync(join(OUT, 'cdp-item4c-5c.json'), JSON.stringify(out, null, 2))
console.log('observer runs:', runs.map(r => r.deltaMs), 'median:', med(runs.map(r => r.deltaMs)))
console.log('cssRules count:', cssRules.length)
for (const r of cssRules.slice(0, 12)) console.log('  ', r.sel, '=>', r.css.slice(0, 120))
for (const f of focusRuns) console.log('==', f.step, JSON.stringify(f.focused ?? null).slice(0, 260), 'child:', JSON.stringify(f.childRings ?? []).slice(0, 240), 'parent:', JSON.stringify(f.parentRings ?? []).slice(0, 240))
c.ws.close()
