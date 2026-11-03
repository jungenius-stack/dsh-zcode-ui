# 03i · 命令面板（ZCode 侧栏视图）规格矩阵 · 第一批

> 采样通道：CDP 9224 直连（2026-10-28 用户开放调试口后首次直采，全部为计算样式实测）。
> 采样时页面状态：dark theme-zai-dark，视口 1198×800，--ui-font-size 14px。
> 命令面板 = ZCode 左侧常驻视图（标题「命令面板」+ 搜索 + 项目/任务两组列表），非弹出层。

## A. 容器与画布

| # | 项 | ZCode 实测 | 备注 |
|---|---|---|---|
| A1 | 面板底 | `rgba(0,0,0,0)` 全透明 | 无面板底色，直接铺在画布上（扁平） |
| A2 | 基准字号 | --ui-font-size 14px | 与 DSH 一致 |
| A3 | 行高基准 | 21px（14/1.5） | 全视图统一 |

## B. 分组 Tab（项目 / 任务）

| # | 项 | ZCode 实测 | DSH 现状 | 判定 |
|---|---|---|---|---|
| B1 | 高度 | 28px | 待盘点 | — |
| B2 | 字号/字重 | 14px / 500 | 待盘点 | — |
| B3 | 未选中色 | 前景 30%（oklab(0.87 0 0 / 0.3)） | 待盘点 | — |
| B4 | 内边距 | 0 10px，透明底、零圆角 | 待盘点 | — |
| B5 | 选中态 | ⚠ 两 Tab 均呈 30%——选中态样式待补采 | — | ❓ |

## C. 项目卡（group 卡片行）

| # | 项 | ZCode 实测 | DSH 现状 | 判定 |
|---|---|---|---|---|
| C1 | 尺寸 | 153×32（宽随内容） | 待盘点 | — |
| C2 | 圆角 | 8px | 待盘点 | — |
| C3 | 边框 | 1px transparent（静态）；hover 态待补采 | — | ❓ |
| C4 | 内边距 | 0 4px 0 10px | 待盘点 | — |
| C5 | 标题文字 | 14px 全亮前景；卡内 = 16px 图标 + baseline 行（gap-2） | 待盘点 | — |

## D. 图标按钮 / 次要文字

| # | 项 | ZCode 实测 | DSH 现状 | 判定 |
|---|---|---|---|---|
| D1 | 图标按钮 | 24×24、radius 6、图标色 = 前景 60% | 待盘点 | — |
| D2 | 次要文字（显示更多等） | 14px、前景 30%、radius 6 | 待盘点 | — |

## 待补采（下一批，通道已通）

1. hover/selected 态：CDP `Input.dispatchMouseEvent` mouseMoved 未触发 React group-hover（两次实验均未变色）——改走 CSS 规则文本抽取或 computer-use 真鼠标。
2. 搜索输入态（点搜索图标后的输入框样式、聚焦环）。
3. 任务列表行（切到「任务」Tab 后的行几何/时间戳样式）。
4. 浅色全组对照（含 TA3/TA4 活体收口）。
5. DSH 侧现状盘点 → 判定列回填 → 可执行缺口进 04。

## 判读纪律

全部值来自活页面计算样式（非截图、非猜测）；静态值与 asar 常量交叉验证过 `--ui-font-size:14px`、前景 oklch(0.87 0 0) 与 tokens 一致。

## 第二批（2026-10-28 02:00）：搜索浮层（⌘K 型，cmdk）

> 入口：侧栏搜索图标点击 → 居中浮层。**这是独立于侧栏视图的第二表面。**

| # | 项 | ZCode 实测 | 备注 |
|---|---|---|---|
| E1 | 浮层根 | fixed 居中 512×~527，**radius 16px**，bg #2b2b2b（--color-card），border 1px 10% 白，内 gap-4，**shadow-md** | --color-border 命中 |
| E2 | 搜索输入胶囊 | h32 w490、**rounded-full**、bg --color-card、border 1px 15% 白（--color-input 类）、pad 0 10px、14px | border-input≠--color-border，是 15% 档 |
| E3 | 命令项（cmdk-item） | h35、pad 6 10、radius 12px、默认透明 | — |
| E4 | 命令项选中态 | bg **#363636**（= --color-tag 同源） | 选中=抬亮一档灰 |
| E5 | 顶部分段签（操作/任务/文件） | 14px、前景 60% | — |

> ⚠️ **2026-10-28 阴影更正（活体复测，推翻本表早期「无阴影」结论）**：⌘K 根节点 className 实为
> `fixed left-1/2 z-50 … max-w-lg … bg-popover p-0 **shadow-md**`，计算值
> `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)`。
> 早期「命令浮层无阴影」量的是**内层** `flex size-full flex-col overflow-hidden rounded-2xl`（它确实无影），
> 不是有阴影的根节点 —— **锚点选错，与 G17 把 assistant 行当 user 行同一类错误**。
> 插件 `.dcu-search-dialog` 已由 `box-shadow:none` 改为 `var(--dcu-tip-shadow)`（该令牌值 = 上述两层小影），
> 并已活体复核同值（2026-10-28，截图 `screenshots/dsh-search-shadow-2026-10-28.png`）。

## 令牌补充（双主题，asar+活页双源）

- `--color-hover`：dark `#ffffff0d`（5% 白）/ light `#0d0d0d0d`（5% 黑）→ 图标按钮 hover 底
- `--color-foreground-subtlest`：dark neutral-300@30% / light neutral-800@40% → Tab 未选中色
- Tab/卡片 hover 语义：**Tab hover 只变字色（30%→全亮），项目卡 hover 无任何变化**——扁平纪律
- 图标按钮 hover：bg-hover + 字色 60%→全亮

## DSH 侧判定（2026-10-28 盘点）

- 侧栏本体=插件 CodexSidebar（03b 十八维已对齐大框架）；03i 新增差异落地为**侧栏 hover 语义对齐**批次（见 04 执行记录）。
- ⌘K 搜索浮层：DSH 无对应表面，**不新建**（越权造 UI，等宿主原生出现再对齐）——登记为「宿主能力天花板」豁免格。

## 浅色活体（2026-10-28 02:15，CDP 直切类采样后已还原深色）

| # | 项 | 浅色实测 | 与插件令牌对照 | 判定 |
|---|---|---|---|---|
| L1 | 主题变量组 | background #f8f8f8 / card #fff / border #0d0d0d1a / tag #e6e6e6 / hover #0d0d0d0d | 与 asar 提取逐值一致；插件两套 map 同值 | ✅ |
| L2 | 行内码 | oklab(92.5%)@50%（=tag 50%）+ radius 6 + 无边框 | 插件 rgba(230,230,230,.5)+radius-md | ✅ 公式活体成立 |
| L3 | 白卡 | #fff + radius 12px | settings-card-fill #ffffff + radius-xl | ✅ TA4 活体 |
| L4 | 围栏码体（浅色） | 本视图无围栏块，未采活体；编辑器底 #ffffff 来自 shiki github-light 常量 | 令牌直算 | 🟡 声明为令牌级 |

## 侧栏 hover 核对（2026-10-28 03:30）

- ZCode **项目卡** hover = `hover:bg-transparent`（完全无变化，纯扁平，已从完整类名确认）。
- DSH 会话行 hover = 5% selected 底 + 快捷操作浮现。**不改**：① ZCode 会话行（任务列表行）hover 未采到活体，样本缺失下把功能性 hover 抹掉属于猜改；② DSH 会话行的 hover 底承担「快捷操作浮现」的可供性。登记为待活体对照项，随任务行采样同批裁决。
- 结论：03i 侧栏部分除会话行 hover 待裁外，其余（Tab 字色转亮/图标钮 5%/卡扁平）已对齐。
