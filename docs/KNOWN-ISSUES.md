# 已知问题与发布前检查清单

本文件记录 dsh-zcode-ui 当前**未解决**的测试失败、有意跳过的断言，以及发布前必须处理的事项。

维护原则：**宁可显式记录，不要静默留白**。任何「跑不绿但暂时不动」的测试都必须在此登记原因，
避免后续维护者把已知的存量漂移误当成新引入的回归。

最后更新：2026-10-12

---

## 1. 断言套件现状

运行 `node tests/run-assertions.mjs` 的基线结果：

```
30 通过 / 3 跳过 / 4 失败（共 37 个脚本）
```

套件已改为**跑完全部再汇总**（原实现遇到第一个失败即退出），一次即可看清全部问题。

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

## 3. 存量失败断言（3 个，非本 fork 新引入）

这 3 个断言的目标与 ZCode 改造无关，是**上游 Codex 样式在任务 A 改版时未同步**造成的漂移。

| 失败文件 | 断言要求 | 为何与现状冲突 |
| --- | --- | --- |
| `tests/conversation-visuals.assert.ts` | 折叠窄轨必须填满宿主 56px 列 | 折叠轨几何已按 ZCode `WorkspaceSidebarCollapsedRail` 重写 |
| `tests/settings-integration.assert.ts` | 专家菜单必须与设置中的专家图标一致 | 图标已换成 Lucide 语言，与宿主图标不再同源 |
| `tests/dependency-manager.assert.ts` | Desktop profile 中已声明且存在的 **Codex UI** 必须显示已安装 | 包已更名为 `dsh-zcode-ui`，断言仍在找上游包名 |

**已解决**：`session-tree.assert.ts` 原先因「要求 Codex 的 10px 圆角 / 30px 高度 / 弹簧缓动」
与 ZCode 改造冲突而报红，现已按设计意图更新断言（10px→8px、30px→32px 行高、弹簧→ease-out），
由红转绿。

---

## 3b. 界面问题归属（DSH 内实测反馈的 7 条）

以下来自 2026-10-12 DSH 会话里 agent 用真实浏览器的实测反馈，按「本插件是否可改」分类。

| # | 问题 | 归属 | 处理 |
| --- | --- | --- | --- |
| 1 | 会话标题跑马灯把标题两端同时裁掉 | **本插件** | ✅ 已修：移除跑马灯，改为纯 ellipsis |
| 2 | hover 提示卡又大又重、信息重复 | **本插件** | ✅ 已修：只留完整标题 + 分支，去掉重复的时长与项目名 |
| 3 | 费用信息出现 3 处（顶栏 chip / 底部状态栏 / 侧栏左下卡片） | **`dsh-cost-meter` + `dsh-context-pilot`** | ⛔ 不属本插件，见下方说明 |
| 4 | 底部状态栏过挤、对比度低、末尾孤立 `5%` 语义不明 | **`dsh-context-pilot`** | ⛔ 不属本插件 |
| 5 | 侧栏左下卡片与「记忆/任务/归档/设置」无分隔 | **本插件**（槽位在侧栏组件内） | ✅ 已修：加视觉分隔 |
| 6 | 顶栏右侧彩色方块按钮风格突兀 | 宿主官方 `header.actions` 或其他插件 | ⛔ 已查证不属本插件 |
| 7 | 空状态四张卡偏高、内部留白约 50px、窄窗断行 | **本插件**（`NewConversationSuggestions.tsx`） | ✅ 已修 |

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

### 关于 #6：已查证，不属本插件

DSH 侧截图显示顶栏右侧有一个彩色方块按钮，原判断「像是插件自带的未适配样式」。现已 grep 确证：

- 本插件**不注入 `header.actions`**（`src/client/conversation-header.ts` 的注释还专门说明
  「官方 header.actions（标准模式 / Agent Team）」，即该插槽属宿主官方）。
- 已注入 `header.actions` 的是 `dsh-cost-meter`；`dsh-mcp-connector` 注入的是 `header.split`。

因此该方块来自宿主官方或其他插件，本插件无法接管其样式。

---

## 4. 发布前必做

- [x] **填写真实 GitHub 用户名** —— 已完成：`repository` / `bugs` / `homepage` 均指向
      `github.com/jungenius-stack/dsh-zcode-ui`。该账号已通过 `api.github.com/users/jungenius-stack`
      核实存在（id 322767483）。
      历史备注：早期版本曾填 `BatchTTS`，但该账号在 GitHub 上**不存在**（API 返回 404），
      它只是本机 git 的 local 身份（`BatchTTS <agent@local>`，邮箱为占位），不可用作发布账号。
- [ ] **核对 npm 包名是否可用**：`dsh-zcode-ui` 为裸包名，发布前确认未被占用。
- [ ] **确认 `publishConfig`**：当前为 `access: public` + 官方 registry，若改为私有需调整。
- [ ] **决定是否处理第 3 节的 4 个存量失败**（发布前套件为红会误导使用者）。

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
