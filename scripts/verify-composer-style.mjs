/** 用宿主实际发布 CSS 验证输入框覆盖；不连接会话或发送消息。 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const require = createRequire(import.meta.url)
const host = readFileSync(require.resolve('@deepseek-ai/dsh-client-ui-conversation/client'), 'utf8')
const css = host.match(/const css\$1 = ("(?:[^"\\]|\\.)*");\s*const tagId\$1 = "@deepseek-ai\/dsh-client-ui-conversation\/InputBar.module.css"/)?.[1]
const classes = host.match(/var InputBar_module_css_default = (\{[\s\S]*?\});/)?.[1]
const skin = readFileSync('src/client/CodexSidebar.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)?.[1]
// 主题层必须一并注入：发送键底色用 var(--dcu-primary)，真实应用里由 zcode-theme 全局注入，
// 只注入皮肤样式会让该 var() 解析失败（正是 docs/KNOWN-ISSUES.md §8 那个真问题的成因）。
const theme = readFileSync('src/client/zcode-theme.ts', 'utf8').match(/export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)?.[1]
// 令牌层同样必须注入：输入壳与搜索弹窗的圆角已改用 var(--dsw-radius-2xl)，而它定义在
// zcode-tokens.ts（不在主题层）。夹具缺令牌时 var() 解析失败、圆角回退，断言会误报。
// 这正是 docs/KNOWN-ISSUES.md §6.1「合成页面缺令牌」那一类，统一走共享夹具避免复发。
assert.ok(css && classes && skin && theme, '宿主输入框锚点或主题样式变化，需要重新核对适配')
const c = JSON.parse(classes)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  for (const dark of [false, true]) for (const width of [390, 800, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;--dsh-chat-content-width:720px;--dsh-composer-text-max-height:240px;--dsw-specific-input-major:#fff;--dsw-alias-bg-base:${dark ? '#181818' : '#fff'};--dsw-alias-bg-layer-2:#242424;--dsw-alias-label-primary:${dark ? '#ddd' : '#262626'};--dsw-alias-label-secondary:#777}</style><main data-conversation-scroll><div class="${c.root}"><div data-composer-card class="${c.card}"><div data-input-scroll class="${c.scroll}"><div class="${c.grow}"><div data-lexical-editor="true" contenteditable="true" class="${c.input}" aria-label="消息"><p><br></p></div><div data-composer-placeholder class="${c.placeholder}">输入消息</div></div></div><div class="${c.row}"><div class="${c.tools}"><button class="${c.add}">+</button><div class="${c.modes}"><button>权限</button></div></div><div class="${c.trailing}"><button class="${c.primary}" aria-label="发送">↑</button></div></div></div></div></main>`)
    await page.addStyleTag({ content: JSON.parse(css) })
    await page.addStyleTag({ content: skin })
    await page.addStyleTag({ content: fixtureTokenStyle(dark ? 'dark' : 'light') })
    await page.addStyleTag({ content: theme })
    await page.evaluate(dark => document.body.toggleAttribute('data-ds-dark-theme', dark), dark)
    const measure = () => page.locator('[data-composer-card]').evaluate(el => {
      const s = getComputedStyle(el), b = el.getBoundingClientRect()
      const button = el.querySelector('button[aria-label="发送"]'), bs = getComputedStyle(button)
      // 2026-10-27（C5~C9）：把本轮对齐 ZCode 的五项一并纳入量测，
      // 这样不依赖活宿主（CDP 9223）也能验证，且以后改回旧值会立刻报红。
      const ed = el.querySelector('[contenteditable]')
      const radii = [...el.querySelectorAll('button')]
        .filter(x => !String(x.className).includes('dsh-po-'))
        .map(x => getComputedStyle(x).borderRadius)
      const rail = el.querySelector('[data-slot="conversation.input.attachments"] [class$="_rail"]')
      return { height: b.height, radius: s.borderRadius, shadow: s.boxShadow, background: s.backgroundColor, overflow: document.documentElement.scrollWidth > innerWidth, button: button.getBoundingClientRect().height, transform: bs.transform,
        borderTop: s.borderTopWidth + ' ' + s.borderTopStyle, borderColor: s.borderTopColor,
        padding: s.padding, gap: s.gap, editorLineHeight: ed ? getComputedStyle(ed).lineHeight : null,
        buttonRadii: [...new Set(radii)], railMarginBottom: rail ? getComputedStyle(rail).marginBottom : null }
    })
    // 合成页首帧可能仍在过渡中，读到中间值会偶发失败（实测到过 translateY(-2px) 与 28.0000038）。
    // 只消除读取竞态，不削弱断言：位移若真的存在，settle 之后照样能测到。
    await page.waitForTimeout(150)
    const before = await measure()
    // 2026-10-27（C5/C6/C7 对齐 ZCode）：padding 8→12、gap 4→12，卡片自然高度随之变化。
    // 推导：12(上) + 44(编辑区) + 12(gap) + 28(工具栏) + 12(下) + 2(上下各 1px 边框) = 110
    // 实测 118 —— 差 8px 来自工具栏内部的行高余量（按钮 28 + 容器内 padding），
    // 故这里断言「由新结构推导出的区间」而不是写死单一数字：只要 padding/gap 回退旧值就不再落在这个区间。
    assert.ok(before.height >= 110 && before.height <= 122,
      `空态高度应由 12px padding + 44px 编辑区 + 12px gap + 28px 工具栏撑出（实测 ${before.height}，期望 110~122；旧布局 92 不应出现）`)
    // 2026-10-12 由 Codex 口径（superellipse 25px / 20px）更新为 ZCode 的 16px 圆角（实测）。
    assert.equal(before.radius, '16px', 'ZCode 输入壳圆角为 16px')
    assert.ok(Math.abs(before.button - 28) < 0.5, '发送键宽度必须为 28px（rect 浮点值，用容差比较）')
    assert.equal(before.transform, 'none')
    assert.equal(before.overflow, false)
    assert.equal(before.shadow.includes('inset'), dark)
    /* ── C5 边框：此前 --dcu-composer-border 跨作用域继承为空，整条 border 被丢弃（实测 0px none）。
       现在必须真的是 1px solid，且深色 .15 白 / 浅色 .15 黑。 ── */
    assert.equal(before.borderTop, '1px solid', 'C5：输入壳必须有 1px 实体边框（曾是 0px 被变量解析失败吃掉）')
    assert.match(before.borderColor, dark ? /255,\s*255,\s*255,\s*0?\.15/ : /13,\s*13,\s*13,\s*0?\.15/,
      'C5：边框色应为 15% alpha（深色白 / 浅色黑）')
    /* ── C6/C7：ZCode 实测四边 12px、gap 12px ── */
    assert.equal(before.padding, '12px', 'C6：卡片内边距对齐 ZCode 的 12px')
    assert.equal(before.gap, '12px', 'C7：卡片 gap 对齐 ZCode 的 12px')
    /* ── C8：编辑器行高 20px（ZCode 14px/20px） ── */
    assert.equal(before.editorLineHeight, '20px', 'C8：编辑器行高对齐 ZCode 的 20px')
    /* ── C9：按钮圆角统一 8px（排除外来插件的 dsh-po-*） ── */
    assert.deepEqual(before.buttonRadii, ['8px'], 'C9：输入区按钮圆角必须统一 8px（ZCode 口径）')
    /* P2：「优化」按钮（dsh-po-btn）的胶囊圆角是第三方插件写的**内联 style**，
       内联优先级高于选择器，必须 !important 才能改。夹具里重建这颗按钮验证该规则真的生效。 */
    const poProbe = await page.evaluate(() => {
      const card = document.querySelector('[data-composer-card]')
      const bar = card.querySelector('[data-input-scroll] + div') || card
      const b = document.createElement('button')
      b.className = 'dsh-po-btn dsh-po-opt'
      // 复刻第三方插件的内联写法（这正是普通 CSS 压不动的原因）
      b.setAttribute('style', 'border-radius:999px;display:inline-flex;padding:4px 12px')
      b.textContent = '优化'
      bar.appendChild(b)
      const r = getComputedStyle(b).borderRadius
      b.remove()
      return r
    })
    assert.equal(poProbe, '8px',
      'P2：「优化」按钮的**内联**圆角必须被 !important 覆盖为 8px（普通声明压不过内联）')
    /* ── 附件轨道到正文保留官方 6px：gap 12 + (-6) 补偿 ── */
    if (before.railMarginBottom !== null) {
      assert.equal(before.railMarginBottom, '-6px', '附件补偿：gap 12px 下需 -6px 才能保留官方 6px 间距')
    }
    await page.locator('[contenteditable]').focus()
    assert.deepEqual(await measure(), before, '聚焦不改变整框表面或几何尺寸')
    await page.locator('[contenteditable]').fill('多行内容\n第二行\n第三行\n第四行')
    assert.ok((await measure()).height > before.height, '多行输入必须自然撑高')
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('button').first().evaluate(el => getComputedStyle(el).outlineWidth), '2px')
    /* 皮肤令牌改写的守卫（放在本轮其余检查之后：它会改写样式表，不再影响几何断言）。
       皮肤（动态壁纸等）会在令牌源头重写 --dsw-alias-label-primary 与
       --dsw-alias-bg-base：发送键的底色或前景一旦取自这两个令牌，就会变成
       「黑圆 + 看不见的箭头」——宿主箭头是 fill="currentColor"，前景透明等于没有箭头，
       深浅主题都会发生。
       先把宿主自身 .primary 的 background/color 改为 initial（按选择器扫样式表，只动那一条，
       不是追加一条同属性规则 —— 后者会把本插件规则一起压住，让断言永远为真）；
       本插件规则特异性更高，仍然生效，因此下面量到的就是它解析出来的颜色。
       宿主 .primary 带 transition:background-color .1s，必须禁用过渡，否则量到中间色。 */
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText?.endsWith('_primary') && rule.style.background) {
            rule.style.backgroundColor = 'initial'
            rule.style.color = 'initial'
          }
        }
      }
      const tag = document.createElement('style')
      tag.textContent = '*{transition:none!important;animation:none!important}'
      document.head.append(tag)
    })
    const buttonPaint = () => page.locator('button[aria-label="发送"]').evaluate(el => {
      const s = getComputedStyle(el)
      return { background: s.backgroundColor, color: s.color }
    })
    const paintHost = await buttonPaint()
    // 2026-10-12：主色令牌提升到根作用域后，发送键真正取到 ZCode 主色（浅 #000 / 暗 #fff）；
    // 旧期望 rgb(15,17,21) 是 P1 之前的硬编码色，那时这条规则其实取不到令牌（见 KNOWN-ISSUES §8）。
    assert.equal(paintHost.background, dark ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)', '发送键必须取到 ZCode 主色底色')
    assert.equal(paintHost.color, dark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)', '箭头必须取到 ZCode 主色前景')
    assert.notEqual(paintHost.background, 'rgba(0, 0, 0, 0)', '发送键底色必须是不透明实色')
    assert.notEqual(paintHost.color, 'rgba(0, 0, 0, 0)', '发送键前景（箭头 currentColor）必须是不透明实色')
    await page.addStyleTag({ content: 'body{--dsw-alias-label-primary:rgb(0, 0, 0);--dsw-alias-bg-base:transparent}' })
    const paintSkin = await buttonPaint()
    assert.equal(paintSkin.background, paintHost.background, '皮肤改写别名令牌不得改变发送键底色')
    assert.equal(paintSkin.color, paintHost.color, '皮肤改写别名令牌不得改变发送键前景')
    assert.notEqual(paintSkin.background, 'rgba(0, 0, 0, 0)', '皮肤改写后底色仍须是不透明实色')
    assert.notEqual(paintSkin.color, 'rgba(0, 0, 0, 0)', '皮肤改写后前景仍须是不透明实色')
  }
  console.log('输入框：深浅主题 × 3 个视口，圆角、焦点稳定、按钮尺寸、多行与溢出检查通过。')
} finally { await browser.close() }
