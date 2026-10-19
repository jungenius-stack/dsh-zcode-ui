# 基线（生成物，勿手改）

> 由 `node --import tsx scripts/baseline.mjs` 生成。
> 静态计数能被 `tests/docs-baseline.assert.ts` 从磁盘独立复算，因此它们是**被断言守护**的数字；
> 本文档里的实跑快照则会随工作树变化——它是观察值，不是契约。

## 静态计数

| 指标 | 值 | 口径 |
| --- | --- | --- |
| 断言脚本 | 45 | `tests/*.assert.{ts,mjs}` |
| ├ TypeScript | 40 | `tests/*.assert.ts` |
| └ ES Module | 5 | `tests/*.assert.mjs` |
| vitest 文件 | 56 | `tests/*.spec.ts` |
| 真机布局脚本 | 17 | `scripts/gate.mjs` 的 LAYOUT（与 package.json test:layout 交叉校验） |
| 令牌 · 明 | 174 | `ZCODE_LIGHT` 键数 |
| 令牌 · 暗 | 174 | `ZCODE_DARK` 键数 |
| 令牌 · 结构 | 26（其中 `--dsw-` 23） | `ZCODE_STRUCTURAL` 键数 |
| 令牌 · 并集 | 200 | 三份映射表的唯一令牌名 |
| 令牌 · `--dsw-` | 197 | 并集中 `--dsw-` 前缀的数量（README 的构词口径） |

## 结构债

| 指标 | 值 | 棘轮 |
| --- | --- | --- |
| `src/client/CodexWorkspaceBrowser.tsx` | 1136 行 | 只降不升（`tests/structure-budget.assert.mjs`） |
| `!important` 出现次数 | 48 | 只降不升 |
| `TODO/FIXME/HACK` 标记 | 0 | 保持为 0 |

## 实跑快照

| 项 | 结果 | 退出码 |
| --- | --- | --- |
| 断言套件 | 42 通过 / 3 跳过 / 0 失败（共 45 个脚本） | 0 |
| vitest | 411 passed \| 1 skipped (412) | 0 |

采集于 2026-10-19T06:58:47.661Z。
