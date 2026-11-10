/**
 * 25 个 MutationObserver 在真实规模 DOM 上的推流开销。
 *
 * ## 为什么重测（已有 `perf-observer.mjs`）
 *
 * 旧脚本模拟「9 个 observer，回调只累加计数 + 读一个属性」——那是**空回调**成本，
 * 只能证明「observer 本身不贵」。真实插件的回调里普遍有 `querySelector` /
 * `querySelectorAll` / `getBoundingClientRect` / 状态比较，成本量级完全不同。
 *
 * 本脚本按 `docs/KNOWN-ISSUES.md` §50.1 的真实结构造 DOM，然后：
 *   A 档：挂 25 个"空回调" observer（对齐旧脚本口径）
 *   B 档：挂 25 个"真回调" observer（每个回调做一次真实规模的查询）
 * 对比两者，看「回调内容」相对「observer 数量」各占多少。
 *
 * 用法：node scripts/perf-observer-real.mjs
 */
import { chromium } from 'playwright'

const b = await chromium.launch({ headless: true })

const BUILD = () => {
  document.documentElement.setAttribute('data-platform', 'darwin')
  document.body.setAttribute('data-ds-dark-theme', '')
  const sidebar = document.createElement('div')
  sidebar.className = 'dcu-root'
  sidebar.innerHTML = '<div class="dcu-expanded-shell"><div class="dcu-workspaces">' +
    Array.from({ length: 30 }, () => '<div class="dcu-wb-session"><span class="dcu-wb-session-time">t</span></div>').join('') +
    '</div><div class="dcu-foot"></div></div>'
  document.body.appendChild(sidebar)
  const scroll = document.createElement('div')
  scroll.setAttribute('data-conversation-scroll', '')
  const session = document.createElement('div')
  session.setAttribute('data-slot', 'conversation.session')
  session.style.display = 'contents'
  scroll.appendChild(session)
  let cursor = session
  for (const n of ['viewArea','view','frame','root','inner','column']) {
    const d = document.createElement('div'); d.className = n; cursor.appendChild(d); cursor = d
  }
  const flow = document.createElement('div'); flow.className = 'chat-flow'; flow.id = 'flow'; cursor.appendChild(flow)
  for (let i = 0; i < 500; i++) {
    const node = document.createElement('div'); node.className = 'chat-node'
    for (let k = 0; k < 30; k++) node.appendChild(document.createElement('span'))
    flow.appendChild(node)
  }
  document.body.appendChild(scroll)
  return document.getElementsByTagName('*').length
}

async function run(observeCount, realWork) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  await p.setContent('<!doctype html><html><body></body></html>')
  const nodes = await p.evaluate(BUILD)

  const res = await p.evaluate(({ count, realWork }) => {
    let fired = 0
    let work = 0
    const observers = []
    for (let i = 0; i < count; i++) {
      const o = new MutationObserver(() => {
        fired++
        if (!realWork) return
        // 真实插件回调的典型操作：定位一个子树 + 读它的结构/布局
        const session = document.querySelector('[data-slot="conversation.session"]')
        if (session !== null) {
          work += session.getElementsByTagName('*').length
          const flow = document.querySelector('.chat-flow')
          if (flow !== null) work += flow.children.length
        }
      })
      o.observe(document.body, { childList: true, subtree: true })
      observers.push(o)
    }
    return new Promise((resolve) => {
      const flow = document.getElementById('flow')
      const N = 200
      let i = 0
      const tick = () => {
        for (let k = 0; k < 10 && i < N; k++, i++) {
          const d = document.createElement('div'); d.className = 'chat-node'
          d.textContent = 'tok'
          flow.appendChild(d)
        }
        if (i < N) requestAnimationFrame(tick)
        else setTimeout(() => {
          observers.forEach(o => o.disconnect())
          resolve({ fired, work, ok: true })
        }, 50)
      }
      requestAnimationFrame(tick)
    })
  }, { count: observeCount, realWork })

  // 用 CDP 量脚本总耗时
  const cdp = await p.context().newCDPSession(p)
  await cdp.send('Performance.enable')
  const { metrics } = await cdp.send('Performance.getMetrics')
  const script = metrics.find(m => m.name === 'ScriptDuration')?.value ?? 0
  await p.close()
  return { nodes, ...res, script }
}

console.log('DOM ~26000 节点（500 条消息），推流 200 次追加')
console.log('')
console.log('observer数  回调内容    触发次数   查询累计')
for (const [n, real] of [[0, false], [25, false], [25, true]]) {
  const r = await run(n, real)
  console.log(`${String(n).padEnd(11)} ${(real ? '真查询' : '空回调').padEnd(11)} ${String(r.fired).padEnd(10)} ${r.work}`)
}
await b.close()
