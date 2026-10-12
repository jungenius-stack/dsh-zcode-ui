/**
 * 会话行只展示标题第一行，避免换行把胶囊撑高。
 *
 * 说明：本模块原先还导出 titleOverflowPx / titleScrollDurationMs，配合 CSS 实现
 * 「hover 时标题跑马灯滚动」。该机制已移除——父容器 `.dcu-wb-session-title` 是
 * `overflow:hidden`，而滚动时内层被撑成 `width:max-content`，导致标题**两端同时被裁**
 * （实测容器 130px、文字 175px，滚动中途两端都不可读）。现改为纯 ellipsis 截断，
 * 完整标题由既有的 tooltip 承担。
 */
export function sessionTitleLine(title: string): string {
  return title.split(/\r?\n/)[0] ?? title
}
