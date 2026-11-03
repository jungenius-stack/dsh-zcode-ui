// 只读：不触发任何 UI 交互，只读当前已渲染的 DOM
import WebSocket from '/Users/m1/node_modules/ws/index.js'
import { writeFileSync } from 'node:fs'
const OUT='/Users/m1/Downloads/优化UI插件区/design-language/night2'
async function connect(port){
  const list=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page=list.find(t=>t.type==='page')
  const ws=new WebSocket(page.webSocketDebuggerUrl); let id=0; const pend=new Map()
  const send=(m,p={})=>new Promise((res,rej)=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));setTimeout(()=>{if(pend.has(i)){pend.delete(i);rej(new Error('timeout '+m))}},15000)})
  ws.on('message',raw=>{const x=JSON.parse(raw.toString());if(x.id&&pend.has(x.id)){pend.get(x.id)(x.result);pend.delete(x.id)}})
  await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej)})
  await send('Runtime.enable')
  const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
  return {ev,close:()=>ws.close(),url:page.url}
}
const out={}
// ---- 9223 DSH ----
try{
  const d=await connect(9223)
  out.dshUrl=d.url
  out.dsh={}
  out.dsh.theme=await d.ev(`({dark:document.body.hasAttribute('data-ds-dark-theme'),dcu:document.querySelectorAll('[class*="dcu-"]').length})`)
  out.dsh.tokens=await d.ev(`(()=>{const cs=getComputedStyle(document.documentElement);const n=['--dcu-sidebar-background','--dcu-sidebar-tertiary','--dcu-sidebar-secondary','--dcu-state-success-text','--dcu-state-error-fill','--dcu-tip-bg','--dcu-dialog-bg','--dsw-radius-xl','--dsw-radius-md'];const o={};for(const k of n)o[k]=cs.getPropertyValue(k).trim();return o})()`)
  out.dsh.unread=await d.ev(`(()=>{const e=document.querySelector('.dcu-wb-unread');if(!e)return null;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),bg:cs.backgroundColor,radius:cs.borderRadius}})()`)
  out.dsh.pending=await d.ev(`(()=>{const e=document.querySelector('.dcu-wb-pending');if(!e)return null;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {text:(e.textContent||'').trim().slice(0,12),h:Math.round(r.height),bg:cs.backgroundColor,color:cs.color,fs:cs.fontSize,pad:cs.padding}})()`)
  out.dsh.inlineCode=await d.ev(`[...document.querySelectorAll('[data-conversation-scroll] :not(pre) > code')].slice(0,3).map(e=>{const cs=getComputedStyle(e);return {text:(e.textContent||'').slice(0,14),ml:cs.marginLeft,mr:cs.marginRight,pad:cs.padding,radius:cs.borderRadius,bg:cs.backgroundColor}})`)
  out.dsh.tableGap=await d.ev(`(()=>{const t=document.querySelector('[data-conversation-scroll] table');if(!t)return '无表格';const par=t.parentElement;const nx=par&&par.nextElementSibling;const tr=t.getBoundingClientRect();const nr=nx?nx.getBoundingClientRect():null;return {tableMargin:getComputedStyle(t).margin,parentMargin:par?getComputedStyle(par).margin:null,gap:nr?Math.round(nr.top-tr.bottom):null,nextTag:nx?nx.tagName:null}})()`)
  out.dsh.scrollbar=await d.ev(`(()=>{const els=[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return (c.overflowY==='auto'||c.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+2});const rules=[];for(const s of document.styleSheets){let rs;try{rs=s.cssRules}catch{continue}const w=l=>{for(const r of l){if(r.cssRules){w(r.cssRules);continue}const sel=r.selectorText||'';if(/scrollbar/.test(sel))rules.push({sel:sel.slice(0,110),body:(r.style?.cssText||'').slice(0,160)})}};w(rs)}return {overflowing:els.slice(0,4).map(e=>{const c=getComputedStyle(e);return {cls:(e.className||'').toString().slice(0,34),sbw:c.scrollbarWidth,gutter:c.scrollbarGutter}}),rules:rules.slice(0,10)}})()`)
  out.dsh.switch=await d.ev(`(()=>{const sw=document.querySelector('.dcu-settings-switch,[role=switch]');if(!sw)return '当前界面无开关';const cs=getComputedStyle(sw);const r=sw.getBoundingClientRect();const th=sw.querySelector('.dcu-settings-switch-thumb')||sw.firstElementChild;const ts=th?getComputedStyle(th):null;return {checked:sw.getAttribute('aria-checked'),track:{w:Math.round(r.width),h:Math.round(r.height),bg:cs.backgroundColor,radius:cs.borderRadius},thumb:ts?{w:Math.round(th.getBoundingClientRect().width),h:Math.round(th.getBoundingClientRect().height),bg:ts.backgroundColor}:null}})()`)
  d.close()
}catch(e){out.dshError=String(e.message)}
// ---- 9224 ZCode ----
try{
  const z=await connect(9224)
  out.zUrl=z.url
  out.z={}
  out.z.theme=await z.ev(`({dark:document.body.hasAttribute('data-ds-dark-theme'),cls:document.documentElement.className})`)
  out.z.scrollbar=await z.ev(`(()=>{const els=[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return (c.overflowY==='auto'||c.overflowY==='scroll')});const rules=[];for(const s of document.styleSheets){let rs;try{rs=s.cssRules}catch{continue}const w=l=>{for(const r of l){if(r.cssRules){w(r.cssRules);continue}const sel=r.selectorText||'';if(/scrollbar/.test(sel))rules.push({sel:sel.slice(0,110),body:(r.style?.cssText||'').slice(0,150)})}};w(rs)}return {containers:els.slice(0,5).map(e=>{const c=getComputedStyle(e);return {cls:(e.className||'').toString().slice(0,34),sbw:c.scrollbarWidth,gutter:c.scrollbarGutter,over:e.scrollHeight>e.clientHeight+2}}),rules:rules.slice(0,10)}})()`)
  out.z.busy=await z.ev(`[...document.querySelectorAll('button[disabled],[aria-disabled="true"]')].slice(0,5).map(b=>{const c=getComputedStyle(b);return {text:(b.textContent||'').trim().slice(0,14),cursor:c.cursor,opacity:c.opacity,pe:c.pointerEvents}})`)
  out.z.rows=await z.ev(`[...document.querySelectorAll('[role="treeitem"],[data-task-id]')].slice(0,3).map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return {cls:(e.className||'').toString().slice(0,30),h:Math.round(r.height),lh:c.lineHeight,pad:c.padding}})`)
  z.close()
}catch(e){out.zError=String(e.message)}
writeFileSync(`${OUT}/live-readonly.json`,JSON.stringify(out,null,2))
console.log(JSON.stringify(out,null,1).slice(0,3000))
