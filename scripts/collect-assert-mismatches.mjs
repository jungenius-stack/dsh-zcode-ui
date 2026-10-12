/**
 * 列出 `*.assert.ts` 里**全部**不匹配的源码模式断言。
 *
 * 为什么需要它：这些文件用的是原生 `assert.match`，第一条不匹配就抛错，所以直接跑
 * `node tests/run-assertions.mjs` 一次只能看到一条失败——ZCode 改造后两份视觉断言文件各有
 * 23 / 11 处过期模式，靠"跑一次改一条"要剥三十多轮。
 *
 * 原理：把 `assert.match` / `assert.doesNotMatch` 换成收集器，生成临时副本**放进 tests/**（这样
 * 文件里的 `new URL('../src/...', import.meta.url)` 仍能解析），用与 `tests/run-assertions.mjs`
 * 相同的 `--import tsx` 跑一遍，输出「说明 ← 期望模式」，最后删除临时文件。
 * 其余断言（equal / ok / deepEqual…）保持原生行为，真出错时依旧会抛。
 *
 * 用法：node scripts/collect-assert-mismatches.mjs tests/conversation-visuals.assert.ts [更多文件…]
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const HEAD = [
  'const __failures = []',
  'const check = {',
  '  match: (value, re, message) => { if (!re.test(value)) __failures.push(String(message) + " ← " + String(re)) },',
  '  doesNotMatch: (value, re, message) => { if (re.test(value)) __failures.push("[反向] " + String(message) + " ← " + String(re)) },',
  '}',
  'process.on("exit", () => {',
  '  console.log("__MISMATCHES__ " + __failures.length)',
  '  for (const failure of __failures) console.log(" - " + failure)',
  '})',
  '',
].join('\n')

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('用法：node scripts/collect-assert-mismatches.mjs tests/<name>.assert.ts [...]')
  process.exit(1)
}

let mismatches = 0
for (const file of files) {
  const temp = resolve('tests', `.collect-${basename(file).replace(/\.assert\.ts$/, '')}.ts`)
  const source = readFileSync(resolve(file), 'utf8')
  writeFileSync(temp, HEAD + source.replace(/assert\.match\(/g, 'check.match(').replace(/assert\.doesNotMatch\(/g, 'check.doesNotMatch('))
  try {
    const result = spawnSync(process.execPath, ['--import', 'tsx', temp], { encoding: 'utf8' })
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    console.log(`\n=== ${basename(file)} ===`)
    const lines = output.split('\n')
    const reported = lines.filter(line => line.startsWith(' - ') || line.startsWith('__MISMATCHES__'))
    console.log(reported.length > 0 ? reported.join('\n') : output.slice(0, 1500))
    mismatches += Number(/__MISMATCHES__ (\d+)/.exec(output)?.[1] ?? 0)
  } finally {
    rmSync(temp, { force: true })
  }
}
console.log(`\n合计不匹配：${mismatches}`)
