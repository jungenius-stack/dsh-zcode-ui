# ZCode 视觉规范（提取自 zai-org/ZCode）

来源：`packages/ui/src/styles.css`（@theme / .dark / .theme-zai-light / .theme-zai-dark）、
`packages/ui/src/DESIGN.md`（仓库根 DESIGN.md，630 行设计宪章）、
`packages/ui/src/useTheme.ts`（主题机制）、`packages/ui/src/WorkspaceSidebar*.tsx`、
`packages/ui/src/SortableWorkspaceSidebar.tsx`、`packages/ui/src/TaskListItem.tsx`、
`packages/ui/src/NewTaskButtonGroup.tsx`、`packages/ui/src/WorkspaceSidebar/WorkspaceSidebarCollapsedRail.tsx`、
`packages/desktop/src/renderer/src/main.tsx`（Renderer 入口，仅挂 `@zcode/ui/styles.css` + `Root`）。

> 只提取布局、配色 token、图标语言、明暗主题方案。不复制 ZCode 的 Zustand store / RPC / services / 组件源码；
> 数据一律走 DSH 的 SlotRegistry 插槽与 ctx 公共服务（与上游 dsh-codex-ui 一致）。

## 1. 主题机制（useTheme.ts）

- 主题档位：`system` / `light` / `dark`；`light→zai-light`，`dark→zai-dark`，`system` 跟随 `prefers-color-scheme`。
- 落到 `document.documentElement.classList`：`dark` + `theme-zai-light` | `theme-zai-dark`；默认 `zai-dark`。
- 本插件适配：DSH 宿主以 `body[data-ds-dark-theme]` 表达暗色；样式表同时认 `body[data-ds-dark-theme]`
  与 `.theme-zai-*` 两个信号（前者无 JS 时序问题，后者与 ZCode 语义一致），
  并由 `zcode-theme.ts` 把宿主属性镜像成 `.theme-zai-*` class。

## 2. 色板（styles.css 的 Zai 覆盖层）

### Zai Light（`.theme-zai-light`）
| 角色 | 值 | | 角色 | 值 |
| --- | --- | --- | --- | --- |
| background | `#f8f8f8` | | foreground | `neutral-800`（#262626） |
| sidebar | `#f0f0f0` | | foreground-subtle | neutral-800 60% |
| header / panel | `#ffffff` | | foreground-subtlest | neutral-800 40% |
| card / popover / menu | `#ffffff` | | border | `rgba(13,13,13,.1)` |
| input | `#ffffff` | | border-hover | `rgba(13,13,13,.15)` |
| hover | `rgba(13,13,13,.05)` | | selected | `rgba(13,13,13,.05)` |
| surface | `rgba(13,13,13,.03)` | | surface-hover | `rgba(13,13,13,.05)` |
| primary | `#000000` / fg `#ffffff` | | brand | `#000000` |
| tag | `#e6e6e6` | | menu-hover | `#f0f0f0` |
| accent | `#ebf4ff` | | icon-blue | `#0b7fff` |
| success | `#1e8a3e` | | destructive | `#e03131` |
| warning | `#e07b00` | | toast/tooltip | `#ffffff` / `#f0f0f0` |

### Zai Dark（`.theme-zai-dark`）
| 角色 | 值 | | 角色 | 值 |
| --- | --- | --- | --- | --- |
| background | `#161616` | | foreground | `neutral-300`（#d4d4d4） |
| sidebar | `#161616` | | foreground-subtle | neutral-300 60% |
| header / panel / popover-header | `#202020` | | foreground-subtlest | neutral-300 30% |
| card / popover / menu / input | `#2b2b2b` | | border | `rgba(255,255,255,.1)` |
| menu-hover / secondary | `#363636` | | border-hover | `rgba(255,255,255,.15)` |
| hover | `rgba(255,255,255,.05)` | | selected | `rgba(255,255,255,.1)` |
| surface | `rgba(255,255,255,.05)` | | surface-hover | `rgba(255,255,255,.1)` |
| primary | `#ffffff` / fg `#000000` | | brand | `#ffffff` |
| tag | `#363636` | | accent | `#001d3d` |
| success | `#46bf72` | | destructive | `#ff5c5c` |
| warning | `#ff8a30` | | icon-blue | `#4099ff` |

换算成侧栏实色（叠在 sidebar 背景上的近似值）：
- Light：primary `#262626`、secondary `#777777`、tertiary `#9f9f9f`、icon `#525252`
- Dark：primary `#d4d4d4`、secondary `#888888`、tertiary `#4f4f4f`、icon `#a3a3a3`

## 3. 字体（DESIGN.md Typography）

- `--ui-font-size: 14px`；`text-ui-xl 18 / lg 16 / base 14 / caption 13 / sm 12 / xs 10`。
- 标签与标题 `font-medium`；正文 `font-normal`；路径/命令/哈希用 mono。
- 界面缩放只改 `--ui-font-size`，不动根字号；图标/间距/圆角不随字号缩放。

### 3.1 刻度落点

ZCode 把 `text-ui-*` 刻度列为「Highest-priority UI constraint」，并注明
「Treat violations of this section as design-system defects, not stylistic preferences」。
本插件的落点如下（定义于 `src/client/zcode-tokens.ts` 的 `ZCODE_STRUCTURAL`）：

| ZCode 令牌 | 公式 | 默认值 | dsh-zcode-ui 落点 |
| --- | --- | --- | --- |
| `text-ui-xl` | 基准 +4px | 18px | `--dsw-font-size-xl` |
| `text-ui-lg` | 基准 +2px | 16px | `--dsw-font-size-lg` |
| `text-ui-base` | 基准 | 14px | `--dsw-font-size-base` |
| `text-ui-caption` | 基准 −1px | 13px | `--dsw-font-size-caption` |
| `text-ui-sm` | 基准 −2px | 12px | `--dsw-font-size-sm` |
| `text-ui-xs` | 基准 −4px | 10px | `--dsw-font-size-xs` |
| `text-ui-2xs` | 基准 −5px | 9px | `--dsw-font-size-2xs`（仅为刻度完整性，ZCode 限定只用于图表坐标轴，界面未消费） |

**展示档（2026-10-13 补充）** —— ZCode 的七档刻度只覆盖界面排版（10–18px），页面级大字
（设置页标题、关于页主标题、新建页 hero）此前落在刻度外，靠 §3.2 的「例外登记」存活。
例外会繁殖：一处「暂不归并」会变成后来人照抄的借口。现补三档，值与原例外**逐一对齐**，
因此这次收归**不产生任何视觉变化**，只是把「破例」变成「有据」：

| 展示档令牌 | 公式 | 默认值 | 消费位置 |
| --- | --- | --- | --- |
| `--dsw-font-size-display` | 基准 +20px | 34px | `new-conversation-style.ts` 的新建页 hero 标题 |
| `--dsw-font-size-headline` | 基准 +8px | 22px | `settings-page-styles.ts` 窄屏设置页标题 |
| `--dsw-font-size-title` | 基准 +6px | 20px | `AboutSection.tsx` 关于页主标题 |

**与界面档的分界**：`display` / `headline` / `title` 只用于页面标题与 hero，
**不得进入列表、控件或行内文本**——它们是「版面」层级，不是「界面」层级。
界面内的所有文字仍只能落在七档之内。

各档以 `calc()` 相对 `--dsw-font-size-base` 表达，因此**改基准一处即可整体缩放**，
与 ZCode「只改 `--ui-font-size`」的规定等价。

`src/` 下落在刻度内的 `font-size` 硬编码已全部替换为上述令牌（共 55 处）；
`font:` 简写内的字号未替换——CSS 简写中嵌入 `var()` 会让整个简写进入待替换状态，
一旦变量缺失则字号、字重、字体一并失效，风险高于收益。

### 3.2 刻度外例外（2026-10-13 已清零）

**当前刻度外字号：0 处。** 由 `tests/design-system.assert.ts` 守护——界面代码里再出现
`font-size:<数字>px` 会直接让门禁变红。

原先登记的四处例外及其处理方式：

| 原值 | 位置 | 处理 |
| --- | --- | --- |
| `34px` | 新建页 hero 标题 | 收归为 `--dsw-font-size-display`（值不变） |
| `22px` | 窄屏设置页标题 | 收归为 `--dsw-font-size-headline`（值不变） |
| `20px` | 关于页主标题（`.dcu-about h2`） | 收归为 `--dsw-font-size-title`（值不变） |
| `11px` ×4 | `ConnectorsSection.tsx`（2 处）、`AboutSection.tsx`、`CodexWorkspaceBrowser.tsx` | **归一为 `sm`(12px)**——见下 |

**为什么 11px 选择归一而不是补一档**：11px 是典型「孤值」，夹在 `xs`(10px) 与 `sm`(12px)
之间，补一档等于把一个孤值合法化，刻度会继续变碎。四处消费方都没有宽度硬约束
（`.dcu-wb-pending` 有 `max-width:88px` + 省略号兜底），+1px 不影响布局，
而 12px 是更稳的可读性下限。这是一次**有意的小幅视觉变更**，已记入 `docs/KNOWN-ISSUES.md` §3.1。

> `font:` 简写内的字号仍未替换——CSS 简写中嵌入 `var()` 会让整个简写进入待替换状态，
> 一旦变量缺失则字号、字重、字体一并失效，风险高于收益。这些简写的取值本身都在刻度内
> （`13px` = caption、`14px` = base），因此不构成例外。

### 3.3 字重（2026-10-13 登记）

ZCode 的规定是「标签与标题 `font-medium`(500)、正文 `font-normal`(400)」。本插件的现状：

| 取值 | 处数 | 用途 | 结论 |
| --- | --- | --- | --- |
| `400` | 12 | 侧栏全部文字、正文 | ✔ 符合 |
| `500` | 9 | 控件标签、数字 | ✔ 符合 |
| `600` | 5 | 设置页标题、设置分组标题、关于页依赖名、分组标题 | **有意偏离，见下** |
| `650` | 0 | （原 `ConnectorsSection` 一处） | 已归一为 `600`——与其余标题取同一档，原值属笔误 |

**600 的偏离理由**：页面级标题（设置页 `h1`、设置分组 `h2`、关于页依赖名）在 500 与 400 之间
缺少区分度——设置页标题与正文同为 400/500 时，层级只能靠字号撑，而字号已经收得很紧。
600 让「页面标题」这一级只靠字重即可辨识。**但这条只适用于页面级标题**：
侧栏内的标题与标签仍严格保持 400（`tests/session-tree.assert.ts`、`tests/settings-integration.assert.ts`
均有断言禁止侧栏标题加粗，理由是「不能显得过黑」）。

侧栏的工作区分组标题（`.dcu-wb-collection-label`）此前误用 600，与侧栏的 400 约定冲突，
已一并归一为 400；分组层级改由披露箭头、缩进与明度表达，不再用字重。

## 4. 圆角与高度（DESIGN.md Radius / Sizing）

- 控件默认 `rounded-lg`（8px）；菜单/下拉壳 `rounded-lg`、菜单项 `rounded-md`（6px）；
  一级容器 `rounded-xl`（12px）；对话框 `rounded-2xl`（16px）；主输入壳是批准的 `rounded-2xl` 例外。
- 按钮高度：`default h-7 / xs h-5 / sm h-6 / lg h-8`；图标基线 `size-4`（16px）。
- 间距 4px 基准：4 图标文字间距 / 8 控件内距 / 12 列表行 / 16 卡片内距。

## 5. 侧栏布局（WorkspaceSidebar.tsx 1453+ / CollapsedRail）

```
aside                flex h-full flex-col overflow-hidden（背景由外壳给 bg-sidebar）
├─ 拖拽区            h-12
├─ 顶操作区          NewTaskButtonGroup（ghost 行 h-8 rounded-lg，hover:bg-surface-hover）
│                    + 搜索整行 ghost 按钮（Search size-4 + 文案 + 快捷键 text-ui-xs）
└─ 任务/工作区列表   分组小节；TaskListItem：rounded-lg pl-2.5 pr-1 py-1 gap-2
                     active: bg-selected，hover: bg-surface-hover
折叠轨                aside flex h-full flex-col border-r border-border bg-background-alt，
                     顶部 h-9 居中图标按钮（logo size-5，hover 换 PanelLeftOpen）
```

## 6. 图标语言

- 全站 Lucide（`lucide-react`）；导航/操作图标 16px（size-4），次级用 foreground-subtle 色阶。
- 关键映射：新建任务 `MessageCirclePlus`、搜索 `Search`、折叠 `PanelLeft`/`PanelLeftOpen`、
  定时 `CalendarClock`、插件商店 `Store`。

### 6.1 图标唯一来源

`src/client/zcode-icons.tsx` 是**插件界面图标的唯一入口**：侧栏外壳、会话树、列表行、
行内操作、悬停卡一律经它取图标。混入宿主图标（`host-icons.ts` 的 `IconXxxMedium`）会让
同一屏出现两套图标语言——stroke 几何与视觉重量都不同；`session-tree.tsx` 曾同时使用两套。

**已收归**：会话树、列表行、行内操作（`CodexWorkspaceBrowser.tsx` 24 处、
`session-tree.tsx` 22 处、`workspace-hover-card.tsx` 8 处），共 54 处。

**2026-10-13 补齐**：`CodexSettingsPage.tsx`、`NewConversationSuggestions.tsx`、
`settings-page-registration.ts` 三处原先直接从 `lucide-react` 引入，现已改从本入口取
（新增 `ZIconArrowLeft` / `ZIconBox` / `ZIconHelp` / `ZIconClock` / `ZIconCpu` /
`ZIconMessageSquare` / `ZIconPanelRight` / `ZIconTelescope` / `ZIconHammer` /
`ZIconScanLine` / `ZIconBug` 等导出；连接器图标复用既有的 `ZIconLink`，与侧栏入口同一图标）。
**现在全仓只有 `zcode-icons.tsx` 一个文件直引 `lucide-react`**——这条规则从此可由
「grep 一次」验证，不再靠人工记忆。

**长尾未收归**（有意保留）：`AboutSection.tsx`、`ScheduleBrowser.tsx`、`ConnectorsSection.tsx`
仍取宿主图标（`IconXxxMedium`）。复核结论：这三个文件**内部各自一致**（同页没有混用两套），
且它们只出现在设置页「关于」「定时」「连接器」等独立页面，不与侧栏同屏。把宿主图标换成
Lucide 等价图标属于**视觉变更**（描边几何与视觉重量都会变），需要设计确认与实拍比对，
不属于"统一来源"这类纯卫生改动，故保留在此登记。

## 7. 动效与层级（DESIGN.md Motion / Elevation）

- 过渡 150–200ms ease-out；菜单/弹层 `shadow-md`；dialog `shadow-lg` 级仅toast/重要浮卡。
- 层级优先靠背景对比（background < surface < card < popover/menu），不靠大阴影。

### 7.1 本插件的落实

ZCode 明确要求「Keep transitions fast and low-drama. Avoid long, springy, or playful
animations in the main workspace」。本插件曾沿用上游 Codex 的 `cubic-bezier(.16,1,.3,1)`
（典型长尾缓出）配合 220–500ms 时长，即 ZCode 要求避免的弹簧感。

**2026-10-12 的第一版修正**把全部过渡收敛为 **180ms ease-out**（共 25 处）。
那是一致，但**没有意图**——出现、移动、消失用同一条曲线，读起来是「没做动效」
而不是「克制的动效」。

**2026-10-13 改为按意图分档的令牌**（定义于 `zcode-theme.ts` 的 `:root`）：

| 档位 | 时长 | 曲线 | 判据 | 典型消费方 |
| --- | --- | --- | --- | --- |
| `feedback` 反馈 | 120ms | `cubic-bezier(.4,0,.2,1)` | 悬停 / 按下 / 选中底色变化——必须立刻回应 | 图标、菜单项、会话行、页签 |
| `move` 移动 | 180ms | `cubic-bezier(.4,0,.2,1)` | 尺寸、位置、行高变化——需要看得见过程 | 侧栏列宽、面板展开、页签滑块、刻度长短 |
| `enter` 进入 | 160ms | `cubic-bezier(.2,0,0,1)` | 内容出现——减速收尾，落点要稳 | 侧栏展开、搜索弹窗、悬停卡、设置页 |
| `exit` 退出 | 120ms | `cubic-bezier(.4,0,1,1)` | 内容消失——加速离场，不拖住下一个动作 | 预留（当前由 `move` 承担双向过渡） |
| `press` 按压 | 90ms | `cubic-bezier(.2,0,0,1)` | 只有按下瞬间的位移，做出手感 | 发送键（见 §11） |

**判据的使用规则**：可开可合的元素（同一处 CSS 过渡既负责出现也负责消失，
例如分组体的展开收起）用 `move`；只有单向的才用 `enter` / `exit`。
CSS 过渡无法区分方向，硬套单向曲线会让「收起」比「展开」更慢，反而更别扭。

`cubic-bezier(.2,0,0,1)` 是减速曲线、`cubic-bezier(.4,0,1,1)` 是加速曲线，
**都没有过冲**——这与「避免弹簧感」不冲突，与 2026-10-12 移除的 `.16,1,.3,1` 的区别
在于后者是长尾缓出（末段长时间缓慢收尾，读起来发飘）。

**令牌化的两个副产品**：

1. **减少动态效果只需一处归零**——`@media (prefers-reduced-motion:reduce)` 把五档时长
   一起置 0，所有消费方自动跟随，不再需要逐个元素写 `transition:none`。
2. **断言可以锁意图而不是锁数值**——`tests/conversation-visuals.assert.ts` 现在断言
   「侧栏展开必须使用 `enter` 档」，数值将来调整不会误报，意图被改则立刻变红。

**未纳入的例外**（不属过渡规范适用范围）：加载旋转（`.8s linear`）、进度条波浪
（`1.2s ease-in-out`）等**循环装饰动画**，以及 `var(--ds-transition-duration-slow)`
这类宿主变量兜底。它们由 `tests/design-system.assert.ts` 按 `infinite` 关键字白名单放行。

## 8. 本插件的落点

| ZCode 规范 | dsh-zcode-ui 落点 |
| --- | --- |
| Zai 色板 | `src/client/zcode-theme.ts` → `--dcu-*` 变量重定义（明/暗两套） |
| 主题机制 | `syncZCodeTheme()` 镜像 `body[data-ds-dark-theme]` → `.theme-zai-*` class |
| 侧栏几何 | `CodexSidebar.tsx` stylesheet：8px 圆角、32px 行高、px-2/py-3/gap-1 间距 |
| **字号刻度** | `zcode-tokens.ts` 的 `ZCODE_STRUCTURAL` → `--dsw-font-size-*` 七档（见 §3.1） |
| **动效节奏** | 五档意图令牌（反馈 / 移动 / 进入 / 退出 / 按压），见 §7.1 |
| 图标 | `zcode-icons.tsx` 为唯一入口（见 §6.1） |
| 会话行 | `CodexWorkspaceBrowser.tsx`：rounded-lg、hover bg-surface-hover、active bg-selected |
| 输入壳 | 侧栏 stylesheet 的 composer 段：rounded-2xl(16px)、bg-input、primary 黑白键 |
| 设置页 | `settings-page-styles.ts` tokens 换 Zai；焦点色 #0b7fff/#4099ff |
| **侧栏结构** | 部分对齐；不可对齐项见 `docs/SIDEBAR-STRUCTURE-DIFF.md` |

## 9. 明度即层级：本插件的核心约束

这一节解释**为什么对比度在这个插件里不是「可读性优化」，而是承重墙**。

### 9.1 单色系统没有第二根杠杆

Zai 色板是**无彩**的：明色侧栏 `#f0f0f0`、画布 `#f8f8f8`、主文字 `#262626`；暗色
`#161616` / `#d4d4d4`；连「主色」与「品牌色」都是同一个 `#000000`。唯一允许出现色相的地方是
状态色（成功/警告/危险）与焦点环。

在有彩色的界面里，色相是第二根杠杆：正文可以发灰、可点元素可以发蓝，用户仍有两条线索。
**本插件没有这条退路。** 于是：

> 文字层级 = 明度差。明度差一旦不足，**整个信息层级是同时塌掉的**，
> 而不是「某一行难读」。

### 9.2 实测：一次真实的塌陷

2026-10-13 的真机测量（Playwright + 计算样式 + WCAG 2.1 公式，底色 `#f0f0f0`）：

| 元素 | 修复前 | 对比度 | 修复后 | 对比度 |
| --- | --- | --- | --- | --- |
| 项目标题（`primary`） | `#262626` | 13.28:1 | `#262626` | 13.28:1 |
| 会话标题（`secondary`） | `#777777` | **3.93:1** | `#5c5c5c` | 5.87:1 |
| 会话时间 / 空态（`tertiary`） | `#9f9f9f` | **2.32:1** | `#686868` | 4.89:1 |

根因：ZCode 的 `foreground-subtle` / `foreground-subtlest` 是 neutral-800 以 60% / 40%
**叠在白底上**推导的，落到侧栏的 `#f0f0f0` 上只剩 3.93:1 与 2.32:1。同一套令牌在暗色
主题上反而达标（5.10:1）——说明原值只对白底成立，**从没在侧栏底色上校验过**。

结果是：侧栏里最常点的东西（会话列表）成了全屏最难读的文字。

### 9.3 因此形成的制度

1. **色阶必须按「实际所在底色」取值**，不能照抄上游在白底上推导的值。
   上游的 `foreground-*` 语义是对的，数值不是。
2. **对比度是断言，不是审美意见**。`scripts/verify-a11y-and-overflow.mjs` 用真机测量
   明暗两套各 5 个选择器，低于 4.5:1 直接让门禁变红（次要文字的下限同为 4.5:1，
   因为在本插件里它们承载实际内容，不是装饰）。
3. **改动色阶时要先问「这还是三档吗」**——修复时特意保留了 `primary` 不动（13.28:1），
   把 `secondary` / `tertiary` 提到 5.87 / 4.89，三档之间仍有一眼可辨的间距。
   把三档都提到接近 `primary` 会让层级重新糊掉，是另一种失败。

> 一句话：**这套皮肤的可读性检查不是附加质量项，它就是设计本身。**
> 谁要动色阶，先读这一节。

## 10. 外来内容契约

### 10.1 背景

侧栏页脚由各插件自绘（`sidebar.footer.action` / `sidebar.settings` 插槽），本插件只提供容器。
实机反馈暴露了两个问题：`dsh-cost-meter` 的余额卡片自带白底卡片与加粗大数字，
**视觉重量压过整条导航**；折叠轨只有 56px，它的文字被裁成 `F41-peak` 这类乱码。

### 10.2 契约三条

外来内容进入本插件侧栏时，必须满足：

1. **文字色只能用侧栏自己的色阶**（`--dcu-sidebar-primary/secondary/tertiary` 三档），
   不得引入外来色或纯黑；默认档位是 `secondary`，**只有承载数据本身的数值**可以用 `primary`。
   侧栏是单色系统，明度就是层级（见 §9）——外来内容比导航更黑，导航就失去了层级。
2. **不得自带不透明卡片底与阴影。** 侧栏是一个连续表面，不是卡片墙。
3. **折叠态必须可降级。** 装不下就隐藏或只留图标，不得横向溢出。

本插件负责把不符合的第三方内容**收敛**到契约内（收敛由本插件做，而不是要求对方改）——
因为对方的视觉决策服务于它自己的产品，本插件无权要求它为自己让步。

当前 `dsh-cost-meter` 的收敛结果（也是契约的参考实现）：

| 锚点 | 落到哪一档 |
| --- | --- |
| `.cm-footer-stack` | 去掉卡片底、边框、阴影与内边距，融入侧栏表面 |
| `.cm-simple-summary` / `.cm-foot` / `.cm-peak-classic-chip` | `secondary`，400–500 字重 |
| `.cm-balance-name` | `secondary`，400（标签要静） |
| `.cm-num` | **`primary`**，500、tabular-nums（承载数据的数值，允许最高一档） |
| `.cm-peak-classic` | `tertiary`（最次要的一行） |

### 10.3 落地方式：锚点 + 哨兵

样式只覆盖**契约锚点**（`foreign-content-contract.ts` 的 `FOREIGN_FOOTER_ANCHORS`），
**不匹配任意外来类名**——属性通配（`[class*=cm-]`）会让覆盖范围随对方改版漂移，
且无法审查。`tests/design-system.assert.ts` 会校验「侧栏覆盖的每个 `.cm-*` 都已在锚点清单里」，
覆盖了未登记的锚点直接让门禁变红。

代价是：锚点一旦被对方改名，覆盖会**静默失效**（样式还在，但选不中任何元素，
界面悄悄变回原样）。因此配一个**运行时哨兵**：页脚里出现 `cm-` 前缀元素但锚点缺失时，
`console.warn` 明确报出缺了哪些锚点、该去哪里改。

> 它不修复问题，但把「静默失效」变成「响亮失效」——让契约破裂在发生的当天被看见，
> 而不是等用户截图来投诉。

## 11. 签名细节

本插件的视觉语言全部来自 ZCode（见 §8），因此**属于本插件自己的表达**极少。
目前已登记两处，都遵循同一条规则：**只用位移与明度，不引入颜色**——
在单色系统里没有色相可用，也不该有。

### 11.1 发送键的回应

发送是这台机器上被点得最多的一次交互。它的回应分两层：

- **悬停**：箭头前倾 `1px`（用 `enter` 档——它是一次落位，不是一次移动）；
- **按下**：整键压到 `scale(.94)` 并回弹（用 `press` 档，90ms——最短的一档，
  因为它要做出「手感」，而不是被看见）。

两者都只用位移。`tests/design-system.assert.ts` 同时守护「必须有这两处回应」
与「不得引入任何颜色字面量」。

### 11.2 空状态的口气

空状态从「只有状态」改成「状态 + 下一步」：

| 键 | 原文 | 现文 |
| --- | --- | --- |
| `workspace.empty` | 暂无项目 | 还没有项目。添加一个工作区目录即可开始。 |
| `workspace.recentEmpty` | 无聊天 | 最近打开过的会话会出现在这里。 |
| `search.empty` | 没有匹配的结果。 | 没有匹配的会话。 |
| `settings.noResults` | 没有匹配的设置分类 | 没有匹配的设置分类，换个关键词试试。 |

口径：**简短、直白、不推销**。空状态是一台工具唯一能说话的地方，
所以它说的话必须有用——告诉用户下一步做什么，而不是复述「这里没有东西」。

> 这是本插件**唯一允许有个性**的地方。整站其余部分保持同一情绪温度（见 §9 的克制原则），
> 正因为如此，这一处的口气才显得是「有人写的」，而不是模板填出来的。

## 12. 宿主锚点契约

### 12.1 与 §10 的区别

§10 管的是**别人插进我这儿**的东西（第三方插件在本插件侧栏内）；
本节管的是**我接在别人身上**的东西（本插件依赖的上游 CSS Module 哈希类名）。
两者的失效方式一模一样：**改名之后没人报错，界面只是悄悄少一块。**

### 12.2 边界：皮肤层不碰哈希类名，集成层必须碰

`zcode-skin.ts` 明确拒绝针对宿主类名写规则，理由是哈希名会在下次上游构建时静默失效。
这条纪律成立，但**只约束皮肤层**。插件的宿主集成层无法回避：新建会话页的整体排版、
输入壳的发送键、工作区行、工具菜单，都要按上游的块名定位才能接上去。

现状：**18 个哈希类名锚点**，分布在 6 个文件：

| 文件 | 锚点数 | 用途 |
| --- | --- | --- |
| `composer-tool-menus.ts` | 24（含重复引用） | 工具菜单壳与内部行 |
| `new-conversation-style.ts` | 15 | 新建会话页 hero 排版 |
| `settings-page-styles.ts` | 10 | 设置页分区标题 |
| `CodexSidebar.tsx` | 7 | 输入壳、发送键、附件轨 |
| `NewConversationSuggestions.tsx` | 3 | 建议卡所在行的定位 |
| `zcode-theme.ts` | 1 | 说明性引用 |

### 12.3 只对"前置条件可确定"的锚点做自检

18 个锚点里多数只在特定状态下出现（工具菜单内部、设置页某个分区）。
无条件检查它们会制造大量误报，而**误报比不报更糟**——用户会学会忽略这条警告。

因此 `host-anchor-contract.ts` 只登记**作用域容器在场时就必须在场**的锚点：

| 作用域 | 锚点 | 缺失后果 |
| --- | --- | --- |
| `[data-phase=hero]` | `_composerHero`、`_stack`、`_headline`、`_heroWorkspaceRow`、`_fishHitbox` | 新建会话页的整体排版会整块失效 |
| `[data-composer-card]` | `_primary` | 发送键退回宿主默认配色 |

自检在 `index.ts` 以应用级 effect 注册，`MutationObserver` 监听 `document.body`，
合并到下一帧执行；**同一作用域只报一次**（上游改名会同时打掉一整组，重复报没有新信息）。

> 登记进 `HOST_ANCHOR_GROUPS` 是**强制**的：`tests/design-system.assert.ts` 会校验
> 源码里用到的每个 `[class*="_xxx"]` 锚点都在表中，漏登直接让门禁变红。
