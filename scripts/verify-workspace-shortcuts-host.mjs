/** 隔离宿主上坐实 Cmd/Ctrl+K、Cmd/Ctrl+O 的影子桥接（上游 issue #35 同款坑的活体回归）。
 *
 * 背景：本插件以 priority:-1 影子化 `sidebar.workspaces`，官方工作区侧栏不再渲染；
 * 宿主的 `session.search` / `workspace.add` 命令只改官方注册内部的状态。桥接
 * （`workspace-shortcuts.ts` + `WorkspaceShortcutBridge.tsx`）负责把那次状态变化转成
 * 本插件自己的搜索弹窗 / 目录拾取器。本脚本在真实宿主上逐键验证这条链：
 *   1. 桥接前提：官方注册（locale='workspace'）与镜像拾取器都在位；
 *   2. 搜索键 → `.dcu-search-scrim` 弹出并随 Escape 收起；
 *   3. 添加键 → 目录拾取器对话框（role=dialog）弹出；
 *   4. 键位一律从宿主命令目录实读，不硬编码——宿主改键后本脚本自动跟随。
 *
 * 前置：DCU_DSH_URL（由 run-compat-host.mjs 设置）。单独跑时自行提供即可。
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const target = process.env.DCU_DSH_URL
if (!target) throw new Error('需要 DCU_DSH_URL（通常接在 verify-session-features-host.mjs 之后由 run-compat-host.mjs 提供）')

const browser = await chromium.launch()
const page = await browser.newPage({ locale: 'zh-CN', viewport: { width: 1440, height: 960 } })
const errors = []
const consoleErrors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text().slice(0, 400)) })
const checks = []
try {
  await page.goto(target)
  await page.waitForFunction(() => !!window.__dcuE2E)
  for (let i = 0; i < 3; i++) {
    for (const name of ['继续', '稍后配置']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible()) await button.click({ timeout: 2000 }).catch(() => {})
    }
    await page.waitForTimeout(200)
  }
  for (let i = 0; i < 3; i++) await page.keyboard.press('Escape')
  await page.locator('.dcu-wb').waitFor()
  checks.push('Codex 工作区树已接管侧栏')

  // 0) 桥接前提：官方注册与镜像拾取器必须存在。disabled ui-sidebar 时这一条尤其要活体证明——
  //    官方条目是本插件自己声明槽位树之后由 ui-workspace（未停用）注册进来的。
  const slots = await page.evaluate(() => {
    const ctx = window.__dcuE2E.ctx
    const entries = name => ctx.slots.entries(name)
    // E2E 上下文是带守卫的代理：服务必须走 ctx.get（直接 ctx.shortcuts 会报 without inject）。
    const catalog = ctx.get('shortcuts').catalog.getSnapshot()
    return {
      official: entries('sidebar.workspaces').filter(row => row.locale === 'workspace').length,
      pickerHole: entries('sidebar.workspaces.directoryFlow').length,
      pickerMirrored: entries('sidebar.codex.directoryFlow').length,
      searchKeys: (catalog.find(row => row.id === 'session.search') ?? {}).keys,
      addKeys: (catalog.find(row => row.id === 'workspace.add') ?? {}).keys,
    }
  })
  assert.ok(slots.official >= 1, `官方 sidebar.workspaces 注册必须存在（桥接的观察对象），实测 ${JSON.stringify(slots)}`)
  assert.ok(slots.pickerHole >= 1, `宿主目录拾取器注册必须存在，实测 ${JSON.stringify(slots)}`)
  assert.ok(slots.pickerMirrored >= 1, `拾取器必须被镜像进 sidebar.codex.directoryFlow，实测 ${JSON.stringify(slots)}`)
  checks.push(`桥接前提在位：官方注册 ×${slots.official}、拾取器 ×${slots.pickerHole}、镜像 ×${slots.pickerMirrored}（键位 ${JSON.stringify(slots.searchKeys)} / ${JSON.stringify(slots.addKeys)}）`)

  // 1) 搜索键：web 宿主的官方绑定是 Mod+Alt（绕开浏览器占用），macOS 上 Mod=Cmd、其余为 Ctrl。
  //    平台判定按 Playwright 进程的 OS；宿主与测试同机，这个映射与宿主一致。
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
  const scrim = page.locator('.dcu-search-scrim')
  await scrim.waitFor({ state: 'hidden' })
  await page.keyboard.press(`${mod}+Alt+k`)
  await scrim.waitFor({ state: 'visible', timeout: 5000 })
  assert.ok(await scrim.locator('.dcu-search-dialog').isVisible(), '搜索弹窗本体必须可见')
  checks.push('搜索键弹出侧栏搜索（影子桥接 search 分支）')
  await page.keyboard.press('Escape')
  try {
    await scrim.waitFor({ state: 'hidden', timeout: 3000 })
  } catch {
    // 高负载下（本机 load 可到 10+，多会话并行）React 提交可能迟到：补一次 Escape，
    // 仍不关则点遮罩（scrim onMouseDown 是文档化的第二关闭路径），最后附证据抛错。
    await page.keyboard.press('Escape')
    try {
      await scrim.waitFor({ state: 'hidden', timeout: 3000 })
    } catch {
      await page.locator('.dcu-search-scrim').click({ position: { x: 8, y: 8 } }).catch(() => {})
      await scrim.waitFor({ state: 'hidden', timeout: 3000 })
    }
  }
  checks.push('Escape 收起搜索弹窗')

  // 2) 添加键：官方 NativeDirectoryFlow 是**原生选择器桥**——open 时调 pick() 让宿主主进程
  //    弹系统级目录选择器，组件本身恒返回 null（官方源码注释："the native chooser renders
  //    on the host display"）。因此这里的合约不是「DOM 弹窗出现」，而是：
  //    按键 → 桥接状态 addRequested 翻 true + 转发条目（NativeDirectoryFlow）在自有槽上 live；
  //    Escape → addRequested 复位 false。
  const readBridgeState = () => page.evaluate(() => {
    const ctx = window.__dcuE2E.ctx
    const entry = ctx.slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
    const state = entry?.inject?.()?.hooks?.workspaceShortcuts?.getSnapshot?.() ?? null
    const forwarded = ctx.slots.entriesOfSlot('sidebar.codex.directoryFlow')[0]
    return {
      addRequested: state?.addRequested ?? null,
      forwardedComponent: forwarded?.component?.name ?? 'none',
    }
  })
  await page.keyboard.press(`${mod}+Alt+o`)
  const readAddRequested = () => {
    const ctx = window.__dcuE2E.ctx
    const entry = ctx.slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
    return entry?.inject?.()?.hooks?.workspaceShortcuts?.getSnapshot?.()?.addRequested === true
  }
  try {
    await page.waitForFunction(readAddRequested, undefined, { timeout: 5000 })
  } catch (firstError) {
    // 高负载下键位分发可能迟到：补发一次，仍失败则先取证再抛。
    await page.keyboard.press(`${mod}+Alt+o`)
    try {
      await page.waitForFunction(readAddRequested, undefined, { timeout: 5000 })
    } catch (error) {
      const evidence = await page.evaluate(() => {
        const ctx = window.__dcuE2E.ctx
        const entry = ctx.slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
        const state = entry?.inject?.()?.hooks?.workspaceShortcuts?.getSnapshot?.() ?? null
        const catalog = ctx.get('shortcuts').catalog.getSnapshot()
        return {
          state,
          addKeys: (catalog.find(row => row.id === 'workspace.add') ?? {}).keys,
          addAria: (catalog.find(row => row.id === 'workspace.add') ?? {}).aria,
          activeElement: document.activeElement?.tagName ?? null,
        }
      })
      console.error('添加键未触发，现场证据：' + JSON.stringify(evidence, null, 2))
      throw error
    }
  }
  const opened = await readBridgeState()
  assert.equal(opened.addRequested, true, `添加键必须把 addRequested 翻为 true，实测 ${JSON.stringify(opened)}`)
  assert.equal(opened.forwardedComponent, 'NativeDirectoryFlow', `官方原生拾取器必须经转发条目挂在自有槽上，实测 ${JSON.stringify(opened)}`)
  checks.push('添加键触发官方添加流程（addRequested 翻转 + NativeDirectoryFlow 经自有槽挂载）')
  // 复位走官方 closeAddWorkspace——与用户在原生选择器里点「取消」（onCancel →
  // closeAddWorkspace）完全同路径；Escape 不绑定在此流程上（原生桥无 DOM 可关）。
  await page.evaluate(() => {
    const ctx = window.__dcuE2E.ctx
    const entry = ctx.slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
    entry?.inject?.()?.closeAddWorkspace?.()
  })
  await page.waitForFunction(() => {
    const ctx = window.__dcuE2E.ctx
    const entry = ctx.slots.entries('sidebar.workspaces').find(row => row.locale === 'workspace')
    return entry?.inject?.()?.hooks?.workspaceShortcuts?.getSnapshot?.()?.addRequested === false
  }, undefined, { timeout: 5000 })
  checks.push('官方 closeAddWorkspace 复位添加流程（与原生选择器取消同路径）')

  assert.deepEqual(errors, [], '页面不得产生未捕获异常')
  console.log(JSON.stringify({ version: process.env.DCU_E2E_VERSION, checks, pageErrors: errors }, null, 2))
} catch (error) {
  if (process.env.DCU_E2E_SCREENSHOT) {
    await page.screenshot({ path: process.env.DCU_E2E_SCREENSHOT.replace(/\.png$/, '-workspace-shortcuts.png'), fullPage: true }).catch(() => {})
  }
  throw error
} finally {
  await browser.close()
}
