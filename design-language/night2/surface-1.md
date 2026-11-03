# night2 · surface-1 · 上下文菜单（右键菜单全形态）

> 采样通道：全部为 asar 静态提取（ZCode + DSH 宿主），本轮**未跑 9224/CDP 活体**——03k 已记录真右键被环境拦截，活体项全部归 needs-live。
> 对照前先读了 `night-audit/APPLIED.md`（昨晚已落地清单，本文不重复报其条目）与 `README.md`。

## 0. 提取命令记录（本轮实际执行）

```
node /tmp/asar-read.mjs "/Applications/ZCode.app/Contents/Resources/app.asar" list '\.css$'
  → out/renderer/assets/styles-NK68EN_n.css (480065B) 提取为 /tmp/zc-menu-styles.css
node /tmp/asar-read.mjs "/Applications/ZCode.app/Contents/Resources/app.asar" cat out/renderer/assets/styles-Dv5E6Odo.js /tmp/zc-menu-js.js   (6722805 字节)
grep -ac '--dsw-elevation-prominent:' '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar'   → 2（再按字节偏移切上下文）
```

## A. ZCode 侧全量提取（非抽查，右键菜单家族逐槽全列）

** styled 组件家族**（styles-Dv5E6Odo.js，Tailwind in JSX；`data-slot=context-menu-*` 共 8 处 = 8 个槽全量：menu/trigger/content/item/separator/sub/sub-trigger/sub-content，@2206888–2209605）：

| 槽 | 类串（原始） |
|---|---|
| content | `z-[60] flex flex-col gap-0.5 min-w-44 overflow-hidden rounded-lg border border-popover-border bg-menu p-1 text-foreground shadow-md duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95` |
| item | `group/context-menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-ui-base/relaxed text-foreground outline-hidden select-none data-[highlighted]:bg-menu-hover data-[highlighted]:text-foreground data-inset:pl-7.5 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-[highlighted]:bg-destructive data-[variant=destructive]:data-[highlighted]:text-destructive-foreground data-disabled:pointer-events-none data-disabled:text-foreground-subtlest data-disabled:opacity-100 [&_svg:not([class*='size-'])]:size-4` |
| separator | `-mx-1 my-1 h-px bg-border` |
| sub-trigger | 同 item 几何 + `data-[state=open]:bg-menu-hover`，尾随箭头 `ml-auto size-4 text-foreground-subtle` |
| sub-content | `z-[60] gap-0.5 min-w-32 … rounded-lg border border-popover-border bg-menu p-1 … shadow-md duration-100` 同款开合动画 |

dropdown 家族多出的槽（右键菜单不用）：label = `px-2 py-1.5 text-ui-base font-medium text-foreground-subtlest`；shortcut(nx) = `ml-auto text-ui-xs tracking-widest text-foreground-subtlest group-data-[highlighted]/…:text-foreground-subtle`（全 bundle 仅 3 处用例，都在标题栏缩放 dropdown，@2530684–2531052）；checkbox/radio item（`py-1.5 pr-8 pl-2`+右置 check `size-4 text-foreground-subtle`）。

**调用现场**（任务行右键菜单 @2218523）：`XI{className:'w-56'}`（固定 224px）；结构＝移到分组(子菜单 `tL w-52`=208px，含色点 `dL` size-2.5) ‖ 移到顶部/重命名/归档/标记未读 ‖ sep ‖ 打开文件管理器/复制路径/复制任务路径/复制日志路径/复制会话 ID/打开提供商配置 ‖ sep ‖ 反馈。**全菜单无图标、无快捷键、无 destructive 变体**。分组头右键菜单 @2280020：`w-44`(176px)，新建任务 ‖ 重命名 ‖ 更改颜色(子菜单 `w-40`=160px，7 色点) ‖ 取消分组。文件卡右键 @4178986：`w-64 max-w-[calc(100vw-1rem)]`，混用带图标的 dropdown-menu-item。`Yy`(@903059)=禁用项套 Tooltip（disabledReason）。

**令牌解析**（styles-NK68EN_n.css，zai 主题对为生效值，APPLIED 批次2 CDP 实测 dark #2b2b2b 印证）：
`--color-menu` #fff/#2b2b2b；`--color-menu-hover` #f0f0f0/#363636；`--color-border` 10% 黑/白（0d0d0d1a/ffffff1a）；`--color-destructive` #e03131/#ff5c5c；`--color-destructive-foreground` #fff；`--color-foreground` neutral-800/300＝#262626/#d4d4d4；`--color-foreground-subtlest` 40%/30% 文字；`--radius-lg` 8px、`--radius-md` 6px、`--spacing` 4px；`--ui-font-size` 14px（text-ui-xs=10px）；`--leading-relaxed` 1.625（项行高 22.75px，加 py-1 → **实高 ≈30.75px，min-h-7=28px 仅下限**）；`--shadow-md` = `0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`。

**动画**（已解到关键帧）：`.duration-100{--tw-duration:.1s}`；`.animate-in{animation:enter var(--tw-duration,.15s) var(--tw-ease,ease) …}`；`@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(…,var(--tw-enter-translate-y,0),0) scale3d(…)}}`；`fade-in-0{--tw-enter-opacity:0}`、`zoom-in-95{--tw-enter-scale:.95}`、`slide-in-from-top-2{--tw-enter-translate-y:calc(2*var(--spacing)*-1)}`(=-8px)；关场 `data-closed:animate-out[data-state=closed]{animation:exit …}`（Radix Presence 等 exit 播完才卸载）。**⇒ 开/关各 100ms ease：淡入 0⇄1 + 缩放 .95⇄1 + 8px 方向滑移**。

## B. 插件侧现状（本轮读证）

- **树菜单×4 全部 `portal dense compact`**：CodexWorkspaceBrowser.tsx:950（项目）/964（会话，右键落点 `pointerMenuRect(x,y)`→session-tree.tsx:106）/1000（分组）/1121（顶栏）。菜单项数据：session-tree.tsx:61-103（置顶/重命名/归档/未读/衍生[+键帽]‖moveWorkspace+submenu‖sep‖打开位置/复制ID/复制标题/复制路径‖sep‖删除+danger）；projectMenu 788-806；groupMenu 992-1000。
- **primitives（宿主 kit，样式不可直改，只能 props/令牌/注入）**：`node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/Menu.module.css` — 项 min-height 34px/padding 6px 8px/gap 6px/字号 13px/行高 20px/图标 14px；dense=30px；**compact=24px/11px/17px/2px 6px/gap 5px/图标 12px/分隔线 margin 2px**（124-161 行）；壳 min-width 144（compact 156）/max 360、**compact 壳 radius-md**（MenuSurface.module.css:6-8）；分隔线 0.5px、margin 3px 2px、border-l2；禁用 opacity .4+not-allowed（163-166）；危险项=error-primary 字+hover-danger 底（225-241）；hover/focus-visible=`--dsw-alias-interactive-bg-hover`（112-122）；子菜单 left calc(100%+10px)、bottom -4px、min-width 163、z-101、10px 击穿桥（269-285）；portal z-1100（注释：须压过 modal z-1000）；**无任何 transition/animation**。JS（index.js:3927-4260）：`const list = open && …` 直接挂卸载（无退场动画）；子菜单 onMouseEnter 立即开。
- **composer-tool-menus.ts**：壳 15 行（padding 4px、radius-lg、`background:var(--dsw-specific-menu,var(--dcu-tip-bg))`、`backdrop-filter:var(--dsw-menu-backdrop-filter,none)`、shadow `--dcu-tip-shadow`、z-1100、gap 2px）；项 25 行（32px/0 10px/gap 8px/radius-md/14px/21px）；hover 26 行 `--dsw-specific-menu-item-hover`；建议菜单 44-48。
- **令牌**：zcode-tokens.ts — interactive-bg-hover 5% 半透明（144/375）、hover-danger rgba(224,49,49,.05)/rgba(255,92,92,.12)（148/379）、error-primary #e03131/#ff5c5c（177/408）、radius 4/6/8（505-507）、font-base 14px（554）、**--dsw-specific-menu-item-hover #f0f0f0/#363636（263/489）已定义；--dsw-specific-menu 未定义**。zcode-theme.ts：--dcu-tip-bg #f0f0f0/#2b2b2b、--dcu-tip-shadow＝--shadow-md 全同（58/81）；motion-feedback 150ms (.4,0,.2,1)+reduced-motion 归零（131/221）。
- **DSH 宿主默认**（app.asar 字节偏移 47964532/47971434/47975338/47975668）：`--dsw-menu-surface-fill: rgba(248,249,250,.58)`/`rgba(67,69,74,.45)`；`--dsw-menu-backdrop-filter: blur(40px) saturate(150%)`；`--dsw-elevation-prominent: var(--dsw-elevation-stroke)(0.5px 环), 0 3px 8px 0 rgba(0,0,0,.04), 0 0 20px 0 rgba(0,0,0,.05)`。宿主类名哈希形如 `_danger_4ub78_226` → composer-tool-menus 的 `[class*="…"]` 子串选择器模式对树菜单同样可用（需 listClassName 挂钩，本仓现未用过该 prop）。

## C. 差异表（15 条，宁缺毋滥）

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | 树菜单×4（950/964/1000/1121） | compact 密度档 | compact：行 24px/字 11px/行高 17px/内距 2·6px/项距 0/图标 12px/**壳 6px 圆角** | 行 min 28px（实 ≈30.75px）/字 14px/行高 22.75px/内距 8·4px/图标 16px/壳 8px 圆角 | mechanical | Menu.module.css:124-161 + MenuSurface.module.css:6-8 ↔ ZI 类串；落点：去 `compact` 保 `dense` + listClassName 注入 14px |
| 2 | primitives .itemIcon | 图标槽 | 14px 盒+svg 14px（compact 12px） | svg 直挂 size-4=16px，无盒约束 | mechanical | Menu.module.css:168-188 ↔ `[&_svg:not([class*='size-'])]:size-4`；注入覆盖 |
| 3 | primitives .item:hover | hover 底 | `--dsw-alias-interactive-bg-hover` 5% 半透明 | `--color-menu-hover` 实色 #f0f0f0/#363636（插件已有同值令牌 --dsw-specific-menu-item-hover，composer 已消费） | mechanical | Menu.module.css:112-114 + zcode-tokens.ts:263/489 ↔ bg-menu-hover；03k §C 已预告此项 |
| 4 | primitives .danger | 危险项高亮态 | hover/focus = 5%/12% 红薄底，文字保持红 | highlighted = **实色 bg-destructive + 白字**（destructive-foreground #fff） | mechanical | Menu.module.css:225-241 + zcode-tokens.ts:148/379 ↔ ZI destructive 串 + #fff 令牌；`[class*="_danger"]` 子串可锚（宿主哈希已证） |
| 5 | 树菜单行间 | 行距与分隔线 | 行距 0（.list gap:0）；分隔线 0.5px、margin 3px 2px（内缩） | 行距 2px（gap-0.5）；分隔线 1px、my-1(4px)、**-mx-1 全出血**；颜色两侧同为 10% ✅ | mechanical | Menu.module.css:13/253-257 ↔ tx 类串；注入覆盖 |
| 6 | 壳宽度 | min-width | compact 156/标准 144/max 360；子菜单 163 | context min-w-44=176；任务菜单固定 w-56=224、子菜单 w-52=208；sub-content min-w-32=128 | mechanical | Menu.module.css:28-35/133-137/269-276 ↔ XI/tL + 现场调用串；注入 min-width |
| 7 | composer-tool-menus.ts:15,44 | 菜单底色 | `--dsw-specific-menu` 未定义 → fallback `--dcu-tip-bg`＝#f0f0f0（tooltip 组） | `--color-menu` #fff/#2b2b2b（与 --dcu-dialog-bg 同值族，03k A1） | mechanical | 该行原文 + zcode-theme.ts:58/81 ↔ asar 4 处 --color-menu 定义；落点：定义 `--dsw-specific-menu:#fff/#2b2b2b` |
| 8 | primitives .list/.submenu | 开启动画 | 无（挂载即现） | 100ms ease：fade 0→1 + scale .95→1 + 8px 方向滑移（side 决定方向） | mechanical | index.js:4242 `open && …` ↔ 动画关键帧链（§A）；listClassName 注入 @keyframes，reduced-motion 走既有 0ms 机制（zcode-theme.ts:221） |
| 9 | primitives .item:disabled | 禁用态 | opacity .4 + cursor:not-allowed | opacity 100 + 文字 foreground-subtlest(40%/30%) + pointer-events-none | mechanical | Menu.module.css:163-166 ↔ ZI data-disabled 串；注入 `[role=menuitem]:disabled` |
| 10 | 菜单壳材质 | 毛玻璃+描边 | 宿主 surface-fill rgba(248,249,250,.58)/rgba(67,69,74,.45)+blur(40px)saturate(150%)+0.5px l1(6%) 环 | 不透明 #fff/#2b2b2b + 1px 10% 边 + shadow-md | **deviation** | DSH asar 字节 47964532/47975338/47975668 ↔ XI 串；APPLIED「已裁决偏离，维持：菜单壳毛玻璃」——登记不动 |
| 11 | session-tree.tsx:75-78 | 菜单内快捷键键帽 | rename/archive/fork 尾随键帽（Menu.module.css:198-207：11px/caption 40%/16px） | 任务右键菜单**无快捷键**；nx 槽只用于标题栏 dropdown（10px/tracking-widest/subtlest 40%/高亮 60%） | **deviation** | session-tree.tsx:67-68 注释明示「键位以宿主目录为真源」的产品决定 ↔ nx 类串与 3 处用例；保留能力，样式差登记 |
| 12 | 树菜单项 | 行高实测 | 树菜单走 compact（见 #1） | APPLIED 批次15 活体实测 32px vs asar 静态 28px 下限/实算 30.75px | needs-live | 两份证据差 1.25-4px，须 9224 活体复测 ZCode 任务菜单行高后定档 |
| 13 | 开合生命周期 | 关闭动画+子菜单时序 | open=false 立即卸载（纯 CSS 做不出退场）；子菜单 onMouseEnter 立即开 | 关场 100ms exit（Radix Presence 延迟卸载）；子菜单开启时序为 Radix 内部参数 | needs-live | index.js:4242 ↔ data-closed:animate-out；Radix 时序静态不可得，须活体 + 评估宿主 primitives 能否配延迟卸载 |
| 14 | 右键落点 | 菜单锚点 | `pointerMenuRect(x,y)` 0×0 矩形 + portal y=r.bottom+4 → 菜单出现在指针**下方 4px**（12px 视口夹取） | Radix ContextMenu 以指针点为锚（content 无 sideOffset 包裹） | needs-live | index.js:3985-4004 + session-tree.tsx:106 ↔ XI 无偏移包裹；活体确认 ZCode 落点是否贴指针后决定是否把 y 收回 -4 |
| 15 | primitives .submenu | 子菜单定位 | left calc(100%+10px)、bottom -4px（贴父项底对齐） | Radix SubContent 运行时定位，静态 CSS 不可见 | needs-live | Menu.module.css:269-276 ↔ tL 类串（无定位信息）；活体采样对齐边距与对齐边 |

## D. 已对齐表（本轮逐项验证过值的）

| item | ours | zcode | 证据 |
|---|---|---|---|
| 菜单正文色 | --dsw-alias-label-primary #262626/#d4d4d4 | --color-foreground(zai) #262626/#d4d4d4 | zcode-tokens.ts:99/332 ↔ asar neutral-800/300 |
| 危险项文字色 | --dsw-alias-state-error-primary #e03131/#ff5c5c | --color-destructive #e03131/#ff5c5c | zcode-tokens.ts:177/408 ↔ asar 4 处定义 |
| 菜单 hover 色值本体 | --dsw-specific-menu-item-hover #f0f0f0/#363636（composer 已消费） | --color-menu-hover #f0f0f0/#363636 | zcode-tokens.ts:263/489 ↔ asar |
| 项圆角 / 壳圆角（标准档） | radius-md 6px / radius-lg 8px | rounded-md 6px / rounded-lg 8px | zcode-tokens.ts:506-507 ↔ asar --radius-* |
| composer 项字号/图标/gap | 14px / 16px / gap 8px | 14px / 16px / gap 8px | composer-tool-menus.ts:25-27（APPLIED 批次15） |
| composer 壳投影 | --dcu-tip-shadow `0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)` | --shadow-md 全同 | zcode-theme.ts:58/81 ↔ asar --shadow-md |
| 分隔线颜色 | border-l2 10% 黑/白 | bg-border 10% 黑/白 | zcode-tokens.ts:88/321 ↔ asar --color-border |
| 菜单术语 | taskList.* 系（归档/标记未读等） | 同源原文 | APPLIED 批次4/6 |
| portal 层级设计 | z-1100 压过 DSH modal z-1000 | z-[60]（应用内栈） | Menu.module.css:41-46 注释 ↔ z-[60]；见无参照表 #3 |

## E. 无参照表（附穷尽搜索记录）

| # | item | 状态 |
|---|---|---|
| 1 | 分组标题（label） | 两侧现网右键菜单都不出现：ZCode context 家族 8 槽**无 label 槽**（styles-Dv5E6Odo.js 中 `data-slot:` `` `context-menu `` 全部 8 处逐个核对）；ours 的 sessionMenuItems/projectMenu/groupMenu 无 `type:'label'` 条目（session-tree.tsx:73-102、CodexWorkspaceBrowser.tsx:795-805/992-995）。dropdown 家族 label 槽存在（`px-2 py-1.5 text-ui-base font-medium text-foreground-subtlest`）供未来引用；primitives 侧对应 `.label`（11px/15px/tertiary，Menu.module.css:243-249）——两套值不一致，启用前需先裁决。 |
| 2 | checkbox/radio 项 | ZCode 仅 dropdown 家族有（`py-1.5 pr-8 pl-2`+右置 check），context 家族无；ours 菜单未消费。搜索：JS bundle `dropdown-menu-checkbox-item` 2 槽、context 家族 0。 |
| 3 | z-index 绝对值 | ours 100/1100 vs zcode z-[60]：不同应用的自有层栈（DSH 侧压 modal z-1000 是宿主约束，Menu.module.css:38-40 注释），无可比基准。 |
| 4 | 菜单滚动 | ZCode context content `overflow-hidden` 且无 max-h（菜单必须短）；ours 标准档 `.scrollable` max-height calc(100vh-12px-…) + viewport 滚动，含子菜单行时跳过。形态差异，无对齐目标。 |
| 5 | 菜单内容结构 | ours 有 pin/衍生(fork)/删除项，ZCode 任务菜单是 移到分组/移到顶部/…/反馈 且无删除（归档即终点）；ZCode 有色点子菜单、文件卡「打开方式」子菜单。产品能力差异，样式面已由 C 表覆盖。 |

## F. 本轮未跑/未验声明

- 未跑任何 CDP/9224 活体采样（含右键动作、双主题截图）——所有 ZCode 值来自 asar 静态提取，zai 主题对生效性靠 APPLIED 批次2 的 CDP 记录（dark #2b2b2b）旁证。
- 未验证宿主运行时是否注入与 node_modules 副本一致的 primitives CSS（若宿主捆绑版本不同，B 节数值需活体复核）——DSH asar 内已见同款类哈希（`_danger_4ub78_226`），一致性高度可信但未逐值比对。
- 未改任何文件；本文为本轮唯一产出。

## 复核（独立复核员，本轮追加）

> 复核方法：未采信原文任何值，全部重新提取/重读。实际执行的检查：
> ① `node /tmp/asar-read.mjs "/Applications/ZCode.app/Contents/Resources/app.asar" list 'styles-NK68EN_n\.css$'` → 480065B；`cat out/renderer/assets/styles-Dv5E6Odo.js` → 提取 6839502 字节（与原文留档 /tmp/zc-menu-js.js MD5 一致 = `f0b2ea342bf1139841b365197b0407fe`）。
> ② `grep -ac -- '--dsw-elevation-prominent:'` DSH asar → 2；`grep -abo` 定位 + Python 按偏移读值。
> ③ 逐行重读本仓 `/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui` 的 Menu.module.css 全文、MenuSurface.module.css 全文、index.js 3927-4260、composer-tool-menus.ts 全文、zcode-tokens.ts/zcode-theme.ts 引用行、session-tree.tsx 55-110、CodexWorkspaceBrowser.tsx 950/964/1000/1121/788-806/992-1000。
>
> **总体发现（不影响逐条 verdict，但须登记）**：
> - 原文 §0 记 JS bundle "6722805 字节"与实际不符（实为 6839502B，两次提取内容同一，属记录笔误）。
> - 原文引用的字节偏移（@2206888–2209605、@2218523、@2280020、@4178986、@903059、@2530684–2531052）在现提文件中**全部对不上**（我实测：context 家族 @2298362–2301184、任务菜单 XI w-56 @2310097、分组头 XI w-44 @2371746、文件卡 @2829561、Yy 定义 @903868）；但每一条内容声明都在现提文件中找到实证。偏移号当作失效处理，结论不受影响。
> - 补充发现 1：compact 档**项**圆角是 `--dsw-radius-sm`(4px)（Menu.module.css:143），与 ZCode `rounded-md`(6px) 也不一致——原文表 #1 只列了壳圆角，未列此项圆角差。
> - 补充发现 2：DSH 宿主 asar 实际**有** `--dsw-specific-menu:var(--dsw-menu-surface-fill)` 定义（@47964532/@47971434）。表 #7 "插件 src 未定义 → fallback 生效"在静态源码层面成立（`grep -rn -- '--dsw-specific-menu:' src/` 零命中），但若宿主运行时注入该变量，composer 壳实际吃到的是宿主毛玻璃 surface-fill 而非 --dcu-tip-bg——与 F 节"宿主运行时注入未验"声明一致，落实点（定义 #fff/#2b2b2b）需注意与宿主注入的优先级。

### 逐条 verdict

| # | kind | verdict | 复核所见（实际值） |
|---|---|---|---|
| 1 | mechanical | **verified** | ours：Menu.module.css:139-146 compact 项 min-height 24px/gap 5px/padding 2px 6px/11px/17px，148-151 图标 12px，153-155 分隔线 margin 2px，133-137 compact 壳 156px；MenuSurface.module.css:6-8 `.compact{border-radius:var(--dsw-radius-md)}`=6px；四树菜单 950/964/1000/1121 均带 `portal dense compact`。zcode：ZI 串 `min-h-7`（28px，工具类=spacing×7）、`px-2 py-1`=8·4px、`text-ui-base/relaxed`（--text-ui-base=var(--ui-font-size)=14px、--leading-relaxed=1.625→22.75px，实高 30.75px 算式成立）、`[&_svg:not([class*='size-'])]:size-4`=16px、壳 `rounded-lg`=--radius-lg=.5rem=8px。dense=30px（124-127）✓ |
| 2 | mechanical | **verified** | ours：Menu.module.css:168-182 `.itemIcon` 14px 盒+`.itemIcon svg,.check` 14px，184-188 compact 12px。zcode：ZI 串 `[&_svg:not([class*='size-'])]:size-4`（svg 直挂、无盒；另有文档未列的 `[&_svg]:pointer-events-none [&_svg]:shrink-0`） |
| 3 | mechanical | **verified** | ours：Menu.module.css:112-114 hover→`--dsw-alias-interactive-bg-hover`=zcode-tokens.ts:144/375 `rgba(13,13,13,.05)`/`rgba(255,255,255,.05)`。zcode：`bg-menu-hover`→--color-menu-hover zai 对 `#f0f0f0`/`#363636`（asar 4 处定义中 zai 两处实测）。--dsw-specific-menu-item-hover `#f0f0f0`/`#363636` 在 263/489 且 composer-tool-menus.ts:26/48 已消费 ✓。03k-context-menu.md §C 预告原文在（"插件右键菜单 hover…与 ZCode #363636 不一致，待改齐"） |
| 4 | mechanical | **verified** | ours：Menu.module.css:225-241 danger 文字 error-primary + hover/focus hover-danger=zcode-tokens.ts:148/379 `rgba(224,49,49,.05)`/`rgba(255,92,92,.12)`。zcode：ZI destructive 串原文在（text-destructive + highlighted:bg-destructive + highlighted:text-destructive-foreground）；--color-destructive `#e03131`/`#ff5c5c`、--color-destructive-foreground `#fff`（zai 对实测）。`_danger_4ub78_226` 在 DSH asar @104896724 原文命中 |
| 5 | mechanical | **verified** | ours：`.list{gap:0}`（**行 14**，原文引 13 差一行，行 13 是 flex-direction）；.separator 253-257 `height:0.5px;margin:3px 2px;border-l2`。zcode：QI 串 `-mx-1 my-1 h-px bg-border`（-4px 全出血/4px/1px）；gap-0.5=2px；--color-border zai `#0d0d0d1a`/`#ffffff1a`=10% 黑/白，插件 border-l2 zcode-tokens.ts:88/321 `rgba(13,13,13,.1)`/`rgba(255,255,255,.1)` 同 10% ✓ |
| 6 | mechanical | **verified** | ours：`.list` min 144/max 360（33-34）、compact 156（133-137）、`.submenu` min 163（269-276）。zcode：context content `min-w-44`=176；任务菜单 `(0,$.jsxs)(XI,{className:'w-56'` @2310097=224、移到分组 `(0,$.jsxs)(tL,{className:'w-52'` @2310318=208；分组头 XI `w-44` @2371746=176+更改颜色 tL `w-40` @2372144=160（7 色：lL=[gray,red,orange,yellow,green,blue,purple] @2307609）；sub-content `min-w-32`=128。均 spacing×n 核算无误 |
| 7 | mechanical | **verified** | composer-tool-menus.ts:15 原文 `background:var(--dsw-specific-menu,var(--dcu-tip-bg))`；`grep -rn -- '--dsw-specific-menu:' src/` → 零命中（未定义证实）；--dcu-tip-bg zcode-theme.ts:58/81 `#f0f0f0`/`#2b2b2b`，--dcu-dialog-bg 同行 `#fff`/`#2b2b2b`（同值族成立）；asar `--color-menu` 4 处定义（zai 对 `#fff`/`#2b2b2b`）。**但见上方补充发现 2：宿主 asar 有 `--dsw-specific-menu:var(--dsw-menu-surface-fill)`**，运行时 fallback 可能不生效，未验 |
| 8 | mechanical | **verified** | ours：Menu.module.css 全文无任何 transition/animation 声明；index.js:4242 `const list = open && jsxs(MenuSurface,…)` 直接挂卸载。zcode：`.duration-100{--tw-duration:.1s}`、`.animate-in{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,ease)…}`（→100ms）、`.fade-in-0{--tw-enter-opacity:0}`、`.zoom-in-95{--tw-enter-scale:.95}`、`.slide-in-from-top-2{--tw-enter-translate-y:calc(2*var(--spacing)*-1)}`=-8px、@keyframes enter/exit 均实测命中；4 个 data-[side] 方向类在 content 串中 |
| 9 | mechanical | **verified** | ours：Menu.module.css:163-166 `opacity:0.4;cursor:not-allowed`。zcode：ZI 串 `data-disabled:pointer-events-none data-disabled:text-foreground-subtlest data-disabled:opacity-100`；--color-foreground-subtlest zai 对 = neutral-800 40%/neutral-300 30%（`#26262666`/`#d4d4d44d`） |
| 10 | deviation | **证据成立** | DSH asar 按原文偏移实测：@47964532 `--dsw-menu-surface-fill:#f8f9fa94`（=rgba(248,249,250,.58)）、@47971434 `#43454a73`（=(67,69,74,.45)）、@47975338 `blur(40px) saturate(150%)`、@47975668 `--dsw-elevation-prominent:var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d`（=4%/5%）；stroke-color 绑 l1 在宿主多处命中（如 @24063945），l1=6%（zcode-tokens.ts:87/320）。zcode 侧：XI 串 `bg-menu`（不透明）+`border border-popover-border`（1px；--color-popover-border=var(--color-border)=10%）+`shadow-md`。APPLIED.md:43「已裁决偏离，维持：…菜单壳毛玻璃…」原文在 |
| 11 | deviation | **证据成立** | ours：session-tree.tsx:75-78 rename/archive/fork 带 `...shortcut(...)` 键帽；67-68 注释「菜单键位一律以宿主目录为真源，不在本地硬编码」原文在；Menu.module.css:198-207 `.shortcut .shortcutKeys` 11px/16px/--dsw-alias-label-caption（zcode-tokens.ts:106/339=`rgba(38,38,38,.4)`/`rgba(212,212,212,.4)`=40%）。zcode：任务菜单结构（@2310097-2313400 全文提取）无任何 nx 用例；nx 全 bundle 恰 3 处调用（@2623601/2623783/2623969，全在 titleBar.menu.view.zoomIn/zoomOut/actualSize）；nx 串 `text-ui-xs tracking-widest text-foreground-subtlest group-data-[highlighted]/…:text-foreground-subtle`，text-ui-xs=calc(14px-4px)=10px ✓ |
| 12 | needs-live | **verified（引用链）** | APPLIED.md 批次15 行原文在：「菜单项 28px/13px/4-8px → 32px/14px/0-10px」，依据 03b-sidebar.md:40 #13「菜单项高/字号 32px/14px ✅」活体实测（重读命中）。asar 侧 28px 下限/30.75px 实算我已独立复算成立。32px 是 composer 工具菜单活体值、非 ZCode 任务菜单行高——条目自己已声明此差并归 needs-live，归类诚实，与 F 节"未跑活体"一致 |
| 13 | needs-live | **verified（静态部分）** | ours：index.js:4242 `open &&` 直接挂卸载（4242 行原文重读命中）；子菜单 `onMouseEnter: hasSub ? () => { setOpenSubmenuId(entry.id) } : void 0`（index.js:4157-4159，无延迟）。zcode：`data-closed:animate-out`→`animation:exit var(…,var(--tw-duration,.15s))…`（[data-state=closed] 选择器实测命中）→ 关场 100ms（duration-100 继承）成立。Radix Presence 卸载时序静态不可得——needs-live 归类合理 |
| 14 | needs-live | **verified（静态部分）** | ours：index.js:3985-4004 `y = side==="bottom" ? r.bottom+4 : r.top-lh-4`+`MARGIN=12` 夹取（原文重读命中）；session-tree.tsx:107 `pointerMenuRect` 返回 `new DOMRect(x,y,0,0)`。zcode：XI 定义=Portal 直包 Content、只传 className，无 sideOffset/alignOffset props（原文重读命中）。ZCode 真实落点需活体确认——归类合理 |
| 15 | needs-live | **verified（静态部分）** | ours：Menu.module.css:269-276 `.submenu{bottom:-4px;left:calc(100%+10px);z-index:101;min-width:163px}`+278-285 `::before` 10px 击穿桥（全文重读命中）。zcode：tL 串 `z-[60] flex flex-col gap-0.5 min-w-32 origin-(…) overflow-hidden rounded-lg … p-1 … shadow-md duration-100`——无 top/left/bottom 定位声明，定位来自 Radix 运行时。活体采样才能定对齐边——归类合理 |

### 复核结论

15/15 条 verdict = verified（其中 3 条 deviation 只核证据、5 条 needs-live 只核静态证据与引用链）。原文没有发现任何一条数值错误；瑕疵集中在：§0 的 bundle 字节数笔误、失效的字节偏移引用、#5 的一处行号偏差（13→14），以及两条本复核新增的补充发现（compact 项圆角 4px 未列、宿主侧 --dsw-specific-menu 已定义）。
