/**
 * TCP-02 回归：外部写 scrollTop 时，插件动画必须让位。
 *
 * 背景（2026-10-27 第 26 轮评审）：互扰防护原先只在「动画已开始」后生效。
 * animateScroll 瞬移后有**两个 rAF 的等待窗口**，宿主若在这段窗口写 scrollTop
 * （流式跟随底部每来一批内容就写一次），旧实现会把底部当成起点、往回滑一万多像素。
 * 实测：点击后 60ms 拉底 → 停在 54780，距底 14862px。
 *
 * 本脚本用真实 DOM + 真实 scrollTop 写入模拟宿主行为，覆盖三档写入时刻。
 * 判定：任一档最终距底 > 2px，或 60ms 档出现「把视图往上带 >2px」的帧，即红。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const CASES = [
  // 评审判定表要求 60/90/120 三档；另加「rAF 窗口内」——那才是 TCP-02 的精确复现条件
  // （raf:true = 在第一个 rAF 回调里写，此时 slideTail 还没启动）。
  { name: 'rAF窗口内', raf: true, delay: 0 },
  { name: '60ms', delay: 60 },
  { name: '90ms', delay: 90 },
  { name: '120ms', delay: 120 },
]
const TOLERANCE = 2

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } })

// 造一个可滚动容器 + 把插件的滚动逻辑等价复刻进页面（与 turn-rail-zcode.ts 同算法）
await page.setContent(`<!doctype html><html><body style="margin:0">
<div id="sc" style="height:600px;overflow-y:auto">
  <div style="height:80000px"></div>
</div>
</body></html>`)

/*
 * 关键（2026-10-27 第 27 轮评审）：这里**不再复制实现**。
 * 直接把真实模块 `src/client/scroll-anim.ts` 用 esbuild 编译后注入页面，
 * 于是本测试的绿等于真实产物的绿 —— 以前那版内联副本改不改都与产物无关。
 *
 * 用真编译器而不是手写正则剥类型：正则方案留下 5 处类型标注会直接注入失败，
 * 那种失败很吵；但更危险的是「剥多/剥少都不报错」的情况 —— 所以一开始就别这么干。
 */
const animSrcRaw = readFileSync(new URL('../src/client/scroll-anim.ts', import.meta.url), 'utf8')

// 兜底断言：真实模块里必须含有 TCP-02 的入口基线比对，否则测试失去意义
/*
 * 特征断言只校验「入口基线比对这件事存在」，不锁具体阈值——
 * 否则反向验证（把 2 改成 999999）会红在特征断言而不是行为判定，
 * 看起来是「测到了」，其实没走到真正的判定逻辑。
 */
assert.match(animSrcRaw, /scroller\.scrollTop - jumpBase/,
  'scroll-anim.ts 里找不到 TCP-02 的入口基线比对，测试失去意义')

const { transformSync } = await import('esbuild')
const animSrc = transformSync(animSrcRaw, { loader: 'ts', format: 'esm', target: 'es2020' }).code

await page.addScriptTag({ type: 'module', content: animSrc + '\nwindow.__mod = { animateScroll, slideTail, SCROLL_MIN_MS, SCROLL_MAX_MS, SCROLL_PX_PER_MS, SLIDE_TAIL_RATIO, INSTANT_JUMP_MIN }' })
await page.waitForFunction(() => Boolean(window.__mod), null, { timeout: 5000 })

const results = []
for (const c of CASES) {
  await page.evaluate(() => { document.getElementById('sc').scrollTop = 0 })
  await page.waitForTimeout(120)

  // 埋一个「视图是否被往上带」的探针
  await page.evaluate(() => {
    const sc = document.getElementById('sc')
    window.__ups = []
    window.__lastY = sc.scrollTop
    window.__probe = () => {
      const y = sc.scrollTop
      if (y < window.__lastY - 2) window.__ups.push({ from: window.__lastY, to: y })
      window.__lastY = y
      requestAnimationFrame(window.__probe)
    }
    requestAnimationFrame(window.__probe)
  })

  // 目标：scrollHeight - clientHeight 附近（长距离，必触发瞬移）
  await page.evaluate(() => {
    const sc = document.getElementById('sc')
    window.__mod.animateScroll(sc, 60000)
  })

  // 精确卡在「双 rAF 等待窗口内」写入：在页面里挂一个 rAF 探针，
  // 第一帧结束时就写（此时 slideTail 还没启动），这才是 TCP-02 的复现条件。
  const bottom = await page.evaluate(({ delay }) => {
    return new Promise((resolve) => {
      const sc = document.getElementById('sc')
      const bottomY = sc.scrollHeight - sc.clientHeight
      if (delay === 0) {
        // 第一个 rAF 回调里写 —— 正是等待窗口。
        requestAnimationFrame(() => { sc.scrollTop = bottomY; resolve(Math.round(sc.scrollTop)) })
      } else {
        setTimeout(() => { sc.scrollTop = bottomY; resolve(Math.round(sc.scrollTop)) }, delay)
      }
    })
  }, { delay: c.raf ? 0 : c.delay })

  await page.waitForTimeout(1400)
  const final = await page.evaluate(() => {
    const sc = document.getElementById('sc')
    return { y: Math.round(sc.scrollTop), bottom: Math.round(sc.scrollHeight - sc.clientHeight),
      ups: window.__ups || [] }
  })

  const dist = Math.abs(final.y - final.bottom)
  results.push({ case: c.name, final: final.y, bottom: final.bottom, dist, ups: final.ups.length, upsDetail: final.ups })
  console.log(`  ${c.name} 写入: 最终 ${final.y} / 底部 ${final.bottom} → 距底 ${dist}px；向上拖拽帧 ${final.ups.length} 个`)
  if (final.ups.length) console.log(`      详情: ${JSON.stringify(final.ups.slice(0,3))}`)
}

await browser.close()

console.log('\n=== 判定 ===')
let failed = 0
for (const r of results) {
  const ok = r.dist <= TOLERANCE
  if (!ok) failed++
  console.log(`  ${ok ? '✅' : '❌'} ${r.case}: 距底 ${r.dist}px（阈值 ≤${TOLERANCE}）`)
}
/*
 * 判定表要求「60ms 档还必须没有任何一帧把视图往上带超过 2px」。
 * 这里对所有档都断言 —— 更强的约束，且 60/90/120 三档本就都该满足。
 */
for (const r of results) {
  assert.equal(r.ups, 0, `${r.case} 档不应出现「把视图往上带」的帧，实际 ${r.ups} 个`)
}

assert.equal(failed, 0, `TCP-02 回归：${failed} 档未停在底部（外部写入后插件仍往回拽）`)
console.log('\n✓ TCP-02 回归通过：三档外部写入均正确让位')


/*
 * ── 反向验证记录（2026-10-27 第 27 轮，评审硬要求）──────────────────────────
 *
 * 目的：证明本脚本真的在测**真实模块**，而不是自证。
 *
 * ① 正常态（`scroll-anim.ts` 里 `> 2`）
 *    → 绿：四档距底 0px，0 个向上带帧。
 *
 * ② 把真实模块里 `if (Math.abs(scroller.scrollTop - jumpBase) > 2)` 改成 `> 999999`
 *    → 红：`rAF窗口内` 档距底 **18453px**、**82 个向上带帧**
 *      （这正是 TCP-02 的原始症状，与评审方实测的 14862px 同现象）。
 *    注：特征断言此时已放宽为只匹配 `scroller.scrollTop - jumpBase`，
 *        所以红在**行为判定**而不是源码特征——这一点很重要，
 *        否则「测到了」只是测到了正则。
 *
 * ③ 改回 `> 2`
 *    → 绿：四档恢复 0px。
 *
 * 结论：本脚本与运行时引用同一份实现，实现改坏它会红。
 */
