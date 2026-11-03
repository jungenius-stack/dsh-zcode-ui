# 补采 · 批次 4（gapfill-4）· locales.ts / new-conversation-draft.ts / sidebar-session.ts

> 本批目标：对 batch-4.md「无参照项」5 条逐一重挖。方法升级为两步：
> ① python 全量抽取 asar 内嵌 i18n（反引号模板形式 `"键":\`值\``，UTF-8 直存）得 7721 个唯一键
> （草稿库 /tmp/zcode_i18n_full.tsv，仅作本轮工作区，不进 design-language 目录）；
> ② 对命中的键再回到 341MB 原始字节里按偏移读 minified 组件源码，取证行为与样式。
> 所有「0 命中」均为原始字节级 `grep -a -c -o` 或全键表 grep 复现，命令附于各条。
> 结论计数：**升级为有参照 3 条（条目 1/2/3），确认无参照 2 条（条目 4/5）**。

---

## 条目 1 · locales.ts:23-42 任务建议四分类（home.explore/build/review/fix 及 8 条 task/prompt）

**原判**：ZCode 新建页只有六档时段问候语+项目选择，无建议卡表面；四分类关键词全 0 命中，跳过。

**搜索过的模式**：
- 中文短语原始字节 grep（全部 0）：`探索并理解` `构建新功能` `审查代码` `修复问题` `了解项目结构` `理解一项功能` `实现一项新功能` `构建一个小工具` `评审当前改动` `检查代码质量` `排查一个问题` `修复失败的测试`
  命令：`grep -a -c -o '探索并理解' app.asar` → 0（其余同法，均 0）
- 英文短语原始字节 grep（全部 0）：`Explore and understand` `Build features, apps, or tools` `Review current changes` `Fix failing tests` `Start a task`
- i18n 键模式：`home.explore/build/review/fix`、`suggest|recommend|inspir|idea|template|example|starter|prompt\.`、`chat.*task|quick|action`
- 键组全量清点：`chat.empty.*`（29 键，仅问候语/项目选择/新建工作区）、`occupationOnboarding.*`（43 键）、`chat.officeSuggestions.*`（7 键）、`chat.draft.*`

**命中原文**（本批最大发现——ZCode **有**建议卡表面）：
- 引导开关：`occupationOnboarding.suggestions` = `开启主动任务推荐`；`occupationOnboarding.suggestionsDescription` = `在新对话中显示任务建议，点击后填入输入框。`
- 建议卡标题（list 布局）：`occupationOnboarding.suggestionsHeading` = `试试这些任务`（en: `Suggested tasks`）；刷新：`chat.officeSuggestions.refresh` = `换一批`（en: `Show more`）；关闭走确认弹窗：`chat.officeSuggestions.closeTitle/closeDescription` + `common.cancel/common.confirm`
- 模式限定：`chat.officeSuggestions.settingDescription` = `仅在办公模式下支持。`（ZCode 主动建议绑定办公模式）；办公模式问候语 `chat.empty.greeting.office` = `今天有什么工作，交给我吧`
- 组件源码（app.asar@329892649，函数 `t$t`）：`{className,layout=\`chips\`,items,onSelect,disabled,onRefresh,onClose,refreshDisabled,pluginActionPopover}`；list 布局 `data-v4-draft-suggested-prompts` + 标题行 + ul 列表（图标+双语 label，`rounded-xl hover:bg-hover`）；chips 布局为横向滚动条带，按钮 `variant:outline size:lg` + `zcode-draft-prompt-waterfall` 级联入场动画 `--zcode-draft-prompt-waterfall-delay:${t*65}ms`（每项延迟 65ms）
- 数据源（@329889681，`ZQt`）：取 `clientScenesService` 返回的 `scene===\`draft-suggestion\`` 的 `options.prompts.items`，item 结构 `{id, iconName?, label:{cn,en}, prompt:{cn,en}, actions?(on_finish 解析，含 NAVIGATE:AUTOMATIONS), plugin?}`；请求失败日志 `[v4-suggested-prompts] Client scenes 返回失败，推荐列表保持为空`
- ZCode 自带静态建议对（i18n 有键、JS 无字面引用，疑服务端按 id 动态解析或遗留）：`chat.draft.suggestedPrompt.recentCommits` = `检查近 7 天的 commit` + `.prompt` = `检查当前工作区近 7 天的 Git commit，概括主要改动并指出潜在风险。`；`chat.draft.suggestedPrompt.createPdf` = `制作一份 PDF` + `.prompt` = `根据当前工作区内容制作一份 PDF 文档。`
- 标签本地化器（@329890052，`_Y`）：`t.startsWith(\`zh\`)?e.cn:e.en` 回退另一语言——ZCode 建议文案原生按 {cn,en} 双对象存储

**最终判定**：**升级为有参照**。建议卡表面（新建页）、结构（短标题+完整 prompt 成对，与插件 `home.*.task1/prompt1` 两键同型）、交互（点击填入/换一批/关闭需确认）全链有 ZCode 例证；此前批次取 `chat.empty.title`=`开始对话` 作 `home.suggestions` 对照实为页面级标题，真正同层键是 `occupationOnboarding.suggestionsHeading`=`试试这些任务`（en `Suggested tasks`）。仍无参照的只剩**四分类学本身**（探索/构建/审查/修复 ×2）：ZCode 建议内容为服务端按职业下发且限办公模式，无本地四分类措辞——该部分维持「不得猜」，措辞属插件自创。

---

## 条目 2 · new-conversation-draft.ts:35-42 prefillNewConversation 守卫链（phase≠plain→busy、草稿/附件/@提及不覆盖）

**原判**：ZCode 无同型表面可触发同型行为，minified bundle 亦无法定位对应实现；跳过。

**搜索过的模式**：
- 直搜守卫字段：`occurrences`、`attachmentIds`、`phase:\`plain\``、`draftHistory|inputHistory|composerHistory`（均未找到同型守卫，见条目 5b）
- 改为**沿行为链定位**：`data-v4-draft-suggested-prompts` → 组件 `t$t` 的 `onSelect` → 调用方 `ne` 回调 → `R` → `requestComposerTextInsert` → composer 消费端 → `mQt`

**命中原文**：
- onSelect（@329919771 附近，`ne`）：`let i=_Y(e.label,l),c=_Y(e.prompt,l)`；无插件前置时直接 `R(c,t)`（c=完整 prompt 文本）；守卫仅有：请求序号防陈旧 `S.current`、工作区快照比对 `dq(n,r)`、插件操作忙态 `disabled:w||v`
- store 命令（@333085292）：`requestComposerTextInsert:(t,n,r,i,a)=>{...composerTextInsertRequest:{requestId:t,text:n,...i?{mention:i}:{},...a?{mode:a}:{}}}`（带 mention 与 mode=`prepend-if-missing` 两种变体）
- 消费端挂载门控（@330977535）：`externalTextInsertRequest:g&&t===null?Kn:null` —— **只在新建草稿面（无 sessionId）挂载**，已开会话不接收建议填充
- 应用函数（@329601657 effect → `mQt` 定义）：
  `function mQt({appliedRequestId,inputApi,request,requestFocus,scheduleDraftPersist,updateText}){return!n||n.requestId===e||!t?e:…t.setText(n.text),a(n.text),i(),r(),n.requestId}` —— **无 phase/草稿非空/附件/@提及检查**，仅 requestId 去重，命中即 setText+持久化+聚焦
- 对照：草稿**恢复**请求 `hQt` 反而有内容守卫——`a.sessionId!==t||a.workspaceKey!==n||r||…`（r=hasDraftContent，草稿非空即跳过恢复）；即 ZCode 的「不覆盖草稿」守卫存在于恢复链路，不在建议填充链路

**最终判定**：**升级为有参照**。同型行为链已完整定位：建议点击 → `requestComposerTextInsert` → composer `mQt` 应用（setText+focus+persist）。结论修正为：ZCode **没有**内容型守卫链，它用「只在草稿面挂载 + requestId 去重」做结构化门控；插件的 `phase≠plain→busy`、草稿/附件/提及不覆盖是插件自加强化（因插件经 `setDraft` 整体替换而非编辑器 API 插入）。设计语言归档时应记为「插件刻意偏离：ZCode 靠挂载面收窄，插件靠内容守卫」。

---

## 条目 3 · sidebar-session.ts:2-10 beginSidebarSession 先切 tasks 页签再建会话

**原判**：ZCode 侧栏无页签结构（sidebar.* 55 键无 tabs/channels/schedule 页签），页签树为插件自有扩展；跳过。

**搜索过的模式**：
- `sidebar.*` 全键（本批实测 59 键：profile/menu/exportLogs/newTask/usage/plan/settings，确无页签键）；`workspaceSidebar.*` 37 键（organize:分组/项目、sort、remote 连接，无页签键）；`sidePane.*`（右侧面板组）
- 页签体系：`kind===\`…\`` 枚举（含 `workspace`、`settings`、`automations` 等）、`tabs.find(e=>e.kind===\`workspace\`…)`
- 「新建任务」行为：`id:\`sidebar.newTask\`` JS 引用（@331026580，`Ubn` 顶栏组件，`onCreateTask` prop）→ `\.startDraft\(` 全部 4 处调用点

**命中原文**：
- 新建前置视图归位（@332251839，按项目新建任务回调）：
  `$t(e,a?{workspaceIdentity:a}:void 0)||Qt(e,s)`（打开或激活工作区页签）→ `JI.getState().deactivateActiveGroup()`（退出分组态）→ `u4.getState().resetToPrimaryPane()`（重置主面板）→ `i.startDraft(e,o,a,{createSource:r??\`project\`})`
- `resetToPrimaryPane` 定义存在（u4 pane 树 store，`--v4-split-` 分栏体系）；composer 侧同样用 `e.tabs.find(e=>e.kind===\`workspace\`&&…)` 证实 ZCode 有工作区页签体系
- 另一处（@332942900）：启动恢复时对每个工作区补建草稿 `startDraft(...)` 并记日志 `[Root] 已恢复新建草稿归属`

**最终判定**：**升级为有参照（行为层）**。「先切视图、再建会话」的模式在 ZCode 有同型实现：新建前显式做「激活工作区页签 + 退出分组 + 重置主面板」，然后才 `startDraft`——插件 `beginSidebarSession` 的 `setTab('tasks')` + `startSession()` 与之同构，可作为行为合法性例证（先归位再建，避免残留在频道/日程视图）。**页签树本身（任务/频道/定时）维持原判**：ZCode 侧栏无此结构（sidebar.* 59 键复现确认），仍是插件自有扩展。

---

## 条目 4 · locales.ts:110-112 search.hintMove/hintOpen/hintClose（⌘K 面板底部键提示）

**原判**：taskSearch.* 全 9 键无 hint 键，03i 第二批 E 组亦未采集面板底部；跳过。

**搜索过的模式**：
- 键组全量：`taskSearch.*`（9 键，无 hint）、`quickPick.*`（57 键，无 hint）、`commandCenter.*`（20 键，无 hint）
- i18n 值内键帽字符：`↑|↓|⏎|↵|⌘|Esc|esc|Enter|Tab`（`esc` 命中均为 "D­escription" 子串误报，排除）
- JS 层：`jsx(\`kbd\`` → 0；`\bKbd\b` → 0；`data-v4-command*` → 0；`command-center-footer` → 0
- 字节级兜底：`↑↓` 10 命中全在字符集/编码表（Lexical 字符类、CP437 表）；`↑`/`↵` 命中为 HTML 实体表与 JSON 序列化替换符；`⏎` 3 命中为真实 UI

**命中原文**：
- ZCode ⌘K 面板 = `commandCenter`（`iit` 弹窗 + CommandMenu）：placeholder `commandCenter.placeholder`=`搜索操作、任务或文件`，范围页签（全部/操作/任务/文件），分组列表（最近变更/最近任务/快捷入口/任务/文件），底部唯一附加块是**搜索历史**（`commandCenter.history`=`搜索历史`、clearHistory/expandHistory/collapseHistory）——**无键提示条**（@328080297 全 JSX 已读）
- 相邻参照 ①：内联键帽——确认按钮尾部 60% 前景小字 `⏎`：`(0,$.jsx)(\`span\`,{className:\`text-ui-base text-primary-foreground/60\`,children:\`⏎\`})`（git 操作菜单 @329985201、通用确认弹窗 @332747891，按钮 `justify-between` 左文案右键帽）
- 相邻参照 ②：`settings.shortcuts.recordingHint` = `Esc 取消 · Backspace 恢复默认 · 冲突后直接重按新组合`（全库唯一键帽式提示句，位于设置快捷键录制区）

**最终判定**：**确认无参照（absent）**——面板底部键提示条这一表面在 ZCode ⌘K（commandCenter）中不存在，`search.hintMove/hintOpen/hintClose` 为插件自有增强；03i 若补采 E 组可据此直接登记「无 ZCode 键」。相邻参照建议入档：ZCode 的键盘可视暗示用「按钮尾部内联 ⏎（60% 前景）」与「设置内键帽句式提示」，不用底部提示条。

---

## 条目 5 · locales.ts:53 settings.search、:67 input.historyHint、:174 sessions.renameDescription、:291-293 time.weeks/months/years

**原判**：asar 对「搜索设置/翻历史/保持简短」均 0 命中，taskList 时间键仅 4 档；跳过。

**搜索过的模式与逐键结果**：

1. **settings.search =「搜索设置…」**
   - `grep -c '搜索设置'`（i18n 全表）→ 0；`settings.*search|filter` 键清点；`settingsSearch|settingsNavFilter|settings-search` JS 搜索
   - 命中：ZCode **无**设置导航全局搜索；但设置内各页有统一的每页搜索框组件 `NN`（data-testid `plugin-settings-search` 等，@331370015），清空按钮文案 `settings.search.clear` = `清空搜索`，各页 placeholder：`settings.plugin.plugins.searchPlaceholder`、`settings.subagents.searchPlaceholder`、`settings.hooks.searchPlaceholder`、`settings.memory.viewer.searchPlaceholder`、`settings.shortcuts.searchPlaceholder`=`搜索快捷键`
   - 判定：无直接参照；相邻参照=「每页级搜索框 + 清空搜索」体系（插件的是导航级筛选，ZCode 是页内条目搜索，层级不同）
2. **input.historyHint =「↑↓ 翻历史」**
   - `grep -c '翻历史'` → 0；`draftHistory|inputHistory|composerHistory|draft.history` → 0；`historyIndex|historyCursor|historyStack|sentMessages` → 0
   - 行为层命中：ZCode 输入组件 `LGt`（LexicalChatInput，@329350704）有 `promptHistory:y=[]` prop，遥测打点 `hasPromptHistory:y.length>0`；prop 链 LGt→包装层→远程会话输入传入（@329363185、@329365721、@329621369 共 4 处）；但召回交互与任何提示文案均未在 bundle 中定位（无 i18n 键、无可辨识内部命名）
   - 判定：**无文案参照**（确认）；行为层存在 promptHistory 管线但实现细节不可见——「↑↓ 翻历史」提示语为插件自有文案，归档时按「无 ZCode 键」登记
3. **sessions.renameDescription =「保持简短且易于识别」**
   - `grep -c '保持简短'` → 0；`rename` 全键清点
   - 命中：ZCode 重命名入口一律 placeholder 式：`taskList.renamePlaceholder`=`任务名称`、`v4Pane.renamePlaceholder`=`重命名会话…`、`v4Pane.renameSession`=`重命名会话`；带描述句的仅设备重命名 `remote.renameDeviceHint`=`首次连接建议改个好记的名字，随时可在 设置 · 远程设备 修改`
   - 判定：无直接参照；ZCode 重命名无描述行，插件加描述行为自有设计（若要对齐 ZCode 体例应去掉描述行，属裁决项非参照）
4. **time.weeks/months/years =「{count}周/{count}个月/{count}年」**
   - 键模式 `weeksAgo|monthsAgo|yearsAgo|\.weeks|\.months|\.years|relative`；值模式 `` `{count}周` ``、`周前`、`个月前`、`年前`
   - 命中：`taskList.*` 时间键确实仅 4 档：`taskList.justNow`=`刚刚`、`minutesAgo`=`{minutes}分`、`hoursAgo`=`{hours}小时`、`daysAgo`=`{days}天`；另发现第二族 `common.*`：`common.justNow`=`刚刚`、`common.minutesAgo`=`{count} 分钟前`、`common.hoursAgo`=`{count} 小时前`、**`common.yesterday`=`昨天`**（带「前」缀、含昨天档）；周/月/年档全库无键无值
   - 判定：**无参照（确认）**；相邻发现：ZCode 存在两套时间措辞族（taskList 紧凑无「前」/ common 带「前」+昨天档），插件若超过 4 档需自行延长（现 weeks/months/years 即插件自延），可考虑裁决是否补 `昨天` 档

**最终判定**：**确认无参照（absent）**——四个子键均无 ZCode 直接对应文案；但登记三处相邻参照：①每页搜索框+`清空搜索`、②`promptHistory` 管线（无文案）、③common 族时间措辞与 `昨天` 档。

---

## 附：本批实际执行的关键命令

```
# 全量 i18n 抽取（7721 键 → /tmp/zcode_i18n_full.tsv）
python3 - <<'EOF'  # 正则 rb'"([A-Za-z0-9_.\-]+)":`([^`]*)`' 分块扫 341MB
EOF

# 键组/短语检索（示例）
grep '^occupationOnboarding\.' /tmp/zcode_i18n_full.tsv
grep -a -c -o '探索并理解' /Applications/ZCode.app/Contents/Resources/app.asar   # → 0
grep -a -c -o -F 'Explore and understand' /Applications/ZCode.app/Contents/Resources/app.asar  # → 0

# 原始字节定位组件源码（python re.finditer + data[off-600:off+3200]）
# 关键偏移：329892649 t$t 建议卡组件 / 329889681 ZQt scenes 映射 / 329890052 _Y 双语器
# 333085292 requestComposerTextInsert / 329601657 mQt 应用 / 332251839 startDraft 视图归位
# 328080297 commandCenter 面板 / 332747891 内联键帽 ⏎ / 329350704 LexicalChatInput promptHistory
```
