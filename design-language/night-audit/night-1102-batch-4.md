# 夜跑批次 4 · 链接 hover 态（2026-11-02 凌晨，夜班子代理）

> 判定表结论：**ZCode hover 真值双源锁定（静态）；DSH 正文 a 面无样本 → 按「出样本再动」惯例留 ❓，不落码**。附带定案：DSH 工具卡 fileLink 的常驻 dotted 下划线是宿主自有面，登记不动。

## 真值（三源）

- **ZCode 源码**（message.tsx:442-447 v3.17.1）：
  - `messageLinkClassName = "wrap-anywhere text-ui-base font-medium text-icon-blue no-underline decoration-dotted underline-offset-4 hover:underline"`
  - `messageFileLinkClassName = "inline-flex max-w-full items-baseline gap-1 align-baseline text-icon-blue text-ui-base no-underline decoration-dotted underline-offset-4 hover:underline"`
  - 源码注释：`decoration-dashed` 会把圆点下划线画成短线段，故保留 `dotted` 只改出现时机。
- **ZCode 编译产物**：`.hover\:underline:hover{text-decoration-line:underline}` / `.decoration-dotted{text-decoration-style:dotted}` / `.underline-offset-4{text-underline-offset:4px}` 全部在产物中 → 双源一致。
- **DSH（9223 活体 + 宿主 asar）**：
  - 正文 markdown 容器（`[class*=_markdown_]` ×31）内 `a` = **0 个**（无样本可 hover）。
  - 宿主 asar 静态：应用层 CSS 无全局 `a` reset（唯一 `a:hover` 命中是内嵌网页的遗留样式 `color:#ff2a00`，非 UI 层）→ 若正文出现 a，默认 Chromium 行为 = **常驻下划线、hover 无变化**。
  - 工具卡 `Q2dzhW_fileLink`：`text-decoration:underline 1px dotted`（**常驻**，offset 3px，无 :hover 变体）——宿主 css-module 自带。

## 判定

- ZCode 侧：链接 hover 行为 = 静态无下划线 + hover 才 dotted underline（offset 4px）——**真值已锁**（双源）。
- DSH 正文 a：无样本（铁律 2 先验对方 → 不落码）。届时若出样本：差集 = 去静态下划线 + 补 hover dotted underline；颜色仍不动（F6 拍板保留 DSH 品牌蓝）。
- fileLink 常驻 dotted：ZCode 对应物（messageFileLinkClassName）是 hover-only，存在反向差集；但该面是 DSH 宿主识别样式，深审历史口径把 fileLink 列为「不得误伤」对象 → **登记不动**。
- 活体 hover 模拟（Input.dispatchMouseEvent）：9224 当前会话 0 链接、9223 链接在视口外且禁滚动用户流式区 → **未执行，原因登记**。

## 落码清单

无（本批纯登记）。

## 遗留

- DSH 正文出现 a 样本时：9224 hover 活体 + 9223 对照 → 按上文差集落码。
- 反向守卫一只禁「加常驻下划线」，落「去下划线 + hover 恢复」不违反守卫（届时需同步扩断言）。
