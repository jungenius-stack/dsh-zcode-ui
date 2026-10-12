import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZCODE_DARK, ZCODE_LIGHT, ZCODE_STRUCTURAL } from '../src/client/zcode-tokens.ts'

// 换肤静默失效守卫：src/ 里消费的每个 --dsw-* 令牌都必须在 zcode-tokens.ts 的
// 映射表（ZCODE_LIGHT / ZCODE_DARK / ZCODE_STRUCTURAL 任一）中有定义，
// 否则该处会回落到宿主原生色或兜底值，且不会有任何报错。

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }
    if (/\.(?:ts|tsx|mjs)$/.test(name)) out.push(full)
  }
  return out
}

const defined = new Set([
  ...Object.keys(ZCODE_LIGHT),
  ...Object.keys(ZCODE_DARK),
  ...Object.keys(ZCODE_STRUCTURAL),
])

const consumed = new Map()
for (const file of walk(join(root, 'src'))) {
  const lines = readFileSync(file, 'utf8').split('\n')
  for (const [i, line] of lines.entries()) {
    for (const match of line.matchAll(/var\(\s*(--dsw-[a-z0-9-]+)/g)) {
      const name = match[1]
      if (!consumed.has(name)) consumed.set(name, [])
      consumed.get(name).push(`${file.slice(root.length + 1)}:${i + 1}`)
    }
  }
}

const missing = [...consumed.keys()].filter(name => !defined.has(name)).sort()
if (missing.length > 0) {
  console.error('✗ token-coverage: 以下 --dsw-* 令牌被 src/ 消费但未在 zcode-tokens.ts 定义：')
  for (const name of missing) {
    console.error(`  ${name}  ←  ${consumed.get(name).join(', ')}`)
  }
  process.exit(1)
}
console.log(`✓ token-coverage: ${consumed.size} 个被消费的 --dsw-* 令牌全部有映射`)
