# 批次 7 补采（gapfill-7）· 2026-10-30

> 对 batch-7.md「无参照项」5 条逐条再挖。全部命令本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 字节）。
> 方法说明：本机 `grep` 为 ugrep，`.\{0,N\}` 多字节有界重复超复杂度上限（实跑报错 `exceeds complexity limits`），故上下文一律改用 `LC_ALL=C grep -a -b -o PATTERN` 取字节偏移 + `tail -c +N $A | head -c M` 切窗口。设计文档侧翻了 batch-7 未引用的 `03j-dialog.md`、`03k-context-menu.md`、`03i-command-palette.md`、`04-open-gaps.md`（逐条见下）。

## 勘误（batch-7 头部一处取证缺口）

batch-7 头部记「波值三元组（2.6…1.7…1.25 等 6 种模式）在 asar 0 命中」。本轮改用压缩形态 `scaleX:2\.6` 等模式实跑：

- `LC_ALL=C grep -a -o -c 'scaleX:2\.6' $A` → **1**；`scaleX:1\.7` → **1**；`scaleX:1\.25` → **1**
- 命中处即 `Vst` 波函数原文（字节偏移 328166898）：
  `function Vst({itemIndex:e,visualFocusItemIndex:t}){if(t===void 0)return{colorTone:\`muted\`,opacity:.58,scaleX:1,tone:\`idle\`};let n=Math.abs(e-t);return n===0?{colorTone:\`focus\`,opacity:1,scaleX:2.6,tone:\`peak\`}:n===1?{colorTone:\`muted\`,opacity:.86,scaleX:1.7,tone:\`near\`}:n===2?{colorTone:\`muted\`,opacity:.72,scaleX:1.25,tone:\`mid\`}:{colorTone:\`muted\`,opacity:.58,scaleX:1,tone:\`idle\`}}`
- 另 rail 刻度 span 类名同窗命中：`block h-0.5 w-3 origin-left rounded-full transition-[height,opacity,transform,background-color] duration-150 ease-out motion-reduce:transition-none`（`duration-150 ease-out` 全 bundle 15 处）；tooltip `Vw` 参数 `openDelay:120` ×3、`closeDelay:80` ×2，与 02-motion §5 记录一致。

即：A1 波值、A4 刻度几何、A5 过渡档在 asar 均有直接原文，后续批次可引 asar，不必只引 CDP 文档。

---

## 1. turn-rail-zcode.ts:323 `CLICK_FEEDBACK_MS=260`（flashClickedTick :325-337）

**搜索过的模式**：`duration-260`（0）、`\[260ms\]`（0）、`260ms`（0）、`isClicked`（0）、`tone:.peak.`（**1**）、`visualFocus`（**2**）、`scaleX:2\.6/1\.7/1\.25`（各 1）；`,260)` 与 `setTimeout\([^,]{1,60},260` 因 ugrep 复杂度限制报错未跑成，改用「整组件窗口取证」替代（下）。

**命中原文**：rail 按钮完整 handler 集（偏移 330705984 之后窗口）：
`onBlur:()=>u(void 0),onClick:()=>o({unitIndex:n.unitIndex,rowId:n.rowId},c?\`auto\`:\`smooth\`),onFocus:()=>u(t),onPointerEnter:()=>u(t),onPointerLeave:()=>u(void 0)`
——点击是**立即跳转**（reduced-motion 时 `auto`），onClick 不设置任何视觉状态、无 setTimeout；整个按钮 JSX（含预览浮层）无计时器。`tone:\`peak\`` 全 bundle 仅 1 处 = `Vst` 内部，唯一驱动源是 `visualFocusItemIndex`（hover/focus 经 `onPointerEnter`/`onFocus` 写入、`onPointerLeave`/`onBlur` 清除）。运行中条目强调 `opacity:a?.9:n.isRunning?Math.max(i.opacity,.72):i.opacity`（.9 静息强调亦同窗证实）。

**最终判定：确认无参照（且有反证）**——ZCode 没有「点击后停留 N ms 再交还」的档位；260ms 是 DSH 对宿主跨像素挂载延迟的自有补偿（02-motion.md §3「待实施」项维持无 ZCode 数值可引）。峰值三元组（scale 2.6 / op 1 / 全前景）来自 d0 波峰的 asar 原文已补齐（见勘误），一致项证据升级。

## 2. session-move.ts 全模块

**搜索过的模式**：`LC_ALL=C grep -a -o 'taskGroup\.[A-Za-z]*'` 全键清单（33 键）；`taskGroup\.moveToGroup[^"]*"[^"]*"`（zh/en/代码 3 处）；`taskGroup\.(createFailed|renameFailed|ungroupFailed|colorFailed|updateFailed)"` 值；`[a-zA-Z]*[mM]ove[a-zA-Z]*Failed`（`moveToFailed` ×2，实为某内嵌脚本 API 关键字表 `'moveInTurret','moveObjectToEnd',…`，非 i18n）；`移动失败`（2）；`workflows\.hub\.move` 族；文档：`03k-context-menu.md` grep `移动|分组|w-52|208`（**0 命中**，该菜单从未采集）、`03j-dialog.md`（弹窗几何 A1 512/A2 16px）。

**命中原文**（ggt 任务右键菜单组件全文，偏移 328505372 窗口）：
- 根菜单 `className:\`w-56\``（224px）；「移动到分组」项 `"data-testid":\`task-group-move-menu\``；子菜单 `className:\`w-52\``（208px）内含 `"data-testid":\`task-group-remove\``（移出分组，无组时 disabled）+ 分组项 `"data-task-group-target":n.id` + 色点 `SF`（`size-2.5 rounded-full`）+ `truncate` 标题；
- 分组项 `onSelect:()=>{_||c(e,n.id)}`、当前组 `disabled:!!_||n.id===t`——**点击立即移动，无任何确认弹窗**（对照 DSH `locales.ts:197-199` 的 `sessions.moveConfirmTitle/Description/Action`：插件有确认弹窗，ZCode 没有）；
- 移动失败处理（偏移 328591268）：`.catch(e=>{J.error(\`[task-groups] 移动失败\`,e),Ma(n.formatMessage({id:\`taskGroup.failed\`})),t.refresh()})`，其中 `taskGroup.failed`=\`分组操作失败，请重试\`（en "Group action failed. Please retry."）——toast + 单一泛化文案，无细分错误键；重试型 toast 带参数 `{durationMs:0,actionLabel:…retryPlacement,…dedupeKey:\`task-group:${e}\`}`（偏移 330934795）；另一处 `workflows.hub.move.failed`=\`移动失败：{reason}\`、`workflows.hub.moveDialog.title`=\`移到项目\`（工作流移动另有弹窗，不同表面）。

**最终判定：升级为有参照（found）**——batch-7 缺的「确认弹窗/错误文案」两侧都采集到了：① ZCode 移动无确认、点击即执行（对 DSH moveConfirm* 是明确反例参照，采纳与否属设计决策）；② 错误反馈 = toast + 单键 `taskGroup.failed`（对 DSH 8 键 `sessions.move*` 细分映射是粒度参照）；③ 菜单几何 `w-56`/`w-52`/色点 `size-2.5` 可补进 `03k-context-menu.md`（该文档现无任务菜单记录）。

## 3. shared-now.ts:3 `SHARED_NOW_INTERVAL_MS=60_000` + 整分对齐（:6-9）

**搜索过的模式**：`60000`（142）、`60_000`（**2**）、`relativeTime`（7）、`Intl\.RelativeTimeFormat`（1）、`formatDistance`（0）、`react-timeago`（0）、`刚刚`（7）/`分钟前`（4）/`小时前`（3）/`天前`（7，其中 4 处为注释文案）、`useInterval`（10）、`refreshInterval`（17）、`useNow`/`useClockNow`/`useTicker`（均 0）、sidePane `openedAtLabel` 前文 1200 字节窗口；文档 `04-open-gaps.md`/`03h-detail-sweep.md` grep 相对时间/刷新/页脚/移动（仅 1 条无关 CDP 超时）。

**命中原文**：
- `60_000` 两处均在内嵌 `parse-ms` 库（`function parseMilliseconds… minutes: Math.trunc(milliseconds / 60_000 % 60)`），与刷新节奏无关；
- `relativeTime` 5 处在 sidePane 最近关闭标签组件（偏移 332037358）：`[d,f]=(0,Q.useState)(()=>Date.now())` → `openedAtLabel:r.relativeTime(e.openedAt??d)`，时间戳**挂载时冻结**、无任何定时器驱动 `f`；
- `useInterval` 10 处全为 @dnd-kit 自动滚动；`refreshInterval` 17 处全为 SWR 库内部（`config.refreshInterval`）；无 `useNow` 类 hook；
- ZCode 相对时间格式化函数 `wA`（偏移 328064077）：`function wA(e,t){let n=Date.now()-e,r=Math.floor(n/6e4);if(r<1)return …justNow; if(r<60)return …minutesAgo; let i=Math.floor(r/60);if(i<24)return …hoursAgo; let a=Math.floor(i/24);return …daysAgo}`，配 `taskList.justNow:\`刚刚\``、`taskList.minutesAgo:\`{minutes}分\``、`{hours}小时`、`{days}天`（另有 `sidePane.time.*`、`common.*`、`settings.memory.viewer.updated.*`、`feedback.time.*` 四族同构键）；
- `Intl.RelativeTimeFormat` 唯一用处是标题日期的日粒度（`format(a,\`day\`)` → 「今天/昨天 HH:mm」，否则绝对日期）。

**最终判定：确认无参照（且有反证）**——ZCode 没有 60s 周期刷新相对时间的 ticker（标签挂载冻结、靠组件重渲染顺带更新），60_000 + 整分对齐是 DSH 自有机制。附带新采集：`wA` 档位边界（最细档 = 分钟，「刚刚」<1min）可作 shared-now「分钟粒度足够」的旁证，但它不是刷新节奏的数值参照。

## 4. footer-actions.ts:2-4 `CONTEXT_OVERVIEW_FOOTER_ID` 页脚隐藏规则

**搜索过的模式**：`洞察`（**0**，本轮复跑）、`context-overview`（**0**）、`sidebar\.footer`（0）、`footer\.[a-zA-Z]+`（34，全为 VS Code core 杂项键 footer.js/length/nodes/selection 等，无 i18n 菜单键）、`sidebar-footer`/`side-pane-footer`/`footer-menu`/`SidebarFooter`（均 0）、`cm-footer-stack`（asar 0，系 DSH 侧类名，见 03b-sidebar.md §7）、精确值反查 `[a-zA-Z.]+":\`记忆\`` → `settings.memory`、`":\`归档\`` 无直配（相关键 `archives.unarchive`、`workspaceSidebar.archivedTasks`）。

**命中原文**：无目标命中；ZCode 侧栏页脚条目为固定 i18n 按钮（页脚栈 = 记忆/任务/归档，03b-sidebar.md §7 逐帧采样所记），asar 内不存在动态「页脚槽位注册 + 过滤」的对应结构。

**最终判定：确认无参照**——`HIDDEN_FOOTER_ACTION_IDS` 隐藏规则是插件自有槽位裁决（dsh-context 挂 `sidebar.footer.action` 的入口不落侧栏页脚），ZCode 无此决策面。

## 5. session-navigation.ts 全模块

**搜索过的模式**：`openSession`（**9**，逐处 dd 上下文）、`quickOpen`（**8**）、`selectPanel`（**0**）、`uiWorkspace`（**0**）、`QuickOpen`（0）；文档 `03i-command-palette.md` grep `关闭|selectPanel|打开会话`（0 命中）。

**命中原文**：openSession 9 处 = `automations.runs.openSession:\`跳到会话\``（zh/en i18n ×4）+ `openSessionFailed:\`目标项目当前未连接，无法打开该会话\`` + pane store 动作 `openSessionFromSidebar`/`openSessionInNewPane`/`splitPaneWithBinding` 等（自动化运行记录菜单与 pane 布局 store）；quickOpen 8 处全为 `remote.quickOpen` 远程设备工作区快开，与 ⌘K 无关。

**最终判定：确认无参照**——ZCode 的 openSession 均是 pane 布局 store 行为或自动化入口文案，不存在「打开会话后需关闭某个全局面板」的对应物；`selectPanel(null)` 时序是 DSH 宿主 API 行为（`uiWorkspace.openSession`/`sessions.open` 分支），无视觉决策点，维持跳过结论。

---

## 汇总

| 条目 | 判定 |
|---|---|
| turn-rail-zcode.ts CLICK_FEEDBACK_MS=260 | 确认无参照（有反证：ZCode 点击即跳、无停留档）；波峰取值 asar 原文补齐（勘误） |
| session-move.ts 全模块 | **升级为有参照**：无确认弹窗 + toast `taskGroup.failed` + 菜单几何 w-56/w-52 |
| shared-now.ts 60s 刷新档 | 确认无参照（有反证：挂载冻结、无 ticker）；wA 分钟粒度档位为旁证 |
| footer-actions.ts 隐藏规则 | 确认无参照（ZCode 页脚为固定 i18n 按钮） |
| session-navigation.ts 全模块 | 确认无参照（ZCode openSession 均为 pane store/自动化表面） |

found=1，absent=4。
