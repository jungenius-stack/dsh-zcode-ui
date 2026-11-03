# 批次 9 · conversation-layout.ts / settings-nav-icons.ts / composer-width.ts / session-manager.ts / new-conversation-style.ts

> 2026-10-30 夜间审计（批次 9/20，只读，不改 src/tests/既有文档）。
> 参照文档：`03c-conversation.md`（列宽/轮距/气泡/代码块/表格引用，主参照）、`03n-typography.md`（排版节奏全表）、`02-motion.md`（操作行实测表 :362-371、时长分档校正 :345-360）、`03d-composer.md`（宽度手柄 W1/W2）、`03f-settings.md`（设置导航语境）、`03p-startup.md`（确认新建页 hero 不在其覆盖内）。
> `04-open-gaps.md` 仅 grep 未整读：`composer-width|COMPOSER_MIN_WIDTH|contentWidth|输入区宽度|拖拽宽` → 0 命中；`new-conversation-style|dcu-home|composerHero` → 仅 :1978「新建页 hero 待建覆盖」；`G18` → :104/:113 已收口（折叠钮位置=已裁决 DSH 适配，不入 diffs）；`overflow-x` → 仅 UX1 无关。
> 本批 asar 提取（本轮实跑，`A=/Applications/ZCode.app/Contents/Resources/app.asar`，均为固定串）：
> - `grep -a -c 'overflow-x-hidden' $A` → **10**
> - `grep -a -o -m 3 'rounded-tr-xs' $A` → 3 命中；`'pl-3 pr-2 pt-2'` → 3；`'px-1.5 py-0.5'` → 3；`'rounded-md border border-border'` → 3；`'my-4 border border-border bg-card'` → 1；`'github-dark'` → 2；`'#24292e'` → 2
> - 8 个设置导航图标 path 逐条 `grep -a -c '<path数据头>' $A` → **8/8 全文 0 命中**；短片段复核（`5.46369`/`15.4067`/`6.93735`/`0.546878`/`2.05975`）仅 `'15.4067'` 命中 1 次，按字节偏移 `grep -a -b -o -m 1` + `dd` 开窗 420 字节确认落在 integrity version/signature hash 串上下文，**非 SVG** → 图标 path 无 ZCode 例证
> - ⚠ 码体上下文提取 `grep -a -o -E -m 2 '.{0,60}code-block-body.{0,220}'` **被取消**（341MB 上带界正则过重，未重试）→ D2 的 ZCode 侧内边距未能本轮从 asar 重验，引用模块注释自记值并如实标注
> 消费侧令牌旁证（只读）：`zcode-tokens.ts:504-508,521,524,551,558`（r-xs 2 / r-md 6 / r-lg 8 / r-xl 12 / full 999 / shadow-lv1 / font-size-sm=base−2）、`zcode-tokens.ts:321,442`（border-l2 10% 前景、行内码 50% alpha）、`zcode-theme.ts:131,137-138`（feedback 150ms (.4,0,.2,1)、move 200ms (0,0,.2,1)、collapse 300ms）。

## 差异项（有证据）

| 模块 | 项 | 本仓库值 | ZCode 值 | 证据来源 | 建议动作 |
|---|---|---|---|---|---|
| conversation-layout.ts | 用户气泡折叠 max-height 的过渡时长档位 | 消费 `--dcu-motion-move-duration/ease`（`:196`）；该令牌 2026-10-29 起为 **200ms cubic-bezier(0,0,.2,1)**（zcode-theme.ts:137） | `max-height 300ms ease-out`（= 300ms cubic-bezier(0,0,.2,1)） | `03c-conversation.md` C2-2（asar O4t + 9224 实测，当时判 ✅ 因 move 档彼时=300ms）；`02-motion.md` :345-360（2026-10-29 asar 校正：move 改 200ms、另立 collapse 300ms 档）；`conversation-layout.ts:187` 注释仍写「move 档（300ms）」未随改 | 折叠过渡改挂 300ms ease-out（collapse 档或专用值），同步更正 `:187` 注释。**未验证**：活体时长本轮无 CDP 条件未复测 |
| conversation-layout.ts | 码体 pre 内边距 | `padding:6px 8px 12px`（`:251`，上6/左右8/下12） | `8/8/0/12`（模块注释自记的 asar 定案口径） | `conversation-layout.ts:226`（「码体 …内边距 8/8/0/12」）vs `:251` 实写值，同文件自相矛盾；⚠ 本轮 asar 上下文提取命令被取消（见头部），原始类名未重验 | 按 `05-extraction-method.md` 重取 pre 类名内边距后统一；若 6/8/12 是刻意适配写明理由 |
| composer-width.ts | 新建页拖拽手柄热区宽 | `width:32px`（`:20`，`[data-dcu-width-handle]`） | 同类型宽度手柄 10px 通高（宿主 `ST7X_W_widthHandle`） | `03d-composer.md` §6 W1 表（W1/W2 只裁决删 `::after` 视觉线，未裁决热区宽度） | 确认 32px 是否刻意放大触达面：是则在模块注释写豁免理由；否则收窄至 10px |

## 一致项（回归加固建议）

| 模块 | 断言点 | 期望值 | 证据来源 |
|---|---|---|---|
| conversation-layout.ts | 内容列两档宽 + 切宽阈值 + 输入卡跟随 | 窄档 848 / 宽档 1104（`ZCODE_CONTENT_WIDTH*` `:26-28`），容器查询阈值 1188（`:34,56`），输入卡 = 列宽+16（`:59-60`） | `03c` §E 两档表 + 实测对照（1280→848/864、2000→1104/1120） |
| conversation-layout.ts | 轮组间距 / 正文行高 / 等宽字号 | `--dsh-chat-flow-gap:20px`（`:77`）；正文 lh 24.5px（`:83`）；等宽 `--dsw-font-size-sm`(=12px)/21px（`:95-96`） | `03c` A2/B1/B3；`03c-conversation-zcode-spec.json` rows margin `20px 0px 0px`、fs14/lh24.5 |
| conversation-layout.ts | 正文操作行全套 | gap 4 / mt 4 / 默认 opacity 0、hover+focus-within → 1（`:110-122`）；过渡只动 opacity feedback 档 150ms (.4,0,.2,1)（`:115` + zcode-theme.ts:131）；按钮 min-width 24 / height 24 / r-md=6px / pad 0 4px / 透明底 / 全前景（`:128-146` + zcode-tokens.ts:506）；图标 14×14 / stroke 1.5（`:147-153`） | `02-motion.md` :362-371「正文操作行」ZCode 实测表逐项 |
| conversation-layout.ts | 用户气泡（G17） | border 1px 10% 前景 / radius `xl xs xl xl`=12·2·12·12（`:174-177` + zcode-tokens.ts:504,508）/ pad 12px 16px / max-w 576 / lh 21+delta / 右对齐（`:170-181`） | `03c` C-0 闭环矩阵；asar 本轮 `rounded-tr-xs` 3 命中 |
| conversation-layout.ts | 围栏代码块结构（D1） | 外卡 1px 边 / 圆角 0 / 卡底令牌（`:232-236`）；banner 透明底 + pad 8·8·8·12（`:237-241`）；码体 rounded-md + 1px 边（`:249-250`）；行内码 pad 2px 6px(=px-1.5 py-0.5) / r-md / 无边 / 50% alpha（`:253-259` + zcode-tokens.ts:442,321）；shiki 落 github-dark | 模块注释 `:221-231`；asar 本轮 `my-4 border border-border bg-card`、`pl-3 pr-2 pt-2`、`px-1.5 py-0.5`、`rounded-md border border-border`、`github-dark`/`#24292e` 全命中 |
| conversation-layout.ts | T1 排版节奏 | 字距 0.025em / p 0.35px / pre·code·kbd 归零（`:276-280`）；h1 18/31.5/600、h2 16/28/600、h3-h4 14/24.5/600、h5 500、h6 400，一律 mt24 mb16（`:283-288`）；ul/ol my12 pl20、li pl4 lh24.5、li+li 6、marker 30%、嵌套 my6（`:291-299`）；li>p 归零 inline（`:302`） | `03n-typography.md` A1-A13 + B1-B9 全 ✅ |
| conversation-layout.ts | 尾行系 | hr 线条抹掉留 24px（`:310-315`）；时间戳 12px/30%（`:316-320`）；工具行 30%/500（`:330-335`） | `03n` E1/E2/E5 |
| conversation-layout.ts | 表格 / 引用块 / 附件图 | th·td pad 8px 12px + border-b 1px 10%、th 400+30%、td 全前景（`:354-367`）；blockquote 左 4px/衬 14px/margin 1.6em/italic/500（`:368-377`）；附件图 1px 边 + r-xl=12（`:378-381`，阴影有意不加） | `03c` D-2/D-3/D-4（D-4 注明阴影豁免=已裁决） |
| conversation-layout.ts | 会话区禁横向滚动（X1） | `[data-conversation-scroll]{overflow-x:hidden}`（`:46`），pre/表格各自横滚 | 模块注释 `:41-45`（声明活体实测）；asar 本轮 `overflow-x-hidden` 计数 10 |
| composer-width.ts | 手柄只删视觉线、拖拽能力保留 | `::after` 竖线已删（`:18-20` 注释），col-resize 光标 / pointer 拖拽 / localStorage 偏好（`:49-72`）全保留 | `03d-composer.md` §6 W2（已裁决收口） |

## 无参照项（不得猜）

- settings-nav-icons.ts 全部图标决策 —— 8 个内联 path 数据 + viewBox（16/16·20/20·14/14）+ `fill=none` 根 + `fill=currentColor` path 方案（`:5-14,69-71`）：asar 固定串提取 8/8 全文 0 命中（短片段唯一命中经 dd 开窗证实为 hash 串），`03f` §1 只记录「8 个分区图标」清单、无 ZCode 图标规格；`ABOUT_SETTINGS_NAV_ORDER='2147483647'` 置尾（`:3,59-63`）为 DSH 自有排序裁决。全部无 ZCode 例证，跳过。
- new-conversation-style.ts 新建页自有几何 —— hero 卡 max-w 768 / min-h 340（窄 420）/ pad 32·28（窄 24）/ 鱼 hitbox 46 / headline `--dsw-font-size-display`+10px（`:8-12`）、workspaceRow 4% 混底 + `r-xl 12 0 0`（`:13`）、建议卡 42px/10% 边/r-xl、任务钮 r-lg/8·12、suggestions 13/20、grid 4→2@640（`:16-34`）—— ZCode 新建页这些元素未采集（`03p-startup.md` 只覆盖启动画面；04:1978 列「新建页 hero」为待建），跳过。
- composer-width.ts 数值参数 —— 最小宽 640（`:1`，`:3` 注明「按用户要求」，用户裁决非 ZCode 对齐）、`COMPOSER_EDGE_BUDGET=176`（`:2`）、键盘步长 20 / Home 归最小（`:73-78`）—— ZCode 手柄无键盘步进与最小宽的可提取证据，跳过。
- conversation-layout.ts `.dcu-bubble-toggle` 钮面样式组合 —— bg base / label-secondary / shadow-lv1 / backdrop-blur 4px（`:202-215`）：`03c` C2-4 只采到「32px 胶囊 + aria」与位置适配（C2-5 已裁决），钮面底色/阴影/毛玻璃无 ZCode 记录，跳过。
- session-manager.ts 全模块 —— 未读标记存储 v1（`:1,18-37`）、toggle/后台完成判定（`:7-16`）、deep link 拼参（`:39-43`）均为行为逻辑，无颜色/圆角/动效/字号决策点，无 ZCode 对应物可查，跳过。
