// 夜间审计 · 批次 20 回归断言（user-bubble-collapse / ScheduleBrowser / channel-brand /
// CodexWorkspaceBrowser / zcode-skin）
//
// ## 锁什么
// 本批 8 条已复核的对齐项，全部是「源码里的确定取值」，不是主观观感：
//
// 1. 折叠几何与溢出阈：COLLAPSED_PX=120、OVERFLOW_SLACK=1，判定 scrollHeight > 121。
//    证据：user-bubble-collapse.ts:29-31、:87 实读；asar MessageResponse 的 O4t 组件里
//    `E4t(e){return e>120+T4t}`、`T4t=1` 同值；规格见 03c-conversation.md C2-1 +
//    04-open-gaps.md:18-19。
// 2. 展开高度公式 Math.max(fullHeight, 120)。证据：:100 实读；asar
//    `D4t(e,t){return \`${e?Math.max(t,120):120}px\`}` 同式；03c C2-2 + 04:19。
// 3. 展开钮 aria-expanded + aria-label=展开|收起（zh 分支）。证据：:103-104、:44-47 实读；
//    asar O4t 内 aria-label / aria-expanded / title 三属性同构；03c C2-4 + 04:20。
// 4. 钮生命周期：无溢出时移除钮 + 清 maxHeight + 清双 data 属性（:88-95）；
//    正文变化回折叠态（:121-126）。证据：asar `useEffect(()=>{d(!1)},[t,n])` 同语义；04:20。
// 5. 只认 .IzP3Va_userStack 内气泡。证据：:22-23 字面量 + :113 closest 守卫；
//    04:21-22（G18b 结构级收口，防旧版「应答尾部误标」重演）。
// 6. 侧栏行内图标 16×16：ScheduleClock（:67）、菜单 ZIconSettings / ZIconArchive / ZIconMore
//    （:103 / :105 / :149）、频道品牌 9 个分支全部 width/height=16 且统一 .dcu-wb-brand，
//    该类在 CodexWorkspaceBrowser 的 CSS 里声明为 16px。证据：grep 实测 + 03b-sidebar.md:112
//    左槽 16×16。
// 7. 归档组确认弹窗 footer 复用 .dcu-wb-rename-actions（:173），该类是 flex +
//    justify-content:flex-end（CodexWorkspaceBrowser.tsx:295）。证据：03j-dialog.md:20
//    「底部按钮右对齐」。
// 8. 双主题两档选择器 + color-scheme 跟随：:51 / :54 常量、:81-82 结构规则、:97-98 接线。
//    证据：asar color-scheme:dark ×9 / light ×15 与审计数一致；04-open-gaps.md:1828 G6。
//
// ## 为什么用文本断言而不是渲染测试
// 1. 这里锁的是常量、选择器字面量与属性名——「结构事实」，读源码文本即可判定，不需要 DOM。
//    渲染断言只能在活宿主里跑，夜间 CI 没有宿主，写了也不会被执行。
// 2. 折叠行为依赖真实字体度量下的 scrollHeight，假 DOM 量出来的高度没有意义；
//    能在无宿主环境稳定守住的只有「阈值多少、公式朝哪个方向、清场是否干净」。
// 3. 这些取值来自 ZCode 的 asar 产物反查（见条 1–8 的 asar 引用）。数值一旦漂移，
//    就意味着与 ZCode 的视觉行为分家——这正是要红的时刻。
//
// 本文件为纯 JavaScript：全量门禁第 1 步是 `tsc --noEmit` 全仓类型检查，
// .assert.ts 曾因类型错误整批被撤回；此处不出现任何类型标注，避免重蹈覆辙。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const bubble = read('user-bubble-collapse.ts')
const schedule = read('ScheduleBrowser.tsx')
const brand = read('channel-brand.tsx')
const browser = read('CodexWorkspaceBrowser.tsx')
const skin = read('zcode-skin.ts')

const grabNumber = (source, name) => {
  const match = new RegExp(`${name}\\s*=\\s*(\\d+)`).exec(source)
  assert.notEqual(match, null, `找不到常量 ${name}：折叠几何的锚点被删了，断言失去意义`)
  return Number(match[1])
}

// ── 1. 折叠几何与溢出阈（asar O4t：>120+1）───────────────────────────────
const collapsedPx = grabNumber(bubble, 'COLLAPSED_PX')
assert.equal(collapsedPx, 120, '折叠高度必须 120px（asar O4t max-height 120；改动需重跑对齐）')

const overflowSlack = grabNumber(bubble, 'OVERFLOW_SLACK')
assert.equal(overflowSlack, 1, '溢出余量必须是 1px：0 会让亚像素高度在 120.4 处误判溢出')

assert.equal(
  collapsedPx + overflowSlack,
  121,
  '溢出阈必须正好 121（120+1）；与 ZCode 的 E4t: e>120+1 同值',
)

// 阈值必须由两个常量相加得出，不能退化成魔法数 121——否则改一处漏一处。
assert.match(
  bubble,
  /const overflow = fullHeight > COLLAPSED_PX \+ OVERFLOW_SLACK/,
  '溢出判定必须是 scrollHeight > COLLAPSED_PX + OVERFLOW_SLACK，不得硬编码阈值',
)

// ── 2. 展开高度公式（asar D4t：max(t,120)）────────────────────────────────
assert.match(
  bubble,
  /content\.style\.maxHeight = `\$\{collapsed \? COLLAPSED_PX : Math\.max\(fullHeight, COLLAPSED_PX\)\}px`/,
  '展开高度必须 max(fullHeight, COLLAPSED_PX)；折叠态写 COLLAPSED_PX，形态与 asar D4t 一致',
)
// 反向守卫：写成 min 会把所有长气泡压回 120，点了展开钮没反应。
assert.ok(
  !/Math\.min\(fullHeight, COLLAPSED_PX\)/.test(bubble),
  '不得用 Math.min 计算展开高度：那等于「展开后仍被截断」',
)

// ── 3. 展开钮的双 aria 属性 + 中文标签 ────────────────────────────────────
assert.match(
  bubble,
  /button\.setAttribute\('aria-expanded', String\(state\.expanded\)\)/,
  '展开钮必须暴露 aria-expanded（布尔转字符串，屏幕阅读器据此播报状态）',
)
assert.match(
  bubble,
  /button\.setAttribute\('aria-label', toggleLabel\(state\.expanded\)\)/,
  'aria-label 必须随状态取 toggleLabel：写死「展开」会让已展开的钮描述错误',
)
assert.match(
  bubble,
  /if \(expanded\) return zh \? '收起' : 'Collapse'/,
  'zh 分支展开态标签必须是「收起」（ZCode 原文；英文 Collapse）',
)
assert.match(
  bubble,
  /return zh \? '展开' : 'Expand'/,
  'zh 分支折叠态标签必须是「展开」（ZCode 原文；英文 Expand）',
)

// ── 4. 钮生命周期：无溢出清场 + 正文变化回折叠态 ──────────────────────────
assert.match(
  bubble,
  /if \(!overflow\) \{[\s\S]{0,200}content\.style\.maxHeight = ''/,
  "无溢出时必须把 maxHeight 复位为空串（残留内联限高会截断短气泡）",
)
assert.match(
  bubble,
  /if \(!overflow\) \{[\s\S]{0,300}bubble\.removeAttribute\(OVERFLOW_ATTR\)[\s\S]{0,120}bubble\.removeAttribute\(STATE_ATTR\)/,
  '无溢出时必须同时清掉两个 data-dcu-bubble-* 标记，否则样式钩子会落到不该折叠的气泡上',
)
assert.match(
  bubble,
  /if \(!overflow\) \{[\s\S]{0,400}findToggle\(bubble\)\?\.remove\(\)/,
  '无溢出时必须移除展开钮：钮只在溢出时出现（ZCode 同行为）',
)
assert.match(
  bubble,
  /else if \(state\.text !== text\) \{[\s\S]{0,120}state\.expanded = false/,
  '正文变化后必须回到折叠态（asar useEffect(()=>{d(!1)},[t,n])）；否则流式追加会让气泡停在展开高度',
)

// ── 5. 只认 .IzP3Va_userStack 内的气泡（G18b 收口）───────────────────────
assert.match(
  bubble,
  /const USER_STACK_SELECTOR = '\.IzP3Va_userStack'/,
  '用户栈选择器字面量必须保持 .IzP3Va_userStack；上游改名即需重新实测',
)
assert.match(
  bubble,
  /if \(bubble\.closest\(USER_STACK_SELECTOR\) === null\) return/,
  '必须用 closest 做前置守卫：缺了它，旧版「应答尾部被标成用户气泡」会重演',
)
assert.match(
  bubble,
  /const BUBBLE_SELECTOR = '\[data-conversation-scroll\] \.icaHSq_column \.IzP3Va_bubble'/,
  '气泡定位必须限定在会话滚动容器内的 .IzP3Va_bubble，收敛扫描面',
)

// ── 6. 侧栏行内图标 16×16（03b-sidebar.md:112 左槽规格）───────────────────
assert.match(
  schedule,
  /function ScheduleClock\(\) \{\s*\n\s*return <svg viewBox="0 0 16 16" width=\{16\} height=\{16\}/,
  '定时任务行图标 ScheduleClock 必须 16×16（左槽 16px，放大即破坏行高节奏）',
)
assert.match(
  schedule,
  /<ZIconSettings size=\{16\} \/>/,
  '组菜单「任务设置」图标必须 size={16}',
)
assert.match(
  schedule,
  /<ZIconArchive size=\{16\} \/>/,
  '组菜单「归档」图标必须 size={16}',
)
assert.match(
  schedule,
  /<ZIconMore size=\{16\} \/>/,
  '组更多按钮图标必须 size={16}',
)

// 频道品牌：9 个分支必须全部 16×16，且统一走 .dcu-wb-brand（尺寸只由 CSS 一处决定）。
const brandSvgs = brand.match(/className="dcu-wb-brand"/g) ?? []
assert.equal(
  brandSvgs.length,
  9,
  '频道品牌必须 9 个分支（telegram/weixin/wecom/qq/dingtalk/feishu+slack/discord/slack/兜底）',
)
assert.equal(
  (brand.match(/width=\{16\} height=\{16\}/g) ?? []).length,
  9,
  '每个品牌分支的 svg 都必须 width={16} height={16}；少一处就是某个渠道图标尺寸漂了',
)
assert.match(
  browser,
  /\.dcu-wb-brand\{display:block;width:16px;height:16px\}/,
  '.dcu-wb-brand 必须声明为 block 16×16（与 svg 内联尺寸成对，防内联被误删后尺寸失控）',
)

// ── 7. 归档组确认弹窗 footer 右对齐（03j-dialog.md:20）────────────────────
assert.match(
  schedule,
  /title=\{t\('schedule\.archiveGroup'\)\}\s*\n\s*footer=\{<div className="dcu-wb-rename-actions">/,
  '归档组确认弹窗 footer 必须复用 .dcu-wb-rename-actions：这是「底部按钮右对齐」的唯一口径',
)
assert.match(
  browser,
  /\.dcu-wb-rename-actions\{display:flex;justify-content:flex-end;gap:8px\}/,
  '.dcu-wb-rename-actions 必须是 flex + flex-end + 8px 间距；改左对齐会让所有确认弹窗按钮跑到左边',
)

// ── 8. 双主题两档选择器 + color-scheme 跟随（04:1828 G6）─────────────────
assert.match(
  skin,
  /const LIGHT_SELECTOR = ':root:root body'/,
  '浅色选择器必须是 :root:root body（双 :root 提权，压过宿主单层 body 规则）',
)
assert.match(
  skin,
  /const DARK_SELECTOR = ':root:root body\[data-ds-dark-theme\]'/,
  '深色选择器必须挂在 body[data-ds-dark-theme] 上，跟着宿主主题属性翻转',
)
assert.match(
  skin,
  /:root:root body\{color-scheme:light\}/,
  '浅色档必须声明 color-scheme:light（滚动条、输入光标、表单默认外观跟随皮肤）',
)
assert.match(
  skin,
  /:root:root body\[data-ds-dark-theme\]\{color-scheme:dark\}/,
  '深色档必须声明 color-scheme:dark；缺了它原生控件仍是浅色，深色皮肤会出现白底洞',
)
// 常量必须真的接到渲染路径上，否则只是两个没人用的字符串。
assert.match(
  skin,
  /renderTokenBlock\(LIGHT_SELECTOR, ZCODE_LIGHT\),\s*\n\s*renderTokenBlock\(DARK_SELECTOR, ZCODE_DARK\),/,
  '两档选择器必须分别接到 ZCODE_LIGHT / ZCODE_DARK 令牌块',
)
assert.match(
  skin,
  /STRUCTURE_CSS,\s*\n\s*\]\.join\('\\n'\)/,
  'STRUCTURE_CSS（含两条 color-scheme 规则）必须进入最终样式表；漏拼则 color-scheme 静默失效',
)

// ── 9. 观察器必须带「侧栏动画期跳过」守卫（2026-10-30 补做）─────────────────────
// 08 性能审计的根因修法：侧栏开合动画期间布局每帧被改写，观察器回调里读 scrollHeight
// 会强制同步布局（官方轮次导航实测 Layout 33 次 / 232ms）。气泡折叠是同一类代码，须同款守卫。
assert.match(
  bubble,
  /const SIDEBAR_MOTION_ATTRIBUTE = 'data-dcu-sidebar-motion'/,
  '气泡折叠必须认侧栏动画标记（与 official-turn-navigator 共用一个属性名）',
)
assert.match(
  bubble,
  /if \(motionActive\(\)\) \{\s*\n\s*waitingForMotion = true/,
  'flush 进入时必须先查动画标记：动画期间整批延后，不得读 scrollHeight',
)
assert.match(
  bubble,
  /attributeFilter: \[SIDEBAR_MOTION_ATTRIBUTE\]/,
  '观察器必须监听该属性，动画结束时把跳过的那批补跑（否则永远不折叠）',
)
assert.match(
  bubble,
  /\}, 400\)/,
  '必须有 400ms 兜底：宿主连属性一起重建时移除事件不触达观察器',
)

console.log('night-audit-batch-20: 37 条断言通过')
