// asar 定向：v4-turn-navigator 组件区间（4.40M-4.50M）的 onScroll/hover/清波逻辑
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const ASAR = '/Applications/ZCode.app/Contents/Resources/app.asar'
const buf = readFileSync(ASAR)
const jsonSize = buf.readUInt32LE(12)
const contentBase = 8 + buf.readUInt32LE(4)
const header = JSON.parse(buf.slice(16, 16 + jsonSize).toString('utf8'))
const f = (function walk(node, prefix = '') {
  for (const [name, child] of Object.entries(node.files)) {
    const p = prefix ? prefix + '/' + name : name
    if (child.files) { const r = walk(child, p); if (r) return r }
    else if (p === 'out/renderer/assets/styles-Dv5E6Odo.js') return child
  }
})(header)
const start = contentBase + parseInt(f.offset)
const s = buf.slice(start, start + f.size).toString('utf8')

const zone = s.slice(4400000, 4520000)
const out = { capturedAt: new Date().toISOString(), file: f.path, findings: [] }

// 1) 全部 onScroll 上下文
let m
const onScrollRe = /onScroll/g
const onScrolls = []
while ((m = onScrollRe.exec(zone)) && onScrolls.length < 20) onScrolls.push(m.index)
out.onScrollCount = onScrolls.length
for (const i of onScrolls.slice(0, 8)) out.findings.push({ kind: 'onScroll', at: 4400000 + i, ctx: zone.slice(Math.max(0, i - 260), i + 300).replace(/\n/g, ' ') })

// 2) hover/波 相关
for (const pat of [/setHover\w*\(/g, /hover\w*[Ii]ndex/g, /clearHover\w*\(/g, /v4-turn-navigator-item/g]) {
  const re = new RegExp(pat.source, 'g')
  const hits = []
  let mm
  while ((mm = re.exec(zone)) && hits.length < 8) hits.push(mm.index)
  for (const i of hits.slice(0, 4)) out.findings.push({ kind: pat.source, at: 4400000 + i, ctx: zone.slice(Math.max(0, i - 200), i + 260).replace(/\n/g, ' ') })
}

// 3) 交互时间戳日志（清波常伴随 debug 日志）
const logRe = /J\.debug\(`\[v4-turn-navigator\][^`]*`/g
const logs = []
while ((m = logRe.exec(zone)) && logs.length < 15) logs.push({ at: 4400000 + m.index, msg: m[0] })
out.logs = logs

writeFileSync(join(OUT, 'cdp-asar-rail.json'), JSON.stringify(out, null, 2))
console.log('onScroll in zone:', out.onScrollCount)
for (const f2 of out.findings.slice(0, 12)) {
  console.log('\n====', f2.kind, '@', f2.at)
  console.log(f2.ctx.slice(0, 480))
}
console.log('\nlogs:')
for (const l of logs) console.log(' ', l.msg.slice(0, 110))
