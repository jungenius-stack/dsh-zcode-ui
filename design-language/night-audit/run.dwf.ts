// 夜间额度任务：96 个模块 × ZCode 设计语言对账（2026-10-29 23:00 → 09:00）
//
// 拓扑：探针 → 每批「审计 → 独立复核 → 写回归断言」三级流水 → 逐条验断言 → 全量门禁 → 汇总报告
// 铁律：不改生产代码；断言只锁「今天已经与 ZCode 一致」的行为；红了就删掉那一批的文件。

const PROJECT = "/Users/m1/Downloads/优化UI插件区/uiplug"
const DL = "/Users/m1/Downloads/优化UI插件区/design-language"
const ASAR = "/Applications/ZCode.app/Contents/Resources/app.asar"
const REPORT_DIR = DL + "/night-audit"

interface BatchSpec {
  id: number
  files: string[]
}

const BATCHES: BatchSpec[] = [
  { id: 1, files: ["CodexWorkspaceBrowser.tsx"] },
  { id: 2, files: ["CodexSidebar.tsx"] },
  { id: 3, files: ["sidebar-width.ts"] },
  { id: 4, files: ["locales.ts", "new-conversation-draft.ts", "sidebar-session.ts"] },
  { id: 5, files: ["zcode-tokens.ts", "workspace-shortcuts.ts", "official-slot-shadow.ts"] },
  { id: 6, files: ["index.ts", "session-navigation-shortcuts.ts", "workspace-compat.ts", "workspace-hover-card.tsx", "settings-focus.ts"] },
  { id: 7, files: ["turn-rail-zcode.ts", "session-move.ts", "shared-now.ts", "footer-actions.ts", "session-navigation.ts"] },
  { id: 8, files: ["zcode-theme.ts", "slot-mirror.tsx", "input-history-keyboard.ts", "schedule-sessions.ts", "tree-expansion.ts"] },
  { id: 9, files: ["conversation-layout.ts", "settings-nav-icons.ts", "composer-width.ts", "session-manager.ts", "new-conversation-style.ts"] },
  { id: 10, files: ["foreign-surface-discovery.ts", "PluginConfigSection.tsx", "workspace-drop-indicator.ts", "document-hidden-motion-pause.ts", "DesktopNavigationControls.tsx"] },
  { id: 11, files: ["workspace-browser.ts", "ChannelBrowser.tsx", "session-order.ts", "archive-confirm.ts", "host-open-path.ts"] },
  { id: 12, files: ["conversation-header.ts", "ConnectorsSection.tsx", "startup-splash.ts", "turn-rail-dedupe.ts", "SettingsDocumentAction.tsx"] },
  { id: 13, files: ["CodexSettingsPage.tsx", "host-anchor-contract.ts", "settings-navigation.ts", "sidebar-search.ts", "global-panels.tsx", "settings-page-model.ts", "workspace-archive.ts"] },
  { id: 14, files: ["TurnNavigator.tsx", "official-turn-navigator.ts", "InputHistoryDock.tsx", "navigation-history.ts", "session-pending.ts", "conversation-bubbles.ts", "archive-session-delete.ts"] },
  { id: 15, files: ["virtual-skip.ts", "composer-tool-menus.ts", "foreign-content-contract.ts", "NewConversationSuggestions.tsx", "shortcut-catalog.ts", "automation-task-settings.ts"] },
  { id: 16, files: ["session-host.ts", "settings-page-registration.ts", "hover-shell.tsx", "skin-envelope.ts", "workspace-directory-flow.ts", "sidebar-drag.ts"] },
  { id: 17, files: ["AboutSection.tsx", "settings-page-styles.ts", "user-error.ts", "input-history.ts", "plugin-config.ts", "business-request-error.ts", "session-title-scroll.ts"] },
  { id: 18, files: ["session-tree.tsx", "scroll-anim.ts", "session-row-actions.tsx", "channel-api.ts", "DeveloperToolsRow.tsx", "schedule-group-actions.ts", "draft-attachments.ts"] },
  { id: 19, files: ["tree-keyboard.ts", "pinned-workspaces.ts", "zcode-icons.tsx", "WorkspaceShortcutBridge.tsx", "composer-visuals.ts", "conversation-dom.ts"] },
  { id: 20, files: ["user-bubble-collapse.ts", "ScheduleBrowser.tsx", "zcode-skin.ts", "companion-slots.ts", "hover-tip.ts", "channel-brand.tsx"] },
]

interface DiffItem {
  /** 模块文件名，不含路径。 */
  module: string
  /** 一句话说清是哪一处设计决策。 */
  item: string
  /** 本仓库当前取值。 */
  ours: string
  /** ZCode 的取值；查不到就写「无参照」。 */
  zcode: string
  /** 证据来源：设计语言文档章节，或 asar 里提取到的类名与数值。 */
  evidence: string
}

interface AlignedItem {
  /** 模块文件名。 */
  module: string
  /** 已经与 ZCode 一致、并且值得锁住的点。 */
  point: string
  /** 期望取值。 */
  expected: string
  /** 证据来源。 */
  evidence: string
}

interface AuditResult {
  /** 本批实际处理的模块文件名。 */
  modules: string[]
  /** 有证据的差异项，按修复价值从高到低，最多 12 条。 */
  diffs: DiffItem[]
  /** 已与 ZCode 一致、可写成源码文本断言的点，3 到 10 条。 */
  aligned: AlignedItem[]
  /** 查不到 ZCode 参照、因此跳过的点，最多 5 条。 */
  noReference: string[]
}

interface VerifiedDiff {
  /** 模块文件名。 */
  module: string
  /** 差异项。 */
  item: string
  /** verified 表示你亲自复现了；unconfirmed 表示证据对不上。 */
  verdict: "verified" | "unconfirmed"
  /** 你实际看到的取值，或复现失败的说明。 */
  note: string
}

interface VerifiedAligned {
  /** 模块文件名。 */
  module: string
  /** 已对齐的点。 */
  point: string
  /** verified 表示你亲自确认过。 */
  verdict: "verified" | "unconfirmed"
  /** 能否用源码文本断言表达。 */
  checkable: boolean
  /** 你复核时的依据。 */
  note: string
}

interface VerifyResult {
  diffs: VerifiedDiff[]
  aligned: VerifiedAligned[]
}

interface AssertResult {
  /** 新建断言文件的绝对路径；没写成为空字符串。 */
  path: string
  /** 断言条数。 */
  count: number
  /** 一句话说明锁了什么。 */
  summary: string
}

interface GapfillResult {
  /** 从「无参照」升级为「有参照」的条数。 */
  found: number
  /** 搜索后确认 ZCode 无对应物的条数。 */
  absent: number
  /** 一句话说明。 */
  summary: string
}

interface ExtraRow {
  /** 表格行唯一键。 */
  row: string
  /** 批次号。 */
  batch: number
  /** 增挖类型：交叉复检·甲/乙/丙 或 无参照补采。 */
  kind: string
  /** 产出文件绝对路径；失败为空字符串。 */
  path: string
  /** 补采：升级为有参照的条数。 */
  found: number
  /** 补采：确认无参照的条数。 */
  absent: number
  /** 状态一句话。 */
  status: string
}

interface BatchOutcome {
  batch: number
  modules: number
  reportPath: string
  diffs: number
  verified: number
  assertPath: string
  asserts: number
  assertKept: boolean
  note: string
}

artifact.table("batches", {
  title: "夜间批次进度",
  columns: [
    { field: "batch", label: "批次" },
    { field: "modules", label: "模块" },
    { field: "diffs", label: "差异" },
    { field: "verified", label: "已复核" },
    { field: "asserts", label: "断言" },
    { field: "status", label: "状态" },
  ],
  key: "batch",
})

// 每批审计员的原始结论留存（复核前的自报数据），供文末交叉复检与无参照补采选目标。
const auditExtras: { batch: number; diffs: number; noReference: string[] }[] = []

artifact.table("extras", {
  title: "追加深挖进度",
  columns: [
    { field: "row", label: "条目" },
    { field: "batch", label: "批次" },
    { field: "kind", label: "类型" },
    { field: "found", label: "有参照" },
    { field: "absent", label: "确认无参照" },
    { field: "status", label: "状态" },
  ],
  key: "row",
})

phase("试探 GLM 通道是否可用")
const probe = await agent("通道探针", {
  system:
    "你只做一件事：确认这个模型通道能正常应答。只回答被问到的那句话，不展开、不调用工具。" +
    "如果你无法完成任务或指令自相矛盾，直接说明，不要绕开。",
})
const probeAnswer = await probe.ask(
  "请原样回复这一行，不要有任何多余内容：NIGHT-AUDIT-CHANNEL-OK",
)
log("通道应答：" + probeAnswer.slice(0, 80))

phase("逐批对账 ZCode 设计语言")
const outcomes: BatchOutcome[] = await Promise.all(
  BATCHES.map(async (spec) => {
    const list = spec.files.map((f) => "- src/client/" + f).join("\n")
    const reportPath = REPORT_DIR + "/batch-" + spec.id + ".md"
    try {
      const audit = await agent("审计员·批次" + spec.id, {
        system:
          "你是 ZCode 设计语言对账审计员。你只读，不改 src 下任何文件；违规改动会让整晚的产出作废。" +
          "证据高于直觉：任何数值都必须说清是从设计语言文档的哪一节读到的，或从 asar 里用哪条命令提取的。" +
          "查不到就写「无参照」，严禁编造 ZCode 的取值。如果某项判断需要活宿主实测而你没有条件，标为未验证而不是猜。",
      }).ask<AuditResult>(
        [
          "项目根目录：" + PROJECT,
          "设计语言文档目录：" + DL,
          "ZCode 参照物：" + ASAR + "（341MB，用 grep -a 提取）",
          "",
          "本批要对账的模块（都在 " + PROJECT + "/src/client/ 下）：",
          list,
          "",
          "步骤：",
          "1. 先读 " + REPORT_DIR + "/README.md（产出格式）和 " + DL + "/README.md（文档索引）。",
          "2. 按模块内容挑 1 到 4 篇最相关的设计语言文档（候选：02-motion、03b-sidebar、03c-conversation、03d-composer、03e-header、03f-settings、03i-command-palette、03j-dialog、03n-typography、03p-startup、08-performance-audit）。不要整读 04-open-gaps.md（120KB），只在判断「这是不是已裁决的刻意偏离」时 grep 关键词。",
          "3. 读模块源码，列出所有设计决策点：颜色与令牌、圆角、间距、字号行高、动效时长与缓动、图标尺寸与描边、层级与阴影、交互反馈。",
          "4. 每个决策点查 ZCode 参照：优先用设计语言文档里已有的实测记录（它们本身带证据）；文档没记录时才去 asar 提取，命令形如 grep -a -o 模式 " + ASAR + "。",
          "5. 分三类：不一致进 diffs；一致且能写成源码文本断言进 aligned；查不到参照进 noReference。",
          "6. 把结果写成 " + reportPath + "，格式严格照 README.md（差异项表格 + 无参照项）。",
          "",
          "铁律：只能新建或覆盖 " + reportPath + " 这一个文件；不得改 src；不得改 tests；不得改已有文档。",
          "diffs 最多 12 条，只放真有证据的；aligned 给 3 到 10 条，用来加固回归；noReference 最多 5 条。",
        ].join("\n"),
      )

      const verifiedAligned = audit.aligned.length
      auditExtras.push({ batch: spec.id, diffs: audit.diffs.length, noReference: audit.noReference })
      const item = {
        batch: spec.id,
        modules: audit.modules.length,
        diffs: audit.diffs.length,
        verified: verifiedAligned,
        asserts: 0,
        status: "已对账",
      }
      report(item, "batches")

      const verify = await agent("复核员·批次" + spec.id, {
        system:
          "你是独立复核员。上一个审计员给出的每个数值，你都当作未经证实的说法。" +
          "你必须自己去看证据：读设计语言文档的对应章节，或自己 grep asar 提取。你只读，不改任何文件。" +
          "复核不通过不算失败，如实标注比迁就更有价值。",
      }).ask<VerifyResult>(
        [
          "审计员对下面这些条目给出了结论。逐条自己复现，不要相信他给的数值。",
          JSON.stringify({ diffs: audit.diffs, aligned: audit.aligned }),
          "",
          "判定规则：",
          "- verdict=verified 仅当你亲自确认「本仓库取值 / 与 ZCode 是否一致」这个结论成立。",
          "- verdict=unconfirmed：证据对不上、找不到、或数值被夸大。note 写明你实际看到了什么。",
          "- aligned 条目额外判 checkable：只有当它能用 tests 里的源码文本断言表达（读 src/client 下某文件文本、匹配一个确定字符串）时为 true。渲染行为、运行时状态一律 false。",
          "一条都不能漏，返回全部条目。",
        ].join("\n"),
      )

      const checkable = verify.aligned.filter((a) => a.verdict === "verified" && a.checkable)
      let assertResult: AssertResult = { path: "", count: 0, summary: "无可断言的已对齐项" }
      if (checkable.length > 0) {
        const target = PROJECT + "/tests/night-audit-batch-" + spec.id + ".assert.mjs"
        assertResult = await agent(
          "断言编写员·批次" + spec.id,
          {
            system:
              "你是回归断言编写员。你写的断言今天必须能通过——它锁的是「已经正确」的行为，不是「应该改成」的期望。" +
              "你只新建一个测试文件，不改 src，不改已有测试，不改文档。断言写不成立就少写几条并说明，不要为了凑数放宽到无意义。",
          },
        ).ask<AssertResult>(
          [
            "为已复核的对齐项写一份新的回归断言文件：" + target,
            "（第三轮重写：前两轮文件因机器高负载下的门禁崩溃被保险丝撤回，不是内容问题。本轮机器空闲，要求不变，质量优先。）",
            "",
            "已复核条目：",
            JSON.stringify(checkable),
            "",
            "要求：",
            "1. 先读 " + PROJECT + "/tests/virtual-skip.assert.ts 学习本仓库风格：node:assert/strict、读源码文本、顶部中文文档注释说明锁了什么与为什么。",
            "2. 你的文件必须是纯 JavaScript（.mjs）：不写任何 TypeScript 语法——没有类型标注、没有 as、没有 interface、没有泛型。原因：全量门禁第 1 步是 tsc --noEmit 全仓类型检查，昨晚 .assert.ts 版本因类型检查全部被撤回（tsx 能跑不等于 tsc 能过）；仓库已有 3 个 .assert.mjs 先例可过门禁。",
            "3. 只新建 " + target + " 这一个文件。不要改任何已有文件。",
            "4. 每条断言读 " + PROJECT + "/src/client/<模块> 的文本，assert.match 或 assert.equal 一个确定取值。断言必须现在就能通过。",
            "5. 文件顶部写中文注释：锁了什么、这些取值为什么来自 ZCode（引用证据来源）、为什么用文本断言而不是渲染测试。",
            "6. 写完后自查一次语法：node --check " + target + "（能抓住误写的 TS 语法）。不要跑整仓 tsc，也不要跑 node tests/run-assertions.mjs，编排脚本会统一跑。",
            "7. 返回 path（绝对路径）、count（断言条数）、summary（一句话）。如果一条都写不了，count 给 0、path 给空字符串并说明原因。",
          ].join("\n"),
        )
      }

      const verifiedDiffs = verify.diffs.filter((d) => d.verdict === "verified").length
      const outcome: BatchOutcome = {
        batch: spec.id,
        modules: audit.modules.length,
        reportPath: reportPath,
        diffs: verifiedDiffs,
        verified: verifiedDiffs,
        assertPath: assertResult.path,
        asserts: assertResult.count,
        assertKept: false,
        note: assertResult.summary,
      }
      report(
        {
          batch: spec.id,
          modules: outcome.modules,
          diffs: outcome.diffs,
          verified: verifiedDiffs,
          asserts: assertResult.count,
          status: "待验断言",
        },
        "batches",
      )
      return outcome
    } catch (error) {
      log("批次 " + spec.id + " 中断：" + String(error).slice(0, 160))
      return {
        batch: spec.id,
        modules: spec.files.length,
        reportPath: reportPath,
        diffs: 0,
        verified: 0,
        assertPath: "",
        asserts: 0,
        assertKept: false,
        note: "本批未完成：" + String(error).slice(0, 160),
      }
    }
  }),
)

phase("逐条校验新增断言")
const kept: string[] = []
const dropped: string[] = []
for (const outcome of outcomes) {
  if (outcome.assertPath === "") continue
  const exists = await world.run("test", ["-f", outcome.assertPath])
  if (exists.exitCode !== 0) {
    outcome.note = "断言文件未生成：" + outcome.assertPath
    report(
      { batch: outcome.batch, modules: outcome.modules, diffs: outcome.diffs, verified: outcome.verified, asserts: 0, status: "断言缺失" },
      "batches",
    )
    continue
  }
  const run = await world.run("node", [PROJECT + "/tests/run-assertions.mjs"], { timeoutMs: 300000 })
  if (run.exitCode === 0) {
    outcome.assertKept = true
    kept.push(outcome.assertPath)
  } else {
    await world.run("rm", [outcome.assertPath])
    dropped.push(outcome.assertPath)
    outcome.note = "断言未通过，已删除：" + outcome.note
  }
  report(
    {
      batch: outcome.batch,
      modules: outcome.modules,
      diffs: outcome.diffs,
      verified: outcome.verified,
      asserts: outcome.assertKept ? outcome.asserts : 0,
      status: outcome.assertKept ? "断言已锁" : "断言已删",
    },
    "batches",
  )
}

phase("跑完整门禁")
let firstGate = await world.run("node", [PROJECT + "/scripts/gate.mjs"], { timeoutMs: 1200000 })
if (firstGate.exitCode !== 0) {
  // 2026-10-30 凌晨实测：同一棵树 05 点门禁 22 项布局全崩 + tsc/断言/vitest 无法判定，一小时后同树全绿——
  // 高负载下子进程整批崩溃会伪装成「门禁红」。真红项是确定性的，崩溃是瞬时的：非零先复跑一次再裁决。
  log("门禁首轮非零，复跑一次再裁决")
  firstGate = await world.run("node", [PROJECT + "/scripts/gate.mjs"], { timeoutMs: 1200000 })
}
let gateExit = firstGate.exitCode
let gateTail = (firstGate.stdout + firstGate.stderr).trim().split("\n").slice(-12).join("\n")
if (gateExit !== 0 && kept.length > 0) {
  // 门禁红了：先把今晚新增的断言全部撤掉，再跑一次，确认红是断言引入的还是本来就有。
  for (const path of kept) {
    await world.run("rm", [path])
  }
  const afterDrop = await world.run("node", [PROJECT + "/tests/run-assertions.mjs"], { timeoutMs: 300000 })
  const secondGate = await world.run("node", [PROJECT + "/scripts/gate.mjs"], { timeoutMs: 1200000 })
  gateExit = secondGate.exitCode
  gateTail = (secondGate.stdout + secondGate.stderr).trim().split("\n").slice(-12).join("\n")
  if (afterDrop.exitCode !== 0) {
    dropped.push("（删除新增断言后断言套件仍红，说明与夜间改动无关，需人工看）")
  }
  for (const outcome of outcomes) {
    if (outcome.assertKept) {
      outcome.assertKept = false
      outcome.note = "全量门禁未通过，已撤回断言：" + outcome.note
    }
  }
  kept.length = 0
  log("门禁未通过，已撤回今晚新增的全部断言")
}

phase("写早间报告")
const paths = outcomes.map((o) => o.reportPath).join("\n")
const digest = outcomes
  .map((o) => "批次" + o.batch + " 模块" + o.modules + " 复核差异" + o.diffs + " 断言" + (o.assertKept ? o.asserts : 0))
  .join("\n")

const synthesizer = agent("汇总员", {
  system:
    "你是夜间审计汇总员。你写的每一句话都要能在批次报告里找到出处；找不到的宁可不写。" +
    "面向的读者是明天上午继续做这个插件的人，他需要知道先改哪里、改多少、以及哪些结论其实还没验证。",
})
await synthesizer.ask(
  [
    "20 个批次的对账报告已写盘，逐个读取：",
    paths,
    "",
    "格式约定见 " + REPORT_DIR + "/README.md。",
    "",
    "请写 " + REPORT_DIR + "/MORNING-REPORT.md，面向明天上午继续做插件的人，包含：",
    "1. 一句话结论。",
    "2. 覆盖情况：完成批次数、覆盖模块数、复核通过的差异条数。",
    "3. 差异清单：按「改动成本 / 收益」排序，最多 20 条，每条给 模块 + 现状 + ZCode 值 + 证据 + 一句建议动作。",
    "4. 已加固成回归断言的条目数。",
    "5. 待人工裁决的条目（复核不通过或证据不足）。",
    "6. 未覆盖与未验证项，必须明确列出，不许含糊。",
    "",
    "汇总数据（供核对，不要直接抄）：",
    digest,
    "",
    "不要编造：报告里每个数字都必须能在 batch-*.md 里找到出处。",
  ].join("\n"),
)

const reader = await agent("独立审读员", {
  system:
    "你只读文本，不做代码核查。「看起来不错」不是你的答案，挑毛病才是。",
}).ask(
  [
    "只凭文本审读这份夜间审计报告：" + REPORT_DIR + "/MORNING-REPORT.md",
    "",
    "回答三个问题，每条给具体段落：",
    "1. 哪些结论没有证据支撑，或者证据在报告里看不到？",
    "2. 哪句话明天开工的人会误解？",
    "3. 明天开工最可能还缺哪一个信息？",
    "不要重写报告，只给意见。",
  ].join("\n"),
)

await synthesizer.ask(
  [
    "独立审读员对 MORNING-REPORT.md 提了这些意见，按意见修订报告（覆盖原文件）：",
    reader,
    "",
    "只改报告，不要改 batch-*.md。修订后报告里仍不许出现没有出处的新数字。",
  ].join("\n"),
)

await world.run("cp", [REPORT_DIR + "/MORNING-REPORT.md", "MORNING-REPORT.md"])
await artifact.file("morning", "MORNING-REPORT.md", {
  title: "夜间审计早间报告",
  description: "96 个模块与 ZCode 设计语言的对账结果、已加固的回归断言，以及明天该先改哪里。",
  primary: true,
})

phase("追加深挖：交叉复检与无参照补采")
const extras: ExtraRow[] = []
const crossTargets = [...auditExtras].sort((a, b) => b.diffs - a.diffs).slice(0, 3)
const gapTargets = auditExtras.filter((e) => e.noReference.length > 0)
log(
  "交叉复检批次：" + crossTargets.map((t) => t.batch).join("、") +
    "；无参照补采批次：" + gapTargets.map((t) => t.batch).join("、"),
)

const filesOfBatch = (id: number) => {
  for (const b of BATCHES) {
    if (b.id === id) return b.files
  }
  return [] as string[]
}

const crossRuns = crossTargets.flatMap((target) => {
  const list = filesOfBatch(target.batch)
    .map((f) => "- src/client/" + f)
    .join("\n")
  return ["甲", "乙", "丙"].map((lens) =>
    (async () => {
      const row: ExtraRow = {
        row: "批次" + target.batch + "·交叉" + lens,
        batch: target.batch,
        kind: "交叉复检·" + lens,
        path: REPORT_DIR + "/cross-" + target.batch + "-" + lens + ".md",
        found: 0,
        absent: 0,
        status: "进行中",
      }
      extras.push(row)
      try {
        await agent("交叉审计·批次" + target.batch + "·" + lens, {
          system:
            "你是 ZCode 设计语言对账审计员（三方交叉复检的一方）。你只读，不改 src/tests 下任何文件。" +
            "证据高于直觉：任何数值都必须说清是从设计语言文档的哪一节读到的，或从 asar 里用哪条命令提取的。" +
            "查不到就写「无参照」，严禁编造 ZCode 的取值。需要活宿主实测而没有条件的，标为未验证而不是猜。",
        }).ask(
          [
            "独立重审以下模块。这是三方交叉的第一方：不要读任何 batch-*.md 或 cross-*.md（别人的结论一律不看），自己从头取证。",
            "项目根目录：" + PROJECT,
            "设计语言文档目录：" + DL,
            "ZCode 参照物：" + ASAR + "（341MB，用 grep -a 提取）",
            "",
            "本批模块：",
            list,
            "",
            "步骤：",
            "1. 先读 " + REPORT_DIR + "/README.md（产出格式）和 " + DL + "/README.md（文档索引）。",
            "2. 按模块内容挑 1 到 4 篇最相关的设计语言文档；不要整读 04-open-gaps.md，只按需 grep。",
            "3. 逐模块列出设计决策点（颜色令牌、圆角、间距、字号行高、动效、图标、阴影、交互反馈），逐项查 ZCode 参照：先查文档实测记录，再查 asar。",
            "4. 分三类写进 " + row.path + "：差异项（最多 12 条，必须带证据）、一致项（3 到 10 条）、无参照项（最多 5 条，附你搜过的模式）。",
            "5. 格式严格照 README.md。写完后只回复一行：「已完成，差异 N 条」。",
            "",
            "铁律：只新建 " + row.path + " 这一个文件；不得读 batch-*.md 与 cross-*.md；不得改 src、tests、已有文档。",
          ].join("\n"),
        )
        row.status = "已写盘"
      } catch (error) {
        row.status = "未完成：" + String(error).slice(0, 100)
        row.path = ""
      }
      report({ row: row.row, batch: row.batch, kind: row.kind, found: 0, absent: 0, status: row.status }, "extras")
    })(),
  )
})

const gapRuns = gapTargets.map((target) =>
  (async () => {
    const row: ExtraRow = {
      row: "批次" + target.batch + "·补采",
      batch: target.batch,
      kind: "无参照补采",
      path: REPORT_DIR + "/gapfill-" + target.batch + ".md",
      found: 0,
      absent: 0,
      status: "进行中",
    }
    extras.push(row)
    try {
      const res = await agent("补采员·批次" + target.batch, {
        system:
          "你是 asar 补采专员。只读，不改 src、tests 或设计语言文档；你的产出只有一个 gapfill 文件。" +
          "证据高于直觉：每条结论都要附你实跑的 grep 命令与命中原文；搜不到也要写清搜过哪些模式。禁止凭印象下结论。",
      }).ask<GapfillResult>(
        [
          "项目：" + PROJECT + "；asar：" + ASAR + "（341MB，用 grep -a 提取）；设计语言文档目录：" + DL,
          "",
          "下面是本批审计时查不到 ZCode 参照而跳过的条目。逐条再挖一次，尽力给出结论：",
          JSON.stringify(target.noReference),
          "",
          "本批模块：" + filesOfBatch(target.batch).map((f) => "src/client/" + f).join("、"),
          "",
          "方法：对每条先推断 ZCode 侧可能的载体（i18n 键、CSS 类名、组件名、tailwind 类），用 grep -a -o 去 asar 里找；也可翻设计语言文档里此前未被引用的章节。挖不到的判「确认无参照」，但必须列出你搜过的全部模式。",
          "把结果写成 " + row.path + "：每条一段——条目、搜索过的模式清单、命中原文（或确认无命中）、最终判定。",
          "",
          "铁律：只新建 " + row.path + " 这一个文件。返回 found（升级为有参照的条数）、absent（确认无参照的条数）、summary（一句话）。",
        ].join("\n"),
      )
      row.found = res.found
      row.absent = res.absent
      row.status = "已写盘：" + res.summary
    } catch (error) {
      row.status = "未完成：" + String(error).slice(0, 100)
      row.path = ""
    }
    report({ row: row.row, batch: row.batch, kind: row.kind, found: row.found, absent: row.absent, status: row.status }, "extras")
  })(),
)

if (crossRuns.length + gapRuns.length === 0) {
  await world.run("echo", ["no-extra-targets"])
}
await Promise.all([...crossRuns, ...gapRuns])

phase("增补汇总")
const doneExtras = extras.filter((e) => e.path !== "")
let supplementWritten = false
if (doneExtras.length > 0) {
  await agent("增补汇总员", {
    system:
      "你是增补报告汇总员。你写的每一句话都要能在引用的文件里找到出处；找不到的宁可不写。面向的读者是上午继续做插件的人。",
  }).ask(
    [
      "以下增补文件已写盘，逐个读取：",
      doneExtras.map((e) => e.path).join("\n"),
      "",
      "背景：主对账报告是 " + REPORT_DIR + "/MORNING-REPORT.md，可读取其差异清单作对照。",
      "",
      "请写 " + REPORT_DIR + "/MORNING-REPORT-SUPPLEMENT.md，包含三节：",
      "1. 交叉复检：对每个交叉批次，三方（甲乙丙）彼此一致的结论（高置信）与互相矛盾的结论（逐条列明各方说法），并对照原批次报告 batch-<N>.md 指出谁对谁错（能判定时）。",
      "2. 无参照补采：从「无参照」升级为「有参照」的条目（附证据）；确认无参照的条目（附已搜索模式清单）。",
      "3. 对早间报告的影响：哪些原结论被加固、哪些被削弱或推翻。",
      "",
      "每个数字都必须能在上述文件里找到出处；某节无材料就写明「本节为空」。",
    ].join("\n"),
  )
  await world.run("cp", [REPORT_DIR + "/MORNING-REPORT-SUPPLEMENT.md", "MORNING-REPORT-SUPPLEMENT.md"])
  await artifact.file("supplement", "MORNING-REPORT-SUPPLEMENT.md", {
    title: "增补报告：交叉复检与无参照补采",
    description: "对差异最多的三个批次的三方交叉复检结论，以及原「无参照」项的 asar 补采结果。",
  })
  supplementWritten = true
  log("增补报告已写盘，增补文件 " + doneExtras.length + " 份")
} else {
  await world.run("echo", ["no-extra-output"])
  log("增补阶段无产出，跳过增补报告")
}

const totalModules = outcomes.reduce((sum, o) => sum + o.modules, 0)
const totalDiffs = outcomes.reduce((sum, o) => sum + o.diffs, 0)
const totalAsserts = outcomes.reduce((sum, o) => sum + (o.assertKept ? o.asserts : 0), 0)
const unfinished = outcomes.filter((o) => o.note.startsWith("本批未完成"))
const gapFound = extras.reduce((sum, e) => sum + e.found, 0)
const gapAbsent = extras.reduce((sum, e) => sum + e.absent, 0)
const extrasFailed = extras.filter((e) => e.status.startsWith("未完成")).length

log("收口：模块 " + totalModules + " 个，复核通过差异 " + totalDiffs + " 条，断言 " + totalAsserts + " 条")

return {
  conclusion:
    "夜间对账覆盖 " + totalModules + " 个模块、" + outcomes.length + " 个批次，复核通过可修的差异 " +
    totalDiffs + " 条，新增回归断言 " + totalAsserts + " 条（保留 " + kept.length + " 份文件，删除 " + dropped.length +
    " 份）；全量门禁 exit " + gateExit + "。增补：交叉复检批次 " +
    (crossTargets.length > 0 ? crossTargets.map((t) => t.batch).join("、") : "无") +
    "，补采升级 " + gapFound + " 条 / 确认无参照 " + gapAbsent + " 条。",
  findings: [
    ...outcomes.map((o) => ({
      where: o.reportPath,
      what: "批次" + o.batch + "：复核通过差异 " + o.diffs + " 条，断言 " + (o.assertKept ? o.asserts : 0) + " 条（" + o.note + "）",
      evidence: "见该批次报告与独立复核记录",
      status: o.note.startsWith("本批未完成") ? "unconfirmed" : "verified",
      severity: o.diffs > 0 ? "medium" : "low",
    })),
    ...(supplementWritten
      ? [
          {
            where: REPORT_DIR + "/MORNING-REPORT-SUPPLEMENT.md",
            what:
              "增补：交叉复检批次 " + crossTargets.map((t) => t.batch).join("、") +
              "；无参照补采升级 " + gapFound + " 条、确认无参照 " + gapAbsent + " 条",
            evidence: "见 cross-*.md、gapfill-*.md 与增补报告",
            status: extrasFailed > 0 ? "unconfirmed" : "verified",
            severity: "low",
          },
        ]
      : []),
  ],
  verified: [
    "断言套件 node tests/run-assertions.mjs 逐批跑过，红的那批文件已删除",
    "全量门禁 node scripts/gate.mjs exit " + gateExit,
    "门禁尾部输出：" + gateTail.slice(0, 400),
    supplementWritten
      ? "增补报告已写盘：" + REPORT_DIR + "/MORNING-REPORT-SUPPLEMENT.md"
      : "增补阶段无产出（无交叉/补采目标或全部失败）",
  ],
  notCovered: [
    "活宿主体感与渲染结果未验证：夜间不改代码、不重启 ZCode、不连 CDP",
    unfinished.length > 0 ? "未完成批次：" + unfinished.map((o) => o.batch).join("、") : "全部批次完成",
    "CDP 实测项仅在文档已有记录时引用，未在今晚重新采样",
    ...(extrasFailed > 0 ? ["增挖未完成 " + extrasFailed + " 项，明细见 extras 表"] : []),
  ],
}
