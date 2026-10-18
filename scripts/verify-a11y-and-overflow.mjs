/** 可读性与溢出（真机测量，不需要活宿主）：
 *  1) 侧栏文字对比度 ≥ 4.5:1（明/暗两套主题，WCAG 2.1 AA）
 *  1b) 状态色文字对比度 ≥ 4.5:1 + 状态指示点 ≥ 3:1（明/暗两套；2026-10-14 补，
 *      守「状态色当小字用」这一已发生过的回归）
 *  2) 新会话建议卡标签不得被截断（四个卡片在真实宽度下全部放得下）
 *  3) 折叠轨内不得出现横向溢出（此前计费卡文字被裁成 "F41-peak"）
 *  4) **键盘焦点的可见性**（2026-10-14 补）：插件自绘的可聚焦元素必须真的画出焦点环。
 *
 * 这三类问题此前没有任何断言覆盖 —— 它们不是几何问题，量不出来，只能靠人眼看。
 * 现在用计算样式 + 对比度公式把它们变成客观判据。
 *
 * 第 4 类为什么重要：WCAG 2.1 AA 的 2.4.7 要求键盘焦点可见。本仓库的皮肤层**刻意不**
 * 覆盖 `:focus-visible`（DSH 用 `html[data-input-modality=pointer]` 实现「仅键盘显示焦点环」，
 * 直接写 outline 会连鼠标点击也画出焦点环，是另一种可访问性回退）——它只换焦点环消费的
 * **变量**。于是「焦点环到底还在不在」变成一件只能实测的事：变量被删、被改名、被作用域隔离，
 * 都会让焦点环静默消失且没有任何报错。2026-10-14 实机走查 40 个焦点元素，插件自绘的 39 个
 * 都有环；此检查把该结论固化成门禁。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const pick = (file, name) => readFileSync(file, 'utf8').match(new RegExp('(?:export )?const ' + name + ' = `([\\s\\S]*?)`'))?.[1]
// ⚠️ 夹具注入的样式表集合必须**逐个核对**到被测选择器的定义文件。
// 2026-10-14 实测教训（与 KNOWN-ISSUES §22.5 同构，这是第二次踩）：焦点可见性检查首版
// 只注入了 stylesheet / typographyStyles，而 `.dcu-wb-project-head:focus-visible` 的焦点环
// **定义在 collectionLayoutStyles 里**——于是断言量到的是「没有环」，实际是**夹具没注入**，
// 产品是对的。表现上和真缺陷一模一样（`outline: none 0px`），只有顺着规则来源查才能分辨。
const sheets = [
  pick('src/client/zcode-theme.ts', 'ZCODE_THEME_STYLE'),
  pick('src/client/CodexSidebar.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'stylesheet'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'typographyStyles'),
  pick('src/client/CodexWorkspaceBrowser.tsx', 'collectionLayoutStyles'),
  pick('src/client/new-conversation-style.ts', 'NEW_CONVERSATION_STYLE'),
  pick('src/client/AboutSection.tsx', 'stylesheet'),
  pick('src/client/settings-page-styles.ts', 'settingsPageStyles'),
]
assert.ok(sheets.every(Boolean), '必须能取到全部样式表（变量名被改时此断言会失败）')
// 按主题态注入 --dsw-*（fixture-tokens 之前把明暗两套平铺进同一个 :root，
// 暗色恒胜，导致令牌量到的与真实宿主相反——见 fixture-tokens.mjs 顶部注释）。
const cssFor = (modal) => fixtureTokenStyle(modal) + '\n' + sheets.join('\n')

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
 * 只测量颜色来自 `--dcu-state-*-text` 的元素：令牌注入改为按 modality 之后（见
 * `fixture-tokens.mjs` 顶部注释），走 `--dsw-alias-label-*` 的元素本可纳入；但那会同时
 * 依赖 `--dsw-alias-label-*` 在两种底色上的配对，测的东西与本节无关，故仍不纳入。 */
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
    await page.addStyleTag({ content: cssFor(dark ? 'dark' : 'light') })
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
    await page.addStyleTag({ content: cssFor(dark ? 'dark' : 'light') })
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
  await page.addStyleTag({ content: cssFor('light') })
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.dcu-home-card > span')]
    .filter((el) => el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.textContent))
  assert.deepEqual(clipped, [], `建议卡标签被截断: ${JSON.stringify(clipped)}`)
  console.log(`  建议卡标签无截断（${labels.length} 张）✔`)

  // ---- 3) 折叠轨不得横向溢出 ----
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}body{font-family:system-ui,-apple-system,sans-serif}</style></head><body>${railFixture}</body></html>`)
  await page.addStyleTag({ content: cssFor('light') })
  await page.evaluate(MEASURE)
  const overflow = await page.evaluate(() => window.__overflow('#rail'))
  assert.deepEqual(overflow, [], `折叠轨内横向溢出: ${JSON.stringify(overflow)}`)
  const costHidden = await page.evaluate(() => {
    const el = document.querySelector('#rail .cm-footer-stack')
    return el ? getComputedStyle(el).display : 'missing'
  })
  assert.equal(costHidden, 'none', '折叠轨内的第三方计费卡必须隐藏（56px 装不下它的文字）')
  console.log('  折叠轨无横向溢出、计费卡已隐藏 ✔')

  // ---- 4) 键盘焦点必须可见（WCAG 2.1 AA 2.4.7）----
  // 用真实 Tab 走查而不是读样式表：焦点环由**变量**驱动（--dsw-focus-ring-color /
  // --dcu-focus），变量丢失时样式规则仍在、环却没了——只有实测量得出来。
  // 注意必须先按一次 Tab 建立 keyboard 输入模态：DSH 在 pointer 模态下**有意**隐藏焦点环，
  // 不建立模态会把「设计如此」误判成缺陷。
  //
  // **本检查的边界（别高估它）**：它只回答「有没有环」。
  //   · 环的**颜色**不归这里管——由 `tests/design-system.assert.ts` §10/§14 负责
  //     （亮 #0b7fff / 暗 #4099ff）。已实测：删掉 `--dsw-focus-ring-color` 时本检查**不会**变红，
  //     因为规则是 `var(--dsw-focus-ring-color, var(--dcu-focus))`，令牌丢失会回退到
  //     `--dcu-focus`，环仍在（有意的防御性回退）。两处断言互补，刻意不重复。
  //   · 对比度与目标尺寸（WCAG 2.5.8 的 24×24）不在本检查范围。
  // 夹具必须忠实于真实结构：`.dcu-wb-project-head` 在产品里是**不可聚焦的 div**
  // （真正可聚焦的是带 role="treeitem" 的行，由 tree-keyboard 用 roving tabindex 管理）。
  // 第一版给它硬加了 tabindex="0"，于是造出产品里不存在的焦点目标，断言误报
  // 「project-head 无焦点环」——那是**夹具失真**，不是产品缺陷。这里只放真实可聚焦元素。
  const focusFixture = `
  <div class="dcu-root" id="fx" style="width:240px">
    <nav class="dcu-menu">
      <button class="dcu-footer-link">New task</button>
      <button class="dcu-footer-link">Extensions</button>
    </nav>
    <div class="dcu-wb">
      <div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true">Projects</button></div>
      <div class="dcu-wb-project">
        <button class="dcu-wb-project-head" role="treeitem" aria-level="1"><span class="dcu-wb-project-title">default-workspace</span></button>
      </div>
      <div class="dcu-wb-session" role="treeitem" aria-level="2" tabindex="0"><span class="dcu-wb-session-title">A conversation</span></div>
    </div>
    <div class="dcu-home-cards" style="display:flex;gap:8px">
      <button type="button" class="dcu-home-card"><span>Explore</span></button>
    </div>
    <div class="dcu-turn-list"><button class="dcu-turn-link" aria-label="turn 1"></button></div>
  </div>
  <div class="dcu-settings-page" id="sp" style="position:static;display:block">
    <div class="dcu-settings-nav">
      <button class="dcu-settings-link">General</button>
      <button class="dcu-settings-back">Back</button>
    </div>
  </div>`
  for (const dark of [false, true]) {
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}</style></head><body>${focusFixture}</body></html>`)
    await page.addStyleTag({ content: cssFor(dark ? 'dark' : 'light') })
    await page.evaluate((d) => document.body.toggleAttribute('data-ds-dark-theme', d), dark)
    // 键盘模态：DSH 只在键盘操作时才画焦点环，这是有意的设计，必须先建立。
    await page.keyboard.press('Tab')
    const measured = []
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement
        if (el === null || el === document.body) return null
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return {
          tag: el.tagName,
          cls: (el.className ?? '').toString().slice(0, 40),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          outlineStyle: cs.outlineStyle,
          outlineWidth: Number.parseFloat(cs.outlineWidth) || 0,
          boxShadow: cs.boxShadow,
        }
      })
      if (info === null || info.w === 0 || info.h === 0) continue
      const hasRing = (info.outlineStyle !== 'none' && info.outlineWidth > 0)
        || (info.boxShadow !== 'none' && info.boxShadow !== '')
      measured.push({ ...info, hasRing })
    }
    assert.ok(measured.length >= 5, `${dark ? '暗色' : '亮色'}: 夹具里必须能走到足够多的可聚焦元素（实得 ${measured.length}）`)
    const withoutRing = measured.filter((m) => !m.hasRing).map((m) => `${m.tag}.${m.cls}`)
    assert.deepEqual(
      withoutRing,
      [],
      `${dark ? '暗色' : '亮色'}: 以下插件自绘元素在键盘聚焦时没有可见焦点环（WCAG 2.1 AA 2.4.7）：${withoutRing.join(', ')}`
      + '——焦点环由 --dsw-focus-ring-color / --dcu-focus 驱动，变量丢失时规则还在、环却没了',
    )
    console.log(`  ${dark ? '暗色' : '亮色'}: ${measured.length} 个可聚焦元素全部有可见焦点环 ✔`)
  }
} finally {
  await browser.close()
}
