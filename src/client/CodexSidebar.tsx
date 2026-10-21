import { GlobalPanelButtons, type GlobalPanelSource } from './global-panels.tsx'
import { Fragment, forwardRef, useCallback, useDeferredValue, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import {
  BrandWordmark, Input,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  ZIconBack, ZIconCollapse, ZIconChevronRight, ZIconConnectors, ZIconExperts, ZIconExtensions,
  ZIconNewTask, ZIconPlugins, ZIconSchedule, ZIconSearch, ZIconSkills, ZIconAssistant,
} from './zcode-icons.tsx'
import { auditForeignFooterContent } from './foreign-content-contract.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import { openSettingsRoot, openSettingsSection, routeOptionalSettingsSection } from './settings-navigation.ts'
import { allocateSearchQuota, filterSidebarSearchItems, type SidebarSearchItem } from './sidebar-search.ts'
import { EMPTY_COMPANION_TABS, type CompanionTabAvailability } from './companion-slots.ts'
import { ChannelBrowser } from './ChannelBrowser.tsx'
import { ScheduleBrowser } from './ScheduleBrowser.tsx'
import { isSidebarDragHandle, sidebarWidthDuringDrag, shouldCollapseOnSidebarDrag } from './sidebar-drag.ts'
import { applySidebarWidth, findSidebarFrame, parseSidebarGrid, settleSidebarMotion, SLIM_SIDEBAR_PX } from './sidebar-width.ts'
import { isTaskSession } from './workspace-browser.ts'
import { clearAutomationTaskSettingsRequest, requestAutomationTaskSettings } from './automation-task-settings.ts'
import type { UseSessionPendingInteraction, UseSessionStatus } from './session-pending.ts'
import { browserStorage, readTreeExpansionState, writeTreeExpansionState } from './tree-expansion.ts'
import { NEW_CONVERSATION_STYLE } from './new-conversation-style.ts'
import { COMPOSER_TOOL_MENU_STYLE } from './composer-tool-menus.ts'
import { DesktopNavigationControls } from './DesktopNavigationControls.tsx'
import type { NavigationHistory } from './navigation-history.ts'
import { beginSidebarSession } from './sidebar-session.ts'
import { WorkspaceShortcutBridge } from './WorkspaceShortcutBridge.tsx'
import type { WorkspaceShortcutSource } from './workspace-shortcuts.ts'
import { useShortcutLookup, type ShortcutCatalogSource } from './shortcut-catalog.ts'
import type { DraftPresenceSource } from './new-conversation-draft.ts'
import { NewConversationSuggestions, type PrefillResult } from './NewConversationSuggestions.tsx'
import type { FooterAction, FooterActionSource } from './footer-actions.ts'

type CompanionTabSource = {
  getSnapshot: () => CompanionTabAvailability
  subscribe: (onStoreChange: () => void) => () => void
}

const subscribeEmptyCompanionTabs = (): (() => void) => () => {}
const getEmptyCompanionTabs = (): CompanionTabAvailability => EMPTY_COMPANION_TABS
const emptyFooterActions: readonly FooterAction[] = []
const getEmptyFooterActions = (): readonly FooterAction[] => emptyFooterActions
const SIDEBAR_COLLAPSE_SETTLE_MS = 500
const SIDEBAR_EXPANSION_STORAGE_KEY = 'dsh-codex-ui.sidebar-expansion.v1'
const EXTENSIONS_EXPANSION_KEY = 'extensions'

function readExtensionsOpen(): boolean {
  return readTreeExpansionState(browserStorage(), SIDEBAR_EXPANSION_STORAGE_KEY)[EXTENSIONS_EXPANSION_KEY] === true
}

function writeExtensionsOpen(open: boolean): void {
  const storage = browserStorage()
  const expanded = readTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY)
  writeTreeExpansionState(storage, SIDEBAR_EXPANSION_STORAGE_KEY, { ...expanded, [EXTENSIONS_EXPANSION_KEY]: open })
}

type CodexSidebarInjected = {
  navigationHistory?: NavigationHistory
  workspaceShortcuts?: WorkspaceShortcutSource
  newConversationDraft?: DraftPresenceSource
  prefillNewConversation?: (text: string) => PrefillResult
  openSession: (sessionId: SessionId) => void
  startSession: (workspaceId?: WorkspaceId) => void
  toggleSidebar: () => void
  archiveSession: (sessionId: SessionId) => Promise<void>
  canDeleteSession?: () => boolean
  deleteSession: (sessionId: SessionId) => Promise<void>
  forkSession: (sessionId: SessionId) => Promise<void>
  moveSession: (sessionId: SessionId, targetWorkspaceId: WorkspaceId) => Promise<void>
  renameSession: (sessionId: SessionId, title: string) => Promise<void>
  openPath: (path: string) => Promise<void> | void
  useSessionPendingInteraction?: UseSessionPendingInteraction
  useSessionStatus?: UseSessionStatus
  globalPanels?: GlobalPanelSource
  footerActions?: FooterActionSource
  selectPanel?: (id: string | null) => void
  usePanelInfo?: <T>(selector: (info: { activePanelId: string | null }) => T) => T
  companionSlots?: CompanionTabSource
  /** 宿主命令目录：搜索/新建按钮的 aria-keyshortcuts 来源（与行菜单键帽同源）。 */
  shortcuts?: ShortcutCatalogSource
}

export type CodexSidebarProps =
  Omit<PropsRuntime<'sidebar'>, 'usePanelInfo'>
  & PropsRenderSlots<'sidebar.panellist' | 'sidebar.workspaces' | 'sidebar.codex.directoryFlow' | 'sidebar.settings' | 'sidebar.footer.action' | 'sidebar.channels' | 'sidebar.schedule'>
  & PropsLocale<typeof NS>
  & CodexSidebarInjected

const emptyPanels: readonly import('./global-panels.tsx').GlobalPanel[] = []
const getEmptyPanels = () => emptyPanels
const useLegacyPanelInfo = <T,>(selector: (info: { activePanelId: string | null }) => T): T => selector({ activePanelId: null })

const stylesheet = `
.dcu-global-panel[aria-current=page]{background:var(--dcu-sidebar-selected);font-weight:500}

.dcu-root{width:100%;height:100%;min-width:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;background:var(--dcu-sidebar-background);color:var(--dcu-sidebar-primary);font:14px/20px var(--dsw-font-family)}
/* 滤镜只作用于背景，避免为设置和搜索等 fixed 后代创建侧栏包含块。 */
body[data-we-sidebar-glass] .dcu-root{position:relative;background:transparent}body[data-we-sidebar-glass] .dcu-root::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.66*100%),transparent);background-image:linear-gradient(180deg,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.14)),rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.04)) 38%,rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.01)));-webkit-backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);backdrop-filter:blur(var(--we-sidebar-blur,16px)) saturate(var(--we-sidebar-saturate,1.8)) brightness(var(--we-glass-brightness,1.04)) contrast(1.01);box-shadow:inset 0 1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.32)),inset 0 -1px 0 rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.08)),inset 0 0 0 .5px rgba(255,255,255,calc(var(--we-sidebar-sheen,1)*.06))}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root::before{background-color:color-mix(in srgb,var(--we-sidebar-color,#fff) calc(var(--we-sidebar-alpha,.15)*.33*100%),transparent)}body[data-we-appwindow][data-we-sidebar-glass] .dcu-root::before{-webkit-backdrop-filter:none;backdrop-filter:none}@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){body[data-we-sidebar-glass] .dcu-root{background:#f0f0f0}body[data-ds-dark-theme][data-we-sidebar-glass] .dcu-root{background:#161616}body[data-we-sidebar-glass] .dcu-root::before{display:none}}
body[data-we-sidebar-glass] .dcu-expanded-shell,body[data-we-sidebar-glass] .dcu-compact-shell,body[data-we-sidebar-glass] .dcu-foot{position:relative}
.dcu-expanded-shell{display:flex;width:100%;min-height:0;flex:1 1 0;overflow:hidden;flex-direction:column;transform-origin:left center;transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);animation:dcu-sidebar-expanded-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-compact-shell{display:none;width:56px}.dcu-root.dcu-collapsing .dcu-expanded-shell{opacity:0;transform:translateX(-6px);pointer-events:none;animation:none;visibility:hidden;transition:opacity var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease),transform var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease),visibility var(--dcu-motion-exit-duration) var(--dcu-motion-exit-ease)}.dcu-root.dcu-compact .dcu-expanded-shell{display:none}.dcu-root.dcu-compact .dcu-compact-shell{display:flex;min-height:0;flex:1;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-sidebar-expanded-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}/* 收起时紧凑轨的淡入。**延迟一个 exit 时长再起跑**（2026-10-17）：
   此前它与展开态的 180ms 淡出同时开始，两者时长几乎相同 → 实测 8/17 帧
   「两套外壳都可见」（展开态 240px + 紧凑轨 56px 重叠），视觉上是糊在一起。
   改为「先出后进」：展开态按 exit 档 120ms 加速退场，紧凑轨延迟 120ms 再
   用 enter 档 160ms 淡入。实测重叠可见帧 8/17 → 0/16。
   animation-fill-mode:both 让延迟期间保持 from 态（opacity:0），否则会闪出一帧不透明。 */
@keyframes dcu-sidebar-compact-in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
/* ZCode 几何：8px 圆角、32px 行高、px-2/py-3/gap-1 间距、150ms ease-out 过渡。 */
.dcu-root *{box-sizing:border-box}.dcu-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;flex:none;height:var(--dcu-header-height,40px);padding:calc((var(--dcu-header-height,40px) - 32px)/2) 8px calc((var(--dcu-header-height,40px) - 32px)/2) 12px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;overflow:hidden}.dcu-brand svg{display:block;width:auto;max-width:100%;height:22px;min-width:0}.dcu-head-actions{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:4px;height:28px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-icon)}.dcu-head .dcu-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border-radius:var(--dsw-radius-lg);line-height:0}.dcu-head .dcu-icon svg{display:block;width:16px;height:16px}
.dcu-icon:hover,.dcu-menu button:hover:not(:disabled),.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 8px 8px;display:grid;gap:4px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:16px minmax(0,1fr) auto;column-gap:8px;align-items:center;width:100%;min-height:32px;padding:0 8px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-primary);font-size:var(--dsw-font-size-base);line-height:20px;text-align:left;font-weight:400}
.dcu-menu-icon{display:grid;place-items:center start;width:16px;height:16px}.dcu-menu-kbd{display:inline-flex;align-items:center;justify-content:center;gap:1px;min-width:20px;height:20px;padding:0 4px;border-radius:var(--dsw-radius-sm);background:var(--dcu-surface);color:var(--dcu-kbd-foreground,var(--dcu-sidebar-secondary));font-family:var(--dsw-font-family);font-size:var(--dsw-font-size-xs);font-weight:500;line-height:1;letter-spacing:0;white-space:nowrap;pointer-events:none;font-variant-numeric:tabular-nums}.dcu-compact-nav .dcu-menu-kbd{display:none}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extensions-group{display:grid}.dcu-extension-leading{position:relative;display:block;width:16px;height:16px}.dcu-extension-leading svg{position:absolute;inset:0;transition:opacity var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-default-icon{opacity:1}.dcu-extension-state-arrow{opacity:0;transform:rotate(0)}.dcu-extensions-group:hover .dcu-extension-default-icon,.dcu-extensions-toggle:focus-visible .dcu-extension-default-icon{opacity:0}.dcu-extensions-group:hover .dcu-extension-state-arrow,.dcu-extensions-toggle:focus-visible .dcu-extension-state-arrow{opacity:1}.dcu-extensions-toggle[aria-expanded=true] .dcu-extension-state-arrow{transform:rotate(90deg)}.dcu-extension-panel{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-panel[data-open=false]{grid-template-rows:0fr;opacity:0;pointer-events:none}.dcu-extension-panel-inner{position:relative;min-height:0;overflow:hidden}.dcu-extension-items{position:relative;display:grid;gap:1px;margin:1px 0 4px 24px}.dcu-extension-items::before{content:"";position:absolute;left:-12px;top:0;bottom:4px;width:1px;background:var(--dcu-sidebar-border)}.dcu-extension-items button{grid-template-columns:16px minmax(0,1fr);min-height:28px;padding:0 8px;border-radius:var(--dsw-radius-lg);color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-caption);font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:8px;padding-top:4px}.dcu-workspaces.dcu-workspaces-tabs{padding-top:0}.dcu-im-tabs{display:flex;gap:2px;margin:0 8px 8px;padding:2px;background:var(--dcu-surface);border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg)}.dcu-im-tab{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-im-tab[data-on=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-native-workspaces .ima-tabs,.dcu-native-workspaces [role=tablist]{display:none!important}.dcu-schedule-browser{display:flex;min-height:0;flex:1;flex-direction:column}.dcu-native-workspaces .dcu-schedule-views{display:flex!important;flex:none;min-height:30px;margin:0 8px 8px;padding:2px;border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);background:var(--dcu-surface)}.dcu-schedule-views button{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer}.dcu-schedule-views button[aria-selected=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-schedule-pane{display:flex;min-height:0;flex:1}.dcu-schedule-pane>*{min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]{display:flex!important;width:100%;min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]>.dsh-st-rail{width:100%;min-width:0;padding-right:8px;scrollbar-gutter:auto}.dcu-schedule-pane .dsh-st-overview{padding-right:8px}/* 2026-10-18（设计审计 P0-6）：页脚给上方滚动区一个交代——内容在树容器边缘被硬切，
   看起来像渲染 bug。用**上投影**（不是 mask）：投影不创建合成层，与 KNOWN-ISSUES
   §27/§31 的合成层预算结论一致；-8px 偏移 + -8px 扩散让投影只贴在页脚上沿、
   不糊到页脚内容上。暗色档单独加深（亮 .10 / 暗 .18），因为暗底上同值投影几乎看不见。
   与树底部 padding-bottom:24px 配套使用（那边留空间，这边给视觉边界）。 */
.dcu-foot{display:grid;width:100%;gap:4px;padding:8px;box-shadow:0 -8px 12px -8px rgba(0,0,0,.10);transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
body[data-ds-dark-theme] .dcu-foot{box-shadow:0 -8px 12px -8px rgba(0,0,0,.18)}
/* footer 插槽由各插件自绘（如 cost-meter 的余额卡片是块级卡片，记忆/任务/归档/设置是图标行），
   它们此前同处一个无样式容器里，视觉上粘成一片。这里补上容器内分隔与间距，
   让「插件卡片」与「工具行」自然分成两组。 */
.dcu-footer-actions{display:grid;gap:4px}
.dcu-settings-seat{margin-top:2px}
/* 外来内容契约的落地（契约正文见 foreign-content-contract.ts 与 docs/ZCODE-DESIGN.md §10）：
   只覆盖**契约锚点**（.cm-footer-stack / .cm-simple-summary / .cm-num / .cm-peak-classic），
   不匹配任意外来类名——覆盖范围必须可审查。锚点一旦被对方改名，覆盖会静默失效，
   由 foreign-content-contract.ts 的运行时哨兵报警。 */
.dcu-foot .cm-footer-stack{display:grid;gap:2px;padding:6px 8px 2px;border:0;border-radius:0;background:transparent;box-shadow:none}
.dcu-foot .cm-simple-summary,.dcu-foot .cm-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;background:transparent;font-size:var(--dsw-font-size-caption);font-weight:500;line-height:18px;color:var(--dcu-sidebar-secondary)}
.dcu-foot .cm-balance-name{color:var(--dcu-sidebar-secondary);font-weight:400}
/* 2026-10-18（设计审计 P1-3）：金额降视觉重量 —— 14/500/primary → 13/400/primary。
   事实：整条导航 100% 是 14px/400，只有这一处是 500 字重，于是页脚金额压过导航，
   与契约第 1 条的原意（「外来内容比导航更黑，导航就失去层级」）相反。
   保留 primary 色：契约第 1 条明确「只有承载数据本身的数值可以用 primary」——
   金额是数据，降级到 secondary 会让它读不出来。tabular-nums 保留（数字对齐不能丢）。 */
.dcu-foot .cm-num{font-size:var(--dsw-font-size-caption);font-weight:400;font-variant-numeric:tabular-nums;color:var(--dcu-sidebar-primary)}
.dcu-foot .cm-peak-classic{font-size:var(--dsw-font-size-sm);line-height:16px;color:var(--dcu-sidebar-tertiary)}
.dcu-foot .cm-peak-classic-chip{font-size:var(--dsw-font-size-sm);font-weight:400;color:var(--dcu-sidebar-secondary)}
/* 峰值条**文字**的语义色收敛（契约第 1 条 + 第 4 条，2026-10-16 实机抓到漏管）。
   外来插件在三个状态给文字上了语义色：
     .cm-peak-strip.peak .cm-peak-chip     → #ff9800（橙）
     .cm-peak-strip.weekend .cm-peak-chip  → #34a853（绿）
     .cm-peak-strip.off .cm-peak-chip      → var(--state-business-primary)
   契约第 4 条明确：语义色**只允许用于填充**（承载「是否峰值」的信息），
   「不得用于文字或卡片底」——文字归第 1 条管，只能用侧栏色阶。
   而 classic 分支的文字此前早已收敛，compact 分支是**漏网**（同一个「只登记了 classic 锚点」
   的根因，见 foreign-content-contract.ts 的锚点清单）。
   另外这三条都是**写死的颜色、不随明暗主题变化**：#ff9800 在浅色灰底上、
   #34a853 在深色底上的对比度都未经验证，收敛到色阶后自动跟随主题。
   填充保留：.cm-peak-high / .cm-peak-low / .cm-peak-marker 不动（第 4 条显式允许）。 */
/* ⚠ 特异性必须抬到 (0,3,0)：外来的状态规则是 .cm-peak-strip.weekend .cm-peak-chip
   （3 个类），单用 .dcu-foot .cm-peak-chip（2 个类）**会输**——实机实测覆盖不生效、
   chip 文字仍是 #34a853。这里改成 .dcu-root .dcu-foot .cm-peak-chip（3 个类，同特异性），
   靠源码顺序（插件样式在 skin 之后注入）确定性胜出。
   填充保留：.cm-peak-high / .cm-peak-low / .cm-peak-marker 不动（第 4 条显式允许）。 */
.dcu-root .dcu-foot .cm-peak-chip{color:var(--dcu-sidebar-secondary)}
.dcu-root .dcu-foot .cm-peak-rail-label,.dcu-root .dcu-foot .cm-peak-rail-classic-label{color:var(--dcu-sidebar-secondary)}
/* compact 峰值条（外来插件 peakStyle 的**默认**分支，契约见 foreign-content-contract.ts）。
   契约第 3 条要求「装不下就降级，不得横向溢出」，而外来内容给 .cm-peak-chip 写了
   white-space:nowrap 且无 min-width —— 它不肯收缩，把 .cm-peak-strip 顶到 237px（容器 208px），
   整条 .dcu-foot 因此溢出 13px、右侧文字被裁掉。这里补「可收缩 + 省略号」。
   实机验证（2026-10-16，隔离宿主真实页脚）：.dcu-foot 13px→0px、.cm-peak-strip 29px→0px。 */
.dcu-root .dcu-foot .cm-peak-strip{display:flex;align-items:center;gap:6px;margin-top:4px;min-width:0;font-size:var(--dsw-font-size-sm);line-height:16px;color:var(--dcu-sidebar-tertiary)}
.dcu-root .dcu-foot .cm-peak-chip{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:var(--dsw-font-size-sm);font-weight:400;color:var(--dcu-sidebar-secondary)}
.dcu-root.dcu-compact .cm-footer-stack,.dcu-root.dcu-collapsing .cm-footer-stack{display:none}
.dcu-settings-seat [data-slot="settings.trigger"]{color:var(--dcu-sidebar-primary)}
.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}
/* 宿主列负责缩放，宽态内容保持展开宽度，避免中文竖排与工作区逐帧重排。 */
.dcu-expanded-shell,.dcu-root:not(.dcu-compact)>.dcu-foot{width:var(--dcu-sidebar-expanded-width,240px);flex-shrink:0}
/* 对齐 Codex 的半秒布局节奏；显式声明避免依赖宿主主题的动画 token。 */
.dcu-root{position:relative}
.dcu-root.dcu-collapsing .dcu-compact-shell{position:absolute;left:0;top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,40px) - 32px)/2);bottom:8px;display:flex;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease) var(--dcu-motion-exit-duration) both}
.dcu-root.dcu-collapsing .dcu-compact-shell .dcu-icon{width:32px;height:32px;flex:none}.dcu-root .dcu-compact-shell>.dcu-icon,.dcu-root.dcu-collapsing .dcu-compact-shell>.dcu-icon{width:28px;height:28px;flex:none;margin:0;padding:0;border-radius:var(--dsw-radius-lg)}
/* 收尾仅移除宽态层，窄轨不重复淡入，否则会在半秒处闪烁。 */
.dcu-root.dcu-compact .dcu-compact-shell{animation:none}
/* 原生交通灯覆盖网页顶部；宽态、窄轨和动画层共用宿主安全区，保持页脚在窗口内。 */
.dcu-root{--dcu-sidebar-top-clearance:0px}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root{--dcu-sidebar-top-clearance:var(--dsh-frame-top-clearance,48px);padding-top:var(--dcu-sidebar-top-clearance)}
html[data-platform=darwin]:not([data-fullscreen]) .dcu-root.dcu-compact{padding-top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,40px) - 32px)/2)}
/* 侧栏开合是合成层动画（1.3.0）：网格轨道在动画期间保持静止，内容列与拖拽柄用
   transform 位移。旧实现让 grid-template-columns 直接过渡，每帧全页重排、成本随
   会话内容增长（用户实测帧率随上下文长度劣化），轨道改由 JS 在动画两端一次性切换。
   dsh-better-sidebar 的 #root 规则会覆盖 transition 简写，这里显式保留它的
   padding-right，但不再把 grid-template-columns 挂进过渡。 */
#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]){transition:padding-right var(--ds-transition-duration-slow,.3s) var(--ds-ease-in-out,cubic-bezier(.4,0,.2,1))}
#root [data-dcu-codex-sidebar-initialized][data-dragging]{transition:none}
/* 位移目标：JS 按「展开宽度 - 56」写 --dcu-sidebar-shift。**位移取 shift 的一半**。
 *
 * 几何推导（2026-10-14，用户在长对话下实测卡顿后重修）：
 * 会话内容带是**居中**的（宿主给聊天列 max-width 上限 920px）。内容列从「动画基准 1200」
 * 变为「落定后的 1384」时，居中带会自动右移一半：(1384-1200)/2 = **92 = shift/2**。
 * 因此「内容列的视觉位移」只需 shift/2 就与加宽 shift 的净效果完全等价。
 *
 * 旧写法是 width:calc(100% + shift) 配 translateX(-shift)：数学上等价，但有两个代价：
 *   1. **每一帧都在改宽度** → 整列文本重新换行排版，成本随对话长度线性增长。
 *      实测 8000 条消息（4 万节点）：动画被压成 **1 帧**、首帧 465ms（用户感知就是"卡死"）。
 *   2. 加宽瞬间内容带**先右跳 92px** 再左移回来（实测首帧带心 927 vs 应有 839），
 *      即动画开头有一次可见的突跳。
 * 去掉 width 后宽度全程恒定，浏览器无需重排：同一场景恢复到 **15~26 帧、平均 16.7ms**（60fps 基线），
 * 且首帧带心 837 约等于应有的 839、末帧精确落在收起静止位。
 *
 * 为什么取一半而不是整段：动画期间轨道钉在基准几何上（收起基准=展开列宽、展开基准=收起列宽），
 * 内容带在基准几何下的位置与「落定后的真实位置」恰好相差 shift/2，用 transform 补上这个差值即可，
 * 结束时轨道切换与 transform 归零同时发生 → 两端都不跳。
 *
 * ⚠️ 本块注释里**不得出现反引号**：它位于 CSS 模板字符串内部，一个反引号就会把模板提前截断
 * （2026-10-14 本轮就因此让 tsdown 构建失败、宿主报 failed to import）。 */
/* 位移规则（2026-10-16 性能修正）。
 *
 * JS 在动画开始就把轨道切到**目标几何**（见 sidebar-width.ts 的 beginSidebarMotion），
 * 于是内容带的天然位置**就是终点**；起点由 JS 先写死、再交回本规则过渡到 0。
 * 起点符号：收起时轨道已变窄 → 内容带天然已在收起位，要伪造展开位故起点=+shift/2；
 * 展开时相反，起点=-shift/2。
 *
 * 为什么改成了「JS 直接写 transform」而不再走 CSS 变量：
 * --dcu-sidebar-shift 是**未注册的继承型自定义属性**。写在 frame 上时，Chromium
 * 无法预知哪个后代会用 var() 消费它，只能**作废 frame 全部后代的样式**——
 * 而真实宿主里 frame 同时是会话区祖先，长对话下后代达 1.2 万个：
 *   实测单次写入：frame(1.2万后代) 44ms ／ 只含侧栏的子元素(445后代) 4ms
 * 一次开合要写多次，叠加动画期间每帧重算，就是用户报的「对话越长越卡」。
 * 改直接写 transform（非继承属性）只作废该元素自身：实测 0.3ms（快约 140 倍）；
 * 完整一次开合样式重算 172.6ms → 90.4ms，重算次数 17000 → 8000。
 * 另一处收益：@keyframes 里含 var() 会让动画无法交给合成器，去掉后重算次数直接减半。
 * 两种方案的完整对照见 docs/KNOWN-ISSUES.md §27。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column]{transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);will-change:transform}
/* 拖拽柄同曲线位移（它绝对定位于列边界，动画期间布局 left 从收起视觉位滑到展开位）。
   宿主只给展开态挂手柄，收起时它随宿主卸载，无需收起向位移。
   （2026-10-17 实测确认「可忽略」这个说法成立，不是未经验证的假设：
     left 动画期间 LayoutDuration +0.19ms / transform +0.04ms，绝对差 0.15ms，
     不值得为此引入 will-change 与层叠上下文。故保持 left 不变。） */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"]{transition:left var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 位移中的内容列会盖住侧栏列（transform 生成层叠上下文）；动画期间把外壳抬到它之上。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root{z-index:1}
/* 侧栏面自身的滑动（2026-10-19）。JS 在飞行期间把 .dcu-root 宽度钉在展开宽度，右缘用
   clip-path 从旧宽度裁到目标宽度（见 sidebar-width.ts 的 primeSidebarSlide）。
   裁剪不触发布局，所以每帧零重排；时长与曲线必须与内容列、索引栏完全一致，
   否则三者会互相追赶。内联 transition:none 用于写起点，挂上 motion 标记后移除，
   这里这条规则才接手——顺序见 beginAnimation。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root{transition:clip-path var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 两个方向都要 overflow:visible：收起时外壳仍按展开宽度渲染（裁到 56），
   展开时外壳按展开宽度淡入——列本身只有 56px，不让溢出就等于一帧切完、没有滑动。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-sidebar-column]{overflow:visible}
[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-side="sidebar"]{transition:none;width:auto;transform:none}
@media (prefers-reduced-motion:reduce){[data-dcu-codex-sidebar-initialized],#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]),[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root,[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-official-turn-navigator]{transition:none}.dcu-root.dcu-collapsing .dcu-compact-shell{animation:none}}
.dcu-native-workspaces{flex-direction:column}.dcu-native-workspaces>[data-mcp-connector-top-mount=true]{flex:none}.dcu-root .mcpConnectorLauncher,.dcu-root [data-mcp-connector-top-mount=true]{display:none!important}
.dcu-dependency-notice{margin:0 8px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:var(--dsw-radius-lg);padding:8px;color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-sm);line-height:18px}
/* ZCode 命令面板：rounded-2xl(16px) 壳、bg-menu、shadow-md、12px 分组标题 font-medium。 */
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 48%,transparent);animation:dcu-search-scrim-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-search-dialog{width:min(560px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-tip-border);border-radius:var(--dsw-radius-2xl);padding:12px;background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow);animation:dcu-search-dialog-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-search-scrim-in{from{opacity:0}to{opacity:1}}@keyframes dcu-search-dialog-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1}}.dcu-search-input{margin-bottom:8px}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);font-weight:500}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:32px;border:0;border-radius:var(--dsw-radius-lg);padding:6px 8px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dcu-sidebar-hover)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 2026-10-18（设计审计 P1-4）：命中片段高亮 + 底部键位提示。
   高亮只加字重与 primary 色，不加背景：结果的 hover/active 底已经是 var(--dcu-sidebar-hover)，
   再叠一层底色会在选中行里变成两种底色打架。 */
.dcu-search-hit{background:transparent;color:var(--dcu-sidebar-primary);font-weight:600}
.dcu-search-results{display:block}
.dcu-search-hint{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;padding:8px 8px 2px;border-top:1px solid var(--dcu-sidebar-border);color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);line-height:16px}
.dcu-search-hint span{display:inline-flex;align-items:center;gap:2px}
.dcu-search-hint kbd{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 var(--dcu-space-1);border-radius:var(--dsw-radius-sm);background:var(--dcu-surface);color:var(--dcu-kbd-foreground,var(--dcu-sidebar-secondary));font-family:var(--dsw-font-family);font-size:var(--dsw-font-size-2xs);line-height:1}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:var(--dcu-space-4) 8px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption)}@media (prefers-reduced-motion:reduce){.dcu-expanded-shell,.dcu-root.dcu-compact .dcu-compact-shell,.dcu-foot,.dcu-search-scrim,.dcu-search-dialog,.dcu-extension-panel,.dcu-extension-leading svg{animation:none;transition:none}}
/* ZCode 输入壳：rounded-2xl(16px)、bg-input + border-input-border、发送键用 Zai primary 黑白。 */
[data-conversation-scroll]{--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:24px;--dcu-composer-bg:var(--dsw-specific-input-major,#fff);--dcu-composer-shadow:0 0 0 1px rgba(13,13,13,.06),0 2px 8px rgba(13,13,13,.06),0 4px 40px 8px rgba(13,13,13,.04);--dcu-composer-border:var(--dcu-sidebar-border)}
body[data-ds-dark-theme] [data-conversation-scroll]{--dcu-composer-bg:var(--dsw-alias-bg-layer-2,#242424);--dcu-composer-shadow:inset 0 0 1px rgba(255,255,255,.06);--dcu-composer-border:var(--dcu-sidebar-border)}
[data-conversation-scroll] [data-composer-card]{padding-top:8px;gap:4px;border:1px solid var(--dcu-composer-border);border-radius:var(--dsw-radius-2xl);background:var(--dcu-composer-bg);box-shadow:var(--dcu-composer-shadow)}
/* 官方附件轨道用 -6px 抵消 12px 行间距；本皮肤为 4px，改为 +2px 保留附件到正文的 6px。 */
[data-conversation-scroll] [data-composer-card]>[data-slot="conversation.input.attachments"]>:is([class$="_rail"],[class*="_rail_"]){margin-bottom:2px}
[data-conversation-scroll] [data-input-mirror]{min-height:44px}
[data-conversation-scroll] [data-composer-card] [data-input-scroll]{margin-right:0}
[data-conversation-scroll] [data-input-scroll] [data-lexical-editor=true]{min-height:44px;padding:0 12px}
[data-conversation-scroll] [data-composer-placeholder]{inset:0 12px auto}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div{padding:0 8px 8px;gap:var(--dcu-space-1)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div>div>div{gap:4px}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):not([role]){min-height:28px;height:28px}
/* Zai primary 发送键：浅色黑底白字、深色白底黑字，与 ZCode --color-primary 一致。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]{width:28px;transform:none;background:var(--dcu-primary);color:var(--dcu-primary-foreground);transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-press-duration) var(--dcu-motion-press-ease)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:hover:not(:disabled){background:color-mix(in srgb,var(--dcu-primary) 88%,transparent)}
/* 签名细节（2026-10-13）：发送是这台机器上被点得最多的一次交互，让它有回应。
   悬停时箭头前倾 1px（用「进入」曲线，因为它是一次落位而不是一次移动），
   按下时整键压到 .94 并立刻回弹（用最短的「按压」曲线，90ms）。
   全程只用位移与明度——单色系统里没有别的可用，也不该有。 */
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary] svg{transition:transform var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:hover:not(:disabled) svg{transform:translateX(1px)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div button[class$=_primary]:active:not(:disabled){transform:scale(.94)}
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}
/* 窄屏 composer 阴影加强：阈值与 InputHistoryDock 隐藏历史提示的 640px 共用一档。
   此前这里是 639px，与 640px 构成 1px 不一致窗口——那个窗口里阴影已加强、提示却还在。 */
@media(max-width:640px){[data-conversation-scroll]{--dcu-composer-shadow:0 0 0 1px rgba(13,13,13,.06),0 2px 8px rgba(13,13,13,.06),0 4px 24px 8px rgba(13,13,13,.04)}}
@media(forced-colors:active){[data-conversation-scroll] [data-composer-card]{outline:1px solid CanvasText}}
html[data-dcu-official-turn-navigator-supported=true] .dcu-turn-navigator,html:has([data-dcu-official-turn-navigator]) .dcu-turn-navigator{display:none}
/* 2026-10-19：同一 profile 里可能同时装着 @michengai/dsh-codex-ui 与 dsh-zcode-ui（实测 desktop
   profile 两者并存）。两个包往同一个 slot 注册同一个 id 'turn-navigator'，slot 表按「包+id」
   区分，于是渲染出**两条**索引栏 —— 用户看到的就是「左右各一条、位置对不上」。
   这里做最后一道兜底：一旦出现两个自绘索引栏，只保留 DOM 中第一个（先注册者），
   后来者整体退场。用 nth-of-type 而非包名判断，避免依赖对方的类名/版本。 */
.dcu-root [data-dcu-turn-rail-stale]{display:none}
/* 多出一条索引栏时由 turn-rail-dedupe.ts 打标退场；单条时无标记，规则不生效。 */
/* 输入区把 clearance 设成 24px 后，旧镜像公式会变成 -28px，整条导航滑进侧栏。至少留 12px，贴在会话列内侧。 */
[data-dcu-official-turn-navigator]{right:auto!important;left:max(12px,calc(12px - (var(--dsh-composer-side-clearance) + 16px)))!important}
/* 官方轮次导航与侧栏右缘的同步位移（2026-10-19）。它渲染在内容列内部，只会继承内容列
   那半段 transform，而侧栏右缘走的是整段——不补这一条，开合时它就与侧栏边缘越离越远
   （真宿主实测：收起时间距最大 107px，展开时最差 -25px，见 sidebar-width.ts 的判据注释）。
   用 translate 而不是 transform：宿主可能自己给 nav 挂 transform，独立属性可叠加不覆盖。
   时长与曲线必须与内容列、自绘索引栏完全一致，否则三者互相追赶。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-official-turn-navigator]{translate:var(--dcu-official-rail-shift,0px);transition:translate var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 左移后的预览朝聊天内容区展开，外观和动画继续使用宿主规则。 */
[data-dcu-official-turn-navigator] [role=tooltip]{right:auto!important;left:calc(100% + 10px)!important}
`

function MenuIcon({ children }: { children: ReactNode }) { return <span className="dcu-menu-icon">{children}</span> }
/**
 * 菜单行的快捷键提示（ZCode `Kbd`/`KbdGroup` 的等价物）。
 *
 * 数据来自宿主命令目录的 `keys`（已按平台格式化），不自己拼键名——否则 macOS 的
 * ⌘ 与 Windows 的 Ctrl 会写死成一种。目录未就绪时 `keys` 为空，这里返回 null，
 * 行里就只显示图标与文字，不留空占位（与 ZCode 的「无提示即不渲染」一致）。
 */
function MenuKbd({ keys }: { keys: readonly string[] }) {
  if (keys.length === 0) return null
  return <span className="dcu-menu-kbd" aria-hidden="true">{keys.map(key => <span key={key}>{key}</span>)}</span>
}

/** 搜索面板结果总上限。 */
const SEARCH_RESULT_LIMIT = 12
/**
 * 每组保底条数。三组必须都在结果里露头（审计「一个组不能吃满配额」的要求），
 * 但**不能**按 1/3 硬分——三组大小差异极大（见 SidebarSearch 里 results 的说明）。
 * 3 × 3 = 9 < 12，剩余 3 条按组顺序回填，单组命中多时仍能长到 7 条。
 */
const SEARCH_GROUP_FLOOR = 3

/**
 * 把 label 中命中 query 的片段包成 <mark>，供搜索面板高亮。
 *
 * 2026-10-18（设计审计 P1-4）：先前匹配串没有高亮，用户扫读结果时得逐行重读才知道
 * 命中在哪。这里只做**大小写不敏感的首个命中段**高亮：结果行本身短（会话标题 / 设置名），
 * 多处高亮会变成闪光噪声。query 为空时原样返回，不做任何包装。
 */
function highlightMatch(label: string, query: string): ReactNode {
  const needle = query.trim()
  if (needle === '') return label
  const at = label.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
  if (at < 0) return label
  return <>
    {label.slice(0, at)}
    <mark className="dcu-search-hit">{label.slice(at, at + needle.length)}</mark>
    {label.slice(at + needle.length)}
  </>
}

type SearchEntry = SidebarSearchItem & {
  readonly group: 'sessions' | 'settings' | 'actions'
  readonly detail?: string
  readonly run: () => void
}

type SidebarSearchHandle = { open: () => void }

type SidebarSearchProps = Pick<CodexSidebarProps, 'openSession' | 'startSession' | 't' | 'useSessions' | 'useWorkspaces'> & {
  imSettingsAvailable: boolean
  openPlugins: () => void
  settingsSeat: RefObject<HTMLDivElement>
}

/** 搜索状态与大侧栏隔离：输入、悬停和开关弹窗都不能让工作区树跟着重渲染。 */
const SidebarSearch = forwardRef<SidebarSearchHandle, SidebarSearchProps>(function SidebarSearch(
  { imSettingsAvailable, openPlugins, openSession, startSession, t, useSessions, useWorkspaces, settingsSeat },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const deferredQuery = useDeferredValue(query)
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)

  const close = useCallback((): void => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])
  useImperativeHandle(ref, () => ({ open: () => { setOpen(true) } }), [])

  const selectSection = useCallback((label: string): void => {
    openSettingsSection(settingsSeat.current, label)
  }, [settingsSeat])
  const selectExternalSection = useCallback((label: string | readonly string[]): void => {
    openSettingsSection(settingsSeat.current, label, () => { selectSection(t('about.nav')) })
  }, [selectSection, settingsSeat, t])
  const openImSettings = useCallback((): void => {
    routeOptionalSettingsSection(
      imSettingsAvailable,
      () => { selectExternalSection([t('sidebar.imSettings'), 'IM助理']) },
      () => { selectSection(t('about.nav')) },
    )
  }, [imSettingsAvailable, selectExternalSection, selectSection, t])
  const openSettings = useCallback((): void => {
    openSettingsRoot(settingsSeat.current)
  }, [settingsSeat])

  const entries = useMemo<SearchEntry[]>(() => {
    const archived = new Set(workspaces.archivedSessionIds)
    const workspaceTitles = new Map(workspaces.items.flatMap(workspace => workspace.sessionIds.map(sessionId => [String(sessionId), workspace.title])))
    const sessionEntries = sessions.ids
      .map(id => sessions.byId[id])
      .filter((session): session is NonNullable<typeof session> => session !== undefined && !archived.has(session.id) && isTaskSession(session))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map(session => ({ id: `session:${session.id}`, group: 'sessions' as const, label: session.displayTitle, keywords: `${session.cwd ?? ''} ${session.id}`, detail: workspaceTitles.get(String(session.id)) ?? session.cwd, run: () => { close(); openSession(session.id) } }))
    const settingEntries: SearchEntry[] = [
      { id: 'settings:root', group: 'settings', label: t('search.settings'), keywords: t('search.settings'), run: () => { close(); openSettings() } },
      { id: 'settings:experts', group: 'settings', label: t('sidebar.experts'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.experts')) } },
      { id: 'settings:skills', group: 'settings', label: t('sidebar.skills'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.skills')) } },
      { id: 'settings:plugins', group: 'settings', label: t('sidebar.plugins'), keywords: t('search.settings'), run: () => { close(); openPlugins() } },
      { id: 'settings:plugin-config', group: 'settings', label: t('settings.pluginConfig'), keywords: t('search.settings'), run: () => { close(); openSettingsSection(settingsSeat.current, t('settings.pluginConfig')) } },
      { id: 'settings:connectors', group: 'settings', label: t('sidebar.connectors'), keywords: t('search.settings'), run: () => { close(); selectSection(t('sidebar.connectors')) } },
      { id: 'settings:schedule', group: 'settings', label: t('sidebar.schedule'), keywords: t('search.settings'), run: () => { close(); selectExternalSection(t('sidebar.schedule')) } },
      { id: 'settings:assistant', group: 'settings', label: t('sidebar.assistant'), keywords: t('search.settings'), run: () => { close(); openImSettings() } },
      { id: 'settings:about', group: 'settings', label: t('about.nav'), keywords: t('search.settings'), run: () => { close(); selectSection(t('about.nav')) } },
    ]
    return [...sessionEntries, ...settingEntries, { id: 'action:new', group: 'actions', label: t('sidebar.newTask'), keywords: t('search.actions'), run: () => { close(); startSession() } }]
  }, [close, openImSettings, openPlugins, openSession, openSettings, selectExternalSection, selectSection, sessions.byId, sessions.ids, startSession, t, workspaces.archivedSessionIds, workspaces.items])
  /* 2026-10-18（设计审计 P1-4）：**先分组、再分配配额**，替代原来的全场 slice(0, 12)。
     原实现 `filter(...).slice(0, 12)` 在分组**之前**截断：会话条目永远排在前面，于是
     「会话」组能独自吃满 12 条配额，把「设置」「操作」两组整段挤掉。
     ⚠ 第一版修成了「每组固定 1/3」（各 4 条），那反而是**新缺陷**：三组大小差异很大
     （设置组固定 9 条、操作组固定 1 条、会话组可达数百条），四等分会把「搜 settings 时
     设置组只显示 4 条」「搜会话标题时只显示 4 条」——比修之前更差。
     正确口径是「**保底 + 回填**」：
       ① 每组先取保底 SEARCH_GROUP_FLOOR 条，保证三个组都露头（这才是审计要的「不被挤掉」）；
       ② 剩余额度按组顺序回填，单组可以继续增长 —— 所以只有会话命中的查询仍能拿到接近 12 条，
          设置全命中时也能一次看全。
     扁平后的顺序仍是 sessions → settings → actions，与下面的渲染顺序一致。 */
  const results = useMemo(() => {
    const matched = filterSidebarSearchItems(entries, deferredQuery)
    const byGroup = (['sessions', 'settings', 'actions'] as const)
      .map(group => matched.filter(entry => entry.group === group))
    return allocateSearchQuota(byGroup, SEARCH_RESULT_LIMIT, SEARCH_GROUP_FLOOR)
  }, [deferredQuery, entries])

  useEffect(() => { setActiveIndex(0) }, [query, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, Math.max(0, results.length - 1))); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); return }
      if (event.key === 'Enter') { const entry = results[activeIndex]; if (entry !== undefined) { event.preventDefault(); entry.run() } }
    }
    // 捕获相：弹窗打开期间键盘归弹窗。挂冒泡相会被宿主先注册的窗口级 Escape/方向键
    // 处理器拦截（活宿主实测：Escape 在真机上关不掉弹窗）。
    window.addEventListener('keydown', onKeyDown, true)
    return () => { window.removeEventListener('keydown', onKeyDown, true) }
  }, [activeIndex, close, open, results])

  if (!open) return null
  return <div className="dcu-search-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="dcu-search-dialog" role="dialog" aria-modal="true" aria-label={t('sidebar.search')}><div className="dcu-search-input"><Input autoFocus icon={<ZIconSearch size={16} />} value={query} placeholder={t('search.placeholder')} onChange={event => { setQuery(event.target.value) }} /></div>{results.length === 0 ? <div className="dcu-search-results"><div className="dcu-search-empty">{t('search.empty')}</div></div> : <div className="dcu-search-results">{(['sessions', 'settings', 'actions'] as const).map(group => { const grouped = results.filter(entry => entry.group === group); if (grouped.length === 0) return null; return <section className="dcu-search-section" key={group}><div className="dcu-search-title">{t(`search.${group}`)}</div>{grouped.map(entry => { const index = results.indexOf(entry); return <button type="button" className="dcu-search-row" data-active={index === activeIndex} key={entry.id} onMouseEnter={() => { setActiveIndex(index) }} onClick={entry.run}><span className="dcu-search-main">{highlightMatch(entry.label, deferredQuery)}</span>{entry.detail !== undefined && <span className="dcu-search-detail">{entry.detail}</span>}</button> })}</section> })}</div>}<div className="dcu-search-hint" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> {t('search.hintMove')}</span><span><kbd>↵</kbd> {t('search.hintOpen')}</span><span><kbd>esc</kbd> {t('search.hintClose')}</span></div></section></div>
})

/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
export function CodexSidebar({ workspaceShortcuts, navigationHistory, globalPanels, footerActions, selectPanel, usePanelInfo = useLegacyPanelInfo, collapsed, width, openSession, startSession, toggleSidebar, archiveSession, canDeleteSession, deleteSession, forkSession, moveSession, renameSession, openPath, companionSlots, renderSlot, t, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, prefillNewConversation, newConversationDraft, shortcuts }: CodexSidebarProps) {
  // 宿主命令目录：搜索（session.search）与新建（session.new）按钮的 aria-keyshortcuts 来源。
  const shortcutOf = useShortcutLookup(shortcuts)
  const panels = useSyncExternalStore(globalPanels?.subscribe ?? subscribeEmptyCompanionTabs, globalPanels?.getSnapshot ?? getEmptyPanels, globalPanels?.getSnapshot ?? getEmptyPanels)
  const extensionPanels = panels.filter(panel => panel.id === 'schedules')
  const topPanels = panels.filter(panel => panel.id !== 'schedules')
  const visibleFooterActions = useSyncExternalStore(footerActions?.subscribe ?? subscribeEmptyCompanionTabs, footerActions?.getSnapshot ?? getEmptyFooterActions, footerActions?.getSnapshot ?? getEmptyFooterActions)
  const activePanelId = usePanelInfo(info => info.activePanelId)
  const panelActive = activePanelId !== null && activePanelId !== ''
  const panelButtons = (wide: boolean) => selectPanel === undefined ? null : <GlobalPanelButtons panels={topPanels} activeId={activePanelId} wide={wide} selectPanel={selectPanel} renderIcon={(id, active) => renderSlot('sidebar.panellist', { size: 16, active }, { only: id })} />
  const compact = collapsed || width < 80
  // 外来内容契约哨兵：页脚出现 cm-* 元素但契约锚点缺失时响亮报警，见 foreign-content-contract.ts。
  useEffect(() => {
    const footer = footRef.current
    return footer === null ? undefined : auditForeignFooterContent(footer)
  }, [])
  const [visualCompact, setVisualCompact] = useState(compact)
  const [collapsing, setCollapsing] = useState(false)
  const settingsSeat = useRef<HTMLDivElement>(null)
  const search = useRef<SidebarSearchHandle>(null)
  const footRef = useRef<HTMLElement>(null)
  const openSearch = (): void => {
    workspaceShortcuts?.getSnapshot().bindings?.closeAddWorkspace()
    search.current?.open()
  }
  const toggleSidebarRef = useRef(toggleSidebar)
  toggleSidebarRef.current = toggleSidebar
  const expandSidebar = useCallback((): void => { toggleSidebarRef.current() }, [])
  const [extensionsOpen, setExtensionsOpen] = useState(readExtensionsOpen)
  const [imTab, setImTab] = useState<'tasks' | 'channels' | 'schedule'>('tasks')
  const beginSession = useCallback((workspaceId?: WorkspaceId): void => {
    beginSidebarSession(setImTab, startSession, workspaceId)
  }, [startSession])
  const companionTabs = useSyncExternalStore(
    companionSlots?.subscribe ?? subscribeEmptyCompanionTabs,
    companionSlots?.getSnapshot ?? getEmptyCompanionTabs,
    companionSlots?.getSnapshot ?? getEmptyCompanionTabs,
  )
  const showChannels = companionTabs.channels
  const showSchedule = companionTabs.schedule
  const showCompanionTabs = showChannels || showSchedule
  const selectSection = (label: string): void => { openSettingsSection(settingsSeat.current, label) }
  const openPlugins = (): void => {
    openSettingsSection(settingsSeat.current, [t('sidebar.marketplace'), t('sidebar.builtinPlugins')])
  }
  const selectExternalSection = (label: string | readonly string[]): void => {
    openSettingsSection(settingsSeat.current, label, () => { selectSection(t('about.nav')) })
  }
  const openImSettings = (): void => {
    routeOptionalSettingsSection(
      showChannels,
      () => { selectExternalSection([t('sidebar.imSettings'), 'IM助理']) },
      () => { selectSection(t('about.nav')) },
    )
  }
  useEffect(() => {
    if (imTab === 'channels' && !showChannels) setImTab('tasks')
    if (imTab === 'schedule' && !showSchedule) setImTab('tasks')
  }, [imTab, showChannels, showSchedule])
  useEffect(() => {
    let startX = 0
    let startWidth = SLIM_SIDEBAR_PX
    let dragging = false
    let pointerId: number | undefined
    let frame: HTMLElement | undefined
    let handle: HTMLElement | undefined
    const stopHostDrag = (event: PointerEvent): void => {
      event.preventDefault()
      event.stopPropagation()
    }
    const finishDrag = (): void => {
      frame?.removeAttribute('data-dragging')
      handle?.removeAttribute('data-dragging')
      if (handle !== undefined && pointerId !== undefined && handle.hasPointerCapture?.(pointerId)) {
        handle.releasePointerCapture(pointerId)
      }
      dragging = false
      pointerId = undefined
      frame = undefined
      handle = undefined
    }
    const onDown = (event: PointerEvent): void => {
      if (dragging || !isSidebarDragHandle(event.target)) return
      const nextFrame = findSidebarFrame(document)
      if (nextFrame === undefined) return
      // 展开动画飞行中手柄已在 56px 视觉位，先落定再读基准，避免拖拽从中间值起跳。
      settleSidebarMotion(nextFrame)
      const tracks = parseSidebarGrid(nextFrame.style.gridTemplateColumns)
      const nextHandle = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-side="sidebar"]') ?? undefined
        : undefined
      if (tracks === undefined || nextHandle === undefined) return
      stopHostDrag(event)
      dragging = true
      pointerId = event.pointerId
      startX = event.clientX
      startWidth = tracks.sidebar
      frame = nextFrame
      handle = nextHandle
      frame.setAttribute('data-dragging', '')
      handle.setAttribute('data-dragging', 'true')
      try { handle.setPointerCapture(event.pointerId) } catch { /* 窗口级监听仍可完成当前拖拽。 */ }
    }
    const onMove = (event: PointerEvent): void => {
      if (!dragging || event.pointerId !== pointerId || frame === undefined) return
      stopHostDrag(event)
      applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX))
    }
    const onUp = (event: PointerEvent): void => {
      if (!dragging || event.pointerId !== pointerId) return
      stopHostDrag(event)
      if (frame !== undefined) applySidebarWidth(frame, sidebarWidthDuringDrag(startWidth, startX, event.clientX))
      const collapse = shouldCollapseOnSidebarDrag(startWidth, startX, event.clientX)
      finishDrag()
      if (collapse) window.requestAnimationFrame(() => { window.requestAnimationFrame(() => { toggleSidebarRef.current() }) })
    }
    const onCancel = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) return
      stopHostDrag(event)
      finishDrag()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    return () => {
      finishDrag()
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
    }
  }, [])
  useLayoutEffect(() => {
    if (!compact) {
      setCollapsing(false)
      setVisualCompact(false)
      return
    }
    if (visualCompact) {
      setCollapsing(false)
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) {
      setCollapsing(false)
      setVisualCompact(true)
      return
    }
    setCollapsing(true)
    const timer = window.setTimeout(() => {
      setVisualCompact(true)
      setCollapsing(false)
    }, SIDEBAR_COLLAPSE_SETTLE_MS)
    return () => { window.clearTimeout(timer) }
  }, [compact, visualCompact])
  const workspaceSlot = useMemo(() => {
    const owner = { wide: true, expandSidebar, panelActive }
    return renderSlot('sidebar.workspaces', owner)
  }, [expandSidebar, panelActive, renderSlot])
  const scheduleOverviewSlot = useMemo(
    () => renderSlot('sidebar.schedule', {
      wide: true,
      expandSidebar,
      openSession,
      archiveSession,
      deleteSession,
      forkSession,
      moveSession,
      renameSession,
      openPath,
      useSessions,
      useWorkspaces,
      view: 'overview',
      showViewSwitch: false,
    }),
    [archiveSession, companionTabs.schedule, deleteSession, expandSidebar, forkSession, moveSession, openPath, openSession, renameSession, renderSlot, useSessions, useWorkspaces],
  )

  return <aside className={`dcu-root${visualCompact ? ' dcu-compact' : ''}${collapsing ? ' dcu-collapsing' : ''}`} aria-label={t('sidebar.label')}>
    <style>{stylesheet}</style>
    {navigationHistory && <DesktopNavigationControls history={navigationHistory} t={t} />}
    <style>{NEW_CONVERSATION_STYLE}</style>
    <style>{COMPOSER_TOOL_MENU_STYLE}</style>
    <NewConversationSuggestions t={t} prefill={prefillNewConversation} draftSource={newConversationDraft} />
    <div className="dcu-expanded-shell">
    <header className="dcu-head"><button type="button" className="dcu-brand" aria-label={t('sidebar.newTask')} aria-keyshortcuts={shortcutOf('session.new')?.aria} onClick={() => { beginSession() }}><BrandWordmark size={24} /></button><div className="dcu-head-actions"><button type="button" className="dcu-icon" aria-label={t('sidebar.collapse')} onClick={toggleSidebar}><ZIconCollapse size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} aria-keyshortcuts={shortcutOf('session.search')?.aria} onClick={openSearch}><ZIconSearch size={16} /></button></div></header>
    <nav className="dcu-menu" aria-label={t('sidebar.mainMenu')}>
      {panelButtons(true)}
      {/* 2026-10-12 产品修复：ZCode 侧栏没有上游那个「任务」导航项，全局面板打开后用户没有返回入口
          （实测：再点面板入口、按 Escape 都无效）。`selectPanel(null)` 正是打开面板的逆操作，
          宿主会恢复此前的主视图（会话与草稿都保留）。 */}
      {panelActive && <button type="button" className="dcu-back-to-session" onClick={() => { selectPanel?.(null) }}><MenuIcon><ZIconBack size={16} /></MenuIcon>{t('sidebar.backToConversation')}</button>}
      <button type="button" onClick={() => { beginSession() }}><MenuIcon><ZIconNewTask size={16} /></MenuIcon><span>{t('sidebar.newTask')}</span><MenuKbd keys={shortcutOf('session.new')?.keys ?? []} /></button>
      {/* 2026-10-17：搜索从「头部图标」升级为菜单整行（ZCode 侧栏的 commandCenter.open 就是一行
          `Search size-4 + 文案 + ml-auto 快捷键`，见 WorkspaceSidebar.tsx:1495-1515）。
          图标按钮只能表达「有个搜索」，整行才能表达「搜索什么 + 怎么按」。
          头部图标保留（紧凑轨仍需要它），两者共用同一个 openSearch。 */}
      <button type="button" onClick={openSearch}><MenuIcon><ZIconSearch size={16} /></MenuIcon><span>{t('sidebar.search')}</span><MenuKbd keys={shortcutOf('session.search')?.keys ?? []} /></button>
      <div className="dcu-extensions-group">
        <button type="button" className="dcu-extensions-toggle" aria-expanded={extensionsOpen} aria-controls="dcu-extension-items" onClick={() => { setExtensionsOpen(open => { const next = !open; writeExtensionsOpen(next); return next }) }}><MenuIcon><span className="dcu-extension-leading"><ZIconExtensions className="dcu-extension-default-icon" size={16} /><ZIconChevronRight className="dcu-extension-state-arrow" /></span></MenuIcon>{t('sidebar.extensions')}</button>
        <div id="dcu-extension-items" className="dcu-extension-panel" data-open={extensionsOpen} aria-hidden={!extensionsOpen}><div className="dcu-extension-panel-inner"><div className="dcu-extension-items"><button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={() => { selectExternalSection(t('sidebar.experts')) }}><MenuIcon><ZIconExperts size={16} /></MenuIcon>{t('sidebar.experts')}</button><button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={() => { selectExternalSection(t('sidebar.skills')) }}><MenuIcon><ZIconSkills size={16} /></MenuIcon>{t('sidebar.skills')}</button><button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={() => { openPlugins() }}><MenuIcon><ZIconPlugins size={16} /></MenuIcon>{t('sidebar.plugins')}</button><button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={() => { selectSection(t('sidebar.connectors')) }}><MenuIcon><ZIconConnectors size={16} /></MenuIcon>{t('sidebar.connectors')}</button>{extensionPanels.map(panel => <button key={panel.id} type="button" tabIndex={extensionsOpen ? 0 : -1} aria-current={activePanelId === panel.id ? 'page' : undefined} onClick={() => { selectPanel?.(panel.id) }}><MenuIcon>{renderSlot('sidebar.panellist', { size: 16, active: activePanelId === panel.id }, { only: panel.id })}</MenuIcon>{panel.label}</button>)}<button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={() => { selectExternalSection(t('sidebar.schedule')) }}><MenuIcon><ZIconSchedule size={16} /></MenuIcon>{t('sidebar.schedule')}</button><button type="button" tabIndex={extensionsOpen ? 0 : -1} onClick={openImSettings}><MenuIcon><ZIconAssistant size={16} /></MenuIcon>{t('sidebar.assistant')}</button></div></div></div>
      </div>
    </nav>
    <div className={showCompanionTabs ? "dcu-workspaces dcu-workspaces-tabs" : "dcu-workspaces"}>
      {showCompanionTabs && <div className="dcu-im-tabs">
        <button type="button" className="dcu-im-tab" data-on={imTab === 'tasks'} onClick={() => { setImTab('tasks') }}>{t('sidebar.tasksTab')}</button>
        {showChannels && <button type="button" className="dcu-im-tab" data-on={imTab === 'channels'} onClick={() => { setImTab('channels') }}>{t('sidebar.channelsTab')}</button>}
        {showSchedule && <button type="button" className="dcu-im-tab" data-on={imTab === 'schedule'} onClick={() => { setImTab('schedule') }}>{t('sidebar.scheduleTab')}</button>}
      </div>}
      {imTab === 'channels' && showChannels
        ? <div className="dcu-native-workspaces"><ChannelBrowser openSession={openSession} archiveSession={archiveSession} deleteSession={deleteSession} canDeleteSession={canDeleteSession} forkSession={forkSession} moveSession={moveSession} renameSession={renameSession} useSessions={useSessions} useSessionPendingInteraction={useSessionPendingInteraction} useSessionStatus={useSessionStatus} useWorkspaces={useWorkspaces} panelActive={panelActive} t={t} /></div>
        : imTab === 'schedule' && showSchedule
          ? <div className="dcu-native-workspaces"><ScheduleBrowser openSession={openSession} archiveSession={archiveSession} deleteSession={deleteSession} canDeleteSession={canDeleteSession} forkSession={forkSession} moveSession={moveSession} renameSession={renameSession} useSessions={useSessions} useSessionPendingInteraction={useSessionPendingInteraction} useSessionStatus={useSessionStatus} useWorkspaces={useWorkspaces} panelActive={panelActive} t={t} overviewContent={scheduleOverviewSlot} openTaskSettings={(request) => {
              openSettingsSection(settingsSeat.current, t('sidebar.schedule'), () => { clearAutomationTaskSettingsRequest(); selectSection(t('about.nav')) }, () => { requestAutomationTaskSettings(request) })
            }} /></div>
          : <div className="dcu-native-workspaces">{workspaceSlot}</div>}
    </div>
    </div>
    <div className="dcu-compact-shell"><button type="button" className="dcu-icon" aria-label={t('sidebar.expand')} title={t('sidebar.expand')} onClick={toggleSidebar}><ZIconCollapse size={16} /></button><nav className="dcu-compact-nav" aria-label={t('sidebar.mainMenu')}>{panelButtons(false)}{panelActive && <button type="button" className="dcu-icon" aria-label={t('sidebar.backToConversation')} title={t('sidebar.backToConversation')} onClick={() => { selectPanel?.(null) }}><ZIconBack size={16} /></button>}<button type="button" className="dcu-icon" aria-label={t('sidebar.newTask')} title={t('sidebar.newTask')} aria-keyshortcuts={shortcutOf('session.new')?.aria} onClick={() => { beginSession() }}><ZIconNewTask size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} title={t('sidebar.search')} aria-keyshortcuts={shortcutOf('session.search')?.aria} onClick={openSearch}><ZIconSearch size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.experts')} title={t('sidebar.experts')} onClick={() => { selectExternalSection(t('sidebar.experts')) }}><ZIconExperts size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.skills')} title={t('sidebar.skills')} onClick={() => { selectExternalSection(t('sidebar.skills')) }}><ZIconSkills size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.plugins')} title={t('sidebar.plugins')} onClick={() => { openPlugins() }}><ZIconPlugins size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.connectors')} title={t('sidebar.connectors')} onClick={() => { selectSection(t('sidebar.connectors')) }}><ZIconConnectors size={16} /></button>{extensionPanels.map(panel => <button key={panel.id} type="button" className="dcu-icon" aria-label={panel.label} title={panel.label} onClick={() => { selectPanel?.(panel.id) }}>{renderSlot('sidebar.panellist', { size: 16, active: activePanelId === panel.id }, { only: panel.id })}</button>)}<button type="button" className="dcu-icon" aria-label={t('sidebar.schedule')} title={t('sidebar.schedule')} onClick={() => { selectExternalSection(t('sidebar.schedule')) }}><ZIconSchedule size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.assistant')} title={t('sidebar.assistant')} onClick={openImSettings}><ZIconAssistant size={16} /></button></nav></div>
    <footer ref={footRef} className="dcu-foot"><div className="dcu-footer-actions">{footerActions === undefined ? renderSlot('sidebar.footer.action', { wide: !visualCompact }) : visibleFooterActions.map(action => <Fragment key={action.id}>{renderSlot('sidebar.footer.action', { wide: !visualCompact }, { only: action.id })}</Fragment>)}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: !visualCompact })}</div></footer>
    {/* 逐条 only:id 各生成一个 data-slot 锚点；插件可能给锚点写 width:100%，footer-actions 必须保持竖排。 */}
    <SidebarSearch ref={search} imSettingsAvailable={showChannels} openPlugins={openPlugins} settingsSeat={settingsSeat} openSession={openSession} startSession={beginSession} t={t} useSessions={useSessions} useWorkspaces={useWorkspaces} />
    {workspaceShortcuts && <WorkspaceShortcutBridge source={workspaceShortcuts} openSearch={openSearch} startSession={id => { beginSession(id as WorkspaceId) }} renderDirectoryFlow={owner => renderSlot('sidebar.codex.directoryFlow', owner)} t={t} />}
  </aside>
}








CodexSidebar.displayName = 'zcode-ui-for-dsh'
