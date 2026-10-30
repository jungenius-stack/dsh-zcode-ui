/**
 * 夜审 batch-4 回归断言：locales.ts 与 ZCode 宿主文案对齐（8 条已复核条目，第三轮重写）。
 *
 * ## 锁什么
 *
 * 8 条「我们自己的文案 = ZCode 宿主同位文案」的对齐结论（第三轮复核 2026-10-30，
 * 全部 verdict=verified、checkable=true）。uiplug 是 ZCode 的 UI 插件，侧栏/会话/
 * 分组/相对时间等文案刻意与宿主用词一致；值一旦漂移，宿主界面就会出现「两套说法」。
 * 因此每条断言把 locales.ts 中 zh 词典的「键 → 值」锁到字节级：改值必须先重新
 * 对齐宿主并更新断言，静默漂移立刻红。
 * 前两轮 .assert.ts 版本因机器高负载下的门禁崩溃被保险丝撤回，非内容问题；
 * 本轮（机器空闲）按原要求重写。
 *
 * ## 这些取值为什么来自 ZCode（证据来源）
 *
 * - 第三轮复核（2026-10-30）亲自解包 /Applications/ZCode.app/Contents/Resources/app.asar
 *   逐键实测；宿主 bundle 内 locale 定义形如 `"key":`值``（反引号模板串）。
 * - 本文件编写当日，又用 `grep -aoE '"<key>":`[^`]*`' app.asar` 把下述 18 个宿主键值
 *   全部重新独立复核，与复核记录逐字一致；`"taskList\.[A-Za-z0-9]+"` 唯一键名计数 48，
 *   证实复核员对审计员「taskList.* 53 键」的修正（宽匹配多出的 taskList.workflowRun
 *   系代码引用、非 locale 定义）。
 * - 断言本身只读 locales.ts 文本，不依赖 asar 在位——宿主侧证据已固化在上面与
 *   各条注释里，测试可在任何机器上运行。
 * - 宿主侧易混项：settings.memory.viewer.workspaceSearchEmpty=`没有匹配的工作区。`
 *   不是对齐目标；home.projectEmpty 对齐的是 chat.empty.workspaceSearchEmpty=`没有匹配的项目`。
 *
 * ## 为什么用文本断言而不是渲染测试
 *
 * locales.ts 是纯数据词典，对齐是「键 → 值」的源码级事实。渲染测试要起活宿主，
 * 只能看到最终字符串，定位不了漂移源，也覆盖不到尚未被渲染的键。
 * 文本断言直接锁值、不依赖运行环境；键是否被真实消费由 locales.assert.ts 的
 * dead-key 检查兜底，本文件不重复。
 *
 * ## 为什么是纯 JS（.mjs、零 TS 语法）
 *
 * 全量门禁第 1 步是 tsc --noEmit 全仓类型检查，昨晚 .assert.ts 版本因类型检查被
 * 撤回（tsx 能跑 ≠ tsc 能过）。本文件与仓库既有 3 个 .assert.mjs 先例同构：
 * 无类型标注、无 as、无 interface、无泛型，只 import node 内置模块。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'src/client/locales.ts'), 'utf8')

// ── 1. sidebar.newTask = 宿主 sidebar.newTask（locales.ts:71）───────────────
// 宿主三处同值：sidebar.newTask / taskList.newThread / project.createTask 均为`新建任务`。
assert.match(
  source,
  /'sidebar\.newTask': '新建任务'/,
  '「新建任务」漂移：宿主 sidebar.newTask/taskList.newThread/project.createTask 均为「新建任务」（asar 实测），侧栏入口必须与宿主同词',
)

// ── 2. sessions.markUnread = 宿主 taskList.markAsUnread（locales.ts:166）───
assert.match(
  source,
  /'sessions\.markUnread': '标记为未读'/,
  '「标记为未读」漂移：宿主 taskList.markAsUnread=`标记为未读`（asar 实测）',
)

// ── 3. workspace.moveToGroup = 宿主 taskGroup.moveToGroup（locales.ts:124）─
assert.match(
  source,
  /'workspace\.moveToGroup': '移动到分组'/,
  '「移动到分组」漂移：宿主 taskGroup.moveToGroup=`移动到分组`（asar 实测）',
)

// ── 4. workspace.createGroup/renameGroup = 宿主 taskGroup.newGroup/rename ──
// locales.ts:121 / 130。宿主键名不同（newGroup/rename），zh 取值逐字相同。
assert.match(
  source,
  /'workspace\.createGroup': '新建分组'/,
  '「新建分组」漂移：宿主 taskGroup.newGroup=`新建分组`（asar 实测）',
)
assert.match(
  source,
  /'workspace\.renameGroup': '重命名分组'/,
  '「重命名分组」漂移：宿主 taskGroup.rename=`重命名分组`（asar 实测）',
)

// ── 5. home.projectEmpty = 宿主 chat.empty.workspaceSearchEmpty（locales.ts:18）
assert.match(
  source,
  /'home\.projectEmpty': '没有匹配的项目'/,
  '「没有匹配的项目」漂移：宿主 chat.empty.workspaceSearchEmpty=`没有匹配的项目`（asar 实测）；宿主另有一处「没有匹配的工作区。」（settings.memory.viewer.*）不是对齐目标，勿改去对齐它',
)

// ── 6. time.justNow/justNowShort = 宿主 taskList.justNow / common.justNow ──
// locales.ts:286-287。宿主两键 zh 同值`刚刚`（宿主 en 侧本就不同：now / just now，对齐按 zh）。
assert.match(
  source,
  /'time\.justNow': '刚刚'/,
  '「刚刚」漂移：宿主 taskList.justNow=`刚刚`、common.justNow=`刚刚`（asar 实测）',
)
assert.match(
  source,
  /'time\.justNowShort': '刚刚'/,
  'justNowShort 必须与 justNow 同值「刚刚」（复核记录明示 locales.ts:287 同值）',
)

// ── 7. time.minutes/hours/days 与宿主 taskList.minutesAgo/hoursAgo/daysAgo 同构
// locales.ts:288-290。宿主占位符为 {minutes}/{hours}/{days}，ours 为 {count}——
// 复核已认可「结构同构、占位符名不同」。宿主 taskList 仅 4 档（justNow + 分/小时/天）：
// taskList.weeksAgo/monthsAgo/yearsAgo 在 asar 中 grep 0 命中。
assert.match(
  source,
  /'time\.minutes': '\{count\}分'/,
  '「{count}分」漂移：宿主 taskList.minutesAgo=`{minutes}分`（asar 实测，占位符名不同属复核认可的差异）',
)
assert.match(
  source,
  /'time\.hours': '\{count\}小时'/,
  '「{count}小时」漂移：宿主 taskList.hoursAgo=`{hours}小时`（asar 实测）',
)
assert.match(
  source,
  /'time\.days': '\{count\}天'/,
  '「{count}天」漂移：宿主 taskList.daysAgo=`{days}天`（asar 实测）',
)
// locales.ts:291-293。ours 比宿主多出周/月/年三档——这是复核记录在案的结构差异
// （宿主仅 4 档）。锁住「超集」现状：删档或改词都要重新对齐论证，不能顺手改。
assert.match(
  source,
  /'time\.weeks': '\{count\}周'/,
  'time.weeks 是「ours 为宿主超集」结论的一部分（宿主 taskList 无周档，asar grep 0 命中），删除/改写需重新对齐',
)
assert.match(
  source,
  /'time\.months': '\{count\}个月'/,
  'time.months 是「ours 为宿主超集」结论的一部分（宿主无月档），删除/改写需重新对齐',
)
assert.match(
  source,
  /'time\.years': '\{count\}年'/,
  'time.years 是「ours 为宿主超集」结论的一部分（宿主无年档），删除/改写需重新对齐',
)

// ── 8. sidebar.schedule = 宿主 taskList.cronTaskLabel / taskGroup.cronGroupName
// locales.ts:82。宿主两键 zh 同值`定时任务`（宿主 en 侧 Scheduled task / Scheduled tasks 单复数不同）。
assert.match(
  source,
  /'sidebar\.schedule': '定时任务'/,
  '「定时任务」漂移：宿主 taskList.cronTaskLabel=`定时任务`、taskGroup.cronGroupName=`定时任务`（asar 实测）',
)

console.log('night-audit batch-4：8 条复核条目 / 15 组断言全部通过')
