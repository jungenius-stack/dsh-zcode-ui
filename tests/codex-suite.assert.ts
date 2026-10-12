import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// ── 显式跳过 ─────────────────────────────────────────────────────────────────
// 本断言校验的是上游 dsh-codex-ui **monorepo** 的聚合包契约：它要求
// ../packages/dsh-codex-suite/ 目录及其 package.json / cordis.patch.yml 存在。
//
// dsh-zcode-ui 已 fork 为**单包仓库**，不存在 packages/ 工作区，因此本文件
// 的第一条断言（existsSync(packagePath)）必然失败——不是代码缺陷，是测试对象
// 本身不在本仓库内。
//
// 处理方式：保留文件与全部断言原文（避免「删测试掩盖问题」，也让上游契约可追溯），
// 在顶部显式跳过。若将来重新引入 packages/ 工作区，删除本段即可恢复执行。
// 注意：这里刻意用 `const SKIP_REASON: string`（显式标注为 string 而非字面量），
// 并放进 if 判断，而不是直接写 `process.exit(0)`——后者返回 never，会让 tsc 把
// 后续断言判为不可达代码、把 assert 收窄成 never，从而报出一片 TS2339。
const SKIP_REASON: string = '校验上游 monorepo 的 packages/dsh-codex-suite 聚合包，本 fork 为单包仓库，无此目录'
if (SKIP_REASON !== '') {
  console.log(`SKIP: codex-suite.assert.ts — ${SKIP_REASON}`)
  process.exit(0)
}
// ─────────────────────────────────────────────────────────────────────────────

const suitePath = new URL('../packages/dsh-codex-suite/', import.meta.url)
const packagePath = new URL('package.json', suitePath)
const installerPackagePath = new URL('../packages/dsh-codex-suite-installer/package.json', import.meta.url)
const patchPath = new URL('cordis.patch.yml', suitePath)
const readmePath = new URL('README.zh-CN.md', suitePath)
const rootReadmePath = new URL('../README.md', import.meta.url)
const rootReadmeZhPath = new URL('../README.zh-CN.md', import.meta.url)

assert.equal(existsSync(packagePath), true, '必须保留旧聚合包源码以支持存量迁移')
assert.equal(existsSync(patchPath), true, '聚合包必须提供 DSH patch')
assert.equal(existsSync(readmePath), true, '聚合包必须说明独立安装方式')

const suite = JSON.parse(readFileSync(packagePath, 'utf8')) as {
  name?: string
  version?: string
  private?: boolean
  files?: string[]
  dsh?: { bundle?: { patch?: string } }
  dependencies?: Record<string, string>
}
const installer = JSON.parse(readFileSync(installerPackagePath, 'utf8')) as {
  dshCodexSuite?: { members?: Record<string, string> }
}
const patch = readFileSync(patchPath, 'utf8')
const readme = readFileSync(readmePath, 'utf8')
const rootReadme = readFileSync(rootReadmePath, 'utf8')
const rootReadmeZh = readFileSync(rootReadmeZhPath, 'utf8')
const packages = [
  '@michengai/dsh-codex-ui',
  '@michengai/dsh-agency-agents',
  '@michengai/dsh-skills-manager',
  '@michengai/dsh-archive-manager',
  '@michengai/dsh-im-connect',
  '@michengai/dsh-automation',
]
const expectedVersions: Record<string, string> = {
  ...installer.dshCodexSuite?.members,
  '@michengai/dsh-codex-ui': 'workspace:*',
}

assert.equal(suite.name, '@michengai/dsh-codex-suite', '聚合包名必须稳定')
assert.equal(suite.private, true, '旧聚合包必须阻止后续误发布')
assert.equal(suite.files?.includes('installer.mjs'), false, '兼容聚合包不应携带会触发整棵依赖解析的 npx 安装器')
assert.equal(suite.dsh?.bundle?.patch, './cordis.patch.yml', 'DSH 必须读取聚合 patch')
assert.match(patch, /id: session-title-llm\s+disabled: true/, '聚合 patch 必须停用官方会话标题 LLM')
assert.match(patch, /id: michengai-codex-ui-session-title\s+name: '@michengai\/dsh-codex-ui\/session-title'/, '聚合 patch 必须单独挂上 Codex UI 会话标题插件')
assert.doesNotMatch(patch, /id: session-title\s*\n\s+disabled: true/, '聚合 patch 不得关闭会话标题服务')
for (const packageName of packages) {
  assert.notEqual(suite.dependencies?.[packageName], undefined, `聚合包必须安装 ${packageName}`)
  assert.equal(suite.dependencies?.[packageName], expectedVersions[packageName], `聚合包必须固定 ${packageName} 的已验证版本`)
  assert.match(patch, new RegExp(`name: '${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `聚合 patch 必须加载 ${packageName}`)
}
assert.match(readme, /不建议新安装使用/, '聚合包说明必须明确不推荐新安装')
assert.doesNotMatch(readme, /dsh-codex-suite-installer@latest/, '聚合包说明不得继续推荐一键安装器')
assert.doesNotMatch(rootReadme, /dsh-codex-suite-installer@latest/, '英文 README 不得继续推荐一键安装器')
assert.doesNotMatch(rootReadmeZh, /dsh-codex-suite-installer@latest/, '中文 README 不得继续推荐一键安装器')
assert.match(rootReadmeZh, /assets\/branding\/dsh-banner\.png/, '中文 README 必须使用全宽横幅')
