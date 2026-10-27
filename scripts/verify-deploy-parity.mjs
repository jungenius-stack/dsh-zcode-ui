/**
 * 部署一致性断言（2026-10-27 新增）
 *
 * 背景：`dsh-zcode-ui` 已从软链改为**实体目录**部署（软链假设实验）。
 * 这带来一个新风险：仓库 `lib/` 与部署目录变成**两份拷贝**，会漂移。
 *
 * 本断言保证：只要两份都存在，逐字节必须一致。
 * 若检测到部署位仍是软链（回滚后），则跳过——软链天然一致，无需检查。
 */
import { statSync, readFileSync, existsSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'

const REPO = '/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui'
const SRC = join(REPO, 'lib')
const DEPLOY_ROOT = join(homedir(), '.dsh/profiles/desktop/node_modules/dsh-zcode-ui')
const DEPLOY = join(DEPLOY_ROOT, 'lib')
const FILES = ['client.js', 'index.mjs', 'session-title-plugin.mjs']

if (!existsSync(DEPLOY_ROOT)) {
  console.log('· 部署位不存在，跳过')
  process.exit(0)
}

// 软链形态天然一致，无需比对
let isSymlink = false
try { isSymlink = lstatSync(DEPLOY_ROOT).isSymbolicLink() } catch {}
if (isSymlink) {
  console.log('· 部署位是软链（已回滚），一致性与仓库同源，跳过逐字节比对')
  process.exit(0)
}

const diffs = []
for (const name of FILES) {
  const a = join(SRC, name)
  const b = join(DEPLOY, name)
  if (!existsSync(a) || !existsSync(b)) { diffs.push(`${name}（缺文件）`); continue }
  const sa = statSync(a), sb = statSync(b)
  if (sa.size !== sb.size || !readFileSync(a).equals(readFileSync(b))) {
    diffs.push(`${name}（${sa.size} vs ${sb.size}）`)
  }
}

assert.deepEqual(diffs, [],
  `仓库 lib/ 与部署实体目录不一致，说明只写了一份（跑 node scripts/sync-dist.mjs 修复）：${diffs.join('、')}`)

console.log(`✓ 部署一致性：${FILES.length} 个文件在仓库 lib/ 与部署实体目录逐字节一致`)
