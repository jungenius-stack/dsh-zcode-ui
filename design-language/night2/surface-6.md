# night2 · surface-6 · 滚动条与滚动

> 深挖员：surface-6。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面（ask 指定）：`uiplug/src/client/scroll-anim.ts`、`conversation-layout.ts`、`conversation-dom.ts`；
> 滚动条代码实际散布面（追加对照）：`zcode-tokens.ts`、`new-conversation-style.ts`、`settings-page-styles.ts`、`composer-tool-menus.ts`、`CodexWorkspaceBrowser.tsx`、`TurnNavigator.tsx`、`CodexSidebar.tsx`。
> 前置：已读 `night-audit/APPLIED.md`（滚动条零条目——不涉及重复报）、`README.md`、`02-motion.md`（点击滚动曲线/时长自适应/禁止容器级 smooth/reduced-motion 瞬跳均为既有裁决，本轮对照不翻案）。

## 0. 提取方法与可复现命令

```bash
# ── ZCode asar（头：u32=(4, 8328596, 8328592, 8328585)，文件区起点 8+8328596）──
# 提取产物存 /tmp/zc-scroll-extract/（脚本 /tmp/zc-scroll-extract.py，walk 文件树按 offset 读取）
#   out/renderer/assets/styles-Dv5E6Odo.js   6,839,502B（与 surface-3 §0 记录一致，cross-check 通过）
#   out/renderer/assets/styles-NK68EN_n.css    480,065B（同上）
#   node_modules/@radix-ui/react-scroll-area/dist/index.js 33,118B
#   node_modules/tailwind-scrollbar-hide/dist/index.js       865B
# ── DSH 宿主 asar（/Applications/DeepSeek Harness.app/Contents/Resources/app.asar）──
#   /dsh/node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js      120,575B（内含 scrollbar.css 全文）
#   /dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-BxpfOGf3.css 77,343B
# 全量扫描：/tmp/zc-scroll-scan.py（关键词 scrollbar|scrollbarGutter|ScrollShadow|overlayscrollbar|
#   simplebar|scroll-behavior|overscroll-behavior，命中 31,821 文件里的 40 个高 doom 文件，逐个核过）
```

下文 `css@N` = styles-NK68EN_n.css 字节偏移，`js@N` = styles-Dv5E6Odo.js 字节偏移（`grep -a`/`dd if=… skip=` 可复核）；DSH 宿主侧引用按「包/文件 + 抓取脚本」标注。本轮全部为静态证据，未采 9224 活体。

## 1. ZCode 滚动条与滚动系统全景（本轮新挖，静态源码级）

### 1.1 全局基座（css@445000–445323，5 条规则全文）

```css
* { scrollbar-width: auto; scrollbar-color: var(--color-border) transparent; }
::-webkit-scrollbar        { width: 14px; height: 14px; }
::-webkit-scrollbar-track  { background: 0 0; }
::-webkit-scrollbar-thumb  { background: var(--color-border); background-clip: padding-box;
                             border: 3px solid #0000; border-radius: 9999px;
                             min-width: 32px; min-height: 32px; }
::-webkit-scrollbar-corner { background: 0 0; }
```

- 药丸视觉宽 = 14 − 2×3 = **8px**；轨道/角透明；`--color-border`：浅 `color-mix(in oklab, oklch(14.5% 0 0) 10%, transparent)`（≈rgba(10,10,10,.10)，oklch 手算见 §5 注）、深 `#ffffff1a`（tokens.json core 段）。
- 双通道：标准 `scrollbar-color`（Firefox/新版 Chromium）+ webkit 伪元素（border-clip 药丸、min 32、可被属性驱动换色）。**三框内用 `scrollbar-color:auto` 关掉标准通道**，走 webkit 通道（见 1.2）——同一系统两条腿，不是冗余。

### 1.2 工作区三框「自动隐藏」状态机（css@470428–473758 + js@5906492–5909700）

**CSS 侧**（`--zcode-scrollbar-thumb` 是 `@property` 注册的 `<color>`，inherits，initial `#0000`；css@3728 的 `:root,:host{--zcode-scrollbar-thumb:transparent}` 在 `@layer properties @supports(浏览器探测)` 内，是无 @property 引擎的兜底）：

| 状态 | thumb 色 | 证据 |
|---|---|---|
| 默认（静息） | `transparent` | `:is(三框),:is(三框)*{--zcode-scrollbar-thumb:transparent;scrollbar-color:auto}` css@470627 |
| `[data-scrollbar-active]` | `var(--color-border)` | css@470902 附近 |
| thumb `:hover` / `[data-scrollbar-hover]` / active+hover | `#4040404d` → @supports 时 `color-mix(in oklab, var(--color-foreground) 30%, transparent)` | css@471072 / @472815 / @473188 |
| `:active` / `[data-scrollbar-dragging]` / active+dragging | `#40404073` → @supports 时 **45%** | css@471879 / @472936 / @473367 |
| 绑定 | `:is(三框)::-webkit-scrollbar-thumb, :is(三框) ::-webkit-scrollbar-thumb{background-color:var(--zcode-scrollbar-thumb)}` | css@470784/470953 |

三框 = `[data-project-sidebar-panel], [data-workspace-conversation-frame], [data-workspace-side-frame]`（侧栏面板、会话框、侧板框——即 ZCode 三个常驻滚动区）。

**JS 侧**（workspace 根组件 useEffect，js@5906492 起，监听全部挂在其容器上）：

| 环节 | 实现 |
|---|---|
| 激活 | `scroll`（capture）→ 给滚动容器标 `data-scrollbar-container` + toggle `data-scrollbar-active`；thumb 色用 **WAAPI `el.animate([{'--zcode-scrollbar-thumb':旧},{'--zcode-scrollbar-thumb':新}],{duration:200,easing:'ease'})`** 渐变（新值=激活 `getComputedStyle(el).getPropertyValue('--color-border')`，灭=`transparent`）；**reduced-motion 时跳过动画直接切换** |
| 熄灭 | `setTimeout 1000ms`（`1e3`）；到期时若该容器非当前 hover 目标且非拖拽中 → 渐回透明；每次滚动重置计时 |
| hover 判定 | `mousemove`（capture，rAF 节流）：从 target 上溯第一个「真可滚」祖先（scrollHeight>clientHeight 或 scrollWidth>clientWidth），且指针在**右缘 10px 内**（纵）/**底缘 10px 内**（横）；兜底扫描 `[data-scrollbar-container]` 右缘 **14px** 内。再按拇指几何（`size=min(r,max(32, r*r/i))`、`pos=offset/(total-r)*(r-size)`）判断指针是否压在拇指上 → `data-scrollbar-hover` |
| 拖拽 | `mousedown`（capture）命中 hover 中容器 → `data-scrollbar-dragging`；window mouseup/pointercancel/blur 清除并重置 |
| 卸载 | 全部监听/计时器/animation 取消，属性清理 |

### 1.3 关闭面与工具类

- `.scrollbar-hide{scrollbar-width:none}` + `::-webkit-scrollbar{display:none}`（css@58127），另有 `.\!scrollbar-hide` important 版；用点：命令面板列表 `max-h-72`（js@1707151）、⌘K scope 页签（js@1731960）、表格横滚壳（js@2683916）、**时间线 rail**（js@4419675）、侧板页签（js@5878142）、shell 页签（js@5892194）。
- 定向关闭：terminal `.xterm-viewport{scrollbar-width:none}`（css@445323）、pptx 渲染面（css@445393）、工作流 `.wf-scroller`（css@462006）。
- **Radix ScrollArea**（vendor @412371，默认 `type:'hover'`、`scrollHideDelay:600`）封装 `n4`：viewport + 纵向滚动条 `data-vertical:w-2`(8px) `p-[2px]`，thumb `rounded-full bg-border`（js@4521366）。应用仅 3 处：分享选择器（`type:'always'`，js@4526858）、两个 `h-52 w-14` 小选择列（js@4781698/4783197）。主界面滚动条不走它。
- 内联细滚动条一例：文件应用列表 `scrollbarWidth:'thin', scrollbarColor:'var(--color-foreground-subtlest) transparent', scrollbarGutter:'stable'`（js@2728779）。

### 1.4 scrollbar-gutter 使用面

| 面 | 值 | 证据 |
|---|---|---|
| **会话滚动区** | `overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]`（**全程**，另有 `!overflow-y-hidden` 锁滚态） | js@4464276（元素属性串）；元素即 `data-v4-timeline-scroll` 持有者 |
| automations / plugin-store / 全局设置 main | `overflow-y-auto [scrollbar-gutter:stable]`（单边） | js@5929748 / @5930662 / @6457453 |
| diffs（@pierre shadow DOM） | `scrollbar-gutter:stable` + 测量变量 `--diffs-scrollbar-gutter-fallback:6px` | js@775243/@755653 |

### 1.5 滚动阴影 = mask-image 渐隐系统（无 box-shadow 滚动阴影）

- 参数：**fade 带 24px**（`Nq=24`）、阈值 1px（`Pq=1`）；`Iq` 由 clientHeight/scrollHeight/scrollTop 算 `showTop/showBottom`；`Lq` 生成 `mask-image:linear-gradient(to bottom, transparent 0px→black 24px, black calc(100%−24px)→transparent 100%)`，`no-repeat`，`maskSize:100% 100%`（js@3028529–3028555）。
- 复用组件 `kj`：`data-scroll-mask` + 状态类映射 `vst{none,top,bottom,both}`（js@1746300/@1747743）；用点：设置/详情 720px 面板（js@1761316/1765519/1770266）、命令中心详情（js@2624225）、composer 模型菜单 `max-h-60`（js@3260193）、**bash 输出 `data-following`**（js@3911655/5768292）。
- 工具组另一份：`data-cua-group-scroll-mask`（js@3807704，同一 Lq）。
- **主会话滚动区无渐隐**（mask-image 全部 15 处枚举均不落在会话滚动区，见 §5 搜索记录）——滚动阴影只给「次级滚动面」。
- css 静态同款工具类：`[mask-image:linear-gradient(to_bottom,transparent_0,black_24px,…)]`（css@139452/139613）。

### 1.6 平滑滚动（ZCode 语义）

- **无任何 CSS `scroll-behavior:smooth`**：编译 CSS 0 命中（§5 搜索记录）；`overscroll-contain` 工具类存在（css@94904），用于弹层/工具列表（js@2092265 等 12 处）。
- reduced-motion 助手：`function T$(){…matchMedia('(prefers-reduced-motion: reduce)').matches}`（js@3984049）。
- **点击轮次跳转**（js@4458144 `en`）：`behavior` 参默认 `'auto'`；时间线刻度 `onClick:()=>onJumpToQuery(…, prefersReducedMotion?'auto':'smooth')`（js@4421245）。实现：目标行已挂载 → `behavior==='auto' ? scrollTop=offset : scrollTo({top,behavior})`（**原生平滑**）；未挂载 → 虚拟化 `scrollToIndex(unitIndex,{align:'start',behavi…})`。
- 其余 smooth 用点全是横滚：工作流轨道 `scrollBy/scrollTo({behavior:T$()?'auto':'smooth'})`（js@3987306/3998486/3999214）、侧板页签条（js@5870768）、卡片列表 `scrollIntoView({block:'start'})`（js@5789881/5844758）。

## 2. DSH 宿主现状（插件「ours」的起点）

- **宿主滚动条基座**（dsh-client-ui-theme `scrollbar.css` 全文，asar 提取见 §0）：
  ```css
  body{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l1);
       --dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l1);
       --dsh-scrollbar-thumb-border:0px; --dsh-scrollbar-track-margin:0px;
       --dsh-scrollbar-width:5px}
  @supports not selector(::-webkit-scrollbar){body,body *{scrollbar-width:thin;
       scrollbar-color:var(--dsh-scrollbar-thumb) transparent}}
  ::-webkit-scrollbar{width:var(--dsh-scrollbar-width);height:var(--dsh-scrollbar-width)}
  ::-webkit-scrollbar-track{margin-block:var(--dsh-scrollbar-track-margin);background:0 0}
  ::-webkit-scrollbar-thumb{border:var(--dsh-scrollbar-thumb-border) solid transparent;
       corner-shape:round;background:var(--dsh-scrollbar-thumb);
       background-clip:content-box;border-radius:999px}
  ::-webkit-scrollbar-thumb:hover{background-color:var(--dsh-scrollbar-thumb-hover)}
  ::-webkit-scrollbar-corner{background:0 0}
  ```
  无 `:active` 态、无自动隐藏（thumb 常显）、无 min 尺寸。
- 宿主 alias 出厂值（同包 base.css）：浅 bg=neutral-200 / hover=neutral-300；深 bg-l1=neutral-700、bg-l2=neutral-600、hover-l1=neutral-600、hover-l2=neutral-550。插件已在 zcode-tokens.ts 覆写全部 4 个 alias（见 §3）。
- 宿主消费面：菜单/输入卡/TodoPanel/hover 媒体预览/dock pane 全部自带 `--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)`（dsh-index.css@17356、conversation client.js@549095/656041/681608）；composer 浮层座位 `right:var(--dsh-scrollbar-width)`（conversation client.js，grep `llBody:has(\[data-conversation-composer-overlay\])`）。
- 宿主会话滚动容器：`.wSkVaW_scrollBody{scrollbar-gutter:stable}`（conversation client.js@582824）；`:has([data-conversation-composer-overlay])` 时 `scrollbar-gutter:auto`（@583573）。
- 宿主已有同款 **24px 渐隐 mask**：工具体 fadeTop/Bottom、时间线 rail、dock 页签条（dsh-index.css@67129 + conversation client.js css$12/css$11）——与 ZCode Lq 同参。
- 宿主 wide 表格 hover-reveal：`overflow-x:hidden → :hover/:focus-visible 时 overflow-x:scroll + padding-bottom:var(--dsh-scrollbar-width,5px)`（dsh-index.css@32885），注释明言「Chromium 不重绘状态化滚动条样式」。terminal thumb 自带 2px 透明边 + track margin 6px（@49431/49566）。

## 3. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 7 条）

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | zcode-tokens.ts:563-564（`--dsh-scrollbar-width:8px` / `--dsh-scrollbar-thumb-border:2px`，宿主 scrollbar.css 消费） | thumb 几何 | 轨道 8px − 2×2px 透明边 = **视觉 4px**，无 min 尺寸 | 轨道 14px − 2×3px = **视觉 8px**，`min-width/height:32px`，radius 9999 | css@445000；DSH scrollbar.css（§2 全文）；改值 14px/3px 即精确对齐，32px min 需插件补一条全局 thumb 规则 |
| M2 | zcode-tokens.ts:238-239（浅）/465-468（深）alias `bg-l1/l2` | 静息 thumb 色 | 15%（rgba(13,13,13,.15) / rgba(255,255,255,.15)） | `--color-border` = 10%（浅 ≈rgba(10,10,10,.10)，深 #ffffff1a） | tokens.json core `--color-border`；css@445000；oklch(14.5% 0 0)→sRGB 手算 ≈rgb(10,10,10)（OKLab 标准矩阵） |
| M3 | zcode-tokens.ts:240-241/467-468 alias `hover-l1/l2` | hover thumb 色 | 25% | 30%（fallback `#4040404d`，@supports `color-mix(in oklab, var(--color-foreground) 30%, transparent)`） | css@471072/@473188 |
| M4 | 插件注入 CSS（新条目） | 拖拽/按压态 | 无（宿主 scrollbar.css 无 `:active` 规则） | 45%（`#40404073` / 45% mix） | css@471879/@473367；DSH scrollbar.css §2——插件追加 `::-webkit-scrollbar-thumb:active` 一条即可，序在宿主 sheet 之后生效 |
| M5 | 插件新 JS 模块 + CSS（注入点 = 宿主现成变量 `--dsh-scrollbar-thumb`） | 自动隐藏状态机 | 无：thumb 常显（宿主基座），三常驻区无「滚动才现、1s 熄灭」语义 | §1.2 全套：静息 transparent；scroll→active（200ms ease WAAPI 渐变）；1s 空闲熄灭；右缘 10px/兜底 14px hover 判定 + 拇指几何命中；drag 态；reduced-motion 跳过动画 | js@5906492–5909700；css@470428–473758。宿主把 thumb 色收在 `--dsh-scrollbar-thumb` 一个变量上，插件状态机改写该变量即可全局面生效（菜单/pane 的局部默认可被更近作用域覆盖） |
| M6 | conversation-layout.ts（新增一条）+ new-conversation-style.ts:4 | 会话滚动区 gutter | hero 阶段才有 `stable both-edges`（new-conversation-style.ts:4）；非 hero 实际吃宿主 `.wSkVaW_scrollBody{scrollbar-gutter:stable}` 单边 | `stable both-edges` **全程**（会话滚动区唯一 both-edges 用点） | js@4464276；conversation client.js@582824。建议落 `[data-conversation-scroll]:not(:has([data-conversation-composer-overlay])){scrollbar-gutter:stable both-edges}`——宿主 overlay 态显式 `auto`（@583573）是宿主自有意图，用 `:not(:has())` 守卫避开 |
| M7 | settings-page-styles.ts:84 `.dcu-settings-main` | 自设滚动条 | `scrollbar-width:thin; scrollbar-color:var(--sp-border) transparent`（绕开宿主药丸体系，UA 细条）+ 无 gutter | 设置页 main = `overflow-y-auto [scrollbar-gutter:stable]` + 全局基座药丸（--color-border，视觉 8px） | js@6457453；css@445000。删 thin/color 两声明（回归宿主基座=已吃 M1-M3 对齐值）+ 补 `scrollbar-gutter:stable` |

> M1-M3/M7 是纯值面，M4/M6 一条 CSS，M5 一个独立小模块（规格在 §1.2 已完备，含 reduced-motion 分支与 WAAPI 参数）。M5 落地时 DSH 侧栏树（CodexWorkspaceBrowser `.dcu-wb-tree`）是否加入三框语义见 D2。

## 4. deviation（触既有裁决，登记不修）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | scroll-anim.ts:27-49,88-137（时长自适应 320-2200ms/3.2px·ms⁻¹、瞬移+尾段、互扰让位） | 点击滚动的实现路径 | 自绘 rAF + Chrome smooth 采样查表曲线 + `>1200px` 瞬移到目标前 0.6 屏 + 双 rAF 等宿主挂载 + 2px 让位 | `behavior:'auto' ? scrollTop=offset : scrollTo({top,behavior:'smooth'})` **原生平滑**；未挂载走虚拟化 `scrollToIndex` | 02-motion §2/§3 既有裁决（DSH 宿主每批挂载 ~116ms 固定成本、虚拟列表重挂载 150-400ms/帧、预算 400-800px/帧），本轮**源码级坐实** ZCode 语义（js@4458144 `en` + js@4421245 onClick + T$@3984049），非推翻而是加强：DSH 侧不能照抄原生 smooth，维持 |
| D2 | CodexWorkspaceBrowser.tsx:200-201（`.dcu-wb-tree` `scrollbar-width:none` + `::-webkit-scrollbar{display:none}`） | 侧栏树滚动条 | 整体隐藏（配 padding-bottom 24 + 页脚交代，P0-6 自有适配） | 侧栏面板 = 自动隐藏系统成员（`data-project-sidebar-panel`：静息透明、滚动现形、1s 熄灭） | P0-6 既有裁决（「滚动条被隐藏…页脚给交代」注释与页脚措施是有意适配）；与 M5 的关系=若 M5 落地，树容器可从「隐藏」升级为「静息透明」，属增强非必改，登记待 M5 排期 |

## 5. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 会话区禁横滚 | `[data-conversation-scroll]{overflow-x:hidden}`（conversation-layout.ts:46，X1） | `overflow-x-hidden overflow-y-auto` | js@4464276 |
| A2 时间线 rail 隐滚动条 | `.dcu-turn-scroll{scrollbar-width:none}` + webkit display:none（TurnNavigator.tsx:30-31） | rail 容器 `!scrollbar-hide` | js@4419675 |
| A3 reduced-motion 点击瞬跳 | matchMedia 命中→`scrollTop=to` 直接赋值（scroll-anim.ts:97-101） | `T$()?'auto':'smooth'` + `behavior==='auto'` 时 `scrollTop=offset` | scroll-anim.ts:97；js@3984049/@4458144 |
| A4 不用容器级 CSS smooth | 仅点击这一次由 JS 驱动，无 `scroll-behavior:smooth` | 编译 CSS `scroll-behavior` 0 命中（ZCode 自身亦无） | §5 搜索记录① |
| A5 滚动条变量注入机制 | 插件覆写宿主全部 4 个 alias（zcode-tokens.ts:238-241/465-468），宿主 scrollbar.css+菜单+pane 全消费 | ZCode 同为「变量驱动 thumb 色」思路（`--zcode-scrollbar-thumb`） | DSH scrollbar.css §2；css@470428 |
| A6 透明轨道/corner | 宿主 `track{background:0 0}`、`corner{background:0 0}` | 同 | css@445000；DSH scrollbar.css |
| A7 药丸圆角 | 宿主 `border-radius:999px`（+corner-shape:round） | `border-radius:9999px` | 同上（同为全圆角，等效） |
| A8 hero 阶段 gutter both-edges | `scrollbar-gutter:stable both-edges`（new-conversation-style.ts:4） | 会话滚动区同值 | js@4464276（非 hero 档缺口→M6） |
| A9 弹层 overscroll-contain | `.dcu-settings-main{overscroll-behavior:contain}`（settings-page-styles.ts:84） | 弹层/工具列表同款工具类 12 处 | js@2092265 等 |
| A10 渐隐 mask 带宽 24px | DSH 宿主工具体/rail/dock 条自带 24px fade（插件无须动作） | `Nq=24` | js@3028529；dsh-index.css@67129 |
| A11 non-webkit 兜底 | 宿主 `@supports not selector(::-webkit-scrollbar){thin + scrollbar-color}` | ZCode 标准通道 `scrollbar-color` 全局声明 | css@445000；DSH scrollbar.css |

## 6. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| conversation-dom.ts（22 行全读） | 纯锚点索引工具（scrollRoot/anchor/anchors 批量扫描），无滚动条/滚动样式逻辑，**无 ZCode 对应面可对齐**；其查询的 `[data-conversation-scroll]` 正是 M5/M6 的作用容器 | 文件全文；`scroll` 相关关键词 0 命中于该文件 |
| 会话滚动区的滚动阴影 | ZCode **没有**（mask 只给 bash 输出/菜单/详情等次级面）；插件会话区亦无 → 一致，不产 diff | `mask-image:linear-gradient` 编译 CSS 全部 15 处（css@2606/2669/138999–139677）逐一核过归属；`kj(` 用点 8 处；`data-cua-group-scroll-mask` 1 处；主会话元素类串（js@4463900–4465000）无 mask |
| Radix ScrollArea（scrollHideDelay 600 默认） | ZCode 仅 3 个边缘用点（§1.3），DSH 无等价小选择列 → 无参照，不产 diff | `$ye` 3 处→改名 `xbe`→`n4` 封装 js@4521366→用点 js@4526858/4781698/4783197 |
| `scrollbar-gutter:stable` 单边面（automations/plugin-store/设置/diffs） | 插件无 automations/plugin-store 面宿主自管；diffs 是 ZCode 内嵌 @pierre shadow DOM → 无插件动作 | js 内 `scrollbar-gutter` 全部 11 处枚举（§1.4 已列） |
| `--sp-border`（settings-page-styles.ts:84 所引）值面 | 属 M7 一并删的声明，未单列；其值定义在 settings-page-styles.ts 自身令牌段 | grep `--sp-border` 于 settings-page-styles.ts |
| composer 工具菜单 `scrollbar-width:thin`（composer-tool-menus.ts:24,46） | **needs-live**：ZCode 对应面（命令列表）是 `scrollbar-hide`，但 DSH 菜单极少溢出、宿主菜单壳已设 alias thumb 变量；thin 是否实际可见需 9224 造溢出样本后再裁 | js@1707151（命令列表 hide）；dsh-index.css@17356（菜单壳 thumb 变量） |
| needs-live ① | M6 `:not(:has(overlay))` 守卫下，非 overlay 流式期 both-edges 与宿主 `--dsh-composer-side-clearance:8px`/composer 座位 `right:var(--dsh-scrollbar-width)` 的合成（M1 改 14px 后座位偏移同步变 14px）是否有 2px 级错位——需 9224 目检 | conversation client.js@582824/@583573 + grep `right:var(--dsh-scrollbar-width)` |
| needs-live ② | M1 的 `min-width/height:32px` 在 DSH 矮容器（菜单/下拉）是否出怪异长 thumb——ZCode 全局就有 32px，但 DSH 容器更矮，活体目检一次 | css@445000 `min-width:32px;min-height:32px` |
| needs-live ③ | M5 状态机落地后的对拍验收（滚动出现→1s 熄灭→hover 提亮→拖拽 45%），规格已源码级完备，验收需 9224/9223 活体录屏 | js@5906492–5909700 |

> 附：ZCode `--color-border` 浅色 ≈rgba(10,10,10,.10) 为 OKLab→sRGB 手算（L=0.145 → linear 0.00305 → sRGB ≈0.0395 ≈ rgb 10）；落码建议直接引 tokens.json 原 `color-mix(in oklab, oklch(14.5% 0 0) 10%, transparent)` 表达式或活体取色复核（同 surface-3 M10 先例）。

## 7. 给下一轮的整改建议（不动手，仅排序）

1. 纯值三连：M1（14px/3px+min32）、M2（10%）、M3（30%）+ M4（:active 45%）——全部落在 zcode-tokens.ts 两段 + 一条注入 CSS，一次 diff 收口；改后宿主全局面（菜单/pane/终端/会话）自动跟进。
2. M7（settings 自设滚动条拆除）独立小 diff，与 1 无耦合。
3. M6（gutter both-edges 全程开，带 `:not(:has(overlay))` 守卫）一条规则；先做 needs-live ① 再合入。
4. M5（自动隐藏状态机）体量最大（~90 行 JS + 几条 CSS），规格以 §1.2 表为准；落地后同步决策 D2（侧栏树从「隐藏」升级「静息透明」）；验收走 needs-live ③。
5. 建议在 02-motion.md 补「滚动条档」章节（ZCode 14/8px、10%/30%/45%、1s/200ms、三框作用域；本轮不改文档）。

## 复核

> 复核员 6。2026-11-03。只读复核，以上原文未动。本轮全部证据**亲自重新提取**：ZCode asar 头 u32=4,8328596,8328592,8328585（od 实测，与 §0 一致）；提取产物 `/tmp/zc-review-zcode/`（styles-Dv5E6Odo.js 6,839,502B、styles-NK68EN_n.css 480,065B、react-scroll-area 33,118B、tailwind-scrollbar-hide 865B，四个大小均与 §0 一致）与 `/tmp/zc-review-dsh/`（theme client.js 120,575B、index-BxpfOGf3.css 77,343B、conversation client.js 774,060B、web-frontend index-CN7NIWNw.js 939,867B）。工具：只读 asar 解析脚本 + `grep -a -bo`（字节偏移）+ `python str.find`（字符偏移）+ 全 asar 字节串定位。

### 复核口径勘误（不改结论，只改复现方式）

1. **js@N 是字符偏移，不是字节偏移**。`data-scrollbar-active` 文档 js@5906492 = `str.find` 5906487（同处），字节偏移实为 **6019110**；`data-v4-timeline-scroll` char 4463693 / byte 4571938。§0 的「grep -a/dd skip= 可复核」按字节口径无法直接复现 js@ 数字（差值随多字节密度 438→113,618 递增）；css@ 近似即字节偏移（CSS 近纯 ASCII，@property 起点与 470428 精确一致，§1.1 实际规则区 byte 445006–445362）。
2. **DSH conversation 包引用为旧构建**。`.wSkVaW_scrollBody` 在当前 asar 全文 **0 命中**（全 asar 字节定位，含插件区全目录检索）；文档 conversation client.js 五处偏移（582824/583573/549095/656041/681608）在当前文件分别落在 locale 文案等无关内容。当前构建的对应物（全部亲自核到，dsh-client-ui-conversation/lib/client.js，字符偏移）：`.ST7X_W_scrollBody{scrollbar-gutter:stable;…overflow-y:auto}` @638033、`.ST7X_W_scrollBody:has([data-conversation-composer-overlay]){scrollbar-gutter:auto;…}` @638737、座位 `right:var(--dsh-scrollbar-width)` @639012、`--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)` 组件默认 3 处 @606086/711544/738203、`llBody:has([data-conversation-composer-overlay])` 3 处。**所支撑的实质结论全部成立**，仅类名与偏移过期。
3. §2「注释明言 Chromium 不重绘状态化滚动条样式」：当前 DSH asar 全文 0 命中「不重绘」（minified CSS 无此注释），该注释引文无法在活包复现；且 `md-table-wide` 的 `padding-bottom:var(--dsh-scrollbar-width,5px)` 在**基础态**（hidden），hover/focus-visible 态是 `overflow-x:scroll;padding-bottom:0`（dsh-index.css byte 32830 起）——文档把两个态的 padding 写反了。hover-reveal 机制本身成立。此条属 §2 全景、不在差异表行内，仅登记。

### mechanical 逐条（M1–M7）

| # | verdict | 本轮实见 |
|---|---|---|
| M1 | **verified** | zcode-tokens.ts:563-564 逐字（`'--dsh-scrollbar-width':'8px'`/`'--dsh-scrollbar-thumb-border':'2px'`）；ZCode 全局基座 byte 445006–445362 逐字（`width:14px;height:14px`、thumb `border:3px solid #0000;border-radius:9999px;min-width:32px;min-height:32px`）；DSH scrollbar.css（theme client.js char 80530 起）逐字 = §2 全文，`width:var(--dsh-scrollbar-width)`、`border:var(--dsh-scrollbar-thumb-border) solid transparent`、**无任何 min-width/min-height**。视觉 4px vs 8px、min 32 差异成立 |
| M2 | **verified** | tokens.json（design-language/tokens.json，本仓自留）`--color-border: light=color-mix(in oklab, oklch(14.5% 0 0) 10%, transparent) / dark=#ffffff1a` 逐字；编译 CSS 链条亲自跑通：`--color-neutral-950:oklch(14.5% 0 0)` + `:root,:host` @supports 档 `--color-border:color-mix(in oklab,var(--color-neutral-950) 10%,transparent)`（fallback `#0a0a0a1a` = rgb(10,10,10)@10.2%，ZCode 自身 fallback 独立印证换算）。**亲自按 OKLab 标准矩阵计算**：oklch(14.5% 0 0) → linear 0.003049 → sRGB **rgb(10.04,10.04,10.04)**，文档「≈rgb(10,10,10)」成立。插件侧 238-241/465-468 逐字 15%/25%。一个细化：编译 CSS 深色基础档（.dark）实为 `#fafafa1a`+color-mix(neutral-50 10%)，`#ffffff1a` 挂在 `.theme-zai-dark`——两者同为 10% 档（hex 1a≈10.2%），不改变 M2 差异方向与幅度 |
| M3 | **verified** | 三框 thumb hover 四个变体（直接/后代/active+hover，char 470428 起整段）逐字：fallback `#4040404d` + @supports `color-mix(in oklab, var(--color-foreground) 30%, transparent)`。插件侧 240-241/467-468 = 25% 逐字 |
| M4 | **verified** | DSH scrollbar.css 全文仅 `::-webkit-scrollbar-thumb` 与 `::-webkit-scrollbar-thumb:hover` 两条，**无 `:active`**（grep 实测）；ZCode thumb `:active` 四变体逐字：`#40404073` + @supports 45% mix（含 `[data-scrollbar-active][data-scrollbar-dragging]` 变量覆盖式） |
| M5 | **verified**（引用偏移按口径勘误 1 换算） | 状态机 JS 整段逐字核到（byte 6019110 起）：scroll capture → `data-scrollbar-container`+`toggleAttribute('data-scrollbar-active')`；WAAPI `e.animate([{"--zcode-scrollbar-thumb":n},{"--zcode-scrollbar-thumb":r}],{duration:200,easing:'ease'})`，新值 `getPropertyValue('--color-border')`/灭 `transparent`，`if(!matchMedia('(prefers-reduced-motion: reduce)').matches)` 包住动画（reduced 直切）；`setTimeout(…,1e3)` 且回调判 `!(e===r\|\|i)`（非 hover、非拖拽才熄灭）、滚动重挂计时；mousemove rAF 节流，上溯真可滚祖先（`scrollHeight>clientHeight\|\|scrollWidth>clientWidth`），纵=右缘 10px（且要求 `offsetWidth>clientWidth`）、横=底缘 10px，兜底扫 `[data-scrollbar-container]` 右缘 **14px**；拇指几何逐字 `s=Math.min(r,Math.max(32,r*r/i))`、`u=i>r?o/(i-r)*(r-s):0`；mousedown capture→`data-scrollbar-dragging`，window mouseup/pointercancel/blur 清除；卸载清理全套（监听/计时/animation.cancel/属性）。宿主侧 `data-scrollbar-active` 全 asar **0 命中**（确无自动隐藏）。补一句文档没写的：还挂了 `pointerleave`（清 hover 态），落地时可一并抄 |
| M6 | **verified**（宿主类名过期，见口径勘误 2） | ZCode 侧：`overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]` 在 char 4464241–4464315 逐字，`stable_both-edges` 全文**仅 1 处**，宿主元素即 `data-v4-timeline-scroll:"true"` 持有者（同元素还有 `data-following`、`!overflow-y-hidden` 锁滚条件）——「全程」与「唯一 both-edges 用点」均实锤。插件侧：new-conversation-style.ts:4 仅 `[data-phase=hero]` 作用域有 both-edges，conversation-layout.ts 全文 0 处 gutter。宿主侧（当前构建）：`.ST7X_W_scrollBody{scrollbar-gutter:stable}` 单边 + `:has(overlay)→auto`，与文档机制描述一致 |
| M7 | **verified** | settings-page-styles.ts:84 逐字：`.dcu-settings-main{…overflow:auto;overscroll-behavior:contain;background:var(--sp-bg);scrollbar-width:thin;scrollbar-color:var(--sp-border) transparent}`，无 gutter。ZCode 设置 main char 6457453 精确命中 `min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]`，叠全局基座药丸（M1 已核） |

### deviation（只核证据是否成立）

| # | verdict | 证据核验 |
|---|---|---|
| D1 | **证据成立** | 插件侧 scroll-anim.ts 亲自全读：27-29 行 320/2200/3.2、47-49 行 0.6/1200、66-79 行 21 点采样查表、97-101 行 reduced-motion 瞬跳、110-118 行瞬移+双 rAF、146/163 行 2px 让位——与行描述一致。ZCode 侧：`en` 函数（char 4458144 精确命中）`(e,t='auto')` 默认 auto，实现逐字 `t==='auto'?n.scrollTop=i:n.scrollTo({top:i,behavior:t})`；刻度 onClick（char 4421245）`o?'auto':'smooth'`，`o` 即组件解构的 `prefersReducedMotion` prop（char 4420325）；`T$`（char 3984049 精确命中函数起点）全文逐字。既有裁决面：02-motion.md §2/§3 存在且数字全对——~116ms（L76-79）、400~800px/帧（L21/29/53）、150~400ms/帧重挂载（L28）、320~2200ms/3.2px·ms⁻¹（L21）。非翻案、系加强，成立 |
| D2 | **证据成立** | CodexWorkspaceBrowser.tsx:200-201 逐字（`scrollbar-width:none`+`::-webkit-scrollbar{display:none}`），193-199 行 P0-6 注释块在（「方案 A（留白 + 页脚上投影）」、padding-bottom 24px）；三框选择器含 `[data-project-sidebar-panel]` 已在 M5/M3 的整段 dump 中逐字核到（char 470627 附近）。与 M5 的关系描述（可升级非必改）与证据相符 |

### needs-live（静态半核完，活体半未采）

| # | verdict | 说明 |
|---|---|---|
| composer thin（composer-tool-menus.ts:24,46） | **unconfirmed**（维持 needs-live 分类正确） | 静态半 verified：两行 `scrollbar-width:thin` 逐字在；ZCode 命令列表 char 1707151 逐字 `scrollbar-hide max-h-72`（hide 属实）；dsh-index.css byte 17300 起 `_…_` 菜单壳自带 `--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)`（l2 档属实）。thin 是否实际可见取决于溢出样本——**本轮未造样本、未采活体**，维持待裁。9224 本轮在线（CDP 应答 Chrome/152.0.7977.130），检查可随时补做 |
| needs-live ① | **unconfirmed** | 静态半 verified：座位 `right:var(--dsh-scrollbar-width)` 在（当前构建 char 639012），M1 改 14px 后座位同步变 14px 的前提成立（同一变量）；但 2px 级合成错位需 M6 落地后目检，**未做** |
| needs-live ② | **unconfirmed** | 静态半 verified：css@445000 段 `min-width:32px;min-height:32px` 在（byte 445006–445362）；DSH 矮容器表现未采 |
| needs-live ③ | **unconfirmed** | 规格面已源码级复核完备（见 M5）；对拍验收需活体录屏，**未做** |

### 总结论

差异表 7 条 mechanical **全部 verified**（M6 宿主类名过期、M2 深色档细化，均已注明且不改变差异方向）；2 条 deviation 证据成立；4 条 needs-live 维持原分类，活体部分本轮未采。复现注意两点：js@ 偏移按**字符**口径查（§0 的 grep/dd 字节复现法需换算）；DSH conversation 包引用是旧构建（`.wSkVaW_scrollBody`→`.ST7X_W_scrollBody`），引用偏移不可直接复现，实质值全部换新核到。
