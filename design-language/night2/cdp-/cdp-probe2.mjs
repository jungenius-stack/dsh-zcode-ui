// 探针2：定位轮次 rail scroller / tooltip 触发候选 / 正文样本 / 侧栏着色祖先 / 设置页入口
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, page } = c

const r = await evaluate(`(() => {
  const desc = e => {
    if (!e) return null;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName, cls: (e.className||'').toString().slice(0,140),
      rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      overflowY: cs.overflowY, scrollH: e.scrollHeight, clientH: e.clientHeight, scrollTop: e.scrollTop,
      bg: cs.backgroundColor, color: cs.color };
  };
  // 1) html/body 类 + 主题变量现值
  const csHtml = getComputedStyle(document.documentElement);
  const vars = {};
  for (const n of ['--color-sidebar','--color-background','--color-foreground','--color-menu','--color-menu-hover','--color-tooltip','--color-tooltip-foreground','--color-tooltip-tag','--font-sans'])
    vars[n] = csHtml.getPropertyValue(n).trim();

  // 2) scrollbar-hide 的 scroller（轮次 rail 候选）+ 所有 hidden-scrollbar 容器
  const hs = [...document.querySelectorAll('[class*="scrollbar-hide" i]')].map(e => {
    const d = desc(e);
    const cs = getComputedStyle(e);
    d.scrollbarWidth = cs.scrollbarWidth; d.display = cs.display; d.position = cs.position;
    d.childSample = [...e.children].slice(0,3).map(x => x.tagName + '.' + (x.className||'').toString().slice(0,80));
    d.textSample = (e.textContent||'').replace(/\\s+/g,' ').trim().slice(0,120);
    return d;
  });

  // 3) 侧栏着色祖先链
  const aside = document.querySelector('aside');
  const chain = [];
  let p = aside;
  for (let i = 0; p && i < 6; i++, p = p.parentElement) {
    const cs = getComputedStyle(p);
    chain.push({ i, tag: p.tagName, cls: (p.className||'').toString().slice(0,100), bg: cs.backgroundColor });
  }

  // 4) 正文前景样本：main 里最深的有文字元素
  const main = document.querySelector('main');
  let textEl = null;
  if (main) {
    for (const e of main.querySelectorAll('p, h1, h2, h3, [class*="markdown" i] *, [class*="message" i] *')) {
      if (e.children.length === 0 && (e.textContent||'').trim().length > 20) { textEl = e; break; }
    }
    if (!textEl) textEl = main.querySelector('p, h1, h2, span, div');
  }

  // 5) tooltip 触发候选：带 title 或 aria-label 的按钮/图标，以及 radix trigger
  const ttCand = [...document.querySelectorAll('[title], [data-state="closed"][aria-describedby], [data-radix-tooltip-trigger]')]
    .slice(0, 15).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,80),
      title: e.getAttribute('title'), aria: e.getAttribute('aria-label'), ariaDesc: e.getAttribute('aria-describedby'),
      rect: (()=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width),h:Math.round(r.height)}})() }));

  // 6) sidebar 底部图标区（设置齿轮所在）——tooltip 高发区
  const gear = document.querySelector('svg[class*="settings" i]');
  const gearBtn = gear ? gear.closest('button, [role="button"], a') : null;

  // 7) main 与右栏文字样本
  const right = document.elementFromPoint(985, 400);

  // 8) 会话主滚区现状
  const chat = [...document.querySelectorAll('*')].filter(e => {
    const cs = getComputedStyle(e); return (cs.overflowY==='auto'||cs.overflowY==='scroll') && e.scrollHeight > e.clientHeight + 100 && e.clientHeight > 100;
  }).map(desc);

  // 9) 侧栏行（hover 目标）
  const rows = [...document.querySelectorAll('aside button, aside [role="button"], aside a')].slice(0, 6).map(desc);

  return {
    htmlClass: document.documentElement.className,
    bodyClass: document.body.className,
    darkAttr: document.body.hasAttribute('data-ds-dark-theme'),
    vars, scrollbarHideEls: hs, asideChain: chain,
    textSample: desc(textEl), textContent: textEl ? (textEl.textContent||'').slice(0,60) : null,
    tooltipCandidates: ttCand,
    gearBtn: gearBtn ? { tag: gearBtn.tagName, cls: (gearBtn.className||'').toString().slice(0,100), rect: desc(gearBtn).rect, aria: gearBtn.getAttribute('aria-label') } : null,
    atRight: right ? { tag: right.tagName, cls: (right.className||'').toString().slice(0,100) } : null,
    chatScrollers: chat, sidebarRows: rows,
  };
})()`)

r.capturedAt = new Date().toISOString(); r.pageUrl = page.url
writeFileSync(OUT + 'cdp-probe2.json', JSON.stringify(r, null, 2))
console.log('htmlClass:', r.htmlClass); console.log('bodyClass:', r.bodyClass, 'darkAttr:', r.darkAttr)
console.log('vars:', JSON.stringify(r.vars, null, 1))
console.log('scrollbarHideEls:', JSON.stringify(r.scrollbarHideEls, null, 1).slice(0, 2600))
console.log('asideChain:', JSON.stringify(r.asideChain))
console.log('textSample:', JSON.stringify(r.textSample), '»', r.textContent)
console.log('tooltipCands:', JSON.stringify(r.tooltipCandidates, null, 1).slice(0, 1500))
console.log('gearBtn:', JSON.stringify(r.gearBtn))
console.log('atRight:', JSON.stringify(r.atRight))
console.log('chatScrollers:', JSON.stringify(r.chatScrollers, null, 1).slice(0, 1200))
console.log('sidebarRows[0..2]:', JSON.stringify(r.sidebarRows.slice(0,3), null, 1))
c.ws.close()
