# gapfill-3 · 批次补采 3（sidebar-width.ts 五条「无参照」项复挖）

> 2026-10-30 夜间审计补采批次 3（只读，仅新建本文件）。对象：批次审计中因「查不到 ZCode 参照」跳过的 5 条，模块 `src/client/sidebar-width.ts`（条目行号：17 / 347-350 / 694 / 754 / 766，TurnNavigator.tsx:141-142 同式）。
> 方法：对每条先推断 ZCode 侧载体（tailwind 类、CSS 变量、localStorage/sessionStorage 键、i18n 键、组件 className），在 app.asar（341,377,861 B）中用 `grep -a`（实际为 ugrep，语法兼容）检索；区间量词超 ugrep 复杂度限制处改用 python mmap + `re.finditer` 抓字节上下文（偏移以 `@` 标注）；同步复读 `03-turn-navigator.md`、`03b-sidebar.md` 未引用段落。
> 本轮实跑命令清单（`A=/Applications/ZCode.app/Contents/Resources/app.asar`）：
> - `grep -a -o 'w-14\b' $A | wc -l` → **11**（上批只搜了任意值写法 `w-\[56px\]`，漏了 tailwind 标准类 w-14 = 3.5rem = 56px）
> - `grep -a -o '.\{100\}w-14\b.\{100\}' $A` → 上下文逐条核验（见条目 1）
> - `grep -a -c 'data-collapsible' $A` → **0**；`grep -a -o 'collapsedWidth\|collapsed-width\|\[data-collapsible' $A` → collapsedWidth ×12
> - `grep -a -o -i '.\{50\}sidebar[a-zA-Z-]\{0,12\}collapsed.\{70\}' $A` → **0**
> - `grep -a -o '.\{60\}sidebarWidth.\{80\}' $A` → **0**；`grep -a -o '.\{60\}sidebar-width.\{80\}' $A` → 命中 `--sidebar-width:250px`（内嵌静态页 ×2）与 `zcode:workspace-shell:sidebar-width-px` 段
> - `grep -a -o -c 'transitionend' $A` → **31**；`animationend` → **27**（上下文逐条核验，见条目 4）
> - python mmap 定点提取：`zcode:workspace-shell:sidebar-width-px` ±500/700、shell 段 332186000–332260000 内 `CBn(`/`SBn(`/`L5`/`pBn`/`TBn(`/`mBn,`/`fn}px`/`transition`/`collapsible`/`=56`/`performance.now`/`prefers-reduced-motion`/`!pn`；全局 `JXrxFq`、`prefers-reduced-motion`、`zcode:workspace-shell:` 键枚举
> - 仓库内核对：`TurnNavigator.tsx:141-142` `Math.round(tracks.sidebar) + 16`、fallback `.dcu-root` rect.right + 16 / 常量 288

---

## 条目 1 · 收起轨宽 56px（CODEX_SIDEBAR_RAIL_PX，sidebar-width.ts:17）——**升级：有参照（对照物实证，结构不同）**

**原跳过理由**：asar grep `SidebarCollapsed|sidebar-collapsed|w-\[56px\]` 均 0 命中；zcode-drag-limits.json 未测收起态；「ZCode 是否存在收起轨无例证」。

**本轮搜索过的模式**（全部实跑）：
1. `w-\[56px\]`（上批）→ 0；`w-14\b`（tailwind 标准类 = 14×4px = 56px）→ **11**：
   - 1 处为 tailwind 基类定义：`.w-14{width:calc(var(--spacing) * 14)}`
   - 其余 10 处使用全部与侧栏无关：`h-7 max-w-14`（按钮 truncate）、`min-w-14`（codeBlock.mermaid.zoomLevel 钮）、logo 动画 svg `h-auto w-14`、骨架屏 `h-52 w-14 shrink-0` ×2、schedule 分钟钮 `h-auto w-14 rounded-full`、`browser.responsive.width/height` 输入框 ×2
2. `data-collapsible`（shadcn icon-rail 模式的标志属性）→ **0**
3. `collapsedWidth` / `collapsed-width` → collapsedWidth ×12，上下文全部是字体排版测量（`const collapsedWidth = Math.max(0, joinedWidth - compactWidth)`，文本宽度收缩量），非侧栏
4. `-i 'sidebar[a-zA-Z-]{0,12}collapsed'` 组合 → **0**
5. shell 段内 `collapsible` → **0**（侧栏 panel 未用 react-resizable-panels 的 collapsible）；`=56` → **0**
6. `collapse-navigation-once` → 1（见下，归属 web 远程控制导航面板，非主侧栏）

**命中原文**（ZCode 主侧栏的收起态实证，workspace-shell 模块）：
- @332215653 侧栏面板 className：`w-[var(--workspace-sidebar-panel-width)] max-w-[50%] flex-none overflow-hidden duration-200 ease-out transition-[width,opacity] data-[workspace-sidebar-resizing=true]:transition-opacity`
- @332191850 隐藏态宽度常量：`fn=sn?V?6:4:0`（`sn=ee||V||an` 为桌面任一平台、`V`=windows、`an`=linux）→ **mac/Linux 4px / Windows 6px / web 0px**
- @332195430 写入点：`t.style.setProperty(mBn, \`${cr?e:fn}px\`)`（mBn=`--workspace-sidebar-panel-width`，`cr=ye`=isSidebarVisible，@332193740）；@332199944 同式 `"--workspace-sidebar-panel-width":\`${cr?Wn:fn}px\``，恒定项 `"--workspace-sidebar-width":\`${Wn}px\`` 另有 `"--workspace-resize-handle-inset":\`${dn}px\``
- 收起入口：@332254757 命令面板 `toggleSidebar:()=>An(tt)`；@331026873 i18n 键 `workspaceSidebar.toggleSidebar`（`onToggleSidebar:x`，顶栏 overlay `paddingLeft:${Math.round(a??96)}px` 随侧栏宽偏移）；@332242855 快捷键标签 `hk('toggleSidebar')`
- 归属厘清：`zcode:web-remote-control:collapse-navigation-once`（sessionStorage，`TBn()`/`EBn()` @332187442）是 **web 远程控制导航面板**的一次性收起标志——@332221288 `aria-controls:"web-remote-control-navigation-panel"`、`aria-label: pn?'webRemoteControl.expandNavigation':'webRemoteControl.collapseNavigation'`，不是主侧栏

**最终判定**：ZCode **没有 56px 图标收起轨**。ZCode 的收起 = `toggleSidebar` 显示/隐藏切换：可见时 panel 宽 = 持久化宽度（264 起），隐藏时 panel 收成 **4/6/0px 细缝**（承载 resize-handle 恢复区），宽度切换带 200ms 过渡（见条目 4）。uiplug 的 `CODEX_SIDEBAR_RAIL_PX=56` 是 Codex/DSH 宿主形态；ZCode 侧「收起态几何」从此有实测对照物（4/6/0px），**56px 值在 ZCode 无依据**，对账时应记录为「两端收起模型不同：rail 56px vs 隐藏+细缝」。原「无例证」状态解除 → 计入 found（有参照、值不同）。

---

## 条目 2 · 索引栏左缘 = 侧栏轨道宽 + 16px（sidebar-width.ts:694；TurnNavigator.tsx:141-142）——**确认无参照**

**原跳过理由**：ZCode 轮次导航用不同定位模型（03-turn-navigator.md:96），明令禁用 nav 左缘做跨端锚点。

**本轮搜索过的模式**（全部实跑）：
1. 设计文档复读：`03-turn-navigator.md:96`——「跨端对比用『刻度左缘』『视口顶』等结构等价锚点，**禁止用 nav 左缘**（两端内边距不同：ZCode 48 含 12 内缩，DSH 28 无内缩——报告五坑 1 的教训）」；:42-43 C5 附注——`.JXrxFq_preview` 实际是 **`position: absolute`（相对 rail 定位）**。ZCode nav 是「会话区内固定内缩（48 含 12 内缩）」模型，结构上不存在「sidebar 宽 + 常数」的算式
2. asar 全局 `JXrxFq`（文档记录的运行时选择器前缀）→ **0 命中**（CSS-in-JS hash 类名运行时才生成，bundle 里不可检索——这是该路径的死胡同，如实记录）
3. shell 段内 16 的唯一常量 `pBn` → @332196937 消费处：`e.key==='ArrowLeft'?r=Kn.current-pBn:e.key==='ArrowRight'?r=Kn.current+pBn:e.key==='Home'?r=R5:e.key==='End'&&(r=n)`——**pBn=16 是侧栏拖拽聚焦时的键盘微调步长（±16px）**，与导航条间距无关；`Home` 回 `R5=264`（最小值）、`End` 到容器 50% 上限
4. shell 段/全局 `performance.now`、轮次相关 i18n（上批已核 `chat.*` 键族）——无 nav 定位算式痕迹

**命中原文**：无「侧栏右缘 + 16px」类定位算式；唯一 16px 常量已消歧为键盘步长（上引 @332196937）。

**最终判定**：确认无参照。ZCode 侧 nav 左缘证据仍以 CDP 实测为准（48 含 12 内缩），且设计文档明令禁用该锚点做对账；插件的 `+16` 是自绘索引栏对「侧栏轨道宽」的同步补偿（TURN_LEFT_VAR，值与 React 写入一致），ZCode 无同构结构。维持 absent。

---

## 条目 3 · 无快照恢复时退回宿主默认 280px（sidebar-width.ts:347-350，handle left=280px）——**升级：有参照（机制同构，值不同）**

**原跳过理由**：属 DSH 宿主互操作回退值，「ZCode 无对应恢复逻辑」——该说法被本轮证伪。

**本轮搜索过的模式**（全部实跑）：
1. `sidebarWidth`（camelCase）→ **0**（bundle 内标识符已混淆）
2. `sidebar-width` → 命中两组：内嵌静态页 `--sidebar-width:250px` ×2（与 workspace 无关）；**`zcode:workspace-shell:sidebar-width-px`** ×1
3. python 抓取该键 ±500/700 及 shell 段内 `SBn(`/`CBn(`/`z5(` 全部消费点

**命中原文**（ZCode 侧栏宽度持久化 + 回退链，@332186296–332195545）：
- 常量组：`lBn=264, R5=264, uBn=.5, dBn='zcode:workspace-shell:sidebar-width-px', fBn='react-resizable-panels:workspace-shell-layout:sidebar:content', pBn=16, mBn='--workspace-sidebar-panel-width', hBn='--workspace-sidebar-width', gBn=480`
- clamp：`function z5(e,t){let n=t&&t>0?Math.max(R5,t*uBn):1/0;return Math.round(Math.max(R5,Math.min(e,n)))}` → 宽度域 **[264, 容器宽×50%]**（与面板 className `max-w-[50%]` 互证，@332215653）
- 读：`SBn()` → `localStorage.getItem(dBn)`，**无值 return null**，有值经 z5 钳制
- 旧键迁移：`CBn()` → 读 `fBn`（react-resizable-panels 布局键），`sidebar` 存的是 ×100 百分比，`n/100` 换算
- **回退点（与 uiplug 条目同构）**：@332193047 `[Wn,Gn]=(0,Q.useState)(()=>SBn()??lBn)` —— **持久化键无值 → 回退默认 264**；@332195545 迁移 effect：`if(SBn()!==null)return; let e=CBn()… r=z5(n*e,n); Gn(r); B5(r)`
- 写：`B5(e)` → `localStorage.setItem(dBn, String(Math.round(e)))`；拖拽/键盘经 `Sr(e,t)` → `t.persist&&B5(r)`
- 键枚举：`zcode:workspace-shell:` 前缀全局仅此 1 键（侧栏可见状态不持久化）

**最终判定**：升级为有参照。ZCode 存在与 uiplug 同构的「无持久化宽度 → 回退宿主默认」链：uiplug 回退 Codex/DSH 宿主默认 280px（sidebar-width.ts:347-350），ZCode 回退自身默认 **264px**——264 与 sidebar-width.ts:25 注释「ZCode 实测 264（spec-final.metrics.sidebarWidth）」、03b-sidebar.md:15「宽度 ✅ 完全一致（264px）」互证。**原条目「ZCode 无对应恢复逻辑」的说法失实，应更正**；两值不同是宿主差异（280 vs 264），非机制缺失。

---

## 条目 4 · 开合动画超时兜底 duration+120ms（sidebar-width.ts:766）——**确认无参照（本轮实证）**

**原跳过理由**：内部鲁棒性定时器，ZCode 无例证。

**本轮搜索过的模式**（全部实跑）：
1. `grep -a -o -c 'transitionend' $A` → **31**；`animationend` → **27**。上下文逐条核验：radix/dialog 类 web-component 的 `addEventListener('transitionend',()=>this.focus(),{once:!0})`（focus 转移）、tooltip 定位的 `registerBinding(Y,'transitionend',S)`、`registerBinding(Y,'animationend',S)`、React DOM 事件注册表（`transitionend:ql('Transition','TransitionEnd')`）——**无一位于侧栏/workspace-shell**
2. shell 段（332186000–332260000，74KB）内 `transitionend` / `animationend` → 各 **0**
3. shell 段内 `performance.now` → **0**（无任何动画时长测量）
4. shell 段内 `transition` → 3（即下述命中）

**命中原文**：@332215653 侧栏面板 className：`duration-200 ease-out transition-[width,opacity] data-[workspace-sidebar-resizing=true]:transition-opacity`——ZCode 侧栏开合是**纯 CSS width/opacity 过渡（200ms ease-out）**，拖拽中把 width 过渡换成 opacity-only；CSS transition 的完成由浏览器管理，无 JS 超时兜底监听。

**最终判定**：确认无参照（从「未找到」升级为「实证无」）。ZCode 无对应物；顺带固化两条参照值：ZCode 开合时长 = **200ms ease-out**（与本仓 `zcode-theme.ts:137` move 档 200ms 一致，`02-motion.md` 2026-10-29 分档表的「move=侧栏开合 200ms」正是锚它）；「拖拽期间关 width 过渡」是 ZCode 原生防抖手法，可作 uiplug 拖拽路径（settleSidebarMotion）的同效对照。uiplug 的 `duration+120ms` 是 JS 驱动 transform 动画的自有鲁棒性设施，保留即可。

---

## 条目 5 · 失控跳过阈值 SKIP_ANIMATION_BLOCK_MS = duration×2（sidebar-width.ts:754）——**确认无参照（本轮实证）**

**原跳过理由**：插件自适应启发式（注释含 2026-10-19 实测依据），ZCode 无对应机制。

**本轮搜索过的模式**（全部实跑）：
1. shell 段内 `performance.now` → **0**（无阻塞时长测量，即无「按实测跳过」的原料）
2. shell 段内 `prefers-reduced-motion` → **0**
3. 全局 `prefers-reduced-motion` → **87**，抽样上下文全部为库代码/静态页：motion utilities（@18414543、@18479242 `prefersReducedMotion(window2)`）、framer-motion 系（@135860976、@136445978、@136939899 `matchMedia('(prefers-reduced-motion)')`）、内嵌说明页 CSS（@16982230）——**无一与侧栏或自定义跳过启发式相关**
4. 兼查：shell 段 `collapsible` 0、`=56` 0（排除 panel 折叠配置兜底）

**命中原文**：无（ZCode 侧栏动画路径上不存在任何「测量→跳过」守卫；唯一的条件降级是拖拽时 `data-[workspace-sidebar-resizing=true]:transition-opacity`，见条目 4）。

**最终判定**：确认无参照（从「未找到」升级为「实证无」）。ZCode 侧栏连 performance.now 都没有，「按实测阻塞 2×duration 跳过动画」纯属 uiplug 自有决策（其 2026-10-19 实测依据成立），对账时记「插件自有，无宿主参照」即可。

---

## 汇总

| # | 条目 | 判定 | 关键证据 |
|---|---|---|---|
| 1 | 收起轨 56px | **found**（有参照，结构不同） | ZCode 收起 = toggleSidebar 隐藏至 4/6/0px 细缝（fn=`sn?V?6:4:0`，`cr?Wn:fn`），无 rail；w-14×11 无一侧栏、data-collapsible 0 |
| 2 | nav 左缘 = sidebar+16 | absent | 文档明令禁用该锚点（48 含 12 内缩）；JXrxFq bundle 0；pBn=16 消歧为键盘步长 ±16px |
| 3 | 无快照退回 280px | **found**（机制同构） | `useState(()=>SBn()??lBn)`，键 `zcode:workspace-shell:sidebar-width-px` 无值回退 264；原「ZCode 无恢复逻辑」说法失实 |
| 4 | duration+120ms 兜底 | absent（实证无） | ZCode 纯 CSS `duration-200 ease-out transition-[width,opacity]`；shell 段 transitionend/animationend/performance.now 均 0 |
| 5 | SKIP_ANIMATION_BLOCK_MS=2×duration | absent（实证无） | shell 段无 performance.now/reduced-motion 守卫；全局 87 处 reduced-motion 全为库代码 |

**附带产出（供下轮对账引用）**：ZCode 侧栏宽度域 = [264, 容器×50%]（z5 + `max-w-[50%]`）；旧布局迁移源键 `react-resizable-panels:workspace-shell-layout:sidebar:content`（存 ×100 百分比）；顶栏 overlay 随侧栏宽偏移 `paddingLeft:${Math.round(a??96)}px`；`zcode:workspace-shell:` 持久化键仅 sidebar-width-px 一个。
