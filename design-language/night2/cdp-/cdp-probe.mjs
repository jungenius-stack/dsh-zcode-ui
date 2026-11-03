// 探针：摸清当前页面实况——可见表面、侧栏/rail/scroller/tooltip/pre/设置页候选、主题挂载点
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, S, send, page, wsUrl } = c

const probe = await evaluate(`(() => {
  const q = s => document.querySelector(s);
  const qa = s => document.querySelectorAll(s).length;
  const info = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { tag: el.tagName, cls: (el.className||'').toString().slice(0,120), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      bg: cs.backgroundColor, color: cs.color, overflow: cs.overflowY, display: cs.display, visible: r.width>0 && r.height>0 };
  };
  return {
    url: location.href,
    title: document.title,
    htmlClass: document.documentElement.className,
    bodyClass: document.body.className,
    counts: {
      aside: qa('aside'), nav: qa('nav'), pre: qa('pre'), textarea: qa('textarea'),
      tooltipRole: qa('[role="tooltip"]'), tooltipCls: qa('[class*="tooltip" i]'),
      menuRole: qa('[role="menu"]'), menuitem: qa('[role="menuitem"]'),
      dataSlot: qa('[data-slot]'), scrollers: [...document.querySelectorAll('*')].filter(e => {
        const cs = getComputedStyle(e); return (cs.overflowY==='auto'||cs.overflowY==='scroll') && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 30;
      }).length,
      settingsCandidates: qa('[class*="settings" i]'),
      radixTooltipRoots: qa('[data-radix-popper-content-wrapper]'),
    },
    // 侧栏候选
    aside: info(q('aside')),
    firstAsideChildren: q('aside') ? [...q('aside').children].map(c => c.tagName + '.' + (c.className||'').toString().slice(0,60)).slice(0,10) : null,
    // rail / 轮次导航候选（会话列表或聊天内轮次条）
    railCandidates: [...document.querySelectorAll('[class*="rail" i], [class*="turn" i], [class*="timeline" i], [class*="round" i]')].slice(0,12).map(e => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { tag: e.tagName, cls: (e.className||'').toString().slice(0,100), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, overflowY: cs.overflowY, scrollH: e.scrollHeight, clientH: e.clientHeight };
    }),
    // 可滚动容器清单（前 10）
    scrollers: [...document.querySelectorAll('*')].filter(e => {
      const cs = getComputedStyle(e); return (cs.overflowY==='auto'||cs.overflowY==='scroll') && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 30;
    }).slice(0,10).map(e => ({ tag: e.tagName, cls: (e.className||'').toString().slice(0,100), rect: (()=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})(), scrollH: e.scrollHeight, clientH: e.clientHeight })),
    // 码块
    pre: info(q('pre')),
    preCount: qa('pre'),
    // 设置页候选
    settingsEls: [...document.querySelectorAll('[class*="settings" i]')].slice(0,8).map(info),
    // tooltip 候选
    tooltipEls: [...document.querySelectorAll('[role="tooltip"], [class*="tooltip" i], [data-radix-popper-content-wrapper]')].slice(0,8).map(info),
    // 主区背景候选：main / body 直接子级
    main: info(q('main')),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    // 菜单项候选（侧栏里可 hover 的行）
    hoverRows: [...document.querySelectorAll('aside [class*="hover"], aside a, aside button')].slice(0,8).map(info),
    // 图标 svg
    svgSample: q('aside svg') ? { stroke: getComputedStyle(q('aside svg')).stroke, children: q('aside svg').innerHTML.slice(0,150) } : null,
  };
})()`)

probe.capturedAt = new Date().toISOString()
probe.pageUrl = page.url
probe.wsUrl = wsUrl
writeFileSync(OUT + 'cdp-probe.json', JSON.stringify(probe, null, 2))
console.log(JSON.stringify(probe.counts, null, 1))
console.log('aside:', JSON.stringify(probe.aside))
console.log('rail:', JSON.stringify(probe.railCandidates, null, 1).slice(0, 1200))
console.log('scrollers:', JSON.stringify(probe.scrollers, null, 1).slice(0, 1200))
console.log('pre:', JSON.stringify(probe.pre), 'x', probe.preCount)
console.log('settings:', JSON.stringify(probe.settingsEls).slice(0, 800))
console.log('tooltips:', JSON.stringify(probe.tooltipEls).slice(0, 600))
console.log('hoverRows:', JSON.stringify(probe.hoverRows).slice(0, 900))
console.log('main:', JSON.stringify(probe.main), 'bodyBg:', probe.bodyBg, 'htmlBg:', probe.htmlBg)
c.ws.close()
