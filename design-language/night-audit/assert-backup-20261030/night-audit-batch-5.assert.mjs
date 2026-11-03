/**
 * 夜审批次 5（2026-10-30）：zcode-tokens.ts 设计令牌映射的回归断言。
 *
 * ## 锁什么
 *
 * 锁定夜审 10 个已复核条目（verdict 全部 verified）在 src/client/zcode-tokens.ts
 * 三张映射表（ZCODE_LIGHT / ZCODE_DARK / ZCODE_STRUCTURAL）中的字面取值：
 *
 *  1. 画布底 --dsw-alias-bg-base：light #f8f8f8 / dark #161616
 *  2. 前景主色 --dsw-alias-label-primary：light #262626 / dark #d4d4d4
 *  3. 前景弱化阶梯：secondary 60%；dimmed（subtlest）light 40% / dark 30%
 *  4. tooltip 三件套 bg/label/key-bg：light #f0f0f0/#0d0d0d/#e6e6e6、
 *     dark #2b2b2b/#f8f8f8/#363636
 *  5. 状态色三对 success/destructive/warning：light #1e8a3e/#e03131/#e07b00、
 *     dark #46bf72/#ff5c5c/#ff8a30
 *  6. 链接/焦点环蓝 --dsw-alias-link、--dsw-focus-ring-color：light #0b7fff / dark #4099ff
 *  7. 字号刻度：基准 14px，六档 calc 同构（2xs-5/xs-4/sm-2/caption-1/lg+2/xl+4），
 *     外加 display/headline/title 三扩展档（+20/+8/+6）
 *  8. 圆角标度 xs2/sm4/md6/lg8/xl12/2xl16/full 999px + panel 16px
 *  9. 等宽字体栈：ZCode --font-mono 整串逐字节一致，且全文件恰出现 1 次
 * 10. hover/selected 交互态：light 黑 5%、dark 白 5%、dark 选中白 10%
 *
 * ## 这些取值为什么来自 ZCode（证据链）
 *
 * 复核口径是「repo 源码 + ZCode asar 双侧闭合」，单侧相符不算数：
 * - asar 侧：python mmap 从 ZCode 安装包提取 .theme-zai-light / .theme-zai-dark
 *   两个 CSS 块逐令牌亲读。--color-background:#f8f8f8/#161616；--color-foreground
 *   引 neutral-800/300 的 oklch 值，经 OKLab→sRGB 独立复算闭合 #262626/#d4d4d4；
 *   前景弱化 alpha 阶梯 #…99/#…66/#…4d = 60%/40%/30%，另有 --lucide-subtlest-opacity
 *   .4/.3 双证；等宽栈做 python data.count() 精确匹配，全 asar 恰 1 次命中。
 * - 账本侧（优化UI插件区/design-language/）：03h-detail-sweep.md:32 与
 *   07-delivery-ledger.md:55 确记焦点环走语义令牌 = brand #0b7fff；
 *   03n-typography.md:10-11 确记基准 14px（--ui-font-size）与 --text-ui-* 档位；
 *   03j-dialog.md:10 确记 panel=16px（rounded-2xl，Modal/设置面板/反馈弹窗/
 *   浮动面板统一）；04-open-gaps.md:111 TR2 实录浅色 hover = 黑 5% 的 asar 原串。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * zcode-tokens.ts 是纯数据模块：不渲染 UI，只产出 CSS 变量文本交给宿主渲染器
 * 消费，真实视觉必须在活宿主里验（2026-10-12 的截图逐像素核对即属此类，自动化
 * 测不到）。能测且值得测的是映射契约本身：令牌在不在、值是不是 ZCode 那个值。
 * 值一旦漂移，换肤静默偏离基准、无任何报错——文本断言确定性最强，漂移立即红。
 *
 * ## 为什么是 .mjs（第三轮重写说明）
 *
 * 前两轮 .assert.ts 版本因全量门禁在机器高负载下崩溃被保险丝撤回（非内容问题）。
 * 门禁第 1 步是 tsc --noEmit 全仓类型检查，tsx 能跑不等于 tsc 能过。本文件刻意
 * 纯 JavaScript（无类型标注/泛型/as/interface，不 import 任何 .ts 模块，源码按
 * 文本读取），走仓库已有 .assert.mjs 先例的路线，不进 tsc 检查面。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/client/zcode-tokens.ts'), 'utf8')

// ── 切块：三张映射表按导出顺序切开，light/dark 断言互不越界 ─────────────────
const lightIdx = source.indexOf('export const ZCODE_LIGHT')
const darkIdx = source.indexOf('export const ZCODE_DARK')
const structuralIdx = source.indexOf('export const ZCODE_STRUCTURAL')

assert.ok(lightIdx > 0, 'ZCODE_LIGHT 导出定位失败：zcode-tokens.ts 结构变化，切块前提失效')
assert.ok(darkIdx > lightIdx, 'ZCODE_DARK 应在 ZCODE_LIGHT 之后导出：切块边界失效')
assert.ok(structuralIdx > darkIdx, 'ZCODE_STRUCTURAL 应在 ZCODE_DARK 之后导出：切块边界失效')

const lightBlock = source.slice(lightIdx, darkIdx)
const darkBlock = source.slice(darkIdx, structuralIdx)
const structuralBlock = source.slice(structuralIdx)

/** 从主题块文本里取令牌的引号字面值；取不到当场红，不静默跳过。 */
function valueOf(block, token) {
  const m = block.match(new RegExp(`'${token}':\\s*'([^']+)'`))
  assert.ok(m, `令牌 ${token} 未在对应主题块中找到：令牌名或切块漂移`)
  return m[1]
}

// ── 1. 画布底 --dsw-alias-bg-base（zcode-tokens.ts:63/298）─────────────────
// ZCode --color-background hex 套字面：Zai Light #f8f8f8 / Zai Dark #161616
//（asar 两块亲读，仓库头注释同口径：亮色 rgb(248,248,248)、暗色 rgb(22,22,22)）。
assert.equal(valueOf(lightBlock, '--dsw-alias-bg-base'), '#f8f8f8',
  'light 画布底必须是 ZCode --color-background 的 #f8f8f8（asar .theme-zai-light 亲读）')
assert.equal(valueOf(darkBlock, '--dsw-alias-bg-base'), '#161616',
  'dark 画布底必须是 ZCode --color-background 的 #161616（asar .theme-zai-dark 亲读）')

// ── 2. 前景主色 --dsw-alias-label-primary（zcode-tokens.ts:99/332）─────────
// ZCode --color-foreground 是 oklch 中性阶：neutral-800(26.9%)/neutral-300(87%)，
// OKLab→sRGB 独立复算闭合 #262626/#d4d4d4，换算链亲自闭合过。
assert.equal(valueOf(lightBlock, '--dsw-alias-label-primary'), '#262626',
  'light 前景主色必须是 neutral-800(oklch 26.9%) 换算后的 #262626')
assert.equal(valueOf(darkBlock, '--dsw-alias-label-primary'), '#d4d4d4',
  'dark 前景主色必须是 neutral-300(oklch 87%) 换算后的 #d4d4d4')

// ── 3. 前景弱化阶梯：secondary 60%，dimmed light 40% / dark 30% ────────────
// （zcode-tokens.ts:102/104/109/337/340）ZCode alpha 十六进制双证：
// #…99=60%、#…66=40%、#…4d=30%，--lucide-subtlest-opacity .4/.3 各 2 处。
// dimmed 是分主题值（dark 30% / light 40%）：改回「两套同值」会让浅色工具行/
// 时间戳淡一档（zcode-tokens.ts:107-108 注释实录的教训）。
assert.equal(valueOf(lightBlock, '--dsw-alias-label-primary-dimmed'), 'rgba(38, 38, 38, 0.6)',
  'light primary-dimmed 必须是 60%（ZCode foreground #26262699）')
assert.equal(valueOf(lightBlock, '--dsw-alias-label-secondary'), 'rgba(38, 38, 38, 0.6)',
  'light secondary 必须是 60%（ZCode foreground-subtle #26262699）')
assert.equal(valueOf(lightBlock, '--dsw-alias-label-dimmed'), 'rgba(38, 38, 38, 0.4)',
  'light dimmed(subtlest) 必须是 40%（#26262666 + lucide .4 双证；写成 30% 浅色淡一档）')
assert.equal(valueOf(darkBlock, '--dsw-alias-label-secondary'), 'rgba(212, 212, 212, 0.6)',
  'dark secondary 必须是 60%（ZCode foreground-subtle #d4d4d499）')
assert.equal(valueOf(darkBlock, '--dsw-alias-label-dimmed'), 'rgba(212, 212, 212, 0.3)',
  'dark dimmed(subtlest) 必须是 30%（#d4d4d44d + lucide .3 双证）')

// ── 4. tooltip 三件套 bg / label / key-bg（zcode-tokens.ts:247-249/473-475）─
// ZCode 成对定义 --color-tooltip(-foreground) 与 --color-tooltip-tag：
// 亮 #f0f0f0+#0d0d0d=17.05:1、暗 #2b2b2b+#f8f8f8=13.33:1。拆散成对或拿错侧
// 会重演「灰底白字看不清」（zcode-tokens.ts:52-59 注释实录）。
assert.equal(valueOf(lightBlock, '--dsw-alias-tooltip-bg'), '#f0f0f0',
  'light tooltip 底必须是 ZCode --color-tooltip 的 #f0f0f0')
assert.equal(valueOf(lightBlock, '--dsw-alias-tooltip-label'), '#0d0d0d',
  'light tooltip 文字必须是 ZCode --color-tooltip-foreground 的 #0d0d0d（成对深前景）')
assert.equal(valueOf(lightBlock, '--dsw-alias-tooltip-key-bg'), '#e6e6e6',
  'light tooltip 键位底必须与 tooltip-tag 同值 #e6e6e6')
assert.equal(valueOf(darkBlock, '--dsw-alias-tooltip-bg'), '#2b2b2b',
  'dark tooltip 底必须是 ZCode --color-tooltip 的 #2b2b2b')
assert.equal(valueOf(darkBlock, '--dsw-alias-tooltip-label'), '#f8f8f8',
  'dark tooltip 文字必须是 ZCode --color-tooltip-foreground 的 #f8f8f8（暗底浅前景）')
assert.equal(valueOf(darkBlock, '--dsw-alias-tooltip-key-bg'), '#363636',
  'dark tooltip 键位底必须与 tooltip-tag 同值 #363636')

// ── 5. 状态色三对 success / destructive / warning ──────────────────────────
// （zcode-tokens.ts:174/177/179-180、405/408/410）ZCode --color-success/
// --color-destructive/--color-warning 六值 asar 亲读全复现。
assert.equal(valueOf(lightBlock, '--dsw-alias-state-success-primary'), '#1e8a3e',
  'light success 必须是 ZCode --color-success 的 #1e8a3e')
assert.equal(valueOf(lightBlock, '--dsw-alias-state-error-primary'), '#e03131',
  'light destructive 必须是 ZCode --color-destructive 的 #e03131')
assert.equal(valueOf(lightBlock, '--dsw-alias-state-warn-primary'), '#e07b00',
  'light warning 必须是 ZCode --color-warning 的 #e07b00')
assert.equal(valueOf(darkBlock, '--dsw-alias-state-success-primary'), '#46bf72',
  'dark success 必须是 ZCode --color-success 的 #46bf72')
assert.equal(valueOf(darkBlock, '--dsw-alias-state-error-primary'), '#ff5c5c',
  'dark destructive 必须是 ZCode --color-destructive 的 #ff5c5c')
assert.equal(valueOf(darkBlock, '--dsw-alias-state-warn-primary'), '#ff8a30',
  'dark warning 必须是 ZCode --color-warning 的 #ff8a30')

// ── 6. 链接/焦点环蓝 --dsw-alias-link、--dsw-focus-ring-color ──────────────
// （zcode-tokens.ts:197/261、428/487）ZCode --color-terminal-blue：light
// #0b7fff / dark #4099ff。焦点环走语义令牌 = brand 口径：design-language/
// 03h-detail-sweep.md:32 与 07-delivery-ledger.md:55 均确记 #0b7fff。
assert.equal(valueOf(lightBlock, '--dsw-alias-link'), '#0b7fff',
  'light 链接色必须是 ZCode --color-terminal-blue 的 #0b7fff')
assert.equal(valueOf(lightBlock, '--dsw-focus-ring-color'), '#0b7fff',
  'light 焦点环必须与链接同走 brand 口径 #0b7fff（03h:32 / 07:55 确记）')
assert.equal(valueOf(darkBlock, '--dsw-alias-link'), '#4099ff',
  'dark 链接色必须是 ZCode --color-terminal-blue 的 #4099ff')
assert.equal(valueOf(darkBlock, '--dsw-focus-ring-color'), '#4099ff',
  'dark 焦点环必须随主题切到 #4099ff')

// ── 7. 字号刻度：基准 14px + calc 相对档（zcode-tokens.ts:551-560）──────────
// ZCode DESIGN.md 把 --text-ui-* 七档列为最高优先级约束；基准 --ui-font-size
// =14px，档位相对基准 calc（asar：2xs-5/xs-4/sm-2/caption-1/lg+2/xl+4）。
// design-language/03n-typography.md:10-11 A1/A2 背书。扩展三档是 2026-10-13
// 制度化补档（值与原例外 20/22/34px 逐一对齐），只许用于页面标题与 hero。
assert.equal(valueOf(structuralBlock, '--dsw-font-size-base'), '14px',
  '基准字号必须是 14px（ZCode --ui-font-size，03n A1）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-2xs'), 'calc(var(--dsw-font-size-base) - 5px)',
  '2xs 档必须是 -5px 的 calc 同构（ZCode --text-ui-* delta）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-xs'), 'calc(var(--dsw-font-size-base) - 4px)',
  'xs 档必须是 -4px 的 calc 同构')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-sm'), 'calc(var(--dsw-font-size-base) - 2px)',
  'sm 档必须是 -2px 的 calc 同构（14-2=12，03n A2）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-caption'), 'calc(var(--dsw-font-size-base) - 1px)',
  'caption 档必须是 -1px 的 calc 同构')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-lg'), 'calc(var(--dsw-font-size-base) + 2px)',
  'lg 档必须是 +2px 的 calc 同构（14+2=16，03n A2）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-xl'), 'calc(var(--dsw-font-size-base) + 4px)',
  'xl 档必须是 +4px 的 calc 同构（14+4=18，03n A2）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-display'), 'calc(var(--dsw-font-size-base) + 20px)',
  'display 扩展档必须是 +20px（原例外 34px=14+20，逐一对齐收归）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-headline'), 'calc(var(--dsw-font-size-base) + 8px)',
  'headline 扩展档必须是 +8px（原例外 22px=14+8）')
assert.equal(valueOf(structuralBlock, '--dsw-font-size-title'), 'calc(var(--dsw-font-size-base) + 6px)',
  'title 扩展档必须是 +6px（原例外 20px=14+6）')

// ── 8. 圆角标度 + --dsw-radius-panel:16px（zcode-tokens.ts:504-521）─────────
// Tailwind v4 标度（asar：sm .25rem/md .375rem/lg .5rem/xl .75rem/2xl 1rem），
// 2xl=1rem=16px=panel。panel 是对宿主 --dsw-radius-panel:28px 的定向覆盖
//（:root:root 特异性机制，zcode-tokens.ts:509-517 注释），2026-10-28 03j
// 定为 16px（rounded-2xl）。full 一处字面差异已登记不影响结论：ZCode 9999px、
// ours 999px，均为胶囊语义（超出元素尺寸即全圆）。
assert.equal(valueOf(structuralBlock, '--dsw-radius-xs'), '2px', 'xs 圆角必须是 2px')
assert.equal(valueOf(structuralBlock, '--dsw-radius-sm'), '4px', 'sm 圆角必须是 4px（.25rem）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-md'), '6px', 'md 圆角必须是 6px（.375rem）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-lg'), '8px', 'lg 圆角必须是 8px（.5rem）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-xl'), '12px', 'xl 圆角必须是 12px（.75rem）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-panel'), '16px',
  'panel 必须是 16px=rounded-2xl（03j:10 确记；回落 28px = 宿主覆盖机制失效）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-2xl'), '16px',
  '2xl 白名单大圆角必须与 panel 同值 16px（1rem）')
assert.equal(valueOf(structuralBlock, '--dsw-radius-full'), '999px',
  'full 必须是 999px 胶囊（ZCode 9999px 的字面差异已登记，胶囊语义不变）')

// ── 9. 等宽字体栈（zcode-tokens.ts:530-531）────────────────────────────────
// ZCode --font-mono 完整串（asar grep 提取后 python data.count() 精确匹配恰
// 1 次，与 repo 逐字节相同——非目测）。栈里刻意前置 CJK 无衬线族兜底：
// Consolas 不含中文字形（ZCode @theme 块注释）。
const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", monospace'
assert.equal(valueOf(structuralBlock, '--dsh-font-family-code-default'), FONT_MONO,
  '等宽栈必须与 ZCode --font-mono 逐字节一致（data.count() 闭合的那一串）')
assert.equal(source.split(FONT_MONO).length - 1, 1,
  '等宽栈全文件应恰出现 1 次：复制出第二份就会各自漂移')

// ── 10. hover / selected 交互态（zcode-tokens.ts:144/375/377）──────────────
// ZCode --color-hover / --color-selected：light 黑 5%（#0d0d0d0d，0x0d≈5.1%）、
// dark 白 5%（#ffffff0d）、dark 选中白 10%（#ffffff1a≈10.2%）。asar 原串在
// design-language/04-open-gaps.md:111 TR2 有逐字实录，与本仓取值一致。
assert.equal(valueOf(lightBlock, '--dsw-alias-interactive-bg-hover'), 'rgba(13, 13, 13, 0.05)',
  'light hover 必须是黑 5%（ZCode #0d0d0d0d，TR2 收口定案）')
assert.equal(valueOf(darkBlock, '--dsw-alias-interactive-bg-hover'), 'rgba(255, 255, 255, 0.05)',
  'dark hover 必须是白 5%（ZCode #ffffff0d）')
assert.equal(valueOf(darkBlock, '--dsw-alias-interactive-bg-active'), 'rgba(255, 255, 255, 0.1)',
  'dark 选中态必须是白 10%（ZCode --color-selected #ffffff1a）')

console.log('✓ night-audit-batch-5：zcode-tokens 10 条已复核令牌，52 条断言全部通过')
