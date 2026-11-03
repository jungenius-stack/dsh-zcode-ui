# 03p 启动画面（2026-10-28，commit `c78c2d3`）

> 需求：仿照 ZCode 的启动风格。规格取自 ZCode 安装包内启动页 HTML **原文**
> （app.asar 内嵌启动页：#loading / .startup-logo-shell / @keyframes startup-logo-pop）。

## ZCode 启动规格（原文提取，A 级证据）

| 项 | 值 |
|---|---|
| 遮罩 | `#loading`：fixed inset 0、z-index 2147483647、flex 居中、`transition: opacity 0.16s ease` |
| 徽标壳 | 96×96、圆角 24px、`linear-gradient(180deg,#000,#151718)`、阴影 `0 20px 25px -5px rgb(0 0 0/.2), 0 8px 10px -6px rgb(0 0 0/.2)` |
| 入场 | `startup-logo-pop 0.72s cubic-bezier(0.22,1,0.36,1) forwards`：0%{op0,scale.72} → 38%{op1,scale1.045} → 58%{scale.985} → 76%{scale1.008} → 100%{op1,scale1}（弹性 pop） |
| 就绪 | body 加 `zcode-startup-ready` → 遮罩淡出 0.16s（pointer-events none，500ms 后 remove）+ `#root` 0→1 淡入 0.16s |
| 门控 | logo `animationend` / 1s 上限 / 3s 硬上限 / reduced-motion 跳过动画 |
| 特点 | **没有进度条与骨架屏** —— 一枚 logo 弹出来，界面淡入，全程 1 秒内 |

## DSH 实现（startup-splash.ts，index.ts 首位导入）

- 模块顶层注入 `#dcu-splash`：遮罩底色随主题（深 `#161616` / 浅 `#f8f8f8`，MutationObserver 跟随）；
- 徽标：同尺寸/圆角/黑壳/阴影，内嵌**宿主 FishLogo 鲸鱼**（viewBox `0 0 23.16 17.04`，白色，取自 DSH asar 原文）；
- 入场：同款 pop 关键帧（keyframe 更名 `dcu-startup-logo-pop` 防冲突）；
- 就绪信号 = `.dcu-root` 挂载（rAF 轮询）；就绪后遮罩 0.16s 淡出、500ms 移除；
- 三重保险：3s 硬上限 / 探测自包含 / reduced-motion 立即移除。

## 实测

- 注入截图（200ms）：暗底居中黑壳白鲸，与 ZCode 启动页同构；
- 暖重启下遮罩存活 <31ms（应用秒开）—— 冷启动才可见数秒，符合设计意图；
- `lib/client.js` 资源齐全（dcu-splash ×8）；门禁 exit 0。

## 契约登记

- `STYLE_BLOCK_BUDGET`：startup-splash.ts = 1；
- `COLOR_LITERAL_ALLOW`：整文件豁免（ZCode 启动页 1:1 复刻，就绪前无法消费令牌层）；
- `RADIUS_LITERAL_BASELINE`：24px ×1（启动层独立标度）；
- 动效令牌扫描豁免该文件（启动时序在应用四档动效管辖之外）。

## 回退

`git reset --hard backup/pre-startup-splash`


## v2（2026-10-29，commit `4cb5c99`，用户三项反馈逐条落实）

| # | 反馈 | 修订 |
|---|---|---|
| V-1 | 图标要 DeepSeek Harness **官方图标** | FishLogo 鲸鱼 → 官方 app icon（icon.png 1024 缩至 192 @2x base64 内嵌 ~38KB，徽标内 56×56） |
| V-2 | 背景是**毛玻璃**（macOS 原生材质） | 遮罩不再自带底色 —— 透明层让原生窗口材质透出（与 ZCode `#loading` 无背景同构）；删除主题底色逻辑与观察器 |
| V-3 | 随后**转为纯黑** | 就绪淡出后应用画布（深 #161616）淡入，过渡自然发生 |
| V-4 | 复刻补齐 | 徽标壳 `::before` 1px rgba(255,255,255,.1) 边框（ZCode 原文注释：「启动 logo 壳是固定深色底，边框不能跟随浅色主题 token」） |

**实测**：注入截图（200ms）—— 黑壳 + 官方图标，边框/圆角/阴影逐项同构；门禁 exit 0。

**证据链补充**：ZCode 启动徽标内是 **Zai 自己的标志**（viewBox 0 0 256 218 双 path），
DSH 侧对应物即官方 app icon —— 「壳 + 官方标志」的结构 1:1，标志各用各家的。

**回退**：`backup/pre-splash-v2`。
