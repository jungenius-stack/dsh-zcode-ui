/**
 * 会话区布局与排版：对齐 ZCode（03c-conversation.md 矩阵 C1/C2/C3）。
 *
 * 背景（2026-10-27 盘点结论）：插件此前对会话区**消息内容零覆盖**，
 * 视觉 100% 来自宿主默认。本模块是会话区覆盖的第一块，只做「骨架三件」。
 * 2026-10-28 追加 G17（用户轮 = 右侧气泡，按 ZCode 活页二次实测覆写；
 *   上一轮的「扁平化」把它当成了 assistant 行，已推翻）。
 * 2026-10-28 追加 D1 围栏代码块（ZCode asar 静态提取定案）。
 *
 * 所有值来自 ZCode 活页面实测（03c-conversation-zcode-spec.json）：
 *   正文文字列 848/1104（容器查询两档；spec 的 924 是滚动容器口径）/ 轮组 margin-top 20 / 正文 14px 行高 24.5
 *
 * 纪律：只写属性、不加节点、不用 !important（全部靠特异性达标）。
 */

/**
 * ZCode 实测**文字列**宽：窄窗 848 / 宽窗 1104（容器查询，阈值 1280）。
 * 旧值 784 是「1202px 视口」这一种尺寸下的快照，被当成了固定值 —— 于是窗口拉大时
 * 正文列不再变宽，和 ZCode 行为不符。
 *
 * 2026-10-28 更正（原值 924 是错的口径）：活页实测 ZCode 会话列容器
 * max-width:896px + 左右 padding:24px → 正文实际 784px（1202px 视口下）。
 * 原先 03c 规格里的 924 量的是滚动容器而不是文字列，导致 DSH 每行 64 个汉字，
 * 比 ZCode（55 个）宽 15%——长行是「像文档、不像对话」的主因。
 */
const ZCODE_CONTENT_WIDTH = 848
/** 宽屏档：ZCode 在可用宽度 ≥1280 时把列上限从 896 提到 1152（含 24px 侧内衬 → 文字 1104）。 */
const ZCODE_CONTENT_WIDTH_WIDE = 1104
/** 切宽阈值：按「与 ZCode 同视口切换」校准。
    ZCode 的容器查询在**它自己的**容器内容宽 1280 处切换（实测 1278→896 / 1280→1152），
    而它的容器宽 = 视口 − 274，即视口 1554px 处切宽。
    DSH 的会话滚动区内容宽 = 视口 − 366（侧栏 264 + 滚动区左右内衬 100），
    要让它同样在视口 1554 切宽 → 阈值取 1554 − 366 ≈ 1188。 */
const ZCODE_CONTENT_WIDE_MIN = 1188
/** ZCode 轮组间距（轮组制，不是逐条）。 */
const ZCODE_TURN_GAP = 20
/** ZCode 正文行高（14px 字号下 1.75 倍）。 */
const ZCODE_LINE_HEIGHT = 24.5

export const CONVERSATION_LAYOUT_STYLE = `
/* ── X1 会话区禁止横向滚动（2026-10-28）────────────────────────────
   ZCode 的会话滚动容器显式设置 overflow-x-hidden（纵向 auto）——横向永不出滚动条；
   需要横滚的内容自己滚：代码块 pre 与表格 _tableScroll 各自带 overflow-x:auto（已实测）。
   DSH 宿主是 overflow-x:auto，任何一次内容变宽（宽表格/长 URL/临时态）都会在会话底部
   冒出横向滚动条——与 ZCode 不符，且与「会话只需上下滚」的直觉冲突。 */
[data-conversation-scroll]{overflow-x:hidden}

/* ── C1 内容列宽 640 → 924 ──────────────────────────────────────────
   宿主用 .icaHSq_column{max-width:640px} 限宽，宽度由 max-width 决定、
   两侧留白是 margin auto 的结果。所以这里改 max-width，不动 margin。
   特异性 0,2,0（[data-conversation-scroll] + 类）已高于宿主的单类 0,1,0。 */
[data-conversation-scroll] .icaHSq_column{max-width:min(${ZCODE_CONTENT_WIDTH}px,100%)}
/* 宽屏档（2026-10-29，ZCode 容器查询实测）：可用宽度 ≥1280 时列上限提到 1104。
   用容器查询而不是媒体查询 —— 侧栏收起时可用宽度会变，视口宽度不变，媒体查询会漏掉那种情况。 */
[data-conversation-scroll]{container-type:inline-size}
@container (min-width:${ZCODE_CONTENT_WIDE_MIN}px){[data-conversation-scroll] .icaHSq_column{max-width:min(${ZCODE_CONTENT_WIDTH_WIDE}px,100%)}}
/* 输入卡跟随正文列（ZCode 实测：卡宽 = 文字列 + 16，1280→864 / 2000→1120）。
   宿主默认把卡钉在 887 不随窗口变，窗口一拉大就和正文列脱节。 */
[data-conversation-scroll] [data-composer-card]{max-width:min(calc(${ZCODE_CONTENT_WIDTH}px + 16px),100%)}
@container (min-width:${ZCODE_CONTENT_WIDE_MIN}px){[data-conversation-scroll] [data-composer-card]{max-width:min(calc(${ZCODE_CONTENT_WIDTH_WIDE}px + 16px),100%)}}

/* ── C2 轮组间距 6px → 20px ───────────────────────────────────────
   ⚠ 三次尝试的血泪史（2026-10-27）：
   ① 第一版用 [data-conversation-scroll] .icaHSq_flowItem:has(...)：规则进了样式表、
      querySelectorAll 也能匹配，但**计算值仍是 6px** —— 特异性输给宿主。
   ② 第二版照抄宿主的直接子代组合符：仍然输。因为宿主真实选择器是
        :is(.icaHSq_column,[data-slot=...]) > :not([hidden]):not(...) ~ :not([hidden]):not(...)
      用的是兄弟组合符（波浪号）+ 4 个 :not()，特异性(0,5,x)远高于我的。
   ③ 最终方案：**用宿主提供的变量入口**。它的 margin-top 走
        var(--dsh-chat-flow-gap, 6px)
      而这个变量在全站从未定义（实测 computed 为空），所以一直在吃回退值 6px。
      我们只需在 column 上定义它 —— 这是宿主自己留的口子，不需要比特异性。
      实测：设 20px 后，4 条用户轮全部变 20px；原本走别的规则的 16/0/12 不受影响。
   注意：变量会作用于**所有**走该 var 的 flowItem（实测 13 条），
   所以额外保留一条「非用户轮清零」规则，把轮组内部行压回 0 —— 那条仍会和宿主抢，
   但因为它只影响「非首行」且宿主兄弟规则对首行不生效，实测可让轮组内间距归零。 */
[data-conversation-scroll] .icaHSq_column{--dsh-chat-flow-gap:${ZCODE_TURN_GAP}px}
[data-conversation-scroll] .icaHSq_column > .icaHSq_flowItem:not(:has(.IzP3Va_userRow)){margin-top:0}

/* ── C3 正文行高 22 → 24.5 ─────────────────────────────────────────
   只作用于消息正文段落。限定在 .icaHSq_column 内，不污染侧栏与设置页。
   行高用 24.5px 而非倍数：ZCode 实测就是 24.5px 定值。 */
[data-conversation-scroll] .icaHSq_column p{line-height:${ZCODE_LINE_HEIGHT}px}

/* ── C4 代码字体 11/19 → 12/21 ─────────────────────────────────────
   ZCode 等宽实测 12px / 21px（03c 矩阵 B3/D2）。DSH 宿主是 11px / 19px。
   21/12 = 1.75，与正文 24.5/14 = 1.75 同比例 —— 不是随手取整。
   同时覆盖 pre 与其中的 code：宿主把 font-size 写在 pre 上、code 继承，
   但 code 有自己的 computed 值，两处都写才稳。 */
[data-conversation-scroll] .icaHSq_column pre,
[data-conversation-scroll] .icaHSq_column pre code{
  /* 用令牌而不是字面 12px（项目规定界面字号必须走 --dsw-font-size-*）。
     --dsw-font-size-sm = calc(14px - 2px) = 12px，正好命中 ZCode 的等宽字号。
     行高 21px 与 12px 的比值 = 1.75，与正文 24.5/14 同比例。 */
  font-size:var(--dsw-font-size-sm,12px);
  line-height:21px;
}

/* ── 正文操作行 = ZCode 规格（2026-10-29 CDP 9224 活体实测，推翻上一条「30% 系」结论）──
   ZCode 真值：
     行容器  flex / gap 4 / margin-top 4 / **默认 opacity 0**，
             hover 消息行 或 focus-within 时 opacity 1，
             过渡只动 opacity：0.15s cubic-bezier(.4,0,.2,1)（feedback 档）
     按钮    24×24 / radius 6 / padding 0 / 背景透明（hover 也不上底）
     图标    14×14 / stroke-width 1.5
     颜色    **全文前景 oklch(.87)** —— 不是淡色；上一条「30% 系」把
             「行整体隐藏」误读成了「图标用淡色」，这次按实测改正。
   DSH 现状（实测）：行常驻 opacity 1、gap 8；按钮 28×28 且**三种圆角混用**
   （4px / 28px 胶囊 / 4px）；图标 15~16px / stroke 1；颜色 40~50% 两种。 */
[data-conversation-scroll] .icaHSq_column .ppByMG_actions,
[data-conversation-scroll] .icaHSq_column .d1vkyW_actions{
  gap:4px;
  margin-top:4px;
  opacity:0;
  transition:opacity var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease);
}
[data-conversation-scroll] .icaHSq_column .icaHSq_flowItem:hover .ppByMG_actions,
[data-conversation-scroll] .icaHSq_column .icaHSq_flowItem:hover .d1vkyW_actions,
[data-conversation-scroll] .icaHSq_column .icaHSq_flowItem:focus-within .ppByMG_actions,
[data-conversation-scroll] .icaHSq_column .icaHSq_flowItem:focus-within .d1vkyW_actions{
  opacity:1;
}
/* ⚠ 2026-10-29 摆正：不能给整行**所有**按钮硬设 24px 宽 —— 这一排里混着
   「纯图标按钮」和「图标+文字按钮」（例如带「记忆」二字的快照钮，内容宽 43px）。
   硬设 24px 会把文字挤出去、压到右侧的删除钮上（用户实测截图：记忆 与 垃圾桶重叠）。
   改成 min-width + 左右 4px 内衬：纯图标 = 14+8=22 → 被 min-width 抬到 24（合 ZCode 的 24×24）；
   带文字的按内容自然撑开、不再溢出。 */
[data-conversation-scroll] .icaHSq_column .ppByMG_action,
[data-conversation-scroll] .icaHSq_column .dsh-session-kit-turn-action,
[data-conversation-scroll] .icaHSq_column .oB5zFG_action{
  width:auto;
  min-width:24px;
  height:24px;
  border-radius:var(--dsw-radius-md);
  padding:0 4px;
  white-space:nowrap;
  background:transparent;
  color:var(--dsw-alias-label-primary);
}
/* 2026-10-29 统一图标色：这一排里 dsh-session-kit 的三个钮（重新生成 / 蒸馏 / 删除）带
   **内联 color: var(--dsw-alias-label-tertiary)**（50%），宿主自己的钮是 100% —— 浅色下
   前者发灰、后者纯黑，肉眼就是「粗细不一致」。内联样式只能用感叹号优先级压过
   （本仓库统一叫「重要级覆盖」）；范围只限「操作行按钮的颜色」这一条，
   是本文件唯一的颜色类重要级覆盖。记账：结构债计数因此 +1（已随 baseline 重生成登记），
   理由是同款按钮来自另一个插件的内联样式，样式表没有更轻的合法手段能压过它。 */
[data-conversation-scroll] .icaHSq_column :is(.ppByMG_actions,.d1vkyW_actions) button{color:var(--dsw-alias-label-primary)!important}
[data-conversation-scroll] .icaHSq_column .ppByMG_action svg,
[data-conversation-scroll] .icaHSq_column .dsh-session-kit-turn-action svg,
[data-conversation-scroll] .icaHSq_column .oB5zFG_action svg{
  width:14px;
  height:14px;
  stroke-width:1.5;
}

/* ── G17 用户轮 = 右侧气泡（2026-10-28 二次实测，推翻上一轮的「扁平化」）──
   ⚠ 上一轮把用户轮改成透明全宽左对齐是**错的**：那套规格是 ZCode 的 assistant 行，
   不是 user 行。ZCode 活页  .history-message > .group/user-row （CDP 实测，2026-10-28）：
     容器   display:flex / flex-direction:column / align-items:flex-end（右对齐）
     气泡   [data-v4-user-input-bubble]
              bg       --color-surface → 深色 #ffffff0d（白 5%）/ 浅色 #0d0d0d08（黑 3%）
              border   1px solid --color-border（10% 前景：#ffffff1a / #0d0d0d1a）
              radius   12px 2px 12px 12px（rounded-xl + rounded-tr-xs，右上 2px 是「尾巴」角）
              padding  12px 16px（px-4 py-3）
              max-w    576px（@min-[624px]/conversation:max-w-xl）
              文字     14px / 21px（text-ui-base，1.5 倍），white-space:pre-wrap
     动作行   气泡下方、右对齐，间距 4px（mt-1），默认 opacity:0、hover/focus 才现
   宿主默认已接近（右对齐 / radius 12 / pad 10px 16px / lh 22px），只差：
     无边框、无尾巴角、限宽 550.4（=784×0.702）、内边距少 2px、行高多 1px。
   气泡底色读宿主令牌 --dsw-specific-bubble，值已在 zcode-tokens.ts 换成 ZCode surface。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_userRow,
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{align-items:flex-end}
[data-conversation-scroll] .icaHSq_column .IzP3Va_userRow{gap:4px}
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{max-width:576px}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble{
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  /* 右上角 2px = ZCode 的 rounded-tr-xs（气泡「尾巴」），其余 12px = rounded-xl */
  border-radius:var(--dsw-radius-xl) var(--dsw-radius-xs) var(--dsw-radius-xl) var(--dsw-radius-xl);
  padding:12px 16px;
  /* 21px = ZCode text-ui-base 的 1.5 倍行高；+ delta 保住宿主正文字号缩放 */
  line-height:calc(21px + var(--dsh-content-font-delta,0px));
}

/* ── G18 用户气泡长文本折叠（2026-10-28，ZCode asar + 9224 实测）──────
   ZCode 真实参数：内容 max-height 120（溢出阈 121）；展开 max(scrollHeight,120)；
   过渡走 move 档令牌（300ms / 0,0,.2,1）；溢出未展开时内容底部 30% 渐隐；
   reduced-motion 由主题令牌层统一归零，这里不单独写 transition:none。
   宿主根节点是 display:contents，没有盒子可限高 —— 这里只把它换成块盒（纯属性），
   inline max-height / 折叠钮 / data 状态由 user-bubble-collapse.ts 维护。
   位置（DSH 适配）：宿生气泡内自带常驻动作行（28px，图标左对齐）。折叠态把钮放在
   该行右侧空位，避免像 ZCode 那样压在渐隐的正文上（实测三种压字位置都会挡字）；
   展开态独占一行居中。ZCode 无此动作行，故此项与 ZCode 有意不同。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble{position:relative}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble > :first-child{display:block}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble[data-dcu-bubble-overflow] > :first-child{
  overflow:hidden;
  transition:max-height var(--dcu-motion-collapse-duration) var(--dcu-motion-collapse-ease);
}
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble[data-dcu-bubble-overflow][data-dcu-bubble-state="collapsed"] > :first-child{
  -webkit-mask-image:linear-gradient(to bottom,black 0%,black 70%,transparent 100%);
  mask-image:linear-gradient(to bottom,black 0%,black 70%,transparent 100%);
}
.dcu-bubble-toggle{
  display:inline-flex;align-items:center;justify-content:center;
  width:40px;height:32px;padding:0;
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  border-radius:var(--dsw-radius-full,999px);
  background:var(--dsw-alias-bg-base,#161616);
  color:var(--dsw-alias-label-secondary,rgba(212,212,212,.6));
  box-shadow:var(--dsw-shadow-lv1,0 1px 2px 0 rgba(0,0,0,.05));
  backdrop-filter:blur(4px);
  cursor:pointer;
  z-index:1;
  transition:color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease);
}
.dcu-bubble-toggle:hover{color:var(--dsw-alias-label-primary,#d4d4d4)}
.dcu-bubble-toggle svg{display:block;transition:transform var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
[data-dcu-bubble-state="expanded"] > .dcu-bubble-toggle{display:flex;position:static;margin:8px auto 0}
[data-dcu-bubble-state="collapsed"] > .dcu-bubble-toggle{position:absolute;left:50%;bottom:8px;transform:translateX(-50%)}
[data-dcu-bubble-state="expanded"] > .dcu-bubble-toggle svg{transform:rotate(180deg)}

/* ── D1 围栏代码块（2026-10-28，ZCode asar 静态提取定案）────────────
   ZCode 聊天码卡解剖（MessageResponse → ob/rb + streamdown code-block-body）：
     外层   my-4 + border border-border + bg-card —— 无圆角、1px --color-border、--color-card
     头部   无独立底色条（rb: pl-3 pr-2 pt-2，语言名 lowercase mono，与卡同底）
     码体   rounded-md + border border-border，底/字 = shiki 主题 editor.bg/fg
            （默认 github-dark #24292e/#e1e4e8、github-light #ffffff/#24292e），内边距 8/8/0/12
     行内码 rounded-md + bg-markdown-inline-code/50 + px-1.5 py-0.5，无边框
   DSH 现状（CDP 实测）：卡 #202020/radius 8/无边框；banner #161616 独立条；
     pre 透明 pad 6/22/20；行内码 #2b2b2b 实底 + 0.5px 边 + radius 4。
   宿主消费 --dsw-alias-markdown-code-block/-inline-code（底色不动，令牌值已在
   zcode-tokens.ts 改齐）；这里只补结构差：边框/圆角/条带/码体/内边距。 */
[data-conversation-scroll] .md-code-block{
  border:1px solid var(--dsw-alias-border-l2);
  border-radius:0;
  background:var(--dsw-alias-markdown-code-block);
}
[data-conversation-scroll] .md-code-block [class*="_bannerWrap"]{
  background:transparent;
  border-radius:0;
  padding:8px 8px 8px 12px;
}
[data-conversation-scroll] .md-code-block pre{
  /* shiki 会给部分 pre 盖内联 style（var(--shiki-background/foreground)），
     内联优先级高于本规则——在这里重定义这两个变量，让内联引用也落到 ZCode 值上。 */
  --shiki-background:var(--dsw-alias-markdown-code-editor-bg);
  --shiki-foreground:var(--dsw-alias-markdown-code-editor-fg);
  background:var(--dsw-alias-markdown-code-editor-bg);
  color:var(--dsw-alias-markdown-code-editor-fg);
  border:1px solid var(--dsw-alias-border-l2);
  border-radius:var(--dsw-radius-md);
  padding:6px 8px 12px;
}
[data-conversation-scroll] .icaHSq_column :not(pre) > code{
  background:var(--dsw-alias-markdown-inline-code);
  border:0;
  border-radius:var(--dsw-radius-md);
  padding:2px 6px;
  font-size:var(--dsw-font-size-sm,12px);
}

/* ── T1 排版节奏（2026-10-28，用户反馈「像毛坯房」；ZCode 真值逐项对齐）──
   ZCode 的「工整感」来自四件事，缺一项就散：
     ① 字距 tracking-wide 0.025em（14px→0.35px，实测）；
     ② 标题克制：h1 18 / h2 16 / h3~h6 全部 14px（=正文字号，靠字重分层），
        semibold(600)，上下 24/16（源码 zMt 映射 + 实测 h2 16px/28px mt24 mb16）；
     ③ 列表有呼吸：ul/ol 上下 12（my-3）、左缩进 20（pl-5）、项间距 6（space-y-1.5）、
        li 左内衬 4（pl-1）、marker 30% 前景（foreground-subtlest）；
     ④ 列表内 p 归零且行内（[&>p]:my-0 inline），避免 p 的 mb-16 把列表撑散。
   DSH 现状（实测）：字距 normal、h2 19px/700 mt0、h3 18px/700 mt32、li 项间距 0 且无内衬
   —— 字号大 3~4px + 权重高 100 + 标题顶距 0 + 列表挤成一片，四因叠加=「毛坯」。 */

/* ① 字距：只作用于会话列；pre/code/kbd 显式归零（等宽代码加字距会破坏对齐，见预检 🐯1）。 */
/* ZCode 实测 0.35px（@14px 的 0.025em）；但 em 会随子元素字号放大（16px 标题变 0.4px），
   而 ZCode 的 tracking-wide 同样按 em 走——实测其 16px 标题也是 0.4px，故保留 em 形态，
   仅把「正文 14px」这一档钉成绝对值 0.35px 以对齐实测。 */
[data-conversation-scroll] .icaHSq_column{letter-spacing:0.025em}
[data-conversation-scroll] .icaHSq_column p{letter-spacing:0.35px}
[data-conversation-scroll] .icaHSq_column pre,
[data-conversation-scroll] .icaHSq_column code,
[data-conversation-scroll] .icaHSq_column kbd{letter-spacing:normal}

/* ② 标题层级：h3 起与正文同字号，克制靠字重。 */
[data-conversation-scroll] .icaHSq_column h1{font-size:var(--dsw-font-size-xl,18px);line-height:31.5px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h2{font-size:var(--dsw-font-size-lg,16px);line-height:28px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h3,
[data-conversation-scroll] .icaHSq_column h4{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:600;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h5{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:500;margin:24px 0 16px}
[data-conversation-scroll] .icaHSq_column h6{font-size:var(--dsw-font-size-base,14px);line-height:24.5px;font-weight:400;margin:24px 0 16px}

/* ③ 列表节奏 */
[data-conversation-scroll] .icaHSq_column ul,
[data-conversation-scroll] .icaHSq_column ol{margin:12px 0;padding-left:20px}
[data-conversation-scroll] .icaHSq_column li{padding-left:4px;line-height:24.5px}
[data-conversation-scroll] .icaHSq_column li + li{margin-top:6px}
[data-conversation-scroll] .icaHSq_column li::marker{color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3))}
[data-conversation-scroll] .icaHSq_column ul ul,
[data-conversation-scroll] .icaHSq_column ul ol,
[data-conversation-scroll] .icaHSq_column ol ul,
[data-conversation-scroll] .icaHSq_column ol ol{margin:6px 0}

/* ④ 列表内段落归零 */
[data-conversation-scroll] .icaHSq_column li > p{margin:0;display:inline}

/* ⑤ 分隔线与尾行（2026-10-28 实测对照）：
   ZCode 全文档 0 个可见 hr——章节之间只靠留白与标题分层（实测 hrs=0）；
   DSH 的 markdown 分隔线渲染成 1px 10% 白线 + 上下 32px，等于给文档画格子，是「毛坯感」主因之一。
   这里保留 32px 间距、抹掉线条本身。
   尾行口径：ZCode 时间戳 = 12px / 前景 30%（text-ui-sm text-foreground-subtlest）；
   DSH 现为 13px/12px、50%——统一到 12px/30%。 */
[data-conversation-scroll] .icaHSq_column hr{
  border:0;
  height:0;
  background:transparent;
  margin:24px 0;
}
[data-conversation-scroll] .icaHSq_column .ppByMG_timeStart,
[data-conversation-scroll] .icaHSq_column .ppByMG_timeEnd{
  font-size:var(--dsw-font-size-sm,12px);
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}
[data-conversation-scroll] .icaHSq_column .cm-note summary,
[data-conversation-scroll] .icaHSq_column .IzP3Va_retryRow summary{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}

/* ⑥ 工具行弱化（2026-10-28 实测对照）：
   ZCode「已运行命令 / 思考 · 持续了 N 秒」= 14px / lh21 / 前景 30% / 字重 500；
   DSH 现为 14px / 50% / 400 —— 偏亮偏细，读起来像正文的碎片。
   用宿主自带的稳定锚点 data-process-activity（按钮上，非哈希类名）。 */
[data-conversation-scroll] [data-process-activity]{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
  font-weight:500;
}
/* 内层 label 自带 50% 声明，需显式继承外层 30%。 */
[data-conversation-scroll] [data-process-activity] *{color:inherit}

/* ── ⑦ 表格 / 引用块 / 图片（2026-10-28，双端实测 + ZCode 自带 CSS 原文）──
   ZCode 表格（9224 活体，浅色）：table 14px/24.5；th、td 都是 px-3 py-2 = 8px 12px，
   各自带 border-b（1px --color-border）；th 用 foreground-subtlest(40% 浅/30% 深)+400 字重，
   td 用全文前景。DSH 现状：13px/22、padding 10px 16px 10px 0（左侧无留白）、0 边框、表头与正文同色
   —— 于是表格和正文糊成一片，也没有横向引导。
   ZCode 引用块取自其自带 prose CSS 原文：
     border-inline-start-width:.25rem（4px）、padding-inline-start:1em（14px）、
     margin-block 1.6em（22px）、font-style:italic、font-weight:500，边框色 = 10% 前景。
   ZCode 内容图 = rounded-xl + border border-border + bg-background + object-contain + shadow-2xl
   （asar 类名原文）；这里先落到用户附件的缩略图（会话区唯一会出现的 img 路径），
   阴影暂不加——原证据来自正文插图，缩略图未单独采过，避免把重阴影套到小图上。 */
[data-conversation-scroll] .icaHSq_column table{
  border-collapse:separate;
  border-spacing:0;
  font-size:var(--dsh-content-font-size,14px);
  line-height:calc(24.5px + var(--dsh-content-font-delta,0px));
}
[data-conversation-scroll] .icaHSq_column th,
[data-conversation-scroll] .icaHSq_column td{
  padding:8px 12px;
  border:0;
  border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  font-size:var(--dsh-content-font-size,14px);
  line-height:calc(24.5px + var(--dsh-content-font-delta,0px));
  vertical-align:top;
}
[data-conversation-scroll] .icaHSq_column th{
  font-weight:400;
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
}
[data-conversation-scroll] .icaHSq_column td{color:var(--dsw-alias-label-primary)}
[data-conversation-scroll] .icaHSq_column blockquote{
  /* 1.6em 是 ZCode 自带 prose CSS 的原值（14px 下 = 22.4px）；写 em 而非 px，
     既忠于原式又随字号缩放，不占 4px 标度的字面量额度。 */
  margin:1.6em 0;
  padding:0 0 0 14px;
  border:0;
  border-left:4px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  font-style:italic;
  font-weight:500;
}
[data-conversation-scroll] .icaHSq_column .IzP3Va_attachmentRow img{
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.1));
  border-radius:var(--dsw-radius-xl);
}

/* ── G1 工具调用摘要行（2026-10-31，ZCode v3.17.1 ToolSummaryRow 源码）──────
   宿主把整行颜色压在一个 30% 前景上（9223 活体实测 .-gRAhq_root = rgba(212,212,212,.5)），
   于是「类别词」与「这次干了什么」同灰，扫读时分不出主次。ZCode 的 ToolSummaryRow 规则是：
   主文本继承默认前景，只有图标与 kindLabel 用 text-foreground-subtlest；
   主文本走 ZCode 的 text-ui-base 档（其 --ui-font-size 取 14 号）。
   行高不动（宿主在 ._text_1rdzk_17 上是 24px 行高，字号换档后仍是 24px，行高不变＝无布局位移）。
   作用域用行级稳定属性 data-chat-flow-kind 锚定，避免同名哈希类在会话区别处被误伤。 */
[data-chat-flow-kind="tool-call"] .-gRAhq_summary ._text_1rdzk_17{
  color:var(--dsw-alias-label-primary);
  font-size:var(--dsw-font-size-base);
}
`

const STYLE_ID = 'dcu-conversation-layout'

/** 安装会话区布局样式；返回卸载函数。幂等（同 id 只保留一份）。 */
export function installConversationLayout(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.getElementById(STYLE_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CONVERSATION_LAYOUT_STYLE
  document.head.appendChild(style)
  return () => { style.remove() }
}
