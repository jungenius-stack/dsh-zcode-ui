/**
 * 消息离屏跳过的契约测试。
 *
 * ## 锁什么
 *
 * 1. **只改 CSS，不插 DOM 节点** —— 这是与失败方案（插 wrapper → 用户实测乱飘）
 *    的根本分界。一旦有人改回插节点，布局风险立刻回归，这条必须红。
 * 2. **必须覆盖 `display:contents`** —— `content-visibility` 需要 size containment
 *    上下文，而 `conversation.session` 的内联样式是 `display:contents`（不产生盒子）。
 *    W3C CSSWG #10848 / css-contain-2 规定该属性仅适用于支持 size containment 的元素。
 * 3. **短会话不注入** —— 降低风险面。
 * 4. **卸载只移除自己的样式** —— 内联样式从未被改，必然可完整复原。
 * 5. **默认开启，但回滚口极小**（设 `'0'`）。
 *
 * ## 为什么断言这些而不是"渲染对不对"
 *
 * 本模块不渲染 UI，只改宿主渲染行为。所以能测的只有契约：
 * 什么时候该动、动了之后改的是什么、撤的时候干不干净。
 * 真实体感必须在活宿主里验。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/client/virtual-skip.ts'), 'utf8')

// ── 1. 开关：默认开启，回滚口极小 ──────────────────────────────────────────
assert.match(
  source,
  /VIRTUAL_SKIP_FLAG\s*=\s*'dcu-virtual-skip'/,
  '开关键名变了：文档与用户的回滚方式依赖这个名字',
)
assert.match(
  source,
  /localStorage\.getItem\(VIRTUAL_SKIP_FLAG\)\s*!==\s*'0'/,
  '默认开启的判据必须是 !== 0；改成 === 1 会让功能在未设键时静默失效',
)

// ── 1b. 必须自动探测消息层（2026-10-17 实测教训）─────────────────────────
// 真实宿主结构是 session > turn > 490条消息，session.children.length = 1。
// 若用直接子元素数判断，条件永不成立 ⇒ 样式从未注入 ⇒ 用户"没有变化"。
assert.match(
  source,
  /function findMessageLayer/,
  '必须自动探测消息所在层级：不能假设消息是 session 的直接子元素',
)
assert.ok(
  !/session\.children\.length\s*<\s*ACTIVATE_ABOVE_UNITS/.test(source),
  '不得用「session 直接子元素数」判断消息量：真实宿主可能只有 1 个 turn 容器包住全部消息',
)
assert.match(
  source,
  /getElementsByTagName\('\*'\)\.length\s*<\s*ACTIVATE_ABOVE_UNITS/,
  '应改为统计整棵子树元素数（与真实的样式匹配成本一致）',
)
assert.match(
  source,
  /if \(layer === null\) \{/,
  '探测不到消息层时必须什么都不做（宁可不动，也不能乱动）',
)
assert.match(
  source,
  /removeAttribute\(UNIT_ATTR\)/,
  '卸载必须清掉自己加的标记属性，保证回滚不留痕',
)

// ── 2. 必须只改 CSS，绝不插 DOM 节点（这是失败方案的分界线）────────────────
assert.ok(
  !source.includes("createElement('div')"),
  '不得插入 DOM 节点：旧方案（插 wrapper）会被 React 感知并导致组件乱飘，已实测回滚',
)
assert.ok(
  !/\.appendChild\((wrapper|moved)\)/.test(source),
  '不得把宿主的消息节点搬进自建容器——那是导致布局破坏的直接原因',
)
// 允许创建一个 style 元素（这是改 CSS 的唯一手段）
assert.match(
  source,
  /document\.createElement\('style'\)/,
  '应当通过 <style> 注入规则（只改 CSS，不动结构）',
)

// ── 3. 必须覆盖 display:contents，否则 content-visibility 无效 ──────────────
assert.match(
  source,
  /display:block !important;height:auto !important/,
  '必须把 display:contents 覆盖成 block 并解除 height 限制；否则子元素无法建立 size containment',
)
assert.match(
  source,
  /content-visibility:auto;contain-intrinsic-size:auto \$\{VIRTUAL_SKIP_UNIT_PX\}px/,
  '样式必须用常量注入估算高度，避免与源码常量漂移',
)

// ── 4. 短会话必须不注入（降低风险面）──────────────────────────────────────
// 阈值判断必须基于「整棵子树元素数」而非「直接子元素数」（见 1b 的教训）。
assert.match(
  source,
  /getElementsByTagName\('\*'\)\.length < ACTIVATE_ABOVE_UNITS/,
  '必须校验元素总数超过阈值才启用；短会话不该承担布局风险',
)
assert.match(
  source,
  /ACTIVATE_ABOVE_UNITS\s*=\s*300/,
  '阈值变了需要重新论证（300 ≈ 4.3ms = 一帧 26%，是"开始能感觉到"的分界）',
)

// ── 5. 卸载必须只移除自己的样式，不能碰内联样式 ────────────────────────────
assert.match(
  source,
  /getElementById\(STYLE_ID\)\?\.remove\(\)/,
  '卸载必须移除样式标签',
)
assert.ok(
  !/\.style\.display\s*=/.test(source),
  '不得写入内联样式：一旦写内联，宿主重渲染时会互相覆盖，且难以干净复原',
)
// 不得改动宿主节点的 style 属性（但允许清理**我们自己的**标记属性）。
assert.ok(
  !/\.removeAttribute\('style'\)|setAttribute\('style'|\.style\.cssText\s*=/.test(source),
  '不得改动宿主的 style 属性',
)
// 我们自己的标记属性必须清理干净。
assert.match(
  source,
  /removeAttribute\(UNIT_ATTR\)/,
  '卸载必须清掉自己加的标记属性',
)

// ── 6. 必须持续重试（初始化时会话容器通常为空）───────────────────────────
assert.match(
  source,
  /new MutationObserver\(\(\) => \{ installIfNeeded\(\) \}\)/,
  '必须用 MutationObserver 反复重试：初始化时 conversation.session 常为空，只跑一次等于没开',
)
assert.match(
  source,
  /observer\.disconnect\(\)/,
  '卸载必须断开观察者',
)

// ── 7. 幂等：重复调用不得叠加样式标签 ─────────────────────────────────────
assert.match(
  source,
  /if \(document\.getElementById\(STYLE_ID\) !== null\) return/,
  '缺少幂等守卫：重复注入会叠加多个 style 标签',
)

// ── 8. 估算值的校准方法必须写在注释里（防止重犯"量到自己的回声"）──────────
assert.match(
  source,
  /不能在 content-visibility 已生效时量/,
  '必须保留校准警告：开着 content-visibility 量高度会量到估算值本身',
)

// ── 9. 文档必须记录这个开关，否则没人知道怎么关 ───────────────────────────
const issues = readFileSync(resolve(root, 'docs/KNOWN-ISSUES.md'), 'utf8')
assert.match(
  issues,
  /dcu-virtual-skip/,
  'KNOWN-ISSUES 必须记录这个开关',
)

console.log('virtual-skip 契约：9 组断言全部通过')
