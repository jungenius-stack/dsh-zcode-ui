import { openConversation, openConversationWithDraft, selectGlobalPanel } from './session-navigation.ts'
import { createNavigationHistory } from './navigation-history.ts'
import { createWorkspaceShortcutSource } from './workspace-shortcuts.ts'
import { installSessionNavigationShortcuts } from './session-navigation-shortcuts.ts'
import { flattenSidebarSessionOrder } from './session-order.ts'
import { liveShortcutCatalog } from './shortcut-catalog.ts'
import { readPinnedWorkspaceIds, readWorkspaceGroupsCache } from './pinned-workspaces.ts'
import { registerWorkspaceDirectoryFlow, WORKSPACE_DIRECTORY_FLOW } from './workspace-directory-flow.ts'
import { registerAfterOfficialWave } from './official-slot-shadow.ts'
import {
  archiveHostSession,
  currentSessionId,
  forkHostSession,
  probeService,
  renameHostSession,
  UnknownSessionError,
} from './session-host.ts'
import { createGlobalPanelSource } from './global-panels.tsx'
import { initializeComposerWidth, observeHeroWidthHandles } from './composer-width.ts'
import { browserStorage } from './tree-expansion.ts'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { CodexSidebar } from './CodexSidebar.tsx'
import { AboutSection } from './AboutSection.tsx'
import { CodexWorkspaceBrowser } from './CodexWorkspaceBrowser.tsx'
import { ConnectorsSection } from './ConnectorsSection.tsx'
import { en, NS, zh } from './locales.ts'
import { createCompanionTabSource } from './companion-slots.ts'
import { createFooterActionSource } from './footer-actions.ts'
import { openPathInHost, type HostOpenPathConnection } from './host-open-path.ts'
import { observeSettingsNavIcons } from './settings-nav-icons.ts'
import { registerPluginConfigSection } from './plugin-config.ts'
import { registerSettingsPage } from './settings-page-registration.ts'
import { observeSlimSidebar } from './sidebar-width.ts'
import { observeConversationHeader } from './conversation-header.ts'
import { observeOfficialTurnNavigators } from './official-turn-navigator.ts'
import { TurnNavigator } from './TurnNavigator.tsx'
import { registerInputHistory } from './InputHistoryDock.tsx'
import { prefillNewConversation, createDraftPresenceSource } from './new-conversation-draft.ts'
import { observeComposerToolMenus } from './composer-tool-menus.ts'
import { hasConnectWorkspace, hasOpenWorkspace, hasStartSession, recentWorkspaceId, workspaceBaselinesReady } from './workspace-compat.ts'
import { HostActionError, type HostAction, UserFacingError } from './user-error.ts'
import { finishSessionMove, requestSessionMove, sessionMoveErrorKey, SessionMoveRequestError } from './session-move.ts'
import { hasArchiveSessionDelete } from './archive-session-delete.ts'
import { installSkin, SKIN_VERSION } from './zcode-skin.ts'
import { installThemeStyle, syncZCodeTheme } from './zcode-theme.ts'
import { observeHostAnchors } from './host-anchor-contract.ts'
import { observeForeignSurfaces } from './foreign-surface-discovery.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.schedule': {
      kind: 'single'
      scope: 'root'
      owner: {
        wide: boolean
        expandSidebar: () => void
        openSession: (sessionId: SessionId) => void
        renameSession: (sessionId: SessionId, title: string) => Promise<void>
        archiveSession: (sessionId: SessionId) => Promise<void>
        deleteSession: (sessionId: SessionId) => Promise<void>
        forkSession: (sessionId: SessionId) => Promise<void>
        moveSession: (sessionId: SessionId, targetWorkspaceId: WorkspaceId) => Promise<void>
        openPath: (path: string) => Promise<void> | void
        skin?: 'codex' | 'native'
        view?: 'runs' | 'overview'
        showViewSwitch?: boolean
        useSessions: unknown
        useWorkspaces: unknown
      }
    }
    'sidebar.channels': {
      kind: 'single'
      scope: 'root'
      owner: {
        wide: boolean
        expandSidebar: () => void
        openSession: (sessionId: SessionId) => void
        renameSession: (sessionId: SessionId, title: string) => Promise<void>
        archiveSession: (sessionId: SessionId) => Promise<void>
        deleteSession: (sessionId: SessionId) => Promise<void>
        forkSession: (sessionId: SessionId) => Promise<void>
        moveSession: (sessionId: SessionId, targetWorkspaceId: WorkspaceId) => Promise<void>
        openPath: (path: string) => Promise<void> | void
        skin?: 'codex' | 'native'
        useSessions: unknown
        useWorkspaces: unknown
      }
    }
  }
}

export const inject = ['slots', 'sessions', 'workspaces', 'layout', 'locale', 'connection', 'inputTriggers', 'conversation']

type ArchiveRegistry = {
  deleteSession: (sessionId: SessionId) => Promise<
    { ok: true; value?: unknown }
    | { ok: false; error?: { message: string; code?: string; details?: unknown; isDSHRemoteError?: true } }
  >
}

function hasDeleteSession(value: unknown): value is ArchiveRegistry {
  return hasArchiveSessionDelete(value)
}

async function runHostAction<T>(action: HostAction, execute: () => Promise<T>): Promise<T> {
  try {
    return await execute()
  } catch (reason) {
    if (reason instanceof UserFacingError || reason instanceof HostActionError) throw reason
    throw new HostActionError(action, reason)
  }
}

/** Archive Manager replaces the official ui-workspace row with this optional service. */
export function startWorkspaceSession(ctx: ClientContext, workspaceId?: WorkspaceId): void {
  const uiWorkspace = probeService(ctx, 'uiWorkspace')
  if (hasStartSession(uiWorkspace)) {
    uiWorkspace.startSession(workspaceId)
    return
  }
  if (hasStartSession(ctx.workspaces)) {
    ctx.workspaces.startSession(workspaceId)
    return
  }
  console.warn('DSH 工作空间服务尚未就绪，无法新建会话。')
}

/** 替换 DSH 的官方 sidebar 插槽，不修改 DSH 源码或会话数据。 */
export function apply(ctx: ClientContext): void {
  Object.assign(globalThis, { __dcuCurrentSessionId: currentSessionId })
  const widthStorage = browserStorage()
  if (widthStorage) initializeComposerWidth(widthStorage)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'zcode-ui-for-dsh: dictionaries')
  // ZCode 皮肤：把 Zai 双色板写进 DSH 的 host 令牌层（--dsw-*），官方区域随之换肤；
  // 插件自有的侧栏/工作区树/设置页布局层由各组件内的 dcu 样式表负责，两层同源。
  ctx.effect(() => installSkin(), 'zcode-ui-for-dsh: skin stylesheet')
  // 主题层是**应用级**的，不能挂在侧栏组件上：消费 :root 动效令牌的不只有侧栏，
  // 还有会话区的轮次导航与页签滑块。挂在侧栏上时，侧栏一旦不挂载，那两处会静默失去过渡。
  ctx.effect(() => installThemeStyle(), 'zcode-ui-for-dsh: theme stylesheet')
  ctx.effect(() => syncZCodeTheme(), 'zcode-ui-for-dsh: theme mirror')
  // 上游哈希类名锚点的存在性自检：改名时响亮报警，而不是让界面悄悄少一块。
  ctx.effect(() => observeHostAnchors(), 'zcode-ui-for-dsh: host anchor sentinel')
  // 外来表面发现哨兵：新插件装进来若不达标，控制台报警并给出处置建议（不自动改别人）。
  ctx.effect(() => observeForeignSurfaces(), 'zcode-ui-for-dsh: foreign surface sentinel')
  ctx.logger.info('dsh-zcode-ui: ZCode skin v%s installed', SKIN_VERSION)
  const t = ctx.locale.bind(NS)
  ctx.effect(() => observeHeroWidthHandles(t('home.resizeInput')), 'zcode-ui-for-dsh: hero width handles')
  registerInputHistory(ctx)
  // 宿主命令目录（一次订阅，三处消费）：设置页的快捷键提示、侧栏按钮 aria-keyshortcuts、
  // 会话菜单键帽后缀。服务晚启动由桥内部的 ctx.inject 兜住。
  const shortcutCatalog = liveShortcutCatalog(ctx)
  registerSettingsPage(ctx, shortcutCatalog)
  registerPluginConfigSection(ctx)
  // Host 与客户端共用 Cordis 的服务名；此处读取的是客户端 RPC 外观，而非 HostConnectionService。
  const connectionService: unknown = ctx.get('connection')
  const connection = connectionService as HostOpenPathConnection
  const openPath = (path: string): Promise<void> => openPathInHost(connection, path)
  ctx.effect(() => observeSlimSidebar(), 'zcode-ui-for-dsh: slim sidebar')
  ctx.effect(() => observeSettingsNavIcons(), 'zcode-ui-for-dsh: settings nav icons')
  ctx.effect(() => observeComposerToolMenus({ search: t('home.projectSearch'), empty: t('home.projectEmpty') }), 'zcode-ui-for-dsh: composer tool menus')
  ctx.effect(() => observeConversationHeader(), 'zcode-ui-for-dsh: conversation header')
  ctx.effect(() => observeOfficialTurnNavigators(), 'zcode-ui-for-dsh: official turn navigator')
  const newConversationDraft = createDraftPresenceSource(ctx.sessions.list, () => {
    const id = currentSessionId(ctx.sessions.list.getSnapshot())
    const binding = id === undefined ? undefined : ctx.sessions.binding(id as SessionId)
    return binding === undefined ? undefined : ctx.conversation.input.for(binding.ctx).state
  })
  const companionSlots = createCompanionTabSource(ctx.slots)
  const globalPanels = createGlobalPanelSource(ctx.slots, ctx.locale)
  const footerActions = createFooterActionSource(ctx.slots)
  const navigationHistory = createNavigationHistory(ctx.sessions.list, id => openConversation(ctx, ctx.layout, id))
  ctx.effect(() => () => { navigationHistory.dispose() }, 'zcode-ui-for-dsh: navigation history')
  const workspaceShortcuts = createWorkspaceShortcutSource(ctx.slots)
  ctx.effect(() => () => { workspaceShortcuts.dispose() }, 'zcode-ui-for-dsh: workspace shortcuts')
  // 键盘：上/下一个会话（对齐 ZCode，宿主命令表没有这一对）。
  // 顺序现读快照 + 本地偏好缓存（与侧栏树同一批助手计算），当期会话取打开中的那个。
  const shortcutStorage = browserStorage()
  installSessionNavigationShortcuts(ctx, {
    t: key => t(key),
    readOrder: () => flattenSidebarSessionOrder({
      workspaces: ctx.workspaces.list.getSnapshot(),
      sessions: ctx.sessions.list.getSnapshot(),
      pinnedWorkspaceIds: readPinnedWorkspaceIds(shortcutStorage),
      workspaceGroups: readWorkspaceGroupsCache(shortcutStorage).workspaceGroups,
    }),
    currentId: () => currentSessionId(ctx.sessions.list.getSnapshot()),
    openSession: sessionId => { openConversation(ctx, ctx.layout, sessionId) },
  })
  registerWorkspaceDirectoryFlow(ctx)
  const ownSidebarChildren = {
    'sidebar.panellist': { kind: 'list' as const, scope: 'root' as const },
    [WORKSPACE_DIRECTORY_FLOW]: { kind: 'single' as const, scope: 'root' as const },
    'sidebar.channels': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.schedule': { kind: 'single' as const, scope: 'root' as const },
  }
  const sharedSidebarChildren = {
    'sidebar.workspaces': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.settings': { kind: 'single' as const, scope: 'root' as const },
    'sidebar.footer.action': { kind: 'list' as const, scope: 'root' as const },
  }
  const officialSidebarReady = (): boolean => ctx.slots.entries('sidebar').some(entry => entry.component !== CodexSidebar)
  ctx.slots.inject('sidebar', () => registerAfterOfficialWave(ctx.slots, 'sidebar', officialSidebarReady, () => {
    const declared = (name: string): boolean => {
      const spec = ctx.slots.spec as ((this: unknown, key: string) => unknown) | undefined
      return typeof spec === 'function' && spec.call(ctx.slots, name) !== undefined
    }
    // 0.2 官方侧栏已经声明 panellist。重复声明会让本插件激活失败。
    const children: Record<string, { kind: 'single' | 'list'; scope: 'root' }> = {}
    for (const [name, spec] of Object.entries({ ...sharedSidebarChildren, ...ownSidebarChildren })) {
      if (!declared(name)) children[name] = spec
    }
    const register = (next: typeof children): () => void => {
      try {
        return ctx.slots.register({
          name: 'sidebar', priority: -1, registrant: 'zcode-ui-for-dsh', locale: NS,
          children: next as typeof ownSidebarChildren & typeof sharedSidebarChildren,
          inject: () => ({
            newConversationDraft,
            navigationHistory,
            workspaceShortcuts,
            shortcuts: shortcutCatalog,
            prefillNewConversation: (text: string) => {
              const id = currentSessionId(ctx.sessions.list.getSnapshot())
              const binding = id === undefined ? undefined : ctx.sessions.binding(id as SessionId)
              return prefillNewConversation(binding === undefined ? undefined : ctx.conversation.input.for(binding.ctx), text)
            },
            openSession: (sessionId: SessionId) => { openConversation(ctx, ctx.layout, sessionId) },
            startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
            toggleSidebar: () => { ctx.layout.toggleSidebar() },
            archiveSession,
            canDeleteSession: () => hasArchiveSessionDelete(ctx.get('remote.workspaceRegistry')),
            deleteSession,
            forkSession,
            moveSession,
            renameSession,
            openPath,
            companionSlots,
            globalPanels,
            footerActions,
            selectPanel: (id: string | null) => { selectGlobalPanel(ctx.layout, id) },
          }),
        }, CodexSidebar)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const conflict = /slot "([^"]+)" is already declared/.exec(message)
        if (conflict === null || next[conflict[1]] === undefined) throw error
        const rest = { ...next }
        delete rest[conflict[1]]
        return register(rest)
      }
    }
    return register(children)
  }))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'turn-navigator', order: 100, locale: NS,
  }, TurnNavigator))

  const forkSession = async (sessionId: SessionId): Promise<void> => {
    await runHostAction('fork', () => forkHostSession(ctx, sessionId))
  }
  const renameSession = async (sessionId: SessionId, title: string): Promise<void> => {
    await runHostAction('rename', async () => {
      try {
        await renameHostSession(ctx, sessionId, title)
      } catch (reason) {
        if (reason instanceof UnknownSessionError) throw new UserFacingError(t('sessions.unknown'))
        throw reason
      }
    })
  }
  const deleteSession = async (sessionId: SessionId): Promise<void> => {
    const registry = ctx.get('remote.workspaceRegistry')
    if (!hasDeleteSession(registry)) throw new UserFacingError(t('sessions.deleteUnavailable'))
    await runHostAction('delete', async () => {
      const result = await registry.deleteSession(sessionId)
      if (!result.ok) throw result.error === undefined
        ? new UserFacingError(t('sessions.deleteUnavailable'))
        : result.error
    })
  }
  const archiveSession = (sessionId: SessionId): Promise<void> => runHostAction('archive', () => archiveHostSession(ctx, sessionId))
  const moveSession = async (sessionId: SessionId, targetWorkspaceId: WorkspaceId): Promise<void> => {
    try {
      await requestSessionMove(sessionId, targetWorkspaceId)
    } catch (error) {
      if (!(error instanceof SessionMoveRequestError)) throw error
      throw new UserFacingError(t(sessionMoveErrorKey(error.code)))
    }
    finishSessionMove({
      sessionId,
      currentUrl: window.location.href,
      navigate: url => { window.location.replace(url) },
    })
  }
  const startConnectorPromptSession = async (promptText: string): Promise<void> => {
    const prompt = promptText.trim()
    if (prompt === '') throw new UserFacingError(t('connectors.promptRequired'))
    const workspaces = ctx.workspaces.list.getSnapshot()
    const sessionSnapshot = ctx.sessions.list.getSnapshot()
    const selectedSessionId = currentSessionId(sessionSnapshot)
    const currentWorkspaceId = selectedSessionId === undefined
      ? undefined
      : workspaces.items.find(workspace => workspace.sessionIds.includes(selectedSessionId as SessionId))?.workspaceId
    const baselinesReady = workspaceBaselinesReady(workspaces, sessionSnapshot)
    const targetWorkspaceId = currentWorkspaceId ?? (baselinesReady ? recentWorkspaceId(workspaces.items, sessionSnapshot.byId) : undefined)
    if (targetWorkspaceId === undefined && !baselinesReady) throw new UserFacingError(t('connectors.workspacesLoading'))
    if (targetWorkspaceId === undefined) throw new UserFacingError(t('connectors.workspaceRequired'))
    const uiWorkspace = probeService(ctx, 'uiWorkspace')
    const conversation = ctx.get('conversation')
    if (conversation === undefined) throw new UserFacingError(t('connectors.conversationUnavailable'))
    try {
      if (hasOpenWorkspace(uiWorkspace)) {
        await Promise.resolve(uiWorkspace.openWorkspace(targetWorkspaceId, id => {
          const binding = ctx.sessions.binding(id)
          if (binding?.ctx === undefined) throw new UnknownSessionError()
          conversation.input.for(binding.ctx as ClientContext).setDraft(prompt)
        }))
        selectGlobalPanel(ctx.layout, null)
        return
      }
      const workspaceNavigation = hasConnectWorkspace(uiWorkspace) ? uiWorkspace : hasConnectWorkspace(ctx.workspaces) ? ctx.workspaces : undefined
      if (workspaceNavigation === undefined) throw new UserFacingError(t('connectors.workspaceUnavailable'))
      const sessionId = await workspaceNavigation.connectWorkspace(targetWorkspaceId)
      await openConversationWithDraft(ctx, ctx.layout, ctx.sessions, sessionId, binding => {
        if (binding.ctx === undefined) throw new UnknownSessionError()
        conversation.input.for(binding.ctx as ClientContext).setDraft(prompt)
      })
    } catch (reason) {
      if (reason instanceof UnknownSessionError) throw new UserFacingError(t('connectors.sessionPending'))
      throw reason
    }
  }
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces', priority: -1, locale: NS,
    inject: () => ({
      archiveSession,
      canDeleteSession: () => hasArchiveSessionDelete(ctx.get('remote.workspaceRegistry')),
      deleteSession,
      deleteWorkspace: (workspaceId: WorkspaceId) => ctx.workspaces.delete(workspaceId),
      forkSession,
      moveSession,
      openPath,
      openSession: (sessionId: SessionId) => { openConversation(ctx, ctx.layout, sessionId) },
      shortcuts: shortcutCatalog,
      // 宿主会话置顶（registry 级 pinnedSessionIds + pinSession/unpinSession）：
      // 只在宿主提供这两个方法时注入；旧宿主缺省时整条置顶呈现链自动缺席
      // （行首按钮、菜单项、置顶排前都不会出现），不虚构能力。
      ...(typeof (ctx.workspaces as { pinSession?: unknown }).pinSession === 'function' && typeof (ctx.workspaces as { unpinSession?: unknown }).unpinSession === 'function'
        ? {
            pinSession: (sessionId: SessionId) => runHostAction('pin', () => ctx.workspaces.pinSession(sessionId)),
            unpinSession: (sessionId: SessionId) => runHostAction('pin', () => ctx.workspaces.unpinSession(sessionId)),
          }
        : {}),
      renameSession,
      renameWorkspace: (workspaceId: WorkspaceId, title: string) => ctx.workspaces.rename(workspaceId, title),
      insertWorkspaceBefore: (workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId) => ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId),
      insertSessionBefore: (workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId) => ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId),
      startSession: (workspaceId?: WorkspaceId) => { startWorkspaceSession(ctx, workspaceId) },
    }),
  }, CodexWorkspaceBrowser))

  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {}
    const sessionId = new URL(window.location.href).searchParams.get('session') as SessionId | null
    if (sessionId === null || sessionId === '') return () => {}
    let opened = false
    const openDeepLink = (): void => {
      if (opened || ctx.sessions.list.getSnapshot().byId[sessionId] === undefined) return
      opened = true
      openConversation(ctx, ctx.layout, sessionId)
    }
    openDeepLink()
    return ctx.sessions.list.subscribe(openDeepLink)
  }, 'zcode-ui-for-dsh: session deep link')

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'connectors', order: 17, label: () => t('sidebar.connectors'),
    ...({ icon: 'connector' } as Record<string, unknown>),
    inject: () => ({ sessionStore: ctx.sessions.list, startPromptSession: startConnectorPromptSession, t }),
  }, ConnectorsSection))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'about', order: Number.MAX_SAFE_INTEGER, label: () => t('about.nav'), locale: NS,
  }, AboutSection))
}
