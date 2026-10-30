/**
 * 夜审第 16 批 —— ZCode 对齐项的回归契约（纯 JS / .mjs，过 tsc --noEmit 全仓门禁）。
 *
 * ## 锁什么（4 条已复核对齐项，11 条对齐断言 + 2 条前置守卫 = 13 条）
 *
 * 1. **settings-page-registration.ts:131 —— 设置入口图标 16px**
 *    ZCode 侧证据：`settings-DTzS0O5N.js` 全文含 `n=e('settings',t)`（齿轮 path+circle，
 *    key=1i5ecw）；主 bundle 含 `{t as Ac}from"./settings-DTzS0O5N.js"`，且
 *    `(0,$.jsx)(Ac,{className:`size-4`})` 恰好 2 处，第一处外层 `data-testid:gLe`
 *    （grep `gLe=` 解析为 `task-settings-button`）。Tailwind 的 `size-4` = 1rem = 16px。
 *    本仓侧 `:131` 为 `createElement(ZIconSettings, { size: 16, strokeWidth: 1.6 })`。
 *    断言只锁 `size: 16`（是否真是设置入口，用「位于 settings.trigger 注入内」这条
 *    结构断言把关），**故意不锁 `strokeWidth: 1.6`** —— 描边差异是已登记的 diff 3，
 *    将来若把描边也对齐，本文件不应出现假红。
 *
 * 2. **skin-envelope.ts:56,69 —— 表单控件字体继承**
 *    ZCode 侧证据：`styles-9Z13W0KP.css`（实测 470091B）含
 *    `button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;
 *    font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;
 *    background-color:#0000;border-radius:0}`。本仓 `:56` 为
 *    `:where(${SURFACE_LIST}) :where(button,input,select,textarea)`，`:69` 为
 *    `${FORM_CONTROLS}{font:inherit}` —— 多一层 `:where()` 零特异性 + 表面限定，
 *    是文件头注声明的分寸（只有 UA 样式表被压过，作者样式照旧胜出），值本身一致。
 *    复核时给的 checkable 依据是「import SKIN_ENVELOPE_STYLE 后匹配
 *    `button,input,select,textarea){font:inherit}`」；.mjs 不引 .ts（无 TS loader），
 *    故改为钉住拼出该字符串的**两个操作数**：FORM_CONTROLS 的定义，以及
 *    `${FORM_CONTROLS}{font:inherit}` 这条规则。任一漂移都会红，等价确定。
 *
 * 3. **skin-envelope.ts:62 —— 数字等宽 tabular-nums**
 *    ZCode 侧证据：`styles-9Z13W0KP.css` 含
 *    `.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,)
 *    var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,)
 *    var(--tw-numeric-fraction,)}`。本仓 `:62` 为
 *    `${SURFACE_LIST}{font-variant-numeric:tabular-nums}`：利用该属性的继承性在**表面**
 *    设一次，与 ZCode 的按需工具类不是同一作用域策略，属已声明的设计分寸。
 *    ⚠ 复核记录：主 bundle 的 `tabular-nums` 计数实测为 103（形态是按需类名，如
 *    ``className:`text-ui-xs tabular-nums` ``），审计员写的 48 口径存疑。因此本文件
 *    **不断言任何计数**，只锁 CSS 规则的存在与本仓的表面级写法 —— 计数会随 ZCode 版本
 *    变动，锁它等于给自己埋一条必然过期的断言。
 *
 * 4. **skin-envelope.ts:65-66 —— 盒模型 border-box**
 *    ZCode 侧证据：主 bundle 内嵌 CSS 有 `*,:before,:after{box-sizing:border-box`（×1）。
 *    本仓 `:65` 为 `${DESCENDANTS}{box-sizing:border-box}`、`:66` 为
 *    `${DESCENDANTS}::before,${DESCENDANTS}::after{box-sizing:border-box}` —— 限定在
 *    皮肤表面内，比 ZCode 的全局规则更窄，值一致（box-sizing 不继承，必须逐元素）。
 *    ⚠ 复核记录：审计员括注「styles-9Z13W0KP.css 内无全局规则、preflight 在 JS 内嵌
 *    CSS 中」与实测不符 —— 该 CSS 首条即 Tailwind v4 preflight
 *    `*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}`
 *    （选择器顺序不同，按 `*,:before,:after` 搜会漏）。这不影响主论点（值为
 *    border-box、本仓作用域更窄），故本文件只锁本仓的取值与作用域写法，
 *    不对「preflight 在哪个文件里」下断言。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 这四项都是「样式表 / 渲染树里必须存在这条规则或调用」的结构事实：取值是确定的
 * 字节串，读源码文本即可判定。渲染测试要拉活宿主与真实主题环境，同样的取值错误
 * 照样绿（样式被覆盖不报错），却把「今晚这台机器能不能起宿主」引成门禁的前置条件。
 * 文本断言则确定地锁住「源里写着什么」：谁改动这些对齐取值（或顺手"优化"掉），
 * 门禁立刻红。像素级还原由 zcode-tokens 的 token 定义与 CSS 规则链保证，这里锁的
 * 是它的输入不再漂移。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

const registration = read('settings-page-registration.ts')
const skin = read('skin-envelope.ts')

// SKIN_ENVELOPE_STYLE 的数组体：规则必须真的在这个导出数组里（不是躺在注释里）。
const envelopeStart = skin.indexOf('export const SKIN_ENVELOPE_STYLE = [')
assert.ok(envelopeStart >= 0, 'SKIN_ENVELOPE_STYLE 导出丢失：zcode-theme.ts:381 靠它把信封样式写进 style 标签')
const envelopeEnd = skin.indexOf('].join(', envelopeStart)
assert.ok(envelopeEnd > envelopeStart, 'SKIN_ENVELOPE_STYLE 的 .join(...) 收尾丢失：无法判定规则是否真的被导出')
const envelopeBody = skin.slice(envelopeStart, envelopeEnd)

// ── 1. settings-page-registration.ts: 设置入口图标 16px ──────────────────────
// 1a. 只锁尺寸：ZCode 侧是 size-4（1rem = 16px）；描边 1.6 是已登记的 diff 3，不在此断言。
assert.match(
  registration,
  /createElement\(ZIconSettings, \{ size: 16/,
  '设置入口图标尺寸必须保持 16px（= ZCode size-4 = 1rem）：改档会让侧栏设置按钮与任务行图标脱档',
)
// 1b. 尺寸断言必须落在 settings.trigger 的注入里，否则「16px 的设置图标」可能只是别处的图标。
assert.match(
  registration,
  /ctx\.slots\.inject\('settings\.trigger',[\s\S]{0,400}?createElement\(ZIconSettings, \{ size: 16/,
  'settings.trigger 注入里必须用 size:16 的 ZIconSettings：入口图标挪位/换图标后，上一条会变成空断言',
)

// ── 2. skin-envelope.ts: 表单控件字体继承（零特异性 + 表面限定）──────────────
// 2a. 控件清单必须是这四项、且外面套 :where()（特异性 0：只压 UA，不压作者样式）。
assert.match(
  skin,
  /const FORM_CONTROLS = `:where\(\$\{SURFACE_LIST\}\) :where\(button,input,select,textarea\)`/,
  '表单控件归一必须是「:where(表面) :where(button,input,select,textarea)」：去掉 :where 就会用特异性覆盖插件故意设的字体',
)
// 2b. 归一的值必须是 font:inherit（ZCode 同款），且必须由 FORM_CONTROLS 拼出来
//    ⇒ 生成的规则就是 …button,input,select,textarea){font:inherit}。
assert.match(
  envelopeBody,
  /\$\{FORM_CONTROLS\}\{font:inherit\}/,
  '表单控件字体必须归一成 font:inherit（对齐 ZCode preflight）：否则裸 button/input 仍渲染 UA 默认字体',
)
// 2c. 全文件只允许这一处 font:inherit：多出来的任何一处都可能是不带表面限定的裸规则。
assert.equal(
  skin.split('font:inherit').length - 1,
  1,
  'font:inherit 只允许出现在 ${FORM_CONTROLS} 这一条里：多出的那一处通常是不带表面限定的裸选择器，会漏到外来内容之外',
)

// ── 3. skin-envelope.ts: 表面级 tabular-nums ────────────────────────────────
// 3a. 挂在表面上（继承属性只需设一次），不挂在后代通配上。
assert.match(
  envelopeBody,
  /\$\{SURFACE_LIST\}\{font-variant-numeric:tabular-nums\}/,
  '皮肤表面必须挂 font-variant-numeric:tabular-nums（ZCode 同款形态）：时间戳/计数会随数字宽度抖动',
)
// 3b. 反向断言：不得改成后代通配。后代通配会把特异性抬上去，开始"修复"别人的组件。
assert.ok(
  !/\$\{DESCENDANTS\}\{[^}]*font-variant-numeric/.test(skin),
  'tabular-nums 只应在表面上设一次（继承属性）：改用后代通配会抬高特异性、侵入外来内容自己的设定',
)

// ── 4. skin-envelope.ts: 盒模型 border-box（元素 + 伪元素，且限定在表面内）───
// 4a. 元素级。
assert.match(
  envelopeBody,
  /\$\{DESCENDANTS\}\{box-sizing:border-box\}/,
  '皮肤后代必须 box-sizing:border-box（对齐 ZCode preflight 取值）：padding 会撑破定宽容器',
)
// 4b. 伪元素级（漏掉伪元素时，装饰块仍按 content-box 计算）。
assert.match(
  envelopeBody,
  /\$\{DESCENDANTS\}::before,\$\{DESCENDANTS\}::after\{box-sizing:border-box\}/,
  '皮肤后代的 ::before/::after 也必须 border-box：伪元素不继承，漏掉就会出现"同一容器两种盒模型"',
)
// 4c. 作用域：数组体内每一条 box-sizing 都必须挂在 ${DESCENDANTS} 上。
//     ZCode 是全局 `*{box-sizing:border-box}`，本仓有意收窄到皮肤表面内 ——
//     一旦有人改回全局通配，这条红，提醒重新论证「会不会碰到皮肤外的外来内容」。
// 先剥掉行尾注释：注释不产出 CSS，但也可能提到 box-sizing（数组体内就有一条这样的说明）。
const boxSizingLines = envelopeBody
  .split('\n')
  .map(line => {
    const comment = line.indexOf('//')
    return comment >= 0 ? line.slice(0, comment) : line
  })
  .filter(line => line.includes('box-sizing'))
assert.ok(boxSizingLines.length >= 2, 'box-sizing 规则条数少了：元素与伪元素两条必须同时存在')
for (const line of boxSizingLines) {
  assert.ok(
    line.includes('${DESCENDANTS}'),
    `box-sizing 规则必须限定在皮肤表面后代内（不得退化成全局通配）：${line.trim()}`,
  )
}

console.log('night-audit batch-16 对齐契约：13 条断言全部通过')
