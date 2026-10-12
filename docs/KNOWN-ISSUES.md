# 已知问题与发布前检查清单

本文件记录 dsh-zcode-ui 当前**未解决**的测试失败、有意跳过的断言，以及发布前必须处理的事项。

维护原则：**宁可显式记录，不要静默留白**。任何「跑不绿但暂时不动」的测试都必须在此登记原因，
避免后续维护者把已知的存量漂移误当成新引入的回归。

最后更新：2026-10-12（19:00 复核：31 通过 / 3 跳过 / 3 失败）

---

## 1. 断言套件现状

运行 `node tests/run-assertions.mjs` 的基线结果：

```
31 通过 / 3 跳过 / 3 失败（共 37 个脚本）
  已跳过：codex-suite-installer.assert.mjs、codex-suite.assert.ts、release-pipeline.assert.mjs
  已失败：conversation-visuals.assert.ts、dependency-manager.assert.ts、settings-integration.assert.ts
```

套件已改为**跑完全部再汇总**（原实现遇到第一个失败即退出），一次即可看清全部问题。

> 基线会随工作树变化：`ecf64ef`（18:48）把 `session-tree.assert.ts` 的悬停卡片断言改为
> 「不得再渲染项目行与时长行」后，该脚本由红转绿，失败数从 4 降为 3。

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
| `conversation-visuals.assert.ts` | 23 | 配色/文字层级**迁移到主题层**（`zcode-theme.ts`，断言改为读该真值源）；几何与动效常量随 ZCode 刻度更新（头部 34→40px、内衬 28→32px、间距 8→4px、动效统一 180ms ease-out、圆角 10→8px、行高 30→32px、刻度 left −16→−12px、图标列 20→16px）；窄轨设置入口改为宿主 `wide:false` 渲染；展开按钮改用 `ZIconCollapse` |
| `settings-integration.assert.ts` | 11 | 图标体系整体换 Lucide（文件夹/新建会话/定时/IM/继续分支）；字号改为七档令牌；包名/注册 id 改为 `dsh-zcode-ui` / `zcode-ui-for-dsh`；导航内衬改为 px-2(8px) |

**结论：34 通过 / 3 跳过 / 0 失败**（`node tests/run-assertions.mjs`）；`scripts/gate.mjs` 的
`KNOWN_RED_ASSERT` 已清空，此后任何断言失败都会拦住提交。

### 3.1 设计变更登记（不写成"必须如此"的断言，避免把变更伪装成契约）

重定基过程中发现以下几条**不是数值过期，而是 ZCode 有意改掉的设计决定**。它们没有按现状写成硬断言，
而是登记在此，供将来判断"是回归还是延续设计"：

| 位置 | 原 Codex 设计 | 现行 ZCode 设计 | 影响 |
| --- | --- | --- | --- |
| 侧栏导航层级 | 导航文字（`--dcu-sidebar-navigation`）比项目标题更淡，是独立层级 | ZCODE-DESIGN §2 只有 primary/secondary/tertiary/icon 四档，无"导航档"；`--dcu-sidebar-navigation` 与 primary 同值，主菜单直接用 primary | 导航与标题不再有深浅差 |
| 毛玻璃降级 | `@supports not (backdrop-filter)` 时恢复**实底**保证可读 | 玻璃层本身半透明，另由 `body[data-we-appwindow]` 关闭模糊；可读性依赖宿主背景 + 主题文字色 | 不支持毛玻璃时不再有独立实底兜底 |
| 任务频道/定时页签 | 整行切换器（`border-bottom` 分隔），字号与主导航同级(14px)，选中加粗(600) | ZCode **分段控件**：`--dcu-surface` 底 + 1px 边框 + 8px 圆角，字号 12px(sm)，选中用底色而非字重 | 页签形态与层级语义都变了 |
| 项目文件夹图标 | 区分「当前展开」（官方实心）/「其他展开」（线框）/「收起」（闭合） | 只区分展开（`ZIconFolderOpen`）/收起（`ZIconFolder`） | 当前项不再有独立图标样式 |

**`session-tree.assert.ts` 的两轮红灯都已转绿**：第一轮因「要求 Codex 的 10px 圆角 / 30px 高度 /
弹簧缓动」与 ZCode 改造冲突，已按设计意图更新断言（10px→8px、30px→32px 行高、弹簧→ease-out）；
第二轮因悬停卡片去掉项目行与时长行（见 3b 第 2 条）而报红，已在 `ecf64ef` 同步更新断言——
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
| 2 | hover 提示卡又大又重、信息重复 | **本插件** | ⚠️ 源码已改并于 `ecf64ef` 提交，但**未重建 `lib/`**，实机仍是旧卡（见 3d） | 待重建后补图（19:00 实拍仍是「标题 + 20小时 + 测试1」） |
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
| #2 悬停卡去项目行/时长 | ✅ `ecf64ef`(18:48) | ❌ **不含**（产物里仍有 `dcu-wb-tip-time`） | ❌ 仍是「标题 + 20小时 + 测试1」 |

原因：`src/client/session-tree.tsx` 的改动写在 **18:43 那次构建之后**，而 18:48 的提交只提交了源码、
没有重新构建。**下次构建后即可生效**，届时可补一张悬停卡片截图作为 3b #2 的证据。

---

## 4. 发布前必做

- [x] **填写真实 GitHub 用户名** —— 已完成：`repository` / `bugs` / `homepage` 均指向
      `github.com/jungenius-stack/dsh-zcode-ui`。该账号已通过 `api.github.com/users/jungenius-stack`
      核实存在（id 322767483）。
      历史备注：早期版本曾填 `BatchTTS`，但该账号在 GitHub 上**不存在**（API 返回 404），
      它只是本机 git 的 local 身份（`BatchTTS <agent@local>`，邮箱为占位），不可用作发布账号。
- [ ] **核对 npm 包名是否可用**：`dsh-zcode-ui` 为裸包名，发布前确认未被占用。
- [ ] **确认 `publishConfig`**：当前为 `access: public` + 官方 registry，若改为私有需调整。
- [ ] **决定是否处理第 3 节的 3 个失败**（均为上游样式漂移；发布前套件为红会误导使用者）。

---

## 5. 环境与依赖遗留

- **`node_modules` 处于手工修补状态**：早期为绕过 `tsdown` 缺 `unrun` 的问题，
  手工向 `node_modules` 塞入了 `unrun`、`synckit`、`@pkgr/core`，并为 `rolldown` 建了符号链接。
  **下一次正规 `pnpm install` 会覆盖这些修补**，届时需确认 `unrun` 能被正常解析。
- **`packageManager` 与实际环境不一致**：`package.json` 声明 `pnpm@11.28.5`，
  该版本要求 Node >= 22.13；而 ZCode 内置 Node 为 22.12，无法直接运行它。
  本机可用 `/Users/m1/.workbuddy-ai/binaries/node/versions/22.22.2-6/bin/node`（已验证可用）。
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
装上浏览器后的首测基线是 **6 通过 / 5 失败**；逐条核查并修复后的现状是 **11 通过 / 0 失败**（`KNOWN_RED_LAYOUT` 已清空）。

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
