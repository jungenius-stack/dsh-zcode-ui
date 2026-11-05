/**
 * ZCode 视觉规范落点：Zai Light / Zai Dark 双色板与主题同步。
 * 色值提取自 zai-org/ZCode 的 packages/ui/src/styles.css（.theme-zai-light / .theme-zai-dark 覆盖层），
 * 机制参照其 useTheme.ts：明暗由根节点 class 表达，system 档跟随 prefers-color-scheme。
 *
 * DSH 宿主以 body[data-ds-dark-theme] 表达暗色（宿主自己的主题设置），本模块把它镜像到
 * documentElement 的 theme-zai-light / theme-zai-dark class，与 ZCode 的语义保持一致；
 * 样式表同时认两个信号，未同步时（首帧、无 JS）也不丢主题。
 */

import { SKIN_ENVELOPE_STYLE } from './skin-envelope.ts'

/** Zai 双色板：供 <style> 注入，覆盖 dcu-* 变量；选择器与宿主暗色属性、ZCode class 双兼容。 */
export const ZCODE_THEME_STYLE = `
:root{color-scheme:light}
body[data-ds-dark-theme],.theme-zai-dark{color-scheme:dark}
/* 主色属**全局语义色**，不能只挂在下述侧栏作用域里：输入区的发送键也用它填充
   （[data-composer-card] 下的 button[class$=_primary]），而输入区不在 .dcu-root 内，
   挂在侧栏作用域会让该 var() 解析失败并静默失效——详见 docs/KNOWN-ISSUES.md §8。 */
:root{--dcu-primary:#000000;--dcu-primary-foreground:#ffffff}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-primary:#ffffff;--dcu-primary-foreground:#000000}

/* ── 状态色：填充档 / 文字档分离（2026-10-14）─────────────────────────────
   Zai 的「--dsw-alias-state-{success,error,warn}-*」是**按填充用途**推导的值：
   #e03131 / #1e8a3e / #e07b00。它们作为色块（进度条、指示点、按钮底）成立，
   但**当作小字用时亮色档全部不达 WCAG AA**——实测（底 = 侧栏 #f0f0f0 / 页面 #f8f8f8）：

     #e07b00 于 #f0f0f0 = 2.63:1   「待处理」胶囊文字（悬停态 #e4e4e4 更降到 2.36:1）
     #e03131 于 12% 错误色调底   = 3.34:1   会话区错误提示条
     #e07b00 于 #f8f8f8 = 2.82:1   关于页「有更新」
     #1e8a3e 于 #f8f8f8 = 4.15:1   关于页「已安装」

   这与 docs/ZCODE-DESIGN.md §9「明度即层级」是同一个问题：那节把 secondary/tertiary
   按实际底色重取了值，但**没有覆盖状态色轴**。§10.2 契约第 4 条甚至明令第三方插件
   「语义色只约束填充，不得用于文字」——本插件自己的亮色档却在这么做。

   故在此分档：**填充档沿用 Zai 原值不动**（色相语义不变，第三方进度条等仍按原样收敛），
   **文字档按实际底色重新取值**，色相保持同族、只压明度，符合 §11「只用位移与明度」。

   挂「:root」而非侧栏作用域的原因同 --dcu-primary：会话菜单（含删除按钮）经 portal
   渲染到 body，不在 .dcu-root 内，挂作用域会静默失效。

   实测（明暗两档、全部消费底色，含 12% 色调底与行悬停底）：
     文字档亮色  warn #8a4b00 ≥5.04:1  error #b3261e ≥4.84:1  success #176c31 ≥4.82:1
     文字档暗色  warn #ff8a30 ≥6.02:1  error #ff5c5c ≥4.68:1  success #46bf72 ≥6.04:1

   「--dcu-state-error-fill / --dcu-state-error-fill-hover」是「错误底 + 反色文字」按钮
   （归档确认）的配对。悬停方向**必须随主题相反**：亮色前景是白，底色要更暗；
   暗色前景是深色，底色要更亮。旧实现两档一律变亮，导致亮色 3.91:1、暗色 3.93:1 双双掉线。 */
:root{
  --dcu-state-success-text:#176c31;--dcu-state-error-text:#b3261e;--dcu-state-warn-text:#8a4b00;
  --dcu-state-error-fill:#e03131;--dcu-state-error-fill-hover:#c52b2b;
  /* 浮层三件套同样挂在 :root：工具菜单与 Git 弹窗经 portal 渲染到 body，不在
     .dcu-root / .dcu-settings-page / .dcu-home 任一侧栏作用域内，挂在作用域上，
     var() 会解析失败并静默走字面量回退（与 --dcu-primary、--dcu-state-* 同因）。 */
  /* 2026-10-18（红队复核）：--dcu-tip-hover 原先只被消费、从未定义——靠 var() 的 fallback
     勉强生效（CodexWorkspaceBrowser 的 .dcu-wb-tip-pin:hover）。补齐定义，语义同侧栏 hover。 */
  --dcu-tip-bg:#f0f0f0;--dcu-tip-border:rgba(13,13,13,.1);--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--dcu-tip-hover:rgba(13,13,13,.05);--dcu-dialog-bg:#fff;
  /* 浮层专用文字色板：与 --dcu-tip-bg **成对**定义（ZCode 的 tooltip / tooltip-foreground 做法）。
     为什么不能复用侧栏色板：侧栏底是 #f0f0f0，浮层底是 #ffffff，同一个 tertiary
     搬过去对比度会变。此前实测暗色下 secondary 3.99:1 / tertiary 3.68:1 均掉线。2026-10-30（夜审批次 2）：ZCode 浮层分两组——tooltip 浅 #f0f0f0、toast/card 浅 #fff，故对话框底另立 --dcu-dialog-bg（浅 #fff / 深 #2b2b2b）。
     亮底实测：#262626 15.13:1 ／ #5c5c5c 6.69:1 ／ #686868 5.57:1，全部 ≥AA。 */
  --dcu-tip-primary:#0d0d0d;--dcu-tip-secondary:#5c5c5c;--dcu-tip-tertiary:#686868;
  /* 键帽文字：ZCode Kbd 用 text-tooltip-tag-foreground（night2 surface-2 #5 更正注释：原写
     text-muted-foreground 在 ZCode 编译 CSS 中不存在，Kbd 实际消费 --color-tooltip-tag-foreground，
     浅 #5c5c5c / 深 #adadad），本仓按侧栏底重取。实测（底 = #f0f0f0 叠 3% 中性 = #e9e9e9）：#5c5c5c = 5.51:1 ✅ AA。tertiary #686868 只有 4.59:1 余量太小，暗色档掉到 4.14:1，故不用。 */
  --dcu-kbd-foreground:#5c5c5c;
  /* 选中行内的次要文字：选中底 #e5e5e5 上 tertiary #686868 只有 4.42:1（<AA），
     提到 secondary #5c5c5c = 5.31:1 ✅。只影响选中行，普通底色下的取值不变。
     2026-10-18（红队复核）：删掉 --dcu-selected-tertiary —— 它零消费（全仓唯一命中是定义
     与断言里的成对正则），属投机档位。本仓对此有明文纪律（见下方尺寸档那段：
     「零消费的档位是投机设计」），同轮一边删投机档位、一边留着它自相矛盾。
     将来真需要选中态的第三档，再加回来并同时给出消费点。 */
  --dcu-selected-secondary:#5c5c5c;
}
body[data-ds-dark-theme],.theme-zai-dark{
  --dcu-state-success-text:#46bf72;--dcu-state-error-text:#ff5c5c;--dcu-state-warn-text:#ff8a30;
  --dcu-state-error-fill:#ff5c5c;--dcu-state-error-fill-hover:#ff7070;
  /* 浮层三件套（底色/描边/投影）也在暗色下重取：它们挂在 :root 而不是侧栏作用域，
     是为了让 portal 到 body 的浮层（工具菜单、Git 弹窗）也拿得到——见上面亮色那段的说明。 */
  --dcu-tip-bg:#2b2b2b;--dcu-tip-border:rgba(255,255,255,.1);--dcu-tip-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--dcu-tip-hover:rgba(255,255,255,.05);--dcu-dialog-bg:#2b2b2b;
  /* 暗底 #2b2b2b 实测：#d4d4d4 9.55:1 ／ #9a9a9a 5.03:1 ／ #a3a3a3 5.61:1，全部 ≥AA。
     注意 secondary 取 #9a9a9a 而非侧栏的 #888888——后者在 #2b2b2b 上只有 3.99:1。 */
  --dcu-tip-primary:#f8f8f8;--dcu-tip-secondary:#9a9a9a;--dcu-tip-tertiary:#a3a3a3;
  /* 暗色档实测（底 = #161616 叠 5% 白 = #222222）：
     secondary #888888 = 4.49:1（差 0.01 掉线，不能用）、#9a9a9a = 5.65:1 ✅ AA。 */
  --dcu-kbd-foreground:#9a9a9a;
  /* 选中底 #2d2d2d 上 tertiary #828282 只有 3.58:1（<AA），secondary #888888 也只有 3.89:1，
     两者都掉线，故统一提到 #9a9a9a = 4.89:1 ✅。同上，只保留有消费点的 secondary。 */
  --dcu-selected-secondary:#9a9a9a;
}
/* ── 动效令牌 ─────────────────────────────────────────────────────────────
   2026-10-13 起：原先全站收敛为「180ms ease-out」一条曲线。那是一致，但没有意图——
   出现、移动、消失用同一条曲线，读起来是「没做动效」而不是「克制的动效」。现按意图分档：

     反馈 feedback  悬停 / 按下 / 选中底色变化——必须立刻回应，所以最短。
     移动 move      尺寸、位置、行高变化——需要看得见过程，所以最长。
     进入 enter     内容出现——减速收尾，落点要稳。
     退出 exit      内容消失——加速离场，不要拖住下一个动作。
     按压 press     只有按下瞬间的位移，比反馈更短，做出「手感」。

   ── 2026-10-17 曲线修正（用户反馈「动效不够丝滑」）─────────────────────────
   反馈与移动档此前用 cubic-bezier(.4,0,.2,1)。查 ZCode 编译产物
   （/Applications/ZCode.app/.../styles-Cg6LSa5A.css）后确认这是**错的**：

     --ease-out:    cubic-bezier(0, 0, .2, 1)     ← ZCode 的 .ease-out 用这条
     --ease-in-out: cubic-bezier(.4, 0, .2, 1)    ← 我们误用的其实是「缓入缓出」

   两者前 10% 时间的进度相差 **12 倍**（2.6% vs 30.4%），实测 180ms 位移：

     曲线                    起步 30ms 内已走
     .4,0,.2,1（旧·错）        2px / 92px  ← 用户感知「点了不跟手」
     0,0,.2,1（ease-out·正确）  26px / 92px
     .2,0,0,1（enter）          42px / 92px

   缓入缓出适合「有来有回」的循环动画；单向位移（侧栏开合、行高展开）用它会显得滞重。
   本仓的 feedback / move 全部是单向变化，因此统一改为 ease-out。
   反向测试见 tests/design-system.assert.ts（改回 .4,0,.2,1 即判红）。

   全部落在 ZCode 要求的「快、低戏剧性」区间（90–180ms），不使用带过冲的弹簧曲线：
   cubic-bezier(.2,0,0,1) 是减速曲线，没有回弹；.4,0,1,1 是加速曲线，同样无过冲。
   与色板不同，动效不分明暗——挂 :root，供侧栏、设置页、新会话页共同消费。 */
:root{
  /* 2026-10-26：按 ZCode 3.16.3 CDP 现场实测（cdp-capture/zcode-motion.json）对齐两档。
     实测只有两档，不是一档：
       颜色/背景/边框类 → 0.15s cubic-bezier(0.4, 0, 0.2, 1)   （最常用，13 个属性）
       位移/尺寸/高度类 → 0.3s  cubic-bezier(0, 0, 0.2, 1)
     原值 feedback 120ms(0,0,.2,1) / move 180ms 是估的，偏快且曲线不对。
     保留五档结构不动：enter/exit/press 在 ZCode 侧栏范围内没采到对应值，
     不臆造，维持原值。 */
  --dcu-motion-feedback-duration:150ms;--dcu-motion-feedback-ease:cubic-bezier(.4,0,.2,1);
  /* 2026-10-29 ZCode asar 实测校正（两处时长分开，不再共用一档）：
     · 侧栏开合 = 宿主 workspace 侧栏类名 duration-200 ease-out transition-[width,opacity]
       → 200ms + cubic-bezier(0,0,.2,1)（旧值 300ms 比 ZCode 慢 50%，是「收起拖沓」的根源）
     · 折叠体（分组展开/收起）= ZCode animation .3s ease-in-out → 300ms
     两件事在 ZCode 里本来就是两个值，此前被我们并成 300ms 一档。 */
  --dcu-motion-move-duration:200ms;--dcu-motion-move-ease:cubic-bezier(0,0,.2,1);
  --dcu-motion-collapse-duration:300ms;--dcu-motion-collapse-ease:cubic-bezier(.42,0,.58,1);/* 2026-11-04 night9 更正：ZCode 折叠用 CSS 关键字 ease-in-out（.42,0,.58,1）；旧值 (.4,0,.2,1) 是 Tailwind 变量 --ease-in-out 的值，不是关键字值，两者在 ZCode 里并存且不等 */
  /* 2026-10-29 ZCode asar：--animate-in / --animate-out 的默认时长都是 .15s
     （enter 与 exit 同档），此前我们写 160/120 是估的。曲线保留意图分档
     （enter 减速收尾 / exit 加速离场），时长对齐 ZCode 的 150ms。 */
  --dcu-motion-enter-duration:150ms;--dcu-motion-enter-ease:cubic-bezier(.2,0,0,1);
  --dcu-motion-exit-duration:150ms;--dcu-motion-exit-ease:cubic-bezier(.4,0,1,1);
  --dcu-motion-press-duration:90ms;--dcu-motion-press-ease:cubic-bezier(.2,0,0,1);
}
/* ── 间距标度（2026-10-16 补，对齐 ZCode DESIGN.md §Spacing）────────────────────
 *
 * ZCode 把间距列为设计系统的独立一层：基准单位 4px，推荐节奏
 * 4 紧贴图标/文字 → 8 紧凑控件内边距与行内间隙 → 12 密集列表项与菜单行
 * → 16 标准卡片与面板内边距 → 20–24 较大分区与对话框内部，
 * 并明令「Prefer a small set of repeated gaps and paddings instead of arbitrary values」。
 *
 * 本插件此前**没有这一层**：几何值直接写字面量，于是长出了 5/7/9/14/18/22px 这类
 * 一次性数字（共 39 处离刻度间距），同一份界面里同义间距出现两三种值——
 * 这正是 ZCode 那条规则要防的「arbitrary values」。它们不是错，但没有体系：
 * 改动时没人知道该跟哪个值，于是继续长新的。
 *
 * 只登记**真正在用**的档位（2026-10-16 收尾自检删掉了 10 个零消费的投机档位）：
 * 第一版按 ZCode 的完整标度预置了 7 个间距档 + 8 个尺寸档，但自检发现其中
 * space-half / space-5 与**全部 8 个尺寸档**在代码里 0 处消费——
 * 那是「为将来准备好档位」的投机设计（AGENTS.md 第 2 条：只写解决问题的最少代码）。
 * 档位是**用出来**的，不是**定出来**的：真需要 20px 时加一行即可，
 * 而预置死令牌只会让后来人以为"这些档位有约定俗成的用法"。
 * 保留下来的 5 档都有实际消费点（space-1..4、6 共 40 处）。
 *
 * 与圆角令牌（--dsw-radius-*）的分工：圆角是 Tailwind 语义档位（sm/md/lg/xl），
 * 间距是线性标度，故这里用数值命名（space-1..space-4/6 对应 4/8/12/16/24）。
 * 命名不随界面字号缩放——ZCode 要求「图标、间距、圆角等 rem 几何不得随字号缩放」。 */
:root{
  --dcu-space-1:4px;      /* 紧贴图标/文字 */
  --dcu-space-2:8px;      /* 紧凑控件内边距、行内间隙 */
  --dcu-space-3:12px;     /* 密集列表项、菜单行 */
  --dcu-space-4:16px;     /* 标准卡片与面板内边距 */
  --dcu-space-6:24px;     /* 对话框内部、较大分区 */
}
/* 加载转圈的共享基元（ZCode 原版复刻，2026-10-13）。
 *
 * 源 = 本地 ZCode 3.15.1：Spinner 组件用 LoaderIcon + Tailwind animate-spin，
 * 主题原文 --animate-spin: spin 1s linear infinite、@keyframes spin{to{transform:rotate(360deg)}}
 * （app bundle CSS 实测）。这里是它的插件侧等价物——1s / linear / 无限，参数不得改：
 * 不做令牌化是因为它不属于五档「意图」过渡，而是 ZCode 锁定的状态动画常量；
 * 图标、尺寸、颜色仍由使用处给（ZCode 同模型：Spinner 只接 className）。
 * 放在主题层（应用级）：侧栏运行中、设置页安装中转圈与将来接入的外来表面共用同一份定义，
 * 避免「两处同义规则各写一遍、谁被删了都不知道」。 */
.dcu-spin{animation:dcu-spin 1s linear infinite}

/* 三态外壳（loading / error / empty）——2026-10-14 补上这块此前完全空白的规范
   （docs/KNOWN-ISSUES.md §13.6 自登记：本仓「无统一规范、无断言」）。
   设计决定：
   · **一个外壳只换语义色**，不换容器几何——同一处信息换个状态不该跳版。
   · **错误态不铺 destructive 底色**。语义靠①文字用 --dcu-state-error-text（≥4.5:1）、
     ②容器带 role="alert"、③表单控件用 aria-invalid 边框表达。铺 12% 色调底是
     此前 .dcu-wb-error 的做法，在 240px 窄栏里是一整块刺眼的红，且与 §10.2 契约
     第 4 条「语义色只约束填充，不得用于文字/整块背景」相抵触。
   · 图标由使用处给（ZCode 同模型：Spinner 只接 className），外壳只管间距与文字。
   放主题层（应用级）：侧栏 / 频道 / 定时 / 行内操作 / 弹窗都要用，避免各抄一份。 */
.dcu-state,.dcu-wb-error{display:block;padding:8px 10px;border-radius:var(--dsw-radius-lg);font-size:var(--dsw-font-size-sm);line-height:20px;color:var(--dcu-sidebar-secondary)}
.dcu-state--error,.dcu-wb-error{color:var(--dcu-state-error-text)}
.dcu-state--empty{color:var(--dcu-sidebar-tertiary)}
/* 需要图标位时用这个修饰符：外壳变 flex，图标位固定 16px、随文字色。 */
.dcu-state--with-icon{display:flex;align-items:flex-start;gap:8px}
.dcu-state--with-icon>.dcu-state-icon{flex:none;width:16px;height:16px;margin-top:2px;color:inherit}
@keyframes dcu-spin{to{transform:rotate(360deg)}}
/* 文档隐藏时暂停动效（移植自 ZCode styles.css:84-92 的 html[data-document-hidden]）。
 *
 * 上游原文的根因：「窗口 hidden 时 CSS 动画无法结算，DocumentTimeline 会持有期间被移除的
 * 元素及整棵子树，后台流式输出时内存无上限累积、恢复可见才释放。」
 * 长对话 + 后台流式输出正是这个泄漏最容易放大的现场。
 *
 * 与下面 prefers-reduced-motion 的分工：本块解决**内存**（页面不可见期间不创建动画对象），
 * 那块解决**可访问性**（用户偏好不要动效）。触发条件无关，不能合并——
 * 用户开着动效偏好时后台照样会累积。
 *
 * 用星号通配是本条**唯一**正当的场景：它必须在隐藏期间覆盖**任何**元素的动画，
 * 包括宿主与第三方插件的（正是它们的动画对象泄漏）。范围限定在
 * html[data-document-hidden] 下，且该属性只在页面不可见时存在，所以日常零开销。 */
html[data-document-hidden] *,html[data-document-hidden] *::before,html[data-document-hidden] *::after{transition:none!important;animation:none!important}
/* 令牌化的副产品：减少动态效果不再需要逐个元素写 transition:none —— 把五档时长一起归零，
   所有消费方自动跟随。各处残留的 transition:none 块保留（它们同时覆盖未令牌化的宿主元素）。 */
@media (prefers-reduced-motion:reduce){
  :root{--dcu-motion-feedback-duration:0ms;--dcu-motion-move-duration:0ms;--dcu-motion-collapse-duration:0ms;--dcu-motion-enter-duration:0ms;--dcu-motion-exit-duration:0ms;--dcu-motion-press-duration:0ms}
  /* 时长归零管不到 infinite 动画——波浪与旋转会继续动。按 ZCode 的「停静止帧」处理：
     动作归零，但保留「进行中」的可读性（进度停在当前进度，而不是变回 0；转圈停在原角度，图标不消失）。 */
  :root:root .dcu-about-progress-fill[data-wave=true]{animation:none;width:28%}
  :root:root .dcu-spin{animation:none}
}
/* Zai Light —— 默认浅色，全部语义角色取自 .theme-zai-light 覆盖层。

   2026-10-18（设计审计 P1-1）：secondary 由 #5c5c5c 压到 **#595959**。
   原因：第三档（tertiary）与第二档的明度差塌了。§14.1 为了让 tertiary 达到 AA，
   把它从 L*41.6 抬到 44.0，正好顶到 secondary 旁边 —— 档间 ΔL* 只剩 4.9，
   在 .dcu-wb-section-label（secondary）与紧邻其下的 .dcu-wb-empty（tertiary）
   同字号直接相邻的场景里，两者对比只有 1.20:1，肉眼几乎相同。
   审计的结论是「带宽耗尽 → 减需求（空态改条件渲染）」；复算表明带宽没有耗尽，
   **空间在 secondary 一侧**（往 primary 推不受 AA 地板约束）：
     secondary #595959 → L*37.8，ΔL*(s,t)=6.2，对比度 sidebar 6.15 / hover 5.56，
     primary↔secondary 仍差 22.7（远大于 6）。
   取 6.2 而非更大值，是为了不把 primary 与 secondary 的区别也压没。 */
/* ⚠ 2026-10-28 白缝修复（深色主题）：宿主的侧栏列 [data-dcu-sidebar-column] 是 .dcu-root 的
   **祖先**，祖先读不到后代作用域里定义的变量 —— 于是 CodexSidebar 那条
   background:var(--dcu-sidebar-background, #f0f0f0) 在宿主列上一直取兜底 #f0f0f0（浅灰）。
   静止态被插件自己的壳盖住看不见，但开合动画期间「已收窄的侧栏列」与「未到位的正文列」
   之间会露出这段宽度（实测收起时 104px），深色主题下就是一道白缝。
   修法：在 html/body 上也挂一份同名变量，让祖先链能解析；壳内同名声明值相同，不冲突。 */
:root{--dcu-sidebar-background:#f0f0f0}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-sidebar-background:#161616}
.dcu-root,.dcu-settings-page,.dcu-home{
  /* TA1（03g 主题审计，2026-10-27）：浅色底按 ZCode **分层**取值，不再取中值。
     ZCode tokens.json 实测（浏览器 canvas 像素回读换算，双已知值反验通过）：

       oklch(97%   0 0) → rgb(245)  = #f5f5f5   ← 基础层（非运行时值）
       oklch(98.5% 0 0) → rgb(250)  = #fafafa   ← 基底层 --color-background（被覆盖残值）
       反验：oklch(87% 0 0) → 212（= 深色前景）、oklch(37.1% 0 0) → 64（= G14 基色）✅

     night2 surface-14 #5 更正：245/250 都是被 zai 覆盖层覆盖的基底层残值，不是设计语言——
     运行时真值 = 覆盖层：侧栏 #f0f0f0 / 画布 #f8f8f8（差 8 通道）。

     映射：
       .dcu-root（插件侧栏壳）          → #f0f0f0 (240)  ← 2026-11-03 9224 活体实测
       .dcu-settings-page / .dcu-home（整页弹层）→ #f8f8f8（248，zai-light 覆盖层）

     G14 联动（已算）：底 245 上 secondary 85% ≈ 6.2:1、tertiary 75% ≈ 4.7:1，仍双双过 AA，
     故 alpha 保持 85%/75% 不动。

     tokens.json 浅色列采样于无主题类的基底层（night2 surface-14 §2 根因），换算记录保留。 */
  --dcu-sidebar-background:#f0f0f0;--dcu-sidebar-primary:#262626;
  /* G14（03b-sidebar）：原为写死 #595959。改为 alpha 叠加。
     基色 #404040 = ZCode 基底层 --color-foreground（neutral-700，oklch(37.1% 0 0)）。
     目标渲染色 = oklab(0.371 0 0 / 0.6)，与 ZCode 分组标题实测一致。
     **历史坑（2026-10-27 第 3 轮评判对账）**：最初误用 #0a0a0a（foreground-subtle 的基色），
     那是另一个令牌；正确基色必须是 foreground 本身。 */
  /* G14 终版（2026-10-27；night2 surface-14 #3 更正身份）：#404040 是基底层 foreground（neutral-700），
     运行时 zai-light --color-foreground = neutral-800（#262626）；取基底层 L 身份，alpha 抬升的 AA 理由独立。
     为什么必须抬 alpha：ZCode 自己的 oklab(0.371/0.6) 在它的 #fbfbfb 上也只有 3.29:1
     （本就不达 AA），而 DSH 背景 #f0f0f0 更暗，同样 alpha 掉到 3.19:1。
     实测解：alpha 0.85 / 0.75 → 6.05:1 / 4.61:1，双档过 AA 且 ΔL*(s-t)=7.4 可分辨。 */
  --dcu-sidebar-secondary:color-mix(in oklab,#404040 85%,transparent);
  --dcu-sidebar-tertiary:color-mix(in oklab,#404040 75%,transparent);--dcu-sidebar-navigation:#262626;
  /* 2026-10-18（红队复核澄清身份）：--dcu-sidebar-icon 是**图标色**，不是「第四档文字」。
     全仓消费点只有 SVG（菜单图标 / 文件夹 / 设置入口），无一处用作文字。
     故它适用 WCAG 非文本 3:1，不适用文字的 4.5:1，也不参与「三档灰 ΔL*≥6」的档间判据。
     实测：#525252 on #f0f0f0 = 6.86:1（远超 3:1）。
     ⚠ 已知副作用：P1-1 把 secondary 压到 #595959 后，图标与 secondary 的明度差从
     4.2 缩到 2.9。这是**可接受**的——图标是装饰/提示，与正文不是并列层级，
     且两者从不并排表达同一语义。若将来出现「图标必须与文字明确区分」的场景，
     把 icon 压到 #454545 可把 ΔL 拉开到 8.5（on #f0f0f0 8.41:1），代价是图标更重。 */
  --dcu-sidebar-icon:#525252;
  --dcu-sidebar-hover:rgba(13,13,13,.05);--dcu-sidebar-selected:rgba(13,13,13,.05);
  /* 2026-10-18（设计审计 P1-2）：表面分离两套主题机制统一为「填充差 ~1.07 + 边线 ~1.45」。
     实测亮色原本靠填充差 1.073（#f0f0f0 vs 画布 #f8f8f8），边线只有 1.24；
     暗色反之靠边线（1.31），填充差几乎为 0。切主题时边界强度会突变。
     注：审计给的暗色基线「#3f3f40 / 1.72」在全仓不存在（grep 0 命中），实测合成值是
     rgba(255,255,255,.1) over #161616 = #2d2d2d / 1.31 —— 按实测校准，不采信报告数字。
     亮色边线 alpha .1 → .18：合成 #cdcdcd，对比 1.45（原 1.24）。 */
  /* HD1（2026-10-27 顶栏对齐 03e）：顶栏底部分隔线。ZCode 实测 1px、白 5% alpha
     （暗色）。浅色反转为黑 5%，与既有「中性色只用 alpha 叠加」的规则一致。 */
  /* S2（03f 设置页）：ZCode 分区卡片底色 #161616（深）/ 浅色对应更亮的一档。
     DSH 宿主 --dsw-alias-settings-card-fill 是 #2b2b2b，比 ZCode 亮 21 个灰阶。
     这里只在设置页作用域内覆盖，不动宿主令牌本身。 */
  /* S1（03f）：ZCode 设置页导航分区项 16px / radius 12px。
     DSH 原为 14px / 8px。实测 16px 不折行、不溢出（注入验证过），可安全放大。 */
  --dcu-settings-nav-size:16px;
  --dcu-settings-nav-radius:12px;
  /* TA1：设置页整页底 = ZCode 画布层 #f8f8f8（zai-light 覆盖层真值）；侧栏层 #f0f0f0 见 .dcu-root。 */
  /* TA4（2026-10-28 静态定案）：ZCode 深色设置卡 = --color-background（#161616，与画布
     同底、仅边框分隔——S2 实测）。浅色对称取画布值 #fafafa（旧 #fbfbfb 是未验证猜测）。 */
  --dcu-settings-page-bg:#f8f8f8;
  --dcu-settings-card-fill:#fafafa;
  --dcu-header-border:1px solid rgba(13,13,13,.05);
  --dcu-sidebar-border:rgba(13,13,13,.1);--dcu-focus:#0b7fff;
  --dcu-surface:rgba(13,13,13,.03);
}
/* Zai Dark —— 宿主暗色属性或 ZCode 暗色 class 命中任一即切换。

   2026-10-18（P1-1，同上）：secondary 由 #888888 抬到 **#969696**。
   暗色档更糟——ΔL*(secondary,tertiary) 只有 **2.3**（1.08:1，等于没有第三档）。
   方向必须与亮色相反：暗色下往 primary（更亮）推才有空间。
   取 #969696 而非刚够的 #939393：后者的 ΔL 是 6.6，但在选中底 #2d2d2d 上
   secondary 只有 4.48:1（差 0.02 掉出 AA）；#969696 得 ΔL=7.7 且选中底 4.66:1，
   同时 sidebar 6.12 / hover 5.38 全部达标。primary↔secondary 仍差 22.8。 */
body[data-ds-dark-theme] .dcu-root,body[data-ds-dark-theme] .dcu-settings-page,body[data-ds-dark-theme] .dcu-home,
.theme-zai-dark .dcu-root,.theme-zai-dark .dcu-settings-page,.theme-zai-dark .dcu-home{
  --dcu-sidebar-background:#161616;--dcu-sidebar-primary:#d4d4d4;
  /* G14：原为写死 #969696。改为 alpha 叠加。
     基色 #d4d4d4 = ZCode 深色 --color-foreground（oklch(87% 0 0)，oklab L=0.8699）。
     目标渲染色 = oklab(0.87 0 0 / 0.6) —— **与 ZCode 三条项目行实测值完全相同**。
     **历史坑（2026-10-27 第 3 轮评判对账）**：我最初写成 #e5e5e5（= foreground-subtle 的基色），
     它的 oklab L=0.9219，评判方实测到 oklab(0.9219/0.51) 正是这个误用。
     基色必须是 foreground 本身（L=0.87），不是 foreground-subtle。 */
  /* G14 终版：基色 #d4d4d4 就是 ZCode 的 --color-foreground（oklab L=0.8699），
     secondary 渲染为 oklab(0.87/0.68) —— L 与 ZCode 完全一致（差 0.00006），
     只把 alpha 从 0.6 提到 0.68，让 tertiary 也过 AA（4.58:1）并保住三档 ΔL* 8.9。 */
  --dcu-sidebar-secondary:color-mix(in oklab,#d4d4d4 68%,transparent);
  --dcu-sidebar-tertiary:color-mix(in oklab,#d4d4d4 56%,transparent);--dcu-sidebar-navigation:#d4d4d4;
  /* 暗色侧 icon 同属「图标色」身份（见亮色侧说明）。实测 #a3a3a3 on #161616 = 7.17:1。
     P1-1 后与 secondary(#969696) 的明度差从 10.3 缩到 4.9；同样是可接受的，理由同亮色侧。
     注意暗色方向相反：icon 比 secondary 更亮，所以若要拉开应继续提亮而非压暗。 */
  --dcu-sidebar-icon:#a3a3a3;
  --dcu-sidebar-hover:rgba(255,255,255,.05);--dcu-sidebar-selected:rgba(255,255,255,.1);
  /* 2026-10-18（P1-2，暗色侧）：两套主题的**表面分离机制**统一到「边线承担主区分」。
     原先亮色靠填充差（1.073）、暗色靠边线（1.31），切主题时边界强度会突变。
     一度试过把暗色 sidebar 提亮到 #1c1c1c 去造 1.06 的填充差，但**副作用不可接受**：
     底色一亮，tertiary #828282 立刻从 4.71 掉到 4.43（<AA），三档灰必须连锁重取
     （实测需 secondary 升到 #a0a0a0 才保住 ΔL≥6）。大面积底色的亮度是承重约束，
     不能为了对齐一套机制去动它。
     故改为：暗色底色保持 #161616，边线 alpha .1 → .16（合成 #3b3b3b，对比 1.31 → 1.62）。
     与亮色侧 .18（合成 #c7c7c7 / 1.48）方向一致、量级同档，两套主题的边界强度不再突变。 */
  /* S2：设置页卡片深色值。作用域见 settings-page-styles.ts 的 .dcu-settings-page。 */
  /* TA1：设置页深色底 = ZCode --color-background dark #161616 */
  --dcu-settings-page-bg-dark:#161616;
  --dcu-settings-card-fill:#161616;
  --dcu-header-border:1px solid rgba(255,255,255,.05);
  --dcu-sidebar-border:rgba(255,255,255,.1);--dcu-focus:#4099ff;
  --dcu-surface:rgba(255,255,255,.05);
}
/* ── night2 落地追加（2026-11-03）─────────────────────────────────────────
   本块统一追加在文件尾而非各既有段落内：night-audit-batch-1/8 断言按**行号**锁定
   上方取值点（:20/:58/:81/:131/:137/:142/:185/:203/:217/:288/:310/:339/:353/:354），
   段内插行会让全部行号漂移；追加块零位移，语义等价（:root 级变量 + 独立规则，
   与 :245 --dcu-sidebar-background 的追加先例同款）。 */
/* night2 surface-3 M9：对话框次级按钮底。ZCode 确认框取消钮 variant:secondary =
   bg-secondary 实底无边（hover:bg-secondary/80）。
   ⚠️ 取值更正（2026-11-04 night9，证据：night2/zcode-live-styles.css 原文）：
   light 应为 #e6e6e6；旧值 #d4d4d4 只来自基础层 neutral-300，
   现网被 theme-zai-light 的 --color-secondary 覆盖为 #e6e6e6（LIVE_CSS 原文）；
   dark 侧 theme-zai-dark 明确 #363636，与基座 neutral-700 同值故一直未察觉。
   这是 HANDOFF 3.1「tokens 基础层会撒谎」的又一实例：判语义值必须读主题覆盖层。 */
:root{--dcu-secondary-bg:#e6e6e6}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-secondary-bg:#363636}
/* night2 surface-1 #8 / surface-3 M12：ZCode tailwindcss-animate 默认档。右键菜单壳
   （duration-100 + fade + scale .95 + 8px 方向滑移）与确认框（fade + zoom-in-95，
   无位移）实测同为 100ms + 浏览器默认 ease——不属于五档意图曲线，独立成档；
   reduced-motion 与五档一起归零。 */
:root{--dcu-tw-anim-duration:100ms}
@media (prefers-reduced-motion:reduce){:root{--dcu-tw-anim-duration:0ms}}
/* night2 surface-1 #7：composer 工具菜单壳底。ZCode --color-menu = #fff/#2b2b2b（不透明
   菜单底）；composer 壳的 background 优先消费 --dsw-specific-menu，本仓此前未定义 →
   浅色 fallback 吃到 tooltip 组的 --dcu-tip-bg。定义在**工具菜单标记面**上而非全局：
   宿主 asar 里该变量是宿主自己的菜单底别名（指向宿主的毛玻璃填充令牌），全局覆盖会
   连带改掉插件地盘之外的宿主菜单表面（越权）。 */
[data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]{--dsw-specific-menu:#fff}
body[data-ds-dark-theme] :is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]),
.theme-zai-dark :is([data-dcu-tool-menu],[class*="_heroWorkspaceRow"] [data-gitgraph-popover]){--dsw-specific-menu:#2b2b2b}
/* night2 surface-1 #1-#6/#8/#9：树菜单（context menu）家族注入覆盖。四棵树菜单与
   共用会话行菜单经 Menu 的 listClassName 挂 dcu-ctx-menu，密度档从 compact 改保
   dense（primitives：行 30px/内距 4-8px，去掉 compact 的 11px 字、12px 图标、4px 项
   圆角），再对齐 ZCode 实测：行 14px/行高 1.625（实高 ≈30.75px）、图标 16px、行距 2px、
   分隔线 1px 全出血（-mx-1）、壳 min-width 176（min-w-44）、壳圆角 8px（去 compact 后
   MenuSurface 自带 radius-lg）、hover 实色菜单 hover 令牌、禁用 opacity 100 +
   40%/30% 文字 + pointer-events-none、危险行高亮 = 实色 destructive 底 + 白字。
   primitives 类名是宿主 CSS Modules 哈希（_item_4ub78 等），item/icon/danger 用
   类名前缀子串锚定（composer-tool-menus 已验证的同款模式），结构槽用 role 锚定；
   壳自身规则双写类名抬优先级，压过 .list/.submenu 的同名声明。 */
/* night14 R7（2026-11-05，用户报「弹窗背景过淡、没有层次感，设计语言也不行」）：
   浮层底材质对齐 ZCode。宿主把**所有**浮层的底都收在一个令牌上：
   --dsw-menu-surface-fill: #f8f9fa94（=rgba(248,249,250,.58)，58% 半透明）+
   --dsw-menu-backdrop-filter: blur(40px) saturate(150%)，由 material 子层
   铺满浮层（position:absolute;inset:0;z-index:-1）。--dsw-specific-menu 另有
   独立硬编码值 #f8f9faf0（94%），不派生自上面那个。
   实测（9223 活体，暗/亮两套）：浮层压在纯黑衬底上合成出 rgb(144,145,145)，
   即被背后正文染成中灰；关掉半透明后同一位置为 rgb(255,255,255)。
   这就是「过淡、没层次」的物理成因：40px 模糊把背后内容糊成灰雾透上来。
   ZCode 对照（9224 活体）：菜单 bg 实测 rgb(255,255,255) **不透明**、
   border:1px rgba(13,13,13,.1)、shadow-md（10%/10%），composer 同样不透明 ——
   两侧均无毛玻璃。故此处整条对齐，并推翻 night2 surface-1 #10 的
   「已裁决偏离，维持毛玻璃」——该裁决被用户 2026-11-05 截图否证。
   范围界定：正文/composer/侧栏走 --dsw-specific-input-major / --dsw-alias-bg-*，
   不消费本令牌（实测改后三者计算值不变），故只动浮层底，不波及内容区。
   暗色侧用 ZCode --color-menu 实测值 #2b2b2b（不是宿主的 #43454a73）。 */
html body{--dsw-menu-surface-fill:#fff;--dsw-menu-backdrop-filter:none}
/* 暗色必须写在 **body 自己**身上，不能写 html .theme-zai-dark：后者把变量设在 html，
   而 body 已由上面那条在自身声明了 #fff —— 子元素自声明优先于继承，深色会静默失效。
   故三种暗色标记都映射到 html body 前缀（特异性 (0,1,2) 压过 (0,0,2)）：
   ① body[data-ds-dark-theme] ← **DSH 的实际机制**（属性值无关、存在即暗）
   ② body.theme-zai-dark     ← 兜底：主题类若挂在 body 上
   ③ html.theme-zai-dark body← 兜底：主题类若挂在 html 上
   实测（9223）：DSH 由宿主 JS 持续把 html 的 class 改写回 theme-zai-light/-dark，
   外部无法维持 html.theme-zai-dark（设上去 150ms 内就被改回），故 ③ 在当前版本
   不会命中；保留它零成本，宿主换实现时才用得上。真正生效的是 ①。 */
html body[data-ds-dark-theme],
html body.theme-zai-dark,
html.theme-zai-dark body{--dsw-menu-surface-fill:#2b2b2b;--dsw-menu-backdrop-filter:none}
/* 层次第二件：描边 + 阴影。宿主浮层用 --dsw-elevation-stroke（0.5px 环，6%）
   拼 --dsw-elevation-prominent（4%/5% 两层）。ZCode 是 1px 环 10% + shadow-md。
   只挂在浮层壳类（_surface_ri079，宿主浮层基元，实测仅菜单/浮层使用）上，
   不改全局 —— 全局会把对话框、tooltip、图片预览的 elevation 一并换掉。 */
[class*="_surface_ri079"]{
  --dsw-elevation-stroke:0 0 0 1px var(--dcu-tip-border);
  --dsw-elevation-prominent:var(--dsw-elevation-stroke),var(--dcu-tip-shadow);
}
@keyframes dcu-ctx-menu-in{from{opacity:0;transform:translateY(-8px) scale(.95)}}
.dcu-ctx-menu.dcu-ctx-menu{min-width:176px;animation:dcu-ctx-menu-in var(--dcu-tw-anim-duration,100ms) ease}
.dcu-ctx-menu.dcu-ctx-menu>[role=presentation]{gap:2px}
.dcu-ctx-menu [role=separator]{height:1px;margin:4px -4px}
.dcu-ctx-menu button[role=menuitem]{gap:8px;padding:4px 8px;border-radius:var(--dsw-radius-md);font-size:var(--dsw-font-size-base);line-height:1.625}
.dcu-ctx-menu [class*=_itemIcon]{width:16px;height:16px}
.dcu-ctx-menu [class*=_itemIcon] svg{width:16px;height:16px}
.dcu-ctx-menu button[role=menuitem]:hover:not(:disabled),
.dcu-ctx-menu button[role=menuitem]:focus-visible:not(:disabled){background:var(--dsw-specific-menu-item-hover)}
.dcu-ctx-menu button[role=menuitem]:disabled{opacity:1;pointer-events:none;color:var(--dsw-alias-label-dimmed);cursor:default}
.dcu-ctx-menu button[role=menuitem][class*=_danger]:hover:not(:disabled),
.dcu-ctx-menu button[role=menuitem][class*=_danger]:focus-visible:not(:disabled){background:var(--dsw-alias-state-error-primary);color:#fff}
.dcu-ctx-menu button[role=menuitem][class*=_danger]:hover:not(:disabled) [class*=_itemIcon],
.dcu-ctx-menu button[role=menuitem][class*=_danger]:focus-visible:not(:disabled) [class*=_itemIcon]{color:#fff}

/* ── 滚动条：全局基座补齐 + 自动隐藏状态机（night2 surface-6 M1/M4/M5）────────────
   M1：thumb 最小长度 32px（ZCode 全局基座 css@445006–445362：min-width/height:32px；
   轨道 14px / 透明边 3px 已由 zcode-tokens.ts 的 --dsh-scrollbar-* 落值）。
   M4：按压/拖拽态 45%（ZCode :active fallback #40404073 / 45% mix；宿主 scrollbar.css 无 :active）。
   M5：自动隐藏 = 静息透明 → 滚动显形（alias bg 档）→ 1s 空闲熄灭；hover/dragging 由
   scrollbar-autohide.ts 挂属性驱动，颜色引 alias 档随主题自动翻转，拖拽 45% 用
   color-mix(foreground 45%)（ZCode @supports 形态）。总闸 html[data-dcu-scrollbar-autohide]：
   模块不在场时一切规则失效，滚动条回落宿主常显默认（无「滚动条永久消失」失败态）。
   需求 @property 注册 <color>：WAAPI 对未注册自定义属性只能离散切换，无法 200ms 渐变。 */
::-webkit-scrollbar-thumb{min-width:32px;min-height:32px}
@property --dsh-scrollbar-thumb{syntax:'<color>';inherits:true;initial-value:#0000}
::-webkit-scrollbar-thumb:active{background-color:rgba(64,64,64,.45)}
body[data-ds-dark-theme] ::-webkit-scrollbar-thumb:active,.theme-zai-dark ::-webkit-scrollbar-thumb:active{background-color:rgba(212,212,212,.45)}
html[data-dcu-scrollbar-autohide] [data-conversation-scroll]{--dsh-scrollbar-thumb:transparent;scrollbar-color:auto}
html[data-dcu-scrollbar-autohide] [data-conversation-scroll][data-dcu-scrollbar-active],
html[data-dcu-scrollbar-autohide] [data-conversation-scroll] [data-dcu-scrollbar-active]{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l1)}
html[data-dcu-scrollbar-autohide] [data-conversation-scroll][data-dcu-scrollbar-hover],
html[data-dcu-scrollbar-autohide] [data-conversation-scroll] [data-dcu-scrollbar-hover]{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-hover-l1)}
html[data-dcu-scrollbar-autohide] [data-conversation-scroll][data-dcu-scrollbar-dragging],
html[data-dcu-scrollbar-autohide] [data-conversation-scroll] [data-dcu-scrollbar-dragging]{--dsh-scrollbar-thumb:color-mix(in oklab,var(--dsw-alias-label-primary) 45%,transparent)}

/* night2 surface-5 M7：空置顶从「纯文字提示」升级为 ZCode 官方空容器形态——虚线落区按钮
   （Jxt：h-8 / rounded-lg / border-dashed / hover 换 border-hover+surface-hover+foreground /
   reduced-motion 停过渡）。只作用于置顶空；分组/项目的树根空态仍是纯文字行（M3/M4）。
   落在主题层的原因：CodexWorkspaceBrowser.tsx 是全仓最大文件且行数棘轮顶满（1136），本块
   无法再行内安家。两处对报告的保留（均为外部约束）：① 文案仍走 workspace.pinnedEmpty、
   仍是无焦点 div——tests/settings-integration 断言钉死该键与结构，且 div 在 role=tree 内，
   可聚焦非 treeitem 元素违反 tree-keyboard.ts 契约（focus-visible 段不落，另属 surface-7 #5
   deviation 域）；② hover 边框用宿主 border-l4 档（16%）近似 ZCode border-hover（15%），
   过渡走 feedback 令牌（同 duration-150 档，曲线用仓内 canonical hover 曲线，不另造档）。 */
.dcu-wb-pinned-list>.dcu-wb-empty{display:flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;width:100%;height:32px;border:1px dashed var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);padding:8px;text-align:center;cursor:default;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),border-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-wb-pinned-list>.dcu-wb-empty:hover{border-color:var(--dsw-alias-border-l4);background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
/* night3 surface-5 M7 补齐：Jxt 结构里的图标（§1.2：Plus 系 size-3.5=14px + shrink-0 + gap-1.5=6px，
   js@2353088），DOM 侧 CodexWorkspaceBrowser.tsx 置顶空态已内联 <Plus size={14}/>。 */
.dcu-wb-pinned-list>.dcu-wb-empty svg{width:14px;height:14px;flex:none}
@media (prefers-reduced-motion:reduce){.dcu-wb-pinned-list>.dcu-wb-empty{transition:none}}

/* night2 surface-9 M1：待处理胶囊底。ZCode 注意徽章 = bg-success/14 dark:bg-success/18
   （--color-success #1e8a3e/#46bf72 的 oklab 混透明，编译 CSS css@128104/310184）；
   百分比分明暗，消费方样式表是静态串，故在主题层出令牌。文字档沿用
   --dcu-state-success-text（亮 #176c31 ≥4.82:1 / 暗 #46bf72 ≥6.04:1，见上方状态色段的实测）。 */
:root{--dcu-pending-pill-bg:color-mix(in oklab,var(--dsw-alias-state-success-primary,#1e8a3e) 14%,transparent)}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-pending-pill-bg:color-mix(in oklab,var(--dsw-alias-state-success-primary,#46bf72) 18%,transparent)}
/* night2 surface-10 M1：表格行悬停。ZCode tr = hover:bg-hover/20 —— --color-hover 亮
   var(--color-neutral-200)=#e5e5e5 / 暗 var(--color-surface-hover)=#ffffff1a（css@16230/417146/417805），
   再混 20%：亮 = rgba(229,229,229,.2)（编译 fallback #e5e5e533）、暗 = 白 2%（10%×20%）。
   过渡 = ZCode transition-colors（150ms 默认曲线 = 本仓 feedback 档），在 conversation-layout.ts 消费。 */
:root{--dcu-table-row-hover:rgba(229,229,229,.2)}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-table-row-hover:rgba(255,255,255,.02)}
/* night2 surface-12 M1：确认弹窗 destructive 确认钮前景。ZCode confirmVariant:'destructive'
   23/23 一律实心 destructive + 白字；配方对齐 archive-confirm.ts:42 的真机验收档
   (#e03131/#ff5c5c 底 + 白字，不分明暗)。落在主题层真值源：消费方 CodexWorkspaceBrowser.tsx
   的样式表过不了 design-system 颜色字面量扫描（主题层豁免，同 :401 危险行白字先例）。 */
:root{--dcu-state-error-foreground:#fff}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-state-error-foreground:#fff}
/* night2 surface-11 M3：设置导航分组标签 = ZCode text-remote-foreground-muted 专用档
   （styles.css .theme-zai-light/dark 亲读两值；on 导航底实算 6.60:1 / 8.63:1，双档过 AA）。
   不复用 --sp-muted（那是侧栏 secondary 档，M3 复核：分组标签在 ZCode 用的是独立档）。 */
:root{--dcu-settings-group-label:#595959}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-settings-group-label:#b3b3b3}
`

/**
 * 把主题样式表挂到 `document.head`。
 *
 * 此前这份样式表由 `CodexSidebar.tsx` 用 `<style>{ZCODE_THEME_STYLE}</style>` 注入，
 * 于是**主题层的生命周期被侧栏组件绑架**：侧栏不挂载时，`:root` 上的动效令牌
 * （`--dcu-motion-*`）与 `--dcu-primary` 都不存在，而消费它们的并不只有侧栏——
 * `TurnNavigator` 与 `conversation-header` 在会话区，`settings-page` 是 portal 到 body 的。
 * 那两处会静默退化成"没有过渡"，且没有任何报错。
 *
 * 主题是**应用级**的东西，应当与 `installSkin()` 同层注册（见 `index.ts` 的 `ctx.effect`）。
 * 用标记属性保证幂等：重复调用不会插入第二份样式表。
 *
 * @returns dispose 函数（移除本插件插入的那份样式表）。
 */
export function installThemeStyle(): () => void {
  if (typeof document === 'undefined') return () => {}
  const TAG_ID = 'dsh-zcode-ui-theme'
  let tag = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${TAG_ID}"]`)
  if (tag === null) {
    tag = document.createElement('style')
    tag.setAttribute('data-plugin-css', TAG_ID)
    // 主题层 + 皮肤信封：后者让进入我们地盘的外来内容自动继承皮肤字体与盒模型，
    // 不枚举类名（见 skin-envelope.ts 的分寸说明）。
    tag.textContent = ZCODE_THEME_STYLE + '\n' + SKIN_ENVELOPE_STYLE
    document.head.appendChild(tag)
  }
  return () => {
    tag?.remove()
  }
}

/**
 * 把宿主暗色属性镜像为 ZCode 的 theme-zai-* class。
 * 返回 dispose；宿主用 MutationObserver 监听 body 属性。
 * 宿主属性是已解析主题的唯一真源（宿主自身处于 system 档时也由宿主解析后再落属性），
 * 不读 prefers-color-scheme——否则宿主显式浅色 + 系统深色时侧栏会被误判成暗色，与内容区撕裂。
 */
export function syncZCodeTheme(): () => void {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const body = document.body

  const resolveZai = (): 'zai-light' | 'zai-dark' => {
    const hostDark = body?.hasAttribute?.('data-ds-dark-theme') === true
      || root.hasAttribute('data-ds-dark-theme') === true
    return hostDark ? 'zai-dark' : 'zai-light'
  }
  const apply = (): void => {
    const theme = resolveZai()
    root.classList.toggle('theme-zai-light', theme === 'zai-light')
    root.classList.toggle('theme-zai-dark', theme === 'zai-dark')
    root.classList.toggle('dark', theme === 'zai-dark')
  }
  apply()

  const observer = new MutationObserver(apply)
  if (body !== undefined && body !== null) {
    observer.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  }
  observer.observe(root, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class'] })
  return () => {
    observer.disconnect()
  }
}
