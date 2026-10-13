import { useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'

/**
 * 宿主命令目录（`ctx.shortcuts.catalog`）的只读桥。
 *
 * 目录条目形状来自宿主：`{ id, keys, aria }`——keys 是已格式化的键帽串数组，
 * aria 是 `aria-keyshortcuts` 用的组合串。宿主菜单的 `MenuItem.shortcut` 与
 * 按钮的 `aria-keyshortcuts` 都直接消费这两个字段（官方 ui-workspace 同款）。
 *
 * 时序：快捷键服务可能晚于本插件启动。`liveShortcutCatalog` 用 `ctx.inject(['shortcuts'])`
 * 等服务就绪后再订阅；未就绪期间快照恒为空数组，消费方按「无提示」渲染，不阻塞界面。
 */
export type ShortcutCatalogEntry = { id: string; keys: readonly string[]; aria?: string | undefined }

export type ShortcutCatalogSource = {
  getSnapshot: () => readonly ShortcutCatalogEntry[]
  subscribe: (listener: () => void) => () => void
}

const emptyCatalog: readonly ShortcutCatalogEntry[] = []
const noopSubscribe = (): (() => void) => () => {}
const emptySnapshot = (): readonly ShortcutCatalogEntry[] => emptyCatalog

export function liveShortcutCatalog(ctx: Context): ShortcutCatalogSource {
  const listeners = new Set<() => void>()
  let catalog: ShortcutCatalogSource | undefined
  const notify = (): void => { for (const listener of listeners) listener() }
  ctx.inject(['shortcuts'], shortcutCtx => {
    catalog = (shortcutCtx as Context & { shortcuts: { catalog: ShortcutCatalogSource } }).shortcuts.catalog
    const unsubscribe = catalog.subscribe(notify)
    notify()
    return () => { unsubscribe(); catalog = undefined; notify() }
  })
  return {
    getSnapshot: () => catalog?.getSnapshot() ?? emptyCatalog,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}

/** 只读查询钩子：返回 `commandId → 目录条目` 的查找函数（目录未就绪时恒 undefined）。 */
export function useShortcutLookup(source: ShortcutCatalogSource | undefined): (commandId: string) => ShortcutCatalogEntry | undefined {
  const rows = useSyncExternalStore(source?.subscribe ?? noopSubscribe, source?.getSnapshot ?? emptySnapshot, source?.getSnapshot ?? emptySnapshot)
  return commandId => rows.find(row => row.id === commandId)
}
