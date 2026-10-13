/**
 * 触屏（pointer:coarse）会话行操作常驻 —— 几何与可见性验证（2026-10-14）。
 *
 * ZCode TaskListItem：`(hover:none)`（触屏）时操作按钮常驻（isHoverNone →
 * shouldMountWorkspaceTaskActions）——「触屏必须能看到操作」。
 * 本仓同一原则：快捷归档与 ⋯ 菜单锚点常驻；因时间/操作均为绝对定位，本脚本用
 * **边界盒**断言三者互不重叠（触屏下时间右移至 60px 让位）；待处理胶囊占位时除外。
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
    await page.addStyleTag({ content: fixtureTokenStyle() })
    await page.addStyleTag({ content: fixtureThemeStyle() })
    await page.addStyleTag({ content: stylesheet[1] })
    return await page.evaluate(() => {
      const row = document.querySelector('.dcu-wb-session')
      const pick = (sel) => {
        const el = row.querySelector(sel)
        if (el === null) return null
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, opacity: cs.opacity, pointerEvents: cs.pointerEvents, display: cs.display, visibility: cs.visibility }
      }
      const rowRect = row.getBoundingClientRect()
      const byRow = (m) => m === null ? null : { ...m, gapRight: Math.round(rowRect.right - m.right) }
      return {
        coarse: matchMedia('(pointer:coarse)').matches,
        rowRight: rowRect.right,
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
  // 1) 触屏 + 无待处理：两个操作常驻、时间左移让位、边界盒互不重叠
  const coarse = await measure(browser, { touch: true, pending: false })
  assert.equal(coarse.coarse, true, '触屏上下文的 (pointer:coarse) 必须命中（夹具前提）')
  assert.equal(coarse.quick.opacity, '1', '触屏下快捷归档必须常驻（ZCode hover:none 同原则）')
  assert.equal(coarse.quick.pointerEvents, 'auto', '触屏下快捷归档必须可点')
  assert.equal(coarse.anchor.opacity, '1', '触屏下 ⋯ 菜单锚点必须常驻')
  assert.equal(coarse.anchor.pointerEvents, 'auto', '触屏下 ⋯ 菜单锚点必须可点')
  assert.equal(coarse.rowPadRight, '110px', '有时间的会话行必须为「时间 + 两个操作」预留 110px')
  assert.equal(coarse.quick.gapRight, 8, '快捷归档固定在最右侧 8px')
  assert.equal(coarse.anchor.gapRight, 32, '⋯ 菜单锚点固定在右侧 32px')
  assert.equal(coarse.time.gapRight, 60, '触屏下时间必须左移到 60px 为操作让位')
  assert.ok(coarse.time.right <= coarse.anchor.left, '时间与 ⋯ 不得重叠')
  assert.ok(coarse.anchor.right <= coarse.quick.left, '⋯ 与快捷归档不得重叠')
  assert.ok(coarse.title.gapRight >= 108, '标题必须为「时间 + 操作」整段让位（padding-right 110px）')

  // 2) 触屏 + 待处理胶囊：胶囊本身是行动号召，操作不得常驻与它抢位
  const pending = await measure(browser, { touch: true, pending: true })
  assert.equal(pending.quick.opacity, '0', '待处理胶囊占位时快捷归档不得常驻（避免与胶囊重叠）')
  assert.equal(pending.actions.display, 'none', '待处理胶囊占位时 ⋯ 锚点组不得常驻')

  // 3) 桌面（非触屏）：悬停/聚焦揭示语义不得受影响（回归保护）
  const desktop = await measure(browser, { touch: false, pending: false })
  assert.equal(desktop.coarse, false, '非触屏上下文不得命中 (pointer:coarse)')
  assert.equal(desktop.quick.opacity, '0', '桌面下快捷归档必须等待悬停/聚焦（不得常驻）')
  assert.equal(desktop.anchor.opacity, '0', '桌面下 ⋯ 锚点必须保持隐藏（菜单经右键唤出）')

  console.log('✓ 触屏会话行：操作常驻、时间让位 60px、三者几何互不重叠；桌面揭示语义未受影响')
} finally {
  await browser.close()
}
