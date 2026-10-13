# 更新日志

[English](CHANGELOG.md)

**dsh-zcode-ui** 的发布日志。本包 fork 自 [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34，上游在该版本之前的完整历史见 [docs/UPSTREAM-CHANGELOG.zh-CN.md](docs/UPSTREAM-CHANGELOG.zh-CN.md)。

## 1.5.0 - 2026-10-13

### 变更

- **会话行交互对齐 ZCode TaskListItem（第一批）**。本轮开始按「操作 UI 逻辑」整套对齐本地 ZCode 3.15.1——不是抄图标，而是把交互模型、行为契约与键盘路径移植过来（学习过程与完整差距审计见新增的 [docs/ZCODE-INTERACTION-PARITY.md](docs/ZCODE-INTERACTION-PARITY.md)）：
  - **行键盘可达**：会话行 `tabIndex=0`，`Enter`/空格打开；行内按钮上的 Enter 不会误触发行打开（`event.target === event.currentTarget` 守卫）——三棵树（任务树 / 频道 / 定时）经共享 `SessionRow` 统一获得。
  - **聚焦与悬停同权**（ZCode 的 focusActionsVisible 语义）：`:focus-within` 时快捷操作露出、右侧元信息（时间 / 未读 / 待处理）让位——键盘用户不再被排除在快捷操作之外。
  - **归档两步确认**：行内归档从「单击直接执行」改为 ZCode 同款两步确认——首击进入确认态（错误色「确认」按钮、常驻显示），`Escape` 取消，条目外 `pointerdown` 取消，**鼠标离开不取消**，二次点击才执行。共享实现 `archive-confirm.ts`，三棵树一套。
  - **行操作按钮不抢焦**：mousedown/pointerdown `preventDefault + stopPropagation`（ZCode `TaskRowActionButton` 同款）。
  - **右键菜单顺序对齐**：重命名 → 归档 → 标记未读（原为 重命名 → 未读 → 归档）。
- 确认按钮配色采用宿主错误色配对（背景 `--dsw-alias-state-error-primary` / 前景 `--dsw-alias-bg-layer-3`，与 DSH 自身 badge 约定一致），圆角走 `--dsw-radius-md` 令牌。

### 验证

- 新增 `tests/session-row-interaction.spec.ts`：① 首击进确认态不执行 / Escape 取消 / 二次点击恰好执行一次；② 确认态按条目边界取消（条目内 pointerdown 不取消、条目外取消）；③ 行键盘语义（tabIndex、Enter/空格打开、行内按钮上的 Enter 不冒泡触发行打开）。
- `tests/channel-archive.integration.spec.ts` 的归档辅助函数升级为两步（行为变更的连带验证）。
- 断言新增 13 条：两步确认 hook 复用、行聚焦与 Enter 守卫、确认态常驻显示与时间让位、Escape / 外点取消、错误色配对、菜单顺序。
- 全量门禁：类型 0 错 / vitest 312 过 / 构建通过 / 断言 35 过 0 败 / 布局 14 脚本全过。

## 1.4.0 - 2026-10-13

### 变更

- **运行中转圈严格复刻本地 ZCode 3.15.1 原版**（替代 1.2.1 的自绘弧）：图标 = `LoaderIcon`（lucide-react 1.17.0，8 芒原版路径，键值与 ZCode 锁定版本逐字一致）；尺寸 = `size-4`（16px，viewBox 24、stroke-width 2、round 线帽/线接）；动画 = ZCode 主题原文 `spin 1s linear infinite`；颜色 = `currentColor`，取侧栏最弱前景档 `--dcu-sidebar-tertiary`（ZCode 用 `text-foreground-subtlest`，其 40% 中性灰在 #f0f0f0 上仅 2.32:1，本仓按侧栏底色重取为 AA 达标值，见 KNOWN-ISSUES §3.1）。复核渲染：8 路径 / 16×16 / 2px 描边 / `rgb(104,104,104)` / `1s linear infinite` 逐项一致。
- **旋转动画收归主题层共享基元 `.dcu-spin`**：侧栏运行中与设置页安装中共用同一份定义（1s linear infinite），reduced-motion 一处停静止帧（图标停在原角度、不消失）。转圈只走 transform 旋转，不触发布局。
- **设置页安装中的加载图标从宿主静态弧改为 ZCode 转圈**：原先用的是宿主 `IconLoadingOutlineMedium`（静态弧线、不旋转），现在与侧栏同一枚图标、真的在转。
- **图标语言统一收尾**：About / Connectors / Schedule 三处残留的宿主图标（16 视箱、1/1.3 描边）全部收归 `zcode-icons`（24 视箱、2 描边），旧的 `host-icons.ts` 桥接模块随之退役删除——"图标唯一来源"从声明变成事实。
- **皮肤信封补表单控件归一**（扩展性）：`button/input/select/textarea` 的字体不是继承属性（UA 样式表显式设定），原先信封的字体够不到它们——实测裸 `<button>` 在皮肤表面内仍渲染 Arial。现用零特异性 `:where()` 归一成 `font:inherit`：任何作者样式（哪怕一条 `button{}`）都能覆盖我们，只有 UA 会被压过。实测：裸按钮随皮肤 system-ui，插件自己的 `font-family:Georgia` 原样保留。

### 验证

- 新增 `scripts/verify-running-indicator.mjs`：在真实 Chromium 里逐项断言复刻参数（8 路径 / size-4 / 2px / #686868 / 1s linear infinite / 停静止帧 / 格内居中）——"禁止自行再设计"的机器执行版。
- 新增 `scripts/verify-motion-budget.mjs`：量仍在过渡布局属性的四处动画（转场刻度 ×120 / 页签滑块 / 扩展面板 / 进度条）的单帧成本，断言远低于 120Hz 预算（实测 max 0.2–2.1ms vs 8.33ms），防"把动画重新挂回昂贵布局树"。
- 断言套件新增：转圈节奏锁死（1s linear infinite + 整圈关键帧 + 两处消费点 + 归零）、信封表单归一（零特异性 + font:inherit）、设置区不得再引宿主图标。
- 全量门禁：类型 0 错 / vitest 308 过 / 构建通过 / 断言 35 过 0 败 / 布局 14 脚本全过。

## 1.3.0 - 2026-10-13

### 变更

- **侧栏开合改为合成层动画**：过渡属性从 `grid-template-columns` 换成内容列与拖拽柄的 `transform`/`left` 位移，网格轨道在动画期间保持静止、只在两端一次性切换。旧实现每帧触发全页重排，重排成本随会话内容增长——用户实测「侧栏拉出的帧率受当前对话上下文长度影响」。60Hz 无头环境实测（同机同夹具）：1200 条消息下旧实现 500ms 内 26/30 帧、飞行中平均 20.0ms、最大 37ms、8 帧超 20ms；新实现飞行中平均 16.3ms、最大 18ms、**零掉帧**（轻内容同样零掉帧）。用户机器是 120Hz（帧预算 8.33ms），旧实现在长会话下几乎每帧超预算。
- 动画期间内容列加宽一个位移量（一次性重排，推挤语义无法避免，但只发生一次）；收起末端轨道切成 56px 时两者宽度一致，无第二次重排；展开反向，末端一次重排。
- 轨道切换（快照）与宿主写回值的修正都在暂停样式过渡后写入——宿主 `.frame[data-animating]` 和伴随插件（dsh-better-sidebar）都可能给 grid/left 挂过渡，不暂停会把一次性修正动画化，出现可见漂移。
- 冷启动即收起态的帧现在也能正确播放开合动画（旧实现里收起分支不打初始化标记，第一次展开被误判成冷启动而跳过动画）。
- 拖拽进行中会取消飞行中的开合动画（轨道归拖拽所有），避免动画定时器稍后落定与拖拽逐帧写入打架。

### 修复

- 前述帧率劣化（根因：动画属性是布局属性）；冷启动收起态首次展开不动画；飞行中动画与拖拽互相打架。

### 验证

- `scripts/verify-sidebar-transition.mjs` 重写：断言飞行中轨道静止、transform 连续中间帧并收敛、快照后无动画残留、手柄从收起视觉位单调滑到展开位、反手切换立即落定、reduced-motion 一帧落定、拖拽不起动画且取消飞行中动画、与 dsh-better-sidebar 的 `#root` 规则共存（`padding-right` 过渡保留、帧不挂 grid 过渡、内容列只过渡 transform）。
- 新增帧成本与内容量脱钩的回归断言（10 / 1200 条消息对照：飞行中零掉帧、平均贴近 vsync 基线）——旧实现在该断言下失败（20.0ms / 37ms / 8 帧超 20ms）。
- 全量门禁：类型 0 错 / vitest 311 过 / 构建通过 / 断言 35 过 0 败 / 布局 12 脚本全过。

## 1.2.1 - 2026-10-13

### Changed

- **运行中指示器重做**：原版只有顶部一小段有色（旋转几乎看不出来）、0.8s 对 12px 图标太慢。现改为「淡轨道 + 270° 亮弧」：整圈 22% 淡色打底，右/下/左三条边满色成弧，缺口留在正上方——旋转方向和"正在跑"都一眼可辨。动画 0.8s → 0.6s。
- 描边仍为 2px：实测 Chrome 会把 `1.5px` 这类小数字框取整成 `1px`（DPR 1 与 2 均如此），1px 在 12px 圆上太轻、压不住旁边 14px 的会话标题。提升靠弧长与轨道/弧的明度对比，不靠描边。
- 仍是纯 `transform` 动画（合成层），不增加帧成本；`prefers-reduced-motion` 下弧**静止但不消失**——动作归零、信息保留。

## 1.2.0 - 2026-10-13

### 新增

- `--dsw-radius-2xl: 16px`（白名单大圆角：主输入壳 / 会话状态浮层 / Toast / 品牌底盘）与 `--dsw-radius-full: 999px`——此前 16px 与胶囊圆角都是字面量。
- 外来内容契约第 4 条：**数据可视化的语义色允许保留**（且只限于填充本身）。当前实例为计费插件峰值条 `.cm-peak-segment.cm-peak-high` 的 `rgb(255,152,0)`——压成中性等于抹掉「现在是不是峰值」这个信息。
- 契约与设计文档同步：`foreign-content-contract.ts` 三条 → 四条，`ZCODE-DESIGN.md` §10.2 同步。
- `tests/design-system.assert.ts` 新增模板串截断守卫（对**抽取结果**校验前中部标记 + 尾标记，只查前中部会漏掉尾部截断）。
- `KNOWN-ISSUES.md` §13：设计审计结论登记（与代码改动分开）。含明暗撕裂六组实验、破版归属清单 6 项、两条「不得当规范抄」的上游事实、loading/error 态空白、独立复核记录。

### 变更

- **离标度圆角全部收归标度**：`18px / 10px / 9px / 7px / 3px / 1px / 99px` 改为 `var(--dsw-radius-*)`。其中 6 处真的改了像素（工具菜单 18→12、建议卡 10→12、关于页外链 7→8、连接器框 10→12、轮次刻度 1→2、页签滑块 7→6），另 9 处令牌值等于原字面量（零视觉变化）。实机已逐个量过。
- **`--dsw-radius-panel` 保留并改为 12px**——它**不是**死令牌，而是对**宿主**令牌的覆盖：宿主 `@deepseek-ai/dsh-client-ui-theme` 在 `:root` 定义 `28px`，被 Modal、设置面板、反馈弹窗、浮动面板与 `calc(var(--dsw-radius-panel) - 4px)` 的缩放角消费。删掉它会让这些表面回落到 28px（实机 `getComputedStyle` 已确认）。这是 `--dsw-*` 是**共享命名空间**、不是私有变量的直接证据。
- **reduced-motion 从「只归零时长」补成「停静止帧」**：时长归零管不到 `infinite` 动画，进度波浪与运行中旋转此前仍在跑。现把波浪停在 28%（保留「进行中」可读性）。
- 主区工具菜单暗色底 `#292929`（离板灰）→ ZCode 菜单色 `#2b2b2b`；并清掉 4 处「令牌已定义、兜底永不生效」的死兜底。
- `SKIN_VERSION` 与 `package.json` 对齐（v1.1.0 发漏了内部版本串，HEAD 上停在 1.0.0）。

### 修复

- **圆角断言由「值白名单」改为「棘轮」**：原断言只锁「值 ∈ 允许集」，把 `var(--dsw-radius-full)` 改回 `999px` 照样全绿——假断言。现按「文件:值 → 次数」登记存量，未登记的字面量一律红。反向测试：改回 `999px` 立刻报错。
- `scripts/verify-composer-style.mjs` 用 `getBoundingClientRect()` 浮点值做严格相等（实测拿到 `28.000003814698`），且首帧可能读到过渡中间值 → 改为容差比较。
- `scripts/verify-composer-tools.mjs` 的期望值随菜单外观更新（18px→12px、`#292929`→`#2b2b2b`），错误信息说明了判据来源。

### 移除

- **主区嵌入面的容器边界规则（写过并撤回）**：`:root:root [data-slot="main"] iframe{border-radius/border/background}` 经像素比对证明**没有任何可见效果**——有/无圆角的 44×44 角部裁图仅差 50 个像素，且差值是一级抗锯齿（`(254,254,254)` vs `(255,255,255)`），因为裁角露出的父层底色与面板同为近白；且宿主在 iframe 上写行内样式锁死 border/background。结论：皮肤层面不存在有效手段，已连同规则、测试、断言一并撤回，责任方登记为宿主/该插件。



### 新增

- `src/client/host-anchor-contract.ts` —— 本插件依赖的全部上游 CSS Module 哈希类名锚点（18 处，分布在 6 个文件）现已在案；其中 6 处（前置条件可确定）参与运行时自检，解析不到即响亮报警。此前上游改一次类名，界面会悄悄少一块，控制台里什么都没有。
- `installThemeStyle()` —— 主题样式表改为应用级注入。
- 门禁在「进程非零退出但输出里没有可识别的失败行」时，改为报**「无法判定」**，不再报「通过」。
- README 新增「**能力范围与权限**」章节：6 行能力表，写清这个包能够到哪儿、会碰什么。

- **字号刻度补三档展示档。** `--dsw-font-size-title`(20px)、`--dsw-font-size-headline`(22px)、`--dsw-font-size-display`(34px)，均由基准以 `calc()` 推导。这三个值此前是 `docs/ZCODE-DESIGN.md` §3.2 里登记的「刻度外例外」；按原值收归后**没有任何视觉变化**——它把「我们在这里破了规矩」变成「规矩本来就覆盖这里」。
- **动效改为按意图分档的令牌。** 反馈 120ms、移动 180ms、进入 160ms、退出 120ms、按压 90ms。原先统一的 `180ms ease-out` 是一致，但不是**设计过**——出现、移动、消失同速，读起来是「没做动效」。新曲线均无过冲，不违反 ZCode「避免弹簧感」。减少动态效果也从「逐个元素写 `transition:none`」变成令牌层一处归零。
- `src/client/foreign-content-contract.ts` —— 第三方内容在侧栏内的三条契约（文字色不得高于 `secondary`、不得自带不透明卡片底、折叠态必须可降级），以及一个运行时哨兵：契约锚点类名消失时响亮报警。
- `tests/design-system.assert.ts` —— 设计系统本身进入断言覆盖：字号刻度、动效意图、外来内容锚点、签名细节。
- `scripts/verify-a11y-and-overflow.mjs` —— 把可读性与溢出变成自动判据：对比度（WCAG 2.1 AA，明暗两套）、建议卡标签是否被截断、折叠轨是否横向溢出。已接入 `gate` 与 `test:layout`，真机脚本由 11 个增至 12 个。

### 变更

- **主题层不再挂在侧栏组件上。** `ZCODE_THEME_STYLE` 与 `syncZCodeTheme()` 原先由 `CodexSidebar` 承担，现改为 `index.ts` 的应用级 effect。侧栏只是 `:root` 动效令牌的消费方之一——会话区的轮次导航与页签滑块同样依赖它，侧栏一旦没挂载，那两处会静默失去过渡。
- README 不再自称「纯粹的展示层」。**皮肤**确实是纯展示层，但**这个包**还带着上游的依赖安装器（跑 `pnpm`、可重写 `node_modules`）、会话移动与「在文件管理器中打开」。现在开篇就说明，而不是让读者从「皮肤」二字自行推断。
- 令牌统计更正：21 个结构性令牌、195 个唯一名（原写 18 / 192）。

- **`11px` 归一为 `12px`**（4 处）。`11px` 是夹在 `xs`(10px) 与 `sm`(12px) 之间的孤值，为它补一档等于把孤值合法化。这是一次有意的小幅视觉变更。
- 工作区分组标题字重 `600` → `400`，与侧栏既有约定一致（其标题与标签有意保持 400，且有断言守护）。分组层级改由披露箭头、缩进与明度表达。
- 连接器标题字重 `650` → `600`——`650` 在本系统里别处不存在。
- `tests/conversation-visuals.assert.ts` 的动效断言改为断言**使用哪一档意图**，不再锁死时长；调整数值不会误报，改动意图则会立刻变红。
- 空状态改为说明「下一步做什么」，而不只是「这里没有东西」：`workspace.empty`、`workspace.recentEmpty`、`search.empty`、`settings.noResults`。
- **侧栏文字色阶按侧栏底色重新取值。** ZCode 的 `foreground-subtle` / `foreground-subtlest` 是叠在**白底**上推导的，落到侧栏 `#f0f0f0` 上实测只有 3.93:1 与 2.32:1。现：亮色 secondary `#777777` → `#5c5c5c`（5.87:1）、tertiary `#9f9f9f` → `#686868`（4.89:1）；暗色 tertiary `#4f4f4f` → `#828282`（4.82:1）。
- 选中态底色改为中性（`#efefef` / `#3a3a3a`），不再用 ZCode 的蓝色 accent，与侧栏自身的选中语言一致。
- 新建会话页的建议卡标签改为两行显示，不再在 1440px 下被切断在半词处。
- 第三方计费卡收敛到侧栏字号并去掉白底卡片；折叠轨里直接隐藏——此前它的文字被裁成碎片。
- 折叠轨图标补 `title` 提示。
- 设置页次要文字 `#737373` → `#6b6b6b`。
- 所有图标统一从 `src/client/zcode-icons.tsx` 取；除它之外没有任何模块直引 `lucide-react`。
- 日志前缀统一为 `[dsh-zcode-ui]`。

### 修复

- **`scripts/gate.mjs` 的两处假绿。** 断言套件与 vitest 原先只要「解析不到失败行」就按通过处理。而崩溃（EPERM、OOM、汇总格式变更）是非零退出且没有可解析的失败行——门禁会照打「vitest：全部通过」，尽管 vitest 根本没跑起来。两步现在都有显式的**无法判定**分支，并纳入阻断条件。

- 未净化的截图已从**整个 git 历史**中清除。它们此前只是从工作区删除，仍可按提交号下载——包括文档里引用过的那些提交号，现已改为按说明引用。

### 移除

- `debug/` 整目录、上游营销 banner、一张无引用截图（同样已从历史清除）。

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34：继承其侧栏 / 工作区会话树 / 设置页骨架与数据层（SlotRegistry + ctx，零改动），在其上叠加 ZCode 视觉语言：

- Zai Light / Zai Dark 双色板全量写入 `--dsw-*`（画布 `#f8f8f8` / `#161616`，色值逐像素对照 zai-org/ZCode v3.15.1 核验）。
- ZCode 侧栏几何：8px 圆角、32px 行高、150ms ease-out 过渡、Lucide 图标。
- 主题以宿主 `data-ds-dark-theme` 属性为唯一真源（不读 `prefers-color-scheme`，修复宿主浅色 + 系统深色时侧栏与内容区明暗撕裂）。
- `src/` 中消费的每个 `--dsw-*` 令牌都在映射表内有定义，由 `token-coverage` 断言强制保障。
- 会话标题独立子插件（LLM 生成，可单独启停）。
