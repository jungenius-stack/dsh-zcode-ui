import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(directory).filter(name => /\.assert\.(?:mjs|ts)$/.test(name)).sort()

const passed = []
const skipped = []
const failed = []

for (const name of files) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', resolve(directory, name)], {
    cwd: resolve(directory, '..'),
    encoding: 'utf8',
  })
  if (result.error !== undefined) throw result.error

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

  // 跑完全部再汇总，而不是遇到第一个失败就退出——存量失败一次看清，不必逐个手跑。
  if (result.status !== 0) {
    failed.push({ name, output })
    continue
  }

  // 脚本可打印 SKIP: 前缀并正常退出，表示它有意跳过（原因见各文件顶部说明）。
  // 这类脚本不计入通过数、单独汇报，避免「跳过」被混进「通过」里。
  if (/^SKIP:/m.test(output)) {
    process.stdout.write(output)
    skipped.push(name)
    continue
  }

  if (output.trim() !== '') process.stdout.write(output)
  passed.push(name)
}

for (const { name, output } of failed) {
  console.log(`\n──────── FAIL: ${name} ────────`)
  console.log(output.trim().split('\n').slice(0, 10).join('\n'))
}

console.log(`\n断言套件：${passed.length} 通过 / ${skipped.length} 跳过 / ${failed.length} 失败（共 ${files.length} 个脚本）`)
if (skipped.length > 0) console.log(`  已跳过：${skipped.join('、')}`)
if (failed.length > 0) console.log(`  已失败：${failed.map(item => item.name).join('、')}`)

process.exit(failed.length > 0 ? 1 : 0)
