#!/usr/bin/env node
/**
 * ZCode 上游哈希哨兵（CODE-030 防线，2026-11-02 夜跑批次 8）。
 *
 * 为什么存在：本仓库所有「ZCode 真值」都取自装机 asar 的编译产物
 * （styles-NK68EN_n.css 是其中唯一 styles 文件）。ZCode 自动更新后这份产物
 * 会被整个替换（文件名里的内容哈希都会变），而仓库里引用它的注释、断言、
 * 矩阵不会知道——上游静默回归（CODE-030）就是这么积累的。10-28 以来 asar
 * 已静默更新过一次（styles-9Z13W0KP → styles-NK68EN_n），是靠人肉复核才发现的。
 *
 * 做什么：读装机 asar 里 /out/renderer/assets/styles-*.css 的文件名与 sha256，
 * 与 docs/baseline.json（由 scripts/baseline.mjs 生成）登记的基线比对：
 *   - 文件名变了（上游重新打包，styles-XXXX 前缀换）→ 红：上游已更新，需全量重对照
 *   - 同名但字节变了 → 红：同上
 *   - 基线缺失 → 红：先跑 node --import tsx scripts/baseline.mjs 登记
 *   - 本机没有装 ZCode（CI / 其他机器）→ 跳过（exit 0），不算失败
 *
 * 基线值不在这里写死：它由 baseline.mjs 采集（structure.zcodeAsarStyles），
 * 与其他计数走同一条生成管线，避免第二处手写真值（08 号踩坑报告的教训）。
 */
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ZCODE_ASAR = '/Applications/ZCode.app/Contents/Resources/app.asar'
const STYLES_DIR = 'out/renderer/assets'

/** 最小 asar 读取（结构依据 design-language/audit-scripts/asar.mjs，已在多轮提取中验证）：
 *  header JSON 长度在 offset 12，JSON 从 16 开始，data base = 8 + headerSize。 */
export function readAsarStyles(asarPath = ZCODE_ASAR) {
  let buf
  try {
    buf = readFileSync(asarPath)
  } catch {
    return null // 没装 ZCode（CI / 其他机器），调用方按 SKIP 处理
  }
  const jsonLen = buf.readUInt32LE(12)
  const headerSize = buf.readUInt32LE(4)
  const header = JSON.parse(buf.slice(16, 16 + jsonLen).toString('utf8'))
  const dataBase = 8 + headerSize
  const out = []
  const walk = (node, prefix) => {
    if (node.files) for (const [name, child] of Object.entries(node.files)) walk(child, `${prefix}/${name}`)
    else if (prefix.includes(`${STYLES_DIR}/styles-`) && prefix.endsWith('.css')) {
      // 文件节点自身就是 node（size/offset 挂在叶子上），与 audit-scripts/asar.mjs 同构
      const off = dataBase + Number(node.offset)
      out.push({
        path: prefix,
        size: node.size,
        sha256: createHash('sha256').update(buf.slice(off, off + node.size)).digest('hex'),
      })
    }
  }
  walk(header, '')
  return out
}

/** 基线采集入口：供 scripts/baseline.mjs 调用。本机无 ZCode 时返回 null。 */
export function collectZcodeAsarStyles() {
  const styles = readAsarStyles()
  if (styles === null) return null
  let mtime = null
  try { mtime = statSync(ZCODE_ASAR).mtime.toISOString() } catch { /* asar 刚被替换的竞态：mtime 拿不到就记 null */ }
  return { files: styles, asarMtime: mtime }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  let baseline
  try {
    baseline = JSON.parse(readFileSync(resolve(root, 'docs/baseline.json'), 'utf8'))
  } catch (err) {
    console.error(`FAIL verify-asar-freshness：读不到 docs/baseline.json（${err.message}）`)
    process.exit(1)
  }
  const recorded = baseline.structure?.zcodeAsarStyles
  const current = readAsarStyles()

  if (current === null) {
    console.log('SKIP verify-asar-freshness：本机未装 ZCode（无 ' + ZCODE_ASAR + '），上游哨兵不适用')
    process.exit(0)
  }
  if (!recorded || !Array.isArray(recorded.files) || recorded.files.length === 0) {
    console.error('FAIL verify-asar-freshness：基线缺失——先跑 node --import tsx scripts/baseline.mjs 把 structure.zcodeAsarStyles 登记进 docs/baseline.json')
    process.exit(1)
  }

  const recordedKey = recorded.files.map(f => `${f.path}:${f.sha256}`).sort().join('|')
  const currentKey = current.map(f => `${f.path}:${f.sha256}`).sort().join('|')
  if (recordedKey !== currentKey) {
    const oldNames = recorded.files.map(f => f.path.split('/').pop()).join(', ')
    const newNames = current.map(f => f.path.split('/').pop()).join(', ')
    console.error('FAIL verify-asar-freshness：ZCode 上游已更新，需全量重对照')
    console.error(`  基线（docs/baseline.json）：${oldNames}`)
    console.error(`  当前装机 asar：          ${newNames}`)
    console.error('  处置：① 重跑 node --import tsx scripts/baseline.mjs 登记新哈希；')
    console.error('        ② 按夜跑流程重采受影响的真值（styles 工具类/主题令牌全量 grep）——')
    console.error('          仓库里引用旧 styles-NK68EN_n 的注释与断言全部待复核。')
    process.exit(1)
  }
  console.log(`PASS verify-asar-freshness：上游 styles 与基线一致（${current.map(f => f.path.split('/').pop()).join(', ')}，asar mtime ${recorded.asarMtime ?? '未知'}）`)
}
