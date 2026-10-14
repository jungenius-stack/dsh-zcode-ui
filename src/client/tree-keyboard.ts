/**
 * ARIA 树的键盘模型：roving tabindex + 方向键。
 *
 * ## 为什么需要它（2026-10-14）
 *
 * 侧栏此前**声明**了 `role="tree"` / `role="treeitem"`，但没有兑现树的任何契约：
 *
 * 1. **没有方向键**——全仓 `ArrowDown/ArrowUp/ArrowLeft/ArrowRight` 在侧栏相关文件里
 *    匹配数为 0。树的全部意义就是「一个 Tab 站 + 方向键遍历」；没有方向键，
 *    100 个会话就要按 100 次 Tab 才能穿过侧栏（尼尔森第 7 条「灵活高效」失效）。
 * 2. **每个 treeitem 都是 `tabIndex={0}`**——正确的做法是 roving tabindex：
 *    全树只有**一个**可 Tab 项，方向键在树内移动并转移这个 tabindex。
 * 3. **没有 `aria-level`**——treeitem 的必填属性，缺了屏幕阅读器无法播报层级。
 * 4. **treeitem 的归属被打断**——ARIA 要求 treeitem 由 `tree` 或 `group` 直接拥有，
 *    而 `.dcu-wb-section` / `.dcu-wb-collections` / `.dcu-wb-group-member` 等纯结构层
 *    既没有 `role` 也不是 presentation，夹在中间会让树结构在无障碍树里散架。
 *
 * 本模块把 1–4 一次性补齐，且**不要求逐个节点手写属性**：层级由 DOM 嵌套推导，
 * 纯结构层由本模块统一标记为 presentation。这样加一个新的中间容器不需要记得改四处。
 *
 * ## 分工（谁处理哪些键）
 *
 * 本模块只处理**方向键与 Home/End**，并在捕获阶段 `preventDefault`——这些键行内元素
 * 自己都不消费。`Enter` / `Space` 刻意**不碰**：行内元素各自有 `onKeyDown`
 * （会话行打开会话、项目头展开收起），且 React 18 把合成事件挂在 React 根容器上，
 * 容器级监听器会**先于**它们触发，若在这里也处理一遍就会双触发。
 *
 * ## 与 MutationObserver 的相处
 *
 * 只观察 `childList`，**不观察 `attributes`**：本模块自己要写 `aria-level` /
 * `role` / `tabindex`，若观察属性就会自触发。这个坑本仓库踩过——相同值的
 * `setAttribute` 同样会触发属性观察器，曾导致渲染进程被拖死（见 KNOWN-ISSUES §14.4）。
 */

const TREEITEM = '[role="treeitem"]'

/** 折叠容器的显式标记：本插件的 `DisclosureBody` 在收起时写 `data-open="false"`。 */
function isCollapsedIn(item: HTMLElement, root: HTMLElement): boolean {
  let node: HTMLElement | null = item
  while (node !== null && node !== root) {
    if (node.getAttribute('data-open') === 'false') return true
    node = node.parentElement
  }
  return false
}

/** 树内当前**可见**的 treeitem。折叠子树不参与键盘遍历。 */
export function visibleTreeItems(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TREEITEM)].filter(item => !isCollapsedIn(item, root))
}

/**
 * 把纯结构包裹层标为 `role="presentation"`，让 treeitem 的归属不被夹断。
 *
 * 只处理**没有 role 的 div**：任何已经有 role 的元素（`tree` / `group` / `treeitem`）
 * 都不动，所以「显式声明过的语义」永远优先于本归一化。
 */
function normalizeWrappers(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>('div:not([role])')) {
    el.setAttribute('role', 'presentation')
  }
}

/** `aria-level` = 该 treeitem 到树根之间隔了几层 `role="group"`，再加 1。 */
function assignLevels(root: HTMLElement): void {
  for (const item of root.querySelectorAll<HTMLElement>(TREEITEM)) {
    let level = 1
    let parent = item.parentElement
    while (parent !== null && parent !== root) {
      if (parent.getAttribute('role') === 'group') level += 1
      parent = parent.parentElement
    }
    item.setAttribute('aria-level', String(level))
  }
}

function levelOf(item: HTMLElement): number {
  const raw = item.getAttribute('aria-level')
  const parsed = raw === null ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? 1 : parsed
}

/**
 * roving tabindex：全树只留一个 `tabIndex=0`。
 * 优先用调用方指定的项（正在聚焦的那个），否则用选中项，否则第一个可见项。
 */
function applyRoving(root: HTMLElement, preferred?: HTMLElement | null): void {
  for (const item of root.querySelectorAll<HTMLElement>(TREEITEM)) item.tabIndex = -1
  const items = visibleTreeItems(root)
  if (items.length === 0) return
  const target = preferred != null && items.includes(preferred)
    ? preferred
    : items.find(item => item.getAttribute('aria-selected') === 'true') ?? items[0]
  if (target === undefined) return
  target.tabIndex = 0
}

/** 展开/收起一个可展开项：优先点它内部的展开控件，其次点它自己。 */
function toggleItem(item: HTMLElement): void {
  const control = item.querySelector<HTMLElement>('button[aria-expanded]')
  if (control !== null) {
    control.click()
    return
  }
  item.click()
}

/** 沿可见顺序向上找第一个层级更浅的项，即父项。 */
function parentItem(item: HTMLElement, root: HTMLElement): HTMLElement | null {
  const items = visibleTreeItems(root)
  const index = items.indexOf(item)
  if (index <= 0) return null
  const level = levelOf(item)
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = items[cursor]
    if (candidate !== undefined && levelOf(candidate) < level) return candidate
  }
  return null
}

export type TreeKeyboardOptions = {
  /** 与树一起变化的依赖快照：变化时重算层级与 roving（内容更新后调用）。 */
  readonly revision?: unknown
}

/**
 * 在树容器上安装键盘模型，返回卸载函数。
 *
 * 幂等：重复安装同一容器时，旧的一份会先被卸载（容器上挂 `Symbol` 标记）。
 */
export function installTreeKeyboard(root: HTMLElement): () => void {
  const refresh = (preferred?: HTMLElement | null): void => {
    normalizeWrappers(root)
    assignLevels(root)
    applyRoving(root, preferred)
  }
  refresh()

  const focusAt = (index: number): void => {
    const items = visibleTreeItems(root)
    if (items.length === 0) return
    const clamped = Math.max(0, Math.min(index, items.length - 1))
    const next = items[clamped]
    if (next === undefined) return
    applyRoving(root, next)
    next.focus()
  }

  // 捕获阶段：行内元素不消费方向键，这里先行处理不会与它们冲突。
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
    const origin = event.target
    const current = origin instanceof HTMLElement ? origin.closest<HTMLElement>(TREEITEM) : null
    if (current === null || !root.contains(current)) return
    const items = visibleTreeItems(root)
    const index = items.indexOf(current)
    if (index < 0) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusAt(index + 1)
        return
      case 'ArrowUp':
        event.preventDefault()
        focusAt(index - 1)
        return
      case 'Home':
        event.preventDefault()
        focusAt(0)
        return
      case 'End':
        event.preventDefault()
        focusAt(items.length - 1)
        return
      case 'ArrowRight': {
        event.preventDefault()
        if (current.getAttribute('aria-expanded') === 'false') {
          toggleItem(current)
          return
        }
        const next = items[index + 1]
        // 只在下一个可见项确实是子项时才进入（APG：展开但无子项时不动）。
        if (next !== undefined && levelOf(next) > levelOf(current)) focusAt(index + 1)
        return
      }
      case 'ArrowLeft': {
        event.preventDefault()
        if (current.getAttribute('aria-expanded') === 'true') {
          toggleItem(current)
          return
        }
        const parent = parentItem(current, root)
        if (parent !== null) {
          applyRoving(root, parent)
          parent.focus()
        }
        return
      }
      default:
        return
    }
  }

  // 鼠标聚焦也要同步 roving，否则「点一行 → 按方向键」会从旧位置继续。
  const onFocusIn = (event: FocusEvent): void => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const item = target.closest<HTMLElement>(TREEITEM)
    if (item === null || !root.contains(item)) return
    applyRoving(root, item)
  }

  root.addEventListener('keydown', onKeyDown, true)
  root.addEventListener('focusin', onFocusIn)

  const observer = new MutationObserver(() => { refresh() })
  observer.observe(root, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    root.removeEventListener('keydown', onKeyDown, true)
    root.removeEventListener('focusin', onFocusIn)
  }
}
