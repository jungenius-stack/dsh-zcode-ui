/**
 * 夜审第 10 批 —— ZCode 对齐项的回归契约（纯 JS，过 tsc --noEmit 全仓门禁）。
 *
 * ## 锁什么（10 条已复核对齐项）
 *
 * 1. **document-hidden-motion-pause.ts**：`data-document-hidden` 机制六要素——
 *    常量、toggleAttribute 双态、装载即同步、监听 visibilitychange、卸载解绑、
 *    卸载撤属性。取值来自 ZCode asar@332987332（styles-CQuzX8si.js）逐字对照：
 *    `var L1n='data-document-hidden';…toggleAttribute(L1n,e.visibilityState==='hidden')…`
 *    六项机制与本仓 `:32,46-57` 一一同构。
 * 2. **foreign-surface-discovery.ts SKIN_RADII（:65）**：九档圆角刻度
 *    `0/2/4/6/8/12/16/999px + 50%`。其中 2/4/6/8/12/16/999 是 zcode-tokens.ts:504-521
 *    半径标度（xs2/sm4/md6/lg8/xl12/panel16/2xl16/full999）的真子集；锚点亲读
 *    03e-header.md:27,40（顶栏钮 28×28 radius 8px）、03b-sidebar.md:31（列表行圆角 8px）。
 * 3. **foreign-surface-discovery.ts SKIN_SIZES（:68-70）**：十档字号
 *    9/10/12/13/14/16/18 + 展示档 20/22/34。zcode-tokens.ts:551-560 以 base=14px
 *    派生（2xs-5/xs-4/sm-2/caption-1/lg+2/xl+4/title+6/headline+8/display+20），
 *    逐档相等；:543-547 注释明言 20/22/34 是 2026-10-13 制度化扩展。ZCode 侧
 *    styles-9Z13W0KP.css 的 --text-ui-* 与 03n-typography.md §A2 一致。
 * 4-9. **DesktopNavigationControls.tsx + locales.ts**：按钮 28×28（ZCode icon-md=
 *    `size-7 rounded-lg`，--spacing:.25rem ⇒ 28px，03e-header.md:40）、图标 16×16
 *    （[&_svg:not([class*='size-'])]:size-4 = 16px）、中文「后退/前进」（ZCode 中文包
 *    asar@310466349 taskNav.back/forward 逐字一致）、aria-label 与 title 同值 +
 *    disabled 绑定（asar@331023603 h4 签名 {title,ariaLabel,disabled}）、行容器与按钮
 *    双侧 -webkit-app-region:no-drag（asar@331027100/331023603）、左定位 12px
 *    （pl-3 = 3×4px）。
 * 10. **workspace-drop-indicator 落点线形态**（CodexWorkspaceBrowser.tsx:325-327 +
 *     workspace-drop-indicator.ts:70）：8px 容器、2px 线、8px 圆点 2px 边框、
 *     aria-hidden。对照 ZCode asar@328643716：`h-0.5`(2px)+`size-2`(8px)+`border-2`(2px)
 *     +`aria-hidden:"true"`，形态同构。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 这批锁的都是「移植取值」：数值、文案、绑定关系。渲染测试需要活宿主与真实主题
 * 环境，且同样的取值错误照样绿；源码文本断言能确定地锁住「源里写着什么」，
 * 谁改动这些对齐值（或顺手"优化"掉）门禁立刻红。像素级还原是否成立由
 * zcode-tokens 的 token 定义与 CSS 规则保证，这里锁的是它的输入不再漂移。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

// ── 1. document-hidden-motion-pause.ts：data-document-hidden 六要素 ──────────
const hiddenSource = read('document-hidden-motion-pause.ts')
assert.match(
  hiddenSource,
  /DOCUMENT_HIDDEN_ATTRIBUTE\s*=\s*'data-document-hidden'/,
  '属性名变了：ZCode 宿主 CSS 按 html[data-document-hidden] 停动画，改名即断联',
)
assert.match(
  hiddenSource,
  /toggleAttribute\(DOCUMENT_HIDDEN_ATTRIBUTE,\s*doc\.visibilityState\s*===\s*'hidden'\)/,
  '必须是 toggleAttribute(名, visibilityState===hidden) 的双态同步，与 ZCode 逐字同构',
)
assert.match(
  hiddenSource,
  /sync\(\)\n\s*doc\.addEventListener\('visibilitychange', sync\)/,
  '装载必须立即同步一次（插件可能在页面已隐藏时才加载），随后监听 visibilitychange',
)
assert.match(
  hiddenSource,
  /removeEventListener\('visibilitychange', sync\)/,
  '卸载必须解绑 visibilitychange 监听',
)
assert.match(
  hiddenSource,
  /removeAttribute\(DOCUMENT_HIDDEN_ATTRIBUTE\)/,
  '卸载必须撤掉标记属性：否则页面永久停在「动画被禁用」状态而无人清理',
)

// ── 2. foreign-surface-discovery.ts：SKIN_RADII 九档圆角刻度 ─────────────────
const foreignSource = read('foreign-surface-discovery.ts')
const radii = foreignSource.match(/const SKIN_RADII = new Set\(\[([^\]]+)\]\)/)
assert.ok(radii, 'SKIN_RADII 定义丢失：外来表面体检失去圆角标度依据')
assert.deepEqual(
  radii[1].split(',').map(item => item.trim().replace(/'/g, '')),
  ['0px', '2px', '4px', '6px', '8px', '12px', '16px', '999px', '50%'],
  '圆角刻度九档必须与 ZCode 半径标度（zcode-tokens.ts:504-521）逐档对应',
)
// 锚点：刻度值确实来自 zcode-tokens 的半径标度（本仓亲读 :507,521）。
const tokensSource = read('zcode-tokens.ts')
assert.match(tokensSource, /'--dsw-radius-lg': '8px'/, '半径标度锚点 lg=8px 漂移（03e-header 顶栏钮 radius 8px 的依据）')
assert.match(tokensSource, /'--dsw-radius-full': '999px'/, '半径标度锚点 full=999px 漂移（胶囊/圆形的刻度表达）')

// ── 3. foreign-surface-discovery.ts：SKIN_SIZES 十档字号刻度 ─────────────────
const sizes = foreignSource.match(/const SKIN_SIZES = new Set\(\[([^\]]+)\]\)/)
assert.ok(sizes, 'SKIN_SIZES 定义丢失：外来表面体检失去字号标度依据')
assert.deepEqual(
  sizes[1].split(',').map(item => item.trim().replace(/'/g, '')).filter(item => item !== ''),
  ['9px', '10px', '12px', '13px', '14px', '16px', '18px', '20px', '22px', '34px'],
  '字号刻度十档（界面七档 9/10/12/13/14/16/18 + 展示三档 20/22/34）必须与 zcode-tokens.ts:551-560 逐档相等',
)
assert.match(tokensSource, /'--dsw-font-size-base': '14px'/, '字号基准 base=14px 漂移（ZCode --ui-font-size:14px，十档刻度全部由它派生）')

// ── 4. DesktopNavigationControls.tsx：按钮 28×28 ────────────────────────────
const navSource = read('DesktopNavigationControls.tsx')
assert.match(
  navSource,
  /\.dcu-desktop-navigation button\{[^}]*width:28px;height:28px/,
  '按钮尺寸变了：ZCode icon-md = size-7 = 28px（03e-header.md:40 顶栏按钮 28×28）',
)

// ── 5. DesktopNavigationControls.tsx：图标 16×16 ────────────────────────────
assert.match(
  navSource,
  /<svg width="16" height="16" viewBox="0 0 16 16"/,
  '图标尺寸变了：ZCode icon-md 内 svg 为 size-4 = 16px',
)

// ── 6. locales.ts：中文文案「后退/前进」 ─────────────────────────────────────
const localesSource = read('locales.ts')
assert.match(localesSource, /'navigation\.back': '后退'/, '文案变了：ZCode 中文包 taskNav.back=后退 逐字一致')
assert.match(localesSource, /'navigation\.forward': '前进'/, '文案变了：ZCode 中文包 taskNav.forward=前进 逐字一致')

// ── 7. DesktopNavigationControls.tsx：aria-label 与 title 同值 + disabled ────
assert.match(
  navSource,
  /aria-label=\{t\(`navigation\.\$\{direction\}`\)\} title=\{t\(`navigation\.\$\{direction\}`\)\}/,
  'aria-label 与 title 必须消费同一个 t(...) 表达式（ZCode h4 侧 title/ariaLabel 同值）',
)
assert.match(
  navSource,
  /disabled=\{direction === 'back' \? !state\.canBack : !state\.canForward\}/,
  'disabled 必须绑定 canBack/canForward 快照（ZCode 后退/前进分别 disabled:!m/!h）',
)

// ── 8. DesktopNavigationControls.tsx：行容器与按钮双侧 no-drag ───────────────
assert.match(
  navSource,
  /html\[data-windows-titlebar\] \.dcu-desktop-navigation\{[^}]*-webkit-app-region:no-drag/,
  '行容器缺 no-drag：整条导航会跟随窗口拖拽（ZCode 行容器 [app-region:no-drag]）',
)
assert.match(
  navSource,
  /\.dcu-desktop-navigation button\{[^}]*-webkit-app-region:no-drag/,
  '按钮缺 no-drag：点击会变成窗口拖拽（ZCode 按钮 [app-region:no-drag]）',
)

// ── 9. DesktopNavigationControls.tsx：左定位 12px ───────────────────────────
assert.match(
  navSource,
  /html\[data-windows-titlebar\] \.dcu-desktop-navigation\{[^}]*left:12px/,
  '左定位变了：ZCode 为 pl-3 = 12px（Windows 桌面态的导航起点）',
)

// ── 10. 落点指示线形态（容器/线/圆点/aria-hidden）────────────────────────────
const browserSource = read('CodexWorkspaceBrowser.tsx')
assert.match(
  browserSource,
  /\.dcu-wb-drop-indicator\{[^}]*height:8px/,
  '容器高度变了：ZCode 圆点 diameter 8px（size-2），容器按圆点整体高度建模',
)
assert.match(
  browserSource,
  /\.dcu-wb-drop-indicator::before\{[^}]*height:2px/,
  '指示线变了：ZCode h-0.5 = 2px',
)
assert.match(
  browserSource,
  /\.dcu-wb-drop-indicator::after\{[^}]*width:8px;height:8px;[^}]*border:2px solid currentColor/,
  '圆点变了：ZCode size-2(8px) + border-2(2px) + currentColor',
)
assert.match(
  read('workspace-drop-indicator.ts'),
  /setAttribute\('aria-hidden', 'true'\)/,
  '指示线必须对辅助技术隐藏（ZCode 同款 aria-hidden:"true"）',
)

console.log('night-audit batch-10 对齐契约：25 条断言全部通过')
