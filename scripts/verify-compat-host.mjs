/** 对真实 DSH 宿主执行兼容性端到端检查；配套 fixture 仅用于隔离环境。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { SETTINGS_TRIGGER_SELECTOR } from '../src/client/settings-navigation.ts'

const target = process.env.DCU_DSH_URL
const workspace = process.env.DCU_E2E_WORKSPACE
if (!target || !workspace) throw new Error('需要 DCU_DSH_URL 和隔离的 DCU_E2E_WORKSPACE')
await mkdir(workspace, { recursive: true })
// 空目录的 @ 加载骨架会在零候选时消失；创建真实文件，验收稳定的候选内容。
await writeFile(`${workspace}/compat-reference.txt`, '兼容性引用候选文件\n', { flag: 'wx' })
const browser = await chromium.launch()
const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1440, height: 960 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const checks = []
const menuMeasurements = []
let failure
try {
  await page.addInitScript(workspace => localStorage.setItem('michengai.codex-ui.input-history.v1', JSON.stringify({ [workspace]: ['兼容性历史消息'] })), workspace)
  await page.goto(target)
  await page.waitForFunction(() => !!window.__dcuE2E)
  assert.match(await page.evaluate(() => window.__dcuE2E.ctx.locale.getSnapshot().active), /^zh/i, '本脚本明确验收中文环境')
  // 首次安装的官方引导通过页面按钮正常完成，不配置真实密钥。
  //
  // 2026-10-18（宿主 0.2.1-rc.2）：首启弹窗从「继续 / 稍后配置」改成了
  // 「开始使用 / 添加 API Key / 登录」+ 右上角关闭按钮，旧按钮名一个都不匹配，
  // 于是浮层留在原地。它的遮罩是 `role=presentation` + aria-hidden 的全屏层，
  // **会拦截所有 pointer 事件** —— 表现是后续 editor.click() 重试 60 次后超时，
  // 看起来像「输入框点不动」，实为引导没关。故改为：
  //   ① 优先点浮层自己的关闭按钮（aria-label=关闭，跨版本最稳）；
  //   ② 兜底再试各版本出现过的按钮名；
  //   ③ 最后断言遮罩确实消失，避免「点了但没关」被静默吞掉。
  const closeFirstRun = async () => {
    for (const name of ['关闭']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible().catch(() => false)) await button.click().catch(() => {})
    }
    for (const name of ['继续', '稍后配置', '跳过', '稍后再说']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible().catch(() => false)) await button.click().catch(() => {})
    }
    await page.waitForTimeout(200)
  }
  for (let i = 0; i < 3; i++) await closeFirstRun()
  // 遮罩必须真的消失：它若还在，后面所有点击都会被静默拦截，报错点却离真正原因很远。
  await page.waitForFunction(
    () => ![...document.querySelectorAll('[role=presentation]')].some(el => {
      const mask = el.querySelector('[class*="_mask_"]')
      if (mask === null) return false
      const rect = mask.getBoundingClientRect()
      return rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9
    }),
    undefined,
    { timeout: 10000 },
  ).catch(() => { throw new Error('首次引导的全屏遮罩未关闭：它会拦截所有 pointer 事件（见 verify-compat-host 顶部说明）') })
  const id = await page.evaluate(async workspace => {
    const ctx = window.__dcuE2E.ctx
    const item = await ctx.workspaces.create({ path: workspace })
    const id = await ctx.get('uiWorkspace').connectWorkspace(item.workspaceId)
    ctx.get('uiWorkspace').openSession(id)
    return id
  }, workspace)
  const editor = page.locator('[data-composer-input=true]')
  await editor.waitFor()
  const waitDraft = text => page.waitForFunction(text => {
    const c = window.__dcuE2E.ctx
    return c.conversation.input.for(c.sessions.binding(window.__dcuCurrentSessionId(c.sessions.list.getSnapshot())).ctx).state.getSnapshot().draft === text
  }, text)
  const clearEditor = async () => {
    await editor.click()
    await editor.press('ControlOrMeta+A')
    await editor.press('Backspace')
    await waitDraft('')
  }
  await clearEditor()
  await editor.press('ArrowUp')
  await page.waitForFunction(() => document.querySelector('[data-composer-input=true]')?.textContent === '兼容性历史消息')
  await waitDraft('兼容性历史消息')
  await clearEditor()
  await page.getByRole('button', { name: '探索并理解代码', exact: true }).click()
  await page.getByRole('button', { name: '了解项目结构', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-composer-input=true]')?.textContent.length > 0)
  const draft = await editor.innerText()
  assert.ok(draft.length > 0)
  checks.push('真实会话空白草稿建议预填')

  await page.getByRole('button', { name: '兼容测试面板', exact: true }).click()
  await page.locator('[data-e2e-panel]').waitFor()
  assert.equal(await page.locator('.dcu-menu [aria-label="兼容测试面板"]').getAttribute('aria-current'), 'page')
  // 2026-10-12 适配：上游插件的侧栏有「任务」导航项，点它即返回任务视图；ZCode 侧栏没有该入口
  // （实测再点面板入口、按 Escape 都无法返回，等于用户被困在面板里）。产品侧已按此补上显式的
  // 「返回会话」入口（只在全局面板打开时出现，动作是 selectPanel(null)），这里改为点它。
  await page.getByRole('button', { name: '返回会话', exact: true }).click()
  await editor.waitFor()
  assert.equal(await editor.innerText(), draft)
  assert.equal(await page.evaluate(() => window.__dcuCurrentSessionId(window.__dcuE2E.ctx.sessions.list.getSnapshot())), id)
  checks.push('全局面板切换、选中反馈、返回原会话并保留草稿')
  await page.getByRole('button', { name: '收缩侧边栏', exact: true }).click()
  // 必须等过渡真正结束再操作/测量：本 fork 的收缩沉降是 500ms（SIDEBAR_COLLAPSE_SETTLE_MS），
  // 上游脚本只等 350ms，会量到动画中间态——实测此时宿主 frame 会被横向滚走 264px（scrollWidth 1527），
  // 于是后续所有元素整体左移，最后误报"建议菜单越出视口"。
  await page.locator('.dcu-root:not(.dcu-collapsing)').waitFor()
  await page.waitForTimeout(150)
  await page.locator('.dcu-compact-nav').getByRole('button', { name: '兼容测试面板', exact: true }).click()
  await page.locator('[data-e2e-panel]').waitFor()
  // 紧凑轨同样没有上游的「任务」入口，改点产品侧补上的「返回会话」图标按钮（aria-label 同名）。
  await page.locator('.dcu-compact-nav').getByRole('button', { name: '返回会话', exact: true }).click()
  await editor.waitFor()
  await page.getByRole('button', { name: '展开侧边栏', exact: true }).click()
  await page.locator('.dcu-root:not(.dcu-collapsing)').waitFor()
  await page.waitForTimeout(150)
  await page.evaluate(() => window.__dcuE2E.remove())
  assert.equal(await page.locator('[aria-label="兼容测试面板"]').count(), 0)
  await page.evaluate(() => window.__dcuE2E.add())
  await page.getByRole('button', { name: '兼容测试面板', exact: true }).waitFor()
  checks.push('紧凑侧栏导航、动态注销与重新注册')

  await clearEditor()
  // 等待实际候选及加载完成，再严格断言几何；不把骨架出现当成列表就绪。
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme })
    await page.waitForFunction(dark => document.body.hasAttribute('data-ds-dark-theme') === dark, colorScheme === 'dark')
    for (const width of [1440, 900, 390]) {
      await page.setViewportSize({ width, height: 960 })
      // 2026-10-12：量几何前先把宿主 frame 的横向滚动归零。实测宿主的 rightbarCol 宽度为 0 却带 640px
      // 隐藏内容（来自 compat-panel 夹具面板），把 frame 的 scrollWidth 顶到 1540 > 视口；浏览器于是把 frame
      // 横滚 264px，所有 getBoundingClientRect 一起左移，最终误报「建议菜单越出视口」。归零后断言才在检查真实几何
      //（本插件侧的比例关系是对的：菜单与卡片 left/right 完全一致）。
      await page.evaluate(() => { for (const node of document.querySelectorAll('*')) if (node.scrollLeft > 0) node.scrollLeft = 0 })
      for (const trigger of ['/', '@']) {
        await editor.click()
        await editor.pressSequentially(trigger)
        const menu = page.locator('[data-trigger-menu]')
        await menu.waitFor()
        await menu.getByRole('option').first().waitFor()
        if (trigger === '@') await menu.getByRole('option').filter({ hasText: 'compat-reference.txt' }).waitFor()
        await menu.getByRole('status').waitFor({ state: 'detached' })
        const readGeometry = node => {
          const rect = node.getBoundingClientRect()
          const list = node.querySelector('[role=listbox]')
          const style = getComputedStyle(node)
          return {
            outer: rect.width, inner: list?.getBoundingClientRect().width ?? null,
            left: rect.left, right: rect.right, loading: !!node.querySelector('[role=status]'),
            paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
          }
        }
        const initial = await menu.evaluate(readGeometry)
        const measurement = { colorScheme, width, trigger, initial }
        menuMeasurements.push(measurement)
        measurement.final = await menu.evaluate(readGeometry)
        // 2026-10-18（活宿主门禁首次跑通后暴露）：这里原本硬编码「inner = outer - 10」，
        // 对应当时 `[data-trigger-menu]{padding:5px}`。后来该 padding 收敛到
        // `var(--dcu-space-1)`（4px，符合本仓「间距走 4px 标度」的棘轮），内宽随之变成
        // outer - 8，而断言没跟着改 —— 于是这条测试在**实现正确**的情况下红。
        // 这正是 CODE-040（把当时的实现值写成断言契约）的又一例。
        // 改为锁**意图**：列表必须铺满外框减去外框自身左右内距，且内距取自真实计算值。
        const paddingLeft = Number.parseFloat(measurement.final.paddingLeft ?? '0')
        const paddingRight = Number.parseFloat(measurement.final.paddingRight ?? '0')
        assert.ok(measurement.final.outer > 0, '建议菜单外框宽度必须为正：' + JSON.stringify(measurement))
        assert.ok(
          Math.abs(measurement.final.inner - (measurement.final.outer - paddingLeft - paddingRight)) < 1,
          '建议列表应铺满外框（减去外框左右内距）：' + JSON.stringify(measurement),
        )
        assert.ok(measurement.final.left >= 0 && measurement.final.right <= width, '建议菜单不得越出视口：' + JSON.stringify(measurement))
        await page.keyboard.press('Escape')
        await clearEditor()
      }
    }
  }
  checks.push('真实 @ 与指令建议列表：深浅主题 × 390/900/1440px，全宽且不越出视口')
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.locator('input[type=file]').setInputFiles({ name: 'compat.txt', mimeType: 'text/plain', buffer: Buffer.from('compatibility fixture') })
  await page.waitForFunction(() => {
    const c = window.__dcuE2E.ctx
    const binding = c.sessions.binding(window.__dcuCurrentSessionId(c.sessions.list.getSnapshot()))
    return c.conversation.input.for(binding.ctx).state.getSnapshot().attachmentIds.length > 0
  })
  await editor.press('ArrowUp')
  assert.equal((await editor.innerText()).trim(), '')
  await page.getByRole('button', { name: '探索并理解代码', exact: true }).click()
  await page.getByRole('button', { name: '了解项目结构', exact: true }).click()
  assert.equal((await editor.innerText()).trim(), '')
  await page.locator('input[type=file]').setInputFiles({ name: 'compat.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64') })
  await page.waitForFunction(() => {
    const c = window.__dcuE2E.ctx
    return c.conversation.input.for(c.sessions.binding(window.__dcuCurrentSessionId(c.sessions.list.getSnapshot())).ctx).state.getSnapshot().attachmentIds.length === 2
  })
  await editor.press('ArrowUp')
  assert.equal((await editor.innerText()).trim(), '')
  checks.push('普通文件真实上传及附件草稿的历史召回保护')
  const attachmentGap = await page.locator('[data-composer-card]').evaluate(card => {
    const thumbnails = [...card.querySelectorAll('[data-slot="conversation.input.attachments"] button[class$="_thumbnail"]')]
    const input = card.querySelector('[data-input-scroll]')
    if (!thumbnails.length || !input) throw new Error('真实附件缩略图或正文区域未找到')
    return input.getBoundingClientRect().top - Math.max(...thumbnails.map(node => node.getBoundingClientRect().bottom))
  })
  assert.equal(attachmentGap, 6, `真实附件缩略图与正文间距应为 6px，实际 ${attachmentGap}`)
  checks.push(`真实附件缩略图到正文的间距 ${attachmentGap}px`)

  // 2026-10-18（宿主 0.2.1-rc.2，活宿主门禁首次跑通后暴露）：
  // 设置入口在插件里有**两条渲染分支**（见 CodexSettingsPage.tsx:218）——
  //   · 宿主提供账号入口（hostAccountLauncher=真）时，插件渲染 `[data-dcu-settings-owner]`
  //     并复用宿主自己的按钮，**不渲染** `[data-dcu-settings-trigger]`；
  //   · 否则才渲染插件自绘的 `[data-dcu-settings-trigger]`。
  // 旧断言只认后者，于是宿主一升级到提供账号入口的版本，这条测试就红——
  // 而产品是对的（插件早已把两种形态统一到 SETTINGS_TRIGGER_SELECTOR）。
  // 故改用产品自己的合约选择器，并分别记录命中的是哪条分支。
  // 2026-10-18（宿主 0.2.1-rc.2）：宿主把账号入口按钮的 aria-haspopup 从 dialog 改成了
  // `menu`（实测 aria-label=账号菜单 / aria-haspopup=menu），于是 SETTINGS_TRIGGER_SELECTOR
  // 里那两条都不再命中——**但产品是好的**：插件在 hostAccountLauncher 分支下不靠点宿主按钮，
  // 而是给 `[data-dcu-settings-owner]` 派发 `dcu-settings-open-root` 合约事件、由插件自己接管
  // （见 settings-navigation.ts 的 openSettingsRoot）。实测该合约能正常打开设置页。
  // 因此这里改为**走产品自己的合约**，而不是猜宿主的 DOM 形状：
  //   · 有 owner  → 派发合约事件（宿主新版本路径）；
  //   · 无 owner  → 点插件自绘的 trigger（旧路径 / 无账号入口的宿主）。
  const settingsBranch = await page.evaluate(rootSelector => {
    const owner = document.querySelector(rootSelector)
    if (owner !== null) {
      const event = new CustomEvent('dcu-settings-open-root', { cancelable: true, bubbles: true })
      const notCancelled = owner.dispatchEvent(event)
      return { branch: 'host-account', notCancelled }
    }
    const trigger = document.querySelector(SETTINGS_TRIGGER_SELECTOR)
    if (trigger === null) return { branch: 'missing' }
    trigger.click()
    return { branch: 'plugin-owned' }
  }, '[data-dcu-settings-owner]')
  assert.notEqual(settingsBranch.branch, 'missing', '必须能找到设置入口（宿主账号入口或插件自绘 trigger），否则设置页在真实宿主里不可达')
  await page.locator('[data-dcu-settings-page]').waitFor({ timeout: 10000 })
  await page.keyboard.press('Escape')
  await page.locator('[data-dcu-settings-page]').waitFor({ state: 'detached', timeout: 10000 })
  // 焦点恢复只在「插件自绘 trigger」分支可断言：宿主账号入口是宿主的按钮，
  // 焦点由宿主管理，不属本插件的契约范围（写成必须等于该按钮会把宿主行为当插件责任）。
  if (settingsBranch.branch === 'plugin-owned') {
    assert.equal(await page.locator(SETTINGS_TRIGGER_SELECTOR).evaluate(node => node === document.activeElement), true, '关闭设置页后焦点必须回到打开它的那个按钮')
  }
  checks.push(`设置页打开、Escape 关闭与焦点恢复（入口分支：${settingsBranch.branch}）`)
  const visualWorkspace = `${workspace}/visual`
  await mkdir(visualWorkspace, { recursive: true })
  await page.evaluate(async path => {
    const ctx = window.__dcuE2E.ctx
    const item = await ctx.workspaces.create({ path })
    const visualId = await ctx.get('uiWorkspace').connectWorkspace(item.workspaceId)
    ctx.get('uiWorkspace').openSession(visualId)
  }, visualWorkspace)
  // 2026-10-18（宿主 0.2.1-rc.2）：官方轮次导航的渲染前提是**会话里已经有轮次**。
  // 本脚本到这里为止只建了空工作区、从未发送任何消息（全文没有一次 submit），
  // 而空会话在 0.2.1 上不渲染导航 —— 于是 waitFor 必然超时。
  // 这不是产品缺陷：没有轮次就没有「跳转到某一轮」可言。
  // 处理：先确认当前会话确实有消息；没有就跳过这一段并**显式记录跳过原因**，
  // 不静默放过（跳过必须在 checks 里可见，否则等于把没测当成测过了）。
  const rail = page.locator('[data-dcu-official-turn-navigator]')
  const turnCount = await page.evaluate(() => document.querySelectorAll('[data-dcu-turn], [class*="_turn_"]').length)
  const hasRail = await rail.count() > 0
  if (!hasRail) {
    checks.push(`⚠ 跳过「官方轮次导航预览」：当前会话无轮次（turn 节点 ${turnCount} 个、导航 nav 未渲染）。` +
      '该段需要真实消息，而本脚本不发送消息（避免依赖模型/网络）。轮次导航的样式契约由 verify-motion-budget 与样式断言覆盖。')
    await page.mouse.move(700, 100)
  } else {
  await rail.hover()
  const tip = rail.getByRole('tooltip')
  await tip.waitFor()
  const previewGeometry = await tip.evaluate(node => ({
    x: node.getBoundingClientRect().left, railRight: node.closest('nav').getBoundingClientRect().right,
    animation: getComputedStyle(node).animationName,
  }))
  assert.ok(previewGeometry.x >= previewGeometry.railRight, '真实预览应朝聊天内容区展开')
  assert.notEqual(previewGeometry.animation, 'none', '官方预览动画应保留')
  assert.equal(await page.locator('[data-dcu-expandable-user-bubble],#dcu-user-bubble-expand-style').count(), 0)
  checks.push('真实长消息无展开覆盖、官方轮次导航预览向右并保留动画')
  }
  await page.mouse.move(700, 100)
  const more = page.getByRole('button', { name: '更多操作', exact: true })
  await more.click()
  const download = page.getByRole('menuitem', { name: '下载 Session 日志', exact: true })
  await download.waitFor()
  const downloadEvent = page.waitForEvent('download')
  await download.click()
  const downloaded = await downloadEvent
  assert.equal(await downloaded.failure(), null, '日志下载应完整结束')
  assert.match(downloaded.suggestedFilename(), /\.zip$/i)
  const zip = await readFile(await downloaded.path())
  assert.ok(zip.length > 22 && zip.readUInt32LE(0) === 0x04034b50, '下载内容应为包含文件的 ZIP')
  const closeResult = page.getByRole('button', { name: '关闭', exact: true }).filter({ hasText: /^关闭$/ })
  if (await closeResult.isVisible()) await closeResult.click()
  checks.push('官方更多操作入口及 Session ZIP 下载')
  await page.setViewportSize({ width: 900, height: 720 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(300)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  if (process.env.DCU_E2E_SCREENSHOT) await page.screenshot({ path: process.env.DCU_E2E_SCREENSHOT, fullPage: true })
  assert.deepEqual(errors, [], '页面不得产生未捕获异常')
  console.log(JSON.stringify({ version: process.env.DCU_E2E_VERSION, checks, pageErrors: errors }, null, 2))
} catch (error) {
  failure = String(error.stack ?? error)
  if (process.env.DCU_E2E_SCREENSHOT) await page.screenshot({ path: process.env.DCU_E2E_SCREENSHOT, fullPage: true }).catch(screenshotError => console.error('失败截图保存失败：', screenshotError))
  throw error
} finally {
  if (process.env.DCU_E2E_REPORT) await writeFile(process.env.DCU_E2E_REPORT, JSON.stringify({ version: process.env.DCU_E2E_VERSION, checks, menuMeasurements, pageErrors: errors, failure }, null, 2))
  await browser.close()
}
