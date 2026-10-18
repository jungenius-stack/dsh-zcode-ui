import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ZIconTelescope, ZIconHammer, ZIconScanLine, ZIconBug } from './zcode-icons.tsx'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import type { PrefillResult, DraftPresenceSource } from './new-conversation-draft.ts'
export type { PrefillResult } from './new-conversation-draft.ts'

/**
 * 四个建议卡共用**唯一**图标色。
 *
 * 2026-10-18（设计审计 P0-1）：原先每张卡各带一个高饱和 hex
 * （蓝 `#27aaff` / 紫 `#a478e8` / 绿 `#44bd83` / 橙 `#f48235`），是从上游 Codex
 * 的建议卡 fork 时一起搬过来的。ZCode 的语言里颜色只有两种身份——**明度档** 与
 * **唯一语义色（橙，峰值状态）**；再引入四个装饰性色相等于造出第三种身份，
 * 直接稀释唯一语义色的信号强度。四张卡靠图标形状区分即可。
 *
 * 同时它是全仓亮色档唯一不达 3:1 的图标：实测蓝 2.54 / 紫 3.27 / 绿 2.37 /
 * 橙 2.60（on `#ffffff`），全部低于非文本对比度要求。收成单色顺带修掉这一点。
 *
 * ⚠ 这里必须用**宿主 `--dsw-alias-*` 令牌**，不能用 `--dcu-sidebar-icon`：
 * 本组件经 portal 挂到宿主 hero 区（`[data-phase=hero] …`, 见下方 useEffect），
 * 不在 `.dcu-root / .dcu-settings-page` 作用域内 —— 实测 `--dcu-sidebar-icon`
 * 在 hero 区未定义，`var()` 会解析失败回退成继承色（黑）。宿主令牌挂在
 * `:root:root`，作用域全覆盖，与同目录 `new-conversation-style.ts` 的既有写法一致。
 */
const ICON_COLOR = 'var(--dsw-alias-menu-icon)'

const categories = [
  { id: 'explore', label: 'home.explore', tasks: [{ label: 'home.explore.task1', prompt: 'home.explore.prompt1' }, { label: 'home.explore.task2', prompt: 'home.explore.prompt2' }], Icon: ZIconTelescope },
  { id: 'build', label: 'home.build', tasks: [{ label: 'home.build.task1', prompt: 'home.build.prompt1' }, { label: 'home.build.task2', prompt: 'home.build.prompt2' }], Icon: ZIconHammer },
  { id: 'review', label: 'home.review', tasks: [{ label: 'home.review.task1', prompt: 'home.review.prompt1' }, { label: 'home.review.task2', prompt: 'home.review.prompt2' }], Icon: ZIconScanLine },
  { id: 'fix', label: 'home.fix', tasks: [{ label: 'home.fix.task1', prompt: 'home.fix.prompt1' }, { label: 'home.fix.task2', prompt: 'home.fix.prompt2' }], Icon: ZIconBug },
] as const
const hints = { workspace: 'home.workspace', draft: 'home.draft', busy: 'home.busy' } as const
type Category = typeof categories[number]['id']
const emptyDraft: DraftPresenceSource = { getSnapshot: () => false, subscribe: () => () => {} }

/** 只向宿主标题容器贡献自己的 React portal，不搬动标题、工具条或编辑器。 */
export function NewConversationSuggestions({ t, prefill, draftSource = emptyDraft }: PropsLocale<typeof NS> & { prefill?: (text: string) => PrefillResult; draftSource?: DraftPresenceSource }) {
  const hasDraft = useSyncExternalStore(draftSource.subscribe, draftSource.getSnapshot, emptyDraft.getSnapshot)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const sync = () => setTarget(document.querySelector('[data-phase=hero] [class*="_composerHero"]>:first-child>[class$="_stack"]'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'] })
    return () => observer.disconnect()
  }, [])
  return target === null ? null : createPortal(<SuggestionCards t={t} prefill={prefill} hasDraft={hasDraft} />, target)
}

export function SuggestionCards({ t, prefill, hasDraft = false }: PropsLocale<typeof NS> & { prefill?: (text: string) => PrefillResult; hasDraft?: boolean }) {
  const [selected, setSelected] = useState<Category>()
  const [hint, setHint] = useState<PrefillResult>('ready')
  function fill(text: string) {
    const result = prefill?.(text) ?? 'workspace'
    setHint(result)
    if (result === 'ready') document.querySelector<HTMLElement>('[data-phase=hero] [data-lexical-editor=true]')?.focus()
    if (result === 'workspace') document.querySelector<HTMLButtonElement>('[data-phase=hero] [class*="_heroWorkspaceRow"]>button')?.click()
  }
  return <section className="dcu-home-suggestions" data-has-draft={hasDraft} aria-hidden={hasDraft} aria-label={t('home.suggestions')}>
    <div className="dcu-home-cards">{categories.map(({ id, label, Icon }) => <button type="button" key={id} disabled={hasDraft} className="dcu-home-card" style={{ '--dcu-home-icon': ICON_COLOR } as CSSProperties} aria-pressed={selected === id} onClick={() => { setSelected(selected === id ? undefined : id); setHint('ready') }}>
      <Icon aria-hidden="true" /><span>{t(label)}</span>
    </button>)}</div>
    {/* 所有分区共用同一网格单元，按最长内容预留高度，展开和切换不重新撑高居中区域。 */}
    <div className="dcu-home-details">{categories.map(category => <div key={category.id} className="dcu-home-tasks" data-active={selected === category.id} aria-hidden={selected !== category.id}>
      {category.tasks.map(task => <button type="button" key={task.label} className="dcu-home-task" disabled={hasDraft || selected !== category.id} onClick={() => fill(t(task.prompt))}>{t(task.label)}</button>)}
    </div>)}</div>
    <div className="dcu-home-status">{(Object.keys(hints) as Array<keyof typeof hints>).map(key => <p key={key} className="dcu-home-hint" data-active={hint === key} aria-hidden={hint !== key} role={hint === key ? 'status' : undefined}>{t(hints[key])}</p>)}</div>
  </section>
}
