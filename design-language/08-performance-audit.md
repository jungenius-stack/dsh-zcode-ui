# 08 流畅度深审（T2，2026-10-28）

> 任务：找出一切能提升「操作丝滑度」的问题，改掉其中影响最大、风险最低的部分。
> 方法：PerformanceObserver(longtask) + rAF 帧间隔 + CDP Tracing + CPU Profile，
> 全部在真实宿主（DSH 9223）上跑，不靠静态推断。

## 0. 结论

**插件本身不是主要卡顿源，但确实制造了一处可消除的卡顿**：侧栏开合期间，
每帧都有 style/DOM 写入 → 两个全局观察器每帧各跑一次「全文档查询 + 布局读取」，
把一次 60fps 动画拖成 30fps。修掉后，暖机状态下开合**长任务 0、p95 16.7ms**。

## 1. 基线（改前，暖机）

| 场景 | p95 帧间隔 | 最大帧 | 长任务合计 |
|---|---|---|---|
| 侧栏收起 | 33.4ms（≈30fps） | 125ms | 126ms（2 个） |
| 侧栏展开 | 33.4ms | 116.6ms | 114ms（2 个） |
| 会话滚动 | 16.3ms | 25.1ms | 0 |
| 轮次导航 hover | 16.6ms | 17ms | 0 |
| ⌘K 搜索开合 | 9ms | 16.7ms | 0 |
| 静置 | 9.3ms | 16.7ms | 0 |
| 输入框打字 | 9ms | 17ms | 0 |
| 项目分组折叠 | 9ms | 9ms | 0 |
| 会话行 hover | 9ms | 9ms | 0 |

## 2. 根因（trace + profile）

侧栏开合 900ms 内：`Layout` 33 次 / 232ms、`getBoundingClientRect` 自身 249ms、
`markEmptyMarks` 31ms、`querySelector` 16.8ms。

两条链：

1. `observeOfficialTurnNavigators` 的观察器挂在 `body` 子树（childList + style），
   动画期间每帧写 style → 每帧 `schedule()` → rAF 里做 **全文档 `querySelectorAll('nav')`**
   + `marks.getBoundingClientRect()`。后者在布局正被动画改写时读取 = **强制同步布局**。
2. `observeHostAnchors` 同一模式：每个 mutation 批次做一组 `querySelector` 全文档走查。

## 3. 修法（commit `40d86c1` + `ab100d8`）

两处都在 `[data-dcu-sidebar-motion]` 存在时**跳过**本轮检查，由观察器监听该属性移除
（动画结束）后补跑一次；其中导航那条另加 400ms 兜底（防止宿主重建 DOM 丢失移除事件）。
语义等价：动画期间导航/锚点不可能变化。

## 4. 改后（暖机，连测两轮一致）

| 场景 | p95 | 最大帧 | 长任务 |
|---|---|---|---|
| 侧栏收起 | **16.7~17.3ms** | 66~75ms | **0** |
| 侧栏展开 | **16.7ms** | 66~83ms | **0** |
| 其余六个场景 | 9~9.2ms | ≤17ms | 0 |

冷启动后**第一次**开合仍有 ~180ms 长任务（懒初始化 + 首次样式计算），第二轮起为 0 —— 这是
进程级一次性成本，不是每轮成本。

## 5. 未解决 / 宿主侧（诚实声明）

- **宿主自身**在同一 trace 里占 `EZ` 165ms + `Y8` 45ms（host bundle，非插件代码），
  插件无法直接优化；对照实验：把 `--dcu-motion-*-duration` 置 0 后开合的长任务**依旧存在**
  （4×52~65ms），说明这部分来自宿主状态变更时的重渲染，不是本插件的动画。
- **会话切换**：3 个 67ms 长任务 / 次。profile 显示插件侧 JS 只占很小比例，
  主体是宿主渲染 + 布局。插件能做的只有「不额外加负担」，本轮已完成。
- 未测：窗口拖拽改宽、超长会话（1000+ 轮）滚动、多窗口并发。

## 6. 顺带发现（未改，待确认）

`html[data-dcu-official-turn-navigator-supported=true] .dcu-turn-navigator{display:none}`
用的是**能力探测**（capabilities 接口）当互斥条件，而不是「官方导航真的挂载了」。
实测存在这样的状态：`supported=true`，但页面里没有任何带 `.JXrxFq_marks` 的 nav，
同时插件自绘那条被隐藏 → **一条导航都没有**。
这与"该视图 header 槽位本身是 0×0"叠加时无法区分，故本轮**未改**；
若确认这是用户可见的问题，建议把互斥条件改为 `html:has([data-dcu-official-turn-navigator])`
（对应断言 `conversation-visuals` 的「已知运行时支持官方导航时必须独立隐藏旧版刻度」需同步改写）。
