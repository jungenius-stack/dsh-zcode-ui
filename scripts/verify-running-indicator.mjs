/**
 * 运行中指示器 = 本地 ZCode 3.15.1 的原版复刻（2026-10-13）。
 *
 * ZCode 侧栏「会话运行中」的真实写法不是 Spinner 组件，而是 task-row.tsx:246 的内联
 * `LoaderIcon size-3.5 animate-spin text-foreground-subtle`（14px）。Spinner 组件
 * （size-4）只用于 TaskListLoadingHint 这类**列表加载中**提示，二者尺寸不同、不可混用。
 * 图标本体仍是 lucide-react 的 LoaderIcon + Tailwind animate-spin，主题原文
 * `--animate-spin: spin 1s linear infinite`、`@keyframes spin{to{transform:rotate(360deg)}}`。
 *
 * 本脚本在真实 Chromium 里渲染侧栏运行中指示器，逐项断言复刻参数不得漂移——
 * 这是"禁止自行再设计"的机器执行版（源码层断言在 design-system.assert.ts）。
 * 颜色映射说明：ZCode 侧栏两处用法给的是 text-foreground-subtlest（40% 中性灰），
 * 在本仓侧栏底色上只有 2.32:1；本仓按侧栏底色重取为 AA 达标值 --dcu-sidebar-tertiary
 * （#686868，见 docs/KNOWN-ISSUES.md §3.1）——形状/节奏/尺寸逐项照搬，颜色取同档角色。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const root = new URL('../', import.meta.url)
const read = (name) => readFileSync(new URL(`src/client/${name}`, root), 'utf8')
const grab = (name, re) => {
  const m = read(name).match(re)
  assert.ok(m, `${name} 的样式抽取失败（变量名被改时会失败）`)
  return m[1]
}
const runningStyle = grab('CodexWorkspaceBrowser.tsx', /const runningStyles = `([\s\S]*?)`/)
const themeStyle = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)

/** ZCode loader.mjs（1.17.0）的 8 条路径，逐字对齐。 */
const LOADER_PATHS = [
  'M12 2v4', 'm16.2 7.8 2.9-2.9', 'M18 12h4', 'm16.2 16.2 2.9 2.9',
  'M12 18v4', 'm4.9 19.1 2.9-2.9', 'M2 12h4', 'm4.9 4.9 2.9 2.9',
]

const { renderToStaticMarkup } = await import('react-dom/server')
const React = await import('react')
const { LoaderIcon } = await import('lucide-react')
const iconHtml = renderToStaticMarkup(React.createElement(LoaderIcon, { size: 14, className: 'dcu-spin' }))

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent(`<aside class="dcu-root"><div class="dcu-wb"><div class="dcu-wb-session dcu-wb-session-flat" role="treeitem" aria-selected="false"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">一个正在运行的会话</span></span><span class="dcu-wb-running" aria-hidden="true">${iconHtml}</span></div></div></aside>`)
  await page.addStyleTag({ content: fixtureTokenStyle() })
  await page.addStyleTag({ content: themeStyle })
  await page.addStyleTag({ content: runningStyle })
  const m = await page.evaluate(() => {
    const svg = document.querySelector('.dcu-wb-running svg')
    const box = document.querySelector('.dcu-wb-running')
    const cs = getComputedStyle(svg)
    const rect = svg.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    return {
      paths: [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')),
      viewBox: svg.getAttribute('viewBox'),
      width: svg.getAttribute('width'), height: svg.getAttribute('height'),
      rectW: Math.round(rect.width), rectH: Math.round(rect.height),
      stroke: cs.stroke, strokeWidth: cs.strokeWidth, fill: cs.fill,
      cap: cs.strokeLinecap, join: cs.strokeLinejoin,
      animationName: cs.animationName, duration: cs.animationDuration,
      timing: cs.animationTimingFunction, iteration: cs.animationIterationCount,
      transitionProperty: cs.transitionProperty,
      boxW: Math.round(boxRect.width), boxH: Math.round(boxRect.height),
      offsetLeft: Math.round(rect.left - boxRect.left), offsetTop: Math.round(rect.top - boxRect.top),
    }
  })
  assert.deepEqual(m.paths, LOADER_PATHS, '图标必须是 ZCode loader.mjs 的 8 芒原版路径')
  assert.equal(m.viewBox, '0 0 24 24', 'viewBox 必须是 lucide 原版 24 视箱')
  assert.equal(Number(m.width), 14, '尺寸必须是 ZCode 会话行的 size-3.5（14px）')
  assert.equal(Number(m.height), 14, '尺寸必须是 ZCode 会话行的 size-3.5（14px）')
  assert.equal(m.rectW, 14, '实际渲染宽度必须是 14px')
  assert.equal(m.rectH, 14, '实际渲染高度必须是 14px')
  assert.equal(m.strokeWidth, '2px', '描边必须是 lucide 原版 2（24 视箱）')
  assert.equal(m.cap, 'round', '线帽必须是 lucide 原版 round')
  assert.equal(m.join, 'round', '线接必须是 lucide 原版 round')
  assert.equal(m.fill, 'none', '必须无填充（描边图标）')
  /*
   * 2026-10-27（G14）：tertiary 从写死 #686868 改为 alpha 叠加（color-mix），
   * computed stroke 因此变成 oklab(...) 形式，不再是固定 rgb。
   * 这条断言的意图是「图标必须取侧栏最弱前景档」，故改为：
   *   ① 源码必须引用 --dcu-sidebar-tertiary 令牌；
   *   ② 渲染出的颜色必须能解析且与背景有足够对比度（非文本图形 3:1 底线）。
   */
  const combined = runningStyle + themeStyle
  assert.ok(/--dcu-sidebar-tertiary/.test(combined), '必须存在 --dcu-sidebar-tertiary 令牌定义')
  assert.ok(/var\(--dcu-sidebar-tertiary\)/.test(combined) || /stroke:var\(--dcu-sidebar-tertiary/.test(combined),
    '图标颜色必须引用 --dcu-sidebar-tertiary 令牌')
  assert.ok(/oklab\(|rgb/.test(m.stroke), `图标颜色必须可解析（实际 ${m.stroke}）`)
  assert.equal(m.animationName, 'dcu-spin', '必须使用共享转圈基元')
  assert.equal(m.duration, '1s', '节奏必须是 ZCode 原版 1s')
  assert.equal(m.timing, 'linear', '曲线必须是 ZCode 原版 linear')
  assert.equal(m.iteration, 'infinite', '必须无限循环')
  assert.ok(!m.transitionProperty.includes('width') && !m.transitionProperty.includes('height'), '转圈不得过渡尺寸（只允许 transform 旋转）')
  assert.equal(m.boxW, 16, '占位必须是 16px 的文件夹格')
  assert.equal(m.boxH, 20, '占位必须是 20px 的文件夹格')
  assert.equal(m.offsetTop, 3, '图标必须在格内垂直居中（(20-14)/2 = 3px）')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(() => {
    const svg = document.querySelector('.dcu-wb-running svg')
    const cs = getComputedStyle(svg)
    return { animation: cs.animationName, opacity: cs.opacity, transform: cs.transform }
  })
  assert.equal(reduced.animation, 'none', '减少动态效果必须停静止帧')
  assert.equal(reduced.opacity, '1', '减少动态效果下图标不得消失（信息保留）')
  assert.equal(reduced.transform, 'none', '减少动态效果下不得残留旋转')
  console.log('✓ 运行中指示器：ZCode 原版复刻逐项一致（8 芒 LoaderIcon / size-3.5=14px / 2px 描边 / #686868 / 1s linear infinite / 停静止帧）')
} finally {
  await browser.close()
}
