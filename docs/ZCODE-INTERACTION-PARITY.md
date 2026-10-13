# ZCode 操作 UI 逻辑对齐手册（行为清单 + 差距审计）

> 目的：把本地 ZCode 3.15.1 的「操作 UI 逻辑」整套学来套到本插件上——不是抄表层图标，
> 而是对齐交互模型、行为契约与键盘路径。本文档是唯一的行为对照来源；每次对齐批次在此登记。
>
> 取证来源：`/Users/m1/WorkBuddy AI/2026-10-12-11-04-42/ZCode`（aac4755 = v3.15.1，
> 与 `/Applications/ZCode.app` 同版本）。设计规范以其仓库根 `DESIGN.md` 为唯一真源；
> 插件契约见其 `UI_PLUGIN.md`。本文引用行号以该检出为准。

## 1. ZCode 行为清单（按域）

### 1.1 任务行（`packages/ui/src/TaskListItem.tsx`）

| 行为 | ZCode 的实现 | 关键源码位置 |
| --- | --- | --- |
| 悬停让位 | hover 时**元信息（相对时间）隐藏**、给操作按钮腾位 | `shouldSuppressWorkspaceTaskMetadata = hoverActionsVisible \|\| focusActionsVisible`（L404） |
| 键盘同权 | 行 `tabIndex=0`；聚焦行时**同样**露出操作按钮（`focusActionsVisible`，focus capture/blur capture） | L571-576 |
| 键盘打开 | `Enter` / 空格打开；用 `event.target === event.currentTarget` 守卫，避免吞行内按钮按键 | L578-586 |
| 触屏常驻 | `(hover:none)` 时操作按钮常驻（不为触屏隐藏功能） | L172-177、L400-405 |
| 状态槽优先级 | 前置 16px 槽只有一个指示：**错误 > 未读 > 运行中**（转圈）> 时间线空闲点 | 领先槽三元链 L613-630 |
| 置顶交互 | 已置顶且无状态指示时，前置槽显示 Pin；**hover 时变为可点击的取消置顶按钮**，状态指示同时隐藏 | L398-399、L552-554、L632-645 |
| 归档两步确认 | 首击进确认态（普通按钮换成 destructive「确认」）；**Escape 取消**；**条目外 pointerdown 取消**；**鼠标离开不取消**；二次点击才执行 | L195-223（窗口级捕获监听）、L447-501 |
| 行操作按钮 | 共享 `TaskRowActionButton`：ghost `icon-sm`；**mousedown/pointerdown preventDefault + stopPropagation**（不抢焦、不触发行选择）；tooltip 在上方 | `workspace-grouped-tasks/task-row-action-button.tsx` |
| 右键菜单 | 整行 `onContextMenu`；菜单内容**列表级单例**——只有菜单真正打开时才挂载，idle 行零订阅 | `TaskListItemContextMenuContent`（L903-905 注释） |
| 拖拽 | HTML5 拖拽（拖到 workbench/分屏），自定义 drag preview | L281-326 |
| 元信息 | 相对时间右对齐；定时任务时钟图标 / 错峰月亮图标挂在时间前（不占状态槽） | L807-822 |

### 1.2 右键/下拉菜单（`TaskActionMenuContent.tsx`、`TaskListItemContextMenu.tsx`）

- 结构（三段 + 尾部）：`置顶/取消置顶 → 重命名 → 归档 → 标记未读 → 分屏` ‖ `在访达/资源管理器中打开、复制项目路径、复制任务路径、复制日志路径、复制 Session ID、前往配置` ‖ `调用轨迹` ‖ `反馈问题`。
- 同一份内容组件**同时服务下拉入口与右键入口**（"Reuse the same action-list content across dropdown and context-menu entry points"，DESIGN.md）。
- 菜单宽度 `w-52`；禁用项保留布局与层级，只弱化文字 + `title=disabledReason`。
- 条目为紧凑文本行（无图标、无逐行边框），分组用弱分隔线（见 DESIGN.md「Menus」节）。

### 1.3 键盘（`packages/shared/src/shortcutCommands.ts`、`shortcuts/bindings.ts`）

| 键位 | 命令 |
| --- | --- |
| `Cmd/Ctrl+K`、`Cmd/Ctrl+Shift+P` | 命令中心 |
| `Cmd/Ctrl+,` | 打开设置 |
| `Cmd/Ctrl+F` | 会话内查找 |
| `Cmd/Ctrl+B` | 侧栏开关 |
| `Cmd/Ctrl+Shift+L` | 切换主题 |
| `Cmd/Ctrl+J` / `Cmd/Ctrl+Alt+B` | 终端 / Side Pane 开关 |
| `Cmd/Ctrl+Shift+[` / `Cmd/Ctrl+Shift+]` | 上一个 / 下一个会话 |
| `Cmd/Ctrl+[` / `Cmd/Ctrl+]` | 历史后退 / 前进 |
| `Ctrl+M` / `Ctrl+Shift+M` / `Ctrl+T` | 模型菜单 / 会话模式 / 思考档 |
| `Cmd/Ctrl+N` / `O` / `W` | 新任务 / 打开项目 / 关闭当前上下文（菜单通道） |
| `Enter` / `Shift+Enter`（输入框内） | 发送 / 换行（composer 作用域） |

- 引擎契约：IME 组合（`isComposing`/`Process`/`Dead`/keyCode 229）与长按 repeat **一律不匹配、不录制**；`CmdOrCtrl` 平台归一；用户可整体重绑定 + 冲突检测 + 录制态抑制。

### 1.4 侧栏结构（`WorkspaceSidebar.tsx`）

- 分区顺序：**置顶** →（`organizeByProject` 分组 / 时间线）→ **归档**（默认收起，`toggleArchivedTasks`）→ **项目区**（可重排）。
- 视图选项菜单：`organize`（分组/时间线）× `sortBy`（更新时间/创建时间）× 任务视图选项。
- 折叠轨道（`WorkspaceSidebarCollapsedRail.tsx`）：仅顶部一个按钮——logo，hover 时淡出并换成「展开侧栏」图标（`transition-opacity group-hover`），带快捷键提示。
- 悬停揭示模型全侧栏统一：行/分组头/集合头都是 `:hover` + `:focus-within` 同权（`.dcu-wb-*` 侧同理）。

### 1.5 设计系统要点（`DESIGN.md`，与插件直接相关）

- 字体：界面排字只有 `text-ui-*` 七档（14px 基准、由 `--ui-font-size` 驱动）；禁止任意 px 与 `html` 级缩放。
- 圆角：按**可见嵌套**逐级降（xl→lg→md→sm）；控件默认 `rounded-lg`；菜单壳 `rounded-lg` + 行 `rounded-md`；对话框 `rounded-2xl`。
- 菜单密度：壳 `p-1`、行间 `gap-0.5`、行 `px-2`/`gap-2`、hover `bg-menu-hover`、禁用只弱化；**交互式覆盖层必须盖过 tooltip**。
- 动效：快、低戏剧性、服务状态变化；禁止长而弹性的主界面动画。
- 无障碍：键盘是一等路径；状态色必须配文本（不得只靠颜色）；布局容忍长翻译。

### 1.6 插件扩展模型（`UI_PLUGIN.md`）

- 外来 UI 以侧栏面板（`ui.surfaces`）+ 内联页面进入；宿主提供能力协商（`getHostCapabilities`）、主题/语言（`hostContext`）、显示模式切换。
- **插件不重绘宿主外壳**：外壳（侧栏、对话区）永远保持宿主语言；插件只在自己的表面内渲染。
  → 对应本插件的皮肤信封（`skin-envelope.ts`）与外来表面发现（`foreign-surface-discovery.ts`）策略：收敛继承属性、不越界改别人的颜色/布局。

## 2. 差距审计（插件 1.4.0 → 对照上表）

| # | 行为 | ZCode | 插件 1.4.0 现状 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | 行键盘可达 | `tabIndex=0`、Enter/Space | 行不可聚焦（`:focus-visible` 样式形同虚设） | ✅ 1.5.0 |
| 2 | 聚焦与悬停同权 | focus 露出操作、元信息让位 | 仅 `:hover` | ✅ 1.5.0（`:focus-within`） |
| 3 | 归档两步确认 | 首击确认 / Esc / 外点取消 / 离开不取消 | **单击直接归档** | ✅ 1.5.0 |
| 4 | 菜单顺序 | rename → archive → markUnread | rename → **unread → archive** | ✅ 1.5.0 |
| 5 | 行操作按钮不抢焦 | mousedown/pointerdown preventDefault | 未做 | ✅ 1.5.0 |
| 6 | 状态指示优先级 | 单一前置槽：错误 > 未读 > 运行中 | 运行中在左、未读在右（两槽并存） | ✅ 1.6.0（未读进前置槽、未读优先；error 档 DSH 无对应） |
| 7 | 未读点位置 | 前置槽（左） | 右侧时间旁 | ✅ 1.6.0 |
| 8 | 相对时间 | 有 | ✅ 有（`formatCompactTime`） | — |
| 9 | 右键菜单结构 | 三段式（管理 ‖ 路径/复制 ‖ 辅助） | 四段式（另含 fork/移动/删除） | ✅ 1.7.0（管理组含 fork/移动收尾 ‖ 路径与复制组以「打开位置」打头 ‖ 删除单列；菜单图标保留为已决偏差） |
| 10 | 菜单单例化 | 列表级单例、打开才挂载 | 每行挂 `Menu` 组件 | 已评估（不做）：宿主 Menu 关闭态零渲染（`open && MenuSurface`）、行菜单无每行 RPC——收益趋零，见 KNOWN-ISSUES §18.2 |
| 11 | 触屏操作常驻 | `(hover:none)` 常驻 | 集合头有常驻，会话行无 | ✅ 1.7.0（coarse 下操作与 ⋯ 常驻、时间让位、几何断言） |
| 12 | 标题溢出 | mask 渐隐（无省略号） | ellipsis（有断言锁死） | —（有意偏差，登记） |
| 13 | 会话置顶 | Pin 前置槽 + hover 变按钮 | **无此能力**（断言明确禁止） | —（有意偏差：DSH 无会话置顶模型） |
| 14 | 拖拽 | 拖到 workbench | ✅ 有（项目内排序 + 跨项目移动） | — |
| 15 | 键盘总表 | Cmd+K/B/F/N/… | 侧栏 bridge 了官方 workspace 快捷键；其余未接 | ⏳ 调研宿主 slots 后评估 |

## 3. 已实施批次

### 1.5.0（2026-10-13）——行交互第一批

1. **会话行键盘可达**：`tabIndex=0`；`Enter`/空格打开（含 `event.target === event.currentTarget` 守卫）；三棵树（任务树、频道、定时）通过共享 `SessionRow` 统一获得。
2. **聚焦与悬停同权**：`:focus-within` 露出快捷操作并让元信息（时间/未读/待处理）让位；确认态（`dcu-wb-archive-confirming`）常驻显示。
3. **归档两步确认**（`archive-confirm.ts` 共享 hook，三棵树一套实现）：首击进确认态（错误色「确认」按钮）、Escape 取消、条目外 pointerdown 取消、鼠标离开不取消、二次点击执行；确认按钮配色采用宿主错误色配对（背景 `state-error-primary` / 前景 `bg-layer-3`，与 DSH badge 约定一致）。
4. **菜单顺序对齐**：重命名 → 归档 → 标记未读。
5. **行操作按钮** mousedown/pointerdown `preventDefault + stopPropagation`（不抢焦、不触发行选择）。
6. 验证：新集成测试 `tests/session-row-interaction.spec.ts`（确认流 / 取消边界 / 键盘语义），频道归档测试升级为两步，断言新增 13 条。

### 1.6.0（2026-10-14）——状态槽合并

1. 未读点从右侧（时间旁）迁入行首 16px 状态槽，与运行中转圈同槽（left:13px / 6px，ZCode `h-1.5` 同径）。
2. 优先级互斥渲染：待处理胶囊（右）＞ 未读点 ＞ 运行中转圈——与 ZCode 的 error/unread/loading 三元链同序（error 档在 DSH 无对应，不虚构）。
3. 未读点不再随悬停隐藏（迁槽后与快捷操作无重叠，恢复 ZCode 状态槽常显语义）；右侧时间不再为未读让位；flat/top 行同步预留行首槽。
4. 验证：集成测试新增 2 用例（优先级互斥 / 仅运行出转圈），断言更新 5 条。

### 1.7.0（2026-10-14）——菜单结构 + 触屏常驻

1. 菜单结构：管理组（重命名 → 归档 → 标记未读 → 继续新会话 → 项目移动）‖ 路径与复制组（打开位置打头 → 复制 ID → 标题 → 路径）‖ 删除单列——与 ZCode TaskActionMenuContent 的分组与组内序一致。
2. 触屏（`pointer:coarse`）：快捷归档与 ⋯ 菜单锚点常驻（ZCode `hover:none` 同原则）、时间右移 60px 让位、待处理胶囊占位时门控关闭；新增几何验证脚本（边界盒互不重叠 + 桌面语义回归）。
3. 决策：菜单单例化（#10）评估为不做（宿主 Menu 关闭态零渲染、无每行 RPC，收益趋零）。

## 4. 待办批次（候选，按价值排序）

1. **键盘能力调研**（#15）：宿主命令中心（`Cmd/Ctrl+K`）/ 上下会话切换（`Cmd/Ctrl+Shift+[ ]`）的可接入点——需先摸清宿主 slots 与快捷键桥的边界再定做法。

审计表其余各项已全部处置：✅ 已实施（#1-#7、#9、#11）或已登记（#8/#12/#13/#14 有意偏差，#10 评估不做）。
