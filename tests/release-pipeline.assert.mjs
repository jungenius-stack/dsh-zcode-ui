/** 隔离目录验证自动升版至双语说明的完整链路，不访问 npm 或用户配置。 */
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseDocument } from 'workflow-yaml'

// ── 显式跳过 ─────────────────────────────────────────────────────────────────
// 本断言校验的是上游 dsh-codex-ui **monorepo 的 GitHub Actions 发布流水线**：
// 它直接读取 .github/workflows/{publish,release,release-suite-installer}.yml，
// 并调用 scripts/prepare-suite-installer-release.mjs 等发布脚本，还要 packages/ 聚合包目录。
//
// dsh-zcode-ui 已 fork 为单包仓库，上述三个发布工作流与 packages/ 都不存在，
// 因此本文件在加载后必然抛 ENOENT——不是代码缺陷，是测试对象不在本仓库内。
//
// 处理方式：保留文件与全部断言原文（避免「删测试掩盖问题」），在顶部显式跳过。
//
// ⚠ 跳过理由会过期：2026-10-18 的体检发现本仓已补上 .github/workflows/ci.yml，而本块
// 当时写的是「既没有 .github/workflows/ 目录」——理由已经半假，跳过却还在，没有任何检查
// 会去戳它。所以下面先做**路径断言**：被跳过的对象一旦被补齐，这里立刻报红，提示把本文件
// 改成正向校验，而不是继续沿用一句已经过期的说明。
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GUARDED_PATHS = [
  '.github/workflows/release.yml',
  '.github/workflows/publish.yml',
  '.github/workflows/release-suite-installer.yml',
  'packages',
]
const appeared = GUARDED_PATHS.filter(relative => existsSync(resolve(repoRoot, relative)))
if (appeared.length > 0) {
  console.error('✗ release-pipeline: 跳过理由已失效——以下被跳过的对象已出现在本仓库：')
  for (const relative of appeared) console.error(`    ${relative}`)
  console.error('  本文件底部的断言现在有真实对象可测。请把顶部 SKIP 块删除，改为正向校验；')
  console.error('  在改完之前，这道门禁保持红色——总比继续跳过、并让「本仓库没有 .github/workflows」写在文档里更诚实。')
  process.exit(1)
}

console.log('SKIP: release-pipeline.assert.mjs — 校验上游 monorepo 的发布流水线（release/publish/release-suite-installer 三个工作流 + packages/），本 fork 为单包仓库，这些对象均不存在')
process.exit(0)
// ─────────────────────────────────────────────────────────────────────────────

{
  const installer = readFileSync('.github/workflows/release-suite-installer.yml', 'utf8')
  const uiRelease = readFileSync('.github/workflows/release.yml', 'utf8')
  assert.ok(!/gh release (create|edit)\b/.test(installer), 'Installer 只打 tag，不创建 GitHub Release')
  assert.ok(!installer.includes('CHANGELOG'), 'Installer 发布不得改写 UI 更新日志')
  assert.ok(!installer.includes('extract-release-notes'), 'Installer 不再从更新日志提取组合包说明')
  assert.ok(installer.includes('git tag -a'), 'Installer 发布后仍须创建 suite-installer-v* 标签')
  assert.ok(uiRelease.includes('gh release create') && uiRelease.includes('gh release edit'), 'UI 标签仍须同步 GitHub Release 说明')
}

for (const name of ['ci.yml', 'publish.yml', 'release.yml', 'release-suite-installer.yml']) {
  const doc = parseDocument(readFileSync(`.github/workflows/${name}`, 'utf8'), { uniqueKeys: true })
  assert.deepEqual(doc.errors, [], `${name} 必须是有效 YAML`)
  const workflow = doc.toJS()
  assert.ok(workflow.on && workflow.jobs)
  for (const key of Object.keys(workflow)) assert.ok(['name', 'on', 'permissions', 'concurrency', 'jobs', 'env', 'defaults', 'run-name'].includes(key), `${name} 根级字段无效：${key}`)
  for (const job of Object.values(workflow.jobs)) {
    if (job.uses) {
      assert.equal(job.steps, undefined)
      assert.ok(job.uses.startsWith('./.github/workflows/'))
      assert.ok(readFileSync(job.uses, 'utf8').includes('workflow_call:'))
      continue
    }
    assert.ok(Array.isArray(job.steps))
    for (const [index, step] of job.steps.entries()) {
      assert.notEqual(step.run === undefined, step.uses === undefined, '步骤必须且只能指定 run 或 uses')
      if (step.run?.trim() === 'pnpm test') {
        const install = job.steps.findIndex(item => item.run?.includes('pnpm install --frozen-lockfile'))
        const browser = job.steps.findIndex(item => item.run?.includes('playwright install --with-deps chromium'))
        assert.ok(install >= 0 && browser > install && browser < index, `${name} 必须先安装依赖及 Chromium 再测试`)
      }
    }
  }
}

const directory = mkdtempSync(join(tmpdir(), 'dcu-release-contract-'))
try {
  for (const file of ['package.json', 'scripts/prepare-suite-installer-release.mjs', 'scripts/extract-release-notes.mjs', 'scripts/release-changelog.mjs', 'packages/dsh-codex-suite-installer/installer.mjs', 'packages/dsh-codex-suite-installer/package.json', 'packages/dsh-codex-suite/package.json']) {
    mkdirSync(dirname(join(directory, file)), { recursive: true })
    copyFileSync(resolve(file), join(directory, file))
  }
  const fixture = '# 更新记录\n\n## Unreleased\n\nPending work\n\n## 0.0.1 - 2020-01-01\n\nHistorical entry\n'
  for (const file of ['CHANGELOG.md', 'CHANGELOG.zh-CN.md']) writeFileSync(join(directory, file), fixture)
  writeFileSync(join(directory, 'mock-registry.mjs'), 'globalThis.fetch = async () => new Response(JSON.stringify({ "dist-tags": { latest: "1.2.3" } }));')
  const run = (script, args = []) => spawnSync(process.execPath, ['--import', './mock-registry.mjs', `scripts/${script}`, ...args], { cwd: directory, encoding: 'utf8' })
  const prepared = run('prepare-suite-installer-release.mjs', ['--release-notes', 'prepared.md'])
  assert.equal(prepared.status, 0, prepared.stderr)
  const notes = readFileSync(join(directory, 'prepared.md'), 'utf8')
  assert.match(notes, /## 中文说明/)
  assert.match(notes, /## English/)
  assert.match(notes, /@michengai\/dsh-codex-ui@1\.2\.3/)
  for (const file of ['CHANGELOG.md', 'CHANGELOG.zh-CN.md']) {
    assert.equal(readFileSync(join(directory, file), 'utf8'), fixture, '组合包发布不得写入 UI 更新日志')
  }
  assert.equal(run('prepare-suite-installer-release.mjs', ['--version', JSON.parse(readFileSync(join(directory, 'packages/dsh-codex-suite-installer/package.json'), 'utf8')).version]).status, 0)
  assert.equal(readFileSync(join(directory, 'CHANGELOG.md'), 'utf8'), fixture, '重试仍不得写入 UI 更新日志')
  const uiVersion = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).version
  writeFileSync(join(directory, 'CHANGELOG.md'), `## ${uiVersion} - 2026-01-01\n\nUI note\n\n`)
  writeFileSync(join(directory, 'CHANGELOG.zh-CN.md'), fixture)
  assert.notEqual(run('extract-release-notes.mjs', [`v${uiVersion}`, 'incomplete.md']).status, 0, '缺少一种语言必须阻止发布')
} finally { rmSync(directory, { recursive: true, force: true }) }
