# 夜2 · 面 2 · 悬停卡与 tooltip（2026-11-03）

> 插件文件：`src/client/hover-shell.tsx`、`src/client/hover-tip.ts`、`src/client/workspace-hover-card.tsx`（连带卡 CSS 所在的 `CodexWorkspaceBrowser.tsx`、令牌所在的 `zcode-theme.ts`、会话卡 `session-tree.tsx`）。
> 已先读 `night-audit/APPLIED.md`（批次 16 已把显示延迟 1000→300ms 落地；批次 2/8 已落浮层色板——本文不重复报）与 `README.md`。
> 本轮全部 asar 引证来自**本轮新提取**（见 §0），非沿用缓存。

## 0 · 提取方法（本轮实跑）

```
python3（asar pickle 头）：first16 = 0400000094157f0090157f0089157f00
  → header_object_size=8328596, data_start=8328604
  → /out/renderer/assets/styles-NK68EN_n.css (480065B, offset 356452623)
  → /out/renderer/assets/styles-Dv5E6Odo.js  (6839502B)
  提取到 /tmp/night2-s2/{styles.css, main-bundle.js}
shasum：styles.css = 5fdc1e11394c5d61c3199a0f91a58f1307661d66
  = 缓存 /tmp/zcode-styles.css（10-30 版）→ 样式表基线未漂移；
  主 bundle 已换新（批次16 用的 styles-CQuzX8si.js 6705135B → 现 6839502B），
  批次16 引的 pje 现名 NNe，配置逐字相同（见 §2.1）。
```

以下「asar」指 `/tmp/night2-s2/main-bundle.js`，「css」指 `/tmp/night2-s2/styles.css`，均可按上面命令复现。

## 1 · 结论速览

- **模型解密（本轮最大收获）**：ZCode 侧栏任务行悬停 = **单行 tooltip**（状态图标 + 标题 + `·` + git 增减统计，side=right/offset 6），非富卡；但 ZCode 另有**可交互悬停卡**两个先例：HoverCard（bg-popover）与**模型选择器卡 p2e（`bg-tooltip` + `rounded-xl` + `shadow-md` + 可交互）**。插件 `dcu-wb-tip` 的「tooltip 底 + 卡片形 + 可交互」混搭在 ZCode 有 p2e 先例背书，**不是错误**。
- 差异 9 条（mechanical 5 / deviation 3 / needs-live 1），最大的一条更正了夜审批次 8 的取值：浅色浮层主文字 ZCode 真值是 **#0d0d0d**（`.theme-zai-light` 覆盖档），不是 tokens.json 记的基档 #0a0a0a。

## 2 · ZCode 真值（本轮全量提取）

### 2.1 全局 Provider（`NNe`，asar）

```
MNe.Provider value=!0 + Uy{delayDuration:300, skipDelayDuration:0, alwaysDelay:!0, disableHoverableContent:!0}
```
旁证排除：`delayDuration:Kzn`（`Kzn=1500`，浏览器标签页 tooltip，side bottom）、`delayDuration:0` ×1（预览类浮层）——300 唯一对应全局侧栏组，与批次 16 判读一致（新 bundle 复核）。
Radix 库默认（同文件）：`delayDuration=700, skipDelayDuration=300`；`alwaysDelay` 语义 = 即使在 skip 窗口内也照常吃满 delay → **ZCode 每次出现 tooltip 都等 300ms，无「已开卡则秒切」**。

### 2.2 TooltipContent（`Ky`，asar）——类名全文

```
z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin)
items-center gap-1.5 rounded-lg border border-border bg-tooltip px-3 py-1.5 text-ui-sm
text-tooltip-foreground has-data-[slot=kbd]:pr-1.5
data-[side=bottom]:slide-in-from-top-2  data-[side=left]:slide-in-from-right-2
data-[side=right]:slide-in-from-left-2  data-[side=top]:slide-in-from-bottom-2
**:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm
data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95
data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95
data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95
```
- 有 provider 时内容 `pointerEvents:"none"` 且 portal 外再包 `div.pointer-events-none` → **ZCode tooltip 不可进入、不可交互**。
- 编译产物（css）：`.data-\[state\=delayed-open\]\:animate-in[data-state=delayed-open]{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)…}` → **150ms、缓动 = 浏览器默认 `ease`**（类串里无 ease 工具类；`--ease-out:(0,0,.2,1)` 存在但未挂到 tooltip）；`data-[side=right]` 用 `slide-in-from-left-2{--tw-enter-translate-x:calc(2*var(--spacing)*-1)}` = **起点横移 −8px**；`zoom-in-95` = 起点 scale .95；`data-closed` 走同参数 `exit`。
- `enter/exit` 关键帧全文已提取（css）：opacity/translate3d/scale3d/rotate/blur 组合。

### 2.3 RichTooltip（`Jy`）与 TitleTooltip（`Yy`，asar）

- 默认 side top / align center / **sideOffset 2**；有 description：`max-w-72 flex-col items-start gap-1.5 px-3 py-2 text-left`；无：`max-w-[min(28rem,calc(100vw-1rem))] items-center gap-2 px-2.5 py-1 text-left has-data-[slot=kbd]:pr-1`。
- 标题 `text-ui-sm font-medium leading-4 text-tooltip-foreground`；描述 `max-w-64 text-ui-sm/relaxed text-tooltip-foreground/80`；快捷键经 Kbd。
- `Yy`：`title` 属性 → 自动转 RichTooltip（截断标题的原生 title 增强）。

### 2.4 Kbd 键帽（`qy`，asar）

```
rounded-md h-4 inline-flex shrink-0 items-center bg-tooltip-tag px-1.5 text-ui-xs
font-medium text-tooltip-tag-foreground + (mac ? tracking-normal : font-mono)
mac 时 fontFamily:"-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif"
```
调用点全量 4 处：RichTooltip×2、composer effort 快捷键、设置页快捷键绑定（`QQn`）。菜单内快捷键**不是** Kbd 芯片：dropdown-menu-shortcut（`nx`）= `ml-auto text-ui-xs tracking-widest text-foreground-subtlest`（高亮转 `text-foreground-subtle`），纯文字无底。

### 2.5 侧栏任务行 tooltip（任务分组列表，asar）

```
Wy > Gy(asChild 行) + Ky{side:"right", align:"center", sideOffset:6}
内容：状态图标 size-3.5 ＋ span.min-w-0.max-w-48.truncate(任务名) ＋
     [有 git 统计时] span.text-tooltip-foreground/60"·" + M.map(±N → text-diff-added/text-diff-removed)
```
行标题另走 `FL{title}` → `Yy` 富 tooltip。diff 色：浅 #1e8a3e/#e03131、深 #46bf72/#ff5c5c（均 `.theme-zai-*` 块）。

### 2.6 可交互悬停卡两先例（asar）

- **HoverCardContent（`sE`）**：`z-50 w-72 rounded-lg bg-popover p-2.5 text-ui-base/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=*]:slide-in-from-*-2 data-open:animate-in…data-closed:animate-out…`，align center / sideOffset 4 默认。Radix 默认 openDelay 700/closeDelay 300；应用层各处：0/0、300/100（`xyt=100`）、120/80。
- **模型选择器卡（`p2e`）**：`w-80 rounded-xl border border-border bg-tooltip p-1 text-tooltip-foreground shadow-md ring-0`（side top）——**tooltip 色组 + rounded-xl + 可交互**，即插件卡混搭的 ZCode 先例。
- 轮次导航悬停卡：`sE side:"right" sideOffset:8 w-80 max-w-[calc(100vw-2rem)] border border-popover-border bg-popover p-3 shadow-lg`（testid `v4-turn-navigator-tooltip`）。

### 2.7 令牌（css，`.theme-zai-light`/`.theme-zai-dark` 覆盖块；块序已验证：`:root,:host` 在 offset 23480，zai-light 在 436138 → 覆盖生效）

| 令牌 | 浅 (zai-light) | 深 (zai-dark) |
|---|---|---|
| `--color-tooltip` | `#f0f0f0` | `#2b2b2b` |
| `--color-tooltip-foreground` | **`#0d0d0d`**（基档为 `var(--color-neutral-950)`=oklch(14.5% 0 0)=#0a0a0a，被 zai-light 覆盖） | `#f8f8f8` |
| `--color-tooltip-tag` / `-foreground` | `#e6e6e6` / `#5c5c5c` | `#363636` / `#adadad` |
| `--color-border` | `#0d0d0d1a` | `#ffffff1a` |
| `--color-popover` | `#fff` | `#2b2b2b` |
| 次要文字机制 | **无离散 secondary**，用 `text-tooltip-foreground/60`、`/80`（= oklab 与 transparent 混合，构建期回退 `#0a0a0a99`/`#0a0a0acc`） | 同左（深基档回退 `#fafafa99`） |

字号：`:root{--ui-font-size:14px}` → `text-ui-sm`=**12px**、`text-ui-xs`=**10px**、`text-ui-base`=14px；`--leading-relaxed:1.625`。圆角：sm 4 / md 6 / lg 8 / xl 12（px）。`--shadow-md:0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`；`--shadow-lg:0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a`。`--color-muted-foreground` **不存在**（css 0 命中）。reduced-motion：css 22 条 RM 规则**均不覆盖 tooltip/hover-card**。

## 3 · 差异表（9 条）

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | uiplug/src/client/zcode-theme.ts:63 | 浅色浮层主文字 `--dcu-tip-primary` | `#0a0a0a` | **`#0d0d0d`**（`.theme-zai-light` `--color-tooltip-foreground`） | **mechanical** | css `--color-tooltip-foreground` 4 处命中逐一验选择器：`:root,:host`=基档、`.dark`=基档、zai-light=`#0d0d0d`、zai-dark=`#f8f8f8`；块序 zai-light(436138) > :root(23480)。**更正夜审批次 8**：其引 design-language/tokens.json:120 `oklch(14.5% 0 0)` 是 `:root` 基档，漏了 zai-light 覆盖档。消费面：`.dcu-wb-tip`、`.dcu-wb-tip-edit`、`.dcu-wb-tip-pin:hover`（CodexWorkspaceBrowser.tsx:285）+ 归档弹窗文字（archive-confirm.ts:26） |
| 2 | CodexWorkspaceBrowser.tsx:285 + zcode-theme.ts:142 | 进入动画形态 | fade + `translateY(4px)`、`cubic-bezier(.2,0,0,1)`、150ms | fade + **scale .95→1** + **起点位移 8px**（按 side 定轴）+ 150ms + **默认 `ease`** | mechanical | `@keyframes dcu-tip-in{from{opacity:0;transform:translateY(4px)}…}`（:285）；ZCode：§2.2 类串 + 编译产物 `[data-state=delayed-open]{animation:enter …var(--tw-ease,ease)…}`、`slide-in-from-left-2[data-side=right]{--tw-enter-translate-x:calc(2*var(--spacing)*-1)}`、`zoom-in-95{--tw-enter-scale:.95}` |
| 3 | CodexWorkspaceBrowser.tsx:285 / hover-shell.tsx:87 | 消失动画 | 120ms 后**瞬时卸载**（`setHoverTip(undefined)`），无退出动画 | `data-closed:animate-out fade-out-0 zoom-out-95` = 150ms 对称退出 | mechanical | §2.2 编译产物 `[data-state=closed]{animation:exit…}`；02-motion.md:354 已定「浮层退出 150ms」档。落地需退出关键帧 + 延迟卸载（保留 120ms hide 延迟，动画并入该窗口） |
| 4 | hover-shell.tsx:70-74 | 换行交接时序 | 已开卡 → **立即**切换（`tipRef.current !== undefined` 走 immediate） | `alwaysDelay:!0 + skipDelayDuration:0` → **每个 tooltip 都吃满 300ms**，无秒切 | mechanical | §2.1 `NNe` 原文 + Radix `alwaysDelay` 语义。落地后需 9223/9224 真机复验「划过空行闪现」不回归（:69 注释声明的手感风险） |
| 5 | hover-shell.tsx:69 / zcode-theme.ts:64 | 注释失真 ×2 | 「划过空行必须停满 **1 秒**」（实际常量已是 300ms）；「ZCode Kbd 组件用 **text-muted-foreground**」 | — | mechanical（仅注释） | 批次 16 改值后注释未跟；`--color-muted-foreground:` 在 css `grep` 0 命中，Kbd 实际用 `text-tooltip-tag-foreground`（§2.4）。零行为改动 |
| 6 | zcode-theme.ts:63/84 | 次要文字档机制 | 离散值 `#5c5c5c`/`#9a9a9a` | **`/80` 透明度混合**（`color-mix(in oklab, tooltip-foreground 80%, transparent)`；叠浅底 ≈#3a3a3a、叠深底 ≈#cfcfcf）；插件 tertiary `#686868`/`#a3a3a3` 已≈60% 混合值（60% 精确 = #686868） | **deviation**（触批次 8 浮层色板裁决域；两端 AA 均过，纯保真度差，登记不修） | §2.7 令牌机制 + `.text-tooltip-foreground\/80{color:color-mix(…)}`（css）；消费面：卡 meta/row（CodexWorkspaceBrowser.tsx:285）+ 归档弹窗描述（archive-confirm.ts:29） |
| 7 | zcode-theme.ts:87 | 键帽文字深色 `--dcu-kbd-foreground` | `#9a9a9a` | `#adadad`（`--color-tooltip-tag-foreground` zai-dark） | **deviation**（消费方是菜单/搜索键帽 CodexSidebar.tsx:158,328，非本面；已按侧栏底 AA 重取，登记 ZCode 真值备用） | §2.4/§2.7；浅色 #5c5c5c 两端一致 ✅ |
| 8 | workspace-hover-card.tsx:29-42 | 卡可交互性 | 卡可悬停进入（`keepTip`）、带 pin/edit 按钮、外部 pointerdown 关闭 | tooltip 内容 `pointer-events:none` + provider `disableHoverableContent:!0` → **不可进入不可交互** | **deviation**（功能增强：ZCode 侧栏无同构交互卡；最近先例 = p2e 模型选择器卡，登记不修） | §2.2/§2.6；APPLIED.md「属功能增强，非对齐」口径 |
| 9 | CodexWorkspaceBrowser.tsx:285 | 卡圆角 `--dsw-radius-xl` | `var(--dsw-radius-xl)`（**宿主令牌，插件 src 0 定义**，静态无 resolved 值） | 8px（tooltip/hover-card 均 `rounded-lg`）或 12px（p2e `rounded-xl`） | **needs-live** | `grep -rn -- '--dsw-radius-xl:' uiplug/src` → 0 定义文件（仅 .bak 注释引用）；若 9223 读出 12px → 与 p2e 先例一致无需动；若非 12px → 与两个先例都不符，届时定档 |

## 4 · 已对齐表（本轮逐项验证，非沿用旧账）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| 显示延迟 300ms | hover-shell.tsx:19 `HOVER_TIP_SHOW_DELAY_MS=300` | `delayDuration:300` | §2.1（新 bundle NNe 复核；批次 16 落地值仍与最新 asar 一致） |
| 卡底色（tooltip 组） | `--dcu-tip-bg:#f0f0f0`/`#2b2b2b`（zcode-theme.ts:58/81） | `--color-tooltip` 同值 | §2.7；且 p2e 可交互卡同用 `bg-tooltip` → 组别有先例 |
| 描边色 | 卡用 `--dcu-sidebar-border` rgba(13,13,13,.1)/rgba(255,255,255,.1)（CodexWorkspaceBrowser.tsx:285；zcode-theme.ts:310/353） | `--color-border` `#0d0d0d1a`/`#ffffff1a` | 逐字相等（#0d0d0d1a = rgba(13,13,13,.1)） |
| 阴影 | `--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)`（zcode-theme.ts:58） | `--shadow-md:0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a` | 逐字相等（rgba(0,0,0,.1)=#0000001a） |
| 深色主文字 | `#f8f8f8`（zcode-theme.ts:84） | zai-dark `--color-tooltip-foreground:#f8f8f8` | §2.7 |
| 标题行 gap | `gap:6px`（CodexWorkspaceBrowser.tsx:285 `.dcu-wb-tip-title`） | Ky `gap-1.5` = 6px（`--spacing:.25rem`） | §2.2 |
| 右侧锚点间距 | `rect.right + 8`（hover-tip.ts:11） | 轮次导航卡 `sideOffset:8`（任务行 tooltip 用 6、rich 默认 2 —— 8 在 ZCode 族内） | §2.6 |
| 键帽浅色 | `--dcu-kbd-foreground:#5c5c5c`（zcode-theme.ts:67） | `--color-tooltip-tag-foreground` zai-light `#5c5c5c` | §2.7 |
| tertiary ≈ 60% 混合 | `#686868`/`#a3a3a3` | `/60` 混合浅底精确 = #686868、深底 ≈#a6a6a6 | §3#6 同源计算 |
| 卡字号 14px | `--dsw-font-size-base`（宿主令牌，:285） | 可交互卡档 `text-ui-base`=14px（sE/p2e；tooltip 档才是 12px） | §2.6 |
| reduced-motion | 双保险：RM 媒体查询下五档时长归零（zcode-theme.ts:220-222）+ 卡 `animation:none`（:285） | ZCode 对 tooltip 无 RM 规则（22 条 RM 规则 0 覆盖） | 插件**超出** ZCode，不属缺口 |

## 5 · 无参照表（附穷尽搜索记录，均本轮实跑）

| 项 | ours | 搜索记录（命令/命中） | 判定 |
|---|---|---|---|
| 隐藏延迟 120ms | hover-shell.tsx:20 | `grep -a -o "skipDelayDuration[:=][0-9a-zA-Z_$]*"` → `0×3, r×1`；closeDelay 各处 = 0/100(`xyt`)/80/Radix 默认 300——均为「悬停卡关闭前缓冲」，无 tooltip 关闭延迟常量；批次 16 同判，本轮以新 bundle 更新证据 | ZCode 无对应机制，保留 |
| 卡宽 316 / 248、估高 152 / 148 | hover-shell.tsx:21,58-59 | ZCode 宽档全集：`max-w-48`(192 任务名)、`w-72`(288 hover-card/rich)、`w-80`(320 p2e/turn-nav)、`max-w-xs`(320)、`max-w-64`(256 desc)——全是 max-width 无固定宽；批次 16 同判 | 无同构卡，保留 |
| 视口 clamp pad=8 | hover-tip.ts:3-7 | Ky/sE 均未传 `collisionPadding`，Radix popper 内部处理，无常量可比 | 无参照 |
| 卡 padding 组合 8/12（workspace 8） | CodexWorkspaceBrowser.tsx:285（`--dcu-space-2/3`=8/12，zcode-theme.ts:171-172） | ZCode 四档：tooltip `px-3 py-1.5`(12/6)、hover-card `p-2.5`(10)、p2e `p-1`(4)、turn-nav `p-3`(12)——无「多行卡+分隔线」样本可对 | 各档并存、无主判据 |
| 卡内分隔线（1px，margin 8/0/4） | `.dcu-wb-tip-sep`（:285） | Ky/sE/p2e 内容均无分隔线样本 | 无参照 |
| 时间戳展示与 `time` 死载荷 | hover-tip.ts:36-43；`time` 在 CodexWorkspaceBrowser.tsx:964,1105、ScheduleBrowser.tsx:161、ChannelBrowser.tsx:138 传入，但两张卡均不渲染（workspace-hover-card.tsx:29-42、session-tree.tsx:55-58，注释声明去时间） | ZCode 任务行 tooltip 不显示时间（§2.5 内容全集） | 时间分档无 ZCode 参照；`time` 载荷属代码健康问题（非设计差异），留给功能轮 |
| git 增减统计 / 状态图标前置 | 插件卡无 | ZCode 任务行 tooltip 有（§2.5） | 反向功能差异，属「补齐=功能增强」，不在对齐范围（APPLIED 口径） |
| ZCode Kbd 键帽全规格（h16/px6/r6/10px/mono↔苹果栈/tag 底） | 插件悬停卡无键帽消费点 | `\(qy,\{` 全量 4 处（§2.4）；菜单键帽另有 `nx`（纯文字 tracking-widest）——插件 `.dcu-menu-kbd`（CodexSidebar.tsx:158）是芯片样式，与 ZCode 菜单纯文字不同，**属菜单面**，批次 2/15 域 | 本面登记真值（§2.4），供将来「tooltip 补快捷键」功能轮直接取用 |

## 6 · 复核清单（供落地轮）

1. 差异 #1/#2/#3/#5 纯 CSS/注释，落码后跑 `node tests/run-assertions.mjs` + `node scripts/gate.mjs`。
2. 差异 #4 改 hover-shell 状态机：落码后必须 9223/9224 真机复验「划过空行不闪现」+ 换行 300ms 手感。
3. 差异 #9：活体读 `getComputedStyle(卡元素).borderRadius`（9223 插件面）对照 12px。
4. 批次 8 的 tokens.json 侧记录（`--color-tooltip-foreground` 浅档）建议由文档轮补 zai-light 覆盖档 #0d0d0d 一行（本文不改文档，仅登记）。

## 复核（独立复核员 · 2026-11-03）

> 复核范围：§3 差异表 9 条——mechanical 与 needs-live 全核，deviation（#6/#7/#8）只核证据是否成立。**全部 asar 引证来自本轮重新提取**：自跑 pickle 头解析 + JSON 目录定位，从 `/Applications/ZCode.app/Contents/Resources/app.asar` 提取到 `/tmp/review-s2/`（非沿用 /tmp/night2-s2 缓存）。styles.css sha1 = `5fdc1e11394c5d61c3199a0f91a58f1307661d66`、size 480065B；主 bundle = `styles-Dv5E6Odo.js`、size 6839502B——均与 §0 记录一致。活体读值经 CDP `Runtime.evaluate`（127.0.0.1:9223）。下文 `css` = /tmp/review-s2/styles.css，`bundle` = /tmp/review-s2/main-bundle.js，`src` = uiplug/src/client/。

**总判定：8 条 verified，1 条 unconfirmed（#9——其证据前提被推翻，且已顺手活体读值闭环）。**

**提取方法（§0）：verified。** first16 = `0400000094157f0090157f0089157f00` 逐字节复现；第二个 u32=8328596 为 header pickle 总长，data_start = 8+8328596 = 8328604，与 §0 结论一致；`--color-tooltip` 基档 `:root,:host` 实测 @23480 ✓。

### 逐条 verdict

- **#1 verified**（ZCode 真值坐实；且该差异已被落地轮关闭）。css 中 `--color-tooltip-foreground` 恰 4 处命中，选择器逐一验证：@23521 `:root,:host` → `var(--color-neutral-950)`（实测该基 token = `oklch(14.5% 0 0)`）；@426148 `.dark` → `var(--color-neutral-50)`；@436170 `.theme-zai-light` → **`#0d0d0d`**；@443820 `.theme-zai-dark` → `#f8f8f8`。块序 zai-light(436170) > :root(23521) → 覆盖生效。（小出入：§2.7 记 zai-light offset 436138，实测 `--color-tooltip` 在 436146、436138 处是前一枚 token 尾部 `st:#fff;`——8 字节锚点取法差异，不改变结论。）「ours」列：文档写作时点确为 `#0a0a0a`——git 提交 `50ac768`（2026-11-03 00:58，晚于本文 00:45）diff 含 `- --dcu-tip-primary:#0a0a0a → + #0d0d0d`；当前 src/zcode-theme.ts:63 已是 `#0d0d0d`。**更正批次 8 的论证成立**：design-language/tokens.json:120 实读 `"light": "oklch(14.5% 0 0)"` 只记基档、无 zai-light 覆盖档。消费面实读：CodexWorkspaceBrowser.tsx:285 `.dcu-wb-tip/.dcu-wb-tip-edit/.dcu-wb-tip-pin:hover` 均 `color:var(--dcu-tip-primary)`、archive-confirm.ts:26 `.dcu-archive-dialog{color:var(--dcu-tip-primary)}`。
- **#2 verified**。ours：CodexWorkspaceBrowser.tsx:285 实读 `@keyframes dcu-tip-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}` + `animation:dcu-tip-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)`；zcode-theme.ts:142 = `150ms / cubic-bezier(.2,0,0,1)`。ZCode：css `.data-\[state\=delayed-open\]\:animate-in[data-state=delayed-open]{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)…}`（150ms + 默认 `ease`）；`.zoom-in-95{--tw-enter-scale:.95}`；`.data-\[side\=right\]\:slide-in-from-left-2[data-side=right]{--tw-enter-translate-x:calc(2*var(--spacing)*-1)}` × `--spacing:.25rem` = **起点横移 −8px**；bundle @900304 Ky 类串与 §2.2 逐字一致、串内无 ease/duration 工具类；`--ease-out:cubic-bezier(0, 0, .2, 1)` 存在但未挂到 tooltip。两端形态差异（scale .95→1 + 按轴位移 8px vs translateY(4px)；`ease` vs `cubic-bezier(.2,0,0,1)`）成立。
- **#3 verified**。ours：hover-shell.tsx:20 `HOVER_TIP_HIDE_DELAY_MS=120`、:87 `setHoverTip(undefined)` 瞬时卸载；CodexWorkspaceBrowser.tsx:285 仅有 `dcu-tip-in` 关键帧、无退出动画。ZCode：css `.data-\[state\=closed\]\:animate-out[data-state=closed]{animation:exit var(--tw-duration,.15s)var(--tw-ease,ease)…}` + `.data-\[state\=closed\]\:fade-out-0{--tw-exit-opacity:0}` + `.data-\[state\=closed\]\:zoom-out-95{--tw-exit-scale:.95}`，Ky 类串含 `data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95`，exit 关键帧 = opacity/translate3d/scale3d/rotate/blur → 对称 150ms 退出成立。02-motion.md:354 实读 `| 浮层退出 | … | 120ms | **150ms** |` ✓。
- **#4 verified**。ours：hover-shell.tsx:70-74 实读 `if (options?.immediate === true || tipRef.current !== undefined) { … setHoverTip(place(tip)); return }` → 已开卡换行立即切换。ZCode：bundle 实读 `NNe` = `MNe.Provider value:!0 + Uy{delayDuration:300,skipDelayDuration:0,alwaysDelay:!0,disableHoverableContent:!0}`（逐字）；`Uy` 把 alwaysDelay 传播为每个 tooltip 独立 provider（`Wy`：`delayDuration:t, skipDelayDuration:0, disableHoverableContent:!0`）→ 每次吃满 300ms、无秒切；Radix 库默认 `fSe=700` / `skipDelayDuration=300`；`delayDuration:0` 全 bundle 恰 1 处；`Kzn=1500`（`qzn` 浏览器标签页 tooltip，side bottom）。
- **#5 verified**。hover-shell.tsx:69 注释实读「划过空行必须停满 **1 秒**才出现」，而 :19 `HOVER_TIP_SHOW_DELAY_MS=300` → 注释失真属实；zcode-theme.ts:64 注释实读「ZCode Kbd 组件用 **text-muted-foreground**」，bundle 中 `qy`（Kbd）实读类串 = `bg-tooltip-tag … text-tooltip-tag-foreground`；`grep -ac -- '--color-muted-foreground:' css` → **0**。两条失真均成立，均为纯注释。
- **#6 deviation 证据成立（verified）**。src/zcode-theme.ts:63 `#5c5c5c/#686868`、:84 `#9a9a9a/#a3a3a3` 离散值；css 实读 `.text-tooltip-foreground\/80{color:color-mix(in oklab, var(--color-tooltip-foreground) 80%, transparent)}`（另有构建期回退字面量 `{color:#0a0a0acc}`；/60 同构、回退 `#0a0a0a99`）——§2.7「构建期回退」逐字命中。混合值本轮精算（oklab 混 transparent 后叠底）：浅底 80% = **#3a3a3a**、深底 80% = **#cfcfcf**、浅底 60% = **#686868**（与 `--dcu-tip-tertiary` 精确相等）、深底 60% = **#a6a6a6**——与正文全部一致。消费面：CodexWorkspaceBrowser.tsx:285 `.dcu-wb-tip-meta/.dcu-wb-tip-row{color:var(--dcu-tip-secondary)}`、archive-confirm.ts:29 `.dcu-archive-desc{color:var(--dcu-tip-secondary)}`。
- **#7 deviation 证据成立（verified）**。src/zcode-theme.ts:87 `--dcu-kbd-foreground:#9a9a9a`；css zai-dark `--color-tooltip-tag-foreground:#adadad`（@443820）、zai-light `#5c5c5c`（@436170）——「浅色两端一致 ✅」成立（src/zcode-theme.ts:67 = `#5c5c5c`）。消费方行号精确：CodexSidebar.tsx:158 `.dcu-menu-kbd` 与 :328 `.dcu-search-hint kbd` 均 `color:var(--dcu-kbd-foreground,var(--dcu-sidebar-secondary))`。
- **#8 deviation 证据成立（verified）**。ours：workspace-hover-card.tsx:29 `onMouseEnter={keepTip} onMouseLeave={hideTip}`、:36 pin 按钮、:41 edit 按钮、:20-21 window 捕获外部 pointerdown 关闭。ZCode：bundle 实读 Ky 在 provider 存在时 `style:{...r,pointerEvents:\`none\`}` 且外层再包 `div.pointer-events-none`；`NNe` `disableHoverableContent:!0`。p2e 先例实读：`p2e=({align:e=\`start\`,className:t,...n})=>jsx(sE,{align:e,className:Z(\`w-auto p-2\`,t),...n})`（sE=HoverCardContent 包装 → 可交互），调用点类串 `w-80 rounded-xl border border-border bg-tooltip p-1 text-tooltip-foreground shadow-md ring-0`、`side:\`top\``——与 §2.6 逐字一致；sE 默认 `align:center, sideOffset:4` ✓。
- **#9 unconfirmed**（needs-live 前提被推翻）。原文证据「`grep -rn -- '--dsw-radius-xl:' uiplug/src` → 0 定义」可复现（我跑同一命令 → 0 命中），**但该模式漏掉 TS 对象键写法**：src/zcode-tokens.ts:508 实读 `'--dsw-radius-xl': '12px'`（`ZCODE_STRUCTURAL` 映射表），zcode-skin.ts:97-98 将其渲染为 `:root:root{…}` 与 `:root:root body{…}`（renderTokenBlock 原样吐 `name:value`），index.ts:164 `ctx.effect(() => installSkin(),…)` 运行时安装。「插件 src 0 定义、静态无 resolved 值」不成立。活体读值（我跑的 CDP，9223）：`getComputedStyle(html/body).getPropertyValue('--dsw-radius-xl')` = **"12px"**（html 与 body 均是）→ 卡的 `border-radius:var(--dsw-radius-xl)` 静态+活体都是 12px = p2e `rounded-xl`（css `--radius-xl:.75rem`=12px）→ **按原文自己的决策规则（「若读出 12px → 与 p2e 先例一致无需动」）无需动，needs-live 分类不再必要**。ZCode 侧两档值本身 ✓：`--radius-lg:.5rem`=8px、`--radius-xl:.75rem`=12px，Ky/sE `rounded-lg`、p2e `rounded-xl`。（注：卡元素本身未悬停、无 `.dcu-wb-tip` computed 样本；读的是根/body 的属性解析值，卡为其后代直接继承。）另：「仅 .bak 注释引用」措辞不准——非 .bak 的 src 文件（CodexSidebar.tsx、ConnectorsSection.tsx 等）也有 `var(--dsw-radius-xl)` 消费引用。

### 复核中一并证实的旁证

§0 主 bundle 尺寸 6839502B ✓；§2.4 Kbd 类串与 mac fontFamily 逐字 ✓；§2.6 sE 类串（`w-72 rounded-lg bg-popover p-2.5 … duration-100`）与默认 align/sideOffset ✓；§2.7 tooltip/tag 令牌值（#f0f0f0/#2b2b2b、#e6e6e6/#5c5c5c、#363636/#adadad）✓。未跑的检查：`node tests/run-assertions.mjs` / `node scripts/gate.mjs`（属落地轮验收项，非本表差异内容，不在本次复核范围）。
