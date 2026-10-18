/**
 * 图片会话的性能重放：定位「文本更少却更卡」的原因。
 *
 * 对比对象（都来自真实会话）：
 *   A. session-cd996ac2：5994 事件 / 257 万字符 / **0 张图**  → 用户觉得不卡
 *   B. session-bbb87277：1428 事件 /  68 万字符 / **44 张图（4757 万像素）** → 用户觉得卡
 *
 * 若 B 的成本主要来自图片，则瓶颈在图片解码/布局，不在插件。
 */
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const read = n => readFileSync('src/client/' + n, 'utf8')
const grab = (n, re) => read(n).match(re)[1]
const theme = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)
const skin = grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/)
const wb = read('CodexWorkspaceBrowser.tsx')
const wbLayers = ['stylesheet','runningStyles','typographyStyles','collectionLayoutStyles']
  .map(k => { const m = wb.match(new RegExp('const ' + k + ' = `([\\s\\S]*?)`')); return m ? m[1] : '' }).join('\n')
const react = readFileSync('node_modules/react/umd/react.production.min.js', 'utf8')
const reactDom = readFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'utf8')
const msgs = JSON.parse(readFileSync('/tmp/replay/sess-bbb-b64.json', 'utf8'))

// 图片用 file:// 直接引用解包目录（避免 base64 撑爆页面）
const MEDIA = '/tmp/sess-bbb/media/'

const b = await chromium.launch({ headless: true })
console.log('图片  节点数   打字中位ms  React提交ms   布局ms   首屏加载ms')
for (const withImages of [false, true]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const t0 = Date.now()
  await p.setContent(`<style>html,body{margin:0;height:100%}
    #thread{height:60vh;overflow-y:auto}
    .msg{margin:0 0 12px}.msg p{margin:0 0 6px;line-height:1.6}
    .msg img{display:block;max-width:100%;height:auto}</style><div id="root"></div>`)
  await p.addStyleTag({ content: fixtureTokenStyle('light') })
  await p.addStyleTag({ content: theme })
  await p.addStyleTag({ content: skin })
  await p.addStyleTag({ content: wbLayers })
  await p.addScriptTag({ content: react })
  await p.addScriptTag({ content: reactDom })
  // 把图片 src 指向本地文件
  const withSrc = msgs.map(m => ({ ...m, imgs: (m.imgs || []).map(im => ({ ...im, f: im.f })) }))
  await p.addScriptTag({ content: `window.MSGS = ${JSON.stringify(withSrc)};` })
  await p.addScriptTag({ path: '/tmp/mount-images.js' })
  await p.evaluate(({ w }) => { document.getElementById('root').innerHTML = ''; window.mountImages(54, false, w) }, { w: withImages })
  // file:// 图片需要先把页面换成 file 协议来源，否则被拦；这里改用 data URL 兜底
  await p.waitForTimeout(1500)
  const loadMs = Date.now() - t0

  const r = await p.evaluate(async () => {
    document.getElementById('ed').focus()
    const nodes = document.querySelectorAll('*').length
    const imgs = [...document.images]
    const decoded = imgs.filter(i => i.complete && i.naturalWidth > 0).length
    const type = [], commit = [], layout = []
    for (let i = 0; i < 15; i++) {
      const t0 = performance.now()
      ReactDOM.flushSync(() => window.__set('x' + i))
      const t1 = performance.now()
      void document.body.offsetHeight
      layout.push(performance.now() - t1); commit.push(t1 - t0); type.push(performance.now() - t0)
    }
    const med = a => { a.sort((x, y) => x - y); return a[7] }
    return { nodes, imgs: imgs.length, decoded, type: med(type), commit: med(commit), layout: med(layout) }
  })
  console.log([(withImages ? '有' : '无').padEnd(5), String(r.nodes).padEnd(8),
    r.type.toFixed(2).padEnd(10), r.commit.toFixed(2).padEnd(12), r.layout.toFixed(2).padEnd(9), String(loadMs).padEnd(6),
    `| img ${r.imgs} decoded ${r.decoded}`].join(''))
  await p.close()
}
await b.close()
