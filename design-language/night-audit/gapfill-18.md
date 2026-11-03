# gapfill-18 · 批次补采 18（session-tree.tsx 五条「无参照」项复挖）

> 2026-10-30 夜间审计补采批次 18（只读，仅新建本文件）。对象：批次 18 审计中因「查不到 ZCode 参照」跳过的 5 条；模块 `src/client/session-tree.tsx`、`src/client/schedule-group-actions.ts`、`src/client/draft-attachments.ts`。
> 方法：以 `session-tree.tsx:169` 注释里引用过的 ZCode 类名串 `size-3.5 animate-spin text-foreground-subtle` 与独特类名 `task-title-marquee-track` 为锚，在 app.asar（341,377,861 B）中 `grep -a -b -o` 定位 ZCode 任务行组件区（@328502511–328640000），再用 python mmap 整段提取组件源（`k_t` 分组任务行 / `kyt` TaskListItem / `Vvt` 菜单内容 / `CF` 悬停按钮 / `KF` 标题跑马灯），逐条比对；同步复读 `03b-sidebar.md` §4/§5、`03k-context-menu.md`、`uiplug/docs/ZCODE-INTERACTION-PARITY.md` §1.2。
> 本轮实跑命令清单（`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -b -o 'task-title-marquee-track' $A` → @326264117(CSS)/@328538600/@328538644(JSX)
> - `grep -a -b -o 'animate-spin text-foreground-subtle' $A` → 10 处，任务区在 @327991063–328544916
> - `grep -a -o 'taskList\.[a-zA-Z]*' $A | sort | uniq -c | sort -rn` → 48 个键全量枚举
> - python mmap dump：@328538600±3000（KF+k_t 行组件）、@328541400–328547500（k_t 后半+tooltip+菜单挂载）、@328504200–328512500（mgt/hgt 类串+`ggt` 分组菜单全文）、@328593200–328596600（`Vvt` 菜单序列全文）、@328610000–328617000（kyt props+行内动作）、@328628000–328630000（TaskList 父组件 iF+aF 包 ul）、@328636900–328637800（virtual-project-row 键盘合成 contextmenu）、@331530100–331532600（WorkspaceFileTree 树行）
> - `grep -a -b -o 'function CF('`、`'function ggt('`(→@328504834)、`'function ogt('`(→@328502511)、`'onOpenTaskContextMenu'`(4 处)
> - `grep -a -c 'treeitem'`(6 行)/`-b -o`(17 处)、`'aria-selected'`(54 行)、`'aria-level'`(18 处)、`'contextmenu'`(168 行)
> - `grep -a -o '.\{40\}icon-xs.\{90\}'`、`'size:{[^{]*icon[^}]*}'` → Button size 档位记录两套全量
> - `grep -a -o '"[a-zA-Z.]*":`[^`]*分支[^`]*`'`、`'[^`]*分屏[^`]*'`、`'"appHeader.openIn[a-zA-Z]*":`[^`]*`'`、`'fileManagerLabel:[^,}]*'`
> - 仓库侧：Read `session-tree.tsx`/`tree-keyboard.ts`/`schedule-group-actions.ts`/`draft-attachments.ts` 全文；`grep -n 'dcu-wb-more' CodexWorkspaceBrowser.tsx`；复读 03b §4「未覆盖」与 §5 活体定案。

---

## 条目 1 · SessionHoverCard 内容裁剪（只留标题+分支，去时间/项目）—— **升级：有参照（ZCode 悬停面已采齐，机制同构、内容不同）**

**原跳过理由**：`session-tree.tsx:52-54` 自述由 DSH 实测反馈驱动；ZCode 任务行悬停卡内容未采集，无例证。

**本轮搜索过的模式**（全部实跑）：`task-title-marquee-track`（锚点定位）、`animate-spin text-foreground-subtle`、`taskList\.[a-zA-Z]*` 全量枚举、`` "[a-zA-Z.]*":`[^`]*分支[^`]*` ``、mmap 整段提取 k_t 组件与其 tooltip；复读 03b §5。

**命中原文**（ZCode 任务行的悬停信息面共两层）：
1. **原生 title 属性**（完整标题走浏览器 tooltip）：`KF({as:e=\`p\`,...,title:r,...})` 组件把 `title` 透传到 DOM——分组行 `(0,$.jsx)(KF,{as:\`span\`,className:\`text-foreground\`,title:y?void 0:N,children:N})`（@328541400 区段）。
2. **styled tooltip（分组行）** @328545800 区段：
   ```
   (0,$.jsxs)(Tv,{side:`right`,align:`center`,sideOffset:6,children:[
     r?(0,$.jsx)(fs,{`aria-hidden`:`true`,className:`size-3.5 shrink-0`}):(0,$.jsx)(Ds,{`aria-hidden`:`true`,className:`size-3.5 shrink-0`}),
     (0,$.jsx)(`span`,{className:`min-w-0 max-w-48 truncate`,children:c}),
     P.length>0?(0,$.jsxs)($.Fragment,{children:[
       (0,$.jsx)(`span`,{className:`text-tooltip-foreground/60`,children:`·`}),
       (0,$.jsx)(`span`,{className:`inline-flex shrink-0 items-center gap-1`,children:P.map(e=>(0,$.jsx)(`span`,{className:e.startsWith(`+`)?`text-diff-added`:`text-diff-removed`,children:e},e))})]}):null])}
   ```
   即：**远程/本地图标(14px) + 工作区名(max-w-48 truncate) + `·`(60% 弱分隔) + 变更统计 `+N`(text-diff-added)/`-N`(text-diff-removed)**；`P=ygt(Det(e))` 生成 `+added`/`-removed` 数组。
3. **没有的东西（实证）**：tooltip 无时间（时间 `F=wA(e.updatedAt,x)` 行内右侧常驻：`O?null:(0,$.jsx)(\`span\`,{className:\`mr-1\`,children:F})`，相对时间键 taskList.justNow/minutesAgo/hoursAgo/daysAgo）；`taskList.*` 48 键全量枚举**无 branch 类键**；`` "[a-zA-Z.]*":`[^`]*分支[^`]*` `` 的 8 个命中全在 git 面板（git.actionMenu.* 等），任务行无分支显示。

**最终判定**：升级为有参照。ZCode 任务行悬停面 = **原生 title（完整标题）+ 右侧 tooltip（工作区名·±diff）**，其「不重复行内/层级已有信息」机制与本仓裁剪逻辑同构：时间行内已有→tooltip 无；标题截断→原生 title 兜底；工作区名分组行行内没有→放进 tooltip。本仓 SessionHoverCard（标题+分支）内容选择是自定适配：**分支在 ZCode 任务行无对应物**，±diff 统计是 ZCode 有而本仓无的槽位。→ 计入 **found**（悬停卡构成可对账；若收口：本仓裁剪决策维持，diff 统计槽位可登记为「ZCode 有、本仓无」观察项）。

---

## 条目 2 · sessionMenuItems 声称对齐 TaskActionMenuContent 的**条目顺序** —— **升级：有参照（菜单序列在 asar 逐字命中；唯一对不上的是「分屏」条目）**

**原跳过理由**：组件名已压缩，`grep TaskActionMenuContent` 零命中，顺序无从取证；文案词汇侧已证。

**本轮搜索过的模式**（全部实跑）：`taskList\.pin[`,]` 定位代码用法（3 处：@328594367/@328616776/@328618315）→ 顺藤 `Vvt` 菜单内容组件全文、`ggt` 分组菜单全文、`function ogt(`（打开位置标签平台分派）、`"appHeader.openIn[a-zA-Z]*"` 全量、`分屏` 全库检索；复读 `ZCODE-INTERACTION-PARITY.md` §1.2（其基于 ZCode 3.15.1 源码的声称）。

**命中原文**（`Vvt` @328593633 起，即 TaskListItem 共享菜单内容；容器 `oF w-52`，与 PARITY §1.2「菜单宽度 w-52」吻合）：
```
pin/unpin(taskList.pin/unpin) → rename(taskList.rename) → archive/unarchive(taskList.archive/unarchive)
→ markAsUnread(taskList.markAsUnread) ‖ (m=Separator)
→ openPath(r=fileManagerLabel) → copyPath(appHeader.copyPath) → copyTaskPath → copyLogPath
→ copySessionId(appHeader.copySessionId,条件) → goToProviderConfig ‖ (cF=Separator)
→ viewModelTrajectory(taskList.viewModelTrajectory,条件) ‖ (cF) → feedback(taskList.feedback,条件)
```
配套实锤：
- **「打开位置」标签平台分派** `ogt(e)` @328502511：`igt()`=/mac/i → `appHeader.openInFinder`（「在 Finder 中打开」）；windows → `openInFileExplorer`（「在资源管理器中打开」）；否则 `openInFileManager`（「在文件管理器中打开」）——本仓 `sessions.openPath`=「在资源管理器中打开」同位同机制。
- **分组列表另有菜单 `ggt`** @328504834（容器 `w-56`）：moveToGroup(含移出分组+分组子菜单) → moveToTop ‖ rename → archive → markAsUnread ‖ openPath → copyPath → copyTaskPath → copyLogPath → copySessionId → goToProviderConfig ‖ feedback——「去向」类条目打头是分组版特有。
- **条件挂载模式**：copySessionId/viewModelTrajectory/feedback 仅在回调传入时渲染（`w?…:null`），禁用项保留布局、`title=disabledReason`——与 PARITY §1.2「禁用项保留布局与层级」一致。
- **唯一对不上**：PARITY §1.2 声称管理组尾有「分屏」条目（`…→标记未读 → 分屏`）；当前 asar `` `[^`]*分屏[^`]*` `` 仅 1 处命中且在 `chat.toolCall.agent.output.hiddenRows` 文案，`openInSplit` 0 命中——**当前构建无「分屏」菜单键**，系文档（3.15.1 源码口径）与当前 asar 的差异。

**最终判定**：升级为有参照。`session-tree.tsx:62-64` 注释声称的结构逐项得证：管理组四项顺序 **置顶→重命名→归档→标记未读逐字命中**；路径与复制组 **「打开位置」打头逐字命中**（同位=「在 Finder 中打开」槽位）；尾部「调用轨迹‖反馈」也命中（本仓未收录这两项+本仓自加 fork/moveWorkspace/delete，为已声明的产品能力差异）。附带：本仓注释里「同 ZCode 以『在分屏打开』收尾」在当前 asar 无对应条目，建议改注或登记文档差异。→ 计入 **found**。

---

## 条目 3 · 树行键盘语义（role=treeitem、Enter/空格、roving tabindex）与 pointerMenuRect 贴指针开菜单 —— **升级：有参照（Enter/空格逐字同构；treeitem 仅存在于文件树；roving 是本仓自加；贴指针=radix ContextMenu 同构）**

**原跳过理由**：ZCode 侧行为未提取。

**本轮搜索过的模式**（全部实跑）：`treeitem`（17 处全偏移）、`aria-selected`、`aria-level`（18 处，328M+ 区仅 @332058765=workflow roster 标题，无关）、`contextmenu`（168 处，任务区仅 1 处）、`tabIndex` 相关段落 mmap、`onOpenTaskContextMenu` 4 处全链路。

**命中原文**：
1. **任务行键盘（两组件同款）**：
   - 分组行 `k_t` @328541400：`(0,$.jsx)(\`div\`,{role:y?void 0:\`button\`,tabIndex:y?void 0:0,...onClick:he,onKeyDown:be,...})`，其中 `be=e=>{e.target===e.currentTarget&&(e.key!==\`Enter\`&&e.key!==\` \`||(e.preventDefault(),he()))}`。
   - TaskListItem `kyt` 的 `li` @328616776：`tabIndex:0,onKeyDown:e=>{e.target===e.currentTarget&&(e.key===\`Enter\`||e.key===\` \`)&&(e.preventDefault(),V())}`。
   - 与本仓 `session-tree.tsx:202` 的 `if (event.target !== event.currentTarget) return; if (key==='Enter'||key===' ') { preventDefault(); onOpen() }` **语义逐字同构**（同守卫、同键、同 preventDefault）——注释「对齐 ZCode TaskListItem：行可聚焦、Enter/空格打开」得证。
2. **role=treeitem 的 ZCode 事实**：任务行**不是** treeitem——分组行 `role:'button'`、TaskListItem 是无 role 的 `li`；`treeitem` 全库 17 处，任务区为 0，唯一业务组件命中在 **WorkspaceFileTree 文件树行** @331530748：`(0,$.jsxs)(\`div\`,{role:\`treeitem\`,"data-testid":...,`aria-expanded`:w?t.expanded:void 0,tabIndex:0,draggable:!T,...onKeyDown:e=>{if(T&&e.key===\`Enter\`){e.preventDefault(),m(t.path);return}v(e,t)},...})`——树行=treeitem+aria-expanded 在 ZCode 有先例，但载体是文件树而非任务列表，且目录行 Enter 是**唤起右键菜单**而非打开。
3. **roving tabindex：ZCode 无此机制（实证）**：三处树形/列表行（分组行、kyt li、文件树行）全部**固定 `tabIndex:0`**（每行都进 Tab 序），无任何「全树单 Tab 站」逻辑。本仓 `tree-keyboard.ts` 的 roving + aria-level + 方向键是**超出 ZCode 的 ARIA 升级**（其文档头自述「为什么需要它」亦如此定位），不应标注为「对齐 ZCode」。
4. **pointerMenuRect 贴指针开菜单（同构实证）**：两条任务列表都用 radix ContextMenu——TaskList 父组件 @328628700：`(0,$.jsxs)(iF,{onOpenChange:e=>{e||I(null)},children:[(0,$.jsx)(aF,{asChild:!0,children:(0,$.jsx)(\`ul\`,{className:\`space-y-0.5\`,children:pe.map(he)})}),me?(0,$.jsx)(Ayt,{...菜单内容(Vvt)}):null]})`（trigger `aF` asChild 包整个 ul，右键任意行→菜单在指针处）；分组行同样 `iF`+`aF` asChild 包行 @328546800。**键盘唤起路径**：项目行 @328637249 显式合成指针事件：
   ```
   onKeyDown:e=>{if(e.key===`ContextMenu`||e.shiftKey&&e.key===`F10`){e.preventDefault();let t=e.currentTarget.getBoundingClientRect();e.currentTarget.dispatchEvent(new MouseEvent(`contextmenu`,{bubbles:!0,clientX:t.left+24,clientY:t.bottom}))}}
   ```
   菜单按 clientX/clientY 锚定=贴指针，与本仓 `pointerMenuRect(x,y)=new DOMRect(x,y,0,0)`（session-tree.tsx:106-108）同语义。

**最终判定**：升级为有参照。四个子声称全部落地：Enter/空格打开=**逐字同构命中**；贴指针开菜单=**同构命中**（radix ContextMenu+合成指针坐标）；role=treeitem=ZCode 仅文件树用（任务行是 role:button/li），本仓任务行用 treeitem 是自选语义升级；roving tabindex=ZCode **确无**，属本仓自加（建议在 session-tree.tsx:197 注释里把「行可聚焦、Enter/空格打开」（ZCode 对齐）与「treeitem/roving」（ARIA 升级）分开表述）。→ 计入 **found**。

---

## 条目 4 · 行内 quick-more 按钮几何（20×20、图标 16） —— **升级：有参照（Button size 档位全集命中；20×20=icon-xs 档；但 ZCode 行内快捷动作实为 24×24/14px）**

**原跳过理由**：`03b-sidebar.md` §4「未覆盖」明确置顶区/行内操作未采集，无 ZCode 例证。

**本轮搜索过的模式**（全部实跑）：`size:{[^{]*icon[^}]*}`（Button cva 档位记录）、`.\{40\}icon-xs.\{90\}`、mmap kyt 行内动作区（@328612800–328617000）、`CF` 组件定义（随 ggt dump 命中）、仓库侧 `grep -n 'dcu-wb-more' CodexWorkspaceBrowser.tsx`。

**命中原文**：
1. **ZCode Button size 档位记录**（主设计系统 Button，@icon-xs 上下文）：
   ```
   size:{default:`h-7 gap-1 px-2 ... [&_svg:not([class*='size-'])]:size-3.5`,
         xs:`h-5 gap-1 rounded-sm px-2 ... :size-2.5`,sm:`h-6 gap-1 px-2 ... :size-3`,
         lg:`h-8 gap-1 rounded-lg px-2.5 ... :size-4`,
         icon:`size-7 [:size-4]`,
         "icon-xs":`size-5 rounded-sm [:size-2.5]`,      ← 20×20，默认 svg 10px
         "icon-sm":`size-6 [:size-3]`,                    ← 24×24，默认 svg 12px
         "icon-md":`size-7 rounded-lg [:size-4]`,"icon-lg":`size-8 rounded-lg [:size-4]`}
   ```
   （另有一套内层记录 `"icon-xs":\`size-6 p-0\`,"icon-sm":\`size-7 p-0\``，属第二套按钮体系。）
2. **行内悬停按钮 `CF`** = `(0,$.jsx)(X,{type:\`button\`,variant:\`ghost\`,size:\`icon-sm\`,...,onMouseDown/onClick 阻断冒泡,"aria-label":e,children:t})` + 可选 `Dv` tooltip（side:`top`,sideOffset:2）→ **24×24**；消费处图标显式覆写：归档 `ds/Ro h-3.5 w-3.5`（14px）、文件树 `Hs size-3.5`、置顶 `zee size-3.5`、关闭 `Gc size-3.5`；容器 `"data-task-row-actions":\`true\``,className:`flex shrink-0 items-center gap-0.5`（2px 间距）。归档确认态换成 `X variant:\`destructive\`,size:\`sm\`,px-2` 红底**文本钮「确认」**(common.confirm)，行上挂 `"data-archive-confirming-task-id"`。
3. **行首 pin 按钮** @328616776：`X variant:\`ghost\`,size:\`icon-xs\`,className:\`inline-flex size-4 min-w-0 rounded-sm p-0 text-foreground-subtle !bg-transparent hover:text-foreground\` + 图标 hc size-4(16px)`——基档 20×20 被覆写成 **16×16、图标 16px**，悬停/聚焦才显示（`ke=_&&(le||ue)`，CSS 态控制，同本仓 SessionPinButton 手法）。
4. **本仓对照值**：`.dcu-wb-more{...width:20px;height:20px;border-radius:var(--dsw-radius-md);padding:0...}`（CodexWorkspaceBrowser.tsx:283）+ `<ZIconMore size={16}/>`（session-tree.tsx:213）；quick-actions 容器 gap:2px（:239）。
5. ZCode 任务行**无独立 ⋯ more 按钮**：菜单由整行右键/下拉触发（条目 3 的 aF 包行），行内只有 2–3 枚悬停动作钮（showTree/moveToTop/close 或 showTree/archive）。

**最终判定**：升级为有参照。`03b §4`「行内操作未采集」解除：ZCode 行内按钮有明确档位——**icon-xs=20×20（本仓 quick-more 的 20×20 与该档吻合）、icon-sm=24×24（ZCode 行内快捷动作实际档位，图标消费处覆写 14px）**；本仓「20×20+16px 图标」是 icon-xs 档几何 + pin 按钮的 16px 图标组合，与 ZCode 快捷动作（24×24/14px）不同。差异定性：本仓把行内槽收窄以适配宿主 32px 行高内的悬停接管架构（行首 16×20 槽既有体系），登记为**档位差异**待裁决（若收口：快捷动作改 icon-sm 24×24+14px 图标会挤占行高，需先裁决行高前提）。→ 计入 **found**。

---

## 条目 5 · schedule-group-actions.ts / draft-attachments.ts —— **absent 维持（确认无参照：无 UI 设计决策点，ZCode 亦无同构可对账物）**

**原跳过理由**：纯数据/逻辑模块（逐项容错归档、附件草稿判定），无颜色/间距/动效/文案类设计决策点。

**本轮复核**（全部实跑）：
- Read 两文件全文：`schedule-group-actions.ts` 22 行（archiveScheduleGroup 逐项 try/catch 归档，返回 archivedIds/failedIds）；`draft-attachments.ts` 4 行（hasDraftAttachments 判定 attachmentIds/imageIds 非空）。
- `grep -n -E 'color|px|font|shadow|radius|transition|animation|rgba|#[0-9a-fA-F]{3,8}\b'` 两文件 → **0 命中**。
- ZCode 侧检索：任务归档在 asar 走单任务埋点（`GP({input:{featureId:\`task.lifecycle\`,action:\`archive\`,trigger:\`button\`},operation:...})` @328613000 区段），无「逐项容错归档组」对应逻辑；附件草稿属 composer 域（批次 8 已挖过 `zcode-chat-prompt-history:` 存储层），与本模块无对账面。

**最终判定**：**确认无参照**——两模块不产出任何 UI 表面（无类名/令牌/文案/动效），ZCode 侧亦无同构设计决策可对账。跳过正确，不计入 found。

---

## 汇总

| # | 条目 | 判定 | 关键证据 |
|---|---|---|---|
| 1 | SessionHoverCard 内容裁剪 | **found** | ZCode 悬停面=原生 title attr+右侧 tooltip（工作区名 max-w-48·`·`(60%)·±diff，side:right/sideOffset:6）；无时间无分支；`taskList.*` 48 键无 branch，「分支」键全在 git 面板 |
| 2 | 菜单条目顺序 | **found** | `Vvt` 序列逐字命中：pin→rename→archive→markAsUnread ‖ openPath(ogt 平台分派=「在 Finder 中打开」)打头→copyPath→copyTaskPath→copyLogPath→copySessionId→goToProviderConfig ‖ viewModelTrajectory ‖ feedback；容器 w-52；「分屏」条目当前 asar 无（文档差异） |
| 3 | 键盘语义+pointerMenuRect | **found** | Enter/空格=`e.target===e.currentTarget&&(Enter\|\|' ')→preventDefault+open` 两组件逐字同构；treeitem 仅文件树（任务行=role:button/li）；roving ZCode 无（全 tabIndex:0）；radix ContextMenu（aF 包行/ul）+项目行合成 `MouseEvent('contextmenu',{clientX:t.left+24,clientY:t.bottom})`=贴指针 |
| 4 | quick-more 几何 | **found** | Button 档位全集：icon-xs=20×20（默认 svg 10px）、icon-sm=24×24（12px）；行内快捷动作=CF ghost icon-sm 24×24+图标覆写 14px，gap-0.5；pin=icon-xs 覆写 size-4(16×16)+16px；本仓 20×20=icon-xs 档吻合、与快捷动作档不同 |
| 5 | schedule-group-actions / draft-attachments | **absent 维持** | 26 行 0 样式关键词；ZCode 归档为单任务埋点、无同构物 |

**计数**：found = 4，absent = 1。

**附带产出（供下轮对账引用，不占名额）**：
- **ZCode Button size 档位全集**（主体系）：default h-7/svg14、xs h-5/svg10、sm h-6/svg12、lg h-8/svg16、icon size-7/svg16、icon-xs **size-5 rounded-sm**/svg10、icon-sm **size-6**/svg12、icon-md size-7 rounded-lg/svg16、icon-lg size-8 rounded-lg/svg16；第二套体系 icon-xs=size-6 p-0、icon-sm=size-7 p-0。
- **ZCode 两套任务行**：分组版 `k_t`（div role:button，组头另有 moveToGroup/moveToTop 菜单 `ggt` w-56）与平铺版 `kyt`（li，菜单 `Hvt→Vvt` w-52）；行类 `mgt=\`flex min-h-7 w-full min-w-0 flex-col justify-center rounded-lg border border-transparent pl-2.5 pr-1 text-left text-ui-base transition-[background-color,border-color,color,opacity]\``。
- **归档两步确认的 ZCode 实态**：`data-archive-confirming-task-id` 挂行上 + destructive sm 文本钮「确认」+ 快捷钮退场——批次 18「已对齐项」表的 archive-confirm 行获得 asar 旁证。
- **未读点两档**：平铺 TaskListItem `size-[7px] rounded-full bg-icon-blue`（7px）、分组行 `size-1.5 rounded-full bg-sky-500 dark:bg-sky-400`（6px）——KNOWN-ISSUES §15 的 6px 口径对应分组行；7px 档此前未登记。
- **标题跑马灯参数**（KF，03b §5 之外的新增）：滚动距离=内容宽+24px（C_t）、速度 40px/s（w_t=40）、最短 6s（UF=6）、悬停 1s（E_t=1000）后启动、两端 15% 渐隐遮罩（D_t=.15，WF/O_t mask）、reduced-motion 直接不启动、暂停键=容器 `mouseenter/mouseleave`。
- **PARITY 文档待更正项**：`ZCODE-INTERACTION-PARITY.md` §1.2 的「分屏」条目在当前 asar 无对应菜单键（全库「分屏」仅 chat.toolCall 文案 1 处、openInSplit 0 命中）；`session-tree.tsx:63` 注释「同 ZCode 以『在分屏打开』收尾」同此。
- **树键盘定位澄清**：ZCode 任务列表/文件树的行全部固定 `tabIndex:0`（无 roving、无 aria-level）；本仓 `tree-keyboard.ts` 的 roving+aria-level+方向键是超集升级，与 ZCode 对齐的只有「Enter/空格打开」与「treeitem+aria-expanded（文件树先例）」两个点。
