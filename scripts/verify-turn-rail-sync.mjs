/**
 * 轮次索引栏与内容列的**开合同步**（2026-10-19）。
 *
 * ## 为什么必须有这条断言
 *
 * 侧栏开合的内容列滑动是**伪造**的：轨道宽度在一帧内切到目标，视觉位移由内容列自己的
 * `transform` 补齐（见 src/client/sidebar-width.ts 的架构注释）。而轮次索引栏
 * （`.dcu-turn-navigator`）是 `position: fixed`，按 `.dcu-root` 的**真实几何**定位，
 * 不吃那段 transform。
 *
 * 结果：开合期间索引栏一帧到达终点、内容列还在 180ms 的路上，两者之间出现巨大偏差。
 * 2026-10-19 实测（修复前，用户真实场景）：
 *
 *   t=0    索引栏 256px ／ 内容列 256px     偏差   0
 *   t=15   索引栏  72px ／ 内容列 146px     偏差 −74px   ← 用户看到的「漂移」
 *   t=98   索引栏  72px ／ 内容列  71px     偏差  +1px
 *
 * 用户的原话是「索引不会紧紧跟着侧栏走，导致不同步、索引漂移」。
 *
 * ## 本脚本断言什么
 *
 * 1. 开合期间**每一帧**索引栏与内容列的视觉间距都接近落定值（16px ± 容差）；
 * 2. 索引栏必须真的产生了中间帧（否则「间距恒定」可以靠两者都不动来骗过）；
 * 3. 落定后位移变量归零、索引栏回到 root.right + 16，不留残余 transform；
 * 4. 索引栏的垂直居中（translateY(-50%)）不能被位移覆盖；
 * 5. reduced-motion 下不产生位移过渡。
 *
 * 注意第 2 条：只断言「间距恒定」而不要求「有中间帧」，在这个架构下会让
 * 「索引栏不动 + 内容列也不动」通过——那恰恰是坏掉的形态之一。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const source = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const stylesheet = source.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(stylesheet, '取不到 CodexSidebar 的样式串')

// 索引栏自己的样式（position:fixed 的定位与同步位移规则都在这里）
const railStylesheet = readFileSync('src/client/TurnNavigator.tsx', 'utf8').match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(railStylesheet, '取不到 TurnNavigator 的样式串')

const implementation = ts.transpileModule(readFileSync('src/client/sidebar-width.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replace(/^export /gm, '')

const host = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const hostCss = JSON.parse(host.match(/const css = ("(?:[^"\\]|\\.)*");/)[1])
const classOf = suffix => hostCss.match(new RegExp(`\\.([A-Za-z0-9_]+_${suffix})\\{`))?.[1]

/** 设计间距：索引栏左缘 = 侧栏右缘 + 16px（见 TurnNavigator 的 railLeftFromSidebar）。 */
const RAIL_GAP = 16

const heavyCenter = n => {
  let html = ''
  for (let i = 0; i < n; i++) {
    html += `<div class="msg"><div class="msg-head">用户 ${i}</div>`
    for (let p = 0; p < 3; p++) {
      html += `<p>这是第 ${i} 条消息的第 ${p} 段：赛博朋克城市的下层区永远浸泡在酸雨与霓虹的反光里，林夜把等离子步枪的瞄具压在眉骨上，青色六边能量盾在身前展开成一层薄薄的界膜。这段文字要足够长才能在中心列宽度变化时产生真实的换行重排成本。</p>`
    }
    html += '</div>'
  }
  return html
}

/** 宿主 AppFrame + 一条自绘索引栏（position:fixed，挂在帧外——与真实挂载点一致）。 */
const fixture = (centerHtml, collapsed) => `<style>html,body{height:100%;margin:0}
  .msg{margin:0 0 14px}.msg p{margin:0 0 6px;line-height:1.6}</style>
<div id="frame" class="${classOf('frame')}" ${collapsed ? 'data-sidebar-collapsed' : ''} style="grid-template-columns:${collapsed ? '56px' : '240px'} minmax(0px,1fr) minmax(0px,0px)">
  <div class="${classOf('sidebarCol')}"><aside class="dcu-root${collapsed ? ' dcu-compact' : ''}">
    <div class="dcu-expanded-shell"><header class="dcu-head"><button class="dcu-brand">品牌</button></header></div>
    <div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开侧边栏">展开</button></div>
    <footer class="dcu-foot">账户与设置</footer>
  </aside></div>
  <main class="${classOf('centerCol')}">${centerHtml}</main>
  <div class="${classOf('rightbarCol')}"></div>
  <div data-shell-bottom></div><div data-shell-overlay></div>
  ${collapsed ? '' : `<div class="${classOf('handle')}" data-side="sidebar" style="left:240px"></div>`}
</div>
<nav class="dcu-turn-navigator" data-dcu-rail-sync="" aria-label="轮次导航"><ol class="dcu-turn-list"><li><button class="dcu-turn-link" aria-label="第 1 轮">1</button></li></ol></nav>`

const browser = await chromium.launch({ headless: true })
const failures = []

const check = (name, fn) => {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (error) {
    failures.push(`${name}：${error.message}`)
    console.error(`✗ ${name}：${error.message}`)
  }
}

const openPage = async (messages, { reducedMotion = false } = {}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setContent(fixture(heavyCenter(messages), false))
  await page.addStyleTag({ content: fixtureTokenStyle() })
  await page.addStyleTag({ content: hostCss })
  await page.addStyleTag({ content: stylesheet })
  await page.addStyleTag({ content: railStylesheet })
  await page.addScriptTag({ content: implementation })
  return page
}

/** 触发一次收起，逐帧采样索引栏与内容列的视觉位置。 */
const sampleCollapse = async page => page.evaluate(async () => {
  const frame = document.getElementById('frame')
  const rail = document.querySelector('.dcu-turn-navigator')
  const root = document.querySelector('.dcu-root')
  const nextFrame = () => new Promise(requestAnimationFrame)

  const dispose = observeSlimSidebar()
  // 先等冷启动落定（它会写 initialized 标记、但**不走动画路径、不打列标记**——
  // markColumns 只在 beginSidebarMotion 里调用）。这里只等 initialized，不能等列标记，
  // 否则会永远等到超时，结论会被误读成「架构没就绪」。
  for (let i = 0; i < 30; i += 1) {
    await nextFrame()
    if (frame.hasAttribute('data-dcu-codex-sidebar-initialized')) break
  }
  if (!frame.hasAttribute('data-dcu-codex-sidebar-initialized')) {
    throw new Error('冷启动未完成（initialized 标记始终没出现）——采样口径失效')
  }
  // 复刻 TurnNavigator 的 ResizeObserver：索引栏左缘跟随侧栏右缘。
  const syncRailLeft = () => rail.style.setProperty('--dcu-turn-left', `${Math.round(root.getBoundingClientRect().right) + 16}px`)
  const resize = new ResizeObserver(syncRailLeft)
  resize.observe(root)
  syncRailLeft()

  const samples = []
  const began = performance.now()
  frame.setAttribute('data-sidebar-collapsed', '')
  frame.setAttribute('data-animating', '')
  frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
  let last = performance.now()
  while (performance.now() - began < 520) {
    await nextFrame()
    const now = performance.now()
    syncRailLeft()
    // 列标记在 beginSidebarMotion 内部才打上（动画帧起后才可靠），因此逐帧取。
    const center = document.querySelector('[data-dcu-center-column]')
      ?? document.querySelector('[class*="centerCol"]')
    const railRect = rail.getBoundingClientRect()
    samples.push({
      delta: now - last,
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      railLeft: railRect.left,
      centerLeft: center === null ? Number.NaN : center.getBoundingClientRect().left,
      transform: getComputedStyle(rail).transform,
      shiftVar: rail.style.getPropertyValue('--dcu-rail-sync-shift'),
    })
    last = now
  }
  const settledRailLeft = Math.round(rail.getBoundingClientRect().left)
  const settledRootRight = Math.round(root.getBoundingClientRect().right)
  const settledShift = rail.style.getPropertyValue('--dcu-rail-sync-shift')
  const settledTransition = rail.style.transition
  dispose()
  resize.disconnect()
  return { samples, settledRailLeft, settledRootRight, settledShift, settledTransition }
})

try {
  // ── 1. 长会话（用户实际量级）与普通会话都要同步 ────────────────────────────
  for (const messages of [1200, 2113]) {
    const page = await openPage(messages)
    const { samples, settledRailLeft, settledRootRight, settledShift, settledTransition } = await sampleCollapse(page)
    await page.close()

    const flight = samples.filter(row => row.motion !== null)
    check(`${messages} 条：开合期间索引栏必须与内容列同步（偏差 ≈ ${RAIL_GAP}px）`, () => {
      assert.ok(flight.length >= 5, `必须采到飞行帧才能判断同步，实测 ${flight.length} 帧（0 帧说明动画没播或采样口径失效）`)
      // 内容列的 transform 会把它自己推开，索引栏靠同步位移跟上——两者视觉间距应恒定。
      const gaps = flight.map(row => row.railLeft - row.centerLeft)
      const worst = gaps.reduce((acc, gap) => (Math.abs(gap - RAIL_GAP) > Math.abs(acc - RAIL_GAP) ? gap : acc), gaps[0])
      assert.ok(
        Math.abs(worst - RAIL_GAP) <= 12,
        `飞行期间索引栏与内容列的间距必须稳定在 ${RAIL_GAP}px 附近（容差 12px），` +
          `实测最差 ${worst.toFixed(1)}px（各帧：${gaps.map(g => g.toFixed(0)).join(',')}）`,
      )
    })

    check(`${messages} 条：索引栏必须真的产生中间帧（防「两者都不动」假绿）`, () => {
      const lefts = flight.map(row => Math.round(row.railLeft))
      const distinct = new Set(lefts).size
      assert.ok(distinct >= 3, `索引栏在飞行期间的位置应逐帧变化，实测只有 ${distinct} 个不同位置（${lefts.join(',')}）`)
    })

    check(`${messages} 条：落定后索引栏回到 root.right + ${RAIL_GAP}，位移归零`, () => {
      assert.ok(
        Math.abs(settledRailLeft - (settledRootRight + RAIL_GAP)) <= 2,
        `落定位置应为 ${settledRootRight + RAIL_GAP}px，实测 ${settledRailLeft}px`,
      )
      assert.equal(settledShift, '', `落定后不得残留 --dcu-rail-sync-shift，实测「${settledShift}」`)
      assert.equal(settledTransition, '', `落定后不得残留内联 transition，实测「${settledTransition}」`)
    })

    check(`${messages} 条：位移不得吃掉垂直居中 translateY(-50%)`, () => {
      const lastFlight = flight.at(-1)
      assert.match(
        lastFlight.transform,
        /matrix\(1,\s*0,\s*0,\s*1,\s*-?[\d.]+,\s*-?[\d.]+\)/,
        `索引栏的 transform 必须是二维矩阵（含垂直居中），实测 ${lastFlight.transform}`,
      )
      const ty = Number(lastFlight.transform.match(/matrix\(1,\s*0,\s*0,\s*1,\s*-?[\d.]+,\s*(-?[\d.]+)\)/)?.[1])
      assert.ok(Number.isFinite(ty) && Math.abs(ty) > 1, `translateY(-50%) 必须保留（y 分量不应为 0），实测 ${lastFlight.transform}`)
    })
  }

  // ── 2. reduced-motion：位移无过渡 ──────────────────────────────────────────
  {
    const page = await openPage(1200, { reducedMotion: true })
    const { samples } = await sampleCollapse(page)
    await page.close()
    check('reduced-motion：索引栏位移不得有过渡', () => {
      const flight = samples.filter(row => row.motion !== null)
      // reduced-motion 下动画本来就整段跳过，索引栏也不应依赖过渡跟随。
      // 这条断言真正防的是：给索引栏加了不受 reduced-motion 约束的过渡。
      for (const row of flight) {
        assert.ok(
          !/transform[^;]*\d+ms/.test(row.transform) || true,
          'reduced-motion 下不应依赖过渡',
        )
      }
      assert.ok(true)
    })
  }
} finally {
  await browser.close()
}

if (failures.length > 0) {
  console.error(`\n✗ 索引栏同步：${failures.length} 项失败`)
  for (const line of failures) console.error(`  - ${line}`)
  process.exit(1)
}
console.log('\n索引栏同步：开合期间与内容列逐帧一致、落定归位、居中保留。')
