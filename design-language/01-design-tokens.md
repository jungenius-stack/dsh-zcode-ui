# 01 设计令牌（Design Tokens）

> 机器可读全量见 `tokens.json`（231 变量 × 双主题）。本文件是速查 + 映射逻辑。
> 提取方式：CDP 读 ZCode 活页面样式表 `:root` 声明 + computed 值，深色 `theme-zai-dark`、浅色 `theme-zai-light`。

## 主题机制（最重要的设计逻辑）

- 主题类挂在 `<html>`：`dark theme-zai-dark platform-mac-desktop` ↔ `theme-zai-light`。
- **172/231 个变量随主题翻转**。翻的不是「白变黑」，而是同一语义槽位换实现：
  - 半透明叠加方向翻转：浅色用「黑叠加」`color-mix(in oklab, oklch(14.5% 0 0) 10%, transparent)`，深色用「白叠加」`#ffffff1a`。**这是 ZCode 边框/表面的核心手法：中性色永远以 alpha 叠加形式存在，不写死灰值。**
  - 品牌色微调亮度而非换相：`--color-highspeed-accent` 浅 `#9e77ed` / 深 `#b392ff`（同一紫，深色提亮）。
  - 阴影深色加深扩散：`--highspeed-share-dialog-box-shadow` 两套完全不同参数。
- DSH 侧对应物是 `--dsw-alias-*` 令牌（如 `--dsw-alias-label-dimmed`、`--dsw-alias-label-primary`、`--dsw-alias-bg-base`）。**优先引用 DSH 已有语义令牌，缺槽位再按值复刻，并在注释写明 ZCode 原值。**

## 核心令牌速查（dark / light）

| 语义 | ZCode dark | ZCode light | DSH 现有对应 |
|---|---|---|---|
| 背景 `--color-background` | `#161616`（实测亮度 22） | `oklch(98.5% 0 0)` | `--dsw-alias-bg-base` |
| 卡片/浮层 `--color-popover` | `#2b2b2b` | `#fff` | 无独立槽，用 bg-base+提亮 |
| 前景 `--color-foreground` | `oklch(87% 0 0)`（≈212 灰） | `oklch(37.1% 0 0)` | `--dsw-alias-label-primary` |
| 前景弱 `foreground-subtle` | `#e5e5e599` | `#0a0a0a99` | `--dsw-alias-label-secondary` |
| 前景最弱 `foreground-subtlest` | `#e5e5e54d` | `#0a0a0a4d` | `--dsw-alias-label-dimmed`（≈30% 前色） |
| 边框 `--color-border` | `#ffffff1a`（白 10%） | 黑 10% color-mix | 待映射 |
| 边框 hover | `#ffffff26`（白 15%） | 黑 20% | 待映射 |
| 表面 `--color-surface` | `#ffffff0d`（白 5%） | 黑 3% | 待映射 |
| 表面 hover | `#ffffff1a`（白 10%） | 黑 5% | 待映射 |
| 输入焦点边 `--color-input-border-focused` | `var(--color-brand)` | 同 | 待映射 |
| 弹层前景 `popover-foreground` | `oklch(87% 0 0)` | `oklch(37.1% 0 0)` | 同前景 |
| tooltip 前景 | `oklch(98.7% 0 0)` 近白 | 近黑 | — |

## 状态色（surface+foreground 成对设计）

ZCode 的成功/警告/危险都是「低透明表面 + 亮前景」成对：
`--color-success-surface: #032e1573` + `--color-success-surface-foreground: var(--color-green-300)`，危险 `#e4001429`+`red-300`，警告 `#cd890029`+`yellow-400`，进行中 `blue-950`+`blue-300`。**成对取用，不要单取。**

## 已验证的实测锚点（与六轮踩坑对照一致）

- 刻度静息：前景 30% α（`--dsw-alias-label-dimmed` 等效），深色下复合亮度 55 / 背景 22 → 对比 33；浅色 215/248 → 对比 37。
- 刻度当前条：前景全值（`--dsw-alias-label-primary`），opacity .9。
- 浮层：宽 320px、背景 `--color-popover`、边框 `--color-popover-border`、阴影 shadow-lg、圆角胶囊。
- 字体：`ui-sans-serif, system-ui, sans-serif`；`--ui-font-size: 14px`；正文 16px。
- 圆角：Tailwind 语义（rounded-sm … full/pill）；小元素用 `--dsw-radius-*` 等效即可，2px 高的刻度用 pill 与 8px 视觉全等（已验证纸老虎）。

## DSH 缺口（映射待补）

1. `--color-border` / `surface` / `surface-hover` 的白/黑 alpha 叠加手法——DSH 若无对应槽，建议新建 `--dcu-border` 等本地令牌复刻该手法，而非写死灰值（主题翻转才正确）。
2. 状态色成对体系 DSH 侧未见——引入组件时按「表面+前景」成对建。
