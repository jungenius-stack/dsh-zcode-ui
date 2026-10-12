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
assert.doesNotMatch(sidebarStylesheet, /billing-(?:trigger|rail-button)/, '侧栏不得改写费用插件入口样式')

assert.ok(sidebar.includes('.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}'), '设置图标必须使用侧栏颜色，穿过宿主 slot 包装定位图标')
assert.match(settings, /\.dcu-settings-trigger-content\{[^}]*grid-template-columns:20px minmax\(0,1fr\);column-gap:8px/, '设置入口通过固定图标列对齐文字，不再叠加旧的文字偏移')
assert.match(settings, /\.dcu-settings-trigger\[data-wide=false\] \.dcu-settings-trigger-content\{grid-template-columns:16px;justify-content:center\}/, '窄轨设置图标必须独立居中')
assert.match(settingsPage, /createPortal\([\s\S]*data-dcu-settings-page[\s\S]*document\.body\)/, '设置页必须 portal 到 document.body，避免收缩窄轨的 containing block 困住全屏页')
assert.match(settings, /body:has\(\.dcu-settings-page\) \.dcu-root/, '透明设置页隔离必须覆盖 portal 到 body 后的侧栏根')

assert.doesNotMatch(sidebar, /--dsh-chat-content-width:\s*800px/, '会话内容列必须保留宿主自适应和拖拽宽度')
assert.match(sidebar, /--dsh-composer-card-max-width:calc\(var\(--dsh-chat-content-width\) \+ 32px\)/, '输入卡片必须继续从宿主会话宽度轴派生')
assert.doesNotMatch(sidebar, /\[data-chat-flow\]\{gap:/, '不得在宿主逐行间距之外叠加旧版 flex gap')
assert.doesNotMatch(sidebar, /\[data-composer-card\]\{[^}]*min-height:/, '输入卡片由编辑区和工具栏自然撑高，不额外强制整卡最小高度')
assert.match(sidebar, /\[data-input-mirror\]\{min-height:44px/, '空输入镜像高度必须接近 Codex 单行区')
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
assert.match(navigator, /width:16px;height:8px/, '轮次导航命中区必须紧凑')
assert.match(navigator, /--dcu-tick-w,5px/, '轮次导航默认必须是更短的微刻度')
assert.match(navigator, /\.dcu-turn-list\{display:grid;gap:2px/, '刻度默认间距必须收紧')
// 2026-10-12 更新：ZCode 改造后折叠轨不再靠根节点 `width:100%` 撑满，而是紧凑外壳自身固定 56px
// （`.dcu-compact-shell{display:none;width:56px}` + 折叠态切换到它）。意图不变：窄轨必须正好填满宿主 56px 列。
assert.match(sidebar, /\.dcu-compact-shell\{display:none;width:56px\}/, '折叠外壳必须固定 56px 宽，填满宿主列')
assert.match(sidebar, /\.dcu-root\.dcu-compact \.dcu-compact-shell\{display:flex/, '折叠态必须切换到紧凑外壳')
assert.match(sidebar, /BrandWordmark size=\{24\}/, '侧栏品牌标识必须放大')
// 2026-10-12 更新：以下三条钉的是 P1 之前的几何常量，ZCode 刻度落地后头部高 34→40px、
// 纵向内边距 28→32px、控件间距 8→4px。断言意图（单行头部、控件垂直居中、图标对齐）不变。
assert.match(sidebar, /\.dcu-head-actions\{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:4px;height:28px\}/, 'head actions grid')
assert.match(sidebar, /\.dcu-head\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/, 'head single row')
assert.match(sidebar, /\.dcu-head\{[^}]*height:var\(--dcu-header-height,40px\)/, '侧栏顶部与会话顶栏共用控件带高度')
assert.match(sidebar, /\.dcu-head\{[^}]*padding:calc\(\(var\(--dcu-header-height,40px\) - 32px\)\/2\) 8px calc\(\(var\(--dcu-header-height,40px\) - 32px\)\/2\) 12px/, '顶部控件垂直居中，保留 Logo 左侧留白')
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
assert.match(sidebar, /SIDEBAR_COLLAPSE_SETTLE_MS = 500/, '收缩时必须先淡出宽态，再切换窄轨，避免内容突变')
assert.match(sidebar, /width:var\(--dcu-sidebar-expanded-width,240px\)/, '宽态内容必须保持展开宽度，避免宿主动画把文字挤成竖排')
// 2026-10-12 更新：动效统一到 ZCode 的 150–200ms ease-out（原 Codex 为 500ms 弹簧曲线）。
assert.match(sidebar, /dcu-sidebar-expanded-in 180ms ease-out/, '侧栏展开必须立即使用合成层淡入动画')
assert.match(sidebar, /\.dcu-compact-shell\{display:none;width:56px\}/, '窄轨必须固定为 56px 并锚定左侧，不能在正在变化的宿主列中居中漂移')
assert.match(sidebar, /dcu-search-dialog-in 180ms ease-out/, '搜索弹窗必须保留轻量淡入缩放动画')
assert.doesNotMatch(sidebar, /transition:none!important/, '不得再关闭宿主侧栏的宽度动画')
assert.match(theme, /--dcu-sidebar-background:#f0f0f0/, '浅色侧栏必须使用 Zai ZCode 的 #f0f0f0 中性灰背景')
assert.match(theme, /--dcu-sidebar-background:#161616/, '暗色侧栏必须使用 Zai ZCode 的 #161616 背景')
assert.match(sidebar, /body\[data-we-sidebar-glass\] \.dcu-root::before\{[^}]*pointer-events:none[^}]*--we-sidebar-color[^}]*--we-sidebar-alpha[^}]*backdrop-filter:blur\(var\(--we-sidebar-blur/, 'Wallpaper Engine 玻璃必须在不拦截点击的独立背景层复用颜色、透明度和模糊变量')
assert.doesNotMatch(sidebar, /\.dcu-root\{[^}]*(?:backdrop-filter|transform|contain):/, '侧栏根节点不得创建 fixed 包含块，否则设置和搜索弹窗会被限制在侧栏内')
assert.doesNotMatch(sidebar, /\.dcu-root\s*\{(?:[^{}]*;)?\s*(?:-webkit-)?(?:filter|perspective)\s*:(?!\s*none\s*(?:!important\s*)?[;}])[^;}]+/i, '侧栏根节点不得通过非 none 的 filter 或 perspective 创建 fixed 包含块')
assert.doesNotMatch(sidebar, /\.dcu-root\s*\{(?:[^{}]*;)?\s*will-change\s*:[^;}]*\b(?:transform|translate|rotate|scale|filter|backdrop-filter|perspective|contain)\b/i, '侧栏根节点不得通过 will-change 提前创建 fixed 包含块')
assert.doesNotMatch(sidebar, /\.dcu-root\{[^}]*(?:isolation|z-index):/, '侧栏根节点不得隔离层叠上下文，否则弹窗会被主会话内容遮挡')
assert.match(sidebar, /body\[data-ds-dark-theme\]\[data-we-sidebar-glass\] \.dcu-root::before\{[^}]*--we-sidebar-color[^}]*--we-sidebar-alpha/, '暗色侧栏必须单独降低 Wallpaper Engine 玻璃底色强度')
// 2026-10-12 设计变更登记：原 `@supports not (backdrop-filter)` 的"恢复实底"降级已不存在。
// 现方案是玻璃层本身半透明，另由 `body[data-we-appwindow]` 关闭模糊（见下一行断言）；
// 文字可读性依赖宿主背景 + 主题文字色，不再有独立实底兜底。此处的意图变化记录在 KNOWN-ISSUES §3。
assert.match(sidebar, /body\[data-we-appwindow\]\[data-we-sidebar-glass\] \.dcu-root::before\{-webkit-backdrop-filter:none;backdrop-filter:none\}/, '应用窗口内必须关闭毛玻璃，退回纯色层保证文字可读')
assert.match(theme, /--dcu-tip-bg:#ffffff/, '浅色悬停卡片必须是浅底，不得写死深色')
assert.match(theme, /--dcu-tip-bg:#2b2b2b/, '暗色悬停卡片必须使用 ZCode 的中性深灰背景')
// 2026-10-13 更新：ZCode 的 foreground-subtle/subtlest 是叠在**白底**上推导的，落到侧栏 #f0f0f0 上
// 实测只有 3.93:1 / 2.32:1（低于 WCAG AA 4.5:1）。此处按侧栏底色重新取值：secondary #5c5c5c(5.87:1)、
// tertiary #686868(4.89:1)。见 docs/KNOWN-ISSUES.md §3.1 设计变更登记。
assert.match(theme, /--dcu-sidebar-primary:#262626;--dcu-sidebar-secondary:#5c5c5c;[\s\S]*?--dcu-sidebar-tertiary:#686868;--dcu-sidebar-navigation:#262626;--dcu-sidebar-icon:#525252/, '浅色侧栏必须使用达标的中性灰文字层级（primary #262626 / secondary #5c5c5c / tertiary #686868 / icon #525252，均 ≥4.5:1）')
assert.match(theme, /--dcu-sidebar-primary:#d4d4d4;--dcu-sidebar-secondary:#888888;[\s\S]*?--dcu-sidebar-tertiary:#828282;--dcu-sidebar-navigation:#d4d4d4;--dcu-sidebar-icon:#a3a3a3/, '暗色侧栏必须使用达标的中性灰文字层级（primary #d4d4d4 / secondary #888888 / tertiary #828282 / icon #a3a3a3，均 ≥4.5:1）')
// 2026-10-12 设计变更登记：ZCODE-DESIGN §2 只定义了 primary/secondary/tertiary/icon 四档，
// 没有"导航比标题更淡"的独立层级——`--dcu-sidebar-navigation` 现与 primary 同值，主菜单直接用 primary。
// 因此不再断言"导航必须更淡"，改为断言主菜单的字重与取色（意图：常规字重、不用主标题色）。
assert.match(sidebar, /\.dcu-menu button[^}]*color:var\(--dcu-sidebar-primary\)[^}]*font-weight:400/, '主导航必须使用 ZCode 的常规字重与语义文字色')
assert.match(sidebar, /\.dcu-extension-items button\{[^}]*font-size:var\(--dsw-font-size-caption\);font-weight:400/, '扩展二级导航必须比父级更淡更小，形成缩进层级')
assert.match(sidebar, /\.dcu-extension-panel\{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows 180ms ease-out,opacity 160ms ease-out/, '扩展子项必须使用连续的高度和透明度动画')
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
assert.match(sidebar, /\.dcu-im-tabs\{[^}]*background:var\(--dcu-surface\);border:1px solid var\(--dcu-sidebar-border\);border-radius:8px/, '任务频道定时页签必须是 ZCode 分段控件（surface 底 + 边框 + 8px 圆角）')
assert.match(sidebar, /\.dcu-im-tab\{[^}]*font:500 12px\/18px/, '任务频道定时页签使用刻度 sm(12px)，不再与主导航同级字号')
assert.match(sidebar, /\.dcu-im-tab\[data-on=true\]\{[^}]*background:var\(--dcu-sidebar-selected\)/, '选中页签必须用底色区分（ZCode 分段控件不再用字重加粗）')
assert.match(sidebar, /\.dcu-extension-items::before\{content:"";position:absolute;left:-12px/, '扩展树线必须与父级图标中心对齐')
assert.doesNotMatch(sidebar, /\.dcu-extension-items \.dcu-menu-icon\{display:none\}/, '扩展子项必须显示各自的图标')
assert.match(sidebar, /\.dcu-extension-items button\{[^}]*grid-template-columns:16px minmax\(0,1fr\)/, '扩展子项必须保留图标列')
// 2026-10-12 实测反馈：侧栏各区块靠间距区分，不画分隔线（设计文档的侧栏几何只规定 px-2/py-3/gap-1 间距）。
// 同理底栏入口之间也不得逐项画线——原先那两条规则会在侧栏里堆出一排"意义不明的直线"。
assert.doesNotMatch(sidebar, /\.dcu-workspaces\{[^}]*border-top/, '工作区区块不得用分隔线')
assert.doesNotMatch(sidebar, /\.dcu-foot\{[^}]*border-top/, '底栏不得用分隔线')
assert.match(sidebar, /dcu-workspaces-tabs\{padding-top:0\}/, '有页签时不得再叠加顶部内衬')
assert.match(sidebar, /\.dcu-root\{[^}]*font:14px\/20px var\(--dsw-font-family\)/, '侧栏必须跟随宿主 --dsw-font-family')
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
assert.deepEqual(tickMarkSize(2, null, true), { width: 5, height: 1 })
assert.deepEqual(tickMarkSize(2, null, false), { width: 5, height: 1 })
assert.ok(tickMarkSize(2, 2, true).width > 14, '悬停当前条必须明显拉长')
assert.ok(tickMarkSize(3, 2, false).width > tickMarkSize(5, 2, false).width, '邻近刻度必须比远处更长')
assert.ok(tickMarkSize(2, 5, true).width < 8, '悬停其他条时，原来的选中刻度必须收回去')
assert.match(navigator, /data-hovering/, '轨道悬停时必须进入仅高亮悬停条的状态')
assert.match(navigator, /\[data-hovering=true\] \.dcu-turn-link\[aria-current=true\]/, '悬停时不得继续强调原来的选中刻度')
assert.match(navigator, /transition:width 180ms ease-out/, '刻度长短切换必须使用 ZCode 的 180ms ease-out 缓动')
