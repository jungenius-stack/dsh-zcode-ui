# 夜跑批次 1 · 代码卡头部条（2026-11-02 凌晨，主会话完成，子代理跳过本批）

> 判定表结论：**ZCode 活体见头部条 ⇒ TA3 过期**（命中）。上游在 10-28 后改版码卡：加头部条 + 加圆角。

## 真值（三源）

- 源码 v3.17.1 `code-block.tsx`：CodeBlockHeader = `flex items-center justify-between gap-3 px-3 py-2 text-ui-base text-muted-foreground`；左 Title（FileDisplayIcon 16px + Filename `font-mono truncate lowercase`）；右 Actions（`-my-1 -mr-1 gap-1` + WrapButton（mermaid 时换预览钮）/ CopyButton）；Container = `rounded-xl bg-background overflow-hidden`。
- 9224 活体：radius 12px / bg #2b2b2b / header h41 pad 8/8/8/12 / fs 14px / 复制钮 28×28（aria=复制代码）/ filename mono 14px lowercase；本卡只见复制钮（wrap 钮条件渲染）。
- DSH 现状（9223）：_bannerWrap h58 pad 8/8/8/12、_header h42 **fs 11px** color 60%、语言标签文本「代码块」、动作钮=自动换行+复制。

## 已落码（commit 7387ce3，gate exit 0）

1. `.md-code-block` 圆角 0 → `var(--dsw-radius-xl)`（上游 rounded-xl + 活体 12px，双源）
2. `[class*="_header_"]` 字号 11px → `var(--dsw-font-size-base,14px)`（ZCode text-ui-base）
3. `_header` 锚登记 UNCHECKED_HOST_ANCHORS；RADIUS_LITERAL_BASELINE 0 额度 2→1

## 遗留给批次 8 前复核（主会话单样本歧义，未落码）

- **头部文字色**：ZCode 活体实测=全前景 oklch(0.87 0 0)，但类名 text-muted-foreground 在编译产物 styles-NK68EN_n.css **0 定义**（疑死类）。若多卡采样同值 ⇒ DSH 60% 应提亮到全前景；复核方法：9224 采 ≥3 个代码卡 header color + grep 其他 CSS chunk。
- **语言标签 mono 化**：ZCode filename=mono lowercase；DSH `_language_` 需采字体/变换现状，差集落码（text-transform:lowercase + mono 族走既有令牌）。
- **WrapButton 条件**：ZCode showWrapButton 默认 true 但本卡未渲染（mermaid/设置分支）；DSH 有「自动换行」钮——行为面两边各自成立，仅对齐钮几何（28×28）如活体差显著。
