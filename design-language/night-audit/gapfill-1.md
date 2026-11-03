# gapfill-1 · 批次1 无参照项补采（CodexWorkspaceBrowser.tsx）

> 2026-10-30 补采。对象：`night-audit/batch-1.md`「无参照项」5 条。
> 方法：全部对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）实跑 `grep -a`（下文命令均本轮执行，路径省略为 `A=/Applications/ZCode.app/Contents/Resources/app.asar`）；大窗口中文正则遇 ugrep 复杂度上限时改用 `grep -a -b -o` 取字节偏移 + `tail -c +N | head -c M | iconv -c` 切片。设计语言文档侧复核了 `03b-sidebar.md` §4/§5（`sed -n '95,130p'`）：§4 明确「置顶区/拖拽中任务行样式未单独采集」，本轮即为补采。
> 本轮 uiplug 源码定位复核（只读）：`sed -n '90,130p;200,230p;280,300p;320,370p' src/client/CodexWorkspaceBrowser.tsx`，5 条行号（:104-121,218 / :211,325-327 / :287-288 / :362 / :353,355-357）与 batch-1 所记一致。
>
> **总判定：5 条全部升级为「有参照」（found=5, absent=0）。** 批次1 的三条前提被推翻：ZCode 任务列表**有**分组层、**有**任务行拖拽预览、**有**2px 线 + 8px 空心环落点指示器（载体不同）。注意：**有参照 ≠ 数值一致**——多数为「形态不同，需按差异项登记」。

---

## 条目1 · 拖拽 ghost（uiplug `:104-121,218`：30px 高 / max-width 220px / 阴影 `0 4px 12px rgba(0,0,0,.24)` / `setDragImage(preview,16,15)` / z-index 10040）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E 'setDragImage\([^)]{0,80}\)' $A | sort -u` → 11 处命中，唯一带计算偏移的一条：`setDragImage(o,Math.max(0,Math.min(e-a.left,a.width))…`
- `grep -a -o -E '[a-zA-Z$_-]*([Dd]rag[Pp]review|[Dd]rag[Gg]host|drag-image|dragImage)[a-zA-Z$_-]*' $A | sort | uniq -c` → `taskWorkbenchDragPreview`(1)、`tableFloatingDragPreview`(10)/`updateSelectionDragPreview`(6) 等（后者属编辑器表格拖拽，与侧栏无关）
- `grep -a -o -E '.{400}taskWorkbenchDragPreview.{600}' $A` → 拖拽预览构建函数全文
- `grep -a -o -E '.{260}wyt\(.{160}' $A | head -3` → 任务行 dragStart 调用点
- `grep -a -o -E -- '--shadow-lg:[^;]{0,120};' $A` → shadow-lg 编译值
- 任务行 JSX 全文切片（见公共定位）→ 拖拽预览行变体

**命中原文**：
```js
// wyt：ZCode 任务行拖拽预览构建器（taskWorkbenchDragPreview）
o.dataset.taskWorkbenchDragPreview=`true`,
o.classList.add(`border`,`border-border`,`bg-background`,`shadow-lg`),
o.style.position=`fixed`, o.style.left=`-10000px`, o.style.top=`-10000px`,
o.style.pointerEvents=`none`, o.style.width=`${a.width}px`,   // a = 行 getBoundingClientRect
i.body.append(o),
n.setDragImage(o,Math.max(0,Math.min(e-a.left,a.width)),Math.max(0,Math.min(t-a.top,a.height))), ()=>o.remove()
```
调用点（任务行 dragStart 内）：`r.dataTransfer.setData(YI,yyt(i)), r.dataTransfer.setData(\`text/plain\`,ee); let a=wyt({clientX:r.clientX,clientY:r.clientY,dataTransfer:r.dataTransfer,source:r.currentTarget})`。预览行的行变体类：`` y?`pointer-events-none cursor-grabbing border border-border bg-background shadow-lg opacity-100` ``（基类 `mgt=\`flex min-h-7 w-full min-w-0 flex-col justify-center rounded-lg border border-transparent pl-2.5 pr-1 …\``）。shadow-lg 编译值：`--shadow-lg:0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a`。

**最终判定：有参照（形态不同）。** ZCode 任务行确实有自建拖拽预览，但方案完全不同：**克隆整行**（宽度=行宽、高度=行高 32px、`bg-background` 不透明底 + `shadow-lg`、`setDragImage` 偏移=指针在行内的实时位置夹紧，无固定偏移、无 z-index 设置——预览节点放 -10000px 屏外即可）。uiplug 的 30px/220px 迷你胶囊、`.24` 阴影、(16,15) 固定偏移、z-index 10040 在 ZCode **无同值对应**。登记为差异项：ghost 形态（整行克隆 vs 迷你胶囊）。

---

## 条目2 · 拖拽落点指示线（uiplug `:211,325-327`：2px 圆头线 + 8px 空心圆环 + 9% business-primary 高亮底）

**搜索过的模式**：
- `grep -a -o -E '.{110}\.isOver.{110}' $A | grep -E 'border-|ring-|bg-|dashed'` → 0 条视觉命中（命中到的 `isOver*` 均为 marquee 组件的 `isOverflowing`，已排除）
- `grep -a -c 'isDropTarget'` → 24；`grep -a -c 'DragOverlay'` → 33（均为 @dnd-kit 库自身代码）；`grep -a -c 'dnd-kit'` → 197，`@dnd-kit/core|react|sortable|dom…` 全家桶在包内
- `grep -a -c 'data-drop-indicator' $A` → 0；`grep -a -o -E 'drop-line|dropLine|drop-target-ring|insertion-line' $A` → 仅图表库 `dropLines` 噪音
- 200KB 任务区切片内搜 `data-over|dropHover|drop-hover|drop-over|border-t-2|border-b-2|h-\[2px\]` → 0
- `grep -a -o -E '[a-zA-Z$_-]*(grouped-task|group-header|grouped-…)[a-zA-Z$_-]*'` → droppable 家族 `grouped-task`/`grouped-group-over`/`grouped-collapsed-group`/`grouped-expanded-group-header|footer`/`grouped-empty-drop-zone`
- 130KB 切片 `grep -abo 'isOver|isDragging|onDragOver'` → 定位两处 sortable 组件
- `grep -a -o -E '[a-z()%,. -]{0,70}9%, ?transparent' $A` → **0 命中**（9% 蓝色洗底不存在）

**命中原文**：
1. 任务分组列表的落点模型（DndContext 配置）：`onDragMove:e=>{…e.delta.y>g.current?h.current=\`after\`:e.delta.y<g.current&&(h.current=\`before\`);…h.current!==t&&_.current&&D(_.current)}`，且 `onDragMove` 内 `m.current=o, C(o)` 把重排后的列表顺序直接写回 state —— **任务行拖拽的落点反馈 = 列表实时重排（before/after 只进数据模型），不画指示线**；被拖行本体 `v&&\`opacity-0\``。
2. **官方指示线在侧栏顶层 section 排序上**（projects / conversations 两个可排序区块，dnd-kit sortable，激活距离 `activationConstraint:{distance:6}`）：
```jsx
b&&(0,$.jsx)(`div`,{ "aria-hidden":`true`, "data-testid":`purpose-section-drop-indicator`,
  "data-drop-position":b,   // before | after
  className:`pointer-events-none absolute left-5 right-2 z-20 h-0.5 bg-icon-blue ${b===\`before\`?\`top-0 -translate-y-1/2\`:\`bottom-0 translate-y-1/2\`}`,
  children:(0,$.jsx)(`span`,{className:`absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-icon-blue bg-sidebar`})})
```
   `h-0.5`=**2px 线**；子 span `size-2`=**8px**、`rounded-full border-2 border-icon-blue bg-sidebar`=**2px 边的空心圆环**，位于线头。颜色：`--color-icon-blue:var(--color-terminal-bright-blue)`，`--color-terminal-bright-blue:var(--color-sky-500/600)`。
3. 整节悬停高亮（HTML5 拖到 projects 区上）：容器 `` className:`min-w-0 rounded-xl ${d?`bg-accent`:``}` ``（`--color-accent`：浅 `var(--color-sky-50)` / 深 `color-mix(in oklab, var(--color-sky-950) 50%, transparent)`）——整节满色高亮，非 9% 洗色。

**最终判定：有参照（载体不同）。** uiplug 的「2px 圆头线 + 8px 空心圆环」在 ZCode 有几乎逐项同构的官方对应物（`purpose-section-drop-indicator`），但载体是**侧栏顶层 section 排序**，不是任务行；任务行内部 = 实时重排无指示线。「9% business-primary 高亮底」无同值对应（ZCode 用整节 `bg-accent`）。登记：指示线几何有参照可锁；9% 洗底按差异项处理。

---

## 条目3 · 未读点 6×6 / 待处理胶囊（uiplug `:287-288`：7×7 点 + warn 色）

**搜索过的模式**：
- `grep -a -o -E '[a-zA-Z$_-]*(unread|Unread)[a-zA-Z$_-]*' $A | sort | uniq -c` → `onMarkTaskAsUnread`(21)、`taskUnreadOverlayByEntityKey`(20)、`unreadTaskKeys`(15)、`setTaskUnread`(10)、`mark-unread`(8) 等 —— 未读是一等状态
- `grep -a -b -o '待处理'` / `grep -a -b -o '未读'` → 命中处切片核对：全部为压缩库中文注释与飞书 API 文档噪音，**无 UI 文案命中**
- `grep -a -b -o 'group/task-row' $A` → 任务行 JSX 全文切片（`tail -c +328539900 | head -c 6000`）
- `grep -abo 'function wF'`（130KB 切片）→ pendingInteraction 徽章组件；`grep -abo 'TF\[|EF\['` → 状态点映射消费点
- 200KB 切片 `grep -abo 'data-unread-indicator|data-error-indicator|bg-icon-blue'` → 置顶/时间线行行首槽
- 令牌：`--color-icon-blue` / `--color-brand` / `--color-warning` / `--color-interaction-confirmation-surface`（grep 值见下）

**命中原文**：
1. 任务行（分组/普通行）**右槽** 16px 容器里的 6px 状态点：`` B=M===`error`?`bg-destructive`:M===`unread`?`bg-sky-500 dark:bg-sky-400`:null `` → ``(0,$.jsx)(`span`,{className:`flex size-4 shrink-0 items-center justify-center`,children:(0,$.jsx)(`span`,{className:Z(`size-1.5 rounded-full`,B)})})``。`size-1.5`=**6×6**。
2. 置顶/时间线行**行首槽**（与 uiplug 同位置）：`` U===`error`?(0,$.jsx)(`span`,{"data-error-indicator":`true`,className:`h-1.5 w-1.5 rounded-full bg-destructive`}):U===`unread`?(0,$.jsx)(`span`,{"data-unread-indicator":`true`,className:`size-[7px] rounded-full bg-icon-blue`})`` —— **7×7 未读点**（`size-[7px]`），`bg-icon-blue` = sky-500/600 ≈ 品牌蓝（`--color-brand:var(--color-sky-400/500)`）。
3. 待处理指示：`e.pendingInteraction? <wF …/>`，wF 徽章壳：`` b=Z(`relative inline-flex h-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-transparent bg-interaction-confirmation-surface px-2 text-ui-sm font-medium text-interaction-confirmation-foreground`,n) `` + 倒计时填充 `bg-interaction-ask-fill` + 文案 `taskList.userInputTag` / `taskList.permissionTag`（`--color-interaction-confirmation-surface`：浅 `var(--color-green-50)` / 深 `color-mix(in oklab, var(--color-green-950) 45%, transparent)`）。
4. workflow 进度轨 6px warn 点：`` Z(`size-1.5 rounded-full`,TF[e.status])``，映射 `` running:`animate-pulse bg-warning motion-reduce:animate-none` ``、`` failed:`bg-destructive ring-2 ring-destructive/30` ``、waiting 空心 `` border-dashed … border-warning ``（`--color-warning:#e07b00`/yellow-500/600）。

**最终判定：有参照（形态不同）。** 03b §5「行首槽仅 running loader」的记录需修正为只对**分组/普通任务行**成立；置顶/时间线行的行首槽明确有 **7×7 蓝色未读点 + 6×6 红色错误点**，右槽有 6×6 状态点（未读=sky/品牌蓝、错误=destructive），warn 色 6px 点在 workflow 轨存在（running `bg-warning` 脉冲）。uiplug 的「6×6 未读点」有同尺寸参照（但 ZCode 未读是蓝系且 7×7 档也存在）；「7×7 + warn 色」的**待处理胶囊**在 ZCode 是 **h-5 胶囊徽章**（交互待办，倒计时），不是 7px 点+文字——按差异项登记。

---

## 条目4 · 键盘 focus-visible 外圈（uiplug `:362`：2px、offset −2px、radius-md）

**搜索过的模式**：
- `grep -a -o -E 'focus-visible\\?:[a-zA-Z0-9_:\[\]\-]{0,50}' $A | sed 's/\\\\//' | sort | uniq -c | sort -rn | head -40` → `focus-visible:ring-2`(93)、`outline-none`(69)、`ring-input-border-focused`(51)、`ring-ring`(41)、`ring-[3px]`(6)、`outline-2`(5)、`outline-1`(5)、`ring-offset-2`(4)、`ring-warning`(2) 等
- `grep -a -o -E -- '--color-input-border-focused:[^;]{0,80};'` → `var(--color-brand)`；`--color-brand:var(--color-sky-400/500)`
- `grep -a -o -E '.{40}focus-visible:outline-2[^`"]{0,70}' | head -4` → `focus-visible:outline-2 focus-visible:outline-primary` / `…outline-ring` / `…outline-2 focus-visible:outline-offset-4`
- 任务行与分组头 JSX 切片内查 `focus-visible` → 行容器无

**命中原文**：
- 任务行本体：`role:\`button\`, tabIndex:0` 容器**没有** focus-visible 环——只有 `onFocusCapture:()=>H(!0)`（焦点仅用于显影行尾操作按钮）；`mgt` 行基类含 `border border-transparent` 也未配 focus 环。
- ZCode 焦点圈语言（侧栏内实锤三处）：分组头颜色点按钮 `` `… rounded-full hover:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-input-border-focused` ``；section 排序拖把 `` `… focus-visible:ring-2 focus-visible:ring-ring/30` ``；交互徽章 `` `focus-visible:… ring-1 ring-input-border-focused` ``。另有列表按钮 `` `focus-visible:outline-2 focus-visible:outline-offset-4` ``。
- 焦点令牌族存在：`--color-ring-primary/secondary/info/danger/warning`（主题注册代码命中）。

**最终判定：有参照（机制不同 + 一处反向事实）。** ZCode 的键盘焦点语言是 **ring（box-shadow）**：ring-1/2 × `ring-input-border-focused`(=brand=sky) / `ring-ring/30`，另有 `outline-2 outline-offset-4`（外扩）。uiplug 的「outline 2px + offset −2px（内缩）」原值在 ZCode **无同值对应**；且 **ZCode 侧栏任务行本体无可见焦点圈**——uiplug 给行加 focus-visible 外圈是超出 ZCode 的增强。登记：2px 焦点环语言可参照；「行级焦点圈」标注为插件自增强，「offset −2 内缩」按差异项。

---

## 条目5 · 分组头静息底 color-mix 55% 与 chevron 尺寸（uiplug `:353,355-357`：12/14px）

**搜索过的模式**：
- `grep -a -o -E '[a-zA-Z$_-]*(grouped-task|groupedTask|group-header|groupHeader)[a-zA-Z$_-]*' $A | sort | uniq -c` → `data-grouped-task-key`(8)、`zcode-grouped-task-collapsed-groups`(2)、`grouped-expanded-group-header`(2)、`group-header-drop`(1) 等
- `grep -a -b -o 'grouped-expanded-group-header'` → 328559469 / 328577175 → 切片得 `[WorkspaceGroupedTasksSection]` 分组组件与分组头渲染
- `grep -a -b -o 'rounded-lg border border-border bg-background pl-1.5 pr-1 text-ui-base text-foreground shadow-sm'` → 328571307 → 分组头 JSX 全文（`tail -c +328571307-1200 | head -c 3600`）
- chevron 归属：分组头展开/收起三元 `` t?(0,$.jsx)(ts,{…className:`size-3.5 shrink-0 text-foreground-subtlest`}):(0,$.jsx)($o,{…size-3.5…}) ``（`aria-expanded` 驱动）；同对图标在 section 排序行上带 `data-purpose-section-chevron:expanded|collapsed`，语义即 chevron 收/展对
- `--color-tag` → `var(--color-neutral-200/700)`（计数胶囊 `bg-tag/50`）

**命中原文**（ZCode 分组头行）：
```jsx
role:`button`, tabIndex:0, "aria-expanded":!t,
className:Z(`flex h-8 items-center gap-1 rounded-lg border border-border bg-background pl-1.5 pr-1 text-ui-base text-foreground shadow-sm`,
           `cursor-pointer transition-[border-color,box-shadow] hover:border-border-hover`)
// chevron: size-3.5 (14px) text-foreground-subtlest
// 计数胶囊: `inline-flex min-w-5 … rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm … text-foreground-subtle`
```

**最终判定：有参照（批次1 前提不成立）。** 「ZCode 平铺任务列表无分组层」**是错的**：任务列表有完整分组模式（`WorkspaceGroupedTasksSection`、折叠组、组重命名/换色、`data-grouped-task-key`、组间拖放 droppable 五种类型）。几何一致项：分组头高 `h-8`=**32px**（= uiplug min-height 32px）、圆角 `rounded-lg`=**8px**、chevron **14px**（= uiplug collection-label caret 14px；uiplug 的 12px 档 caret 在 ZCode 无对应尺寸——ZCode 分组头 chevron 只有 14px 一档）。静息底不同：ZCode = **不透明 `bg-background` + 1px border + shadow-sm**，hover 变边框色（`hover:border-border-hover`）；uiplug = **55% 半透明 sidebar-hover 洗底、无边框无影**——按差异项登记。

---

## 附：公共定位命令（本轮实跑，后续批次可复用）

```bash
A=/Applications/ZCode.app/Contents/Resources/app.asar
grep -a -o -E '.{60}task-item.{260}' $A            # 测试ID注册表：pLe=`task-item` 等
grep -a -b -o 'group/task-row' $A                   # 任务行 JSX：328540574 → tail -c +328539900 切 6KB
grep -a -o -E 'mgt=`[^`]{0,220}`' $A                # 行基类：flex min-h-7 … rounded-lg … pl-2.5 pr-1
grep -a -b -o 'grouped-expanded-group-header' $A    # 分组层：328559469 / 328577175
grep -a -b -o 'purpose-section-list' $A             # 顶层可排序 section 容器（projects/conversations）
```

## 结论对批次1 的回写建议

1. batch-1「无参照项」5 条 → 全部改判「有参照」，其中条目1/2/3/5 建议按差异项（形态不同）登记，条目4 同时登记一处反向事实（ZCode 任务行无焦点圈，插件为增强方）。
2. `03b-sidebar.md` §5「左槽仅 running loader」应补注：仅对分组/普通任务行成立；置顶/时间线行行首槽有 7×7 未读蓝点与 6×6 错误红点（`data-unread-indicator` / `data-error-indicator`）。
3. `03b-sidebar.md` §4「未覆盖」中的「拖拽中任务行样式」「置顶区几何」两条，本轮已从 asar 静态补上主要事实，活体 CDP 复核仍缺。
