# 参与开发 / 本地验证

本文件只讲**怎么把仓库跑起来并验证**。已知问题、环境遗留与设计变更登记都在
[`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md)——动手前值得先扫一眼那一份。

## 环境要求

- **Node 22.22.x**（`package.json` 的 `engines` 是 `^22.19.0 || >=24.0.0`，但见下条）。
  - ⚠️ **不要把 DSH 自带的 Node 24 放到 PATH 前面**：它在 macOS 上加载不了 rolldown 的原生绑定
    （`code signature ... different Team IDs`），会让 `vitest` / `tsdown` 直接失败。
    本机可用 `~/.workbuddy/binaries/node/versions/22.22.2-6/bin`。
- **Playwright 自带的 Chromium**（18 个真机布局脚本要用，一次性安装）：
  ```bash
  ./node_modules/.bin/playwright install chromium
  ```
- `pnpm` 在本机不可直接用（版本与 Node 不匹配），脚本一律走 `npm run` / `node`。

## 四层验证

| 层级 | 命令 | 说明 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | `tsc --noEmit`，覆盖 `src` 与 `tests` |
| 单元/集成 | `npm run test:unit`（或 `node node_modules/vitest/vitest.mjs run`） | 57 文件（用例数见 [`docs/BASELINE.md`](docs/BASELINE.md)） |
| 断言套件 | `node tests/run-assertions.mjs` | 源码级契约断言，45 个脚本（通过 / 跳过见 [`docs/BASELINE.md`](docs/BASELINE.md)；含 `design-system.assert.ts`：字号刻度、动效意图、外来内容契约） |
| 真机布局 | `npm run test:layout` | 18 个 Chromium 脚本，量真实几何与交互（含可读性与溢出：对比度 ≥4.5:1、标签不得截断、折叠轨不得横向溢出） |
| **快速门禁（推荐）** | `npm run gate` | 上面四层串成一条；耗时见 [`docs/BASELINE.md`](docs/BASELINE.md) 实跑快照（分钟级，不是几十秒） |

`npm run gate` 的已知红项集中在 `scripts/gate.mjs` 的三张登记表里（当前**全空**）；
某项转绿时门禁会提示把它从表里移除，别让登记表腐烂。

## 重型档：真实宿主兼容验证

改了宿主交互（插槽、注入、CLI/安装流程）时跑：

```bash
npm run gate:host
```

它会自动打包插件 → 装进一个隔离 `DSH_HOME` → 起真实的 `dsh web` → 跑三个活宿主脚本
（`verify-compat-host` / `verify-settings-exit` / `verify-session-features-host`），约 1～2 分钟。
CLI 默认取 DSH 桌面版 App 内的那份，可用 `DCU_DSH_BIN` 覆盖；版本不写死，直接读 `dsh --version`。

## 提交

- pre-push 钩子会在推送前跑快速门禁（每个克隆启用一次）：
  ```bash
  git config core.hooksPath .githooks
  ```
  临时跳过用 `git push --no-verify`。
- **断言文件第一条不匹配就会抛错**，直接跑只看得到一条失败。要一次看全部：
  ```bash
  node scripts/collect-assert-mismatches.mjs tests/<name>.assert.ts
  ```

## 改断言时的两条约定

1. **不要把「代码现在怎样」直接写成契约**：先与 `docs/ZCODE-DESIGN.md` 对照，
   该值确实是设计意图才写进断言。
2. **设计变更要登记**：与设计文档矛盾、或本 fork 有意改掉的（例如导航层级、毛玻璃降级、
   任务频道页签形态、文件夹图标语义），登记到 `docs/KNOWN-ISSUES.md` §3.1，而不是伪装成"必须如此"。

## 版本号规则

本仓库遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)，按**插件对外的可见契约**
判定段位，而不是按改动行数：

| 段位 | 何时 +1 | 本插件的判定依据 |
| --- | --- | --- |
| **MAJOR** | 破坏性变更 | 安装 id、包名、插槽名、内部 REST 命名空间（`/api/dsh-codex-ui/*`）发生改变；或移除已被消费的 `--dcu-*` / `--dsw-*` 令牌 |
| **MINOR** | 向后兼容地新增 | 新增令牌、新增断言、新增门禁、新增可见的界面元素或交互 |
| **PATCH** | 向后兼容地修复 | 只改数值、文案或样式，不新增也不移除任何能力 |

**两个容易判错的边界**：

- **纯视觉调整（改色值、字重、动效时长）算 PATCH**——能力没变，只是取值变了。
- **新增一档令牌算 MINOR**——即使当前只有本插件在消费它，下游也可能已经写进自己的样式。

发布时同步三处：`package.json` 的 `version`、`CHANGELOG.md` 与 `CHANGELOG.zh-CN.md`
的版本标题，以及 `git tag -a v<version>`。三处不一致会让使用者无法判断自己装的是哪一版。
