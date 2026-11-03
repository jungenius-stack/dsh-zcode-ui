# 03c 会话区：DSH 侧现状盘点（第 3 组件地基）

> 本轮**只盘点不修改**。ZCode 参照到位后的对照与修改留给下一轮。
> 生成方式：2026-10-27 用 CDP（9223）在活页面上逐类采样 `getComputedStyle` + `getBoundingClientRect`，
> 并 grep 插件源码确认归属。**所有值都是当场量的，不是从文档抄的。**
> 前置阅读：`03b-sidebar.md`（侧栏，已收口）、`uiplug/docs/SIDEBAR-STRUCTURE-DIFF.md`。

---

## 0. 本轮最重要的结论（先说）

**插件对会话区「消息内容」几乎没有覆盖。**

grep 全部 `src/client/*.ts{,x}` 的会话区类名前缀命中数：

| 宿主类前缀 | 含义 | 插件覆盖处数 |
|---|---|---|
| `IzP3Va_*` | 用户气泡（bubble/userRow/userStack） | **0** |
| `TXqvFW_*` | 工具调用卡片（root/label/title/chevron） | **0** |
| `baXwkG_*` | 工具调用行（callRow） | **0** |
| `7gxqk_*` | Markdown 正文与代码块（card/bannerWrap/plain） | **0** |
| `ppByMG_*` | 代码块复制按钮（action） | **0** |
| `HiSsxa_*` / `Q2dzhW_*` | 思考/轨迹条目 | **0** |
| `icaHSq_*` | 会话流容器 | **3**（且都是「回到底部按钮对齐」与注释里提到，非内容样式） |

**这意味着**：会话区的视觉 100% 来自宿主默认样式。插件目前的会话区工作全部集中在
**输入区（composer）**、**新建页 hero 布局**、**轮次导航**——不是消息内容。

→ 下一轮做 ZCode 对照时，**几乎每一类都要新建覆盖**，而不是「调参数」。
这是本轮盘点对后续 2~3 轮效率最关键的一条信息。

---

## 1. 消息行与间距

| 对象 | 选择器 | 实测值 | 插件覆盖 | 宿主默认 |
|---|---|---|---|---|
| 消息流容器 | `.icaHSq_column` | `display:flex; flex-direction:column; margin:0 142.75px; padding:0` | 无 | 宿主（内容宽 640px，两侧自动留白） |
| 单条消息容器 | `.icaHSq_flowItem` | `margin:6px 0 0; padding:0; display:block` | 无 | 宿主（**上下间距仅 6px**） |
| 用户轮容器 | `.IzP3Va_userRow` | `display:flex; flex-direction:column; gap:6px; padding:0` | 无 | 宿主 |
| 用户轮次级容器 | `.IzP3Va_userStack` | 见气泡节 | 无 | 宿主 |

**观察**：
- 消息间距只有 **6px**，且是 `margin-top` 单侧——没有 `margin-bottom`，靠下一条的 top 撑开。
- 内容列宽 **640px**，两侧 142.75px 留白由 `margin` 实现（不是 `max-width` + `auto`）。
  → 插件若要改内容宽度，动的是 `margin`，不是 `width`。

---

## 2. 气泡与文本

| 对象 | 选择器 | 实测值 | 插件覆盖 |
|---|---|---|---|
| 用户气泡 | `.IzP3Va_bubble` | `w=449 h=504; padding:10px 16px; border-radius:12px; background:rgb(32,32,32); border:0; color:rgb(212,212,212); font-size:14px; line-height:22px; font-weight:400` | **无** |

**观察**：
- 气泡底色 `rgb(32,32,32)` 与**代码块卡片底色完全相同**（见第 3 节）——深色主题下两者会视觉混淆。
- 圆角 **12px**；而代码块卡片是 **8px**。两套圆角并存。
- 气泡宽 449px，容器 640px → **不是满宽**，是按内容收缩到某个上限。
- `line-height:22px` / `font-size:14px` = 1.571。

**已知的宿主行为（来自既有文档，非本轮实测）**：
- `conversation-bubbles.ts` 是**撤回**旧版用户卡片覆盖、恢复 DSH 官方气泡的模块——
  也就是说插件历史上曾改过气泡，后来主动撤回了。这条要保留，别重复造。

---

## 3. 代码块

| 对象 | 选择器 | 实测值 | 插件覆盖 |
|---|---|---|---|
| 卡片外壳 | `._card_7gxqk_1.md-code-block` | `w=640; border-radius:8px; background:rgb(32,32,32); margin:16px 0 11px; padding:0; position:relative` | **无** |
| 头部条 | `._bannerWrap_7gxqk_24` | `h=42; background:rgb(22,22,22); border-radius:8px 8px 0 0; position:sticky; top:0; z-index:6; padding:0` | **无** |
| 代码区 | `pre._plain_7gxqk_103` | `background:rgb(32,32,32); border-radius:0 0 8px 8px; padding:6px 22px 20px; font-size:11px; line-height:19px; font-family:ui-monospace,…` | **无** |
| `<code>` | `pre code` | `background:transparent; padding:0; font-size:11px` | **无** |
| 复制按钮 | `.ppByMG_action` | `28×28; border-radius:4px; background:transparent; color:rgba(212,212,212,.5); padding:6px` | **无** |
| 语言标签 | — | **本轮未采到**（当前样本无语言标注） | 无 |

**观察**：
- **三层底色**：卡片 `#202020` → 头部条 `#161616`（更暗）→ 代码区 `#202020`。
  头部条比主体**更暗**，与常见「头部更亮」的惯例相反。
- 头部条 `position:sticky` + `z-index:6`——滚动长代码块时头部常驻。
- 代码字号 **11px**，行高 19px（1.727）。正文是 14/24（1.714），两者比值接近。
- 复制按钮静止 `color:rgba(212,212,212,.5)`（半透明），尺寸 28×28。

---

## 4. 工具调用卡片

| 对象 | 选择器 | 实测值 | 插件覆盖 |
|---|---|---|---|
| 卡片根 | `.TXqvFW_root` | `w=640 h=20; margin:12px 0 0; background:transparent; border:0` | **无** |
| 标签文字 | `.TXqvFW_label` | `color:rgba(212,212,212,.5); font-size:14px; line-height:normal; overflow:hidden` | **无** |
| 标题按钮 | `.TXqvFW_title`（`<button>`） | `w=93 h=20; color:rgba(212,212,212,.5); font-size:14px; background:transparent` | **无** |
| 折叠箭头 | `.TXqvFW_chevron` | 见 `<span>`（同前缀） | **无** |
| 调用行 | `.baXwkG_callRow` | `w=632 h=24; border-radius:4px; background:transparent` | **无** |

**观察**：
- 工具卡片**无边框、无底色**（全 transparent），靠文字色 `rgba(212,212,212,.5)` 弱化。
- 标题是真正的 `<button>`（可聚焦），折叠交互由宿主负责。
- 卡片高度仅 20px（折叠态一行）——非常紧凑。

---

## 5. 流式指示与其他动态元素

| 对象 | 选择器 | 实测值 | 插件覆盖 |
|---|---|---|---|
| 运行中容器 | `.icaHSq_running` | `w=640 h=41; margin:12px 0 0; color:rgb(64,153,255); font-size:12px; line-height:22px` | **无** |
| 分隔线 | `.icaHSq_runningDivider` | `h=1; margin:8px 0 10px; background:color(srgb 1 1 1 / 0.0696)` | **无** |
| 运行中内容 | `.icaHSq_runningContent` | `h=22` | **无** |
| 图标 | `.icaHSq_runningIcon` | `14×14` | **无** |
| 鲸鱼动画 | `.icaHSq_runningWhaleAnimated` | `14×14; position:absolute; background:rgb(64,153,255); animation-name:none` | **无** |

**观察**：
- **唯一使用彩色（`#4099ff` 蓝）的内容元素**——其余会话区全是中性灰，这里靠蓝色表示“进行中”。
- 分隔线是 `color(srgb 1 1 1 / 0.0696)` ≈ 白 7% alpha，符合「中性色用 alpha 叠加」的设计逻辑。
- **实测 `animation-name: none`**：当前样本处于静止态（未在流式中），动画名要到真实流式时才出现。
  → 这是本轮的采样缺口，见第 7 节。

---

## 6. 插件在会话区的实际覆盖清单（全部集中在输入区）

| 文件:行 | 覆盖对象 | 内容 | 性质 |
|---|---|---|---|
| `composer-visuals.ts:21-29` | `.yhfFVG_add`（左下角加号） | 静止态清底色，hover/focus 重新声明令牌 | 静态视觉修正（对齐 ZCode） |
| `composer-visuals.ts:35` | `.icaHSq_toBottomSlot`（回到底部按钮） | 改 `justify-content` 由 flex-end → 居中 | 静态视觉修正 |
| `composer-tool-menus.ts:44-46` | `[data-trigger-menu]` | 弹层定位与圆角 | 输入区弹层 |
| `composer-width.ts:18` | `[data-dcu-width-handle]` | 内容宽度拖拽手柄（`::after` 渐变条） | 插件新增能力 |
| `CodexSidebar.tsx:291-318` | `[data-conversation-scroll]` + `[data-composer-card]` | 输入卡背景/边框/阴影/尺寸/按钮/焦点环 | **最大一块**，全是输入区 |
| `new-conversation-style.ts:4-` | `[data-phase=hero]` | 新建页 hero 布局 | 新建页 |
| `turn-rail-zcode.ts` | 轮次导航 | 已在 03 文档覆盖 | 导航 |

**结论**：会话区「内容侧」（消息/气泡/代码/工具卡）**零覆盖**，全部是宿主默认。

---

## 7. 本轮采样缺口（诚实声明）

| 缺口 | 原因 | 补采方式 |
|---|---|---|
| 代码块**语言标签** | 当前样本的代码块无语言标注 | 找一条带 ```bash``` 或 ```ts``` 的回复再采 |
| 流式动画的 `animation-name` | 采样时无流式进行中 | 让助手处于流式输出时再采 |
| **引用块 `<blockquote>`** | 当前会话区无引用块 | 找一条含 `>` 引用的回复 |
| 工具卡片**展开态** | 采样时全部折叠 | 点开一条工具卡片再采 |
| 助手正文容器（`_root_7gxqk`） | 选择器未命中（可能类名不同） | 用父级链重新定位 |
| 浅色主题下的全部值 | 本轮只采深色 | 下轮对照时双主题各采一次 |

**这些缺口不影响第 0 节的结论**（插件零覆盖是 grep 出来的，与采样样本无关），
但会影响下一轮「逐项对齐」的起点精度。

---

## 8. 对下一轮的输入（不做，只记）

1. **工作量预警**：内容侧五类全部要新建覆盖，不是调参。建议按「用户气泡 → 代码块 → 工具卡片 → 消息间距 → 流式」顺序，
   理由是用户注视权重（气泡与代码块最常看）。
2. **已知冲突点**：气泡底色与代码块卡片底色同为 `rgb(32,32,32)`，ZCode 对照时注意是否需要区分层级。
3. **圆角两套并存**：气泡 12px / 代码卡 8px，改之前要确认 ZCode 是否也这样。
4. **`conversation-bubbles.ts` 是撤回模块**，别把它当成「已有覆盖」去改。
