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

- Light（底 `#f0f0f0`）：primary `#262626`(13.28:1)、secondary `#5c5c5c`(5.87:1)、tertiary `#686868`(4.89:1)、icon `#525252`(6.86:1)
- Dark（底 `#161616`）：primary `#d4d4d4`(12.21:1)、secondary `#888888`(5.10:1)、tertiary `#828282`(4.71:1)、icon `#a3a3a3`(7.17:1)

> ⚠️ **本表的真源是 `src/client/zcode-theme.ts` 的 `--dcu-sidebar-*`**，这里只是镜像。
> 2026-10-14 更正：此前本表四个值里三个是**修复前的旧值**——亮色 secondary/tertiary
> 仍写 `#777777` / `#9f9f9f`（§9.2 实测 3.93:1 / 2.32:1，已判定不达标并替换），
> 暗色 tertiary 写 `#4f4f4f`（复算仅 **2.21:1**，照此实现会直接制造一处 AA 违规）。
> 括号内为按 WCAG 2.1 公式对本表值复算的结果，可逐项复核。
> **改色阶时先改 `zcode-theme.ts`，再回来同步本表**——同一份数值不应有两处来源。

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

### 10.2 契约四条

外来内容进入本插件侧栏时，必须满足：

1. **文字色只能用侧栏自己的色阶**（`--dcu-sidebar-primary/secondary/tertiary` 三档），
   不得引入外来色或纯黑；默认档位是 `secondary`，**只有承载数据本身的数值**可以用 `primary`。
   侧栏是单色系统，明度就是层级（见 §9）——外来内容比导航更黑，导航就失去了层级。
2. **不得自带不透明卡片底与阴影。** 侧栏是一个连续表面，不是卡片墙。
3. **折叠态必须可降级。** 装不下就隐藏或只留图标，不得横向溢出。
4. **数据可视化的语义色允许保留**（2026-10-13 补）。进度条填充这类承载「峰值 / 非峰值」
   状态的颜色，压成中性等于把信息抹掉；因此**只约束填充本身**，它不得用于文字或卡片底
   （那两条归第 1、2 条管）。当前唯一实例：计费插件峰值条的
   `.cm-peak-segment.cm-peak-high` 填充（`rgb(255,152,0)`，实机测得，段宽 95px）。

   这一条是**显式允许，不是漏管**——没有它，下一个做整洁化的人会把这抹暖色当杂质清掉，
   而峰值条会因此失去「现在是不是峰值」这个信息。

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


## 13. 几何令牌与跨文档嵌入面（2026-10-13 补）

### 13.1 圆角：令牌 + 棘轮

标度（`zcode-tokens.ts` 的 `ZCODE_STRUCTURAL`）：`xs 2 / sm 4 / md 6 / lg 8 / xl 12 / 2xl 16 / full 999`。
`2xl` 是宪章白名单档位，只允许出现在**主聊天输入壳 / 对话框 / 会话状态浮层 / Toast / 品牌图标底盘**；
`full` 只用于「刻意的胶囊或圆形」，不因组件类型自动获得。

**`--dsw-radius-panel` 是宿主令牌的覆盖，不是私有令牌**（宿主 `:root` 定义 28px，被 Modal、设置面板、
反馈弹窗、浮动面板与 `calc(var(--dsw-radius-panel) - 4px)` 的缩放角消费）。本插件以 `12px` 覆盖它：
一级容器档位、与卡片/控件同一语言。**删掉这一行 = 上述表面回落到 28px**，且不会有任何报错。
断言要求它存在且 ∈ {12px, 16px}。

界面代码里的圆角字面量由 `tests/design-system.assert.ts` 第 9 节以**棘轮**方式守护：按
`文件:值 → 出现次数` 登记存量，未登记即红——**把令牌改回 `999px` 这类"看起来没差别"的回退也会被拦下**。
存量只允许两类：`0`（语义是「没有圆角」）与 `50%`（几何圆，表达形状而非标度档位）。

### 13.2 减少动态效果：三种行为

`prefers-reduced-motion: reduce` 下不只是「时长归零」：

| 行为 | 做法 | 落点 |
| --- | --- | --- |
| 归零 | 五档时长令牌一起置 0，消费方自动跟随 | `zcode-theme.ts` |
| **停静止帧** | 无限装饰动画停在**有意义的静止帧**，保留「进行中」的可读性 | 进度波浪停在 28%（主题层）；旋转指示归零（组件层，与 keyframes 同处） |
| 颜色瞬切 | 颜色过渡随令牌归零，不做淡入 | 同上 |

依据是上游 `styles.css` 的 reduced-motion 三段式（归零 / 停静止帧 / 颜色瞬切）。
**时长归零对 `infinite` 动画无效**——这是本仓库曾漏掉的一点。

### 13.3 主区嵌入面：跨文档隔离，且**皮肤层面没有有效的容器手段**（否定结论）

**机制（实测）**：第三方面板（`dsh-mcp-connector`）渲染在 `<iframe src="{origin}/mcp-connector/ui/">` 里，
是**独立文档**：

- 面板 CSS 对宿主令牌的引用 = **0 处**（`--dsw-*` 与 `--dcu-*` 均为 0）；
- 面板自有变量体系（`--bg` / `--accent` / …），主色 indigo `#4f46e5`（38/101 个按钮）；
- 面板只跟随**操作系统** `prefers-color-scheme`，**不跟随宿主** `body[data-ds-dark-theme]`；
- 宿主在 iframe 上写了**行内样式**：`border-style:none; border-color:currentcolor; background:transparent`。

**四条可能的容器手段，逐条被实测排除**：

| 手段 | 结果 |
| --- | --- |
| 给嵌入面写 `border` / `background` | ❌ 必为死声明——宿主行内样式优先级高于任何样式表规则（含 `@layer` 与 `!important` 之外的任何写法） |
| 给嵌入面写 `border-radius` | ❌ 技术上生效（computed 12px），但**视觉上不可见**：像素比对（DSF=4，明暗各一次）显示有/无圆角仅 **50 个像素**不同，差值为 `(254,254,254)` vs `(255,255,255)`，因为裁角露出的父层底色与面板同为近白 |
| 向 iframe 内部注入 `color-scheme` / `.dark` | ❌ 面板不变 |
| 给宿主里的 `iframe` 元素设 `color-scheme:dark`（inline 或 CSS 规则） | ❌ 面板不变——Chrome 不依据嵌入元素的 `color-scheme` 重解内嵌文档的媒体查询 |

**结论**：皮肤**不应**再声明嵌入面的边框/底/圆角——那是空操作，只会制造"看着有、其实没生效"的规则与
给人虚假安全感的断言。本轮曾写下该规则并配了真浏览器双向断言，**随后用像素比对证明其零效果，已连同断言一并撤回**。

**真正的修复路径（责任方不在皮肤）**：
1. **宿主**：把主题与表面令牌下发给 iframe（postMessage 或 query），或为嵌入面包一层真正的容器元素（`[data-slot]` 出口目前是 `display:contents`，无盒、画不了边框）；
2. **该插件自身**：消费宿主令牌 / 跟随宿主 `data-ds-dark-theme`，而不是只认操作系统的 `prefers-color-scheme`。

> 这条的价值在于**别再试一遍**：明暗撕裂（暗色宿主 + 亮色系统下主区出现整块亮色面板）在本机是宿主级问题，
> 皮肤既进不去、也框不住。

## 14. 2026-10-14：一次外部审查后的制度补强（1.10.0）

一次独立 UI 审查给出的评级是 B，问题集中在三处：**亮色主题的状态色不达 AA**、
**可访问性可验证范围远小于设计范围**、**交付文档与实现不一致**。下面逐条登记处置，
并说明为什么这样改——这三条的教训都比代码活得久。

### 14.1 §9 的制度没有覆盖「状态色」轴（本批最重要）

§9 论证「明度即层级」时，只把 `secondary` / `tertiary` 按实际底色重取了值，
**没有覆盖状态色**。而 Zai 的 `--dsw-alias-state-*` 是**按填充用途**推导的
（`#e03131` / `#1e8a3e` / `#e07b00`），当作小字用时亮色档全数不达标：

| 部位 | 用色 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 侧栏「待处理」胶囊文字（12px/400） | `state-warn-label` | **2.63:1**（悬停 2.36:1） | `--dcu-state-warn-text` `#8a4b00` → 5.97:1 |
| 会话区错误提示条文字（12px） | `state-error-primary` | **3.34:1** | `--dcu-state-error-text` `#b3261e` → ≥4.84:1 |
| 关于页「可更新」（12px） | `state-warning-primary` | **2.82:1** | 同上 → 5.33:1 起 |
| 关于页「已安装」/「未安装」（12px） | `state-success/error-primary` | **4.15 / 4.25:1** | `#176c31` / `#b3261e` → ≥4.82:1 |

注意 `#e07b00` 那行：这是侧栏里**唯一**告诉用户「有会话在等你审批」的信号，却成了全屏
最难读的文字。**这与 §9.2 描述的「一次真实的塌陷」是同一类故障，只是换了根轴。**

**处置**：把状态色分成两档，并写进 `zcode-theme.ts`（挂 `:root`，理由同 §12 的
`--dcu-primary`——会话菜单经 portal 渲染到 body，挂侧栏作用域会静默失效）：

- **填充档**沿用 Zai 原值不动。色相语义不变，第三方进度条等仍按原样收敛（§10.2 契约第 4 条）。
- **文字档**按实际底色重新取值，色相同族、只压明度——符合 §11「只用位移与明度」。

实测覆盖全部消费底色（侧栏 `#f0f0f0`、行悬停 `#e4e4e4`、设置页 `#f8f8f8`、12% 色调底）：
亮色 warn `#8a4b00` ≥5.04:1、error `#b3261e` ≥4.84:1、success `#176c31` ≥4.82:1；
暗色沿用 Zai 原值（≥4.68:1）即达标，故不另取。

> **自相矛盾之处值得记住**：§10.2 契约第 4 条明令第三方插件「语义色只约束填充，不得用于文字」，
> 本插件自己的亮色档却在这么做。审查意见的那句话是对的——**给别人定的规矩，自己要第一条遵守**。

**防复发**：`scripts/verify-a11y-and-overflow.mjs` 原只测 5 个侧栏文字选择器，
所以这类回归持续逃逸。现已扩到 7 个（含上述 4 类状态文字 + 设置页搜索框 + 状态指示点），
明暗两套各测。已用探针验证：把 `.dcu-wb-pending` 的文字色改回 `state-warn-label` 会立刻变红。

### 14.2 附带发现：确认按钮的悬停态明暗两档都掉线

`.dcu-wb-confirm` 的悬停原为 `color-mix(error 88%, bg-layer-3)`，即**两档一律变亮**。
但前景色随主题翻转（亮色白字 / 暗色深字），所以方向必须相反：

| | 默认 | 悬停（原） | 悬停（改） |
| --- | --- | --- | --- |
| 亮色 | 4.51:1 | **3.91:1** ❌ | 变暗 `#c52b2b` → 5.59:1 |
| 暗色 | 4.68:1 | **3.93:1** ❌ | 变亮 `#ff7070` → 5.26:1 |

故新增 `--dcu-state-error-fill{,-hover}` 一对令牌，悬停方向随主题相反。
**教训：前景色随主题翻转时，「变亮/变暗」这个动作本身也必须随主题翻转。**

### 14.3 焦点环：6 种来源收敛为 1，且禁止低透明度

审查实测同仓 `:focus-visible` 颜色有 6 个来源，其中**成功绿被当作焦点环**
（`.dcu-about-external-link`），与「已安装」的语义撞色；`--sp-muted` 是文字色，也被当成环用。
更严重的是工具菜单过滤框的环是 `color-mix(… 20%, transparent)` 的 1px 内环——
**数学上不可能达到 3:1**（实测上限亮色 1.61:1、暗色 1.91:1，即使基准色取纯黑/纯白），
键盘用户看到的是「什么都没有」。

**依据**：§9.1 明说「唯一允许出现色相的地方是状态色与**焦点环**」，所以走蓝没问题。
处置：全仓统一 `var(--dsw-focus-ring-color, var(--dcu-focus))`（亮 `#0b7fff` /
暗 `#4099ff`，在侧栏/页面/卡片三种底色上 3.35–6.22:1），并加两条断言——
① 环颜色只允许这一个令牌；② 环不得是低透明度颜色。

### 14.4 `role="tree"` 只声明未实现（本批最大的可用性缺陷）

侧栏此前**声明**了 `role="tree"` / `role="treeitem"`，但树的契约一条都没兑现：

- 方向键匹配数为 0——树的全部意义就是「一个 Tab 站 + 方向键遍历」；没有它，
  100 个会话要按 **100 次 Tab** 才能穿过侧栏（尼尔森第 7 条）。
- 每个 treeitem 都写死 `tabIndex={0}`，而不是 roving tabindex（全树只有一个可 Tab 项）。
- 没有 `aria-level`（treeitem 的必填属性）。
- treeitem 的归属被打断——ARIA 要求 treeitem 由 `tree` 或 `group` 直接拥有，
  而 `.dcu-wb-section` / `.dcu-wb-collections` / `.dcu-wb-group-member` 等纯结构层
  既没有 role 也不是 presentation，夹在中间会让树在无障碍树里散架。

**声明了更强的语义却不兑现，比不声明更差**——辅助技术会按树来呈现，用户按树来操作，然后失败。
本批补齐（`src/client/tree-keyboard.ts`）：方向键 + Home/End + roving tabindex +
DOM 推导的 `aria-level` + 纯结构层统一标 `presentation`。判据写进 13 条行为测试。

分工上刻意**只处理方向键**：`Enter`/`Space` 留给行内元素自己的 `onKeyDown`——React 18
把合成事件挂在 React 根容器上，容器级监听器会**先于**行内处理器触发，在这里也处理一遍就会双触发。
控制器只观察 `childList`、不观察 `attributes`：本模块自己要写 `aria-level`/`role`/`tabindex`，
观察属性会自触发（相同值的 `setAttribute` 同样触发属性观察器，本仓库在侧栏动画上踩过一次）。

### 14.5 触屏目标尺寸

原 coarse 分支只解决「按钮是否常驻可见」，没解决「是否够大」：会话行 32px、
行内 ⋯/归档按钮 20×20，而放宽规则只写给了集合头（那里也只到 36/28px）。
20×20 低于 WCAG 2.2 AA 2.5.8 目标尺寸（最小值）的 24×24。现已统一：行高 44px、
行内按钮 44×44、集合头 44px。

**已登记的代价（不是 bug，是取舍）**：触屏下「时间 + 两个 44px 操作」要占掉 156px，
240px 宽的侧栏只剩 84px 给标题。若要缓解，方向是**触屏只保留 ⋯ 一个入口**（归档走菜单），
但那是产品决策、且与 §1.7.0 已登记的「coarse 下操作与 ⋯ 常驻」相抵触，
故本批只记下这个选项，未擅改。见 `KNOWN-ISSUES.md` §21。

### 14.6 交付文档与实现不一致

`ZCODE-DESIGN.md` §2「换算成侧栏实色」表四个值里三个是修复前的旧值（亮色 secondary/tertiary
仍是 `#777777`/`#9f9f9f`，暗色 tertiary 是 `#4f4f4f`——后者复算仅 2.21:1，照文档实现会直接违规）。
已更正为 `zcode-theme.ts` 的真值并附复算结果，同时写明「改色阶先改源、再同步本表」。
另：设置页 `--sp-*` 的回退值曾是修复前的 `#777777`，已更新；`--sp-muted` 按底色拆出
`--sp-muted-on-card`（卡片档暗色 `#9a9a9a` 5.03:1，原 `#8f8f8f` 在 `#2b2b2b` 上仅 4.38:1）。

> 顺带一个教训：本批给 `settings-page-styles.ts` 补的文件头注释里用了反引号，
> 打断了三个用 `indexOf('`')` 切样式表的布局脚本，让它们量到设置页宽 1264 ≠ 1280。
> 那几个脚本已改成按变量名切，并补了「文件里第一个反引号必须就是模板串起始」的断言。
> **文档约定是明文的不够，还得有断言。**

### 14.7 顺带修的两个既有问题

- **未读点的 `aria-label` 其实是无效的**：`<span aria-label>` 映射到 `generic` 角色，
  而 ARIA 1.2 对 generic 的规定是「Name From: prohibited」——标签会被直接忽略。
  已改为 `role="img"` + `aria-label`。
- **运行中状态对辅助技术完全不可见**：转圈是 `aria-hidden="true"` 且无文本替代，
  屏幕阅读器用户得到零信息（未读点与待处理胶囊都有可访问名）。已补
  `sessions.running` 文案 + `role="img"`，四分支各有断言锁住。
- **一条断言文案与判据自相矛盾**：`settings-integration.assert.ts` 写「重命名输入框必须提供
  清晰的**蓝色**焦点态」，正则却匹配黑白的状态色令牌。文案一直是对的，实现跟了错的那一半。

### 14.8 仍未解决（登记，不伪装成已修）

> 2026-10-14 晚些时候的 1.11.0 批次已解决其中三条（触屏单一入口、平台覆盖、三态外壳），
> 见 §15 与 `KNOWN-ISSUES.md` §22。以下按 1.10.0 时点原文保留。

- 触屏标题过窄（§14.5 的取舍）。
- `--sp-*` 与 `--dcu-*` 两套并行命名空间服务于同一个单色系统，中期应合并。
- 断点无体系：7 个 `max-width`，其中 639/640 分属两个文件却管同一块 composer 区域。
- 平台覆盖仍只有 macOS 单窗口（§6 已登记）。
- loading / error 态仍无统一规范（`KNOWN-ISSUES.md` §13.6 自登记，本批未动）。

---

## 15. 2026-10-14：未决项清理（1.11.0）

1.10.0 发布时留了 5 条「仍未解决」。本批的设计决定只有三条是新做的，其余是兑现既有承诺。
完整销账表见 `KNOWN-ISSUES.md` §22。

### 15.1 触屏单一入口（产品决策的落地）

§14.5 记的选项被采纳：**触屏只保留 ⋯ 一个 44×44 入口**，快捷归档退场（归档走菜单，
`sessionMenuItems` 里该项一直在）。设计依据有两条，都不只是几何：

- 触屏行列表的惯例是单一「更多」入口（iOS / Android list row 同款）；
- 一键归档是破坏性动作，把它从易误触的常驻位挪进菜单，本身是安全改进。

代价是归档多一次点击。收益用同一夹具量化（240px 侧栏、含时间元素的行）：
预留从 156px 降到 120px，**标题元素实测从 54px 回到 90px**。
（§14.5 的「84px」是内容宽口径 = 240−156；标题元素还要再让出行首 30px 状态槽，故为 54px。
两个口径都成立，但必须标明是哪一个。实施中代码注释曾写「换回 72px 标题」——该数既非
内容宽（84px）也非元素宽（54px），复现不出出处，已按双口径实测值更正。）

### 15.2 三态外壳（loading / error / empty）

`KNOWN-ISSUES.md` §13.6 自登记的空白（loading / error 态「无统一规范、无断言」），本批补上。设计决定：

- **一个外壳只换语义色，不换容器几何**——同一处信息换个状态不该跳版。字号/圆角/内边距
  由 `.dcu-state` 单规则承担，`.dcu-state--error` / `--empty` 只改文字色；
- **错误态不铺 destructive 底色**。语义靠三件事：文字色走 `--dcu-state-error-text`
  （≥4.5:1）、容器带 `role="alert"`、表单控件用 `aria-invalid` 边框。原 `.dcu-wb-error`
  铺 12% 色调底，在 240px 窄栏里是一整块刺眼的红，且违反 §10.2 契约第 4 条；
- 图标位由使用处给（ZCode 同模型：Spinner 只接 className），外壳只管间距与文字；
- 放主题层（应用级）而非侧栏：频道 / 定时 / 行内操作 / 弹窗都要用，避免各抄一份。

守护：新脚本 `verify-state-shells.mjs`（三态几何一致 / 明暗两套语义色 / 无底色 / 图标 ≥3:1），
已接入 `gate.mjs` 布局链。**首版曾量了个寂寞**：只注入侧栏样式表，而 `.dcu-wb-error`
定义在 `CodexWorkspaceBrowser.tsx`，断言永远绿——探针一跑现形。见 `KNOWN-ISSUES.md` §22.5。

### 15.3 浮层令牌上提 :root + 宿主菜单令牌优先

工具菜单与 Git 弹窗经 portal 渲染到 body，**不在任何侧栏作用域内**。`--dcu-tip-*`
原先挂在 `.dcu-root` 等作用域上，portal 表面取不到、静默走字面量回退。本批把浮层三件套
上提 `:root`（与 `--dcu-state-*` 同路），并顺手兑现 §12.3 #1：菜单底色从硬编码
`#fff!important` + 暗色补丁条，改为 `var(--dsw-specific-menu, var(--dcu-tip-bg))` +
`backdrop-filter:var(--dsw-menu-backdrop-filter,none)`——**宿主令牌优先，自家不透明色兜底**。
缺宿主时菜单仍可读（失去半透明与模糊），这是「降级到可读」而不是「静默失效」。

### 15.4 合成夹具按 modality 注入（§12.3 #2 的兑现）

`zcode-tokens.ts` 里 `ZCODE_LIGHT` / `ZCODE_DARK` 是同名令牌的两份定义，旧夹具把两份
平铺进同一个 `:root`，**暗色恒胜**。除 §12.3 #2 已记的前景色错配，还有一个更隐蔽的：
`--dsw-alias-bg-layer-3`（亮 `#ffffff` / 暗 `#2b2b2b`）会让「白字 on 错误底」的对比度
在亮色趟算出 `#2b2b2b on #ff5c5c = 1.19:1` 这种物理上不存在的结果。
现按 `ZCODE_LIGHT` / `ZCODE_DARK` / `ZCODE_STRUCTURAL` 三段切分注入；**结构段必须单独拆**——
它排在 `ZCODE_DARK` 之后，按两段切会让亮色夹具拿不到任何圆角/字号令牌（实测表现为
输入壳圆角 16px 变 0px、字号静默回退，而页面照样渲染、只是量错）。

