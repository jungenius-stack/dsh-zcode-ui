# 批次 8 · 甲方（三方交叉第一方，独立取证）

## 批次 8 · zcode-theme.ts / slot-mirror.tsx / input-history-keyboard.ts / schedule-sessions.ts / tree-expansion.ts

**方法与参照**：asar = `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB，下称 app.asar），提取命令两类：`grep -a -o -- '<模式>' app.asar`（字面值）与 python3 mmap 按字节偏移取前后 110–160 字节上下文（定位所属 `.theme-zai-light` / `.theme-zai-dark` 块）。活体 = ZCode 9224 只读 CDP（`curl http://127.0.0.1:9224/json/list` + node WebSocket `Runtime.evaluate`，仅读 computed/属性，未写入页面；URL 确认活页加载的正是本 app.asar 的 `out/renderer/index.html`）。文档 = README、01-design-tokens、02-motion、03b-sidebar、03e-header、03f-settings、03n-typography（grep）、tokens.json、expansion-state、05-extraction-method；04-open-gaps 仅 grep（关键词 0 命中）。**未读任何 batch-\*.md / cross-\*.md。**

**模块说明**：`slot-mirror.tsx` 为纯槽位贡献镜像逻辑（递归环检测、kind 校验、别名擦除，slot-mirror.tsx:35-107），**无颜色/几何/字号/动效/图标/阴影/交互反馈任一设计决策点**，不进以下三节。

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| zcode-theme.ts | 侧栏/画布浅色底 | 侧栏 `--dcu-sidebar-background:#f5f5f5`、设置页/卡片 `#fafafa`（:245,:266,:307-308） | asar zai-light 覆盖层 `--color-sidebar:#f0f0f0`、`--color-background:#f8f8f8`（暗色两侧一致 #161616） | `grep -a -o -- '--color-sidebar:[^;}]*' app.asar` → `#f0f0f0/#161616`（另两条为 base 块 var()）；mmap 上下文 `--color-background:#` → zai-light `#f8f8f8`；仓库自述采信 tokens.json CDP 换算（oklch 97%/98.5%→245/250，:248-265）——与 asar 字面量两源冲突；活体暗色 `--color-sidebar=#161616` 实测=asar；03b:138 已记过 asar `#f0f0f0` | 以 asar 字面量复核 TA1/TA4，或书面裁决双源冲突（浅色活体未验，不判定孰对） |
| zcode-theme.ts | 状态色·文字档 | 浅 `#176c31/#b3261e/#8a4b00`、深 `#46bf72/#ff5c5c/#ff8a30`（:51,:77） | ZCode 现成 surface-foreground 档：浅 `#166b32/#b42020/#914e00`、深 `#87d9a4/#ff8585/#ffa159` | mmap：`--color-success-surface-foreground` zai-light `#166b32`、zai-dark `#87d9a4`（warning/destructive 同块取到）；活体暗色三值 `#87d9a4/#ff8585/#ffa159` 实测吻合；仓库六值全部不同——暗色三值=ZCode 基色 `--color-*`（非其文字档），浅色三值两源皆非 | 对齐 ZCode 现成文字档，或书面声明不采用的理由（现注释只对 DSH alias 论证，未提 ZCode 此档） |
| zcode-theme.ts | Kbd 文字色的依据 | 注释「ZCode Kbd 组件用 text-muted-foreground」（:64）→ `--dcu-kbd-foreground` 浅 #5c5c5c / 深 #9a9a9a（:67,:87） | Kbd 组件（`data-slot:"kbd"`）实为 `bg-tooltip-tag … text-tooltip-tag-foreground` → 浅 #5c5c5c / 深 #adadad | mmap：`` jsx(`kbd`,{"data-slot":`kbd`,className:Z(`rounded-md h-4 …bg-tooltip-tag px-1.5 text-ui-xs font-medium text-tooltip-tag-foreground`…)) ``；zai 块 `--color-tooltip-tag-foreground:#5c5c5c/#adadad`；活体页无 kbd 实例（未验渲染态） | 更正依据出处；深色 #9a9a9a→#adadad 或重取并留痕 |
| zcode-theme.ts | 浮层主/次文字 | tip-primary `#262626/#d4d4d4`、tip-secondary `#5c5c5c/#9a9a9a`（:63,:84） | `--color-tooltip-foreground` zai `#0d0d0d/#f8f8f8`；`--color-tooltip-tag-foreground` zai `#5c5c5c/#adadad` | `grep -a -o -- '--color-tooltip-foreground:[^;}]*'` → `#0d0d0d/#f8f8f8`；活体暗色 tooltip-foreground=`#f8f8f8`、tag-foreground=`#adadad` 实测；ZCode 自带成对前景且对比更高，repo 弃用自取 | 复核「AA 前提」（ZCode 值在其自身底上对比更高，并非不达标）或对齐 |
| zcode-theme.ts | 焦点色 | `--dcu-focus:#0b7fff`（浅）/#4099ff（深）（:310,:353） | zai 主题 `--color-input-border-focused:var(--color-border-hover)`（黑 20%/白 15%，非蓝）；focus-visible 环走 `focus-visible:ring-2 ring-ring/30` 令牌 | mmap：input-border-focused 共 4 处——base 2 处 `var(--color-brand)`、zai 2 处 `var(--color-border-hover)`；活体暗色实测 `#ffffff26`；`--color-ring:` 在 asar 0 命中（ring 令牌定义未检得）；`#4099ff` 仅见于 terminal-blue/usage-chart 族 | 静态证据下 ZCode 焦点非蓝；活体 focus 态无触发条件未采，登记待裁 |
| zcode-theme.ts | 反馈档曲线 | feedback=150ms `cubic-bezier(.4,0,.2,1)`（:131，自引 CDP「13 属性实测」） | asar `--ease-out:cubic-bezier(0, 0, .2, 1)`、`.ease-out{transition-timing-function:var(--ease-out)}`、`duration-150 ease-out` 15 处；`(.4,0,.2,1)` 在 asar 名为 `--ease-in-out` | asar 直查 + 活体变量实测（`--ease-out=(0,0,.2,1)`、`--ease-in-out=(.4,0,.2,1)`）；活体逐元素 transition 读数被 `data-document-hidden` 冻结（hidden:true，computed 全为 none/0s），CDP 口径无法复验 | CDP 复测时记录受测元素类名，裁决 `(.4,0,.2,1)` 来自哪些元素 |
| zcode-theme.ts | enter/exit/press 曲线 | enter `(.2,0,0,1)` / exit `(.4,0,1,1)` / press 90ms `(.2,0,0,1)`（:142-144） | `--animate-in: enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)…`——默认 `ease`，无这三条曲线 | mmap 直查（--animate-in/--animate-out 各 2 处同文）；时长 .15s 有据（见一致项），三条曲线无 ZCode 例证 | 注释已声明「保留意图分档」，但应显式标注「非 ZCode 值」以免被当成对齐产物 |
| zcode-theme.ts | 浮层 hover | `--dcu-tip-hover` rgba(13,13,13,.05) / rgba(255,255,255,.06)（:58,:81），注释自称「语义同侧栏 hover」 | `--color-menu-hover` 平值 `#f0f0f0/#363636` | `grep -a -o -- '--color-menu-hover:[^;}]*'` → `#f0f0f0/#363636`；活体暗色 `#363636` 实测；机制不同（alpha 叠加 vs 平值），且深色 .06 ≠ 本仓 sidebar-hover 的 .05 | 统一到 sidebar-hover 同值，或对齐 ZCode 平值机制 |

### 一致项

| 模块 | 项 | 双方值 | 证据来源 |
|---|---|---|---|
| zcode-theme.ts | 主色 | `#000000/#ffffff`（浅）、`#ffffff/#000000`（深） | asar zai 块 `--color-primary:#000/#fff`、`--color-primary-foreground:#fff/#000` 逐字一致；活体暗色 `#fff/#000` 实测 |
| zcode-theme.ts | 状态色·填充档 | `#e03131/#1e8a3e/#e07b00`（浅）+ `#ff5c5c/#46bf72/#ff8a30`（深） | asar `--color-destructive:#e03131/#ff5c5c`、`--color-success:#1e8a3e/#46bf72`、`--color-warning:#e07b00/#ff8a30` 逐值一致；活体暗色三值实测 |
| zcode-theme.ts | 侧栏 hover/selected/surface/border/header-border | rgba(13,13,13,.05)、rgba(255,255,255,.05)、rgba(255,255,255,.1)（selected 深）、rgba(13,13,13,.03)、rgba(255,255,255,.05)、rgba(13,13,13,.1)、rgba(255,255,255,.1)、header rgba(·,.05) | asar zai-light `--color-hover:#0d0d0d0d;--color-selected:#0d0d0d0d`、zai-dark `#ffffff0d/#ffffff1a`、`--color-surface:#0d0d0d08/#ffffff0d`、`--color-border:#0d0d0d1a/#ffffff1a` 全部同值（rgba(13,13,13,X)=#0d0d0dXX）；活体暗色 hover/selected/surface/border 四值实测；header 白 5% 另有 03e:23 CDP（oklab .9999/.0509） |
| zcode-theme.ts | 浮层底/描边/阴影 | `#f0f0f0/#2b2b2b`、rgba(13,13,13,.1)/rgba(255,255,255,.1)、`0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)` | asar `--color-tooltip:#f0f0f0/#2b2b2b`；`--shadow-md:0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`（rgba(0,0,0,.1)=#0000001a 同值）；浮层 JSX 29 处 `bg-popover…shadow-md`；活体暗色 `--color-tooltip=#2b2b2b` 实测 |
| zcode-theme.ts | 动效时长与常量 | move 200ms+(0,0,.2,1)、collapse 300ms+(.4,0,.2,1)、enter/exit 150ms、spinner 1s linear infinite | asar：侧栏 JSX `id:`sidebar`…duration-200 ease-out transition-[width,opacity]` 原文；`[data-zcode-collapsible-animate-close=true][data-state=closed]{animation:.3s ease-in-out forwards zcode-collapsible-up}`（仅关闭向有此动画，打开向 asar 无对应名）；`--animate-in/out` 默认 `.15s`；`--animate-spin:spin 1s linear infinite`；活体变量实测 spin/ease 同值 |
| zcode-theme.ts | 设置页导航项 | 16px / radius 12px | 03f §2.2 S1 双端 CDP（ZCode 16px/400/h32/r12）+ §2.4 双主题活体复核（文档侧证据，本轮未重跑 CDP） |
| zcode-theme.ts | 文档隐藏冻结 | `html[data-document-hidden] *,:before,:after{transition:none!important;animation:none!important}` | asar 原文同构 + 驱动函数 `R1n`（`visibilityState==='hidden'` → toggleAttribute）；活体实测 `hidden:true, vis:"hidden"` 且全页 computed transition=none/0s——规则正在生效 |
| zcode-theme.ts | reduced-motion | 五档时长归零 + 转圈/波浪停帧（:220-226） | asar `@media (prefers-reduced-motion:reduce){…animation:none}`（zcode-collapsible/stream 块）与 `motion-reduce:transition-none` 工具类；02-motion §4 同记；实现路径不同（变量归零 vs 工具类），语义一致 |
| schedule-sessions.ts | 组内排序 | 会话按 updatedAt 倒序（:41） | asar 13 处 updatedAt 降序比较（mmap 正则 `\.updatedAt\s*-\s*\w+\.updatedAt`），如 Claude session 扫描 `a.sort((d,m)=>m.updatedAt-d.updatedAt)` |
| zcode-theme.ts | 主题机制 | documentElement 挂 `theme-zai-light/dark` + `dark` class（:405-410）；暗色由宿主 body 属性驱动 | tokens.json meta `darkClass:"dark theme-zai-dark platform-mac-desktop"`；活体 className 实测同结构；宿主属性为唯一真源属 DSH 显式调整，:391-394 注释有声明 |

### 无参照项（不得猜）

- zcode-theme.ts 间距标度（4/8/12/16/24 及 DESIGN.md §Spacing 引文「Prefer a small set of repeated gaps…」，:146-175）——asar 0 命中。搜索模式：`Prefer a small set of repeated gaps`、`small set of repeated gaps`（均 0）；设计语言文档 01/02 亦无间距节。档位在 repo 侧有消费点，但 ZCode 侧无原始文献 —— 无 ZCode 例证，跳过。
- input-history-keyboard.ts 全部交互面（↑/↓ 召回草稿、边界接管、IME 跳过、`stopImmediatePropagation`，:20-62）——asar 无例证。搜索模式：`ArrowUp`（1013 处；正则 `ArrowUp.{0,200}history|history.{0,200}ArrowUp` 0 共现）、`draftHistory`/`inputHistory`/`draft-history`（0）、`previousMessages`（唯一命中为示例 chat 路由代码，非草稿召回）—— 无 ZCode 例证，跳过。
- tree-expansion.ts 持久化设计（key 命名 `dsh-codex-ui.*.v1`、500 条/512 字符上限，:3-8）——ZCode 侧无 localStorage 例证。搜索模式：asar `localStorage.setItem/getItem` 键全集仅 `${params.key}/expires_at/ftap5caavc/media-chrome-*/token/user/user_id/wba.${e}/zcode-theme/zcode:coding-plan:embedded`；引号串扫描 expand/collapse 无 UI 状态键 —— 无 ZCode 例证，跳过。
- schedule-sessions.ts 归属判定（id 前缀 `dsh-automation-session-`，:1,:19）与分组夹按任务名 `localeCompare(…,{numeric:true,sensitivity:'base'})` 排序（:45）——asar 无「按名称分组会话列表」对应物（检得：memories 按 updatedAt 降序+id 平局；task 比较器 `taskId.localeCompare` 平局）—— 无 ZCode 例证，跳过。
- zcode-theme.ts 第三档浮层文字与选中行次级档（`--dcu-tip-tertiary #686868/#a3a3a3`、`--dcu-selected-secondary #5c5c5c/#9a9a9a`）——ZCode tooltip/选中色板无第三档（仅 tooltip/tooltip-foreground/tooltip-tag/tooltip-tag-foreground 四槽；任务行时间戳恒用 foreground-subtle，03b §5，未见选中态专用档）。搜索模式：`--color-tooltip`（全部 12 处命中已逐条核对）、`--color-selected`（6 处上下文已核对）—— 无 ZCode 例证，跳过。

**纪律自检**：只读不改 src/tests；只新建本文件；未读 batch-\*/cross-\*；活体采样全程只读（未切换主题、未派发输入）；浅色活体与 focus 态未采，均标未验证。
