# gapfill-8 · 批次补采 8（zcode-theme.ts 四条 + input-history-keyboard.ts 一条复挖）

> 2026-10-30 夜间审计补采批次 8（只读，仅新建本文件）。对象：批次 8 审计中因「查不到 ZCode 参照」跳过的 5 条；模块 `src/client/zcode-theme.ts`、`src/client/input-history-keyboard.ts`；纯逻辑三模块（slot-mirror / schedule-sessions / tree-expansion）仅复核「无视觉决策点」论断，不占名额。
> 方法：对每条先推断 ZCode 侧载体（CSS 变量、tailwind 类、组件 jsx、localStorage 键、Web Animations 参数），在 app.asar（341,377,861 B）中 `grep -a -o` 检索；带换行/超长区间的用 python mmap + `re.finditer` 抓字节上下文（偏移以 `@` 标注）；同步复读 `03i-command-palette.md`、`03b-sidebar.md`、`03d-composer(-zcode-spec.json)` 未引用段落。
> 本轮实跑命令清单（`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o -- '--color-text-[a-z]*:[^;}]*' $A | sort | uniq -c` → 仅 `--color-text-primary: var(`（MCP 桥，多行定义截断）
> - python mmap：`--muted-foreground:`、`--color-text-primary: var\(` 上下文（@285984494 / @285989384）
> - `grep -a -o -- '--color-tooltip[a-z-]*:[^;}]*' $A | sort | uniq -c` → tooltip 家族 18 条全量（foreground/tag/tag-foreground × 双主题实色 + var() 基础层 + color-mix）
> - `grep -a -o '.\{100\}tooltip-tag.\{100\}' $A | head -8` → 命中 kbd 组件 jsx
> - python mmap：`` `kbd` `` ±500（@327149985，组件 `Ev`）；`function Dv({children:e,title:t,description:n,shortcut:r` 起全文 2400 B（@327150395，tooltip 组件）
> - `grep -a -o 'text-tooltip-foreground/60' $A | wc -l` → 1（仅 safelist）；`text-tooltip-foreground/80` → 1（组件消费处）
> - `grep -a -o -- '--color-text-secondary[^;}]*' $A | sort | uniq -c` → MCP theming schema 枚举 + `{token:"--color-foreground-subtle",fallback:"#737373"}` 映射 1 条
> - `grep -a -o -- '--color-sidebar[a-z-]*:[^;}]*' $A | sort | uniq -c` → 仅 sidebar 背景 4 条；`--sidebar-[a-z-]*:`、`--color-icon[a-z-]*:`、`[a-z-]*icon-foreground:` → vscode 层 `#424242/#c5c5c5` ×4+4
> - `grep -a -o 'text-foreground-subtle\b' $A | wc -l` → **1337**；`text-foreground-subtlest` → 481；`size-\d text-foreground-subtle` → **71**（python）
> - python mmap：shell 段（332186000–332262000，沿用 gapfill-3 定位）内 `text-foreground-subtle`(2)/`text-muted-foreground`(0)/`text-foreground-subtlest`(0)/`stroke-current`(0)/`fill-current`(0)/`tabular-nums`(0) 全查
> - `grep -a -o -- '--color-foreground-subtle:[^;}]*' / '--color-foreground-subtlest:[^;}]*' $A | sort | uniq -c` → 各 4 条（zai 实色 + 基础层 + @supports color-mix）
> - `grep -a -o '\.animate-in{[^}]*}' $A` / `@keyframes enter{[^}]*}[^}]*}` / `@keyframes exit{…}`；`grep -a -o -- '--ease-[a-z-]*:[^;}]*' $A | sort | uniq -c` → 仅 ease-out / ease-in-out 2 条（**无 --ease-in**）
> - `grep -a -o 'cubic-bezier([^)]*)' $A | sort | uniq -c | sort -rn | head -25` → 全量曲线清单；`cubic-bezier(0.2, 0, 0, 1)` 定点 → **2 处逐字命中**（@328579135 / @328581342，FLIP）；exit 曲线 `.4,0,1,1` 各形式 → 0
> - `grep -a -o 'easing:`[^`]*`' $A | sort | uniq -c | sort -rn | head -20` 与 `{duration:[0-9]{2,4},easing:…}` 配对清单
> - `grep -a -o 'duration-90\b' $A | wc -l` → 0；`90ms` → 33（上下文核验全为 pdf.js CMap 文件名）；`.09s` → 3（SVG 路径数据）
> - `grep -a -o 'zcode:[a-zA-Z0-9:-]*' $A | sort | uniq -c` → 全量枚举（无草稿历史键，注意真键前缀是 `zcode-chat-prompt-history:` 不以 `zcode:` 开头，故枚举漏网、由 promptHistory 追溯补获）
> - `grep -a -c 'isComposing' $A` → 178；`grep -a -o 'keyCode[=!]==\{0,2\}229…' $A | sort | uniq -c` → `===229` ×12、`!==229` ×7（上下文核验）
> - `grep -a -o 'data-lexical-editor' $A | wc -l` → 5；`KEY_ARROW_UP/DOWN` → 各 44；`promptHistory` → 5、`prompt-history` → 1
> - python mmap：composer 区（329330000–329420000）ArrowUp/promptHistory 上下文；`function $Wt`（@329336745，游标计算器）；`TKt(` 调用点（@329605218/@329605736）；zcode-chat-prompt-history 区全文
> - 仓库内核对：`input-history-keyboard.ts` 全文、`input-history.ts` 全文（HistoryCursor / InputHistory 上限参数）、`slot-mirror.tsx`/`schedule-sessions.ts`/`tree-expansion.ts` 共 184 行 grep `color|px|font|shadow|radius|transition|animation|rgba|style` → **0 命中**
> ⚠ 未做活体 CDP 复测（无 9224 采样条件）；暗色 kbd 值差异、图标色换算差、tooltip/80 换算差均登记待裁决，未改任何代码。

---

## 条目 1 · `--dcu-kbd-foreground` #5c5c5c/#9a9a9a（zcode-theme.ts:67,87）——**升级：有参照（浅色逐字一致，暗色值不同）**

**原跳过理由**：asar 有 `text-muted-foreground` 类名但无 `--color-muted-foreground` 数值定义；唯一 `--muted-foreground:` 片段带 `light-dark()`，归属存疑。

**本轮搜索过的模式**（全部实跑）：`--color-text-[a-z]*:`、`--muted-foreground:` 上下文（python）、`` `kbd` `` 组件上下文、`--color-tooltip[a-z-]*:` 全量、`text-muted-foreground` 计数（本轮 grep -o 计 **68**，批次 8 记 83，模式口径不同）、`--color-text-secondary` 全部出现形式、`data-slot.*kbd`（grep 计数 0，但 jsx 反引号写法在 @327149985 实证）。

**命中原文**：
1. **ZCode kbd 组件（归属实锤）** @327149985：
   ```
   function Ev({className:e,style:t,...n}){let r=il();return(0,$.jsx)(`kbd`,{"data-slot":`kbd`,className:Z(`rounded-md h-4 inline-flex shrink-0 items-center bg-tooltip-tag px-1.5 text-ui-xs font-medium text-tooltip-tag-foreground`,r?`tracking-normal`:`font-mono`,e),style:{...r?{fontFamily:`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif`}:{}},...n})}
   ```
   紧随其后的 `Dv({children,title,description,shortcut,…})` 即 tooltip 组件，`r?(0,$.jsx)(Ev,{children:r}):null` —— 键帽由 tooltip 的 shortcut 槽消费。
2. **文字色 = `--color-tooltip-tag-foreground`**（`.text-tooltip-tag-foreground{color:var(--color-tooltip-tag-foreground)}`）：zai-light **`#5c5c5c`**（与 `--dcu-kbd-foreground` 浅色逐字相同）；zai-dark **`#adadad`**（本仓 `#9a9a9a`，不同）。基础层为 60% alpha 形式：light `#0a0a0a99`、dark `#fafafa99`，@supports 块为 `color-mix(in oklab, var(--color-neutral-950/50) 60%, transparent)` 同义式。
3. **键帽底色 = `--color-tooltip-tag`**（`.bg-tooltip-tag{background-color:var(--color-tooltip-tag)}`）：#e6e6e6 / #363636；几何 `h-4`（=`calc(var(--spacing)*4)`=16px）、`rounded-md`、`px-1.5`、`text-ui-xs`、`font-medium`；非 Mac 用 `font-mono`，Mac 用系统字体 + `tracking-normal`。
4. **`--muted-foreground` light-dark 片段归属闭合** @285984494：该块属于 **MCP apps 内联渲染器**的别名桥接样式（同块注释原文 `Preserve MCP aliases for older inline renderers without creating :root cycles`、`html > body{…margin:0;padding:var(--visualize-paint-gutter,0px)…}`），非主 UI；其 `--muted-foreground: var(--color-text-secondary, light-dark(rgb(26 28 31 / 49.4%), rgb(255 255 255 / 49.8%)))` 的解析目标 `--color-text-secondary` 是 MCP theming schema 键（"CSS variable keys available to MCP apps for theming"），映射表 `{token:"--color-foreground-subtle",fallback:"#737373"}` —— 最终落在 `foreground-subtle`（60% 前景），与 kbd 无关。

**最终判定**：升级为有参照。ZCode Kbd 的文字槽位 = **tooltip-tag-foreground**（不是 text-muted-foreground——本仓 `zcode-theme.ts:64` 注释「ZCode Kbd 组件用 text-muted-foreground」被证伪）；浅色 #5c5c5c **逐字一致**（本仓取值实际命中，只是此前找错了载体）；暗色 ZCode **#adadad**（on tag 底 #363636）vs 本仓 #9a9a9a（按侧栏底重取）——差异登记待裁决。另获得两条本仓缺失的对照值：键帽底 `--color-tooltip-tag`（#e6e6e6/#363636 成对）与几何规格（h-4/rounded-md/px-1.5/text-ui-xs/font-medium）。→ 计入 **found**。

---

## 条目 2 · `--dcu-tip-secondary`/`--dcu-tip-tertiary` 四值（zcode-theme.ts:63,84）——**部分升级：次档有机制参照，三档确认无**

**原跳过理由**：ZCode tooltip 家族只有 tooltip-foreground 与 tooltip-tag(-foreground)，无三档浮层文字槽位。

**本轮搜索过的模式**（全部实跑）：`--color-tooltip[a-z-]*:` 全量 18 条；`Dv` tooltip 组件全文；`text-tooltip-foreground/60`、`/80` 计数与上下文；`.text-tooltip-foreground\/80{…}` 规则体。

**命中原文**（tooltip 组件 `Dv`，@327150395）：
- 主文字：`text-ui-sm font-medium leading-4 text-tooltip-foreground`（title 槽）
- **次文字：`(0,$.jsx)('span',{className:'max-w-64 text-ui-sm/relaxed text-tooltip-foreground/80',children:n})`** —— description 槽用**主文字 80% alpha**，规则体 `.text-tooltip-foreground\/80{color:color-mix(in oklab, var(--color-tooltip-foreground) 80%, transparent)}`
- 快捷键槽：`Ev` kbd（= 条目 1 的 tooltip-tag-foreground）
- `text-tooltip-foreground/60` 仅出现 1 次且在 CSS safelist 类名清单里（`…,text-tooltip-foreground/60,text-tooltip-foreground/80,…`），**0 处组件消费**。

**最终判定**：ZCode 浮层文字确实是**两档 + 键帽**结构，但次档不是独立灰阶——是 `tooltip-foreground/80`（同色 alpha 降档，oklab color-mix）。换算渲染值：浅 #0d0d0d@80% over #f0f0f0 ≈ **#3a3a3a**、深 #f8f8f8@80% over #2b2b2b ≈ **#cfcfcf**——本仓 `--dcu-tip-secondary` #5c5c5c/#9a9a9a 比它浅得多（本仓机制=独立灰阶、ZCode 机制=alpha 降档）。`--dcu-tip-tertiary`（第三档）确认无对应物（/60 有类无消费，tooltip/tag 两族共 4 个槽位全数枚举无第三档）。→ 条目计入 **found**（次档机制+换算值可对账；tertiary 半边维持无参照，若收口建议二选一：改用 alpha 降档机制，或砍掉 tertiary 槽位）。

---

## 条目 3 · `--dcu-sidebar-icon` #525252/#a3a3a3（zcode-theme.ts:287,338）——**升级：有参照（惯例级，图标=foreground-subtle 60%）**

**原跳过理由**：ZCode 侧栏图标色未采集（仅 running loader = foreground-subtle 60%，03b §5）。

**本轮搜索过的模式**（全部实跑）：`--color-sidebar[a-z-]*:`（仅背景 4 条）、`--sidebar-[a-z-]*:`（8 类面板几何变量，无颜色）、`--color-icon[a-z-]*:`（仅 terminal 关联 2 条）、`[a-z-]*icon-foreground:`（仅 `--vscode-icon-foreground: #424242/#c5c5c5` ×4+4，vscode 兼容层）、`text-foreground-subtle` 全局计数、`size-\d text-foreground-subtle` 组合、shell 段内 `stroke-current`/`fill-current`/`text-foreground-subtlest`/`text-muted-foreground`（全 0）、`--color-foreground-subtle` 定义全量；复读 `03i-command-palette.md`（批次 8 未引用）。

**命中原文**：
1. **图标色惯例 = `text-foreground-subtle`**：全局 `text-foreground-subtle` ×**1337**，其中 `size-N text-foreground-subtle` 图标配色组合 ×**71**（样例：Select 下拉箭头 `pointer-events-none size-4 text-foreground-subtle` @326705907、dropdown-menu checkbox/radio indicator `size-4 text-foreground-subtle` @327201083/@327202037、sub-trigger 箭头 @327203358）。
2. **shell 段（侧栏本体）内的图标实例**：resize 手柄 `…cursor-ns-resize border-border bg-surface text-foreground-subtle shadow-sm hover:bg-surface-hover hover:text-foreground…` @332221073 —— 侧栏自身图标/图形元素也是 subtle 底 + hover 转全亮。
3. **03i（本轮新增引用，CDP 活体）**：D1「图标按钮 | 24×24、radius 6、**图标色 = 前景 60%**」；「图标按钮 hover：bg-hover + 字色 60%→全亮」；03b §5 任务行 loader `text-foreground-subtle` 60%（既有）——惯例三源一致。
4. **数值链**：`--color-foreground-subtle` zai-light **`#40404099`**、zai-dark **`#d4d4d499`**（基础层 `#26262699`/`#e5e5e599` + @supports color-mix 60% 同义式）。渲染换算：light #404040@60% over #f0f0f0 ≈ **#868686**、dark #d4d4d4@60% over #161616 ≈ **#888888**。
5. 无任何 `sidebar-icon`/`sidebar-foreground` 专用令牌（0 命中）。

**最终判定**：升级为有参照。「ZCode 侧栏图标色未采集」应更正为「**无专用令牌，但图标色惯例=foreground-subtle（60% 前景 alpha）已三源实证（71 处组件实例 + 03i D1 活体 + 03b §5）**」。本仓 `--dcu-sidebar-icon` 的实值 #525252/#a3a3a3 与该惯例换算值（≈#868686/#888888）各差约 2 个灰阶档（浅色本仓更重、暗色本仓更亮）——如收口，机制级对齐做法是改用 `color-mix(in oklab, <foreground> 60%, transparent)`。附带：`--color-foreground-subtle` 的 zai-light 基色为 **#404040**（=#26262699 为基础层浅色），为批次 8 差异表 D3「zai 覆盖层不覆盖 --color-foreground，neutral-700/800 归属未定」提供旁证——zai 浅色体系挂在 neutral-700(#404040) 侧。→ 计入 **found**。

---

## 条目 4 · enter/exit 缓动曲线 cubic-bezier(.2,0,0,1)/(.4,0,1,1) 与 press 档 90ms（zcode-theme.ts:142-144）——**部分升级：enter 档双值逐字命中；exit/press 确认无**

**原跳过理由**：本轮 asar `@keyframes enter/exit` 不含 timing-function，时长 .15s 已锁但曲线无例证；press 时长 02-motion.md 明示「ZCode 侧未采到」。

**本轮搜索过的模式**（全部实跑）：`.animate-in{`/`.animate-out{` 规则体、`@keyframes enter/exit` 全文、`--ease-*` 全量、`cubic-bezier([^)]*)` 全量清单、exit 曲线 `.4,0,1,1` 各写法、JS 侧 `easing:` 与 `{duration,easing}` 配对清单、`duration-90`/`90ms`/`.09s`。

**命中原文**：
1. **timing-function 的真正藏身处（批次 8 漏看的层）**：
   `.animate-in{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,**ease**) var(--tw-animation-delay,0s)…}` —— keyframes 确实不含曲线，由工具类简写提供，**默认是 CSS 关键字 `ease`**；`--ease-*` 全量仅 `--ease-out:cubic-bezier(0, 0, .2, 1)` 与 `--ease-in-out:cubic-bezier(.4, 0, .2, 1)` 两条（**无 --ease-in**）。tooltip 等 `animate-in fade-in-0 zoom-in-95` 用法均未伴 `ease-*` 类 → CSS 层 enter/exit 实际跑在默认 `ease` 上。
2. **enter 档逐字命中（JS 动画层）** @328579135 与 @328581342（分组任务列表 FLIP，`data-grouped-layout-key` 的折叠/移动动画）：
   ```
   var kvt={duration:150,easing:`cubic-bezier(0.2, 0, 0, 1)`},Avt={x:.1,y:.1}
   e.animate([{height:…,transform:`translate(…)…`},{height:…,transform:`translate(0, 0)`}],{duration:150,easing:`cubic-bezier(0.2, 0, 0, 1)`})
   ```
   **{duration:150, easing:"cubic-bezier(0.2, 0, 0, 1)"} 与本仓 `--dcu-motion-enter-duration:150ms;--dcu-motion-enter-ease:cubic-bezier(.2,0,0,1)` 双值逐字相同**（全 asar 唯一二次出现，均在同一 FLIP 实现）。
3. **exit 曲线无参照（实证）**：`cubic-bezier(.4,0,1,1)` 及 `0.4, 0, 1, 1` 等写法全 asar **0 命中**；全量清单中无一近似形（最近的是 `.45,0,.55,1`×4 与 `.77,0,.175,1`×3，语义不同）。JS 侧 easing 全集：`linear`×3、`ease`×3、`ease-out`×2、`cubic-bezier(0.2, 0, 0, 1)`×2、`cubicOut`(300ms)×1、`cubic-bezier(0.2, 0.8, 0.2, 1)`×1、`linear(0, 1)`×1。
4. **press 90ms 无参照（实证）**：`duration-90` 0；`90ms` ×33 上下文逐条核验**全部是 pdf.js 字体 CMap 资源文件名**（`90ms-RKSJ-H.bcmap` 等，两份重复清单）；`.09s` ×3 为 SVG 路径数据（假阳性）。

**最终判定**：enter 档（150ms + `.2,0,0,1`）从「无例证」升级为**双值逐字命中**（ZCode 分组列表 FLIP，属「进入/位移」语义，与本仓 enter 档语义吻合）；exit 曲线 `.4,0,1,1` 与 press 90ms 维持**实证无参照**（`.animate-in` 默认 `ease` 这一层还提示：本仓 enter/exit 若追求与 ZCode CSS 动画同款，`ease` 关键字也是可选对照，但 JS 层 FLIP 的实测档位优先）。→ 条目计入 **found**（enter 半边），exit/press 半边 absent 维持。

---

## 条目 5 · `input-history-keyboard.ts` ↑/↓ 草稿历史召回（IME keyCode 229、capture 监听）——**升级：有参照（ZCode 自带同构功能，全链路挖出）**

**原跳过理由**：ZCode composer 键盘行为未采集（03d D-h 焦点态亦标「未采到」）。

**本轮搜索过的模式**（全部实跑）：`isComposing`（178）、`keyCode===229`（12）及上下文、`zcode:` 存储键全量枚举、`data-lexical-editor`（5）、`KEY_ARROW_UP/DOWN`（各 44）、`ArrowUp` 全局（1013）与 history/recall/draft 邻接搜索（0）、`promptHistory`（5）→ 顺藤摸瓜 `prompt-history`（1）、composer 区 KEY_ARROW_UP 命令注册、`function $Wt`、`TKt(` 调用点；复读 `03d-composer-zcode-spec.json`（editor 节只有几何/颜色：contenteditable、14px/20px、min-h-10、max-h-40，observations 无键盘条目——「未采集」属实）。

**命中原文**（ZCode **自带 prompt 历史召回**，Lexical composer 插件群）：
1. **存储层** @329374681：
   ```
   var xKt=`zcode-chat-prompt-history:`;
   function wKt(e){return e.filter(e=>typeof e==`string`).map(e=>e.trim()).filter(e=>e.length>0).slice(-30)}   // 30 条上限
   function Cq(e,t=SKt()){…JSON.parse…Array.isArray(e)?wKt(e):[]}catch{return[]}                              // 读：损坏→[]
   function TKt(e,t,n=SKt()){let r=wKt(t);n?.setItem(CKt(e),JSON.stringify(r))}                                // 写
   ```
   作用域 id 每会话一份（`[Nn,Pn]=(0,Q.useState)(()=>Cq(O))` + `useEffect(…,[O])` 随作用域重读 @329602578）；发送时合并去重 `gQt(L,R)||(TKt(O,R),B=!0,Pn(R))` @329605736。⚠ 该键前缀 `zcode-chat-prompt-history:` 不以 `zcode:` 开头，`zcode:` 枚举（1 处命令）搜不到它，需靠 promptHistory prop 追溯——原审计「ZCode 无草稿历史存储」的搜索路径本身有盲区。
2. **召回插件** `AGt({entries:e,disabled:t})` @329348098：
   ```
   o=(0,Q.useCallback)(i=>o=>{if(!o||t||o.shiftKey||o.ctrlKey||o.metaKey||o.altKey||o.isComposing)return!1;
     let s=oq(n.getEditorState()),c=r.current;
     if(c===null&&s.length>0)return!1;                       // 草稿非空→不召回（与 uiplug 同语义）
     let l=$Wt(e,c,i);return l.shouldHandle?(o.preventDefault(),a(l.nextIndex,l.nextValue),!0):!1},…)
   (0,Q.useEffect)(()=>{let e=n.registerCommand(ZH,o(`up`),3),t=n.registerCommand(QH,o(`down`),3);return()=>{e(),t()}},[n,o])
   ```
   自写跳过标志 `i.current`（update listener 里 `if(i.current){i.current=!1;return}`）↔ 本仓 `writingHistory`；外部编辑游标重置 `oq(a)!==e[o]&&(r.current=null)` ↔ 本仓 `changed → cursor.reset()`；entries 越界重置 `e[r.current]===void 0&&(r.current=null)`。
3. **游标计算器** `function $Wt(e,t,n)` @329336745：↑ 空草稿直接取最新（`t===null?e.length-1`）、中途 `Math.max(t-1,0)` 到顶停住；↓ 越过最旧时 **`{nextIndex:null,nextValue:''}`（恢复空草稿）** —— 与本仓 HistoryCursor 的 `index===entries.length → 恢复 original` 行为同效（本仓 original 进历史时必为 ''）。
4. **IME 守卫的分工差异**：ZCode 命令层只查 `o.isComposing`（Lexical 合成事件已消化 keyCode 229；229 的原始处理在 React DOM useCompositionEvents @233388264 `t==="keydown"&&l.keyCode===229&&(ht="onCompositionStart")`）；composition 另由独立插件用根元素 `compositionstart/end` 原生监听 + `pendingComposition` + rAF 处理（@329344500 起）——与本仓「compositionstart/end 监听 + isComposing + keyCode 229 三保险」结构对应、层级不同（ZCode 靠 Lexical 命令系统优先级 3，本仓靠原生 keydown capture 跨宿主通用）。其余 229 命中为 cmdk 菜单根（@104509699，命令面板导航）与 xterm（@235943745），非 composer。
5. **参数对照**：本仓 `input-history.ts` 单键 `michengai.codex-ui.input-history.v1` 多 scope（≤20 scope × ≤200 条、单条 ≤8000 字符、总量 ≤1MB、legacy 键迁移）vs ZCode 每 scope 一键 `zcode-chat-prompt-history:<id>`、≤30 条、无单条/总长帽、无迁移。

**最终判定**：升级为有参照。ZCode composer **自带同构的 ↑/↓ prompt 历史召回**（Lexical 命令 + localStorage 持久化 + 30 条上限 + 空草稿门 + 自写跳过 + 外部编辑重置），原「ZCode composer 键盘行为未采集」的说法解除；本仓实现与之**语义同构、层级不同**（原生 capture vs Lexical 命令），差异点是宿主架构所致而非设计偏离；存储参数（200/8000/1MB vs 30/∞/∞）为本仓自有决策，可登记为「参数差异，无对齐义务」。→ 计入 **found**。

**纯逻辑三模块复核**：`slot-mirror.tsx`(107 行)/`schedule-sessions.ts`(46)/`tree-expansion.ts`(31) 共 184 行，grep `color|px|font|shadow|radius|transition|animation|#hex|rgba|style` → **0 命中**，「无视觉设计决策点」论断维持。附带发现（不占名额）：ZCode 分组折叠态 `collapsedGroupIds` 为 React state **不持久化**（区域 328560000–328620000 内 localStorage/sessionStorage 调用 0 命中），与本仓 tree-expansion 的 localStorage 持久化（500 条/512 字符帽）**不同构**；且 ZCode 分组折叠/移动带 FLIP 动画（即条目 4 的 {150, bezier(0.2,0,0,1)}）——若将来对账 tree-expansion，对照物已在此。

---

## 汇总

| # | 条目 | 判定 | 关键证据 |
|---|---|---|---|
| 1 | --dcu-kbd-foreground | **found**（浅色逐字同） | kbd 组件 = `bg-tooltip-tag` + `text-tooltip-tag-foreground`（#5c5c5c/#adadad，@327149985）；muted-foreground 片段归属 MCP 桥（@285984494），映射 foreground-subtle |
| 2 | --dcu-tip-secondary/tertiary | **found**（次档）+ tertiary absent | description = `text-tooltip-foreground/80`（@327150395）；/60 仅 safelist 0 消费；三档结构确认无 |
| 3 | --dcu-sidebar-icon | **found**（惯例级） | 无专用令牌；图标惯例 = foreground-subtle 60%（71 处 size-N 组合 + 03i D1 活体 + shell 手柄 @332221073）；换算 ≈#868686/#888888 vs 本仓 #525252/#a3a3a3 |
| 4 | enter/exit 曲线 + press 90ms | **found**（enter 双值逐字同）+ exit/press absent | FLIP `{duration:150,easing:"cubic-bezier(0.2, 0, 0, 1)"}` @328579135；`.animate-in` 默认 `ease`；exit 曲线 0 命中；90ms 全为 pdf CMap 文件名 |
| 5 | ↑/↓ 草稿历史召回 | **found**（同构功能全链路） | `zcode-chat-prompt-history:<id>` 30 条帽（@329374681）；`registerCommand(KEY_ARROW_UP/DOWN,3)` 插件（@329348098）；$Wt 游标（@329336745）；↓ 越界恢复空草稿 |

**计数**：found = 5，absent = 0（条目 2 的 tertiary 档、条目 4 的 exit 曲线与 press 90ms 为条目内「实证无参照」半边，已在各条目内标明）。

**附带产出（供下轮对账引用）**：
- ZCode Kbd 完整规格：`<kbd data-slot="kbd">` = tooltip-tag 底（#e6e6e6/#363636）+ tooltip-tag-foreground 字（#5c5c5c/#adadad）+ h-4/rounded-md/px-1.5/text-ui-xs/font-medium；Mac 用系统字体 + tracking-normal，其余 font-mono；由 tooltip `Dv` 的 shortcut 槽消费。
- ZCode tooltip 文字三层制：tooltip-foreground（主）/ tooltip-foreground/80（描述）/ tooltip-tag-foreground（键帽）。
- `--color-foreground-subtle` zai-light 基色 #404040（旁证批次 8 D3：zai 浅色体系挂 neutral-700 侧）。
- ZCode 分组任务列表折叠/移动 = FLIP 150ms cubic-bezier(0.2,0,0,1)，折叠态不持久化。
- `zcode-chat-prompt-history:` 键不在 `zcode:` 前缀枚举覆盖内（前缀不同），后续搜存储键应同时枚举 `zcode-` 开头变体。
- 原 batch-8 的一条注释被证伪待更正：`zcode-theme.ts:64`「ZCode Kbd 组件用 text-muted-foreground」→ 实为 text-tooltip-tag-foreground（text-muted-foreground 本轮实测 68 处，均为泛用次要文字，无一在 kbd 上）。
