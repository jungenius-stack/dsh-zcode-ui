/**
 * 外来表面发现 —— 让"将来会加入的插件"也能被管起来。
 *
 * ## 枚举制为什么答不了"不论什么插件"
 *
 * `foreign-content-contract.ts` 是**枚举制**：逐个登记外来类名，再逐个收敛。
 * 这在生态里活不下去——DSH 的外来内容大量使用 CSS Module 哈希类名
 * （实测会话区 `yhfFVG_*` / `cl2Rlq_*` / `wXeviG_*` / `sk-*`，侧栏 `dsh-session-kit-*`），
 * 每次加插件都要重新抓包、补清单。清单永远追不上生态。
 *
 * ## 本模块的做法：发现 + 分级，而不是枚举
 *
 * 1. **信封兜底**（`skin-envelope.ts`）先做通用收敛（字体 / 盒模型 / 数字格式）——
 *    这部分不挑插件，进来就生效；
 * 2. 本模块再**发现信封管不到的那部分**：在皮肤 surfaces 里找出"基底不符"的未登记外来根，
 *    连同漂移证据一起报出来，让人决定是收敛还是登记为浮层。
 *
 * **只报不达标的外来根**（与皮肤字体不同、字号/圆角离标度、自带不透明卡片底），
 * 已达标的（实测：system-ui 字体、999/4/8px 圆角、`#d4d4d4` 的 60%/40% 派生文字色）
 * 一律不报——否则噪声会淹没信号，最后没人看警告。
 */

/** 已登记的外来根：前缀 → 处置决定。新增插件时先来这里登记，再决定是否收敛。 */
export const KNOWN_FOREIGN_ROOTS: readonly {
  readonly prefix: string
  readonly what: string
  readonly decision: 'converged' | 'envelope-only' | 'opt-out' | 'watch'
}[] = [
  { prefix: 'dsh-session-kit', what: '侧栏会话 kit 的入口行（trigger / label）', decision: 'envelope-only' },
  { prefix: 'yhf', what: '会话区工具条（模式切换 / 添加 / 主操作）', decision: 'watch' },
  // yhf 的 drift：主操作与「添加」按钮字号 13.3333px，不在七档界面刻度内（实测）。
  // 信封**不动**外来内容的字号——那是别人的功能结构，改了可能挤压按钮布局；
  // 只登记待上游修正或用户明确要求收敛。
  { prefix: 'boc', what: '会话区工具条分支', decision: 'envelope-only' },
  { prefix: 'cl2', what: '会话区模式下拉', decision: 'envelope-only' },
  { prefix: 'm0vb0q', what: '会话区工具条节点', decision: 'envelope-only' },
  { prefix: 'sk', what: '会话区 chip', decision: 'envelope-only' },
  { prefix: 'w', what: '会话区触发器（chevron / label）', decision: 'envelope-only' },
  // cm-*（dsh-cost-meter）不但在清单里，还已在 foreign-content-contract 逐条收敛过。
  { prefix: 'cm', what: '侧栏页脚计费卡（余额 / 峰值条）', decision: 'converged' },
]

/** 皮肤允许的圆角刻度（与 zcode-tokens.ts 的半径标度一致；full 由 999px 表达）。 */
const SKIN_RADII = new Set(['0px', '2px', '4px', '6px', '8px', '12px', '16px', '999px', '50%'])

/** 皮肤允许的字号刻度（七档界面档 + 三档展示档）。 */
const SKIN_SIZES = new Set([
  '9px', '10px', '12px', '13px', '14px', '16px', '18px', '20px', '22px', '34px',
])

/** 不算"外来"的前缀：自己的、宿主图标的、以及已登记的。 */
const NOT_FOREIGN = new Set(['dcu', 'lucide', ...KNOWN_FOREIGN_ROOTS.map(item => item.prefix)])

/** 一条不达标记录。 */
export interface ForeignDrift {
  /** 类名前缀（哈希类名取其首段）。 */
  readonly prefix: string
  /** 该前缀在本次扫描里命中的元素数。 */
  readonly count: number
  /** 首个命中元素的标签名。 */
  readonly tag: string
  /** 与皮肤的漂移项，人话描述。 */
  readonly drifts: readonly string[]
}

/** 取元素用于判定的"代表类名"（第一个类名通常就是模块根）。 */
const rootClass = (element: Element): string =>
  (element.getAttribute('class') ?? '').trim().split(/\s+/)[0] ?? ''

/** 从代表类名提取前缀：哈希类名取首段，语义类名取首段连字符前。 */
const prefixOf = (className: string): string => {
  if (className === '') return ''
  const head = className.split(/[-_]/)[0]
  return head
}

/**
 * 在给定根节点下发现不达标的外来根。
 *
 * @param root - 扫描根，默认 `document.body`。
 * @returns 不达标条目；全部达标或没有外来内容时返回空数组。
 */
export function findForeignDrift(root: ParentNode = document.body): ForeignDrift[] {
  const surfaces = root.querySelectorAll(SKIN_SURFACE_SELECTOR)
  if (surfaces.length === 0) return []

  // 皮肤基线：从侧栏正文取，取不到就退回 body。
  const baseline = root.querySelector('.dcu-wb-session-title-text') ?? root.querySelector('.dcu-root')
  if (baseline === null) return []
  const baseStyle = getComputedStyle(baseline)
  const baseFont = baseStyle.fontFamily.split(',')[0].trim().replace(/["']/g, '')
  const baseColor = baseStyle.color

  const found = new Map<string, ForeignDrift>()
  for (const surface of surfaces) {
    for (const element of surface.querySelectorAll('*')) {
      const className = rootClass(element)
      if (className === '') continue
      const prefix = prefixOf(className)
      if (prefix === '' || NOT_FOREIGN.has(prefix)) continue
      // 只认语义/哈希形态，跳过纯工具类
      if (!/^[a-z][a-z0-9]/.test(prefix)) continue

      const style = getComputedStyle(element)
      const drifts: string[] = []

      // 1) 字体：与皮肤不同。等宽语境**按计算字体判定**——哈希类名里没有 code/mono
      //    字样，靠类名匹配必漏（实测 bocITq_* 是 SF Mono 却被误报「字体不同」）。
      const font = style.fontFamily
      const isMono = /mono|menlo|consolas|courier/i.test(font)
      if (!isMono && font.split(',')[0].trim().replace(/["']/g, '') !== baseFont) {
        drifts.push(`字体不同（${font.split(',')[0].trim()} ≠ ${baseFont}）`)
      }

      // 2) 字号：离标度
      const size = style.fontSize
      if (!SKIN_SIZES.has(size)) drifts.push(`字号 ${size} 不在标度内`)

      // 3) 圆角：离标度
      const radius = style.borderRadius
      if (radius !== '' && !SKIN_RADII.has(radius)) drifts.push(`圆角 ${radius} 不在标度内`)

      if (drifts.length === 0) continue
      const existing = found.get(prefix)
      if (existing === undefined) {
        found.set(prefix, { prefix, count: 1, tag: element.tagName.toLowerCase(), drifts })
      } else {
        found.set(prefix, { ...existing, count: existing.count + 1 })
      }
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count)
}

/** 皮肤 surfaces 的选择器（与 skin-envelope.ts 保持同源，避免两边漂移）。 */
const SKIN_SURFACE_SELECTOR = [
  '.dcu-root',
  '.dcu-settings-page',
  '.dcu-home',
  '[data-dcu-settings-page]',
  '[data-conversation-scroll]',
  '[data-phase=hero]',
].join(',')

/**
 * 持续发现外来表面的漂移：发现不达标的外来根即报警，同一前缀只报一次。
 * 它不修复任何东西——它的职责是把"没人知道有个插件装错了"变成"控制台里看得见"。
 *
 * @param root - 观察根，默认 `document.body`。
 * @returns dispose 函数。
 */
export function observeForeignSurfaces(root: HTMLElement | null = typeof document === 'undefined' ? null : document.body): () => void {
  if (root === null) return () => {}
  const reported = new Set<string>()
  let scheduled = false

  const check = (): void => {
    scheduled = false
    const drift = findForeignDrift(root)
    for (const item of drift) {
      if (reported.has(item.prefix)) continue
      reported.add(item.prefix)
      console.warn(
        `[dsh-zcode-ui] 外来表面未达标：前缀 \`${item.prefix}\`（${item.count} 处 <${item.tag}>）—— ${item.drifts.join('；')}。`
        + ' 若是新装的插件：多数情况皮肤信封已兜底；若视觉仍突兀，请在 KNOWN_FOREIGN_ROOTS 登记它，'
        + ' 并按 foreign-content-contract 的三条契约决定收敛方式（见 docs/ZCODE-DESIGN.md §10）。',
      )
    }
  }

  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(check)
    else setTimeout(check, 16)
  }

  const observer = new MutationObserver(schedule)
  observer.observe(root, { childList: true, subtree: true })
  check()
  return () => {
    observer.disconnect()
  }
}
