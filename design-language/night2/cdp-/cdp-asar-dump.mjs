// asar 只读提取：renderer bundle 里定位 (a) pre 渲染点 (b) 时间线 rail 的 onScroll 逻辑
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const ASAR = '/Applications/ZCode.app/Contents/Resources/app.asar'

function readAsarHeader(buf) {
  const jsonSize = buf.readUInt32LE(12)
  const header = JSON.parse(buf.slice(16, 16 + jsonSize).toString('utf8'))
  return { header, contentBase: 8 + buf.readUInt32LE(4) }
}
function listFiles(node, prefix = '', acc = []) {
  if (node.files) for (const [name, child] of Object.entries(node.files)) {
    const p = prefix ? prefix + '/' + name : name
    if (child.files) listFiles(child, p, acc)
    else acc.push({ path: p, size: child.size, offset: child.offset })
  }
  return acc
}
const buf = readFileSync(ASAR)
const { header, contentBase } = readAsarHeader(buf)
const files = listFiles(header)
const js = files.filter(f => f.path.startsWith('out/renderer') && f.path.endsWith('.js') && f.size > 100000)
console.log('renderer js bundles:', js.map(f => `${f.path} (${(f.size/1e6).toFixed(1)}MB)`))

const find = (f, patterns) => {
  const start = contentBase + parseInt(f.offset)
  const s = buf.slice(start, start + f.size).toString('utf8')
  const hits = []
  for (const { name, re } of patterns) {
    let m, count = 0
    while ((m = re.exec(s)) && count < 6) {
      hits.push({ name, at: m.index, ctx: s.slice(Math.max(0, m.index - 350), m.index + 350) })
      count++
    }
  }
  return { file: f.path, hits }
}

// (a) pre 渲染点
const prePatterns = [
  { name: 'jsx pre className', re: /"pre",\{className/g },
  { name: 'pre element', re: /["']pre["'],\s*\{[^}]{0,120}className/g },
]
// (b) rail：data-scrollbar-container 附近 onScroll
const railPatterns = [
  { name: 'data-scrollbar-container', re: /data-scrollbar-container/g },
  { name: 'rail scroll clear', re: /onScroll[^;]{0,200}(setHover|clearHover|hover)[^;]{0,120}/gi },
  { name: 'turn rail comp', re: /TurnNavigator|turn-nav|turnRail|TurnRail/g },
]

const out = { capturedAt: new Date().toISOString(), bundles: js.map(f => f.path), preHits: [], railHits: [] }
for (const f of js) {
  const pre = find(f, prePatterns)
  if (pre.hits.length) out.preHits.push(pre)
  const rail = find(f, railPatterns)
  if (rail.hits.length) out.railHits.push(rail)
}
writeFileSync(join(OUT, 'cdp-asar-hits.json'), JSON.stringify(out, null, 2))
console.log('preHits files:', out.preHits.map(h => h.file + ':' + h.hits.length))
console.log('railHits files:', out.railHits.map(h => h.file + ':' + h.hits.length))
for (const h of out.railHits) {
  for (const hit of h.hits.slice(0, 6)) {
    console.log('\n====', h.file, hit.name, '@', hit.at)
    console.log(hit.ctx.replace(/\n/g, ' ').slice(0, 700))
  }
}
