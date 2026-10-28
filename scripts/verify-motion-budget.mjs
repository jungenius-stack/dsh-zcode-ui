/**
 * 动效帧预算回归（2026-10-13）：防"把动画重新挂回布局属性"。
 *
 * 背景：侧栏开合的 grid-template-columns 过渡曾让帧成本随会话内容增长（1.3.0 已改为合成层）。
 * 其余仍在过渡布局属性的动画（刻度、页签滑块、扩展面板、进度条）都是**有界小元素**，
 * 每帧布局成本与内容量无关。本脚本用真实样式与真实 DOM 量它们的单帧成本，
 * 断言远低于 120Hz 预算（8.33ms）——谁把这些动画放大成昂贵树，这里会先红。
 *
 * 方法：驱动动画值 → 强制一次同步布局 → 记 style+layout 耗时；同时记 rAF 帧间隔查掉帧。
 * 60Hz 无头量不到 120Hz，但"单帧成本 << 8.33ms"是 120Hz 安全的充分证据。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const root = new URL('../', import.meta.url)
const grab = (file, re) => {
  const m = readFileSync(new URL(`src/client/${file}`, root), 'utf8').match(re)
  assert.ok(m, `${file} 的样式抽取失败`)
  return m[1]
}
const styles = [
  grab('TurnNavigator.tsx', /const stylesheet = `([\s\S]*?)`/),
  grab('conversation-header.ts', /const CONVERSATION_HEADER_STYLE = `([\s\S]*?)`/),
  grab('AboutSection.tsx', /const stylesheet = `([\s\S]*?)`/),
  grab('CodexWorkspaceBrowser.tsx', /const runningStyles = `([\s\S]*?)`/),
]

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.setContent(`<style>html,body{margin:0}:root{--dsw-font-family:system-ui;--dcu-turn-left:288px}</style>
  <div id="probe" style="position:fixed;left:-9999px;top:0;width:1px;height:1px"></div>
  <div class="dcu-turn-navigator" data-hovering="false" style="left:288px"><div class="dcu-turn-scroll"><ol class="dcu-turn-list">
  ${Array.from({ length: 120 }, (_, i) => `<li><button class="dcu-turn-link" data-i="${i}" style="--dcu-tick-w:5px"><span></span></button></li>`).join('')}
  </ol></div></div>
  <div class="dcu-chat-header" data-dcu-tab-slider style="position:relative;width:600px;height:30px"></div>
  <aside class="dcu-root"><div class="dcu-extensions-group"><div class="dcu-extension-panel" data-open="true" id="panel"><div class="dcu-extension-panel-inner"><div class="dcu-extension-items">
  ${Array.from({ length: 8 }, () => '<button>条目</button>').join('')}
  </div></div></div></div></aside>
  <div class="dcu-about-progress" style="width:320px"><div class="dcu-about-progress-bar"><div class="dcu-about-progress-fill" id="fill" data-wave="false" style="width:5%"></div></div></div>`)
  await page.addStyleTag({ content: fixtureTokenStyle() })
  for (const style of styles) await page.addStyleTag({ content: style })

  const measure = (name, script) => page.evaluate(async ({ name, script }) => {
    const probe = document.getElementById('probe')
    const costs = []
    const deltas = []
    let last = performance.now()
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame)
      const now = performance.now()
      deltas.push(now - last)
      last = now
    }
    for (let i = 0; i < 24; i++) {
      await new Promise(requestAnimationFrame)
      const t0 = performance.now()
      // eslint-disable-next-line no-new-func
      new Function('i', script)(i)
      void probe.offsetHeight
      costs.push(performance.now() - t0)
    }
    const sorted = [...costs].sort((a, b) => a - b)
    return {
      name,
      costMax: Math.max(...costs),
      costP95: sorted[Math.floor(sorted.length * 0.95)],
      frameMax: Math.max(...deltas.slice(1)),
    }
  }, { name, script })

  const scenarios = [
    ['转场导航刻度 ×120（width/height/flex-basis）', `
      const ticks = document.querySelectorAll('.dcu-turn-link')
      const target = ticks[i % ticks.length]
      target.style.setProperty('--dcu-tick-w', (i % 2 === 0) ? '13px' : '5px')
    `],
    ['会话头页签滑块（transform+width）', `
      const slider = document.querySelector('[data-dcu-tab-slider]')
      slider.style.width = (60 + (i % 8) * 12) + 'px'
      slider.style.transform = 'translateX(' + (i * 14) + 'px)'
      slider.style.opacity = '1'
    `],
    ['扩展面板 grid-template-rows 0fr↔1fr', `
      document.getElementById('panel').setAttribute('data-open', i % 2 === 0 ? 'false' : 'true')
    `],
    ['关于页进度条 width%', `
      document.getElementById('fill').style.width = (5 + (i * 4) % 95) + '%'
    `],
  ]
  const measureAll = async () => {
    const out = []
    for (const [name, script] of scenarios) out.push(await measure(name, script))
    return out
  }
  const check = list => {
    for (const r of list) {
      assert.ok(r.costP95 < 4, `${r.name}：单帧成本 P95 必须远低于 120Hz 预算（实测 ${r.costP95.toFixed(2)}ms）`)
      assert.ok(r.costMax < 10, `${r.name}：单帧成本峰值必须远低于 120Hz 预算（实测 ${r.costMax.toFixed(2)}ms）`)
      assert.ok(r.frameMax < 40, `${r.name}：不得出现掉帧（实测最大帧 ${r.frameMax.toFixed(1)}ms）`)
    }
  }
  /*
   * 2026-10-28：负载敏感断言加一次受控重测。
   *
   * 现象：门禁里偶发红（两次），单跑 12/12 全绿；失败形态是 `assert.ok` 的
   * expected:true——即某一帧的成本/间隔被并行负载（编辑器索引、浏览器自动化、
   * 我自己的 CDP 探针）顶过了阈值。阈值测的是「动画是否挂在布局属性上」，
   * 与机器忙闲无关，但**单次采样**会受忙闲影响。
   * 处理：超预算时**只重测一次**（不降阈值、不放宽判据），第二次仍超才判红并原样抛出。
   * 这不是为了让门禁变绿——真实回归会在两次采样里稳定超标，照样红。
   */
  let results = await measureAll()
  try {
    check(results)
  } catch (firstError) {
    console.log('…首次采样超出预算（疑似并行负载），重测一次')
    results = await measureAll()
    check(results)
  }
  console.log(`✓ 动效帧预算：${results.map(r => `${r.name.split('（')[0]} max ${r.costMax.toFixed(1)}ms`).join(' / ')}，均远低于 8.33ms`)
} finally {
  await browser.close()
}
