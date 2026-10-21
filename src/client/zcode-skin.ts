/**
 * ZCode 皮肤注入层（host 全局令牌覆盖）。
 *
 * 职责：把 {@link ./zcode-tokens.ts} 的令牌映射渲染成一张样式表，挂到
 * `document.head` 末尾，并在文档根上打一个可观测标记。
 *
 * 为什么不用 shadow DOM / 组件级样式：DSH Web 的整套视觉由
 * `--dsw-alias-*` 变量在 `body` 上驱动，任何组件都只消费这些变量。
 * 在变量层替换，等于在不触碰任何业务组件的前提下换掉全站外观——
 * 这也是「不复制 ZCode 的 Zustand/RPC/services」能成立的原因：
 * 我们只搬设计值，不搬任何运行时。
 *
 * 本插件在 dsh-codex-ui 脚手架上还接管了侧栏/工作区树/设置页的布局层
 * （见 `CodexSidebar.tsx` 等），那里的 `--dcu-*` 变量与这里的 host 令牌
 * 同源于 Zai 色板：host 令牌负责官方区域（标题栏、会话列、按钮、菜单），
 * `--dcu-*` 负责插件自有的侧栏外壳，两层互不冲突。
 *
 * 选择器优先级说明（这是本模块最容易出错的地方）：
 * DSH 官方主题插件用三档选择器下发调色板，特异性递增：
 *   body                                    → (0,0,1)
 *   body[data-ds-dark-theme]                → (0,1,1)
 *   html[data-platform=darwin] body         → (0,1,2)
 *   html[data-platform=darwin] body[dark]   → (0,2,2)
 * 因此这里统一使用 `:root:root` 前缀（`:root` 是伪类，每次出现计一个
 * b 分量），把特异性抬到 (0,2,1) / (0,3,1)，在不依赖样式表加载顺序的
 * 前提下确定性胜出——否则 macOS 上会因为 darwin 变体而局部漏改。
 */

import { renderTokenBlock, ZCODE_DARK, ZCODE_LIGHT, ZCODE_STRUCTURAL } from './zcode-tokens.ts'

/**
 * 皮肤版本；**改动令牌口径时递增**，便于排查线上残留。
 *
 * 与 package.json 的版本是**两条独立序列**，不要试图对齐：
 * 包版本跟着功能/移植走（如 1.13.0），皮肤版本只在「令牌口径或样式表内容发生变化」时递增。
 * 历史：1.0.0（初版）→ 1.2.0（收敛离标度几何）→ 1.3.0（见下）。
 * 2026-10-14 → 1.3.0：圆角字面量全部收归令牌、设置页 `--sp-*` 收归宿主语义令牌、
 * 菜单/浮层密度按宪章 §Menus 对齐（壳 lg + 项 md + p-1 + gap-0.5）。
 * 这三项都改变了样式表产出的声明，实机若仍挂着旧版可从 `data-dsh-zcode-skin` 一眼看出。
 * 2026-10-21 → 1.5.1：归档图标定位回到 right:8px，另含侧栏面的 clip-path 滑动规则。
 */
export const SKIN_VERSION = '1.5.1'

/** 注入到 `<html>` 上的标记属性，用于确认皮肤已激活。 */
export const SKIN_ATTRIBUTE = 'data-dsh-zcode-skin'

/** 样式标签的稳定标识，重复注入时用于去重。 */
const STYLE_TAG_ID = 'dsh-zcode-ui/skin.css'

/** 亮色令牌选择器：特异性 (0,2,1)，压过 DSH 全部 light 变体。 */
const LIGHT_SELECTOR = ':root:root body'

/** 暗色令牌选择器：特异性 (0,3,1)，压过 DSH 全部 dark 变体。 */
const DARK_SELECTOR = ':root:root body[data-ds-dark-theme]'

/**
 * 令牌之外的少量结构修正。
 *
 * 刻意只做一件事：`color-scheme`。原因是**本皮肤层**走令牌优先策略，
 * 不针对 DSH 的类名写规则——DSH 的组件样式是 CSS Module 哈希名
 * （形如 `._8HJdBW_group`），任何按类名写的覆盖都会在下次上游构建时
 * 静默失效，属于典型的「看着能用、升级即坏」。
 *
 * **边界说明（避免误读）**：这条纪律约束的是**皮肤层**（本文件）。插件的
 * **宿主集成层**无法回避哈希类名——要把新建会话页的排版、输入壳的发送键、
 * 工作区行接上去，只能按上游的块名定位（`[class*="_composerHero"]` 等 18 处）。
 * 那些锚点由 `host-anchor-contract.ts` 做存在性自检，缺失即报警；
 * 换句话说：**皮肤层不碰哈希类名，集成层必须碰，但碰了就得有人盯着。**
 *
 * 同样刻意**不**覆盖 `:focus-visible` 的 outline：DSH 用
 * `html[data-input-modality=pointer] body :focus-visible{outline-color:#0000}`
 * 实现「仅键盘操作才显示焦点环」。直接写 outline 会连鼠标点击也画出焦点环，
 * 属于可访问性回退。正确做法是覆盖它消费的变量
 * （`--dsw-focus-ring-width` / `--dsw-alias-state-business-primary`）——
 * 后者已在 ZCODE_LIGHT / ZCODE_DARK 里换成 ZCode 的品牌色，
 * 因此焦点环自动跟随 ZCode，且不破坏指针/键盘的区分逻辑。
 */
const STRUCTURE_CSS = `
/* 让原生控件（滚动条、输入框光标、选中高亮、表单默认外观）跟随皮肤，
   而不是跟随操作系统。两个选择器都带 :root:root 前缀以保证优先级。 */
:root:root body{color-scheme:light}
:root:root body[data-ds-dark-theme]{color-scheme:dark}
`.trim()

/**
 * 生成完整皮肤样式表。
 * @returns 可直接写入 `<style>` 的 CSS 文本。
 */
export function renderSkinCss(): string {
  const structural = [
    renderTokenBlock(':root:root', ZCODE_STRUCTURAL),
    renderTokenBlock(':root:root body', ZCODE_STRUCTURAL),
  ].join('')

  return [
    `/* dsh-zcode-ui — ZCode 皮肤 v${SKIN_VERSION}（设计值取自 zai-org/ZCode packages/ui/src/styles.css） */`,
    renderTokenBlock(LIGHT_SELECTOR, ZCODE_LIGHT),
    renderTokenBlock(DARK_SELECTOR, ZCODE_DARK),
    structural,
    STRUCTURE_CSS,
  ].join('\n')
}

/**
 * 把皮肤样式表安装到当前文档。
 *
 * 幂等：同名样式标签已存在时只做内容替换，不会重复插入。
 * 返回一个卸载函数，供 `ctx.effect` 在插件卸载时回收。
 *
 * @param doc - 目标文档；默认 `globalThis.document`。
 * @returns 卸载函数；无文档环境（SSR / 测试）时返回空操作。
 */
export function installSkin(doc: Document | undefined = globalThis.document): () => void {
  if (doc === undefined) return () => {}

  let tag = doc.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_TAG_ID}"]`)
  if (tag === null) {
    tag = doc.createElement('style')
    tag.dataset.plugin = 'dsh-zcode-ui'
    tag.dataset.pluginCss = STYLE_TAG_ID
    doc.head.appendChild(tag)
  }
  tag.textContent = renderSkinCss()

  const root = doc.documentElement
  const previous = root.getAttribute(SKIN_ATTRIBUTE)
  root.setAttribute(SKIN_ATTRIBUTE, SKIN_VERSION)

  return () => {
    tag?.remove()
    if (previous === null) root.removeAttribute(SKIN_ATTRIBUTE)
    else root.setAttribute(SKIN_ATTRIBUTE, previous)
  }
}
