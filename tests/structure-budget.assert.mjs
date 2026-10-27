#!/usr/bin/env node
/**
 * 结构债棘轮。
 *
 * 背景：`docs/KNOWN-ISSUES.md` 早在评审阶段就登记过这笔债（「约 690 行的函数；!important 40 处」），
 * 但登记之后没有任何检查会去更新它——2026-10-18 实测已是 1135 行文件 / 741 行函数 / 48 处。数字写下
 * 来的那一刻是对的，之后没有任何机制让它跟上，而它比不记更危险，因为它会让人以为有人管。
 *
 * 判据是**双向**的：涨了报红（防止债务无声扩大），降了也报红（防止预算虚高成无限额度）——
 * 与 `tests/design-system.assert.ts` 的圆角棘轮同一形态。
 *
 * 实测值一律取自 `scripts/baseline.mjs` 的 `computeBaseline()`，本文件不重复实现统计逻辑：
 * 两份实现迟早会分叉，而分叉后的断言会比没有断言更糟。
 */

import { computeBaseline } from '../scripts/baseline.mjs'

/**
 * 预算。下调是进展，上调必须走一次显式编辑并在这里留下理由——
 * 「改一行数字就绿了」与「没有人改」之间的差别，就是这道门存在的全部意义。
 */
const BUDGET = {
  largestClientFileLines: 1136,
  /* 2026-10-26 +2（48 → 50）：
     CodexSidebar.tsx 的 `html[data-dcu-codex-sidebar-initialized] [data-...]{background-color:...!important}`
     用于切断侧栏开合动画期间的壁纸穿透链。实测去掉后 computed 立刻回到 rgba(0,0,0,0)，
     右侧「透明背景」问题复发；宿主对 frame 有更高优先级的底色规则，普通声明压不动。
     只覆盖 background-color，不碰 backdrop-filter / background-image，原生毛玻璃不受影响。 */
  /* 2026-10-26 +2（50 → 52）：
     CodexSidebar.tsx 的浮层改为 ZCode 口径（320px / 左偏 56 / 顶对齐，CDP 实测三条刻度）。
     `top` 必须 !important —— 宿主用 JS 内联写 top（--turn-preview-center 驱动），普通声明压不过内联。
     `left`/`right` 同理是宿主定位属性，夹具实测去掉后 left 立刻回落到 -310。
     其余属性（width/max-width/translate）已用 0,2,2 特异性覆盖，不再占用 !important。 */
  /* 2026-10-27 +2（52 → 54）：
     G11 自绘接管需要 `html:has([data-dcu-official-turn-empty]) .dcu-turn-navigator{display:block!important}`。
     实测不加 !important 会被原有「supported=true 就 display:none」那条压住
     （导航 display 仍是 none、宽高 0、点击打空）。这是**接管态必须赢过隐藏态**的
     语义要求，属于有理由的强制优先级，不是随手加的。 */
  /* 2026-10-27 +1（54 → 55），另 +3 为历史未同步的增量（详见下）：
     本轮 P2 新增 1 处：`button.dsh-po-btn{border-radius:var(--dsw-radius-lg)!important}`。
     原因：那颗「优化」按钮（来自 @y1x1n/dsh-prompt-optimizer）的 999px 是 **JS 内联样式**
     （实测 style 属性里直接写着），内联优先级高于任何选择器，普通 CSS 压不动，
     只有 !important 能改。它挂在 [data-composer-card] 里与宿主按钮同排，不统一会很突兀。
     只此一处、只针对这一颗外来按钮。

     实测总数 58 与登记 54 之间还有 3 处差额，来源是**过去几轮改动未同步预算**（非本轮引入）：
     conversation-layout.ts 的 G11 接管规则（1）、conversation-header.ts（1）、
     virtual-skip.ts（1）。这三处当时没走预算更新，属于本门禁漏记，本轮一并补上。 */
  importantOccurrences: 58,
  todoMarkers: 0,
}

const live = computeBaseline().structure

const failures = []
const ratchets = []

function check(key, label, hint) {
  const current = live[key]
  const budget = BUDGET[key]
  if (current === undefined) {
    failures.push(`${label}：computeBaseline() 没有产出 ${key}——统计口径已失效，不是「没问题」`)
    return
  }
  if (current > budget) {
    failures.push(`${label}：实测 ${current}，预算 ${budget}（超出 ${current - budget}）${hint ? `\n    ${hint}` : ''}`)
    return
  }
  if (current < budget) {
    ratchets.push(`${label}：实测 ${current}，预算 ${budget}——已下降，请把 BUDGET.${key} 下调到 ${current}`)
  }
}

check('largestClientFileLines', `${live.largestClientFile} 行数`)
check('importantOccurrences', '!important 出现次数', '皮肤层覆盖宿主确实需要它，但新增一处也要在这里登记理由。')
check('todoMarkers', 'TODO/FIXME/HACK 标记数')

if (failures.length > 0) {
  console.error('✗ structure-budget: 结构债超出预算')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

if (ratchets.length > 0) {
  console.error('✗ structure-budget: 债务已下降，但预算没跟上（否则预算会虚高成无限额度）')
  for (const line of ratchets) console.error(`  ${line}`)
  console.error('  改 BUDGET 后重跑：node --import tsx tests/structure-budget.assert.mjs')
  process.exit(1)
}

console.log(
  `✓ structure-budget: ${live.largestClientFileLines} 行 / ${live.importantOccurrences} 处 !important / ${live.todoMarkers} 个标记，均在预算内`,
)
