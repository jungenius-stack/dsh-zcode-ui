# 批次 4（交叉复检·甲）· src/client/locales.ts · src/client/new-conversation-draft.ts · src/client/sidebar-session.ts

> 取证方式：设计文档 4 篇（03b-sidebar / 03i-command-palette / 03f-settings + 03f-settings-zcode-spec.json / 03n-typography）；
> ZCode 值全部为 2026-10-30 当场用 `grep -a -o -E '<模式>' /Applications/ZCode.app/Contents/Resources/app.asar` 提取，
> 表中引号内为原样命中片段（ZCode 字典为 `key":"值"` 键值结构）。未读 batch-*.md / cross-*.md。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| locales.ts | 「显示更多」措辞 | `'workspace.showMore': '展开显示'`（locales.ts:134） | `taskList.showMore":"显示更多"`、`project.showMore":"显示更多"`、`archives.showMore":"显示更多"`（三个域全用「显示更多」） | asar grep taskList/project/archives 域 | 改「显示更多」，与 ZCode 三域统一 |
| locales.ts | 等待审批标签 | `'sessions.waitingApproval': '等待审批'`（locales.ts:171） | `taskList.permissionTag":"等待确认"`、`taskList.userInputTag":"等待确认"`（ZCode 列表标签仅此两键、同值） | asar grep `taskList\.[A-Za-z.]*([Tt]ag\|Badge\|Status)` 全量 | 改「等待确认」 |
| locales.ts | 会话操作术语：ZCode 称「任务」，插件称「会话」 | `sessions.rename '重命名会话'`、`sessions.archive '归档会话'`、`sessions.pin '置顶会话'`、`sessions.previous/next '上一个/下一个会话'`、`workspace.newSession '新建会话'`、`workspace.noChat '暂无聊天'`（locales.ts:133,136,157-158,160,173,177） | `taskList.rename":"重命名任务"`、`taskList.archive":"归档任务"`、`taskList.pin":"置顶任务"`、`taskList.newThread":"新建任务"`、`taskList.noTasks":"暂无任务"`、`quickPick.command.previousConversation":"上一个任务"` | asar grep taskList/quickPick 域 | 术语裁决：注意 ZCode 自己双轨（taskList 用「任务」、archives 域用「会话」，如 `archives.title":"已归档的会话"`）；插件沿用「会话」须在设计文档登记为显式偏离，否则随任务列表面用「任务」 |
| locales.ts | 项目搜索占位符 | `'home.projectSearch': '搜索项目'`（locales.ts:17） | `chat.empty.workspaceSearchPlaceholder":"搜索项目或设备"`（同一表面：首页项目搜索框） | asar grep chat.empty 域 | 插件无远程设备概念，可登记本地适配；否则补「或设备」 |
| locales.ts | 搜索面板占位与分区 | `'search.placeholder': '搜索会话、设置和操作'`，分区 `会话/设置/快捷操作`（locales.ts:108,113-115） | `quickPick.placeholder":"输入命令"`；分区键 `quickPick.section.app/chat/config/configure/navigation/panel(s)/recommended/suggested = 应用/对话/配置/导航/面板/推荐/建议` | asar grep quickPick 域 | ZCode 对应表面（命令面板）只搜命令；插件的合并搜索是有意扩展，登记为显式扩展，不做假对齐 |
| locales.ts | 设置分区命名 | `个人/集成/插件配置/记录与应用/常规/权限/编辑器`（locales.ts:54-60） | ZCode 设置导航实测 = `基础设置`（组标签 12px/500）+ `外观/模型设置/键盘快捷键`（16px/400/h32/r12）；asar `settings.appearanceTitle":"外观"` | 03f-settings-zcode-spec.json navItems（CDP 实测）+ asar settings 域 | 两套设置体系内容本不同，文案无对齐项；登记为产品差异即可 |
| locales.ts | 复制工作目录 | `'sessions.copyPath': '复制工作目录'`（locales.ts:201） | `appHeader.copyPath":"复制路径"`、`appHeader.copyTaskPath":"复制任务路径"` | asar grep appHeader 域 | 改「复制路径」或「复制任务路径」 |
| locales.ts | 置顶分区标题 | `'workspace.pinned': '置顶'`、`'workspace.pinnedEmpty': '拖动项目到此处置顶'`（locales.ts:117-118） | `taskList.pinnedSection":"已置顶"`；拖拽提示 `taskGroup.empty":"拖动任务到此分组"` | asar grep taskList/taskGroup 域 | 「置顶」→「已置顶」；空态提示对象不同（项目 vs 任务）属结构差异，登记 |
| locales.ts | 移出分组措辞 | `'workspace.removeFromGroup': '移至未分组'`（locales.ts:125） | `taskGroup.removeFromGroup":"移出分组"`、`taskGroup.ungroup":"取消分组"` | asar grep taskGroup 域 | 改「移出分组」 |
| locales.ts | 侧栏开合为两个动作 | `'sidebar.expand': '展开侧边栏'` + `'sidebar.collapse': '收缩侧边栏'`（locales.ts:69-70） | ZCode 全部为单一切换：`workspaceSidebar.toggleSidebar":"切换侧边栏"`、`quickPick.command.toggleSidebar":"切换侧边栏"`、`settings.shortcuts.command.toggleSidebar":"切换左侧栏"` | asar grep（侧栏/侧边栏 全量键） | DSH 两入口语义更精确，登记为显式偏离，不强行合并 |
| locales.ts | 置顶动词短语 | `'workspace.pin': '置顶项目'`、`'workspace.unpin': '取消置顶'`（locales.ts:138-139） | `project.pin":"置顶"`、`project.unpin":"取消置顶"`、`taskList.pin":"置顶任务"` | asar grep project/taskList 域 | unpin 已与 project.unpin 逐字一致；pin 的「置顶项目」比 ZCode 多宾语，随项目卡菜单改「置顶」或登记 |
| locales.ts | 首页建议体系 | `'home.suggestions': '开始一项任务'` + explore/build/review/fix 四类八条（locales.ts:19,23-42） | ZCode 无四分类：建议仅 2 条 `chat.draft.suggestedPrompt.createPdf":"制作一份 PDF"`、`…recentCommits":"检查近 7 天的 commit"`；空态组标题为 `chat.empty.description":"开始在 {workspace} 项目新建任务"`、`chat.empty.title":"开始对话"` | asar grep chat.draft/chat.empty 域 | 建议内容属产品定位，不强行对齐；组标题「开始一项任务」为自创，登记 |

## 一致项（3 到 10 条）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 |
|---|---|---|---|---|
| locales.ts | 时间短格式 | `time.justNow '刚刚'`、`time.minutes '{count}分'`、`time.hours '{count}小时'`、`time.days '{count}天'`（locales.ts:286-290；英文 `{count}m/{count}h/{count}d`） | `taskList.justNow":"刚刚"`、`taskList.minutesAgo":"{minutes}分"`、`taskList.hoursAgo":"{hours}小时"`、`taskList.daysAgo":"{days}天"`（英文 `{minutes}m/{hours}h/{days}d`）——逐值一致，仅占位符名 count/minutes 差异 | asar grep taskList 域全量 |
| locales.ts | 标记为未读 | `'sessions.markUnread': '标记为未读'`（locales.ts:166） | `taskList.markAsUnread":"标记为未读"` | asar grep |
| locales.ts | 复制会话 ID | `'sessions.copyId': '复制会话 ID'`（locales.ts:203） | `appHeader.copySessionId":"复制会话 ID"` | asar grep appHeader 域 |
| locales.ts | 渠道名 | `channel.dingtalk '钉钉'`、`channel.feishu '飞书'`、`channel.wecom '企业微信'`、`channel.weixin '微信'`（locales.ts:92-96） | `bots.channel.dingding":"钉钉"`、`bots.channel.feishu":"飞书"`、`bots.channel.wecom":"企业微信"`；微信见 `bots.weixinRegistrationTitle":"微信扫码登录"` | asar grep bots 域 |
| locales.ts | 通用动词 | `sessions.cancel '取消'`、`sessions.confirm '确认'`、`sessions.save '保存'`、`sessions.close '关闭'`、`workspace.retry '重试'`（locales.ts:12,153-156） | `common.cancel":"取消"`、`common.confirm":"确认"`、`common.save":"保存"`、`common.close":"关闭"`、`common.retry":"重试"` | asar grep common 域 |
| locales.ts | 分组菜单动词 | `'workspace.createGroup': '新建分组'`、`'workspace.moveToGroup': '移动到分组'`（locales.ts:121,124） | `taskGroup.add":"新建分组"`、`taskGroup.newGroup":"新建分组"`、`taskGroup.moveToGroup":"移动到分组"` | asar grep taskGroup 域 |
| locales.ts | 侧栏「新建任务」 | `'sidebar.newTask': '新建任务'`（locales.ts:71） | `menu.file.newTask":"新建任务"`、`project.createTask":"新建任务"`、`taskList.newThread":"新建任务"` | asar grep menu/project/taskList 域 |
| locales.ts | 「运行中」状态词 | `'sessions.running': '运行中'`（locales.ts:169） | ZCode 多域同词：`webRemoteControl.taskStatus.running":"运行中"`、`sidePane.fullView.statusRunning":"运行中"`、`automations.lifecycle.active":"运行中"` | asar grep 运行中 全量键 |
| locales.ts | 项目搜索空态 | `'home.projectEmpty': '没有匹配的项目'`（locales.ts:18） | `chat.empty.workspaceSearchEmpty":"没有匹配的项目"`（同一表面逐字一致——与上面占位符那条形成对照：空态抄齐了、占位符没抄齐） | asar grep 没有匹配 全量键 |
| new-conversation-draft.ts | 「草稿不被静默覆盖」设计逻辑 | `prefillNewConversation` 对非空草稿/附件/提及直接拒绝（new-conversation-draft.ts:39），反馈文案 `'home.draft': '已保留当前草稿和附件；清空输入后可填入任务建议。'`（locales.ts:21） | ZCode 同原则：`chat.queue.editDraftConflict":"请先发送或清空当前草稿，再编辑队列消息。"` | asar grep 草稿 全量键（表面不同：队列编辑 vs 任务建议，原则同源） |

## 无参照项（不得猜）

- `'input.historyHint': '↑↓ 翻历史'`（locales.ts:67）——无 ZCode 例证，跳过。搜过：`[A-Za-z.]+":\`[^`]*(↑|↓|⌘K|Esc|Enter)[^`]*\``（0 命中）、`翻历史`（0 命中）、`历史`（仅 `commandCenter.history":"搜索历史"`、`automations.runs.title":"运行历史"` 等无关键）。
- `'search.hintMove/hintOpen/hintClose': '选择/打开/关闭'` 键盘提示条（locales.ts:110-112）——无 ZCode 例证，跳过。搜过：同上键盘符号模式（0 命中）；`common.open":"打开"`、`common.close":"关闭"` 存在但是菜单动词键，非提示条。
- `beginSidebarSession` 先切任务页签再新建（sidebar-session.ts:7）与 `prefillNewConversation` 四态守卫的点击后行为（new-conversation-draft.ts:35-42）——行为层无 ZCode 例证，跳过。搜过：asar 代码 `grep -a -o -E '(setTab|activeTab|switchTab|setView)\("?tasks"?\)?'`（无函数级命中，仅裸字符串 `"tasks"`×4，bundle 已压缩无法证明行为顺序）；`suggestedPrompt[A-Za-z]{0,20}\(`（0 命中）；设计文档 03b/03i/expansion-state/04 中「任务页签/切回/setTab」均无记录（grep 为空）。
- 状态标签 `'sessions.waitingAnswer': '等待回答'`、`'sessions.planReview': '计划待审'`、`'sessions.markRead': '标记为已读'`（locales.ts:167-172）——ZCode taskList 域标签键全量仅 `permissionTag/userInputTag = 等待确认`；`等待回答` 仅出现于 `chat.backgroundResult.workflow.waiting":"子代理正在等待回答"`（工作流卡，非列表标签）。无列表级例证，跳过。
- `'time.weeks/months/years': '{count}周/{count}个月/{count}年'`（locales.ts:291-293）——ZCode taskList 时间键仅 justNow/minutesAgo/hoursAgo/daysAgo；搜过 `weeksAgo|monthsAgo|yearsAgo` 与 `[^"]*(周|个月|年前)[^"]*`（仅命中 `automations.customRepeat.unit.week":"周"` 等重复周期单位键，非时间戳）。周/月/年档为插件外推，无 ZCode 例证，跳过。
