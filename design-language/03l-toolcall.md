# 03l · 工具调用卡片（ToolCallBlocks）规格与差距

> 建立：2026-10-31 ｜ 矩阵格位：**G1**（附录 A 反证查出，原矩阵整域缺失）
> ZCode 侧来源：`zai-org/ZCode` **v3.17.1** 源码（与本机安装版本一致）
> DSH 侧来源：CDP 9223 活体实测（1280×820 / dpr2 / 深色）
> 口径：只做 DSH 真实存在的面（用户已定）。ZCode 的 `cua-*` / `workflow-*` / `cron-*` renderer 在 DSH 无对应物，不覆盖。

## 一、ZCode 规格（源码逐条）

### 1.1 结构：一行摘要 + 可折叠内容体

`ToolLayout.tsx` 的组合方式（Props 即设计语言的结构化表达）：

| 层 | 元素 | 说明 |
|---|---|---|
| 图标 | `icon` + `showIcon` | 工具图标，无则省略 |
| 类别词 | `kindLabel`（展开时用 `expandedKindLabel`） | 如「运行命令」 |
| 细节 | `kindDetail` | 类别词后的补充，最弱档 |
| 主文本 | `primaryText`（`prioritizePrimaryText` 控制谁优先截断） | 这次干了什么 |
| 次文本 | `secondaryText`（`hideSecondaryTextWhenOpen`） | 展开时让位 |
| 变更数 | `diffCount` | 如 +12/−3 |
| 状态 | `statusLabel` + `statusIndicator` + `showFailureStatus` | 状态词与状态灯同显同隐 |
| 内容 | `content` / `renderContent` | 展开后的正文 |

### 1.2 摘要行（`ToolSummaryRow.tsx`）

```
group/tool-summary inline-flex max-w-full items-center gap-2 self-start text-left
text-ui-base transition-colors focus-visible:ring-2 focus-visible:ring-input
```

| 项 | 值 | 换算 |
|---|---|---|
| 字号 | `text-ui-base` | **14px**（`--ui-font-size:14px`） |
| 间距 | `gap-2` | **8px** |
| 图标/元信息色 | `text-foreground-subtlest` | 深 **30%** 前景 / 浅 **40%** |
| 主文本色 | 继承（默认前景） | 不压灰 |
| 可点击时 | `cursor-pointer` | 不可点击 `cursor-default` |
| 焦点 | `ring-2 ring-input` | 2px 环 |
| 截断 | `line-clamp-3`（`ToolLayout`），参数容器 `max-w-96` | 最多 3 行；参数块最宽 **384px** |

### 1.3 内容体（`ToolCallBody.tsx`）

| 变体 | class | 换算 |
|---|---|---|
| 代码/输出块 | `max-h-60 overflow-auto rounded-xl border border-border bg-muted/15 px-3 py-3` | 最高 **240px**、圆角 **12**、1px 边、底 **muted 15%**、内距 **12** |
| 无边框块 | `max-h-60 overflow-auto rounded-xl bg-muted/15` | 同上，仅去边框 |
| 分组块 | `space-y-3 rounded-xl border border-outline/60 bg-muted/15 p-3` | 组内 gap **12** |
| 行内码片 | `rounded-md bg-muted/70 px-2 py-1 font-mono text-on-surface` | 圆角 **6**、内距 **8/4** |
| 内容外层 | `ToolLayout` 的 `pt-2` | 摘要与内容间距 **8** |
| 折叠动画 | `TOOL_CONTENT_COLLAPSE_UNMOUNT_DELAY_MS = 300` | 收起后 **300ms** 才卸载 |

### 1.4 进度指示（`ToolCallProgressIndicator.tsx`）

```
<span role="progressbar" aria-valuemin=0 aria-valuemax=1 [aria-valuenow]>
  ·  <span h-1 w-16 rounded-full bg-surface-hover>      ← 轨道
       <span bg-brand transition-[width] duration-200>   ← 确定态填充
       <span w-1/3 bg-brand (indeterminate)>             ← 不确定态扫光
  消息 text-ui-sm text-foreground-subtle                ← 12px，次级色
```

| 项 | 值 |
|---|---|
| 轨道 | **4 × 64px**，`rounded-full`，底 = `surface-hover` |
| 填充 | `brand` 色，宽度 **200ms** 过渡 |
| 不确定态 | 三分之一宽扫光 |
| 标签 | **12px** / 次级色 / 截断 |
| 分隔符 | 前置一个「·」 |

## 二、DSH 现状（2026-10-31 活体实测）

选中样本：`[data-chat-flow-kind="tool-call"]`（当前会话 38 条），行容器 `.baXwkG_callRow`。

| 项 | 实测 | 判定 |
|---|---|---|
| 行高 | **24px** | 待对（ZCode 无显式高度） |
| 圆角 | 4px | 待对 |
| 背景 | 透明 | ✅ 与 ZCode 一致（摘要行无底） |
| 类别词「运行命令」 | **13px** / lh 24 / `rgba(212,212,212,.5)` | ❌ 字号 13≠14；色 = **50%**（=最弱档）✅ 与 subtlest 语义相符 |
| 主文本「确认时间线与构建脚本」 | **13px** / `rgba(212,212,212,.5)` | ❌ **两处错**：字号 13≠14；**主文本被压成最弱档灰**，ZCode 主文本是默认前景 |
| 图标 | 14×14 / `rgba(212,212,212,.5)` | ✅ 与 subtlest 相符 |
| 每行 svg 数 | 2（图标 + 展开指示） | 结构一致 |
| 可点击元素 | **0 个 button** | ❓ 整行是否可聚焦/可展开未确认 |
| 进度条 | `role="progressbar"` **0 个** | ❌ **缺失**（ZCode 有 4×64 brand 进度条） |
| 展开体 | 未采（当前无展开态样本） | ❓ |

## 三、差距表（按用户可感知程度排序）

| # | 差距 | ZCode | DSH 现状 | 感知度 | 风险 |
|---|---|---|---|---|---|
| **TC1** | 主文本被压成最弱档灰 | 默认前景（90%） | 30% 灰 | **最高**——一行里「干什么」和「类别」分不出主次 | 低（只改颜色） |
| **TC2** | 字号 13px | 14px | 13px | 高——每轮对话几十行 | 低（走令牌 `--dsw-font-size-base`） |
| **TC3** | 无进度条 | 4×64 / brand / 200ms | 无 | 中——只在运行中出现 | 中（要接宿主 progress 数据，见 §四） |
| **TC4** | 展开体规格未验 | 240 / 12 / 1px / muted15% / 12 | 未采 | 中 | 中（需展开态样本） |
| **TC5** | 整行可点击/可聚焦 | `cursor-pointer` + 2px ring | 0 button，未确认 | 中——可访问性相关 | 中（涉及事件绑定） |
| **TC6** | 参数块 max-w 384 / 3 行截断 | `max-w-96` + `line-clamp-3` | 未确认 | 低 | 低 |

## 四、TC3 的前置问题（这条不能直接做）

ZCode 的进度条数据来自 `ToolProgress`（`fraction` / `message`，见 zcode-protocol-v4）。
**已查证（2026-10-31）：DSH 宿主不提供该数据，判定「不做」。**

证据：解 `DeepSeek Harness.app/Contents/Resources/app.asar` 取
`dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`（774,060 字节），全文检索：

```
fraction 0 ｜ aria-valuenow 0 ｜ progressbar 0 ｜ toolProgress 0 ｜ progress: 0
```

即宿主既无进度字段、也无进度条组件。按判定表第三档处置：**不做，登记「宿主无对应数据」**，
**禁止自造百分比**（自造进度 = 假信号，比没有更糟）。若将来宿主提供，再按 ZCode 规格补。

## 五、待采项（需要 ZCode 活体的只有一项）

| 项 | 为什么需要 9224 | 判定表 |
|---|---|---|
| ZCode 摘要行的**真实行高与垂直内距** | 源码只有 `text-ui-base` 与 `gap-2`，高度由 line-height + 外层 padding 决定，源码里分散在父组件，取不到单一值 | 行高 20~24 ⇒ 与 DSH 24 同档；>26 ⇒ 需加内距 |
| ZCode 展开态的**实测几何** | 需要真实点开一条工具卡 | 240/12/1px 三项都对 ⇒ TC4 关闭 |

**其余全部可离线做**：TC1/TC2 是纯令牌替换，TC5/TC6 走源码 + 断言。

## 五bis · 已落地与活体验证（2026-10-31）

### TC1 + TC2 已实施

改法：在 `src/client/conversation-layout.ts` 的 `CONVERSATION_LAYOUT_STYLE` 末尾追加一段
（不新增样式块，`STYLE_BLOCK_BUDGET` 不变）：

```css
[data-chat-flow-kind="tool-call"] .-gRAhq_summary ._text_1rdzk_17{
  color:var(--dsw-alias-label-primary);
  font-size:var(--dsw-font-size-base);
}
```

作用域锚点用宿主稳定属性 `data-chat-flow-kind="tool-call"`，只命中摘要文本；
类别词 `-gRAhq_title` **不碰**。

**活体验证（CDP 9223，同一会话同一条工具行）**：

| 项 | 改前 | 改后 | 判定 |
|---|---|---|---|
| 主文本字号 | 13px | **14px** | ✅ 达标 |
| 主文本颜色 | `rgba(212,212,212,.5)` | **`#d4d4d4`**（默认前景） | ✅ 达标 |
| 类别词 | 13px / 30% | 13px / 30%（未变） | ✅ 反向守卫成立 |
| 行高 | 24px | 24px | ✅ 无布局位移 |
| 规则在样式表内 | — | 命中 1 条 | ✅ 已注入 |

**防回归**：`tests/conversation-visuals.assert.ts` 新增 6 条断言（规则存在 / 只作用摘要 /
命中宿主文本类 / 颜色与字号走令牌 / 无可字面量字号 / 类别词不得被提亮）。

### TC5 撤销（原判为「整行不可点击」）

DOM 实测：`.-gRAhq_root` 带 `role="button" tabindex="0" aria-expanded="false" data-expandable="true"`。
**整行本来就可聚焦、可展开**。上一轮我统计的是 `<button>` 标签数（0），漏掉了 `role=button` 这种写法
——**这是本轮第二次「测量口径错当成缺陷」**（第一次是 F3 KaTeX）。结论：TC5 不需要改动。

### TC3 判定不做（宿主无数据）

见 §四，DSH conversation 包内 `fraction / aria-valuenow / progressbar` 全为 0 命中。

### TC4 / TC6 挂账（各有明确阻塞）

| 项 | 现状 | 为什么不改 |
|---|---|---|
| **TC4 展开体** | 实测：bash 输出块 836×337、圆角 **8**、边 0.5px、底 `#2b2b2b`、左内距 30 | ZCode 的通用 `ToolCallBody` 是 12/1px/muted15%/12 全边；但 bash 属 `ExecuteOutput` 专用 renderer，其规格**尚未从源码取**。拿通用体套专用 renderer = 凭感觉改 |
| **TC6 摘要换行** | DSH：单行 `nowrap + ellipsis`；ZCode：`max-w-96` + `line-clamp-3` | 改成 3 行会把行高从 24 顶到最多 60+，**改变整页密度**。需 ZCode 活体确认「多数长摘要是否真的换成 3 行」再决定 |

## 六、建议实施顺序

1. ~~TC1 + TC2~~ ✅ 已落地并活体验证（见 §五bis）
2. ~~TC5~~ ✅ 撤销（原本就对）
3. ~~TC3~~ ✅ 判定不做（宿主无数据）
4. **TC4** 需先取 ZCode `ExecuteOutput` / `ExecuteCommand` 源码规格
5. **TC6** 需 ZCode 活体确认换行行为后再定
