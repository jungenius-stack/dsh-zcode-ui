# 批次 5 · zcode-tokens.ts / workspace-shortcuts.ts / official-slot-shadow.ts

> 审计方式：zcode-tokens.ts 为 231 项令牌映射层，ZCode 参照三源对照——
> ① 设计语言文档既有实测（tokens.json CDP 活体、01/03j/03n、04-open-gaps TR2）；
> ② app.asar 内嵌 **两套并存的主题定义**（本轮新发现）：
> hex 套 `.theme-zai-light{--color-brand:#000;...}` 与 oklch 套 `:root,:host{--color-brand:var(--color-sky-400);...}`，
> tokens.json 的 lightClass 为 `theme-zai-`（空后缀），即活页解析的是 `:root` oklch 套，
> 而本模块取值几乎逐值等于 **hex 套**（`.theme-zai-light/.theme-zai-dark`，含 2026-10-28 之后的
> input-border-focused=border-hover、interaction-confirmation #eaf7ee 等新值）——两套谁生效以活页 class 为准，
> 本批所有「ZCode 值」均注明出自哪一套；
> ③ oklch→hex 换算（node 脚本，Tailwind v4 ramp：neutral-800=oklch(26.9% 0 0)→#262626、
> neutral-300=oklch(87% 0 0)→#d4d4d4、sky-400→#00bcff、sky-500→#00a6f4）。
>
> 关键提取命令（其余同型换键名/色值）：
>
> ```
> grep -a -o '\.theme-zai-light{[^}]*}' /Applications/ZCode.app/Contents/Resources/app.asar
> grep -a -o -- "--color-toast:[^;}]*" /Applications/ZCode.app/Contents/Resources/app.asar
> python3 mmap.find(b'0 1px 2px 0 rgba(0, 0, 0, 0.05)')  # 阴影串精确检索
> ```
>
> workspace-shortcuts.ts（官方插槽注入面读取）与 official-slot-shadow.ts（官方注册波次等待）
> 为行为模块，无颜色/圆角/动效决策点，见无参照项第 5 条。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| zcode-tokens.ts | toast 浅色底（zcode-tokens.ts:245） | `--dsw-alias-toast-bg` light `#2b2b2b`（暗底白字） | `--color-toast` light `#fff`（hex 套与 :root 套两套一致）；dark `#2b2b2b` 两侧同值 | asar：`grep -a -o '\.theme-zai-light{[^}]*}'` → `...--color-toast:#fff;--color-tooltip:#f0f0f0...`；dark 块 `--color-toast:#2b2b2b` | 浅色改 `#fff`，或声明「插件 toast 恒用暗底」为刻意偏离（tokens.json 亦记 `#fff`，两套无歧义） |
| zcode-tokens.ts | 空闲状态色（zcode-tokens.ts:184,415） | `--dsw-alias-state-idle-primary` light `#a2a2a2` / dark `#5c5c5c`（中性灰） | `--color-idle-task` light `#9e77ed` / dark `#7b5ce5`（紫；surface 成对 `#f5f3ff`/`#160d38`） | asar：`.theme-zai-light` 块 `--color-idle-task:#9e77ed`、`.theme-zai-dark` 块 `--color-idle-task:#7b5ce5`（grep 全块输出） | 若该令牌表达 ZCode「idle 任务」同语义，改紫成对（色+surface）；src 内无消费点，亦可先标注 |
| zcode-tokens.ts | 选中/active 浅色档（zcode-tokens.ts:146） | `--dsw-alias-interactive-bg-active` light `rgba(13,13,13,0.08)` | `--color-selected` light `#0d0d0d0d`（黑 5%，hex 套）；04-open-gaps.md:111 TR2 已定案「浅色 hover=selected=黑 5%」 | asar：`.theme-zai-light` 块 `--color-hover:#0d0d0d0d;--color-selected:#0d0d0d0d`；04 TR2 收口记录。dark selected `#ffffff1a`=10% 与模块 dark 0.1 一致 | 浅色 0.08→0.05（与 hover 同档）；该令牌当前 src 无消费点，改动零风险 |
| zcode-tokens.ts | 阴影阶梯四档（zcode-tokens.ts:524-527） | lv1 `0 1px 2px 0 rgba(0,0,0,0.05)`、lv1-blur `0 2px 6px 0 …0.03`、lv2 `0 2px 8px 0 …0.04+0 1px 3px 0 …0.06`、lv3 `0 0 1px 0 …0.2+0 8px 24px …0.08` | 非字面继承：五条完整串 asar 精确检索 **0 命中**。ZCode 实际阴影家族：shadow-sm `0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a`；模态 shadow-md（03j A6：`0 4px 6px -1px/0 2px 4px -2px` 10% 黑）；TS 内联 `boxShadow:"0 8px 24px rgba(0,0,0,0.08)"`（与 lv3 第二层同值）；`0 2px 6px 0 light-dark(rgb(0 0 0/.1), rgb(0 0 0/.4))` | asar：python mmap 逐串检索 `0 1px 2px 0 rgba(0, 0, 0, 0.05)`/`0 2px 8px 0 rgba(0, 0, 0, 0.04)`/`0 2px 6px 0 rgba(0, 0, 0, 0.03)`/`0 0 1px 0 rgba(0, 0, 0, 0.2)` 全 0 命中；`8px 24px rgba(0, 0, 0, 0.08)` 2 命中（boxShadow 对象）；`1px 3px 0 #0000001a, 0 1px 2px -1px` 4 命中 | 模块注释自称「ZCode 等价强度」= 自拟近似。建议：lv3 第二层与 lv1 字面化（`0 8px 24px rgba(0,0,0,0.08)`、shadow-sm 串），其余标注近似口径；消费点 conversation-layout.ts 需回归目检 |
| zcode-tokens.ts | 文件 diff 行底/槽底六 hex（zcode-tokens.ts:230-235,457-462） | `#eaf7ee/#f0faf3/#fcece9/#fdf2f0`（light）、`#1f3124/#132016/#3c1f1b/#28130e`（dark） | asar 精确检索 `fcece9`/`f0faf3`/`fdf2f0` 全 **0 命中**；ZCode diff 表面由 `--diffs-bg` 体系生成（`--diffs-bg:light-dark(#fff,#000)` + color-mix 92%/98.5% buffer/context 层），无逐色 hex；`#eaf7ee` 在 ZCode 仅作 `--color-success-surface` light | asar：python mmap `fcece9`/`f0faf3`/`fdf2f0` 0 命中；`--diffs-bg-` 上下文 `light-dark(var(--diffs-light-bg,#fff),…)`；`eaf7ee` 3 命中均为 success/confirmation/remote-wsl surface | 六值为自拟派生。建议改用 `--diffs-*` 同构 color-mix 表达或注释声明派生公式（marker 色 #1e8a3e/#e03131 本身与 ZCode 一致，无需动） |
| zcode-tokens.ts | 无衬线字体栈（zcode-tokens.ts:532-533） | `system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …` | asar 两处 `--font-sans`：`-apple-system, system-ui, "Segoe UI", sans-serif` 与 Tailwind 基准 `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",…`；01-design-tokens.md:42 记录「ui-sans-serif, system-ui, sans-serif」——均无显式 CJK 族、且 `-apple-system` 在 `system-ui` 之前 | asar：`grep -a -o -- "--font-sans:[^;}]*"` 两行输出 | 顺序差异（system-ui 前置）+ CJK 兜底为 DSH 侧扩展；若非刻意，把 `-apple-system` 提回首位。中低优先 |
| zcode-tokens.ts | 边框阶梯 l1/l3/l4（zcode-tokens.ts:87,91-92） | light `rgba(13,13,13,0.06/0.12/0.16)`（dark 对应 6%/16%/20% 白） | ZCode 边框仅两档：`--color-border` 10%、`--color-border-hover` 20%（hex 套 `#0d0d0d1a`/`#0d0d0d26`、dark `#ffffff1a`/`#ffffff26`）；l2=10% ✓ 对齐 | asar：`.theme-zai-light` 块 `--color-border:#0d0d0d1a;--color-border-hover:#0d0d0d26`；`0d0d0d26` 全 asar 仅 1 命中 | l1/l3 为模块自建中间档（输入框/细线分层用）。不强制改；建议在 01-design-tokens 补一条「l1/l3/l4=插件扩展档」登记，防后人当 ZCode 值引用 |

## 一致项（回归加固建议）

| 模块 | 点 | 期望取值（两侧同值） | 证据来源 |
|---|---|---|---|
| zcode-tokens.ts | 画布底 `--dsw-alias-bg-base` | light `#f8f8f8` / dark `#161616`（hex 套 `--color-background` 两主题字面；活体 tokens.json 记 oklch(98.5%)/#161616，oklch 98.5%→#fafafa 为 :root 套，模块取 hex 套，需活页裁决但模块内部自洽） | asar：`.theme-zai-light` 块 `--color-background:#f8f8f8`、`.theme-zai-dark` 块 `--color-background:#161616` |
| zcode-tokens.ts | 前景主色 `--dsw-alias-label-primary` | light `#262626` / dark `#d4d4d4`；ZCode `--color-foreground:var(--color-neutral-800/300)`，ramp `--color-neutral-800:oklch(26.9% 0 0)`→#262626、`neutral-300:oklch(87% 0 0)`→#d4d4d4（node 换算复算） | asar：`.theme-zai-light` 块 `--color-foreground:var(--color-neutral-800)`；`grep -a -o -- "--color-neutral-800:[^;}]*"` → oklch(26.9% 0 0) |
| zcode-tokens.ts | 前景弱化阶梯 60%/40% | label-secondary 60%（light `#26262699`/dark `#d4d4d499`）、label-dimmed light 40%/dark 30%；ZCode 另有 `--lucide-subtlest-opacity:.4/.3` 双主题分档同构 | asar：`.theme-zai-light` 块 `--color-foreground-subtle:#26262699`、`--lucide-subtlest-opacity:.4`；dark 块 `#d4d4d499`、`.3` |
| zcode-tokens.ts | tooltip 三件套（bg/label/key-bg） | light `#f0f0f0/#0d0d0d/#e6e6e6`、dark `#2b2b2b/#f8f8f8/#363636`；key-bg 即 ZCode `--color-tooltip-tag` 同值 | asar：`.theme-zai-light` 块 `--color-tooltip:#f0f0f0;--color-tooltip-foreground:#0d0d0d;--color-tooltip-tag:#e6e6e6`；dark 块 `#2b2b2b/#f8f8f8/#363636` |
| zcode-tokens.ts | 状态色三对（success/destructive/warning） | light `#1e8a3e/#e03131/#e07b00`、dark `#46bf72/#ff5c5c/#ff8a30`（static green/red/amber 与 alias state-* 双写一致） | asar：`.theme-zai-light` 块 `--color-success:#1e8a3e;--color-destructive:#e03131;--color-warning:#e07b00`；dark 块 `#46bf72/#ff5c5c/#ff8a30` |
| zcode-tokens.ts | 链接/焦点环蓝 `--dsw-alias-link`、`--dsw-focus-ring-color` | light `#0b7fff` / dark `#4099ff`（=`--color-terminal-blue`，两套命名同值；03h:32、07-delivery-ledger:55 已记录 brand 等价） | asar：`.theme-zai-light` 块 `--color-terminal-blue:#0b7fff`；dark 块 `--color-terminal-blue:#4099ff`；`grep -a -o -- "--color-brand:[^;}]*"` → `var(--color-sky-400/500)`+`#000`/`#fff` 双套并存 |
| zcode-tokens.ts | 字号刻度 calc 结构（zcode-tokens.ts:554-560） | 基准 14px；2xs `-5px`、xs `-4px`、sm `-2px`、caption `-1px`、lg `+2px`、xl `+4px` 与 ZCode `--text-ui-*` 七档逐档同构 | asar：`grep -a -o -- "--text-ui-[a-z0-9]*:[^;}]*"` → 7 行 calc 串（`--text-ui-2xs:calc(var(--ui-font-size) - 5px)` 等）；display/headline/title 三档为模块扩展（注释已声明，03n A1/A2 背书基准与档位） |
| zcode-tokens.ts | 圆角标度 + panel 16px（zcode-tokens.ts:504-521） | xs2/sm4/md6/lg8/xl12/2xl16/full 999；`--dsw-radius-panel:16px` 与 03j A2「rounded-2xl=16px 已改 panel=16」一致 | asar：`grep -a -o -- "--radius-[a-z0-9]*:[^;}]*"` → `sm:.25rem/md:.375rem/lg:.5rem/xl:.75rem/2xl:1rem/full:9999px`；03j-dialog.md:10 A2 |
| zcode-tokens.ts | 等宽字体栈（zcode-tokens.ts:530-531） | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", monospace` 与 asar `--font-mono` **逐字节相同**（含 CJK 前置修复注释所述口径） | asar：`grep -a -o ".\{80\}SFMono-Regular.\{160\}"` → `--font-mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", monospace` |
| zcode-tokens.ts | hover/selected 交互态（zcode-tokens.ts:144,375,377） | hover light 黑 5% / dark 白 5%（`#ffffff0d`）；selected dark 白 10%——与 `--color-hover/--color-selected` hex 套逐值同；04 TR2 已收口背书浅色 5% | asar：`.theme-zai-light` 块 `--color-hover:#0d0d0d0d`；`.theme-zai-dark` 块 `--color-hover:#ffffff0d;--color-selected:#ffffff1a`；04-open-gaps.md:111 |

## 无参照项（不得猜）

- zcode-tokens.ts:138-140 工具栏填充 `rgba(84,85,87,0.5)`/`rgba(31,31,31,0.36)`/hover 0.6 —— python mmap 精确检索 `rgba(84, 85, 87, 0.5)`、`rgba(31, 31, 31, 0.36)` 均 0 命中；无 ZCode 例证，跳过。
- zcode-tokens.ts:563-564 自绘滚动条（宽 8px/thumb 透明度 0.15、hover 0.25、border 2px）—— asar 中 `rgba(13,13,13,0.15)` 唯一命中是内嵌页 button:hover 边框、`rgba(255,255,255,0.15)` 命中为键帽样式、0.25 命中为 mermaid，均非滚动条；ZCode 滚动条形态采集到 `::-webkit-scrollbar{display:none}`（3 处）/`scrollbar-width:thin`（1）/`auto`（2），代码区 thumb 为透明轨道+3px 圆角。且 `--dsw-scrollbar-width`/`--dsh-scrollbar-thumb-border` 在本仓 src 无消费点（grep 0 输出），双跳过。
- zcode-tokens.ts:79-83,312-316 遮罩家族（0.24/0.12/0.48/0.88/0.7）、:78,311 skeleton（0.04/0.08）、:250,476 menu-group-header-fill（0.94）—— asar 检索 `rgba(0, 0, 0, 0.24)`/`rgba(13, 13, 13, 0.04)`/`rgba(248, 248, 248, 0.94)` 全 0 命中，ZCode 无同名令牌；跳过。
- zcode-tokens.ts:77,310 文档选区色 `rgba(11,127,255,0.4)`/`rgba(64,153,255,0.4)` —— asar 检索 `rgba(11, 127, 255` 0 命中；ZCode 无同名令牌，最近似 `--color-terminal-selection` 为 `#0b7fff38`(22%)/`#4099ff47`(28%)；且该令牌 src 内无消费点（grep 仅定义处）。角色映射存疑，跳过。
- workspace-shortcuts.ts 与 official-slot-shadow.ts 全部行为决策（`locale==='workspace'` 官方面识别、searchRequest 历史请求不回放、官方注册 3000ms 有界超时兜底）—— 无视觉设计点；对应官方实现在 minified bundle 中无法定位同型参照（asar 检索插槽名/注入面无稳定锚点）。无 ZCode 例证，跳过。
