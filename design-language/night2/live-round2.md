# needs-live 第二轮实测（2026-11-03 上午，9223/9224 双端只读）

方法：HTTP `/json/list` 取 WS 地址 → `ws` 直连 → 仅 `Runtime.evaluate` 读值。
**不触发任何 UI 交互**（不合成右键/悬停/滚动），只读当前已渲染的 DOM。
数据落盘：`live-readonly.json`；脚本：`live-readonly.mjs`（可复跑）。

## 一、本轮新收口（可直接落码）

| 条 | 实测 | 判定 |
|---|---|---|
| **s8#12 busy 钮禁用态** | ZCode 9224 实测「停止运行」禁用钮：`cursor: default` / `opacity: 0.5` / `pointer-events: none` | **收口**：ZCode 走 `disabled:pointer-events-none disabled:opacity-50` 这一案（四案之外的第五种组合）。插件 `.dcu-about-install:disabled` 由 `cursor:wait;opacity:.6` → `cursor:default;opacity:.5;pointer-events:none`，已落 |
| **s10N4 行内码 margin** | DSH 9223 实测 `:not(pre) > code`：`margin-left: 2px` / `margin-right: 2px` / `padding: 2px 6px` / `radius: 6px` / `bg: rgba(230,230,230,.5)` | **销案（本就一致）**：ZCode 侧是 `mx-0.5` = 0.125rem = **2px**，我们已是 2px |
| **s2#9 / s7#8 宿主圆角令牌** | DSH 运行时 `--dsw-radius-xl = 12px`、`--dsw-radius-md = 6px` | **收口**：与第一轮 9223 读值一致，两个令牌解析值确认 |

## 二、本轮拿到的旁证（不足以单独收口，但缩小了范围）

- **s6 滚动条 `thin`**：ZCode 当前视图的 5 个可滚动容器里，`scrollbar-width` 只有 `auto`（4 个）与 `none`（`!scrollbar-hide`，1 个），**没有一例 `thin`**；gutter 为 `auto` 或 `stable both-edges`。
  插件在工具菜单 listbox 与菜单 viewport 上用了 `thin` → 属**我们自加**，ZCode 无对应。改不改属观感取舍，未动。
- **DSH 侧栏树**：`.dcu-wb-tree` 为 `scrollbar-width:none`（隐藏）——与 ZCode `!scrollbar-hide` 同类写法，方向一致。
- **DSH 令牌解析**：`--dcu-sidebar-background = #f0f0f0`（昨晚改动已在运行时生效）、`--dcu-tip-bg = #f0f0f0`、`--dcu-dialog-bg = #fff`、`--dcu-state-error-fill = #e03131`、`--dcu-state-success-text = #176c31`。
  注：`--dcu-sidebar-tertiary` / `--dcu-sidebar-secondary` 在 `documentElement` 上读为空——它们定义在 `.dcu-root` 作用域，探针选择器取不到，**不是缺陷**，改取 `.dcu-root` 可读到。

## 三、仍然必须"看一眼"才能定的（自动化做不了）

1. **s3NL②** `bg-popover/98` 的 2% 透明差是否可感知 — 需并排目检
2. **s4NL②** 浅色错误盒底 12% vs 10.2% 并排可感知差 — 需并排目检
3. **s5N2** 搜索空态在 DSH 浮层里的双主题观感
4. **s6①②③** gutter 合成错位 / 32px 最小尺寸在矮容器 / 自动隐藏状态机（需先落地再录屏）
5. **s11N4** 设置页标签 14px 手感、hover=active 同底观感
6. **s13C4** 浅色主题逐项目检
7. **s12N3 / s9N2 / s9N3** 药丸与未读点在 DSH 侧栏底的取色 + AA 观感（当前界面无未读/无药丸，采不到）

## 四、需要"先触发交互"才能采的（本轮未采：会被打断用户当前操作）

- s1#12 菜单行高、s1#13 开合时序、s1#14 右键落点、s1#15 子菜单定位 —— 需真的弹出右键菜单
- s13C-3 ⌘K 面板内层 padding —— 需真的打开搜索面板
- s9N1 胶囊计数是否带数字 —— 需有未读会话
- s11N1/N2 开关与下拉的 checked/focus 态 —— 需进设置页并聚焦

**为什么没采**：合成右键/点击会真的在用户桌面上弹出菜单、抢占焦点。该采集脚本已写好并保留
（`live-interactive.mjs`，可复跑），但执行时用户正在使用电脑，为不打断操作而中止。
下次在用户空闲时运行即可一次采完这 7 条。

## 五、附：本轮顺带修掉的一个真回归

夜间落地的 `面6M7` 把 `.dcu-settings-main` 从 `scrollbar-width:thin` 改成 `scrollbar-gutter:stable`。
gutter 会**永久预留 15px 滚动条槽**，导致 `.dcu-settings-inner` 恒比主栏窄 15px（1345 vs 1360），
与既有契约「模型 Pro 设置页必须随主栏伸展」（`scripts/verify-settings-geometry.mjs:35`）冲突。
已回退为 `thin` + `scrollbar-color`，该检查恢复通过，全量门禁 exit 0。
