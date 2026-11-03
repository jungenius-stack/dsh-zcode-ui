# 夜跑批次 7（条件）· TC4/G4 落码（2026-11-02 凌晨，夜班子代理）

> 前置：DSH 静默窗确认（9223 探针 130s 两次快照 DOM 签名全等：colLen 299148 / flow 35 / rows 13 / scrollH 1758）。
> 判定表结论：**TC4 落 3 项 + G4 落 1 规则；三项显式不落（死类争议/密度域/用户偏好令牌）**。

## 锚点来源（本轮关键突破：静态取锚，无需活体展开）

17 号文档「锚点缺 → 活体后改码」的前提不再成立：DSH asar 里的 css-module 源码
（`MessageItem.module.css` = Q2dzhW 前缀、ReasoningRow.module = TXqvFW 前缀）直接给出
展开态全部类名与宿主样式——`Q2dzhW_ioCard`/`Q2dzhW_ioSection`/`Q2dzhW_ioText`、
`TXqvFW_body`/`TXqvFW_content`/`TXqvFW_expandedBody`。**避免了在用户会话区滚动+点击的写操作**。

## 真值（三源）

- **ZCode 源码**（v3.17.1）：`ToolCallBody.tsx:109` = `max-h-60 overflow-auto rounded-xl border border-border bg-muted/15 px-3 py-3`；`reasoning.tsx` 内容体 = `ml-2(8px 活体实测) border-l 1px border-border pl-3.5(14px)`。
- **ZCode 编译产物**：`.rounded-xl{border-radius:var(--radius-xl)}`（=12px，批次 1 活体已证）、`.max-h-60{240px}` 在产物；**`bg-muted/15` 0 命中且主题无 `--color-muted` 令牌 → 死类，实际渲染透明**。
- **DSH 宿主 asar**：`.Q2dzhW_ioCard{border:.5px border-l1; border-radius:var(--dsw-radius-lg)(8); background:--dsw-alias-markdown-code-block; font:--dsw-font-markdown-code-block-small}`、`.Q2dzhW_ioSection{grid; padding:12px 16px; max-height:150px}`、`.TXqvFW_body{max-height:min(400px,50vh); overflow-y:auto}`。

## 已落码（commit e6d2af2，gate exit 0）

1. `[class*="_ioCard"]`：radius 8→`var(--dsw-radius-xl)`、border-width .5px→1px、border-color l1→l2（=ZCode border-border 值链）
2. `[class*="_ioSection"]`：padding 12/16→12/12（px-3 py-3）
3. `[class*="TXqvFW_body"]`：ml 8px + border-left 1px l2 + padding-left 14px（折叠态 h=0 时 border 不显形，无需状态分支）
4. 锚点登记 ×3（`_ioCard`/`_ioSection`/`TXqvFW_body` → UNCHECKED_HOST_ANCHORS）；断言 5 条 + 死类底色反向守卫 1 条

## 显式不落（判定记录）

- **底色**：ZCode `bg-muted/15` 是死类（渲染透明）——照抄=替宿主制造缺陷；DSH 实底（码块令牌）保留，等上游补 `--color-muted` 后重裁。断言反向守卫防后人"补"上。
- **限高**：ioSection 150px vs ZCode 240/5lh——改截断改变整页密度，TC6 先例归用户决策域。
- **字号/行高**：DSH ioText 走 `--dsh-code-font-size` 用户偏好（11/16，比率 1.45≈ZCode 14/20 的 1.43），覆盖会破坏用户代码字号设置。

## 遗留

- 展开态活体目检（用户在场时）：9223 真点击展开一条 bash 工具卡确认圆角/边观感 + 思考块竖线形态。
- 上游若补 `--color-muted`：底色对齐重开（哨兵脚本会先报上游更新）。
