# 03h 细节清扫审计（自洽审计，不依赖 ZCode 参照）

> 2026-10-27。审计方式：**静态源码扫描**（活页面 CDP 当时不可用，见 §6）。
> **本轮只审计不改。**

## 0. 结论摘要

| 维度 | 覆盖情况 | 判定 |
|---|---|---|
| **焦点环** | 20+ 条 `:focus-visible` 规则，覆盖侧栏/工作区/输入区/导航/设置页/关于页 | ✅ 基本完备 |
| **reduced-motion** | 9 个文件有覆盖，含 3 处 JS 驱动动画 | ✅ 完备 |
| **aria** | 部分控件有，需逐项核对 | 🟡 见 §3 |
| **空态/加载态** | 有 `dcu-state--empty` 等，覆盖不全 | 🟡 见 §4 |

## 1. 焦点环

### 已覆盖（实测选择器清单）

| 区域 | 规则 |
|---|---|
| 侧栏工作区 | `.dcu-wb-collection-label / -project-head / -session / -section-label :focus-visible` |
| 侧栏分组 | `.dcu-extensions-toggle:focus-visible`（联动图标与箭头） |
| 输入区 | `[data-composer-card] button/select:focus-visible` |
| 轮次导航 | `[data-dcu-official-turn-navigator] button:focus-visible` |
| 关于页 | `.dcu-about-downloads / -external-link / -install / -project-link :focus-visible` |

**统一写法**（值得保持）：
```css
outline: 2px solid var(--dsw-focus-ring-color, var(--dcu-focus));
outline-offset: 2px;
```
`ring-2 ≈ 2px solid`、`ring-offset-2 ≈ outline-offset 2px`，与 ZCode 口径一致，且焦点色走**语义令牌**（`#0b7fff` = brand）。

### 已解决的历史坑（记录备查）

宿主有 `.JXrxFq_mark:focus-visible{outline:none}`（特异性 0,2,0）会压制插件的焦点环。
单属性选择器 0,2,1 虽更高，**实测仍被其后加载的规则压住**，
最终用「两遍导航属性」提到 `0,3,1` 才生效：
```css
[data-dcu-official-turn-navigator][data-dcu-official-turn-navigator] button:focus-visible
```

### 缺环清单（待活页面确认）

| 元素 | 状态 |
|---|---|
| 设置页导航项 `.dcu-settings-link` | ❓ 未见独立 focus-visible 规则，需确认是否继承宿主 |
| 设置页开关 `.dcu-settings-switch` | ❓ 同上 |
| 设置页下拉 `*_selector` | ❓ 宿主组件，需实测 |

## 2. reduced-motion

### 有覆盖的文件（9 个）

`zcode-theme.ts`(2) / `CodexSidebar.tsx`(5) / `settings-page-styles.ts` /
`new-conversation-style.ts` / `sidebar-width.ts` / `turn-rail-zcode.ts` /
`document-hidden-motion-pause.ts` / `CodexSettingsPage.tsx`

### JS 驱动动画的覆盖核对（重点，CSS 管不到）

| 文件 | 有 matchMedia | 说明 |
|---|---|---|
| `turn-rail-zcode.ts` | ✅ | 刻度 hover 递进的逐帧插值 |
| `TurnNavigator.tsx` | ✅（3 处） | 点击跳转**已改为直接赋值 `scrollTop`**（G11b），本身无动画 |
| `CodexWorkspaceBrowser.tsx` | ✅（5 处） | 预览浮层与展开动画 |

→ **JS 驱动侧覆盖完整，无遗漏项。**

## 3. aria 完整性（活页面实测，2026-10-27 第 21 轮修正）

### 上一轮的两条结论被活页面推翻

| 上轮静态结论 | 活页面实测 | 判定 |
|---|---|---|
| 「`aria-pressed` 未见」 | **18 个**（`自动换行` / `好的回答` / `有问题的回答`） | ❌ **推翻** |
| 「空态无 `aria-live`」 | **5 个**（`aria-live=polite`，含「已完成」「深度求索中」）+ **6 个** `role=status` | ❌ **推翻** |

**为什么静态 grep 会漏**：这些属性由 **JS 动态设置**（React 渲染时挂上），
源码里只出现在 JSX 表达式或组件库内部，`grep aria-pressed` 自然搜不到。
**教训：ARK/aria 类属性必须活页面枚举，静态扫描不可作为「缺失」证据。**

### 实测全量清单

| 属性 | 数量 | 实例 |
|---|---|---|
| `aria-pressed` | **18** | 自动换行 / 好的回答 / 有问题的回答 |
| `aria-live` | **5** | 全部 `polite`，视觉隐藏（`*_visuallyHidden`） |
| `role="status"` | **6** | 与 live region 配套 |
| `role="switch"` + `aria-checked` | 有 | 设置页开关 |
| `role="tab"` + `aria-selected` | 有 | 对话/轨迹/记忆 |
| `aria-expanded` / `aria-haspopup` | 有 | 菜单触发器 |

### 唯一实测到的真缺口

**无标签按钮 44 / 382**（11.5%）——这个口径是错的。按**可见口径**（`display/visibility/opacity` 正常
且落在视口内）复测：**418 个 button 中仅 89 个可见，其中无标签的只有 2 个**。

### DS4 精确定位与修复（2026-10-27 第 22 轮）

| 位置 | 尺寸 | 图标 | 归属 |
|---|---|---|---|
| 顶栏 x=297 | 28×28 | 文件夹/抽屉形 | **插件自渲染** `[data-dcu-title-folder]` |
| 顶栏 x=566 | 28×28 | 三个圆点 `•••` | **插件自渲染** `[data-dcu-title-more]` |

两者都在 `crumbSeg > crumbs > titleCluster` 里、夹在标题文字两侧。

**这两个是插件自己用 `buildTitleButton()` 创建的**，创建时没设 `aria-label` ——
所以是**插件侧的真缺口**，不是宿主组件。

**已修**：
```ts
button.setAttribute('aria-label', marker === 'folder' ? '打开所在项目' : '更多操作')
```
并加断言防回归（`tests/conversation-header.assert.ts`）：
```
文件夹/更多按钮必须带 aria-label（纯图标按钮的可访问名）
```

**目标**：可见无标签按钮数 = **0**（待下次应用重载后复测）。

## 4. 空态 / 加载态 / 禁用态（修正）

| 类型 | 实测 |
|---|---|
| 空态 | 有 `.dcu-state--empty` / `.dcu-wb-empty`（tertiary 色） |
| **加载/进行中宣告** | **有** —— `aria-live=polite` 的视觉隐藏区 + `role=status`（「深度求索中」「已完成」） |
| 禁用态 | `:disabled` 规则散落各组件，有 `opacity` / `cursor` 处理 |
| 缺口 | 无（上轮「无 aria-live」结论已推翻） |

## 5. 缺口判定表（按活页面实测修正）

| 编号 | 项 | 实测现状 | 建议 | 风险 |
|---|---|---|---|---|
| **DS1** | 设置页导航/开关焦点环 | 待验（见 §2 待活跃页确认） | 若确无则补 `:focus-visible` | 低 |
| ~~DS2~~ | ~~空态 aria-live~~ | **已推翻**：5 个 `aria-live` + 6 个 `role=status` | 无需处理 | — |
| ~~DS3~~ | ~~`aria-pressed` 缺失~~ | **已推翻**：实测 18 个 | 无需处理 | — |
| **DS4** | 无标签按钮 44/382 | 需区分「纯图标漏标」与「隐藏占位」 | 先分类，只补真漏标的 | 中（误补隐藏按钮会污染读屏） |

## 6. 本轮审计方式说明（诚实标注）

活页面 CDP 在本轮中途因宿主启动期 404/503 不可用（已知问题，见 KNOWN-ISSUES §65），
**故本轮审计以静态源码扫描为主**，未做元素级活页面逐项确认。

因此 DS1/DS3/DS4 的「未见」都只是**源码未命中**，不等于运行时一定缺失
（可能是宿主提供，或我 grep 的模式没覆盖到）。
**下一轮须在活页面逐项复核后再决定是否动手。**
