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

各档以 `calc()` 相对 `--dsw-font-size-base` 表达，因此**改基准一处即可整体缩放**，
与 ZCode「只改 `--ui-font-size`」的规定等价。

`src/` 下落在刻度内的 `font-size` 硬编码已全部替换为上述令牌（共 55 处）；
`font:` 简写内的字号未替换——CSS 简写中嵌入 `var()` 会让整个简写进入待替换状态，
一旦变量缺失则字号、字重、字体一并失效，风险高于收益。

### 3.2 刻度外例外（有意保留）

以下字号不落在七档刻度内，出于「不做未经确认的视觉变更」原则保留原值，此处登记备查：

| 值 | 位置 | 说明 |
| --- | --- | --- |
| `11px` ×4 | `ConnectorsSection.tsx:25`（2 处）、`AboutSection.tsx:39`、`CodexWorkspaceBrowser.tsx:206` | 介于 `xs`(10px) 与 `sm`(12px) 之间，归并任一侧都会改变现有视觉 |
| `20px` | `AboutSection.tsx:35`（`.dcu-about h2`） | 关于页主标题，超出刻度上限 `xl`(18px) |
| `22px` | `settings-page-styles.ts:98` | 设置页标题，同上 |
| `34px` | `new-conversation-style.ts:10` | 新建会话页 hero 标题，展示型大字，非界面排版层级 |

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

现已统一：**全部过渡收敛为 180ms ease-out**，共改 25 处（23 处 CSS 过渡、
1 处 JS Web Animations `easing`、1 处 CSS 变量定义）；低于下限的 140ms 提到 150ms。

**未纳入的例外**（不属过渡规范适用范围）：加载旋转、标题跑马灯、进度条波浪等
**循环装饰动画**，以及 `var(--ds-transition-duration-slow)` 这类宿主变量兜底。

## 8. 本插件的落点

| ZCode 规范 | dsh-zcode-ui 落点 |
| --- | --- |
| Zai 色板 | `src/client/zcode-theme.ts` → `--dcu-*` 变量重定义（明/暗两套） |
| 主题机制 | `syncZCodeTheme()` 镜像 `body[data-ds-dark-theme]` → `.theme-zai-*` class |
| 侧栏几何 | `CodexSidebar.tsx` stylesheet：8px 圆角、32px 行高、px-2/py-3/gap-1 间距 |
| **字号刻度** | `zcode-tokens.ts` 的 `ZCODE_STRUCTURAL` → `--dsw-font-size-*` 七档（见 §3.1） |
| **动效节奏** | 全站过渡统一 180ms ease-out（见 §7.1） |
| 图标 | `zcode-icons.tsx` 为唯一入口（见 §6.1） |
| 会话行 | `CodexWorkspaceBrowser.tsx`：rounded-lg、hover bg-surface-hover、active bg-selected |
| 输入壳 | 侧栏 stylesheet 的 composer 段：rounded-2xl(16px)、bg-input、primary 黑白键 |
| 设置页 | `settings-page-styles.ts` tokens 换 Zai；焦点色 #0b7fff/#4099ff |
| **侧栏结构** | 部分对齐；不可对齐项见 `docs/SIDEBAR-STRUCTURE-DIFF.md` |
