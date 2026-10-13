/**
 * 合成页面（fixture）的令牌注入 —— 布局脚本共用。
 *
 * ## 为什么需要它
 *
 * 布局脚本用 `page.setContent` 搭一个合成页面，只注入被测的样式表。问题是样式表里的
 * `var(--dsw-*)` / `var(--dcu-*)` 在合成页面里**没有定义**——而 CSS 变量缺失不会报错，
 * 只会静默回退（`font-size` 回退成继承值、`transition` 整条失效变 0s），
 * 于是断言量到一个「看起来合理但错误」的数字。
 *
 * 这个坑已经踩过两次，都是把字面量改成令牌之后发生的：
 *
 * 1. **P1-1**：工作区样式改用 `var(--dsw-font-size-*)` 后，合成页面缺令牌，
 *    空状态被误报「字体不统一」。
 * 2. **2026-10-13**：动效改用令牌后，`verify-sidebar-transition` 量到 `0s`、
 *    `verify-new-conversation` 量到 `16px`（hero 标题本该 34px）。
 *
 * ## 用法
 *
 * ```js
 * import { fixtureTokenStyle, fixtureThemeStyle } from './fixture-tokens.mjs'
 * await page.addStyleTag({ content: fixtureTokenStyle() })
 * ```
 *
 * 令牌**从源码真值提取，不手抄**：新增令牌只要定义在 `zcode-tokens.ts` 或
 * `zcode-theme.ts` 里，所有 fixture 自动获得，不需要逐个脚本补。
 *
 * ## 注意
 *
 * `fixtureTokenStyle()` 只给 `:root` 级的令牌。侧栏色板（`--dcu-sidebar-*` 等）挂在
 * `.dcu-root` 作用域上，需要渲染 `.dcu-root` 的 fixture 请另外注入 `fixtureThemeStyle()`。
 */
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)

/** 从 zcode-tokens.ts 提取全部 `'--dsw-*': '值'` 字面量令牌（含字号刻度、圆角、阴影）。 */
const structuralTokens = () => {
  const source = readFileSync(new URL('src/client/zcode-tokens.ts', root), 'utf8')
  const pairs = [...source.matchAll(/'(--dsw-[a-z0-9-]+)':\s*'([^']*)'/g)].map(([, name, value]) => `${name}:${value}`)
  if (pairs.length === 0) throw new Error('未从 zcode-tokens.ts 提取到任何 --dsw-* 令牌')
  return pairs
}

/** 从 zcode-theme.ts 提取全部 `:root{...}` 全局令牌（主色 + 动效五档），排除减少动态效果那一块。 */
const globalThemeTokens = () => {
  const source = readFileSync(new URL('src/client/zcode-theme.ts', root), 'utf8')
    .replace(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\n\}/g, '')
  const blocks = [...source.matchAll(/:root\{([^}]*)\}/g)].map(([, body]) => body.trim())
  if (blocks.length === 0) throw new Error('未从 zcode-theme.ts 找到 :root 令牌块')
  return blocks
}

/** 合成页面用的令牌样式块：`:root{--dsw-* 全量; --dcu-* 全局}`。 */
export const fixtureTokenStyle = () => `:root{${[...structuralTokens(), ...globalThemeTokens()].join(';')}}`

/** `ZCODE_THEME_STYLE` 原文（含按明暗作用域挂在 `.dcu-root` / `.dcu-settings-page` / `.dcu-home` 上的色板）。 */
export const fixtureThemeStyle = () => {
  const source = readFileSync(new URL('src/client/zcode-theme.ts', root), 'utf8')
  const style = source.match(/(?:export )?const ZCODE_THEME_STYLE = `([\s\S]*?)`/)?.[1]
  if (style === undefined) throw new Error('未从 zcode-theme.ts 取到 ZCODE_THEME_STYLE（变量名被改时会失败）')
  return style
}
