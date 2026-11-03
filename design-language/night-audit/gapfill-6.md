# 补采 6 · batch-6 无参照项二次挖掘（gapfill-6）

> 补采范围：batch-6.md「无参照项」全部 5 条。方法：先推断 ZCode 侧载体（i18n 键族 / 组件名 / tailwind 类 /
> 图标 prop），再对 asar 跑 `grep -a -o`（ugrep 7.8.4；带 `.{N}` 上下文的模式直接可跑，个别宽窗口用
> python 单遍扫描等价提取，均附字节偏移可复核）。另核查了 batch-6 未引用的文档章节：
> `03d-composer-zcode-spec.json`、`03c-conversation-zcode-spec.json`、`03f-settings-zcode-spec.json`、
> `03b-sidebar.md`、`03h-detail-sweep.md`、`04-open-gaps.md`。
> 复现示例：`LC_ALL=C grep -a -o -E '.{70}ToBottom.{70}' /Applications/ZCode.app/Contents/Resources/app.asar`
>
> **总判定：found 3 / absent 2**（条目 1、3、4 升级为有参照；条目 2、5 确认无参照，但补齐了否定性证据）。

---

## 条目 1 · composer visuals（index.ts:169-170 → composer-visuals.ts）—— **found（原「未验证」升级为有参照）**

**原跳过理由**：asar「回到底部」0 命中、`scrollToBottom` 35 处全为 xterm；03d-composer.md 无记录。

**搜索过的模式**（`grep -a -o -F` 计数）：`回到底部`0、`到底部`1、`回到最新`0、`跳到最新`0、`最新消息`0、
`toBottom`5、`ToBottom`105、`to-bottom`92、`scrollDown`14、`ScrollDown`37、`backToBottom`0、`BackToBottom`0、
`atBottom`3、`AtBottom`35、`isAtBottom`21、`toLatest`0、`jumpToLatest`0、`newest`43、
`arrow-down-to-line`22、`ArrowDownToLine`26、`滚动到底部`1、`chat.scrollToBottom`6、`Scroll to bottom`3、
`添加上下文`4、`MessageCirclePlus`26、`icon-md`67、`ghost:`（多变体）、`--color-hover:`4。
**关键突破**：原批只搜了「回到底部」与 `scrollToBottom`；ZCode 实际键名是 `chat.scrollToBottom`=`滚动到底部`，
载体组件名 `mhn`（由渲染处反查定义）。

**命中原文**（asar）：
1. i18n：`"chat.scrollToBottom":\`滚动到底部\``（zh 表，@310466990 邻域）；en `"chat.scrollToBottom":\`Scroll to bottom\``。
2. 按钮组件定义 @330736069：
   `function mhn({className:e,label:t,onClick:n}){return(0,$.jsx)(X,{"aria-label":t,title:t,type:\`button\`,size:\`icon\`,variant:\`outline\`,className:Z(\`rounded-full bg-card hover:bg-card-selected\`,e),…action:\`jump_bottom\`,trigger:\`button\`…})}`
3. 渲染点（两处均**水平居中**）：
   - `(0,$.jsxs)(\`div\`,{"data-v4-back-to-bottom-anchor":\`composer-dock\`,className:\`relative\`,children:[Ge?(0,$.jsx)(mhn,{className:\`pointer-events-auto absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 shadow-sm\`,label:z.formatMessage({id:\`chat.scrollToBottom\`}),onClick:Vt}):null,…`
   - `Ge&&!_?(0,$.jsx)(mhn,{className:\`absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm\`,label:…}):null`
   - CSS 常量表 @328972071：`Fkt=\`[data-v4-back-to-bottom-anchor="composer-dock"] button\``（一等锚点，另有布局常量 `Ikt=8,Lkt=32,Rkt=16`）。
4. 加号（添加上下文）按钮 @329354934（组件 `HGt`，消费 `chat.composer.actionMenu`=\`添加上下文\`）：
   `(0,$.jsxs)(X,{type:\`button\`,variant:\`ghost\`,size:\`icon-md\`,className:\`gap-1 rounded-lg text-ui-base\`,…,"aria-label":e,…children:[(0,$.jsx)(vc,{className:\`size-4\`}),(0,$.jsx)(\`span\`,{className:\`sr-only\`,children:e})]})`
5. Button 基组件 variant/size 表 @293661824 邻域（`data-slot:\`button\``）：
   base 无静态 bg 类（仅 `border border-transparent bg-clip-padding`）；`ghost:\`text-foreground hover:bg-hover hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground\``；
   `"icon-md":\`size-7 rounded-lg [&_svg:not([class*='size-'])]:size-4\``。
6. hover 令牌链：`:root{--color-hover:var(--color-neutral-200)}`（@325832699）、`.dark{--color-hover:var(--color-surface-hover)}`（@326228788）——与 03b-sidebar.md:136 已录 `--color-surface-hover` 同源。
7. 文档旁证：`03d-composer-zcode-spec.json`（ZCode 3.16.3 CDP 9224 实测）「添加上下文」按钮 w28 h28 radius 8px **bg: transparent**；该文件 `_meta.note` 自述「焦点态未采（需真实交互），列入待办」。

**最终判定**：两个子项均有 ZCode 直接依据——
- **回到底部居中**：ZCode 两处渲染均 `left-1/2 -translate-x-1/2`（以 composer dock 为锚居中），与 composer-visuals.ts 的 `justify-content:center`（含清右内边距）同构。batch-6 的「无 ZCode 例证」作废。
- **加号静止态无圆底**：ZCode 加号 = ghost variant（**无静态 bg 类**）+ `icon-md`（28px/8px 圆角），hover 才 `hover:bg-hover`；CDP 实测静止态 `bg: transparent`。与「静止态清零、hover 重声明令牌」对齐。
- 两点残留偏差（如实记录，不影响升级）：① 插件 `:focus-visible` 也给底色，ZCode ghost 无 `focus-visible:bg-*`；② ZCode hover 底形状是 8px 圆角方块而非「圆形」——原注释「圆形底」描述的是 DSH 宿主形态，ZCode 侧不成立。

---

## 条目 2 · virtual-skip 默认关 / `?session=` deep link / 设置分区 order（index.ts:171-174,442-454,456-463）—— **absent（确认无参照，补齐否定性证据）**

**搜索过的模式**：`content-visibility`15、`contentVisibility`225、`contain-intrinsic`62、`useVirtualizer`32、
`rowWindowKey`、`StickToBottom`、`wasPinnedToBottom`、`?session=`1、`session=`45、`sessionUrl`0、`openSession`9、
`focusSession`0、`zcode://`6、`zcode://session`0、`deepLink`1、`deep-link`47、`deep_link`0、
`searchParams.get`64（键枚举）、`MAX_SAFE_INTEGER`486、`settings.about`/`settings.section`0（batch-6 已查）、
`settings.sidebar`9、`settingsNav`3、`settings.entries`0、`settings.items`0、`settings.menu`0、`settings.groups`0、
`lastWorkspaceSession`、`lastActiveWorkspace`；文档侧 `03c/03d/03f-*-zcode-spec.json` 无 bottom/session/order 记录。

**命中原文**：
1. `contentVisibility` 225 处**全部**为 lottie-web 渲染器内部（`this.svgElement.style.contentVisibility=this.renderConfig.contentVisibility` 等，@153648997 起）；`content-visibility` 15 处全部为 CSS 属性名词典（`'contain-intrinsic-size', … 'content-visibility', …`，@139653104 起）。**ZCode 未把 content-visibility 用于消息列表**。
2. ZCode 对同一问题域（长会话滚动/性能）的真实方案：自建行窗口 + 滚动锚定——`rowWindowKey`、`wasPinnedToBottom`、`gmn()==\`stickToBottom\``、`_hn` 组件（`getSnapshotBeforeUpdate` 捕获/提交滚动锚，@330736069 邻域），且捆绑了 `StickToBottom.js`/`useStickToBottom.js`（asar 文件表 @251651397 起）。
3. `?session=` 唯一命中 @230494898 = Playwright/Selenium：`hubUrl).origin + "/grid/api/testsession?session=" + sessionId`。`searchParams.get` 键全集（embedded/variables/service_id/query/state/returnTo/filter/trace）**无 session**。`zcode://` 6 处为 OS 协议注册；`deep-link` 47 处全为 `[deep-link]` Linux desktop-entry 日志。
4. 设置导航 @328132662：`settingsNavigation` 模块 = localStorage 记忆上次分区（读写 `oj` 键，`fot/pot/mot`）+ 旧 id 归一（`plugins`→`plugin`、`codePreview`→`appearance`）+ 静态跳转函数（`got(){uj(\`usage\`)}` 等）；无 order 数值注册面。分组键仅 `settings.sidebar.group.basics/agentCapabilities/dataAndStats` 三个。

**最终判定**：三个子项**确认无 ZCode 参照**，维持 batch-6「DSH 宿主适配/扩展面」结论，但补两条可用上下文：
① virtual-skip 的 CSS 手法在 ZCode 无对应——ZCode 侧消息区已由**自建 JS 虚拟化**（rowWindowKey + 滚动锚 + stick-to-bottom）解决同一问题，content-visibility 仅 lottie 内部使用；写插件注释时「ZCode 同款」类措辞不应覆盖此模块。② `?session=` 与 order 注册面在 ZCode 结构性不存在（桌面 channel 模型 + 静态分区），不应再作为待对齐项挂账。

---

## 条目 3 · session-navigation-shortcuts（web 档 primary+alt / regions-modals 模型 / 边界文案）—— **found（边界文案子项升级；另两子项确认无）**

**搜索过的模式**：`channel:\`window\``19、`channel:\`menu\``6、`channel:\`text\``7、`channel:\`thought\``2、
`channel:\`web\``0、`defaultBindings:`+Alt 过滤、`CmdOrCtrl+Alt`、`regions:`41、`regions:[`3、`modals:`0、
`modals:[`0、`` `editable` ``1、`` `page` ``33、`没有可切换`1、`没有上一个`0、`没有下一个`0、`已是第一个`0、
`已是最后一个`0、`没有更多任务`0、`noTarget`72、`noMore`12、`taskNav`40；文档 `02-motion.md`、`03f-settings*.md` 无记录。

**命中原文**：
1. **边界文案（升级为有参照）**——i18n 键族（@310466990 邻域）：
   `"taskNav.back":\`后退\``、`"taskNav.forward":\`前进\``、`"taskNav.noMoreBack":\`没有更早的任务了\``、`"taskNav.noMoreForward":\`没有更新的任务了\``（en：`No previous tasks` / `No …`）。
   消费处 @332236717：任务后退导航回调沿历史栈回溯、跳过不可导航项（`bo(e)`/`Qa(e)`/`HBn(…)` 分支），**栈耗尽 → `Ma(e.formatMessage({id:\`taskNav.noMoreBack\`}))`（用户提示调用；同一 `Ma` 也用于错误提示 `Ma(String(e))`，具体呈现形态未实测）**；前进回调对称用 `noMoreForward`；另有 blocked 分支 `taskList.switchBlockedByModelRestart`=\`模型供应商切换中，暂时不能切换任务。\`（`J.info` 日志后 `Ma` 提示并 return）。
2. **web 档（确认无）**：channel 枚举全集 = window/menu/text/thought，无 web 档；唯一 Alt 绑定 `CmdOrCtrl+Alt+b` 属 `{id:\`toggleSidePane\`,channel:\`window\`}`（@325562966 邻域）——是桌面绑定本身，非浏览器占用补偿。
3. **regions/modals（确认无）**：`regions:` 41 处全为 echarts 地图 `regions:[]`；`modals:` 0 处；`` `editable` `` 唯一命中 @329222758 为 Lexical `setEditable`。ZCode 快捷键作用域模型 = channel，与插件的 regions/modals 正交。
4. 句式先例（非同物）：`"webRemoteControl.noSwitchableWorkspaces":\`没有可切换的工作区\``（@310442266）——「没有可切换的 X」句式在 ZCode 有先例，但对象是 web 远程控制的工作区。`noTarget` 72 处全为 echarts dataZoom `_noTarget`，与插件键名无关。

**最终判定**：边界文案子项**升级为有参照**——ZCode 存在同行为（上/下一个任务导航到边界 → toast），键为 `taskNav.noMoreBack/noMoreForward`，措辞按方向分键（「没有更早/更新的任务了」）；插件 `sessions.noTarget`=「没有可切换的会话。」单键双向复用，后续可据此裁决（拆双键或保留单键，属术语系「会话→任务」裁决范畴）。web 档 primary+alt 与 regions/modals **确认无参照**（结构性不存在，维持跳过）。

---

## 条目 4 · workspace-hover-card 悬停卡内容与描边 —— **found（原「无采样、不可裁决」升级为已采样可裁决）**

**搜索过的模式**：`未读`20、`unread`367、`Unread`155、`UNREAD`2、`条未读`0、`unreadCount`0、`markUnread`0、
`个任务`30、`HoverCardContent`24、`hasUnread`、`unread-indicator`、`taskUnreadOverlay`、`icon-md`、
`strokeWidth[=:]<n>` 分布统计、`stroke-width=` 属性分布、`stroke-[1.5]`0、`[stroke-width:1.5]`0、
`viewBox:"0 0 12 12"…strokeWidth:"1.5"`2、`viewBox:"0 0 24 24"…strokeWidth:"2"`6、
`strokeWidth:1.5,className:\`size-4`0；文档 `03b-sidebar.md`、`03h-detail-sweep.md`、`06-component-roadmap.md`（hover 卡「待提取」）。

**命中原文**：
1. **ZCode 项目行未读表达**（@328638856，`virtual-project-row` 组件）：
   `(0,$.jsx)(\`span\`,{"data-testid":\`virtual-project-unread\`,"data-workspace-unread-indicator":\`true\`,role:\`img\`,"aria-label":w.formatMessage({id:\`project.hasUnread\`}),className:\`size-1.5 shrink-0 rounded-full bg-icon-blue\`})`（6px 蓝点，仅在项目折叠且 online 时显示）；任务行未读同型：`"data-unread-indicator":\`true\`` + `size-[7px] rounded-full bg-icon-blue`（7px）。i18n：`"project.hasUnread":\`项目有未读任务\``。
2. **ZCode 项目悬停卡已采样**（`function sht` @328454624，Radix HoverCard，`__scopeHoverCard`）：`openDelay:300`、内容 `w-80 max-w-[calc(100vw-2rem)] rounded-xl p-3 text-ui-sm`、`role:\`tooltip\``、`side:\`right\``；结构 = 标题 `strong` + 连接状态色字 → host 状态行（`rht`）→ `dl` 网格（project.name / projectDevice / projectLine / connectionAddress / projectPath，地址与路径 `font-mono`）→ pending 时设备设置按钮（`Ac`/`ts` 均 `size-3.5`，**未传 strokeWidth**）。**仅远程项目挂卡（`if(!e)return l`——无 host 的本地项目行不渲染卡）；卡内无任务数、无未读摘要、无 pin/编辑按钮、无分支行。**
3. 任务计数键仅两处：`"chat.toolCall.workflow.graph.card.tasks":\`{count} 个任务\``（工作流卡片）、`"taskList.archivedTaskCount":\`{count} 个归档任务\``（归档区）——均非侧栏悬停卡。
4. **描边分布**（全库含图表库）：`strokeWidth` 值 1×68、2×63、1.5×23、1.2×19、1.33×14…；UI 层锚点：自绘 12×12 svg 用 `strokeWidth:"1.5"`（2 处）、自绘 24×24 用 `strokeWidth:"2"`（6 处）、**`strokeWidth:1.5` 与 `size-4`（16px）同现 0 处**、tailwind `stroke-[1.5]` 0 处。`02-motion.md:370`「图标 14×14 / stroke 1.5」为 ZCode CDP 9224 实测（**正文操作行**，非侧栏）。

**最终判定**：原「ZCode 侧栏悬停卡无采样」作废，两项均可裁决——
- **内容**：ZCode 悬停卡 = 远程身份卡（设备/线路/地址/路径），**任务数/未读摘要在 ZCode 无对应物**；未读由行内蓝点（项目 6px / 任务 7px）+ aria 表达。插件的「{count} 个任务 · {unreadCount} 条未读」（:26-28）与「会话行去时长」（:33-35 的自证理由）不与 ZCode 冲突，但摘要想对齐 ZCode 时方向是**行内蓝点**而非卡内摘要。
- **描边**：ZCode 16px Lucide 层**从不**传 1.5（0 处锚点；默认 2）；1.5 只出现在自绘 12px 图标与 14px 正文操作行（CDP 实测）。插件 :38 `ZIconChannels 16px + strokeWidth 1.5` 无 ZCode 依据；:31,39,40,41 不传（=2）与 ZCode 一致。**混用可裁决：16px 档统一默认 2，:38 应去掉显式 1.5**（batch-6 的「建议另行内部统一」现在有了方向）。

---

## 条目 5 · workspace-compat.ts:16-62 / settings-focus.ts:2-13 —— **absent（确认无参照，原判加固）**

**搜索过的模式**：`FocusScope`71、`focus-trap`27、`trapFocus`41、`focusTrap`0、`inert`790、`aria-hidden`1261、
`getComputedStyle`827、`visibility === "collapse"`0、`"collapse"`22、`tabIndex>=0`2、`focusable`471、
`baselinesReady`0、`recentWorkspace`0、`mostRecentWorkspace`0、`lastWorkspace`66、`lastActiveWorkspace`、
`alertdialog`12、`querySelectorAll(\`button`2、`button:not([disabled])`10；uiplug 侧消费方核查
（`grep -rn settingsElementAvailable\|settingsOverlays src/client/` → CodexSettingsPage.tsx:142-190 设置页焦点圈定/Escape/Tab 循环）。

**命中原文**：
1. `tabIndex>=0` 2 处均为 **focus-trap 库内建 TreeWalker**：`document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:e=>{let t=e.tagName===\`INPUT\`&&e.type===\`hidden\`;return e.disabled||e.hidden||t?NodeFilter.FILTER_SKIP:e.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}})`。`focusable` 471 处主要是 @floating-ui（`data-floating-ui-focusable`）与 Radix RovingFocusGroup。→ ZCode 焦点管理确为库内建，无自建设置页焦点圈定。
2. 与 `settingsElementAvailable` 形似但不同物的两处：RUM 采集 SDK `isInteractiveElement`/`isTrustedInteraction`（@9826116，`"none"===o.display||"hidden"===o.visibility||"0"===o.opacity?0:1`，行为分析用）与图表库 `"hidden"!==a.visibility&&"collapse"!==a.visibility||(o.invisible=!0)`——**均非设置页浮层枚举/焦点判定**；`settingsOverlays` 的 role 枚举（dialog/alertdialog/menu/listbox）+ inert/hidden/aria-hidden 组合在 ZCode 无对应。
3. `baselinesReady` 0、`recentWorkspace` 0；ZCode 对应物是**持久化单值**：设置 schema @278977263 `lastActiveWorkspace:Vs.nullable().optional()` + `lastWorkspaceSession:e.array(Vs)`（会话恢复）——机制不同（显式记住上次活动 vs 按 session updatedAt 求最近 + 平局保 Host 顺序），非同构可对照。`has*` 服务能力探测是 DSH 插件宿主 API 面，ZCode 为单体应用结构上不存在。

**最终判定**：**确认无参照**，维持 batch-6 跳过。补充两点否定性证据使该结论可复核：① ZCode 的 `getComputedStyle` 可见性检测只有 RUM SDK 与图表库两处形似物，语义均不符；② 最近工作区在 ZCode 是 schema 持久化单值（`lastActiveWorkspace`），`recentWorkspaceId` 的平局保序算法没有上游可对齐——插件注释「与 DSH 官方最近工作区策略一致」（workspace-compat.ts:36）指的是 **DSH** 官方而非 ZCode，措辞无误，但不应被误读为有 ZCode 参照。

---

## 汇总

| 条目 | 原判 | 本次判定 | 关键新证据 |
|---|---|---|---|
| 1 composer visuals | 未验证，跳过 | **found** | `chat.scrollToBottom`=`滚动到底部`；`mhn` 组件两处渲染均 `left-1/2 -translate-x-1/2` 居中；加号 ghost variant 无静态 bg + `hover:bg-hover`；CDP 实测 bg transparent |
| 2 virtual-skip / ?session= / order | 跳过 | **absent** | contentVisibility 全为 lottie；ZCode 用 rowWindowKey 自建虚拟化；`?session=` 唯一命中为 Selenium；settingsNavigation 无 order 面 |
| 3 快捷键 web 档 / regions-modals / 边界文案 | 跳过 | **found（边界文案子项）** | `taskNav.noMoreBack/Forward` 键族 + @332236717 消费处 toast；channel 全集无 web；regions/modals 0 |
| 4 悬停卡内容与描边 | 无采样，跳过 | **found** | 项目悬停卡 `sht` 完整采样（身份卡，无任务/未读）；未读=行内 6px/7px 蓝点；16px 层 strokeWidth 1.5 零锚点 |
| 5 workspace-compat / settings-focus | 跳过 | **absent** | tabIndex>=0 均为 focus-trap 库；形似可见性检测属 RUM SDK/图表库；`lastActiveWorkspace` 为持久化单值 |
