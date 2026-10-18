/**
 * 输入区两处静态视觉修正（与 ZCode 对齐）。
 *
 * 1. **左下角加号**：宿主 `.yhfFVG_add` 的静止态底色是
 *    `--dsw-specific-selector`（一个常驻的灰色圆），看起来像一圈永远亮着的阴影。
 *    ZCode 只在指针悬停 / 键盘聚焦时才给圆形底，静止态保持裸图标。
 *    宿主本身已有 `:hover:not(:disabled)` 的语义令牌底色，这里只把静止态清零，
 *    并把 hover 的令牌重新声明一次（覆盖宿主的选择器特异性）。
 *
 * 2. **回到底部按钮**：宿主 `.icaHSq_toBottomSlot` 用 `justify-content:flex-end`
 *    把 34px 的圆形按钮贴在会话区右缘；ZCode 里它居中。这里只改对齐方式，
 *    按钮尺寸、sticky 的 `bottom` 偏移与点击行为都不动。
 *
 * 两处都只写属性、不加节点，不改变宿主任何行为。
 */

export const COMPOSER_VISUALS_STYLE_ID = 'dcu-composer-visuals-style'

export const COMPOSER_VISUALS_CSS = `
/* 加号：静止态不画圆；悬停/键盘聚焦时才出现圆形底。 */
[data-conversation-scroll] [data-composer-card] button[class*="_add"]{
  transition:background-color var(--dcu-motion-feedback-duration,120ms) var(--dcu-motion-feedback-ease,ease-out);
}
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:not(:hover):not(:focus-visible){
  background:transparent;
}
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:hover:not(:disabled),
[data-conversation-scroll] [data-composer-card] button[class*="_add"]:focus-visible{
  background:var(--dsw-alias-interactive-bg-hover-solid);
}

/* 回到底部：宿主靠右（flex-end），改为会话区居中。
   宿主还给这个槽留了 195px 右内边距（给右侧面板/滚动条预留），
   只在内容盒里居中会偏左 ~97px；这里把内边距一并清零，按整个会话区居中。 */
[data-conversation-scroll] [class*="_toBottomSlot"]{
  justify-content:center;
  padding-right:0;
}
`

/** 安装样式；返回卸载函数。幂等（同 id 的 style 只会有一份）。 */
export function installComposerVisuals(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.getElementById(COMPOSER_VISUALS_STYLE_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = COMPOSER_VISUALS_STYLE_ID
  style.textContent = COMPOSER_VISUALS_CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
