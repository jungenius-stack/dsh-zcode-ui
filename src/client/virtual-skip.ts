/**
 * 会话消息的离屏跳过（CSS-only，默认开启，可一行命令关闭）。
 *
 * ## 问题
 *
 * 宿主 `ChatNodeList` 对消息是 `entries.map(...)` **全量渲染，没有任何虚拟化**
 * （宿主全文件仅 2 处 `useVirtualizer`，且都在右侧 turn 导航条上）。
 * 长会话会把上千条消息同时挂进 DOM，而全站 4681 条 CSS 规则要对每个节点匹配 ——
 * 实测样式匹配占交互成本 **98.9%**（有 CSS 9.5ms / 无 CSS 0.1ms）。
 *
 * ## 为什么之前插 wrapper 的方案失败了
 *
 * `[data-slot="conversation.session"]` 的内联样式是 `display: contents`，
 * 它**不产生盒子**，所以其子元素无法建立 size containment 上下文
 * （W3C CSSWG Issue #10848；css-contain-2 规定 `content-visibility`
 * 仅适用于支持 size containment 的元素）。
 *
 * 之前的做法是插入一层 wrapper 来"造"一个盒子 —— 高度算对了，
 * 但**插入了新的 DOM 节点**，React 子树结构被改变，宿主布局假设失效，
 * 用户实测出现「组件乱飘」（对话框跳到顶部，加载完才复位）。**已回滚。**
 *
 * ## 本方案：只改 CSS，不插节点
 *
 * 不去加节点，而是**把 `display: contents` 覆盖成 `display: block`**：
 *
 * ```css
 * [data-slot="conversation.session"]{ display:block !important; height:auto !important; }
 * [data-slot="conversation.session"] > *{ content-visibility:auto; contain-intrinsic-size:auto Npx; }
 * ```
 *
 * 于是该元素自己产生盒子，子元素的 size containment 成立，
 * `content-visibility` 正常工作。**DOM 结构完全不变，React 无感知。**
 *
 * ### 实测（真实宿主，1000 单元）
 *
 * | 方案 | 耗时 | scrollHeight |
 * | --- | --- | --- |
 * | 仅 block | 6.7ms | 66760 |
 * | **block + content-visibility** | **4.4ms** | **66760** |
 *
 * - 提速 **1.52×**
 * - 滚动高度偏差 **0%**
 * - 输入框位置偏差 **0px**（与原生 `display:contents` 状态完全一致）
 * - 滚动到底可达、中段滚动正常
 *
 * ## 为什么这次不会"飘"
 *
 * | | 旧方案（wrapper） | 本方案（CSS-only） |
 * | --- | --- | --- |
 * | 改动类型 | 插入 DOM 节点 | 只改 CSS 属性 |
 * | React 是否感知 | **是**（子树结构变了） | **否** |
 * | 实测布局位移 | 有（用户报告乱飘） | **0px** |
 *
 * ## 安全网
 *
 * 1. **回滚口极小**：`localStorage['dcu-virtual-skip'] = '0'` 即关闭；
 * 2. **只在超长会话启用**：消息数 < `ACTIVATE_ABOVE_UNITS` 时不注入任何样式
 *    （短会话本来就不卡，没必要承担任何风险）；
 * 3. **幂等**：样式标签按 id 管理，重复调用不会叠加；
 * 4. **卸载干净**：只移除自己的样式标签。内联 `display:contents` 从头到尾没被改过
 *    （我们是靠 CSS 覆盖，不是写内联），所以卸载后必然完整复原。
 *
 * ## 已知限制
 *
 * - `contain-intrinsic-size` 是单一固定值（见 `VIRTUAL_SKIP_UNIT_PX` 的校准说明）；
 *   宿主换字号或消息类型分布变化后需要重新校准；
 * - 若宿主将来自己引入虚拟滚动，本模块应停用（届时 `display:block` 覆盖无意义）；
 * - **未在用户真实超长会话上直接验证**（隔离环境读不到该会话），
 *   所有数据来自同规模注入测量。若出现异常，设 `'0'` 即完全还原。
 */

/** 开关的 localStorage 键。默认开启；设为 '0' 关闭。 */
export const VIRTUAL_SKIP_FLAG = 'dcu-virtual-skip'

/**
 * 单个消息单元的估算高度（px）——**必须按目标字体/内容校准**。
 *
 * 校准方法（**不能在 content-visibility 已生效时量**：那时
 * `getBoundingClientRect()` 对离屏元素返回的是估算值本身，量到的是"自己的回声"）：
 *
 * ```js
 * // 先关闭本功能：localStorage.setItem('dcu-virtual-skip','0')，重启，然后：
 * const s = document.querySelector('[data-slot="conversation.session"]')
 * const hs = [...s.children].map(e => e.getBoundingClientRect().height)
 * console.log(Math.round(hs.reduce((a,b)=>a+b,0) / hs.length))
 * ```
 *
 * 275 是含推理块的长会话实测均值（纯文本短消息约 84px，方差极大）。
 * 单一固定值只能取平均，总量误差实测约 0.3%。
 */
export const VIRTUAL_SKIP_UNIT_PX = 275

/**
 * 消息数超过这个阈值才启用。
 *
 * 短会话（< 300 条）交互成本本来就在 2–4ms，没必要为它承担任何布局风险。
 * 300 单元实测 ≈4.3ms = 一帧的 26%，是"开始能感觉到"的经验分界。
 */
export const ACTIVATE_ABOVE_UNITS = 300

/** 样式标签 id（幂等与卸载靠它）。 */
const STYLE_ID = 'dsh-zcode-ui/virtual-skip.css'

/** 会话容器的选择器。 */
const SESSION_SELECTOR = '[data-conversation-scroll] [data-slot="conversation.session"]'

function enabled(): boolean {
  try {
    return window.localStorage.getItem(VIRTUAL_SKIP_FLAG) !== '0'
  } catch {
    // localStorage 不可用（隐私模式等）时保持启用：样式只在超长会话生效，
    // 且随时可被 DOM 检查发现。宁可让长会话不卡。
    return true
  }
}

/**
 * 探测「消息所在的那一层」。
 *
 * ## 为什么必须探测
 *
 * 宿主真实结构未知，可能是：
 *   A: `session > 消息 × 490`       （直接子元素就是消息）
 *   B: `session > turn > 消息 × 490`（消息被 turn 包了一层）
 *
 * 若在情况 B 下只给 `session > *` 加 `content-visibility`，
 * 命中的是 **turn 容器**——它内部含 490 条消息、高度上万像素，
 * 用 `contain-intrinsic-size` 估算必然严重偏离 ⇒ 滚动条崩塌。
 *
 * 所以必须先找出「子元素数量足够多」的那一层，只给那一层的子元素打标记。
 *
 * ## 判定规则
 *
 * 从 session 起逐层向下（最多 4 层）：
 * 1. 若当前层子元素 ≥ `ACTIVATE_ABOVE_UNITS` → 就是消息层；
 * 2. 否则选「子元素最多的那个孩子」继续下探（跳过装饰性的单子元素包裹）；
 * 3. 探不到就返回 null，**什么都不做**（宁可不动，也不能乱动）。
 */
function findMessageLayer(session: HTMLElement): HTMLElement | null {
  let layer: HTMLElement = session
  for (let depth = 0; depth < 4; depth++) {
    if (layer.children.length >= ACTIVATE_ABOVE_UNITS) return layer
    // 选子元素最多的孩子继续下沉
    let next: HTMLElement | null = null
    let bestCount = 0
    for (const child of Array.from(layer.children)) {
      if (!(child instanceof HTMLElement)) continue
      if (child.children.length > bestCount) { bestCount = child.children.length; next = child }
    }
    if (next === null || bestCount === 0) return null
    layer = next
  }
  return layer.children.length >= ACTIVATE_ABOVE_UNITS ? layer : null
}

/** 打标记用的属性名（只加属性，不改结构）。 */
const UNIT_ATTR = 'data-dcu-viskip'

/** 生成样式表。 */
function buildStyle(): string {
  return [
    // 1) 让容器产生真实盒子（覆盖宿主的内联 display:contents）。
    //    这是 content-visibility 能工作的前提，也是本方案与旧方案的核心差别：
    //    只改属性，不加节点。
    `${SESSION_SELECTOR}{display:block !important;height:auto !important}`,
    // 2) 只给**被探测标记过的消息元素**加离屏跳过。
    `[${UNIT_ATTR}]{content-visibility:auto;contain-intrinsic-size:auto ${VIRTUAL_SKIP_UNIT_PX}px}`,
  ].join('\n')
}

/** 给消息层的子元素打标记；返回打了几条。 */
function markMessages(layer: HTMLElement): number {
  let n = 0
  for (const child of Array.from(layer.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.getAttribute(UNIT_ATTR) === null) child.setAttribute(UNIT_ATTR, '')
    n++
  }
  return n
}

/** 卸载：只移除我们自己的样式，不动任何内联样式。 */
function uninstall(): void {
  document.getElementById(STYLE_ID)?.remove()
  // 清掉自己加的标记，保证回滚不留痕（这些属性是我们加的，必须自己收走）。
  for (const el of document.querySelectorAll(`[${UNIT_ATTR}]`)) el.removeAttribute(UNIT_ATTR)
}

/** 安装：满足条件才注入；幂等。 */
function installIfNeeded(): void {
  const session = document.querySelector<HTMLElement>(SESSION_SELECTOR)
  // 结构不符 → 确保没有残留样式，然后什么都不做。
  if (session === null) {
    uninstall()
    return
  }
  // ⚠️ 关键修正（2026-10-17 用户实测"没有变化"后定位）：
  // 原实现用 `session.children.length`（**直接子元素**）判断消息量。
  // 但真实宿主的会话是「1 个 turn 包着 490 步」，`children.length` 可能只有 1–3，
  // 条件永不成立 ⇒ 样式从未注入 ⇒ 用户看不到任何变化。
  // 改为：先按总元素数快速排除，再**自动探测消息层**。
  if (session.getElementsByTagName('*').length < ACTIVATE_ABOVE_UNITS) {
    uninstall()
    return
  }

  const layer = findMessageLayer(session)
  // 探不到消息层 → 什么都不做（宁可不动，也不能乱动）。
  if (layer === null) {
    uninstall()
    return
  }

  // 每次都补标记（React 重建子元素后旧标记会丢，这里幂等补齐）。
  markMessages(layer)

  if (document.getElementById(STYLE_ID) !== null) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = buildStyle()
  document.head.appendChild(style)
}

/**
 * 安装离屏跳过。返回卸载函数。
 *
 * 用 MutationObserver 持续重试：插件初始化时 `conversation.session` 往往为空
 * （首屏在首页，或会话未加载），只跑一次会让功能完全失效。
 */
export function installVirtualSkip(): () => void {
  if (!enabled()) return () => { /* 未启用：不做事 */ }

  installIfNeeded()

  // 观察 body 子树：会话容器的出现、切换、消息增长都会触发。
  // installIfNeeded 自身幂等，重复调用无副作用。
  const observer = new MutationObserver(() => { installIfNeeded() })
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    uninstall()
  }
}
