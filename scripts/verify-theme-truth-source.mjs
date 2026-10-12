/**
 * 主题真源回归（P0-1）：宿主 data-ds-dark-theme × 系统 prefers-color-scheme 四组合。
 * 断言侧栏背景只跟随宿主属性——修复前宿主浅色 + 系统深色会把侧栏误判成暗色，
 * 造成侧栏/内容区明暗撕裂。同时探针 P0-3 补齐的 6 个令牌必须解析出值。
 *
 * 用法：node scripts/verify-theme-truth-source.mjs <webUrl>
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const profileRequire = createRequire(
  `${process.env.HOME}/.dsh/profiles/web/node_modules/playwright-core/index.js`,
)
const { chromium } = profileRequire('playwright-core')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const PATCHED_TOKENS = [
  '--dsw-alias-background-secondary',
  '--dsw-alias-border-subtle',
  '--dsw-alias-state-warning-primary',
  '--dsw-focus-ring-color',
  '--dsw-specific-input-major',
  '--dsw-specific-menu-item-hover',
]

const webUrl = process.argv[2]
if (!webUrl) throw new Error('usage: node scripts/verify-theme-truth-source.mjs <webUrl>')

const CASES = [
  { hostDark: false, systemDark: false, sidebar: 'rgb(240, 240, 240)', zai: 'theme-zai-light' },
  { hostDark: false, systemDark: true, sidebar: 'rgb(240, 240, 240)', zai: 'theme-zai-light' },
  { hostDark: true, systemDark: false, sidebar: 'rgb(22, 22, 22)', zai: 'theme-zai-dark' },
  { hostDark: true, systemDark: true, sidebar: 'rgb(22, 22, 22)', zai: 'theme-zai-dark' },
]

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(webUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await page.waitForSelector('.dcu-root', { timeout: 30_000 })
await page.waitForTimeout(3000)

for (const c of CASES) {
  const label = `host=${c.hostDark ? 'dark' : 'light'} system=${c.systemDark ? 'dark' : 'light'}`
  await page.emulateMedia({ colorScheme: c.systemDark ? 'dark' : 'light' })
  await page.evaluate(hostDark => {
    if (hostDark) document.body.setAttribute('data-ds-dark-theme', '')
    else document.body.removeAttribute('data-ds-dark-theme')
  }, c.hostDark)
  await page.waitForTimeout(700)
  const state = await page.evaluate(tokens => {
    const root = document.querySelector('.dcu-root')
    return {
      rootClass: document.documentElement.className,
      sidebarBg: getComputedStyle(root).backgroundColor,
      tokens: Object.fromEntries(
        tokens.map(t => [t, getComputedStyle(document.body).getPropertyValue(t).trim()]),
      ),
    }
  }, PATCHED_TOKENS)
  assert.equal(state.sidebarBg, c.sidebar, `${label}: 侧栏背景必须只跟随宿主属性（${c.sidebar}）`)
  assert.ok(state.rootClass.includes(c.zai), `${label}: 根节点 class 应含 ${c.zai}（实际 ${state.rootClass}）`)
  const opposite = c.zai === 'theme-zai-light' ? 'theme-zai-dark' : 'theme-zai-light'
  assert.ok(!state.rootClass.includes(opposite), `${label}: 根节点 class 不得含 ${opposite}`)
  for (const [name, value] of Object.entries(state.tokens)) {
    assert.notEqual(value, '', `${label}: 补齐令牌 ${name} 必须解析出值`)
  }
  console.log(`✓ ${label} → 侧栏 ${state.sidebarBg}，class=${c.zai}，6 个补齐令牌均有值`)
}

await browser.close()
console.log('✓ verify-theme-truth-source: 4/4 组合通过')
