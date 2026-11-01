# ZCode 设计语言覆盖率矩阵

> 建立：2026-10-30 ｜ 插件基线：v2.2.0 ｜ 口径：**只覆盖 DSH 存在的界面**（用户已定）
> 用途：把「完整继承 ZCode 设计语言」变成一张可判定、可关闭的表。没有这张表，「完整」是形容词；有了它，「完整」是 `未知格 = 0`。
> 维护规则：任何一格从 ❓ 变 ✅ 必须附证据（文件:行 / 断言名 / CDP 实测日期）。**禁止用「看着一样」关闭任何一格。**

## 口径说明（先读，防误读）

1. **状态来自已有记录，不是今天重新采样。** 本表建档时 ZCode 的 CDP 端口（9224）不可用，
   所有状态取自 `design-language/03*.md`、`04-open-gaps.md`、`zcode-design-truth.md` 中**带日期与实测值的记录**。
   凡记录本身标注 ❓ 的，本表一律保持 ❓，不升格。
2. **「不可移植」不等于「不做」。** 每一格不可移植项必须配一条 DSH 替代方案（域 F），否则算未处置。
3. **主动偏离 = 有意做得不同，且必须有登记理由**，不算缺口，但必须出现在表里（域 C/E）。
4. ZCode 设计语言来源：`zcode-design-truth.md` §7 可移植清单（A–L）、§7.2 不可移植清单、§7.3 不可信三项。

## 统计

| 状态 | 数量 | 含义 |
|---|---|---|
| ✅ 已对齐 | 52 | 有实测值 + 一致 |
| 🟡 部分 | 1 | B9 正文插图（DSH 侧无样本；2026-11-02 夜跑批次 7 后 G1/G4 已收口） |
| ❌ 缺失 | 0 | 整域缺失已在附录 A 定级并全部处置 |
| ➖ 不适用 | 12 | DSH 无对应面 / 由其它插件或宿主承担 |
| 🔀 主动偏离（已登记） | 3 | C10 标题溢出 ellipsis / C11 ARIA 键盘模型 / F6 品牌色（2026-11-01 保留 DSH） |
| ❓ 未知 | 1 | C12 UX3 互斥条件（活体复现后定） |
| **合计** | **69** | 正文 64 格 + 附录 A 反证新增 5 格 |

> **计数方式**：按状态列实算，**不手写**——行首格式含 A–F 域的 `^\| [A-F]\d+ \|` 与 G 域的
> `^\| \*\*[A-G]\d+\*\* \|`（G 行是粗体，早版正则漏配 G 域 5 格——2026-11-01 深审发现并更正口径）。
> 2026-10-30 教训仍有效：上一版写「57 格 / ✅35」是手填估算值，实算 **64 格 / ✅47**——「靠推算写数字」被 §1 禁止。

> 2026-11-02 夜跑推进（批次 1R-8，记录见 `design-language/night-audit/night-1102-batch-*.md`）：
> ① **G1/G4 🟡 → ✅**：DSH 锚点改从 asar css-module 静态提取（Q2dzhW/TXqvFW），无需活体展开，落码 + 断言（commit e6d2af2）。
> ② **批次 1R**：ZCode 码卡头部 `text-muted-foreground` 死类实锤（活体 888 规则 0 命中）→ 头部文字/语言标签提亮全前景 + 动作钮 28×28/r8（commit 8ea8f7d）。
> ③ **小面验证（不占格）**：kbd（prose kbd 为死规则，正文无 .prose 靶点，双默认一致）、::selection（唯一规则属 xterm 辅助层非正文）、del/sup/sub/mark（双默认）、task-list（双边无此面）、footnote（双边无）、mermaid（ZCode 有实现双端无样本留观察）——全部 ➖ 无需处理，详见批次记录。
> ④ **上游哨兵**：装机 asar styles sha256 入基线 + 接 gate（commit 3dc542d）；**断言加固**：B5-B9 十五条防删失（commit 51171a8）。
> 2026-11-01 二次推进（9224 开启后的活体批次，两次翻案 + 一次落码）：
> ① **B7 🟡 → ✅**：暗色活体逐项命中；**外框新发现**（ZCode 表格有 rounded-xl+1px 卡片框）→ 插件已补，横滚偏差登记。
> ② **B12 翻案+修复+活体三连 → ✅**：36×20 是 h-5/w-9 误归因，真值 32×18（双源）→ 插件已改 + 断言锁定；当晚人手开设置页 16 开关实测逐项命中（深审后本行同步关账）。
> ③ **B9 证据翻案**：正文插图无阴影（shadow-2xl 是灯箱 video 误记）；DSH 侧仍无样本，🟡 维持。
> ④ **G4 归属更正**：reasoning.tsx（非 chain-of-thought.tsx）；ZCode 展开体活体全命中（ml 8px/线1px/pl 14px/max-h 240）。
> ⑤ **G1-TC4 值定**（双源），TC6 = 🔀（用户拍板保持单行）。
> 过程记录见 `优化UI插件区/17-交接-静态预采样五格.md`；剩余收尾项 = TC4/G4 的 DSH 锚点落码（等静默窗口）+ C12 复现。

> 2026-10-30 首次活体/静态推进（三条，含一次自我更正）：
> ① **D5 ⁇ → ✅**（DSH 9223 实测 `hiddenNow=true`、`transitionProperty:none`、`animationName:none`）；
> ② **A10 ⁇ → ✅**（ZCode asar 内 `styles-NK68EN_n.css` 原文）：
> `--radius-xs/.sm/.md/.lg/.xl/2xl/3xl = .125/.25/.375/.5/.75/1/1.5rem = **2/4/6/8/12/16/24px**`。
> 与插件按兜底值实现的前五档**完全一致**，`zcode-design-truth.md` §7.3 的「不可信」标注**可以撤销**。
> ④ **B18 ❌ → ❓（前提被削弱）**：asar CSS 全量扫描无费用/余额类样式，只有 usage 色板。
> 「ZCode 底部有费用条」原本是 03e 的推断，现在**退回未证实**，不能据此判缺失。
> ③ **F3 ❌ → ➖（自我更正）**：上一版我凭「插件 grep katex = 0」判定「公式完全未对齐」，**错了**。
> 实测两边都吃官方原版 katex.css（ZCode 0.16.45 / DSH 0.18.7），插件不需要额外样式；
> 版本差属宿主依赖，不是设计语言偏差。**方法论教训：在对方侧确认「有渲染」之前，不能把「我方没写」当成「未对齐」。**

---

## A. 设计令牌与排版（来源：truth §2/§3/§4、01-design-tokens、03n-typography）

| # | ZCode 要素 | DSH 对应面 | 状态 | 证据 |
|---|---|---|---|---|
| A1 | 七级字号刻度 | `--dsw-font-size-*` 令牌层 | ✅ | `design-system.assert.ts` 禁止字面量字号 |
| A2 | 单一 `--ui-font-size` 缩放入口 | DSH 无字号缩放功能 | ➖ | 宿主不提供，无入口可接 |
| A3 | 颜色语义分层（背景/表面/浮层 + 前景三级） | `--dsw-alias-*` 令牌 | ✅ | 03g 主题审计全表 |
| A4 | 前景三档 alpha（深 90/60/30、浅 90/58/40） | 正文/次级/最弱档 | ✅ | 04 §剩余待办 ①，浅色最弱档改 0.4 |
| A5 | 4px 间距基数 | padding/gap 全域 | ✅ | 03h 细节清扫 |
| A6 | 圆角按嵌套递降 + 2xl 白名单 | `--dsw-radius-*` | ✅ | 断言禁止字面量圆角 |
| A7 | 字重 400/500/600 | 正文/次级/标题 | ✅ | 03n |
| A8 | 正文行高 24.5px / 14px | 会话正文 | ✅ | C3 活体 |
| A9 | 字距 0.35px | 正文 | ✅ | 03n T1 排版节奏 |
| A10 | `--radius-*` 真实值 | `--dsw-radius-*` | ✅ | 2026-10-30 asar 提取 `styles-NK68EN_n.css`：`--radius-xs .125rem / sm .25 / md .375 / lg .5 / xl .75 / 2xl 1 / 3xl 1.5` = 2/4/6/8/12/16/24px；插件前五档同值 |

## B. 组件外观

| # | ZCode 要素 | DSH 对应面 | 状态 | 证据 |
|---|---|---|---|---|
| B1 | 内容列宽 924px | 会话列 | ✅ | C1 活体 924 |
| B2 | 轮组间距 20px | 用户轮 margin-top | ✅ | C2（走宿主 `--dsh-chat-flow-gap` 口子） |
| B3 | 用户轮右对齐气泡（radius 12 2 12 12、12/16 内距、576 限宽） | 用户气泡 | ✅ | G17 8/8 活体 |
| B4 | 长气泡 120px 折叠 + 底部渐隐 + 展开钮 | 用户气泡 | ✅ | G18（1580px 174↔1648） |
| B5 | 围栏代码块（外层无圆角 + shiki 双主题码体） | 代码块 | ✅ | D1，深色 63 块残留 0 |
| B6 | 行内码 `color-mix(tag 50%)` + radius 6 | 行内码 | ✅ | D1/TA3 |
| B7 | 表格 14/24.5、8-12 内距、1px 10% 行线、表头最弱档 | 会话表格 | ✅ | 2026-11-01 暗色活体（9224 GLM 会话）：14/24.5、pad 8/12、行线 1px 白10%、th 400+30%、td 全前景逐项命中；**外框裁决=有**（rounded-xl 12px + 1px border 透明底、th 非 sticky）→ 插件已补 table 边框（conversation-layout.ts:350，gate exit 0）；已知偏差：DSH 框随内容横滚（ZCode 框固定），CSS 无法加包装层，登记不强攻 |
| B8 | 引用块 4px 竖线 + 斜体 + 500 | blockquote | ✅ | 04 §剩余待办 ③ 活体 |
| B9 | 附件图 `rounded-xl` + 1px 边 | 附件缩略图 | 🟡 | 附件 ✅；正文插图真值已定（2026-11-01 编译 JS：img `max-h-90(360px) rounded-xl` + 1px 边 + `object-cover`，**无阴影**——旧记「shadow-2xl」是 ImagePreviewDialog 灯箱 video 误记，conversation-layout.ts 注释已更正）；**DSH 侧仍无正文插图样本**（9224 GLM 会话 4 个 img 全为图标/头像），出样本即按此规格对照 |
| B10 | composer 卡片：1px 15% 边、12 内距、12 gap、20 行高、按钮全 8px | 输入区 | ✅ | C5–C9 + P2 |
| B11 | 顶栏：48 含边框、1px 5% 底边、24 对称内距、页签 14/600、图标钮 28×28/8 | 顶栏 | ✅ | HD1–HD5 活体 |
| B12 | 设置页：卡片 #161616/#fbfbfb r12、导航 16/r12/h32、下拉 h32/r8/14、开关 **32×18**/全圆 | 设置页 | ✅ | 2026-11-01 翻案+修复+活体三连：旧「36×20/r8」是 h-5/w-9 误归因；v3.17.1 switch.tsx+编译 CSS 双源 = 32×18/p-px/thumb16/calc(100%-2px)/无阴影 → 插件已改+4 条断言锁定；**ZCode 活体（人手开设置页，常规分区 16 个开关实测）：32×18、pad 1px、全圆、thumb 16×16、unchecked=primary 30%、thumb 视觉无阴影（ring-0 的 0 宽 ring 残留）逐项命中**；checked 轨道=白/拇指=黑（暗色），纯黑白品牌与 F6 记录一致 |
| B13 | 侧栏 264 / #161616 / 任务行 / 会话行 / 三档色 | 侧栏 | ✅ | 03b 十八维矩阵 |
| B14 | 搜索浮层 512/16/无影/胶囊/tag 选中 | ⌘K 命令面板 | ✅ | 03i |
| B15 | 弹窗 panel 16 / padding 16 / gap 20 | 宿主模态 | ✅ | 03j A5/A6 |
| B16 | 右键菜单三段式 + 键帽 | 行上下文菜单 | ✅ | 03k |
| B17 | 轮次导航刻度几何（36×10 button / 12×2 刻度 / pitch 10） | 轮次导航 | ✅ | `ZCODE-INDEX-SPEC.md` |
| B18 | 底部 footer（费用条 / 上下文水位） | DSH `.dcu-foot`（264×308） | ➖ | 已并入 G3：ZCode 侧该信息在**设置页 usage-stats 图表面板**，DSH 侧由 `dsh-cost-meter` 自绘，均不属本插件 |
| B19 | 侧栏折叠 rail | 折叠态侧栏 | ✅ | 03b + verify-sidebar-* |
| B20 | 空状态口气与版式 | 空会话 | ✅ | 03p startup + §11.2 签名细节 |

## C. 交互与键盘（来源：ZCODE-INTERACTION-PARITY §1–§2）

| # | ZCode 要素 | DSH 对应面 | 状态 | 证据 |
|---|---|---|---|---|
| C1 | 行键盘可达（tabIndex/Enter/Space） | 会话行 | ✅ | #1 |
| C2 | 聚焦与悬停同权 | `:focus-within` | ✅ | #2 |
| C3 | 归档两步确认 | 行菜单归档 | ✅ | #3 |
| C4 | 菜单顺序 rename→archive→unread | 行菜单 | ✅ | #4 |
| C5 | 状态指示单一前置槽（error>unread>running） | 行状态槽 | ✅ | #6（error 档 DSH 无对应） |
| C6 | 触屏常驻操作 | `(hover:none)` | ✅ | #11 |
| C7 | 会话置顶（前置槽钉 + hover 变按钮） | 宿主 pinSession | ✅ | #13 |
| C8 | 拖拽到 workbench | 项目内排序 + 跨项目移动 | ✅ | #14 |
| C9 | 快捷键总表（⌘K/B/F/N…） | `ctx.shortcuts` | ✅ | #15 + 1.8.0 |
| C10 | 标题溢出 mask 渐隐 | 标题 | 🔀 | #12：DSH 用 ellipsis，有意偏差已登记 |
| C11 | ARIA 树键盘模型 | 会话树 | 🔀 | 主动偏离（1.10.0），修正自身声明不一致 |
| C12 | 官方导航与本插件导航的互斥条件 | 轮次导航挂载 | ❓ | UX3：`supported=true` 但官方 nav 未挂载时会「两条都没有」，未改 |

## D. 动效（来源：02-motion、truth §6）

| # | ZCode 要素 | DSH 对应面 | 状态 | 证据 |
|---|---|---|---|---|
| D1 | 按意图分档（反馈最短→移动最长，进出不同曲线） | 全站过渡 | ✅ | 02-motion 实测达标区 |
| D2 | 工作流时间线 `--wf-*` 整套 | 无 | ➖ | ZCode 产品语义专属 |
| D3 | reduced-motion 三行为（归零 / 停静止帧 / 默认不带） | JS 驱动动画 3 处 | ✅ | 03h |
| D4 | `transition-colors` 优先、压制 `transition-all` | 按钮 | ✅ | truth §7 H；插件按此写 |
| D5 | `html[data-document-hidden]` 期间全局禁动画 | 后台流式 | ✅ | 2026-10-30 活体（9223）：属性在位、`transitionProperty:none`、`animationName:none`、规则命中 1；实现见 `document-hidden-motion-pause.ts` + `zcode-theme.ts:204` |
| D6 | 长距离滚动 px/帧预算 | 轮次导航跳转 | ✅ | TCP-01（瞬移+双 rAF） |
| D7 | 流式视觉 = 淡入 + 关高亮（无彩色指示） | 流式正文 | ✅ | F1 定案 |

## E. 可访问性

| # | ZCode 要素 | DSH 对应面 | 状态 | 证据 |
|---|---|---|---|---|
| E1 | 焦点环（`:has()` 画在非聚焦元素） | 全局 | ✅ | 27 轮活页面 12 元素全有环 |
| E2 | 图标可访问名 | 全部可见按钮 | ✅ | 2026-10-31 复测（第 28 轮口径）：**插件侧 0 个**无标签；宿主侧发现 1 个（过程面板 commands 钮，登记 KNOWN-ISSUES §66） |
| E3 | 空态 `aria-live` / `role=status` | 空态 | ✅ | 27 轮 5 + 6 个 |
| E4 | `aria-pressed` | 反馈类按钮 | ✅ | 27 轮 18 个 |
| E5 | 三档对比度 AA | 侧栏文本 | ✅ | G14（sec 6.23 / ter 4.75） |

## F. 不可移植项与替代处置（truth §7.2）

| # | ZCode 特有实现 | DSH 处置 | 状态 |
|---|---|---|---|
| F1 | Electron vibrancy（根背景透明） | 不透明实色 + OpenDesign 9 组合实测裁决 | ✅ 已替代（UX4） |
| F2 | xterm 终端 + 22 个 ANSI 令牌 | DSH 无终端面板 | ➖ |
| F3 | KaTeX 样式 | 两边均官方原版 · ZCode 0.16.45 / DSH 0.18.7 | ➖ 无需插件介入 |
| F4 | 平台窗口 chrome 四变体 | 宿主自绘标题栏 | ➖ |
| F5 | 桌面窗口圆角（16/12/4 内缩） | 宿主窗口层 | ➖ |
| F6 | Zai 纯黑白品牌色（#000/#fff） | 需替品牌色策略 | 🔀 **保留 DSH 品牌色**（2026-11-01 用户拍板：插件保留自身品牌识别度，其余设计令牌继续对齐 ZCode） |
| F7 | 领域色板 80 个 | 多数无对应物 | ➖ |
| F8 | Lucide 前景混合插桩 | 插件用 `lucide-react` 同源 | ✅ |
| F9 | `full-page desktop overlay` 规则 | 宿主页面 | ➖ |
| F10 | 主题名/storage key（zai-light/zai-dark） | 插件自有 `theme-zai-*` 类名 | ✅ 已映射 |

---

## 未知格补采清单（4 格，按可执行度排序）

| 格 | 补采动作 | 阻塞 | 判定表 |
|---|---|---|---|
| B7 暗色表格 | CDP 采 ZCode 暗色表格 | **需 ZCode 开 9224** | th/td 内距 8-12、行线 1px 10%、表头最弱档 ⇒ ✅ |
| B9 正文插图 | ZCode 打开含正文插图的会话 | 需 ZCode 开 9224 + 有样本 | 插图为 `rounded-xl` + 1px 边 ⇒ ✅ |
| B12 开关 | ZCode 设置页开关 | 需 ZCode 开 9224（点不开设置页，需人手） | **32×18**/p-px/thumb 16 ⇒ ✅（2026-11-01 活体 16 开关确认；旧记 36×20 是 h-5/w-9 误归因，已翻案） |
| C12 UX3 | 卸载官方 nav 观察是否两空 | 需改宿主状态（可回滚） | 出现「两空」⇒ 需加互斥兜底 |
| ~~D5~~ | ✅ 2026-10-30 关闭（9223 活体） | — | — |
| ~~A10~~ | ✅ 2026-10-30 关闭（asar 提取，2/4/6/8/12/16/24） | — | — |
| ~~F3~~ | ➖ 2026-10-30 关闭（两边均为原版 KaTeX，无需介入） | — | — |
| B18 footer | 活体确认 ZCode 是否存在费用条/上下文水位面 | 需 ZCode 9224 | 存在 ⇒ 采规格；不存在 ⇒ ➖ 并撤销 03e 的推断 |

## 已知的「文档缺口」（不是设计缺口，但会让下一轮重复劳动）

1. **B18 底部 footer 从未提取**：ZCode 侧费用条/上下文水位的规格（尺寸、色、内距、更新节奏）目前是空白。DSH 底部有对应元素，两边都没采。
2. **`04-open-gaps.md` 的「组件成熟」表未包含 footer**，所以「open = 0」这句话的成立范围是「已列入的组件」，不包括未提取的面。

## 下一步（按此顺序，不跳步）

1. 你先让 ZCode 以调试端口启动（`--remote-debugging-port=9224`）——这是 B7/B9/B12 三个 ❓ 的唯一解药，也是「细微细节一致」的硬前提。
2. 我用 9223 先关掉 D5 / F3 两格（不需要 ZCode）。
3. 提 footer 规格（B18）→ 它大概率是剩余最大的一块空白。
4. 其余 ✅ 项做一次回归复核（跑现有 gate），确认记录与当前实现没有漂移。

---

## 附录 A · 反证：用 ZCode v3.17.1 源码树校验矩阵是否漏面

> 动机：本表由 `design-language/03*.md` 等**既有 30 轮文档**反推而来，会继承那些文档的盲区。
> 方法：拉 `zai-org/ZCode` 仓库 **v3.17.1**（与本机安装版本号一致，8380 star，2026-10-30 推送）的
> `packages/ui/src` 全树（2198 文件），按目录枚举用户可见面，逐个与矩阵对账。
> 判定「DSH 有没有对应面」用插件自身 `src/` 的命中情况（插件就是在 DSH 上挂 UI 的那一层）。

### A.1 源码树里的用户可见面（按文件数排序，节选）

| ZCode 目录 | 文件 | 是什么 | 矩阵现状 |
|---|---|---|---|
| `v4/`（227） | 39 composer + 表格/气泡/header 等 | 会话主界面 | ✅ 已覆盖（B1–B4、B10–B11） |
| `ToolCallBlocks/renderers`（**68**） | 每种工具一个 renderer | **工具调用卡片** | ❌ **整域缺失** |
| `settings/`（222） | 含 `usage-stats`(14)、`saved-workflows`(25)、automations/hooks/commands/browser/coding-plan… | 设置页各分区 | 仅覆盖骨架（S1–S3b） |
| `project-sidebar/`（71+21） | 任务行/会话行/分组 | 侧栏 | ✅ B13 |
| `components/ai-elements`（62） | code/table/image/blockquote/**chain-of-thought**/mermaid/artifact/citation… | 消息元素族 | 部分（B5–B9），**推理块缺** |
| `app-shell/`（72） | SidePane 族/终端面板/子 agent 面板/工作流面板 | 左右侧面板 | ❓ 插件 `src` 0 命中 |
| `components/workflow-timeline`（55） | `--wf-*` 时间线 | 工作流 | ➖ D2（DSH 无同类） |
| `feedback/`（28） | 反馈中心/工单/截图 | 产品反馈 | ➖ DSH 无 |
| `workspace-file-tree/`（**22**） | 文件树 + git 状态 + 粘性文件夹 | **文件树** | ❌ **整域缺失** |
| `chat-input-toolbar`（24） | 输入区工具条 | composer 工具条 | 🟡 B10 只覆盖主体 |

### A.2 差集：矩阵漏掉的、且有 DSH 对应物的域（本轮新增）

| 编号 | 面 | ZCode 依据 | DSH 依据（插件 src 命中） | 状态 |
|---|---|---|---|---|
| **G1** | 工具调用卡片（摘要行/内容体/状态/进度） | `ToolCallBlocks/` 83 文件，68 个 renderer | 活体 38 条 `tool-call`，行 `.baXwkG_callRow` | ✅ **摘要行已对齐**（2026-10-31）：TC1/TC2 落地活体过；TC5 撤销（本就 role=button）；TC3 不做（宿主无 progress）；**TC6 = 主动偏离 🔀**（2026-11-01 用户拍板保持单行省略，ZCode line-clamp-3 会改变行密度）；**TC4 值已定**（2026-11-01 双源：外层 `max-h-60 rounded-xl border bg-muted/15 px-3 py-3` + bash pre `max-h-[5lh] leading-5 text-foreground-subtle`；9224 活体确认工具行常规态就是收起摘要 h=21）；**TC4 DSH 已落码**（2026-11-02 夜跑批次 7，commit e6d2af2）：锚点从 DSH asar css-module 静态提取（`Q2dzhW_ioCard/ioSection`），落 radius xl / 边 1px l2 / 内距 12/12 + 5 断言；底色（`bg-muted/15` 系 ZCode 死类——主题无 `--color-muted`，编译产物 0 命中）与限高（密度域，TC6 先例）显式不落登记 |
| **G2** | 工作区文件树 | `workspace-file-tree/` 22 文件，行高 28/缩进 12/git 字母 M A D R U | **DSH 无文件树**：活页面 0 条文件名行；宿主包 `FileTree/file-tree` 符号 0 命中；插件的 `.dcu-wb-tree` 是项目/会话树（B13），`native-explorer.ts` 只是调起系统文件管理器 | ➖ 不适用 |
| **G3** | 用量统计面 | `settings/usage-stats/` 14 文件：热力图 / 日趋势 / 模型饼图 / 套餐条形折线 | 用量与余额由**第三方插件 dsh-cost-meter** 自绘在侧栏 footer；本插件只做外来内容契约（`foreign-surface-discovery.ts` 标 `converged`） | ➖ 不适用（非本插件的面） |
| **G4** | 推理/思维链块 | **`ai-elements/reasoning.tsx`**（2026-11-01 归属更正：矩阵原引 chain-of-thought.tsx 是通用步骤 kit 非聊天思考块；ConversationTurnRow 传 `reasoningContentVariant` 与其 variant 对上）：内容体 default 变体 = `ml-2(8px) border-l 1px border-border pl-3.5(14px)` + `max-h-60(240) space-y-2 overflow-auto text-ui-base text-foreground-subtlest` | 2026-11-01 ZCode 活体（9224）：`.group/reasoning` 触发钮类逐字命中源码；展开体 8px/1px/14px/240px/14px-21px/30% 全实测吻合。DSH：`[data-turn-process]` 触发语义一致；展开内容在兄弟 flowItem `TXqvFW_root`（标题+正文段落+工具行交错，**无竖线**，已目检截图）| ✅ ZCode 侧全锁 + **DSH 已落码**（2026-11-02 夜跑批次 7，commit e6d2af2）：DSH asar css-module 静态提取证实 `TXqvFW_body` 与 ZCode reasoning 内容体**同构**（同为滚动容器包思考流，折叠态 h=0 竖线不显形）——竖线 ml8 + border-l 1px l2 + pl14 已落 + 3 断言；限高不落（DSH 400px/50vh 自适应属自有设计）；展开态活体目检留用户在场时补 |
| **G5** | 左右侧面板（子 agent / 终端 / 计划详情） | `app-shell/` 72 文件 | 活体：`[data-dsh-session-kit-left-nav]`×1、`[data-dsh-session-kit-right-nav]`×1 均存在；插件 `src` 0 命中侧面板代码 | ➖ 由宿主 session-kit 承担，插件不参与 |

**B18 修正**：原写「ZCode 的用量在底部 footer」——**错了**。ZCode 的用量是 **设置页的 `usage-stats` 分区**；
DSH 把同类信息放在侧栏 footer（`.dcu-foot`）。这是**信息落位不同**，不是缺面。B18 併入 G3，不再单列。

### A.3 确认为「不适用」的（有源码证据，不是猜）

| ZCode 面 | 为什么 DSH 不适用 |
|---|---|
| `feedback/` 28 文件（反馈中心/工单/截图/附件上传） | DSH 无反馈工单体系；「好的回答/有问题的回答」按钮已在 E4 覆盖 |
| `components/workflow-timeline/` 55 文件 + `app-shell/workflow-*` 15 | 动态工作流是 ZCode 产品语义；DSH 的「任务/计划」是另一套（ScheduleBrowser），不构成同面 |
| `settings/coding-plan`、`marketplace`、`model-provider-section`(56) | 商业套餐/插件市场/供应商配置，DSH 侧由宿主或其它插件承担 |
| `app-shell/AnimatedTerminalPanel`、`BackgroundBashOutputSidePane` | DSH 无内嵌终端面板 |

### A.4 结论

- 矩阵原有 64 格**没有错填**，但**不完整**：漏了 3 个有对应物的整域（G1/G2/G3）+ 2 个待确认（G4/G5）。
- 「完整继承」的真实分母不是 64，是 **69**（新增 5 格）。
- 反证方法可复用：以后任何「是否覆盖全」的问题，都用源码树做分母，而不是用历史文档做分母。
