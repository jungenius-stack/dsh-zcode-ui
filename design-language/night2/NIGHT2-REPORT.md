# night2 · 夜间深扫总报（2026-11-02 夜 → 11-03 晨）

> 本文由汇总员写成，并已按独立审读员意见修订（2026-11-03 晨）。输入：`night2/surface-1.md`～`surface-14.md`（14 份）、`night2/cdp-summary.json`、`night2/live-verdicts.md`、`night2/live-findings.md`、`night2/applied-night2.md`、`night2/watchdog.log`、`night2/run-night2.dwf.ts`、`uiplug/docs/baseline.json`、`uiplug/docs/BASELINE.md`。
> 数字出处分三档标注：**[实跑]** = 汇总员本会话执行的命令及输出；**[记录]** = 上述文件里读到的记录（含各面复核节的自我声明，汇总员未复跑其提取）；**[推定]** = 由已核实事实推出的结论，附推理链。
> 差异/复核数由汇总员按「差异表行数 / 复核 verdict 行数」逐份实数；落地数 = `applied-night2.md` 各面「落地」行数。

## 1. 通道与消耗

**主池（推定）：start-plan（GLM-5.3-Flash，`$max` 档）。**
- 三池定义与探针顺序：start-plan → offpeak-idle-plan → highspeed-card，取第一个应答正常的做全场唯一模型；三个模型串均带 `$max` 后缀（[记录] `run-night2.dwf.ts:14-23`、`:95-122`）。
- **主池 = start-plan 是推定，不是记录值**：直接证据（三池探针应答表）随工作流 artifacts 输出（`run-night2.dwf.ts:73-81` 注册的 `pools` 表），night2 目录无落盘副本。推理链：汇总员 agent 由脚本以 `model: winner.ref` 实例化（`run-night2.dwf.ts:307-309`）[记录]，而汇总员本会话运行时模型即 `account:bigmodel-start-plan/GLM-5.3-Flash` [实跑：本会话环境]，故 winner = start-plan。权威确认以工作流跑完后的 return 值为准——其 conclusion 字段会打印 `winner.label`（`run-night2.dwf.ts:349-352`）[记录]。池耗 token/费用无计量记录，如实报缺。

**消耗**：
- **计划 agent 调用 40 次**（[记录] 按脚本结构数：探针 3 + 14 面 ×（深挖 1 + 复核 1）= 28 + 采集官 1 + 裁决员 1 + 落地员 4 + 汇总员 2 轮 + 审读员 1）。这是设计数：运行期无逐 agent 落盘日志，重试/跳过不可排除；可佐证的是各环节产出物齐全（14 份面报告、cdp- 目录、live-verdicts.md、applied-night2.md 均在），无整环缺失迹象。
- 验证执行：4 位落地员各留 1 组断言 + 门禁记录（[记录] `applied-night2.md` 四个「验收（本机实跑）」块，均为 62/3/0 + exit 0）；工作流收口档还设计了一次门禁 + 断言（[记录] `run-night2.dwf.ts:303-305`），**其输出未落盘**——本报告 §6 的绿色结果是汇总员对同一工作树的实跑，效力以 §6 为准。

**中断与事故：无致命中断，2 起已修复事故。**
- 14 份面报告全部产出且各含完整复核节（[实跑] `ls night2/surface-*.md` 14 份齐全；[记录] 各面均有「## 复核」节）；脚本「面 X 中断」兜底未吞掉任何面；4 组落地全部完成。
- 事故①（活体）：body 残留上夜采集脚本还原 bug 挂上的 `theme-zai-light` 类污染读数，已移除并逐字快照还原校验 exactMatch=true（[记录] `cdp-summary.json` item1「残留污染修复」「还原校验」）。
- 事故②（方法论）：该构建禁用 CDP HTTP 发现端点，改 WS 直连 + `lsof` 查 TCP 监听（[记录] `cdp-summary.json` method 字段、`live-findings.md` 教训 1）。
- 看护进程 25 分钟间隔巡检 **17 拍**（首拍 23:57:47、末拍 06:37:49，`watchdog.log` 共 18 行 = 1 行启动记录 + 17 行巡检）：DSH pid 恒 79725，「已死重载」分支全程未触发；9223 全 17 拍 = 200；9224 前两拍 000（23:57/00:22）、后 15 拍 200（00:47 起）（[实跑] `grep -c "9223=" watchdog.log` → 17、`grep -c "9224=200"` → 15、`grep -c "9224=000"` → 2）。即 ZCode 调试实例在 00:22–00:47 之间起来，活体采集因此可行（[记录] `live-findings.md` 头部 00:40–01:15；`cdp-summary.json` capturedAt 页面时间 03:38–04:08+08:00）。

## 2. 静态扫描（14 面 × 差异/复核/落地）

计数口径：差异 = 各面差异表（mechanical + deviation + needs-live）行数（needs-live 含 surface-6 的 composer-thin/①②③ 与 surface-13 的 C-1..C-5）。复核 = 复核节 verdict 行数，**两类**：verified/证据成立（含「静态 verified-活体维持」「分类正确」措辞）与 unconfirmed（仅计 verdict 显式标 unconfirmed 的行）。落地 = `applied-night2.md` 各面「落地」行数，**不含**已退回的 surface-5 M3（见 §4）。needs-live 合计 38 与裁决员总账互证（[记录] `live-verdicts.md:12`）。

| 面 | 主题 | 差异（mech/dev/live） | 复核 verdict（verified+证据成立 / unconfirmed） | 落地 | 出处 |
|---|---|---|---|---|---|
| 1 | 上下文菜单 | 15（9/2/4） | 15 / 0 | 9（#1–#9） | surface-1.md §C、§复核:129；applied 面1 |
| 2 | 悬停卡与 tooltip | 9（5/3/1） | 8 / 1（#9） | 4（#2–#5；#1 先期已落仅核验） | surface-2.md §3:26、§复核:152；applied 面2 |
| 3 | 对话框家族 | 19（14/3/2） | 19 / 0（NL①② 记「维持」未标 unconfirmed） | 13（M1–M9+M11–M14；M10 作废） | surface-3.md §2/§3/§5；applied 面3 |
| 4 | toast 与通知 | 10（4/4/2） | 10 / 0（NL①② 静态 verified/活体 not run） | 4（M1 按 6/7 处，见 §4 注） | surface-4.md §2/§3/§5；applied 面4 |
| 5 | 空态 | 13（7/3/3） | 11 / 2（N2、N3） | 6（M1/M2/M4/M5/M6/M7；M3 落后即退、**不计入**） | surface-5.md §2/§3/§6；applied 面5 |
| 6 | 滚动条与滚动 | 13（7/2/4） | 9 / 4（composer thin、①、②、③） | 7（M1–M7） | surface-6.md §3/§4/§6；applied 面6 |
| 7 | 焦点与键盘 | 8（3/4/1） | 8 / 0 | 2（#1/#2） | surface-7.md §3；applied 面7 |
| 8 | 禁用/加载/进度 | 12（7/4/1） | 12 / 0（#12 证据成立、维持 needs-live） | 6（#1–#5/#7） | surface-8.md §3；applied 面8 |
| 9 | 徽标与计数 | 9（2/4/3） | 9 / 0 | 2（M1/M2） | surface-9.md §2/§3/§5；applied 面9 |
| 10 | markdown 渲染 | 11（4/3/4） | 10 / 1（N1） | 4（M1–M4） | surface-10.md §2/§3/§5；applied 面10 |
| 11 | 设置页逐分区 | 19（10/5/4） | 17 / 2（M1、M3） | 9（M5 不落） | surface-11.md §2/§3/§6；applied 面11 |
| 12 | 频道定时归档 | 12（5/4/3） | 12 / 0（N1/N2 静态破案收口、N3 维持） | 4（M5 先手已落，另计 §4 注） | surface-12.md §2/§3/§6；applied 面12 |
| 13 | 无参照二轮 | 13（4/4/5） | 13 / 0 | 1（#3） | surface-13.md §二/§四.C；applied 面13 |
| 14 | 主题层叠定案 | 10（6/3/1） | 9 / 1（#3） | 3（#1/#4/#5） | surface-14.md §4；applied 面14 |
| **合计** | | **173（87/48/38）** | **162 / 11**（验算 162+11=173 ✓） | **74** | 拆分口径见上行；[实跑] python3 逐列加总吻合 |

- 合计核对：mechanical 87 + deviation 48 + needs-live 38 = 173（[实跑] python3 加总）；needs-live 38 = 裁决员总账「收口 9 + 部分裁决 6 + 维持 23」（[记录] `live-verdicts.md:12`）。
- **复核/交叉核对阶段共翻案或推翻原前提 9 处**（这些都是数值级或前提级的，早上下判断前须知）：① surface-3 M10 被 surface-4 §6 交叉核对判误报作废（ZCode 浅 destructive 实为 #e03131，与插件逐值一致）；② surface-2 #9「静态无定义」前提被推翻（grep 漏 TS 对象键）→ 9223 活体读值 12px 收口；③ surface-5 N1 → 9224 活体收口 21px；④ surface-7 #8 同型翻案 → 6px 收口；⑤ surface-10 N1「asar 无该字面量」被证伪（42 处命中）→ 静态破案；⑥ surface-11 M1 部分推翻（zai 亮前景 = #262626，文字侧本就同值，只剩图标差）；⑦ surface-11 N3 AA 底色修正（#f8f8f8 实算 6.60:1/9.76:1）；⑧ surface-12 N1/N2 needs-live 分类被静态破案（Clock 身份、左键折叠）；⑨ surface-14 #3 的 ours 侧「无上限」被证伪（sidebar-drag.ts 早有 420 定值上限）。另有 surface-13 C5：旧批次码块值 '8/8/0/12' 与文档 '6px 8px 12px' 均被活体推翻（体包 0/8/12/8）。（[记录] 各面复核节 + live-verdicts.md）
- 14 份面的复核均**自述**为独立重跑提取且产物字节数与深挖记录一致（[记录] 各面 §复核节；汇总员未复跑这些提取，按复核节记录采信）。

## 3. 活体实测（做了什么、裁决了什么）

**两个实例，先分清**（[记录] `live-verdicts.md:7-8` 采信说明、`surface-5.md` §复核 N2）：
- **9224 = ZCode 实例，无插件**（`[class*="dcu-"]`=0、root dump 无任何 `--dsw-*`）。采集官主链与裁决员复跑都在这上面：主题层叠四组矩阵 + 逐字快照还原、码块家族逐层几何、rail 滚动清波源码级取证、tooltip 延迟 4 方法 20+ 次、Tab 27 落点焦点环枚举、:root 353 变量 dump。
- **9223 = DSH 宿主实例（吃插件）**。当晚记录到的 9223 读值只有 1 处：surface-2 复核员在 9223 读 `--dsw-radius-xl` = 12px（[记录] `surface-2.md` §复核 #9、`live-verdicts.md:29`）。其余 DSH 侧采样当晚没有做。

**38 条 needs-live 裁决总账（[记录] `live-verdicts.md:12`）**：
- **收口 9 条**：s2#9（`--dsw-radius-xl`=12px，**9223** 读值）、s3NL①（destructive 浅 #e03131/深 #ff5c5c，与插件逐值一致）、s5N1（空态行高 **21px** 非 20px，9224 活体+临时探针测后即删）、s7#8（`--dsw-radius-md`=6px）、s10N1（`_markdown_1ypvv_5` = 宿主 web-frontend CSS Modules，静态破案）、s11N3（AA 底色修正 #f8f8f8/#161616，实算 6.60:1/9.76:1/8.63:1 全过 AA）、s12N1（cron 图标 = lucide Clock，185B chunk 实读）、s12N2（分组头左键=折叠、右键=组菜单）、s13C5（码块体包内边距 = 上0/右8/下12/左8 + 壳 margin 上下 16px）。
- **部分裁决 6 条**（ZCode 侧已定，残留在 DSH 侧或观感层）：s10N2（码卡→后续块 16px 已定；DSH 侧 table→p 待 9223）、s11N1（开关黑白反转同构；剩宿主覆盖确认）、s11N2（聚焦=边框加深 ring-0；DSH 侧待比）、s13C2（E3 rail onScroll 清波 = 源码级真；行为对拍受 864px 布局门控未做）、s13C4（浅色令牌已建档；逐项目检未做）、s14#9（ZCode 侧 27 落点无可见环 + 全部 ring 档无一蓝色 ⇒ 插件 #0b7fff/#4099ff 在 **ZCode 侧无对应消费点**；注意这是「无宿主依据」的定性，不是「插件色值错误」——DSH 侧控件实际渲染未采，本轮落地**未动**这两个值，面14 #9 登记不落）。
- **维持 needs-live 23 条**（名单见 §5；[记录] `live-verdicts.md:136` 裁决员原话：大部分依赖 9223 插件实例或「先落地后验收」，9224 未注入插件属**结构性覆盖不了，不是漏采**——当晚 9223 上除 surface-2 复核 1 处外未安排采集，也是实情）。

**口径警示（防止误读的两个数）**：
- tooltip 延迟 ≈6s 是 **CDP 合成单点 hover 注入口径**的测量（MutationObserver 5 次中位 5849.8ms），**不是确认的产品 bug**——与真实指针连续 pointermove 的行为差异未验，需人工复核一次；693ms 孤例 A/B 对照无法复现，不采信（[记录] `cdp-summary.json` item4「口径警示」「孤例」）。
- E3 rail 清波裁决的是**源码机制**（`onScroll:()=>d(void 0)` 同函数双挂，styles-Dv5E6Odo.js @4420046），滚动行为观察因 864px 门控未执行——收起面板/改窗口属写状态，违反只读铁律（[记录] `cdp-summary.json` item3）。

## 4. 落地清单（文件 × 条目 × diff 总账）

**diff 总账 [实跑]**（2026-11-03 晨，`git -C uiplug diff --shortstat`）：**23 files changed, 371 insertions(+), 107 deletions(-)**；另有未跟踪新文件 `src/client/scrollbar-autohide.ts` **239 行**（[实跑] `wc -l` → 239）。HEAD = `50ac768`（[实跑] `git log --oneline -1`）。

**改动是否纯净（有没有 night2 之前的存量混入）**：按记录链，无混入——A 组开工记录「基线 = uiplug HEAD `50ac768`（工作树干净）」（[记录] `applied-night2.md:4`），B/C/D 基线逐级叠加前序落地员的改动（各自头部）；24 个改动文件与 applied 四组文件清单的并集逐一吻合、全部在 src/client（[实跑] `git status --short` 23 M + 1 ??，[记录] applied 四组清单）。局限：50ac768 时点树净是 A 的记录，汇总员无法回溯独立复验；但「改动文件集 ⊆ applied 清单」已把混入面压到零。

**74 条的口径**：= applied 各面「落地」行数合计（A30 + B16 + C15 + D13，[实跑] python3 加总），**不含**已退回的 surface-5 M3；其中面4 M1 按 6/7 处落地（第 7 处 CodexWorkspaceBrowser.tsx:1078 等测试轮同步选择器后补，[记录] applied 面4）。逐 git diff 对账时注意这两点。

| 文件 | ±（git numstat [实跑]） | 落了哪些条目（组） |
|---|---|---|
| zcode-theme.ts | +118/−12 | 面1#2–#6/#8/#9、面5M7、面6M1–M4 CSS、面8#5、面14#4/#5 注释、面11M3/D 令牌 +4 行（A/B/C/D） |
| hover-shell.tsx | +34/−4 | 面2#3/#4（A） |
| conversation-layout.ts | +31/−0 | 面6M6、面10M1–M4（B/C） |
| zcode-tokens.ts | +28/−16 | 面6M1–M3、面8#5 alias、面14#1（B/C） |
| archive-confirm.ts | +26/−7 | 面3 M1–M12（A） |
| settings-page-styles.ts | +26/−12 | 面6M7、面8#1、面11M1–M4/M7–M10（B/C/D） |
| AboutSection.tsx | +15/−5 | 面8#3/#4/#5/#7（C） |
| session-tree.tsx | +14/−4 | 面1#1、面9M1、面12M2/M3（A/C/D） |
| CodexWorkspaceBrowser.tsx | +19/−19（净 0，1136 棘轮守恒） | 面1#1、面2#2/#3、面4M1×4处/M2×7处、面5M4、面9M1/M2、面12M1（A/B/C/D） |
| locales.ts | +10/−8 | 面4M2、面5M1/M5/M6（A/B） |
| CodexSidebar.tsx | +9/−3 | 面5M2（B） |
| ScheduleBrowser.tsx | +9/−3 | 面4M1/M2、面12M3/M4（A/D） |
| CodexSettingsPage.tsx | +6/−3 | 面4M3、面13#3（A/B） |
| composer-tool-menus.ts | +5/−0 | 面1#7（A） |
| zcode-skin.ts | +5/−2 | 面7#1 注释（B） |
| index.ts | +4/−0 | 面6M5 接线（B） |
| session-row-actions.tsx | +4/−4 | 面3M14、面4M1/M2（A） |
| workspace-hover-card.tsx | +3/−2 | 面2#3 data-exit（A） |
| ChannelBrowser.tsx | +1/−1 | 面12M3 调用点（D） |
| DeveloperToolsRow.tsx | +1/−0 | 面8#2（C） |
| host-anchor-contract.ts | +1/−0 | 面1#4 登记 `_danger`（A） |
| input-history.ts | +1/−1 | 面7#2（B） |
| settings-page-registration.ts | +1/−1 | 面11M6（D） |
| **scrollbar-autohide.ts（新增）** | +239 | 面6M5 状态机（B） |

**回退（引发回退的条目，仅 1 条）**：
- **surface-5 M3（空态字号 13px→14px/21px）落了又退**：`scripts/verify-workspace-drop-layout.mjs:97` 字面钉死 `fontSize!=='13px'||lineHeight!=='18px'`，该脚本在「只改 src/client」铁律之外——值回到 13px/18px，按登记不落处理，源内已留同行注记（[记录] `applied-night2.md` B 组「中途两轮红」第 3 条与面5 表 M3 行）。
- 其余 8 轮断言红全部在 src/client 内**当场收敛、无回退**：A 组 5 轮、B 组 2 轮（动效令牌扫描抓注释、structure-budget 1136 行棘轮 → M7 CSS 迁 zcode-theme.ts）、C 组 1 轮（`padding:1px 6px` → 2px）、D 组 1 轮（颜色字面量 + `!important` 计数 → 升令牌）（[记录] `applied-night2.md` 四组验收块）。B/C/D 因基线非净树，红项处置用「改前备份 + 外科手术回退」，未动 `git restore`。

## 5. 遗留

**deviation 登记（48 条，全部「证据成立、不落」，无需动作）**：面1×2（菜单壳毛玻璃、菜单键帽）、面2×3（/80 透明度机制、kbd 深色 #adadad、卡可交互）、面3×3（宿主 Modal 壳体系 D1–D3）、面4×4（D1 错误文字浅色 AA 族、D2 错误盒几何、D3 通知媒介、D4 警示浅色）、面5×3（D1 三档文字裁决域、D2 置顶空渲染策略、D3 无任务左内距）、面6×2（D1 点击滚动自绘路径、D2 侧栏树滚动条隐藏）、面7×4（输入焦点形态、行焦点形态、roving=APG 超集、菜单键帽交叉）、面8×4（transform vs left、move 档曲线、转圈位置、reduce 全停）+面8#6（width:28% 被断言钉死，移测试轮）、面9×4（未读点直径双规格、胶囊互斥、转圈尺寸双规格、error 档规格存档）、面10×3（D1 引用块 prose 旧值、D2 码体内边距、D3 链接字重）、面11×5（导航 16px、卡底、分区标题 24px、864px 宿主约定、侧栏列宽）、面12×4（粘性分组头、分组头标题色、页签形态、品牌图标介质）、面13×4（焦点环色、TurnNavigator 阴影、tertiary 50% 档、卡片锚 8px）、面14×3（设置卡 #fafafa、阴影阶梯、用户气泡 3%/5%）。逐条出处 = 各面 deviation 表。

**维持 needs-live 的 23 条全名单**（[记录] `live-verdicts.md` 各节，未列入收口 9 / 部分 6 的项）：surface-1 #12（树菜单活体行高）、#13（开合生命周期）、#14（右键落点）、#15（子菜单定位）；surface-3 NL②（bg-popover/98 2% 透明差目检）；surface-4 ①（设置页 toast inert 行为）、②（12% vs 10.2% 并排可感知差）；surface-5 N2（搜索空态居中 DSH 浮层目检）、N3（automations 大卡下放 240px 窄栏）；surface-6 composer thin（thin 是否实际可见）、①（gutter 合成 2px 级错位）、②（min-32 矮容器）、③（M5 状态机对拍）；surface-8 #12（busy 钮 cursor+opacity 四案手感）；surface-9 N1（胶囊计数数据面）、N2（未读点渲染色）、N3（绿系胶囊 AA）；surface-10 N3（引用块翻案双确认）、N4（行内码 margin 活体）；surface-11 N4（k1n 手感/观感）；surface-12 N3（kbt 药丸 DSH 侧栏底观感/AA）；surface-13 C-1（全局面板取消选中行为）、C-3（⌘K 内层 padding）。共同卡点：须 9223 插件实例或「先落地后验收」。

**等测试轮同步后补落的 6 条**（断言/spec 文件在「只改 src/client」铁律之外，源内已留注记指路）：面4 M1 第 7 处（CodexWorkspaceBrowser.tsx:1078，等 tests/session-tree-pending.integration.spec.ts:247）、面5 M3（等 scripts/verify-workspace-drop-layout.mjs:97）、面7 #3（↓ 空草稿召回，等 tests/input-history.spec.ts:43）、面13 #1（加号 hover 5%，等 batch-19:130 + design-system:1572 双锚）、面8 #6（波浪 reduce 停满宽，等 design-system.assert.ts:284）、面11 M5（导航行距 4px，等 design-system OFFSET_BASELINE 移除）。

**无参照穷尽清单（逐面行数，均附检索命令记录）**：面1 §E 5 条、面2 §5 8 条、面3 §5 4 条、面4 §5 5 条、面5 §5 7 条、面6 §6 5 条、面7 §5 8 条、面8 §5 10 条、面9 §5 W1–W10、面10 §5 W1–W13、面11 §5 W1–W10、面12 §5 W1–W10、**面13 §四 集中清单 34 条（A-1～A-9 机制架构类 + B-1～B-20 数值类穷尽 + C-1～C-5 活体类）**、面14 §6 5 条。面13 是历轮「无参照」的收官清点，其 A-6 明言「后续批次不得重复挖掘」。

**早晨待办（按是否阻塞 commit 排序）**：
1. **commit 前必办——观感抽查**（门禁绿只是静态断言绿，night2 动过的高可见面全部零活体验收，[记录] applied 四组「活体验收未跑」清单）。建议肉眼过的最小集：侧栏右键菜单（行高/开壳动画/hover 实色）、悬停卡进出场（300ms+150ms 退场）、滚动条（14px 药丸 + 自动隐藏状态机 + gutter both-edges）、空态三处文案与居中、置顶虚线落区、绿系 pending 药丸与 kbt 计数药丸（双主题）、destructive 确认钮实心、分组头箭头+计数药丸、设置页导航配色三件套/开关命中区外扩、表格行悬停/末行去底线、全局字体栈（面14 #1 动了 `--dsw-font-family`）。
2. **commit 前必办——对账**：git diff 总账（§4：+371/−107 + 239 新行、24 文件）与本报告文件表逐行核对后 commit。
3. **commit 后并行/排期**：订正 `applied-night2.md:87` 令牌账措辞（见下）；tokens.json 浅色 231 值重采（文档轮，`surface-14.md` §2 根因：lightClass 残缺）；23 条维持 needs-live 等 9223 插件实例轮；6 条等测试轮补落；48 条 deviation 无需动作。
4. **账目不一致待订正**：`applied-night2.md:87` 写「令牌账 177/178、200/201 保持不动」，而 `docs/baseline.json:9-14` 为 light 177 / dark 177 / union 203 / `--dsw-` 200——docs-baseline 断言在 §6 套件中通过（静态计数从磁盘复算一致），以 baseline.json 为准订正 applied 措辞。另有 9 组复核发现的引用/计数勘误登记在各面复核节，不阻塞任何事。

## 6. 门禁结果（汇总员本机实跑，2026-11-03 晨，对含全部 night2 未提交改动的工作树）

```
$ node tests/run-assertions.mjs        （uiplug 目录下执行，exit 0）
断言套件：62 通过 / 3 跳过 / 0 失败（共 65 个脚本）
  已跳过：codex-suite-installer.assert.mjs、codex-suite.assert.ts、release-pipeline.assert.mjs

$ node scripts/gate.mjs                （uiplug 目录下执行，GATE_EXIT=0）
类型检查：通过 / 断言：已登记失败 0、新增失败 0 / vitest：全部通过 /
布局检查：22 通过 / 0 已登记红项 / 0 新增失败（共 22 项）/ 上游哨兵：通过
（3 个需活宿主的脚本不在本档，由 gate:host 覆盖）
```

- 以上为本次会话当场实跑的输出摘要（后台任务 exec_dca0a795 与 exec_b107c1a8，均 exit 0）；与 `applied-night2.md` 四组落地员记录（62/3/0、exit 0 ×4）同值。工作流收口档的自身门禁输出未落盘（见 §1）。
- 基线对照（[记录] `uiplug/docs/baseline.json` + `docs/BASELINE.md`）：断言脚本 65（TS 40 + ESM 25）、vitest 58、布局脚本 22、令牌 light/dark 177/177、structural 26（--dsw- 23）、并集 203（--dsw- 200）、CodexWorkspaceBrowser.tsx 1136 行棘轮、!important 60、TODO 0——本轮落地后全部守恒（structure-budget 与 docs-baseline 断言在上述套件中通过，0 失败）。asar 样式表基线：styles-NK68EN_n.css **480,065B** / sha256 06eedae…（`docs/baseline.json:22-31`）；**14 份 surface 的 §0 提取记录全部记 480,065B**（surface-1.md §0 等 14 处），与基线一致。
- 工作树状态：23 改 + 1 新增未提交（§4），等早晨按 §5 待办 1–2 确认后 commit。

---
*出处约定：`night2/` 内文件按名引用；`uiplug/` 下引用含路径（docs/baseline.json、src/client、scripts、tests）。行号（如 surface-1.md:129、applied-night2.md:87）为汇总员实读行号；[实跑]/[记录]/[推定] 标注体系见文首。*
