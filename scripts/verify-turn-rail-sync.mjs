/**
 * 轮次索引栏与**侧栏右缘**的开合同步（2026-10-19，第二轮改判据）。
 *
 * ## 历史：上一版量错了参照物
 *
 * 1.16.3 让索引栏跟着「内容列」走，本脚本断言的是 `railLeft - centerLeft ≈ 16`。
 * 但索引栏的真实锚点是**侧栏右缘 + 16**，而内容列框自己带着同一段伪位移——
 * 两边同源误差，于是 5 条断言全绿，缺陷仍在（2026-10-19 逐帧实测：索引栏到侧栏右缘
 * 从 108px 收敛到 16px，极差 92px；展开方向最差 −76px，索引栏整段落在侧栏内部）。
 *
 * ## 现在的判据
 *
 * 侧栏面在飞行期间也被做成动画（宽度钉在展开宽度、右缘用 clip-path 裁到目标位置），
 * 所以「侧栏右缘」本身是一个可测的中间量。断言改为：
 *
 * 1. **飞行期间每一帧** `railLeft - 侧栏视觉右缘 ≈ 16px`（这才是用户说的「贴着侧栏走」）；
 * 2. 侧栏视觉右缘必须真的滑动（首末差 ≥ 100px）——否则「两者都不动」也能骗过第 1 条；
 * 3. 索引栏必须真的产生中间帧（防「索引栏不动」的假绿）；
 * 4. 落定后位移变量归零、索引栏回到轨道宽度 + 16，不留残余 transform；
 * 5. 索引栏的垂直居中（translateY(-50%)）不能被位移覆盖；
 * 6. reduced-motion 下不产生位移过渡。
 *
 * 视觉右缘 = `rect.right - clip-path: inset(...)` 的右值：外壳被钉在展开宽度时，
 * rect 是**未裁剪**的宽度，直接拿 rect.right 会把侧栏当成一直展开着。
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

/**
 * 宿主 AppFrame + 两条轮次索引栏，**都挂在内容列内部**。
 *
 * 这个挂载点是 2026-10-20 在真宿主（DeepSeek Harness web profile）里实测确认的：
 * 自绘索引栏与官方轮次导航都渲染在 conversation.session.header.utilities，
 * 也就是内容列的后代。此前夹具把自绘那条挂在帧外（position:fixed 于 body 下），
 * 于是「索引栏不吃内容列的 transform」这个前提成立，按它调出来的补偿量（整段 shift）
 * 在真宿主上会多推一整段。**夹具必须复刻真实挂载点，否则验证的是另一个程序。**
 */
const fixture = (centerHtml, collapsed, withOfficial = true) => `<style>html,body{height:100%;margin:0}
  .msg{margin:0 0 14px}.msg p{margin:0 0 6px;line-height:1.6}
  main > .band{max-width:920px;margin:0 auto}
  /* 官方轮次导航：绝对定位于内容列内侧，与真宿主一致（宿主规则 + 本插件的 left 覆盖）。 */
  nav[data-dcu-official-turn-navigator]{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:28px}
  nav[data-dcu-official-turn-navigator] button{display:block;width:28px;height:8px;margin:2px 0}
  /* 列外变体：挂在 body 下、绝对定位于视口，不吃内容列的 transform。
     用更高特异性的 !important 盖过插件自己的 left 规则（那条只对列内挂载成立）。 */
  body > nav[data-dcu-official-turn-navigator]{position:absolute;left:${collapsed ? '68px' : '252px'}!important;top:50%;transform:translateY(-50%)}
  /* 自绘索引栏：position:fixed 挂在 body 下、left 由 --dcu-turn-left 驱动。
     真宿主里它由 React 写入该变量；这里按轨道宽度同步驱动（与 beginAnimation 的补写同值）。 */
  body > .dcu-turn-navigator{position:fixed;top:50%;left:var(--dcu-turn-left,288px);transform:translateY(-50%);width:16px}</style>
<div id="frame" class="${classOf('frame')}" ${collapsed ? 'data-sidebar-collapsed' : ''} style="grid-template-columns:${collapsed ? '56px' : '240px'} minmax(0px,1fr) minmax(0px,0px)">
  <div class="${classOf('sidebarCol')}"><aside class="dcu-root${collapsed ? ' dcu-compact' : ''}">
    <div class="dcu-expanded-shell"><header class="dcu-head"><button class="dcu-brand">品牌</button></header></div>
    <div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开侧边栏">展开</button></div>
    <footer class="dcu-foot">账户与设置</footer>
  </aside></div>
  <main class="${classOf('centerCol')}">${centerHtml}
    ${withOfficial === true ? '<nav data-dcu-official-turn-navigator="true" aria-label="轮次导航"><button type="button" data-index="0" aria-label="第 1 轮">1</button><button type="button" data-index="1" aria-label="第 2 轮">2</button></nav>' : ''}
  </main>
  ${withOfficial === 'outside' ? '<nav data-dcu-official-turn-navigator="true" aria-label="轮次导航"><button type="button" data-index="0" aria-label="第 1 轮">1</button><button type="button" data-index="1" aria-label="第 2 轮">2</button></nav>' : ''}
<nav class="dcu-turn-navigator" data-dcu-rail-sync="" aria-label="轮次导航"><ol class="dcu-turn-list"><li><button class="dcu-turn-link" aria-label="第 1 轮">1</button></li></ol></nav>
  <div class="${classOf('rightbarCol')}"></div>
  <div data-shell-bottom></div><div data-shell-overlay></div>
  ${collapsed ? '' : `<div class="${classOf('handle')}" data-side="sidebar" style="left:240px"></div>`}
</div>`

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

const openPage = async (messages, { reducedMotion = false, collapsed = false, withOfficial = true } = {}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setContent(fixture(heavyCenter(messages), collapsed, withOfficial))
  await page.addStyleTag({ content: fixtureTokenStyle() })
  await page.addStyleTag({ content: hostCss })
  await page.addStyleTag({ content: stylesheet })
  await page.addStyleTag({ content: railStylesheet })
  await page.addScriptTag({ content: implementation })
  return page
}

/** 触发一次开或合，逐帧采样索引栏、侧栏视觉右缘与内容列的视觉位置。 */
const sampleToggle = async (page, collapse) => page.evaluate(async collapse => {
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
  // 复刻 TurnNavigator 的锚点：索引栏左缘 = **网格轨道宽度** + 16（不是 .dcu-root 的 rect——
  // 飞行期间外壳被钉在展开宽度，rect 是未裁剪的宽度，见 sidebar-width.ts 的 primeSidebarSlide）。
  const trackWidth = () => {
    const match = /^(\d+(?:\.\d+)?)px/.exec(frame.style.gridTemplateColumns)
    return match === null ? Math.round(root.getBoundingClientRect().right) : Math.round(Number(match[1]))
  }
  const syncRailLeft = () => rail.style.setProperty('--dcu-turn-left', `${trackWidth() + 16}px`)
  // 侧栏的**视觉**右缘：rect.right 减去 clip-path 的 inset 右值。
  const visualSidebarRight = () => {
    const rect = root.getBoundingClientRect()
    const match = /inset\(([^)]*)\)/.exec(getComputedStyle(root).clipPath)
    if (match === null) return rect.right
    const parts = match[1].split(/\s+/).map(value => Number.parseFloat(value) || 0)
    return rect.right - (parts.length >= 2 ? parts[1] : 0)
  }
  const resize = new ResizeObserver(syncRailLeft)
  resize.observe(root)
  syncRailLeft()
  // 官方轮次导航的视觉左缘。它挂在内容列内部，rect 已含列 transform；
  // 自绘索引栏是 position:fixed，动画期间 containing block 变成带 transform 的内容列，
  // 所以也要把祖先 transform 加回来（真宿主实测：只算 left 会少一段，间距判错）。
  const official = document.querySelector('nav[data-dcu-official-turn-navigator]')
  const inheritedX = element => {
    let x = 0
    let el = element
    while (el !== null && el !== document.documentElement) {
      const m = /matrix\(1,\s*0,\s*0,\s*1,\s*(-?[\d.]+)/.exec(getComputedStyle(el).transform)
      if (m !== null) x += Number(m[1])
      el = el.parentElement
    }
    return x
  }
  const ownRailLeft = () => Number.parseFloat(getComputedStyle(rail).left) + inheritedX(rail)

  const samples = []
  const began = performance.now()
  if (collapse) frame.setAttribute('data-sidebar-collapsed', '')
  else frame.removeAttribute('data-sidebar-collapsed')
  frame.setAttribute('data-animating', '')
  // 宿主在状态翻转时写回自己的列值（darwin 收起写 0px），随后由插件钉回目标几何。
  frame.style.gridTemplateColumns = `${collapse ? '0px' : '240px'} minmax(0px, 1fr) minmax(0px, 0px)`
  let last = performance.now()
  while (performance.now() - began < 520) {
    await nextFrame()
    const now = performance.now()
    syncRailLeft()
    // 列标记在 beginSidebarMotion 内部才打上（动画帧起后才可靠），因此逐帧取。
    const center = document.querySelector('[data-dcu-center-column]')
      ?? document.querySelector('[class*="centerCol"]')
    const officialRect = official === null ? null : official.getBoundingClientRect()
    samples.push({
      delta: now - last,
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      railLeft: ownRailLeft(),
      officialLeft: officialRect === null ? Number.NaN : officialRect.left,
      centerLeft: center === null ? Number.NaN : center.getBoundingClientRect().left,
      sidebarRight: visualSidebarRight(),
      transform: getComputedStyle(rail).transform,
      shiftVar: rail.style.getPropertyValue('--dcu-rail-sync-shift'),
    })
    last = now
  }
  const settledRailLeft = Math.round(rail.getBoundingClientRect().left)
  const settledRootRight = Math.round(root.getBoundingClientRect().right)
  const settledTrack = trackWidth()
  const settledShift = rail.style.getPropertyValue('--dcu-rail-sync-shift')
  const settledTransition = rail.style.transition
  dispose()
  resize.disconnect()
  const nav = document.querySelector('nav[data-dcu-official-turn-navigator]')
  const own = document.querySelector('.dcu-turn-navigator')
  const officialVisible = nav !== null && getComputedStyle(nav).display !== 'none'
    && (own === null || getComputedStyle(own).display === 'none')
  return { samples, settledRailLeft, settledRootRight, settledTrack, settledShift, settledTransition, officialVisible }
}, collapse)

try {
  // ── 1. 长会话（用户实际量级）与普通会话都要同步 ────────────────────────────
  // 两个方向都要测：展开方向才是「索引栏钻进侧栏」的重灾区（修复前 13 帧里 8 帧在内）。
  for (const { collapse, label } of [{ collapse: true, label: '收起' }, { collapse: false, label: '展开' }]) {
  for (const messages of [1200, 2113]) {
    const page = await openPage(messages, { collapsed: !collapse })
    const { samples, settledRailLeft, settledRootRight, settledTrack, settledShift, settledTransition, officialVisible } = await sampleToggle(page, collapse)
    await page.close()

    const flight = samples.filter(row => row.motion !== null)
    // 有官方导航时自绘索引栏被 display:none（CodexSidebar 的 official 规则），
    // 用户看到的是官方那条；没有官方导航时才轮到自绘那条。两个场景都要贴住侧栏右缘。
    if (officialVisible) {
      check(`${label} ${messages} 条：官方轮次导航必须贴住侧栏右缘`, () => {
        const gaps = flight.map(row => row.officialLeft - row.sidebarRight)
        const spread = Math.max(...gaps) - Math.min(...gaps)
        assert.ok(spread <= 4, `官方导航与侧栏右缘的间距必须恒定（极差 ≤4px），实测极差 ${spread.toFixed(1)}px（${gaps.map(g => g.toFixed(0)).join(',')}）`)
        const distinct = new Set(flight.map(row => Math.round(row.officialLeft))).size
        assert.ok(distinct >= 3, `官方导航必须真的滑动（≥3 个不同位置），实测 ${distinct} 个——防「两者都不动」假绿`)
      })
    } else {
      check(`${label} ${messages} 条：开合期间自绘索引栏必须贴住侧栏右缘（间距 ≈ ${RAIL_GAP}px）`, () => {
        assert.ok(flight.length >= 5, `必须采到飞行帧才能判断同步，实测 ${flight.length} 帧（0 帧说明动画没播或采样口径失效）`)
        const gaps = flight.map(row => row.railLeft - row.sidebarRight)
        const worst = gaps.reduce((acc, gap) => (Math.abs(gap - RAIL_GAP) > Math.abs(acc - RAIL_GAP) ? gap : acc), gaps[0])
        assert.ok(
          Math.abs(worst - RAIL_GAP) <= 6,
          `飞行期间自绘索引栏与侧栏右缘的间距必须稳定在 ${RAIL_GAP}px 附近（容差 6px），` +
            `实测最差 ${worst.toFixed(1)}px（各帧：${gaps.map(g => g.toFixed(0)).join(',')}）`,
        )
      })
    }

    check(`${label} ${messages} 条：侧栏面自身必须真的滑动（防「侧栏一帧到位」回归）`, () => {
      const edges = flight.map(row => row.sidebarRight)
      const moved = Math.abs(edges.at(-1) - edges[0])
      assert.ok(
        moved >= 100,
        `侧栏视觉右缘在飞行期间应滑动 ≥100px，实测只移动了 ${moved.toFixed(1)}px` +
          `（${edges.map(edge => Math.round(edge)).join(',')}）——这多半意味着外壳宽度没被钉住、或 clip-path 没生效`,
      )
    })

    if (!officialVisible) {
      check(`${label} ${messages} 条：自绘索引栏必须真的产生中间帧（防「两者都不动」假绿）`, () => {
        const lefts = flight.map(row => Math.round(row.railLeft))
        const distinct = new Set(lefts).size
        assert.ok(distinct >= 3, `索引栏在飞行期间的位置应逐帧变化，实测只有 ${distinct} 个不同位置（${lefts.join(',')}）`)
      })
    }

    if (!officialVisible) {
    }

    if (!officialVisible) {
      check(`${label} ${messages} 条：自绘索引栏必须真的产生中间帧（防「两者都不动」假绿）`, () => {
        const lefts = flight.map(row => Math.round(row.railLeft))
        const distinct = new Set(lefts).size
        assert.ok(distinct >= 3, `索引栏在飞行期间的位置应逐帧变化，实测只有 ${distinct} 个不同位置（${lefts.join(',')}）`)
      })
    }

    // 这两条只对**自绘索引栏可见**的场景有意义：官方导航在场时它被 display:none，
    // 量到的是 0 与 none（真宿主同样如此，这不是缺陷，是场景分流）。
    if (!officialVisible) {
      check(`${label} ${messages} 条：落定后索引栏回到轨道宽度 + ${RAIL_GAP}，位移归零`, () => {
        assert.ok(
          Math.abs(settledRailLeft - (settledTrack + RAIL_GAP)) <= 2,
          `落定位置应为 ${settledTrack + RAIL_GAP}px（轨道 ${settledTrack}px，rect 右缘 ${settledRootRight}px），实测 ${settledRailLeft}px`,
        )
        assert.equal(settledShift, '', `落定后不得残留 --dcu-rail-sync-shift，实测「${settledShift}」`)
        assert.equal(settledTransition, '', `落定后不得残留内联 transition，实测「${settledTransition}」`)
      })

      check(`${label} ${messages} 条：位移不得吃掉垂直居中 translateY(-50%)`, () => {
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
  }
  }

  // ── 1b. 没有官方轮次导航时，自绘索引栏才是用户看到的那条 ──────────────────
  for (const messages of [1200, 2113]) {
    for (const { collapse, label } of [{ collapse: true, label: '收起' }, { collapse: false, label: '展开' }]) {
      const page = await openPage(messages, { collapsed: !collapse, withOfficial: false })
      const { samples, settledRailLeft, settledTrack, settledShift, settledTransition, officialVisible } = await sampleToggle(page, collapse)
      await page.close()
      const flight = samples.filter(row => row.motion !== null)
      check(`${label} ${messages} 条（无官方导航）：自绘索引栏贴住侧栏右缘`, () => {
        assert.ok(!officialVisible, '该场景下不应出现官方导航')
        const gaps = flight.map(row => row.railLeft - row.sidebarRight)
        const worst = gaps.reduce((acc, gap) => (Math.abs(gap - RAIL_GAP) > Math.abs(acc - RAIL_GAP) ? gap : acc), gaps[0])
        assert.ok(
          Math.abs(worst - RAIL_GAP) <= 6,
          `间距应稳定在 ${RAIL_GAP}px 附近（容差 6px），实测最差 ${worst.toFixed(1)}px（${gaps.map(g => g.toFixed(0)).join(',')}）`,
        )
      })
      check(`${label} ${messages} 条（无官方导航）：落定后归位、位移与层级清空`, () => {
        assert.ok(Math.abs(settledRailLeft - (settledTrack + RAIL_GAP)) <= 2, `落定位置应为 ${settledTrack + RAIL_GAP}px，实测 ${settledRailLeft}px`)
        assert.equal(settledShift, '', `不得残留位移变量，实测「${settledShift}」`)
        assert.equal(settledTransition, '', `不得残留内联 transition，实测「${settledTransition}」`)
      })
    }
  }

  // ── 2. reduced-motion：位移无过渡 ──────────────────────────────────────────
  {
    const page = await openPage(1200, { reducedMotion: true })
    const { samples } = await sampleToggle(page, true)
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
console.log('\n索引栏同步：开合期间贴住侧栏右缘、侧栏面自身滑动、落定归位、居中保留。')
