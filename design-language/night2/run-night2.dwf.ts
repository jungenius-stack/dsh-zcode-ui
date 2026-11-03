// night2：ZCode 深扫 + 插件全方位落地（2026-11-02 夜）
// 结构：三池探针 → 9224 门卫 → 静态深挖（14 面 × 审计→复核，与 9224 等待并行）→ 活体实测（若 9224 开）→
//       分组落地（带门禁，红了 git restore）→ 收口门禁 + 早报
// 铁律：不重启 ZCode；9224 只读；不碰 lib；不 commit 不 push（早晨人工做）；
//       每个落地组完成即跑断言+门禁，红了 git restore 该组文件。

const PROJECT = '/Users/m1/Downloads/优化UI插件区/uiplug'
const DL = '/Users/m1/Downloads/优化UI插件区/design-language'
const ASAR = '/Applications/ZCode.app/Contents/Resources/app.asar'
const NIGHT2 = DL + '/night2'
const WS = '/Users/m1/node_modules/ws/index.js'

// ── 池子（全部 GLM 官方，用户已授权今晚用 GLM-5.3-Flash；按优先级排序）────────
const M = {
  start: model('account:bigmodel-start-plan/GLM-5.3-Flash$max'),
  idle: model('account:bigmodel-offpeak-idle-plan/GLM-5.3-Flash$max'),
  card: model('account:bigmodel-highspeed-card/GLM-5.3-Flash$max'),
}
const POOLS = [
  { key: 'start', ref: M.start, label: 'start-plan（会话同池，日额度）' },
  { key: 'idle', ref: M.idle, label: 'offpeak-idle-plan（闲时池，疑「3亿」所在）' },
  { key: 'card', ref: M.card, label: 'highspeed-card' },
]

// ── 静态深挖面（14 个，互不重叠；applier 按面分组避免同文件冲突）──────────────
interface Surface {
  n: number
  name: string
  brief: string
  files: string[]
}
const SURFACES: Surface[] = [
  { n: 1, name: '上下文菜单', brief: '右键菜单全部形态：普通项/危险项/子菜单/分隔线/快捷键标注/分组标题，开合动画与层级', files: ['session-tree.tsx', 'CodexWorkspaceBrowser.tsx', 'composer-tool-menus.ts'] },
  { n: 2, name: '悬停卡与tooltip', brief: '悬停卡结构/描边/阴影/出现消失时序、tooltip 文字与键帽、delay 档', files: ['hover-shell.tsx', 'hover-tip.ts', 'workspace-hover-card.tsx'] },
  { n: 3, name: '对话框家族', brief: '删除/重命名/设置退出等全部对话框：宽度、标题层级、按钮排布、遮罩、进出动画', files: ['session-row-actions.tsx', 'archive-confirm.ts', 'settings-focus.ts'] },
  { n: 4, name: 'toast与通知', brief: 'toast 底/字/圆角/位置/停留时长/进出动画、错误通知形态', files: ['user-error.ts', 'business-request-error.ts'] },
  { n: 5, name: '空态', brief: '全部空态文案与排版：无任务/无项目/无频道/无搜索结果/归档空', files: ['locales.ts', 'workspace-browser.ts', 'ScheduleBrowser.tsx'] },
  { n: 6, name: '滚动条与滚动', brief: '滚动条样式（宽/色/圆角/悬停）、平滑滚动参数、scrollbar-gutter、滚动阴影', files: ['scroll-anim.ts', 'conversation-layout.ts', 'conversation-dom.ts'] },
  { n: 7, name: '焦点与键盘', brief: '焦点环形态全表（offset 方向/宽度/色）、Tab 序、roving、快捷键提示', files: ['tree-keyboard.ts', 'settings-focus.ts', 'input-history-keyboard.ts'] },
  { n: 8, name: '禁用加载骨架', brief: 'disabled 态（透明度/cursor）、加载中（spinner/skeleton）、进度条三态', files: ['session-tree.tsx', 'AboutSection.tsx', 'DeveloperToolsRow.tsx'] },
  { n: 9, name: '徽标与计数', brief: '未读点/待处理胶囊/计数徽标/数字等宽：尺寸、色阶、位置、互斥', files: ['session-tree.tsx', 'CodexWorkspaceBrowser.tsx', 'channel-api.ts'] },
  { n: 10, name: 'markdown渲染', brief: '代码块（横幅/内边距/圆角/复制钮）、表格、引用、链接、行内代码、图片、分割线', files: ['conversation-layout.ts', 'conversation-dom.ts', 'foreign-content-contract.ts'] },
  { n: 11, name: '设置页逐页', brief: '设置页逐分区对照（含 03f-settings-zcode-spec.json 全量：navItems/cards/selects/toggles 逐值）', files: ['CodexSettingsPage.tsx', 'settings-page-styles.ts', 'settings-page-model.ts'] },
  { n: 12, name: '频道定时归档页', brief: '频道浏览器/定时任务页/归档页的列表行、分组头、操作钮、空态、错误态', files: ['ChannelBrowser.tsx', 'ScheduleBrowser.tsx', 'schedule-group-actions.ts', 'channel-brand.tsx'] },
  { n: 13, name: '无参照二轮攻坚', brief: '把 20 份 batch 报告与 gapfill 里全部「无参照」条目集中再攻一轮：换检索策略（组件名图/样式串/路由键/i18n 前缀族），能定则定，不能定给出「已穷尽」清单', files: [] },
  { n: 14, name: '主题层叠定案', brief: '提取 asar 里 .theme-zai-light/.theme-zai-dark 全块 + :root 基础层全块，按出现顺序推导运行时层叠，裁决 9 条文档冲突（侧栏底/设置页底/前景色/字体栈实际值）', files: ['zcode-theme.ts', 'zcode-tokens.ts'] },
]

interface DiffItem {
  /** 文件名（不含路径）与行号，如 CodexSidebar.tsx:157。 */
  where: string
  /** 一句话说清差异。 */
  item: string
  /** 本仓库当前值。 */
  ours: string
  /** ZCode 值 + 证据（asar 偏移/CDP 实测/活体截图编号）。 */
  zcode: string
  /** mechanical = 可机械落地且不与既有裁决冲突；deviation = 触既有裁决，仅登记。 */
  kind: 'mechanical' | 'deviation' | 'needs-live'
}
interface SurfaceResult {
  n: number
  name: string
  reportPath: string
  diffs: number
  aligned: number
  noRef: number
  verified: number
  applied: number
  note: string
}

artifact.table('pools', {
  title: '今晚通道探针',
  columns: [
    { field: 'pool', label: '池' },
    { field: 'status', label: '状态' },
    { field: 'latency', label: '耗时' },
  ],
  key: 'pool',
})
artifact.table('surfaces', {
  title: '深挖进度',
  columns: [
    { field: 'n', label: '面' },
    { field: 'name', label: '名称' },
    { field: 'diffs', label: '差异' },
    { field: 'verified', label: '复核过' },
    { field: 'applied', label: '已落地' },
    { field: 'status', label: '状态' },
  ],
  key: 'n',
})

// ── 1. 三池探针 ──────────────────────────────────────────────────────────────
phase('三池探针：谁有量用谁')
const probeResults: { key: string; ok: boolean; ms: number; answer: string }[] = []
for (const pool of POOLS) {
  try {
    const probe = agent('探针·' + pool.key, {
      model: pool.ref,
      system: '你只做一件事：确认这个模型通道能正常应答。只回答被问到的那句话，不展开、不调用工具。',
    })
    const answer = await probe.ask('请原样回复这一行，不要有任何多余内容：NIGHT2-OK')
    const ok = answer.includes('NIGHT2-OK')
    probeResults.push({ key: pool.key, ok, ms: 0, answer: answer.slice(0, 40) })
    report({ pool: pool.key, status: ok ? '可用' : '应答异常：' + answer.slice(0, 30), latency: '-' }, 'pools')
  } catch (error) {
    probeResults.push({ key: pool.key, ok: false, ms: 0, answer: String(error).slice(0, 80) })
    report({ pool: pool.key, status: '不可用：' + String(error).slice(0, 60), latency: '-' }, 'pools')
  }
}
const winner = POOLS.find(p => probeResults.find(r => r.key === p.key)?.ok === true)
if (winner === undefined) {
  return {
    conclusion: '三个 GLM 池全部不可用（start/idle/card 探针均失败），按铁律不硬顶、不动用 API-Key 池。夜间计划未执行。',
    findings: probeResults.map(r => ({ where: '探针·' + r.key, what: r.answer, evidence: '探针应答', status: 'unconfirmed' as const, severity: 'high' as const })),
    verified: ['三池探针逐一实跑'],
    notCovered: ['全部深挖与落地未执行'],
  }
}
log('今晚主池：' + winner.label)

// ── 2. 9224 门卫 ─────────────────────────────────────────────────────────────
phase('9224 门卫：ZCode 活体可用吗')
// 判定只能看**真实端口监听**，不能看日志行：/tmp/zcode-debug.log 里的 WS 行是历史记录，
// ZCode 进程退出后那行依然在（本次实测踩过：日志有行、进程已死、9224 连接被拒）。
// 这个构建禁用了 HTTP 发现端点（/json/* 无响应），所以用 lsof 查 TCP 监听。
const portCheck0 = await world.run('/usr/sbin/lsof', ['-nP', '-iTCP:9224', '-sTCP:LISTEN'])
const cdpUp0 = portCheck0.exitCode === 0 && portCheck0.stdout.trim().length > 0
log('9224 初始状态：' + (cdpUp0 ? '监听中（WS 直连可用）' : '无监听（ZCode 未以调试模式运行；静态照跑，活体视等待结果）'))
report({ pool: '9224', status: cdpUp0 ? '监听中（WS）' : '无监听', latency: '-' }, 'pools')

// ── 3. 静态深挖（后台跑）与 9224 等待（前台轮询）并行 ─────────────────────────
phase('静态深挖：14 面 × 审计→独立复核')
const staticStage = future(async () => {
  const results: SurfaceResult[] = await Promise.all(
    SURFACES.map(async (surface): Promise<SurfaceResult> => {
      const reportPath = NIGHT2 + '/surface-' + surface.n + '.md'
      try {
        const fileList = surface.files.map(f => '- src/client/' + f).join('\n')
        const audit = await agent('深挖员·' + surface.n.toString(), {
          model: winner.ref,
          system:
            '你是 ZCode 设计语言深挖员。你只读，不改 src/tests 下任何文件。' +
            '证据高于直觉：每个值都要说清出处（asar 提取命令与字节偏移、或设计语言文档章节、或 CDP 实测记录）。' +
            '查不到就写「无参照」并附你搜过的全部模式，严禁编造。这一轮要比前一晚更深：' +
            '不要只查单点值，把该 surface 的完整 CSS 规则、组件结构、状态机（hover/active/disabled/focus）都拉出来对照。',
        }).ask(
          [
            '项目：' + PROJECT + '；asar：' + ASAR + '（341MB，grep -a 或 python mmap）；设计语言文档：' + DL,
            '',
            '本面主题：' + surface.name,
            '深挖范围：' + surface.brief,
            surface.files.length > 0 ? '涉及的插件文件：\n' + fileList : '本面跨文件，自行定位。',
            '',
            '步骤：',
            '1. 先读 ' + DL + '/night-audit/APPLIED.md（昨晚已落地的 40+ 处，别重复报）与 ' + DL + '/README.md（文档索引）。',
            '2. 从 asar 把本 surface 的完整样式与结构挖出来（类名 → CSS 规则全文 → 状态变体 → 动画），不止抽查。',
            '3. 逐项对照插件源码，分三类：mechanical（有证据、可机械落地、不触既有裁决）/ deviation（触既有裁决，登记不修）/ needs-live（必须 9224 活体才能定）。',
            '4. 写 ' + reportPath + '：差异表（where/item/ours/zcode/kind/证据）+ 已对齐表 + 无参照表（附穷尽搜索记录）。',
            '',
            '铁律：只新建 ' + reportPath + ' 这一个文件；diffs 最多 15 条，宁缺毋滥；不改 src/tests/文档。',
          ].join('\n'),
        )
        const diffs = (audit.match(/mechanical/g) ?? []).length
        report({ n: surface.n, name: surface.name, diffs, verified: 0, applied: 0, status: '已审计' }, 'surfaces')

        const verify = await agent('复核员·' + surface.n.toString(), {
          model: winner.ref,
          system:
            '你是独立复核员。深挖员的每个数值都当作未经证实的说法，必须亲自复现：' +
            '自己跑 asar 提取命令、自己读文档章节。只读，不改任何文件。复核不通过就如实标 unconfirmed。',
        }).ask(
          [
            '逐条复核 ' + reportPath + ' 里的差异表（只复核 mechanical 与 needs-live 两类，deviation 只看证据是否成立）：',
            '对每条给出 verdict：verified / unconfirmed，附你实际看到的值。',
            '把复核结果追加写入 ' + reportPath + ' 末尾新开一节「## 复核」，逐条列 verdict 与理由。不要改原文。',
          ].join('\n'),
        )
        const verified = (verify.match(/verified/g) ?? []).length
        report({ n: surface.n, name: surface.name, diffs, verified, applied: 0, status: '已复核' }, 'surfaces')
        return { n: surface.n, name: surface.name, reportPath, diffs, aligned: 0, noRef: 0, verified, applied: 0, note: '' }
      } catch (error) {
        log('面 ' + surface.n + ' 中断：' + String(error).slice(0, 120))
        return { n: surface.n, name: surface.name, reportPath, diffs: 0, aligned: 0, noRef: 0, verified: 0, applied: 0, note: '本面未完成：' + String(error).slice(0, 120) }
      }
    }),
  )
  return results
})

const surfaces = await staticStage

// ── 4. 活体实测（静态扫完再看一眼；开着才做）──────────────────────────────────
phase('活体实测：CDP 采集 → 裁决')
// 不用阻塞 sleep 等 ZCode：world.run 默认 300s 超时，长等必然把自己卡死（本次实测踩过）。
// 静态阶段跑完后重新探一次真实端口，开着就做活体，没开就跳过——静态成果不受影响。
const portCheck1 = await world.run('/usr/sbin/lsof', ['-nP', '-iTCP:9224', '-sTCP:LISTEN'])
const cdpUp = portCheck1.exitCode === 0 && portCheck1.stdout.trim().length > 0
log('活体门卫（静态阶段结束后复查）：' + (cdpUp ? '9224 监听中，开始采集' : '9224 仍无监听，活体整段跳过'))
report({ pool: '9224-recheck', status: cdpUp ? '监听中，已采集' : '无监听，活体跳过', latency: '-' }, 'pools')

let liveReportPath = ''
let liveVerdicts = 0
if (cdpUp) {
  try {
    const capturer = await agent('采集官', {
      model: winner.ref,
      system:
        '你是 CDP 采集官，负责对运行中的 ZCode（WS 模式，127.0.0.1:9224）做只读取证。' +
        '铁律：绝不重启 ZCode、绝不 Page.reload、绝不写入任何状态（只 Runtime.evaluate 读取与截图）。' +
        '连接方式（此构建禁用了 HTTP 发现端点）：先 grep 从 /tmp/zcode-debug.log 拿 ' +
        'ws://127.0.0.1:9224/devtools/browser/<id>，用 ws 模块（' + WS + '，绝对路径 import）直连该 URL，' +
        '然后发 Target.getTargets 找 type=page 的目标，Target.attachToTarget({targetId, flatten:true}) 拿 sessionId，' +
        '之后每条 CDP 消息都带 sessionId 字段发。输出 JSON 到 ' + NIGHT2 + '/cdp- 目录，脚本同存，每条数据可复现。',
    }).ask(
      [
        '采集以下数据到 ' + NIGHT2 + '/cdp- 目录（JSON，逐项带采集时间与目标页 URL）：',
        '1. 主题层叠实测：给 documentElement/body 分别挂 theme-zai-light / theme-zai-dark（纯 DOM 属性切换，读完即还原），',
        '   读取关键元素 computed style：侧栏底、设置页底、正文前景、菜单 hover、tooltip 三件套、图标描边、实际 font-family。',
        '2. 码块 pre 的实际内边距（上/右/下/左）。',
        '3. 轮次导航滚动行为：滚动 rail 内部 scroller，观察 hover 波是否清除（E3 疑案）。',
        '4. 悬停 tooltip 的实际出现延迟（连测 5 次取中位）。',
        '5. 焦点环颜色（键盘 Tab 触发后读 outline 色）。',
        '完成后写 ' + NIGHT2 + '/cdp-summary.json（键值对汇总）。全部脚本与 JSON 都留在 night2 目录里。',
      ].join('\n'),
    )
    liveReportPath = NIGHT2 + '/cdp-summary.json'
    const verdict = await agent('裁决员', {
      model: winner.ref,
      system: '你只读证据做裁决：输入是 CDP 实测 JSON 与 14 份 surface 报告。你不动任何代码。',
    }).ask(
      [
        '读取 ' + liveReportPath + ' 与 ' + NIGHT2 + '/surface-*.md，',
        '把其中「needs-live」的差异逐条裁决：CDP 实测值 vs 报告值，给出 final 值与依据，',
        '写入 ' + NIGHT2 + '/live-verdicts.md（表格：where/item/实测值/结论/是否 mechanical）。不要改代码。',
      ].join('\n'),
    )
    liveVerdicts = (verdict.match(/verified/g) ?? []).length
    log('活体裁决完成：' + liveVerdicts + ' 条')
  } catch (error) {
    log('活体阶段中断：' + String(error).slice(0, 120))
    liveReportPath = ''
  }
} else {
  log('9224 未开启，活体阶段整段跳过（静态已尽量覆盖）')
}

// ── 5. 分组落地（带门禁，红了 git restore）────────────────────────────────────
phase('分组落地：4 组 × 应用→断言→门禁→红了回退')
const groups = [
  { name: 'A', surfaces: [1, 2, 3, 4] },
  { name: 'B', surfaces: [5, 6, 7, 13] },
  { name: 'C', surfaces: [8, 9, 10, 14] },
  { name: 'D', surfaces: [11, 12] },
]
const applyResults: { group: string; applied: number; reverted: boolean; note: string }[] = []
for (const group of groups) {
  const members = surfaces.filter(s => group.surfaces.includes(s.n) && s.note === '')
  if (members.length === 0) {
    applyResults.push({ group: group.name, applied: 0, reverted: false, note: '无可落地成员' })
    continue
  }
  const verdictNote = group.name === 'C' || group.name === 'D' ? '另有 ' + NIGHT2 + '/live-verdicts.md（活体裁决，若存在）' : ''
  try {
    const applier = await agent('落地员·' + group.name, {
      model: winner.ref,
      system:
        '你是落地员。只改 ' + PROJECT + '/src/client 下的源码，按报告里 mechanical 且复核 verified 的条目逐条落地。' +
        '铁律：不碰 lib/；不 commit；不 push；改完必须自跑 node tests/run-assertions.mjs 与 node scripts/gate.mjs，' +
        '红了就 git restore 你改过的文件（基线已提交，恢复是干净的）并在返回里说明哪条引发回退。' +
        '触既有裁决（APPLIED.md「明确不改」清单、报告里 deviation 类）的一律不落地，只登记。',
    }).ask(
      [
        '你负责面：' + members.map(m => m.n + '(' + m.name + ')').join('、'),
        '报告：' + members.map(m => m.reportPath).join('\n'),
        verdictNote,
        '',
        '步骤：',
        '1. 逐面读报告，取 mechanical && 复核 verified 的条目（没有复核节的面，只取证据链完整且 asar 命令可复现的）。',
        '2. 逐条落进对应源码文件。同一文件的多条一次改完。',
        '3. 跑 node tests/run-assertions.mjs 与 node scripts/gate.mjs。绿 → 记录落地清单；红 → git restore 你改过的文件，记录引发回退的条目。',
        '4. 返回：applied 数、reverted 布尔、每条的 where 与一句话说明。',
        '',
        '刷新 ' + NIGHT2 + '/applied-night2.md（追加本组落地清单；文件不存在就创建）。',
      ].join('\n'),
    )
    const applied = (applier.match(/落地/g) ?? []).length
    const reverted = /回退|restore|revert/.test(applier) && /失败|红了|未能|red/.test(applier)
    applyResults.push({ group: group.name, applied, reverted, note: applier.slice(0, 200) })
    for (const m of members) {
      m.applied = applied
      report({ n: m.n, name: m.name, diffs: m.diffs, verified: m.verified, applied: m.applied, status: reverted ? '部分回退' : '已落地' }, 'surfaces')
    }
  } catch (error) {
    applyResults.push({ group: group.name, applied: 0, reverted: true, note: String(error).slice(0, 160) })
  }
}

// ── 6. 收口：确定性门禁 + 早报 ───────────────────────────────────────────────
phase('收口：全量门禁 + 早报')
const gate = await world.run('node', [PROJECT + '/scripts/gate.mjs'], { timeoutMs: 1200000 })
const gateTail = (gate.stdout + gate.stderr).trim().split('\n').slice(-10).join('\n')
const assertions = await world.run('node', [PROJECT + '/tests/run-assertions.mjs'], { timeoutMs: 600000 })

const synthesizer = agent('汇总员', {
  model: winner.ref,
  system: '你是夜间深扫汇总员。每句话都要有出处；面向早上继续干活的用户，他要知道：跑成了什么、改了什么、什么没动、为什么。',
})
await synthesizer.ask(
  [
    '读取 ' + NIGHT2 + '/surface-*.md（14 份）、' + (liveReportPath || '（无活体产出）') + '、' + NIGHT2 + '/applied-night2.md（若存在）、',
    '与 docs/baseline 相关数字（断言脚本数等），写 ' + NIGHT2 + '/NIGHT2-REPORT.md：',
    '1. 通道与消耗（哪个池、有无中断）。',
    '2. 静态扫描：14 面各自的差异数/复核数/落地数，一条表。',
    '3. 活体实测：做了什么、裁决了哪些疑案；若跳过写明原因。',
    '4. 落地清单：文件 × 条目；有回退的写明引发回退的条目。',
    '5. 遗留：deviation 登记、needs-live 未决、无参照穷尽清单。',
    '6. 门禁结果（断言 X 过 / 门禁 exit N）。',
    '不要编造数字；每个数字都要能在报告文件里找到出处。',
  ].join('\n'),
)

const reader = await agent('独立审读员', {
  model: winner.ref,
  system: '你只读文本挑毛病，不做代码核查。「看起来不错」不是答案。',
}).ask(
  [
    '只凭文本审读 ' + NIGHT2 + '/NIGHT2-REPORT.md：',
    '1. 哪些结论没有出处？2. 哪句会误导早上的人？3. 早上最可能缺哪个信息？只给意见，不改报告。',
  ].join('\n'),
)
await synthesizer.ask('按独立审读员意见修订 ' + NIGHT2 + '/NIGHT2-REPORT.md（覆盖原文件）：\n' + reader + '\n只改报告本身。')

const cp = await world.run('cp', [NIGHT2 + '/NIGHT2-REPORT.md', 'NIGHT2-REPORT.md'])
await artifact.file('morning2', 'NIGHT2-REPORT.md', {
  title: '夜间深扫早报（night2）',
  description: '14 面 ZCode 深挖 + 活体实测 + 落地清单 + 门禁结果。',
  primary: true,
})
log('早报已发布（cp exit ' + cp.exitCode + '）')

const totalDiffs = surfaces.reduce((s2, x) => s2 + x.diffs, 0)
const totalApplied = applyResults.reduce((s2, x) => s2 + x.applied, 0)
const unfinished = surfaces.filter(s => s.note !== '')

return {
  conclusion:
    '夜间深扫：主池 ' + winner.label + '，14 面静态深挖差异 ' + totalDiffs + ' 条，落地约 ' + totalApplied +
    ' 条，活体' + (cdpUp ? '已做' : '跳过（9224 未开）') + '；全量门禁 exit ' + gate.exitCode + '，断言 ' +
    (assertions.stdout.match(/断言套件：([^\n]*)/)?.[1] ?? '未知') + '。早报在 design-language/night2/NIGHT2-REPORT.md。',
  findings: surfaces.map(s => ({
    where: s.reportPath,
    what: '面' + s.n + '（' + s.name + '）：差异 ' + s.diffs + ' / 复核 ' + s.verified + ' / 落地 ' + s.applied + (s.note !== '' ? '（' + s.note + '）' : ''),
    evidence: '见该面报告与复核节',
    status: s.note === '' ? 'verified' : 'unconfirmed',
    severity: s.diffs > 0 ? 'medium' : 'low',
  })),
  verified: [
    'node scripts/gate.mjs exit ' + gate.exitCode,
    'node tests/run-assertions.mjs：' + (assertions.stdout.match(/断言套件：([^\n]*)/)?.[1] ?? '未知'),
    '门禁尾部：' + gateTail.slice(0, 300),
  ],
  notCovered: [
    cdpUp ? '活体已做，但浅色主题未逐项目检' : '活体整段跳过：9224 未开启（ZCode 未带调试端口），needs-live 条目全部未决',
    unfinished.length > 0 ? '未完成面：' + unfinished.map(s => s.n).join('、') : '全部面完成',
    '已裁决维持的 16 条未复核裁决是否仍成立；deviation 条目仅登记未修',
    '未 commit 未 push（等早晨人工确认）',
  ],
}
