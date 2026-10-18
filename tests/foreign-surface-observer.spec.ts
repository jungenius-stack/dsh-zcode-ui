import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { observeForeignSurfaces } from '../src/client/foreign-surface-discovery.ts'

/**
 * 回归：外来表面哨兵曾经监听 body 的每一次 childList，然后对会话区**全部分支**
 * 逐个 getComputedStyle。长会话（2 万节点）里，宿主挂载/卸载一条悬停操作条
 * 就会触发 200–300ms 的全量扫描，表现为「鼠标划过消息就卡」。
 *
 * 这些用例锁住三件事：
 * 1. 初始化不同步扫全树（首帧前不调 getComputedStyle）；
 * 2. 悬停这类"新增 5 个节点"的变更只扫新增子树，不重扫既有 200 个节点；
 * 3. surface 外部的变更完全忽略。
 */

const FOREIGN_FONT = 'system-ui'
const FOREIGN_SIZE = '13px'

let nextFrame = 0
let frames: Map<number, FrameRequestCallback>

beforeEach(() => {
  nextFrame = 0
  frames = new Map()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id) })
  document.body.innerHTML = `
    <section class="dcu-root">
      <span class="dcu-wb-session-title-text" style="font-family: ${FOREIGN_FONT}">会话</span>
      <div class="dcu-wb-session">侧栏</div>
    </section>
    <div data-conversation-scroll style="font-family: ${FOREIGN_FONT}">
      <div class="icaHSq_column"></div>
    </div>
  `
  // 200 个既有外来元素：旧实现会为它们逐个付 getComputedStyle。
  const column = document.querySelector('.icaHSq_column') as HTMLElement
  for (let index = 0; index < 200; index += 1) {
    const row = document.createElement('div')
    row.className = 'icaHSq_flowItem'
    row.style.fontFamily = FOREIGN_FONT
    row.style.fontSize = FOREIGN_SIZE
    column.append(row)
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** 把当前排队的 rAF 回调跑完（回调里再排队的会在下一轮继续跑）。 */
async function settleFrames(passes = 20): Promise<void> {
  for (let pass = 0; pass < passes; pass += 1) {
    await new Promise(resolve => window.setTimeout(resolve, 0))
    const callbacks = [...frames.values()]
    frames.clear()
    for (const callback of callbacks) callback(performance.now())
  }
}

test('初始化不同步扫全树：首帧前不触发 getComputedStyle', async () => {
  const computed = vi.spyOn(window, 'getComputedStyle')
  const stop = observeForeignSurfaces(document.body)

  expect(computed).not.toHaveBeenCalled()

  await settleFrames()
  expect(computed.mock.calls.length).toBeGreaterThan(0)
  stop()
})

test('同一前缀只抽样 4 个，不对 200 个逐个体检', async () => {
  // 长会话里 `icaHSq_flowItem` 同一前缀有 844 个；逐个 getComputedStyle
  // 在打开会话时实测 796ms。哨兵只需要"这个前缀不对"的证据，不需要 200 次。
  const computed = vi.spyOn(window, 'getComputedStyle')
  const stop = observeForeignSurfaces(document.body)
  await settleFrames()

  expect(computed.mock.calls.length).toBeLessThanOrEqual(6)
  stop()
})

test('悬停操作条挂载只扫新增的 5 个节点，不重扫既有 200 个', async () => {
  const stop = observeForeignSurfaces(document.body)
  await settleFrames()

  const column = document.querySelector('.icaHSq_column') as HTMLElement
  const computed = vi.spyOn(window, 'getComputedStyle')
  computed.mockClear()

  // 宿主悬停时挂载的一条操作条（真实宿主是 5 个节点）。
  const actions = document.createElement('div')
  actions.className = 'ppByMG_actions'
  actions.style.fontFamily = FOREIGN_FONT
  actions.innerHTML = '<span class="ppByMG_timeStart">18:58</span><button class="ppByMG_action">复制</button>'
  column.append(actions)
  await settleFrames()

  expect(computed.mock.calls.length).toBeLessThanOrEqual(6)
  stop()
})

test('surface 外部的变更完全忽略', async () => {
  const stop = observeForeignSurfaces(document.body)
  await settleFrames()

  const computed = vi.spyOn(window, 'getComputedStyle')
  computed.mockClear()

  const portal = document.createElement('div')
  portal.className = 'host-portal'
  portal.style.fontSize = '11px'
  document.body.append(portal)
  await settleFrames()

  expect(computed).not.toHaveBeenCalled()
  stop()
})

test('挂载后立即卸载的悬停节点不扫描，也不误报', async () => {
  // 宿主悬停操作条可能在下一帧前就卸载；对已脱离文档的元素
  // getComputedStyle 返回空字号/圆角，旧实现会把它当成漂移报出来。
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const stop = observeForeignSurfaces(document.body)
  await settleFrames()

  const computed = vi.spyOn(window, 'getComputedStyle')
  computed.mockClear()

  const column = document.querySelector('.icaHSq_column') as HTMLElement
  const transient = document.createElement('div')
  transient.className = 'ppByMG_actions'
  column.append(transient)
  transient.remove()
  await settleFrames()
  await new Promise(resolve => window.setTimeout(resolve, 500))

  expect(computed).not.toHaveBeenCalled()
  expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('ppByMG'))
  stop()
})

test('未登记的外来根仍会被发现并告警（功能未被性能修复阉割）', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const stop = observeForeignSurfaces(document.body)
  await settleFrames()

  const column = document.querySelector('.icaHSq_column') as HTMLElement
  const alien = document.createElement('div')
  alien.className = 'zzalien_root'
  alien.style.fontFamily = 'Comic Sans MS'
  alien.style.fontSize = '11.37px'
  column.append(alien)

  // 扫描本身在 rAF 里；告警由 setTimeout 延迟 400ms（给 count 攒样本）。
  await settleFrames()
  await new Promise(resolve => window.setTimeout(resolve, 500))

  expect(warn).toHaveBeenCalledWith(expect.stringContaining('外来表面未达标'))
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('zzalien'))
  stop()
})
