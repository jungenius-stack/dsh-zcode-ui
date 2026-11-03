// 最终状态验证：主题类/视图/滚动位/探针残留 + 终态截图
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, page } = c

const v = await evaluate(`(() => ({
  htmlClass: document.documentElement.className,
  bodyClass: document.body.className,
  bodyDarkAttr: document.body.hasAttribute('data-ds-dark-theme'),
  mainPresent: !!document.querySelector('main'),
  mainText: (document.querySelector('main')?.textContent||'').replace(/\\s+/g,' ').trim().slice(0,30),
  chatScrollTop: (() => { const ch = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return ch ? Math.round(ch.scrollTop) : null })(),
  probeVarsLeft: Object.keys(window).filter(k => k.startsWith('__tt') || k === '__clicks' || k === '__rootClick'),
  preCount: document.querySelectorAll('pre').length,
  tooltipOpen: document.querySelectorAll('[role="tooltip"]').length,
  railPresent: !!([...document.querySelectorAll('nav')].find(n => (n.className||'').includes('w-12'))),
}))()`)
const shot = await send('Page.captureScreenshot', { format: 'png' }, S)
writeFileSync(join(OUT, 'cdp-shot-final-state.png'), Buffer.from(shot.data, 'base64'))
v.capturedAt = new Date().toISOString()
v.pageUrl = page.url
v.expectedHtmlClass = 'platform-mac-desktop dark theme-zai-dark'
v.expectedBodyClass = 'zcode-startup-ready'
v.htmlClassOk = v.htmlClass === v.expectedHtmlClass
v.bodyClassOk = v.bodyClass === v.expectedBodyClass
writeFileSync(join(OUT, 'cdp-final-verify.json'), JSON.stringify(v, null, 2))
console.log(JSON.stringify(v, null, 1))
c.ws.close()
