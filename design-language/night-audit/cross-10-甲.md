# 批次 10（甲）· 交叉复检：foreign-surface-discovery / PluginConfigSection / workspace-drop-indicator / document-hidden-motion-pause / DesktopNavigationControls

> 审计人：三方交叉第一方（独立取证，未读任何 batch-*.md / cross-*.md）。
> 日期：2026-10-30。
> 参照物：`/Applications/ZCode.app/Contents/Resources/app.asar`（全部经 `grep -a` 提取，命令在证据列）；
> 设计文档按模块挑用：01-design-tokens / 02-motion / 03e-header / 03n-typography / 03h-detail-sweep（通读），
> 03b-sidebar / 03f-settings / 04-open-gaps（仅 grep，未整读 04）。
> 注：workspace-drop-indicator 的视觉样式定义在同仓 `CodexWorkspaceBrowser.tsx:325-327`（grep 提取），一并对账。

## 差异项（有证据）

| # | 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|---|
| 1 | DesktopNavigationControls.tsx | 导航按钮圆角 | `border-radius:50%`（圆形，`DesktopNavigationControls.tsx:7`） | 8px（rounded-lg） | asar `grep -a -o 'function mbt({.\{0,900\}'` → 后退/前进按钮 `variant:ghost, size:icon, className:size-8 rounded-lg`；`.rounded-lg{border-radius:var(--radius-lg)}`；`--radius-lg: var(--border-radius-lg, 8px)`；03e-header.md:40「顶栏按钮 28×28 + radius 8px」。两处参照均非圆形（asar 中 `border-radius:50%` 虽有 19 处，但图标按钮无圆形档：size cva 全档 icon/icon-sm/icon-md/icon-lg 均无 rounded-full） | 圆形 → 8px 圆角；若有意保留圆形，需登记为显式调整 |
| 2 | DesktopNavigationControls.tsx | disabled 反馈 | `opacity:.35`（`DesktopNavigationControls.tsx:9`） | `opacity-50` | asar Button cva 基类（`grep -a -o '.\{700\}{variants:{variant:{default:\`bg-primary…'`）：`disabled:pointer-events-none disabled:opacity-50` | .35 → .5 |
| 3 | DesktopNavigationControls.tsx | hover 过渡 | 无 transition 声明（`DesktopNavigationControls.tsx:7-8`，底色瞬跳） | `transition-colors` | 同上 Button cva 基类原文含 `transition-colors`；02-motion.md §1 微交互动效 150ms ease-out 档 | 补 `transition:background-color 150ms`（如 hover 波刻意瞬跳则登记豁免） |
| 4 | DesktopNavigationControls.tsx | 图标颜色 | `var(--dsw-alias-label-secondary)`（60% 前景，`DesktopNavigationControls.tsx:7`） | 全前景（text-foreground） | asar ghost variant（`grep -a -o 'ghost:\`[^\`]\{20,220\}\`'`）：`text-foreground hover:bg-hover hover:text-foreground`；02-motion.md 操作行图标表「颜色=全文前景 oklch(.87)」+ 其教训段「看到更淡先查容器 opacity，不改子元素颜色」 | 改用全前景令牌 |
| 5 | DesktopNavigationControls.tsx | 箭头图标造型 | 自绘 16 网格 path `M13 8H3m0 0 4-4M3 8l4 4` / `M3 8h10m0 0-4-4m4 4-4 4`，stroke 1.5（`DesktopNavigationControls.tsx:25-27`） | lucide 24 网格 ArrowLeft/ArrowRight，默认 stroke 2 | asar：插件两条 path 精确 grep 均 0 命中；lucide path `m12 19-7-7 7-7`、`M19 12H5` 各 4 命中；lucide 包装默认 `stroke:\`currentColor\`,strokeWidth:2`（1 命中）；mbt 未覆写 strokeWidth | 换 lucide 造型或登记自绘为显式调整（stroke 1.5 与 02-motion 操作行图标档 1.5 一致，可保留并注明） |
| 6 | workspace-drop-indicator.ts + CodexWorkspaceBrowser.tsx:325 | 指示线颜色 | `color:var(--dsw-alias-state-business-primary)`（浅 `#000000` / 深 `#ffffff`，zcode-tokens.ts:122/353） | 蓝色（bg-icon-blue） | asar `grep -a -o '.\{140\}drop-indicator.\{140\}'` → `data-testid:"project-drop-indicator"` className `pointer-events-none absolute left-5 right-2 z-20 h-0.5 bg-icon-blue`；`--color-icon-blue:var(--color-terminal-bright-blue)`（1 处），后者三主题值 `#06d` / `#80beff` / `var(--color-sky-500)`，sky-500=`oklch(68.5% .169 237.323)` | 换蓝色系（先确认 DSH 侧蓝色令牌槽位），或登记为显式调整 |
| 7 | 同上（CSS `CodexWorkspaceBrowser.tsx:326-327`） | 线端形态 | `::before` 线端 pill（`border-radius:var(--dsw-radius-full)`）+ `::after` 8px 空心圆点（2px 边框 50%） | 纯 2px 直线，无圆角、无端点装饰 | 同上 asar drop-indicator className 无任何 rounded-*；无端点子元素 | 去掉圆点与 pill 端，或登记为显式调整 |
| 8 | 同上 | 组级落点反馈 | 组落点（`TARGETS` 含 `.dcu-wb-group-order-drop`，workspace-drop-indicator.ts:3）仍画同一条线（mountWorkspaceDropIndicator 只有一条 line） | 组级拖拽 = 整组 2px 蓝框高亮 | asar `grep -a -o '.\{120\}data-drop-position.\{120\}'` → `rounded-xl border-2 border-icon-blue`（`purpose-section-drop-indicator` 外层组框，`.rounded-xl{border-radius:var(--radius-xl)}`=12px） | 组级改框式反馈，或登记为 DSH 结构差异 |
| 9 | 同上 | 指示线左缘口径 | 行锚点 `left + 4px`、`width - 12px`（workspace-drop-indicator.ts:61-62） | 容器级固定 inset：`left-5`（20px）/ `right-2`（8px） | 同上 asar drop-indicator className。右缘 8px 两侧一致；左缘插件跟行走（4px）、ZCode 固定 20px，口径不同 | 结构差异属显式调整范畴，建议在代码注释写明取舍 |
| 10 | foreign-surface-discovery.ts | 字号刻度口径 | 「七档界面档 + 三档展示档」= 9/10/12/13/14/16/18/20/22/34（`SKIN_SIZES`，foreign-surface-discovery.ts:68-70） | 界面档实为 6 档：`--text-ui-xs`=14−4=10 / sm=12 / caption=13 / base=14 / lg=16 / xl=18（`--ui-font-size:14px` 派生）；展示档为 24/30/36 | asar `grep -a -o -- "--text-ui-[a-z]*:[^;}]*"` 6 个变量；`--ui-font-size:14px`；原始 `font-size:34px/22px/20px` grep 0 命中、`9px` 仅 1 处孤例；`--text-2xl:1.5rem`(24) / 3xl=30 / 4xl=36。03n-typography.md A2 也只录 sm12/base14/lg16/xl18 | 注释改述为「6 档界面档 + 放行档」；20/22/34 标注「无 ZCode 令牌依据」（对放行刻度是宽容性设计，不是错，但口径不能声称来自 ZCode） |

## 一致项

1. **document-hidden-motion-pause：JS 实现逐行同构。** asar `grep -a -o 'function R1n(e=document).\{0,320\}'` → `function R1n(e=document){let t=()=>{e.documentElement.toggleAttribute(L1n,e.visibilityState===\`hidden\`)};return t(),e.addEventListener(\`visibilitychange\`,t),()=>{e.removeEventListener(\`visibilitychange\`,t),e.documentElement.removeAttribute(L1n)}}`，与 document-hidden-motion-pause.ts:43-58 完全对应：同属性名 `data-document-hidden`（asar 2 命中）、立即同步一次、visibilitychange 监听、卸载 removeEventListener+removeAttribute。
2. **同模块 CSS 规则等价。** asar `html[data-document-hidden] *,html[data-document-hidden] :before,html[data-document-hidden] :after{transition:none!important;animation:none!important}`（grep 提取完整段）↔ zcode-theme.ts:217（`:before` 与 `*::before` 为等价写法）。
3. **圆角刻度重合。** `SKIN_RADII`（foreign-surface-discovery.ts:65）的 2/4/6/8/12/16/999 与 asar `--radius-xs:.125rem`(2px)、sm 4px、md 6px、lg 8px、xl 12px、2xl 1rem(16px) 完全重合；zcode-tokens.ts:504-521 同构。full 档：插件 `--dsw-radius-full:999px` vs asar `.rounded-full{border-radius:3.40282e38px}` —— 字面量不同但均为极限圆角，渲染等效。
4. **字号刻度六档重合。** `SKIN_SIZES` 中 10/12/13/14/16/18 与 asar `--text-ui-xs/sm/caption/base/lg/xl`（14px 基准派生）一一对应；`--ui-font-size:14px` 与 03n A1 一致。
5. **导航按钮 28×28、图标 16px。** 28×28 与 03e-header.md:40 CDP 实测「ZCode 顶栏按钮默认 28×28」一致（另一语境 asar mbt 为 32px，已列入差异 1 注明双参照）；svg 16×16 渲染尺寸与 asar `size-4`/`.size-4{width:calc(var(--spacing)*4)…}`（16px）一致。
6. **hover 底色 5% alpha 手法。** 插件 `--dsw-alias-interactive-bg-hover` = `rgba(13,13,13,0.05)`/浅、`rgba(255,255,255,0.05)`/深（zcode-tokens.ts:144/375）与 asar `--color-hover:#0d0d0d0d`（浅）/`#ffffff0d`（深）同公式（中性色 5% alpha 叠加），符合 01-design-tokens.md「中性色永远以 alpha 叠加形式存在」。
7. **focus outline 2px 同宽。** `outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px`（DesktopNavigationControls.tsx:10）与 asar `--focus-ring-outline:2px solid var(--focus-ring-color)` 同宽；颜色走 DSH 宿主令牌（#0b7fff，zcode-tokens.ts:261；ZCode 为 `light-dark(#0060df,#0df)`），符合 01-design-tokens.md「优先引用 DSH 已有语义令牌」约定，非差异。
8. **拖拽指示线四点一致。** aria-hidden=true（workspace-drop-indicator.ts:70 ↔ asar `"aria-hidden":\`true\``）；pointer-events:none（CodexWorkspaceBrowser.tsx:325 ↔ asar 类名 `pointer-events-none`）；线高 2px（`::before height:2px` ↔ asar `.h-0\.5{height:calc(var(--spacing)*.5)}`=2px）；右缘缩进 8px（`width - 12` 的右侧余量 ↔ asar `right-2`）。
9. **display:contents 与 data-slot 手法同形。** 槽位委托容器 `<div data-slot={name} style={{display:'contents'}}>`（PluginConfigSection.tsx:113）：`.contents{display:contents}` 在 asar Tailwind 工具类中存在（3 命中）；`data-slot` 命名与 ZCode shadcn 组件内部标记（`"data-slot":\`button\`/\`badge\`…`）同形。用途不同（ZCode 为部件标记、插件为槽位锚点），不计差异。

## 无参照项（不得猜）

- **DesktopNavigationControls 的 Windows 标题栏定位体系**（`html[data-windows-titlebar]`、`--dsh-windows-titlebar-height:40px`、`--dsh-windows-menu-start:84px`、`[data-fullscreen]` 隐藏、`left:12px`、`z-index:30`）—— 无 ZCode 例证，跳过。搜过：`data-windows-titlebar`（0）、`menu-start`（0）、`data-fullscreen`（0）、`titlebar`（命中均为 VSCode 式 `titleBar-activeBackground` 等颜色令牌与 webview 环境）、`app-region`（有 46 处 no-drag，但 ZCode 用 Tailwind 任意属性 `[app-region:no-drag]`，无 12px/84px 定位常量可对）。
- **foreign-surface-discovery 的基线与抽样常量**（基线取样 `.dcu-wb-session-title-text`/`.dcu-root`、`SAMPLE_PER_PREFIX=4`、`SCAN_BUDGET_MS=8`、`REPORT_DELAY_MS=400`）—— 无 ZCode 例证，跳过。搜过：asar 无 getComputedStyle 抽样/分帧扫描对应物；`KNOWN_FOREIGN_ROOTS` 各前缀为 DSH 宿主哈希类名，与 ZCode 无关。
- **PluginConfigSection 的 7 个槽位名与快照协议**（`plugins.item`/`plugins.bundle.activation`/`plugins.bundle.config`/`plugins.row.config`/`plugins.detail.actions`/`plugins.detail.badge`/`plugins.detail.section`、`getVersion`/`subscribe`）—— 无 ZCode 例证，跳过。搜过：7 个名字逐个 grep asar，6 个 0 命中；`plugins.item` 4 次命中实为 `nn.plugins.items` 属性访问；`data-slot` 上下文均为 shadcn 部件标记非渲染槽委托。
- **workspace-drop-indicator 的中心线几何常量**（upper/lower 缺省 ±4px 推算、`-0.5px` 容差、`[data-open=false]` 折叠过滤）—— 无 ZCode 例证，跳过。搜过：asar drop-indicator 上下文仅 `left-5 right-2 h-0.5 bg-icon-blue` 与 `data-drop-position=before/after`，无 4px/12px/0.5px 数值对应。
- **document-hidden-motion-pause.ts 注释引用的原始行号**（「ZCode packages/ui/src/styles.css:84-86」，document-hidden-motion-pause.ts:4）—— asar 为压缩 bundle，规则本体已核验存在但原始源码行号不可核验，标**未验证**。
