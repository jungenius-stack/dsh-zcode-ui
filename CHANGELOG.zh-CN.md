# 更新日志

[English](CHANGELOG.md)

**dsh-zcode-ui** 的发布日志。本包 fork 自 [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34，上游在该版本之前的完整历史见 [docs/UPSTREAM-CHANGELOG.zh-CN.md](docs/UPSTREAM-CHANGELOG.zh-CN.md)。

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34：继承其侧栏 / 工作区会话树 / 设置页骨架与数据层（SlotRegistry + ctx，零改动），在其上叠加 ZCode 视觉语言：

- Zai Light / Zai Dark 双色板全量写入 `--dsw-*`（画布 `#f8f8f8` / `#161616`，色值逐像素对照 zai-org/ZCode v3.15.1 核验）。
- ZCode 侧栏几何：8px 圆角、32px 行高、150ms ease-out 过渡、Lucide 图标。
- 主题以宿主 `data-ds-dark-theme` 属性为唯一真源（不读 `prefers-color-scheme`，修复宿主浅色 + 系统深色时侧栏与内容区明暗撕裂）。
- `src/` 中消费的每个 `--dsw-*` 令牌都在映射表内有定义，由 `token-coverage` 断言强制保障。
- 会话标题独立子插件（LLM 生成，可单独启停）。
