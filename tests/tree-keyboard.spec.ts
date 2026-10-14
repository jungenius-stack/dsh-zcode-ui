/**
 * ARIA 树键盘模型（`tree-keyboard.ts`）的行为测试。
 *
 * 夹具刻意复刻侧栏的真实嵌套：树 → 分区头 treeitem → group → 项目 treeitem →
 * group → 会话 treeitem，中间夹着**没有 role 的纯结构 div**（真实代码里是
 * `.dcu-wb-pinned-list` / `.dcu-wb-collections` / `.dcu-wb-group-member` 这类包裹层）。
 * 那正是此前 treeitem 归属被打断的原因，所以夹具必须保留它们。
 */
import { expect, test, beforeEach, afterEach } from 'vitest'
import { installTreeKeyboard, visibleTreeItems } from '../src/client/tree-keyboard.ts'

const FIXTURE = `
<div id="tree" role="tree">
  <div class="wrapper">
    <button type="button" role="treeitem" class="head" aria-expanded="true">置顶</button>
    <div class="body" role="group" data-open="true">
      <div class="list">
        <div class="project" role="treeitem" aria-expanded="true">项目 A</div>
        <div class="sessions" role="group" data-open="true">
          <div class="member"><div class="row" role="treeitem" aria-selected="true">会话 1</div></div>
          <div class="member"><div class="row" role="treeitem">会话 2</div></div>
        </div>
        <div class="project" role="treeitem" aria-expanded="false">项目 B</div>
        <div class="sessions" role="group" data-open="false">
          <div class="member"><div class="row" role="treeitem">会话 3</div></div>
        </div>
      </div>
    </div>
  </div>
</div>`

let dispose: (() => void) | undefined

beforeEach(() => {
  document.body.innerHTML = FIXTURE
  const tree = document.getElementById('tree')
  if (tree === null) throw new Error('夹具未渲染')
  dispose = installTreeKeyboard(tree)
})

afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ''
})

const tree = (): HTMLElement => document.getElementById('tree') as HTMLElement
const items = (): HTMLElement[] => [...tree().querySelectorAll<HTMLElement>('[role="treeitem"]')]
const visible = (): HTMLElement[] => visibleTreeItems(tree())
const active = (): Element | null => document.activeElement
const press = (key: string): void => {
  const target = active()
  if (!(target instanceof HTMLElement)) throw new Error('没有聚焦元素')
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

test('roving tabindex：全树只有一个可 Tab 项，且是选中项', () => {
  const tabbable = items().filter(item => item.tabIndex === 0)
  expect(tabbable).toHaveLength(1)
  expect(tabbable[0]?.textContent).toBe('会话 1')
  // 其余一律 -1，否则 100 个会话就是 100 次 Tab。
  for (const item of items().filter(item => item !== tabbable[0])) expect(item.tabIndex).toBe(-1)
})

test('aria-level 按 role="group" 嵌套推导（treeitem 的必填属性）', () => {
  const level = (text: string): string | null =>
    items().find(item => item.textContent === text)?.getAttribute('aria-level') ?? null
  expect(level('置顶')).toBe('1')
  expect(level('项目 A')).toBe('2')
  expect(level('会话 1')).toBe('3')
})

test('纯结构包裹层被标为 presentation，treeitem 归属不再被夹断', () => {
  // ARIA 要求 treeitem 由 tree 或 group 直接拥有；中间的裸 div 会让树结构散架。
  for (const cls of ['wrapper', 'list', 'member']) {
    expect(tree().querySelector<HTMLElement>(`.${cls}`)?.getAttribute('role')).toBe('presentation')
  }
  // 已有显式 role 的元素不得被覆盖。
  expect(tree().querySelector<HTMLElement>('.body')?.getAttribute('role')).toBe('group')
  expect(tree().querySelector<HTMLElement>('.project')?.getAttribute('role')).toBe('treeitem')
})

test('折叠子树不参与键盘遍历', () => {
  // 项目 B 收起 → 会话 3 不可见。
  expect(visible().map(item => item.textContent)).toEqual(['置顶', '项目 A', '会话 1', '会话 2', '项目 B'])
})

test('方向键在可见项之间移动，并把 roving 一起搬过去', () => {
  items()[0]?.focus()
  press('ArrowDown')
  expect(active()?.textContent).toBe('项目 A')
  press('ArrowDown')
  expect(active()?.textContent).toBe('会话 1')
  press('ArrowUp')
  expect(active()?.textContent).toBe('项目 A')
  // roving 必须跟着走，否则「方向键走开、再 Tab 出去再回来」会跳回旧位置。
  const tabbable = items().filter(item => item.tabIndex === 0)
  expect(tabbable).toHaveLength(1)
  expect(tabbable[0]?.textContent).toBe('项目 A')
})

test('Home / End 到首尾可见项', () => {
  items()[2]?.focus()
  press('End')
  expect(active()?.textContent).toBe('项目 B')
  press('Home')
  expect(active()?.textContent).toBe('置顶')
})

test('ArrowRight：收起时展开，展开时进入第一个子项', () => {
  const projectB = items().find(item => item.textContent === '项目 B')
  if (projectB === undefined) throw new Error('缺少项目 B')
  projectB.focus()
  // 收起 → 展开（点击它自己，行内 onClick 负责切换）
  let clicks = 0
  projectB.addEventListener('click', () => { clicks += 1 })
  press('ArrowRight')
  expect(clicks).toBe(1)
  expect(projectB.getAttribute('aria-expanded')).toBe('false') // 夹具不自己改状态，只验证「点了它」

  // 展开态 → 进入子项
  const projectA = items().find(item => item.textContent === '项目 A')
  if (projectA === undefined) throw new Error('缺少项目 A')
  projectA.focus()
  press('ArrowRight')
  expect(active()?.textContent).toBe('会话 1')
})

test('ArrowLeft：展开时收起，否则回到父项', () => {
  const projectA = items().find(item => item.textContent === '项目 A')
  if (projectA === undefined) throw new Error('缺少项目 A')
  projectA.focus()
  let clicks = 0
  projectA.addEventListener('click', () => { clicks += 1 })
  press('ArrowLeft')
  expect(clicks).toBe(1)

  // 叶子（会话 1）→ 回到父项「项目 A」
  const session1 = items().find(item => item.textContent === '会话 1')
  if (session1 === undefined) throw new Error('缺少会话 1')
  session1.focus()
  press('ArrowLeft')
  expect(active()?.textContent).toBe('项目 A')
})

test('鼠标聚焦也同步 roving（点一行后按方向键从该行继续）', () => {
  const session2 = items().find(item => item.textContent === '会话 2')
  if (session2 === undefined) throw new Error('缺少会话 2')
  session2.focus()
  session2.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  expect(items().filter(item => item.tabIndex === 0)[0]?.textContent).toBe('会话 2')
  press('ArrowUp')
  expect(active()?.textContent).toBe('会话 1')
})

test('Enter / Space 不在这里处理（交给行内元素，避免与 React 合成事件双触发）', () => {
  const session1 = items().find(item => item.textContent === '会话 1')
  if (session1 === undefined) throw new Error('缺少会话 1')
  session1.focus()
  let clicks = 0
  session1.addEventListener('click', () => { clicks += 1 })
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  session1.dispatchEvent(event)
  expect(clicks).toBe(0)
  expect(event.defaultPrevented).toBe(false)
})

test('带修饰键的方向键不拦截（留给系统/宿主快捷键）', () => {
  const session1 = items().find(item => item.textContent === '会话 1')
  if (session1 === undefined) throw new Error('缺少会话 1')
  session1.focus()
  const event = new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true, cancelable: true })
  session1.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
  expect(active()?.textContent).toBe('会话 1')
})

test('卸载后不再响应按键（避免会话切换后残留监听器）', () => {
  const session1 = items().find(item => item.textContent === '会话 1')
  if (session1 === undefined) throw new Error('缺少会话 1')
  session1.focus()
  dispose?.()
  dispose = undefined
  press('ArrowDown')
  expect(active()?.textContent).toBe('会话 1')
})

test('空树不报错（首次加载、过滤后无结果）', () => {
  dispose?.()
  document.body.innerHTML = '<div id="tree" role="tree"></div>'
  const empty = document.getElementById('tree')
  if (empty === null) throw new Error('夹具未渲染')
  const stop = installTreeKeyboard(empty)
  expect(items()).toHaveLength(0)
  stop()
})
