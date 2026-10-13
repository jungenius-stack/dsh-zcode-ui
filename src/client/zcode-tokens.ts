/**
 * ZCode → DSH 设计令牌映射表（配色 token 提取层）。
 *
 * 本文件由 2026-10-12 11:04:42 会话的 tokens.ts 移植而来（同一映射口径，
 * 经真实 Chrome 截图逐像素核对：亮色画布 rgb(248,248,248)、
 * 暗色 rgb(22,22,22)，与 ZCode `--color-background` 一致）。
 *
 * 这里只做一件事：把 ZCode 的语义色（`--color-*`，取自
 * `ZCode/packages/ui/src/styles.css` 的 `.theme-zai-light` / `.theme-zai-dark`
 * 与 `@theme` 基准块）翻译成 DSH 客户端实际消费的令牌名
 * （`--dsw-alias-*` / `--dsw-static-*` / `--dsw-radius-*`）。
 *
 * 关键约束：本模块不引入 ZCode 的任何运行时（Zustand / RPC / services）。
 * ZCode 在此仅作为「设计值来源」，产出是纯 CSS 变量，由 DSH 自己的渲染器消费。
 *
 * 映射策略分三层，逐层收窄：
 *   1. `--dsw-static-*` 原始色板 —— 让整棵派生树（别名引用静态）整体偏移到 ZCode 色域；
 *   2. `--dsw-alias-*` 语义别名 —— 对 ZCode 显式定义过的角色（品牌、背景、边框、文字、
 *      状态色）做精确覆盖，避免依赖 DSH 内部的推导链路；
 *   3. 排版 / 圆角 / 阴影 / 滚动条 —— ZCode 的 `--ui-font-size` 相对刻度与
 *      Tailwind 圆角标度。
 */

/** DSH 令牌名（含 `--` 前缀）→ CSS 值。 */
export type TokenMap = Readonly<Record<string, string>>

/**
 * ZCode Zai Light 的语义色，按 DSH 令牌名归类。
 *
 * 取值口径：ZCode `--color-background` 等语义变量在 Zai Light 下的最终值。
 * 半透明值刻意保留 alpha 形式，因为 DSH 会把同一令牌叠在多种底色上。
 */
export const ZCODE_LIGHT: TokenMap = {
  // ── 画布与层级表面 ────────────────────────────────────────────────
  // ZCode: --color-background / --color-sidebar / --color-panel|header / --color-card
  '--dsw-static-neutral-bluish-950': '#f8f8f8',
  '--dsw-static-neutral-bluish-875': '#f0f0f0',
  '--dsw-static-neutral-bluish-850': '#f0f0f0',
  '--dsw-static-neutral-bluish-800': '#e6e6e6',
  '--dsw-static-neutral-bluish-750': '#dcdcdc',
  '--dsw-static-neutral-bluish-700': '#cfcfcf',
  '--dsw-static-neutral-bluish-600': '#b8b8b8',
  '--dsw-static-neutral-bluish-500': '#8f8f8f',
  '--dsw-static-neutral-bluish-400': '#6b6b6b',
  '--dsw-static-neutral-bluish-300': '#545454',
  '--dsw-static-neutral-bluish-200': '#3a3a3a',
  '--dsw-static-neutral-bluish-150': '#f0f0f0',
  '--dsw-static-neutral-bluish-100': '#e6e6e6',
  '--dsw-static-neutral-bluish-75': '#f0f0f0',
  '--dsw-static-neutral-bluish-60': '#f0f0f0',
  '--dsw-static-neutral-bluish-50': '#f8f8f8',
  '--dsw-static-neutral-bluish-00': '#ffffff',
  '--dsw-static-neutral-bluish-1000': '#0d0d0d',

  '--dsw-alias-bg-base': '#f8f8f8',
  '--dsw-alias-bg-layer-1': '#ffffff',
  '--dsw-alias-bg-layer-2': '#ffffff',
  '--dsw-alias-bg-layer-3': '#ffffff',
  '--dsw-alias-bg-layer-4': '#f0f0f0',
  '--dsw-alias-bg-overlay': '#ffffff',
  // 选中态统一走中性：宿主用它表达"已选模块"。ZCode 原值为 accent #ebf4ff（蓝），
  // 但侧栏的选中态是中性 rgba(13,13,13,.05)，同一套皮肤两种语言 —— 此处改中性，见 KNOWN-ISSUES §3.1
  '--dsw-alias-bg-module-platform': '#efefef',
  '--dsw-alias-bg-multi-select': '#f0f0f0',
  '--dsw-alias-bg-l1': '#ffffff',
  '--dsw-alias-bg-l2': '#ffffff',
  '--dsw-alias-background-secondary': '#ffffff',
  '--dsw-alias-bg-document-preview': '#f5f5f5',
  '--dsw-alias-bg-document-selection': 'rgba(11, 127, 255, 0.4)',
  '--dsw-alias-bg-skeleton': 'rgba(13, 13, 13, 0.04)',
  '--dsw-alias-bg-mask-1': 'rgba(13, 13, 13, 0.24)',
  '--dsw-alias-bg-mask-2': 'rgba(13, 13, 13, 0.12)',
  '--dsw-alias-bg-mask-3': 'rgba(13, 13, 13, 0.48)',
  '--dsw-alias-bg-mask-photo': 'rgba(0, 0, 0, 0.88)',
  '--dsw-alias-bg-mask-drop': 'rgba(255, 255, 255, 0.7)',

  // ── 边框 ──────────────────────────────────────────────────────────
  // ZCode: --color-border / --color-border-hover（基于 neutral-950 的 alpha 阶梯）
  '--dsw-alias-border-l1': 'rgba(13, 13, 13, 0.06)',
  '--dsw-alias-border-l2': 'rgba(13, 13, 13, 0.1)',
  '--dsw-alias-border-subtle': 'rgba(13, 13, 13, 0.1)',
  '--dsw-alias-border-l2-darkmode-thin': 'rgba(13, 13, 13, 0.1)',
  '--dsw-alias-border-l3': 'rgba(13, 13, 13, 0.12)',
  '--dsw-alias-border-l4': 'rgba(13, 13, 13, 0.16)',
  '--dsw-alias-border-inverted': 'rgba(13, 13, 13, 0.06)',
  '--dsw-alias-border-inverted2': 'rgba(13, 13, 13, 0.1)',
  '--dsw-alias-separator-primary': 'rgba(13, 13, 13, 0.1)',

  // ── 文字层级 ──────────────────────────────────────────────────────
  // ZCode: --color-foreground(neutral-800) 及其 subtle / subtlest 派生
  '--dsw-alias-label-primary': '#262626',
  '--dsw-alias-label-primary-foreground': '#ffffff',
  '--dsw-alias-label-primary-inverted': '#ffffff',
  '--dsw-alias-label-primary-dimmed': 'rgba(38, 38, 38, 0.6)',
  '--dsw-alias-label-primary-bluish': '#262626',
  '--dsw-alias-label-secondary': 'rgba(38, 38, 38, 0.6)',
  '--dsw-alias-label-tertiary': 'rgba(38, 38, 38, 0.5)',
  '--dsw-alias-label-caption': 'rgba(38, 38, 38, 0.4)',
  '--dsw-alias-label-dimmed': 'rgba(38, 38, 38, 0.3)',
  '--dsw-alias-label-quaternary': 'rgba(38, 38, 38, 0.35)',
  '--dsw-alias-label-error': '#e03131',
  '--dsw-alias-label-shimmer': 'rgba(13, 13, 13, 0.3)',
  '--dsw-alias-label-document-preview': '#5c5c5c',
  '--dsw-alias-menu-icon': 'rgba(38, 38, 38, 0.6)',

  // ── 品牌 ──────────────────────────────────────────────────────────
  // ZCode: --color-brand / --color-primary = #000000（中性黑，非蓝色）
  '--dsw-alias-brand-primary': '#000000',
  '--dsw-alias-brand-primary-invert': '#ffffff',
  '--dsw-alias-brand-text': '#000000',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': '#000000',
  '--dsw-alias-state-business-primary': '#000000',
  '--dsw-alias-state-business-tertiary': '#f0f0f0',

  // ── 按钮 ──────────────────────────────────────────────────────────
  '--dsw-alias-button-primary-fill': '#000000',
  '--dsw-alias-button-primary-hover': '#262626',
  '--dsw-alias-button-primary-dimmed': 'rgba(0, 0, 0, 0.08)',
  '--dsw-alias-button-contrast-fill': '#262626',
  '--dsw-alias-button-elevated-fill': '#ffffff',
  '--dsw-alias-button-floating-fill': '#ffffff',
  '--dsw-alias-button-floating-hover': '#f0f0f0',
  '--dsw-alias-button-ghost-active-fill': '#f0f0f0',
  '--dsw-alias-button-ghost-active-hover': '#e6e6e6',
  '--dsw-alias-button-ghost-active-border': 'rgba(13, 13, 13, 0.15)',
  '--dsw-alias-button-info-fill': '#000000',
  '--dsw-alias-button-info-hover': '#262626',
  '--dsw-alias-button-tool-bar-fill': 'rgba(84, 85, 87, 0.5)',
  '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(31, 31, 31, 0.36)',
  '--dsw-alias-button-tool-bar-hover': 'rgba(84, 85, 87, 0.6)',

  // ── 交互态 ────────────────────────────────────────────────────────
  // ZCode: --color-hover / --color-selected / --color-accent
  '--dsw-alias-interactive-bg-hover': 'rgba(13, 13, 13, 0.05)',
  '--dsw-alias-interactive-bg-hover-solid': '#f0f0f0',
  '--dsw-alias-interactive-bg-active': 'rgba(13, 13, 13, 0.08)',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(11, 127, 255, 0.12)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(224, 49, 49, 0.05)',
  '--dsw-alias-fill-l1': 'rgba(13, 13, 13, 0.03)',
  '--dsw-alias-fill-l2': 'rgba(13, 13, 13, 0.05)',
  '--dsw-alias-fill-tertiary': 'rgba(13, 13, 13, 0.05)',
  '--dsw-alias-fill-tsp-secondary': 'rgba(13, 13, 13, 0.03)',

  // ── 状态色 ────────────────────────────────────────────────────────
  // ZCode: --color-success / --color-destructive / --color-warning
  '--dsw-static-green-500': '#1e8a3e',
  '--dsw-static-green-400': '#1e8a3e',
  '--dsw-static-green-100': 'rgba(30, 138, 62, 0.12)',
  '--dsw-static-green-900': 'rgba(30, 138, 62, 0.12)',
  '--dsw-static-green-500-a08': 'rgba(30, 138, 62, 0.08)',
  '--dsw-static-green-500-a12': 'rgba(30, 138, 62, 0.12)',
  '--dsw-static-red-600': '#e03131',
  '--dsw-static-red-500': '#e03131',
  '--dsw-static-red-400': '#e03131',
  '--dsw-static-red-100': 'rgba(224, 49, 49, 0.12)',
  '--dsw-static-red-900': 'rgba(224, 49, 49, 0.12)',
  '--dsw-static-red-400-a12': 'rgba(224, 49, 49, 0.12)',
  '--dsw-static-red-600-a08': 'rgba(224, 49, 49, 0.08)',
  '--dsw-static-amber-500': '#e07b00',
  '--dsw-static-amber-400': '#e07b00',
  '--dsw-static-amber-600': '#e07b00',
  '--dsw-static-amber-100': 'rgba(224, 123, 0, 0.12)',
  '--dsw-static-amber-900': 'rgba(224, 123, 0, 0.12)',
  '--dsw-alias-state-success-primary': '#1e8a3e',
  '--dsw-alias-state-success-secondary': '#1e8a3e',
  '--dsw-alias-state-success-tertiary': 'rgba(30, 138, 62, 0.12)',
  '--dsw-alias-state-error-primary': '#e03131',
  '--dsw-alias-state-error-secondary': '#e03131',
  '--dsw-alias-state-warn-primary': '#e07b00',
  '--dsw-alias-state-warning-primary': '#e07b00',
  '--dsw-alias-state-warn-secondary': '#e07b00',
  '--dsw-alias-state-warn-label': '#e07b00',
  '--dsw-alias-state-warn-tertiary': 'rgba(224, 123, 0, 0.12)',
  '--dsw-alias-state-idle-primary': '#a2a2a2',

  // ── 链接与强调 ────────────────────────────────────────────────────
  // ZCode: --color-terminal-blue #0b7fff
  '--dsw-static-deepseek-500': '#0b7fff',
  '--dsw-static-deepseek-450': '#0b7fff',
  '--dsw-static-deepseek-400': '#0b7fff',
  '--dsw-static-deepseek-600': '#0066dd',
  '--dsw-static-deepseek-800': 'rgba(11, 127, 255, 0.12)',
  '--dsw-static-deepseek-100': 'rgba(11, 127, 255, 0.12)',
  '--dsw-static-deepseek-50': 'rgba(11, 127, 255, 0.06)',
  '--dsw-static-deepseek-200': 'rgba(11, 127, 255, 0.16)',
  '--dsw-static-deepseek-300': 'rgba(11, 127, 255, 0.24)',
  '--dsw-alias-link': '#0b7fff',
  '--dsw-alias-label-deep-diving': '#0b7fff',
  '--dsw-alias-label-deep-diving-shimmer': 'rgba(11, 127, 255, 0.3)',
  '--dsw-static-blue-500': '#0b7fff',
  '--dsw-static-blue-450': '#0b7fff',
  '--dsw-static-blue-400': '#0b7fff',
  '--dsw-static-blue-300': '#5ca7ff',
  '--dsw-static-blue-100': 'rgba(11, 127, 255, 0.12)',

  // ── Markdown / 代码块 ─────────────────────────────────────────────
  // ZCode: --color-card / --color-tag / --color-surface
  '--dsw-alias-markdown-code-block': '#f5f5f5',
  '--dsw-alias-markdown-code-block-banner': '#f0f0f0',
  '--dsw-alias-markdown-inline-code': '#f0f0f0',
  '--dsw-alias-markdown-tag': '#e6e6e6',
  '--dsw-alias-markdown-citation': '#f0f0f0',
  '--dsw-alias-markdown-placeholder': '#f5f5f5',
  '--dsw-alias-markdown-code-segment-selected': '#ffffff',
  '--dsw-alias-markdown-code-segment-unselected': '#f0f0f0',
  '--dsw-alias-turn-trigger-bg': '#f5f5f5',
  '--dsw-alias-turn-trigger-bg-hover': 'rgba(13, 13, 13, 0.05)',

  // ── Diff ──────────────────────────────────────────────────────────
  // ZCode: --color-diff-added #1e8a3e / --color-diff-removed #e03131
  '--dsw-alias-code-diff-added': 'rgba(30, 138, 62, 0.08)',
  '--dsw-alias-code-diff-deleted': 'rgba(224, 49, 49, 0.08)',
  '--dsw-alias-file-diff-added-bg': '#eaf7ee',
  '--dsw-alias-file-diff-added-gutter': '#f0faf3',
  '--dsw-alias-file-diff-added-marker': '#1e8a3e',
  '--dsw-alias-file-diff-deleted-bg': '#fcece9',
  '--dsw-alias-file-diff-deleted-gutter': '#fdf2f0',
  '--dsw-alias-file-diff-deleted-marker': '#e03131',

  // ── 滚动条 ────────────────────────────────────────────────────────
  '--dsw-alias-scrollbar-bg-l1': 'rgba(13, 13, 13, 0.15)',
  '--dsw-alias-scrollbar-bg-l2': 'rgba(13, 13, 13, 0.15)',
  '--dsw-alias-scrollbar-hover-l1': 'rgba(13, 13, 13, 0.25)',
  '--dsw-alias-scrollbar-hover-l2': 'rgba(13, 13, 13, 0.25)',

  // ── 浮层 / 提示 ───────────────────────────────────────────────────
  // ZCode: --color-toast / --color-tooltip / --color-tag
  '--dsw-alias-toast-bg': '#2b2b2b',
  '--dsw-alias-toast-label': '#ffffff',
  '--dsw-alias-tooltip-bg': '#f0f0f0',
  '--dsw-alias-tooltip-label': '#0d0d0d',
  '--dsw-alias-tooltip-key-bg': '#e6e6e6',
  '--dsw-alias-menu-group-header-fill': 'rgba(248, 248, 248, 0.94)',
  '--dsw-alias-switch-thumb': '#ffffff',
  '--dsw-alias-settings-card-fill': '#ffffff',
  '--dsw-alias-settings-card-stroke': 'rgba(13, 13, 13, 0.1)',
  '--dsw-alias-onboarding-accent': '#000000',
  '--dsw-alias-onboarding-card-fill': '#ffffff',
  '--dsw-alias-onboarding-secondary-fill': '#f0f0f0',
  '--dsw-alias-onboarding-checkbox-border': 'rgba(13, 13, 13, 0.15)',

  // ── 组件补漏（消费点引用、原先未映射导致换肤静默失效）─────────────
  // ZCode: --color-icon-blue（focus 环）/ --color-input / --color-menu-hover
  '--dsw-focus-ring-color': '#0b7fff',
  '--dsw-specific-input-major': '#ffffff',
  '--dsw-specific-menu-item-hover': '#f0f0f0',
}

/**
 * ZCode Zai Dark 的语义色，按 DSH 令牌名归类。
 *
 * 与 light 一一对应，取值口径为 ZCode `--color-*` 在 Zai Dark 下的最终值。
 */
export const ZCODE_DARK: TokenMap = {
  // ── 画布与层级表面 ────────────────────────────────────────────────
  // ZCode: --color-background #161616 / --color-panel #202020 / --color-card #2b2b2b
  '--dsw-static-neutral-bluish-950': '#161616',
  '--dsw-static-neutral-bluish-875': '#202020',
  '--dsw-static-neutral-bluish-850': '#202020',
  '--dsw-static-neutral-bluish-800': '#2b2b2b',
  '--dsw-static-neutral-bluish-750': '#363636',
  '--dsw-static-neutral-bluish-700': '#3f3f3f',
  '--dsw-static-neutral-bluish-600': '#4a4a4a',
  '--dsw-static-neutral-bluish-500': '#5c5c5c',
  '--dsw-static-neutral-bluish-400': '#747474',
  '--dsw-static-neutral-bluish-300': '#9a9a9a',
  '--dsw-static-neutral-bluish-200': '#b8b8b8',
  '--dsw-static-neutral-bluish-150': '#363636',
  '--dsw-static-neutral-bluish-100': '#3f3f3f',
  '--dsw-static-neutral-bluish-75': '#2b2b2b',
  '--dsw-static-neutral-bluish-60': '#2b2b2b',
  '--dsw-static-neutral-bluish-50': '#d4d4d4',
  '--dsw-static-neutral-bluish-00': '#f8f8f8',
  '--dsw-static-neutral-bluish-1000': '#161616',

  '--dsw-alias-bg-base': '#161616',
  '--dsw-alias-bg-layer-1': '#202020',
  '--dsw-alias-bg-layer-2': '#2b2b2b',
  '--dsw-alias-bg-layer-3': '#2b2b2b',
  '--dsw-alias-bg-layer-4': '#363636',
  '--dsw-alias-bg-overlay': '#2b2b2b',
  '--dsw-alias-bg-module-platform': '#3a3a3a',
  '--dsw-alias-bg-multi-select': '#363636',
  '--dsw-alias-bg-l1': '#202020',
  '--dsw-alias-bg-l2': '#2b2b2b',
  '--dsw-alias-background-secondary': '#2b2b2b',
  '--dsw-alias-bg-document-preview': '#161616',
  '--dsw-alias-bg-document-selection': 'rgba(64, 153, 255, 0.4)',
  '--dsw-alias-bg-skeleton': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-bg-mask-1': 'rgba(0, 0, 0, 0.5)',
  '--dsw-alias-bg-mask-2': 'rgba(0, 0, 0, 0.2)',
  '--dsw-alias-bg-mask-3': 'rgba(0, 0, 0, 0.48)',
  '--dsw-alias-bg-mask-photo': 'rgba(0, 0, 0, 0.88)',
  '--dsw-alias-bg-mask-drop': 'rgba(43, 43, 43, 0.7)',

  // ── 边框 ──────────────────────────────────────────────────────────
  // ZCode: --color-border rgba(255,255,255,.1) / hover .15
  '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.06)',
  '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-border-subtle': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-border-l2-darkmode-thin': 'rgba(255, 255, 255, 0.06)',
  '--dsw-alias-border-l3': 'rgba(255, 255, 255, 0.16)',
  '--dsw-alias-border-l4': 'rgba(255, 255, 255, 0.2)',
  '--dsw-alias-border-inverted': 'rgba(255, 255, 255, 0.06)',
  '--dsw-alias-border-inverted2': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-separator-primary': 'rgba(255, 255, 255, 0.1)',

  // ── 文字层级 ──────────────────────────────────────────────────────
  // ZCode: --color-foreground = neutral-300 #d4d4d4
  '--dsw-alias-label-primary': '#d4d4d4',
  '--dsw-alias-label-primary-foreground': '#000000',
  '--dsw-alias-label-primary-inverted': '#262626',
  '--dsw-alias-label-primary-dimmed': 'rgba(212, 212, 212, 0.6)',
  '--dsw-alias-label-primary-bluish': '#d4d4d4',
  '--dsw-alias-label-secondary': 'rgba(212, 212, 212, 0.6)',
  '--dsw-alias-label-tertiary': 'rgba(212, 212, 212, 0.5)',
  '--dsw-alias-label-caption': 'rgba(212, 212, 212, 0.4)',
  '--dsw-alias-label-dimmed': 'rgba(212, 212, 212, 0.3)',
  '--dsw-alias-label-quaternary': 'rgba(212, 212, 212, 0.35)',
  '--dsw-alias-label-error': '#ff5c5c',
  '--dsw-alias-label-shimmer': 'rgba(255, 255, 255, 0.45)',
  '--dsw-alias-label-document-preview': '#adadad',
  '--dsw-alias-menu-icon': 'rgba(212, 212, 212, 0.6)',

  // ── 品牌 ──────────────────────────────────────────────────────────
  // ZCode Zai Dark: --color-brand #ffffff / --color-primary #ffffff
  '--dsw-alias-brand-primary': '#ffffff',
  '--dsw-alias-brand-primary-invert': '#000000',
  '--dsw-alias-brand-text': '#ffffff',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': '#ffffff',
  '--dsw-alias-state-business-primary': '#ffffff',
  '--dsw-alias-state-business-tertiary': '#2b2b2b',

  // ── 按钮 ──────────────────────────────────────────────────────────
  '--dsw-alias-button-primary-fill': '#ffffff',
  '--dsw-alias-button-primary-hover': '#e5e5e5',
  '--dsw-alias-button-primary-dimmed': 'rgba(255, 255, 255, 0.16)',
  '--dsw-alias-button-contrast-fill': '#fafafa',
  '--dsw-alias-button-elevated-fill': '#2b2b2b',
  '--dsw-alias-button-floating-fill': '#2b2b2b',
  '--dsw-alias-button-floating-hover': '#363636',
  '--dsw-alias-button-ghost-active-fill': '#363636',
  '--dsw-alias-button-ghost-active-hover': '#3f3f3f',
  '--dsw-alias-button-ghost-active-border': 'rgba(255, 255, 255, 0.2)',
  '--dsw-alias-button-info-fill': '#ffffff',
  '--dsw-alias-button-info-hover': '#e5e5e5',
  '--dsw-alias-button-tool-bar-fill': 'rgba(84, 85, 87, 0.5)',
  '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(31, 31, 31, 0.36)',
  '--dsw-alias-button-tool-bar-hover': 'rgba(84, 85, 87, 0.6)',

  // ── 交互态 ────────────────────────────────────────────────────────
  // ZCode: --color-hover / --color-selected = rgba(255,255,255,.05|.1)
  '--dsw-alias-interactive-bg-hover': 'rgba(255, 255, 255, 0.05)',
  '--dsw-alias-interactive-bg-hover-solid': '#2b2b2b',
  '--dsw-alias-interactive-bg-active': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(64, 153, 255, 0.16)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgba(255, 92, 92, 0.12)',
  '--dsw-alias-fill-l1': 'rgba(255, 255, 255, 0.05)',
  '--dsw-alias-fill-l2': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-fill-tertiary': 'rgba(255, 255, 255, 0.08)',
  '--dsw-alias-fill-tsp-secondary': 'rgba(255, 255, 255, 0.05)',

  // ── 状态色 ────────────────────────────────────────────────────────
  // ZCode Zai Dark: --color-success #46bf72 / destructive #ff5c5c / warning #ff8a30
  '--dsw-static-green-500': '#46bf72',
  '--dsw-static-green-400': '#46bf72',
  '--dsw-static-green-100': 'rgba(70, 191, 114, 0.16)',
  '--dsw-static-green-900': 'rgba(70, 191, 114, 0.16)',
  '--dsw-static-green-500-a08': 'rgba(70, 191, 114, 0.08)',
  '--dsw-static-green-500-a12': 'rgba(70, 191, 114, 0.12)',
  '--dsw-static-red-600': '#ff5c5c',
  '--dsw-static-red-500': '#ff5c5c',
  '--dsw-static-red-400': '#ff5c5c',
  '--dsw-static-red-100': 'rgba(255, 92, 92, 0.16)',
  '--dsw-static-red-900': 'rgba(255, 92, 92, 0.16)',
  '--dsw-static-red-400-a12': 'rgba(255, 92, 92, 0.12)',
  '--dsw-static-red-600-a08': 'rgba(255, 92, 92, 0.08)',
  '--dsw-static-amber-500': '#ff8a30',
  '--dsw-static-amber-400': '#ff8a30',
  '--dsw-static-amber-600': '#ff8a30',
  '--dsw-static-amber-100': 'rgba(255, 138, 48, 0.16)',
  '--dsw-static-amber-900': 'rgba(255, 138, 48, 0.16)',
  '--dsw-alias-state-success-primary': '#46bf72',
  '--dsw-alias-state-success-secondary': '#46bf72',
  '--dsw-alias-state-success-tertiary': 'rgba(70, 191, 114, 0.16)',
  '--dsw-alias-state-error-primary': '#ff5c5c',
  '--dsw-alias-state-error-secondary': '#ff5c5c',
  '--dsw-alias-state-warn-primary': '#ff8a30',
  '--dsw-alias-state-warning-primary': '#ff8a30',
  '--dsw-alias-state-warn-secondary': '#ff8a30',
  '--dsw-alias-state-warn-label': '#ff8a30',
  '--dsw-alias-state-warn-tertiary': 'rgba(255, 138, 48, 0.16)',
  '--dsw-alias-state-idle-primary': '#5c5c5c',

  // ── 链接与强调 ────────────────────────────────────────────────────
  // ZCode Zai Dark: --color-terminal-blue #4099ff
  '--dsw-static-deepseek-500': '#4099ff',
  '--dsw-static-deepseek-450': '#4099ff',
  '--dsw-static-deepseek-400': '#4099ff',
  '--dsw-static-deepseek-600': '#80beff',
  '--dsw-static-deepseek-800': 'rgba(64, 153, 255, 0.16)',
  '--dsw-static-deepseek-100': 'rgba(64, 153, 255, 0.16)',
  '--dsw-static-deepseek-50': 'rgba(64, 153, 255, 0.08)',
  '--dsw-static-deepseek-200': 'rgba(64, 153, 255, 0.2)',
  '--dsw-static-deepseek-300': 'rgba(64, 153, 255, 0.3)',
  '--dsw-alias-link': '#4099ff',
  '--dsw-alias-label-deep-diving': '#4099ff',
  '--dsw-alias-label-deep-diving-shimmer': 'rgba(64, 153, 255, 0.3)',
  '--dsw-static-blue-500': '#4099ff',
  '--dsw-static-blue-450': '#4099ff',
  '--dsw-static-blue-400': '#4099ff',
  '--dsw-static-blue-300': '#80beff',
  '--dsw-static-blue-100': 'rgba(64, 153, 255, 0.16)',

  // ── Markdown / 代码块 ─────────────────────────────────────────────
  '--dsw-alias-markdown-code-block': '#202020',
  '--dsw-alias-markdown-code-block-banner': '#2b2b2b',
  '--dsw-alias-markdown-inline-code': '#2b2b2b',
  '--dsw-alias-markdown-tag': '#363636',
  '--dsw-alias-markdown-citation': '#2b2b2b',
  '--dsw-alias-markdown-placeholder': '#2b2b2b',
  '--dsw-alias-markdown-code-segment-selected': '#2b2b2b',
  '--dsw-alias-markdown-code-segment-unselected': '#202020',
  '--dsw-alias-turn-trigger-bg': '#2b2b2b',
  '--dsw-alias-turn-trigger-bg-hover': 'rgba(255, 255, 255, 0.05)',

  // ── Diff ──────────────────────────────────────────────────────────
  '--dsw-alias-code-diff-added': 'rgba(70, 191, 114, 0.12)',
  '--dsw-alias-code-diff-deleted': 'rgba(255, 92, 92, 0.12)',
  '--dsw-alias-file-diff-added-bg': '#1f3124',
  '--dsw-alias-file-diff-added-gutter': '#132016',
  '--dsw-alias-file-diff-added-marker': '#46bf72',
  '--dsw-alias-file-diff-deleted-bg': '#3c1f1b',
  '--dsw-alias-file-diff-deleted-gutter': '#28130e',
  '--dsw-alias-file-diff-deleted-marker': '#ff5c5c',

  // ── 滚动条 ────────────────────────────────────────────────────────
  '--dsw-alias-scrollbar-bg-l1': 'rgba(255, 255, 255, 0.15)',
  '--dsw-alias-scrollbar-bg-l2': 'rgba(255, 255, 255, 0.15)',
  '--dsw-alias-scrollbar-hover-l1': 'rgba(255, 255, 255, 0.25)',
  '--dsw-alias-scrollbar-hover-l2': 'rgba(255, 255, 255, 0.25)',

  // ── 浮层 / 提示 ───────────────────────────────────────────────────
  '--dsw-alias-toast-bg': '#2b2b2b',
  '--dsw-alias-toast-label': '#f8f8f8',
  '--dsw-alias-tooltip-bg': '#2b2b2b',
  '--dsw-alias-tooltip-label': '#f8f8f8',
  '--dsw-alias-tooltip-key-bg': '#363636',
  '--dsw-alias-menu-group-header-fill': 'rgba(32, 32, 32, 0.94)',
  '--dsw-alias-switch-thumb': '#f8f8f8',
  '--dsw-alias-settings-card-fill': '#2b2b2b',
  '--dsw-alias-settings-card-stroke': 'rgba(255, 255, 255, 0.1)',
  '--dsw-alias-onboarding-accent': '#ffffff',
  '--dsw-alias-onboarding-card-fill': '#2b2b2b',
  '--dsw-alias-onboarding-secondary-fill': '#363636',
  '--dsw-alias-onboarding-checkbox-border': 'rgba(255, 255, 255, 0.2)',

  // ── 组件补漏（消费点引用、原先未映射导致换肤静默失效）─────────────
  // ZCode: --color-icon-blue（focus 环）/ --color-input / --color-menu-hover
  '--dsw-focus-ring-color': '#4099ff',
  '--dsw-specific-input-major': '#2b2b2b',
  '--dsw-specific-menu-item-hover': '#363636',
}

/**
 * 与主题无关的 ZCode 结构令牌：圆角、阴影、字体栈、滚动条几何。
 *
 * ZCode 走 Tailwind v4 标度（sm 4px / md 6px / lg 8px / xl 12px），
 * 字体栈刻意在等宽栈里前置 CJK 无衬线族——见 ZCode `@theme` 块中
 * 「Consolas 不含中文字形」那条修复注释。
 */
export const ZCODE_STRUCTURAL: TokenMap = {
  // Tailwind 圆角标度
  '--dsw-radius-xs': '2px',
  '--dsw-radius-sm': '4px',
  '--dsw-radius-md': '6px',
  '--dsw-radius-lg': '8px',
  '--dsw-radius-xl': '12px',
  // ⚠ 这不是自家私有令牌，而是对**宿主**令牌的覆盖：宿主在 :root 定义
  //   --dsw-radius-panel:28px，被 Modal（对话框）、设置面板、反馈弹窗、浮动面板、
  //   以及会话区 calc(var(--dsw-radius-panel) - 4px) 的缩放角消费。
  //   本插件用 :root:root（(0,2,0)）压过宿主 :root（(0,1,0)），删掉这一行 = 上述表面
  //   全部回落到 28px（也是"宿主圆角命名空间被整体接管"的同一个机制，见 KNOWN-ISSUES）。
  //   取值 12px（一级容器）而非宿主的 28px：与卡片/控件同一语言，且相对上一版 10px 只 +2px。
  '--dsw-radius-panel': '12px',
  // 白名单大圆角（宪章仅允许：主聊天输入壳 / 会话状态浮层 / Toast / 品牌图标底盘）
  '--dsw-radius-2xl': '16px',
  // 胶囊：round-full 是「刻意的胶囊或圆形」，不因组件类型获得
  '--dsw-radius-full': '999px',

  // ZCode 阴影阶梯（--dsw-shadow-lv1..3 的 ZCode 等价强度）
  '--dsw-shadow-lv1': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '--dsw-shadow-lv1-blur': '0 2px 6px 0 rgba(0, 0, 0, 0.03)',
  '--dsw-shadow-lv2': '0 2px 8px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.06)',
  '--dsw-shadow-lv3': '0 0 1px 0 rgba(0, 0, 0, 0.2), 0 8px 24px 0 rgba(0, 0, 0, 0.08)',

  // ZCode 等宽栈（含 CJK 兜底）
  '--dsh-font-family-code-default':
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", monospace',
  '--dsw-font-family':
    'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',

  // ── 字号刻度 ──────────────────────────────────────────────────────────────
  // ZCode DESIGN.md 把 text-ui-* 七档刻度列为「Highest-priority UI constraint」，
  // 并明确「Treat violations of this section as design-system defects, not stylistic
  // preferences」。基准 --ui-font-size = 14px，其余各档相对基准计算；界面缩放只改
  // 基准，不动根字号，且图标/间距/圆角不随字号缩放。
  // 这里用 calc 相对 --dsw-font-size-base 表达，保留「改一处即可整体缩放」的性质。
  // 2xs(9px) 一并纳入以保持刻度完整，但 ZCode 限定其仅用于图表坐标轴，界面不消费。
  //
  // ── 展示档（2026-10-13 补）──────────────────────────────────────────────
  // ZCode 的七档刻度只覆盖界面排版（10–18px），页面级大字（设置页标题、关于页主标题、
  // 新建页 hero）此前落在刻度外，靠 §3.2 的「例外登记」存活。例外会繁殖：一处「暂不
  // 归并」会变成后来人照抄的借口。这里把三档补成制度，值与原例外**逐一对齐**（20/22/34px），
  // 因此这次收归不产生任何视觉变化，只是把「破例」变成「有据」。
  //
  // 与界面档的分界：display/headline/title 只用于页面标题与 hero，不得进入列表、
  // 控件或行内文本——它们是「版面」层级，不是「界面」层级。
  '--dsw-font-size-display': 'calc(var(--dsw-font-size-base) + 20px)',
  '--dsw-font-size-headline': 'calc(var(--dsw-font-size-base) + 8px)',
  '--dsw-font-size-title': 'calc(var(--dsw-font-size-base) + 6px)',
  '--dsw-font-size-base': '14px',
  '--dsw-font-size-xl': 'calc(var(--dsw-font-size-base) + 4px)',
  '--dsw-font-size-lg': 'calc(var(--dsw-font-size-base) + 2px)',
  '--dsw-font-size-caption': 'calc(var(--dsw-font-size-base) - 1px)',
  '--dsw-font-size-sm': 'calc(var(--dsw-font-size-base) - 2px)',
  '--dsw-font-size-xs': 'calc(var(--dsw-font-size-base) - 4px)',
  '--dsw-font-size-2xs': 'calc(var(--dsw-font-size-base) - 5px)',

  // ZCode 滚动条：细窄、透明轨道
  '--dsh-scrollbar-width': '8px',
  '--dsh-scrollbar-thumb-border': '2px',
}

/**
 * 渲染一个 CSS 变量块。
 * @param selector - 目标选择器。
 * @param tokens - 令牌映射。
 * @returns 形如 `selector{--a:b;--c:d}` 的 CSS 文本。
 */
export function renderTokenBlock(selector: string, tokens: TokenMap): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
  return `${selector}{${body}}`
}
