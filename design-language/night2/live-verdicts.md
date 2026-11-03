# night2 needs-live 逐条裁决（CDP 实测 vs 报告值）

> 裁决员 · 2026-11-03。只读，未改任何代码。
>
> **输入**：`night2/cdp-summary.json`（+ `cdp-/` 内原始 JSON：`cdp-item1-theme.json`、`cdp-item2-codeblock.json`、`cdp-item4d-5d.json`、`/tmp/zcode-root-vars.json` 353 变量活体 dump）+ `night2/surface-1.md` ~ `surface-14.md`。
> **本轮实际执行的检查**：① 全文读取 cdp-summary.json 与 14 份 surface 报告的 needs-live 区段；② grep/python 解析 cdp-*.json 与 root-vars dump 提取 token 真值；③ `grep -n` 实读插件源码 `src/client/zcode-tokens.ts`（:100/:118/:333/:349/:506/:508）；④ python3 WCAG 公式实算 6 组对比度（见 surface-11 N3 行）。
> **采信说明**：凡标注「surface 复核员活体实测」的值（如 surface-2 #9 的 9223 读值、surface-5 N1 的 21px）是各报告复核员在本 night2 轮内实跑的 CDP 记录，本轮裁决未复跑，按记录采信并如实标注来源；本轮裁决员亲手读到的 CDP 值均注明出自哪个 JSON。
> **口径**：本轮 CDP 打的是 ZCode 9224（未注入插件，root dump 无任何 `--dsw-*`），故所有「DSH 插件侧渲染/观感」类 needs-live 天然不在本轮覆盖内。

## 总账

38 条 needs-live：**收口 9 条**（CDP/活体/静态复核直接定值：s2#9、s3NL①、s5N1、s7#8、s10N1、s11N3、s12N1、s12N2、s13C5）、**部分裁决 6 条**（ZCode 侧已定、DSH 侧或观感残留：s10N2、s11N1、s11N2、s13C2、s13C4、s14#9）、**维持 needs-live 23 条**（本轮 CDP 未覆盖，原分类成立）。

---

## surface-1（菜单/右键，#12–#15）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-1 #12 树菜单项 | ZCode 任务菜单行高（32px 活体 vs 28px 下限/30.75px 实算） | CDP 未覆盖：本轮 9224 未触发任务右键菜单，无行高读数 | **维持 needs-live**。须 9224 触发真实任务菜单测行高后定档。两份证据差 1.25–4px 的分歧未被任何活体消解 | 否 |
| surface-1 #13 开合生命周期 | 关闭动画 + 子菜单时序（Radix Presence 延迟卸载） | CDP 未覆盖：本轮未对任何菜单做开合计时 | **维持 needs-live**。Radix Presence 卸载时序静态不可得（surface-1 复核已核静态半边成立），活体半边未采 | 否 |
| surface-1 #14 右键落点 | ZCode 菜单锚点是否贴指针 | CDP 未覆盖：未触发右键菜单 | **维持 needs-live**。静态证据（XI 无 sideOffset 包裹）成立，真实落点未采样，「y 收回 -4」待裁 | 否 |
| surface-1 #15 primitives .submenu | 子菜单定位（对齐边/边距） | CDP 未覆盖：未开子菜单 | **维持 needs-live**。定位来自 Radix 运行时，静态不可见，未采样 | 否 |

## surface-2 / surface-7（宿主令牌 resolved 值）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-2 #9 CodexWorkspaceBrowser.tsx:285 | 卡圆角 `--dsw-radius-xl` | **CDP 9223 实测 12px**（surface-2 复核员：`getComputedStyle(html/body).getPropertyValue('--dsw-radius-xl')` = "12px"，html 与 body 均是）+ 本轮亲手实读 `src/client/zcode-tokens.ts:508` = `'--dsw-radius-xl': '12px'` | **收口：12px**。报告前提「插件 src 0 定义、静态无 resolved 值」被推翻（漏了 TS 对象键写法）；按原文自己的决策规则（读出 12px → 与 p2e `rounded-xl` 先例一致）无需动，needs-live 分类销案 | 是 |
| surface-7 #8 CodexWorkspaceBrowser.tsx:361 | 焦点环圆角 `--dsw-radius-md` | 本轮亲手实读 `src/client/zcode-tokens.ts:506` = `'--dsw-radius-md': '6px'`；CDP root dump（/tmp/zcode-root-vars.json）`--radius-md = .375rem` = 6px、`--radius-lg = .5rem` = 8px | **收口：6px**。与 surface-2 #9 同型翻案——「静态 0 定义」是 grep 模式漏 TS 对象键；token resolved 值 = 6px，与 ZCode `--radius-md` 同值。注意 ZCode 行焦点形态不消费圆角令牌（行自身 `rounded-lg`=8px，surface-7 复核已核）；插件消费点吃 6px，是否跟随行的 8px 属设计决策非实测项 | 是 |

## surface-3 / surface-4（destructive 色 / toast inert / 错误盒感知差）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-3 NL①（M10 浅色 destructive） | #e7000b（手算 oklch）vs #e40014（编译 fallback） | **CDP 实测**（cdp-item1-theme.json 主题矩阵，本轮亲手解析）：html 挂载 light `--color-destructive` = **#e03131**、dark = **#ff5c5c**；body 挂载回落基座 oklch(63.7% .237 25.331)；/tmp/zcode-root-vars.json（dark 活体）= #ff5c5c | **收口：#e03131（浅）/ #ff5c5c（深）**。zai 覆盖层在活体生效，两个候选值（#e7000b/#e40014）都是基座层的派生算术，不是现网渲染值。与插件 `--dcu-state-error-fill` #e03131/#ff5c5c（zcode-theme.ts:52/:78）**逐值一致**——surface-4 §6 的翻案（「surface-3 M10 误报」）由 CDP 双向证实，NL① 销案 | 是 |
| surface-3 NL② | `bg-popover/98` 2% 透明差可感知性 | CDP 未覆盖：本轮未做目检 | **维持 needs-live**。感知判断无法静态/数值裁决，活体目检一次即可销案 | 否 |
| surface-4 needs-live ①（M3） | 设置页开启时官方 toast 是否真被 inert | CDP 未覆盖：本轮 item1b 确经 ⌘K 打开了设置页（并实测其底色，见 surface-11 N3 行），但**未触发任何 toast**，`#zcode-toast-host` 行为未观察 | **维持 needs-live**。静态推断链 verified（surface-4 复核）；触发 toast + 点关闭钮的活体未执行 | 否 |
| surface-4 needs-live ② | 浅色 12%（#e03131 mix）vs 10.2%（#e40014）错误盒底并排可感知差 | CDP 未覆盖（目检未做）。附新事实：/tmp/zcode-root-vars.json 实测 **dark** `--color-destructive-surface` = `color-mix(in srgb, #ff5c5c 16%, transparent)` | **维持 needs-live**。并排可感知差需目检；dark 侧活体值（#ff5c5c 16% mix）与文中引用的 light 值（#e400141a）不是同一档，引用时勿跨主题混用 | 否 |

## surface-5（空态）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-5 N1 | ZCode 树空态行高（21px vs 20px） | **9224 活体实测 21px**（surface-5 复核员本轮实跑：现存侧栏 `.text-ui-base` 8/8 元素 computed 14px/21px + 临时探针 `px-3 py-2 text-ui-base` 同值，测后即删） | **收口：21px（非 20px）**。M3 的 line-height 落值 18→21px 依此定；运行时样式表与 asar css 逐字节一致（480,065B）佐证该值即静态真值。本轮未复跑，按 surface-5 复核记录采信 | 是 |
| surface-5 N2 | 搜索空态居中（M2）在 DSH 浮层的双主题目检 | CDP 未覆盖：9224 未注入插件（surface-5 复核实测 `[class*="dcu-"]`=0、`[class*="dsw-"]`=0、iframe=0） | **维持 needs-live**。DSH 侧采样须 9223 插件实例 | 否 |
| surface-5 N3 | automations 大卡（h-226）能否下放 240px 窄栏 | CDP 未覆盖：DSH「定时」页签不在 9224 实例 | **维持 needs-live**。ZCode 大卡本体已静态证实（js@5025406），窄栏适配待 DSH 活体 | 否 |

## surface-6（滚动条）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-6 composer thin | `scrollbar-width:thin` 是否实际可见 | CDP 未覆盖：未造溢出样本 | **维持 needs-live**。需 9224 造溢出样本后再裁 | 否 |
| surface-6 needs-live ① | M6 gutter 与宿主座位变量的 2px 级合成错位 | CDP 未覆盖：M6 未落地 | **维持 needs-live**。先 M6 落地再目检（surface-6 自身的合入前置） | 否 |
| surface-6 needs-live ② | `min-width/height:32px` 在 DSH 矮容器的表现 | CDP 未覆盖 | **维持 needs-live**。DSH 矮容器样本未采 | 否 |
| surface-6 needs-live ③ | M5 状态机对拍验收（出现→1s 熄灭→hover→拖拽 45%） | CDP 未覆盖：M5 未落地 | **维持 needs-live**。落地后活体录屏验收 | 否 |

## surface-8（busy 钮）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-8 #12 AboutSection.tsx:37 | busy 钮 cursor+opacity 落点（插件 wait+.65/.55 vs ZCode 四案：not-allowed+.60、pointer-events-none+.50、wait 无 opacity、满透明 grid 交换） | CDP 未覆盖：本轮未观察任何 busy 态按钮 | **维持 needs-live**。四案 ZCode 侧全部属实（surface-8 复核逐案亲验），「安装钮」语境适用哪案仍需活体手感；与 #4 的耦合（.65→.6 依赖 not-allowed+.60 案）保持 | 否 |

## surface-9（徽章）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-9 N1 | 胶囊计数能否落地（DSH 快照是否带计数） | CDP 未覆盖：数据面，9224 不涉 | **维持 needs-live**。需 DSH 侧确认 `useSessionStatus` 快照；无计数则 M1 只对齐形态 | 否 |
| surface-9 N2 | 未读点实际渲染色接近度 | CDP 未覆盖：未取色 | **维持 needs-live**。色差量级记录项，取角色令牌已裁决（KNOWN-ISSUES:897） | 否 |
| surface-9 N3 | 绿系胶囊文字 AA | CDP 未覆盖（DSH 侧栏底未采）。surface-9 复核已有实算：#176c31 ≥4.82:1、#46bf72 ≥6.04:1 | **维持 needs-live**。照抄 ZCode green-700/green-300 时须在 DSH 侧栏底重测 AA；用插件 `--dcu-state-success-text` 则直接可用 | 否 |

## surface-10（markdown/码块）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-10 N1 | `[class*="_markdown_"]` 锚点溯源 | CDP 未采该类名；但 **surface-10 复核已静态破案**：DSH asar `_markdown_` 命中 42 处，`._markdown_1ypvv_5` 定义于 dsh-web-frontend/dist/assets/index-BxpfOGf3.css（首个 @28731），dist/index.html 显式引用，index-CN7NIWNw.js 2 处应用点 `MO="_markdown_1ypvv_5"` | **收口（静态）**：运行时类名出处=宿主 web-frontend 模块自身的 CSS Modules，非版本漂移。原文前提「asar 内无该字面量」被复核证伪。活体只剩 30 秒确认性采样，非必需 | 是 |
| surface-10 N2 | 表格/码卡与后续块的间距 | **CDP 实测**（cdp-item2-codeblock.json，本轮亲手解析）：ZCode 码块壳 `…rounded-xl…my-4…bg-card` margin **16px/0px/16px/0px**（上/右/下/左），即码卡→后续块 = **16px** | **部分收口**：ZCode 基准侧「码卡→后续块 = 16px（壳 margin-bottom 提供）」已活体定值。DSH 侧 table→p 实际间距（复核员补充：宿主 `._markdown_1ypvv_5 p{margin:16px 0}`，可能不触发「若为 0」分支）仍需 9223 量取后才落 ⑦/D1 的补 margin 决策 | 部分 |
| surface-10 N3 | 引用块翻案双确认（lNt 六值活体） | CDP 未覆盖：本轮会话未见引用块样本 | **维持 needs-live**。D1 翻案前按原建议采一次含引用块会话 | 否 |
| surface-10 N4 | 行内码 mx-0.5 落地前宿主默认 margin | CDP 未覆盖：未采行内码 computed margin | **维持 needs-live**。3 处静态 `:not(pre)>code` 规则均无 margin（surface-10 复核），会话区实际吃哪条仍需 `getComputedStyle(marginInline)` | 否 |

## surface-11（设置页）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-11 N1 | 开关 checked 底/拇指宿主令牌值 | CDP 佐证（本轮亲手解析）：root dump dark `--color-brand` = **#fff**；cdp-item1-theme.json 矩阵证明 zai 两主题 :root 层全生效。本轮亲手实读插件 `src/client/zcode-tokens.ts:118/:349` = `--dsw-alias-brand-primary` **#000000/#ffffff**（非品牌蓝）、:100/:333 = `--dsw-alias-label-primary-foreground` #ffffff/#000000 | **大部分收口**：surface-11 复核发现的本仓静态令牌（黑白反转）与 CDP dark 实测 #fff 一致；插件 checked 轨/拇指与 ZCode zai 黑白反转**同构**。残项唯一：宿主运行时是否有更高优先级覆盖 + 实际渲染目检 | 部分 |
| surface-11 N2 | 宿主 selector 下拉 focus/hover 现状 | CDP 部分覆盖：/tmp/zcode-root-vars.json 实测 `--color-input-border-focused` = **#ffffff26**（深）；cdp-item4d-5d.json 实测 CSSOM 规则 `focus-visible:border-input-border-focused + ring-0` 族在 | **部分收口（ZCode 侧）**：ZCode 聚焦=仅边框加深至 border-hover、ring-0，活体坐实（surface-11 复核并更正亮色 border-hover 为 #0d0d0d26=15% 黑）。DSH 插件侧宿主行为仍需 9223 比对 | 部分 |
| surface-11 N3 | M1/M3 两档灰真实 AA | **CDP 实测底色修正**（cdp-item1-theme.json + cdp-summary item1b）：设置页底深 rgb(22,22,22)=#161616、浅 rgb(248,248,248)=**#f8f8f8**——报告算 AA 用的浅底 #f0f0f0 是侧栏值，设置页实际是 #f8f8f8。本轮 python3 实算：#595959 on #f0f0f0=6.15:1 → **on #f8f8f8=6.60:1**；#404040 on #f0f0f0=9.10:1 → **on #f8f8f8=9.76:1**；#b3b3b3 on #161616=8.63:1（不变） | **收口（算术层）**：全部仍过 AA，方向不变；落地前复测的必要性下降。报告底色输入按 CDP 修正为 #f8f8f8/#161616，AA 值按本轮实算采用 | 是 |
| surface-11 N4 | D1 重开的活体观感（k1n 标签 14px 手感、hover=active 同底） | CDP 未覆盖观感项：本轮 item1b 打开了设置页但未量 k1n 字号、未做 hover 手感 | **维持 needs-live**。k1n 标签 14px 静态证据已立（surface-11 复核 D1），手感/观感须人工 | 否 |

## surface-12（频道/定时）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-12 N1 | cron 图标 lucide 身份 | **静态破案**（surface-12 复核员实抽 `clock-CqmtoUnU.js` 185B 实读：`M12 6v6l4 2` + icon 名 `clock`） | **收口：lucide Clock**。非 CalendarClock/Timer；M4 直接落 ZIconClock，无需活体（本轮未复跑，按复核记录采信） | 是 |
| surface-12 N2 | ZCode 分组头单击行为 | **静态破案**（surface-12 复核员实读 `YI` = `data-slot:"context-menu-trigger"` 右键触发器；头 div 自身 `onClick` 切折叠、带 aria-expanded） | **收口：左键=折叠/展开，右键=组菜单**。M2 按「点击切换」语义落地，无需活体（本轮未复跑，按复核记录采信） | 是 |
| surface-12 N3 | kbt 计数药丸在 DSH 侧栏底的观感/AA | CDP 未覆盖（DSH 侧）。静态输入已备：`bg-tag/50` 亮 `#e5e5e580`（surface-12 复核实读） | **维持 needs-live**。DSH 两种主题底的重取+观感须 9223，与 surface-9 N2/N3 同批 | 否 |

## surface-13（composer/焦点/码块）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-13 C-1 | 全局面板打开时取消会话选中（batch-16） | CDP 未覆盖：未做该交互 | **维持 needs-live**。静态只能证「源码无此路径」，行为判定须双端 CDP | 否 |
| surface-13 C-2（batch-7 E3） | rail 内滚动清波 | **CDP 裁决**（cdp-summary item3 + 本轮核对 cdp-asar-rail.json 佐证）：源码铁证 `styles-Dv5E6Odo.js` @4420046 `onPointerLeave:()=>d(void 0), onScroll:()=>d(void 0)`——同一清除函数双挂；rail scroller 类串与活体 DOM 逐字一致。活体滚动观察**未执行**：conversation 容器宽 509px < 864px 门控（`$ut` @4448891），轮次点不渲染，rail opacity-0；收起面板/改窗口属写状态，违反只读铁律未做 | **机制收口：E3「ZCode rail 滚动时主动清波」= 真（源码级）**；活体行为观察受布局门控搁置，插件对拍时以源码语义（scroll 即清 hover）为依据即可 | 部分（机制=是；行为对拍=否） |
| surface-13 C-3 | ⌘K 内层 padding | CDP 未覆盖：本轮用 ⌘K 开了设置页但未量 ⌘K 面板自身 padding | **维持 needs-live** | 否 |
| surface-13 C-4 | 浅色主题逐项目检 | **CDP 数据面覆盖**（cdp-item1-theme.json 矩阵 + item1b，本轮亲手解析）：浅色 sidebar #f0f0f0 / bg #f8f8f8 / fg oklch(26.9% 0 0) / menu-hover #f0f0f0 / destructive #e03131 / tooltip 三件套 #f0f0f0·#0d0d0d·#e6e6e6；设置页浅底 #f8f8f8、卡 #fff。观感目检未做 | **部分收口**：浅色令牌/表面真值已活体建档，可直接供各项目取数；「逐项目检（观感）」仍须人过一遍 | 部分 |
| surface-13 C-5 | 码块 pre 内边距 | **CDP 实测**（cdp-summary item2 + cdp-item2-codeblock.json/cdp-item2-pre.json，本轮亲手解析）：`querySelectorAll('pre')` 全程 **0**——本构建码块无 `<pre>`；实测：壳 `rounded-xl my-4 bg-card` padding 0/0/0/0、margin 16/0/16/0、radius 12px、border 1px rgba(255,255,255,.1)；头部条 padding **8/8/8/12**（上/右/下/左）；码块体包 `p-2 pt-0 pb-3` = **上0/右8/下12/左8**；行容器 padding 0（行内另有 padding-inline:1ch≈7px，静态 pierre-style.js@30534） | **收口：码块体包内边距 = 0/8/12/8（上/右/下/左）+ 壳 margin 上下 16px**。旧批次 '8/8/0/12' 与文档 '6px 8px 12px' 均与现版不符（surface-10 D2 翻案 + 本轮活体补证互洽）；「pre 内边距」在本构建以码块体包形式存在 | 是 |

## surface-14（焦点色）

| where | item | 实测值 | 结论 | 是否 mechanical |
|---|---|---|---|---|
| surface-14 #9 zcode-theme.ts:310/353 | 控件级焦点 ring 档位（插件 #0b7fff/#4099ff 有无 ZCode 依据） | **CDP 实测**（cdp-summary item5 + cdp-item4d-5d.json CSSOM 全枚举，本轮亲手解析）：Tab 27 个落点 outlineStyle/boxShadow 全 none、无环实体；:focus-visible 规则 49 条中 ring 色全枚举 = `ring-brand/40` #00bcfe66、`ring-destructive/20` #e4001433、`ring-foreground/50` #40404080、`ring-border-hover`→var(--color-border-hover)、`ring-[var(--color-input-border-focused)]`；root dump `--color-input-border-focused`=#ffffff26（深）、`--color-ring` 未定义（消费即无效）；**无任何一条含 #0b7fff/#4099ff** | **部分收口**：会话视图控件级实测「聚焦不画可见环」+ 全部 ring 档位无一蓝色——插件 `--dcu-focus:#0b7fff/#4099ff` 与 `--dsw-focus-ring-color` 在 ZCode 无对应消费点，蓝焦点环无依据（定性定案）。残留：composer 输入框聚焦态（Tab 16 步未触达）的边框变色真值未补采，若要 1:1 对齐输入框聚焦观感需补一次 | 部分 |

---

## 复现命令（本轮实跑）

```bash
# ① CDP 主题矩阵里的 destructive / bg / menu-hover（本轮亲手解析）
python3 - <<'PY'   # 解析 cdp-/cdp-item1-theme.json 的 matrix 四组 vars
# → html-light: destructive #e03131 / bg #f8f8f8 / sidebar #f0f0f0 / menu-hover #f0f0f0
# → html-dark:  destructive #ff5c5c / bg #161616 / menu-hover #363636
# → body 挂载两组均回落基座 oklch(63.7% .237 25.331) 等
PY
# ② root 活体 dump 关键 token
python3 -c "import json;d=json.load(open('/tmp/zcode-root-vars.json'));print({k:d[k] for k in d if k in ('--color-destructive','--color-input-border-focused','--color-brand','--radius-md','--radius-lg','--radius-xl')})"
# ③ 码块壳/头部实测（本轮亲手解析 cdp-/cdp-item2-codeblock.json 首两个 DIV 节点）
# ④ 焦点 ring 全枚举（grep cdp-/cdp-item4d-5d.json 的 focus-visible 规则段）
# ⑤ 插件令牌静态实读
grep -n "dsw-radius-md\|dsw-radius-xl\|alias-brand-primary\|alias-label-primary-foreground" \
  "/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui/src/client/zcode-tokens.ts"
# ⑥ AA 实算（python3 WCAG，本轮实跑）
#    #595959/#f8f8f8=6.60  #404040/#f8f8f8=9.76  #b3b3b3/#161616=8.63
```

**给下一轮的三句话**：① 9 条已收口的值（12px、6px、21px、#e03131/#ff5c5c、Clock、左键折叠/右键菜单、E3 机制、设置页 AA 底色修正、码块体包 0/8/12/8）可直接进落码清单；② 6 条部分裁决的 ZCode 侧真值已定，残留全在 DSH 插件侧（9223）或观感层；③ 其余 23 条维持 needs-live，其中大部分依赖 9223 插件实例或「先落地后验收」，本轮 9224 未注入插件，属结构性覆盖不了，不是漏采。
