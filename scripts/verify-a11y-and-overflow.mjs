/** 可读性与溢出（真机测量，不需要活宿主）：
 *  1) 侧栏文字对比度 ≥ 4.5:1（明/暗两套主题，WCAG 2.1 AA）
 *  2) 新会话建议卡标签不得被截断（四个卡片在真实宽度下全部放得下）
 *  3) 折叠轨内不得出现横向溢出（此前计费卡文字被裁成 "F41-peak"）
 *
 * 这三类问题此前没有任何断言覆盖 —— 它们不是几何问题，量不出来，只能靠人眼看。
 * 现在用计算样式 + 对比度公式把它们变成客观判据。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const pick = (file, name) => readFileSync(file, 'utf8').match(new RegExp('(?:export )?const ' + name + ' = `([\\s\\S]*?)`'))?.[1]
const sheets = [
  pick('src/client/zcode-theme.ts', 'ZCODE_THEME_STYLE'),
  pick('src/client/CodexSidebar.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'typographyStyles'),
  pick('src/client/new-conversation-style.ts', 'NEW_CONVERSATION_STYLE'),
]
assert.ok(sheets.every(Boolean), '必须能取到全部样式表（变量名被改时此断言会失败）')
const css = sheets.join('\n')

// 建议卡文案取自 locales.ts 的英文表（同一 key 的最后一次出现即 en）
const locales = readFileSync('src/client/locales.ts', 'utf8')
const labels = ['home.explore', 'home.build', 'home.review', 'home.fix'].map((key) => {
  const all = [...locales.matchAll(new RegExp("'" + key.replace('.', '\\.') + "':\\s*'([^']*)'", 'g'))]
  return all.at(-1)?.[1]
})
assert.ok(labels.every(Boolean), '必须能取到四个建议卡文案')

const sidebarFixture = `
<div class="dcu-root" id="root">
  <div class="dcu-expanded-shell">
    <nav class="dcu-menu"><button class="dcu-footer-link">New task</button></nav>
    <div class="dcu-workspaces dcu-wb">
      <div class="dcu-wb-section">
        <div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true">Projects</button></div>
        <div class="dcu-wb-section-body" data-open="true"><div>
          <div class="dcu-wb-project">
            <div class="dcu-wb-project-head"><span class="dcu-wb-folder"></span><span class="dcu-wb-project-title">default-workspace</span></div>
            <div class="dcu-wb-project-body" data-open="true"><div>
              <div class="dcu-wb-session"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">Oh Story 工作台说明与用法</span></span><span class="dcu-wb-session-time">1d</span></div>
            </div></div>
          </div>
          <div class="dcu-wb-empty">No chats</div>
        </div></div>
      </div>
    </div>
    <footer class="dcu-foot"><div class="dcu-footer-actions">
      <div class="cm-footer-stack simple">
        <div class="cm-simple-summary"><span>Today</span><span class="cm-num">¥0</span></div>
        <div class="cm-foot"><span class="cm-balance-name">Balance</span><span class="cm-num cm-bal-amt">¥3.2111</span></div>
        <div class="cm-peak-classic"><span class="cm-peak-track"></span><span class="cm-peak-classic-chip">Off-peak · Peak in 7h 49m</span></div>
      </div>
      <div class="dcu-menu"><button class="dcu-footer-link">Memory</button></div>
    </div></footer>
  </div>
</div>`

const railFixture = `
<div class="dcu-root dcu-compact" id="rail">
  <div class="dcu-compact-shell">
    <button class="dcu-icon" aria-label="展开">E</button>
    <nav class="dcu-compact-nav"><button class="dcu-icon" aria-label="新建任务">+</button></nav>
  </div>
  <footer class="dcu-foot"><div class="dcu-footer-actions">
    <div class="cm-footer-stack simple">
      <div class="cm-simple-summary"><span>Today</span><span class="cm-num">¥0</span></div>
      <div class="cm-foot"><span class="cm-balance-name">Balance</span><span class="cm-num cm-bal-amt">¥3.2111</span></div>
      <div class="cm-peak-classic"><span class="cm-peak-classic-chip">Off-peak · Peak in 7h 49m</span></div>
    </div>
  </div></footer>
</div>`

const cardsFixture = `
<div class="dcu-home-suggestions" style="width:712px">
  <div class="dcu-home-cards">${labels.map((l) => `<button type="button" class="dcu-home-card"><span>${l}</span></button>`).join('')}</div>
</div>`

const MEASURE = `(() => {
  const lum = (rgb) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])
  }
  const parse = (s) => { const m = s.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/); return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : parseFloat(m[4]) } : null }
  const effBg = (el) => {
    let e = el
    while (e) {
      const c = parse(getComputedStyle(e).backgroundColor)
      if (c && c.a > 0.9) return c.rgb
      e = e.parentElement
    }
    return [255, 255, 255]
  }
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); const hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05) }
  window.__contrast = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const fg = parse(getComputedStyle(el).color)
    if (!fg) return null
    return { ratio: +ratio(fg.rgb, effBg(el)).toFixed(2), color: getComputedStyle(el).color }
  }
  window.__overflow = (scopeSel) => {
    const scope = document.querySelector(scopeSel)
    if (!scope) return null
    const bad = []
    scope.querySelectorAll('*').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) bad.push(el.className || el.tagName)
    })
    return bad
  }
  return true
})()`

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // ---- 1) 侧栏对比度（明 / 暗）----
  const TEXT_SELECTORS = ['.dcu-wb-project-title', '.dcu-wb-session-title-text', '.dcu-wb-session-time', '.dcu-wb-section-label', '.dcu-wb-empty']
  for (const dark of [false, true]) {
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${sidebarFixture}</body></html>`)
    await page.addStyleTag({ content: css })
    await page.addStyleTag({ content: `body{background:#f8f8f8}` })
    if (dark) {
      await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
      await page.addStyleTag({ content: `body{background:#161616}` })
    }
    await page.evaluate(MEASURE)
    for (const sel of TEXT_SELECTORS) {
      const r = await page.evaluate((s) => window.__contrast(s), sel)
      assert.ok(r, `${dark ? '暗色' : '亮色'}: 必须能取到 ${sel} 的对比度`)
      assert.ok(r.ratio >= 4.5, `${dark ? '暗色' : '亮色'}: ${sel} 对比度 ${r.ratio}:1（${r.color}）低于 WCAG AA 的 4.5:1`)
    }
    console.log(`  ${dark ? '暗色' : '亮色'}侧栏文字对比度全部 ≥4.5:1 ✔`)
  }

  // ---- 2) 建议卡标签不得截断 ----
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${cardsFixture}</body></html>`)
  await page.addStyleTag({ content: css })
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.dcu-home-card > span')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.textContent))
  assert.deepEqual(clipped, [], `建议卡标签被截断: ${JSON.stringify(clipped)}`)
  console.log(`  建议卡标签无截断（${labels.length} 张）✔`)

  // ---- 3) 折叠轨不得横向溢出 ----
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${railFixture}</body></html>`)
  await page.addStyleTag({ content: css })
  await page.evaluate(MEASURE)
  const overflow = await page.evaluate(() => window.__overflow('#rail'))
  assert.deepEqual(overflow, [], `折叠轨内横向溢出: ${JSON.stringify(overflow)}`)
  const costHidden = await page.evaluate(() => {
    const el = document.querySelector('#rail .cm-footer-stack')
    return el ? getComputedStyle(el).display : 'missing'
  })
  assert.equal(costHidden, 'none', '折叠轨内的第三方计费卡必须隐藏（56px 装不下它的文字）')
  console.log('  折叠轨无横向溢出、计费卡已隐藏 ✔')
} finally {
  await browser.close()
}
