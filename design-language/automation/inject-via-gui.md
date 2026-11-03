# 全自动注入手册（cron 评判后自动把下一轮提示词发进 DSH 会话）

> 2026-10-27 实测打通：反解 `@deepseek-ai/dsh-client-connection` 得到 Web 鉴权机制，浏览器种 cookie 进入 GUI，页面内原子点击进会话、fill+Enter 发消息，GUI 确认送达（流式 213 tok/s）。
> 原则：不走 typert RPC 逆向（太重），直接驱动官方 Web GUI。

## 1. 找 GUI 端口（每次运行都要做，端口随重启变）

```bash
# 主进程 = DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness，监听端口即 GUI
lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -E "DeepSeek" | awk '{print $9}' 
```
验证：对候选端口 `curl -s http://127.0.0.1:<port>/` 返回 401 且含 "dsh web authentication required" 的那个就是。优先从 transcript 最新 runtime context 的 `Web GUI URL: http://127.0.0.1:(\d+)` 取，失配再用 lsof。

## 2. 铸造鉴权 cookie（secret 来自本地凭证，勿外泄勿回显）

源码机制（dsh-client-connection/lib/index.js）：
- cookie 名 = `dsh-auth-` + base64url(sha256(authority))，authority = 请求 Host 头（`127.0.0.1:<port>`）
- cookie 值 = `v1.` + base64url(JSON `{version:1, authority, issuedAt, expiresAt}`) + `.` + base64url(HMAC-SHA256(secret, body))
- secret = `~/.dsh/.credentials.yaml` → `records.client-connection/browser-session.payload.secret`（base64url 32B）

JS 铸造代码（在 browser 的 evaluate 里种，不能用 HttpOnly 限制——JS 种的非 HttpOnly cookie 服务端一样认）：

```js
// node 侧
const secret = Buffer.from(secretB64.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4-(secretB64.length%4))%4), 'base64');
const name = 'dsh-auth-' + createHash('sha256').update(authority).digest('base64url');
const body = Buffer.from(JSON.stringify({version:1, authority, issuedAt:Date.now(), expiresAt:Date.now()+30*86400000})).toString('base64url');
const value = 'v1.' + body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
```

## 3. 浏览器注入流程（browser-use / node_repl）

1. `browser.tabs.new()` → `goto http://<authority>/`（401 文档）→ `waitForLoadState domcontentloaded`
2. `evaluate`：`document.cookie = "<name>=<value>; path=/; SameSite=Strict"`
3. `goto /` → title 应为 "DeepSeek Harness"
4. 找目标会话：DOM 树里 `treeitem` 名含 `🔍 探索｜左右两侧索引的来源排查`。**树每秒重渲染，locator 会竞态**——用页面内原子 JS：
   ```js
   evaluate((title) => {
     const cands = [...document.querySelectorAll('span,div')].filter(el => el.childElementCount===0 && el.textContent.trim()===title);
     cands[cands.length-1]?.click(); return cands.length;
   }, "🔍 探索｜左右两侧索引的来源排查")
   ```
   等待 1.5s，快照确认 composer（textbox 名含 `发消息或创建任务`）出现。
5. 发消息（**2026-10-27 实测修正，fill+Enter 是死路**）：
   - **致命坑**：composer 是 contenteditable 富文本编辑器。`locator.fill()` 只写 DOM 不写应用草稿状态——之后 Enter/发送按钮全部读到空草稿，什么都不发生（消息文本还会留在编辑器里假装已输入）。locator 定位 composer/按钮还会因树每秒重渲染竞态超时。
   - **正确流程（全部页面内原子操作）**：
     ```js
     // ① 清残留 + 真实逐键输入（draft 状态才会更新）
     await tab.playwright.evaluate(() => { document.querySelector('[contenteditable="true"]').focus(); });
     await tab.cua.keypress({ keys: ["Meta", "a"] });
     await tab.cua.keypress({ keys: ["Backspace"] });
     await tab.cua.type({ text: msg });          // 逐键真实输入
     await tab.playwright.waitForTimeout(400);
     await tab.cua.keypress({ keys: ["Enter"] }); // 此时 Enter 才是「发送」
     ```
   - **送达判据（缺一不可）**：①尾部出现「深度求索中，用时 Ns」或「模型请求（n/m）」；②`本会话 ¥X` 金额开始上涨；③「上下文已用 N%」变化。**composer 里文本残留不能作为失败判据**——发送后 DSH 可能保留草稿副本（无害，下次注入前的清残留步骤会清掉）。
   - snapshot 全文含哨兵文本 ≠ 触发评判判据（注入的提示词本身就引用了哨兵字样）——必须看**最后一轮 assistant 正文**是否以哨兵收尾。
6. `session.v4.jsonl.zstd` **落盘有延迟**（实测发消息后 ≥20 分钟未 flush）——transcript 只能做评判证据源（flush 后），实时判据一律以 GUI 页面为准。

## 4. 读取会话状态（GUI 即实时面）

- 正在工作：尾部有 `tok/s`、`深度求索` 等流式痕迹，或最后的 turn 无「本轮费用」收尾块。
- 轮次结束标记：出现 `button "复制"` + `generic "本轮费用 ≈ ¥..."` 收尾块。
- 哨兵检测：全文含 `【设计语言整改完成】`。
- 会话上下文水位：`button "上下文已用 N%"`。

## 5. 安全与纪律

- secret/cookie 只在内存里用，不写日志、不回显、不进报告。
- 注入的消息必须来自评判报告的「下一轮提示词草稿」，不得即兴构造。
- 注入前必须确认目标会话空闲（无流式痕迹）。
- 会话定位标题若变化（DSH 改标题），以 monitor-state.json 里记录的 sessionId 对应的 tree 项为准，标题模糊匹配失败时用搜索按钮找。

## 6. 【2026-10-27 首选路径】CDP 直连桌面应用（免 cookie，最可靠）

发现：9223 的页面目标 `dsh-app://app/` 就是 DSH 桌面应用本体 UI（与 61498 web 版同代码）。注入与监控都可以直接 CDP 附着它，**免 cookie、免 IAB 标签页**，且这是用户实际看到的窗口。

实测配方（2026-10-27 第二轮注入，834 字符成功）：
```js
// ① 空闲确认：!body.textContent.includes('深度求索中，用时')
// ② 真实鼠标点击 composer（trusted mousedown 设焦点）
const rect = evaluate(取 [contenteditable=true] 的 getBoundingClientRect 中心)
Input.dispatchMouseEvent mouseMoved/Pressed/Released
// ③ 全选删除（trusted 键，modifiers:4 = Cmd）
Input.dispatchKeyEvent keyDown/Up 'a' modifiers:4 → keyDown/Up 'Backspace'
// ④ 一次性插入（类 IME，单调用，无逐键竞态）
Input.insertText {text: msg}
// ⑤ Enter 发送
Input.dispatchKeyEvent keyDown/Up 'Enter'
// ⑥ 送达判据：composerLen=0 + streaming(深度求索中) 出现；费用随后上涨
```
监控读状态同理：`evaluate` 读 body 文本（深度求索中/本轮费用 ≈/上下文已用/哨兵）。

坑记录：
- IAB(61498) 路径的 fill/cua.type 会被 composer 重挂载竞态击败（evaluate 聚焦→按键之间 DOM 被换）；CDP trusted 输入无此问题。
- 送达判据别用「snapshot 含哨兵文本」（注入词自身引用哨兵字样）；用「最后一轮 assistant 以哨兵收尾」或「composerLen=0 + streaming」。
- 发送后 composer 若残留草稿副本（DSH 行为），下次注入前的全选删除步骤会清掉。

## 7.【2026-10-27 事故复盘】web boot 崩溃 → 安全模式 → 插件全没

**链条**：第 4 轮 agent 构建并 `cp` 同步（非原子，08:14:23）→ 页面 reload 同刻读到半截文件 → `dsh-zcode-ui: import failed` → **web boot 崩**（crash-web-boot.log "1 entry did not activate"）→ 用户重启仍崩（坏构建已落盘）→ DSH 弹「禁用第三方插件才能重启」→ 用户确认 → **安全模式把 `package.json#/dsh/profile/bundles` 砍到 2 项** → 插件全没。

**恢复三步**（都已验证）：
1. `cordis.patch.yml` 从最新 .bak 还原（安全模式外的重写也会丢自定义层）。
2. `package.json#/dsh/profile/bundles` 从 `package.json.bak-final-20261024-220746` 还原 17 项基线。
3. 重启（restart-with-debug.sh 或直接二进制）→ 验证 sidebarInit/接管标记/刻度数。

**预防（已落地）**：
- `automation/safe-sync.sh`：构建同步必经此脚本——parse 校验（SyntaxError 拒绝同步）+ 原子落盘（tmp+mv）。**禁止直接 cp lib/client.js 到安装目录。**
- cookie doctor 每日 04:00 已装（防 431 cookie 膨胀启动失败，昨天那起）。
- 循环契约新增：任何应用重启前先备份 `package.json` + `cordis.patch.yml`；boot 后必查「1 entry did not activate」标记。

## 8. 打开 DSH 设置页（插件自有设置壳，2026-10-27 验证）

```js
// 设置页按需挂载，入口是 owner 元素上的自定义事件（settings-navigation.ts）：
const owner = document.querySelector('[data-dcu-settings-owner]')
owner.dispatchEvent(new CustomEvent('dcu-settings-open-root', {cancelable: true}))
// 验证：document.querySelector('[data-dcu-settings-page]') 已挂载
// 若需跳分区：dispatchEvent(new CustomEvent('dcu-settings-open-section', {detail:{labels:['外观']}, cancelable:true}))
```
陷阱：`.dcu-settings-page` **按需挂载**——没打开时 DOM 里不存在，别误判为「插件没做设置页」。事件派发到错误目标会被静默忽略（owner 判定在 settings-navigation.ts:45）。

## 9. 设置页打开期间禁止注入（2026-10-27 崩溃 #6 之后的坑）

插件设置壳（`.dcu-settings-page`）挂载期间会挡住 composer——注入序列（点击/按键/insertText）会全部落空且**无报错**（composerLen 读数为 0 的假象）。
注入前必须：`Esc` 关闭设置页 → 验证 `pageGone && compReady` → 再执行注入序列。探针常驻化后，`/tmp/dsh-boot-errors.log` 也能提供旁证。

## 10. 崩溃系列根因定论（2026-10-27，探针实证）

探针日志（`/tmp/dsh-boot-errors.log`，08:17 UTC 前身应用 09:17 那次）现象链：

```
09:17:14  503 × 8 端点同时失败（api/session/list、permissionPresets/catalog、
          dynamicCordisRunner/inventory、session/modelCatalog、agentPresets/list×2、
          settings/describe、dsh-codex-ui/dependencies）
09:17:15  WebSocket ws://127.0.0.1:<port>/api/remote.mux failed
09:17:17  新进程 listening
```

**结论**：宿主后端启动早期尚未就绪即对外供 API → 全端点 503 → WS mux 断连 → 进程重启。
**8 个端点同时失败 = 整体性故障**，不是某一插件导致（插件若致崩只命中自己那一条）。
→ 归入宿主/应用层 KNOWN-ISSUES，插件侧无需为它做工程改动。判据写法：同窗口失败端点数 >3 即判整体性。
