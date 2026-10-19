/**
 * 版本账三方对账：git tag / package.json 历史 / CHANGELOG 章节。
 *
 * 为什么存在：2026-10-19 体检发现三套版本记录互相不一致——tags 21 个、package.json 历史
 * 22 个、CHANGELOG 章节 26 个，交集只有 20。漂移清单（仅 CHANGELOG 有、既无 tag 也无
 * package.json 记录）：1.13.0 / 1.14.0 / 1.15.1 / 1.15.2 / 1.15.3；1.1.0 有 tag 有
 * package.json 但 CHANGELOG 缺章节。**没有任何断言守护这张清单**，所以它会继续烂。
 *
 * 口径（刻意选「tag 为真源」）：发布的事实是 tag——它指向一个 commit，可 checkout、可复盘。
 * package.json 与 CHANGELOG 是它的表达。因此断言方向是：
 *
 *     package.json 历史 ∪ CHANGELOG 章节  ⊆  tag 集合 ∪ 明确登记的例外
 *
 * 例外必须写在这里、写清理由。**不许为了让断言变绿而删 CHANGELOG 章节**——那是在毁灭历史
 * 记录，比断言变红糟得多。
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

const git = (args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

/**
 * 登记在案、明确「没有对应 tag」的版本。
 * 每一条都要能回答「为什么它没有 tag」——答不出来的，说明当初真的漏打了，那该补 tag 而不是登记。
 */
const KNOWN_NO_TAG: Record<string, string> = {
  // 2026-10-19 体检：1.13.0 / 1.14.0 打进了 CHANGELOG，package.json 却从 1.12.0 直接跳到
  // 1.15.0——说明这两个版本没有真正发布过（或发布时漏了版本号与 tag 两道手续）。
  // 不补 tag：tag 指向的 commit 需要能复现当时的构建产物，事后补等于伪造发布记录。
  '1.13.0': '未发布：package.json 未经过该版本号',
  '1.14.0': '未发布：package.json 未经过该版本号',
  // 1.15.1–1.15.3 只在 CHANGELOG 出现。1.15.4 起才有 tag，说明前三版是同一批修复的
  // 内部迭代，合并进了 1.15.4 的发布。
  '1.15.1': '内部迭代，合并进 1.15.4',
  '1.15.2': '内部迭代，合并进 1.15.4',
  '1.15.3': '内部迭代，合并进 1.15.4',
  // 1.15.0 进了 package.json **和** CHANGELOG，却唯独没打 tag——三处记录里缺一处。
  // 这是本断言第一次运行时抓出来的（2026-10-19 体检漏报了它）。不补 tag：事后补会伪造时间线；
  // 记在这里，让"有版本、无发布记录"这件事至少是可见的。
  '1.15.0': '漏打 tag：版本号与 CHANGELOG 都已写入，唯独没有对应的 tag',
}

/** 登记在案、明确「CHANGELOG 里没有章节」的版本。 */
const KNOWN_NO_CHANGELOG: Record<string, string> = {
  '1.1.0': 'tag 与 package.json 都有，但当期未写 CHANGELOG 章节（历史遗留，事后补写等于编造）',
}

const failures: string[] = []

// ── 1. tag 集合 ────────────────────────────────────────────────────────────
const tags = new Set(
  git(['tag'])
    .split('\n')
    .map(line => line.trim().replace(/^v/, ''))
    .filter(Boolean),
)
if (tags.size === 0) {
  failures.push('git tag 读到 0 个标签——对账口径已失效（浅克隆？不是 git 仓库？），不能当成「没有问题」')
}

// ── 2. package.json 的版本历史 ──────────────────────────────────────────────
// 逐个 commit 读当时的值。只扫 package.json 有变更的提交，避免全历史遍历。
const packageJsonCommits = git(['log', '--format=%H', '--', 'package.json'])
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
const packageVersions = new Set<string>()
for (const commit of packageJsonCommits) {
  try {
    const raw = git(['show', `${commit}:package.json`])
    const parsed = JSON.parse(raw) as { version?: string }
    if (typeof parsed.version === 'string') packageVersions.add(parsed.version)
  } catch {
    // 该提交里 package.json 不存在或不可解析——跳过，它不贡献版本信息。
  }
}
if (packageJsonCommits.length === 0) {
  failures.push('git log -- package.json 读到 0 个提交——对账口径已失效')
}

// ── 3. CHANGELOG 章节 ──────────────────────────────────────────────────────
const changelog = read('CHANGELOG.md')
const changelogVersions = new Set(
  [...changelog.matchAll(/^##\s+\[?(\d+\.\d+\.\d+)\]?/gm)].map(match => match[1]),
)
if (changelogVersions.size === 0) {
  failures.push('CHANGELOG.md 里一个 `## x.y.z` 章节都没解析到——标题格式变了，对账口径已失效')
}

// ── 4. 断言：union ⊆ tags ∪ 例外 ───────────────────────────────────────────
for (const version of [...packageVersions].sort()) {
  if (!tags.has(version) && KNOWN_NO_TAG[version] === undefined) {
    failures.push(
      `package.json 出现过 ${version}，但既没有 tag 也没登记例外。` +
        `要么补 tag（发布过的版本必须有），要么在 KNOWN_NO_TAG 里写清为什么没有`,
    )
  }
}
for (const version of [...changelogVersions].sort()) {
  if (!tags.has(version) && KNOWN_NO_TAG[version] === undefined) {
    failures.push(
      `CHANGELOG 有 ${version} 章节，但既没有 tag 也没登记例外。` +
        `注意：不许删章节来让它变绿——那份记录是发布历史的一部分`,
    )
  }
}

// ── 5. 反向断言：tag 必须能在 CHANGELOG 或例外登记里找到 ────────────────────
// 只查一个方向等于给 bug 留后门（有一版忘了写 tag 会被抓到，但「有 tag 无记录」不会被抓）。
for (const version of [...tags].sort()) {
  if (!changelogVersions.has(version) && KNOWN_NO_CHANGELOG[version] === undefined) {
    failures.push(
      `tag ${version} 在 CHANGELOG.md 里没有章节，也没登记例外——` +
        `打 tag 时必须同步更新 CHANGELOG，否则使用者无从知道这一版改了什么`,
    )
  }
}

// ── 6. 例外表自身的卫生 ────────────────────────────────────────────────────
// 例外一旦补上 tag/章节，就该从表里删掉，否则它会变成一层永久的"免检"。
for (const version of Object.keys(KNOWN_NO_TAG)) {
  if (tags.has(version)) {
    failures.push(`KNOWN_NO_TAG 里的 ${version} 已经有 tag 了，请从例外表删除`)
  }
}
for (const version of Object.keys(KNOWN_NO_CHANGELOG)) {
  if (changelogVersions.has(version)) {
    failures.push(`KNOWN_NO_CHANGELOG 里的 ${version} 已经有 CHANGELOG 章节了，请从例外表删除`)
  }
}

if (failures.length > 0) {
  console.error('✗ version-ledger: 版本账不一致')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

console.log(
  `✓ version-ledger: tags ${tags.size} / package.json 历史 ${packageVersions.size} / ` +
    `CHANGELOG 章节 ${changelogVersions.size}，` +
    `例外 ${Object.keys(KNOWN_NO_TAG).length + Object.keys(KNOWN_NO_CHANGELOG).length} 条（均已登记理由）`,
)
