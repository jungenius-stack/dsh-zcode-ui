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

/**
 * 按主题态提取 `--dsw-*` 字面量令牌。
 *
 * ⚠️ 为什么必须分 modality：`zcode-tokens.ts` 里 `ZCODE_LIGHT` 与 `ZCODE_DARK` 是**两份
 * 同名的 TokenMap**（`'--dsw-alias-label-primary'` 等在两处都有定义）。旧实现把两份一起收进
 * 同一个 `:root{}`，于是**后写的暗色值恒胜**——合成页在亮色趟也拿到暗色令牌。
 * 后果不只是「亮色趟测到暗色」：凡是用 `--dsw-alias-*` 着色的元素在**暗色趟也会拿到亮色值**
 * （取决于谁写在后面），夹具量与真实宿主相反，且没有任何报错。
 *
 * 已知踩中处：`--dsw-alias-state-error-primary`（亮 #e03131 / 暗 #ff5c5c）与
 * `--dsw-alias-bg-layer-3`（亮 #ffffff / 暗 #2b2b2b）——后者会让「白字 on 错误底」的对比度
 * 在亮色趟算出 **#2b2b2b on #ff5c5c = 1.19:1** 这种物理上不存在的结果。
 * 见 docs/KNOWN-ISSUES.md §12.3 #2。
 */
/**
 * 把 `zcode-tokens.ts` 切成三段：ZCODE_LIGHT（亮色专属）／ZCODE_DARK（暗色专属）／
 * ZCODE_STRUCTURAL（与主题无关的圆角、字号、字体栈、滚动条几何）。
 *
 * ⚠️ 第三段必须单独拆出来：`ZCODE_STRUCTURAL` 在文件里排在 `ZCODE_DARK` **之后**。
 * 若只按「ZCODE_DARK 出现位置」切两段，结构段会被整段算作暗色专属，
 * 于是**亮色夹具拿不到任何 --dsw-radius-* / --dsw-font-size-***——
 * 实测表现为输入壳圆角 16px 变 0px、字号静默回退，而合成页面照样能渲染、只是量错。
 */
const themeTokenPairs = () => {
  const source = readFileSync(new URL('src/client/zcode-tokens.ts', root), 'utf8')
  const darkAt = source.indexOf('export const ZCODE_DARK')
  const structuralAt = source.indexOf('export const ZCODE_STRUCTURAL')
  if (darkAt < 0 || structuralAt < 0 || structuralAt < darkAt) {
    throw new Error('未在 zcode-tokens.ts 按顺序找到 ZCODE_DARK / ZCODE_STRUCTURAL（顺序或变量名被改时会失败）')
  }
  const extract = (text) => [...text.matchAll(/'(--dsw-[a-z0-9-]+)':\s*'([^']*)'/g)].map(([, name, value]) => `${name}:${value}`)
  const light = extract(source.slice(0, darkAt))
  const darkSpecific = extract(source.slice(darkAt, structuralAt))
  const structural = extract(source.slice(structuralAt))
  if (light.length === 0 || darkSpecific.length === 0 || structural.length === 0) {
    throw new Error('未从 ZCODE_LIGHT / ZCODE_DARK / ZCODE_STRUCTURAL 提取到 --dsw-* 令牌')
  }
  return { light, dark: [...darkSpecific, ...structural], structural }
}

/** 从 zcode-theme.ts 提取全部 `:root{...}` 全局令牌（主色 + 动效五档），排除减少动态效果那一块。 */
const globalThemeTokens = () => {
  const source = readFileSync(new URL('src/client/zcode-theme.ts', root), 'utf8')
    .replace(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\n\}/g, '')
  const blocks = [...source.matchAll(/:root\{([^}]*)\}/g)].map(([, body]) => body.trim())
  if (blocks.length === 0) throw new Error('未从 zcode-theme.ts 找到 :root 令牌块')
  return blocks
}

/**
 * 合成页面用的令牌样式块：`:root{--dsw-* 仅对应主题态; --dcu-* 全局}`。
 *
 * `--dcu-*` 不需要分开：它们本来就按 `body[data-ds-dark-theme]` 作用域切换，
 * 由 `fixtureThemeStyle()` 原文提供。这里只需保证 `--dsw-*` 不吃错那份。
 *
 * `modality='both'` 只给**按 class 切换主题态**的夹具用（如
 * `verify-workspace-drop-layout.mjs` 的 `.light` / `.dark` 类）：两种令牌都在同一张
 * 样式表里，暗色在后。这类夹具**不得**用它断言颜色——颜色一律走 `'light'` / `'dark'`
 * 加 `body[data-ds-dark-theme]` 的路径。
 */
export const fixtureTokenStyle = (modality = 'light') => {
  const { light, dark, structural } = themeTokenPairs()
  const specific = modality === 'dark' ? dark : light
  const merged = [...specific, ...structural]
  if (modality === 'both') merged.push(...dark)
  return `:root{${[...merged, ...globalThemeTokens()].join(';')}}`
}

/** `ZCODE_THEME_STYLE` 原文（含按明暗作用域挂在 `.dcu-root` / `.dcu-settings-page` / `.dcu-home` 上的色板）。 */
export const fixtureThemeStyle = () => {
  const source = readFileSync(new URL('src/client/zcode-theme.ts', root), 'utf8')
  const style = source.match(/(?:export )?const ZCODE_THEME_STYLE = `([\s\S]*?)`/)?.[1]
  if (style === undefined) throw new Error('未从 zcode-theme.ts 取到 ZCODE_THEME_STYLE（变量名被改时会失败）')
  return style
}
