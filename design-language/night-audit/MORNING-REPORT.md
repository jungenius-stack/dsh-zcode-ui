# 夜间审计晨会报告（MORNING-REPORT）

> 生成：2026-10-30。**第 4 版**——按独立审读意见修订：① #9「仅 1 处」与 5.8「两处 1.6」的 grep 口径调和（实测两种书写形态各 1 处、合计 2 处，附 2.5）；② 当日可清分类修正（无裁决依赖 10→**14 条**，#15/#16/#19/#20 纳入并写明逐条理由，第 3 版对 #16/#19/#20 的归类系错误）；③ **#5 的 #f5f5f5 色值注释子项与 5.3 系同一物**（sidebar-width.ts:283 注释点名 `--dcu-sidebar-background`，附 2.7），挂「5.3 后落笔」标签；④ 覆盖面「全集」的 flatness 前提补证（附 2.6）；⑤ 5.9/5.13 补实值；⑥ §2「复核通过」指标改名防误读；⑦ 新增 5.3 活体重采操作指引与 tests/ 清单（附 3）。第 3 版的独立复读与核验继续有效（附 2 第 1–4 项）。
> 依据：本目录 `batch-1.md` … `batch-20.md` 共 20 份 + `README.md` 格式约定（审计窗口 2026-10-29 23:00 → 09:00）。**本版取代第 3 版（第 3 版取代第 2 版，第 2 版取代此前的 6/20 中断版）**。
> 证据口径：batch 引文（如 `batch-4:22`）的行号已经第 3 版会话逐份复读校验；标注「本会话实跑」的检查分两批——附 2 第 1–4 项为第 3 版会话所跑，第 5–8 项为第 4 版会话所跑。未重跑各批 asar/CDP 提取——各批证据仍以其自录命令为准。

---

## 1. 一句话结论

20/20 批全部完成：96 个模块对出 **107 条有证据差异**（逐批行数见 2.1，同源合并后净 **104**，口径见 2.1 末）；第 3 节按成本/收益列 20 条可动手清单——**14 条无裁决依赖、可当日整条清**（#1-4、#6、#8、#11、#12、#14-16、#18-20，逐条理由见第 3 节依赖声明），#5 与 #10 各含一项待裁子项（主体可先做，见 5.0）、#7 与 5.3 连动（可先做、裁决后复查）、#9 执行前先过 5.8、#13/#17 为二选一拍板项；**154 条一致项仍只是断言候选、0 条已固化为回归测试**（核验方式见第 4 节）；动手前必须先过第 5 节裁决——尤其浅色主题双源冲突（5.3 阻塞 batch-8 前三行 **外加清单 #5 的色值注释子项**，活体重采操作指引见 5.3 内嵌块）与运行中 spinner 尺寸的批次间证据互斥（5.1）；所有活体行为类结论在补 CDP 复测前不得视为已验证。

---

## 2. 覆盖情况

| 指标 | 值 | 出处 |
|---|---|---|
| 完成批次数 | **20 / 20**（每批均含「差异项（有证据）」与「无参照项」结构） | batch-1…batch-20 |
| 覆盖模块数 | **96** | 逐批清点标题与正文模块清单：1,1,1,3,3,5,5,5,5,5,5,5,7,7,6,6,7,7,6,6 —— 与下发汇总逐批一致；且与 `uiplug/src/client` 下 96 个 .ts/.tsx 全集 `comm` **双向差集为空、清单无重复**（本会话实跑，见附 2）→ 无遗漏、无重复点名。「全集」前提已补证：递归 find（不限层级）同为 96 个文件、`src/client` 下子目录数为 0（附 2.6） |
| 差异条数（=各批「差异项（有证据）」表行数之和；**本报告复核的是行数与加总，未重跑各批 asar/CDP 证据提取**——卷首证据口径） | **107**（毛数，逐批见 2.1；净数口径见 2.1 末） | 2.1 表 + 附 2.1 |
| 一致项（回归断言候选） | **154**（逐批见 2.1；跨批重复三组，去重下界 148，见第 4 节） | 2.1 表 |
| 无参照项 | 100（每批恰 5 条） | 各批「无参照项（不得猜）」节 |
| 已固化为回归断言 | **0** | 核验方式见第 4 节 |

### 2.1 逐批清点（107 与 154 均可从此表复算；本会话 awk 机械计数与下表逐格一致，见附 2）

| 批次 | 差异项行数（表行区间） | 一致项行数（表行区间） |
|---|---|---|
| 1 | 4（batch-1:13-16） | 10（batch-1:22-31） |
| 2 | 7（batch-2:13-19） | 0（无一致项节） |
| 3 | 5（batch-3:9-13） | 4（batch-3:25-28「附」） |
| 4 | 12（batch-4:22-33） | 8（batch-4:39-46） |
| 5 | 7（batch-5:29-35） | 10（batch-5:41-50） |
| 6 | 3（batch-6:27-29） | 8（batch-6:35-42） |
| 7 | 1（batch-7:19） | 9（batch-7:27-35） |
| 8 | 8（batch-8:24-31） | 10（batch-8:37-46） |
| 9 | 3（batch-9:17-19） | 10（batch-9:25-34） |
| 10 | 12（batch-10:20-31） | 10（batch-10:37-46） |
| 11 | 3（batch-11:16-18） | 5（batch-11:24-28） |
| 12 | 5（batch-12:19-23） | 10（batch-12:29-38） |
| 13 | 1（batch-13:19） | 4（batch-13:25-28） |
| 14 | 8（batch-14:15-22） | 10（batch-14:28-37） |
| 15 | 5（batch-15:12-16） | 7（batch-15:22-28） |
| 16 | 5（batch-16:16-20） | 4（batch-16:26-29） |
| 17 | 4（batch-17:16-19） | 10（batch-17:25-34） |
| 18 | 6（batch-18:10-15） | 10（batch-18:21-30） |
| 19 | 4（batch-19:21-24） | 6（batch-19:30-35） |
| 20 | 4（batch-20:21-24） | 9（batch-20:30-38） |
| **合计** | **107** | **154** |

与下发汇总（103）差 4：批次 5 / 8 / 19 / 20 各 +1（汇总记 6 / 7 / 3 / 3），其余 16 批一致。

**净数口径**：107 − 1（locales.ts:134 双记，batch-4:22 + batch-11:17 同键）− 1（G18 过渡双记，batch-9:17 + batch-20:21 同一 CSS 修点）− 1（spinner 尺寸双记，batch-1:14 + batch-19:21 同一元素）= **104**；其中 spinner 组的合并以 5.1 裁决确认「同源」为前提——若判为两个独立问题则净数 105。107 是**未去重的毛数**，直接引用时请说明口径。

**「下发汇总」的载体**：指随本次汇总任务下达的 20 行四列数据（批次/模块数/复核差异/断言），以任务文本为载体，**非盘上文件**；本会话未获其文件路径，对账请以任务原文为准。

**同源重复 2 组（修一处即消两条）**：① `locales.ts:134`（见上）；② G18（见上，batch-20:21 自注「CSS 修点在批次 9 文件，供汇总去重」）。另有 1 组**批次间证据互斥**（spinner 尺寸），见 5.1。

**局部覆盖缺口**：`batch-2.md:5` 明示 CodexSidebar.tsx 内嵌 composer 规则块仅抽查 7 项（C6/C7/C9/E-1/E-4/E-5/E-6），未逐条对账；**13 个批次**对 `04-open-gaps.md` 仅按关键词 grep、未整读（batch-2/3/6/7/9/10/12/13/14/15/17/19/20 头注）——已裁决偏离的检索依赖关键词命中，存在漏检（batch-12:21 已实际出现一例：iframe 偏离在 04/design-language/uiplug/docs 三处登记全缺）。

---

## 3. 差异清单（按改动成本/收益排序，20 条）

排序为编制者判断（成本档：一行文案/单值令牌 < 单组件多点 CSS < 结构级；收益档：高频可见 > 低频正确性 > 防回归），非文件自带排序。

**成本分类账（1–12 条）**：一行文案 2 条（#1、#2，共 5 行）；单值令牌/CSS 6 条（#3、#4、#7、#8、#9、#11）；时长/兜底+注释清理 2 条（#5、#6）；单组件多点 CSS 2 条（#10、#12）。**注意 #5/#6/#10/#12 非一行级改动**。13–20 条的成本档：#14/#15/#16/#18 为单值级小改，#19/#20 为纯注释一行改，#13/#17 为二选一（自带默认方向）。

**依赖声明（全部 20 条，第 4 版修正）**：
- **无裁决依赖、可当日整条清，14 条**：#1、#2、#3、#4、#6、#8、#11、#12（以上 8 条第 3 版已列）、**#14**（证据 asar `Lln` 开关组件串，batch-18:10-11；仅需同步既有断言，无拍板点）、**#15**（证据 03 A3 + 02 §5 + 宿主波侧已实现同款 `ACTIVE_OPACITY='0.9'`，batch-14:16 + batch-7:29）、**#16**（04 TR2 已定案 + 无消费点零风险，batch-5:31 + 第 4 节检查④）、**#18**（batch-19:24，bak 文件佐证旧值出处）、**#19/#20**（纯注释一行改，batch-19:23 / batch-20:23；#19 带「改注释 ≠ 5.1 两条闭环」备注，见 #19 行）。第 3 版把 #16/#19/#20 归入「其余 8 条高成本或需拍板」**无依据，系分类错误**，本版更正；#15 同此更正。
- **含待裁子项，主体可先做，2 条**：**#5**（200ms 兜底与「240」→264 注释无依赖；**:283 色值注释与 5.3 同物，缓办**，见 #5 行动列）、**#10**（六项均无依赖；但 batch-10:21 的「悬停底色」行未入本条——浅色 neutral-200 vs 黑 5% 需裁决，建议并入 5.3 浅色族采样，见 5.0）。
- **有依赖/需拍板，4 条**：**#7**（连动 5.3，可先做、裁决后复查）、**#9**（前置 5.8）、**#13/#17**（二选一拍板，自带默认方向）。
与裁决的完整映射见 5.0。

| # | 模块（位置） | 现状 | ZCode 值 | 证据 | 建议动作 |
|---|---|---|---|---|---|
| 1 | locales.ts:134 | 「展开显示」 | 「显示更多」 | batch-4:22（asar `taskList.showMore`/`project.showMore` 逐字）、batch-11:17（EN 两侧已同） | 一行改「显示更多」（batch-11 判：一行修复） |
| 2 | locales.ts:171 / :117 / :146 / :125 | 「等待审批」「置顶」「移除项目」「移至未分组」 | 「等待确认」「已置顶」「删除项目」「移出分组」 | batch-4:25,26,28,29（asar 四键复现） | 四处一行改（这四键与「会话→任务」术语系无涉，不依赖裁决 2；术语系另见 5.2） |
| 3 | ConnectorsSection.tsx:25 | 连接器 h2 无 font-weight → UA 700 | 标题一律 600 | batch-12:20（grep 实证全仓仅 2 处 h2 规则且均不覆盖 `.dcu-connectors`；03n A7） | 补 `font-weight:600` |
| 4 | zcode-theme.ts:81 | `--dcu-tip-hover` **深色** 白 6% | 白 5%（`--color-hover:#ffffff0d`） | batch-8:27（asar；本仓 `--dcu-sidebar-hover` 深色已是 .05，:339） | `.06`→`.05`（深色档，与 5.3 浅色裁决无涉） |
| 5 | sidebar-width.ts:454-459 / :283 / :347,:445 | 兜底 180ms；注释 #f0f0f0、「240」 | 200ms；#f5f5f5、264 | batch-3:10,12,13 | 兜底改 200ms + 「240」→264 注释清理，连同 :662/752/758 旧档叙事一并清理（不动逻辑）——**以上无依赖、当日可做**；**:283 的色值注释纠偏（#f0f0f0→#f5f5f5）与 5.3 是同一物**（:283 注释原文点名 `--dcu-sidebar-background`，即 5.3 互斥的侧栏底色令牌；本会话 sed 实读，附 2.7）——**挂「5.3 裁决后落笔」标签，裁决前勿改**（与 #7 同等待遇） |
| 6 | conversation-layout.ts:196 | 用户气泡折叠过渡走 move 档（10-29 拆档后=200ms） | max-height **300ms ease-out** | batch-9:17、batch-20:21（03c C2-2 + 02-motion 拆档校正表；10-28 判 ✅ 时 move 还是 300ms，拆档后回归） | 改专属 300ms ease-out（注意 `--dcu-motion-collapse-*` 曲线 (.4,0,.2,1) ≠ O4t 的 ease-out，不能直接换），同步更正 conversation-layout.ts:187 与 user-bubble-collapse.ts:6 两处旧注释（改值+2 注释） |
| 7 | settings-page-styles.ts:49 | 浅色**设置卡**兜底 #fbfbfb | 仓内 TA4 真值 #fafafa（ZCode 浅色卡本身未实测，03g:35 明注推定） | batch-17:16（:30-33 自纪律「回退值必须与 zcode-theme.ts 真值一致」+ zcode-theme.ts:308） | 兜底改 #fafafa，与 TA4 同步——**与 5.3 连动而非被其阻塞**：本条修的是「设置卡 fill」对齐仓内现值（zcode-theme.ts:308），5.3 复查的是「设置页底」（zcode-theme.ts:307）250 vs 248，两者是不同令牌；若 5.3 推翻 TA4 的 250 判定，本兜底须同批复查 |
| 8 | settings-page-styles.ts:61,:134 + AboutSection.tsx:41 | outline-offset:3px ×3 处 | 主流 2px（asar 3px 全文 0 例、2px 11 例） | batch-17:17 | 三处统一 2px |
| 9 | CodexSettingsPage.tsx:235 | 设置导航图标 strokeWidth 1.6 | 1.5 | batch-13:19（四源：tests 注释 + 02-motion CDP + 仓库惯例 + asar 1.6 仅 recharts）。**口径说明**：batch-13 的「全仓 grep `strokeWidth={1.6}` 仅此 1 处」指 **JSX 形态**；另一处 1.6 为对象字面量形态 `strokeWidth: 1.6`（settings-page-registration.ts:131，batch-16:18）——两种形态合计 **2 处**，本会话双形态 grep 复核（附 2.5） | 归一 1.5——**执行前先过 5.8**：batch-16:18 有反向证据（ZCode 设置入口图标走 lucide 默认 2），两处 1.6 的目标档须一并定，勿分别修 |
| 10 | DesktopNavigationControls.tsx:6-9,23 | 圆角 50%、禁用 opacity .35、gap 8px、图标 60% 前景、无过渡、EN `Back`/`Forward` | rounded-lg 8px、.50、gap-1=4px、全前景、`transition-colors`、`Go back`/`Go forward` | batch-10:20,22,23,24,25,29（asar 逐条命中） | 一个组件内一揽子**六项**小改（工作量按 6 处算，非一行）。**注意**：batch-10:21 的「悬停底色」行未入本条——浅色 neutral-200 vs 黑 5% 需裁决（batch-10:21 原文），建议并入 5.3 的浅色族采样一并裁决（见 5.0）；本条六项均无裁决依赖 |
| 11 | workspace-drop-indicator.ts:61-62 | 拖拽落点线 #000/#fff 随主题翻转 | `bg-icon-blue` = terminal-bright-blue = sky-500 蓝 | batch-10:30（asar 直提 oklch 值） | 改蓝色系（可用 DSH 蓝 accent 令牌） |
| 12 | composer-tool-menus.ts:6,25,47 | 菜单项 hover 手写 10% color-mix、字号 13px、28px / 4·8 | hover 实色 #f0f0f0/#363636、14px、32px / `0 10px` | batch-15:12,14,15（tokens.json CDP + 03b:40-41 #13/#14） | hover 改接 `--dsw-specific-menu-item-hover`（映射层已有，删手写 color-mix）、字号回 14、高距对齐（**三处**改动） |
| 13 | conversation-header.ts:57-59 | 标题旁自绘钮 16×20 / 20×20 / radius-sm | 28×28 / radius 8px | batch-12:19（03e:27-29,40 H11；源码与 04 均无这两钮的尺寸决策记录） | 提到 28×28 + `var(--dsw-radius-lg)`；若刻意保持小型须补注释（现无任何记录）——二选一，默认前者 |
| 14 | settings-page-styles.ts:128 | 开关 thumb 16×16、过渡 150ms | thumb 14px（size-3.5）、`transition-all duration-200` | batch-18:10,11（asar `Lln` 开关组件串） | thumb 16→14、行程 translateX 16→18px（轨 36 − 内衬 4 − thumb 14）、该组件过渡改 200ms（勿动全局 150ms 档），同步既有断言 |
| 15 | TurnNavigator.tsx:63-64 | 静息当前条 opacity 0.58（`_isCurrent` 带下划线未用） | 静息当前条 op .9 + 全前景 | batch-14:16（03 A3 + 02 §5；宿主波侧已实现 `ACTIVE_OPACITY='0.9'`，batch-7:29） | 静息分支改 `isCurrent ? 0.9 : 0.58`；顺手删 :38 的 **5px×1px** 死分支（batch-14:16：该 fallback 被行内 `--dcu-tick-w/h` 恒覆盖，属死代码） |
| 16 | zcode-tokens.ts:146 | 浅色 selected 黑 8% | 黑 5%（`--color-selected:#0d0d0d0d`；04 TR2 已定案） | batch-5:31；**本会话实跑** `grep -rn "dsw-alias-interactive-bg-active" <仓库根>/src` → 仅 zcode-tokens.ts:146（浅 0.08）/ :377（深 0.1）两处定义，无消费点（检查 ④，见第 4 节） | 0.08→0.05；「无消费点」由上轮批次断言 + 本会话 grep 双重支撑，改动零风险 |
| 17 | zcode-tokens.ts:245 | toast 浅色 #2b2b2b（暗底白字） | #fff（hex 套与 :root 套两套一致；dark #2b2b2b 两侧同值） | batch-5:29 | 改 #fff（默认方向），或声明「插件 toast 恒暗底」为刻意偏离——二选一 |
| 18 | composer-visuals.ts:23 | 回退字面量 `120ms` / `ease-out` | 微交互 150ms / cubic-bezier(.4,0,.2,1) | batch-19:24（bak 文件 :124 为 10-29 改档前旧值出处；正常时令牌生效，主题层缺失/时序竞争时吃到旧档） | 回退值改 150ms / (.4,0,.2,1)，并在断言里锁回退值 |
| 19 | zcode-icons.tsx:52 | 注释称 ZCode 侧栏 loader 用 `text-foreground-subtlest` | 任务行 loader = `text-foreground-subtle`（60%）；subtlest 仅 size-3 tab/导航分组小组件 | batch-19:23（asar 分档提取：subtle 多处含任务行 size-4；subtlest 仅 2 处） | 注释改分档写法并指向 ZCODE-DESIGN.md:181。**注**：该注释是 batch-19 两条 loader 差异（:21 尺寸、:22 颜色档）的消费方取值依据；尺寸条冻结于 5.1、颜色档条未入本清单——**改注释不等于两条闭环** |
| 20 | zcode-tokens.ts:117 | 注释称 ZCode `--color-brand` = 中性黑 #000000 | `--color-primary` 确为中性黑 ✅；`--color-brand` 浅色实为蓝 oklch(74.6% .16 232.661) ≈ rgb(0,188,255)、dark #fff | batch-20:23（tokens.json 实查 + oklch 换算脚本） | 更正来源注释（映射值本身成立，失实的是声明），防下轮对账再被误导 |

**未入榜但值得知道**：归档确认形态（batch-11:16，批次自称「修复价值最高（交互形态级差异）」，但成本高且需先过 5.4）；user-bubble-collapse 全局观察器补侧栏动画期跳过守卫（batch-20:24，与 08 §3 修法同构，性能占比未活体验证）；TurnNavigator 自绘浮层形态/时延/容器宽/层级四件（batch-14:18-22，多需设计拍板）；「会话→任务」术语系全局统一（batch-4:23-24 + batch-6:27，需 5.2 术语裁决表）。

---

## 4. 已加固成回归断言的条目数

**0。** 口径与核验方式：

1. **通读 20 份 batch 文件**：各批「一致项」表头均为「回归加固建议 / 已对齐项」，无一批自称已写入测试文件；154 条候选逐批行数见 2.1 表（可复算）。batch-18:10「同步既有断言」、batch-13:19 引用既有 `tests/settings-integration.assert.ts` 均为既有测试，非本夜新增。
2. **下发汇总** 20 批「断言」列全为 0（载体说明见 2.1 末）。
3. **本会话实跑补充核验**（第 3 版会话重跑，输出与第 2 版一致；插件仓库根 = `/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui`，`优化UI插件区/uiplug` 为指向它的符号链接，`ls -la` 确认）：
   - ① `git -C "$R" status --porcelain | wc -l` → **0**（工作区干净，src/tests 均无未提交改动——同时印证各批「只读不改代码」纪律截至检查时点的落地状态）
   - ② `git -C "$R" log --oneline --since="2026-10-29 22:00"` → 空（窗口起无任何提交）
   - ③ `find "$R/tests" -type f -newermt "2026-10-29 23:00"` → 空（审计窗口起 tests/ 无文件变动）
   - ④ `grep -rn "dsw-alias-interactive-bg-active" "$R/src"` → 仅 `src/client/zcode-tokens.ts:146`（浅 0.08）与 `:377`（深 0.1）两处定义，无消费点（支撑清单 #16）
   - ⑤ **源码抽查**（第 3 版会话实跑，只读 sed/grep，证第 3 节头部条目截至本报告时点**均未修**）：`locales.ts` :134「展开显示」、:117「置顶」、:125「移至未分组」、:146「移除项目」、:171「等待审批」；`ConnectorsSection.tsx:25` h2 无 font-weight；`settings-page-styles.ts` :49 `#fbfbfb`、:61 `outline-offset:3px`；`zcode-tokens.ts` :146 `rgba(13,13,13,0.08)`、:245 toast `#2b2b2b`；`conversation-layout.ts:196` 折叠过渡仍挂 move 档；`CodexSettingsPage.tsx:235` `strokeWidth={1.6}`；`sidebar-width.ts:13` `CODEX_SIDEBAR_MIN_PX=200`、:454-459 兜底 180ms；`composer-visuals.ts:22` 回退 `120ms`（batch-19:24 记 ：23，±1 行漂移）；`CodexWorkspaceBrowser.tsx:316` loader `width:14px;height:14px` + `session-tree.tsx:174` `size={14}`（5.1 互斥的实物在案）；`conversation-layout.ts:185` 与 `user-bubble-collapse.ts:6` 的「move 档（300ms）」旧注释仍在（batch 记 conversation-layout 侧为 ：187，现位于 ：185，±2 行漂移）
4. **未做**：未对 tests/ 做逐文件的夜前基线 diff。故「0」的严谨表述是：**无批次自称新增断言 + 下发汇总为 0 + 仓库工作区干净、窗口内 tests/ 无改动**（检查 ①②③），而非「逐文件比对确认」。

**154 的去重**：跨批重复至少三组（各出现 3 次，每组可减 2）——`dcu-spin` 基元（batch-1:29 / batch-8:39 / batch-19:32）、`data-document-hidden` 机制（batch-6:36 / batch-8:46 / batch-10:37）、行 hover/选中底四值（batch-1:23 / batch-5:50 / batch-8:40）——**去重下界 148**；全面去重需逐条比对，未做。

---

## 5. 待人工裁决（复核不通过或证据不足，14 条）

### 5.0 依赖映射（第 3 节 20 条 ↔ 本节 14 条）

- **5.3 阻塞面 = batch-8 差异表第 1–3 行 + 清单 #5 的一个子项**：:24 浅色侧栏底 `--dcu-sidebar-background`、:25 浅色设置页底 `--dcu-settings-page-bg`、:26 浅色标题色 `--dcu-sidebar-primary`（三条均不在第 3 节 1–20 清单内），**外加清单 #5 的 :283 色值注释**（sidebar-width.ts:283 注释写的就是 `--dcu-sidebar-background` 的值，与 5.3 第一条同物，batch-3:12 + 本会话 sed 实读附 2.7）。→「当日可清 14 条」的其余部分与 5.3 不相交；#5 按行动列拆分执行即可，**不存在「先做清单会被 5.3 整体推翻」的情形**。
- **第 3 节与裁决的交点共 4 处**：**#5 ↔ 5.3**（子项级，缓办，见 #5 行动列）、**#7 ↔ 5.3**（连动复查，非阻塞，见 #7 行动列）、**#9 ↔ 5.8**（前置，见 #9 行动列）、**#10 的姊妹项**——batch-10:21「悬停底色」行未入清单 #10（浅色 neutral-200 vs 黑 5% 需裁决，batch-10:21 原文），建议并入 5.3 的浅色族采样一并裁决。
- 其余 12 条裁决的对象均在 20 条清单外：5.1（batch-1:14 + batch-19:21，及清单外 batch-19:22 颜色档）、5.2（batch-4:23-24 + batch-6:27）、5.4（batch-11:16）、5.5（batch-16:16,17 + batch-3:9）、5.6（batch-16:19）、5.7（batch-20:22）、5.8 的另半（batch-16:18 的 settings-page-registration.ts:131）、5.9（batch-12:21）、5.10（batch-17:18）、5.11（batch-11:18）、5.12（batch-9:19）、5.13（batch-15:13）、5.14（batch-14:17-22）。
- **裁决结论落点**：仅 5.5 明示「补登记 04-open-gaps」。本报告建议其余各条统一落点为「值/注释类写回对应源文件注释 + 04-open-gaps 各登记一行（结构性豁免必登记）」——此为建议，非批次文件原文，动机是第 2 节所述 13 批仅 grep 04 的漏检风险。

### 5.1–5.14 清单

1. **运行中 spinner 尺寸（批次间证据互斥，动手前必裁）**：batch-1:14 与 batch-19:21 均判 14×14 → 16×16（batch-19 定点提取任务行上下文 `size-4 animate-spin text-foreground-subtle`），但 batch-18:21 把 `<ZIconLoading size={14}` 列入「已对齐项」并引 `size-3.5 animate-spin` 为证——同一份 asar 两种归属。需定点复核后裁决，并同步修正 03b §5 的「DSH running 同 16×16 ✅」记录或代码（batch-19:21 自注「记录或代码其一漂移」）。
2. **「会话→任务」术语系**：batch-4:23,24（pin/unpin/rename/archive 动词组、空态/搜索/新建措辞）+ batch-6:27（上一个/下一个会话）——多键统一需术语裁决表拍板。
3. **浅色主题双源冲突（阻塞上述 3 条 + 清单 #5 色值子项，裁决前不动）**：batch-8:24-26 —— 侧栏底 #f0f0f0（asar zai-light 覆盖层，03b:138）vs #f5f5f5（tokens.json 基础层，03g §4.6）两份文档互斥；设置页底 #f8f8f8 vs #fafafa 同族；标题色 #262626 vs neutral-700/800 归属未定（zai 覆盖层不覆盖 `--color-foreground`）。需活体重采后裁决。
   **活体重采操作指引**（本报告综合，非批次原文；每步判据的出处随步标注）：
   1. **CDP attach 活宿主**——既往批次活体采样端口为 9224（batch-6:37、batch-9:17 有「9224 实测」先例；batch-8:18 称本轮「无 9224 采样条件」）。
   2. **读生效主题类**：`document.documentElement` 的 classList 是否含 `theme-zai-light`——依据 batch-5:8-10（「hex 套与 oklch 套两套并存……两套谁生效以活页 class 为准」）与 batch-8:17（「tokens.json `_meta.lightClass` 类名残缺（` theme-zai- platform-mac-desktop`），tokens.json『light』列实为基础主题，不是 .theme-zai-light 覆盖层」）。
   3. **读 resolved 值**：`getComputedStyle(document.documentElement).getPropertyValue(...)` 取 `--color-sidebar`、`--color-background`、`--color-foreground`——三者均为主题层根级令牌（batch-8:24-26 三条的对象），任一可见宿主界面即可采样，无需进入特定子页面。
   4. **对表判定**：`--color-sidebar` ≈ #f0f0f0 → zai-light 覆盖层生效，按 batch-8:24 原话「若以覆盖层为准应回 #f0f0f0，TA1 的『245/250 分层』需重新评估」；≈ oklch(97%)（=245 基础层 neutral-100，batch-8:24）→ 维持现值 #f5f5f5。`--color-background` 同法对 #f8f8f8 vs oklch(98.5%)（batch-8:25）。`--color-foreground` 因 zai 覆盖层不覆盖（batch-8:10），看 resolved 落 neutral-700(#404040) 还是 neutral-800(#262626) 档（batch-8:26）。
   5. **结论连带复查**：清单 #7（设置卡兜底 #fafafa）与 #5 的 sidebar-width.ts:283 色值注释，随裁决同步落笔。
4. **归档确认形态**：batch-11:16 —— 本仓行内两步确认 vs ZCode 3.16.x 模态确认；所引「3.15.1 行内确认」参照已不可考（`confirmingId`/`confirmArchive` 0 命中）。二选一：改模态（照 03j A2/A5）或登记显式偏离。
5. **侧栏拖拽上下限**：batch-16:16,17 + batch-3:9 —— 200/420px 固定 vs 264 / 容器×0.5 自适应；代码注释已声明「主动放宽」取舍（sidebar-width.ts:5-12、sidebar-drag.ts:30），需裁决方确认保留或对齐，并补登记进 04-open-gaps 防被当 bug 修回。
6. **悬停卡显示延迟 1000ms vs 300ms**：batch-16:19 —— 1s 是「划过空行停满 1 秒避免闪现」的手感设计；保留须登记显式偏离，对齐则需复验闪现问题。
7. **焦点环颜色来源声明**：batch-20:22 —— #0b7fff/#4099ff 是 DSH 台账值（07-delivery-ledger:55），asar 实测 focus-visible ring 消费 `--color-primary`（中性）、与 icon-blue 也无一相等；实际渲染色未验证。二选一：承认保留（更正 zcode-skin.ts:73-76 注释）或真跟随 ZCode（改值 + 活体验证）。
8. **设置页图标描边档位 1.5 vs 2**：batch-13:19（设置导航图标 → 1.5）与 batch-16:18（设置入口图标 → lucide 默认 2，asar 使用处不覆盖）证据各有所据——需定档，避免把两处 1.6 修成互相矛盾（**前置约束清单 #9**）。两处 1.6 的书写形态不同：JSX 形 `strokeWidth={1.6}`（CodexSettingsPage.tsx:235）与对象字面量形 `strokeWidth: 1.6`（settings-page-registration.ts:131）；batch-13:19 的「全仓 grep 仅 1 处」仅指前一种形态，本会话双形态 grep 复核共 2 处、各 1 处（附 2.5）。
9. **iframe 注入主题灰阶漂移**：batch-12:21 —— oklab color-mix 复合色无法静态算出，需活页 `getComputedStyle` 对比后重对齐或更新注释基线；且该偏离的登记处缺失（04/design-language/uiplug/docs grep 全 0），注释引用的「KNOWN-ISSUES 第 8 条」内容实际不符——batch-12:12 实查：ConnectorsSection.tsx:37 注释称该偏离登记于 KNOWN-ISSUES 第 8 条，而该文件 `## 8`（:369-395）实为「发送键配色令牌作用域」问题（同 var() 作用域主题、但内容不是 iframe 统计）。
10. **设置导航未选中项深色**：batch-17:18 —— ZCode 实测 rgb(179,179,179) vs 本仓 #d4d4d4，颜色从未收口；激活态因 spec JSON 无样本**不判**，先补采。
11. **定时任务归属**：batch-11:18 —— 定时会话滤除走独立页签 vs ZCode 纳入分组体系；需核实 DSH 宿主是否有独立定时页签位，无则登记显式偏离。
12. **新建页拖拽手柄热区 32px vs 10px**：batch-9:19 —— 确认是否刻意放大触达面：是则模块注释写豁免理由，否则收窄 10px。
13. **composer 菜单壳半透明毛玻璃 vs 实色 #fff/#2b2b2b**：batch-15:13 —— 宿主 `--dsw-specific-menu` 实值 light `rgba(248,249,250,.94)` / dark `rgba(48,49,54,.94)`；而 2026-10-14 去硬编码注释里的旧值恰为 ZCode 值 #fff/#2b2b2b，现值与旧值已不同——观感取舍先登记待裁决。
14. **TurnNavigator 自绘件设计决策四件**：batch-14:17-22 —— aria 文案措辞、浮层两段式 320px、开合时延 120/80ms、fixed 层 z-index 20，逐项确认刻意增强或登记豁免。

---

## 6. 未覆盖与未验证项（明确列出，不许当已验证引用）

### 6.1 活体（CDP）缺口 —— 批次头注明示未做活体
batch-6:7、batch-8:18、batch-10:14、batch-15:4、batch-16:45 均声明本批无 CDP。文件内逐点标注「未验证」的：
- G18 折叠过渡活体时长与逐帧动效（batch-9:17、batch-20:21）
- rail 内滚动 hover 波是否残留（batch-7:19，状态矩阵 ❓）
- 自绘刻度 200ms 波跟随无活体对比录屏；压缩态活体目检未做（batch-14:15,16）
- iframe 灰阶复合色未活页对比（batch-12:21）；DSH 宿主是否定义 `--dsw-alias-interactive-bg-hover` 未核验（batch-12:23）
- 宿主 `--dsw-font-family` resolved 值未实测——**未实测前不得声称「字体已与 ZCode 一致」**（batch-16:20）
- session-host.ts 两个行为判定（全局面板取消选中、未读合成）需双端活体 CDP（batch-16:37）
- DSH 焦点环实际消费变量与渲染色（batch-20:22）
- user-bubble-collapse 观察器性能占比：静态同构推断，未做 Performance trace（batch-20:24）
- DSH 宿主默认宽 280px 回退值无条件实测（batch-3:19）
- ZCode 浅色设置卡实测值本身缺失（#fbfbfb 为推定，batch-17:16；清单 #7 的修复依据是仓内 TA4 真值而非 ZCode 实测——连动关系见 #7 行动列与 5.0）

### 6.2 asar 提取受挫/受限点
- batch-9:10：码体上下文提取命令被取消（341MB 带界正则过重，未重试）→ D2 的 ZCode 侧 pre 内边距未从 asar 重验，现值引模块注释自记（本仓 :251 与 :226 注释自相矛盾待解，batch-9:18）。
- batch-7:12、batch-14:7：运行时 hash 类名（`JXrxFq_preview`/`JXrxFq_marks`）asar 0 命中，相关证据只能引文档活体记录。
- batch-15:32：radix popper zIndex 是运行时变量，菜单壳 `z-index:1100` 无参照。
- batch-10:53：`--color-ring` 定义未提取到（仅见消费点）→ 焦点环色无 asar 例证。
- batch-8:10：zai 覆盖层不覆盖 `--color-foreground` → 浅色标题色归属未定（已列 5.3）。

### 6.3 ZCode 侧结构性未采集（100 条无参照项的共性；需补采才能对账，本审计无法推进）
- **侧栏行系统**：头部/品牌区几何、收起轨宽度、键盘焦点样式、拖拽 ghost 与落点线规则、置顶区几何、行内 quick-more 几何、悬停卡内容、树键盘模型（batch-1:35-39、batch-2:23-24、batch-3:17、batch-11:33、batch-16:33-35、batch-18:34-37、batch-19:39-40）
- **⌘K 搜索**：浮层入场动画/scrim、键帽 Kbd 规格、分组标题、结果条数上限（batch-2:26-27、batch-13:36）
- **输入区**：@ 建议弹层几何、焦点态、键盘行为、加号 hover 底色（batch-15:34、batch-8:54、batch-19:42）
- **设置页**：搜索态、分区图标、switch/trigger 控件、退出/关闭动画（140ms 是否偏离待采，batch-13:32）、disabled 档、按钮 hover（batch-17:39-42）
- **新建页**：hero/建议卡/时段问候语机制/网格（batch-4:50、batch-9:39、batch-15:42）
- **定时视图 / 频道树 / IM 品牌图形**（batch-11:34、batch-18:38、batch-20:43,45）
- **令牌家族**：阴影逐值（五条完整串 0 命中）、滚动条、遮罩/骨架、选区色、工具栏填充、diff 表面生成式（batch-5:32-33,54-57）
- **顶栏**：弹出层锚定偏移、导航钮图标描边、Windows 标题栏适配（batch-12:43-44、batch-10:52-53）
- **性能**：超长会话（1000+ 轮）滚动未测（batch-15:40，引 08-performance-audit.md:63 + 模块 L68 自述）

### 6.4 方法学与参照物缺口
- batch-2:5：CodexSidebar.tsx 内嵌 composer 规则块仅抽查 7 项，未逐条对账。
- 04-open-gaps.md 有 **13 批**仅关键词 grep 未整读（batch-2/3/6/7/9/10/12/13/14/15/17/19/20 头注）——「是否已有裁决」依赖关键词命中，存在漏检（batch-12:21 已实际出现一例）。
- workspace-browser.ts 分页数值（5 / +10）的参照是 Codex 26.915.4065.0 安装包，**不在本审计参照物内**（batch-11:32）。
- 154 条一致项尚未落地为 tests/ 断言（第 4 节）——在落地前，这些「一致」仅是文档级结论，无回归保护。

---

## 附：建议的明日操作顺序

1. **先裁决 5.1 与 5.3**。5.1 需一次定点 asar 复核（对象：batch-1:14 / batch-19:21 / batch-18:21 三处归属冲突）；5.3 需活体重采——**怎么做见 5.3 内嵌操作指引**。其阻塞面：batch-8 前三行 **+ 清单 #5 的 ：283 色值注释子项（缓办）**；结论出来后按 #7 的连动约定复查设置卡兜底。
2. **当日可清**：第 3 节中无裁决依赖的 **14 条**（#1-4、#6、#8、#11、#12、#14-16、#18-20，逐条理由见第 3 节依赖声明）；另 #5 做「200ms 兜底 + 240→264 注释」子项（**:283 色值注释缓办**）、#10 做六项（batch-10:21 的悬停底色不在其列）——两条的剩余子项随 5.3/浅色族裁决收口；#7 顺手做（对齐仓内现值）但挂「5.3 后复查」标签；#9 排到 5.8 之后。
3. **把 154 条一致项搬进 tests/**（去重下界 148，见第 4 节），优先搬跨批重复的三类（dcu-spin、data-document-hidden、行 hover/选中底四值），一处断言同时保护多个批次；现有测试文件清单与断言写法参照见附 3。

---

## 附 2：核验命令与输出（第 1–4 项为第 3 版会话所跑，第 5–8 项为第 4 版会话所跑）

1. **逐批计数**（对 20 份 batch 按标题切节统计表行/列表项）：逐批输出 `diff/ali/nore` = batch-1…20 依次 `4/10/5, 7/0/5, 5/4/5, 12/8/5, 7/10/5, 3/8/5, 1/9/5, 8/10/5, 3/10/5, 12/10/5, 3/5/5, 5/10/5, 1/4/5, 8/10/5, 5/7/5, 5/4/5, 4/10/5, 6/10/5, 4/6/5, 4/9/5`——与 2.1 表逐格一致；合计 diff=**107**、ali=**154**、nore=**100**。
2. **覆盖面**：`find uiplug/src/client -maxdepth 1 -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l` → **96**；20 批点名的 96 个文件 `sort` 后与实际文件清单 `comm` 比对——双向差集为空、覆盖清单无重复项。
3. **第 4 节四项检查重跑**：① status=0；② 窗口内无提交；③ tests/ 无窗口内新文件；④ 仅 zcode-tokens.ts:146/:377 两处定义、无消费点。
4. **源码抽查**：见第 4 节 ⑤（只读 sed/grep，逐行核对清单头部条目现状，含两处 ±1~2 行的行号漂移登记）。
5. **strokeWidth 双形态计数**（第 4 版新增，调和清单 #9 与 5.8）：`grep -rnE "strokeWidth[:=] ?\{?1\.6" "$R/src"` → **恰 2 处**：`CodexSettingsPage.tsx:235`（`strokeWidth={1.6}`，JSX 形）与 `settings-page-registration.ts:131`（`strokeWidth: 1.6`，对象字面量形）；单查 JSX 形 `strokeWidth={1.6}` → 仅 :235 一处（batch-13:19 的「全仓仅 1 处」即此口径）；单查对象字面量形 → 仅 :131 一处。
6. **覆盖面 flatness 前提**（第 4 版新增）：`find "$R/src/client" -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l` → **96**（与 `-maxdepth 1` 结果一致）；`find "$R/src/client" -mindepth 1 -type d | wc -l` → **0**（无子目录）——「-maxdepth 1 = 全集」的前提成立。
7. **#5 同物实证**（第 4 版新增）：`sed -n '280,290p' "$R/src/client/sidebar-width.ts"` → :283 注释原文「侧栏面不透明（`--dcu-sidebar-background` 为 #f0f0f0 / #161616），落到它下面即可藏掉」——注释点名的正是 5.3 第一条互斥的侧栏底色令牌，耦合判断的直接依据。
8. **tests/ 清单与断言写法**（第 4 版新增，供附 1 第 3 步）：`ls "$R/tests" | wc -l` → **108** 个文件；其中与 154 条落点直接相关的既有断言文件如 `locales.assert.ts`、`design-system.assert.ts`、`token-coverage.assert.mjs`、`settings-integration.assert.ts`、`session-tree.assert.ts`（完整清单 `ls "$R/tests"` 可复现，见附 3）。断言写法参照：实读 `tests/settings-integration.assert.ts:205-225`，风格为「`// 日期 更新：…（依据）` 注释 + `assert.match(源码文本, /正则/, '意图说明')`」；其 ：214 注释「2026-10-26：图标补上 strokeWidth={1.5}（ZCode 侧栏图标统一 1.5 描边）」与 batch-13:19 引文逐字一致。
9. 本报告未运行任何针对插件代码的修复、构建或测试；未做活体（CDP）验证——相关缺口如实列于第 6 节。

---

## 附 3：tests/ 现有清单摘要（第 4 版会话 `ls` 实跑，共 108 个文件）

- **与 154 条一致项落点直接相关的既有断言文件**（按第 3 节各批模块对应选取）：`locales.assert.ts`（batch-4 文案系）、`design-system.assert.ts` 与 `token-coverage.assert.mjs`（令牌层，batch-5/8 系）、`settings-integration.assert.ts`（batch-13 系，含 ：214 描边先例）、`session-tree.assert.ts`（batch-18 系）、`workspace-browser.assert.ts`（batch-11 系）、`conversation-dom.assert.ts`（batch-19 系）、`about-dependencies.assert.ts`（batch-17 系）。其余 100 余个为各模块 spec/assert 套件，完整清单 `ls "$R/tests"` 可复现。
- **断言写法参照**（实读 `tests/settings-integration.assert.ts:205-225`）：「`// 日期 更新：…（依据）` 注释 + `assert.match(<源码文本>, /正则/, '意图说明')`」；正则容许已知变体（如同文件 ：218 用 `\s*strokeWidth=\{1\.5\}\s*` 容许属性可选）。154 条搬入时建议沿用同一风格，注释注明 batch 出处行号。
- 注：以上文件名与行号为本次 `ls`/`sed` 实读所得；各文件的既有断言内容未逐文件审读，落断言前需先读对应文件现状（避免与既有断言冲突，batch-18:10「同步既有断言」即此意）。
