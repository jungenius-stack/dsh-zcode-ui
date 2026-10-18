/**
 * 视觉取证：把插件真实样式表 + 真实令牌渲染成可目视复核的截图。
 *
 * ## 为什么需要它
 *
 * 审美判断不能只读源码。KNOWN-ISSUES §28 的教训是「数字全绿但图明显崩坏，以图为准」，
 * 而布局脚本只输出布尔值——它们能证明「某值等于 16px」，证明不了「这一屏看起来对不对」。
 *
 * 本脚本不参与门禁判定（它只出图，不 assert 视觉），用途是：
 *   1. 改造前后各跑一次，用 `compare_visual_audit` 做像素级差分；
 *   2. 人工用 read_image 分区域目视复核（AGENTS.md 第四节第 5 条要求 ≥2 次）。
 *
 * ## 令牌来源与布局脚本一致
 *
 * 走 `fixture-tokens.mjs`，不手抄令牌。缺哪一层都会静默回退成"看起来合理但错误"的值。
 *
 * 用法：node scripts/visual-audit.mjs [输出目录]
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

/** 侧栏会话树：包含分组头、项目行、会话行、选中态、运行中指示、空态。 */
const sidebarMarkup = () => `
<aside class="dcu-root">
  <div class="dcu-expanded-shell">
    <header class="dcu-head">
      <button class="dcu-brand"><span style="font-weight:600;font-size:13px">DeepSeek</span></button>
      <div class="dcu-head-actions">
        <button class="dcu-icon" aria-label="搜索"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg></button>
        <button class="dcu-icon" aria-label="新建"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10"/></svg></button>
      </div>
    </header>
    <nav class="dcu-menu">
      <button><span class="dcu-menu-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="11" height="11" rx="2"/></svg></span><span>任务</span><span class="dcu-menu-kbd" aria-hidden="true"><span>⌘</span><span>N</span></span></button>
      <button aria-expanded="true"><span class="dcu-menu-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.5"/></svg></span><span>扩展</span></button>
      <button><span class="dcu-menu-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg></span><span>搜索</span><span class="dcu-menu-kbd" aria-hidden="true"><span>⌘</span><span>K</span></span></button>
    </nav>
    <div class="dcu-workspaces">
      <div class="dcu-wb">
        <div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true"><span class="dcu-wb-section-caret"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3 8 6l-3.5 3"/></svg></span><span>置顶</span></button></div>
        <div class="dcu-wb-section-body" data-open="true"><div>
          <div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">优化UI插件区</span></div>
          <div class="dcu-wb-session dcu-wb-selected"><span class="dcu-wb-session-title">逆向 ZCode UI 结构并改造插件</span></div>
          <div class="dcu-wb-session"><span class="dcu-wb-session-title">修复页脚溢出的峰值条</span></div>
          <div class="dcu-wb-session"><span class="dcu-wb-session-title">白鹈鹕海边公路骑行 3D 单文件</span></div>
        </div></div>
        <div class="dcu-wb-section-head"><button class="dcu-wb-section-label" aria-expanded="true"><span class="dcu-wb-section-caret"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3 8 6l-3.5 3"/></svg></span><span>工作区</span></button></div>
        <div class="dcu-wb-section-body" data-open="true"><div>
          <div class="dcu-wb-ungrouped">
            <div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">WorkBuddy AI</span><span class="dcu-wb-collection-count">18</span></div>
            <div class="dcu-wb-session"><span class="dcu-wb-session-title">设计令牌真值提取</span></div>
            <div class="dcu-wb-session"><span class="dcu-wb-session-title">侧栏开合改合成层</span></div>
          </div>
          <div class="dcu-wb-ungrouped">
            <div class="dcu-wb-project-head dcu-wb-project"><span class="dcu-wb-project-title">踩坑专家项目</span><span class="dcu-wb-collection-count">3</span></div>
            <div class="dcu-wb-empty">这个工作区还没有会话</div>
          </div>
        </div></div>
      </div>
    </div>
    <footer class="dcu-foot"><div class="dcu-footer-actions"><button class="dcu-footer-link"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/></svg><span>设置</span></button></div></footer>
  </div>
</aside>`

/** 设置页：导航列 + 卡片 + 开关 + 按钮组。 */
const settingsMarkup = () => `
<div class="dcu-settings-page">
  <nav class="dcu-settings-nav">
    <div class="dcu-settings-nav-group"><div class="dcu-settings-nav-title">常规</div>
      <button class="dcu-settings-trigger" aria-current="page"><span>外观</span></button>
      <button class="dcu-settings-trigger"><span>模型</span></button>
      <button class="dcu-settings-trigger"><span>快捷键</span></button>
    </div>
  </nav>
  <section class="dcu-settings-content">
    <h1 class="dcu-settings-title">外观</h1>
    <p class="dcu-settings-desc">主题、字号与界面密度。</p>
    <div class="dcu-settings-card">
      <div class="dcu-settings-row"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px"><div><div style="font-size:var(--dsw-font-size-base);line-height:20px">跟随系统主题</div><div style="margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--sp-muted)">系统切换深浅色时自动跟随。</div></div><button class="dcu-settings-switch" aria-checked="true"><span class="dcu-settings-switch-thumb"></span></button></div></div>
      <div class="dcu-settings-row"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px"><div><div style="font-size:var(--dsw-font-size-base);line-height:20px">紧凑模式</div><div style="margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--sp-muted)">减小列表行高以容纳更多会话。</div></div><button class="dcu-settings-switch" aria-checked="false"><span class="dcu-settings-switch-thumb"></span></button></div></div>
    </div>
  </section>
</div>`

/** 新建会话页：hero 标题 + 建议卡。 */
const homeMarkup = () => `
<div class="dcu-home">
  <div class="dcu-home-hero"><h1 class="dcu-home-title">今天想做什么？</h1><p class="dcu-home-subtitle">描述任务，或从下面的建议开始。</p></div>
  <div class="dcu-home-suggestions">
    <button class="dcu-home-suggestion"><span class="dcu-home-suggestion-title">梳理这个仓库的目录结构</span><span class="dcu-home-suggestion-desc">输出分层与关键入口</span></button>
    <button class="dcu-home-suggestion"><span class="dcu-home-suggestion-title">修复构建失败</span><span class="dcu-home-suggestion-desc">定位最近的改动</span></button>
  </div>
</div>`

const outputDir = path.resolve(process.argv[2] ?? 'visual-audit')
await mkdir(outputDir, { recursive: true })

/**
 * 收集全部样式层。
 *
 * 插件没有单一入口样式表：皮肤层在 `zcode-skin.ts`（宿主 `--dsw-*` 令牌）、
 * 主题层在 `zcode-theme.ts`（`--dcu-*` 色板与动效）、侧栏外壳在 `CodexSidebar.tsx`
 * 的 `stylesheet`，而**工作区树另有 `WORKSPACE_TREE_STYLE`**（由 CodexWorkspaceBrowser 导出，
 * 侧栏与频道页共用）、设置页在 `settings-page-styles.ts`、新建页在 `new-conversation-style.ts`。
 *
 * 漏任何一层，夹具渲染出来的就是**没有样式的一堆文字**——第一次跑本脚本正是这样：
 * 只注入侧栏那份时，`.dcu-wb-*` 全部无样式，截图看起来"设计崩了"，其实是取证方法错了。
 * 这类假信号与 CODE-042（探针失真）同源，所以这里显式列全并在缺失时报错。
 */
const read = (await import('node:fs')).readFileSync
const grab = (file, pattern, label) => {
  const found = read(`src/client/${file}`, 'utf8').match(pattern)?.[1]
  if (found === undefined) throw new Error(`取不到 ${label}（${file}）；变量名或模板串边界被改时需要同步本脚本`)
  return found
}
// 皮肤层是函数生成的，运行时渲染以避免手抄令牌。
const { renderSkinCss } = await import('../src/client/zcode-skin.ts')
const styledLayers = [
  grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/, '主题层'),
  renderSkinCss(),
  grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/, '侧栏外壳'),
  grab('CodexWorkspaceBrowser.tsx', /const stylesheet = `([\s\S]*?)`/, '工作区树'),
  grab('CodexWorkspaceBrowser.tsx', /const runningStyles = `([\s\S]*?)`/, '运行中指示'),
  grab('CodexWorkspaceBrowser.tsx', /const typographyStyles = `([\s\S]*?)`/, '工作区排版'),
  grab('CodexWorkspaceBrowser.tsx', /const collectionLayoutStyles = `([\s\S]*?)`/, '工作区分组布局'),
  grab('settings-page-styles.ts', /export const settingsPageStyles = `([\s\S]*?)`/, '设置页'),
  grab('new-conversation-style.ts', /export const NEW_CONVERSATION_STYLE = `([\s\S]*?)`/, '新建会话页'),
  grab('composer-tool-menus.ts', /export const COMPOSER_TOOL_MENU_STYLE = `([\s\S]*?)`/, '输入工具菜单'),
]


const browser = await chromium.launch({ headless: true })
const shots = []
try {
  for (const dark of [false, true]) {
    for (const [name, markup, width, height] of [
      ['sidebar', sidebarMarkup(), 240, 720],
      ['settings', settingsMarkup(), 900, 620],
      ['home', homeMarkup(), 820, 560],
    ]) {
      const page = await browser.newPage()
      await page.setViewportSize({ width, height })
      await page.setContent(`<!doctype html><style>
        *{box-sizing:border-box}
        html,body{margin:0;height:100%}
        body{background:var(--dsw-alias-bg-base);font-family:var(--dsw-font-family);color:var(--dsw-alias-label-primary)}
      </style>${markup}`)
      await page.addStyleTag({ content: fixtureTokenStyle(dark ? 'dark' : 'light') })
      await page.evaluate(dark => document.body.toggleAttribute('data-ds-dark-theme', dark), dark)
      // 样式层在真实应用里是分散注入的（见 collectStyleLayers 的说明），这里按同样顺序全量上。
      for (const css of styledLayers) await page.addStyleTag({ content: css })
      await page.waitForTimeout(120)
      const file = path.join(outputDir, `${name}-${dark ? 'dark' : 'light'}.png`)
      await page.screenshot({ path: file })
      shots.push(file)
      await page.close()
    }
  }
} finally {
  await browser.close()
}
await writeFile(path.join(outputDir, 'index.json'), JSON.stringify({ shots }, null, 2))
console.log(shots.join('\n'))
