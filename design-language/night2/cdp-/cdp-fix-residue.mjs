// 修复上夜采集残留：body.theme-zai-light（证据：上夜 cdp-summary.json themeState.bodyClasses="zcode-startup-ready"）
// 移除该单个类，验证 root/元素级读数回归一致，截图深色真实基线
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
// eslint 提示：writeFileSync 在下方直接使用

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c

const before = await evaluate(`(() => ({ htmlClass: document.documentElement.className, bodyClass: document.body.className }))()`)
const beforeRead = await evaluate(`(() => ({
  rootSidebar: getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar').trim(),
  rootFg: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground').trim(),
  asideColor: getComputedStyle(document.querySelector('aside')).color,
  rootDivBg: (() => { const d = document.querySelector('div.bg-background-alt, [class*="bg-background-alt"]'); return d ? getComputedStyle(d).backgroundColor : null })(),
}))()`)

await evaluate(`document.body.classList.remove('theme-zai-light'); document.body.className; `)
await sleep(450)
const after = await evaluate(`(() => ({ htmlClass: document.documentElement.className, bodyClass: document.body.className,
  rootSidebar: getComputedStyle(document.documentElement).getPropertyValue('--color-sidebar').trim(),
  rootFg: getComputedStyle(document.documentElement).getPropertyValue('--color-foreground').trim(),
  asideColor: getComputedStyle(document.querySelector('aside')).color,
  rootDivBg: (() => { const d = document.querySelector('[class*="bg-background-alt"]'); return d ? getComputedStyle(d).backgroundColor : null })(),
}))()`)

const shot = await send('Page.captureScreenshot', { format: 'png' }, S)
writeFileSync(join(OUT, 'cdp-shot-dark-true-baseline.png'), Buffer.from(shot.data, 'base64'))

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url,
  rationale: 'body.theme-zai-light 为上夜 cdp-capture.mjs 还原 bug 残留（上夜 summary: themeState.bodyClasses="zcode-startup-ready", restoredToOriginalTheme:false）；变量就近解析使元素级被压成浅色。移除该类恢复用户真实深色态。',
  before, beforeRead, after,
  consistentNow: after.rootSidebar.startsWith('#161616') && /0\.87/.test(after.asideColor) }
writeFileSync(join(OUT, 'cdp-fix-residue.json'), JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 1))
c.ws.close()
