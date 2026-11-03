# night2 · surface-14 · 主题层叠定案（.theme-zai-light / .theme-zai-dark / :root 全块 + 9 条文档冲突裁决）

> 采样通道：全部为 asar 静态提取（本轮未跑 9224/CDP 活体；「活体实测」字样均引用既有记录并注明出处）。
> 对照前先读了 `night-audit/APPLIED.md`（不重复报其已落地条目）与 `README.md`。
> 涉及插件文件：`src/client/zcode-theme.ts`、`src/client/zcode-tokens.ts`（辅证：`sidebar-width.ts`、`conversation-layout.ts`、`skin-envelope.ts`）。

## 0. 提取命令记录（本轮实际执行）

```
python3 <workspace>/asar_tool.py /Applications/ZCode.app/Contents/Resources/app.asar list '\.css$'
  → out/renderer/assets/styles-NK68EN_n.css (480065B) 与 surface-1 同一构建
python3 <workspace>/asar_tool.py … cat out/renderer/assets/styles-NK68EN_n.css /tmp/zc-surface14/styles-NK68EN_n.css
python3 <workspace>/asar_tool.py … cat out/renderer/assets/styles-Dv5E6Odo.js /tmp/zc-surface14/styles-Dv5E6Odo.js  (6839502B)
python3 <workspace>/asar_tool.py … cat out/renderer/assets/chunk-BO2N2NFS--i48C_fO.js /tmp/zc-surface14/streamdown.js  (448665B, streamdown 仓库码块组件)
python3 <workspace>/asar_tool.py … grep 'sdm-bg'  → 2 个文件命中（node_modules/streamdown/dist/chunk-BO2N2NFS.js + 上面 bundle 副本）
# 以下引用均按「括号内字节偏移」从上述提取文件中定位（大括号配对取整块，非抽查）
```

## 1. 运行时层叠推导（按文件内出现顺序）

`styles-NK68EN_n.css` 内语义主题共四层，选择器特异性同为 (0,1,0)（基底层为 `:root,:host`），**同特异性下后声明者胜**：

| 层 | 位置 | 内容 |
|---|---|---|
| ① 基底层 `:root,:host`（@layer theme，@6119 起多段） | @6119–24780 | Tailwind `@theme`：neutral 色板、`--font-sans/--font-mono`、radius/shadow/ease/`--ui-font-size` 刻度、**浅色基准值**（`--color-sidebar:var(--color-neutral-100)`=#f5f5f5、`--color-background:var(--color-neutral-50)`=#fafafa、`--color-foreground:var(--color-neutral-700)`=#404040 @21548、`--color-input-border-focused:var(--color-brand)`=天蓝） |
| ② `.dark` 系（@415443–429461） | Tailwind `dark:` 变体基准暗色 | background=neutral-900(#202020)、foreground=neutral-200(#e5e5e5)、card=neutral-800… |
| ③ `.theme-zai-light` 系（@429610–436747） | zai 浅色覆盖 | **--color-background:#f8f8f8(@429772)、--color-sidebar:#f0f0f0(@430577)、--color-brand:#000(@430033)、--color-foreground:var(--color-neutral-800)(@434378)、subtle #26262699、subtlest #26262666、input-border-focused=border-hover（中性）** |
| ④ `.theme-zai-dark` 系（@437336–444981） | zai 深色覆盖（文件内最后） | background=#161616、sidebar=#161616、panel/header=#202020、card/menu/tooltip/toast=#2b2b2b、foreground=neutral-300(#d4d4d4 @442033)、subtle #d4d4d499、subtlest #d4d4d44d |

**运行时挂载机制**（styles-Dv5E6Odo.js@111068，`bd(e)`）：暗色时 `html` 同时挂 `.dark` **和** `.theme-zai-dark`，亮色挂 `.theme-zai-light`：

```js
document.documentElement.classList.toggle(`dark`, t===`dark`),
document.documentElement.classList.toggle(`theme-zai-light`, n===`zai-light`),
document.documentElement.classList.toggle(`theme-zai-dark`, n===`zai-dark`)
```

⇒ 暗色下 ②④ 同时命中、④ 在文件更后 ⇒ **zai 值生效**；亮色下只有 ③。运行时真值 = zai 覆盖层，基底层只在「无主题类」时兜底。
插件侧 `syncZCodeTheme`（zcode-theme.ts:405-410）与 `bd()` 同构（同挂 dark + theme-zai-* 于 documentElement），机制 ✅。

**① 层补充**：`:root`@414603 定义 `--ui-font-size:14px`(@414642) 与 `--shadow-composer-soft:0 0 #0000`；zai-light/zai-dark 各自重定义 composer-soft（浅 `0 1px 3px #0000000a,0 6px 18px #0000000a` @429610）。`--color-ring` 被 wf-tile/composer 滑杆消费（@314、@457047）但**全 CSS 无定义**。

## 2. 根因裁定：tokens.json 的浅色列是「无主题类的基底层」

`tokens.json` `_meta`：`"darkClass": "dark theme-zai-dark platform-mac-desktop"`，但 `"lightClass": " theme-zai- platform-mac-desktop"` —— **浅色采样时 `theme-zai-light` 类没有挂上（类名残缺为 `theme-zai-`）**。因此其 231 个浅色值全部是①基底层（未生效值），而深色列（`dark theme-zai-dark`）与④覆盖层逐值吻合。

这是 APPLIED.md:44 所列 9 条「两份文档自相冲突」的共同根源：**冲突双方 = tokens.json 浅色基底层值 vs asar `.theme-zai-light` 覆盖层值（+9224 活体）**。裁决一律采覆盖层，三重验证：a) `bd()` 运行时必挂类；b) 深色列方法自洽（采到的是生效覆盖层）；c) 2026-11-03 9224 活体实测侧栏 #f0f0f0（zcode-theme.ts:259 注释记录）。

## 3. 九条冲突裁决表

| # | 冲突 | 双方 | asar 运行时真值（覆盖层） | 裁决 |
|---|---|---|---|---|
| 1 | 浅色侧栏底 | tokens.json `oklch(97% 0 0)`≈#f5f5f5 vs 03g §4.6 分层理论 #f5f5f5 vs 活体 #f0f0f0 | `--color-sidebar:#f0f0f0`（@430577；基底层 neutral-100=#f5f5f5 被覆盖） | **#f0f0f0**。插件现行值 ✅；「245 侧栏层/250 画布层」是把基底层当运行时值，层级差实为「基底层 vs 覆盖层」而非设计语言 |
| 2 | 浅色设置页底 | tokens.json `oklch(98.5%)`=#fafafa vs 插件 #f8f8f8 | `--color-background:#f8f8f8`（@429772） | **#f8f8f8**。插件 `--dcu-settings-page-bg:#f8f8f8` ✅（值对，注释引用错，见差异 #5）；`#fafafa` 是基底层值 |
| 3 | 浅色标题色/前景色 | tokens.json `oklch(37.1%)`=#404040 vs 插件 label-primary #262626 | `--color-foreground:var(--color-neutral-800)`=#262626（@434378；基底层为 neutral-700=#404040 @21548） | **#262626**。插件令牌 ✅；G14 注释「基色 #404040=ZCode 浅色 --color-foreground」引用的是基底层（neutral-700），L 身份一致的说法不成立于运行时（见差异 #4）。oklch(37.1%) 确为 neutral-700（04-open-gaps:1084 反验口径一致） |
| 4 | 浅色码体 pre 内边距 | 两份审计不一致（8/12/6 系 vs 16 系） | streamdown `code-block-body` 包装 div `p-4`=**16px 四向均匀**，`pre` 本体 0 内边距（streamdown 块 @376053；外层容器 `my-4 … rounded-xl border-border bg-sidebar p-2` @377297） | **16px（在 body 包装层）**。插件 `pre{padding:6px 8px 12px}`（conversation-layout.ts:276）→ 差异 #2（不触 2026-10-28 TA3/D1 定案：该定案只锁码卡底/边/方角与码体底字/圆角，未锁内边距） |
| 5 | 浅色设置卡 | 03g TA4「对称取画布值 #fafafa」 vs 插件现行 #fafafa vs D1 --color-card #fff | 令牌层：`--color-card`=#fff、`--color-background`=#f8f8f8（无 #fafafa 卡令牌） | **#fafafa 无 asar 令牌依据**（基底层残值）。候选=#fff（card 令牌）或 #f8f8f8（对齐深色 TA4=background 的映射逻辑）；卡到底消费哪个令牌属组件级，需活体 → 差异 #6 deviation 登记 |
| 6 | 阴影阶梯 | 文档阶梯不一致（lv1-3 三档 vs sm/md/lg） | 全 CSS 仅 `--shadow-sm/md/lg`（Tailwind 默认，@13150/13210/13273）+ `--shadow-composer-soft`，无自定义三档 | **ZCode 阶梯 = sm/md/lg + composer-soft**。插件 `--dsw-shadow-lv1..3` 自造值无 asar 对应 → 差异 #7 deviation（宿主令牌，波及面大，登记） |
| 7 | diff 六色 | 浅色六色（added-bg #eaf7ee 等）来源存疑 | 6+2 个 bg/gutter hex 在 asar CSS+JS **0 命中**（穷尽记录见 §5.1）；asar 实有 = `--color-diff-added` #1e8a3e/#46bf72、`--color-diff-removed` #e03131/#ff5c5c（+foreground #fff/#000）与 `--color-git-*` 七色 | **六色 bg/gutter 无 asar 参照**（#eaf7ee 恰与 `--color-success-surface` 浅值同文，疑为挪用）；diff 两色系值插件已对齐 ✅ → 无参照表 #1 |
| 8 | 字体栈顺序 | mono 栈 CJK 位置两份文档说法不一 | `--font-mono`（@6258）= `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", monospace` | **CJK 在 "Courier New" 之后、泛型 monospace 之前**。与插件 `--dsh-font-family-code-default`（zcode-tokens.ts:530-531）**逐字符一致** ✅；UI sans 另有差异（见 #1 差异行） |
| 9 | 焦点色 | tokens.json `--color-input-border-focused` 浅色=oklch(74.6% .16 232.661)（天蓝） vs 插件 #0b7fff/#4099ff | zai 覆盖层：`--color-brand:#000/#fff`（@430033/@437696）、`--color-input-border-focused:var(--color-border-hover)`（中性，两主题同）→ 基底层的**天蓝聚焦边被 zai 双主题覆盖为中性**；ring 工具类消费 ring-brand/40（=40% 黑/白）、ring-primary、outline-primary；蓝 #0b7fff/#4099ff 仅是 `--color-terminal-blue`（终端/链接）；`--color-icon-blue`=terminal-bright-blue=#06d/#80beff，非插件取值 | **焦点环在 zai 下是中性系**（黑/白衍生），蓝色无 focus 消费点证据。但各控件用哪个 ring 档（brand/primary/border-hover）属组件级 → 插件 `--dcu-focus:#0b7fff/#4099ff` 与 `--dsw-focus-ring-color` 判 needs-live（差异 #9），令牌级结论已可定案 |

## 4. 差异表（10 条，宁缺毋滥）

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | zcode-tokens.ts:532-533（skin-envelope.ts:61 消费） | UI sans 字体栈 | `system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif` | `--font-sans` = Tailwind 默认 `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`（@6131，全 CSS 无覆盖） | mechanical | asar 基底层原文 ↔ 插件原文；落点：改 `--dsw-font-family` 或登记为宿主 CJK 显式适配 |
| 2 | conversation-layout.ts:276 | 码体 pre 内边距 | `padding:6px 8px 12px`（pre 本体） | body 包装层 `p-4`=16px 四向均匀，pre 本体 0；外层容器另有 p-2 | mechanical | streamdown 块 @376053（body）/@377297（容器）↔ 插件原文；落点：pre padding→16px（结构为「外卡 p-2 + body p-4」时取 16） |
| 3 | sidebar-width.ts:13-16 + CodexSidebar 拖拽 | 拖拽上限 | 仅下限 200（主动放宽，已裁决维持），**无上限** | `c7(e,t)=round(max(264,min(e,max(264,0.5×容器宽))))`（JS@5899560，s7=264@5899326）+ CSS `max-w-[50%]`（@5932704）+ localStorage 持久化读回再夹取（@5899886）；会话列 <360px 自动收侧栏、<480px 自动收右栏（@5911532/@5911787） | mechanical | 落点：插件拖拽加 `min(0.5×宿主帧宽)` 上限（下限 200 维持既有裁决不动） |
| 4 | zcode-theme.ts:272（G14 注释，仅注释） | 浅色 secondary 基色身份 | 「基色 #404040 = ZCode 浅色 --color-foreground（oklch(37.1% 0 0)），保住 L 身份与 ZCode 一致」 | 运行时 `--color-foreground`=#262626（neutral-800）；#404040 是**基底层** foreground（neutral-700，@21548） | mechanical（注释更正，令牌与 alpha 85%/75% 不动——alpha 抬升的 AA 理由独立成立） | asar @21548 vs @434378；APPLIED「侧栏三档文字 68/56% 已裁决维持」不触 |
| 5 | zcode-theme.ts:253-264/304（注释） | 背景分层口径 | 「245=侧栏层 / 250=画布层，5 通道差本身就是设计语言」「设置页底=内容画布层 rgb(250)」 | 运行时：侧栏 #f0f0f0（覆盖层）、画布 #f8f8f8（覆盖层）；245/250 是基底层 sidebar/background 的被覆盖值 | mechanical（注释更正，两个现值 #f0f0f0/#f8f8f8 均正确不动） | asar @430577/@429772 + 2026-11-03 9224 活体（zcode-theme.ts:259 记录） |
| 6 | zcode-theme.ts:308 | 浅色设置卡 fill | #fafafa | asar 卡令牌 #fff（--color-card 浅）或 #f8f8f8（对齐 TA4 深色=background 的映射）；#fafafa 无令牌依据 | **deviation**（触 TA4 静态定案，登记不修） | §3 #5；需活体定 ZCode 浅色设置卡实色 |
| 7 | zcode-tokens.ts:524-527 | 阴影阶梯 lv1/lv2/lv3 | 自造三值（`0 1px 2px 0 …05` 等） | 仅 Tailwind `--shadow-sm/md/lg` + `--shadow-composer-soft`；`--dcu-tip-shadow` 已=shadow-md ✅ | **deviation**（宿主令牌波及 Modal/浮层，登记；ZCode 保真面已用 --dcu-tip-shadow 不受影响） | asar --shadow-* 全量清单（§3 #6） |
| 8 | zcode-tokens.ts:267/492（消费：会话用户气泡） | 用户气泡底 | 浅 rgba(13,13,13,.03) / 深 rgba(255,255,255,.05)（= --color-surface） | asar 有**专属令牌** `--color-user-message-bubble`：浅 #0d0d0d0d(5%)（@430627）/ 深 #ffffff14(8%)（@438288），≠ surface（3%/5%） | **deviation**（触 G17 翻案定案，登记不修；建议活体复核 ZCode 用户气泡实际像素） | asar 令牌 @430627/@438288 ↔ zcode-tokens.ts 原文 |
| 9 | zcode-theme.ts:310/353 + zcode-tokens.ts:261/487 | 焦点色 | #0b7fff / #4099ff | zai 焦点环系全部中性（brand=#000/#fff、input-border-focused=border-hover、outline-primary）；#0b7fff/#4099ff 仅= --color-terminal-blue | **needs-live**（令牌级：蓝色无 focus 消费证据已定；控件级 ring 档位须 9224 枚举） | §3 #9 |
| 10 | tokens.json（文档数据，本轮不改） | 浅色列 231 值 | 全为基底层未生效值（root cause） | 应重采：`theme-zai-light` 挂实后的 resolved 值 | mechanical（文档侧重采，参照 §5 提取法；`_meta.lightClass` 残缺为直接证据） | tokens.json `_meta` + asar 覆盖层 |

## 5. 已对齐表（本轮逐值验证）

| item | ours | zcode（asar 覆盖层真值） | 证据 |
|---|---|---|---|
| 主题挂载机制 | syncZCodeTheme：html 切 `theme-zai-light`/`theme-zai-dark`+`dark`、system 由宿主解析（zcode-theme.ts:395-421） | `bd()`：html.classList.toggle dark+theme-zai-*，system 走 prefers-color-scheme | styles-Dv5E6Odo.js@111068 ↔ zcode-theme.ts:405-410 |
| 侧栏底 | --dcu-sidebar-background #f0f0f0/#161616（zcode-theme.ts:266/323） | --color-sidebar #f0f0f0/#161616 | asar @430577/@438383 |
| 画布底 | --dsw-alias-bg-base #f8f8f8/#161616（zcode-tokens.ts:63/298） | --color-background #f8f8f8/#161616 | asar @429772/@437383 |
| 前景/次级/最弱档 | #262626/#d4d4d4；60%；dimmed 分主题 40%/30%（zcode-tokens.ts:99/332/104/337/109/340） | neutral-800/300；subtle #26262699/#d4d4d499；subtlest #26262666/#d4d4d44d + `--lucide-subtlest-opacity:.4/.3` | asar @434378/@442033、@434418、@434671/@442303、@434922/@442559 |
| hover/selected | 5%×2 浅 / 5%+10% 深（zcode-tokens.ts:144-146/375-377；zcode-theme.ts:288/339） | --color-hover #0d0d0d0d/#ffffff0d；--color-selected #0d0d0d0d/#ffffff1a | asar @430140/@437761、@430158/@437780 |
| 边框 | border-l2 10% 黑/白（zcode-tokens.ts:88/321） | --color-border #0d0d0d1a/#ffffff1a | asar @430058/@437735 |
| primary | --dcu-primary #000/#fff + fg #fff/#000（zcode-theme.ts:20-21） | --color-primary #000/#fff、primary-foreground #fff/#000 | asar @433821/@441481 |
| 菜单/浮层 | menu-hover #f0f0f0/#363636；toast #fff/#2b2b2b；tooltip #f0f0f0/#2b2b2b + fg #0d0d0d/#f8f8f8 + tag #e6e6e6/#363636（zcode-tokens.ts:245-249/471-475；zcode-theme.ts:58/81） | --color-menu #fff/#2b2b2b、menu-hover 同、toast 同、tooltip/tooltip-foreground/tooltip-tag 同 | asar @433860/@441517、@435761/@443455 |
| surface | --dcu-surface 3%/5%（zcode-theme.ts:311/354）；bubble=同值（触 #8 差异，此处只对 surface 本体） | --color-surface #0d0d0d08/#ffffff0d | asar @430122/@437745 |
| 状态色三系 | #1e8a3e/#46bf72、#e03131/#ff5c5c、#e07b00/#ff8a30（zcode-tokens.ts:156-183/385-415；填充档沿用） | --color-success/destructive/warning 同值 | asar @434936/@442580 |
| diff 两色系 | added #1e8a3e/#46bf72、removed #e03131/#ff5c5c（zcode-tokens.ts:228-229/455-456 引源） | --color-diff-added/-removed 同值（+foreground #fff/#000） | asar @435700/@443341 |
| terminal-blue / 链接 | #0b7fff/#4099ff（zcode-tokens.ts:188-204/419-435） | --color-terminal-blue 同值 | asar @430289/@437874 |
| mono 字体栈 | --dsh-font-family-code-default（zcode-tokens.ts:530-531） | --font-mono **逐字符一致**（含 CJK 位置） | asar @6258 |
| 字号刻度 | base 14px；xl+4/lg+2/caption−1/sm−2/xs−4/2xs−5（zcode-tokens.ts:551-560） | --ui-font-size:14px(@414642)；--text-ui-xl/lg/base/caption/sm/xs/2xs 同差值 | asar @13902-14370 |
| 圆角标度 | xs 2/sm 4/md 6/lg 8/xl 12/2xl 16（zcode-tokens.ts:504-517） | --radius-xs .125rem…--radius-2xl 1rem | asar @13075-13145 |
| 动效 | feedback 150ms(.4,0,.2,1)、move 200ms(0,0,.2,1)、enter/exit 150ms（zcode-theme.ts:131-143） | --default-transition-duration:.15s + 默认曲线 (.4,0,.2,1)；--ease-out (0,0,.2,1)/--ease-in-out (.4,0,.2,1)；侧栏 `duration-200 ease-out transition-[width,opacity]`（JS@5932704 类串） | asar @13336-13478 + @5932704 |
| 侧栏开合 | move 档 200ms + transform/clip-path 方案（sidebar-width.ts） | `duration-200 ease-out transition-[width,opacity]` + resizing 时 `transition-opacity`（时长曲线一致；机制差异 = DSH 约束，APPLIED 已登记维持） | asar @5932704 |
| 阴影 md | --dcu-tip-shadow `0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)`（zcode-theme.ts:58/81） | --shadow-md 全同（#0000001a=10% 黑） | asar @13210 |
| document-hidden 暂停 | html[data-document-hidden] * transition/animation none!important（zcode-theme.ts:217） | 同规则原文 | asar @414878 |

## 6. 无参照表（附穷尽搜索记录）

| # | item | 状态 |
|---|---|---|
| 1 | **diff 六色 bg/gutter**（#f0faf3/#fcece9/#fdf2f0 浅、#1f3124/#132016/#3c1f1b/#28130e 深、含 #eaf7ee） | asar `styles-NK68EN_n.css` 全文正则逐 hex 搜索：**全部 0 命中**（#eaf7ee 除外）；`styles-Dv5E6Odo.js` 逐 hex：**全部 0 命中**。#eaf7ee 仅存在于 `--color-interaction-confirmation-surface`/`--color-success-surface`（@434139/@434223/@436418）。asar 实有 diff 令牌=`--color-diff-added/-removed`(+-foreground) + `--color-git-{modified,added,deleted,renamed,untracked,ignored,descendant}`。⇒ 插件六色维持现状（无对齐目标），文档如引用需标注来源非 asar |
| 2 | --color-ring | 消费 2 处（`.composer-thought-slider` @314、`.wf-tile` outline @457047）但全 CSS **无定义**（正则 `--color-ring:` 0 命中）→ ZCode 侧自身缺口，无对齐目标 |
| 3 | 前景第三档 50% | asar 只有 subtle 60%/subtlest 40%(浅)·30%(深)，**无 50% 档令牌**；插件 label-tertiary 50% 属 DSH 中间档（无 ZCode 直接参照） |
| 4 | streamdown body 底色与 2026-10-28 浅色活体「码卡 #fff」的矛盾 | streamdown 默认 body=bg-background(#f8f8f8)、容器=bg-sidebar(#f0f0f0)；04-open-gaps:83 活体实测码卡 #fff（可能调用方经 className 覆盖为 bg-card）。静态无法定调用方传参 → 维持 TA3/D1 现行值，活体复核时顺带采样 |
| 5 | `.dark` 系与 zai 系的差异令牌（如 --color-resize-handle sky-400/500、--color-hover:var(--color-surface-hover)） | zai 双主题不覆盖这些令牌（挂载后 zai 同名者胜、异名者保留 .dark/base 值）；属 Tailwind dark: 变体的残留基准，非 zai 设计语言组成部分 |

## 7. 本轮未跑/未验声明

- **未跑任何 9224/CDP 活体**：9 条裁决全部基于 asar 静态全块 + tokens.json 采样缺陷的根因证据；「活体实测」引用均为既有记录（zcode-theme.ts:259 的 2026-11-03 注释、APPLIED 批次 2）。
- 未验证 ZCode 浅色设置卡 / 用户气泡的**组件级**实际消费令牌（#6/#8 差异行的活体项）；未枚举各控件 focus ring 具体档位（#9）。
- 未改任何 src/tests/文档文件；本文为本轮唯一产出。
- 提取脚本 `asar_tool.py` 写在 workspace（/Users/m1/.zcode/workspace/draft-945e55ec-c2a8-4722-91e0-14187ca56dea/），提取产物在 /tmp/zc-surface14/，均不在 design-language/ 仓库内。

## 复核（独立复核员，2026-11-03）

> 复核方式：不复用旧产物，自己重跑提取——`python3 <workspace>/asar_tool.py /Applications/ZCode.app/Contents/Resources/app.asar list '\.css$'` 与 `cat` 三件，产物落在 **/tmp/zc-review-surface14/**（styles-NK68EN_n.css 480065B、styles-Dv5E6Odo.js 6839502B、chunk-BO2N2NFS--i48C_fO.js 448665B，**字节数与 §0 记录逐一相符**）。插件源码读自 `/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui`（与 surface-1.md:99 引用一致）。只读，未改任何 src/文档。

**两点全局修正（不影响下述各条内容判定）**：

1. **JS 侧「字节偏移」实为 UTF-8 字符偏移**。`max-w-[50%]` 字节位 = 6045571，字符位 = 5932738（本文写 @5932704，±34 字符，指向同一 className 串）；`s7=264` 字符位 5899326 **逐字符精确命中**。styles.css 基本 ASCII（首处非 ASCII 在字节 39161），CSS 各偏移实测全部命中。即：偏移标注单位名不副实，但内容定位全部有效。
2. 每条除注明外均为 verified。

| # | verdict | 复核实见（本复核实际跑出/读到的值） |
|---|---|---|
| 1 | **verified** | CSS 全文 `--font-sans` **仅 1 处**（@6131，`ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", …`，无覆盖成立）；zcode-tokens.ts:532-533 = `--dsw-font-family: 'system-ui, -apple-system, "Segoe UI", …'` 原文一致；skin-envelope.ts:61 确以 `font-family:var(--dsw-font-family)` 消费 |
| 2 | **verified** | streamdown 字符位 376055±：body 包装 div = `overflow-x-auto rounded-md border border-border bg-background p-4 text-sm` + `data-streamdown:"code-block-body"`，内层 `pre` 仅 bg 类**无 padding 类**；容器 @377297 精确命中 `my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2`；conversation-layout.ts:276 = `padding:6px 8px 12px;` |
| 3 | **unconfirmed** | **zcode 侧全部成立**：字符 @5899326 精确命中 `UUn=264,s7=264,WUn=.5`；`function c7(e,t){let n=t&&t>0?Math.max(s7,t*WUn):1/0;return Math.round(Math.max(s7,Math.min(e,n)))}`（=round(max(264,min(e,max(264,.5×容器宽))))）；localStorage 键 `zcode:workspace-shell:sidebar-width-px` 读回过 `c7()` 再夹取；QUn=360/XUn=480 自动收左栏/右栏（含日志原文）；`max-w-[50%] … duration-200 ease-out transition-[width,opacity] data-[workspace-sidebar-resizing=true]:transition-opacity`。**但 ours 侧「仅下限 200，无上限」不成立**：sidebar-drag.ts:3 `const SIDEBAR_MAX_PX = 420`、:32 `Math.min(SIDEBAR_MAX_PX, Math.max(CODEX_SIDEBAR_MIN_PX, …))`，由 CodexSidebar.tsx:852/857 在 onMove/onUp 实调；sidebar-drag.ts 改于 2026-10-26 09:53，**早于本文（11-03 01:41）8 天**。真实差异 = 插件 420 定值上限 vs ZCode 0.5×容器宽上限，「落点：加 min(0.5×宿主帧宽) 上限」须先处理既有 420 |
| 4 | **verified** | zcode-theme.ts:272 注释原文在（「基色 #404040 = ZCode 浅色 --color-foreground…」）；CSS @21548 基底 `--color-foreground:var(--color-neutral-700)`、@434378 zai-light `=var(--color-neutral-800)`；我按 Oklab→sRGB 自算：neutral-700 oklch(37.1%)→**#404040**、neutral-800 oklch(26.9%)→**#262626**，换算成立 |
| 5 | **verified** | zcode-theme.ts:255（「245 与 250 的 5 通道差…」）/259（「← 2026-11-03 9224 活体实测」）/304（TA1「内容画布层 rgb(250)」）均在；@430577 `--color-sidebar:#f0f0f0`、@429772 `--color-background:#f8f8f8` 精确命中；基底 `--color-sidebar:var(--color-neutral-100)`（→#f5f5f5=245）、`--color-background:var(--color-neutral-50)`（→#fafafa=250）——「245/250 是被覆盖基底层」成立 |
| 6 | deviation 证据**成立** | `--color-card` 四值 = 基底 var(--color-white) / .dark neutral-800 / zai-light **#fff** / zai-dark #2b2b2b；zai-light background #f8f8f8。⚠ 小注：基底 `:root` 另有 `--highspeed-sidebar-card-surface:#fafafa`（char 400122，highspeed 侧栏卡、非设置卡、非 zai 覆盖层）——「无 #fafafa 卡令牌」应精确为「无设置卡令牌取 #fafafa」 |
| 7 | deviation 证据**成立** | shadow 令牌定义全量 grep：`--shadow-sm/md/lg` 各 1 + `--shadow-composer-soft` 共 **2** 处——除 :root@414603（`0 0 #0000`）外只有 .theme-zai-light@429627 重定义（`0 1px 3px #0000000a, 0 6px 18px #0000000a`）；⚠ §1「zai-light/zai-dark 各自重定义」**zai-dark 侧未命中**。无自定义三档、lv1..3 无 asar 对应的结论不变 |
| 8 | deviation 证据**成立** | asar 专属令牌实见：@430627 `--color-user-message-bubble:#0d0d0d0d`（≈5% 黑）、@438288 `=#ffffff14`（≈8% 白）；同窗口 `--color-surface:#0d0d0d08/#ffffff0d`（≈3%/5%）——bubble≠surface 成立；zcode-tokens.ts:267 `'rgba(13, 13, 13, 0.03)'`、:492 `'rgba(255, 255, 255, 0.05)'` 原文在 |
| 9 | **verified**（证据层；needs-live 定性正确） | brand：@430033 `.theme-zai-light{--color-brand:#000`、@437696 `.theme-zai-dark{--color-brand:#fff`；`--color-input-border-focused` 4 处归属实查 = 基底/.dark 取 var(--color-brand)、**.theme-zai-light@431096 与 .theme-zai-dark@438766 均取 var(--color-border-hover)**；terminal-blue = #0b7fff/#4099ff；`focus-visible:ring-brand/40`（=40% brand→黑/白）、`focus-visible:ring-primary`(+ /30、/40)、`focus-visible:outline-primary` 工具类实见；`ring-terminal-blue`/`outline-terminal-blue`/`border-terminal-blue`/`caret-terminal-blue` **全 0 命中**；--color-icon-blue=terminal-bright-blue=#06d/#80beff；zcode-tokens.ts:261/487 `--dsw-focus-ring-color: '#0b7fff'/'#4099ff'` 在。⚠ 措辞修正：#0b7fff/#4099ff 另出现于 `--color-usage-chart-1`、`--color-context-breakdown-1`、`--color-git-renamed` 等（「仅是 terminal-blue」不严），但「无 focus 消费点」结论不受影响；控件级 ring 档位确须 9224 枚举 |
| 10 | **verified** | tokens.json `_meta` 实读：`darkClass:"dark theme-zai-dark platform-mac-desktop"`、`lightClass:" theme-zai- platform-mac-desktop"`（类名残缺，逐字符一致）、`varCount:231`=`len(all)`231；浅列抽查 7 项全为基底层 resolved 值（sidebar oklch(97%)、background oklch(98.5%)、foreground oklch(37.1%)、brand/input-border-focused oklch(74.6% .16 232.661)、terminal-blue oklch(68.5%)、primary oklch(14.5%)），深列与 zai-dark 覆盖层吻合（#161616/#161616/oklch(87%)/#fff/#ffffff26/#4099ff）——根因判定成立 |

**汇总**：10 条中 9 条 verified（含 3 条 deviation 的证据层），**1 条 unconfirmed（#3：插件侧「无上限」与现行 sidebar-drag.ts 的 420 上限矛盾，zcode 侧数值全对）**。未跑任何活体（与原文 §7 声明一致，本文复核亦为纯静态）。
