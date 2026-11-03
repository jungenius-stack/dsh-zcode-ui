# gapfill-9 · 批次9 无参照项补采（settings-nav-icons / new-conversation-style / composer-width / conversation-layout / session-manager）

> 2026-10-30 补采。对象：`night-audit/batch-9.md`「无参照项」5 条。
> 方法：全部对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）实跑 `grep -a`（下文命令均本轮执行，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）；窗口提取用 `grep -a -b -o` 取字节偏移 + `tail -c +N | head -c M | iconv -c -f utf-8 -t utf-8` 切片。
> 本轮 uiplug 源码定位复核（只读）：5 个模块全文重读，行号与 batch-9 所记一致（settings-nav-icons `:5-14,69-71,:3,59-63`；new-conversation-style `:8-13,15-34`；composer-width `:1-3,20,73-78`；conversation-layout `:202-219`；session-manager `:1-43`）。
>
> **总判定：4 条升级为「有参照」，1 条维持「确认无参照」（found=4, absent=1）。** 关键翻案：① ZCode 设置导航 18 项**全带 lucide 线性图标**（batch-9 只搜了 path 固定串，没搜「设置导航项结构」这一载体）；② ZCode 新建页（draft 态）**可从 asar 静态采到完整几何**（batch-9 判「未采集/待建」，实际组件、建议卡、workspace chip 全在）；③ 气泡折叠钮面（bg/影/毛玻璃）有逐属性原文。注意：**有参照 ≠ 数值一致**——多为「方案/形态不同，按差异项登记」。

---

## 条目1 · settings-nav-icons.ts 全部图标决策（8 个内联 path + viewBox 16/20/14 + fill 方案 + about 置尾 order）

**搜索过的模式**（全部实跑）：
- uiplug 8 个 path 的特征数字：`grep -a -c -o` 逐个跑 `'5.4.46369'|'15.4067'|'15.8659'|'12.5757'|'0.546878'|'11.0307'|'12.5113'|'9.94133'` → 8/8 无 SVG 命中；4 个非零全是数字噪音，经 `grep -a -b -o` 偏移开窗核实：`1255113`(hash 串)、`12,5113`(千分位)、`1578659`(hash)、`15e4067`(科学计数)——**复核确认 batch-9「8/8 固定串 0 命中、短片段命中为 hash」结论正确**
- viewBox 三档：`grep -a -c '0 0 14 14'` → 0；`'0 0 20 20'` → 2；`'0 0 16 16'` → 78（计数命中，未逐一开窗，16/20 为通用图标尺寸不构成证据）
- lucide 图标名：`circle-help`(5)/`help-circle`(7)/`CircleHelp`(8)/`MessageCircleQuestion`(39)/`SlidersHorizontal`(26)/`ArchiveRestore`(26)/`archive-x`(16)/`Sparkles`(62)/`sparkle`(102) → lucide 全家桶在包内
- 设置导航项结构：`grep -a -o -E 'id:\`[a-zA-Z]+\`,icon:[a-zA-Z$_]{1,4},titleId:\`settings\.[a-zA-Z]+\`,groupId:\`[a-zA-Z]+\`'` → 6 项直接命中；扩展 `icon:…,titleId:…` 全表 → 18 项
- 图标变量归属：`import\{t as kc\}from"\./…"` 形态逐变量解析 → chunk 名即 lucide 图标名
- 工厂方案：`grep -a -o -E 'fill:\`none\`[^`]{0,40}stroke:\`currentColor\`…'` + `viewBox:\`0 0 24 24\``
- 导航项渲染组件：`settingsSectionGroups` 消费点 → `hXn` 定义
- about 存在性：`id:\`about\``(0)、`` `settings.about*` ``(0)、`aboutTitle`(3，i18n 噪音)、`2147483647`(110，通用 INT32_MAX 常量)

**命中原文**：
1. **ZCode 设置导航完整清单**（`MYn` 数组，@332637518 窗口）——18 项 / 3 分组（basics / agentCapabilities / dataAndStats），每项带 lucide 图标变量：
```js
{id:`general`,icon:kc,…},{id:`appearance`,icon:lc,…},{id:`modelProvider`,icon:cc,…},
{id:`memory`,icon:Yo,…},{id:`subagents`,icon:qo,…},{id:`plugin`,icon:Ko,…},{id:`mcp`,icon:Zo,…},
{id:`skill`,icon:Uc,…},{id:`commands`,icon:Rc,…},{id:`automations`,icon:Io,…},{id:`hooks`,icon:Lo,…},
{id:`browser`,icon:_te,…},{id:`remoteDevices`,icon:Fte,…},{id:`computerUse`,icon:ic,…},
{id:`shortcuts`,icon:zs,…},{id:`workspaceFileSearch`,icon:Cte,…},{id:`usage`,icon:Xee,…},
{id:`archives`,icon:Ro,titleId:`archives.nav`,groupId:`dataAndStats`}
```
2. **图标变量 → lucide 图标名**（`import{t as kc}from"./settings-2-CoSw8e8y.js"` 形态逐个解析）：general=**settings-2**、appearance=palette、modelProvider=package、memory=brain、**mcp=cable**、**skill=wand-sparkles**、**plugin=blocks**、**automations=alarm-clock**、hooks=anchor、browser=earth、remoteDevices=hard-drive、computerUse=monitor、shortcuts=keyboard、workspaceFileSearch=file-search、usage=chart-column、**archives=archive**、**subagents=bot**（与 uiplug 8 分区的语义映射：skills→wand-sparkles、plugins→blocks、connectors≈mcp→cable、schedule≈automations→alarm-clock、archive→archive、experts≈subagents→bot）。
3. **渲染方案**（lucide 工厂原文）：`fill:\`none\`,stroke:\`currentColor\`,strokeWidth:2,strokeLinecap:\`round\`,strokeLinejoin:\`round\`` + `viewBox:\`0 0 24 24\``（24×24 viewBox、**线性 stroke 系**）。示例 path（archive）：`[[\`rect\`,{width:\`20\`,height:\`5\`,x:\`2\`,y:\`3\`,rx:\`1\`,…}],[\`path\`,{d:\`M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\`,…}],[\`path\`,{d:\`M10 12h4\`,…}]]`；wand-sparkles / blocks / cable / alarm-clock / bot / settings-2 的 node 数组均已开窗取到（本轮实跑）。
4. **导航项渲染尺寸**（`hXn` 组件原文，@332637518 前 200KB 窗口）：
```jsx
className:Z(`flex h-8 w-full items-center gap-2 rounded-xl px-2.5 text-left transition-colors`,
  n?`bg-surface-hover text-foreground`:`text-remote-foreground-muted hover:bg-surface-hover hover:text-foreground`)
<Icon className:`size-4 text-foreground` />   // 图标 16px（size-4），激活项全前景
```
   → 与 03f §2.2 S1 活体记录（16px/400 / h32 / r12）互为印证，图标规格从「无记录」变为「完整」。
5. **about 分区不存在**：18 项清单无 about；`id:\`about\`` 0 命中。

**最终判定：有参照（方案不同 + 一个子项确认无对应）。** ZCode 设置导航图标 = **lucide stroke 系**（24×24 viewBox / fill:none / stroke:currentColor / width 2 / 渲染 16px），uiplug = **自绘填充 path**（fill=currentColor、viewBox 16/20/14）——8 个 path 数据与 ZCode 无一同值（复核确认），**填充 vs 线性是方案级差异**，按差异项登记；但「语义映射」（技能→wand-sparkles 等 6 组）与「图标渲染 16px / 激活全前景」自此有 ZCode 锚点可对照。子项「about 置尾 order:2147483647」：ZCode 设置导航**无 about 分区**（18 项清单实证），该子项维持无对应物。

---

## 条目2 · new-conversation-style.ts 新建页自有几何（hero 卡 768/340/420/32·28/46/display+10、workspaceRow 4% 混底、建议卡 42px、任务钮、suggestions 13/20、grid 4→2@640）

**搜索过的模式**（全部实跑）：
- 问候/空态文案族：`"[a-zA-Z.]*(greeting|welcome|hero|home)[a-zA-Z.]*":\`…\`` → `chat.empty.greeting.*`(7 时段+office)、`chat.empty.title/description/detachProject`、`chat.draft.suggestedPrompt.*` 全族
- 消费点（非字典形态）：`grep -a -b -o -F 'chat.empty.greeting'` 全偏移逐个核上下文 → 329626242 处为反引号代码形态（空态组件本体）
- 组件窗口：329626242 ±5KB 两次开窗（问候组件 + 背景 art）；329892890/329895138（建议卡 JSX）
- 建议池：`AQt` 消费点 329665700 → 池筛选/上限逻辑
- workspace 行：`chat.empty.detachProject` 非字典命中 328476330 → workspace chip 组件
- 令牌值：`--text-ui-(caption|base|sm|lg)`、`--ui-font-size`、`.leading-4.5{`
- 无命中组：`min-h-\[340px\]|340|420`（未在新建页组件中出现）、`max-w-3xl`(768)、鱼/logo hitbox 46、`grid-cols-4`（新建页组件内 0 命中）——uiplug 的这些**具体数值在 ZCode 新建页无对应结构**

**命中原文**（ZCode 新建页 = draft/empty 态，全部本轮 asar 静态提取）：
1. **hero 问候组件**（@329626242 窗口）：
```jsx
<div className:Z(`relative mb-10 flex w-full max-w-2xl flex-col items-center justify-center gap-6 text-foreground sm:mb-8`)
  背景装饰: className:`pointer-events-none absolute left-1/2 top-1/2 aspect-[5/4] w-[min(72vw,25rem)] -mt-10 …`
    （浅色 = 内联 400×320 stroke SVG + `opacity-70 dark:hidden` + mask 渐隐 to bottom 70%；
      深色 = data-URI 436×360 图 `opacity='0.15'` + feGaussianBlur 1.2 + 渐变 #444444/0.6→#2A2A2A/0.3→#1A1A1A/0.1）
  问候 <p data-v4-draft-greeting>：
    style:{"--v4-draft-greeting-font-size":`${o}px`}，`text-[length:var(--v4-draft-greeting-font-size)]/[1.2]`、font-medium、px-4
    字号算法 TQt: Math.max(YJ, Math.min(XJ, Math.floor(availableWidth/naturalWidth*XJ)))，**YJ=20、XJ=30**（20–30px 动态夹紧）
  时段函数: 5-9 morningEarly / 9-12 morning / 12-14 noon / 14-18 afternoon / 18-23 evening / 其余 lateNight；office 模式固定 `chat.empty.greeting.office`
```
2. **建议卡组件 `t$t`（双布局）**（@329892890 窗口）：
```jsx
chips（默认）: <div data-v4-draft-suggested-prompts className:`w-full min-w-0 overflow-x-auto [scrollbar-width:none]`>
  <div data-v4-draft-suggested-prompts-group className:`mx-auto flex w-max items-center gap-4`>
    <Button variant:`outline` size:`lg` className:`zcode-draft-prompt-waterfall h-8 min-w-0 justify-start gap-1.5 overflow-hidden rounded-lg px-3 text-left text-ui-caption font-normal leading-4.5 text-foreground`
      style:{"--zcode-draft-prompt-waterfall-delay":`${t*65}ms`}   // 瀑布入场 65ms/张
      icon: <span data-draft-suggested-prompt-icon className:`flex size-4 … opacity-70 …group-hover/button:opacity-100`>
list: 行按钮 `flex w-full items-center gap-3 rounded-xl p-3 … hover:bg-hover focus-visible:ring-2 focus-visible:ring-input-border-focused`
      icon 座 `flex size-6 … rounded-md bg-surface p-px`，img `size-4.5|size-full rounded-sm object-contain`
池上限: sY() 内 Math.min(3,e.length) → **每屏最多 3 张**；AQt 双池 `mode:\`office\`|\`coding\``（按 interfaceMode 切换）
```
3. **workspace chip**（@328476330 窗口）：
```jsx
wrapper `group/workspace-chip relative flex min-w-0 items-center rounded-full hover:bg-surface-hover focus-within:bg-surface-hover`
按钮 `variant:ghost size:default className:\`min-w-0 rounded-full bg-transparent text-ui-base/relaxed hover:bg-transparent\` max-w-[15rem] pl-3 pr-2`（收窄态 `max-w-44`=176px）
chevron `size-3.5 text-foreground-subtlest`；detach X `size-3.5` 仅 hover/focus-within 显现
```
4. **令牌换算**：`--ui-font-size:14px` → text-ui-caption=**13px**（=uiplug suggestions 的 13px）、base=14px；`.leading-4.5` = calc(var(--spacing)*4.5) = **18px**（uiplug 是 13/20px）。

**最终判定：有参照（batch-9「ZCode 新建页未采集」前提不成立——本轮已静态采齐）。** 逐项对照：hero 容器 **ZCode max-w-2xl=672px vs uiplug 768**；标题字号 **ZCode 动态 clamp 20–30px/font-medium/lh1.2 vs uiplug display 令牌+lh+10px**（机制不同）；「装饰图」**ZCode = 背景大图 min(72vw,25rem)=400px / 浅色线性深色位图渐变 vs uiplug 内联鱼 hitbox 46px**（形态完全不同）；建议卡 **ZCode = 32px 高 outline 圆角-lg 横向滚动 chips（≤3 张、65ms 瀑布）+ 可选 list 行（rounded-xl p-3）vs uiplug 4→2 列网格卡 42px/10% 边/r-xl + 二级任务钮**（结构不同）；workspace **ZCode = rounded-full 透明 chip（max-w-[15rem]）vs uiplug 整行 4% 混底 r-xl 12 0 0 条带**（形态不同）；文案字号 13px 同值。uiplug 的 min-h 340/420、pad 32·28、46 hitbox、grid 4→2 在 ZCode 无对应结构（模式清单见上），属 DSH 自有裁决。全部按差异项登记。

---

## 条目3 · composer-width.ts 数值参数（最小宽 640、EDGE_BUDGET=176、键盘步长 20/Home 归最小）

**搜索过的模式**（全部实跑）：
- `col-resize`(59) → 逐类开窗：全部在 CSS 关键字解析表（`clip|clone|…|col-resize|collapse` 词表），**应用代码 0 处**
- `widthHandle|WidthHandle|width-handle|resize-handle|resizer` → resize-handle 57 处全为**图片缩放**（`data-image-resize-handle`）；resizer 561 处多为编辑器
- `contentWidth`(531)/`chatWidth`(32)/`chat-width`(9)/`content-width`(18) → 首个 chatWidth @16992839 开窗为**打包内置的文本排版基准 TS 源码**（`prepareBubbleTexts`/`FONT 15px Helvetica` 基准脚本，16.9–17.2MB 区）；chat-width 9 处偏移全部落同一区
- 键盘调宽：`ArrowLeft…resize` 交叉检索 → `_resizeWithKeyboard`/`_resizerKeyboardManager`
- 宽度可调面板：`react-resizable-panels`(16)/`sidebar-width`/`panel-width` → `zcode:workspace-shell:sidebar-width-px` @332186296 开窗
- localStorage 键枚举：`.setItem\([^)]{3,70}\)` 过滤变量名后人工看剩余 → 键多为压缩变量，**未能全量枚举**（诚实声明）

**命中原文**：
1. **正向否定：ZCode 会话列/输入区无宽度手柄。** col-resize 仅在词表、resize-handle=图片缩放、chatWidth 命中=基准脚本——三类候选载体全部排除。
2. **ZCode 的宽度可调元素是侧栏**（@332186296 窗口）：
```js
lBn=264, R5=264, uBn=.5, dBn=`zcode:workspace-shell:sidebar-width-px`,
fBn=`react-resizable-panels:workspace-shell-layout:sidebar:content`, gBn=480, vBn=360, yBn=300
function z5(e,t){let n=t&&t>0?Math.max(R5,t*uBn):1/0;return Math.round(Math.max(R5,Math.min(e,n)))}
// 读：localStorage.getItem(dBn) → Number → z5(t)；写：B5(e) → setItem(dBn,String(Math.round(e)))
```
   → **min 264px / ≤50% 视口 / Math.round / localStorage 持久化**——与 uiplug `clamp(min(640,…))+localStorage` 的「夹紧+持久化」机制同构（gBn=480/vBn=360/yBn=300 三个常量的具体用途本轮未逐一追认，只报不判）。
3. **键盘调宽先例 = PDF 注释编辑器**（`AnnotationEditor._resizerKeyboardManager` 原文）：`TRANSLATE_SMALL=1`、`TRANSLATE_BIG=10`，ArrowLeft/Right/Up/Down ±1px，**Ctrl/⇧ 加大 ±10px**，Escape 结束——**无 Home 归位键**。
4. 巧合排除：ZCode workspace chip 有 `max-w-44`（=176px），与 uiplug `COMPOSER_EDGE_BUDGET=176` 数值相同但语义无关（chip 宽度上限 vs 拖拽边缘预算），**不构成参照**。

**最终判定：有参照（机制级；数值无同值对应）。** 「最小宽 640」：ZCode 会话列宽是固定 CSS（896/1152 容器查询，03c 已采）**不可调**，640 保持「用户裁决、无 ZCode 对应」；但 ZCode 存在同构的「可调宽度 = min 夹紧 + 50% 视口上限 + Math.round + localStorage」先例（侧栏，264–480），uiplug 的 clamp+持久化可锚定此机制。「键盘步长 20/Home 归最小」：ZCode 键盘调宽先例存在但**步长 1/10px+修饰键、无 Home**——机制部分同构、交互形态不同。「EDGE_BUDGET=176」确认无对应（ZCode 无手柄故无边缘预算）。登记：机制参照 + 正向否定证明（ZCode 无 chat 列宽手柄），数值均为 DSH 自有。

---

## 条目4 · conversation-layout.ts `.dcu-bubble-toggle` 钮面样式组合（bg base / label-secondary / shadow-lv1 / backdrop-blur 4px）

**搜索过的模式**（全部实跑）：
- 折叠组件锚点：`\bO4t\b`(3 处，03c 记录的过渡载体)、`"data-v4-user-input-bubble"`(2)、`data-v4-user-input-collapsible-content`
- 组件窗口：330050274 ±1.6KB/+2.5KB 两次开窗（折叠逻辑 + 钮 JSX 全文）
- Button 定义：`size:{default:`（fixed-string，全 asar **仅 1 套 cva** @293661044）→ variant/size 两表全文
- 编译值：`--shadow-sm:`(2 束，逐一开窗比邻令牌定归属)、`--blur-sm/--blur-xs`、`.backdrop-blur-sm{`、`.leading-4.5{`
- 03c 复核：`grep -n "C2-4" 03c-conversation.md` → 活体记录「32px 胶囊」

**命中原文**（ZCode 用户气泡折叠钮组件 `O4t` 全文，@330050274 窗口）：
```jsx
function E4t(e){return e>120+T4t}            // T4t=1，溢出阈 121
function D4t(e,t){return`${e?Math.max(t,120):120}px`}   // 展开 max(scrollHeight,120)/折叠 120
<div data-v4-user-input-collapsible-content style:{maxHeight:D4t(u,o)}
  className:Z(`min-w-0 overflow-hidden whitespace-pre-wrap break-words
    transition-[max-height] duration-300 ease-out motion-reduce:transition-none`,
    !u&&c?`[mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]…`:``)
// 折叠钮：
<div className: u?`flex items-center justify-center w-full pt-2`
             : `absolute inset-x-0 bottom-0 mx-auto flex items-center justify-center`>
  <Button type:`button` size:`sm` variant:`outline` aria-label aria-expanded title
    className:`rounded-full bg-background shadow-sm backdrop-blur-sm transition-colors`
    icon: u? ns : $o, className:`size-4`   // 16px chevron
```
配套令牌与组件表（本轮实测提取）：
- **outline variant**（cva 原文）：`border-border text-foreground hover:border-border-hover hover:bg-input/50 hover:text-foreground aria-expanded:bg-input/50…`
- **size sm**（唯一一套 Button cva @293661044）：`h-6 gap-1 px-2 text-ui-base/relaxed …[&_svg:not([class*='size-'])]:size-3`（default=h-7、xs=h-5、lg=h-8、icon=size-7）→ 折叠钮本体 **24px 高**胶囊
- **shadow-sm 应用束值**：`--shadow-sm:0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a`（@325829619，与 `--blur-sm:8px` @325830057 同束；另一束 @285988000 `0 1px 2px -1px rgb(0 0 0 / 8%)` 为无 app 令牌的独立 CSS，排除）
- **backdrop-blur-sm = 8px**（`--blur-sm:8px`、`--blur-xs:4px`）；**位置**：折叠 `absolute inset-x-0 bottom-0 mx-auto`（水平居中压渐隐正文）、展开 `w-full pt-2` 独占行居中；正文变化后回折叠（`useEffect` 里 `d(!1)`）✅ 与 03c C2-4 的行为记录一致

**最终判定：有参照（钮面逐属性可对照，多处数值不同）。** uiplug `.dcu-bubble-toggle`（:202-219）vs ZCode 原文：bg `--dsw-alias-bg-base` ≈ ZCode `bg-background`（同语义 ✅）；**backdrop-blur 4px vs ZCode 8px**（uiplug 用的是 ZCode 的 xs 档值）；**shadow-lv1 `0 1px 2px 0 5%` vs ZCode shadow-sm `0 1px 3px 0 10%,0 1px 2px -1px 10%`**；边框 1px 10% ≈ outline `border-border` ✅；**颜色 label-secondary(60%) vs ZCode outline 的全前景 text-foreground**；hover：uiplug 变 label-primary，ZCode 变边框+bg-input/50（色不变）；**尺寸 40×32 vs ZCode h-6=24px 胶囊**。⚠ 一处待复核：03c C2-4 活体记录「32px 胶囊」与本轮 asar `size:sm→h-6(24px)` 不一致——asar 为静态真值，活体 32px 可能含 wrapper 或版本差异，建议下轮 CDP 复测；uiplug 的 40×32 与两者都不同。全部按差异项登记。

---

## 条目5 · session-manager.ts 全模块（未读标记存储 v1 / toggle / 后台完成判定 / deep link 拼参）

**搜索过的模式**（全部实跑）：
- 未读存储：`zcode:[a-z-]*(unread|session)[a-z-:.]*` → `zcode:sync-window-unread-count`(6)/`SyncWindowUnreadCount`/`zcode:get-desktop-session-activity`(6)/`zcode:sync-active-task-session`(6) 等 IPC 通道
- `"…unread…"` 键名 → `project.hasUnread`(2)/`unreadAt`(1)/`syncUnreadBadgeForPlatform`(1)
- deep link：`searchParams.set(\`session\`)` → **0**；`set(\`session\`)` → **0**；`"session"`(145，抽查为 IPC 通道名/对象键)；`zcode:session`(1)
- localStorage 键枚举（`.setItem\(` 过滤）→ 键为压缩变量，未读类**无命名持久化键**
- 上下文开窗：`zcode:sync-window-unread-count`（IPC 注册表）与 `project.hasUnread`（渲染点）各一次

**命中原文**：
1. **未读的视觉呈现（项目级）**：`"data-testid":\`virtual-project-unread\`,"data-workspace-unread-indicator":\`true\`,role:\`img\`,aria-label:formatMessage({id:\`project.hasUnread\`}),className:\`size-1.5 shrink-0 rounded-full bg-icon-blue\`` —— 6×6 蓝点，与 gapfill-1 条目3 已采的行首槽未读点同源（该视觉参照不属本模块，此处仅佐证「未读在 ZCode 是运行时派生状态 + 6px 点/窗口 badge」）。
2. **未读同步 = IPC badge**：`SyncWindowUnreadCount:"zcode:sync-window-unread-count"` 在 IPC 通道注册表中，与 `SyncActiveTaskSession`/`FocusTab` 并列——窗口级未读数同步，非按会话持久化列表。
3. **deep link 不走 URL**：`searchParams.set(\`session\`` 0 命中；会话定位经 IPC（`zcode:session`/`FocusTab`）。

**最终判定：确认无参照（维持 batch-9，本轮补齐正向证据）。** ZCode 侧：未读不持久化到 localStorage（无命名未读键；宽度/布局类键除外），走运行时派生 + 窗口 badge IPC；会话定位走 IPC 而非 URL query。uiplug 的「未读列表 JSON 持久化（version:1）/toggle 置顶/后台完成判定/`?session=` 拼参」四个行为点在 ZCode **无同构对应物**；且模块本身无颜色/圆角/动效/字号决策点（batch-9 前提复核成立）。唯一沾边的视觉参照（6px 未读蓝点）已由 gapfill-1 收录，不改变本判定。

---

## 附：公共定位命令（本轮实跑，后续批次可复用）

```bash
A=/Applications/ZCode.app/Contents/Resources/app.asar
grep -a -o -E 'id:`[a-zA-Z]+`,icon:[a-zA-Z$_]{1,4},titleId:`settings\.[a-zA-Z]+`,groupId:`[a-zA-Z]+`' $A   # 设置导航项
grep -a -o -E "import\{t as VAR\}from\"\./[^\"]{1,50}\"" $A    # 图标变量→chunk名（chunk名即 lucide 图标名）
grep -a -b -o -F 'size:{default:' $A                            # Button cva（全包唯一一套，@293661044）
grep -a -b -o -F 'chat.empty.greeting' $A                       # 非字典形态命中=组件本体（@329626242）
grep -a -b -o -F 'zcode:workspace-shell:sidebar-width-px' $A    # 侧栏宽度 clamp（@332186296）
grep -a -b -o -F -- '--shadow-sm:' $A                           # 两束 CSS，以比邻令牌定归属
```

## 结论对批次9 的回写建议

1. batch-9「无参照项」5 条 → 条目1/2/4 改判「有参照」（方案/数值差异按差异项登记）；条目3 改判「有参照（机制级）」——含一条正向否定证明（ZCode 无 chat 列宽手柄）；条目5 维持「确认无参照」。
2. `03f-settings.md` §1「分区图标已覆盖 8 个」之下建议补：ZCode 侧导航 18 项 lucide 图标全表 + `hXn` 渲染规格（16px/激活全前景/h-8/rounded-xl），并注明「填充 vs 线性」方案差异与「ZCode 无 about 分区」。
3. `03c-conversation.md` C2-4 建议补钮面规格（outline+size sm+h-6=24px+bg-background+shadow-sm 10%+backdrop-blur-sm 8px+图标 16px），并标注「活体 32px vs asar 24px」待 CDP 复核；C2 折叠钮位置适配（C2-5 已裁决）不受影响。
4. 新建页参照建议新开一节（或并入 `03p-startup.md`）：draft 态 hero（672/动态字号 20–30px/背景 art）+ 建议卡 chips/list 双布局 + workspace chip，作为 uiplug `new-conversation-style.ts` 的对照锚点。
5. `04-open-gaps.md` 「新建页 hero 待建」一条可标记为「asar 静态已补，活体 CDP 复核仍缺」。
