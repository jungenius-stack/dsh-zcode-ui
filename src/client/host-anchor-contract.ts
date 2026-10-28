/**
 * 宿主锚点契约 —— 上游哈希类名锚点的存在性自检。
 *
 * ## 为什么需要它
 *
 * 本插件走**令牌优先**策略，皮肤层（`zcode-skin.ts`）不针对宿主类名写任何规则。
 * 但「宿主集成层」必须依赖上游的 CSS Module 哈希类名才能定位元素——
 * 新建会话页的排版、输入壳的发送键、工作区行、工具菜单，都是靠
 * `[class*="_composerHero"]`、`[class$=_primary]` 这类锚点接上去的。
 *
 * 这类锚点的风险不是「会不会变」，而是**变了没人知道**：上游改一次构建，
 * 哈希后缀或块名一变，选择器就选不中任何元素——样式表还在、代码也没报错，
 * 只是界面悄悄少了一块。用户不会截图来投诉「我的新建会话页排版不对」，
 * 他们只会觉得「这个插件好像没什么效果」。
 *
 * 这与 `foreign-content-contract.ts` 面对的是同一类问题（第三方改名 → 静默失效），
 * 处理方式也一致：**把静默失效变成响亮失效**。
 *
 * ## 为什么只检查一部分锚点
 *
 * 18 个锚点里，多数只在特定状态下出现（工具菜单内部、设置页某个分区）。
 * 无条件检查它们会制造大量误报，而**误报比不报更糟**——用户会学会忽略这条警告。
 * 因此这里只登记**前置条件可确定**的锚点：作用域容器在场时，组内锚点就必须在场。
 * 其余锚点登记在 `docs/ZCODE-DESIGN.md` §12 的清单里备查，但不参与运行时自检。
 */

/** 一组共享同一前置条件的宿主锚点。 */
export interface HostAnchorGroup {
  /** 作用域容器。只有它存在于文档中时，才检查组内锚点。 */
  readonly scope: string
  /** 这组锚点集体缺失意味着什么（写进警告，让人一眼知道影响面）。 */
  readonly consequence: string
  /** 组内锚点（CSS 选择器片段，相对于 scope 查找）。 */
  readonly anchors: readonly string[]
}

/**
 * 参与运行时自检的锚点组。
 *
 * 新增依赖上游哈希类名的代码时，**必须**把锚点登记到这里（`tests/design-system.assert.ts`
 * 会校验源码里用到的锚点都在本表中），否则上游改名后仍然是静默失效。
 */
export const HOST_ANCHOR_GROUPS: readonly HostAnchorGroup[] = [
  {
    scope: '[data-phase=hero]',
    consequence: '新建会话页的整体排版（hero 标题、引导区宽度、工作区行）会整块失效',
    anchors: [
      '[class*="_composerHero"]',
      '[class$="_stack"]',
      '[class$="_headline"]',
      '[class*="_heroWorkspaceRow"]',
      '[class$="_fishHitbox"]',
    ],
  },
  {
    scope: '[data-composer-card]',
    consequence: '发送键会退回宿主默认配色，加号的悬停底与输入壳尺寸规则失效',
    anchors: ['[class$=_primary]', '[class*="_add"]'],
  },
  {
    scope: '[data-conversation-scroll] .md-code-block',
    consequence: 'D1 围栏码卡只剩令牌底色：头部条退回宿主深条、码体失去 shiki 底/字与圆角',
    anchors: ['[class*="_bannerWrap"]'],
  },
]

/** 缺失的锚点描述，形如 `[data-phase=hero] > [class$="_headline"]`。 */
export type MissingHostAnchor = string

/**
 * 全部已知锚点清单中**不参与自检**的那部分。
 *
 * 它们都只在特定状态下出现（菜单打开、有附件、某个设置分区被选中），前置条件无法
 * 从 DOM 本身判断，无条件检查只会制造误报。这里登记备查，并在上游改名时靠人工比对。
 *
 * `tests/design-system.assert.ts` 会校验「源码里出现的每个锚点都在清单里」（本表 ∪
 * `HOST_ANCHOR_GROUPS`）——新增锚点必须显式回答一次「它能不能自检」。
 */
export const UNCHECKED_HOST_ANCHORS: readonly { readonly anchor: string; readonly why: string }[] = [
  { anchor: '_section', why: '只在设置页的特定分区渲染，分区结构各不相同' },
  { anchor: '_title', why: '同上：分区标题只在部分分区存在' },
  { anchor: '_heading', why: '同上' },
  { anchor: '_intro', why: '关于页的可选导语段' },
  { anchor: '_detailsCol', why: '设置页详情列，窄屏下会被移除' },
  { anchor: '_centerCol', why: '同上' },
  { anchor: '_viewport', why: '只在工具菜单/弹层打开时出现' },
  { anchor: '_itemIcon', why: '同上' },
  { anchor: '_footer', why: '同上' },
  { anchor: '_selected', why: '只在菜单项被选中时出现' },
  { anchor: '_rail', why: '只在输入框有附件时出现' },
  { anchor: '_toBottomSlot', why: '只在会话未位于底部时渲染（回到底部按钮出现时）' },
  { anchor: '_workspace', why: '只在 hero 的工作区行存在时渲染（无工作区时整行不渲染）' },
  { anchor: '_leadingSeat', why: '标题栏左侧座位：只在桌面标题栏布局下渲染；关合侧栏去重时用 :has(button[aria-label=打开侧边栏]) 限定，缺失即不隐藏（安全降级）' },
  { anchor: 'widthHandle', why: '会话区拖动改宽的手柄：只在会话视图渲染；只用于隐藏它的 hover 竖线（::after），缺失即不隐藏（安全降级）' },
]

/** 在给定根节点下审计锚点，返回缺失项。作用域不在场时跳过该组（不报）。 */
export function findMissingHostAnchors(root: ParentNode): MissingHostAnchor[] {
  const missing: MissingHostAnchor[] = []
  for (const group of HOST_ANCHOR_GROUPS) {
    const scope = root.querySelector(group.scope)
    if (scope === null) continue
    for (const anchor of group.anchors) {
      if (scope.querySelector(anchor) === null) missing.push(`${group.scope} > ${anchor}`)
    }
  }
  return missing
}

/** 从缺失项反查它属于哪一组（用于警告文案）。 */
const groupOf = (missing: MissingHostAnchor): HostAnchorGroup | undefined =>
  HOST_ANCHOR_GROUPS.find(group => missing.startsWith(`${group.scope} > `))

/**
 * 持续审计宿主锚点：作用域在场但锚点缺失即报警。
 * 同一组缺失只报一次（上游改名会同时打掉一整组，重复报没有新信息）。
 *
 * @param root - 观察根节点，默认 `document.body`。
 * @returns dispose 函数。
 */
export function observeHostAnchors(root: HTMLElement | null = typeof document === 'undefined' ? null : document.body): () => void {
  if (root === null) return () => {}
  const reported = new Set<string>()
  let scheduled = false

  const check = (): void => {
    scheduled = false
    // 2026-10-28（T2 深审）：侧栏开合动画期间每帧都有 DOM 写入 → 观察器每帧调度一次，
    // 而一次审计要对每组作用域做 querySelector（全文档走查）。
    // 动画期间锚点不可能改名或消失，跳过；动画结束后的下一批 mutation 会自然再跑。
    if (typeof document !== 'undefined' && document.querySelector('[data-dcu-sidebar-motion]') !== null) return
    const missing = findMissingHostAnchors(root)
    if (missing.length === 0) return
    // 按组聚合，避免一次改名刷出 5 条几乎相同的警告。
    const byScope = new Map<string, MissingHostAnchor[]>()
    for (const item of missing) {
      const scope = item.split(' > ')[0]
      byScope.set(scope, [...(byScope.get(scope) ?? []), item])
    }
    for (const [scope, items] of byScope) {
      if (reported.has(scope)) continue
      reported.add(scope)
      const consequence = groupOf(items[0])?.consequence ?? '相关样式会静默失效'
      console.warn(
        `[dsh-zcode-ui] 宿主锚点失效：${scope} 在场，但契约锚点缺失 ${items.map(item => item.split(' > ')[1]).join('、')}。`
        + ` 后果：${consequence}。`
        + ' 多半是上游改了 CSS Module 的块名或哈希——请更新 HOST_ANCHOR_GROUPS 与对应样式'
        + '（见 docs/ZCODE-DESIGN.md §12）。',
      )
    }
  }

  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    // 宿主一次状态切换会连打多个 mutation，合并到下一帧再查，避免重复计算。
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
