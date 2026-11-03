// ZCode 9224 实采：主题层叠 + 关键元素 computed style + 截图
// 只读：仅 Runtime.evaluate 读值、Page.captureScreenshot 截图；不改任何状态（主题类切换后立即还原）。
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2'
mkdirSync(OUT, { recursive: true })

const wsUrl = execSync("grep -o 'ws://127.0.0.1:9224/devtools/browser/[a-f0-9-]*' /tmp/zcode-debug.log | tail -1")
  .toString().trim()
const ws = new WebSocket(wsUrl)
let id = 0
const pend = new Map()
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pend.set(i, resolve)
    ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }))
    setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)) } }, 30000)
  })
ws.on('message', raw => {
  const m = JSON.parse(raw.toString())
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id) }
})
ws.on('error', e => { console.error('WS error', e.message); process.exit(1) })
await new Promise(r => ws.on('open', r))

const targets = (await send('Target.getTargets')).targetInfos.filter(t => t.type === 'page')
const page = targets.find(t => /zcode/i.test(t.url)) ?? targets[0]
const attached = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
const S = attached.sessionId
await send('Runtime.enable', {}, S)
await send('Page.enable', {}, S)

const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, S)
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expression.slice(0, 80))
  return r.result.value
}

const shot = async (name, clip) => {
  const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) }, S)
  writeFileSync(`${OUT}/cdp-shot-${name}.png`, Buffer.from(r.data, 'base64'))
  return `cdp-shot-${name}.png`
}

// 采集器：对一组选择器读一批属性
const PROPS = [
  'backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
  'borderRadius', 'borderTopWidth', 'borderTopColor', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'gap', 'rowGap',
  'height', 'minHeight', 'width', 'boxShadow', 'outlineColor', 'outlineWidth',
  'outlineOffset', 'transitionProperty', 'transitionDuration', 'transitionTimingFunction',
  'opacity', 'letterSpacing', 'fontVariantNumeric', 'scrollbarWidth', 'colorScheme',
]
const collect = selectors => `(() => {
  const props = ${JSON.stringify(PROPS)};
  const out = {};
  for (const sel of ${JSON.stringify(selectors)}) {
    const el = document.querySelector(sel);
    if (!el) { out[sel] = null; continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const rec = { _rect: { w: Math.round(r.width), h: Math.round(r.height) } };
    for (const p of props) rec[p] = cs[p];
    out[sel] = rec;
  }
  return out;
})()`

// 1) 当前主题与根变量
const themeState = await evaluate(`(() => {
  const cs = getComputedStyle(document.documentElement);
  const names = ['--color-sidebar','--color-background','--color-foreground','--color-menu','--color-menu-hover',
    '--color-tooltip','--color-tooltip-foreground','--color-tooltip-tag','--color-border','--color-border-hover',
    '--color-hover','--color-selected','--color-toast','--color-card','--font-sans'];
  const vars = {};
  for (const n of names) vars[n] = cs.getPropertyValue(n).trim();
  return {
    bodyClasses: document.body.className,
    htmlClasses: document.documentElement.className,
    darkAttr: document.body.hasAttribute('data-ds-dark-theme'),
    colorScheme: cs.colorScheme,
    vars,
  };
})()`)

// 2) 关键元素（当前主题）
const SELECTORS = [
  'aside', '[class*="sidebar"]', '[class*="_sidebarCol"]',
  '[class*="task-row"]', '[class*="taskRow"]', '[role="treeitem"]',
  '[class*="menu"]', '[role="menu"]', '[role="menuitem"]',
  '[class*="tooltip"]', '[role="tooltip"]',
  'pre', 'pre code', '[class*="codeBlock"]',
  'button', 'input', 'textarea',
  '[class*="dialog"]', '[role="dialog"]',
  'h1', 'h2', 'h3',
]
const stylesNow = await evaluate(collect(SELECTORS))

// 3) 截图（当前主题）
const shotBefore = await shot('current')

// 4) 切到浅色读一遍，再切到深色读一遍，最后还原
const readTheme = async (mode) => {
  await evaluate(`(() => {
    document.body.classList.remove('theme-zai-light','theme-zai-dark');
    document.documentElement.classList.remove('theme-zai-light','theme-zai-dark');
    ${mode === 'light'
      ? `document.body.removeAttribute('data-ds-dark-theme');
         document.documentElement.classList.add('theme-zai-light');
         document.body.classList.add('theme-zai-light');`
      : `document.body.setAttribute('data-ds-dark-theme','');
         document.documentElement.classList.add('theme-zai-dark');
         document.body.classList.add('theme-zai-dark');`}
    return true;
  })()`)
  await new Promise(r => setTimeout(r, 350))
  const vars = await evaluate(`(() => {
    const cs = getComputedStyle(document.documentElement);
    const names = ['--color-sidebar','--color-background','--color-foreground','--color-menu','--color-menu-hover',
      '--color-tooltip','--color-tooltip-foreground','--color-tooltip-tag','--color-border','--color-hover',
      '--color-selected','--color-card','--font-sans','--color-success','--color-warning','--color-destructive'];
    const o = {}; for (const n of names) o[n] = cs.getPropertyValue(n).trim(); return o;
  })()`)
  const styles = await evaluate(collect(SELECTORS))
  const file = await shot(mode)
  return { vars, styles, file }
}
const light = await readTheme('light')
const dark = await readTheme('dark')

// 5) 还原成进入时的主题
await evaluate(`(() => {
  document.body.classList.remove('theme-zai-light','theme-zai-dark');
  document.documentElement.classList.remove('theme-zai-light','theme-zai-dark');
  ${themeState.darkAttr
    ? `document.body.setAttribute('data-ds-dark-theme',''); document.documentElement.classList.add('theme-zai-dark'); document.body.classList.add('theme-zai-dark');`
    : `document.body.removeAttribute('data-ds-dark-theme'); document.documentElement.classList.add('theme-zai-light'); document.body.classList.add('theme-zai-light');`}
  return true;
})()`)
const restored = await evaluate("document.body.hasAttribute('data-ds-dark-theme')")

// 6) 码块 pre 的实际内边距（单独找最深层 pre，避免命中空壳）
const codePadding = await evaluate(`(() => {
  const pres = [...document.querySelectorAll('pre')];
  return pres.slice(0, 6).map(p => {
    const cs = getComputedStyle(p);
    const r = p.getBoundingClientRect();
    return {
      cls: (p.className || '').toString().slice(0, 60),
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join('/'),
      bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight,
    };
  });
})()`)

// 7) 字体与圆角/动效清单
const inventory = await evaluate(`(() => {
  const root = getComputedStyle(document.documentElement);
  const radii = {}, durations = {}, eases = {};
  const all = [...document.querySelectorAll('*')].slice(0, 4000);
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.borderRadius && cs.borderRadius !== '0px') radii[cs.borderRadius] = (radii[cs.borderRadius] || 0) + 1;
    if (cs.transitionDuration && cs.transitionDuration !== '0s') durations[cs.transitionDuration] = (durations[cs.transitionDuration] || 0) + 1;
    if (cs.transitionTimingFunction) eases[cs.transitionTimingFunction] = (eases[cs.transitionTimingFunction] || 0) + 1;
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return {
    fontSans: root.getPropertyValue('--font-sans').trim(),
    bodyFontActual: getComputedStyle(document.body).fontFamily,
    radii: top(radii), durations: top(durations), eases: top(eases),
  };
})()`)

const result = {
  capturedAt: new Date().toISOString(),
  pageUrl: page.url,
  wsUrl,
  themeState,
  restoredToOriginalTheme: restored,
  light,
  dark,
  stylesAtCapture: stylesNow,
  codePadding,
  inventory,
  shots: [shotBefore, light.file, dark.file],
}
writeFileSync(`${OUT}/cdp-summary.json`, JSON.stringify(result, null, 2))
console.log('写入 cdp-summary.json')
console.log('当前主题 dark=' + themeState.darkAttr + '，还原=' + restored)
console.log('浅色 --color-sidebar=' + light.vars['--color-sidebar'] + ' 深色=' + dark.vars['--color-sidebar'])
console.log('字体: ' + inventory.bodyFontActual)
console.log('码块 padding 样本: ' + JSON.stringify(codePadding.slice(0, 3).map(c => c.padding)))
ws.close()
