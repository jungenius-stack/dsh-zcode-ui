# 夜间补采 · 批次 13 —— batch-13 五条「无参照」条目重挖

> 日期：2026-10-30。执行：补采员·批次 13（只读，零代码改动；本文件为唯一产出）。
> 通道：**纯静态**——对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 B）做 `grep -a -b -o` 取字节偏移，再 `tail -c +<off> | head -c <N>` 提取窗口读原文。本批无活体采样；所有结论均给出偏移量可复核。
>
> **本批破局点（batch-13 全部卡在一处：没找到 ZCode 设置页本体）**：以设置导航中文字符串为锚
> （`grep -a -b -o '基础设置'` → @310466990 等）切入 asar 内置 zh-CN 语言表（@310466400 起），
> 枚举出 `settings.sidebar.group.*` 三个分组键 → 在编译代码中搜其消费点（`grep -a -b -o 'settings\.sidebar\.group'`
> → @332636089 起）→ 直接命中 **ZCode 设置页导航模型数组 `MYn`/`jYn`（@332636062）**，随后解出
> 设置 chunk 的 import 块（@326350300–326369950，~19.5KB 内数百条 `import{t as 别名}from"./<lucide 图标名>-<hash>.js"`）
> 把全部图标标识符还原成 Lucide 原名。chunk 名即图标名，无歧义。

## 0. 通用定位（所有条目共用）

| 锚点 | 命令 | 偏移 |
|---|---|---|
| zh-CN 语言表 settings 段 | `grep -a -b -o '基础设置' $A` | 310376412（bots 键）、**310466990（settings.sidebar.group.basics）** |
| 设置导航模型 | `grep -a -b -o 'jYn=\[{id:\`basics\`' $A` | **332636062** |
| 设置侧栏导航项组件 | `grep -a -b -o 'function hXn(' $A` | **332702163** |
| 设置页组件 T9 / 页面壳 I0 | `grep -a -b -o 'settingsSectionGroups'` / `grep -a -b -o 'var I0'` | 332703281 / **330562025** |
| 设置层挂载日志 | `grep -a -b -o '\[Root\] settings layer mounted' $A` | **332757598** |
| 设置搜索框组件 NN / 空态 j3 | `grep -a -b -o 'function NN('` / `'function j3('` | 328242552 / 331245503 |
| 设置入口按钮 | `grep -a -b -o 'settingsButtonMode' $A` | 328823103（hwt 定义）、328927415（消费） |
| 图标 import 块 | `tail -c +326350300 | head -c 21000 | grep 'import{…}'` | 326350300–326369950 |

关键换算（沿用 gapfill-2）：`text-ui-base`=14px、`text-ui-sm`=12px、`size-4`=16px、`size-3.5`=14px、`rounded-xl`=12px、`icon-sm`=24×28？→ 以 batch-2 Button 尺寸表为准（icon-sm=24px、icon-lg=32px）。

---

## 1. 条目一：设置页退出动画（duration:140 / ease-out / 仅 opacity / fill:forwards）

**搜索过的模式**（全部本轮实跑）：
- `grep -a -c 'duration:140' $A` → **0**
- `grep -a -b -o '\.animate(\[' $A` → 5 处：328537887 / 328538046 / 328581175 / 329445206 / 330792110，逐处提取 1100B 窗口
- `grep -a -c 'fill:"forwards"' $A` → 0；`grep -a -b -o 'fill:\`forwards\`' $A` → 1 处 @328231071（提取）
- `grep -a -b -o 'element\.animate' $A` → 7 处：18448492、18513173、136315249、202345031、202736453、203124228、203718182（逐处粗提取归属）
- 设置页容器四点直读：I0@330562025、T9 根 div（@332720800 窗口）、QXn 设置层（@332757598 窗口）、`data-settings-panel-frame`（@332725000 窗口）

**命中原文**：

① 五处 WAAPI 全部与设置页无关：
```
@328537887/328538046  task-title 跑马灯（{duration:r*1e3, easing:`linear`, iterations:1/0}，hover 触发，prefers-reduced-motion 短路）
@328581175            侧栏任务列表 FLIP 重排（{duration:150, easing:`cubic-bezier(0.2, 0, 0, 1)`}）
@329445206            用量彩带粒子（{duration:420+e%3*35, easing:`cubic-bezier(0.2, 0.8, 0.2, 1)`}）
@330792110            会话分享失败抖动（translateX 五帧，{duration:280, easing:`ease-out`}）
@328231071            dnd-kit 拖拽 drop 动画（库代码，唯一 fill:`forwards`）
```
其余 7 处 `element.animate` 均为库代码（`src/utilities/transform/animateTransform.ts`、WAAPI 封装库）。

② ZCode 设置页容器静态四读，**无一处含动画/过渡类**：
```
I0（@330562025，页面壳）：`flex h-dvh flex-col overflow-hidden border-border text-foreground` + 圆角 clip-path + bg-background-alt —— 无 animate/transition
T9 根（@332720800 窗）：`relative grid h-screen min-h-full w-full grid-cols-[68px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[268px_minmax(0,1fr)]`
QXn 设置层（@332757598 窗）：`absolute inset-0 z-10`（生命周期仅两条日志 `[Root] settings layer mounted/unmounted`）
data-settings-panel-frame（@332725000 窗）：`relative flex flex-col min-h-0 h-full border border-border bg-background` + `t?\`rounded-md\`:\`rounded-xl\`` —— 无动画类
```

**最终判定：升级——取得决定性参照：ZCode 设置页（整页视图）开/关 = 视图层直接挂载/卸载，无任何进出动画。**
`duration:140` 在整个 341MB 安装包 0 命中，`fill:forwards` 全库仅 dnd-kit 库代码 1 处。batch-13「相邻浮层档 150ms 不能移用」的谨慎成立，且现在有更硬的结论：**插件 `close()` 的 140ms 淡出 + fill:forwards 属 DSH 自有增强，ZCode 无对应动效值（参照值=无动画，关闭即卸载）**。若追求同构应删除该动画；若保留属有意增强，建议在 `docs/ZCODE-DESIGN.md` 动效节登记（把 batch-13 的「未验证，不判偏离」升级为「有参照：ZCode=无」）。本批不改码。

---

## 2. 条目二：分区→图标映射 + 搜索图标 15px

**搜索过的模式**：
- 设置导航模型数组直读（@332636062 窗口 3.6KB）
- 图标别名还原：`tail -c +326350300 $A | head -c 21000 | grep -a -o 'import{t as <别名>}from"[^"]*"'`（kc/lc/cc/Yo/qo/Ko/Zo/Uc/Rc/Io/Lo/zs/Cte/Xee/Ro/wc/Fte/_te/ic/ac/Lne/Ac/Dc/Gc 全部解开）
- 15px 例证：`grep -a -c 'size-3\.75' $A` → **0**；`grep -a -c 'size-\[15px\]' $A` → **0**
- 插件侧 `zcode-icons.tsx` 别名表（本轮读文件）

**命中原文**：

① ZCode 设置导航全表（@332636062，`jYn` 分组 + `MYn` 分区，逐项带图标）：
```
jYn=[{id:`basics`,titleId:`settings.sidebar.group.basics`},{id:`agentCapabilities`,…},{id:`dataAndStats`,…}]
MYn=[general→kc(settings-2)·basics, appearance→lc(palette)·basics, modelProvider→cc(package)·basics,
     memory→Yo(brain)·agentCapabilities, subagents→qo(bot), plugin→Ko(blocks), mcp→Zo(cable),
     skill→Uc(wand-sparkles), commands→Rc(terminal), automations→Io(alarm-clock, 带 betaBadge),
     hooks→Lo(anchor), browser→_te(earth)·basics, remoteDevices→Fte(hard-drive)·basics,
     computerUse→ic(monitor)·basics, shortcuts→zs(keyboard)·basics, workspaceFileSearch→Cte(file-search)·basics,
     usage→Xee(chart-column)·dataAndStats, archives→Ro(archive)·dataAndStats]
```
设置入口按钮图标 `Ac`=`settings-DTzS0O5N.js`（Settings 单齿轮）；主题三档 system→monitor / dark→moon / light→sun。

② 导航项渲染（@332702163 `hXn`）：
```
className: `flex h-8 w-full items-center gap-2 rounded-xl px-2.5 text-left transition-colors`, `max-lg:mx-auto max-lg:size-10 …`
选中: `bg-surface-hover text-foreground` / 未选: `text-remote-foreground-muted hover:bg-surface-hover hover:text-foreground`
icon 包裹: `<span className="flex size-4 shrink-0 items-center justify-center text-current"><Icon className="size-4 text-foreground"/></span>`
aria-current: r?`page`:void 0（与 batch-13 一致项旁证再+1）
```
→ **ZCode 设置导航图标 = 16px（size-4）/ text-foreground / h-8(32px) 项行 / rounded-xl(12px)**（与 03f S1 的 h32/r12 吻合）。
分组标签（同窗）：`px-2.5 pb-1 text-ui-sm font-medium text-remote-foreground-muted max-lg:sr-only`（=12px/500，lg+ 可见、窄轨读屏专用——03f S1b 再证）。

③ 与插件 `sectionIcon()`（CodexSettingsPage.tsx:31-45）逐项对照：

| 插件分区 | 插件图标 | ZCode 同义分区 | ZCode 图标 | 异同 |
|---|---|---|---|---|
| general | Settings | general | **Settings2** | 同族异体 |
| /archive/ | Archive | archives | **Archive** | ✅ 同 |
| /skill/ | Sparkles | skill | **WandSparkles** | ❌ |
| /connector\|mcp/ | Link2 | mcp | **Cable** | ❌ |
| /schedule\|automation/ | CalendarClock | automations | **AlarmClock** | ❌ |
| /im\|assistant/ | MessageSquare | subagents | **Bot** | ❌ |
| /plugin/ | SlidersHorizontal | plugin | **Blocks** | ❌ |
| /model/ | Cpu | modelProvider | **Package** | ❌ |
| /expert\|agency/ | User | （无 about/expert 分区） | — | 无参照 |
| market | Store | plugin-store（内容页非导航项） | — | 无参照 |
| default | Box | — | — | DSH 兜底 |

**最终判定：升级——ZCode 设置导航图标从零记录变为 19 项全表真值。**
- 尺寸参照：导航图标 **16px**。插件同文件 16px 基线与 ZCode `size-4` 一致（此前 batch-13 无法判定对错，现判：16 正确）。
- **15px 确认无 ZCode 例证**：`size-3.75`/`size-[15px]` 全库 0 命中，ZCode 图标尺寸族只有 size-3.5(14)/size-4(16)/size-4.5(18) 等；`ZIconSearch size={15}` 若需对齐，ZCode 搜索框前导图标为 **size-4（16px）**（见条目三 NN）。15px 判为无出处孤值。
- 图形映射：仅 archive 一项与 ZCode 同形；skill/mcp/automations/assistant/plugin/model 六类 ZCode 均有明确异形参照。插件 `settings-nav-icons.ts` 的 8 套自绘 path 与 ZCode Lucide 原名图的差异由此可逐项裁决——本批只登记不改码。

---

## 3. 条目三：设置页搜索框（type=search / 占位 / 空态 role=status）

**搜索过的模式**：
- `grep -a -o '"settings\.[a-zA-Z.]*[sS]earch[a-zA-Z.]*":\`[^\`]*\`' $A` → 全量枚举（60+ 键）
- `grep -a -b -o 'settings\.search\.clear' $A` → 7 处（语言表 2 + 编译 5），5 处消费窗口逐一提取
- `grep -a -o '"settings\.sidebar\.[a-zA-Z.]*":\`[^\`]*\`' $A` → 仅 3 个分组标题键，**无侧栏搜索占位键**
- batch-13 的 `type:"search"` 4 命中（GitHub workbench 过滤框）复核 + 本批新锚 NN@328242552
- 空态：`grep -a -b -o 'function j3('` → 331245503，提取 + `k3=` 定义（@331230000 窗口）

**命中原文**：

① **ZCode 设置侧栏（nav）没有搜索框**：T9 的 `nav[aria-label=settings.navLabel]` 内只有「返回工作区钮 → 分组导航 → 引导项（rocket，虚线边框）→ 页脚（主题/语言/用户）」，无 input。（@332720800 窗口全文读）

② 搜索全部在**分区内**，共用组件 `NN`（@328242552）：
```
function NN({className, clearLabel=`Clear search`, clearTestId, containerClassName, onClear, trailingAction, …o}){
  <div className=Z(`relative`,r)>
    <Dc className=`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle` aria-hidden/>   ← Search 图标 16px/60%前景/左 12px
    <ga … type:`search` size:`lg` className=Z(`h-9 rounded-xl pl-9 [&::-webkit-search-cancel-button]:appearance-none`, (s||a)&&`pr-9`, s&&a&&`pr-16`, e)>
    清除钮: <X variant:ghost size:icon-sm className:`rounded-full text-foreground-subtle` aria-label=clearLabel><Gc className:`size-3.5`/>  ← 24px 钮 + X 14px
```
消费点四处统一：`containerClassName:`w-full sm:ml-auto sm:w-64``（subagents/hooks）或 `w-full sm:w-64`（memory）、`clearLabel=formatMessage({id:'settings.search.clear'})`（=「清空搜索」）。空态 `j3`（@331245503）：`` `${k3} text-ui-base text-foreground-subtle` ``，`k3=`rounded-xl border border-dashed border-border bg-transparent px-4 py-10 text-ce(nter)`` —— **虚线边框空态盒，无 role=status**（普通 div）。

③ i18n 佐证：`settings.search.clear`=清空搜索；分区内占位键各自独立（`settings.shortcuts.searchPlaceholder`=搜索快捷键、`settings.skills.searchPlaceholder`=搜索技能...、`settings.plugins.marketplace.searchPlaceholder`=搜索插件、技能、MCP… 等）；空态键 `settings.*.searchEmpty`（没有匹配的…）。

**最终判定：升级——搜索框形态取得完整 ZCode 真参照，但结构位置不同。**
ZCode 的「设置×搜索」= **分区内**：`type=search` + h-9(36px) + rounded-xl(12px) + 前导 Search 16px（60% 前景，left-3）+ pl-9 + 右侧 ghost 24px 圆形清除钮（X 14px）+ aria-label「清空搜索」；空态为虚线边框圆角盒（14px/60% 前景，px-4 py-10），**无 role="status"**。
插件把搜索放在**导航栏**（`.dcu-settings-search`：gap8+card 底+caption 字号+focus 蓝边）是 DSH 自有结构，ZCode 无此物；空态 `role="status"` 为插件 a11y 增强（ZCode 参照无该角色）。若对齐分区内形态：36px 高 / 12px 圆角 / 前导 16px 图标 / 清除钮 24px。本批只登记。

---

## 4. 条目四：host-anchor-contract.ts 全模块

**搜索过的模式**（本轮实跑复核，batch-13 的 6 名全部重跑并扩到 14 名）：
`_composerHero`、`_fishHitbox`、`_heroWorkspaceRow`、`_bannerWrap`、`_leadingSeat`、`widthHandle`、`composerHero`、`fishHitbox`、`heroWorkspaceRow`、`bannerWrap`、`leadingSeat`、`icaHSq`、`ST7X_W`、`_toBottomSlot` —— 逐一 `grep -a -c $A`。

**命中原文**：**全部 0 命中**（无任何输出行）。

**最终判定：确认无参照（架构性）。**
ZCode 自身就是宿主，不存在「依赖上游 CSS Module 哈希类名」的问题，asar 内自然无这批 DSH 宿主哈希名；插件侧的「只自检前置条件可确定的锚点 + 同组只报一次 + 合并到下一帧 + 动画期跳过」属插件工程纪律（`docs/ZCODE-DESIGN.md` §12 已登记）。维持 batch-13 判定，本批以 14 模式全 0 的实测记录替代此前的 6 名佐证。

---

## 5. 条目五：settings-navigation / settings-page-model / sidebar-search / global-panels / workspace-archive 其余决策点

**搜索过的模式**：
- 分组：`grep -a -o '"settings\.sidebar\.group\.[a-zA-Z]*":\`[^\`]*\`' $A`；`grep -a -b -o 'settings\.sidebar\.group' $A`（9 处偏移）
- 配额：`tail -c +328055000 | head -c 40000 | grep 'slice(0,[0-9A-Za-z]\{1,3\})'` + 常量 `AA/jA/OA/Pit/Nit` 赋值提取；`var Yit`@328071524 全文
- 入口定位：`grep -a -b -o '.\{70\}aria-haspopup.\{40\}' $A`（全库 11 处逐一归类）；`grep -a -b -o 'settingsButtonMode'`；hwt 体内设置按钮属性提取
- 事件合约/DSH 自有标识：`dcu-settings`、`data-dcu`、`sidebar.panellist`、`dsw-font-size`、`dsh-` 逐一 `grep -a -c` 
- 断线恢复：`"[a-zA-Z.]*":\`[^\`]*已恢复[^\`]*\``、`recovered[A-Za-z]*`、`"[a-zA-Z.]*reconnect[a-zA-Z.]*":\`[^\`]*\``、`重新连接`、`"connecting"/"disconnected"/"connected"` 计数、`chat.apiRetryStatus` 上下文
- ZCode 导航机制：T9 导航 onClick 窗口（@332720800）——`GP({input:{featureId:'settings.navigation',action:'open_section',…}})` + `Ke(e)` 直接 setState

**命中原文与逐项判定**：

| 子项 | 搜索结果 | 判定 |
|---|---|---|
| **设置三分组归属映射**（settings-page-model.ts:5-9 personal/integrations/records） | `settings.sidebar.group.basics=基础设置 / agentCapabilities=Agent 能力 / dataAndStats=数据与统计`（zh+en 双语）；MYn 归属全表：appearance、modelProvider、shortcuts、browser、remoteDevices、computerUse→basics；memory、subagents、plugin、mcp、skill、commands、automations、hooks→agentCapabilities；usage、archives→dataAndStats | **升级**。ZCode 有完整三分组表：插件「personal≈basics / integrations≈agentCapabilities / records≈dataAndStats(archives)」方向同构；差异点：ZCode 把 modelProvider 放 basics（插件 /model/→integrations）、ZCode 无 about/expert 分区。分组成员可比对，本批登记不改码 |
| **搜索配额 12/3**（sidebar-search.ts:38 + CodexSidebar.tsx:610/616） | ⌘K（Yit@328071524）：`jA=3`（会话组 `le.slice(0,jA)`、文件组 `se.slice(0,jA)`）、`AA=3`（命令分组 `slice(0,AA)`×2，挂 `commandCenter.section.*` 标题）、`OA=20`（最近搜索持久化上限）、`Pit=80`（会话 collapsedLimit，专属 scope 下）；无任何「全场总上限」常量 | **升级**。ZCode ⌘K = **每组 slice(0,3)**（与插件 floor=3 同值），会话专属 scope 上限 80；**无总上限 12 的概念**——SEARCH_RESULT_LIMIT=12 属 DSH 自有（三组必须露头的配额思想在 ZCode 以「每组 3」直接体现） |
| **宿主壳 aria-haspopup="dialog" 定位**（settings-navigation.ts:36） | 全库 11 处 aria-haspopup：Radix DialogTrigger 1 处（@319069462 `"aria-haspopup":\`dialog\``）、menu 组件自设 5 处、ARIA 属性表 5 处。设置入口按钮真身（hwt 体内，@328823103+26KB 窗）：`<X type:button variant:ghost size:icon-lg aria-label:P(设置/返回工作区) disabled:!i onClick:i><Ac className:size-4/>` —— **无 aria-haspopup** | **升级**。batch-13 的「asar 有该值但定位不到设置入口」已解：该值只来自 Radix DialogTrigger，与设置入口无关；ZCode 设置入口按钮 = ghost icon-lg(32px) + aria-label + Settings 齿轮 16px，**无 aria-haspopup**。插件以该特征定位「保留的宿主设置壳」对 ZCode 自家入口失效，靠 `data-dcu-settings-trigger` 自有标记兜底——两套触发器形态均有真值可查 |
| **dcu-settings-open-section/root 事件合约**（settings-navigation.ts:37-38） | `grep -a -c 'dcu-settings' $A` → 0；`data-dcu` → 0。ZCode 导航 = `GP(埋点)` + `Ke(e)` 同步 setState，无 CustomEvent / MutationObserver 扫按钮 | **确认无参照**（插件自有合约，03f §2.1 已按 DSH 侧方法登记） |
| **4s 导航超时兜底**（settings-navigation.ts:35） | 同上：ZCode 分区切换是同步 state 提交（`failureStage:'navigation_commit'` 仅埋点字段），无 DOM 扫描重试，无超时常量 | **确认无参照** |
| **断线恢复指示 3s**（CodexSettingsPage.tsx:129） | `已恢复` 仅命中工作流恢复；`recovered*` 35 处均为错误恢复计数（recoveredCompactTimelineCount 等）；重连语义 = `chat.apiRetryStatus`（重新连接中... {attempt}/{maxRetries}）、`settings.source.reconnect`（手动按钮）、`webRemoteControl.mobileShell.reconnecting`（自动重连文案）；连接枚举 `"connected"/"connecting"/"disconnected"` 存在但无「恢复后短暂提示」态 | **确认无参照**。ZCode 无 transient「已恢复」指示；3s 时长与「recovered」档均为 DSH 自有 |
| **官方 alpha.2 plugins 面板排除**（global-panels.tsx:23） | `grep -a -c 'sidebar.panellist' $A` → 0；`data-dcu` → 0 | **确认无参照**（DSH 槽位 API 专属逻辑） |
| **归档去重与顺序执行**（workspace-archive.ts） | 无视觉决策点；ZCode 侧仅有 `archives` 分区（dataAndStats 组）与 `settings.taskAutoArchive*` 开关键 | **确认无参照**（工程纪律，非视觉令牌） |

---

## 6. 汇总

| 条目 | batch-13 状态 | 本批结果 |
|---|---|---|
| 1 设置页退出动画 140ms | 未验证，不判偏离 | **升级**：ZCode 设置页四层容器（I0/T9 根/QXn 层/panel-frame）零动画类，`duration:140` 全库 0 命中，WAAPI 5 处均非设置 → **ZCode 参照=关闭即卸载、无退出动画**；插件 140ms 淡出属自有增强，建议登记 |
| 2 分区图标映射 + 15px | 零记录 | **升级**：MYn 19 分区图标全表还原（Lucide 原名）；导航图标=16px/foreground/h-32/r12；16px 基线判对；**15px 全库 0 例证（size-3.75/size-[15px] 均 0）**，参照值 16px；图形映射仅 archive 同形，6 类有异形真值 |
| 3 设置页搜索框 | 未采集 | **升级**：ZCode 设置侧栏**无搜索框**（nav 区无 input）；搜索=分区内 NN 组件（type=search/h-9/rounded-xl/前导 Search 16px 60%/清除钮 icon-sm+X 14px/清空搜索 aria-label）；空态=虚线边框盒无 role=status |
| 4 host-anchor 契约 | 架构澄清后跳过 | **确认无参照**：14 模式 grep 全 0（6 名复核 + 8 变体） |
| 5 其余决策点（8 子项） | 均无例证 | 3 升级 + 5 确认无参照：**升级**=三分组归属表 / ⌘K 每组 3·无全场 12 上限 / 设置入口按钮无 aria-haspopup（真身=ghost icon-lg+aria-label）；**无参照**=dcu 事件合约（0 命中）/ 4s 超时（ZCode 同步导航）/ 断线恢复 3s（ZCode 无 recovered 瞬态）/ plugins 面板排除（panellist 0 命中）/ 归档顺序（非视觉点） |

**计数**：按 12 个决策点计——升级为有参照 **6**，确认无参照 **6**（覆盖 batch-13 原列 5 条目：其中 3 条整条升级、1 条整条无参照、1 条拆分 3+5）。
**未验证/存留**：① 本批全部为静态提取，无活体复测——「设置页关闭无动画」是 bundle 静态事实，极小概率存在运行时 JS 动画未被静态覆盖（但 5 处 WAAPI + 容器四读 + duration:140 零命中三重交叉，置信度高）；② 插件侧 8 套自绘导航 path 是否要按条目 2 的 Lucide 真值重绘、设置搜索是否保留在导航栏，属对齐批次的决策，本批只登记；③ `text-remote-foreground-muted` 等 remote 系令牌的确切色值未提取（非本批决策点所需）。
