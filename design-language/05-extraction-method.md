# 05 自助提取方法（需要更多细节时）

> 原则：内省不算验证（踩坑公理 2）。任何「ZCode 是这么做的」都必须有源码原文或活页面实测，不许凭印象写规格。

## 1. 活页面 CDP 探针（ZCode 调试端口 9224）

前提：ZCode 以 `--remote-debugging-port=9224` 启动（重启脚本见工作区 restart-zcode-debug.sh）。

```js
// 模板：读计算样式/几何
const list = await (await fetch('http://127.0.0.1:9224/json/list')).json()
const page = list.find(x => x.type === 'page' && /index\.html/.test(x.url || ''))
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id=0
const call=(m,p={})=>new Promise(res=>{const i=++id;const h=ev=>{const d=JSON.parse(ev.data);if(d.id===i){ws.removeEventListener('message',h);res(d.result)}};ws.addEventListener('message',h);ws.send(JSON.stringify({id:i,method:m,params:p}))})
const evl=async e=>(await call('Runtime.evaluate',{expression:e,returnByValue:true})).result.value
// 用法示例
await evl(`getComputedStyle(document.querySelector('[data-testid="v4-turn-navigator"] button span')).cssText`)
```

关键工具方法（audit-scripts/ 里都有现成的）：
- **真鼠标事件**：`Input.dispatchMouseEvent`（mouseMoved/Pressed/Released/mouseWheel）——合成 PointerEvent 进不去 React 委托，必须走 CDP 输入管线。
- **逐帧采样**：页面内装 rAF 采样器记录 scrollTop 时间线（判动画平滑度/闪跳/落点）。
- **键盘路径**：`Input.dispatchKeyEvent` Tab 循环 + `document.activeElement` 检查（测 focus-visible 必须键盘源，JS `.focus()` 不触发）。
- **媒体模拟**：`Emulation.setEmulatedMedia`（prefers-reduced-motion）、`Emulation.setDeviceMetricsOverride`（窄视口）。
- **双主题**：改 `document.documentElement.className`（dark/theme-zai-dark ↔ theme-zai-light），**测完必须恢复**并校验 className 一致。

## 2. asar 反解（源码级证据）

```python
# app.asar 是 Pickle 头 + JSON 目录 + 连续文件区
# /Applications/ZCode.app/Contents/Resources/app.asar
# 解析 header → 定位 /out/renderer/assets/styles-*.js（6.7MB，全部组件源码都在）
# 搜 testid 常量（如 v4-turn-navigator）→ 找到组件函数 → 提取纯函数（Vst 波值等）
```
注意：bundle 是压缩过的（变量名 zze/Rze 等），靠 testid 字符串锚定，提取函数体后按语义重命名。

## 3. DSH 侧验证（端口 9223）

同一套探针，选择器换掉：
- 宿主 nav：`nav[aria-label="轮次导航"]`（= 插件标记的 `[data-dcu-official-turn-navigator]`）
- 刻度：`button[data-index]`（注意：**不是** ZCode 的 `data-item-index`）
- 浮层：nav 内 `[role=tooltip]`；刻度样式：`getComputedStyle(btn,'::before')`
- 会话滚动容器：`[data-conversation-scroll]`
- 深浅主题：DSH 类为 `theme-zai-dark dark` / 浅色对应，写死颜色必翻车（教训：黑底黑线）

## 4. 实测纪律（六轮踩出来的）

1. 判定表前置：先写「输出 X⇒坑成立；Y⇒不成立」再跑探针。
2. 写类副作用（滚动/视口/主题）必须恢复原值并复核查验。
3. 长会话对照前先记 `scrollHeight` 基线，中途漂移 >20% 即作废重测（压缩会污染样本）。
4. 同一现象**两次独立采样**再定性（残留 hover 假象差点被当成新坑）。
5. 同一探针两端各跑一遍，不许只测一侧就下「一致/不一致」结论。
6. 全部探针脚本在 `audit-scripts/`，改完代码先跑对应脚本再跑 gate。
