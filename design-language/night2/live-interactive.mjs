// 交互式采集：真的弹菜单/开面板 → 量值 → 还原
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { writeFileSync } from 'node:fs'
const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2'

async function connect(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = list.find(t => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pend = new Map()
  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = ++id; pend.set(i, res)
    ws.send(JSON.stringify({ id: i, method: m, params: p }))
    setTimeout(() => { if (pend.has(i)) { pend.delete(i); rej(new Error('timeout ' + m)) } }, 20000)
  })
  ws.on('message', raw => { const x = JSON.parse(raw.toString()); if (x.id && pend.has(x.id)) { pend.get(x.id)(x.result); pend.delete(x.id) } })
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej) })
  await send('Runtime.enable')
  const ev = async e => {
    const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.slice(0, 300) || r.exceptionDetails.text)
    return r.result.value
  }
  return { ev, close: () => ws.close() }
}

const out = {}
const put = (k, v) => { out[k] = v; console.log('▶ ' + k + ': ' + JSON.stringify(v).slice(0, 420)) }

// ══════════ 9224 ZCode ══════════
try {
  const z = await connect(9224)
  put('z.hint', await z.ev(`(() => ({
    菜单: document.querySelectorAll('[role="menu"]').length,
    treeitem: document.querySelectorAll('[role="treeitem"]').length,
    aside: !!document.querySelector('aside'),
    links: [...document.querySelectorAll('a,button')].slice(0,3).map(e => (e.textContent||'').trim().slice(0,10))
  }))()`))

  // 1) 找可右键的目标：优先侧栏会话/任务行
  put('z.targets', await z.ev(`(() => {
    const cands = [...document.querySelectorAll('aside [role="treeitem"], aside [data-task-id], aside li, [class*="task-row"], [class*="grouped-tasks"] [class*="row"]')]
    return cands.slice(0, 6).map(e => { const r = e.getBoundingClientRect(); return {
      tag: e.tagName, cls: (e.className||'').toString().slice(0,44), text: (e.textContent||'').trim().slice(0,18),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })
  })()`))

  // 2) 弹右键菜单 + 量行高/锚点
  put('z.menu', await z.ev(`(async () => {
    const cands = [...document.querySelectorAll('aside [role="treeitem"], aside [data-task-id], aside li')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width > 80 && r.height > 10 })
    if (!cands.length) return { error: '无候选行' }
    const row = cands[0]; const r = row.getBoundingClientRect()
    const cx = Math.round(r.left + 40), cy = Math.round(r.top + r.height / 2)
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 2 }))
    await new Promise(res => setTimeout(res, 300))
    let menus = [...document.querySelectorAll('[role="menu"]')].filter(m => m.getBoundingClientRect().width > 0)
    if (!menus.length) return { error: '菜单未出现', cands: cands.length, cx, cy }
    const menu = menus[0]; const mr = menu.getBoundingClientRect(); const mcs = getComputedStyle(menu)
    const items = [...menu.querySelectorAll('[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]')]
    const rows = items.slice(0, 6).map(i => {
      const cs = getComputedStyle(i); const ir = i.getBoundingClientRect()
      return { text: (i.textContent||'').trim().slice(0,12), h: Math.round(ir.height), pad: cs.padding, lh: cs.lineHeight, fs: cs.fontSize, gap: cs.rowGap, icon: !!i.querySelector('svg') }
    })
    const seps = [...menu.querySelectorAll('[role="separator"],[class*="separator"]')].map(s => { const cs = getComputedStyle(s); return { h: Math.round(s.getBoundingClientRect().height), margin: cs.margin, bg: cs.backgroundColor } })
    return {
      clickPoint: { cx, cy },
      menuBox: { x: Math.round(mr.x), y: Math.round(mr.y), w: Math.round(mr.width), h: Math.round(mr.height) },
      anchorOffset: { dx: Math.round(mr.x - cx), dy: Math.round(mr.y - cy) },
      menuStyle: { pad: mcs.padding, radius: mcs.borderRadius, bg: mcs.backgroundColor, border: mcs.borderTopWidth + ' ' + mcs.borderTopColor, shadow: mcs.boxShadow.slice(0, 60), gap: mcs.rowGap, anim: mcs.animationName + ' ' + mcs.animationDuration, trans: mcs.transitionDuration },
      itemCount: items.length, rows, separators: seps,
      hasSubmenu: items.some(i => i.getAttribute('aria-haspopup') === 'menu'),
    }
  })()`))

  // 3) 子菜单
  put('z.submenu', await z.ev(`(async () => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find(m => m.getBoundingClientRect().width > 0)
    if (!menu) return { error: '菜单已关' }
    const trig = [...menu.querySelectorAll('[aria-haspopup="menu"]')][0]
      || [...menu.querySelectorAll('[role="menuitem"],[role="menuitemradio"]')].find(i => /移动|Move|分组|Group/i.test(i.textContent||''))
    if (!trig) return { error: '无子菜单项', items: [...menu.querySelectorAll('[role="menuitem"]')].map(i=>(i.textContent||'').trim().slice(0,10)) }
    const tr = trig.getBoundingClientRect()
    for (const type of ['pointerover','pointerenter','mouseover','mousemove']) trig.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: tr.right - 4, clientY: tr.top + tr.height/2 }))
    await new Promise(r => setTimeout(r, 500))
    const all = [...document.querySelectorAll('[role="menu"]')].filter(m => m.getBoundingClientRect().width > 0)
    const sm = all.find(m => m !== menu)
    if (!sm) return { error: '子菜单未展开', triggerText: (trig.textContent||'').trim().slice(0,12), menus: all.length }
    const sr = sm.getBoundingClientRect(); const mr = menu.getBoundingClientRect()
    const scs = getComputedStyle(sm)
    return {
      trigger: { text: (trig.textContent||'').trim().slice(0,12), box: { x: Math.round(tr.x), y: Math.round(tr.y), w: Math.round(tr.width), h: Math.round(tr.height) } },
      subBox: { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) },
      delta: { dxRightToSubLeft: Math.round(sr.x - mr.right), dyTriggerTopToSubTop: Math.round(sr.y - tr.top) },
      side: sm.getAttribute('data-side'), align: sm.getAttribute('data-align'), sideOffset: sm.getAttribute('data-side-offset'),
      style: { pad: scs.padding, radius: scs.borderRadius, bg: scs.backgroundColor },
      itemCount: sm.querySelectorAll('[role="menuitem"],[role="menuitemradio"]').length,
    }
  })()`))

  // 关所有菜单
  await z.ev(`(() => { for (let i=0;i<3;i++) document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); return document.querySelectorAll('[role="menu"]').length })()`)

  // 4) ⌘K 面板
  put('z.search', await z.ev(`(async () => {
    const btn = [...document.querySelectorAll('button,[role="button"]')].find(b => /搜索|Search|任务/.test(b.getAttribute('aria-label')||'') && /搜索|Search/.test(b.getAttribute('aria-label')||''))
    if (btn) btn.click()
    else {
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',code:'KeyK',metaKey:true,bubbles:true}))
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'K',code:'KeyK',metaKey:true,bubbles:true}))
    }
    await new Promise(r => setTimeout(r, 600))
    const dlgs = [...document.querySelectorAll('[role="dialog"],[class*="dialog"],[class*="command"],[class*="Command"]')].filter(d => d.getBoundingClientRect().width > 200)
    if (!dlgs.length) return { error: '面板未出现', clicked: !!btn, dialogs: document.querySelectorAll('[role="dialog"]').length }
    const d = dlgs[0]; const cs = getComputedStyle(d); const r = d.getBoundingClientRect()
    return {
      box: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) },
      style: { pad: cs.padding, gap: cs.rowGap, radius: cs.borderRadius, bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, shadow: cs.boxShadow.slice(0,50) },
      children: [...d.children].slice(0,4).map(c => { const x = getComputedStyle(c); return { tag: c.tagName, cls: (c.className||'').toString().slice(0,30), pad: x.padding, margin: x.margin, gap: x.rowGap, h: Math.round(c.getBoundingClientRect().height) } }),
      input: (() => { const i = d.querySelector('input'); if (!i) return null; const x = getComputedStyle(i); return { h: Math.round(i.getBoundingClientRect().height), pad: x.padding, bg: x.backgroundColor, radius: x.borderRadius, border: x.borderTopWidth + ' ' + x.borderTopColor } })(),
    }
  })()`))
  await z.ev(`(() => { document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); return true })()`)
  z.close()
} catch (e) { put('z.error', String(e.message).slice(0, 300)) }

// ══════════ 9223 DSH ══════════
try {
  const d = await connect(9223)

  // 1) 进设置页 → 量开关 checked
  put('d.switch', await d.ev(`(async () => {
    const entry = [...document.querySelectorAll('button')].find(b => /设置|Settings/.test(b.getAttribute('aria-label') || b.textContent || ''))
    if (!entry) return { error: '找不到设置入口' }
    entry.click()
    await new Promise(r => setTimeout(r, 700))
    const page = document.querySelector('.dcu-settings-page')
    if (!page) return { error: '设置页未打开' }
    // 找开发者工具区的开关
    const secs = [...page.querySelectorAll('.dcu-settings-link')].map(b => (b.textContent||'').trim().slice(0,14))
    const dev = [...page.querySelectorAll('.dcu-settings-link')].find(b => /开发者|Developer/.test(b.textContent||''))
    if (dev) { dev.click(); await new Promise(r => setTimeout(r, 600)) }
    const sw = document.querySelector('.dcu-settings-switch')
    const sel = [...document.querySelectorAll('.dcu-settings-page [class*="selector"]:not([class*="themeCube"])')][0]
    const res = { sections: secs.slice(0, 10), foundSwitch: !!sw, foundSelect: !!sel }
    if (sw) {
      const cs = getComputedStyle(sw); const r = sw.getBoundingClientRect()
      const th = sw.querySelector('.dcu-settings-switch-thumb') || sw.firstElementChild
      const ts = th ? getComputedStyle(th) : null
      res.switch = { checked: sw.getAttribute('aria-checked'), box: { w: Math.round(r.width), h: Math.round(r.height) },
        track: { bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor },
        thumb: ts ? { w: Math.round(th.getBoundingClientRect().width), h: Math.round(th.getBoundingClientRect().height), bg: ts.backgroundColor, transform: ts.transform } : null }
    }
    if (sel) {
      const cs = getComputedStyle(sel); const r = sel.getBoundingClientRect()
      sel.focus()
      await new Promise(x => setTimeout(x, 120))
      const fcs = getComputedStyle(sel)
      res.select = { box: { w: Math.round(r.width), h: Math.round(r.height) }, normal: { border: cs.borderTopWidth + ' ' + cs.borderTopColor, bg: cs.backgroundColor, radius: cs.borderRadius, shadow: cs.boxShadow.slice(0,50), fs: cs.fontSize },
        focused: { border: fcs.borderTopWidth + ' ' + fcs.borderTopColor, shadow: fcs.boxShadow.slice(0,50), outline: fcs.outlineWidth + ' ' + fcs.outlineColor, offset: fcs.outlineOffset } }
      sel.blur()
    }
    return res
  })()`))

  // 2) 退出设置页
  put('d.leaveSettings', await d.ev(`(async () => {
    const back = document.querySelector('.dcu-settings-back')
    if (back) { back.click(); await new Promise(r => setTimeout(r, 500)) }
    else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
    await new Promise(r => setTimeout(r, 300))
    return { settingsOpen: !!document.querySelector('.dcu-settings-page') }
  })()`))

  // 3) 搜索面板（DSH 侧）
  put('d.search', await d.ev(`(async () => {
    const b = [...document.querySelectorAll('button')].find(x => /搜索任务|搜索会话/.test(x.getAttribute('aria-label') || x.title || ''))
    if (b) b.click(); else return { error: '无搜索入口' }
    await new Promise(r => setTimeout(r, 500))
    const dlg = document.querySelector('.dcu-search-dialog')
    if (!dlg) return { error: '未打开' }
    const cs = getComputedStyle(dlg); const r = dlg.getBoundingClientRect()
    const inp = dlg.querySelector('.dcu-search-input > *')
    const rows = [...dlg.querySelectorAll('.dcu-search-row')].slice(0,3).map(x => { const s = getComputedStyle(x); return { h: Math.round(x.getBoundingClientRect().height), pad: s.padding, fs: s.fontSize } })
    const res = { box: { w: Math.round(r.width), h: Math.round(r.height) }, pad: cs.padding, gap: cs.rowGap, radius: cs.borderRadius, bg: cs.backgroundColor,
      input: inp ? { h: Math.round(inp.getBoundingClientRect().height), pad: getComputedStyle(inp).padding, bg: getComputedStyle(inp).backgroundColor, radius: getComputedStyle(inp).borderRadius } : null, rows }
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
    return res
  })()`))

  d.close()
} catch (e) { put('d.error', String(e.message).slice(0, 300)) }

writeFileSync(`${OUT}/live-interactive.json`, JSON.stringify(out, null, 2))
console.log('\n✅ 写入 live-interactive.json')
