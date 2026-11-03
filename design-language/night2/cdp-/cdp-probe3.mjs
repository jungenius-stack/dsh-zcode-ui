// 探针3：轮次导航 rail 结构 + 波纹/hover 高亮的 DOM 形态 + 触发条件
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, page } = c

const r = await evaluate(`(() => {
  const out = {};
  // A) w-9 空轨及其家族：所有 absolute left-3 / w-9 / 竖排点状 rail
  const w9 = [...document.querySelectorAll('div')].filter(e => {
    const cls = (e.className||'').toString();
    return cls.includes('w-9') && cls.includes('overflow-y-auto');
  });
  out.w9rails = w9.map(e => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { cls: (e.className||'').toString().slice(0,200), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      scrollH: e.scrollHeight, clientH: e.clientHeight, overflowY: cs.overflowY,
      html: e.outerHTML.slice(0, 600) };
  });

  // B) 父链
  const one = w9[0];
  if (one) {
    const chain = [];
    let p = one;
    for (let i = 0; p && i < 5; i++, p = p.parentElement) {
      const r2 = p.getBoundingClientRect();
      chain.push({ tag: p.tagName, cls: (p.className||'').toString().slice(0,140), rect: {x:Math.round(r2.x),y:Math.round(r2.y),w:Math.round(r2.width),h:Math.round(r2.height)} });
    }
    out.w9chain = chain;
  }

  // C) 全局找轮次标记候选：data-* 或 aria-label 带 turn/timeline/round
  out.turnish = [...document.querySelectorAll('[data-turn],[data-timeline],[aria-label*="urn" i],[aria-label*="轮" i],[data-test*="turn" i]')]
    .slice(0, 10).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,100), aria: e.getAttribute('aria-label'), data: [...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name+'='+a.value).slice(0,4).join(','), rect: (()=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})() }));

  // D) 主区滚动容器内，找"轮次分隔/标记"类元素（含 data-index 或 group/turn 词根类名）
  const chat = [...document.querySelectorAll('*')].find(e => e.scrollHeight > 200000 && e.clientHeight > 500);
  out.chatFound = !!chat;
  if (chat) {
    const marks = [...chat.querySelectorAll('[class*="turn" i], [class*="group" i]')].filter(e => {
      const r = e.getBoundingClientRect(); return r.height > 0;
    }).slice(0, 8);
    out.chatMarks = marks.map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,110), rect: (()=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})(), scrollH: e.scrollHeight }));
    out.chatScrollTop = chat.scrollTop; out.chatScrollH = chat.scrollHeight; out.chatClientH = chat.clientHeight;
  }

  // E) 主区左缘 x≈269..305, y 300..500 的可见元素栈（rail 应该在这）
  out.leftEdgeStack = [300, 380, 430, 470, 500].map(y => {
    const el = document.elementFromPoint(285, y);
    if (!el) return { y, el: null };
    const r3 = el.getBoundingClientRect();
    return { y, tag: el.tagName, cls: (el.className||'').toString().slice(0,100), rect: {x:Math.round(r3.x),y:Math.round(r3.y),w:Math.round(r3.width),h:Math.round(r3.height)} };
  });

  // F) hover 主区中央，看 rail 是否长出内容（惰性渲染验证）——先读一次，由脚本随后 dispatch mouse 再读第二次
  return out;
})()`)

r.capturedAt = new Date().toISOString(); r.pageUrl = page.url
writeFileSync(join(OUT, 'cdp-probe3.json'), JSON.stringify(r, null, 2))
console.log('w9rails:', JSON.stringify(r.w9rails, null, 1).slice(0, 1800))
console.log('w9chain:', JSON.stringify(r.w9chain, null, 1))
console.log('turnish:', JSON.stringify(r.turnish, null, 1).slice(0, 800))
console.log('chatFound:', r.chatFound, 'chatScrollTop:', r.chatScrollTop, 'chatScrollH:', r.chatScrollH)
console.log('chatMarks:', JSON.stringify(r.chatMarks, null, 1).slice(0, 1000))
console.log('leftEdgeStack:', JSON.stringify(r.leftEdgeStack, null, 1))
c.ws.close()
