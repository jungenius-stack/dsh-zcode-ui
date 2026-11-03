# 03k · 右键菜单（ZCode）规格矩阵 · 第一批（静态）

> 采样通道说明：CDP 真鼠标右键两次尝试均被环境掐断（疑似原生菜单抢占），改走 asar 编译 CSS 静态提取
> （/tmp/zc-styles.css，2026-10-23 构建）。活体补采留待自然时机。

## A. 菜单令牌（双主题，asar 静态）

| # | 令牌 | dark | light | 备注 |
|---|---|---|---|---|
| A1 | --color-menu | #2b2b2b | #fff | 与 --color-card 同值（弹层同底家族） |
| A2 | --color-menu-hover | **#363636** | #f0f0f0 | **与 --color-tag/cmdk 选中同族**——全局选中抬亮灰统一 |
| A3 | --color-popover | #2b2b2b | #fff | 同 A1 |
| A4 | --color-popover-header | #202020 | #f8f8f8 | 菜单头比菜单体暗一档（-11 灰阶），light 反向 |
| A5 | --color-popover-border | --color-border | 同 | 10% 白/黑标准边 |

## B. 设计系统级判读（2026-10-28 新规律，进 tokens 注释）

**「选中/悬停抬亮灰」在 ZCode 是一个全局概念**：cmdk 选中项、菜单项 hover 共用
`#363636`（dark）/浅色族（light），即 tag 令牌族。插件侧 `--dsw-alias-markdown-tag`
已含此值，菜单/浮层选中态应统一消费它，而非各造一份。

## C. DSH 侧判定

- 插件右键菜单（.dcu-menu）hover 用 --dcu-sidebar-hover（5% 白/黑）→ 与 ZCode #363636（约 21% 亮灰）**不一致**，待活体对照后改齐（菜单 hover 也走 tag 族）。
- 菜单容器底/边已同值（tip 家族）。

## 待办

- 活体补采：CDP 真鼠标路线被环境拦截，改试 DOM dispatchEvent(new MouseEvent('contextmenu')) 或 computer-use 真键鼠。
- .dcu-menu hover 对齐（一处 CSS 改动，随活体采样同批做）。
