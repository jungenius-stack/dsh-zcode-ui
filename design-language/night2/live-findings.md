# 9224 活体实测记录（2026-11-03 00:40–01:15）

ZCode 以 `--remote-debugging-port=9224` 运行（pid 变过多次，最终 27758），WS 直连只读取值。
配套产物：

- `cdp-summary.json` — 主题令牌 × 双主题 + 关键元素 computed style + 圆角/时长/缓动分布
- `cdp-shot-current.png` / `cdp-shot-light.png` / `cdp-shot-dark.png` — 双主题截图
- `zcode-live-styles.css` — **从 asar 提取的运行时样式表（480,065 字节）**，这是 ZCode 运行时真正加载的那一份，
  比在 341MB 包里 grep 精确得多，今后所有 CSS 类问题应以它为唯一真源。
- `cdp-capture.mjs` / `cdp-css.mjs` — 可复跑的采集脚本

## 关键发现：先纠正一个方法论错误

**调试端口不是 9224，是内置固定的 9229**。asar 里：

```js
nv.ZCODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT !== "1" && X.commandLine.appendSwitch("remote-debugging-port","9229")
```

不设 `ZCODE_DISABLE_FIXED_REMOTE_DEBUGGING_PORT=1` 时，外部传的任何端口都会被 9229 顶掉。
另外该构建**禁用了 HTTP 发现端点**（`/json/*` 无响应），判断"端口是否可用"只能看 TCP 监听（`lsof`）或直连 WS。

## 一、已裁决（活体给了答案）

| 项 | 我们原值 | ZCode 活体实测 | 判定 | 落地 |
|---|---|---|---|---|
| 浅色侧栏底 `--color-sidebar` | `#f5f5f5` | **`#f0f0f0`** | 我们错：`tokens.json` 记录的 `oklch(97%)=245` 是**基础层**，运行时被 `.theme-zai-light` 覆盖为 `#f0f0f0` | 已改（含 2 处断言同步更正） |
| 浅色设置页底 | `#fafafa` | **`#f8f8f8`**（= `--color-background` 浅色） | 我们错 | 已改 |
| 浮层主文字（浅） | `#0a0a0a` | **`#0d0d0d`**（`--color-tooltip-foreground`） | 昨晚按 tooltip 配对**推断**成 #0a0a0a，过度外推 | 已改回 #0d0d0d |
| 字体栈 | 依赖宿主 `--dsw-font-family` | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji"…` | 顺序不同（ZCode `ui-sans-serif` 在前）；渲染差异极小，且改它等于改宿主全局字体，**登记不改** | 只登记 |
| 状态色（填充档） | success `#1e8a3e` / error `#e03131` / warn `#e07b00`（浅） | **完全一致** | 已对齐 | 无需动 |

## 二、完整令牌对照（活体 × 双主题）

| 令牌 | 浅色 | 深色 |
|---|---|---|
| `--color-sidebar` | `#f0f0f0` | `#161616` |
| `--color-background` | `#f8f8f8` | `#161616` |
| `--color-foreground` | `oklch(26.9% 0 0)` | `oklch(87% 0 0)` |
| `--color-menu` | `#fff` | `#2b2b2b` |
| `--color-menu-hover` | `#f0f0f0` | `#363636` |
| `--color-card` | `#fff` | `#2b2b2b` |
| `--color-tooltip` | `#f0f0f0` | `#2b2b2b` |
| `--color-tooltip-foreground` | `#0d0d0d` | `#f8f8f8` |
| `--color-tooltip-tag` | `#e6e6e6` | `#363636` |
| `--color-border` | `#0d0d0d1a`（10%） | `#ffffff1a`（10%） |
| `--color-hover` | `#0d0d0d0d`（5%） | `#ffffff0d`（5%） |
| `--color-selected` | `#0d0d0d0d`（5%） | `#ffffff1a`（10%） |
| `--color-success` | `#1e8a3e` | `#46bf72` |
| `--color-warning` | `#e07b00` | `#ff8a30` |
| `--color-destructive` | `#e03131` | `#ff5c5c` |

我们的对应项：menu/card/tooltip/border/hover/selected 全部已对齐（menu 用 `--dcu-dialog-bg` = #fff/#2b2b2b）。

## 三、风格分布（活体采样 4000 元素）

- **圆角**：4px(70) · 8px(57) · 6px(50) · 12px(9) · 24px(4) · 50%(若干)｜印证标度是 4/6/8/12/24，我们用的 4/6/8/12 在表内。
- **过渡时长**：`0.15s` 231 处（绝对主流）· `0.3s` 36 · `0.16s` 31 · `0.36s` 21｜注意 **0.16s 真实存在**（我们浮层统一 150ms，与 0.16s 差 10ms，属可接受）。
- **缓动**：`ease` 2650（默认值，未显式设置）· `cubic-bezier(0.4,0,0.2,1)` 197 · `cubic-bezier(0,0,0.2,1)` 84｜与我们 feedback / move 两档一致。

## 四、本轮未能采到的（需特定界面在场）

- **码块 `pre` 内边距**：当前页面没有 `<pre>`，采不到。批次 9 报告记为 `8/8/0/12`，我们用 `6px 8px 12px`——**仍未裁决**，需要页面上出现代码块时重采。
- **rail 滚动清波**（批次 7 E3 ❓）：需要真实滚动 rail 内部 scroller 并观察 hover 波，属交互时序，未做。
- **tooltip 出现延迟 / 焦点环颜色**：需要指针悬停与键盘 Tab 的真实事件，本脚本未模拟。
- **设置页底色/卡片**：需要导航到设置页（会改变用户当前界面），未做。

## 五、教训

1. 判断"服务在不在"必须查**真实监听**，不能查日志（日志里的 `DevTools listening` 是历史记录，进程退出后仍在）。
2. `world.run('sleep', ['300'])` 会撞 `world.run` 默认 300s 超时——工作流里不要用阻塞 sleep 等待外部条件。
3. 从 asar 里提取"运行时真正加载的那个 CSS 文件"，比在整包里 grep 类名可靠一个数量级；方法见 `cdp-css.mjs` 里记录的 asar header 解析（注意头部四字段：`a=4, b=header pickle size, c=json 字符数, d=json 字节数`，偏移基准 `base = 8 + b`）。
