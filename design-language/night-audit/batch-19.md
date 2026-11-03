# 批次 19 · tree-keyboard.ts / pinned-workspaces.ts / zcode-icons.tsx / WorkspaceShortcutBridge.tsx / composer-visuals.ts / conversation-dom.ts

> 2026-10-30 夜间审计（批次 19，只读，不改 src/tests/既有文档）。
> 参照文档：`02-motion.md`（微交互档、animate-spin）、`03b-sidebar.md`（任务行/loader/置顶区）、`03c-conversation.md` + `03c-conversation-dsh-side.md`（会话区覆盖清单）、`03d-composer.md` + `03d-composer-zcode-spec.json`（加号/采样缺口）、`03j-dialog.md`（模态定案）、`08-performance-audit.md`（观察器纪律）；`04-open-gaps.md` 仅关键词 grep（`yhfFVG_add` :496、`toBottom` :1975），另核 `uiplug/docs/ZCODE-DESIGN.md`（模块注释 `zcode-icons.tsx:2` 自引的「DESIGN.md」即此文件）。
> 本批 asar 提取命令（本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o -- "--animate-spin:[^;\"']*" $A | sort | uniq -c` → **`--animate-spin:spin 1s linear infinite` ×1**；`grep -a -o ".animate-spin{[^}]*}" $A` → `.animate-spin{animation:var(--animate-spin)}`
> - `grep -a -o '.\{100\}animate-spin.\{100\}' $A | head -12` → 任务行 running spinner：`oe=p.running?jsx(Gs,{className:\`size-4 animate-spin text-foreground-subtle\`,"aria-hidden":\`true\`})`（另一处 `size-6` 容器内同款）
> - `grep -a -o 'text-foreground-subtlest[^`]\{0,60\}animate-spin\|animate-spin[^`]\{0,60\}text-foreground-subtlest' $A` → **仅 2 处**，上下文均为 `size-3`/`size-4` 的 tab / 导航分组 loading 小组件，**不是任务行**
> - `grep -a -o -- "--color-foreground-subtle:[^;}]*" $A | sort | uniq -c` → `#26262699`/`#40404099`/`#d4d4d499`/`#e5e5e599`/`color-mix(…60%)` 各×1；subtlest 同法 → `#26262666`/`#40404066`/`#d4d4d44d`/`#e5e5e54d`/`color-mix(…30%)`（= 60% 档 / 30~40% 档）
> - `grep -a -o '.\{120\}chat.scrollToBottom.\{200\}' $A | head` → ZCode 回到底部按钮 `absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm`（i18n `chat.scrollToBottom`=滚动到底部）——**水平居中**
> - `grep -a -o 'lucide-[a-z-]*' $A | sort | uniq -c | sort -rn | head` → `lucide-react` **5420**、`lucide-stroke` 80、`lucide-filter` 78、`lucide-subtlest-opacity` 22；`lucide-loader*` **0 命中**（那是 DSH 侧类名）
> - `grep -a -o '3427ic\|r700ao\|wj9ykh' $A | sort | uniq -c` → **15/3/3**（与 `zcode-icons.tsx:51` 记录的 LoaderIcon 路径键值一致）
> - `grep -a -c "aria-level" $A` → **18**；`grep -a -o '.\{60\}aria-level.\{80\}' $A | head -8` → 全部是 Playwright trace viewer / ARIA 属性白名单，**与侧栏无关**；`grep -a -o '.\{200\}role:"treeitem".\{600\}' $A | grep -c ArrowDown` → **0**（ZCode treeitem 组件无方向键处理；仅有的两个 tree-item 组件之一是 inline `paddingLeft:r*22+4` 的内部面板树）
> - `grep -a -o '.\{60\}chat\.composer\.actionMenu.\{260\}' $A | head` → i18n `chat.composer.actionMenu`=「添加上下文」（加号钮的 ZCode 同位元素）
> 仓库内核对（本轮实跑 grep）：`zcode-theme.ts:131` `--dcu-motion-feedback-duration:150ms;--dcu-motion-feedback-ease:cubic-bezier(.4,0,.2,1)`；`:185` `.dcu-spin{animation:dcu-spin 1s linear infinite}`、`:203` keyframes、`:225` reduced-motion 停帧；`:278/:334` `--dcu-sidebar-tertiary` 浅 `#404040 75%` / 深 `#d4d4d4 56%`；`session-tree.tsx:174` running `size={14}`；`CodexWorkspaceBrowser.tsx:316` `.dcu-wb-running svg{width:14px;height:14px;color:var(--dcu-sidebar-tertiary)}`；`CodexWorkspaceBrowser.tsx`+`CodexSidebar.tsx` 内 ZIcon 尺寸 tally（`grep -o "ZIcon[A-Za-z]* size={[0-9]*}"`）= **39 处全部 `size={16}`，0 例外**；`zcode-theme.ts.bak-motion-1792978819914:124` 旧档 `120ms`（composer-visuals 回退字面量的出处）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| zcode-icons.tsx | 侧栏运行中 loader（`ZIconLoading` 使用处）图标尺寸 | svg **14×14**（`session-tree.tsx:174` `size={14}`；`CodexWorkspaceBrowser.tsx:316` `.dcu-wb-running svg{width:14px;height:14px}`，容器 16×20） | `size-4` = **16×16** | asar 任务行 `size-4 animate-spin text-foreground-subtle`；`03b-sidebar.md` §5 记录 ZCode 左槽 16×16、DSH「running 同 16×16 ✅」——**该记录与当前代码矛盾**（记录或代码其一漂移） | 使用处对齐 16×16；若有意缩小，登记豁免并修正 03b §5 记录，二选一必做其一 |
| zcode-icons.tsx | 侧栏运行中 loader 颜色档 | `--dcu-sidebar-tertiary`：深 **56%** / 浅 **75%**（`zcode-theme.ts:334,278`） | `text-foreground-subtle` = 前景 **60%**（深色 `#d4d4d499`），双主题恒 60% 档 | asar `--color-foreground-subtle:*99`/`color-mix 60%` + 任务行上下文 `text-foreground-subtle`；`ZCODE-DESIGN.md:181`「次级用 foreground-subtle 色阶」。与 03b 微差③（时间戳 68 vs 60，记录不修）同族，但本条未在登记的微差清单里 | 换 60% 档（或新增令牌），或按微差③同款逻辑补登记「记录不修」+ 升级触发条件 |
| zcode-icons.tsx | `ZIconLoading` 的 ZCode 用法注释（消费方取色依据） | `zcode-icons.tsx:52`「ZCode 侧栏用法是 text-foreground-subtlest」——未限定元素 | 会话行同位的**任务行** loader = `text-foreground-subtle`（60%）；subtlest（30/40%）只出现在 size-3 的 tab/导航分组 loading 等小组件 | asar：`animate-spin text-foreground-subtle` 多处（含任务行 size-4）；`animate-spin text-foreground-subtlest` 仅 2 处（size-3 tab/导航分组 loading）；`--color-foreground-subtlest:#d4d4d44d`。注释写错档位，上两条差异正是消费方按错误规格取值的直接风险 | 注释改为分档写法：任务行 loader=subtle（60%）、小组件 loading=subtlest（30/40%），并指向 `ZCODE-DESIGN.md:181` |
| composer-visuals.ts | 加号过渡的**回退字面量** | `transition:background-color var(--dcu-motion-feedback-duration,120ms) var(--dcu-motion-feedback-ease,ease-out)`（`composer-visuals.ts:23`）——令牌缺失时回退 **120ms** / CSS 关键字 `ease-out`（=cubic-bezier(0,0,.58,1)） | 微交互档 **150ms**（源码 `duration-150 ease-out`，ZCode 的 ease-out=`cubic-bezier(0,0,.2,1)`）；本仓令牌现值即 150ms / `cubic-bezier(.4,0,.2,1)`（`zcode-theme.ts:131`） | `02-motion.md` §1 + 2026-10-29「时长分档」表（微交互 150ms ✓）；`zcode-theme.ts:131`；bak 文件 `zcode-theme.ts.bak-motion-1792978819914:124` 仍为 120ms 旧档——回退字面量是 10-29 改档前的遗留，正常时装载令牌后不生效，主题层缺失/时序竞争时吃到旧档 | 回退字面量改 `150ms` / `cubic-bezier(.4,0,.2,1)`（或去掉回退直接引用令牌），并在断言里锁回退值 |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| zcode-icons.tsx | 全站唯一图标语言 = lucide-react | 所有 `ZIcon*` 均为 `lucide-react` 导出，无宿主图标混入（`zcode-icons.tsx:11-18` 单一 import；注释 :8-9「唯一来源」） | asar `grep -a -o 'lucide-react'` = **5420** 处；LoaderIcon 8 芒路径键值 `3427ic`×15/`r700ao`×3/`wj9ykh`×3 与注释 `zcode-icons.tsx:51` 一致；`ZCODE-DESIGN.md:181`「全站 Lucide」 |
| zcode-icons.tsx | 侧栏导航/操作图标 16px 档 | 侧栏+工作区浏览器 39 处 ZIcon 使用全部 `size={16}`、0 例外（本轮 grep tally：Search 4、Folder 4、More 3、FolderOpen 3、其余 2×11+1×2） | `ZCODE-DESIGN.md:163,181`（图标基线 `size-4`=16px）；asar 任务行图标 `size-4`；`03b-sidebar.md` §5 左槽 16×16。注：`02-motion.md` 的 14×14 是**正文操作行**另一档，与本档（侧栏/外壳/设置）不冲突 |
| zcode-icons.tsx | spinner 旋转动画 = 1s linear infinite 共享基元 | `.dcu-spin{animation:dcu-spin 1s linear infinite}` + `@keyframes dcu-spin{to{transform:rotate(360deg)}}`（`zcode-theme.ts:185,203`）；reduced-motion 停帧 `:225` | asar `--animate-spin:spin 1s linear infinite` 原文 + `.animate-spin{animation:var(--animate-spin)}`；`zcode-icons.tsx:53` |
| composer-visuals.ts | 加号静止态无圆形底 | `button[class*="_add"]:not(:hover):not(:focus-visible){background:transparent}`（`composer-visuals.ts:24-26`） | `03d-composer-zcode-spec.json` buttons[0]「添加上下文」28×28 / radius 8 / **bg transparent**（CDP 实测）；`04-open-gaps.md:496` `yhfFVG_add(28)` 全 8px |
| composer-visuals.ts | 回到底部按钮水平居中 | `justify-content:center; padding-right:0`（`composer-visuals.ts:35-38`） | asar ZCode 回到底部按钮 `absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm`（label `chat.scrollToBottom`，`left-1/2 -translate-x-1/2` 即水平居中）；`03c-conversation-dsh-side.md:128` 记录本模块该行为 |
| WorkspaceShortcutBridge.tsx | 错误模态不自绘样式 | 复用宿主 `@deepseek-ai/dsh-client-ui-primitives` 的 `Modal`/`Button`，插件零弹窗 CSS（`WorkspaceShortcutBridge.tsx:2,67-74`） | `03j-dialog.md` A5 定案「插件无自有表单模态；宿主模态 12px（宿主自有，未覆盖）；将来新增须用 16/20」——本模态走宿主原语，与定案一致 |

## 无参照项（不得猜）

- tree-keyboard.ts 全模块 —— roving tabindex/方向键/Home/End/`aria-level` 的 ARIA 树键盘模型：ZCode 侧栏是普通 `li` 列表（`03b-sidebar.md` §5），无键盘树模型；asar 仅有的 `role:"treeitem"` 组件是内部面板树（其一 inline `paddingLeft:r*22+4`），本轮 grep treeitem 上下文 **ArrowDown = 0**，`aria-level` 18 处命中全为 Playwright trace viewer/属性白名单。无 ZCode 例证，属 a11y 增强（模块头注释亦是按 APG 立论、非按 ZCode），跳过对账。
- pinned-workspaces.ts 全模块 —— 置顶/分组的持久化、hydration 优先级（dirty > host > local）、5s 超时是数据流与容错决策，非颜色/圆角/动效类设计点；ZCode 置顶区几何/交互未采集（`03b-sidebar.md` §4 未覆盖清单：「置顶区……未采集几何」）。跳过。
- conversation-dom.ts 全模块 —— `[data-conversation-scroll]` / `[data-chat-anchor-key]` 是插件↔宿主 DOM 集成契约（`conversation-dom.ts:6,16`），ZCode 无对应物；「一次扫描建索引、滚动帧不重复遍历」的纪律与 `08-performance-audit.md` §2 教训同向，但无 ZCode 数值可比。跳过。
- composer-visuals.ts 加号 hover/focus 态底色（`--dsw-alias-interactive-bg-hover-solid`，`:29`）—— ZCode 加号 hover 态未采样（`03d-composer.md` §4 采样缺口「焦点态未采到」），本仓沿用宿主既有 hover 令牌，无 ZCode 色值可对照。跳过。
- WorkspaceShortcutBridge.tsx 错误模态的文案与按钮组（重试/重新选择/关闭、`role="alert"`）—— ZCode 无「添加工作区失败」对应流程可采（`03j-dialog.md` 只采到「创建项目」对话框）。跳过。
