# night2 · surface-5 · 空态家族（无任务 / 无项目 / 无频道 / 无搜索结果 / 归档空）

> 深挖员：surface-5。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面：`uiplug/src/client/locales.ts`、`workspace-browser.ts`、`ScheduleBrowser.tsx`（点名文件），实际空态渲染点还落在 `CodexWorkspaceBrowser.tsx`、`CodexSidebar.tsx`、`ChannelBrowser.tsx`、`CodexSettingsPage.tsx`、`ConnectorsSection.tsx`、`settings-page-styles.ts`（surface 的完整 CSS 在这些文件里，逐一拉出）。
> 前置：已读 `night-audit/APPLIED.md`（批次 4/6 已按 asar `taskList.*`/`project.*`/`taskSearch.*` 对齐 19 键；「侧栏三档文字 68/56%」已裁决维持）与 `README.md` 索引。本轮不重复报已落地项。

## 0. 提取方法与可复现命令

```bash
# asar 头解析（Pickle+JSON 目录）→ 产物存 /tmp/zc-empty-extract/（本轮新解，2026-11-02 版 asar，
# 偏移与 surface-3 不同：asar 已更新，凡引用旧文档偏移须以本轮为准）
python3 - <<'PY'   # 头：u32=(4, 8328596, 8328592, 8328585)，文件区起点 8+8328596
#   out/renderer/assets/IntlProvider-4oW73Zh8.js  979,836B  @342362495  ← zh+en 全量文案字典
#   out/renderer/assets/styles-Dv5E6Odo.js      6,839,502B  @357941725  ← UI 组件 bundle
#   out/renderer/assets/styles-NK68EN_n.css       480,065B  @364781227  ← 编译 CSS
PY
# 字符串定位：grep -aob '<中文/键名>' app.asar   （全 341MB，utf-8 字节偏移）
# 组件结构：python 按字节切片 .decode('utf-8') 读上下文（in-bundle 偏移 = asar 偏移 − 文件基址）
```

下文 `js@N` = styles-Dv5E6Odo.js 内字节偏移；`css@N` = styles-NK68EN_n.css 内字节偏移；`dict@N` = IntlProvider 内字节偏移。活体（9224）本轮未采样——全部结论为 asar 静态证据，needs-live 见 §6。

## 1. ZCode 空态家族全景（本轮新挖，组件级 + 编译 CSS 级）

### 1.1 五个面 × ZCode 对应物总矩阵

| 空态面 | ZCode 键（zh / en） | 渲染容器（类名原文） | 证据 |
|---|---|---|---|
| 无任务（分组树根） | `taskList.noTasks` 暂无任务 / No tasks yet | `div.px-3.py-2.text-ui-base.text-foreground-subtle` | js@2395944；dict@171055(zh) |
| 无任务（项目内） | 同上 + `taskList.noUnreadTasks` 暂无未读任务 / No unread tasks | `div.px-8.5.py-2.text-ui-base.text-foreground-subtlest` `data-testid=project-no-tasks` | js@2429957、2424047 |
| 置顶区空 | （无键——**渲染 null**） | `r==='pinned'\|\|!i ? null : <project-no-tasks>` | js@2429957 |
| 无项目 | `projectManagement.empty` 还没有项目 / No projects yet；搜索空 `noResults` 没有匹配的项目 / No matching projects | 设置→项目管理：`p[data-testid=project-management-empty].py-12.text-center.text-ui-base.text-foreground-subtle`；composer 项目选择器搜索空：`div.px-2.py-2.text-ui-base.text-foreground-subtlest` | js@2098427、dict@492897(en)；js@2284842 |
| 无频道 | **不存在**（ZCode 无频道会话概念，穷尽搜索见 §5） | 最近邻 `bots.empty`：`div.p-4.text-ui-base.text-foreground-subtle` | dict zh 全扫 35 命中均 bots.*/remote.*；js@2449080 |
| 无搜索结果 | `commandCenter.noResults` 暂无相关结果 / No related results | `CommandEmpty(aj)` 基座 `py-6 text-center text-ui-base/relaxed` + 调用 `px-4 py-5 text-foreground-subtle` → **水平居中** | js@1796369(aj 定义)、1821997(调用)；dict@65878(zh)/550004(en) |
| 归档空 / 归档搜索空 | `archives.empty` 暂无已归档会话 / No archived sessions；`archives.noResults` 没有匹配的归档会话 / No matching archived sessions | `p.py-12.text-center.text-ui-base.text-foreground-subtle`，`t(有归档但被筛掉 ? 'noResults' : 'empty')` | js@1973994；dict@3106(zh) |
| 归档加载/错误 | `archives.loading` 正在加载归档会话… / `archives.loadFailed`+retry | loading `p[role=status].py-8.text-ui-base.text-foreground-subtle`；error `div[role=alert].flex.flex-wrap.items-center.gap-3.text-ui-base.text-destructive` + `X variant=outline` | js@1973994 |
| 定时任务列表空 | `automations.empty.title` 还没有定时任务（+CTA `createManually` 手动创建） | 大卡：`div[data-automations-empty-state].flex.h-[226px].w-full.items-center.justify-center.rounded-2xl.border.border-card-border.bg-background.px-4` > `div.flex.translate-y-2.flex-col.items-center.gap-5` > `p.text-ui-base.font-medium.leading-5.text-foreground-subtlest` + CTA 行 `gap-3` | js@5025771 |
| 定时运行记录空 | `automations.runs.empty` 还没有运行记录。/ No runs yet. | `omn` 包装：`flex.min-h-[226px].items-center.justify-center.rounded-xl.border.border-dashed.border-card-border.bg-background.px-4.text-center.text-ui-base.text-foreground-subtle` | js@4937091、4357205(omn 定义) |
| 定时加载/错误 | — | loading `div.flex.h-32.items-center.justify-center` + LoaderIcon `$O`(=wc `role=status` `size-4 animate-spin`，调用覆盖 size-5)；error `rounded-lg.border-destructive/30.bg-destructive/10.px-3.py-2.text-ui-sm.text-destructive` | js@4937091、1651485($O) |
| 分组空落区 | `taskGroup.emptyDropZoneAction` 新建任务，或拖拽到这里。（`taskGroup.empty` 拖动任务到此分组 = **死键**，asar 无渲染点） | **虚线 CTA 按钮** `Jxt`：`flex.h-8.w-full.items-center.justify-center.gap-1.5.rounded-lg.border.border-dashed.border-border.px-2.py-2.text-center.text-ui-base.text-foreground-subtle` + hover/focus/动画（见 §1.2） | js@2353088；dict zh@342378332 |

### 1.2 空态状态机与变体（hover / active / focus / reduced-motion）

- **ZCode 侧栏树空态无交互态**（纯文本，无 hover/focus/动画）——空态是"静"的。
- **分组空落区（Jxt）是唯一带完整交互态的空态**（js@2353088，类名逐条原文）：
  - hover：`hover:border-border-hover hover:bg-surface-hover hover:text-foreground`
  - focus：`focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-input-border-focused`
  - 动画：`transition-[background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none`（150ms + `--ease-out: cubic-bezier(0,0,.2,1)`，css@13338 附近令牌块）
  - 结构：图标（Plus 系 `size-3.5`=14px）+ 文案 `span.min-w-0`，`gap-1.5`(6px)，高 `h-8`(32px)
- **CommandEmpty（aj）**：cmdk `JA.Empty`，`data-slot=command-empty`；命令列表壳 `ij`=CommandList `scrollbar-hide max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none` + 调用 `Rot`=`max-h-[min(440px,calc(100dvh-15rem))]`（js@1796178/1807802）。无独立动画。
- **项目内无任务三态**（js@2429957 `tR` 函数）：pinned 空 → **不渲染任何东西**；`showEmptyState=false` → null；unread 过滤空 → `noUnreadTasks`；默认空 → `noTasks`。
- **归档面板四态**（js@1970652 `Xht`）：error(alert+outline 重试) > busy(`text-ui-sm`) > result(`role=alert|status` 按 failed 与否) > loading(`py-8` 居左) > 空或无结果(`py-12` 居中，按未过滤集 `u.length` 分文案) > 分组列表。

### 1.3 编译 CSS 令牌值（css@ 为 styles-NK68EN_n.css 字节偏移）

| 类/令牌 | light | dark | 出处 |
|---|---|---|---|
| `--spacing` | .25rem=4px（全部间距基数：px-3=12px、py-2=8px、py-5=20px、py-6=24px、py-8=32px、py-12=48px、px-8.5=34px、gap-1.5=6px、gap-5=20px、h-8=32px、h-32=128px） | 同 | css@12096 |
| `--ui-font-size` / `--text-ui-base` | **14px**；`--text-ui-sm`=12px；`--text-ui-xl`=16px | 同 | css@414642、14172 |
| `text-ui-base/relaxed` | 14px / `--leading-relaxed:1.625`(≈22.75px) | 同 | css@ `.text-ui-base\/relaxed` |
| `text-foreground-subtle` | `#40404099`（fallback）= oklab neutral-700 60% | oklab neutral-200 60%（fallback `#e5e5e599`） | css@21592；dark 块@415443 起 |
| `text-foreground-subtlest` | `#40404066` = neutral-700 40%；lucide 图标附 `--lucide-subtlest-opacity:.4` 滤镜 | neutral-200 30%（`#e5e5e54d`） | css@21828、22028 |
| `border-border` / `border-card-border` | `#0a0a0a1a` / `var(--color-border)` | — | css@15870、17253 |
| `bg-background` | `var(--color-neutral-50)` | `var(--color-neutral-900)` | css@14529、dark 块 |
| `border-dashed` | `border-style:dashed` | 同 | css@ `.border-dashed` |
| `rounded-xl / rounded-2xl / rounded-lg` | 12px / 16px / 8px | 同 | css@13075 起 |
| `duration-150` + `ease-out` | .15s + `cubic-bezier(0,0,.2,1)` | 同 | css@ `.duration-150`、13338 |
| `hover:border-border-hover` | `#0a0a0a33` | — | css@230410、16044 |
| `hover:bg-surface-hover` | `#0a0a0a0d`（5% 黑） | — | css@238268、16941 |
| `ring-input-border-focused` | `--tw-ring-color: var(--color-brand)` | — | css@248712、17595 |
| `bg-destructive/10`、`border-destructive/30` | `#e400141a`、`#e400144d`（= red-600 10%/30%） | — | css@118911、102345 |
| `bg-destructive-surface` | `#e400141a` | — | css@22795 |
| `animate-spin` | `spin 1s linear infinite` | 同 | css@13416 |

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 7 条）

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | locales.ts:109,421 `search.empty` | 空态文案 | `没有找到相关任务` / `No matching tasks.`（= `taskSearch.noResults`，**该键 asar 全文无渲染点，是死键**） | 活体空态 = `commandCenter.noResults` `暂无相关结果` / `No related results` | asar `grep -aob 'taskSearch\.noResults'` 仅 dict 两处定义（342536107/343022691）；styles js 唯一 `taskSearch.` 引用是 `loading`（js@1818320）；⌘K 空态渲染 js@1821997；dict@65878/550004 |
| M2 | CodexSidebar.tsx:328 `.dcu-search-empty` | 空态容器 | `padding:16px 8px;左对齐;13px(caption);--dcu-sidebar-tertiary` | `aj` 基座 `py-6 text-center text-ui-base/relaxed` + 调用 `px-4 py-5 text-foreground-subtle` → **px-16 / py-20 / 水平居中 / 14px·1.625 / subtle** | js@1796369+1821997；css `.py-6` `.text-ui-base\/relaxed` |
| M3 | CodexWorkspaceBrowser.tsx:317,339 `.dcu-wb-empty`/`.dcu-wb-nochat` | 字号/行高 | 13px（caption）/18px | 树内空态一律 `text-ui-base`=**14px**，行高随树基线 21px（`.dcu-wb` 同款继承） | js@2395944、2424047、2429957 全部 `text-ui-base`；css@414642 `--ui-font-size:14px` |
| M4 | CodexWorkspaceBrowser.tsx:288 `.dcu-wb-empty` 基线内距 | padding | `padding:8px`（四向 8，ScheduleBrowser/ChannelBrowser 用） | 分组树根空态 `px-3 py-2`（12/8）；项目内 `px-8.5 py-2`（34/8） | js@2395944、2429957；css@145642 `px-8\.5{padding-inline:calc(var(--spacing)*8.5)}` |
| M5 | locales.ts:100,412 `schedule.empty` | 空态文案 | `还没有定时任务运行记录。` / `No scheduled-task runs yet.` | `automations.runs.empty` `还没有运行记录。` / `No runs yet.` | dict@464166(zh)/956701(en)；渲染 js@4937091 |
| M6 | locales.ts:135,445 `workspace.empty` | 文案长度 | `还没有项目。添加一个工作区目录即可开始。` | `projectManagement.empty` = `还没有项目` / `No projects yet`（引导不进句子，走 CTA 按钮，见 automations.empty 模式） | dict@342372848(zh asar)、492897(en)；大卡+CTA 模式 js@5025771。⚠ 落码时后半句若保留应转为「添加工作区」CTA（locales.ts:8 已有 `workspace.add`），而非塞回句子 |
| M7 | CodexWorkspaceBrowser.tsx:1089 `pinnedEmpty` | 空置顶形态：纯文字提示 | `<div class="dcu-wb-empty">拖动项目到此处置顶</div>` | ZCode 置顶空渲染 **null**（无提示行）；空容器提示的官方形态是**虚线 CTA 落区按钮**（`Jxt`）：`h-8 rounded-lg border-dashed border-border gap-1.5` + 图标 `size-3.5` + `hover:border-border-hover hover:bg-surface-hover hover:text-foreground` + `focus-visible:ring-1 ring-input-border-focused` + `transition 150ms ease-out motion-reduce:transition-none`，文案=`taskGroup.emptyDropZoneAction`「新建任务，或拖拽到这里。」 | js@2429957（pinned→null）、2353088（Jxt 全文）；ds 落点逻辑 workspace-browser.ts:149-166 本就要求空列表可承接 drop，虚线落区与该语义同构 |

> M1–M2 动的是浮层（⌘K 系），M3–M7 动的是树内文案/容器；全部不触及 APPLIED「侧栏三档文字 68/56%」裁决（那条管 secondary/tertiary 两档的比值，M3 只动字号，颜色单列 deviation）。

## 3. deviation（触既有裁决，登记不修）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | zcode-theme.ts:277-278,333-334 `--dcu-sidebar-tertiary`（.dcu-wb-empty/.dcu-wb-nochat/.dcu-search-empty 的色源） | 空态文字色 | tertiary：light `#404040 75%` / dark `#d4d4d4 56%` | ZCode 空态用 `foreground-subtle`（light #40404099=60% / dark neutral-200 60%），项目内无任务更弱到 `subtlest`（40%/30%） | APPLIED §二「侧栏三档文字 68/56% 已裁决维持」；css@21592/21828、dark 块@415443 起。空态色的重取属同一条裁决域，整轮一并重议，不单点修 |
| D2 | CodexWorkspaceBrowser.tsx:953,1089 | 置顶空渲染策略 | 空置顶渲染提示行（拖拽需要落点），无任务/无项目各档统一 tertiary | ZCode：置顶空渲染 null，三档色 subtle/subtlest 按层级递弱 | js@2429957 `r==='pinned'\|\|!i?null:…`；同 D1 裁决域 + DSH 拖拽置顶模型（workspace-browser.ts:155-166 空列表也必须可落）与 ZCode 菜单置顶模型不同，结构性差异登记 |
| D3 | CodexWorkspaceBrowser.tsx:340 `.dcu-wb-nochat{padding:1px 8px 5px 40px}` | 无任务左内距 | 40px（P0-4：与会话行文字同列，40px 是本仓树缩进锚） | `px-8.5`=34px（ZCode 自己的层级缩进） | js@2429957；CodexWorkspaceBrowser.tsx:341-342 注释（「显示更多」同列 40px）。左内距受树缩进体系约束（03b 锚点系），单改 40→34 会破坏列对齐，登记随树缩进整议 |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 无任务文案 | `workspace.noChat`=暂无任务 / No tasks yet | `taskList.noTasks` 暂无任务 / No tasks yet，**中英精确一致** | locales.ts:133,443；dict@171055(zh)、657632(en，asar 全文 grep "No tasks yet") |
| A2 无项目搜索空文案 | `home.projectEmpty`=没有匹配的项目 / No matching projects | `projectManagement.noResults` 没有匹配的项目 / No matching projects，中英精确一致 | locales.ts:18,330；dict@342372892(zh asar)、492941(en) |
| A3 搜索占位符 | `search.placeholder`=搜索操作、任务或文件 | `commandCenter.placeholder`（APPLIED 验收已确认生效） | locales.ts:108；APPLIED.md:61,67-68 |
| A4 错误态语义 | `.dcu-wb-error` `role="alert"` | ZCode 树空态旁错误 `p[role=alert] px-3 text-ui-sm text-destructive`（js@2395944 同窗口）；归档面板 error `role=alert`+outline 重试 | ScheduleBrowser.tsx:120,192；js@2395944、1970652 |
| A5 加载态语义 | settings 空态 `role="status"`（CodexSettingsPage.tsx:240）；connectors loading 单独文案 | ZCode archives loading `p[role=status]`、automations loading spinner `role=status` | CodexSettingsPage.tsx:240；js@1973994、1651485 |
| A6 空态基类复用 | 五处空态共用 `.dcu-wb-empty` 一个定义（CodexWorkspaceBrowser.tsx:288+317+338） | ZCode 同样基座复用（`aj` 空态基座、`omn` 运行空包装） | js@1796369、4357205 |
| A7 空态色弱于正文的方向 | tertiary 弱于 secondary 弱于 primary | subtle(60%) 弱于 foreground；subtlest(40%) 更弱 | css@21592/21828；zcode-theme.ts:277-278 |
| A8 死键辨识 | `dcu-state--empty`（zcode-theme.ts:199）定义但全仓无使用 | ZCode 侧 `taskGroup.empty`、`taskSearch.noResults/noRecent`、`automations.empty.description`、`projectManagement.suggestion.*` 同为定义无渲染点 | grep -aob 各键于 asar：仅 dict 命中；zcode-theme.ts:199 全仓 grep 仅定义行 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| `channels.empty`（无频道） | **无 ZCode 参照**：ZCode 无「频道会话」概念（Bot 渠道是配置项不是会话列表）。文案与容器均为插件自有。最近邻 `bots.empty`=还没有配置机器人。渲染 `div.p-4.text-ui-base.text-foreground-subtle`（js@2449080），可作未来样式参照但非对齐对象 | IntlProvider zh 块 14550 对键全量正则扫 `channel\|频道\|渠道` → 35 命中，全部为 `bots.*`(渠道选择)、`remote.phase.channel*`(连接设备阶段)、`webRemoteControl.botChannel.*`、支付渠道 1 条；0 个会话列表空态键。asar 全文 `channel.*` 无 list-empty 键 |
| 归档空 UI 本体 | 插件无归档列表 UI（归档管理是 companion 插件）；ZCode 规格（§1.1 归档行）**存档供 companion 插件对齐**，本轮不产 diff | uiplug 全仓 grep `archives\.\|已归档` → 仅 locales.ts（会话操作文案）与 settings-nav-icons.ts:35（`/archive/` 图标映射）；CodexSettingsPage 无归档页。ZCode 侧 `archives.empty` 渲染点 js@1973994（Xht 面板 `t(u.length?'noResults':'empty')`） |
| `settings.noResults`（设置搜索空） | **无直接文案参照**：ZCode 设置导航无过滤空态键；最接近的样式是设置面板列表空（`py-12 text-center text-ui-base text-foreground-subtle`，js@2098427） | asar 全文 `settings.noResults` 0 命中；设置面板空态实证=project-management-empty/archives（py-12 模式） |
| `connectors.empty`（连接器空） | **无 ZCode 参照**：ZCode 无 connectors.* 键族；设置→MCP 页空态（`settings.mcp.emptyTitle/emptyDescription`）是另一形态（大卡），非列表空 | asar 全文 `"connectors.` 0 命中；`settings.mcp.emptyTitle` 在 dict（zh=还没有 MCP 服务器） |
| `pinnedEmpty` 文案 | ZCode 无此提示（置顶空渲染 null，见 D2）；`taskGroup.empty`「拖动任务到此分组」是**死键**（asar 无渲染点）——ZCode 不用文字提示空容器，用虚线 CTA（M7） | grep -aob `taskGroup\.empty\b` asar → 仅 dict 两处（342378332/342859723）；styles js 无调用 |
| `taskSearch.noRecent`=暂无近期任务 | 死键（无渲染点），不产 diff | grep -aob `taskSearch\.` asar → 仅 dict 定义（342535820 区）+ styles js 一处 `taskSearch.loading`（js@1818320） |
| `automations.empty.description`=创建一个任务，按周期自动运行你的指令。 | 死键：ZCode 大卡只渲染 title+CTA（js@5025771 无 description）；供 companion/未来定时页对齐时避免误加 | grep -aob `automations\.empty\.description` asar → 仅 dict（342820869/343313433）；styles js `automations.empty` 模板 0 个动态引用 |

## 6. needs-live（必须 9224 活体才能定）

| # | 事项 | 原因 |
|---|---|---|
| N1 | ZCode 树空态行实测行高 | `text-ui-base` 只给 font-size，行高靠继承链；14px 空态在侧栏实际行盒（21px 还是 20px）需 CDP 取 computed line-height。影响 M3 的 line-height 落值 |
| N2 | 搜索空态居中（M2）在 DSH 浮层的目检 | DSH 搜索浮层有底部 hint 栏 + 双主题；居中空态与 hint 的间距节奏需浅/深各截屏一次 |
| N3 | automations 大卡（h-226）与 omn 虚线包装能否下放到 240px 窄栏 | ZCode 该空态生于设置面板（宽幅）；DSH「定时」页签是 240px 窄栏，直接套 226px 高卡是否成立需活体量取 |

## 7. 给下一轮的整改建议（不动手，仅排序）

1. 一把梭 locales.ts：M1（search.empty→暂无相关结果/No related results）+ M5（schedule.empty→还没有运行记录。/No runs yet.）+ M6（workspace.empty 缩短并评估转 CTA）三个键一次 diff 收口。
2. M2+M3+M4 合一组 CSS diff：`.dcu-search-empty` 居中化，`.dcu-wb-empty`/`.dcu-wb-nochat` 13px→14px、18px→21px（行高落值等 N1 复核后定）。
3. M7 置顶空改虚线落区按钮时，直接照抄 §1.2 Jxt 的 hover/focus/reduced-motion 三段类，勿自创曲线。
4. `commandCenter.noResults` 是活体空态、`taskSearch.noResults` 是死键——建议在 03i-command-palette.md 补一行空态条目（本轮不改文档）。
5. 归档空与 automations 两档规格已存档 §1.1，companion 插件（归档/定时）若日后做 UI 对齐，从那里抄，不要重新反解。

## 复核（独立复核员 · 2026-11-03）

> 方法（全部本轮亲自重跑，未采信原文数值）：
> ① asar 头解析+三文件独立提取：`python3 -I extract.py /Applications/ZCode.app/Contents/Resources/app.asar /tmp/zc-verify-f5-extract` → pickle u32=(4, 8328596, 8328592, 8328585)、文件区基址 8328604，与 §0 一致；IntlProvider-4oW73Zh8.js（abs 342362495 / 979,836B）、styles-Dv5E6Odo.js（357941725 / 6,839,502B）、styles-NK68EN_n.css（364781227 / 480,065B）偏移与大小**全部 MATCH**。
> ② asar 全文 byte-grep（python find，与 `grep -aob` 同语义）+ 三文件按 claimed 偏移切片直读。
> ③ 活体 9224 在线（ZCode/3.17.2，Electron 44.7.0，body=`theme-zai-light`）：CDP `Runtime.evaluate` 只读采样 + 临时探针（`data-zc-verify-probe`，测后即删，残留 0）；运行时样式表与 asar 提取 css `cmp` **逐字节一致**（480,065B）——静态 css@ 证据即活体真值。
> ④ 插件源文件按引用行号直读（locales.ts / CodexWorkspaceBrowser.tsx / CodexSidebar.tsx / zcode-theme.ts / zcode-tokens.ts / workspace-browser.ts / APPLIED.md）。
> 除本节外未改动任何文件。

### mechanical（M1–M7）

| # | verdict | 实际看到的值 / 理由 |
|---|---|---|
| M1 | **verified** | ours：locales.ts:109=`'search.empty': '没有找到相关任务'`、:421=`'No matching tasks.'`（直读）。死键：asar 全文 `taskSearch.noResults` 恰 2 处 [342536107, 343022691]（zh/en dict 定义），无渲染点；styles js 全包 `taskSearch.` 19 处命中=18 dict+1 渲染，唯一渲染 js@1818320 切片=`formatMessage({id:'taskSearch.loading'})`。活体空态：js@1821997 切片 `(0,$.jsx)(aj,{className:'px-4 py-5 text-foreground-subtle',children:f.formatMessage({id:'commandCenter.noResults'})})`；dict@65878=`暂无相关结果`、dict@550004=`No related results` |
| M2 | **verified** | ours：CodexSidebar.tsx:328=`.dcu-search-empty{padding:var(--dcu-space-4) 8px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption)}`，zcode-theme.ts:173 `--dcu-space-4:16px`，zcode-tokens.ts:554/557 base=14px、caption=calc(base-1px)=13px，无 text-align（左对齐）→「16px 8px/13px/tertiary」成立。zcode：js@1796369 `aj`=`JA.Empty,{"data-slot":'command-empty',className:Z('py-6 text-center text-ui-base/relaxed',e)}` 逐字符；js@1821997 调用 `px-4 py-5 text-foreground-subtle`；css `.py-6`=24px、`.px-4`=16px、`.py-5`=20px（`--spacing:.25rem`）、`.text-ui-base\/relaxed{font-size:var(--text-ui-base);line-height:var(--leading-relaxed)}`、`--leading-relaxed:1.625`（≈22.75px） |
| M3 | **verified** | ours：CodexWorkspaceBrowser.tsx:317 `.dcu-wb-empty{...font-size:var(--dsw-font-size-caption);line-height:18px}`、:339 组合规则同含 caption/18px（13px/18px 成立）。zcode：js@2395944=`px-3 py-2 text-ui-base text-foreground-subtle`（taskList.noTasks）、js@2424047=`px-8.5 py-2 text-ui-base text-foreground-subtlest`、js@2429957 同款——三处全 `text-ui-base`；css@414642 `--ui-font-size:14px`、css@14172 `--text-ui-base:var(--ui-font-size)`。行高子句「21px」原列 N1 待定，本轮活体补测证实=21px（见 N1），落值 18→21 有据 |
| M4 | **verified** | ours：CodexWorkspaceBrowser.tsx:288 `.dcu-wb-empty{padding:var(--dcu-space-2);...}`，zcode-theme.ts:171 `--dcu-space-2:8px` → 四向 8px。zcode：js@2395944 `px-3 py-2`（12/8）、js@2429957 `px-8.5 py-2`；css@145642 `.px-8\.5{padding-inline:calc(var(--spacing) * 8.5)}` 逐字符、css@12096 `--spacing:.25rem` → 34px；活体探针 paddingLeft 实测 **34px** |
| M5 | **verified** | ours：locales.ts:100=`'schedule.empty': '还没有定时任务运行记录。'`、:412=`'No scheduled-task runs yet.'`。zcode：dict@464166=`"automations.runs.empty"`:`还没有运行记录。``、dict@956701=同键 en `No runs yet.`；渲染 js@4937091 `lt.length===0?(0,$.jsx)(omn,{children:h.formatMessage({id:'automations.runs.empty'})})`。注：两字符串在 asar 各有第 2 处命中=`workflows.hub.history.empty`（同文案异键，dict 切片已确认键名，不影响本条） |
| M6 | **verified** | ours：locales.ts:135=`'workspace.empty': '还没有项目。添加一个工作区目录即可开始。'`（en :445=`No projects yet. Add a workspace folder to get started.`）。zcode：asar@342372848=键名 `"projectManagement.empty"`（值 `还没有项目` 在 +26B，切片确认；en dict@492897 同键=`No projects yet`）——§0 grep 方法本为键/值均可，偏移指向正确条目。CTA 模式：js@5025406 外壳 `data-automations-empty-state` + `flex h-[226px] w-full items-center justify-center rounded-2xl border border-card-border bg-background px-4`，js@5025771 内层 `flex translate-y-2 flex-col items-center gap-5`+title+CTA 行；styles js 全包 `automations.empty` 唯一引用=`.title`（description 死键佐证） |
| M7 | **verified** | ours：CodexWorkspaceBrowser.tsx:1089 `pinnedGroups.length===0 && <div className="dcu-wb-empty" onDragOver/onDrop>{t('workspace.pinnedEmpty')}</div>`，文案 locales.ts:118=`拖动项目到此处置顶`。zcode 置顶空=null：js@2429957 `:r==='pinned'\|\|!i?null:(0,$.jsx)('div',{className:'px-8.5 py-2 text-ui-base text-foreground-subtlest',"data-testid":'project-no-tasks',...noUnreadTasks/noTasks 三元})` 逐字符。Jxt（js@2352133 函数头；文档引 2353088=函数内 emptyDropZoneAction 渲染点，同函数）类串逐字符=`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2 py-2 text-center text-ui-base text-foreground-subtle transition-[background-color,border-color,color] duration-150 ease-out motion-reduce:transition-none`+`hover:border-border-hover hover:bg-surface-hover hover:text-foreground`+`focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-input-border-focused`；图标 `size-3.5 shrink-0`；文案 dict 切片=`新建任务，或拖拽到这里。`。死键：styles js 全包 `taskGroup.empty` 仅 1 处命中且即 `emptyDropZoneAction` 前缀。落点语义：workspace-browser.ts:149-166（`return pinnedEmpty ? { id: draggedWorkspace } : undefined`）直读成立 |

### deviation（D1–D3，只核证据）

| # | verdict | 证据核对 |
|---|---|---|
| D1 | **证据成立** | 插件侧：zcode-theme.ts:278 light tertiary `color-mix(in oklab,#404040 75%,transparent)`、:334 dark `#d4d4d4 56%`。ZCode 侧：css@21592 `--color-foreground-subtle:#40404099`+@supports oklab neutral-700 60%；css@21828 subtlest `#40404066`+40%+`--lucide-subtlest-opacity:.4`；dark 块（css@415443 `.dark{` 起）`.dark{--color-foreground-subtle:#e5e5e599}`+neutral-200 60%、subtlest `#e5e5e54d`+neutral-200 30%+lucide `.3`。裁决：APPLIED.md:43（§二）「侧栏三档文字 68/56%」确在「已裁决偏离，维持」清单内 |
| D2 | **证据成立** | js@2429957 pinned→null（同 M7 逐字符）；CodexWorkspaceBrowser.tsx:953=`{shownIds.length===0 && <div className="dcu-wb-nochat">{t('workspace.noChat')}</div>}`、:1089 pinnedEmpty 渲染；workspace-browser.ts:155-166 注释「空列表也必须把项目置顶」+`resolvePinnedSectionDrop`。三档色递弱：light subtle 60%/subtlest 40%、dark 60%/30% 已证 |
| D3 | **证据成立** | CodexWorkspaceBrowser.tsx:340 `.dcu-wb-nochat{padding:1px 8px 5px 40px}`；:341 注释「P0-4：与会话文字同列（40px）」属实（:342 是 `.dcu-wb-session-more` 的 40px 规则本体而非注释——引用范围内容存在，唯属性名小出入）。ZCode 侧 px-8.5=34px：css@145642+活体探针双证；js@2429957 引用属实 |

### needs-live（N1–N3）

| # | verdict | 实测 |
|---|---|---|
| N1 | **verified（本轮已跑）** | 9224 活体在线。只读采样：现存侧栏 `.text-ui-base` 元素 8/8 computed=fontSize 14px / lineHeight **21px**；`[data-task-list-show-more]`（树内 text-ui-base）14px/21px。临时探针（show-more 父容器=空态同渲染容器）插入 `px-3 py-2 text-ui-base text-foreground-subtle` 与 `px-8.5 py-2 text-ui-base text-foreground-subtlest` 各一：computed=14px/**21px**、paddingLeft 34px；测后即删，残留探针=0。结论：N1 悬案=**21px（非 20px）**，M3 落值 18→21px 可定；运行时样式表与 asar css `cmp` 逐字节一致（480,065B） |
| N2 | **unconfirmed** | 本 9224 活体**未注入插件**：`[class*="dcu-"]`=0、`[class*="dsw-"]`=0、iframe=0、无 uiplug script 标签——DSH 搜索浮层空态/hint 间距与双主题截屏无法在本实例进行。维持 needs-live，本轮未收口 |
| N3 | **unconfirmed** | 同 N2：DSH「定时」页签与 240px 窄栏在本实例不存在，无法量取。ZCode 侧大卡本体已静态证实（js@5025406 `h-[226px]` 等），「能否下放窄栏」待插件活体 |

### 复核中发现的微差（不影响任何 verdict）

1. 文档 `dict@N` 多为**键名**偏移（值在其后 +10~27B，如 projectManagement.empty 键@342372848、值@342372874）——与 §0「grep '<中文/键名>'」方法一致，指向正确条目，不算错。
2. §1.3 引用 css@230410/238268 实测 230417/238275（+7B），规则与值（#0a0a0a33/#0a0a0a0d）精确一致。
3. M7 的 js@2353088 是 Jxt 内 `emptyDropZoneAction` 渲染点，函数头在 js@2352133——同一函数，全类串以后者切片验证。
4. `还没有运行记录。`/`No runs yet.` 在 asar 各有第 2 处命中（`workflows.hub.history.empty`），与 M5 引用并存不冲突。
5. 顺带证实 §5：`"connectors.`（带引号）asar 全文 0 命中（唯一裸命中在 309474576，是 JSDoc 英文散文）；`taskSearch.noRecent` 仅 dict 2 处；`automations.empty.description` 仅 dict 2 处（342820869/343313433）；`settings.noResults` 0 命中。
