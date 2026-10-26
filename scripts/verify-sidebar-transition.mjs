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
<div id="frame" class="${classOf('frame')}" ${collapsed ? 'data-sidebar-collapsed' : ''} style="grid-template-columns:${collapsed ? '56px' : '264px'} minmax(0px,1fr) minmax(0px,0px)">
  <div class="${classOf('sidebarCol')}"><aside class="dcu-root${collapsed ? ' dcu-compact' : ''}">
    <div class="dcu-expanded-shell"><header class="dcu-head"><button class="dcu-brand">品牌</button><div class="dcu-head-actions"><button class="dcu-icon">收起</button></div></header><nav class="dcu-menu"><button>任务</button><button>频道</button></nav><div class="dcu-workspaces">${'工作区<br>'.repeat(20)}</div></div>
    <div class="dcu-compact-shell"><button class="dcu-icon" aria-label="展开侧边栏">展开</button></div>
    <footer class="dcu-foot">账户与设置</footer>
  </aside></div>
  <main class="${classOf('centerCol')}">${centerHtml}</main>
  <div class="${classOf('rightbarCol')}"></div>
  <div data-shell-bottom></div><div data-shell-overlay></div>
  ${collapsed ? '' : `<div class="${classOf('handle')}" data-side="sidebar" style="left:264px"></div>`}
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
    // 断言首帧写入的默认展开宽度。2026-10-25：默认宽由 240 对齐到 ZCode 实测的 264
    // （codex-sidebar 的 --dcu-sidebar-expanded-width fallback 与 CODEX_SIDEBAR_DEFAULT_PX 同值）。
    assert.equal(startupResult.width, 264)
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
          // 视觉带心：内容列的真实屏幕中心（getBoundingClientRect 已含 transform）。
          // 这是唯一能区分「新旧轨道架构」的量：两者 transform 轨迹几乎一样，
          // 但旧架构把轨道钉在基准几何上，落定瞬间内容带会跳 shift/2（实测 92px）。
          bandCenter: Math.round(center.getBoundingClientRect().left + center.getBoundingClientRect().width / 2),
          // 逐帧记布局宽度：断言「动画期间宽度恒定」需要它（旧实现在这里改宽度导致每帧重排）。
          centerWidth: Math.round(center.getBoundingClientRect().width),
          // 性能回归防线用（见下方断言）：位移必须走内容列的内联 transform，
          // 而不是写在 frame 上的继承型 CSS 变量。
          inlineTransform: center.style.transform,
          frameShiftVar: frame.style.getPropertyValue('--dcu-sidebar-shift'),
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
      // 收起静止位的视觉带心：飞行末帧必须收敛到这里（旧架构会停在展开位）。
      bandCenter: Math.round(center.getBoundingClientRect().left + center.getBoundingClientRect().width / 2),
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
  assert.equal(result.restored.grid, '264px minmax(0px, 1fr) minmax(0px, 0px)', '卸载必须恢复插件改写后的宿主列宽')
  assert.equal(result.restored.width, '', '卸载必须清理插件列宽变量')
  assert.equal(result.restored.centerMarked, false, '卸载必须移除内容列标记')
  assert.equal(result.restored.sidebarMarked, false, '卸载必须移除侧栏列标记')
  assert.equal(result.restored.motion, null, '卸载必须移除动画标记')
  assert.equal(result.restored.shiftVar, '', '卸载必须清理位移变量')
  // 收起：飞行中轨道恒定（新架构的根），transform 连续单调插值，末端落定。
  // 位移量锁的是**几何关系**而不是字面量（2026-10-14 修正）：
  // 会话内容带在宿主里是**居中**的（聊天列 max-width 上限 920px）。内容列从动画基准
  // 变为落定后的宽度时，居中带会自动移动一半。因此「内容列的视觉位移」必须等于
  // shift/2，而不是 shift——旧实现用 width:calc(100%+shift) 配 translateX(-shift)，
  // 数学等价但**每帧改宽度**，在长对话下把动画压成 1 帧（用户实测卡顿，详见 KNOWN-ISSUES §26）。
  // 断言改为「收敛到 -shift/2」：既守住视觉终点，又允许实现切换成不重排的写法。
  const shift = 208 // 夹具：展开 264 - 收起 56
  const halfShift = shift / 2
  const collapseFlight = result.collapseRows.filter(row => row.motion !== null)
  assert.ok(collapseFlight.length >= 6, `收起动画应有连续飞行帧，实测 ${collapseFlight.length}`)
  // 轨道必须**全程恒定**（不是「必须等于某个值」）。
  // 2026-10-14 架构修正：轨道现在从动画开始就切到**目标**几何，于是宽度全程不变、
  // 落定不再重排。锁死「必须等于 240」会把旧架构固化成契约，并挡住这次修复；
  // 真正要守的是「动画期间不逐帧重排」——即轨道值恒定。
  assert.ok(
    collapseFlight.every(row => row.track === collapseFlight[0].track),
    `收起动画期间轨道必须全程恒定（逐帧改轨道 = 每帧整页重排）：实测 ${collapseFlight.map(r => r.track).join(',')}`,
  )
  assert.ok(
    collapseFlight.filter(row => row.shift > 4 && row.shift < halfShift - 4).length >= 3,
    `收起必须有多个 transform 中间帧（实测 ${collapseFlight.map(r => r.shift).join(',')}）`,
  )
  assert.ok(collapseFlight.every((row, i) => i === 0 || row.shift <= collapseFlight[i - 1].shift + 0.5), '收起位移必须单调递减（方向回归防线）')
  // 终点必须是 0（天然位置）而不是 ±halfShift。
  // 2026-10-14 架构修正后：轨道一开始就切到目标几何 → 内容带的天然位置**就是终点**，
  // 动画只负责「从伪造的起点滑回 0」。收起时起点在 +halfShift（右）侧、向右收敛到 0。
  assert.ok(
    Math.abs(collapseFlight.at(-1).shift) <= 8,
    `收起位移必须收敛到 0（轨道已提前切到目标几何，天然位置即终点），实测 ${collapseFlight.at(-1).shift}`,
  )
  assert.ok(
    Math.abs(collapseFlight[0].shift - halfShift) <= halfShift * 0.5,
    `收起动画起点应接近 +shift/2（${halfShift}），实测 ${collapseFlight[0].shift}`,
  )
  // ── 性能回归防线（2026-10-16）──
  // 位移**必须**由内容列自己的内联 transform 承担，不得改由「写在 frame 上的继承型
  // 自定义属性 + keyframes 里的 var()」承担。理由是实测出来的、不是洁癖：
  //   · frame 是会话区祖先，长对话下后代可达 1.2 万；写一个继承型自定义属性到 frame，
  //     Chromium 无法预知谁会用 var() 消费它，只能作废**全部后代**的样式
  //     （实测 frame 写一次 44ms ／ 只含侧栏的子元素 4ms）；
  //   · @keyframes 里含 var() 会让动画无法交给合成器（重算次数 17000 → 8000 的差距）。
  // 完整数据见 docs/KNOWN-ISSUES.md §27。
  assert.ok(
    !result.collapseRows.some(row => (row.frameShiftVar ?? '') !== ''),
    '动画不得把位移写成 frame 上的 CSS 变量（继承型自定义属性会作废整个会话区后代的样式，'
    + '长对话下即用户报告的「对话越长越卡」）；应直接写内容列的 transform',
  )
  assert.ok(
    collapseFlight.some(row => (row.inlineTransform ?? '') !== ''),
    `位移必须由内容列的内联 transform 承担（实测这是零成本路径），实测各行内联值 ${collapseFlight.map(r => r.inlineTransform).join(' , ')}`,
  )
  // **视觉带心连续性**：这是区分新旧轨道架构的唯一可靠判据。
  // 旧架构把轨道钉在「基准几何」（收起钉展开几何），落定时才切到目标宽度，
  // 于是内容带在落定瞬间会平移 shift/2（=92px）——一个用户可见的突跳。
  // 新架构一开始就把轨道切到目标几何，带心从展开位单调滑到收起位，全程无跳变。
  // 判据：飞行帧的带心必须单调（允许 1px 抖动），且首帧≈展开静止位、末帧≈收起静止位。
  const bandFlight = collapseFlight.map(r => r.bandCenter)
  assert.ok(bandFlight.length >= 6, `必须有足够飞行帧用于带心连续性判定，实测 ${bandFlight.length}`)
  assert.ok(
    bandFlight.every((v, i) => i === 0 || v <= bandFlight[i - 1] + 1),
    `收起时内容带心必须单调左移（落定不得突跳）——旧架构会在此处跳 shift/2。实测 ${bandFlight.join(',')}`,
  )
  // 末帧带心必须已经接近收起静止位，而不是停在展开位（旧架构正是后者）。
  assert.ok(
    Math.abs(bandFlight.at(-1) - result.collapsedState.bandCenter) <= halfShift * 0.5,
    `收起动画末帧带心应已接近收起静止位（${result.collapsedState.bandCenter}），实测 ${bandFlight.at(-1)}`
    + '——若停在展开位说明轨道被钉在基准几何上（旧架构）',
  )
  // 宽度必须全程恒定：这是「不重排」的可执行判据。旧实现在动画期间把内容列加宽 shift，
  // 每帧触发整列文本重排——这条断言就是那次卡顿的回归防线。
  assert.ok(
    collapseFlight.every(row => row.centerWidth === collapseFlight[0].centerWidth),
    `收起动画期间内容列宽度必须恒定（改宽度 = 每帧全量文本重排，长对话下会卡）：实测 ${collapseFlight.map(r => r.centerWidth).join(',')}`,
  )
  assert.equal(result.collapsedState.track, 56, '收起落定后轨道必须是 56px')
  assert.equal(result.collapsedState.motion, null, '落定后必须清除动画标记')
  assert.equal(result.collapsedState.shiftVar, '', '落定后必须清理位移变量')
  assert.equal(result.collapsedState.centerWidth, 1224, '收起到位后内容列宽度必须等于 56px 几何下的轨道宽')
  assert.equal(result.collapsedState.handleExists, false, '宿主收起态不挂手柄')
  // 展开：基准轨道是收起几何，transform 从 0 连续单调推到 +shift/2；手柄从 56 视觉位滑到 240。
  // （位移取半个 shift 的几何原因见上方收起段的说明。）
  const expandFlight = result.expandRows.filter(row => row.motion !== null)
  assert.ok(expandFlight.length >= 6, `展开动画应有连续飞行帧，实测 ${expandFlight.length}`)
  assert.ok(
    expandFlight.every(row => row.track === expandFlight[0].track),
    `展开动画期间轨道必须全程恒定（同上，锁「恒定」而不是锁某个值）：实测 ${expandFlight.map(r => r.track).join(',')}`,
  )
  assert.ok(
    expandFlight.filter(row => row.shift < -4 && row.shift > -(halfShift - 4)).length >= 3,
    `展开必须有多个 transform 中间帧（实测 ${expandFlight.map(r => r.shift).join(',')}）`,
  )
  assert.ok(expandFlight.every((row, i) => i === 0 || row.shift >= expandFlight[i - 1].shift - 0.5), '展开位移必须单调递增（方向回归防线）')
  assert.ok(
    Math.abs(expandFlight.at(-1).shift) <= 8,
    `展开位移必须收敛到 0（轨道已提前切到目标几何），实测 ${expandFlight.at(-1).shift}`,
  )
  assert.ok(
    Math.abs(expandFlight[0].shift + halfShift) <= halfShift * 0.5,
    `展开动画起点应接近 -shift/2（${-halfShift}），实测 ${expandFlight[0].shift}`,
  )
  assert.ok(
    expandFlight.every(row => row.centerWidth === expandFlight[0].centerWidth),
    `展开动画期间内容列宽度必须恒定（改宽度 = 每帧全量文本重排）：实测 ${expandFlight.map(r => r.centerWidth).join(',')}`,
  )
  const handleRows = expandFlight.filter(row => row.handleLeft !== null)
  assert.ok(handleRows.length >= 6, '展开动画期间手柄必须在位')
  // 手柄视觉位（布局 left + transform）从收起位 56 单调滑向展开位 240。
  assert.ok(handleRows.every(row => row.handleLeft >= 55 && row.handleLeft <= 265), `手柄视觉位必须在 56→264 之间，实测 ${handleRows.map(r => r.handleLeft).join(',')}`)
  assert.ok(handleRows.every((row, i) => i === 0 || row.handleLeft >= handleRows[i - 1].handleLeft - 0.5), `手柄必须单调滑向展开位，实测 ${handleRows.map(r => r.handleLeft).join(',')}`)
  assert.ok(handleRows.filter(row => row.handleLeft > 62 && row.handleLeft < 258).length >= 3, '手柄必须有连续滑动中间帧')
  assert.ok(handleRows.at(-1).handleLeft > 200, `展开末帧手柄必须已接近展开位，实测 ${handleRows.at(-1).handleLeft}`)
  assert.equal(result.expandedState.track, 264, '展开落定后轨道必须回到展开宽度')
  assert.equal(result.expandedState.motion, null, '展开落定后必须清除动画标记')
  assert.equal(result.expandedState.handleLeft, 264, '展开落定后手柄布局位必须是 264')
  assert.ok(Math.abs(result.expandedState.handleVisual - 264) <= 1, `展开落定后手柄视觉位必须是 264，实测 ${result.expandedState.handleVisual}`)
  assert.equal(result.expandedState.centerWidth, 1016, '展开到位后内容列宽度必须回到展开几何（视口 1280 - 展开 264）')
  assert.equal(result.expandedState.shellWidth, 264, '展开到位后宽态外壳必须是展开宽度')
  // 反手切换：立即落定，无半程动画残留。
  assert.equal(result.reversal.track, 264, '反手切换到展开必须立即落定轨道')
  assert.equal(result.reversal.motion, null, '反手切换不得留下飞行动画')
  assert.equal(result.reversal.shift, 0, '反手切换后内容列必须回到布局位')

  // —— 帧成本与内容量脱钩（用户实测的回归防线）——
  // 旧实现（grid 过渡）在 1200 条消息下收起：500ms 内 26/30 帧、飞行平均 20.0ms、
  // 最大 37ms、8 帧超 20ms。新实现要求：飞行中零掉帧、平均贴近 vsync 基线。
  // 消息量必须覆盖**真实长对话**。2026-10-14 用户实测卡顿后才发现：旧实现在 1200 条时
  // 只是轻微掉帧（本脚本原本只测到这一档，所以长期没拦住问题），到 3000 条开始明显、
  // 8000 条时动画被压成 1 帧（完全不动）。因此这里必须包含 3000 / 8000 两档——
  // 「帧成本与内容量脱钩」这句话只在覆盖到真实量级时才成立。
  for (const messages of [10, 1200, 3000, 8000]) {
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
      const samples = []
      const began = performance.now()
      frame.setAttribute('data-sidebar-collapsed', '')
      frame.setAttribute('data-animating', '')
      frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
      let last = performance.now()
      // 采到落定之后再多采几帧。2026-10-14 修正口径：此前的实现只按「时间窗」切帧，
      // 把**动画结束后的落定帧**也算进「飞行中」，于是一次必然发生的落定重排把断言打红。
      // 正确口径是**按 motion 标记切**：飞行帧看流畅度，落定帧单独设界（见下方断言）。
      while (performance.now() - began < 520) {
        await nextFrame()
        const now = performance.now()
        samples.push({ delta: now - last, motion: frame.getAttribute('data-dcu-sidebar-motion') })
        last = now
      }
      dispose()
      const flightIdx = samples.map((s, i) => [s, i]).filter(([s]) => s.motion !== null).map(([, i]) => i)
      // 去掉两类**启动成本**，它们都不是「动画在跑时的流畅度」：
      //   1) 第 0 帧：轨道切换引发的整页重排。会话列真的变宽了，推挤布局无法避免
      //      （宿主自己也有，实测无插件时同为百毫秒级）。
      //   2) 起跑帧：motion 标记生效那一帧要为整个内容子树创建合成层，长对话下约 30ms。
      //      这是「让动画真的能播」的一次性代价——旧实现不付它，代价是动画完全不播（0 帧）。
      const startupFrame = flightIdx.length > 0 ? flightIdx[0] : -1
      const flight = flightIdx.filter(i => i > 0 && i !== startupFrame).map(i => samples[i].delta)
      const settleFrom = samples.findIndex((s, i) => i > 1 && samples[i - 1].motion !== null && s.motion === null)
      const settle = settleFrom === -1 ? [] : samples.slice(settleFrom).map(s => s.delta)
      return {
        total: samples.length,
        first: samples[0].delta,
        avg: flight.reduce((a, b) => a + b, 0) / Math.max(1, flight.length),
        max: flight.length > 0 ? Math.max(...flight) : 0,
        drops: flight.filter(d => d > 25).length,
        startupFrame: startupFrame >= 0 ? samples[startupFrame].delta : 0,
        settleMax: settle.length > 0 ? Math.max(...settle) : 0,
        // 动画是否**真的播了**。没有这两个数，下面几条断言在「动画被整个跳过」时会静默空转：
        // flight 为空 → drops=0、avg=0、startupFrame=0，全部满足。2026-10-19 实测验证过这个盲区。
        flightFrames: flightIdx.length,
        hadMotionMarker: flightIdx.length > 0,
      }
    })
    await heavy.close()
    // ★ 先断言「动画真的播了」，再断言它流畅。
    //
    // 2026-10-19 发现：`SIDEBAR_MOTION_MAX_ELEMENTS = 8000` 会让长会话**完全不播动画**
    // （beginSidebarMotion 直接返回 false），而下面三条「零掉帧 / 平均贴近基线 / 起跑帧有界」
    // 在 flight 为空时**全部空转通过**。于是这个脚本长期报绿，用户却在长会话里
    // 完全看不到动画——他说的「不丝滑」就是「没有动画」。
    //
    // 教训：任何「飞行期间某指标必须满足 X」的断言，前面必须先有一条「飞行期间确实有帧」。
    // 否则它衡量的是「不存在的东西很完美」。
    assert.ok(
      perf.hadMotionMarker && perf.flightFrames >= 3,
      `${messages} 条消息：动画必须真的播出来（至少 3 个飞行帧），实测 motion 标记 ${perf.hadMotionMarker ? '出现过' : '从未出现'}、飞行帧 ${perf.flightFrames} 个。` +
        `若这里为 0，说明有闸门把长会话的动画整个跳过了——此时下面「零掉帧」等断言是在空转，不能当通过。`,
    )
    // 飞行期间必须零掉帧：这是「长对话下动画不卡」的核心判据。
    assert.equal(perf.drops, 0, `${messages} 条消息：**动画飞行期间**不得有超过 25ms 的帧，实测 ${perf.drops} 个 / 最大 ${perf.max.toFixed(1)}ms`)
    assert.ok(perf.avg < 18.5, `${messages} 条消息：飞行中平均帧必须贴近 60Hz 基线，实测 ${perf.avg.toFixed(1)}ms`)
    // 起跑帧：为内容子树建合成层 + 该帧剩余的重排尾巴。**这是插件唯一允许的一次性成本**，
    // 必须存在（换来动画真的能播），但必须有界，防止退化成「每帧都在建层」。
    //
    // 上界按内容量分档（2026-10-19 校准，每档 5 次采样取上包络）：
    //   10 / 1200 条：≤120ms；3000 条：≤150ms；8000 条：≤220ms。
    // 排序依据不是"让测试变绿"，而是实测宿主自身在同一档就有的固有首帧成本：
    //   8000 条、完全禁用插件动画时，宿主自己切轨道也要 105.8ms 首帧。
    //   插件的起跑帧落在 133–140ms，即**插件附加约 30ms**——这与「建层成本」量级一致。
    // 所以这里量的其实是"插件没把成本翻倍"，而不是"绝对时间是 0"。
    const startupBudget = messages <= 1200 ? 120 : messages <= 3000 ? 150 : 220
    assert.ok(
      perf.startupFrame <= startupBudget,
      `${messages} 条消息：动画起跑帧不得超过 ${startupBudget}ms（建合成层 + 该帧剩余重排；宿主自身同名成本约 106ms @8000），实测 ${perf.startupFrame.toFixed(1)}ms`,
    )
    // 落定那一刻会话列宽度真的变了（240→56），整列文本必须重新排版——这是**推挤布局的固有代价**，
    // 宿主自己也不例外（无插件时同样量到百毫秒级首帧）。这里把它单独设界而不是混进飞行帧：
    // 允许一次、且必须有界，防止它退化成「每次开合都卡一下」。
    assert.ok(
      perf.settleMax <= 80,
      `${messages} 条消息：落定重排不得超过 80ms（会话列变宽是推挤架构的固有代价，但不应失控），实测 ${perf.settleMax.toFixed(1)}ms`,
    )
  }

  // —— reduced-motion：不播动画，直接落定 ——
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(async () => {
    const frame = document.getElementById('frame')
    const nextFrame = () => new Promise(requestAnimationFrame)
    // 主测试段已 dispose，这里重新建立监听（否则 toggle 无人响应，断言空转）。
    const dispose = observeSlimSidebar()
    frame.removeAttribute('data-sidebar-collapsed')
    frame.style.gridTemplateColumns = '264px minmax(0px, 1fr) minmax(0px, 0px)'
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
    frame.style.gridTemplateColumns = '264px minmax(0px, 1fr) minmax(0px, 0px)'
    for (let i = 0; i < 6; i++) await nextFrame()
    frame.setAttribute('data-sidebar-collapsed', '')
    frame.style.gridTemplateColumns = '0px minmax(0px, 1fr) minmax(0px, 0px)'
    // 等 **2** 帧：2026-10-14 起动画刻意延后一帧起跑（本帧留给轨道重排，见 sidebar-width.ts），
    // 所以第 1 帧还没有 motion 标记。只等 1 帧会把「实现改对了」误判成「前置动画没在飞」。
    await nextFrame()
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
  assert.equal(dragging.settled.track, 264, '拖拽测试前必须处于展开静止态')
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
    frame.style.gridTemplateColumns = '264px minmax(0px, 1fr) minmax(0px, 0px)'
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
  // 意图：内容列的宽度**不得**参与过渡/动画（那会每帧全量文本重排）。
  // 2026-10-14：实现已由 transition 改为 animation（起点需显式指定），
  // 所以这里锁「不得过渡 width」而不是锁「值等于 transform」。
  const centerAnim = await page.evaluate(() => {
    const el = document.querySelector('[data-dcu-center-column]')
    if (el === null) return null
    const cs = getComputedStyle(el)
    return { transitionProperty: cs.transitionProperty, animationName: cs.animationName }
  })
  assert.ok(centerAnim !== null, '必须能取到内容列的计算样式')
  assert.ok(
    !/\bwidth\b/.test(centerAnim.transitionProperty),
    `内容列的 transition 不得包含 width（每帧改宽度 = 每帧全量文本重排），实测 ${centerAnim.transitionProperty}`,
  )
  // 同样锁「轨道静止」而不是「等于 240」：架构已改为动画开始即切目标几何，
  // 轨道值不同但**恒定**才是要守的性质（逐帧改轨道等于每帧整页重排）。
  assert.ok(
    compatible.rows.length >= 8 && compatible.rows.every(row => row.track === compatible.rows[0].track),
    `组合布局中收起动画轨道必须保持静止，实测 ${compatible.rows.map(r => r.track).join(',')}`,
  )
  // 收起动画：起点在 +shift/2 侧、单调收敛到 0（见上方架构说明）。
  assert.ok(
    compatible.rows.filter(row => row.shift > 4 && row.shift < 180).length >= 3,
    `组合布局中内容列必须有连续位移帧，实测 ${compatible.rows.map(r => r.shift).join(',')}`,
  )
  assert.equal(compatible.leftDrag, '0s', '拖拽中帧过渡必须为 0s')
  assert.equal(compatible.rightDrag, '0s', '伴随插件拖拽时帧过渡必须为 0s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('frame')).transitionDuration), '0s', '减少动态效果时帧过渡必须为 0s')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  console.log(`侧栏过渡：合成层动画通过——收起/展开各 ${result.collapseRows.length}/${result.expandRows.length} 帧采样，轨道静止、transform 收敛、帧成本与内容量脱钩。`)
} finally {
  await browser.close()
}
