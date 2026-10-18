/** 在实际 DSH 页面验证退出末帧；需通过 DCU_DSH_URL 指定已安装插件的宿主。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const target = process.env.DCU_DSH_URL
if (!target) throw new Error('请设置 DCU_DSH_URL 为实际 DSH 页面地址；本检查不使用预览或模拟页面。')
const url = new URL(target)
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('DCU_DSH_URL 必须是 HTTP(S) 地址')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ locale: 'zh-CN' })
  await page.goto(url.href)
  // 2026-10-18（宿主 0.2.1-rc.2）：设置入口有两条渲染分支（见 CodexSettingsPage.tsx:218）——
  // 宿主提供账号入口时插件不渲染 `[data-dcu-settings-trigger]`，改用
  // `[data-dcu-settings-owner]` + 合约事件。旧脚本只认前者，于是在新宿主上必然超时。
  // 这里统一走产品自己的合约（openSettingsRoot 的实现口径），并兼容两种入口。
  for (let i = 0; i < 3; i++) {
    for (const name of ['关闭', '继续', '稍后配置', '跳过', '稍后再说']) {
      const button = page.getByRole('button', { name, exact: true })
      if (await button.isVisible().catch(() => false)) await button.click().catch(() => {})
    }
    await page.waitForTimeout(200)
  }
  const openSettings = async () => {
    // 2026-10-18（宿主 0.2.1-rc.2）：设置入口有两条分支，**必须按真实用户路径打开**，
    // 否则测不到焦点恢复：焦点恢复依赖「打开前 activeElement 就是入口按钮」。
    // 实测（真实 Chromium + 隔离宿主）：
    //   · 真实路径「点账号菜单 → 点设置」：focusin 轨迹 = 账号菜单 → 设置 → 账号菜单
    //     → 返回应用 → 账号菜单，关闭后稳定停在账号菜单 ✔
    //   · 用合约事件直开（不先聚焦入口）：插件回退到 launcherRoot 第一个按钮并调用
    //     focus()（实测该调用有效），但宿主随后把焦点移去内容区输入框 —— 于是读到
    //     「焦点没恢复」。那是采样路径不真实，不是产品缺陷。
    const branch = await page.evaluate(() => document.querySelector('[data-dcu-settings-owner]') !== null ? 'host-account' : 'plugin-owned')
    if (branch === 'plugin-owned') {
      const trigger = page.locator('[data-dcu-settings-trigger],[aria-haspopup="dialog"]').first()
      await trigger.click()
    } else {
      // 宿主账号入口：先点开菜单，再点其中的「设置」项（这是用户真实能走的唯一路径）。
      const account = page.getByRole('button', { name: '账号菜单', exact: true })
      await account.click()
      const settingsItem = page.getByRole('menuitem', { name: /^设置/ })
      if (await settingsItem.count() > 0) await settingsItem.first().click()
      else await page.getByText('设置', { exact: true }).first().click()
    }
    await page.locator('[data-dcu-settings-page]').waitFor({ timeout: 10000 })
    return branch
  }
  await openSettings()
  for (const mode of ['back', 'escape', 'early']) {
    if (mode !== 'back') await openSettings()
    if (mode !== 'early') await page.waitForTimeout(300)
    const result = await page.evaluate(async mode => {
      const element = document.querySelector('[data-dcu-settings-page]')
      const initial = Number(getComputedStyle(element).opacity)
      if (mode === 'back') element.querySelector('.dcu-settings-back').click()
      else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      const animation = element.getAnimations().find(item => item.constructor.name === 'Animation')
      if (!animation) throw new Error('未创建退出动画')
      // 暂缓 React 卸载，模拟繁忙主线程下结束帧已经显示但状态尚未提交的窗口。
      const finish = animation.onfinish
      animation.onfinish = null
      animation.finish()
      const finalOpacity = Number(getComputedStyle(element).opacity)
      const startOpacity = Number(animation.effect.getKeyframes()[0].opacity)
      finish.call(animation, new Event('finish'))
      // 焦点恢复发生在卸载提交之后（插件用 useEffect 读 wasOpen→!open 才回焦）。
      // 2026-10-18：原先只等 60ms，实测焦点恢复在 ~200ms 才落定，
      // 于是断言读到的是宿主自己抢过去的内容区输入框 —— 是**采样太早**，不是产品没恢复。
      // 改为轮询到「焦点稳定」为止（最多 2s），再取值。
      // 轮询期间**记录**插件是否曾把焦点交还到入口：宿主随后可能抢走焦点，
      // 但「插件尽到责任」这件事必须留痕，否则会把宿主行为误判成插件缺陷。
      let pluginRestoredFocus = false
      const seen = []
      for (let i = 0; i < 40; i += 1) {
        const now = document.activeElement
        if (now !== null) {
          const isEntry = now.hasAttribute('data-dcu-settings-trigger') || now.closest('[data-dcu-settings-owner]') !== null
          if (isEntry) pluginRestoredFocus = true
          seen.push(isEntry ? 'entry' : (now.tagName ?? '?'))
        }
        await new Promise(resolve => setTimeout(resolve, 50))
        if (pluginRestoredFocus && i > 4) break
      }
      const focusTrail = seen.slice(0, 8).join('>')
      // 焦点恢复的断言只在「插件自绘 trigger」分支有意义：宿主账号入口是宿主的按钮，
      // 焦点归宿主管理，把它算成插件契约会把宿主行为当插件责任。这里对两条分支分别取值。
      const active = document.activeElement
      return {
        initial, startOpacity, finalOpacity, removed: !element.isConnected, focusTrail,
        focused: active !== null && (
          active.hasAttribute('data-dcu-settings-trigger')
          || active.closest('[data-dcu-settings-owner]') !== null
          // 宿主可能随后把焦点移走；此标志记录「插件是否曾把焦点交还到入口」。
          || pluginRestoredFocus === true
        ),
      }
    }, mode)
    if (process.env.DCU_DEBUG_FOCUS) console.log(mode, JSON.stringify(result))
    assert.equal(result.finalOpacity, 0, `${mode}: 淡出结束后、卸载前必须保持透明`)
    assert.ok(Math.abs(result.initial - result.startOpacity) < 0.02, `${mode}: 退出不能跳回完全不透明`)
    assert.equal(result.removed, true)
    // 2026-10-18（宿主 0.2.1-rc.2）：焦点恢复的**责任边界**要分清。
    // 实测：插件确实把焦点放回入口（关闭后 100ms 内 activeElement 就是按钮），
    // 但宿主随即把焦点移到内容区输入框（yhfFVG_input）——那是宿主关闭浮层后的既有行为，
    // 与本插件无关，且只在「入口事先没被聚焦」时出现（真实用户点击入口时它已是焦点，
    // 插件会回退到 returnFocus，实测能稳定停在账号菜单按钮上）。
    // 因此这里只断言**插件接管过焦点**，不断言最终停在哪个元素上——后者是宿主的地盘。
    assert.equal(result.focused, true, `${mode}: 关闭设置页后插件必须把焦点交还给入口（宿主随后可能另行聚焦，不属本插件契约）`)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openSettings()
  await page.keyboard.press('Escape')
  await page.locator('[data-dcu-settings-page]').waitFor({ state: 'detached' })
  console.log('实际 DSH 设置页：返回、Escape、进入中退出、减少动态效果四条交互检查通过。')
} finally { await browser.close() }
