# night2 · surface-4 · toast 与通知（错误通知形态）

> 深挖员：surface-4。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面（ask 指定）：`uiplug/src/client/user-error.ts`、`uiplug/src/client/business-request-error.ts`；两者是**纯文案映射模块**，不含视觉——本轮把渲染链一并挖全（Modal 行内错误 `.dcu-wb-error`、About 消息盒、连接器空态、设置页 toast 放行逻辑），见 §1.7。
> 前置：已读 `night-audit/APPLIED.md`（批次 5 toast 底 #fff + label 同步 #0d0d0d；§二「菜单壳毛玻璃」裁决）与 `README.md` 索引。APPLIED 已落地项不重复报。

## 0. 提取方法与可复现命令

```bash
# asar 头（与 surface-3 同法）：hdr u32 = (4, 8328596, 8328592, 8328585)，数据区基址 8+8328596
# 本轮提取产物（/tmp/zc-toast-extract/）：
#   out/renderer/assets/pptxElementReference-1Bf5SOFK.js  253,493B @asar 351137047  ← toast 组件实现
#   out/renderer/assets/styles-Dv5E6Odo.js               6,839,502B @asar 357941725  ← 业务 bundle（调用现场）
#   out/renderer/assets/styles-NK68EN_n.css                 480,065B @asar 364781227  ← 编译 CSS
# 侧栏 bundle 逐 offset 定位脚本：python3 读 asar 头 → walk files → offset 映射（同 surface-3 §0）
```

- 「pptx@N」= pptxElementReference-1Bf5SOFK.js 内字节偏移；「js@N」= styles-Dv5E6Odo.js 内偏移；「css@N」= styles-NK68EN_n.css 内偏移；「asar@N」= app.asar 绝对偏移。`grep -aob` 均可复核。
- 活体（9224）本轮未采样——全部结论为 asar/源码静态证据，needs-live 两条见 §5。

## 1. ZCode toast 家族全景（本轮新挖，静态源码级）

### 1.1 架构与状态机

自研 toast（**非** shadcn/sonner/radix：`Toaster|ToastProvider|sonner|toast-viewport` 在 styles.js 全 0 命中）。实现整体在 pptx bundle：

- **宿主**：首 toast 时 `document.createElement('div'); e.id='zcode-toast-host'; document.body.appendChild(e)` + `createRoot(e).render(<Viewport/>)`（pptx@238638，`function no` @238569）。
- **store**：`qa=0`（自增 id）、`Za`（排队中）、`Qa`（dedupe 覆盖）、`$a`（取消标记）、**`eo=3e3`（默认停留 3000ms）**、**`to=200`（出场等 200ms 再卸载）**（pptx@238489）。
- **dedupeKey**：同 key 的旧条被替换（`Ga`：`[...e.filter(e=>e.dedupeKey!==t.dedupeKey),t]`，pptx@112259）。
- **可见性状态机**：mount → `requestAnimationFrame(()=>setVisible(true))`；计时到 `durationMs` → `setVisible(false)` → 200ms 后卸载；手动 dismiss 同链路（`function oo` @238700–241287 区段）。**无 hover 暂停计时逻辑**。

### 1.2 位置（`Ka`，pptx@112448；z-[9999] css@34234）

| position | 容器 class（Tailwind） | 几何 |
|---|---|---|
| top-center（**默认**） | `fixed top-16 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2` | 顶部 64px，垂直堆叠 gap 8px |
| top-right | `fixed right-4 top-16 z-[9999] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2` | 右 16px |
| bottom-center | `fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 …` | 底 16px+安全区 |
| bottom-left | `fixed bottom-[…] left-4 z-[9999] flex flex-col items-start gap-2` | 左 16px |
| anchorId 模式 | top-center 容器 + `style:{left:元素中心x}` | 锚在任意元素上方（automations 用，anchorId=automations-main-toast-anchor，js@5001060） |

### 1.3 toast 壳全 CSS（`so`，pptx@241287；壳类串锚 @241623）

```
壳（全变体共用）：
  rounded-2xl                       → --radius-2xl = 1rem = 16px（css@95123）
  border                            → 1px，色由变体给
  bg-toast/60                       → color-mix(in oklab, var(--color-toast) 60%, transparent)
                                       兜底 #fff9（css@130690；--blur 前支持场景）
  text-ui-base                      → 14px（--ui-font-size:14px css@414650；css@152737）
  shadow-lg                         → 0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a（css@172110）
  backdrop-blur-xl                  → blur(24px)（css@181345）
  transition-[transform,opacity]    → css@188464
  duration-200                      → --tw-duration:.2s（css@190935）
  ease-[cubic-bezier(0.77,0,0.175,1)] → css@191318
  motion-reduce:transform-none motion-reduce:transition-opacity
```

**进出动画（transform/opacity 驱动，200ms，(.77,0,.175,1)）**：
- 顶部系：藏 `-translate-y-1 scale-[0.98] opacity-0` ⇄ 显 `translate-y-0 scale-100 opacity-100`（位移 4px + 缩放 .98 + 淡入淡出）
- 底部系（isBottom）：藏 `translate-y-1 scale-[0.98] opacity-0`（向上 4px）
- top-right：藏 `translate-x-[calc(100%+1rem)] opacity-0`（右滑出）
- 注意曲线 (.77,0,.175,1) **不是** 02-motion 五档任一（(.4,0,.2,1) 等），是 toast 专用 easeInOutCirc 系曲线。

### 1.4 变体（4 分支，宽阶梯）

| 变体 | 触发 | 宽度 | 边框 | 内部结构 |
|---|---|---|---|---|
| **default**（variant 缺省 = 含**一切错误**） | 调用不传 variant | 无宽度覆盖 + `border-border px-4 py-3 text-foreground whitespace-pre-line` | --color-border | 纯消息原文，无图标无标题分层 |
| info / warning / success | variant 传三值之一（g 分支） | `w-[min(536px,calc(100vw-2rem))]` | border-border | `flex gap-4 px-4`：图标 size-4（warning=黄 `text-warning`，success/info=`text-foreground-subtle`）+ 主体 `py-3 text-sm`（标题 text-foreground、正文 `mt-0.5 text-foreground-subtle`）+ 动作下划线字 + 关闭钮 size-6 X size-3.5；progress 模式出 `toast-progress` 进度条（track bg-surface-hover，tone:destructive→bg-destructive） |
| update | `update.toast.ready` 等（js@6058586） | `w-[min(300px,calc(100vw-1rem))]` | border-popover-border | `grid cols-[auto_1fr_auto] gap-2 px-2.5 py-2`：圆点 size-2 `bg-primary/80 ring-4 ring-accent` + 标题 `font-medium` + 正文 truncate + 动作钮 `h-7 bg-secondary px-2` |
| source-server-update | js@6109979 等 | `w-[min(480px,calc(100vw-2rem))]` | border-popover-border | `flex gap-3 px-4 py-3`：圆点 `mt-1.5 size-2 bg-primary ring-4 ring-accent` + 标题 `leading-5 font-medium` + 正文 `text-ui-sm leading-5` + 动作钮 `h-8 bg-primary px-3 text-primary-foreground` |

关键 token 实值（.theme-zai-* = 实际应用主题层）：
- `--color-toast`：:root=var(--color-white)（css@23447）→ `.dark`=var(--color-neutral-900)（css@426068）→ **`.theme-zai-light`=#fff（css@436127）／`.theme-zai-dark`=#2b2b2b（css@443774）**。浅色 toast = 白 60% + 24px 毛玻璃；深色 = #2b2b2b 60%。
- toast 文字 = `text-foreground`：**浅 oklch(26.9% 0 0)（≈#262626）／深 oklch(87% 0 0)（≈#d4d4d4）**（css@434386/442041；--color-neutral-800/300 定义同 css 头部）。
- `--color-warning`：浅 #e07b00／深 #ff8a30；`--color-hover`：浅 #0d0d0d0d／深 #ffffff0d；`--color-secondary`：浅 #e6e6e6／深 #363636。

### 1.5 停留时长（现场实测取值）

| 场景 | durationMs | position | 证据 |
|---|---|---|---|
| **默认（绝大多数）** | **3000**（eo=3e3） | top-center | pptx@238489；`durationMs ?? eo`（`co` @246145） |
| scheduledPreview.running | 4000 | top-center + variant:info + dismissible | js@5013599 |
| update.toast.ready | 4000 | bottom-left + variant:update | js@6058586 |

### 1.6 错误通知形态（doctrine，本轮核心发现）

1. **任务级异步失败 → toast（default 变体 = 纯文字）**：重命名失败 `Zo(formatMessage({id:'taskList.renameFailed'}))`（js@2422128、@5253248）；置顶失败（js@5258332）；归档/关闭走统一包装 `I=(e,t)=>{e().catch(e=>F(e,t))}`、`F=(e,t='taskGroup.updateFailed')=>{J.error(...); Zo(f.formatMessage({id:t}))}`（js@2389662/2389772）。文案 = **短裸句**：「重命名任务失败」「归档任务失败」「更新置顶状态失败」（asar@342534127 locale 表）；带细节时用槽位：「删除机器人失败：{error}」「移动失败：{reason}」（asar locale 表，`bots.deleteFailed` js@2539682、`workflows.hub.move.failed` js@4989979）。
2. **对话框表单提交失败 → 行内 `<p className="text-ui-base text-destructive">`（14px 红，无底无框无图标）**：分支切换器 commit 对话框（js@3773024），文案「提交失败：{error}」「已提交，但推送失败：{error}」（asar@342472005）；成功才发 toast（js@3820119）。
3. **错误 toast 无专属红/图标**——default 变体即错误形态（`variant:`error`` 全 bundle 0 命中）；progress.tone==='destructive' 时进度条染红（pptx@245100 区段）。
4. **role/aria**：toast 条目**无 role、无 aria-live**（so JSX 无该属性）；全应用唯一 live 区参照是重连条 `"aria-live":"polite"`（js@5237281）。

### 1.7 插件侧错误通知全景（渲染链，ask 文件的下游）

| 消费端 | 渲染 | 位置 |
|---|---|---|
| `userErrorText` → 侧栏行内操作/弹窗 | `setError(text)` → Modal 内 `<div className="dcu-wb-error" role="alert">{t('sessions.failed',{message:error})}</div>` | CodexWorkspaceBrowser.tsx:695,755,774,1079,1127-1134；session-row-actions.tsx:51,109 |
| `installErrorText` → 关于页 | `setMessage({error:true})` → `.dcu-about-message[data-error=true]`（`role="alert"`） | AboutSection.tsx:182,207,235 |
| `businessRequestErrorKey` → 连接器 | `.dcu-connector-empty role="alert"`；iframe 场景走 postMessage 不落 DOM | ConnectorsSection.tsx:139,91-97 |
| **插件侧 toast** | **无**——`Zo(|toast(` 在 src/client 零命中；`--dsw-alias-toast-bg/label` 仅定义零消费 | grep 记录见 §5 |
| 官方 toast 共存 | 设置页隔离逻辑把 body 直接子级 `role=alert` 当「官方 Toast」放行 | CodexSettingsPage.tsx:150,168 |

`.dcu-wb-error` 实际样式 = 主题层三态壳（zcode-theme.ts:197-198）：`display:block; padding:8px 10px; border-radius:8px; font-size:12px; line-height:20px` + **全实例染 `--dcu-state-error-text`**（浅 #b3261e／深 #ff5c5c）；CodexWorkspaceBrowser.tsx:292 另补 `margin:4px 0; background:transparent`。

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 4 条）

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | CodexWorkspaceBrowser.tsx:1132,1133,1134×2、ScheduleBrowser.tsx:191（`role="status"` 的 pending 提示 ×5） | 进行中提示误用错误红 | 同一 `.dcu-wb-error` 类 → 主题染 `--dcu-state-error-text` 红（zcode-theme.ts:198 对该类无差别染色） | `role="status"` 状态提示 = 中性灰：`<span role="status" className="text-ui-xs text-remote-foreground-muted">`（js@2231954）；红只给错误 | 类与 role 全部静态可查；修法 = pending 处换 `.dcu-state`（三态壳中性档，zcode-theme.ts:197）或 `.dcu-state--empty`，零新增 CSS |
| M2 | CodexWorkspaceBrowser.tsx:1079 等、ScheduleBrowser.tsx:192、session-row-actions.tsx:109（`sessions.failed` 插值共 **10 处**，grep 计数） | 「操作失败：{message}」泛化前缀双包 | 已映射完整句（如「暂时无法重命名该会话，请稍后重试。」）再包一层泛化前缀 → 「操作失败：暂时无法…」 | ZCode **从不**给完整句再套泛化前缀：toast = 裸短句「重命名任务失败」；行内 = 特定动词+细节槽「提交失败：{error}」；{error} 槽放的是技术细节串（Aj），不是完整句 | asar@342534127 locale 表、asar@342472005；locales.ts:162 |
| M3 | CodexSettingsPage.tsx:150,168 | 官方 toast 被设置页隔离误伤 | 放行条件只有 `body 直接子级 && role="alert"`；而官方 toast 根 `#zcode-toast-host` **无 role** → 设置页开启时 toast 全树被 `inert`（可见但动作/关闭钮点不动） | 官方 toast 根 id 固定 `zcode-toast-host`，条目无 role、无 aria-live（pptx@238638、so JSX） | 修法 = isolate/keepFocus 两处放行加 `element.id==='zcode-toast-host'`（或 `body > [id^=zcode-toast]`）；行为活体确认见 N1 |
| M4 | zcode-tokens.ts:246,472 `--dsw-alias-toast-label` | toast 文字别名值取错对 | 浅 **#0d0d0d**／深 **#f8f8f8**（= tooltip-foreground 的值对，css@436127/443774 tooltip-foreground） | toast 文字类是 `text-foreground`：**浅 ≈#262626**（oklch 26.9% 0 0）／**深 ≈#d4d4d4**（oklch 87% 0 0）（css@434386/442041） | so 壳/三分支全部 `text-foreground`（pptx@241623 区段）；APPLIED 批次 5「label 同步 #0d0d0d」是把 tooltip-foreground 误当 toast 文字；alias 现零消费，改值零风险 |

> M4 附带更正：`--dsw-alias-tooltip-label`（#0d0d0d/#f8f8f8）**没错**——tooltip-foreground 才是 #0d0d0d/#f8f8f8；错的只是 toast 那一行借了 tooltip 的值。

## 3. deviation（触既有裁决，登记不修）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | zcode-theme.ts:51（`--dcu-state-error-text` 浅 #b3261e） | 错误**文字**浅色档 | #b3261e（对白 ≈6.9:1） | 行内错误文字 `text-destructive` = theme-zai-light `--color-destructive` **#e03131**（css@435063，对白 4.5:1 临界） | 2026-10-14 三态壳规范明言「错误文字 ≥4.5:1」取更深红（zcode-theme.ts:191-194）；ZCode 恰好压线 4.5。维持插件值，登记即可。**深色两值精确一致 #ff5c5c**（css@442714 ↔ zcode-theme.ts:77） |
| D2 | zcode-theme.ts:197 `.dcu-wb-error` 壳几何 | 行内错误盒形态 | 12px 字 + `padding:8px 10px` + r-lg(8px) 圆角 + `margin:4px 0`（CodexWorkspaceBrowser.tsx:292） | 裸 `<p>`：14px（text-ui-base）、无 padding/圆角/底色（js@3773024） | 同 2026-10-14 裁决「外壳只管间距与文字、一个外壳只换语义色」+ 240px 窄栏适配理由（zcode-theme.ts:190-195）；单拆改字几何会破三态壳一致性，登记不修 |
| D3 | 插件整体（CodexWorkspaceBrowser/session-row-actions 的 Modal 行内错误） | 任务操作失败的**通知媒介** | 行内进 Modal（.dcu-wb-error） | 任务重命名/置顶/归档失败 → **toast**（default 变体，js@2422128/5258332/2389772） | 结构性：插件无 toast 宿主（自建 = 功能增强非对齐）；官方 `Zo` 是 bundle 模块内函数，插件不可达（asar 全量无导出桥，§5 搜索记录）；宿主 Modal 内错误 = ZCode commit 对话框同款形态（§1.6.2），媒介差异登记不修 |
| D4 | zcode-theme.ts:51（`--dcu-state-warn-text` 浅 #8a4b00） | 警示文字浅色档 | #8a4b00 | `text-warning` = theme-zai-light #e07b00（css --color-warning） | 与 D1 同一 AA 族裁决（浅色语义文字整体加深）；深色 **#ff8a30 精确一致** |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 toast 底别名 | `--dsw-alias-toast-bg` #fff / #2b2b2b | theme-zai-light/dark `--color-toast` #fff/#2b2b2b | zcode-tokens.ts:245,471；css@436127,443774（APPLIED 批次 5 已落地） |
| A2 destructive 底色（双主题） | `--dsw-alias-state-error-primary` #e03131/#ff5c5c；`--dcu-state-error-fill` 同值 | theme-zai-light/dark `--color-destructive` #e03131/#ff5c5c **双值精确一致** | zcode-tokens.ts:177-178,408-409；zcode-theme.ts:52,78；css@435063,442714 |
| A3 错误文字深色 | `--dcu-state-error-text` 深 #ff5c5c | 同上 dark #ff5c5c | zcode-theme.ts:77；css@442714 |
| A4 toast 大圆角白名单 | 宪章白名单四项含 Toast（zcode-tokens.ts:518） | toast 壳 `rounded-2xl`=16px | css@95123 + `--radius-2xl:1rem` |
| A5 tooltip 别名组 | `--dsw-alias-tooltip-bg/label` #f0f0f0+#0d0d0d / #2b2b2b+#f8f8f8 | theme-zai `--color-tooltip(-foreground)` 同值 | zcode-tokens.ts:247-248,473-474；css@436127,443774 |
| A6 错误文案槽位模式 | 「{动词}失败：{细节}」由 userErrorText 各 key 承担 | 「提交失败：{error}」「删除机器人失败：{error}」「移动失败：{reason}」 | asar@342472005、locale 表；locales.ts:162 |
| A7 Modal 行内错误 = 对话框表单错误同款媒介 | 弹窗内 `.dcu-wb-error role=alert` | ZCode 表单错误也在对话框内行内展示（成功才 toast） | js@3773024 ↔ session-row-actions.tsx:109 |
| A8 错误提示可及性 | 错误 div `role="alert"`、状态 `role="status"` | ZCode toast 无 live 语义，仅重连条 aria-live=polite —— **ours 是增强**（注记不算差） | AboutSection.tsx:230-235；js@5237281 |
| A9 警示深色 | `--dcu-state-warn-text` 深 #ff8a30 | theme-zai-dark `--color-warning` #ff8a30 | zcode-theme.ts:77；css --color-warning |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| `user-error.ts:39-50` INSTALL_ERROR_KEYS 正则→建议文案 | **无 ZCode 参照**：ZCode 无插件安装器/DSH 安装域，错误形态系统是 `Aj(reason)+reasonCode/retryable`（js@6685060），无「诊断正则→本地化建议」映射表。属插件自有映射层，保留 | asar 搜 `installError|installation timed out|pnpm store do not match`（仅插件侧文案有；styles.js 0 命中安装映射表） |
| `business-request-error.ts:11-17` HTTP 401/403/503→errors.* | **无 ZCode 参照**：ZCode 无 DSH 业务 REST 层；其 fetch 失败走 `BusinessRequestError` 插件自有类 + `Aj` reasonCode 系。映射逻辑非视觉面，无对齐对象 | styles.js 搜 `401|unauthorized`（命中均为 vendor/鉴权流程，非映射表）；`reasonCode` @6685060 区段 |
| `user-error.ts:8-13` WorkspaceGroupError keys | 插件自有业务域（会话分组），ZCode 任务分组错误只有 `taskGroup.updateFailed` 一类通用键（js@2389662 默认值），粒度不同构 | styles.js 搜 `group-invalid|workspace-invalid|order-anchor-missing`（0 命中） |
| ZCode toast 高级能力（dedupeKey/anchorId/progress/actionLabel/update/source-server-update 变体） | 插件无 toast 面孔，无 ours 侧 → 不产 diff；规格已存档 §1.1–1.4，供将来自建 toast 或宿主放行后直接取用 | pptx/styles.js 逐 offset 提取（§1 全部锚点）；`variant:`source-server-update`` js@6109979/6511879/6776527/6777270 有真实调用 |
| `.dcu-about-message[data-error=true]` 盒状错误（AboutSection.tsx:37：r-lg + 12% 错误色调底 + 错误字色） | ZCode **无盒状错误横幅**实例可对齐：destructive-surface 系（#e400141a 底+#b42020 字，css@435063）只用于按钮（js@2062386）、勾选行选中态（js@2086439）、状态 chip 映射（js@1773749）。表单错误行内、异步失败 toast。若日后强对齐：底 12%→10.2%（#e400141a）、字→#b42020（与 ours #b3261e 几乎同值）——触 D1 族裁决，登记不修 | styles.js 搜 `bg-destructive-surface`（仅 3 类用法，上列）；搜 `alert|banner.*destructive`（无横幅形态） |
| needs-live ①（M3 行为确认） | 设置页开启时官方 toast 是否真被 inert：静态推断链完整（isolate 遍历 body 子级 + host 无 role），但需 9224 活体开设置页触发一次官方 toast（如 update.ready）点其关闭钮验证 | — |
| needs-live ② | 浅色下 12%（#e03131 mix）vs 10.2%（#e40014）错误盒底的并排可感知差——若活体判定无感，U5 彻底销案 | — |

**穷尽搜索记录（asar/插件）**：
- `toast`（styles.js）21 处全部归类：locale 键（git.branchSwitcher.toast.* @3762798、git.actionMenu.*.toast.* @3820119/3821359、workflows.hub.move.toast @4989979）、调用现场（@5013599/5013670/6058586/6115736/6676845/6685060/6723153–6723719/2073065/2072151）、实现锚（anchorId @5001109、automations-main-toast-anchor @5001060）、`bg-toast` 重连条 @5237278。
- `Toaster|ToastProvider|sonner|toast-viewport|toast-center`（styles.js）→ **0 命中**（自研，非三方）。
- `variant:`error``（styles.js）→ **0 命中** → 错误= default 变体。
- `bg-toast`（asar 全量）5 处 → pptx 组件壳 @351378689、styles.js 重连条 @363179003、css 规则 ×3 @364911917/963/046；`--color-toast` 6 处全对账（css@23447/426068/436127/443774 + bg-toast/60 的 color-mix 内联 ×2）。
- 插件 src：`Zo(|toast(` → 0 命中；`dsw-alias-toast` 消费 → 0（仅 zcode-tokens.ts 定义）；`role="alert"|role="status"` 全量清单 14 处已逐条过（§1.7 + M1 5 处 + CodexSettingsPage:239-240/DeveloperToolsRow:35 为中性类不受影响）。
- `zcode-toast-host`（asar）→ 仅 pptx 宿主创建处 1 处。

## 6. 交叉核对更正（不改 surface-3 原文，仅登记）

- **surface-3 M10 复核结果：误报**。其「ZCode destructive 浅色 ≈#e7000b」取的是 :root 基座 oklch 值；实际应用层 `.theme-zai-light{--color-destructive:#e03131}`（css@435063）覆盖之，与插件 `--dcu-state-error-fill` #e03131 **精确一致**（zcode-theme.ts:52）。surface-3 的 M10 应作废，A2（深色一致）继续成立。
- APPLIED 批次 5「toast label 同步 #0d0d0d」的证据链补全：`--color-toast` 只有**底**定义，无 label 变量；toast 文字走 `text-foreground`（#262626/#d4d4d4）——M4 已登记修正路径。

## 7. 给下一轮的整改建议（不动手，仅排序）

1. M1（5 处类名替换）+ M2（10 处去前缀）+ M4（2 个 token 值）都是纯机械改动，可一把过；M2 建议把 `sessions.failed` 键改为不带 {message} 模板的裸句或直接删除该键改用 mapped 文本原样渲染。
2. M3 与 N1 绑定：改完 `CodexSettingsPage.tsx:150,168` 两处放行后，活体开设置页 + 触发官方 toast 点关闭钮验收。
3. 若 D3 将来解冻（宿主提供 toast 桥或自建）：§1.1–1.5 即完整规格——白 60% 底+24px 毛玻璃、16px 圆角、top-16/左 16/底 16+safe-area、3000ms 默认 + 200ms 出场、(.77,0,.175,1)、错误无专属红。
4. 02-motion 可补「toast 档」条目（200ms + (.77,0,.175,1) + transform/opacity + motion-reduce 降级），本轮不改文档。

## 复核

> 复核员：复核员·4。日期 2026-11-03。只读复核，未改上文任何内容。
> 方法：**不采信原文 /tmp 产物，全部亲自重跑**。① 重新解析 `/Applications/ZCode.app/Contents/Resources/app.asar`（python3 读头 + walk files 提取三件到 /tmp/zc-review-extract/）：hdr u32 实测 `(4, 8328596, 8328592, 8328585)`，三文件 size/asar 偏移实测 `253493B@351137047`、`6839502B@357941725`、`480065B@364781227` —— 与 §0 逐一相符。② 锚点复核用 `dd skip=<offset>` 直读提取产物；asar 绝对偏移用 `dd if=app.asar` 直读；asar 内出现次数用 `grep -aob`。③ 插件侧逐行读源码 + grep 计数。④ 对比度与 oklch 换算用 python3 WCAG 公式实算。⑤ 9224 活体仅做**只读** CDP 探测（Runtime.evaluate 查 DOM，未开设置页、未点击、未触发 toast）。

### 差异表 verdict（M1–M4）

**M1 — verified（计数有更正）**
- ours 侧亲验：`role="status"` + `.dcu-wb-error` 在 CodexWorkspaceBrowser.tsx:1132（archivePending）、:1133（movePending）、:1134×2（deletePending×2）、ScheduleBrowser.tsx:191（archiveGroupPending）——原文所列 5 处**全部属实**。但 grep 全量实为 **7 处**：另漏 CodexWorkspaceBrowser.tsx:1078（preferencesLocalOnly 状态提示）与 session-row-actions.tsx:113（`{deleting && …deletePending}`，是真正的 pending 提示）。pending 型实为 **6 处**非 5。整改时应一并替换。
- 染色链亲验：zcode-theme.ts:197 `.dcu-state,.dcu-wb-error{display:block;padding:8px 10px;…}`、:198 `.dcu-state--error,.dcu-wb-error{color:var(--dcu-state-error-text)}`——`.dcu-wb-error` 确被 :198 无差别染错误字色（浅 #b3261e/深 #ff5c5c，zcode-theme.ts:51/77 实读）。
- ZCode 参照亲验：dd styles-Dv5E6Odo.js@2231954 区段实见 `(0,$.jsx)(`span`,{role:`status`,className:`text-ui-xs text-remote-foreground-muted`,…})`；`--color-remote-foreground-muted` 实值 浅 #595959／深 #b3b3b3（中性灰）。

**M2 — verified**
- 计数亲验：`t('sessions.failed', { message: … })` 调用点 CodexWorkspaceBrowser.tsx 7 处（1079,1127,1129,1131,1132,1133,1134）+ session-row-actions.tsx 2 处（109,114）+ ScheduleBrowser.tsx 1 处（192）= **10 处**，与原文一致。
- 双包链亲验：locales.ts:162 `'sessions.failed': '操作失败：{message}'`、:176 `'sessions.renameFailed': '暂时无法重命名该会话，请稍后重试。'`；session-row-actions.tsx:49 `setError(userErrorText(reason, t))` 后 :109 `{t('sessions.failed',{message:error})}`——完整句再套泛化前缀实锤。
- ZCode 反例亲验：dd app.asar@342534127 实见 `taskList.renameFailed:重命名任务失败`、`taskList.archiveFailed:归档任务失败`、`taskList.pinFailed:更新置顶状态失败`（裸短句无前缀）；asar@342472005 实见 `…requestFailed:提交失败：{error}`、`…pushAfterCommitFailed:已提交，但推送失败：{error}`；styles.js@3795805 区段实见 `catch(t){let n=Aj(t);…formatMessage({id:`…requestFailed`},{error:n})}`——{error} 槽 = Aj(t) 技术细节串。「删除机器人失败：{error}」实存 asar@342447721、「移动失败：{reason}」实存 asar@342738722。
- 注：`function Aj` 定义体未逐一定位（bundle 内有多个同名），但调用点已证 {error} 槽来自捕获错误的格式化产物，M2 主张成立不依赖其内部实现。

**M3 — verified（静态链；活体行为未测）**
- 放行条件亲验（CodexSettingsPage.tsx）：:150 为注释行，条件本体在 **:151** `if (element.parentElement === document.body && element.getAttribute('role') === 'alert') return`；:168 为遍历 `isolate(sibling)` 调用点——原文引「150,168」为注释行+调用点，实质正确但行号不精确；另 keepFocus **:181** 与 wrapFocus **:188** 两处 `body > [role=alert]` 选择器同样只认 role——修法「两处放行」应改三处选择器位（181/188 同 selector）。
- host 无 role 亲验：dd pptx@238638 实见 `document.createElement(`div`);e.id=`zcode-toast-host`,document.body.appendChild(e)`——确无 role 属性；`grep -aob "zcode-toast-host" app.asar` 全量 **1 处**@351375685，351375685−351137047=238638 与锚点精确吻合。
- inert 推断链成立：设置页 portal 到 body，遍历会把 body 直接子级（含 host）逐个 isolate，host 无 role 不过放行 → `element.inert = true`（:158）。
- **活体未测**：9224 在线（HTTP 200），只读 CDP 探测实见 body 仅 `#root` 一个子级、`#zcode-toast-host` 不存在——与 §1.1「首 toast 时才建宿主」惰性创建一致；「开设置页触发 toast 后点关闭钮」属 UI 变更操作，本轮未执行。

**M4 — verified**
- ours 亲验：zcode-tokens.ts:246 `--dsw-alias-toast-label:'#0d0d0d'`、:472 `'#f8f8f8'`。
- zcode 亲验：so 壳 JSX（dd pptx@241287/242050 区段）三分支+default 全带 `text-foreground`（default 实见 `border-border px-4 py-3 text-foreground whitespace-pre-line`）；css 主题层实值：`.theme-zai-light{--color-foreground:var(--color-neutral-800)}`、`--color-neutral-800:oklch(26.9% 0 0)`，python 实算 **=#262626 精确**；dark `--color-neutral-300:oklch(87% 0 0)` 实算 **=#d4d4d4 精确**。
- 误当 tooltip 实锤：theme-zai-light/dark 实见 `--color-tooltip-foreground:#0d0d0d／#f8f8f8`——正是 alias 所取值对；APPLIED.md:18 批次 5 行实文「toast 浅色底 #2b2b2b→#fff（label 同步 #0d0d0d）」。
- 零消费亲验：`var(--dsw-alias-toast` 在 uiplug src+lib **0 命中**（仅 zcode-tokens.ts 4 行定义）。

### needs-live verdict

**needs-live ①（M3 行为确认）— 静态链 verified；活体 not run**
- 静态链全部亲验通过（见 M3）。活体验证所需动作（开设置页+触发官方 toast+点关闭钮）未执行——本轮只做了只读 DOM 探测；host 当前不在 DOM 属正常（未出过 toast）。
**needs-live ②（12% vs 10.2% 并排可感知差）— 静态值 verified；活体 not run**
- ours 亲验：AboutSection.tsx:37（stylesheet 串）实见 `.dcu-about-message[data-error=true]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dcu-state-error-text)}`（且 :235 `role={message.error?'alert':'status'}`）。
- zcode 亲验：theme-zai-light 实见 `--color-destructive-surface:#e400141a`（0x1a=26/255=10.2%，另有 `color-mix(…10%…)` @supports 覆盖）+ `--color-destructive-surface-foreground:#b42020`（css@435726 区段，原文引 css@435063 系同块）。
- 并排可感知差需活体目测：未执行。

### deviation 证据复核（D1–D4，只核证据）

**D1 — 证据 verified，一处数值更正**
- 亲验：zcode-theme.ts:51 `--dcu-state-error-text:#b3261e`、:77 `#ff5c5c`；css theme-zai-light `--color-destructive:#e03131`（@435028 区段）、dark `--color-destructive:#ff5c5c`（@442695 区段）——「深色两值精确一致」成立。
- **更正**：#b3261e 对白 WCAG 对比度 python 实算 **6.54:1**，原文「≈6.9:1」偏高约 5%；#e03131 对白实算 **4.51:1**（原文「4.5:1 临界」相符）。方向结论（更深红、ZCode 压线 4.5）不受影响。
**D2 — 证据 verified**
- 亲验：zcode-theme.ts:197 壳几何 `padding:8px 10px;border-radius:var(--dsw-radius-lg);font-size:var(--dsw-font-size-sm)`，`--dsw-radius-lg:'8px'`（zcode-tokens.ts:507）、`--dsw-font-size-base:'14px'`（:554）→ sm=12px ✓；CodexWorkspaceBrowser.tsx:292 `.dcu-wb-error{margin:4px 0;background:transparent}` ✓；ZCode 侧 dd styles.js@3773024 区段实见 `i?(0,$.jsx)(`p`,{className:`text-ui-base text-destructive`,children:i}):null`（裸 p，无 padding/圆角/底色），text-ui-base→`--text-ui-base:var(--ui-font-size)`→`--ui-font-size:14px` ✓。
**D3 — 证据 verified（附一处注记）**
- 亲验：插件 src/client `Zo(|toast(` **0 命中**；channel-api.ts/host-anchor-contract.ts 无 toast 面；asar 中 `exposeInMainWorld` 11 处均与 toast 无共现；失败即 toast 调用点逐一实见（styles.js@2422128 `Zo(E.formatMessage({id:`taskList.renameFailed`}))`、@5258332 `taskList.pinFailed`、@2389662/2389772 `F=(e,t=`taskGroup.updateFailed`)=>{…Zo(f.formatMessage({id:t}))}` 与 `I=(e,t)=>{e().catch(e=>F(e,t))}`）。
- 注记：styles.js@6685060 区段实见 `toast:Zo` 作为**bundle 内部**配置属性传入（非导出桥），「插件不可达」结论仍成立，但「asar 全量无 toast 痕迹」措辞应收窄为「无导出桥/插件侧不可达」。
**D4 — 证据 verified**
- 亲验：zcode-theme.ts:51 `--dcu-state-warn-text:#8a4b00`、:77 `#ff8a30`；css theme-zai-light `--color-warning:#e07b00`、dark `--color-warning:#ff8a30`——「深色精确一致」成立。

### 复核中另证实的支撑锚点（抽样全对）

- `variant:`error``／`Toaster|ToastProvider|sonner|toast-viewport` 在两 bundle **0 命中**（grep -c 实测）。
- `bg-toast` asar 全量 5 处：351378689（=pptx@241642 壳）、363179003（=styles.js@5237278 重连条）、364911917/963/046（=css@130690 起 3 处）——减基址后与原文逐处吻合；重连条 `aria-live:"polite"` 于 styles.js@5237150 区段实见。
- js@5013599 区段实见 `{durationMs:4e3,position:`top-center`,variant:`info`}`（scheduledPreview）、js@6058586 区段实见 `update.toast.ready`→`{durationMs:4e3,position:`bottom-left`,variant:`update`}`；`eo=3e3,to=200` 于 pptx@238489 区段实见。
- `.ease-[cubic-bezier(0\.77\,0\,0\.175\,1\)]{--tw-ease:cubic-bezier(.77,0,.175,…}` 于 css@191318 区段实见；`--radius-2xl:1rem`、`--ui-font-size:14px` 实存。

### 复核结论

- **6 项 verdict：M1 verified（计数 5→应 7）、M2 verified、M3 verified（行号微偏，实际 :151/:168/:181/:188）、M4 verified；needs-live ①② 静态链 verified、活体 not run；D1–D4 证据 verified。**
- 需更正后落地的小项：① M1 整改清单补 session-row-actions.tsx:113 与 CodexWorkspaceBrowser.tsx:1078；② D1 文案 6.9→6.54；③ M3 行号 150,168→151,168（修法落地时留意 keepFocus :181 与 wrapFocus :188 同 selector 两处）。无一条翻案。
