#!/usr/bin/env node
/**
 * 夜审第 6 批回归断言（night-audit-batch-6）—— 8 条已复核（verified）对齐项的静态锁定。
 *
 * ## 锁什么
 * 1. 启动画面首位导入 + 模块顶层注入（index.ts:1-2 → startup-splash.ts）。
 * 2. 文档隐藏停动效五要素：属性名 / documentElement / visibilityState / visibilitychange / 卸载清理
 *    （index.ts:178 接线 → document-hidden-motion-pause.ts:32,43-58 实现）。
 * 3. 用户气泡折叠三要素：120px 折叠高 / 展开钮（aria-expanded、展开|收起）/ 底部 70%→100% 渐隐
 *    （index.ts:203-204 → user-bubble-collapse.ts + conversation-layout.ts 的 mask 规则）。
 * 4. 会话区骨架三件：列宽 848/1104 两档 / 轮组间距 20 / 行高 24.5（index.ts:201-202 → conversation-layout.ts）。
 * 5. 皮肤 / 主题样式 / 主题镜像三条 effect 挂在 apply() 顶层（应用级，index.ts:162-168）。
 * 6. 桌面键位三平台 primary+shift+BracketLeft/Right（session-navigation-shortcuts.ts:58-66）。
 * 7. 命令进宿主统一 catalog、注册前查重让位（session-navigation-shortcuts.ts:5-8,80-98）。
 * 8. 悬停卡「取消置顶」aria 消费 locales 的 workspace.unpin=取消置顶（workspace-hover-card.tsx:36 ← locales.ts:139）。
 *
 * ## 这些取值为什么来自 ZCode
 * 全部经第三轮独立复核（仓库 grep -n / Read 实测 + ZCode asar 逐字提取，偏移精确命中）：
 *  - 停动效实现与 ZCode asar @332987332 的函数逐字同构（var L1n=`data-document-hidden`;
 *    documentElement.toggleAttribute(…, visibilityState===`hidden`); visibilitychange;
 *    卸载 removeEventListener+removeAttribute），CSS 侧
 *    html[data-document-hidden] *{transition:none!important;animation:none!important} @326226533。
 *  - 桌面键位对应 asar @325562962 的 previousConversation / nextConversation
 *    defaultBindings `CmdOrCtrl+Shift+[` / `CmdOrCtrl+Shift+]`（primary+shift+BracketLeft/Right）。
 *  - 折叠 120px、溢出阈 +1、mask 70%→100% 来自 asar 静态提取 + 9224 活页实测
 *    （user-bubble-collapse.ts 头注释自述同源）。
 *  - 848/1104 两档来自 design-language/03c-conversation.md §E（2026-10-29，commit 4ebc38e）
 *    与 ZCode 容器查询实测（1278→896 / 1280→1152；换算到 DSH 的容器阈值常量为 1188）。
 *  - 「取消置顶」与 asar @310308133 的 "project.unpin":`取消置顶` 取值一致。
 *
 * ## 为什么用文本断言而不是渲染测试
 * 这 8 条对齐的靶子在活宿主里（哈希类名 .IzP3Va_bubble、ctx.slots、宿主快捷键 catalog
 * 都只在真宿主存在），jsdom 无法复现；且「抢在宿主首帧之前」的时序是运行时行为、
 * 复核亦未实测。所以锁静态已确认的部分：常量、注释、接线行 —— 一旦有人改动这些
 * 参数或拆掉接线，本文件立即变红，逼改动者重新对 ZCode 论证。
 *
 * 纯 JavaScript（.mjs）：门禁第 1 步是全仓 tsc --noEmit，前两轮 .assert.ts 版本
 * 均因类型检查被保险丝撤回。本文件不写任何 TS 语法。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const indexSource = read('index.ts')
const indexLines = indexSource.split('\n')
const pauseSource = read('document-hidden-motion-pause.ts')
const collapseSource = read('user-bubble-collapse.ts')
const layoutSource = read('conversation-layout.ts')
const shortcutsSource = read('session-navigation-shortcuts.ts')
const hoverCardSource = read('workspace-hover-card.tsx')
const localesSource = read('locales.ts')

// ── 1. 启动画面首位导入 + 模块顶层注入（index.ts:1-2）─────────────────────────
// startup-splash.ts 头注释自述「插件模块导入时（早于宿主首帧）注入全屏遮罩」；
// 必须是文件第一条 import，遮罩才抢在宿主首帧之前。运行时序未实测，这里锁静态事实。
assert.equal(
  indexLines[0],
  '// 启动画面必须是**第一个导入**：模块顶层注入遮罩，抢在宿主首帧之前。',
  'index.ts:1 的启动画面注释被改动了：首位导入的契约靠它自解释',
)
assert.equal(
  indexLines[1],
  "import './startup-splash.ts'",
  "启动画面不再是第一条 import：遮罩会晚于其他模块注入，宿主可能先渲染出一帧",
)

// ── 2. 文档隐藏停动效五要素（index.ts:178 → document-hidden-motion-pause.ts:32,43-58）──
// 五要素与 ZCode asar @332987332 逐字同构；缺一就不再是上游同款行为。
assert.match(
  pauseSource,
  /^export const DOCUMENT_HIDDEN_ATTRIBUTE = 'data-document-hidden'$/m,
  '标记属性名必须是 data-document-hidden：CSS 侧 html[data-document-hidden] 规则与 DevTools 观测都依赖它',
)
assert.match(
  pauseSource,
  /doc\.documentElement\.toggleAttribute\(DOCUMENT_HIDDEN_ATTRIBUTE, doc\.visibilityState === 'hidden'\)/,
  '必须按 visibilityState===hidden 挂在 documentElement 上（html 级覆盖全部动画对象）',
)
assert.match(
  pauseSource,
  /sync\(\)\n  doc\.addEventListener\('visibilitychange', sync\)/,
  '安装时必须立即同步一次再监听 visibilitychange：插件可能在页面已隐藏时才被加载',
)
assert.match(
  pauseSource,
  /doc\.removeEventListener\('visibilitychange', sync\)/,
  '卸载必须移除 visibilitychange 监听',
)
assert.match(
  pauseSource,
  /doc\.documentElement\.removeAttribute\(DOCUMENT_HIDDEN_ATTRIBUTE\)/,
  '卸载必须撤掉标记属性：否则页面永久停在「动画被禁用」状态而无人清理',
)
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => installDocumentHiddenMotionPause\(\), 'zcode-ui-for-dsh: hidden motion pause'\)/,
  'index.ts:178 的停动效接线被拆了：覆盖范围必须应用级（宿主与第三方插件的动画对象也在泄漏现场）',
)

// ── 3. 用户气泡折叠三要素：120px / 展开钮 / 底部渐隐（index.ts:203-204）────────
// ZCode 真实参数（asar 静态提取 + 9224 活页实测）：折叠高 120、溢出阈 120+1、
// 展开钮 aria-expanded + 展开|收起、未展开时 mask 70%→100% 渐隐。
assert.match(
  collapseSource,
  /^const COLLAPSED_PX = 120$/m,
  '折叠高度必须是 120px（ZCode MessageResponse O4t 组件实测值）',
)
assert.match(
  collapseSource,
  /^const OVERFLOW_SLACK = 1$/m,
  '溢出余量必须是 1：scrollHeight > 120+1 才判溢出，避免 1px 取整误判',
)
assert.match(
  collapseSource,
  /fullHeight > COLLAPSED_PX \+ OVERFLOW_SLACK/,
  '溢出判定必须走「阈值+余量」组合，不得写成 ≥120 之类的近似',
)
assert.match(
  collapseSource,
  /button\.setAttribute\('aria-expanded', String\(state\.expanded\)\)/,
  '展开钮必须维护 aria-expanded（ZCode 三要素之一）',
)
assert.match(
  collapseSource,
  /button\.setAttribute\('aria-label', toggleLabel\(state\.expanded\)\)/,
  '展开钮必须有 aria-label（展开|收起）',
)
assert.match(
  collapseSource,
  /if \(expanded\) return zh \? '收起' : 'Collapse'/,
  '展开态文案必须是 收起/Collapse',
)
assert.match(
  collapseSource,
  /return zh \? '展开' : 'Expand'/,
  '折叠态文案必须是 展开/Expand',
)
assert.match(
  layoutSource,
  /mask-image:linear-gradient\(to bottom,black 0%,black 70%,transparent 100%\)/,
  '折叠态底部渐隐必须是 black 70% → transparent 100%（ZCode mask 参数）',
)
assert.match(
  indexSource,
  /用户气泡长文本折叠（ZCode：120px \+ 展开钮 \+ 底部渐隐）/,
  'index.ts:203 的三要素注释被改动了：它是对齐 ZCode 参数的契约声明',
)
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => installUserBubbleCollapse\(\), 'zcode-ui-for-dsh: user bubble collapse'\)/,
  'index.ts:204 的气泡折叠接线被拆了',
)

// ── 4. 会话区骨架三件：列宽 848/1104、轮距 20、行高 24.5（index.ts:201-202）────
// 03c-conversation.md §E（2026-10-29，commit 4ebc38e）：两档 848/1104；B1：14px/24.5px。
assert.match(
  layoutSource,
  /^const ZCODE_CONTENT_WIDTH = 848$/m,
  '窄档正文列宽必须是 848（ZCode 896 容器 − 24×2 内衬）',
)
assert.match(
  layoutSource,
  /^const ZCODE_CONTENT_WIDTH_WIDE = 1104$/m,
  '宽档正文列宽必须是 1104（ZCode ≥1280 时 1152 容器 − 24×2 内衬）',
)
assert.match(
  layoutSource,
  /^const ZCODE_TURN_GAP = 20$/m,
  '轮组间距必须是 20px（ZCode 轮组制间距实测值）',
)
assert.match(
  layoutSource,
  /^const ZCODE_LINE_HEIGHT = 24\.5$/m,
  '正文行高必须是 24.5px（ZCode 14px × 1.75 实测定值）',
)
assert.match(
  layoutSource,
  /\[data-conversation-scroll\] \.icaHSq_column\{max-width:min\(\$\{ZCODE_CONTENT_WIDTH\}px,100%\)\}/,
  '窄档必须经常量注入：max-width:min(848px,100%)',
)
assert.match(
  layoutSource,
  /@container \(min-width:\$\{ZCODE_CONTENT_WIDE_MIN\}px\)\{\[data-conversation-scroll\] \.icaHSq_column\{max-width:min\(\$\{ZCODE_CONTENT_WIDTH_WIDE\}px,100%\)\}\}/,
  '宽档必须是容器查询 + 常量注入：min(1104px,100%)（侧栏收起时媒体查询会漏）',
)
assert.match(
  layoutSource,
  /实测 1278→896 \/ 1280→1152/,
  'ZCode 容器查询实测记录（1278→896 / 1280→1152）必须保留：它是 1188 阈值换算的依据',
)
assert.match(
  indexSource,
  /会话区骨架三件（C1 列宽 \/ C2 轮组间距 \/ C3 行高）/,
  'index.ts:201 的骨架三件注释被改动了：C1/C2/C3 的对齐矩阵声明',
)
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => installConversationLayout\(\), 'zcode-ui-for-dsh: conversation layout'\)/,
  'index.ts:202 的会话区骨架接线被拆了',
)

// ── 5. 皮肤/主题挂应用级令牌层（index.ts:162-168）────────────────────────────
// ZCode 主题类挂在 <html>（01-design-tokens.md：dark theme-zai-dark platform-mac-desktop）；
// 消费 :root 令牌的不只侧栏，还有轮次导航与页签滑块 —— 必须应用级，不能挂组件。
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => installSkin\(\), 'zcode-ui-for-dsh: skin stylesheet'\)/,
  '皮肤样式表的接线被改了：写进宿主 host 令牌层（--dsw-*）的入口必须保持',
)
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => installThemeStyle\(\), 'zcode-ui-for-dsh: theme stylesheet'\)/,
  '主题样式表的接线被改了',
)
assert.match(
  indexSource,
  /ctx\.effect\(\(\) => syncZCodeTheme\(\), 'zcode-ui-for-dsh: theme mirror'\)/,
  '主题镜像的接线被改了',
)
assert.match(
  indexSource,
  /主题层是\*\*应用级\*\*的，不能挂在侧栏组件上/,
  '「主题层应用级」的设计理由注释被删了：侧栏不挂载时轮次导航/页签滑块会静默失去过渡',
)
const applyAt = indexSource.indexOf('export function apply(ctx: ClientContext): void {')
assert.ok(applyAt > 0, 'index.ts 必须导出 apply()：找不到该函数声明')
for (const wiring of [
  "ctx.effect(() => installSkin(), 'zcode-ui-for-dsh: skin stylesheet')",
  "ctx.effect(() => installThemeStyle(), 'zcode-ui-for-dsh: theme stylesheet')",
  "ctx.effect(() => syncZCodeTheme(), 'zcode-ui-for-dsh: theme mirror')",
]) {
  assert.ok(
    indexSource.indexOf(wiring) > applyAt,
    `皮肤/主题三条 effect 必须注册在 apply() 函数体内（应用级），不得挪进组件：${wiring}`,
  )
}

// ── 6. 桌面键位三平台 primary+shift+Bracket（session-navigation-shortcuts.ts:58-66）──
// ZCode asar @325562962：previousConversation / nextConversation 的
// defaultBindings 是 CmdOrCtrl+Shift+[ / ]，对应 primary+shift+BracketLeft/Right。
assert.match(
  shortcutsSource,
  /^    'desktop:macos': \{ code, modifiers: \['primary', 'shift'\] \},\n    'desktop:windows': \{ code, modifiers: \['primary', 'shift'\] \},\n    'desktop:linux': \{ code, modifiers: \['primary', 'shift'\] \},$/m,
  '桌面三平台键位必须一致且为 primary+shift（对齐 ZCode 的 CmdOrCtrl+Shift+[ / ]）',
)
assert.match(
  shortcutsSource,
  /^    'web:macos': \{ code, modifiers: \['primary', 'alt'\] \},\n    'web:windows': \{ code, modifiers: \['primary', 'alt'\] \},$/m,
  'web 端必须退到 primary+alt：primary+shift+[ / ] 被浏览器标签页切换占用',
)
assert.match(
  shortcutsSource,
  /^  \{ id: 'session\.previous', labelKey: 'sessions\.previous', aliases: \['previous session'\], direction: 'previous', code: 'BracketLeft' \},$/m,
  "previous 命令必须绑定 BracketLeft（对应 ZCode 的 Cmd+Shift+[）",
)
assert.match(
  shortcutsSource,
  /^  \{ id: 'session\.next', labelKey: 'sessions\.next', aliases: \['next session'\], direction: 'next', code: 'BracketRight' \},$/m,
  "next 命令必须绑定 BracketRight（对应 ZCode 的 Cmd+Shift+]）",
)

// ── 7. 命令走宿主统一 catalog、注册前查重让位（session-navigation-shortcuts.ts:5-8,80-98）──
assert.match(
  shortcutsSource,
  /注册之后它们进入宿主 catalog：\n \* 快捷键分发、用户改键、界面提示统一由宿主负责，本插件不另造键盘通道。/,
  '「统一 catalog、宿主负责分发/改键/提示」的契约注释被删了',
)
assert.match(
  shortcutsSource,
  /for \(const command of COMMANDS\) \{\n      if \(shots\.catalog\.getSnapshot\(\)\.some\(row => row\.id === command\.id\)\) continue/,
  '注册前必须查 catalog 查重让位：宿主将来原生支持同名命令时不得制造重复 id',
)
assert.match(
  shortcutsSource,
  /disposers\.push\(shots\.register\(\{/,
  '命令必须经宿主 shortcuts 服务的 register 进入 catalog',
)

// ── 8. 取消置顶 aria（workspace-hover-card.tsx:36 ← locales.ts:139）──────────
// ZCode asar @310308133："project.unpin":`取消置顶`；本仓库同款取值。
assert.match(
  hoverCardSource,
  /aria-label=\{t\(hoverTip\.pinned === true \? 'workspace\.unpin' : 'workspace\.pin'\)\}/,
  '置顶钮 aria 必须按 pinned 状态在 workspace.unpin / workspace.pin 间切换',
)
assert.match(
  localesSource,
  /'workspace\.unpin': '取消置顶',/,
  "workspace.unpin 中文文案必须是「取消置顶」（与 ZCode project.unpin 一致）",
)

console.log('night-audit-batch-6：8 组对齐项 / 41 条断言全部通过')
