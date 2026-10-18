import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const tree = readFileSync(new URL('../src/client/session-tree.tsx', import.meta.url), 'utf8')
const channel = readFileSync(new URL('../src/client/ChannelBrowser.tsx', import.meta.url), 'utf8')
const schedule = readFileSync(new URL('../src/client/ScheduleBrowser.tsx', import.meta.url), 'utf8')
const workspace = readFileSync(new URL('../src/client/CodexWorkspaceBrowser.tsx', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/client/CodexSidebar.tsx', import.meta.url), 'utf8')
const pending = readFileSync(new URL('../src/client/session-pending.ts', import.meta.url), 'utf8')
const sessionManager = readFileSync(new URL('../src/client/session-manager.ts', import.meta.url), 'utf8')
const locales = readFileSync(new URL('../src/client/locales.ts', import.meta.url), 'utf8')

assert.match(tree, /from '\.\/zcode-icons\.tsx'/, '悬浮快捷操作必须经统一图标入口（zcode-icons → Lucide）取描边图标')
assert.match(tree, /import \{[^}]*ZIconPin[^}]*\} from '\.\/zcode-icons\.tsx'/, '项目置顶必须经统一入口取标准图钉')
assert.match(tree, /function PinIcon\(\)[^]*<ZIconPin aria-hidden="true" size=\{16\} strokeWidth=\{1\.5\} \/>/, '悬浮卡片与项目菜单必须复用 16px、1.5px 线宽的标准图钉')
assert.doesNotMatch(tree, /function PinIcon\(\)\s*\{\s*return <svg/, '项目置顶不得继续使用自绘图标')
assert.match(tree, /function QuickArchiveIcon\(\)[^]*ZIconArchive[^]*size=\{16\}[^]*strokeWidth=\{1\.5\}/, '悬浮归档图标必须使用 16px、1.5px 线宽')
assert.match(tree, /dcu-wb-quick-actions[\s\S]*?<QuickArchiveIcon \/>/, '共用会话行的悬浮归档操作必须使用独立的 Lucide 描边图标')
assert.match(tree, /id: 'archive'[\s\S]*?ZIconArchive size=\{16\}/, '菜单归档图标必须继续使用标准 16px 尺寸')
// 2026-10-14：会话置顶接入宿主模型（workspaces.pinSession / pinnedSessionIds）。
// 上游 0.2.102 移除的是「本地自维护、与项目置顶并存的第二套置顶」；宿主 registry 级
// 置顶不是那一套——状态唯一来自宿主快照，本地存储与自绘图标仍然禁止。
assert.doesNotMatch(tree, /QuickPinIcon|SESSION_PINS_STORAGE_KEY|setPinnedSessionIds/, '会话置顶不得回到本地自维护模型（宿主 API 之外不得有第二份状态）')
assert.match(tree, /export function SessionPinButton[^]*<PinIcon \/>/, '行首置顶按钮必须复用统一图钉图标（不得自绘）')
assert.match(tree, /id: 'pin', label: t\(options\.pinned \? 'sessions\.unpin' : 'sessions\.pin'\)/, '共用菜单的置顶项必须随状态给出置顶/取消置顶文案')
assert.match(tree, /import \{[^}]*ZIconEye[^}]*ZIconEyeOff[^}]*\} from '\.\/zcode-icons\.tsx'/, '共用菜单必须经统一图标入口取眼睛图标')
assert.match(tree, /id: 'unread'[\s\S]*options\.unread \? <ZIconEyeOff[^>]*\/> : <ZIconEye[^>]*\/>/, '标记为已读必须使用闭眼图标，标记为未读必须使用睁眼图标')
assert.match(tree, /id: 'fork'[\s\S]*ZIconBranch/, '共用菜单继续必须有图标')
assert.match(tree, /main-separator/, '共用菜单分隔必须与任务树一致')
assert.match(workspace, /sessionMenuItems\(t, \{[\s\S]*?includePath: true,[\s\S]*?moveTargets:[\s\S]*?canDelete:/, '任务树必须复用共用会话菜单并按归档删除能力决定是否显示删除')
assert.match(channel, /moveSession === undefined \|\| workspaces === undefined \? undefined[\s\S]*?sessionMenuItems\(t, \{ unread, moveTargets, canDelete \}\)/, '频道必须复用共用会话菜单，并在旧宿主缺少移动能力时隐藏项目子菜单')
assert.match(schedule, /moveSession === undefined \? undefined[\s\S]*?sessionMenuItems\(t, \{ unread, moveTargets, canDelete \}\)/, '定时必须复用共用会话菜单，并在旧宿主缺少移动能力时隐藏项目子菜单')
for (const source of [workspace, channel, schedule]) {
  assert.doesNotMatch(source, /setPinnedSessionIds|SESSION_PINS_STORAGE_KEY|QuickPinIcon|dcu-wb-quick-pin/, '三棵会话树都不得本地维护会话置顶（宿主快照 pinnedSessionIds 是唯一状态源）')
}
for (const source of [channel, schedule]) {
  assert.doesNotMatch(source, /pinned=|onTogglePin|pinSession/, '频道与定时树不得呈现或调用会话置顶（宿主置顶是工作区账户级概念，仅任务树接入）')
}
assert.match(channel, /<SessionRow /, '频道必须复用共用会话行')
assert.match(schedule, /<SessionRow /, '定时必须复用共用会话行')
assert.match(tree, /data-state="warning"[^]*dcu-wb-pending-label/, '共用会话行必须显示待处理交互警告状态和文本')
assert.match(workspace, /pendingInteractionForSession\(id, pendingInteractions, legacyPendingInteraction\(session\)\)/, '任务树必须兼容旧版 SessionSummary 和新版待处理交互 Store')
assert.match(pending, /'pendingInteraction' in summary/, '旧版 SessionSummary 字段必须经过结构检查后读取')
assert.match(channel, /pendingInteractionForSession\(id, pendingInteractions, sessions\.byId\[id\]\?\.pendingInteraction\)/, '频道必须兼容 SessionSummary 和待处理交互 Store')
assert.match(schedule, /pendingInteractionForSession\(id, pendingInteractions, sessions\.byId\[id\]\?\.pendingInteraction\)/, '定时必须兼容 SessionSummary 和待处理交互 Store')
for (const source of [workspace, channel, schedule]) {
  assert.match(source, /useHostPendingInteractions\(useSessionPendingInteraction, useSessionStatus\)/, '三棵树必须同时订阅旧 pending Store 和 alpha.2 SessionStatus')
  assert.match(source, /useHostSessionStatus\(useSessionStatus\)/, '三棵树必须订阅 SessionStatus 才能读 running / 未读')
  assert.match(source, /sessionIsRunning\(/, '行上的 running 必须走 SessionStatus 优先')
  assert.match(source, /sessionRowUnread\(/, '未读点必须合并 completionUnread')
  assert.match(source, /visibleSelectedSessionId\(sessions, panelActive\)/, '全局面板打开时不得高亮主视图会话')
}
assert.match(workspace, /sessionRunningFlags\(sessions\.byId, sessionStatus\)/, '后台完成未读必须看 SessionStatus 运行边沿')
assert.match(sidebar, /<ChannelBrowser [^>]*useSessionPendingInteraction=\{useSessionPendingInteraction\}/, '侧栏必须向频道树透传待处理交互 Store')
assert.match(sidebar, /<ChannelBrowser [^>]*useSessionStatus=\{useSessionStatus\}/, '侧栏必须向频道树透传 alpha.2 SessionStatus')
assert.match(sidebar, /<ChannelBrowser [^>]*panelActive=\{panelActive\}/, '侧栏必须向频道树透传全局面板占用态')
assert.match(sidebar, /<ScheduleBrowser [^>]*useSessionPendingInteraction=\{useSessionPendingInteraction\}/, '侧栏必须向定时树透传待处理交互 Store')
assert.match(sidebar, /<ScheduleBrowser [^>]*useSessionStatus=\{useSessionStatus\}/, '侧栏必须向定时树透传 alpha.2 SessionStatus')
assert.match(sidebar, /<ScheduleBrowser [^>]*panelActive=\{panelActive\}/, '侧栏必须向定时树透传全局面板占用态')
assert.match(sidebar, /const owner = \{ wide: true, expandSidebar, panelActive \}/, '侧栏必须向任务树透传全局面板占用态')
assert.match(pending, /visiblePendingKind\(summaryKind\) \?\? visiblePendingKind\(pendingInteractions\.get\(sessionId\)\?\.kind\)/, '有效 SessionSummary 必须优先，缺失时回退待处理交互 Store')
assert.match(locales, /'sessions\.waitingAnswer': 'Waiting for answer'/, '等待回答英文文案必须与官方一致')
assert.match(locales, /'sessions\.waitingApproval': 'Waiting for approval'/, '等待审批英文文案必须与官方一致')
assert.match(locales, /'sessions\.planReview': 'Plan awaiting review'/, '计划待审英文文案必须与归档插件一致')
assert.match(channel, /<GroupHead /, '频道分组行必须走共用头部')
assert.match(channel, /<div className="dcu-wb-project-body">[\s\S]*?<SessionRow /, '频道会话必须放入任务树同款项目内容容器，保留首行胶囊间距')
assert.match(schedule, /<div className="dcu-wb-project-body">[\s\S]*?<SessionRow /, '定时会话必须放入任务树同款项目内容容器，保留首行胶囊间距')
assert.doesNotMatch(channel, /showTip\(\{ title: group/, '频道项目行不得显示悬停卡片')
assert.doesNotMatch(schedule, /showTip\(\{ title: group/, '定时项目行不得显示悬停卡片')
assert.match(workspace, /showTip\(\{ kind: 'workspace'/, '任务项目文件夹悬停必须显示卡片')
assert.match(tree, /dcu-wb-tip-title/, '悬停卡片必须有标题行')
assert.doesNotMatch(tree, /dcu-wb-tip-title"><span className="dcu-wb-folder"><ZIconFolder/, '会话卡片标题不得放文件夹图标：会话不是文件夹，且项目行已有同款图标')
// 项目行与时长行已从悬停卡片移除：侧栏左侧已有项目分组、行内右侧已有时长，
// 重复展示只会把卡片撑大并遮挡正文（DSH 内实测反馈）。改为防复发。
assert.doesNotMatch(tree, /dcu-wb-tip-row"><span className="dcu-wb-folder"><ZIconFolder/, '悬停卡片不得再渲染项目行（所属项目已由侧栏树形层级表达）')
assert.doesNotMatch(tree, /dcu-wb-tip-time/, '悬停卡片不得再渲染时长行（时长已由会话行内右侧常驻）')
assert.doesNotMatch(tree, /title=\{t\('sessions\.pinned'\)\}/, '会话行钉选标记不得写原生 title，避免浏览器 tips')
assert.doesNotMatch(tree, /title=\{t\(pinned \? 'sessions\.unpin' : 'sessions\.pin'\)\}/, '会话行钉选按钮不得写原生 title，避免浏览器 tips')
assert.doesNotMatch(tree, /title=\{t\('sessions\.archive'\)\}/, '会话行归档按钮不得写原生 title，避免浏览器 tips')
assert.doesNotMatch(workspace, /title=\{workspace\.path\}/, '项目标题不得写原生 title，路径已在悬停卡片展示')
assert.doesNotMatch(workspace, /title=\{t\('sessions\.pinned'\)\}/, '任务树会话行钉选标记不得写原生 title')
assert.doesNotMatch(workspace, /title=\{t\('sessions\.archive'\)\}/, '任务树会话行归档按钮不得写原生 title')
assert.match(tree, /time\?: string/, '共用会话行必须能接收格式化后的相对时间')
assert.match(tree, /function SessionTime\([\s\S]*dcu-wb-session-time/, '会话右侧时间必须走共用 SessionTime')
assert.match(tree, /<SessionTime time=\{time\} \/>/, '共用会话行必须把相对时间画在标题右侧')
assert.match(workspace, /<SessionTime time=\{formatCompactTime\(session\.updatedAt, t, now\)\}/, '项目内会话必须在行右侧显示相对时间')
assert.match(workspace, /time=\{formatCompactTime\(session\.updatedAt, t, now\)\}/, '最近会话必须在行右侧显示相对时间')
assert.match(channel, /time=\{updatedAt === undefined \? undefined : formatCompactTime\(updatedAt, t, now\)\}/, '频道会话必须在行右侧显示相对时间')
assert.match(schedule, /time=\{session\.updatedAt === undefined \? undefined : formatCompactTime\(session\.updatedAt, t, now\)\}/, '定时会话必须在行右侧显示相对时间')
assert.match(workspace, /formatHoverTime\(session\.updatedAt, t, now\)/, '悬停卡片必须用卡片文案，不能和行内短格式绑死')
assert.match(workspace, /useSharedNow\(\)/, '任务树必须用共享 now 刷新相对时间')
assert.match(channel, /useSharedNow\(\)/, '频道必须用共享 now 刷新相对时间')
assert.match(schedule, /useSharedNow\(\)/, '定时必须用共享 now 刷新相对时间')
assert.doesNotMatch(tree, /fonts\.ready/, '标题跑马灯的字体就绪重测逻辑必须已移除')
assert.match(workspace, /\.dcu-wb-session-title-text\{[^}]*text-overflow:ellipsis/, '会话标题必须始终用省略号截断（跑马灯移除后不再有减动效分支）')
assert.match(workspace, /\.dcu-wb-session-time\{[^}]*right:8px[^}]*font-size:var\(--dsw-font-size-sm\)/, '会话行时间必须贴在右侧并使用 sm 档字号（12px，见 docs/ZCODE-DESIGN.md §3.1）')
assert.match(workspace, /\.dcu-wb-session:hover \.dcu-wb-session-time/, '悬停归档出现时必须隐藏行内时间，避免重叠')
assert.match(workspace, /\.dcu-wb-session:has\(\.dcu-wb-pending\) \.dcu-wb-session-time\{display:none\}/, '待处理标签必须优先于行内时间')
assert.match(tree, /function SessionRowTitle\(/, '截断会话标题必须走共用滚动组件')
assert.match(tree, /<SessionRowTitle title=\{title\} \/>/, '共用会话行必须使用可滚动标题')
assert.match(workspace, /<SessionRowTitle title=\{session\.displayTitle\} \/>/, '项目内会话必须使用可滚动标题')
assert.doesNotMatch(workspace, /@keyframes dcu-wb-title-scroll/, '标题跑马灯动画必须已移除')
assert.doesNotMatch(workspace, /data-overflow/, '标题溢出测量属性必须已移除')
assert.doesNotMatch(workspace, /\.dcu-wb-project-head:hover \.dcu-wb-project-title/, '项目名不得跟着会话一起滚动')
assert.match(tree, /data-dcu-session=\{id\}/, '共用会话行必须带会话 id，供脚本按行而不是标题定位')
assert.match(workspace, /data-dcu-session=\{id\}/, '任务树会话行必须带会话 id，供脚本按行而不是标题定位')
assert.match(tree, /draggable\?: boolean/, '共用会话行必须支持项目内排序')
assert.doesNotMatch(workspace, /pinSectionSessions|sectionSessionIds|pinSessionAt/, '置顶区只能接收项目，不能单独渲染会话')
assert.match(sidebar, /\.dcu-root\{[^}]*width:100%/, '侧栏根节点必须填满宿主网格列，不能露出宿主背景空带')
assert.doesNotMatch(workspace, /dcu-wb-project-current/, '项目文件夹不得保留当前会话的选中态')
assert.match(workspace, /dcu-wb-folder-current/, '当前会话所在项目只能高亮文件夹图标，不能高亮整行')
assert.match(workspace, /\.dcu-wb\{--dcu-wb-inset:8px/, '工作区树必须使用 Codex 风格的 8px 横向留白')
// 本断言原要求 Codex 的 10px 圆角，与插件「改成 ZCode 风格」的设计目标直接冲突
// （ZCode DESIGN.md：控件默认 rounded-lg = 8px）。按设计意图修正为 8px。
// 2026-10-14：锁「设计意图」而非字面量写法。值必须等于 8px，但允许写成
// var(--dsw-radius-lg)——design-system.assert 的圆角棘轮要求标度内圆角一律走令牌，
// 这里锁死字面量会与棘轮互相打架。
assert.match(workspace, /\.dcu-wb-project-head,\.dcu-wb-session\{[^}]*border-radius:(?:8px|var\(--dsw-radius-lg\))/, '项目和会话胶囊必须使用 ZCode 风格的 8px 圆角（lg 档）')
assert.match(workspace, /\.dcu-wb-project-head\{height:32px/, '项目胶囊必须使用 ZCode 的 32px 行高（DESIGN.md：侧栏行高 32px）')
assert.match(workspace, /\.dcu-wb-session\{[^}]*min-height:32px/, '会话胶囊必须与项目胶囊保持相同高度（32px）')
assert.match(workspace, /\.dcu-wb-project-body>\.dcu-wb-session:first-child,\.dcu-wb-project-body>\.dcu-wb-nochat:first-child\{margin-top:4px\}/, '项目胶囊与首条会话之间必须保留层级间距')
// 2026-10-18（设计审计 P0-5，CODE-040）：原断言把 4px 锁成契约，而 4px 正是「组内 34 / 组间 36
// 只差 2px、分组不可见」的成因。改为锁意图：组间留白必须**明显大于**组内行距（会话行间是 2px），
// 且必须带 `:has(> .dcu-wb-session)` —— 否则会作用到空项目上凭空撑高。
// 具体比例由真浏览器关系断言校验（组间 44 / 组内 34）。
assert.match(workspace, /\.dcu-wb-project-body:has\(>\.dcu-wb-session\)::after\{content:"";display:block;height:12px;pointer-events:none\}/, '会话列表末尾的组间留白必须明显大于组内行距（12px），让分组在视觉上成立；留白随内容一起折叠')
assert.match(workspace, /\.dcu-wb-tree\{[^}]*overflow-x:hidden/, '工作区树不得因长标题出现横向滚动条')
// 2026-10-18（设计审计 P0-6）：底部留白 16 → 24px，配合页脚上投影给滚动边界一个交代。
// 「无滚动条时不得预留右侧滚动槽」这个原意保留（scrollbar-gutter:auto 仍在）。
assert.match(workspace, /\.dcu-wb-tree\{[^}]*padding-bottom:24px;scrollbar-gutter:auto/, '工作区树底部必须为页脚投影留出空间（24px），且无滚动条时不预留右侧滚动槽')
// 2026-10-17：断言从「锁死 13px 字面量」改为「锁设计意图」（CODE-040）。
// 原写法把当时的实现值当契约，导致按 ZCode 宪章把字号收归七档刻度（caption = 14-1 = 13px，
// 数值完全等价）时测试先红。现在锁两件事：①必须是刻度令牌而非字面量；②必须落在 caption 档。
// 这样既拦住「随手改字号」，也允许在刻度内合法迁移。
assert.match(workspace, /\.dcu-wb-section-label\{color:var\(--dcu-sidebar-secondary\);font-size:var\(--dsw-font-size-caption\);line-height:20px;font-weight:400/, '置顶、项目和最近必须使用比导航正文更克制的二级标题排版，且字号必须走 caption 刻度而非字面量')
assert.doesNotMatch(workspace, /\.dcu-wb-section-label\{[^}]*font-size:1[0-9]px/, '二级标题不得使用字面量字号（ZCode 宪章：字号必须走系统刻度）')
assert.match(workspace, /body\.animate\(\[from, to\], \{ duration: DISCLOSURE_EXIT_MS, easing: 'ease-out', fill: 'none' \}\)/, '展开收起必须使用宿主兼容的逐像素高度动画（缓动已统一为 ease-out）')
assert.match(workspace, /\.dcu-wb-section-label\{color:var\(--dcu-sidebar-secondary\);[^}]*padding-left:0\}/, '置顶、项目和最近必须与上方按钮的内容起点左对齐')
assert.match(workspace, /deleteWorkspaceGroup\(current, deleteGroupId\)[\s\S]*t\('workspace\.deleteGroupAction'\)/, '删除分组弹窗的确认按钮必须使用独立文案')
assert.match(locales, /'workspace\.deleteGroupAction': '删除分组'/, '中文删除分组确认文案必须准确')
assert.match(workspace, /const DISCLOSURE_EXIT_MS = 180/, '侧边栏展开与收起必须使用统一的 180ms 时长')
assert.match(workspace, /function DisclosureBody\(/, '顶层分区、项目和分组必须复用同一收起动画容器')
assert.match(workspace, /\.dcu-wb-section-body,\.dcu-wb-project-body,\.dcu-wb-collection-body\{display:block;min-height:0;height:auto;overflow:clip;opacity:1;transform:none/, '各层级内容必须保留原生动画所需的静态终态')
assert.doesNotMatch(workspace, /interpolate-size:allow-keywords/, '折叠容器不得混用 CSS auto 高度插值，避免与原生动画抢帧')
assert.match(workspace, /\.dcu-wb-section-body\[data-open=false\],\.dcu-wb-project-body\[data-open=false\],\.dcu-wb-collection-body\[data-open=false\]\{display:block;height:0;opacity:0;transform:translateY\(-2px\);pointer-events:none/, '各层级收起时必须保留在布局中完成统一的淡出与高度收缩动画')
assert.doesNotMatch(workspace, /\.dcu-wb-section-body>div::before/, '置顶、项目和最近等顶层分区不得绘制树线')
assert.match(workspace, /\.dcu-wb-collection-body\{padding-left:0\}/, '分组内项目胶囊不得因树层级缩进而变窄')
assert.match(workspace, /\.dcu-wb-collection-body \.dcu-wb-project-head\{padding-left:8px\}/, '分组内项目必须沿用标准胶囊内容留白')
assert.match(workspace, /\.dcu-wb-collection-body::before,\.dcu-wb-group-member::after\{display:none\}/, '分组内的白色树线与连接线必须隐藏')
assert.match(workspace, /\.dcu-wb-collection-head\{background:color-mix\(in srgb,var\(--dcu-sidebar-hover\) 55%,transparent\)\}/, '展开和收起的分组均使用低于选中强度的常驻标题底带')
assert.match(workspace, /\.dcu-wb-collection-head:hover\{background:var\(--dcu-sidebar-hover\)\}/, '分组文件夹仅在鼠标悬停时增强背景反馈')
assert.match(workspace, /\.dcu-wb-collection-head\.dcu-wb-group-drop\{background:var\(--dcu-sidebar-hover\)\}/, '分组文件夹仅在项目拖放落点时显示背景')
assert.match(workspace, /\.dcu-wb-collections\{[^}]*min-width:0/, '分组网格必须允许长标题收缩')
assert.match(workspace, /\.dcu-wb-session\{[^}]*min-width:0;[^}]*overflow:hidden;[^}]*padding-right:28px/, '会话标题必须只为右侧状态图标预留宽度且可收缩')
// 2026-10-18（设计审计 P0-4，CODE-040）：原断言锁 `padding-left:30px`，等价地把「会话与项目
// 左对齐」写成了契约 —— 而那正是本次要修的缺陷（DSH 是 workspace→session 两级树，零缩进
// 会让两级在视觉上塌成一级）。按本仓已有规范改锁**意图**：会话必须比项目标题明显右缩进，
// 且缩进量落在 4px 标度上（避免再次出现 42px 这类离刻度值触发间距棘轮）。
// 具体数值由 geometry 断言在真浏览器里量（见 tests 里 A2 关系断言），这里只守结构约定。
assert.match(workspace, /\.dcu-wb-session\{[^}]*padding-left:40px/, '会话行必须相对项目标题右缩进（40px，4px 标度内），让两级树在视觉上可分辨')
assert.match(workspace, /\.dcu-wb-running\{position:absolute;left:var\(--dcu-wb-slot-left\);top:50%;[^}]*width:16px;height:20px;margin-top:-10px/, '运行指示器占位必须与项目文件夹同一 16×20 格子，且槽位随行内距下发（P0-4）')
// 2026-10-13：转圈本体改为 ZCode 原版 LoaderIcon（size-4=16px），不再是自绘 12px 圆环。
// 2026-10-17（CODE-040）：改为锁设计意图——必须是行首 16px 格子里的 ZCode size-3.5（14px）图标，
// 而不是锁死某个 px 字面量。ZCode 会话行原文是 `LoaderIcon size-3.5`（task-row.tsx:246）。
assert.match(workspace, /\.dcu-wb-running svg\{display:block;width:14px;height:14px/, '转圈本体必须是 ZCode size-3.5（14px）的 LoaderIcon，居中画在 16px 行首格子里')
// 2026-10-18（P0-4）：平铺行不参与树缩进，但带状态因子时必须让出行首槽（同树内会话行）。
// 槽位偏移改由 --dcu-wb-slot-left / --dcu-wb-dot-left 下发，两者必须与 padding-left 同步，
// 否则 absolute 定位的状态槽不会跟着移动，会漂在行中间（实测间隙 11px → 21px）。
assert.match(workspace, /\.dcu-wb-session-flat\[data-pinned=true\]:not\(:has\(\.dcu-wb-pending\)\),[^]*?\.dcu-wb-session-top:has\(\.dcu-wb-running,.dcu-wb-unread\)\{--dcu-wb-slot-left:18px;--dcu-wb-dot-left:23px;padding-left:40px\}/, '无项目缩进的会话必须为行首槽（置顶常显、转圈或未读点）让出与会话标题对齐的位置，且槽位偏移同步')
assert.match(workspace, /\.dcu-wb-pin\{position:absolute;left:var\(--dcu-wb-slot-left\);top:50%;[^}]*width:16px;height:20px;margin-top:-10px/, '置顶按钮必须占运行转圈同一 16×20 行首格，且槽位随行内距下发（P0-4）')
assert.match(workspace, /\.dcu-wb-session\[data-pinned=true\]:not\(:has\(\.dcu-wb-unread\)\):not\(:has\(\.dcu-wb-running\)\):not\(:has\(\.dcu-wb-pending\)\) \.dcu-wb-pin\{display:grid\}/, '已置顶且行首槽空闲时常显图钉（ZCode showPinnedState 语义）')
assert.match(workspace, /:not\(\.dcu-wb-session-flat\):not\(\.dcu-wb-session-top\):hover \.dcu-wb-pin[^}]*display:grid/, '常规行悬停时置顶按钮接管行首槽（ZCode pinAction 语义）')
assert.match(workspace, /:hover \.dcu-wb-unread,[^}]*visibility:hidden/, '悬停接管时未读点为置顶按钮让位（ZCode hidden 语义）')
assert.match(workspace, /:not\(\.dcu-wb-session-flat\):not\(\.dcu-wb-session-top\):hover \.dcu-wb-running/, '转圈让位限定于有固定行首槽的常规行（flat/top 行不参与接管，避免文字跳动）')
assert.match(workspace, /\.dcu-wb-session:hover \.dcu-wb-pending,[^}]*visibility:hidden/, '悬浮快捷操作出现时必须隐藏右侧待处理与时间，避免重叠')
assert.doesNotMatch(workspace, /:has\(\.dcu-wb-unread\) \.dcu-wb-session-time/, '右侧时间不得再为未读点让位（未读已居行首槽）')
assert.match(workspace, /completedBackgroundSessionIds\(previous, next, selectedId\)/, '后台会话结束时必须自动标为未读')
assert.match(sessionManager, /previous\[id\] === true && running !== true && id !== currentSessionId/, '当前打开会话结束时不得自动标未读')

// ── 2026-10-13：会话行交互对齐 ZCode TaskListItem（第一批）────────────────────
const archiveConfirm = readFileSync(new URL('../src/client/archive-confirm.ts', import.meta.url), 'utf8')
assert.match(tree, /useArchiveConfirm\(\)/, '共用会话行必须复用两步确认 hook（ZCode 同款交互）')
// 2026-10-14：行内不再写死 tabIndex={0}——那会让全树每一行都进 Tab 序列
// （100 个会话 = 100 次 Tab）。tabindex 改由 tree-keyboard 的 roving 统一管理。
assert.match(tree, /role="treeitem" aria-selected=\{selected\} draggable=\{draggable\}/, '共用会话行必须是 treeitem 且可聚焦（键盘可达）')
assert.doesNotMatch(tree, /role="treeitem"[^>]*tabIndex=\{0\}/, '会话行不得写死 tabIndex={0}（roving tabindex 由 tree-keyboard 管理，否则全树逐行进 Tab 序列）')
assert.match(tree, /onKeyDown=\{\(event\) => \{ if \(event\.target !== event\.currentTarget\) return; if \(event\.key === 'Enter' \|\| event\.key === ' '\)/, '共用会话行必须支持 Enter/空格打开，且不吞行内按钮事件')
assert.match(workspace, /archiveConfirm\.confirmingId === id/, '任务树会话行必须接入确认态样式与按钮切换')
assert.match(workspace, /tabIndex=\{0\} onKeyDown=\{\(event\) => \{ if \(event\.target !== event\.currentTarget\) return; if \(event\.key === 'Enter' \|\| event\.key === ' '\)/, '任务树会话行必须可聚焦并支持 Enter/空格打开')
assert.match(workspace, /\.dcu-wb-session\.dcu-wb-archive-confirming \.dcu-wb-session-time/, '确认态必须让右侧时间让位给确认按钮')
assert.match(archiveConfirm, /event\.key === 'Escape'/, '归档确认必须支持 Escape 取消')
assert.match(archiveConfirm, /addEventListener\('pointerdown', cancelOnPointerDown, true\)/, '归档确认必须监听条目外 pointerdown 取消')
assert.match(archiveConfirm, /closest\('\[data-dcu-session\]'\)/, '确认态取消必须按条目边界判断，而不是按 DOM 深度')
