/** 使用指定版本的 CLI，在全新 profile 安装构建包并执行真实浏览器回归。 */
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cli = process.env.DCU_DSH_BIN
const tarball = process.env.DCU_E2E_TARBALL
const version = process.env.DCU_E2E_VERSION
if (!cli || !tarball || !['0.1.2-rc.1', '0.1.5-rc.1', '0.1.5-rc.2', '0.1.5-rc.3', '0.1.7-rc.1', '0.1.7-rc.2', '0.2.0-rc.1', '0.2.0-rc.2'].includes(version)) throw new Error('需要 DCU_DSH_BIN、DCU_E2E_TARBALL 和精确的 DCU_E2E_VERSION')
const repo = fileURLToPath(new URL('../', import.meta.url))
// 版本守卫分两条路径：
//   ① 权威来源：`<cli> --version`。桌面版 App 的 CLI 就是可用的 dsh，但它把宿主打进 app.asar，
//      node_modules 里没有 @deepseek-ai/dsh 可供 require.resolve —— 只能这样问版本；
//   ② 更强的逐包校验：CLI 由已发布的 npm 包装出来时（上游 CI 的情形），其 node_modules 能解析出
//      @deepseek-ai/*，这时额外确认 8 个关键包没有混入其它候选版本。
const reported = spawnSync(cli, ['--version'], { encoding: 'utf8' })
const reportedVersion = `${reported.stdout ?? ''}${reported.stderr ?? ''}`.trim().split('\n').pop()?.trim()
assert.equal(reportedVersion, version, `CLI 报告的宿主机版本必须是 ${version}（实测 ${reportedVersion}）`)
try {
  const resolve = createRequire(cli)
  for (const name of ['dsh', 'dsh-base', 'dsh-web-app', 'dsh-client-ui-layout', 'dsh-client-ui-conversation', 'dsh-client-ui-sidebar', 'dsh-client-ui-session', 'dsh-client-ui-settings']) {
    assert.equal(JSON.parse(await readFile(resolve.resolve(`@deepseek-ai/${name}/package.json`), 'utf8')).version, version, `${name} 不能混入其他候选版本`)
  }
} catch (error) {
  // 只放过"解析不到包"这一种情况；版本不符的断言必须照旧抛出。
  if (error?.code !== 'MODULE_NOT_FOUND') throw error
  console.log('· CLI 无法解析 @deepseek-ai/* 包（桌面版 App 打进 asar），已按 `--version` 校验宿主版本，跳过逐包校验')
}
// 必须 realpath：macOS 的 tmpdir 是 /var/... 符号链接，宿主会把工作区路径规范化成 /private/var/...，
// 而插件按「会话 cwd」作键存输入历史（InputHistoryDock 的 scope = session.cwd）。夹具若用未规范化的路径，
// 种进 localStorage 的历史永远取不到（verify-compat-host 的 ArrowUp 调回断言就会超时）。
const root = await realpath(await mkdtemp(path.join(tmpdir(), 'dcu-compat-host-')))
const env = { ...process.env, DSH_HOME: path.join(root, 'home'), DCU_E2E_WORKSPACE: path.join(root, 'workspace') }
await mkdir(env.DCU_E2E_WORKSPACE)
// CLI 有两种形态：npm 安装的 JS 入口（用当前 node 跑）与 App 自带的 shell 垫片（直接执行，由垫片自己解析 node）。
// 其余脚本一律仍是 `node <script>`。
const cliIsNodeScript = /^#![^\n]*\bnode\b/.test(await readFile(cli, 'utf8').catch(() => ''))
const cliCommand = args => args[0] === cli && !cliIsNodeScript ? { file: cli, args: args.slice(1) } : { file: process.execPath, args }
function run(args, extraEnv = env) {
  return new Promise((resolve, reject) => {
    const { file, args: commandArgs } = cliCommand(args)
    const child = spawn(file, commandArgs, { cwd: repo, env: extraEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { output += data })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(output)))
  })
}
console.log(`准备 ${version} 隔离宿主：${root}`)
await run([cli, 'plugin', '--profile', 'web', 'add', path.resolve(tarball), path.join(repo, 'scripts', 'fixtures', 'compat-panel')])
// 本 fork 的包名是裸名 `dsh-zcode-ui`（已从上游的 @michengai/dsh-codex-ui 改名），安装目录一并变化。
const installed = await realpath(path.join(env.DSH_HOME, 'profiles', 'web', 'node_modules', 'dsh-zcode-ui'))
const relativeInstall = path.relative(await realpath(root), installed)
assert.ok(relativeInstall !== '' && relativeInstall !== '..' && !relativeInstall.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeInstall), '必须测试已安装的 tarball，不能链接回开发仓库')
const patch = await readFile(path.join(installed, 'cordis.patch.yml'), 'utf8')
// 1.12.0 起为 insert-only 架构：官方侧栏/设置壳/官方标题提供方保持启用（KNOWN-ISSUES §23.2），
// 补丁里不允许再出现任何 disabled 条目；标题插件经 insert 挂载。
assert.doesNotMatch(patch, /disabled: true/, 'insert-only 架构：安装包补丁不得再禁用任何官方插件')
assert.match(patch, /id: zcode-ui-session-title\s+name: 'dsh-zcode-ui\/session-title'/, '安装包必须单独挂上 ZCode UI first-prompt 标题插件')
const titlePlugin = await readFile(path.join(installed, 'lib/session-title-plugin.mjs'), 'utf8')
assert.match(titlePlugin, /zcode-ui-session-title/, '安装包必须注册 ZCode UI first-prompt 标题提供方')
const { file: serverFile, args: serverArgs } = cliCommand([cli, 'web', '--no-open', '--port', '0'])
const server = spawn(serverFile, serverArgs, { cwd: env.DCU_E2E_WORKSPACE, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  const url = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('宿主启动超时')), 90000)
    const inspect = data => {
      output += data
      const match = output.match(/dsh web: (http:\/\/[^\s]+)/)
      if (match) { clearTimeout(timeout); resolve(match[1]) }
    }
    server.stdout.on('data', inspect)
    server.stderr.on('data', inspect)
    server.once('error', error => { clearTimeout(timeout); reject(error) })
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`宿主提前退出 ${code}: ${output}`)) })
  })
  const testEnv = { ...env, DCU_DSH_URL: url, DCU_E2E_REPORT: path.join(root, 'browser-report.json'), DCU_E2E_SCREENSHOT: path.join(root, 'browser.png') }
  console.log(await run(['scripts/verify-compat-host.mjs'], testEnv))
  console.log(await run(['scripts/verify-settings-exit.mjs'], testEnv))
  console.log(await run(['scripts/verify-session-features-host.mjs'], testEnv))
  console.log(await run(['scripts/verify-workspace-shortcuts-host.mjs'], testEnv))
} finally {
  server.kill()
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve))
}
// 留存隔离 profile 供失败排查；验收记录应写明路径，清理不得触及用户真实 profile。
console.log(`完成 ${version}；隔离证据目录：${root}`)
