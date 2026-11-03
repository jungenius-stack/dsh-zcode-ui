# 批次 13 · CodexSettingsPage.tsx / host-anchor-contract.ts / settings-navigation.ts / sidebar-search.ts / global-panels.tsx / settings-page-model.ts / workspace-archive.ts

> 2026-10-30 夜间审计（批次 13，只读，不改 src/tests/既有文档）。
> 参照文档：`03f-settings.md` + `03f-settings-zcode-spec.json`（设置页主参照）、`02-motion.md`（动效档 / reduced-motion / 图标描边）、`03b-sidebar.md`（侧栏语境）、`03i-command-palette.md`（搜索浮层语境）、`03d-composer.md`（宿主锚点归属佐证）、`03n-typography.md`（字号档语境）；`04-open-gaps.md` 仅按关键词 grep（`140`/`退出动画`/`设置页+动画`：无任何「设置页关闭动效」记录，仅命中 gate exit 等无关行）；另按需 grep 了插件侧 `uiplug/docs/ZCODE-DESIGN.md`（§3.3 字重偏离登记、§12 宿主锚点契约）与 `tests/settings-integration.assert.ts`。
> 本批 asar 提取命令（均为本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o -m 8 'aria-current[^,}]\{0,25\}' $A` → `aria-current": active ? "page" : void 0`（×2）等；`grep -a -o -m 2 'aria-current": active ? "page" : void 0' $A` → 命中 2 处；`grep -a -c 'aria-current' $A` → 17
> - `grep -a -c 'prefers-reduced-motion' $A` → **58**
> - `grep -a -c 'strokeWidth:1.6' $A` → 2；`grep -a -c 'strokeWidth:1.5' $A` → 7；上下文提取 `grep -a -o '.\{100\}strokeWidth:1\.6.\{60\}' $A` → 两条 1.6 均为 recharts 图表线（volume `line`、sparkline `path`），7 条 1.5 为 roughjs/recharts errorBars，**均非 UI 图标**
> - `grep -a -o '.\{80\}type:"search".\{60\}' $A` → 4 条命中，上下文全部是 GitHub workbench 过滤框（`Filter steps` / `Filter network` / `Filter actions` / `Filter (e.g. text, @tag)`），无法定位到设置页搜索
> - `grep -a -o -m 6 'aria-haspopup"[^,}]\{0,30\}' $A` → `"menu"`×2、`"alertdialog"===m?"dialog":m`、`"dialog"`×2；上下文提取未能定位到设置入口
> - 6 个特征锚点名 `_composerHero` `_fishHitbox` `_heroWorkspaceRow` `_bannerWrap` `_leadingSeat` `widthHandle` 逐一 `grep -a -c` → **全部 0 命中**
>
> **架构澄清（影响本批对账范围）**：`host-anchor-contract.ts` 的锚点是 **DSH 宿主（上游）的 CSS Module 哈希类名，不是 ZCode 的类名**。佐证：插件侧 `docs/ZCODE-DESIGN.md` §12（:399 起）称其为「上游哈希类名」；`03d-composer.md` §6 W1 明写「**宿主** `ST7X_W_widthHandle`」；`03c-conversation-dsh-side.md` 记录的宿主类名形态 `._bannerWrap_7gxqk_24`、`.icaHSq_toBottomSlot` 与锚点片段同族；且本轮 ZCode asar 对 6 个特征名全部 0 命中。故该模块的锚点名**不与 ZCode 对账**（ZCode 无对应物），其「ZCode 关联」仅在后果文案层面（如 D1 围栏码卡）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| CodexSettingsPage.tsx | 设置导航分区图标描边 | `strokeWidth={1.6}`（`CodexSettingsPage.tsx:235`） | **1.5** | ① 插件自有测试注释明记 ZCode 值：`tests/settings-integration.assert.ts:214`「2026-10-26：图标补上 strokeWidth={1.5}（**ZCode 侧栏图标统一 1.5 描边**）」；② `02-motion.md`「正文操作行图标」表（ZCode CDP 实测：图标 14×14 / **stroke 1.5**）；③ 仓库惯例：`CodexWorkspaceBrowser.tsx:92,100`、`session-tree.tsx:25,29`、`DesktopNavigationControls.tsx:26` 均 1.5，全仓 grep `strokeWidth={1.6}` 仅 `CodexSettingsPage.tsx:235` 这 1 处（本轮实跑）；④ asar `strokeWidth:1.6` 仅 2 处且上下文均为 recharts 图表线（本轮提取），ZCode 图标无 1.6 例证 | 归一为 1.5（与全站 ZIcon* 线宽一致）；若 1.6 是有意为之，需在 `ZCODE-DESIGN.md` 登记偏离理由并补断言，否则属无出处孤值 |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| CodexSettingsPage.tsx | 导航/面板当前项的 aria 模式 | `aria-current={active ? 'page' : undefined}`（选中 `'page'`、未选中不设属性）：`CodexSettingsPage.tsx:235`、`global-panels.tsx:51` | asar 本轮提取 `aria-current": active ? "page" : void 0`（命中 2 处）——与 ZCode 的三元写法逐字同构；`02-motion.md` 第 28 轮实测「连点 10 次 aria-current 唯一」 |
| CodexSettingsPage.tsx | 退出动画的 reduced-motion 分支 | `matchMedia('(prefers-reduced-motion: reduce)').matches` 命中即直接 `finish()`、不排 JS 动画（`:81`） | `02-motion.md` §2「reduced-motion 时点击必须瞬跳…这是 ZCode 明确语义（源码 `c?'auto':'smooth'`）」+ §4 全集；asar `grep -a -c 'prefers-reduced-motion'` = 58 |
| CodexSettingsPage.tsx | 设置导航分组标签形态 | 每分组一枚独立小标签行（`h2.dcu-settings-group-label`，`:233-234`），**12px / 500**，先于组内条目 | `03f-settings.md` S1b（ZCode 导航分组标签 **12px/500**）+ `03f-settings-zcode-spec.json` navItems[0]「基础设置」fs12px/fw500/h22；消费侧旁证 `settings-page-styles.ts:75` `font-size:var(--dsw-font-size-sm);font-weight:500` 同值。注意：ZCode 侧仅采到这一条分组标签，**分组数量与归属不在本断言范围**（见无参照项） |
| CodexSettingsPage.tsx | 通用设置条目的「分组标题 + 卡片」两级结构 | 每组 `h2` + 单个 `.dcu-settings-card` 包多条目，条目不裸排（`:258-260`） | `03f-settings.md` §2.2 S2/S2b/S2c（ZCode 卡片 bg `rgb(22,22,22)` / r12 / 边 1px 10% 白，双主题复核 ✅）+ spec JSON cards[0]；卡片视觉值在 `settings-page-styles.ts`/`zcode-theme.ts`（非本批模块），此处锁结构 |

## 无参照项（不得猜）

- CodexSettingsPage.tsx:83 设置页退出动画 `duration: 140, easing: 'ease-out'`、仅动 opacity、`fill:'forwards'` 保留末帧 —— ZCode 设置页（整页视图）的关闭动效**零记录**：`02-motion.md` 时长分档五场景（侧栏开合 200 / 折叠体 300 / 浮层进出 150/150 / 微交互 150 / 按压 90）无设置页档；`04-open-gaps.md` grep `140`/`退出动画` 无相关命中。相邻档「浮层退出 150ms」属浮层（popover），整页设置不能移用 → **未验证，不判偏离**；建议活体补采 ZCode 设置页关闭动效后再定 140 是否偏离。
- CodexSettingsPage.tsx:31-45 分区→图标映射（plugins→Store、model→Cpu、archive→Archive、about→Help 等）+ :229 搜索图标 `ZIconSearch size={15}` —— ZCode 设置导航图标零记录（`03f-settings-zcode-spec.json` navItems 无图标字段）；15px 与同文件 16px 基线不一致，但无 ZCode 例证可判对错，跳过。
- CodexSettingsPage.tsx:229,239-240 设置页搜索框（`type="search"`、占位、空态 `role="status"` 提示）—— ZCode 设置页搜索态未采集（03f S1b/规格 JSON 均无）；asar 里 `type:"search"` 的 4 条上下文全为 GitHub workbench 过滤框（本轮提取），不能作为设置页搜索的参照，跳过。
- host-anchor-contract.ts 全模块 —— 锚点为 DSH 宿主哈希类名（架构澄清见头部，ZCode asar 6 名 0 命中），ZCode 无对应契约可参照；「只自检前置条件可确定的锚点 + 同组只报一次 + 合并到下一帧」的工程设计在插件侧 `docs/ZCODE-DESIGN.md` §12.3 已登记，属插件工程纪律而非 ZCode 视觉令牌，跳过。
- settings-navigation.ts / settings-page-model.ts / sidebar-search.ts / global-panels.tsx / workspace-archive.ts 的其余决策点 —— 事件合约 `dcu-settings-open-section/root`（settings-navigation.ts:37-38，与 `03f-settings.md` §2.1 记录的打开方法一致：cancelable、不加 bubbles）、4s 导航超时兜底（:35）、宿主壳 `aria-haspopup="dialog"` 定位（:36；asar 有该值但定位不到设置入口）、设置三分组归属映射（settings-page-model.ts:5-9；ZCode 仅见「基础设置」一条分组标签，无完整分组表）、搜索匹配语义与配额 12/3（sidebar-search.ts:11,38；实际常量 `CodexSidebar.tsx:610` `SEARCH_RESULT_LIMIT=12`、`:616` `SEARCH_GROUP_FLOOR=3`；ZCode ⌘K 结果条数上限未采集，`03i-command-palette.md` E 组只记浮层几何）、官方 alpha.2 `plugins` 面板排除（global-panels.tsx:23，DSH 专属）、断线恢复指示 3s（CodexSettingsPage.tsx:129）、归档去重与顺序执行（workspace-archive.ts，无视觉决策点）——均无 ZCode 例证，跳过。
