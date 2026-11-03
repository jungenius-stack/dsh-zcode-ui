# 03j · 弹窗/对话框（ZCode）规格矩阵 · 第一批

> 采样：CDP 9224，「创建项目」对话框（无害触发，取消关闭）。2026-10-28 02:30。

## A. 模态对话框（Modal）

| # | 项 | ZCode 实测 | DSH 现状 | 判定 |
|---|---|---|---|---|
| A1 | 宽 | 512 | 各弹窗不一 | 🔧 随各自组件对齐 |
| A2 | 圆角 | **16px（rounded-2xl）** | --dsw-radius-panel 12px | ✅ **已改 panel=16**（Modal/设置面板/反馈弹窗/浮动面板统一） |
| A3 | 底 | #2b2b2b（--color-card）/ 浅 #fff | --dcu-tip-bg 同值 | ✅ |
| A4 | 边 | 1px 10% 白/黑（--color-border） | --dcu-tip-border 同值 | ✅ |
| A5 | 内边距 | **16px**（区块 gap **20px**）——2026-10-28 复测确认 | 宿主模态 12px（宿主自有，未覆盖） | ✅ **定案**：插件无自有表单模态；将来新增须用 16/20 |
| A6 | 阴影 | `shadow-md`：`0 4px 6px -1px 10% 黑 + 0 2px 4px -2px 10% 黑`（双层小影；早期把类名记成 shadow-lg 是笔误，数值一致） | ✅ **已对齐**（两套 --dcu-tip-shadow 改齐） |
| A7 | 定位 | fixed 居中 translate(-50%,-50%) | 同 | ✅ |

> **2026-10-28 复测记录（创建项目对话框，活体）**：padding `16px`、gap `20px`、radius 16、
> 宽 512、底 #2b2b2b、边 1px 10%、阴影 `0 4px 6px -1px / 0 2px 4px -2px`（10% 黑）。
> 内部：标题 14px/500、右上关闭叉、字段组 gap 6、标签 12px/500、输入/下拉 36 高 radius 8、
> 底部按钮右对齐。截图 `screenshots/zc-createproject-dialog-2026-10-28.png`。
>
> ⚠️ **同一次静态扫描发现的第二家族（不要混用）**：asar 里的 Radix `DialogContent`
> （带 `onOpenAutoFocus`/`overlayClassName`）= `gap-5 p-5 bg-popover/98 ring-border shadow-2xl`，
> 即内边距 20 + 大范围柔影。**它不是「创建项目」这一套**，两者不可互替；插件按本表 A5/A6 对齐。

## B. ⌘K 搜索浮层（2026-10-28 更正：**也有阴影**）

**早期结论「命令浮层无阴影」已作废。** 复测（9224，⌘K 打开）根节点 className 含 `shadow-md`，
计算值 `0 4px 6px -1px 10% 黑 + 0 2px 4px -2px 10% 黑`，与模态对话框同一套值。
当初量到「全透明」的是内层 `overflow-hidden rounded-2xl` 容器（它确实无影），根节点有影。
据此 `.dcu-search-dialog` 的 `box-shadow:none` 已改回 `var(--dcu-tip-shadow)` 并活体复核同值。
详见 03i 的阴影更正块。

## C. 浅色活体（DSH 页面恰好处于浅色主题，全量命中）

| # | 项 | 浅色实测（8 块码卡） | 判定 |
|---|---|---|---|
| C1 | 码卡底 #ffffff + 边 10% 黑 + 方角 | 残留 0 | ✅ **TA3 活体收口** |
| C2 | 码体 #ffffff/#24292e（github-light）+ radius 6 | 残留 0 | ✅ |
| C3 | 行内码 rgba(230,230,230,.5) + radius 6 无边 | ✅ | TA3 组成 |
| C4 | 设置卡 #fafafa | 令牌级（作用域 var，机制同深色已验） | 🟡 声明 |

## 待办

- ~~A5/A6 随下一个自然弹窗（归档确认等）活体细调。~~ **已收口（2026-10-28）**：A5 定案 16/20（插件无自有表单模态）；A6 复测同值；捞出的 ⌘K 阴影错案已修。
- DSH 当前主题为浅色（02:30 观测）——来源待用户确认（重启重置 or 手动切换），采样已充分利用，未擅自改回。
