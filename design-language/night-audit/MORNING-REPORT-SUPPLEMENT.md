# 早间报告增补（MORNING-REPORT-SUPPLEMENT）

> 生成：2026-10-30。依据：交叉复检 9 份（cross-4-甲/乙/丙、cross-8-甲/乙/丙、cross-10-甲/乙/丙）+ 无参照补采 20 份（gapfill-1…20）+ 对照物 `MORNING-REPORT.md`（第 4 版）与原批次 `batch-4.md` / `batch-8.md` / `batch-10.md`。
> 本文件为纯汇总：除卷首「本会话实跑核验」7 组命令外未新增取证；每个结论后括注出处（文件:行）。「升级/推翻」均指相对早间报告或原批次记录而言。

## 本会话实跑核验（python3 mmap 读 `/Applications/ZCode.app/Contents/Resources/app.asar`，用于裁决第 1 节矛盾）

| # | 检查 | 命中 | 结果 |
|---|---|---|---|
| 1 | `project-drop-indicator` 后 320B 上下文 | 1 处 @328643708 | `children:(0,$.jsx)(\`span\`,{className:\`absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-icon-blue bg-sidebar\`})` —— **ZCode 落点线有 8px 空心圆点子元素** |
| 2 | 全部 `Go back` 偏移 + @310930680 起 600B 窗口 | 17 处；@310930815 | 15 处为注释/散文；locale 表内 `"taskNav.back":\`Go back\`,"taskNav.forward":\`Go forward\``（另 2 处 locale 命中 @310904218/@310991010）—— **EN 文案「Go back」作为 i18n 值成立** |
| 3 | `--text-ui-2xs` | 2 处 | `--text-ui-2xs:calc(var(--ui-font-size) - 5px)` @325830816（=9px）—— **界面字号第 7 档存在** |
| 4 | `--radius-3xl:[^;}]*` | 1 处 @325829599 | `--radius-3xl:1.5rem`（=24px）—— **ZCode 圆角有 24px 档** |
| 5 | `"chat.turnNavigator.label":\`…\`` | 2 处 | zh @310465946 = `对话问题导航`、en @310930398 = `Conversation query map` —— **ZCode 有轮次导航表面与 aria 键** |
| 6 | `gap-1 shrink-0 \[app-region:no-drag\]` | 1 处 @331027282 | 导航钮行容器 = `flex items-center gap-1 shrink-0 [app-region:no-drag]`（gap-1 = 4px） |
| 7 | `h-12 px-3 gap-2` | 1 处 @331880565 | 上下文含 `lureStage:\`browser_navigate\`` —— gap-2 属 **browser 导航工具栏**，非桌面标题栏导航行 |

---

## 1. 交叉复检

覆盖 3 个交叉批次（4 / 8 / 10）× 三方（甲/乙/丙）。下文每批次先列三方一致的高置信结论（与原批次对照），再逐条列矛盾并判定谁对谁错。共列矛盾 **21** 条（批次 4 六条、批次 10 八条、批次 8 七条）。

### 1.1 批次 4（locales.ts / new-conversation-draft.ts / sidebar-session.ts）

**三方一致的结论（高置信，与 batch-4 无冲突）**

1. `workspace.showMore`「展开显示」→「显示更多」：甲（cross-4-甲.md:11，taskList/project/archives 三域）、乙（cross-4-乙.md:27）、丙（cross-4-丙.md:19，grep「展开显示」=0）与 batch-4:22 四方同判。
2. `sessions.waitingApproval`「等待审批」→「等待确认」：甲（cross-4-甲.md:12）、乙（cross-4-乙.md:24，另证「等待审批」「计划待审」全 asar 零命中）、丙（cross-4-丙.md:16，grep「等待确认」=4/「等待审批」=0）与 batch-4:25 四方同判。
3. `workspace.pinned`「置顶」→「已置顶」：甲（cross-4-甲.md:18）、乙（cross-4-乙.md:26）、丙（cross-4-丙.md:21）与 batch-4:26 同判。
4. `workspace.removeFromGroup`「移至未分组」→「移出分组」：甲（cross-4-甲.md:19）、乙（cross-4-乙.md:30）、丙（cross-4-丙.md:22）与 batch-4:29 同判；甲乙另录 ZCode 双键细节（`taskGroup.removeFromGroup`/`taskGroup.ungroup`=取消分组）。
5. `workspace.noChat`「暂无聊天」→「暂无任务」：甲（cross-4-甲.md:13）、乙（cross-4-乙.md:28，零命中佐证）、丙（cross-4-丙.md:20）与 batch-4:24 同判。
6. 侧栏开合「展开/收缩侧边栏」两动词 vs ZCode 单键 `workspaceSidebar.toggleSidebar`「切换侧边栏」：三方同取该 ZCode 事实（cross-4-甲.md:20、cross-4-乙.md:22、cross-4-丙.md:24），且三方同向建议「登记显式偏离/增强，不强行合并」。此项为交叉新增（batch-4 差异表未列）。
7. 「会话 vs 任务」术语系的事实面：三方一致确认 ZCode taskList 域用「任务」（cross-4-甲.md:13、cross-4-乙.md:23、cross-4-丙.md:25），batch-4:23-24 同；甲与丙进一步记下 ZCode 自身双轨（archives 域用「会话」，如 `archives.title`=已归档的会话，cross-4-甲.md:13；`archives.search`/`appHeader.copySessionId`，cross-4-丙.md:25）。三方一致结论：改词牵动全族，须术语裁决（对应早间 5.2）。
8. 以下一致项获三方或两方 + 原批次重合确认：`sidebar.newTask`=新建任务（甲 cross-4-甲.md:34 / 乙 cross-4-乙.md:38 / 丙 cross-4-丙.md:31 / batch-4:39）；`sessions.markUnread`=标记为未读（甲:29 / 乙:40 / 丙:33 / batch-4:40）；相对时间四档「刚刚/{count}分/{count}小时/{count}天」逐字一致（甲:28 / 乙:39 / 丙:32 / batch-4:44-45；gapfill-20.md:62 第三次复核）；分组动词新建分组/移动到分组（甲:33 / 乙:41 / 丙:35 / batch-4:41-42）。
9. 两方 + 原批次确认：`sessions.copyId`=复制会话 ID（甲 cross-4-甲.md:30 / 丙 cross-4-丙.md:34）；`home.projectEmpty`=没有匹配的项目（甲:36 / 丙:37 / batch-4:43）；`sidebar.schedule`=定时任务（丙:36 / batch-4:46）。
10. 草稿保护原则（不静默覆盖草稿）：甲（cross-4-甲.md:37，引 `chat.queue.editDraftConflict`）与丙（cross-4-丙.md:38）列为一致项；乙列为无参照（见下矛盾 5）。

**矛盾（逐条列明各方说法与判定）**

1. **⌘K 搜索占位符的 ZCode 对应键**：甲引 `quickPick.placeholder`=「输入命令」并称「ZCode 对应表面（命令面板）只搜命令」（cross-4-甲.md:15）；乙引 `commandCenter.placeholder`=「搜索操作、任务或文件」（cross-4-乙.md:20）；丙同乙并给出 grep 计数 1（cross-4-丙.md:27）；batch-4:30 则引 `taskSearch.placeholder`=「搜索任务」。**判定：乙丙对**。gapfill-2 条目四实读 ⌘K 面板 JSX，其占位与分组全走 commandCenter（gapfill-2.md:130-136,149-153）；gapfill-4 条目 4 复述同值（gapfill-4.md:86）。三个键都真实存在（quickPick.title 偏移见 gapfill-2.md:132），但插件的 ⌘K 合并搜索面板对应物是 commandCenter；batch-4:30 的「占位符长度差 10 倍」论据基于任务搜索表面，不适用于 ⌘K。
2. **ZCode 有无轮次导航表面**：乙称「ZCode 无轮次导航表面」，asar 搜「轮次」仅命中 conversationShare 限流文案（cross-4-乙.md:53）；丙键值回读 `chat.turnNavigator.*` 全 5 键（label=对话问题导航、jumpToQuery=跳转到第 {index} 条问题）（cross-4-丙.md:17-18）。**判定：丙对，乙错**。本会话实跑命中 `"chat.turnNavigator.label":\`对话问题导航\``（@310465946/en Conversation query map @310930398，见卷首核验 5）；gapfill-12 条目 2 证 `v4-turn-navigator-tooltip` 存在（side:right + sideOffset:8 + w-80，gapfill-12.md:37-38）；gapfill-14 条目 5 证 v4-turn-navigator 系 testid 6 处（gapfill-14.md:96）。乙的检索词「轮次」未覆盖「问题导航」措辞，属搜索盲区；乙声称的「轮次字串 0 命中」本身仍真。
3. **`sessions.running`「运行中」的定位**：甲列一致项（ZCode 多域同词「运行中」：webRemoteControl/sidePane/automations.lifecycle，cross-4-甲.md:35）；乙列差异项（任务行无文字状态、仅 spinner；ZCode 自动任务用 `automations.runs.status.running`=「进行中」，cross-4-乙.md:25，佐证 03b-sidebar.md:112）。**判定：两说引用的键分属不同表面、均可为真，无事实冲突；就「同位表面对齐」而言乙的口径更准**（ZCode 侧栏任务行确无文字状态，gapfill-20.md:86 复证 automations.runs.status.running=进行中）。维持早间 5.14 待裁即可。
4. **home 建议卡表面是否存在**：三方均按「无 ZCode 建议卡表面」处理——甲记「ZCode 无四分类，建议仅 2 条 chat.draft.suggestedPrompt」（cross-4-甲.md:22）、乙（cross-4-乙.md:49）与丙（cross-4-丙.md:44）列无参照跳过；batch-4:31/50 记「无任务建议卡」。**判定：三方与原批次的「表面不存在」前提被 gapfill-4 条目 1 推翻**——ZCode 有完整建议卡表面（`occupationOnboarding.suggestionsHeading`=试试这些任务、`chat.officeSuggestions.*`、组件 `t$t` @329892649，gapfill-4.md:24-33）；仅「四分类学措辞（探索/构建/审查/修复）」维持无参照（gapfill-4.md:33）。
5. **prefillNewConversation 守卫链**：甲与丙把「草稿不被静默覆盖」列为原则级一致项（cross-4-甲.md:37、cross-4-丙.md:38）；乙把四态守控行为列为无参照（cross-4-乙.md:51）；batch-4:51 列无参照。**判定：gapfill-4 条目 2 给出两可结论的精确版**——ZCode 行为链已定位（建议点击 → `requestComposerTextInsert` → composer `mQt`，@333085292/@329601657），但 **ZCode 无内容型守卫**，靠「仅草稿面挂载 + requestId 去重」做结构化门控；插件的内容守卫属刻意偏离（gapfill-4.md:44-52）。甲丙的「原则同源」成立，乙的「无从验证」被部分推翻。
6. **beginSidebarSession 先切页签**：三方与 batch-4:52 均判无参照（cross-4-甲.md:43、cross-4-乙.md:52、cross-4-丙.md:45）。**判定：被 gapfill-4 条目 3 推翻（行为层）**——ZCode 新建任务前有同构归位链「激活工作区页签 + 退出分组 + 重置主面板」再 `startDraft`（@332251839，gapfill-4.md:65-71）；页签树本身维持无参照（sidebar.* 59 键无页签键，gapfill-4.md:71）。

### 1.2 批次 10（foreign-surface-discovery / PluginConfigSection / workspace-drop-indicator / document-hidden-motion-pause / DesktopNavigationControls）

**三方一致的结论（高置信，与 batch-10 无冲突）**

1. 导航钮圆角 `border-radius:50%` → 8px（rounded-lg）：甲（cross-10-甲.md:14）、乙（cross-10-乙.md:17）、丙（cross-10-丙.md:11）与 batch-10:20 四方同判。
2. disabled opacity .35 → .50：甲（cross-10-甲.md:15）、乙（cross-10-乙.md:15，附 `disabled:opacity-50`×37 / `cursor-not-allowed`×34 统计）、丙（cross-10-丙.md:12）与 batch-10:22 同判；乙与 batch-10:22 同记 ZCode 亦有 opacity-35 先例（日历禁用格）。
3. 图标颜色 60% 前景 → 全前景（ghost `text-foreground`）：甲（cross-10-甲.md:17）、丙（cross-10-丙.md:13）与 batch-10:23 同判（乙未单列）。
4. hover 无过渡 → 补 transition-colors/150ms：甲（cross-10-甲.md:16）、丙（cross-10-丙.md:14）与 batch-10:24 同判（乙未单列）。
5. 拖拽落点线颜色 #000/#fff → `bg-icon-blue` 蓝：甲（cross-10-甲.md:19）、乙（cross-10-乙.md:11）、丙（cross-10-丙.md:18）与 batch-10:30 四方同判。
6. 按钮尺寸 28×28、图标 16px：甲（cross-10-甲.md:31）、乙（cross-10-乙.md:27-28）、丙（cross-10-丙.md:28）与 batch-10:40-41 四方同判。
7. document-hidden-motion-pause 逐行同构（JS + CSS）：甲（cross-10-甲.md:27-28）、乙（cross-10-乙.md:25）、丙（cross-10-丙.md:27）与 batch-10:37 四方同判（批次 8 亦四方同判，cross-8-甲.md:32 / cross-8-乙.md:31 / cross-8-丙.md:30 / batch-8:46）。
8. `data-slot` 标注手法同形：甲（cross-10-甲.md:35，×3 命中）、乙（cross-10-乙.md:31，×24）、丙（cross-10-丙.md:34，含 `getDerivedStateFromError`×36、`display:contents`×5）三方一致；gapfill-10 条目 5 的「插槽转发机制无对应物」（gapfill-10.md:119-127）与此不冲突（手法同形 ≠ 机制同构）。
9. 哨兵预算与插件槽位机制「确认无参照」：四方一致（cross-10-甲.md:40-41 / cross-10-乙.md:37-38 / cross-10-丙.md:42-44 / batch-10:50,54），gapfill-10 条目 1/5 维持（gapfill-10.md:21,127）。

**矛盾（逐条列明各方说法与判定）**

1. **落点线端点形态（三方全错，原批次对）**：甲称「纯 2px 直线，无圆角、无端点装饰……无端点子元素」（cross-10-甲.md:20）、乙称「纯 2px 方头线一条，无圆点、无圆角」（cross-10-乙.md:12）、丙称「2px 纯直线、无圆点无圆角」（cross-10-丙.md:18）——三方均据此把插件的「pill 线端 + 8px 空心圆点」列为差异项。原批次 batch-10:46 却将「2px 线 + `size-2 … border-2` 圆点」列为**一致项**。**判定：原批次对，三方错**。本会话实跑 @328643708 证 `children` 子元素 span（`size-2 rounded-full border-2 border-icon-blue bg-sidebar`，见卷首核验 1）；gapfill-1 条目 2（gapfill-1.md:52-55）与 gapfill-11（gapfill-11.md:41-44）引同一 JSX。三方只提取了容器 className、漏读 children——插件的 8px 空心圆点与 ZCode 同构，「端点形态」不是差异。
2. **双钮间距**：丙列一致项「双钮间距 8px ↔ `flex items-center h-12 px-3 gap-2`」（cross-10-丙.md:31）；batch-10:25 列差异项「ZCode 行容器 `gap-1`=4px（@331027100），插件 gap:8px 应改 4px」。**判定：batch-10 对，丙引错组件**。本会话实跑：导航钮行容器 @331027282 确为 `gap-1 shrink-0 [app-region:no-drag]`（核验 6），而 `h-12 px-3 gap-2` @331880565 属 `browser_navigate` 浏览器导航工具栏（核验 7），非标题栏导航行。早间清单 #10 的「gap 8px→4px」维持。
3. **界面字号档数**：甲称「界面档实为 6 档」（10/12/13/14/16/18，cross-10-甲.md:23）；乙称界面七档 9/10/12/13/14/16/18 逐档相等、引 `--text-ui-2xs…xl` 7 条 calc 定义（cross-10-乙.md:26）；丙同乙（cross-10-丙.md:32）；batch-10:39 一致项亦记七档含 2xs 9。**判定：乙丙与原批次对，甲错**。本会话实跑 `--text-ui-2xs:calc(var(--ui-font-size) - 5px)` 存在（核验 3）；甲的 grep 模式 `--text-ui-[a-z]*`（cross-10-甲.md:23）不含数字、漏掉 `2xs`。SKIN_SIZES 前 7 档与 ZCode 逐档一致；「20/22/34 展示档无 ZCode 依据」三方仍一致（cross-10-甲.md:23 / cross-10-乙.md:13 / cross-10-丙.md:19）。
4. **圆角刻度完整性**：甲称 SKIN_RADII 与 ZCode「完全重合」（cross-10-甲.md:29）；乙指 `--radius-full:9999px`（非插件 999px）且 ZCode 有 `--radius-3xl:1.5rem`（24px）而 SKIN_RADII 无（cross-10-乙.md:14）；丙同乙并给 `rounded-3xl`×5 计数（cross-10-丙.md:20-21）。**判定：乙丙对，甲的「完全重合」不成立**。本会话实跑 `--radius-3xl:1.5rem` 存在（核验 4）。甲对 full 档「字面量不同但渲染等效」的补充（cross-10-甲.md:29）与丙「哨兵按 computed 字符串比对会误报 9999px」（cross-10-丙.md:20）合并后是完整结论。
5. **焦点环颜色出处**：甲仅一处颜色口径——一致项称「ZCode 为 light-dark(#0060df,#0df)……非差异」（cross-10-甲.md:33），且未给 asar 提取出处；丙称 `--color-icon-blue` 两主题为 #06d/#80beff、均不等于插件 #0b7fff/#4099ff、映射注释需更正（cross-10-丙.md:15）；乙未裁颜色、只记机制（`focus-visible:ring-2`×93 主流，内缩 outline 登记为显式调整，cross-10-乙.md:16）；batch-10:26/53 记 offset 外扩 2~4px、`--color-ring` 定义未提取到。**判定：丙与 gapfill-10 条目 4 相符**——#0b7fff/#4099ff 在 ZCode 是终端选区/用量图表/装饰渐变/arbitrary 工具类语义，`--color-ring` 定义值静态不可提取（gapfill-10.md:103-112）；甲:33 的 light-dark(#0060df,#0df) 无任何文件内出处旁证、亦未被 gapfill-10 的提取佐证，应弃用。早间 5.7 维持待裁，且不得以 #0b7fff/#4099ff 冒充 ZCode 焦点色。
6. **焦点环形态**：四方四说——甲「2px 同宽，非差异」（cross-10-甲.md:33）、乙「ring-2×93 主流，内缩是合理选择，登记」（cross-10-乙.md:16）、丙「ring-[3px]+ring-ring/50+outline-1，改 ring 形态或登记」（cross-10-丙.md:16）、batch-10:26「组件级 focus outline 外扩 offset 2~4px，ghost 基类 outline-none」。**判定：多档位并存、非互斥**（ZCode 不同组件各有焦点档位；gapfill-10.md:104-109 另录 `--color-ring` 的 outline 2px/offset 2px/40% color-mix 档）。插件 outline 2px/offset −2px 的「同宽」部分甲对，「方向外扩 vs 内缩」差异 batch-10:26 与乙丙的登记建议更完整。归早间 5.7 一并处置。
7. **导航钮图标与成对导航钮存在性**：甲与丙引 lucide ArrowLeft/ArrowRight path 命中、插件自绘 path 0 命中（cross-10-甲.md:18、cross-10-丙.md:17）；乙称「未见标题栏成对导航钮」「Go back ×17 均为代码注释」（cross-10-乙.md:36）。**判定：甲丙对**。gapfill-10 条目 4 找到消费点实锤：`desktop-top-nav-back/forward` testid + h4 按钮 + lucide arrow-left/right（24-viewBox、描边 2、渲染 16px，gapfill-10.md:95-102），乙的「未见成对导航钮」被该消费点证据推翻。「Go back 是注释」半句见下条。
8. **EN 文案 `Go back`/`Go forward`**：batch-10:29 记 EN taskNav.back/forward = Go back/Go forward（@310930800）；乙断言「`Go back` ×17 均为代码注释」（cross-10-乙.md:36）。**判定：batch-10 对，乙错**。本会话实跑 17 处偏移中 15 处为注释/散文，但 @310930815 起窗口内是 locale 表原文 `"taskNav.back":\`Go back\`,"taskNav.forward":\`Go forward\``（卷首核验 2）。早间 #10 的 EN 子项证据成立；乙的「均」字结论系未扫 locale 区（310.3–311M，区域约定见 gapfill-19.md:4）。
9. **Windows 标题栏适配（三方一致的无参照被补采推翻）**：三方均判无 ZCode 例证（cross-10-甲.md:39、cross-10-乙.md:36、cross-10-丙.md:40-41），batch-10:52 同。**判定：被 gapfill-10 条目 3 推翻**——ZCode 有完整 Windows 标题栏适配（`.platform-windows-desktop` 类挂 html + WCO `env(titlebar-area-height,48px)` fallback + 主进程 `titleBarOverlay`，控件让位 `right-[134px]`；gapfill-10.md:57-78）。「全屏隐藏导航钮」子项三方与 gapfill-10 一致维持无参照（`data-fullscreen` 0 命中：cross-10-甲.md:39 / gapfill-10.md:54,78）。

### 1.3 批次 8（zcode-theme.ts / slot-mirror.tsx / input-history-keyboard.ts / schedule-sessions.ts / tree-expansion.ts）

**三方一致的结论（高置信，与 batch-8 无冲突）**

1. 主色对、状态填充档六值、行 hover/selected/surface/border 中性 alpha 四值、暗色底 #161616：甲（cross-8-甲.md:26-28）、乙（cross-8-乙.md:24-29）、丙（cross-8-丙.md:24-26,31-32）与 batch-8:37,40-43 四方同判。
2. 动效时长四档（feedback 150ms / move 200ms / collapse 300ms / enter/exit 150ms）+ spinner 1s linear infinite：甲（cross-8-甲.md:30）、乙（cross-8-乙.md:30-31）、丙（cross-8-丙.md:28-29）与 batch-8:38-39 同判。
3. 浮层底/描边/阴影值（tooltip #f0f0f0/#2b2b2b、border 10%、shadow 双段 10%）：甲（cross-8-甲.md:29）、乙（cross-8-乙.md:32）、丙（cross-8-丙.md:27）与 batch-8:44 同判；乙与丙另录同一勘误——仓库把该值标注为「shadow-lg」而 asar `--shadow-lg` 实为另一串，该值实为 `--shadow-md`（cross-8-乙.md:32「名义勘误」、cross-8-丙.md:20），batch-8 未提此标注问题。
4. 浅色主题双源冲突的事实面：三方一致确认 asar zai-light 覆盖层为 `--color-sidebar:#f0f0f0`、`--color-background:#f8f8f8`，而仓库现值 #f5f5f5/#fafafa 引自 tokens.json 基础层（甲 cross-8-甲.md:13、乙 cross-8-乙.md:12-13、丙 cross-8-丙.md:7,14-15），batch-8:24-25 同。丙的「根因 = tokens.json `_meta.lightClass` 类名残缺、仓库混采两套主题」（cross-8-丙.md:7）在 batch-8:17 已有同一记录，非新发现但三方独立复核一致。**裁决悬置（=早间 5.3），事实层高置信**。
5. 设置页导航 16px/r12、主题挂 class 机制、文档隐藏冻结、schedule-sessions updatedAt 降序排序（asar 13 处例证）：甲（cross-8-甲.md:31,32,34,35）、乙（cross-8-乙.md:33）、丙（cross-8-丙.md:33）与 batch-8:45-46 同判。
6. 间距标度「ZCode DESIGN.md §Spacing」确认无 ZCode 例证：三方一致（cross-8-甲.md:39 / cross-8-乙.md:43-44 / cross-8-丙.md:37）；乙补充唯一出处是插件自己的 `uiplug/docs/ZCODE-DESIGN.md:164` 二手转述、`--spacing:.25rem` 为间接佐证（cross-8-乙.md:44）。

**矛盾/分歧（逐条列明各方说法与判定）**

1. **浅色状态「文字档」的对照层**：甲引 ZCode 专档 `--color-success/destructive/warning-surface-foreground`（浅 #166b32/#b42020/#914e00、深 #87d9a4/#ff8585/#ffa159，后者活体实测吻合，cross-8-甲.md:14）；丙同引专档并指出「仓库暗色三值 = ZCode 基色而非其文字档」「#8a4b00 与 base-light warning-surface-foreground 换算值仅差 1 通道，系 base/zai 混采痕迹」（cross-8-丙.md:18）；乙只与填充档 `#e03131/#1e8a3e/#e07b00` 对比、判「AA 有意偏离维持」（cross-8-乙.md:15）；batch-8:30 知道「ZCode 用 surface+foreground 成对」但 asar 未提值。**判定：甲丙对，乙的对比基线选错层**——文字档专档存在（两方独立字节级提取）。乙的同一行另有一条独立有效的勘误：仓库注释把填充档出处写成「Zai 的 `--dsw-alias-state-*`」，而 `--dsw-` 前缀属 DSH、ZCode 侧实为 `--color-success/destructive/warning`（cross-8-乙.md:15）。batch-8:30 的「维持已裁决」结论应按丙:18 建议改为「换对照基线为 zai surface-foreground 档或书面声明偏移原因」。
2. **ZCode Kbd 组件存在性**：甲找到 kbd 组件——`bg-tooltip-tag` + `text-tooltip-tag-foreground`（浅 #5c5c5c/深 #adadad），证伪注释「ZCode Kbd 用 text-muted-foreground」（cross-8-甲.md:15）；乙称「asar 未找到 ZCode Kbd 组件」并列无参照（cross-8-乙.md:42）；batch-8:50 同乙。**判定：甲对**。gapfill-8 条目 1 以同法复核确认（@327149985 组件原文、#5c5c5c/#adadad、注释证伪，gapfill-8.md:37-46,157）；乙失败原因可从其搜索模式看出——其 `data-slot.*kbd` 计数 0 系引号形态不匹配（真实形态为 ``"data-slot":`kbd` ``，gapfill-2.md:104 记录了同样的首搜失误）。衍生新增待办：`zcode-theme.ts:64` 注释更正 + 暗色 #9a9a9a → #adadad 裁决（gapfill-8.md:46）。
3. **enter/exit 缓动曲线有无例证**：甲称三条曲线（enter .2,0,0,1 / exit .4,0,1,1 / press 90ms）无 ZCode 例证（cross-8-甲.md:19）；乙同（cross-8-乙.md:16）；batch-8:53 同；丙只把 150ms 时长列一致项、未判曲线（cross-8-丙.md:28）。**判定：enter 半边被 gapfill-8 条目 4 推翻**——ZCode 分组列表 FLIP 动画 `{duration:150, easing:\`cubic-bezier(0.2, 0, 0, 1)\`}` 与仓库 enter 档双值逐字相同（@328579135/@328581342，gapfill-8.md:92-98）；exit 曲线与 press 90ms 维持实证无（`duration-90` 0、`90ms`×33 全为 pdf.js CMap 文件名，gapfill-8.md:98-99）。
4. **↑/↓ 草稿历史召回**：三方与 batch-8:54 均判无参照（cross-8-甲.md:40、cross-8-乙.md:39、cross-8-丙.md:39）。**判定：四方共同被 gapfill-8 条目 5 推翻**——ZCode 自带同构功能全链路在包：`zcode-chat-prompt-history:<id>` 存储（30 条上限，@329374681）、Lexical 命令插件 `AGt`（@329348098）、游标计算器 `$Wt`（@329336745，↓ 越界恢复空草稿）（gapfill-8.md:111-133）。乙摸到的 `promptHistory` prop（cross-8-乙.md:39）是最接近的一步；存储键前缀不以 `zcode:` 开头导致枚举漏网（gapfill-8.md:119）。
5. **feedback 曲线 (.4,0,.2,1)/150ms 的证据强度**：甲列差异项，指自引 CDP「13 属性实测」无法复验——活体逐元素 transition 读数被 `data-document-hidden` 冻结（hidden:true，computed 全为 none/0s），建议复测时记录受测元素类名（cross-8-甲.md:18）；乙（cross-8-乙.md:30）与丙（cross-8-丙.md:28）引既有 `cdp-capture/zcode-motion.json`（task-item/button 0.15s (0.4,0,0.2,1)）+ asar `--ease-in-out` 定义列为一致项（batch-8:38 同）。**判定：非事实冲突、是证据口径分歧**——值本身有 asar 锚（batch-8:13 的 `--ease-in-out:cubic-bezier(.4, 0, .2, 1)`）；甲对「活体不可复验」的提醒有效，落断言时按乙丙的文档+asar 双源引用即可。
6. **schedule-sessions 分组排序 localeCompare(numeric, base)**：乙列一致项附注「方法非自造，asar 6 处例证」（cross-8-乙.md:35）；甲（cross-8-甲.md:42）与丙（cross-8-丙.md:41）列无参照、并指出 6 处命中均为菜单项 id/目录名/sortText 排序，非任务分组场景。**判定：兼容，非冲突**——「排序方法档位有 ZCode 先例」（乙）与「按名称分组会话列表的场景无同构物」（甲丙）同时成立。
7. **reduced-motion 处置框架**：甲列一致项「语义一致、实现路径不同（变量归零 vs 工具类）」（cross-8-甲.md:33）；乙列差异项「『停静止帧』超出 ZCode 行为（`motion-reduce:transition-none` 不覆盖 infinite 动画），按 DSH 显式调整登记」（cross-8-乙.md:17，引 02-motion.md:36）。**判定：乙的机制分析更精确**；甲亦自认路径不同，无事实冲突。仓库 `zcode-theme.ts:220-226` 的停帧逻辑建议按乙登记为 DSH 显式增强。

---

## 2. 无参照补采

20 份 gapfill 对早间报告所记 **100 条无参照项**（每批恰 5 条，MORNING-REPORT.md:23）逐批全部重挖。各文件自报口径不一（按条目 / 决策点 / 声明 / 半条计），下表为各文件自报计数，合计 **升级 ≈78**、**确认无参照 ≈33**（毛和；粒度不可互相换算，仅示规模）：

| 文件 | 对象批次 | 升级为有参照 | 确认无参照 | 出处 |
|---|---|---|---|---|
| gapfill-1 | batch-1 | **5**（全升级） | 0 | gapfill-1.md:7 |
| gapfill-2 | batch-2 | 5（含 2 个确认无参照子项） | — | gapfill-2.md:202-208 |
| gapfill-3 | batch-3 | 2 | 3 | gapfill-3.md:112-120 |
| gapfill-4 | batch-4 | 3 | 2 | gapfill-4.md:8 |
| gapfill-5 | batch-5 | 6（按声明计） | 1（menu-group-header-fill） | gapfill-5.md:12 |
| gapfill-6 | batch-6 | 3 | 2 | gapfill-6.md:10 |
| gapfill-7 | batch-7 | 1 | 4 | gapfill-7.md:73-81 |
| gapfill-8 | batch-8 补采 | 5 | 0（条目内 absent 半边见原文件） | gapfill-8.md:141-149 |
| gapfill-9 | batch-9 | 4 | 1 | gapfill-9.md:7 |
| gapfill-10 | batch-10 | 3（条目 2 为部分升级） | 2 | gapfill-10.md:7 |
| gapfill-11 | batch-11 | 3 | 2 | gapfill-11.md:99-109 |
| gapfill-12 | batch-12 | 4 | 1 | gapfill-12.md:92-102 |
| gapfill-13 | batch-13 | 6（按决策点计） | 6 | gapfill-13.md:187-197 |
| gapfill-14 | batch-14 | 3（条目 4/5 为部分升级） | 2 | gapfill-14.md:6 |
| gapfill-15 | batch-15 | 5 | 0 | gapfill-15.md:7 |
| gapfill-16 | batch-16 | 3（条目 1/5 为半条升级） | 2 | gapfill-16.md:128-138 |
| gapfill-17 | batch-17 | 5（子项级 9 处确认无） | 0 | gapfill-17.md:83-93 |
| gapfill-18 | batch-18 | 4 | 1 | gapfill-18.md:129-139 |
| gapfill-19 | batch-19 | 4 | 1 | gapfill-19.md:114-122 |
| gapfill-20 | batch-20 | 4（均部分升级） | 1 | gapfill-20.md:121-133 |

### 2.1 从「无参照」升级为「有参照」的代表条目（附证据）

**结构性翻案（前提错误，不止补值）：**

- **ZCode 任务列表有分组层**（推翻 batch-1 前提）：`WorkspaceGroupedTasksSection`、折叠组、组重命名/换色、`data-grouped-task-key`、五种 droppable；分组头 h-8=32px / rounded-lg=8px / chevron 14px（gapfill-1.md:104-119）。
- **ZCode 任务行有自建拖拽预览**（推翻 batch-1）：整行克隆（行宽×行高、`bg-background`+`shadow-lg`、`setDragImage` 实时夹紧偏移、屏外 -10000px），与插件 30px/220px 迷你胶囊完全不同方案（gapfill-1.md:14-33）。
- **落点指示线有官方同构物**（载体为侧栏 section 排序）：`purpose-section-drop-indicator` 2px 线 + 子 span `size-2 rounded-full border-2 border-icon-blue bg-sidebar` 8px 空心圆环（gapfill-1.md:50-60；本会话实跑核验 1 同证 `project-drop-indicator` 亦有该子元素）。
- **ZCode 收起无 56px 窄轨**（batch-2 条目 2 / batch-3 条目 1）：收起 = 4px（mac/linux）/6px（win）/0（web）细缝 + `opacity-0`，常量 `fn=sn?V?6:4:0`（gapfill-2.md:86-98；gapfill-3.md:31-38）。
- **ZCode 有建议卡表面**（推翻 batch-4）：`occupationOnboarding.suggestionsHeading`=试试这些任务 + `chat.officeSuggestions.*` + 组件 `t$t`（chips/list 双布局、65ms 瀑布入场、每屏 ≤3 张）（gapfill-4.md:23-33；gapfill-9.md:71-80 组件细节）。
- **ZCode 自带 ↑/↓ prompt 历史召回**（推翻 batch-8）：存储 `zcode-chat-prompt-history:<id>` 30 条上限 + Lexical 命令插件 + 游标计算器（gapfill-8.md:111-133）。
- **ZCode 有完整 Windows 标题栏适配**（推翻 batch-10/cross-10 三方）：`.platform-windows-desktop` + `env(titlebar-area-height,48px)` + `titleBarOverlay`（gapfill-10.md:57-78）。
- **ZCode 导航钮存在**（推翻 cross-10-乙）：`desktop-top-nav-back/forward` testid + lucide arrow-left/right 24-viewBox/描边 2/渲染 16px（gapfill-10.md:95-102）。
- **ZCode 有定时任务域**（推翻 batch-20）：`automations.*` 约 90 键、edit 双分段 tab（设置/历史）、runs 状态五态、destructive 菜单项 `archive-group-delete`（gapfill-20.md:83-94）。
- **ZCode 有 IM 渠道品牌图标**（推翻 batch-20）：6 张品牌 PNG 资产 + provider 枚举（telegram/webhook/feishu/lark/weixin/discord/wecom @278869767）+ 组件 `vL`（16px `size-4` + aria-hidden + 按 provider 映射，gapfill-20.md:30-42）。

**取得 ZCode 真值/机制的代表条目（多为「有参照但值/方案不同」差异项）：**

- batch-2：头部图标钮口径定案 icon-md=28×28/r8；head 高 mac 56 / win·linux 48（gapfill-2.md:60-64）；键帽两组真值（tooltip kbd h-4/r-md/px-1.5/10px；⌘K chip h-4/min-w-7/r-sm/14px，gapfill-2.md:120-127）；⌘K 浮层四参数（scrim bg-black/60+blur-xs+100ms、top-16/80、z-50、fade+zoom-95 无位移，gapfill-2.md:155-164）；分组标题 14px/500/60% 前景/px-2.5 py-1.5（gapfill-2.md:192-194）。
- batch-3：宽度持久化回退链 `useState(()=>SBn()??lBn)`，默认 **264px**、域 [264, 容器×50%]（gapfill-3.md:67-76）；开合 200ms ease-out 纯 CSS（gapfill-3.md:88-92）。
- batch-4：prefill 行为链 `requestComposerTextInsert`→`mQt`（gapfill-4.md:44-52）；新建前归位链 @332251839（gapfill-4.md:65-71）。
- batch-5：滚动条规格全文（14px + thumb 3px 透明边 + 9999px 圆角 + min 32px + 无 hover 变化；`[data-code]` 专属变体，gapfill-5.md:39-53）；遮罩=单一 `bg-black/60` + blur（gapfill-5.md:62-69）；skeleton=`--color-surface` 3%/5%（gapfill-5.md:72-78）；选区 alpha 全谱 22%/28%（hex 套）、32%/26%（oklch 套）（gapfill-5.md:90-96）；工具栏填充三值实为 **DSH 宿主继承**非 ZCode（gapfill-5.md:24-30）；workspace-shortcuts/official-slot-shadow 官方锚点在 DSH 官方 asar（未混淆）逐一命中（gapfill-5.md:100-111）。
- batch-6：回到底部居中 `left-1/2 -translate-x-1/2` + `chat.scrollToBottom`=滚动到底部（gapfill-6.md:26-43）；加号按钮 ghost 无静态底 + `hover:bg-hover`（gapfill-6.md:43-45）；边界文案 `taskNav.noMoreBack/noMoreForward`=没有更早/更新的任务了（gapfill-6.md:77-79）；项目悬停卡 `sht` 全采样（openDelay:300、w-80、远程身份卡无任务/未读摘要，gapfill-6.md:97-99）；16px 层 strokeWidth 1.5 零锚点（gapfill-6.md:101,105）。
- batch-7：session-move 无确认弹窗 + toast 单键 `taskGroup.failed`=分组操作失败，请重试 + 菜单 w-56/w-52（gapfill-7.md:33-38）；**勘误**：波值三元组 asar 有原文（`scaleX:2.6/1.7/1.25` 各 1 命中，`Vst` 函数 @328166898），batch-7 头部「0 命中」记错（gapfill-7.md:6-13）。
- batch-9：设置导航 18 项 lucide 图标全表（settings-2/palette/package/brain/bot/blocks/cable/wand-sparkles/alarm-clock/anchor/earth/hard-drive/monitor/keyboard/file-search/chart-column/archive 等，gapfill-9.md:24-41；gapfill-13.md:74-84 第二次独立还原一致）；新建页静态采齐（hero max-w-2xl=672px、问候字号动态夹紧 20–30px、建议 chips 32px 高、workspace 圆形 chip，gapfill-9.md:60-90）；侧栏宽度 clamp 机制同构（gapfill-9.md:106-117）；气泡折叠钮 `O4t` 全文（`transition-[max-height] duration-300 ease-out`、折叠钮 outline+size sm=h-6=24px+bg-background+shadow-sm+backdrop-blur-sm 8px，gapfill-9.md:130-151）。
- batch-11：分页初始 5 条直接数值（组件 `eL`：`useState(5)`、`slice(0,c)`、+5 步长、pinned/timeline 20、`taskList.showMore` 活键，gapfill-11.md:10-29）；蓝线落点全 JSX 与 before/after 判定（gapfill-11.md:35-50）；「最近」段排序全链 `_dt`→`I7e('updated')` updatedAt 降序（gapfill-11.md:72-87）；**勘误**：`project.showMore` 为死键（仅 locale 表 2 处、无组件引用），活键是 `taskList.showMore`（gapfill-11.md:27）。
- batch-12：锚点偏移 8px 逐值（`v4-turn-navigator-tooltip` side:right+sideOffset:8+w-80，gapfill-12.md:37-38）；onboarding 徽标 56×56+rounded-xl(12px) 同款渐变（gapfill-12.md:53-58）；aria-busy+disabled、role="alert" 同构例证（gapfill-12.md:82-83）；「前往配置」+「用…打开…配置文件」i18n 链（gapfill-12.md:85）。
- batch-13：**设置页退出动画参照 = 无**（四层容器零动画类、`duration:140` 全库 0 命中、WAAPI 5 处均非设置页 → ZCode 关闭即卸载；插件 140ms 属自有增强，gapfill-13.md:40-60）；设置侧栏无搜索框、搜索在分区内（组件 `NN`：type=search/h-9/rounded-xl/前导 Search 16px 60%/清除钮 icon-sm，gapfill-13.md:130-146）；⌘K 每组 `slice(0,3)`、无全场 12 上限（gapfill-13.md:177）；设置入口按钮真身 ghost icon-lg+aria-label、无 aria-haspopup（gapfill-13.md:178）。
- batch-14：pendingInteraction 域强 schema 在包（kind 枚举 `["permission","userInput","workspaceHookReview"]` 与插件三值同构；plan 批准走独立 plan_approval 渠道，gapfill-14.md:34-45）；tooltip 色对令牌 `--color-tooltip`/`-foreground`（#2b2b2b/#f8f8f8 等，gapfill-14.md:66-67）；前景命名阶梯 60%（subtle）/40%亮·30%暗（subtlest）、**无 50% 档**（gapfill-14.md:73,78）；composer 命名容器查询 384/480/512/576px 档（gapfill-14.md:90-96）；composer hint 文案族 6 键（gapfill-14.md:89）。
- batch-15：菜单壳两层机制（Radix wrapper 运行时继承 + 应用层 `z-[60]`）与壳全值 `p-1/rounded-lg/bg-menu/shadow-md/gap-0.5`、行项 `min-h-7 px-2 py-1 gap-2 rounded-md`——与 uiplug composer-tool-menus.ts:15 现行令牌**逐项一致**（gapfill-15.md:24-56）；@ 弹层 `prompt-suggestion-panel`（max-h-56=224px；`+` 弹层 Radix 公式，gapfill-15.md:76-93）；键帽格式化器 `g3t/h3t`（⌘⇧⌥⌃ 映射无分隔拼接）+ `dropdown-menu-shortcut` 槽位（gapfill-15.md:111-124）；#ff9800 全分类（45 处=TextMate 主题 17+hljs 3+SVG 图标 23+文档 2，UI 语义层 0；ZCode 语义橙=`--color-warning` #e07b00/#ff8a30，gapfill-15.md:132-151）。
- batch-16：富悬停卡 6 调用点（封装默认 w-72=288px、最多用 w-80=320px；`closeDelay` 观测值 {0,80,100,160} 主值 80，gapfill-16.md:29-57）；未读=「选中即清除」写时实现（乐观清 overlay→服务端对账→回滚，gapfill-16.md:117-121）。
- batch-17：不确定态进度条 `pFe` 与插件四点同构（4px 轨/1.2s ease-in-out/1/3 宽/确定态宽度过渡，@327220367+@326257012，gapfill-17.md:11-14）；具象开关 `Lln`（36×20 轨、thumb 14、终点 18px、duration-200，gapfill-17.md:26-37）；macOS 48px 安全区（h-12 drag 区）+ vibrancy/acrylic（gapfill-17.md:48）；401/503 per-surface 细分文案+login.expired 弹窗（gapfill-17.md:59-60）；`disabled:opacity-50`×37 主流档、无 65/55 档（gapfill-17.md:72）。
- batch-18：任务行悬停面两层（原生 title + 右侧 tooltip：工作区名 max-w-48·±diff；无时间无分支，gapfill-18.md:24-38）；菜单序列 `Vvt` 逐字命中（pin→rename→archive→markAsUnread‖openPath(ogt 平台分派)→copyPath→…→viewModelTrajectory‖feedback；容器 w-52；当前构建无「分屏」键，gapfill-18.md:48-62）；Enter/空格打开逐字同构 + radix ContextMenu 贴指针（合成 MouseEvent clientX/clientY，gapfill-18.md:73-83）；Button 档位全集（icon-xs=20×20、icon-sm=24×24，行内快捷动作实为 24×24/14px，gapfill-18.md:96-107,142）。
- batch-19：工作区文件树 role:tree/treeitem + ArrowRight 展开/ArrowLeft 收起 + Enter（gapfill-19.md:12-32）；置顶完整功能（`task.pinned` 字段+`setTaskPinned` 服务持久化+同态拖拽约束；ZCode 置顶不经 localStorage，gapfill-19.md:40-58）；会话锚点机制（`data-turn-id`/`data-turn-key`/`data-trajectory-search-target-key` + 一次性 querySelectorAll 消费；两属性名 0 命中维持，gapfill-19.md:64-78）；错误模态三要素（role:alert+text-destructive、common.retry、common.close，gapfill-19.md:102-112）；**工具勘误**：中文模式必须 `LC_ALL=C`（UTF-8 locale 对二进制假 0：`置顶` 默认 0 / LC_ALL=C 35；`重试` 0→255），既往批次以 UTF-8 locale 报的中文 0 命中均不可信（gapfill-19.md:5）。
- batch-20：hover-tip 四档分档复核 + `collisionPadding:8`×8（pad=8 同值；周/月/年与 right+8 维持无，gapfill-20.md:50-63）；`chat.message.expand/collapse` 双语四值逐字同源 + `O4t` 消费点（gapfill-20.md:103-109）；stroke 1.5 有 UI 实例 3 处（16/20px 图标，非 chevron；chevron 自绘 path 维持无，gapfill-20.md:110-114）。

### 2.2 确认无参照的条目（附已搜索模式清单）

各 gapfill 的否定性结论均已附模式与计数，择要汇总（括号内为该文件记录的已搜模式）：

- gapfill-2（2 子项）：**22px 字标**（搜过 sidebar-header/SidebarHeader/wordmark/logo/brand/h-12/h-11/w-14/rail/kbd/marquee，120KB 侧栏窗口内除 marquee 外全 0；ZCode 品牌=20×20 渐变徽标盒且 mac 侧栏头不渲染）；**20px 菜单键帽**（侧栏外壳 1.4MB 窗口内 `kbd` 0 命中；ZCode 键帽只在 tooltip 与 ⌘K 行内，gapfill-2.md:23,104,126）。
- gapfill-3（3 条）：**nav 左缘=sidebar+16**（`JXrxFq` 0——CSS-in-JS hash 运行时生成不可检索；唯一 16px 常量 `pBn` 消歧为侧栏拖拽键盘步长 ±16px）；**duration+120ms 兜底**（`transitionend` 31/`animationend` 27 逐条核验无一在 shell 段；shell 段 `performance.now` 0）；**SKIP_ANIMATION_BLOCK_MS**（shell 段 `performance.now` 0、`prefers-reduced-motion` 0；全局 87 处均为库代码）（gapfill-3.md:42-54,84-90,100-108）。
- gapfill-4（2 条）：**⌘K 底部键提示条**（taskSearch 9 键/quickPick 57 键/commandCenter 20 键无 hint；`↑|↓|⏎|↵|⌘|Esc|Enter|Tab` 值搜与字节级兜底；相邻参照=按钮尾部内联 `⏎` 与 `settings.shortcuts.recordingHint`）；**settings.search / input.historyHint / renameDescription / time.weeks-months-years**（`搜索设置` 0、`翻历史` 0、`保持简短` 0、`weeksAgo|monthsAgo|yearsAgo` 0；相邻发现=每页搜索框+`清空搜索`、`promptHistory` 管线无文案、`common.*` 时间族含 `昨天` 档）（gapfill-4.md:79-117）。
- gapfill-5（1 条）：**menu-group-header-fill**（`f8f8f8f0`/`202020f0`/四种 .94 写法全 0；`sticky top-0` 7 变体逐一归属均非菜单组头；9224 活页实测模型菜单组头 `background-color:rgba(0,0,0,0)` 无吸顶，gapfill-5.md:80-83）。
- gapfill-6（2 条）：**virtual-skip / `?session=` / 设置分区 order**（`contentVisibility` 225 处全为 lottie、`content-visibility` 15 处为 CSS 词典；`?session=` 唯一命中为 Selenium；`settingsNavigation` 无 order 注册面）；**workspace-compat / settings-focus**（`tabIndex>=0` 2 处均 focus-trap 库 TreeWalker；`baselinesReady` 0；ZCode 用 schema 持久化单值 `lastActiveWorkspace`，机制不同构）（gapfill-6.md:49-65,110-123）。
- gapfill-7（4 条）：**CLICK_FEEDBACK_MS=260**（`duration-260`/`260ms` 0；rail 按钮 handler 集无 setTimeout、点击立即跳转——有反证）；**shared-now 60s**（`60_000` 仅 parse-ms 库；sidePane 时间戳挂载冻结无 ticker——有反证）；**footer 隐藏规则**（`洞察` 0、`context-overview` 0、`cm-footer-stack` asar 0；页脚=固定 i18n 按钮）；**session-navigation**（`openSession` 9 处均为 pane store/自动化表面；`selectPanel` 0）（gapfill-7.md:20-27,42-51,55-57,63-67）。
- gapfill-8（条目内半边）：**tip tertiary 档**（`text-tooltip-foreground/60` 仅 safelist 0 消费；tooltip/tag 两族 4 槽全枚举无第三档）；**exit 曲线 .4,0,1,1**（全 asar 0 命中；JS easing 全集清单无近似形）；**press 90ms**（`duration-90` 0；`90ms`×33 全为 pdf.js CMap 文件名；`.09s`×3 为 SVG 路径数据）（gapfill-8.md:58-62,98-99）。
- gapfill-9（1 条）：**session-manager 未读持久化/`?session=` 拼参**（未读无命名 localStorage 键，走 IPC badge `zcode:sync-window-unread-count`；`searchParams.set(\`session\`)` 0）（gapfill-9.md:155-169）。
- gapfill-10（2 条）：**哨兵预算与 KNOWN_FOREIGN_ROOTS**（`SCAN_BUDGET_MS|SAMPLE_PER_PREFIX|REPORT_DELAY_MS|KNOWN_FOREIGN_ROOTS` 0；budget/deadline 命中全为 RPC/token 语境；DSH 前缀 0 命中）；**插件槽位转发**（`renderSlot|FORWARDED_CONFIG_SLOTS|SlotEntryBoundary` 0；`data-slot`×24 均为 shadcn 样式钩子；ZCode 插件 UI 出口=独立 side-pane，testid 族约 70 个）（gapfill-10.md:14-21,119-127）。
- gapfill-11（2 条）：**频道树轮询 4000ms/8s**（`频道` 0；app 区 52 处 setInterval 延迟逐一 dump 无 4000；`,8000)`/`8_000` 0；机制旁证=PJt=5min 可见性轮询协调器）；**host-open-path 错误码分流**（`openInExplorer` 0；app 渲染区无 HTTP 状态码分流；ZCode 为 `{success,error}` 单通道）（gapfill-11.md:54-66,91-95）。
- gapfill-12（1 条）：**turn-rail-dedupe**（`dedupe` 69 处均数据层、`stale` 442 处为缓存语义、`v4-turn-navigator` 系 testid 6 处=单实例；无 DOM 组件去重问题域）（gapfill-12.md:64-72）。
- gapfill-13（按决策点 6 处）：**host-anchor 契约**（14 模式 grep 全 0）；**dcu-settings 事件合约**（`dcu-settings`/`data-dcu` 0）；**4s 导航超时**（ZCode 同步 setState 无重试）；**断线恢复 3s**（`已恢复` 仅工作流语境、`recovered*` 35 处为错误恢复计数）；**plugins 面板排除**（`sidebar.panellist` 0）；**归档顺序执行**（非视觉点）（gapfill-13.md:150-184）。
- gapfill-14（2 条 + 子项）：**navigation-history 会话历史栈**（`canBack|canForward` 字段名 0、`historyStack|backStack` 0；ZCode navigateBack=视图级命令 CmdOrCtrl+[、prev/next=列表序）；**archive-session-delete 能力探测**（`"deleteSession" in x`/`deleteSession?\.`/`workspaceRegistry` 全 0；ZCode deleteSession=一等 RPC 命令）；子项：32px 行高/72 字符截断/760px 断点/8px24px 阴影（命中均为 Primer/PDF 借用）、order −100、`min(180,h×0.35)`（0 命中）（gapfill-14.md:12-26,52-57,70-80,97-99）。
- gapfill-16（2 条）：**越限收起 32px**（拖拽链按下/移动/抬起三段全文无收起分支；收起=按钮/快捷键；唯一拖拽收起在远控导航纵轴阈值 24px）；**directoryFlow 槽转发**（`directoryFlow|sidebar.workspaces|slots.inject|@deepseek-ai` 等 12 模式全 0；正向载体=directoryBrowser+selectDirectory×24+showOpenDialog×4）；（半条）**面板打开取消选中**（`activeTaskId:void 0`×0；静态源码无此路径，活体须 CDP）（gapfill-16.md:63-83,89-99,117-124）。
- gapfill-18（1 条）：**schedule-group-actions / draft-attachments**（两文件共 26 行 grep `color|px|font|shadow|radius|transition|animation|rgba|#hex` 0 命中；ZCode 归档为单任务埋点无同构物）（gapfill-18.md:118-125）。
- gapfill-19（1 条 + 半边）：**composer 加号 hover 底色**（`--dsw-*` 令牌 0、`NewTaskButtonGroup` 0、无专用 testid；同族按钮 hover 惯用法=变色不加底，不可作色值对照）；（半边）**roving tabindex/Up-Down 树内遍历/Home-End 焦点首末/aria-level**（aria-level 19 处逐一归类无一处 treeitem；ZCode 树行全量 tabIndex:0）（gapfill-19.md:82-96,30-32）。
- gapfill-20（1 条 + 子项）：**companion-slots**（11 组模式 0 命中；`slotId`/`contributes` 命中均为同名异物）；子项：品牌 hex 12 个 0 命中（`8b949e`×79 定性为 GitHub Dark 主题 JSON）、兜底灰圆 #8b949e、`right+8` 锚点、ScheduleClock 自绘 path（`M8 1.15` 0）、Menu dense/compact 档（`dense:!0` 0）、自绘 chevron path（`M4 6.5` 0）、`:root:root` 策略（0）、`SKIN_VERSION`（0）（gapfill-20.md:11-21,29-42,52-63,74-92,100-115）。

### 2.3 影响后续搜索的方法学勘误（来自补采过程，先于任何再挖生效）

1. **中文检索假 0**：本机默认 UTF-8 locale 对二进制文件的中文字节串返回假 0；所有中文模式必须 `LC_ALL=C`（gapfill-19.md:5 实测：`置顶` 默认 0 / LC_ALL=C 35；`重试` 0→255）。**既往批次仅凭 UTF-8 中文串 0 命中得出的「无参照」结论均不可信**，复核时应以 i18n 全键表抽取（如 gapfill-4 的 7721 键 TSV）或 LC_ALL=C 重跑为准。
2. **存储键前缀盲区**：`zcode:` 前缀枚举覆盖不到 `zcode-chat-prompt-history:` 这类变体；后续搜存储键应同时枚举 `zcode-` 开头形态（gapfill-8.md:119,157）。
3. **跨命名空间搜法失效**：`(0,X.Vw)` 形态搜不到同 chunk 同作用域直接调用 `jsx(Vw,{`；batch-16 的「bundle 内未检出 HoverCard 消费方」部分源于此（gapfill-16.md:9,142）。
4. **属性选择器字面失配**：`role="tree"` 搜不到 backtick 形态 ``role:`tree` ``，应用 `.` 通配（gapfill-19.md:30）；`data-slot:"kbd"` 搜不到 ``"data-slot":`kbd` ``（gapfill-2.md:104、cross-8-乙.md:42 均栽在此）。
5. **运行时生成物不可静态检索**：CSS-in-JS hash 类（`JXrxFq_preview`）与 radix 运行时 zIndex 属此类，相关「0 命中」只是「bundle 内无」，不等于「无此行为」（gapfill-3.md:48；batch-10:53；gapfill-15.md:24-33 补出了菜单壳 `z-[60]` 静态层）。

---

## 3. 对早间报告的影响

### 3.1 被加固的原结论（可放心执行或降风险）

| 早间条目 | 加固证据 |
|---|---|
| #1（locales.ts:134 →「显示更多」） | 三方一致（cross-4-甲.md:11 / 乙:27 / 丙:19）；gapfill-11 取到活按钮组件 `eL` 直数值（`useState(5)`+`taskList.showMore`，gapfill-11.md:13-27）。**证据注记**：`project.showMore` 系死键（仅 locale 表 2 处、无组件引用，gapfill-11.md:27），早间 #1 与 batch-4:22 证据列中该键应标注为死键，结论不变 |
| #2 前三键（等待确认/已置顶/移出分组） | 三方一致（cross-4-甲.md:12,18,19 / 乙:24,26,30 / 丙:16,21,22）。第四键「移除项目→删除项目」交叉未覆盖，仍以 batch-4:28 单源为准 |
| #4（--dcu-tip-hover 深 .06→.05） | cross-8-甲.md:20 复核（含活体暗色 `--color-menu-hover=#363636` 实测）；与 batch-8:27 同值 |
| #5 的「240→264」注释子项 | gapfill-3.md:67-76 实证 ZCode 回退默认 **264**（`useState(()=>SBn()??lBn)`），并证原注释「ZCode 无恢复逻辑」失实；开合 200ms ease-out 直证（gapfill-3.md:88-92） |
| #6（气泡折叠 300ms ease-out） | gapfill-9.md:130-137 取到 `O4t` 组件原文 `transition-[max-height] duration-300 ease-out`，asar 直证（原依据是文档 C2-2+拆档表） |
| #10 六项 | 三方一致（见 1.2 节 1-4）；导航钮消费点与 lucide 图标实锤（gapfill-10.md:95-102）；EN `Go back` 经本会话实跑复核成立（卷首核验 2）；gap 4px 经实跑复核成立（核验 6/7） |
| #11（落点线改蓝） | 四方一致 + gapfill-1/11 全 JSX + gapfill-10.md:42 另录 `project-session-drop-target` 整框高亮新事实 |
| #14（开关 thumb 14px/200ms） | gapfill-17.md:26-37 独立第二源（`Lln` 组件逐项对照表，与 batch-18:10-11 同判） |
| #15（TurnNavigator 0.58→0.9） | gapfill-7.md:6-13 勘误补上波函数 `Vst` asar 原文（`scaleX:2.6` 等），:25 同窗证实 `.9` 静息强调 |
| #16（selected 浅 0.08→0.05） | cross-8-甲.md:28 三源复核 zai-light `--color-selected:#0d0d0d0d` |
| #18（回退 150ms/(.4,0,.2,1)） | gapfill-8.md:92-98 enter 档 FLIP 双值逐字命中；`--ease-in-out` 定义有 asar 锚（batch-8:13）。甲的提醒仍有效：活体复验被 data-document-hidden 冻结过（cross-8-甲.md:18） |
| #20（--color-brand 注释更正） | cross-8-丙.md:19 + cross-10-丙.md:15 + gapfill-10.md:110 多源确认 #0b7fff/#4099ff 在 ZCode 为 terminal/选区/图表语义 |
| 5.4（归档确认形态） | **前提被改写**：早间 5.4 称「行内确认参照已不可考（confirmingId/confirmArchive 0 命中）」；gapfill-18.md:144 取到 ZCode 归档两步确认 asar 实态——`data-archive-confirming-task-id` 挂行 + destructive sm 文本钮「确认」+ 快捷钮退场，即**当前构建就是行内两步确认**。5.4 的二选一（改模态 vs 登记偏离）中的「ZCode=模态」一侧失去静态依据，裁决前应先按 gapfill-18 新证重核 |
| 5.5（侧栏拖拽上下限） | gapfill-3.md:67-76 / gapfill-9.md:106-117 / gapfill-16.md:74-81 三批独立取到同一 clamp（[264, 容器×50%]、键盘 ±16、Home/End 极值） |
| 5.6（悬停卡延迟） | gapfill-16.md:44-57 补出 `closeDelay` 观测带宽 {0,80,100,160} 主值 80 + gapfill-6.md:99 `sht` openDelay:300——ZCode 侧锚点从 1 个变多个 |
| 5.8（描边 1.5 vs 2） | gapfill-6.md:101,105 实证「ZCode 16px lucide 层从不传 1.5（0 锚点，默认 2）；1.5 只出现在自绘 12px 与 14px 正文操作行」；gapfill-13.md:114 判导航图标 16px 正确、15px 无例证。**5.8 的天平向「16px 档=默认 2」倾斜**（未终裁） |
| 5.11（定时任务归属） | gapfill-20.md:83-94 推翻「ZCode 无定时任务视图」前提：automations 域完整存在（约 90 键、双 tab、runs 五态） |
| 154 条一致项 | 三方交叉复证了早间第 4 节所列三组跨批重复中的两组（document-hidden：cross-8 三方 + cross-10 三方 + batch-8:46/batch-10:37；行 hover/选中底四值：cross-8-甲.md:28/乙:27/丙:31 + batch-8:40）；相对时间四档获第三次复核（gapfill-20.md:62） |
| 第 4 节「0 断言」 | 不变：20 份 gapfill 头注均声明只读、不改 src/tests（如 gapfill-1.md:4、gapfill-16.md:3），无新增断言 |

### 3.2 被削弱或推翻的原结论

1. **batch-1 的分组前提被推翻**：「ZCode 任务列表无分组层」不成立（gapfill-1.md:104-119）；连带 `03b-sidebar.md` §5「行首槽仅 running loader」需补注——置顶/时间线行行首槽有 7×7 未读蓝点（`data-unread-indicator`）与 6×6 错误红点（gapfill-1.md:75-80,137）。此修正触及 5.1（spinner 互斥）的证据语境。
2. **cross-10 三方「落点线无端点」被推翻**（本会话核验 1 + batch-10:46 原判 + gapfill-1/11）：插件的 8px 空心圆点与 ZCode 同构，batch-10 差异表中「线端形态」不是差异；早间 20 条清单未收录该条，无需改清单，但 batch-10 记录应勘误。
3. **cross-10-丙「双钮间距 8px 一致」被推翻**（核验 6/7）：其引的 `h-12 px-3 gap-2` 属 browser 导航工具栏（@331880565），真身是 gap-1=4px（@331027282）；早间 #10 的「gap 8px→4px」维持。
4. **cross-10-甲「界面档 6 档」「圆角完全重合」被推翻**（核验 3/4）：`--text-ui-2xs` 与 `--radius-3xl:1.5rem` 均存在；乙丙的七档/缺 24px 档口径为准。
5. **cross-10-乙 两条「无」被推翻**：「未见标题栏成对导航钮」（gapfill-10.md:95-102）与「`Go back` ×17 均为代码注释」（核验 2：locale 表 @310930815 有 `"taskNav.back":\`Go back\``）。
6. **cross-10-甲:33 的「ZCode 焦点色=light-dark(#0060df,#0df)」应弃用**：无出处旁证，且与 gapfill-10.md:103-112（`--color-ring` 定义未提取、#0b7fff/#4099ff 非 focus 语义）相抵触；5.7 的证据面 = batch-20:22 + cross-10-丙:15 + gapfill-10 条目 4。
7. **cross-8-乙 状态文字档对比口径不完整**：漏掉 ZCode `surface-foreground` 专档（甲丙两方字节级提取 + 活体暗色吻合）；batch-8:30 的「维持已裁决」应按 cross-8-丙.md:18 复议（换对照基线或声明偏移）。乙在同条内的溯源勘误（`--dsw-alias-state-*` 前缀属 DSH）独立有效，应更正 zcode-theme.ts 注释。
8. **batch-8/cross-8-乙「Kbd 无参照」被推翻**：kbd 组件在包（@327149985），`zcode-theme.ts:64` 注释「text-muted-foreground」证伪（gapfill-8.md:37-46,157）——衍生一条**不在早间 20 条内的新更正项**（注释 + 暗色 #9a9a9a vs #adadad 裁决）。
9. **enter 曲线「无例证」半边被推翻**（gapfill-8.md:92-98）；exit 曲线与 press 90ms 维持实证无（gapfill-8.md:98-99）。
10. **input-history「无参照」被四方共同推翻**（gapfill-8.md:111-133）；batch-8:54 应改判。
11. **batch-7「波值 asar 0 命中」系取证失误**（gapfill-7.md:6-13 勘误，`Vst` 原文在包）；02-motion §5 相关记录可升级为 asar 直引。
12. **batch-11 `project.showMore` 活键记录失实**（gapfill-11.md:27 勘误，死键）；早间 #1 证据注记见 3.1。
13. **#12（composer 菜单项 32px/0 10px）出现双源分歧，执行前必须复核**：batch-15 CDP/03b 记 ZCode 菜单项 32px、内衬 0 10px；gapfill-15.md:49-56 从 asar `dropdown-menu-item` 提到 `min-h-7`(28px)/`px-2 py-1`(8·4)，且据此判 uiplug 现行值（28px/4·8）**逐项一致**。两记录可能分属两套菜单体系（侧栏菜单 CDP vs dropdown-menu 组件类），也可能有一方取错面；在澄清前 #12 的「高距对齐」子项不应执行（其余 hover 接令牌、字号回 14 两子项不受影响）。
14. **batch-10:21 悬停底色的深色口径出现两说**：batch-10:21/cross-10-乙:18 记深色生效值 = `--color-surface-hover` 白 10%；cross-10-甲:32/丙:29 记 `--color-hover` 白 5%（zai 覆盖层字面量，batch-8:27/40 同）。两令牌均真实存在，`.dark{--color-hover:var(--color-surface-hover)}` 的映射关系见 gapfill-6.md:39——生效值取决于主题层叠加，**归入 5.3 的浅色族/主题层裁决一并澄清**（早间 5.0 已把 batch-10:21 排除出清单 #10，处理正确）。
15. **gapfill-9.md:151 另录一处待复核**：03c C2-4 活体记录「气泡折叠钮 32px 胶囊」与 asar `size:sm→h-6`(24px) 不一致（活体 32 可能含 wrapper 或版本差异），下轮 CDP 复测时顺带定案。

### 3.3 新增的裁决/待办（早间 14 条裁决之外，由本轮补采产生）

1. `zcode-theme.ts:64` Kbd 注释更正 + `--dcu-kbd-foreground` 暗色 #9a9a9a→#adadad 裁决（gapfill-8.md:46,157；cross-8-甲.md:15）。
2. `--dcu-sidebar-icon` 与 ZCode 惯例（foreground-subtle 60%，换算 ≈#868686/#888888）的差档裁决（gapfill-8.md:66-79）。
3. tip 次档机制（独立灰阶 vs ZCode `tooltip-foreground/80` alpha 降档）与 tertiary 槽位去留（gapfill-8.md:56-62）。
4. 状态文字档对照基线复议（见 3.2.7）。
5. 滚动条口径（8px 可见厚 vs ZCode 14px+3px 边=8px 可见；宿主机制下实际可见 4px）与 hover 变色去留（gapfill-5.md:53）。
6. 「shadow-lg」标注勘误落笔（值本身=shadow-md 无值差）：zcode-theme.ts 注释 + expansion-state.md:50（cross-8-乙.md:32 / cross-8-丙.md:20）。
7. gapfill 各文件「最终判定」节登记的其余差异项（如 SKIN_RADII 补 9999px/24px、设置页退出动画 140ms 登记为自有增强、#ff9800 对照 `--color-warning` 登记、ZCode 遮罩 0.6 纯黑 vs 插件三档阶梯等）——均已写明建议动作，建议按早间附 1 的「值/注释写回 + 04-open-gaps 登记」路径批次处理，此处不逐条展开。
8. **5.1 spinner 互斥未解，但多了一个声音**：cross-4-乙.md:43 支持「活体 size-3.5=14px、插件 14 一致」口径（引 03b-sidebar.md:112），与 batch-19:21 的 asar `size-4`(16px) 口径仍互斥；三份交叉文件均未定点复核 loader 本体元素，5.1 的定点复核要求（早间 5.1/附 1 第 1 步）维持不变。

### 3.4 覆盖面与未验证项的净变化

- 早间 6.3「ZCode 侧结构性未采集」清单大面积收缩：侧栏行系统（ghost/落点线/分组层/行内按钮/悬停卡/树键盘）、⌘K（浮层/键帽/分组标题/配额）、设置页（退出动画/分区图标/搜索框/开关）、新建页（hero/建议卡/chip）、令牌家族（滚动条/遮罩/骨架/选区）、顶栏（锚定偏移/导航钮图标/Windows 标题栏）均已在 asar 静态层补齐（对应 gapfill-1/2/9/13/5/10 等，出处见 2.1）。
- 仍然开放的缺口（本轮未解决，与早间 6.1/6.2 重叠或新增）：① 一切静态新值的**活体 CDP 复核**（尤其 5.3 浅色族、5.1 spinner、head 高 mac 56px、气泡折叠钮 24 vs 32、`--color-ring` 定义值——最后者 asar 静态不可提取，gapfill-10.md:112）；② 运行时 hash 类与 radix 运行时 zIndex 仍不可静态检索（3.3 方法学第 5 条）；③ 超长会话滚动性能未测（gapfill 系未触及，早间 6.3 末条维持）；④ 频道树表面维持无 ZCode 对应物（gapfill-11.md:66）。
- gapfill-20.md:131 对 batch-20 的三处更正（品牌图标存在、定时任务视图存在、时间格式以批次 4 记录为准）已在 2.1/3.2 体现。
