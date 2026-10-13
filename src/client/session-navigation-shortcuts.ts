/**
 * 上/下一个会话的键盘命令（对齐 ZCode `previousConversation` / `nextConversation`）。
 *
 * 宿主命令服务 `ctx.shortcuts` 自身没有这一对（官方注册面：session.new / session.search /
 * session.rename / session.fork / session.archive、workspace.add、settings.open、
 * sidebar.left.toggle），这里把它们补上。注册之后它们进入宿主 catalog：
 * 快捷键分发、用户改键、界面提示统一由宿主负责，本插件不另造键盘通道。
 *
 * 三点取舍（都有理由，不是照抄）：
 * - 用 `ctx.inject(['shortcuts'], …)` 等服务就绪后再注册：服务可能晚于本插件启动
 *   （settings-page-registration.ts 的 liveShortcutCatalog 同一理由），提前 ctx.get
 *   只会拿到 undefined 并永久失去注册机会。不放进插件静态 inject 是因为那要求服务
 *   存在才允许激活，旧宿主（无 shortcuts 服务的版本）会整体拒绝加载本插件。
 * - 注册前查 catalog：宿主将来若原生支持同名命令，这里直接让位（跳过注册），
 *   不制造重复 id。若宿主先注册、本插件后激活，运行时看到的仍是宿主版本。
 * - 键位对齐 ZCode：桌面 Cmd/Ctrl+Shift+[ / ]；web 端 primary+shift+[ 被浏览器
 *   标签页切换占用，按官方同类做法换成 primary+alt（session.new/search 同款补偿）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolveAdjacentSessionNavigation } from './session-order.ts'

type ShortcutBinding = { readonly code: string; readonly modifiers: readonly string[] }

type ShortcutResolveContext = { readonly modal?: string | null }

type ShortcutDefinition = {
  readonly id: string
  readonly label: () => string
  readonly aliases: readonly string[]
  readonly defaults: Readonly<Record<string, ShortcutBinding>>
  readonly regions: readonly string[]
  readonly modals: readonly string[]
  readonly resolve: (context: ShortcutResolveContext) => HandledResult | BlockedResult
}

type HandledResult = { readonly status: 'handled'; readonly run: () => void }
type BlockedResult = { readonly status: 'blocked'; readonly reason: string }

type ShortcutsService = {
  register(definition: ShortcutDefinition): () => void
  catalog: { getSnapshot(): readonly { readonly id: string }[] }
}

export type SessionNavigationLabelKey = 'sessions.previous' | 'sessions.next' | 'sessions.noTarget'

export type SessionNavigationShortcutDeps = {
  /** 插件命名空间的翻译。 */
  readonly t: (key: SessionNavigationLabelKey) => string
  /** 现读侧栏顺序（含偏好缓存）；每次触发都取最新，不缓存快照。 */
  readonly readOrder: () => readonly string[]
  /** 当前打开的会话；无则 undefined。 */
  readonly currentId: () => string | undefined
  /** 打开目标会话。 */
  readonly openSession: (sessionId: string) => void
}

const COMMANDS = [
  { id: 'session.previous', labelKey: 'sessions.previous', aliases: ['previous session'], direction: 'previous', code: 'BracketLeft' },
  { id: 'session.next', labelKey: 'sessions.next', aliases: ['next session'], direction: 'next', code: 'BracketRight' },
] as const satisfies readonly { id: string; labelKey: SessionNavigationLabelKey; aliases: readonly string[]; direction: 'previous' | 'next'; code: string }[]

function bindings(code: string): Readonly<Record<string, ShortcutBinding>> {
  return {
    'desktop:macos': { code, modifiers: ['primary', 'shift'] },
    'desktop:windows': { code, modifiers: ['primary', 'shift'] },
    'desktop:linux': { code, modifiers: ['primary', 'shift'] },
    // web：primary+shift+[ / ] 是浏览器标签页切换，必须让开；官方同类命令在 web
    // 一律退到 primary+alt（session.new/search 的 Cmd+K / Cmd+N 同样被浏览器占用）。
    'web:macos': { code, modifiers: ['primary', 'alt'] },
    'web:windows': { code, modifiers: ['primary', 'alt'] },
  }
}

export function installSessionNavigationShortcuts(ctx: Context, deps: SessionNavigationShortcutDeps): void {
  ctx.inject(['shortcuts'], injected => {
    const service = (injected as Context & { shortcuts?: Partial<ShortcutsService> }).shortcuts
    if (service === undefined || typeof service.register !== 'function' || service.catalog === undefined) return
    const shots = service as ShortcutsService
    const disposers: (() => void)[] = []
    for (const command of COMMANDS) {
      if (shots.catalog.getSnapshot().some(row => row.id === command.id)) continue
      disposers.push(shots.register({
        id: command.id,
        label: () => deps.t(command.labelKey),
        aliases: command.aliases,
        defaults: bindings(command.code),
        regions: ['page', 'editable'],
        modals: [],
        resolve: context => {
          // 模态打开时不接管（rename 同款防御；modals: [] 之外再显式判一次）。
          if (context.modal != null) return { status: 'blocked', reason: deps.t('sessions.noTarget') }
          const navigation = resolveAdjacentSessionNavigation({ sessionIds: deps.readOrder(), currentId: deps.currentId() ?? null })
          const target = command.direction === 'previous' ? navigation.previousSessionId : navigation.nextSessionId
          if (target === null) return { status: 'blocked', reason: deps.t('sessions.noTarget') }
          return { status: 'handled', run: () => { deps.openSession(target) } }
        },
      }))
    }
    return () => { for (const dispose of disposers) dispose() }
  })
}
