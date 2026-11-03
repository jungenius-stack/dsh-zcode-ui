# 批次 3 · src/client/sidebar-width.ts

> 对账文档：`03b-sidebar.md`、`02-motion.md`、`08-performance-audit.md`（04-open-gaps 仅定向 grep）；辅助实证：`design-language/tokens.json`、`cdp-capture/zcode-drag-limits.json`、`cdp-capture/zcode-live-geometry.json`、asar `grep -a` 提取。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| sidebar-width.ts | 侧栏最小拖拽宽度 | 200px（`CODEX_SIDEBAR_MIN_PX`，src/client/sidebar-width.ts:13） | 264px（拖拽下限；实测区间 264–599） | `cdp-capture/zcode-drag-limits.json`（CDP 实测：start=264、左拖极限 264、右拖极限 599、end=264）；偏离已在代码注释声明为「主动放宽」的可用性取舍（sidebar-width.ts:5-12）；`04-open-gaps.md` 定向 grep「拖拽下限/最小宽/放宽」无此裁决条目 | 保持（注释已声明取舍与依据）；建议把这条裁决补进 04-open-gaps，防后续被当 bug「修」回 264 |
| sidebar-width.ts | 开合时长令牌缺失时的兜底值 | 180ms（`readMoveDuration` 兜底，sidebar-width.ts:454-459，注释称「与 ZCode 动效分档一致」） | 无 180ms 档；「移动/侧栏开合」档 = 200ms | `02-motion.md`「2026-10-29 ZCode asar 二次校正」表：侧栏开合 200ms（asar 原文 `duration-200 ease-out transition-[width,opacity]`），全部分档 150/200/300/90 无 180；本仓库现令牌已是 200ms（zcode-theme.ts:137），180 是改档前旧值（zcode-theme.ts.bak-motion-*:125 = 180ms）；顺带 sidebar-width.ts:662/752/758 的「180ms／默认 360ms」叙事同批过时 | 兜底改 200ms、更新注释；连同 662/752/758 旧档叙事一并清理 |
| sidebar-width.ts | 开合动画的实现属性 | 轨道静止 + 内容列 `transform`／侧栏面 `clip-path` 位移，下一帧起跑、落定零重排（sidebar-width.ts:39-60、632-667） | 直接过渡 `width`（+opacity） | asar 提取 `grep -a -o 'duration-200 ease-out transition-\[width,opacity\]' /Applications/ZCode.app/Contents/Resources/app.asar` = 1 处命中；偏离依据：`02-motion.md` §3（DSH 会话 38k+ 节点 vs ZCode ~737，每帧布局不可承受）+ `08-performance-audit.md` 修复后表（开合长任务 0、帧 16.7~17.3ms） | 保持——DSH 节点量级约束下的显式技术偏离；时长/曲线已与 ZCode 对齐（见对齐项 2），不改 |
| sidebar-width.ts | 侧栏底色注释（applyRailShifts 内） | 注释写「#f0f0f0 / #161616」（sidebar-width.ts:283）；实际令牌 #f5f5f5 / #161616（zcode-theme.ts:245-246、266） | resolved `--color-sidebar`：light = oklch(97% 0 0)（≈#f5f5f5）、dark = #161616 | `design-language/tokens.json`：`--color-sidebar = {light:"oklch(97% 0 0)", dark:"#161616"}`（CDP 像素回读）；asar `--color-neutral-100:oklch(97% 0 0)`；asar 里另有字面量 `--color-sidebar:#f0f0f0`（旧注释值出处），已被 zcode-theme.ts:265「原值 #f0f0f0（240）比 ZCode 侧栏层还暗 5 个通道」推翻 | 只改注释为 #f5f5f5 / #161616（值本身已对齐，见对齐项 4） |
| sidebar-width.ts | 注释残留旧默认值「240」 | sidebar-width.ts:347「宿主列宽覆盖成 240」、:445「否则默认 240」；代码实际比较/取值均为 `CODEX_SIDEBAR_DEFAULT_PX` = 264（:16、:348、:447） | 264px | 本仓库代码 :16 与 `cdp-capture/zcode-live-geometry.json`（`sidebar.w = 264`，CDP 实测）+ `04-open-gaps.md:784`（侧栏 宽 264 ✅） | 注释 240 改 264；纯注释修正，不动逻辑 |

## 无参照项（不得猜）

- 收起轨宽 56px（`CODEX_SIDEBAR_RAIL_PX`，sidebar-width.ts:17）——asar grep `SidebarCollapsed|sidebar-collapsed|w-\[56px\]` 均 0 命中（`toggle-sidebar` 仅命令名 ×7，无宽度值）；zcode-drag-limits.json 未测收起态。ZCode 是否存在收起轨无例证，跳过
- 索引栏左缘 = 侧栏轨道宽 + 16px（sidebar-width.ts:694；TurnNavigator.tsx:142 同式 `Math.round(tracks.sidebar) + 16`）——ZCode 轮次导航用不同定位模型（`03-turn-navigator.md:96`：「ZCode 48 含 12 内缩，DSH 28 无内缩」，且明令禁用 nav 左缘做跨端锚点），无「侧栏右缘 + 16px」的 ZCode 例证，跳过
- 无快照恢复时退回宿主默认 280px（sidebar-width.ts:347-350，含 handle left=280px）——属 DSH 宿主互操作回退值，ZCode 无对应恢复逻辑；DSH 宿主默认宽度本批无条件实测，未验证
- 开合动画超时兜底 `duration + 120`ms（sidebar-width.ts:766）——内部鲁棒性定时器，ZCode 无例证，跳过
- 失控跳过阈值 `SKIP_ANIMATION_BLOCK_MS = duration × 2`（sidebar-width.ts:754）——插件自适应启发式（注释含 2026-10-19 实测依据），ZCode 无对应机制，跳过

## 附：已核对无误的对齐锚点（供回归加固）

1. 默认展开宽度 264px：`export const CODEX_SIDEBAR_DEFAULT_PX = 264`（sidebar-width.ts:16）＝ ZCode aside 264px（03b-sidebar.md:28 CDP 实测；zcode-live-geometry.json `sidebar.w=264`；04-open-gaps.md:784）。注：:15 注释里的证据指针「spec-final.metrics.sidebarWidth」不可考（`zc-spec-final.mjs` 无 metrics/sidebarWidth 字段），值本身三源一致。
2. 开合时长+曲线 200ms ease-out：`--dcu-motion-move-duration:200ms; --dcu-motion-move-ease:cubic-bezier(0,0,.2,1)`（zcode-theme.ts:137，sidebar-width.ts:456 及 CodexSidebar.tsx:295/301/309 消费）＝ asar `--ease-out:cubic-bezier(0, 0, .2, 1)` + `duration-200 ease-out transition-[width,opacity]`（均 grep 提取命中）；02-motion.md:351 校正表同值。
3. reduced-motion 跳过开合动画直接落定：`prefersReducedMotion(win) === true ⇒ beginSidebarMotion 返回 false`（sidebar-width.ts:450-452、601）＝ ZCode 语义（02-motion.md §4：CSS `motion-reduce:transition-none`；JS 侧 reduced-motion 必须瞬跳，源码 `c?'auto':'smooth'`）。
4. 侧栏底色实色 #f5f5f5 / #161616：`:root{--dcu-sidebar-background:#f5f5f5}`、`body[data-ds-dark-theme],.theme-zai-dark{--dcu-sidebar-background:#161616}`（zcode-theme.ts:245-246）＝ tokens.json `--color-sidebar` 双主题 resolved 值；03b-sidebar.md §8 裁决保持实色。
