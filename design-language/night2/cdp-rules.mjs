// 深采第二轮：把 ZCode 运行中的 CSS 规则按组件族导出（只读）
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const OUT='/Users/m1/Downloads/优化UI插件区/design-language/night2'
const wsUrl=execSync("grep -o 'ws://127.0.0.1:9224/devtools/browser/[a-f0-9-]*' /tmp/zcode-debug.log | tail -1").toString().trim()
const ws=new WebSocket(wsUrl); let id=0; const pend=new Map()
const send=(m,p={},s)=>new Promise((res,rej)=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p,...(s?{sessionId:s}:{})}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);rej(new Error('timeout '+m))}},30000)})
ws.on('message',raw=>{const x=JSON.parse(raw.toString());if(x.id&&pend.has(x.id)){pend.get(x.id)(x.result);pend.delete(x.id)}})
await new Promise(r=>ws.on('open',r))
const ts=(await send('Target.getTargets')).targetInfos.filter(t=>t.type==='page')
const page=ts.find(t=>/zcode/i.test(t.url))??ts[0]
const {sessionId}=await send('Target.attachToTarget',{targetId:page.targetId,flatten:true})
await send('Runtime.enable',{},sessionId)
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true},sessionId);if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}

const dump = await ev(`(() => {
  const fams = {
    menu: /menu|dropdown|popover|popup/i,
    tooltip: /tooltip/i,
    dialog: /dialog|modal/i,
    sidebar: /sidebar|task-row|taskRow|grouped-tasks/i,
    tab: /tabs?\\b|segmented/i,
    kbd: /kbd|shortcut/i,
    scroll: /scrollbar|scroll/i,
    toast: /toast|notification/i,
    badge: /badge|unread|dot/i,
    code: /code-block|codeBlock|shiki|prose/i,
  };
  const out = {};
  for (const name of Object.keys(fams)) out[name] = [];
  const seen = new Set();
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules } catch { continue }
    const walk = list => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue }
        const sel = r.selectorText || ''; const body = r.style ? r.style.cssText : '';
        if (!sel || !body) continue;
        const key = sel + '|' + body.slice(0, 60);
        if (seen.has(key)) continue; seen.add(key);
        for (const [fam, re] of Object.entries(fams)) {
          if (re.test(sel)) { if (out[fam].length < 120) out[fam].push({ sel: sel.slice(0, 200), body: body.slice(0, 600) }); break }
        }
      }
    };
    walk(rules);
  }
  const counts = {}; for (const k of Object.keys(out)) counts[k] = out[k].length;
  return { counts, families: out };
})()`)
writeFileSync(OUT+'/cdp-rules.json', JSON.stringify(dump,null,2))
console.log('导出规则数:', JSON.stringify(dump.counts))
ws.close()
