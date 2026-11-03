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
const info = await ev(`(() => {
  const styles=[...document.querySelectorAll('style')].map(s=>({len:s.textContent.length, head:s.textContent.slice(0,80)}));
  const adopted=(document.adoptedStyleSheets||[]).map(s=>{try{return {len:[...s.cssRules].reduce((a,r)=>a+(r.cssText||'').length,0)}}catch(e){return {err:String(e)}}});
  const links=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href);
  return { styleTags: styles.length, totalLen: styles.reduce((a,s)=>a+s.len,0), biggest: styles.sort((a,b)=>b.len-a.len).slice(0,5), adopted, links, sheets: document.styleSheets.length };
})()`)
console.log(JSON.stringify(info,null,1).slice(0,1200))
const all = await ev(`[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n/*----*/\\n')`)
writeFileSync(OUT+'/cdp-live-styles.css', all)
console.log('写入 cdp-live-styles.css 字节:', all.length)
ws.close()
