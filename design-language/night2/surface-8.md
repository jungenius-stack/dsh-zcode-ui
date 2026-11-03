# 夜2 · 面 8 · 禁用 / 加载 / 进度条三态（2026-11-03）

> 插件文件：`src/client/session-tree.tsx`、`src/client/AboutSection.tsx`、`src/client/DeveloperToolsRow.tsx`（连带 `zcode-theme.ts` 的 `.dcu-spin`/reduce 块、`settings-page-styles.ts` 的开关样式——这两个文件本轮**未改**，只取样式证据）。
> 已先读 `night-audit/APPLIED.md`（批次 10 已落桌面导航 `disabled` .5+not-allowed、批次 18/19 已裁运行中转圈 14px 与颜色、批次 17 已锁进度条 move 档——本文不重复报）与 `README.md`。
> gapfill-5 §3b（skeleton=bg-surface 组件模式）、gapfill-17（工具调用进度条四点同构）已登记的结论本文引用不重报，新证据单独标注。

## 0 · 提取方法（本轮实跑）

```bash
python3 -I（asar pickle 头）：size1=4, size2=8328596, hsize=8328592 → data_start = 8+8328596 = 8328604
  /out/renderer/assets/styles-Dv5E6Odo.js  6839502B @ header offset 349613121（绝对 350941725）
  /out/renderer/assets/styles-NK68EN_n.css  480065B @ header offset 356452623（绝对 364781227）
  提取到 /tmp/zcode-surface8/{styles.js, main.css}
shasum -a 256：
  styles.js = a0fa280cfbc3e132336c1b1fc9fc98caf4b73b57d588804cb661e3286645b625
  main.css  = 06eedaead11f16f01b56917460c173820851b7fd738f3e832df0e22626b3cfc0
```
下文「asar」= `/tmp/zcode-surface8/styles.js`、「css」= `/tmp/zcode-surface8/main.css`，行内数字为文件内字节偏移，可按上述命令复现。插件侧行号为 `AboutSection.tsx` / `DeveloperToolsRow.tsx` / `session-tree.tsx` / `zcode-theme.ts` / `settings-page-styles.ts` 实读行号。

## 1 · 结论速览

- ZCode **没有手写 `:disabled` 规则**：全部禁用样式走 Tailwind 变体，编译 CSS 里成套存在（css 提取全文见 §2.1），阶梯为 **opacity 0/40/50/60/70/100**；cursor 三态 not-allowed/default/wait。
- ZCode 加载语言共 4 族：**图标 spinner**（animate-spin，150 处）、**环形 spinner**（`border-current border-t-transparent`，仅提交表单 2 处）、**骨架 pulse**（`bg-surface[-hover]` 占位 + `motion-safe:animate-pulse`，无独立 Skeleton 组件）、**进度条**（4 个家族，确定态一律 `transition-[width] duration-200`）。
- 插件三项对得最齐的是「busy 三件套」（图标→spinner + 文案→-ing + disabled）；**缺口在 a11y 属性**（aria-busy/role=progressbar 少挂 3 处）、**骨架形态缺失**（loading 用纯文字）、以及 reduce 停帧帧位（ZCode 不确定态停**满宽**，插件停 28%）。
- 差异 12 条：**mechanical 7 / deviation 4 / needs-live 1**。

## 2 · ZCode 真值（本轮全量提取）

### 2.1 禁用态全集（css 编译产物全文）

```css
.disabled\:pointer-events-none:disabled{pointer-events:none}
.disabled\:cursor-default:disabled{cursor:default}
.disabled\:cursor-not-allowed:disabled{cursor:not-allowed}
.disabled\:cursor-wait:disabled{cursor:wait}
.disabled\:text-foreground-subtlest:disabled{color:var(--color-foreground-subtlest)}
.disabled\:opacity-0:disabled{opacity:0}        /* 另有 40/50/60/70/100 五档 */
.disabled\:text-foreground-subtlest:disabled{--lucide-stroke:rgb(from currentColor r g b / 1);--lucide-filter:opacity(var(--lucide-subtlest-opacity))}
.data-disabled\:pointer-events-none:where([data-disabled]:not([data-disabled=false])){pointer-events:none}
.data-disabled\:cursor-not-allowed:where(…){cursor:not-allowed}
.data-disabled\:opacity-50:where(…){opacity:.5}
.data-disabled\:opacity-100:where(…){opacity:1}
.data-disabled\:text-foreground-subtlest:where(…){color:var(--color-foreground-subtlest)}
```
（`:root,:host{--lucide-subtlest-opacity:.4}`，css @22028。）

JS 侧用量（asar 计数）：`disabled:pointer-events-none` 18、`cursor-not-allowed` 13、`opacity-50` 12、`opacity-100` 9、`opacity-40` 8、`text-foreground-subtlest` 8、`opacity-60` 7、`cursor-default` 5、`cursor-wait` 1。**挂法按控件族分流**：

| 控件族 | 类串（asar 偏移） |
|---|---|
| Base Button（shadcn 壳） | `disabled:pointer-events-none disabled:opacity-50`（@1648755） |
| Input/Textarea/Select/Checkbox | `disabled:cursor-not-allowed disabled:opacity-50`（@1706892/@453131/@1976057） |
| **Switch** | `data-checked:bg-primary data-unchecked:bg-primary/30 data-disabled:cursor-not-allowed data-disabled:opacity-50`；轨道 default 18×32、sm 16×28；thumb default size-4 / sm size-3.5、`bg-primary-foreground`、`translate-x-[calc(100%-2px)]`（@1740750–1741350，全串已提取） |
| 带边框自定义钮（busy 中） | `disabled:cursor-not-allowed disabled:opacity-60`（@6172611） |
| 次级列表钮 | `disabled:cursor-not-allowed disabled:opacity-60`（@2435849/@6328693 shortcuts 重绑） |
| 菜单项 | `data-disabled:pointer-events-none data-disabled:text-foreground-subtlest data-disabled:opacity-100`（@456900/@950153/@950820/@2209246，**不降透明度、只褪文字**） |
| 表单保存钮（automations/offPeak） | `disabled:pointer-events-none disabled:opacity-40`（@4774819/@4811468） |
| gitGraph 加载更多（busy 中） | `disabled:cursor-default disabled:opacity-60`（@3681469） |

### 2.2 加载态语言（spinner）

- **动画常量**（css）：`--animate-spin:spin 1s linear infinite`、`@keyframes spin{to{transform:rotate(360deg)}}`（css @13416/@478696）；`--animate-pulse:pulse 2s cubic-bezier(.4, 0, .6, 1) infinite`、`@keyframes pulse{50%{opacity:.5}}`（css @13416/@478748）；骨架一律包 `@media (prefers-reduced-motion:no-preference){.motion-safe\:animate-pulse{…}}`（css @283300）。
- **图标 spinner 用量**（asar 计数）：`animate-spin` 150；组合色 `text-foreground-subtle` 16、`text-foreground-subtlest` 3（钮内 @6172611 等）、`text-primary`/`text-foreground`/`text-success` 各 1；`motion-reduce:animate-none` 守卫仅 15 处（多数**不**守卫）。尺寸分布：size-3 ×13、**size-3.5 ×40、size-4 ×48**、size-5 ×4——3.5 与 4 **钮内、行内混用**（钮内例：size-4 @6172611/@2079423，size-3.5 @2060682/@2122758），无「按语境锁尺寸」的规律。
- **环形 spinner**（仅 2 处，反馈提交表单）：`` `size-3.5 animate-spin rounded-full border border-current border-t-transparent` `` + 文案换 `feedback.submit.submitting` + disabled（@1745401/@1767374）。
- **busy 三件套**（最普遍）：①图标位换 spinner（@6172611 `o?(0,$.jsx)(Cc,{className:`size-4 shrink-0 animate-spin text-foreground-subtlest`})`）；②文案换进行时（`submitting`/`transferring` @2060682/`opening` @2079423）；③disabled + aria-busy（@2432940 Switch `disabled + "aria-busy":n===e.chatId`、@2079423 目录确认钮）。@2079423 的变体用 grid 双层交换：标签 span 转 `invisible`，spinner+文案 span 挂 `role="status"`，同时 `disabled:opacity-100` **保持满透明度**。
- **文字加载行**：`common.loading` 模式 = spinner + 文字，如 `flex items-center justify-center py-2 text-ui-xs text-foreground-subtle` + `size-3 animate-spin`（@1770692）、代码块加载 `min-h-28 … gap-2 text-foreground-subtle` + `size-4`（@945438）。

### 2.3 骨架（skeleton）

无 Skeleton 组件（词命中见 §5），全是内联类，两档填充色 `bg-surface`（3%/5% 透明黑，见 tokens.json `--color-surface`）与 `bg-surface-hover`（5%/10%）：

- **列表行骨架**（插件商店加载，8 行）：容器 `role="status"`，行 `my-px flex h-8 items-center gap-3 px-3 motion-safe:animate-pulse`，占位 `size-5 shrink-0 rounded-md bg-surface-hover` + `h-3 w-28 rounded-sm bg-surface-hover`（asar @4735523，上下文全提取）。
- **网格卡骨架**（side-pane）：`role="status"` + 8 行 `flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 motion-safe:animate-pulse`，占位 `size-12 shrink-0 rounded-xl bg-surface`（@1564815）；单条加载条 `h-4 w-40 motion-safe:animate-pulse rounded bg-surface`（@1564442）。
- **卡骨架**（自动化模板）：`motion-safe:animate-pulse flex min-h-[114px] flex-col gap-2 rounded-xl border border-card-border bg-background p-3`（@4889701）；图表块 `w-full animate-pulse rounded-lg bg-surface motion-reduce:animate-none` h-14/h-56（@4282278）。
- 结构共性：**真实骨架 = 容器 role=status（sr-only 文案）+ 占位 aria-hidden + pulse**。

### 2.4 进度条三态（4 个家族）

| 家族 | 轨道 | 确定态 | 不确定态 | 偏移 |
|---|---|---|---|---|
| 工具调用 | `h-1 w-16 rounded-full bg-surface-hover` | `bg-brand transition-[width] duration-200` | `w-1/3` + keyframe 动 `left:-33%→100%`，`1.2s ease-in-out infinite` | @970525；css `.tool-call-progress-indeterminate` 全文 |
| 反馈/连接 | `h-1(或 h-0.5) bg-border` | `w-1/3 animate-pulse rounded(-r)-full bg-primary` / `bg-destructive`/`bg-success` | 同左（pulse 式，不扫动） | @1742319/@1778376 |
| 远程工作区 | `bg-progress-surface` | `bg-progress-surface-foreground transition-[width] duration-200`；**三态机：complete→100% / active→percent??100% / 其他→0%**，active 且无 percent 时加 `animate-pulse motion-reduce:animate-none` | 同上 | @2167413 |
| 源服务器顶条 | `h-0.5 bg-progress-surface` | `bg-progress-surface-foreground transition-[width]` | `tool-call-progress-indeterminate w-1/3` | @6382639 |
- **reduce 停帧**：css `@media (prefers-reduced-motion:reduce){.tool-call-progress-indeterminate{width:100%;animation:none;left:0}}` —— 不确定态 reduce 时**停满宽**，不停在扫描帧。
- **a11y**：`role="progressbar"` 7 处，全部带 `aria-valuemin/aria-valuemax` 与 `aria-label`；不确定态**省略** `aria-valuenow`（@970175 `...t===void 0?{}:{"aria-valuenow":t}`）。
- **默认曲线**：css `--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1)`、`--default-transition-duration:.15s`（css @13513 邻域）——`duration-200` 不带 ease 类即落在这条曲线上。

## 3 · 差异表

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | settings-page-styles.ts:130（DeveloperToolsRow 的开关） | disabled cursor | `cursor:default` | Switch `data-disabled:cursor-not-allowed`（opacity .5 一致） | mechanical | 上表 2.1；asar @1740982；css `.data-disabled\:cursor-not-allowed` 规则 |
| 2 | DeveloperToolsRow.tsx:37-47 | busy 时 a11y | 只有 `disabled={busy}`，无 aria-busy | Switch busy 用法挂 `aria-busy`（@2432940） | mechanical | 2.2 busy 三件套 ③ |
| 3 | AboutSection.tsx:232 | 单依赖安装钮 busy | 只有 `disabled`，无 aria-busy（update-all :228 已有） | busy 控件自身挂 aria-busy（@2079423/@2432940） | mechanical | 同上 |
| 4 | AboutSection.tsx:37 | 安装钮 disabled 透明度 | `.65` | 阶梯无 .65（0/40/50/60/70/100）；同位（带边框钮+spinner）用 `.60`（@6172611） | mechanical | 2.1 计数 + css 阶梯；`opacity-65` asar 0 命中 |
| 5 | AboutSection.tsx:230 | 依赖区 loading 形态 | 纯文字 `.dcu-about-message`（无 spinner/骨架） | 列表加载 = 骨架行（§2.3 插件商店款）；文字行必带 spinner（@1770692） | mechanical | 2.3 + 2.2 文字加载行 |
| 6 | zcode-theme.ts:224 | reduce 停帧（不确定态进度） | `animation:none; width:28%`（停扫描起点） | `width:100%; animation:none; left:0`（停满宽） | mechanical | css `.tool-call-progress-indeterminate` reduce 块 |
| 7 | AboutSection.tsx:233 | 进度条 a11y | 外层 `role="status"`，条上无 progressbar 语义 | 条本体 `role="progressbar" + aria-valuemin/max + aria-label`，确定态给 `aria-valuenow`，不确定省略 | mechanical | 2.4 a11y 行（7 处一致） |
| 8 | AboutSection.tsx:37 | 不确定态波形机制 | width 28% + 动 `translateX(-60%→280%)` | `w-1/3` + keyframe 动 `left`（-33%→100%）；另 pulse 式变体 | deviation | gapfill-17 已记 left vs transform + 轨道/填充色差；transform 为合成器友好选择，维持 |
| 9 | AboutSection.tsx:37 | 确定态曲线 | move 档 200ms (0,0,.2,1) | `duration-200` 无 ease → 默认 (0.4,0,0.2,1)；时长同 200ms | deviation | css `--default-transition-timing-function`；batch-17 已锁 move 档，属既有裁决，登记不修 |
| 10 | session-tree.tsx:174 + CodexWorkspaceBrowser.tsx:315 | 运行中转圈位置/颜色 | 行首 16×20 槽 + `--dcu-sidebar-tertiary` | 右侧元信息区 `size-3.5 animate-spin text-foreground-subtle` | deviation | APPLIED 二（批次 18/19 裁决维持，KNOWN-ISSUES §29）；**尺寸 14px 本轮复核一致**（size-3.5 40 处、任务行同款） |
| 11 | zcode-theme.ts:225 | reduce 停转圈 | 全局 `:root:root .dcu-spin{animation:none}`（带注释理由） | 150 处 spin 仅 15 处带 `motion-reduce:animate-none`，多数 reduce 下照转 | deviation | zcode-theme.ts:220-225 已写明 a11y 决策；插件更严，登记不修 |
| 12 | AboutSection.tsx:37 / settings-page-styles.ts:138 | busy 钮 cursor+opacity 契约 | `cursor:wait + .65`（install）、`cursor:wait + .55`（settings-document 钮，范围外仅登记） | 内部多案并存：`not-allowed+.60`（@6172611）、`pointer-events-none+.50`（Base Button）、`wait` 无 opacity（@2368225 唯一 wait）、满透明度 grid 交换（@2079423） | needs-live | 离线无法定哪案适用「安装钮」语境；需 9224 活体看 ZCode busy 钮手感后定 #4 的落点 |

> #4 与 #12 有耦合：`.65→.6` 依赖「not-allowed+.60 案」成立，若活体判给满透明度/grid 交换案则另行落地。机械部分（阶梯无 .65）不依赖裁决。

## 4 · 已对齐表（本轮复核，无需动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| spin 动画常量 | `dcu-spin 1s linear infinite` + 360° keyframes（zcode-theme.ts:185,203） | `--animate-spin:spin 1s linear infinite` + `@keyframes spin{to{transform:rotate(360deg)}}` | css @13416/@478696；zcode-theme.ts:176-184 注释同源 |
| 运行中转圈尺寸 | 14px（session-tree.tsx:174） | `size-3.5`（任务行 task-row 同款，asar 40 处） | asar @1745392 邻域计数；APPLIED 批次 18/19 |
| 开关几何 | 32×18 轨道 / 16px thumb / `translateX(calc(100% - 2px))` / ring-0 无阴影（settings-page-styles.ts:133-137，2026-11-01 已按 v3.17.1 对齐） | `data-[size=default]:h-[18px] w-[32px]`、thumb `size-4`、`translate-x-[calc(100%-2px)]`、`ring-0` | asar @1740750-1741350 全串 |
| 开关 disabled 透明度 | `.5`（settings-page-styles.ts:130） | `data-disabled:opacity-50` | css 规则 + @1740982 |
| busy 三件套 | 图标→`ZIconLoading` spinner + 文案→`installing`/`updatingAll` + `disabled`（AboutSection.tsx:228,232） | 图标→spinner + 文案→`submitting/transferring/opening` + disabled（@1745401/@2060682/@2079423） | 2.2 |
| aria-busy 容器级 | 依赖列表容器 `aria-busy={installing !== undefined}`（AboutSection.tsx:232） | 容器级 aria-busy 用法（@2139088 详情容器） | 2.2 ③；ZCode aria-busy 计 33 处 |
| 确定态宽度过渡时长 | 200ms（move 档） | `duration-200` | 2.4 |
| 进度百分比 tabular-nums | `.dcu-about-progress-pct`（AboutSection.tsx:37） | `tabular-nums`（@6379901 更新进度 %） | batch-17 已锁 |
| 不确定态 1.2s ease-in-out infinite | `dcu-about-progress-wave 1.2s ease-in-out infinite`（AboutSection.tsx:37） | `1.2s ease-in-out infinite`（css `.tool-call-progress-indeterminate`） | gapfill-17 四点同构 |
| document-hidden 停帧 | `html[data-document-hidden] * {animation:none!important}`（zcode-theme.ts:217） | 同机制（移植来源 styles.css html[data-document-hidden]） | zcode-theme.ts:204-216 注释 |

## 5 · 无参照 / 穷尽搜索记录

判「无参照」前跑过的全部模式（`/tmp/zcode-surface8/styles.js` 计数，css 为 `main.css`）：

- `animate-bounce`：js 0、css 0；`LoadingDots`/`loading-dots`：0 —— ZCode **无 dots/bounce 加载语言**，spinner 只有图标与环形两族。
- `Skeleton`（大写组件）：js 0；`skeleton`（小写）：js 6（artifact-chart-skeleton testid @4282389、template-skeleton-1..4 id 表 @4889332-4889398、上下文 @4889639）、css 0 —— 无独立骨架组件，全内联。
- `cursor-wait`：css 1 条规则（`.disabled\:cursor-wait:disabled`）+ js 1 处用例（@2368225）——wait 是 ZCode 的**少数派** cursor。
- 阶梯外值：`opacity-65` js 0（`opacity-55` js 1 且非 disabled 语境）——插件 .65/.55 均为阶梯外自造档。
- `progressbar`：js 7 处（§2.4 已列）；`data-slot=progress-indicator` js 0（与 gapfill-10 记录一致）。
- `aria-disabled:cursor-default`：css 仅 1 处（thought-slider @3262887），非常规禁用通道。
- `typing`（打字指示）：js 6 处但均为输入法/会话语境词，非加载动画；`dotted`：6 处均为 border 样式。
- 插件侧：`--dsw-alias-bg-skeleton`（zcode-tokens.ts:78,311，0.04/0.08）**全仓 0 消费方**（grep `--include=*.ts,*.tsx` 排除 .bak 与定义文件后 0 命中）——若落地差异 #5 骨架，取值应同步改 gapfill-5 §3b 已判的 ZCode 真值（light 3% / dark 5%，即 `--color-surface` 系）。
- 范围外说明：session-tree.tsx:85,91,94 的菜单项 `disabled` 标志传给宿主 `Menu`（`@deepseek-ai/dsh-client-ui-primitives`），禁用视觉由宿主原语渲染，不在本面可控文件内，未列为差异；插件自有 `.dcu-menu button:disabled`（CodexSidebar.tsx:158）属面 3（侧栏），不在此重复。
- 未做：9224 活体实测（本轮离线 asar 反解 + 源码对照；needs-live 项 #12 与「busy 钮手感」留待活体）。

## 复核（2026-11-03 · 独立复核员）

> **方法**：不复用本文任何中间产物与偏移，独立重跑。自写脚本（`review_surface8_extract.py`，存于复核工作区）解析 `/Applications/ZCode.app/Contents/Resources/app.asar` 的 pickle 头：size1=4、size2=8328596、hsize=8328592、jsize=8328585 → data_start=8+8328596=8328604，JSON 树起于字节 16、长 8328585；从树内 `out/renderer/assets/` 自取两资源落 `/tmp/review-surface8/`。sha256：styles.js=`a0fa280cfbc3e132336c1b1fc9fc98caf4b73b57d588804cb661e3286645b625`、main.css=`06eedaead11f16f01b56917460c173820851b7fd738f3e832df0e22626b3cfc0`，与 §0 记录**逐字节一致** → 提取可复现。插件侧实读工作副本 `~/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui`（git `50ac768`），五个引用文件的行号全部命中。下文偏移为复核员自测的**字节偏移**（grep/bytes.find 口径），标注（字符 n）处为换算后的文档口径对位。

### 复核发现的勘误（不影响任何 verdict，记录备查）

1. **§0 绝对偏移笔误**：styles.js 绝对偏移应为 8328604+349613121=**357941725**，§0 写作 350941725。header 偏移与文件大小正确，sha 一致，纯笔误。
2. **「字节偏移」标注不实（§0 行 18）**：styles.js 的行内数字实为 **UTF-8 字符偏移**，非字节偏移。铁证：`cursor-wait` 字符偏移 2368225 与文中 @2368225 零偏差（字节偏移实为 2460044）；Base Button 串字符偏移 1648755 零偏差（字节 1737497）。CSS 为纯字节口径（各处偏差 ≤54B，内容精确命中）。按文中偏移复现提取没问题，但拿偏移去 JS 里定位内容必须按字符搜。
3. **§2.4 a11y「全部带 aria-label」过头发**：role=progressbar 实测 7 处（字节 @970998/@1790284/@2220372/@4609454/@6090856/@6494284/@6496755），**6/7** 带 aria-label；工具调用款（FLe，@970998）只有 data-testid+valuemin/valuemax+条件 valuenow，**无 aria-label**。
4. **§2.2「守卫仅 15 处」需注口径**：15 = 与 `animate-spin` 相邻的 `motion-reduce:animate-none`（实测相邻恰 15 处）；全文件 raw 计 28 处（含 pulse 等非 spin 用途）。文档口径成立。
5. 菜单项 `data-disabled:*` 三连串实测 **6** 处（§2.1 表列 4 个偏移系示例），非差异项，仅记录。

计数复核（§2.1/§2.2 声称 → 复测）：disabled:pointer-events-none 18（raw，含 7 处 `data-disabled:` 前缀串）✅、cursor-not-allowed 13 ✅、opacity-50 12 ✅、opacity-100 9 ✅、opacity-40 8 ✅、opacity-60 7 ✅、cursor-default 5 ✅、cursor-wait 1 ✅、text-foreground-subtlest 8 ✅、animate-spin 150 ✅、size-3.5 animate-spin 40 ✅、aria-busy 33 ✅、progressbar 7 ✅、`opacity-65` js/css 均 0 ✅、animate-bounce 0 ✅。css 阶梯实见：`opacity-0/.4/.5/.6/.7/1` 六档（字节 @252660–252868），无 .65/.55。

### 逐条 verdict

| # | kind | verdict | 复核实见值（复核员自跑自读） |
|---|---|---|---|
| 1 | mechanical | **verified** | 插件 settings-page-styles.ts:130 `.dcu-settings-switch:disabled{cursor:default;opacity:.5}`；ZCode Switch 类串（字节 @1830226，字符 1740924）含 `data-disabled:cursor-not-allowed data-disabled:opacity-50`；css `.data-disabled\:cursor-not-allowed:where(…){cursor:not-allowed}`（@324269）。cursor 差异与 opacity .5 一致均坐实 |
| 2 | mechanical | **verified** | DeveloperToolsRow.tsx:37-47 实读：仅 `disabled={busy}`（:42），带 aria-checked/aria-label，**无 aria-busy**；ZCode Switch busy 案在字节 @2524862（bots boundGroups toggle）：`checked:…,"aria-busy":n===e.chatId,disabled:…` |
| 3 | mechanical | **verified** | AboutSection.tsx:232 实读：单依赖钮仅 `disabled={installing !== undefined}`，无 aria-busy；:228 update-all 确有 `aria-busy={installing === 'all'}`；ZCode 目录确认钮 @2170688 挂 `"aria-busy":u` |
| 4 | mechanical | **verified** | AboutSection.tsx:37 `.dcu-about-install:disabled{cursor:wait;opacity:.65}`；阶梯无 .65（上栏计数+css 0 命中）；同位带边框钮+spinner 案在字节 @6286305/@6286391：`disabled:cursor-not-allowed disabled:opacity-60` + `size-4 shrink-0 animate-spin text-foreground-subtlest`。机械部分（.65 阶梯外）不依赖活体裁决，成立 |
| 5 | mechanical | **verified** | AboutSection.tsx:230 `state==='loading'` 渲染纯文字 `<div className="dcu-about-message" role="status">`，无 spinner/骨架；ZCode 列表加载骨架在 @4845271（role=status+aria-label=common.loading+8 行 `h-8 … motion-safe:animate-pulse`+`size-5 … bg-surface-hover`+`h-3 w-28 … bg-surface-hover`）；文字加载行确带 spinner：@1860725 `py-2 text-ui-xs text-foreground-subtle`+`size-3 animate-spin`+`common.loading`、@946140 代码块 `min-h-28 … gap-2`+`size-4 animate-spin` |
| 6 | mechanical | **verified** | zcode-theme.ts:224 `animation:none;width:28%`；css reduce 块 @445862：`@media (prefers-reduced-motion:reduce){.tool-call-progress-indeterminate{width:100%;animation:none;left:0}}`——停满宽 vs 停 28%，坐实 |
| 7 | mechanical | **verified** | AboutSection.tsx:233 外层 `role="status"`，`.dcu-about-progress-bar/-fill` 无 progressbar 语义与任何 aria-valuet*；ZCode 7 处 progressbar 全带 valuemin/valuemax，不确定态省略 valuenow 两案确认（@970998 `…t===void 0?{}:{"aria-valuenow":t}`；@6494284 不确定时改挂 aria-busy）。nit 见勘误 3（aria-label 6/7），不动摇本条 |
| 8 | deviation | **证据成立** | 插件 AboutSection.tsx:37 `width:28%` + `@keyframes dcu-about-progress-wave{0%{transform:translateX(-60%)}100%{transform:translateX(280%)}}`；ZCode @971388 `w-1/3` + css @445718 `@keyframes tool-call-progress-indeterminate{0%{left:-33%}to{left:100%}}`（1.2s ease-in-out infinite）；pulse 变体 @1831615 亦在。transform vs left、轨道/填充色差属实 |
| 9 | deviation | **证据成立** | 插件 move 档实值 zcode-theme.ts:137 `200ms` + `cubic-bezier(0,0,.2,1)`；ZCode @971496 `transition-[width] duration-200` 无 ease 类；css `.transition-[width]`（@189338）timing 回落 `--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1)`（@13723）、`.duration-200{--tw-duration:.2s}`（@190934）→ 200ms/(0.4,0,0.2,1)。时长同、曲线异，属实 |
| 10 | deviation | **证据成立** | 插件 session-tree.tsx:174 + CodexWorkspaceBrowser.tsx:315（runningStyles）：16×20 槽、svg 14px、`color:var(--dcu-sidebar-tertiary)`；ZCode 任务行 loading 分支 @2346378/@2349781（group-hover/task-row 语境）确为 `size-3.5 animate-spin text-foreground-subtle`（=14px），`size-3.5 animate-spin` 计 40——**尺寸 14px 复核一致**。「右侧元信息区」从编译产物看 spinner 位于标题/状态后的同一 `flex shrink-0` 元信息条，方向一致但离线无法百分百坐实（本就登记 KNOWN-ISSUES §29） |
| 11 | deviation | **证据成立** | zcode-theme.ts:225 `:root:root .dcu-spin{animation:none}`，:218-225 有 a11y 决策注释；ZCode `animate-spin` 150 处，仅 15 处与 `motion-reduce:animate-none` 相邻（口径见勘误 4），多数 reduce 下照转——「插件更严」属实 |
| 12 | needs-live | **证据成立，维持 needs-live** | 插件两案属实：wait+.65（AboutSection.tsx:37）、wait+.55（settings-page-styles.ts:138 `.dcu-settings-document button:disabled{opacity:.55;cursor:wait}`）；ZCode 四案全真：not-allowed+.60（@6286305）、Base Button `pointer-events-none+.50`（@1737497）、`wait` 无 opacity（@2460044，全文件唯一 cursor-wait）、满透明度 grid 交换（@2170688，标签 span `invisible` 互换 + spinner+文案 span 挂 `role:"status"` + `disabled:opacity-100`，文案 `directoryBrowser.opening`）。离线无法裁决「安装钮」语境适用哪案；**9224 活体未做**，与 #4 的耦合注记（.65→.6 依赖 not-allowed+.60 案）逻辑自洽 |

**复核结论**：12 条全部通过——mechanical 7 条 verified、deviation 4 条证据成立、needs-live 1 条证据成立且离线不可裁（维持）。另记 4 条不影响 verdict 的勘误（§0 笔误、字符/字节口径、aria-label 6/7、守卫 15 口径）与 1 条计数备注（菜单 triple 6 处）。
