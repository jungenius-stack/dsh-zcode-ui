/**
 * 触屏（pointer:coarse）会话行操作 —— 几何与可见性验证（2026-10-14，1.11.0 改单一入口）。
 *
 * ZCode TaskListItem：`(hover:none)`（触屏）时操作按钮常驻（isHoverNone →
 * shouldMountWorkspaceTaskActions）——「触屏必须能看到操作」。
 * 本仓同一原则，但 1.11.0 起收窄为**单一入口**：触屏只保留 ⋯ 菜单锚点常驻，
 * 快捷归档退场（归档走菜单；两个 44px 常驻位曾把 240px 侧栏的标题压到 54px）。
 * 因时间/操作均为绝对定位，本脚本用**边界盒**断言互不重叠（触屏下时间右移让位）；
 * 待处理胶囊占位时除外（胶囊本身是行动号召）。
 * 桌面（非触屏）的悬停/聚焦揭示语义不得受影响（回归保护）。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixtureTokenStyle, fixtureThemeStyle } from './fixture-tokens.mjs'

const root = new URL('../', import.meta.url)
const read = (name) => readFileSync(new URL(`src/client/${name}`, root), 'utf8')
const stylesheet = read('CodexWorkspaceBrowser.tsx').match(/const stylesheet = `([\s\S]*?)`/)
assert.ok(stylesheet, 'CodexWorkspaceBrowser.tsx 的样式抽取失败（变量名被改时会失败）')

const rowHtml = (pending) => `<aside class="dcu-root"><div class="dcu-wb" style="width:260px"><div class="dcu-wb-session" data-dcu-session="s1">
  <span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">一个用于触屏几何验证的会话标题，故意放长一些</span></span>
  ${pending ? '<span class="dcu-wb-pending" data-state="warning"><span class="dcu-wb-pending-dot" aria-hidden="true"></span><span class="dcu-wb-pending-label">等待审批</span></span>' : ''}
  <span class="dcu-wb-session-time">19小时前</span>
  <span class="dcu-wb-quick-actions"><button type="button" class="dcu-wb-more" aria-label="归档会话">A</button></span>
  <span class="dcu-wb-actions"><button type="button" class="dcu-wb-more dcu-wb-context-anchor" aria-label="会话操作">M</button></span>
</div></div></aside>`

async function measure(browser, { touch, pending }) {
  const context = touch
    ? await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 480 } })
    : await browser.newContext({ viewport: { width: 320, height: 480 } })
  try {
    const page = await context.newPage()
    await page.setContent(rowHtml(pending))
    // 本夹具只测几何（位置/尺寸/显隐），不测颜色；显式传 'light' 是为了一旦将来
    // 有人在这里加颜色断言，不会 silently 拿到暗色令牌（fixture-tokens 的 modality 契约）。
    await page.addStyleTag({ content: fixtureTokenStyle('light') })
    await page.addStyleTag({ content: fixtureThemeStyle() })
    await page.addStyleTag({ content: stylesheet[1] })
    return await page.evaluate(() => {
      const row = document.querySelector('.dcu-wb-session')
      const pick = (sel) => {
        const el = row.querySelector(sel)
        if (el === null) return null
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, width: Math.round(r.width), height: Math.round(r.height), opacity: cs.opacity, pointerEvents: cs.pointerEvents, display: cs.display, visibility: cs.visibility }
      }
      const rowRect = row.getBoundingClientRect()
      const byRow = (m) => m === null ? null : { ...m, gapRight: Math.round(rowRect.right - m.right) }
      return {
        coarse: matchMedia('(pointer:coarse)').matches,
        rowRight: rowRect.right,
        rowHeight: Math.round(rowRect.height),
        rowPadRight: getComputedStyle(row).paddingRight,
        title: byRow(pick('.dcu-wb-session-title')),
        time: byRow(pick('.dcu-wb-session-time')),
        quick: byRow(pick('.dcu-wb-quick-actions')),
        anchor: byRow(pick('.dcu-wb-actions .dcu-wb-context-anchor')),
        actions: pick('.dcu-wb-actions'),
      }
    })
  } finally {
    await context.close()
  }
}

const browser = await chromium.launch({ headless: true })
try {
  // 1) 触屏 + 无待处理：**单一入口**（⋯ 常驻），快捷归档退场，时间左移让位
  //    1.10.0 曾让两个按钮都常驻且 44×44：预留 156px，240px 侧栏内容宽只剩 84px、
  //    标题元素实测仅 54px（KNOWN-ISSUES §21.2 记的是内容宽口径）。
  //    1.11.0 改为触屏只留 ⋯ 一个入口：归档移进菜单，多一次点击；
  //    同一夹具实测预留降到 120px、标题元素回到 90px（行首还要让 30px 状态槽）。
  const coarse = await measure(browser, { touch: true, pending: false })
  assert.equal(coarse.coarse, true, '触屏上下文的 (pointer:coarse) 必须命中（夹具前提）')
  assert.equal(coarse.quick.display, 'none', '触屏下快捷归档必须退场（单一入口原则，归档走菜单）')
  assert.equal(coarse.anchor.opacity, '1', '触屏下 ⋯ 菜单锚点必须常驻')
  assert.equal(coarse.anchor.pointerEvents, 'auto', '触屏下 ⋯ 菜单锚点必须可点')
  assert.equal(coarse.rowPadRight, '120px', '有时间的会话行必须为「时间 + 一个 44px 操作」预留 120px')
  assert.equal(coarse.anchor.gapRight, 8, '⋯ 菜单锚点固定在右侧 8px')
  assert.equal(coarse.time.gapRight, 56, '触屏下时间必须左移到 56px 为操作让位')
  assert.ok(coarse.time.right <= coarse.anchor.left, '时间与 ⋯ 不得重叠')
  assert.ok(coarse.title.gapRight >= 118, '标题必须为「时间 + 操作」整段让位（padding-right 120px）')

  // 1b) 触屏目标尺寸：WCAG 2.2 AA 2.5.8 要求 ≥24×24，触屏惯例是 44×44。
  assert.ok(coarse.rowHeight >= 44, `触屏下会话行高必须 ≥44px，实测 ${coarse.rowHeight}px`)
  assert.ok(coarse.anchor.width >= 44 && coarse.anchor.height >= 44, `触屏下 ⋯ 锚点目标必须 ≥44×44，实测 ${coarse.anchor.width}×${coarse.anchor.height}`)

  // 2) 触屏 + 待处理胶囊：胶囊本身是行动号召，操作不得常驻与它抢位
  const pending = await measure(browser, { touch: true, pending: true })
  assert.equal(pending.quick.display, 'none', '待处理胶囊占位时快捷归档不得常驻（避免与胶囊重叠）')
  assert.equal(pending.actions.display, 'none', '待处理胶囊占位时 ⋯ 锚点组不得常驻')

  // 3) 桌面（非触屏）：悬停/聚焦揭示语义不得受影响（回归保护）
  const desktop = await measure(browser, { touch: false, pending: false })
  assert.equal(desktop.coarse, false, '非触屏上下文不得命中 (pointer:coarse)')
  assert.equal(desktop.quick.display, 'none', '桌面下快捷归档必须等待悬停/聚焦（不得常驻）')
  assert.equal(desktop.anchor.opacity, '0', '桌面下 ⋯ 锚点必须保持隐藏（菜单经右键唤出）')

  console.log('✓ 触屏会话行：单一操作入口（⋯ 44×44）、快捷归档退场、时间让位 56px、标题预留 120px（240px 夹具实测标题元素 90px，1.10.0 双入口时为 54px）；桌面揭示语义未受影响')
} finally {
  await browser.close()
}
