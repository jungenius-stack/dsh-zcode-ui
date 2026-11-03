// item2b：解剖 bash 工具体内部（是否用 pre）+ 继续向下扫描 pre 至 95k px
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, sleep, page } = c

const CHAT = `(() => { const ch = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return ch; })()`

// bash 工具体内部结构
const bash = await evaluate(`(() => {
  const card = [...document.querySelectorAll('div')].find(e => {
    const r = e.getBoundingClientRect();
    return Math.abs(r.y - (-2208)) < 400 && r.height > 500;
  });
  if (!card) return { found: false };
  const monoEls = [...card.querySelectorAll('[class*="font-mono" i], code, pre, [class*="code" i]')].slice(0, 5).map(e => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,90), rect: {w:Math.round(r.width),h:Math.round(r.height)},
      bg: cs.backgroundColor, padding: [cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].join('/'),
      fontFamily: cs.fontFamily.slice(0,50), text: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,60) };
  });
  return { found: true, childrenTags: [...card.children].map(x => x.tagName + '.' + (x.className||'').toString().slice(0,60)),
    textLen: (card.textContent||'').length, monoEls,
    textSample: (card.textContent||'').replace(/\\s+/g,' ').trim().slice(100, 260) };
})()`)
console.log('bash tool body:', JSON.stringify(bash, null, 1).slice(0, 1800))

// 继续扫描 pre（从当前 scrollTop 往下 25 步）
const st0 = await evaluate(`${CHAT} ? ${CHAT}.scrollTop : null`)
const scan = []
let found = false
for (let step = 1; step <= 25 && !found; step++) {
  await evaluate(`${CHAT}.scrollTop = Math.max(0, ${CHAT}.scrollTop - 1800); true`)
  await sleep(260)
  const n = await evaluate(`document.querySelectorAll('pre').length`)
  const cur = await evaluate(`${CHAT}.scrollTop`)
  scan.push({ step, scrollTop: Math.round(cur), preCount: n })
  if (n > 0) found = true
}
let preStyles = null
if (found) preStyles = await evaluate(`(() => {
  return [...document.querySelectorAll('pre')].slice(0, 6).map(p => {
    const cs = getComputedStyle(p); const r = p.getBoundingClientRect();
    const code = p.querySelector('code'); const codeCs = code ? getComputedStyle(code) : null;
    return { cls: (p.className||'').toString().slice(0,90), rect: {w:Math.round(r.width),h:Math.round(r.height)},
      padding: {top:cs.paddingTop,right:cs.paddingRight,bottom:cs.paddingBottom,left:cs.paddingLeft},
      bg: cs.backgroundColor, radius: cs.borderRadius, codePadding: codeCs ? [codeCs.paddingTop,codeCs.paddingRight,codeCs.paddingBottom,codeCs.paddingLeft].join('/') : null,
      text: (p.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40) };
  });
})()`)
await evaluate(`${CHAT}.scrollTop = ${st0}; true`)
await sleep(300)
const stRestored = await evaluate(`${CHAT} ? ${CHAT}.scrollTop : null`)

const out = { capturedAt: new Date().toISOString(), pageUrl: page.url, bashTool: bash, scan2: scan, foundAt: found ? scan[scan.length-1] : null, preStyles, scrollTopBefore: st0, scrollTopRestored: stRestored }
writeFileSync(join(OUT, 'cdp-item2b-pre.json'), JSON.stringify(out, null, 2))
console.log('scan2 steps:', scan.length, 'found:', found)
if (preStyles) for (const p of preStyles) console.log('PRE', JSON.stringify(p.padding), 'code', p.codePadding, p.text.slice(0,30))
console.log('scrollTop', st0, '->', stRestored)
c.ws.close()
