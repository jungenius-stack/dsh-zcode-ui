# 批次 1 · src/client/CodexWorkspaceBrowser.tsx

> 2026-10-29 夜间审计。参照文档：`03b-sidebar.md`（侧栏任务行定案）、`02-motion.md`（动效分档）、`03n-typography.md`、`03j-dialog.md`（弹窗输入框）、`01-design-tokens.md`（令牌纪律）。
> 本批 asar 提取命令（均为本轮实跑）：
> - `grep -a -o 'animation:\.3s ease-in-out[^;]\{0,80\}' /Applications/ZCode.app/Contents/Resources/app.asar` → `animation:.3s ease-in-out forwards zcode-collapsible-up!important`
> - `grep -a -o -- '--ease-out:[^;]\{0,60\};--ease-in-out:[^;]\{0,60\};--animate-spin:[^;]\{0,60\};' …app.asar` → `--ease-out:cubic-bezier(0, 0, .2, 1);--ease-in-out:cubic-bezier(.4, 0, .2, 1);--animate-spin:spin 1s linear infinite;`
> - 主题层令牌现值读自 `uiplug/src/client/zcode-theme.ts`（只读）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| CodexWorkspaceBrowser.tsx | 折叠体缓动曲线（展开/收起树层级） | `animateDisclosure` 硬编码 `cubic-bezier(0,0,0.2,1)`（`CodexWorkspaceBrowser.tsx:136`，`DISCLOSURE_EXIT_MS=300` 见 `:89`） | `.3s ease-in-out`，而 ZCode 主题把 `--ease-in-out` 重定义为 `cubic-bezier(.4, 0, .2, 1)` —— 实际曲线是 (.4,0,.2,1)，即本仓的 **collapse 档曲线**，不是 move 档 | asar：`animation:.3s ease-in-out forwards zcode-collapsible-up`；asar：`--ease-in-out:cubic-bezier(.4, 0, .2, 1)`；`02-motion.md` asar 二次校正表「分组折叠体 animation:.3s ease-in-out → 300ms 独立 collapse 档」；本仓主题层已有正确档 `--dcu-motion-collapse-ease:cubic-bezier(.4,0,.2,1)`（`zcode-theme.ts:138`）却未被本模块引用（`:88` 注释误记为「move 档 0.3s」） | 折叠动画改用 `--dcu-motion-collapse-duration/--dcu-motion-collapse-ease`（300ms / (.4,0,.2,1)），并修正 `:88` 注释的档位归属；时长不动 |
| CodexWorkspaceBrowser.tsx | 运行中 spinner 图标尺寸 | `.dcu-wb-running svg{width:14px;height:14px}`（`CodexWorkspaceBrowser.tsx:316`） | 左槽 16×16（lucide-loader） | `03b-sidebar.md` §5 CDP 实测「左槽 16×16 空 span；仅运行中任务显示 lucide-loader」；本模块注释 `:309` 自述「size-4 = 16px」与实现 14×14 自相矛盾 | svg 改 16×16（容器已 16px 宽）；颜色 56% tertiary 属三档色适配（03b §5 微差③同族），不动 |
| CodexWorkspaceBrowser.tsx | 分组间距 | `.dcu-wb-collections{gap:12px}`（`:348`）+ 项目体尾 12px（`:334`） | 组间 `gap-2` = 8px | `03b-sidebar.md` §5 行距行「组间 gap-2=8」 | 结构语境不同（ZCode 平铺任务列表无 workspace 分组层；12px 是 2026-10-18 设计审计 P0-5 的可读性裁决，见 `:328-333` 注释）——**维持 P0-5 裁决**，仅登记数值差异 |
| CodexWorkspaceBrowser.tsx | 会话行内左距 | `padding-left:40px`（`:236`，40 = 14+16+10） | 34 = 10+16+8 | `03b-sidebar.md` §5 微差②（行内左距 34 vs 40） | **已裁决记录不修**（单独改会把 2px 净差拉到 4px，见 03b §5 微差②）——维持，勿动 |

## 一致项（可写成源码文本断言，用于回归加固）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| CodexWorkspaceBrowser.tsx | 行 hover 背景过渡档位 | `.dcu-wb-project-head,.dcu-wb-session{transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}`（`:212`）且 feedback = 150ms / `cubic-bezier(.4,0,.2,1)`（`zcode-theme.ts:131`） | `02-motion.md` §1「微交互 150ms + 实测 (.4,0,.2,1)」 |
| CodexWorkspaceBrowser.tsx | 行 hover/选中底色 | `background:var(--dcu-sidebar-selected)`（`:215`）；深色 `rgba(255,255,255,.1)`（白 10%）、浅色 `rgba(13,13,13,.05)`（黑 5%） | `03b-sidebar.md` §5 hover 底行 + §5 浅色定案块（`#ffffff1a` / `#0d0d0d0d`） |
| CodexWorkspaceBrowser.tsx | 会话标题排版 | `.dcu-wb-session-title{font-size:var(--dsw-font-size-base);line-height:21px;font-weight:500}`（`:318`） | `03b-sidebar.md` §5 标题行（14px/21px）+ G13（字重 500 已对齐） |
| CodexWorkspaceBrowser.tsx | 项目标题色走语义令牌 | `color:var(--dcu-sidebar-secondary)`（`:318`）且令牌为 alpha 形态：浅 `color-mix(in oklab,#404040 85%,transparent)` / 深 `color-mix(in oklab,#d4d4d4 68%,transparent)`（`zcode-theme.ts:277,333`） | `03b-sidebar.md` G14 判定表「含 alpha ⇒ 已修」（不再写死 rgb(150,150,150)） |
| CodexWorkspaceBrowser.tsx | 时间戳字号与数字等宽 | `.dcu-wb-session-time{font-size:var(--dsw-font-size-sm);font-variant-numeric:tabular-nums}`（`:237`；sm = 12px） | `03b-sidebar.md` §5 时间戳行（ZCode 12px）；色 68% vs 60% 为已裁决微差③，不锁 |
| CodexWorkspaceBrowser.tsx | 折叠时长 | `DISCLOSURE_EXIT_MS = 300`（`:89`） | `02-motion.md` asar 二次校正（分组折叠体 .3s）+ asar 原文（本轮提取）；easing 另见差异项第 1 行 |
| CodexWorkspaceBrowser.tsx | reduced-motion 三层全停 | JS：`animateDisclosure` 首行 `matchMedia('(prefers-reduced-motion: reduce)')` 返回 undefined（`:132`）；CSS：caret `transition:none`、section 入场 `animation:none`（`:203`）、tip `animation:none`（`:286`）；主题层全部档位置 0ms（`zcode-theme.ts:221`） | `02-motion.md` §4（CSS 过渡 motion-reduce 已做） |
| CodexWorkspaceBrowser.tsx | 运行中 spinner 旋转基元 | 引用主题层 `.dcu-spin{animation:dcu-spin 1s linear infinite}`（`zcode-theme.ts:185,203`，reduced-motion 停静止帧 `:225`） | asar 本轮提取 `--animate-spin:spin 1s linear infinite`（逐字一致） |
| CodexWorkspaceBrowser.tsx | 弹窗内输入框几何 | `.dcu-wb-rename-input{height:36px;border-radius:var(--dsw-radius-lg)}`（`:299`；radius-lg = 8px） | `03j-dialog.md` A 段复测记录「输入/下拉 36 高 radius 8」 |
| CodexWorkspaceBrowser.tsx | hover 卡底/边/影走 tip 令牌 | `.dcu-wb-tip{border:1px solid var(--dcu-sidebar-border);background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow)}`（`:286`） | `03j-dialog.md` A3/A4/A6（#2b2b2b 底、1px 10% 边、shadow-md 双层，均已对齐） |

## 无参照项（不得猜）

- 拖拽 ghost（`0 4px 12px rgba(0,0,0,.24)` 阴影、高 30px、max-width 220px、setDragImage 偏移 16,15、z-index 10040，`:104-121,218`）—— ZCode 任务行拖拽预览样式未采集（03b §4 未覆盖），无例证，跳过
- 拖拽落点指示线（2px 圆头线 + 8px 空心圆环 + 9% business-primary 高亮底，`:325-327,211`）—— ZCode 任务行拖拽排序指示无采集记录，跳过
- 未读点 6×6 / 待处理胶囊（7×7 点 + warn 色，`:287-288`）—— ZCode 任务行行首槽仅 running loader（03b §5），无未读/待处理指示例证，跳过
- 键盘 focus-visible 外圈（2px、offset −2px、radius-md，`:362`）—— ZCode 侧栏行键盘焦点样式未采集，跳过
- 分组头静息底 `color-mix(... 55%,transparent)` 与 chevron 尺寸（12/14px，`:353,355-357`）—— ZCode 平铺列表无对应分组层，无例证，跳过
