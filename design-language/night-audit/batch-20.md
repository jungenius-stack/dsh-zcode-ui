# 批次 20 · user-bubble-collapse.ts / ScheduleBrowser.tsx / zcode-skin.ts / companion-slots.ts / hover-tip.ts / channel-brand.tsx

> 2026-10-30 夜间审计（批次 20，只读，不改 src/tests/既有文档）。
> 分工边界：本批 6 个模块消费的共享样式产自其他批次文件 —— 树行/菜单样式 `WORKSPACE_TREE_STYLE`、`.dcu-wb-delete-button`、`.dcu-wb-brand` 在 `CodexWorkspaceBrowser.tsx:219,295-297`（批次 1），`.dcu-schedule-views` 分段控件在 `CodexSidebar.tsx:160`（批次 2），`session-tree.tsx`/`session-row-actions.tsx`/`schedule-sessions.ts`/`zcode-icons.tsx`/`zcode-tokens.ts` 分别在批次 18/18/8/19/5。本批只对这 6 个文件**自有**的决策点负责；涉及跨文件值时注明归属供汇总去重。
> 参照文档：`03c-conversation.md`（C2 长文本折叠主参照）、`04-open-gaps.md:18-30`（G18 asar O4t 原始记录）、`02-motion.md`（动效档 + 2026-10-29 asar 二次校正）、`03b-sidebar.md`（侧栏图标 16×16）、`03j-dialog.md`（弹窗 footer）、`01-design-tokens.md`（主题机制）、`08-performance-audit.md`（全局观察器裁决）；`04-open-gaps.md` 仅按关键词 grep（G18 `:18-30,104,113`、focus-ring 无命中、悬停卡无命中、定时/品牌/归档无命中）。
> 本批 asar 提取命令（本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -c 'theme-zai-light' $A` → **6**；`grep -a -c 'theme-zai-dark' $A` → **5**（皮肤层来源类名确实在 bundle）
> - `grep -a -o -m 4 -- '--color-icon-blue:[^;]\{1,60\}' $A` → 唯一声明 `--color-icon-blue:var(--color-terminal-bright-blue)`；再按字节偏移定位四处 `--color-terminal-bright-blue:` 声明：`:root,:host` → `var(--color-sky-600)`、`.dark` → `var(--color-sky-500)`、终端主题两处 `#06d`/`#80beff`
> - `grep -a -o -- 'focus-visible\\:ring-primary:focus-visible{--tw-ring-color:var(--color-primary)'` → 命中（ZCode focus-visible ring 消费 `--color-primary`）
> - `grep -a -c '0b7fff' $A` → **5**（上下文均为 `--color-terminal-selection:#0b7fff38` 与装饰渐变，非焦点环）；`grep -a -c '4099ff' $A` → **3**（均为 `.border-[#4099FF]` 类任意值）
> - 品牌色 `26A5E4`/`07C160`/`5865F2`/`E01E5A`/`12B7F5`/`3370ff`/`0285fc` → **全部 0 命中**
> - 相对时间：`分钟前`×4、`天前`×7、`刚刚`×6、`RelativeTimeFormat`×1、`Just now`×1；@310398171 取得 `sidePane.time.justNow/minutesAgo/hoursAgo/daysAgo` 四档；@332391199 取得 Today/Yesterday+绝对式格式化函数
> - `grep -a -c 'M4 6.5' $A` → **0**（G18 chevron 图标路径在 ZCode bundle 无对应物）
> - 令牌真值：`zcode-theme.ts:131` feedback 150ms `(.4,0,.2,1)`；`:137` **move 200ms** `(0,0,.2,1)`；`:138` **collapse 300ms** `(.4,0,.2,1)`；`:310/:353` `--dcu-focus:#0b7fff/#4099ff`
> - `tokens.json` 实查：`--color-brand` light `oklch(74.6% .16 232.661)`（≈rgb(0,188,255)）/ dark `#fff`；`--color-primary` light `oklch(14.5% 0 0)`（≈#0a0a0a）/ dark `#fff`；`--color-terminal-bright-blue` light `oklch(68.5% .169 237.323)`（≈rgb(0,166,244)）/ dark `#80beff`；`--color-icon-blue` 未收录

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| user-bubble-collapse.ts | G18 展开过渡时长（模块头声明 vs 实际解析值） | 头注释写「过渡走 move 档令牌（300ms / 0,0,.2,1）」（`user-bubble-collapse.ts:6`），但实际消费 `var(--dcu-motion-move-duration)` 的 CSS（`conversation-layout.ts:196`，批次 9 文件）解析为 **200ms**（`zcode-theme.ts:137`，commit `6d9cc99` 2026-10-29 拆档后） | O4t：max-height **300ms** ease-out（曲线 (0,0,.2,1) 一致，时长差 100ms） | `03c-conversation.md` C2-2（「max-height 300ms ease-out」）+ `04-open-gaps.md:19`（G18 asar O4t「300ms max-height 过渡」）；`02-motion.md` 2026-10-29 校正表（move=侧栏开合 200ms，折叠体独立 300ms）。10-28 C2-2 判 ✅ 时 move 档还是 300ms，拆档后回归。**未验证**：活体展开动效逐帧 | G18 过渡改为专属 300ms ease-out（注意 `--dcu-motion-collapse-duration` 虽 300ms 但曲线 `(.4,0,.2,1)` 也不等于 O4t 的 ease-out，不能直接换）；同步更正 `user-bubble-collapse.ts:6`、`conversation-layout.ts:185` 两处「move=300ms」旧注释；CSS 修点在批次 9 文件，供汇总去重 |
| zcode-skin.ts | 焦点环颜色的 ZCode 来源声明 | `--dsw-focus-ring-color:#0b7fff`(light)/`#4099ff`(dark)（`zcode-tokens.ts:261,487`），`zcode-skin.ts:73-76` 注释称焦点环变量「已在 ZCODE_LIGHT / ZCODE_DARK 里换成 ZCode 的品牌色，因此焦点环自动跟随 ZCode」 | asar：`--color-icon-blue` → `terminal-bright-blue` → light sky-600 ≈rgb(0,132,209) / dark sky-500 ≈rgb(0,166,244)；且 focus-visible ring 实际消费 `--tw-ring-color:var(--color-primary)`（中性 oklch(14.5% 0 0)/#fff）。**无一等于 #0b7fff/#4099ff**；asar 里 #0b7fff 仅出现于终端选区色与装饰渐变 | 本轮 asar 实跑（见头部命令清单）；`tokens.json`（`--color-terminal-bright-blue`/`--color-primary`/`--color-icon-blue` 未收录）；`07-delivery-ledger.md` A2（`--dsw-focus-ring-color`=brand `#0b7fff` 判「继承」——是 DSH 台账值）。值文件属批次 5，因 `zcode-skin.ts` 同口径注释而报出。**未验证**：DSH 焦点环实际消费哪个变量、最终渲染色，需活宿主 CDP | 二选一：① 承认 #0b7fff/#4099ff 是 DSH 有意保留值（a11y 台账口径），更正 `zcode-skin.ts:73-76` 与 `zcode-tokens.ts:259,485` 的「ZCode --color-icon-blue（focus 环）」来源注释；② 若要真跟随 ZCode，改值并活体验证。需用户裁决方向 |
| zcode-skin.ts | 品牌色来源声明半错（连带 state-business-primary） | `--dsw-alias-brand-primary`/`--dsw-alias-state-business-primary` = #000000/#ffffff，注释「ZCode: --color-brand / --color-primary = #000000（中性黑，非蓝色）」（`zcode-tokens.ts:117`，批次 5 文件；`zcode-skin.ts:74-76` 引用同一口径） | `--color-primary` 确为中性（oklch(14.5% 0 0)≈#0a0a0a / #fff）✅；但 `--color-brand` light = **oklch(74.6% .16 232.661) ≈ rgb(0,188,255)（蓝）**、dark #fff —— --color-brand 并非中性黑 | `tokens.json` 实查（本轮 python 读值 + oklch→sRGB 换算脚本，输出 rgb(0,188,255)）；asar dark 块 `--color-brand:#fff`（@326248703 附近字节上下文）与 tokens.json dark 一致。映射值 #000000 与 --color-primary 对齐本身成立，失实的是来源声明 | 更正 `zcode-tokens.ts:117` 注释为「ZCode: --color-primary = 中性黑；--color-brand 另有蓝色 oklch(74.6% .16 232.661)（input-border-focused 浅色消费它）」，防止下轮对账再被误导；值文件属批次 5，供汇总去重 |
| user-bubble-collapse.ts | 全局观察器缺「侧栏动画期跳过」守卫 | `MutationObserver` 挂 `document.body` subtree childList+characterData（`:180`），rAF 批处理（`:150-160`）但无 `[data-dcu-sidebar-motion]` 跳过；flush 里逐气泡读 `scrollHeight`（`:86`） | 同构模式已被 08 裁决为「侧栏开合每帧强制同步布局」根因，修法 = 动画期跳过 + 属性移除后补跑（侧栏开合 p95 33.4→16.7ms 即由此而来） | `08-performance-audit.md` §2（Layout 33 次/232ms、getBoundingClientRect 249ms、布局正被动画改写时读取 = 强制同步布局）+ §3（修法 commit `40d86c1`+`ab100d8`）。侧栏收展是 React 重挂 → childList 突变会触发本模块 flush。**未验证**：未做活体 Performance trace 复现（静态同构推断），实际占比未知 | 补 08 §3 同款守卫：`document.documentElement` 存在 `data-dcu-sidebar-motion` 时本轮跳过并 pending，属性移除后补跑一轮；与 `official-turn-navigator.ts:118-133` 既有实现同构 |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| user-bubble-collapse.ts | 折叠几何与溢出阈 | `COLLAPSED_PX=120`、`OVERFLOW_SLACK=1`（`:29-31`），溢出判定 `scrollHeight > 121` | `03c-conversation.md` C2-1 + `04-open-gaps.md:18-19`（asar O4t：max-height 120、阈 120+1） |
| user-bubble-collapse.ts | 展开高度公式 | `Math.max(fullHeight, COLLAPSED_PX)`（`:100`） | `03c-conversation.md` C2-2（`max(scrollHeight,120)`）+ `04-open-gaps.md:19` |
| user-bubble-collapse.ts | 展开钮 aria | `aria-expanded` + `aria-label`=展开\|收起（`:103-104`，zh 分支 `:44-47`） | `03c-conversation.md` C2-4（asar O4t aria 原文）+ `04-open-gaps.md:20` |
| user-bubble-collapse.ts | 钮生命周期 | 无溢出 → 移除钮 + 清 maxHeight + 清双 data 属性（`:88-95`）；正文变化 → 回折叠态（`:121-126`） | `03c-conversation.md` C2-4（「仅溢出时出现；正文变化后回到折叠态」）+ `04-open-gaps.md:20` |
| user-bubble-collapse.ts | 只认用户轮气泡 | `bubble.closest('.IzP3Va_userStack') === null` 即返回（`:22-23,:113`） | `04-open-gaps.md:21-22`（G18「只认 userStack 内气泡，避免旧版应答尾部误标重演」+ G18b 结构级收口 `:113`） |
| ScheduleBrowser.tsx / channel-brand.tsx | 侧栏行内图标 16×16 | ScheduleClock 16（`ScheduleBrowser.tsx:67`）、菜单项 ZIcon* `size={16}`（`:103,:105,:149`）、品牌图标 16（`channel-brand.tsx:4,7,10,19,22,25,28,33,40` + `.dcu-wb-brand{width:16px;height:16px}` `CodexWorkspaceBrowser.tsx:219`） | `03b-sidebar.md` §5（左槽 16×16 空 span、running 16×16） |
| ScheduleBrowser.tsx | 归档组确认弹窗 footer 右对齐 | footer 容器 `dcu-wb-rename-actions`（`:173`）= `justify-content:flex-end`（`CodexWorkspaceBrowser.tsx:295`） | `03j-dialog.md` A5 复测记录（「底部按钮右对齐」，2026-10-28 活体） |
| zcode-skin.ts | 双主题两档 + color-scheme 跟随 | `LIGHT_SELECTOR=':root:root body'` / `DARK_SELECTOR=':root:root body[data-ds-dark-theme]'`（`:51-54`）；STRUCTURE_CSS 两行 color-scheme light/dark（`:81-82`） | `01-design-tokens.md` 主题机制（172/231 变量随主题翻转、浅黑叠加/深白叠加）；`04-open-gaps.md:1828`（G6 恢复深色实录含 `color-scheme:dark`）；asar `color-scheme:dark`×9 / `color-scheme:light`×15（本轮实跑） |
| zcode-skin.ts | 皮肤来源类名真实存在 | `ZCODE_LIGHT/ZCODE_DARK` 自称取自 `.theme-zai-light`/`.theme-zai-dark`（`zcode-tokens.ts:16-17` 头注释）；asar 实测 `theme-zai-light`×6 / `theme-zai-dark`×5 | 本轮 `grep -a -c` 实跑；`05-extraction-method.md`（提取方法索引）。回归断言可锁「asar 含 theme-zai-dark」防上游换名后皮肤静默失源 |

## 无参照项（不得猜）

- companion-slots.ts 全模块 —— 插槽占用探测纯状态逻辑（`readSlotEntries`/`slotHasEntries`/快照源 `:23-76`），无颜色/圆角/间距/动效决策点；ZCode 无「配套插件插槽占用」对应物可查，跳过。
- channel-brand.tsx 品牌色与图形 —— 8 个品牌色 hex（#26A5E4/#07C160/#fb6500 系/#12B7F5/#0285fc/#00d6b9 系/#5865F2/#E01E5A 系）asar 全 0 命中（本轮实跑），ZCode 无 IM 渠道品牌图标概念；fallback 灰圆 #8b949e（`:40`）亦无例证，跳过。
- hover-tip.ts 时间分档与卡片几何 —— 视口 clamp pad=8（`:3`）、卡片锚 `rect.right+8`（`:11`）、7 档相对时间与周/月/年边界（`:24-33`）：ZCode 侧未采集会话行时间格式（03b §5 只记 12px/60% α）；asar 旁证两种格式化（sidePane 四档 `justNow/minutesAgo/hoursAgo/daysAgo` @310398171；Today/Yesterday+绝对式 @332391199）但压缩混淆调用点不可考，且注释自称对齐 ChatGPT `$wa`（`:35,:40`）属 DSH 显式裁决，跳过。
- ScheduleBrowser.tsx 定时视图专属件 —— runs/overview 分段 tab（role=tablist，样式在 `CodexSidebar.tsx:160` 批次 2）、ScheduleClock 图形、Menu `dense`/`compact` 档位、菜单 danger 项、归档确认钮 outline+`--dcu-state-error-text` 红字（样式在 `CodexWorkspaceBrowser.tsx:296`）：ZCode 无定时任务视图、无危险确认弹窗与菜单 danger 项采样（03j 仅「创建项目」、03k 仅令牌表），跳过。
- 杂项 —— user-bubble-collapse 展开钮的 `title` 原生 tooltip 与英文文案 Expand/Collapse（`:44-47,:105`，ZCode aria 记录仅「展开|收起」）；user-bubble-collapse chevron 图标 16px/stroke 1.5（`:34`，路径 `M4 6.5 8 10l4-3.5` asar 0 命中，03c C2-4 未记 ZCode 图标尺寸）；zcode-skin 的 `:root:root` 特异性策略、`color-scheme` 之外的机制与 `SKIN_VERSION='1.5.1'` 标记（`:24-26,:42`，ZCode 无皮肤注入层对应物），跳过。
