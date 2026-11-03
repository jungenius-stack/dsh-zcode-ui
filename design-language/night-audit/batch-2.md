# 批次 2 · src/client/CodexSidebar.tsx

> 参照文档：03b-sidebar、03i-command-palette、02-motion、03n-typography（+ 03k-context-menu 按需取证、04-open-gaps 仅 grep 裁决、uiplug/docs/SIDEBAR-STRUCTURE-DIFF 结构裁决）。
> 范围说明：头部/菜单/扩展组/分区 Tab/页脚/搜索浮层（⌘K）+ 动效令牌 + 本文件内嵌的轮次导航覆盖层已逐项对账。
> 内嵌 composer 卡片规则块（CodexSidebar.tsx:329-415）属 03d-composer 范围，本批只抽查未逐条对账：抽查 C6(padding 12px)/C7(gap 12px)/C9(按钮统一 8px)/E-1(阴影 none)/E-4(min-height 40px)/E-5(工具行 padding 0)/E-6(卡高 106) 七项，全部与 03d-composer.md 记录及 2026-10-28 二次对齐注释一致（含 03d:88 的边框断言 .15→.1 修订）。

## 批次 2 · CodexSidebar.tsx

### 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| CodexSidebar.tsx | 菜单项内边距 | `padding:0 8px`（CodexSidebar.tsx:157） | `0px 10px` | 03b-sidebar §1 #14，2026-10-27 双端 CDP 实测，标记 ⚠ 小差异；04 与 03b §3 均未见收口裁决 | 对齐 `0 10px`（含子项 `.dcu-extension-items button`），或登记豁免 |
| CodexSidebar.tsx | 侧栏行高基准 | `.dcu-root` `font:14px/20px`，菜单行 `line-height:20px`（CodexSidebar.tsx:104、:157） | 14px/21px（14×1.5，「全视图统一」） | 03i §A A3，CDP 实测 --ui-font-size 14px 基准行高 21px；03b §5 任务行标题亦实测 14px/**21px**（本仓工作区列表已用 21px，菜单壳却为 20px，仓内也不一致） | 先盘点影响面（菜单/搜索行均单行，单行差 1px），再决定对齐 21px 或登记豁免 |
| CodexSidebar.tsx | 分区 Tab 排版档位 | `.dcu-im-tab` 高 24px、`font:500 12px/18px`、radius-md、未选中 `--dcu-sidebar-secondary`(68%)；容器带 1px 边框 + surface 底（CodexSidebar.tsx:160） | Tab 高 28px、14px/500、内边距 0 10px、透明底零圆角、未选中前景 30% | 03i §B B1–B4（2026-10-28 CDP 实测；B5 选中态未采）。注意：「三分区 tab vs Projects/Conversations 分区」的结构差异已由 uiplug/docs/SIDEBAR-STRUCTURE-DIFF §2.3 裁决为宿主约束，本条只针对排版档位未跟 ZCode Tab 口径 | 与 B5 选中态补采同批对齐 B1–B4，或登记豁免 |
| CodexSidebar.tsx | ⌘K 搜索输入框背景 | `background:transparent`（CodexSidebar.tsx:320） | `--color-card`（dark #2b2b2b / light #fff） | 03i 第二批 E2（CDP 实测「bg --color-card」）+ L1 浅色主题变量组 card=#fff | 改 `background:var(--dcu-tip-bg)`（该令牌即 card 家族，见 zcode-theme.ts:58/81） |
| CodexSidebar.tsx | ⌘K 浮层浅色底 | `--dcu-tip-bg` light = `#f0f0f0`（zcode-theme.ts:58） | light card = `#fff`（dark #2b2b2b 已一致） | 03i L1（2026-10-28 浅色活体：card #fff）+ E1（dark bg #2b2b2b = --color-card） | 浅色档改 #fff，与 dark 档对称；改前深浅双主题各目检一次 |
| CodexSidebar.tsx | ⌘K 浮层内间距模型 | dialog `padding:12px` + 输入行 `margin-bottom:8px` + 分组 `padding:6px 0`（CodexSidebar.tsx:318-320） | 根节点 `p-0` + 内层容器 `gap-4`（16px）；内层自身 padding 未记录 | 03i E1（「内 gap-4」）+ 2026-10-28 阴影更正（根 className 实为 `bg-popover p-0 shadow-md`，rounded-2xl 在内层） | 先按 05-extraction-method 补采 ZCode 内层 padding，再决定对齐 gap 16px 或维持现值并登记 |
| CodexSidebar.tsx | 浅色「选中抬亮灰」档位 | 菜单/搜索行 hover 消费 `--dsw-alias-markdown-tag`（CodexSidebar.tsx:156、:320），浅色 = tag 档 #e6e6e6 | `--color-menu-hover` 浅色实测 `#f0f0f0`（dark #363636 已一致） | 03k A2（asar 静态提取 /tmp/zc-styles.css，2026-10-23 构建）与 03k B「浅色族即 tag 族」存在档位张力；03i L1 实测 tag=#e6e6e6 | 活体复核 ZCode 浅色菜单 hover 实际渲染色后定档；dark 不动 |

### 无参照项（不得猜）

- 侧栏头部/品牌区几何（head 高 48px、字标 svg 高 22px、head-actions 28px 列、头部图标钮 28×28/r8，CodexSidebar.tsx:151-152）—— 03b §4 明确头部未采集；ZCode 图标钮存在 24×24/r6（03i D1）与 28×28/r8（04-open-gaps:779 顶栏实测）两种口径，无法判定侧栏头部应取哪个 —— 无 ZCode 例证，跳过
- 收起窄轨宽度 56px（`.dcu-compact-shell` width:56px，CodexSidebar.tsx:143）—— ZCode 收起态宽度无实测记录（02-motion 只录得开合 200ms transition-[width,opacity]）；折叠轨内容构成差异已由 SIDEBAR-STRUCTURE-DIFF §2.1 裁决为有意保留 —— 宽度值本身无参照，跳过
- 快捷键键帽规格（`.dcu-menu-kbd` 高 20px/xs 字号；`.dcu-search-hint kbd` 高 16px/2xs，CodexSidebar.tsx:158、:328）—— 设计文档无 ZCode `Kbd`/`KbdGroup` 组件的尺寸字号实测记录 —— 无参照，跳过
- 搜索浮层入场参数（dialog `translateY(-6px) scale(.985)` 入场、scrim 48% 黑、顶距 72px、z-index 10020，CodexSidebar.tsx:318-320）—— 03i 未采集浮层动画与 scrim 参数（时长 150ms 已按 02-motion 浮层档对齐） —— 无参照，跳过
- 搜索分组标题样式（`.dcu-search-title` sm 字号/tertiary 色，CodexSidebar.tsx:320）—— ZCode cmdk 分组标题未实测；03i E5「顶部分段签 14px/前景60%」经本批 asar 提取证实是 `commandCenter.scope.*`（全部/操作/任务/文件）范围签（`grep -a -o ".\{200\}commandCenter\.open.\{300\}" app.asar` 命中 scope 键组），与分组标题不是同一元素，E5 不可套用 —— 无参照，跳过
