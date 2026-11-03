// item2 补刀：bash 码块卡的全部直接子 + 体包（p-2 pt-0 pb-3）+ 代码行的实际 padding
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, page } = c

const r = await evaluate(`(() => {
  const card = [...document.querySelectorAll('div')].find(e => {
    const r2 = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return Math.abs(r2.y - (-2208)) < 500 && r2.height > 500 && (cs.backgroundColor === 'rgb(43, 43, 43)');
  });
  if (!card) return { found: false };
  const pick = e => { const cs = getComputedStyle(e); const r3 = e.getBoundingClientRect();
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,110), rect: {y:Math.round(r3.y),h:Math.round(r3.height),w:Math.round(r3.width)},
      padding: [cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].join('/'),
      bg: cs.backgroundColor, lineHeight: cs.lineHeight, fontSize: cs.fontSize, fontFamily: cs.fontFamily.slice(0,40),
      styleAttr: (e.getAttribute('style')||'').slice(0,120) }; };
  const children = [...card.children].map(pick);
  // 体包：找 padding 上0/右8/下12/左8 或类含 p-2 pb-3 的子
  const body = [...card.querySelectorAll(':scope > div > div, :scope > div')].find(e => {
    const cs = getComputedStyle(e);
    return cs.paddingTop === '0px' && cs.paddingRight === '8px' && cs.paddingBottom === '12px' && cs.paddingLeft === '8px';
  });
  let bodyInfo = null, lines = [];
  if (body) {
    bodyInfo = pick(body);
    lines = [...body.querySelectorAll(':scope > div, :scope > span')].slice(0, 3).map(pick);
  }
  // 兜底：任何 padding-inline 非零的行级元素
  const lineish = [...card.querySelectorAll('div, span')].filter(e => {
    const cs = getComputedStyle(e);
    return (cs.paddingLeft === cs.paddingRight) && parseFloat(cs.paddingLeft) > 2 && e.getBoundingClientRect().height < 40 && (e.textContent||'').length > 0;
  }).slice(0, 3).map(pick);
  return { found: true, children, bodyInfo, lines, lineish, preInCard: card.querySelectorAll('pre').length };
})()`)

r.capturedAt = new Date().toISOString(); r.pageUrl = page.url
writeFileSync(join(OUT, 'cdp-item2-codebody.json'), JSON.stringify(r, null, 2))
console.log('children:')
for (const ch of r.children) console.log('  ', ch.cls.slice(0, 75), '| pad', ch.padding, '| h', ch.rect.h)
console.log('bodyInfo:', r.bodyInfo ? JSON.stringify({ cls: r.bodyInfo.cls.slice(0,80), pad: r.bodyInfo.padding }) : null)
console.log('lines:')
for (const l of r.lines) console.log('  ', l.cls.slice(0,70), '| pad', l.padding, '| style:', l.styleAttr.slice(0,60))
console.log('lineish:')
for (const l of r.lineish) console.log('  ', l.cls.slice(0,70), '| pad', l.padding, '| style:', l.styleAttr.slice(0,60))
c.ws.close()
