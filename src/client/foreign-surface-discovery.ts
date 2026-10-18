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
 * 已达标的（实测：system-ui 字体、999/4px/8px 圆角、`#d4d4d4` 的 60%/40% 派生文字色）
 * 一律不报——否则噪声会淹没信号，最后没人看警告。
 *
 * ## 为什么哨兵必须增量扫描（2026-10-18 真机性能事故）
 *
 * 旧实现监听 `document.body` 的**每一次** childList，然后在 rAF 里对
 * `[data-conversation-scroll]` 下的**全部分支**逐个 `getComputedStyle`。长会话里
 * 会话区有 2 万多个元素，其中大量未登记的哈希前缀会走到 `getComputedStyle`：
 * 单次扫描实测 **282ms**（Chrome trace: `FireAnimationFrame > FunctionCall check`）。
 * 而宿主在**鼠标悬停消息**时会挂载/卸载操作条（一次 childList 变更），于是
 * 「鼠标一划过消息 → 全文档扫描 → 界面冻住 0.28 秒」。这是用户第四次报告
 * "鼠标操作慢"的真正根因（§30 的合成夹具没有真实宿主的悬停操作条，漏掉了这条路径）。
 *
 * 现在改成：
 * - 只检查 **mutation.addedNodes** 里的新增子树（删除不触发）；
 * - 每个新增子树用显式栈遍历，**每帧最多 8ms**，超预算留到下一帧；
 * - 初次扫描（页面已有内容）也走同一条队列，不再在初始化时同步扫全树；
 * - 每个前缀只**抽样体检 4 个元素**：长会话里 `icaHSq_flowItem` 同一前缀有 844 个，
 *   逐个查样式在打开会话时实测 796ms/92 帧（2026-10-18 第二轮 trace），抽样后降到个位数帧；
 * - `WeakSet` 去重，React 反复挂载同一节点不重复付 `getComputedStyle`。
 *
 * 代价：告警的 `count` 是"抽样命中的样本数"，不再是一次全量扫描的精确计数。
 * 对诊断用途足够；换来的是悬停从 ~11.5ms/次 降到 ~0.5ms/次（真实长会话实测）。
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

/** 一帧内允许花在扫描上的预算（ms）。超过就留到下一帧，保证输入不被长任务挡住。 */
const SCAN_BUDGET_MS = 8

/**
 * 每个外来前缀最多体检几个元素。
 *
 * 长会话里同一前缀能出现 844 次（`icaHSq_flowItem`），逐个 `getComputedStyle`
 * 在打开会话时实测要 796ms（92 帧）。哨兵只需要"这个前缀不对"的证据，
 * 4 个样本足够；`findForeignDrift` 的全量体检不受此限制。
 */
const SAMPLE_PER_PREFIX = 4

/** 发现第一条漂移后等多久再告警（ms）。攒一小段时间，让 count 更有代表性。 */
const REPORT_DELAY_MS = 400

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

/** 皮肤基线（从侧栏正文取，取不到就退回 `.dcu-root`）。 */
interface SkinBaseline {
  readonly font: string
}

/**
 * 读取皮肤字体基线。
 *
 * @param root - 扫描根，默认 `document.body`。
 * @returns 基线；皮肤正文还没挂载时返回 null（此时不扫描，等新增节点再来）。
 */
function readBaseline(root: ParentNode): SkinBaseline | null {
  const baseline = root.querySelector('.dcu-wb-session-title-text') ?? root.querySelector('.dcu-root')
  if (baseline === null) return null
  const style = getComputedStyle(baseline)
  return { font: style.fontFamily.split(',')[0].trim().replace(/["']/g, '') }
}

/**
 * 取"未登记的外来前缀"；不是外来内容时返回 null。
 *
 * 只读类名，**不付 `getComputedStyle`**——这是把"逐元素体检"降成
 * "每个前缀抽几个样本"的前提。
 */
function foreignPrefixOf(element: Element): string | null {
  const className = rootClass(element)
  if (className === '') return null
  const prefix = prefixOf(className)
  if (prefix === '' || NOT_FOREIGN.has(prefix)) return null
  // 只认语义/哈希形态，跳过纯工具类
  if (!/^[a-z][a-z0-9]/.test(prefix)) return null
  return prefix
}

/**
 * 对单个已知前缀的元素做一次样式体检（唯一昂贵调用）。
 */
function driftOf(element: Element, prefix: string, baseline: SkinBaseline): ForeignDrift | null {
  const style = getComputedStyle(element)
  const drifts: string[] = []

  // 1) 字体：与皮肤不同。等宽语境**按计算字体判定**——哈希类名里没有 code/mono
  //    字样，靠类名匹配必漏（实测 bocITq_* 是 SF Mono 却被误报「字体不同」）。
  const font = style.fontFamily
  const isMono = /mono|menlo|consolas|courier/i.test(font)
  if (!isMono && font.split(',')[0].trim().replace(/["']/g, '') !== baseline.font) {
    drifts.push(`字体不同（${font.split(',')[0].trim()} ≠ ${baseline.font}）`)
  }

  // 2) 字号：离标度
  const size = style.fontSize
  if (!SKIN_SIZES.has(size)) drifts.push(`字号 ${size} 不在标度内`)

  // 3) 圆角：离标度
  const radius = style.borderRadius
  if (radius !== '' && !SKIN_RADII.has(radius)) drifts.push(`圆角 ${radius} 不在标度内`)

  if (drifts.length === 0) return null
  return { prefix, count: 1, tag: element.tagName.toLowerCase(), drifts }
}

/**
 * 判定单个元素是否是一处"未达标的外来根"（全量扫描用，不做抽样）。
 */
function candidateOf(element: Element, baseline: SkinBaseline): ForeignDrift | null {
  const prefix = foreignPrefixOf(element)
  return prefix === null ? null : driftOf(element, prefix, baseline)
}

/** 皮肤 surfaces 的选择器（与 skin-envelope.ts 保持同源，避免两边漂移）。 */
const SKIN_SURFACE_SELECTOR = [
  '.dcu-root',
  '.dcu-settings-page',
  '.dcu-home',
  '[data-dcu-settings-page]',
  '[data-phase=hero]',
  '[data-conversation-scroll]',
].join(',')

/**
 * 在给定根节点下发现不达标的外来根（一次性全量扫描）。
 *
 * 保留给测试与显式体检；**观察器不要调用它**——长会话下一次全量扫描
 * 就是 200–300ms 的长任务，应该走 `observeForeignSurfaces` 的分帧队列。
 *
 * @param root - 扫描根，默认 `document.body`。
 * @returns 不达标条目；全部达标或没有外来内容时返回空数组。
 */
export function findForeignDrift(root: ParentNode = document.body): ForeignDrift[] {
  const surfaces = root.querySelectorAll(SKIN_SURFACE_SELECTOR)
  if (surfaces.length === 0) return []

  const baseline = readBaseline(root)
  if (baseline === null) return []

  const found = new Map<string, ForeignDrift>()
  for (const surface of surfaces) {
    for (const element of surface.querySelectorAll('*')) {
      const candidate = candidateOf(element, baseline)
      if (candidate === null) continue
      const existing = found.get(candidate.prefix)
      if (existing === undefined) {
        found.set(candidate.prefix, candidate)
      } else {
        found.set(candidate.prefix, { ...existing, count: existing.count + 1 })
      }
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count)
}

/** 待遍历项：元素 + 它是否已经在皮肤 surface 内部（surface 自身不算）。 */
interface WalkItem {
  readonly element: Element
  readonly insideSurface: boolean
}

/**
 * 持续发现外来表面的漂移：发现不达标的外来根即报警，同一前缀只报一次。
 * 它不修复任何东西——它的职责是把"没人知道有个插件装错了"变成"控制台里看得见"。
 *
 * 扫描是**增量的**：只处理新增子树，每帧最多 8ms；详见文件头的事故记录。
 *
 * @param root - 观察根，默认 `document.body`。
 * @returns dispose 函数。
 */
export function observeForeignSurfaces(root: HTMLElement | null = typeof document === 'undefined' ? null : document.body): () => void {
  if (root === null) return () => {}

  const reported = new Set<string>()
  const stats = new Map<string, ForeignDrift>()
  /** 前缀 → 已体检的样本数（只数到 `SAMPLE_PER_PREFIX`）。 */
  const checked = new Map<string, number>()
  const seen = new WeakSet<Element>()
  const stack: WalkItem[] = []
  let scheduled = false
  let reportTimer: ReturnType<typeof setTimeout> | null = null
  let baseline: SkinBaseline | null | undefined

  const baselineOf = (): SkinBaseline | null => {
    // 只缓存"读到了"的基线。首帧插件可能先于侧栏挂载，此时读到 null；
    // 若把 null 也缓存下来，之后每次 flush 都会清空队列、永远不扫描（2026-10-18 实测）。
    if (baseline === undefined || baseline === null) baseline = readBaseline(root)
    return baseline
  }

  const report = (): void => {
    reportTimer = null
    for (const item of stats.values()) {
      if (reported.has(item.prefix)) continue
      reported.add(item.prefix)
      console.warn(
        `[dsh-zcode-ui] 外来表面未达标：前缀 \`${item.prefix}\`（${item.count} 处 <${item.tag}>）—— ${item.drifts.join('；')}。`
        + ' 若是新装的插件：多数情况皮肤信封已兜底；若视觉仍突兀，请在 KNOWN_FOREIGN_ROOTS 登记它，'
        + ' 并按 foreign-content-contract 的三条契约决定收敛方式（见 docs/ZCODE-DESIGN.md §10）。',
      )
    }
  }

  const flush = (): void => {
    scheduled = false
    const base = baselineOf()
    // 皮肤正文还没挂载：清空队列，等新增节点再来（不要拿着 null 基线扫）。
    if (base === null) {
      stack.length = 0
      return
    }
    const deadline = performance.now() + SCAN_BUDGET_MS
    while (stack.length > 0 && performance.now() < deadline) {
      const { element, insideSurface } = stack.pop()!
      // 悬停操作条这类节点可能在下一帧前就被卸载：对已脱离文档的元素
      // getComputedStyle 返回空值（字号 '' / 圆角 ''），会被误判成漂移。
      // 跳过且不记入 seen——若之后重新挂载，mutation 会再次入队。
      if (!element.isConnected) continue
      if (seen.has(element)) continue
      seen.add(element)

      if (insideSurface) {
        const prefix = foreignPrefixOf(element)
        if (prefix !== null) {
          const sampled = checked.get(prefix) ?? 0
          if (sampled < SAMPLE_PER_PREFIX) {
            checked.set(prefix, sampled + 1)
            const candidate = driftOf(element, prefix, base)
            if (candidate !== null) {
              const existing = stats.get(candidate.prefix)
              stats.set(candidate.prefix, existing === undefined ? candidate : { ...existing, count: existing.count + 1 })
              if (!reported.has(candidate.prefix) && reportTimer === null) {
                reportTimer = setTimeout(report, REPORT_DELAY_MS)
              }
            }
          }
        }
      }

      // surface 自身的子元素算"在表面内"；surface 自己不算（旧实现同样跳过 surface 根）。
      const childrenInside = insideSurface || element.matches(SKIN_SURFACE_SELECTOR)
      for (let child = element.firstElementChild; child !== null; child = child.nextElementSibling) {
        stack.push({ element: child, insideSurface: childrenInside })
      }
    }
    if (stack.length > 0) schedule()
  }

  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    // 合并同一帧内的多次 mutation；宿主一次状态切换会连打多个变更。
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush)
    else setTimeout(flush, 16)
  }

  /** 只把"在 surface 内"或"包含 surface"的新增子树排进队列；其余与哨兵无关。 */
  const enqueue = (node: Node): void => {
    if (!(node instanceof Element)) return
    const insideSurface = node.closest(SKIN_SURFACE_SELECTOR) !== null
    if (!insideSurface && node.querySelector(SKIN_SURFACE_SELECTOR) === null) return
    stack.push({ element: node, insideSurface })
    schedule()
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) enqueue(node)
    }
  })
  observer.observe(root, { childList: true, subtree: true })

  // 初次扫描也走队列（页面加载时已有内容），避免初始化时同步扫全树造成首屏长任务。
  for (const surface of root.querySelectorAll(SKIN_SURFACE_SELECTOR)) {
    stack.push({ element: surface, insideSurface: false })
  }
  schedule()

  return () => {
    observer.disconnect()
    if (reportTimer !== null) clearTimeout(reportTimer)
    stack.length = 0
  }
}
