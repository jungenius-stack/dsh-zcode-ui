# surface-13 · 无参照二轮攻坚（2026-11-03）

> 对象：`night-audit/batch-1..20` 与 `gapfill-1..20` 全部残留「无参照/未提取到/需活体」条目，第三轮集中再攻。
> 方法：① 9224 活体（WS 直连 `/tmp/zcode-debug.log` 里的 browser endpoint，只读 evaluate，不导航不点击）；② 运行时样式表 `night2/zcode-live-styles.css`（480,065 字节，ZCode 真正加载的那份）；③ asar `grep -a` 换策略（组件名图=lucide path/组件类名、样式串=编译后工具类、路由键=设置路由/i18n 前缀族）。
> 本轮新证据基座：活体 `:root` 变量全量 dump（353 个：342 `--color-*` + 8 `--radius-*` + 4 `--shadow-*`）落盘 `/tmp/zcode-root-vars.json`；字号阶梯 `--text-ui-2xs`=9px、`xs`=10、`sm`=12、`caption`=13、`base`=14、`lg`=16、`xl`=**18**、`settings-title`=24、`settings-title-lg`=30。
> 铁律遵守：只新建本文件；diffs 8 条（≤15）；不改 src/tests/文档。

---

## 一、本轮定案的三个「挂起项」（先说结论）

### 1. `--color-ring` 定义值 —— **定案：ZCode 无此令牌定义**（gapfill-10 挂起 → 关闭）

| 证据面 | 命令/位置 | 结果 |
|---|---|---|
| asar 静态 | `grep -a -c -- '--color-ring:' app.asar` | **0** |
| 运行时 CSS | `grep -o -E -- '--color-ring:[^;}]{1,80}' zcode-live-styles.css` | **0 定义**（仅 1 处 `var(--color-ring)` 消费） |
| 活体 ：root | CDP `getComputedStyle(documentElement)` 全量枚举 353 变量 | **无 `--color-ring`**（342 个 `--color-*` 里没有它） |
| 活体 adopted/shadow | 遍历 `document.adoptedStyleSheets` + 9,722 个节点 shadowRoot 样式 | **0 命中** |
| 消费点 | live styles：`.composer-thought-slider:has(input:focus-visible){outline:2px solid var(--color-ring);outline-offset:2px}`、`.wf-tile:has(.wf-tile-hit:focus-visible){outline:2px solid var(--color-ring)}` | **2 消费 / 0 定义** → 回退 initial（currentColor） |
| ZCode 真实焦点语言 | live styles `:focus-visible` 规则枚举 | 主流是 **`focus-visible:border-*` 换边框色**（border-primary、border-input-border-focused、border-primary/35 等 12 条）；outline 侧仅 3 条：`outline:none!important`×2 + `.focus-visible\:outline-primary{outline-color:var(--color-primary)}`×1；`--color-primary` = **#000（浅）/#fff（深）纯中性**（asar 静态双值 + 活体 #fff 互证） |

**推论**：ZCode 没有蓝色焦点环。uiplug `--dsw-focus-ring-color: #0b7fff/#4099ff`（`zcode-tokens.ts:261,487`，消费 `DesktopNavigationControls.tsx:10`）的色值在 ZCode **无任何依据**（这两个 hex 在 ZCode 是终端选区/图表语义，batch-10 已警告过）；ZCode 焦点语言 = border 换色（primary 中性色）或 `outline-primary`。→ 进差异表 #4（deviation）。

### 2. composer 加号 hover 底色 —— **定案：`--color-hover`（5% 混合）**（batch-19 挂起 → 关闭）

活体组件名图（lucide plus path `M5 12h14`/`M12 5v14` 扫 button，CDP 实测）：
```
4 个加号钮：静息 bg = rgba(0,0,0,0)（透明）
hoverCls = ["hover:bg-hover hover:text-foreground aria-expanded:bg-hover aria-expanded:text-foreground"]
几何 = 28×28 / rounded 8px（主档 ×3）与 24×24 / 6px（×1）；disabled:opacity-50
```
`--color-hover` 活体值 = `#0d0d0d0d`（浅）/`#ffffff0d`（深）= **5%**（night2 live-findings 已采，本轮复证）。
uiplug 现行（`composer-visuals.ts:29`）= `--dsw-alias-interactive-bg-hover-solid` = **实底 #f0f0f0/#2b2b2b**（`zcode-tokens.ts:145,376`）。→ 进差异表 #1（mechanical）。

### 3. ZCode 设置页有无「关于」分区 —— **定案：无**（batch-9/batch-17 挂起 → 关闭）

i18n 前缀族检索（asar）：
- `grep -a -o -E '"settings\.sidebar\.[a-zA-Z.]+"' ` → 仅 3 个分组键：`basics`/`agentCapabilities`/`dataAndStats`（+`settings.navLabel`=「主要项」）
- `grep -a -o -E '"[a-zA-Z.]*about[a-zA-Z.]*":`…`'` → 唯一命中 `titleBar.menu.help.about`=「关于 ZCode」（**标题栏帮助菜单**，非设置分区）
- 路由键 `grep -a -o -E '/settings/[a-z-]+'` → 仅 `/settings/generate`×4，无 `/settings/about`

**推论**：AboutSection 全部几何（min-h32/28/64、h2 20/28、progress 4px、wave 1.2s、轮询 800ms、IO 0.2）在 ZCode 无载体，「ZCode 设置导航无 about 分区」（gapfill-9）维持且加 i18n 双证；`ABOUT_SETTINGS_NAV_ORDER='2147483647'` 置尾为插件自有。→ 进无参照表 A-9。

---

## 二、差异表（本轮新增，8 条 —— 宁缺毋滥）

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | composer-visuals.ts:29 + zcode-tokens.ts:145,376 | 加号 hover 底 | 实底 `--dsw-alias-interactive-bg-hover-solid` #f0f0f0/#2b2b2b | `hover:bg-hover` = `--color-hover` 5% 混合 #0d0d0d0d/#ffffff0d；静息透明 | **mechanical** | 活体加号钮 4 个 hoverCls 全量提取（见定案 2）；与全仓已对齐的 5% hover 令牌一致化即可 |
| 2 | CodexSettingsPage.tsx:83 | 设置页退出动画 140ms ease-out | `element.animate(opacity→0, 140ms)` | **无任何进出动画**：设置页=视图层直接挂载/卸载 | **mechanical** | gapfill-13:59 asar 定案（本轮采信）；对齐=去掉退出动画或登记 DSH 适配 |
| 3 | CodexSettingsPage.tsx:229 | 设置搜索前导图标 15px | `ZIconSearch size={15}` | `size-4`=16px（NN 组件 `Dc`：`left-3 size-4 text-foreground-subtle`） | **mechanical** | gapfill-13:112（15px 全库 0 档：无 `size-3.75`/`size-[15px]`） |
| 4 | zcode-tokens.ts:261,487 + DesktopNavigationControls.tsx:10 | 焦点环色 #0b7fff/#4099ff、outline 2px 内缩 | `outline:2px solid var(--dsw-focus-ring-color)` offset −2px | 无 ring 令牌（2 消费点回退 currentColor）；焦点=border 换色 primary（#000/#fff 中性）或 `outline-primary` | **deviation**（改方案牵动导航钮全套 outline 结构，登记不修） | 本轮定案 1 全链 |
| 5 | TurnNavigator.tsx:35 | 浮层阴影 `0 8px 24px rgba(0,0,0,.28)` | .28 alpha 自定 | 主 UI 阶梯仅 sm/md/lg（lg=`0 10px 15px -3px #0000001a,0 4px 6px -4px #0000001a` 活体）；`0 8px 24px` 几何只存在于 **GitHub Primer** 令牌（`--color-shadow-large: 0 8px 24px rgba(140,149,159,.2)`/dark `#010409`，@261426141 起 `--color-fg-default:#24292f`、`--color-primer-*` 同块=workbench 皮肤）与 docx 页纸张内联（@27008852，`rgba(0,0,0,0.08)`） | **deviation**（另注：同仓 `--dsw-shadow-lv3`（zcode-tokens.ts:527）用 .08 同 docx 纸张值，与 TurnNavigator .28 内部不一致） | live styles `8px 24px` 0 命中 + asar 两语境开窗 |
| 6 | zcode-tokens.ts:105 | `--dsw-alias-label-tertiary` = rgba(38,38,38,**.5**) | 50% 第三档 | 前景阶梯**只有两档**：`--color-foreground-subtle`=60%、`--color-foreground-subtlest`=30%（活体 color-mix 原文） | **deviation**（映射 60% 还是 30% 属裁决；tertiary 槽位无 ZCode 对应） | /tmp/zcode-root-vars.json 原文 |
| 7 | hover-tip.ts:11 | 卡片锚 `rect.right+8` | 8px 水平偏移 | radix `sideOffset` 分布：**4(×24) 主流、6(×12)、2(×3)、8(×2 仅轮次导航 tooltip)、0(×1)** | **deviation**（8 是边 fringe 档；自绘卡改 popper 属结构改动，登记） | `grep -a -o 'sideOffset:[0-9]+' asar` 分布表 |
| 8 | CodexSidebar.tsx `.dcu-menu-kbd` 高 20px | 菜单键帽 20px | 20px/xs | ZCode 键帽两组均 **h-4=16px**（tooltip kbd：rounded-md/px-1.5/text-ui-xs/bg-tooltip-tag；⌘K 行内 chip：h-4/min-w-7/rounded-sm/bg-surface/text-ui-base）——侧栏菜单行**不显示**键帽（1.4MB 窗口 kbd 零命中） | **mechanical**（gapfill-2:124 已登记规格冲突，本轮活体字号阶梯复证 16px 档；不重复修，列此存档） | gapfill-2 命中原文 + 本轮 `--text-ui-xs`=10px 复核 |

（已由 gapfill 登记未修的——搜索浮层 scrim 48% vs 60%+blur、入场 translate/scale vs duration-100、页签带/滑块 18% vs `--color-selected` 10% 等——不重复计。）

---

## 三、已对齐表（本轮活体/静态再证）

| 项 | uiplug | ZCode（本轮证据） | 状态 |
|---|---|---|---|
| 禁用档 0.5 | switch `disabled .5`（settings-page-styles.ts）等 | composer 按钮族 `disabled:opacity-50`（活体类串×4）；live styles `.opacity-50`×8 处 | ✅ 同值（batch-17 结论维持） |
| hover 语言 | 菜单 hover 令牌 `--color-menu-hover` | `hover:bg-hover hover:text-foreground aria-expanded:bg-hover`（活体加号钮原文，与 APPLIED.md #8/#15 方向一致） | ✅ 机制同构 |
| 字号阶梯 | caption 13 / sm 12 / base 14 等档位 | `--text-ui-caption`=13px、`sm`=12、`base`=14、`lg`=16、`xl`=18（活体 calc 原文） | ✅ 档位吻合 |
| 浮层圆角 2xl | `--dsw-radius-2xl` 消费（TurnNavigator/archive-confirm） | `--radius-2xl`=1rem=16px（活体） | ✅ 同值 |
| 菜单壳 | p-1/rounded-lg/bg-menu/shadow-md/gap-0.5（composer-tool-menus.ts:15） | `--shadow-md`=`0 4px 6px -1px #0000001a,0 2px 4px -2px #0000001a`（活体；gapfill-15:58 类名层逐值一致，本轮令牌值再证） | ✅ |
| 28×28/r8 工具钮档 | CodexSidebar.tsx:151-152 头部图标钮 28×28/r8 | 活体加号钮 28×28/8px 主档 ×3 | ✅ 同档（batch-2 悬案「取 24 还是 28」得活体旁证：两档并存，28 是 composer/头部主档） |
| 设置标题 18px/lh26 | settings-page-styles.ts:89 fs-xl18/lh26/600 | `text-ui-xl font-medium leading-[26px]`（automations 对话框标题，asar 原文；字重 500 vs 600、字距 -0.12 vs -0.2 两点不同） | ✅ 尺寸/行高同值（差两点进无参照表 B-8 注） |
| `.opacity-55` 存在性 | 文档按钮 disabled .55 | ZCode `.opacity-55` 工具类存在但唯一消费是泳道图 `stroke-[2] opacity-55`（laneIndex 图形，非禁用态） | ⚠️ 类存在≠语义同位（记入无参照 B-6） |

---

## 四、无参照表（已穷尽清单）

> 每条给出：残留点 → 本轮换过的检索策略与命令 → 判定。gapfill 已给全模式搜索的，本轮补「复核」后收敛。

### A. 机制/架构性 —— ZCode 是宿主本体，无对应物（不再挖）

| # | 条目（出处） | 穷尽记录 |
|---|---|---|
| A-1 | foreign-surface-discovery 哨兵预算 8ms/4条/400ms（batch-10） | gapfill-10 实测 DSH 前缀 0 命中、budget/deadline 全为 RPC/token 语境；维持 |
| A-2 | PluginConfigSection 插槽白名单/SlotEntryBoundary（batch-10） | gapfill-10：renderSlot 0、插件 UI 出口=side-pane；SlotEntryBoundary 与 react-error-boundary 机制同构、粒度自有；维持 |
| A-3 | workspace-directory-flow 槽转发（batch-16） | `grep -a -c directoryFlow` = 0（gapfill-16 复跑）；DSH 宿主结构 |
| A-4 | host-anchor-contract（batch-13） | gapfill-13：14 模式全 0（DSH 哈希类名属宿主） |
| A-5 | companion-slots（batch-20） | gapfill-20：纯状态逻辑 0 决策点；维持 |
| A-6 | session-manager（batch-9）/ navigation-history（batch-14）/ archive-session-delete（batch-14）/ turn-rail-dedupe（batch-12）/ schedule-group-actions+draft-attachments（batch-18）/ workspace-compat+settings-focus（batch-6）/ session-navigation（batch-7）/ footer HIDDEN_FOOTER_ACTION_IDS（batch-7）/ virtual-skip 默认关+?session=+分区 order（batch-6）/ workspace-shortcuts+official-slot-shadow（batch-5）/ pinned 自有数据流（batch-19）/ conversation-dom 命名契约（batch-19）/ `:root:root`+SKIN_VERSION（batch-20）/ open-path 错误码分流（batch-11）/ UNKNOWN_SESSION+输入历史限额+slots order（batch-17）/ 键提示条 search.hint\*（batch-4） | 各 gapfill 均以「无 UI 决策点」或「架构性无对应」关账（gapfill-6:32、7:59,67、9:169、12:72、14:26,57、15、16:99、17:65、19:48,78、20:20）；本轮无需再攻，**后续批次不得重复挖掘**（gapfill-12 原话） |
| A-7 | 新建建议四分类措辞（batch-4） | gapfill-4：内容服务端按职业下发，无本地四分类；同型结构/交互已有参照 |
| A-8 | 频道树轮询 4000ms/8s（batch-11） | gapfill-11：频道表面=0；机制形状旁证（PJt 5min 协调器）已有，数值不引 |
| A-9 | AboutSection 全部几何（batch-17） | 本轮 i18n 前缀族+路由键：settings.sidebar 仅 3 组键、about 仅 titleBar 帮助菜单、无 /settings/about → ZCode 无关于分区，几何无从对账（见定案 3） |

### B. 数值/样式类 —— 本轮再攻后仍无（附检索）

| # | 条目（出处） | 本轮检索（全部实跑） | 判定 |
|---|---|---|---|
| B-1 | exit 曲线 `cubic-bezier(.4,0,1,1)`（batch-8） | live styles `cubic-bezier\(\.?0?\.?4, ?0, ?1, ?1\)` = **0**；asar 同型 = **0** | 穷尽。ZCode 曲线谱系（活体分布）：`.45,0,.55,1`×4、`.22,1,.36,1`×4、`.34,1.56,.64,1`×3、`.33,0,.16,1`×3、`0,0,.2,1`、`.4,0,.2,1` 等——无加速无回弹的 `.4,0,1,1` 形 |
| B-2 | press 档 90ms（batch-8） | live styles `90ms` 唯一命中 = `.wf-face[data-motion=shake] .wf-face-bounce{animation:wf-face-shake 90ms linear …}`——**工作流表情抖动动画，语义无关** | 穷尽（字面量在包、语义无） |
| B-3 | TurnNavigator 72 截断 TURN_SUMMARY_LIMIT=72（batch-14） | asar `(slice\|substring\|substr)\(0, ?72\)` = **0** | 穷尽 |
| B-4 | TurnNavigator 760px 断点（batch-14） | asar：`min-w-[760px]` 唯一消费是表格网格 `grid min-w-[760px]`；`max-width: 760px` ×4 是模态 `width:min(100vw-20px,1080px)` 响应式——均非轮次摘要浮层 | 穷尽（语境无关命中） |
| B-5 | InputHistoryDock order:-100、容器查询 560px、hint 18px 行高（batch-14 余项） | asar `@container \(…560…\)` = 0；live styles 同 = 0；`order:-100` 无 UI 消费 | 穷尽（断点/order 为 DSH 自有） |
| B-6 | 禁用档 .65（install）与 .55（document 按钮）（batch-17） | live styles opacity 阶梯分布（.5×8/.4×6/.3×5/.7×4/.9×3/.6×3/.35×3/.8×2/.06×2/.85×1）**无 .65**；asar `opacity-65` = 0；`.opacity-55` 唯一消费 = 泳道图 path（语境无关） | 穷尽（.55 的类在、禁用语义不在；.65 全域无） |
| B-7 | rotate(18deg)、active scale .98（batch-17） | gapfill-17：18° 全 bundle 0、0.98 仅生成表无使用 | 穷尽 |
| B-8 | 设置标题负字距 −0.2px（batch-17） | asar 负字距全档：`-.005em`/`-.035em`/`-.08px`/`-.09em`/`-.12px`/`-.18px`/`-0.01px`×2，**无 −.2px**；消费载体=表格（−0.08）、自动化行（−0.18）、automation 标题 `text-ui-xl leading-[26px]`（−0.12） | 字面量穷尽；**新参照入档：ZCode 有负字距惯例（−0.08/−0.12/−0.18px 三档，14–18px 文本）**，−0.2 最接近 −0.18，收口候选 |
| B-9 | tooltip 三档文字 `--dcu-tip-tertiary`（batch-8） | 本轮新证：`text-tooltip-foreground/60` 在 asar 有 **1 处消费**（`children:'·'` 分隔点，非文字档）；/80 次档机制见 gapfill-8 | tertiary 槽位维持无对应（/60 只作分隔符）；收口建议不变（alpha 降档或砍槽） |
| B-10 | 字标 svg 22px（batch-2） | gapfill-2：ZCode 品牌=20×20 渐变徽标盒、mac 不渲染 | 穷尽 |
| B-11 | hover 估高 152/148（batch-16） | gapfill-16：popper 弹性定位无估高概念 | 穷尽 |
| B-12 | 越限收起手势 32px（batch-16） | gapfill-16 正向证明：ZCode 侧栏拖拽无收起能力（收起靠钮/键/遮罩） | 穷尽（登记「本仓多出的适配能力」） |
| B-13 | 品牌色 hex ×8 + 兜底灰圆 #8b949e（batch-20） | gapfill-20：ZCode 用 PNG 位图（无 hex 可采）、兜底走通用图标组件 | 穷尽（载体不同构） |
| B-14 | hover-tip 周/月/年扩展档（batch-20） | gapfill-20：4 档同构已入档；扩展档无 | 穷尽 |
| B-15 | ScheduleClock 自绘 path、Menu dense/compact（batch-20） | gapfill-20：MUI 概念，ZCode 是 radix | 穷尽 |
| B-16 | 气泡折叠 chevron path `M4 6.5 8 10l4-3.5`（batch-20） | 本轮 `grep -a -c -F 'M4 6.5'` = 0、`m4 6.5` = 0、全式 = 0 | 穷尽（自绘 path 无出处；stroke 1.5 档已有参照） |
| B-17 | +10 每页步长、forcedId 追加（batch-11） | gapfill-11：5 有原文（`useState(5)`），+10 无（ZCode 步长 +5/20/50） | 穷尽 |
| B-18 | shared-now 60s 整分 ticker、CLICK_FEEDBACK_MS=260（batch-7） | gapfill-7 均有**反证**（ZCode 标签冻结不刷新；无「点击后停留」档） | 穷尽 |
| B-19 | roving tabindex / Up-Down 树遍历 / Home-End / aria-level（batch-19 余项） | gapfill-19：ZCode 树用全量 tabIndex:0+`--workspace-file-tree-depth`；ArrowDown 树内 0 | 穷尽（APG 立论维持） |
| B-20 | workspace.addFailed/retry/chooseAgain 文案（batch-19） | gapfill-19：三键 0 命中；错误模态三要素（alert/retry/close）已有同构参照 | 穷尽（流程自有） |

### C. needs-live（必须 9224 活体、本轮无法静态定）

| # | 条目（出处） | 卡点 |
|---|---|---|
| C-1 | 全局面板打开时取消会话选中（batch-16） | 活体行为判定；静态只能证「源码无此路径」（gapfill-16），需双端 CDP |
| C-2 | rail 内滚动清波（batch-7 E3） | 需真实滚动交互观察 |
| C-3 | ⌘K 内层 padding（APPLIED.md §二） | 需打开 ⌘K 面板在场采样（本轮只读原则：不导航不按键） |
| C-4 | 浅色主题逐项目检（APPLIED.md §四） | 需切主题目检（会动用户当前界面） |
| C-5 | 码块 pre 内边距（night2 live-findings §四） | 需页面出现代码块时重采（当前页无 `<pre>`） |

---

## 五、方法附录（可复现）

```bash
# ① 活体（只读）：WS 直连（HTTP 发现端点被禁，/json/* 无响应）
grep -o 'ws://127.0.0.1:9224/devtools/browser/[a-f0-9-]*' /tmp/zcode-debug.log | tail -1
#   → Target.getTargets → attachToTarget(flatten) → Runtime.evaluate
#   :root 变量全量 dump → /tmp/zcode-root-vars.json（353 变量）
#   composer 加号：querySelectorAll('button') 按 svg path M5 12h14|M12 5v14 过滤 + computedStyle

# ② 运行时样式表（唯一真源）
L=/Users/m1/Downloads/优化UI插件区/design-language/night2/zcode-live-styles.css   # 480,065 B
grep -o -E 'cubic-bezier\([^)]{1,30}\)' $L | sort | uniq -c        # 曲线谱系
grep -o -E '[^{}]{0,70}:focus-visible\{[^}]{0,110}\}' $L           # 焦点语言 12+3 条
grep -o -E -- '--color-ring[a-z-]*:[^;}]{1,80}' $L                  # 0 定义

# ③ asar 换策略
A=/Applications/ZCode.app/Contents/Resources/app.asar
grep -a -o -E 'sideOffset:[0-9]+' $A | sort | uniq -c               # 4×24 / 6×12 / 2×3 / 8×2 / 0×1
grep -a -o -E -- '--color-shadow-[a-z-]+:[^;}]+' $A | sort -u       # GitHub Primer 令牌块（@261426141）
grep -a -o -E '"settings\.sidebar\.[a-zA-Z.]+"' $A | sort -u        # 3 组键（无 about）
grep -a -o -E 'tracking-\[-0\.[0-9]+px\]' $A                        # 负字距三档消费点
grep -a -b -o -E '0 8px 24px rgba\(0, 0, 0, 0\.08\)' $A             # docx 页纸张内联（@27008852）
```

**教训一条**：batch-19「ZCode 出厂 bundle 无 composer 加号同位载体」是静态盲区——组件名压缩后 testid/类名都搜不到；活体用 lucide path 内容做组件名图，一次命中 4 个按钮。凡「载体不在」类结论，先活体再用内容锚点反查静态。

---

## 复核（2026-11-03 · 独立复核员追加，原文未改动）

> 范围：二·差异表 8 条（mechanical 全量复核；deviation 只核证据链是否成立）+ 四.C needs-live 5 条。所有检查均为复核员本会话实跑：asar `grep -a`（373,681,403 B）、`night2/zcode-live-styles.css`（实测 480,065 B，与文中一致）、`/tmp/zcode-root-vars.json` python 解析、9224 活体 WS 只读 evaluate（未导航、未点击、未改任何状态）。

### 差异表逐条 verdict

| # | kind | verdict | 复核记录（复核员实跑所见值） |
|---|---|---|---|
| 1 | mechanical | **verified** | ours：`composer-visuals.ts:29` 确为 `background:var(--dsw-alias-interactive-bg-hover-solid)`；`zcode-tokens.ts:145`=`'#f0f0f0'`、`:376`=`'#2b2b2b'` 逐字命中。zcode：asar `--color-hover:#0d0d0d0d`（浅）/#ffffff0d（深）各 1 处；live styles 有 `.hover\:bg-hover:hover{background-color:var(--color-hover)}`；活体 root dump `--color-hover='#ffffff0d'`（当前深色会话）。活体加号钮（lucide `M5 12h14`+`M12 5v14` 过滤）静息 `bg=rgba(0,0,0,0)`、类串含 `hover:bg-hover`/`aria-expanded:bg-hover`/`disabled:opacity-50`、rounded 6px(24px)×1 与 8px(28px)×2——与定案 2 一致。注：文中「4 个」（28×28×3+24×24×1），今日 `?restore` 态页面实测 **3 个**（28×28×2+24×24×1），属页面状态差异，不影响令牌/尺寸结论。 |
| 2 | mechanical | **verified** | ours：`CodexSettingsPage.tsx:83` 逐字命中 `element.animate([{opacity:…},{opacity:0}],{duration:140,easing:'ease-out',fill:'forwards'})`。zcode：引文 `gapfill-13.md:59` 确认在行；复核员复跑 `grep -a -c -F 'duration:140' app.asar` = **0**；`data-settings-panel-frame` 1 处、壳类串 `relative flex flex-col min-h-0 h-full border border-border…` 与 gapfill-13 引文一致。「无进出动画」的结构性读法采信（含其 zero-hit 证据）。 |
| 3 | mechanical | **verified** | ours：`CodexSettingsPage.tsx:229` 逐字命中 `<ZIconSearch size={15}`。zcode：`grep -a -c -E 'size-3\.75\|size-\[15px\]'` = **0**（15px 无档）；NN 前导图标类串 asar 1 处命中（@359954545）原文为 `` `pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle` ``——表中压缩写法 `left-3 size-4 text-foreground-subtle` 略去 top-1/2/-translate-y-1/2，但 16px 结论不变；`gapfill-13.md:112` 引文确认。 |
| 4 | deviation | **证据成立** | `zcode-tokens.ts:261`=`'#0b7fff'`、`:487`=`'#4099ff'`、`DesktopNavigationControls.tsx:10`=`outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px` 三处逐字命中。asar `--color-ring:` = **0**；live styles `--color-ring:` 定义 = 0；root dump 353 变量中无任何 ring 变量。焦点语言：live styles 枚举得 border 色 9 个类（含 color-mix+hex fallback 计 11–12 条声明，与「12 条」口径吻合）、outline 侧恰为文中 3 条（`:focus,:focus-visible{…outline:none!important}`×2 + `.focus-visible\:outline-primary`×1）。`--color-primary` asar `#000`/`#fff` 各 1 处 + 活体 `#fff`（深）互证。**修正**：`var(--color-ring)` 消费实测 **3 处**（文中表写「仅 1 处」、推论写「2 消费」均少计）——即文中两个选择器 + 1 个 `@supports` 内 `color-mix(in oklab,var(--color-ring) 40%,transparent)` 变体；不影响「0 定义→回退」结论。**备注**：0b7fff/4099ff 在 asar 确有出现（4 处/4 处），抽验上下文为 `.brand-icon{color:#0b7fff}` 与 `radial-gradient(#4099ff…)` 卡片渐变——非焦点环语义，「无依据」结论维持。 |
| 5 | deviation | **证据成立** | ours：`TurnNavigator.tsx:35` 逐字命中 `box-shadow:0 8px 24px rgba(0,0,0,.28)`；`zcode-tokens.ts:527` `--dsw-shadow-lv3 = 0 0 1px 0 rgba(0,0,0,.2), 0 8px 24px 0 rgba(0,0,0,.08)`（「同仓 .08 与 .28 内部不一致」属实）。zcode：live styles `8px 24px` = **0 命中**；asar `--color-shadow-large: 0 8px 24px rgba(140,149,159,.2)`（@261426245）+ 暗色 `0 8px 24px #010409` 双值确认；docx 纸张内联 `0 8px 24px rgba(0, 0, 0, 0.08)` @27008852 命中（另发现第 2 处 @29011503，文中未列，不影响结论）；`--color-fg-default: #24292f` 实测 @261425787，与文中 @261426141 同属一块，无碍。 |
| 6 | deviation | **证据成立** | ours：`zcode-tokens.ts:105` 逐字命中 `'--dsw-alias-label-tertiary': 'rgba(38, 38, 38, 0.5)'`。zcode：root dump 原文 `--color-foreground-subtle = color-mix(in oklab, oklch(87% 0 0) 60%, transparent)`、`--color-foreground-subtlest = …30%…`；全 dump 枚举 foreground 族，通用前景 alpha 档确只有这两档（其余为语义色）。「两档 vs 50% 第三档」证据链成立。 |
| 7 | deviation | **证据成立** | ours：`hover-tip.ts:11` 逐字命中 `return { left: rect.right + 8, top: rect.top }`。zcode：`grep -a -o -E 'sideOffset:[0-9]+' app.asar \| sort \| uniq -c` = `1×0 / 3×2 / 24×4 / 12×6 / 2×8`——与文中分布表（4×24、6×12、2×3、8×2、0×1）**逐字一致**。 |
| 8 | mechanical | **verified** | ours：`CodexSidebar.tsx:158` `.dcu-menu-kbd{…min-width:20px;height:20px…font-size:var(--dsw-font-size-xs)…}` 逐字命中（20px/xs）。zcode：asar 原文提取到 tooltip 键帽 `` `rounded-md h-4 inline-flex … bg-tooltip-tag px-1.5 text-ui-xs …` ``（h-4=16px）；`h-4 min-w-7` 1 处命中（⌘K chip，gapfill-2:123 引文一致）；`gapfill-2.md:124` 判定行在位（「1.4MB 窗口 kbd 零命中」原文在其下 :126）。字号档：live styles `--text-ui-xs:calc(var(--ui-font-size) - 4px)` 且 `--ui-font-size:14px`（唯一定义）→ 10px。活体只读复测：当前全文档 `kbd` = **0 个**，佐证「侧栏菜单行不显示键帽」（当前为 restore 态，证据弱于正常会话态，但与 asar 结构证据同向）。 |

### 四.C needs-live 逐条 verdict

| # | verdict | 复核记录 |
|---|---|---|
| C-1 | **verified（分类正确）** | `gapfill-16.md:124` 原文确为「静态源码无该行为记录……如需闭环仍须双端活体 CDP（静态证据只能证明『源码无此路径』，不能证明活体无此表现）」。分类与卡点描述属实；复核员未做交互（遵守只读）。 |
| C-2 | **verified（分类正确）** | 出处实为 `batch-7.md:19`（E3 行）：rail onScroll 清 interaction vs 插件 pointerleave 清波，「本轮无活体条件，未复测……先活体复测」。需真实滚动交互，复核员未执行。 |
| C-3 | **verified（分类正确）** | `APPLIED.md:46` 原文「需活体才能裁决：……⌘K 内层 padding」。复核员未开面板（不导航不按键）。 |
| C-4 | **verified（分类正确）** | `APPLIED.md:70` 原文「未做的验收：浅色主题逐项目检（当前会话在深色下）」。切主题会动用户界面，未执行。 |
| C-5 | **verified（卡点今日仍成立）** | `night2/live-findings.md:63` 原文「当前页面没有 `<pre>`，采不到……仍未裁决，需要页面上出现代码块时重采」。复核员今日 9224 只读 evaluate：`document.querySelectorAll('pre').length` = **0**——卡点仍无法解除。 |

### 复核中发现的边角误差（不改变任何 verdict，供订正参考）

1. 文首「353 个：342 `--color-*` + **8** `--radius-*` + 4 `--shadow-*`」：实测 radius 为 **7** 个（sm/xs/md/lg/xl/2xl/3xl），342+7+4=353。8 是误记。
2. 字号阶梯不在 root dump 里（dump 中 `--text-*` 为 0）：真实出处是 live styles 的 `--text-ui-*: calc(var(--ui-font-size) ± npx)` + `--ui-font-size:14px`。换算后 9/10/12/13/14/16/18/24/30 与文中阶梯一致，但「活体 ：root 变量全量 dump……字号阶梯」的表述混淆了两个来源。
3. 定案 1 证据表内部自相矛盾：同一处消费计数一行写「仅 1 处」、推论写「2 消费」，实测 3 处（2 选择器 + 1 @supports 变体）。
4. 定案 1「活体 adopted/shadow 遍历 0 命中」：复核员未复跑（需全量 CDP 遍历，超出本次只读抽查），记 **not-run**，其余证据链已闭合。
5. 编译 CSS 中存在 `focus-visible:ring-brand/40{--tw-ring-color:#00bcfe66}` 等 tw-ring 工具类（青色）。「ZCode 无蓝色焦点环」宜精确表述为「无 `--color-ring` 令牌定义、组件级焦点语言为 border 换色/outline-primary」；ring-* 工具类存在但与 uiplug 的 #0b7fff 无关。
6. #3 表中 NN 类串为压缩写法（略去 `top-1/2 -translate-y-1/2`）；#1 活体加号钮数量 4→3 系页面状态差异。均不影响结论。
7. 引文行号勘验：`gapfill-13.md:59`、`:112`、`gapfill-2.md:124` 均在位；「1.4MB 窗口 kbd 零命中」原文实际在 gapfill-2.md:126（:124 是其判定行标题），可接受。

**复核总结论**：差异表 8 条全部 verified（其中 4 条 deviation 的证据链全部独立复现成功，附带 3 处小计数误差已在上表标出）；needs-live 5 条分类与卡点描述全部属实，C-5 经今日活体复测仍卡在同一状态。无一条需要降级为 unconfirmed。
