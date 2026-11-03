# 03 轮次导航全状态矩阵（首个完整组件范例）

> ZCode 源码：bundle 内 `ypn`（组件）/`Vst`（波值）/`Hst`（focus 合并）/`Rst`（目录提取）。
> 状态判定：✅=已对齐并有验证器；❌=缺口（见 04-open-gaps 编号）；🚫=DSH 宿主能力天花板（豁免，需标注）；❓=未测。
> 证据日期 2026-10-26，ZCode/宿主升级后需复测。

## A. 静息与主题

| # | 格 | ZCode 规格 | DSH 现状 | 判定 |
|---|---|---|---|---|
| A1 | hover 四档波 | scaleX 2.6/1.7/1.25/1，op 1/.86/.72/.58 | 全等，rAF+查表 | ✅ |
| A2 | peak 颜色 | d0 全前景色（focus tone） | 全色 | ✅ |
| A3 | 静息当前条 | op .9 + 全前景，随滚动移动（`aria-current`） | 一致（未压缩态） | ✅ |
| A4 | 刻度几何 | 12×2px、pitch 10px、origin-left、pill | 一致 | ✅ |
| A5 | 过渡 | 150ms ×(transform,opacity,background-color) | 一致 | ✅ |
| A6 | 主题 | 令牌自适应深/浅，对比度 33/37 | 一致 | ✅ |
| A7 | 运行中下限 | `Math.max(op,.72)` + `data-running` | 宿主无 running 标记（类全集 mark/markUnloaded/markActive/markPreview） | 🚫 |
| A8 | reduced-motion CSS | transition-none | 0s | ✅ |

## B. 点击与滚动

| # | 格 | ZCode 规格 | DSH 现状 | 判定 |
|---|---|---|---|---|
| B1 | 点击滚动 | 原生 smooth（Chrome 曲线） | 查表复刻同款曲线，落点正确、无闪跳 | ✅ |
| B2 | reduced-motion 点击 | `'auto'` 瞬跳 | 仍动画 1.4s | ❌ G1 |
| B3 | 落点语义 | query 行顶对齐视口顶 | 轮首距视口顶 −11px | ✅ |
| B4 | 连点 | 取消前次动画 | dirFlips=0 落对 | ✅ |
| B5 | 未加载轮 | 目录水合后跳转 | 宿主自管，落点正确 | ✅ |

## C. 浮层（tooltip）

| # | 格 | ZCode 规格 | DSH 现状 | 判定 |
|---|---|---|---|---|
| C1 | 几何 | 320px 宽、顶对齐（topDelta 0）、右侧 | 320px / 全 0 | ✅ |
| C2 | 问句段 | `line-clamp-2 font-medium` | clamp=1，无加粗 | ❌ G4 |
| C3 | 摘要段 | `line-clamp-3`，两段式 space-y-2 | clamp=3 两段式 | ✅ |
| C4 | 时延 | open 120 / close 80 | 开 ~200ms；关闭未测成 | ❓ |
| C5 | 贴边（clamp） | Radix 碰撞规避 | **已给出可复现证据，见 C5 附注** | ✅ |

### C5 附注：浮层 clamp 的可复现证据（2026-10-27 第 28 轮补）

**为什么此前抓不到**：判据用了 `position: fixed`，但 `.JXrxFq_preview` 实际是
**`position: absolute`**（相对 rail 定位）。用 fixed 过滤必然 `previewCount=0`。

**触发步骤**（三步，无需构造）：

1. `Input.dispatchMouseEvent({ type: 'mouseMoved', x, y })` 移到任一刻度中心
   （`document.querySelectorAll('.JXrxFq_mark')[i].getBoundingClientRect()` 取中心）；
2. 等 **~850ms**（浮层有时延，见 C4）；
3. 读选择器 **`.JXrxFq_preview`**（不是 `[class*=preview]`，那会命中 `JXrxFq_previewPrompt` 等子节点）。

**判定式**（`innerH`/`innerW` 为 `window.innerHeight`/`innerWidth`）：

```js
const b = document.querySelector('.JXrxFq_preview').getBoundingClientRect()
const inViewport = b.top >= -1 && b.bottom <= innerH + 1
                && b.left >= -1 && b.right <= innerW + 1
```

**实测 rect**（1280×820 视口 / 45 刻度 / 深色）：

| 悬停刻度 | position | top | bottom | height | 溢出上/下 | inViewport |
|---|---|---|---|---|---|---|
| 刻度[10] | absolute | 215 | 323 | 108 | 0 / 0 | **true** |
| 刻度[25] | absolute | 365 | 473 | 108 | 0 / 0 | **true** |
| 刻度[40] | absolute | 515 | 643 | 128 | 0 / 0 | **true** |

**3 个样本、越界 0 个** → 判定 ✅。

**已知边界**：刻度[2]（靠近 rail 顶部）悬停后未出现浮层——属于 ZCode 同款的顶部不展开，
不是 clamp 失败。窄窗口下列表整体隐藏浮层（C5 原判据的另一半）行为不变。

---

## D. 键盘与可访问性

| # | 格 | ZCode 规格 | DSH 现状 | 判定 |
|---|---|---|---|---|
| D1 | focus 波 | visualFocus 合并 hover | focusin/out 对称波 | ✅ |
| D2 | 焦点环 | `focus-visible:ring-2 ring-input-border-focused ring-offset-2` | outline/shadow 全无 | ❌ G2 |
| D3 | aria 序号 | `aria-posinset`/`aria-setsize` | 无 | ❌ G5 |
| D4 | 水合态 | nav `aria-busy` | 无 | ❌ G5 |
| D5 | 空态 | <2 条隐藏 nav | 未测（无法构造） | ❓ |

## E. 长列表与滚动

| # | 格 | ZCode 规格 | DSH 现状 | 判定 |
|---|---|---|---|---|
| E1 | rail 自动跟滚 | `scrollToIndex(active, align:'auto')`，当前条永在视野 | rail 512>420 可滚，无跟滚机制 | ❌ G3 |
| E2 | rail 虚拟化 | overscan 6 | 宿主 scroller max-h 420 自管 | ✅（机制不同但行为等价） |
| E3 | 滚动清 hover | rail `onScroll` 清 interaction | 插件 pointerleave 清；rail 滚动场景未单测 | ❓ |

## DSH 约束调整规则（写给后续组件的范例）

1. **A7 运行中下限**：宿主刻度无 running 标记 → 降级方案=读宿主会话状态（若未来暴露）或接受豁免；不得静默跳过，需在此标注。
2. **几何对比锚点**：跨端对比用「刻度左缘」「视口顶」等结构等价锚点，禁止用 nav 左缘（两端内边距不同：ZCode 48 含 12 内缩，DSH 28 无内缩——报告五坑 1 的教训）。
3. **DOM 规模**：DSH 滚动区可达 7 万 px / 38k 节点，一切长距离动画先算每帧位移预算（见 02-motion §3）。
