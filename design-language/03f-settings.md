# 03f 设置页（settings）对照矩阵：ZCode × DSH

> **✅ 更新（评审方 2026-10-27 16:3x）：ZCode 侧已采到**。
> 打开方法（关键）：设置按钮被「返回工作区」按钮**同位堆叠遮挡**（会话视图下 footer 显示返回工作区）——
> 先点「返回工作区」退出会话视图，「设置」即成为可点击顶元素；再 DOM click 即可打开。
> DSH 侧 4 次失败的原因正是没退会话视图（坐标上被返回工作区钮盖住，elementFromPoint 证实）。
> 规格 JSON：03f-settings-zcode-spec.json。

## 0. 本轮可达性结论（先说清楚）

**ZCode 设置页本轮未能打开**，尝试记录：

| 尝试 | 方式 | 结果 |
|---|---|---|
| 1 | CDP `Input.dispatchMouseEvent` 坐标点击 | ❌ 无响应 |
| 2 | JS `button.click()` | ❌ 无响应 |
| 3 | 完整鼠标序列（moved→pressed→released）+ buttons 字段 | ❌ 无响应 |
| 4 | 检查多窗口 | ❌ 只有 1 个 page |

**已验证按钮本身是可点的**（不是定位错误）：
```
elementFromPoint(cx, cy) === 按钮本身  → hitsButton: true
visibility: visible / display: flex / opacity: 1 / pointer-events: auto
```

→ 点击被目标元素吞掉（可能有 `preventDefault` 或需要 Electron 主进程侧 IPC）。
**补采动作**：需人工在 ZCode 窗口点开设置页，之后我再执行 CDP 提取。

## 1. DSH 侧存量盘点（已完成的唯一部分）

插件在 settings 域**存量非常厚**，共 618 行 / 7 个文件：

| 文件 | 行数 | 职责 |
|---|---|---|
| `settings-page-styles.ts` | 150 | 设置页局部 tokens 与布局（`-sp-*` 令牌命名空间） |
| `settings-page-registration.ts` | 177 | 设置页注册、与宿主 settings 服务对接 |
| `settings-nav-icons.ts` | 120 | 8 个分区导航图标（内联 SVG path） |
| `settings-navigation.ts` | 104 | 自有设置壳的分区跳转（事件驱动，不依赖宿主按钮结构） |
| `automation-task-settings.ts` | 34 | 自动化任务设置 |
| `settings-page-model.ts` | 20 | 设置行数据模型（`SettingsRow`） |
| `settings-focus.ts` | 13 | 焦点管理 |

**分区图标已覆盖 8 个**（来自 `settings-nav-icons.ts` 的类型定义）：
`experts | skills | plugins | connectors | schedule | assistant | archive | about`

**已知设计决策**（源码注释）：`-sp-*` 令牌曾与宿主语义令牌并存，
2026-10-14 做过去重，6 个在明暗两套下计算值都与宿主 `--dsw-*` 逐一相等（真实 Chromium 比对过）。

## 2. 对照矩阵（双端实测完成）

### 2.1 打开方式（本轮终于打通）

```js
const owner = document.querySelector('[data-dcu-settings-owner]')
owner.dispatchEvent(new CustomEvent('dcu-settings-open-root', { cancelable: true }))
// 注意：**不要加 bubbles:true** —— 加了会返回 defaultPrevented:false 且页面不挂载
```

### 2.2 实测对照

| # | 项 | ZCode | DSH 实测 | 判定 |
|---|---|---|---|---|
| **S2** | 卡片背景 | **`rgb(22,22,22)`** #161616 | **`rgb(43,43,43)`** #2b2b2b | ❌ **差 21 灰阶（最上位）** |
| S2b | 卡片边框 | `1px rgba(255,255,255,.1)` | `1px rgba(255,255,255,.1)` | ✅ 完全一致 |
| S2c | 卡片圆角 | `12px` | `12px` | ✅ 完全一致 |
| S2d | 卡片内边距 | `0`（主卡）/ `12px 16px`（次级） | `0px 16px` | 🟡 近似 |
| S2e | 卡片宽度 | 1456 | 768 | 🚫 受容器宽度约束，非缺陷 |
| **S1** | 导航分区项 | **16px**/400 / h32 / **r12** | **14px**/400 / h32 / **r8** | ❌ 字号小2px、圆角差4px |
| S1b | 导航分组标签 | 12px/500 | ❓ 本轮未采到（当前分区无分组标签） | ❓ |
| S1c | 激活项 | 14px / 全前景 `oklch(.87 0 0)` | ❓ 未采到激活态 | ❓ |
| **S3** | 下拉 | **h32 / r8 / fs14** | **h36 / r8 / fs13** | ❌ 高+4、字号-1 |
| S4 | 主内容宽 | 1454 | 768（卡片宽） | 🚫 容器差异，非缺陷 |
| S3b | 开关/输入 | ❓ ZCode 侧从未采到 | 36×20 / r8（内部一致） | ❓ **与 ZCode 未对照**（此前误标 ✅，已降级） |

> **2026-11-01 裁决（权威版见矩阵 B12 行）**：ZCode v3.17.1 switch.tsx + 装机编译 CSS 双源 = 轨道
> **32×18**（h-[18px] w-[32px]、p-px、thumb size-4=16、checked 位移 calc(100%-2px)、无阴影、全圆）。
> 本节及历史记录的「36×20/r8」是**误归因**（asar 编译 CSS 里 h-5/w-9 工具类属于其他组件，从未用于开关），
> 不是 ZCode 旧版值。插件已按 32×18 修复 + 4 条断言锁定；宿主自有开关 `_switch_1ik0f_5` 不代改（外来内容契约）。
> 剩 ZCode 设置页一次活体确认（CDP 点不开设置页，需人手）。

### 2.3 S3b 补采（开关与输入）

| 项 | DSH 实测 | 说明 |
|---|---|---|
| 开关（自有 `.dcu-settings-switch`） | **36×20 / r8** | `role=switch`，thumb 16×16 / r50%；**DSH 内部一致 ✅ / 与 ZCode 未对照 ❓** |
| 开关（宿主 `_switch_1ik0f_5`） | **36×20 / r8** | 与插件自有版本**尺寸完全一致**（仅证明 DSH 内部统一，**不构成 ZCode 对齐证据**） |
| 输入框 | 当前分区未含 `input[type=text/number]` | ❓ 需滚动到「模型/费用」等分区 |

**ZCode 侧开关/输入本轮仍未采到**（其设置页滚动位置不同），标 ❓。

## 2.4 实现结果（本轮已修，双主题实测）

| # | 项 | 改前 | 改后 | 状态 |
|---|---|---|---|---|
| **S2** | 卡片底色 | `#2b2b2b`（宿主令牌） | **`#161616`** 深 / **`#fbfbfb`** 浅 | ✅ |
| S2b | 卡片边框 | `1px rgba(255,255,255,.1)` | 不变 | ✅ 本来就对 |
| S2c | 卡片圆角 | `12px` | 不变 | ✅ 本来就对 |
| **S3** | 下拉 | h**36** / r8 / fs**13** | **h32 / r8 / fs14** | ✅ |
| **S1** | 导航项 | **14px** / **r8** / h32 | **16px / r12** / h32 | ✅ |

**实现方式**（都是「加一层可覆盖令牌」，不动宿主令牌本身）：

```css
/* settings-page-styles.ts */
--sp-card: var(--dcu-settings-card-fill, var(--dsw-alias-settings-card-fill));
border-radius: var(--dcu-settings-nav-radius, var(--dsw-radius-lg));
font-size: var(--dcu-settings-nav-size, var(--dsw-font-size-base)) !important;
```

```css
/* zcode-theme.ts —— 深色 #161616 / 浅色 #fbfbfb，导航 16px / r12 */
--dcu-settings-card-fill; --dcu-settings-nav-size; --dcu-settings-nav-radius
```

**为什么用「可覆盖令牌」而不是直接改值**：`--sp-card` 原本直接引用宿主令牌，
改死值会让插件失去跟随宿主主题的能力；加一层 `--dcu-*` 兜底既保留继承链，又能按主题覆盖。

**S1 的 `!important` 是既有写法**：原代码就用 `font-size:...!important` 压宿主，
本轮只把值换成可覆盖令牌，**没有新增 `!important`**，`!important` 预算不变。

### 双主题验证（活页面实测）

| 项 | 深色 | 浅色 |
|---|---|---|
| 卡片 bg | `rgb(22,22,22)` ✅ | `rgb(251,251,251)` ✅ |
| 卡片 r / border | `12px` / `1px` ✅ | 同 ✅ |
| 导航 | `16px / r12 / h32`，**不折行** ✅ | 同 ✅ |
| 下拉 | `h32 / r8 / fs14` ✅ | 同 ✅ |
| 水平溢出 | 无 ✅ | 无 ✅ |

**副作用**：切浅色后已恢复深色（`theme-zai-dark dark` 实测确认）。

**16px 是否破版**：注入试验先行验证（`scrollHeight === clientHeight`、无折行、无溢出）后才改源码。

## 3. 本轮卡点：DSH 设置页打不开（记录 3 种尝试）

ZCode 侧规格已齐全，**但 DSH 侧活页面值本轮没测到**，因为设置页没能挂载：

| 尝试 | 方式 | 结果 |
|---|---|---|
| 1 | 点侧栏「扩展管理」 | ❌ `.dcu-settings-page` 仍不存在 |
| 2 | 按「基础设置/外观/模型」关键词找最大容器 | ❌ 命中的是会话区（对话内容里恰好有这些词） |
| 3 | 查 `.dcu-settings-*` 稳定标记 | ❌ 只有 `.dcu-settings-seat`（248×44，侧栏入口位） |
| 4 | 派发插件自己的 `dcu-settings-open-root` 事件 | ❌ `defaultPrevented:false` 但 `.dcu-settings-page` 仍未挂载 |

**判定**：`.dcu-settings-page` 未挂载 ⇒ 设置页没打开；
所有「卡片 / 导航 / 下拉」的测量值都不成立，**矩阵 DSH 列一律保持 ❓**。

→ **因此本轮未做任何设置页改动**。凭不存在的实测值去「对齐」，
就等于上一轮 HD4 的错误重演（只看深色快照就把正确的令牌实现误判成 bug）。

## 4. 下一步

1. **确认 DSH 设置页的正确打开路径**——从源码看，它走的是
   `settings-navigation.ts` 的**事件驱动分区跳转**，可能只认宿主设置入口，
   不走侧栏「扩展管理」；
2. 打开后先测 S2（卡片）与 S1（导航），这两项是结构级差异；
3. 再按「最上位 2~3 条」修，S2 优先。
