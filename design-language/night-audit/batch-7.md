# 批次 7 · turn-rail-zcode.ts / session-move.ts / shared-now.ts / footer-actions.ts / session-navigation.ts

> 2026-10-29 夜间审计（批次 7/20，只读，不改 src/tests/既有文档）。
> 参照文档：`03-turn-navigator.md`（轮次导航全状态矩阵，主参照）、`02-motion.md`（动效档与滚动）、`03b-sidebar.md`（侧栏页脚语境）、`03n-typography.md`（时间戳排版语境）；`04-open-gaps.md` 仅按关键词 grep（G1/G3/G5 收口记录见 `:75`、`:1805-1818`）。
> 本批 asar 提取命令（均为本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o -m 2 -- '--ease-out:cubic-bezier(0, 0, .2, 1)' $A` → `--ease-out:cubic-bezier(0, 0, .2, 1)`
> - `grep -a -o -m 2 'aria-posinset' $A` / `'aria-setsize'` / `'"aria-busy"'` → 均命中
> - `grep -a -o -m 3 -- '"auto":"smooth"' $A` → 命中（即 02-motion §2 所记 `c?'auto':'smooth'` 的压缩形态）；`'behavior:"smooth"'` 亦命中
> - `grep -a -o -m 3 'scrollToIndex' $A` → 命中
> - `grep -a -c '洞察' $A` → **0**（ZCode 无「洞察」条目）
> - `grep -a -o -m 4 '"taskGroup\.move[A-Za-z]*":`+backtick+`[^`]*`' $A` → `taskGroup.moveToGroup`=`移动到分组`、`taskGroup.moveToTop`=`移动到顶部`、`taskGroup.move`=`移到分组`
> - 波值三元组（`2.6…1.7…1.25`、`.86…\.72` 相邻等 6 种模式）与 `JXrxFq_preview` 在 asar 均 **0 命中**（压缩形态未知/运行时 hash 类名）→ 波值与浮层几何引用文档记录（03 A1、02 §1「源码 Vst」、03 C1/C5 活体 CDP），不引 asar。
> 消费侧旁证（只读）：`CodexSidebar.tsx:483-501`（刻度几何 + 三属性过渡）、`scroll-anim.ts`（点击滚动实现，批次 18 模块，本批只验其入口分支）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| turn-rail-zcode.ts | rail 内部滚动时的 hover 波处置 | scroll 监听只**重放**当前 hover（`turn-rail-zcode.ts:171` `applyHover(rail, activeIndex)`，同值早退 → 波保留）；仅 `pointerleave`（`:175-177`）清波 | rail `onScroll` **清 interaction**——滚动时 hover 波立即归位 | `03-turn-navigator.md` E3 行（ZCode 规格「rail onScroll 清 interaction」，DSH 现状「pointerleave 清；rail 滚动场景未单测 ❓」）；代码行如上。**未验证**：矩阵标 ❓，本轮无活体条件，未复测 | 先活体复测（rail 内滚轮/拖 scroller 时波是否残留）；确认残留后在 `:171` 分支改清 hover，或写明豁免理由 |

> 注：C4 浮层时延（ZCode open 120ms / close 80ms vs 宿主 ~200ms）属**宿主预览框自带行为**，本模块只做垂直补偿（`:260-295`），不持有该决策点，不入 diffs；D2 焦点环（G2）CSS 在主题层（批次 8 范围）。

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| turn-rail-zcode.ts | hover 四档波查表 | `WAVE = [[2.6,1,true],[1.7,0.86,false],[1.25,0.72,false]]`（`:36-40`），静息 `IDLE_OPACITY='0.58'`（`:27`），即 scaleX 2.6/1.7/1.25/1 × opacity 1/.86/.72/.58 | `03-turn-navigator.md` A1（✅）；`02-motion.md` §1「源码 Vst」 |
| turn-rail-zcode.ts | d0 全前景色 | hover 距离 0 时 `--dcu-zcode-color` = `var(--dsw-alias-label-primary)`（`:80-81`），d1/d2/静息走 CSS 兜底 `--dsw-alias-label-dimmed`（CodexSidebar.tsx:496） | `03-turn-navigator.md` A2（focus tone → bg-foreground） |
| turn-rail-zcode.ts | 静息当前条 .9 强调且仅非 hover 生效 | `ACTIVE_OPACITY='0.9'`（`:42`），生效条件 `hoverIndex===null && isActive`（`:74-76`） | `03-turn-navigator.md` A3；`02-motion.md` §5「.9 强调只在非 hover 时生效，hover 波整体覆盖」 |
| turn-rail-zcode.ts | 过渡时长/曲线/三属性 | `DURATION='0.15s'` + `TAILWIND_EASE_OUT='cubic-bezier(0, 0, 0.2, 1)'`（`:25-26`）；消费侧 `transition:transform/opacity/background-color .15s cubic-bezier(0,0,.2,1)`（CodexSidebar.tsx:501） | `03-turn-navigator.md` A5；`02-motion.md` §1（三件缺一不可）；asar 本轮提取 `--ease-out:cubic-bezier(0, 0, .2, 1)` |
| turn-rail-zcode.ts | 刻度几何与基宽 | `ITEM_HEIGHT=10`（`:24`，pitch）；`zcodeTickWidth(d)=12×scale`（`:432-435`）；消费侧 width:12px / height:2px / radius-full / origin `0 50%`（CodexSidebar.tsx:483-486） | `03-turn-navigator.md` A4（12×2px、pitch 10px、origin-left、pill） |
| turn-rail-zcode.ts | 点击平滑滚动 + reduced-motion 瞬跳 | `installClickSmooth`（`:339-392`）capture 拦截后 `animateScroll`；`animateScroll` 入口 `matchMedia('(prefers-reduced-motion: reduce)')` 命中即直接赋值 scrollTop、不排 rAF（scroll-anim.ts:97-100） | `03-turn-navigator.md` B1/B2（G1 已收口，04-open-gaps.md:1814）；`02-motion.md` §2「`c?'auto':'smooth'`」；asar 本轮提取 `"auto":"smooth"` |
| turn-rail-zcode.ts | 浮层顶对齐（topDelta 0） | `--dcu-preview-top` = 被 hover 刻度 top − rail top，`--dcu-preview-shift` 恒 `'0px'`（`:290-294`），不做垂直居中补偿 | `03-turn-navigator.md` C1（320px、topDelta 0、✅） |
| turn-rail-zcode.ts | aria 次级属性 | 每条刻度 `aria-posinset`=第几条 / `aria-setsize`=共几条；有未加载刻度时 nav `aria-busy='true'`（`:128-143`，近似口径见模块 `:120-127` 注） | `03-turn-navigator.md` D3/D4（G5 已收口，04-open-gaps.md:1818）；asar 本轮提取 aria-posinset/aria-setsize/"aria-busy" 均存在 |
| turn-rail-zcode.ts | 当前条跟滚 align:'auto' 语义 | `keepActiveVisible`：完全可见不动，越界多少补多少、不居中，只滚 rail 内部 scroller（`:206-228`） | `03-turn-navigator.md` E1（`scrollToIndex(active, align:'auto')`；G3 已收口，04-open-gaps.md:1815-1816）；asar `scrollToIndex` 存在 |

## 无参照项（不得猜）

- turn-rail-zcode.ts:323 `CLICK_FEEDBACK_MS=260`（点击峰值反馈停留时长，`flashClickedTick` `:325-337`）—— 峰值取值（scale 2.6 / opacity 1 / 全前景）是 ZCode d0 波峰、已进一致项；但「点击后停留 260ms 再交还」这一补偿本身是 DSH 侧方案（`02-motion.md` §3 把它记为宿主挂载延迟的补偿，「待实施」时无 ZCode 数值可引），260ms 档无 ZCode 例证，跳过。
- session-move.ts 全模块 —— 无颜色/圆角/动效/文案决策点（错误码→i18n 键映射 `:30-40`、30s 超时 `:83`、`move-session:` action 前缀 `:54` 均为行为）。ZCode 有「移动到分组」右键入口（asar 本轮提取 `taskGroup.moveToGroup`=`移动到分组`），但其确认弹窗/错误文案的几何与措辞未采集；可见文案在 locales.ts:188-199（批次 4 已覆盖术语系）。跳过。
- shared-now.ts:3 `SHARED_NOW_INTERVAL_MS=60_000` + 整分对齐（`:6-9`）—— 相对时间刷新档位在 ZCode 侧无任何可提取证据（asar 无法定位刷新节奏；03n E2 只记录时间戳排版 12px/30%，非刷新节奏），跳过。
- footer-actions.ts:2-4 `CONTEXT_OVERVIEW_FOOTER_ID` 页脚隐藏规则 —— asar「洞察」0 命中，ZCode 侧栏页脚无对应条目（其页脚为 记忆/任务/归档，见 `03b-sidebar.md` §7 逐帧采样），该隐藏为插件自有槽位裁决，无 ZCode 参照，跳过。
- session-navigation.ts 全模块 —— `uiWorkspace.openSession`/`sessions.open` 分支与 `selectPanel(null)` 时序（`:4-30`）是 DSH 宿主 API 行为，无视觉决策点；ZCode 无对应物可查（⌘K 面板的开关动效属 `03i-command-palette.md`，本模块不触及），跳过。
