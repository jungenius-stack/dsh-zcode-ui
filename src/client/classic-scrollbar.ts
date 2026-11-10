/**
 * 滚动条 gutter 降级（2026-11-10）。
 *
 * 背景：`conversation-layout.ts` 的 X2 把会话滚动区设成
 * `scrollbar-gutter:stable both-edges`，照抄 ZCode。那条规则的原始注释假设
 * **覆盖式滚动条宽度为 0**，双边预留不花钱。
 *
 * **那个假设是错的。** 2026-11-10 活体实测：DSH 宿主自带
 * `::-webkit-scrollbar{width:var(--dsh-scrollbar-width)}`（=14px，
 * 见 zcode-tokens.ts:581），所以滚动条在**所有平台**都是真占位的经典式——
 * macOS 上 `[data-conversation-scroll]` 的 offsetWidth−clientWidth 就是 14。
 * both-edges 于是在每边各留 14px，合计 28px 从内容宽度里永久消失。
 *
 * 后果是连锁的：
 *   · 848px 主列 + 864px 输入卡（C1）在 1280 断点上够不着；
 *   · `@container (min-width:1280px)` 的宽档可能永不触发；
 *   · 内容整体收窄，而侧栏宽度、刻度条位置按「完整视口」算——相对关系错位。
 * Windows 的滚动条更宽（100% 缩放 15–17px，125% 约 20px），把这条一直存在的
 * 宽度损失推到了肉眼可见的程度，用户因此报「刻度漂浮」与「整片发虚」。
 *
 * 修法：**实测**滚动条宽度，>0 就降级成单边 `stable`。不猜操作系统名，因为
 *   · Electron 可以强制 overlay；
 *   · Win11 的 overlay 开关由系统设置决定，同一台机器能变；
 *   · Linux 各桌面环境行为不一；
 *   · 未来 Chrome 把 overlay 推回 Windows，猜平台的代码会立刻过期。
 * 实测法对以上全部自动正确，也对「宿主某天把 --dsh-scrollbar-width 改成 0」
 * 这种上游变化自动正确。
 *
 * 降级后仍保留单边 `stable`：滚动条出现/消失时右侧不跳——这是 both-edges 原本
 * 要解决的次要问题，白留着。只把左边那一半还回内容宽度。
 *
 * 幂等安装，卸载时摘属性。窗口跨屏拖动（overlay ↔ 经典）由 resize 重测覆盖。
 */

/** 承载降级开关的属性；CSS 侧挂在 `html[...]` 上。 */
export const CLASSIC_SCROLLBAR_ATTR = 'data-dcu-classic-scrollbar'

/** 判定阈值：覆盖式滚动条宽度为 0，经典式至少 10px；>2px 即认为「真的占位」。 */
const CLASSIC_THRESHOLD_PX = 2

/**
 * 实测滚动条占位宽度。
 *
 * 造一个 `overflow:scroll` 的离屏盒，比较 `offsetWidth - clientWidth`：
 * 覆盖式滚动条不占布局宽度，差值为 0；经典式差值就是滚动条宽度。
 * 盒子挂在 body 上（而不是 detached），否则部分引擎不给它算布局。
 */
function measureScrollbarWidth(): number {
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.cssText = [
    'position:absolute',
    'top:-9999px',
    'left:0',
    'width:100px',
    'height:100px',
    'overflow:scroll',
    'visibility:hidden',
    'pointer-events:none',
  ].join(';')
  document.body.appendChild(probe)
  const width = probe.offsetWidth - probe.clientWidth
  probe.remove()
  return width
}

function sync(): void {
  const root = document.documentElement
  const width = measureScrollbarWidth()
  if (width > CLASSIC_THRESHOLD_PX) root.setAttribute(CLASSIC_SCROLLBAR_ATTR, '')
  else root.removeAttribute(CLASSIC_SCROLLBAR_ATTR)
}

/** 已安装的卸载函数。重复安装只返回同一个，避免 resize 监听叠成多层。 */
let activeTeardown: (() => void) | undefined

/**
 * 安装：立即测一次，之后窗口尺寸变化重测（跨屏拖动 / 系统缩放 / overlay 开关）。
 * 返回卸载函数；幂等（重复调用不会叠监听）。
 *
 * 幂等靠模块级 activeTeardown 而非「装过就跳过」：宿主可能先给一个临时
 * document（首帧前 body 还没挂），那种情况必须先装后卸、再装到真 body 上。
 */
export function observeClassicScrollbar(): () => void {
  if (typeof document === 'undefined' || !document.body) return () => {}
  if (activeTeardown) return activeTeardown
  sync()
  let frame = 0
  const onResize = (): void => {
    // 拖动窗口会连发 resize；合并到下一帧，避免每像素一次离屏探针。
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      sync()
    })
  }
  window.addEventListener('resize', onResize)
  const teardown = (): void => {
    window.removeEventListener('resize', onResize)
    if (frame) cancelAnimationFrame(frame)
    document.documentElement.removeAttribute(CLASSIC_SCROLLBAR_ATTR)
    if (activeTeardown === teardown) activeTeardown = undefined
  }
  activeTeardown = teardown
  return teardown
}
