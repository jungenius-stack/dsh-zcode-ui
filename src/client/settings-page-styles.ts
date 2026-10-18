/**
 * Codex 设置页的局部 tokens 与布局，不覆盖宿主其他弹窗。
 *
 * ── -sp-* 令牌收归（2026-10-14）──────────────────────────────────────────────
 * 背景：KNOWN-ISSUES §22.3 登记的「两套并行命名空间」。逐项核对后确认，
 * 其中 6 个在明暗两套下的**计算值都与宿主语义令牌逐一相等**（用真实 Chromium 比对过
 * computed value，见交付说明），即它们只是宿主令牌的复制品。复制品会漂移——
 * 改宿主色板时设置页不会跟着变。现改为引用宿主令牌，零视觉变更、单一真源：
 *   -sp-bg        -> --dsw-alias-bg-base
 *   -sp-card      -> --dsw-alias-settings-card-fill
 *   -sp-border    -> --dsw-alias-border-l2
 *   -sp-text      -> --dsw-alias-label-primary
 *   -sp-hover     -> --dsw-alias-interactive-bg-hover
 *   -sp-active    -> --dcu-sidebar-selected
 *
 * 两个例外保留为字面量，并注明**为什么令牌化不了**（而不是「暂时懒得改」）：
 *   -sp-muted：亮色要 #6b6b6b（等于 static-400），但暗色要 #8f8f8f，
 *     而 #8f8f8f 在暗色主题下**没有任何令牌等于它**——静态色阶在明暗之间是**反向**的
 *     （static-500 亮色是 #8f8f8f、暗色却是 #5c5c5c），按档位号引用会拿到相反的值。
 *   -sp-muted-on-card：亮色同样 #6b6b6b；暗色 #9a9a9a 等于暗色下的 static-300，
 *     但亮色下 static-300 是 #545454，一个令牌覆盖不了两套。
 * 强行令牌化必然改变暗色外观，故保留字面量。这两档的对比度取值理由见下。
 *
 * --sp-muted 与 --sp-muted-on-card 必须分开（2026-10-14）：同一处文字落在两种底色上，
 * 而「色阶必须按实际所在底色取值」是本仓的既定制度（docs/ZCODE-DESIGN.md §9.3）。
 * 此前搜索框的图标与占位符直接用 --sp-muted，而它的底是 --sp-card——
 * 暗色下 #8f8f8f on #2b2b2b 实测 4.38:1，低于 WCAG AA 的 4.5:1。
 * 卡片档：亮 #6b6b6b（5.33:1 on #fff）/ 暗 #9a9a9a（5.03:1 on #2b2b2b）。
 *
 * var(--dcu-*) 的回退值是**兜底**，必须与 zcode-theme.ts 的真值一致——
 * 曾经这里留着修复前的 #777777（3.93:1，§9.2 已判定不达标），一旦变量作用域缺失
 * 就会静默退回不达标状态，且没有任何报错。
 *
 * ⚠️ 本文件头注释里**不得出现反引号**：多个布局脚本用 indexOf 定位第一个反引号
 * 来切样式表（另一些改用变量名正则）。文件头一旦有反引号，切片会从注释开始，
 * 把 CSS 切碎——2026-10-14 已因此让 verify-settings-backdrop /
 * verify-settings-geometry 量到错误宽度而假失败。
 */
export const settingsPageStyles = `
.dcu-settings-page{--sp-bg:var(--dsw-alias-bg-base);--sp-nav:var(--dcu-sidebar-background,#f0f0f0);--sp-card:var(--dsw-alias-settings-card-fill);--sp-border:var(--dsw-alias-border-l2);--sp-text:var(--dsw-alias-label-primary);--sp-muted:#6b6b6b;--sp-muted-on-card:#6b6b6b;--sp-hover:var(--dsw-alias-interactive-bg-hover);--sp-active:var(--dcu-sidebar-selected);position:fixed;inset:0;z-index:1000;display:grid;grid-template-columns:clamp(240px,var(--dcu-sidebar-expanded-width,240px),min(520px,calc(100vw - 320px))) minmax(0,1fr);background:var(--sp-bg);color:var(--sp-text);font:14px/1.5 var(--dsw-font-family);text-align:left;isolation:isolate}
body[data-ds-dark-theme] .dcu-settings-page{--sp-muted:#8f8f8f;--sp-muted-on-card:#9a9a9a;color-scheme:dark}
.dcu-settings-page *{box-sizing:border-box}
.dcu-settings-page button,.dcu-settings-page input{font:inherit}
.dcu-settings-page button{cursor:pointer}
.dcu-settings-page :focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px}
.dcu-settings-nav{--sp-text:var(--dcu-sidebar-navigation,#262626);--sp-muted:var(--dcu-sidebar-secondary,#5c5c5c);--sp-hover:var(--dcu-sidebar-hover,rgba(13,13,13,.05));--sp-active:var(--dcu-sidebar-selected,rgba(13,13,13,.05));--sp-border:var(--dcu-sidebar-border,rgba(13,13,13,.1));display:flex;flex-direction:column;min-height:0;padding:18px 8px;background:var(--sp-nav);box-shadow:inset -1px 0 var(--sp-border);overflow-y:auto}
/* macOS 普通窗口的原生按钮覆盖 Web 内容；沿用宿主标题栏安全区，仅抬高设置导航。 */
html[data-platform=darwin]:not([data-fullscreen]) .dcu-settings-nav{padding-top:calc(var(--dsh-frame-top-clearance,48px) + 8px)}
body[data-ds-dark-theme] .dcu-settings-nav{--sp-text:var(--dcu-sidebar-navigation,#d4d4d4);--sp-muted:var(--dcu-sidebar-secondary,#888888);--sp-hover:var(--dcu-sidebar-hover,rgba(255,255,255,.05));--sp-active:var(--dcu-sidebar-selected,rgba(255,255,255,.1));--sp-border:var(--dcu-sidebar-border,rgba(255,255,255,.1))}
.dcu-settings-back{display:flex;align-items:center;flex-shrink:0;gap:8px;width:100%;height:32px;padding:0 8px;border:0;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--sp-text);text-align:left;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-settings-back:hover,.dcu-settings-link:hover{background:var(--sp-hover)}
.dcu-settings-search{display:flex;align-items:center;gap:8px;padding:var(--dcu-space-2);margin:var(--dcu-space-3) 0 var(--dcu-space-4);background:var(--sp-card,#fff);border:1px solid var(--sp-border);border-radius:var(--dsw-radius-lg);color:var(--sp-muted-on-card)}
.dcu-settings-search:focus-within{border-color:var(--dcu-focus,#0b7fff)}
.dcu-settings-search input{width:100%;min-width:0;border:0;background:transparent;color:var(--sp-text);outline:none;font-size:var(--dsw-font-size-caption)}
.dcu-settings-search input[type=search]{appearance:none;padding:0;border-radius:0;box-shadow:none;line-height:20px}
.dcu-settings-search input:focus,.dcu-settings-search input:focus-visible{outline:none;box-shadow:none}
.dcu-settings-search input::placeholder{color:var(--sp-muted-on-card)}
.dcu-settings-group{flex-shrink:0;margin:0 0 16px}
.dcu-settings-group-label{margin:0 8px 4px;color:var(--sp-muted);font-size:var(--dsw-font-size-sm);font-weight:500}
.dcu-settings-link{display:flex;align-items:center;gap:8px;height:32px;min-height:32px;min-width:0;width:100%;padding:0 8px;border:0;border-radius:var(--dsw-radius-lg);overflow:hidden;background:transparent;color:var(--sp-text);text-align:left;font-size:var(--dsw-font-size-base)!important;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
/* Codex Desktop SidebarItem / SidebarSection：30px 行高、1px 行距、内收焦点圈。 */
.dcu-settings-link+.dcu-settings-link{margin-top:1px}
.dcu-settings-back:focus-visible,.dcu-settings-link:focus-visible{outline-offset:-2px}
.dcu-settings-link[aria-current=page]{background:var(--sp-active)}
.dcu-settings-link svg{flex:none;color:var(--dcu-sidebar-icon,var(--sp-text));opacity:1}
.dcu-settings-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcu-settings-empty{padding:8px;color:var(--sp-muted);font-size:var(--dsw-font-size-caption)}
.dcu-settings-main{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--sp-bg);scrollbar-width:thin;scrollbar-color:var(--sp-border) transparent}
.dcu-settings-inner{width:min(100%,864px);margin:0 auto;padding:48px 48px}
/* 模型 Pro 的多列表格按主栏宽度伸展；其他设置页仍保持易读的常规宽度。 */
.dcu-settings-inner[data-settings-section=dsh-model-pro]{width:100%}
.dcu-settings-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}
.dcu-settings-heading h1,.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>h2:is([class$="_title"],[class$="_heading"]){margin:0;font-size:var(--dsw-font-size-xl);line-height:26px;font-weight:600;letter-spacing:-.2px}
.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>p[class$="_intro"]{margin:0;font-size:var(--dsw-font-size-base);line-height:22px}
.dcu-settings-heading[data-own-title=false]{justify-content:flex-end;margin-bottom:16px}
.dcu-settings-heading:not(:has(h1,button,a,[role=button])){display:none}
.dcu-settings-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;color:var(--sp-muted)}
.dcu-settings-actions button{font-size:var(--dsw-font-size-sm)}
.dcu-settings-general-group{margin-bottom:44px}
.dcu-settings-general-group h2{margin:0 0 16px;font-size:var(--dsw-font-size-base);font-weight:600;color:var(--sp-text)}
.dcu-settings-card{border:1px solid var(--sp-border);border-radius:var(--dsw-radius-xl);background:var(--sp-card);padding:0 16px;overflow:hidden}
.dcu-settings-row+.dcu-settings-row{border-top:1px solid var(--sp-border)}
.dcu-settings-row>[data-slot]{display:contents}
.dcu-settings-row>[data-slot]>*{padding:12px 0!important;border-bottom:0!important;margin:0!important;min-width:0}
.dcu-settings-row button{font-size:var(--dsw-font-size-caption);border-radius:var(--dsw-radius-lg)}
.dcu-settings-row input{max-width:100%}
.dcu-settings-document{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;font-size:var(--dsw-font-size-base);line-height:20px}
.dcu-settings-developer-tools{display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%;padding:12px 0;font-size:var(--dsw-font-size-base);line-height:20px}
.dcu-settings-developer-tools-copy{min-width:0}
.dcu-settings-developer-tools-title{font-size:var(--dsw-font-size-base);line-height:20px;font-weight:400;color:var(--sp-text)}
.dcu-settings-developer-tools-description{margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--sp-muted)}
/* 2026-10-18（设计审计 P0-3）：原为字面量 #f87171 —— 亮色档 on #f8f8f8 只有 2.60:1
   （AA 需 4.5），且是全仓唯一没走令牌的错误文字色。改为语义令牌后亮 6.15:1 / 暗 5.98:1。
   令牌挂在 :root（不是侧栏作用域），设置页 portal 到 body 也能取到 —— 同 zcode-theme.ts 的说明。 */
.dcu-settings-developer-tools-error{margin-top:4px;font-size:var(--dsw-font-size-caption);line-height:18px;color:var(--dcu-state-error-text)}
.dcu-settings-switch{box-sizing:border-box;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;border:0;border-radius:999px;background:color-mix(in srgb,var(--dcu-primary,#000) 30%,transparent);cursor:pointer;outline:none}
.dcu-settings-switch:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}
.dcu-settings-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary,#000)}
.dcu-settings-switch:disabled{cursor:default;opacity:.5}
.dcu-settings-switch-thumb{display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);box-shadow:0 1px 2px rgba(0,0,0,.15);transition:transform var(--dcu-motion-feedback-duration) ease;pointer-events:none}
.dcu-settings-switch[aria-checked=true] .dcu-settings-switch-thumb{background:var(--dsw-alias-label-primary-foreground,#fff);transform:translateX(16px)}
.dcu-settings-document-copy{min-width:0}
.dcu-settings-document p{margin:4px 0 0;font-size:var(--dsw-font-size-sm);color:var(--sp-muted);overflow-wrap:anywhere}
.dcu-settings-document button{flex:none;min-height:32px;padding:6px var(--dcu-space-3);border:0;border-radius:var(--dsw-radius-lg);background:var(--sp-hover);color:var(--sp-text);font:inherit;font-size:var(--dsw-font-size-caption);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-settings-document button:hover:not(:disabled){background:color-mix(in srgb,var(--sp-text) 14%,transparent)}
.dcu-settings-document button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:3px}
.dcu-settings-document button:disabled{opacity:.55;cursor:wait}
.dcu-settings-trigger{appearance:none;box-sizing:border-box;display:flex;align-items:center;border:0;border-radius:var(--dsw-radius-lg);background:transparent;color:var(--dcu-sidebar-navigation,inherit);height:36px;min-height:36px;padding:0 4px;width:100%;font:400 14px/20px var(--dsw-font-family);text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
.dcu-settings-trigger-content{display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-width:0}
.dcu-settings-trigger-content svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon,currentColor);transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
.dcu-settings-trigger:hover{background:var(--dcu-sidebar-hover,rgba(127,127,127,.12));color:var(--dcu-sidebar-primary,inherit)}
.dcu-settings-trigger:hover svg{transform:rotate(18deg)}
.dcu-settings-trigger:active{transform:scale(.98)}
.dcu-settings-trigger:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px;background:var(--dcu-sidebar-hover,rgba(127,127,127,.12))}
.dcu-settings-trigger[data-wide=false]{justify-content:center;width:36px;padding:0!important}
.dcu-settings-trigger[data-wide=false] .dcu-settings-trigger-content{grid-template-columns:16px;justify-content:center}
.dcu-settings-page{animation:dcu-settings-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-nav{animation:dcu-settings-nav-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-inner{animation:dcu-settings-content-enter var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-settings-back,.dcu-settings-link{transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
@keyframes dcu-settings-enter{from{opacity:0}to{opacity:1}}
@keyframes dcu-settings-nav-enter{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes dcu-settings-content-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* 只有 Desktop 明确提供系统背景材质时才贯通透明层，普通浏览器保持实色。 */
html[data-dsh-native-backdrop=mica]:has(.dcu-root),html[data-dsh-native-backdrop=mica]:has(.dcu-root) body,html[data-dsh-native-backdrop=mica] #root,html[data-dsh-native-backdrop=mica] #root>[data-slot=root],html[data-dsh-native-backdrop=mica] #root>[data-slot=root]>div{background:transparent!important}
html[data-dsh-native-backdrop=mica] #root>[data-slot=root]>div>div:has(>[data-slot=sidebar]){background:transparent!important}
html[data-dsh-native-backdrop=mica] #root :is([class$="_centerCol"],[class$="_detailsCol"]){background:var(--dsw-alias-bg-base,#fff)}
html[data-dsh-native-backdrop=mica] :is(.dcu-root,.dcu-settings-nav){background:rgba(255,255,255,.18)}
html[data-dsh-native-backdrop=mica] body[data-ds-dark-theme] :is(.dcu-root,.dcu-settings-nav){background:rgba(20,23,22,.18)}
/* 会话折叠容器显式设了 visible，必须同时隐藏隔离分支的后代，避免穿透透明设置页。 */
html[data-dsh-native-backdrop=mica] body:has(.dcu-settings-page) .dcu-root :is([inert],[inert] *){visibility:hidden!important}
/* 同步隐藏本设置页隔离的外部 portal，保留引导模态及其他组件自己的 inert 语义。 */
body:has(.dcu-settings-page) :is([data-dcu-settings-isolated],[data-dcu-settings-isolated] *){visibility:hidden!important}
body:has(.dcu-settings-page) > [role=alert]{visibility:visible!important}
html[data-dsh-native-backdrop=mica] .dcu-settings-page,html[data-dsh-native-backdrop=mica] body:has(.dcu-settings-page) .dcu-root{background:transparent}

.dcu-plugin-config [data-plugin-panel]{height:auto;padding:0;overflow:visible;align-items:stretch;gap:24px}
.dcu-plugin-config [data-plugin-panel]>*{max-width:none}
.dcu-plugin-config [data-plugin-panel]>header :is(h1,p){display:none}
.dcu-plugin-config [data-plugin-panel]>header{justify-content:flex-end}
@media(prefers-reduced-motion:reduce){.dcu-settings-trigger,.dcu-settings-trigger-content svg,.dcu-settings-back,.dcu-settings-link{transition:none}.dcu-settings-trigger:hover svg,.dcu-settings-trigger:active{transform:none}.dcu-settings-page,.dcu-settings-nav,.dcu-settings-inner{animation:none}}
.dcu-settings-page [data-slot="settings.section"]{min-width:0}
.dcu-settings-inner:has(.dcu-connector-frame){height:100%;display:flex;flex-direction:column}
.dcu-settings-inner:has(.dcu-connector-frame)>.dcu-settings-heading{flex:none}
.dcu-settings-page .dcu-connectors:has(>.dcu-connector-frame){display:flex;flex-direction:column;flex:1 1 0;min-height:0}
.dcu-settings-page .dcu-connector-frame{flex:1 1 0;min-height:0;height:100%}

@media(max-width:900px){.dcu-settings-inner{padding:32px 28px}.dcu-settings-heading{align-items:flex-start;flex-direction:column;gap:12px}}
@media(max-width:600px){.dcu-settings-page{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.dcu-settings-nav{padding:8px 12px;max-height:220px;border-right:0;border-bottom:1px solid var(--sp-border)}.dcu-settings-search{margin:6px 0}.dcu-settings-groups{display:flex;gap:8px;overflow-x:auto;flex:none}.dcu-settings-group{display:flex;gap:4px;margin:0;flex:none}.dcu-settings-group-label{display:none}.dcu-settings-link{width:auto;min-height:40px;flex:none}.dcu-settings-link+.dcu-settings-link{margin-top:0}.dcu-settings-inner{padding:32px 16px}.dcu-settings-heading{margin-bottom:28px}.dcu-settings-heading h1,.dcu-settings-inner:is([data-settings-section=models],[data-settings-section=plugins],[data-settings-section=agent-presets]) [class$="_section"]>h2:is([class$="_title"],[class$="_heading"]){font-size:var(--dsw-font-size-headline)}.dcu-settings-card{padding:0 12px}.dcu-settings-row>[data-slot]>*{flex-wrap:wrap;gap:12px!important}.dcu-settings-general-group{margin-bottom:32px}}
`
