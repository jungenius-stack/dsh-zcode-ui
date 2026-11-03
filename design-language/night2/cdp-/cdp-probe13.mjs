// probe13：⌘K 命令面板 → 搜「设置」→ 尝试打开设置页
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { S, send, evaluate, sleep, page } = c

const PANEL = `(() => {
  const p = [...document.querySelectorAll('[role="dialog"], [cmdk-root], [class*="command" i]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 300 && r.height > 100 });
  const items = [...document.querySelectorAll('[cmdk-item], [role="option"], [role="menuitem"]')].slice(0, 12)
    .map(e => ({ text: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,50), cls: (e.className||'').toString().slice(0,70),
      rect: (()=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})() }));
  return { panelCount: p.length, panelCls: p[0] ? (p[0].className||'').toString().slice(0,100) : null, items };
})()`

// ⌘K
for (const type of ['rawKeyDown', 'keyUp'])
  await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, nativeVirtualKeyCode: 75, modifiers: 4 }, S)
await sleep(900)
const opened = await evaluate(PANEL)
console.log('panel:', JSON.stringify(opened, null, 1).slice(0, 1500))

// 若面板开了，输入「设置」
if (opened.panelCount > 0) {
  await send('Input.insertText', { text: '设置' }, S)
  await sleep(800)
  const filtered = await evaluate(PANEL)
  console.log('filtered:', JSON.stringify(filtered.items, null, 1).slice(0, 1200))
  writeFileSync(join(OUT, 'cdp-probe13.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, opened, filtered, note: '面板已开；候选见 items；后续点击由下一脚本决定' }, null, 2))
  // Esc 关面板
  for (const type of ['rawKeyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }, S)
  await sleep(400)
} else {
  writeFileSync(join(OUT, 'cdp-probe13.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, opened, note: '⌘K 面板未打开' }, null, 2))
}
c.ws.close()
