/**
 * 用 CDP CPU Profiler 抓「打字 + 按键」期间的 JS 热点。
 *
 * ## 为什么必须用 profiler
 *
 * 前几轮 I0 都栽在「靠推测定位」：测了悬停(0.36ms)、:has()(0.4ms)、
 * 强制布局(0.6ms)、样式重算(0.1ms)——全部可忽略。说明瓶颈在 **JS 执行**，
 * 而 JS 热点只能靠采样器抓，不能靠猜。
 *
 * ## 判据
 *
 * 抓 top-N 自耗时函数。若插件函数占主导 → 插件问题；
 * 若宿主 / React 占主导 → 插件只能做「减少重渲染触发」。
 *
 * 用法：node scripts/perf-profiler.mjs
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const read = n => readFileSync('src/client/' + n, 'utf8')
const grab = (n, re) => read(n).match(re)[1]

const theme = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/)
const skin = grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/)
const wb = read('CodexWorkspaceBrowser.tsx')
const wbLayers = ['stylesheet', 'runningStyles', 'typographyStyles', 'collectionLayoutStyles']
  .map(k => { const m = wb.match(new RegExp('const ' + k + ' = `([\\s\\S]*?)`')); return m ? m[1] : '' }).join('\n')

const tree = n => {
  let rows = ''
  for (let i = 0; i < n; i++) {
    rows += `<div class="dcu-wb-session" data-dcu-session role="treeitem" aria-selected="false">`
      + `<span class="dcu-wb-session-copy"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">会话 ${i} 标题文本示例</span></span></span>`
      + `<span class="dcu-wb-session-time">12:00</span><button class="dcu-wb-pin"></button></div>`
  }
  return `<div class="dcu-wb"><div class="dcu-wb-section"><div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true"><span>工作区</span></button></div>`
    + `<div class="dcu-wb-section-body" data-open="true"><div><div class="dcu-wb-ungrouped">`
    + `<div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">p</span></div>${rows}`
    + `</div></div></div></div></div>`
}
const msgs = n => { let h=''; for(let i=0;i<n;i++) h+=`<div class="msg"><p>第 ${i} 条：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里，林夜把等离子步枪的瞄具压在眉骨上。</p></div>`; return h }

const b = await chromium.launch({ headless: true })
for (const sessions of [300, 2000]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
    #side{width:260px;float:left;height:100vh;overflow:hidden}
    #thread{height:65vh;overflow-y:auto}#ed{width:100%;height:90px;border:1px solid #ccc}
    #thread p{margin:0 0 6px;line-height:1.6}</style>
    <div id="side"><aside class="dcu-root"><div class="dcu-expanded-shell"><div class="dcu-workspaces">${tree(sessions)}</div></div></aside></div>
    <div id="thread">${msgs(600)}</div><div id="ed" contenteditable="true"></div>`)
  await p.addStyleTag({ content: fixtureTokenStyle('light') })
  await p.addStyleTag({ content: theme })
  await p.addStyleTag({ content: skin })
  await p.addStyleTag({ content: wbLayers })
  await p.waitForTimeout(300)

  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
  await cdp.send('Profiler.start')

  await p.click('#ed')
  // 模拟长会话下的真实操作：打字 + 切会话 + 悬停
  for (let i = 0; i < 40; i++) {
    await p.keyboard.type('测')
    if (i % 8 === 0) {
      const rows = await p.$$('.dcu-wb-session')
      if (rows.length) {
        const box = await rows[i % rows.length].boundingBox()
        if (box) await p.mouse.move(box.x + 20, box.y + 8)
      }
    }
  }
  const { profile } = await cdp.send('Profiler.stop')

  // 解析自耗时
  const byId = new Map(profile.nodes.map(n => [n.id, n]))
  const self = new Map()
  const dt = profile.timeDeltas ?? []
  const samples = profile.samples ?? []
  for (let i = 0; i < samples.length; i++) {
    const node = byId.get(samples[i])
    if (!node) continue
    const cf = node.callFrame
    const name = `${cf.functionName || '(anonymous)'} @ ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`
    self.set(name, (self.get(name) ?? 0) + (dt[i] ?? 0) / 1000)
  }
  const top = [...self.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 12)
  const total = [...self.values()].reduce((a, c) => a + c, 0)
  console.log(`\n=== 会话 ${sessions} 行 / 采样总时长 ${total.toFixed(0)}ms ===`)
  for (const [name, ms] of top) console.log(`  ${ms.toFixed(1).padStart(7)}ms  ${(ms / total * 100).toFixed(1).padStart(5)}%  ${name.slice(0, 96)}`)
  await p.close()
}
await b.close()
