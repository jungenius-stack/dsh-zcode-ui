# 批次 4 · locales.ts / new-conversation-draft.ts / sidebar-session.ts（交叉复检 · 丙方）

> 取证方法（本次实际执行）：
> ① `grep -ac "<词>" /Applications/ZCode.app/Contents/Resources/app.asar` 做有无/计数；
> ② python3 对同一 341MB bundle 按字节定位，回读 i18n 键值上下文（如 `"taskList.permissionTag":\`等待确认\``）；
> ③ 设计文档：`design-language/README.md`、`night-audit/README.md`、`03b-sidebar.md`、`03e-header.md`、`03i-command-palette.md` 全读；
> `03f-settings.md`/`03-turn-navigator.md`/`03d-composer.md`/`03p-startup.md` 仅按需 grep；`04-open-gaps.md` 未整读（仅 grep 计数，未采信其结论）。
> 未读任何 batch-*.md / cross-*.md。本批三模块为文案表与交互逻辑，无颜色/圆角/动效取值；决策点集中在**文案词汇**与**交互设计逻辑**。

## 批次 4 · src/client/locales.ts · src/client/new-conversation-draft.ts · src/client/sidebar-session.ts

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| locales.ts | 任务行等待类状态标签 | `sessions.waitingAnswer`='等待回答'、`sessions.waitingApproval`='等待审批'、`sessions.planReview`='计划待审'（locales.ts:170-172） | 同位标签只有 `taskList.permissionTag`/`taskList.userInputTag` = **等待确认**；无「等待审批/计划待审」 | asar：grep「等待确认」=4、「等待审批」=0、「计划待审」=0；键值回读 taskList.* 全 53 键 | 任务行状态标签对齐「等待确认」，或在 03b 登记语义豁免 |
| locales.ts | 轮次导航 aria 名 | `turns.label`='当前会话轮次导航'（locales.ts:283） | `chat.turnNavigator.label` = **对话问题导航** | asar 键值回读 chat.turnNavigator.* 全 5 键；grep「当前会话轮次导航」=0 | aria 文案对齐 |
| locales.ts | 轮次跳转提示 | `turns.jump`='跳转到第 {index} 轮：{summary}'（locales.ts:285） | `chat.turnNavigator.jumpToQuery` = **跳转到第 {index} 条问题**（无摘要插值）；另有 emptyAssistant=暂无助手正文 / runningAssistant=助手仍在工作 / userFallback=用户输入 三态兜底键，插件 turns.* 缺失 | asar 键值回读 | 量词与句式对齐；三态兜底键缺失并入 TurnNavigator 组件批次核查 |
| locales.ts | 展开更多 | `workspace.showMore`='展开显示'（locales.ts:134） | `taskList.showMore` = **显示更多** | asar：grep「显示更多」=2、「展开显示」=0 | 改词 |
| locales.ts | 任务区空态 | `workspace.noChat`='暂无聊天'（locales.ts:133） | `taskList.noTasks` = **暂无任务** | asar 键值回读；grep「暂无聊天」=0 | 改词 |
| locales.ts | 置顶区标题 | `workspace.pinned`='置顶'（locales.ts:117） | `taskList.pinnedSection` = **已置顶** | asar：grep「已置顶」=1 | 改词（低风险） |
| locales.ts | 移出分组 | `workspace.removeFromGroup`='移至未分组'（locales.ts:125），并把「未分组」作可见分组名（`workspace.ungrouped`:120） | `taskGroup.removeFromGroup` = **移出分组**；ZCode 分组体系无「未分组」标签（其 `taskGroup.ungroup`=取消分组 是动作；全包唯一「未分组」命中 `chat.toolCall.workflow.graph.phase.unphased`，无关域） | asar：taskGroup.* 全 41 键回读；grep「移至未分组」=0 | 改词，或把「未分组」显式登记为 DSH 侧扩展概念 |
| locales.ts | 打开路径文案 | `workspace.openPath`:145 / `sessions.openPath`:187 均固定'在资源管理器中打开' | 按平台三分支：`appHeader.openInFinder`=**在 Finder 中打开** / `openInFileExplorer`=在资源管理器中打开 / `openInFileManager`=在文件管理器中打开 | asar 三键回读（同块相邻） | macOS 上与 ZCode 不一致；按平台分支，或登记「Web 宿主无法感知平台」豁免 |
| locales.ts | 侧栏展开/收起词 | `sidebar.expand`='展开侧边栏'、`sidebar.collapse`='收缩侧边栏'（locales.ts:69-70） | `workspaceSidebar.toggleSidebar` = **切换侧边栏**、`resizeSidebar`=调整侧边栏宽度；无「展开/收缩侧边栏」词对 | asar：grep「展开侧边栏」=0、「收缩侧边栏」=0；键值回读 | 改 aria 词，或按「按钮语义为双向 toggle」登记 |
| locales.ts | 任务行菜单量词体系 | 菜单用「会话」：`sessions.rename`='重命名会话':173、`sessions.archive`='归档会话':177、`sidebar.search`='搜索会话':72 | ZCode 同位菜单用「任务」：`taskList.rename`=重命名任务 / `taskList.archive`=归档任务 / `taskSearch.placeholder`=搜索任务；但 ZCode 归档区/顶栏也用「会话」（`archives.search`=搜索已归档会话、`appHeader.copySessionId`=复制会话 ID） | 双侧键值回读 | 明确量词策略：行内菜单面跟随 ZCode 用「任务」，或全站统一「会话」并登记 |
| locales.ts | 删除确认措辞 | `sessions.deleteDescription`='将永久删除会话"{name}"及其全部记录，此操作不可恢复。'（locales.ts:180） | `confirmDialog.taskDeleteTitle`=删除这个任务？ / `taskDeleteDescription`=**任务"{taskTitle}"会从当前工作区移除，现有记录无法恢复。**（语义为「移除」而非「永久删除」） | asar confirmDialog.* 全 6 键回读 | 若插件行为与 ZCode 等价（记录保留），措辞对齐；若真为永久删除，登记语义差异 |
| locales.ts | 全局搜索占位枚举 | `search.placeholder`='搜索会话、设置和操作'（locales.ts:108） | `commandCenter.placeholder` = **搜索操作、任务或文件**（同「搜索 X、Y、Z」句式，枚举域不同）；`taskSearch.placeholder`=搜索任务 | asar：grep「搜索操作、任务或文件」=1 | 枚举顺序/用词对齐，或按 DSH 域差异登记 |

### 一致项

1. **新建任务**：`sidebar.newTask`='新建任务'（locales.ts:71）= ZCode `project.createTask` / `taskList.newThread` / `titleBar.menu.file.newTask` 三处键值逐字一致；03e-header.md:103 亦记录插件沿用此词。
2. **相对时间前四档**：`time.justNow`/`time.minutes`/`time.hours`/`time.days`（locales.ts:286-290）='刚刚 / {count}分 / {count}小时 / {count}天'，与 ZCode `taskList.justNow/minutesAgo/hoursAgo/daysAgo` 格式逐字一致（插值名 {count} vs {minutes} 为内部实现，不影响显示）。
3. **标记为未读**：`sessions.markUnread`='标记为未读'（locales.ts:166）= `taskList.markAsUnread` 逐字一致。
4. **复制会话 ID**：`sessions.copyId`='复制会话 ID'（locales.ts:203）= `appHeader.copySessionId` 逐字一致（含 ID 前空格）。
5. **分组三词**：`workspace.createGroup`='新建分组' = `taskGroup.newGroup`；`workspace.moveToGroup`='移动到分组' = `taskGroup.moveToGroup`；`workspace.renameGroup`='重命名分组' = `taskGroup.rename`（locales.ts:121/124/130）。
6. **定时任务**：`sidebar.schedule`='定时任务'（locales.ts:82）= `taskList.cronTaskLabel` / `taskGroup.cronGroupName` / `taskGroup.cron` 三处键值一致。
7. **空搜索结果**：`home.projectEmpty`='没有匹配的项目'（locales.ts:18）= `chat.empty.workspaceSearchEmpty` 逐字一致。
8. **草稿不可覆盖的设计逻辑**：`prefillNewConversation` 对非空草稿/附件/提及一律拒绝预填（new-conversation-draft.ts:39，返回 'draft' 走 `home.draft` 提示）⇔ ZCode `chat.queue.editDraftConflict`='请先发送或清空当前草稿，再编辑队列消息。'（asar 回读）——两侧都把草稿当作用户内容保护、不静默覆盖。
9. **归档确认结构**：`workspace.archiveTitle`/`archiveDescription`（locales.ts:141-142）=「归档 {count} 个会话？」+ 保留安抚句，与 ZCode `confirmDialog.taskArchiveTitle`=归档这个任务？ / `taskArchiveDescription`=…之后仍可恢复。 的「title+description+可恢复安抚」三段结构同构。

### 无参照项（不得猜）

- `input.historyHint`='↑↓ 翻历史'（locales.ts:67）—— 搜过 `↑↓`（仅命中字符集表/正则表，无 UI 文案）、`翻历史`=0、history 相关键无 composer 提示类 —— 无 ZCode 例证，跳过。
- 任务建议卡全套文案与预填反馈（`home.explore/build/review/fix` 及其 task/prompt 子键、`home.draft`:21、`home.busy`:22）—— 搜过 `探索并理解`/`构建新功能`/`审查代码`/`修复问题`=0；i18n 区「草稿」仅命中 `remote.conversation.draft`（未发送的草稿）、`chat.queue.editDraftConflict`、工作流草稿键，无建议预填表面；设计文档 grep「任务建议/预填/prefill/suggestion」0 命中 —— 无 ZCode 例证，跳过。
- `beginSidebarSession` 的「先切任务页签再创建」（sidebar-session.ts:7）—— ZCode 侧栏视图仅 项目/任务 两 Tab（03i-command-palette.md:15-24 B 组），无 频道/定时 页签可比（asar `频道`=0），切页签防呆在 ZCode 无同位交互 —— 无例证，跳过。
- 设置导航与设置搜索文案（`settings.search`='搜索设置…'、个人/集成/常规/权限/编辑器，locales.ts:53-60）—— 搜过 `搜索设置`=0；「个人/常规/权限」仅命中第三方 API 文档注释；ZCode 设置分区键为 settings.skills/mcp/hooks/commands 等另一体系 —— 无同位词表，跳过。
- 频道/连接器体系（`channels.*`、`channel.dingtalk` 等，locales.ts:90-99、204-217）—— asar `频道`=0；ZCode IM 词汇为 `bots.*`/机器人（bots.newBot.providerDescription.*），无「频道」表面 —— 无例证，跳过。
