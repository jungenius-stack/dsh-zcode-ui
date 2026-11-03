# 批次 17 补采（gapfill-17）· 2026-10-30

> 对 batch-17「无参照项」5 条逐条再挖。全部命令本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`（341,377,861 字节）。
> 方法：`LC_ALL=C grep -a -o -c` 计数 + `grep -a -b -o` 取字节偏移 + `tail -c +N | head -c M` 切窗口（本机 grep 为 ZCode 自带 ugrep，`.\{0,N\}` 有界重复会报 `exceeds complexity limits`，凡遇即改窗口法）。设计文档侧复核了 `03f-settings.md` S3b、`tokens.json`、`03b-sidebar.md` §5 既有记录（未采新文档章节——本轮所有增量都来自 asar）。

## 1. AboutSection.tsx 自有组件几何与排版

**搜索过的模式**：`检查更新`(5)、`checkForUpdate`(53)、`updateAvailable`(25)、`update\.toast\.` 全键（7 键中英）、`desktopMenu\.help\.` 全键（8 键中英）、`settings\.plugins\.` 全键（40+ 键）、`height:4px`(17)、`h-\[4px\]`(**0**)、`1\.2s ease-in-out`(**2**)、`,800)`(2)、`threshold:.2`(**0**)、`threshold:0.2`(**0**)、`threshold:[0-9.]*` 分布（0×6/.8×5/1×3/3×1/1024×1，**无 0.2**）、`color-mix(in srgb`(123)、`12%,transparent`(5)、`refreshInterval:[0-9]*`（仅 0 与空值，无 800）、`h-1}`(50)、`setInterval`(344，未逐处定性，以特征值反查为准)。

**命中原文**：
- **不确定态进度条（本批最大收获）**：ZCode 工具调用进度组件 `pFe`（偏移 327220367）——
  `role:`progressbar`…children:[…(0,$.jsx)(`span`,{className:`relative inline-block h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-hover`,children:t===void 0?(0,$.jsx)(`span`,{className:`tool-call-progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-brand`}):(0,$.jsx)(`span`,{className:`absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-200`,style:{width:`${Math.round(t*100)}%`}})})`
  其 CSS（偏移 326257012）：`.tool-call-progress-indeterminate{animation:1.2s ease-in-out infinite tool-call-progress-indeterminate}@keyframes tool-call-progress-indeterminate{0%{left:-33%}to{left:100%}}`，且带 `@media (prefers-reduced-motion:reduce){…animation:none}`。
  对照插件 `.dcu-about-progress-bar`（AboutSection.tsx:37）：`height:4px` / `border-radius:full` / 轨道底 `border-l2` / 确定态 `width%`+move 曲线 / 波浪态 `width:28%` + `1.2s ease-in-out infinite`。**轨道 4px、填充块 1/3≈28%、1.2s ease-in-out infinite、确定态按宽度过渡——四点同构**（差异：ZCode 轨道底是 surface-hover、填充 brand；插件是 border-l2/business-primary；ZCode 波形动 left、插件动 translateX）。
- **12% 语义色透明底**（3 处组件 + 1 处 CSS 表）：`bg-[color-mix(in_oklab,var(--color-warning)_12%,transparent)]`（`wf-arrive` 工作流徽标，py-0.5 pl-1.5 pr-2 rounded-full + `text-warning` 同色前景）；另有一处 `bg-[color-mix(in_oklab,var(--color-destructive)_10%,transparent)] text-destructive`。插件 `.dcu-about-message` 的 `color-mix(…12%,transparent)`+同色系前景手法与之一致（ZCode 用 oklab+warning，插件用 srgb+business-primary/error）。
- **图标 16/14/12 混排**（偏移 330535033 同窗）：`var g0={size:16,strokeWidth:2}`（导航图标 16）；`function _0({size:e=12,containerSize:t=20})` 内 `e===14?`size-3.5`:`size-3``（12/14 两档、外框 18→size-4.5 / 默认 size-5）；`size-3.5` 全 bundle **501** 处。16/14/12 混排是 ZCode 常态，插件 About 的 16/14/12 混排有档位实据。
- **更新/安装反馈对应物（形态参照）**：`update.toast.available/downloading/alreadyDownloading{progress}%/ready/upToDate/error/devSkipped`（发现新版本/正在下载/已下载重启安装/已是最新/检查更新失败）+ `desktopMenu.help.checkingForUpdates/updateAvailableVersion/downloadingUpdateProgress/restartToUpdate…` + `settings.plugins.checkForUpdates.found`（发现 {count} 个插件可更新）`.none`、`settings.plugins.list.updateAvailable`（可更新）、`settings.plugins.detail.update`。ZCode 无「依赖安装」页；最接近物是**自更新 toast 流**（progress 只出现在文案，无常驻进度面板）与**已装插件管理分区**（启停/卸载/检查更新），与插件 About 的常驻安装面板+分阶段进度（resolving/downloading/linking/building）形态不同。

**最终判定：升级为有参照（部分）**——① 4px 轨道 + 1.2s ease-in-out 不确定态波形 + 确定态宽度过渡，与 ZCode 工具进度条四点同构，`03f`/`02-motion` 可引 asar 原文（037220367/326257012）；② 图标 16/14/12 混排档与 12% 语义色底手法有 ZCode 实据；③ 安装/更新反馈形态（toast vs 常驻面板）可作设计决策参照。**轮询 800ms（`,800)` 两处均为 CodeMirror matchBrackets 清除延时）、IO threshold 0.2（全 bundle 无 0.2 档）、min-h32/min-h28/min-h64 等行与按钮几何、h2 20/28 与 h3/ul 排版：确认无参照**（03n 语境不适用结论维持）。

## 2. settings-page-styles.ts 自有控件与态（switch / trigger / 导航搜索框）

**搜索过的模式**：`role:`switch``(2)、`role:"switch"`(0)、`aria-checked`(135)、`SwitchThumb`(18)、`h-5 w-9`(1)/`w-9 h-5`(0)、`translateX(16px)`(**0**)、`translate-x-4`(3，均为 CSS 生成表与会话布局 `-translate-x-42`)、`data-\[state=checked\]`(4)、`rotate:18deg`(**0**)、`rotate-18[^0]`(**0**；`rotate-18` 裸串 7 处全为 `rotate-180` chevron 前缀误命中，逐处窗口核实)、`scale:.98`(1)、`scale-\[0\.98\]`(2，均为 tailwind 生成表定义，无组件使用)、`搜索设置`/`搜索或跳转`/`设置搜索`(**0**)、`settings.navigation`(5)。

**命中原文**：
- **ZCode 具象开关 `Lln`**（偏移 330535033，`"data-testid":`automation-switch-toggle``，自动化运行区）——
  `function Lln({checked:e,onChange:t,ariaLabel:n,color:r=`green`,size:i=`default`}){…className:Z(`relative inline-flex shrink-0 items-center rounded-full transition-[background-color,box-shadow] hover:ring-2 hover:ring-border-hover focus-visible:ring-2 focus-visible:ring-input-border-focused/30`,e?a:`bg-input`,o?`h-4 w-8`:`h-5 w-9`),children:(0,$.jsx)(`span`,{className:Z(`absolute inline-block size-3.5 rounded-full shadow transition-all duration-200`,e?…:`bg-primary`,e?o?`left-[17px]`:`left-[18px]`:`left-px`)})}`
  逐项对照插件 `.dcu-settings-switch`（settings-page-styles.ts:124-129）：
  | 参数 | 插件 | ZCode `Lln` | 结论 |
  |---|---|---|---|
  | 轨道 | 36×20（w36 h20） | 默认 `h-5 w-9`=20×36（另有 sm `h-4 w-8`=16×32） | **一致** |
  | thumb | 16×16 | `size-3.5`=14×14 | 不同 |
  | 位移 | padding 2 + translateX(16) → 终点 x=18 | `left-px`(1px)→`left-[18px]` → 终点 x=18 | **终点一致**，起点差 1px |
  | 开启底 | `--dsw-alias-brand-primary`（中性主色） | `bg-success`/`bg-brand`（绿/蓝语义色） | 不同 |
  | hover/focus | 无 hover 态；focus outline 2px focus-ring | `hover:ring-2 ring-border-hover`；`focus-visible:ring-2 ring-input-border-focused/30`（外描边圈系） | 不同手法 |
  | disabled | opacity .5 | 组件无 disabled 档 | 插件自有 |
- **Radix Switch 基元存在但无带样式使用**（偏移 326690588）：`_m=`Switch`` 的 forwardRef 组件（`role:`switch`,"aria-checked":…,"data-state":Dye(…)`）+ `SwitchThumb` `wye`；`data-[state=checked]` 全 bundle 仅 4 处 = checkbox ×2（`data-slot:checkbox`）+ dropdown menu item ×2，**没有 switch 的 data-state 样式**。即 03f S3b「ZCode 侧开关从未采到」至此定案：唯一具象开关即 `Lln`。
- 设置导航无搜索框：ZCode 设置导航为硬编码数组渲染（见条目 4），无搜索输入（i18n 亦无键）。

**最终判定：开关升级为有参照（found）**——36×20 轨道与 18px 位移终点两处同值可作 S3b「36×20 / r8 内部一致」的 ZCode 对照证据；thumb 14 vs 16、语义色底、ring 式 focus 为差异项，采纳与否属设计决策。**trigger 的 rotate(18deg) 与 active scale .98：确认无参照**（18° 全 bundle 为 0；0.98 仅生成表无使用）。**导航搜索框：确认无参照**（03b §1 搜索态 ❓ 维持）。

## 3. settings-page-styles.ts 布局与宿主适配参数

**搜索过的模式**：`864px`(15，逐簇定性)、`@min-\[864px\]`(8)、`letter-spacing:-\.2px`(**0**)、`letterSpacing:-.2`(**0**)、`tracking-[-0.2`(0，ugrep 复杂度中断未跑完)、`text-\[18px\]`(**0**)、`text-lg font-[a-z]*`(9)、`vibrancy`(1)、`backgroundMaterial`(1)、`titlebar`(44)、`app-region:drag`(71，抽样)、`trafficLightPosition`(2)、`max-width:900`(**0**)/`max-width:720`(1)/`max-width:600`(6)/`max-width:480`(1，后三者经窗口核实均为 tailwind 生成表条目)、`max-md:`(95)、`@container`(53)、`max-w-\[720px\]`(2，生成表)。

**命中原文**：
- **864px 语义**：全部命中集中在会话区——CSS 生成表 `@min-[864px]/conversation:*` 断点条目；布局串 `c2t/l2t=`w-full @min-[864px]/conversation:w-[calc(100%_-_6rem)] @min-[864px]/conversation:max-w-4xl …``（composer 宽度）；rail 显隐 `…invisible … @min-[864px]/conversation:visible …`（偏移 330705458）；markdown 表格 inset `[--markdown-table-layout-left-inset:48px]`（偏移 330757579）。**ZCode 的 864 是会话容器断点，不是设置页内容宽度——数值撞车、语义不同，不构成对齐证据**（可作旁注：864/内容可读宽度是两侧共用的惯例值）。
- **macOS 安全区**：侧栏顶部 `h-12 shrink-0 [app-region:drag]`（48px 拖拽区）；`titleBarStyle:"hidden"` + `var nc={x:22,y:23}`（trafficLightPosition）+ `vibrancy:"under-window",visualEffectState:"active"`（mac）/ `backgroundMaterial:"acrylic"`（win）/ `backgroundColor:"#00000000"`。插件 `padding-top:calc(var(--dsh-frame-top-clearance,48px) + 8px)` 的 48 与 ZCode 侧栏拖拽区 h-12 同值；原生材质机制两侧同在（ZCode 无 DSH 的网页层逐级 transparent 贯通，`html[data-dsh-native-backdrop=mica]` 系 DSH 自有机制，asar 无 mica 字串对应）。
- **18px/600 标题档**：`text-lg font-semibold` ×9，其中 `appError` 页 `h1` `mt-4 text-lg font-semibold text-foreground`；`settings.modelProvider.codingPlan` 价格两处 `text-lg font-semibold leading-6`（显式 24px 行高）。插件设置页 h1 = 18px/26px/600/**-0.2px**：字号字重有 ZCode 同档；26px 行高无（ZCode 该档为默认 28 或显式 24）；**负字距全 bundle 为 0 命中**（03n A4 的 +0.025em 与此亦不同向——ZCode 标题无负字距先例）。
- 断点：ZCode 主体系是 `max-md:`（95）+ 容器查询 `@container`（53）；手写 `@media(max-width:600px)` 等 8 处经窗口核实均为 CSS 生成表条目。插件 720/900/600/480 手写断点无 ZCode 对应档位表。

**最终判定：升级为有参照（部分）**——macOS 48px 安全区（h-12 drag 区）、原生毛玻璃机制（vibrancy/acrylic）、18px/semibold 标题档三项有 ZCode 实据可引；**inner 864px（语义不同）、-0.2px 负字距（0 命中）、26px 行高、四档手写断点：确认无参照**。S4「容器差异非缺陷」结论不变。

## 4. user-error.ts / input-history.ts / plugin-config.ts / business-request-error.ts 全模块

**搜索过的模式**：`UNKNOWN_SESSION`(**0**)、`登录已过期`(1)/`请先登录`(3)、`errors.unauthorized` 键名(**0**)、`"[a-zA-Z.]*":`[^`]*权限[^`]``（仅 browser.permission 站点权限族）、`"[a-zA-Z.]*":`[^`]*服务[^`]*可用[^`]``(4)、`inputHistory|commandHistory|messageHistory`(**0**)、`localStorage.setItem(`[^`]*``(仅 `wba.${e}`)、`localStorage.getItem`(59)、`sessionStorage.setItem`(8 键全为压缩变量)、`settings.nav[a-zA-Z.]*`、`草稿`(77，未逐处定性，无持久化键证据)。

**命中原文**：
- **401 反馈粒度先例**：`login.expired.title`=登录已过期 / `login.expired.description`=为了保障账号安全，请重新登录。/ `login.expired.action`=重新登录 / `login.expired.restart`=确认并重启；per-surface 细分键 `settings.mcp.failure.not_authenticated`=当前未登录，请先登录 ZCode。、`conversationShare.error.authenticationRequired`=请先登录 ZCode 后再分享…、`manualClaimPlan.claim.failure.loginRequired`=请先登录后再领取。——ZCode 对「认证失败」按业务面细分文案键 + 一个通用登录过期弹窗，无统一 `unauthorized` 键。
- **503 同构先例**：`chat.highspeed.requestFailedFallback`=加速服务暂不可用，本轮后续内容将使用原模型继续生成、`offPeak.error.unavailable`=闲时任务服务暂时不可用，请稍后重试。、`conversationShare.error.safetyCheckUnavailable`=安全检查服务暂不可用，请稍后重试。——「服务不可用」同样按业务面细分。
- **403**：无通用 forbidden 键；最近似特例 `settings.mcp.failure.coding_plan_required`（账号权限类，per-surface）。
- **设置分区注册**（偏移 uht 表 + 渲染处）：ZCode 设置导航为硬编码数组 `.filter(…).map(({id,icon,titleId})=>…hXn{…,"aria-current":r?`page`:void 0,"data-testid":Sb(yLe,e),"data-settings-section-nav":e…})` + 遥测 `featureId:`settings.navigation`,action:`open_section``。无 slots/动态注册机制。
- **localStorage 唯一动态键 `wba.*`**：上下文为 web-bundle-analyzer（statSize/parsedSize/gzipSize，MobX store `Dn`），与输入历史无关。

**最终判定：升级为有参照（部分）**——401/503 的「per-surface 细分文案 + 单一通用兜底」是 ZCode 错误文案组织的实据，可对照插件 `errors.unauthorized/forbidden/serviceUnavailable` 三键映射（粒度决策参照）；**UNKNOWN_SESSION 标记、403 通用键、输入历史 200/8000/20/1MB 限额体系（ZCode 主应用几乎不走浏览器存储）、slots order 16：确认无参照**（行为逻辑无视觉决策点的原判不变）。

## 5. 禁用态透明度三档与 hover 底令牌

**搜索过的模式**：`disabled:opacity-[0-9]*` 全档分布、`disabled:pointer-events-none disabled:opacity-50`、`--color-menu-hover:`、`--color-surface-hover:`、`--color-border-hover:`、`--color-input-border-focused:`、`--color-brand:`（各取定义值）；文档侧复核 `03f-settings.md` S3b、`tokens.json:39-42`、`03b-sidebar.md:116,136-138`。

**命中原文**：
- **禁用透明度档位分布**（全 bundle 实测）：`disabled:opacity-50` **×37**（主流档）、`opacity-100` ×9、`opacity-40` ×8、`opacity-60` ×6、`opacity-70` ×2、`opacity-0` ×1；**无 65 / 55 档**。shadcn 式组合 `disabled:pointer-events-none disabled:opacity-50` ×5（按钮基元）。→ 插件 switch disabled `.5` 与 ZCode 主流禁用档**同值**；install `.65` 与 document 按钮 `.55` 在 ZCode 档位表中不存在。
- **hover 令牌全值**（ZCode 侧此前未录的部分）：
  - `--color-menu-hover`：浅色 `var(--color-neutral-100)`（=oklch(97% 0 0)）与字面 `#f0f0f0`；深色 `var(--color-neutral-900)`（=oklch(20.5% 0 0)）与字面 `#363636`。这是 DSH `--dsw-specific-menu-item-hover` 的**同位令牌**（菜单项 hover 独立档）——install 按钮 hover 选 specific-menu-item-hover 的语义对应物在 ZCode 成立。
  - `--color-surface-hover`：浅 5% 黑 / 深 10% 白（tokens.json:39-42 与 03b §5 已录，本轮 asar 复核一致）。
  - `--color-border-hover`：浅 `#0d0d0d26`(15% 黑)/`#0a0a0a33`，深 `#ffffff26`(15% 白)/`#fafafa4d`；`--color-input-border-focused`：`var(--color-brand)` 或 `var(--color-border-hover)`；`--color-brand`：`#000/#fff`（黑白主题）或 `sky-400/500`。
- external-link hover 所用 `--dsw-alias-interactive-bg-hover`：浅色黑 5% 恰同 ZCode surface-hover 浅色、深色 5%↔10% 差距依旧——**维持原判「语境不足不判」**（DSH 侧令牌值不在 asar 与本仓文档内，无法核对 DSH 深色取值意图）。

**最终判定：升级为有参照（部分）**——① switch disabled .5 ↔ ZCode `disabled:opacity-50` 主流档同值，`03f` S3b 可引（37 处分布实跑）；install .65 / document .55 确认无 ZCode 档（插件自有，或为 on-card 底上的对比度取值，判归插件自主）；② install 按钮 hover ↔ `--color-menu-hover`（#f0f0f0/#363636）同位成立；external-link hover ↔ surface-hover 维持浅色同值、深色存疑。

---

## 汇总

| 条目 | 判定 |
|---|---|
| 1. AboutSection 自有组件几何与排版 | **升级（部分）**：4px/1.2s wave 进度条与 ZCode 工具进度条四点同构、图标 16/14/12 档、12% 语义色底手法有据；轮询 800ms、IO 0.2、按钮/行几何、h2/h3 排版确认无 |
| 2. switch / trigger / 导航搜索框 | **开关升级**：ZCode `Lln` 36×20 轨道、位移终点 18px 同值（thumb 14、语义色底、ring focus 为差异项）；Radix 基元无带样式使用；rotate(18deg)/scale .98/搜索框确认无 |
| 3. 布局与宿主适配 | **升级（部分）**：macOS 48px 安全区（h-12 drag）、vibrancy/acrylic 原生材质、18px/600 标题档有据；864 语义不同不判对齐、负字距 0 命中、断点表确认无 |
| 4. 四个行为模块 | **升级（部分）**：401/503 per-surface 细分文案键 + login.expired 弹窗为粒度参照；UNKNOWN_SESSION、403 通用键、输入历史限额、slots order 确认无 |
| 5. 禁用透明度与 hover 令牌 | **升级（部分）**：`disabled:opacity-50` ×37 主流档与 switch .5 同值（无 65/55 档）；`--color-menu-hover` #f0f0f0/#363636 为 install hover 同位参照；external-link hover 深色维持存疑 |

found=5，absent=0（5 条均至少找到一项此前缺失的 ZCode 参照；子项级确认无参照 9 处：轮询 800ms、IO 0.2、About 按钮/行几何与标题排版、rotate(18deg)、scale .98、导航搜索框、-0.2px 负字距与 26px 行高与断点表、UNKNOWN_SESSION/403 通用键/输入历史限额/slots order、65/55 禁用档）。
