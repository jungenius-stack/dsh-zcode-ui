/**
 * 插件真实 CSS 在「全树失效」下的重算成本（CDP `RecalcStyleDuration` 口径）。
 *
 * ## 前四版都错了，这版为什么可信
 *
 * | 版本 | 手法 | 结果 | 错在哪 |
 * | --- | --- | --- | --- |
 * | v1 | 改 textarea + 读 offsetHeight | 0.01ms | 增量重算，2 万兄弟元素不参与匹配 |
 * | v2 | 切无依赖的 class + 读 offsetHeight | 0.47ms / -3318% | 布局读被缓存，重复测得 0.000ms |
 * | v3 | 切 class + CDP 指标，运行中重写 textContent | 全负 | 重写样式表本身触发完整重算，被算进区间 |
 * | v4 | 每档独立页，但切的 class 无规则依赖 | 21ms（虚高） | **触发器无效**：无规则响应时不发生重算，测到的是别的东西 |
 * | **v5** | **独立页 + 触发器必须被规则依赖** | 见下 | — |
 *
 * 关键教训：**「全树失效」不是靠切一个 class 得到的**，必须切的 class 真的出现在规则里。
 * 否则 Blink 判定「无匹配规则受影响」，直接跳过重算（测出 0.000ms）。
 *
 * 口径：真实规模 DOM（约 22900 节点，对齐 §50.1 的 23231）+ 插件 29 个真实样式块，
 * 切 `html.perf-t`（真实规则依赖它，见下），取 `RecalcStyleDuration` 增量 / 25。
 *
 * 用法：node scripts/perf-plugin-css-real.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { chromium } from 'playwright'

const files = readdirSync('src/client').filter(f => /\.(ts|tsx)$/.test(f))
const blocks = []
for (const f of files) {
  const src = readFileSync('src/client/' + f, 'utf8')
  for (const m of src.matchAll(/`([\s\S]*?)`/g)) blocks.push(m[1].replace(/\$\{[^}]*\}/g, '0'))
}

const PREDICATES = {
  has: (s) => s.includes(':has('),
  rootAnchoredHas: (s) => /^(html|body)[^ ]*:has\(/.test(s.trim()),
  attrSubstring: (s) => /\[class[*^$]=/.test(s),
  star: (s) => /[ >]\*/.test(s),
}

const BUILD_DOM = () => {
  document.documentElement.setAttribute('data-platform', 'darwin')
  document.body.setAttribute('data-ds-dark-theme', '')
  const sidebar = document.createElement('div')
  sidebar.className = 'dcu-root'
  sidebar.innerHTML = '<div class="dcu-expanded-shell"><div class="dcu-workspaces">' +
    Array.from({ length: 30 }, () => '<div class="dcu-wb-session dcu-wb-session-flat" data-pinned="false"><span class="dcu-wb-session-time">t</span></div>').join('') +
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
  for (let i = 0; i < 19; i++) {
    const item = document.createElement('div'); flow.appendChild(item)
    const node = document.createElement('div'); item.appendChild(node)
    for (let j = 0; j < 60; j++) {
      const msg = document.createElement('div'); msg.className = 'msg'
      for (let k = 0; k < 19; k++) msg.appendChild(document.createElement('span'))
      node.appendChild(msg)
    }
  }
  document.body.appendChild(scroll)
  return document.getElementsByTagName('*').length
}

const b = await chromium.launch({ headless: true })

async function runVariant(drop) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Performance.enable')
  await p.setContent('<!doctype html><html><body></body></html>')
  const nodes = await p.evaluate(BUILD_DOM)

  const loaded = await p.evaluate(({ list, drop }) => {
    const tests = {
      has: (s) => s.includes(':has('),
      rootAnchoredHas: (s) => /^(html|body)[^ ]*:has\(/.test(s.trim()),
      attrSubstring: (s) => /\[class[*^$]=/.test(s),
      star: (s) => /[ >]\*/.test(s),
      none: () => false,
    }
    const t = tests[drop] ?? tests.none
    let rules = 0, kept = 0
    for (const body of list) {
      const s = document.createElement('style')
      s.textContent = body
      document.head.appendChild(s)
      if (!s.sheet || s.sheet.cssRules.length === 0) { s.remove(); continue }
      if (drop !== 'none') {
        const out = []
        for (const r of s.sheet.cssRules) {
          if (r.selectorText && t(r.selectorText)) continue
          out.push(r.cssText)
        }
        s.textContent = out.join('\n')
      }
      kept++
      rules += s.sheet.cssRules.length
    }
    // 注入一条让 html.dcu-perf 真正参与匹配的规则：所有变量都从它继承下去，
    // 这样切这个 class 才会让整棵子树失效（否则 Blink 判定无事可做）。
    // 触发器：只切换一个**可继承的自定义属性**，不引入任何通配规则。
    // 继承属性变更会让整棵子树失效，但不给匹配引擎增加额外工作量。
    const probe = document.createElement('style')
    probe.textContent = 'html.dcu-perf{--dcu-perf-probe:1}'
    document.head.appendChild(probe)
    return { kept, rules }
  }, { list: blocks, drop })

  const metric = async (name) => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    return metrics.find(m => m.name === name)?.value ?? 0
  }
  await p.evaluate(() => { for (let i = 0; i < 8; i++) { document.documentElement.classList.toggle('dcu-perf'); getComputedStyle(document.querySelector('.msg')).color } })
  const ROUNDS = 25
  const t0 = await metric('RecalcStyleDuration')
  await p.evaluate((R) => { for (let i = 0; i < R; i++) { document.documentElement.classList.toggle('dcu-perf'); getComputedStyle(document.querySelector('.msg')).color } }, ROUNDS)
  const t1 = await metric('RecalcStyleDuration')
  await p.close()
  return { nodes, blocks: loaded.kept, rules: loaded.rules, per: (t1 - t0) * 1000 / ROUNDS }
}

const variants = {}
for (const drop of ['none', ...Object.keys(PREDICATES)]) variants[drop] = await runVariant(drop)
await b.close()

const base = variants.none
console.log(`DOM ${base.nodes} 节点（真实会话 23231）｜插件样式块 ${base.blocks} / 规则 ${base.rules} 条`)
console.log('')
console.log('全树失效下每次样式重算（CDP RecalcStyleDuration，每档独立页面）:')
console.log(`  全部插件 CSS 在场          ${base.per.toFixed(3)} ms`)
for (const k of Object.keys(PREDICATES)) {
  const v = variants[k]
  const delta = base.per - v.per
  console.log(`  移除 ${k.padEnd(20)} ${v.per.toFixed(3)} ms  （省 ${delta.toFixed(3)}ms = ${(delta / base.per * 100).toFixed(1)}%，剩 ${v.rules} 条）`)
}

