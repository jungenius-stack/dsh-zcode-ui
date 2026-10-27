// 用真实浏览器算 color-mix 合成色（一次性工具，不参与门禁）
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage()
for (const [label, bg, mix] of [
  ['深色', '#161616', 'color-mix(in oklab,oklch(87% 0 0) 60%,transparent)'],
  ['浅色', '#f0f0f0', 'color-mix(in oklab,oklch(37.1% 0 0) 65%,transparent)'],
]) {
  await p.setContent(`<div id="wrap" style="background:${bg};padding:20px"><span id="t" style="color:${mix};font:14px sans-serif">X</span></div>`)
  const c = await p.evaluate(() => getComputedStyle(document.getElementById('t')).color)
  const rgb = c.match(/[\d.]+/g).map(Number)
  console.log(`${label}: ${c} → rgb(${rgb.slice(0,3).map(Math.round).join(',')})`)
}
await b.close()
