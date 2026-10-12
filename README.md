<p align="center">
  <img src="assets/screenshots/conversation-light.png" alt="DSH ZCode UI — 亮色 / light" width="100%">
  <img src="assets/screenshots/conversation-dark.png" alt="DSH ZCode UI — 暗色 / dark" width="100%">
</p>

<div align="center">

# DSH ZCode UI

**ZCode 风格的 DeepSeek Harness Web 界面皮肤 · A ZCode-style visual skin for DSH Web**

[简体中文](README.zh-CN.md) · [Apache-2.0](LICENSE)

![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-111827.svg)
![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)
![ZCode Apache-2.0](https://img.shields.io/badge/design%20source-ZCode%20(Apache--2.0)-4d6bfe.svg)

</div>

> 社区维护的 DSH Web 界面插件，非 DeepSeek AI 官方产品。设计值取自 [zai-org/ZCode](https://github.com/zai-org/ZCode)（Apache-2.0）；交互脚手架派生自 [MichengAI/dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)（Apache-2.0）。

## 它是什么

把 DSH Web 的界面换成 ZCode（智谱 Zai）的视觉语言：

- **布局**：ZCode 侧栏几何——8px 圆角、32px 行高、px-2/py-3/gap-1 间距、150ms ease-out 过渡；
- **配色**：Zai Light / Zai Dark 双主题完整色板，写入 DSH 的 `--dsw-*` 令牌层（168 令牌 × 明暗两套），官方区域（标题栏、会话列、按钮、菜单、输入壳）随皮肤整体换色；
- **图标**：侧栏导航与操作使用 Lucide（与 ZCode 同款图标库），新建任务 `MessageCirclePlus`、定时 `CalendarClock` 等按 ZCode 选取；
- **明暗主题**：跟随 DSH 自身的明暗偏好（`body[data-ds-dark-theme]`），亮色画布 `#f8f8f8`、暗色 `#161616`，与 ZCode `--color-background` 逐像素一致。

数据面完全不动：**不使用** ZCode 的 Zustand / RPC / services，会话、工作区、设置等一切数据仍走 DSH 自己的 SlotRegistry 插槽（`@deepseek-ai/dsh-client-ui-renderer`）与 ctx 公共服务。

## 功能（继承自 dsh-codex-ui 脚手架）

- 置顶/分组/拖拽整理项目与会话，未读与运行中指示；
- 头部全局搜索：会话、设置、快捷操作；
- 会话重命名、归档、复制、删除、移动；
- 长会话轮次导航；
- 空输入框按上/下键召回本工作区历史输入。

## 安装

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add .
dsh --profile web --dump-config   # 确认出现 zcode-ui 条目
```

重启 DSH Web 并硬刷新浏览器（一般 `Ctrl+Shift+R`）即可看到皮肤。

## 本地调试（不安装）

```bash
# 1) 构建（必须先有 lib/）
pnpm install --frozen-lockfile
pnpm build

# 2) 以 --patch 方式启动，补丁层指向本仓库绝对路径
dsh --profile web --patch "$(pwd)/debug/cordis.debug.patch.yml" --port 17823 --no-open

# 3) 浏览器打开日志里带 token 的 URL，改 src 后重新 pnpm build 并重启即可热更新
```

## 验证

```bash
node debug/capture.mjs "http://127.0.0.1:<port>/?token=<token>" debug/shots
```

输出明暗两份截图与 `report.json`：`data-dsh-zcode-skin` 标记、关键令牌计算值（亮 `rgb(248,248,248)` / 暗 `rgb(22,22,22)`）、`.dcu-root` 侧栏存在、Lucide 图标数量、控制台错误列表。

## 结构

| 文件 | 职责 |
| --- | --- |
| `src/client/zcode-tokens.ts` | Zai 双主题 → DSH `--dsw-*` 令牌映射（配色提取层） |
| `src/client/zcode-skin.ts` | 令牌样式表注入（`:root:root` 优先级阶梯，详见文件内注释） |
| `src/client/zcode-theme.ts` | `--dcu-*` 插件层令牌 + 主题 class 同步 |
| `src/client/zcode-icons.tsx` | Lucide 图标选型（与 ZCode 一致） |
| `src/client/CodexSidebar.tsx` | 侧栏外壳、搜索面板、composer 样式（ZCode 几何） |
| `src/client/CodexWorkspaceBrowser.tsx` | 项目/会话树（rounded-lg、bg-selected） |
| `docs/ZCODE-DESIGN.md` | 从 ZCode 仓库提取的完整设计规范存档 |

## License

Apache-2.0，与上游脚手架及 ZCode 一致。
