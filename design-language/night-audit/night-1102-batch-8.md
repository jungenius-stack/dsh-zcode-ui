# 夜跑批次 8 · 收尾（2026-11-02 凌晨，夜班子代理）

> 判定表结论：mermaid/footnote 双边无面（mermaid 留观察）；矩阵回填完成（实算口径闭合）；夜跑报告产出。

## mermaid / footnote 面验证（预计 ➖ 兑现）

- 9224：mermaid 0 样本、footnote 0 样本；9223：双 0。
- message.tsx：mermaid 插件在 streamdownPlugins 里（有实现、无样本）；footnote 0 命中（无支持）。
- 判定：mermaid = ZCode 有实现但双端当前无样本，**登记留观察**（出样本即对照）；footnote = 双边无此面 ➖。

## 矩阵回填（commit 61625fa）

- G1 / G4 🟡 → ✅（批次 7 落码 + 断言，锚点改 asar css-module 静态提取）。
- 统计实算校验：A-F 64 格（含 F1/F3/F6/F10 复合状态列）+ G 域 5 格 = 69；
  **✅52 / 🟡1 / ❌0 / ➖12 / 🔀3 / ❓1** 与统计表逐格一致。🟡 仅剩 B9（DSH 正文插图无样本，出样本即关）。
- 小面（kbd/selection/del/sup/sub/mark/task-list/footnote/mermaid）不占格——双边默认一致或无面，
  记录在 night-1102-batch-2/3/5/6/8.md，矩阵注记④指向。

## 上游哨兵 + 断言加固（第二级，随批次 8 一并交付）

- 哨兵（commit 3dc542d）：`scripts/verify-asar-freshness.mjs` 读装机 asar 的 styles-*.css sha256
  与 `docs/baseline.json.structure.zcodeAsarStyles`（由 baseline.mjs 采集生成）比对；
  gate.mjs 独立步骤挂接（规避 package.json 禁触——baseline.mjs 校验 LAYOUT 数组与 test:layout 一致）；
  三种行为实跑验证：基线缺失红 / 哈希一致绿 / 无 ZCode 机器 SKIP。基线值 = sha256 06eedaea…（asar mtime 2026-10-29，与 17 号「10-28 后更新过一次」吻合）。
- 断言加固（commit 51171a8）：B5-B9 十五条防删失（值全部取自既有规则文本）+ 阴影反向守卫；
  红绿双向验证（破坏 B8 斜体 + B5 banner 内距 → 红；git 还原 → 绿）。

## 双主题复核（第三级低成本部分）

- 9224 = dark theme-zai-dark、9223 = theme-zai-light（浅色下全前景 #262626 / 暗色 #d4d4d4，令牌双主题链在位）。
- 批次 1R/7 落码全部走 `--dsw-alias-*` 令牌（label-primary / border-l2 / radius-xl），双主题正确性由令牌链保证；
  物理切主题逐格重采**未做**——理由：9223 浅色会话是用户流式区（禁触），9224 切主题需人手开设置页
  （B12 经验：CDP 打不开设置页），无人值守下不可逆风险 > 证据边际价值。留晨间用户在场时补。

## 遗留（全部显式登记）

1. 批次 4：DSH 正文 markdown a 样本出现时——ZCode hover 真值已锁（no-underline→hover dotted offset-4），届时落差集。
2. 批次 7：展开态活体目检（bash 工具卡圆角/边观感 + 思考块竖线形态）——用户在场时补。
3. B9：DSH 正文插图样本出现时按已更正真值（max-h-90 rounded-xl 无阴影）对照关格。
4. C12：仍 ❓（需用户决策的活体复现，非夜跑可动）。
5. bg-muted/15 死类：上游若补 --color-muted，TC4 底色对齐重开（哨兵会先报上游更新）。
