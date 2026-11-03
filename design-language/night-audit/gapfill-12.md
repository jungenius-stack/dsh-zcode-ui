# Gapfill 12 · 批次 12 五条无参照项二挖

> 2026-10-30 补采（批次 12 跳过项逐条再挖，只读；只新建本文件）。
> 工具口径：`A=/Applications/ZCode.app/Contents/Resources/app.asar`，`grep -a`（本机实为 ugrep，长上下文需 `LC_ALL=C`；`.{0,55}` 类长量词在部分位置会触发 ugrep 复杂度上限，改用固定字面量或缩短窗口）。
> 每条格式：条目 → 搜过的模式清单 → 命中原文（或确认无命中）→ 最终判定。

---

## 条目 1 · conversation-header 页签带/滑块全套数值（28px 带 :41、tab 26px/lh20/pad3px :52、滑块 26px + info-fill 18% + 200ms :46）

**搜过的模式**（全部本轮实跑）：
`role[=:"]{1,3}tab(list)?`、`aria-selected`、`data-state[=:"]+active`、`TabsList|SegmentedControl|SegmentGroup`、`TabsList.{0,300}`、`data-\[state=active\]`、`state=active`（±60/80 字节窗口）、`aria-selected`（±50/100）、`--color-selected:`、`bg-selected`、`SegmentedControl.{300}`（tr 删换行后）、`TabsTrigger.{0,250}`、`TabsIndicator`、`tab-slider`、`jsx\((TabsList|Tabs|TabsTrigger)\b`、`createTabsScope`、`color-mix\(in [a-z]+,…N%`（全量普查）、`18%`（±70/40）、`height:26px`（±60）、`line-height:20px`、`h-\[26px\]`、`h-\[28px\]`、`text-ui-sm`、`--radius-md:`、`rounded-md`、`size-14`、`dsw-radius-md`（uiplug 侧）。

**命中原文**：
1. `role:"tablist"` 16 处 / `role="tab"` 59 处 / `aria-selected` 54 处——逐个看上下文，全部不属于主 UI 页签带：
   - 内嵌 DevTools 前端：`{id:"tabstrip",className:"tabstrip",role:"tablist"}` + `className:"tab"+(H.selected?" active":"")`；`className:"tabbed-pane-tab-strip",role:"tablist"` + `tabbed-pane-tab-element/tab-label`；
   - 内嵌工作簿查看器：`function SegmentedControl({items,onValueChange,palette,value})` → `"aria-label":"Workbook sheets",role:"tablist",style:{…backgroundColor:palette.sheetInactiveSurface,border:1px solid ${palette.strongBorder},borderRadius:10,…}`；
   - 问题/输出面板组件（`{label:g.title,count:g.count,errorCount:g.errorCount}`，default/select 两态）。
2. Radix Tabs 库**只导出未使用**：`TabsList: React.ForwardRefExoticComponent…、TabsTrigger…、createTabsScope }` 是导出清单；`jsx(TabsList|Tabs|TabsTrigger` 0 命中。
3. ZCode 激活底口径：`data-active\:\!bg-selected:where([data-state=active])…{background-color:var(--color-selected)…}`；`--color-selected` 值：深 `#ffffff1a`（白 10%），浅 `#0a0a0a1a` / `#0d0d0d0d` / `color-mix(in oklab,var(--color-neutral-950) 10%,transparent)`。
4. **18% 全包唯一命中 = 用量热力图色阶**：`--color-usage-heatmap-1:color-mix(in srgb, oklch(68.5% .169 237.323) 18%, color-mix(in oklab,var(--color-neutral-950) 3%,transparent))`，@supports 分支 `--color-usage-heatmap-1:color-mix(in oklab,var(--color-sky-500) 18%,var(--color-surface))`；深色档 24%/42%。color-mix 百分比普查：10%(×7)、30%(×5)、24%(×5)、6%(×4)…无 18% 中性档。
5. **26px + radius-md 弱例证**（ZCode 主 UI 唯一 26px 行级控件）：`var iln=\`wf-line wf-arrive -mx-1.5 flex h-[26px] min-w-0 items-center gap-2 rounded-md bg-transparent px-1.5 text-left text-ui-sm outline-none\`;function aln({artifact,…,testId:i=\`workflow-artifact-line\`…})`；`--radius-md:.375rem`（=6px），插件侧 `'--dsw-radius-md':'6px'`（`zcode-tokens.ts:506`）。
6. 插件滑块底色的实参核对：`'--dsw-alias-button-info-fill':'#000000'`（浅，`zcode-tokens.ts:136`）/'#ffffff'（深，`:367`）——该别名映射的是 ZCode **前景色**，故滑块 18% = 前景色 18% alpha，非品牌蓝。

**最终判定**：**部分升级**。① 页签带结构（带边框的 tablist 容器 + 内嵌滑块）维持「无对照物」，03e:93 判断经全量枚举 role=tablist 后仍然成立（命中全部来自 DevTools / Playwright traceViewer / 工作簿查看器 / 问题面板，均非主 UI 设计语言）；② 滑块单项拿到两条新参照——「26px 高 + radius-md 6px」与 ZCode 工作流 artifact 行（`h-[26px] rounded-md px-1.5`）同组合；「激活底」在 ZCode 有明确口径 `--color-selected`（中性 10% alpha），插件 18% 偏重 80%（可作偏离登记：要么对齐 10%，要么注记刻意加强）；18% 字面值在 ZCode 仅 heatmap 蓝档（色相不同），无中性 18% 例证；③ 200ms move 档已有参照（batch-12 引言 zcode-theme.ts:137 ↔ 02-motion 200ms 校正），不重复。

---

## 条目 2 · conversation-header.ts:143 emit() 锚点 left = box.right + 8（弹出层水平偏移 8px）

**搜过的模式**：
`(mainAxis|crossAxis)[:=][0-9]{1,3}`、`offset\(\{[^}]{0,80}\}`、`offset\(\(?[0-9]`、`sideOffset[=:][0-9]{1,3}`、`alignOffset[=:][0-9]`、`getBoundingClientRect\(\)\.right\+?[0-9]{0,2}` 及其 ±100 窗口、`\.right \+ 8|\.right\+8`、`sideOffset:8` ±250/150 窗口、`Bze=`、`v4-turn-navigator[a-z-]{0,30}`、设计文档侧 `03k-context-menu.md / 03i-command-palette.md / 03j-dialog.md / 03b-sidebar.md` grep `偏移|offset`。

**命中原文**：
1. `sideOffset` 档位普查：4(×24)、6(×12)、2(×3)、**8(×2)**、0(×1)；`crossAxis:0`(×16)、`mainAxis:0`(×4)、`mainAxis:5`(×2，`offset({alignmentAxis:4,mainAxis:5})` + `flip({fallbackPlacements:["left-start"]})` + `shift({padding:10})`，right-start 菜单)。
2. **8px 两处的身份**：
   - **轮次导航 tooltip**：`(0,$.jsx)(Uw,{align:\`start\`,side:\`right\`,sideOffset:8,"data-testid":Sb(Bze,n.key),className:\`w-80 max-w-[calc(100vw-2rem)] border border-popover-border bg-popover p-3 text-popover-foreground shadow-lg\``，且 `Bze=\`v4-turn-navigator-tooltip\``（`v4-turn-navigator-tooltip` testid 全包仅 1 处）。side:right + sideOffset:8 的 Radix 语义 = 浮层贴锚点右侧、水平间距 8px——与插件 `left = box.right + 8` **数值与方向完全一致**；`w-80`=320px 正是 02-motion §5 已记录的「右侧展开、320px」，本轮补齐其缺采的水平偏移 8px。
   - 编辑器选区工具条：`{role:\`toolbar\`,…,side:\`top\`,align:\`center\`,sideOffset:8,collisionBoundary:n,collisionPadding:8,sticky:\`partial\`…}`（垂直 8px，佐证 8 是 ZCode 浮层-锚点间距档位之一）。
3. 文档侧：02-motion.md:44 只有轮次导航浮层「顶对齐刻度、右侧展开、320px」；03k/03i/03j/03b grep `偏移|offset` 无浮层偏移记录（仅 03f 表格无关命中）。
4. `getBoundingClientRect().right` 7 处：6 处 CodeMirror gutter 命中测试、1 处工具调用 chip 宽度计算（`X7t({availableWidth:…boundaryRight:…getBoundingClientRect().right…`）；`.right + 8` 字面量 0 命中（ZCode 走 Radix sideOffset，无手写锚点算术）。

**最终判定**：**升级为有参照**。插件 8px 水平偏移与 ZCode 轮次导航 tooltip（`side:right`+`sideOffset:8`+`w-80`）逐值一致；建议在 03e 或 02-motion 补一行「水平侧展浮层锚定偏移 = 8px（v4-turn-navigator-tooltip 原文）」，并把 4px（主流）/6px/8px 档位记入。

---

## 条目 3 · startup-splash.ts:38 徽标内图标 border-radius:12px（56×56）

**搜过的模式**：
`<div class="startup-logo-shell">`（+`-A 6` 取内部标记）、`startup-logo-shell` ±80/200、`rounded-\[12px\]`、`rounded-xl` 定义、`--radius-xl:`、`size-14`（计数+`size-14 [a-z…]{0,60}` 组合）、`h-14 w-14`、`.{0,55}size-14.{0,55}`（触 ugrep 上限，改字面量）、`aria-label.:\`ZCode\`,role:.img.`、`UEt`（内嵌标志组件引用）、`h-\[26px\]`（并行核查，见条目 1）。

**命中原文**：
1. ZCode 启动页徽标内确为 SVG（启动页 HTML 原文）：`<div class="startup-logo-shell">` 下一行 `<svg xmlns="http://www.w3.org/2000/svg" width="118" height="100" fill="none" viewBox="0 0 256 218"`——03p:54-55 说法属实，启动页内无圆角图标。
2. **onboarding 欢迎页找到 56×56+12px 徽标（强例证）**：
   `(0,$.jsxs)(\`div\`,{className:\`space-y-2\`,children:[(0,$.jsx)(\`div\`,{className:\`relative flex size-14 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#000000_0%,#151718_100%)] text-[#ffffff] shadow-lg/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-xl before:border before:border-[rgba(255,255,255,0.1)]\`,"aria-label":\`ZCode\`,role:\`img\`,children:(0,$.jsx)(UEt,{className:\`h-auto w-10\`})…`（前文 `t.formatMessage({id:\`onboarding.welcome.eyebrow\`})`）。
   即：56×56（size-14）+ rounded-xl（`--radius-xl: .75rem` = 12px）+ 与启动徽标壳同款黑渐变 `linear-gradient(180deg,#000000,#151718)` + 1px 白 10% 边框 + 内嵌白色标志（w-10=40px）。
3. 其余 size-14 例证（口径旁证）：`mb-2.5 flex size-14 … rounded-full bg-surface`（空状态，圆形）、`flex size-14 … rounded-full bg-success`（成功图标）——56px 图标容器在 ZCode 有 rounded-full / rounded-xl 两档，**无第三种圆角**。

**最终判定**：**升级为有参照**。插件 `.dcu-splash-badge img{width:56px;height:56px;border-radius:12px}` 的「56px↔12px」组合与 ZCode onboarding 欢迎页徽标（size-14 + rounded-xl = 12px，同款渐变与边框）逐值一致——12px 是 ZCode 官方 56px 徽标档圆角（96px 档 24px 之外的另一档）。差异注明：ZCode 圆角加在**壳**上（内部 40px 白标志），插件加在 **img** 上（img 即图标本身）；「启动徽标内是 SVG path 无圆角」仅指 ZCode **启动页**，不足以否定 onboarding 侧同档例证。

---

## 条目 4 · turn-rail-dedupe.ts 全模块（保留文档顺序第一条 :29-35、rAF 合并 MutationObserver :42-51）

**搜过的模式**：
`dedupe`（计数+±50/60 窗口逐条看语义）、`duplicat`（计数）、`stale[a-zA-Z]{0,20}`（top 频次+语义）、`v4-turn-navigator[a-z-]{0,20}`（实例数）。另核对 `03-turn-navigator.md`（batch-12 已 grep `去重|dedupe|stale` 0 命中，本轮未重跑该文档 grep，沿用其记录）。

**命中原文**：
- `dedupe` 69 处，逐条看均为**数据层**去重：`dedupeFontFamilyStack`、`dedupeRoots`、`dedupeScanRootsByRealpath`、`dedupeCandidatesByCanonicalSkillPath`、`dedupeCommandsByName`、遥测 `{rounds:200,network:100,dedupe:2e3}` 窗口、`{reason:"dedupe_window_or_capacity"}`；
- `duplicat` 1287 处（重复 key/记录等通用语义）；`stale` 442 处，头部形态 `staleStyleSheets`(7)、`staleAnnotations`(6)、`staleTokens`(5)、`staleRevision`(4)、`staleLogEpoch`(4)——缓存/React 闭包语义，无 DOM 组件去重；
- `v4-turn-navigator` 系 testid 共 6 处（`v4-turn-navigator`×4、`-item`×1、`-tooltip`×1）——ZCode 官方索引栏是单实例组件，无重复注册问题。

**最终判定**：**确认无参照**（维持 batch-12 原判）。纯行为决策模块：ZCode 无「同 id 索引栏重复渲染」的问题域（单皮肤单实例），dedupe/stale 词面命中全部为数据层语义，无任何可引用的颜色/圆角/动效/文案决策点。补全的搜索记录如上，后续批次无需再挖。

---

## 条目 5 · SettingsDocumentAction.tsx 行为组（aria-busy+disabled 防重入 :36、role=alert :21,35、h2 经 .dcu-settings-general-group = 14px/600、「打开配置文件」功能）

**搜过的模式**：
`aria-busy`（计数+窗口，剔除 React 白名单表后取真实 JSX）、`disabled:[a-z],"aria-busy"` 形态、`role[=:]"?alert"?`（计数+逐处上下文、`grep -n role="alert` 行号）、`aria-busy` 文档预览 loading 形态、`03f-settings-zcode-spec.json` 全量解析（navItems/cards/switches/selects）、`03f-settings.md` S1b 行重读、`03n-typography.md` A6–A9 重读、`settings.plugins.title` / `general.http.server` / `sanitization.url` 渲染上下文、`(SettingsGeneral|GeneralSettings|SettingsPage|SettingsView|SettingsContent)`、`SectionTitle|SectionHeader|SettingsGroup|SettingsRow`、asar 目录内 settings 相关文件清单（`"[^"]*ettings[^"]*\.(html|css|js)":\{"size"`）、`defaultSettingsView` 两文件按 offset 提取验明归属、`settings-page-styles.ts:85-96` 重读、`(openSettings|openConfig|settings\.json|config\.json)`、`打开配置文件`/`配置文件` i18n 值、`openProviderConfig[A-Za-z]*`（键名+JSX 引用）、`goToProviderConfig` 渲染处。

**命中原文**：
1. **aria-busy + disabled 防重入有 ZCode 例证**：侧栏添加会话菜单项 `return e.variant===\`menu\`?(0,$.jsxs)(Ry,{"data-side-pane-add-item":p,onSelect:e=>{(!l.installed||!l.info?.enabled)&&e.preventDefault(),g()},disabled:m,"aria-busy":m||void 0,children:[…`——安装进行中（m）时 disabled+aria-busy 联动，与插件 `aria-busy={opening} disabled={opening}` 模式同构。另有 4 处文档预览 loading 容器 `"aria-busy":\`true\``/`m===\`loading\`?\`true\`:void 0`（busy 语义通用）。
2. **role="alert" 有 ZCode 例证**（均为错误提示语义）：Playwright traceViewer `e.jsx("div",{className:"processing-error",role:"alert",children:y})`；日历 web component `shadow.innerHTML = …<div class="calendar" role="alert">${escape(error…message…)}</div>`（asar 行 5226422）。与插件 `role="alert"` 显示打开失败文案同构。
3. **h2 14px/600 的口径定位**：插件侧 `.dcu-settings-general-group h2{margin:0 0 16px;font-size:var(--dsw-font-size-base);font-weight:600}`（`settings-page-styles.ts:96`，=14px/600）。ZCode 侧：`03f-settings-zcode-spec.json` 只有 navItems/cards/switches/selects 四类实测，**内容区分组标题无记录**；navItems 首项「基础设置」fs 12px/fw 500/h22 即 S1b「导航分组标签 12px/500」的实测——**S1b 的 ❓ 在 DSH 列而非 ZCode 列**（batch-12 原文误读为「ZCode 未采集」）。相邻口径：03n A7 ZCode h2 = 16px/28px/600（实测+源码双源）、A8 h3~h4 = 14px/24.5px/600。即插件 14px/600 落在 ZCode 排版体系的 **h3/h4 档**（合法档位），但比其 h2 语义档（16px/600）小 2px；「设置页内容区组标题」的 ZCode 实测值仍缺（活页面需滚到含组标题的分区补采）。
4. **「打开配置文件」功能近似对应物存在**（修正 batch-12「ZCode 无对应物」）：ZCode 顶栏有**「前往配置」**菜单项——`(0,$.jsx)(\`span\`,{className:\`truncate\`,children:r.formatMessage({id:\`appHeader.goToProviderConfig\`})})`（JSX 引用 2 处，含 disabled+title 态管理 `(0,$.jsx)(p,{disabled:D||!a,title:D?d:void 0,onSelect:T,…`）；且 i18n 资源含**「用 … 打开 … 配置文件」**三段拼接键：`"appHeader.openProviderConfigWithEditorPrefix":\`用\``, `"appHeader.openProviderConfigWithEditorMiddle":\`打开\``, `"appHeader.openProviderConfigWithEditorSuffix":\`配置文件\``, `"appHeader.openProviderConfigInEditorFailed":\`无法在 {editor} 中打开 Provider 配置文件\``（英文镜像同构：Use…to open…config file / Could not open provider config…）——证明 ZCode 存在「用系统编辑器打开 Provider 配置文件」的入口与失败提示；但 JSX 静态引用 0 处（仅 `id:\`appHeader.goToProviderConfig\`}`×2），疑动态键拼接，渲染形态未定位、无活页面采集。
5. 排除项备案：`defaultSettingsView-GTWI-W_B.js`(643KB)/`defaultSettingsView.B4dS75f0.css`(110KB) 经 asar offset 提取验证属 `/node_modules/playwright-core/lib/vite/traceViewer/`，非 ZCode 设置页；`SectionHeader` 486 处命中全为 VS Code 主题变量（`--vscode-sideBarSectionHeader-*`）；`sanitization` 上下文命中为内嵌 mermaid 的 sanitize 指令，非设置页分组。

**最终判定**：**升级（3 个子项有参照、1 个子项澄清、1 个子项仍缺）**。① aria-busy+disabled 防重入：有 ZCode 同构例证（data-side-pane-add-item 菜单项）；② role="alert"：有同构例证（traceViewer processing-error、日历错误提示）；③ h2 14px/600：数值落在 ZCode A8 档（h3 级 14px/600），与 A7 的 h2 语义档（16px/600）差 2px——可作为「组级标题按 h3 档排版」的对齐说明登记；S1b ❓ 归属勘误（❓ 在 DSH 列）；设置页内容区组标题的 ZCode 实测仍缺，保留待活页面补采；④ 「打开配置文件」：从「无对应物」修正为「有近似对应物」——顶栏「前往配置」+ i18n 证明的「用编辑器打开配置文件（含失败提示）」入口，但渲染代码未定位，具体形态待采。

---

## 汇总

| 条目 | 原判 | 本次判定 |
|---|---|---|
| 1 页签带/滑块全套 | 无参照 | **部分升级**：页签带结构维持无对照；26px+radius-md 6px 有工作流 artifact 行弱例证；激活底 ZCode 口径=selected 中性 10%（插件 18% 偏重，可作偏离登记）；18% 中性无例证（仅 heatmap 蓝档） |
| 2 锚点偏移 8px | 无参照 | **升级**：v4-turn-navigator-tooltip `side:right+sideOffset:8+w-80`，逐值一致 |
| 3 徽标内图标 12px | 无参照 | **升级**：onboarding 欢迎页 `size-14 rounded-xl(12px)` 同款渐变+白 10% 边框徽标 |
| 4 turn-rail-dedupe | 无参照 | **确认无参照**（dedupe/stale 命中全为数据层语义；搜索记录补全） |
| 5 SettingsDocumentAction | 无参照 | **升级**：aria-busy+disabled、role=alert 均有同构例证；h2=14px/600 落 ZCode A8 档；「打开配置文件」有近似对应物（前往配置 + 用编辑器打开配置 i18n 链）；设置页内容区组标题 ZCode 实测仍缺 |

found=4（条目 2、3 整条升级；条目 5 三个子项升级；条目 1 部分升级——按「拿到实质参照」计 4 条），absent=1（条目 4 确认无参照）。
