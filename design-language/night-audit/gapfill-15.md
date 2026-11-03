# gapfill-15 · 批次15 无参照项补采（composer-tool-menus / shortcut-catalog / foreign-content-contract）

> 2026-10-30 补采。对象：批次15「查不到 ZCode 参照而跳过」5 条。
> 方法：全部对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）实跑 `grep -a`（下文命令均本轮执行，`A=` 指 asar 全路径）；长上下文用 `grep -a -b -o -F`（或 `-E`）取字节偏移 + `dd skip=N count=M` 切片（`.{400}` 大窗口正则两次触发 ugrep 复杂度上限，均改用偏移+切片绕过）。静态 CSS 层复核用 10-28 构建缓存 `/tmp/zc-styles.css`（470KB，本轮确认存在后直接 grep）。
> uiplug 源码复核（只读，`Read` 全文）：composer-tool-menus.ts（15/104-107/112/124-128 行与批次记录一致）、foreign-content-contract.ts（L18-25 契约第 4 条、L21 rgb(255,152,0) 均在）、shortcut-catalog.ts（{id,keys,aria} @:14、catalog 桥 @:29-33）；zcode-theme.ts:58/81（--dcu-tip-shadow 现行值）。
>
> **总判定：found=5, absent=0。** 5 条全部从「无法提取/无实测」升级为「有参照」：条目 2 逐值一致（padding/阴影/圆角/行高全对上）；条目 1、3、4、5 为「有参照但机制或值不同」差异项。条目 4 的 {id,keys,aria} 目录桥与 aria-keyshortcuts 消费链、条目 5 的 #ff9800 本身仍确认无 UI 对应物（在正文分别注明）。注意：**有参照 ≠ 数值一致**，逐条判定见下。

---

## 条目1 · 菜单壳 z-index:1100（uiplug composer-tool-menus.ts:15）

**原跳过理由**：ZCode radix popper zIndex 为运行时变量（asar 命中 `zIndex:fe`），`.z-50` 仅 1 处，静态提不出值。

**搜索过的模式**（全部实跑）：
- `grep -a -b -o -E '.{600}window\.getComputedStyle\([a-zA-Z_$]+\)\.zIndex.{200}' $A` → 2 处全出（@319066084 PopperContent、@326681148 SelectContent，见下）
- `grep -a -o -E 'zIndex:.{0,40}' $A | sort | uniq -c | sort -rn | head -30` → 24×`zIndex: props.zIndex`、12×`zIndex: 7`、10×`zIndex: zIndex`、8×canvasHeaderOverlayZIndex 等，多为白板/绘图库内部
- `grep -o 'z-index:[0-9]*' /tmp/zc-styles.css | sort | uniq -c | sort -rn` → 9×1、6×10、2×50、1×60/61/40/30/9999/9998……
- `grep -o '\.z-50[^{]*{[^}]*}' /tmp/zc-styles.css` → 仅 `.z-50{z-index:50}` 1 条
- `grep -a -b -o -E '.{160}z-50.{160}' $A` → 9 处，全部为 tooltip/dialog/kbd/streamdown 全屏壳（@327148854 tooltip-content `z-50 … rounded-lg … bg-tooltip px-3 py-1.5`、@327196163 dialog-overlay、@327196582 dialog-content、@252748037 等 streamdown 弹层），**无一为菜单**
- 编译 CSS 菜单壳规则：`grep -o '[^{}]*data-radix-menu-content[^{}]*{[^}]*}' /tmp/zc-styles.css` → 0（壳样式不在静态 CSS，在组件类名）

**命中原文**：
1. Radix PopperContent（@319066084，SelectContent 同款 @326681148）——wrapper 的 zIndex **运行时继承锚点元素的 computed z-index**：
```js
let[fe,pe]=f.useState();return Kt(()=>{b&&pe(window.getComputedStyle(b).zIndex)},[b]),(0,p.jsx)(`div`,{ref:ae.setFloating,"data-radix-popper-content-wrapper":``,style:{...oe,transform:k?oe.transform:`translate(0, -200%)`,minWidth:`max-content`,zIndex:fe,...}})
```
   （floating 的 reference 即锚点：`elements:{reference:y.anchor}`，@319063300 区切片）
2. **应用层菜单壳有静态 z-index**——`dropdown-menu-content` 组件（@327198594）类名首段即 `z-[60]`：
```js
"data-slot":`dropdown-menu-content`,sideOffset:n,align:t,className:Z(`z-[60] flex flex-col gap-0.5 max-h-(--radix-dropdown-menu-content-available-height) … rounded-lg border border-popover-border bg-menu p-1 text-foreground !shadow-md …`,e)
```
   编译 CSS 实证：`.z-\[60\]{z-index:60}`（@325849924 切片确认）。

**最终判定：升级为有参照（found）。** ZCode 菜单 z-index 是**两层机制**：Radix wrapper 内联 zIndex 继承锚点 computed 值（运行时，无固定常量——原审计「运行时变量」判断正确，且现补齐了机制原文）；应用层壳本体有设计常量 **`z-[60]`**（tooltip/dialog 用 z-50，菜单整体高一档）。uiplug `z-index:1100` 是单层固定值，与 ZCode 机制不同、值不同 → 登记为**机制差异项**（原跳过理由中「.z-50 仅 1 处」已澄清：.z-50 属 tooltip/dialog/kbd 家族，菜单不走它）。

---

## 条目2 · 菜单壳 padding:4px 与投影 --dcu-tip-shadow（uiplug composer-tool-menus.ts:15）

**原跳过理由**：ZCode menu 壳内边距/阴影无实测记录（03b/03d/04 均未采）。

**搜索过的模式**（全部实跑）：
- `grep -a -o -E 'z-50 min-w-\[8rem\][^"]{0,120}' $A` / `'(rounded-md|rounded-lg) border bg-popover [^"]{0,100}'` / `'min-w-\[[0-9.]+rem\] overflow-hidden …'` → **0 命中**（ZCode 不是 shadcn 默认类名组合）
- `grep -a -b -o -E 'data-slot.:`dropdown-menu-content`.{1200}' $A` → 1 处全出（@327198594）
- `grep -a -o -E 'data-slot.:`dropdown-menu-[a-z-]+`' $A | sort | uniq -c` → 15 个 part 各 1 处（content/item/shortcut/label/checkbox-item/radio-item/sub*/separator/portal/trigger）
- `grep -o '\-\-shadow[a-zA-Z-]*:[^;]{0,120}' /tmp/zc-styles.css | sort | uniq -c` → 仅 tailwind 三档：`--shadow-md:0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`（另 sm/lg）
- uiplug 侧：`grep -rn -- '--dcu-tip-shadow' uiplug/src/client/zcode-theme.ts | grep -v 'var('` → :58/:81

**命中原文**：
1. `dropdown-menu-content` 壳（@327198594）：`rounded-lg border border-popover-border bg-menu p-1 text-foreground !shadow-md focus:!shadow-md focus-visible:!shadow-md … gap-0.5`（全串见条目1）。
   映射实证（编译 CSS + `--spacing:.25rem`）：`.p-1{padding:calc(var(--spacing)*1)}`=**4px**、`.gap-0\.5{gap:calc(var(--spacing)*.5)}`=**2px**、`.bg-menu{background-color:var(--color-menu)}`、`rounded-lg`=`var(--radius-lg)`=**.5rem**。
2. `dropdown-menu-item`（@327198594 同串后半）：`min-h-7 … px-2 py-1 … gap-2 rounded-md` → **28px / 8px 4px / 8px / 6px**。
3. uiplug 现行令牌（zcode-theme.ts:58 亮 / :81 暗）：`--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)`——与 tailwind `--shadow-md` 的 `#0000001a`（=rgba(0,0,0,.1)）**逐位同值**（.bak 文件显示旧值曾是 `0 8px 24px`，现行已对齐）。

**逐值对照**：uiplug 壳 `padding:4px` ↔ ZCode `p-1`=4px ✓；`gap:2px` ↔ `gap-0.5`=2px ✓；`border-radius:var(--dsw-radius-lg)`=8px ↔ `rounded-lg`=.5rem=8px ✓；`box-shadow:var(--dcu-tip-shadow)` ↔ `!shadow-md`（值同）✓；行项 `min-height:28px;padding:4px 8px;gap:8px;radius:md` ↔ `min-h-7 px-2 py-1 gap-2 rounded-md` ✓。

**最终判定：升级为有参照且一致（found）。** 03b/03d/04 缺的「菜单壳实测」由组件类名层补齐：ZCode 下拉菜单壳 = `p-1 + rounded-lg + bg-menu + shadow-md + gap-0.5`，与 uiplug composer-tool-menus.ts:15 现行令牌**全值一致**。03k-context-menu.md 可凭此补一行壳实测（本轮只写报告不改文档）。

---

## 条目3 · 建议面板 [data-trigger-menu] 定位几何：视口边距 12px、上下 16px、max-height 360px（uiplug composer-tool-menus.ts:104-107,112,124-128）

**原跳过理由**：ZCode @ 建议弹层未采样（03d:33 D-i「@/技能菜单弹层 未采到」）。

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '(data-trigger-menu|trigger-menu|triggerMenu)' $A` → **0 命中**（`data-trigger-menu` 是 DSH 自有属性）
- `grep -a -o -E '[a-zA-Z]*[Mm]ention[a-zA-Z]*' $A | sort | uniq -c | sort -rn | head -20` → mention×165、mentionedBot×48、channelMention×24、`enableMentionPanel`×4 等
- `grep -a -o -E '(TypeaheadMenuPlugin|LexicalTypeaheadMenuPlugin|LexicalMenu|useDynamicPositioning)' $A | sort | uniq -c` → LexicalTypeaheadMenuPlugin×50、LexicalMenu×8、useDynamicPositioning×17
- `grep -a -b -o -F 'LexicalTypeaheadMenuPlugin' $A | tail -8` → 全部 ≤53M（库区）；改从 mention 节点侧入：`grep -a -b -o -E '.{200}prompt-mention.{200}' $A` → 定位到 `prompt-mention` Lexical 节点模块（@329249823-329251406）
- `grep -a -b -o -E 'role:`listbox`' $A` → 5 处，@329307366 紧邻 mention 模块
- `grep -a -b -o -E 'cLe=`[^`]{0,80}`' $A` → **@327223913：`cLe=`prompt-suggestion-panel``**
- `grep -a -b -o -E 'qK,\{title' $A` → 3 个调用点：@329316713（trigger:`/`）、@329336123（@ 弹层本体）、@329358798（`+` 动作弹层）
- `grep -a -b -o -E '.{220}listMaxHeight.{120}' $A` → 2 处（组件定义 + `+` 调用点）

**命中原文**：
1. 弹层组件 `qK`（@329305623 起，虚拟化 listbox）：壳与列表区
```js
(0,$.jsxs)(`div`,{className:`mb-1 overflow-hidden rounded-2xl border border-border bg-menu shadow-xs`,"data-testid":cLe,"data-trigger":l,children:[…(0,$.jsx)(`div`,{ref:u,className:`max-h-56 overflow-y-auto px-1 py-0.75`,role:`listbox`,…,style:{...y,...r?{maxHeight:r}:{}}…
```
   实测值：壳 `rounded-2xl`(16px)+`border`+`bg-menu`+`shadow-xs`(0 1px 2px 0 #0000000d)+`mb-1`(4px)；列表默认 `max-h-56`=**224px**（`--spacing:.25rem` 实证）、`px-1 py-0.75`（4px/3px）；行高虚拟估算 option=34px / header=34 / status=40（`eWt=34,tWt=40` @329304700 区切片）。
2. **@ 弹层本体**（@329335400 区切片）——Lexical typeahead **createPortal** 渲染，未传 listMaxHeight：
```js
return!x||!i?null:(0,Tf.createPortal)((0,$.jsx)(qK,{title:I,description:L,trigger:u?.trigger??`@`,sections:N,emptyText:R,selectedIndex:f,hasActiveQuery:y,onSelect:F}),i)
```
   → @ 菜单高度上限回落 `max-h-56`=**224px**。`/` 斜杠菜单同组件（@329316713 `trigger:`/``）。
3. `+` 动作弹层（@329358605）——Radix Popover 全宽贴触发器，**max-height 用 Radix 可用高度公式**：
```js
(0,$.jsx)(Ta,{ref:y,align:`start`,side:`top`,sideOffset:0,className:`w-(--radix-popover-trigger-width) max-w-[calc(100vw-1rem)] gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none`,…,children:(0,$.jsx)(qK,{title:e,description:``,listMaxHeight:`min(24rem, max(8rem, calc(var(--radix-popover-content-available-height, 32rem) - 6rem)))`,…
```
   → 外层透明无壳（p-0/shadow-none/border-0）、宽=触发器宽、`max-w-[calc(100vw-1rem)]`=**视口留 16px**；高度= `min(384px, max(128px, available−96px))`。

**与 uiplug 对照**：max-height 上限 uiplug 360px ↔ ZCode @ /` 菜单 224px、`+` 弹层公式上限 384px（**不同**）；视口水平边距 uiplug 12px ↔ ZCode `100vw-1rem`=16px（**不同**）；上下预留 uiplug 固定 16px（`rect.top-16` / `innerHeight-rect.bottom-16`）↔ ZCode `available-height − 6rem`（Radix 碰撞检测动态值，**机制不同**）；壳 uiplug `padding:4px + radius lg(8px) + tip-bg + tip-shadow` ↔ ZCode `rounded-2xl(16px) + bg-menu + shadow-xs`、列表区才 4px（**不同**，且 ZCode @ 壳圆角是 2xl——uiplug 宪章「建议菜单不继承 2xl 例外」按 ZCode 实测其实 @ 弹层正是 2xl，差异点成立但要注明 ZCode 实态）。

**最终判定：升级为有参照（found）——差异项。** 03d D-i 可销账：ZCode @ 弹层载体 = `prompt-suggestion-panel`（Lexical typeahead portal + 虚拟化 listbox），几何是「触发器宽 + caret 定位 + max-h 224px（@/`）/动态公式（+）」，与 uiplug 的「视口边距 12/16px + 360px 上限」是两套定位哲学，不可直接换算。

---

## 条目4 · shortcut-catalog.ts 键帽串格式（{id, keys, aria} 消费 aria-keyshortcuts）

**原跳过理由**：asar 中 aria-keyshortcuts 仅命中 React 属性枚举（9 处）、⌘ 11 处，无格式规格；03i-command-palette.md 无 shortcut 条目。

**搜索过的模式**（全部实跑）：
- `grep -a -b -o -F '⌘' $A | head -20` → 11 处：@106532000×5（库区聚集）、@313654542、@327983189、@329078364、@330064110/124/135
- `grep -a -b -o -F 'aria-keyshortcuts' $A` → 9 处，逐切片分类：@35916400/@39073832（React DOM 属性枚举）、@323546045（电子表格 grid aria：`"aria-keyshortcuts":"ArrowUp ArrowDown ArrowLeft ArrowRight Home End PageUp PageDown Control+Home Control+End"`）、其余为库内 aria 字符串——**菜单层零消费**（与原判一致）
- `grep -a -o -E '(shortcuts\.catalog|formatShortcut|prettyShortcut|displayKey|keybinding|KeyBinding|keybindingLabel)' $A | sort | uniq -c` → keybinding×103、keybindingLabel×155（VS Code/Monaco 键位标签组件，编辑器域）
- `grep -a -o -E 'data-slot.:`dropdown-menu-[a-z-]+`' $A` → 有 `dropdown-menu-shortcut`
- ⌘ 聚集区切片：`dd skip=330063700 count=900`、`dd skip=329078100 count=560`

**命中原文**：
1. **键帽格式化函数**（@330063700，automation key/hold_key 步骤显示用）：
```js
var h3t={cmd:`⌘`,command:`⌘`,meta:`⌘`,shift:`⇧`,alt:`⌥`,option:`⌥`,ctrl:`⌃`,control:`⌃`};
function g3t(e){let t=e.split(`+`).map(e=>e.trim()).filter(Boolean);return t.length===0?e:t.map(e=>h3t[e.toLowerCase()]??e.toUpperCase()).join(``)}
```
   规格：`+` 分隔拆分 → 修饰键映射 Mac 字形 → 未知键转大写 → **无分隔符拼接**（`meta+shift+p`→`⌘⇧P`）。
2. **菜单快捷键槽位**（@327202491）+ 活体消费（titleBar 菜单 @328828748/328828930/328829117，Zoom In/Out/ActualSize 均渲染 `<Wy>{快捷键串}</Wy>`）：
```js
function Wy({className:e,...t}){return(0,$.jsx)(`span`,{"data-slot":`dropdown-menu-shortcut`,className:Z(`ml-auto text-ui-xs tracking-widest text-foreground-subtlest group-data-[highlighted]/dropdown-menu-item:text-foreground-subtle`,e),...t})}
```
3. **键帽组件 kbd**（@327149933，tooltip 内消费）：`<kbd data-slot="kbd" className="rounded-md h-4 … bg-tooltip-tag px-1.5 text-ui-xs font-medium …">`，Mac 用 SF Pro（`-apple-system…`）+tracking-normal，否则 font-mono。
4. 平台分支字面量（@329078364）：`shortcut: i?`⌘ + Enter`:`Ctrl + Enter``（followup 发送提示）。

**最终判定：部分升级为有参照（found）。** 「键帽串格式」原有 4 个 ZCode 载体：g3t/h3t 格式化器（⌘⇧⌥⌃ 映射、无分隔拼接）、`dropdown-menu-shortcut` 槽位（`ml-auto text-ui-xs tracking-widest`，titleBar 菜单活体在用）、`kbd` 键帽组件（SF Pro 字体规格）、`⌘ + Enter` 类平台字面量——**ZCode 的键帽显示是「逐组件就地格式化」，没有统一目录服务**。仍确认无对应物：① `{id,keys,aria}` 目录桥（那是 DSH 宿主 `ctx.shortcuts.catalog` 的形状，ZCode React 层无 catalog 服务，keybindingLabel×155 属 Monaco 编辑器域）；② 菜单项 `aria-keyshortcuts` 消费（9 处命中均为枚举/库 aria，无一处是菜单）。03i 若要补条目，可登记 g3t 规格 + dropdown-menu-shortcut 槽位。

---

## 条目5 · foreign-content-contract.ts 峰值条语义橙 rgb(255,152,0) 作为「唯一语义色」保留

**原跳过理由**：asar #ff9800 45 处全部位于代码语法高亮色板（symbolIcon/TextMate scope），非 UI 语义色；保留是本仓显式裁决（源码 L18-25），无 ZCode UI 例证，不判一致也不判差异。

**搜索过的模式**（全部实跑）：
- `grep -a -o -i -c '#ff9800' $A` → **45 处**（大小写不敏感计数，与批次记录一致）
- `grep -a -o -i 'rgb(255,152,0\|255,152,0' $A` → **0 命中**（rgb 形式 asar 无）
- `grep -a -b -o -i '#ff9800' $A | awk -F: '{print $1}'` → 45 个偏移，**逐个 `dd ±100` 切片分类**：
  - theme-json（TextMate scope `"scope":"variable.parameter.function"` / `"symbolIcon.classForeground":"#FF9800"` 等）：**17 处**（@92746267-92756651、@315285505-315307993 区）
  - hljs 语法 CSS（`.hljs-number,.hljs-link,…{color:#ff9800}`）：3 处（@143073481、@144075131、@144077267）
  - base09 色板文档串（`base09 #ff9800 Integers, Boolean, Constants…`）：2 处（@143071882、@144073532）
  - SVG 文件类型图标填色（`<svg…><path fill="#ff9800" …>`）：**23 处**（@338188609-339042394 区）
  - UI 语义层（CSS 变量、组件类、内联样式）：**0 处**
  - 注：原判「45 处全部位于语法高亮色板」需精化——其中 23 处实为 SVG 图标 artwork、3 处是 highlight.js CSS，但结论不变：无一在 UI 语义色层
- `grep -a -o -E '\-\-color-[a-z-]*(warning|orange|amber)[a-z-]*' $A | sort | uniq -c | head` → `--color-warning` 族 + `--color-amber-`/`--color-orange-`/`--color-scale-orange-` 色阶
- `grep -a -o -E '\-\-color-warning:[^;]{0,40}' $A | sort | uniq -c` → 4 个定义
- `grep -a -b -o -E '.{120}--color-warning:#e07b00.{60}' $A` → @326246365 主题定义上下文
- `grep -a -o -E '(bg|text|border)-warning[a-z-]*' $A | sort | uniq -c | head` → 消费面统计

**命中原文**：
1. ZCode **有 UI 语义橙**——warning 族：`--color-warning:#e07b00`（亮主题，@326246365，同段 `--color-destructive:#e03131`）、`--color-warning:#ff8a30`（暗主题）、另两处 `var(--color-yellow-500/600)` 变体；配套 `--color-background-warning`/`--color-border-warning`/`--color-ring-warning`（各 21 处主题定义）。消费面：`text-warning`×140、`bg-warning`×54、`border-warning`×63（JS 工具类串）。
2. #ff9800 与上述值均不同；asar 无 `rgb(255,152,0)` 形式。

**最终判定：升级为有参照（found）——差异项。** 「无 ZCode UI 例证」的前提不再成立：ZCode 的 UI 语义橙是 **--color-warning（#e07b00/#ff8a30）**，语义角色是「警告态」，且重度消费。uiplug 保留的 rgb(255,152,0)（dsh-cost-meter 峰值条实测色，foreign-content-contract.ts:21）与它**不同值、不同角色**（峰值数据态 vs 警告态），#ff9800 本身确认只在语法高亮/图标 artwork 域。裁决建议：本仓「唯一语义色保留」条款可对照 --color-warning 登记为「ZCode 有同类别（语义橙）但值与角色不同」的差异项；若未来峰值条要向宿主靠拢，唯一候选是 --color-warning 族（是否替换属裁决，不在本轮）。

---

## 复核清单（本轮实跑命令汇总）

| # | 命令（`A=` asar，`CSS=`/tmp/zc-styles.css） | 结论 |
|---|---|---|
| 1 | `grep -a -b -o -E '.{600}window\.getComputedStyle\([a-zA-Z_$]+\)\.zIndex.{200}' $A` | Popper/Select zIndex 继承锚点 |
| 2 | `grep -a -b -o -E 'data-slot.:`dropdown-menu-content`.{1200}' $A` | 壳类名全串（z-[60]/p-1/shadow-md） |
| 3 | `grep -o` 系列 on CSS（z-index/p-1/gap-0.5/min-h-7/max-h-56/radius/shadow-xs/bg-menu/--spacing） | 工具类→px 映射 |
| 4 | `grep -a -b -o -E 'cLe=`[^`]{0,80}`' $A`；`grep -a -b -o -E 'qK,\{title' $A`；`grep -a -b -o -E '.{220}listMaxHeight.{120}' $A` | prompt-suggestion-panel 三调用点 |
| 5 | `grep -a -b -o -F '⌘' $A`；`grep -a -b -o -F 'aria-keyshortcuts' $A`；45 偏移 `dd ±100` 逐分类 | 键帽格式 + #ff9800 全分类 |
| 6 | `grep -a -o -E '\-\-color-warning:[^;]{0,40}' $A`；`grep -a -o -E '(bg|text|border)-warning[a-z-]*' $A \| sort \| uniq -c` | warning 族定义与消费 |
| 7 | `grep -n` uiplug zcode-theme.ts:58/81、foreign-content-contract.ts L18-25、composer-tool-menus.ts | 源码值复核 |

**未做**：CDP 活体采样（菜单实际渲染的 computed z-index/阴影无法静态旁证的部分沿用静态结论）；03d/03k/03i 文档本体未改动（铁律：本轮只产出 gapfill-15.md）。
