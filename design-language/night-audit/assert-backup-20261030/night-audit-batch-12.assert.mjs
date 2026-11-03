/**
 * 夜审第 12 批 —— ZCode 对齐项的回归契约（纯 JS .mjs，过 tsc --noEmit 全仓门禁；
 * 第三轮重写：前两轮版本因机器高负载下的门禁崩溃被保险丝撤回，非内容问题）。
 *
 * ## 锁什么（10 条已复核对齐项）
 *
 * 1.  **startup-splash.ts pop 入场动画**：animation 简写 `dcu-startup-logo-pop 0.72s
 *     cubic-bezier(0.22,1,0.36,1) forwards` + 关键帧五段
 *     0%(opacity 0/scale .72) → 38%(1.045) → 58%(0.985) → 76%(1.008) → 100%(1)。
 *     取值来自 ZCode：asar 实跑 `grep -a -o 'startup-logo-pop[^"]{0,80}'
 *     /Applications/ZCode.app/Contents/Resources/app.asar` →
 *     `startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;`（同值，
 *     逗号后空格仅格式差）；文档依据 design-language/03p-startup.md:11 入场行。
 * 2.  **startup-splash.ts 徽标壳几何与外观**：96×96 / radius 24px /
 *     linear-gradient(180deg,#000000→#151718) / 双层 box-shadow + ::before
 *     1px 白 10% 边框（V-4 复刻）。文档依据 03p-startup.md:10 徽标壳行、:50 V-4。
 * 3.  **startup-splash.ts 门控三值与遮罩形态**：HARD_CAP_MS=3000 / FADE_OUT_MS=160 /
 *     REMOVE_DELAY_MS=500；遮罩 z-index:2147483647 + 0.16s ease 淡出；
 *     reduced-motion 双通道（CSS 置最终态 animation:none + JS 按 FADE_OUT_MS 就绪）。
 *     文档依据 03p-startup.md:9 遮罩行、:13 门控行（3s 硬上限 / reduced-motion 跳动画）。
 * 4.  **conversation-header.ts HD1 底部分隔线**：浅色 rgba(13,13,13,.05)（新旧宿主
 *     两条规则）+ 深色 rgba(255,255,255,.05)（body[data-ds-dark-theme] 与
 *     html.theme-zai-dark 两分支）。文档依据 03e-header.md:61 HD1 判定表
 *     「1px solid 白5%（深）/黑5%（浅）」。
 * 5.  **conversation-header.ts HD3 页签字号字重**：宿主页签 .ST7X_W_tab 强制
 *     font-size:var(--dsw-font-size-base) / font-weight:600；字号令牌 = 14px
 *     （zcode-tokens.ts:554）。文档依据 03e-header.md:28（标题 14px/600）、:63（HD3）。
 * 6.  **conversation-header.ts HD5 顶栏图标按钮**：三条结构化选择器
 *     （crumbSeg 内按钮 / headerUtilities 内「直接子节点仅 svg」的按钮 /
 *     aria「访达」「打开方式」两个特殊按钮）统一 28×28 + min 28×28 + padding:0 +
 *     radius-lg；radius-lg=8px（zcode-tokens.ts:507）。文档依据
 *     04-open-gaps.md:714（断言原文）、:750（复验）、:916（=8px）。
 * 7.  **conversation-header.ts 键盘焦点环**：页签 :focus-visible →
 *     outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px。
 *     ZCode asar 实跑 `grep -a -o -E 'focus-visible{outline[^}]{0,70}'` 首条同构
 *     （2px + offset -2px）；focus-ring-color=brand #0b7fff 见 07-delivery-ledger.md:55（A2）。
 * 8.  **ConnectorsSection.tsx iframe 暗色主题四槽**：--bg:#161616 / --card:#2b2b2b /
 *     --line:rgba(255,255,255,.1) / --text:#d4d4d4，与 ZCode 令牌同值
 *     （01-design-tokens.md:19 背景、:20 卡片；边框白 10%；前景 oklch(87%)≈#d4d4d4）。
 *     注意该串是塞进 iframe `<style>` 的**字面量**（CSS 自定义属性不跨 document 继承，
 *     见源码 :28-43 注释），必须保持字面值、不得改写成 var() 引用。
 * 9.  **ConnectorsSection.tsx 连接器容器圆角**：.dcu-connector-frame 与
 *     .dcu-connector-list 均 border-radius:var(--dsw-radius-xl)；radius-xl=12px
 *     （zcode-tokens.ts:508）。文档依据 03f-settings.md:65（S2c 卡片圆角 12px）。
 * 10. **conversation-header.ts 自绘按钮 aria-label 收口**：folder=「打开所在项目」、
 *     more=「更多操作」。文档依据 03h-detail-sweep.md:107-119（DS4 修复 + 断言防回归）、
 *     04-open-gaps.md:2010（可见无标签按钮=0 收口，345 button/186 可见）。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * 这批锁的全是「移植取值」：数值、色值、缓动曲线、选择器形态、文案。渲染测试需要
 * 活宿主与真实主题环境，同样的取值错误照样绿；源码文本断言能确定地锁住「源里写着
 * 什么」，谁改动这些对齐值（或顺手"优化"掉）门禁立刻红。令牌引用
 * （--dsw-font-size-base / --dsw-radius-lg / --dsw-radius-xl）同时锚定
 * zcode-tokens.ts 的定义，令牌漂移也会红。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(resolve(root, 'src/client', name), 'utf8')

// ── 1. startup-splash.ts：pop 入场动画逐值（:34 简写 + :39 关键帧五段）────────
const splashSource = read('startup-splash.ts')
assert.match(
  splashSource,
  /animation:dcu-startup-logo-pop 0\.72s cubic-bezier\(0\.22,1,0\.36,1\) forwards/,
  '动画简写变了：ZCode asar 实跑 grep 命中 startup-logo-pop 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards（同值）',
)
assert.match(
  splashSource,
  /@keyframes dcu-startup-logo-pop\{0%\{opacity:0;transform:scale\(0\.72\)\}38%\{opacity:1;transform:scale\(1\.045\)\}58%\{transform:scale\(0\.985\)\}76%\{transform:scale\(1\.008\)\}100%\{opacity:1;transform:scale\(1\)\}\}/,
  '关键帧五段变了：弹性曲线 0.72→1.045→0.985→1.008→1 是与 ZCode 启动页逐值对照的锚点',
)

// ── 2. startup-splash.ts：徽标壳几何与外观（:34 壳规则 + :36 ::before 边框）───
assert.match(
  splashSource,
  /\.dcu-splash-badge\{[^}]*width:96px;height:96px[^}]*border-radius:24px/,
  '徽标壳尺寸/圆角变了：ZCode 启动 logo 壳为 96×96、radius 24px（03p-startup.md:10 徽标壳行）',
)
assert.match(
  splashSource,
  /\.dcu-splash-badge\{[^}]*background:linear-gradient\(180deg,#000000 0%,#151718 100%\)/,
  '徽标壳渐变变了：ZCode 为 180deg 黑 → #151718 线性渐变（V-4 复刻）',
)
assert.match(
  splashSource,
  /\.dcu-splash-badge\{[^}]*box-shadow:0 20px 25px -5px rgb\(0 0 0 \/ 0\.2\),0 8px 10px -6px rgb\(0 0 0 \/ 0\.2\)/,
  '徽标壳投影变了：ZCode 双层 shadow（0 20px 25px -5px + 0 8px 10px -6px，均黑 20%）',
)
assert.match(
  splashSource,
  /\.dcu-splash-badge::before\{[^}]*border:1px solid rgba\(255,255,255,0\.1\);border-radius:inherit/,
  'V-4 边框复刻丢失：壳自带 1px 白 10% 边框、圆角 inherit（03p-startup.md:50）',
)

// ── 3. startup-splash.ts：门控三值与遮罩形态（:22-26 常量 + :29 遮罩 + :40/:91）─
assert.match(
  splashSource,
  /const HARD_CAP_MS = 3000/,
  '硬上限变了：ZCode 是 3s 无条件移除（03p-startup.md:13 门控行），改小会提前拆遮罩、改大遮罩可能卡死',
)
assert.match(
  splashSource,
  /const FADE_OUT_MS = 160/,
  '淡出时长变了：ZCode 原文 0.16s ease',
)
assert.match(
  splashSource,
  /const REMOVE_DELAY_MS = 500/,
  '移除延迟变了：ZCode 原文淡出后 500ms 再 remove',
)
assert.match(
  splashSource,
  /#dcu-splash\{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;transition:opacity 0\.16s ease\}/,
  '遮罩形态变了：全屏 fixed + 最高层 z-index:2147483647 + 0.16s ease 淡出过渡',
)
assert.match(
  splashSource,
  /@media \(prefers-reduced-motion: reduce\)\{\.dcu-splash-badge\{opacity:1;transform:scale\(1\);animation:none\}\}/,
  'reduced-motion 的 CSS 通道丢失：必须置最终态并禁动画（03p-startup.md:13）',
)
assert.match(
  splashSource,
  /if \(reduced\) window\.setTimeout\(ready, FADE_OUT_MS\)/,
  'reduced-motion 的 JS 通道丢失：就绪判定必须改走 FADE_OUT_MS 而非 3s 硬上限',
)

// ── 4. conversation-header.ts：HD1 底部分隔线（:24/:26 浅色 + :30-33 深色）────
const headerSource = read('conversation-header.ts')
assert.match(
  headerSource,
  /header:has\(\[data-dcu-inline-tabs\]\)\{box-sizing:border-box;[^}]*border-bottom:1px solid rgba\(13,13,13,\.05\)\}/,
  'HD1 浅色分隔线（新版宿主）变了：ZCode 判定表为黑 5%（03e-header.md:61）',
)
assert.match(
  headerSource,
  /header:not\(:has\(\[data-dcu-inline-tabs\]\)\):has\(\[class\*="crumbCurrent"\]\)\{box-sizing:border-box;[^}]*border-bottom:1px solid rgba\(13,13,13,\.05\)\}/,
  'HD1 浅色分隔线（旧版宿主分支）变了：1.1.37 旧宿主同样按黑 5% 处理',
)
assert.match(
  headerSource,
  /body\[data-ds-dark-theme\] header:has\(\[data-dcu-inline-tabs\]\),\s*body\[data-ds-dark-theme\] header:not\(:has\(\[data-dcu-inline-tabs\]\)\):has\(\[class\*="crumbCurrent"\]\)\{border-bottom:1px solid rgba\(255,255,255,\.05\)\}/,
  'HD1 深色分支（body[data-ds-dark-theme]）变了：ZCode 判定表为白 5%（03e-header.md:61）',
)
assert.match(
  headerSource,
  /html\.theme-zai-dark header:has\(\[data-dcu-inline-tabs\]\),\s*html\.theme-zai-dark header:not\(:has\(\[data-dcu-inline-tabs\]\)\):has\(\[class\*="crumbCurrent"\]\)\{border-bottom:1px solid rgba\(255,255,255,\.05\)\}/,
  'HD1 深色分支（html.theme-zai-dark）变了：两套深色主题都必须给白 5%',
)

// ── 5. conversation-header.ts：HD3 页签字号字重（:69 规则 + 字号令牌锚点）─────
assert.match(
  headerSource,
  /header \[data-dcu-inline-tabs\] \[role="tab"\]\.ST7X_W_tab\{font-size:var\(--dsw-font-size-base\);font-weight:600\}/,
  'HD3 页签字号字重变了：ZCode 顶栏标题 14px/600；字号必须走令牌（字面值会被 design-system 断言拦截）',
)
const tokensSource = read('zcode-tokens.ts')
assert.match(
  tokensSource,
  /'--dsw-font-size-base': '14px',/,
  '字号基准 base=14px 漂移（zcode-tokens.ts:554，HD3 页签字号的令牌依据）',
)

// ── 6. conversation-header.ts：HD5 顶栏图标按钮 28×28 + radius-lg（:100-108）──
assert.match(
  headerSource,
  /header\.ST7X_W_header \[class\*=ST7X_W_crumbSeg\] button:not\(\[role="tab"\]\),/,
  'HD5 选择器 A（crumbSeg 面包屑图标按钮）丢失：这是三条结构化规则之一',
)
assert.match(
  headerSource,
  /header\.ST7X_W_header \[class\*=ST7X_W_headerUtilities\] button:not\(\[role="tab"\]\):has\(> svg\):not\(:has\(> :not\(svg\)\)\),/,
  'HD5 选择器 B 必须是「直接子节点只有 svg」：:has(svg) 后代匹配会误命中「会话管理」（内部 SPAN 含 svg）导致折行',
)
assert.match(
  headerSource,
  /header\.ST7X_W_header button\[aria-label\*="访达"\],\s*header\.ST7X_W_header button\[aria-label\*="打开方式"\]\{/,
  'HD5 选择器 C 丢失：「访达」是 IMG、「更多打开方式」无子节点，两条结构判据都漏，必须按 aria 精确命中',
)
assert.match(
  headerSource,
  /width:28px;height:28px;min-width:28px;min-height:28px;\s*padding:0;\s*border-radius:var\(--dsw-radius-lg\);/,
  'HD5 按钮规格变了：统一 28×28（含 min）+ padding:0 + radius-lg（04-open-gaps.md:714/750）',
)
assert.match(
  tokensSource,
  /'--dsw-radius-lg': '8px',/,
  '半径标度锚点 lg=8px 漂移（zcode-tokens.ts:507，HD5 顶栏按钮 radius 8px 的依据）',
)

// ── 7. conversation-header.ts：键盘焦点环（:56）──────────────────────────────
assert.match(
  headerSource,
  /header \[data-dcu-inline-tabs\] \[role=tab\]:focus-visible\{outline:2px solid var\(--dsw-focus-ring-color,var\(--dcu-focus\)\);outline-offset:-2px\}/,
  '页签键盘焦点环变了：ZCode 同构 outline 2px + offset -2px（asar grep 首条 focus-visible{outline…}）',
)

// ── 8. ConnectorsSection.tsx：iframe 暗色主题四槽（:45）──────────────────────
const connectorsSource = read('ConnectorsSection.tsx')
assert.match(
  connectorsSource,
  /const frameDarkTheme = `:root\{color-scheme:dark;--bg:#161616;--card:#2b2b2b;--line:rgba\(255,255,255,\.1\);--text:#d4d4d4/,
  'iframe 暗色四槽变了：--bg #161616 / --card #2b2b2b / --line 白10% / --text #d4d4d4，与 ZCode 令牌同值（01-design-tokens.md:19-20）；且必须保持字面量塞进 iframe（CSS 变量不跨 document 继承）',
)

// ── 9. ConnectorsSection.tsx：连接器容器圆角（:25）+ 半径令牌锚点 ─────────────
assert.match(
  connectorsSource,
  /\.dcu-connector-frame\{[^}]*border-radius:var\(--dsw-radius-xl\)/,
  '连接器市场 iframe 容器圆角变了：S2c 卡片圆角 12px（03f-settings.md:65）',
)
assert.match(
  connectorsSource,
  /\.dcu-connector-list\{[^}]*border-radius:var\(--dsw-radius-xl\)/,
  '连接器原生列表容器圆角变了：与 frame 同用 radius-xl',
)
assert.match(
  tokensSource,
  /'--dsw-radius-xl': '12px',/,
  '半径标度锚点 xl=12px 漂移（zcode-tokens.ts:508，连接器容器圆角的令牌依据）',
)

// ── 10. conversation-header.ts：自绘按钮 aria-label 收口（:157）───────────────
assert.match(
  headerSource,
  /button\.setAttribute\('aria-label', marker === 'folder' \? '打开所在项目' : '更多操作'\)/,
  '自绘标题按钮的无障碍标签丢了：DS4 修复后可见无标签按钮=0（03h-detail-sweep.md:107-119、04-open-gaps.md:2010），删掉即回归',
)

console.log('night-audit batch-12 对齐契约：29 条断言全部通过')
