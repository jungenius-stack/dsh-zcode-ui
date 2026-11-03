# 夜跑批次 2 · kbd 键帽（2026-11-02 凌晨，夜班子代理）

> 判定表结论：**➖ 登记，不落码**。DSH 正文无 kbd 面；ZCode 的 prose kbd 规格是**死规则**（18 号踩坑报告候选 1「baseline 层 ≠ 组件真值」的又一实锤）。

## 真值（三源）

- **ZCode 编译产物**（styles-NK68EN_n.css）：`.prose :where(kbd):not(:where([class~=not-prose] *)){color:var(--tw-prose-kbd);box-shadow:0 0 0 1px var(--tw-prose-kbd-shadows),0 3px 0 var(--tw-prose-kbd-shadows);padding:.1875em .375em;border-radius:.3125rem;font-family:inherit;font-size:.875em;font-weight:500}`；浅色 `--tw-prose-kbd:oklch(21% .034 264.665)`、shadows `oklab(21% …/.1)`；暗色 invert `--tw-prose-invert-kbd:#fff`、`shadows:#ffffff1a`。
- **ZCode 活体（9224）**：正文流 41 个 `[data-streamdown]` 元素，**0 个有 prose 祖先**；`kbd` 元素全文 0 个。
- **ZCode 源码（message.tsx v3.17.1）**：`prose` 0 处；无 kbd 组件映射 → 即使渲染 kbd 也走原生标签，而 `.prose :where(kbd)` 因正文无 `.prose` 类**永不生效**（`:where()` 零特异性 + 靶点不存在）。
- **DSH（9223）**：正文 kbd 0 样本；`dcu-menu-kbd` ×2 是菜单键帽非正文面（勿混）。

## 判定

- 19 号计划原文「ZCode 真值已有：prose kbd = box-shadow 双层…」**未带选择器上下文，属误引**——该规则挂在 `.prose` 下，而 ZCode 正文区从不挂 `.prose` 类（结构性证明，非样本歧义：41 个元素全查祖链）。
- ZCode 正文若出现 kbd 实际渲染 = preflight mono 字体 + 浏览器默认；DSH 同为默认 → **双默认一致，无需处理**。
- 按 18 号候选 1 纪律：不把 baseline 死规则当真值落码。

## 落码清单

无。矩阵 A 区 kbd 格 ➖ 登记（证据：本记录 + message.tsx 0 prose + 9224 祖链采样）。

## 遗留

无。若未来 ZCode 正文出现 kbd 样本且带 `.prose` 容器，重开此格。
