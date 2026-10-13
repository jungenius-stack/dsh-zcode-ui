/**
 * 使用真实 Chromium 验证侧栏开合动画（1.3.0 起为合成层架构）。
 *
 * ## 被测架构
 *
 * 动画期间网格轨道保持静止，内容列与拖拽柄用 transform 位移；轨道只在动画两端的
 * 「快照」里一次性切换。旧实现让 grid-template-columns 直接过渡，每帧全页重排，
 * 帧成本随会话内容增长（用户实测）。本脚本因此断言：
 *
 * 1. 飞行中轨道不变（这是新架构的根：没有每帧布局）；
 * 2. 内容列 transform 有连续中间帧并收敛到位；
 * 3. 快照后轨道/手柄/标记全部落到静止态，且不残留动画样式；
 * 4. 帧成本与内容量脱钩（重内容对照，防回归到每帧重排）；
 * 5. 反手切换、reduced-motion、拖拽、冷启动、卸载的行为；
 * 6. 与 dsh-better-sidebar 的 #root 布局规则共存（padding-right 过渡必须保留）。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const source = readFileSync('src/client/CodexSidebar.tsx', 'utf8')
const stylesheet = source.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(stylesheet)
const implementation = ts.transpileModule(readFileSync('src/client/sidebar-width.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText.replace(/^export /gm, '')
const host = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const hostStyle = host.match(/const css = ("(?:[^"\\]|\\.)*");/)
assert.ok(hostStyle)
const hostCss = JSON.parse(hostStyle[1])
const classOf = (suffix) => hostCss.match(new RegExp('\\.([A-Za-z0-9_]+_' + suffix + ')\\{'))?.[1]

/** 镜像宿主 AppFrame 的真实 DOM：sidebarCol > .dcu-root，随后 centerCol / rightbarCol / shell.* / 手柄。 */
const hostFixture = (centerHtml, collapsed) => `<style>html,body{height:100%;margin:0}
  :root{--ds-transition-duration-slow:.3s;--ds-ease-in-out:cubic-bezier(.4,0,.2,1)}
  .msg{margin:0 0 14px}.msg p{margin:0 0 6px;line-height:1.6}.msg pre{background:#f4f4f4;padding:6px;border-radius:6px}</style>
<div id="frame" class="${classOf('frame')}" ${collapsed ? 'data-sidebar-collapsed' : ''} style="grid-template-columns:${collapsed ? '56px' : '240px'} minmax(0px,1fr) minmax(0px,0px)">
  <div class="${classOf('sidebarCol')}"><aside class="dcu-root${collapsed ? ' dcu-compact' : ''}">
    <div class="dcu-expanded-shell"><header class="dcu-head"><button class="dcu-brand">品牌</button><div class="dcu-head-actions"><button class="dcu-icon">收起</button></div></header><nav class="dcu-menu"><button>任务</button><button>频道</button></nav><div class="dcu-workspaces">${'工作区<br>'.repeat(20)}</div></div>
    <div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开侧边栏">展开</button></div>
    <footer class="dcu-foot">账户与设置</footer>
  </aside></div>
  <main class="${classOf('centerCol')}">${centerHtml}</main>
  <div class="${classOf('rightbarCol')}"></div>
  <div data-shell-bottom></div><div data-shell-overlay></div>
  ${collapsed ? '' : `<div class="${classOf('handle')}" data-side="sidebar" style="left:240px"></div>`}
</div>`

/** 中心列灌入 n 条消息：文本换行成本随节点数增长（复现用户实测的劣化维度）。 */
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

const browser = await chromium.launch({ headless: true })
try {
  // 首次收起、拖拽和网格未就绪时也必须收敛；达到上限即断开，避免回归挂死测试进程。
  for (const initial of ['expanded', 'collapsed', 'dragging', 'pending-grid']) {
    const startup = await browser.newPage({ viewport: { width: 984, height: 960 } })
    // 网格未就绪时先用收起标记定位 frame，监听建立后再单独验证网格守卫。
    const collapsed = initial === 'collapsed' || initial === 'pending-grid'
    await startup.setContent(`<div id="frame" ${collapsed ? 'data-sidebar-collapsed' : ''} ${initial === 'dragging' ? 'data-dragging' : ''} style="grid-template-columns:${initial === 'pending-grid' ? 'none' : '320px minmax(0px, 1fr) 0px'}"><div data-side="sidebar"></div></div>`)
    await startup.evaluate(() => {
      const NativeObserver = window.MutationObserver
      window.startupProbe = { callbacks: 0, capped: false }
      window.MutationObserver = class extends NativeObserver {
        constructor(callback) {
          super((records, observer) => {
            if (++window.startupProbe.callbacks >= 100) {
              window.startupProbe.capped = true
              observer.disconnect()
              return
            }
            callback(records, observer)
          })
        }
      }
    })
    await startup.addScriptTag({ content: implementation })
    const startupResult = await startup.evaluate(async (initial) => {
      const frame = document.getElementById('frame')
      const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame) }
      const dispose = observeSlimSidebar()
      if (initial === 'pending-grid') frame.removeAttribute('data-sidebar-collapsed')
      await settle()
      const cold = { ...window.startupProbe }
      frame.removeAttribute('data-sidebar-collapsed')
      frame.removeAttribute('data-dragging')
      frame.style.gridTemplateColumns = '320px minmax(0px, 1fr) 0px'
      await settle()
      const initialized = frame.hasAttribute('data-dcu-codex-sidebar-initialized')
      const width = parseFloat(frame.style.gridTemplateColumns)
      const beforeIdle = window.startupProbe.callbacks
      await settle()
      const idleCallbacks = window.startupProbe.callbacks - beforeIdle
      dispose()
      return { cold, initialized, width, idleCallbacks }
    }, initial)
    await startup.close()
    assert.equal(startupResult.cold.capped, false, `${initial} 首次加载触发监听循环`)
    assert.equal(startupResult.initialized, true, `${initial} 恢复展开后应完成初始化`)
    assert.equal(startupResult.width, 240)
    assert.equal(startupResult.idleCallbacks, 0, `${initial} 稳定后不应继续触发监听`)
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.setContent(hostFixture('对话内容', false))
  await page.addStyleTag({ content: fixtureTokenStyle() })
  await page.addStyleTag({ content: hostCss })
  await page.addStyleTag({ content: stylesheet })
  await page.addScriptTag({ content: implementation })
  const result = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const root = frame.querySelector('.dcu-root')
    const shell = root.querySelector('.dcu-expanded-shell')
    const foot = root.querySelector('.dcu-foot')
    const center = frame.querySelector(`[data-dcu-center-column], main`)
    const nextFrame = () => new Promise(requestAnimationFrame)
    const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame) }
    const dispose = observeSlimSidebar()
    for (let i = 0; i < 8; i++) await nextFrame()
    let mutations = 0
    const observer = new MutationObserver(records => { mutations += records.length })
    observer.observe(frame, { attributes: true, subtree: true })
    for (let i = 0; i < 8; i++) await nextFrame()
    const idleMutations = mutations
    const track = () => Math.round(parseFloat(getComputedStyle(frame).gridTemplateColumns))
    const shiftOf = (element) => Math.round(new DOMMatrixReadOnly(getComputedStyle(element).transform === 'none' ? '' : getComputedStyle(element).transform).m41)
    const run = async (collapsed) => {
      const rows = []
      const began = performance.now()
      if (collapsed) {
        // 宿主收起：写 data-sidebar-collapsed + 自己的列值（darwin 收起为 0px），
        // 挂 data-animating，并卸载手柄（真实宿主只在展开态挂手柄）。
        frame.setAttribute('data-sidebar-collapsed', '')
        frame.setAttribute('data-animating', '')
        frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
        frame.querySelector('[data-side="sidebar"]')?.remove()
      } else {
        frame.removeAttribute('data-sidebar-collapsed')
        frame.setAttribute('data-animating', '')
        frame.style.gridTemplateColumns = '280px minmax(0px, 1fr) minmax(0px, 0px)'
        if (frame.querySelector('[data-side="sidebar"]') === null) {
          // 宿主只在展开态挂手柄。
          const handle = document.createElement('div')
          handle.setAttribute('data-side', 'sidebar')
          handle.style.left = '280px'
          frame.append(handle)
        }
      }
      let last = performance.now()
      while (performance.now() - began < 420) {
        await nextFrame()
        const now = performance.now()
        const handle = frame.querySelector('[data-side="sidebar"]')
        rows.push({
          t: Math.round(now - began),
          delta: Math.round(now - last),
          track: track(),
          shift: shiftOf(center),
          motion: frame.getAttribute('data-dcu-sidebar-motion'),
          handleLeft: handle === null ? null : Math.round(parseFloat(getComputedStyle(handle).left) + shiftOf(handle)),
        })
        last = now
      }
      return rows
    }
    const collapseRows = await run(true)
    await settle()
    const collapsedState = {
      track: track(),
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      shiftVar: frame.style.getPropertyValue('--dcu-sidebar-shift'),
      centerWidth: Math.round(center.getBoundingClientRect().width),
      handleExists: frame.querySelector('[data-side="sidebar"]') !== null,
    }
    const expandRows = await run(false)
    await settle()
    const expandedState = {
      track: track(),
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      shiftVar: frame.style.getPropertyValue('--dcu-sidebar-shift'),
      handleLeft: Math.round(parseFloat(frame.querySelector('[data-side="sidebar"]').style.left)),
      handleVisual: Math.round(parseFloat(getComputedStyle(frame.querySelector('[data-side="sidebar"]')).left) + shiftOf(frame.querySelector('[data-side="sidebar"]'))),
      centerWidth: Math.round(center.getBoundingClientRect().width),
      shellWidth: Math.round(shell.getBoundingClientRect().width),
    }
    // 反手：收起动画飞行中立刻展开，必须立即落定到新静止态（不留半程动画）。
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    await nextFrame()
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '280px minmax(0px, 1fr) minmax(0px, 0px)'
    await settle()
    const reversal = { track: track(), motion: frame.getAttribute('data-dcu-sidebar-motion'), shift: shiftOf(center) }
    observer.disconnect()
    dispose()
    const restored = {
      initialized: frame.hasAttribute('data-dcu-codex-sidebar-initialized'),
      grid: frame.style.gridTemplateColumns,
      width: frame.style.getPropertyValue('--dcu-sidebar-expanded-width'),
      centerMarked: frame.querySelector('[data-dcu-center-column]') !== null,
      sidebarMarked: frame.querySelector('[data-dcu-sidebar-column]') !== null,
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      shiftVar: frame.style.getPropertyValue('--dcu-sidebar-shift'),
    }
    return { idleMutations, collapseRows, collapsedState, expandRows, expandedState, reversal, restored }
  })
  assert.equal(result.idleMutations, 0, '静止后不应继续写入 DOM 或调度宽度修正')
  // 卸载必须还原宿主几何与全部动画残留。
  assert.equal(result.restored.initialized, false, '卸载必须移除初始化标记')
  assert.equal(result.restored.grid, '240px minmax(0px, 1fr) minmax(0px, 0px)', '卸载必须恢复插件改写后的宿主列宽')
  assert.equal(result.restored.width, '', '卸载必须清理插件列宽变量')
  assert.equal(result.restored.centerMarked, false, '卸载必须移除内容列标记')
  assert.equal(result.restored.sidebarMarked, false, '卸载必须移除侧栏列标记')
  assert.equal(result.restored.motion, null, '卸载必须移除动画标记')
  assert.equal(result.restored.shiftVar, '', '卸载必须清理位移变量')
  // 收起：飞行中轨道恒定（新架构的根），transform 连续单调插值，末端落定。
  const collapseFlight = result.collapseRows.filter(row => row.motion !== null)
  assert.ok(collapseFlight.length >= 6, `收起动画应有连续飞行帧，实测 ${collapseFlight.length}`)
  assert.ok(collapseFlight.every(row => row.track === 240), '收起动画期间轨道必须保持展开几何（不逐帧重排）')
  assert.ok(collapseFlight.filter(row => row.shift < -4 && row.shift > -180).length >= 3, '收起必须有多个 transform 中间帧')
  assert.ok(collapseFlight.every((row, i) => i === 0 || row.shift <= collapseFlight[i - 1].shift + 0.5), '收起位移必须单调向左（方向回归防线）')
  assert.ok(Math.abs(collapseFlight.at(-1).shift + 184) <= 8, `收起必须收敛到 -184，实测 ${collapseFlight.at(-1).shift}`)
  assert.equal(result.collapsedState.track, 56, '收起落定后轨道必须是 56px')
  assert.equal(result.collapsedState.motion, null, '落定后必须清除动画标记')
  assert.equal(result.collapsedState.shiftVar, '', '落定后必须清理位移变量')
  assert.equal(result.collapsedState.centerWidth, 1224, '收起到位后内容列宽度必须等于 56px 几何下的轨道宽')
  assert.equal(result.collapsedState.handleExists, false, '宿主收起态不挂手柄')
  // 展开：基准轨道是收起几何，transform 从 0 连续单调推到 +184；手柄从 56 视觉位滑到 240。
  const expandFlight = result.expandRows.filter(row => row.motion !== null)
  assert.ok(expandFlight.length >= 6, `展开动画应有连续飞行帧，实测 ${expandFlight.length}`)
  assert.ok(expandFlight.every(row => row.track === 56), '展开动画期间轨道必须保持收起几何')
  assert.ok(expandFlight.filter(row => row.shift > 4 && row.shift < 180).length >= 3, '展开必须有多个 transform 中间帧')
  assert.ok(expandFlight.every((row, i) => i === 0 || row.shift >= expandFlight[i - 1].shift - 0.5), '展开位移必须单调向右（方向回归防线）')
  assert.ok(Math.abs(expandFlight.at(-1).shift - 184) <= 8, `展开必须收敛到 +184，实测 ${expandFlight.at(-1).shift}`)
  const handleRows = expandFlight.filter(row => row.handleLeft !== null)
  assert.ok(handleRows.length >= 6, '展开动画期间手柄必须在位')
  // 手柄视觉位（布局 left + transform）从收起位 56 单调滑向展开位 240。
  assert.ok(handleRows.every(row => row.handleLeft >= 55 && row.handleLeft <= 241), `手柄视觉位必须在 56→240 之间，实测 ${handleRows.map(r => r.handleLeft).join(',')}`)
  assert.ok(handleRows.every((row, i) => i === 0 || row.handleLeft >= handleRows[i - 1].handleLeft - 0.5), `手柄必须单调滑向展开位，实测 ${handleRows.map(r => r.handleLeft).join(',')}`)
  assert.ok(handleRows.filter(row => row.handleLeft > 62 && row.handleLeft < 234).length >= 3, '手柄必须有连续滑动中间帧')
  assert.ok(handleRows.at(-1).handleLeft > 200, `展开末帧手柄必须已接近展开位，实测 ${handleRows.at(-1).handleLeft}`)
  assert.equal(result.expandedState.track, 240, '展开落定后轨道必须回到展开宽度')
  assert.equal(result.expandedState.motion, null, '展开落定后必须清除动画标记')
  assert.equal(result.expandedState.handleLeft, 240, '展开落定后手柄布局位必须是 240')
  assert.ok(Math.abs(result.expandedState.handleVisual - 240) <= 1, `展开落定后手柄视觉位必须是 240，实测 ${result.expandedState.handleVisual}`)
  assert.equal(result.expandedState.centerWidth, 1040, '展开到位后内容列宽度必须回到展开几何')
  assert.equal(result.expandedState.shellWidth, 240, '展开到位后宽态外壳必须是展开宽度')
  // 反手切换：立即落定，无半程动画残留。
  assert.equal(result.reversal.track, 240, '反手切换到展开必须立即落定轨道')
  assert.equal(result.reversal.motion, null, '反手切换不得留下飞行动画')
  assert.equal(result.reversal.shift, 0, '反手切换后内容列必须回到布局位')

  // —— 帧成本与内容量脱钩（用户实测的回归防线）——
  // 旧实现（grid 过渡）在 1200 条消息下收起：500ms 内 26/30 帧、飞行平均 20.0ms、
  // 最大 37ms、8 帧超 20ms。新实现要求：飞行中零掉帧、平均贴近 vsync 基线。
  for (const messages of [10, 1200]) {
    const heavy = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await heavy.setContent(hostFixture(heavyCenter(messages), false))
    await heavy.addStyleTag({ content: fixtureTokenStyle() })
    await heavy.addStyleTag({ content: hostCss })
    await heavy.addStyleTag({ content: stylesheet })
    await heavy.addScriptTag({ content: implementation })
    const perf = await heavy.evaluate(async () => {
      const frame = document.getElementById('frame')
      const nextFrame = () => new Promise(requestAnimationFrame)
      const dispose = observeSlimSidebar()
      for (let i = 0; i < 10; i++) await nextFrame()
      const deltas = []
      const began = performance.now()
      frame.setAttribute('data-sidebar-collapsed', '')
      frame.setAttribute('data-animating', '')
      frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
      let last = performance.now()
      while (performance.now() - began < 420) {
        await nextFrame()
        const now = performance.now()
        deltas.push(now - last)
        last = now
      }
      dispose()
      // 去掉首帧（一次性重排：内容列加宽一个 shift，推挤架构无法避免，但只发生一次）。
      const flight = deltas.slice(1)
      return {
        total: deltas.length,
        first: deltas[0],
        avg: flight.reduce((a, b) => a + b, 0) / flight.length,
        max: Math.max(...flight),
        drops: flight.filter(d => d > 25).length,
      }
    })
    await heavy.close()
    assert.equal(perf.drops, 0, `${messages} 条消息：飞行中不得有超过 25ms 的帧（掉帧），实测 ${perf.drops} 个 / 最大 ${perf.max.toFixed(1)}ms`)
    assert.ok(perf.avg < 18.5, `${messages} 条消息：飞行中平均帧必须贴近 60Hz 基线，实测 ${perf.avg.toFixed(1)}ms`)
  }

  // —— reduced-motion：不播动画，直接落定 ——
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const nextFrame = () => new Promise(requestAnimationFrame)
    // 主测试段已 dispose，这里重新建立监听（否则 toggle 无人响应，断言空转）。
    const dispose = observeSlimSidebar()
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '240px minmax(0px, 1fr) minmax(0px, 0px)'
    for (let i = 0; i < 6; i++) await nextFrame()
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    const tracks = []
    for (let i = 0; i < 6; i++) { await nextFrame(); tracks.push(Math.round(parseFloat(getComputedStyle(frame).gridTemplateColumns))) }
    const motion = frame.getAttribute('data-dcu-sidebar-motion')
    dispose()
    return { tracks, motion }
  })
  assert.deepEqual(reduced.tracks, [56, 56, 56, 56, 56, 56], '减少动态效果时必须一帧落定，不播过渡')
  assert.equal(reduced.motion, null, '减少动态效果时不得挂动画标记')
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  // —— 拖拽中：不得起动画；飞行中的动画必须被拖拽取消 ——
  const dragging = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    // 主测试段 dispose 后列标记已清，用 main 回退定位内容列。
    const center = frame.querySelector('[data-dcu-center-column], main')
    const nextFrame = () => new Promise(requestAnimationFrame)
    const dispose = observeSlimSidebar()
    // 先落到干净的展开静止态（从收起态展开会有合法动画，等它落定再测拖拽）。
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '280px minmax(0px, 1fr) minmax(0px, 0px)'
    for (let i = 0; i < 26; i++) await nextFrame()
    const settled = { motion: frame.getAttribute('data-dcu-sidebar-motion'), track: Math.round(parseFloat(getComputedStyle(frame).gridTemplateColumns)) }
    // 场景一：拖拽中宿主收起——不得起动画。
    frame.setAttribute('data-dragging', '')
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    for (let i = 0; i < 6; i++) await nextFrame()
    const during = {
      motion: frame.getAttribute('data-dcu-sidebar-motion'),
      centerTransition: getComputedStyle(center).transitionDuration,
      centerTransform: getComputedStyle(center).transform,
    }
    frame.removeAttribute('data-dragging')
    for (let i = 0; i < 6; i++) await nextFrame()
    // 场景二：开合动画飞行中开始拖拽——动画必须被取消（定时器不得稍后落定）。
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '240px minmax(0px, 1fr) minmax(0px, 0px)'
    for (let i = 0; i < 6; i++) await nextFrame()
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    await nextFrame()
    const flying = frame.getAttribute('data-dcu-sidebar-motion')
    frame.setAttribute('data-dragging', '')
    await nextFrame()
    await nextFrame()
    const cancelled = { motion: frame.getAttribute('data-dcu-sidebar-motion'), shift: frame.style.getPropertyValue('--dcu-sidebar-shift') }
    frame.removeAttribute('data-dragging')
    dispose()
    return { settled, during, flying, cancelled }
  })
  assert.equal(dragging.settled.motion, null, '落定后不得残留动画标记')
  assert.equal(dragging.settled.track, 240, '拖拽测试前必须处于展开静止态')
  assert.equal(dragging.during.motion, null, '拖拽中不得启动开合动画')
  assert.equal(dragging.during.centerTransition, '0s', '拖拽中内容列不得挂过渡')
  assert.equal(dragging.during.centerTransform, 'none', '拖拽中内容列不得残留位移')
  assert.equal(dragging.flying, 'collapse', '飞行中拖拽用例的前置动画必须确实在飞')
  assert.equal(dragging.cancelled.motion, null, '拖拽开始必须取消飞行中的开合动画')
  assert.equal(dragging.cancelled.shift, '', '取消动画必须清理位移变量')

  // —— 与 dsh-better-sidebar 的 #root 布局规则共存 ——
  await page.evaluate(() => {
    const host = document.createElement('div')
    host.id = 'root'
    host.innerHTML = '<div data-slot="root"></div>'
    document.body.append(host)
    host.firstElementChild.append(document.getElementById('frame'))
  })
  await page.addStyleTag({ content: `
    #root{--ds-transition-duration-slow:.3s;--ds-ease-in-out:cubic-bezier(.4,0,.2,1)}
    #root [data-dsh-frame],#root > [data-slot="root"] > div{padding-right:var(--dsh-sidebar-width,0px);transition:padding-right var(--ds-transition-duration-slow) var(--ds-ease-in-out)}
    body[data-dsh-sidebar-dragging] #root [data-dsh-frame],body[data-dsh-sidebar-dragging] #root > [data-slot="root"] > div{transition:none}
  ` })
  const compatible = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const center = frame.querySelector('[data-dcu-center-column], main')
    const nextFrame = () => new Promise(requestAnimationFrame)
    // 前面的测试段都已 dispose，这里重新建立监听（新架构的动画由观察器启动）。
    const dispose = observeSlimSidebar()
    const track = () => Math.round(parseFloat(getComputedStyle(frame).gridTemplateColumns))
    const shift = () => Math.round(new DOMMatrixReadOnly(getComputedStyle(center).transform === 'none' ? '' : getComputedStyle(center).transform).m41)
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '240px minmax(0px, 1fr) minmax(0px, 0px)'
    // 等展开动画落定（约 300ms），否则接着触发收起会走反手立即落定，没有飞行帧。
    for (let i = 0; i < 26; i++) await nextFrame()
    const transition = getComputedStyle(frame).transitionProperty
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.setAttribute('data-animating', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    const rows = []
    for (let i = 0; i < 10; i++) {
      await nextFrame()
      rows.push({
        track: track(),
        shift: shift(),
        // 飞行中读取：内容列只允许过渡 transform（width 若过渡就会每帧重排）。
        centerTransition: i === 0 ? getComputedStyle(center).transitionProperty : null,
      })
    }
    frame.setAttribute('data-dragging', '')
    const leftDrag = getComputedStyle(frame).transitionDuration
    frame.removeAttribute('data-dragging')
    document.body.setAttribute('data-dsh-sidebar-dragging', '')
    const rightDrag = getComputedStyle(frame).transitionDuration
    document.body.removeAttribute('data-dsh-sidebar-dragging')
    return { transition, rows, leftDrag, rightDrag }
  })
  assert.ok(compatible.transition.includes('padding-right'), '必须保留伴随插件右侧面板过渡')
  assert.ok(!compatible.transition.includes('grid-template-columns'), '伴随插件存在时帧也不得把 grid 挂进过渡（否则恢复每帧重排）')
  assert.equal(compatible.rows[0].centerTransition, 'transform', '内容列必须只过渡 transform（width 不得过渡，否则每帧重排）')
  assert.ok(compatible.rows.filter(row => row.track === 240).length >= 8, '组合布局中收起动画轨道必须保持静止')
  assert.ok(compatible.rows.filter(row => row.shift < -4 && row.shift > -180).length >= 3, '组合布局中内容列必须有连续位移帧')
  assert.equal(compatible.leftDrag, '0s', '拖拽中帧过渡必须为 0s')
  assert.equal(compatible.rightDrag, '0s', '伴随插件拖拽时帧过渡必须为 0s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('frame')).transitionDuration), '0s', '减少动态效果时帧过渡必须为 0s')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  console.log(`侧栏过渡：合成层动画通过——收起/展开各 ${result.collapseRows.length}/${result.expandRows.length} 帧采样，轨道静止、transform 收敛、帧成本与内容量脱钩。`)
} finally {
  await browser.close()
}
