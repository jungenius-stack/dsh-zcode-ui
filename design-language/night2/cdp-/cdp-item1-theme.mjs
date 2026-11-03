// item1：主题层叠矩阵——{documentElement, body} × {theme-zai-light, theme-zai-dark}
// 纯 DOM 类挂载，读完逐字还原快照。菜单 hover 由 CDP 指针驻停读取。
import { connect, snapTheme, restoreTheme } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'none', pointerType: 'mouse' }, S)

const READ_BLOCK = `(() => {
  const root = getComputedStyle(document.documentElement);
  const varNames = ['--color-sidebar','--color-background','--color-background-alt','--color-foreground','--color-menu','--color-menu-hover',
    '--color-tooltip','--color-tooltip-foreground','--color-tooltip-tag','--color-border','--color-border-hover','--color-hover',
    '--color-selected','--color-card','--color-input-border-focused','--color-success','--color-warning','--color-destructive','--font-sans'];
  const vars = {};
  for (const n of varNames) vars[n] = root.getPropertyValue(n).trim();
  const ringVars = {};
  for (const [k, v] of [...root]) { if (/ring|focus/i.test(k)) ringVars[k] = v; }

  // 侧栏底：aside 中心 elementFromPoint 向上收集非透明 bg 链
  const paint = [];
  const aside = document.querySelector('aside');
  const ar = aside.getBoundingClientRect();
  let e = document.elementFromPoint(ar.x + ar.width/2, ar.y + Math.min(400, ar.height/2));
  for (let i = 0; e && i < 12; i++, e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)')
      paint.push({ depth: i, tag: e.tagName, cls: (e.className||'').toString().slice(0,100), bg: cs.backgroundColor });
  }

  // 正文前景：视口内第一个有字的 span/p（主区）
  let textEl = null;
  for (const el of document.querySelectorAll('main span, main p, main div')) {
    const r = el.getBoundingClientRect();
    if (r.y > 60 && r.y < 700 && r.width > 20 && el.children.length === 0 && (el.textContent||'').trim().length > 15) { textEl = el; break; }
  }
  const textCs = textEl ? getComputedStyle(textEl) : null;

  // 图标描边：aside 前 2 个 svg
  const icons = [...document.querySelectorAll('aside svg')].slice(0, 2).map(sv => {
    const cs = getComputedStyle(sv);
    const path = sv.querySelector('path, circle, rect');
    return { svgStroke: cs.stroke, svgStrokeWidth: cs.strokeWidth, svgColor: cs.color,
      childStroke: path ? getComputedStyle(path).stroke : null, childStrokeW: path ? getComputedStyle(path).strokeWidth : null,
      cls: (sv.className && sv.className.baseVal || '').toString().slice(0, 80) };
  });

  // 菜单行（指针驻停目标）：y=148 处 elementFromPoint
  const hoverEl = document.elementFromPoint(132, 148);
  const hoverCs = hoverEl ? getComputedStyle(hoverEl) : null;

  return {
    htmlClass: document.documentElement.className, bodyClass: document.body.className,
    bodyDarkAttr: document.body.hasAttribute('data-ds-dark-theme'),
    vars, ringVars,
    sidebarPaintChain: paint,
    bodyFont: getComputedStyle(document.body).fontFamily,
    textSample: textEl ? { tag: textEl.tagName, cls: (textEl.className||'').toString().slice(0,80), color: textCs.color, fontFamily: textCs.fontFamily, fontSize: textCs.fontSize, fontWeight: textCs.fontWeight, lineHeight: textCs.lineHeight, text: (textEl.textContent||'').trim().slice(0,40) } : null,
    icons,
    menuHoverTarget: hoverEl ? { tag: hoverEl.tagName, cls: (hoverEl.className||'').toString().slice(0,100), bg: hoverCs.backgroundColor, color: hoverCs.color, radius: hoverCs.borderRadius } : null,
  };
})()`

// 0) 快照 + baseline（指针在 (5,400)，无 hover）
const snap = await evaluate(snapTheme())
const baseline = await evaluate(READ_BLOCK)

// 指针移到侧栏行 (132,148)，读静止→驻停后的 hover 值合并在每轮 READ 里（hoverEl 读到的就是驻停值）
await mouse('mouseMoved', 132, 148)
await sleep(350)
const baselineHover = await evaluate(`(() => {
  const el = document.elementFromPoint(132, 148);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { tag: el.tagName, cls: (el.className||'').toString().slice(0,100), bg: cs.backgroundColor, color: cs.color };
})()`)

// 1) 矩阵
const matrix = []
for (const rootName of ['documentElement', 'body']) {
  for (const mode of ['light', 'dark']) {
    await evaluate(`(() => {
      document.documentElement.classList.remove('theme-zai-light','theme-zai-dark');
      document.body.classList.remove('theme-zai-light','theme-zai-dark');
      ${rootName === 'documentElement' ? 'document.documentElement' : 'document.body'}.classList.add('theme-zai-${mode}');
      return true;
    })()`)
    await sleep(450) // 0.3s transition 余量
    const read = await evaluate(READ_BLOCK)
    matrix.push({ mountOn: rootName, mode, read })
  }
}

// 2) 还原
const restored = await evaluate(restoreTheme(snap))
await sleep(350)
const after = await evaluate(`(() => ({ htmlClass: document.documentElement.className, bodyClass: document.body.className, darkAttr: document.body.hasAttribute('data-ds-dark-theme') }))()`)

// 指针归位
await mouse('mouseMoved', 5, 400)

const out = {
  capturedAt: new Date().toISOString(), pageUrl: page.url,
  method: '先 remove 两 root 的 theme-zai-*，再向指定 root 单独挂 theme-zai-light/dark；每轮等待 450ms（transition 余量）后读 computed；结束后逐字还原 className/attributes 快照',
  snapshotBefore: snap,
  baseline_pointerAway: baseline,
  baseline_menuRow_hover: baselineHover,
  matrix,
  restore: { restoredClassNames: restored, verifyAfter: after, exactMatch: restored.htmlClass === snap.htmlClass && restored.bodyClass === snap.bodyClass },
}
writeFileSync(join(OUT, 'cdp-item1-theme.json'), JSON.stringify(out, null, 2))
console.log('exactMatch:', out.restore.exactMatch)
console.log('baseline vars:', JSON.stringify(baseline.vars))
console.log('baseline hover:', JSON.stringify(baselineHover))
for (const m of matrix) {
  console.log(`== ${m.mountOn} + ${m.mode}: sidebar=${m.read.vars['--color-sidebar']} fg=${m.read.vars['--color-foreground']} menuHover=${m.read.vars['--color-menu-hover']} tooltip=${m.read.vars['--color-tooltip']}/${m.read.vars['--color-tooltip-foreground']}/${m.read.vars['--color-tooltip-tag']}`)
  console.log('   hoverRowBg:', m.read.menuHoverTarget && m.read.menuHoverTarget.bg, '| sidebarPaint:', JSON.stringify((m.read.sidebarPaintChain||[]).slice(0,2)))
  console.log('   text:', m.read.textSample && m.read.textSample.color, '| icon:', m.read.icons && m.read.icons[0] && m.read.icons[0].svgStroke)
}
c.ws.close()
