import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tickMarkSize } from '../src/client/TurnNavigator.tsx'

const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const footerActions = readFileSync(new URL('../src/client/footer-actions.ts', import.meta.url), 'utf8')
const navigator = readFileSync(new URL('../src/client/TurnNavigator.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../src/client/settings-page-styles.ts', import.meta.url), 'utf8')
const settingsPage = readFileSync(new URL('../src/client/CodexSettingsPage.tsx', import.meta.url), 'utf8')
// 2026-10-12：ZCode 改造后配色/文字层级由主题层（zcode-theme.ts 的 ZCODE_THEME_STYLE）统一给出，
// 不再是侧栏样式表里的字面量。凡断言"侧栏必须是什么颜色"的，都应指向这唯一的真值源。
const theme = readFileSync(new URL('../src/client/zcode-theme.ts', import.meta.url), 'utf8')

const sidebarStylesheet = sidebar.match(/const stylesheet = `([\s\S]*?)`/)?.[1]
assert.ok(sidebarStylesheet, '必须能读取侧栏样式，避免防回归检查被跳过')

// ── 模板串截断守卫（2026-10-16，同一个坑已踩三次）──
// 上面的提取正则是**非贪婪**的：只要 CSS 模板串内部出现一个反引号，它就在那里提前收尾、
// **静默截断**。后果是 tsdown 构建失败、宿主报 failed to import，而断言套件**全绿**——
// 因为所有 `assert.doesNotMatch(sidebarStylesheet, ...)` 只看到截断后的前半段。
// 用四个确定性判据把它挡在构建之前（这些判据都不依赖"截断点在哪"）：
{
  const backticks = (sidebar.match(/`/g) ?? []).length
  assert.equal(backticks % 2, 0, `CodexSidebar.tsx 的反引号必须成对，实测 ${backticks} 个（奇数说明有 CSS 模板串被内部反引号截断）`)
  const opens = (sidebarStylesheet.match(/\{/g) ?? []).length
  const closes = (sidebarStylesheet.match(/\}/g) ?? []).length
  assert.equal(opens, closes, `侧栏 CSS 花括号必须配平（{ ${opens} / } ${closes}）——不配平说明模板串被提前截断`)
  const cOpen = (sidebarStylesheet.match(/\/\*/g) ?? []).length
  const cClose = (sidebarStylesheet.match(/\*\//g) ?? []).length
  assert.equal(cOpen, cClose, `侧栏 CSS 注释必须闭合（/* ${cOpen} / */ ${cClose}）——不闭合说明截断落在注释里`)
  assert.ok(sidebarStylesheet.trimEnd().endsWith('}'), '侧栏 CSS 必须以规则结尾——否则说明模板串被提前截断')
}
assert.doesNotMatch(sidebarStylesheet, /billing-(?:trigger|rail-button)/, '侧栏不得改写费用插件入口样式')

assert.ok(sidebar.includes('.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}'), '设置图标必须使用侧栏颜色，穿过宿主 slot 包装定位图标')
assert.match(settings, /\.dcu-settings-trigger-content\{[^}]*grid-template-columns:20px minmax\(0,1fr\);column-gap:8px/, '设置入口通过固定图标列对齐文字，不再叠加旧的文字偏移')
assert.match(settings, /\.dcu-settings-trigger\[data-wide=false\] \.dcu-settings-trigger-content\{grid-template-columns:16px;justify-content:center\}/, '窄轨设置图标必须独立居中')
assert.match(settingsPage, /createPortal\([\s\S]*data-dcu-settings-page[\s\S]*document\.body\)/, '设置页必须 portal 到 document.body，避免收缩窄轨的 containing block 困住全屏页')
assert.match(settings, /body:has\(\.dcu-settings-page\) \.dcu-root/, '透明设置页隔离必须覆盖 portal 到 body 后的侧栏根')

assert.doesNotMatch(sidebar, /--dsh-chat-content-width:\s*800px/, '会话内容列必须保留宿主自适应和拖拽宽度')
assert.match(sidebar, /--dsh-composer-card-max-width:calc\(var\(--dsh-chat-content-width\) \+ 32px\)/, '输入卡片必须继续从宿主会话宽度轴派生（宽度轴同时被宿主的拖拽宽度契约消费，2026-10-28 未动）')
assert.doesNotMatch(sidebar, /\[data-chat-flow\]\{gap:/, '不得在宿主逐行间距之外叠加旧版 flex gap')
assert.doesNotMatch(sidebar, /\[data-composer-card\]\{[^}]*min-height:/, '输入卡片由编辑区和工具栏自然撑高，不额外强制整卡最小高度')
assert.match(sidebar, /\[data-input-mirror\]\{min-height:40px/, '空输入镜像高度对齐 ZCode 的 min-h-10（40px，2026-10-28 浅色活体）')
assert.match(client, /conversation\.session\.header\.utilities/, '轮次导航必须挂在原生会话扩展位')
assert.doesNotMatch(client, /registerSidebarExpandControls/, '折叠入口统一保留在窄轨，不再注册标题栏按钮')
assert.match(navigator, /conversationAnchor/, '轮次跳转必须使用集中管理的 DSH 聊天锚点适配层')
assert.match(navigator, /turns\.label/, '轮次导航必须有无障碍名称')
assert.match(navigator, /focus-visible/, '轮次导航必须支持键盘聚焦展开')
assert.match(navigator, /prefers-reduced-motion/, '轮次跳转必须遵循减少动态效果设置')
assert.match(navigator, /top:50%;left:var\(--dcu-turn-left,288px\).*transform:translateY\(-50%\)/, '轮次刻度必须在侧栏右侧、会话左侧')
assert.match(navigator, /ResizeObserver/, '侧栏宽度变化时轮次导航必须重新定位')
assert.match(navigator, /getBoundingClientRect\(\)\.right\) \+ 16/, '轮次刻度必须贴在侧栏右缘外侧 16px')
assert.match(navigator, /left:16px/, '悬停气泡必须出现在刻度右边')
assert.doesNotMatch(sidebar, /TurnNavigator\.module\.css/, '不得依赖宿主私有 CSS 注入标记判断官方导航')
assert.doesNotMatch(sidebar, /:has\(>\[data-chat-flow\]\)>:first-child>nav/, '不得依赖宿主会话子树层级定位官方导航')
assert.match(sidebar, /html\[data-dcu-official-turn-navigator-supported=true\] \.dcu-turn-navigator/, '已知运行时支持官方导航时必须独立隐藏旧版刻度')
// 2026-10-19：同 profile 可能同时装 @michengai/dsh-codex-ui 与 dsh-zcode-ui，两者都往
// conversation.session.header.utilities 注册 id 'turn-navigator'，slot 表按「包+id」区分
// → 渲染出两条索引栏（实测 desktop profile 并存）。turn-rail-dedupe 负责让后来者退场。
assert.match(sidebar, /\.dcu-root \[data-dcu-turn-rail-stale\]\{display:none\}/, '多出的索引栏必须有退场规则（用特异性而非 !important，避免撞结构债预算）')
{
  const entry = readFileSync('src/client/index.ts', 'utf8')
  assert.match(entry, /dedupeTurnRails\(\)/, '索引栏去重必须在插件启动时挂载')
  const dedupe = readFileSync('src/client/turn-rail-dedupe.ts', 'utf8')
  assert.match(dedupe, /data-dcu-turn-rail-stale/, '去重模块必须使用 stale 标记驱动退场')
  assert.match(dedupe, /存在多条|rails\.length <= 1/, '去重必须处理单条/多条两种状态')
}
assert.match(sidebar, /html:has\(\[data-dcu-official-turn-navigator\]\) \.dcu-turn-navigator/, '检测到实际官方导航时也必须隐藏旧版自定义刻度')
assert.match(sidebar, /\[data-dcu-official-turn-navigator\]\{right:auto!important;left:max\(12px,calc\(12px - \(var\(--dsh-composer-side-clearance\) \+ 16px\)\)\)!important\}/, '官方轮次导航必须留在会话列内，不能因正 clearance 滑进侧栏')
assert.doesNotMatch(sidebar, /\[data-dcu-official-turn-navigator\]>div:first-child/, '镜像样式不得依赖官方导航内部 div 层级')
assert.match(sidebar, /--dsh-composer-side-clearance:24px/, 'Codex 输入区视觉间距必须保留，且不作为官方导航识别条件')
assert.doesNotMatch(navigator, /--dcu-turn-right/, '轮次刻度不得再放到会话右侧')
assert.match(navigator, /width:max-content/, '悬停气泡必须贴合文字宽度')
assert.match(navigator, /max-width:240px/, '长摘要必须限制胶囊宽度并省略，不得被 min\(\) 在宿主里整段丢弃')
assert.match(navigator, /\.dcu-turn-summary\{[^}]*height:32px/, '悬停气泡高度必须是 Codex 的 32px 胶囊')
assert.match(navigator, /\.dcu-turn-summary\{position:absolute/, '悬停摘要必须是独立胶囊，刻度不得拉成白条')
assert.doesNotMatch(navigator, /\.dcu-turn-link:hover,.dcu-turn-link:focus-visible\{height:32px/, '悬停不得把刻度行拉高成白条')
/* 2026-10-26 更新：自绘轨（dcu-turn-navigator）在宿主官方轮次导航挂载后已被
   `html:has([data-dcu-official-turn-navigator]) .dcu-turn-navigator{display:none}` 隐藏，
   改由官方轨承担显示。因此这三条从「宿主未提供时的兜底规格」改为「与 ZCode 实测一致」：
   命中区 36×10、刻度 12×2、pitch 10（见 ZCODE-INDEX-SPEC.md）。 */
assert.match(navigator, /width:36px;height:10px/, '轮次导航命中区必须紧凑（ZCode 36x10）')
assert.match(navigator, /--dcu-tick-w,12px/, '轮次导航默认刻度必须与 ZCode 一致（12px）')
assert.match(navigator, /\.dcu-turn-list\{display:grid;gap:0/, '刻度默认间距必须收紧（ZCode 靠 10px 行高实现，gap 为 0）')
// 2026-10-12 更新：ZCode 改造后折叠轨不再靠根节点 `width:100%` 撑满，而是紧凑外壳自身固定 56px
// （`.dcu-compact-shell{display:none;width:56px}` + 折叠态切换到它）。意图不变：窄轨必须正好填满宿主 56px 列。
assert.match(sidebar, /\.dcu-compact-shell\{display:none;width:56px\}/, '折叠外壳必须固定 56px 宽，填满宿主列')
assert.match(sidebar, /\.dcu-root\.dcu-compact \.dcu-compact-shell\{display:flex/, '折叠态必须切换到紧凑外壳')
assert.match(sidebar, /BrandWordmark size=\{24\}/, '侧栏品牌标识必须放大')
// 2026-10-12 更新：以下三条钉的是 P1 之前的几何常量，ZCode 刻度落地后头部高 34→48px（2026-10-26 按 CDP 实测 h-12=48px 修正）、
// 纵向内边距 28→32px、控件间距 8→4px。断言意图（单行头部、控件垂直居中、图标对齐）不变。
assert.match(sidebar, /\.dcu-head-actions\{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:4px;height:28px\}/, 'head actions grid')
assert.match(sidebar, /\.dcu-head\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/, 'head single row')
// 2026-10-26：CDP 实测 ZCode 侧栏顶栏 h-12 = 48px，会话顶栏 fallback 也同步到 48，两侧不错位。
assert.match(sidebar, /\.dcu-head\{[^}]*height:var\(--dcu-header-height,48px\)/, '侧栏顶部与会话顶栏共用控件带高度（48px，与 ZCode h-12 一致）')
assert.match(sidebar, /\.dcu-head\{[^}]*padding:calc\(\(var\(--dcu-header-height,48px\) - 32px\)\/2\) 8px calc\(\(var\(--dcu-header-height,48px\) - 32px\)\/2\) 12px/, '顶部控件垂直居中，保留 Logo 左侧留白（48px）')
assert.match(sidebar, /\.dcu-head \.dcu-icon\{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px/, 'head icons aligned')
assert.match(sidebar, /<div className="dcu-head-actions"><button type="button" className="dcu-icon" aria-label=\{t\('sidebar\.collapse'\)\}[\s\S]*sidebar\.search/, '收缩按钮必须在 LOGO 右侧、搜索左侧，并随搜索一起靠右')
assert.match(sidebar, /const compact = collapsed \|\| width < 80/, '列宽小于 80px 时也必须进入窄轨')
assert.match(sidebar, /className=\{`dcu-root\$\{visualCompact \? ' dcu-compact' : ''\}\$\{collapsing \? ' dcu-collapsing' : ''\}`\}/, '收缩动画必须用独立视觉状态隔离工作区树')
assert.match(sidebar, /\.dcu-root\.dcu-compact \.dcu-expanded-shell\{display:none\}/, '窄轨必须隐藏文字菜单，但保留工作区树实例避免展开时重新挂载')
assert.match(sidebar, /dcu-compact-nav/, '窄轨必须渲染图标导航列')
assert.match(footerActions, /CONTEXT_OVERVIEW_FOOTER_ID = 'context-overview'/, '必须按 dsh-context 注册的 slot id 跳过上下文洞察')
assert.match(footerActions, /HIDDEN_FOOTER_ACTION_IDS: ReadonlySet<string>/, '隐藏名单必须是只读 Set，避免运行时被改掉')
assert.match(sidebar, /only: action\.id/, '底部动作必须按 id 单独 renderSlot，不能整槽渲染')
assert.match(sidebar, /footer-actions 必须保持竖排/, '逐条 data-slot 锚点可能被插件设为 100% 宽，底部动作区不得改成横向 flex')
// 2026-10-12 实测反馈：底栏各入口是同一组的兄弟项，逐项加横线会堆出一排"意义不明的直线"
//（记忆/任务/归档/设置之间全是线）。分组用间距，不用分隔线；区块级的边界线（工作区、底栏上沿）保留。
assert.doesNotMatch(sidebar, /\.dcu-footer-actions>\*\+\*\{[^}]*border-top/, '底栏入口之间不得逐项画分隔线')
assert.doesNotMatch(sidebar, /lc-ov-entry/, '不得再靠 dsh-context 的按钮 class 藏入口')
assert.doesNotMatch(sidebar, /\[data-slot\]:has\(/, '不得按 slot 祖先隐藏洞察入口，否则会把同槽的用量统计一起藏掉')
assert.match(sidebar, /dcu-compact-nav[\s\S]*sidebar.newTask[\s\S]*sidebar.search[\s\S]*sidebar.experts[\s\S]*sidebar.skills[\s\S]*sidebar.plugins[\s\S]*sidebar.connectors[\s\S]*sidebar.schedule[\s\S]*sidebar.assistant/, '窄轨必须保留主导航图标')
// 2026-10-12 更新：窄轨设置入口改为把 `wide:false` 交给宿主插槽渲染（宿主自己出纯图标形态），
// 插件不再注入 `[data-dcu-settings-trigger]` 的 font-size:0 覆盖。
assert.match(sidebar, /renderSlot\('sidebar\.settings', \{ wide: !visualCompact \}/, '窄轨设置入口必须交给宿主以 wide:false 渲染成纯图标')
assert.doesNotMatch(sidebar, /dcu-settings-seat>button\{[^}]*font-size:0/, '桌面账号头像按钮不能套用设置入口的文字隐藏规则')
// 2026-10-12 更新：窄轨展开按钮改用插件统一的 Lucide 图标（ZIconCollapse）。
// 2026-10-13 更新：折叠轨图标补 title（无标签窄轨需要 tooltip 说明用途）。
assert.match(sidebar, /<div className="dcu-compact-shell"><button type="button" className="dcu-icon" aria-label=\{t\('sidebar\.expand'\)\} title=\{t\('sidebar\.expand'\)\} onClick=\{toggleSidebar\}><ZIconCollapse size=\{16\} \/>/, '折叠态展开按钮必须位于窄轨顶部')
assert.match(sidebar, /const SidebarSearch = forwardRef/, '搜索状态必须隔离到独立子树，不能让工作区树随输入重渲染')
assert.match(sidebar, /useDeferredValue\(query\)/, '搜索过滤必须让输入更新优先，避免大量会话时阻塞键入')
// 2026-10-28 用户裁决：内容切换提前到点击帧（SETTLE_MS = 0），整个收起只剩「宽度滑到 56」
// 一个动作；原先 500ms 的两段式（滑完→停→跳）被实测为「多余动作」。
assert.match(sidebar, /SIDEBAR_COLLAPSE_SETTLE_MS = 0/, '收缩时内容必须点击即换（紧凑态从头到尾），只剩宽度一个动画')
assert.match(sidebar, /width:var\(--dcu-sidebar-expanded-width,264px\)/, '宽态内容必须保持展开宽度，避免宿主动画把文字挤成竖排（默认宽对齐 ZCode 实测 264）')
// 2026-10-13 更新：动效改为按意图分档的令牌（见 docs/ZCODE-DESIGN.md §7.1）。
// 断言不再锁死 180ms/ease-out 这类字面量，而是锁「用哪一档意图」——数值可调，意图不可改。
assert.match(sidebar, /dcu-sidebar-expanded-in var\(--dcu-motion-enter-duration\) var\(--dcu-motion-enter-ease\)/, '侧栏展开是「内容出现」，必须使用进入档曲线（减速收尾）')
assert.match(sidebar, /\.dcu-compact-shell\{display:none;width:56px\}/, '窄轨必须固定为 56px 并锚定左侧，不能在正在变化的宿主列中居中漂移')
assert.match(sidebar, /dcu-search-dialog-in var\(--dcu-motion-enter-duration\) var\(--dcu-motion-enter-ease\)/, '搜索弹窗是「内容出现」，必须使用进入档曲线')
assert.doesNotMatch(sidebar, /transition:none!important/, '不得再关闭宿主侧栏的宽度动画')
/* 2026-10-27（TA1，03g 主题审计）：浅色侧栏底 #f0f0f0 → #f7f7f7。
   原断言措辞「Zai ZCode 的 #f0f0f0」**本身就是错的** —— 核对 tokens.json：
     --color-sidebar    light = oklch(97% 0 0)   = 通道 245 ≈ #f5f5f5
     --color-background light = oklch(98.5% 0 0) = 通道 248 ≈ #f8f8f8
   #f0f0f0 是通道 240，比 ZCode 实际值暗 7~8 个通道。
   取两者中值 #f7f7f7（247）作为侧栏底，更贴近 ZCode。
   G14 的 secondary/tertiary alpha 不受影响（底色变亮 → 对比度只升不降，实测 6.34/4.76:1）。 */
/* 2026-10-27 第 19 轮修正：ZCode 是**分层**的，不该取中值。
   权威换算（canvas 像素回读，两个已知值反验通过）：
     oklch(97%   0 0) → rgb(245)  = --color-sidebar     （侧栏层）
     oklch(98.5% 0 0) → rgb(250)  = --color-background  （内容画布层）
     反验：oklch(87%) → 212（深色前景）、oklch(37.1%) → 64（G14 基色）✅
   245 与 250 的 5 通道差本身就是设计语言（侧栏略暗以区分层级）。
   侧栏壳 .dcu-root 取 245；整页视图（设置页/首页）取 250，见 settings-page-styles.ts。 */
assert.match(theme, /--dcu-sidebar-background:#f5f5f5/, '浅色侧栏壳底对齐 ZCode --color-sidebar oklch(97%) = rgb(245)')
assert.match(theme, /--dcu-sidebar-background:#161616/, '暗色侧栏必须使用 Zai ZCode 的 #161616 背景')
assert.match(sidebar, /body\[data-we-sidebar-glass\] \.dcu-root::before\{[^}]*pointer-events:none[^}]*--we-sidebar-color[^}]*--we-sidebar-alpha[^}]*backdrop-filter:blur\(var\(--we-sidebar-blur/, 'Wallpaper Engine 玻璃必须在不拦截点击的独立背景层复用颜色、透明度和模糊变量')
assert.doesNotMatch(sidebar, /\.dcu-root\{[^}]*(?:backdrop-filter|transform|contain):/, '侧栏根节点不得创建 fixed 包含块，否则设置和搜索弹窗会被限制在侧栏内')
assert.doesNotMatch(sidebar, /\.dcu-root\s*\{(?:[^{}]*;)?\s*(?:-webkit-)?(?:filter|perspective)\s*:(?!\s*none\s*(?:!important\s*)?[;}])[^;}]+/i, '侧栏根节点不得通过非 none 的 filter 或 perspective 创建 fixed 包含块')
assert.doesNotMatch(sidebar, /\.dcu-root\s*\{(?:[^{}]*;)?\s*will-change\s*:[^;}]*\b(?:transform|translate|rotate|scale|filter|backdrop-filter|perspective|contain)\b/i, '侧栏根节点不得通过 will-change 提前创建 fixed 包含块')
// 唯一允许的层叠提升是动画期间那条（负向后视排除），依据见下一条断言。
assert.doesNotMatch(sidebar, /(?<!\]:not\(\[data-dragging\]\) )\.dcu-root\{[^}]*(?:isolation|z-index):/, '侧栏根节点不得无条件隔离层叠上下文，否则弹窗会被主会话内容遮挡')
// 2026-10-13（1.3.0 合成层开合动画）：允许**动画期间**的层叠提升。内容列用 transform
// 位移会生成层叠上下文，且 DOM 顺序在侧栏列之后，不抬升侧栏就会被滑动中的内容盖住。
// 安全性依据：搜索弹窗是全屏 scrim（z-index 10020），打开期间侧栏按钮不可点，
// 「弹窗与开合动画同时存在」在交互上不可达；宿主浮层（overlayLayer z-index 20）
// 同理会挡住侧栏的收起按钮。禁止的是**无条件**隔离——那会把弹窗长期困在侧栏的
// 层叠上下文里。动画窗口仅 180ms（--dcu-motion-move-duration）。
assert.match(sidebar, /\[data-dcu-sidebar-motion\]:not\(\[data-dragging\]\) \.dcu-root\{z-index:1\}/, '动画期间侧栏必须抬到位移中的内容列之上，且只允许动画期间抬升')
assert.match(sidebar, /body\[data-ds-dark-theme\]\[data-we-sidebar-glass\] \.dcu-root::before\{[^}]*--we-sidebar-color[^}]*--we-sidebar-alpha/, '暗色侧栏必须单独降低 Wallpaper Engine 玻璃底色强度')
// 2026-10-12 设计变更登记：原 `@supports not (backdrop-filter)` 的"恢复实底"降级已不存在。
// 现方案是玻璃层本身半透明，另由 `body[data-we-appwindow]` 关闭模糊（见下一行断言）；
// 文字可读性依赖宿主背景 + 主题文字色，不再有独立实底兜底。此处的意图变化记录在 KNOWN-ISSUES §3。
assert.match(sidebar, /body\[data-we-appwindow\]\[data-we-sidebar-glass\] \.dcu-root::before\{-webkit-backdrop-filter:none;backdrop-filter:none\}/, '应用窗口内必须关闭毛玻璃，退回纯色层保证文字可读')
assert.match(theme, /--dcu-tip-bg:#f0f0f0/, '浅色悬停卡片必须是浅底，不得写死深色（2026-10-28 03m：ZCode --color-tooltip light #f0f0f0 实测，原 #ffffff 为估值）')
assert.match(theme, /--dcu-tip-bg:#2b2b2b/, '暗色悬停卡片必须使用 ZCode 的中性深灰背景')
// 2026-10-13 更新：ZCode 的 foreground-subtle/subtlest 是叠在**白底**上推导的，落到侧栏 #f0f0f0 上
// 实测只有 3.93:1 / 2.32:1（低于 WCAG AA 4.5:1）。此处按侧栏底色重新取值。
// 2026-10-18（设计审计 P1-1，CODE-040）：原断言把三档的具体 hex 写成契约，于是「调 secondary
// 修明度塌陷」会先撞红门禁——而最该守的两件事（**每档都达 AA**、**相邻档可分辨**）反倒没被断言。
// 改为锁意图：从主题里取出实际值，断言 ①两套主题每档 on 各自底色 ≥4.5:1
// ②同一字号相邻两档的明度差 ΔL* ≥ 6（否则「有第三档」在视觉上不成立）。
function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => srgbToLinear(Number.parseInt(h.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrastRatio(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)]
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}
/** CIE L*（明度感知轴），用于判断「两档能不能被看出区别」。 */
function lightness(hex: string): number {
  const y = luminance(hex)
  return y > 0.008856 ? 116 * y ** (1 / 3) - 16 : 903.3 * y
}
const sidebarTiers = ((): { bg: string; primary: string; secondary: string; tertiary: string; icon: string }[] => {
  /*
   * 2026-10-27（G14）：secondary 从写死 hex 改为 alpha 叠加（color-mix），
   * 因此这里要能把 `color-mix(in oklab,#RRGGBB N%,transparent)` 解析成
   * 「与背景合成后的等效 hex」再参与后续的对比度/明度差计算。
   * 断言的真实诉求（≥4.5:1、ΔL*≥6）不变，只是取值方式适应了新写法。
   */
  const mixToHex = (fgHex: string, alpha: number, bgHex: string): string => {
    const fg = [1, 3, 5].map(i => parseInt(fgHex.slice(i, i + 2), 16))
    const bg = [1, 3, 5].map(i => parseInt(bgHex.slice(i, i + 2), 16))
    const out = [0, 1, 2].map(i => Math.round(fg[i] * alpha + bg[i] * (1 - alpha)))
    return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('')
  }
  const read = (block: string, name: string): string => {
    const bgMatch = new RegExp('--dcu-sidebar-background:(#[0-9a-fA-F]{6})').exec(block)
    const bgHex = bgMatch !== null ? bgMatch[1] : '#ffffff'
    const hex = new RegExp('--dcu-sidebar-' + name + ':(#[0-9a-fA-F]{6})').exec(block)
    if (hex !== null) return hex[1]
    const mix = new RegExp(
      '--dcu-sidebar-' + name + ':color-mix\\(in oklab,(#[0-9a-fA-F]{6}) ([\\d.]+)%,transparent\\)',
    ).exec(block)
    assert.ok(mix !== null, `主题块里必须定义 --dcu-sidebar-${name}（hex 或 color-mix 形式）`)
    return mixToHex(mix[1], Number(mix[2]) / 100, bgHex)
  }
  const lightStart = theme.indexOf('.dcu-root,.dcu-settings-page,.dcu-home{')
  const darkStart = theme.indexOf('body[data-ds-dark-theme] .dcu-root')
  assert.ok(lightStart >= 0 && darkStart > lightStart, '主题必须同时定义亮/暗两套侧栏色板')
  const lightBlock = theme.slice(lightStart, darkStart)
  const darkBlock = theme.slice(darkStart)
  return [lightBlock, darkBlock].map(block => ({
    bg: read(block, 'background'),
    primary: read(block, 'primary'),
    secondary: read(block, 'secondary'),
    tertiary: read(block, 'tertiary'),
    icon: read(block, 'icon'),
  }))
})()
for (const [index, tiers] of sidebarTiers.entries()) {
  const name = index === 0 ? '浅色' : '暗色'
  for (const tier of ['primary', 'secondary', 'tertiary'] as const) {
    const ratio = contrastRatio(tiers[tier], tiers.bg)
    assert.ok(ratio >= 4.5, `${name}侧栏 ${tier} ${tiers[tier]} on ${tiers.bg} 必须 ≥4.5:1（实测 ${ratio.toFixed(2)}:1）`)
  }
  // 相邻两档必须可分辨：**这是「三档灰」这个设计成立的前提**，比记死某个 hex 重要得多。
  // 2026-10-18 之前的实测是 ΔL* 4.9(亮)/2.3(暗)，第三档在视觉上不存在 —— 正是 P1-1 要修的。
  // 2026-10-18（红队复核）：icon 是**图标色**不是第四档文字（全仓只用于 SVG），
  // 因此不参与上面的「文字档 ΔL*≥6」，改按 WCAG 非文本 3:1 单独守。
  // 这条断言的意义：P1-1 把 secondary 移近 icon 后，若有人顺手把 icon 也调淡，
  // 图标会跌破 3:1 —— 而那是一条真实的 a11y 底线，不能靠「不参与文字判据」逃掉。
  const iconRatio = contrastRatio(tiers.icon, tiers.bg)
  assert.ok(iconRatio >= 3, `${name}侧栏图标色 ${tiers.icon} on ${tiers.bg} 必须 ≥3:1（非文本图形底线，实测 ${iconRatio.toFixed(2)}:1）`)
  const pToS = Math.abs(lightness(tiers.primary) - lightness(tiers.secondary))
  const sToT = Math.abs(lightness(tiers.secondary) - lightness(tiers.tertiary))
  assert.ok(pToS >= 6, `${name}侧栏 primary 与 secondary 的明度差必须 ≥6 ΔL*（实测 ${pToS.toFixed(1)}）`)
  assert.ok(sToT >= 6, `${name}侧栏 secondary 与 tertiary 的明度差必须 ≥6 ΔL*（实测 ${sToT.toFixed(1)}）——小于此值第三档等于不存在`)
}
// 2026-10-12 设计变更登记：ZCODE-DESIGN §2 只定义了 primary/secondary/tertiary/icon 四档，
// 没有"导航比标题更淡"的独立层级——`--dcu-sidebar-navigation` 现与 primary 同值，主菜单直接用 primary。
// 因此不再断言"导航必须更淡"，改为断言主菜单的字重与取色（意图：常规字重、不用主标题色）。
assert.match(sidebar, /\.dcu-menu button[^}]*color:var\(--dcu-sidebar-primary\)[^}]*font-weight:400/, '主导航必须使用 ZCode 的常规字重与语义文字色')
assert.match(sidebar, /\.dcu-extension-items button\{[^}]*font-size:var\(--dsw-font-size-caption\);font-weight:400/, '扩展二级导航必须比父级更淡更小，形成缩进层级')
// 2026-10-29：ZCode 折叠体是 `animation:.3s ease-in-out`（asar 原文），与侧栏开合（200ms）不是一档，
// 这里改用独立的 collapse 档，避免再次把两个时长并成一个。
assert.match(sidebar, /\.dcu-extension-panel\{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var\(--dcu-motion-collapse-duration\) var\(--dcu-motion-collapse-ease\),opacity var\(--dcu-motion-collapse-duration\) var\(--dcu-motion-collapse-ease\)/, '扩展面板属折叠体，必须使用 collapse 档（ZCode .3s ease-in-out）')
assert.match(sidebar, /\.dcu-extension-panel\[data-open=false\]\{grid-template-rows:0fr;opacity:0;pointer-events:none\}/, '收缩的扩展面板必须禁止鼠标命中')
assert.match(sidebar, /\.dcu-extensions-group:hover \.dcu-extension-default-icon,[^{]*\{opacity:0/, '扩展分组悬停时必须隐藏左侧扩展图标')
assert.match(sidebar, /\.dcu-extensions-group:hover \.dcu-extension-state-arrow/, '扩展分组悬停时必须在左侧图标位显示状态箭头')
assert.match(sidebar, /\.dcu-extensions-toggle:focus-visible \.dcu-extension-state-arrow/, '键盘聚焦扩展分组时必须显示状态箭头')
assert.doesNotMatch(sidebar, /dcu-extension-chevron/, '状态箭头不得出现在扩展标题右侧')
assert.doesNotMatch(sidebar, /dcu-extensions-group" onMouseEnter|extensionsHovered/, '悬停不得改变扩展分组的展开状态')
assert.match(sidebar, /SIDEBAR_EXPANSION_STORAGE_KEY = 'dsh-codex-ui\.sidebar-expansion\.v1'/, '扩展分组偏好必须使用统一的存储键名约定')
assert.match(sidebar, /browserStorage\(\)/, '扩展分组偏好必须复用统一的浏览器存储访问器')
assert.match(sidebar, /\.dcu-extension-panel,.dcu-extension-leading svg\{animation:none;transition:none\}/, '扩展动画必须遵循减少动态效果设置')
// 2026-10-12 设计变更登记：任务频道/定时页签由"整行切换器"改为 ZCode 的分段控件
//（`--dcu-surface` 底 + 1px 边框 + 8px 圆角 + 2px 内衬），不再用 border-bottom 分隔。
// 2026-10-14：圆角允许写成 var(--dsw-radius-lg)（值同为 8px），锁意图不锁写法。
assert.match(sidebar, /\.dcu-im-tabs\{[^}]*background:var\(--dcu-surface\);border:1px solid var\(--dcu-sidebar-border\);border-radius:(?:8px|var\(--dsw-radius-lg\))/, '任务频道定时页签必须是 ZCode 分段控件（surface 底 + 边框 + 8px 圆角）')
// 2026-10-30（夜审批次 2）：03i §B B1–B4 双端 CDP 实测，ZCode 分段页签是 28 高 / 14px / 500，不是 sm(12px)。
assert.match(sidebar, /\.dcu-im-tab\{[^}]*font:500 14px\/21px/, '任务频道定时页签对齐 ZCode 分段控件档位（h28 / 14px / 500）')
assert.match(sidebar, /\.dcu-im-tab\[data-on=true\]\{[^}]*background:var\(--dcu-sidebar-selected\)/, '选中页签必须用底色区分（ZCode 分段控件不再用字重加粗）')
assert.match(sidebar, /\.dcu-extension-items::before\{content:"";position:absolute;left:-12px/, '扩展树线必须与父级图标中心对齐')
assert.doesNotMatch(sidebar, /\.dcu-extension-items \.dcu-menu-icon\{display:none\}/, '扩展子项必须显示各自的图标')
assert.match(sidebar, /\.dcu-extension-items button\{[^}]*grid-template-columns:16px minmax\(0,1fr\)/, '扩展子项必须保留图标列')
// 2026-10-12 实测反馈：侧栏各区块靠间距区分，不画分隔线（设计文档的侧栏几何只规定 px-2/py-3/gap-1 间距）。
// 同理底栏入口之间也不得逐项画线——原先那两条规则会在侧栏里堆出一排"意义不明的直线"。
assert.doesNotMatch(sidebar, /\.dcu-workspaces\{[^}]*border-top/, '工作区区块不得用分隔线')
assert.doesNotMatch(sidebar, /\.dcu-foot\{[^}]*border-top/, '底栏不得用分隔线')
assert.match(sidebar, /dcu-workspaces-tabs\{padding-top:0\}/, '有页签时不得再叠加顶部内衬')
// 2026-10-30（夜审批次 2）：03i §A A3 实测 ZCode 行高基准是 14×1.5 = 21px（全视图统一），
// 侧栏行高由 20px 对齐至 21px；字体族仍必须跟随宿主令牌。
assert.match(sidebar, /\.dcu-root\{[^}]*font:14px\/21px var\(--dsw-font-family\)/, '侧栏必须跟随宿主 --dsw-font-family，且行高基准为 21px（ZCode 14×1.5）')
assert.doesNotMatch(sidebar, /--dcu-font/, '侧栏不得再定义 --dcu-font')
assert.doesNotMatch(sidebar, /Inter,ui-sans-serif/, '侧栏不得再写死 Inter 栈')
// 2026-10-12 更新：设置入口现由宿主插槽渲染（`[data-slot="settings.trigger"]`），取侧栏语义主色；
// 与导航同层级（见上文"导航不再有独立层级"的设计变更登记）。
assert.match(sidebar, /\.dcu-settings-seat \[data-slot="settings\.trigger"\]\{color:var\(--dcu-sidebar-primary\)\}/, '底部设置入口必须与主导航保持同一文字层级')

assert.match(client, /observeConversationHeader/, '会话顶栏必须把对话/轨迹页签挪到子代理右侧')
assert.match(navigator, /TURN_SUMMARY_LIMIT = 72/, '轮次摘要必须截断到 72 字符，防止长文本拖垮刻度')
assert.match(navigator, /slice\(0, TURN_SUMMARY_LIMIT\)/, '轮次摘要必须真正应用截断')
assert.match(navigator, /dcu-turn-scroll\{[^}]*overflow-y:auto/, '长会话刻度必须恢复纵向滚动，不得溢出遮挡输入区')
assert.match(navigator, /dcu-turn-summary\{[^}]*background:#3a3d3c/, '轮次气泡必须用实色胶囊，不能被滚动容器裁掉')
/* 2026-10-26 更新为 ZCode 3.16.3 实测值（CDP 采自 [data-testid=v4-turn-navigator]）：
   静息 12x2 / opacity .58；hover 递进 2.6 / 1.7 / 1.25，只影响 ±2 条。
   规格见 优化UI插件区/ZCODE-INDEX-SPEC.md */
assert.deepEqual(tickMarkSize(2, null, true), { width: 12, height: 2, opacity: 0.58 })
assert.deepEqual(tickMarkSize(2, null, false), { width: 12, height: 2, opacity: 0.58 })
assert.ok(tickMarkSize(2, 2, true).width > 30, '悬停当前条必须明显拉长（ZCode d0 = 2.6x = 31.2px）')
assert.ok(tickMarkSize(3, 2, false).width > tickMarkSize(5, 2, false).width, '邻近刻度必须比远处更长')
assert.ok(tickMarkSize(2, 5, true).width <= 12, '悬停其他条时，原来的选中刻度必须收回到静息值')
assert.match(navigator, /data-hovering/, '轨道悬停时必须进入仅高亮悬停条的状态')
assert.match(navigator, /\[data-hovering=true\] \.dcu-turn-link\[aria-current=true\]/, '悬停时不得继续强调原来的选中刻度')
// 2026-10-30（夜审批次 14）：asar 原文 `transition-[height,opacity] duration-150 ease-out`
// 与 `transition-[height,opacity,transform,background-color] duration-150 ease-out` 实锤——
// ZCode 刻度把尺寸与颜色放在同一条 150ms 过渡里，不走 200ms 位移档。
assert.match(navigator, /transition:width var\(--dcu-motion-feedback-duration\) var\(--dcu-motion-feedback-ease\)/, '刻度长短切换必须走 feedback 档 150ms（ZCode duration-150 ease-out 原文）')

// ── 2026-10-17 模板串截断守卫补强（第四次踩同一个坑）──────────────────────────
// 已踩历史：§13 / §19 / §26.6 / §27.7，本轮是第五次。
// 上面四条判据全部拦不住**本轮这种形态**：截断由一个**成对**的反引号造成
// （注释里写了 `both` 指代 CSS 属性），于是：
//   · 反引号奇偶 = 偶数 ✓（成对）
//   · 花括号仍配平 ✓（截断点在注释里，前后各自平衡）
//   · 注释闭合 ✓、以 } 结尾 ✓
// 结果：`const stylesheet` 只剩 3440 字符（真实应为 25453），
// 后面 2 万字符的 CSS 全部泄漏成 JS，而断言套件**全绿**。
//
// 新增确定性判据：**CSS 模板串里不允许出现成对反引号形式的"代码引用"**。
// 更根本的一条：模板串必须包含它应有的关键规则——截断必然让尾部规则消失。
{
  const mustHave = [
    '.dcu-root{',
    '.dcu-head{',
    '.dcu-menu{',
    '@keyframes dcu-sidebar-compact-in',
    '.dcu-root.dcu-compact .dcu-compact-shell',
  ]
  for (const rule of mustHave) {
    assert.ok(sidebarStylesheet.includes(rule),
      `侧栏 CSS 必须包含 "${rule}"——缺失说明模板串被提前截断（当前只截到 ${sidebarStylesheet.length} 字符）`)
  }
  // 体积下界：完整侧栏样式约 25k 字符；截断后只剩 3.4k。用宽松下界拦住"腰斩"，
  // 而不是锁死具体数值（那样每次加规则都要改断言）。
  assert.ok(sidebarStylesheet.length > 15000,
    `侧栏 CSS 不应短于 15000 字符（实测 ${sidebarStylesheet.length}）——过短说明模板串被截断`)
  // HTML 标签泄漏检测：CSS 里出现 JSX 标签说明字符串边界错了。
  assert.doesNotMatch(sidebarStylesheet, /<span|<div|className=/,
    '侧栏 CSS 中不得出现 JSX 标记——出现即说明模板串边界错位、CSS 与 JS 混流')
}
console.log('✓ 侧栏模板串：关键规则齐备、体积合理、无 JSX 泄漏')
