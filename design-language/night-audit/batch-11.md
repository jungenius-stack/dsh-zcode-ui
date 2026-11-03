# 批次 11 · 侧栏树行为与宿主桥接模块对账

## 批次 11 · workspace-browser.ts / ChannelBrowser.tsx / session-order.ts / archive-confirm.ts / host-open-path.ts

> 对账范围说明：本批 5 个模块是**行为/交互语义**为主（项目会话分页、拖拽落点、置顶排序、
> 会话导航解析、频道树、行内归档确认、宿主打开路径），几乎没有颜色/圆角/字号类视觉令牌点。
> ChannelBrowser 复用任务树行组件（见「已一致项」第 3 条），其几何/色值已由 `03b-sidebar.md`
> 矩阵收口，本批不重复立账。
> ZCode 侧证据全部来自 app.asar grep 提取；提取前已确认 asar 不含插件自有代码
> （`grep -a -c 'dcu-wb'` = 0、`application/x-dcu-session` = 0），参照纯净。

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| archive-confirm.ts | 归档确认形态 | **行内两步确认**：首击把归档按钮换成 destructive 确认钮，二次点击才执行；Escape 取消；条目外 pointerdown 取消；鼠标离开条目不取消（archive-confirm.ts:6-14、29-56） | **模态确认对话框**：标题「归档这个任务？」＋描述「任务”{taskTitle}“会移入归档列表，之后仍可恢复。」＋确认按钮；描述明示可恢复语义 | asar 提取 locale：`confirmDialog.taskArchiveTitle`=\`归档这个任务？\`、`confirmDialog.taskArchiveDescription`=\`任务"{taskTitle}"会移入归档列表，之后仍可恢复。\`（英文 `Archive this task?` 同点）；调用点 `rt=async()=>{be&&await L({title:F.formatMessage({id:\`confirmDialog.taskArchiveTitle\`}),description:…confirmLabel:…})}`。模块注释声称对齐的「ZCode 3.15.1 行内两步确认（TaskListItem.tsx）」在当前 asar（3.16.x）已无行内确认符号（`confirmingId`/`confirmArchive` 等 0 命中），3.15.1 行为**无法验证** | 二选一：① 按 ZCode 当前版改模态确认（尺寸/圆角/内边距照 03j-dialog.md A2/A5：radius 16、padding 16/20、阴影 shadow-md 双层小影）；② 保留行内两步确认但登记为显式偏离，注明「3.15.1 参照已不可考、当前 3.16.x 为模态」。修复价值最高（交互形态级差异） |
| workspace-browser.ts | 「显示更多」按钮中文文案 | 中文「展开显示」（locales.ts:134 `'workspace.showMore': '展开显示'`；workspace-browser.ts:36 注释将文案定为该函数行为的一部分；渲染点 CodexWorkspaceBrowser.tsx:967） | 中文「**显示更多**」（英文两侧一致，均 `Show more`：locales.ts:442 vs asar `project.showMore`/`taskList.showMore`） | asar 提取 locale：`project.showMore`=\`显示更多\`、`taskList.showMore`=\`显示更多\`/\`Show more\`；ZCode 全部 showMore 家族无「展开显示」用词 | locales.ts:134 改「显示更多」，一行修复 |
| workspace-browser.ts | 定时任务归属 | 定时会话从任务树滤除、走独立页签（`isTaskSession` 经 `isScheduleSession` 滤除，workspace-browser.ts:13-17） | 定时任务在任务列表分组体系**之内**，与其他任务分组同族（可重命名/移动/换色） | asar 提取 locale：`taskGroup.cronGroupName`=\`定时任务\`，与 `taskGroup.newGroup`（新建分组）、`taskGroup.renameAction`、`taskGroup.moveToGroup`、`taskGroup.emptyDropZoneAction`（「新建任务，或拖拽到这里。」）同族 | 核实 DSH 宿主是否有独立定时页签位：无则把「滤除走独立页签」登记为显式偏离并写明原因；有则维持，在 isTaskSession 注释补一句宿主结构依据 |

### 已一致项（回归断言）

| 模块 | 点 | 期望（可写成源码文本断言） | 证据 |
|---|---|---|---|
| session-order.ts | 上/下一个会话导航解析 | `resolveAdjacentSessionNavigation` 保持逐字语义：先 `[...new Set(ids.filter(id => id.length > 0))]` 去重滤空保序；activeIndex 为 -1（当前不在列表）时 previous=末项、next=首项；走到边界返回 null 不循环（session-order.ts:84-90） | asar 提取同名逻辑函数全文：`function cot(e){let t=[...new Set(e.taskIds.filter(e=>e.length>0))],n=e.activeTaskId?t.indexOf(e.activeTaskId):-1,r=n===-1?t.length:n,i=n===-1?-1:n,a=t[r-1]??null,o=t[i+1]??null;return{canSelectPreviousConversation:a!==null,canSelectNextConversation:o!==null,previousTaskId:a,nextTaskId:o}}` —— 与本仓库逐字段同构（canSelect* 与 `?? null` 等价） |
| workspace-browser.ts | 置顶会话排前、置顶区独立成段 | `pinnedFirstSessionIds` 把宿主 pinnedSessionIds 中存在的会话整体前置、其余保持原相对顺序；侧栏置顶区独立成段（workspace-browser.ts:184-191） | asar 提取：locale `taskList.pinnedSection`=\`已置顶\`/\`Pinned\`；pinned 视图渲染 `data-testid`=\`project-pinned-tasks\`（`r===\`pinned\`?(0,$.jsx)(\`h3\`,…pinnedSection…)`）；`setTaskPinned`/`onTogglePinTask` 调用链存在 |
| ChannelBrowser.tsx | 频道树复用任务树行组件与样式 | 频道树不得自绘行/分组头/菜单/悬停组件，必须复用 `WORKSPACE_TREE_STYLE`、`GroupHead`、`SessionRow`、`sessionMenuItems`（ChannelBrowser.tsx:118、126-139 现状） | 设计文档 03b-sidebar.md §5 任务行定案（行 256×32、圆角 8、字号 14、浅色 hover `#0d0d0d0d`/深色 `#ffffff1a`）声明「同一套行规格适用所有侧栏行」；asar 提取任务行组件 `M_t({task,groupId,groups,remoteSessionId,activeWorkspacePath,…})` 跨 pinned/timeline/分组各段共用 |
| workspace-browser.ts | 「显示更多」分页机制形状（数值除外） | 未展开按限量截断、展开后按页增量、全部露出后按钮消失（`showMore = visible.length < ids.length`，workspace-browser.ts:39-56）；**数值 5/+10 另入无参照** | asar 提取截断机制：`e.descriptor.visibleLimit===null?i:i.slice(0,e.descriptor.visibleLimit)`（查询缓存按 visibleLimit 截断）＋ locale `project.showMore`=\`显示更多\` 按钮键；ZCode 侧「全部露出后按钮消失」未见直接符号，机制同构到「截断＋显示更多」为止 |
| host-open-path.ts | 系统打开动作先专用通道、失败降级 | 「在资源管理器中打开」先走前台专用通道，成功即返回；失败才降级 host 桥（host-open-path.ts:24-41：先 POST endpoint，按状态码分流后 `connection.api.host.openPath` 兜底） | asar 提取 TaskListItem 打开链同构：`let t=i?\`finder\`:\`explorer\`;if((await c.openInEditor(t,e)).success)return;let o=await c.openInFileManager(e);o.success||J.warn(\`[TaskListItem] 打开 workspace 路径失败\`,…)` —— 先平台专用（finder/explorer）后通用（openInFileManager），最终失败仅记录不抛 |

### 无参照项（不得猜）

- 项目会话分页**数值** 5（预览）/ +10（每页）—— ZCode asar 无字面量：`visibleLimit[:=]<数字>` 0 命中；`maxItems:125` 经上下文核实是 zod record 序列化上限（`Ib(t,e){…return{type:"array",maxItems:125,items:{type:"array",…}}}`），与此无关；`+10*` 命中的全是 RumSDK 图表/遥测代码。模块注释自证参照是 **Codex 26.915.4065.0 安装包**（workspace-browser.ts:35「对齐本机 Codex」、常量名 rNc/i$n），不在本审计参照物内 —— 数值维持「无 ZCode 参照，未验证」。
- 拖拽蓝线落点规则（蓝线只在被悬停行下方且下一行被折起或不存在才显示；置顶标题区与首项目上半区共用同一条线，workspace-browser.ts:77-86、141-152）—— ZCode 拖拽体系存在（asar `dragOverlay` 132 次、`onDragOver` 75 次、locale `taskGroup.moveToTop`=\`移动到顶部\`），但落点指示线的精确规则无对应符号可提取（`dropLine` 28 次全是 Excel 图表轴线，误中）。
- 频道树轮询节奏 4000ms ＋ 8s 超时 ＋ visibilitychange 立即刷新 ＋ AbortController（ChannelBrowser.tsx:79-109）—— ZCode 无 IM 频道树概念，asar 无对应轮询符号；08-performance-audit.md 亦无轮询预算条款。属插件自有设计，取值无 ZCode 例证。
- 「最近」段按 updatedAt 降序的比较（session-order.ts:67-68）—— asar 唯一 updatedAt 降序比较是会话记录文件列表 `.sort((x,O)=>O.updatedAt-x.updatedAt)`（对 `^[a-f0-9]{64}\.json$` 文件），timeline 视图用 `updatedAt` 分日期组（`Fyt(p.map(e=>e.updatedAt),Date.now(),…)`＋`data-timeline-date-heading`）；侧栏「最近」段自身的排序符号未见，方向旁证、数值无从核对。
- host-open-path 的错误码分流（401/403/503 → BusinessRequestError；404/501 → 降级 host API，host-open-path.ts:34-38）—— `openInExplorer` 在 ZCode asar 0 命中（该端点属 DSH 宿主 business-api，ZCode 侧对应物是 `openInFileManager`/`openInEditor`），错误码语义无 ZCode 例证。
