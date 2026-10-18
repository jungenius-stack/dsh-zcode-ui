/**
 * content-visibility 在真实宿主中的效果与风险验证。
 *
 * ## 背景（§37 实测）
 *
 * 真实宿主注入 540 个渲染单元时，打字成本 5.3ms；加
 * `content-visibility:auto + contain-intrinsic-size` 后降到 1.1ms（4.8×）。
 *
 * ## 本脚本验证的是「能不能安全地用」
 *
 * §30.4 的教训：`content-visibility` 会让 scrollHeight 虚增（合成页实测 +77%，
 * 加精确 intrinsic-size 后仍 -23%），因为滚动条出现改变换行宽度、形成反馈回路。
 *
 * 所以必须同时验证：
 *   1. 收益（打字成本下降）
 *   2. **滚动高度准确性**（scrollHeight 偏差是否可接受）
 *   3. **滚动位置准确性**（滚到指定内容能不能对上）
 *
 * 用法：需要先起隔离宿主（见 §37.7），本脚本用合成容器做前置筛查。
 */
import { chromium } from 'playwright'

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })

const units = n => {
  let h = ''
  const TEXT = '这是一段模拟真实消息内容的文本，长度接近真实工具输出。'.repeat(4)
  for (let i = 0; i < n; i++) {
    h += `<div class="unit" data-i="${i}"><div class="meta">单元 ${i}</div><div class="body">${TEXT}</div></div>`
  }
  return h
}

console.log('单元  scrollHeight偏差  scrollHeight偏差(稳定滚动条)  打字ms  打字ms(稳定滚动条)')
for (const n of [200, 540, 1000]) {
  const results = []
  for (const stableGutter of [false, true]) {
    await p.setContent(`<style>html,body{margin:0;height:100%}
      #sc{height:600px;overflow-y:auto;${stableGutter ? 'scrollbar-gutter:stable;' : ''}}
      .unit{margin:0 0 8px;padding:4px 8px;border-left:2px solid #ddd}
      .meta{font-size:12px;color:#888}
      .body{line-height:1.6}
      .cv .unit{content-visibility:auto;contain-intrinsic-size:auto 90px}</style>
      <div id="sc">${units(n)}</div><div id="ed" contenteditable="true"></div>`)
    await p.waitForTimeout(200)
    const r = await p.evaluate(async ({ n, stableGutter }) => {
      const sc = document.getElementById('sc')
      const ed = document.getElementById('ed')
      const h0 = sc.scrollHeight
      // 记录第 n-1 个单元的 offsetTop（应等于 scrollHeight - 高度）
      const lastEl = sc.querySelector(`[data-i="${n - 1}"]`)
      const topBefore = lastEl.offsetTop

      document.body.classList.add('cv')
      await new Promise(r => setTimeout(r, 300))
      const h1 = sc.scrollHeight

      const measure = () => { const t0 = performance.now(); ed.textContent = 'x' + Math.random(); void document.body.offsetHeight; return performance.now() - t0 }
      const s = []; for (let i = 0; i < 15; i++) s.push(measure())
      s.sort((a, b) => a - b)
      const ms = s[7]

      // 滚到对应位置，看落点是否正确
      sc.scrollTop = 50000
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const landedTop = sc.scrollTop

      document.body.classList.remove('cv')
      await new Promise(r => setTimeout(r, 200))

      return { h0, h1, topBefore, landedTop, ms }
    }, { n, stableGutter })
    results.push({ stableGutter, ...r })
  }
  const [noG, withG] = results
  console.log([
    String(n).padEnd(5),
    `${(((noG.h1 - noG.h0) / noG.h0) * 100).toFixed(1)}%`.padEnd(19),
    `${(((withG.h1 - withG.h0) / withG.h0) * 100).toFixed(1)}%`.padEnd(30),
    noG.ms.toFixed(2).padEnd(8),
    withG.ms.toFixed(2),
  ].join(''))
}
await b.close()
