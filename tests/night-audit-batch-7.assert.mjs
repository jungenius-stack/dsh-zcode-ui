/**
 * 夜审批次 7 —— turn-rail-zcode.ts（ZCode 轮次索引 hover 递进）回归断言。
 *
 * ## 锁什么（对应 9 条已复核对齐项）
 *
 * 1. hover 四档递进波查表：WAVE = [[2.6,1,true],[1.7,0.86,false],[1.25,0.72,false]]，
 *    距离 ≥3 落到 IDLE_OPACITY '0.58'。
 * 2. d0（hover 距离 0）用全前景色 var(--dsw-alias-label-primary)，其余档 removeProperty
 *    交还消费侧 CSS 兜底 var(--dsw-alias-label-dimmed)。
 * 3. 静息当前轮 ACTIVE_OPACITY '0.9'，且只在非 hover（wave===undefined && hoverIndex===null）时生效。
 * 4. 过渡 0.15s + cubic-bezier(0,0,.2,1)；消费侧 transition 同时长同曲线覆盖
 *    transform / opacity / background-color 三属性。
 * 5. 刻度几何：基宽 12 × 高 2px、纵向 pitch 10px（ITEM_HEIGHT）、pill 圆角、origin 左缘。
 * 6. 点击平滑滚动：capture 阶段拦 click、animateScroll 缓动；
 *    prefers-reduced-motion 命中时在 JS 入口瞬跳（直接赋值 scrollTop，不排 rAF）。
 * 7. 浮层顶对齐（topDelta 0）：--dcu-preview-top = 刻度 top − rail top；
 *    --dcu-preview-shift 恒 '0px' 且是全文件唯一写入点。
 * 8. aria 次级属性：aria-posinset / aria-setsize / aria-busy（未加载占比近似水合信号）。
 * 9. 当前条跟滚 align:'auto' 语义：完全可见不动、越界多少补多少、不居中、不用 scrollIntoView。
 *
 * ## 这些取值为什么来自 ZCode（证据来源）
 *
 * 全部取值由夜审复核逐行读源码确认（turn-rail-zcode.ts:24-42/74-84/128-143/206-228/
 * 292-294/339-392/432-435、scroll-anim.ts:97-101、CodexSidebar.tsx:470/483-501/533），
 * 并与文档 03-turn-navigator.md 的 A1–A5/C1/D3-D4/E1 行、02-motion.md 的
 * 「源码 Vst」「.9 强调只在非 hover 时生效」「源码 c?'auto':'smooth'」行、
 * 04-open-gaps.md 的 G1/G3/G5 收口记录逐值对上。ZCode 宿主侧等值另有
 * 对 /Applications/ZCode.app/Contents/Resources/app.asar 的 grep 命中记录佐证
 * （--ease-out 曲线、"auto":"smooth"、aria-posinset/aria-setsize/"aria-busy"、scrollToIndex）。
 * 源码内注释亦写明规格出处：本文件头部「规格来源：ZCODE-INDEX-SPEC.md（CDP 实测，非推测）」、
 * WAVE 第三列「来自 ZCode bundle 源码 + 实测：hover d0 时 colorTone:'focus' → bg-foreground」、
 * 浮层「2026-10-26 CDP 实测 ZCode 三条刻度 topDelta 恒为 0」、G3「ZCode：aria-current 变化时
 * scrollToIndex(active, align:'auto')」。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 与 virtual-skip.assert.ts 同一逻辑：本模块的行为全部落在「往宿主 DOM 写哪些内联变量、
 * 挂哪些属性」上，渲染效果依赖活宿主（ZCode 3.16.3）的真实 DOM 与 CDP 实测，
 * 单测环境无法复现宿主。文本断言锁的是契约取值本身：常量数值、变量名、分支条件。
 * 谁改了其中任何一个，这条就红——红得其所。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const railSource = readFileSync(resolve(root, 'src/client/turn-rail-zcode.ts'), 'utf8')
const scrollSource = readFileSync(resolve(root, 'src/client/scroll-anim.ts'), 'utf8')
const sidebarSource = readFileSync(resolve(root, 'src/client/CodexSidebar.tsx'), 'utf8')

// ── 1. hover 四档递进波查表（03-turn-navigator A1）────────────────────────
assert.match(railSource, /\[2\.6, 1, true\],/, 'WAVE d0 档：scaleX 2.6 / opacity 1 / 全前景色')
assert.match(railSource, /\[1\.7, 0\.86, false\],/, 'WAVE d1 档：scaleX 1.7 / opacity .86')
assert.match(railSource, /\[1\.25, 0\.72, false\],/, 'WAVE d2 档：scaleX 1.25 / opacity .72')
assert.match(railSource, /const IDLE_OPACITY = '0\.58'/, '距离 ≥3 的静息透明度必须是 0.58，这是 ZCode 实测的基线')

// ── 2. d0 全前景色（03 A2）───────────────────────────────────────────────
assert.match(
  railSource,
  /if \(full \|\| \(hoverIndex === null && isActive\)\) \{/,
  '全前景色的生效条件必须是「hover d0 或静息当前轮」；只调 opacity 不变色会被一眼认出不是 ZCode',
)
assert.match(
  railSource,
  /setProperty\('--dcu-zcode-color', 'var\(--dsw-alias-label-primary\)'\)/,
  'd0 必须写全前景色令牌 --dsw-alias-label-primary（随主题翻转）',
)
assert.match(
  railSource,
  /removeProperty\('--dcu-zcode-color'\)/,
  '非 d0 档必须 removeProperty 交还消费侧 CSS 的 --dsw-alias-label-dimmed 兜底，否则整条波全变前景色',
)

// ── 3. 静息当前条 .9 强调，且仅非 hover 生效（03 A3 / 02-motion）──────────
assert.match(railSource, /const ACTIVE_OPACITY = '0\.9'/, '静息当前轮强调透明度必须是 0.9（ZCode 实测）')
assert.match(
  railSource,
  /hoverIndex === null && isActive \? ACTIVE_OPACITY : IDLE_OPACITY/,
  '.9 强调只能在非 hover（hoverIndex===null）时生效；hover 时整条波覆盖、当前轮让位（ZCode 语义）',
)

// ── 4. 过渡时长 / 曲线 / 三属性（03 A5）──────────────────────────────────
assert.match(railSource, /const TAILWIND_EASE_OUT = 'cubic-bezier\(0, 0, 0\.2, 1\)'/, '曲线必须是 Tailwind ease-out')
assert.match(railSource, /const DURATION = '0\.15s'/, '过渡时长必须是 0.15s（ZCode 实测）')
assert.match(
  sidebarSource,
  /transition:transform \.15s cubic-bezier\(0,0,\.2,1\),opacity \.15s cubic-bezier\(0,0,\.2,1\),background-color \.15s cubic-bezier\(0,0,\.2,1\)/,
  '消费侧 transition 必须三属性（transform/opacity/background-color）同时长同曲线，缺一个递进就脱节',
)

// ── 5. 刻度几何与基宽（03 A4）────────────────────────────────────────────
assert.match(railSource, /const ITEM_HEIGHT = 10\b/, '刻度纵向 pitch 必须是 10px（ZCode 实测）')
assert.match(
  railSource,
  /return 12 \* \(wave === undefined \? 1 : wave\[0\]\)/,
  '实际宽度公式必须 = 基宽 12 × WAVE 缩放；距离 ≥3 回落基宽 1 倍',
)
assert.match(
  sidebarSource,
  /width:12px;\n  height:2px;\n  border-radius:var\(--dsw-radius-full,999px\);\n  transform-origin:0 50%;/,
  '刻度盒模型必须 12×2px、pill 圆角、transform-origin 左缘（scaleX 从左向右胀开）',
)

// ── 6. 点击平滑滚动 + reduced-motion 瞬跳（04-open-gaps G1）───────────────
assert.match(
  railSource,
  /rail\.addEventListener\('click', \(event\) => \{[\s\S]*?\}, true\)/,
  'click 必须在 capture 阶段（第三参 true）拦截，否则宿主的瞬跳先落地，平滑滚动救不回来',
)
assert.match(
  railSource,
  /animateScroll\(scroller, now\)/,
  '拦到宿主跳转后必须交给 animateScroll 缓动到目标位置（不能瞬跳）',
)
assert.match(
  scrollSource,
  /if \(window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) \{\n    scroller\.scrollTop = to\n    scrollAnims\.delete\(scroller\)\n    return/,
  'reduced-motion 必须在 JS 入口分支瞬跳（直接赋值 scrollTop 并 return，不排 rAF）——CSS 管不到 JS 驱动的滚动动画',
)

// ── 7. 浮层顶对齐（topDelta 0）（03 C1）──────────────────────────────────
assert.match(
  railSource,
  /setProperty\('--dcu-preview-top', `\$\{btnRect\.top - railRect\.top\}px`\)/,
  '浮层 top 必须直接读被 hover 刻度的几何（刻度 top − rail top），不猜、不居中',
)
assert.match(
  railSource,
  /setProperty\('--dcu-preview-shift', '0px'\)/,
  '顶对齐后垂直补偿恒为 0px：任何非 0 值都会在宿主钳制区变成双重位移',
)
assert.equal(
  (railSource.match(/--dcu-preview-shift/g) || []).length,
  1,
  '--dcu-preview-shift 全文件只允许出现一次（恒 0px 的唯一写入点）；多出来意味着有人恢复了垂直补偿逻辑',
)
assert.match(
  sidebarSource,
  /top:var\(--dcu-preview-top,0px\)!important;/,
  '消费侧必须用 !important 接管 top：宿主的 top 来自 JS 内联样式，普通声明压不过',
)

// ── 8. aria 次级属性（03 D3/D4 / 04-open-gaps G5）────────────────────────
assert.match(railSource, /function applyAriaMetadata/, '必须存在 applyAriaMetadata：读屏依赖次级 aria 属性')
assert.match(
  railSource,
  /button\.setAttribute\('aria-posinset', String\(index \+ 1\)\)/,
  '每个刻度必须带 aria-posinset（第几条，1 起）',
)
assert.match(
  railSource,
  /button\.setAttribute\('aria-setsize', String\(size\)\)/,
  '每个刻度必须带 aria-setsize（共几条）',
)
assert.match(
  railSource,
  /rail\.setAttribute\('aria-busy', 'true'\)/,
  '仍有未加载刻度时 nav 必须带 aria-busy="true"（用未加载占比近似水合信号）',
)

// ── 9. 当前条跟滚 align:'auto' 语义（03 E1 / 04-open-gaps G3）────────────
assert.match(railSource, /function keepActiveVisible/, '必须存在 keepActiveVisible：rail 可滚时当前条不能被滚出视野')
assert.match(
  railSource,
  /align:'auto' 语义：完全可见就不动；越界多少补多少，不做居中/,
  '必须保留 align:auto 语义注释：居中会让当前条随每次滚动乱跳，这是 ZCode 的行为分界',
)
assert.match(
  railSource,
  /scroller\.scrollTop -= box\.top - rect\.top/,
  '当前条越出上缘时只补越界量（不做居中）',
)
assert.match(
  railSource,
  /scroller\.scrollTop \+= rect\.bottom - box\.bottom/,
  '当前条越出下缘时只补越界量（不做居中）',
)
assert.ok(
  !/\.scrollIntoView\(/.test(railSource),
  '不得调用 scrollIntoView：默认会连带滚动所有可滚祖先，把会话滚动区也拽走（只准改 rail 内部 scroller 的 scrollTop；源码 :203 注释里提到该词是解释为什么不用它，不算调用）',
)

console.log('night-audit-batch-7：turn-rail-zcode 9 组断言全部通过')
