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
 *   正文文字列 784（spec 的 924 是滚动容器口径，见常量注释）/ 轮组 margin-top 20 / 正文 14px 行高 24.5
 *
 * 纪律：只写属性、不加节点、不用 !important（全部靠特异性达标）。
 */

/**
 * ZCode 实测**文字列**宽 = 784px。
 *
 * 2026-10-28 更正（原值 924 是错的口径）：活页实测 ZCode 会话列容器
 * max-width:896px + 左右 padding:24px → 正文实际 784px（1202px 视口下）。
 * 原先 03c 规格里的 924 量的是滚动容器而不是文字列，导致 DSH 每行 64 个汉字，
 * 比 ZCode（55 个）宽 15%——长行是「像文档、不像对话」的主因。
 */
const ZCODE_CONTENT_WIDTH = 784
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
[data-conversation-scroll] .icaHSq_column{max-width:${ZCODE_CONTENT_WIDTH}px}

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

/* 复制钮颜色对齐 ZCode 的「30% 系」。
   宿主现在是 rgba(212,212,212,.5)（50% 前景）；ZCode 工具/代码的次要元素用 30% 边框色。
   用 --dsw-alias-label-dimmed（= 前景 30%）而不是写死 rgba：
   它随主题翻转，符合「中性色不用死值」的设计逻辑。 */
[data-conversation-scroll] .icaHSq_column .ppByMG_action{
  color:var(--dsw-alias-label-dimmed,rgba(212,212,212,.3));
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
