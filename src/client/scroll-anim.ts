/**
 * 滚动动画：瞬移 + 尾段滑入（TCP-01）/ 互扰让位（TCP-02）。
 *
 * **本模块是从 `turn-rail-zcode.ts` 抽出来的**（2026-10-27 第 27 轮评审要求）。
 * 原因：`scripts/verify-scroll-yield.mjs` 原先把实现**复制**进测试页，
 * 那份副本改不改都与真实产物无关——它的绿只证明"抄的那份自洽"。
 * 抽成模块后，运行时与测试**引用同一份实现**，测试才有意义。
 *
 * 约束：本模块不依赖任何 DOM 之外的上下文，`scroller` 由调用方传入，
 * 便于测试页用任意可滚动元素驱动。
 */

/**
 * 时长按**距离**自适应，而不是固定值。
 *
 * 2026-10-26 实测本机帧率与「每帧滚动距离」强相关：
 *   每帧 100px → 35ms/帧；500px → 41ms；1000px → 60ms；3000px → 88ms。
 * 固定 420ms 跨 4 万 px 时每帧要滚 8000px，必然掉到 5 帧、看起来仍像瞬跳。
 * 而 ZCode 的滚动区只有 737 个节点（DSH 有 38769 个），它 8ms 一帧、172 个采样点。
 * 我们改不了宿主的 DOM 规模，能控的只有「每帧滚多少」。
 *
 * 策略：按距离给时长，保证平均每帧位移落在 400~800px 区间（实测 41~60ms/帧可接受），
 * 并设上下限避免极短距离磨蹭、极长距离磨到 2 秒以上。
 * 上限 2200ms 是实测红线：试过 4000ms/1.6px·ms⁻¹，动画跑到一半就被
 * 宿主的「跟随底部」抢占，scrollTop 卡在中间值不动（实测 200 帧只有 3 个值、停在 9199）。
 */
export const SCROLL_MIN_MS = 320
export const SCROLL_MAX_MS = 2200
export const SCROLL_PX_PER_MS = 3.2
/*
 * TCP-01（2026-10-27 第 24 轮）：长距离点击不丝滑，实测根因是**宿主挂载成本**，不是缓动或时长。
 *
 * 实测证据（1280×820 / dpr2 / 45 刻度 / 深色 / 文档高 88752px / 视口 764px）：
 *   - 点刻度[12]（16468px）：rAF 间隔被拉长到 117~307ms，期间出现 5 次 800~3100px 的大跳；
 *   - 但同一时段只记录到 **1 个 longtask（204ms）**——所以不是「长任务持续占满主线程」；
 *   - 决定性对照：**只写一次 scrollTop、完全不排动画帧**，最大帧间隔仍是 116ms，
 *     且只在宿主首次挂载新内容时出现 1 次。
 *   ⇒ 结论：宿主每挂载一批新内容就要付 ~116ms 固定成本，**这笔成本与插件是否做动画无关**。
 *   动画帧之所以被拉长，是因为宿主在两次挂载之间把主线程占住了，rAF 回调被推迟；
 *   按时间算出的动画进度于是在下一帧一次跳过 1000~3000px。
 *
 * 策略（02-motion.md 早已写好的方案，本轮实施）：
 *   **瞬移到目标前 0.6 屏，只让最后 0.6 屏用动画滑入**。
 *   这样动画帧只覆盖一小段距离，即使中间被宿主推迟一两帧，单帧位移也远小于 800px 预算。
 *   跨数万像素的部分交给宿主一次性挂载（瞬移），不再逐帧驱动虚拟列表重挂载。
 */
export const SLIDE_TAIL_RATIO = 0.6
/** 触发「瞬移 + 滑入」的最小距离（px）。短于此距离直接滑，无需瞬移。 */
export const INSTANT_JUMP_MIN = 1200

export function scrollDurationFor(distance: number): number {
  const raw = Math.abs(distance) / SCROLL_PX_PER_MS
  return Math.min(SCROLL_MAX_MS, Math.max(SCROLL_MIN_MS, raw))
}
/**
 * 缓动曲线：Chrome 原生 scroll smooth 的**实测采样**（不是猜的 easeInOutCubic）。
 *
 * 2026-10-26 从 ZCode 容器采到 Chrome 原生 smooth 的 21 点归一化曲线：
 *   [0, .011, .061, .204, .471, .652, .761, .834, .885, .923, .950, .970, .984, .993, .998, 1, 1, ...]
 * 形态是**非对称 ease-out**：前 20% 时间走完 47%，后 40% 时间只走最后 1.6%。
 * 而我原来的 easeInOutCubic 是对称的（t=.2 时只走到 .03），所以起步偏慢、后段偏快，
 * 主观上"不够顺"。
 *
 * 实现：查表 + 线性插值，误差 <0.005（远小于 21 点采样间隔带来的不确定度）。
 */
export const CHROME_SMOOTH_CURVE: readonly number[] = [
  0, 0.011, 0.061, 0.204, 0.471, 0.652, 0.761, 0.834, 0.885, 0.923, 0.950,
  0.970, 0.984, 0.993, 0.998, 1, 1,
]
export function chromeSmoothEase(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const scale = t * (CHROME_SMOOTH_CURVE.length - 1)
  const index = Math.floor(scale)
  const frac = scale - index
  const a = CHROME_SMOOTH_CURVE[index] ?? 0
  const b = CHROME_SMOOTH_CURVE[index + 1] ?? 1
  return a + (b - a) * frac
}

export interface ScrollAnim { frame: number }
export const scrollAnims = new WeakMap<HTMLElement, ScrollAnim>()

export function conversationScroller(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-conversation-scroll]')
}

export function animateScroll(scroller: HTMLElement, to: number): void {
  const running = scrollAnims.get(scroller)
  if (running !== undefined) cancelAnimationFrame(running.frame)
  /*
   * G1（04-open-gaps）：reduced-motion 下点击必须瞬跳。
   * ZCode 语义是 `c ? 'auto' : 'smooth'`（c = prefersReducedMotion），
   * 即**在 JS 入口分支**，不是靠 CSS transition:none —— CSS 管不到 JS 驱动的滚动动画。
   * 判定：命中时直接赋值 scrollTop，不排 rAF。
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scroller.scrollTop = to
    scrollAnims.delete(scroller)
    return
  }
  /*
   * TCP-01：长距离时先瞬移到「目标前 0.6 屏」，只让尾段走动画。
   *
   * 关键：瞬移会让宿主**同步**挂载一大批新内容，实测这一步就要 342ms。
   * 如果不给它留时间就直接起动画，动画前几帧会被这段挂载占住主线程而互相拖累
   * （实测表现为 dy=889px/142ms、dy=3px/183ms 这种「顿一下窜一下」）。
   * 所以瞬移后**先让两帧给宿主**（双 rAF），再开始计时与缓动。
   */
  const dist = Math.abs(to - scroller.scrollTop)
  const needsJump = dist > INSTANT_JUMP_MIN
  /** 瞬移后应有的位置，作为「等待窗口内是否被别人改过」的基线。 */
  let jumpBase = scroller.scrollTop
  if (needsJump) {
    const tail = Math.max(SCROLL_MIN_MS * SCROLL_PX_PER_MS, scroller.clientHeight * SLIDE_TAIL_RATIO)
    scroller.scrollTop = to - Math.sign(to - scroller.scrollTop) * tail
    jumpBase = scroller.scrollTop
  }
  if (needsJump) {
    const anim: ScrollAnim = { frame: 0 }
    scrollAnims.set(scroller, anim)
    /*
     * TCP-02（2026-10-27 第 26 轮评审指出）：双 rAF 形成了两个帧的**等待窗口**。
     * 若宿主在这段窗口里写了一次 scrollTop（流式跟随底部每来一批内容就写一次），
     * 旧实现会在 slideTail 入口直接把这个新位置当成起点，接着从底部滑回目标刻度 ——
     * 用户看到的是「点了标签，视图自己往回拽一万多像素」（实测点击后 60ms 拉底 → 停在 54780，距底 14862px）。
     * 所以把瞬移基线一并传下去，让「等待窗口内的外部写入」与「动画中的外部写入」共用同一套让位逻辑。
     */
    anim.frame = requestAnimationFrame(() => {
      anim.frame = requestAnimationFrame(() => { slideTail(scroller, to, anim, jumpBase) })
    })
    return
  }
  const anim: ScrollAnim = { frame: 0 }
  scrollAnims.set(scroller, anim)
  slideTail(scroller, to, anim, jumpBase)
}

/** 从当前 scrollTop 平滑滑到 to（尾段滑入 / 短距离直接滑共用）。 */
export function slideTail(scroller: HTMLElement, to: number, anim: ScrollAnim, jumpBase: number): void {
  /*
   * TCP-02：入口处先比对一次基线 —— 覆盖「瞬移后到滑入开始前」那段等待窗口。
   * 若这段窗口里宿主已经改过位置（跟随底部），本次动画直接作废，
   * 否则会把宿主刚拉到的底部当成起点、往回滑一大段。
   */
  if (Math.abs(scroller.scrollTop - jumpBase) > 2) {
    scrollAnims.delete(scroller)
    return
  }
  const from = scroller.scrollTop
  const duration = scrollDurationFor(to - from)
  const start = performance.now()
  /** 上一帧我们写进去的值，用于分辨「这一帧的 scrollTop 是不是别人改的」。 */
  let expected = from
  const step = (): void => {
    /*
     * 互扰防护（2026-10-27 TCP-01 修复中实测发现）：
     * 动画进行中若宿主把视图拉走（流式输出「跟随底部」、用户手动滚动、宿主 ChatViewport.write），
     * 插件若无条件继续写 scrollTop，就会把用户/宿主的滚动画回去——
     * 实测：宿主拉到 67923 后插件仍写了 8 帧，最终停在 15555，离底部差 5 万像素。
     * 所以每帧先比对：当前 scrollTop 与我们上一帧写入的值差超过 2px，说明被别人接管 → 立刻让位。
     */
    if (Math.abs(scroller.scrollTop - expected) > 2) {
      scrollAnims.delete(scroller)
      return
    }
    const progress = Math.min(1, (performance.now() - start) / duration)
    expected = from + (to - from) * chromeSmoothEase(progress)
    scroller.scrollTop = expected
    if (progress < 1) {
      anim.frame = requestAnimationFrame(step)
    } else {
      scroller.scrollTop = to
      scrollAnims.delete(scroller)
    }
  }
  anim.frame = requestAnimationFrame(step)
}
