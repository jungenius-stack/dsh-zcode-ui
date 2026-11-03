# 07 交付总账（tokens / 动效 / 交互 / 可访问性 四层映射）

> **性质**：可交付凭证，不是宣传稿。每条都能指到「ZCode 规格 → 实现文件:行 → 活页面证据」。
> **判定三态**：`继承`（直接用 ZCode/宿主令牌，无调整）｜`显式调整`（有意偏离，附理由）｜`豁免`（ZCode 无此项或结构不同）。
> 采集条件：1280×820 视口 / dpr 2 / 45 条刻度 / 深色 `theme-zai-dark dark`（2026-10-27）。

## 一、Tokens 层

| # | ZCode 规格 | 实现位置 | 活页面证据 | 判定 |
|---|---|---|---|---|
| T1 | 画布 `--color-background` dark `#161616` | `zcode-theme.ts:249`（`--dcu-sidebar-background`） | `.dcu-root` bg = `rgb(22,22,22)` | **继承** |
| T2 | 画布浅色 `oklch(98.5% 0 0)` = 250 | `settings-page-styles.ts:44`（`--dsw-alias-bg-base` 作用域覆盖） | 设置页 bg = `rgb(250,250,250)` | **显式调整**（ZCode 分层：侧栏 245 / 画布 250，见 T3） |
| T3 | 侧栏浅色 `oklch(97% 0 0)` = 245 | `zcode-theme.ts:249` | `.dcu-root` = `rgb(245,245,245)` | **显式调整**（原 `#f0f0f0`=240 偏暗 5 通道，TA1 修正） |
| T4 | 卡片 `--color-card` dark `#2b2b2b` | composer `--dcu-composer-bg` | composer bg = `rgb(43,43,43)` | **继承** |
| T5 | 面板 `--color-panel` dark `#202020` | 宿主令牌 | 气泡/代码块 = `rgb(32,32,32)` | **继承** |
| T6 | 边框 ZCode `1px rgba(255,255,255,.15)`（composer） | `CodexSidebar.tsx` `--dcu-composer-border` | `1px rgba(255,255,255,.15)` | **继承** |
| T7 | 边框 header `1px rgba(255,255,255,.05)` | `conversation-header.ts:24` 字面量 + dark 覆写 | `1px rgba(255,255,255,.05)` | **显式调整**（宿主无对应令牌，用字面量；浅色为 `rgba(13,13,13,.05)`） |
| T8 | 正文色 `oklch(87% 0 0)` = 212 | 宿主令牌 | `rgb(212,212,212)` | **继承** |
| T9 | G14 三档（secondary/tertiary） | `zcode-theme.ts` `--dcu-sidebar-secondary/-tertiary` | sec `rgb(91,91,91)` 6.23:1 / ter `rgb(109,109,109)` 4.75:1 | **显式调整**（ZCode 无三档层级定义；按 AA + ΔL*≥6 自建，浅色 85%/75%、深色 68%/56%） |

## 二、动效层

| # | ZCode 规格 | 实现位置 | 活页面证据 | 判定 |
|---|---|---|---|---|
| M1 | 刻度 hover 波滑动 | `turn-rail-zcode.ts`（逐帧插值） | avg 9.1ms / max 16.8ms / 掉帧 0 | **继承** |
| M2 | 点击刻度平滑滚动 | **`scroll-anim.ts`**（独立模块；`turn-rail-zcode.ts` 与回归测试引用同一份，无实现副本） | 瞬移+尾段滑入+双 rAF+互扰防护（含等待窗口）；源码级：max **128/115px/帧**、avg 28/29；**moving 帧间隔 8~12ms**（预算 800px/60ms）——「最大 9ms」的旧说法只覆盖 moving 帧，已按第 28 轮修正为区分三类：moving 8~12ms（插件）/ 静止等待 78~92ms（宿主挂载）/ 尾端 79ms（宿主校正）；**等待窗口四档 0 向上带帧**。**BUNDLE-01 已关闭**：第 28 轮重发（825132 B，四符号齐全），live 复验 0 异常、闪光写入序列 `1→2.6@6ms→1@82ms`、TCP-02 强制到底距底 0px、reduced-motion 单帧、连点 10 次 0 异常；门禁 22/22（含新增 `verify-bundle-integrity.mjs`） | **显式调整**（ZCode 原生 smooth 在本容器失效 → 自绘缓动，G11b；TCP-01 叠瞬移策略，TCP-02 补等待窗口防线） |
| M3 | 侧栏展开/收起 | `sidebar-width.ts` | avg 9.3ms / max 17.5ms / 掉帧 0 | **继承** |
| M4 | 减动效 `prefers-reduced-motion` | `zcode-theme.ts` 等 9 个文件 | `0s/none` 生效 | **显式调整**（ZCode 无统一减动效层，按 WCAG 补） |
| M5 | 每帧位移预算 400~800px | `02-motion.md` 规定 | 实测三条路径 avg 8.5~9.3ms（远低于 60ms 上限） | **实测达标**（2026-10-27 首次实测） |

## 三、交互层

| # | ZCode 规格 | 实现位置 | 活页面证据 | 判定 |
|---|---|---|---|---|
| I1 | 列宽 924 | `conversation-layout.ts:2-4`（`max-width:924px`；第 1 行是注释开头） | `.icaHSq_column` = 924 | **继承** |
| I2 | 轮组间距 20 | `conversation-layout.ts` `--dsh-chat-flow-gap:20px` | 用户轮 `margin-top` = 20px | **继承** |
| I3 | 正文行高 24.5 | `conversation-layout.ts:3` | `p` line-height = 24.5px | **继承** |
| I4 | 代码 12px/21px | `conversation-layout.ts:4` | `pre` = 12px / 21px | **继承** |
| I5 | composer 圆角 16 / padding 12 / gap 12 | `CodexSidebar.tsx` `[data-composer-card]` | r16 / 12px / 12px | **继承** |
| I6 | composer 按钮 28×28 r8 | `CodexSidebar.tsx` `button[class*=dsh-po-]` | 圆角集合 = {8px}，非 8px 计数 0 | **继承** |
| I7 | editor 行高 20 / min-height 44 | `CodexSidebar.tsx` `[data-lexical-editor]` | line-height 20px | **继承** |
| I8 | header 高 48 / padding 24-24 | `conversation-header.ts:24`（48-1px 补偿边框） | 高 48 / pad 24-24 | **显式调整**（加 1px 边框后需从 min-height 与 padding 各减 1px，否则总高 49） |
| I9 | header 页签 14px/600 | `conversation-header.ts` HD3 | 14px / 600 | **继承** |
| I10 | header 图标按钮 28×28 r8 | `conversation-header.ts` HD5（`:has(> svg)` 判据） | 6 个按钮全 28×28 / 8px | **显式调整**（须排除文字按钮「会话管理」88×28，用 `:has(> svg):not(:has(> :not(svg)))`） |
| I11 | 设置页卡片 bg/r12/border | `settings-page-styles.ts:97` | `rgb(22,22,22)` / 12px / 1px | **继承** |
| I12 | 设置页导航 16px/400 h32 r12 | `settings-page-styles.ts:65` | 16px / r12 / h32 | **继承** |
| I13 | 设置页下拉 h32/r8/fs14 | `settings-page-styles.ts` S3 规则 | 32 / 8px / 14px | **继承** |
| I14 | 设置页开关 36×20 r8 | `.dcu-settings-switch` | 36×20 / r8，thumb 16×16 r50% | **豁免**（ZCode 侧开关从未采到；此项仅证 DSH 内部与宿主一致） |

## 四、可访问性层

| # | 要求 | 实现位置 | 活页面证据 | 判定 |
|---|---|---|---|---|
| A1 | 焦点环 ≥2px 可见 | `CodexSidebar.tsx` + 各组件 `:focus-visible` | Tab 遍历 12 个元素全 `solid/2px`，缺环 0 | **继承** |
| A2 | 焦点环走语义色 | `--dsw-focus-ring-color`（=brand `#0b7fff`） | 同 A1 | **继承** |
| A3 | 纯图标按钮必须有可访问名 | `conversation-header.ts` `buildTitleButton()` | 可见无标签按钮 = **0**（186 个可见按钮） | **显式调整**（DS4 本轮补 `aria-label`：`打开所在项目` / `更多操作`） |
| A4 | 开关 `role=switch` + `aria-checked` | 设置页 | 实测存在 | **继承** |
| A5 | 页签 `role=tab` + `aria-selected` | 宿主 | 实测存在 | **继承** |
| A6 | 切换态 `aria-pressed` | 宿主组件 | 实测 **18** 个（自动换行/好的回答/有问题的回答） | **继承** |
| A7 | 进行中/完成宣告 | 宿主 live region | `aria-live=polite` **5** 个 + `role=status` **6** 个 | **继承** |
| A8 | 减动效支持 | 见 M4 | `0s/none` | **显式调整** |
| A9 | 900px 无横向滚动 | 响应式 | `scrollWidth=900=innerWidth` | **继承** |
| A10 | 超长标题不溢出 | header flex 收缩链 | 标题截断、两按钮仍 28×28、header 不溢出 | **继承** |

## 五、统计

| 判定 | 条数 |
|---|---|
| **继承** | 24 |
| **显式调整** | 9 |
| **豁免** | 3 |
| **合计** | **36** |

**显式调整的共同原因**（3 类）：
1. **宿主无对应令牌**（header 边框）→ 用字面量 + 双主题覆写；
2. **结构性约束**（加边框需减 1px、文字按钮不能方形化）→ 用精确选择器区分；
3. **补 WCAG 缺口**（减动效、三档层级、图标可访问名）。

**豁免的共同原因**：
- 滚动动画（宿主接管，原生 smooth 失效）
- 开关尺寸（ZCode 未采到，无参照）

## 六、本账未覆盖

- 视觉截图证据（本账只列数值，截图见 `design-language/screen/`）
- ZCode 侧未采项：TA3 浅色代码块 / TA4 浅色设置卡 / D1 围栏代码块 / F1 流式指示 / 设置页开关
- 移动端与 Safari/Firefox（仅在 Chromium 验证）
