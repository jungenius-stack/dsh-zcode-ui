# 交接文档：dsh-zcode-ui 的 ZCode 继承工程

> 面向：下一个对话里的自己（或接手的人）。
> 写于 2026-11-03，仓库 `uiplug` @ `2ebf2c4`，版本 2.2.1。
> 本文是**唯一入口**：目标、现状、废弃路线、下一步、硬规则，都在这里。

---

## 一、总目标（一句话）

**把 `dsh-zcode-ui` 做成 ZCode 视觉与交互语言的忠实复刻——每一个数值、每一条动效、每一处文案，都能追溯到对 ZCode 本体的实测或源码取证；并用回归断言把「已对齐」锁死，防止回退。**

展开成三条可判定的判据：

1. **可追溯**：任何视觉决策背后要么是 CDP 活体读数，要么是 asar 里的源码/样式原文，要么是设计语言文档里的实测记录（带章节号）。**不允许"感觉像"。**
2. **可验证**：已对齐的点写成断言（当前 65 个脚本 / 62 通过），改坏立刻报红；结构性差异写成文档登记，不靠记忆。
3. **可解释的偏离**：凡是与 ZCode 不同之处，必须能回答"为什么不同"（宿主约束 / 无障碍 / 性能 / 结构差异），并登记在册。

**采集 ZCode 的手段（按可信度排序）**：
- **9224 CDP 活体**（最强）：连进运行中的 ZCode，读 computed style、触发交互、截图
- **运行时样式表**（强）：`design-language/night2/zcode-live-styles.css`（480,065 字节，ZCode 真正加载的那份）
- **asar 源码**（强）：`/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）
- **设计语言文档**（中）：`design-language/*.md`（63 份），是前人的实测记录
- **tokens.json / spec.json**（弱）：**可能是基础层而非运行时值，已被证明会撒谎**（见废弃清单）

---

## 二、现在做到哪一步

### 2.1 硬指标

| 项 | 当前值 |
|---|---|
| 版本 | **2.2.1**（tag = HEAD = `2ebf2c4`，GitHub Release 已建） |
| Git | 本地 = 远端 `main`，工作区干净 |
| 断言 | **65 个脚本 / 62 通过 / 3 跳过 / 0 失败** |
| 布局检查 | **22 项全过**（含上游 asar 哈希哨兵） |
| 门禁 | `node scripts/gate.mjs` **exit 0** |
| 设计语言文档 | 63 份（`design-language/`） |

### 2.2 已完成的扫描规模

| 轮次 | 范围 | 结果 |
|---|---|---|
| 夜间第一批（10-29/30） | 20 批 × 96 模块 | 103 条可修差异全部落地；新增 20 份断言 |
| night2 深扫（11-02/03） | **14 个界面面** | 差异 **173** 条（可机械 87 / 触裁决 48 / 需活体 38），复核成立 162，**落地 74** |
| 9224 活体实测 | 双主题令牌 + 交互 | **3 处色值更正**（侧栏底/设置页底/浮层字）+ 菜单/⌘K/焦点环数据 |

**14 个面**：菜单、悬停卡 tooltip、对话框、toast、空态、滚动条、焦点键盘、禁用加载、徽标、markdown、设置页、频道定时归档、无参照二轮、主题层叠。

### 2.3 needs-live 38 条的最终分布

- **17 条已收口**（改完 或 确认本来就对）
- **12 条登记不改**（宿主组件差异 8 + 既有裁决维持 4）
- **7 条待人眼目检**（观感类，脚本给不了）
- **2 条已采完、结论是不动**（设置页开关/下拉，均为宿主组件）

---

## 三、之前废弃了什么（别再走一遍）

### 3.1 被实测推翻的"事实"

| 曾以为 | 实际 | 教训 |
|---|---|---|
| 浅色侧栏底 `#f5f5f5`（tokens.json `oklch(97%)`） | **`#f0f0f0`** | tokens.json 记的是**基础层**，运行时被 `.theme-zai-light` 覆盖 |
| 浅色设置页底 `#fafafa` | **`#f8f8f8`** | 同上，取 `--color-background` |
| 浮层主文字 `#0a0a0a` | **`#0d0d0d`** | 按 tooltip 配对"推断"过猛，实测是 `--color-tooltip-foreground` |
| 折叠动画走 move 档 `(0,0,.2,1)` | **collapse 档 `(.4,0,.2,1)`** | ZCode 用 `.3s ease-in-out`，其主题把该关键字重定义了 |
| 归档是"行内两步换钮" | **模态确认弹窗** | 旧结论引的是**我们自己的代码注释**——循环论证 |
| ZCode 菜单内距 `0 10px` | 右键菜单是 `4px 8px`（且是宿主组件） | 不同表面不同值，别混用 |
| 轮次刻度过渡 200ms | **150ms** | asar `duration-150 ease-out` |
| 设置页开关/下拉是"我们的组件" | **都是宿主组件** | 改宿主规格 ≠ 改插件规格 |

### 3.2 踩过并修复的工程坑

| 坑 | 表现 | 解法 |
|---|---|---|
| **ZCode 调试端口** | 传 9224 无效 | **内置强制 9229**，须设 `ZCODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT=1`；且该构建**禁用 HTTP `/json/*`**；`open -n` 会被单实例锁踢掉（表现为"5 秒死"） |
| **判断端口是否活着** | 查日志里的 `DevTools listening` 行 | 日志是历史记录，进程退了还留着 → **必须查 `lsof -iTCP:9224` 真实监听** |
| **工作流用 `Date.now()`** | 秒挂 | 沙盒要求可复现，禁用 |
| **`world.run('sleep',['300'])`** | 撞默认 300s 超时自杀 | 不要阻塞等待外部条件 |
| **门禁在高负载下假红** | 22 项布局全崩、vitest "无法判定" | 14 子代理 + 22 浏览器检查并发导致；**复跑即绿**，别据此回退代码 |
| **`scrollbar-gutter:stable`** | 永久吃 15px，Pro 设置页不再随主栏伸展 | 回退为 `scrollbar-width:thin` |
| **`.assert.ts` 过不了 tsc** | 612 条断言被门禁全撤 | 断言文件一律 **`.assert.mjs`**（纯 JS，无类型标注） |
| **断言锁了错值** | 正确代码反被拦 | 发现旧断言写着"实测"但值是猜的 → 必须连证据一起更正 |
| **2.2.0 覆盖了 2.1.0 的对齐** | `search.empty` 从「没有找到相关任务」变回「暂无相关结果」 | 发版前跑一次术语键比对 |
| **宿主 Menu 想改就改** | 会波及所有宿主界面 | 宿主 primitives 差异一律**登记不改** |

### 3.3 已否决的方案（有结论，别再提）

- **OpenDesign 的"半透明侧栏"**：9 组合实测，半透明 60/75% 无一全项达 WCAG AA（分组标题最低 1.86:1），**保持实色**；"条件半透明"挂账 P3。
- **断言写在 `.assert.ts`**：见上。
- **用 tokens.json 当运行时真值**：见上。
- **改 ZCode 内置 9229 端口**：不改，改用环境变量压制它。

---

## 四、接下来要干什么（按优先级）

### P0：把 7 条目检做掉（只有人能做的部分）

打开 DSH 逐项看，觉得不对就报编号：⌘K 内容贴边（12px→2px 最明显的变化）、工具菜单滚动条隐藏后的滚动感、深色浮层透不透、浅色报错框淡不淡、设置页分组标题轻重、浅色主题整体、未读点/药丸在侧栏底的对比度。

### P1：把"可采集但还没采"的补齐

1. **DSH 设置页下拉的聚焦态**：ZCode 是"边框加深 + 无外环"，DSH 是 3px 黑外环。改需先确认宿主是否已用 `outline-color:transparent`，并做无障碍复核。
2. **码块 `pre` 内边距**：ZCode 实测是"码块体包 `0/8/12/8` + 壳 margin 上下 16px"（旧批次记的 `8/8/0/12` 和文档的 `6px 8px 12px` **都错**），需在插件侧对齐。
3. **浅色主题逐项目检**：令牌真值已建档（`live-findings.md` 第二节），但没逐项看过。

### P2：继续扩面

4. **扩到还没扫过的面**：输入区细节状态机、会话区富文本边界情况、设置页每个分区的数据态（空/加载/错误/超长）。
5. **把 `design-language` 纳入版本控制**（当前不在 git 里，是最大的资产却最脆弱）。两个选项：独立仓库 / 移进 `uiplug/docs/`。

### 固定流程（每轮都这么做）

```
采集（9224 活体 / 运行时样式表 / asar）
  → 写面报告（差异表 + 证据 + 分类 mechanical/deviation/needs-live）
  → 独立复核（另一双眼睛重跑提取）
  → 落地（只落 mechanical 且 verified）
  → node tests/run-assertions.mjs  →  node scripts/gate.mjs
  → 门禁红了：git restore 该文件，不硬顶
  → 发版：package.json + 双 CHANGELOG + tag + GitHub Release
```

---

## 五、硬规则（违反会出事）

### 运行环境
- **绝不重启 ZCode**（除非用户明确要求）；9224 只读，不改状态、不 `Page.reload`
- DSH 重启必须走 `restart-with-debug.sh`，且**先备份** `~/.dsh/profiles/desktop/package.json` 与 `cordis.patch.yml`
- 判断进程/端口用 `lsof`，**不信日志**

### 代码
- **断言文件一律 `.assert.mjs`**（纯 JS，无 TS 语法），仓库里 `.assert.ts` 会被 `tsc` 拦
- 改代码前先 grep 断言库：**很多断言锁着旧值**，改了要连证据一起更正
- 模板字符串里的 CSS 注释**禁止出现反引号**
- 文件行数有预算（`structure-budget.assert.mjs`），加行前先看
- 圆角/颜色字面量有白名单（`design-system.assert.ts`），新增要登记理由

### 工作流
- 沙盒禁用 `Date.now()` / `Math.random()` / `fetch`
- 不要用阻塞 `sleep` 等外部条件（撞 `world.run` 默认 300s 超时）
- 改脚本会重置在飞的子代理 → **一次性想清楚再改**
- 门禁非零先复跑一次再裁决（高负载会假红）

### 版本
- 打 tag 必须同步 CHANGELOG 章节（`version-ledger.assert.ts` 会拦）
- 文档里的数字（断言数等）与 `docs/baseline.json` 必须一致（`docs-baseline.assert.ts` 会拦）
- 改断言数后要跑 `node --import tsx scripts/baseline.mjs` 重生成基线

---

## 六、关键文件地图

```
uiplug/                                    插件仓库（公开：jungenius-stack/dsh-zcode-ui）
├── src/client/                            全部实现（约 100 个模块）
│   ├── zcode-theme.ts                     令牌真值源（双主题）
│   ├── zcode-tokens.ts                    令牌映射表
│   ├── CodexSidebar.tsx                   侧栏壳（菜单/搜索面板/页签）
│   ├── CodexWorkspaceBrowser.tsx          工作区树（会话行/拖拽/悬停卡）
│   ├── conversation-layout.ts             会话区排版（码块/表格/气泡）
│   ├── settings-page-styles.ts            设置页样式
│   ├── archive-confirm.ts                 归档确认弹窗
│   └── locales.ts                         文案表（中英）
├── tests/*.assert.mjs                     回归断言（65 个）
├── scripts/gate.mjs                       门禁（tsc → 断言 → vitest → 22 项布局 → 上游哨兵）
└── docs/BASELINE.md                       基线数字

design-language/                           设计语言知识库（**不在 git 里**，最脆弱）
├── 01…08*.md                              63 份实测文档
├── night-audit/                           第一批：20 批报告 + 早报 + 增补
└── night2/                                night2：14 面报告 + 活体数据 + 样式表
    ├── NIGHT2-REPORT.md                   总报
    ├── surface-1…14.md                    逐面报告（含复核节）
    ├── live-findings.md                   9224 活体令牌对照
    ├── live-interactive-findings.md       交互实测（菜单/⌘K/设置页）
    ├── zcode-live-styles.css              ★ ZCode 运行时样式表（480KB，最强证据源）
    └── live-verdicts.md                   needs-live 逐条裁决
```

---

## 七、新对话开场（直接粘）

> 接手 `dsh-zcode-ui` 的 ZCode 继承工程。先读 `docs/HANDOFF.md`（就是本文），它写了总目标、现状、废弃路线和硬规则。
> 当前版本 2.2.1 @ `2ebf2c4`，门禁 exit 0，断言 62 过 / 65 脚本。
> 下一步按 HANDOFF 第四节：P0 是 7 条目检（需要人看），P1 是补采（设置页下拉聚焦态、码块内边距、浅色逐项）。
> 要采集就按 `design-language/night2/live-readonly.mjs` 的只读模式起步；需要弹菜单时先确认用户空闲。
> 硬规则：不重启 ZCode、断言用 .mjs、改代码前先查断言是否锁着旧值。
