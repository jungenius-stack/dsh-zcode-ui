/**
 * 侧栏开合「感知延迟」探针（诊断用，不进门禁）。
 *
 * ## 为什么现有门禁通过、用户还是觉得卡
 *
 * `verify-sidebar-transition.mjs` 断言的是「飞行帧流畅、轨道静止、带心连续」——
 * 它测的是**动画本身**。但用户感知的卡顿可能在**动画之前**：
 *
 * `beginSidebarMotion()` 的时序是（见 sidebar-width.ts 注释）：
 *   本帧切轨道 → `void frame.offsetWidth`（**同步付掉整页重排**）→ 下一帧才起跑动画
 *
 * 于是「点下去 → 看到第一帧变化」之间隔着一整次同步重排。3000 行 ~90ms、8000 行 ~432ms，
 * 这段时间界面是**冻住的**。动画随后跑得再顺，用户已经先感到卡了。
 *
 * ## 本探针量什么
 *
 * - `clickToFirstPaint`：从触发开合到**第一帧真正变化**的时长（用户感知延迟）
 * - `reflowBlock`：那次同步重排阻塞主线程的时长
 * - `animationFrames`：动画期间实际产生的中间帧数
 * - 自适应跳过是否生效
 *
 * 用法：node scripts/perf-sidebar-probe.mjs
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
const sidebarSkin = grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/, '侧栏外壳')

/** 中心列灌入 n 条消息：真实长对话的换行重排成本就来自这里。 */
const heavyCenter = (n) => {
  let html = ''
  for (let i = 0; i < n; i++) {
    html += `<div class="msg"><div class="msg-head">用户 ${i}</div>`
    for (let p = 0; p < 3; p++) {
      html += `<p>这是第 ${i} 条消息的第 ${p} 段：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里，林夜把等离子步枪的瞄具压在眉骨上，青色六边能量盾在身前展开成一层薄薄的界膜，右颊的疤痕在红光里像一条烧焦的线。这段文字需要足够长才能在中心列宽度变化时产生真实的换行重排成本。</p>`
    }
    html += `<pre><code>const shield${i} = deploy({ pattern: 'hex', charge: 0.${i % 10} })</code></pre></div>`
  }
  return html
}

/**
 * 测量一次开合的感知延迟。
 *
 * 做法：在侧栏 toggle 触发后，用 rAF 逐帧采样内容列的 transform，
 * 记录「第一次出现非零 transform」的时刻（= 动画真正起跑），
 * 以及触发时刻到该帧的间隔。
 */
const measureToggle = async (page, messages) => {
  return page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const center = document.getElementById('center')
    const tk = performance.now.bind(performance)

    // 触发：直接调用插件暴露的开合路径——切列宽（等价于用户点收起）
    const before = tk()
    const t0 = tk()
    let firstChange = null
    let frames = 0
    const samples = []

    // 与真实实现相同的操作序列：先写轨道（这一步同步重排），再挂 motion 标记
    frame.style.gridTemplateColumns = '56px minmax(0px,1fr) 0px'
    void frame.offsetWidth            // ← 同步付重排（真实实现也这么做）
    const afterReflow = tk()
    frame.setAttribute('data-dcu-sidebar-motion', 'collapse')
    center.style.transition = 'none'
    center.style.transform = 'translateX(92px)'
    void center.offsetWidth
    center.style.removeProperty('transition')
    center.style.transform = 'translateX(0px)'

    await new Promise(resolve => {
      const step = () => {
        const now = tk()
        const m = getComputedStyle(center).transform
        samples.push({ t: now - t0, transform: m })
        if (m !== 'none' && m !== 'matrix(1, 0, 0, 1, 0, 0)') {
          frames += 1
          if (firstChange === null) firstChange = now - t0
        }
        if (now - t0 < 400) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })

    return {
      reflowBlockMs: afterReflow - t0,
      clickToFirstChangeMs: firstChange,
      animationFrames: frames,
      totalMs: tk() - t0,
      skipped: firstChange === null,
    }
  })
}

const browser = await chromium.launch({ headless: true })
const rows = []
try {
  for (const messages of [10, 1200, 3000, 8000]) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
    await page.setContent(`<style>html,body{margin:0;height:100%;font-family:system-ui}
      .msg{margin:0 0 14px}.msg p{margin:0 0 6px;line-height:1.6}
      #frame{display:grid;grid-template-columns:240px minmax(0px,1fr) 0px;height:100vh}
      #center{min-width:0;overflow:hidden;transition:transform 180ms cubic-bezier(.4,0,.2,1)}
      #side{min-width:0;overflow:hidden}</style>
      <div id="frame"><div id="side"><aside class="dcu-root"><div class="dcu-expanded-shell">
        <header class="dcu-head"><button class="dcu-brand">brand</button></header>
      </div></aside></div><div id="center">${heavyCenter(messages)}</div><div></div></div>`)
    await page.addStyleTag({ content: fixtureTokenStyle('light') })
    await page.addStyleTag({ content: theme })
    await page.addStyleTag({ content: sidebarSkin })
    await page.waitForTimeout(200)
    const nodes = await page.evaluate(() => document.querySelectorAll('*').length)
    const r = await measureToggle(page, messages)
    rows.push({ messages, nodes, ...r })
    await page.close()
  }
} finally {
  await browser.close()
}

const f = v => (v === null || v === undefined ? '—' : Number(v).toFixed(1))
console.log('\n=== 侧栏收起：点下去到画面开始变化的延迟 ===')
console.log(['消息数', '节点', '同步重排阻塞ms', '点到首帧ms', '动画帧数', '自适应跳过'].map(s => s.padEnd(20)).join(''))
for (const r of rows) {
  console.log([
    String(r.messages), String(r.nodes), f(r.reflowBlockMs), f(r.clickToFirstChangeMs),
    String(r.animationFrames), r.skipped ? 'YES' : 'no',
  ].map(s => s.padEnd(20)).join(''))
}
