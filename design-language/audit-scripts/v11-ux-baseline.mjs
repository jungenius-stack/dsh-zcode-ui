// UX 流畅度基线：对若干交互录制帧间隔 + 长任务（只读，不写业务数据）
const list = await (await fetch('http://127.0.0.1:9223/json/list')).json()
const p = list.find(x => x.type === 'page')
const ws = new WebSocket(p.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const call = (m, par = {}) => new Promise(res => { const i = ++id; const h = ev => { const d = JSON.parse(ev.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: i, method: m, params: par })) })
const evl = async e => { const r = await call('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { err: JSON.stringify(r.exceptionDetails).slice(0, 300) }; return r.result.value }
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 等待插件就绪
for (let i = 0; i < 24; i++) { if (await evl(`!!document.querySelector('[data-dcu-codex-sidebar-initialized]')`)) break; await sleep(500) }

await evl(`(() => {
  window.__ux = []
  window.__long = []
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }) }).observe({ entryTypes: ['longtask'] }) } catch {}
  return 1
})()`)

async function scenario(name, action, ms = 1200) {
  await evl(`(() => { window.__ux = []; window.__long = []; window.__t0 = performance.now(); window.__raf = []; const loop = (t) => { window.__raf.push(t); if (performance.now() - window.__t0 < ${ms}) requestAnimationFrame(loop) }; requestAnimationFrame(loop); return 1 })()`)
  await action()
  await sleep(ms + 150)
  const r = await evl(`(() => {
    const d = []; for (let i = 1; i < window.__raf.length; i++) d.push(Math.round((window.__raf[i] - window.__raf[i-1]) * 10) / 10)
    d.sort((a,b)=>a-b)
    const q = f => d.length ? d[Math.min(d.length-1, Math.floor(d.length*f))] : null
    return { frames: d.length, p50: q(.5), p95: q(.95), max: d.length ? d[d.length-1] : null,
      over33: d.filter(x => x > 33.4).length, over50: d.filter(x => x > 50).length,
      longTasks: window.__long.length, longTotal: window.__long.reduce((s,x)=>s+x.dur,0), longMax: window.__long.reduce((m,x)=>Math.max(m,x.dur),0) }
  })()`)
  return { name, ...r }
}

const click = async (x, y) => { for (const t of ['mousePressed','mouseReleased']) { await call('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); await sleep(50) } }

const results = []

// 1) 侧栏收起 / 展开
const toggle = () => evl(`(() => { const b=[...document.querySelectorAll('button')].find(e=>{const r=e.getBoundingClientRect(); return r.width>0&&/(展开|收缩)侧边栏/.test(e.getAttribute('aria-label')||'')}); if(!b) return null; const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)} })()`)
let t1 = await toggle()
results.push(await scenario('sidebar-collapse', async () => { if (t1) await click(t1.x, t1.y) }))
await sleep(500)
let t2 = await toggle()
results.push(await scenario('sidebar-expand', async () => { if (t2) await click(t2.x, t2.y) }))
await sleep(600)

// 2) 会话区滚动（连续滚轮）
results.push(await scenario('conv-scroll', async () => {
  for (let i = 0; i < 24; i++) {
    await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 800, y: 500, deltaX: 0, deltaY: i < 12 ? 120 : -120, modifiers: 0 })
    await sleep(16)
  }
}, 1400))

// 3) 轮次导航 hover 波
results.push(await scenario('rail-hover', async () => {
  const box = await evl(`(() => { const n=document.querySelector('nav[aria-label="轮次导航"]'); if(!n) return null; const r=n.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height} })()`)
  if (box) for (let i = 0; i < 10; i++) {
    const y = box.y + 20 + (box.h - 40) * (i / 9)
    await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(box.x + box.w / 2), y: Math.round(y) })
    await sleep(45)
  }
}, 1200))

// 4) 搜索浮层开合
results.push(await scenario('search-open', async () => {
  for (const type of ['rawKeyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 40, modifiers: 4 })
  await sleep(400)
  for (const type of ['rawKeyDown','keyUp']) await call('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 53 })
}, 1200))

// 5) 静置（空闲基线，看有无常驻动画/定时器）
results.push(await scenario('idle', async () => {}, 1200))

console.log(JSON.stringify(results, null, 1))
ws.close()
