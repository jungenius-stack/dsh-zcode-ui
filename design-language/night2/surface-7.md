# night2 · surface-7 · 焦点与键盘（焦点环形态 / Tab 序 / roving / 快捷键提示）

> 深挖员：surface-7。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 主对照文件：`uiplug/src/client/tree-keyboard.ts`、`settings-focus.ts`、`input-history-keyboard.ts`；连带 `input-history.ts`、`InputHistoryDock.tsx`、`shortcut-catalog.ts`、`workspace-shortcuts.ts`、`CodexSettingsPage.tsx`、`CodexSidebar.tsx`、`CodexWorkspaceBrowser.tsx`、`zcode-skin.ts`、`zcode-theme.ts`、`locales.ts`。
> 前置已读：`night-audit/APPLIED.md`（批次 20 已更正「焦点环来源」注释、§二已把**焦点色**列为需活体重采——本文不重复报）；`design-language/README.md`；`04-open-gaps.md` G2（键盘焦点环 ✅ 已闭环：真实 Tab → outline solid 2px）。
> surface-2 已报键帽芯片（Kbd/qy）与菜单 shortcut（nx）、surface-3 已报对话框 esc/⏎ 提示与 `settings-focus.ts` 无参照判定——本文只交叉引用，不重复报。

## 0 · 提取方法（本轮实跑，可复现）

```bash
python3（asar pickle 头，u32=(4,8328596,8328592,8328585)）
  → /out/renderer/assets/styles-NK68EN_n.css  480065B
  → /out/renderer/assets/styles-Dv5E6Odo.js  6839502B
  提取到 /tmp/night2-s7/{styles.css, main-bundle.js}
shasum：styles.css = 5fdc1e11394c5d61c3199a0f91a58f1307661d66
        main-bundle  = d5eccafb2188b1d2fdc27d24c632958291909547
  与 surface-2 本轮缓存（/tmp/night2-s2）逐字节一致 → 基线未漂移。
全 asar 穷尽验证：grep -a -c -- '--color-ring:' app.asar → 0（定义不存在）。
```

下文「css」= `/tmp/night2-s7/styles.css`、「js@N」= `/tmp/night2-s7/main-bundle.js` 内字节偏移。主题块序（本轮实测）：`:root,:host`@~3708 起、`.dark,.theme-zai-dark`@395164、`.theme-zai-light`@429610、`.theme-zai-dark`@437336 → zai 覆盖档生效。

## 1 · 结论速览

- **焦点环形态全表（css 67 条 `:focus-visible` 工具类 + 3 条裸规则）**：ZCode 主力形态 = `outline-none + ring-2 + ring-input-border-focused`（js 45 处，无 offset）；输入类不走环 = 边框/底色换档 + `ring-0`；文件树行 = 1px 边框变色；`ring-offset-2` 仅 4 处、`outline-offset-4` 仅 2 处。**最大反直觉发现：`--color-ring` 全 asar 0 定义**，`ring-ring/border-ring/outline-ring` 系（js 约 60 处类串）编译产物为 0 → **运行时死类**；`var(--color-ring)` 两处裸用（composer-thought-slider、wf-tile）按 CSS 规则回落 initial（不可见）。zai 主题下 `--color-input-border-focused` = `var(--color-border-hover)`（浅 #0d0d0d26 / 深 #ffffff26），**不是** brand 蓝——更正 CodexSidebar.tsx:566 与 zcode-skin.ts:79 两处注释。
- **roving**：ZCode 侧栏任务行 = `role:button + 每行 tabIndex:0 + 仅 Enter/Space`（js `me` handler）；文件树 = `role:treeitem + 每行 tabIndex:0 + 仅 ←→/Enter`（js `ve` handler），均无 ↑↓/Home/End、无 aria-level。插件 tree-keyboard.ts 是 APG 超集（roving + 全方向键 + aria-level），**不是偏差，是主动超越**——登记不修。
- **输入历史**：ZCode **有**同构功能（composer `promptHistory` prop + Lexical 插件 `zYt`，localStorage `zcode-chat-prompt-history:<scope>`，30 条）——守卫（修饰键/IME/空草稿进入/编辑即退出/不环绕/连续去重）与插件 input-history-keyboard.ts 逐条对上，唯二差：上限 30 vs 200、↓-从空草稿行为。
- 差异 8 条（mechanical 3 / deviation 4 / needs-live 1）。

## 2 · ZCode 真值（本轮全量提取）

### 2.1 焦点环形态全表（css 编译产物逐条核实）

| 形态 | 编译产物 / 类串 | js 使用量 | 有效色（zai 主题） |
|---|---|---|---|
| **主力 ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-input-border-focused`（整串出现在 js 组件类里 45 处；少数小控件用 `ring-1`） | 45（ring-1 版 ~4） | `--color-input-border-focused`：`:root`/`.dark` 基档 = `var(--color-brand)`；**zai-light/zai-dark 覆盖 = `var(--color-border-hover)`** = 浅 `#0d0d0d26` / 深 `#ffffff26`。ring 宽 2px、无 offset（`--tw-ring-offset-width` 默认 0） |
| ring + offset | `…ring-input-border-focused ring-offset-2 ring-offset-background/card` | 4（其中 2 处配色是死类 ring-ring，实际有效仅 2） | 同上 + offset 2px，offset 色 = background/card |
| **输入焦点（非环）** | `focus-visible:border-input-border-focused focus-visible:bg-input-focused focus-visible:ring-0`（Input/Textarea/Select cva `input` variant，js@453624 等） | cva 全家 + 各调用点 | zai 主题：边框→border-hover（15% 中性），**bg 不变**（zai 两主题 `--color-input-focused:var(--color-input)`，css@430961/438631）；基档 bg 变 neutral-50/950 |
| 搜索壳 focus-within | `focus-within:border-input-border-focused focus-within:bg-input-focused`（⌘K 命令中心壳，js@~210 万） | 若干 | 同上 |
| **文件树行** | `outline-none … focus-visible:border-border-hover`（`role:treeitem` 行，js@~250 万）+ 选中态 `border-input-border-focused` | 1 族 | 1px 边框变色，无 outline/ring |
| **侧栏任务行** | `group/task-row`（`jbt`，js@2217662）：`rounded-lg border border-transparent …`，**无 focus-visible 类** | 每行 `role:button tabIndex:0` | UA 默认焦点环（Chrome auto） |
| Button | 基座 `outline-none`；仅 destructive `focus-visible:border-destructive/40 ring-destructive/20`、warning 同构（button-DeDmlciX.js 全文） | — | 红钮才有焦点环，其余变体无 |
| outline 系 | `focus-visible:outline-2 outline-primary` ×1（link 类）；`outline-2 outline-offset-4` ×2（设置页快捷键重绑钮，js@6327 k e$n：`disabled:cursor-not-allowed` 语境，outline 色缺省 = currentColor）；`outline-hidden`（=2px 透明 outline 保位）用于命令输入 | outline-2×4 / offset-4×2 | — |
| ring-3px（Tabs 触点） | `focus-visible:border-ring ring-[3px] ring-ring/50 outline-1 outline-ring` | 4+ | **border-ring/ring-ring/outline-ring 全是死类**（编译 0 条）→ 实际渲染 = 3px currentColor 环（`var(--tw-ring-color,currentcolor)` 回退） |
| 裸规则 2 处 | `.composer-thought-slider:has(input:focus-visible){outline:2px solid var(--color-ring);outline-offset:2px}`（css@348 附近）；`.wf-tile:has(.wf-tile-hit:focus-visible){outline:2px solid var(--color-ring)}`（css@457072，另有 40% color-mix 变体） | — | `--color-ring` 未定义 → 声明 invalid-at-computed-value-time → **outline 回落 initial（不可见）**。ZCode 自身死令牌 |

### 2.2 Tab 序与 roving

- **侧栏任务行**（js `Kxt` 组件，`role:button` + `tabIndex:0`，拖拽中 `tabIndex:void 0`）：键盘 = `me = e => { e.target===e.currentTarget && (e.key!=='Enter' && e.key!==' ' || (e.preventDefault(), le())) }` —— **仅 Enter/Space**。行基类 `jbt = 'flex min-h-7 w-full min-w-0 flex-col justify-center rounded-lg border border-transparent pl-2.5 pr-1 text-left text-ui-base transition-[background-color,border-color,color,opacity]'`。
- **工作区文件树**（唯一 `role:treeitem`，js@~250 万）：每行 `tabIndex:0`；容器 `role:tree` + 虚拟化；键盘 `ve`：Enter 开/切换、`ArrowRight`(目录) 展开（含过滤递归）、`ArrowLeft`(展开目录) 收起；**无 ↑↓、无 Home/End、无 aria-level、无 roving**——纵向移动靠 Tab（每行都是 Tab 站）。
- **Radix RovingFocusGroup**：vendor 内部仅 1 份（`Mm='RovingFocusGroup'`，js@384843 区），服务 Tabs/RadioGroup/ToggleGroup；`aria-activedescendant` 3 处 = cmdk 命令面板、combobox、Lexical 编辑器。业务代码无手写 roving。
- **手写焦点移动器先例 ×1**：远程服务器列表面板（js@5984800）`onKeyDown` 里 `querySelectorAll('button:not(:disabled)')` + `(indexOf(activeElement)±1+len)%len` 环绕 focus —— ZCode 业务层确有「列表内 ↑↓ 移焦点」先例（形态是移动器，非 roving tabindex）。
- **Tab 序管理**：无全局手写 tab 序；靠 DOM 序 + Radix FocusScope（对话框）+ 零散 `tabIndex:0/-1`（29 处 0 / 11 处 -1）。负 tabIndex 多为 vendor（隐藏测量输入、cmdk list `tabIndex:-1`）。

### 2.3 输入历史（composer promptHistory，ZCode 同构功能全规格）

- **存储**：localStorage 键 `zcode-chat-prompt-history:<scope>`（js `AXt`/`MXt`）；读 `mJ`：JSON 数组 → 过滤非字符串 → trim → 去空 → **`slice(-30)`**（`NXt`）；写 `PXt` 同样归一化 30。
- **写入时机**：发送流程内 `sYt(R, c)`（js@3060434）：`sYt(e,t,n=30){ r=t.trim(); if(!r || e.at(-1)?.trim()===r) return [...e]; return [...e,r].slice(-30) }` —— trim 后**连续去重**、30 条封顶。
- **召回插件 `zYt`**（js@~307 万 + cYt@3060570）：Lexical `KEY_ARROW_UP_COMMAND`(UU)/`KEY_ARROW_DOWN_COMMAND`(WU)，优先级 3。
  - 守卫：`disabled || shiftKey || ctrlKey || metaKey || altKey || isComposing` → 不处理；当前游标为 null 且**草稿非空** → 不处理（只从空草稿进入）。
  - 游标 `cYt`：↑ 从 null → 最后一条；↑ 继续向 `max(i-1,0)` **钳制不环绕**；↓ 到底 → `{nextIndex:null, nextValue:''}` **清空回草稿**；**↓ 从空草稿（null）也会召回最后一条**。
  - 召回落文本：值按**双空格 split 成多段**，逐段建 paragraph，`selectEnd()`。
  - 编辑即退出：update listener 里 `Zq(editorState)!==e[o]` → 游标归 null。
- 传参链：`promptHistory:Hn`（nXt，js@3352240）→ 两层中转（js@3086991/3089525）→ 内层 `zYt{entries}`；`hasPromptHistory` 仅进日志。

### 2.4 快捷键提示全形态（清单，详细规格见 surface-2/3 已收录部分）

| 形态 | 规格 | 证据 |
|---|---|---|
| 设置页键位芯片 | `QQn = Kbd(qy) + pointer-events-none min-w-4 select-none justify-center gap-1`；分组 `$Qn = div[data-slot=kbd-group] inline-flex gap-1`（js@6326976/6327114）；重绑钮 = `focus-visible:outline-2 outline-offset-4`（唯一 offset-4 消费者，`e$n` 行组件） | js@6326976/6327114 区 |
| 键位符号格式化 | mac：`⌃ ⌥ ⇧ ⌘` + 主键，**空格连接**；非 mac：`Ctrl/Alt/Shift + 主键`，`+` 连接（js@1634969 `tA/grt`）；另一处映射 `A7t`（⌘⇧⌥⌃，无分隔连接，js@3778233）；保留键全集含 F1-F12/方向键（js@6325147，`CmdOrCtrl+m` 保留） | js@163 万/@377 万 |
| 对话框 esc/⏎ | `font-mono text-ui-base text-foreground-subtle` 的 `esc` + 确认钮内 `⏎`（`text-primary-foreground/60`，destructive 用 `text-destructive-foreground/60`）；`showKeyboardHints:false` 可关 | surface-3 §1.4 已收录，js@6488955/6480074 复核 |
| 菜单 shortcut | 纯文字 `ml-auto text-ui-xs tracking-widest text-foreground-subtlest`（高亮态转 subtle） | surface-2 §2.4（nx）已收录 |
| ↵/Esc 工具函数 | `Ul('↵')` / `vNe()='Esc'`（js@892179 区）用于 utility-button aria-label | js@89 万 |
| 占位符 ↑↓ 提示 | **不存在**：`↑` 全 bundle 仅 1 处命中 = HTML 实体表（js@507578） | 穷尽搜索 §5 |

## 3 · 差异表（8 条：mechanical 3 / deviation 4 / needs-live 1）

| # | where | item | ours | zcode | kind | 证据 |
|---|---|---|---|---|---|---|
| 1 | CodexSidebar.tsx:566-568 + zcode-skin.ts:79-80（仅注释） | `--color-input-border-focused` 的映射描述 | 两处注释均写「映射到 var(--color-brand)／最近的参照是 brand 蓝 oklch(74.6% .16 232.661)」 | **zai-light/zai-dark 覆盖档 = `var(--color-border-hover)`**（浅 `#0d0d0d26` / 深 `#ffffff26`）；brand 蓝只在 `:root,:host`/`.dark` 基档。另「ring-offset-2」非主力形态（45 处主力无 offset，offset 仅 4 处且 2 处配色为死类） | **mechanical**（仅注释，零行为） | css 4 处定义逐一验块：@17595 `:root`、@418455 `.dark` = brand；@431096 zai-light、@438766 zai-dark = border-hover；块序 zai > 基档。ring-offset-2 计数见 §2.1 |
| 2 | input-history.ts:9（`limit = 200`，InputHistoryDock.tsx:103 未覆写） | 每 scope 历史条数上限 | **200** | **30**（写 `sYt(e,t,n=30)`、读 `NXt` `slice(-30)` 双处一致） | **mechanical** | js@3060434 `sYt`、@3060434 前 `NXt`；插件常量 :9 |
| 3 | input-history-keyboard.ts:26（`direction !== -1 … return undefined`） | ↓ 键从空草稿的行为 | no-op（必须先 ↑ 才进入历史） | **↓ 从空草稿也召回最后一条**（`cYt(e,null,'down')` → `{len-1, e[len-1], shouldHandle:true}`） | **mechanical**（小；对齐后 ↓-空草稿=显示最近一条，再 ↓ 清回草稿） | js@3060570 `cYt` 全文 + zYt 守卫 `c===null&&s.length>0` 仅拦非空草稿 |
| 4 | CodexWorkspaceBrowser.tsx:300 `.dcu-wb-rename-input:focus` | 输入框焦点形态 | `border-color:var(--dsw-focus-ring-color,var(--dcu-focus))` + `box-shadow:0 0 0 1px 同色`（brand 蓝 1px 边+1px 影 = 2px 双环） | 输入焦点 = **边框换 `input-border-focused`（zai 下 15% 中性 border-hover）+ `ring-0`，bg 不变**（zai `--color-input-focused:var(--color-input)`）；无 box-shadow 环 | **deviation**（触 APPLIED §二「焦点色需活体重采」裁决域 + G2 域；ZCode 真值已存档，活体定色后一并落） | css@430961/438631；js@453624 Select cva `input` variant；js@4547498 等调用点 `focus-visible:border-input-border-focused focus-visible:bg-input-focused focus-visible:ring-0` |
| 5 | CodexWorkspaceBrowser.tsx:361（`.dcu-wb-session:focus-visible` 等 4 选择器） | 行焦点环形态 | `outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:-2px;border-radius:var(--dsw-radius-md)` | 文件树行 = `outline-none` + `focus-visible:border-border-hover`（1px 边变色）；侧栏任务行 = 无 focus-visible 类（UA 默认环）；ZCode 全 css **无负向 outline-offset**（全集 = 2px×6 + 4px×1） | **deviation**（G2 已闭环 04-open-gaps:1815「outline solid 2px」+ zcode-skin.ts:70-75 宿主指针模态约束 `html[data-input-modality=pointer] :focus-visible{outline-color:#0000}`——插件吃宿主机制，形态不可自选） | js@~250 万 treeitem 行类串；css outline-offset 全集 grep（§0 命令可复现）；04-open-gaps.md:1815 |
| 6 | tree-keyboard.ts:87-96（roving）+ :65-75（aria-level）+ :158-201（方向键） | 树键盘模型 | roving tabindex（全树 1 个 Tab 站）+ ↑↓←→/Home/End + aria-level + presentation 归一 | 文件树每行 `tabIndex:0` + 仅 ←→/Enter；任务行 `role:button tabIndex:0` + 仅 Enter/Space；无 aria-level | **deviation**（插件是 APG 超集、主动超越；改=降级无障碍。tree-keyboard.ts:1-33 头注释即设计裁决；Radix RovingFocusGroup 在 ZCode 只服务 vendor 组件） | js `me`/`ve` handler 全文（§2.2）；`role:treeitem` 全 bundle 1 处 |
| 7 | CodexSidebar.tsx:158 `.dcu-menu-kbd`（20px 芯片） | 菜单键帽形态 | 芯片：h20/p4/r-sm/底 `--dcu-surface` | 菜单 shortcut = **纯文字** `ml-auto text-ui-xs tracking-widest text-foreground-subtlest`（芯片只用于 tooltip/设置页） | **deviation**（surface-2 差异 #7 已登记，菜单面属批次 2/15 域——本轮仅交叉引用，不计入新账） | surface-2 §2.4 nx；js@6326976 QQn 仅设置页消费 |
| 8 | CodexWorkspaceBrowser.tsx:361 `--dsw-radius-md` | 焦点环圆角 resolved 值 | 宿主令牌，静态无 resolved 值 | ZCode 行焦点形态根本不用圆角令牌（边框变色随行 `rounded-lg`=8px） | **needs-live** | `grep -rn -- '--dsw-radius-md:' uiplug/src` 静态 0 定义（同 surface-2 #9 情形）；9224 活体 `getComputedStyle(会话行).borderRadius` 后销案 |

## 4 · 已对齐表（本轮逐条验证，非沿用旧账）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| IME 守卫 | `composing/isComposing/keyCode 229`（input-history-keyboard.ts:22） | zYt `o.isComposing`；重命名 KI `compositionActive`（surface-3 M14 已落） | js@307 万 zYt；input-history-keyboard.ts:22 |
| 修饰键守卫 | `ctrl/meta/alt/shift` 全拦（:22） | zYt `shiftKey||ctrlKey||metaKey||altKey` 全拦 | 同上 |
| 从空草稿进入 | `draft!==''` 即跳过（:25） | `c===null && s.length>0 → return false` | js@307 万 zYt 守卫 |
| 编辑即退出历史 | `input` 事件且非自写 → `cursor.reset()`（:18-19）+ move 时 `draft!==this.displayed` 复位（input-history.ts:54） | update listener `Zq(editorState)!==e[o] → 游标 null` | js zYt listener 段 |
| 游标不环绕 | `index = clamp(0, len, index±d)`（input-history.ts:61） | `max(t-1,0)` 钳制；`t>=len-1` ↓ 归 null | js@3060570 |
| ↓ 到底回草稿 | `index===entries.length → 返回 original 并 reset`（:62-65） | `{nextIndex:null, nextValue:''}` | 同上 |
| 仅连续去重 | `previous.at(-1)===text` 跳过（input-history.ts:28） | `e.at(-1)?.trim()===r` 跳过 | js@3060434 sYt |
| 发送成功才入库 | `phase submitting→plain && draft===''` 才 add（InputHistoryDock.tsx:66-68） | 发送流程内 `PXt(N,z)` | js@3335705 区 |
| Enter/Space 激活行 | `key==='Enter'||' '` + `preventDefault`（CodexWorkspaceBrowser.tsx:964 onKeyDown） | `me`：Enter/Space → preventDefault + 激活；文件树 `ve`：Enter | js Kxt/ve |
| Esc 关面板先让位浮层 | `settingsOverlays().length===0` 才关设置（CodexSettingsPage.tsx:170-174） | composer `Ae`：`target.closest('[role="dialog"]')` 让位（语义同向） | js@rel 13673（§2.2 提取段） |
| 归档弹窗焦点初始位/还焦 | surface-3 A8/A9 已验 | Radix 同语义 | surface-3 §4 |
| Kbd 芯片规格（tooltip/设置域） | — | qy：h16/px6/r6/10px/tag 底 | surface-2 §2.4（不重复报） |
| 对话框 esc/⏎ 提示 | — | `esc` mono + `⏎ /60` | surface-3 §1.4（不重复报） |
| 焦点环 2px solid 形态 | outline 2px solid（G2） | — | 04-open-gaps.md:1815 闭环 |
| reduced-motion | 插件 RM 双保险（zcode-theme.ts:220-222 等） | 文件树行有 `motion-reduce:transition-none`（js 类串）；对话框基座无 RM——插件超出 | js@~250 万行类串 |

## 5 · 无参照表（附穷尽搜索记录，均本轮实跑）

| 项 | ours | 搜索记录（命令/命中） | 判定 |
|---|---|---|---|
| `aria-keyshortcuts` | CodexSidebar.tsx:931/964、CodexWorkspaceBrowser.tsx:403-404 经宿主目录（shortcut-catalog.ts:14 `aria` 字段）设置 | js `aria-keyshortcuts` **0 命中** | 插件超出 ZCode（a11y 增强），保留 |
| 占位符「↑↓ 翻历史」提示（InputHistoryDock.tsx:14-28，locales.ts:67/379） | placeholder::after 提示 + 560/640px 断点隐藏 | js `↑` 全文仅 1 处（HTML 实体表@507578）；`uarr` 同表；无任何 ↑↓ 提示 UI | ZCode 无对应 UI；功能增强保留。ZCode 的历史可发现性只靠 `hasPromptHistory` 日志 |
| settings-focus.ts + CodexSettingsPage 焦点陷阱（wrapFocus/keepFocus/Escape，:170-210） | 手写 Tab 环绕 + 焦点回流 + inert 隔离 | ZCode 业务层无手写 trap（Radix FocusScope vendor 承担）；唯一先例 = 远程服务器列表 ↑↓ 焦点移动器（js@5984800，列表内移动非陷阱） | surface-3 §5 已判「无 ZCode 参照」，维持；本轮补充该先例存档 |
| 扩展面板 tabIndex 门控（CodexSidebar.tsx:946 `extensionsOpen?0:-1`） | 收起时 7+ 个子钮出 Tab 序 | ZCode 折叠 = display:none（css `.dcu-wb-section-body[data-open=false]` 同款）/虚拟化不渲染 → 天然离序；插件面板 grid-rows 收起非 display:none，门控是宿主适配 | 无同构机制，保留 |
| `--color-ring` 死令牌 + `ring-ring/border-ring/outline-ring` 死类 | 无对应物 | 全 asar `--color-ring:` 0 定义；`\.ring-ring` 编译 0 条；js 类串 ring-ring/20-50 ≈41 处、border-ring 6、outline-ring 8；裸用 2 处（css@348/@457072） | ZCode 自身构建缺陷，**观察勿模仿**；若插件未来引 `ring` 语义，颜色必须显式给值 |
| 输入历史存储参数（键名 `michengai.codex-ui.input-history.v1`、单条 8000 字符、总量 1MB、20 scope、200→M2 改 30） | input-history.ts:1-4,17 | ZCode 键 `zcode-chat-prompt-history:<scope>`、无单条长度上限、多行以双空格编码（zYt 召回 `split('  ')` 重建段落） | 键名/容量为插件自有实现（跨产品不共键），保留；多行编码差属插件实现细节（插件存原始文本，行为等价） |
| ZCode 侧 Tab 序整体管理 | 无手写 tab 序 | js `tabIndex:` 0×29 / -1×11 / 条件式 ~15 处，全为组件内局部语义；无全局序列 | 两端同策略（DOM 序 + 局部 0/-1），无差异可报 |
| 树行 `role="presentation"` 归一化（tree-keyboard.ts:58-62） | 纯结构 div 强制 presentation | ZCode 文件树结构层未做该归一（treeitem 归属靠虚拟化平铺） | 插件 a11y 增强，保留 |

## 6 · 复核清单（供落地轮，不动手）

1. 差异 #1 纯注释（两个文件各一处），落码后跑 `node tests/run-assertions.mjs` + `node scripts/gate.mjs`。
2. 差异 #2/#3 动 input-history 行为：#2 改常量后需回归「200 条历史截断」相关测试；#3 改后需真机（9223/9224）验「空草稿 ↓ 显示最近一条、再 ↓ 回空」+ IME/修饰键不误触。
3. 差异 #4/#5 待 9224 活体定焦点色后一并处理（APPLIED §二「焦点色需活体重采」销案时同步）。
4. 差异 #8：活体 `getComputedStyle` 读会话行 `border-radius`。
5. 文档轮建议：`01-design-tokens.md`/`tokens.json` 补一行「`--color-ring` 未定义（死令牌）、ring-ring 系未编译」防未来误引（本轮不改文档）。

## 复核

> 复核员·7。日期 2026-11-03。只读复核，未改动上文任何内容。
> 方法：本人重跑 asar 提取——独立 python3 pickle 解析（脚本 `/tmp/review-s7/extract.py`，`python3 -I` 运行），读 `/Applications/ZCode.app/Contents/Resources/app.asar`。差异表 scope：mechanical/needs-live 全量复核，deviation 只核证据。

### 复核基线（全部本人实跑）

- pickle u32 头实测 `(4, 8328596, 8328592, 8328585)`，与 §0 一致；产物 `styles-NK68EN_n.css` 480065B sha1 `5fdc1e11394c5d61c3199a0f91a58f1307661d66`、`styles-Dv5E6Odo.js` 6839502B sha1 `d5eccafb2188b1d2fdc27d24c632958291909547`，与 §0 所记一致，且与 `/tmp/night2-s2`、`/tmp/night2-s7` 两份缓存 `cmp` 逐字节一致 → **基线未漂移成立**。
- 全 asar `grep -a -c -- '--color-ring:' app.asar` = **0** ✅（§0 与 §5 的死令牌前提成立）。
- ⚠️ **§0/正文的字节偏移不可复用**：本人对同一文件 `grep -a -bo` 实测，css 偏移系统性 +8（如 `--color-input-border-focused` 实际 @17595/418463/431104/438774，文记 @17595/418455/431096/438766）；js 偏移系统性 ≈ **-96.6KB**（如 `function sYt` 实际 @3157043，文记 @3060434；`cYt` @3157188、`zYt` @3167717、存储函数 AXt/MXt/NXt/PXt @3195139–3195597，文记均在 @306 万–307 万区）。**所有按名检索的符号均存在且内容与文记相符**——偏移是记账问题，不是内容问题。

### 逐条 verdict

| # | kind | verdict | 复核所见（本人实测值） |
|---|---|---|---|
| 1 | mechanical | **verified**（两条计数子注不成立，见备注） | 注释两处都在：`CodexSidebar.tsx:566`「映射到 var(--color-brand)」、`zcode-skin.ts:80`「最近的参照是 …brand 蓝 oklch(74.6% .16 232.661)」（文记 :79-80，实际行 80）。ZCode 真值 4 处定义逐一验块：`:root,:host`@17595 = `var(--color-brand)`、`.dark`@418463 = `var(--color-brand)`、`.theme-zai-light`@431104 = `var(--color-border-hover)`、`.theme-zai-dark`@438774 = `var(--color-border-hover)`；`--color-border-hover` 实测 zai-light `#0d0d0d26`、zai-dark `#ffffff26`；zai 块序（429618/437344 起）后于基档，覆盖生效。`ring-offset-2` 全 js 实测 **4 处** ✅。 |
| 2 | mechanical | **verified** | ours：`input-history.ts:9` `private readonly limit = 200`；`InputHistoryDock.tsx:103` `new InputHistory(storage)` 单参未覆写。zcode：`function sYt(e,t,n=30)`（trim 连续去重 + `slice(-i)`）；读路径 `NXt` `…filter(e=>e.length>0).slice(-30)`；键名 `AXt=\`zcode-chat-prompt-history:\``；发送流程 `c&&(R=mJ(N),z=sYt(R,c),z2t(R,z)||(PXt(N,z),…))` 实文核对一致。**30 vs 200 成立**。 |
| 3 | mechanical | **verified** | ours：守卫实际在 `input-history.ts:56` `if (direction !== -1 \|\| draft !== '' \|\| entries.length === 0) return undefined`（↓=+1 永不进入历史）——文记引用 `input-history-keyboard.ts:26` 是调用点 `cursor.move(event.key==='ArrowUp'?-1:1,…)`，行为主张不变。zcode：`cYt(e,t,n)` 实文 `if(t===null){let t=e.length-1;return{nextIndex:t,nextValue:e[t]??'',shouldHandle:!0}}` = **↓ 从空草稿召回最后一条**；`t>=e.length-1` ↓ 归 `{null,''}`；↑ 钳制 `Math.max(t-1,0)`；zYt 守卫 `if(c===null&&s.length>0)return!1` 仅拦非空草稿；`registerCommand(UU,o('up'),3)`/`(WU,o('down'),3)` 优先级 3。 |
| 4 | deviation（仅证据） | **证据成立** | ours `CodexWorkspaceBrowser.tsx:300` 实文：`.dcu-wb-rename-input:focus{border-color:var(--dsw-focus-ring-color,var(--dcu-focus));box-shadow:0 0 0 1px var(--dsw-focus-ring-color,var(--dcu-focus))}`。zcode：cva 输入焦点串 `focus-visible:border-input-border-focused focus-visible:bg-input-focused focus-visible:ring-0` 实测 **5 处**；zai 两主题 `--color-input-focused:var(--color-input)`（.theme-zai-light@430969 / .theme-zai-dark@438639，bg 不变成立）；26hex=38/255≈15% 中性；焦点类中无 box-shadow 环。 |
| 5 | deviation（仅证据） | **证据成立** | ours `CodexWorkspaceBrowser.tsx:361` 实文四选择器 `.dcu-wb-collection-label/.dcu-wb-project-head/.dcu-wb-session/.dcu-wb-section-label:focus-visible{outline:2px solid …;outline-offset:-2px;border-radius:var(--dsw-radius-md)}`。zcode：全 bundle `role:\`treeitem\`` **恰好 1 处**，行类含 `outline-none` + `focus-visible:border-border-hover` + 选中态 `border-input-border-focused`；任务行 className=\`group/task-row,jbt,cursor-pointer,…\` **无 focus-visible 类**（`jbt` 串与 §2.2 逐字一致）；css `outline-offset` 全集实测 **6×2px + 1×4px，无负值**；`zcode-skin.ts:71` 宿主指针模态规则实文在；`04-open-gaps.md` G2 行「真实 Tab → outline solid 2px」在 :1815。 |
| 6 | deviation（仅证据） | **证据成立** | 插件侧 `tree-keyboard.ts` 行号逐一核对：:87-96 `applyRoving`（全树仅 1 个 tabIndex=0）、:65-75 `assignLevels`（aria-level）、:158-201 switch 含 ArrowUp/Down/Home/End/Left/Right、:58-62 presentation 归一、:1-33 头注释。zcode：文件树 `ve` handler 实文仅 `Enter`/`ArrowRight`(目录)/`ArrowLeft`(展开目录)，**无 ↑↓/无 Home/End**；任务行 `me=e=>{e.target===e.currentTarget&&(e.key!==\`Enter\`&&e.key!==\` \`\|\|(e.preventDefault(),le()))}` 与文记逐字一致；`Kxt` 组件存在，拖拽态实测 `role:_?void 0:\`button\`,tabIndex:_?void 0:0`；`RovingFocusGroup` 全 bundle 6 次命中全部落在同一 vendor Radix 块（@382554–384158），业务层无第二处 roving 实现。 |
| 7 | deviation（仅证据） | **证据成立** | ours `CodexSidebar.tsx:158` 实文 `.dcu-menu-kbd{…min-width:20px;height:20px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dcu-surface);…}`（20px/4px/r-sm/surface 全对上）。zcode：菜单 shortcut `nx` = `data-slot:\`dropdown-menu-shortcut\`` + `ml-auto text-ui-xs tracking-widest text-foreground-subtlest`（高亮转 subtle），纯文字无底；`QQn`（qy + `pointer-events-none min-w-4 select-none justify-center gap-1`）全 bundle 3 次命中 = 1 定义 + 2 消费点，消费点均为 `settings.shortcuts.rebindAria` 设置页重绑行 →「仅设置页消费」成立；surface-2 交叉引用在（surface-2.md:68/:139）。 |
| 8 | needs-live | **verified**（静态半边；活体半边仍未做，与文记一致） | `grep -rn -- '--dsw-radius-md:' uiplug/src` = **0 定义**（含 .bak 也在内的全目录；`var(--dsw-radius-md)` 消费点存在，如 CodexWorkspaceBrowser.tsx:361）→「静态无 resolved 值」成立；ZCode 行焦点形态不用圆角令牌（focus 类仅 `focus-visible:border-border-hover`，行自身带 `rounded-lg`）成立。**本人未跑 9224 活体 `getComputedStyle`**——该项文记本就列为活体待办，本次复核不销案。 |

### 复核中发现的计数出入（不改判定，引用时以本节为准）

1. **§2.1「主力 ring 45 处 / ring-1 版 ~4」不可复现**：精确全串 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-input-border-focused` 在 js 实测 **29 处**（全 asar 同为 29）；`ring-2+focused` 37 处；`ring-input-border-focused` 全 token 48 处；ring-1 变体实测 **11 处**（非 ~4）。方向性结论（主力无 offset、ring-offset-2 稀少）不受影响。
2. **§2.1「ring-offset-2 其中 2 处配色是死类 ring-ring，实际有效仅 2」实测为 1 死 3 活**：4 处中仅 @2801138（图片放大块）用 `focus-visible:ring-ring`，其余 3 处均 `ring-input-border-focused` + `ring-offset-background/card`。
3. **§2.2「aria-activedescendant 3 处」实测 4 处**：Radix combobox 输入、cmdk listbox、另一 autocomplete 输入（@2173743，`aria-autocomplete:list`）、Lexical 编辑器 div。文记漏计 autocomplete 一处。
4. **§5 死类类串计数微差**：`ring-ring` 实测 42（文记 ≈41，在「≈」误差内）；`border-ring` 实测 **7**（文记 6）；`outline-ring` 实测 8（一致）。死类定性本身核实：css 中 `.ring-ring`/`border-ring`/`outline-ring` 规则均为 **0 条**，`ring-[3px]` 编译产物回退 `var(--tw-ring-color,currentcolor)`，裸 `var(--color-ring)` 裸规则 2 处 + 1 个 color-mix 变体（css@382/@457114/@457257）。

### 总判定

差异表 8 条**无一需要推翻**：mechanical #1/#2/#3 与 needs-live #8 的静态证据全部按原文复现成立；deviation #4–#7 引用的插件源码与 ZCode 真值证据全部核实成立。出入仅在上文 §2.1/§2.2 的四处计数细节与字节偏移记账（见上两节），不影响任何 verdict 与「登记不修/待活体」的处置。
