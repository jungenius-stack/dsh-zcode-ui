# 更新日志

[English](CHANGELOG.md)

**dsh-zcode-ui** 的发布日志。本包 fork 自 [dsh-codex-ui](https://github.com/MichengAI/dsh-codex-ui)@1.1.34，上游在该版本之前的完整历史见 [docs/UPSTREAM-CHANGELOG.zh-CN.md](docs/UPSTREAM-CHANGELOG.zh-CN.md)。

## 1.1.0 - 2026-10-13

### 新增

- **字号刻度补三档展示档。** `--dsw-font-size-title`(20px)、`--dsw-font-size-headline`(22px)、`--dsw-font-size-display`(34px)，均由基准以 `calc()` 推导。这三个值此前是 `docs/ZCODE-DESIGN.md` §3.2 里登记的「刻度外例外」；按原值收归后**没有任何视觉变化**——它把「我们在这里破了规矩」变成「规矩本来就覆盖这里」。
- **动效改为按意图分档的令牌。** 反馈 120ms、移动 180ms、进入 160ms、退出 120ms、按压 90ms。原先统一的 `180ms ease-out` 是一致，但不是**设计过**——出现、移动、消失同速，读起来是「没做动效」。新曲线均无过冲，不违反 ZCode「避免弹簧感」。减少动态效果也从「逐个元素写 `transition:none`」变成令牌层一处归零。
- `src/client/foreign-content-contract.ts` —— 第三方内容在侧栏内的三条契约（文字色不得高于 `secondary`、不得自带不透明卡片底、折叠态必须可降级），以及一个运行时哨兵：契约锚点类名消失时响亮报警。
- `tests/design-system.assert.ts` —— 设计系统本身进入断言覆盖：字号刻度、动效意图、外来内容锚点、签名细节。
- `scripts/verify-a11y-and-overflow.mjs` —— 把可读性与溢出变成自动判据：对比度（WCAG 2.1 AA，明暗两套）、建议卡标签是否被截断、折叠轨是否横向溢出。已接入 `gate` 与 `test:layout`，真机脚本由 11 个增至 12 个。

### 变更

- **`11px` 归一为 `12px`**（4 处）。`11px` 是夹在 `xs`(10px) 与 `sm`(12px) 之间的孤值，为它补一档等于把孤值合法化。这是一次有意的小幅视觉变更。
- 工作区分组标题字重 `600` → `400`，与侧栏既有约定一致（其标题与标签有意保持 400，且有断言守护）。分组层级改由披露箭头、缩进与明度表达。
- 连接器标题字重 `650` → `600`——`650` 在本系统里别处不存在。
- `tests/conversation-visuals.assert.ts` 的动效断言改为断言**使用哪一档意图**，不再锁死时长；调整数值不会误报，改动意图则会立刻变红。
- 空状态改为说明「下一步做什么」，而不只是「这里没有东西」：`workspace.empty`、`workspace.recentEmpty`、`search.empty`、`settings.noResults`。
- **侧栏文字色阶按侧栏底色重新取值。** ZCode 的 `foreground-subtle` / `foreground-subtlest` 是叠在**白底**上推导的，落到侧栏 `#f0f0f0` 上实测只有 3.93:1 与 2.32:1。现：亮色 secondary `#777777` → `#5c5c5c`（5.87:1）、tertiary `#9f9f9f` → `#686868`（4.89:1）；暗色 tertiary `#4f4f4f` → `#828282`（4.82:1）。
- 选中态底色改为中性（`#efefef` / `#3a3a3a`），不再用 ZCode 的蓝色 accent，与侧栏自身的选中语言一致。
- 新建会话页的建议卡标签改为两行显示，不再在 1440px 下被切断在半词处。
- 第三方计费卡收敛到侧栏字号并去掉白底卡片；折叠轨里直接隐藏——此前它的文字被裁成碎片。
- 折叠轨图标补 `title` 提示。
- 设置页次要文字 `#737373` → `#6b6b6b`。
- 所有图标统一从 `src/client/zcode-icons.tsx` 取；除它之外没有任何模块直引 `lucide-react`。
- 日志前缀统一为 `[dsh-zcode-ui]`。

### 修复

- 未净化的截图已从**整个 git 历史**中清除。它们此前只是从工作区删除，仍可按提交号下载——包括文档里引用过的那些提交号，现已改为按说明引用。

### 移除

- `debug/` 整目录、上游营销 banner、一张无引用截图（同样已从历史清除）。

## 1.0.0 - 2026-10-12

Fork of dsh-codex-ui@1.1.34：继承其侧栏 / 工作区会话树 / 设置页骨架与数据层（SlotRegistry + ctx，零改动），在其上叠加 ZCode 视觉语言：

- Zai Light / Zai Dark 双色板全量写入 `--dsw-*`（画布 `#f8f8f8` / `#161616`，色值逐像素对照 zai-org/ZCode v3.15.1 核验）。
- ZCode 侧栏几何：8px 圆角、32px 行高、150ms ease-out 过渡、Lucide 图标。
- 主题以宿主 `data-ds-dark-theme` 属性为唯一真源（不读 `prefers-color-scheme`，修复宿主浅色 + 系统深色时侧栏与内容区明暗撕裂）。
- `src/` 中消费的每个 `--dsw-*` 令牌都在映射表内有定义，由 `token-coverage` 断言强制保障。
- 会话标题独立子插件（LLM 生成，可单独启停）。
