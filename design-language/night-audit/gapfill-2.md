# 夜间补采 · 批次 2 —— CodexSidebar.tsx 五条「无参照」条目重挖

> 日期：2026-10-30。执行：补采员·批次 2（只读，零代码改动；本文件为唯一产出）。
> 通道：**纯静态**——对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 B）
> 做 `grep -a -b -o` 取字节偏移，再 `tail -c +<off> | head -c <N>` 提取窗口读原文。
> 本批无活体采样（此前批次 9224 直采通道本批未动用）；所有结论均给出偏移量可复核。
> 未验证项在各自小节内显式标注。

## 0. 通用定位（所有条目共用的锚点工作）

| 步骤 | 命令 | 结果 |
|---|---|---|
| 锚点计数 | `grep -a -c 'task-title-marquee-track' app.asar` 等 5 个模式 | marquee 2 行 / panel-width 3 行 / cmdk 14 行 / surface-hover 26 / rounded-2xl 24 |
| cmdk 全偏移 | `grep -a -b -o 'cmdk' app.asar` + 逐偏移取 1KB 窗口 | 三段：库本体（`node_modules/cmdk@1.1.1`，104.5MB 段，MIT，Paco Coursey）；**app 自有 chunk（327–330MB 段，含 Command 封装 `_A`/`vA`/`yA` 与 ⌘K 组件 `Yit`）**；编译后 tailwind CSS（325.8–326.3MB 段） |
| CSS 选择器探测 | `grep -a -b -o '\[cmdk-[a-z-]*=""\][^{}]\{0,80\}{'` | 只命中库内 JS 字符串常量；app 侧无 `[cmdk-*]` 属性选择器规则，样式全走 `**:[[cmdk-group-heading]]:` 任意变体工具类 |

关键换算（后文引用）：`--text-ui-base: var(--ui-font-size)` = 14px；`--text-ui-sm: calc(var(--ui-font-size) - 2px)` = 12px；`--text-ui-xs: calc(var(--ui-font-size) - 4px)` = **10px**；`--radius-sm: .25rem`(4px) / `--radius-md: .375rem`(6px) / `--radius-lg: .5rem`(8px) / `--radius-xl: .75rem`(12px) / `--radius-2xl: 1rem`(16px)；`--color-foreground-subtle` = 前景 60%（dark `#d4d4d499` / light `#40404099`）。

---

## 1. 条目一：侧栏头部/品牌区几何（head 48px、字标 svg 22px、head-actions 28px 列、头部图标钮 28×28/r8 vs 24×24/r6）

**搜索过的模式**：`sidebar-header`、`SidebarHeader`、`wordmark`、`logo`、`brand`、`h-12`、`h-11`、`w-14`、`rail`、`kbd`、`Kbd`、`marquee`（在 328530000 起 120KB 侧栏组件窗口内 grep，除 `marquee`/collapse 组折叠逻辑外**全部 0 命中**）；`workspace-sidebar-panel-width` 6 处偏移逐个提取（→ 331026875 命中侧栏顶 overlay）；`function h4({title`；`icon-md`；`desktop-top-logo-sidebar-toggle`；`data-desktop-logo-visual`。

**命中原文**：

① 侧栏顶 overlay（= ZCode 侧栏头部的真身，`app.asar@331026875`，组件 `Ubn`）：
```
style: s ? {width: `var(--workspace-sidebar-panel-width)`} : void 0,
className: Z(`@container/topoverlayer pointer-events-none absolute h-14 flex left-0 top-0 z-20 w-fit`, A && `mt-px`, r ? `top-1.5` : k && `top-1`),
children: jsx(`div`, { className: Z(`flex items-center`, t && `h-14`, A && `h-12`, A && `pl-3 ml-px`, t && (n ? s ? `pl-3 pt-1` : `pl-5 pt-1` : `pt-1`)), ...
```
`t`=isMacDesktop、`r`=isWindowsDesktop、`A=r||k`（win 或其它桌面）、`s`=isSidebarVisible。即：**mac 行高 h-14=56px，win/其它桌面 h-12=48px**。

② 头部图标钮（`app.asar@331023603`，`h4` 定义）：
```
function h4({title,ariaLabel,children,shortcut,disabled,onClick,onMouseEnter,side=`bottom`,buttonClassName,testId}){
  return jsx(Dv, {title, shortcut, side, children: jsx(X, {type:`button`, variant:`ghost`, size:`icon-md`, className: Z(`[app-region:no-drag] transition-colors`, c), ...})}) }
```
Button 尺寸映射（`app.asar@293661824`）：
```
`icon-xs`: `size-5 rounded-sm [&_svg:not([class*='size-'])]:size-2.5`,
`icon-sm`: `size-6 [&_svg:not([class*='size-'])]:size-3`,
`icon-md`: `size-7 rounded-lg [&_svg:not([class*='size-'])]:size-4`,
`icon-lg`: `size-8 rounded-lg [&_svg:not([class*='size-'])]:size-4`
```
→ **icon-md = 28×28、rounded-lg=8px、内 svg 16px**。侧栏头部全部按钮（logo 切换/前进/后退/新任务）都走 `h4` → ghost icon-md。

③ 品牌徽标（`app.asar@331023603` 后同函数区，`_4`/`Bbn`）：
```
_4: titlebar 档 = `size-5 rounded shadow-sm/20 before:border-white/20`（徽标盒 20×20），
    底 `bg-[linear-gradient(180deg,#000000_0%,#151718_100%)]`、before:border-[rgba(255,255,255,0.1)]、text-[#ffffff]；
    内嵌 SVG `Bbn`：viewBox `0 0 256 218`，`className: size-auto w-3.25`（宽 13px → 高≈11px）；
    default 档 = `size-24 rounded-3xl`（启动页大标）。
```
且徽标按钮（logo 兼侧栏开关，testId `desktop-top-logo-sidebar-toggle`）只在 `A`（win/其它桌面）分支渲染；**mac 分支是 `t && h4(sidebar-toggle 图标钮)`，头部根本没有品牌元素**。

④ 新任务钮容器：`` `inline-flex overflow-hidden transition-[opacity,width] duration-300 ease-out` ``，展开 `w-7`(28px)/收起 `w-0`（`app.asar@331027400` 附近）。

**最终判定：升级（部分）——三件套取得真值，一个子项确认无参照。**
- **头部图标钮口径之争解决：取 28×28/r8**（icon-md，asar 直接证实）；03i D1 的 24×24/r6 属于侧栏视图卡片行的另一表面（对应 icon-sm=24px 一档），不适用于头部。插件 `CodexSidebar.tsx` `.dcu-head .dcu-icon{width:28px;height:28px;border-radius:var(--dsw-radius-lg)}` 与 ZCode 同值，**维持现状即可**。
- **head 高度**：ZCode mac=56px（h-14）/ win·linux=48px（h-12）。插件 48px 只与 win/linux 档一致；DSH 宿主跑在 macOS 上，若严格按 asar 应为 56px——与 04:779「顶栏高 48」的活体实测（那是会话头部 surface，03e 域）不一致。**登记为待活体复核项，不在本批改代码。**
- **head-actions 28px 列**：ZCode 按钮列是 `flex items-center gap-1` 自然排布（非固定网格列），但按钮本体确为 28×28、新任务钮容器 w-7=28px——插件 28px 网格列与真值同量级，无冲突。
- **字标 svg 高 22px：确认无 ZCode 参照**（本批唯一 absent 子项）。ZCode 无字标概念：品牌 = 20×20 渐变徽标盒（glyph 13px 宽），且 mac 侧栏头不渲染它。插件的 22px 字标属 DSH 自有选择，不构成对 ZCode 的偏差——但若追求同构，对应物是「20×20 徽标」而非「22px 字标」。

---

## 2. 条目二：收起窄轨宽度 56px（`.dcu-compact-shell width:56px`，CodexSidebar.tsx:143）

**搜索过的模式**：`collapsedWidth`（全库 12 处偏移逐个提取上下文）、`toggleSidebar`、`sidebarCollapsed`、`sidebar-collapsed`、`sidebarWidth`、`SIDEBAR_WIDTH`、`isSidebarCollapsed`、`data-slot="sidebar"`、`workspace-sidebar`（计数定位）→ **前 8 个模式命中全部为无关代码**：collapsedWidth 5 处属文本排版引擎（16.9/17.6MB 段 `measureNaturalWidth`），7 处属 xlsx 图表锚点（33/36/39MB 段 `isCollapsedChartAnchor`）；`sidebarCollapsed`/`sidebar-collapsed`/`sidebarWidth`/`SIDEBAR_WIDTH`/`isSidebarCollapsed`/`data-slot="sidebar"` 计数为 0。有效路径：`workspace-sidebar-panel-width` 消费方 3 处（332186418/332199904/332215561）+ 变量赋值追踪。

**命中原文**：

① 外壳常量（`app.asar@332186418`）：
```
sBn=800, cBn=4, lBn=264, R5=264, uBn=.5, dBn=`zcode:workspace-shell:sidebar-width-px`, …
function z5(e,t){ let n = t&&t>0 ? Math.max(R5, t*uBn) : Infinity; return Math.round(Math.max(R5, Math.min(e,n))) }
```
→ 侧栏宽默认/最小 264px、拖拽上限 50% 视口（`z5` 钳制）。

② 样式合成（`app.asar@332199904`）：
```
Hr = { …, "--workspace-sidebar-panel-width": `${cr ? Wn : fn}px`, "--workspace-sidebar-width": `${Wn}px`, … }
```

③ 收起宽度真值（`app.asar@332215561` 附近）：
```
sn = ee || V || an            // ee=isMacDesktop, V=isWindowsDesktop, an=isLinuxDesktop → sn=isDesktop
fn = sn ? (V ? 6 : 4) : 0     // 收起态面板宽：mac/linux 4px、win 6px、web 0
```
面板 div（同偏移）：
```
className: Z(`w-[var(--workspace-sidebar-panel-width)] max-w-[50%] flex-none overflow-hidden duration-200 ease-out transition-[width,opacity] data-[workspace-sidebar-resizing=true]:transition-opacity`, …, cr ? `opacity-100` : `pointer-events-none opacity-0`)
```

**最终判定：升级——取得真值，且结论与插件相反。**
ZCode **没有** 56px 收起窄轨：收起 = 整列宽度收到 **4px（mac/linux）/ 6px（win）/ 0（web）的细缝 + `opacity-0`**，配 `transition-[width,opacity] 200ms ease-out`（02-motion 记录的 200ms 由此在源码侧证实）。重开靠左上角常驻 overlay 按钮（条目一的 `Ubn`，不随侧栏消失）。
插件 56px 紧凑轨是 DSH 自有适配（SIDEBAR-STRUCTURE-DIFF §2.1 已裁决内容差异有意保留）。本批补上的事实是：**宽度 56 在 ZCode 无对应值，且 ZCode 的收起语义是「列消失」而非「列变窄」**——56px 维持现状成立，但设计文档应把「ZCode 收起态宽度无实测」改写为「ZCode 收起 = 4/6/0px 细缝 + 透明，无窄轨」（asar 静态值；mac 活体未复测）。

---

## 3. 条目三：快捷键键帽规格（`.dcu-menu-kbd` 高 20px/xs；`.dcu-search-hint kbd` 高 16px/2xs）

**搜索过的模式**：`data-slot:"kbd"`（首搜模式写错引号 0 命中，修正为 `` :`kbd` `` 后全库**恰 1 处** @327150003）；`jsx(`kbd`` 0 命中（元素开标签形式不同）；`function Ev(`；`function Dv(`；`Cit`/`EA`/`DA` 用法（首搜模式过窄 0 命中，放宽 `\bCit\b.{0,160}` 命中）；侧栏外壳区域（331.0–332.4MB，1.4MB 窗口）内子串 `kbd` **0 命中**；令牌 `--text-ui-(xs|sm|caption|base|lg)`、`--color-tooltip-tag*`、`--radius-*`。插件侧 `--dsw-font-size-2xs` 在 `uiplug/src` grep **0 命中**（宿主注入令牌，本仓无法证实 2xs=10px，见判定）。

**命中原文**：

① 全库唯一的 `<kbd>` 组件（`app.asar@327149919`，`Ev`，tooltip 快捷键槽）：
```
function Ev({className, style, …n}){ let r = il();   // 平台判断
  return jsx(`kbd`, {"data-slot": `kbd`, className: Z(
    `rounded-md h-4 inline-flex shrink-0 items-center bg-tooltip-tag px-1.5 text-ui-xs font-medium text-tooltip-tag-foreground`,
    r ? `tracking-normal` : `font-mono`, e),
    style: { …(r ? {fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif`} : {}), …t }, …n) }
```
→ **h-4=16px、rounded-md=6px、px-1.5=6px、text-ui-xs=10px、font-medium、bg-tooltip-tag（dark `#363636`/light `#e6e6e6`）、字色 tooltip-tag-foreground（前景 60%）；mac 用系统字体 tracking-normal，非 mac 才 font-mono**。消费方：`Dv` tooltip（`has-data-[slot=kbd]:pr-1`）。

② ⌘K 行内快捷键（同一 chunk，328065800）：`yA`（command-shortcut）默认**无框纯文本** `ml-auto text-ui-xs tracking-widest text-foreground-subtlest`（选中转 text-foreground）；有 shortcut 的行改挂 `Cit`：
```
Cit = `inline-flex h-4 min-w-7 items-center justify-center rounded-sm bg-surface px-1 py-0 font-sans text-ui-base leading-none tracking-normal text-foreground-subtle`
```
→ 键帽 chip：**h-4=16px、min-w-7=28px、rounded-sm=4px、bg-surface、px-1=4px、text-ui-base=14px、foreground-subtle 60%**。文件结果行无 shortcut 时挂 `DA`（14px/60%/max-w-[45%]/truncate）。

**最终判定：升级——键帽规格取得两组真值。**
- `.dcu-search-hint kbd`（高 16px）：高度与 ZCode 两组真值一致；但 ZCode 半径 4–6px（sm/md）、水平内衬 4–6px、字号 10–14px。插件 2xs 字号若=10px 则与 tooltip kbd 同档（**该等式未能在本仓证实**，宿主令牌无定义）。
- `.dcu-menu-kbd`（高 20px）：**ZCode 侧栏菜单行不显示快捷键键帽**——侧栏外壳 1.4MB 窗口内 `kbd` 零命中，ZCode 的键帽只出现在 tooltip 与 ⌘K 行内。20px 档无 ZCode 对应物，属 DSH 自有规格；若要向 ZCode 靠拢，参照值是 16px（两组键帽同高）而非 20px。**登记为规格冲突项，本批不改代码。**

---

## 4. 条目四：搜索浮层入场参数（translateY(-6px) scale(.985)、scrim 48% 黑、顶距 72px、z-index 10020）

**搜索过的模式**：`max-w-lg`（6 处偏移提取）；`bit`/`xit`/`Sit`/`EA`/`Cit`/`DA` 常量区（328064300 起 8KB 全读）；`Fit` 定义区（328066350 起）；`quickPick.title`（3 处偏移：310355848/310818067/328079669）；`function iit(`（首搜命中 199MB 段无关 canvas 函数——压缩名跨 chunk 重名；限窗 327000000+3MB 重搜命中 328055005）；`function Ay(`；`function UPe(`；`function HPe(`；动画/位移组合模式 `animate-in|fade-in|zoom-in|slide-in-from|data-[state=open]|z-[数字]|fixed`（在 ⌘K 渲染段 grep——`slide-in-from` 全库仅 dropdown-menu content `Ly` 使用，⌘K 链路无位移类）。

**命中原文**：

① Dialog Content（`app.asar@327196495`，`Ay`，全 app 模态/浮层共用）：
```
Wf {"data-slot":`dialog-content`, className: Z(`fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-popover-border bg-popover p-4 text-ui-base/relaxed text-foreground shadow-md duration-100 outline-none
  data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 [app-region:no-drag]`, e), …}
```
② Scrim/Overlay（`app.asar@327196207`，`UPe`）：
```
Uf {"data-slot":`dialog-overlay`, className: Z(`fixed inset-0 isolate z-50 bg-black/60 duration-100 supports-backdrop-filter:backdrop-blur-xs
  data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`, e)}
```
③ ⌘K 包装器（`app.asar@328055005`，`iit`）：content className = `` `top-1/3 translate-y-0 overflow-hidden p-0` `` + 传入的 `Fit`；`showOverlay` 未传 → 默认 true → **有 scrim**。

④ ⌘K 定位/尺寸常量（`app.asar@328066350`）：
```
bit = `top-1/2 max-w-lg -translate-y-1/2 overflow-hidden rounded-2xl! border-popover-border bg-popover p-0 shadow-md`
Fit = Z(bit, `top-16 max-h-[calc(100dvh-4.5rem)] -translate-y-0 sm:top-20 sm:max-h-[calc(100dvh-6rem)]`, `platform-linux-desktop:top-16 sm:platform-linux-desktop:top-20`)
```
→ 最终生效（twMerge 后）：**top-16=64px，sm:top-20=80px**（桌面宽窗取 80px），纵向不平移；max-h = 100dvh−96px（sm 档）。max-w-lg = var(--container-lg) = 512px（与 03i E1 活体一致）。

**最终判定：升级——四个参数全部取得 ZCode 真值。**

| 参数 | ZCode（asar） | 插件现状 | 差异 |
|---|---|---|---|
| scrim | `bg-black/60` + `backdrop-blur-xs`(4px)，100ms 淡入淡出 | 48% 黑、无 blur | **偏浅 12 个点、缺 blur** |
| 入场 | `duration-100` + `fade-in-0` + `zoom-in-95`（100ms，纯淡入+95%→100% 缩放，**无 Y 位移**） | `translateY(-6px) scale(.985)` enter 档 160ms | 位移/缩放/时长三处不同 |
| 顶距 | top-16=64px（sm 以下）/ **sm:top-20=80px**（桌面宽窗） | 72px | 恰取两档中间值，两头都不对 |
| z-index | overlay 与 content 均 `z-50` | 10020 | DSH 层级适配（叠在宿主之上），**属适配性偏离，不是设计值** |

02-motion 的「浮层档 150ms」与 ZCode 真值 100ms 也不一致（本条顺带修正）。判定：参数组有完整参照，后续若做对齐批次可逐值落地；本批只登记不改码。

---

## 5. 条目五：搜索分组标题样式（`.dcu-search-title` sm/tertiary）

**搜索过的模式**：`\*\*:\[\[cmdk-group-heading\]\]:[a-z0-9.\[\]/-]+` 全量统计（13 个工具类变体）；px-2+py-2 变体 3 处偏移上下文提取（→ 均属「打开的标签页」选择器 surface）；px-3+py-2 1 处（git branch switcher，329980040 提取顺带获得）；`heading:` 在 Yit 组件窗口内搜索（**首搜 ugrep 报语法错 `mismatched ( )`，改用简化模式 `heading:.{0,70}` 成功**）；`_A` 定义；`--text-ui-base`、`--color-foreground-subtle` 令牌值。

**命中原文**：

① app 侧 CommandGroup 封装（`app.asar@328055005`，`_A`）：
```
function _A({className, …t}){ return jsx(aA.Group, {"data-slot": `command-group`, className: Z(
  `overflow-hidden p-1 text-foreground
   **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5
   **:[[cmdk-group-heading]]:text-ui-base **:[[cmdk-group-heading]]:font-medium
   **:[[cmdk-group-heading]]:text-foreground-subtle`, e), …t }) }
```
② ⌘K 面板（Yit）的四个分组**全部走 `_A` 默认键法**，heading 为 i18n 键：
```
heading: f.formatMessage({id: `commandCenter.section.recentTasks`})
heading: f.formatMessage({id: `quickPick.section.${e.sectionId}`})
heading: f.formatMessage({id: `commandCenter.section.conversations`})
heading: f.formatMessage({id: `commandCenter.section.files`})
```
③ 全库变体统计（grep 计数）：`text-ui-base`(5)、`text-foreground-subtle`(5)、`font-medium`(5)、`py-2`(4)、`px-2`(3)、`px-3`(1)、`px-2.5`(1)、`py-1.5`(1) —— 各 surface 只改 padding（px 2~2.5~3 / py 1.5~2），字号/字重/颜色恒定。
④ E5 旁证（scope 签与分组标题确为两个元素）：scope tab `NA`（328065617 区）= `` `inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-ui-base font-medium leading-none` ``，未选中 `text-foreground-subtle` → 与 03i E5 活体值吻合，且形态（圆角签）与分组标题（列表内标题行）截然不同，E5 不可套用于分组标题的裁决**保持成立**。

**最终判定：升级——分组标题取得完整参照。**
ZCode ⌘K 分组标题 = **14px（text-ui-base）/ font-medium / 前景 60%（foreground-subtle）/ px-2.5(10px) py-1.5(6px)，分组容器 p-1**。
插件 `.dcu-search-title{padding:0 8px 4px; font-size:var(--dsw-font-size-sm); font-weight:500; color:var(--dcu-sidebar-tertiary)}` —— 字重方向一致（500），但**字号 12 vs 14、色档 tertiary vs 60% 前景、padding 4/8 vs 6/10** 三处有差。若做对齐：字号升到 base 14、色改 `--dsw-alias-label-secondary`（60% α）、padding 改 0 10px 6px。本批只登记。

---

## 6. 汇总

| 条目 | 原状态 | 本批结果 |
|---|---|---|
| 1 头部/品牌几何 | 无参照 | **升级**：图标钮口径定案 28×28/r8（icon-md）；head 高真值 mac 56 / win·linux 48；**子项「22px 字标」确认无 ZCode 对应物**（品牌=20×20 徽标，mac 侧栏头不渲染） |
| 2 收起窄轨 56px | 无实测 | **升级**：ZCode 收起 = 4/6/0px 细缝 + opacity-0 + width/opacity 200ms ease-out，**无窄轨**；56px 为 DSH 自有适配 |
| 3 键帽规格 | 无实测 | **升级**：tooltip kbd = h16/r6/px6/10px/500/tooltip-tag 底；⌘K 行内 chip = h16/min-w28/r4/px4/bg-surface/14px/60%；**20px 菜单键帽无 ZCode 对应物**（侧栏不渲染键帽） |
| 4 浮层入场 | 未采集 | **升级**：scrim 60% 黑+blur-xs+100ms；content z-50、100ms fade+zoom-95 无位移；顶距 64/80px；插件四参数逐一有真值可对 |
| 5 分组标题 | E5 不可套用 | **升级**：`_A` 键法 = 14px/500/60%前景/10px×6px padding；Yit 四分组全走默认；E5=scope 签裁决保持成立 |

**计数**：升级为有参照 5 条；其中含 2 个「确认无参照」子项（22px 字标、20px 菜单键帽——均为 DSH 自有规格，非偏差）。
**未验证/存留**：① 本批全部为静态提取，无活体复测（尤其条目 2 的 4px 细缝、条目 1 的 mac 56px 头高值得下一轮 CDP 9224 活体确认）；② `--dsw-font-size-2xs` 宿主值本仓不可见，「2xs=10px」等式未证实；③ 条目 1「04:779 顶栏 48px」与本批「mac h-14=56px」分属两个 surface（会话头部 vs 侧栏顶 overlay），是否同源需活体裁决。
