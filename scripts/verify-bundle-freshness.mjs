/**
 * 产物新鲜度守卫（2026-10-27 第 27 轮评审要求）。
 *
 * ── 为什么需要它 ────────────────────────────────────────────────────────────
 * 评审方曾据一次「TCP-02 未修复」的复测下结论，后来发现**页面跑的是构建之前的旧
 * bundle** —— 同一份代码重启后四档全过。这类误判的代价是双向的：
 * 修好的被当成没修，没修的也可能被当成修好。
 *
 * 本脚本给出一条确定性命令，回答「部署目录里的 client.js 是不是最新产物」：
 *
 *   ① 部署目录 `client.js` 的实际 sha256 必须等于同目录 `client.js.sha` 里记录的值；
 *   ② 仓库 `lib/` 与部署目录（非软链时）必须逐字节一致（与 verify-deploy-parity 互补）；
 *   ③ 仓库 `lib/client.js` 不得比 `dist/client.js` 旧 —— 说明构建后忘了同步。
 *
 * 判定：任一不满足即红，并打印「怎么修」。
 * 副作用：只读。不修改任何文件。
 */
import { readFileSync, statSync, existsSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const REPO = '/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui'
const REPO_LIB = join(REPO, 'lib')
const DIST = join(REPO, 'dist')
const DEPLOY_ROOT = join(homedir(), '.dsh/profiles/desktop/node_modules/dsh-zcode-ui')
const DEPLOY_LIB = join(DEPLOY_ROOT, 'lib')

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const fail = (msg, fix) => {
  console.error(`✗ ${msg}`)
  console.error(`  修复：${fix}`)
  process.exitCode = 1
}

// ① 部署目录的指纹必须自洽
if (!existsSync(DEPLOY_ROOT)) {
  console.log('· 部署目录不存在（本机未装此插件），跳过')
  process.exit(0)
}
const isSymlink = (() => { try { return lstatSync(DEPLOY_ROOT).isSymbolicLink() } catch { return false } })()
const deployClient = join(DEPLOY_LIB, 'client.js')
const deploySha = join(DEPLOY_LIB, 'client.js.sha')

if (!existsSync(deploySha)) {
  fail('部署目录缺少 client.js.sha（说明用的是旧版同步脚本，或从未跑过 build:sync）',
    'node scripts/sync-dist.mjs')
} else {
  const recorded = JSON.parse(readFileSync(deploySha, 'utf8'))
  const actual = sha(deployClient)
  if (actual !== recorded.sha256) {
    fail(`部署产物与指纹不符——页面加载的可能不是最新构建\n    指纹记录 ${recorded.sha256.slice(0, 16)}…（${recorded.builtAt}）\n    实际计算 ${actual.slice(0, 16)}…`,
      'node scripts/sync-dist.mjs  然后重启应用（不要用 Page.reload，本宿主会崩）')
  } else {
    console.log(`✓ 部署产物指纹自洽：${actual.slice(0, 16)}…（构建于 ${recorded.builtAt}）`)
  }
}

// ② 仓库 lib/ 不得比 dist/ 旧（说明构建后忘了同步）
if (existsSync(join(DIST, 'client.js'))) {
  const distMtime = statSync(join(DIST, 'client.js')).mtimeMs
  const libMtime = statSync(join(REPO_LIB, 'client.js')).mtimeMs
  if (distMtime > libMtime + 1000) {
    fail(`dist/client.js 比 lib/client.js 新 ${Math.round((distMtime - libMtime) / 1000)}s —— 构建后没同步`,
      'node scripts/sync-dist.mjs')
  } else {
    console.log('✓ lib/ 不比 dist/ 旧（构建产物已同步）')
  }
}

// ③ 仓库 lib/ 与部署目录（非软链时）必须一致
if (!isSymlink) {
  const a = join(REPO_LIB, 'client.js')
  const b = deployClient
  if (existsSync(a) && existsSync(b) && !readFileSync(a).equals(readFileSync(b))) {
    fail('仓库 lib/ 与部署目录 client.js 不一致（两份拷贝已漂移）',
      'node scripts/sync-dist.mjs')
  } else {
    console.log('✓ 仓库 lib/ 与部署目录逐字节一致')
  }
} else {
  console.log('· 部署位是软链，与仓库同源，跳过逐字节比对')
}

if (process.exitCode === 1) {
  assert.fail('产物新鲜度检查未通过（见上方修复建议）')
}
console.log('\n✓ 产物新鲜度检查通过：当前部署的就是最新构建')
