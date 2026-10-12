# 更新日志

[English](CHANGELOG.md)

**dsh-zcode-ui** 的发布日志。本包 fork 自 [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34，上游在该版本之前的完整历史见 [docs/UPSTREAM-CHANGELOG.zh-CN.md](docs/UPSTREAM-CHANGELOG.zh-CN.md)。

## 未发布

### 新增

- `scripts/verify-a11y-and-overflow.mjs` —— 把可读性与溢出变成自动判据：对比度（WCAG 2.1 AA，明暗两套）、建议卡标签是否被截断、折叠轨是否横向溢出。已接入 `gate` 与 `test:layout`，真机脚本由 11 个增至 12 个。

### 变更

- **侧栏文字色阶按侧栏底色重新取值。** ZCode 的 `foreground-subtle` / `foreground-subtlest` 是叠在**白底**上推导的，落到侧栏 `#f0f0f0` 上实测只有 3.93:1 与 2.32:1。现：亮色 secondary `#777777` → `#5c5c5c`（5.87:1）、tertiary `#9f9f9f` → `#686868`（4.89:1）；暗色 tertiary `#4f4f4f` → `#828282`（4.82:1）。
- 选中态底色改为中性（`#efefef` / `#3a3a3a`），不再用 ZCode 的蓝色 accent，与侧栏自身的选中语言一致。
- 新建会话页的建议卡标签改为两行显示，不再在 1440px 下被切断在半词处。
- 第三方计费卡收敛到侧栏字号并去掉白底卡片；折叠轨里直接隐藏——此前它的文字被裁成碎片。
- 折叠轨图标补 `title` 提示。
- 设置页次要文字 `#737373` → `#6b6b6b`。
- 所有图标统一从 `src/client/zcode-icons.tsx` 取；除它之外没有任何模块直引 `lucide-react`。
- 日志前缀统一为 `[dsh-zcode-ui]`。

### 修复

- 未净化的截图已从**整个 git 历史**中清除。它们此前只是从工作区删除，仍可按提交号下载——包括文档里引用过的那些提交号，现已改为按说明引用。

### 移除

- `debug/` 整目录、上游营销 banner、一张无引用截图（同样已从历史清除）。

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34：继承其侧栏 / 工作区会话树 / 设置页骨架与数据层（SlotRegistry + ctx，零改动），在其上叠加 ZCode 视觉语言：

- Zai Light / Zai Dark 双色板全量写入 `--dsw-*`（画布 `#f8f8f8` / `#161616`，色值逐像素对照 zai-org/ZCode v3.15.1 核验）。
- ZCode 侧栏几何：8px 圆角、32px 行高、150ms ease-out 过渡、Lucide 图标。
- 主题以宿主 `data-ds-dark-theme` 属性为唯一真源（不读 `prefers-color-scheme`，修复宿主浅色 + 系统深色时侧栏与内容区明暗撕裂）。
- `src/` 中消费的每个 `--dsw-*` 令牌都在映射表内有定义，由 `token-coverage` 断言强制保障。
- 会话标题独立子插件（LLM 生成，可单独启停）。
