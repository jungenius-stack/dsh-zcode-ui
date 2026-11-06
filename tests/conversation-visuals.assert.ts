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
// 2026-11-03（9224 活体实测）：ZCode 运行时 --color-sidebar 浅色解析为 **#f0f0f0**（不是 tokens.json
// 记的 oklch(97%)=245）。此前锁 #f5f5f5 是照 tokens.json 推的，活体证明那份是基础层、不是覆盖层。
const SIDEBAR_LIGHT_CDP = '#f0f0f0'
assert.match(theme, new RegExp('--dcu-sidebar-background:' + SIDEBAR_LIGHT_CDP), '浅色侧栏壳底必须对齐 9224 活体实测 --color-sidebar = #f0f0f0')
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
assert.match(sidebar, /\.dcu-root\[data-dcu-motion\]\{z-index:1\}/, '动画期间侧栏必须抬到位移中的内容列之上，且只允许动画期间抬升')
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

// ── G1 工具调用摘要行（2026-10-31，ZCode v3.17.1 ToolSummaryRow 源码）──
// 宿主把整行压在 30% 前景上，导致「类别词」与「干了什么」同灰。ZCode 的规则是：
// 主文本继承默认前景、只有图标与 kindLabel 走 subtlest；字号 text-ui-base = 14px。
{
  const layout = readFileSync(new URL('../src/client/conversation-layout.ts', import.meta.url), 'utf8')
  const layoutStyle = layout.match(/CONVERSATION_LAYOUT_STYLE = `([\s\S]*?)`/)?.[1]
  assert.ok(layoutStyle, '必须能读取会话区样式表（G1 工具卡规则所在），避免防回归被跳过')
  const g1 = layoutStyle.match(/\[data-chat-flow-kind="tool-call"\][^{]*\{[^}]*\}/)?.[0]
  assert.ok(g1, 'G1 规则缺失：工具调用摘要行必须把主文本提回默认前景（当前锚点 [data-chat-flow-kind="tool-call"]）')
  assert.match(g1, /-gRAhq_summary/, 'G1 必须只作用于摘要文本容器（-gRAhq_summary），不得波及类别词')
  assert.match(g1, /_text_1rdzk_17/, 'G1 必须命中宿主摘要文本的文本类，否则规则静默失效（宿主换哈希即触发本断言）')
  assert.match(g1, /color:var\(--dsw-alias-label-primary\)/, '主文本必须回默认前景（ZCode：主文本继承前景，仅 kindLabel 用 subtlest）')
  assert.match(g1, /font-size:var\(--dsw-font-size-base\)/, '主文本字号必须走基础档（ZCode text-ui-base = 14px）')
  assert.doesNotMatch(g1, /font-size:\d+px/, '字号不得写字面量（ZCode 宪章：字号必须走系统刻度）')
  // 反向守卫：类别词不得被一并提亮——两边同亮度正是本轮要修的问题。
  assert.doesNotMatch(layoutStyle, /-gRAhq_title[^{]*\{[^}]*label-primary/,
    '类别词（-gRAhq_title）必须留在最弱档；若与主文本同亮，本轮修复等于没做')
  console.log('✓ G1 工具卡：主文本回默认前景 + 14px 基础档，类别词保持最弱档')
}

// ── ⑧ 正文区排版元素（2026-11-01 活体落码 + 当晚深审修正）──
// 03n（e4a8bce）已落标题全套/列表基础/li 内 p/marker；本段锁四项增量 + 两条深审反向守卫。
// 深审证伪记录：①「ZCode 链接=白+下划线」是误引（prose 变量对正文永不生效，正文无裸 a；
// 真相=icon-blue+静态无下划线+hover dotted）→ 本套件禁止给链接加常驻下划线；
// ② p 段距必须收窄在 markdown 宿主内（全列作用会误伤 cm-note 等 DSH 自有面）。
{
  const layout = readFileSync(new URL('../src/client/conversation-layout.ts', import.meta.url), 'utf8')
  const layoutStyle = layout.match(/CONVERSATION_LAYOUT_STYLE = `([\s\S]*?)`/)?.[1]
  assert.ok(layoutStyle, '必须能读取会话区样式表（正文排版规则所在），避免防回归被跳过')
  const rules = (sel: string) => layoutStyle.split('}').filter(r => r.includes(sel)).pop()
  // 03n 轮既有规则防删失（用户点名的「毛坯房」修复，不许回归）
  assert.match(rules('.icaHSq_column h1') ?? '', /margin:24px 0 16px|margin-top:24px/, 'h1 顶距必须 mt-6(24)（03n 轮既定）')
  assert.match(rules('.icaHSq_column h3') ?? '', /font-weight:600/, 'h3/h4 必须 600（03n 轮既定）')
  assert.match(rules('.icaHSq_column h5') ?? '', /font-weight:500/, 'h5 必须 500（ZCode h5=medium）')
  assert.match(rules('.icaHSq_column li + li') ?? '', /margin-top:6px/, '列表相邻项必须 6px（ZCode space-y-1.5）')
  assert.match(rules('li > p') ?? '', /margin:0/, 'li 内段落必须归零行内化（ZCode [&>p]:my-0）')
  assert.match(rules('li::marker') ?? '', /--dsw-alias-label-dimmed/, '列表 marker 必须走最弱档（ZCode marker:text-foreground-subtlest，规则在 03n 块）')
  // 2026-11-01 增量（深审修正版）
  assert.match(layoutStyle, /\.icaHSq_column \[class\*="_markdown_"\] p\{margin-bottom:16px\}/,
    'p 段后 16px 必须收窄在 markdown 宿主内（全列作用会误伤 cm-note 等 DSH 自有面——深审实测 18 个 p 泄漏）')
  assert.match(rules('.icaHSq_column ol') ?? '', /list-style-position:inside/, 'ol 必须 list-inside + pl-0（ZCode 源码：防两位编号左截断；03n 误写 20px/outside，本段纠偏）')
  assert.match(rules('.icaHSq_column strong') ?? '', /font-weight:500/, 'strong 必须 500——ZCode 强调是 font-medium（message.tsx），DSH 宿主 600 偏重')
  assert.match(rules('.icaHSq_column hr') ?? '', /border-top:1px solid var\(--dsw-alias-border-l2/, 'hr 必须可见（1px border-l2；2026-11-01 活体推翻 ⑤ 旧结论「0 个可见 hr」）')
  // 深审反向守卫一：链接不得加常驻下划线（ZCode 静态无下划线；曾据 prose 变量误落，已撤）
  assert.doesNotMatch(layoutStyle, /\.icaHSq_column a\{[^}]*text-decoration/,
    '不得给 .icaHSq_column a 加静态下划线——ZCode 链接静态无下划线（正文无裸 a，外链 hover 才 dotted），常驻下划线是 ZCode 没有的样式且会误伤附件链接（深审实测 Q2dzhW_fileLink 被误伤）')
  // 深审反向守卫二：⑧ 段不得给链接改色——颜色挂 F6 决策下（保留 DSH 品牌蓝）
  assert.doesNotMatch(layoutStyle.match(/── ⑧ [\s\S]*?(?=── G1|── ⑦|$)/)?.[0] ?? '', /\.icaHSq_column a\{[^}]*color/,
    '⑧ 段不得给链接改色（颜色挂 F6 决策下：保留 DSH 品牌蓝）')
  console.log('✓ 正文排版：03n 既定在位 + p 段距(收窄域)/marker/ol 纠偏/strong 500/hr 可见 + 链接双反向守卫')
}

// ── TC4/G4 工具卡展开体 + 推理块竖线（2026-11-02 夜跑批次 7）──
{
  const layout = readFileSync(new URL('../src/client/conversation-layout.ts', import.meta.url), 'utf8')
  const layoutStyle = layout.match(/CONVERSATION_LAYOUT_STYLE = `([\s\S]*?)`/)?.[1]
  assert.ok(layoutStyle, '必须能读取会话区样式表（TC4/G4 规则所在），避免防回归被跳过')
  const rules = (sel: string) => layoutStyle.split('}').filter(r => r.includes(sel)).pop()
  assert.match(rules('[class*="_ioCard"]') ?? '', /border-radius:var\(--dsw-radius-xl\)/, 'TC4 展开体圆角必须 xl(12)——ZCode ToolCallBody.tsx:109 rounded-xl（源码+编译产物双源）')
  assert.match(rules('[class*="_ioCard"]') ?? '', /border-width:1px/, 'TC4 展开体边必须 1px（ZCode border-border；DSH 宿主 0.5px 偏细）')
  assert.match(rules('[class*="_ioSection"]') ?? '', /padding:12px/, 'TC4 输出区内距必须 12/12（ZCode px-3 py-3）')
  // 2026-11-05 night13 更正（CODE-040）：这条此前锁的是派生物，挂错了节点。
  // CDP 活体（DSH 9223）实测：TXqvFW = ChatGroupSeat（工具分组，30/30 个 body 全被加边），
  // HiSsxa = ReasoningRow（真正的推理体，命中 0）。旧断言把"挂在工具组上"写成了契约。
  // 现锁真实推理体，且不加 margin（DSH 推理体自带 padding-left:calc(22px + delta)），
  // padding-left 取 21px：21 + 1px 边 = 原有 22px，文字左缘不动。
  const g4 = rules('[class*="HiSsxa_thinkBody"]') ?? ''
  assert.ok(g4 !== '', 'G4 规则必须挂在 HiSsxa_thinkBody（DSH ReasoningRow 推理体，非 TXqvFW 工具分组）')
  assert.doesNotMatch(g4, /margin-left/, 'G4 不得给推理体加 margin——DSH 已自带 22px 缩进，再加会翻倍')
  assert.match(g4, /border-left:1px solid var\(--dsw-alias-border-l2/, 'G4 竖线必须 1px border-l2（reasoning.tsx border-border 值链）')
  // 2026-11-05 二次更正：DSH 原文是 calc(22px + delta)，不能写死 21px（会吃掉字号缩放）
  assert.match(g4, /padding-left:calc\(21px \+ var\(--dsh-content-font-delta,0px\)\)/, 'G4 竖线与内容间距 = 22px+delta−1px边（文字左缘不动，且跟随字号缩放）')
  assert.match(g4, /max-height:240px/, 'G4 推理展开体必须限高 240px（ZCode max-h-60）')
  assert.match(g4, /overflow-y:auto/, 'G4 推理展开体必须内部滚动（ZCode max-h-60 + 滚动）')
  // 反向守卫：ioCard 底色不许落——ZCode bg-muted/15 是死类（主题无 --color-muted，编译产物
  // 0 命中，实际渲染透明），照抄透明=替宿主制造缺陷；等上游补色后由人裁决。
  assert.doesNotMatch(layoutStyle.match(/\[class\*="_ioCard"\]\{[^}]*\}/)?.[0] ?? '', /background/,
    'TC4 展开体不得落底色——bg-muted/15 在 ZCode 是死类（渲染透明），DSH 实底保留（批次7 判定，底色争议待上游补色后重裁）')
  console.log('✓ TC4/G4：展开体圆角/边/内距 + 推理竖线 ml8/border-l/pl14 + 死类底色反向守卫')
}

// ── B5/B6/B7/B8/B9 防删失（2026-11-02 夜跑断言加固扫荡）──
// D1 码卡（B5/B6）、⑦ 表格/引用/附件图（B7/B8/B9）三段规则各自只有一次性实测记录
// （03f/B7 暗色活体/04 §③），此前 0 断言守着——删除即静默回归。值全部取自
// conversation-layout.ts 既有规则文本（不新造真值），选择器带花括号精确锚定防子串碰撞。
{
  const layout = readFileSync(new URL('../src/client/conversation-layout.ts', import.meta.url), 'utf8')
  const layoutStyle = layout.match(/CONVERSATION_LAYOUT_STYLE = `([\s\S]*?)`/)?.[1]
  assert.ok(layoutStyle, '必须能读取会话区样式表（B5-B9 规则所在），避免防回归被跳过')
  const blockOf = (sel: string) => layoutStyle.split('}').find(r => r.includes(sel)) ?? ''
  // B5 围栏码卡（D1 + 批次 1/1R）：外卡 1px 边 + xl 圆角 + 码块底；banner 透明 + 8/8/8/12
  const card = blockOf('[data-conversation-scroll] .md-code-block{')
  assert.match(card, /border:1px solid var\(--dsw-alias-border-l2/, 'B5 码卡外框必须 1px border-l2（D1 定案）')
  assert.match(card, /border-radius:var\(--dsw-radius-xl\)/, 'B5 码卡圆角必须 xl(12)——上游加头部条后 rounded-xl（批次 1）')
  assert.match(card, /background:var\(--dsw-alias-markdown-code-block\)/, 'B5 码卡底必须走码块令牌（值已在 zcode-tokens 对齐）')
  const banner = blockOf('[class*="_bannerWrap"]{')
  assert.match(banner, /background:transparent/, 'B5 banner 必须透明（DSH 深条是宿主默认，批次 1 前的旧观感）')
  assert.match(banner, /padding:8px 8px 8px 12px/, 'B5 banner 内距必须 8/8/8/12（ZCode px-3 py-2 活体）')
  const preBlock = layoutStyle.split('}').find(r => r.includes('.md-code-block pre{')) ?? ''
  assert.match(preBlock, /--shiki-background:var\(--dsw-alias-markdown-code-editor-bg\)/, 'B5 pre 必须重定义 shiki 背景变量（内联 style 优先级兜底）')
  assert.match(preBlock, /border:1px solid var\(--dsw-alias-border-l2/, 'B5 pre 边必须 1px border-l2')
  assert.match(preBlock, /padding:0 8px 12px/, 'B5 pre 内距必须 0/8/12（live-verdicts C-5 收口：体包 0/8/12/8，夜3 surface-14 4#2；旧 6/8/12 系 D1 活体已被翻案）')
  // B6 行内码
  const inline = blockOf('[data-conversation-scroll] .icaHSq_column :not(pre) > code{')
  assert.match(inline, /background:var\(--dsw-alias-markdown-inline-code\)/, 'B6 行内码底必须走 inline-code 令牌（color-mix tag 50% 值链）')
  assert.match(inline, /padding:2px 6px/, 'B6 行内码内距必须 2/6（ZCode px-1.5 py-0.5）')
  assert.match(inline, /border:0/, 'B6 行内码必须无边（DSH 宿主自带 0.5px 边要去掉）')
  // B7 表格（⑦ + 2026-11-01 外框裁决）
  const table = blockOf('[data-conversation-scroll] .icaHSq_column table{')
  assert.match(table, /border:1px solid var\(--dsw-alias-border-l2/, 'B7 表格外框必须 1px border-l2（2026-11-01 外框裁决=有）')
  assert.match(table, /border-radius:var\(--dsw-radius-xl\)/, 'B7 表格外框圆角必须 xl(12)（ZCode rounded-xl）')
  const cells = blockOf('.icaHSq_column th,\n[data-conversation-scroll] .icaHSq_column td{') || blockOf('.icaHSq_column td{')
  assert.match(cells, /padding:8px 12px/, 'B7 单元格内距必须 8/12（ZCode px-3 py-2）')
  assert.match(cells, /border-bottom:1px solid var\(--dsw-alias-border-l2/, 'B7 单元格必须 1px 行线')
  assert.match(blockOf('.icaHSq_column th{'), /font-weight:400/, 'B7 表头必须 400（ZCode font-normal）')
  assert.match(blockOf('.icaHSq_column th{'), /--dsw-alias-label-dimmed/, 'B7 表头必须最弱档 dimmed（th foreground-subtlest）')
  // td{ 是联合块「th,\n…td{」的尾子串，find 会撞联合块——取最后一个含它的块（td 单独块）
  const tdBlock = layoutStyle.split('}').filter(r => r.includes('.icaHSq_column td{')).pop() ?? ''
  assert.match(tdBlock, /--dsw-alias-label-primary/, 'B7 表体必须全前景（td text-foreground）')
  // B8 引用块（04 §③ 活体：4px 竖线/斜体/500/1.6em）
  const quote = blockOf('.icaHSq_column blockquote{')
  assert.match(quote, /border-left:4px solid var\(--dsw-alias-border-l2/, 'B8 引用竖线必须 4px border-l2（ZCode prose .25rem）')
  assert.match(quote, /font-style:italic/, 'B8 引用必须斜体（ZCode prose 原文）')
  assert.match(quote, /font-weight:500/, 'B8 引用必须 500（ZCode prose font-medium）')
  assert.match(quote, /padding:0 0 0 14px/, 'B8 引用左内距必须 14px（1em）')
  // B9 附件缩略图（正文插图真值已更正：阴影永远不加——反向守卫）
  const img = blockOf('.IzP3Va_attachmentRow img{')
  assert.match(img, /border:1px solid var\(--dsw-alias-border-l2/, 'B9 附件图必须 1px 边（rounded-xl + border-border）')
  assert.doesNotMatch(img, /box-shadow/, 'B9 附件图不得加阴影——shadow-2xl 是灯箱 video 误记，正文插图无阴影（2026-11-01 翻案）')
  console.log('✓ B5-B9：码卡/行内码/表格/引用/附件图 15 条防删失 + 阴影反向守卫')
}
