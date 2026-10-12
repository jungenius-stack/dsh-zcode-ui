/** 使用宿主真实 frame CSS，覆盖原生交通灯、侧栏动画与全屏切换的布局回归。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const sidebar = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const stylesheet = sidebar.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
const host = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const hostStyle = host.match(/const css = ("(?:[^"\\]|\\.)*");/)
assert.ok(stylesheet)
assert.ok(hostStyle)
const css = JSON.parse(hostStyle[1])
const classOf = suffix => css.match(new RegExp('\\.([A-Za-z0-9_]+_' + suffix + ')\\{'))?.[1]
// 交通灯避让契约：macOS 非全屏时，侧栏必须从宿主保留区（--dsh-frame-top-clearance，宿主取 48px）
// 下方开始；全屏与其它平台的保留区为 0。
// 注意：**不要**在这里写死"控件相对头部的内部偏移"。它随 ZCode 间距演进反复变化——
// 旧口径写死 3px（头部 38px、控件 32px），2026-10-12 实测已变成展开态 6px / 紧凑轨 4px（全屏下 0），
// 两次失效。故内部偏移只做区间断言，精确值只钉在"头部顶边 === 保留区"这条真契约上。
const DARWIN_TITLEBAR_CLEARANCE = 48
const HEADER_BAND_TOLERANCE = 16
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 520, height: 700 }, { width: 1280, height: 820 }, { width: 1728, height: 1084 }]) {
    await page.setViewportSize(viewport)
    await page.setContent(`<style>html,body{height:100%;margin:0}html{--dsw-font-family:system-ui}</style>
      <div class="${classOf('frame')}" style="grid-template-columns:240px minmax(0px,1fr) 0px">
        <div class="${classOf('sidebarCol')}"><aside class="dcu-root">
          <div class="dcu-expanded-shell"><header class="dcu-head">
            <button class="dcu-brand" aria-label="品牌"><svg viewBox="0 0 150 24"><text x="0" y="18">DeepSeek Harness</text></svg></button>
            <div class="dcu-head-actions"><button class="dcu-icon" aria-label="收起">☰</button><button class="dcu-icon" aria-label="搜索">⌕</button></div>
          </header><nav class="dcu-menu"><button>任务</button></nav><div class="dcu-workspaces">项目与会话</div></div>
          <div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开">☰</button><nav class="dcu-compact-nav"><button class="dcu-icon">+</button></nav></div>
          <footer class="dcu-foot"><button class="dcu-footer-link">账户与设置</button></footer>
        </aside></div><main class="${classOf('centerCol')}">对话</main><div></div>
      </div>`)
    await page.addStyleTag({ content: css + stylesheet })
    for (const platform of ['darwin', 'win32', 'web']) {
      for (const fullscreen of [false, true, false]) {
        await page.evaluate(({ platform, fullscreen }) => {
          const html = document.documentElement
          if (platform === 'web') html.removeAttribute('data-platform')
          else html.setAttribute('data-platform', platform)
          html.toggleAttribute('data-fullscreen', fullscreen)
        }, { platform, fullscreen })
        for (const mode of ['expanded', 'collapsing', 'compact', 'expanded']) {
          await page.evaluate(mode => {
            const root = document.querySelector('.dcu-root')
            root.classList.toggle('dcu-compact', mode === 'compact')
            root.classList.toggle('dcu-collapsing', mode === 'collapsing')
            root.parentElement.parentElement.style.gridTemplateColumns = `${mode === 'expanded' ? 240 : 56}px minmax(0px,1fr) 0px`
          }, mode)
          const control = page.getByRole('button', { name: mode === 'expanded' ? '收起' : '展开', exact: true })
          const clearance = platform === 'darwin' && !fullscreen ? DARWIN_TITLEBAR_CLEARANCE : 0
          const controlBox = await control.boundingBox()
          assert.ok(controlBox.y >= clearance,
            `${platform}/${fullscreen}/${mode}: 操作控件必须避让交通灯（实测顶边 ${controlBox.y} < 保留区 ${clearance}）`)
          assert.ok(controlBox.y <= clearance + HEADER_BAND_TOLERANCE,
            `${platform}/${fullscreen}/${mode}: 操作控件不得被推到保留区下方 ${HEADER_BAND_TOLERANCE}px 以外（实测 ${controlBox.y}）`)
          assert.ok(await control.evaluate(el => {
            const r = el.getBoundingClientRect()
            return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
          }), '侧栏控件必须可点击')
          const geometry = await page.locator('.dcu-root').evaluate(el => ({
            bottom: el.getBoundingClientRect().bottom,
            footerBottom: el.querySelector('.dcu-foot').getBoundingClientRect().bottom,
            parentBottom: el.parentElement.getBoundingClientRect().bottom,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
          }))
          assert.equal(geometry.bottom, geometry.parentBottom, '安全区不得撑高侧栏')
          assert.ok(geometry.footerBottom <= geometry.bottom, '账户入口必须保留在窗口内')
          assert.equal(geometry.overflow, false)
          if (mode === 'expanded') {
            const headTop = await page.locator('.dcu-head').evaluate(el => Math.round(el.getBoundingClientRect().top))
            assert.equal(headTop, clearance, `${platform}/${fullscreen}: 头部必须正好从宿主保留区下方开始`)
            assert.ok((await page.locator('.dcu-brand svg').boundingBox()).y >= clearance)
          }
        }
      }
    }
    // 宿主更改安全区时同步适配，避免只硬编码当前 48px。
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-platform', 'darwin')
      document.documentElement.removeAttribute('data-fullscreen')
      document.documentElement.style.setProperty('--dsh-frame-top-clearance', '64px')
    })
    assert.equal(Math.round(await page.locator('.dcu-head').evaluate(el => el.getBoundingClientRect().top)), 64,
      '宿主提高保留区后头部必须随之下移到 64px')
    const overrideBox = await page.getByRole('button', { name: '收起', exact: true }).boundingBox()
    assert.ok(overrideBox.y >= 64 && overrideBox.y <= 64 + HEADER_BAND_TOLERANCE,
      `宿主提高保留区后控件必须随之落在 64px 之下（实测 ${overrideBox.y}）`)
    await page.evaluate(() => document.documentElement.style.removeProperty('--dsh-frame-top-clearance'))
  }
  console.log('✓ Sidebar titlebar: macOS, fullscreen transitions, Web/Windows, 3 window sizes, expanded/compact/animation controls and footer bounds')
} finally {
  await browser.close()
}
