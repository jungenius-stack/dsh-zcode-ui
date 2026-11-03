# 批次 11 补采（gapfill-11）· 2026-10-30

> 对 batch-11.md「无参照项」5 条逐条再挖。全部命令本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 字节）。
> 方法：沿用 gapfill-7 的取证方式——`LC_ALL=C grep -a -b -o PATTERN $A` 取字节偏移 + `tail -c +N $A | head -c M` 切窗口读原文。区域约定：<300M 为第三方/主进程库，326M+ 为 ZCode 应用（渲染层）代码，310M 附近为 locale 表，280–290M 为主进程 bundle。设计文档侧复核了 batch-11.md 原文与 08-performance-audit.md（轮询条款复查见条目 3），并 grep 全部 `*.md` 查「显示更多/展开显示/蓝线/drop-indicator」先例（仅 night-audit 系列自引，无新章节可引）。

## 1. 项目会话分页数值 5/+10（workspace-browser.ts:19-22、39-56）

**搜索过的模式**（计数均为本轮实跑）：`slice(0,5)`（**17**）、`slice(0,15)`（**1**）、`slice(0,N)` 全量分布（top：2×51、3×45、4×27、5×17、80×15、10×14…）；`taskList\.[a-zA-Z]*` 全键清单（49 键）；`showMore`（**17**）、`ShowMore`（1）；`展开显示`（**0**）；`project\.showMore`（**2**，见勘误）；`data-task-list-show-more`（**2**）；`useState([0-9]+)`（328.55M–328.65M 窗口 0 命中，改读组件原文）；`kind:\`pinned\``（5）/`kind:\`project\``（2）/`kind:\`timeline\``（2）。

**命中原文**：showMore 应用层用法全部落在两个 data-testid 上，追出分页组件 `eL`（字节 328633633 起整段）：

```js
function eL({tasks:e,onSelect:t,refresh:n,kind:r=`project`,showEmptyState:i=!0}){
  let{intl:a,locale:o}=q(),
  s=r===`timeline`?20:5,                      // ← 每页步长：timeline 20，其余 5
  [c,l]=(0,Q.useState)(s),                    // ← 初始可见条数 = 5（project）
  f=(0,Q.useMemo)(()=>[...e].sort((e,t)=>_dt(e,t,r)),[e,r]),
  p=r===`pinned`?u?f:f.slice(0,20):f.slice(0,c),   // ← 未展开 slice(0,5)，展开 slice(0,c)
  m=r===`pinned`?f.length>20:f.length>c,           // ← 全部露出后按钮消失
  onClick:()=>r===`pinned`?d(e=>!e):l(e=>e+s),     // ← 每点一次 +5
  按钮：{"data-task-list-show-more":`true`,variant:`ghost`,size:`sm`,className:`ml-8.5 h-auto p-0 text-ui-base text-foreground-subtlest hover:bg-transparent focus-visible:text-foreground`}
  文案：taskList.showMore=`显示更多`/`Show more`、taskList.showLess=`显示更少`/`Show less`（310460030/310924483 locale 原文）
```

其它分页档位旁证：archives 列表 `onClick:()=>u(e=>e+50)` + `"data-testid":\`archive-show-more\``（328290583，页大小 50）；`subagentDirectory.showMore`=\`再显示 20 个\`（310387471，cursor 型 loadMore，332048892）。

**勘误（batch-11 两处）**：① `project.showMore` 键在 asar 仅 2 处命中且全在 locale 表（310308220/310769964），**无组件引用**——batch-11 引它作按钮键是死键；活按钮键是 `taskList.showMore`。② 「全部露出后按钮消失」本轮拿到直接符号：`m=f.length>c` 为假时按钮不渲染，与插件 `showMore: visible.length < ids.length` 同构。

**最终判定：升级为有参照（found，含一处保留）**——「初始 5 条」拿到 **asar 直接数值原文**（`useState(5)`、`slice(0,c)`），与 `PROJECT_SESSION_PREVIEW_LIMIT=5` 精确一致；「+10 每页」维持无 ZCode 例证（ZCode 步长是 +5，timeline/pinned 是 20，archives 是 +50）。即 5 有参照、+10 无参照；插件注释自证参照仍是 Codex 26.915.4065.0 安装包。「当前会话落在窗口外追加到末尾」（forcedId）在 eL 中无对应，属插件自有裁决。

## 2. 拖拽蓝线落点规则（workspace-browser.ts:77-86、141-152）

**搜索过的模式**：`dropIndicator`（0）、`DropIndicator`（0）、`drop-indicator`（**2**）、`beforeId`（**0**）、`dropBefore`（0）、`dropIndex`（0）、`overIndex`（122，多为 dnd-kit/图表库内部）、`canDrop`（0）、`isOver`（434）、`SortableContext`（6）、`useSortable`（11）、`DndContext`（24）、`dropAnimation`（44）、`collisionDetection`（13）、`closestCenter`（16）、`PointerSensor`（56）等；`function wN(`（5 处，328235502 为 @dnd-kit/useSortable 原样内联）。

**命中原文**：batch-11 搜的 `dropLine` 全是图表轴线误中；真符号是两个 **data-testid**（字节 328643716 / 328646774）：

```jsx
// 项目容器（含「插到项目之间」的蓝线）
E = T&&S&&!x&&C>=0&&S.data.current?.pinned===t.pinned ? (C>w?`before`:`after`) : null;
//   T=isOver S=active C=activeIndex(被拖项) w=index(悬停项)：被拖项在下→线画上缘，否则下缘
(0,$.jsx)(`div`,{"aria-hidden":`true`,"data-testid":`project-drop-indicator`,"data-drop-position":E,
  className:`pointer-events-none absolute left-5 right-2 z-20 h-0.5 bg-icon-blue ${
    E===`before`?`top-0 -translate-y-1/2`:`bottom-0 translate-y-1/2`}`,
  children:(0,$.jsx)(`span`,{className:`absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-icon-blue bg-sidebar`})})
// purpose-section（Wyt）同构：data-testid:purpose-section-drop-indicator，判定 b=y&&g&&!h&&_>=0?_>v?`before`:`after`:null
```

另两形态：① **session 拖入项目**不用线，用整容器高亮 `"data-testid":\`project-session-drop-target\``,类 `pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-icon-blue`（native HTML5 onDragEnter/onDragOver/onDrop + `ZI(e.dataTransfer)` 读载荷）；② 侧栏手势层（328583121）`onDragMove` 用纵向速度定方向：`e.delta.y>g.current?h.current=\`after\`:e.delta.y<g.current&&(h.current=\`before\`)`，`onDragOver` 只缓存 `e.over`。

**最终判定：升级为有参照（found，几何与机制层）**——batch-11 缺的「落点指示线符号」补齐：ZCode 蓝线 = 2px（h-0.5）icon-blue 横线 + 左端 8px 空心圆点，贴悬停容器上/下缘（-/+translate-y-1/2），before/after 由「被拖项 index vs 悬停项 index」（dnd-kit sortable）或拖动方向（手势层）决定，且任一时刻只有一条线；跨容器搬会话另有蓝框高亮。插件特有规则——「只在悬停行下方、下一行折起/不存在才显示」「置顶标题区与首项目上半区共用线」——无 ZCode 对应物（`beforeId` 0 命中、ZCode 无折叠依赖的落点判定），属插件自有裁决；采纳/不采纳属设计决策。

## 3. 频道树轮询 4000ms + 8s 超时 + visibilitychange 立即刷新（ChannelBrowser.tsx:79-109）

**搜索过的模式**：`频道`（**0**）；`dingtalk|feishu|wecom`（feishu 10721——抽样核实全为图片资产名 `feishu-CCgK6olr.png`（6405719）与 44M 区 Feishu OpenAPI SDK 文档注释；Feishu 189/WeCom 4 同区）；`4000`（42，**app 区 0 命中**，区域直方图 0-100M×14、100-300M×28）；`,4000)`（0）；`4e3`（1026，未逐条核，配 app 区 setInterval 全量清单兜底）；`,8000)`/`8_000`（0）、`,8e3)`（1，279580138，主进程 retry 工具 `vj(...,100,8e3)`，与拉取超时无关）；`setInterval(`（lib 181 / app 52，app 区 52 处延迟逐一 dump：50/100/250/1e3×13/2e3/5e3/1e4/3e4/6e4×6 + 常量 PJt/ahn/dLn/JBn/_zn/J0/Voe——**无 4000**）；`visibilitychange`（lib 121 / **app 49**）；`visibilityState===\`hidden\`` 类 guard（app 8 处）；`getGroupMemberNames`（7）、`botId`/`chatId`（app 区 37+）；文档：`grep -c 轮询 08-performance-audit.md` = **0**、`grep -c -i poll` = **0**（batch-11 结论复核成立）。

**命中原文**（机制层旁证，非频道树）：① coding-plan-reset 轮询协调器（329430547 类原文）——

```js
handleVisibilityChange=()=>{if(document.visibilityState===`hidden`){this.clearInterval();return}this.startVisiblePolling()};
startVisiblePolling(){this.clearInterval(),this.run(),this.interval=window.setInterval(()=>void this.run(),PJt)}
// PJt=5*6e4（329428164）=300000，即 5 分钟；run() 内 hidden 直接跳过
```

即 ZCode 有「隐藏暂停 + 可见立即 run() 再挂 setInterval」的完整同构机制，档位 5min。② bot 群成员名 hook（328186931）：`setInterval(()=>void s(),6e4)` + `window.addEventListener(\`focus\`,s)` 立即刷新（60s 档，focus 而非 visibilitychange）。③ 其余 visibilitychange 用法为本地状态（未读标记 328271359、倒计时 330836290/328508849、闪烁暂停 330242295），无网络轮询。

**最终判定：headline 确认无参照（absent），机制层旁证补齐**——频道树表面（频道=0、无 channel.* 侧栏 i18n）与 4000ms/8s 两个数值在 ZCode app 区均 0 命中，维持「插件自有设计」；但「visibilitychange 隐藏暂停/可见立即刷新 + 周期轮询」的**机制形状**在 asar 有直接原文（PJt=5min 协调器 + 60s+focus 群成员 hook），后续若要给频道轮询找 ZCode 机制参照可引这两处，数值不引。

## 4. 「最近」段按 updatedAt 降序比较（session-order.ts:67-68）

**搜索过的模式**：`projectId==null`（app 2）、`_dt`（`function _dt(` 328239612）、`hO(`（9 处，327920818 为任务比较器）、`L7e`（2）、`I7e`（2，327920359 为任务版）、`P7e`（327M 区 2 处）、`ON(`（328239747 近旁）、`kind:\`timeline\``（2）；batch-11 已核的 `.sort((x,O)=>O.updatedAt-x.updatedAt)`（记录文件列表）不重复跑。

**命中原文**：侧栏任务行排序链全须全文拿到——

```js
function I7e(e,t,n){return n===`created`?…:t.updatedAt===e.updatedAt
  ?(t.createdAt===e.createdAt?t.taskId.localeCompare(e.taskId):t.createdAt-e.createdAt)
  :t.updatedAt-e.updatedAt}                      // ← 'updated' 分支 = updatedAt 降序
function P7e(e){return N7e(e)||pO(e)?.hasBackgroundWork===!0}   // 运行中/有后台工作 → 置前桶
function L7e(e,t,n,r){let i=r(e);return i===r(t)?…I7e(e,t,n):i?-1:1}
function hO(e,t,n){return L7e(e,t,n,P7e)}
function _dt(e,t,n){return(n===`timeline`?I7e(e,t,`updated`):hO(e,t,`updated`))||JSON.stringify([t.hostId,IT(t)]).localeCompare(…)}
function ON(e,t){…pinned?e.pinned&&!e.archived:timeline?!e.archived:e.projectId===t.projectId…}.sort((e,n)=>_dt(e,n,t.kind))
```

日期分组（batch-11 旁证的原文补全）：`Fyt`（328632007）按 updatedAt 天差分产 `today/yesterday/daysAgo:{n}/thisWeek/lastWeek/thisMonth/lastMonth/older` → i18n `taskTimeline.*`，`data-timeline-date-heading`。另核「未分配桶」：`AN`（328240275 近旁）把 projectId 为空的任务落到派生本地工作区（`projectId==null&&hostId==='local'`），**ZCode 无「未分配」段**；与插件「最近」段最近似的表面就是 timeline 视图（全部未归档任务、行序 updatedAt 降序 + 日期分组）。

**最终判定：升级为有参照（found）**——batch-11 记「侧栏『最近』段自身的排序符号未见」；本轮补到该排序的完整 asar 原文：任务行全表面（project/timeline/pinned）都用 `_dt`→`I7e('updated')` = **updatedAt 降序**（同刻并列按 createdAt 降序→taskId 字典序，运行中置前）。插件 `session-order.ts` 的「未分组会话按 updatedAt 降序」与之同向同键；差异点是 ZCode 多了运行置前桶与 createdAt/taskId 并列规则，插件可引为并列次序参照。

## 5. host-open-path 错误码分流（host-open-path.ts:34-38）

**搜索过的模式**：`openInExplorer`（**0**，复核）、`openPath`（13）、`showItemInFolder`（5）、`revealInFinder`/`showInFolder`（0）、`openExternal`（72）、`shell\.`（152）、`BusinessRequest`（1，无，系误计为 0——实为 1 且不在 ZCode 任务侧，核实为无）、`status===40[0-9]|50[0-9]`（401×9/403×4/404×4/405×1/409×2/400×1，全在 229M–283M 主进程/库区，**app 渲染区 0**）、`case 503`（15，app 区 15 处逐窗核实全为 xterm 色值位运算 50331648，非 HTTP）、`errors.*` i18n（仅文件名误中）。

**命中原文**：ZCode 的「在文件管理器中打开」两条通道——① 渲染层 `FileContextActions`（329018263）：`a?.kind==='wsl'?await t.openInEditor(\`explorer\`,n,{pathKind:\`directory\`,remoteTarget:a,…}):await t.openInFileManager(n)`，失败处理 `r.success||(J.warn(\`[FileContextActions] 在文件管理器中显示条目失败\`,{path:…,error:r.error??\`unknown-error\`}),Ma(s))`（warn + toast）；② 主进程 `shell.showItemInFolder`（283440534 日志导出、283645147 finder/explorer 分派）与 `shell.openPath`（283649009 `_m`：`{success:!1,error:i}` 字符串错误）。错误模型统一为 `{success,error:string}`，**无 HTTP 状态码分流、无「404/501 降级到第二通道」结构**（单通道 service 调用）。ZCode 确有状态码→语义错误分流但属别的表面：主进程 relay 客户端（283349597）`if(l.status===401)throw new Fe(\`auth-required\`);if(!l.ok)throw new Fe(\`relay-unavailable\`,l.status>=500)`（401→认证错误、≥500→可重试不可用）；授权校验（281077770）`if(v.status===401)return!0;if(v.status!==200&&v.status!==403)return!1`。

**最终判定：确认无参照（absent）**——uiplug 的 openPath 端点分流（401/403/503→BusinessRequestError、404/501→降级 api.host.openPath）在 ZCode 无对应物：ZCode 走 IPC/service `{success,error}` 单通道，无 HTTP 状态码语义映射、无双通道降级。附带采集可留档：主进程 relay 的 401/≥5xx 分流可作为「状态码→错误语义」的 ZCode 侧风格旁证（不是本条数值参照）。

---

## 汇总

| 条目 | 判定 |
|---|---|
| 项目会话分页 5/+10 | **升级为有参照**：初始 5 有 asar 直数值原文（`eL`: `useState(5)`+`slice(0,c)`+`taskList.showMore`）；**+10 维持无参照**（ZCode 步长 +5 / timeline 20 / archives +50） |
| 拖拽蓝线落点规则 | **升级为有参照（几何/机制层）**：`project-drop-indicator`/`purpose-section-drop-indicator`，h-0.5 bg-icon-blue + 圆点端点，before/after 由 index 差或拖动方向决定；折叠依赖与置顶共用线为插件自有 |
| 频道树轮询 4000ms/8s/visibilitychange | 确认无参照（4000/8000 app 区 0 命中、无频道树）；机制旁证补齐：PJt=5min 可见性轮询协调器 + 60s+focus 群成员 hook |
| 「最近」段 updatedAt 降序 | **升级为有参照**：`_dt`/`I7e('updated')` = updatedAt 降序全链原文；ZCode 无未分配段，timeline 即最近似表面 |
| host-open-path 错误码分流 | 确认无参照（ZCode 为 `{success,error}` 单通道 service，无状态码分流/降级结构）；relay 401/≥5xx 分流留作旁证 |

found=3，absent=2。
