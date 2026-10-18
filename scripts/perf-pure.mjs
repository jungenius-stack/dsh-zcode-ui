/**
 * 纯页面内计时：不经过 CDP 评估，避免测量开销污染被测对象。
 *
 * ## 为什么重写
 *
 * 上一版 profiler 里 top 函数是 `previewNode` / `query` / `oneLine` / `evaluate`——
 * 全是 **Playwright 的测试侧代码**，不是产品代码。也就是说那轮测量的
 * 主要成本来自我自己的探针，被测对象被淹没在噪声里。
 *
 * 这一版把所有计时放进页面内（requestAnimationFrame + performance.now），
 * 只把**结果数字**取出，不取中间过程。
 *
 * 用法：node scripts/perf-pure.mjs
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
      + `<span class="dcu-wb-session-copy"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">会话 ${i}</span></span></span>`
      + `<span class="dcu-wb-session-time">12:00</span><button class="dcu-wb-pin"></button></div>`
  }
  return `<div class="dcu-wb"><div class="dcu-wb-section"><div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true"><span>工作区</span></button></div>`
    + `<div class="dcu-wb-section-body" data-open="true"><div><div class="dcu-wb-ungrouped">`
    + `<div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">p</span></div>${rows}</div></div></div></div></div>`
}
const msgs = n => { let h=''; for(let i=0;i<n;i++) h+=`<div class="msg"><p>第 ${i} 条：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里。</p></div>`; return h }

const b = await chromium.launch({ headless: true })
console.log('会话数 线程条数 插件  "打字"20次中位ms  侧栏重排ms')
for (const sessions of [300, 2000]) {
  for (const withCss of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
      #side{width:260px;float:left;height:100vh;overflow:hidden}
      #thread{height:65vh;overflow-y:auto}#ed{width:100%;height:90px;border:1px solid #ccc}
      #thread p{margin:0 0 6px;line-height:1.6}</style>
      <div id="side"><aside class="dcu-root"><div class="dcu-expanded-shell"><div class="dcu-workspaces">${tree(sessions)}</div></div></aside></div>
      <div id="thread">${msgs(600)}</div><div id="ed" contenteditable="true"></div>`)
    await p.addStyleTag({ content: fixtureTokenStyle('light') })
    if (withCss) { await p.addStyleTag({ content: theme }); await p.addStyleTag({ content: skin }); await p.addStyleTag({ content: wbLayers }) }
    await p.waitForTimeout(300)

    const r = await p.evaluate(async () => {
      const ed = document.getElementById('ed')
      const side = document.getElementById('side')
      ed.focus()
      // 打字：文本变更 + 强制结算（页面内计时，无 CDP 开销）
      const t = []
      for (let i = 0; i < 20; i++) {
        const t0 = performance.now()
        ed.textContent = '输入内容'.repeat(i % 4 + 1)
        void ed.getBoundingClientRect()
        t.push(performance.now() - t0)
      }
      t.sort((a, b) => a - b)
      // 侧栏整体重排：翻转一个类，强制整棵侧栏树重新布局
      const t0 = performance.now()
      side.style.width = side.offsetWidth === 260 ? '200px' : '260px'
      void document.body.offsetHeight
      const relayout = performance.now() - t0
      return { median: t[Math.floor(t.length / 2)], relayout, nodes: document.querySelectorAll('*').length }
    })
    console.log([String(sessions).padEnd(7), String(600).padEnd(9), (withCss ? 'on' : 'off').padEnd(5),
      r.median.toFixed(2).padEnd(17), r.relayout.toFixed(2)].join(''))
    await p.close()
  }
}
await b.close()
