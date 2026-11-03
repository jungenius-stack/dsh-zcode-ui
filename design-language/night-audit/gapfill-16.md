# 补采 16 · 批次 16「无参照项」复核（hover-shell / sidebar-drag / workspace-directory-flow / session-host）

> 复核时间：2026-10-30。只读复核，未改任何 src/tests/既有文档；仅新建本文件。
> 参照源：`/Applications/ZCode.app/Contents/Resources/app.asar`（341MB，`grep -a`）；
> 主 bundle `/tmp/zcode-main-bundle.js`（styles-CQuzX8si.js, 6705135B）与样式表
> `/tmp/zcode-styles.css`（styles-9Z13W0KP.css, 470091B）沿用批次 16 已提取产物（本次核验存在且大小一致）。
> 命中归属文件用 Python 解析 asar header（hsize=7269392, DATA_START=7269396）映射 grep -b 偏移。
> 关键修正：批次 16 用 `(0,X.Vw)` 跨命名空间搜 HoverCard 消费方得 0，**漏掉了同模块作用域直接调用**；
> 本轮改按 `jsx(Vw,{` 同作用域提取，找到 6 个真实调用点。此前「无富悬停卡/无关闭延迟」结论据此部分推翻。

---

## 条目 1 · hover-shell.tsx 悬停卡宽度/估高（316/248、估高 152/148）—— **半升级：宽度有参照；估高维持无参照**

**搜索过的模式**（bundle=主 bundle，css=styles-9Z13W0KP.css，asar=全库；均为实跑）：
`hover-card[a-zA-Z-]*`（asar 34：主 bundle 11 + css 4 + 其余在 @radix-ui/react-hover-card 包文件）、
`HoverCard[A-Za-z]*`（asar 178：主 bundle 16，其余在包源码/类型）、
`data-radix-hover-card[a-z-]*`（bundle 0，CSS 变量以 `--radix-hover-card-content-*` 形式存在）、
`HoverCardRoot`（0）、`HoverCard:[A-Za-z_$]+`（8，全部为 `__scopeHoverCard:t/n/r` 的子串，非消费方）、
`@radix-ui/react-hover-card`（包文件命中）、
`[A-Za-z_$][A-Za-z0-9_$]*\.(Vw|Uw|Hw)\)`（asar 0 —— 跨命名空间搜法，本轮已证方法有误）、
`jsx(Vw,{`／`jsx(Uw,{` 同作用域提取（命中 6 调用点 + 6 Content 实参）、
`w-\[316px\]`/`w-\[248px\]`/`width:316`/`width:248`（全部 0）、
`w-72`（css 4/bundle 13）、`w-64`（css 6）、`w-80`（css 6）、`min-w-72`（css 1）、`max-w-72`（css 2）、
`estimatedHeight`（bundle 0）、`estimateHeight`（bundle 0）、`EstimatedHeight`（asar 16，全部在
`node_modules/@extend-ai/react-docx/dist/index.*`，与 UI 定位无关）、`avoidCollisions`（bundle 3）。

**命中原文**：
- ZCode 应用内**存在**富悬停卡组件且被真实使用（6 个调用点，全在主 bundle）：
  - 封装层：`function Uw({className:e,align:t=\`center\`,sideOffset:n=4,...}){...(0,$.jsx)(v_e,{...\`data-slot\`:\`hover-card-content\`,align:t,sideOffset:n,className:Z(\`z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-lg bg-popover p-2.5 text-ui-base/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 ...`
  - 实际内容宽度（6 处 Content 实参）：`w-80 max-w-[calc(100vw-2rem)]`（remote-identity-details，`role:\`tooltip\``,side:right）、`w-80 max-w-[min(20rem,calc(100vw-2rem))]`（status todo 预览，`data-status-todo-preview-content`）、`w-80 max-w-[calc(100vw-2rem)]`（模型/连接状态卡）、`!w-64 ... bg-tooltip p-0`、`w-[min(24rem,calc(100vw-2rem))]`（24rem=384px）、封装默认 `w-72`（288px）。
  - 延迟实参见条目 2。
- 定位机制：Radix popper（`avoidCollisions:d`/`avoidCollisions:g` + `--radix-hover-card-content-available-height/width`），**全库无任何手动估高逻辑**。
- 与设计文档互证：gapfill-6.md:99 已采样 ZCode 项目悬停卡（`sht`，Radix HoverCard，openDelay:300，内容 `w-80 max-w-[calc(100vw-2rem)] rounded-xl p-3`）；gapfill-18.md 已采任务行悬停面=原生 title+右侧 tooltip（max-w-48）；02-motion.md:44 记录浮层「320px」。
- 侧栏任务行本身确无悬停卡（行组件 `group/task-row` 只有 `onMouseEnter:()=>ae(!0)` 本地 hover 态 + `(0,$.jsx)(KF,{as:\`span\`,...,title:N})` 原生 title）——批次 16 该半句维持成立。

**最终判定**：**半升级计入 found**。宽度半条：ZCode 应用级富悬停卡有**固定宽**惯例（封装默认 w-72=288px，实际用得最多 w-80=320px ×3，区间 256–384px）——批次 16「ZCode 非固定宽、不构成直接参照」仅对 Tooltip 成立，对本仓同类交互（富悬停卡定宽）已有可对账参照：本仓 workspace 卡 316 与 ZCode 主值 320（w-80）仅差 4px，session 卡 248 仍无固定宽对应（最近参照仍是 gapfill-18 的行悬停面）。估高半条：**确认无参照**（ZCode 靠 popper 弹性定位 + avoidCollisions，无估高概念；`EstimatedHeight` 仅存在于 docx 渲染库）。

---

## 条目 2 · hover-shell.tsx 隐藏延迟 HOVER_TIP_HIDE_DELAY_MS=120 —— **升级：有参照（机制同名 + 数值带）**

**搜索过的模式**：`closeDelay`（asar 24：主 bundle 8、其余 @radix-ui/react-hover-card 与 @floating-ui/react 包文件）、
`closeDelay:[0-9]*`（bundle：`closeDelay:0` ×1、`closeDelay:160` ×1、`closeDelay:80` ×2、变量 `closeDelay:iht` ×1、`closeDelay:t` ×2、`closeDelay:s` ×1）、
`openDelay:[0-9]*`（bundle：`openDelay:120` ×3、`openDelay:300` ×1、`openDelay:0` ×1）、
`[a-zA-Z_$][a-zA-Z0-9_$]*Delay:[0-9]{1,6}` 全 asar 枚举（25 种取值，含 `hideDelay:100` ×5、`showDelay:0` ×5）、
`hideDelay`（asar 67，**全部**在 echarts dist 与 pptx 渲染库——echarts tooltip 库默认 showDelay:0/hideDelay:100，非应用 UI 代码）、
`showDelay`（asar 33，同上归属）、`skipDelayDuration`（asar 18：主 bundle 4 + Radix tooltip/navigation-menu 包）、`iht=[^,;]+`（→ `iht=100`）、
`delayDuration`（沿用批次 16：全局 Provider 300 / 标签页 1500 / 预览区 0）。

**命中原文**：
- Radix HoverCard 根组件自带关闭延迟（库默认）：`i_e=e=>{let{...openDelay:o=700,closeDelay:s=300}=e,...`
- 应用真实调用点（6 处全列举）：插件同步日志卡 `Vw,{closeDelay:160,openDelay:120,...}`（i18n `settings.plugins.remoteSync.logTooltip`）；连接/项目状态卡 `Vw,{...openDelay:300,closeDelay:iht,...}`（`iht=100`，即 gapfill-6.md:99 采样的项目悬停卡）；token 环形图卡 `Vw,{closeDelay:0,openDelay:0,...}`；todo 状态预览卡 `Vw,{closeDelay:80,open:r,openDelay:120,...}`；chat 导航轨道按钮卡 `Vw,{closeDelay:80,openDelay:120,...}`；通用包装 `E$e=({openDelay:e=0,closeDelay:t=0,...})=>(0,$.jsx)(Vw,{closeDelay:t,openDelay:e,...})`。
- 弱参照（库级）：echarts tooltip `hideDelay:100/showDelay:0`（pptx 预览引擎内），非应用设计决策。
- 设计文档互证：02-motion.md:44（§5）已采「浮层 openDelay 120ms / closeDelay 80ms（Radix 参数）」；gapfill-7.md:13 复核 `openDelay:120 ×3、closeDelay:80 ×2` 与之一致。

**最终判定**：**升级计入 found**。批次 16 的「ZCode 无关闭延迟常量」只对 Radix **Tooltip** 成立（Tooltip 确无 closeDelay 概念）；ZCode 的**富悬停卡**关闭延迟载体就是 HoverCard `closeDelay`，应用内观测值 {0, 80, 100, 160}ms、主值 80ms（×2，与 02-motion §5 采值一致）。本仓 hide 120ms 落在该数值带内；若要收口，对账点为 80ms（02-motion §5 基准）或按场景分档（日志 160 / 状态卡 100 / 导航预览 80）。

---

## 条目 3 · sidebar-drag.ts 越限收起手势 COLLAPSE_OVERSHOOT_PX=32 —— **确认无参照（但收起触发方式已定位）**

**搜索过的模式**：`z5\(`（clamp 函数全部调用点上下文）、`wr=`/`Cr=`/`Tr=`/`Er=` pointer 事件链全文提取、
`pBn=[0-9]*`（→ `pBn=16`）、`isCollapsed`（bundle 全部命中为 Lexical 编辑器选区噪声）、
`--sidebar[a-z-]*`（css/bundle 仅 `--sidebar-task-list-divider`——**注意该前缀漏检**，后补搜）、
`workspace-sidebar-panel-width`（bundle 2 + css 2）、`data-sidebar[a-z="-]*`、`WorkspaceShell[A-Za-z]*`（2/6）、
i18n `id:\`…[Cc]ollapse…\``（`commandCenter.collapseHistory`/`modelTrajectory.collapse`/`settings.skills.diagnostics.collapse`/`sidePane.collapse`）、
`sidePane\.[a-zA-Z0-9.]*`（36 键全枚举）、`sidePane.collapse` 与 `sidePane.togglePanel` 上下文、
`onDoubleClick`（bundle ×1，非侧栏）、侧栏相关 `dblclick`（0）、`data-testid` 含 collapse/expand/toggle（0）、
`Yzn`/`F5`/`Qzn`/`Xzn`/`Zzn` 收起派生函数、`Kzn=[0-9]*`（→ 24，另有 `Wzn=.5/qzn=48/Gzn=352/Jzn=168`）、
`activeTaskId`（服务条目 5 顺带覆盖收起态传参）。

**命中原文**：
- 横向拖拽链**无任何收起分支**（三段全文）：
  - 按下 `Cr=(0,Q.useCallback)(e=>{if(!cr||e.pointerType===\`mouse\`&&e.button!==0)return;...Un.current={containerWidthPx...,startWidthPx:Kn.current,startX:e.clientX},I5({active:!0,...}),e.currentTarget.setPointerCapture(...)...`
  - 移动 `wr=(0,Q.useCallback)(e=>{...let n=z5(t.startWidthPx+e.clientX-t.startX,t.containerWidthPx);xr(n),e.currentTarget.setAttribute(\`aria-valuenow\`,String(Math.round(n)))},[xr])` —— 仅 clamp + 写值，与批次 16 判定一致；
  - 抬起 `Tr=(0,Q.useCallback)((e,t=!1)=>{...Un.current=null,I5({active:!1,...}),Gn(e=>{let t=Kn.current;return e===t?e:t}),...t||B5(Kn.current)},[])` —— 释放捕获 + 持久化（localStorage 键 `zcode:workspace-shell:sidebar-width-px`，常量 `dBn`），无收起。
- 键盘微调（非手势收起）：`Er`：ArrowLeft/Right ±`pBn`(16px)、Home→`R5`(264)、End→容器×0.5。
- ZCode 侧栏**收起入口是按钮/状态切换，不是拖拽**：`sidePane.togglePanel`（带 shortcutLabel 的 `Dv` tooltip 按钮，`SDn({isSidePaneOpen,onToggleSidePane,...})`）；`sidePane.collapse`/`sidePane.expand`（窗口标题栏式切换钮 `CDn` + 移动端遮罩按钮 `data-mobile-side-pane-overlay`）；移动/远控态经 `Nr=...!on||!En||(mn(!0),...)` 置 `isCollapsed:pn`。
- ZCode 唯一「拖过头收起」手势在**另一块面板的纵轴**：Web 远控导航垂直面板 `F5({heightPx,viewportHeight})`：`r<=Kzn?{heightPx:0,isCollapsed:!0}`，`Kzn=24`——是「高度≤24px 即收起」的阈值语义，且拖拽的是高度（`startHeightPx+e.clientY-n.startY`），与侧栏横向「越过最小宽再多拖 N px」的 overshoot 语义不同轴不同构。
- CSS 变量落点：`mBn=\`--workspace-sidebar-panel-width\``、`hBn=\`--workspace-sidebar-width\``，侧栏元素 `id:\`sidebar\`` 用 `w-[var(--workspace-sidebar-panel-width)] max-w-[50%] ... transition-[width,opacity]`；03b-sidebar.md:43/99 的「拖拽区间未采集」声明维持。

**最终判定**：**确认无参照（计入 absent）**。全模式搜索未检出任何「越过最小宽再 overshoot N px 触发收起」的逻辑；32px 手势在 ZCode 无对应物。补充新事实（非参照）：ZCode 侧栏横向拖拽根本**没有收起能力**，收起靠按钮/快捷键/移动遮罩；唯一的拖拽收起手势在远控导航纵轴（阈值 24px）。若 uiplug 要「一比一继承」，该手势应登记为「ZCode 无、本仓多出的适配能力」而非对齐项。

---

## 条目 4 · workspace-directory-flow.ts 槽转发机制 —— **确认无参照（维持原判，正向载体已补采）**

**搜索过的模式**（全 asar，全部实跑计数）：`directoryFlow`（0）、`directory-flow`（0）、`DirectoryFlow`（0）、
`DIRECTORY_FLOW`（0）、`sidebar.workspaces`（0）、`sidebar.codex`（0）、`entriesOfSlot`（0）、
`slots.inject`（0）、`SlotMap`（0）、`StoredEntry`（0）、`@deepseek-ai`（0）、`dsh-client-ui-workspace`（0）；
正向替代载体：`selectDirectory`（24）、`workspaceFolder`（33）、`workingDirectory`（10）、`openDirectory`（7）、
`showOpenDialog`（4）、`DirectoryPicker`/`directoryPicker`/`folderPicker`（0）、
i18n 键 `id:\`…directory…\``（`directoryBrowser.title/selectDir/go/noSubdirs/errorSystem/errorUnavailable/opening/pathPlaceholder` 等）。

**命中原文**：槽系统侧零命中（12 个模式全 0）；正向侧 ZCode 有自己的目录选择实现：
`directoryBrowser.*` i18n 键组（`directoryBrowser.selectDir`、`directoryBrowser.pathPlaceholder` 等）+ `selectDirectory` ×24 + Electron `showOpenDialog` ×4。

**最终判定**：**确认无参照（计入 absent）**。ZCode 不存在 DSH 槽注册/转发机制（连 `@deepseek-ai` 字符串本身都为 0），目录选择走原生 `directoryBrowser` 组件 + `selectDirectory`/`showOpenDialog`。本仓的 `sidebar.workspaces.directoryFlow → sidebar.codex.directoryFlow` priority -1 转发属宿主架构差异，维持「无从对账」结论。

---

## 条目 5 · session-host.ts 面板打开取消选中 / 未读合成 —— **半升级：未读合成有参照；取消选中确认无参照**

**搜索过的模式**：`visibleSelectedSessionId`（asar 0）、`sessionRowUnread`（asar 0）、`completionUnread`（asar 0）、
`aria-selected`（bundle 12）、`data-selected`（bundle 34/css 11）、`is-selected`（0）、`aria-current`（7）、
`selectedId`（6）、`selectedSession`（4——全部是设置页会话迁移导入的 `selectedSessionIds` 复选框，非侧栏）、
`clearSelection`（16——同迁移导入页）、
unread 族枚举：`unreadAt`（39）、`UnreadOverlayByEntityKey`（20）、`unreadTaskKeys`（15）、`UnreadHistory`（2，属 coding-plan 用量历史已读态，非侧栏）、`UnreadIndicator`、`unreadSignal`、
`taskUnreadOverlayByEntityKey` 全链路提取、`setTaskUnreadOverlay\(`→包装 `Q7e`→调用方、
`group/task-row` 行组件全文（含 `R=FT(i,a)===T&&o===e.taskId`）、`hit(e,t)` 状态函数、
`` `unread` `` 字面量上下文、`activeTaskId:null`（×1）/`activeTaskId:void 0`（×0）、
`markTaskAsUnread`（2，`onMarkTaskAsUnread` 动作 prop 链）、
设计文档：04-open-gaps.md 对 `visibleSelectedSessionId|sessionRowUnread|completionUnread|取消…选中|未读` 0 命中；03b-sidebar.md 仅 hover 底/槽位相关（:112/:116/:137）。

**命中原文**：
- **未读合成（升级）**——ZCode 未读是 `unreadAt` 时间戳状态 + 「选中即清除」：
  - 状态推导：`function hit(e,t){return t?.phase===\`error\`||!t&&e.status===\`error\`?\`error\`:typeof e.unreadAt==\`number\`?\`unread\`:t?.phase===\`prewarming\`||t?.phase===\`running\`?\`loading\`:\`none\`}`（优先级 error > unread > loading > none）。
  - 行渲染：任务行 `B=M===\`error\`?\`bg-destructive\`:M===\`unread\`?\`bg-sky-500 dark:bg-sky-400\`:null`；另一处 `U===\`unread\`?(0,$.jsx)(\`span\`,{"data-unread-indicator":\`true\`,className:\`size-[7px] rounded-full bg-icon-blue\`})`。
  - **选中触发清除**：`...if(b){Q7e(g,void 0);let e=...;e?e.zcodeTaskService.setTaskUnread({...g,unread:!1,expectedUnreadAt:y}).then(e=>{$7e(g,e.unreadAt),K5()}).catch(e=>{e9e(g,v),Y7e([g]),K5(),J.warn(\`[App] 选择 task 时清除未读状态失败\`...`——即乐观清 overlay（`Q7e(g,void 0)`）→ 服务端 `setTaskUnread({unread:!1,expectedUnreadAt})` → 成功 reconcile（`$7e`）/失败回滚（`e9e`）。
  - 未读可手动保留：右键动作 prop `onMarkTaskAsUnread` 贯穿任务行组件链（×2 命中）。
- **取消选中（无参照）**——侧栏高亮是纯状态驱动：`R=FT(i,a)===T&&o===e.taskId`（`o=activeTaskId` prop，来自 workspace 持久 state `co.getState().getWorkspaceState(...).activeTaskId`）；`activeTaskId:void 0` ×0、`activeTaskId:null` 仅 ×1（`zht({switcher:c.webRemoteControlWorkspaceSwitcher,...,activeTaskId:null,...})`，远控切换器，非面板开合）；命令中心组件 `Yit=({open:e,commands:t,...,activeTaskId:i,...,onSelectTask:c,...})` 只消费不写入。未发现任何「全局面板打开→侧栏取消高亮」路径。

**最终判定**：**半升级计入 found**。未读半条：ZCode 侧「选中 ⇒ 不显示未读」的语义由**写时清除**实现（select→清 `unreadAt`，乐观+服务端对账+回滚），本仓 `sessionRowUnread = localUnread || (completionUnread && !selected)` 是**读时合成**——语义同构、机制不同（ZCode 无 `completionUnread` 瞬态、未读可手动标记），`!selected` 子句的对账点即 ZCode clear-on-select。取消选中半条：**确认无参照**——ZCode 侧栏选中态是持久 `activeTaskId`，面板打开不抑制高亮，静态源码无该行为记录，维持「未验证/无例证」；如需闭环仍须双端活体 CDP（静态证据只能证明「源码无此路径」，不能证明活体无此表现）。

---

## 汇总

| 条目 | 原判定 | 复核判定 | found/absent |
|---|---|---|---|
| 1 悬停卡宽度/估高 | 无参照 | 宽度有参照（ZCode 富悬停卡定宽 w-72/w-80，316≈320）；估高仍无参照 | **found**（半条） |
| 2 隐藏延迟 120ms | 无参照 | HoverCard `closeDelay` {0,80,100,160}，主值 80（02-motion §5） | **found** |
| 3 越限收起 32px | 未定位 | 确认无参照；收起入口=按钮（sidePane.togglePanel/collapse/expand），唯一拖拽收起在远控导航纵轴（阈值 24px） | absent |
| 4 directoryFlow 槽转发 | 无对应机制 | 确认无参照；正向载体=原生 directoryBrowser + selectDirectory/showOpenDialog | absent |
| 5 取消选中/未读合成 | 未验证 | 未读半条有参照（ZCode clear-on-select ↔ 本仓 `!selected` 合成）；取消选中半条确认无源码路径（活体仍须 CDP） | **found**（半条） |

**found=3、absent=2**（条目 1、5 为半条升级，已在判定中注明另一半维持无参照）。

### 方法备注（可复现）
- 命中文件归属：Python 解析 asar header（`hsize=7269392`、`jlen=7269382`、`DATA_START=4+hsize=7269396`）+ `grep -a -b -o` 偏移映射，HoverCard/hideDelay/closeDelay/EstimatedHeight 的分布均由此得出。
- 本轮修正的方法论教训：`(0,X.Vw)` 式跨命名空间搜索对**同 chunk 同作用域直接调用**（`jsx(Vw,{`）失效——批次 16 「bundle 内未检出消费方」的部分结论源于此，非 ZCode 侧真无。
- 涉及活体行为的判定（条目 5 取消选中半条）仍标注：静态证据只能证明「源码无此路径」，活体结论须双端 CDP。
- 本批未改任何 src/tests/既有文档；/tmp 中间产物沿用批次 16 已提取文件，未新建项目内文件。
