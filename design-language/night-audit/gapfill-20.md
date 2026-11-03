# 补采 20 · 批次 20「无参照条目」二次挖掘（companion-slots / channel-brand / hover-tip / ScheduleBrowser / 杂项）

> 2026-10-30 夜间补采（只读，不改 src/tests/既有文档）。目标：对 `batch-20.md:42-46` 判「无参照」的 5 条逐条再挖 asar 与设计语言文档。
> asar = `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）。本环境 `grep` 为 ugrep：`.{0,50}` 式多字节上下文正则报 `exceeds complexity limits`，故上下文提取一律改为 **`grep -a -b -o '<模式>'` 取字节偏移 → `tail -c +<偏移> $A | head -c <N>`**（原样输出中文，或 `LC_ALL=C tr -c '[:print:]' '.'` 打码非 ASCII）；计数用 `grep -a -o '<模式>' $A | wc -l` 或 alternation 一次扫描 `grep -a -o -i -E '<a|<b|…' $A | sort | uniq -c`。所有命令本轮实跑。
> 既有参照复查（读文档）：`cross-4-甲.md:28`、`cross-4-乙.md:39`、`cross-4-丙.md:32`、`batch-4.md:44-45`（hover-tip 时间分档批次 4 已对上 taskList 四档）；`03h-detail-sweep.md:90`（role=tab+aria-selected 活体实测）；`03i-command-palette.md:64`（E5 顶部分段签）；`01-design-tokens.md:34-35`（危险色成对令牌）；`03c-conversation.md:56`（C2-4）；`03b-sidebar.md:112,115`；`04-open-gaps.md:1828`（G6 主题挂 html class）；`03j-dialog.md`/`03k-context-menu.md` grep `danger|dense|compact|outline` 全 0（复核 batch-20 所述属实）。

---

## 条目 1 · companion-slots.ts 全模块（插槽占用探测，:23-76）—— **确认无参照**

**搜索过的模式（asar，均 `grep -a -o` 实跑）**
- `entriesOfSlot|sidebar\.channels|sidebar\.schedule|companionTab|CompanionSlot|slotHasEntries|slotOccupan|registerSlot|client-ui-slots` → **全部 0 命中**
- `sidebarSections|registerSidebar|sidebarSlot|slotId|contributes|extensionApi|pluginRegistry` → 仅 `slotId`×2、`contributes`×13，取上下文定性均无关：
  - `slotId` @74822863/@74822939：`span.annotations?.map((slotId) => createHastElement({tagName:"slot",properties:{name:slotId}}))` —— hast 注解 `<slot>` 渲染，与插件插槽无关。
  - `contributes` @76308907：VS Code 主题 manifest `"contributes":{"themes":[…Pierre Light…]]`；@93366031：VS Code `contributes.grammars` 文档注释；@272216628：英文散文。
- 设计语言文档 `grep -rn --include='*.md' -E '插槽|companion|companionTab|slot'`（排除 night-audit）→ 仅 `03b-sidebar.md:112`「左槽 16×16 空 span」（侧栏行内图标槽）与 G18 踩坑报告的 `data-slot="conversation.user.text.node"`（DSH 气泡锚点），均非「配套插件插槽占用」。
- 反向核对 `grep -a -o -E '…|companion-slots|…' $A` → 0 命中。

**命中原文**：无（上述命中均为同名异物）。
**最终判定**：**确认无参照**。ZCode bundle 无「配套插件插槽占用/侧栏分区注册」概念；且本模块（`companion-slots.ts:1-76` 通读）为纯状态逻辑——读槽、订阅、快照缓存，仅一处 `console.warn('[dsh-zcode-ui] 无法读取配套插件插槽。')`，无任何颜色/圆角/间距/动效决策点可比对。

---

## 条目 2 · channel-brand.tsx 品牌色与图形 —— **升级：品牌图标概念与几何有参照；品牌色 hex 与兜底灰圆仍无参照**

batch-20 的「ZCode 无 IM 渠道品牌图标概念」**被推翻**。

**搜索过的模式（asar 实跑）**
- 品牌 hex 大小写不敏感一次扫描 `grep -a -o -i -E '26a5e4|07c160|fb6500|0082ef|2dbc00|12b7f5|0285fc|00d6b9|163c9a|3370ff|5865f2|e01e5a|36c5f0|2eb67d|ecb22e|8b949e' $A | sort | uniq -c` → `8b949e`×79、`ECB22E`×18、`36c5f0`×2、`2eb67d`×2，**其余 12 个品牌 hex 0 命中**（含 batch-20 已测的大写形式复核）。
- 品牌名 `grep -a -o -i -E 'telegram|weixin|wechat|wecom|dingtalk|feishu|lark\b|discord|\bslack\b' $A | sort | uniq -c` → telegram×210、feishu×10923、weixin×294、wechat×46、wecom×26、discord×47、lark×274、slack×83、dingtalk→`DingTalk`×3。
- 资产索引 `grep -a -o -E '"[a-z-]*(telegram|weixin|wecom|feishu|lark|discord|slack|qq|dingtalk)[a-zA-Z0-9@-]*\.png"' $A | sort | uniq -c` → 恰 6 张品牌 PNG：`feishu-CCgK6olr.png`、`icon-discord@2x-D9OBPr5g.png`、`icon-telegram@2x-Cax3aaF9.png`、`icon-wecom@2x-BZVgmBph.png`、`icon-weixin@2x-Bp9EqCCA.png`、`icon-dingding@2x-CnYjVOCa.png`（**slack/qq 无资产**）。

**命中原文（字节偏移提取）**
- provider 枚举 @278869767：`var rz=["telegram","webhook","feishu","lark","weixin","discord","wecom"],If=e.object({provider:e.enum(["feishu","lark","weixin"]),botId:e.string().trim().min(1),providerUserId:e.string().trim().min(1),chatType:e.enum(["private","group"]),…})` —— ZCode 有完整 IM 渠道数据层。
- 渠道品牌图标组件 `vL` @328711900（UI 层，紧跟 6 个 `new URL('icon-*.png', import.meta.url)` 资产引用）：
  `function vL({provider:e,className:t}){let n=e===`telegram`?hxt:e===`weixin`?_xt:e===`feishu`||e===`lark`?mxt:e===`dingding`?pxt:e===`discord`?fxt:e===`wecom`?gxt:null;return n?(0,$.jsx)(`img`,{src:n,alt:``,"aria-hidden":`true`,className:Z(`size-4 object-contain`,t)}):e===`webhook`?(0,$.jsx)(nre,{className:Z(`size-4`,t)}):(0,$.jsx)(qo,{className:Z(`size-4`,t)})}`
  —— 与 uiplug `ChannelBrandIcon`（`channel-brand.tsx:1-41`，16×16 + `aria-hidden="true"` + 按 id 分支）**结构同构**：同为 16px（`size-4`）、同样隐藏图标语义、同样「按 provider 映射 → 兜底」三段式。
- `8b949e`×79 定性 @92243302/@92245778/@92247421：全部为 VS Code 式编辑器主题 JSON（`"debugConsole.infoForeground":"#8b949e"`、`"editorInlayHint.background":"#8b949e33"`、`"minimapSlider.background":"#8b949e33"` 等，GitHub Dark 系主题）——**非渠道兜底灰圆**。
- `ECB22E` @93051552：编辑器主题 `"gitDecoration.addedResourceForeground":"#ECB22E"`（Slack 配色编辑器主题）；`36c5f0`/`2eb67d` @3817474/@5021056：asar 索引 SHA256 `integrity.hash` 子串（假阳性）。
- 文档旁证：`04-open-gaps.md:46`（G 系既有裁决「无品牌色指示器…无 ZCode 对应物」）口径不变。

**最终判定**：**部分升级为有参照**。① ZCode 有 IM 渠道品牌图标概念（6 张 PNG 资产 + provider 枚举 + `vL` 组件），且 16px/aria-hidden/按 provider 映射与 uiplug 同构——品牌图标**几何与语义**有参照；② 品牌色 hex 0 命中仍成立——ZCode 用位图 PNG（无 hex 可采），uiplug 用内联 SVG + 品牌 hex fill，**色彩载体不同构，8 个品牌 hex 维持无参照**；③ 兜底：ZCode 未知 provider 走通用图标组件 `qo`（minified 定义未定位，@330054893 旁证其渲染为 `size-4 strokeWidth:1.5` 图标）而非灰圆，**#8b949e 兜底灰圆维持无参照**；④ 口径差异须登记：uiplug 用 `dingtalk`，ZCode 用 `dingding`；uiplug 的 `slack`/`qq` 两品牌 ZCode 无资产。

---

## 条目 3 · hover-tip.ts 时间分档与卡片几何 —— **升级：4 档分档与 pad=8 有参照；right+8 锚点确认无参照**

**搜索过的模式（asar 实跑）**
- `grep -a -o -i -E 'weeksAgo|monthsAgo|yearsAgo' $A | sort | uniq -c` → **0 命中**。
- `grep -a -o -E 'sidePane\.time\.[a-zA-Z]+|taskList\.(justNow|minutesAgo|hoursAgo|daysAgo)' $A | sort | uniq -c` → `sidePane.time.justNow/minutesAgo/hoursAgo/daysAgo` 各×4；`taskList.` 四键各×3。**ZCode 仅四档**。
- `grep -a -o -E 'collisionPadding[:=][^,})]{0,12}' $A | sort | uniq -c | head` → `collisionPadding:8`×**8**、`:12`×4、`:16`×3、`:p`×2、其余散值。
- `grep -a -o -F 'right+8' $A | wc -l` → 0；`-F '.right+8'` → 0；`-F 'right + 8'` → 0。
- `grep -a -o -E '[Hh]overCard|sessionHover|hover-preview' $A | sort | uniq -c | head` → `HoverCard`×178（@77008738 定性为 `@radix-ui/react-hover-card` vendor 类型声明）。

**命中原文**
- **pad=8 有参照**。`collisionPadding:8` 四例上下文：
  @319000959：`{open:t,modal:!1,…role:`toolbar`,"aria-label":i,side:`top`,align:`center`,sideOffset:8,collisionBoundary:n,collisionPadding:8,sticky:`partial`,hideWhenDetached:!0,…className:d?`w-80 max…`
  @329489264：`side:`top`,align:`start`,sideOffset:4,collisionPadding:8,className:e.category===`mode`?`w-64`:void 0`
  @329551480：`"data-composer-collapse-priority":n,…sideOffset:4,collisionPadding:8,onCloseAutoFocus:…`
  @330554385：`align:`end`,className:`w-80 max-w-[calc(100vw-16px)] gap-2.5`,collisionPadding:8,"data-testid":`workflow-save-popover``
  —— ZCode 全部 Radix 浮层走视口碰撞边距，**8px 是其常用档**（`max-w-[calc(100vw-16px)]` 两侧各 8px 同一逻辑），与 `hover-tip.ts:3` `pad=8` 同值同义（12/16 为其他档位）。
- **时间分档有参照（既有 + 本轮复核）**：ZCode 四档 `justNow/minutesAgo/hoursAgo/daysAgo`，无周/月/年（`weeksAgo|monthsAgo|yearsAgo` 0 命中）。批次 4 已逐字对齐：`cross-4-甲.md:28`（`time.justNow '刚刚'`= `taskList.justNow":"刚刚"`、`{count}分`=`{minutes}分` 等）、`cross-4-乙.md:39`（直接点名 `hover-tip.ts:24-33`，en 档 `now/m/h/d` 同值）、`batch-4.md:45`（「ZCode taskList 仅 4 档，无周/月/年」）。**batch-20「ZCode 会话行时间格式未采集」与批次 4 记录冲突，以批次 4 为准**（其证据 `asar-values.txt:56-63,68-69`）；uiplug 的第 5-7 档（周/月/年）是超出 ZCode 的插件扩展，无 ZCode 值可比（此点维持无参照）。
- **right+8 锚点确认无参照**：三种写法全 0，ZCode 浮层定位走 Radix（sideOffset/align/collisionPadding），无「行右缘 +8」式手工锚点采样。

**最终判定**：**部分升级为有参照**（时间分档 4 档、pad=8）；周/月/年扩展档与 `rect.right+8` 锚点偏移**确认无参照**；注释自称对齐 ChatGPT `$wa`（`hover-tip.ts:35,40`）仍属 DSH 显式裁决，不因本轮改变。

---

## 条目 4 · ScheduleBrowser.tsx 定时视图专属件 —— **升级：automations 定时任务域、destructive 菜单项、outline 确认钮均有参照；ScheduleClock path 与 dense/compact 确认无参照**

batch-20 的「ZCode 无定时任务视图」**被推翻**。

**搜索过的模式（asar 实跑）**
- `grep -a -o -F 'M8 1.15' $A | wc -l` → **0**（ScheduleClock 自绘 16 viewBox 路径无对应）。
- `grep -a -o -F 'tablist' $A | wc -l` → 37；`grep -a -o -F 'aria-selected' $A | wc -l` → 65。上下文 @77853441：`Primitive.div,{role:"tablist","aria-orientation":context.orientation,…}`（Radix Tabs）；@35553253 为电子表格 "Workbook sheets"（无关）。
- `grep -a -o -F 'danger:!0' $A | wc -l` → **0**；`grep -a -o -F 'dense:!0' $A | wc -l` → **0**；`dense`×291（多为数组方法）。
- `grep -a -o -F 'variant:`outline`' $A | wc -l` → **148**；`grep -a -o -F 'variant:`destructive`' $A | wc -l` → **16**；`grep -a -o -F 'bg-destructive' $A | wc -l` → 91；`--color-danger-emphasis|fg|muted|subtle` 令牌各 4-6 处。
- `grep -a -o -E 'automations?\.[a-zA-Z]+(\.[a-zA-Z]+)?' $A | sort | uniq -c | sort -rn` → ~90 个 `automations.*` i18n 键（`form.schedule`×27、`runs.col`×15、`runs.status`×12、`moreActions`×8、`edit.tab`×6、`delete`×5、`runNow`×4、`pause`×4、`resume`×4…）。
- `定时`×55（抽样定性全在飞书/Lark SDK 文档注释，非 UI 串）；`createLucideIcon("clock…")` → `clock`×2 及 `clock-alert/clock-check/clock-fading/clock-plus/clock-arrow-*`。
- 反向核对 `grep -a -o -E 'runsTab|overviewTab|scheduleTab|archive-group|ScheduleBrowser|ScheduleClock|…' $A | sort | uniq -c` → uiplug 专名全 0，唯 `archive-group`×5 —— 出自 **ZCode 自家 archives 功能**（见下）。

**命中原文**
- **定时任务视图存在**（zh 块 @310736799，en 块 @311206296 "Automations"/"Scheduled tasks"）：
  `"automations.list.title":`定时任务`,"automations.createManually":`创建定时任务`,"automations.noWorkspace":`打开一个工作区以管理它的定时任务。`,"automations.description":`创建定时任务，或排队在闲时算力空闲时后台执行。`,"automations.create":`新建`,"automations.refresh":`刷新``
- **双 tab 结构参照** @310744150：`"automations.edit.tab.settings":`设置`,"automations.edit.tab.history":`历史`` —— ZCode 自动化编辑页就是双分段 tab（设置/历史），与 `ScheduleBrowser.tsx:76-79` runs/overview `role="tablist"` 双 tab 结构同构；另 `03h-detail-sweep.md:90` 活体实测 ZCode 有 `role="tab"`+`aria-selected`（对话/轨迹/记忆），`03i-command-palette.md:64` E5 顶部分段签 14px/前景 60%。
- **runs 视图参照** @310750532：`"automations.runs.col.duration":`时长`,"automations.runs.status.running":`进行中`,"automations.runs.status.succeeded":`成功`,"automations.runs.status.failed":`失败`…`"stopped":`已停止`,"skipped":`已跳过`` —— runs（运行历史）列与状态五态有 ZCode 对应物（cross-4-乙.md:39 亦已引 `automations.runs.status.running`）。
- **菜单 danger 项参照** @328289105（ZCode archives 分组下拉，触发器 `formatMessage({id:`archives.groupActions`},{name:t})`）：
  `(0,$.jsx)(Ry,{"data-testid":`archive-group-unarchive`,onSelect:()=>void i(e.tasks,`unarchive`),children:c(`unarchiveAll`)}),(0,$.jsx)(Ry,{"data-testid":`archive-group-delete`,variant:`destructive`,onSelect:()=>void i(e.tasks,`delete`),children:c(`deleteAll`)})`
  —— ZCode 下拉菜单确有 destructive 变体项（16 处 `variant:`destructive``），且场景同为「归档分组菜单 + 删除全部」；uiplug 菜单项 id `archive-group`（`ScheduleBrowser.tsx:105` `danger:true`）与之同名同景。danger 色 令牌参照：`01-design-tokens.md:35`（`#e4001429`+`red-300` 成对）。
- **outline 确认钮 + 右对齐 footer 参照** @327197821：`(0,$.jsx)(X,{variant:`outline`,…})` 位于 `{"data-slot":`dialog-footer`,className:Z(`flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`,e)}` —— ZCode DialogFooter 右对齐 + outline 按钮与 uiplug 归档确认弹窗（`dcu-wb-rename-actions` + `variant="outline"`，`ScheduleBrowser.tsx:173-175`）同构；destructive 确认钮亦多处（@328413411 `settings.source.forceUpdate` onConfirm、@328716068 `bots.delete`+`bots.delete.description`、@329623246 queue sendConfirm `min-w-32 rounded-full`）。
- **ScheduleClock**：`M8 1.15` 0 命中维持；ZCode 时钟图形用 lucide `clock`（24 viewBox），无 16 viewBox 自绘圆环+指针 path。
- **dense/compact**：`dense:!0` 0 命中 —— 这是 DSH `Menu` primitive（`@deepseek-ai/dsh-client-ui-primitives`）的档位 prop，ZCode Radix 菜单无密度档，**确认无参照**（DSH 侧自有机制）。

**最终判定**：**大幅升级为有参照**——定时任务视图（automations 域 ~90 键）、runs 状态列、双 tab 结构、destructive 菜单项、outline 确认钮+右对齐 footer 均有 ZCode 对应物；`ScheduleClock` 自绘 path 与 `Menu dense/compact` 档**确认无参照**。后续对账建议将 `automations.*` 域补进 03b/03k 的采样范围。

---

## 条目 5 · 杂项（user-bubble-collapse 文案/图标 + zcode-skin 策略）—— **部分升级：Expand/Collapse 文案与 stroke 1.5 有参照；chevron path、:root:root、SKIN_VERSION 确认无参照**

**搜索过的模式（asar 实跑）**
- `grep -a -o -F '展开' $A | wc -l` → 49；`-F '收起'` → 48。
- `grep -a -o -F 'Expand' $A | wc -l` → 2028（多为 `.expand` 属性等）；精确形式：`"Expand"`×2、`` `Expand` ``×4、`` `Collapse` ``×5、`"Collapse"`×0。
- `grep -a -o -F 'M4 6.5' $A | wc -l` → **0**（复核 batch-20）；lucide chevron `grep -a -o -F 'm6 9 6 6' $A | wc -l` → 4；`grep -a -o -E 'strokeWidth:[0-9.]+' $A | sort | uniq -c | sort -rn | head` → 1×45、2×42、1.2×18、1.33×14、.8×14、1.5×11…
- `grep -a -o -F ':root:root' $A | wc -l` → **0**；`-F 'data-plugin-css'` → **0**；`-F 'SKIN_VERSION'` → **0**；`-F 'theme-zai-light'` → 26（batch-20 按行计 6，本轮按匹配计 26，同源）。

**命中原文**
- **Expand/Collapse 文案逐字同值**。zh 块 @310629338：`"chat.message.expand":`展开`,"chat.message.collapse":`收起``；en 块 @311097473：`"chat.message.expand":`Expand`,"chat.message.collapse":`Collapse``。UI 消费点即 G18 源头组件 **O4t 本体** @330050497：
  `var T4t=1;function E4t(e){return e>120+T4t}function D4t(e,t){return`${e?Math.max(t,120):120}px`}function O4t({children,contentText,rowId}){…f=r.formatMessage({id:u?`chat.message.collapse`:`chat.message.expand`});…useEffect(()=>{d(!1)},[t,n]),…ResizeObserver…`
  —— `user-bubble-collapse.ts:44-47` 的 zh「展开/收起」与 en「Expand/Collapse」及 `:105` 的 `button.title` 文案，与 ZCode i18n 键值**逐字一致**（batch-20「ZCode aria 记录仅『展开|收起』」补全为双语四值同源）。同场 `E4t/D4t` 亦复核了 120+1 与 `max(h,120)`。**未验证**：ZCode 是否同时设 `title` 原生 tooltip 属性（O4t 片段内未见，未追全组件 render 尾部）。
- **stroke 1.5 有 ZCode UI 旁证（但不在 chevron 上）**。`strokeWidth:1.5`×11 逐一定性：8 处为 mermaid（handDrawn roughness @183349393/@198980164/@294767607）与 recharts（@243905772）、surface 刻度线（@323349962/1.55、@323362391-626）；**3 处为真 UI 图标**：
  @330054893：`(0,$.jsx)(qo,{"aria-hidden":`true`,className:`size-4 shrink-0`,strokeWidth:1.5})`（subagent 命令条目图标，16px+1.5）
  @332771875：``className:`size-5 shrink-0 text-foreground-subtle`,strokeWidth:1.5``
  @332773374：``(0,$.jsx)(o,{strokeWidth:1.5,className:Z(`size-5 shrink-0`,e===r?`text-f…``
  —— ZCode UI 存在「16/20px 图标 + stroke 1.5」实例，`user-bubble-collapse.ts:34` 的 `stroke-width="1.5"` 选择有 ZCode 同档旁证；但 chevron 路径本身：ZCode 用 lucide `m6 9 6 6 6-6`（24 viewBox，@168115346 `const __iconNode$lw=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]];const ChevronDown=createLucideIcon("chevron-down",…)`），uiplug 自绘 16 viewBox `M4 6.5 8 10l4-3.5` **确认无对应**（03c C2-4 亦确未记 ZCode 侧图标尺寸，仅记 DSH 胶囊「图标 16 + px-3」）。
- **`:root:root` 特异性策略确认无参照**：asar 0 命中，ZCode 自身主题靠 html class 挂载（`04-open-gaps.md:1828` G6 实录 `html.className="theme-zai-dark dark"`），无双重 `:root` 提特异性的先例——`zcode-skin.ts:24-26` 的策略属 DSH 侧针对 DSH 三档选择器的反制手段，判定不变。`SKIN_VERSION='1.5.1'`（`:42`）与 `data-plugin-css` 标记 0 命中，皮肤版本标记**确认无对应物**；皮肤来源类名 `theme-zai-light`×26 存在（batch-20 一致项维持）。

**最终判定**：**部分升级为有参照**（Expand/Collapse 双语文案、stroke 1.5 档）；chevron 自绘 path、`:root:root` 策略、`SKIN_VERSION` 标记**确认无参照**；`title` 原生 tooltip 在 ZCode 侧是否同用**未验证**（不判）。

---

## 汇总

| 条目 | batch-20 判定 | 本轮判定 | 关键新证据 |
|---|---|---|---|
| 1 companion-slots.ts | 无参照 | **确认无参照** | 11 组模式 0 命中；slotId/contributes 同名异物定性 |
| 2 channel-brand.tsx | 无参照 | **部分有参照**（概念+16px/aria-hidden 同构） | 6 张品牌 PNG 资产、provider 枚举 @278869767、组件 vL @328711900；hex 与兜底灰圆仍无 |
| 3 hover-tip.ts | 无参照 | **大部分有参照**（4 档 + pad=8） | taskList/sidePane 四档复核、weeksAgo 等 0 命中、collisionPadding:8 ×8；right+8 仍无 |
| 4 ScheduleBrowser.tsx | 无参照 | **大幅有参照**（automations 域 + destructive + outline） | automations ~90 键、edit.tab 设置/历史、runs.status 五态、archive-group-delete destructive、dialog-footer+outline×148 |
| 5 杂项 | 无参照 | **部分有参照** | chat.message.expand/collapse 双语逐字 + O4t 标签源 @330050497、strokeWidth:1.5 UI×3；chevron path/:root:root/SKIN_VERSION 确认无 |

**对 batch-20 结论的三处更正**：①「ZCode 无 IM 渠道品牌图标概念」不成立（条目 2）；②「ZCode 无定时任务视图」不成立（条目 4）；③「ZCode 会话行时间格式未采集」与批次 4 既有记录冲突，以 `cross-4-乙.md:39` 为准（条目 3）。

**统计**：升级为有参照 **4** 条（条目 2/3/4/5，均为部分升级，各自保留的无参照子项已在上文列明）；确认无参照 **1** 条（条目 1）。
