# 批次 4 · 乙（三方交叉复检 · 第一方独立取证）

> 审计人：乙。未读任何 batch-*.md / cross-*.md，全部证据本会话自行提取。
> 模块：`src/client/locales.ts` · `src/client/new-conversation-draft.ts` · `src/client/sidebar-session.ts`
> 模块性质：locales.ts 为界面文案词典（zh/en 各 460+ 键）；另两件为纯行为逻辑（预填门控、新建会话页签切换），无颜色/圆角/间距/动效决策点，决策点集中在 **文案词汇** 与 **行为语义**。
> 参照文档：`01-design-tokens.md`、`03b-sidebar.md`、`03e-header.md`、`03i-command-palette.md`、`03n-typography.md`（按需 grep 过 `03-turn-navigator.md`、`03d-composer.md`、`04-open-gaps.md`）。
>
> **取证命令**（`cd /Applications/ZCode.app/Contents/Resources`，341MB 全文扫描）：
> ① 键名枚举 `LC_ALL=C /usr/bin/grep -a -o -E '"[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+":`' app.asar | sort -u` → 6975 键；
> ② 取值 `LC_ALL=C /usr/bin/grep -a -o -E '"<键名>":`[^`]*`' app.asar`；
> ③ 零命中验证 `LC_ALL=C /usr/bin/grep -a -c -o '<字符串>' app.asar`。
> **未验证声明**：asar 值为 bundle 内 i18n 词典字符串；本机无活宿主条件，未在 ZCode 活页上验证这些键的实际渲染。零命中均经全文扫描确认。

## 批次 4 · locales.ts / new-conversation-draft.ts / sidebar-session.ts

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| locales.ts | ⌘K 搜索占位符 | `search.placeholder`=「搜索会话、设置和操作」（locales.ts:108；CodexSidebar.tsx:742 渲染） | `commandCenter.placeholder`=「搜索操作、任务或文件」（en: Search actions, tasks, or files） | asar ②：`"commandCenter.placeholder":\`搜索操作、任务或文件\`` | 改为「搜索操作、任务或文件」 |
| locales.ts | ⌘K 入口 aria / 空态 / 分区名 | `sidebar.search`=「搜索会话」(:72)、`search.empty`=「没有匹配的会话。」(:109)、`search.sessions`=「会话」(:113)、`search.actions`=「快捷操作」(:115) | `commandCenter.open`=「搜索」、`noResults`=「暂无相关结果」、`section.conversations`=「任务」、`section.commands`=「快捷入口」（en 两侧同为 Quick actions） | asar ②（commandCenter 20 键全量提取）；另：「搜索会话」全 asar 零命中（③=0） | 入口改「搜索」，空态改「暂无相关结果」，分区词对齐「任务/快捷入口」 |
| locales.ts | 侧栏收展 aria | `sidebar.expand`/`sidebar.collapse`=「展开侧边栏」/「收缩侧边栏」（locales.ts:69-70；CodexSidebar.tsx:931,964 渲染） | `workspaceSidebar.toggleSidebar`=「切换侧边栏」（单键，无方向对）；「收缩侧边栏」「展开侧边栏」全 asar 零命中（③=0,0） | asar ② + ③ | 登记不改：方向对比单键 toggle 的读屏信息更多，属显式增强（建议在文档标注偏离原因） |
| locales.ts | 「会话」vs「任务」名词族 | `sessions.pin`/`rename`/`archive`=「置顶会话/重命名会话/归档会话」(:160,173,177)、`sessions.previous`/`next`=「上一个会话/下一个会话」(:157-158)、`workspace.archiveTitle`=「归档 {count} 个会话？」(:141)；en 用 conversation | `taskList.pin`/`rename`/`archive`=「置顶任务/重命名任务/归档任务」、`quickPick.command.previous/nextConversation`=「上一个任务/下一个任务」、`confirmDialog.taskArchiveTitle`=「归档这个任务？」；en 用 task | asar ②（/tmp/asar-values.txt 提取记录：asar-values.txt:49-97） | 同一词汇体系差异：ZCode 侧栏把会话统称「任务」。改词牵动全族，建议整体裁决而非零散改 |
| locales.ts | 等待态词汇 | `sessions.waitingApproval`=「等待审批」、`sessions.planReview`=「计划待审」(:171-172；session-tree.tsx:143-149 作可见胶囊渲染)、`sessions.waitingAnswer`=「等待回答」(:170) | `taskList.permissionTag`/`taskList.userInputTag`=「等待确认」、`chat.permission.awaitingApproval`=「等待确认」；「等待审批」「计划待审」全 asar 零命中（③=0,0） | asar ② + ③ | 「等待审批」→「等待确认」；planReview/waitingAnswer 的 ZCode 侧无对应细分键，细分本身属插件增强（登记） |
| locales.ts | 运行中 aria | `sessions.running`=「运行中」(:169)，仅作 spinner 的 aria-label（session-tree.tsx:174 `role="img"`） | ZCode 任务行无文字状态，仅 spinner（03b-sidebar.md §5 活体记录）；ZCode 含「运行中」的键属 bashOutput/sidePane/subagentDirectory 表面，侧栏自动任务用 `automations.runs.status.running`=「进行中」 | 03b-sidebar.md:112 + asar ② | aria 词可对齐 ZCode 词汇「进行中」，或维持「运行中」并登记（视觉层已同构，见一致项 6） |
| locales.ts | 置顶区标题 | `workspace.pinned`=「置顶」（locales.ts:117；CodexWorkspaceBrowser.tsx:1089 可见分区标题） | `taskList.pinnedSection`=「已置顶」 | asar ② | 改「已置顶」 |
| locales.ts | 展开更多 | `workspace.showMore`=「展开显示」（locales.ts:134） | `taskList.showMore`=「显示更多」（en 两侧同为 Show more） | asar ② | 改「显示更多」 |
| locales.ts | 列表空态 | `workspace.noChat`=「暂无聊天」（locales.ts:133） | `taskList.noTasks`=「暂无任务」；「暂无聊天」全 asar 零命中（③=0） | asar ② + ③ | 改「暂无任务」 |
| locales.ts | 错误文案风格 | `sessions.archiveFailed`=「暂时无法归档该会话，请稍后重试。」(:178)，同族 pin/rename/delete/move 等 10+ 键均为「暂时无法…，请稍后重试。」长句 | `taskList.archiveFailed`=「归档任务失败」、`taskList.markAsUnreadFailed`=「标记未读失败」（短句直述，无客套尾缀） | asar ② | 风格族差异，登记；若改需整套统一，反对单键零改 |
| locales.ts | 移出分组 | `workspace.removeFromGroup`=「移至未分组」（locales.ts:125）；「移至未分组」全 asar 零命中（③=0） | `taskGroup.removeFromGroup`=「移出分组」、`taskGroup.ungroup`=「取消分组」（ZCode 分两键） | asar ② + ③ | 二选一：并入「移出分组」，或按 ZCode 拆两键 |
| locales.ts | 项目行新建 aria | `workspace.newSession`=「新建会话」（locales.ts:136；CodexWorkspaceBrowser.tsx:951 图标钮 aria） | ZCode 动作标签全族用「新建任务」：`sidebar.newTask`/`project.createTask`/`taskList.newThread`/`workspaceSidebar.newConversation` 四键同值；「新建会话」在 ZCode 仅出现于设置描述散文（nativeSearchEnhancementsDescription），不用于动作标签 | asar ① + ② + ③ | aria 改「新建任务」或「在项目中新建任务」 |
| locales.ts | 未命名兜底词 | `turns.untitled`=「未命名提问」（locales.ts:284；TurnNavigator.tsx:148 兜底标题）；「未命名提问」全 asar 零命中（③=0） | `taskList.untitled`=「新任务」（en: New task）；ZCode「未命名」前缀仅用于定时任务/窗口/子代理（`automations.edit.titlePlaceholder`=「未命名定时任务」等） | asar ② + ③ | 可改为「新任务」；或维持并登记（轮次导航为插件自建表面，见无参照 5） |

### 一致项

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 |
|---|---|---|---|---|
| locales.ts | 新建任务主入口 | `sidebar.newTask`=「新建任务」/「New task」（locales.ts:71,381） | `sidebar.newTask`/`project.createTask`/`taskList.newThread`/`workspaceSidebar.newConversation` 四键全为「新建任务」/「New task」——连键名 `sidebar.newTask` 都同名 | asar ②（asar-values.txt:15-18,70-71,102-103） |
| locales.ts + hover-tip.ts | 会话行相对时间（侧栏表面） | 分档 <60s「刚刚」、`{count}分`、`{count}小时`、`{count}天`（locales.ts:286-290；hover-tip.ts:24-33 向下取整） | `taskList.justNow`=「刚刚」、`taskList.minutesAgo`=「{minutes}分」、`hoursAgo`=「{hours}小时」、`daysAgo`=「{days}天」逐档逐字同值；en 档位 m/h/d 同；插件 `time.justNowShort` en=「now」= ZCode `taskList.justNow` en=`now` | asar ②（asar-values.txt:56-63,68-69）+ ③ |
| locales.ts | 标记未读 | `sessions.markUnread`=「标记为未读」/「Mark as unread」（locales.ts:166,476） | `taskList.markAsUnread`=「标记为未读」/「Mark as unread」逐字同值（zh+en） | asar ② |
| locales.ts | 分组操作 | `workspace.createGroup`=「新建分组」(:121)、`workspace.moveToGroup`=「移动到分组」(:124) | `taskGroup.newGroup`=「新建分组」、`taskGroup.moveToGroup`=「移动到分组」逐字同值 | asar ② |
| locales.ts | 分区/栏目名 | `sidebar.tasksTab`=「任务」(:85)、`workspace.projects`=「项目」(:119)、`sidebar.schedule`=「定时任务」(:82) | `workspaceSidebar.conversationsSection`=「任务」、`projectsSection`=「项目」、`taskGroup.cron`/`automations.list.title`=「定时任务」逐字同值 | asar ② |
| sidebar-session.ts 视觉层（session-tree.tsx:174 + zcode-theme.ts:185,203） | 运行中 spinner | 仅图标无文字：`ZIconLoading size={14}`（14px）+ `.dcu-spin`（`1s linear infinite`，reduced-motion 统一停静止帧） | 03b §5 活体记录：仅运行中任务显示 lucide-loader，`size-3.5`=14px、`animate-spin`；asar `--animate-spin:spin 1s linear infinite` 同值 | 03b-sidebar.md:112 + asar ②（animate-spin 上下文提取）+ zcode-theme.ts:185；位置差异（行首槽 vs 右侧元信息区）本仓已登记（session-tree.tsx 注释 KNOWN-ISSUES §29） |
| locales.ts | 任务计数句式 | `workspace.taskCount`=「{count} 个任务」（locales.ts:150） | `chat.toolCall.workflow.graph.card.tasks`=「{count} 个任务」同值（表面不同：工作流图卡 vs 项目行） | asar ③（值搜命中） |
| locales.ts | 拖拽提示句式 | `workspace.pinnedEmpty`=「拖动项目到此处置顶」（locales.ts:118） | `taskGroup.empty`=「拖动任务到此分组」同句式「拖动X到此Y」（表面不同：置顶区 vs 分组空态） | asar ② |

### 无参照项（不得猜）

- home 建议卡全套文案：`home.suggestions`=「开始一项任务」、四类卡 `home.explore/build/review/fix` 及 8 条 prompt（locales.ts:19,23-42）—— 无 ZCode 例证，跳过。搜过：「开始一项任务」全 asar 零命中（③=0）、「探索并理解/理解代码」值搜零命中；NewConversationSuggestions.tsx:12-16 自述卡片源自上游 Codex fork，非 ZCode 表面。
- 键盘提示文案：`input.historyHint`=「↑↓ 翻历史」（locales.ts:67，InputHistoryDock.tsx:18 注入占位符 ::after）与 `search.hintMove/hintOpen/hintClose`=「选择/打开/关闭」(:110-112) —— 无 ZCode 例证，跳过。搜过：「翻历史」零命中；「↑/↓」仅命中字形常量表（arrowUp/arrowDown）与字体映射；commandCenter 全 20 键无 kbd 提示键；03d-composer.md:31 占位符色 ZCode 侧未采。
- 预填门控行为与提示：`prefillNewConversation` 四态（ready/workspace/draft/busy，new-conversation-draft.ts:35-42）与 `home.draft`=「已保留当前草稿和附件…」/`home.busy`（locales.ts:21-22，NewConversationSuggestions.tsx:35 hints 渲染）—— 无 ZCode 例证，跳过（ZCode 无任务建议卡表面，无「建议填入草稿」交互可比）。搜过：「草稿」仅命中无关的百科词条/API 注释文本；行为逻辑有本仓测试覆盖（tests/new-conversation.spec.ts:11-35），ZCode 侧无从验证，标注未验证。
- 新建会话先切页签：`beginSidebarSession` 先 `setTab('tasks')` 再创建（sidebar-session.ts:7-8，tests/sidebar-session.spec.ts:4-13）—— 无 ZCode 例证，跳过。动因是插件自有 IM 页签结构（CodexSidebar.tsx:951）；ZCode 侧栏为 项目/任务 分区（`workspaceSidebar.projectsSection/conversationsSection`），无 频道/日程 页签（「频道」全 asar 零命中；「定时任务」有 automations 键但无页签切换行为样本）。
- 轮次导航文案：`turns.label`=「当前会话轮次导航」、`turns.jump`=「跳转到第 {index} 轮：{summary}」（locales.ts:283,285）—— 无 ZCode 例证，跳过（ZCode 无轮次导航表面）。搜过：03-turn-navigator.md grep aria/文案/untitled/跳转 仅几何与 aria-posinset 记录；asar 搜「轮次」仅命中 conversationShare 限流文案（「所选对话仍在运行，请取消选择运行中的轮次…」）。

---
**复核口径**：以上 ZCode 值全部出自 app.asar 内 i18n 词典的模板字面量提取（命令见文首），非活页 CDP 实测；「零命中」均为 341MB 全文扫描结论。活页渲染态未验证（本机无活宿主条件）。
