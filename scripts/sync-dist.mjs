/**
 * 把 dist/ 的构建产物原子同步到 lib/。
 *
 * 为什么需要它：tsdown 的 outDir 已改为 dist/（2026-10-27），因为 lib/ 是 DSH
 * 实际加载的部署目录。若构建直接写 lib/，覆写瞬间被 reload 就会读到半截文件
 * → `dsh-zcode-ui: import failed` → web boot 崩。一天内发生过 3 次。
 *
 * 本脚本做两件事：
 *   1) 校验 dist/client.js 语法（坏了拒绝同步，lib/ 保持上一次的完整产物）；
 *   2) 逐文件 cp 到临时名再 mv -f 覆盖 —— mv 在同一文件系统内是原子的，
 *      读者要么看到旧文件、要么看到新文件，绝不会看到半截。
 *
 * 用法: node scripts/sync-dist.mjs
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, renameSync, copyFileSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(REPO, 'dist')
const LIB = join(REPO, 'lib')
/* 2026-10-27（软链实验）：dsh-zcode-ui 已从软链改为**实体目录**部署
   （~/.dsh/profiles/desktop/node_modules/dsh-zcode-ui），用于验证「软链读取时序」
   是否为启动期 404 的诱因。因此这里要同时写两处：仓库 lib/ 与部署实体目录。 */
const DEPLOY = join(homedir(), '.dsh/profiles/desktop/node_modules/dsh-zcode-ui/lib')
const CLIENT = join(DIST, 'client.js')

// 1) 语法校验
const check = spawnSync(process.execPath, ['--input-type=module', '--check'], {
  input: readFileSync(CLIENT),
  encoding: 'utf8',
})
if (check.status !== 0) {
  console.error('✗ dist/client.js 语法错误，拒绝同步（lib/ 保持原样）')
  console.error((check.stderr || '').slice(0, 400))
  process.exit(1)
}
console.log('✓ dist/client.js 语法校验通过')

// 2) 逐文件原子落盘
const files = readdirSync(DIST)
let synced = 0
const targets = [LIB]
if (existsSync(DEPLOY)) targets.push(DEPLOY)
for (const name of files) {
  const src = join(DIST, name)
  if (!statSync(src).isFile()) continue
  for (const dir of targets) {
    const dst = join(dir, name)
    const tmp = join(dir, `.${name}.tmp-sync-${process.pid}`)
    copyFileSync(src, tmp)
    renameSync(tmp, dst)   // 原子替换
  }
  synced += 1
}
/*
 * 3) 写产物指纹 client.js.sha（2026-10-27 第 27 轮评审要求）
 *
 * 起因：评审方一次「未修复」的误判，根因是页面跑的是**构建前的旧 bundle**。
 * 有了这个指纹，任何人跑性能/交互验证前都能一条命令确认「页面加载的是不是最新产物」：
 *   node scripts/verify-bundle-freshness.mjs
 * 门禁里也挂了同一个检查，产物没同步就红。
 */
const digest = createHash('sha256').update(readFileSync(join(DIST, 'client.js'))).digest('hex')
const stamp = { sha256: digest, builtAt: new Date().toISOString(), bytes: statSync(join(DIST, 'client.js')).size }
for (const dir of targets) writeFileSync(join(dir, 'client.js.sha'), JSON.stringify(stamp, null, 2) + '\n')

console.log(`✓ 已原子同步 ${synced} 个文件到 ${targets.length} 处`)
for (const dir of targets) console.log(`  ${dir.replace(homedir(), '~')}: ${statSync(join(dir, 'client.js')).size} bytes`)
console.log(`  产物指纹 sha256=${digest.slice(0, 16)}…`)
