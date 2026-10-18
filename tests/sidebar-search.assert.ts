import assert from 'node:assert/strict'
import { filterSidebarSearchItems } from '../src/client/sidebar-search.ts'

const items = [
  { id: 'session-a', label: '开发会话功能并编写文档', keywords: 'dsh-codex-ui 文档' },
  { id: 'settings-skills', label: '技能', keywords: '设置 扩展管理' },
  { id: 'settings-plugins', label: '插件', keywords: '设置 扩展管理' },
]

assert.deepEqual(filterSidebarSearchItems(items, '文档').map(item => item.id), ['session-a'])
assert.deepEqual(filterSidebarSearchItems(items, '设置').map(item => item.id), ['settings-skills', 'settings-plugins'])
assert.deepEqual(filterSidebarSearchItems(items, '   ').map(item => item.id), ['session-a', 'settings-skills', 'settings-plugins'])

// ── 分组配额（2026-10-18，设计审计 P1-4）───────────────────────────────────────
// 背景：原实现 `filter(...).slice(0, 12)` 在分组前截断，会话组能吃满配额、把设置/操作
// 两组整段挤掉。第一版修成「每组 1/3」又是新缺陷：三组大小差异极大（设置固定 9 条、
// 操作固定 1 条、会话可达数百条），四等分让「搜会话标题只显示 4 条」——比修之前更差。
// 现口径：每组保底 3 条，剩余 3 条按组顺序回填。下面五条把该行为钉死。
const { allocateSearchQuota } = await import('../src/client/sidebar-search.ts')
const fill = (count: number, tag: string): string[] =>
  Array.from({ length: count }, (_, index) => `${tag}${index}`)
const allocation = (counts: readonly [number, number, number]): { total: number; sessions: number; settings: number; actions: number } => {
  const tags = ['s', 'g', 'a'] as const
  const groups = counts.map((count, index) => fill(count, tags[index]!))
  const out = allocateSearchQuota(groups, 12, 3)
  return {
    total: out.length,
    sessions: out.filter(item => item.startsWith('s')).length,
    settings: out.filter(item => item.startsWith('g')).length,
    actions: out.filter(item => item.startsWith('a')).length,
  }
}

// ① 只有会话命中：仍能拿到接近总额度（不能被保底压到 3 条）。
assert.deepEqual(allocation([200, 0, 0]), { total: 12, sessions: 12, settings: 0, actions: 0 },
  '会话大量命中时必须仍能填满总配额（否则搜索退化成只看 3 条）')
// ② 只有设置命中：9 条设置必须**全部**可见（设置组固定 9 条，这是真实规模）。
assert.deepEqual(allocation([0, 9, 0]), { total: 9, sessions: 0, settings: 9, actions: 0 },
  '设置全命中时必须一次看全（9 条），不得被保底截到 3 条')
// ③ 三类都有：每组都必须露头（这正是审计「一个组不能吃满配额」的要求）。
const mixed = allocation([50, 9, 1])
assert.ok(mixed.settings >= 3 && mixed.actions >= 1,
  `三类都命中时设置与操作组必须可见（实测 设置 ${mixed.settings} / 操作 ${mixed.actions}）`)
assert.equal(mixed.total, 12, '三类都命中时总数仍应填满 12')
// ④ 会话 6 + 设置 6：旧实现的经典翻车场景（6+6=12 卡在限额上），两组都要完整可见。
assert.deepEqual(allocation([6, 6, 0]), { total: 12, sessions: 6, settings: 6, actions: 0 },
  '会话与设置各 6 条时必须都完整可见（旧实现会让设置组消失）')
// ⑤ 只有操作命中：不能凭空凑数。
assert.deepEqual(allocation([0, 0, 1]), { total: 1, sessions: 0, settings: 0, actions: 1 },
  '只有操作命中时只返回那一条，不得补空条目')

// ⑥ limit 是硬上限：floor × 组数 > limit 时不得超限（2026-10-18 红队复核实测的边界）。
// 首版实现会在 limit=6/floor=3/3 组时返回 9 条，与 doc 的「总条数上限」不符。
// 当前调用常量 12/3 不触发该分支，但函数契约必须自洽——否则下一个改常量的
// 人会把「超限」当成「保底」。
{
  const many = [fill(10, 's'), fill(10, 'g'), fill(10, 'a')]
  for (const limit of [12, 9, 6, 5, 3, 1, 0]) {
    const out = allocateSearchQuota(many, limit, 3)
    assert.ok(out.length <= limit, `返回条数不得超过 limit（limit=${limit}，实测 ${out.length}）`)
  }
  // 退化方向：floor 过大时后面的组拿不到保底，但总数仍受 limit 约束（总上限优先）。
  assert.equal(allocateSearchQuota(many, 4, 3).length, 4, 'limit 小于 floor×组数时仍必须恰好被 limit 截断')
}
