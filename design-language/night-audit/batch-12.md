# 批次 12 · conversation-header.ts / ConnectorsSection.tsx / startup-splash.ts / turn-rail-dedupe.ts / SettingsDocumentAction.tsx

> 2026-10-30 夜间审计（批次 12，只读，不改 src/tests/既有文档）。
> 参照文档：`03e-header.md`（顶栏主参照）、`03p-startup.md`（启动层主参照）、`03f-settings.md`（设置页）、`03b-sidebar.md`（侧栏色阶语境）、`03n-typography.md`（标题字重口径）、`01-design-tokens.md`（背景/边框/表面令牌）、`02-motion.md`（动效档）；`04-open-gaps.md` 仅按关键词 grep（HD2 裁决 `:688-692`、HD5 断言 `:714`、DS4 收口 `:2010`、radius 语义 `:916`）。
> 本批 asar 提取命令（均本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -c 'startup-logo-pop' $A` → **2**；`grep -a -o 'startup-logo-pop[^"]\{0,80\}' $A` → `startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;`（03p 表格的 A 级证据复核通过）
> - `grep -a -o -E 'focus-visible\{outline[^}]{0,70}' $A` → `focus-visible{outline:2px solid var(--ring);outline-offset:-2px`（另 3 条为 tw-outline-style 变体）
> 本轮其余关键实跑（非 asar）：
> - `grep -rn -- '--dcu-motion-move-duration' uiplug/src/client/*.ts` → 令牌定义在 `zcode-theme.ts:137`：`--dcu-motion-move-duration:200ms;--dcu-motion-move-ease:cubic-bezier(0,0,.2,1)`（与 02-motion §2026-10-29 校正「侧栏开合 200ms ease-out」一致）
> - `grep -n 'sidebar-secondary\|sidebar-tertiary' uiplug/src/client/zcode-theme.ts` → 浅 `color-mix(in oklab,#404040 85%/75%,transparent)`（:277-278）、深 `color-mix(in oklab,#d4d4d4 68%/56%,transparent)`（:333-334）
> - `grep -rn 'h2{' uiplug/src/client/*.ts`（排除 ConnectorsSection）→ 全仓库仅 2 处，均不覆盖 `.dcu-connectors`：`conversation-layout.ts:284`（会话区）、`settings-page-styles.ts:96`（设置分组）
> - `grep -n 'P0-3\|iframe\|连接器\|connectors' design-language/04-open-gaps.md` → **0 命中**；`grep -rln 'P0-3' --include='*.md' uiplug/` → **0 命中**；`uiplug/docs/KNOWN-ISSUES.md` `## 8`（:369-395）实为「发送键配色令牌作用域」问题，并非 ConnectorsSection.tsx:37 注释所称「该 iframe CSS 对宿主令牌引用 0 处」的登记（主题同源——var() 作用域失效，但内容不是 iframe 统计）
> - `grep -n '去重\|dedupe\|stale' design-language/03-turn-navigator.md` → **0 命中**

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| conversation-header.ts | 标题旁插件自绘按钮的尺寸/圆角 | folder 16×20、more 20×20、`border-radius:var(--dsw-radius-sm)`（`conversation-header.ts:57-59`）；HD5 的三条 28×28 规则（`:96-108`）选择器只命中宿主 `ST7X_W_` 类按钮，自绘两个不在其列 | 标题组图标按钮 **28×28 / radius 8px**（「首个是 28×28 的圆角按钮（radius 8px）」「『更多』按钮 28×28」；H11 规律「ZCode 顶栏按钮默认 28×28 + radius 8px」） | `03e-header.md:27-29,40`；源码行如上。源码/04-open-gaps 均无这两钮尺寸的裁决记录（`04-open-gaps.md:697` 的 16×20 指当时宿主按钮，非此二钮） | 评估把两个自绘按钮提到 28×28 + `var(--dsw-radius-lg)`（同 HD5 口径）；若刻意保持小型，在源码注释写明理由（当前无任何尺寸决策记录） |
| ConnectorsSection.tsx | 连接器面板 h2 字重 | `.dcu-connectors h2{margin:0;font-size:var(--dsw-font-size-xl)}`（`ConnectorsSection.tsx:25`）**无 font-weight 声明** → UA 默认 bold(700)；全仓库无兜底规则（本轮 grep 实证仅 2 处 h2 规则，作用域均不含 .dcu-connectors） | 标题一律 **600**（03n A6 h1 600、A7 h2 16px/600）；插件自身设置页标题也是 600（`settings-page-styles.ts:89` h1 xl/600 + letter-spacing -.2px + line-height 26px；`:96` h2 600） | `03n-typography.md:15-16`；源码行如上 | 给该 h2 补 `font-weight:600`；顺带对照 `settings-page-styles.ts:89` 评估 line-height 26px / letter-spacing -.2px 是否同款 |
| ConnectorsSection.tsx | iframe 注入主题的灰阶与侧栏色阶漂移 | 暗色 `--text-2:#8f8f8f`、`--muted:#888888`；浅色 `--text-2:#5c5c5c`、`--muted:#686868`（`ConnectorsSection.tsx:44-45`）。注释裁决依据是旧侧栏暗色档「#828282」（`:42`） | 侧栏色阶现值已是 alpha 形式：深 `color-mix(in oklab,#d4d4d4 68%/56%,transparent)`、浅 `color-mix(in oklab,#404040 85%/75%,transparent)`——注释写作时对照的写死值已不存在 | `zcode-theme.ts:277-278,333-334`；`ConnectorsSection.tsx:38-45`；G14 判定表（`03b-sidebar.md:80-82`）要求侧栏色阶走 alpha。**未验证**：oklab color-mix 的复合色无法静态算出，iframe 字面值与现侧栏复合值是否相等需活页面对比 | 活宿主实测（iframe 内 `getComputedStyle().color` vs 宿主侧栏次级文本）后重对齐字面值，或更新注释对照基线；同时该偏离的登记处只有源码注释——04-open-gaps、design-language、uiplug/docs 均 grep 0 命中，建议补登记（另：注释引用的「KNOWN-ISSUES 第 8 条」实际内容不符，见引言） |
| conversation-header.ts | 顶栏左右内边距 24px vs ZCode 8px（已裁决偏离，登记不同步） | `padding-left/right:24px`（`conversation-header.ts:24,26`） | `padding:8px` 四边均匀 | `03e-header.md:49`（H4 表）；裁决记录在 `04-open-gaps.md:688-692`（「注入试验：改对称 24px 后页签右距 266→262，无布局冲突、无水平溢出，故采用 24px」）、`:667`、`:750`（HD2 对称 24 ✅） | 不回改值（已有注入试验裁决）；把终值 24px 与理由同步登记进 `03e-header.md` H4 行——03e 现仍只写 ZCode 8px，单读 03e 会误判为未对齐 |
| conversation-header.ts | 标题装饰按钮 hover 底 fallback | `var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))`（`conversation-header.ts:60`），fallback 8% 白 | 表面 hover = **10% 白**（`#ffffff1a`）；侧栏 hover 底实测同为 `rgba(255,255,255,.1)` | `01-design-tokens.md:26`；`03b-sidebar.md:116`。**未验证**：DSH 宿主是否定义 `--dsw-alias-interactive-bg-hover`（若已定义则 fallback 永不生效） | 低优先。核验宿主令牌存在性；若依赖 fallback 则把 .08 改 .1 对齐 |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| startup-splash.ts | pop 入场动画逐值 | `animation:dcu-startup-logo-pop 0.72s cubic-bezier(0.22,1,0.36,1) forwards`（`:34`）；关键帧 `0%{opacity:0;scale(.72)}38%{1;1.045}58%{.985}76%{1.008}100%{1;1}`（`:39`） | `03p-startup.md:12`；asar 本轮实跑 `grep -a -o 'startup-logo-pop[^"]\{0,80\}'` → 原文一致 |
| startup-splash.ts | 徽标壳几何与外观 | 96×96、radius 24px、`linear-gradient(180deg,#000000,#151718)`、阴影 `0 20px 25px -5px rgb(0 0 0/.2),0 8px 10px -6px rgb(0 0 0/.2)`、`::before` 1px rgba(255,255,255,0.1)（`:34,36`） | `03p-startup.md:11`（壳规格表）+ `:50`（V-4 边框复刻） |
| startup-splash.ts | 门控三值与遮罩形态 | `HARD_CAP_MS=3000`/`FADE_OUT_MS=160`/`REMOVE_DELAY_MS=500`（`:22-26`）；`z-index:2147483647` + `transition:opacity 0.16s ease`（`:29`）；reduced-motion 跳过动画（`:40,91`） | `03p-startup.md:10,13-14`（遮罩/z-index/0.16s/500ms/3s 硬上限/reduced-motion） |
| conversation-header.ts | HD1 底部分隔线 | `border-bottom:1px solid rgba(13,13,13,.05)` 浅 / `rgba(255,255,255,.05)` 深（`:24,26,30-33`） | `03e-header.md:61`（HD1 判定表「1px solid 白 5% alpha（深色）/ 黑 5%（浅色）」） |
| conversation-header.ts | HD3 页签字号字重 | `font-size:var(--dsw-font-size-base)`（=14px）+ `font-weight:600`（`:69`） | `03e-header.md:28,63`（ZCode 顶栏标题实测 14px/600）；`--dsw-font-size-base=14px` 见 `conversation-header.ts:67` 注释 |
| conversation-header.ts | HD5 顶栏图标按钮 | 三条结构化规则 `width/height/min-width/min-height` 全 28px、`padding:0`、`border-radius:var(--dsw-radius-lg)`（`:100-108`）；且排除页签与文字按钮（`:not([role=tab])` + `:has(>svg):not(:has(>:not(svg)))`） | `03e-header.md:40,55`（28×28/8px）；`04-open-gaps.md:714`（断言原文逐字）；`--dsw-radius-lg=8px`（`04-open-gaps.md:916`） |
| conversation-header.ts | 键盘焦点环 | `outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px`（`:56`） | asar 本轮实跑 `grep -a -o -E 'focus-visible\{outline[^}]{0,70}'` → `focus-visible{outline:2px solid var(--ring);outline-offset:-2px`（2px + offset -2px 同构）；`--dsw-focus-ring-color`=brand #0b7fff（`07-delivery-ledger.md:55`） |
| ConnectorsSection.tsx | iframe 暗色主题四槽 | `--bg:#161616`、`--card:#2b2b2b`、`--line:rgba(255,255,255,.1)`、`--text:#d4d4d4`（`:45`） | `01-design-tokens.md:19-21`（背景 #161616、卡片/浮层 #2b2b2b、边框白 10%、前景 oklch(87%)≈212=#d4d4d4） |
| ConnectorsSection.tsx | 连接器容器圆角 | `.dcu-connector-frame`/`.dcu-connector-list` 均 `border-radius:var(--dsw-radius-xl)`（`:25`） | ZCode 设置卡片圆角 12px（`03f-settings.md:65` S2c）；`--dsw-radius-xl=12px`（`04-open-gaps.md:916`） |
| conversation-header.ts | 自绘按钮 aria-label 收口 | folder=「打开所在项目」、more=「更多操作」（`:157`） | `03h-detail-sweep.md:107-119`（DS4 修复）；`04-open-gaps.md:2010`（可见无标签按钮 = 0 ✅ 收口） |

## 无参照项（不得猜）

- conversation-header.ts 页签带/滑块全套数值（28px 控件带 `:41`、tab 高 26px + line-height 20px + padding 3px `:52`、滑块 26px + `color-mix(in srgb,var(--dsw-alias-button-info-fill) 18%,transparent)` + move 档 200ms 动效 `:46`）—— ZCode 无页签结构，`03e-header.md:93` 明确「H7/H8 属 DSH 独有结构，没有对照物，只能按 DSH 自身设计语言评判」；滑块激活色 18% 同样无 ZCode 例证，跳过。
- conversation-header.ts:143 `emit()` 锚点 `left = box.right + 8`（弹出层水平偏移 8px）—— ZCode 弹出层锚定只有轮次导航场景记录（`02-motion.md` §5「浮层顶对齐刻度、右侧展开、320px」），标题菜单/项目提示的锚定偏移未采集，跳过。
- startup-splash.ts:38 徽标内图标 `border-radius:12px` —— 56×56 尺寸有据（03p V-1，官方 app icon @2x），但 ZCode 徽标内是 SVG path 标志（03p:54-55）无圆角可引，12px 无 ZCode 参照，跳过。
- turn-rail-dedupe.ts 全模块 —— 纯行为决策（同 id 索引栏保留文档顺序第一条 `:29-35`、rAF 合并 MutationObserver `:42-51`）；ZCode 单皮肤无重复索引栏问题，`03-turn-navigator.md` grep「去重|dedupe|stale」0 命中（本轮实跑），无颜色/圆角/动效决策点，跳过。
- SettingsDocumentAction.tsx 行为组（aria-busy + disabled 防重入 `:36`、role=alert `:21,35`）—— 本文件无颜色/字号/圆角/动效决策（视觉值在 `settings-page-styles.ts:115-133`，按钮 min-height:32px/radius-lg/fs-caption 属其他批次模块）；「打开配置文件」功能 ZCode 无对应物（03f 未记录该功能）；其 h2 经 `.dcu-settings-general-group h2` = 14px/600（`settings-page-styles.ts:96`），ZCode 设置页分组标签字号未采集（03f S1b ❓），跳过。
