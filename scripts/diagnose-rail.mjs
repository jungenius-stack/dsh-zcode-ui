/**
 * 轮次导航 / 会话行「横线」诊断器（可粘贴到浏览器控制台运行）。
 *
 * 用法：在 App 里按 ⌥⌘I 打开 DevTools（若可用），或把本文件内容粘进 Console 执行。
 * 它会：
 *   1. 列出页面上所有轮次导航（官方 + 自绘）及其坐标；
 *   2. 找出每一条可见的「细长横线」元素（宽 3-200、高 0.5-8），报告归属与来源；
 *   3. 用红色描边把结果标在页面上，持续 10 秒，便于截图。
 */
(() => {
  const out = []
  const rails = []
  for (const n of document.querySelectorAll('nav')) {
    const idx = n.querySelectorAll('button[data-index]')
    if (idx.length === 0 && !n.classList.contains('dcu-turn-navigator')) continue
    const b = n.getBoundingClientRect()
    rails.push({
      cls: String(n.className).slice(0, 40),
      marked: n.hasAttribute('data-dcu-official-turn-navigator'),
      marks: idx.length,
      x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
      display: getComputedStyle(n).display,
    })
  }
  for (const el of document.querySelectorAll('body *')) {
    const b = el.getBoundingClientRect()
    if (b.width < 3 || b.width > 200) continue
    if (b.height <= 0 || b.height > 8) continue
    if (b.width <= b.height * 1.5) continue
    let op = 1, vis = 'visible', disp = 'block'
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p)
      op *= parseFloat(s.opacity || '1')
      if (s.visibility === 'hidden') vis = 'hidden'
      if (s.display === 'none') disp = 'none'
    }
    if (vis === 'hidden' || disp === 'none' || op < 0.05) continue
    out.push({
      tag: el.tagName,
      cls: String(el.className?.baseVal ?? el.className).slice(0, 34),
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10,
      op: Math.round(op * 100) / 100,
      bg: getComputedStyle(el).backgroundColor,
      inRow: !!el.closest('.dcu-wb-session'),
      inRail: !!el.closest('nav'),
      parent: String(el.parentElement?.className?.baseVal ?? el.parentElement?.className).slice(0, 30),
    })
    el.style.outline = '2px solid red'
    el.style.outlineOffset = '1px'
  }
  console.log('%c[RAILS]', 'color:blue;font-weight:bold', rails)
  console.log('%c[THIN LINES]', 'color:red;font-weight:bold', out)
  console.table(out)
  setTimeout(() => {
    for (const el of document.querySelectorAll('body *')) el.style.outline = ''
  }, 10000)
  return { rails, thin: out }
})()
