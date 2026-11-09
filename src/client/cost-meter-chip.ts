/**
 * cost-meter 页脚「峰时」chip 的自适应补偿（2026-11-09）。
 *
 * 背景：2.3.3 为**周末长文本**（「周末时段——全含价 · 32小时12分后进入高峰」）做过一次性补偿：
 *   letter-spacing:-.5px + padding 归零 + margin-left:-8px，凑出 25px 让长文本单行放下。
 * 那套补偿写成了无条件规则（`.cm-footer-stack.simple .cm-peak-classic-chip`），于是文本一短
 *（工作日「峰时 · 1小时19分后进入平价」）它就变成纯错位：实测 chip 左缘 16px，而进度条
 * 起点 24px、上方「今日/余额」行文本起点 16px —— 补丁在被补偿对象消失后仍在生效。
 *
 * 修法：把补偿变成**条件补偿**——只在文本真的溢出时加 `data-dcu-cm-compact`，
 * 长文本回来时自动恢复整套补偿，短文本时一概不补。CSS 侧三条补偿规则全部挂在这个
 * 属性选择器下（强制优先级预算不动，见 structure-budget）。
 *
 * 与既有契约模块同构：MutationObserver 监听子树变化（文本随时段切换），
 * 幂等安装（同元素只绑一次），卸载时断开。
 */

const CHIP_SELECTOR = '.cm-peak-classic-chip'
const STACK_SELECTOR = '.cm-footer-stack'
const COMPACT_ATTR = 'data-dcu-cm-compact'

/** 溢出判据：滚动宽度超过客户区 1px 以上才算真的放不下（亚像素抗锯齿不算）。 */
const OVERFLOW_TOLERANCE = 1

interface BoundState {
  observer: MutationObserver
}

const bound = new WeakMap<HTMLElement, BoundState>()
let rootObserver: MutationObserver | undefined
let installed = false

/**
 * 把 chip 的补偿状态对齐到当前文本宽度。
 *
 * 先把上一次的补偿摘掉再量——否则 `margin-left:-8px` 会让 chip 测量宽度失真，
 * 短文本可能被误判成"已溢出"。
 */
function syncChip(chip: HTMLElement): void {
  chip.removeAttribute(COMPACT_ATTR)
  // 强制同步布局后再读，摘掉补偿后的宽度才是文本真实需求宽度。
  const overflowing = chip.scrollWidth > chip.clientWidth + OVERFLOW_TOLERANCE
  if (overflowing) chip.setAttribute(COMPACT_ATTR, '')
}

function bindChip(chip: HTMLElement): void {
  if (bound.has(chip)) {
    syncChip(chip)
    return
  }
  const observer = new MutationObserver(() => { syncChip(chip) })
  // 文本在 chip 内部换节点（时段切换），只关心子树文本变化。
  observer.observe(chip, { childList: true, characterData: true, subtree: true })
  bound.set(chip, { observer })
  syncChip(chip)
}

function scanAndBind(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(CHIP_SELECTOR).forEach(bindChip)
}

/**
 * 安装：绑定现存 chip，并监听后续挂载（侧栏收起/展开、时段刷新都会重建节点）。
 * 返回卸载函数；幂等（重复调用不会叠观察器）。
 */
export function observeCostMeterFooter(): () => void {
  if (typeof document === 'undefined' || installed) return () => {}
  installed = true
  scanAndBind(document)
  rootObserver = new MutationObserver(() => { scanAndBind(document) })
  rootObserver.observe(document.body, { childList: true, subtree: true })
  return () => {
    rootObserver?.disconnect()
    rootObserver = undefined
    installed = false
  }
}

export const COST_METER_CHIP_SELECTOR = CHIP_SELECTOR
export const COST_METER_STACK_SELECTOR = STACK_SELECTOR
export const COST_METER_COMPACT_ATTR = COMPACT_ATTR
