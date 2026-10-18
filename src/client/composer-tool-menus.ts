/** 只适配由输入区工具触发的菜单；保留原条目、选择回调及目录创建流程。 */
const TOOL = '[class*="_heroWorkspaceRow"] button,[data-composer-card] button[aria-haspopup],[data-composer-card] button[aria-expanded]'
const MENU = '[role="menu"],[role="listbox"]'

export const COMPOSER_TOOL_MENU_STYLE = `
[class*="_heroWorkspaceRow"] button{min-height:28px;border-radius:var(--dsw-radius-full);font-size:var(--dsw-font-size-caption);line-height:20px}
[class*="_heroWorkspaceRow"] button:hover,[class*="_heroWorkspaceRow"] button[aria-expanded=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
/* 底色与投影走语义令牌（2026-10-14 去硬编码）：原来底色是 background:#fff!important、
   投影是 box-shadow:0 8px 32px #0002,0 0 0 1px #0000000a!important，另有一条
   body[data-ds-dark-theme] …{background:#2b2b2b} 暗色补丁。
   菜单与 Git 弹窗是**会**跟着宿主切暗色的表面，硬编码 #fff 会让它在暗色主题下变成一块白板；
   而补丁与主规则各写一份，值容易漂移。
   同系令牌 --dcu-tip-bg / --dcu-tip-shadow 早已用在侧栏浮层上，这里接同一对令牌，
   让「浮层表面」在仓库里有**一个**定义而不是每处一份字面量。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){box-sizing:border-box;max-height:var(--dcu-tool-menu-height,360px)!important;padding:4px!important;border-radius:var(--dsw-radius-lg)!important;background:var(--dsw-specific-menu,var(--dcu-tip-bg))!important;backdrop-filter:var(--dsw-menu-backdrop-filter,none)!important;color:var(--dsw-alias-label-primary);box-shadow:var(--dcu-tip-shadow)!important;display:flex;flex-direction:column;gap:2px;z-index:1100}
/* 原生菜单保留宿主宽度约束；Git 弹窗沿用独立尺寸，避免观察器标记前后跳变。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])[data-gitgraph-popover]{min-width:0!important;width:262px;max-width:calc(100vw - 24px)}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]))[data-gitgraph-popover]{width:320px}
[data-dcu-tool-menu=portal]{position:fixed!important;left:var(--dcu-tool-menu-x)!important;top:var(--dcu-tool-menu-y)!important;bottom:auto!important;right:auto!important}
:is([data-dcu-tool-menu=inline],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal])){translate:var(--dcu-tool-menu-shift,0px) 0}
[class*="_heroWorkspaceRow"] [data-gitgraph-popover]:not([data-dcu-tool-menu=portal]){top:auto!important;bottom:calc(100% + 4px)!important}
/* 原先这里还有一条 body[data-ds-dark-theme] …{background:#2b2b2b!important;…} 的暗色补丁，
   现在由 --dcu-tip-bg / --dcu-tip-shadow 的暗色值统一承担（见文件头注释），补丁已删。 */
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover])>[class*="_viewport"]{min-height:0;max-height:none;overflow-y:auto;scrollbar-width:thin}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=option]){box-sizing:border-box;min-height:28px;padding:4px 8px;gap:8px;border-radius:var(--dsw-radius-md);font-size:var(--dsw-font-size-caption);line-height:20px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) :is([role=menuitem],[role=menuitemradio],[role=option]):hover:not(:disabled),:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_selected"],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-selected=true],:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [aria-checked=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_itemIcon"] svg{width:16px;height:16px}
:is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]) [class*="_footer"]{flex:none;margin-top:var(--dcu-space-1);padding-top:var(--dcu-space-1);border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
[data-dcu-tool-filter]{box-sizing:border-box;flex:none;width:100%;height:32px;padding:4px var(--dcu-space-2);margin:0 0 1px;border:0;border-radius:var(--dsw-radius-lg);outline:none;background:transparent;color:inherit;font:13px/20px var(--dsw-font-family)}
/* 焦点环必须用**实色**：2026-10-14 前这里是
   「box-shadow:inset 0 0 0 1px color-mix(… label-primary 20%, transparent)」——
   一个 20% alpha 的 1px 内环，实测上限只有亮色 1.61:1 / 暗色 1.91:1，
   **数学上不可能达到 3:1**（无论基准色取多极端），WCAG 2.1 AA 2.4.7 焦点可见失效。
   改为与 settings-page-styles.ts 同款实色 outline，色值取宿主一等焦点令牌
   （亮 #0b7fff / 暗 #4099ff，在各自底色上 3.35:1 / 6.22:1）。 */
[data-dcu-tool-filter]:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px}
[data-dcu-tool-empty]{padding:var(--dcu-space-2);font-size:var(--dsw-font-size-caption);color:var(--dsw-alias-label-secondary)}
[data-dcu-tool-filtered]{display:none!important}
/* 建议菜单单独换肤：外框跟随宿主输入区，保留宿主定位和动态高度，不给内部列表套固定宽度。
   ⚠ 圆角必须是 lg(8px) 而不是 xl(12px)：宪章 §Menus 明文写了
   「Dropdown menus … use rounded-lg shells. This includes the main input's @ / \
   suggestion panel; it does not inherit the main-input exception」——
   建议菜单**明确不继承**主输入壳的 2xl 例外，此前沿用 12px 属违规，本轮按宪章收敛。 */
[data-conversation-scroll] [data-trigger-menu]{box-sizing:border-box;left:0;right:0;width:auto;min-width:0;max-width:none;padding:4px;border-radius:var(--dsw-radius-lg);background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow)}

[data-conversation-scroll] [data-trigger-menu]>[role=listbox]{box-sizing:border-box;width:100%;min-width:0;align-self:stretch;scrollbar-width:thin}
[data-conversation-scroll] [data-trigger-menu] [role=option]{box-sizing:border-box;width:100%;min-width:0;min-height:28px;padding:4px 8px;gap:8px;border-radius:var(--dsw-radius-md);font-size:var(--dsw-font-size-caption);line-height:20px}
[data-conversation-scroll] [data-trigger-menu] [role=option][aria-selected=true]{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
`

export function observeComposerToolMenus(copy: { search: string; empty: string }): () => void {
  let anchor: HTMLElement | undefined
  let known = new Set<Element>()
  let pendingUntil = 0
  const mounted = new Map<HTMLElement, () => void>()
  const now = () => Date.now()
  function capture(event: Event) {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TOOL) : null
    if (target === null || target.closest('[data-conversation-scroll]') === null) return
    anchor = target
    known = new Set(document.querySelectorAll(MENU))
    pendingUntil = now() + 1000
  }
  function mount(menu: HTMLElement, trigger: HTMLElement) {
    const portal = getComputedStyle(menu).position === 'fixed'
    menu.setAttribute('data-dcu-tool-menu', portal ? 'portal' : 'inline')
    const isProject = trigger.matches('[class*="_heroWorkspaceRow"]>button:first-child')
    const viewport = menu.querySelector<HTMLElement>(':scope>[class*="_viewport"]')
    let input: HTMLInputElement | undefined
    let empty: HTMLElement | undefined
    if (isProject && viewport !== null && menu.querySelector('input') === null) {
      input = document.createElement('input')
      input.type = 'search'
      input.placeholder = copy.search
      input.setAttribute('aria-label', copy.search)
      input.setAttribute('data-dcu-tool-filter', '')
      empty = document.createElement('div')
      empty.setAttribute('data-dcu-tool-empty', '')
      empty.setAttribute('role', 'status')
      empty.textContent = copy.empty
      empty.hidden = true
      menu.prepend(input)
      viewport.after(empty)
      input.addEventListener('input', () => {
        const query = input!.value.trim().toLocaleLowerCase()
        let count = 0
        for (const row of viewport.children) {
          const match = (row.textContent ?? '').toLocaleLowerCase().includes(query)
          row.toggleAttribute('data-dcu-tool-filtered', !match)
          if (match) count++
        }
        empty!.hidden = count > 0
        place()
      })
      input.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'Enter') return
        const first = viewport.querySelector<HTMLButtonElement>(':scope>:not([data-dcu-tool-filtered]) button:not(:disabled)')
        if (first !== null) { event.preventDefault(); event.stopPropagation(); first.focus(); if (event.key === 'Enter') first.click() }
      })
    }
    function place() {
      if (!trigger.isConnected || !menu.isConnected) return
      const rect = trigger.getBoundingClientRect()
      const above = rect.top - 16
      const below = window.innerHeight - rect.bottom - 16
      const topSide = above >= Math.min(260, below)
      menu.style.setProperty('--dcu-tool-menu-height', `${Math.max(60, Math.min(360, topSide ? above : below))}px`)
      if (!portal) {
        const previous = parseFloat(menu.style.getPropertyValue('--dcu-tool-menu-shift')) || 0
        const bounds = menu.getBoundingClientRect()
        const naturalLeft = bounds.left - previous
        const left = Math.max(12, Math.min(naturalLeft, window.innerWidth - bounds.width - 12))
        menu.style.setProperty('--dcu-tool-menu-shift', `${left - naturalLeft}px`)
        return
      }
      const bounds = menu.getBoundingClientRect()
      // 2026-10-18（活宿主门禁暴露的竞态）：x 用**测量那一刻**的 bounds.width 夹取，
      // 而菜单宽度由异步加载的建议项文字决定。实测 900px 视口下宽度在 655→672 之间变化，
      // 按 655 算出 x=233，内容撑开后右边界 905 > 900（越界 17px）。
      // 夹取本身没错（保证 left>=12 且尽量靠触发点），但**宽度会变**，所以这里必须保证
      // 「无论宽度如何变化，右边界都不越过视口」。做法：把 max-width 与 x 一起算，
      // 让钳制后的宽度参与定位，而不是只依赖一次性的测量值。
      const viewportWidth = window.innerWidth
      const maxWidth = Math.max(120, viewportWidth - 24)
      const width = Math.min(bounds.width, maxWidth)
      if (width < bounds.width) menu.style.setProperty('max-width', `${maxWidth}px`)
      const x = Math.max(12, Math.min(rect.left, viewportWidth - width - 12))
      const y = Math.max(12, topSide ? rect.top - bounds.height - 4 : rect.bottom + 4)
      menu.style.setProperty('--dcu-tool-menu-x', `${x}px`)
      menu.style.setProperty('--dcu-tool-menu-y', `${y}px`)
    }
    const resize = new ResizeObserver(place)
    resize.observe(menu)
    resize.observe(trigger)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    place()
    mounted.set(menu, () => {
      resize.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      input?.remove()
      empty?.remove()
      menu.querySelectorAll('[data-dcu-tool-filtered]').forEach(row => row.removeAttribute('data-dcu-tool-filtered'))
      menu.removeAttribute('data-dcu-tool-menu')
      for (const property of ['--dcu-tool-menu-x', '--dcu-tool-menu-y', '--dcu-tool-menu-height', '--dcu-tool-menu-shift']) menu.style.removeProperty(property)
      menu.style.removeProperty('max-width')
    })
  }
  function sync() {
    for (const [menu, dispose] of mounted) if (!menu.isConnected) { dispose(); mounted.delete(menu) }
    if (anchor === undefined || now() > pendingUntil) return
    for (const menu of document.querySelectorAll<HTMLElement>(MENU)) {
      // @ 和指令建议的 listbox 是全宽外框内部的滚动区，不能套用工具弹窗的固定宽度。
      if (menu.closest('[data-trigger-menu]') !== null) continue
      if (known.has(menu) || mounted.has(menu) || menu.parentElement?.closest(MENU) !== null) continue
      if (menu.getClientRects().length === 0) continue
      mount(menu, anchor)
      pendingUntil = 0
      break
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(document.body, { childList: true, subtree: true })
  document.addEventListener('pointerdown', capture, true)
  document.addEventListener('keydown', captureKey, true)
  function captureKey(event: KeyboardEvent) { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) capture(event) }
  return () => {
    observer.disconnect()
    document.removeEventListener('pointerdown', capture, true)
    document.removeEventListener('keydown', captureKey, true)
    mounted.forEach(dispose => dispose())
    mounted.clear()
  }
}
