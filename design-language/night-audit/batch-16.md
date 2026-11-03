# 批次 16 · session-host / settings-page-registration / hover-shell / skin-envelope / workspace-directory-flow / sidebar-drag

> 审计时间：2026-10-30。只读审计，未改任何 src/tests/既有文档。
> ZCode 参照：`/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）。
> 提取方式：asar header 用 Python 解析（`hsize=7269392`，dataStart=7269400），主 bundle
> `out/renderer/assets/styles-CQuzX8si.js`（6705135B）与样式表
> `out/renderer/assets/styles-9Z13W0KP.css`（470091B）按 offset 提取到 /tmp 后 grep；
> 全库检索用 `grep -a -o '<模式>' app.asar`。

## 批次 16 · session-host.ts、settings-page-registration.ts、hover-shell.tsx、skin-envelope.ts、workspace-directory-flow.ts、sidebar-drag.ts

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| sidebar-drag.ts | 拖拽宽度**下限** | `CODEX_SIDEBAR_MIN_PX = 200`（sidebar-width.ts:13，经 sidebar-drag.ts:32 引用） | **264px**（不可拖到默认宽以下） | asar 主 bundle：`R5=264`（全 bundle 唯一命中，`grep -c 'R5=264'` = 1）；clamp 函数 `z5(e,t)=Math.round(Math.max(R5,Math.min(e,n)))`；pointermove `wr` 调 `z5(startWidthPx+dx, containerWidthPx)`；与 03b-sidebar §1 #1 活体实测 `aside 264px` 互证 | 评估把下限提到 264 或注明这是「绕开宿主与 Codex 不一致最小宽度」的有意适配（sidebar-drag.ts:30 注释已声明意图，需裁决方确认保留） |
| sidebar-drag.ts | 拖拽宽度**上限** | `SIDEBAR_MAX_PX = 420`（sidebar-drag.ts:3，固定值） | **容器宽 × 0.5，自适应**（下限至少 264） | asar 主 bundle：`uBn=.5`；`z5` 内 `n = t&&t>0 ? Math.max(R5, t*uBn) : 1/0`，t=容器宽；`gBn=480` 是右侧面板过窄自动收起阈值、`yBn=300` 是 resize 防抖，均非拖拽上限 | 若要一比一继承，可改为 `min(容器*0.5, ...)`；否则在注释里写明固定 420 的取舍 |
| settings-page-registration.ts | 设置入口图标**描边** | `strokeWidth: 1.6`（:131 `ZIconSettings { size:16, strokeWidth:1.6 }`） | **2**（lucide 默认，使用处不覆盖） | asar `out/renderer/assets/createLucideIcon-BQaXGXGF.js`：默认属性 `s={xmlns…,strokeWidth:2,…}`，组件体 `strokeWidth:h=2`；齿轮 chunk `settings-DTzS0O5N.js` 确认本仓 `ZIconSettings`=lucide `settings`；使用处仅传尺寸类（`(0,$.jsx)(Ac,{className:"size-4"})`，其中一处即侧栏任务行设置按钮，`data-testid:"task-settings-button"`），bundle 内 `strokeWidth` 值分布无 1.6 | 若按 ZCode 应为 2；若 1.6 是为匹配宿主视觉的手感值，需写明理由并记入偏离 |
| hover-shell.tsx | 悬停卡**显示延迟** | `HOVER_TIP_SHOW_DELAY_MS = 1000`（:19） | **300ms**（全局 tooltip Provider） | asar 主 bundle：`function pje({children}){…(Sv,{delayDuration:300,skipDelayDuration:0,alwaysDelay:true,disableHoverableContent:true,…})}`；另 `delayDuration:lIn`、`lIn=1500` 属浏览器标签页 tooltip，`delayDuration:0` 属预览区，均非侧栏。注：ZCode 侧栏任务行**无**富悬停卡（标题走 marquee 组件 `KF` + 原生 `title`），300ms 是「悬停提示」类交互的最近参照（跨组件）；本仓库 :69 注释声明 1s 是「划过空行停满 1 秒避免闪现」的手感设计 | 属刻意偏离候选：保留则登记为显式偏离；若对齐则 300ms，同时需复验「划过空行闪现」问题 |
| skin-envelope.ts | 字体栈实际值 | `font-family:var(--dsw-font-family)`（:61）——宿主令牌在 uiplug/src **无定义**（`grep -rn -- '--dsw-font-family:' src/` 0 命中），实际渲染值本次未验证 | `ui-sans-serif, system-ui, sans-serif` | asar 主 bundle：`grep -a -o 'ui-sans-serif[^"']{0,60}'` 命中 `ui-sans-serif, system-ui, sans-serif` ×6；design-language/01-design-tokens.md:42 同值。uiplug/docs/UPSTREAM-CHANGELOG.md:102 记录了「跟随宿主令牌、不写死 Inter」的决策 | 证据链断在本仓库侧：需实测宿主 `--dsw-font-family` resolved 值是否为 `ui-sans-serif, system-ui, sans-serif` 同族；未实测前不得声称「字体已与 ZCode 一致」 |

### 已对齐项（与 ZCode 一致，可写成源码文本断言加固回归）

| 模块 | 项 | 期望值 | 证据来源 |
|---|---|---|---|
| settings-page-registration.ts | 设置图标尺寸 16px | `size:16` = ZCode `size-4`（16px）；侧栏任务行设置按钮同值 | asar：齿轮使用处 `(0,$.jsx)(Ac,{className:"size-4"})` ×2（`Ac`=lucide settings，经 chunk import 混淆名确认） |
| skin-envelope.ts | 表单控件字体继承 | `:where(…表面…) :where(button,input,select,textarea){font:inherit}` 与 ZCode preflight 行为一致（本仓库多一层 :where 零特异性 + 表面限定，为有意分寸） | `grep -o 'button,input…{font:inherit…' /tmp/zcode-styles.css` → `button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;…}` |
| skin-envelope.ts | 数字等宽 tabular-nums | `font-variant-numeric:tabular-nums`（:62；ZCode 为按需工具类、本仓库为表面级继承——数值同，作用域策略不同，属已声明分寸） | ZCode 样式表含 `.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:…}`；主 bundle `grep -c tabular-nums` = 48 处使用 |
| skin-envelope.ts | 盒模型 border-box | 表面后代 + 伪元素 `box-sizing:border-box`（:65-66）与 ZCode 一致（ZCode 全局 `*,:before,:after`，本仓库限定在皮肤表面内，更窄、有意） | 主 bundle 内嵌 CSS：`grep -o '[*,:]{1,4}…{box-sizing:border-box' /tmp/zcode-main-bundle.js` → `*,:before,:after{box-sizing:border-box`（样式表 styles-9Z13W0KP.css 内无全局规则，preflight 在 JS 内嵌 CSS 中） |

### 无参照项（不得猜）

- hover-shell.tsx 悬停卡**宽度/估高**（`WORKSPACE_HOVER_CARD_WIDTH=316`、session 卡 248、估高 152/148，:21-22,:58-59）—— ZCode 侧栏行无富悬停卡（任务行标题走 marquee + 原生 title；全局 Radix tooltip 内容宽是弹性 `max-w-72`(288px)/`max-w-[min(28rem,calc(100vw-1rem))]`(448px)，非固定宽），不构成直接参照，跳过
- hover-shell.tsx **隐藏延迟** `HOVER_TIP_HIDE_DELAY_MS=120`（:20）—— ZCode tooltip 无「关闭延迟」常量；`skipDelayDuration:0` 的语义是「连续切换到下一个 tooltip 时不等待」，不对应本仓库的 hide 延迟，无例证，跳过
- sidebar-drag.ts **越限收起手势** `COLLAPSE_OVERSHOOT_PX=32`（:17,:24）—— ZCode 侧栏 pointermove（`wr`）只做 clamp + 写 CSS 变量，bundle 内未检出「拖过下限再多拖 N px 触发收起」的手势逻辑，收起触发方式未定位（03b-sidebar §4 也声明拖拽区间未采集），跳过
- workspace-directory-flow.ts 的槽转发机制（`sidebar.workspaces.directoryFlow` → `sidebar.codex.directoryFlow`，priority -1）—— `grep -a -c 'directoryFlow' app.asar` = **0**，该槽属 DSH 宿主（`@deepseek-ai/dsh-client-ui-workspace`）结构，ZCode 无对应机制，无从对账，跳过
- session-host.ts 的两个行为判定：全局面板打开时取消会话选中（`visibleSelectedSessionId`，:87-89）与未读合成规则（`sessionRowUnread = localUnread || (completionUnread && !selected)`，:91-93）—— 均为活体行为，03b-sidebar / 04-open-gaps / asar 静态源码均无记录，**未验证**，跳过（如需闭环须双端活体 CDP 采样）

---

### 审计方法备注（证据可复现）

- asar 头解析：前 16 字节 `0400000010ec6e000cec6e0006ec6e00` → header pickle 7269392B，数据区起点 7269400；`TooltipContent.js` 命中项经核实为 recharts 图表库文件，与 UI tooltip 无关（已排除）。
- 主 bundle（styles-CQuzX8si.js）与样式表（styles-9Z13W0KP.css）已按 asar offset 提取到 `/tmp/zcode-main-bundle.js`、`/tmp/zcode-styles.css`，上述 grep 均可对这两个文件复现。
- 本批未做任何活体（CDP）验证；凡涉及「活宿主行为」的判定均已标未验证，未以静态推断填充。
