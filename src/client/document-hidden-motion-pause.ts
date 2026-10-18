/**
 * 文档隐藏时暂停动效 —— 移植自 ZCode `lib/documentHiddenMotionPause.ts`。
 *
 * ## 为什么需要它（上游原文，见 ZCode packages/ui/src/styles.css:84-86）
 *
 * 「窗口 hidden 时 CSS 动画无法结算，DocumentTimeline 会持有期间被移除的元素及整棵子树，
 * 后台流式输出时内存无上限累积、恢复可见才释放。hidden 期间禁用动画，不再创建新的动画对象。」
 *
 * 对本插件的具体意义：DSH 的会话区在后台仍会流式追加内容，被替换掉的旧节点本应立即回收，
 * 但只要页面上还有未结算的动画，Chromium 的 DocumentTimeline 就会继续持有它们。
 * 长对话 + 后台流式输出正是这个泄漏最容易放大的场景（本仓库 §27 已记录过长对话下的
 * 样式重算规模，动画对象累积是同一现场的另一面）。
 *
 * ## 与 reduced-motion 的分工（两者都不能省）
 *
 * | 机制 | 触发条件 | 解决什么 |
 * | --- | --- | --- |
 * | `prefers-reduced-motion` | 用户偏好 | 可访问性：不要动效 |
 * | `data-document-hidden` | 页面不可见 | 内存：隐藏期间不创建动画对象 |
 *
 * 两者的 CSS 写法都是「停动画」，但**触发条件无关**：一个用户开着动效偏好时后台仍会累积。
 * 所以不能合并成一条规则。
 *
 * ## 为什么用属性而不是直接改样式
 *
 * 属性让「隐藏暂停」成为一个**可观测状态**：DevTools 里能直接看到
 * `html[data-document-hidden]`，排查「后台是否真的停了」不需要读 JS 状态。
 * 上游同款（`installDocumentHiddenMotionPause`）。
 */

/** 挂在 `html` 上的标记属性；CSS 侧用它停掉 transition / animation。 */
export const DOCUMENT_HIDDEN_ATTRIBUTE = 'data-document-hidden'

/**
 * 安装「文档隐藏时暂停动效」。
 *
 * 立即按当前 `visibilityState` 同步一次（插件可能在页面已经隐藏时被加载，例如
 * 后台标签页里宿主恢复会话），随后监听 `visibilitychange`。
 *
 * @param doc - 目标文档；默认 `globalThis.document`。
 * @returns 卸载函数，供 `ctx.effect` 在插件卸载时回收。
 */
export function installDocumentHiddenMotionPause(doc: Document | undefined = globalThis.document): () => void {
  if (doc === undefined) return () => {}

  const sync = (): void => {
    doc.documentElement.toggleAttribute(DOCUMENT_HIDDEN_ATTRIBUTE, doc.visibilityState === 'hidden')
  }
  sync()
  doc.addEventListener('visibilitychange', sync)

  return () => {
    doc.removeEventListener('visibilitychange', sync)
    // 卸载时必须撤掉标记：否则页面会永久停在「动画被禁用」的状态，
    // 而插件已不在场，没有任何消费者会再把它清掉。
    doc.documentElement.removeAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)
  }
}
