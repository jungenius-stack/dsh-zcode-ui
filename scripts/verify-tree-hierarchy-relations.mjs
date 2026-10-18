/**
 * 关系型 / 全量型布局断言（2026-10-18，设计审计 §07 的 A2–A6）。
 *
 * ## 为什么单独一个脚本
 *
 * 本仓已有的 21 个 verify 脚本几乎全是「单点阈值」与「白名单成员」断言
 * （某值 === 32px、某类名在登记表里）。2026-10-18 的设计审计指出的四类结构性问题
 * ——两级树被压平、第三档灰塌陷、组边界不可见、滚动边界硬切——**全都发生在
 * 「两个值之间的关系」与「名单之外」**，任何单点断言都抓不到。这里补的正是这两类：
 *
 *   A2 层级缩进      x(会话标题) − x(项目标题) ≥ 8px
 *   A3 组界节奏      组间留白 ≥ 8px 且必须 > 组内行距
 *   A4 滚动边界      树有 mask-image，或其后页脚有 box-shadow（二者必有其一）
 *   A6 令牌单一真源  客户端不得定义与 --dcu-* 语义重叠的自有变量名
 *
 * A1（明度阶梯 ΔL*≥6）依赖纯颜色计算，放在 conversation-visuals.assert.ts 里跑，
 * 不重复实现。A5（全量扫字面量 hex）放在 design-system.assert.ts 的既有棘轮旁，
 * 因为它需要扫全部客户端文件、且要剥掉 var() 回退值。
 *
 * ## 为什么必须真浏览器
 *
 * A2/A3 量的是**计算后的布局**：`padding-left:40px` 与「标题实际右移多少」之间隔着
 * flex 布局、图标宽度、gap —— 用「模板串 + 正则」量不出来（本仓 visual-audit.mjs
 * 那种做法在这里会给出假阳性）。A4 量的是 computed style 的合成属性。
 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { fixtureTokenStyle } from './fixture-tokens.mjs'

const root = new URL('../', import.meta.url)
const grab = (file, re, label) => {
  const m = readFileSync(new URL(`src/client/${file}`, root), 'utf8').match(re)
  assert.ok(m !== null, `${label}：样式抽取失败（变量名被改时这里会先红）`)
  return m[1]
}

const themeStyle = grab('zcode-theme.ts', /export const ZCODE_THEME_STYLE = `([\s\S]*?)`/, '主题样式')
const workspaceStyles = [
  grab('CodexWorkspaceBrowser.tsx', /const stylesheet = `([\s\S]*?)`/, '工作区 stylesheet'),
  grab('CodexWorkspaceBrowser.tsx', /const runningStyles = `([\s\S]*?)`/, '工作区 runningStyles'),
  grab('CodexWorkspaceBrowser.tsx', /const typographyStyles = `([\s\S]*?)`/, '工作区 typographyStyles'),
  grab('CodexWorkspaceBrowser.tsx', /const collectionLayoutStyles = `([\s\S]*?)`/, '工作区 collectionLayoutStyles'),
].join('\n')
const sidebarStyle = grab('CodexSidebar.tsx', /const stylesheet = `([\s\S]*?)`/, '侧栏 stylesheet')

/**
 * 夹具：真实的两级树结构 —— 两个项目，第一个 2 条会话、第二个 1 条。
 *
 * 结构必须尽量贴近生产 DOM：`.dcu-wb-tree > .dcu-wb-section > .dcu-wb-section-body >
 * .dcu-wb-collections > .dcu-wb-project > .dcu-wb-project-head/.dcu-wb-project-body`。
 * 少一层就会量到不同结果（这也是本仓 KNOWN-ISSUES §22.5 记过的同类教训）。
 */
const treeFixture = `
<aside class="dcu-root">
  <div class="dcu-workspaces dcu-wb">
    <div class="dcu-wb-tree" role="tree">
      <section class="dcu-wb-section">
        <div class="dcu-wb-section-body" data-open="true">
          <div class="dcu-wb-collections">
            <div class="dcu-wb-project" id="proj-a">
              <div class="dcu-wb-project-head" role="treeitem" aria-level="1">
                <span class="dcu-wb-folder"></span>
                <span class="dcu-wb-project-title" id="proj-a-title">acme-web</span>
              </div>
              <div class="dcu-wb-project-body" data-open="true">
                <div class="dcu-wb-session" id="sess-a1"><span class="dcu-wb-session-title" id="sess-a1-title"><span class="dcu-wb-session-title-text">Refactor the settings shell</span></span></div>
                <div class="dcu-wb-session" id="sess-a2"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">Ship the dark theme pass</span></span></div>
              </div>
            </div>
            <div class="dcu-wb-project" id="proj-b">
              <div class="dcu-wb-project-head" role="treeitem" aria-level="1">
                <span class="dcu-wb-folder"></span>
                <span class="dcu-wb-project-title" id="proj-b-title">playground</span>
              </div>
              <div class="dcu-wb-project-body" data-open="true">
                <div class="dcu-wb-session" id="sess-b1"><span class="dcu-wb-session-title"><span class="dcu-wb-session-title-text">Draft the release notes</span></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
  <footer class="dcu-foot" id="foot"><div class="dcu-footer-actions"></div></footer>
</aside>`

const browser = await chromium.launch({ headless: true })
try {
  for (const dark of [false, true]) {
    const label = dark ? '暗色' : '亮色'
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}</style></head><body>${treeFixture}</body></html>`)
    await page.addStyleTag({ content: fixtureTokenStyle(dark ? 'dark' : 'light') })
    await page.addStyleTag({ content: themeStyle })
    await page.addStyleTag({ content: workspaceStyles })
    await page.addStyleTag({ content: sidebarStyle })
    if (dark) await page.evaluate(() => { document.body.setAttribute('data-ds-dark-theme', '') })
    await page.evaluate(() => {
      const tree = document.querySelector('.dcu-wb-tree')
      if (tree !== null) {
        tree.style.width = '240px'
        tree.style.height = '600px'
        tree.style.display = 'block'
      }
    })
    // 等一帧，确保样式与布局都已结算（否则会量到初次布局的旧值）。
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    const metrics = await page.evaluate(() => {
      const rect = (id) => document.getElementById(id).getBoundingClientRect()
      const style = (id) => getComputedStyle(document.getElementById(id))
      const tree = document.querySelector('.dcu-wb-tree')
      const foot = document.getElementById('foot')
      return {
        projectTitleLeft: rect('proj-a-title').left,
        sessionTitleLeft: rect('sess-a1-title').left,
        projectTitleSize: Number.parseFloat(style('proj-a-title').fontSize),
        sessionTitleSize: Number.parseFloat(style('sess-a1-title').fontSize),
        sessionPitch: rect('sess-a2').top - rect('sess-a1').top,
        sessionBottom: rect('sess-a2').bottom,
        nextProjectTop: rect('proj-b').top,
        treeMaskImage: getComputedStyle(tree).maskImage,
        treePaddingBottom: Number.parseFloat(getComputedStyle(tree).paddingBottom),
        footBoxShadow: getComputedStyle(foot).boxShadow,
      }
    })

    // ── A2 层级缩进（两层树必须在视觉上分得开）──────────────────────────
    // 意图：DSH 的组织主轴是 workspace → session 两级。会话标题必须**明显**右于项目标题，
    // 否则读者只能靠「有没有文件夹图标」区分从属关系（审计实测两者都是 46px / 14px / 400）。
    // 阈值 8px：小于 8px 在 13–14px 字号下不足以一眼看出缩进；同时不允许靠**降字号**
    // 来伪造层级（那会让会话标题比项目标题小，语义上是「次要内容」而不是「子项」）。
    const indent = metrics.sessionTitleLeft - metrics.projectTitleLeft
    assert.ok(indent >= 8,
      `${label}：会话标题必须比项目标题右缩进 ≥8px（实测 ${indent.toFixed(1)}px）——` +
      '两级树被压平时读者无法看出从属关系')
    assert.ok(metrics.sessionTitleSize <= metrics.projectTitleSize,
      `${label}：会话标题字号不得大于项目标题（实测 会话 ${metrics.sessionTitleSize}px / 项目 ${metrics.projectTitleSize}px）`)

    // ── A3 组界节奏（组间必须比组内松）──────────────────────────────────
    // ⚠ 这里**不能**用「pitch(项目→项目) − pitch(会话→会话)」：前者随会话条数变化
    // （1 条会话时 72px、2 条时 106px），拿它做减法的断言在当前缺陷状态下也是绿的
    // —— 审计原文的 A3 表达式就是这个问题。可量测的口径只有一个：
    // 「末行会话底 → 下一项目行顶」这段纯留白，它只由 `::after` 高度决定。
    const groupGap = metrics.nextProjectTop - metrics.sessionBottom
    const rowPitch = metrics.sessionPitch
    assert.ok(groupGap >= 8,
      `${label}：组间留白必须 ≥8px（实测 ${groupGap.toFixed(1)}px）——` +
      '组内 2px / 组间同样只有几 px 时，分组在视觉上不存在')
    assert.ok(groupGap > rowPitch - 32,
      `${label}：组间留白必须明显大于组内行距（实测 组间 ${groupGap.toFixed(1)}px / 组内行间距 ${(rowPitch - 32).toFixed(1)}px）`)

    // ── A4 滚动边界（内容不得在容器边缘被硬切）──────────────────────────
    // 二选一：树自己做了渐隐遮罩（mask-image），或它后面的页脚给了上投影（box-shadow）。
    // 两者皆无 = 内容硬切，看起来像渲染 bug（审计实测「最近」分区标题只露出上半截）。
    // 本仓选择后者（投影），因为 mask 会创建合成层，与 KNOWN-ISSUES §27/§31 的预算结论冲突。
    const hasMask = metrics.treeMaskImage !== 'none' && metrics.treeMaskImage !== ''
    const hasFootShadow = metrics.footBoxShadow !== 'none' && metrics.footBoxShadow !== ''
    assert.ok(hasMask || hasFootShadow,
      `${label}：滚动边界必须有交代——树用 mask-image 渐隐，或页脚有上投影，二者至少其一` +
      `（实测 mask=${metrics.treeMaskImage} / foot shadow=${metrics.footBoxShadow}）`)
    assert.ok(metrics.treePaddingBottom >= 16,
      `${label}：树底部必须给页脚投影/渐隐留出空间（实测 ${metrics.treePaddingBottom}px）`)

    console.log(`  ${label}：缩进 ${indent.toFixed(1)}px / 组间留白 ${groupGap.toFixed(1)}px / 滚动边界 ${hasMask ? 'mask' : 'foot-shadow'} ✔`)
    await page.close()
  }
} finally {
  await browser.close()
}

// ── A6 令牌单一真源（不得出现与 --dcu-* 语义重叠的自有变量名）────────────
// 审计的「断层四」：色阶真值曾同时存在于 zcode-theme.ts 与 ConnectorsSection.tsx 的
// iframe 色板里，后者自带 --muted/--text-2 一整套并行色板，完全不读 --dcu-*。
// 判据：客户端文件里 `--bg/--text/--muted/--line/--card/...` 这类**通用语义名**的定义，
// 只允许出现在两处 —— 主题真值源（zcode-theme.ts / zcode-tokens.ts），
// 以及 iframe 注入串（跨 document 不继承令牌，必须写字面量，见 ConnectorsSection 的说明）。
const { readdirSync } = await import('node:fs')
const OVERLAP_NAMES = ['--bg', '--card', '--line', '--text', '--text-2', '--muted', '--accent', '--accent-hover', '--shadow', '--ok', '--warn', '--bad']
// ① 令牌真值源：定义色板就是它们的本职，整份豁免。
// ② ConnectorsSection：iframe 注入串（跨文档不继承 CSS 变量，必须写字面量）。
//    2026-10-18（红队复核）：这里也从「整文件 include」改为「只放行该文件的 iframe 三个
//    模板串」——整文件豁免会把该文件里任何新写的通用色名也放行，与 A6 自己的注释矛盾。
const PALETTE_TRUTH_SOURCES = ['zcode-theme.ts', 'zcode-tokens.ts']
const IFRAME_INJECTION_FILE = 'ConnectorsSection.tsx'
/** iframe 注入串的行范围（只在这些行内放行通用色名）。 */
const iframeRanges = (() => {
  const text = readFileSync(new URL('src/client/' + IFRAME_INJECTION_FILE, root), 'utf8')
  const ranges = []
  for (const m of text.matchAll(/const (?:frameLightTheme|frameDarkTheme|frameSurfaceTheme) = `([\s\S]*?)`/g)) {
    ranges.push([m.index, m.index + m[0].length])
  }
  return ranges
})()
const violations = []
for (const name of readdirSync(new URL('src/client/', root))) {
  if (!/\.(?:ts|tsx)$/.test(name)) continue
  if (PALETTE_TRUTH_SOURCES.includes(name)) continue
  const text = readFileSync(new URL(`src/client/${name}`, root), 'utf8')
  const isIframeFile = name === IFRAME_INJECTION_FILE
  for (const token of OVERLAP_NAMES) {
    // 只认「定义」：`--name:` 出现在模板串或字符串里；排除注释掉的说明。
    const re = new RegExp('(?:^|[^\\w-])' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*[#a-zA-Z]', 'g')
    let hit = false
    for (const m of text.matchAll(re)) {
      // iframe 文件只放行「位于三个注入模板串内」的定义。
      if (isIframeFile && iframeRanges.some(([from, to]) => m.index >= from && m.index < to)) continue
      hit = true
    }
    if (hit) violations.push(`${name} 定义了 ${token}`)
  }
}
assert.deepEqual(violations, [],
  `客户端出现与 --dcu-* 语义重叠的并行色板：${violations.join('、')}。` +
  '色阶必须只有一个真源（zcode-theme.ts）；iframe 注入串是唯一例外（跨文档不继承令牌）。')
console.log('  A6：无并行色板（扣 iframe 注入串）✔')
console.log('✓ 关系型布局断言 A2/A3/A4/A6 全部通过')
