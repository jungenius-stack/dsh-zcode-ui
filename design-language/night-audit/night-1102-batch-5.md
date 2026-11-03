# 夜跑批次 5 · 小元素扫尾 del/sup/sub/mark（2026-11-02 凌晨，夜班子代理）

> 判定表结论：**➖ 双默认一致，登记收批**（与 19 号计划预期一致）。

## 真值（三源）

- **ZCode 源码**（message.tsx v3.17.1）：组件映射表无 del/sup/sub/mark/ins → 全部原生标签默认渲染。
- **ZCode 编译产物**：仅 Tailwind preflight 标准层 `sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}` + `sub{bottom:-.25em}` / `sup{top:-.5em}`（= CSS 规范建议值，无组件级覆盖）；del/mark 无任何规则。
- **双端活体**：9224 `[data-streamdown]` 内 del/sup/sub/mark 全 0；9223 `.icaHSq_column` 内全 0。

## 判定

- 双边渲染路径：markdown 源里出现 del/sup/sub/mark 时都走 preflight + 浏览器默认 → 观感一致。
- 无插件动作空间（插件若自行加样式反而制造差异）。

## 落码清单

无。

## 遗留

无。
