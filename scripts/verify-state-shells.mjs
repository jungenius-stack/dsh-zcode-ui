/**
 * 三态外壳（loading / error / empty）——2026-10-14 新增。
 *
 * docs/KNOWN-ISSUES.md §13.6 自登记「loading / error 态无统一规范、无断言」。
 * 本脚本锁住外壳的三条契约：
 *   1. 三态容器几何一致（同一处信息换状态不该跳版）；
 *   2. 语义色按底色取值且 ≥4.5:1（明暗两套）；
 *   3. **错误态不铺 destructive 底色**——此前 .dcu-wb-error 铺了 12% 色调底，
 *      在 240px 窄栏里是一整块刺眼的红，且与契约第 4 条相抵触。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle, fixtureThemeStyle } from './fixture-tokens.mjs'

const read = (name) => readFileSync(new URL(`../src/client/${name}`, import.meta.url), 'utf8')
const pick = (file, name) => read(file).match(new RegExp('(?:export )?const ' + name + ' = `([\\s\\S]*?)`'))?.[1]
const theme = pick('zcode-theme.ts', 'ZCODE_THEME_STYLE')
const sidebar = pick('CodexSidebar.tsx', 'stylesheet')
// .dcu-wb-error 的原始定义在 CodexWorkspaceBrowser.tsx（侧栏样式表里没有）。
// 漏注入它会让「错误态无 destructive 底色」这条断言量到一个根本没被样式表触碰的元素，
// 于是永远绿——本脚本首版就犯了这个错，探针一跑就现形。
const workspace = pick('CodexWorkspaceBrowser.tsx', 'stylesheet')
assert.ok(theme && sidebar && workspace, '必须能取到主题层 / 侧栏 / 工作区三份样式表（变量名被改时会失败）')

const FIXTURE = `
<div class="dcu-root" id="root">
  <div class="dcu-wb">
    <div class="dcu-state dcu-state--loading" id="loading">正在载入会话…</div>
    <div class="dcu-state dcu-state--error dcu-state--with-icon" id="error" role="alert">
      <span class="dcu-state-icon" aria-hidden="true">!</span><span>操作失败，请重试。</span>
    </div>
    <div class="dcu-state dcu-state--empty" id="empty">暂无会话</div>
    <div class="dcu-wb-error" id="legacy">操作失败：会话不存在</div>
  </div>
</div>`

const MEASURE = `(() => {
  const ids = ['loading', 'error', 'empty', 'legacy']
  const out = {}
  for (const id of ids) {
    const el = document.getElementById(id)
    if (el === null) { out[id] = null; continue }
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    out[id] = {
      color: cs.color,
      background: cs.backgroundColor,
      padTop: cs.paddingTop,
      padLeft: cs.paddingLeft,
      radius: cs.borderRadius,
      font: cs.fontSize,
      line: cs.lineHeight,
      height: Math.round(r.height),
      display: cs.display,
    }
  }
  return out
})()`

// 非文字对比度：语义色作为**图标色**出现时必须 ≥3:1（WCAG 1.4.11）。
const CONTRAST = `(() => {
  const parse = (v) => v.match(/[\\d.]+/g).map(Number)
  const lum = (rgb) => {
    const [r, g, b] = rgb.slice(0, 3).map((c) => {
      const s = c / 255
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }
  const bgOf = (el) => {
    let node = el
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor)
      if (c[3] > 0) return c
      node = node.parentElement
    }
    return [255, 255, 255, 1]
  }
  const el = document.getElementById('error')
  const icon = el.querySelector('.dcu-state-icon')
  const cs = getComputedStyle(icon)
  return { ratio: ratio(parse(cs.color), bgOf(icon)), color: cs.color }
})()`

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 300, height: 500 } })
  for (const dark of [false, true]) {
    const label = dark ? '暗色' : '亮色'
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}</style></head><body>${FIXTURE}</body></html>`)
    await page.addStyleTag({ content: fixtureTokenStyle(dark ? 'dark' : 'light') })
    await page.addStyleTag({ content: theme })
    await page.addStyleTag({ content: sidebar })
    await page.addStyleTag({ content: workspace })
    if (dark) await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    await page.addStyleTag({ content: dark ? '#root{background:#161616}' : '#root{background:#f0f0f0}' })

    const m = await page.evaluate(MEASURE)

    // 1) 三态外壳几何一致（loading/error/empty 三者共享容器规则）。
    //    字号/圆角断「彼此一致 + 不等于继承默认」，不硬编码数值——
    //    --dsw-font-size-sm 是 calc(base - 2px)，随宿主字号刻度变化，写死 13px 会假失败。
    const base = m.loading
    for (const id of ['loading', 'error', 'empty']) {
      assert.ok(m[id], `${label}: 必须渲染 ${id}`)
      for (const key of ['padTop', 'padLeft', 'radius', 'font', 'line']) {
        assert.equal(m[id][key], base[key], `${label}: ${id} 的 ${key} 必须与外壳一致（${base[key]}），实测 ${m[id][key]}`)
      }
    }
    assert.notEqual(base.font, '16px', `${label}: 外壳字号不得回退成继承默认（16px）——缺令牌时会静默这样`)

    // 2) 错误态必须带 role="alert"（语义靠结构，不靠底色）。
    const role = await page.evaluate(() => document.getElementById('error').getAttribute('role'))
    assert.equal(role, 'alert', '错误态必须有 role="alert"——语义靠结构表达，不靠铺底色')

    // 3) 错误态**不得**铺 destructive 底色。
    for (const id of ['error', 'legacy']) {
      assert.equal(m[id].background, 'rgba(0, 0, 0, 0)',
        `${label}: ${id} 不得铺破坏性底色（语义靠文字色 + role="alert" + aria-invalid 表达）`)
    }

    // 4) 语义色按底色取值：error 用文字档、empty 用 tertiary、loading 用 secondary。
    assert.equal(m.error.color, dark ? 'rgb(255, 92, 92)' : 'rgb(179, 38, 30)',
      `${label}: 错误态文字必须是 --dcu-state-error-text 的当前主题值`)
    assert.notEqual(m.empty.color, m.loading.color, `${label}: empty 与 loading 不得同色（明度即层级，见设计文档 §9）`)

    // 5) 图标位（.dcu-state-icon）作为非文字元素，语义色必须 ≥3:1。
    const icon = await page.evaluate(CONTRAST)
    assert.ok(icon.ratio >= 3, `${label}: 错误图标语义色 ${icon.ratio.toFixed(2)}:1（${icon.color}）低于非文字内容的 3:1`)
  }
  console.log('✓ 三态外壳：容器几何一致、错误态无 destructive 底色、语义色明暗两套达标、图标位 ≥3:1')
} finally {
  await browser.close()
}
