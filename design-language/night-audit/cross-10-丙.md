# 批次 10 · foreign-surface-discovery.ts / PluginConfigSection.tsx / workspace-drop-indicator.ts / document-hidden-motion-pause.ts / DesktopNavigationControls.tsx（三方交叉 · 丙）

> 独立复检，未读任何 batch-*.md / cross-*.md。
> 参照文档：`01-design-tokens.md`、`02-motion.md`、`03n-typography.md`、`03e-header.md`（均整读）；`04-open-gaps.md` 未整读、未引用。
> asar 取证：2026-10-30，对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）执行 `grep -ao` 与 python `re` 检索（theme 归属用最近前驱 `theme-zai-light`/`theme-zai-dark` 标记判定）。本仓令牌源 `src/client/zcode-tokens.ts`、`zcode-theme.ts` 作为本仓值出处引用。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| DesktopNavigationControls | 导航钮圆角 | `border-radius:50%`（正圆） | 导航钮用 Button `size:icon-md` = `size-7 rounded-lg` = 28×28 + **8px** | 本仓 `DesktopNavigationControls.tsx:7`；asar Button size 表提取原文 `"icon-md":\`size-7 rounded-lg [&_svg:not([class*='size-'])]:size-4\`` | 50% → 8px（`--dsw-radius-lg`） |
| DesktopNavigationControls | disabled 态 | `opacity:.35` + `cursor:default` | Button base `disabled:pointer-events-none disabled:opacity-50`；`disabled:opacity-50` ×37 处为主导档 | 本仓 `DesktopNavigationControls.tsx:9`；asar Button cva base 原文 `…transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50…` | opacity .35→.50，补 `pointer-events:none` |
| DesktopNavigationControls | 静息/hover 文字色 | `color:var(--dsw-alias-label-secondary)`（60% 前景），hover 不提色 | ghost 变体 `text-foreground hover:bg-hover hover:text-foreground`（全前景） | 本仓 `DesktopNavigationControls.tsx:7-8`；asar ghost 变体原文 `ghost:\`border-transparent bg-transparent text-foreground hover:bg-hover hover:text-foreground…\`` | 改全前景（label-primary） |
| DesktopNavigationControls | hover 过渡 | 无任何 `transition` 声明 | Button base 带 `transition-colors`；微互动档 150ms ease-out 且必须含 `background-color` | 本仓 `DesktopNavigationControls.tsx:7`（整串无 transition）；asar base 串同上；`02-motion.md:9-10` | 补 `transition:background-color 150ms cubic-bezier(0,0,.2,1)` |
| DesktopNavigationControls | focus 环颜色 | `--dsw-focus-ring-color`/`--dcu-focus` = `#0b7fff`（亮）/`#4099ff`（暗），映射注释声称源为 ZCode `--color-icon-blue` | `--color-icon-blue:var(--color-terminal-bright-blue)`；theme-zai-light `--color-terminal-bright-blue:#06d`（=#0066dd），theme-zai-dark `#80beff`。两档都不等于 #0b7fff/#4099ff | 本仓 `zcode-tokens.ts:261`（注释「ZCode: --color-icon-blue（focus 环）」）、`zcode-theme.ts:310`/`:353`；asar（python 按 theme 块归属）：`--color-icon-blue:`、`--color-terminal-bright-blue:` 逐值 | 修正映射源/值（亮 #06d、暗 #80beff），或在文档登记换档理由 |
| DesktopNavigationControls | focus 环形态 | `outline:2px solid …;outline-offset:-2px` | 焦点惯例是 `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring`；Button base 为 `outline-none`（ghost 变体无独立 focus-visible） | 本仓 `DesktopNavigationControls.tsx:10`；asar tabs-trigger 原文 `…focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50…` | 改 ring 形态，或按 DSH 约束显式登记差异 |
| DesktopNavigationControls | 箭头图标字形 | 自绘 16 视箱 path `M13 8H3m0 0 4-4M3 8l4 4`，`strokeWidth=1.5` | lucide ArrowLeft/ArrowRight：`M19 12H5` + `m12 19-7-7 7-7`（24 视箱），icon 处 `className:\`h-4 w-4\`` 未覆盖 strokeWidth（lucide 默认 2） | 本仓 `DesktopNavigationControls.tsx:25-27`；asar：`M13 8H3` 0 命中、`M3 8h10` 0 命中、`M19 12H5` ×4、`m12 19-7-7 7-7` ×4、`strokeWidth:"2"`×6 + ``strokeWidth:`2` ``×6 | 换 lucide path/线宽（16px 渲染尺寸已一致，见一致项 4） |
| workspace-drop-indicator（样式在 CodexWorkspaceBrowser） | 落点指示线颜色与形态 | `color:var(--dsw-alias-state-business-primary)`（亮黑/暗白中性）+ 2px 胶囊线（`border-radius:var(--dsw-radius-full)`）+ 8px 空心圆点；内缩 left+4 / width−12 | `data-testid:project-drop-indicator`：`h-0.5`（2px）**纯直线**、无圆点无圆角、`bg-icon-blue`（焦点蓝），`left-5 right-2`（左20/右8），`top-0 -translate-y-1/2` 骑线居中 | 本仓 `CodexWorkspaceBrowser.tsx:325-327`、`workspace-drop-indicator.ts:57-63`；asar 原文 `…\`project-drop-indicator\`,\`data-drop-position\`:E,className:\`pointer-events-none absolute left-5 right-2 z-20 h-0.5 bg-icon-blue ${E===\`before\`?\`top-0 -translate-y-1/2\`:…` | 颜色换 focus-ring 系蓝、去圆点改直线（或在 03b/06 登记差异理由） |
| foreign-surface-discovery | 字号白名单展示档 | SKIN_SIZES 含 20/22/34px（DSH 例外登记值） | ZCode 页面标题档是 `--text-ui-settings-title:calc(var(--ui-font-size) + 10px)`（=24px）与 `--text-ui-settings-title-lg:…+16px`（=30px）；无 20/22/34 档 | 本仓 `foreign-surface-discovery.ts:68-70`、`zcode-tokens.ts:551-553`；asar text-ui 变量逐条提取（见一致项 6） | 白名单补 24/30px；复核 20/22/34 的「例外登记」是否应向 ZCode 的 24/30 靠拢 |
| foreign-surface-discovery | full 圆角数值 | `999px`（SKIN_RADII 集合与 `--dsw-radius-full` 同值） | `--radius-full: 9999px` | 本仓 `foreign-surface-discovery.ts:65`、`zcode-tokens.ts:521`；asar 提取 `--radius-full: 9999px` | 统一为 9999px（CSS clamp 下视觉等效，但哨兵按 computed 字符串比对，9999px 不在集合内） |
| foreign-surface-discovery | 半径白名单缺 24px 档 | SKIN_RADII = {0,2,4,6,8,12,16,999px,50%}，无 24px | ZCode 有 `--radius-3xl:1.5rem`（24px），`rounded-3xl` 在 asar 出现 5 次 | 本仓 `foreign-surface-discovery.ts:65`；asar `--radius-3xl:1.5rem` + `grep -ao rounded-3xl` 计数 5 | 白名单补 `24px` |

## 一致项（有证据）

| 模块 | 项 | 一致口径 | 证据来源 |
|---|---|---|---|
| document-hidden-motion-pause | 隐藏暂停机制整段移植 | JS：`toggleAttribute('data-document-hidden', visibilityState==='hidden')` + `visibilitychange` 监听 + 卸载时 `removeAttribute`；CSS：`html[data-document-hidden] *,:before,:after{transition:none!important;animation:none!important}` | asar 提取 JS 原文 `var L1n=\`data-document-hidden\`;function R1n(e=document){…}` 与 CSS 原文；本仓 `document-hidden-motion-pause.ts:46-57`、`zcode-theme.ts:217` —— 逐语句一致 |
| DesktopNavigationControls | 按钮尺寸 28×28 | `width:28px;height:28px` ↔ `icon-md:size-7`（28px） | 本仓 `DesktopNavigationControls.tsx:7`；asar size 表原文（差异项 1 同源） |
| DesktopNavigationControls | hover 背景 = 5% alpha 交互底 | `--dsw-alias-interactive-bg-hover` ↔ ZCode `--color-hover` 亮 `#0d0d0d0d` / 暗 `#ffffff0d`（= 5% alpha 叠加，非写死灰值） | 本仓 `DesktopNavigationControls.tsx:8`、`zcode-tokens.ts:144/:375`；asar（python 按 theme 归属）`--color-hover:` 亮 `#0d0d0d0d` 暗 `#ffffff0d`；`01-design-tokens.md:10` 的 alpha 叠加手法 |
| DesktopNavigationControls | 图标渲染尺寸 16×16 | svg `width=16 height=16` ↔ `icon-md` 的 `[&_svg:not([class*='size-'])]:size-4`（16px），且 A8 用法显式 `h-4 w-4` | 本仓 `DesktopNavigationControls.tsx:25`；asar size 表 + `A8` 组件原文（icon `h-4 w-4`） |
| DesktopNavigationControls | 双钮间距 8px | `gap:8px` ↔ ZCode 导航工具条 `flex items-center h-12 px-3 gap-2`（gap-2=8px） | 本仓 `DesktopNavigationControls.tsx:6`；asar `dMn` 组件原文 |
| foreign-surface-discovery | 界面字号七档 9/10/12/13/14/16/18 | SKIN_SIZES 前七档逐值一致：`--text-ui-2xs:base−5`、`xs:base−4`、`sm:base−2`、`caption:base−1`、`base:14px`、`lg:base+2`、`xl:base+4` | 本仓 `foreign-surface-discovery.ts:68-70`；asar text-ui 变量逐条原文 + `--ui-font-size:14px`；`03n-typography.md` A1/A2 双源印证 |
| foreign-surface-discovery | 圆角标度 2/4/6/8/12/16 | SKIN_RADII 六档逐值一致：`--radius-xs:.125rem`、`sm:.25rem`、`md:.375rem`、`lg:.5rem`、`xl:.75rem`、`2xl:1rem` | 本仓 `foreign-surface-discovery.ts:65`；asar radius 变量逐条原文；`zcode-tokens.ts:504-508` 同口径 |
| PluginConfigSection | 错误边界 + `display:contents` 包裹 | `SlotEntryBoundary` 用 `getDerivedStateFromError`（单卡崩溃不拆整页）；槽位包裹层 `display:'contents'` —— 两种模式在 ZCode bundle 均有在用 | 本仓 `PluginConfigSection.tsx:43-47`、`:113`；asar `getDerivedStateFromError` ×36、`display:contents` ×5 |
| DesktopNavigationControls | aria-label = 可见提示文案 | 按钮 `aria-label` 与 `title` 同文案 ↔ A8：`title` 交给 Tooltip（`Dv`），按钮本体 `"aria-label":i` 同值 | 本仓 `DesktopNavigationControls.tsx:22-24`；asar A8 组件原文 |
| DesktopNavigationControls | 标题栏控件 `-webkit-app-region:no-drag` | 仓库导航钮声明 no-drag；ZCode bundle 同样大量使用（×46） | 本仓 `DesktopNavigationControls.tsx:6-7`；asar `grep -ao 'app-region:no-drag'` 计数 46 |

## 无参照项（不得猜）

- `--dsh-windows-titlebar-height:40px` 定位基准、`fixed;left:12px;z-index:30` 标题栏挂位 —— DSH 标题栏集成参数，无 ZCode 对应令牌。搜过：asar `titleBar`（命中均为 VS Code 主题 JSON 与菜单字符串）、`titleBar-height`、`fixed` 组合未构成可比锚点。
- `--dsh-windows-menu-start:84px`（`DesktopNavigationControls.tsx:11`）—— 菜单起点让位值。搜过：asar `windows-menu-start` 0 命中、`menu-start` 无对应语义命中。
- 扫描预算 `SCAN_BUDGET_MS=8`、每前缀抽样 `SAMPLE_PER_PREFIX=4`（`foreign-surface-discovery.ts:76/:85`）—— 工程性能预算，非设计令牌；`02-motion.md:28` 的「8ms/帧」是 ZCode 滚动区实测成本记录，不是 ZCode 的预算规定。搜过：asar `SCAN_BUDGET|scanBudget|frameBudget` 0 命中、`budgetMs` ×2（非扫描语义）。
- 外来表面发现/分级哨兵（`KNOWN_FOREIGN_ROOTS`、漂移告警）—— ZCode 本体即宿主，无「第三方皮肤收敛哨兵」对应物。搜过：asar `foreignSurface|foreign-surface|KNOWN_FOREIGN|ForeignDrift` 0 命中。
- 插件槽位转发协议（`FORWARDED_CONFIG_SLOTS`、`renderSlot` 注入、inject face 绑定）—— ZCode 存在 `settings.plugins.*` 文案（`check`/`config.clear`/`config.hide`/`config.required`/`config.restore`/`config.save` 等）证明其有插件配置页，但插槽 API 形态无可比照物。搜过：asar `renderSlot` 0 命中、`settings.plugins` 命中见上、`dropIndicator|drop-after|dcu-wb` 0 命中（顺带证本仓类名空间不与 ZCode 冲突）。
