# gapfill-14 · 批次14 无参照项补采（navigation-history / session-pending / archive-session-delete / TurnNavigator 浮层细节 / InputHistoryDock hint）

> 2026-10-30 补采。对象：`night-audit/batch-14.md`「无参照项」5 条。
> 方法：全部对 `/Applications/ZCode.app/Contents/Resources/app.asar`（341MB）实跑 `grep -a`（下文命令均本轮执行，`A=` 同前例指 asar 全路径）；长上下文用 `grep -a -b -o` 取字节偏移 + `tail -c +N | head -c M` 切片；复杂中文窗口正则遇 ugrep 复杂度上限时改 `-F` 定位 + 偏移切片。文档侧复核 `night-audit/batch-14.md`、`03-turn-navigator.md`（C1/C5/§七）、`03d-composer.md`（D-g/D-h 缺口）、`uiplug/src/client/zcode-tokens.ts`（ZCode→DSH 令牌映射表，`Read` 全文 120+75 行 + `sed -n 495,530p`）、`uiplug/src/client/locales.ts`（`input.historyHint`/`turns.*`）。
>
> **总判定：found=3, absent=2。** 条目2 从「未采集」升级为「有参照」（ZCode pendingInteraction 域完整在包，kind 枚举三值同构）；条目4、5 部分升级（tooltip 色对令牌、前景阶梯、composer 容器查询与 hint 文案族均有载体；阴影/72 截断/断点数值/18px 行高/order/阈值维持无）；条目1、3 维持「确认无参照」但补齐语境事实。注意：**有参照 ≠ 数值一致**，条目4/5 的多数命中为「档位/数值不同」差异项。

---

## 条目1 · navigation-history.ts 全模块（uiplug `:21-54`：entries+index 会话历史栈、剪枝、pending 重定向、canBack/canForward 快照）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '(canBack|canForward|canGoBack|canGoForward|goBack|goForward|navigateBack|navigateForward)' $A | sort | uniq -c | sort -rn` → canGoForward×44、canGoBack×44、goBack×42、goForward×41、navigateForward×5、navigateBack×5；**uiplug 的快照字段名 `canBack`/`canForward` 0 命中**
- `grep -a -o -E '[a-zA-Z$_]*(History|history)Stack|[a-zA-Z$_]*navHistory[a-zA-Z$_]*|sessionHistory[a-zA-Z$_]*|backStack[a-zA-Z$_]*' $A | sort | uniq -c` → **0 命中**（无 visited 栈/回退栈命名物）
- `grep -a -o -E '(popstate|history\.(pushState|replaceState|back|forward))' $A | sort | uniq -c` → popstate×46、history.pushState×8、history.back×3（Web 文档历史层，非会话层）
- navigateBack 全部 5 处逐一切片：i18n `settings.shortcuts.command.navigateBack`:后退 / `Navigate Back`（@310471379 zh、@310936000 en）；命令注册 `{id:'navigateBack',channel:'window',defaultBindings:['CmdOrCtrl+[']}`（@325563048，同表 `previousConversation`=CmdOrCtrl+Shift+[、`nextConversation`=CmdOrCtrl+Shift+]）；挂载 `hk('navigateBack')`（@332242813）；消费接线（@332254855）：
  ```js
  previousConversation:Fr, nextConversation:Ir, navigateBack:Rr?()=>An(Lr):null, navigateForward:jr?()=>An(Dr):null
  // Lr=sr==='plugin-store'?hr:Er, Rr=sr==='plugin-store'||Ar
  // An=(0,Q.useCallback)(e=>{Not({isWorkspaceVisible:j,onReturnToWorkspace:x,run:e})},…)
  ```
  ——**视图级**调度（onReturnToWorkspace：从 plugin-store 等外部视图退回工作区），非会话历史。`hr=(0,Q.useCallback)(()=>{cr('chat')},[])`（设置退出→chat）；`Er=` 在 65KB 切片（332190000 起）内唯一命中（rel 6785）为**输入框宽度键盘回调**（ArrowLeft/Right/Home/End → `Sr(r,{persist:!0})`），属另一组件同名压缩变量，shell 侧 Er 的模块级绑定未能追到（压缩名跨 chunk），但接线语义（视图回退）已定。
- prev/next 会话的实现（@328130906）：`canSelectPreviousConversation:a!==null,canSelectNextConversation:o!==null,previousTaskId:a,nextTaskId:o`——由任务列表序取 i±1，消费点 `i=e==='previous'?r.previousTaskId:r.nextTaskId;i&&Cr(O,i,le)`（@332254344）。**是列表序 prev/next，不是访问历史栈**：无 entries 数组、无剪枝（slice(0,index+1)）、无 pending 重定向。
- goBack 语境定性：`grep -a -b -o -E '.{55}goBack.{55}' | head` → 全部为 Playwright/CDP 域（`this._channel.goBack`、`Page.goBack`）与内嵌浏览器空壳 API（`goBack(){} goForward(){}`），无会话级实现。

**最终判定：确认无参照（absent），补两条语境事实。** ZCode 无「会话级前进后退栈」同构物（canBack/canForward 字段名、historyStack/backStack 命名、entries+剪枝+pending 重定向机制全部 0 命中）——uiplug 的 NavigationHistory 是插件自有状态机。新事实①：ZCode 有**视图级** navigateBack/Forward 窗口命令（CmdOrCtrl+[ / ]，i18n「后退/前进」，plugin-store→chat 回退语义），后续若做「后退」交互可引用该命令面而非误当会话栈；新事实②：ZCode 的「上一条/下一条会话」= 任务**列表序** prev/next（Shift+[/]，canSelectPrevious/NextConversation 门控），与 uiplug 的访问顺序栈语义不同，不可直接对标。

---

## 条目2 · session-pending.ts 全模块（uiplug `:35-44` pending 枚举 approval/plan-review/question、`:26-33` 旧/新 Store 双路订阅）

**搜索过的模式**（全部实跑）：
- `grep -a -o -iE '(pendingInteraction|pending_interaction|plan-review|planReview|plan_review)' $A | sort | uniq -c` → **pendingInteraction×93**；plan-review/planReview/plan_review **0 命中**（DSH 的 `plan-review` 字面量在 ZCode 不存在）
- pendingInteraction 结构位切片：会话 schema `pendingInteractions:e.array(TO),pendingCommands:e.array(EO),…`（@278924988）、会话列表 meta `pendingInteraction:qD.optional(),pendingInteractionSummary:KD.optional()`（@279014854/@279713328）、会话列表派生 `G.pendingInteractions.length>0?"interaction":…`（@280117356）——**两个读取位**（会话内数组 / 列表 meta 单值），与 uiplug 的 legacy Store + status Store 双路结构同位
- `TO=` 定义（@278921500 起 3000 字节切片）：
  ```js
  TO=e.object({interactionId:e.string(),kind:e.enum(["permission","userInput","workspaceHookReview"]),anchorRowId:e.number().nullable(),createdAt:N,autoResolution:qf.optional(),payload:e.discriminatedUnion("kind",[IO,PO,Kv])}).superRefine((t,n)=>{t.kind!==t.payload.kind&&n.addIssue(…,message:"pending interaction kind must match payload kind"),t.kind==="workspaceHookReview"&&t.autoResolution&&n.addIssue(…,message:"workspaceHookReview cannot use AskUserQuestion auto-resolution"),…})
  ```
  ——**kind 枚举 = `["permission","userInput","workspaceHookReview"]`，恰为三值**，与 uiplug `PendingInteractionKind = 'approval'|'plan-review'|'question'`（session-pending.ts:3）三值同构
- `payload.kind` 消费点枚举：`grep -a -o -E 'payload\.kind[=!`=="a-zA-Z$_]{0,40}' | sort | uniq -c` → workspaceHookReview×14、snapshot×10、permission×4、userInput×3+1、deltas×4（snapshot/deltas 属流式行变更语境，非 pending 判定位）
- 呈现派生（@281429782）：`function Hje(e){let t=e.pendingInteraction||e.pendingInteractionSummary&&e.pendingInteractionSummary.permissionCount+e.pendingInteractionSummary.userInputCount>0?"waiting":e.phase==="prewarming"||e.phase==="running"?"running":…}` + `i(Hje,"sessionOverlay")`——会话列表 overlay 状态 **waiting** 由 pendingInteraction 派生；summary 含 `permissionCount/userInputCount` 计数
- plan 批准另路：`renderContext:e.object({kind:e.literal("plan_approval"),plan:e.string().min(1)}).strict().optional()`（@278875182）、`SU=e.enum(["plan_approval_feedback","workflow_refine_feedback"])`（@279041215）、`o.interaction==="plan_approval"&&typeof s.plan=="string"…return{type:"elicitation_request",…}`（@280162663）——**ZCode 把计划批准走独立的 plan_approval/elicitation 渠道**，未并入 pendingInteraction 枚举
- 呈现文案：`"chat.permission.awaitingApproval":`等待确认`` / `` `Awaiting approval` ``（zh/en 双语命中）

**最终判定：升级为有参照（found）。** 批次14 原记「ZCode 侧 pending 交互的呈现规格未采集」不成立：pending 交互域在 ZCode 完整存在且为强校验 zod schema。语义映射登记：**approval↔permission、question↔userInput（AskUserQuestion autoResolution 机制）、plan-review↔（部分）workspaceHookReview**；差异项：ZCode 的 plan 批准走独立 `plan_approval` 渲染渠道，DSH 把 plan-review 并入 pending 三值枚举——若 uiplug 后续做 pending 呈现（列表 waiting 徽标、确认文案），ZCode 参照为 overlay waiting 派生 + `chat.permission.awaitingApproval`=「等待确认」。旧/新 Store 双路订阅的 ZCode 对应物是「列表 meta 单值 + 会话 schema 数组」双读取位（非版本兼容产物，是两种粒度）。

---

## 条目3 · archive-session-delete.ts 全模块（4 行能力探测 `hasArchiveSessionDelete`）

**搜索过的模式**（全部实跑）：
- `grep -a -o -E '[a-zA-Z$_]*deleteSession[a-zA-Z$_]*' $A | sort | uniq -c | sort -rn` → deleteSession×9、deleteSessionFile×3、deleteSessionData×2、deleteSessionConfig×2
- 语境切片：RPC 命令 schema `renameSession:…,deleteSession:h.object({})`（@279751799，另两个协议 chunk @282640505/316862416 同构）；执行点 `Yo({type:"deleteSession",sessionId:E.taskId,payload:{}})`（@281224434，与 renameSession 并列的一等 dispatch）；i18n `"v4Pane.deleteSession":`删除会话``/`Delete session`（@310460574/310925033）——**ZCode 的删除会话是宿主一等命令**（schema+dispatch+i18n 齐全）
- 能力探测模式：`grep -a -o -E '"deleteSession" in [a-zA-Z$_]{1,25}' $A` → **0 命中**；`grep -a -c 'deleteSession?\.' $A` → **0**；`grep -a -c 'workspaceRegistry' $A` → **0**（uiplug 探测的 `remote.workspaceRegistry.deleteSession` 挂载面在 ZCode 不存在——那是 DSH 宿主 API 命名）
- `deleteSessionData`（@233480290/233481993）为内嵌浏览器 UI 的「Delete session data」数据清理（fetch `/api/sessions/delete-data`），非会话删除，排除

**最终判定：确认无参照（absent），补三条事实。** 「deleteSession 函数存在性探测」这一**机制**在 ZCode 无对应物（三种探测写法全 0 命中）——ZCode 是宿主本体，deleteSession 为一等 RPC 命令，无需探测；能力探测是插件面向 DSH archive 扩展注册表的自有防御，维持原判。新事实：ZCode 侧 `deleteSession` 命令 + `v4Pane.deleteSession`=「删除会话」i18n 可作为 uiplug「永久删除会话」文案与确认流程的设计参照（该决策点超出本条 4 行模块范围，供后续批次引用）。

---

## 条目4 · TurnNavigator.tsx 自绘浮层视觉细节 + `--dsw-alias-label-tertiary` 解析值（uiplug `:35,:43,:83`）

**搜索过的模式**（全部实跑）：
- `grep -a -o -iE '#3a3d3c|#e8ebe9' $A` → **0 命中**（uiplug 浮层 bg/fg 字面值非 ZCode 来源）
- `grep -a -o -E '(box-shadow:)?0 8px 24px[^;}"]{0,30}' $A | sort | uniq -c` → 4 形态：`0 8px 24px #010409`×2、`0 8px 24px rgba(0, 0, 0, 0.08)`×2、`rgba(140,149,159,.2)`×2、`rgba(66,74,83,.12)`×2；逐一切片定性：rgba(0,0,0,0.08) = PDF/页面渲染组件**内联样式**（`background:"#fff",border:"1px solid #d4d4d4",boxShadow:"0 8px 24px rgba(0, 0, 0, 0.08)"`，page.blocks，@26529481/@28532132）；rgba(140,149,159,.2) = 内嵌 **GitHub Primer** `--color-shadow-large`（@233496363）——均非 tooltip
- ZCode @theme 阴影档：`grep -a -o -E -- '--shadow-[a-z0-9-]+:[^;}]{0,80}' $A | sort | uniq -c` → 仅 tailwind 默认 `--shadow-sm/md/lg`（lg=`0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a`）；**无 8px/24px 主题阴影档**（uiplug zcode-tokens.ts:526 把 `0 0 1px 0 rgba(0,0,0,.2), 0 8px 24px 0 rgba(0,0,0,.08)` 记为「ZCode 阴影阶梯 lv3」，来源为活体测量而非 asar @theme）
- ZCode tooltip 专用色对：`grep -a -o -E -- '--color-tooltip[a-z-]*:[^;}]{0,45}' $A | sort | uniq -c` → `--color-tooltip:#2b2b2b`（暗）/#f0f0f0（亮）+var(--color-neutral-900/100) 派生形；`--color-tooltip-foreground:#f8f8f8`（暗）/#0d0d0d（亮）+`--color-tooltip-tag-foreground` 变体——与 zcode-tokens.ts:57-59 注释（亮 #f0f0f0+#0d0d0d=17.05:1／暗 #2b2b2b+#f8f8f8=13.33:1）**互证**
- preview CSS module 类：`grep -a -o -E '\.[A-Za-z0-9_-]{4,10}_preview\{[^}]{0,260}' $A` 与 `_marks?\{`、`grep -a -c '_preview{'` → 全 0（与 batch-14 `JXrxFq_marks` 0 命中一致：preview 样式不在 bundle 明文，运行时 hash 类）→ 03 C1 的 320px/顶对齐/右侧仍是唯一活体来源，asar 无法补数值
- `grep -a -b -o -E '.{90}w-\[320px\].{90}' $A | head` → 2 处均为 content 面板 `min-w-[320px]` 与设置页 `w-[320px]`，**非 preview**
- radius：`grep -a -c 'rounded-2xl' $A` → 24；uiplug `--dsw-radius-2xl:16px`（zcode-tokens.ts:519，ZCODE_STRUCTURAL，随注 03j「ZCode 弹层家族实测全部 rounded-2xl=16px」）
- 截断：`grep -a -o -E 'slice\(0,(6[0-9]|7[0-9]|8[0-9])\)[^;`]{0,25}(…|\\u2026)' $A` → 0；`grep -a -o -E '\+["`]…["`]' $A | sort | uniq -c` → `+"…"`×4/+`…`×1，切片全部为库内代码（JSON.stringify 1e3 截断、表格库 79/80 截断、文本测量 kw）——**无 72 字符摘要截断对应物**
- 断点：`grep -a -o -E '(max-width:)?760px' $A` → 7，切片 = `min-w-[760px]`（grid 最小宽）等布局类，**非浮层窄宽断点**
- tertiary 阶梯：`grep -a -o -E -- '--color-foreground[a-z-]*:' $A | sort | uniq -c` → 仅 foreground/subtle/subtlest/inverse 四名；值：`--color-foreground-subtle:#d4d4d499`（暗 60%）/#26262699/#40404099（亮 60%），`--color-foreground-subtlest:#d4d4d44d`（暗 30%）/#26262666/#40404066（亮 40%）；50% 字面 `#d4d4d480` → **0 命中**，`#40404080`×2/#e5e5e580×3 切片均为 **`/50` 透明度工具类**（`ring-foreground/50`、`border-foreground/50`、`bg-tag/50` 等），非命名档
- HoverCard×178/hover-card×34（Radix 在包；03 §七已记存在性，本轮复核一致）

**最终判定：部分升级为有参照（found），五个子项维持无参照。**
- 升级① **bg/前景色**：ZCode 有 tooltip 专用成对令牌 `--color-tooltip`(#2b2b2b/#f0f0f0)+`--color-tooltip-foreground`(#f8f8f8/#0d0d0d)，有值可引；uiplug 自绘浮层的 #3a3d3c/#e8ebe9 在 asar 0 命中且与 ZCode 暗色 tooltip 色对不一致——登记为可对齐差异项（改引 ZCode 令牌或注明自绘取值依据）。
- 升级② **tertiary 解析值**：ZCode 命名阶梯只有 60%（subtle）与 40%亮/30%暗（subtlest）两档，**无 50% 命名档**（50% 仅以 `/50` 透明度工具类存在）。zcode-tokens.ts:338 `--dsw-alias-label-tertiary:rgba(212,212,212,0.5)` 是插件在 subtle/subtlest 之间的自有插值——批次14「tertiary 无例证」修正为：**阶梯参照存在（60%/30% dark），0.5 本身无 ZCode 例证**，若要严格对齐应上移 60% 或下沉 30%。
- 升级③ **radius 2xl=16px**：asar `rounded-2xl`×24 + zcode-tokens.ts:519 + 03j 实测三重印证（原批次未采 asar 计数）。
- 维持无参照：**32px 单行高、padding 0 12px、760px→200px 断点、TURN_SUMMARY_LIMIT=72、`0 8px 24px rgba(0,0,0,.28)` 阴影**——asar 无 tooltip 形态数值载体（preview 样式在运行时 hash 类中），且 8px/24px 阴影的 asar 命中均为 Primer/PDF 渲染器借用，不得引用。

---

## 条目5 · InputHistoryDock.tsx hint 细节 + TurnNavigator railLeft/滚动阈值（uiplug `:14-28,:108-113`、TurnNavigator `:131-144,:182`）

**搜索过的模式**（全部实跑）：
- caption 值：uiplug zcode-tokens.ts:106/:339 `--dsw-alias-label-caption: rgba(38,38,38,0.4)`（亮）/`rgba(212,212,212,0.4)`（暗）；ZCode 侧对照（见条目4 阶梯）：**亮 subtlest `#26262666/#40404066`=40% 与 caption 同值**（交叉验证成立），暗 subtlest=`#d4d4d44d`=30%（=dimmed 档）→ **暗 caption 0.4 在 ZCode 命名阶梯无档**（30%~60% 之间的自有插值）
- 行高：`grep -a -o -E -- '--text-ui-sm--line-height:[^;}]{0,40}' $A` → **0 命中**；`grep -a -o -E '\.text-ui-sm\{[^}]{0,200}' $A` → `.text-ui-sm{font-size:var(--text-ui-sm)`（规则仅 font-size，无行高；ZCode 只有 settings-title 族有 `--text-ui-settings-title--line-height`）→ 18px 行高无令牌对应
- hint 文案/元素：`grep -a -o -E '"[a-zA-Z0-9.]*(hint|Hint)[a-zA-Z0-9.]*":`[^`]{0,70}' $A | head` → **ZCode composer 提示族实锤**：`chat.composer.contextSearchHint`:输入内容以搜索插件、文件和对话、`chat.composer.insertSlashShortcut`:使用 / 选择能力、`chat.composer.insertMentionShortcut`:使用 @ 添加上下文、`chat.composer.contextShortcut`:添加上下文、`chat.composer.skillShortcut`:选择技能、`chat.composer.draftRuntimeRebuilding`:会话正在重建，请稍候——**ZCode 输入区存在 hint 文案元素**（batch-14「ZCode 输入区无对应 hint 元素」对 hint 文案面不成立）；但**输入历史专用 hint 无对应**：`input.historyHint`=「↑↓ 翻历史」的载体缺位——`grep -a -b -o -F '方向键' $A` → 0，`↑` 的 4 处字节偏移切片全为 HTML 实体表/APL 语法高亮/键位表，无 hint 语境
- 断点机制：`grep -a -o -E '@container[^{]{0,60}\{' $A | sort | uniq -c` → **ZCode 有 `@container composer` 命名容器查询规则族**：`(width>=24rem/32rem/36rem/480px)` 与 `not (width>=…)`；切片（@326111236/@326111860/@326112261）：
  ```css
  @container composer not (width>=480px){.@max-\[480px\]\/composer\:hidden{display:none}…}
  @container composer not (width>=36rem){.@max-xl\/composer\:hidden{display:none}.@max-xl\/composer\:size-7{…}gap-0/p-0…}
  @container composer not (width>=24rem){.@max-sm\/composer\:size-7{…}…}
  ```
  ——composer 窄宽隐藏机制存在（384/480/512/576px 档），与 uiplug `@container dcu-composer-input (max-width:560px)` **同机制不同档位**
- order −100：`grep -a -o -E 'order:-?100[^0-9]' $A` → 仅 1 处 `order:100+`（无关）→ 无对应
- 滚动阈值：`grep -a -o -E 'Math\.min\(180[,.]' $A` → **0**；`grep -a -o -E '\*\.?35[,)]' $A` → `*.35,`×1 = 波浪动画 swayDistance 插值（@329107000：`HV(a,[0,e.swayDistance*.35,-e.swayDistance*.25,…])`），非滚动 spy → `min(180, h×0.35)` 无对应（ZCode rail 跟滚走 scrollToIndex，03 E1 已记机制差异）
- railLeft=侧栏轨道+16：ZCode rail 在内容列内 absolute（03-turn-navigator.md、batch-14 原记），无 fixed+轨道偏移同构；asar 亦无 `canBack` 类定位辅助（见条目1）——两端定位参照物不可比维持

**最终判定：部分升级为有参照（found），四个子项维持无参照。**
- 升级① **断点机制**：ZCode composer 命名容器查询（384/480/512/576px 档 + `@max-*/composer:hidden` 隐藏档）与 uiplug 的容器查询隐藏 hint 同构——断点子项从「自有裁决」升级为「机制有参照、数值差异项」。
- 升级② **hint 文案面**：ZCode 有 composer 提示族（contextSearchHint/insertSlashShortcut/insertMentionShortcut/contextShortcut/skillShortcut/draftRuntimeRebuilding），「输入区放 caption 级提示文案」有 ZCode 先例可对标措辞与粒度；但「↑↓ 翻历史」功能本身无 ZCode 对应（0 命中），属插件自有功能。
- 升级③ **caption 亮值**：0.4 与 ZCode 亮 subtlest（40%）同值有 asar 互证；暗值 0.4 是自有插值（ZCode 暗 subtlest=30%）——与 tertiary 同一批次结论：暗侧 40%/50% 两档均为插件插值。
- 维持无参照：**line-height 18px、slot order −100、滚动 Spy 阈值 min(180, h×0.35)、railLeft=侧栏轨道+16**——四者 asar 均 0 命中或命中物无关，维持「DSH 侧自有裁决、无 ZCode 例证」。

---

## 结论对批次14 的回写建议

1. **条目2 改判「有参照」**：ZCode pendingInteraction 域（三值枚举 permission/userInput/workspaceHookReview + 列表 waiting overlay + `chat.permission.awaitingApproval`=「等待确认」）登记为 pending 呈现的参照源；plan 批准走独立 plan_approval 渠道为语义差异项。
2. **条目4/5 部分改判**：tooltip 色对令牌（#2b2b2b/#f8f8f8 暗）、前景阶梯（60%/40%亮/30%暗，无 50% 档）、composer 容器查询（384~576px）、composer hint 文案族为新增参照；`--dsw-alias-label-tertiary/caption` 的暗侧 0.5/0.4 明确为**插件自有插值**（tertiary 0.5 连亮侧也无命名档）——建议在 zcode-tokens.ts 该两行补注释注明「50%/40% 暗档为插值，ZCode 命名阶梯为 subtle 60%/subtlest 30%暗·40%亮」，避免后续批次再当「ZCode 原值」引用。
3. **条目1/3 维持确认无参照**：但分别补记「ZCode navigateBack=视图级回退命令（CmdOrCtrl+[）+ 列表序 prev/next（Shift+[/]）」与「ZCode deleteSession=一等 RPC 命令（v4Pane.deleteSession=删除会话）」两条语境事实，防止后续把视图级回退误当会话栈、或把能力探测当 ZCode 惯例。
4. 本轮全部命令为实跑记录；`Er=`（navigateBack 的非 plugin-store 分支执行体）与 `.JXrxFq_preview` 样式值两处压缩名/运行时类未能绑定，已如实标注，不影响上述判定。
