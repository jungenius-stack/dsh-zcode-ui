# 交互式实测结果（2026-11-03 09:22，用户空闲时执行）

数据：`live-interactive.json`；脚本：`live-interactive.mjs`（结构与首轮相同，复跑即得）。

## 一、ZCode 右键菜单（9224 实测，`aside li` 上派发 contextmenu）

| 项 | 实测 | 说明 |
|---|---|---|
| 锚点偏移 | 指针 (48,302) → 菜单 (50,292)：**dx=+2, dy=−10** | 菜单在指针**右 2px、上 10px** 处出现，不贴边 |
| 菜单壳 | `padding:4px` / `border-radius:8px` / `gap:2px` / 1px rgba(255,255,255,.1) 边框 / 深色 `#2b2b2b` | 与插件 `.dcu-search-dialog` 壳的 4px/8px/gap 2px 口径一致 |
| 进入动画 | `animation: enter **0.1s**`（transition 亦 0.1s） | ZCode 菜单用 **100ms**，比我们浮层档 150ms 快 50ms |
| 菜单项 | `padding:4px 8px` / `line-height:21px` / `font-size:14px` / 行高实得 **29–31px**（单行 29，带副文本 31） | **不是固定 32px**；内距是 4/8 而非 0/10 |
| 项数 | 14 项 | — |
| 子菜单 | 合成 pointerover/mouseover 均**未展开**（Radix 需要真实指针移动序列） | 未采到，需人工或真实 Input 事件 |

**关键判断：这个右键菜单是宿主组件**（`import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'`，
见 `src/client/session-tree.tsx:2`、`CodexWorkspaceBrowser.tsx:7`）。ZCode 的 4/8 内距与 100ms 动画
属于**宿主 primitives 的实现**，插件只能通过覆盖宿主 CSS 去改——那会波及所有用同一 Menu 的宿主界面，
**不建议动**。已登记为"宿主差异，非插件缺陷"。

## 二、⌘K 搜索面板（双端对照）

| 项 | ZCode (9224) | DSH 插件 (9223) | 差 |
|---|---|---|---|
| 尺寸 | 512×527 | 512×632 | 宽一致 ✅；高不同（内容量不同，非样式） |
| 壳 padding | **0px** | **12px** | ❗差 12px |
| 壳 gap | **16px** | normal | ❗ZCode 用 16px 行间距 |
| 圆角 | 16px | 16px | ✅ |
| 内层 | 单层 DIV，`padding:2px`，占满 525px | 直接是 input + sections | 结构不同 |
| 输入框 | 内层 input h=20，透明无边框（胶囊在外壳上） | 胶囊 h=32 / `0 10px` / 9999px / 白底 | 我们已是"外壳胶囊"写法 ✅ |
| 结果行 | —（未采到其结果行） | h=35 / `6px 10px` / 14px | 待 ZCode 结果行对照 |

**唯一确定的结构差异**：ZCode 的 ⌘K 壳 `padding:0 + gap:16`，插件是 `padding:12px`。
按 ZCode 改会让内容顶到边缘 12px→0（改用各 section 自己的内距承担），**观感变化明显**，
需人眼确认后再改。**本轮未动**。

## 三、没有采到的（如实记录）

- **子菜单定位**：合成 pointer 事件不足以触发 Radix 子菜单，需真实指针移动。
- **设置页开关 / 下拉 focus**：脚本用"设置入口按钮"定位失败（`d.switch: 找不到设置入口`）——
  DSH 的设置入口不是 `aria-label/textContent` 含"设置"的 button，选择器需重写。
- **DSH 侧搜索空态**：本次有结果，未出现空态元素。

## 四、本轮结论

1. 右键菜单的差异属**宿主 primitives**，不动。
2. ⌘K 壳 padding/gap 差异是**插件可控**的，但改动观感明显，等目检确认。
3. 其余 5 条交互项（子菜单、开关、下拉、搜索空态、DSH 设置入口）需补选择器/真实指针，未收口。

## 五、第二轮补充（09:5x）

### 5.1 子菜单定位：静态取证结论

asar 全文检索：`side:"right"` **0 处**、`alignOffset` **0 处**、`SubContent` 附近**无** `sideOffset` 参数
（`DropdownMenuSubContent` / `ContextMenuSubContent` 各 18 处引用，均未显式传定位参数）。
⇒ ZCode 子菜单走 **Radix 默认**：`side=right` / `align=start` / `sideOffset=0`，贴在触发项右缘。
插件侧 `Menu` 组件来自宿主 primitives（同为 Radix 封装，亦未传定位参数），**两者默认值相同** ⇒ 无需改动、销案。

### 5.2 DSH 搜索空态：实测到，且发现一处被改回去的文案

清空查询并输入乱码后触发空态：
- 元素 `.dcu-search-empty`：`text-align:center` / `padding:20px 16px` / 高 63px / 色为 tertiary（75% 前景）
- **文案实测「暂无相关结果」，而 ZCode 原文 `taskSearch.noResults` 是「没有找到相关任务」**
  ⇒ 说明 2.2.0 那次发布把 2.1.0 已对齐的 `search.empty` 覆盖回去了（其余 11 个术语键均仍在位）。
  已改回 ZCode 原文（中英同步），门禁 exit 0。

### 5.3 仍无法采到的两条

- **DSH 设置页开关 / 下拉 focus**：全 DOM 检索 `aria-label/title/data-testid` 含「设置」的元素为 **0**，
  `⌘,` 与 `⌘Settings` 合成键均不能打开设置页 ⇒ 该页由宿主原生菜单或宿主内部路由进入，
  插件 DOM 里没有可达入口。需人工打开设置页后再采。
- **ZCode 子菜单实际偏移**：已由 5.1 静态定案（Radix 默认），无需活体。

## 六、设置页实测（用户手动打开后，09:5x）

### 6.1 开关（`.dcu-settings-switch` / `[role=switch]`，页面里有 2 个）

| 属性 | 实测 |
|---|---|
| 尺寸 | 32×18 与 36×20 两种（宿主两代规格并存） |
| 轨道 | `background: rgb(0,0,0)`（纯黑 = `--color-brand`）、**`border-radius: 8px`**、无边框 |
| 拇指 | 16×16、白底、`translateX(14px/16px)` |

**判定：这两个是宿主自带的 switch**（轨底是纯黑而非我们 `color-mix(--dcu-primary 30%)`、圆角 8px 而非我们的
`999px`）⇒ 插件 `.dcu-settings-switch` 规则在此页未生效/未命中目标元素。
**结论：不据此改插件开关样式**（避免把宿主组件的实测值当成本插件契约）。

### 6.2 下拉（`.dcu-settings-page [class*=selector]`，7 个）

| 状态 | 实测 |
|---|---|
| 常态 | 140×32、`bg rgb(239,239,239)`、`radius 8px`、`font-size 14px`、无边框、无阴影 |
| 聚焦 | **`outline: 3px solid rgb(38,38,38)`、offset 0**、边框仍 0px、无 box-shadow |

**与 ZCode 的差异**：ZCode 的输入/下拉聚焦是「边框加深至 `--color-input-border-focused` + ring-0」，**没有 3px 外环**。
DSH 这里显示的是宿主默认的 3px 实色外环。

**为什么没改**：
1. 该下拉是**宿主组件**（`[class*=selector]` 类名来自宿主 CSS Modules），插件只覆盖了它的高度与字号；
2. 去掉 3px 外环会削弱键盘可达性提示，而 ZCode 的替代方案（边框加深）需要宿主 `input-border-focused` 令牌，
   插件令牌表里没有这一项（`grep input-border-focused zcode-tokens.ts` = 0 命中）；
3. 需先确认宿主是否已用 `outline-color:transparent` + 自绘边框，硬覆盖易把焦点提示彻底抹掉。

⇒ **登记为「宿主焦点样式差异」，改动需要真机对照 + 无障碍复核，本轮不动。**
