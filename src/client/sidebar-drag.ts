import { CODEX_SIDEBAR_MIN_PX } from './sidebar-width.ts'

const SIDEBAR_MAX_PX = 420

/**
 * 越过最小宽度后，还要再左拖这么多像素才收起。
 *
 * 为什么不能再用「起始宽的一半」：
 *   旧判定 `startX - endX > startWidth / 2` 与「拖到 MIN」完全脱钩。
 *   实测（264 起拖，MIN=240）：宽度在左拖 32px 时就卡在 240 不动，
 *   却要拖到 136px 才收起 —— 中间 104px 的拖动**毫无视觉反馈**，这就是「手感不对」。
 *   且死区随起始宽漂移：300 起拖时 90px、420 时 30px，同一个手势在不同宽度下行为不一致。
 *
 * 现判定：以「越过 MIN 的超出量」为准，死区恒为 COLLAPSE_OVERSHOOT_PX，
 * 与起始宽度无关。取 32px 而非 0，是为了避免「拖到最低再抖 1px 就整栏收起」的误触。
 */
const COLLAPSE_OVERSHOOT_PX = 32

/** 左拖越过最小宽度、并再多拖 COLLAPSE_OVERSHOOT_PX 时收起侧栏。 */
export function shouldCollapseOnSidebarDrag(startWidth: number, startX: number, endX: number): boolean {
  const shrink = startX - endX
  const shrinkToMin = startWidth - CODEX_SIDEBAR_MIN_PX
  // 已经窄到 MIN 以下：只有超出量够大才算「收起」这个明确手势。
  if (shrink > shrinkToMin) return shrink - shrinkToMin >= COLLAPSE_OVERSHOOT_PX
  // 还没到 MIN：还有一种情形要能收起 —— 起始宽本就等于 MIN（没有可缩空间），
  // 此时 shrinkToMin=0，上式已覆盖；这里兜住 shrinkToMin<0 的异常值。
  return false
}

/** 直接按可见宽度计算拖拽结果，绕开宿主与 Codex 不一致的最小宽度。 */
export function sidebarWidthDuringDrag(startWidth: number, startX: number, currentX: number): number {
  return Math.min(SIDEBAR_MAX_PX, Math.max(CODEX_SIDEBAR_MIN_PX, startWidth + currentX - startX))
}

export function isSidebarDragHandle(target: EventTarget | null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => { className?: string } | null }
  const handle = el.closest('[data-side="sidebar"]')
  return handle !== null && String(handle.className).includes('handle')
}
