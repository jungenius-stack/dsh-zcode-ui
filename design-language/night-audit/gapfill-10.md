# gapfill-10 · 批次10 无参照项补采（foreign-surface-discovery / workspace-drop-indicator / DesktopNavigationControls / PluginConfigSection）

> 2026-10-30 补采。对象：`night-audit/batch-10.md`「无参照项」5 条。
> 方法：全部对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）实跑 `grep -a`（下文命令均本轮执行，`A=` 同前例指 asar 全路径）；长上下文遇 ugrep 复杂度上限时改 `grep -a -b -o` 取字节偏移 + `tail -c +N | head -c M` 切片。文档侧复核 `08-performance-audit.md`（`grep -n -E '8ms|400ms|预算|budget|分帧|抽样'`）与 `night-audit/batch-10.md` 原记录。
> uiplug 源码定位复核（只读，`Read` 全文）：foreign-surface-discovery.ts（SCAN_BUDGET_MS=8@:76、SAMPLE_PER_PREFIX=4@:85、REPORT_DELAY_MS=400@:88、KNOWN_FOREIGN_ROOTS@:45-62）、workspace-drop-indicator.ts（0.5px 容差@:43,48、±4px 中点@:57、冲突告警@:78-84、rAF@:93）、DesktopNavigationControls.tsx（:6/:10-12/:25-26）、PluginConfigSection.tsx（:18-26/:43-47/:113）——5 条行号与 batch-10 所记一致。
>
> **总判定：found=3, absent=2。** 条目3、4 从「无法提取」升级为「有参照」（ZCode 的 Windows 标题栏适配、导航钮图标、focus 环变量全部找到载体）；条目2 部分升级（测量新鲜度机制同构，中点/容差/冲突告警仍无）；条目1、5 维持「确认无参照」。注意：**有参照 ≠ 数值一致**，条目3/4 均为「机制不同/形态不同」差异项。

---

## 条目1 · foreign-surface-discovery.ts 哨兵预算参数与 KNOWN_FOREIGN_ROOTS 登记表（uiplug `:45-62,:76,:85,:88`）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '(SCAN_BUDGET_MS|SAMPLE_PER_PREFIX|REPORT_DELAY_MS|KNOWN_FOREIGN_ROOTS|findForeignDrift|observeForeignSurfaces|foreignPrefixOf)' $A | sort | uniq -c` → **0 命中**
- `grep -a -o -E '[a-zA-Z$_-]*([Bb]udget|deadline|DEADLINE)[a-zA-Z$_-]*' $A | sort | uniq -c | sort -rn` → 81 deadline、59 deadlineAt、41 recoveryBudgetExhausted、38 tokenBudget、25 budget_limited、21 DEADLINE_EXCEEDED、6 rowBudget……切片核对全部为 RPC 超时（gRPC DEADLINE_EXCEEDED）、token 上下文预算、重连恢复预算语境，无「DOM 扫描帧预算」
- `grep -a -o -E 'scheduler\.yield|requestIdleCallback|isInputPending' $A` → requestIdleCallback×53、scheduler.yield×2；`grep -a -b -o 'scheduler\.yield'` → 134127668/134130920，切片实锤两处均为 **execa 库** IPC 代码（上下文 `GRACEFUL_CANCEL_TYPE:'execa:ipc:cancel'`），与 UI 无关；requestIdleCallback 上下文为 xterm/VS Code 式任务队列：`t.IdleTaskQueue=!s.isNode&&"requestIdleCallback"in window?class extends r{…timeRemaining:()=>Math.max(0,t-Date.now())}`、消费点 `_memoryCleanupQueue=new r.IdleTaskQueue,this._memoryCleanupPosition`（xterm BufferService）——库级 idle 队列，非「每帧 8ms DOM 扫描预算」
- `grep -a -o -E '(dsh-session-kit|icaHSq|yhfFVG|cl2Rlq|wXeviG|m0vb0q)' $A | sort | uniq -c` → **0 命中**（KNOWN_FOREIGN_ROOTS 登记的全部外来前缀在宿主本体不存在，佐证「外来内容」只存在于插件侧 DOM）
- `grep -a -c 'MutationObserver' $A` → 275（未逐一验证其回调结构；ZCode 无「发现外来表面」问题域，不存在同构扫描器）
- 文档侧：`grep -n -E '8ms|400ms|预算|budget|分帧|抽样' 08-performance-audit.md` → 仅 :30（`markEmptyMarks` 31ms、`querySelector` 16.8ms，trace 实测数据非预算）与 :42（「导航那条另加 400ms 兜底（防止宿主重建 DOM 丢失移除事件）」，导航移除兜底，非哨兵节流）；**8ms 帧预算无条目**

**最终判定：确认无参照（absent）。** ZCode 是宿主本体：无外来表面发现问题域（DSH 前缀 0 命中）、无帧预算扫描机制（budget/deadline 全为 RPC/token 语境、idle/scheduler 均为库内部件）、08-performance-audit.md 无 8ms/400ms 预算条目（400ms 为导航兜底语境，已澄清）。三条哨兵常量与登记表均为插件自有机制，维持原判。

---

## 条目2 · workspace-drop-indicator.ts 测量策略（uiplug `:43-57,:78-84,:93`：rAF 逐帧重测 / ±4px 中点 / 0.5px 容差 / 双落点冲突告警）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '.{350}purpose-section-drop-indicator.{350}' $A` → 2 处全出（batch-1 已提的静态 JSX，本轮复核一致：`h-0.5 bg-icon-blue` + `top-0 -translate-y-1/2` / `bottom-0 translate-y-1/2` + 子 span `size-2 rounded-full border-2 border-icon-blue bg-sidebar`）
- `grep -a -o -E 'MeasuringStrategy[A-Za-z.]*' $A | sort | uniq -c` → **22 处**：Always×3、BeforeDragging×3、WhileDragging×3（其余为 export/类型引用）；`grep -a -o -E 'measuring:\{[^}]{0,100}\}'` 未命中压缩形式，改大窗口取到配置本体（见下）
- `grep -a -o -E '[a-zA-Z$_-]*(dropIndicator|DropIndicator|drop-indicator)[a-zA-Z$_-]*' $A | sort | uniq -c` → 仅 `project-drop-indicator`×1、`purpose-section-drop-indicator`×1；另取 `project-drop-indicator` ±200/300 窗口：`project-session-drop-target` = `absolute inset-0 z-10 rounded-xl border-2 border-icon-blue`（项目整体落点高亮，新事实）
- `grep -a -o -E 'collisionDetection:\{?[a-zA-Z$_]{0,40}' $A | sort | uniq -c` → 9 处（bvt×1、m×1、o×1、WM×6），均为 dnd-kit 碰撞策略绑定，无落点冲突告警
- `grep -a -o -E 'rect\.[a-z]+[^;{]{0,60}0\.5' $A | head` → `rect.top + rect.height <= frozenPaneBottom + 0.5`、`rect.left + rect.width <= frozenPaneRight + 0.5`（表格冻结窗格边界容差，非拖拽落点）、`rect.width * 0.5`（居中计算）；`(>=|<=)…0\.5` 拖拽语境 → 0
- `grep -a -o -E 'console\.warn\(`[^`]{0,90}' $A | grep -iE 'drag|drop|conflict|落点|冲突'` → 仅 `[plugin-sandbox-shell] dropped message origin=…`（插件沙箱 origin 校验告警）；**双落点冲突 console.warn 无对应物**
- rAF 逐帧重测循环（`update(){…frame=view.requestAnimationFrame(update)}`）在宿主无同构——ZCode 拖拽测量交给 dnd-kit 策略而非自建 rAF 循环

**命中原文**（dnd-kit 全局测量配置，DndContext 默认档）：
```js
Ne={draggable:{measure:A},droppable:{measure:A,strategy:exports.MeasuringStrategy.WhileDragging,frequency:exports.MeasuringFrequency.Optimized},dragOverlay:{measure:O}}
```
消费点：`switch(u){case MeasuringStrategy.Always:return!1;case BeforeDragging:return r;default:return!r}`（`r`=dragging，WhileDragging 档在拖拽中持续触发重测）。

**最终判定：部分升级为有参照（found）。** 「拖拽期间保持测量新鲜」这一核心机制 ZCode 有同构对应物：**dnd-kit `MeasuringStrategy.WhileDragging` + `MeasuringFrequency.Optimized`**（uiplug 是自建 rAF 逐帧循环，ZCode 是 dnd-kit 策略档位——载体不同、语义同构，登记为机制差异项）。±4px 中点插值、0.5px 行边界容差、双落点冲突 console.warn 三项实跑后确认无对应物（ZCode 的落点几何由 CSS `top-0/bottom-0 ±translate-y-1/2` 声明式表达，无 JS 测量插值），维持「插件自有增强」。附带新事实：`project-session-drop-target`（`inset-0 border-2 border-icon-blue`）是项目整体落点的高亮面。

---

## 条目3 · DesktopNavigationControls.tsx Windows 标题栏适配面（uiplug `:6,:11,:12`：--dsh-windows-titlebar-height 40px / --dsh-windows-menu-start 84px / 全屏隐藏）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E -- '--[a-zA-Z0-9-]*titlebar[a-zA-Z0-9-]*' $A` → 无 `--dsh-*`；命中 `--titlebar-area-height` 形（见下）；`titlebar-minimize/maximize/close/menu…`×3 各为 Monaco 等库噪音；`grep -a -c 'dsh-windows'` → **0**；`data-windows-titlebar`/`windows-menu-start` 维持 0（原判成立）
- `grep -a -o -E 'titleBar[A-Za-z]*' $A | sort | uniq -c | sort -rn` → titleBar×996（Electron API 面）、titleBarStyle×3、titleBarOverlay×1、titleBarHeightPx×2、trafficLightPosition×2
- `grep -a -o -E 'process\.platform==="win32"\?\{[^}]{0,200}\}' $A | head` → 两档配置（见下）
- `grep -a -b -o 'titlebar-area-height' $A` → 326144667 / 326144785（编译 CSS）/ 328995195（JSX），三处切片
- `grep -a -c 'platform-windows-desktop' $A` → 7；挂载点 `grep -a -b -o -F 'platform-mac-desktop`'` → 310292709，切片得平台类挂载逻辑
- `grep -a -o -E '(data-fullscreen|isFullScreen|setFullScreen|fullscreenable)'` → isFullScreen×20/setFullScreen×4/fullscreenable×5（Electron API），`data-fullscreen` 属性 0——ZCode 无「全屏隐藏导航区」DOM 面；全屏适配未在 CSS 层找到对应物
- `grep -a -o -E '(app-region:no-drag|app-region:drag|appRegion:[a-z"]+)' | sort | uniq -c` → no-drag×46、drag×14（ZCode 有 app-region 惯例，batch-10 已引 @331027100）

**命中原文**：
1. 平台类挂载（@310292560 切片）——ZCode 把平台挂在 `<html>` class 上（与 uiplug 挂 `data-windows-titlebar` 属性同位）：
```js
var I=navigator.userAgent.includes(`Mac`),L=navigator.userAgent.includes(`Windows`),Wt=!I&&!L;
document.documentElement.classList.toggle(`platform-mac-desktop`,I),
document.documentElement.classList.toggle(`platform-windows-desktop`,L),
document.documentElement.classList.toggle(`platform-linux-desktop`,Wt);
```
2. Windows 标题栏高度适配 = **WCO 标准 `env(titlebar-area-height)`，fallback 48px**（编译 CSS @326144667 + JSX @328995195，markdown 图片工具条）：
```
.platform-windows-desktop\:top-\[calc\(env\(titlebar-area-height\,48px\)_\+_0\.5rem\)\]:where(…){top:calc(env(titlebar-area-height,48px) + .5rem)}
.platform-windows-desktop\:right-\[134px\]:where(…)   // 给 WCO 窗口控件让位 134px
```
3. 主进程 win32 两档：主窗 `process.platform==="win32"?{backgroundColor:"#00000000",frame:!1,backgroundMaterial:"acrylic"}`（无边框+亚克力，导航/内容区自绘）；子窗 `process.platform==="win32"?{titleBarStyle:"hidden",titleBarOverlay:!0}:{}`（原生 WCO）。mac 对照：`{titleBarStyle:"hidden",trafficLightPosition:nc,vibrancy:"under-window"}`。
4. Windows overlay 尺寸按缩放级别解析（@283425450 切片）：
```js
s(nP,"resolveWindowsTitleBarOverlayHeightForZoomLevel");
s(lU,"resolveWindowsWindowControlsOverlayMetricsForZoomLevel"); // {rightPaddingPx, titleBarHeightPx}
s(yp,"buildWindowsTitleBarOverlayForZoomLevel"); // {color:"#00000000", symbolColor: dark?"#f5f5f5":"#1f1f1f", height:nP(e)}
```

**最终判定：升级为有参照（机制不同）。** ZCode 的 Windows 标题栏适配面完整存在，载体与 uiplug 完全不同：**`.platform-windows-desktop` 类（userAgent 检测→html classList）+ WCO `env(titlebar-area-height,48px)` + 主进程 `titleBarOverlay`**，而非 `data-windows-titlebar` 属性 + 自定义 CSS 变量。数值差异项：标题栏高度 ZCode fallback **48px**（且按缩放动态解析）vs uiplug **40px**；控件让位 ZCode `right-[134px]` vs uiplug `--dsh-windows-menu-start:84px`。「全屏隐藏导航钮」在 ZCode CSS/JSX 层无对应物（`data-fullscreen` 0 命中；isFullScreen×20 均为窗口管理 API）——该子项维持无参照。

---

## 条目4 · DesktopNavigationControls.tsx 图标形状与描边 + focus 环颜色（uiplug `:25-26,:10`）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E 'M13 8H3[0-9a-zA-Z ,-]{0,50}'`、`'M3 8h10…'`、`'[Mm]13 8…'`（16 系箭头）→ **0 命中**（`M13 8` 后随的均为 24-viewBox 其他图标 `M13 8h7a2 2 0 0 1 2 2v4…` 分享/外链类）
- `grep -a -o -E '(viewBox:"0 0 16 16")' $A | wc -l` → 34；`grep -a -o -E 'viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"[0-9.]+"'` → **仅 1 个**（strokeWidth **1.2**，上下文 `deleteSessionData` 会话行删除钮）；其余为 octicon（fill 系）。16-viewBox stroke 箭头不存在
- `grep -a -o -E 'strokeWidth:"?1\.5|stroke-width:1\.5' $A | wc -l` → 26（未逐一绑定归属，量级上多为 24 系图标的非默认描边档）
- `grep -a -o -F 'm12 19-7-7 7-7'` / `'m12 5 7 7-7 7'` → **各 4 命中**，上下文为独立 chunk `createLucideIcon-BQaXGXGF.js`（见下）
- `grep -a -c 'renderSlot'`→0 已在条目5；Bo/Vo 绑定：`grep -a -o -E 'function Bo\(.{0,120}'` / `function Vo\(` → 命中的均为其他模块同名函数（数值取整、图表适配器），压缩名跨 chunk 不可靠绑定——但消费点已实锤（见下 1）
- `grep -a -o -E -- '--color-ring:[^;}]{0,90}'` → **0 命中**；`grep -a -o -F -- '--color-ring'` → 150 处，其中裸 `--color-ring` 仅 3 处且全部是 `var(--color-ring)` 引用（`grep -a -b -o -E -- '--color-ring[^-a-z]'` → 325816843/326268438/326268581）；`--color-ring-primary/secondary/info/danger/warning/success/inverse` 各 21 处，但 `grep -a -o -E -- '--color-ring-[a-z]+:[^;}]+'` 定义值 → **0 命中**（均为主题变量名字面量注册表 `F.literal("--color-ring-primary")…`）
- `grep -a -o -E -- '--tw-ring-color:var\(--color-[a-z-]+\)?' | sort | uniq -c` → 13 种引用：border-hover×3、input-border-focused×2、card×2、brand×2、background×2、remote-*×3、primary/popover-border/border/accent×各1——**无 `var(--color-ring)`**；`grep -a -o -F '.ring-ring{'` → 0（该类无独立编译定义）
- `grep -a -o -iE '#?0b7fff|#?4099ff'` → **#0b7fff×19、#4099ff×40**（批次原判「无法提取」的主要突破口），逐处切片定语境（见下 3）

**命中原文**：
1. ZCode 顶栏导航钮图标消费点（taskNav 组件，@331027500 切片）：`` h4,{title:N,shortcut:f,ariaLabel:N,testId:`desktop-top-nav-back`,disabled:!m,onClick:C,children:jsx(Bo,{className:`size-4`})} `` / forward 同构 `<Vo className:"size-4">`——图标组件渲染 **16px（size-4）**。
2. 图标本体 = **lucide `arrow-left`/`arrow-right`**（独立 chunk）：
```js
// createLucideIcon-BQaXGXGF.js
arrow-left:  [[`path`,{d:`m12 19-7-7 7-7`,key:`1l729n`}],[`path`,{d:`M19 12H5`,key:`x3x0zl`}]]
arrow-right: [[`path`,{d:`M5 12h14`,key:`1ays0h`}],[`path`,{d:`m12 5 7 7-7 7`,key:`xquz4c`}]]
```
   createLucideIcon 默认 24-viewBox、strokeWidth 2、round cap/join → ZCode 导航钮箭头 = **24-viewBox、描边 2、渲染 16px**。
3. focus 环机制（`var(--color-ring)` 3 处引用切片）：
```css
.composer-thought-slider:has(input:focus-visible){outline:2px solid var(--color-ring);outline-offset:2px}
.wf-tile:has(.wf-tile-hit:focus-visible){outline:2px solid var(--color-ring)}
/* @supports color-mix 档 */ outline:2px solid color-mix(in oklab,var(--color-ring) 40%,transparent); outline-offset:2px; border-radius:.5rem
```
   即 `--color-ring` 是 ZCode **focus outline 专用变量**（outline 2px + offset 2px + 40% color-mix 弱化档），与 uiplug 的 `outline:2px solid var(--dsw-focus-ring-color);outline-offset:-2px` 机制同构（offset 方向相反）。
4. #0b7fff/#4099ff 在 ZCode 的实际语义（均非 focus 环）：`--color-terminal-selection:#0b7fff38`、`--color-usage-chart-1:#0b7fff`、`--color-usage-heatmap-0:color-mix(in srgb,#0b7fff 0%,…)`、装饰渐变 `radial-gradient(circle at 82% 14%,#0b7fff33,…)`；`#4099ff` 为 arbitrary 工具类 `.border-\[\#4099FF\]`、`.bg-\[\#4099FF\]`、`.bg-\[\#4099FF\]\/22{background-color:oklab(67.8981% -.0471594 -.16635/.22)}` 及背景渐变 `color-mix(in srgb,#4099ff 24%,…)`。

**最终判定：升级为有参照（形态/机制不同），含两处保留。** ① 图标：ZCode 导航钮（`desktop-top-nav-back/forward`）= lucide arrow-left/right，**24-viewBox + 描边 2 + 渲染 16px**；uiplug 的 16-viewBox + strokeWidth 1.5 长箭头无同值对应（ZCode 16-viewBox stroke 图标全库仅 1 个且描边 1.2）——登记为图形规格差异项。② focus 环：机制参照实锤（`--color-ring` 专用变量、outline 2px/offset 2px/40% color-mix），但 `--color-ring` 的**定义值在 asar 静态内容未提取到**（仅 3 处 var 引用，定义在运行时主题数据；ring-primary 等族同样只有注册名无值）——环色数值维持「未提取到」，不得以 #0b7fff/#4099ff 冒充：这两个色值在 ZCode 是终端选区/用量图表/装饰渐变/arbitrary 工具类语义。

---

## 条目5 · PluginConfigSection.tsx 整体机制（uiplug `:18-26,:43-47,:113`：FORWARDED_CONFIG_SLOTS / SlotEntryBoundary / data-slot+display:contents）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '(renderSlot|FORWARDED_CONFIG_SLOTS|SlotEntryBoundary|bindPluginConfigLocale|createPluginConfigSection|DelegatedOfficialSlot)' $A | sort | uniq -c` → **0 命中**（维持原判）
- `grep -a -o -E 'data-slot[=:][^,}"`]{0,45}' | sort | uniq -c | sort -rn` → 全部为 shadcn 族组件样式钩子（`[&_[data-slot=select-trigger]]`、`data-slot=combobox-content`、`select-value`、`scroll-area-thumb`、`progress-indicator` 等 CSS 选择器），**无「插件插槽注入」语义的 data-slot**
- `grep -a -o -E '(display:"contents"|display:`contents`|"display":"contents"|display: ?contents)' | sort | uniq -c` → 20 处，切片核对语境：diff 视图（`[data-diff-type=split][data-overflow=wrap] [data-deletions]{display:contents}`）、tailwind 工具类 `.contents{display:contents}`、dir 包装 `style:{display:`contents`}`、diffs-container——**无插槽容器 contents 化同构**
- `grep -a -c 'getDerivedStateFromError'` → 19；`grep -a -o -E '.{60}ErrorBoundaryContext.{80}'` → **react-error-boundary 库完整在包**：`exports.ErrorBoundary=y;exports.ErrorBoundaryContext=c;exports.getErrorMessage=B;exports.useErrorBoundary=p;exports.withErrorBoundary`——组件级错误边界隔离是 ZCode 前端惯例（与 SlotEntryBoundary 的 `getDerivedStateFromError` 手写 class 同构），但未与「官方页副本」组合
- `grep -a -o -E '"data-testid":`[a-z-]*plugin[a-z-]*`' | sort | uniq -c` → **ZCode 官方插件页 testid 族 ~70 个实锤**：plugin-store-*（root/hero/card/detail/config/sources/uninstall-dialog/menu-enabled/uninstall-confirm…约 60 个）、plugin-settings-*（plugin-row/search/detail-back/workspace-scope-hint）、plugin-ui-*（pin-toggle/retry/side-pane-placeholder）、side-pane-plugin-market
- 插件 UI 呈现方式切片：`plugin-ui-side-pane-placeholder` = `` rounded-lg border border-border bg-surface px-3 py-2 text-ui-sm text-foreground-subtle ``；`plugin-store-open-ui` 按钮 `variant:`secondary`,"data-plugin-id":e.id,onClick:…t.onOpenUi?.(e)`——**ZCode 插件的 UI 面是独立侧栏 side-pane（onOpenUi），不是设置页插槽注入**
- `grep -a -o -E '"plugins\.[a-zA-Z.]+"'` → 仅文件名（plugins.js/ts/json）；`"(extensions|marketplace)\.[a-zA-Z.]+"` → 均为 VS Code 配置键（extensions.update.enabled 等）

**最终判定：确认无参照（absent），补两条周边事实。** 「官方页副本 + renderSlot 插槽转发 + 单卡 ErrorBoundary」机制在 ZCode 无对应物：官方插件页（plugin-store/plugin-settings testid 族）是本体且不向插件开放页内插槽（renderSlot 0、data-slot 均为 shadcn 样式钩子、display:contents 无插槽语境）。周边事实①：ZCode 插件的 UI 出口是**独立 side-pane**（`plugin-store-open-ui` → onOpenUi），uiplug 若要「插件提供设置片段」在宿主无先例可参照。周边事实②：「单卡崩溃不拆整页」的隔离惯例本身有库级对应（react-error-boundary 完整在包、getDerivedStateFromError×19），SlotEntryBoundary 与之机制同构，仅边界粒度（slot entry）是插件自有设计。

---

## 结论对批次10 的回写建议

1. 条目3、4 改判「有参照」：Windows 标题栏适配（platform-windows-desktop + env(titlebar-area-height,48px) + WCO）、导航钮图标（lucide arrow-left/right 24-viewBox/描边2/渲染16px）、focus 环机制（--color-ring 专用变量 outline 2px/offset 2px）——均按「机制/形态不同」差异项登记；`--color-ring` 定义值与「全屏隐藏」两个子项维持未提取/无参照。
2. 条目2 部分改判：测量新鲜度（WhileDragging+Optimized）有参照；±4px 中点、0.5px 容差、冲突告警维持插件自有增强；补记 `project-session-drop-target`（inset-0 border-2 border-icon-blue）。
3. 条目1、5 维持确认无参照；条目5 补记官方插件页 testid 族与 side-pane 出口，供后续「插件 UI 面」设计决策引用。
4. 08-performance-audit.md 的 400ms 已澄清为「导航移除兜底」语境（:42），与哨兵 REPORT_DELAY_MS 无关，避免后续批次误引。
