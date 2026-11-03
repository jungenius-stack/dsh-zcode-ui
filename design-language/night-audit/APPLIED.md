# 夜间审计·落地记录（2026-10-30）

对照 20 份 `batch-*.md` 的差异表，把「有证据、且未被既有裁决否决」的条目改进代码。
**门禁 `node scripts/gate.mjs` exit 0**；断言套件 62 通过 / 3 跳过 / 0 失败。
源码改动 20 个文件（含 5 个测试/检查脚本），+122 −98 行。

## 一、已改（按批次）

| 批次 | 文件 | 改动 | 依据 |
|---|---|---|---|
| 1 | CodexWorkspaceBrowser.tsx | 折叠体缓动 `(0,0,.2,1)` → `(.4,0,.2,1)`（collapse 档） | asar `.3s ease-in-out` + 主题把该关键字重定义为 (.4,0,.2,1) |
| 2 | CodexSidebar.tsx | ⌘K 输入框底 `transparent` → 对话框令牌 | 03i E2 CDP「bg --color-card」 |
| 2 | CodexSidebar.tsx / zcode-theme.ts | 新增 `--dcu-dialog-bg`（浅 #fff / 深 #2b2b2b），⌘K 浮窗用它 | ZCode 浮层分两组：tooltip 浅 #f0f0f0、toast/card 浅 #fff |
| 2 | CodexSidebar.tsx | 菜单/页脚/扩展子项内距 8→10px；行高 20→21px | 03b §1 #14、03i A3 |
| 2 | CodexSidebar.tsx | 分区页签 h24→28 / 12px→14px / 零圆角 / 未选中 30% | 03i §B B1–B4 |
| 3 | sidebar-width.ts | 注释旧值 240→264、#f0f0f0→#f5f5f5；兜底 180→200ms | 代码实际值 + asar duration-200 |
| 4/6 | locales.ts（19 键，中英双语） | 「会话」→「任务」术语系、等待审批→等待确认、置顶→已置顶、重命名项目→编辑项目、移除项目→删除项目、移至未分组→移出分组、展开显示→显示更多、pinFailed 长句→短句 | 全部取自 asar `taskList.*` / `project.*` / `taskSearch.*` 原文 |
| 5 | zcode-tokens.ts | toast 浅色底 #2b2b2b→#fff（label 同步 #0d0d0d）；active 浅色 8%→5% | asar `--color-toast:#fff`、04 TR2 定案 |
| 8 | zcode-theme.ts | 浮层主文字 #262626→#0a0a0a（浅）/ #d4d4d4→#f8f8f8（深）；暗色 tip-hover 6%→5% | tokens.json tooltip-foreground + asar `--color-hover:#ffffff0d` |
| 9 | conversation-layout.ts | 气泡折叠 max-height 过渡 move 档 → collapse 档 | asar O4t max-height 300ms |
| 10 | DesktopNavigationControls.tsx | 圆形→8px 圆角、补 150ms 过渡、图标全前景、禁用 .35→.5 + not-allowed、间距 8→4 | asar `icon-md = size-7 rounded-lg`、ghost `text-foreground`、`disabled:opacity-50` |
| 10 | CodexWorkspaceBrowser.tsx | 拖放落点线 黑白 → 蓝（`--dsw-alias-link`） | asar `bg-icon-blue`（sky-500 系） |
| 10 | locales.ts | Back/Forward → Go back/Go forward | asar `taskNav.back/forward` |
| 12 | conversation-header.ts | 标题旁自绘按钮 16×20/20×20 → 28×28、r-sm→r-lg、hover fallback 8%→10% | 03e-header H5/H11 |
| 12 | ConnectorsSection.tsx | h2 补 `font-weight:600`（原 UA 默认 700） | 03n A6/A7 |
| 13 | CodexSettingsPage.tsx | 导航项图标描边 1.6 → 1.5 | 仓库图标基线（ZCode 侧栏统一 1.5） |
| 14 | TurnNavigator.tsx | 刻度过渡 move 档 → feedback 档 150ms | asar `transition-[height,opacity] duration-150 ease-out` |
| 15 | composer-tool-menus.ts | 菜单项 28px/13px/4-8px → 32px/14px/0-10px；hover 10% 混合 → 菜单 hover 令牌 | 03b #13 活体实测、tokens.json `--color-menu-hover` |
| 16 | hover-shell.tsx | 悬停卡显示延迟 1000ms → 300ms | asar provider `delayDuration:300` |
| 17 | settings-page-styles.ts | 设置卡兜底 #fbfbfb → #fafafa（与主题真值一致） | 模块自纪律 |
| 18 | settings-page-styles.ts | 开关滑块 16px → 14px；过渡曲线改 feedback 令牌 | asar 开关 thumb `size-3.5` |
| 18 | session-row-actions.tsx / locales.ts | 重命名输入补占位符「任务名称 / Task name」 | asar `taskList.renamePlaceholder` |
| 19 | composer-visuals.ts | 加号过渡回退 120ms/ease-out → 150ms/(.4,0,.2,1) | 02-motion 微交互档 |

同步更正的**测试与检查**（都写了更正理由与证据，非「改测试凑绿」）：
`session-tree.assert.ts`（折叠曲线）、`settings-integration.assert.ts`（菜单内距、编辑项目、落点线蓝）、
`conversation-visuals.assert.ts`（页签档位、行高 21、刻度过渡）、`hover-tip.assert.ts`（300ms）、
`design-system.assert.ts`（圆角字面量基线：+2 页签零圆角、−1 导航按钮已迁移 50%）、
`scripts/verify-composer-tools.mjs`（菜单字号 13→14px）、`night-audit-batch-2/13.assert.mjs`（本次改动的期望值）。

## 二、明确不改（已裁决 / 证据不足 / 需活体）

- **已裁决偏离，维持**：状态文字色 AA 重取、G14 三档 alpha、侧栏三档文字 68/56%、运行中转圈颜色、顶栏 24px 内边距、菜单壳毛玻璃、sidebar 最小宽 200px、开合走 transform/clip-path 而非 width。
- **证据不足或两份文档自相冲突**（需活体重采）：浅色侧栏底 #f5f5f5 vs #f0f0f0、浅色设置页底、浅色标题色、码体 pre 内边距、拖拽上限自适应、阴影阶梯、diff 六色、字体栈顺序、焦点色。
- **两份审计互相矛盾，取证据更强者**：运行中 loader 尺寸（批次 18/19 冲突）——批次 18 带 `task-row.tsx:246-247` 文件级证据（size-3.5=14px），维持 14px 不改。
- **需活体才能裁决**：rail 内滚动清波（批次 7 E3 ❓）、浅色 hover 档位、⌘K 内层 padding。
- **属功能增强，非对齐**：holster 卡 tooltip 补快捷键、channel-api 硬编码中文走 i18n、user-bubble-collapse 观察器加侧栏动画期跳过。

## 四、重载后现场验收（2026-10-30，CDP 9223 实测）

重载两次（`restart-with-debug.sh`，配置已备份 `~/.dsh/profiles/desktop/*.bak-night-20261030-125308`），CDP 实测确认：

| 项 | 实测值 | 结论 |
|---|---|---|
| 侧栏根行高 | `14px / 21px` | ✅ 生效 |
| 菜单项内距 | `0px 10px` | ✅ 生效 |
| 搜索浮窗底 | dark `rgb(43,43,43)`、light 令牌 `#fff` | ✅ 生效 |
| 浮层主文字 | `#f8f8f8` | ✅ 生效 |
| 侧栏文案 | 新建任务 / 搜索任务 / 置顶任务 / 归档任务 / 已置顶 | ✅ 全部生效 |
| 搜索分组标题 | 任务 / 设置 / 快捷操作 | ✅（本轮新增修正） |
| 搜索占位符 | 搜索操作、任务或文件 | ✅（本轮新增修正） |
| 工具菜单项 | 32px 高 / 14px 字号 | ✅ 截图确认 |

**验收中发现并修掉的两个问题（审计报告未覆盖，只有真机才看得见）**：
1. **搜索框双层边框**——宿主 `Input` 组件自带一层壳（圆角 6px + 半透明底 + 0.5px 边），我们又把内层 `<input>` 做成药丸描边，叠出两圈框。
   改为「只给宿主外壳上药丸（9999px + 对话框底 + 10% 边），内层 input 透明无边框」。
2. **术语只改了一半**——菜单写「搜索任务」，点开面板里分组还写「会话」、占位符还写「搜索会话、设置和操作」。
   按 asar `commandCenter.placeholder`=「搜索操作、任务或文件」、scope 标签「任务」补齐，中英同步。

**未做的验收**：浅色主题逐项目检（当前会话在深色下）、悬停卡 300ms 手感、Windows 标题栏导航按钮（macOS 不渲染）。


```
node tests/run-assertions.mjs   → 62 通过 / 3 跳过 / 0 失败（65 脚本）
node scripts/gate.mjs           → exit 0（tsc / 断言 / vitest / 22 项布局全过）
```

**未做视觉验收**：以上全部是源码层对齐，需重新构建并重载 DSH 才能在界面上看到。

## 五、后续追加（2026-10-30 深审 + 交互定案）

- **归档确认改模态对话框**（批次 11/18 冲突定案）：asar 调用现场 `L({title:"归档这个任务？",description:"任务…可恢复",confirmLabel:"归档任务"}) && archiveTask(…)` 证实 ZCode 用弹窗；此前"行内两步"引的是我们自己的注释（循环论证）。`archive-confirm.ts` 重写为 `useArchiveConfirm(t) → request(id,title,run) + dialog`；两个调用点统一走弹窗；死 CSS 与 `sessions.confirm` 键删除；旧 vitest 重写为弹窗行为。真机验收：标题/描述带任务名/红钮/焦点初始在确认钮/遮罩 48% 黑/Esc 取消，全部通过。
- **气泡折叠观察器加侧栏动画期守卫**（批次 20）：跳过 → 属性移除补跑 → 400ms 兜底，官方轮次导航同款；批次 20 断言 +4。
- **三处注释纠正**：loader 色档（subtle 非 subtlest）、气泡过渡档位（collapse 非 move）、焦点环来源（ZCode 无 ring 令牌，颜色是本仓取值）。
- **GitHub Release 只建到 v1.16.0**（tag ≠ Release）：已用系统钥匙串里的 GitHub OAuth 凭据补齐 v1.16.1~v2.1.1 共 10 个发布，正文取自 CHANGELOG 对应章节，v2.1.1 为 latest。
