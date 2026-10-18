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
  largestClientFileLines: 1135,
  importantOccurrences: 48,
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
