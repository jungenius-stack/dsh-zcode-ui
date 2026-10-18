/**
 * 用**真实会话数据**重放并测量交互成本。
 *
 * ## 为什么必须用真实数据
 *
 * 前六轮用合成段落测，全部读数为 0。但真实会话是：
 *   2113 条消息 / 257 万字符 / 1167 次工具调用 / 单块最大 45K 字符
 * 合成数据既没有这个量级，也没有「超长代码块 + 预格式化文本」这类
 * 让浏览器排版成本陡增的结构。
 *
 * 用法：node scripts/perf-replay.mjs [messages.json]
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

const msgs = JSON.parse(readFileSync(process.argv[2] ?? '/tmp/replay/messages.json', 'utf8'))
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 按真实结构渲染：助手消息含推理块（折叠态）+ 正文；工具结果用 <pre>。 */
const render = () => msgs.map((m, i) => {
  if (m.r === 'tool') return `<div class="msg tool"><div class="hdr">工具结果 ${i}</div><pre>${esc(m.t)}</pre></div>`
  return `<div class="msg assistant"><div class="hdr">助手 ${i}</div><div class="reasoning"><span>推理过程</span></div><div class="body">${esc(m.t).replace(/\n\n/g, '</p><p>')}</div></div>`
}).join('')

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

const html = render()
const b = await chromium.launch({ headless: true })
console.log('场景                    插件  节点数   打字中位ms  按键中位ms  滚帧ms')
for (const sessions of [0, 300]) {
  for (const withCss of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
    await p.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
      #side{width:260px;float:left;height:100vh;overflow:hidden}
      #thread{height:65vh;overflow-y:auto;padding:8px}
      #thread .msg{margin:0 0 12px}#thread .hdr{font-size:12px;color:#888}
      #thread pre{background:#f6f6f6;padding:8px;overflow-x:auto;font-size:12px}
      #thread p{margin:0 0 6px;line-height:1.6}
      #ed{width:100%;height:90px;border:1px solid #ccc}</style>
      <div id="side"><aside class="dcu-root"><div class="dcu-expanded-shell"><div class="dcu-workspaces">${tree(sessions)}</div></div></aside></div>
      <div id="thread">${html}</div><div id="ed" contenteditable="true"></div>`)
    await p.addStyleTag({ content: fixtureTokenStyle('light') })
    if (withCss) { await p.addStyleTag({ content: theme }); await p.addStyleTag({ content: skin }); await p.addStyleTag({ content: wbLayers }) }
    await p.waitForTimeout(500)

    const r = await p.evaluate(async () => {
      const ed = document.getElementById('ed')
      const thread = document.getElementById('thread')
      const nodes = document.querySelectorAll('*').length
      // 打字：改内容 + 强制结算（页面内计时）
      ed.focus()
      const t = []
      for (let i = 0; i < 20; i++) {
        const t0 = performance.now()
        ed.textContent = '输入内容'.repeat(i % 4 + 1)
        void ed.getBoundingClientRect()
        t.push(performance.now() - t0)
      }
      t.sort((a, b) => a - b)
      // 按键：改一个属性并强制重算样式（模拟 UI 状态切换）
      const k = []
      for (let i = 0; i < 20; i++) {
        const t0 = performance.now()
        document.body.classList.toggle('probe')
        void document.body.offsetHeight
        k.push(performance.now() - t0)
      }
      k.sort((a, b) => a - b)
      // 滚动一帧
      const s0 = performance.now()
      thread.scrollTop += 500
      void thread.scrollHeight
      const s1 = performance.now() - s0
      return { nodes, type: t[10], key: k[10], scroll: s1 }
    })
    console.log([
      String(sessions === 0 ? '纯会话(无侧栏)' : '会话+300侧栏').padEnd(24),
      (withCss ? 'on' : 'off').padEnd(5),
      String(r.nodes).padEnd(8),
      r.type.toFixed(2).padEnd(11),
      r.key.toFixed(2).padEnd(11),
      r.scroll.toFixed(2),
    ].join(''))
    await p.close()
  }
}
await b.close()
