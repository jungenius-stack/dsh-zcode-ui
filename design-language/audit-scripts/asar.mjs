// 最小 asar 读取器（真值静态提取用；结构依据：header JSON 在 offset 8+，jsonLen 在 12，data base = 8+headerSize）
// 用法：
//   node asar.mjs list <glob-子串>          列出路径含该子串的文件（含 size/offset）
//   node asar.mjs extract <asar内路径> <输出文件>
//   node asar.mjs head <asar内路径> <字节数>  直接打印前 N 字节（文本）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const ASAR = '/Applications/ZCode.app/Contents/Resources/app.asar'

const buf = readFileSync(ASAR) // 373MB，一次性读入（机器内存足够；避免反复 seek 的复杂度）
const jsonLen = buf.readUInt32LE(12)
const header = JSON.parse(buf.slice(16, 16 + jsonLen).toString('utf8'))
const dataBase = 8 + 16 + jsonLen // pickle 对齐：8(头部) + 8(uint8+jsonLen) 已经被 16 覆盖，实测 data base = 8 + headerSize
// 注：社区共识 dataBase = 8 + headerSize，headerSize = 8 + jsonLen 对齐到 4 的倍数
const headerSize = buf.readUInt32LE(4)

function walk(node, prefix, out) {
  if (node.files) for (const [name, child] of Object.entries(node.files)) walk(child, prefix + '/' + name, out)
  else out.push({ path: prefix, size: node.size, offset: node.offset, unint: !!node.unintegrity })
}

const cmd = process.argv[2]
const arg = process.argv[3]

const files = []
walk(header, '', files)

if (cmd === 'list') {
  const hits = files.filter(f => f.path.includes(arg))
  for (const f of hits) console.log(`${String(f.size).padStart(10)}  ${f.path}`)
  console.error(`-- ${hits.length}/${files.length} 个条目`)
} else if (cmd === 'extract') {
  const f = files.find(x => x.path === arg)
  if (!f) { console.error(`未找到: ${arg}`); process.exit(1) }
  const off = dataBase + Number(f.offset)
  const data = buf.slice(off, off + f.size)
  mkdirSync(dirname(process.argv[4]), { recursive: true })
  writeFileSync(process.argv[4], data)
  console.error(`-- 提取 ${f.size} 字节 -> ${process.argv[4]}`)
} else if (cmd === 'head') {
  const f = files.find(x => x.path === arg)
  if (!f) { console.error(`未找到: ${arg}`); process.exit(1) }
  const off = dataBase + Number(f.offset)
  process.stdout.write(buf.slice(off, off + Math.min(Number(process.argv[4] || 512), f.size)).toString('utf8'))
} else {
  console.error('用法: node asar.mjs list|extract|head ...')
  process.exit(1)
}
