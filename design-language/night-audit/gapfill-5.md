# 补采 5 · batch-5 无参照项二次挖掘（zcode-tokens.ts / workspace-shortcuts.ts / official-slot-shadow.ts）

> 本轮新增证据源（batch-5 未用到的三个）：
> ① **ZCode 活页 CDP**（9224，只读探针：CSSOM 全表扫描 / DOM 计算色扫描 / composer 按钮与模型菜单实测；菜单探针用真鼠标事件打开、Esc 关闭，探后 `role=menu` 存在性复检 false，状态已恢复）；
> ② **DSH 宿主活页 CDP**（9223，只读：宿主原始令牌定义层 vs 插件 `:root:root` 覆盖层同页对照）；
> ③ **DSH 官方 app.asar**（`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`，182MB——官方插件代码**未混淆**，保留命名与注释，python mmap 精确提取）。
>
> 命令形态：`grep -a -o -c '<pat>' /Applications/ZCode.app/Contents/Resources/app.asar`、
> `python3 mmap.find(b'<pat>')`（上下文提取）、
> `node` CDP 探针（脚本存 /tmp/gapfill5-*.mjs，运行后未留存于仓内）。
>
> 结论概览：batch-5 的 5 条无参照项按「无参照声明」拆成 **7 个声明**：**6 个升级为有参照，1 个确认无对应物**（menu-group-header-fill）。
> 其中 4 条的「ZCode 值」此前是缺的，本轮全部补上原文。

---

## 条目 1 · zcode-tokens.ts:138-140 工具栏填充 rgba(84,85,87,0.5)/rgba(31,31,31,0.36)/hover 0.6 —— **升级：有参照（且查明了真实来源）**

**搜索过的模式**（ZCode asar，全部 0 命中除注明外）：
`84,85,87`、`84, 85, 87`、`545557`、`54555780`、`5455577f`、`31, 31, 31, 0.36`、`31,31,31,.36`、`1f1f1f5c`、`1f1f1f5b`、`tool-bar-fill`（0）、`tool-bar`（66 命中——抽样全部为内嵌 Emacs lisp 符号表 `auto-raise-tool-bar-buttons|tool-bar-add-item|...`，与按钮样式无关）。
活页：ZCode CSSOM 全表正则 `/84,\s*85,\s*87|545557/i` 扫每条规则 → 0；DOM 6796 元素计算色扫描（rgb 各通道 ±6 容差）→ `near848587: []`。

**命中原文（三处新证据）**：
1. **宿主原值层**（DSH 9223 CSSOM，inline 宿主样式表 `body` / `body[data-ds-dark-theme]` 规则）：
   `--dsw-alias-button-tool-bar-fill: #54555780`、`--dsw-alias-button-tool-bar-fill-invisible: #1f1f1f5c`、`--dsw-alias-button-tool-bar-hover: #54555799`——**双主题同值**。插件 zcode-tokens.ts 的 `rgba(84, 85, 87, 0.5)`/`rgba(31, 31, 31, 0.36)`/`rgba(84, 85, 87, 0.6)` 就是这三个宿主 hex 的 rgba 重述（:root:root 层，活页实读逐值核对）。**即这三值是宿主继承，不是 ZCode 派生**。
2. **ZCode 真实角色**（9224 活体，composer「切换模式」按钮完整类名）：
   `group/button ... hover:bg-hover aria-expanded:bg-hover ... rounded-lg h-7 px-2`，计算底色静息 `rgba(0, 0, 0, 0)`、圆角 8px；CSSOM 对应规则 `background-color: var(--color-hover)`；`--color-hover` 活页 dark `#ffffff0d`（白 5%），batch-5 已证 light 为 `#0d0d0d0d`（黑 5%，hex 套）。
3. ZCode 无 `#545557` 任何形态存在（asar 文本 + CSSOM + DOM 三重验证均为 0）。

**最终判定**：**有参照**。ZCode composer 工具条按钮的语言是「静息全透明 + hover/展开 `--color-hover` 5%」，与本模块三值（0.5/0.36/0.6 的实灰）无同源关系。若按 ZCode 对齐：invisible→透明、fill/hover→`--color-hover`；若保留宿主原值，应在注释声明「宿主继承，非 ZCode」。

---

## 条目 2 · zcode-tokens.ts:563-564 自绘滚动条（8px/0.15/0.25/2px）—— **升级：有参照（ZCode 滚动条规格全文采到）**

**搜索过的模式**：asar `::-webkit-scrollbar{width`、`scrollbar-color:`、`::-webkit-scrollbar-thumb{`（各若干命中，见下）；活页 CSSOM `/scrollbar/i` 全表扫描（含 `display:none`×4、`thin`×2、`auto`×1 等批5已知项）；`--dsh-scrollbar-width` 本仓 src 消费点复核（`grep -rn` 仅 zcode-tokens.ts:563 定义，无其他消费——维持）；另在 **DSH 官方 asar** 搜 `var(--dsh-scrollbar-width`（4 命中）/`var(--dsh-scrollbar-thumb-border`（1 命中）/`--dsh-scrollbar-width:`（5 命中）。

**命中原文**（ZCode asar，全局默认规则块；活页 CSSOM 同文核对一致）：
```css
*{scrollbar-width:auto;scrollbar-color:var(--color-border) transparent}
::-webkit-scrollbar{width:14px;height:14px}
::-webkit-scrollbar-track{background:0 0}
::-webkit-scrollbar-thumb{background:var(--color-border);background-clip:padding-box;border:3px solid #0000;border-radius:9999px;min-width:32px;min-height:32px}
::-webkit-scrollbar-corner{background:0 0}
```
代码/diff 区变体（批5「代码区 thumb 透明轨道+3px 圆角」即此，系 `[data-code]` 专属而非全局）：`[data-code]{scrollbar-width:thin;scrollbar-color:var(--diffs-bg-context) transparent}`、`[data-code]::-webkit-scrollbar{width:0;height:var(--diffs-scrollbar-gutter)}`、`[data-code]::-webkit-scrollbar-thumb{background-color:#0000;background-clip:content-box;border:1px solid #0000;border-radius:3px}`。
活页变量现值：dark `--color-border: #ffffff1a`（白 10%）；batch-5 已证 hex 套 light `#0d0d0d1a`（黑 10%）。
**ZCode 全局无 `::-webkit-scrollbar-thumb:hover` 规则**（CSSOM 全表扫描仅见 scrollbar-hide/display:none 类）——thumb hover 不变色。

**宿主消费链**（推翻「无消费点=双跳过」的一半）：DSH 官方 asar 原文：
`--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l1);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l1);--dsh-scrollbar-thumb-border:0px;--dsh-scrollbar-track-margin:0px;--dsh-scrollbar-width:5px`（body 默认）；弹层覆盖 `6px/2px 边/track-margin 12px`（offset 25761594）、页面滚动 `9px/2px`（27286448 等三处）；消费规则 `::-webkit-scrollbar{width:var(--dsh-scrollbar-width)...}::-webkit-scrollbar-thumb{border:var(--dsh-scrollbar-thumb-border) solid transparent;corner-shape:round;background:var(--dsh-scrollbar-thumb);background-clip:content-box;border-radius:999px}::-webkit-scrollbar-thumb:hover{background-color:var(--dsh-scrollbar-thumb-hover)}`；另有 composer 座位让位 `.ST7X_W_composerSeat{right:var(--dsh-scrollbar-width)}`（25143451）。**插件的 scrollbar 四令牌经宿主机制直通视觉，数值有效。**

**最终判定**：**有参照，且数值错配**。① 几何：ZCode 总宽 14px + thumb 3px 透明边 ⇒ **可见 thumb 厚 8px**——模块 `--dsh-scrollbar-width:8px` 若取「ZCode 可见厚度」口径，在宿主机制（width−2×border）下实际可见 8−4=4px，只有 ZCode 一半；对齐应 `width:14px + thumb-border:3px`。② 颜色：ZCode thumb=`--color-border`（10% 黑/白），插件 0.15 偏重一档。③ hover：ZCode 无 hover 变化，插件 hover 0.25 无 ZCode 对应（宿主 hover 槽会照常消费它，形成 ZCode 没有的 hover 效果）。④ `2px` thumb-border 与 ZCode `3px` 差 1px。建议按 ZCode 全套（14/3/10%/无 hover 变化）或注明近似口径。

---

## 条目 3 · 遮罩家族 / skeleton / menu-group-header-fill —— **2 升级 + 1 确认无对应物**

**搜索过的模式**：asar `rgba(0, 0, 0, 0.24)`/`rgba(13, 13, 13, 0.04)`/`rgba(248, 248, 248, 0.94)`（批5已 0）；本轮追加 `f8f8f8f0`、`202020f0`、`248, 248, 248, 0.94`、`248,248,248,.94`、`32, 32, 32, 0.94`、`32,32,32,.94`（全 0）；`skeleton`（171）/`Skeleton`（20，上下文抽样均为自动化模板卡与 Emacs 符号表）；`bg-black\/[0-9]*{`（CSS 类定义族）、未转义 `bg-black/85|75|60|55|45|40`（JS 用法计数）、`sticky top-0`（7 变体）、`data-slot` label/group 系列（0）、`--color-surface:`（5 变体）、`--color-black:`/`--color-white:`；活页 CSSOM `/skeleton/i`（0）、alpha `.94)`（0）、DOM alpha088 扫描（仅 browser-use 滤镜）。

### 3a 遮罩家族 —— **升级：有参照**
命中原文（ZCode asar，JSX 组件层）：
- `data-slot:\`dialog-overlay\``,className:\`fixed inset-0 isolate z-50 **bg-black/60** duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in ...\``（dialog 与 alert-dialog 两处同款）
- gen-ui 背板：\`fixed inset-0 z-40 bg-black/60\`（`data-testid:gen-ui-backdrop`）
- 同族其他用途：视频播放钮 `bg-black/55`、视频 hover `bg-black/85`、prompt 胶囊 `bg-black/75`
- CSS 定义：`.bg-black\/60{background-color:#0009}` / color-mix 套 `color-mix(in oklab, var(--color-black) 60%, transparent)`；`--color-black:#000`（asar 唯一定义）
- DSH 宿主原值层（9223 活页）：mask-1 `#0000003d`(24%)/`#00000080`(50%)、mask-2 `#0000001f`/`#0003`、mask-3 `#0000007a`(48%)、mask-photo `#000000e0`(88%)、mask-drop `#ffffffb3`/`#272730b3`——**插件值=宿主同 alpha 阶梯 + 基色 #000→#0d0d0d 重基**。

**判定**：**有参照**。ZCode 弹层遮罩 = **单一 `rgba(0,0,0,0.6)`（纯黑）+ backdrop-blur 4px**，无三档阶梯（0.24/0.12/0.48）、无按主题分档。插件 mask 家族系宿主阶梯的 ZCode 中性重基，与 ZCode 自身的遮罩语言不同源。对齐则 mask-1→0.6 纯黑+blur；photo/drop 子角色在 ZCode 未见一一对应（视频/图片浮层用 /55、/85）。

### 3b skeleton —— **升级：有参照**
命中原文（ZCode asar 组件层，skeleton 无令牌、是组件模式）：
- 骨架卡：\`motion-safe:animate-pulse flex min-h-[114px] flex-col gap-2 rounded-xl border border-card-border bg-background p-3\` + 内部占位 \`size-5 shrink-0 rounded-md **bg-surface**\`
- 加载条：\`h-4 w-40 motion-safe:animate-pulse rounded **bg-surface**\`（side-pane-ui-loading）
- `--color-surface` asar：light `color-mix(in oklab, var(--color-neutral-950) 3%, transparent)`（≈#0d0d0d08）、dark `color-mix(in oklab, var(--color-white) 5%, transparent)`（≈#ffffff0d，活页实读 `#ffffff0d`）；`--animate-pulse:pulse 2s cubic-bezier(.4, 0, .6, 1) infinite`
- DSH 宿主原值：skeleton `#0000000a`(~4%)/`#ffffff14`(8%)——插件 0.04/0.08 为宿主同 alpha 重基。

**判定**：**有参照**。ZCode 骨架填充角色 = `--color-surface`（3%/5%），插件 4%/8% 偏重一档偏多；动画语言（pulse）两侧同构。对齐则 0.04/0.08→0.03/0.05（与本模块 `--dsw-specific-bubble` 已采用的 surface 值恰好同源）。

### 3c menu-group-header-fill —— **确认无 ZCode 对应物**
搜索过的模式（本条专项）：asar `f8f8f8f0`/`202020f0`/四种 `.94` 写法（全 0）；活页 CSSOM alpha `.94)`（0 命中）；`sticky top-0` 全部 7 个变体逐一归属（表格头 `bg-popover`、侧栏分区钮 `bg-background`、轨迹摘要 `bg-surface/90+blur-sm`——均非菜单组头）；`data-slot`:`*label*`/`*group*`（0）；cmdk 组头两个变体。
**命中原文**（9224 活页真鼠标打开模型菜单实测，探后已恢复）——组头「模型」：\`px-2 py-1.5 font-medium data-inset:pl-7.5 text-ui-sm text-foreground-subtle\`，计算 `background-color: rgba(0, 0, 0, 0)`、`position: static`、无 backdrop-filter。cmdk 面板组头（asar）：\`**:[[cmdk-group-heading]]:px-2 **:py-2 **:text-ui-base **:font-medium **:text-foreground-subtle\` 及 px-2.5/py-1.5 变体——**均无背景色**。
**判定**：**确认无对应物**。ZCode 的菜单/面板组头是「无填充、不吸顶的静态小标签」，不存在 0.94 半透明吸顶填充这一形态；DSH 该令牌（宿主原值 `#f8f9faf0`/`#303136f0`，插件重基 `rgba(248,248,248,0.94)`/`rgba(32,32,32,0.94)`）在 ZCode 无视觉角色可映射。保留插件值即可，但注释不应暗示其为 ZCode 值。

---

## 条目 4 · zcode-tokens.ts:77,310 文档选区色 rgba(11,127,255,0.4)/rgba(64,153,255,0.4) —— **升级：有参照（selection 家族全谱补齐）**

**搜索过的模式**：asar `rgba(11, 127, 255`（批5，0）→ 本轮 `rgba(11,127,255`（无空格，**1 命中**）、`rgba(64,153,255`（1）、`0b7fff66`/`4099ff66`（0）、`::selection`（1095，上下文抽样全为内嵌 hljs 主题/CodeMirror/xterm 无障碍树规则）、`--color-terminal-selection` 全家族（11 变体）、`terminal-selection`（22）；活页 CSSOM `::selection` 规则扫描 + 关键变量现值实读。
**命中原文**：
- 无空格两命中均为 **hero 装饰渐变**非选区：`before:bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.9),...,rgba(11,127,255,0.2),...)]`、dark 同位 `rgba(64,153,255,0.18)`。
- `--color-terminal-selection` 全谱（asar，按套）：hex 套 `#0b7fff38`(22%)/`#4099ff47`(28%)；第三套 `#00a5ef42`/`#00a5ef52`+inactive `#00a5ef38`；oklch 套 `color-mix(in oklab, var(--color-sky-500) 32%, transparent)`（light）/`26%`（dark），inactive `22%`/`16%`+`oklab(98.5% 0 0/.16)`+`#0d0d0d1a`/`#ffffff1a`；xterm 兜底 `rgba(125, 125, 125, 0.3)`/`rgba(125, 125, 125, 0.2)`（selectionBackground/Inactive 回退串，asar 原文）。
- 活页（dark）：`--color-terminal-selection: #4099ff47`、`-inactive: #ffffff1a`（实读）。
- DSH 宿主原值（9223）：`--dsw-alias-bg-document-selection: color-mix(in srgb, var(--dsw-static-blue-500) 40%, transparent)`（light/dark 同式）——插件两值=宿主 40% alpha + ZCode terminal-blue 基色（#0b7fff/#4099ff）重基。

**最终判定**：**有参照（角色最近似）**。ZCode 的选区令牌家族与插件同色相（#0b7fff/#4099ff hex 套），alpha 为 **22%/28%**（hex 套）或 **32%/26%**（oklch 套 sky-500）；插件 40% 约为 ZCode 的 1.4–1.8 倍浓度。批5 的「22%/28%」仅是 hex 套 dark 侧口径，本轮补齐全谱。是否把 40% 降到 28%/32% 属设计裁决（「文档选区」在 ZCode 无同名角色，terminal-selection 是唯一同族令牌；src 消费点为零、改动无回归面）。

---

## 条目 5 · workspace-shortcuts.ts / official-slot-shadow.ts 行为决策 —— **升级：有参照（官方实现完整锚定，推翻「无稳定锚点」）**

**搜索过的模式**：ZCode asar `sidebar.workspaces`/`workspaceShortcuts`/`closeAddWorkspace`/`setDirectoryBusy`/`addRequested`（**全 0**——ZCode 侧无对应物，符合预期：这些是 DSH 插件生态契约）；DSH 活页 `document.scripts` 仅 2 个初始脚本（921KB vite 加载器 + 46KB client-modules），锚点均 0；DSH 官方 **app.asar** python mmap：六锚点全中（`sidebar.workspaces`×83、`workspaceShortcuts`×1、`closeAddWorkspace`×6、`setDirectoryBusy`×3、`addRequested`×4、`searchRequest`×7），`locale: "workspace"`×2、`NS = "workspace"`×1、`slots.inject` 抛错契约×2。

**命中原文**（DSH app.asar，官方代码未混淆，含注释；括号为字节偏移）：
1. 官方状态核（49116381）：`function createWorkspaceShortcutControls() { const state = createSnapshotStore({ searchRequest: 0, addRequested: false, directoryBusy: false, renameTarget: null }); return { state, search: () => { state.set({...state.getSnapshot(), searchRequest: state.getSnapshot().searchRequest + 1}) }, add: () => { state.set(state.getSnapshot().directoryBusy ? state.getSnapshot() : {...addRequested: true}) }, closeAdd: ... } }` —— **searchRequest 是单调计数器**，add 有 directoryBusy 闸。
2. 官方消费端（49283631）：`useEffect(() => { if (shortcutState.searchRequest === 0) return; closeAddWorkspace(); setSearchExpanded(true); ... }, [shortcutState.searchRequest])` —— **0 值即 no-op**；非零历史值会被当成新请求——插件 `lastSearch = 初始快照`（workspace-shortcuts.ts:51）的「历史请求不回放」正是对这套语义的正确防御。
3. 官方注入面（49343675）：`closeAddWorkspace: shortcutControls.closeAdd, setDirectoryBusy: shortcutControls.directoryBusy, hooks: { directoryFlow: browserFlowSource, hostInfo, workspaceShortcuts: shortcutControls.state, shortcuts: ctx.shortcuts.catalog }` + `pickerInjected` 的 `createWorkspace: (input) => workspaces.create(input)` —— 与插件 `hasBindings`（workspace-shortcuts.ts:18-24）逐字段对上。
4. `locale==='workspace'` 识别（49335935）：官方插件头注释下 `/** Dictionary namespace owned by this plugin. */ const NS = "workspace";`，官方槽注册一律携带 `locale: NS`（49343937 起整块：`ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({ name: "sidebar.workspaces", children: {五个子槽}, store: viewStore, inject: browserInjected, locale: NS }, WorkspaceBrowser))`）——插件用 `row.locale === 'workspace'` 辨认官方条目即命中此命名空间。
5. official-slot-shadow 的「官方注册抛出且不重试」前提（27119440，官方嵌入的契约文档）：`inject(key, callback) ... @throws callback setup failures synchronously when the slot is already declared.` —— **同轮重复声明子插槽会同步抛错**。3000ms 有界超时是插件自设防线（注释已自述），官方侧无对应超时值可参照，亦无需参照。

**最终判定**：**有参照**。三个行为决策全部在官方实现中找到一一对应的锚点（非 minified 混淆体，语义与插件注释完全一致），建议在两文件头注释补锚点出处（`DeepSeek Harness.app/Contents/Resources/app.asar` 内 `@deepseek-ai/dsh-*` 工作区插件源码 + 偏移号），供后人复核。ZCode asar 侧确认无这些契约（5 锚点 0 命中）——它们本就不是 ZCode 设计语言的组成部分。

---

## 复核与残留

- 本文件全部探针为只读；唯一交互探针（打开模型菜单）已用 Esc 关闭并复检 `role=menu` 为 false。ZCode/DSH 活页主题类名未改动。
- batch-5 原文两处口径修正：①「代码区 thumb 透明轨道+3px 圆角」实为 `[data-code]`（diffs）专属变体，全局默认是 14px/3px 边/9999px 圆角/32px min；②「`--dsw-scrollbar-width` 本仓 src 无消费点」属实（dsh 拼写），但 DSH 宿主 5 处消费（含 composer 座位让位），数值有真实视觉效力，不能以「无消费」降权。
- 残留无参照子项仅 1 个：`--dsw-alias-menu-group-header-fill`（ZCode 组头无填充形态，无对应物）。
