/*
 * ⚠ 构建输出隔离（2026-10-27，防「构建覆写部署文件」事故）
 *
 * 历史：outDir 曾是 'lib'，而 lib/ 就是 DSH profile 实际加载的部署目录
 * （~/.dsh/profiles/desktop/node_modules/dsh-zcode-ui 软链到本仓）。
 * tsdown 直接覆写 lib/client.js，若此刻页面 reload，宿主读到半截文件 →
 * `dsh-zcode-ui: import failed` → web boot 崩。2026-10-27 一天内发生 3 次。
 *
 * 现在：构建只写 dist/，部署由 `design-language/automation/safe-sync.sh`
 * 做 parse 校验 + 原子 mv 完成。**构建期间 lib/ 始终是上一次的完整产物**，
 * reload 永远读不到半截文件。
 *
 * package.json 的 main/exports/types 仍指向 lib/（npm 包对外契约不能改），
 * 所以同步脚本会把 dist/ 的内容落到 lib/。
 */
const packageId = 'dsh-zcode-ui'
const buildMode = process.env.NODE_ENV ?? 'production'

export default [
  {
    entry: ['src/index.ts', 'src/session-title-plugin.ts'],
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    dts: true,
    clean: true,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'dist',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    // React 由 DSH 的客户端模块表提供；内联会生成第二份 React 实例，导致 Hooks 失效。
    deps: {
      neverBundle: ['react', 'react-dom', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'],
      alwaysBundle: ['lucide-react'],
      onlyBundle: ['lucide-react'],
    },
    // CJS 根入口会带入全部图标；固定到 ESM 入口以保留摇树优化。
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react.mjs',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(buildMode),
      'import.meta.env.MODE': JSON.stringify(buildMode),
      'import.meta.env': JSON.stringify({ MODE: buildMode }),
    },
    dts: false,
    clean: false,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
]
