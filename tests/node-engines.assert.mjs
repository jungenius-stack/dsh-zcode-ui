#!/usr/bin/env node
/**
 * 前置体检：运行时版本与 `engines.node` 声明一致。
 *
 * 为什么需要：npm / pnpm 默认**只警告不阻止** engines 不满足。于是 Node < 22.15（`zlib.zstdCompress`
 * 尚未加入）跑本仓时，`tests/session-migration.spec.ts` 会抛
 *
 *   TypeError: The "original" argument must be of type function. Received undefined
 *
 * 这条报错完全看不出是版本问题——它指向 `promisify(zlib.zstdCompress)`，读起来像迁移逻辑的缺陷。
 * 2026-10-18 的体检里，这一条让整个门禁变红而无人归因。本断言把信号前移到第一层。
 *
 * 改 `package.json` 的 `engines.node` 时必须同步本文件的 SUPPORTED。
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

/** 与 package.json 的 `engines.node`（`^22.19.0 || >=24.0.0`）逐项对应。 */
const SUPPORTED = {
  declared: '^22.19.0 || >=24.0.0',
  check: (major, minor) => (major === 22 && minor >= 19) || major >= 24,
}

const [major, minor] = process.versions.node.split('.').map(Number)
const versionOk = SUPPORTED.check(major, minor)

// 第二道独立判据：即使版本号满足，也确认 zstd 真的存在（自定义构建 / 早于 API 落地的发行版）。
const zstdOk =
  typeof zlib.zstdCompress === 'function' &&
  typeof zlib.zstdDecompress === 'function' &&
  zlib.constants.ZSTD_c_checksumFlag !== undefined

if (!versionOk || !zstdOk) {
  console.error(`✗ node-engines: 当前 Node v${process.versions.node} 不满足 package.json 的 engines.node ${SUPPORTED.declared}`)
  if (!zstdOk) {
    console.error('  zlib.zstdCompress / zstdDecompress 不可用——tests/session-migration.spec.ts 会抛')
    console.error('  `The "original" argument must be of type function`，那不是迁移逻辑的缺陷。')
  }
  console.error('')
  console.error('  本机可用的满足版本：~/.workbuddy/binaries/node/versions/22.22.2-6/bin')
  console.error('    export PATH="$HOME/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"')
  console.error('  或安装 Node 24+。')
  process.exit(1)
}

console.log(`✓ node-engines: v${process.versions.node} 满足 ${SUPPORTED.declared}，zstd API 可用`)
