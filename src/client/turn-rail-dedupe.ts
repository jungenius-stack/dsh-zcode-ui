/**
 * 同 id 索引栏去重。
 *
 * 背景（2026-10-19 实测）：`dsh-zcode-ui` 是 `@michengai/dsh-codex-ui` 的 fork，两个包
 * 可能同时装进同一个 DSH profile（本机 desktop profile 就是如此）。两者都往
 * `conversation.session.header.utilities` 注册 `id: 'turn-navigator'`，而 slot 注册表按
 * 「包 + id」区分，于是同一个 id 会被渲染成**两条并排的索引栏**——用户看到的现象是
 * 「左右各一条、位置互相错开」，并且滚动/折叠时两条不同步，看起来就是「漂移」。
 *
 * 与其依赖对方的包名或类名，这里只做一个最小判断：页面里若有多个自绘索引栏，
 * 只保留**最先出现在文档顺序里的那一条**，其余打上 `data-dcu-turn-rail-stale` 退场。
 * 之所以保留第一条而不是「保留自己的」：先挂载者通常是用户当前实际在用的那套皮肤，
 * 贸然抢占会让正在生效的皮肤突然消失。
 */
const RAIL = '.dcu-turn-navigator'
const KEEP = 'data-dcu-turn-rail-primary'
const STALE = 'data-dcu-turn-rail-stale'

function reconcile(doc: Document): void {
  const rails = [...doc.querySelectorAll<HTMLElement>(RAIL)]
  if (rails.length <= 1) {
    // 回到单条时清掉标记，避免皮肤切换后残留。
    if (rails.length === 1) {
      rails[0].removeAttribute(STALE)
      rails[0].setAttribute(KEEP, '')
    }
    return
  }
  const [primary, ...rest] = rails
  primary.setAttribute(KEEP, '')
  primary.removeAttribute(STALE)
  for (const rail of rest) {
    rail.setAttribute(STALE, '')
    rail.removeAttribute(KEEP)
  }
}

/** 观察索引栏的增删；返回停止函数。 */
export function dedupeTurnRails(doc: Document = document): () => void {
  if (doc.body === null) return () => {}
  let frame: number | undefined
  const schedule = (): void => {
    if (frame !== undefined) return
    frame = window.requestAnimationFrame(() => {
      frame = undefined
      reconcile(doc)
    })
  }
  const observer = new MutationObserver(() => schedule())
  observer.observe(doc.body, { childList: true, subtree: true })
  schedule()
  return () => {
    observer.disconnect()
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    for (const rail of doc.querySelectorAll<HTMLElement>(`[${KEEP}],[${STALE}]`)) {
      rail.removeAttribute(KEEP)
      rail.removeAttribute(STALE)
    }
  }
}
