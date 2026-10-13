# 已知问题与发布前检查清单

本文件记录 dsh-zcode-ui 当前**未解决**的测试失败、有意跳过的断言，以及发布前必须处理的事项。

维护原则：**宁可显式记录，不要静默留白**。任何「跑不绿但暂时不动」的测试都必须在此登记原因，
避免后续维护者把已知的存量漂移误当成新引入的回归。

最后更新：2026-10-13（当前基线：35 通过 / 3 跳过 / 0 失败）

---

## 1. 断言套件现状

运行 `node tests/run-assertions.mjs` 的基线结果：

```
35 通过 / 3 跳过 / 0 失败（共 38 个脚本）
  已跳过：codex-suite-installer.assert.mjs、codex-suite.assert.ts、release-pipeline.assert.mjs
```

套件已改为**跑完全部再汇总**（原实现遇到第一个失败即退出），一次即可看清全部问题。

> 基线会随工作树变化：19:00 时还有 3 条失败（`conversation-visuals` / `dependency-manager` /
> `settings-integration`，均为上游样式漂移），当天已全部重定基转绿，详见 §3。本块数字与
> `README` 中引用的口径一致。

---

## 2. 有意跳过的断言（3 个）

这 3 个断言校验的是**上游 dsh-codex-ui monorepo** 的发布契约，而本仓库已 fork 为**单包仓库**，
被测对象本身不存在，因此永远不可能通过。处理方式是**保留文件与全部断言原文 + 顶部显式跳过**，
而不是删除——删除会让「测试不见了」和「问题解决了」难以区分。

| 文件 | 跳过原因 | 依赖的不存在路径 |
| --- | --- | --- |
| `tests/codex-suite.assert.ts` | 校验聚合包 `dsh-codex-suite` 的清单、patch、README 契约 | `../packages/dsh-codex-suite/` |
| `tests/codex-suite-installer.assert.mjs` | 校验安装器的参数解析、bundles 归一化、Windows 转义 | `../packages/dsh-codex-suite-installer/installer.mjs` |
| `tests/release-pipeline.assert.mjs` | 校验 GitHub Actions 发布流水线与发布脚本链路 | `.github/workflows/*.yml`、`scripts/prepare-suite-installer-release.mjs` |

**恢复方式**：若将来重新引入 `packages/` 工作区与 `.github/workflows/`，删除各文件顶部的
`SKIP` 块即可（`codex-suite-installer.assert.mjs` 还需还原被注释的 import）。

**注意**：`codex-suite.assert.ts` 的跳过刻意写成 `const SKIP_REASON: string = ...` + `if` 判断，
而非直接 `process.exit(0)`。原因是后者返回 `never`，会让 tsc 把后续断言判为不可达代码、
把 `assert` 收窄为 `never`，从而报出一片 TS2339。修改时请勿简化回直接调用。

---

## 3. 存量失败断言 → 已全部清零（2026-10-12）

原先只有 3 个文件报红，但**每个文件的第一条不匹配就抛错**，所以真正过期的远不止 3 条。
用 `scripts/collect-assert-mismatches.mjs`（把 `assert.match` 换成收集器、跑完列出**全部**不匹配）一测，
发现两份"视觉契约"文件整体钉着 **Codex 时代的视觉语言**：`conversation-visuals.assert.ts` 23 处、
`settings-integration.assert.ts` 11 处；再加上 `dependency-manager.assert.ts` 的 1 处包名，合计 **35 处**。

| 文件 | 过期项 | 性质与处理 |
| --- | --- | --- |
| `dependency-manager.assert.ts` | 1 | 夹具仍声明上游包名 `@michengai/dsh-codex-ui`，而 `src/dependencies.ts` 的 `{ id: 'ui' }` 认的是 `dsh-zcode-ui` → 改为 fork 包名 |
| `conversation-visuals.assert.ts` | 23 | 配色/文字层级**迁移到主题层**（`zcode-theme.ts`，断言改为读该真值源）；几何与动效常量随 ZCode 刻度更新（头部 34→40px、内衬 28→32px、间距 8→4px、动效由 500ms 弹簧改为 180ms ease-out（2026-10-13 进一步改为五档意图令牌，见 §3.1）、圆角 10→8px、行高 30→32px、刻度 left −16→−12px、图标列 20→16px）；窄轨设置入口改为宿主 `wide:false` 渲染；展开按钮改用 `ZIconCollapse` |
| `settings-integration.assert.ts` | 11 | 图标体系整体换 Lucide（文件夹/新建会话/定时/IM/继续分支）；字号改为七档令牌；包名/注册 id 改为 `dsh-zcode-ui` / `zcode-ui-for-dsh`；导航内衬改为 px-2(8px) |

**结论：35 通过 / 3 跳过 / 0 失败**（`node tests/run-assertions.mjs`）；`scripts/gate.mjs` 的
`KNOWN_RED_ASSERT` 已清空，此后任何断言失败都会拦住提交。

> **为什么不在此文件里写裸短提交号**：短号在任何一次历史重写（例如 2026-10-13 的隐私清理）后都会失效，
> 而 GitHub 在重写后仍会按旧号提供不可达对象——写在公开文档里等于把旧对象重新指出来。
> 因此本文件改用「提交说明 + 时间」引用，不再登记裸号。

### 3.1 设计变更登记（不写成"必须如此"的断言，避免把变更伪装成契约）

重定基过程中发现以下几条**不是数值过期，而是 ZCode 有意改掉的设计决定**。它们没有按现状写成硬断言，
而是登记在此，供将来判断"是回归还是延续设计"：

| 位置 | 原 Codex 设计 | 现行 ZCode 设计 | 影响 |
| --- | --- | --- | --- |
| 侧栏导航层级 | 导航文字（`--dcu-sidebar-navigation`）比项目标题更淡，是独立层级 | ZCODE-DESIGN §2 只有 primary/secondary/tertiary/icon 四档，无"导航档"；`--dcu-sidebar-navigation` 与 primary 同值，主菜单直接用 primary | 导航与标题不再有深浅差 |
| 毛玻璃降级 | `@supports not (backdrop-filter)` 时恢复**实底**保证可读 | 玻璃层本身半透明，另由 `body[data-we-appwindow]` 关闭模糊；可读性依赖宿主背景 + 主题文字色 | 不支持毛玻璃时不再有独立实底兜底 |
| 任务频道/定时页签 | 整行切换器（`border-bottom` 分隔），字号与主导航同级(14px)，选中加粗(600) | ZCode **分段控件**：`--dcu-surface` 底 + 1px 边框 + 8px 圆角，字号 12px(sm)，选中用底色而非字重 | 页签形态与层级语义都变了 |
| 项目文件夹图标 | 区分「当前展开」（官方实心）/「其他展开」（线框）/「收起」（闭合） | 只区分展开（`ZIconFolderOpen`）/收起（`ZIconFolder`） | 当前项不再有独立图标样式 |

#### 2026-10-13 可读性与一致性修复（相对 ZCode 的有意偏离）

界面评审（真机测量 + WCAG 2.1）后落地的一批修改。它们**偏离 ZCode 原值**，原因与判据记录如下：

| 位置 | ZCode 原设计 | 本 fork 现行 | 原因与判据 |
| --- | --- | --- | --- |
| 侧栏 secondary / tertiary | neutral-800 以 60% / 40% 叠在**白底**推导（`#777777` / `#9f9f9f`） | `#5c5c5c`(5.87:1) / `#686868`(4.89:1)；暗色 tertiary `#4f4f4f` → `#828282`(4.82:1) | 同一组值叠到侧栏 `#f0f0f0` 上实测只有 **3.93:1 / 2.32:1**，低于 WCAG AA 的 4.5:1；而暗色侧栏反而达标（5.10:1）——说明原值只对白底成立 |
| 选中态底色 | accent 蓝（light `#ebf4ff` / dark `#001d3d`） | 中性 `#efefef` / `#3a3a3a` | 侧栏选中态是中性 `rgba(13,13,13,.05)`，同一套皮肤出现两种"选中"语言；统一到中性，蓝色只留给焦点环（`--dcu-focus`） |
| 新会话建议卡标签 | 单行截断 | 允许两行（`line-clamp:2`） | 1440px 下每张卡约 171px，四个英文标签实测**全部断在半词上** |
| 折叠轨内的计费卡 | —（第三方 `dsh-cost-meter` 自有样式） | 折叠态隐藏 | 56px 轨装不下它的文字，此前被裁成 `F41-peak` 这类乱码 |
| 计费卡（展开态） | — | 数字 14px/500、说明 12px、去掉白底卡 | 白底卡片 + 加粗大数字比侧栏任何文字都重，压过导航层级 |
| 项目标题 / 分区标签字重 | 「标签与标题 font-medium」 | **保持 400（不改）** | 代码里已有明确断言禁止项目标题加粗（"不能显得过黑"）；且只加粗分区标签会造成"标签比标题重"的层级倒挂。此处保留对 ZCode 文档的有意偏离 |
| 内部 REST 命名空间 | —（fork 自上游） | **保留 `/api/dsh-codex-ui/*` 不改名** | 该命名空间出现在 23 个文件（宿主注册端 + 客户端调用端 + 测试），是**纯内部契约**、用户完全不可见；改名收益仅是字面一致，风险是打断宿主↔客户端链路。用户可见的三处（安装 id `zcode-ui`、包名 `dsh-zcode-ui`、文档）均已正确 |
| 三个面板页的宿主图标 | 全站 Lucide | **保留宿主图标**（`AboutSection` / `ScheduleBrowser` / `ConnectorsSection`） | 复核确认这三个文件**各自内部一致**（同页无混用），且只出现在独立面板页、不与侧栏同屏；换成 Lucide 等价图标属**视觉变更**，需设计确认与实拍比对，不属"统一来源"这类卫生改动。其余长尾已收归，现全仓仅 `zcode-icons.tsx` 直引 `lucide-react` |

新增门禁：`scripts/verify-a11y-and-overflow.mjs`（已接入 `gate.mjs` 与 `npm run test:layout`），
把上面三类问题变成客观判据——**对比度 ≥4.5:1（明暗两套）、建议卡标签不得截断、折叠轨不得横向溢出**。
反向测试已做：把侧栏 secondary 改回 `#777777` 会直接报 `3.93:1 低于 WCAG AA 的 4.5:1`。

#### 2026-10-13 设计制度补全（刻度 / 动效 / 契约 / 签名）

上面那一批修的是"看得见的问题"。这一批改的是**制度本身**——即"为什么这类问题此前只能靠人眼发现"。
全部判据由新增的 `tests/design-system.assert.ts` 守护（源码层，不依赖活宿主）。

| 位置 | 原状 | 现行 | 原因 |
| --- | --- | --- | --- |
| 字号刻度 | 七档只覆盖 10–18px；`20px` / `22px` / `34px` 三处页面级大字靠 §3.2「例外登记」存活 | 补 `title`(20px) / `headline`(22px) / `display`(34px) 三档，**值与原例外逐一对齐** | 例外会繁殖——一处「暂不归并」会变成后来人照抄的借口。收归后**零视觉变化**，只是把破例变成有据（ZCODE-DESIGN §3.1） |
| `11px` ×4 | 夹在 `xs`(10px) 与 `sm`(12px) 之间的孤值 | **归一为 `sm`(12px)** | 补一档等于把孤值合法化，刻度会继续变碎；四处消费方均无宽度硬约束，+1px 不影响布局。**这是一次有意的小幅视觉变更** |
| 字重 `650` ×1 | `ConnectorsSection` 的连接器标题 | 归一为 `600` | 与其余标题取同一档，原值属笔误（系统里不存在 650 这一档） |
| 工作区分组标题字重 | `600` | 归一为 `400` | 与侧栏"标题/标签保持 400"的既有约定（已有断言守护）冲突，造成"分组标题比分区标签更重"的层级倒挂。分组层级改由披露箭头、缩进与明度表达（ZCODE-DESIGN §3.3） |
| 页面级标题字重 `600` | 设置页 `h1`、设置分组 `h2`、关于页依赖名 | **保留 600**（登记为有意偏离） | ZCode 规定「标签与标题 font-medium」= 500，但 500 与正文 400 在页面级标题上区分度不足。**此偏离只适用于页面级标题**，侧栏内仍严格 400 |
| 动效 | 全站统一 `180ms ease-out` 一条曲线 | 五档**意图令牌**：反馈 120 / 移动 180 / 进入 160 / 退出 120 / 按压 90 | 一条曲线是"一致"但不是"设计过"——出现、移动、消失同速读起来是"没做动效"。新曲线均无过冲，不违反 ZCode「避免弹簧感」；令牌化同时让 reduced-motion 变成一处归零（ZCODE-DESIGN §7.1） |
| 外来内容覆盖 | 样式直接写 `.cm-*` 类名，对方改名即**静默失效** | 收敛为**契约锚点清单** + 运行时哨兵（`foreign-content-contract.ts`）；覆盖未登记锚点会让门禁变红 | 覆盖范围必须可审查；属性通配会让范围随对方改版漂移。哨兵把"静默失效"变成"响亮失效"（ZCODE-DESIGN §10） |
| 签名细节 | 无——视觉语言全部来自 ZCode | 两处登记：发送键的悬停/按压回应、空状态的口气 | 本插件此前没有"属于自己的表达"。签名只用位移与明度，不引入颜色（ZCODE-DESIGN §11） |

#### 2026-10-13 第二批：外部评审意见的采纳与拒绝

一次独立评审（另一会话，快照 08:47–08:54）指出了若干问题。逐条核实后**采纳 5 条、拒绝或降级 3 条**，
两类都记在这里——拒绝的理由和采纳的同样重要，否则下一轮评审会把同一件事再提一遍。

**采纳**：

| 位置 | 原状 | 现行 | 原因 |
| --- | --- | --- | --- |
| 主题层归属 | `ZCODE_THEME_STYLE` 的注入与 `syncZCodeTheme()` 都挂在 `CodexSidebar.tsx` 上 | 两者都移到 `index.ts` 的 `ctx.effect`（新增 `installThemeStyle()`） | 主题是**应用级**的：消费 `:root` 动效令牌的不只有侧栏，还有会话区的轮次导航与页签滑块、portal 到 body 的设置页。挂在侧栏上时，侧栏一不挂载，那几处会静默失去过渡且不报错 |
| 门禁汇总 | 断言套件/vitest 只要「解析不到失败清单」就打印通过 | 新增「**无法判定**」分支并纳入阻断条件 | 进程非零退出但输出不含已识别的失败行时（崩溃、EPERM、OOM、汇总格式变更），原先会落到「全部通过」分支。实测过：沙箱禁止写 `node_modules` 触发 EPERM 时，汇总行照打「vitest：全部通过」 |
| 上游哈希类名锚点 | 18 处散落在 6 个文件，上游改名后静默失效 | 全部登记进 `host-anchor-contract.ts`；其中 6 处（前置条件可确定）运行时自检，缺失即 `console.warn` | 与 §10 外来内容契约同一原则：**把静默失效变成响亮失效**。误报比不报更糟，所以只自检前置条件确定的那部分（见 ZCODE-DESIGN §12） |
| README 定位 | 「**除了外观，什么都不动。** 这是一个纯粹的展示层插件」 | 改为「皮肤本身不改动别的东西」，并新增「**能力范围与权限**」章节（6 行能力表） | 本包继承上游的**依赖安装（跑 pnpm、可重写 `node_modules`）/ 会话移动 / 打开文件管理器 / 5 个 REST 端点**，自称纯展示层是过宽。仓库已公开，信任面必须如实披露——让读者自己从「皮肤」二字推断是不对的 |
| README 令牌统计 | 18 结构性 / 192 唯一 | 21 / 195 | 本轮新增三档展示档令牌，文档未同步 |

**拒绝或降级（附理由）**：

| 评审意见 | 判断 | 理由 |
| --- | --- | --- |
| 「`zcode-skin.ts` 拒绝哈希类名，但其他文件仍在用 → 自相矛盾」 | **降级为措辞问题** | 原话的作用域是「本皮肤层」（该文件的上下文），而皮肤层确实一处都没用。集成层无法回避哈希类名。已在 `zcode-skin.ts` 补边界说明、并在 ZCODE-DESIGN §12 写清两层分工。**但其建议本身（装报警器）完全成立，已采纳** |
| 「亮色下『拖动项目到此处置顶』的灰比 tertiary 更浅」 | **不成立** | 实机测得 `.dcu-wb-empty` 为 `rgb(104,104,104)` = `#686868`，正是 tertiary 本身，无额外 opacity。它比 secondary 浅是**设计分层**，不是缺陷。13px 抗锯齿在小字号下容易被看成更浅 |
| 「`CodexWorkspaceBrowser.tsx` 有一个约 690 行的函数；`!important` 40 处」 | **承认，本轮不动** | 均为事实。但 690 行函数的重构风险远高于收益，`!important` 是皮肤层覆盖宿主所必需。登记为已知技术债，不做无谓改动 |

**评审中已过期/已被修复的两条**（记录以免重复讨论）：

- 「断言套件与文档口径脱节（实测 34 通过 / 3 跳过 / 1 失败）」——那是**同一时间本会话正在编辑中的快照**：当时刚加入 `design-system.assert.ts`（脚本数 37→38）并改了空态文案，`workspace-groups-ui.assert.ts` 尚未同步。当日 09:15 前已修正，现为 35 通过 / 3 跳过 / 0 失败。
- 「布局套件正在红，根因是合成夹具没注入令牌层」——**同一根因、独立复现**，且本会话已在同一时段修掉，修法更彻底：抽出共享模块 `scripts/fixture-tokens.mjs` 从源码真值提取令牌块，四个脚本统一改用（见 §6.1）。评审还额外指出「12 个脚本里只有 2 个注入主题样式表」，该细节已并入 §6.1 的说明。

**动效断言从「锁数值」改为「锁意图」**：`conversation-visuals.assert.ts` 原先断言
`dcu-sidebar-expanded-in 180ms ease-out` 这类字面量，现改为断言"必须使用 `enter` 档令牌"。
数值将来调整不会误报，意图被改则立刻变红——这是令牌化的主要收益之一。

**`session-tree.assert.ts` 的两轮红灯都已转绿**：第一轮因「要求 Codex 的 10px 圆角 / 30px 高度 /
弹簧缓动」与 ZCode 改造冲突，已按设计意图更新断言（10px→8px、30px→32px 行高、弹簧→ease-out）；
第二轮因悬停卡片去掉项目行与时长行（见 3b 第 2 条）而报红，已在 18:48 那次「断言套件重定基」提交中同步更新断言——
从「必须带项目行的 Codex 文件夹图标」改为显式断言「不得再渲染 `dcu-wb-tip-row` / `dcu-wb-tip-time`」。

> 工具：`scripts/collect-assert-mismatches.mjs`（只读，不改断言）会把某份 `*.assert.ts` 里**全部**
> 不匹配的「说明 ← 期望模式」列出来。凡是这类"第一条就抛错"的断言文件再次变红，先跑它再动手，
> 否则只能一轮剥一条。

---

## 3b. 界面问题归属（DSH 内实测反馈的 7 条）

以下来自 2026-10-12 DSH 会话里 agent 用真实浏览器的实测反馈，按「本插件是否可改」分类。

| # | 问题 | 归属 | 处理 | 证据（实机截图） |
| --- | --- | --- | --- | --- |
| 1 | 会话标题跑马灯把标题两端同时裁掉 | **本插件** | ✅ 已修：移除跑马灯，改为纯 ellipsis | `assets/screenshots/conversation-light.png`（标题以 `…` 收尾） |
| 2 | hover 提示卡又大又重、信息重复 | **本插件** | ⚠️ 源码已改并于 18:48 提交，但**未重建 `lib/`**，实机仍是旧卡（见 3d） | 待重建后补图（19:00 实拍仍是「标题 + 20小时 + 测试1」） |
| 3 | 费用信息出现 3 处（顶栏 chip / 底部状态栏 / 侧栏左下卡片） | **`dsh-cost-meter` + `dsh-context-pilot`** | ⛔ 不属本插件，见下方说明 | — |
| 4 | 底部状态栏过挤、对比度低、末尾孤立 `5%` 语义不明 | **`dsh-context-pilot`** | ⛔ 不属本插件 | — |
| 5 | 侧栏左下卡片与「记忆/任务/归档/设置」无分隔 | **本插件**（槽位在侧栏组件内） | ✅ 已修：加视觉分隔 | `assets/screenshots/conversation-light.png`（卡片下方可见分隔线） |
| 6 | 顶栏右侧彩色方块按钮风格突兀 | 宿主内置 `open-in-app` 控件 | ⛔ 已查证：宿主彩色位图图标，不可接管，见下方说明 | —（该元素只在会话视图顶栏出现，本页证据图是空状态视图） |
| 7 | 空状态四张卡偏高、内部留白约 50px、窄窗断行 | **本插件**（`NewConversationSuggestions.tsx`） | ✅ 已修：收为单行矮卡 | `assets/screenshots/conversation-light.png` |

### 关于 #3 和 #4：不属本插件

已 grep 确证**本插件 `src/` 内没有任何费用 / 速率 / token 计量代码**（零匹配）。三处 UI 的真实来源：

| 位置 | 实际归属 | 注入插槽 |
| --- | --- | --- |
| 顶栏「费用明细」chip | `dsh-cost-meter` v1.8.19 | `header.actions` |
| 侧栏左下「今日 / 余额」卡片 | `dsh-cost-meter` v1.8.19 | `sidebar.footer.action` |
| 底部状态栏「2轮 21步 / tok/s / 缓存命中 / 本会话 ¥…」 | `dsh-context-pilot` | 状态栏 |

本插件是**皮肤层**（只做视觉适配，不改功能模块的注入逻辑），因此无法合并或删除这三处。
`dsh-cost-meter` 当前版本（1.8.19）**没有提供关闭某个入口的配置项**（已查其 package.json 与配置 schema，仅有 `schemaVersion`）。

**若要收敛，只能改那两个插件本身**，或在其各自的设置界面中调整。

### 关于 #6：已查证到确切来源——宿主内置的「打开方式」控件

DSH 侧截图显示顶栏右侧有一个彩色方块按钮，原判断「像是插件自带的未适配样式」。现已查证：

- 该元素是 `<img src="open-in-app/icon/finder" width="13" height="13">`，即宿主「用访达打开 /
  更多打开方式」分段控件里的 **macOS 应用彩色位图图标**（不是 emoji，也不是插件注入）。
- 字符串 `open-in-app/icon` 命中 `DeepSeek Harness.app/Contents/Resources/app.asar`
  （偏移 21397551、51511145 等），**不在** `dsh-mcp-connector` / `dsh-notify-me` /
  `dsh-context-pilot` 内；其样式类名 `iq4beG_*` 也来自宿主自身的 CSS Module。
- 本插件**不注入 `header.actions`**（`src/client/conversation-header.ts` 的注释还专门说明
  「官方 header.actions（标准模式 / Agent Team）」，即该插槽属宿主官方）；
  已注入 `header.actions` 的是 `dsh-cost-meter`；`dsh-mcp-connector` 注入的是 `header.split`。

结论：本插件无法接管它的样式。它是顶栏唯一的彩色元素，与全站 Lucide 线性单色图标不同源；
若要统一只能由宿主改。皮肤层原则上可以隐藏该图标只留文字，但那会改变宿主功能的可见性，
因此**本插件选择不隐藏**。

---

## 3d. ⚠️ 构建滞后：3b 的 ✅ 只代表源码已改

宿主加载的是**构建产物 `lib/`**，不是 `src/`。改完源码必须重新构建（并按 README 重启宿主）
才会在实机生效，所以「源码已改」与「实机已生效」是两件事。

截至 2026-10-12 19:00 的实测对照：

| 3b 项 | 源码 | `lib/`（构建于 18:43） | 实机（19:00 实拍） |
| --- | --- | --- | --- |
| #1 标题 ellipsis | ✅ | ✅ 已含 | ✅ 生效 |
| #5 footer 分隔 | ✅ | ✅ 已含 | ✅ 生效 |
| #7 空状态卡收矮 | ✅ | ✅ 已含 | ✅ 生效 |
| #2 悬停卡去项目行/时长 | ✅ 18:48 提交 | ❌ **不含**（产物里仍有 `dcu-wb-tip-time`） | ❌ 仍是「标题 + 20小时 + 测试1」 |

原因：`src/client/session-tree.tsx` 的改动写在 **18:43 那次构建之后**，而 18:48 的提交只提交了源码、
没有重新构建。**下次构建后即可生效**，届时可补一张悬停卡片截图作为 3b #2 的证据。

---

## 4. 发布前必做

- [x] **填写真实 GitHub 用户名** —— 已完成：`repository` / `bugs` / `homepage` 均指向
      `github.com/jungenius-stack/dsh-zcode-ui`。该账号已通过 `api.github.com/users/jungenius-stack`
      核实存在（id 322767483）。
      历史备注：早期版本曾填 `BatchTTS`，但该账号在 GitHub 上**不存在**（API 返回 404），
      它只是本机 git 的 local 身份（`BatchTTS <agent@local>`，邮箱为占位），不可用作发布账号。
- [x] **核对 npm 包名是否可用** —— 已完成：2026-10-12 查询 `registry.npmjs.org/dsh-zcode-ui`
      返回 404，裸包名未被占用。
- [x] **确认 `publishConfig`** —— 已完成：当前为 `access: public` + 官方 registry
      （`https://registry.npmjs.org/`），与本条记录一致；若改为私有需另行调整。
- [x] **发布渠道定为 GitHub 直装（2026-10-13 决定）** —— 不发布到 npm，README 的安装方式改为
      `dsh plugin --profile web add github:jungenius-stack/dsh-zcode-ui`。依据：`dsh plugin`
      把参数原样转发给 `pnpm`，pnpm 原生支持 `github:<owner>/<repo>`；本包没有 `prepare` 脚本，
      且 `lib/` 已随仓库提交，所以安装过程不触发编译。上面两条 npm 相关的核对结果保留作历史记录，
      `publishConfig` 也仍然保留，日后若要改发 npm 可直接沿用。
- [x] **公开前的隐私清理（2026-10-13）** —— 仓库由私有转为公开前完成：
      (a) README 顶部两张展示图用演示数据重截（原图会暴露本机真实项目名、会话标题与账户余额）；
      (b) 删除 `debug/` 整目录（含 10 张同类截图、内含绝对路径的本地调试补丁、`lib/` 的派生副本），
      并把 `debug/` 加入 `.gitignore`；
      (c) 删除未被任何文档引用的 `assets/screenshots/conversation.png` 与上游营销图
      `assets/branding/dsh-banner.png`（后者宣传的是上游自己的 5 个配套插件，不属于本项目）；
      (d) 清除 `docs/` 中残留的本机绝对路径。
- [x] **展示图重新拍摄（2026-10-13）** —— 原 `debug/shots*/` 10 张与 `assets/screenshots/conversation.png`
      因含真实项目名与账户余额，已在隐私清理中删除并清除历史。现用**脱敏后重拍**的 5 张替代：
      `conversation-light/dark`（顶部横幅）、`settings-light`、`search-light`、`collapsed-light`，
      内容为演示数据（acme-web / playground / ¥0.00 / ¥12.00）。拍摄脚本每次都会先把
      项目名、会话标题、余额替换为演示值，并**逐张目检**后再入库——文本正则扫不出图里的信息。
- [x] **存量失败断言的处理** —— 已清零：本条原文针对"第 3 节的 3 个失败"，这些断言已于
      2026-10-12 全部重定基转绿（见 §3）。当前断言套件 35 通过 / 3 有意跳过（上游 monorepo
      专属脚本，见 §2）/ 0 失败，发布前不存在"套件为红误导使用者"的问题。

---

## 5. 环境与依赖遗留

- **`node_modules` 处于手工修补状态**：早期为绕过 `tsdown` 缺 `unrun` 的问题，
  手工向 `node_modules` 塞入了 `unrun`、`synckit`、`@pkgr/core`，并为 `rolldown` 建了符号链接。
  **下一次正规 `pnpm install` 会覆盖这些修补**，届时需确认 `unrun` 能被正常解析。
- **`packageManager` 与实际环境不一致**：`package.json` 声明 `pnpm@11.28.5`，
  该版本要求 Node >= 22.13；而 ZCode 内置 Node 为 22.12，无法直接运行它。
  本机可改用任意 Node 22.22.x（如 22.22.2-6，已验证可用），具体路径随各人环境而定。
- **本仓库无 CI**：`npm test` 包含 `pnpm run typecheck && vitest run && tsdown && node tests/run-assertions.mjs`，
  其中 `pnpm` 在当前环境不可直接调用，需改用 `npm run` 对应脚本。
- **构建与测试必须用正确的 Node（2026-10-12 更正：此前"缺原生绑定"是误判）**：
  原生绑定 `@rolldown/binding-darwin-arm64@1.2.4` 一直躺在 `.pnpm` 里、链接也正确；
  真正原因是 **DSH 自带的 Node 24**（`~/.dsh/dsh-runtimes/.../node/bin/node`）在 macOS 上被代码签名拦住：
  `dlopen(...): code signature ... not valid for use in process: mapping process and mapped file (non-platform)
  have different Team IDs`。同一个 `.node` 在 `~/.workbuddy/binaries/node/versions/22.22.2-6` 下能正常加载。
  **结论：跑 `vitest` / `tsdown` 时不要把 DSH 自带 Node 放到 PATH 前面**，用 22.22.2-6（满足 `engines`）或 PATH 上的 22.12。
  用对 Node 后两者都正常：`vitest run` 47 个文件 / 311 个用例，`tsdown` 约 1.2 秒构建完成；
  `lib/` 已于 2026-10-12 19:52 成功重建。vitest 的真实失败基线见 §9。
- **真浏览器检查需要 Playwright 自带的 Chromium**：`./node_modules/.bin/playwright install chromium`
  （94 MB，装进 `~/Library/Caches/ms-playwright`）。本机已于 2026-10-12 安装
  （`chromium_headless_shell-1243`）。缺它时 11 个布局脚本会以 `Executable doesn't exist` 失败——
  而**此前正是因为缺浏览器，这整套真机检查从未真正跑过**，把 5 个存量失败一起藏住了，见 §6。
- **本地门禁已就位**：`npm run gate`（= `node scripts/gate.mjs`，**四步：类型检查 → 断言套件 → vitest → 11 个真机布局脚本**；
  含 vitest 后约 **70 秒**）。注意必须用能加载原生绑定的 Node（见上一条），否则 vitest 一步会以环境错误拦下。
  pre-push 钩子在 `.githooks/pre-push`，启用方式 `git config core.hooksPath .githooks`（**本机已启用**，
  2026-10-12 用临时裸仓库 `git push --dry-run` 实测过钩子确实被触发）；`git push --no-verify` 可临时跳过。
  已知红项集中登记在 `scripts/gate.mjs` 的三张表（`KNOWN_RED_ASSERT` / `KNOWN_RED_VITEST_FILES` /
  `KNOWN_RED_LAYOUT`），某项转绿时门禁会主动提示移除，避免登记表腐烂。

---

## 6. 真浏览器布局套件：基线与逐条处理（2026-10-12）

在装上 Playwright Chromium 之前，`pnpm run test:layout` 里那 11 个脚本在本机**从未真正执行过**：
它们一启动就报 `Executable doesn't exist`，看起来只是"环境没配好"，实际把 5 个存量失败一起藏住了。
装上浏览器后的首测基线是 **6 通过 / 5 失败**；逐条核查并修复后的现状是 **12 通过 / 0 失败**（`KNOWN_RED_LAYOUT` 已清空；2026-10-13 新增 `verify-a11y-and-overflow.mjs` 后由 11 项增至 12 项）。

| 脚本 | 首测失败原因 | 判定与处理 |
| --- | --- | --- |
| `verify-sidebar-titlebar.mjs` | 期望控件顶边 51px，实测 54px（`darwin/false/expanded`） | **口径过期**。核对后交通灯避让**本身没坏**：头部顶边仍正好等于宿主保留区 48px；变的是两项 ZCode 几何（头部 38→40px 使内边距 3→4px、控件 32→28px 使行内居中 +2px）。已改为断言真契约（头部顶边 === 保留区，控件落在保留区之下且不被推远），不再写死内部偏移；并用「把皮肤对保留区的消费改成 0px」注入故障**反向验证过它仍会红**（实测顶边 6 < 保留区 48） |
| `verify-sidebar-transition.mjs` | 断言要求 `0.5s`，实测 `0.18s` | **口径过期**。P1-2 已把动效统一到 ZCode 的 150–200ms ease-out（`CodexSidebar.tsx`：`transition:grid-template-columns 180ms ease-out`）。断言更新为 0.18s，中间帧/收敛断言保留 |
| `verify-workspace-drop-layout.mjs` | ① 空状态字体不统一 ② 截断标题必须滚动 | **两处都是过期口径**：① 合成页面未注入 `zcode-tokens.ts` 令牌 → 已按源码注入全部 `--dsw-*`（注入后 caption = 14−1 = 13px，原断言本身即成立）；② 跑马灯已按实测反馈移除、改为纯 ellipsis → 断言改为双向：**不得再出现滚动动画** + **必须真的按 ellipsis 截断** |
| `verify-composer-tools.mjs` | 字号 16px ≠ 13px | **夹具缺令牌**（菜单字号用 `var(--dsw-font-size-caption)`，解析失败回退继承值 16px）。三处合成页面补注入令牌后，原断言（含 18px 圆角、深浅底色）全部成立，未改断言 |
| `verify-composer-style.mjs` | ① 圆角 25/20px ≠ 16px ② 发送键底色期望实色、实测透明 | ① **口径过期**，已按 ZCode 的 16px 更新 ② **是真问题**，已按方案 1 修复（令牌提升到根作用域），脚本转绿，见 §8 |

**登记点**：`scripts/gate.mjs` 的 `KNOWN_RED_LAYOUT`（**现已清空**）。
门禁只拦截**新增**失败；某脚本转绿时会主动提示从登记表移除，避免登记表腐烂。

**尚未覆盖的场景**（真机检查与探测都没测）：Windows / Linux、真实系统缩放（探测里用
`deviceScaleFactor` 近似）、全屏与分屏、多显示器。

---

### 6.1 反复出现的坑：合成页面缺令牌（2026-10-13 根治）

布局脚本用 `page.setContent` 搭合成页面，只注入被测的样式表。样式表里的
`var(--dsw-*)` / `var(--dcu-*)` 在合成页面里**没有定义**——而 CSS 变量缺失不会报错，
只会静默回退（`font-size` 回退成继承值、`transition` 整条失效变 `0s`），
于是断言量到一个「看起来合理但错误」的数字，然后误报。

**同一个坑踩了两次，两次都是把字面量改成令牌之后发生的**：

| 时间 | 触发改动 | 症状 | 当时的处理 |
| --- | --- | --- | --- |
| P1-1 | 工作区字号改用 `var(--dsw-font-size-*)` | 空状态被误报「字体不统一」 | 在 `verify-workspace-drop-layout.mjs` 里就地提取令牌并注入 |
| 2026-10-13 | 动效改用 `var(--dcu-motion-*)`、hero 字号改用 `var(--dsw-font-size-display)` | `verify-sidebar-transition` 量到 `0s`、`verify-new-conversation` 量到 `16px` | 抽出共享模块 `scripts/fixture-tokens.mjs`，四个布局脚本统一改用 |

**根治方式**：令牌块由 `scripts/fixture-tokens.mjs` 从**源码真值提取**（不手抄），
`--dsw-*` 全量与 `--dcu-*` 全局令牌一起注入。新增令牌只要定义在
`zcode-tokens.ts` / `zcode-theme.ts` 里，所有 fixture 自动获得，不需要逐个脚本补。

> **教训**：把字面量改成令牌时，除了改样式表，还要问一句「谁在别处重新实现了这份样式」。
> 合成页面、测试夹具、文档里的示例都是"第二实现"，它们不会跟着令牌一起升级。

## 7. 上游 open issue 的继承风险（#40 探测记录）

上游 `MichengAI/dsh-codex-ui` 有两个未结 issue，本 fork 与它同源，风险共享：

| issue | 症状 | 本 fork 实测（2026-10-12） |
| --- | --- | --- |
| [#40](https://github.com/MichengAI/dsh-codex-ui/issues/40) | 「侧栏会遮挡」「拖动不了」「显示不完全」 | **4 种窗口尺寸下均未复现**，详见下 |
| [#41](https://github.com/MichengAI/dsh-codex-ui/issues/41) | 官方桌面版无法选择 Agent 预设 | 本机输入框底托条正常渲染「默认工作区 / ☁ 标准模式」，**未复现** |

#40 的探测方法与结论（窗口 1280×800、1280×800@1.25、1024×700、900×600）：

- **遮挡**：`.dcu-wb-tree` 与 `.dcu-foot` 的盒子重叠为 **0px**（footer 是静态 flex 兄弟，不覆盖滚动区）。
  首次探测曾把"行 box 落在 footer 之下的行"误判为遮挡，实为滚动容器正常裁剪——
  滚到底后最后一行**完整可见且可命中**，故该误判已撤回。
- **拖动**：HTML5 拖拽可用，拖拽指示 `dcu-wb-session-drop` 正常出现，1024×700 下顺序真的改变。
  未能复现"拖不动"。
- **显示不完全**：`scrollHeight 436 > clientHeight 272` 属正常滚动；滚到底即可看到全部行。

**未验证**：非 macOS 平台、真实系统缩放、全屏/分屏，以及报障人提到的「回车当」（原文含义不明）。

---

## 8. 已修复：发送键配色规则取不到令牌（令牌作用域问题）

`verify-composer-style.mjs` 里那条「发送键底色」的断言，核查后确认**不是口径过期，而是皮肤里有一条失效声明**。

**现象与证据（2026-10-12 实测）**

- 皮肤的规则是
  `[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{width:28px;transform:none;background:var(--dcu-primary);color:var(--dcu-primary-foreground)}`
  （`src/client/CodexSidebar.tsx`）。
- 但 `--dcu-primary` / `--dcu-primary-foreground` 当时**只定义在 `zcode-theme.ts` 的 `ZCODE_THEME_STYLE` 中，
  且作用域限定为 `.dcu-root` / `.dcu-settings-page` / `.dcu-home`**。
- 真实应用实测：`button[aria-label="发送消息"]` 的 `background-color` 为 **`rgba(0, 0, 0, 0)`**，
  从按钮向上遍历 12 层祖先**没有任何元素定义 `--dcu-primary`** → 该 `var()` 解析失败。
  规则里只有 `width:28px;transform:none` 真正生效（宽度实测确为 28px）。

**采用的修法（方案 1：补作用域）**

把这两个令牌从侧栏作用域**提升到根作用域**（`zcode-theme.ts`），并以同样的主题选择器给出暗色值：

```css
:root{--dcu-primary:#000000;--dcu-primary-foreground:#ffffff}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-primary:#ffffff;--dcu-primary-foreground:#000000}
```

**影响面很小且已核实**：全仓库只有发送键那两处消费这两个令牌（`CodexSidebar.tsx` 的常态与 hover 规则），
所以提升作用域不会让其它 `--dcu-*` 消费者开始解析；`--dcu-surface` 等侧栏本地令牌**保持原作用域不动**。

**回归结果**：`verify-composer-style.mjs` 转绿（浅色 `#000` / 暗色 `#fff`，与 ZCode 主色一致）；
该脚本的夹具原本只注入皮肤样式、不注入主题层，已同步补上 `ZCODE_THEME_STYLE`——否则夹具仍取不到令牌、
断言会继续测"空靶"。

> ⚠️ **产物已重建**（2026-10-12 19:52；此前"tsdown 失败"是 Node 选错导致，见 §5 的更正）：
> `lib/client.js` 现已包含本次修复。但**宿主仍需重启**才会加载新 bundle，重启前实机看到的仍是旧行为。

---

## 9. vitest 基线 → 已全部转绿（2026-10-12）

此前因用错 Node（见 §5 的更正），`vitest run` 从未真正执行过。换对 Node 后首测：
**47 个文件 / 311 个用例中有 5 个文件 / 20 个用例失败**。逐条定性后确认
**全部是测试侧问题，没有一个是产品缺陷**，共三类：

| 类别 | 文件（用例数） | 根因 | 修法 |
| --- | --- | --- | --- |
| 硬编码上游身份 | `session-title-provider.spec.ts`(1)、`settings-registration.spec.ts`(1) | 断言写死 `michengai-codex-ui-session-title` / `@michengai/dsh-codex-ui/...`；fork 已改名为 `zcode-ui-session-title` / `dsh-zcode-ui/session-title` | 更新期望值（测试侧） |
| 夹具 ctx 缺 `logger` | `client-runtime.integration.spec.ts`(7)、`official-sidebar-activate.spec.ts`(1) | 皮肤安装时会调用 `ctx.logger.info(...)`（`src/client/index.ts`），而两个夹具的 mock ctx 都没提供 `logger`；宿主真实 ctx 一定带它 | 夹具补 `logger: { info, warn, error }`（测试侧） |
| macOS 路径符号链接 | `session-migration.spec.ts`(10) | 生产用 `realpath(target.path)` 规范化目标路径（`src/session-migration.ts:581`），而夹具的 `sessionPersistence.locate` mock 用**原始串**比较 `meta.cwd === targetPath`；macOS 的 `tmpdir()` 是 `/var/...`、realpath 为 `/private/var/...` → mock 返回旧工件 → 迁移守卫**按设计**拦下"同目录迁移" | 夹具临时根目录改用 `realpath(mkdtemp(...))`；**产品代码无需改动** |

修复后 **47 个文件 / 311 个用例全部通过**（`vitest run` exit 0）；`scripts/gate.mjs` 的
`KNOWN_RED_VITEST_FILES` 已清空，此后任何 vitest 失败都会拦住提交。

> 教训：本仓库的宿主交互测试大量依赖 mock ctx 与**路径字符串比较**——同一份用例**在 macOS 上比在
> Linux CI 上更严格**（`/var` 符号链接、`ctx.logger` 是否存在）。新增这类夹具时：涉及路径比较先 `realpath`，
> 涉及 ctx 必须提供 `logger`。

---

## 10. compat 宿主 harness（`scripts/run-compat-host.mjs`）已可用，但上游脚本的 UI 期望尚未适配本 fork

**2026-10-12：把这条 harness 从"跑不起来"修到"能真跑"**，共 6 处改动（全部在 `scripts/`，不涉及产品代码）：

| # | 位置 | 问题 | 修法 |
| --- | --- | --- | --- |
| 1 | `run-compat-host.mjs` | 安装目录仍找 `@michengai/dsh-codex-ui` | 改为裸包名 `dsh-zcode-ui` |
| 2 | 同上 | patch 断言写死上游 id | 改为 `zcode-ui-session-title` / `dsh-zcode-ui/session-title` |
| 3 | 同上 | 标题插件 id 断言写死上游名 | 改为 `zcode-ui-session-title` |
| 4 | `verify-session-features-host.mjs` | i18n 命名空间用上游 `michengai.codexUi` | 改为本 fork 的 `zcode.ui` |
| 5 | `run-compat-host.mjs` | 版本守卫用 `require.resolve('@deepseek-ai/dsh/package.json')`，而桌面版 App 的 CLI 把宿主打进 `app.asar`，解析不到 | 改成双路径：以 `<cli> --version` 为权威来源（必检），能解析 `@deepseek-ai/*` 时再保留逐包校验；**只放过 `MODULE_NOT_FOUND`**，版本不符照旧抛出 |
| 6 | 同上 | 假设 CLI 是 JS 入口，用 `node <cli>` 调它；桌面版 CLI 是 **shell 垫片** → 语法错 | 按 shebang 判别：JS 入口用当前 node，垫片直接执行；`web` 子进程同样处理 |
| 7 | 同上 | 隔离根目录用 `mkdtemp` 原串（macOS `/var/...`），宿主会规范化成 `/private/var/...`，而插件按会话 `cwd` 作键存输入历史 → 夹具种的历史取不到 | 根目录 `realpath` 化（与 `session-migration.spec.ts` 同一类修复） |

**跑法**（约 1–2 分钟）：
```bash
export PATH="$HOME/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"
npm pack --pack-destination /tmp
DCU_DSH_BIN="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
DCU_E2E_TARBALL=/tmp/dsh-zcode-ui-1.0.0.tgz DCU_E2E_VERSION=0.2.0-rc.2 \
node scripts/run-compat-host.mjs
```
失败时 harness 会保留隔离 profile（路径打印在输出里，形如
`/private/var/folders/.../T/dcu-compat-host-xxxx`），可用来复现排查。`verify-compat-host.mjs` 里
种入输入历史用的 `michengai.codex-ui.input-history.v1` **是本 fork 保留的真实键名**（见 `src/client/input-history.ts`），不要"顺手改成 zcode"。

**当前卡点（需要决策，未擅自适配）**：修完上述 7 处后，harness 已经能装包、起宿主、跑第一个脚本，并且
过了输入历史调回（ArrowUp）、空草稿建议、兼容面板三项检查，最终停在 `verify-compat-host.mjs:66`：

```js
await page.getByRole('button', { name: '任务', exact: true }).click()   // 30s 超时
```

原因是**上游导航与本 fork 不同**：上游插件的侧栏首项是「任务」，而本 fork 的侧栏已改为 ZCode 结构
（新建任务 / 扩展管理 / 底部的记忆·任务·归档由宿主或其它插件提供）。因此这一条（以及后面的
`verify-settings-exit` / `verify-session-features-host`）需要按本 fork 的导航结构适配，**并逐条登记是
设计变更还是缺陷**——处理原则与 §3.1 相同，不要把"当前代码怎样"直接写成契约。

在适配完成前，这条 harness **不要**纳入 `scripts/gate.mjs`（它是一个独立的重型档，需要 tarball + 隔离宿主 + 约 1–2 分钟）。

### 10.1 已定位的下一处卡点：全局面板打开后没有"返回会话"的入口

用常驻隔离宿主 + 探针（把 `verify-compat-host.mjs:66` 临时替换为打印**全部矩形可见**的控件，跑完已还原）确认：

打开 `sidebar.panellist` 的全局面板后（本例是兼容测试面板夹具），本 fork 的侧栏可见控件只有：
`新建任务 / 收缩侧边栏 / 搜索会话 / 兼容测试面板 / 扩展管理(专家·技能·插件·连接器·定时任务·IM助理) / 置顶 / 项目 / 最近 / 设置`
——**没有任何"返回会话/关闭面板"的专用控件**；再点一次面板入口与按 Escape 都无效（面板仍在、输入框仍被替换掉）。

上游插件的 `任务` 入口正是承担这个返回职责，而 ZCode 侧栏结构里不存在该入口。两种解读，需要决策：

- **设计变更**：ZCode 侧栏靠「点击会话行 / 新建任务」回到会话区（真实使用中有会话行，因此能回去；本隔离宿主里恰好没有会话行）。
  → 那么 `verify-compat-host.mjs` 这一条应改为点击会话行，或改断言目标。
- **真 UX 缺口**：全局面板打开时缺少明确的返回入口（用户可能"被困"在面板里，只能靠会话行）。
  → 那么应改**产品 UI**：面板打开时提供返回/关闭控件。

**在决定之前不要改这一条断言**。后续还有 `verify-settings-exit.mjs` / `verify-session-features-host.mjs` 两个脚本未跑到
（harness 遇首败即停）。另注：`verify-compat-host.mjs` 会往 `DCU_E2E_WORKSPACE` 写 `compat-reference.txt`，
**重复跑同一工作区会 EEXIST** —— 迭代时先删掉该文件，或用全新工作区。

### 10.2 已解决：全局面板缺返回入口（产品修复）＋ 新暴露：建议菜单在 900px 宽下越出视口

**§10.1 的困境已按"真 UX 缺口"处理并修好（产品侧）**：

- 侧栏新增显式「返回会话」入口，**只在全局面板打开时出现**，动作是 `selectPanel(null)`（打开面板的逆操作，
  宿主会恢复此前主视图，会话与草稿都保留）。展开态是带文字的菜单项，紧凑轨是同名 aria-label 的图标按钮。
  复用已有能力，没有新接管线（`session-navigation.ts` 的 `openConversation` 早就是这个语义）。
- 两处脚本适配（`verify-compat-host.mjs` 第 66 / 78 行）：上游点的是「任务」导航项，本 fork 改点「返回会话」。
  **这两处是"设计变更 + 产品补齐"后的等价操作，不是把断言改成迎合代码**——原缺口已用产品改动补齐。
- 回归：门禁四步全绿（断言 34 通过 / vitest 311 通过 / 布局 11 通过 / tsc），说明新增入口没碰坏任何既有契约；
  harness 端到端也已验证「返回后草稿仍在、会话 id 不变」。

**接着暴露的新问题（真实、非口径）**：脚本推进到 `verify-compat-host.mjs:114` 的
「建议菜单不得越出视口」断言失败：

```
dark / width=900 / 触发符 "/"
outer=672  inner=662  left=-69.30  right=602.70
```

即建议菜单在 900px 宽下**左移出视口 69px**。两个要点：

1. `scripts/verify-composer-tools.mjs`（本 fork 自己的菜单脚本）只覆盖 **390 / 1280** 两个宽度，
   **900 恰好没覆盖** → 这是一处真实的测试覆盖缺口，被 compat harness（真实宿主）抓出来了。
2. 需要判断是**宿主演进**（0.2.0-rc.2 改了菜单锚点/尺寸约束，而 fork 的覆盖规则随之失效）还是
   **fork 自身定位缺陷**；本 fork 的合成夹具自建 `[data-composer-card]`，看不到真实宿主下的锚点差异。
   → 复现方式：按 §10 跑法起隔离宿主，把视口设 900、在输入框敲 `/`，量 `[data-trigger-menu]` 的
   `getBoundingClientRect()` 与宿主锚点元素的相对关系。

**§10.2 追加证据（同日）——越界的成因已排除"我们的令牌"，但还没定论**：

在失败点插探针（跑完已还原）量到（视口 900、dark、触发符 `/`）：

```
card:  class yhfFVG_card          left=-53  right=610  w=663  max-width:672px
anchor: class yhfFVG_overlayAnchor left=-53  right=610  w=663  position:absolute
menu:  left=-53 right=610 w=663  css left/right = 0   ← 菜单与锚点完全一致
tokens: --dsh-chat-content-width:640px   --dsh-composer-card-max-width:calc(640px + 32px)
```

随后核对宿主包（`@deepseek-ai/dsh-client-ui-conversation@0.2.0-rc.2`）发现：

- **宿主自己也声明同一个公式**：`--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px)`
  （另有候选 `min(calc(100% - 16px), 952px)`）；fork 在 `CodexSidebar.tsx:141` 的 `[data-conversation-scroll]` 上
  重声明的是**与宿主一致的公式**，不是新引入的约束。
- 宿主的卡片规则是 `.…_card{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width)}`
  → 卡片宽度由**容器**决定，`max-width` 只会封顶，**不可能把卡片撑出容器**。

因此 `left=-53` 更可能是**整列偏左 / 文档发生了横向滚动**（−53 与"容器宽 663、被右移约 293px"等价，
293 与侧栏 240 量级相近），而**不是**本插件令牌造成的。菜单忠实跟随卡片（`left/right:0`）属于正确行为。

**下一步的决定性检查（尚未做）**：在同一个 900px、dark、`/` 的现场，同时记录
`window.scrollX` / `document.documentElement.scrollLeft`、会话列容器（卡片父级）的 rect、
以及 `[data-conversation-scroll]` 的 rect。若 `scrollX > 0`，说明是横向滚动导致（应查是谁把文档撑宽了：
很可能是被打开的某个面板或菜单），**不要**先改本插件的令牌公式。

**已顺带修掉的覆盖缺口**：`scripts/verify-composer-tools.mjs` 的宽度矩阵由 `[390, 1280]`
扩为 `[390, 900, 1024, 1280]`（3 处循环）并跑通；这也证实该越界**无法**在合成夹具里复现
（合成卡片不消费那个令牌），真机 harness 才是能抓到它的地方。

### 10.3 compat harness 已端到端跑通（2026-10-12）

三个活宿主脚本全部通过、`pageErrors` 为空：

- `verify-compat-host`：输入历史调回、空草稿建议、兼容面板与选中反馈、**返回会话且草稿保留**、紧凑轨导航与动态注销/重注册，以及建议菜单几何（三视口 × 两种触发符 × 明暗）。
- `verify-settings-exit`：返回、Escape、进入中退出、减少动态效果四条交互。
- `verify-session-features-host`：工作区树接管侧栏、隔离宿主可移动会话与目标项目、会话菜单移动入口、移动接口归位。

**过程中定性掉的一处"假缺陷"（重要，别再当 bug 修）**：`verify-compat-host` 曾在 `width=900 / dark / 触发符 "/"` 处报
「建议菜单越出视口」（`left=-52.9`）。逐层探针查明：页面自身没有滚动（`scrollX=0`、文档 900=900），而是
**宿主 app frame 被横滚了 264px** —— 宿主的 `rightbarCol` 宽度为 `0` 却带 **640px 隐藏内容**
（来自 `compat-panel` 夹具面板），使 frame 的 `scrollWidth=1540 > 视口`；浏览器为保持焦点元素可见横滚了 frame，
于是所有 `getBoundingClientRect()` 一起左移，而菜单与卡片 `left/right` **完全一致**（插件行为正确）。

→ 结论：**不是插件缺陷，也不要为此改插件的 `--dsh-composer-card-max-width` 公式**（宿主自己用的是同一公式，
且卡片是 `width:100%; max-width:该令牌`，只会封顶不会撑宽）。修法是在测量前把 frame 的横向滚动归零（已加注释说明成因）。

**跑通命令**（约 1–2 分钟；`npm run test:compat` 需要以下三个环境变量）：

```bash
export PATH="$HOME/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"
npm pack --pack-destination /tmp
DCU_DSH_BIN="/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
DCU_E2E_TARBALL=/tmp/dsh-zcode-ui-1.0.0.tgz DCU_E2E_VERSION=0.2.0-rc.2 \
node scripts/run-compat-host.mjs
```

**仍不纳入 `scripts/gate.mjs`**：它需要 tarball + 隔离宿主、耗时 1–2 分钟，属于独立的重型档（只在改动宿主交互时手动跑）。

**已知操作细节**：`verify-compat-host` 会往 `DCU_E2E_WORKSPACE` 写 `compat-reference.txt`，
**同一个工作区重复跑会 `EEXIST`** → 复用工作区前先删该文件，或让 harness 每次新建隔离目录（默认行为即是）。

### 3b 附注（2026-10-12 视觉复验发现）：第 2 条此前改错了组件

§3b 第 2 条当时改的是 `session-tree.tsx` 的 `SessionHoverCard`，但**侧栏工作区树（即实测反馈里的那张卡）走的是
`workspace-hover-card.tsx` 的 `WorkspaceHoverCard`**；前者只服务定时任务 / IM 频道里的会话卡。所以侧栏那张卡
一直仍在显示「标题 + 时长 + 项目名」，**上一轮修复对它完全没生效**。

- 已修：`workspace-hover-card.tsx` 的**会话分支**只去掉时长与项目行（行内右侧已常驻时长、项目已由树形层级表达），
  保留分支行；**工作区行**的 pin / 数量 / 路径 / 编辑入口一律不动。
- 已修断言：`settings-integration.assert.ts` 里那条「会话时间必须出现在悬停卡片右上角」——它把**旧设计写成了契约**，
  正是它让"改错组件"没被发现。现改为反向断言（不得渲染时长 / 项目行，必须保留分支行）。
- 复验：隔离宿主（真机浏览器）实拍，悬停卡现在只显示完整标题；同图另见发送键为 ZCode 主色实心圆。
- 遗留 → **已处理（2026-10-12）**：`CodexWorkspaceBrowser.tsx` 的 `.dcu-wb-tip-time{...}` 死规则已删除
  （渲染方自悬停卡修复那次提交起不存在，`session-tree` / `settings-integration` 两条断言反向守护）。

## 11. 侧栏"意义不明的直线"（2026-10-12 实测反馈）

**结论：本插件自己画了 2 根分隔线，已全部去掉；侧栏里剩下的横线属于计费插件，不是本插件画的。**

排查方法（可复用，无需重启宿主）：用现签 `dsh-auth-*` cookie 的 headless 脚本连上实机，
在侧栏（`.dcu-root`）内统计"宽度 > 60px 且 border-top/bottom 可见"的元素，逐个打印类名与 y 坐标；
再用 `addStyleTag` 临时禁用怀疑的规则做 A/B 对照。

实测量到的 5 根横线：

| y | 类名 | 归属 | 处置 |
| --- | --- | --- | --- |
| 160px | `dcu-workspaces` | 本插件（工作区块上沿） | **已删除** |
| 689px | `dcu-foot` | 本插件（底栏上沿） | **已删除** |
| 698px | `cm-footer-stack simple` | 计费插件 | 不动 |
| 699px | `cm-simple-summary` | 计费插件（卡片边框） | 不动 |
| 762px | `cm-peak-track` | 计费插件（进度条本体） | 不动 |

处置依据：`docs/ZCODE-DESIGN.md` 的「侧栏几何」只规定 `px-2/py-3/gap-1` **间距**，没有内部分隔线；
分区靠间距区分。同时删掉的还有 `.dcu-footer-actions>*+*` 那条"底栏逐项画线"（它会在底栏有多个真实盒子时
堆出一排线；实测在当前宿主下这些槽锚点是 `display:contents`，所以它没画出来，但属于同类过度装饰）。

反向断言已加在 `tests/conversation-visuals.assert.ts`：工作区块与底栏都不得再出现 `border-top`，
底栏入口之间也不得逐项画线——避免以后又被"顺手"加回来。

**没有动的**：计费插件的卡片边框与进度条（那是该插件自己的 UI 与数据可视化，不属于本皮肤该管的部分；
若确实想去掉卡片边框，应改那个插件或与本皮肤协商，不要在这里用 `!important` 覆盖别人的组件）。


---

## 12. 2026-10-13 第二轮：设计制度收紧与自身回归修复

本轮目标是「把已有的偏离收归标度、把设计规则写成断言、把管不到的如实登记」，不动信息结构。

### 12.1 已修复

| 项 | 内容 | 证据 |
| --- | --- | --- |
| 离标度圆角收归 | `18px / 10px / 9px / 7px / 3px / 1px / 99px` 全部改为 `var(--dsw-radius-*)`；新增 `--dsw-radius-2xl:16px`（白名单大圆角）与 `--dsw-radius-full:999px`（胶囊），并让 2xl 真正有消费方（搜索弹窗 / 主输入壳 / 轮次摘要浮层 3 处） | `npm run gate` 13/13；`grep -rn radius-2xl src/` 有 3 处消费 |
| 死兜底清理 | 清掉 `var(--token,#fallback)` 中令牌已定义、兜底永不生效的 4 处（`--dcu-tip-bg` / `--dsw-alias-state-warn-*` / `--dsw-alias-scrollbar-hover-l1`） | 同上 |
| 菜单暗色底纠正 | 主区工具菜单暗色底 `#292929`（离板灰）→ ZCode 菜单色 `#2b2b2b` | `ZCODE-DESIGN.md` §2 |
| reduced-motion 停静止帧 | 时长归零管不到 `infinite` 动画；现把进度波浪停在 28%（保留「进行中」可读性）。旋转指示的归零留在组件层（同一份样式内同时定义 keyframes 与归零，更内聚） | 实机 `emulateMedia(reduced-motion:reduce)` 下 `animation-name:none`，元素仍在渲染（16×20） |
| 主区嵌入面容器边界 | **试过并撤回**：写过 `:root:root [data-slot="main"] iframe{border-radius:…}`，实机像素比对证明它**没有任何可见效果**（见 §12.3 #8），属空操作，已删除 | `git diff` 中不再有该规则；否定结论记在 §12.3 #8 |
| 圆角断言由「值白名单」改「棘轮」 | 原断言锁「值 ∈ 允许集」，把令牌改回 `999px` 仍绿（假断言）。现按 `文件:值 → 次数` 登记存量，未登记的字面量一律红 | 反向测试：把 `var(--dsw-radius-full)` 改回 `999px` → 立刻报「未登记的字面量」 |
| 模板串截断守卫 | 新增第 13 节：对**抽取结果**校验前中部标记 **+ 尾标记**（只查前中部会漏掉尾部截断） | 反向测试：往主题层注释塞一对反引号 → 报「必须延伸到模板末尾」 |
| 偶发断言修复 | `scripts/verify-composer-style.mjs` 用 `getBoundingClientRect()` 浮点值做严格相等（实测拿到 `28.000003814698`），且首帧可能读到过渡中间值 | 改为容差比较 + 首次测量前 150ms settle；连跑多次稳定 |

### 12.2 本轮自身引入并已修复的回归（记录在案）

**误删 `--dsw-radius-panel`**：它**不是**自家死令牌，而是对**宿主**令牌的覆盖——宿主 `@deepseek-ai/dsh-client-ui-theme` 在 `:root` 定义 `--dsw-radius-panel:28px`，被 Modal（对话框）、`ui-settings-general`（设置面板）、`ui-message-feedback`、`ui-conversation`（`cardWorkspaceTrigger:after` 虚线投放轮廓）与 `dsh-web-frontend`（浮动面板 + `calc(var(--dsw-radius-panel) - 4px)` 的缩放角）消费。本插件用 `:root:root`（0,2,0）压过宿主 `:root`（0,1,0），删掉即上述表面回落到 **28px**。
- 实机复核：删除后 `getComputedStyle(document.documentElement).getPropertyValue('--dsw-radius-panel')` = `28px`；恢复为 `12px` 后 = `12px`。
- 现取值 `12px`（一级容器）而非宿主 28px：与卡片/控件同一语言，且相对上一版 10px 只 +2px。断言要求它**存在且 ∈ {12px,16px}**——把它删掉或改到标度外都会红。
- **教训**：判断「某令牌有没有消费方」时，`grep src/` 只覆盖自家代码；**宿主也消费同名令牌**。这类名字是共享命名空间，不是私有变量。

### 12.3 登记为后续（带证据与建议，本轮不做）

| # | 项 | 证据 | 建议 |
| --- | --- | --- | --- |
| 1 | 菜单底色仍写 `#fff` / `#2b2b2b!important`，未走宿主菜单真令牌 | 宿主 `--dsw-specific-menu` = `#f8f9faf0` / darwin 暗色 `#303136f0`，配 `backdrop-filter:var(--dsw-menu-backdrop-filter)`；本插件的 `!important` 抹掉了那层半透明与模糊 | 在 `ZCODE_LIGHT/ZCODE_DARK` 加 `--dsw-specific-menu`，删掉两条主题分支。**前置**：先修下面的 #2，否则夹具取不到正确的明暗值 |
| 2 | `fixture-tokens.mjs` 把明暗两套令牌平铺进同一个 `:root{}`，重复键**暗色胜出** | 实测合成页 `--dsw-alias-border-l2` = `rgba(255,255,255,.1)`（应为亮色 `rgba(13,13,13,.1)`） | 改成 `fixtureTokenStyle(modality)` 只注入对应那一份；或在文件头把「重复键以暗色为准」写成显式契约并加断言 |
| 3 | 宿主 `--dsw-radius-*` 命名空间被整体接管 | 宿主 `xs4/sm8/md12/lg16/xl20/panel28` vs 插件 `2/4/6/8/12/16`；宿主多处按名消费（`ui-jobs` / `ui-plugin-manager` / `ui-user-questions` badge 等），`lg` 期望 16px 实得 8px | 记在案即可（这是"令牌优先换肤"的固有代价）；若要收敛，需改为只覆盖真正需要的角色，而不是整个标度 |
| 4 | 主区 iframe 无同源约束 | `[data-slot="main"] iframe` 会命中未来任何注入 main 的 iframe（含外部站点） | 已知行为：今天只加圆角、影响面 1 个面板；如需收紧，加排除名单或同源判定 |
| 5 | 圆角字面量存量 43 处（2/4/6/8px 共 36 + `0`×2 + `50%`×5） | 棘轮基线在 `tests/design-system.assert.ts` 第 9 节；`grep` 可复现 | 36 处是**零视觉变更**的可行迁移（令牌值＝字面量），但会连带改 8 条锁字面量的断言（`session-tree` / `settings-integration` / `conversation-visuals`）；建议单独一轮做 |
| 6 | 分组标题 sticky 未交付 | 本机工作区**没有项目分组**，`.dcu-wb-collection-head` 数量为 0；且第一版把它打在该元素上属于**选错目标**——用户真正看到的分区标题是 `.dcu-wb-section-head`（置顶/项目/最近） | 运行时注入验证过：打在 `.dcu-wb-section-head` 上有效（滚动后 delta=0、宽度不变、无横向溢出、z-index 2、悬停仍不透明）。要做的话应连同 `collection-head` 一起，并补一条真浏览器断言（需要带分组的工作区或合成夹具） |
| 7 | 平台覆盖仍只有 macOS 单窗口 | §6 已登记 | 不变 |

上述 #6 之前，本轮还做过一次**已撤回**的尝试，结论如下：

| # | 项 | 证据 | 结论 |
| --- | --- | --- | --- |
| 8 | **跨文档第三方面板：皮肤层面不存在有效的容器手段** | ① 面板在 `<iframe src="{origin}/mcp-connector/ui/">` 独立文档内，CSS 对宿主令牌引用 **0 处**（`--dsw-*`/`--dcu-*` 均为 0），主色 indigo `#4f46e5`；② 面板只跟随**操作系统** `prefers-color-scheme`，不跟随宿主 `body[data-ds-dark-theme]`；③ 宿主在 iframe 上写**行内样式** `border-style:none; border-color:currentcolor; background:transparent`，行内优先级高于任何样式表规则（含 `@layer`），故 `border`/`background` 必为死声明；④ 唯一能生效的 `border-radius` 也**不可见**——像素比对（DSF=4，两种主题各一次）：有/无圆角的 44×44 角部裁图仅 **50 个像素** 不同，且差值是 `(254,254,254)` vs `(255,255,255)` 的一级抗锯齿，因为裁角后露出的父层底色与面板同为近白 | 皮肤**不应**再去声明嵌入面的边框/底/圆角——那是空操作。真正的修复必须来自宿主（把主题与表面令牌下发给 iframe，或为它包一层容器）或来自该插件自身（消费宿主令牌、跟随宿主明暗）。**已证伪的杠杆见 `ZCODE-DESIGN.md` §13.3** |

### 12.4 本轮未触碰（核过）

- **无数据层改动**：`git diff` 中 REST / session 相关只出现一条**未改**的上下文行（`AboutSection.tsx` 的 `CODEX_UI_API_ENDPOINTS.dependencies`）。
- **交付集无 sticky 代码**：`grep -rn 'position:sticky' src/ tests/ scripts/` = 0
  （不要用 `git diff | grep -c sticky` 判——本文档自己就含这个词，会自指失真）。
- **上一轮五项修复**：fixture 同源、gate 假绿判定、锚点哨兵、主题同步在应用级 —— 四项无回退；第五项 `SKIN_VERSION` 需更正：**HEAD 上是 `'1.0.0'`，`'1.1.0'` 是上一轮工作树里的未提交改动**，不是 HEAD 状态。

## 13. 2026-10-13 设计审计结论登记（与代码改动分开，结论比代码活得久）

§12 记的是「改了什么」。本节登记同一轮审计得出的**结论与判据**——它们中的大多数
**不产生代码改动**，但每一个都能让后来人少走一次弯路。来源：另一会话对 `d7fd928`
的独立设计审计（实机计算样式测量 + 源码取证），由本会话逐条复核后采纳。

### 13.1 明暗撕裂：宿主级问题，皮肤无权修（严重度：高，已Gate）

主区 MCP 连接器面板在独立 `<iframe src="{origin}/mcp-connector/ui/">` 内。它**有暗色样式**，
但只跟随**操作系统** `prefers-color-scheme`，**不跟随**宿主 `body[data-ds-dark-theme]`。
于是「宿主暗 + 系统亮」时，主区出现一整块亮白面板 + indigo 主按钮。

| 实验 | 手段 | 结果 |
| --- | --- | --- |
| A | 宿主暗 + 系统亮（基线） | 面板 `rgb(248,249,251)` 亮底 ❌ |
| B | 宿主暗 + **系统暗** | 面板 `rgb(17,19,24)` 暗底 ✅ → 证明它有暗色样式 |
| C | 向 iframe 注入 `color-scheme:dark` + `.dark` 类 | 无变化 |
| D | 对照组 | 无变化 |
| E | iframe **元素** inline `color-scheme:dark` | 无变化 |
| F | 注入 `iframe{color-scheme:dark!important}` | 无变化 |

**结论**：Chrome 不依据嵌入元素的 `color-scheme` 重解内嵌文档的媒体查询——三个最直接的
杠杆全部证伪。这与本插件早已修复的「宿主浅色 + 系统深色把侧栏与内容区撕成两半」是**同一类
bug，但这一处皮肤无权修**。剩余手段只有「登记 + 上报」；**不得**去覆盖对方内部样式
（那是把别人的 UI 变成自己的 bug）。责任方：宿主（应把主题令牌下发给 iframe）或该插件自身。

### 13.2 破版归属清单（逐条取证，避免下次再投诉到本插件）

| # | 现象 | 归属 | 可否强制 | 处置 |
| --- | --- | --- | --- | --- |
| 1 | 面板 indigo `#4f46e5` 实心按钮 ×38、琥珀推荐边框、蓝色页签下划线 | `iframe /mcp-connector/ui/`，自有 `--accent`，跨文档 | ❌ | 登记上报 |
| 2 | 暗色宿主下面板整块亮白 | 同上（§13.1） | ❌ | 登记为宿主级 |
| 3 | 侧栏计费卡：白底卡片 + 加粗大数字 | 同 DOM，`cm-*` | ✅ | 已收敛（`foreign-content-contract.ts`） |
| 4 | 侧栏峰值条填充 `rgb(255,152,0)` | 同 DOM，`cm-peak-segment` | — | **显式允许**，见 §13.3 |
| 5 | 顶栏彩色位图图标（打开方式） | 宿主 `app.asar` 内置 | ❌ | 已查证登记 |
| 6 | 主区右下角游离面板开关图标 | 宿主内置 | ❌ | 已查证登记 |

### 13.3 契约第 4 条：数据可视化的语义色允许保留（2026-10-13 补）

`.cm-peak-segment.cm-peak-high` 的填充是实机测得的 `rgb(255,152,0)`、段宽 95px。
它是**数据可视化**（峰值 / 非峰值状态），不是文字也不是装饰底。把它压成中性等于抹掉信息。

因此外来内容契约在第 1（文字色）、2（卡片底）、3（折叠可降级）之外补第 4 条：
**数据可视化的语义色允许保留，且只限于填充本身**——它不得用于文字或卡片底（那两条归第 1、2 条）。

这一条是**显式允许，不是漏管**：没有它，下一个做整洁化的人会把这抹暖色当杂质清掉，
而峰值条会因此失去「现在是不是峰值」这个信息。契约与设计文档（§10.2）已同步。

### 13.4 关闭一项旧待办：三个面板页的宿主图标长尾永久保留

曾登记为「待设计确认」的 `AboutSection` / `ScheduleBrowser` / `ConnectorsSection` 宿主图标，
本轮**做出决定并关闭**：**永久保留，不做统一**。依据：

1. 上游 ZCode 自身 `strokeWidth` 即混用——全局默认 1.5，UI 状态图标事实标准 1.33（15 处），
   2 出现 22 处（几乎全是图表 / 品牌）。「换成一统图标」在上游就没有单一判据；
2. 这三个文件**各自内部一致**，且只出现在独立面板页、不与侧栏同屏，不构成同屏混用；
3. 换成 Lucide 等价图标会改描边粗细与视觉重量，属**无判据的视觉变更**。

### 13.5 两条上游事实：不要当规范抄

| 上游事实 | 对本仓的约束 |
| --- | --- |
| `--color-ring` 上游**只有引用、无定义**（43 处 ring 落到 Tailwind 默认） | 本仓焦点环 `outline: 2px auto #0b7fff` 是**优于上游**的实现，**不要**为了「对齐上游」去抄一个未定义 token |
| `--leading-relaxed` 上游无定义（依赖 Tailwind 默认，仓库无 `node_modules`） | 本仓的行高取值**没有权威来源**，只能算「已登记推测」；不要包装成「上游规定」 |

### 13.6 仍空白的区域（有规范价值，本轮未做）

| 空白 | 现状 | 建议 |
| --- | --- | --- |
| loading / error 态 | ZCode 宪章未规定；本仓无统一规范、无断言；依赖面板 / 连接器的失败态外观未定义 | 同一外壳只换图标；错误不铺 destructive 底色，语义靠文案 + 表单 `aria-invalid` 边框 |
| 平台覆盖 | 仅 macOS 单窗口验证过 | Windows / Linux、系统缩放、全屏分屏、多显示器均未验（§6 已登记，不变） |

### 13.7 独立复核记录（本会话，13:5x）

DSH 交出的 20 文件 / +322 −64 补丁**没有仅凭自述采信**，本会话独立复核如下：

| 复核项 | 方法 | 结果 |
| --- | --- | --- |
| 门禁 | 本会话重跑 `npm run gate`（非读日志） | 类型 ✔ / 断言 35·3·0 / vitest 全过 / 布局 12·12 |
| `--dsw-radius-panel` 误删回归 | 实机读 `getComputedStyle(documentElement)` | 生效值 **12px** ✔（DSh 的「删除后回落到宿主 28px」判断属实；本会话另行确认了宿主依赖该同名令牌） |
| 半径变化落点 | 实机读计算值 | 建议卡 **12px** ✔（原 10px）、工具菜单 **12px** ✔（原 18px）且底色走令牌 |
| 离标度圆角 | 源码 grep | `18px / 10px / 9px / 7px / 3px` 已清零；剩余字面量全部 ∈ {2,4,6,8}，且被棘轮断言登记 |
| iframe 容器规则 | 源码 grep + 复核其像素证据 | 已撤回 ✔（无 `iframe` 规则残留） |
| sticky | 源码 grep `position:sticky` | **0 处** ✔（已按用户指示拆出） |
| `SKIN_VERSION` | `git show HEAD:` 对照 | **DSH 的更正属实**：HEAD 上 `SKIN_VERSION='1.0.0'` 而 `package.json` 已是 1.1.0——v1.1.0 发漏了内部版本串对齐，本批补上 |

---

## 14. 2026-10-13 侧栏开合动画改合成层（架构变更，结论比代码活得久）

### 14.1 问题与根因（先复现，后修）

用户实测：「侧栏拉出的帧率受当前对话的上下文长度影响」。复现（无头 Chromium、60Hz、
镜像宿主 AppFrame 的真实夹具、中心列灌入可变消息数）：

| 消息数 | 旧实现（grid 过渡）500ms 内帧数 | 飞行中平均 / 最大 | >20ms 的帧 |
| --- | --- | --- | --- |
| 10 | 30/30 | 16.7ms / 18ms | 0 |
| 1200 | **26/30** | **20.0ms / 37ms** | **8** |

根因：动画属性是 `grid-template-columns`——布局属性，每一帧触发整棵网格树重排，
成本随会话内容增长。用户机器是 120Hz（帧预算 8.33ms），长会话下旧实现几乎每帧超预算。

### 14.2 方案与实测（同机同夹具同指标）

动画期间网格轨道保持静止，内容列与拖拽柄改用 `transform`/`left` 位移（合成层属性），
轨道只在两端「快照」里一次性切换：

| 场景 | 旧实现 | 新实现 |
| --- | --- | --- |
| 收起·10 条 | 30/30 帧，max 18ms | 31/30 帧，max 19ms |
| 收起·1200 条 | 26/30 帧，飞行 avg 20.0 / max 37ms / 8 帧超 20ms | 29/30 帧，首帧 59ms（一次性重排），**飞行 avg 16.3 / max 18ms / 0 掉帧** |
| 展开·1200 条 | 29/30 帧 | 30/30 帧，0 掉帧 |

帧成本与内容量脱钩（16.3ms@1200 vs 16.7ms@10）。该对照已固化为
`verify-sidebar-transition.mjs` 的回归断言（旧实现下失败）。

### 14.3 已登记的代价（不是 bug，是取舍）

| 代价 | 说明 | 为何可接受 |
| --- | --- | --- |
| 每次开合一次布局 | 推挤语义要求内容列右缘锚定；动画期间加宽一个 shift（收起）/ 末端切轨（展开）触发一次重排 | 由「每帧一次」降为「每次一次」；1200 条消息时约 59ms（≈3 帧槽），轻内容约 15ms |
| 动画期间侧栏层叠提升 | 内容列 transform 生成层叠上下文且 DOM 顺序在后，不抬升会盖住侧栏；`.dcu-root` 在动画期间 `z-index:1` | 搜索弹窗是全屏 scrim（10020），打开期间侧栏不可点，「弹窗与开合同时存在」交互上不可达；宿主浮层（20）同理会挡住收起按钮。窗口仅 180ms。断言已按此收窄为「禁止无条件隔离」 |
| 未在真机 120Hz 上量 | 无头环境跑 60Hz，量不到 120Hz；结论靠「每帧布局成本」推断 + 60Hz 掉帧复现 | 建议用户实机复核一次展开/收起的主观顺滑度 |

### 14.4 顺带修掉的既有缺陷

- 冷启动即收起态的帧，第一次展开不播动画（收起分支从不打初始化标记，被误判为冷启动）。
- 拖拽进行中不取消飞行中的开合动画，动画定时器稍后落定会与拖拽逐帧写入打架。

---

## 15. 2026-10-13 动效全面复核 + 图标语言收尾 + 信封扩展（1.4.0）

### 15.1 运行中转圈：改为严格复刻 ZCode 原版（不再自行设计）

1.2.1 曾把转圈"重做"成自绘 270° 弧（理由：原版看不清、0.8s 太拖）——这是**自行再设计**，
用户 2026-10-13 明确要求以本地 ZCode 源码为准复刻。取证链（全部来自本机，非记忆）：

| 项 | 来源（本机实测） | 值 |
| --- | --- | --- |
| 组件 | `~/WorkBuddy AI/.../ZCode/packages/ui/src/components/ui/spinner.tsx` | `LoaderIcon` + `size-4 animate-spin` |
| 图标 | lucide-react 1.17.0（ZCode 锁定版）`loader.mjs`；键值 3427ic/r700ao/wj9ykh/1bxg5t/jadmvz/bwix9q/j09sii/giyufr | 8 芒 loader（`Loader as LoaderIcon`） |
| 尺寸 | 同文件 `size-4` | 16px（viewBox 24、stroke-width 2、round） |
| 动画 | app bundle CSS 实测：`--animate-spin: spin 1s linear infinite` + `@keyframes spin{to{transform:rotate(360deg)}}` | 1s / linear / infinite |
| 颜色 | ZCode 侧栏两处用法均 `text-foreground-subtlest`（40% 中性灰，在 #f0f0f0 上 2.32:1） | 映射到本仓 AA 达标同档 `--dcu-sidebar-tertiary`（#686868） |

注意：`LoaderCircle`（弧线版）不是 ZCode 的 Spinner 图标——v1.17.0 与 v1.39.0 的
`LoaderIcon` 都是 8 芒 `loader`；本仓把原 `ZIconLoading = LoaderCircle`（无人使用）一并收归，
避免两枚"加载"图标分叉。

### 15.2 其余动效逐项复核（仍在过渡布局属性的四处）

单帧成本 = 驱动动画值后强制同步布局的 style+layout 耗时（真实插件 CSS + 真实 DOM，
60Hz 无头；60Hz 量不到 120Hz，但「单帧成本 << 8.33ms」即 120Hz 安全）：

| 动画 | 属性 | 单帧 max | P95 | 判定 |
| --- | --- | --- | --- | --- |
| 转场导航刻度 ×120 | width/height/flex-basis | 2.1ms | 1.2ms | 有界（每刻度 ≤16×8 小格），可接受 |
| 会话头页签滑块 | transform+width | 0.6ms | 0.4ms | 绝对定位无子元素，可接受 |
| 扩展面板开合 | grid-template-rows 0fr↔1fr | 0.2ms | 0.1ms | 标准自动高度技法，可接受 |
| 关于页进度条 | width% | 1.3ms | 0.5ms | 4px 高填充，可接受 |

结论：侧栏那处「成本随会话内容增长」是唯一的量级问题（1.3.0 已改合成层）；
其余全部有界、与内容量无关。已固化为 `scripts/verify-motion-budget.mjs` 回归。
其余 9 个入场/装饰动画全部走进入档令牌（`--dcu-motion-enter-*`）或 ZCode 锁定常量
（转圈 1s、进度波浪 1.2s），无未令牌化的自创时长。

### 15.3 图标语言收尾

About / Connectors / Schedule 三处残留宿主图标（16 视箱、1/1.3 描边）已收归
`zcode-icons`（24 视箱、2 描边）；`host-icons.ts` 桥接模块无引用者，已删除。
此前 zcode-icons 头部声明"本模块是唯一来源"而实际有例外——现在例外清零。

### 15.4 信封扩展：表单控件字体（外部性缺口，已修）

`button/input/select/textarea` 的字体不继承（UA 样式表显式设定），信封原先只在表面上
设 `font-family`，够不到它们。实测（真实 Chromium）：表面 system-ui、裸 `<button>`
仍渲染 Arial——外来插件的裸控件会脱离皮肤字体。修法：零特异性 `:where()` 归一为
`font:inherit`；任何作者样式（含插件哈希类）都能覆盖我们、只有 UA 被压过。
实测：裸按钮随皮肤 system-ui；插件自己的 `font-family:Georgia` 原样保留。

---

## 16. 2026-10-13 会话行交互对齐 ZCode 第一批（1.5.0；行为清单与完整审计另见 docs/ZCODE-INTERACTION-PARITY.md）

### 16.1 本轮对齐了什么（对应审计表 #1-#5）

- **行键盘可达**：会话行 `tabIndex=0` + `Enter`/空格打开（`event.target === event.currentTarget` 守卫），三棵树经共享 `SessionRow` 统一；
- **聚焦与悬停同权**：`:focus-within` 露出快捷操作并让元信息（时间/未读/待处理）让位；
- **归档两步确认**（共享 `archive-confirm.ts`）：首击进确认态（错误色「确认」按钮常驻）、`Escape` 取消、条目外 `pointerdown` 取消、鼠标离开不取消、二次点击执行。条目边界用 `data-dcu-session` 祖先判断，不按 DOM 深度；
- **行操作按钮 mousedown `preventDefault`**（不抢焦、不触发行选择，ZCode `TaskRowActionButton` 同款）；
- **菜单顺序**：重命名 → 归档 → 标记未读（对齐 ZCode `TaskActionMenuContent` 的行操作次序）。

### 16.2 有意偏差登记（不是缺失，是有理由的不迁移）

| 项 | ZCode | 本仓 | 理由 |
| --- | --- | --- | --- |
| 会话置顶 | 行首 Pin，hover 变取消置顶按钮 | 无此能力 | DSH 无会话置顶模型；`tests/session-tree.assert.ts` 有禁止断言（此前明确决策） |
| 菜单图标 | 任务菜单纯文本行 | 带图标菜单 | 本仓既定视觉语言 + 既有断言锁死；操作集合与分组已对齐 |
| 标题溢出 | mask 渐隐 | 省略号 | 跑马灯移除后的既定决策（断言锁死） |
| 未读点位置 | 行首状态槽（错误>未读>运行中 单一槽） | 运行中在左、未读在右 | 合并槽位牵动行布局与多条断言，列入下一批（parity 文档 §4） |

### 16.3 验证

- 新集成测试 `tests/session-row-interaction.spec.ts` 三用例（确认流 / 取消边界 / 键盘语义）；频道归档测试升级为两步；断言新增 13 条。
- 全量门禁：类型 0 错 / vitest 312 过（47 文件）/ 构建通过 / 断言 35 过 0 败 / 布局 14 脚本全过。
