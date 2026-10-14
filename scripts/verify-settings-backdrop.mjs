/** 真实浏览器回归：透明设置页下的会话分支不能自行恢复 visibility。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
const source = readFileSync(new URL('../src/client/settings-page-styles.ts', import.meta.url), 'utf8')
// ⚠️ 必须按**变量名**定位模板串，不能用 `indexOf('\`')`：
// 文件头的 JSDoc 注释里常出现反引号（标记 CSS 变量），裸切片会切到注释正文，
// 把 CSS 规则切碎——本仓 `tests/design-system.assert.ts` §13 一直在防这件事。
// 2026-10-14 实踩：给文件头补了含反引号的注释后，本脚本量到设置页宽 1264 ≠ 1280。
const matched = source.match(/(?:export )?const settingsPageStyles = `([\s\S]*?)`/)
assert.ok(matched, 'settings-page-styles.ts 的样式抽取失败（变量名被改时会失败）')
const styles = matched[1]
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent(`<html data-dsh-native-backdrop="mica"><body><style>${styles}</style><style>.dcu-wb-section-body{visibility:visible}</style><div class="dcu-root" style="transform:translateX(0);width:56px"><div id="sessions" inert><div class="dcu-wb-section-body"><button id="session">会话标题</button></div></div></div><div class="dcu-settings-page"><button id="back">返回应用</button></div></body></html>`)
  assert.equal(await page.locator('.dcu-settings-page').evaluate(node => node.getBoundingClientRect().width), await page.evaluate(() => window.innerWidth), '设置页挂在 body 时不得被收缩侧栏的 transform 包含块裁成窄轨')
  assert.equal(await page.locator('#session').evaluate(node => getComputedStyle(node).visibility), 'hidden')
  assert.equal(await page.locator('#back').isVisible(), true)
  await page.evaluate(() => {
    const portal = document.createElement('div')
    portal.id = 'external-portal'
    portal.inert = true
    portal.setAttribute('data-dcu-settings-isolated', '')
    portal.style.cssText = 'position:fixed;inset:0;z-index:99999;visibility:visible'
    portal.innerHTML = '<span style="visibility:visible">外部浮层</span>'
    document.body.append(portal)
  })
  assert.equal(await page.locator('#external-portal span').isVisible(), false, '设置页隔离的 body portal 后代不能穿透')
  await page.evaluate(() => { delete document.documentElement.dataset.dshNativeBackdrop })
  assert.equal(await page.locator('#external-portal span').isVisible(), false, '普通主题同样隔离外部 portal')
  await page.evaluate(() => { document.documentElement.dataset.dshNativeBackdrop = 'mica' })
  await page.locator('#external-portal').evaluate(node => { node.removeAttribute('data-dcu-settings-isolated'); node.inert = false })
  assert.equal(await page.locator('#external-portal span').isVisible(), true, '取消隔离后恢复 portal')
  await page.evaluate(() => { document.querySelector('.dcu-settings-page').remove(); document.querySelector('#sessions').inert = false })
  assert.equal(await page.locator('#session').isVisible(), true)
  await page.evaluate(() => { delete document.documentElement.dataset.dshNativeBackdrop })
  assert.equal(await page.locator('#session').isVisible(), true)
  console.log('设置透明背景隔离与退出恢复通过')
} finally { await browser.close() }
