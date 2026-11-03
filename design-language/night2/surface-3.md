# night2 · surface-3 · 对话框家族（删除 / 重命名 / 确认 / 设置退出）

> 深挖员：surface-3。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面：`uiplug/src/client/session-row-actions.tsx`、`uiplug/src/client/archive-confirm.ts`、`uiplug/src/client/settings-focus.ts`。
> 前置：已读 `night-audit/APPLIED.md`（§五：归档确认改模态已落地+真机验收）与 `03j-dialog.md`（A 表 512/16/#2b2b2b/16-20/shadow-md + 第二家族警示）。本轮不重复报 APPLIED 已落地项。

## 0. 提取方法与可复现命令

```bash
# asar 头解析（Pickle+JSON 目录）→ 提取产物存 /tmp/zc-dialog-extract/
python3 - <<'PY'   # 头：u32=(4, 8328596, 8328592, 8328585)，文件区起点 8+8328596
import struct, json
f=open('/Applications/ZCode.app/Contents/Resources/app.asar','rb')
hdr=struct.unpack('<4I', f.read(16))
f.seek(16); d=json.JSONDecoder().raw_decode(f.read(hdr[3]).decode('utf-8','replace'))[0]
# styles bundle 与编译 CSS：
#   out/renderer/assets/styles-Dv5E6Odo.js  6,839,502B @349613121
#   out/renderer/assets/styles-NK68EN_n.css   480,065B @356452623
#   out/renderer/assets/button-DeDmlciX.js     5,313B   @317388078（Button 全规格）
PY
```

下文偏移量均指上述三个产物文件内的字节偏移（`grep -a` 可直接复核，或 `dd if=… skip=…`）。
活体（9224）本轮未采样——所有结论均为 asar 静态证据，needs-live 两条见 §5。

## 1. ZCode 对话框家族全景（本轮新挖，静态源码级）

### 1.1 家族谱系（宽度阶梯）

| 家族 | 宽度 | 内容 class（相对基座增改） | 实例（asar 锚点） |
|---|---|---|---|
| 确认框 confirmDialog | **448**（`sm:max-w-md`） | `gap-5 rounded-2xl border-none bg-popover/98 p-5 ring-border shadow-2xl` | styles js@6483451 `c0n` |
| ├ compact 档 | 400（`sm:max-w-[400px]`） | `top-[44%] min-h-[161px] gap-4` + 遮罩改 `bg-black/20 + blur-[2px]` | 同上 |
| ├ automation-confirmation 档 | **448 固定** `w-[min(448px,calc(100vw-2rem))]` | `min-h-[180px] max-w-none`；showCloseButton、hints:false | js@6480093 `o0n`；调用现场 @4809513（automations.unsaved）、@4771481（offPeak.discard） |
| ├ source-server-boundary 档 | 576（`sm:max-w-xl`） | `gap-0 p-0 overflow-hidden ring-border shadow-2xl` 双栏 hero | js@6483451 p 分支、s0n |
| └ yolo-confirmation 档 | 基座默认 | `bg-popover p-4 sm:p-5 shadow-md gap-4`（**非 /98 非 2xl**） | 同上 m 分支 |
| 表单/项目/git 编辑器 | **512**（`max-w-lg`） | 多为基座原样（border+bg-popover+shadow-md+p-4）；git 系常见 `gap-0 p-0 rounded-2xl` + 头部 `px-6 py-5` + 标题 `text-lg` + 按钮 `h-10 px-5` | js@2146683、@2153333、@3658867、@3705113 |
| 重命名 TaskRenameDialog | **576**（`max-w-xl`） | `p-0 overflow-hidden` + 内层 `flex-col gap-6 p-6` | js@2203588 `KI` |
| 基座兜底（未传宽） | `w-full max-w-[calc(100%-2rem)]` | — | js@946620 `Hb` |

- 03j A1「宽 512」= 创建项目家族，静态复核一致（`max-w-lg`=32rem）。**确认框家族是 448**，两族并存不互替——03j 的「第二家族」警示由本轮补全为上表。
- 03j A5 活体「gap 20px」与基座 `gap-4` 的出入：项目编辑器可能测到内容列自身间距；确认框家族静态确为 `gap-5`=20px，无矛盾。

### 1.2 基座全 CSS（shadcn 风封装，js@946072–948000；`dLe`=Overlay、`Hb`=Content、`Ub`=Header、`Wb`=Footer、`Gb`=Title、`Kb`=Description）

```
Overlay(dLe):  fixed inset-0 isolate z-50 bg-black/60 duration-100
               supports-backdrop-filter:backdrop-blur-xs
               data-open:animate-in data-open:fade-in-0
               data-closed:animate-out data-closed:fade-out-0
Content(Hb):   fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)]
               -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl
               border border-popover-border bg-popover p-4
               text-ui-base/relaxed text-foreground shadow-md duration-100 outline-none
               data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95
               data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95
               [app-region:no-drag]
  关闭叉(默认开): ghost icon-sm absolute top-4 right-4 z-20 hover:bg-surface-hover
Header(Ub):    flex flex-col gap-1        （确认框覆盖 gap-2）
Footer(Wb):    flex flex-col-reverse gap-2 sm:flex-row sm:justify-end
Title(Gb):     text-ui-base font-medium text-foreground        → 14px/500
Desc(Kb):      text-ui-base/relaxed text-foreground-subtle *:[a]:underline…
```

### 1.3 进出动画（编译 CSS 实证，styles-NK68EN_n.css）

- js 类名单里 `duration-100` 编译为 `--tw-duration:.1s`（css@190812）。
- `animate-in` 编译为 `animation: enter var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,ease) …`（css@319085）→ **对话框动画 = 100ms + CSS 关键字 `ease`**（tailwindcss-animate 默认），**不是** 02-motion 的设计曲线。
- `@keyframes enter{0%{opacity:var(--tw-enter-opacity,1);transform:translate3d(…)scale3d(var(--tw-enter-scale,1)…)}}`、`exit{to{…}}`（css@478828）；`fade-in-0→--tw-enter-opacity:0`、`zoom-in-95→--tw-enter-scale:.95`（css@191932/195393）。
- 汇总：**遮罩 fade 0→1；内容 fade + scale .95→1；时长均 100ms；曲线 ease；无位移。** 无 motion-reduce 关停（基座未加）。

### 1.4 confirmDialog 标准档交互（js@6483451）

- 确认钮 `data-testid=confirm-dialog-confirm`（js@980500）；`size:lg` + className `h-9 gap-3 px-4`（**size lg 基础 h-8，被覆盖为 36px**）。
- 取消钮 `variant:secondary`（compact 才 outline）；`justify-between sm:min-w-28`(112px)，附 `esc` 提示（`font-mono text-ui-base text-foreground-subtle`）；确认钮 `sm:min-w-32`(128px) 附 `⏎`（`text-primary-foreground/60`，destructive 时 `text-destructive-foreground/60`）。`showKeyboardHints:false` 可关（automation 档即关）。
- 焦点：**非破坏型 → autoFocus 确认钮；destructive → onOpenAutoFocus preventDefault 且焦点落取消钮**（安全动作优先）。
- 键盘：非破坏型且非 yolo → **window 级 Enter 直接确认**（capture，含 checkbox/codeBlock 例外）；Esc 由 Radix dismiss。
- 关闭叉：`showCloseButton` 时 `absolute right-5 top-5 z-20 text-foreground-subtle hover:bg-surface-hover`，X `size-4 strokeWidth:4/3`。

### 1.5 Button 全规格（button-DeDmlciX.js 全文，5313B）

- 基础：`rounded-md … transition-colors disabled:pointer-events-none disabled:opacity-50`。
- 变体：default `bg-primary text-primary-foreground hover:bg-primary/80`；outline `border-border hover:border-border-hover hover:bg-input/50`；**secondary `bg-secondary text-foreground hover:bg-secondary/80`**；ghost `hover:bg-hover`；**destructive `bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20`**；warning；link。
- 尺寸：default `h-7 px-2`、xs h-5、sm h-6、**lg `h-8 rounded-lg px-2.5`**、icon/sm/md/lg = size-7/6/7/8。
- 图标默认 size-4（`[&_svg:not([class*='size-'])]:size-4`）。

### 1.6 删除 / 重命名 / 设置退出的真实流程

- **活跃任务菜单没有「删除」项**：`taskList.*` 49 键中无 delete（rename/pin/unpin/markAsUnread/archive/restart/feedback…）。`deleteTask` 服务仅在归档页调用，且必过 confirmDialog：`{confirmVariant:'destructive', title:archives.deleteTitle, description:archives.deleteDescription, confirmLabel:archives.delete}`（js@1966448）。
- 归档任务走 confirmDialog 默认档（**非 destructive**，js@5142269，只传 title/description/confirmLabel）。
- 重命名 = TaskRenameDialog（js@2203588 `KI`）：基座壳（border 1px popover-border + bg-popover + shadow-md）+ `max-w-xl p-0`，内层 `flex-col gap-6 p-6`；标题走 Gb 默认档（**14/500**）；输入框 = Input `size:lg`（Input cva：lg=`h-8 rounded-lg px-3 py-1.5`，bg `--color-input`，placeholder `foreground-subtlest`，pptxElementReference.js@~247k `fo/po`）；Enter 确认带 **IME 守卫**（onCompositionStart/End + `Ro({compositionActive,nativeEvent})`，日志「ignore rename enter during IME」）；footer `flex items-center justify-end gap-3`，取消=secondary、确认=default，均 `h-10 min-w-0 px-5`（40px），无键位提示；`showCloseButton` 默认 true（右上叉）。
- **设置退出/未保存确认**（ZCode 存在）：`automations.unsaved.*`、`offPeak.discard.*` → confirmDialog `presentation:'automation-confirmation'`（448 固定宽 + min-h-180 + showCloseButton:true + showKeyboardHints:false + confirmVariant:destructive）。设置页全局无「关窗未保存守卫」（见 §5 搜索记录）。`settings.personalization.unsaved` 只是编辑器下方的行内提示文字（js@6305914），非对话框。

### 1.7 本轮核对的令牌值（design-language/tokens.json）

| token | light | dark |
|---|---|---|
| `--color-destructive` | oklch(57.7% .245 27.325) ≈ **#e7000b**（手算换算，见 §5） | **#ff5c5c** |
| `--color-secondary` | oklch(87% 0 0) ≈ #d4d4d4 | #363636 |
| `--color-popover` | #fff | #2b2b2b |
| `--color-input` | #fff | #2b2b2b |
| `--color-foreground-subtle` | foreground 60% 混合 | foreground 60% 混合 |
| `--shadow-2xl`（css@编译） | `0 25px 50px -12px #00000040` | 同左 |
| `--shadow-md` | `0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a` | 同左 |
| `--radius-xl / --radius-2xl` | 12px / **16px** | 同左 |
| `--blur-xs` | 4px | 同左 |
| 字号 `ui-xs/sm/base/lg/xl` | 10/12/**14/16**/18px，行高 1.5 | 同左 |

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 14 条）

主战场是 `archive-confirm.ts`（插件自有全控）；`session-row-actions.tsx` 占 2 条。

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | archive-confirm.ts:24 `.dcu-archive-scrim` | 遮罩底色 | `color-mix(in srgb,#000 48%,transparent)` | `bg-black/60` = `#0009`（60%，双主题同值） | css@116640 `.bg-black\/60{background-color:#0009}`；js@946530 |
| M2 | archive-confirm.ts:24 | 遮罩背景模糊 | 无 | `backdrop-blur-xs`（`--blur-xs`=4px，`supports-backdrop-filter` 包裹） | css@279872；css@13574 `--blur-xs:4px`；js@946530 |
| M3 | archive-confirm.ts:26 `.dcu-archive-dialog` | 宽度 | `width:min(420px,100%)` | `sm:max-w-md`=448px + 基座 `w-full max-w-[calc(100%-2rem)]` 兜底 | js@6483451 `sm:max-w-md`；js@946620 |
| M4 | archive-confirm.ts:26 | 圆角 | `var(--dsw-radius-xl)`=12px | `rounded-2xl`=16px（`--radius-2xl:1rem`） | zcode-tokens.ts:506（xl=12）；css@编译 `--radius-2xl:1rem`；js@6483451 |
| M5 | archive-confirm.ts:26 | 阴影 | `0 8px 24px rgba(0,0,0,.24)` | `shadow-2xl` = `0 25px 50px -12px rgb(0 0 0/25%)` | css@编译 `.shadow-2xl{--tw-shadow:0 25px 50px -12px #00000040}` |
| M6 | archive-confirm.ts:26 | 边框 | `border:1px solid var(--dcu-tip-border)` | **无边线**：`border-none` + `ring-border`（只上色不给宽，`.ring` 宽度类未加 → ring-shadow 为 0），分离感全靠 98% 底+大柔影 | js@6483451；css@编译 `.ring-border{--tw-ring-color:…}`、`.ring{--tw-ring-shadow:…}` |
| M7 | archive-confirm.ts:28 `.dcu-archive-title` | 标题字号/行高 | `--dsw-font-size-base`(14px)/21px/600 | `text-ui-lg font-semibold` = **16px**/24px(1.5)/600 | js@6483451 `Gb` 覆盖；css@124300 `--text-ui-lg:16px` |
| M8 | archive-confirm.ts:29 `.dcu-archive-desc` | 描述字号/行高 | `--dsw-font-size-sm`(12px)/18px | `text-ui-base leading-6` = **14px/24px**（基座 Kb 是 14/21，确认档覆盖 leading-6） | js@6483451；css@124300 `--text-ui-base:14px` |
| M9 | archive-confirm.ts:31 `.dcu-archive-btn` | 取消钮形态 | 透明底+1px 边框 | `variant:secondary` 实底无边：`bg-secondary`（light ≈#d4d4d4 / dark #363636）+ `hover:bg-secondary/80` | button-DeDmlciX.js size/variant 表；js@6483451；tokens.json `--color-secondary` |
| M10 | archive-confirm.ts:33 `.dcu-archive-confirm` | 确认钮浅色底 | `--dcu-state-error-fill`=#e03131 | `bg-destructive` = oklch(57.7% .245 27.325) ≈ **#e7000b**（深色 #ff5c5c 两侧精确一致，见 A2） | tokens.json `--color-destructive`；oklch→srgb 换算（§5 复核）；zcode-theme.ts:52 |
| M11 | archive-confirm.ts:31,30 | 确认/取消钮盒 | min-height 32px；padding 0 12px；字号 `--dsw-font-size-sm`(12px) | `h-9`(36px) `px-4`(16px) 字号 ui-base(14px)；标准档另带 `sm:min-w-28/32`+`esc`/`⏎` 键位提示（automation 档有 showKeyboardHints:false 先例，可不随） | js@6483451 按钮段；css@124300 |
| M12 | archive-confirm.ts:25,26-27 | 进出动画 | scrim fade + 内容 `translateY(-4px) scale(.99)`，时长/曲线 = `--dcu-motion-enter-*`(150ms, cubic-bezier(.2,0,0,1))（zcode-theme.ts:142） | **100ms `ease`**，内容 fade+`zoom-in-95`（.95→1），**无位移**；设计曲线让位于 tailwindcss-animate 默认 | css@319085 `animation:enter var(…,var(--tw-duration,.15s)) var(--tw-ease,ease)`；css@478828 keyframes；js@946530/946578 |
| M13 | archive-confirm.ts:68-79（effect 段） | Enter 确认 | 无（只有 Esc） | 标准档（非破坏型）**window 级 Enter 直接确认**（capture，checkbox/codeBlock 时聚焦件内除外） | js@6483451 `useEffect` Enter 段 |
| M14 | session-row-actions.tsx:108 rename input onKeyDown | IME Enter 守卫 | `if (event.key==='Enter') submitRename()`（无 isComposing 检查） | 组合期 Enter 不提交：onCompositionStart/End 记态 + 提交前 `Ro({compositionActive,nativeEvent})` 拦截 | js@2203588 KI onKeyDown/onComposition* |

> M10 换算精度：oklch→srgb 手工矩阵换算（Björn Ottosson 标准矩阵），结果 #e7000b；落码时建议直接引 ZCode 原 oklch 值或经 §5 活体取色复核后再定 hex。

## 3. deviation（触既有裁决，登记不修）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | session-row-actions.tsx:107,111 重命名/删除弹窗壳 | 壳几何：380px、标题 16/24/500、遮罩 `--dsw-alias-bg-mask-1`(浅 .24/深 .5)+`--dsw-mask-blur`、`modalEnter` fade（宿主 `--ds-transition-duration`/`--ds-ease-in-out`）、描述 14/22、footer gap 8 | 宿主 `Modal`（`@deepseek-ai/dsh-client-ui-primitives/lib/Modal.module.css`） | ZCode rename=576/p-6 gap-6/标题 14/500/按钮 h-10 px-5 gap-3；确认框=448/p-5 gap-5 | 03j A5 定案「宿主模态自有，未覆盖」；插件仅控内层（input/actions/copy 三段 CSS 在 CodexWorkspaceBrowser.tsx:294-298）。宿主壳整替=结构性工程，登记不修。宿主运行时令牌值（--ds-transition-duration 等）node_modules 与文档均无定义，静态不可得 |
| D2 | session-row-actions.tsx:111 删除确认钮 | destructive 形态 | `variant="outline"` + `.dcu-wb-delete-button` 红字（`--dcu-state-error-text`，CodexWorkspaceBrowser.tsx:295） | `variant:destructive` 红实底白字（同 M9/M10 机制） | 宿主 Button 无 destructive/secondary 变体（Button.module.css 仅 primary/ghost/outline/toolbar/icon）→ 宿主约束下 workaround，登记不修；若宿主日后补变体可并入 M10 一起改 |
| D3 | session-row-actions.tsx:107 重命名弹窗 | 标题层级带描述句、输入框 36px 高 | 宿主标题 16/24/500 + `sessions.renameDescription` 描述行；输入框 36px（CodexWorkspaceBrowser.tsx:298） | TaskRenameDialog 标题 14/500、无 description 元素、Input lg=32px（bg `--color-input` 同值 #fff/#2b2b2b ✓） | 属 D1 壳体系内项，单拆无意义；输入框 36px 与 03j A5「输入 36 高」（创建项目活体）同源，ZCode 自身两族并存（KI=32），维持现状 |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 弹窗底色 | `--dcu-dialog-bg` #fff / #2b2b2b | `bg-popover/98`（--color-popover #fff/#2b2b2b；98% 透明度差 2%，视觉无感，随令牌） | zcode-theme.ts:58,81；tokens.json `--color-popover`；css@124890 |
| A2 深色确认钮 | `--dcu-state-error-fill`=#ff5c5c | `--color-destructive` dark=#ff5c5c **精确一致** | zcode-theme.ts:78；tokens.json |
| A3 描述色 | `--dcu-tip-secondary` #5c5c5c/#9a9a9a | `text-foreground-subtle`（=foreground 60% 混合，量级一致；浮层文字色属 03g 既有域） | tokens.json `--color-foreground-subtle`；zcode-theme.ts:63,84 |
| A4 内容纵向节奏 | 标题→描述 8px（desc margin-top 8px）、描述→按钮 20px（actions margin-top 20px） | header 内 `gap-2`(8px) + 内容 `gap-5`(20px) | archive-confirm.ts:29-30；js@6483451 |
| A5 确认钮圆角/白字 | `--dsw-radius-lg`=8px、#fff | size lg `rounded-lg`=8px、`text-destructive-foreground`=#fff | zcode-tokens.ts:504；button-DeDmlciX.js；tokens.json |
| A6 Esc 关闭 | window keydown Escape → close（capture） | Radix Dialog 原生 dismiss | archive-confirm.ts:68-79；js@6483451 `onOpenChange:x` |
| A7 遮罩点击关闭 | scrim onMouseDown target===currentTarget | Radix overlay 点击 dismiss（同语义） | archive-confirm.ts:87-89 |
| A8 打开时焦点 | `confirmRef.current?.focus()`（确认钮） | 非破坏型 `autoFocus:!v`（确认钮）——归档属非破坏型，一致 | archive-confirm.ts:77；js@6483451 |
| A9 关闭后还焦 | restoreFocus → 触发元素 `.focus()` | Radix 默认还焦 trigger | archive-confirm.ts:56-61 |
| A10 归档文案/确认钮文案 | sessions.archiveConfirmTitle/Description/archive | `confirmDialog.taskArchiveTitle`/`Description`/`taskList.archive`（APPLIED §五已落地+真机验收） | archive-confirm.ts:101-115；APPLIED.md:82 |
| A11 reduced-motion | scrim/dialog `animation:none` | ZCode 基座未关（无 motion-reduce）——**ours 是增强**，注记不算差 | archive-confirm.ts:35；js@946530-947155 无 motion-reduce |
| A12 宽 512（创建项目族） | — | 03j A1 活体 512 与静态 `max-w-lg` 一致，cross-check 通过 | js@2146683；03j A1 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| settings-focus.ts 交互可用性过滤（settingsElementAvailable/settingsOverlays，:2-13） | **无 ZCode 参照**：ZCode 无业务侧自写过滤，Radix Dialog modal 模式自动对 sibling 置 `aria-hidden` + pointer-events 治理（vendor 段 js@374165 起）。插件该文件是宿主环境下的等价自保逻辑，`inert/hidden/aria-hidden/display/visibility` 判定与 Radix 行为兼容，保留 | asar 搜 `settingsOverlays`、`settingsElementAvailable`（0 命中）；`AlertDialog` 20 处均为 vendor/未使用；Dialog vendor `DismissibleLayer` 段 @374000-375000 |
| 插件设置页「退出未保存」确认对话框 | ZCode **有**（automations.unsaved/offPeak.discard，规格 §1.6）；插件设置页无此功能——功能缺口非样式差，样式规格已存档待将来补功能时直接用 | styles js 搜 `` settings\..*(unsaved|discard|exit|close) ``（仅 closeToTray* 4 键 + personalization.unsaved 行内文字@6305914）；`unsavedChanges/hasUnsaved/beforeUnload/onCloseWindow/quitWithout` 全 0 命中 |
| confirmDialog compact / yolo / source-server-boundary 三个子档 | 插件无对应组件，规格存档（§1.1），不产 diff | — |
| 宿主 Modal 的 `--ds-transition-duration`、`--ds-ease-in-out`、`--dsw-mask-blur` 运行时值 | 静态不可得（宿主注入）：node_modules/@deepseek-ai/** 与 design-language 文档均无定义 | grep `--ds-transition-duration\|--dsw-mask-blur\|--ds-ease-in-out` 于 uiplug/node_modules 全量与 design-language/*.md（0 定义命中，仅引用） |
| needs-live ① | M10 浅色 #e7000b 是手算 oklch 换算，需 9224 活体打开任一 destructive 确认框取色复核 | — |
| needs-live ② | `bg-popover/98` 与全不透明底在浅色的 2% 透明度差是否可感知（理论上无感），活体目检一次即可销案 | css@124890 `.bg-popover\/98{background-color:#fffffffa}`（fallback） |

## 6. 给下一轮的整改建议（不动手，仅排序）

1. 一把梭改 `ARCHIVE_CONFIRM_STYLE`（M1-M12 全在一段 CSS 常量里，archive-confirm.ts:23-36，一次 diff 收口）+ M13 加 window Enter handler + M14 加 `event.nativeEvent.isComposing` 早退。
2. ZCode 对话框动画曲线是 **`ease` 100ms**（非 02-motion 设计曲线）——建议在 02-motion.md 补「对话框档」条目（本轮不改文档）。
3. 建议在 03j-dialog.md A 表补注：A1 的 512 属创建项目/git 表单族，确认框族 448、重命名族 576（本轮不改文档）。

## 复核（独立复核员 · 2026-11-03）

> 方法：不用深挖员脚本，自己重跑 asar 提取——`struct.unpack('<4I')` 头四元组实测 `(4, 8328596, 8328592, 8328585)`、数据区起点 `8+8328596`，三个产物 size/offset 与 §0 完全一致（styles-Dv5E6Odo.js 6,839,502B / styles-NK68EN_n.css 480,065B / button-DeDmlciX.js 5,313B），提取至 /tmp/zc-fh3-extract/ 后按偏移 dump + `grep -aob` 特征串重定位。ours 侧逐条读了 archive-confirm.ts、session-row-actions.tsx、CodexWorkspaceBrowser.tsx、zcode-theme.ts、zcode-tokens.ts、design-language/tokens.json。

### 全局问题：引用偏移与实测不符（内容全部复现）

文档引用的 js@/css@ 字节偏移在本次提取中**逐字节核不上**：js 1M 区漂移 +0.8~1.1KB，2M 以上区漂移 +90~118KB（css 多为 ±20B 内，但 css@319085、css@124300 两个锚点完全落错）。漂移随区域增大，疑似按**字符数**而非字节数记录。以下所有结论均经特征串重定位后确认**内容属实**，只是偏移要换：

| 文档引用 | 实测偏移（styles-Dv5E6Odo.js） | 文档引用 | 实测偏移（styles-NK68EN_n.css） |
|---|---|---|---|
| js@946530/946620（基座 overlay/content） | bg-black/60 @947297、backdrop-blur-xs @947322、max-w-[calc(100%-2rem)] @947728 | css@116640 .bg-black/60 | ✅ 精确命中 |
| js@980500（confirm testid） | dUe= @981330、confirm-dialog-confirm @981335 | css@13574 --blur-xs:4px | ✅ 精确命中 |
| js@1966448（deleteTask 现场 archives.deleteTitle） | @2057072 | css@190812 --tw-duration:.1s | ✅ 精确命中 |
| js@2203588（TaskRenameDialog KI） | @2295811（ignore rename enter during IME @2295896） | css@124890 .bg-popover/98 | ✅ 精确命中 |
| js@5142269（taskArchiveTitle 现场） | @5253334 | css@319085（称 .animate-in） | ❌ 实为 accordion 规则；`.animate-in{animation:enter var(--tw-animation-duration,var(--tw-duration,.15s))var(--tw-ease,ease)…}` 在 **@82538**（另有重复拷贝 @274781/275814） |
| js@6305914（personalization.unsaved） | @6420093 | css@478828 keyframes enter/exit | @478835/@479123（+7B，算命中） |
| js@6480093（o0n） | @6594531 | css@191932/195393（enter-opacity/scale） | @191950/@195412（+18/19B，算命中） |
| js@6483451（c0n confirmDialog） | @6597317（bg-popover/98 @6601463、sm:max-w-md @6601512） | css@124300（称 --text-ui-lg/base:16/14px） | ❌ 实为 .bg-menu 区；token 在 @14127（`--text-ui-lg:calc(var(--ui-font-size)+2px)`）+ @414650（`--ui-font-size:14px`），编译类 `.text-ui-lg{font-size:…}` @152830 |
| 调用现场 @4809513/@4771481（automations.unsaved/offPeak.discard） | @4919071/@4880965 | | |

### 逐条 verdict（差异表 §2）

| # | verdict | 复核所见（本次实跑） |
|---|---|---|
| M1 | **verified** | css@116640 精确命中 `.bg-black\/60{background-color:#0009}`，单条规则无主题覆盖（双主题同值成立）；js overlay 类 `bg-black/60` 实测 @947297；ours=archive-confirm.ts:24 `color-mix(in srgb,#000 48%,transparent)` 逐字一致 |
| M2 | **verified** | css@13574 `--blur-xs:4px` 精确命中；css@279872 `supports-backdrop-filter:backdrop-blur-xs` 变体规则在；overlay 类含 `supports-backdrop-filter:backdrop-blur-xs` @947322；ours :24 无 backdrop-filter |
| M3 | **verified** | c0n `f?o0n:`sm:max-w-md`` @6601512（448=28rem）；基座 `w-full max-w-[calc(100%-2rem)]` @947728；ours :26 `width:min(420px,100%)` 一致 |
| M4 | **verified**（值成立；行号引用漂移） | c0n `rounded-2xl`；css@13112 `--radius-2xl:1rem`=16px；ours `var(--dsw-radius-xl)`=12px 在 zcode-tokens.ts:**508**（文档写 506）；`--radius-xl:.75rem`@13093 佐证 12px |
| M5 | **verified** | css@170739 `.shadow-2xl{--tw-shadow:0 25px 50px -12px var(--tw-shadow-color,#00000040)}`；ours :26 `0 8px 24px rgba(0,0,0,.24)` 一致 |
| M6 | **verified** | c0n 类串只有 `border-none`+`ring-border`、无任何 `.ring` 宽度类；css@175842 `.ring-border{--tw-ring-color:var(--color-border)}`（只上色）、css@173972 `.ring{--tw-ring-shadow:0 0 0 calc(1px+…)}`（给宽的类确实没加）→ ring-shadow 为 0 成立；ours :26 1px 边线 |
| M7 | **verified**（字号/字重；**行高引用需修正**） | c0n Gb 覆盖 `text-ui-lg font-semibold text-foreground` ✓→16px/600 ✓（ours :28 14px/21px/600 ✓）。但 `.text-ui-lg{font-size:var(--text-ui-lg)}` @152830 **不产出行高**，全 css 无 `--text-ui-lg--line-height` 配对（grep 0 命中）；标题继承 Hb 根的 `text-ui-base/relaxed` → `--leading-relaxed:**1.625**`（css@12992）→ 实际行高 16×1.625≈**26px，非 24px(1.5)**。css@124300 锚点落空（见上表） |
| M8 | **verified**（字号/leading-6；**「基座 14/21」需修正**） | c0n Kb 覆盖 `text-ui-base leading-6` ✓；`.leading-6{line-height:calc(var(--spacing)*6)}`@153341 + `--spacing:.25rem`@12096 → 24px ✓；ours :29 12px/18px ✓（`--dsw-font-size-sm:calc(base-2px)`=12px @zcode-tokens.ts:558）。但基座 Kb=`text-ui-base/relaxed`（js@949000 `text-ui-base/relaxed text-foreground-subtle *:[a]:underline…`）= 14px/**22.75px**（1.625），非 14/21 |
| M9 | **verified** | button-DeDmlciX.js 变体 secondary=`bg-secondary text-foreground hover:bg-secondary/80` 逐字命中；css@237310 `.hover\:bg-secondary\/80:hover{background-color:#d4d4d4cc}` → 浅色 #d4d4d4 有编译级硬证据；tokens.json `--color-secondary` dark=#363636；ours :31 透明底+1px 边框 |
| M10 | **verified**（机制+深色；浅色 hex 维持 needs-live，见 NL①） | tokens.json `/state/--color-destructive` = light `oklch(57.7% .245 27.325)` / dark `#ff5c5c` ✓；ours `--dcu-state-error-fill:#e03131`（zcode-theme.ts:**52**）✓、深色 `#ff5c5c`（:78）✓；button destructive=`bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20` 逐字命中 |
| M11 | **verified** | c0n 按钮段 @6602300 起：取消钮 `variant:_?outline:secondary,size:lg,className h-9 gap-3 px-4` + `justify-between sm:min-w-28`+esc（`font-mono text-ui-base text-foreground-subtle`）；确认钮 `autoFocus:!v`+`data-testid:dUe`+`sm:min-w-32`+⏎（`text-destructive-foreground/60`/`text-primary-foreground/60`）；size lg 基础 `h-8 gap-1 rounded-lg px-2.5`（button bundle）→ 覆盖 36px 成立；字号 ui-base=14px（--ui-font-size:14px @css:414650）；`showKeyboardHints:false` 关闭先例在 automations.unsaved 现场（`showKeyboardHints:!1` @4919316）；ours :31 min-height 32/padding 0 12px/12px ✓ |
| M12 | **verified** | css@190812 `.duration-100{--tw-duration:.1s}` 精确；`.animate-in` 规则（@82538）= `animation:enter var(--tw-animation-duration,var(--tw-duration,.15s)) var(--tw-ease,ease)…`（duration-100 → 100ms，曲线回退 `ease`）；`@keyframes enter/exit` @478835/479123（translate 变量默认 0 → 无位移）；`--tw-enter-opacity:0`@191950、`--tw-enter-scale:.95`@195412；ours :24-27 scrim fade + `translateY(-4px) scale(.99)`、时长曲线 `--dcu-motion-enter-*`=150ms cubic-bezier(.2,0,0,1)（zcode-theme.ts:**142**）✓ |
| M13 | **verified** | c0n useEffect：`window.addEventListener('keydown',e,!0)`（capture）+ 守卫 `if(!d||v||m)return`（非破坏型且非 yolo）+ Enter→`i(!0)` 确认 + `s?.checkbox||s?.codeBlock` 时 `closest('button,input')` 例外，逐项成立；ours :68-79 只处理 Escape，无 Enter |
| M14 | **verified** | KI @2295811：`onCompositionEnd:()=>{c.current=!1}`/`onCompositionStart:()=>{c.current=!0}` + 提交前 `Ro({compositionActive:c.current,nativeEvent:e.nativeEvent})` 拦截 + 日志 ``[TaskRenameDialog] ignore rename enter during IME`` 逐字命中；ours session-row-actions.tsx:**108** `if (event.key === 'Enter') submitRename()`，无任何 composition/isComposing 检查 |

### needs-live 两项

| 项 | verdict | 复核所见 |
|---|---|---|
| NL① M10 浅色 #e7000b | **needs-live 维持**（手算数学已复核通过，活体未采样） | 我用 Björn Ottosson 标准矩阵独立重算 oklch(57.7% .245 27.325)：绿通道线性 −0.0094 出 gamut 裁 0，得 **#e7000b**，与文档手算一致。**新证据（双向）**：编译 CSS 里 Tailwind/culori 自己的 color-mix fallback 三处都解析为 **#e40014**——`.bg-destructive\/5{…#e400140d}`、`.hover\:bg-destructive\/90:hover{…#e40014e6}`@234792、`.ring-destructive\/20{--tw-ring-color:#e4001433}`@175278（culori 经 XYZ 路径，与 Ottosson 直矩阵在出 gamut 色上差 3/255）。即「#e7000b vs #e40014」两条路径并存，浏览器实际渲染值只能活体取色定——文档「落码直接引原 oklch 值」的建议被反向加强 |
| NL② bg-popover/98 的 2% 透明差 | **needs-live 维持** | css@124890 精确命中 `.bg-popover\/98{background-color:#fffffffa}`（fallback）；可感知性无法静态判定，活体目检要求成立 |

### deviation 三条（只核证据）

| # | verdict | 复核所见 |
|---|---|---|
| D1 | **证据成立** | 宿主 `node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/Modal.module.css` 存在且逐项命中：`.dialog width:min(380px,100%)`:40、`.title 16/24/500`:79-85、`.description 14/22`:106-113、`.footer gap:8px`:127、`.mask::after background:var(--dsw-alias-bg-mask-1) + animation:modalEnter var(--ds-transition-duration) var(--ds-ease-in-out)`:24-30、`.mask backdrop-filter:var(--dsw-mask-blur)`:21、`@keyframes modalEnter{opacity fade}`:50-53；插件仅控内层三段 CSS 在 CodexWorkspaceBrowser.tsx:**294-298** ✓；ZCode 侧 rename=576/p-0 内层 gap-6 p-6/标题 14/500（KI Gb 无 className→Gb 基座 `text-ui-base font-medium text-foreground` @948842）/按钮 h-10 px-5 footer gap-3、确认框=448/p-5/gap-5 全部命中；`--ds-transition-duration:`/`--ds-ease-in-out:`/`--dsw-mask-blur:` 在 node_modules **.pnpm 全量 store** 定义 0 命中（仅 var() 引用，Modal/Tooltip/ImageLightbox/MarkdownText + 4 个 client.js）→「静态不可得」成立。注意：`grep -r node_modules/@deepseek-ai` 因 pnpm 符号链接**静默漏搜**，必须查 `node_modules/.pnpm` 真身 |
| D2 | **证据成立** | session-row-actions.tsx:**111** 删除钮 `variant="outline"` + `className="dcu-wb-delete-button"` ✓；CodexWorkspaceBrowser.tsx:**295** `.dcu-wb-delete-button{color:var(--dcu-state-error-text)!important}` ✓；宿主 Button.module.css 选择器全集 = `.button/.md/.sm/.primary/.ghost/.outline/.toolbar/.icon`，**无 destructive/secondary** ✓ → workaround 定性成立 |
| D3 | **证据成立** | 宿主标题 16/24/500（Modal.module.css:79）+ `description={t('sessions.renameDescription')}`（session-row-actions.tsx:107）✓；输入框 36px（CodexWorkspaceBrowser.tsx:**298** `height:36px`）✓；KI 标题走 Gb 基座 14/500、无 Kb description 元素 ✓；ZCode Input cva lg=`h-8 rounded-lg px-3 py-1.5`=32px——在 **pptxElementReference-1Bf5SOFK.js**（253,493B，与文档「~247k」吻合）@247679 命中 ✓；`--color-input` #fff/#2b2b2b 同值（tokens.json）✓ |

### 未跑 / 未复核（如实声明）

- 活体（9224）未采样：本轮全程静态，NL①② 的活体要求原样保留。
- §1.1 表单族 512 的四个偏移（js@2146683/@2153333/@3658867/@3705113）、§5「asar 全量搜 settingsOverlays/settingsElementAvailable 0 命中」未按原口径复跑——差异表 M1-M14 不依赖它们；settingsOverlays/settingsElementAvailable 在 styles bundle 内 0 命中已复跑属实。
- §1.3「无 motion-reduce 关停」：css/js 中确有 motion-reduce 命中（css 3 处、js 17 处），但逐一核对均不在对话框家族类串上（dLe/Hb/c0n/KI 均无），该结论对对话框成立。
