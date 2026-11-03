# 批次 19 补采（gapfill-19）· 2026-10-30

> 对 batch-19「无参照项」5 条逐条再挖。全部命令本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 字节）。
> 方法：`/usr/bin/grep -a`（显式走系统 grep，绕过本 shell 将 `grep` 映射为 ugrep `-I` 的别名——后者会跳过二进制）＋ `tail -c +N | head -c M` 切窗口读原文。区域约定沿用 gapfill-11 并在本轮细化：77–78M Radix 库区、168–174M lucide 图标注册表区、204–232M 内嵌 Playwright trace viewer、280–294M 主进程 bundle、310.3–311M locale 表、317–318M 渲染层 lib chunk、326M+ ZCode 渲染层应用代码（328.0–328.8M 侧栏/任务区、330.6–332.1M 会话区、331.5M 工作区文件树、332.0M+ 工具面板）。
> **工具勘误（本轮实测，影响既往中文检索）**：多字节模式在默认 UTF-8 locale 下对二进制文件返回假 0（`置顶` 默认 0、`LC_ALL=C` 35；`重试` 0→255）。本批所有中文检索一律 `LC_ALL=C` 重跑，既往批次中以 UTF-8 locale 报的中文 0 命中均不可信。
> 设计文档侧复核：03b-sidebar.md §4/§5（未覆盖清单、任务行定案）、03d-composer.md §1/§4（D-h 焦点态未采到）、08-performance-audit.md §2（观察器全文档走查教训）、03h-detail-sweep.md（焦点环清单，无加号 hover 采样）、03c-conversation-dsh-side.md:127（composer-visuals 自述「对齐 ZCode」）。

## 1. tree-keyboard.ts 全模块——ARIA 树键盘模型（roving tabindex/方向键/Home/End/aria-level）

**搜索过的模式**（计数为本轮实跑）：`treeitem`（-c 6 行 / -o 17 处；-i 23）、`TreeItem`（16，含 341.2M asar 目录尾的文件名）、`treegrid`（3）、`aria-level`（18 行 / 19 处：204–232M×15、294429617、317315343、318076557、332058765）、`roving` -i（328：77–78M Radix 库 + 326629016–326630620 app 内 Radix 副本 6 处 + 329296438 "improving" 误中）、`RovingFocusGroup`（253，全部 77–78M + 326.6M）、`role:.tree.` -o（4）、`role:.treeitem.` -o（3）、旧模式 `role=.tree.`（0——**勘误**：字面 `=` 匹配不到 `role:`，旧审计若用此形会漏检）、`ArrowDown`（1019，app 区 >326M 共 33 处逐一归类）、文件树窗口 331.50–331.65M 内（ArrowLeft 1、ArrowRight 1、ArrowDown **0**、ArrowUp **0**、onKeyDown 8、role:\`tree\` 2）、`key===.Home.`（5）、`key===.End.`（4）、`key===` 全量清单（Enter 64 / Escape 38 / ArrowDown 19 / ArrowUp 15 / Tab 12 / ArrowRight 11 / ArrowLeft 11）。

**命中原文**：ZCode **工作区文件树**（`[WorkspaceFileTree]` 日志、`workspaceFileTree.title` i18n）是出厂代码里唯一的树语义容器：

```js
// 树容器 @331535764：role:tree + aria-label，行列表虚拟化（getVirtualItems/scrollToIndex）
(0,$.jsx)(`div`,{ref:i,…,role:`tree`,"aria-label":c,children:r.map(…)})
// 树行 @331530742：role:treeitem + aria-expanded + 深度缩进 CSS 变量 + 层级辅助线
(0,$.jsxs)(`div`,{role:`treeitem`,"data-testid":Sb(VRe,t.path),"aria-expanded":w?t.expanded:void 0,
  tabIndex:0,                       // ← 每行都是 0：非 roving，Tab 轮询模型
  className:Z(…,`pl-[calc(var(--workspace-file-tree-depth)*0.75rem+0.5rem)]`,…,
    n?`border-input-border-focused bg-transparent hover:bg-surface-hover`:…,`focus-visible:border-border-hover`),
  …,"data-workspace-file-tree-hierarchy-guides":t.depth,…,
  onKeyDown:e=>{if(T&&e.key===`Enter`){e.preventDefault(),m(t.path);return}v(e,t)},…})
// 键盘回调 be @331543524：Enter 打开、ArrowRight 展开、ArrowLeft 收起（仅目录）
be=(0,Q.useCallback)((e,t)=>{if(e.key===`Enter`){e.preventDefault(),ye(t);return}
  if(e.key===`ArrowRight`&&t.type===`directory`){e.preventDefault(),(!t.expanded||F)&&ve(t);return}
  e.key===`ArrowLeft`&&t.type===`directory`&&t.expanded&&(e.preventDefault(),ge(t))},[ve,ye,ge,F])
```

roving 基建存在但不在树上：Radix `RovingFocusGroup`/`RovingFocusGroupItem`（`currentTabStopId`、`rovingFocusGroup.onEntryFocus`）随库打包（77–78M×253 + app 内副本 326.6M）。Up/Down「焦点在列表内移动」是 ZCode 已有惯例，但只用于列表/组合框：组合框 @328368127（`aria-activedescendant` + ArrowDown/Up 循环 + Enter 选中）、远程选择列表 @332269672（`querySelectorAll('button:not(:disabled)')` + index±1 焦点循环）、marketplace 列表 @331399329（`rDn`：ArrowUp→previous/ArrowDown→next/Enter）、内联列表 @330880151（Up/Down/Tab ±1）；@328202673 是 dnd-kit 传感器键位表（库）。Home/End 仅两用途：会话滚动意图判定 bmn @330721931（Home/PageUp→`awayFromBottom`、End/PageDown→`towardBottom`，`bottomEpsilonPx??48`）与面板调宽 @332196981（Home/End=极值），**均非「焦点首/末项」**。aria-level 19 处全定性：15× Playwright trace viewer（如 225.4M `role:"heading","aria-level":1,"Loading Playwright Trace..."`）、294429617 aria 属性名白名单 Set、317315343/318076557 markdown→ARIA 转换器（H1→`role:heading`+aria-level）、332058765 ZCode workflow roster 硬编码 `"aria-level":4,role:\`heading\``——**无一处 treeitem**。

**最终判定：升级为有参照（左右键半边）**。「树的 role:tree/treeitem 容器语义 + Enter 打开 + ArrowRight 展开/ArrowLeft 收起 + preventDefault」在 ZCode 出厂代码有直接实现（工作区文件树），可作 tree-keyboard.ts ArrowRight/ArrowLeft 分支（tree-keyboard.ts:175-198）与 toggleItem（:99-106）的 ZCode 参照；行为差记录：ZCode 仅对目录收展、展开后不下降到子级、收起后不跳父级、无 `button[aria-expanded]` 二段定位。而「roving tabindex、Up/Down 树内遍历、Home/End 焦点首末、aria-level」**确认无 ZCode 对应物**：ZCode 自己的树用全量 `tabIndex:0`+Tab 轮询+`--workspace-file-tree-depth` CSS 变量表达层级，Up/Down 遍历只出现在列表/组合框。插件按 APG 补齐的这部分维持 APG 立论（模块头自证），属插件对 ZCode 惯例的有意偏离。

## 2. pinned-workspaces.ts 全模块——置顶/分组持久化、hydration 优先级、5s 超时

**搜索过的模式**：`pinned` -i（487；桶分布 50M:48 / 270M:75 / 280M:70 / 310M:23 / 320M:84 / 330M:39 / 340M:7）、变体全清单（`pinnedAt|isPinned|pinnedTask*|pinnedIds|pinnedWorkspace*|pinnedOrder|pinnedTasks`：isPinned 11、pinnedTasks 2、**其余 0**）、`unpin`（14）/`Unpin`（2）/`unpinned`（17）/`unpinLabel`（3）、`置顶` LC_ALL=C（35，全在 locale 值）、`favorites`（13，无关）、`localStorage`（app 区 >326M 44 处逐一 dump）、`` `zcode[-:]…`` 键名全清单（52 个）、`setTask*` 服务方法全清单、`taskList.pinnedSection`（3）、`pluginUi.pin`（327427547）。

**命中原文**：

```js
// locale @310460100 / 310924547：置顶功能全套文案
"taskList.pinnedSection":`已置顶`/`Pinned`、"taskList.pin":`置顶任务`/`Pin task`、"taskList.unpin":`取消置顶任务`/`Unpin task`
// 任务行内菜单（328.56M 区）：pin/unpin 切换 + 图标随态
{id:`pin`,label:e.pinned?T(`unpin`):T(`pin`),icon:e.pinned?vne:hc,run:u}
// 乐观切换 + 服务持久化（置顶是任务模型字段，走 service，不经 localStorage）
ject({id:e.id,hostId:e.hostId,pinned:!e.pinned}),await v()
e.service.setTaskPinned({...i,pinned:n.pinned});    // setTaskPinned ×5（setTaskUnread ×10 等 19 个 setTask* 之一）
// 列表过滤与排序：置顶区独立 kind + manual 排序 + 置顶优先
t.kind===`pinned`?e.pinned&&!e.archived:…;  [...e.filter(e=>e.pinned),...e.filter(e=>!e.pinned)]（配 sortBy:o=`manual` 与 a.order）
// 拖拽约束：只允许同 pinned 态之间拖（gapfill-11 蓝线判定的前置条件）
S.data.current?.pinned===t.pinned
// 侧栏本地持久化惯用法（版本化键 + 损坏回默认）：键名清单 52 个无一含 pin
Gyt=`zcode-sidebar-purpose-section-preferences`,iL={projectsExpanded:!0,conversationsExpanded:!0,sectionOrder:[...rL]}
（另有 zcode-project-sidebar-preferences / zcode-grouped-task-collapsed-groups / zcode-workspace-expansion / zcode-v4-pending-commands:v1）
// 另有插件面板 pin：pluginUi.pin/unpin + "data-testid":`plugin-ui-pin-toggle`,"data-plugin-ui-pinned":String(e.pinned===!0)（@327430109）
```

**最终判定：升级为有参照（交互与持久化路径层）**。ZCode 的「置顶」是完整功能：`task.pinned` 模型字段 + `setTaskPinned` 服务持久化 + 行内 pin/unpin 菜单 + `已置顶` 区头（slice(0,20) 折叠，gapfill-11 已引）+ 同态拖拽约束 + manual 排序；侧栏折叠态/区块顺序确实走 localStorage（版本化键 + 解析失败回默认 `iL` 的惯用法与插件 readPinnedWorkspaceIds 的 try/catch 回空同构）。**插件自有部分维持无参照**：`dsh-codex-ui.pinned-workspace-ids`/`workspace-groups.v1` 浏览器兜底键、Host 偏好 GET/PUT + `AbortSignal.timeout(5_000)`、hydration 三级优先（dirty > host > local 旧 origin 迁移）、基线就绪后 prune——ZCode 置顶不经 localStorage、无宿主偏好文件，不存在同构数据流；这是插件在 DSH 宿主架构下的自有裁决（pinned-workspaces.ts:41,53 注释自证）。

## 3. conversation-dom.ts 全模块——[data-conversation-scroll] / [data-chat-anchor-key] 集成契约

**搜索过的模式**：`data-conversation-scroll`（**0**）、`data-chat-anchor-key`（**0**）、`chat-anchor`（0）、`chatAnchor` -i（0）、`conversation-scroll`（0）、`conversationScroll(Root)`（0）、`data-conversation*` 全清单（selectable 14、bottom-dock-mode、find-ignore、selection/share 族——均非滚动/锚点）、`data-chat*`（toolbar-popover-trigger 4）、data-testid 全量清单 645 个唯一值中 scroll/anchor/turn/message 相关（conversation-share-selection-scroll-area/thumb、bash-output-scroll、workflow-timeline-scroller、gen-ui-anchor 等）、`data-turn-id`（4）/`data-turn-key`（1）、`data-trajectory-*` 族、`search-target-key`（4）、`scrollIntoView`（221）、`useVirtualizer`（32，全在 20–90M 库区）、`scrollToBottom`、`bottomEpsilonPx`（1）/`towardBottom`（4）。插件侧写入方：`grep -rn data-conversation-scroll src/`（skin-envelope.ts:45 选择器、CodexSidebar.tsx:342-374 CSS 作用域）；`data-chat-anchor-key` 全仓仅 conversation-dom.ts 读取（宿主渲染、插件读取的契约）。

**命中原文**（ZCode 的轮次/消息级锚点机制）：

```js
// 轮次元素自带锚点标记 @330699603
(0,$.jsxs)(`section`,{"data-turn-id":e.turnId,"data-turn-key":e.key,"data-highspeed-gradient":…,…})
// 消息级搜索锚点 @331991201 / 332001278
"data-trajectory-message-role":t,"data-trajectory-message-collapsible":"",…"data-trajectory-search-target-key":l,…
// 消费方 @331982528：一次性 querySelectorAll 扫描 + dataset 值比对（与插件 conversationAnchors 同构）
aFn(e,t){return[...e.querySelectorAll(`[data-trajectory-search-target-key]`)].some(e=>e.dataset.trajectorySearchTargetKey===t)}
sFn(e,t,n,r){let i=[...e.querySelectorAll(`[data-trajectory-search-target-key]`)].find(e=>e.dataset.trajectorySearchTargetKey==…}
// 配套：CSS Custom Highlight 高亮（registry.set(new Highlight(...))）+ 滚动居中助手 oFn（getBoundingClientRect + scrollTop+=i-a）
// 轮次导航按钮 @330706513：data-turn-id + aria-posinset/aria-setsize；会话虚拟化 @330758994：data-v4-turn-unit + measureElement + translateY
```

**最终判定：升级为有参照（机制层），命名契约维持无参照**。两个属性名 `data-conversation-scroll`/`data-chat-anchor-key` 确认 0 命中；但 ZCode 有同功能的轮次/消息级 DOM 锚点（`data-turn-id`/`data-turn-key`/`data-trajectory-search-target-key`），消费方式同样是「一次 querySelectorAll 扫描 + dataset 比对」，且滚动根是虚拟化容器（`data-v4-turn-unit`+measureElement）不挂 data 标记、无「滚动根」命名契约。差异：ZCode 每次搜索现扫、无跨帧索引 Map——插件的 conversationAnchors 索引 + 「滚动帧内不得为每个轮次重复遍历 DOM」纪律（conversation-dom.ts:13）比 ZCode 现状更严，与 08-performance-audit.md §2 教训同向，仍无 ZCode 数值可比（该半句保留原判）。

## 4. composer-visuals.ts:27-29 加号 hover/focus 态底色（--dsw-alias-interactive-bg-hover-solid）

**搜索过的模式**：`dsw-alias-interactive-bg-hover-solid`（**0**）、`dsw-[a-z-]{3,40}` 全量（**0**——asar 无任何 dsw- 令牌，DSH 专有）、`NewTaskButtonGroup`（**0**——zcode-icons.tsx:22 注释指称的组件名不在出厂 bundle，应来自 zai-org/ZCode 开源仓源码而非本安装包）、`MessageCirclePlus/message-circle-plus`（26+22，全部在 168–174M lucide 图标注册表 `createLucideIcon("message-circle-plus",__iconNode$bw)` 与 286M，渲染层组件无按名引用）、`bg-surface-hover`（115，app 区 113）、data-testid 645 值中 composer/attach/plus/add/new-task 相关（composer-create-project / composer-project-menu / composer-effort-shortcut / task-group-new-task / new-task-draft-drop-mask / highspeed-composer-background——**无 composer 加号/附件按钮锚点**）、`task-group-new-task` 上下文全 dump、文档侧 grep `加号`（仅 03c-conversation-dsh-side.md:127、03d-composer.md:48 自述）与 `interactive-bg-hover-solid`（0）。

**命中原文**（同族旁证，非同位参照）：

```js
// ZCode 侧栏分组头「新建任务」加号按钮 @328563284：ghost icon-sm，hover 只变字色、无底色
(0,$.jsx)(X,{type:`button`,variant:`ghost`,size:`icon-sm`,
  className:`shrink-0 text-foreground-subtle hover:text-foreground`,
  "data-testid":`task-group-new-task`,"aria-label":M.formatMessage({id:`taskGroup.newTask`}),…,
  children:(0,$.jsx)(Js,{"aria-hidden":`true`,className:`size-3.5`})})
```

**顺带升级（同模块另一处修正）**：「回到底部居中」拿到 asar 直证——@330760751 `{"data-v4-back-to-bottom-anchor":\`composer-dock\`}` + `absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm` + `label:formatMessage({id:\`chat.scrollToBottom\`})`（locale：`滚动到底部`/`Scroll to bottom`），即 ZCode 直接以 `left-1/2 -translate-x-1/2` 水平居中，对应 composer-visuals.ts:35-38 的 `justify-content:center` + `padding-right:0`。

**最终判定：确认无参照（absent，条目主体）**。ZCode 出厂 bundle 无 composer 加号同位载体：无专用 testid、`NewTaskButtonGroup` 不在 bundle、`--dsw-*` 令牌 0 命中；03d-composer.md §1 D-h「焦点态未采到」维持。同族按钮（task-group-new-task）hover 惯用法为「变色不加底」（`hover:text-foreground`），`bg-surface-hover` 用于行 hover——方向上支持插件「ZCode 静止态裸图标、悬停才给反馈」的判断，但**不可作色值对照**。加号 hover/focus 底色的 ZCode 依据仍是模块头自述的活体观察，未见文档/asar 双证。

## 5. WorkspaceShortcutBridge.tsx:67-74 错误模态文案与按钮组（重试/重新选择/关闭、role="alert"）

**搜索过的模式**：`addFailed`（3：310303270/310764021/331478574）、`chooseAgain`（**0**）、`choose-again`（0）、`添加失败` LC_ALL=C（1）/`重新选择`（14）/`重试`（255）、`role:.alert.`（54，app 区 44）、retry 键 locale 全清单（appError.retry、appError.sectionRetry、archives.retry、automations.form.model.previewRetry、bashOutput.retry、common.retry…）、`Try again` 字面（10 类）、`"workspace\.[a-zA-Z.]{2,40}":` locale 全清单（backToWorkspace/openWorkspace/openFolder/openPluginsSettings/openScheduledSettings/wslUncPrompt.\*——**无 addFailed/retry/chooseAgain**）、`sessions.close`（**0**）、`common.close`（2）/`common.retry`（2）/`common.loading`（2）、role:alert app 区样本 3 处 dump。

**命中原文**（ZCode 项目选择器错误流 @328431975，与 03j「创建项目」同族对话框）：

```js
M?(0,$.jsx)(`p`,{role:`alert`,className:`text-ui-sm text-destructive`,children:M}):null,
M?(0,$.jsx)(X,{variant:`secondary`,onClick:()=>j(e=>e+1),children:v.formatMessage({id:`common.retry`})}):null,
// common.retry=`重试`/`Retry`、common.close=`关闭`/`Close`（locale 原文）
// 另两处 role:alert 惯用法：分享错误详情 @330801582（<section role:alert,"data-testid":`conversation-share-error-details`,
//   border-destructive/30 bg-destructive/5…>）、开发者工具 @332015495（<div role:alert>{developerTools.loadError}</div>）
```

**最终判定：升级为有参照（结构与惯用法层）**。错误模态的三要素在 ZCode 同族对话框有直接实现：① 错误行 `role:"alert"` + `text-destructive`；② 错误时才渲染的 `common.retry` 重试按钮（`variant:secondary`，插件为 `disabled={busy}` 条件渲染，同构）；③ `common.close` 关闭键（插件用的 `sessions.close` 是自有 i18n 键，ZCode 惯用 common.close）。**文案与流程维持无参照**：`workspace.addFailed`/`workspace.retry`/`workspace.chooseAgain` 三键 0 命中（ZCode 唯一 `addFailed` 是 `preview.image.addFailed`=「添加失败，请先打开此工作区的可编辑聊天。」，图片功能，@310303270；`重新选择` 14 处全为设备/模型/分享轮次/套餐的提示语，无独立按钮键）——「添加工作区失败」专属流程与 pickedPath 条件重试、chooseAgain 重开目录流属插件自有。

## 汇总

| 条目 | 判定 |
|---|---|
| 1 tree-keyboard.ts | 升级（左右键收展+role:tree 有 ZCode 直证；roving/Up-Down/Home-End/aria-level 确认无） |
| 2 pinned-workspaces.ts | 升级（置顶功能/服务持久化/localStorage 惯用法有参照；兜底键/hydration/5s 确认无） |
| 3 conversation-dom.ts | 升级（机制层：turn 锚点+一次性扫描消费；属性命名与滚动根契约确认无） |
| 4 composer-visuals.ts 加号 hover | **确认无参照**（同族旁证；同模块「回到底部居中」顺带拿到 asar 直证） |
| 5 WorkspaceShortcutBridge.tsx | 升级（role:alert/common.retry/common.close 结构惯用法；三键文案/chooseAgain 确认无） |

**计数：found=4，absent=1。** 两个工具性勘误供后续批次沿用：① 中文模式必须 `LC_ALL=C`（UTF-8 locale 对二进制假 0）；② `role:` 选择器模式用 `.` 通配而非字面 `=`（`role=.tree.` 会漏检全部 backtick 形态）。
