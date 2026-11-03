# night2 · surface-12 · 频道定时归档页（频道浏览器 / 定时任务树 / 归档确认与整组归档 / 品牌图标）

> 深挖员：surface-12。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面：`uiplug/src/client/ChannelBrowser.tsx`、`ScheduleBrowser.tsx`、`schedule-group-actions.ts`、`channel-brand.tsx`，及其共享依赖 `session-tree.tsx`（GroupHead/SessionRow）、`session-row-actions.tsx`（SessionModals）、`archive-confirm.ts`、`CodexWorkspaceBrowser.tsx`（WORKSPACE_TREE_STYLE）、`locales.ts`。
> 前置：已读 `night-audit/APPLIED.md`（归档确认弹窗批次定案、批次 20 断言锁 ScheduleClock 16×16）与 `README.md`；另核 `KNOWN-ISSUES.md` §3.1（频道/定时页签分段控件裁决）、§55.4（channel-brand 商标色登记）、§63（归档钮偏移已修）与 `ZCODE-INTERACTION-PARITY.md` §1.1（元信息行裁决）。本轮不重复报已裁决项。
> 活体（9224）本轮未采样——全部结论为 asar 静态证据，needs-live 三条见 §6。

## 0. 提取方法与可复现命令

```bash
# asar 头（与 surface-3/9 同一版本）：u32=(4, 8328596, 8328592, 8328585)，文件区基址 8328604
# 复用 /tmp/zc-badge-extract/ 三份产物（2026-11-03 提取，方法同 surface-9 §0）：
#   styles-Dv5E6Odo.js 6,839,502B / styles-NK68EN_n.css 480,065B / IntlProvider.js 979,836B
cd /tmp/zc-badge-extract
grep -aob "function ySt\|function Jht\|function Xht\|function NDn\|function pTt\|zcode-default-group-cron\|automations.empty" styles-Dv5E6Odo.js
dd if=styles-Dv5E6Odo.js bs=1 skip=2374943 count=4300 | tr '\n' ' '   # ySt 粘性分组头
dd if=styles-Dv5E6Odo.js bs=1 skip=2056400 count=26000 | tr '\n' ' '  # archives 组+页
dd if=styles-Dv5E6Odo.js bs=1 skip=4990000 count=80000 | tr '\n' ' '  # automations 页
node -e "const s=require('fs').readFileSync('IntlProvider.js','utf8');
  console.log([...s.matchAll(/\"(archives|automations|taskGroup)\.[a-zA-Z.]*\":\`([^\`]*)\`/g)].map(m=>m[1]+' => '+m[2]).join('\n'))"
```

下文 `js@N` = styles-Dv5E6Odo.js 字节偏移（`grep -aob`/`dd skip=N` 直接复核）；`intl@` 为 IntlProvider.js 内。**注意 grep 偏移是字节，node 字符串切片是 UTF-16 下标，中文区必须用 dd。**

## 1. ZCode 本面全景（本轮新挖，静态源码级）

### 1.1 定时任务面

ZCode 的定时任务在**两处**出现：侧栏分组列表的「定时任务」默认组 + automations 设置页。

**A. 侧栏分组头（in-flow，js@2368978 消费点 + js@2308666 定义）**

```
Dbt = mb-0.5 flex h-8 items-center gap-1 rounded-lg border border-transparent pl-1.5 pr-1
      text-ui-base text-foreground transition-[background-color,border-color,box-shadow]
      hover:bg-surface-hover          ← 透明边框（彩色分组时染成 border-{color}-500/70）
Obt（标题钮）= min-w-0 max-w-full cursor-pointer truncate rounded-sm px-1 text-left text-foreground
      focus-visible:ring-1 ring-input-border-focused
kbt（计数）= inline-flex min-w-5 rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm font-medium
      leading-none text-foreground-subtle      （js@2308666 同一 var 块）
头内顺序：色点钮(size-5 rounded-full hover:bg-hover) ‖ 标题+箭头 ‖ kbt 计数 ‖ 新建任务钮
箭头：collapsed→js / expanded→ks，均 `size-3.5 shrink-0 text-foreground-subtlest`（js@2371300 附近）
头菜单（XI w-44）：新建任务 ‖ (非默认组)重命名 ‖ 更改颜色子菜单 ‖ (非默认组)取消分组
```

**B. 粘性克隆（ySt，js@2374943）**：滚动时同款头浮在列表顶部——`data-grouped-sticky-header` 包一层 `px-2 pb-1`；克隆头比 in-flow 多 `border border-border bg-background shadow-sm` + `hover:border-border-hover`（浮层需要实底）。容器 xSt（js@2378602 `bSt=150`）：`transition-[opacity,transform] duration-150 ease-out`，`-translate-y-1 opacity-0 → translate-y-0 opacity-100`，150ms 后卸载。

**C. 默认定时组（Rht，js@2053046）**：`zcode-default-group-cron`（title==='cron'）→ i18n `taskGroup.cron`；显示名走 `LL(group,{cron: t('taskGroup.cronGroupName')})` = 「定时任务 / Scheduled tasks」、闲时组 = 「闲时任务 / Idle-time tasks」（intl@15892 附近）。默认组隐藏「取消分组」但保留色点/颜色菜单——**组头没有定时图标**（色点即身份）。

**D. 任务行 cron 图标**（js@2346686/2414902 两变体一致）：`Bs`（cron）/`Rc`(off-peak)，`size-3.5 shrink-0`（14px），aria-label=`taskList.cronTaskLabel`（「定时任务」/「Scheduled task」）/ `offPeakTaskLabel`（「闲时任务」），挂右侧 meta 泳道时间前，`E`（有待处理）时抑制；样式为 lucide 描边语言（automations 页同族图标全部显式 `strokeWidth:1.33`，见 dd@4990000 段）。

**E. automations 页**（js@4990000–5030000）：

```
页签（tab scheduled/idle）：button rounded-full px-3 py-1 text-ui-base font-medium
  选中 bg-selected text-foreground / 未选 text-foreground-subtle hover:bg-hover  （dd@5019000 段）
状态筛选（filter all/inProgress/completed/failed）：rounded-full px-2.5 py-0.5 text-ui-sm font-medium
  同款选中态，aria-pressed
任务卡（role=button）：group relative flex gap-3 rounded-xl border border-card-border
  bg-background p-3 text-left transition-colors；completed→opacity-60，否则 hover:bg-hover；
  focus-visible:ring-2 ring-input-border-focused
  标题 truncate pr-12 text-ui-base font-medium leading-5；prompt 预览 line-clamp-2 h-10 subtle
  meta 行：lifecycle 徽标（failed=裸 text-destructive+图标 size-4 strokeWidth1.33；
    下次运行 chip=rounded-md bg-success/10 text-success，paused/completed 降 opacity-40）+
    计划文案 chip=rounded-md bg-surface px-1.5 py-0.5 subtle
  操作钮：absolute right-3 top-3，size-6 rounded-md，md:hover 才 opacity-100，
    data-[state=open]:bg-hover+opacity-100；busy 时 $O spinner size-3.5
卡菜单（w-[190px]）：立即运行 / 重新启动 / 暂停·继续 / 编辑定时任务 / ─ / 删除
  删除项：`!text-destructive data-[highlighted]:!bg-menu-hover data-[highlighted]:!text-destructive
  focus:!text-destructive [&_svg]:!text-destructive`（js@5003400 段）
空态（data-automations-empty-state，js@5025771）：
  flex h-[226px] w-full items-center justify-center rounded-2xl border border-card-border
  bg-background px-4，内层 translate-y-2 flex-col items-center gap-5：
  标题 p text-ui-base font-medium leading-5 text-foreground-subtlest（还没有定时任务）
  + 按钮行 flex-wrap gap-3（去会话中创建 / 手动创建）
筛选空（PDn js@5005479）：rounded-[10px] border border-card-border px-3 py-3 text-ui-base
  text-foreground-subtle（没有符合条件的任务）
加载：flex mt-8 h-40 items-center justify-center + spinner size-5
错误：一律 toast C3（position top-center、variant info、durationMs 8e3/4e3、可带 actionLabel）
上限：automations.length>=20 → 触发 error.createLimit toast（js@5014309 段）
删除确认（ct，js@5015226 段）：y({presentation:'automation-confirmation',
  title:'删除定时任务', description:'确定删除“{title}”？此操作无法撤销。',
  confirmLabel: common.delete, confirmVariant:'destructive', showKeyboardHints:!1}) && I(...)
```

**F. 确认弹窗壳**（AlertDialog 基元，js@2066800 段——project-management 与 automation-confirmation 共用一族）：
```
overlay：fixed inset-0 z-50 bg-black/60 supports-backdrop-filter:backdrop-blur-xs fade-in/out duration-100
content：fixed 居中 z-50 grid gap-5 rounded-2xl border-none bg-popover/98 p-5 shadow-2xl sm:max-w-md
title：text-ui-lg font-semibold；description：text-ui-base leading-6 text-foreground-subtle
footer：flex flex-col-reverse gap-2 sm:flex-row sm:justify-end；action=variant(destructive)、cancel=outline
```
`confirmVariant:'destructive'` 调用现场共 4+ 处：automations 删除 js@5015226、offPeak 弃稿 js@4881198、offPeak 删除、archives 批量删除 js@2057142——**ZCode 确认弹窗的确认钮一律 destructive 实心**。

### 1.2 归档面（archives，js@2056400–2064600）

ZCode 有整页「归档管理」（`archives.nav` 归档管理 / `archives.title` 已归档的会话）：

```
页头：h2 text-ui-xl font-medium + 「全部删除」钮 variant=ghost
  className=`bg-destructive-surface text-destructive-surface-foreground hover:bg-destructive-surface`
  + Trash2 图标 size-4（js@2062383）
筛选行：搜索框（placeholder 搜索已归档会话）+ 排序下拉（更新时间/创建时间）+ 项目下拉
组（Jht js@2058027）：折叠头 = ghost 钮 w-full justify-start gap-2 px-0 font-medium
  [Folder 图标 size-4 subtle] [标题 truncate] [箭头 size-3.5 subtle，group-data-[state=open]/button:rotate-90]
  头右侧：计数为**纯文本** `shrink-0 text-ui-sm text-foreground-subtle`「{count} 个会话」（非药丸！）
  组菜单：全部取消归档 / 全部删除（variant:'destructive'）
组体：divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface px-4
  行：flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap
    标题 truncate text-ui-base font-medium + <time> text-ui-sm subtle
    操作 ml-auto：ghost icon-sm 删除（Trash2 size-4 subtle）+ secondary「取消归档」钮
  分页：初始 50 条（l=50），「显示更多」ghost my-2 w-full，+50/次
状态行（js@2064100 段）：
  error → role=alert flex flex-wrap items-center gap-3 text-ui-base text-destructive + Retry outline 钮
  busy  → role=status p text-ui-sm text-foreground-subtle（正在处理…）
  result→ role=failed?alert:status p text-ui-sm text-foreground-subtle（成功X 失败Y 跳过Z）
  loading→role=status p py-8 text-ui-base text-foreground-subtle
  empty → p py-12 text-center text-ui-base text-foreground-subtle（暂无已归档会话/没有匹配的归档会话）
批量删除确认：confirmVariant:'destructive'（js@2057142）＋结果行汇报（archives.result）
```

### 1.3 频道面（bots 对话框，js@2497812–2515000）

ZCode **没有侧栏频道会话列表**——频道 UI 是设置里的 BotsDialog：

```
provider 注册表 Hwt（js@2497812）：weixin/feishu/lark/telegram(均 implemented:!0)、
  dingding(DingTalk,!1)、discord(!1)、wecom(!1)、webhook(!0)——注意 id 是 `dingding` 不是
  `dingtalk`；无 qq、无 slack；webhook 是正式 provider。
品牌图标 yR（js@2507329）：telegram/weixin/feishu|lark/dingding/discord/wecom →
  <img src=@2x PNG aria-hidden className="size-4 object-contain">；webhook→Cre 图标；
  兜底→Cs 图标。**全部是位图资产，ZCode 没有这些品牌的手绘 SVG。**
连接状态点 pTt（js@2507713）：error→bg-destructive；polling|connected→bg-success；
  disabled→bg-foreground-subtle；其余→bg-border（4 色档）
行内重命名（gTt，js@2508500 段）：隐形镜像 span（text-ui-lg font-medium px-1 whitespace-pre）
  量宽撑 input；input truncate rounded-sm px-1 py-0 text-ui-lg font-medium
  hover:bg-hover focus-visible:ring-1 ring-input-border-focused；placeholder=回退名
```

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 5 条）

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | ScheduleBrowser.tsx:175（归档整组确认钮）、session-row-actions.tsx:111（删除会话确认钮） | 确认弹窗确认钮形态 | `Button variant="outline" className="dcu-wb-delete-button"`——描边钮+红字（`.dcu-wb-delete-button{color:var(--dcu-state-error-text)!important}`，CodexWorkspaceBrowser.tsx:295） | 确认弹窗确认钮一律 **destructive 实心**：`confirmVariant:'destructive'` 4 处调用现场（automations 删除 js@5015226、offPeak 弃稿 js@4881198、offPeak 删除、archives 批量删除 js@2057142）；本仓单会话归档弹窗已是实心红（archive-confirm.ts:33 `--dcu-state-error-fill`+#fff）——同一屏两种确认钮并存 | DSH Button 原语只有 outline/primary/tooltip 三 variant（node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js `variant: "outline"|"primary"|"tooltip"`，无 destructive），落地走 class 复用 archive-confirm 配方；`!important` 预算可借此一并消掉 |
| M2 | session-tree.tsx:216-224（GroupHead，频道/定时树共用） | 分组头无展开箭头 | 只有 icon 槽+标题+actions，展开态仅靠 aria-expanded；视觉上无任何折叠指示 | 侧栏分组头箭头 `size-3.5 shrink-0 text-foreground-subtlest`（收起 js / 展开 ks，js@2371300 段）；归档组头箭头带 `transition-transform group-data-[state=open]/button:rotate-90`（js@2058700 段）——两处 ZCode 折叠组头都有箭头 | GroupHead 为三树共用：箭头经新 prop 只对频道/定时两个调用点开启（ChannelBrowser.tsx:126、ScheduleBrowser.tsx:125），工作区树保持平铺语义不动 |
| M3 | ScheduleBrowser.tsx:125-151、ChannelBrowser.tsx:126（GroupHead 调用点） | 分组头无会话计数 | 组头只显示标签，数量不可见（要展开数行） | 每个分组头尾部必有 kbt 计数药丸：`min-w-5 rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm font-medium leading-none text-foreground-subtle`（js@2308666 定义、js@2371500 渲染 `{tasks.length}`）；归档页组头用纯文本 `text-ui-sm text-foreground-subtle`（js@2059000 段）——侧栏场景取 kbt | 数据现成（`group.sessions.length`）；药丸规格与 surface-9 M2（`.dcu-wb-collection-count` 升药丸）同源，建议两处一次收口；`bg-tag/50` 在侧栏底上的等值需按 surface-9 §5 N3 同路重测 |
| M4 | ScheduleBrowser.tsx:66-68（ScheduleClock） | 定时组头图标语言 | 实心自绘 path（fill 圆环+指针，viewBox 16） | ZCode 全站 lucide 描边：automations 页图标族显式 `strokeWidth:1.33`（dd@4990000 段）、任务行 cron 图标 `size-3.5` 同族（js@2346686）；且 zcode-icons.tsx:3-7 本仓自立原则「ZCode 全站使用 Lucide，混入宿主图标会让同一屏出现两套图标语言」——实心钟与旁边 ZIconSettings/ZIconArchive（lucide）不同语言 | 具体 lucide 名（Clock/CalendarClock/Timer）静态未证（见 §6 N1）；16×16 外框尺寸不变，落地下须同步 batch-20 断言（tests/night-audit-batch-20.assert.mjs:153-157 锁 `viewBox="0 0 16 16"` 字面量，需带日期注释更正，锁的是尺寸非风格） |
| M5 | ScheduleBrowser.tsx:191（归档进行中）、session-row-actions.tsx:113（删除进行中） | busy 进度文案借错误样式 | `<div className="dcu-wb-error" role="status">`——dcu-wb-error 的语义色是 `--dcu-state-error-text` 红字（zcode-theme.ts:197-198），进度消息被渲染成错误 | ZCode busy/working 态一律中性弱化：`role=status` + `text-ui-sm text-foreground-subtle`（archives working js@2064200 段）；error 才用 text-destructive 且 role=alert——role 与色严格成对 | 改法：busy 行换 `dcu-state--empty`/中性 class（或新 `.dcu-wb-busy`），role=status 保留；zcode-theme.ts:197 的 `.dcu-state` 族已有空态档可直接复用 |

> M1–M5 均查无既有裁决：KNOWN-ISSUES.md grep「归档整组|确认钮|destructive|chevron|箭头|计数|ScheduleClock|busy」无命中（§63 只裁归档钮偏移、§29 只裁运行中槽位）；PARITY §1.1 只裁行内元信息。M2/M3 落点在 GroupHead 加可选渲染，M1/M5 是单点 class，机械可落地（需同步 tests/session-tree.assert.ts、tests/design-system.assert.ts、tests/night-audit-batch-20.assert.mjs 对应断言）。

## 3. deviation（触既有裁决，登记不修；共 4 条）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | session-tree.tsx:219（GroupHead 滚动行为） | 分组头粘性 | 随树滚走 | 侧栏分组头滚动时以粘性克隆驻留：`data-grouped-sticky-header` + `border border-border bg-background shadow-sm` 实底 + 150ms opacity/translate 进出（ySt js@2374943、xSt bSt=150 js@2378602） | 粘性壳涉及 `.dcu-wb-tree` 滚动容器与三树共享布局，跨 surface-2 域；且 DSH 侧栏窄幅下粘性头会长期占据 32px。规格存档，不修 |
| D2 | session-tree.tsx:221 + CodexWorkspaceBrowser.tsx:317（`.dcu-wb-project-title`） | 分组头标题色 | `--dcu-sidebar-secondary`（侧栏三档中间档） | ZCode 分组头标题 `text-foreground` 全前景（Dbt/Obt js@2308666） | APPLIED §二「侧栏三档文字 68/56%」已裁决维持；不改 |
| D3 | ScheduleBrowser.tsx:76-79 + CodexSidebar.tsx:160（`.dcu-schedule-views`） | 定时页签形态 | 分段控件（`--dcu-surface` 底+1px 边框+radius-lg，选中底色、500 字重两态同权） | automations 页页签是**药丸**：`rounded-full px-3 py-1`，选中 `bg-selected`，无边框容器（dd@5019000 段） | KNOWN-ISSUES §3.1 已裁决「任务频道/定时页签 = ZCode 分段控件」并落地现形态；药丸是 automations **设置页**模式，非侧栏场景，不回改 |
| D4 | channel-brand.tsx 全文件 | 品牌图标介质 | 手绘 SVG（16×16，`dcu-wb-brand` class） | `yR` 用 @2x PNG 位图 `size-4 object-contain`（js@2507329）；ZCode 无这些品牌的手绘 SVG | KNOWN-ISSUES §55.4 已把 channel-brand 20 处 fill 显式登记为「第三方商标色」例外；介质跟随登记维持。尺寸/aria-hidden 已对齐（见 §4 A8） |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 分组头基座几何 | `.dcu-wb-project-head{height:32px;border-radius:var(--dsw-radius-lg)}` + hover/menu-open 底 `--dcu-sidebar-selected` + feedback 档过渡（CodexWorkspaceBrowser.tsx:214-215） | Dbt `h-8 rounded-lg` + `hover:bg-surface-hover` + `transition-[background-color,…]`（js@2308666） | :214-215；js@2308666 |
| A2 组菜单破坏性项标记 | schedule-group-actions 菜单 `danger:true`（ScheduleBrowser.tsx:105）；sessionMenuItems delete `danger:true`（session-tree.tsx:99） | archives 组菜单删除项 `variant:'destructive'`（js@2059700 段）、卡菜单删除项 `!text-destructive`（js@5003400 段） | ScheduleBrowser.tsx:105；js@2059700 |
| A3 菜单图标 16px | 组菜单 ZIconSettings/ZIconArchive size={16}（ScheduleBrowser.tsx:103/105，batch-20 断言锁定） | 菜单项 `span size-5 槽 + 图标 size-4`（js@5003400 段）＝16px | ScheduleBrowser.tsx:103；js@5003400 |
| A4 ⋯ 锚钮 | ZIconMore=MoreHorizontal 16px（zcode-icons.tsx:44；ScheduleBrowser.tsx:149） | 组头/归档组菜单锚 `qs size-4`（MoreHorizontal，js@2059900/5003200 段） | zcode-icons.tsx:44；js@2059900 |
| A5 单会话归档确认弹窗 | useArchiveConfirm → 实心红确认钮 + 遮罩 48% + Esc/焦点管理（archive-confirm.ts:24-35） | 确认弹窗 confirmVariant destructive + AlertDialog 壳（§1.1 F）；2026-10-30 真机验收通过 | APPLIED §五；archive-confirm.ts:33 |
| A6 相对时间右泳道 | formatCompactTime 分档 justNow/分钟/小时/…（hover-tip.ts:24-43），行右 absolute（CodexWorkspaceBrowser.tsx:237） | 任务行相对时间挂右 meta 泳道（PARITY §1.1「元信息」行裁决） | hover-tip.ts:41；PARITY §1.1 |
| A7 空态/错误语义 role | `dcu-wb-empty`（ScheduleBrowser.tsx:121、ChannelBrowser.tsx:121）；错误 `role="alert"`（:120） | archives empty p + error `role=alert`、busy/result `role=status`（js@2064100 段）——role 成对本就一致 | ScheduleBrowser.tsx:120-121；js@2064100 |
| A8 频道品牌图标尺寸/无障碍 | 16×16 + `aria-hidden="true"`（channel-brand.tsx 各分支） | `img size-4 aria-hidden`（yR js@2507329） | channel-brand.tsx:4；js@2507329 |
| A9 部分失败逐项续跑+结果汇报 | archiveScheduleGroup 逐项 try/catch、failedIds 重试（schedule-group-actions.ts:13-21；ScheduleBrowser.tsx:178-186） | archives 批量逐项执行、skipped/failed 计数、result 行汇报（js@2057000-2057200 段）——语义同构 | schedule-group-actions.ts:13-21；js@2057100 |
| A10 频道分组本地化命名 | channelLabel 走 locales channel.*（ChannelBrowser.tsx:48-56：钉钉/飞书/Lark/微信/企业微信/QQ/Telegram） | Hwt label 为英文名（Weixin/Feishu/…），实际展示名来自用户 bot 命名（gTt）——ZCode 无中文渠道名先例，插件本地化为产品超集 | ChannelBrowser.tsx:48-56；js@2497812 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| W1 侧栏「频道会话列表」 | **ZCode 无此面**：ChannelBrowser 整体是 DSH 特有组合；ZCode 频道 UI 只在 BotsDialog（§1.3）。行/菜单/悬停/空错全部复用任务树规格（surface-2/9 已覆盖），本面仅存分组头（M2/M3）与品牌图标（D4/A8）两个新差异点 | styles js grep -aob `channelSession|channel-session|im:|imChannel|channelsSidebar|ChannelList|channelList`：前四者 0 真命中（`im:` 4 处全是 HTML 实体表/语言映射误报，dd 复核），后三者 0 命中 |
| W2 `dcu-wb-empty` 空态形态（caption 12px 左对齐，CodexWorkspaceBrowser.tsx:288/317） | **无侧栏空列表先例**。ZCode 三种空态存档备将来：①侧栏空组=可拖放按钮（`taskGroup.emptyDropZoneAction` + Plus size-3.5 + hover:bg-surface-hover，js@2352900 段，语义是「拖任务进来」）；②归档页空=居中 `py-12 text-center text-ui-base text-foreground-subtle`（js@2064400 段）；③automations 空=226px 边框卡+双按钮（js@5025771）。三者没有一个与「窄栏树空态」同构，维持现状不产 diff | js grep `taskGroup.empty`(js@2353088)/`data-automations-empty-state`(dd@4990000 段)/`暂无已归档`（中文仅在 IntlProvider，UI 侧走动态键 `t(\`empty\`)`） |
| W3 `dcu-wb-error` 错误横幅（透明底+红字，zcode-theme.ts:197-198） | **侧栏无错误态先例**；ZCode 两模式存档：①归档页 inline `text-ui-base text-destructive`+Retry outline 钮（js@2064100 段）；②automations 全部走 toast（top-center/info/带 action）。插件频道树 4s 轮询自愈，Retry 无必要——维持，规格存档 | js `archives.loadFailed`(经 `t()` 动态消费)、`automations.error\.` 全部经 `C3(` toast 调用（dd@5003000 段逐处核对） |
| W4 `channels.empty`/`schedule.empty` 单行文案 | ZCode automations.empty 是「标题+描述+按钮」两段式（intl@5025771 段）；窄栏单行是本仓空间权衡。无同构参照，不产 diff | IntlProvider `automations.empty.title/description/createManually` 全文提取 |
| W5 schedule-group-actions.ts | **无 UI 面**：纯批量归档迭代逻辑（22 行）。ZCode 无「整组归档」能力（侧栏组菜单只有新建/重命名/颜色/取消分组，js@2371600 段）——该菜单能力集是插件产品超集；批量结果汇报语义已对齐（A9） | js grep `taskGroup.ungroup|taskGroup.renameAction` 消费点全读；无 archive-group 类调用 |
| W6 provider 注册表差异 | ZCode：`dingding`（拼写不同）、有 `webhook`、带 `implemented:!1` 灰置未实现渠道；插件：`dingtalk` 拼写、多 qq/slack、无 webhook。产品能力差异非样式差，存档 | js@2497812 Hwt 全文；locales.ts:92-98 CHANNEL_LOCALE_KEYS 全文 |
| W7 bots 行结构与连接状态点 | 插件频道行无连接状态概念（channel-api 只给 running）。pTt 四色档（error→destructive、polling/connected→success、disabled→foreground-subtle、else→border，js@2507713）与行内重命名镜像 span 规格（gTt js@2508500 段）存档，宿主未来提供连接态时直接用 | js@2507293–2508900 全段 dd 读毕 |
| W8 automations 页整页规格 | 插件 `overviewContent` 由宿主注入（ScheduleBrowser.tsx:63,83），样式不经本仓。整页规格（页签/筛选/卡片/chip/菜单/空态/limit 20/keepAwake 开关）已存档 §1.1E 备查 | dd@4990000–5070000 全段 |
| W9 archives 页整页规格 | 插件无归档管理页（DSH 归档在「设置 → 已归档」宿主面）。搜索/排序/筛选/分页 50/全部删除 ghost+destructive-surface 底（js@2062383）规格存档 §1.2 | dd@2056400–2064600 全段 |
| W10 cron/off-peak 行内图标 | 插件定时树行内**无** cron 图标（分组头即身份）；ZCode 行内 cron 图标 size-3.5 挂时间前是 PARITY §1.1 已裁位置（「不占状态槽」）。信息架构不同，不产 diff | js@2346686/2414902；PARITY §1.1 末行 |

### needs-live（须 9224 活体定）

| # | 事项 | 说明 |
|---|---|---|
| N1 | cron 图标的具体 lucide 身份 | `Bs`（js@2346686）静态未解到定义（minified 绑定）；活体放大侧栏定时行图标即可分辨 Clock/CalendarClock/Timer，直接决定 M4 用 ZIconClock 还是 ZIconSchedule |
| N2 | ZCode 分组头单击行为 | in-flow 头 div 同时是 DropdownMenuTrigger（YI asChild，js@2369000 段）又带 aria-expanded/aria-controls——「点分组头」是弹菜单还是折叠，静态互斥无法裁决；活体点一次即知（影响 M2 落地时箭头交互语义） |
| N3 | kbt 计数药丸在 DSH 侧栏底的观感/AA | M3 落地前置：`bg-tag/50` 等值混色在 240px 窄栏两种主题下各截屏一次（与 surface-9 N2/N3 同批做） |

## 6. 给下一轮的整改建议（不动手，仅排序）

1. M1+M5 一把梭：两处确认钮 + 两处 busy 文案都是单点 class，四个 diff 收口；顺手消掉 `.dcu-wb-delete-button` 的 `!important`（README 工作契约 #7 预算）。同步 session-tree-pending.integration.spec.ts:247 与 channel-archive.integration.spec.ts 相关断言。
2. M2+M3 同一落点（GroupHead）：加 `caret?: boolean` 与 `count?: number` 两个可选 prop，频道/定时调用点开启，工作区树不动；kbt 药丸样式建议与 surface-9 M2 的 `.dcu-wb-collection-count` 共用一个新 class，一次对齐两种组头。
3. M4 等 N1 活体定名后再落（断言更正需带日期注释）；若活体不可得，保守方案是 ZIconClock（Clock 语义最贴近「按周期运行」）。
4. D1 粘性分组头规格已完整存档 §1.1B，若未来 DSH 侧栏允许，按 ySt/xSt 的 150ms/实底/阴影三件套直接复刻。

## 复核

> 复核员：复核员·12。日期 2026-11-03。只读；除本节外未改动本文件任何字节。
> 方法：仓内源码引用行号全部亲自打开实读；asar 侧结论全部来自本轮亲自运行的命令——`grep -aob` 锚点、`dd if=styles-Dv5E6Odo.js bs=1 skip=N count=M` 区段、IntlProvider.js 正则提取，另用 `design-language/audit-scripts/asar.mjs` 对 `/Applications/ZCode.app/Contents/Resources/app.asar` 实测头部 u32（offset4=8328596, offset8=8328592, offset12=8328585，与 §0 记载一致）并实抽 `clock-CqmtoUnU.js`。`/tmp/zc-badge-extract` 三份产物尺寸与 §0 一致（6,839,502 / 480,065 / 979,836 B）。活体（9224）本轮仍未采样。

### M1–M5（mechanical）

- **M1 · verified**（带一处偏移标签订正）
  - ours 三处实读：`ScheduleBrowser.tsx:175` 与 `session-row-actions.tsx:111` 均为 `<Button variant="outline" className="dcu-wb-delete-button" …>`；`CodexWorkspaceBrowser.tsx:295` = `.dcu-wb-delete-button{color:var(--dcu-state-error-text)!important}`；`archive-confirm.ts:33` = `.dcu-archive-confirm{…background:var(--dcu-state-error-fill);color:#fff…}`——「同一屏两种确认钮形态」成立。
  - DSH：`grep -o 'variant: "…"'` 于 dsh-client-ui-primitives/lib/index.js 仅命中 `outline`/`primary`/`tooltip` 三种；全文件唯一一处 `destructive`（byte 149922）实读为 Menu 行 `danger` 属性的 JSDoc 注释，**不是** Button variant。✓
  - ZCode：`grep -aob confirmVariant` 共 26 处，`confirmVariant:`destructive`` 计 **23/23 全为 destructive**（比文档「4+ 处」更强）。四个具名现场逐一实读：archives 批量删除（2057100 段，`archives.deleteDescription`+confirmVariant@2057229）、offPeak 弃稿（4881000 段，`offPeak.discard.*`+`presentation:automation-confirmation`，与文档偏移 4881198 精确吻合）、automations 删除（`ct` 回调，`automations.delete.*`+`common.delete`，confirmVariant@**5014309**）、offPeak 删除（`ft` 回调，`offPeak.delete.*`，confirmVariant@**5015226**）。
  - ⚠ 订正：文档把 5015226 标为「automations 删除」、§1.1E 又把 5014309 标为「createLimit toast」——实读 5015226 是 offPeak 删除（ft）、automations 删除在 5014309（ct）、createLimit 实际在 5002614/5010822。四处现场本身全部存在且均 destructive，M1 实质不受影响。
  - IntlProvider 佐证：`automations.delete.title => 删除定时任务`、`automations.delete.description => 确定删除“{title}”？此操作无法撤销。`——§1.1E 引文与键值一致。
- **M2 · verified**（带一处措辞订正）
  - ours：`session-tree.tsx:216-224` GroupHead 实读只有 folder 槽+标题+actions，无任何折叠指示；调用点 `ChannelBrowser.tsx:126`、`ScheduleBrowser.tsx:125` 实读在案。
  - ZCode 侧栏：2371150 段实读 `se?jsx(js,{className:"size-3.5 shrink-0 text-foreground-subtlest"}):jsx(ks,{同})`；import 实读 `js = chevron-right-7Jq3wBpJ.js`、`ks = chevron-down-DBcrQbD0.js`——箭头身份与尺寸档逐字证实。
  - ZCode 归档组：2058850 段实读 `size-3.5 text-foreground-subtle transition-transform group-data-[state=open]/button:rotate-90`。✓
  - ⚠ 订正：证据栏「GroupHead 为三树共用」——全仓 grep 实况是**只有频道/定时两处调用点**，工作区树用的是 `dcu-wb-collection-head` 自带头、不消费 GroupHead；「只对两个调用点开启 prop」的落地指引反而因此更干净，但「三树共用」措辞不准。
- **M3 · verified**
  - kbt 定义 2308500 段逐字实读：`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-tag/50 px-1.5 py-0.5 text-ui-sm font-medium leading-none text-foreground-subtle`（文档引串略去 `shrink-0 items-center justify-center` 三个中缀类，实质一致）；渲染点 2371350 段实读 `span{className:kbt, children:e.tasks.length+ +!!f}`；归档组头计数为纯文本 `shrink-0 text-ui-sm text-foreground-subtle` + IntlProvider `archives.count => {count} 个会话`。✓
  - ours：两调用点无 count 展示（实读）；`group.sessions.length` 数据现成（ScheduleBrowser.tsx:139/152、ChannelBrowser.tsx:112-115/127）。✓
  - 交叉引用：surface-9.md:162 M2 行确为同一 kbt 串 + `.dcu-wb-collection-count` 升药丸提案——「同源」成立。
- **M4 · verified**
  - ours：`ScheduleBrowser.tsx:66-68` 实读为实心 `fill="currentColor"` path、`viewBox="0 0 16 16"` width/height 16；`tests/night-audit-batch-20.assert.mjs:153-157` 实读确以 `viewBox="0 0 16 16"` 字面量锁 ScheduleClock（assert.match 自 153 行起）。✓
  - ZCode：automations 区（4990000 起 80,000B）`strokeWidth:1.33` 实测 ×4；cron 行图标 2346600 段实读 `Bs{"data-cron-task-icon":"true","aria-label":taskList.cronTaskLabel,"className":"size-3.5 shrink-0"}`（Rc/offPeakTaskLabel 同构）；`zcode-icons.tsx:7` 原则语句实读在案。✓
  - 附带：Bs 的 lucide 身份本轮已静态解出（见 N1），M4 不必再等活体。
- **M5 · verified**
  - ours：`ScheduleBrowser.tsx:191` = `{busy==='archive-group' && <div className="dcu-wb-error" role="status">…}`、`session-row-actions.tsx:113` = `{deleting && <div className="dcu-wb-error" role="status">…}`（实读）；`zcode-theme.ts:197-198` 实读 `.dcu-state,.dcu-wb-error{…}` 基座 + `.dcu-state--error,.dcu-wb-error{color:var(--dcu-state-error-text)}`——busy 文案被渲染成错误红成立；`.dcu-state--empty` 档在 :199 可复用。
  - ZCode：2064050 段实读 error=`role:"alert"`+`text-ui-base text-destructive`+Retry outline 钮；busy=`role:"status"`+`text-ui-sm text-foreground-subtle`（IntlProvider `archives.working => 正在处理…`）；result=`role: failed?alert:status`——「role 与色严格成对」证实。§6.1 所指 `tests/session-tree-pending.integration.spec.ts:247` 实读正是 `.dcu-wb-error[role="status"]` 断言处，同步提示有效。

### D1–D4（deviation，只核证据）

- **D1 · 证据成立**：`ySt` 定义于 2374943（实读，含 `collapsed` 入参与 LL/taskGroup.cronGroupName 显示名逻辑）；`data-grouped-sticky-header`@2375905 包 `px-2 pb-1`；克隆头实读 `border border-border bg-background … shadow-sm` + `hover:border-border-hover`；`var bSt=150` + xSt `setTimeout(…,bSt)` 卸载 + `transition-[opacity,transform] duration-150 ease-out` + `-translate-y-1 opacity-0 → translate-y-0 opacity-100`（2378500/2378900 段）。ours 侧 GroupHead（session-tree.tsx:219）与 `.dcu-wb-project-head`（CodexWorkspaceBrowser.tsx:212-214）实读均无 sticky。「随树滚走 vs 粘性克隆」对照成立。
- **D2 · 证据成立**：ours `CodexWorkspaceBrowser.tsx:317` 实读 `.dcu-wb-project-title{…color:var(--dcu-sidebar-secondary)}`；ZCode Dbt/Obt 实读均 `text-foreground`（2308500 段）。裁决在案：APPLIED.md:43「侧栏三档文字 68/56%」已裁决维持。
- **D3 · 证据成立**：ours `CodexSidebar.tsx:160` 实读分段控件（`border:1px solid var(--dcu-sidebar-border)`+`radius-lg`+`background:var(--dcu-surface)`，按钮 `font:500 14px/21px` 两态同权、选中仅换 `--dcu-sidebar-selected` 底）；ZCode 5018950 段实读药丸 `rounded-full px-3 py-1 text-ui-base font-medium`、选中 `bg-selected text-foreground`、未选 `text-foreground-subtle hover:bg-hover`，容器无段控底框（注：该段具体渲染的是 `offPeak.tabs.*` 页签，scheduled/idle 一对未单独定位，不碍药丸模式成立）。裁决在案：KNOWN-ISSUES §3.1「任务频道/定时页签 = ZCode 分段控件：--dcu-surface 底+1px 边框+8px 圆角」实读在案。
- **D4 · 证据成立**：ours `channel-brand.tsx:3-10` 实读手绘 SVG（telegram viewBox 24 / weixin 48 / …，width/height 16、`aria-hidden`、fill 商标色、`dcu-wb-brand` class）；ZCode `yR`@2507329 实读 `img{src,"aria-hidden":"true",className:"size-4 object-contain"}`、webhook→Cre、兜底→Cs；@2x 位图实证 `oTt=``+new URL(`icon-telegram@2x-Cax3aaF9.png`,import.meta.url).href`（weixin/discord @2x 同构）。裁决在案：KNOWN-ISSUES §55.4（:4358）「第三方商标色显式登记+豁免」实读在案。

### N1–N3（needs-live）

- **N1 · 分类被本轮推翻（静态已解）**：复核链 = styles js 内实读 `import{t as Bs}from"./clock-CqmtoUnU.js"` → 用 asar.mjs 实抽 `/out/renderer/assets/clock-CqmtoUnU.js`（185 字节）→ 实读其内容 `t=[[`circle`,{cx:12,cy:12,r:10,key:1mglay}],[`path`,{d:`M12 6v6l4 2`,key:mmk7yg}]],n=e(`clock`,t)`——即 lucide **Clock**（icon 名字符串就是 `clock`；`M12 6v6l4 2` ≡ Clock 的 polyline 12,6→12,12→16,14）。不是 CalendarClock/Timer。M4 可直接落 ZIconClock，§6.3 的「保守方案」即正解，无需活体。
- **N2 · 分类被本轮推翻（静态已解）**：`YI` 定义实读 = `function YI({…e}){return jsx(kve,{"data-slot":"context-menu-trigger",…e})}`——是**右键** ContextMenu 触发器，不是左键下拉触发器；`XI` 实读 = `data-slot:"context-menu-content"` + `min-w-44`。in-flow（YI@2368724）与 sticky 克隆两种头里，菜单触发器都 asChild 包着头 div，而头 div 自身 `onClick`=切换折叠、带 `aria-expanded:!se`/`aria-controls`。结论：**左键点分组头=折叠/展开，右键=组菜单**。M2 落地按「点击切换」语义即可，无需活体。
- **N3 · 维持 needs-live，但输入可静态取**：`bg-tag/50` 编译值于 styles-NK68EN_n.css 实读两档——亮色 `background-color:#e5e5e580`、通用 `color-mix(in oklab,var(--color-tag) 50%,transparent)`。余下确实只剩「DSH 侧栏两种主题底上的等值重取+观感/AA」判断，须活体/夹具；与 surface-9 N2/N3 同批做的安排不变。

### 复核登记的三点订正（不改原文，仅在此备案）

1. **偏移标签互换（M1/§1.1E）**：5015226 = offPeak 删除（ft）；automations 删除 = 5014309（ct）；createLimit 实际在 5002614/5010822。四个确认现场本身全部真实且均 destructive。
2. **M2「GroupHead 为三树共用」**：实况是仅频道/定时两个调用点消费 GroupHead，工作区树不用它。
3. **M1「4+ 处」实为 23 处**：全文件 `confirmVariant:`destructive`` 23/23，一律 destructive 的结论比原文登记更强。

### 总计

mechanical 5 条全部 **verified**（M1 附偏移订正、M2 附措辞订正）；deviation 4 条证据全部成立；needs-live 3 条中 N1/N2 本轮静态破案（分类不再必要）、N3 维持。复核未发现任何一条 verdict 需要降级为 unconfirmed。
