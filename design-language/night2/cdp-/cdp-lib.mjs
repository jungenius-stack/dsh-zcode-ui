// 共享 CDP 连接库：WS 直连浏览器端点（HTTP 发现端点在此构建被禁用，从 /tmp/zcode-debug.log 抓 ws URL）
// 只读铁律：不重启、不 reload、不写任何持久状态；主题类切换后按快照精确还原由调用方负责。
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { execSync } from 'node:child_process'

export async function connect() {
  const wsUrl = execSync(
    "grep -o 'ws://127.0.0.1:9224/devtools/browser/[a-f0-9-]*' /tmp/zcode-debug.log | tail -1"
  ).toString().trim()
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pend = new Map()
  const events = [] // {method, params, sessionId}
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pend.set(i, { resolve, reject, method })
      ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }))
      setTimeout(() => {
        if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)) }
      }, 30000)
    })
  ws.on('message', raw => {
    const m = JSON.parse(raw.toString())
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id); pend.delete(m.id)
      if (m.error) p.reject(new Error(m.error.message + ' (' + p.method + ')'))
      else p.resolve(m.result)
    } else if (m.method) {
      events.push(m)
    }
  })
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })

  const targets = (await send('Target.getTargets')).targetInfos.filter(t => t.type === 'page')
  const page = targets.find(t => /zcode/i.test(t.url)) ?? targets[0]
  const attached = await send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  const S = attached.sessionId
  await send('Runtime.enable', {}, S)

  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, S)
    if (r.exceptionDetails) {
      const d = r.exceptionDetails
      throw new Error((d.exception?.description || d.text) + ' :: ' + expression.slice(0, 120))
    }
    return r.result.value
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  return { ws, wsUrl, page, S, send, evaluate, sleep, events, targets }
}

// 快照/还原 html+body 类与属性（读后即还原的唯一正道：逐字还原 className）
export const snapTheme = () => `(() => ({
  htmlClass: document.documentElement.className,
  bodyClass: document.body.className,
  htmlAttrs: Object.fromEntries([...document.documentElement.attributes].map(a => [a.name, a.value])),
  bodyAttrs: Object.fromEntries([...document.body.attributes].map(a => [a.name, a.value])),
}))()`

export const restoreTheme = snap => `(() => {
  document.documentElement.className = ${JSON.stringify(snap.htmlClass)};
  document.body.className = ${JSON.stringify(snap.bodyClass)};
  for (const a of [...document.documentElement.attributes]) if (!(${JSON.stringify(Object.keys(snap.htmlAttrs))}).includes(a.name)) document.documentElement.removeAttribute(a.name);
  for (const a of [...document.body.attributes]) if (!(${JSON.stringify(Object.keys(snap.bodyAttrs))}).includes(a.name)) document.body.removeAttribute(a.name);
  for (const [k, v] of Object.entries(${JSON.stringify(snap.htmlAttrs)})) document.documentElement.setAttribute(k, v);
  for (const [k, v] of Object.entries(${JSON.stringify(snap.bodyAttrs)})) document.body.setAttribute(k, v);
  return { htmlClass: document.documentElement.className, bodyClass: document.body.className };
})()`
