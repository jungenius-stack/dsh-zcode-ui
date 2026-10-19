#!/usr/bin/env node
/**
 * 文档基线生成器。
 *
 * 为什么存在：README / CONTRIBUTING / KNOWN-ISSUES 里的计数过去是手写的。实测偏差全部朝
 * 同一侧（断言脚本 40→41、布局脚本 16→17、vitest 文件 54→56、令牌 195→197），方向一致
 * 说明是抄写而非测量。数字改为从这里生成后，`tests/docs-baseline.assert.ts` 才能在它们
 * 再次漂移的当下把门禁变红——而不是等下一次外部体检（见 08 号踩坑报告）。
 *
 * 用法：
 *   node --import tsx scripts/baseline.mjs        # 只算静态计数，写 docs/baseline.json + docs/BASELINE.md
 *   node --import tsx scripts/baseline.mjs --run  # 额外实跑断言套件与 vitest，把实跑结果写进 BASELINE.md
 *
 * 静态计数全部可以从磁盘重算，因此断言侧能独立复算并与本文件产物做三方比对；
 * 实跑结果（通过 / 跳过 / 用例数）只写进 BASELINE.md 并标注时间戳，**不**参与断言——
 * 它们随工作树变化，把它们锁成常量就是把快照固化成契约（CODE-040）。
 */

import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ZCODE_DARK, ZCODE_LIGHT, ZCODE_STRUCTURAL } from '../src/client/zcode-tokens.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const read = relative => readFileSync(resolve(root, relative), 'utf8')
// wc -l 口径：换行符数量。文件末尾无换行时比“语义行数”少 1，这里刻意与 wc 保持一致，
// 因为文档里引用的就是 wc -l 的数。
const wcLines = text => (text.match(/\n/g) ?? []).length

/**
 * 已进入索引的文件（已跟踪 + 已暂存）。
 *
 * 基线必须描述**仓库状态**，而不是磁盘状态：CI 检出的是 HEAD，如果本地把一个还没
 * `git add` 的测试文件也算进「56 个 vitest 文件」，那么本地绿、CI 红——这正是
 * 2026-10-18 体检报告第 4 章批判的「本地绿 ≠ CI 绿」，本次修复过程中又亲手复现了一遍
 * （HEAD 实测 55，工作树 56，差的正是未跟踪的 foreign-surface-observer.spec.ts）。
 *
 * 代价是新文件在 `git add` 之前不计入。这是安全的失败方向：`git add` 那一刻基线就变，
 * 文档没跟上便立刻报红，比等 CI 变红早一步。
 */
function trackedFiles() {
  const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(
      `git ls-files 失败（status ${result.status}）：基线必须反映仓库状态而不是磁盘状态——` +
        '没有 git 元数据时无法判定哪些文件会进入 CI 的检出，因此这里直接报错而不是退回全量统计。',
    )
  }
  return new Set(result.stdout.split('\n').filter(Boolean))
}

function walk(dir, tracked) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full, tracked))
      continue
    }
    if (/\.(?:ts|tsx|mjs)$/.test(name) && tracked.has(full.slice(root.length + 1))) out.push(full)
  }
  return out
}

function countMatches(files, pattern) {
  let total = 0
  for (const file of files) {
    total += (readFileSync(file, 'utf8').match(pattern) ?? []).length
  }
  return total
}

/** 从 gate.mjs 抽取 `const LAYOUT = [...]` 块。抽不到时直接抛错，不静默返回 0。 */
function extractLayoutBlock(source) {
  const start = source.indexOf('const LAYOUT = [')
  if (start === -1) throw new Error('scripts/gate.mjs 里找不到 `const LAYOUT = [`——布局脚本清单的解析口径已失效')
  const end = source.indexOf('\n]', start)
  if (end === -1) throw new Error('scripts/gate.mjs 的 LAYOUT 数组没有找到结尾 `]`')
  return source.slice(start, end)
}

/**
 * 静态计数。全部可从磁盘复算，是 docs/baseline.json 的完整内容。
 * 任何一项的统计口径变化都必须让本函数抛错，而不是返回 0——返回 0 会被下游断言读成“没问题”。
 */
export function computeBaseline() {
  const tracked = trackedFiles()
  const testDir = resolve(root, 'tests')
  const testNames = readdirSync(testDir).filter(name => tracked.has(`tests/${name}`))

  const assertTs = testNames.filter(name => name.endsWith('.assert.ts')).sort()
  const assertMjs = testNames.filter(name => name.endsWith('.assert.mjs')).sort()
  const assertScripts = [...assertTs, ...assertMjs].sort()
  const specFiles = testNames.filter(name => name.endsWith('.spec.ts')).sort()

  // 布局脚本以 gate.mjs 的 LAYOUT 为唯一真源（那才是实际被执行的清单），
  // 并用 package.json 的 test:layout 交叉校验：任一方漏改，这里立刻抛错。
  const gateSource = read('scripts/gate.mjs')
  const layoutInGate = [...extractLayoutBlock(gateSource).matchAll(/'([^']*verify-[^']+\.mjs)'/g)]
    .map(match => match[1])
    .sort()
  const packageJson = JSON.parse(read('package.json'))
  const layoutInPackage = [...(packageJson.scripts?.['test:layout'] ?? '').matchAll(/node (scripts\/verify-[^\s&]+\.mjs)/g)]
    .map(match => match[1])
    .sort()

  if (layoutInGate.length === 0) {
    throw new Error('gate.mjs 的 LAYOUT 里没解析到任何 verify-*.mjs——解析口径已失效')
  }
  const onlyGate = layoutInGate.filter(name => !layoutInPackage.includes(name))
  const onlyPackage = layoutInPackage.filter(name => !layoutInGate.includes(name))
  if (onlyGate.length > 0 || onlyPackage.length > 0) {
    throw new Error(
      'gate.mjs 的 LAYOUT 与 package.json 的 test:layout 清单不一致：\n' +
        `  仅 LAYOUT 有：${onlyGate.join('、') || '（无）'}\n` +
        `  仅 test:layout 有：${onlyPackage.join('、') || '（无）'}`,
    )
  }

  const lightKeys = Object.keys(ZCODE_LIGHT)
  const darkKeys = Object.keys(ZCODE_DARK)
  const structuralKeys = Object.keys(ZCODE_STRUCTURAL)
  const union = new Set([...lightKeys, ...darkKeys, ...structuralKeys])
  const dswPrefixed = [...union].filter(name => name.startsWith('--dsw-')).length
  const structuralDsw = structuralKeys.filter(name => name.startsWith('--dsw-')).length

  const srcFiles = walk(resolve(root, 'src'), tracked)
  // 债务标记判据是「代码里不应出现 TODO/FIXME/HACK」。统计时必须排除守卫自身——
  // 它们把这三个词写成了正则字面量与输出文案，不排除的话断言会把自己数进去
  // （2026-10-18 第一次实跑：13 而不是 0）。
  const SELF_REFERENTIAL = new Set(['scripts/baseline.mjs', 'tests/structure-budget.assert.mjs'])
  const debtFiles = [
    ...srcFiles,
    ...walk(resolve(root, 'tests'), tracked),
    ...walk(resolve(root, 'scripts'), tracked),
  ].filter(file => !SELF_REFERENTIAL.has(file.slice(root.length + 1)))

  const largestClientFile = 'src/client/CodexWorkspaceBrowser.tsx'

  return {
    counts: {
      assertScripts: assertScripts.length,
      assertScriptsTs: assertTs.length,
      assertScriptsMjs: assertMjs.length,
      specFiles: specFiles.length,
      layoutScripts: layoutInGate.length,
      tokens: {
        light: lightKeys.length,
        dark: darkKeys.length,
        structural: structuralKeys.length,
        structuralDsw,
        union: union.size,
        dswPrefixed,
      },
    },
    structure: {
      largestClientFile,
      largestClientFileLines: wcLines(read(largestClientFile)),
      importantOccurrences: countMatches(srcFiles, /!important/g),
      todoMarkers: countMatches(debtFiles, /\b(?:TODO|FIXME|HACK)\b/g),
    },
  }
}

/** 实跑结果。只写进 BASELINE.md，带时间戳；不参与断言。 */
function runSuite() {
  const assertions = spawnSync(process.execPath, ['tests/run-assertions.mjs'], {
    cwd: root,
    encoding: 'utf8',
  })
  const assertionOut = `${assertions.stdout ?? ''}${assertions.stderr ?? ''}`
  const assertionSummary = assertionOut.match(/断言套件：(.+)/)?.[1]?.trim() ?? '未能解析'

  const vitest = spawnSync(
    process.execPath,
    // `--reporter=basic` 在 vitest 4 里已被移除：传它会让 vitest 在「加载 reporter」阶段就
    // Startup Error 退出（一个用例都没跑），实跑快照因此长期写成「未能解析 / exit 1」——
    // 2026-10-19 体检才发现这一栏从来没成功过。改用默认 reporter。
    // `--configLoader runner` 与 scripts/gate.mjs 保持一致，避免在只读文件系统 / 受限沙箱下
    // 因写 node_modules/.vite-temp 而 EPERM（同一个根因的第二个入口）。
    ['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner'],
    { cwd: root, encoding: 'utf8' },
  )
  const vitestOut = `${vitest.stdout ?? ''}${vitest.stderr ?? ''}`
  const vitestSummary =
    vitestOut.match(/Tests\s+(.+)/)?.[1]?.trim() ?? vitestOut.match(/Test Files\s+(.+)/)?.[1]?.trim() ?? '未能解析'

  return {
    ranAt: new Date().toISOString(),
    assertions: assertionSummary,
    vitest: vitestSummary,
    assertionsExit: assertions.status,
    vitestExit: vitest.status,
  }
}

function renderMarkdown(baseline, run) {
  const { counts, structure } = baseline
  const lines = [
    '# 基线（生成物，勿手改）',
    '',
    '> 由 `node --import tsx scripts/baseline.mjs` 生成。',
    '> 静态计数能被 `tests/docs-baseline.assert.ts` 从磁盘独立复算，因此它们是**被断言守护**的数字；',
    '> 本文档里的实跑快照则会随工作树变化——它是观察值，不是契约。',
    '',
    '## 静态计数',
    '',
    '| 指标 | 值 | 口径 |',
    '| --- | --- | --- |',
    `| 断言脚本 | ${counts.assertScripts} | \`tests/*.assert.{ts,mjs}\` |`,
    `| ├ TypeScript | ${counts.assertScriptsTs} | \`tests/*.assert.ts\` |`,
    `| └ ES Module | ${counts.assertScriptsMjs} | \`tests/*.assert.mjs\` |`,
    `| vitest 文件 | ${counts.specFiles} | \`tests/*.spec.ts\` |`,
    `| 真机布局脚本 | ${counts.layoutScripts} | \`scripts/gate.mjs\` 的 LAYOUT（与 package.json test:layout 交叉校验） |`,
    `| 令牌 · 明 | ${counts.tokens.light} | \`ZCODE_LIGHT\` 键数 |`,
    `| 令牌 · 暗 | ${counts.tokens.dark} | \`ZCODE_DARK\` 键数 |`,
    `| 令牌 · 结构 | ${counts.tokens.structural}（其中 \`--dsw-\` ${counts.tokens.structuralDsw}） | \`ZCODE_STRUCTURAL\` 键数 |`,
    `| 令牌 · 并集 | ${counts.tokens.union} | 三份映射表的唯一令牌名 |`,
    `| 令牌 · \`--dsw-\` | ${counts.tokens.dswPrefixed} | 并集中 \`--dsw-\` 前缀的数量（README 的构词口径） |`,
    '',
    '## 结构债',
    '',
    '| 指标 | 值 | 棘轮 |',
    '| --- | --- | --- |',
    `| \`${structure.largestClientFile}\` | ${structure.largestClientFileLines} 行 | 只降不升（\`tests/structure-budget.assert.mjs\`） |`,
    `| \`!important\` 出现次数 | ${structure.importantOccurrences} | 只降不升 |`,
    `| \`TODO/FIXME/HACK\` 标记 | ${structure.todoMarkers} | 保持为 0 |`,
    '',
    '## 实跑快照',
    '',
  ]

  if (run === undefined) {
    lines.push(
      '尚未采集。运行 `node --import tsx scripts/baseline.mjs --run` 采集一次。',
      '',
      '注意：这一节是**观察值**，会随工作树变化，因此不被任何断言锁定；',
      '把它写成固定数字就是 CODE-040（把当时的实现值写成契约）。',
    )
  } else {
    lines.push(
      '| 项 | 结果 | 退出码 |',
      '| --- | --- | --- |',
      `| 断言套件 | ${run.assertions} | ${run.assertionsExit} |`,
      // vitest 的汇总形如 `411 passed | 1 skipped (412)`，原始竖线会把 3 列表格撑成 5 列。
      // 转义成 `\|`，Markdown 才会把它当成单元格内的字面字符。
      `| vitest | ${String(run.vitest).replaceAll('|', '\\|')} | ${run.vitestExit} |`,
      '',
      `采集于 ${run.ranAt}。`,
    )
  }
  return `${lines.join('\n')}\n`
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const baseline = computeBaseline()
  writeFileSync(resolve(root, 'docs/baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`)
  const run = process.argv.includes('--run') ? runSuite() : undefined
  writeFileSync(resolve(root, 'docs/BASELINE.md'), renderMarkdown(baseline, run))
  console.log('✓ baseline：已写入 docs/baseline.json 与 docs/BASELINE.md')
  console.log(`  断言脚本 ${baseline.counts.assertScripts} / vitest 文件 ${baseline.counts.specFiles} / 布局脚本 ${baseline.counts.layoutScripts}`)
  console.log(`  令牌并集 ${baseline.counts.tokens.union}（--dsw- ${baseline.counts.tokens.dswPrefixed}）`)
  console.log(`  结构债 ${baseline.structure.largestClientFileLines} 行 / ${baseline.structure.importantOccurrences} 处 !important`)
}
