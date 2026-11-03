# 批次 10 · foreign-surface-discovery.ts / PluginConfigSection.tsx / workspace-drop-indicator.ts / document-hidden-motion-pause.ts / DesktopNavigationControls.tsx

> 审计方式：五模块中 DesktopNavigationControls 为视觉密集（标题栏导航钮全套样式），
> workspace-drop-indicator 为几何+配套样式（样式本体在 CodexWorkspaceBrowser.tsx:325-327，属本批对账范围），
> document-hidden-motion-pause 为 ZCode 逐字移植件，foreign-surface-discovery 为刻度哨兵（刻度集 + 内部性能预算），
> PluginConfigSection 为纯接线（无视觉决策点）。
> 参照文档：03e-header（顶栏钮）、03n-typography（字号刻度）、02-motion（微交互/图标）、03b-sidebar（行/hover 令牌）；
> 04-open-gaps.md 仅按需 grep：`desktop-navigation`/`dcu-wb-drop`/`拖拽落`/`foreign-surface`/`外来表面`/`PluginConfig`/
> `官方插件`/`document-hidden`/`opacity-35`/`导航钮`/`taskNav` **全部 0 命中** → 本批无已裁决的刻意偏离可援引。
> asar 提取：python 单遍扫描（等价 `grep -a -o`，附命中字节偏移可复核，原因同 batch-6：环境 grep 为 ugrep，
> 带上下文模式报「exceeds complexity limits」）。关键命中：@332987332（document-hidden JS）、@326226533（其 CSS）、
> @331023603（顶栏钮组件 h4）、@293659400+@293661824（按钮 cva ghost/icon-md）、@331026626（topoverlayer 容器）、
> @328643716/@328646774（ZCode project-drop-indicator）、@310466349（taskNav.* i18n）、@325563128（navigateBack/Forward 键位）。
> 本批未做活宿主 CDP 实测。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| DesktopNavigationControls.tsx | 按钮圆角（:7） | `border-radius:50%`（圆形） | icon-md 档 = `size-7 rounded-lg`（28×28 + 8px 圆角） | asar@293661824 `"icon-md":\`size-7 rounded-lg [&_svg…]:size-4\`` | 改 8px（与 03e H5「顶栏按钮 28×28/8px」同族） |
| DesktopNavigationControls.tsx | 悬停底色（:8） | `--dsw-alias-interactive-bg-hover`（浅 黑5% / 深 白5%，zcode-tokens.ts:144/375） | ghost = `hover:bg-hover`：浅 `--color-hover:var(--color-neutral-200)`（实色）、深 = surface-hover `#ffffff1a`（白 10%） | asar@293659400 ghost variant；asar@325832699/326228788 双主题 `--color-hover`；asar `.dark{--color-surface-hover:#ffffff1a}`（本批直提） | 深色先对齐 白10%（03b §5 已定案同值）；浅色 neutral-200 vs 黑5% 需裁决 |
| DesktopNavigationControls.tsx | 禁用态（:9） | `opacity:.35;cursor:default` | 按钮基类 `disabled:pointer-events-none disabled:opacity-50` | asar@293659400 基类串；`opacity-35` 在 ZCode 刻度内但用于日历禁用格（asar@331085254 `cursor-not-allowed … opacity-35`） | 对齐 50；ZCode 该处 cursor 为 not-allowed |
| DesktopNavigationControls.tsx | 图标颜色（:7） | `--dsw-alias-label-secondary`（60% 前景） | ghost = `text-foreground`（全前景） | asar@293659400 ghost variant；03b §5 foreground=oklch(.87) | 改全前景（02-motion 图标色教训同源：淡是容器 opacity，不是子元素色） |
| DesktopNavigationControls.tsx | hover 过渡（:7-9） | 无 transition（背景瞬跳） | 基类 `transition-colors`（默认 150ms 档） | asar@293659400；02-motion §1 微交互 150ms ease-out | 补 transition-colors |
| DesktopNavigationControls.tsx | 按钮间距（:6） | `gap:8px` | 行容器 `gap-1` = 4px | asar@331027100 `flex items-center gap-1 shrink-0 [app-region:no-drag]` | 改 4px |
| DesktopNavigationControls.tsx | focus 可见性（:10） | `outline:2px solid …;outline-offset:-2px`（内缩） | 组件级 focus outline 均外扩：offset 2px（wf-tile/composer 滑块）~4px（settings 重绑钮）；ghost 按钮基类 `outline-none` | asar@326268655、@325816805、@332607318；asar@293659400 `outline-none` | offset 方向对齐外扩；环色 --color-ring 定义未提取到（见无参照） |
| DesktopNavigationControls.tsx | tooltip 快捷键标注（:23） | 仅 `title`=文案 | h4 tooltip 携带 `shortcut`（goBack/ForwardShortcutLabel；键位 ⌘[ / ⌘]） | asar@331023603 h4 定义（title,shortcut→Dv）；asar@331026626 props；asar@325563128 `navigateBack`=`CmdOrCtrl+[` | tooltip 补快捷键标注（与 ZCode h4 同构） |
| DesktopNavigationControls.tsx | 层级（:6） | `z-index:30` | topoverlayer 容器 `z-20` | asar@331026626 `absolute h-14 … z-20` | 层级语境不同（插件浮在宿主标题栏上），裁决保留或对齐 |
| DesktopNavigationControls.tsx | EN 文案（locales.ts:324-325） | `Back`/`Forward` | `Go back`/`Go forward` | asar@310930800 taskNav.back/forward EN | 随 zh 对齐一并裁决（zh 已同值，见一致项） |
| workspace-drop-indicator.ts（样式在 CodexWorkspaceBrowser.tsx:325） | 落点线颜色 | `--dsw-alias-state-business-primary` = #000/#fff（zcode-tokens.ts:122/353，随主题翻转） | `bg-icon-blue` = terminal-bright-blue = sky-500 `oklch(68.5% .169 237.323)`（蓝） | asar@328643716 `bg-icon-blue`；asar `--color-icon-blue:var(--color-terminal-bright-blue)` → `var(--color-sky-500)` → oklch 值（本批直提） | 改蓝色（可用 DSH 蓝 accent 系令牌） |
| workspace-drop-indicator.ts | 落点线左缩进（:61-62 + CodexWorkspaceBrowser.tsx:326） | 线自行锚点左 10px（+4 容器 +6 线内衬）、右 8px（−12 + right:0） | `left-5`(20px) / `right-2`(8px) | asar@328643716 `left-5 right-2` | 右缩进已同值；左缩进按 20px 对齐或声明随行内布局适配 |

## 一致项（回归加固建议）

| 模块 | 点 | 期望取值（两侧同值） | 证据来源 |
|---|---|---|---|
| document-hidden-motion-pause.ts | data-document-hidden 机制逐字同构（:32,46-57） | 属性名 `data-document-hidden`、挂 `documentElement`、`toggleAttribute(visibilityState==='hidden')`、装载即同步一次、visibilitychange 驱动、卸载 `removeAttribute` | asar@332987332 `L1n=\`data-document-hidden\`;…toggleAttribute(L1n,e.visibilityState===\`hidden\`)…removeAttribute(L1n)`（本批 python 提取复核） |
| foreign-surface-discovery.ts | SKIN_RADII 圆角刻度（:65） | 0/2/4/6/8/12/16/999/50% ⊇ `--dsw-radius-*` 刻度 2/4/6/8/12/16/999；ZCode 实测锚点：顶栏钮 8px（03e §1）、列表行 8px（03b §1）、操作行钮 6px（02-motion 图标表） | zcode-tokens.ts:504-521 + 03e/03b/02-motion |
| foreign-surface-discovery.ts | SKIN_SIZES 字号刻度（:68-70） | 界面七档 9/10/12/13/14/16/18（ZCode `--text-ui-*` sm12/base14/lg16/xl18 + 2xs 9）；展示三档 20/22/34 为 2026-10-13 已声明的 DSH 制度化扩展 | 03n §A（asar 双源）；zcode-tokens.ts:537-560 |
| DesktopNavigationControls.tsx | 按钮尺寸 28×28（:7） | `width/height:28px` = icon-md `size-7` | asar@293661824 |
| DesktopNavigationControls.tsx | 图标 16×16（:25） | svg 16×16 = icon-md `[&_svg:not([class*='size-'])]:size-4`、按钮图标 `className:\`size-4\`` | asar@293661824、@331028115 |
| DesktopNavigationControls.tsx | 中文文案「后退/前进」（locales.ts:14-15） | `navigation.back/forward` = `taskNav.back`=后退 / `taskNav.forward`=前进 | asar@310466349 |
| DesktopNavigationControls.tsx | aria-label 与 title 同值 + disabled 绑定（:22-24） | `aria-label=t(…)`、`title=t(…)`、`disabled=!canBack/!canForward` = h4 `{title:N,ariaLabel:N,disabled:!m}`（m=canTaskNavBack） | asar@331028115、@331026626 |
| DesktopNavigationControls.tsx | `-webkit-app-region:no-drag`（:6-7） | h4 按钮 className 与行容器均含 `[app-region:no-drag]` | asar@331023603、@331027100 |
| DesktopNavigationControls.tsx | 左定位 12px（:6） | `left:12px` = A 态（Windows 桌面）行容器 `pl-3` | asar@331027100 `A&&\`pl-3 ml-px\`` |
| workspace-drop-indicator.ts | 落点线形态（CodexWorkspaceBrowser.tsx:325-327；workspace-drop-indicator.ts:70） | 2px 线（::before height:2px + 圆角 full）+ 8px 圆点 2px 边框（::after 8×8/border 2/50%）+ `aria-hidden` | asar@328643716 `h-0.5` 线 + `size-2 … border-2` 圆点 + `aria-hidden` |

## 无参照项（不得猜）

- foreign-surface-discovery.ts 哨兵预算参数（SCAN_BUDGET_MS=8 :76、SAMPLE_PER_PREFIX=4 :85、REPORT_DELAY_MS=400 :88）与前缀登记表（KNOWN_FOREIGN_ROOTS :45-62）—— DSH 侧哨兵与生态登记，ZCode 是宿主本体、无对应物；08-performance-audit.md 无 8ms/400ms 预算条目（grep 仅 p95 帧记录）→ 无 ZCode 例证，跳过。
- workspace-drop-indicator.ts 测量策略（rAF 逐帧重测 :93、±4px 中点与 0.5px 容差 :43-57、双落点冲突告警 :78-84）—— ZCode 侧只见静态 indicator 元素类（asar@328643716/328646774），测量/决策逻辑不可提取 → 跳过。
- DesktopNavigationControls.tsx Windows 标题栏适配面（`--dsh-windows-titlebar-height,40px` 定位 :6、`--dsh-windows-menu-start:84px` :11、全屏隐藏 :12）—— asar `data-windows-titlebar`/`windows-menu-start` 0 命中 → DSH 宿主扩展，无 ZCode 例证，跳过。
- DesktopNavigationControls.tsx 图标形状与描边（16-viewBox 长箭头 path、strokeWidth 1.5 :25-26）与 focus 环颜色（`--dsw-focus-ring-color` #0b7fff/#4099ff，zcode-tokens.ts:261/487）—— Bo/Vo 为压缩名无法绑定具体图形；ZCode 导航钮图标描边无 CDP 实测；`--color-ring:` 定义在 asar 中未提取到（仅见 `var(--color-ring)` 消费点）→ 无参照，跳过。
- PluginConfigSection.tsx 整体机制（FORWARDED_CONFIG_SLOTS 插槽白名单 :18-26、SlotEntryBoundary 单卡隔离 :43-47、`data-slot`+`display:contents` :113）—— asar `renderSlot`/`plugin-config` 0 命中；ZCode 官方插件页是本体、无「副本+插槽注入」对应物 → DSH 生态扩展，跳过。
