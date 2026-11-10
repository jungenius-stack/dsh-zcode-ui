/**
 * 流式推流场景下插件的真实增量成本。
 *
 * ## 为什么与 css-real 分开测
 *
 * `perf-plugin-css-real.mjs` 量的是**全树失效**（主题切换、侧栏开合）——那种操作
 * 才让 2 万节点全部重新匹配，成本约 26ms。
 *
 * 但用户报的是「长会话 + 子代理推流时输入卡」。推流是**增量**失效：只新增一个
 * 消息节点，Blink 只失效该子树。这两种场景的成本结构完全不同，不能互相代入。
 *
 * 本脚本模拟真实推流：往消息流里追加节点，量 RecalcStyle + Layout + Script 增量。
 *
 * 用法：node scripts/perf-plugin-stream.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const files = readdirSync('src/client').filter(f => /\.(ts|tsx)$/.test(f))
const blocks = []
for (const f of files) {
  const src = readFileSync('src/client/' + f, 'utf8')
  for (const m of src.matchAll(/`([\s\S]*?)`/g)) blocks.push(m[1].replace(/\$\{[^}]*\}/g, '0'))
}

const b = await chromium.launch({ headless: true })

async function run(withPluginCss) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Performance.enable')
  await p.setContent('<!doctype html><html><body></body></html>')
  const nodes = await p.evaluate(() => {
    document.documentElement.setAttribute('data-platform', 'darwin')
    document.body.setAttribute('data-ds-dark-theme', '')
    const sidebar = document.createElement('div')
    sidebar.className = 'dcu-root'
    sidebar.innerHTML = '<div class="dcu-expanded-shell"><div class="dcu-workspaces">' +
      Array.from({ length: 30 }, () => '<div class="dcu-wb-session"><span class="dcu-wb-session-time">t</span></div>').join('') +
      '</div><div class="dcu-foot"></div></div>'
    document.body.appendChild(sidebar)
    const scroll = document.createElement('div')
    scroll.setAttribute('data-conversation-scroll', '')
    const session = document.createElement('div')
    session.setAttribute('data-slot', 'conversation.session')
    session.style.display = 'contents'
    scroll.appendChild(session)
    let cursor = session
    for (const n of ['viewArea','view','frame','root','inner','column']) {
      const d = document.createElement('div'); d.className = n; cursor.appendChild(d); cursor = d
    }
    const flow = document.createElement('div'); flow.className = 'chat-flow'; cursor.appendChild(flow)
    flow.id = 'flow'
    // 预置 500 条消息（真实长会话量级）
    for (let i = 0; i < 500; i++) {
      const node = document.createElement('div'); node.className = 'chat-node'
      const msg = document.createElement('div'); msg.className = 'msg'
      for (let k = 0; k < 20; k++) msg.appendChild(document.createElement('span'))
      node.appendChild(msg); flow.appendChild(node)
      for (let k = 0; k < 30; k++) node.appendChild(document.createElement('span'))
    }
    document.body.appendChild(scroll)
    return document.getElementsByTagName('*').length
  })

  if (withPluginCss) {
    await p.evaluate((list) => {
      for (const body of list) {
        const s = document.createElement('style')
        s.textContent = body
        document.head.appendChild(s)
        if (!s.sheet || s.sheet.cssRules.length === 0) s.remove()
      }
    }, blocks)
  }

  const metric = async (name) => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    return metrics.find(m => m.name === name)?.value ?? 0
  }

  // 预热
  await p.evaluate(() => { for (let i = 0; i < 10; i++) { const n = document.createElement('div'); document.getElementById('flow').appendChild(n); getComputedStyle(n).color } })
  await p.evaluate(() => { document.getElementById('flow').innerHTML = '' })

  const before = { recalc: await metric('RecalcStyleDuration'), layout: await metric('LayoutDuration'), script: await metric('ScriptDuration') }
  const APPENDS = 200
  await p.evaluate((N) => {
    const flow = document.getElementById('flow')
    for (let i = 0; i < N; i++) {
      const node = document.createElement('div'); node.className = 'chat-node'
      const msg = document.createElement('div'); msg.className = 'msg'
      msg.textContent = 'streaming token ' + i
      node.appendChild(msg)
      flow.appendChild(node)
      getComputedStyle(node).color   // 逼出重算（等价于宿主读取布局）
    }
  }, APPENDS)
  const after = { recalc: await metric('RecalcStyleDuration'), layout: await metric('LayoutDuration'), script: await metric('ScriptDuration') }

  await p.close()
  return {
    nodes,
    recalc: (after.recalc - before.recalc) * 1000 / APPENDS,
    layout: (after.layout - before.layout) * 1000 / APPENDS,
    script: (after.script - before.script) * 1000 / APPENDS,
  }
}

const plain = await run(false)
const withCss = await run(true)
await b.close()

console.log(`DOM ${plain.nodes} 节点（500 条消息 + 侧栏），追加 200 次，每次 ms:`)
console.log('')
console.log('                        无插件CSS    有插件CSS     差值')
console.log(`  RecalcStyle           ${plain.recalc.toFixed(3).padStart(9)}   ${withCss.recalc.toFixed(3).padStart(9)}   ${(withCss.recalc - plain.recalc).toFixed(3)}`)
console.log(`  Layout                ${plain.layout.toFixed(3).padStart(9)}   ${withCss.layout.toFixed(3).padStart(9)}   ${(withCss.layout - plain.layout).toFixed(3)}`)
console.log(`  Script                ${plain.script.toFixed(3).padStart(9)}   ${withCss.script.toFixed(3).padStart(9)}   ${(withCss.script - plain.script).toFixed(3)}`)
console.log('')
const totalPlain = plain.recalc + plain.layout
const totalCss = withCss.recalc + withCss.layout
console.log(`  样式+布局合计         ${totalPlain.toFixed(3).padStart(9)}   ${totalCss.toFixed(3).padStart(9)}   ${(totalCss - totalPlain).toFixed(3)}`)
console.log(`  插件占比              ${totalCss > 0 ? ((totalCss - totalPlain) / totalCss * 100).toFixed(1) : 0}%`)
