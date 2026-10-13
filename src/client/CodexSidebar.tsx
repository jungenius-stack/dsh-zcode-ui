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
import { filterSidebarSearchItems, type SidebarSearchItem } from './sidebar-search.ts'
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
.dcu-expanded-shell{display:flex;width:100%;min-height:0;flex:1 1 0;overflow:hidden;flex-direction:column;transform-origin:left center;transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease);animation:dcu-sidebar-expanded-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-compact-shell{display:none;width:56px}.dcu-root.dcu-collapsing .dcu-expanded-shell{opacity:0;transform:translateX(-6px);pointer-events:none}.dcu-root.dcu-compact .dcu-expanded-shell{display:none}.dcu-root.dcu-compact .dcu-compact-shell{display:flex;min-height:0;flex:1;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-sidebar-expanded-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}@keyframes dcu-sidebar-compact-in{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
/* ZCode 几何：8px 圆角、32px 行高、px-2/py-3/gap-1 间距、150ms ease-out 过渡。 */
.dcu-root *{box-sizing:border-box}.dcu-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;flex:none;height:var(--dcu-header-height,40px);padding:calc((var(--dcu-header-height,40px) - 32px)/2) 8px calc((var(--dcu-header-height,40px) - 32px)/2) 12px}.dcu-brand{border:0;background:transparent;color:inherit;padding:0;display:flex;align-items:center;min-width:0;overflow:hidden}.dcu-brand svg{display:block;width:auto;max-width:100%;height:22px;min-width:0}.dcu-head-actions{display:grid;grid-auto-flow:column;grid-auto-columns:28px;align-items:center;column-gap:4px;height:28px}
.dcu-icon,.dcu-menu button,.dcu-footer-link{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;color:var(--dcu-sidebar-icon)}.dcu-head .dcu-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin:0;padding:0;border-radius:8px;line-height:0}.dcu-head .dcu-icon svg{display:block;width:16px;height:16px}
.dcu-icon:hover,.dcu-menu button:hover:not(:disabled),.dcu-footer-link:hover{background:var(--dcu-sidebar-hover);color:var(--dcu-sidebar-primary)}
.dcu-menu{padding:0 8px 8px;display:grid;gap:4px}.dcu-menu button,.dcu-footer-link{display:grid;grid-template-columns:16px minmax(0,1fr);column-gap:8px;align-items:center;width:100%;min-height:32px;padding:0 8px;border-radius:8px;color:var(--dcu-sidebar-primary);font-size:var(--dsw-font-size-base);line-height:20px;text-align:left;font-weight:400}
.dcu-menu-icon{display:grid;place-items:center start;width:16px;height:16px}.dcu-menu-icon svg,.dcu-footer-link svg{display:block;width:16px;height:16px;color:var(--dcu-sidebar-icon)}.dcu-menu button:disabled{color:var(--dcu-sidebar-secondary);cursor:default;opacity:1}.dcu-menu button:disabled svg{color:var(--dcu-sidebar-secondary)}
.dcu-extensions-group{display:grid}.dcu-extension-leading{position:relative;display:block;width:16px;height:16px}.dcu-extension-leading svg{position:absolute;inset:0;transition:opacity var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-default-icon{opacity:1}.dcu-extension-state-arrow{opacity:0;transform:rotate(0)}.dcu-extensions-group:hover .dcu-extension-default-icon,.dcu-extensions-toggle:focus-visible .dcu-extension-default-icon{opacity:0}.dcu-extensions-group:hover .dcu-extension-state-arrow,.dcu-extensions-toggle:focus-visible .dcu-extension-state-arrow{opacity:1}.dcu-extensions-toggle[aria-expanded=true] .dcu-extension-state-arrow{transform:rotate(90deg)}.dcu-extension-panel{display:grid;grid-template-rows:1fr;opacity:1;transition:grid-template-rows var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}.dcu-extension-panel[data-open=false]{grid-template-rows:0fr;opacity:0;pointer-events:none}.dcu-extension-panel-inner{position:relative;min-height:0;overflow:hidden}.dcu-extension-items{position:relative;display:grid;gap:1px;margin:1px 0 4px 24px}.dcu-extension-items::before{content:"";position:absolute;left:-12px;top:0;bottom:4px;width:1px;background:var(--dcu-sidebar-border)}.dcu-extension-items button{grid-template-columns:16px minmax(0,1fr);min-height:28px;padding:0 8px;border-radius:8px;color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-caption);font-weight:400}
.dcu-workspaces{display:flex;min-height:0;flex:1;flex-direction:column;margin-top:8px;padding-top:4px}.dcu-workspaces.dcu-workspaces-tabs{padding-top:0}.dcu-im-tabs{display:flex;gap:2px;margin:0 8px 8px;padding:2px;background:var(--dcu-surface);border:1px solid var(--dcu-sidebar-border);border-radius:8px}.dcu-im-tab{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:6px;background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease),color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-im-tab[data-on=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-native-workspaces{display:flex;min-height:0;flex:1}.dcu-native-workspaces>*{min-width:0;flex:1}.dcu-native-workspaces .ima-tabs,.dcu-native-workspaces [role=tablist]{display:none!important}.dcu-schedule-browser{display:flex;min-height:0;flex:1;flex-direction:column}.dcu-native-workspaces .dcu-schedule-views{display:flex!important;flex:none;min-height:30px;margin:0 8px 8px;padding:2px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;background:var(--dcu-surface)}.dcu-schedule-views button{appearance:none;flex:1;min-width:0;height:24px;border:0;border-radius:6px;background:transparent;color:var(--dcu-sidebar-secondary);font:500 12px/18px var(--dsw-font-family);cursor:pointer}.dcu-schedule-views button[aria-selected=true]{background:var(--dcu-sidebar-selected);color:var(--dcu-sidebar-primary);box-shadow:none}.dcu-schedule-pane{display:flex;min-height:0;flex:1}.dcu-schedule-pane>*{min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]{display:flex!important;width:100%;min-width:0;flex:1}.dcu-schedule-pane>[data-slot="sidebar.schedule"]>.dsh-st-rail{width:100%;min-width:0;padding-right:8px;scrollbar-gutter:auto}.dcu-schedule-pane .dsh-st-overview{padding-right:8px}.dcu-foot{display:grid;width:100%;gap:4px;padding:8px;transition:opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
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
.dcu-foot .cm-num{font-size:var(--dsw-font-size-base);font-weight:500;font-variant-numeric:tabular-nums;color:var(--dcu-sidebar-primary)}
.dcu-foot .cm-peak-classic{font-size:var(--dsw-font-size-sm);line-height:16px;color:var(--dcu-sidebar-tertiary)}
.dcu-foot .cm-peak-classic-chip{font-size:var(--dsw-font-size-sm);font-weight:400;color:var(--dcu-sidebar-secondary)}
.dcu-root.dcu-compact .cm-footer-stack,.dcu-root.dcu-collapsing .cm-footer-stack{display:none}
.dcu-settings-seat [data-slot="settings.trigger"]{color:var(--dcu-sidebar-primary)}
.dcu-settings-seat [data-slot="settings.trigger"]>svg{color:var(--dcu-sidebar-icon)}
/* 宿主列负责缩放，宽态内容保持展开宽度，避免中文竖排与工作区逐帧重排。 */
.dcu-expanded-shell,.dcu-root:not(.dcu-compact)>.dcu-foot{width:var(--dcu-sidebar-expanded-width,240px);flex-shrink:0}
/* 对齐 Codex 的半秒布局节奏；显式声明避免依赖宿主主题的动画 token。 */
.dcu-root{position:relative}
.dcu-root.dcu-collapsing .dcu-compact-shell{position:absolute;left:0;top:calc(var(--dcu-sidebar-top-clearance,0px) + (var(--dcu-header-height,40px) - 32px)/2);bottom:8px;display:flex;flex-direction:column;align-items:center;animation:dcu-sidebar-compact-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}
.dcu-root.dcu-collapsing .dcu-compact-shell .dcu-icon{width:32px;height:32px;flex:none}.dcu-root .dcu-compact-shell>.dcu-icon,.dcu-root.dcu-collapsing .dcu-compact-shell>.dcu-icon{width:28px;height:28px;flex:none;margin:0;padding:0;border-radius:8px}
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
/* 位移目标：JS 按「展开宽度 - 56」写 --dcu-sidebar-shift。收起时内容列先加宽一个
   shift（一次性重排，不参与过渡），再整体左移；展开时内容列留在宽轨道上右移。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column]{transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion=collapse]:not([data-dragging]) [data-dcu-center-column]{width:calc(100% + var(--dcu-sidebar-shift,0px));transform:translateX(calc(-1 * var(--dcu-sidebar-shift,0px)))}
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion=expand]:not([data-dragging]) [data-dcu-center-column]{transform:translateX(var(--dcu-sidebar-shift,0px))}
/* 拖拽柄同曲线位移（它绝对定位于列边界，动画期间布局 left 从收起视觉位滑到展开位）。
   宿主只给展开态挂手柄，收起时它随宿主卸载，无需收起向位移。left 过渡对 8px 命中条
   的布局成本可忽略，且与宿主 .frame[data-animating] .handle 的过渡模式一致。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"]{transition:left var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
/* 位移中的内容列会盖住侧栏列（transform 生成层叠上下文）；动画期间把外壳抬到它之上。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) .dcu-root{z-index:1}
/* 展开动画的基准轨道是收起几何（56px），宽态外壳要不被裁切才能完整淡入。 */
[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion=expand]:not([data-dragging]) [data-dcu-sidebar-column]{overflow:visible}
[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dragging] [data-side="sidebar"]{transition:none;width:auto;transform:none}
@media (prefers-reduced-motion:reduce){[data-dcu-codex-sidebar-initialized],#root [data-dcu-codex-sidebar-initialized]:not([data-dragging]),[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-center-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-dcu-sidebar-column],[data-dcu-codex-sidebar-initialized][data-dcu-sidebar-motion]:not([data-dragging]) [data-side="sidebar"]{transition:none}.dcu-root.dcu-collapsing .dcu-compact-shell{animation:none}}
.dcu-native-workspaces{flex-direction:column}.dcu-native-workspaces>[data-mcp-connector-top-mount=true]{flex:none}.dcu-root .mcpConnectorLauncher,.dcu-root [data-mcp-connector-top-mount=true]{display:none!important}
.dcu-dependency-notice{margin:0 8px 8px;border:1px solid var(--dcu-sidebar-border);border-radius:8px;padding:8px;color:var(--dcu-sidebar-secondary);font-size:var(--dsw-font-size-sm);line-height:18px}
/* ZCode 命令面板：rounded-2xl(16px) 壳、bg-menu、shadow-md、12px 分组标题 font-medium。 */
.dcu-search-scrim{position:fixed;z-index:10020;inset:0;display:flex;justify-content:center;align-items:flex-start;padding:72px 20px;background:color-mix(in srgb,#000 48%,transparent);animation:dcu-search-scrim-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}.dcu-search-dialog{width:min(560px,100%);max-height:min(640px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dcu-tip-border);border-radius:var(--dsw-radius-2xl);padding:12px;background:var(--dcu-tip-bg);box-shadow:var(--dcu-tip-shadow);animation:dcu-search-dialog-in var(--dcu-motion-enter-duration) var(--dcu-motion-enter-ease)}@keyframes dcu-search-scrim-in{from{opacity:0}to{opacity:1}}@keyframes dcu-search-dialog-in{from{opacity:0;transform:translateY(-6px) scale(.985)}to{opacity:1}}.dcu-search-input{margin-bottom:8px}.dcu-search-section{padding:6px 0}.dcu-search-title{padding:0 8px 4px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);font-weight:500}.dcu-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:32px;border:0;border-radius:8px;padding:6px 8px;background:transparent;color:var(--dcu-sidebar-primary);font:inherit;text-align:left;cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}.dcu-search-row:hover,.dcu-search-row[data-active=true]{background:var(--dcu-sidebar-hover)}.dcu-search-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dcu-search-detail{max-width:160px;overflow:hidden;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-sm);text-overflow:ellipsis;white-space:nowrap}.dcu-search-empty{padding:18px 8px;color:var(--dcu-sidebar-tertiary);font-size:var(--dsw-font-size-caption)}@media (prefers-reduced-motion:reduce){.dcu-expanded-shell,.dcu-root.dcu-compact .dcu-compact-shell,.dcu-foot,.dcu-search-scrim,.dcu-search-dialog,.dcu-extension-panel,.dcu-extension-leading svg{animation:none;transition:none}}
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
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div{padding:0 8px 8px;gap:5px}
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
[data-conversation-scroll] [data-composer-card]>[data-input-scroll]+div :is(button,select):focus-visible{outline:2px solid var(--dsw-alias-label-secondary);outline-offset:2px}
@media(max-width:639px){[data-conversation-scroll]{--dcu-composer-shadow:0 0 0 1px rgba(13,13,13,.06),0 2px 8px rgba(13,13,13,.06),0 4px 24px 8px rgba(13,13,13,.04)}}
@media(forced-colors:active){[data-conversation-scroll] [data-composer-card]{outline:1px solid CanvasText}}
html[data-dcu-official-turn-navigator-supported=true] .dcu-turn-navigator,html:has([data-dcu-official-turn-navigator]) .dcu-turn-navigator{display:none}
/* 输入区把 clearance 设成 24px 后，旧镜像公式会变成 -28px，整条导航滑进侧栏。至少留 12px，贴在会话列内侧。 */
[data-dcu-official-turn-navigator]{right:auto!important;left:max(12px,calc(12px - (var(--dsh-composer-side-clearance) + 16px)))!important}
/* 左移后的预览朝聊天内容区展开，外观和动画继续使用宿主规则。 */
[data-dcu-official-turn-navigator] [role=tooltip]{right:auto!important;left:calc(100% + 10px)!important}
`

function MenuIcon({ children }: { children: ReactNode }) { return <span className="dcu-menu-icon">{children}</span> }

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
  const results = useMemo(() => filterSidebarSearchItems(entries, deferredQuery).slice(0, 12), [deferredQuery, entries])

  useEffect(() => { setActiveIndex(0) }, [query, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, Math.max(0, results.length - 1))); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); return }
      if (event.key === 'Enter') { const entry = results[activeIndex]; if (entry !== undefined) { event.preventDefault(); entry.run() } }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [activeIndex, close, open, results])

  if (!open) return null
  return <div className="dcu-search-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="dcu-search-dialog" role="dialog" aria-modal="true" aria-label={t('sidebar.search')}><div className="dcu-search-input"><Input autoFocus icon={<ZIconSearch size={16} />} value={query} placeholder={t('search.placeholder')} onChange={event => { setQuery(event.target.value) }} /></div>{results.length === 0 ? <div className="dcu-search-empty">{t('search.empty')}</div> : (['sessions', 'settings', 'actions'] as const).map(group => { const grouped = results.filter(entry => entry.group === group); if (grouped.length === 0) return null; return <section className="dcu-search-section" key={group}><div className="dcu-search-title">{t(`search.${group}`)}</div>{grouped.map(entry => { const index = results.indexOf(entry); return <button type="button" className="dcu-search-row" data-active={index === activeIndex} key={entry.id} onMouseEnter={() => { setActiveIndex(index) }} onClick={entry.run}><span className="dcu-search-main">{entry.label}</span>{entry.detail !== undefined && <span className="dcu-search-detail">{entry.detail}</span>}</button> })}</section> })}</section></div>
})

/** Codex 风格的 DSH 侧栏，只替换导航外观，项目浏览和设置仍由 DSH 官方组件提供。 */
export function CodexSidebar({ workspaceShortcuts, navigationHistory, globalPanels, footerActions, selectPanel, usePanelInfo = useLegacyPanelInfo, collapsed, width, openSession, startSession, toggleSidebar, archiveSession, canDeleteSession, deleteSession, forkSession, moveSession, renameSession, openPath, companionSlots, renderSlot, t, useSessions, useSessionPendingInteraction, useSessionStatus, useWorkspaces, prefillNewConversation, newConversationDraft }: CodexSidebarProps) {
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
    <header className="dcu-head"><button type="button" className="dcu-brand" aria-label={t('sidebar.newTask')} onClick={() => { beginSession() }}><BrandWordmark size={24} /></button><div className="dcu-head-actions"><button type="button" className="dcu-icon" aria-label={t('sidebar.collapse')} onClick={toggleSidebar}><ZIconCollapse size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} onClick={openSearch}><ZIconSearch size={16} /></button></div></header>
    <nav className="dcu-menu" aria-label={t('sidebar.mainMenu')}>
      {panelButtons(true)}
      {/* 2026-10-12 产品修复：ZCode 侧栏没有上游那个「任务」导航项，全局面板打开后用户没有返回入口
          （实测：再点面板入口、按 Escape 都无效）。`selectPanel(null)` 正是打开面板的逆操作，
          宿主会恢复此前的主视图（会话与草稿都保留）。 */}
      {panelActive && <button type="button" className="dcu-back-to-session" onClick={() => { selectPanel?.(null) }}><MenuIcon><ZIconBack size={16} /></MenuIcon>{t('sidebar.backToConversation')}</button>}
      <button type="button" onClick={() => { beginSession() }}><MenuIcon><ZIconNewTask size={16} /></MenuIcon>{t('sidebar.newTask')}</button>
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
    <div className="dcu-compact-shell"><button type="button" className="dcu-icon" aria-label={t('sidebar.expand')} title={t('sidebar.expand')} onClick={toggleSidebar}><ZIconCollapse size={16} /></button><nav className="dcu-compact-nav" aria-label={t('sidebar.mainMenu')}>{panelButtons(false)}{panelActive && <button type="button" className="dcu-icon" aria-label={t('sidebar.backToConversation')} title={t('sidebar.backToConversation')} onClick={() => { selectPanel?.(null) }}><ZIconBack size={16} /></button>}<button type="button" className="dcu-icon" aria-label={t('sidebar.newTask')} title={t('sidebar.newTask')} onClick={() => { beginSession() }}><ZIconNewTask size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.search')} title={t('sidebar.search')} onClick={openSearch}><ZIconSearch size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.experts')} title={t('sidebar.experts')} onClick={() => { selectExternalSection(t('sidebar.experts')) }}><ZIconExperts size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.skills')} title={t('sidebar.skills')} onClick={() => { selectExternalSection(t('sidebar.skills')) }}><ZIconSkills size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.plugins')} title={t('sidebar.plugins')} onClick={() => { openPlugins() }}><ZIconPlugins size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.connectors')} title={t('sidebar.connectors')} onClick={() => { selectSection(t('sidebar.connectors')) }}><ZIconConnectors size={16} /></button>{extensionPanels.map(panel => <button key={panel.id} type="button" className="dcu-icon" aria-label={panel.label} title={panel.label} onClick={() => { selectPanel?.(panel.id) }}>{renderSlot('sidebar.panellist', { size: 16, active: activePanelId === panel.id }, { only: panel.id })}</button>)}<button type="button" className="dcu-icon" aria-label={t('sidebar.schedule')} title={t('sidebar.schedule')} onClick={() => { selectExternalSection(t('sidebar.schedule')) }}><ZIconSchedule size={16} /></button><button type="button" className="dcu-icon" aria-label={t('sidebar.assistant')} title={t('sidebar.assistant')} onClick={openImSettings}><ZIconAssistant size={16} /></button></nav></div>
    <footer ref={footRef} className="dcu-foot"><div className="dcu-footer-actions">{footerActions === undefined ? renderSlot('sidebar.footer.action', { wide: !visualCompact }) : visibleFooterActions.map(action => <Fragment key={action.id}>{renderSlot('sidebar.footer.action', { wide: !visualCompact }, { only: action.id })}</Fragment>)}</div><div ref={settingsSeat} className="dcu-settings-seat">{renderSlot('sidebar.settings', { wide: !visualCompact })}</div></footer>
    {/* 逐条 only:id 各生成一个 data-slot 锚点；插件可能给锚点写 width:100%，footer-actions 必须保持竖排。 */}
    <SidebarSearch ref={search} imSettingsAvailable={showChannels} openPlugins={openPlugins} settingsSeat={settingsSeat} openSession={openSession} startSession={beginSession} t={t} useSessions={useSessions} useWorkspaces={useWorkspaces} />
    {workspaceShortcuts && <WorkspaceShortcutBridge source={workspaceShortcuts} openSearch={openSearch} startSession={id => { beginSession(id as WorkspaceId) }} renderDirectoryFlow={owner => renderSlot('sidebar.codex.directoryFlow', owner)} t={t} />}
  </aside>
}








CodexSidebar.displayName = 'zcode-ui-for-dsh'
