# 批次 17 · AboutSection.tsx / settings-page-styles.ts / user-error.ts / input-history.ts / plugin-config.ts / business-request-error.ts / session-title-scroll.ts

> 2026-10-30 夜间审计（批次 17，只读，不改 src/tests/既有文档）。
> 参照文档：`03f-settings.md`（S1/S2/S3 实测矩阵 + §2.4 收口，主参照）、`03f-settings-zcode-spec.json`（ZCode 设置页 CDP 实测：navItems/cards/selects 逐项几何与颜色）、`03g-theme-audit.md`（**仅 grep 未整读**：TA1 分层 :96-163、TA4 :24,35「浅色设置卡未采到 ZCode 值，#fbfbfb 为推定」）、`03b-sidebar.md`（§5 任务行长标题 marquee vs ellipsis 裁决）、`02-motion.md`（:345-360 时长分档 2026-10-29 asar 校正、§4 reduced-motion）、`03n-typography.md`（会话区排版，用于排除语境误套）、`01-design-tokens.md`（背景/状态色速查）+ `tokens.json` state 段（success/destructive/warning 双主题实测值）。
> `04-open-gaps.md` 仅 grep 未整读：`focus-visible|焦点圈|outline-offset` → :1176（焦点环覆盖关于页 ✅）、:1815（G2 已修 outline solid 2px）；`AboutSection|dcu-about|关于页` → 仅 :1176；`settings-enter|设置页.*动画` → 0；`864` → 0；`状态色|state-success|176c31|b3261e|8a4b00` → **0**（状态色浅色档无裁决记录）。
> 本批 asar 提取（本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`，均为固定串 `grep -a`）：
> - `grep -a -c 'tabular-nums' $A` → **48**
> - `grep -a -c 'outline-offset:2px'` → **11**；`'outline-offset:3px'` → **0**；`'outline-offset:-2px'` → **3**；`'outline-offset:1px'` → 4；`'outline-offset:4px'` → 1；`'outline-offset:-1px'` → 2；`'outline-offset:5px'` → 0；`'outline-width:2px|outline:2px'` → **28**
> - `grep -a -c 'min-height:32px'` → 2；`'border-radius:12px'` → 3；`'height:32px'` → 28（32px 控件档与 12px 圆角在 ZCode 存在，旁证）
> 消费侧令牌旁证（只读）：`zcode-theme.ts:131,137-138,142-144`（feedback 150ms (.4,0,.2,1) / move 200ms (0,0,.2,1) / collapse 300ms / enter 150ms (.2,0,0,1) / exit 150ms / press 90ms）、`zcode-theme.ts:302-308,350-353`（nav-size 16px / nav-radius 12px / page-bg #fafafa / card-fill #fafafa↔#161616 / focus #0b7fff↔#4099ff）、`zcode-theme.ts:77`（状态色深色档）、`zcode-tokens.ts:504-508,521,553-558`（radius-xs2/sm4/lg8/xl12/full999、fs-title=base+6=20、caption=13、sm=12、base=14）、`zcode-theme.ts:170-174`（space-1..6 = 4/8/12/16/24）、`zcode-theme.ts:185,203`（dcu-spin 1s linear infinite）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| settings-page-styles.ts | 浅色设置卡 `--dsw-alias-settings-card-fill` 的兜底值 | `#fbfbfb`（`:49`） | **无 ZCode 实测**（03g:35 明注「未采到 ZCode 浅色卡值，#fbfbfb 是推定」）；本仓 TA4 定案 = 画布对称值 `#fafafa`（zcode-theme.ts:308） | `settings-page-styles.ts:30-33` 自纪律「回退值必须与 zcode-theme.ts 真值一致」+ `zcode-theme.ts:303-308` TA4 注释（2026-10-28：「旧 #fbfbfb 是未验证猜测」）+ `03g-theme-audit.md:24,35`（grep） | 兜底改 `#fafafa` 与 TA4 真值同步；或在注释写明保留 #fbfbfb 的理由。**注意**：03f:119 的浅色 rgb(251,251,251) 是 DSH 改后活体验证值，不是 ZCode 侧实测，不得引为 ZCode 证据 |
| settings-page-styles.ts / AboutSection.tsx | 焦点环外扩 offset 3px | 全局 `.dcu-settings-page :focus-visible{outline-offset:3px}`（`:61`）、document 按钮 3px（`:134`）、`.dcu-about-downloads` 3px（`AboutSection.tsx:41`） | **3px 全文 0 例**；ZCode 主流档 2px（11 例）、内收 -2px（3 例）、1px 4 例 | asar 本轮：`grep -a -c 'outline-offset:3px'` → 0，`'outline-offset:2px'` → 11；同仓其余焦点环已用 2px（AboutSection.tsx:38,40 的 install/external-link/project-link） | 三处 3px 统一到 2px 档；若 3px 是 DSH 宿主默认值需保留，则注释写明豁免理由（04 无此裁决记录） |
| settings-page-styles.ts | 设置导航**未选中项**文字色（深色） | `--sp-text:var(--dcu-sidebar-navigation,…)` → 深 `#d4d4d4`（212 灰）（`:62` + zcode-theme.ts 深色块 `--dcu-sidebar-navigation:#d4d4d4`） | `rgb(179,179,179)`（179 灰，navItems 行容器层 color） | `03f-settings-zcode-spec.json` navItems（全部 sel:false，行容器 h32/r12 层 fs16 color rgb(179,179,179)）；03f §2.2 S1 判定只覆盖 fs/h/r，**颜色从未收口** | 深色未选中项降档到 ZCode 实测灰（179 灰 ≈ 前景 alpha 叠加需反推具体形式）；激活态因 spec JSON 无激活样本（sel 全 false）**不判**，先补采激活项 |
| AboutSection.tsx（状态色令牌定义在 zcode-theme.ts） | 状态文字色**浅色档**三值 | success `#176c31` / error `#b3261e` / warn `#8a4b00`（zcode-theme.ts:51） | success `oklch(62.7% .194 149.214)` / destructive `oklch(57.7% .245 27.325)` / warning `oklch(68.1% .162 75.834)` | `tokens.json` state 段 light 值（ZCode 双主题实测）；本仓调暗理由在 `settings-page-styles.ts:120-123`（AA 对比度，亮 6.15:1）与 `zcode-theme.ts:191`（错误态不铺底、文字 ≥4.5:1）；**04-open-gaps grep 状态色 0 命中，无收口记录** | 属「有理由但未登记」的显式调整：在 04 或注释补一条收口记录（ZCode 浅色原值 oklch… → DSH AA 调整 #176c31/#b3261e/#8a4b00），避免后续对账反复误判；ZCode 浅色状态色的实际用法语境未采集，不反向改值 |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| settings-page-styles.ts | S1 导航项几何 + S1b 分组标签 | 导航项 16px（`--dcu-settings-nav-size`，zcode-theme.ts:302）/ r12（`:76` radius-xl=12，zcode-tokens.ts:508）/ h32（`:76`）；分组标签 12px/500（`:75` fs-sm=12） | `03f` §2.2 S1 + §2.4 收口表；spec JSON navItems（16px/h32/r12、基础设置 fs12/fw500 补上 S1b） |
| settings-page-styles.ts | S2 设置卡片（深色） | 卡 fill 深 `#161616`（zcode-theme.ts:351）、1px 10% 边（`:97` border-l2）、r-xl=12（`:97`） | `03f` §2.2 S2/S2b/S2c；spec JSON cards[0]（bg rgb(22,22,22)、border 1px rgba(255,255,255,.1)、radius 12px） |
| settings-page-styles.ts | S3 下拉控件 | h32/min-h32（`:104-105`）、fs base=14（`:107`）；r8 由宿主类保留 | `03f` §2.2 S3（ZCode h32/r8/fs14）+ §2.4 收口；spec JSON selects[1]（h32/fs14/r8） |
| zcode-theme.ts（AboutSection 消费） | 状态色**深色档**三值逐字一致 | success `#46bf72` / error `#ff5c5c` / warn `#ff8a30`（zcode-theme.ts:77 = AboutSection.tsx:37 data-installed/update 分支消费） | `tokens.json` state 段 dark：`--color-success:#46bf72`、`--color-destructive:#ff5c5c`、`--color-warning:#ff8a30` |
| settings-page-styles.ts / AboutSection.tsx | 动效挂档正确（令牌消费层面） | hover/过渡挂 feedback 档 150ms (.4,0,.2,1)（`:66,:76,:132,:136-138,:148`）；进度条宽度过渡挂 move 档 200ms (0,0,.2,1)（AboutSection.tsx:37 progress-fill）；设置页进入动画挂 enter 档 150ms (.2,0,0,1)（`:145-147`） | `02-motion.md:345-360`（2026-10-29 asar 时长分档校正表）+ `zcode-theme.ts:131,137,142`；batch-9 曾因 move 档语义漂移出 diff，此处锁档位 |
| settings-page-styles.ts | reduced-motion 全关 | `@media(prefers-reduced-motion:reduce)` 下 trigger/svg/back/link 过渡与三支进入动画全 `none`（`:169`）；zcode-theme.ts:221 令牌归零、:225 spin 停 | `02-motion.md` §4「CSS 过渡 motion-reduce 已做 ✅」 |
| settings-page-styles.ts | 焦点环形态（2px 主档）+ 内收档 | outline 2px solid（`:61,:125,:134` 等）、link/back 内收 `outline-offset:-2px`（`:79`） | `04:1176,1815`（G2 键盘焦点环已修）；asar 本轮 `outline-width:2px|outline:2px` 28 例、`outline-offset:-2px` 3 例 |
| session-title-scroll.ts | 会话标题截断 = 纯 ellipsis，跑马灯不回退 | 已移除 titleOverflowPx/滚动机制（`:4-8` 注释，两端同裁实测教训），完整标题交给 tooltip | `03b-sidebar.md` §5 长标题行：ZCode `task-title-marquee-track` vs DSH ellipsis = **⚪ 已裁决 DSH 适配**（宿主会话栏已有省略语义）——已裁决偏离落地锁定，非一致性命中 |
| AboutSection.tsx | tabular-nums 数字等宽 | progress 百分比（`:37` `.dcu-about-progress-pct`）与下载量（`:41` `.dcu-about-downloads`）两处 `font-variant-numeric:tabular-nums` | asar 本轮 `tabular-nums` 48 例（ZCode 同款特征存在） |
| settings-page-styles.ts | 基准字号与行高 | `.dcu-settings-page{font:14px/1.5 …}`（`:50`） | `01-design-tokens.md:42`（`--ui-font-size: 14px`）+ spec JSON selects fs14 |

## 无参照项（不得猜）

- AboutSection.tsx 自有组件几何与排版 —— install 按钮 min-h32/r-lg8/pad 6·8/fs-sm12（`:37`）、external-link min-h28/pad 0 8（`:38`）、依赖行 min-h64/pad 12/行间 border-b（`:37`）、message 12% color-mix 底（`:37`）、进度条 4px/full 圆角 + wave 1.2s ease-in-out translateX(-60%→280%)（`:37`）、h2 title=20px/lh+8、intro caption/20、h3 base/20 mt24 mb8、features ul pl20 lh24、图标 16/14/12 混排（`:222,228,232`）、安装轮询 800ms/IO threshold 0.2（`:135,159`）：`03f-settings-zcode-spec.json` 无 headings/buttons 字段、ZCode 设置页无「关于/依赖管理」对应物记录；`03n` 是会话区 markdown 规格（h3 14/24.5/mb16 等），语境不适用不硬套。全部跳过。
- settings-page-styles.ts 自有控件与态 —— switch 36×20/thumb16/translateX16/底 30% color-mix（`:124-129`）：`03f` S3b 明注「ZCode 侧开关从未采到 ❓」、spec JSON switches 为空数组；trigger h36/svg16/rotate(18deg)/active scale .98（`:136-141`）；导航搜索框（`:68-73`）：`03b` §1 搜索态未采集 ❓。全部跳过。
- settings-page-styles.ts 布局与宿主适配参数 —— inner 864px/pad 48（`:85`）、heading h1 fs-xl18/lh26/600/-0.2px（`:89`，字距为负与 03n A4 会话区 +0.025em 方向相反，但设置页标题无 ZCode 记录）、macOS padding-top 48+8（`:64`）、mica 透明层贯通（`:153-163`）、720/900/600/480 断点（`:38,41,176,177`）：03f S4 判「容器差异非缺陷」，其余为 DSH 宿主约束适配。跳过。
- user-error.ts / input-history.ts / plugin-config.ts / business-request-error.ts 全模块 —— 错误码→文案键映射（`:8-50`）、未知错误脱敏 `errors.generic`（`:105`）、历史存储限额（limit 200/单条 8000 字/20 scope/1MB，`input-history.ts:3,9,17,26,31,33`）、slots 注册 order 16（`plugin-config.ts:17`）、HTTP 401/403/503 → 文案键（`business-request-error.ts:13-15`）均为行为逻辑，无颜色/圆角/间距/字号/动效决策点，无 ZCode 对应物可查。跳过。
- 禁用态透明度三档（install `.65` / document 按钮 `.55` / switch `.5`）与 hover 底令牌选择（install 用 `--dsw-specific-menu-item-hover`、external-link 用 `--dsw-alias-interactive-bg-hover`）：ZCode disabled 档与设置页按钮 hover 无任何记录，且浅色 interactive-bg-hover（黑 5%）恰与 03b §5 未覆盖区记录的 ZCode 浅色 surface-hover `#0d0d0d0d` 同值、深色却差 5%↔10%，语境不足不判。跳过。
