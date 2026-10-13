/**
 * 皮肤信封 —— 让进入我们地盘的外来内容自动收敛到皮肤的排版基线。
 *
 * ## 为什么需要它
 *
 * 外来内容契约（`foreign-content-contract.ts`）解决的是"**已知的**外来插件怎么收敛"，
 * 但它靠**枚举类名**——而 DSH 生态里的外来内容大量使用 CSS Module 哈希类名
 * （实测会话区有 `yhfFVG_*` / `cl2Rlq_*` / `wXeviG_*` / `sk-*`，侧栏有 `dsh-session-kit-*`），
 * 根本枚举不完。用户的要求是「**不论加入什么插件都能融入**」，枚举制答不了这条。
 *
 * ## 做法：能继承的属性只在表面上设一次
 *
 * `font-family` 与 `font-variant-numeric` 是**继承属性**——在表面上设一次，
 * 所有后代自动跟随；外来内容若自己显式设了字体，那条声明依然胜出（我们尊重它，
 * 因为那通常是有意的，例如代码块要等宽）。这比重型后代通配更干净：
 * 不需要 `:not()` 长清单，不会用高特异性覆盖别人的有意设定。
 *
 * 唯一不继承的是 `box-sizing`，它对每个元素单独生效，因此需要后代规则——
 * 这也与皮肤既有写法（`.dcu-root *{box-sizing:border-box}`）一致。
 *
 * ## 分寸：绝不碰外来内容的颜色、字号、圆角、间距、布局
 *
 * 颜色是语义（错误红、成功绿、品牌色），字号和布局是功能结构——越过这条线，
 * 我们就开始"修复"别人的组件，那是把别人的 UI 变成自己的 bug
 * （详见 docs/KNOWN-ISSUES.md 的负面结果登记）。
 */

/** 本插件拥有话语权的表面：外来内容落在这些容器里，就受信封约束。 */
export const SKIN_SURFACES = [
  '.dcu-root',
  '.dcu-settings-page',
  '.dcu-home',
  '[data-dcu-settings-page]',
  '[data-conversation-scroll]',
  '[data-phase=hero]',
] as const

/** 表面清单拼接成的选择器。 */
const SURFACE_LIST = SKIN_SURFACES.join(',')

/** 后代通配（box-sizing 用）。 */
const DESCENDANTS = SKIN_SURFACES.map(surface => `${surface} *`).join(',')

export const SKIN_ENVELOPE_STYLE = [
  // 1) 继承属性只在表面上设一次：字体、数字格式。后代自动跟随；
  //    外来内容若显式设了字体/数字格式，其自身声明仍胜出（尊重有意设定）。
  `${SURFACE_LIST}{font-family:var(--dsw-font-family)}`,
  `${SURFACE_LIST}{font-variant-numeric:tabular-nums}`,

  // 2) box-sizing 不继承，需逐元素；与皮肤既有 `.dcu-root *` 写法同一约定。
  `${DESCENDANTS}{box-sizing:border-box}`,
  `${DESCENDANTS}::before,${DESCENDANTS}::after{box-sizing:border-box}`,
].join('\n')
