/**
 * 会话区布局与排版：对齐 ZCode（03c-conversation.md 矩阵 C1/C2/C3）。
 *
 * 背景（2026-10-27 盘点结论）：插件此前对会话区**消息内容零覆盖**，
 * 视觉 100% 来自宿主默认。本模块是会话区覆盖的第一块，只做「骨架三件」。
 * 2026-10-28 追加 G17 扁平化（用户已裁决：去气泡、跟随 ZCode）。
 * 不碰代码块、不碰工具卡（D 系列待样本）。
 *
 * 所有值来自 ZCode 活页面实测（03c-conversation-zcode-spec.json）：
 *   contentWidth 924 / 轮组 margin-top 20 / 正文 14px 行高 24.5
 *
 * 纪律：只写属性、不加节点、不用 !important（全部靠特异性达标）。
 */

/** ZCode 实测内容列宽。宿主默认 640（由 --dsh-chat-content-width 驱动）。 */
const ZCODE_CONTENT_WIDTH = 924
/** ZCode 轮组间距（轮组制，不是逐条）。 */
const ZCODE_TURN_GAP = 20
/** ZCode 正文行高（14px 字号下 1.75 倍）。 */
const ZCODE_LINE_HEIGHT = 24.5

export const CONVERSATION_LAYOUT_STYLE = `
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

/* ── G17 用户轮扁平化（2026-10-28 裁决：去气泡，跟随 ZCode）──────────
   ZCode 用户轮 = 透明行：无底色、无圆角、无内边距、全宽左对齐、正文同款排版
   （03c 矩阵 C-0；zcode-spec textSamples：P 14px/24.5、oklch(0.87 0 0)，与助手一致）。
   DSH 气泡现状（CDP 实测）：.IzP3Va_bubble bg rgb(32,32,32) / radius 12px /
   pad 10px 16px / 文字 14px/22px；右对齐来自 userRow+userStack 的
   align-items:flex-end；限宽来自 userStack max-width:min(449.28px,82%)。
   文字色 rgb(212,212,212) 即宿主 alias-label，与 ZCode oklch(0.87 0 0) 同源，不动。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_bubble{
  background:transparent;
  border-radius:0;
  padding:0;
  line-height:${ZCODE_LINE_HEIGHT}px;
}
/* 右对齐 → 左对齐：两个容器都写了 flex-end，两处都要翻（特异性 0,3,0 > 宿主 0,1,0）。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_userRow,
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{align-items:flex-start}
/* 82% 限宽 → 全宽：ZCode 用户轮随内容列 924 换行（C1 同宽）。 */
[data-conversation-scroll] .icaHSq_column .IzP3Va_userStack{max-width:none}

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
