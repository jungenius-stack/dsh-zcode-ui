# night2 · surface-11 · 设置页逐分区（导航 / 卡片 / 下拉 / 开关 / 壳层几何）

> 深挖员：surface-11。日期 2026-11-03。只读不改（本轮仅新建本文件）。
> 对照面：`uiplug/src/client/CodexSettingsPage.tsx`、`settings-page-styles.ts`、`settings-page-model.ts`，旁证 `settings-page-registration.ts`、`zcode-theme.ts`、`zcode-tokens.ts`。
> 前置：已读 `night-audit/APPLIED.md`（批次 13 导航描边 1.5、批次 17/18 卡底与开关、S2/S3 裁决均不再重复报）与 `README.md`；另核 `03f-settings.md`、`03f-settings-zcode-spec.json`、`tests/night-audit-batch-8/13/17.assert.mjs`、`docs/UPSTREAM-CHANGELOG.zh-CN.md`、`docs/ZCODE-DESIGN.md` §排版。
> 活体（9224）本轮未采样——全部结论为 asar 静态证据，needs-live 四条见 §6。

## 0. 提取方法与可复现命令

```bash
python3 -I - <<'PY'   # asar 头 u32=(4, 8328596, 8328592, 8328585)，文件区基址 8328604（与 surface-9 同版本）
import struct, json
f=open('/Applications/ZCode.app/Contents/Resources/app.asar','rb')
hdr=struct.unpack('<4I', f.read(16)); f.seek(16)
d=json.JSONDecoder().raw_decode(f.read(hdr[3]).decode('utf-8','replace'))[0]
# 提取产物（本轮独立重提，并与 /tmp/zc-badge-extract 逐字节 cmp 相等）：
#   /tmp/zc-settings-extract/styles.css    480,065B（编译 CSS，asar /out/renderer/assets/styles-NK68EN_n.css）
#   /tmp/zc-settings-extract/renderer.js 6,839,502B（渲染包，asar /out/renderer/assets/styles-Dv5E6Odo.js）
#   /tmp/zc-settings-extract/settings-*.js（4 个设置入口 chunk，合计 <1KB，纯 re-export）
#   button-DeDmlciX.js 5,313B / createLucideIcon-BQaXGXGF.js / palette-DfWBV5xU.js（按需另提）
PY
```

下文 `renderer@N` / `css@N` 均为上述产物内字节偏移（`grep -aob` / `dd if=… skip=…` 可直接复核）；IntlProvider 偏移基于 surface-9 提取的 `/tmp/zc-badge-extract/IntlProvider.js`（979,836B）。

## 1. ZCode 设置页全景（本轮新挖，源码级全量）

### 1.1 页面骨架（F9 渲染段 renderer@6452900–6457300；窗口壳 l2 @4273836）

```
l2 窗口壳：flex h-dvh flex-col overflow-hidden border-border text-foreground
           mac → bg-background-alt（亮 60% oklch(97%) 透明混合 / 暗 60% #2b2b2b）；Linux/非桌面 → bg-background-win-alt
页面网格（data-testid=settings-page）：
           relative grid h-screen w-full grid-rows-[minmax(0,1fr)] lg:grid-cols-[268px_minmax(0,1fr)]（窄屏 68px）
侧栏 aside：div h-12 [app-region:drag]（48px 拖拽条）
           → div px-2 pb-3 pt-3（返回钮行）
           → nav[aria-label=主要项] flex-1 overflow-y-auto px-2 pb-3（组间距 space-y-4）
           → footer（tOt @2524745）max-lg:hidden：flex shrink-0 flex-col gap-2.5 px-4 pt-2 pb-4
内容区：section[data-settings-content-frame] flex min-h-0 flex-col + 桌面 pr-1 pb-1（Win pr-1.5 pb-1.5）
           → div[data-settings-top-inset] shrink-0 [app-region:drag] h-1(4px)/h-1.5(6px)
           → div[data-settings-panel-frame] relative flex flex-col min-h-0 h-full border border-border bg-background
              + rounded-xl(12px)（Windows rounded-md=6px）
           → 面包屑行 div flex h-12 shrink-0（eTn @4760213：px-2.5、分隔 chevron size-3.5 subtlest、当前项 px-2 text-foreground）
           → main min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]
           → 内容列 hR（renderer@2408672）：mx-auto w-full max-w-4xl(=56rem=896px) px-4 pb-8 pt-0 lg:px-8(32px) lg:pb-10 + flex flex-col gap-8(32px)
分区标题 h2：text-ui-settings-title(=--ui-font-size+10=24px) font-semibold tracking-tight text-foreground
             lg:text-ui-settings-title-lg(+16=30px)（renderer@6457812）
Beta 徽章：inline-flex h-6 rounded-md border border-border px-2 text-ui-xs font-semibold（renderer@6457979）
内容体：div space-y-8；小节标题 h3：text-ui-lg(+2=16px) font-semibold text-foreground（C1n @6428806）
```

**三层表面**（对 S2 裁决关键）：窗壳 background-alt（半透明混合）→ 面板 frame **bg-background**（亮 #f8f8f8 / 暗 #161616，styles.css 亲读 `.theme-zai-light --color-background=#f8f8f8`、`.theme-zai-dark=#161616`）→ 行卡 **bg-card**（亮 #fff / 暗 #2b2b2b）。

### 1.2 导航（k1n @6434260；分区注册表 M$n/N$n @6357225/@6357427；nav 渲染 @6454833）

```
组容器：div[role=group] space-y-1（项间距 4px）；组间 space-y-4（16px）
组标签：div px-2.5(10px) pb-1(4px) text-ui-sm(12px) font-medium text-remote-foreground-muted（renderer@6455192）
分区项（k1n，tooltip 包裹 side=right）：
  button：flex h-8(32px) w-full items-center gap-2 rounded-xl(12px) px-2.5(10px) text-left transition-colors（renderer@6434469）
  active：bg-surface-hover text-foreground   （surface-hover：亮 rgba(13,13,13,.05) / 暗 #ffffff1a）
  inactive：text-remote-foreground-muted hover:bg-surface-hover hover:text-foreground
  图标槽：span flex size-4(16px) shrink-0 items-center justify-center text-current；svg size-4 text-foreground（renderer@6434772）
  标签：span truncate text-ui-base(14px) text-foreground（renderer@6455799）——active 与否都是全前景
分区清单（本版导航实际渲染，fct 排除集 {automations,plugins,workspaceFileSearch} @1872347，computerUse 仅桌面）：
  基础设置（basics）：常规 / 外观 / 模型设置 / 浏览器控制 / 远程设备※ / 电脑控制※ / 键盘快捷键   ※桌面限定
  Agent 能力（agentCapabilities）：个性化 / 记忆 / 子智能体 / 插件 / MCP 服务器 / 技能 / 命令 / 钩子
  数据与统计（dataAndStats）：数据同步※ / 使用统计 / 项目 / 归档管理
全局图标描边：LucideProvider strokeWidth S3n=1.5 包整棵应用树（renderer@6662862 `var S3n=1.5`、@6662906 包裹点）
```

### 1.3 行与卡（gR @2410234；_R @2410997；Card 基座 pR @2407282；CardContent mR @2408530）

```
卡（_R=Card+CardContent）：overflow-hidden rounded-xl(12px) border border-card-border(=border：亮 #0d0d0d1a/暗 #ffffff1a)
                          bg-card(#fff/#2b2b2b) py-0 shadow-none；内容 px-0
行（gR）：border-t border-border px-4(16px) py-3(12px) first:border-t-0（renderer@2410351）
  内部 grid items-center gap-4；控制列 default 192px / wide sm:280px，justify-end
  标签：text-ui-base font-medium text-foreground；描述：mt-1 text-ui-base leading-6 text-foreground-subtle
```

### 1.4 下拉（cva BSe @453019；tg @455088；content ng @455439；item rg @456518）

```
触发（variant=input, size=lg，设置页全用 lg）：h-8(32px) rounded-lg(8px) pl-3(12px) pr-2(8px) text-ui-base(14px)
  （renderer@454815）+ border-input-border bg-input(#fff/#2b2b2b) hover:border-input-border-hover
  focus-visible:border-input-border-focused focus-visible:bg-input-focused focus-visible:ring-0
  zai 主题下 input-border-focused = border-hover（亮 20% 黑 / 暗 #ffffff26，css@亲读）→ 聚焦仅边框加深
  chevron：ks size-3.5(14px) text-foreground-subtle
内容：rounded-lg border border-popover-border(=border) bg-menu(#fff/#2b2b2b) p-1 text-foreground shadow-md min-w-32（renderer@455717）
项：min-h-7(28px) rounded-md px-2 py-1 text-ui-base/relaxed data-[highlighted]:bg-menu-hover(亮 oklch(97%)/暗 #363636)（renderer@456645）
```

### 1.5 开关（Dj @1740389；2026-11-01 裁决的源码正身）

```
轨道：p-px peer relative inline-flex shrink-0 items-center rounded-full transition-all outline-none
      after:absolute after:-inset-x-3 after:-inset-y-2（renderer@1740629，命中区外扩 12px/8px）
      focus-visible:ring-2 focus-visible:ring-input-border-focused/30
      data-[size=default]:h-[18px] w-[32px]（renderer@1740780）；data-[size=sm]:h-[16px] w-[28px]
      data-checked:bg-primary(#000/#fff) data-unchecked:bg-primary/30
      data-disabled:cursor-not-allowed data-disabled:opacity-50
拇指：rounded-full bg-primary-foreground(#fff/#000) ring-0 transition-transform size-4(16px)
      data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0
```

### 1.6 返回钮（renderer@6454147 + button chunk button-DeDmlciX.js）

```
X ghost size=lg：h-8(32px) gap-1 rounded-lg px-2.5 + 覆写 m-1 w-[calc(100%-0.5rem)] justify-start gap-2 rounded-xl(12px)
                bg-surface(亮 rgba(13,13,13,.03)/暗 #ffffff0d) px-1.5(6px) text-remote-foreground-muted
                hover:bg-surface-hover hover:text-foreground；图标 ArrowLeft size-4(16px)（描边走全局 1.5）
ghost 基座：text-foreground hover:bg-hover hover:text-foreground（chunk 内 cva 亲读）
```

### 1.7 i18n（IntlProvider，zh 值）

分组：`settings.sidebar.group.basics`=基础设置（@130975）/ agentCapabilities=Agent 能力 / dataAndStats=数据与统计；分区：`settings.systemTitle`=常规（@135275）、`settings.appearanceTitle`=外观（@132039）、模型设置、浏览器控制、远程设备、电脑控制、`settings.shortcuts.title`=键盘快捷键（@132118）、个性化、记忆、子智能体、`settings.plugins.title`=插件（@228444）、MCP 服务器、技能、命令、钩子、`remoteSync.title`=数据同步（@364243）、使用统计、项目、`archives.nav`=归档管理（@1807）；另 `settings.navLabel`=主要项（@130949）、`settings.breadcrumbLabel`=设置路径、`workspace.backToWorkspace`=返回工作区。

### 1.8 spec.json 全量逐值重注（03f-settings-zcode-spec.json，CDP 捕获）

| spec 条目 | 实际身份（源码级） | 判定 |
|---|---|---|
| navItems[0] 基础设置 fs12/500/h22/r0 | **分组标签**（settings.sidebar.group.basics；text-ui-sm 12px/500 ✅；ZCode 另有 px-2.5/pb-1） | ✅ 与 1.2 一致 |
| navItems[1] 外观 fs16/400/h32/r12/rgb(179,179,179) | **k1n 的 button 元素**：h-8/rounded-xl ✅；fs16 是 button 继承的根字号（k1n 不设字号）；rgb(179,179,179)=#b3b3b3=remote-foreground-muted 是**按钮级**色 | ⚠️ **可见标签是内部 span：text-ui-base 14px + text-foreground**（1.2）——S1 的「导航 16px」采到的是 UA/根字号，非标签字号（→ D1） |
| navItems[2–4] 外观 h21/r0（fs16×2 #b3b3b3；fs14 oklch(.87 0 0)） | 非导航元素混入：fs14+oklch(.87)=暗色前景旧档 ≈ **面包屑当前项**（px-2 text-foreground，行盒≈21px）；fs16 h21 两条为页面同名文本混入 | ⚠️ 混入样本，不产导航结论 |
| navItems[5–9] 模型设置×4 / 键盘快捷键 fs16/400/h32/r12 | 同 navItems[1]（button 级） | ⚠️ 同上 |
| cards[0] bg rgb(22,22,22)/border 白10%/r12/pad0/w1456 | **data-settings-panel-frame**（bg-background #161616 + border-border #ffffff1a + rounded-xl 12px，@6456517；1728−268−边距≈1456） | ⚠️ **S2 的「卡片」实为面板 frame**，不是行卡（→ D2） |
| cards[1] bg transparent/border 白10%/r12/pad0/w1007 | 无法唯一指认（某透明容器或半透明层上的 frame 实例）；bg 测成 transparent 与 background-alt 半透明机制相容 | ❓ 存疑，不产 diff |
| cards[2] bg 白5%/border 白10%/r"12 2 12 12"/pad 12px 16px/w576 | **bg-surface 系容器**（暗 #ffffff0d=白 5.1% 一致）；右上角 2px 圆角疑为角部钮（复制类）切角 | ❓ 存疑，规格存档（bg-surface 值与 zcode-theme.ts:354 --dcu-surface 同值） |
| switches: [] | 捕获时外观页可视区无开关（行开关在下方/或当时版本未渲染）；开关规格已由 Dj 源码 + 2026-11-01 裁决补齐 | ✅ 无缺口 |
| selects[0] h1084/bg transparent/r0/fs16 | 非控件（页面级容器混入） | ⚠️ 剔除 |
| selects[1] h32/r8/fs14 | **tg size=lg**：h-8 rounded-lg text-ui-base（1.4） | ✅ S3 裁决与源码互证 |
| inputs: [] | 捕获区无输入框 | — |
| mainW 1454 | 面板 frame 内容宽（=1728−268−pr-1−边框） | ✅ 与 268px 侧栏列互证（→ D5） |

## 2. 差异表（mechanical：有证据、可机械落地、不触既有裁决；共 10 条）

落点集中在 `settings-page-styles.ts` 与 `settings-page-registration.ts`，全部是设置页作用域内的单点值。

| # | where | item | ours | zcode | 证据 |
|---|---|---|---|---|---|
| M1 | settings-page-styles.ts:76,81 + zcode-theme.ts:278,287,334,338 | 导航项文字/图标色 | 文字 `--sp-text`=`--dcu-sidebar-navigation` #262626/#d4d4d4；图标 `--dcu-sidebar-icon` #525252/#a3a3a3 | 标签 span 恒 `text-ui-base text-foreground`（前景基色亮 oklch(37.1%)≈#404040 / 暗 oklch(87%)≈#d4d4d4），图标 `text-foreground` 同前景；muted 只在 button 级（无标签兜底） | renderer@6455799 标签 span、@6434772 图标；styles.css `--color-foreground` :root=neutral-700(37.1%)/.dark=neutral-200(87%)；#404040/#d4d4d4 基色换算见 zcode-theme.ts:268,330 自家注释。亮色文字差一档、图标两主题都差 |
| M2 | settings-page-styles.ts:62,65,67 | 导航悬停底（暗色） | `--sp-hover`=`--dcu-sidebar-hover` 暗 rgba(255,255,255,.05)（亮 .05 黑 ✅ 同） | hover:`bg-surface-hover` 暗 #ffffff1a(.1 白)，**与选中同值**（hover=active）；亮 rgba(13,13,13,.05) | k1n @6434469 hover 类；styles.css `.theme-zai-dark --color-surface-hover:#ffffff1a`；zcode-theme.ts:288,339 现值 |
| M3 | settings-page-styles.ts:75 | 分组标签色 | `--sp-muted` #6b6b6b/#8f8f8f（按卡片底 AA 校准的档） | `text-remote-foreground-muted` #595959/#b3b3b3（导航底上的专用档；计算对比：5.9:1 on #f0f0f0、9.0:1 on #161616，双双过 AA） | renderer@6455192；styles.css `--color-remote-foreground-muted` 两值亲读；ours 值 zcode-theme/settings-page-styles.ts:50,55 |
| M4 | settings-page-styles.ts:75,76 | 导航水平内距 | 项 padding 0 8px、组标签 margin 0 8px（文本距 nav 边 16px） | 项与组标签均 `px-2.5`(10px)（距 nav 边 18px；nav 容器两侧 8px 两端一致） | renderer@6434469/@6455192；nav px-2 @6454833 |
| M5 | settings-page-styles.ts:78 | 导航项行距 | `.dcu-settings-link+.dcu-settings-link{margin-top:1px}`（注释引 Codex Desktop 30px/1px 体系） | 组内 `space-y-1`=4px | renderer@6455081；ours 注释 settings-page-styles.ts:77 |
| M6 | settings-page-registration.ts:131 | 触发钮图标描边 | `ZIconSettings strokeWidth:1.6`（全仓唯一 1.6 残留） | LucideProvider 全局 strokeWidth 1.5（renderer@6662862）；插件设置导航图标已 1.5（APPLIED 批次 13） | registration:131 vs CodexSettingsPage.tsx:235；grep 全 src/client strokeWidth 仅此一处 1.6 |
| M7 | settings-page-styles.ts:66 | 返回钮底色与圆角 | transparent + `--dsw-radius-lg`(8px) | ghost lg h-8 覆写 `rounded-xl`(12px) + `bg-surface`（亮 3% 黑/暗 5% 白）+ m-1 + px-1.5 | renderer@6454147 覆写串；bg-surface 两值 = zcode-theme.ts:311,354 `--dcu-surface`（已有同值令牌） |
| M8 | settings-page-styles.ts:127–131 | 开关细节三件 | 无命中区扩大；disabled `cursor:default`；轨道无 transition（拇指有 feedback ✅） | `after:-inset-x-3 after:-inset-y-2`（命中区外扩 12/8px）；`cursor-not-allowed`；轨道 `transition-all`（150ms (0.4,0,0.2,1) = tailwind 默认 = 插件 feedback 档） | renderer@1740629/@1740507；--dcu-motion-feedback zcode-theme.ts:131 |
| M9 | settings-page-styles.ts:96 | 通用设置分组标题（h2） | `--dsw-font-size-base`(14px)/600 | 小节标题档 `text-ui-lg`(+2)=16px/semibold（C1n 界面/代码 h3 同款）——插件分组标题是超集结构，按 ZCode 小节档取值 | renderer@6428806 h3 类；`--dsw-font-size-lg`=16px 令牌已存在（zcode-tokens.ts:556），换令牌即可；batch-13 断言只锁结构不锁字号 |
| M10 | settings-page-styles.ts:85,88 | 内容列 padding 与标题下距 | inner padding 48px 四边；heading margin-bottom 24px（无题 16px） | 内容列 `lg:px-8`(32px)/pb-10(40px)/pt-0；标题→内容 `gap-8`(32px) | renderer@2408672 hR、@6457500 段 flex flex-col gap-8；ours :85/:88 |

## 3. deviation（触既有裁决，登记不修；共 5 条）

| # | where | item | ours | zcode | 触及的裁决 / 证据 |
|---|---|---|---|---|---|
| D1 | zcode-theme.ts:302 + settings-page-styles.ts:76 | 导航项字号 16px | `--dcu-settings-nav-size:16px` | 标签 span `text-ui-base`=14px（--ui-font-size:14px，css 亲读）；spec.json 的 fs16 是 **button 继承根字号**（k1n button 不设字号，可见文字在 span 上） | S1 裁决（03f §2.4「导航 16px」）+ tests/night-audit-batch-8.assert.mjs:196（锁 16px）+ batch-17:43（锁令牌链）；本轮补出「fs16=button 级、span=14px」源码证据，建议下轮重开 S1 |
| D2 | zcode-theme.ts:308,351 + settings-page-styles.ts:45–49 | 设置卡底色 #fafafa/#161616 | 卡 = 页底同色，仅边框分隔（TA4 定案） | ZCode 三层：窗壳 background-alt → 面板 bg-background(#f8f8f8/#161616) → **行卡 bg-card(#fff/#2b2b2b)**；spec cards[0] 实为面板 frame（§1.8），外观页 C1n 的行卡全部 `bg-card` | S2 裁决（03f §2.4）+ TA4（zcode-theme.ts:305–308 注释）+ batch-17:9 断言「卡深色 fill #161616 证据 spec cards[0]」——cards[0] 身份已被源码推翻（@6456517）；登记，重开需连动 03g TA4 |
| D3 | settings-page-styles.ts:89 | 分区标题字号 | h1 `--dsw-font-size-xl`=18px/26px/600/-0.2px | `text-ui-settings-title`=24px（lg 30px）/600/tracking-tight(−0.025em≈−0.6px@24) | 插件令牌阶无 24px 档（headline=base+8=22px 最近但不同，zcode-tokens.ts:552–555）；字号字面量被 design-system 断言拦截 → 需扩令牌阶，登记 |
| D4 | settings-page-styles.ts:85 | 内容列最大宽 864px | 864px（verify-settings-geometry.mjs:33 锁定） | max-w-4xl=896px | **864 是 DSH 宿主设置页自己的宽度约定**（docs/UPSTREAM-CHANGELOG.zh-CN.md:178「其他设置页统一为最大 864px 宽度」）——宿主约束的显式调整，保留 864，仅登记差值 |
| D5 | settings-page-styles.ts:50 | 侧栏列宽自适应 | `clamp(240px, --dcu-sidebar-expanded-width, min(520px,…))` | 固定 `lg:grid-cols-[268px_minmax(0,1fr)]`（窄轨 68px） | 触 sidebar-width 裁决（night-audit-batch-3 / 04-open-gaps「宽 264」体系）；插件跟随宿主侧栏宽是既有架构，登记 ZCode 真值 268px 备查 |

## 4. 已对齐表（本轮复核，不再动）

| 项 | ours | zcode | 证据 |
|---|---|---|---|
| A1 导航项 h32/r12 | `--dcu-settings-nav-radius:12px` + height:32px（styles:76） | k1n `h-8 rounded-xl`（@6434469） | batch-17:39–40 断言；spec navItems h32/r12 互证 |
| A2 选中底色 | `--dcu-sidebar-selected` 亮 rgba(13,13,13,.05)/暗 rgba(255,255,255,.1) | `bg-surface-hover` 亮 5% 黑/暗 #ffffff1a | styles.css `.theme-zai-* --color-surface-hover`；zcode-theme.ts:288,339 |
| A3 下拉 h32/r8/fs14 | `[class*=selector]` 压 h32 + `--dsw-font-size-base`（styles:103–108） | tg size=lg `h-8 rounded-lg text-ui-base`（@454815） | spec selects[1] h32/r8/fs14 与源码互证（S3 正确） |
| A4 开关几何 | 32×18/p-px(1px)/thumb 16/位移 calc(100%−2px)/无阴影/ring-0/disabled opacity .5 | Dj 全同（@1740389） | 2026-11-01 裁决与源码逐值一致；styles:127–132 |
| A5 未选中轨 30% 主色 | `color-mix(in srgb,--dcu-primary 30%)`；--dcu-primary #000/#fff | `bg-primary/30`；--color-primary #000/#fff（zai） | styles:127 vs Dj @1740507；zcode-theme.ts:20–21 |
| A6 卡圆角/边/行分隔/行距 | r-xl 12px + 1px 边 + row+row border-top + 行 padding 12px 0（卡 0 16px → 等效 16/12） | rounded-xl + border-card-border(=border) + gR `px-4 py-3 first:border-t-0` | styles:97,110–112 vs @2410351；--sp-border=--dsw-alias-border-l2（亮黑10%/暗白10% 同值） |
| A7 页面底色 | `--dcu-settings-page-bg` #f8f8f8/#161616 | `.theme-zai-light --color-background:#f8f8f8` / `.theme-zai-dark:#161616`（css 亲读） | batch-5 断言值正确；⚠️ 仅 zcode-theme.ts:260,304 注释仍写「250/#fafafa」（TA1 旧值，注释失真非代码差） |
| A8 卡阴影 | 无 | `shadow-none`（_R 覆写） | @2411054 |
| A9 导航/主区滚动 | nav overflow-y:auto；main overflow:auto + overscroll-behavior:contain | nav `flex-1 overflow-y-auto`；main `overflow-y-auto [scrollbar-gutter:stable]` | styles:62,84 vs @6454833/@6457146 |
| A10 组间距 | `.dcu-settings-group{margin:0 0 16px}` | 组间 `space-y-4`(16px)（组内 space-y-1 差异见 M5） | styles:74 vs @6454833 |
| A11 返回钮高/图标/gap | height:32px + ZIconArrowLeft 16 + gap 8px | ghost lg h-8 + size-4 + gap-2 覆写 | styles:66 vs @6454147（底色圆角差见 M7） |
| A12 全局图标描边 1.5（导航图标） | 设置导航图标 strokeWidth 1.5（CodexSettingsPage.tsx:235） | LucideProvider 1.5 全局 | renderer@6662862；APPLIED 批次 13 |
| A13 拇指/反馈动效档 | `--dcu-motion-feedback` 150ms cubic-bezier(.4,0,.2,1) | tailwind transition 默认 150ms (0.4,0,0.2,1) | zcode-theme.ts:131 vs Dj transition-all/transition-transform |
| A14 深浅双主题切换面 | body[data-ds-dark-theme] 作用域全量覆盖 | `.theme-zai-dark` 类切换 | settings-page-styles.ts:55–57,65 |

## 5. 无参照表 + 穷尽搜索记录

| 项 | 结论 | 搜索记录（全部模式） |
|---|---|---|
| W1 设置导航搜索框（`settings.search` 搜索设置…，styles:68–73） | **ZCode 无此面**：其设置侧栏结构为 back→nav→footer，无输入框；`settings.search` 键在 IntlProvider 不存在（仅 `settings.search.clear`=清空搜索，供插件分区内容内的搜索用）——插件筛选能力为超集，保留 | IntlProvider 全文 `settings\.search` 2 处均为 `.clear`；renderer `plugin-settings-search` 仅 @5085837（插件分区内容内）；F9 渲染段逐段读毕无 input |
| W2 `settings.noResults`/`filterHint` 空态（CodexSettingsPage.tsx:239–240） | 随 W1 筛选派生，ZCode 无对应 | 同上；IntlProvider 两键 0 命中 |
| W3 面包屑（h-12 行 + eTn「设置路径」） | 插件无面包屑——结构缺口，规格存档：px-2.5、分隔 chevron size-3.5 subtlest、当前 px-2 text-foreground、可点项 ghost（@4760329） | renderer `eTn`/`$wn` 全段（@4759525–4761000）；插件 grep breadcrumb 0 命中 |
| W4 分区标题旁 Beta 徽章（automations titleBadgeId） | 插件无 automations 分区——规格存档：`h-6 rounded-md border px-2 text-ui-xs font-semibold`（@6457979） | N$n 注册表全量；IntlProvider `settings.automations.betaBadge`=Beta |
| W5 设置页脚 footer（用户钮+语言/主题/界面模式/缩放/登录菜单） | 插件经 `accountLauncher` slot 由宿主注入，无自有页脚——规格存档：footer `px-4 pt-2 pb-4 gap-2.5`（@2526773）、用户钮 ghost lg `rounded-tl-2xl rounded-bl-2xl pl-0` | tOt 全段（@2524745–2534200） |
| W6 设置触发钮形态 | ZCode = 页脚 32×32 纯图标钮（ghost icon-lg=`size-8 rounded-lg`，齿轮 size-4，@2532600 段）；插件 = 全宽 36px 行（齿轮+文字、hover 转 18°、active scale .98）——DSH slot 形状约束（宿主 sidebar.settings 槽是行位），结构存档 | tOt settings 钮段；styles:139–147 |
| W7 开关 sm 变体（28×16 thumb 14px） | 插件无 sm 档；设置页全部 default 档（Dj 无 size prop）——规格存档 | Dj @1740389 data-[size=sm] 段 |
| W8 主题预览卡（eTt 内联 --color-* + ring-1 ring-black/5）与 UI 字号滑杆（12–20px） | 插件无主题预览/字号滑杆功能面——规格存档 | C1n 全段（@6428806 起） |
| W9 spec cards[1]/[2] 的实际元素 | 静态无法唯一指认（透明 frame / bg-surface 切角容器），存疑不产 diff | §1.8；bg-surface 值链 styles.css + zcode-theme.ts:311,354 |
| W10 进入/退出动画（dcu-settings-enter/nav/content + 退出 140ms，CodexSettingsPage.tsx:83） | ZCode 设置页是路由 grid，渲染段无入场动画类——插件超集（宿主视图切换动画兜底），保留 | F9 渲染段 `animate|transition` 逐段扫描（仅 transition-colors） |

## 6. needs-live（须 9224 活体定）

| # | 事项 | 说明 |
|---|---|---|
| N1 | 开关 checked 底/拇指的宿主令牌值 | ZCode checked = 黑白反转（zai：轨 #000/#fff、拇指反色，1.5）；插件 checked 轨 = `--dsw-alias-brand-primary`、拇指 = `--dsw-alias-label-primary-foreground`——宿主运行时值静态不可得，若 brand-primary 是品牌蓝则与 ZCode 明显不同（未选中轨 30% 已对齐，见 A5） |
| N2 | 宿主 selector 下拉的 focus/hover 现状 | ZCode：focus 边框→border-hover、bg 不变、ring-0（1.4）；插件只压 h32/fs14，focus 行为宿主管——需活体比对宿主聚焦样式是否已同档 |
| N3 | M1/M3 两档灰的真实 AA | #404040 on #f0f0f0 ≈5.7:1、#b3b3b3 on #161616 ≈9.0:1 为算术值；落地前在真实设置页底上复测（对比制度 docs/ZCODE-DESIGN.md §9.3） |
| N4 | D1 重开裁决的活体观感 | ZCode 设置页 CDP 点不开（03f §0 记录），需人手打开后实测 k1n 标签字号（14px）与 hover=active 同底手感，供 D1/D2 连同断言重开 |

## 7. 给下一轮的整改建议（不动手，仅排序）

1. M6+M7+M8+M5+M4 是纯单点值（描边/返回钮/分组标题字号/行距/内距），一把梭收益最高、风险最低；M8 记得走 `--dsw-font-size-lg` 令牌（字面量会被 design-system 断言拦）。
2. M1+M2+M3 是「导航配色三件套」，建议一次 PR 内同改（都在 .dcu-settings-nav 作用域），并同步 batch-8:196 之外的期望值注释。
3. D1/D2 若要重开：先按 §1.2/§1.8 的源码证据在 03f 文档标注「S1 fs16=button 级、S2 卡=面板 frame」，再动 zcode-theme.ts 与 batch-8/17 断言，一次收口。
4. 建议把 §1.1 三层表面（background-alt → bg-background 面板 → bg-card 行卡）与 §1.5 开关 sm 档补进 01-design-tokens.md（本轮不改文档）。
5. W3 面包屑与 W1 搜索是「ZCode 有/插件无」与「插件有/ZCode 无」各一条的结构差，建议在 PARITY 文档登记，避免后续轮次重复发现（本轮不改文档）。

## 复核

> 复核员：surface-11 复核。日期 2026-11-03。只读（本轮仅在本节追加，未动上文任何一行）。
> 方法：独立重提 asar（`python3 -I` 解析头，文件区基址按 8+hdr[1]=8328604 重算），产物 `/tmp/zc-recheck/`（styles.css 480,065B / renderer.js 6,839,502B / IntlProvider.js 979,836B / button-DeDmlciX.js 5,313B / settings-*×4 合计 937B），与深挖员 `/tmp/zc-settings-extract` 逐字节 `cmp` **一致**；头 u32=(4, 8328596, 8328592, 8328585) ✅。源码树取 `/Users/m1/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui`（唯一含 tests/night-audit 断言的副本）。

**⚠ 通用发现（影响全部 renderer@ 引用的复核姿势，不影响各条实质结论）**：§0「grep -aob / dd if=… skip=… 可直接复核」**不成立**——`renderer@N` 实为 **UTF-8 字符偏移**（decode 后字符串索引），不是字节偏移。按字节读（grep -aob / dd）全部偏 +89KB～+116KB 且随位置增长（如 after:-inset-x-3 字节 @1829931 vs 文档 @1740629）。按**字符**语义读取：抽验 26 处中 24 处逐字命中（1740389 Dj、1740507/1740629/1740780 开关三段、2407282 pR、2408672 hR、2410351 gR、2410997/2411054 _R、4273836 l2、454815 tg lg、6428806 C1n、6434260 k1n、6434469 button、6434772 图标、6454833 nav、6455081 space-y-1、6455192 组标签、6455799 span、6456517 frame、6457500 gap-8、6457812 标题、6662862/6662906 S3n）；2 处不命中：@1872347（fct，实际 @1782443）、@6457146（A9 的 main，实际 @6457452，内容存在、偏移差 ~300）。

### §2 mechanical

| # | verdict | 复核所见 |
|---|---|---|
| M1 | **unconfirmed**（部分推翻） | ours 侧 ✅：styles.ts:62,65（--sp-text→--dcu-sidebar-navigation）/:76/:81，zcode-theme.ts:278,287,334,338 实读 #262626/#d4d4d4、#525252/#a3a3a3。zcode 结构 ✅：k1n button 不设色（active `bg-surface-hover text-foreground` / inactive `text-remote-foreground-muted`，@6434469 全函数亲读）、标签 span `truncate text-ui-base text-foreground`（@6455799）、图标 `size-4 text-foreground`（@6434772）。**但前景亮色值错**：styles.css 实测 `.theme-zai-light{--color-foreground:var(--color-neutral-800)}`，`--color-neutral-800:oklch(26.9% 0 0)`（≈#262626，手算换算 38,38,38 吻合）；oklch(37.1%) 是 `:root` **默认主题**的 neutral-700，zai 不用。因此**亮色文字实为同值 #262626，「亮色文字差一档」不成立**；暗色 oklch(87%)≈#d4d4d4 ✅（spec.json navItems[4] CDP 实测 `oklch(0.87 0 0)` 互证）；「图标两主题都差」✅（#525252/#a3a3a3 vs 前景 #262626/#d4d4d4）。zcode-theme.ts:268 注释「ZCode 浅色 --color-foreground=oklch(37.1%)」本身即误引默认主题，M1 沿用了它。 |
| M2 | **verified** | styles.ts:62,65,67 实读 `--sp-hover`→`--dcu-sidebar-hover` 回退 rgba(13,13,13,.05)/rgba(255,255,255,.05)；zcode-theme.ts:288,339 同值实读 ✅。k1n @6434469：active 与 hover 均为 `bg-surface-hover`（hover=active 同值 ✅）。styles.css `.theme-zai-light --color-surface-hover:#0d0d0d0d`（5% 黑）✅、`.theme-zai-dark:#ffffff1a`（10% 白）✅。 |
| M3 | **unconfirmed**（zcode 侧成立，ours 值失真） | zcode ✅：@6455192 组标签 `px-2.5 pb-1 text-ui-sm font-medium text-remote-foreground-muted`；styles.css `--color-remote-foreground-muted:#595959`/#`b3b3b3` 亲读 ✅。ours **值错档**：styles.ts:75 `color:var(--sp-muted)` 的生效值不是 :50/:55 的 #6b6b6b/#8f8f8f——分组标签在 nav 内（CodexSettingsPage.tsx:233 h2.dcu-settings-group-label 位于 nav>.dcu-settings-groups），而 styles.ts:62,65 在 `.dcu-settings-nav` 作用域把 `--sp-muted` 重定义为 `var(--dcu-sidebar-secondary,#5c5c5c)`（暗回退 #888888），即 zcode-theme.ts:277 `color-mix(in oklab,#404040 85%,transparent)` / 暗 `#d4d4d4 68%` 档。差异方向（zcode 专用档 vs ours 侧栏 secondary 档）仍成立，但表格 ours 一栏应改写。另两处对比值为近似：`#595959 on #f0f0f0` 实算 **6.15:1**（写 5.9）、`#b3b3b3 on #161616` 实算 **8.63:1**（写 9.0）；双双仍过 AA，方向不变。 |
| M4 | **verified** | ours：styles.ts:76 `padding:0 8px`、:75 `margin:0 8px 4px`、:62 nav `padding:18px 8px`（文本距 nav 边 16px）逐字实读。zcode：项 `px-2.5` @6434469、组标签 `px-2.5` @6455192、nav `px-2 pb-3` @6454833（距边 18px）。 |
| M5 | **verified** | styles.ts:78 `.dcu-settings-link+.dcu-settings-link{margin-top:1px}` + :77 注释「Codex Desktop SidebarItem / SidebarSection：30px 行高、1px 行距」实读；zcode `space-y-1` @6455081（组内 4px）。 |
| M6 | **verified** | settings-page-registration.ts:131 `strokeWidth: 1.6` 实读；`grep -rn "strokeWidth: 1.6" src` 全仓仅此一处 ✅。zcode `var S3n=1.5` @6662862、包裹点 @6662906 实读。插件导航图标 1.5：CodexSettingsPage.tsx:235 `<Icon size={16} strokeWidth={1.5}…>` 实读；tests/night-audit-batch-13.assert.mjs:83-84 断言在；APPLIED.md:26「| 13 | CodexSettingsPage.tsx | 导航项图标描边 1.6 → 1.5 |」实读。 |
| M7 | **verified** | styles.ts:66 `background:transparent;border-radius:var(--dsw-radius-lg)`，`--dsw-radius-lg:'8px'`（zcode-tokens.ts:507 实读）。zcode @6454147 覆写串 `m-1 w-[calc(100%-0.5rem)] justify-start gap-2 rounded-xl bg-surface px-1.5 text-remote-foreground-muted hover:bg-surface-hover` 逐字命中；zcode-theme.ts:311,354 `--dcu-surface:rgba(13,13,13,.03)`/`rgba(255,255,255,.05)` 实读。 |
| M8 | **verified** | ours：styles.ts:127 无 after 命中区、轨道无 transition；:130 `:disabled{cursor:default;opacity:.5}`；:131 拇指 transition:transform feedback 档——逐字实读。zcode：`after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-input-border-focused/30`（@1740629）、`data-checked:bg-primary data-unchecked:bg-primary/30 data-disabled:cursor-not-allowed data-disabled:opacity-50`（@1740924）、轨道 `transition-all`（@1740507）；tailwind 默认 `--default-transition-duration:.15s` + `cubic-bezier(.4,0,.2,1)`（styles.css @layer theme 亲读）= zcode-theme.ts:131 `--dcu-motion-feedback-*` 同值。 |
| M9 | **verified** | styles.ts:96 `font-size:var(--dsw-font-size-base);font-weight:600`（=14px，zcode-tokens.ts:554）实读；zcode C1n @6428806 函数体内 h3 `text-ui-lg font-semibold text-foreground` 亲读，`--text-ui-lg:calc(var(--ui-font-size) + 2px)`=16px（styles.css @layer theme）；`--dsw-font-size-lg` 令牌已存在（zcode-tokens.ts:556）；batch-13.assert.mjs:66 只锁 `<section className="dcu-settings-general-group"…><h2>…</h2><div className="dcu-settings-card">` 结构、无字号断言 ✅。 |
| M10 | **verified** | styles.ts:85 `padding:48px 48px`、:88 `margin-bottom:24px`、:91 无题 16px 实读；zcode hR @2408672 `` `mx-auto w-full max-w-4xl px-4 pb-8 pt-0 lg:px-8 lg:pb-10` `` 逐字命中、@6457500 `` Z(hR,`flex flex-col gap-8`…) `` 命中（gap-8=32px）。 |

### §3 deviation（只核证据成立性）

| # | verdict | 复核所见 |
|---|---|---|
| D1 | **证据成立** | zcode-theme.ts:302 `--dcu-settings-nav-size:16px` 实读；styles.ts:76 `font-size:var(--dcu-settings-nav-size,var(--dsw-font-size-base))!important` 实读；batch-8.assert.mjs:196 正是 `line(302)→'--dcu-settings-nav-size:16px;'`、batch-17.assert.mjs:43 正是锁该令牌链的正则断言——行号逐一对上。「fs16=button 级、span=14px」的源码解读成立：k1n button 无字号类（@6434260 全函数）、标签在 span `text-ui-base`（@6455799）、`--ui-font-size:14px`（styles.css 亲读）、spec.json navItems[1] fs16/h32/r12/rgb(179,179,179)（=#b3b3b3 muted，按钮级色）与 navItems[4] fs14/`oklch(0.87 0 0)`（=span 档）双佐证；03f-settings.md §2.4:99 S1「16px / r12」裁决原文在。 |
| D2 | **证据成立**（一处引用更正） | 三层表面亲验：@6456517 `data-settings-panel-frame…border border-border bg-background`+`rounded-md`/`rounded-xl`；@2410997 _R `overflow-hidden rounded-xl border border-border bg-card py-0 shadow-none`；C1n 段内 2 处 `bg-card` 行卡；styles.css `.theme-zai-light --color-background:#f8f8f8`/`.theme-zai-dark:#161616`、`--color-card:#fff`/`#2b2b2b` 亲读；spec.json cards[0] bg rgb(22,22,22)/border 1px rgba(255,255,255,.1)/r12/pad 0/w1456、mainW 1454、winW 1728 实测（1728−268−边距≈1456 自洽）；ours styles.ts:45–49、zcode-theme.ts:308,351（TA4 注释 :305–308「浅色对称取画布值 #fafafa」）实读。**更正**：「batch-17:9 断言」实为 batch-17.assert.mjs 第 9 行**注释**（「锁什么」清单第 2 条）；可执行断言仅 :55 锁 `.dcu-settings-card{border:1px solid var(--sp-border);…background:var(--sp-card)` 结构，全文件 grep `161616` 在断言语句中 0 命中——「断言」应读作「批次说明」，不影响 D2 重开论证本身。 |
| D3 | **证据成立** | styles.ts:89 h1 `font-size:var(--dsw-font-size-xl);line-height:26px;font-weight:600;letter-spacing:-.2px`（--dsw-font-size-xl=base+4=18px，zcode-tokens.ts:555）实读；zcode @6457812 `text-ui-settings-title font-semibold tracking-tight text-foreground lg:text-ui-settings-title-lg` 命中，styles.css @layer theme `--text-ui-settings-title:calc(var(--ui-font-size) + 10px)`=24px、`--text-ui-settings-title-lg:+16px`=30px 亲读；headline=base+8=22px（zcode-tokens.ts:552）「最近但不同」属实。 |
| D4 | **证据成立** | styles.ts:85 `width:min(100%,864px)` 实读；scripts/verify-settings-geometry.mjs:33 `assert.equal(…width), 864, '常规设置页继续保持易读宽度')` 实读；docs/UPSTREAM-CHANGELOG.zh-CN.md:178「使用统计与其他设置页统一为最大 864px 宽度」实读。 |
| D5 | **证据成立** | styles.ts:50 `grid-template-columns:clamp(240px,var(--dcu-sidebar-expanded-width,240px),min(520px,calc(100vw - 320px)))` 实读；zcode `grid-cols-[68px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[268px_minmax(0,1fr)]`（@6453338）亲读；batch-3.assert.mjs:6-9「默认展开宽度 264px…04-open-gaps.md:784 侧栏裁决『宽 264 / bg #161616』」实读。 |

### §6 needs-live（核静态前置；活体部分未采，如实标注）

| # | verdict | 复核所见 |
|---|---|---|
| N1 | **静态前置 verified，且可比文档预期更早收口** | zai 黑白反转亲验：styles.css `.theme-zai-light --color-primary:#000`/`.theme-zai-dark:#fff`、`--color-primary-foreground:#fff`/`#000`；Dj 轨 `data-checked:bg-primary`（@1740924）、拇指 `bg-primary-foreground ring-0 … translate-x-[calc(100%-2px)]`（@1741132）。ours 引用链实读：styles.ts:129 `background:var(--dsw-alias-brand-primary,#000)`、:132 拇指 `var(--dsw-alias-label-primary-foreground,#fff)`。**新证据**：本仓令牌表已静态定义 `--dsw-alias-brand-primary:'#000000'`（zcode-tokens.ts:118，注释「ZCode: --color-brand / --color-primary = #000000（中性黑，非蓝色）」）/'#ffffff'（:349），`--dsw-alias-label-primary-foreground:'#ffffff'`（:100）/'#000000'（:333）——「若 brand-primary 是品牌蓝则明显不同」的担忧在本仓静态令牌层**已被否定**；活体仅剩「宿主是否有更高优先级覆盖」单一问题。未采活体。 |
| N2 | **静态前置 verified（一处数值更正）** | input cva 亲读（@453681 段）：`variant:{input:border-input-border bg-input text-foreground hover:border-input-border-hover focus-visible:border-input-border-focused focus-visible:bg-input-focused focus-visible:ring-0`——聚焦仅边框加深、bg 变 `bg-input-focused`、ring-0 ✅。`.theme-zai-light --color-input-border-focused:var(--color-border-hover)` 与 `.theme-zai-dark` 同构 ✅。**更正**：zai `--color-border-hover:#0d0d0d26`（=15% 黑，0x26=38/255≈14.9%）——1.4 写「亮 20% 黑」不对（20% 是 `:root` 默认 `#0a0a0a33` 的 alpha）；暗 `#ffffff26` ✅。插件侧 styles.ts:103–108 只压 h32/fs14、focus 行为宿主管 ✅；「需活体比对」定性成立，未采。 |
| N3 | **unconfirmed（算术两处不准）** | 独立按 WCAG 相对亮度公式实算（python）：`#404040 on #f0f0f0` = **9.1:1**（文档写 ≈5.7:1，错，且 #404040 本就不是 zai 亮前景，见 M1；zai 亮前景 #262626 on #f0f0f0 实算 ≈13.3:1）；`#b3b3b3 on #161616` = **8.63:1**（写 ≈9.0，近似偏差）；M3 的 `#595959 on #f0f0f0` = 6.15:1（写 5.9）。三组仍全部过 AA，方向不变；「落地前在真实设置页底上复测（§9.3）」的必要性反而加强——docs/ZCODE-DESIGN.md:299「### 9.3 因此形成的制度」实读在。活体复测未采。 |
| N4 | **前置成立；活体 not-run** | 03f-settings.md §0 实读：:15「CDP `Input.dispatchMouseEvent` 坐标点击 ❌ 无响应」、:27「需人工在 ZCode 窗口点开设置页」——「CDP 点不开」记录属实。k1n 标签 14px 静态证据已立（见 D1）。活体观感项（k1n 标签字号手感、hover=active 同底）静态复核员无法替代采样，**未执行**。 |

### 复核小结

- mechanical 10 条：**8 verified**（M2/M4/M5/M6/M7/M8/M9/M10）、**2 unconfirmed**（M1 亮色前景值错档——实为同值，图标差成立；M3 ours 值失真——实取 nav 作用域 sidebar-secondary 档）。M1/M3 的整改方向不受影响，但 M1 的「亮色文字差一档」与 N3 的 5.7:1 依据须按本节实测值重写后再落码。
- deviation 5 条：证据全部成立（D2 附「batch-17:9 是注释非断言」一处更正）。
- needs-live 4 条：静态前置全部核实，N1 可提前静态收口大半，N3 算术值须以本节实算为准。
- 全局方法论问题 1 条：§0 的字节偏移复核法声明不成立，renderer@N 均为字符偏移（2 处引用偏移本身也不准：fct @1782443≠1872347、main @6457452≠6457146），后续轮次引用前建议先按字符语义重校。
