/**
 * 产物完整性守卫（2026-10-27 第 27 轮评审判定：残缺构建事故）。
 *
 * ── 为什么必须有 ────────────────────────────────────────────────────────────
 * 事故：`lib/client.js`（部署态）里 0 处 `function conversationScroller` /
 * `function animateScroll` / `function slideTail`，而点击处理函数第 3 行就在调用
 * `conversationScroller()`。live 页面每次点击都抛
 *   `Uncaught ReferenceError: conversationScroller is not defined`
 * TCP-01 平滑、点击闪光、reduced-motion 瞬跳、TCP-02 等待窗口**四条一起失效**。
 *
 * 为什么现有守卫没拦住：
 *   - `sync-dist.mjs` 只做「语法能解析」校验 —— 缺函数体但调用点在，语法照样合法；
 *   - `verify-bundle-freshness.mjs` 只比哈希自洽 —— 残缺包同样能自洽。
 *   两者都不看「产物里到底有没有源码定义的那些符号」。
 *
 * ── 本脚本的判据 ────────────────────────────────────────────────────────────
 * 对**部署态** `lib/client.js` 断言符号**存在定义**，而不是「包含字符串」——
 * 调用点也含 `conversationScroller`，只查字符串会永远通过。
 * 定义形式接受两种（rolldown 可能把 `function X` 压成 `X = function` 或 `X = ...=>`）：
 *   `function X(`  或  `X = `  / `X =function` / `const X =`
 *
 * 副作用：只读。
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'

const REPO = '/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui'
const CANDIDATES = [
  join(REPO, 'lib', 'client.js'),
  join(homedir(), '.dsh/profiles/desktop/node_modules/dsh-zcode-ui/lib/client.js'),
]

/** 本轮事故涉及的符号（与 `scroll-anim.ts` 导出对应）。 */
const REQUIRED = [
  { name: 'conversationScroller', why: '点击处理首选调用，缺它点击直接抛 ReferenceError' },
  { name: 'animateScroll', why: '点击刻度的平滑滚动入口' },
  { name: 'slideTail', why: '瞬移后的尾段滑入 + TCP-02 等待窗口基线比对' },
  { name: 'scrollAnims', why: '动画句柄表（WeakMap），用于取消/让位' },
]

const isDefined = (src, name) => {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`function\\s+${esc}\\s*\\(`),          // function X(...)
    new RegExp(`(?:const|let|var)\\s+${esc}\\s*=`),   // const X = ...
    new RegExp(`(?:^|[;{}\\s])${esc}\\s*=\\s*(?:function|\\()`), // X = function / X = (...)
  ]
  return patterns.some((re) => re.test(src))
}

let checked = 0
let failed = false

for (const file of CANDIDATES) {
  if (!existsSync(file)) {
    console.log(`· 跳过（不存在）：${file.replace(homedir(), '~')}`)
    continue
  }
  const src = readFileSync(file, 'utf8')
  const missing = REQUIRED.filter(({ name }) => !isDefined(src, name))
  checked += 1
  if (missing.length > 0) {
    failed = true
    console.error(`✗ ${file.replace(homedir(), '~')} 缺少定义：`)
    for (const m of missing) console.error(`    · ${m.name}  —— ${m.why}`)
  } else {
    console.log(`✓ ${file.replace(homedir(), '~')}：${REQUIRED.length} 个符号均有定义（${Math.round(src.length / 1024)}k 字符）`)
  }
}

if (checked === 0) {
  console.log('· 未找到任何产物文件，跳过完整性检查')
  process.exit(0)
}

if (failed) {
  console.error('\n修复：删掉 dist 后重新完整构建并同步')
  console.error('  rm -rf dist && npm run build:sync')
  assert.fail('产物残缺：源码定义了符号，但部署产物里找不到它们的定义')
}

console.log('✓ 产物完整性：四个滚动动画符号在部署产物中均有定义')
