/**
 * 经典滚动条 / 1x DPR 条件下的 gutter 与边框实测（2026-11-10）。
 *
 * ## 为什么需要这个脚本
 * Windows 真机验证的链路当前断了（QEMU ARM 的 virtio-win 没有 arm64 目录，
 * 装不上网卡驱动 → VM 内装不了 DSH）。但这两处修复的**判据本身**可以在现有
 * DSH 里直接构造：
 *
 *   1. 经典滚动条：往页面注入一条 `::-webkit-scrollbar{width:17px}` 规则，
 *      滚动条就从覆盖式变成真占位——`offsetWidth-clientWidth` 变成 17，
 *      classic-scrollbar.ts 的探针会测到 >2 并写属性，CSS 降级随即生效。
 *   2. 1x DPR：`Emulation.setDeviceMetricsOverride` 的 deviceScaleFactor=1
 *      会让 `max-resolution:1.5dppx` 的 media query 命中。
 *
 * 要注意的是**注入规则只影响本次会话**，不改任何磁盘文件；脚本结束会移除。
 *
 * 用法：node scripts/probe-classic-scrollbar.mjs [--json]
 */
// Node ≥22 自带全局 WebSocket（无第三方依赖）。本仓没装 ws，别引入。
const { WebSocket } = globalThis
if (typeof WebSocket !== 'function') {
  console.error('需要 Node ≥22 的全局 WebSocket；当前 Node 版本过低。')
  process.exit(1)
}

const PORT = process.env.DCU_CDP_PORT ?? '9223'
const JSON_OUT = process.argv.includes('--json')

async function pickTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
  const list = await res.json()
  const page = list.find(t => t.type === 'page' && typeof t.webSocketDebuggerUrl === 'string')
  if (!page) throw new Error('没有可用的 page target')
  return page.webSocketDebuggerUrl
}

function connect(url) {
  const ws = new WebSocket(url)
  let id = 0
  const pending = new Map()
  // 原生 WebSocket 用 addEventListener（不是 ws 库的 .on）
  ws.addEventListener('message', event => {
    const msg = JSON.parse(typeof event.data === 'string' ? event.data : '')
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
  })
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(undefined), { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  return { ready, send, close: () => ws.close() }
}

async function evaluate(send, expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text ?? 'evaluate 出错')
  return r.result.value
}

const cdp = connect(await pickTarget())
await cdp.ready
const { send } = cdp
await send('Runtime.enable')
await send('Page.enable')

const report = {}

// ── 基线：当前（覆盖式滚动条 + Retina）──────────────────────────────────
report.baseline = await evaluate(send, `(() => {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;top:-9999px;left:0;width:100px;height:100px;overflow:scroll;visibility:hidden'
  document.body.appendChild(probe)
  const sbWidth = probe.offsetWidth - probe.clientWidth
  probe.remove()
  const card = document.querySelector('[data-conversation-scroll] [data-composer-card]')
  const scroll = document.querySelector('[data-conversation-scroll]')
  return {
    dpr: devicePixelRatio,
    scrollbarWidth: sbWidth,
    attr: document.documentElement.hasAttribute('data-dcu-classic-scrollbar'),
    gutter: scroll ? getComputedStyle(scroll).scrollbarGutter : null,
    cardBorderWidth: card ? getComputedStyle(card).borderTopWidth : null,
    scrollClientWidth: scroll ? scroll.clientWidth : null,
  }
})()`)

// ── 注入经典滚动条宽度 ────────────────────────────────────────────────
const INJECT_ID = 'dcu-probe-cls'
await evaluate(send, `(() => {
  let s = document.getElementById('${INJECT_ID}')
  if (!s) {
    s = document.createElement('style')
    s.id = '${INJECT_ID}'
    s.textContent = '::-webkit-scrollbar{width:17px}::-webkit-scrollbar-thumb{background:#888}'
    document.head.appendChild(s)
  }
  // 触发一次 resize，让观察器重测（它按帧合并）
  window.dispatchEvent(new Event('resize'))
  return true
})()`)
await new Promise(r => setTimeout(r, 400))

report.classic = await evaluate(send, `(() => {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;top:-9999px;left:0;width:100px;height:100px;overflow:scroll;visibility:hidden'
  document.body.appendChild(probe)
  const sbWidth = probe.offsetWidth - probe.clientWidth
  probe.remove()
  const scroll = document.querySelector('[data-conversation-scroll]')
  return {
    scrollbarWidth: sbWidth,
    attr: document.documentElement.hasAttribute('data-dcu-classic-scrollbar'),
    gutter: scroll ? getComputedStyle(scroll).scrollbarGutter : null,
    scrollClientWidth: scroll ? scroll.clientWidth : null,
  }
})()`)

// ── 1x DPR：半像素边框应补成 1px ────────────────────────────────────────
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})
await new Promise(r => setTimeout(r, 300))

report.dpr1 = await evaluate(send, `(() => {
  const card = document.querySelector('[data-conversation-scroll] [data-composer-card]')
  return {
    dpr: devicePixelRatio,
    matchesMedia: matchMedia('(max-resolution:1.5dppx)').matches,
    cardBorderWidth: card ? getComputedStyle(card).borderTopWidth : null,
  }
})()`)

// ── 收尾：清注入、清 override ──────────────────────────────────────────
await evaluate(send, `(() => { document.getElementById('${INJECT_ID}')?.remove(); window.dispatchEvent(new Event('resize')); return true })()`)
await send('Emulation.clearDeviceMetricsOverride')
await new Promise(r => setTimeout(r, 400))

report.restored = await evaluate(send, `(() => {
  const scroll = document.querySelector('[data-conversation-scroll]')
  const card = document.querySelector('[data-conversation-scroll] [data-composer-card]')
  return {
    dpr: devicePixelRatio,
    attr: document.documentElement.hasAttribute('data-dcu-classic-scrollbar'),
    gutter: scroll ? getComputedStyle(scroll).scrollbarGutter : null,
    cardBorderWidth: card ? getComputedStyle(card).borderTopWidth : null,
  }
})()`)

cdp.close()

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const line = (k, v) => console.log(`  ${k.padEnd(22)} ${v}`)
  console.log('\n== 基线（覆盖式滚动条 / Retina）==')
  line('DPR', report.baseline.dpr)
  line('实测滚动条宽度', `${report.baseline.scrollbarWidth}px`)
  line('降级属性', report.baseline.attr ? '已设置' : '未设置（正确：宽度 0）')
  line('gutter', report.baseline.gutter)
  line('输入卡边框', report.baseline.cardBorderWidth)

  console.log('\n== 注入 17px 经典滚动条后 ==')
  line('实测滚动条宽度', `${report.classic.scrollbarWidth}px`)
  line('降级属性', report.classic.attr ? '已设置 ✓' : '未设置 ✗')
  line('gutter', report.classic.gutter)
  line('内容宽度', `${report.classic.scrollClientWidth}px`)

  console.log('\n== DPR=1（Windows 100% 缩放）==')
  line('DPR', report.dpr1.dpr)
  line('media 命中', report.dpr1.matchesMedia ? '是 ✓' : '否 ✗')
  line('输入卡边框', report.dpr1.cardBorderWidth)

  console.log('\n== 收尾（移除注入规则后）==')
  line('DPR', report.restored.dpr)
  line(
    '降级属性',
    report.restored.attr
      ? '仍设置 ✓（正确：宿主原生滚动条本就是 14px 经典式）'
      : '已清除（说明本机宿主是 overlay 式）',
  )
  line('gutter', report.restored.gutter)
  line('输入卡边框', report.restored.cardBorderWidth)
  console.log('')
}
