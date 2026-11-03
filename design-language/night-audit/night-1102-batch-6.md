# 夜跑批次 6（条件）· task-list checkbox（2026-11-02 凌晨，夜班子代理）

> 判定表结论：**➖ 双边都无此面/无样本，登记收批**。

## 真值（三源）

- **ZCode 活体（9224）**：`[data-streamdown] input[type=checkbox]` = 0；`.contains-task-list`/`li.task-list-item` = 0（list-item ×22 全是普通列表）。
- **ZCode 源码**（message.tsx v3.17.1）：传给 Streamdown 的插件集 `{ cjk, code, math, mermaid }` 无 task-list 相关；`taskList` 0 命中。
- **DSH（9223）**：正文 checkbox/task-list 全 0。styles.css 的 `task-list-divider` 命中是某 UI 组件类名（任务列表分隔线），与 markdown task-list 无关，勿混。

## 判定

- ZCode streamdown 集成**不支持** markdown task-list 渲染（GFM task 扩展未启用）→ 即使会话内容里有 `- [ ]` 语法也不会出现 checkbox。
- DSH 同无样本。双边无面 → 无对齐动作。

## 落码清单

无。

## 遗留

无。若上游启用 GFM task-list（streamdown 升级或插件集变更），重开此格。
