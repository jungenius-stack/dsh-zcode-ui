# 夜跑批次 3 · ::selection 选中样式（2026-11-02 凌晨，夜班子代理）

> 判定表结论：**➖ 登记，不落码**。19 号计划的预判「ZCode `::selection{color:#0000}`（文字透明！必有配套 background）」**归因错误**——该规则属于 xterm 终端无障碍树，与正文区无关。

## 真值（三源）

- **ZCode 编译产物**：全文唯一 selection 规则 = `.xterm .xterm-accessibility-tree:not(.debug) ::selection{color:#0000}`。这是 xterm 屏幕阅读器辅助影子层的选中隐藏（辅助层本身不可见），**不是正文 selection 样式**；无任何配套 background。
- **ZCode 正文（9224）**：无自定义 selection 规则命中正文容器 → 正文选中 = 浏览器/系统默认。
- **DSH（9223）**：活体扫全部 stylesheet（cssRules 全量遍历）::selection 命中 **0 条** → 同为浏览器默认。

## 判定

- 两边正文 selection 都走浏览器默认 → **双默认一致，无需处理**。
- 19 号计划「::selection 是全局面，属正文可交互语义」的前提（ZCode 有自定义 selection）不成立。
- 「文字透明必有配套 background」的推断证伪：color:#0000 的目的是让辅助层选中态不可见，不需要 background。

## 落码清单

无。

## 遗留

无。若未来 ZCode 正文出现自定义 selection（如换主题引擎），重采对齐。
