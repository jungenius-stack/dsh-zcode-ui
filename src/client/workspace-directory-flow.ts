import type { Context } from '@deepseek-ai/cordis'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'

export const WORKSPACE_DIRECTORY_FLOW = 'sidebar.codex.directoryFlow' as const
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.codex.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwnerProps }
  }
}

/** Give the selected host picker an outlet owned by our sidebar, including while collapsed.
 * Directory pickers have no children; preserve their injected face, locale and store.
 * The registry has erased the original component's types, so only this forwarding boundary
 * uses the erased registration signature. No host implementation or private state is imported.
 */
export function registerWorkspaceDirectoryFlow(ctx: Context): void {
  ctx.slots.inject(WORKSPACE_DIRECTORY_FLOW, () => {
    let entry: StoredEntry | undefined
    let offEntry = () => {}
    const register = ctx.slots.register.bind(ctx.slots) as unknown as (options: {
      name: typeof WORKSPACE_DIRECTORY_FLOW
      inject?: StoredEntry['inject']
      store?: StoredEntry['store']
      locale?: string
    }, component: unknown) => () => void
    const reconcile = () => {
      const next = ctx.slots.entriesOfSlot('sidebar.workspaces.directoryFlow')[0]
      if (next === entry) return
      offEntry()
      offEntry = () => {}
      entry = next
      if (!next || Object.keys(next.children ?? {}).length > 0) return
      // priority -1：转发条目必须能 shadow 同槽的任何默认优先级注册（最低优先级者渲染），
      // 且避免与其它默认优先级注册触发「single slot already has a registration at
      // priority 0」冲突（活宿主实测）。
      offEntry = register({ name: WORKSPACE_DIRECTORY_FLOW, priority: -1, inject: next.inject, store: next.store, locale: next.locale } as Parameters<typeof register>[0], next.component)
    }
    reconcile()
    const off = ctx.slots.subscribe('sidebar.workspaces.directoryFlow', reconcile)
    return () => { off(); offEntry() }
  })
}
