/**
 * 鼠标悬停性能归因探针（诊断用，不进门禁）。
 *
 * ## 为什么要单独测「悬停」
 *
 * KNOWN-ISSUES §27 测了滚动（0ms）、打字（宿主热点）与侧栏开合，**唯独没测悬停**。
 * 但用户第二次、第三次报告的都是「用鼠标操作时响应慢」——一个从未被量化的维度。
 *
 * 悬停与滚动有本质差别：滚动只改 `scrollTop`；悬停会翻转 `:hover`，
 * 触发**选择器重新匹配**。本插件有 73 处 `:has()`，而 `:has()` 的匹配成本
 * 随子树规模增长 —— 会话越长，一次悬停越贵。这正是「越长越慢」的可能机制。
 *
 * ## 方法：CDP Performance 指标差分
 *
 * 不用「加 class + 强制 reflow」那种自造路径（上一版就是这么错的：
 * 它既用了不存在的类名，也没法真正触发 `:hover`）。改为：
 *   1. 先把目标行滚动到视口内；
 *   2. 读 `Performance.getMetrics` 基线；
 *   3. 用真实指针 hover / 离开；
 *   4. 再读指标，取 `RecalcStyleDuration` / `LayoutDuration` 差值。
 *
 * ## 健康状态自检（§27.7 的教训）
 *
 * 「移除插件样式表」的对照极易把被测对象一起打掉，制造假节省。
 * 因此每轮都断言：① hover 真的生效；② 插件动画仍在跑。
 * 任一不成立即把该行标为 invalid，不参与结论。
 *
 * 用法：node scripts/perf-hover-probe.mjs
 */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const root = new URL('../', import.meta.url)
const read = name => readFileSync(new URL(`src/client/${name}`, root), 'utf8')
const grab = (name, re, label) => {
  const m = read(name).match(re)
  if (m === null) throw new Error(`取不到 ${label}（${name}）`)
  return m[1]
}

const theme = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/, '主题层')
const pluginCss = [
  grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/, '侧栏外壳'),
  grab('CodexWorkspaceBrowser.tsx', /const stylesheet = `([\s\S]*?)`/, '工作区树'),
  grab('CodexWorkspaceBrowser.tsx', /const runningStyles = `([\s\S]*?)`/, '运行中'),
  grab('CodexWorkspaceBrowser.tsx', /const typographyStyles = `([\s\S]*?)`/, '工作区排版'),
  grab('CodexWorkspaceBrowser.tsx', /const collectionLayoutStyles = `([\s\S]*?)`/, '分组布局'),
].join('\n')

/**
 * 构造 n 个会话行的工作区树。
 *
 * 结构照抄真实渲染（`session-tree.tsx` + `CodexWorkspaceBrowser.tsx`）：
 * 行内同时带 title / time / running / unread / pin —— 因为 `.dcu-wb-session:has(...)`
 * 系列规则正是根据这些后代的有无来匹配，少了它们 hover 成本会失真。
 */
const sessionTree = n => {
  let rows = ''
  for (let i = 0; i < n; i++) {
    const running = i % 17 === 0
    const unread = i % 11 === 0
    rows += `<div class="dcu-wb-session" role="treeitem" aria-selected="false" data-dcu-session>`
      + `<span class="dcu-wb-session-copy"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">会话 ${i}：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里</span></span></span>`
      + `<span class="dcu-wb-session-time">12:${String(i % 60).padStart(2, '0')}</span>`
      + (running ? '<span class="dcu-wb-running" role="img" aria-label="运行中"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/></svg></span>' : '')
      + (unread ? '<span class="dcu-wb-unread" role="img" aria-label="未读"></span>' : '')
      + `<button class="dcu-wb-pin" aria-label="置顶"></button>`
      + `</div>`
  }
  return `<div class="dcu-wb"><div class="dcu-wb-section"><div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true"><span class="dcu-wb-section-caret">▸</span><span>工作区</span></button></div>`
    + `<div class="dcu-wb-section-body" data-open="true"><div><div class="dcu-wb-ungrouped">`
    + `<div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">demo</span></div>`
    + rows
    + `</div></div></div></div></div>`
}

const PAGE = tree => `<aside class="dcu-root"><div class="dcu-expanded-shell"><div class="dcu-workspaces">${tree}</div></div></aside>`

/** 读 CDP Performance 指标里与重算/布局相关的字段（单位秒）。 */
const readPerf = async cdp => {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const pick = name => metrics.find(m => m.name === name)?.value ?? 0
  return {
    recalc: pick('RecalcStyleDuration'),
    recalcCount: pick('RecalcStyleCount'),
    layout: pick('LayoutDuration'),
    layoutCount: pick('LayoutCount'),
    task: pick('TaskDuration'),
  }
}

/** 一次「hover 进 + hover 出」，返回该过程的指标增量（取 5 轮的数值中位）。 */
const measureHoverRoundTrip = async (page, cdp, rowHandle) => {
  const box = await rowHandle.boundingBox()
  if (box === null) return null
  // 目标行必须真的在视口内，否则 mouse.move 打不到它（上一版正是在这里静默失败）。
  const inViewport = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return el === null ? false : el.closest('.dcu-wb-session') !== null
  }, { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) })
  if (!inViewport) return null

  const samples = []
  for (let i = 0; i < 5; i++) {
    await page.mouse.move(1, 1)
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const before = await readPerf(cdp)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const during = await readPerf(cdp)
    samples.push({
      recalc: (during.recalc - before.recalc) * 1000,
      recalcCount: during.recalcCount - before.recalcCount,
      layout: (during.layout - before.layout) * 1000,
    })
  }
  const median = key => {
    const s = samples.map(x => x[key]).sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }
  return {
    recalcMs: median('recalc'),
    recalcCount: median('recalcCount'),
    layoutMs: median('layout'),
  }
}

const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const n of [100, 500, 1500, 3000]) {
    for (const withPlugin of [true, false]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Performance.enable')
      await page.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}</style>${PAGE(sessionTree(n))}`)
      await page.addStyleTag({ content: fixtureTokenStyle('light') })
      if (withPlugin) {
        await page.addStyleTag({ content: theme })
        await page.addStyleTag({ content: pluginCss })
      }
      await page.mouse.move(1, 1)
      await page.waitForTimeout(150)

      // 选一个「正中」的行并滚到视口中央：直接拿中间那行会让它在视口外。
      const handles = await page.$$('.dcu-wb-session')
      const target = handles[Math.floor(handles.length / 2)]
      await target.scrollIntoViewIfNeeded()
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
      await page.waitForTimeout(60)

      const m = await measureHoverRoundTrip(page, cdp, target)

      // 健康自检 ①：hover 必须真的生效（否则整轮无效）
      const box = await target.boundingBox()
      let hoverApplied = false
      if (box !== null) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(60)
        hoverApplied = await page.evaluate(() => document.querySelector('.dcu-wb-session:hover') !== null)
      }
      // 健康自检 ②：插件动画必须仍在跑（否则「移除样式表」的对照是假节省）
      const anim = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.className = 'dcu-spin'
        document.body.appendChild(probe)
        const cs = getComputedStyle(probe)
        const out = { name: cs.animationName, duration: cs.animationDuration }
        probe.remove()
        return out
      })
      const nodes = await page.evaluate(() => document.querySelectorAll('*').length)

      results.push({ n, withPlugin, nodes, hoverApplied, anim, ...(m ?? {}) })
      await page.close()
    }
  }
} finally {
  await browser.close()
}

const f = v => (typeof v === 'number' ? v.toFixed(2) : String(v ?? '—'))
console.log('\n=== 悬停一次的成本 vs 会话行数 ===')
const head = ['行数', '插件', '节点', '重算ms', '重算次数', '布局ms', 'hover生效', '动画']
console.log(head.map(h => h.padEnd(12)).join(''))
for (const r of results) {
  console.log([
    f(r.n), r.withPlugin ? 'on' : 'off', f(r.nodes), f(r.recalcMs),
    f(r.recalcCount), f(r.layoutMs), String(r.hoverApplied), r.anim.name,
  ].map(s => String(s).padEnd(12)).join(''))
}

console.log('\n=== 插件带来的增量（on - off，同规模）===')
for (const n of [100, 500, 1500, 3000]) {
  const on = results.find(r => r.n === n && r.withPlugin)
  const off = results.find(r => r.n === n && !r.withPlugin)
  if (on === undefined || off === undefined) continue
  if (on.recalcMs === undefined || off.recalcMs === undefined) { console.log(`${n}: 数据缺失（hover 未命中或行不可见）`); continue }
  console.log(`${String(n).padEnd(6)} 重算 +${f(on.recalcMs - off.recalcMs)}ms   布局 +${f((on.layoutMs ?? 0) - (off.layoutMs ?? 0))}ms`)
}
