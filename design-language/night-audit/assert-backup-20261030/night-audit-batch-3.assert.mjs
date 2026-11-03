/**
 * 夜审第三批：侧栏几何与动效契约（night-audit batch 3）。
 *
 * ## 锁什么（4 个已复核条目，13 条断言）
 *
 * 1. **默认展开宽度 264px** —— `CODEX_SIDEBAR_DEFAULT_PX = 264`
 *    （src/client/sidebar-width.ts:16），且出处注释「ZCode 实测 264」必须在位。
 *    证据链：cdp-capture/zcode-live-geometry.json 的 sidebar.w=264（CDP 实读）；
 *    04-open-gaps.md:784 侧栏裁决「宽 264 / bg #161616」✅。
 *    同时锁该条目 expected 的底色令牌文本：src/client/zcode-theme.ts:245/:246 的
 *    `--dcu-sidebar-background:#f5f5f5`（浅）/ `#161616`（深）——来源是
 *    03b-sidebar.md:244-258 §8 裁决「保持实色」与 ZCode tokens.json 实测
 *    --color-sidebar = oklch(97% 0 0) = #f5f5f5（zcode-theme.ts:249-251 注释）。
 * 2. **开合时长+曲线 = 200ms ease-out** —— zcode-theme.ts:137
 *    `--dcu-motion-move-duration:200ms;--dcu-motion-move-ease:cubic-bezier(0,0,.2,1)`。
 *    来源：ZCode asar 实测侧栏开合类名 `duration-200 ease-out transition-[width,opacity]`
 *    与 `--ease-out:cubic-bezier(0, 0, .2, 1)`；02-motion.md:351 表「侧栏开合 → 200ms」。
 *    旧值 300ms 比 ZCode 慢 50%，是「收起拖沓」的根源，不许回退。
 *    并锁消费点：sidebar-width.ts:456 读 `--dcu-motion-move-duration`——若令牌改名而
 *    消费点没跟上，侧栏会静默退回 180ms 兜底（readMoveDuration 的 fallback），
 *    与 ZCode 档位脱钩且无人察觉。
 * 3. **最小拖拽宽度 200px 是已声明的主动放宽** —— `CODEX_SIDEBAR_MIN_PX = 200`
 *    （sidebar-width.ts:13）。ZCode 下限实测 264（cdp-capture/zcode-drag-limits.json：
 *    start=264 / 左拖极限 264 / 右拖极限 599）；取 200 是可用性取舍（给用户收窄空间，
 *    200px 下标题仍有约 96px 可用），不是规格对齐。因此除常量外还锁声明注释
 *    （「拖拽下限实测是 264px」「**主动放宽**」）：将来调这个值必须重写论证，
 *    不许把「主动放宽」无声改写成「对齐 ZCode」。
 * 4. **reduced-motion 时跳过开合动画、直接落定** —— sidebar-width.ts:450-452 定义
 *    prefersReducedMotion（matchMedia('(prefers-reduced-motion: reduce)')）；
 *    :601 `beginSidebarMotion` 首行守卫 `win === null || prefersReducedMotion(win)`
 *    即返回 false；:838-841 调用方对 false 立即 `applySlimSidebar` 落定并记静止态。
 *    语义与 ZCode 一致（02-motion.md:22 源码 `c?'auto':'smooth'`、:36 CSS
 *    motion-reduce:transition-none）。锁「守卫存在 + 回退路径是落定而不是动画」。
 *
 * ## 为什么用源码文本断言而不是渲染测试
 *
 * 这四个点的「真值」都活在 ZCode 宿主页面里：网格轨道列宽、computed style、
 * matchMedia 都是宿主运行时状态，插件测试环境造不出真宿主 frame，渲染测试
 * 只能测到替身。能稳定锁住的是契约层：常量取值、令牌声明、消费点、守卫与
 * 回退路径——改任何一处这里必须红，逼着改动者重新对一遍 ZCode 实测值。
 * 真实体感（动画是否丝滑、宽度是否生效）仍按惯例在活宿主里人工/CDP 验证。
 *
 * 纯 JavaScript（.mjs）：全量门禁第一步是 tsc --noEmit 全仓类型检查，
 * 此前 .assert.ts 版本因类型检查被整批撤回，故本文件不含任何 TS 语法。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sidebarWidth = readFileSync(resolve(root, 'src/client/sidebar-width.ts'), 'utf8')
const zcodeTheme = readFileSync(resolve(root, 'src/client/zcode-theme.ts'), 'utf8')

// ── 1. 默认展开宽度 264px（与 ZCode CDP 实测一致）──────────────────────────
assert.match(
  sidebarWidth,
  /export const CODEX_SIDEBAR_DEFAULT_PX = 264/,
  '默认展开宽度必须保持 264：ZCode 实测值（zcode-live-geometry.json sidebar.w=264），改动即偏离实测',
)
assert.match(
  sidebarWidth,
  /默认展开宽度。ZCode 实测 264/,
  '出处注释不得删除：它是「264 来自 ZCode 实测」的证据指针，丢了就没人知道该跟谁对齐',
)

// 1b. 该条目 expected 的底色令牌文本（zcode-theme.ts:245/:246，03b-sidebar.md §8 裁决「保持实色」）
assert.match(
  zcodeTheme,
  /--dcu-sidebar-background:#f5f5f5/,
  '浅色侧栏底色令牌必须是 #f5f5f5：ZCode tokens.json 实测 --color-sidebar = oklch(97% 0 0)',
)
assert.match(
  zcodeTheme,
  /--dcu-sidebar-background:#161616/,
  '深色侧栏底色令牌必须是 #161616：03b-sidebar.md §8 裁决保持实色，不回归半透明/毛玻璃',
)

// ── 2. 开合时长+曲线 = 200ms ease-out（ZCode 侧栏开合档）───────────────────
assert.match(
  zcodeTheme,
  /--dcu-motion-move-duration:200ms/,
  '开合时长必须是 200ms：ZCode asar 实测 duration-200；旧值 300ms 是「收起拖沓」的根源',
)
assert.match(
  zcodeTheme,
  /--dcu-motion-move-ease:cubic-bezier\(0,0,\.2,1\)/,
  '开合曲线必须是 ease-out cubic-bezier(0,0,.2,1)：与 ZCode --ease-out 实测值逐字一致',
)
assert.match(
  sidebarWidth,
  /getPropertyValue\('--dcu-motion-move-duration'\)/,
  '侧栏开合必须消费 move-duration 令牌：令牌改名而消费点没跟，会静默退回 180ms 兜底',
)

// ── 3. 最小拖拽宽度 200px = 已声明的主动放宽（ZCode 下限 264）──────────────
assert.match(
  sidebarWidth,
  /export const CODEX_SIDEBAR_MIN_PX = 200/,
  '最小拖拽宽度必须保持 200：这是已裁决的主动放宽（ZCode 下限 264），回改成 264 会失去收窄空间',
)
assert.match(
  sidebarWidth,
  /拖拽下限实测是 264px/,
  'ZCode 下限 264 的实测记录必须保留在声明注释里：它是「200 ≠ 对齐 ZCode」的证据',
)
assert.match(
  sidebarWidth,
  /\*\*主动放宽\*\*/,
  '「主动放宽」定性不得删除：将来调整下限必须重写这段论证，不许无声改成「对齐 ZCode」',
)

// ── 4. reduced-motion：跳过开合动画，直接落定 ─────────────────────────────
assert.match(
  sidebarWidth,
  /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/,
  'prefersReducedMotion 必须探测 prefers-reduced-motion: reduce：无障碍语义与 ZCode 一致',
)
assert.match(
  sidebarWidth,
  /if \(win === null \|\| prefersReducedMotion\(win\)\) return false/,
  'beginSidebarMotion 首行必须守卫 reduced-motion（返回 false = 不播动画）',
)
assert.match(
  sidebarWidth,
  /if \(!beginSidebarMotion\(frame, collapsed\)\) \{\s*applySlimSidebar\(frame\)\s*restStates\.set\(frame, collapsed\)\s*\}/,
  'beginSidebarMotion 返回 false 时调用方必须立即落定并记静止态：不许走半程动画或漏记 restStates',
)

console.log('night-audit batch-3 侧栏契约：13 条断言全部通过')
