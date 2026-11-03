// item2：pre 内边距。先查视口±overscan 已渲染的大卡（疑似码块），必要时向上虚拟扫描；scrollTop 读后还原
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, sleep, page } = c

const CHAT = `(() => { const ch = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500); return ch; })()`

// 第一步：当前渲染树里直接找 pre / 大卡内容
const quick = await evaluate(`(() => {
  const pres = [...document.querySelectorAll('pre')];
  const bigCards = [...document.querySelectorAll('div')].filter(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.height > 300 && cs.borderRadius.includes('12px') && cs.backgroundColor === 'rgb(43, 43, 43)';
  }).slice(0, 3).map(e => ({ rect: (()=>{const r=e.getBoundingClientRect();return {y:Math.round(r.y),h:Math.round(r.height)}})(),
    hasPre: !!e.querySelector('pre'), hasCode: !!e.querySelector('code'),
    textHead: (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,80),
    htmlHead: e.innerHTML.slice(0, 300) }));
  return { preCount: pres.length, bigCards };
})()`)
console.log('quick:', JSON.stringify(quick, null, 1).slice(0, 1500))

const READ_PRE = `(() => {
  const pres = [...document.querySelectorAll('pre')];
  return pres.slice(0, 8).map(p => {
    const cs = getComputedStyle(p);
    const r = p.getBoundingClientRect();
    const code = p.querySelector('code');
    const codeCs = code ? getComputedStyle(code) : null;
    // pre 的着色祖先（码块外壳）
    let shell = null; let e = p.parentElement;
    for (let i = 0; e && i < 5; i++, e = e.parentElement) {
      const c2 = getComputedStyle(e);
      if (c2.backgroundColor !== 'rgba(0, 0, 0, 0)') { shell = { cls: (e.className||'').toString().slice(0,90), bg: c2.backgroundColor, radius: c2.borderRadius, border: c2.borderTopWidth + ' ' + c2.borderTopColor }; break; }
    }
    return { cls: (p.className||'').toString().slice(0,90), rect: {w:Math.round(r.width),h:Math.round(r.height),y:Math.round(r.y)},
      padding: { top: cs.paddingTop, right: cs.paddingRight, bottom: cs.paddingBottom, left: cs.paddingLeft },
      bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily.slice(0, 80),
      margin: cs.marginTop + '/' + cs.marginBottom,
      codePadding: codeCs ? { top: codeCs.paddingTop, right: codeCs.paddingRight, bottom: codeCs.paddingBottom, left: codeCs.paddingLeft, display: codeCs.display } : null,
      shell, text: (p.textContent||'').replace(/\\s+/g,' ').trim().slice(0,50) };
  });
})()`

let result = { quickScan: quick }
if (quick.preCount > 0) {
  result.preStyles = await evaluate(READ_PRE)
  result.method = '当前渲染树直接命中'
} else {
  // 虚拟扫描：向上步进
  const st0 = await evaluate(`${CHAT} ? ${CHAT}.scrollTop : null`)
  result.scrollTopBefore = st0
  let found = false
  const scan = []
  for (let step = 1; step <= 40 && !found; step++) {
    await evaluate(`${CHAT}.scrollTop = Math.max(0, ${CHAT}.scrollTop - 1800); true`)
    await sleep(260)
    const n = await evaluate(`document.querySelectorAll('pre').length`)
    scan.push({ step, scrollTop: st0 - step * 1800, preCount: n })
    if (n > 0) found = true
  }
  result.scan = scan
  result.method = found ? `虚拟扫描 ${result.scan.length} 步命中` : `虚拟扫描 40 步（${72000}px）未命中`
  if (found) {
    result.preStyles = await evaluate(READ_PRE)
    // 立即还原
    await evaluate(`${CHAT}.scrollTop = ${st0}; true`)
    await sleep(300)
    result.scrollTopRestored = await evaluate(`${CHAT} ? ${CHAT}.scrollTop : null`)
    result.restoreOk = result.scrollTopRestored === st0
  } else {
    await evaluate(`${CHAT}.scrollTop = ${st0}; true`)
    await sleep(300)
    result.scrollTopRestored = await evaluate(`${CHAT} ? ${CHAT}.scrollTop : null`)
  }
}

result.capturedAt = new Date().toISOString()
result.pageUrl = page.url
writeFileSync(join(OUT, 'cdp-item2-pre.json'), JSON.stringify(result, null, 2))
if (result.preStyles) {
  console.log('pre styles:')
  for (const p of result.preStyles) console.log('  padding', JSON.stringify(p.padding), '| code', JSON.stringify(p.codePadding), '| shell', JSON.stringify(p.shell), '|', p.cls.slice(0, 50))
} else console.log('no pre found')
console.log('scrollTop:', result.scrollTopBefore, '->', result.scrollTopRestored)
c.ws.close()
