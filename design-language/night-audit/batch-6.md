# 批次 6 · index.ts / session-navigation-shortcuts.ts / workspace-compat.ts / workspace-hover-card.tsx / settings-focus.ts

> 审计方式：五模块均为**接线/行为层**（index.ts 注册面、workspace-compat 服务探测、settings-focus 焦点判定、
> session-navigation-shortcuts 键盘命令、workspace-hover-card 悬停卡结构），颜色/圆角/间距类数值不在其内
> （`.dcu-wb-tip` 的盒模型样式在 CodexWorkspaceBrowser.tsx:286，不属本批）。
> 决策点集中在：启动接线、动效暂停接线、命令文案与键位、悬停卡图标与文案。
> ZCode 参照全部取自 app.asar（341MB）提取 + 设计语言文档已录实测；**本批未做活宿主 CDP 实测**。
> 提取命令：环境 `grep` 为 ugrep，带上下文的模式报「exceeds complexity limits」，
> 故改用 python 对 asar 单遍扫描（等价 `grep -a -o`，附命中字节偏移可复核），键值类短模式 ugrep 直出可复现：
>
> ```
> grep -a -o -m 1 '"quickPick.command.previousConversation":`[^`]*`' /Applications/ZCode.app/Contents/Resources/app.asar
> # → "quickPick.command.previousConversation":`上一个任务`
> ```
>
> 关键 asar 命中：@310357411/@310471193（上一/下一个任务 i18n）、@325562966（previousConversation/nextConversation
> defaultBindings）、@310308165（project.pin/unpin）、@310307054（project.edit）、@332987332（data-document-hidden JS）、
> @326226533（data-document-hidden CSS）、@77008738 起（Radix react-hover-card 整包）。
> 文档旁证：03p-startup（启动）、02-motion（动效/图标描边）、03c-conversation（骨架三件/气泡折叠）、
> 03d-composer（输入区）、01-design-tokens（令牌层）、03f-settings（设置页）、03b-sidebar（侧栏）。
> 04-open-gaps.md 仅按需 grep：`加号`/`hover 卡`/`document-hidden` 均 0 命中（无既裁记录）；`virtual-skip` 仅 :507 门禁漏记一处。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| session-navigation-shortcuts.ts | 上一/下一个会话命令文案（locales.ts:157-158，消费于 :84 label） | `sessions.previous`=「上一个会话」、`sessions.next`=「下一个会话」 | `quickPick.command.previousConversation`=`上一个任务`、`nextConversation`=`下一个任务`；`settings.shortcuts.command.*` 两键同值 | asar@310357411、@310471193（grep 复现命令见头部）；locales.ts:157-158 | 随 batch-4「会话→任务」术语系一并裁决统一为「任务」 |
| workspace-hover-card.tsx | 悬停卡置顶钮 aria-label（workspace-hover-card.tsx:36，locales.ts:138） | `workspace.pin`=「置顶项目」 | `project.pin`=`置顶`（项目行菜单用词，无宾语；任务行另有 `taskList.pin`=`置顶任务` 一套） | asar@310308165 `"project.pin":\`置顶\``；locales.ts:138 | 改「置顶」与 `project.pin` 同词（unpin 已同词，见一致项） |
| workspace-hover-card.tsx | 悬停卡「编辑」钮文案（workspace-hover-card.tsx:41，locales.ts:152） | `workspace.edit`=「重命名项目」 | `project.edit`=`编辑项目`（ZCode 项目行更名入口叫「编辑」，无「重命名」项） | asar@310307054 `"project.edit":\`编辑项目\``；locales.ts:152；batch-4 差异表第 6 行同族（`workspace.rename`） | 与 batch-4 同一裁决：改「编辑项目」或声明刻意偏离 |

## 一致项（回归加固建议）

| 模块 | 点 | 期望取值（两侧同值） | 证据来源 |
|---|---|---|---|
| index.ts | 启动画面首位导入、模块顶层注入（index.ts:1-2） | `import './startup-splash.ts'` 必须保持第一个导入；遮罩抢在宿主首帧之前 | 03p-startup.md（ZCode asar 内嵌启动页原文：`#loading` z-index 2147483647、就绪 0.16s 淡出、3s 硬上限） |
| index.ts | 文档隐藏停动效与 ZCode 逐字同构（index.ts:178 → document-hidden-motion-pause.ts:32,43-58） | 属性名 `data-document-hidden`、挂 `documentElement`、`visibilityState==='hidden'` 置位、visibilitychange 驱动、卸载移除属性 | asar@332987332 `L1n=\`data-document-hidden\`;…toggleAttribute(L1n,e.visibilityState===\`hidden\`)…visibilitychange`；asar@326226533 `html[data-document-hidden] *,:before,:after{transition:none!important;animation:none!important}` |
| index.ts | 用户气泡折叠接线（index.ts:203-204 注释锁定三要素） | 折叠 120px + 展开钮 + 底部渐隐 | 03c-conversation.md C2-1/C2-3（asar O4t + 9224 CDP 实测：max-height 120px、mask linear-gradient 渐隐） |
| index.ts | 会话区骨架三件接线（index.ts:201-202） | C1 列宽两档 `min(848px,100%)`/`min(1104px,100%)`、C2 轮组间距 20px、C3 正文 14px/24.5px | 03c-conversation.md A1/A2/B1 + §E 两档响应式（2026-10-29 commit `4ebc38e`） |
| index.ts | 皮肤/主题样式挂应用级令牌层，不挂组件（index.ts:162-168） | installSkin/installThemeStyle/syncZCodeTheme 走 `ctx.effect` 应用级；ZCode 同为 `<html>` 主题类 + `:root` 变量 | 01-design-tokens.md §主题机制（主题类挂 `<html>`，172/231 变量随主题翻转；index.ts:165-166 注释自述同理由） |
| session-navigation-shortcuts.ts | 桌面键位（session-navigation-shortcuts.ts:64-66） | 三平台 `modifiers:['primary','shift']` + `code:'BracketLeft'/'BracketRight'` = ZCode `CmdOrCtrl+Shift+[` / `CmdOrCtrl+Shift+]` | asar@325562966 `{id:\`previousConversation\`,channel:\`window\`,defaultBindings:[\`CmdOrCtrl+Shift+[\`]},{id:\`nextConversation\`,…[\`CmdOrCtrl+Shift+\]`\]}` |
| session-navigation-shortcuts.ts | 命令注册进统一 catalog、改键/提示由宿主负责（session-navigation-shortcuts.ts:5-8,80-98） | previousConversation/nextConversation 应出现在快捷键设置清单（ZCode 快捷键设置页有同两条命令条目） | asar@310471193 `settings.shortcuts.command.previousConversation`=`上一个任务`、`…nextConversation`=`下一个任务` |
| workspace-hover-card.tsx | 取消置顶 aria（workspace-hover-card.tsx:36，locales.ts:139） | `workspace.unpin`=「取消置顶」 = `project.unpin`=`取消置顶` | asar@310308165 `"project.unpin":\`取消置顶\`` |

## 无参照项（不得猜）

- index.ts:169-170 composer visuals 两点（加号圆底仅 hover/focus 出现、「回到底部」居中，实现见 composer-visuals.ts）—— asar「回到底部」0 命中、`scrollToBottom` 35 处全为 xterm 终端库；03d-composer.md 无这两条记录；composer-visuals.ts 头注声称「与 ZCode 对齐」但无出处 → 无 ZCode 例证，标注未验证，跳过。
- index.ts:171-174 virtual-skip 默认关、index.ts:442-454 `?session=` deep link、index.ts:456-463 设置分区 order（connectors 17 / about `MAX_SAFE_INTEGER`）—— asar `searchParams.get` 64 处均为 RUM/agentconfig 语境、`settings.about`/`settings.section` 0 命中 → 均为 DSH 宿主适配/扩展面，无 ZCode 例证，跳过。
- session-navigation-shortcuts.ts:67-71 web 档 `primary+alt` 补偿、:87-91 `regions/modals` 模型与 :94 边界文案（locales.ts:159「没有可切换的会话。」）—— asar 绑定表仅有 `channel:'window'` 的桌面档、无 web 条目；ZCode 用 channel 模型，无 regions/modals 概念；边界文案无对应键 → 跳过。
- workspace-hover-card.tsx 悬停卡内容与描边（:31,39,40,41 Folder/Branch/Settings 16px 未传 strokeWidth=Lucide 默认 2，:38 Channels 16px+strokeWidth 1.5 显式；:26-28 任务数/未读摘要，locales.ts:151「{count} 个任务 · {unreadCount} 条未读」；:33-35 会话行去时长/路径）—— ZCode 侧栏悬停卡无采样；asar「条未读」「unreadCount」均 0 命中；可证描边锚点互斥（侧栏 spinner=16px/stroke 2，见 CodexWorkspaceBrowser.tsx:304-309 引 ZCode 3.15.1 spinner.tsx 原文；会话操作行=14×14/stroke 1.5，见 02-motion.md:370 CDP 实测），同卡 1.5/2 混用无 ZCode 依据可裁决 → 跳过，建议另行内部统一。
- workspace-compat.ts:16-62（has* 服务探测、recentWorkspaceId 平局保 Host 顺序、workspaceBaselinesReady 双 store phase）与 settings-focus.ts:2-13（浮层 role 枚举 dialog/alertdialog/menu/listbox、inert/hidden/aria-hidden/visibility 可交互判定）—— 纯 DSH 宿主适配与自建焦点管理；ZCode 焦点陷阱由 Radix Dialog 内建（asar 有该库，无等价的宿主浮层枚举实现可对照）→ 跳过。
