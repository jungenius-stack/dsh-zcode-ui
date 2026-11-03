# night2 · surface-10 · markdown 渲染（代码块 / 表格 / 引用 / 链接 / 行内码 / 图片 / 分割线）

> 深挖员：surface-10。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面（ask 指定）：`uiplug/src/client/conversation-layout.ts`（485 行，本面唯一主战场）、`conversation-dom.ts`（21 行，**无 markdown 面**——纯滚动锚点工具，见 W11）、`foreign-content-contract.ts`（110 行，**无 markdown 面**——侧栏页脚外来内容契约，见 W12）。
> 前置：已读 `night-audit/APPLIED.md`（§二「码体 pre 内边距」列为需活体重采——**本轮以静态源码收口，见 D2**）、`night-audit/night-1102-report.md` 与 batch-1/1R/4/5/6/8（码卡头部条、链接 hover 真值、del/sup/sub/mark、task-list、mermaid 已收口，本文不重复报）、`03c-conversation.md`、`03n-typography.md`、`docs/COVERAGE-MATRIX.md`（B5–B9 状态：B9 正文插图仍 🟡）、`README.md`。本轮不重复报已裁决项。
> 活体（9224/9223）本轮**未采样**——全部结论为双端 asar 静态证据（ZCode + DSH 宿主），needs-live 四条见 §5。

## 0. 提取方法与可复现命令

```bash
# ZCode app.asar（与 surface-3/9 同版本：三产物字节数逐一致）
python3 -I - <<'PY'   # asar 头 u32=(4,8328596,8328592,8328585)，文件区基址 8328604
import struct, json
f=open('/Applications/ZCode.app/Contents/Resources/app.asar','rb')
h=struct.unpack('<4I', f.read(16)); f.seek(16)
d=json.JSONDecoder().raw_decode(f.read(h[3]).decode('utf-8','replace'))[0]
# 提取（产物存 /tmp/zc-md-surface10/，字节数与 surface-9 记录一致）：
#   styles.js          6,839,502B（组件源，= styles-Dv5E6Odo.js）
#   styles.css           480,065B（编译 CSS，= styles-NK68EN_n.css）
#   intl.js              979,836B（i18n，= IntlProvider-4oW73Zh8.js）
#   streamdown-styles.css  499B、streamdown-chunk.js 67,773B（npm streamdown 包）
#   sd-app-chunk.js     448,665B（= chunk-BO2N2NFS--i48C_fO.js，应用侧 fork 的 Streamdown）
#   pierre-style.js      39,008B（@pierre/diffs/dist/style.js，shiki 码体渲染器样式）
PY
# DSH 宿主 asar（/Applications/DeepSeek Harness.app/Contents/Resources/app.asar，mtime 10-17 17:39）
#   提取 typert.host.js 365,047B → 其内嵌 AssistantMarkdown.module.css（gKv1-q，1018B 全文）
#   提取 dsh-client-pdf.js 7,108,801B（含文档预览 rkta1W_markdown* 模块）
```

下文偏移量为各产物文件内字节偏移（`grep -aob` 可复核）。行号引用：conversation-layout.ts 按当前工作树。

## 1. ZCode markdown 面全解剖（本轮新挖，组件树级）

聊天正文渲染链：`OV`（MessageResponse，js@2857242）→ 错误边界 `_Lt`（js@2846554，渲染失败降级纯文本）→ `Vre`（应用 fork 的 Streamdown，sd-app-chunk.js@441200）→ 组件映射（js@2858100–2859000）。

### 1.1 容器与全局

```
根容器 C = size-full text-ui-base leading-[1.75] tracking-wide
           [&>*:first-child]:mt-0 [&>*:last-child]:mb-0        （js@2857600）
Streamdown 根自动并入 space-y-4 whitespace-normal …           （sd-app-chunk.js@441528）
space-y-4 编译形态（css@91218，Tailwind v4）：
  :where(.space-y-4 > :not(:last-child)){margin-block-end:calc(var(--spacing)*4)}  ← 16px，:where 零特异性
→ 机制：p 的 16px 段后 = space-y-4 盖过 UA 默认 1em（author>UA）；ul/ol 自身 my-3（0,1,0）
   胜过 :where(0) → 列表底 12px；margins 塌陷照常。
行高链：.text-ui-* 无 line-height，一律继承根 1.75（h1 18→31.5 / h2 16→28 / 其余 14→24.5）。
--ui-font-size:14px（css@定义）；--text-ui-xl:+4 / lg:+2 / base / sm:−2 / xs:−4（css@tokens 段）。
```

**DSH 对照**：宿主 `AssistantMarkdown.module.css`（typert.host.js@359598 全文 1018B）：`.gKv1-q_body{flex-direction:column;gap:16px}` —— **gap 加在 text/reasoning/image 块之间**（typert.host.js@364684：body 直属子代 = MarkdownText/ReasoningRow/图片槽，不是 markdown 元素）；markdown 元素在 MarkdownText 内部普通流里 → 插件 margin 制（p mb16 / ul my-3 / hr my-6）塌陷语义与 ZCode 空间一致 ✅。

### 1.2 标题 / 段落 / 强调 / 列表（组件映射 js@2858100–2858900）

```
h1–h6（XIt@2844357）：全部 mt-6 mb-4；h1 text-ui-xl 600 / h2 text-ui-lg 600 /
  h3–h4 text-ui-base 600 / h5 text-ui-base 500 / h6 text-ui-base normal
p（WPt@2806193）：透传（≥2 img 子代时升级图片画廊 yPt）
strong：font-medium（覆盖 npm streamdown 默认 font-semibold@chunk@41170）
ul（uNt@2762400）：my-3 list-outside list-disc space-y-1.5 pl-5 marker:text-foreground-subtlest
  [&_ul]:my-1.5 [&_ol]:my-1.5
ol（dNt）：my-3 list-inside list-decimal space-y-1.5 pl-0（同嵌套覆盖）
li（fNt）：pl-1 [&>p]:my-0 [&>p]:inline（npm 默认 py-1 被 fork 弃用）
```

### 1.3 代码块全家族（CodeBlock，js@965669–972000 + 2858900）

```
容器 ALe = group relative w-full overflow-hidden rounded-xl bg-background text-foreground
           + data-language + content-visibility:auto / contain-intrinsic-size:auto 200px
聊天映射（js@2858850）传 className=`my-4 border border-border bg-card` → 实际底=bg-card
  （活体 #2b2b2b = --color-card 暗值，css@438334；批次 1 已录）
头部 hx = flex items-center justify-between gap-3 px-3 py-2 text-ui-base text-muted-foreground
  （text-muted-foreground 死类：--color-muted 全 css 0 定义，本轮再证；实际=继承全前景）
  聊天映射再传 pl-3 pr-2 pt-2 → 终值 pad = 12/8/8/8（py-2 的 bottom 8 保留）
  左组 gx=gap-2：文件图标 16px + jLe 文件名 font-mono truncate lowercase
  右组 _x = -my-1 -mr-1 flex items-center gap-1：
    mermaid 时 MLe 预览钮；否则 showWrapButton 时 yx 换行钮；常置 bx 复制钮
码体包 div = p-2 pt-0 pb-3（= 上0/右8/下12/左8；js@966700 vx 内）
  内部 ANe（js@896589）→ @pierre/diffs fMe：
    pierre-style.js@4118：pre,code{margin:0; padding:0; display:block}  ← pre 自身零内距零边框
    pierre-style.js@30534：[data-line]{padding-inline:1ch}              ← 逐行 1ch 横向内衬
    vx 传 --diffs-gap-block:0px → [data-code] 上下 gap 均为 0
    默认 showLineNumbers=false（vx 签名 r=!1；js@966700）
  shiki 双主题 Jb=['github-light','github-dark']（js@437530）
  流式时 enableSyntaxHighlighting/renderMermaid 均关（!v，js@2858850）
```

### 1.4 复制钮 / 换行钮状态机（js@969250–969800）

```
bx CopyButton：ghost + size icon-md（=28×28/r8，button.tsx icon-md=size-7 rounded-lg）
  aria-label=codeBlock.copyCode（「复制代码」）；tooltip side:top
  copied 态：navigator.clipboard.writeText 成功 → l(!0) + setTimeout 2000ms 复位
  图标 c?Os:Ws（勾/复制），尺寸 size-3.5（14px）；无动画类、无文字变化
yx 换行钮：ghost icon-md，aria-pressed，激活态类 bg-muted —— bg-muted 死类（--color-muted 0 定义）
  → 激活态实际无底色（「死类三连」第三实例，与批次 7 bg-muted/15 同族同根）
MLe mermaid 预览钮：ghost icon-md，disabled:!previewAvailable
```

### 1.5 表格全家族（HNt，js@2766735–2780600）

```
根 HNt = my-0 flex min-w-0 flex-col gap-2
工具栏 data-markdown-table-toolbar = flex items-center justify-end gap-1（条件渲染）
  AB 钮 ×4（js@2779333）= ghost icon-md + tooltip；图标 size-3.5：
    复制 Markdown / 下载 CSV / 预览表格 / 展开表格滚动区域（i18n@intl.js，markdownTable.*）
框 = relative w-full overflow-hidden rounded-xl border border-border
  内层 = !scrollbar-hide w-full overflow-x-auto overflow-y-visible → table
table = w-max min-w-full border-separate border-spacing-0 text-ui-base
滚动边缘渐隐 UNt（js@2779000）：pointer-events-none absolute inset-y-0 z-10 w-6
  left-0 rounded-l-xl shadow-[inset_12px_0_12px_-12px_color-mix(in_srgb,black_15%,transparent)]（右侧对称）
  —— 由 JS 滚动态（left/right/both/none）条件渲染
sticky 滚动模式：data-markdown-table-virtual-scroll-sticky + 过渡
  transition-[width,opacity] duration-200 ease-out（js@2777500）
单元格（js@2779512–2780200）：
  thead/tbody：无类
  tr KNt = transition-colors last:[&>td]:border-b-0 hover:bg-hover/20   ← 行悬停 + 末行去底线
  th qNt = border-border border-b px-3 py-2 text-left font-normal text-foreground-subtlest
           min-w-16 max-w-md whitespace-normal break-words
  td JNt = border-border border-b px-3 py-2 text-foreground align-top
           min-w-16 max-w-md whitespace-normal break-words
预览对话框（js@2779100）：min-h-0 overflow-auto rounded-xl border border-border bg-background
  + [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background（data-streamdown=table-preview）
```

### 1.6 引用块 / 链接 / 行内码 / 图片 / hr

```
blockquote（lNt@2762304，聊天映射 blockquote:lNt 直用）：
  my-4 border-border border-l-2 pl-3 text-foreground-subtle
  [&_p]:my-0 [&_p+p]:mt-2
  —— 无斜体、无 500 字重；text-foreground-subtle = 60% 前景
     （css@21592 亮 #40404099 / @423960 暗 #e5e5e599；zai 主题 #26262699/#d4d4d499）
链接三分支（js@2858100 a 映射）：文件链接→RLt 文件 chip（YIt@2844357：inline-flex max-w-full
  items-baseline gap-1 text-icon-blue text-ui-base no-underline decoration-dotted underline-offset-4
  hover:underline；图标 16px ml-0.5 truncate）；http(s)→ILt 外链下拉（打开/外部打开/复制链接，
  js@2850000）；其余→<span JIt>（无 href，不导航）。
JIt@2844072 = wrap-anywhere text-ui-base font-medium text-icon-blue no-underline
  decoration-dotted underline-offset-4 hover:underline
  —— 字重 500 + 悬停显示 dotted 下划线（批次 4 真值复确认 + 新增字重/折行两事实）
行内码（code 无 data-block 分支，js@2858100）：
  rounded-md bg-markdown-inline-code/50 mx-0.5 px-1.5 py-0.5 font-mono text-ui-sm
  令牌：--color-markdown-inline-code = var(--color-tag)（css@17128）
  编译值 css@124083：亮 #e5e5e580 / 暗（tag 暗=#363636，css@426437）50% ≈ #36363680
图片（qPt@2806811 + vPt/_Pt@2800992）：
  触发钮 _Pt = my-4 block w-fit max-w-1/2 cursor-zoom-in overflow-hidden rounded-xl
    outline-none focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background
  img vPt = h-auto max-h-90(360px) max-w-full rounded-xl border border-border bg-background
    object-cover（loading:lazy，draggable:false，加载中 invisible）
  加载态：markdown-image-loading-shimmer（css@446500：135deg card→background→card，
    background-size:240%，1.8s linear infinite，reduced-motion 停）
  错误/本地加载占位：min-h-32 md:h-44 md:w-56 rounded-xl border bg-surface px-3 py-2
    text-ui-base text-foreground-subtle + data-markdown-local-image=error|loading
  画廊（≥2 图）yPt@2801290：my-4 grid grid-cols-1 gap-2，trigger h-32；
    sm:grid-cols-2；md:flex flex-wrap，trigger h-44 w-auto
  灯箱 PB（initialIndex，items=KPt 收集）
hr（npm streamdown chunk@41480，聊天映射未覆盖→默认）：my-6 border-border
  data-streamdown=horizontal-rule（strong 默认 font-semibold 亦被聊天映射 font-medium 覆盖）
```

### 1.7 关键令牌速查（本轮实测编译值）

| token | light | dark |
|---|---|---|
| `--color-markdown-inline-code` | `var(--color-tag)` = #e6e6e6 | #363636（css@426437） |
| `--color-foreground-subtle` | #40404099（60%） | #e5e5e599（60%） |
| `--color-foreground-subtlest` | #40404066（40%） | #e5e5e54d（30%） |
| `--color-hover` | `var(--color-neutral-200)` | `var(--color-surface-hover)` = #ffffff1a |
| `--color-card` | #fff | #2b2b2b |
| `--color-muted` | **0 定义（死令牌）** | 同左 |
| `--color-icon-blue` | `var(--color-terminal-bright-blue)` | 同左 |

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 4 条）

落点全部在 `conversation-layout.ts` 的 ⑦ 表格段（:369–396）与行内码段（:278–284）。

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | conversation-layout.ts:383–391 之后（新增规则） | 表格行悬停 | 无（行悬停无任何规则） | `tr{transition-colors hover:bg-hover/20}`：亮 = neutral-200@20%、暗 = surface-hover(#ffffff1a)@20%；transition-colors 默认 150ms（feedback 档一致） | js@2779692 KNt 全文；css@16230/417146 --color-hover；实现建议 `background:color-mix(in srgb, var(--dsw-alias-bg-base) 8%, transparent)` 级近似或新增 alias，落码后补断言 |
| M2 | conversation-layout.ts:383–391（补例外） | 表格末行去底线 | th、td 一律 border-bottom → 末行底线与 ⑦ 已落的表格外框 border **叠成双线** | `tr:last-child 内 td border-b:0`（`last:[&>td]:border-b-0`）——外框承担封底 | js@2779692 KNt；本插件 ⑦ 外框为 2026-11-01 B7 补落（:377），旧单元格规则未随之收口 |
| M3 | conversation-layout.ts:383–391（补属性） | 单元格宽约束 | 无 min/max 宽，无断词策略 → 长内容列把表撑到全宽横滚 | th/td：`min-w-16(64px) max-w-md(448px) whitespace-normal break-words`；th 另有 text-left | js@2779837/2780051 qNt/JNt 全文 |
| M4 | conversation-layout.ts:278–284（补一行） | 行内码外距 | 无 margin 规则 | `mx-0.5`（左右各 2px）；**落地前须活体确认宿主行内码默认 margin 为 0**（避免叠加成 4px）——静态查不到宿主该值 | js@2858100 code 分支全文；宿主侧 grep `:not(pre)>code` 仅命中文档预览模块（dsh-client-pdf.js@5543100，font 12px/18px，无 margin 声明） |

> M1–M4 均查无既有裁决：COVERAGE-MATRIX B7 只裁了框/内距/行线/表头色；04-open-gaps 与 night-1102 各批无行悬停/末行/列宽/外距条目（本轮 grep 0 命中）。

## 3. deviation（触既有裁决，登记不修；共 3 条）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | conversation-layout.ts:397–406 | **引用块全套** | margin 1.6em(22.4px)；padding-left 14px；border-left **4px**；**italic**；**font-weight 500**；内层 p 无处理；文字=继承全前景 | `my-4(16px) border-l-2(2px) border-border pl-3(12px) text-foreground-subtle(60% 前景)`，**无斜体无字重**；`[&_p]:my-0 [&_p+p]:mt-2`（内层 p 归零、段间 8px） | 旧 B8 ✅ 取自 **@tailwindcss/typography 库装 CSS**（css@38970–39412 `.prose :where(blockquote)` 4px/italic/500）——批次 2 已证正文 41 流元素 **0 个 .prose 祖先**（死样式表）；聊天实际走映射 `blockquote:lNt`（js@2762304/2858927）。锁定断言：conversation-visuals.assert.ts:462–463。翻案需同步改断言 + 建议带 9224 活体引用样本双确认（N3） |
| D2 | conversation-layout.ts:267–277 | **码体内边距/边框** | pre：`padding:6px 8px 12px` + `border:1px solid l2` + `border-radius:md` | pre 本体 `margin:0;padding:0` **无边框无圆角**（pierre-style.js@4118）；体包 div `p-2 pt-0 pb-3` = 上 0/右 8/下 12/左 8（js@966700）；逐行另有 `padding-inline:1ch`（pierre-style.js@30534，≈+7px，DSH 结构无法复刻，登记为已知限差）→ ZCode 视觉左衬 ≈15px vs ours 8px | APPLIED.md §二将「码体 pre 内边距」列为需活体重采——本轮以源码收口：旧 D1「8/8/0/12+边框」取自 10-28 旧版 asar，10-29 上游改版后结构已变（批次 1 只改了头部/圆角/钮）。锁定断言：conversation-visuals.assert.ts:442 |
| D3 | conversation-layout.ts:419–424（⑧ 链接「不落任何规则」） | 链接字重/折行 | 不落任何链接规则（颜色归 F6、hover 待采样） | 链接=**font-medium(500)** + `wrap-anywhere`；色 icon-blue、no-underline→hover dotted offset-4（与批次 4 已锁真值一致，此处只新增字重/折行两事实） | js@2844072 JIt 全文。⑧ 裁决为「不落任何规则」，任何补落都触它——登记待裁决；若开落，仅补 `font-weight:500; overflow-wrap:anywhere` 两属性即可 |

## 4. 已对齐表（本轮以 asar 源码逐项复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 标题 mt24/mb16 + 五档字重 | T1 ②（:308–313） | XIt 全档逐值一致（js@2844357） | 双源 |
| A2 正文行高 1.75 + 字距 0.025em + 首尾元素归零 | C3/T1 ① + 宿主首元素规则（:83,:301–302） | 根容器 C 三件套（js@2857600；sd-app-chunk@441528） | 双源 |
| A3 列表 my-3/pl-5、ol inside pl-0、li pl-1、项距 1.5 档、嵌套 my-1.5、marker subtlest | T1 ③ + ⑧（:316–327） | uNt/dNt/fNt 逐类一致（js@2762400–2763100） | 双源 |
| A4 strong 500 | ⑧（:427） | 聊天映射 font-medium（js@2858100） | 双源 |
| A5 hr 24/24 + 1px border | ⑧（:428） | streamdown 默认 `my-6 border-border`（chunk@41480） | 双源 |
| A6 表格单元格 8/12 内距、行线 1px、th 400+subtlest、td 全前景、align-top | ⑦（:383–396） | qNt/JNt 逐类一致（js@2779837/2780051） | 双源 |
| A7 表格外框 rounded-xl + 1px border + transparent 底 | ⑦（:369–382，B7 补落） | `relative w-full overflow-hidden rounded-xl border border-border`（js@2777204） | 双源 |
| A8 行内码底色/圆角 6/内距 6-2/字号 12 | :278–284 + zcode-tokens.ts:213/442 | `rounded-md bg-markdown-inline-code/50 px-1.5 py-0.5 font-mono text-ui-sm`；令牌亮 #e6e6e6@50/暗 #363636@50 与插件别名值**逐字节一致**（css@124083 vs zcode-tokens.ts:213/442） | 三源 |
| A9 码卡容器 my-4 + border + bg-card + rounded-xl | D1（:232–242） | ALe 基座 + 聊天传参（js@2858850；活体 radius 12/bg #2b2b2b 批次 1） | 三源 |
| A10 头部条内距 12/8/8/8 | bannerWrap `8px 8px 8px 12px`（:243–247） | hx `px-3 py-2` + 聊天覆盖 `pl-3 pr-2 pt-2`（js@966950/2858850） | 双源 |
| A11 头部/语言标签=全前景（text-muted-foreground 死类） | 批次 1R 落 `--dsw-alias-label-primary`（:248–259） | 本轮再证：`--color-muted:` 全 css **0 定义**；活体 oklch(.87)（批次 1R） | 三源 |
| A12 动作钮 28×28 / r8 / ghost / 图标 14px | `_action_`（:260–266） | icon-md = size-7 rounded-lg；yx/bx/MLe/AB 全走 icon-md + size-3.5（js@969300+） | 双源 |
| A13 码体主题 github-light/dark | `--dsw-alias-markdown-code-editor-bg/fg` #ffffff/#24292e、#24292e/#e1e4e8（zcode-tokens.ts:216–217/444–445） | `Jb=['github-light','github-dark']`（js@437530） | 双源 |
| A14 复制钮 aria「复制代码」 | DSH 宿主自带同语义 | `codeBlock.copyCode`=复制代码（intl.js@zh） | 双源 |
| A15 图片规格 max-h-90/rounded-xl/1px 边/object-cover 无阴影 | D1 注释 2026-11-01 更正版（:364–368） | vPt 全文（js@2801190）；B9 待 DSH 样本（矩阵 🟡 维持） | 双源 |
| A16 块间距 16px 机制 | ⑧ p mb16（:425）+ 宿主块间 flex gap:16（gKv1-q_body，typert.host.js@359600） | ZCode space-y-4（margin 制塌陷）——对 p 等效；残余差见 N2 | 双源 |
| A17 链接色蓝系 + 静态无下划线 | ⑧ 不落（:419–424） | JIt no-underline + text-icon-blue（js@2844072）；hover 态两边均未活体采样（批次 4 登记） | 双源 |
| A18 overflow-x 横滚策略 | X1（:41–46） | 表格内层 `overflow-x-auto`、pre `overflow` 由 pierre 接管（wrap/scroll 二态） | 双源 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| W1 表格工具栏（复制 Markdown / 下载 CSV / 预览表格 / 展开滚动区域，ghost icon-md ×4 + tooltip，intl `markdownTable.*`） | 插件无此功能面——规格存档（§1.5），将来补功能直接用 | js@2776800–2777500 工具栏全段；intl.js `markdownTable\.` 5 键全文 |
| W2 表格滚动边缘渐隐（w-6 + inset 12px 0 12px −12px black15%，JS 滚动态门控） | 需 JS 才能落地（CSS 无法判滚动位）——规格存档 | js@2779000 UNt 全文 |
| W3 表格预览对话框（sticky th：top-0 z-10 bg-background；controls `JPt={table:{fullscreen:!1}}`） | 插件无此面——规格存档 | js@2779100/2810264 |
| W4 复制钮 copied 态机（clipboard→Check 图标 2000ms 复位、无动画） | DSH 复制钮为宿主组件，插件只对齐几何（A12）——状态规格存档 | js@969250–969800 bx 全段 |
| W5 换行钮激活态 `bg-muted` 死类（激活实际无底色） | 「死类三连」第三实例（text-muted-foreground / bg-muted/15 之后的同根新证）——规格存档，勿照抄类名 | js@969650 yx；css `--color-muted:` 0 命中 |
| W6 外链 span+下拉菜单（无 href 安全模型：打开/外部打开/复制链接）与文件 chip（YIt） | 插件无外链渲染面；DSH fileLink 常驻 dotted 已裁决「宿主自有面登记不动」（批次 4）——不产 diff | js@2850000–2856000 ILt/LLt/RLt 全段 |
| W7 图片触发钮/灯箱/加载 shimmer/错误卡/响应式画廊（§1.6 全量） | 插件无 markdown 图片面（B9 维持 🟡）——规格存档，出样本即按此对照 | js@2800992–2810900；css@446401 shimmer keyframes |
| W8 流式光标 ` ▋`/` ●`（::after content var(--streamdown-caret)，仅 streaming 态挂末元素） | 属 F 域流式指示（DSH 自有实现，批次 03c F1 登记）——规格存档 | sd-app-chunk.js@437504 qb、@441200 caret 注入 |
| W9 通知/预览卡 markdown 渲染器（Ckt@2655886：`a=text-icon-blue underline underline-offset-4` **带下划线**、th/td 全边框 p-2、blockquote border-l-1；marked 实现，`Fz`@2658000 消费） | 插件无通知/预览卡面——规格存档（注意它与聊天面链接规格**不同**，勿混用） | js@2655886 Ckt 全表、@2656995 Dkt、@2658024 Fz/Okt |
| W10 mermaid 预览对话框（h-12 头、缩放 0.85/1.18 步进、grab 光标） | 批次 8 已裁「有实现无样本，留观察」——本轮只补规格存档 | js@960500–969200 缩放族 |
| W11 conversation-dom.ts（21 行） | **无 markdown 面**：scrollRoot/anchor 查询工具（:5–21），与样式零交集 | 文件全文读毕 |
| W12 foreign-content-contract.ts（110 行） | **无 markdown 面**：侧栏页脚 `cm-*` 外来内容契约（锚点+哨兵），作用域在侧栏页脚非会话区 | 文件全文读毕（FOREIGN_FOOTER_ANCHORS 全为 .cm-*） |
| W13 宿主内层 markdown 容器 `[class*="_markdown_"]` 的静态出处 | **静态不可得**（见 N1 搜索记录）——锚点运行时有效（批次 4 实测 ×31、⑧ 实测 245/245 覆盖），但当前装机 asar 内无该字面量 | 全asar 扫描 `_markdown_`：仅 zod 3 处误命中；`_markdown` 变体仅 client.pdf.js（rkta1W 文档预览，无尾下划线不匹配）；web-frontend/dist 全资产 0；runtime/pnpm 目录 0 |

### needs-live（须 9224/9223 活体定）

| # | 事项 | 说明 |
|---|---|---|
| N1 | `[class*="_markdown_"]` 锚点溯源 | 运行时类无静态出处（W13）。活体采样一次该类名的完整值与所属模块样式表，判定：宿主动态生成 or 版本漂移。若漂移，⑦⑧ 的作用域锚点按 foreign-content-contract 的「响亮失效」思路补哨兵 |
| N2 | 表格/码卡与后续块的间距 | ZCode space-y-4 给**每个**非末块 mb16；DSH 宿主 table 无 margin 规则（gKv1-q_body gap 只作用块级之间）→ 活体量 `table→p`、`码卡→p` 的实际间距，若为 0 则在 ⑦/D1 补 margin-bottom:16px |
| N3 | 引用块翻案双确认 | D1 若被主会话采纳，建议 9224 开含引用块会话活体采一次（lNt 六值 + 60% 前景色）再落码——旧 B8 ✅ 从无活体样本，翻案宜一次做实 |
| N4 | 行内码 mx-0.5 落地前宿主默认 margin | M4 的前置核实（活体 getComputedStyle(marginInline) ） |

## 6. 给下一轮的整改建议（不动手，仅排序）

1. M1–M4 一把梭（表格三处 + 行内码一行，全部单点 CSS，落点集中 conversation-layout.ts）；N4 先行 30 秒核实再落 M4。
2. D1/D2/D3 三条 deviation 送主会话裁决：D1（引用块）建议整批翻案并同步 conversation-visuals.assert.ts:461–463；D2（码体）同时收口 APPLIED.md §二挂账项与 :442 断言；D3 只需裁决「是否解禁链接字重」。
3. W1–W4/W7 规格已全量存档于 §1，后续做表格工具栏或图片灯箱功能时直接引用，无需重挖。

## 复核（复核员·10 · 2026-11-03）

> 只读复核，未改动上文任何字符。方法：按 §0 独立重写 asar 解包脚本重跑提取（产物在 /tmp/reviewer10/zc、/tmp/reviewer10/dsh），7 个产物字节数与 §0 记录**逐一致**（styles.js 6,839,502 / styles.css 480,065 / intl.js 979,836 / sd-app-chunk.js 448,665 / pierre-style.js 39,008 / typert.host.js 365,047 / dsh-client-pdf.js 7,108,801）；ZCode asar 头 u32=(4,8328596,8328592,8328585)、文件区基址 8328604 与 §0 完全一致，DSH 基址实测 4780404、mtime 10-17 17:39 亦一致。逐条用 `grep -aob` + 按偏移 dump 复现引用；插件源码按当前工作树重读（conversation-layout.ts 485 行）。活体仍未采样（与原文一致）。verdict 语义：M/N 行 verified = 该条 where/ours/zcode 事实全部复现；D 行 verdict = 证据是否成立。发现 3 处**证据归属错误**（内容真实存在、文件/偏移张冠李戴），见「归属修正」。

### mechanical

| # | verdict | 复核所见（本人实测） |
|---|---|---|
| M1 | **verified** | styles.js@2779692 KNt 全文 `tr` + `transition-colors last:[&>td]:border-b-0 hover:bg-hover/20` 逐字在；css@16230 亮 `--color-hover:var(--color-neutral-200)`、css@417146 暗 `--color-hover:var(--color-surface-hover)`、css@417805 暗 `--color-surface-hover:#ffffff1a`、css@235505 编译 `.hover\:bg-hover\/20:hover{background-color:#e5e5e533}`（fallback）+ `color-mix(in oklab, var(--color-hover) 20%, transparent)`；`.transition-colors` 时长走 `var(--default-transition-duration)`，css@13686 = `.15s`，与插件 feedback 档 150ms（zcode-theme.ts:131 `--dcu-motion-feedback-duration:150ms`）一致。插件侧 grep 全文件：无任何表格行/`tr` 悬停规则（仅有 ：117-118 flowItem 动作行、:215 折叠钮两处 hover） |
| M2 | **verified** | KNt `last:[&>td]:border-b-0` 同上在；插件 ：377 外框 `border:1px solid var(--dsw-alias-border-l2,…)`（注释即「2026-11-01 B7 暗色活体」）+ :383–391 th/td 无条件 `border-bottom:1px`，全文件无 `:last-child` 例外 → separate 折叠下末行双线成立；assert.ts:450/:454 分别锁外框与行线（补例外时不必动这两条，例外是新增规则） |
| M3 | **verified** | js@2779837 qNt = `border-border border-b px-3 py-2 text-left font-normal text-foreground-subtlest min-w-16 max-w-md whitespace-normal break-words`、js@2780051 JNt = `…text-foreground align-top min-w-16 max-w-md whitespace-normal break-words` 逐字在；编译值：css@77487 `.min-w-16{min-width:calc(var(--spacing) * 16)}` + css@12096 `--spacing:.25rem` = 64px；css@76641 `.max-w-md{max-width:var(--container-md)}` + css@12155 `--container-md:28rem` = 448px。插件 ：383–391 无 min/max 宽、无断词属性，全 ⑦ 段亦无 |
| M4 | **verified**（宿主证据归属有误，结论不变） | js@2858100±900 code 分支逐字在：`if(!('data-block' in i))return jsx('code',{className:Z('rounded-md bg-markdown-inline-code/50 mx-0.5 px-1.5 py-0.5 font-mono text-ui-sm',…)` —— `mx-0.5`（左右各 2px）实锤；插件 ：278–284 行内码规则无 margin 属性。**但**「宿主侧 grep `:not(pre)>code` 仅命中文档预览模块（dsh-client-pdf.js@5543100）」不成立：全 DSH asar 原始扫描 `not(pre` 共 4 处——dsh-client-ui-trajectory/lib/client.js@148103（即文档描述的 `font:12px/18px`、无 margin 那条）+ dsh-web-frontend/dist/assets/index-BxpfOGf3.css@32106、@35682 两处；client.pdf.js 内 0 命中。三处规则均无 margin 声明 → 「宿主静态无 margin 反证」仍成立，N4 活体门槛保留 |

### deviation（只看证据是否成立）

| # | verdict | 复核所见 |
|---|---|---|
| D1 | **证据成立** | js@2762304 lNt 逐字：`my-4 border-border border-l-2 pl-3 text-foreground-subtle` + `[&_p]:my-0 [&_p+p]:mt-2`（无斜体无字重）；组件映射 `blockquote:lNt` 在 js@2858100±900 段可见；css@38970 `.prose :where(blockquote):not(…not-prose…){…border-inline-start-width:.25rem;…margin-top:1.6em;margin-bottom:1.6em;padding-inline-start:1em;font-style:italic;font-weight:500}` 逐字在（@tailwindcss/typography 库装样式无疑）；--color-foreground-subtle css@21592 亮 `#40404099` / css@423960 暗 `#e5e5e599` 在；插件 ：397–406 六项（1.6em/14px/4px/italic/500/p 无处理）逐字在；锁定断言 conversation-visuals.assert.ts:462–463 实读确认（:464 锁 500、:465 锁 14px 也在）。唯一未代跑项：「批次 2 实测 41 流元素 0 个 .prose 祖先」是活体计数，本轮无活体无法复跑（静态侧以映射直用 lNt 为佐证） |
| D2 | **证据成立**（选择器为简写、一处偏移微偏） | pierre-style.js@4118 处实为规则尾段，完整规则 = `pre,code,[data-error-wrapper]{isolation:isolate;font-family:…;outline:none;margin:0;padding:0;display:block}`（原文简写为 `pre,code{…}`，pre 零内距零边框实质成立）；@30534 处完整选择器 = `[data-line],[data-column-number],[data-no-newline]{padding-inline:1ch;position:relative}`（简写为 `[data-line]{…}`，1ch 实质成立）；码体包 div `p-2 pt-0 pb-3` 实测在 styles.js@967583（原文引 966700——该偏移落在 vx 签名区内，`showLineNumbers:r=!1` 实测 @966623，vx 函数体覆盖两处，属宽松引用不算错）；聊天映射 `vx className:'my-4 border border-border bg-card'` + `hx className:'pl-3 pr-2 pt-2'` 在 js@2858100±900 可见；插件 ：267–277 pre 六属性逐字在；assert.ts:442 锁 `padding:6px 8px 12px` 实读确认（:441 另锁 pre 1px 边）。「旧 D1 取自 10-28 旧版 asar」为历史陈述，旧包已不在，无法代验 |
| D3 | **证据成立** | js@2844072 JIt 逐字：`wrap-anywhere text-ui-base font-medium text-icon-blue no-underline decoration-dotted underline-offset-4 hover:underline`；a 映射三分支在 js@2858100±400 可见（文件 chip→ILt 前段、http(s)→ILt、其余→span JIt）；插件 ⑧（:412–428）实读无任何 `a` 选择器规则（grep 全文件 0 命中）→「不落任何规则」与「解禁只需补 font-weight:500 + overflow-wrap:anywhere」两句话都与证据对得上 |

### needs-live

| # | verdict | 复核所见 |
|---|---|---|
| N1 | **unconfirmed（前提被证伪）** | 「当前装机 asar 内无该字面量 / web-frontend/dist 全资产 0 / 仅 zod 3 处误命中」三条全部不成立：DSH asar 原始扫描 `_markdown_` 命中 42 处——`._markdown_1ypvv_5` 定义在 dsh-web-frontend/dist/assets/index-BxpfOGf3.css（40 处，首个 @28731，容器规则 `._markdown_1ypvv_5{min-width:0;overflow-wrap:anywhere;…}` 完整在），并由 dist/index.html 显式引用（实读 html：index-CN7NIWNw.js 与 index-BxpfOGf3.css 均被引用）；index-CN7NIWNw.js 内 2 处含 `MO="_markdown_1ypvv_5"`（类名应用点）。且该模块的 `._markdown_1ypvv_5>*:first-child,._markdown_1ypvv_5 p:first-child{margin-top:0!important}` 与本文件 ⑧ 注释描述的宿主首元素归零规则（含最高优先级）逐项吻合 → 静态出处已找到，`_markdown_1ypvv_5` 大概率就是运行时容器本身。可复现部分：DSH Resources/runtime 树（311MB）`_markdown_` 0 命中 ✓、双 app.asar.unpacked 0 命中 ✓、ZCode asar `_markdown_` 2 处均在 mermaid.js 的 `handle_markdown_text`（非 zod，且是 2 处非 3 处）✗。活体采一次类名仍有价值（30 秒定案），但目的从「溯源」降级为「确认」 |
| N2 | **verified（前提成立，仍需活体）** | gKv1-q CSS 实测 **1018B 整**（与原文「1018B 全文」一致），`.gKv1-q_body{flex-direction:column;gap:16px;display:flex}` 在——但出处不是 typert.host.js（见归属修正①），实际在 dsh-client-ui-chat/lib/client.js（css$8 字符串）；body 直属子代结构在渲染点（chat-client.js@~310100–310420）确认：`children:[rendered, …stopped]`，rendered 按 block.kind 分槽（text/reasoning/图片 renderSlot）→ gap 只作用块槽之间 ✓。宿主 table 无块级 margin：web-frontend 模块 `._tableScroll_1ypvv_192 table{border-collapse:collapse;width:max-content;max-width:max-content}`（无 margin）、gKv1-q `.gKv1-q_body .md-table-wide>table{z-index:1;position:relative}`（无 margin；包裹层仅横向 margin-left/padding-left）✓。补充新事实：`._markdown_1ypvv_5 p{margin:16px 0}`——若该模块即活体内层，table→p 间距=16px 来自 p 的 margin-top，「若为 0」分支未必触发；活体仍值得量（顺带定表↔后续块的真实机制） |
| N3 | **verified（证据成立，活体代跑不了）** | D1 全链证据已复现（见 D1 行）；assert.ts:462–463 确锁旧值，翻案须同步改断言的提醒成立；「旧 B8 从无活体样本」与「9224 引用块样本」均为活体事项，本轮无活体，无法代跑——建议维持 |
| N4 | **verified（门槛保留）+ 归属修正** | mx-0.5 已实锤（见 M4）；「宿主默认 margin 静态查不到」的原表述部分失效：现知 3 处 `:not(pre)>code` 规则全部无 margin 声明（12px/18px 预览版、inline-flex 版、compact 版），静态无反证；但三处都属宿主**别的面**（trajectory 预览 / web-frontend 模块），会话区实际吃哪条仍需活体 getComputedStyle(marginInline) 定——活体门槛保留合理 |

### 归属修正（内容真实存在，文件/偏移张冠李戴；不影响 M/N/D 的实质结论）

1. **gKv1-q CSS 不在 typert.host.js**：§0/§1.1 称「typert.host.js@359598 全文 1018B」。实测：我提取的 typert.host.js（dsh-api-session-controller，365,047B，与原文同字节数）内 `gKv1`、`AssistantMarkdown` 均 **0 命中**，@359598 处是 SkillListValue typert 文档 JSON；DSH 全 asar 扫描 `gKv1` 全部命中 dsh/node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js（594,135B）@305029 起，css$8 字符串长度实测 = **1018B**，`.gKv1-q_body{flex-direction:column;gap:16px;display:flex}` 与原文一致。原文的 @359598/@364684 两偏移在 chat client.js 里也对应不上（是 turn-metrics 代码段）——偏移本身来源不明，仅字节量与内容成立。
2. **`rkta1W_markdown*` 不在 client.pdf.js**：§0 称 dsh-client-pdf.js「含文档预览 rkta1W_markdown* 模块」、W13 称「`_markdown` 变体仅 client.pdf.js」。实测：client.pdf.js（7,108,801B，与原文同字节数，PDF.js 许可头 + `exports.PdfBody` 结尾，提取无误）内 `rkta1W`、`_markdown` 均 **0 命中**；`rkta1W` 563 处全部在 dsh/node_modules/@deepseek-ai/dsh-client-ui-trajectory/lib/client.js（398,762B）；`_markdown`（无尾下划线）75 处分布为 trajectory client.js 31 + web-frontend css 40 + web-frontend js 2 + langs/markdown chunk 2。
3. **M4 的 `:not(pre)>code` 命中位置**：见 M4 行——真实位置 dsh-client-ui-trajectory/lib/client.js@148103（内容与原文描述逐字同：`font:12px/18px`、无 margin），另有两处 web-frontend 命中；「dsh-client-pdf.js@5543100」处实为 base64 数据段。

> 猜测（未验证）：原文的 DSH 侧偏移疑似由某次基址错位的提取产生——ZCode 侧全部偏移我均复现成功（唯一偏差：p-2 pt-0 pb-3 实测 @967583 vs 原文 966700，同函数体内），DSH 侧仅字节数与内容可复现、偏移系统性对不上。下一轮引用 DSH 偏移前建议以文件名+内容 grep 定位，不要直接沿用本文偏移。

### 本轮未跑的项

- 一切活体（9224/9223）：N1–N4 的活体动作、批次 2「0 个 .prose 祖先」计数、批次 4 的 hover 采样——均非本轮可达，维持原文登记。
- 「旧 D1 取自 10-28 旧版 asar」的历史真实性（旧包不在装机内）。
