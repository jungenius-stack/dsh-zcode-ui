/** 可读性与溢出（真机测量，不需要活宿主）：
 *  1) 侧栏文字对比度 ≥ 4.5:1（明/暗两套主题，WCAG 2.1 AA）
 *  1b) 状态色文字对比度 ≥ 4.5:1 + 状态指示点 ≥ 3:1（明/暗两套；2026-10-14 补，
 *      守「状态色当小字用」这一已发生过的回归）
 *  2) 新会话建议卡标签不得被截断（四个卡片在真实宽度下全部放得下）
 *  3) 折叠轨内不得出现横向溢出（此前计费卡文字被裁成 "F41-peak"）
 *
 * 这三类问题此前没有任何断言覆盖 —— 它们不是几何问题，量不出来，只能靠人眼看。
 * 现在用计算样式 + 对比度公式把它们变成客观判据。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const pick = (file, name) => readFileSync(file, 'utf8').match(new RegExp('(?:export )?const ' + name + ' = `([\\s\\S]*?)`'))?.[1]
const sheets = [
  pick('src/client/zcode-theme.ts', 'ZCODE_THEME_STYLE'),
  pick('src/client/CodexSidebar.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'typographyStyles'),
  pick('src/client/new-conversation-style.ts', 'NEW_CONVERSATION_STYLE'),
  pick('src/client/AboutSection.tsx', 'stylesheet'),
  pick('src/client/settings-page-styles.ts', 'settingsPageStyles'),
]
assert.ok(sheets.every(Boolean), '必须能取到全部样式表（变量名被改时此断言会失败）')
const css = fixtureTokenStyle() + '\n' + sheets.join('\n')

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

/** 状态色测量夹具（2026-10-14）。
 *
 * 背景：Zai 的 `--dsw-alias-state-*` 是按**填充**用途推导的值，当作小字用时亮色档
 * 全部不达 WCAG AA（实测 2.63 / 2.82 / 3.34 / 4.15 / 4.25:1）。本插件因此在
 * `zcode-theme.ts` 里分了「填充档 / 文字档」，这里负责让该分档**可回归**——
 * 若有人把文字色改回 `--dsw-alias-state-*`，本节立刻变红。
 *
 * 只测量颜色来自 `--dcu-state-*-text` 的元素：`fixtureTokenStyle()` 目前把明暗两套
 * `--dsw-*` 平铺进同一个 `:root`（暗色胜出，见 KNOWN-ISSUES §12.3 #2），凡是走
 * `--dsw-alias-label-*` 的元素在亮色趟会拿到暗色值而误报，故不纳入。 */
const stateFixture = `
<div class="dcu-root" id="state-root">
  <div class="dcu-wb dcu-workspaces">
    <div class="dcu-wb-session">
      <span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">状态色测量</span></span>
      <span class="dcu-wb-pending" data-state="warning"><span class="dcu-wb-pending-dot"></span><span class="dcu-wb-pending-label">等待审批</span></span>
    </div>
    <div class="dcu-wb-error" role="alert">操作失败：示例错误</div>
  </div>
  <div class="dcu-settings-page">
    <div class="dcu-about">
      <span class="dcu-about-status" data-installed="true">已安装</span>
      <span class="dcu-about-status" data-installed="false">未安装</span>
      <span class="dcu-about-status" data-update="true">可更新</span>
      <p class="dcu-about-message" data-error="true">安装失败，请重试。</p>
    </div>
    <div class="dcu-settings-search"><input type="search" placeholder="搜索设置" /></div>
  </div>
</div>`

/** 状态色文字选择器 → 该处承载的语义（用于断言消息）。全部要求 ≥4.5:1。 */
const STATE_TEXT_SELECTORS = [
  ['.dcu-wb-pending-label', '侧栏「待处理」胶囊文字（警告色）'],
  ['.dcu-wb-error', '会话区错误提示条（错误色）'],
  ['.dcu-about-status[data-installed=true]', '关于页「已安装」（成功色）'],
  ['.dcu-about-status[data-installed=false]', '关于页「未安装」（错误色）'],
  ['.dcu-about-status[data-update=true]', '关于页「可更新」（警告色）'],
  ['.dcu-about-message[data-error=true]', '关于页安装失败提示（错误色）'],
  // 设置页搜索框落在 --sp-card 上，与页面底不同——必须用 --sp-muted-on-card。
  ['.dcu-settings-search', '设置页搜索框图标（卡片底上的次要文字色）'],
]

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
  // 非文字元素（状态指示点、图标底色）：取 backgroundColor 与**自身之外**的底色比。
  window.__contrastBg = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const own = parse(getComputedStyle(el).backgroundColor)
    if (!own || own.a === 0) return null
    const parent = el.parentElement
    if (!parent) return null
    return { ratio: +ratio(own.rgb, effBg(parent)).toFixed(2), color: getComputedStyle(el).backgroundColor }
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

  // ---- 1b) 状态色：文字档 ≥4.5:1、指示点 ≥3:1（明 / 暗）----
  // 这一节守的是「状态色当小字用」这个已发生过一次的回归：Zai 原值作文字时
  // 亮色档实测 2.63（待处理）/ 2.82（可更新）/ 3.34（错误条）/ 4.15（已安装）/ 4.25（未安装）:1。
  for (const dark of [false, true]) {
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${stateFixture}</body></html>`)
    await page.addStyleTag({ content: css })
    // 各元素按**真实所在底色**测量：侧栏 #f0f0f0/#161616，设置页 #f8f8f8/#161616。
    await page.addStyleTag({
      content: dark
        ? '#state-root .dcu-wb{background:#161616}#state-root .dcu-settings-page{background:#161616}'
        : '#state-root .dcu-wb{background:#f0f0f0}#state-root .dcu-settings-page{background:#f8f8f8}',
    })
    if (dark) await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    await page.evaluate(MEASURE)
    for (const [sel, label] of STATE_TEXT_SELECTORS) {
      const r = await page.evaluate((s) => window.__contrast(s), sel)
      assert.ok(r, `${dark ? '暗色' : '亮色'}: 必须能取到 ${sel} 的对比度`)
      assert.ok(
        r.ratio >= 4.5,
        `${dark ? '暗色' : '亮色'}: ${label} 对比度 ${r.ratio}:1（${r.color}）低于 WCAG AA 的 4.5:1。` +
          '状态色作小字必须用 --dcu-state-*-text（文字档），不得用 --dsw-alias-state-*（填充档，见 zcode-theme.ts）',
      )
    }
    const dot = await page.evaluate(() => window.__contrastBg('.dcu-wb-pending-dot'))
    assert.ok(dot, `${dark ? '暗色' : '亮色'}: 必须能取到待处理指示点的底色对比度`)
    assert.ok(dot.ratio >= 3, `${dark ? '暗色' : '亮色'}: 待处理指示点 ${dot.ratio}:1（${dot.color}）低于 WCAG AA 非文字内容的 3:1`)
    console.log(`  ${dark ? '暗色' : '亮色'}状态色文字 ≥4.5:1、指示点 ≥3:1 ✔（${STATE_TEXT_SELECTORS.length} 处）`)
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
