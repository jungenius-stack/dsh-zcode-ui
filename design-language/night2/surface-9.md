# night2 · surface-9 · 徽标与计数（未读点 / 待处理胶囊 / 计数徽标 / 数字等宽）

> 深挖员：surface-9。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面：`uiplug/src/client/session-tree.tsx`、`uiplug/src/client/CodexWorkspaceBrowser.tsx`、`uiplug/src/client/channel-api.ts`。
> 前置：已读 `night-audit/APPLIED.md`（loader 14px 批次 18/19 冲突定案、术语批次 4 已落地）与 `README.md`；另核对了 `uiplug/docs/KNOWN-ISSUES.md` §15（状态槽合并 2026-10-14 裁决）与 `docs/ZCODE-INTERACTION-PARITY.md` §1.6.0。本轮不重复报已裁决项。
> 活体（9224）本轮未采样——全部结论为 asar 静态证据，needs-live 三条见 §5。

## 0. 提取方法与可复现命令

```bash
python3 -I - <<'PY'   # asar 头：u32=(4, 8328596, 8328592, 8328585)，文件区基址 8328604
import struct, json
f=open('/Applications/ZCode.app/Contents/Resources/app.asar','rb')
hdr=struct.unpack('<4I', f.read(16)); f.seek(16)
d=json.JSONDecoder().raw_decode(f.read(hdr[3]).decode('utf-8','replace'))[0]
# 提取产物（与 surface-3 同一版本）：
#   /tmp/zc-badge-extract/styles-Dv5E6Odo.js   6,839,502B（组件源）
#   /tmp/zc-badge-extract/styles-NK68EN_n.css    480,065B（编译 CSS）
#   /tmp/zc-badge-extract/IntlProvider.js        979,836B（i18n zh/en）
PY
```

下文偏移量为各产物文件内字节偏移（`grep -aob` / `dd if=… skip=…` 可直接复核）。

## 1. ZCode 徽标与计数全景（本轮新挖，静态源码级）

### 1.1 任务行两变体与本面相关的状态机（styles js）

ZCode 任务行有**两个变体**，徽标/计数规格不一致（此前审计只覆盖 grouped 变体）：

**A. grouped 变体（TaskListItem `Kxt`，js@2344300–2360000）**——状态全部在**右侧 meta 泳道** `ml-auto flex shrink-0 items-center gap-1.5 text-ui-sm text-foreground-subtle`：

```
状态推导 _ot（js@1804319）：
  error   = activity.phase==='error' || (!activity && status==='error')
  unread  = typeof unreadAt==='number'
  loading = activity.phase==='prewarming'||'running'
  → 链：error > unread > loading > none（行首/泳道单一指示的互斥链）

待处理计数 Vet（js@1660211）：
  pendingInteractions = {permissionCount, userInputCount}
  count = permissionCount+userInputCount（0 → null）
  kind  = userInputCount>0 ? 'userInput' : 'permission'
  E = !!pendingInteraction || count!==null   ← 有待处理

渲染（右泳道内）：
  [胶囊槽] pendingInteraction ? <pL 交互徽章> : k ? <nL 注意徽章> : null
  [meta 组  hover 时整组卸载 xe?null:]：
     loading → LoaderIcon size-3.5 animate-spin text-foreground-subtle
     error   → <span flex size-4 center><span size-1.5 rounded-full bg-destructive/>
     unread  → <span flex size-4 center><span size-1.5 rounded-full bg-sky-500 dark:bg-sky-400/>
     !E&&cron/offpeak → 图标 size-3.5（E 时抑制）
     !E      → 相对时间 <span mr-1>（X分钟前，pj）
  胶囊 className：'h-5 border-transparent bg-success/14 px-2 text-ui-base font-medium
                 text-success dark:bg-success/18' + 非拖拽时 'group-hover/task-row:hidden'
  k 文案：count>1 ? t('taskList.attentionCount',{label,count}) : label
         = '{label} · {count}' / 「等待确认 · 3」
```

**B. workspace 变体（`li.group/task-item`，js@2405650–2416000）**——**行首 16px 状态槽**（与本插件同构）：

```
行：group/task-item flex cursor-pointer gap-2 rounded-lg pl-2.5 pr-1 py-1
槽：<div relative flex size-4 shrink-0 items-center justify-center>
      <span flex size-4 center transition-opacity  loading&&animate-spin  pin接管&&hidden>
        error  → h-1.5 w-1.5（6px）rounded-full bg-destructive   data-error-indicator
        unread → size-[7px]（7px）rounded-full bg-icon-blue      data-unread-indicator
        loading→ LoaderIcon size-4（16px）text-foreground-subtle
      </span>
      [悬停/已置顶：pin 钮 ghost icon-xs size-4 rounded-sm p-0 !bg-transparent
       text-foreground-subtle hover:text-foreground，替换指示器]
胶囊/差异统计：内联在标题后（flex-wrap gap-1.5），pL XOR nL（与 A 同款注意徽章 class）
metadata 行：diff 统计(+N -N)·cron/offpeak·时间，data-task-row-metadata
             —— pending(L) 时整行不渲染；悬停/归档确认时 hidden；胶囊本体悬停**不**隐藏
```

**互斥真值（两变体一致的静态事实）**：
1. 槽内 error > unread > loading（`_ot` 三元链）。
2. **胶囊不抑制槽内指示**——A 变体 meta 组内 dot/spinner 三元链不看 E；B 变体槽更不看 L。E 门只管 cron/offpeak/时间/metadata 行。即：待确认 + 运行中 ⇒ 胶囊与转圈**同屏**。
3. 悬停：A 变体胶囊+meta 组一并卸载；B 变体只藏 metadata 行，胶囊与槽常显，pin 接管时槽 `hidden`。

### 1.2 Badge 基座 cva（`mbt`，js@2301634；`nL` = Badge 组件 js@2302768）

```
基座：group/badge inline-flex h-5(20px) w-fit shrink-0 items-center justify-center gap-1
      overflow-hidden rounded-full border border-transparent px-2(8px) py-0.5(2px)
      text-ui-xs(10px) font-medium whitespace-nowrap transition-all
      focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
      has-data-[icon=inline-end]:pr-1.5  has-data-[icon=inline-start]:pl-1.5
      [&>svg]:size-2.5!
variants: default bg-primary text-primary-foreground｜secondary bg-secondary
          destructive bg-destructive/10 text-destructive dark:bg-destructive/20
          outline border-border bg-input/20 text-foreground dark:bg-input/30｜ghost｜link
```

任务行用时以 className 覆盖：文字升 `text-ui-base`(14px)、边框透明、底换绿系（见 §1.1）。

### 1.3 交互徽章 pL（待处理胶囊本体，js@2313453–2317500）

```
壳：relative inline-flex h-5 shrink-0 items-center justify-center overflow-hidden
    rounded-full border border-transparent bg-interaction-confirmation-surface px-2
    text-ui-sm(12px) font-medium text-interaction-confirmation-foreground
可 snooze 时变 <button>：hover:bg-secondary hover:text-foreground
    focus-visible:ring-1 ring-input-border-focused；hover 时文案换成 t('taskList.stopCountdown')
倒计时进度：内层 <span class="zcode-task-interaction-countdown-fill absolute inset-0
    origin-left bg-interaction-ask-fill transition-opacity group-hover:opacity-0">
    CSS 变量 --zcode-interaction-progress / --zcode-interaction-remaining-ms
```

编译 CSS（styles-NK68EN_n.css）：
- `@449770`：`@keyframes zcode-task-interaction-countdown{from{transform:scaleX(var(--zcode-interaction-progress,1))}to{transform:scaleX(0)}}`；`.zcode-task-interaction-countdown-fill{animation:… var(--zcode-interaction-remaining-ms,240s) linear forwards}`；reduced-motion 下停帧 `transform:scaleX(var(--zcode-interaction-progress,1));animation:none`。
- 令牌（css@20950 亮 / @423230 暗，均带 `@supports color-mix` 现代档）：

| token | light | dark |
|---|---|---|
| `--color-interaction-confirmation-surface` | `var(--color-green-50)` = oklch(98.2% .018 155.826) | `color-mix(in oklab, var(--color-green-950) 45%, transparent)` |
| `--color-interaction-confirmation-foreground` | `var(--color-green-700)` = oklch(52.7% .154 150.069) | `var(--color-green-300)` = oklch(87.1% .15 154.449) |
| `--color-interaction-ask-fill` | `color-mix(in oklab, var(--color-green-500) 20%, transparent)`（fallback `#00c75833`） | `#46bf723d`（zai 主题）|
| `--color-success` | `var(--color-green-600)` | `var(--color-green-500)` = oklch(72.3% .219 149.579) |
| `--color-warning` | `var(--color-yellow-500)` | `var(--color-yellow-600)` |

（zai 品牌主题另有一套 hex：light success `#1e8a3e` / dark `#46bf72`，css@433500/@441200。）

### 1.4 分组头计数徽章（`kbt`，js@2309036）

```
kbt = inline-flex min-w-5(20px) shrink-0 items-center justify-center rounded-full
      bg-tag/50 px-1.5(6px) py-0.5(2px) text-ui-sm(12px) font-medium leading-none
      text-foreground-subtle
```
- 渲染点：grouped-group-header 内 `<span class=kbt>{tasks.length+ +!!f}</span>`（js@2371600 附近）。
- `bg-tag/50`：`color-mix(in oklab, var(--color-tag) 50%, transparent)`，`--color-tag` 亮 `var(--color-neutral-200)`(#e6e6e6) / 暗 `var(--color-neutral-700)`(#363636)（css@编译）。
- **无 `tabular-nums`**。分组头基座 `Dbt`：`mb-0.5 flex h-8 items-center gap-1 rounded-lg pl-1.5 pr-1 text-ui-base text-foreground hover:bg-surface-hover`；草稿行工作区标签胶囊同配方（`max-w-24 truncate rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm`，js@2354950）。

### 1.5 数字等宽（tabular-nums）清单

- ZCode **逐元素**加 `tabular-nums`（js 内 80+ 处）：数值计数、百分比、token 用量、日期、文件大小、行号 gutter、diff 统计、倒计时值；数值密集处常与 `font-mono` 并用。**没有任何表面级** `font-variant-numeric` 设定。
- 任务行内：相对时间「X分钟前」**无** tabular-nums；分组计数 kbt **无**；徽章基座**无**。
- 插件侧：`.dcu-wb-collection-count`(:210)、`.dcu-wb-session-time`(:237) 逐元素 tabular-nums + `skin-envelope.ts:62` 对 SURFACE_LIST 全表面设 `font-variant-numeric:tabular-nums`（继承属性设一次）——**插件是 ZCode 实践的超集**。

### 1.6 i18n（IntlProvider.js，zh@173109 / en@659698）

| key | zh | en |
|---|---|---|
| `taskList.permissionTag` | 等待确认 | Awaiting approval |
| `taskList.userInputTag` | 等待确认（与 permissionTag **同文**） | Awaiting approval（同文） |
| `taskList.attentionCount` | `{label} · {count}` | 同左 |
| `taskList.stopCountdown` | 停止计时 | Stop timer |
| `taskList.markAsUnread` | 标记为未读 | Mark as unread |
| `taskList.remoteConnectionUnknown` | 远程连接暂不可用 | Remote connection unavailable |

ZCode **没有** planReview / question / 等待回答 概念（asar 全文 `planReview|plan-review` 0 命中）。

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 2 条）

主战场是 `CodexWorkspaceBrowser.tsx` 的两段 CSS + `session-tree.tsx:164` 一行 JSX。

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | CodexWorkspaceBrowser.tsx:287 `.dcu-wb-pending` + session-tree.tsx:164 | 待处理胶囊形态与配色族 | 裸文字+圆点：无底无圆角无内距；`color:var(--dcu-state-warn-text)`（琥珀 #8a4b00/#ff8a30）；7px 同色圆点 gap-4；12px/16px/400；`data-state="warning"` | 绿系药丸：`h-5 rounded-full border-transparent bg-interaction-confirmation-surface px-2 text-ui-sm font-medium text-interaction-confirmation-foreground`（绿底 12px/500）；计数徽章档 `bg-success/14 dark:bg-success/18 text-success`；**无圆点**（语义由底色/文字承担）；琥珀族在 ZCode 只用于 `remoteConnectionUnknown` 警告徽章（bg-warning-surface，js@2410350）——「等待用户操作」在 ZCode 的语义色是绿不是琥珀 | js@2313453 pL 壳段；js@2344700/2407100 注意徽章 class；css@20950/@423230 令牌；js@2410350 琥珀参照。zcode-theme.ts:51/77 的 AA 实测只覆盖现有琥珀值，换绿系需按 §5 N3 重测 |
| M2 | CodexWorkspaceBrowser.tsx:210,357 `.dcu-wb-collection-count` | 分组计数徽标形态 | 纯文本：`margin-left:auto` + `font-size:var(--dsw-font-size-sm)`(12px) + `font-weight:400` + secondary 色 + tabular-nums；无底无圆角 | 药丸 `kbt`：`inline-flex min-w-5 rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm font-medium leading-none text-foreground-subtle`（20px 最小宽、中性底 50%、6px/2px 内距、500 字重）；位置同为行尾（flex-1 标题推挤，等效 margin-left:auto）；**无 tabular-nums** | js@2309036 kbt；js@2371600 渲染点；css@编译 bg-tag/50；ours :210/:357 |

> M1/M2 均查无既有裁决：03b-sidebar.md 无「胶囊/计数」条目；KNOWN-ISSUES.md 无胶囊配色、计数徽标条目（本轮 grep 0 命中）；PARITY 文档只裁决了位置与优先级。两处落点都集中在单一 CSS 常量/一行 class 内，机械可落地（需同步更新 tests/session-tree.assert.ts、tests/design-system.assert.ts 中对应断言）。

## 3. deviation（触既有裁决，登记不修；共 4 条）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | CodexWorkspaceBrowser.tsx:286 `.dcu-wb-unread` 6px | 未读点直径 | 6px | **两变体双规格**：grouped `size-1.5`=6px；workspace（与本插件同槽架构）`size-[7px]`=7px | KNOWN-ISSUES:886 裁决「ZCode `h-1.5` 同径」取 6px——当时只证到 grouped 变体；本轮补出 workspace 变体 7px 新证据。维持 6px，登记备查 |
| D2 | session-tree.tsx:162-174 提前 return | 胶囊与槽内指示互斥 | pendingInteraction 存在时**只**渲染胶囊，未读点/转圈全抑制 | 胶囊**不抑制**槽内指示（两变体均然；E 门只管 cron/offpeak/时间/metadata 行）——待确认+运行中 ⇒ 胶囊与转圈同屏 | PARITY §1.6.0 第 2 条 + KNOWN-ISSUES:887「优先级互斥…与 ZCode 同序」+ 断言「优先级互斥/仅运行出转圈」已固化现行为；改共存需动裁决与断言，登记 |
| D3 | session-tree.tsx:174 `ZIconLoading size={14}` | 运行中转圈尺寸 | 14px | 同为双规格：grouped `size-3.5`=14px；workspace `size-4`=16px | APPLIED「批次 18/19 冲突维持 14px」（依据 grouped task-row:246-247）；本轮补出 workspace 变体 16px 新证据，维持 14px 登记 |
| D4 | —（插件无 error 档） | 错误点规格 | 无（DSH 宿主无 error 相位） | workspace 变体 `h-1.5 w-1.5 rounded-full bg-destructive`（6px 红）、grouped 同 6px `bg-destructive`，且在 `_ot` 链中**高于**未读 | PARITY §1.6.0「error 档在 DSH 无对应，不虚构」；规格存档待宿主提供 error 相位时直接用 |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 未读点=行首 16px 槽居中圆点 | `.dcu-wb-unread` 6px 圆点绝对定位（:286）+ `--dcu-wb-dot-left` 槽位变量 | workspace 变体 `size-4` 槽 + 圆点同构（js@2411330）；grouped 变体同径 6px | :286；js@2411330 |
| A2 悬停/聚焦时 pin 接管槽位、未读/转圈让位 | :249-251 pin 常显门控 + hover `visibility:hidden` | B 变体 `De&&hidden` + pin 钮替换（js@2411300）；A 变体 hover 整组卸载（同效） | :249-251；js@2411300 |
| A3 槽内互斥链 未读 > 运行中 | session-tree.tsx:166→174 顺序分支 | `_ot`：unread 先于 loading（js@1804319）；error 档见 D4 | session-tree.tsx:166-174；js@1804319 |
| A4 悬停隐藏待处理胶囊 | :241 hover/focus-within/menu-open `visibility:hidden` | grouped 变体 `k&&!xe` / `group-hover/task-row:hidden`（js@2344700）；workspace 变体不隐藏（ZCode 两变体自相矛盾，ours 取 grouped 语义，与「胶囊是行动号召」注释一致） | :241；js@2344700/2412900 |
| A5 有待处理时时间隐藏 | :241 `.dcu-wb-session:has(.dcu-wb-pending) .dcu-wb-session-time{display:none}` | `E?null:time` / metadata 行 `L?null:`（js@2344900/2412900） | :241；js@2344900 |
| A6 胶囊右侧泳道 + 行内预留 | absolute right:10px + `padding-right:112px`（:286-287） | A 变体右泳道 ml-auto（gap-1.5）；B 变体内联标题后——位置语义同「右侧」，实现为本仓既有绝对定位架构 | :286-287；js@2344600/2412800 |
| A7 标记未读菜单项 | sessions.markUnread/markRead + Eye/EyeOff（session-tree.tsx:77） | `taskList.markAsUnread` 标记为未读，TaskActionMenuContent 同位（js@2399700） | session-tree.tsx:77；IntlProvider@zh |
| A8 计数右对齐 | `.dcu-wb-collection-count{margin-left:auto}` | flex-1 标题推挤至行尾（等效） | :210；js@2371600 |
| A9 时间/计数 tabular-nums | :210、:237 逐元素 + skin-envelope.ts:62 表面级 | ZCode 逐元素 80+ 处（§1.5）——ours 为超集增强（kbt 计数、任务行时间无 tabular） | skin-envelope.ts:62；js tabular-nums 清单 |
| A10 置顶/取消置顶文案 | sessions.pin/unpin（批次 4 已落地） | `taskList.pin/unpin` 置顶任务/取消置顶任务 | APPLIED.md §一批次 4；IntlProvider |
| A11 胶囊文案「等待确认」 | sessions.waitingApproval='等待确认'（locales.ts:170） | `taskList.permissionTag/userInputTag`='等待确认'（两 key 同文） | locales.ts:170；IntlProvider@173109 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| W1 `sessions.planReview`「计划待审」 | **无 ZCode 参照**：ZCode 无 plan-review 概念；且两个 kind 共用同一文案，插件三档标签是产品超集。保留 | asar styles js `grep -aob "planReview\|plan-review"` 0 命中；IntlProvider 搜 `planReview` 0 命中 |
| W2 `sessions.waitingAnswer`「等待回答」 | **无 ZCode 参照**：`Vet` 只产 userInput/permission 两 kind，无 question 类徽章 | IntlProvider `taskList\.` 全键罗列无 question/answer；js `question` 无徽章消费点 |
| W3 悬停卡任务计数（workspace-hover-card.tsx:26-38 `workspace.taskCount/taskSummary`「{count} 个任务 · {unreadCount} 条未读」） | **无 ZCode 参照**：ZCode 无工作区悬停计数卡；其任务行 tooltip = 远程图标+路径+`·`+diff 统计（js@2354200 `Ky` 段）。规格存档，不产 diff | IntlProvider 搜 `taskCount/taskSummary` 0 命中；`个任务` 12 处全部为命令名/删除结果等无关键（§提取记录 @46246/48014/48726…） |
| W4 行内 diff 统计 +N −N（js@2410500 `be`，`text-diff-added/removed text-ui-base`，pending 时隐藏） | 插件任务行无此元素——功能缺口非样式差，规格存档（`Ibt`: `+${added}`/`-${removed}`，js@2317400） | js `Nnt/Ibt` 定义与两变体消费点；插件 CodexWorkspaceBrowser 无 diff 计数渲染（grep 0） |
| W5 草稿行绿点 + 工作区标签胶囊（js@2354950 Xxt：`size-1.5 rounded-full bg-green-500 dark:bg-green-400` 置于 `relative size-6` 槽、hover 换关闭钮；标签 `max-w-24 rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm`） | 插件无草稿行概念——规格存档 | js Xxt 全段；插件无 draft 行组件 |
| W6 远程连接「暂不可用」琥珀徽章（js@2410350 pe：nL `bg-warning-surface text-warning-surface-foreground text-ui-xs`） | 插件无远程会话概念——不产 diff；附琥珀徽章规格备查（`--color-warning-surface`=color-mix(warning 12%/16%)，前景 yellow-800/yellow-400） | css@warning-surface 令牌组；js pe 段 |
| W7 snooze 倒计时胶囊（pL：scaleX 进度填充、默认 240s linear、hover 换「停止计时」、canSnooze 变按钮） | 插件无倒计时/暂缓能力——规格存档（§1.3 全量），将来补功能直接用 | js@2313453-2317500 全段；css@449770 keyframes |
| W8 DSH 宿主 `--dsw-alias-state-business-primary`、`--dsw-font-size-sm` 运行时值 | 静态不可得（宿主注入），插件侧无定义 | uiplug/src 与 node_modules 内 grep 定义 0 命中（仅消费）；→ N2 活体 |
| W9 channel-api.ts 徽标/计数面 | **无此面**：纯数据解析（`running: row.running === true` @channel-api.ts:44），无 unread/pending/计数；ChannelBrowser.tsx 经 session-tree 复用全套徽标链（@132-138） | 文件全文读毕（80 行）；ChannelBrowser 消费点核对 |
| W10 徽章基座 cva / destructive·outline 徽章变体 | 插件无通用 Badge 组件——基座全规格存档于 §1.2 备将来封装 | js@2301634 mbt 全段 |

### needs-live（须 9224 活体定）

| # | 事项 | 说明 |
|---|---|---|
| N1 | 胶囊计数能否落地 | ZCode `Vet` 由 `permissionCount+userInputCount` 产 `{label} · {count}`；插件 `session-host.ts` 的 pending store **无计数字段**（grep 0）。需活体确认 DSH `useSessionStatus` 快照是否带计数；无则 M1 只对齐形态、计数条目关闭 |
| N2 | 未读点实际渲染色接近度 | ours `--dsw-alias-state-business-primary` vs ZCode `bg-icon-blue`(=terminal-bright-blue=sky-500/sky-600) 与 grouped `bg-sky-500 dark:bg-sky-400`——取色复核（点色取角色令牌系 KNOWN-ISSUES:897 已裁决，本项只为记录色差量级） |
| N3 | 绿系胶囊文字 AA | 若按 M1 换 `--dcu-state-success-text`（#176c31/#46bf72，zcode-theme.ts:51/77 已有 ≥4.82:1/≥6.04:1 实测）则直接可用；若照抄 ZCode green-700/green-300 需在 DSH 侧栏底重测 AA |

## 6. 给下一轮的整改建议（不动手，仅排序）

1. M1+M2 一把梭：胶囊段（CodexWorkspaceBrowser.tsx:287 + session-tree.tsx:164 data-state）与计数段（:210/:357）各是单点 CSS，两处 diff 收口；同步改 tests/session-tree.assert.ts、tests/design-system.assert.ts 对应断言。
2. ZCode 徽章基座（§1.2）与琥珀/绿双色徽章规格建议补进 01-design-tokens.md 的「状态色」节（本轮不改文档）。
3. D1–D3 的「双规格」事实（grouped vs workspace 变体）建议在 PARITY 文档 §4 补一行注记，避免下一轮再当单值对齐（本轮不改文档）。

## 复核（独立复核员，2026-11-03）

> 独立复现声明：asar 头 u32=(4, 8328596, 8328592, 8328585)、文件区基址 8328604 自跑复现，与 §0 一致；三份产物重提取到 /tmp/zc-badge-review-extract/，大小逐字节一致（js 6,839,502B / css 480,065B / IntlProvider 979,836B——asar 内实际文件名为 `IntlProvider-4oW73Zh8.js`，即 §0 所称 IntlProvider.js）。下文 js@n / css@n 均为本轮 `grep -aob` 实测偏移；插件行号为本轮 sed 实读。九项全部亲验，无一照抄深挖员数值。

### M1 待处理胶囊形态与配色 — **verified**
- ours 逐项落实：CodexWorkspaceBrowser.tsx:287 `.dcu-wb-pending` 无 background / 无 border-radius / 无 padding，`color:var(--dcu-state-warn-text)`、`line-height:16px`；`.dcu-wb-pending-dot` 7px 同色圆点；父级 `gap:4px`；session-tree.tsx:164 `data-state="warning"` 逐字。琥珀值 zcode-theme.ts:51（亮 `#8a4b00`）/ :77（暗 `#ff8a30`）实读一致。保留一点：字号是 `var(--dsw-font-size-sm)`，"12px" 是宿主注入的运行时值（与本文 W8 自洽，静态不可证）；`font-weight` 未声明 → 静态可证的是 400。
- zcode 侧逐项落实：pL 起于 js@2313453（`function pL({interaction:e,…`），壳 class 在 js@2315670 命中，与 §1.3 一字不差；`text-ui-sm = calc(14px−2px) = 12px`（css@14257 + `--ui-font-size:14px` css@414650）；令牌实测：亮 surface=green-50=oklch(98.2% .018 155.826)、foreground=green-700=oklch(52.7% .154 150.069)（css@21210/21273），暗 surface=green-950 45% color-mix（fallback oklab(26.6%…)）、foreground=green-300=oklch(87.1% .15 154.449)（css@423270 起，@supports 现代档在）；计数档 `bg-success/14 dark:bg-success/18 text-success`（js@2346100），编译规则 color-mix(in oklab, success 14%/18%)（css@128104/310184）；pL/nL 壳内确无圆点元素。
- 两处措辞要修但不翻案：①「琥珀族在 ZCode 只用于 remoteConnectionUnknown 警告徽章」——在任务行徽章语境成立（pe 徽章 js@2409044 `bg-warning-surface text-warning-surface-foreground text-ui-xs` 实读），但 app 全局另有 4 处 warning-surface 徽章/警示（js@2077905 project-management-reason、@2093501 失败条、@5201451 插件商店风险提示、@6490334 状态映射），原句不限域则过宽；②「zcode-theme.ts:51/77 的 AA 实测只覆盖现有琥珀值」不准确——:43-44 注释同段实测了 success `#176c31 ≥4.82:1` / `#46bf72 ≥6.04:1`（N3 也是这么引的），M1 此句与 N3 相互矛盾，以 N3 为准。
- 证据偏移勘误：M1 证据列所写 js@2344700/2407100 实为 `taskList.attentionCount` 派生行（实测 2344819/2407232）；两处注意徽章 class 实在 js@2346100/2413913。内容均在、引用非精确匹配点。

### M2 分组计数徽标 — **verified**
- ours 落实：CodexWorkspaceBrowser.tsx:210 `margin-left:auto;color:var(--dcu-sidebar-secondary);font-variant-numeric:tabular-nums`、:357 `font-size:var(--dsw-font-size-sm);font-weight:400;padding-left:8px`，两处均无底无圆角（12px 同 M1 保留）。
- zcode 侧逐项落实：kbt 定义 js@2309036 与 §1.4 一字不差，**串内确无 tabular-nums**；渲染点 js@2371680 `<span class=kbt>{tasks.length+ +!!f}</span>`（「2371600 附近」成立）；`bg-tag/50` 编译为 color-mix(in oklab, var(--color-tag) 50%, transparent)（css@130520）；`--color-tag` 亮 neutral-200=oklch(92.2% 0 0) / 暗 neutral-700=oklch(37.1% 0 0)（css@11801/11910）——文档写的 #e6e6e6 与编译 fallback `#e5e5e580` 差一个色阶舍入，无伤结论；「行尾」成立：组头标题包裹层是 `flex min-w-0 flex-1 items-center gap-1`（js@2370147），flex-1 推挤等效 margin-left:auto。
- 测试落点注记：M1 需动断言属实（tests/session-tree.assert.ts:41/100/189 与 tests/design-system.assert.ts:305/526/527 锁了现行为，526/527 连琥珀色值都逐字锁死）；但 `.dcu-wb-collection-count` 在这两份 assert 文件 grep 0 命中——M2 改动其实不触碰它们，§2/§6 把两件事并说宽了。

### D1 未读点直径 — **verified**（只核证据）
KNOWN-ISSUES.md:886 行号精确，确有「（…ZCode `h-1.5` 同径）」裁决；新证据属实：workspace 变体 `size-[7px] rounded-full bg-icon-blue` + `data-unread-indicator`（js@2412796/2412755），grouped 变体 `size-1.5` 三元链（js@2345100–2346000，编译 `size-1\.5{width:calc(var(--spacing) * 1.5)…}` + `--spacing:.25rem` = 6px，css@59100/12096）；插件 6px（CodexWorkspaceBrowser.tsx:286 width/height 6px）。双规格事实成立，登记逻辑自洽。

### D2 胶囊与槽内指示互斥 — **verified**（只核证据）
- 插件侧：session-tree.tsx:162-174 提前 return 实读（pending → 只渲染胶囊）；断言确实固化现行为：tests/session-row-interaction.spec.ts:179「状态槽优先级：未读优先于运行中」与 :192「仅在运行中…画转圈」、tests/session-pending.spec.ts:39 断言 pending 时 `.dcu-wb-unread`/`.dcu-wb-running` 均为 null。
- ZCode 侧：grouped meta 组的 spinner/dot 链只看 `_ot` 不看 E/pendingInteraction（js@2346000–2347000 实读：`A==='loading'?spinner:I?dot`，E 只门 cron/offpeak/时间），workspace 槽同理（js@2412000–2413300）——「待确认+运行中 ⇒ 胶囊与转圈同屏」成立。PARITY §1.6.0 第 2 条逐字在 uiplug/docs/ZCODE-INTERACTION-PARITY.md:108；KNOWN-ISSUES.md:887 行号精确。

### D3 运行中转圈尺寸 — **verified**（只核证据）
session-tree.tsx:174 `ZIconLoading size={14}` 实读；grouped `size-3.5 animate-spin text-foreground-subtle`（js@2346100 附近）与 workspace `size-4 text-foreground-subtle`（js@2412000–2413300）双规格属实；APPLIED.md:45「批次 18/19 冲突……维持 14px 不改（task-row.tsx:246-247）」逐字。

### D4 error 档规格 — **verified**（只核证据）
workspace `h-1.5 w-1.5 rounded-full bg-destructive` + `data-error-indicator`（js@2412639）6px 红，grouped 同 6px（I 链 `A==='error'?'bg-destructive'`），`_ot` 链 error 最高（js@1804319 逐字：`phase==='error'||(!t&&e.status==='error')?…`）；PARITY §1.6.0「error 档在 DSH 无对应，不虚构」在 :108；插件 SessionState（session-tree.tsx:162-175）确无 error 分支。

### N1 胶囊计数 — **verified**（静态前提成立；活体问题维持开放）
静态半边亲验：Vet 产 count（js@1660145，`permissionCount+userInputCount`，0→null）；插件 session-host.ts `grep -i count` 0 命中，`PendingInteractionSnapshot = ReadonlyMap<string,{kind?:unknown}>` 只有 kind（session-host.ts:23）。「DSH useSessionStatus 快照是否带计数」本就只能活体定，与文档定性一致。

### N2 未读点色接近度 — **verified**（静态前提成立；活体取色维持开放）
ours `--dsw-alias-state-business-primary`（:286）；ZCode `--color-icon-blue:var(--color-terminal-bright-blue)`（css@14892），terminal-bright-blue 亮 sky-500 / 暗 sky-600（css@18823/419681）——N2 括号内「=terminal-bright-blue=sky-500/sky-600」逐字成立；grouped `bg-sky-500 dark:bg-sky-400`（js@2345100）；KNOWN-ISSUES.md:897 点色裁决行号精确。色差量级需 9224 活体，文档自标未采样。

### N3 绿系胶囊文字 AA — **verified**
zcode-theme.ts:51 `--dcu-state-success-text:#176c31` / :77 `#46bf72` 行号精确；:43-44 注释「亮 success #176c31 ≥4.82:1 / 暗 #46bf72 ≥6.04:1」逐字；green-700=oklch(52.7% .154 150.069) / green-300=oklch(87.1% .15 154.449) 值存在（css@8116/7941）。「照抄 green-700/green-300 需在 DSH 侧栏底重测」判断正确——这两个值没在本仓底色上测过。

### 复核顺带发现（不属差异表，登记备查）
1. **§1.3 令牌表 `--color-warning` 行亮暗写反**：实测亮 `var(--color-yellow-600)`（css@22396）、暗 `var(--color-yellow-500)`（css@424874），文档写亮 yellow-500 / 暗 yellow-600。
2. W9 称 channel-api.ts「80 行」，实测 `wc -l` = 79（文件以 \n 结尾，实为 79 行）；实质结论成立：全文件 0 处 unread/pending/count，:44 `running: row.running === true` 逐字。
3. §1.5「tabular-nums 80+ 处」实测 113 处（`grep -aob tabular-nums | wc -l`）；styles js 内 `font-variant-numeric` 0 命中，「无表面级设定」成立。
4. 六组 i18n 键值逐字核对通过（zh@173060 起 / en@659644 起）：permissionTag 与 userInputTag 同文「等待确认」/「Awaiting approval」、attentionCount=`{label} · {count}`、stopCountdown=停止计时/Stop timer、markAsUnread=标记为未读/Mark as unread、remoteConnectionUnknown=远程连接暂不可用/Remote connection unavailable；IntlProvider 内 `planReview|taskCount|taskSummary` 均 0 命中（与 W1/W3 一致）。

**复核结论：M1/M2、D1–D4、N1–N3 九项全部 verified，无 unconfirmed；上述措辞级勘误（M1 琥珀限域与 AA 覆盖、M2 测试落点、§1.3 warning 行亮暗）不推翻任何差异项结论。**
