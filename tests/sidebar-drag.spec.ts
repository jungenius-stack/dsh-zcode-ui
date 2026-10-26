/**
 * 侧栏拖拽判定的双向断言。
 *
 * 为什么必须有这个文件：`shouldCollapseOnSidebarDrag` 此前**零测试覆盖**，
 * 而它的旧实现有 104px 死区（拖到 MIN 后继续拖毫无反馈）。零覆盖 + 无人量化
 * 是它能长期存在的原因。这里把「手感」钉成可回归的数字。
 *
 * 双向纪律（QA-003）：既断言「该收起的收起」，也断言「不该收起的不收起」，
 * 只断言一个方向等于给 bug 留后门。
 */
import { describe, expect, it } from 'vitest'
import { shouldCollapseOnSidebarDrag, sidebarWidthDuringDrag } from '../src/client/sidebar-drag.ts'
import { CODEX_SIDEBAR_DEFAULT_PX, CODEX_SIDEBAR_MIN_PX } from '../src/client/sidebar-width.ts'

/** 把「左拖 dx 像素」翻译成 endX（startX 取 0 即可，函数只用差值）。 */
const dragLeft = (startWidth: number, dx: number) => shouldCollapseOnSidebarDrag(startWidth, 0, -dx)

describe('侧栏拖拽：宽度跟随', () => {
  it('右拖 1:1 跟手（未触顶时）', () => {
    const start = 264
    for (const dx of [10, 40, 80, 120]) {
      expect(sidebarWidthDuringDrag(start, 0, dx)).toBe(start + dx)
    }
  })

  it('左拖 1:1 跟手，直到 MIN 为止', () => {
    const start = CODEX_SIDEBAR_DEFAULT_PX
    const room = start - CODEX_SIDEBAR_MIN_PX
    for (const dx of [-4, -8, -16]) {
      if (Math.abs(dx) <= room) expect(sidebarWidthDuringDrag(start, 0, dx)).toBe(start + dx)
    }
  })

  it('宽度不得低于 MIN、不得高于 420', () => {
    expect(sidebarWidthDuringDrag(264, 0, -999)).toBe(CODEX_SIDEBAR_MIN_PX)
    expect(sidebarWidthDuringDrag(264, 0, 999)).toBe(420)
  })
})

describe('侧栏拖拽：收起判定（双向）', () => {
  const start = CODEX_SIDEBAR_DEFAULT_PX // 264
  const room = start - CODEX_SIDEBAR_MIN_PX // 24

  it('还没拖到 MIN 时，绝不收起', () => {
    for (const dx of [0, 4, 8, room - 1]) expect(dragLeft(start, dx)).toBe(false)
  })

  it('刚拖到 MIN（可缩空间耗尽）时，仍不收起', () => {
    expect(dragLeft(start, room)).toBe(false)
  })

  it('越过 MIN 但不足保护量时，不收起（防误触）', () => {
    for (const extra of [1, 8, 16, 31]) expect(dragLeft(start, room + extra)).toBe(false)
  })

  it('越过 MIN 且超出保护量时，收起', () => {
    for (const extra of [32, 40, 80]) expect(dragLeft(start, room + extra)).toBe(true)
  })

  it('死区恒定：与起始宽度无关', () => {
    // 旧实现按 startWidth/2 判定，死区随起始宽漂移（300→90px、420→30px）。
    // 现判定以「越过 MIN 的超出量」为准，任意起始宽的死区都等于保护量。
    const deadZones = [240, 264, 300, 360, 420].map((w) => {
      const r = w - CODEX_SIDEBAR_MIN_PX
      let dz = 0
      for (let extra = 1; extra <= 200; extra++) {
        if (shouldCollapseOnSidebarDrag(w, 0, -(r + extra))) { dz = extra; break }
      }
      return dz
    })
    expect(new Set(deadZones).size).toBe(1)
    expect(deadZones[0]).toBe(32)
  })

  it('回归防线：旧实现（startWidth/2）的死区远大于新实现', () => {
    // 把「已修复的缺陷」写成可回归的量，防止有人改回 startWidth/2。
    // 这里不锁死具体像素数（MIN 会变、死区随之变），而是锁「旧实现死区显著大于
    // 新实现的 32px 保护量」这一关系——任何 MIN 取值下都成立。
    const legacy = (sw: number, dx: number) => dx > sw / 2
    const legacyDeadZone = (() => {
      const r = start - CODEX_SIDEBAR_MIN_PX
      for (let extra = 1; extra <= 400; extra++) if (legacy(start, r + extra)) return extra
      return -1
    })()
    const newDeadZone = (() => {
      const r = start - CODEX_SIDEBAR_MIN_PX
      for (let extra = 1; extra <= 400; extra++) {
        if (shouldCollapseOnSidebarDrag(start, 0, -(r + extra))) return extra
      }
      return -1
    })()
    expect(newDeadZone).toBe(32)
    expect(legacyDeadZone).toBeGreaterThan(newDeadZone * 2)
  })
})
