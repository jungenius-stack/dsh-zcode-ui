// Windows / 经典滚动条平台适配断言（2026-11-10）
//
// ## 为什么单独一个文件
// 用户朋友的 Windows 真机装了 2.3.7 后反馈「亮色发灰、暗色刻度漂浮」。定位到两条
// 与渲染平台相关的根因，各自落在不同源文件里，不适合塞进既有的按模块分组的批次断言：
//
// 1. **scrollbar-gutter:stable both-edges 在经典滚动条平台吃掉 30–34px**
//    定价前提是「覆盖式滚动条宽度 0」（macOS 实测）。Windows 每边真占 15–20px，
//    both-edges 双边预留让内容宽度凭空少 30–34px：848 主列与 864 输入卡够不到
//    1280 断点、宽档容器查询可能永不触发，内容整体收窄而侧栏/刻度条按完整视口定位
//    → 相对关系错位 = 用户看到的「刻度漂浮」。
//    修法：运行时实测滚动条宽度，>0 就把属性写到 html，CSS 侧降级为单边 stable。
//    **判据必须是实测而非平台名**：Electron 可强制 overlay、Win11 的 overlay 是系统
//    开关（同一台机器能变）、Linux 各桌面环境不一、未来 Chrome 可能把 overlay 推回
//    Windows。这四条里任何一条都能让「猜平台名」的代码在某个真实用户身上选错分支。
//
// 2. **0.5px 边框在 1x 屏没有物理落点**
//    ZCode 的 border-[0.5px] 量于 Retina（DPR 2）。Windows 常见 100%/125% 缩放
//    对应 DPR 1 / 1.25：0.5px 落不到物理像素上，Chromium 要么丢边（输入卡失去轮廓、
//    与背景糊在一起 →「发灰」），要么吸附成 1px 硬线（比设计粗一倍 →「发虚」）。
//    修法：`@media (max-resolution:1.5dppx)` 补到 1px。判据同样用 DPR 而非平台名：
//    外接 2x 屏的 Windows 应保持 0.5px 原设计。
//
// 刻意不锁的项（登记在此，避免后续把差异当缺陷反复"修"）：
//   - 经典平台单边 stable 仍有 15–20px 右 gutter —— 这是保留「滚动条出现/消失右侧
//     不跳」的代价，不是缺陷。
//   - 字体从 SF Pro 落到 Segoe UI 的字形宽度差 —— 由系统决定，皮肤不该硬钉字体名。
//   - 3–6% 黑影在 1x 屏显平 —— 观感差，放大阴影会破坏 macOS 既有对齐。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p: string): string => readFileSync(new URL(`../src/client/${p}`, import.meta.url), 'utf8')

const layout = read('conversation-layout.ts')
const sidebar = read('CodexSidebar.tsx')
const scrollbar = read('classic-scrollbar.ts')
const index = read('index.ts')

// ── 1. 运行时实测滚动条宽度，而不是猜平台 ─────────────────────────────────
assert.match(
  scrollbar,
  /probe\.offsetWidth - probe\.clientWidth/,
  'classic-scrollbar 必须用 offsetWidth−clientWidth 实测滚动条占位宽度——猜平台名会在 Electron 强制 overlay / Win11 overlay 开关 / Linux 各家行为上选错分支',
)
assert.match(
  scrollbar,
  /const CLASSIC_THRESHOLD_PX = 2/,
  '判定阈值必须存在且为 2px：覆盖式滚动条宽度 0，经典式至少 10px，2px 用于吸收亚像素舍入',
)
assert.match(
  scrollbar,
  /root\.setAttribute\(CLASSIC_SCROLLBAR_ATTR, ''\)/,
  '实测 >0 时必须写 html 属性，CSS 侧才有开关可挂',
)
assert.match(
  scrollbar,
  /root\.removeAttribute\(CLASSIC_SCROLLBAR_ATTR\)/,
  'overlay 环境（宽度 0）必须主动摘属性——否则从经典平台切回 overlay 时会留下错误的单边 gutter',
)
assert.match(
  scrollbar,
  /window\.addEventListener\('resize', onResize\)/,
  '必须监听 resize：跨屏拖动与系统缩放会在 overlay/经典之间切换，只测一次会锁在启动时的结论上',
)
assert.match(
  scrollbar,
  /requestAnimationFrame/,
  'resize 重测必须合并到下一帧——拖窗口时每像素一次离屏探针会强制同步布局',
)

// ── 2. CSS 侧：both-edges 保留为默认，仅经典平台降级 ──────────────────────
assert.match(
  layout,
  /\[data-conversation-scroll\]:not\(:has\(\[data-conversation-composer-overlay\]\)\)\{scrollbar-gutter:stable both-edges\}/,
  'both-edges 必须保持为默认（macOS 覆盖式滚动条下它不花钱且能防跳动）；删掉它会改变已校准的 macOS 布局',
)
assert.match(
  layout,
  /html\[data-dcu-classic-scrollbar\] \[data-conversation-scroll\]:not\(:has\(\[data-conversation-composer-overlay\]\)\)\{scrollbar-gutter:stable\}/,
  '经典平台降级规则必须挂在 html[data-dcu-classic-scrollbar] 下，且保留单边 stable（滚动条出现/消失时右侧不跳）',
)

// ── 3. 半像素边框：DPR 判据 + 1px 补偿 ───────────────────────────────────
assert.match(
  sidebar,
  /border:\.5px solid var\(--dcu-composer-border\)/,
  '输入卡保留 ZCode 的 0.5px 原设计（Retina 上细而不虚），不要改成固定 1px',
)
assert.match(
  sidebar,
  /@media \(max-resolution: 1\.5dppx\)\{\[data-conversation-scroll\] \[data-composer-card\]\{border-width:1px\}\}/,
  'DPR ≤1.5 时必须补到 1px：0.5px 在 1x 屏没有物理落点，会丢边或吸硬（用户报的「发灰」主因之一）',
)

// ── 4. 安装接线 ─────────────────────────────────────────────────────────
assert.match(
  index,
  /import \{ observeClassicScrollbar \} from '\.\/classic-scrollbar\.ts'/,
  'index.ts 必须导入 classic-scrollbar 观察器',
)
assert.match(
  index,
  /ctx\.effect\(\(\) => observeClassicScrollbar\(\), '[^']+'\)/,
  '观察器必须挂进 ctx.effect，否则插件卸载时属性残留、重装后不重测',
)

console.log('windows-classic-scrollbar: 11 条断言通过')
