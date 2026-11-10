/**
 * `virtual-skip` 的探测器与空转成本（复现 §67 的结论）。
 *
 * 结构逐层取自 docs/KNOWN-ISSUES.md §50.1 的**真实会话实测**
 * （23231 节点 / `conversation.session` 直接子元素 2 / `chat.flow` 直接子元素 19），
 * 造一个 22850 节点的页面，然后把 `src/client/virtual-skip.ts` 里的
 * `findMessageLayer` / `installIfNeeded` **逐字复制**过来跑。
 *
 * 它回答两个问题：
 *   1. 探测器在真实结构下返回什么？（答案：null —— 两道闸门同时关死）
 *   2. 空转贵不贵？（答案：0.0026ms/次 —— 不贵，Blink 缓存了节点数）
 *
 * ⚠️ 复制的函数与源码不是同一份。源码改了这里不会自动跟着变——
 * 这是有意的：本脚本是**一次性取证**，不是回归门禁。
 * 若将来修好探测器（按 §67.3 的判断不推荐），先更新这里的结构再复算。
 *
 * 用法：node scripts/perf-virtual-skip-idle.mjs
 */
import { chromium } from 'playwright'

const b = await chromium.launch({ headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })

const built = await p.evaluate(() => {
  const scrollBody = document.createElement('div')
  scrollBody.setAttribute('data-conversation-scroll', '')
  const session = document.createElement('div')
  session.setAttribute('data-slot', 'conversation.session')
  session.style.display = 'contents'
  scrollBody.appendChild(session)
  let cursor = session
  for (const n of ['viewArea', 'view', 'frame', 'root', 'inner', 'column']) {
    const d = document.createElement('div'); d.className = n; cursor.appendChild(d); cursor = d
  }
  const flow = document.createElement('div')
  flow.className = 'chat-flow'
  cursor.appendChild(flow)
  for (let i = 0; i < 19; i++) {
    const item = document.createElement('div'); flow.appendChild(item)
    const node = document.createElement('div'); item.appendChild(node)
    for (let j = 0; j < 60; j++) {
      const msg = document.createElement('div')
      for (let k = 0; k < 19; k++) msg.appendChild(document.createElement('span'))
      node.appendChild(msg)
    }
  }
  document.body.appendChild(scrollBody)
  return { total: document.getElementsByTagName('*').length }
})
console.log('构造节点总数:', built.total, '（真实会话 23231）\n')

const r = await p.evaluate(() => {
  const SESSION_SELECTOR = '[data-conversation-scroll] [data-slot="conversation.session"]'
  const UNIT_ATTR = 'data-dcu-viskip'
  const ACTIVATE_ABOVE_UNITS = 300
  let sink = 0

  function findMessageLayer(session) {
    let layer = session
    for (let depth = 0; depth < 4; depth++) {
      if (layer.children.length >= ACTIVATE_ABOVE_UNITS) return layer
      let next = null, bestCount = 0
      for (const child of layer.children) {
        if (child.children.length > bestCount) { bestCount = child.children.length; next = child }
      }
      if (next === null || bestCount === 0) return null
      layer = next
    }
    return layer.children.length >= ACTIVATE_ABOVE_UNITS ? layer : null
  }

  function uninstall() {
    const stale = document.getElementById('dsh-zcode-ui/virtual-skip.css')
    if (stale !== null) stale.remove()
    for (const el of document.querySelectorAll(`[${UNIT_ATTR}]`)) el.removeAttribute(UNIT_ATTR)
  }

  function installIfNeeded() {
    const session = document.querySelector(SESSION_SELECTOR)
    if (session === null) { uninstall(); return 0 }
    const n = session.getElementsByTagName('*').length
    if (n < ACTIVATE_ABOVE_UNITS) { uninstall(); return 1 }
    const layer = findMessageLayer(session)
    if (layer === null) { uninstall(); return 2 }
    sink += layer.children.length
    return 3
  }

  // 先确认返回路径
  const outcome = installIfNeeded()

  for (let i = 0; i < 20; i++) sink += installIfNeeded()
  const N = 2000

  const t0 = performance.now()
  for (let i = 0; i < N; i++) sink += installIfNeeded()
  const per = (performance.now() - t0) / N

  // 拆开量：单独跑 uninstall（它才是每次都被调用的那一段）
  const t1 = performance.now()
  for (let i = 0; i < N; i++) uninstall()
  const perUninstall = (performance.now() - t1) / N

  // 单独量 querySelectorAll 标记属性
  const t2 = performance.now()
  for (let i = 0; i < N; i++) sink += document.querySelectorAll(`[${UNIT_ATTR}]`).length
  const perQsa = (performance.now() - t2) / N

  return { outcome, per, perUninstall, perQsa, sink }
})

const path = ['session 为 null', '元素数 < 300', 'findMessageLayer 返回 null ← 空转', '真正激活'][r.outcome]
console.log('真实结构下的走法是:', path)
console.log('')
console.log('每次 installIfNeeded    : %s ms', r.per.toFixed(4))
console.log('  其中 uninstall()      : %s ms', r.perUninstall.toFixed(4))
console.log('    其中属性全查         : %s ms', r.perQsa.toFixed(4))
console.log('')
console.log('推算（子代理推流按 30 / 60 / 120 次 mutation/s）:')
for (const hz of [30, 60, 120]) {
  const ms = r.per * hz
  console.log(`  ${String(hz).padStart(3)}/s → ${ms.toFixed(2)} ms/s = 帧预算的 ${(ms / 16.7 * 100).toFixed(1)}%`)
}

await b.close()
