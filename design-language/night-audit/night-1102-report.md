# 夜跑报告 · 正文区全要素（2026-11-02 凌晨）

> 执行：夜班子代理（无人值守）｜ 依据：19 号计划 + 加力指令（三级队列）｜ 主会话批次 1（7387ce3）之后接续。
> **最终状态：全部批次收口，gate exit 0，工作树干净，未 push。**

## 各批一句话结论

| 批次 | 结论 | commit |
|---|---|---|
| 批次 1R | 码卡头部文字色**死类实锤**（text-muted-foreground 在活体全部 888 条规则 0 定义→实际渲染=继承全前景），头部/语言标签提亮全前景 + 动作钮 28×28/r8（button.tsx icon-md=size-7 rounded-lg 三源）；语言标签 mono 已就位、lowercase 不落（中文无大小写语义） | 8ea8f7d |
| 批次 2 kbd | ➖ **prose kbd 是死规则**（正文 41 个流元素 0 个 .prose 祖先 + message.tsx 0 prose + 双端 kbd 样本 0）——18 号候选 1「baseline≠组件真值」第二实锤，双默认一致不落码 | 记录 |
| 批次 3 ::selection | ➖ 计划预判反转：`::selection{color:#0000}` 属 **xterm 无障碍树**（辅助影子层）非正文；双边正文均浏览器默认，不落码 | 记录 |
| 批次 4 链接 hover | ZCode 真值双源锁定（no-underline→hover dotted offset-4）；DSH 正文 a 无样本（31 个 markdown 容器 0 a）+ 宿主应用层无 a reset → 留 ❓ 出样本再落；fileLink 常驻 dotted 是宿主自有面登记不动 | 记录 |
| 批次 5 del/sup/sub/mark | ➖ 双默认一致（仅 preflight 标准层，双端样本全 0） | 记录 |
| 批次 6 task-list | ➖ 双边无此面（streamdown 插件集无 task-list，双端样本 0） | 记录 |
| 批次 7 TC4/G4 | **🟡→✅ 落码**：锚点从 DSH asar css-module 静态提取（Q2dzhW/TXqvFW，**绕开了在用户会话区滚动+点击的写操作**）；TC4 落 radius xl/边 1px l2/内距 12、G4 落竖线 ml8+border-l1+pl14 + 8 断言；三项显式不落（bg-muted/15 死类底色 / 密度限高 / 用户字号令牌） | e6d2af2 |
| 批次 8 收尾 | mermaid 留观察（ZCode 有实现无样本）、footnote ➖；矩阵回填 G1/G4 ✅（实算 52✅/1🟡/12➖/3🔀/1❓=69 逐格闭合） | 61625fa |
| 二级·哨兵 | asar sha256 哨兵入 baseline.json + 接 gate 独立步骤（规避 package.json 禁触）；基线缺失/哈希变/一致/无 ZCode 四种行为实跑验证 | 3dc542d |
| 二级·断言加固 | B5-B9 十五条防删失 + 阴影反向守卫（值全取既有记录，红绿双向验证） | 51171a8 |
| 三级·双主题 | 低成本部分完成：双端主题确认（dark zai-dark / light）、落码全走 alias 令牌双主题链在位；**物理切主题逐格重采未做**（9223 浅色=用户流式区禁触 + 设置页 CDP 打不开），留晨间 | 记录（batch-8） |

## commit 列表（本轮 7 个，含主会话批次 1 共 8 个夜跑 commit）

```
61625fa docs(matrix): 夜跑批次回填——G1/G4 落码收口🟡→✅ + 夜跑推进注记
51171a8 test(coverage): B5-B9 断言加固扫荡（红绿双向验证过）
add2859 chore: 同步批次 7 构建产物（lib 部署副本）
3dc542d feat(sentinel): ZCode 上游哈希哨兵（CODE-030 防线）
e6d2af2 feat(tool-card): 批次7 TC4/G4——展开体+推理竖线
8ea8f7d fix(code-block): 批次1R 遗留复核收口
7387ce3 feat(code-block): 批次1 头部条对齐（主会话）
```

## gate 记录

每批四步构建（tsc → tsdown → sync-dist → gate）exit 0 后 commit；最终复跑 gate exit 0
（断言套件 0 新增失败 / vitest 全过 / 布局 22 通过 / 上游哨兵通过）。未执行 git push。

## 遗留（晨间清单）

1. **批次 4**：DSH 正文出现 markdown a 样本时落 hover 差集（ZCode 真值已锁，颜色仍不动=F6）。
2. **批次 7 活体目检**：展开一条 bash 工具卡看圆角/边观感 + 思考块竖线形态（用户在场时）。
3. **B9**：DSH 正文插图样本出现即按已更正真值关格（矩阵唯一剩余 🟡）。
4. **C12**：仍 ❓，需用户决策的活体复现。
5. **bg-muted/15 死类**：上游补 --color-muted 后 TC4 底色重开（哨兵会先报上游更新）。
6. **三级全量**：切主题逐格重采（B7/⑧/码卡浅色）留用户在场；ZCode 侧同理切回暗色。

## 方法论收获（回写候选）

- **「锚点缺→等活体」可被 asar css-module 静态提取替代**：DSH 宿主的 css-module 源码直接给出
  展开态类名与结构，TC4/G4 因此零写操作落码（不需要在用户会话区滚动+点击）。
- **死类三连**（text-muted-foreground / bg-muted/15 / prose kbd 选择器）：「源码写了类名」与
  「编译产物有该规则」是两回事，落码前必须 grep 编译产物——18 号候选 1 的验证器规则三次兑现。
- **计划文档真值要带选择器上下文**：批次 3 的「::selection 必有配套 background」与批次 2 的
  「ZCode 真值已有 prose kbd」都因脱离选择器上下文而误判，核实成本远低于照抄成本。

## DoD 自检

1. 每批记录齐全（night-1102-batch-1/1R(并入1记录留痕)/2/3/4/5/6/7/8.md）✅
2. 每批 gate exit 0 才 commit，中文信息含真值来源与判定依据 ✅
3. 禁触清单零触犯（package.json / CHANGELOG / version-ledger / Page.reload / 流式区写操作）✅
4. 双源铁律：全部落码项三源（GitHub v3.17.1 + 编译产物 + 活体或 asar 静态）✅
5. 未 push ✅
6. 加力三级队列：一级全清、二级全清（遗留复核全清/断言加固/哨兵）、三级低成本部分完成+剩余显式留晨间 ✅

**【正文区夜跑完成】**
