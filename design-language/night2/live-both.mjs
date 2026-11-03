// 一次跑完 9224(ZCode) 与 9223(DSH插件) 的 needs-live 实测
// 只读：仅 Runtime.evaluate 读值 + 合成事件（测完还原）。不改持久状态、不 reload。
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { writeFileSync } from 'node:fs'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2'

async function connect(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = list.find(t => t.type === 'page')
  if (!page) throw new Error(`port ${port}: 无 page 目标`)
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pend = new Map()
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pend.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }))
      setTimeout(() => { if (pend.has(i)) { pend.delete(i); reject(new Error('timeout ' + method)) } }, 20000)
    })
  ws.on('message', raw => {
    const m = JSON.parse(raw.toString())
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id) }
  })
  ws.on('error', e => { throw e })
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  await send('Runtime.enable')
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
  return { ws, send, ev, close: () => ws.close(), url: page.url }
}

const results = {}
const note = (k, v) => { results[k] = v; console.log(k + ' → ' + JSON.stringify(v).slice(0, 300)) }

// ───────── 9224 = ZCode ─────────
try {
  const z = await connect(9224)
  note('zcode.url', z.url)
  note('zcode.theme', await z.ev(`({dark: document.body.hasAttribute('data-ds-dark-theme'), cls: document.documentElement.className})`))

  // 1) 右键菜单行高 + 锚点偏移 + 动画
  const menuProbe = await z.ev(`(async () => {
    const rows = [...document.querySelectorAll('[data-task-id],[role="treeitem"],[class*="task-row"],[class*="taskRow"]')]
      .filter(e => e.getBoundingClientRect().width > 50)
    if (!rows.length) return { error: '找不到任务行' }
    const row = rows[0]
    const r = row.getBoundingClientRect()
    const cx = Math.round(r.left + Math.min(60, r.width / 2)), cy = Math.round(r.top + r.height / 2)
    const before = document.querySelectorAll('[role="menu"]').length
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 2 }))
    await new Promise(res => setTimeout(res, 260))
    const menus = [...document.querySelectorAll('[role="menu"]')]
    const menu = menus.find(m => getComputedStyle(m).visibility !== 'hidden' && m.getBoundingClientRect().width > 0)
    if (!menu) return { error: '菜单未出现', before, after: menus.length, cx, cy }
    const mr = menu.getBoundingClientRect()
    const items = [...menu.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]')]
    const sample = items.slice(0, 4).map(i => {
      const cs = getComputedStyle(i); const ir = i.getBoundingClientRect()
      return { text: (i.textContent || '').trim().slice(0, 14), h: Math.round(ir.height), pad: cs.padding, lh: cs.lineHeight, fs: cs.fontSize, gap: cs.rowGap }
    })
    const mcs = getComputedStyle(menu)
    const anim = { name: mcs.animationName, dur: mcs.animationDuration, tf: mcs.transitionDuration, state: menu.getAttribute('data-state') }
    return {
      rowRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      clickPoint: { cx, cy },
      menuRect: { x: Math.round(mr.x), y: Math.round(mr.y), w: Math.round(mr.width), h: Math.round(mr.height) },
      offsetFromPointer: { dx: Math.round(mr.x - cx), dy: Math.round(mr.y - cy) },
      itemCount: items.length, items: sample, anim,
    }
  })()`)
  note('zcode.menu', menuProbe)

  // 2) 子菜单（若菜单内有子菜单触发项）
  const subProbe = await z.ev(`(async () => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find(m => m.getBoundingClientRect().width > 0)
    if (!menu) return { error: '菜单不在' }
    const sub = [...menu.querySelectorAll('[aria-haspopup="menu"],[data-state]')].find(el => el.getAttribute('aria-haspopup') === 'menu')
    if (!sub) return { error: '菜单内无子菜单触发项', allHaspopup: [...menu.querySelectorAll('[aria-haspopup]')].map(e => e.textContent.trim().slice(0,10)) }
    const sr = sub.getBoundingClientRect()
    sub.dispatchEvent(new MouseEvent('pointerenter', { bubbles: true }))
    sub.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    sub.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
    await new Promise(r => setTimeout(r, 400))
    const menus = [...document.querySelectorAll('[role="menu"]')].filter(m => m.getBoundingClientRect().width > 0)
    const sm = menus.find(m => m !== menu)
    if (!sm) return { error: '子菜单未展开', triggerRect: { x: Math.round(sr.x), y: Math.round(sr.y) } }
    const smr = sm.getBoundingClientRect(); const mr = menu.getBoundingClientRect()
    return {
      trigger: { text: sub.textContent.trim().slice(0, 14), x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) },
      subRect: { x: Math.round(smr.x), y: Math.round(smr.y), w: Math.round(smr.width), h: Math.round(smr.height) },
      delta: { dx: Math.round(smr.x - mr.right), dy: Math.round(smr.y - sr.y) },
      side: sm.getAttribute('data-side'), align: sm.getAttribute('data-align'),
    }
  })()`)
  note('zcode.submenu', subProbe)

  // 关菜单
  await z.ev(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    document.body.click(); return document.querySelectorAll('[role="menu"]').length })()`)

  // 3) 滚动条 thin
  note('zcode.scrollbar', await z.ev(`(() => {
    const els = [...document.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return cs.overflowY === 'auto' || cs.overflowY === 'scroll' })
    const out = els.slice(0, 6).map(e => { const cs = getComputedStyle(e); return {
      cls: (e.className || '').toString().slice(0, 40), scrollbarWidth: cs.scrollbarWidth, gutter: cs.scrollbarGutter,
      scrollH: e.scrollHeight, clientH: e.clientHeight, overflowing: e.scrollHeight > e.clientHeight + 2 } })
    const rules = []
    for (const sheet of document.styleSheets) { let rs; try { rs = sheet.cssRules } catch { continue }
      const walk = list => { for (const r of list) { if (r.cssRules) { walk(r.cssRules); continue }
        const sel = r.selectorText || ''; if (/scrollbar/.test(sel)) rules.push({ sel: sel.slice(0, 120), body: (r.style?.cssText || '').slice(0, 200) }) } }
      walk(rs) }
    return { containers: out, scrollbarRules: rules.slice(0, 12) }
  })()`))

  // 4) busy 钮 disabled 态
  note('zcode.busy', await z.ev(`(() => {
    const btns = [...document.querySelectorAll('button[disabled],button:disabled,[aria-disabled="true"]')]
    return btns.slice(0, 6).map(b => { const cs = getComputedStyle(b); return {
      text: (b.textContent || '').trim().slice(0, 16), cursor: cs.cursor, opacity: cs.opacity,
      pe: cs.pointerEvents, bg: cs.backgroundColor, color: cs.color } })
  })()`))

  // 5) ⌘K 搜索面板 padding（能开则开）
  const searchProbe = await z.ev(`(async () => {
    const btn = [...document.querySelectorAll('button,[role="button"]')].find(b => /搜索|Search|⌘K/i.test(b.getAttribute('aria-label') || b.textContent || ''))
    const pre = document.querySelectorAll('[role="dialog"],[class*="command"]').length
    let opened = false
    if (btn) { btn.click(); opened = true } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', metaKey: true, bubbles: true }))
      opened = true
    }
    await new Promise(r => setTimeout(r, 500))
    const dlg = [...document.querySelectorAll('[role="dialog"],[class*="command"],[class*="dialog"]')].find(d => d.getBoundingClientRect().width > 200)
    if (!dlg) return { error: '搜索面板未出现', pre, opened, found: document.querySelectorAll('[role="dialog"]').length }
    const cs = getComputedStyle(dlg); const r = dlg.getBoundingClientRect()
    const inner = [...dlg.children].slice(0, 4).map(c => { const x = getComputedStyle(c); const cr = c.getBoundingClientRect(); return {
      tag: c.tagName, cls: (c.className || '').toString().slice(0, 40), pad: x.padding, gap: x.rowGap, margin: x.margin, h: Math.round(cr.height) } })
    const input = dlg.querySelector('input')
    const ir = input ? { pad: getComputedStyle(input).padding, h: Math.round(input.getBoundingClientRect().height), bg: getComputedStyle(input).backgroundColor, radius: getComputedStyle(input).borderRadius } : null
    return { dialog: { w: Math.round(r.width), h: Math.round(r.height), pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, gap: cs.rowGap }, inner, input: ir }
  })()`)
  note('zcode.searchPanel', searchProbe)
  await z.ev(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true })()`)

  z.close()
} catch (e) {
  note('zcode.error', String(e.message))
}

// ───────── 9223 = DSH + 插件 ─────────
try {
  const d = await connect(9223)
  note('dsh.url', d.url)
  note('dsh.theme', await d.ev(`({dark: document.body.hasAttribute('data-ds-dark-theme'), cls: document.documentElement.className, dcu: document.querySelectorAll('[class*="dcu-"]').length})`))

  // 插件令牌
  note('dsh.tokens', await d.ev(`(() => { const cs = getComputedStyle(document.documentElement)
    const names = ['--dcu-sidebar-background','--dcu-sidebar-tertiary','--dcu-sidebar-secondary','--dcu-state-success-text','--dcu-state-success-fill','--dcu-tip-bg','--dsw-radius-xl','--dsw-radius-md','--dsw-font-family']
    const o = {}; for (const n of names) o[n] = cs.getPropertyValue(n).trim(); return o })()`))

  // 1) 搜索空态（打开搜索面板）
  const search = await d.ev(`(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /搜索任务|搜索会话/.test(x.getAttribute('aria-label') || x.title || ''))
    if (b) b.click()
    await new Promise(r => setTimeout(r, 400))
    const dlg = document.querySelector('.dcu-search-dialog')
    if (!dlg) return { error: '搜索面板未出现' }
    const empty = dlg.querySelector('.dcu-search-empty')
    const inp = dlg.querySelector('.dcu-search-input > *')
    const cs = getComputedStyle(dlg); const r = dlg.getBoundingClientRect()
    const out = {
      dialog: { w: Math.round(r.width), h: Math.round(r.height), pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor },
      inputPill: inp ? { h: Math.round(inp.getBoundingClientRect().height), pad: getComputedStyle(inp).padding, bg: getComputedStyle(inp).backgroundColor, radius: getComputedStyle(inp).borderRadius, border: getComputedStyle(inp).borderTopWidth + ' ' + getComputedStyle(inp).borderTopColor } : null,
      empty: empty ? { textAlign: getComputedStyle(empty).textAlign, pad: getComputedStyle(empty).padding, color: getComputedStyle(empty).color, h: Math.round(empty.getBoundingClientRect().height) } : '无空态元素（有结果时正常）',
      sections: [...dlg.querySelectorAll('.dcu-search-section')].length,
      rows: [...dlg.querySelectorAll('.dcu-search-row')].slice(0, 3).map(x => { const s = getComputedStyle(x); return { h: Math.round(x.getBoundingClientRect().height), pad: s.padding, fs: s.fontSize } }),
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    return out
  })()`)
  note('dsh.searchPanel', search)

  // 2) 未读点 / 胶囊 / 徽标
  note('dsh.badges', await d.ev(`(() => {
    const pick = sel => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect()
      return { sel, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, color: cs.color, fs: cs.fontSize, radius: cs.borderRadius, text: (e.textContent || '').trim().slice(0, 12) } }
    return {
      unread: pick('.dcu-wb-unread'), pending: pick('.dcu-wb-pending'), pendingDot: pick('.dcu-wb-pending-dot'),
      anyBadge: [...document.querySelectorAll('[class*="badge"],[class*="count"],[class*="pill"]')].slice(0, 5).map(e => ({ cls: (e.className||'').toString().slice(0,40), text: (e.textContent||'').trim().slice(0,10), bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color })),
    }
  })()`))

  // 3) 行内码 margin
  note('dsh.inlineCode', await d.ev(`(() => {
    const els = [...document.querySelectorAll('[data-conversation-scroll] :not(pre) > code')].slice(0, 4)
    return els.map(e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect()
      return { text: (e.textContent || '').slice(0, 16), ml: cs.marginLeft, mr: cs.marginRight, pad: cs.padding, radius: cs.borderRadius, bg: cs.backgroundColor, h: Math.round(r.height) } })
  })()`))

  // 4) 表格 → 段落间距
  note('dsh.tableToP', await d.ev(`(() => {
    const t = document.querySelector('[data-conversation-scroll] table')
    if (!t) return '当前会话无表格'
    const next = t.closest('div,p')?.nextElementSibling || t.parentElement?.nextElementSibling
    const tr = t.getBoundingClientRect()
    const nr = next ? next.getBoundingClientRect() : null
    return { tableBottom: Math.round(tr.bottom), nextTop: nr ? Math.round(nr.top) : null, gap: nr ? Math.round(nr.top - tr.bottom) : null,
      tableMargin: getComputedStyle(t).margin, nextMargin: next ? getComputedStyle(next).margin : null }
  })()`))

  // 5) 开关（设置页里的，若能找到）
  note('dsh.switch', await d.ev(`(() => {
    const sw = document.querySelector('.dcu-settings-switch,[role="switch"]')
    if (!sw) return '当前界面无开关（需打开设置页）'
    const cs = getComputedStyle(sw); const thumb = sw.querySelector('.dcu-settings-switch-thumb') || sw.firstElementChild
    const ts = thumb ? getComputedStyle(thumb) : null
    return { checked: sw.getAttribute('aria-checked'), track: { w: Math.round(sw.getBoundingClientRect().width), h: Math.round(sw.getBoundingClientRect().height), bg: cs.backgroundColor, radius: cs.borderRadius },
      thumb: ts ? { w: Math.round(thumb.getBoundingClientRect().width), h: Math.round(thumb.getBoundingClientRect().height), bg: ts.backgroundColor, transform: ts.transform } : null }
  })()`))

  // 6) 定时任务页
  note('dsh.schedule', await d.ev(`(() => {
    const pane = document.querySelector('.dcu-schedule-pane,[data-slot="sidebar.schedule"]')
    if (!pane) return '定时页未挂载/未切换'
    const cs = getComputedStyle(pane); const r = pane.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), overflowX: cs.overflowX,
      children: [...pane.children].slice(0, 4).map(c => ({ tag: c.tagName, w: Math.round(c.getBoundingClientRect().width) })),
      widest: Math.max(0, ...[...pane.querySelectorAll('*')].slice(0, 400).map(e => Math.round(e.getBoundingClientRect().width))) }
  })()`))

  d.close()
} catch (e) {
  note('dsh.error', String(e.message))
}

writeFileSync(`${OUT}/live-results.json`, JSON.stringify(results, null, 2))
console.log('\n写入 live-results.json')
