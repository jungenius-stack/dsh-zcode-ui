# night2 · 落地清单（applied-night2.md）

> 落地员·A（负责面 1 上下文菜单 / 2 悬停卡与 tooltip / 3 对话框家族 / 4 toast 与通知）。
> 日期：2026-11-03。基线 = uiplug HEAD `50ac768`（工作树干净）。
> 范围铁律：只改 `uiplug/src/client`；不碰 lib/；不 commit；不 push。

## 验收（本机实跑）

```
node tests/run-assertions.mjs  → 62 通过 / 3 跳过 / 0 失败（共 65 个脚本）   [基线同值]
node scripts/gate.mjs          → exit 0：类型检查 ✓ / 断言新增失败 0 / vitest ✓ / 布局 22 ✓ / 上游哨兵 ✓
```

落地过程共触发 5 轮断言红，全部在 src/client 内收敛（行号锚/字号刻度/动效令牌/锚点登记/颜色字面量），最终与基线同绿。未回退任何条目（reverted = false）。

## 面 1 · 上下文菜单（surface-1.md，mechanical #1–#9 全落）

| # | where | 落地 |
|---|---|---|
| 1 | CodexWorkspaceBrowser.tsx:950/964/1000/1121 + session-tree.tsx:212 + zcode-theme.ts 尾块 | 四棵树菜单去 `compact` 保 `dense`，改挂 `listClassName="dcu-ctx-menu"`；注入覆盖：行 14px/1.625（实高 ≈30.75px）、内距 4·8px、壳 min-width 176px、壳圆角 8px（去 compact 后 MenuSurface 自带 radius-lg）。共用会话行菜单（SessionRow，本就 dense 无 compact）同挂 dcu-ctx-menu 保持家族一致（登记：报告只列了 4 处，此处为一致性扩展） |
| 2 | zcode-theme.ts 尾块 `.dcu-ctx-menu [class*=_itemIcon]` | 图标槽 14px→16px（盒+svg，ZCode `[&_svg]:size-4`；此前 CSS 把 size=16 的 svg 压成 14px） |
| 3 | zcode-theme.ts 尾块 hover/focus-visible 规则 | hover 底 5% 半透明 → 实色 `var(--dsw-specific-menu-item-hover)`（#f0f0f0/#363636，令牌已存在） |
| 4 | zcode-theme.ts 尾块 danger 规则 + host-anchor-contract.ts 登记 `_danger` | 危险行高亮 = 实色 `var(--dsw-alias-state-error-primary)` 底 + 白字（含图标色），替换红薄底 |
| 5 | zcode-theme.ts 尾块 `[role=separator]` + `>[role=presentation]` | 行距 0→2px（gap-0.5）；分隔线 0.5px/margin 3px 2px → 1px/`margin:4px -4px`（my-1 + -mx-1 全出血） |
| 6 | zcode-theme.ts 尾块 `.dcu-ctx-menu.dcu-ctx-menu` | 壳 min-width 144/156 → 176px（min-w-44；子菜单沿用 primitives 163px ≥ ZCode sub-content 128px，不动） |
| 7 | composer-tool-menus.ts 消费点注释 + zcode-theme.ts 尾块 | `--dsw-specific-menu` 定义 #fff/#2b2b2b（ZCode --color-menu）——**落在 data-dcu-tool-menu 标记面上而非全局映射**：宿主 asar 里该变量是宿主菜单底别名，全局定义会越权改掉插件地盘外的宿主菜单（复核 #7 优先级告警 + deviation #10 毛玻璃裁决域），composer 壳从此浅色吃到 #fff（原 fallback #f0f0f0） |
| 8 | zcode-theme.ts 尾块 `--dcu-tw-anim-duration:100ms` + `dcu-ctx-menu-in` 关键帧 | 开壳动画 100ms ease：fade 0→1 + scale .95→1 + 起点 translateY(-8px)（side=bottom 主档方向）；reduced-motion 归零 |
| 9 | zcode-theme.ts 尾块 `:disabled` 规则 | 禁用态 opacity .4 + not-allowed → opacity 100 + `--dsw-alias-label-dimmed`（40%/30%，恰为 ZCode foreground-subtlest）+ pointer-events:none |

**登记不落地**：#10（菜单壳毛玻璃，APPLIED「已裁决偏离，维持」）、#11（菜单内键帽，产品决定保留）、#12–#15（needs-live：活体行高复测 / 关场动画与 Radix 时序 / 右键锚点 / 子菜单定位）。
**残留缺口**：子菜单卡本体未挂 dcu-ctx-menu（primitives submenu 不吃 listClassName），开壳无动画、壳 156px 档不变——报告 #6/#8 的子菜单部分待活体定档后一并处理。

## 面 2 · 悬停卡与 tooltip（surface-2.md，mechanical #2–#5 全落；#1 已在先期批次落地）

| # | where | 落地 |
|---|---|---|
| 1 | —（zcode-theme.ts:63 已是 #0d0d0d） | 报告确认已被 50ac768 关闭，本轮仅核验，零改动 |
| 2 | CodexWorkspaceBrowser.tsx:285 `dcu-tip-in` | 进场 translateY(4px)+(.2,0,0,1) → **scale .95→1 + 起点横移 −8px + ease**（卡片锚在行右侧 = side right 同款 slide-in-from-left-2；150ms 走 `--dcu-motion-enter-duration` 令牌） |
| 3 | hover-shell.tsx（exitTimer/exiting 状态 + HOVER_TIP_EXIT_MS=150）+ 两张卡根节点 `data-exit` + :285 `dcu-tip-out` | 120ms hide 延迟保留；到期后播 150ms 对称退场（fade + scale .95 + −8px 回滑）再卸载，不再瞬时 setHoverTip(undefined)。登记：报告「动画并入 120ms 窗口」按字面不可行（150>120），落地为「120ms 延迟 → 150ms 退场 → 卸载」 |
| 4 | hover-shell.tsx showTip | 删除「已开卡换行立即切换」分支（`tipRef.current !== undefined`）；每个 tooltip 吃满 300ms（对齐 alwaysDelay+skipDelayDuration:0）。显式 `immediate`（文件夹点击）保留。**9223/9224 真机复验「划过空行不闪现」未跑**（无活体），登记 |
| 5 | hover-shell.tsx:79 注释 + zcode-theme.ts:64 注释 | 两处注释失真更正：300ms（非 1 秒）；Kbd 实际用 text-tooltip-tag-foreground（非 text-muted-foreground）。零行为改动 |

**登记不落地**：#6（/80 透明度混合机制，触批次 8 色板裁决域）、#7（kbd 深色 #adadad 备案）、#8（卡可交互=功能增强）；#9 经复核闭环（12px 与 p2e 先例一致，无需动）。

## 面 3 · 对话框家族（surface-3.md，M1–M9 + M11–M14 全落；M10 作废不落）

where = archive-confirm.ts ARCHIVE_CONFIRM_STYLE（M1–M12）+ effect 段（M13）+ session-row-actions.tsx:108（M14）。

| # | 落地 |
|---|---|
| M1 | 遮罩 48% → `rgba(0,0,0,.6)`（bg-black/60） |
| M2 | 补 `@supports (backdrop-filter) { backdrop-filter:blur(4px) }`（backdrop-blur-xs） |
| M3 | 宽 420 → `min(448px,100%)`（sm:max-w-md） |
| M4 | 圆角 `var(--dsw-radius-xl)`(12px) → `var(--dsw-radius-2xl)`(=16px，仓内既有令牌；rounded-2xl) |
| M5 | 阴影 `0 8px 24px rgba(0,0,0,.24)` → `0 25px 50px -12px rgba(0,0,0,.25)`（shadow-2xl） |
| M6 | 去 1px 边线（border-none + 未配 .ring 宽 = 无环，分离感靠底色+大柔影） |
| M7 | 标题 14px/21px → 16px/26px（text-ui-lg + 继承 relaxed 1.625；16px 走 `var(--dsw-font-size-lg)`） |
| M8 | 描述 12px/18px → 14px/24px（text-ui-base + leading-6） |
| M9 | 取消钮透明底+1px 边 → 实底无边 `var(--dcu-secondary-bg)`（新令牌 #d4d4d4/#363636）+ hover 80% color-mix |
| M10 | **不落地**——surface-4 §6 交叉核对判误报：ZCode destructive 浅色实为 #e03131，与本仓 --dcu-state-error-fill 精确一致 |
| M11 | 按钮 min-height 32→36px（h-9）、padding 0 12→0 16px（px-4）、字号 12→14px；min-w-28/32 与 esc/⏎ 键位提示未随（报告注「可不随」，automation 档先例） |
| M12 | 进出动画 150ms/(.2,0,0,1)+位移 → **100ms ease、fade+scale .95 无位移**（新令牌 `--dcu-tw-anim-duration`，与面 1 菜单动画共档；reduced-motion 既有块照常全停） |
| M13 | 新增 window 级 **Enter 直接确认**（capture + preventDefault，防按钮原生激活双触发；归档属非破坏型） |
| M14 | session-row-actions.tsx:108 重命名输入补 IME 守卫 `!event.nativeEvent.isComposing && event.keyCode !== 229`（与仓内 1126 行同款） |

**登记不落地**：D1/D2/D3（宿主 Modal 壳体系 + outline 变体 workaround，03j A5 定案域）。
**测试适配说明**：session-tree.assert.ts 按字面锚定 `event.key === 'Escape'`、遮罩 mousedown 形态、scrim 前缀——全部原样保留；night-audit-batch-18 的确认钮红底断言不受 M10 作废影响。

## 面 4 · toast 与通知（surface-4.md，M1–M4 全落，M1 按 6/7 处）

| # | where | 落地 |
|---|---|---|
| M1 | CodexWorkspaceBrowser.tsx:1132/1133/1134×2 + ScheduleBrowser.tsx:191 + session-row-actions.tsx:113（共 6 处） | 进行中提示（role="status"）`dcu-wb-error` → `dcu-state`（中性档，去错误红）。**CodexWorkspaceBrowser.tsx:1078（preferencesLocalOnly）未换**：tests/session-tree-pending.integration.spec.ts:247 以 `.dcu-wb-error[role="status"]` 定位断言，测试文件在 src/client 铁律之外——登记待测试轮同步选择器后补齐（复核口径为 7 处全换） |
| M2 | CodexWorkspaceBrowser.tsx ×7、session-row-actions.tsx ×2、ScheduleBrowser.tsx ×1（共 10 处）+ locales.ts:162/476 | `{t('sessions.failed',{message:error})}` 双包前缀全部改为直接渲染映射句 `{error}`；`sessions.failed` 键（中英）删除（ZCode 无「完整句再套泛化前缀」） |
| M3 | CodexSettingsPage.tsx isolate/keepFocus/wrapFocus 三处 | 放行条件补官方 toast 宿主：isolate 按 `element.id === 'zcode-toast-host'` 提前返回（role=alert 原句保留，settings-integration:81 断言锚不动）；keepFocus/wrapFocus 选择器补 `body > [id=zcode-toast-host]`。**行为活体验收（开设置页点 toast 关闭钮）未跑**，登记 |
| M4 | zcode-tokens.ts:246/472 | `--dsw-alias-toast-label` #0d0d0d/#f8f8f8 → **#262626/#d4d4d4**（toast 文字 = text-foreground；tooltip-foreground 值对归 tooltip）；零消费，零风险 |

**登记不落地**：D1（错误文字浅色 #b3261e 维持，AA 裁决域）、D2（行内错误盒几何）、D3（通知媒介=行内，toast 桥不存在）、D4（警示浅色同 D1 族）；needs-live ①② 原样保留。

## 改动文件清单（13 个，全部 src/client）

CodexSettingsPage.tsx、CodexWorkspaceBrowser.tsx、ScheduleBrowser.tsx、archive-confirm.ts、composer-tool-menus.ts、host-anchor-contract.ts、hover-shell.tsx、locales.ts、session-row-actions.tsx、session-tree.tsx、workspace-hover-card.tsx、zcode-theme.ts、zcode-tokens.ts（+156 −42）

## 遗留给后续轮

1. **面 4 M1 第 7 处**：CodexWorkspaceBrowser.tsx:1078 换 `.dcu-state`，需同步 tests/session-tree-pending.integration.spec.ts:247 选择器（测试轮权限）。
2. **docs-baseline / README 令牌账**：本轮刻意未增删 zcode-tokens.ts 映射条目（--dsw-specific-menu 改落 zcode-theme.ts 标记面、--dcu-secondary-bg/--dcu-tw-anim-duration 落主题层），令牌账 177/178、200/201 保持不动；若后续把 --dsw-specific-menu 收编进全局映射，需同步 `node --import tsx scripts/baseline.mjs` + README。
3. **活体验收未跑**（无 9223/9224 会话）：悬停卡 300ms 全延迟手感（面 2 #4）、树菜单 32px 活体行高（面 1 #12）、右键锚点/子菜单定位（#14/#15）、设置页 toast 关闭钮（面 4 M3）、归档确认 Enter 手感（面 3 M13）。
4. **树菜单子菜单卡**：动画/壳宽未随 dcu-ctx-menu（primitives submenu 不吃 listClassName），见面 1 残留缺口。

---

# 落地员·B（面 5 空态 / 6 滚动条与滚动 / 7 焦点与键盘 / 13 无参照二轮）

> 日期：2026-11-03。基线 = 落地员·A 的工作树（HEAD `50ac768` + A 的 13 文件未提交改动，验证过 A 后全绿起点：断言 62/3/0、gate exit 0）。
> 范围铁律：只改 `uiplug/src/client`；不碰 lib/；不 commit；不 push。
> ⚠ 基线非净树（A 的改动在场），故红项处置不用 `git restore`（会扫掉 A 的工作），改为「改前备份 + 外科手术回退单条」。

## 验收（本机实跑）

```
node tests/run-assertions.mjs  → 62 通过 / 3 跳过 / 0 失败（共 65 个脚本）
node scripts/gate.mjs          → exit 0：类型检查 ✓ / 断言新增失败 0 / vitest ✓ / 布局 22 ✓ / 上游哨兵 ✓
```

中途两轮红，全部在 src/client 内收敛，未回退任何文件：
1. design-system「过渡必须取自动效令牌」——M7 注释里引用的 Jxt 类名原文（含 duration-150 ease-out 字样）被过渡扫描器当真实声明抓到 → 注释改写为不含类名原文。
2. structure-budget + docs-baseline——CodexWorkspaceBrowser.tsx 是全仓最大文件且行数棘轮顶满（1136），M7 块 +17 行爆预算 → M7 CSS 迁入 zcode-theme.ts（选择器更具体、无级联冲突）、wb 文件内注释压成同行尾注，恰回 1136。
3. verify-workspace-drop-layout.mjs:97（gate 布局档）硬编码钉死空态 `13px/18px`——surface-5 M3 改的正是它 → **M3 单条落了又退**（值回到 caption/18px），按登记不落处理，见下。

## 面 5 · 空态家族（surface-5.md，M1/M2/M4/M5/M6 全落 + M7 受限形态；M3 登记不落）

| # | where | 落地 |
|---|---|---|
| M1 | locales.ts:109/423（zh/en） | `search.empty`：`没有找到相关任务`/`No matching tasks.` → `暂无相关结果`/`No related results`（ZCode 活体空态 = commandCenter.noResults；taskSearch.noResults 是死键） |
| M2 | CodexSidebar.tsx `.dcu-search-empty` | `16px 8px/13px/左对齐` → `padding:20px 16px` + `text-align:center` + `14px(--dsw-font-size-base)/1.625`（CommandEmpty aj 基座 py-6 text-center text-ui-base/relaxed + 调用 px-4 py-5）；文字色维持 tertiary（D1 裁决域） |
| M3 | CodexWorkspaceBrowser.tsx:288/319/341 | **登记不落（已落又退）**：13px(caption)/18px → 14px(base)/21px 被 `scripts/verify-workspace-drop-layout.mjs:97` 字面钉死（`fontSize!=='13px'||lineHeight!=='18px'`），脚本在 src/client 铁律之外——待测试轮同步该检查后补（源内已留同行注记） |
| M4 | CodexWorkspaceBrowser.tsx:288 `.dcu-wb-empty` | 内距 `var(--dcu-space-2)`（四向 8）→ `padding:8px 12px`（px-3 py-2，ZCode 分组树根空态） |
| M5 | locales.ts:100/414（zh/en） | `schedule.empty`：`还没有定时任务运行记录。`/`No scheduled-task runs yet.` → `还没有运行记录。`/`No runs yet.`（automations.runs.empty） |
| M6 | locales.ts:135/447（zh/en） | `workspace.empty`：`还没有项目。添加一个工作区目录即可开始。`/`No projects yet. Add a workspace folder to get started.` → `还没有项目`/`No projects yet`。**CTA 转换未做**（报告 ⚠ 后半句转「添加工作区」CTA 属新交互，非机械文案替换），登记 |
| M7 | zcode-theme.ts 尾块（自 CodexWorkspaceBrowser.tsx 迁入） | 空置顶升级为 ZCode 官方空容器形态——虚线落区：`h-32px + 1px dashed border + rounded-lg + hover(border-l4/surface-hover/foreground) + reduced-motion 停过渡`，选择器 `.dcu-wb-pinned-list>.dcu-wb-empty`（只作用置顶空）。**三处受限**：① 文案仍走 `workspace.pinnedEmpty`（settings-integration:375 钉死该键+div 结构）；② 不改可聚焦 button——div 在 role=tree 内，违反 tree-keyboard.ts 无障碍树契约（focus-visible 段不落）；③ 无 Plus 图标（无点击动作，加了是假可供性）。hover 边框用 border-l4(16%) 近似 border-hover(15%)。均登记 |

## 面 6 · 滚动条与滚动（surface-6.md，M1–M7 全落）

| # | where | 落地 |
|---|---|---|
| M1 | zcode-tokens.ts:569-571 + zcode-theme.ts 尾块 | `--dsh-scrollbar-width` 8px→**14px**、`--dsh-scrollbar-thumb-border` 2px→**3px**（轨道 14−2×3=视觉 8px）；补全局 thumb `min-width/min-height:32px`（ZCode 全局基座） |
| M2 | zcode-tokens.ts:238-241（浅）/468-472（深） | 静息 thumb 15% → **10%**：浅 `rgba(10,10,10,.1)`（ZCode --color-border = oklch(14.5% 0 0) 10%）、深 `rgba(255,255,255,.1)`（.theme-zai-dark #ffffff1a） |
| M3 | 同上两段 | hover thumb 25% → **30%**：浅 `rgba(64,64,64,.3)`（= ZCode fallback #4040404d，foreground=#404040 的 30%）、深 `rgba(212,212,212,.3)`（dark foreground #d4d4d4 的 30%） |
| M4 | zcode-theme.ts 尾块 | 补 `::-webkit-scrollbar-thumb:active` 45%（浅 64,64,64 / 深 212,212,212；ZCode :active #40404073 / 45% mix，宿主 scrollbar.css 无 :active） |
| M5 | **新模块 `scrollbar-autohide.ts`（239 行）** + zcode-theme.ts 尾块 CSS + index.ts 接线 | 自动隐藏状态机：scroll(capture)→显形（alias bg 档）+1s 空闲熄灭；mousemove(rAF 节流) 缘判定 10px/兜底 14px + 拇指几何（min(r,max(32,r²/total))）；mousedown→dragging 45%；pointerleave 清 hover；WAAPI `el.animate(--dsh-scrollbar-thumb, 200ms ease)` 渐变、reduced-motion 瞬切；全套 dispose。注入点 = 宿主 `--dsh-scrollbar-thumb` 变量 + `@property` 注册 `<color>`；CSS 总闸 `html[data-dcu-scrollbar-autohide]`（模块不在场 = 回落宿主常显，无「滚动条消失」失败态）。作用域 = `[data-conversation-scroll]`（ZCode 三框的 DSH 对应物；侧栏树按 D2 维持隐藏、设置 main 按 ZCode 语义不加入——两处登记）。**活体对拍验收（needs-live ③）未跑** |
| M6 | conversation-layout.ts X2 | 新增 `[data-conversation-scroll]:not(:has([data-conversation-composer-overlay])){scrollbar-gutter:stable both-edges}`（ZCode 会话区全程双边预留；`:not(:has())` 守卫避开宿主 overlay 态显式 auto）。**needs-live ①（2px 级合成错位目检）未跑** |
| M7 | settings-page-styles.ts:84 `.dcu-settings-main` | 拆 `scrollbar-width:thin;scrollbar-color:var(--sp-border) transparent`（回归宿主药丸基座=已吃 M1-M3 对齐值）+ 补 `scrollbar-gutter:stable` |

## 面 7 · 焦点与键盘（surface-7.md，mechanical #1/#2 落，#3 登记不落）

| # | where | 落地 |
|---|---|---|
| 1 | CodexSidebar.tsx:564-570 注释 + zcode-skin.ts:78-83 注释 | 两处「`--color-input-border-focused` 映射到 var(--color-brand)」更正：brand 蓝只在 `:root`/`.dark` 基档；zai-light/zai-dark 覆盖档 = `var(--color-border-hover)`（浅 #0d0d0d26 / 深 #ffffff26）且实际生效。零行为改动 |
| 2 | input-history.ts:9 | 每 scope 历史上限 `limit = 200` → **30**（ZCode sYt/NXt 双处 slice(-30)） |
| 3 | input-history.ts:56 | **登记不落**：↓ 空草稿召回最后一条（ZCode cYt）被 `tests/input-history.spec.ts:43` 钉死为 `expect(cursor.move(1,'',['旧','新'])).toBeUndefined()`，spec 在铁律范围外——待测试轮改规格后补 |

**登记不落（deviation/needs-live 维持报告原处置）**：#4（输入焦点形态，APPLIED §二「焦点色需活体重采」域）、#5（行焦点 outline 形态，G2+宿主指针模态域）、#6（roving=APG 超集，主动超越不降级）、#7（菜单键帽，surface-2 域）、#8（`--dsw-radius-md` needs-live）。

## 面 13 · 无参照二轮（surface-13.md，mechanical #3 落，#1/#2 登记不落）

| # | where | 落地 |
|---|---|---|
| 1 | composer-visuals.ts:29 | **登记不落**：加号 hover `--dsw-alias-interactive-bg-hover-solid` → 5% 令牌被双锚钉死（tests/night-audit-batch-19.assert.mjs:130 正则 + tests/design-system.assert.ts:1572 includes），均在铁律范围外 |
| 2 | CodexSettingsPage.tsx:83 | **登记不落**：ZCode 设置页无进出动画（gapfill-13:59 定案），但 surface-11:196 W10 已把「dcu-settings-enter/nav/content + 退出 140ms」整体裁决为「插件超集（宿主视图切换动画兜底），保留」，且 `scripts/verify-settings-exit.mjs:58`（gate:host 档）以专用脚本钉死退出末帧行为——触既有裁决，登记不修；若日后收口，按 gapfill-13 建议在 docs/ZCODE-DESIGN.md 动效节登记增强身份 |
| 3 | CodexSettingsPage.tsx:232 | 设置搜索前导图标 `ZIconSearch size={15}` → **16**（ZCode size-4=16px；15px 全库无档） |

（#4–#7 deviation 证据成立、不落；#8 已由 gapfill-2 登记不重复修；A-1～A-9 / B-1～B-20 / C-1～C-5 维持报告处置。）

## 改动文件清单（11 个，全部 src/client）

新增：scrollbar-autohide.ts（239 行）。
修改：CodexSidebar.tsx、CodexSettingsPage.tsx、CodexWorkspaceBrowser.tsx（净 0 行，棘轮守恒）、conversation-layout.ts、index.ts、input-history.ts、locales.ts、settings-page-styles.ts、zcode-skin.ts、zcode-theme.ts、zcode-tokens.ts。

## 遗留给后续轮

1. **surface-5 M3（空态 14px/21px）**：等 `scripts/verify-workspace-drop-layout.mjs:97` 同步（该检查字面钉死 13px/18px）后，改 wb 三处（源内已留同行注记指路）。
2. **surface-7 #3（↓ 空草稿召回）**：等 tests/input-history.spec.ts:43 规格更新后改 input-history.ts:56 守卫（同时补 keyboard spec 用例）。
3. **surface-13 #1（加号 hover 5%）**：等 batch-19:130 + design-system:1572 两锚同步后，composer-visuals.ts:29 换 `var(--dsw-alias-interactive-bg-hover)`。
4. **活体验收未跑（无 9223/9224 会话）**：M5 状态机对拍（滚动现形→1s 熄灭→hover 提亮→拖拽 45%，needs-live ③）、M1 min-32 在 DSH 矮容器的表现（needs-live ②）、M6 gutter both-edges 与 composer 座位合成（needs-live ①）、M7 落区按钮 hover 手感、M2/M3 换值后全局面观感。
5. **M5 作用域映射**：ZCode 三框 → DSH 只挂了会话框；侧栏树（D2）与设置 main（ZCode 语义本就非三框）未加入，属判断项，活体轮可复议。

---

# 落地员·C（面 8 禁用/加载/进度 / 9 徽标与计数 / 10 markdown 渲染 / 14 主题层叠定案）

> 日期：2026-11-03。基线 = 落地员·A+B 的工作树（HEAD `50ac768` + A 的 13 文件 + B 的 11 文件未提交改动；起点实跑：断言 62/3/0、gate exit 0）。
> 范围铁律：只改 `uiplug/src/client`；不碰 lib/；不 commit；不 push。
> ⚠ 基线非净树（A/B 改动在场），红项处置不用 `git restore`（会扫掉 A/B 的工作）：改前 8 个文件全量备份至 /tmp/lander-c-backup/，红项外科手术回退。本轮仅 1 次红（见下），当场收敛，未回退任何条目。

## 验收（本机实跑）

```
node tests/run-assertions.mjs  → 62 通过 / 3 跳过 / 0 失败（共 65 个脚本）   [基线同值]
node scripts/gate.mjs          → exit 0：类型检查 ✓ / 断言新增失败 0 / vitest ✓ / 布局 22 ✓ / 上游哨兵 ✓
```

中途 1 轮红：design-system 间距棘轮抓到 M2 药丸的 `padding:1px 6px`——ZCode kbt 原文是 py-0.5=**2px**（2px 半步在标度内），改值后绿。未回退任何文件。

## 面 8 · 禁用 / 加载 / 进度三态（surface-8.md，mechanical #1–#5/#7 落；#6 登记不落）

| # | where | 落地 |
|---|---|---|
| 1 | settings-page-styles.ts `.dcu-settings-switch:disabled` | `cursor:default` → **not-allowed**（ZCode Switch `data-disabled:cursor-not-allowed`；opacity .5 两端一致不动） |
| 2 | DeveloperToolsRow.tsx（开关钮） | 补 `aria-busy={busy}`（ZCode Switch busy 案 @2524862 同款；disabled 原样） |
| 3 | AboutSection.tsx 单依赖安装钮 | 补 `aria-busy={installing === dependency.id}`（与 :228 update-all 既有写法同构） |
| 4 | AboutSection.tsx `.dcu-about-install:disabled` | opacity `.65` → **.6**（阶梯外自造档；同位带边框钮+spinner 案 = not-allowed+.60，surface-8 复核 verified）。**cursor:wait 不动**——属 #12 needs-live（live-verdicts 维持，耦合注记保留：若活体判给满透明度/grid 交换案需另行调整） |
| 5 | AboutSection.tsx loading 分支 + stylesheet | 纯文字框 → **ZCode 列表骨架**：容器 `role="status"` + `aria-label=t('about.loading')`，占位行 `aria-hidden`（几何镜像本仓依赖行 64px/12px），图标位 20px + 文字条 12×112px，填充 `var(--dsw-alias-bg-skeleton)`，pulse = ZCode animate-pulse 原文（2s cubic-bezier(.4,0,.6,1)/50%→opacity .5），`@media(prefers-reduced-motion:no-preference)` 包裹。配套：`--dsw-alias-bg-skeleton` 0.04/0.08 → **0.03/0.05**（surface-8 §5 指令：同步 gapfill-5 §3b 的 ZCode 真值 = --color-surface 系） |
| 6 | zcode-theme.ts:224 reduce 停帧 | **登记不落**：`width:28%` 被 `tests/design-system.assert.ts:284` 逐字钉死（`/\.dcu-about-progress-fill\[data-wave=true\]\{animation:none;width:28%\}/`，断言意图含具体值），测试文件在铁律范围外。ZCode 真值（停满宽 `width:100%;animation:none;left:0`）待测试轮同步后落 |
| 7 | AboutSection.tsx 进度条 | 条本体补 `role="progressbar"` + `aria-valuemin={0}` + `aria-valuemax={100}` + `aria-label=t('about.progressHint')` + 确定态 `aria-valuenow`（wave 态 undefined 自动省略，ZCode 不确定态省 valuenow 同构）；外层 role="status" 保留 |

登记不落：#8/#9/#10/#11（deviation：transform vs left、move 档曲线批次 17 既有裁决、运行中转圈位置批次 18/19 裁决、reduce 全停 a11y 决策）、#12（needs-live：busy 钮 cursor+opacity 四案手感，与 #4 耦合保持）。

## 面 9 · 徽标与计数（surface-9.md，M1/M2 全落）

| # | where | 落地 |
|---|---|---|
| M1 | session-tree.tsx + CodexWorkspaceBrowser.tsx `.dcu-wb-pending` | 琥珀裸文字+7px 圆点 → **绿系药丸**：`height:20px; border-radius:var(--dsw-radius-full); padding:0 8px; font-weight:500`，文字 `--dcu-state-success-text`（#176c31/#46bf72，AA 实测直接可用 = N3 首选路径），底 `--dcu-pending-pill-bg`（success primary oklab 14%/18% 混透明，ZCode `bg-success/14 dark:bg-success/18` 编译值；主题层新令牌，因消费方样式表是静态串）；**圆点从 JSX 摘除**（ZCode 无圆点，语义由底色/文字承担）。三处断言锚保留：`data-state="warning"`（session-tree.assert.ts:41 钉死，语义重估 warning→success 待测试轮）、`position:absolute;right:10px;top:50%;…translateY(-50%)`（settings-integration:288，本仓既有定位架构 = A6 已对齐项）、`dcu-wb-pending-label">{label}`（design-system:305）。`.dcu-wb-pending-dot` CSS 规则**保留**并改 success 填充档——它唯一消费者是 scripts/verify-a11y-and-overflow.mjs:265 的夹具测量（该文件在铁律范围外，删规则即门禁红），已留同行注记说明其夹具专供身份 |
| M2 | CodexWorkspaceBrowser.tsx `.dcu-wb-collection-count`（:210 基础 + :357 宽栏） | 纯文本 → **ZCode kbt 药丸**：`inline-flex min-width:20px + rounded-full + bg-tag/50（→ --dsw-alias-markdown-tag 50% oklab 混透明）+ padding 2px 6px + font-size 12px + font-weight:500 + line-height:1`；`margin-left:auto`（A8）与 `tabular-nums`（A9 超集）保留。宽栏档：字重随药丸 500；原 `padding-left:8px`（裸文字时代的右间隔 hack）移除——药丸自带内距，保留会变成胶囊左内距（bg 内不对称）。**登记**：最窄间距场景（标题省略到底）本仓 0 间距 vs ZCode flex-1+gap-1=4px，N1 计数档（DSH 快照无计数字段）维持 needs-live，只对齐形态 |

## 面 10 · markdown 渲染（surface-10.md，M1–M4 全落）

| # | where | 落地 |
|---|---|---|
| M1 | conversation-layout.ts ⑦（td 规则后新增） | 表格行悬停：`tr{transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}` + `tr:hover{background:var(--dcu-table-row-hover,transparent)}`。悬停色 = 新主题层令牌：亮 `rgba(229,229,229,.2)`（ZCode 编译 fallback #e5e5e533）/ 暗 `rgba(255,255,255,.02)`（`--color-hover=#ffffff1a` × 20% oklab） |
| M2 | ⑦（新增一条） | 末行去底线：`tr:last-child td{border-bottom:0}`（ZCode `last:[&>td]:border-b-0`）——⑦ 外框（B7 已落）承担封底，消除 separate 折叠双线 |
| M3 | ⑦ th/td 规则 + th 规则 | 补 `min-width:64px; max-width:448px; white-space:normal; overflow-wrap:break-word`（ZCode qNt/JNt min-w-16/max-w-md/break-words）+ th `text-align:left`（qNt 带 text-left，UA 默认 center） |
| M4 | 行内码规则 | 补 `margin-inline:2px`（ZCode mx-0.5）。**N4 活体未跑，但静态前提本轮补强**：从 /Applications/DeepSeek Harness.app asar 实际提取 web-frontend 两个 dist CSS + trajectory/chat client.js，全部 `:not(pre)>code` 规则（3 处）均无 margin 声明，`code` UA 默认 margin 0，且 margin 是级联取值非叠加——已在源内注释登记证据链 |

登记不落：D1（引用块 prose 旧值，锁定断言 conversation-visuals:462–465，翻案需活体双确认 N3）、D2（码体 pre 内边距，assert:441-442 钉死 + APPLIED §二挂账）、D3（链接字重，⑧「不落任何规则」裁决域）、N1（锚点溯源已被复核静态破案，无需动）、N2（table→p 间距待 9223；复核已发现宿主 `._markdown_1ypvv_5 p{margin:16px 0}`，「若为 0」分支大概率不触发）。

## 面 14 · 主题层叠定案（surface-14.md，#1/#4/#5 落；#3 unconfirmed、#6–#9 登记、#10 文档域）

| # | where | 落地 |
|---|---|---|
| 1 | zcode-tokens.ts `--dsw-font-family` | 值 → **ZCode `--font-sans` 原文**：`ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`。显式 CJK 字体摘除的等价性依据：system-ui/sans-serif 的系统回退在 mac/Win 落到同一批 CJK 字体（PingFang SC / Microsoft YaHei），声明等价、栈与 ZCode 逐字符一致；报告给出的「或登记为宿主 CJK 显式适配」备选未取（无证据表明显式 CJK 是必需适配）。`--dsh-font-family-code-default` 不动（已逐字符一致，night-audit-batch-5:205 钉死） |
| 4 | zcode-theme.ts G14 注释（:268/:272-273） | 注释身份更正：#404040 = **基底层** foreground（neutral-700）；运行时 zai-light --color-foreground = neutral-800（#262626）。令牌值与 alpha 85%/75% 不动（AA 理由独立成立）。全部为同行内替换，行号锚零位移 |
| 5 | zcode-theme.ts TA1 注释（:251-260/:265/:304） | 「245=侧栏层 / 250=画布层，5 通道差是设计语言」→ 更正为「245/250 是被覆盖的基底层残值；运行时真值 = 覆盖层 侧栏 #f0f0f0 / 画布 #f8f8f8」；设置页底注释 #fafafa(250) → #f8f8f8。现值 #f0f0f0/#f8f8f8 均正确不动。同行内替换，:288/:310/:339/:353/:354 行号锚零位移 |

登记不落：#3（复核判 **unconfirmed**——插件 sidebar-drag.ts 早有 420 定值上限，非「无上限」；真实差异 = 420 定值 vs ZCode 0.5×容器宽，动它要处理既有 420 裁决）、#6（设置卡 #fafafa，触 TA4 静态定案，需活体）、#7（阴影阶梯自造三档，宿主令牌波及 Modal/浮层）、#8（用户气泡 3%/5% vs ZCode 专属令牌 5%/8%，触 G17 翻案定案）、#9（焦点环 #0b7fff/#4099ff，live-verdicts 定性定案「ZCode 无蓝色 focus 消费点」但控件级档位与 composer 聚焦态残留待采，且 design-system:279-280 断言钉死现值）、#10（tokens.json 文档重采，文档域非 src/client）。

## 改动文件清单（8 个，全部 src/client；A/B 改动未触碰）

AboutSection.tsx、CodexWorkspaceBrowser.tsx（净 0 行，1136 棘轮守恒）、DeveloperToolsRow.tsx、conversation-layout.ts、session-tree.tsx、settings-page-styles.ts、zcode-theme.ts、zcode-tokens.ts。

## 遗留给后续轮

1. **surface-8 #6（波浪 reduce 停满宽）**：等 tests/design-system.assert.ts:284 同步（钉死 `width:28%` 及其断言语义）后，改 zcode-theme.ts:224 为 `animation:none;transform:none;width:100%`。
2. **surface-9 M1 的 data-state 语义**：tests/session-tree.assert.ts:41 钉死 `data-state="warning"`，绿系药丸下该属性语义已名不副实，待测试轮改 `success`。
3. **surface-9 N1（胶囊计数）/ N2（未读点色）/ N3（绿字 AA 实采）**、surface-10 N4（行内码 margin 活体采样）、surface-14 #9 残留（composer 聚焦态边框真值）：全部维持 needs-live。
4. **verify-a11y-and-overflow.mjs:265 的 `.dcu-wb-pending-dot` 夹具测量**：圆点已无真实渲染，该检查现量为「虚构元素 ≥3:1」——测试轮宜改为量药丸底色对比，随后删 `.dcu-wb-pending-dot` 僵尸规则。

---

# 落地员·D（面 11 设置页逐分区 / 12 频道定时归档页）

> 日期：2026-11-03。基线 = 落地员·A+B+C 的工作树（HEAD `50ac768` + A 13 文件 + B 11 文件 + C 8 文件未提交改动；起点实跑：断言 62/3/0、gate exit 0）。
> 范围铁律：只改 `uiplug/src/client`；不碰 lib/；不 commit；不 push。
> ⚠ 基线非净树（A/B/C 改动在场），红项处置不用 `git restore`（会扫掉 A/B/C 的工作）：改前 6 个文件全量备份至 /tmp/lander-d-backup/，红项外科手术回退。本轮 1 轮红，当场收敛，未回退任何文件（reverted = false）。

## 验收（本机实跑）

```
node tests/run-assertions.mjs  → 62 通过 / 3 跳过 / 0 失败（共 65 个脚本）   [基线同值]
node scripts/gate.mjs          → exit 0：类型检查 ✓ / 断言新增失败 0 / vitest ✓ / 布局 22 ✓ / 上游哨兵 ✓
```

中途 1 轮红（3 个断言文件同时报）：① design-system 颜色字面量扫描抓到新落地的 `#fff`/`#595959`/`#b3b3b3`；② structure-budget `!important` 计数 60→61——元凶是我在 CSS **注释**里写了「!important 预算」字样（计数按子串扫全文）；③ docs-baseline 是 ② 的连带。收敛：两个色值升为 `--dcu-state-error-foreground` / `--dcu-settings-group-label` 主题层令牌（zcode-theme.ts night2 追加块，主题层是扫描豁免的真值源，`:401` 危险行白字同先例），消费点走 `var(--tok,#hex)` 安全回退；注释改写不含该子串。未回退任何文件。

## 面 11 · 设置页逐分区（surface-11.md，mechanical 9 落 + 1 登记不落）

复核结论先行：M1 经复核**部分推翻**——zai 亮前景实为 #262626（neutral-800，非报告写的 oklch 37.1%），文字侧 ours=#262626/#d4d4d4 与 ZCode 前景**逐值相同**，故 M1 只剩图标色差；M8 的 disabled cursor 已由落地员·C（面 8 #1）落地，本轮只落残部。

| # | where | 落地 |
|---|---|---|
| M1 | settings-page-styles.ts `.dcu-settings-link svg` | 图标色 `var(--dcu-sidebar-icon,…)` → **`var(--sp-text)`**（= --dcu-sidebar-navigation #262626/#d4d4d4 = ZCode 前景真值；文字侧按复核更正不动，只收敛图标两主题差）。作用域限设置导航，不动全局 --dcu-sidebar-icon（主侧栏图标无本轮证据） |
| M2 | settings-page-styles.ts 暗色 nav 作用域 | `--sp-hover` 引 `--dcu-sidebar-hover`(.05 白) → **`--dcu-sidebar-selected`**(.1 白)——ZCode k1n hover 与 active 同吃 bg-surface-hover；亮色 .05 黑两端同值不动。作用域限设置导航（全局 sidebar-hover 是其他面裁决域） |
| M3 | settings-page-styles.ts `.dcu-settings-group-label` + zcode-theme.ts night2 块 | 分组标签色从 nav 作用域 `--sp-muted`（侧栏 secondary 档）→ 新令牌 **`--dcu-settings-group-label`**（ZCode text-remote-foreground-muted 专用档，on 导航底实算 6.60:1 / 8.63:1 双过 AA）；水平内距 8→**10px**（M4 同落此规则） |
| M4 | settings-page-styles.ts `.dcu-settings-link` / `.dcu-settings-group-label` | 项 padding 与组标签 margin `0 8px` → **`0 10px`**（px-2.5；10 在标度内，零登记） |
| M5 | settings-page-styles.ts:78 | **登记不落**：`.dcu-settings-link+.dcu-settings-link{margin-top:1px}` → 4px 被 `tests/design-system.assert.ts` OFFSET_BASELINE 双向棘轮钉死（`'settings-page-styles.ts:margin-top:1px': 1` 要求恰好 1 次，删值即 stale 红），测试文件在铁律外——待测试轮把该条移出基线后落 space-y-1=4px |
| M6 | settings-page-registration.ts:131 | 设置触发钮图标 `strokeWidth: 1.6` → **1.5**（全仓最后一处 1.6 残留；batch-16 注释明确「故意不锁 1.6」） |
| M7 | settings-page-styles.ts `.dcu-settings-back` | `border-radius:var(--dsw-radius-lg)` + `background:transparent` → **`var(--dsw-radius-xl)`(12px) + `var(--dcu-surface,…)`**（亮 .03 黑/暗 .05 白，令牌已在 zcode-theme:311/354）。报告覆写串里的 m-1/px-1.5 几何未随（条目名为「底色与圆角」，高/图标/gap 属 A11 已对齐项） |
| M8 | settings-page-styles.ts `.dcu-settings-switch` | 残部两件：轨道补 **`transition:background-color` feedback 档**（ZCode transition-all，A13 同档）；新增 **`::after{inset:-8px -12px}`** 命中区外扩（after:-inset-y-2/-inset-x-3）。disabled cursor 已由 C 落（not-allowed），opacity .5 两端一致不动 |
| M9 | settings-page-styles.ts `.dcu-settings-general-group h2` | 字号 `--dsw-font-size-base`(14) → **`--dsw-font-size-lg`**(=base+2=16px，text-ui-lg 档；zcode-tokens:568)；600 字重不动（batch-13:66 只锁结构） |
| M10 | settings-page-styles.ts `.dcu-settings-inner` / `.dcu-settings-heading` | 内容列 `padding:48px 48px` → **`0 32px 40px`**（hR：pt-0/lg:px-8/lg:pb-10）；标题下距 24→**32px**（gap-8），无题行 16→**32px**（gap-8 统一语义）。864px 宽度不动（D4 宿主约定）；verify-settings-geometry 实测仍 864 ✓ |

**登记不落**：D1–D5（deviation，证据复核全部成立：导航 16px 触 S1+batch-8:196、卡底触 S2/TA4、分区标题 24px 需扩令牌阶、864px 是宿主约定、侧栏列宽触 batch-3 体系）；needs-live N1（开关黑白反转经复核+live-verdicts 静态收口大半，仅剩宿主覆盖确认）、N2（宿主 selector focus 现状）、N4（D1 重开手感）维持。

## 面 12 · 频道定时归档页（surface-12.md，mechanical 4 落 + 1 已由先手落地）

| # | where | 落地 |
|---|---|---|
| M1 | CodexWorkspaceBrowser.tsx `.dcu-wb-delete-button`（消费者共 4 处确认弹窗：归档整组 ScheduleBrowser.tsx:175、删会话 session-row-actions.tsx:111、删分组 :1130、删工作区/会话 :1134） | outline+红字 → **destructive 实心**：`background:var(--dcu-state-error-fill)` + `color:var(--dcu-state-error-foreground,#fff)!important` + 边框透明 + hover `error-fill-hover`，配方同 archive-confirm.ts:42 真机验收档；双写类名抬特异性压 DSH outline（`.dcu-ctx-menu.dcu-ctx-menu` 同先例），!important 预算 1 处不增不减。报告 where 列两点，类级落地自然覆盖 4 处（ZCode confirmVariant:'destructive' 23/23 一律实心） |
| M2 | session-tree.tsx GroupHead + CodexWorkspaceBrowser.tsx 样式（净 0 行内联） | 分组头补**展开箭头**：复用 `.dcu-wb-section-caret` 基座（自绘 chevron 仓内既有语言）放大 14px、常显、`--dcu-sidebar-tertiary`（subtlest 档），`[aria-expanded=true]` rotate-90（过渡走 move 档）。ZCode 箭头身份 js@2371150（size-3.5 subtlest）+ 归档组 rotate-90 js@2058850；左键=折叠语义不变（复核 N2 静态破案）。消费点仅频道/定时两树（复核订正：工作区树不用 GroupHead），无需 prop 门控 |
| M3 | session-tree.tsx GroupHead `count?: number` + ScheduleBrowser.tsx / ChannelBrowser.tsx 调用点 | 分组头补 **kbt 计数药丸**：直接复用 surface-9 M2 已升药丸的 `.dcu-wb-collection-count`（min-w-5/rounded-full/bg-tag/50 规格，报告「共用一个 class」的正解）；两调用点传 `group.sessions.length`。**登记**：药丸落位沿用该类自带的 margin-left:auto（右缘、贴操作区），ZCode kbt 紧跟标题——与 surface-9 M2 已登记的间距偏差同类；N3（DSH 侧栏底观感/AA）维持 needs-live |
| M4 | ScheduleBrowser.tsx ScheduleClock | 实心自绘钟 → **lucide Clock 描边语言**（复核 N1 静态破案：cron 行图标 = Clock，`M12 6v6l4 2` + circle r10）：几何按 24 栅格 ×2/3 缩到 16 栅格（r6.67 / M8 4v4l2.67 1.33），stroke 1（=1.5×16/24 有效宽，与同屏 ZIcon* 同重量），外框 16×16 与 batch-20 断言（锁尺寸非风格）兼容，零测试同步落地 |
| M5 | ScheduleBrowser.tsx:191 / session-row-actions.tsx:113 | **零改动**——busy 进度文案已由落地员·A（面 4 M1）从 `dcu-wb-error` 换 `dcu-state` 中性档，本轮实读核实两处均为 `dcu-state` + `role="status"`，登记为先手已落 |

**登记不落**：D1（粘性分组头，跨 surface-2 域+窄幅占位，规格存档 §1.1B）、D2（分组头标题色，APPLIED「侧栏三档文字 68/56%」裁决维持）、D3（页签形态，KNOWN-ISSUES §3.1 分段控件裁决）、D4（品牌图标介质，KNOWN-ISSUES §55.4 商标色豁免）；N1/N2 已被复核静态破案（Clock 身份、左键折叠），N3 维持。

## 改动文件清单（7 个，全部 src/client；A/B/C 改动未触碰）

settings-page-styles.ts、settings-page-registration.ts、CodexWorkspaceBrowser.tsx（净 0 行，1136 棘轮守恒）、session-tree.tsx、ScheduleBrowser.tsx、ChannelBrowser.tsx、zcode-theme.ts（仅 night2 追加块 +4 行令牌，:356 前全部行号零位移）。

## 遗留给后续轮

1. **surface-11 M5（导航行距 1px→4px）**：等 tests/design-system.assert.ts OFFSET_BASELINE 移除 `'settings-page-styles.ts:margin-top:1px'` 条目后，改 settings-page-styles.ts:78 为 4px（space-y-1）。
2. **surface-12 N3（kbt 药丸 DSH 侧栏底观感/AA）**：与 surface-9 N2/N3 同批 9223 活体采样。
3. **surface-11 N1 残项**：宿主运行时对 `--dsw-alias-brand-primary` 是否有更高优先级覆盖，须 9223 插件实例确认（静态令牌层已证黑白反转同构）。
4. **活体验收未跑**（无 9223/9224 会话）：分组头箭头/计数药丸双主题观感、destructive 确认钮手感、设置导航配色三件套换档后全局面观感。
