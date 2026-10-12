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

## 7. 动效与层级（DESIGN.md Motion / Elevation）

- 过渡 150–200ms ease-out；菜单/弹层 `shadow-md`；dialog `shadow-lg` 级仅toast/重要浮卡。
- 层级优先靠背景对比（background < surface < card < popover/menu），不靠大阴影。

## 8. 本插件的落点

| ZCode 规范 | dsh-zcode-ui 落点 |
| --- | --- |
| Zai 色板 | `src/client/zcode-theme.ts` → `--dcu-*` 变量重定义（明/暗两套） |
| 主题机制 | `syncZCodeTheme()` 镜像 `body[data-ds-dark-theme]` → `.theme-zai-*` class |
| 侧栏几何 | `CodexSidebar.tsx` stylesheet：8px 圆角、32px 行高、px-2/py-3/gap-1 间距 |
| 图标 | `zcode-icons.tsx`：lucide-react（tsdown 已配置 ESM 别名 + 摇树） |
| 会话行 | `CodexWorkspaceBrowser.tsx`：rounded-lg、hover bg-surface-hover、active bg-selected |
| 输入壳 | 侧栏 stylesheet 的 composer 段：rounded-2xl(16px)、bg-input、primary 黑白键 |
| 设置页 | `settings-page-styles.ts` tokens 换 Zai；焦点色 #0b7fff/#4099ff |
