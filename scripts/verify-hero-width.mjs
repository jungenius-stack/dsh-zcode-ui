/** 验证新建页真实指针拖拽、宽度记忆、最小值与切换页面时的清理。 */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import ts from 'typescript'
const source = readFileSync('src/client/composer-width.ts', 'utf8').replaceAll('export ', '')
const script = ts.transpileModule(source + '\nwindow.startHandles=observeHeroWidthHandles;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.route('http://width.test/', route => route.fulfill({ contentType: 'text/html', body: `<style>body{margin:0}main{position:relative;width:100%;height:800px;--dsh-chat-user-width:640px}#input{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:calc(var(--dsh-chat-user-width) + 32px);height:92px;background:#ddd}</style><main data-phase="hero"><div data-conversation-scroll><div id="input"></div></div></main>` }))
  await page.goto('http://width.test/')
  await page.addScriptTag({ content: script })
  await page.evaluate(() => { window.stopHandles = window.startHandles('调整宽度') })
  const width = () => page.locator('#input').evaluate(el => el.getBoundingClientRect().width)
  const saved = () => page.evaluate(() => localStorage.getItem('dsh.conversation.contentWidth'))
  const drag = async (side, dx) => {
    const box = await page.locator(`[data-dcu-width-handle=${side}]`).boundingBox()
    await page.mouse.move(box.x + box.width / 2, 400)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + dx, 400, { steps: 5 })
    await page.mouse.up()
  }
  // 真实宿主只在 .ST7X_W_body 上定义 --dsh-chat-content-width，hero 根上没有；
  // 旧实现拿它做 right 定位，var() 失效后 right 回退 auto，左右两只手柄双双落到容器左侧重叠，
  // 视觉上就是「左右两侧那根索引横条漂移/错位」。夹具此前替宿主补了这个变量，因此一直假绿。
  {
    const geo = await page.evaluate(() => {
      const [l, r] = [...document.querySelectorAll('[data-dcu-width-handle]')].map(e => e.getBoundingClientRect())
      const host = document.querySelector('main').getBoundingClientRect()
      return {
        leftX: Math.round(l.x), rightX: Math.round(r.x),
        leftHandleW: Math.round(l.width), rootCenter: Math.round(host.x + host.width / 2),
      }
    })
    assert.notEqual(geo.leftX, geo.rightX, '左右两只宽度手柄必须分离，不得重叠')
    assert.ok(geo.rightX > geo.leftX + 100, '右手柄必须明显位于左手柄右侧')
    const mid = (geo.leftX + geo.leftHandleW + geo.rightX) / 2
    assert.ok(Math.abs(mid - geo.rootCenter) <= 2, `内容区必须关于容器中心对称（中心 ${geo.rootCenter}，实测 ${Math.round(mid)}）`)
  }
  // 指示条：纵向固定居中，不得随指针移动（旧实现写 --dcu-pointer-y 会让它跟着鼠标上下跑）
  {
    const bar = await page.evaluate(() => {
      const el = document.querySelector('[data-dcu-width-handle=left]')
      const a = getComputedStyle(el, '::after')
      return { top: a.top, transform: a.transform, h: a.height }
    })
    assert.ok(!bar.top.includes('--dcu-pointer-y'), '指示条不得再用 --dcu-pointer-y 定位')
    assert.ok(bar.top === '50%' || bar.transform !== 'none', '指示条必须垂直居中（top:50% + translateY(-50%)）')
  }
  assert.equal(await width(), 672)
  await drag('right', 60)
  assert.equal(await width(), 792)
  assert.equal(await saved(), '760')
  await drag('left', -40)
  assert.equal(await width(), 872)
  assert.equal(await saved(), '840')
  await drag('right', -300)
  assert.equal(await width(), 672)
  await page.locator('[data-dcu-width-handle=right]').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await saved(), '660')
  await page.locator('main').evaluate(el => { el.dataset.phase = 'active' })
  await page.waitForFunction(() => !document.querySelector('[data-dcu-width-handle]'))
  await page.locator('main').evaluate(el => { el.dataset.phase = 'hero' })
  await page.waitForFunction(() => document.querySelectorAll('[data-dcu-width-handle]').length === 2)
  assert.equal(await width(), 692)
  await page.evaluate(() => window.stopHandles())
  assert.equal(await page.locator('[data-dcu-width-handle]').count(), 0)
  console.log('新建页调宽：左右拖拽、最小宽度、偏好保存、键盘操作及页面切换清理通过。')
} finally { await browser.close() }
