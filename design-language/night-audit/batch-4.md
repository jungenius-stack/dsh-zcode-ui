# 批次 4 · locales.ts / new-conversation-draft.ts / sidebar-session.ts

> 审计方式：locales.ts 为纯文案表，ZCode 参照全部取自 app.asar 内嵌 i18n 键组
> （`"键":\`值\`` 反引号模板形式，UTF-8 直存）。先经 python 一次性扫描定位键组
> （taskList×53 / taskGroup×41 / project×87 / taskSearch×9 / chat.empty×29 /
> sidebar×55 / archives×29 / common×23），diffs 涉及的 33 键已逐条用下述命令复现：
>
> ```
> grep -a -o -m 1 '"taskList.showMore":`[^`]*`' /Applications/ZCode.app/Contents/Resources/app.asar
> # → "taskList.showMore":`显示更多`
> ```
>
> 文档旁证：03b-sidebar.md（侧栏结构与任务行）、03i-command-palette.md（搜索面板）、
> 03d-composer.md（输入区）、03j-dialog.md（弹窗）、03p-startup.md（启动/新建页语境）。
> new-conversation-draft.ts 与 sidebar-session.ts 为行为模块，无颜色/圆角/动效类决策点，
> 其行为决策见「无参照项」。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| locales.ts | 列表「展开更多」措辞（locales.ts:134） | `workspace.showMore` = 「展开显示」，无配对收起文案 | `taskList.showMore`=`显示更多`、`taskList.showLess`=`显示更少`；`project.showMore`、`archives.showMore` 三处均为「显示更多」 | asar：`grep -a -o -m 1 '"taskList.showMore":`+backtick+`[^`]*`'` → 显示更多；03i D2 亦记录「显示更多」14px/前景 30% | 改「显示更多」；并裁决是否补 `showLess`「显示更少」配对 |
| locales.ts | 会话右键菜单动词组术语（locales.ts:160,161,173,177） | `sessions.pin`=「置顶会话」、`sessions.unpin`=「取消置顶」（不对称）、`sessions.rename`=「重命名会话」、`sessions.archive`=「归档会话」 | `taskList.pin`=`置顶任务`、`taskList.unpin`=`取消置顶任务`、`taskList.rename`=`重命名任务`、`taskList.archive`=`归档任务` | asar grep 复现四键（见上命令样例，换键名） | ZCode 把 session 统一称「任务」且 unpin 带宾语；按术语裁决表统一 |
| locales.ts | 列表空态与入口术语（locales.ts:133,136,72,109） | `workspace.noChat`=「暂无聊天」、`workspace.newSession`=「新建会话」、`sidebar.search`=「搜索会话」、`search.empty`=「没有匹配的会话。」 | `taskList.noTasks`=`暂无任务`、`taskList.newThread`=`新建任务`、`taskSearch.title`=`搜索任务`、`taskSearch.noResults`=`没有找到相关任务` | asar grep 复现四键；03b-sidebar.md:45 的「搜索会话 ⌘K」是 DSH 侧菜单文案，ZCode 侧未采集 | 与上一条同属「会话 vs 任务」术语系，一并裁决 |
| locales.ts | 等待审批标签（locales.ts:171） | `sessions.waitingApproval` = 「等待审批」 | `taskList.permissionTag` = `等待确认`（`taskList.userInputTag` 同值）；「等待审批」在 asar 仅出现于钉钉机器人业务语境 | asar：`grep -a -o -m 1 '"taskList.permissionTag":`…`'` → 等待确认 | 状态标签改「等待确认」 |
| locales.ts | 置顶分组标题（locales.ts:117） | `workspace.pinned` = 「置顶」 | `taskList.pinnedSection` = `已置顶` | asar grep 复现 | 分组标题改「已置顶」 |
| locales.ts | 项目行「重命名」入口（locales.ts:137） | `workspace.rename` = 「重命名项目」 | `project.edit` = `编辑项目`（ZCode 项目行无「重命名」项，更名入口叫编辑） | asar：`grep -a -o -m 1 '"project.edit":`…`'` → 编辑项目 | 裁决：沿用 ZCode「编辑项目」或保留现值（功能等价） |
| locales.ts | 项目行「删除」入口（locales.ts:146） | `workspace.delete` = 「移除项目」 | `project.delete` = `删除项目` | asar grep 复现 | 改「删除项目」与 ZCode 同词 |
| locales.ts | 移出分组（locales.ts:125） | `workspace.removeFromGroup` = 「移至未分组」 | `taskGroup.remove` = `移出分组` | asar grep 复现 | 改「移出分组」；「未分组」容器名 ZCode 侧栏无对应键（见无参照项） |
| locales.ts | 搜索占位符（locales.ts:108） | `search.placeholder` = 「搜索会话、设置和操作」 | `taskSearch.placeholder` = `搜索任务`；`taskSearch.title` = `搜索任务` | asar grep 复现两键 | 插件面板多合并设置/操作两类属扩展，但占位符长度差 10 倍；至少核对是否刻意 |
| locales.ts | 新建页建议区标题（locales.ts:19） | `home.suggestions` = 「开始一项任务」 | `chat.empty.title` = `开始对话`；ZCode 新建页为时段问候语（`chat.empty.greeting.morning`=`上午好呀，有什么想让我帮忙的吗` 等 6 档）+项目选择，无任务建议卡 | asar：`grep -a -o -m 1 '"chat.empty.title":`…`'` → 开始对话；四分类建议词「探索并理解/构建新功能/审查代码」全 0 命中 | 建议卡为插件自建表面；标题措辞与问候语机制待裁决（见无参照项） |
| locales.ts | 项目搜索占位符（locales.ts:17） | `home.projectSearch` = 「搜索项目」 | `chat.empty.workspaceSearchPlaceholder` = `搜索项目或设备` | asar grep 复现 | 差异源于 ZCode 有远程设备概念；低优先，裁决保留即可 |
| locales.ts | 操作失败提示体例（locales.ts:162 等十余条） | `sessions.pinFailed` = 「暂时无法更新置顶状态，请稍后重试。」（长句+重试引导） | `taskList.pinFailed` = `更新置顶状态失败`、`taskList.markAsUnreadFailed` = `标记未读失败`（短句直陈） | asar grep 复现 pinFailed；markAsUnreadFailed 见 python 键组抽取 | 两种体例二选一：贴 ZCode 短句，或声明插件统一体例为刻意偏离 |

## 一致项（回归加固建议）

| 模块 | 点 | 期望取值（两侧同值） | 证据来源 |
|---|---|---|---|
| locales.ts | `sidebar.newTask` | 「新建任务」（ZCode 键名同名同值） | asar：`grep -a -o -m 1 '"sidebar.newTask":`…`'` → 新建任务 |
| locales.ts | `sessions.markUnread` | 「标记为未读」= `taskList.markAsUnread` | asar grep 复现 |
| locales.ts | `workspace.moveToGroup` | 「移动到分组」= `taskGroup.moveToGroup` | asar grep 复现 |
| locales.ts | `workspace.createGroup` / `workspace.renameGroup` | 「新建分组」/「重命名分组」= `taskGroup.newGroup`/`taskGroup.rename` | asar grep 复现 |
| locales.ts | `home.projectEmpty` | 「没有匹配的项目」= `chat.empty.workspaceSearchEmpty` | asar grep 复现 |
| locales.ts | `time.justNow` | 「刚刚」= `taskList.justNow`/`common.justNow` | asar grep 复现 |
| locales.ts | `time.minutes/hours/days` | 「{count}分/{count}小时/{count}天」紧凑式 = `taskList.minutesAgo` `{minutes}分`/`{hours}小时`/`{days}天`（注意 ZCode taskList 仅 4 档，无周/月/年） | asar grep 复现三键 |
| locales.ts | `sidebar.schedule` | 「定时任务」= `taskList.cronTaskLabel`/`taskGroup.cronGroupName` | asar grep 复现 |

## 无参照项（不得猜）

- locales.ts:23-42 任务建议四分类（`home.explore/build/review/fix` 及 8 条 task/prompt 文案）—— ZCode 新建页只有时段问候语+项目选择（`chat.empty.greeting.*` 六档），无建议卡表面；asar 四分类关键词全 0 命中，跳过。
- new-conversation-draft.ts:35-42 `prefillNewConversation` 守卫链（phase≠plain→busy、草稿/附件/@提及不覆盖）—— ZCode 无建议卡表面可触发同型行为，minified bundle 亦无法定位对应实现；无 ZCode 例证，跳过。
- sidebar-session.ts:2-10 `beginSidebarSession` 先切 tasks 页签再建会话 —— ZCode 侧栏无页签结构（sidebar.* 55 键无 tabs/channels/schedule 页签概念），页签树为插件自有扩展；跳过。
- locales.ts:110-112 `search.hintMove/hintOpen/hintClose`（⌘K 面板底部键提示）—— `taskSearch.*` 全 9 键无 hint 键，03i 第二批 E 组亦未采集面板底部；跳过。
- locales.ts:53 `settings.search`「搜索设置…」、:67 `input.historyHint`「↑↓ 翻历史」、:174 `sessions.renameDescription`「保持简短且易于识别」、`time.weeks/months/years` 三档 —— asar 均 0 命中（「保持简短」「翻历史」「搜索设置」及 taskList 时间第 5 档起无键）；跳过。
