/**
 * 夜审第 11 批 —— ZCode 对齐项的回归契约（纯 JS，过 tsc --noEmit 全仓门禁）。
 *
 * ## 锁什么（5 条已复核对齐项）
 *
 * 1. **session-order.ts resolveAdjacentSessionNavigation（:84-90）**：上/下一个会话
 *    的解析与 ZCode `resolveQuickPickConversationNavigation` 逐行同构。ZCode 原文
 *    （自提 asar@styles-CQuzX8si.js）：`function cot(e){let t=[...new Set(e.taskIds.
 *    filter(e=>e.length>0))],n=e.activeTaskId?t.indexOf(e.activeTaskId):-1,r=n===-1?
 *    t.length:n,i=n===-1?-1:n,a=t[r-1]??null,o=t[i+1]??null;return{canSelectPrevious
 *    Conversation:a!==null,canSelectNextConversation:o!==null,previousTaskId:a,
 *    nextTaskId:o}}` —— 去重滤空保序、activeIndex=-1 时 previous=末项/next=首项、
 *    `?? null` 到边界不循环；ZCode 多出的两个 canSelect 标志即 a!==null/o!==null
 *    的派生布尔，本仓返回裸 id 交调用方派生。
 * 2. **workspace-browser.ts pinnedFirstSessionIds（:184-191）+ CodexWorkspaceBrowser
 *    置顶区（:1088-1090）**：置顶会话按宿主 pinnedSessionIds 顺序整体前置、其余保持
 *    原相对顺序、空/未定义时原样返回；渲染端置顶区独立成段（dcu-wb-pinned-list 容器
 *    + sectionOpen('pinned') 独立开合）。ZCode 侧（自提 asar）：taskList.pinnedSection
 *    =`已置顶`/`Pinned`、置顶容器 data-testid=`project-pinned-tasks`、setTaskPinned
 *    与 onTogglePinTask 各 2 命中。视觉呈现本身不在断言范围，只锁容器字符串。
 * 3. **ChannelBrowser.tsx 频道树复用任务树行组件与样式**：WORKSPACE_TREE_STYLE
 *    （:8 导入、:118 注入；导出于 CodexWorkspaceBrowser.tsx:365）、GroupHead/
 *    SessionRow/sessionMenuItems（:13 导入自 session-tree.tsx —— 该文件同时被
 *    CodexWorkspaceBrowser.tsx:19 与 ScheduleBrowser.tsx:15 导入，确为任务树共享
 *    行组件模块，频道树未自绘行/分组头/菜单/悬停）、HoverShell（:61 包裹）与
 *    SessionHoverCardLayer（:143）。行尺寸 256×32、圆角 8、标题 14px/21px、hover
 *    #0d0d0d0d/#ffffff1a 由 design-language/03b-sidebar.md §5（:109/:110/:113/
 *    :136-137）锚定。
 * 4. **workspace-browser.ts projectSessionWindow（:39-56）「显示更多」分页机制形状
 *    （数值除外）**：页码下限钳制、limit = 预览上限 + 每页条数 × page（:45-47，
 *    全走命名常量）、slice 取前缀、showMore = visible.length < ids.length（全部露出
 *    后为 false）、渲染端（CodexWorkspaceBrowser.tsx:967）条件渲染使按钮消失。
 *    ZCode 原文（asar styles-CQuzX8si.js）：`taskKeys:e.descriptor.visibleLimit===null?
 *    i:i.slice(0,e.descriptor.visibleLimit),preservedCount:r.length` 同型；visibleLimit
 *    的具体数值字面量在 asar 渲染包内未见（数值另入无参照），故本条只锁机制形状与
 *    常量化，不锁 5/10 字面量。
 * 5. **host-open-path.ts openPathInHost（:24-41）**：系统打开先走专用通道（POST
 *    OPEN_IN_EXPLORER_ENDPOINT，成功即返），401/403/503 上抛 BusinessRequestError、
 *    其余非 404/501 状态报错上抛，仅 404/501/网络失败（静默 catch）才降级
 *    connection.api.host.openPath 并检查结果。ZCode 原文（asar styles-CQuzX8si.js）：
 *    先 `openInEditor(t,e)`（finder/explorer）成功即返，失败降级 `openInFileManager(e)`
 *    并 warn —— 降级链形状一致。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 这批锁的是「移植结构」：解析函数的逐行同构、排序纯函数的语义、跨文件复用关系、
 * 降级链的先后顺序。渲染测试需要活宿主与真实主题环境，且同样的结构改动照样绿；
 * 源码文本断言能确定地锁住「源里写着什么」——谁把边界语义改成循环导航、让频道树
 * 自绘行、把降级顺序对调，门禁立刻红。交互体感由活宿主手工验收，这里锁的是结构
 * 不再漂移。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const sessionOrderSource = read('session-order.ts')
const workspaceBrowserSource = read('workspace-browser.ts')
const workspaceTreeSource = read('CodexWorkspaceBrowser.tsx')
const channelBrowserSource = read('ChannelBrowser.tsx')
const openPathSource = read('host-open-path.ts')

// ── 1. session-order.ts：上/下一个会话解析与 ZCode 逐行同构 ─────────────────
// ZCode `cot`（resolveQuickPickConversationNavigation）：t=去重滤空保序的列表，
// n=activeIndex，r/i=前/后基准，a/o=前/后目标；?? null 到边界不循环。
assert.match(
  sessionOrderSource,
  /const sessionIds = \[\.\.\.new Set\(params\.sessionIds\.filter\(id => id\.length > 0\)\)\]/,
  '入口必须先去重滤空并保持原顺序（ZCode [...new Set(e.taskIds.filter(...))] 同构）；调用方给的是侧栏顺序，顺序不能被重排',
)
assert.match(
  sessionOrderSource,
  /const activeIndex = params\.currentId \? sessionIds\.indexOf\(params\.currentId\) : -1/,
  'activeIndex 必须是 indexOf(currentId)、当前不在列表时为 -1（ZCode 同构）',
)
assert.match(
  sessionOrderSource,
  /const previousBaseIndex = activeIndex === -1 \? sessionIds\.length : activeIndex/,
  '当前会话不在列表时（如停在首页）previous 必须落到列表最后一个（ZCode r=n===-1?t.length:n）',
)
assert.match(
  sessionOrderSource,
  /const nextBaseIndex = activeIndex === -1 \? -1 : activeIndex/,
  '当前会话不在列表时 next 必须落到列表第一个（ZCode i=n===-1?-1:n）',
)
assert.match(
  sessionOrderSource,
  /const previousSessionId = sessionIds\[previousBaseIndex - 1\] \?\? null/,
  '向上到边界必须返回 null 而不是循环到末尾（ZCode a=t[r-1]??null）；命令据此报 blocked',
)
assert.match(
  sessionOrderSource,
  /const nextSessionId = sessionIds\[nextBaseIndex \+ 1\] \?\? null/,
  '向下到边界必须返回 null 而不是循环到开头（ZCode o=t[i+1]??null）',
)
assert.match(
  sessionOrderSource,
  /return \{ previousSessionId, nextSessionId \}/,
  '返回形状只含两个裸 id；ZCode 的 canSelectPrevious/Next 是 a!==null/o!==null 的派生布尔，由调用方派生，不在解析层出现',
)

// ── 2. workspace-browser.ts：置顶会话排前 + 置顶区独立成段 ──────────────────
assert.match(
  workspaceBrowserSource,
  /export function pinnedFirstSessionIds\(/,
  '置顶排前的实现名与导出不能丢：session-order（快捷键）与侧栏树都按这个名字共用它',
)
assert.match(
  workspaceBrowserSource,
  /const front = pinnedSessionIds\.filter\(id => members\.has\(id\)\)/,
  '置顶前缀必须取「宿主顺序中存在于当前列表」的子集（最近置顶在前），不允许整段照搬 pinnedSessionIds',
)
assert.match(
  workspaceBrowserSource,
  /return \[\.\.\.front, \.\.\.ids\.filter\(id => !frontSet\.has\(id\)\)\]/,
  '必须置顶整体前置、其余保持原相对顺序（ZCode 语义：Pin a Session ahead of unpinned Sessions）',
)
assert.match(
  workspaceBrowserSource,
  /pinnedSessionIds === undefined \|\| pinnedSessionIds\.length === 0\) return \[\.\.\.ids\]/,
  '宿主未提供置顶集或为空时必须原样返回，不允许把顺序清空',
)
assert.match(
  workspaceBrowserSource,
  /if \(front\.length === 0\) return \[\.\.\.ids\]/,
  '置顶项全不在当前列表时必须原样返回：一个画错的置顶集不得重排整个列表',
)
assert.match(
  sessionOrderSource,
  /pinnedFirstSessionIds/,
  '快捷键全序必须与侧栏树共用同一置顶排前实现，不允许两处各排各的',
)
assert.match(
  workspaceTreeSource,
  /<div className="dcu-wb-pinned-list">/,
  '置顶区必须独立成段：dcu-wb-pinned-list 容器是「独立成段」的物理载体（对应 ZCode data-testid=project-pinned-tasks 的独立容器）',
)
assert.match(
  workspaceTreeSource,
  /data-open=\{sectionOpen\('pinned'\)\}/,
  '置顶段必须有独立的开合状态 sectionOpen(\'pinned\')，不与项目/最近段共用',
)
assert.match(
  workspaceTreeSource,
  /aria-label=\{t\("workspace\.pinned"\)\}/,
  '置顶是独立 section（aria-label=workspace.pinned），不是项目列表的前缀行',
)

// ── 3. ChannelBrowser.tsx：频道树复用任务树行组件与样式 ─────────────────────
assert.match(
  channelBrowserSource,
  /import \{ WORKSPACE_TREE_STYLE \} from '\.\/CodexWorkspaceBrowser\.tsx'/,
  '频道树必须导入任务树样式表 WORKSPACE_TREE_STYLE，不允许另写一套树样式',
)
assert.match(
  channelBrowserSource,
  /<style>\{WORKSPACE_TREE_STYLE\}<\/style>/,
  '任务树样式必须真正注入频道树（行尺寸 256×32/圆角 8/标题 14px/21px/hover 色由 03b-sidebar.md §5 锚定）',
)
assert.match(
  channelBrowserSource,
  /import \{ GroupHead, SessionRow, sessionMenuItems \} from '\.\/session-tree\.tsx'/,
  '分组头/会话行/菜单必须从任务树共享模块 session-tree.tsx 导入',
)
assert.match(
  channelBrowserSource,
  /<GroupHead expanded=\{isExpanded\}/,
  '频道分组头必须复用任务树 GroupHead，不允许自绘',
)
assert.match(
  channelBrowserSource,
  /<SessionRow key=\{id\}/,
  '频道行必须复用任务树 SessionRow，不允许自绘行组件',
)
assert.match(
  channelBrowserSource,
  /menuItems=\{sessionMenuItems\(t, \{ unread, moveTargets, canDelete \}\)\}/,
  '频道行的菜单项必须来自任务树的 sessionMenuItems，保证两棵树菜单一致',
)
assert.match(
  channelBrowserSource,
  /import \{ HoverShell, useHoverDispatch \} from '\.\/hover-shell\.tsx'/,
  '频道树必须接入共享悬停外壳 HoverShell',
)
assert.match(
  channelBrowserSource,
  /<HoverShell blocked=\{menu !== undefined\}>/,
  '悬停外壳必须包裹频道树本体，且菜单打开时阻塞悬停（与任务树同款行为）',
)
assert.match(
  channelBrowserSource,
  /<SessionHoverCardLayer \/>/,
  '频道树必须挂共享悬停卡片层 SessionHoverCardLayer，不允许自建气泡',
)
assert.ok(
  !/(function|const)\s+(SessionRow|GroupHead|sessionMenuItems|SessionHoverCardLayer)\b/.test(channelBrowserSource),
  '频道树不得在本文件内重定义行/分组头/菜单/悬停卡片——这四个名字只能来自共享模块（自绘即回归）',
)
assert.match(
  workspaceTreeSource,
  /import \{[^}]*SessionRow[^}]*\} from '\.\/session-tree\.tsx'/,
  '交叉验证：任务树本体（CodexWorkspaceBrowser）同样从 session-tree.tsx 取 SessionRow——频道树用的就是任务树那一行',
)

// ── 4. workspace-browser.ts：「显示更多」分页机制形状（数值除外）────────────
assert.match(
  workspaceBrowserSource,
  /const page = state\.page < 1 \? 1 : state\.page/,
  '页码必须钳到 >=1（ZCode maxItems 公式的 page 入参不允许 0/负数）',
)
assert.match(
  workspaceBrowserSource,
  /PROJECT_SESSION_PREVIEW_LIMIT \+ PROJECT_SESSION_PAGE_SIZE \* page/,
  '展开后的上限必须是「预览上限 + 每页条数 × page」的线性公式（ZCode visibleLimit 递增同型）',
)
assert.match(
  workspaceBrowserSource,
  /: PROJECT_SESSION_PREVIEW_LIMIT/,
  '未展开时上限必须回落到预览常量（visibleLimit===null 的分支同型）',
)
assert.match(
  workspaceBrowserSource,
  /const head = ids\.slice\(0, limit\)/,
  '窗口必须是对原列表取前缀 slice(0, limit)，不允许重排',
)
assert.match(
  workspaceBrowserSource,
  /showMore: visible\.length < ids\.length/,
  'showMore 必须是「还有没露出的」这一判据：全部露出后为 false，按钮随之消失',
)
assert.match(
  workspaceBrowserSource,
  /export const PROJECT_SESSION_PREVIEW_LIMIT/,
  '预览上限必须集中在命名常量（本条只锁常量化，不锁字面量数值——ZCode 侧数值无参照）',
)
assert.match(
  workspaceBrowserSource,
  /export const PROJECT_SESSION_PAGE_SIZE/,
  '每次追加条数必须集中在命名常量（同上，数值不锁）',
)
assert.match(
  workspaceTreeSource,
  /\{sessionWindow\.showMore && <div className="dcu-wb-session-more">/,
  '渲染端必须条件渲染「展开显示」按钮：showMore 为 false 时按钮从 DOM 消失（ZCode 全部露出后无按钮）',
)

// ── 5. host-open-path.ts：先专用通道、失败降级 host 桥 ──────────────────────
assert.match(
  openPathSource,
  /await fetcher\(OPEN_IN_EXPLORER_ENDPOINT, \{/,
  '系统打开必须先走专用通道 open-in-explorer（ZCode 先 openInEditor(finder/explorer) 同构），绕过文件预览拦截',
)
assert.match(
  openPathSource,
  /method: 'POST',/,
  '专用通道必须是 POST 请求',
)
assert.match(
  openPathSource,
  /if \(foregroundResponse\?\.ok\) return/,
  '专用通道成功必须立即返回，不再碰 host 桥（ZCode if((await c.openInEditor(t,e)).success)return 同构）',
)
assert.match(
  openPathSource,
  /\[401, 403, 503\]\.includes\(foregroundResponse\.status\)\) throw new BusinessRequestError/,
  '401/403/503 必须上抛 BusinessRequestError，不得静默降级到 host 桥',
)
assert.match(
  openPathSource,
  /status !== 404 && foregroundResponse\.status !== 501/,
  '只有 404/501（端点不存在）才允许降级；其余错误状态必须带信息上抛',
)
assert.match(
  openPathSource,
  /const response = await connection\.api\.host\.openPath\(\{ path \}\)/,
  '降级必须走 host 桥 connection.api.host.openPath，且结果要检查（ZCode openInFileManager 后 success||warn 同构）',
)
assert.match(
  openPathSource,
  /\} catch \{\}/,
  '专用通道网络失败必须静默吞掉进入降级路径，而不是把网络异常直接抛给用户',
)
{
  // 先后顺序本身就是降级链：专用通道的调用必须出现在 host 桥调用之前。
  const dedicatedIdx = openPathSource.indexOf('await fetcher(OPEN_IN_EXPLORER_ENDPOINT')
  const fallbackIdx = openPathSource.indexOf('connection.api.host.openPath(')
  assert.ok(
    dedicatedIdx !== -1 && fallbackIdx !== -1 && dedicatedIdx < fallbackIdx,
    '降级顺序变了：必须先专用通道、后 host 桥；对调会让「绕过文件预览拦截」的意图失效',
  )
}

console.log('night-audit batch-11 对齐契约：43 条断言全部通过')
