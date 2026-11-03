// item2 终版：码块（CodeBlock，无 <pre> 的逐行结构）活体解剖——外壳/头部/体包/行的实际 padding
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, page } = c

const ANATOMY = `(() => {
  // CodeBlock 容器：ALe 类串 + 聊天映射 my-4 border bg-card；活体锚：rounded-xl + bg-card + 高>300
  const cards = [...document.querySelectorAll('div')].filter(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.height > 300 && cs.borderRadius.includes('12px') && (cs.backgroundColor === 'rgb(43, 43, 43)' || cs.backgroundColor === 'rgb(255, 255, 255)');
  });
  const pick = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,120), rect: {y:Math.round(r.y),h:Math.round(r.height),w:Math.round(r.width)},
      padding: [cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].join('/'),
      margin: [cs.marginTop,cs.marginRight,cs.marginBottom,cs.marginLeft].join('/'),
      bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
      fontSize: cs.fontSize, fontFamily: cs.fontFamily.slice(0,50), lineHeight: cs.lineHeight }; };
  const out = { blocks: [] };
  for (const card of cards.slice(0, 2)) {
    const tree = [pick(card)];
    // 逐层向下找主内容链（深 4 层）
    let level = [card]; 
    for (let d2 = 0; d2 < 4; d2++) {
      const next = [];
      for (const e of level) next.push(...e.children);
      const content = next.filter(x => { const r = x.getBoundingClientRect(); return r.height > 10 && x.tagName === 'DIV'; });
      if (!content.length) break;
      // 取最宽的内容子（主体路径）
      const main = content.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
      tree.push(pick(main));
      level = [main];
    }
    out.blocks.push({ tree,
      lineSample: (() => {
        const line = card.querySelector('[class*="line" i], code, span[class*="token" i]');
        return line ? pick(line) : null;
      })(),
      hasPre: !!card.querySelector('pre'), hasCodeTag: !!card.querySelector('code'),
      text: (card.textContent||'').replace(/\\s+/g,' ').trim().slice(0, 60) });
  }
  out.globalPre = document.querySelectorAll('pre').length;
  return out;
})()`

const r = await evaluate(ANATOMY)
r.capturedAt = new Date().toISOString()
r.pageUrl = page.url
writeFileSync(join(OUT, 'cdp-item2-codeblock.json'), JSON.stringify(r, null, 2))
console.log('globalPre:', r.globalPre, '| blocks:', r.blocks.length)
for (const b of r.blocks) {
  console.log('== block:', b.text.slice(0, 40), '| hasPre:', b.hasPre, 'hasCodeTag:', b.hasCodeTag)
  for (const [i, n] of b.tree.entries()) console.log(`  L${i}:`, n.cls.slice(0, 70), '| pad', n.padding, '| margin', n.margin, '| bg', n.bg)
  if (b.lineSample) console.log('  line:', b.lineSample.cls.slice(0, 70), '| pad', b.lineSample.padding)
}
c.ws.close()
