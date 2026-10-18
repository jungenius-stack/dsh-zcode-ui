export type SidebarSearchItem = {
  readonly id: string
  readonly label: string
  readonly keywords: string
}

/** 按用户可见名称和辅助关键词筛选侧栏搜索结果。 */
export function filterSidebarSearchItems<T extends SidebarSearchItem>(items: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === '') return [...items]
  return items.filter(item => `${item.label} ${item.keywords}`.toLocaleLowerCase().includes(needle))
}

/**
 * 按组分配结果配额：**每组保底 floor 条，剩余额度按组顺序回填**。
 *
 * ## 为什么不是「全场 slice(0, limit)」
 *
 * 那会在分组之前截断，而会话条目永远排在前面 —— 会话组能独自吃满配额，把设置/操作两组
 * 整段挤掉（实测 6+6=12 正好卡在限额上，再多一条会话就有一组消失）。
 *
 * ## 为什么也不是「每组 1/3」
 *
 * 三组大小差异极大：设置组固定 9 条、操作组固定 1 条、会话组可达数百条。
 * 四等分会让「搜 settings 时设置组只显示 4 条」「搜会话标题时只显示 4 条」——比修之前更差。
 *
 * ## 保底 + 回填
 *
 * ① 每组先取 floor 条，保证三个组都露头；
 * ② 剩余额度按组顺序回填，单组可以继续增长。
 *
 * 于是：只有会话命中时仍能拿到接近 limit 条；设置全命中时能一次看全；三类都命中时每组都在。
 *
 * @param groups - 已按渲染顺序分好组的条目
 * @param limit  - 总条数上限
 * @param floor  - 每组保底条数
 */
export function allocateSearchQuota<T>(groups: readonly (readonly T[])[], limit: number, floor: number): T[] {
  const picked = groups.map(group => group.slice(0, floor))
  // 2026-10-18（红队复核）：`limit` 是**硬上限**。首版「每组先无条件取 floor 条」在
  // floor × 组数 > limit 时会直接超限（实测 limit=6/floor=3/3 组 → 返回 9 条），
  // 与 doc 里「总条数上限」的承诺不符。当前常量 12/3（3×3=9<12）不触发，
  // 但那是**调用点的巧合**，不是函数契约。这里补两道保护：
  //   ① 保底阶段就按 limit 截断；
  //   ② 回填阶段不越过 limit。
  // 现在返回值恒满足 length <= limit；floor 过大时表现为「后面的组拿不到保底」，
  // 这是合理的降级（总上限优先于每组保底）。
  let pickedTotal = 0
  const floored = picked.map(group => {
    const room = Math.max(0, limit - pickedTotal)
    const capped = group.length > room ? group.slice(0, room) : group
    pickedTotal += capped.length
    return capped
  })
  let left = limit - pickedTotal
  for (const [index, group] of groups.entries()) {
    if (left <= 0) break
    const extra = group.slice(floor, floor + left)
    floored[index] = [...(floored[index] ?? []), ...extra]
    left -= extra.length
  }
  return floored.flat()
}
