/**
 * 文档数字与基线一致。
 *
 * 为什么存在：README / CONTRIBUTING / KNOWN-ISSUES 里的计数一直是手写的。2026-10-18 的体检
 * 查到三个可精确统计的指标全部**低估**（断言 40 vs 41、布局 16 vs 17、vitest 文件 54 vs 56），
 * 偏差方向一致排除了「笔误」解释——那些数字是从更早的快照抄过来的。同一天里 KNOWN-ISSUES
 * 头部还写着四天前的「37 通过 / 3 跳过」，正文已到 §59。
 *
 * 本断言做三件事，缺一不可：
 *   1. `docs/baseline.json` 必须与磁盘实况一致（防止生成物过期后变成第二份手写真相）；
 *   2. 文档里每一处受管数字必须等于基线（防止改代码不改文档）；
 *   3. 每类句式的**命中次数**必须等于登记次数（防止句子被删后断言静默空转）——
 *      一条什么都匹配不到的正则，和一个没有问题的仓库，输出完全一样。
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeBaseline } from '../scripts/baseline.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

type Baseline = ReturnType<typeof computeBaseline>

type Rule = {
  file: string
  /** 失败时告诉读者改哪一处 */
  where: string
  pattern: RegExp
  expected: (baseline: Baseline) => number[]
  /** 期望命中次数；0 表示「这类数字不许出现在该文档里」 */
  hits: number
}

const RULES: Rule[] = [
  // ── README.zh-CN.md ──────────────────────────────────────────────────────
  {
    file: 'README.zh-CN.md',
    where: '§与上游的差别 · 令牌账',
    pattern: /明暗两套各 (\d+) 个 `--dsw-\*` 令牌，另加 (\d+) 个结构性令牌，合计 (\d+) 个唯一令牌名/g,
    expected: baseline => [
      baseline.counts.tokens.light,
      baseline.counts.tokens.structuralDsw,
      baseline.counts.tokens.dswPrefixed,
    ],
    hits: 1,
  },
  {
    file: 'README.zh-CN.md',
    where: '§验证 · vitest 文件数',
    pattern: /(\d+) 个文件（用例数见/g,
    expected: baseline => [baseline.counts.specFiles],
    hits: 1,
  },
  {
    file: 'README.zh-CN.md',
    where: '§验证 · 断言脚本数',
    pattern: /(\d+) 个脚本（通过 \/ 跳过见/g,
    expected: baseline => [baseline.counts.assertScripts],
    hits: 1,
  },
  {
    file: 'README.zh-CN.md',
    where: '§验证 · 布局脚本数',
    pattern: /(\d+) 个 Chromium 脚本/g,
    expected: baseline => [baseline.counts.layoutScripts],
    hits: 1,
  },
  {
    file: 'README.zh-CN.md',
    where: '§开发 · gate 命令注释',
    pattern: /vitest \+ (\d+) 个浏览器脚本/g,
    expected: baseline => [baseline.counts.layoutScripts],
    hits: 1,
  },

  // ── README.md ────────────────────────────────────────────────────────────
  {
    file: 'README.md',
    where: '§Differences · token ledger',
    pattern: /— (\d+) `--dsw-\*` tokens per theme \(light and dark\) plus (\d+) structural tokens, (\d+) unique token names in total/g,
    expected: baseline => [
      baseline.counts.tokens.light,
      baseline.counts.tokens.structuralDsw,
      baseline.counts.tokens.dswPrefixed,
    ],
    hits: 1,
  },
  {
    file: 'README.md',
    where: '§Verification · vitest file count',
    pattern: /(\d+) files \(test count: see/g,
    expected: baseline => [baseline.counts.specFiles],
    hits: 1,
  },
  {
    file: 'README.md',
    where: '§Verification · assertion script count',
    pattern: /(\d+) scripts \(pass\/skip: see/g,
    expected: baseline => [baseline.counts.assertScripts],
    hits: 1,
  },
  {
    file: 'README.md',
    where: '§Verification · layout script count',
    pattern: /(\d+) Chromium scripts measuring/g,
    expected: baseline => [baseline.counts.layoutScripts],
    hits: 1,
  },

  // ── CONTRIBUTING.md ──────────────────────────────────────────────────────
  {
    file: 'CONTRIBUTING.md',
    where: '§环境要求 · 布局脚本数',
    pattern: /（(\d+) 个真机布局脚本要用/g,
    expected: baseline => [baseline.counts.layoutScripts],
    hits: 1,
  },
  {
    file: 'CONTRIBUTING.md',
    where: '§四层验证 · vitest 文件数',
    pattern: /(\d+) 文件（用例数见/g,
    expected: baseline => [baseline.counts.specFiles],
    hits: 1,
  },
  {
    file: 'CONTRIBUTING.md',
    where: '§四层验证 · 断言脚本数',
    pattern: /(\d+) 个脚本（通过 \/ 跳过见/g,
    expected: baseline => [baseline.counts.assertScripts],
    hits: 1,
  },
  {
    file: 'CONTRIBUTING.md',
    where: '§四层验证 · 布局脚本数',
    pattern: /(\d+) 个 Chromium 脚本，量真实几何与交互/g,
    expected: baseline => [baseline.counts.layoutScripts],
    hits: 1,
  },

  // ── docs/KNOWN-ISSUES.md ─────────────────────────────────────────────────
  {
    file: 'docs/KNOWN-ISSUES.md',
    where: '评审拒绝表 · 技术债数字',
    pattern: /实测为 (\d+) 行文件里的 741 行函数、`!important` (\d+) 处/g,
    expected: baseline => [baseline.structure.largestClientFileLines, baseline.structure.importantOccurrences],
    hits: 1,
  },
  {
    file: 'docs/KNOWN-ISSUES.md',
    where: '§1 断言套件现状 · 脚本总数',
    pattern: /(\d+) 个脚本；通过 \/ 跳过 \/ 失败数与跳过清单以实跑为准/g,
    expected: baseline => [baseline.counts.assertScripts],
    hits: 1,
  },

  // ── 反向规则：动态数字不许回潮 ───────────────────────────────────────────
  // 这三条断言「命中 0 次」。用例数随测试增删变化，静态算不出；写进 README 就是写下一个
  // 注定过期的快照。它们已经迁到 `docs/BASELINE.md` 的实跑快照一节。
  {
    file: 'README.zh-CN.md',
    where: '动态数字 · 用例数',
    pattern: /(\d+) 个用例/g,
    expected: () => [],
    hits: 0,
  },
  {
    file: 'README.md',
    where: 'dynamic numbers · test count',
    pattern: /(\d+) tests\b/g,
    expected: () => [],
    hits: 0,
  },
  {
    file: 'CONTRIBUTING.md',
    where: '动态数字 · 用例数',
    pattern: /(\d+) 个用例/g,
    expected: () => [],
    hits: 0,
  },
]

const live = computeBaseline()
const committed = JSON.parse(read('docs/baseline.json')) as Baseline

const failures: string[] = []

// 1) 生成物是否过期。用 JSON 字符串比较即可：computeBaseline 的键序是固定的。
if (JSON.stringify(committed) !== JSON.stringify(live)) {
  failures.push(
    'docs/baseline.json 与磁盘实况不一致——跑 `node --import tsx scripts/baseline.mjs` 重新生成，' +
      '并把新值同步进文档（只改一处都会被下面第 2 步拦住）',
  )
}

// 2) 文档数字是否等于基线；3) 每类句式的命中次数是否等于登记次数。
let checkedNumbers = 0
for (const rule of RULES) {
  const source = read(rule.file)
  const hits = [...source.matchAll(rule.pattern)]
  if (hits.length !== rule.hits) {
    failures.push(
      `${rule.file} · ${rule.where}：匹配到 ${hits.length} 处，登记 ${rule.hits} 处——` +
        `句式被改写或数字被删，这条断言已空转（空转比报红更危险，因为它看起来是绿的）`,
    )
    continue
  }
  const expected = rule.expected(live)
  for (const hit of hits) {
    for (let index = 0; index < expected.length; index += 1) {
      const actual = Number(hit[index + 1])
      checkedNumbers += 1
      if (actual !== expected[index]) {
        failures.push(
          `${rule.file} · ${rule.where}：第 ${index + 1} 个数字是 ${actual}，基线是 ${expected[index]}`,
        )
      }
    }
  }
}

if (failures.length > 0) {
  console.error('✗ docs-baseline: 文档与基线不一致')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

console.log(
  `✓ docs-baseline: ${RULES.length} 条规则 / ${checkedNumbers} 处数字与 docs/baseline.json 一致（含 3 条反向规则）`,
)
