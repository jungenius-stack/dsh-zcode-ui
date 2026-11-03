# 批次 18 · session-tree.tsx / scroll-anim.ts / session-row-actions.tsx / channel-api.ts / DeveloperToolsRow.tsx / schedule-group-actions.ts / draft-attachments.ts

> 参照文档：`02-motion.md`、`03b-sidebar.md`、`03f-settings.md`、`03j-dialog.md`；已裁决偏离查 `uiplug/docs/KNOWN-ISSUES.md` §15/§20/§29。
> asar 提取命令均为 `grep -a -o <模式> /Applications/ZCode.app/Contents/Resources/app.asar`，下表「证据来源」直接给出模式与命中串。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| DeveloperToolsRow.tsx（样式在 settings-page-styles.ts） | 开关滑块（thumb）尺寸 | 16×16（`settings-page-styles.ts:128` `width:16px;height:16px`） | **14px**（size-3.5） | asar：`grep -a -o '.\{500\}hover:ring-border-hover...'` 提到完整开关组件 `Lln`，thumb 串为 `` absolute inline-block size-3.5 rounded-full shadow transition-all duration-200 `` | thumb 16→14px；行程 `translateX(16px)` 相应改 18px（轨 36 − 内衬 4 − thumb 14），同步既有断言 |
| DeveloperToolsRow.tsx（样式在 settings-page-styles.ts） | 开关滑块过渡 | `transition:transform var(--dcu-motion-feedback-duration) ease` = 150ms / 仅 transform / 浏览器默认 ease（`settings-page-styles.ts:128` + `zcode-theme.ts:131` `--dcu-motion-feedback-duration:150ms`） | `transition-all duration-200` = 200ms / 全部属性 / Tailwind 默认曲线 cubic-bezier(.4,0,.2,1) | 同上 asar `Lln` thumb 串 | 滑块过渡改 200ms（这是该组件的专属值，勿改全局 150ms 微交互档） |
| channel-api.ts | 错误文案硬编码中文、绕过 i18n | `'频道会话数据格式无效'`（:73）、`'无法读取频道会话'`（:76,77）字面量，最终被嵌进 `t('sessions.failed',{message})` 展示 | 全部 UI 文案走 formatMessage + locale 表（asar 内所有字符串均为 `"key":\`文案\`` 形态，无硬编码界面文案） | asar：`grep -a -o '[a-zA-Z.]*[Ff]inder[a-zA-Z.]*'` 等命中 locale 表结构；channel-api.ts 源码 73/76/77 行 | 错误文案改走 NS 错误键（同 `user-error.ts` 的键映射模式），或登记豁免理由 |
| session-row-actions.tsx | 重命名输入无占位符 | `<input className="dcu-wb-rename-input" aria-label={...}>`（:108），无 placeholder | 重命名输入带占位符「任务名称」 | asar：`grep -a -o 'taskList\.[a-zA-Z.]*'` 命中 `taskList.renamePlaceholder`；locale 表 `` "taskList.renamePlaceholder":`任务名称` `` | rename input 补 placeholder（对齐 ZCode 字段标注手法）；注意 ZCode 重命名是行内输入形态、本仓是模态，改前先确认不与模态 description 语义重复 |
| session-tree.tsx | 运行中转圈颜色（**已裁决偏离，勿修**） | `.dcu-wb-running svg{color:var(--dcu-sidebar-tertiary)}`（CodexWorkspaceBrowser.tsx:317，#686868） | `text-foreground-subtle`（60% 前景） | asar：`grep -a -o 'size-3\.5[^"]{0,100}'` 命中 `` size-3.5 animate-spin text-foreground-subtle ``；裁决记录 `KNOWN-ISSUES.md` §15.1（ZCode 原档对比度 2.32:1 不过 AA，映射为 AA 达标同档） | 维持（AA 裁决，§15.1 已登记） |
| session-tree.tsx | 运行中/未读状态槽位置（**已裁决偏离，勿修**） | 行首 16×20 槽（CodexWorkspaceBrowser.tsx:316 `left:var(--dcu-wb-slot-left)`） | 右侧元信息区（标题后、时间前，与未读同泳道） | `session-tree.tsx:169-172` 注释引 ZCode `workspace-grouped-tasks/task-row.tsx:246`；裁决记录 `KNOWN-ISSUES.md` §29.6 第 2 条 | 维持（§29.6 已登记：挪动牵连 6 条断言与悬停接管） |

## 已对齐项（建议写成源码文本断言加固）

| 模块 | 点 | 期望值（源码文本） | 证据来源 |
|---|---|---|---|
| session-tree.tsx | 运行中转圈尺寸 + 自转动画 | `<ZIconLoading size={14}`（:174）；`.dcu-spin{animation:dcu-spin 1s linear infinite}`（zcode-theme.ts:185） | asar `` size-3.5 animate-spin text-foreground-subtle ``（=14px）；`KNOWN-ISSUES.md` §15.1 实测 ZCode bundle CSS `--animate-spin: spin 1s linear infinite` |
| session-tree.tsx | 行内/菜单图标 16px、描边 1.5 | `size={16}` `strokeWidth={1.5}`（:25,29,77 等） | `uiplug/docs/ZCODE-DESIGN.md:163,181`（上游源码规格「图标基线 size-4（16px）」）；`03b-sidebar.md` §5「左槽 16×16」 |
| session-tree.tsx | 行首状态槽体系：优先级互斥渲染（待处理＞未读＞运行中）+ 未读点直径 6px | `SessionState` 的 if 链顺序（:162-175）；`.dcu-wb-unread{...width:6px;height:6px...}`（CodexWorkspaceBrowser.tsx:287） | `KNOWN-ISSUES.md` §15（:885-886）「ZCode `h-1.5` 同径」「优先级（互斥渲染，同刻只出一个）——与 ZCode 一致」；asar `grep -a -o 'h-1\.5 w-1\.5[^"`]{0,80}'` 命中 `` h-1.5 w-1.5 rounded-full `` |
| scroll-anim.ts | 缓动曲线 17 点查表值 | `CHROME_SMOOTH_CURVE = [0,0.011,0.061,0.204,0.471,0.652,0.761,0.834,0.885,0.923,0.950,0.970,0.984,0.993,0.998,1,1]`（:66-69） | `02-motion.md` §2 逐值相同的实测表（曲线采样自 ZCode 容器 Chrome 原生 smooth）。注：02-motion 称「21 点」但表列 17 值，模块与表值一致，文档措辞待修 |
| scroll-anim.ts | reduced-motion 瞬跳在 JS 入口分支 | `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scroller.scrollTop = to; ... }`（:97-101） | `02-motion.md` §2/§4；asar：`grep -a -o "behavior:\`auto\`[^;]{0,40}\|?\`auto\`:\`smooth\`"` 命中 `` ?`auto`:`smooth` `` |
| scroll-anim.ts | 互扰让位阈值 2px（入口基线 + 逐帧双检） | `Math.abs(scroller.scrollTop - jumpBase) > 2`（:146）与 `Math.abs(scroller.scrollTop - expected) > 2`（:163） | `02-motion.md` 互扰防护节「差超过 2px 即判定被别人接管，立即让位」 |
| scroll-anim.ts | 瞬移+尾段与时长分档参数 | `SCROLL_MIN_MS=320`、`SCROLL_MAX_MS=2200`、`SCROLL_PX_PER_MS=3.2`（:27-29）、`SLIDE_TAIL_RATIO=0.6`（:47）、`INSTANT_JUMP_MIN=1200`（:49） | `02-motion.md` §2「DSH 当前 320~2200ms、3.2px/ms」、§3「瞬移到目标前 0.6 屏」、§已实施代码块「>1200px 才瞬移」 |
| DeveloperToolsRow.tsx（样式在 settings-page-styles.ts） | 开关轨 36×20 胶囊 + role=switch | `width:36px;height:20px;border-radius:999px`（settings-page-styles.ts:124）；`role="switch" aria-checked`（DeveloperToolsRow.tsx:38-40） | asar `Lln` 开关组件：轨 `` h-5 w-9 ``（=36×20）+ `rounded-full` + `role:`switch`,"aria-checked"`。⚠ 顺带发现 `03f-settings.md` §2.3 记录「r8」与当前代码 999px 不符，文档记录已过时 |
| session-row-actions.tsx（样式在 CodexWorkspaceBrowser.tsx） | 模态输入框 36 高 / r8 / 14px、底部按钮右对齐 | `.dcu-wb-rename-input{...height:36px;border-radius:var(--dsw-radius-lg)...font:14px/20px...}`（:299）；`.dcu-wb-rename-actions{display:flex;justify-content:flex-end;gap:8px}`（:295） | `03j-dialog.md` A5 复测记录（2026-10-28 活体）：「输入/下拉 36 高 radius 8」「底部按钮右对齐」 |
| session-tree.tsx | 行内归档两步确认 + 确认钮红底 | `dcu-wb-confirm{background:var(--dcu-state-error-fill)...}`（CodexWorkspaceBrowser.tsx:284）；press 两次语义（archive-confirm.ts:30-38） | `archive-confirm.ts:5-11` 引 ZCode `TaskListItem.tsx`（3.15.1 源码）：「普通归档按钮换成 destructive 的确认按钮；Escape/条目外 pointerdown 取消；二次点击才执行」 |

## 无参照项（不得猜）

- SessionHoverCard 内容裁剪（只留标题+分支，去时间/项目）——`session-tree.tsx:52-54` 自述由 DSH 实测反馈驱动；ZCode 任务行悬停卡内容未采集，无例证
- ZCode 任务菜单条目**顺序**（sessionMenuItems 注释声称对齐 TaskActionMenuContent 的排序）——组件名在 asar 已压缩，`grep -a -o 'TaskActionMenuContent...'` 零命中，顺序无从取证；文案词汇侧已证（`taskList.pin/rename/archive/markAsUnread`、`appHeader.openInFinder`=「在 Finder 中打开」均命中）
- 树行键盘语义（role=treeitem、Enter/空格打开、roving tabindex）与 `pointerMenuRect` 贴指针开菜单——ZCode 侧行为未提取
- 行内 quick-more 按钮几何（20×20、图标 16）——`03b-sidebar.md` §4「未覆盖」明确置顶区/行内操作未采集，无 ZCode 例证
- schedule-group-actions.ts / draft-attachments.ts —— 纯数据/逻辑模块（逐项容错归档、附件草稿判定），无颜色/间距/动效/文案类设计决策点，无可对账项
