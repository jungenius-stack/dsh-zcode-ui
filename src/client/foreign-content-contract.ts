/**
 * 外来内容契约 —— 第三方插件在本插件侧栏内必须遵守的最低样式约定。
 *
 * ## 为什么需要这份契约
 *
 * 侧栏页脚由各插件自绘（`sidebar.footer.action` / `sidebar.settings` 插槽），本插件只提供容器。
 * dsh-cost-meter 的余额卡片自带白底卡片与加粗大数字，视觉重量压过整条导航；折叠轨只有 56px，
 * 它的文字会被裁成 `F41-peak` 这类乱码（详见 docs/KNOWN-ISSUES.md 的实机反馈记录）。
 *
 * ## 契约三条（完整表述见 docs/ZCODE-DESIGN.md §10）
 *
 * 1. **文字色只能用侧栏自己的色阶**（`--dcu-sidebar-primary/secondary/tertiary` 三档），
 *    不得引入外来色或纯黑；默认档位是 `secondary`，**只有承载数据本身的数值**可以用
 *    `primary`。侧栏是单色系统，明度就是层级（见 docs/ZCODE-DESIGN.md §9）——
 *    外来内容比导航更黑，导航就失去了层级。
 * 2. **不得自带不透明卡片底与阴影**——侧栏是一个连续表面，不是卡片墙。
 * 3. **折叠态必须可降级**——装不下就隐藏或只留图标，不得横向溢出。
 *
 * ## 为什么是「锚点 + 哨兵」而不是「扫到 cm-* 就改」
 *
 * 本插件的样式只覆盖**契约锚点**（下面这份清单），而不是匹配任意外来类名——后者会让
 * 覆盖范围随对方改版而漂移，且无法审查。代价是：锚点一旦改名，覆盖会**静默失效**
 * （样式还在，但选不中任何元素，界面悄悄变回原样）。
 *
 * 所以这里配一个运行时哨兵：只要页脚里出现了外来类名（`cm-` 前缀），就检查锚点是否齐全，
 * 缺失即 `console.warn`。它不修复问题，但把「静默失效」变成「响亮失效」——
 * 让契约破裂在发生的当天被看见，而不是等用户截图来投诉。
 */

/**
 * 契约锚点：本插件为外来页脚内容提供样式钩子的类名。
 * 改动时必须与 CodexSidebar.tsx 的覆盖样式同步——tests/design-system.assert.ts 会校验两边一致，
 * 覆盖了未登记的锚点会直接让门禁变红。
 */
export const FOREIGN_FOOTER_ANCHORS = [
  '.cm-footer-stack',
  '.cm-simple-summary',
  '.cm-foot',
  '.cm-balance-name',
  '.cm-num',
  '.cm-peak-classic',
  '.cm-peak-classic-chip',
] as const

/** 外来内容的识别前缀（当前只有 dsh-cost-meter 的 `cm-*`）。 */
const FOREIGN_PREFIX = 'cm-'

/** 页脚内是否存在任何外来内容（按类名 token 前缀判定，避免 `foo-cm-bar` 这类误命中）。 */
export function hasForeignFooterContent(footer: Element): boolean {
  return [...footer.querySelectorAll<HTMLElement>('*')].some(element => {
    const className = element.getAttribute('class')
    return className !== null && className.split(/\s+/).some(token => token.startsWith(FOREIGN_PREFIX))
  })
}

/** 返回缺失的契约锚点；全部在位时返回空数组。 */
export function missingForeignFooterAnchors(footer: Element): string[] {
  return FOREIGN_FOOTER_ANCHORS.filter(anchor => footer.querySelector(anchor) === null)
}

/**
 * 持续审计页脚里的外来内容：外来内容在场但锚点缺失即报警。
 * 同一组缺失只报一次，避免 MutationObserver 反复触发时刷屏。
 * @param footer - 侧栏页脚元素。
 * @returns dispose 函数。
 */
export function auditForeignFooterContent(footer: HTMLElement): () => void {
  const reported = new Set<string>()
  const check = (): void => {
    if (!hasForeignFooterContent(footer)) return
    const missing = missingForeignFooterAnchors(footer)
    if (missing.length === 0) return
    const key = missing.join(',')
    if (reported.has(key)) return
    reported.add(key)
    console.warn(
      `[dsh-zcode-ui] 外来内容契约失效：页脚出现 ${FOREIGN_PREFIX}* 元素，但契约锚点缺失 ${key}。`
      + ' 侧栏对这些元素的样式覆盖已静默失效，请同步更新 FOREIGN_FOOTER_ANCHORS 与 CodexSidebar.tsx 的覆盖样式'
      + '（见 docs/ZCODE-DESIGN.md §10）。',
    )
  }
  const observer = new MutationObserver(check)
  observer.observe(footer, { childList: true, subtree: true })
  check()
  return () => {
    observer.disconnect()
  }
}
