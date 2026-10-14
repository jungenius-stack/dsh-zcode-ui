/**
 * 重型档：把 compat harness 包成一条命令。
 *
 *   npm run gate:host
 *
 * 与 `scripts/gate.mjs` 的分工：那个是**每次提交都跑**的快速档（约 55 秒，类型检查 + 断言 + vitest + 11 个真机布局脚本）；
 * 这个是**只在改动宿主交互时才跑**的重型档——它会打包插件、装进一个隔离 DSH_HOME、起一个真实 `dsh web`，
 * 再跑四个活宿主脚本（约 1～2 分钟）。
 *
 * 前置条件（详见 docs/KNOWN-ISSUES.md §5 / §10）：
 *   - Node 22.22.x：**不要**把 DSH 自带的 Node 24 放到 PATH 前面，它在 macOS 上加载不了 rolldown 原生绑定；
 *   - 已安装 Playwright 自带的 Chromium：`./node_modules/.bin/playwright install chromium`；
 *   - 能找到 dsh CLI：默认取 DSH 桌面版 App 内的 CLI，可用环境变量 DCU_DSH_BIN 覆盖。
 *
 * 版本不写死：直接读 `<cli> --version`（宿主版本就是它报的值）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const candidates = [
  process.env.DCU_DSH_BIN,
  '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh',
].filter(candidate => candidate !== undefined && candidate !== '')
const cli = candidates.find(candidate => existsSync(candidate))
if (cli === undefined) {
  console.error('找不到 dsh CLI：请设置 DCU_DSH_BIN 指向一个可用的 dsh。')
  process.exit(1)
}

const versionResult = spawnSync(cli, ['--version'], { encoding: 'utf8' })
// 桌面 CLI 是 Electron 垫片：在被其它 App 环境变量污染（NODE_OPTIONS/ELECTRON_RUN_AS_NODE）时
// 会先往 stderr 打一行 ERROR 再输出版本。因此不能取「最后一行」，要扫全部行找版本号。
const reported = `${versionResult.stdout ?? ''}`
  .split('\n')
  .map(line => line.trim())
  .filter(line => /^\d+\.\d+\.\d+/.test(line))
  .pop() ?? ''
if (!/^\d+\.\d+\.\d+/.test(reported)) {
  console.error(`无法从 \`${cli} --version\` 读到版本号，实测输出：${`${versionResult.stdout ?? ''}${versionResult.stderr ?? ''}`.trim()}`)
  process.exit(1)
}
console.log(`宿主 CLI：${cli}\n宿主机版本：${reported}`)

const packDir = mkdtempSync(path.join(tmpdir(), 'dcu-gate-host-'))
// 先构建再打包：`files` 里发的是 lib/ 预构建产物，src 改动后不 build 就 pack，
// 测的会是旧 bundle（2026-10-14 实测踩坑：移植后直接 gate:host，活宿主跑的全是旧代码，
// 症状是「官方侧栏渲染、插件条目 abdicated」，与真实回归极难区分）。
console.log('构建插件（npm run build）…')
const build = spawnSync('npm', ['run', 'build'], { encoding: 'utf8', stdio: 'inherit' })
if (build.status !== 0) {
  console.error('构建失败，中止活宿主门禁。')
  process.exit(build.status ?? 1)
}
console.log('打包插件（npm pack）…')
const pack = spawnSync('npm', ['pack', '--pack-destination', packDir], { encoding: 'utf8' })
if (pack.status !== 0) {
  console.error(`${pack.stdout ?? ''}${pack.stderr ?? ''}`)
  process.exit(1)
}
const tarball = path.join(packDir, (pack.stdout ?? '').trim().split('\n').pop()?.trim() ?? '')
if (!existsSync(tarball)) {
  console.error(`未生成 tarball：${tarball}`)
  process.exit(1)
}
console.log(`产物：${tarball}\n\n运行 compat harness（隔离宿主，约 1～2 分钟）…\n`)

const result = spawnSync(process.execPath, ['scripts/run-compat-host.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, DCU_DSH_BIN: cli, DCU_E2E_TARBALL: tarball, DCU_E2E_VERSION: reported },
})
process.exit(result.status ?? 1)
