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

## 3. 存量失败断言（4 个，非本 fork 新引入）

这 4 个断言的目标与 ZCode 改造无关，是**上游 Codex 样式在任务 A 改版时未同步**造成的漂移。
已交叉核对：4 个文件均**不引用** `zcode-theme.ts`、`zcode-tokens.ts`、`conversation-header.ts`
这三个 ZCode 改造核心文件，因此与皮肤改造零交集。

| 失败文件 | 断言要求 | 为何与现状冲突 |
| --- | --- | --- |
| `tests/session-tree.assert.ts` | 项目和会话胶囊使用 **Codex 风格的 10px 圆角** | 本插件的设计目标就是把圆角改为 **ZCode 的 8px**，两者直接对立，**永远不可能同时满足** |
| `tests/conversation-visuals.assert.ts` | 折叠窄轨必须填满宿主 56px 列 | 折叠轨几何已按 ZCode `WorkspaceSidebarCollapsedRail` 重写 |
| `tests/settings-integration.assert.ts` | 专家菜单必须与设置中的专家图标一致 | 图标已换成 Lucide 语言，与宿主图标不再同源 |
| `tests/dependency-manager.assert.ts` | Desktop profile 中已声明且存在的 **Codex UI** 必须显示已安装 | 包已更名为 `dsh-zcode-ui`，断言仍在找上游包名 |

**建议**：这 4 项需要逐个决定是「更新断言以匹配 ZCode 设计」还是「接受差异并归档」。
在决定之前，它们会持续报红——**这意味着本项目的自检对这几块区域已失去警报能力**，
相关改动不能只依赖这套断言把关。

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
