# 批次 8 · src/client/zcode-theme.ts + 三个纯逻辑模块 + input-history-keyboard.ts

> 2026-10-30 夜间审计。参照文档：`01-design-tokens.md`（令牌速查）、`02-motion.md`（动效分档与 asar 二次校正）、`03b-sidebar.md`（§5 任务行/浅色定案/G14）、`03g-theme-audit.md`（TA1 分层与 tokens.json 口径）、`03f-settings.md`（S1/S2）、`03j-dialog.md`（A6 阴影）、`03n-typography.md`（字号档）。
> 其余三个模块 `slot-mirror.tsx` / `schedule-sessions.ts` / `tree-expansion.ts` 为纯逻辑（槽位镜像注册表、定时会话分组排序、localStorage 展开态上限 500 条/512 字符），无颜色/几何/动效决策点，无对账对象——见文首说明，不占差异/无参照名额。
> 本批 asar 提取命令（均为本轮实跑，`/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o -- '--color-sidebar:[^;}]*' app.asar | sort | uniq -c` → `#161616` / `#f0f0f0` / `var(--color-neutral-100)` / `var(--color-neutral-950)` 各 1 次
> - `grep -a -o '\.theme-zai-light{.\{0,260\}' app.asar` → `.theme-zai-light{...--color-background:#f8f8f8;...}`
> - `grep -a -o -m1 '.\{0,420\}--color-sidebar:#f0f0f0' app.asar`（python 字节读等价）→ 该块同含 `--color-border:#0d0d0d1a;--color-hover:#0d0d0d0d;--color-selected:#0d0d0d0d;--color-panel:#fff`，与 `.theme-zai-light{--color-brand:#000;--color-trajectory-user:#2563eb;...}` 同块（trajectory 值逐一衔接），归属 zai-light 实锤
> - `grep -a -o -- '--color-primary:[^;}]*' / '--color-destructive:[^;}]*' / '--color-success:[^;}]*' / '--color-warning:[^;}]*' / '--color-tooltip:[^;}]*' / '--color-hover:[^;}]*' / '--color-selected:[^;}]*' / '--color-surface:[^;}]*' / '--color-border:[^;}]*' / '--color-card:[^;}]*' app.asar | sort | uniq -c`（各得基础层 var() 与覆盖层实色两组）
> - `grep -a -o -- '--color-foreground:[^;}]*' app.asar | sort | uniq -c` → 仅 4 条 var() 引用（neutral-200/300/700/800），**zai 覆盖层不覆盖 --color-foreground**
> - `grep -a -o -- '--color-neutral-50/100/200/300/700/800:[^;}]*' app.asar` → 50=oklch(98.5%)、100=oklch(97%)、200=oklch(92.2%)、300=oklch(87%)、700=oklch(37.1%)、800=oklch(26.9%)
> - `grep -a -o -- '--animate-spin:[^;}]*' / '--animate-in:[^;}]*' / '--animate-out:[^;}]*' app.asar` → `spin 1s linear infinite`；`enter/exit … .15s`
> - `grep -a -o -- '--ease-out:[^;]\{0,40\}' / '--ease-in-out:[^;]\{0,40\}' app.asar` → `cubic-bezier(0, 0, .2, 1)` / `cubic-bezier(.4, 0, .2, 1)`
> - `grep -a -o -m1 '@keyframes enter{.\{0,120\}' / '@keyframes exit{…' app.asar` → 关键帧**不含** animation-timing-function（easing 由使用处 utility 提供）
> - `grep -a -c 'data-document-hidden' app.asar` → 2（存在）
> - `grep -a -o -- '--[a-z-]*muted-foreground:[^;}]*' app.asar` → 仅 1 条 `--muted-foreground: var(--color-text-secondary, light-dark(rgb(26 28 31 / 49.4%), rgb(255 255 255 / 49.8%)))`（带空格换行的异构片段，归属存疑）；**无 `--color-muted-foreground` 数值定义**
> - tokens.json 元数据核验：`_meta.lightClass = " theme-zai- platform-mac-desktop"`（**类名残缺**），且 tokens.json「light」列的 sidebar/background/hover 值逐条等于基础层 `var(--color-neutral-100/50/200)` 换算值 —— **tokens.json 浅色列实为基础主题，不是 .theme-zai-light 覆盖层**（下 D1/D2/D8 的双源冲突根源）。
> ⚠ 未做活体 CDP 复测（无 9224 采样条件），双源冲突处一律登记待裁决，未改任何代码。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| zcode-theme.ts | 浅色侧栏底 `--dcu-sidebar-background` | `#f5f5f5`（`:245,266`，循 TA1 取 245） | **asar zai-light 覆盖层 `--color-sidebar:#f0f0f0`**（240）；tokens.json「light」oklch(97%)=245 实为基础层 neutral-100 | 本轮 asar 提取（zai-light 块归属实锤）+ `tokens.json` `_meta.lightClass` 残缺 + `03b-sidebar.md:138`（asar 定案 `#f0f0f0`）vs `03g-theme-audit.md` §4.6（活体 245）——**两份文档本身冲突** | 活体重采（正确挂 `theme-zai-light` 类）后裁决；若以覆盖层为准应回 `#f0f0f0`，TA1 的「245/250 分层」需重新评估。裁决前不动 |
| zcode-theme.ts | 浅色设置页底 `--dcu-settings-page-bg` | `#fafafa`（`:307`，TA4「浅色对称取画布值 250」） | **asar zai-light `--color-background:#f8f8f8`**（248）；tokens.json「light」oklch(98.5%)=neutral-50 基础层 | 同上双源冲突；`03g-theme-audit.md` §4.6 自述「98.5% 算成 248 实际是 250」用的是 canvas 换算，而覆盖层字面量就是 248 | 同 D1：活体重采后裁决；两处应同批裁决（同一分层体系） |
| zcode-theme.ts | 浅色标题色 `--dcu-sidebar-primary` | `#262626`（`:266`） | 未定：zai 覆盖层不覆盖 `--color-foreground`，基础层有 neutral-700（oklch(37.1%)≈#404040）与 neutral-800（oklch(26.9%)≈**#262626**）两个浅色声明块，归属未定；活体采集（疑缺陷）给 37.1% | 本轮 asar：4 条 `--color-foreground:var(--color-neutral-*)` 无一实色；neutral-800=oklch(26.9% 0 0) 本轮换算 ≈ rgb(38)；`zcode-theme.ts:272` 自注「#404040 = ZCode 浅色 --color-foreground」与本值 #262626 并存 | 活体单测 `.theme-zai-light` 下 `getComputedStyle` 的 `--color-foreground` resolved 值后裁决；深色 #d4d4d4 = neutral-300 双源一致，不动 |
| zcode-theme.ts | `--dcu-tip-hover` 暗色 | `rgba(255,255,255,.06)`（`:81`） | `--color-hover` 暗色 `#ffffff0d`（白 5%）；本仓自己的 `--dcu-sidebar-hover` 暗色也是 .05（`:339`） | 本轮 asar 提取 `--color-hover:#ffffff0d`；`zcode-theme.ts:56-57` 自注「语义同侧栏 hover」却取 .06 | `.06` → `.05` 对齐（1% 微差，低成本） |
| zcode-theme.ts | 浮层主文字 `--dcu-tip-primary` | `#262626`（浅）/`#d4d4d4`（深）（`:63,84`） | `--color-tooltip-foreground`：浅 oklch(14.5% 0 0)≈rgb(10)、深 `#f8f8f8`（tokens.json + 本轮 asar tooltip 块） | `tokens.json` `--color-tooltip-foreground` 字段；`zcode-theme.ts:59-63` 自注为 AA 重取，但 ZCode 原值对比度更高（深色 #f8f8f8 > #d4d4d4），重取理由不成立 | 建议 `--dcu-tip-primary` 对齐 tooltip-foreground（#0a0a0a 系 / #f8f8f8）；次/三档见无参照项 |
| zcode-theme.ts | 焦点色 `--dcu-focus` | `#0b7fff`（浅）/`#4099ff`（深）（`:310,353`） | 最近参照 `--color-input-border-focused`：浅 = brand oklch(74.6% .16 232.661)≈rgb(0,188,255)，深 = `#ffffff26`；无 focus-ring 专令牌（tokens.json 231 变量无 ring 键） | `tokens.json` brand/input-border-focused 字段 + 本轮换算；本仓全部消费点形如 `var(--dsw-focus-ring-color,var(--dcu-focus))`（`CodexSidebar.tsx:574` 等），**仅兜底**；`04-open-gaps.md:46` 对 #4099ff 有相邻裁决（「宿主自有 UI，不改」） | 登记。宿主令牌优先生效，兜底值偏离 ZCode brand 待宿主缺令牌时才可见；如要收口改 `#0bc3ff` 系 |
| zcode-theme.ts | 浅色状态**文字**档 | success `#176c31` / error `#b3261e` / warn `#8a4b00`（`:51`） | ZCode 浅色 state 实色 `#1e8a3e`/`#e03131`/`#e07b00`（填充档，本仓原样保留于 `:52`） | 本轮 asar：`--color-destructive:#e03131` / `--color-success:#1e8a3e` / `--color-warning:#e07b00` 逐字命中；文字档为 `:23-49` 注释的 AA 重取（含逐底色对比度实测），机制差异=ZCode 用 surface+foreground 成对（`01-design-tokens.md` 状态色节） | **维持（已裁决的刻意偏离）**：填充档已逐字对齐，文字档重取有 AA 依据，登记不修 |
| zcode-theme.ts | G14 次要/三级文字 alpha | `#404040 85%/75%`（浅 `:277-278`）、`#d4d4d4 68%/56%`（深 `:333-334`） | ZCode `foreground-subtle` = 60% alpha（浅 `#40404099`/`#d4d4d499` 也在 asar 出现） | 本轮 asar：`--color-foreground-subtle:#40404099` / `#d4d4d499` 字面量；抬 alpha 为 `03g-theme-audit.md` §4.5-G14 判定过的 AA 补偿（DSH 底更暗） | **维持（已裁决）**：L 身份一致、只抬 alpha，登记不修 |

## 一致项（可写成源码文本断言，用于回归加固）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| zcode-theme.ts | 主色双主题 | `--dcu-primary:#000000/#ffffff`、`--dcu-primary-foreground` 反色（`:20-21`） | 本轮 asar：zai 覆盖层 `--color-primary:#000`（浅）/`#fff`（深）逐字一致 |
| zcode-theme.ts | 动效时长档 | feedback 150ms（`:131`）/ move 200ms（`:137`）/ collapse 300ms（`:138`）/ enter 150ms（`:142`）/ exit 150ms（`:143`） | `02-motion.md` asar 二次校正表 + 本轮 asar：`--animate-in/out … .15s`、`duration-200 ease-out`（文档记录）、`animation:.3s ease-in-out`（文档记录）；曲线另有 `--ease-out:cubic-bezier(0, 0, .2, 1)`、`--ease-in-out:cubic-bezier(.4, 0, .2, 1)` 逐字命中 |
| zcode-theme.ts | spinner 基元 | `.dcu-spin{animation:dcu-spin 1s linear infinite}`（`:185`）+ `@keyframes dcu-spin{to{transform:rotate(360deg)}}`（`:203`） | 本轮 asar `--animate-spin:spin 1s linear infinite` 逐字一致 |
| zcode-theme.ts | 行 hover/选中底四值 | 浅 hover/selected 同 `rgba(13,13,13,.05)`（`:288`）；深 hover `rgba(255,255,255,.05)`、selected `rgba(255,255,255,.1)`（`:339`） | 本轮 asar：zai-light 块 `--color-hover:#0d0d0d0d`=`--color-selected:#0d0d0d0d`；暗色 `--color-hover:#ffffff0d`、`--color-selected:#ffffff1a` 全部命中（#0d0d0d0d=黑 5%、#ffffff0d=白 5%、#ffffff1a=白 10%） |
| zcode-theme.ts | 侧栏边线 | `--dcu-sidebar-border:rgba(13,13,13,.1)`（浅 `:310`）/`rgba(255,255,255,.1)`（深 `:353`） | 本轮 asar：zai-light `--color-border:#0d0d0d1a`、暗色 `#ffffff1a`（即 10% 黑/白）逐值一致 |
| zcode-theme.ts | surface 叠加 | `--dcu-surface:rgba(13,13,13,.03)`（浅 `:311`）/`rgba(255,255,255,.05)`（深 `:354`） | 本轮 asar：`--color-surface:#0d0d0d08`（黑 3%）/`#ffffff0d`（白 5%）逐值一致 |
| zcode-theme.ts | 状态**填充**档六值 | 浅 `#e03131/#1e8a3e/#e07b00`（`:52`）、深 `#ff5c5c/#46bf72/#ff8a30`（`:77-78`） | 本轮 asar：`--color-destructive/success/warning` 双主题六值逐一逐字命中 |
| zcode-theme.ts | 浮层底色 | `--dcu-tip-bg:#f0f0f0`（浅 `:58`）/`#2b2b2b`（深 `:81`） | 本轮 asar：`--color-tooltip:#f0f0f0`（浅）/`#2b2b2b`（深）逐值一致（`03j-dialog.md` A3 同值互证） |
| zcode-theme.ts | 设置页导航项 | `--dcu-settings-nav-size:16px`、`--dcu-settings-nav-radius:12px`（`:302-303`） | `03f-settings.md` §2.2 S1 实测（ZCode 16px/r12/h32）+ §2.4 双主题活体验证 |
| zcode-theme.ts | 文档隐藏全停 | `html[data-document-hidden] *…{transition:none!important;animation:none!important}`（`:217`） | 本轮 asar `grep -a -c 'data-document-hidden'` → 2（ZCode styles 同名机制，`zcode-theme.ts:204` 注明移植来源） |

## 无参照项（不得猜）

- `--dcu-kbd-foreground` `#5c5c5c`/`#9a9a9a`（`:67,87`）—— asar 中 Kbd 类名（`text-muted-foreground`，83 处字符串）在，但**无数值定义**；唯一的 `--muted-foreground:` 片段是带 `light-dark()` 的异构样式表，归属存疑。跳过
- `--dcu-tip-secondary/--dcu-tip-tertiary` 四值（`:63,84`）—— ZCode tooltip 家族只有 tooltip-foreground 与 tooltip-tag(-foreground)，无「三档浮层文字」对应槽位。跳过
- `--dcu-sidebar-icon` `#525252`/`#a3a3a3`（`:287,338`）—— ZCode 侧栏图标色未采集（仅 running loader = foreground-subtle 60%，`03b-sidebar.md` §5）。跳过
- enter/exit 缓动曲线 `cubic-bezier(.2,0,0,1)`/`(.4,0,1,1)` 与 press 档 90ms（`:142-144`）—— 本轮 asar `@keyframes enter/exit` 不含 timing-function，时长 .15s 已锁但曲线无例证；press 时长 `02-motion.md` 明示「ZCode 侧未采到，保留」。跳过
- `input-history-keyboard.ts` ↑/↓ 草稿历史召回交互（边界判定、IME keyCode 229、capture 监听）—— ZCode composer 键盘行为未采集（`03d-composer.md` D-h 焦点态亦标「未采到」）。跳过
