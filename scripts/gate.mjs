/**
 * 本地门禁：把「能自动跑的真检查」串成一条命令，供 pre-push 钩子与将来的 CI 共用。
 *
 * 设计原则与 tests/run-assertions.mjs 一致：**跑完全部再汇总**，已知红项显式登记
 * （下面两张表），不静默跳过、也不因为存量红项挡住正常提交；只有**新增**失败才拦截。
 * 登记项一旦转绿会主动提示移除。全部红项与原因见 docs/KNOWN-ISSUES.md §3 / §6。
 *
 * 未纳入的检查及原因见 docs/KNOWN-ISSUES.md §6：
 *   - vitest（tests/**\/*.spec.ts）：本机缺 rolldown 原生绑定，起不来；
 *   - 需要活宿主的三个脚本（verify-compat-host / verify-settings-exit /
 *     verify-session-features-host）：依赖 DCU_DSH_URL 等环境与隔离 profile。
 */
import { spawnSync } from 'node:child_process'

const NODE = process.execPath

/**
 * 已登记的断言套件失败（见 KNOWN-ISSUES §3）。2026-10-12 清空：
 * 原先 3 项上游漂移已修（另有 34 处 Codex 时代视觉模式随之一并重定基），现 34 通过 / 3 跳过 / 0 失败。
 */
const KNOWN_RED_ASSERT = []

/** 已登记的真浏览器布局失败（见 KNOWN-ISSUES §6）。2026-10-12 清空：11 个脚本全绿。 */
const KNOWN_RED_LAYOUT = []

/**
 * 已登记的 vitest 失败文件（见 KNOWN-ISSUES §9）。2026-10-12 清空：
 * 首测的 20 个用例已逐条定性并修复（全部为测试侧问题），现 47 文件 / 311 用例全绿。
 */
const KNOWN_RED_VITEST_FILES = []

const LAYOUT = [
  ['scripts/verify-workspace-drop-layout.mjs', ['--run']],
  ['scripts/verify-sidebar-transition.mjs', []],
  ['scripts/verify-sidebar-expand-control.mjs', []],
  ['scripts/verify-sidebar-titlebar.mjs', []],
  ['scripts/verify-running-indicator.mjs', []],
  ['scripts/verify-motion-budget.mjs', []],
  ['scripts/verify-composer-style.mjs', []],
  ['scripts/verify-new-conversation.mjs', []],
  ['scripts/verify-composer-tools.mjs', []],
  ['scripts/verify-hero-width.mjs', []],
  ['scripts/verify-settings-backdrop.mjs', []],
  ['scripts/verify-settings-geometry.mjs', []],
  ['scripts/verify-upstream-style-regressions.mjs', []],
  ['scripts/verify-a11y-and-overflow.mjs', []],
]

/** 去掉 ANSI 颜色码：vitest 的 `FAIL` 带颜色时前面是转义序列，会破坏行首匹配。 */
const stripAnsi = text => text.replace(/\u001B\[[0-9;]*m/g, '')

const run = (args, label) => {
  const started = Date.now()
  const result = spawnSync(NODE, args, { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const output = stripAnsi(`${result.stdout ?? ''}${result.stderr ?? ''}`).trim()
  const ok = result.status === 0
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (${seconds}s)`)
  if (!ok && output !== '') console.log(output.split('\n').slice(-6).map(line => `      ${line}`).join('\n'))
  return { ok, output }
}

console.log('== 1/4 类型检查 ==')
const typecheck = run(['node_modules/typescript/bin/tsc', '--noEmit'], 'tsc --noEmit')

console.log('\n== 2/4 断言套件（tests/run-assertions.mjs）==')
const assertions = run(['tests/run-assertions.mjs'], 'run-assertions')
const failedAsserts = (/已失败：(.+)/.exec(assertions.output)?.[1] ?? '')
  .split('、').map(name => name.trim()).filter(Boolean)
const newAssertFailures = failedAsserts.filter(name => !KNOWN_RED_ASSERT.includes(name))
// 无法判定：进程非零退出，但没能从输出里解析出失败清单（脚本本身崩了、被信号杀掉、或汇总格式变了）。
// 此时 failedAsserts 为空会被读成「0 项失败」——必须显式拦下，否则崩溃会被当成通过。
const assertUndecided = !assertions.ok && failedAsserts.length === 0
const assertedGreen = KNOWN_RED_ASSERT.filter(name => !failedAsserts.includes(name))

console.log('\n== 3/4 vitest（tests/**/*.spec.ts）==')
const vitest = run(['node_modules/vitest/vitest.mjs', 'run'], 'vitest run')
// 环境错（用错 Node 导致原生绑定被 macOS 签名拦住）必须显式拦下，不能当"通过"。
const vitestEnvBroken = /Cannot find native binding|different Team IDs/.test(vitest.output)
const vitestFailedFiles = [...new Set([...vitest.output.matchAll(/^\s*FAIL\s+(tests\/\S+\.spec\.ts)/gm)].map(match => match[1]))]
const newVitestFailures = vitestFailedFiles.filter(file => !KNOWN_RED_VITEST_FILES.includes(file))
const vitestGreen = KNOWN_RED_VITEST_FILES.filter(file => !vitestFailedFiles.includes(file))
// 同上一处：EPERM / OOM / 配置报错等**未列入白名单**的启动崩溃，进程非零退出但解析不到 FAIL 文件，
// 原先会直接落到「全部通过」分支（实测过：沙箱不让写 node_modules 时触发 EPERM，汇总行照打「全部通过」）。
const vitestUndecided = !vitest.ok && !vitestEnvBroken && vitestFailedFiles.length === 0

console.log('\n== 4/4 真浏览器布局检查 ==')
const redLayout = new Set(KNOWN_RED_LAYOUT.map(entry => entry.script))
const newLayoutFailures = []
let layoutPassed = 0
for (const [script, extra] of LAYOUT) {
  const { ok } = run([script, ...extra], script)
  if (ok) layoutPassed += 1
  if (ok && redLayout.has(script)) console.log(`      ↑ 已转绿：请从 scripts/gate.mjs 的 KNOWN_RED_LAYOUT 移除 ${script}`)
  if (!ok && !redLayout.has(script)) newLayoutFailures.push(script)
}
for (const name of assertedGreen) console.log(`      ↑ 已转绿：请从 scripts/gate.mjs 的 KNOWN_RED_ASSERT 移除 ${name}`)
for (const file of vitestGreen) console.log(`      ↑ 已转绿：请从 scripts/gate.mjs 的 KNOWN_RED_VITEST_FILES 移除 ${file}`)

console.log('\n== 汇总 ==')
console.log(`类型检查：${typecheck.ok ? '通过' : '失败'}`)
console.log(assertUndecided
  ? '断言套件：**无法判定**——进程非零退出但没有解析到失败清单，请手动跑 `node tests/run-assertions.mjs` 看真实原因'
  : `断言套件：已登记失败 ${failedAsserts.length} 项，新增失败 ${newAssertFailures.length} 项`)
console.log(vitestEnvBroken
  ? 'vitest：**环境错误**——当前 Node 加载不了 rolldown 原生绑定，见 docs/KNOWN-ISSUES.md §5（不要把 DSH 自带 Node 24 放到 PATH 前面）'
  : vitestUndecided
    ? 'vitest：**无法判定**——进程非零退出但没有解析到失败文件，请手动跑 `npm run test:unit` 看真实原因'
    : vitestFailedFiles.length === 0
      ? 'vitest：全部通过'
      : `vitest：${vitestFailedFiles.length} 个文件失败（已登记 ${vitestFailedFiles.filter(file => KNOWN_RED_VITEST_FILES.includes(file)).length} 个）/ 新增 ${newVitestFailures.length} 个`)
console.log(`布局检查：${layoutPassed} 通过 / ${KNOWN_RED_LAYOUT.length} 已登记红项 / ${newLayoutFailures.length} 新增失败（共 ${LAYOUT.length} 项）`)
console.log('未纳入本档：三个需要活宿主的脚本（verify-compat-host / verify-settings-exit / verify-session-features-host）—— 它们由重型档 npm run gate:host 覆盖，见 docs/KNOWN-ISSUES.md §10.3')

const blocked = !typecheck.ok || vitestEnvBroken || assertUndecided || vitestUndecided || newAssertFailures.length > 0
  || newVitestFailures.length > 0 || newLayoutFailures.length > 0
if (blocked) {
  if (newAssertFailures.length > 0) console.log(`\n新增断言失败（门禁拦截）：${newAssertFailures.join('、')}`)
  if (newVitestFailures.length > 0) console.log(`\n新增 vitest 失败文件（门禁拦截）：${newVitestFailures.join('、')}`)
  if (newLayoutFailures.length > 0) console.log(`\n新增布局失败（门禁拦截）：${newLayoutFailures.join('、')}`)
  if (!typecheck.ok) console.log('\n类型检查失败（门禁拦截）。')
  if (vitestEnvBroken) console.log('\nvitest 未能运行（环境错误，门禁拦截）：请按 docs/KNOWN-ISSUES.md §5 换用 22.22.2-6 或 PATH 上的 Node 22。')
  process.exit(1)
}
console.log('\n门禁通过：无新增失败。')
