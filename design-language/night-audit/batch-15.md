# 批次 15 · 设计语言对账（夜间审计）

> 模块：`virtual-skip.ts` / `composer-tool-menus.ts` / `foreign-content-contract.ts` / `NewConversationSuggestions.tsx` / `shortcut-catalog.ts` / `automation-task-settings.ts`（均在 `uiplug/src/client/` 下）
> 方法：读源码列决策点 → 优先用设计语言文档已有实测（03d-composer / 03b-sidebar / 03p-startup / 08-performance-audit + 定向 grep 01/02/03i/03n/04）→ 文档无记录时用 `grep -a -o` 从 `/Applications/ZCode.app/Contents/Resources/app.asar` 与 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` 提取。本批未跑 CDP 活体，全部为静态证据。

## 批次 15 · 上述 6 模块

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| composer-tool-menus.ts | 菜单项 hover 反馈 | `color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent)`（源码 L26、L47-48；按钮行 hover 为 8%，L7） | 菜单 hover 为**实色**：light `oklch(97% 0 0)`、dark `#363636`（tokens.json `--color-menu-hover`，CDP 实测） | tokens.json `--color-menu-hover`；本仓映射层已有同值令牌 `--dsw-specific-menu-item-hover`（light `#f0f0f0` / dark `#363636`，zcode-tokens.ts:263,489）但本模块未消费 | 菜单项/选项 hover 改接 `--dsw-specific-menu-item-hover`，删手写 color-mix（顺带消掉按钮 8% / 菜单 10% 的仓内不一致） |
| composer-tool-menus.ts | 菜单壳底色 | `var(--dsw-specific-menu, var(--dcu-tip-bg))` → 宿主值 light `rgba(248,249,250,.94)` / dark `rgba(48,49,54,.94)`，半透明 + backdrop-filter（源码 L15） | `--color-menu` 实色：light `#fff` / dark `#2b2b2b` | DeepSeek Harness asar：`grep -a -o -- '--dsw-specific-menu:[^;]{0,40}'` 命中两条 rgba(…,.94)；ZCode tokens.json `--color-menu` | 半透明毛玻璃是宿主观感、与 2026-10-14 去硬编码注释里旧值 `#fff`/`#2b2b2b`（恰为 ZCode 值）已不同；是否回实色需权衡毛玻璃观感，先登记待裁决 |
| composer-tool-menus.ts | 菜单项字号 | `var(--dsw-font-size-caption)` = base 14 − 1 = **13px**（zcode-tokens.ts:554,557；消费于 L6,25,47） | 菜单项 **14px** | 03b-sidebar.md:40（#13「菜单项高/字号 32px/14px ✅」活体实测）+ tokens.json `uiFontSize=14px` | 菜单项字号回 14px（`--dsw-font-size-sm` 反而是 12px，caption 是 13px，需另定档或用 base） |
| composer-tool-menus.ts | 菜单项最小高度与内边距 | `min-height:28px; padding:4px 8px`（源码 L25、L47） | 菜单项高 **32px**、内边距 `0 10px` | 03b-sidebar.md:40-41（#13/#14，活体实测） | 高度与内边距对齐 32px / `0 10px`（ZCode asar 旁证：`min-h-8` 31 处、`h-8` 235 处） |
| foreign-content-contract.ts | 侧栏三档文字色透明度 | primary/secondary **68%**、tertiary **56%** | 分组标题/时间戳用前景 **60% α** | 03b-sidebar.md:37（G14：`oklab(0.87 0 0 / 0.6)`）、03b:115、03b:127（微差③） | **保持不动**——03b §5 微差③已裁决记录不修（三档已过 AA，精确 60% 需新增第 4 档令牌；触发升级条件=用户反馈时间戳过重）。本条仅登记防误修 |

### 与 ZCode 一致、值得锁住的点（aligned）

| 模块 | 点 | 期望值 | 证据 |
|---|---|---|---|
| zcode-tokens.ts（composer-tool-menus 等消费） | 圆角标度映射 | `--dsw-radius-xs/sm/md/lg/xl/2xl = 2/4/6/8/12/16px`、`full=999px`（zcode-tokens.ts:504-521） | ZCode asar：`--radius-sm:.25rem / --radius-md:.375rem / --radius-lg:.5rem / --radius-xl:.75rem` = 4/6/8/12px，逐值一致；03b:30「圆角 8px」、03d C9「按钮统一 8px」 |
| composer-tool-menus.ts | @/指令建议菜单壳用 rounded-lg（8px），不继承主输入 2xl 例外 | `border-radius: var(--dsw-radius-lg)`（源码 L44 及其注释引宪章 §Menus） | 03b:30（ZCode 行圆角 8px `rounded-lg`）+ ZCode asar `.rounded-lg{border-radius:var(--radius-lg)}`、`--radius-lg:.5rem` |
| composer-tool-menus.ts | 过滤输入焦点环形态 | `outline:2px solid var(--dsw-focus-ring-color,…)`、`:focus-visible` 触发（源码 L36） | 04-open-gaps.md:1815（G2「真实 Tab → outline solid 2px」双主题实测 ✅）；offset -2px 为本仓细节，ZCode 侧未记录 |
| composer-tool-menus.ts | 焦点环色 | light `#0b7fff` / dark `#4099ff`（zcode-tokens.ts:261,487；--dcu-focus 同值 zcode-theme.ts:310,353） | ZCode asar：`#0b7fff`（`--color-terminal-blue`、内联进度条 `background:#0b7fff; transition: width 160ms ease`）、`#4099ff` 32 处（`.border-[#4099FF]` 等工具类）。注：ZCode 焦点环令牌定义未在 asar 直接命中，色值以 bundle 出现 + 映射层登记为据 |
| NewConversationSuggestions.tsx | 建议卡图标唯一中性色（四卡同色，禁高饱和多彩） | `ICON_COLOR = var(--dsw-alias-menu-icon)` = label-primary 60% α：light `rgba(38,38,38,.6)` / dark `rgba(212,212,212,.6)`（源码 L27；zcode-tokens.ts:114,345） | ZCode 60% α 手法（03b:77 G14）；tokens.json brand/彩色组仅 5 个键（蓝系 accent/brand/thought），无红绿紫橙装饰色相；旧四色 `#27aaff/#a478e8/#44bd83/#f48235`（L13-19 注释）在 ZCode UI 令牌中无对应物 |
| virtual-skip.ts | 离屏跳过手法与 ZCode 原生虚拟列表同构 | `content-visibility:auto; contain-intrinsic-size:auto 275px`（源码 L167） | ZCode asar：`[content-visibility:auto] [contain-intrinsic-size:0_420px]`（虚拟列表 leadingBoundaryRows，tailwind 任意值类）。275px 是 DSH 消息实测校准值（源码 L88-91），非 ZCode 规格，对象不同不构成差异 |
| composer-tool-menus.ts | 工具按钮最小高度 | `min-height:28px`（源码 L6） | 03d-composer.md:16「按钮高度 28px ✅ 完全相同」（活体实测）；ZCode asar `h-7`（28px）按钮类存在 |

### 无参照项（不得猜）

- 菜单壳 `z-index:1100`（composer-tool-menus.ts:15）—— ZCode radix popper 的 zIndex 是运行时变量（asar 命中 `zIndex:fe`），静态提不出值；`.z-50` 仅 1 处。跳过。
- 菜单壳 `padding:4px` 与投影 `--dcu-tip-shadow`（composer-tool-menus.ts:15）—— ZCode menu 壳内边距/阴影无实测记录（03b/03d/04 均未采）。跳过。
- 建议面板 `[data-trigger-menu]` 的定位几何：视口边距 12px、上下 16px、max-height 360px（composer-tool-menus.ts:104-107,124-128）—— ZCode @ 建议弹层未采样（03d:33 D-i「@/技能菜单弹层 未采到」）。跳过。
- shortcut-catalog.ts 的键帽串格式（`{id, keys, aria}`，消费 `aria-keyshortcuts`）—— ZCode asar 中 `aria-keyshortcuts` 仅命中 React 属性枚举（9 处）、`⌘` 字符 11 处，无格式规格；03i-command-palette.md 无 shortcut 条目。跳过。
- foreign-content-contract.ts 的峰值条语义橙 `rgb(255,152,0)` 作为「唯一语义色」保留 —— ZCode asar 中 `#ff9800` 45 处全部位于**代码语法高亮色板**（`symbolIcon.*Foreground`、TextMate scope），非 UI 语义色；「唯一语义色橙」是本仓显式裁决（源码 L18-25），无 ZCode UI 例证。跳过（不判一致也不判差异）。

### 正文说明（无差异/无对账面的模块）

- **virtual-skip.ts**：ZCode 对会话列表本就做虚拟化（asar 的 leadingBoundaryRows/content-visibility 即证据），DSH 宿主 `ChatNodeList` 全量渲染无虚拟化，本模块是对「ZCode 有而宿主没有」的能力补课，手法已对齐（见 aligned 表）。`ACTIVATE_ABOVE_UNITS=300` 与 4 层下探是性能防御参数，无 ZCode 规格；该模块的 1 处 `!important` 已入门禁预算（04-open-gaps.md:507）。08-performance-audit.md:63 明确「超长会话（1000+ 轮）滚动」**未测**——模块注释 L68 也自述未在真实超长会话验证，此为已知未验证项，非本批能闭环。
- **automation-task-settings.ts**：纯逻辑桥（事件名 `dsh-automation:open-task-settings`、sessionStorage 键、入参校验），无颜色/圆角/字号/动效决策点，无对账面。ZCode 原生有 automation 功能（asar `automations` 710 处、`automationId` 331 处），对标场景真实存在。
- **NewConversationSuggestions.tsx** 的 portal 锚点（`[data-phase=hero] [class*="_composerHero"]>:first-child>[class$="_stack"]`，L44）是 DSH 宿主结构选择器；ZCode hero 区建议卡无采样记录，网格预留高度（L66-67 注释）亦无 ZCode 规格，均不构成对账项。
