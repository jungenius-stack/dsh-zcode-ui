import { expect, test, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { installSessionNavigationShortcuts, type SessionNavigationShortcutDeps } from '../src/client/session-navigation-shortcuts.ts'

type Binding = { code: string; modifiers: readonly string[] }
type Registration = {
  id: string
  label: () => string
  aliases: readonly string[]
  defaults: Record<string, Binding>
  regions: readonly string[]
  modals: readonly string[]
  resolve: (context: { modal?: string | null }) => { status: string; run?: () => void; reason?: string }
}

/** 伪造宿主命令服务：记录注册面，catalog 可控（模拟宿主将来原生同名命令）。 */
function createHarness(options?: { held?: readonly string[]; withService?: boolean }) {
  const registrations: Registration[] = []
  const disposers: Array<() => void> = []
  const service = {
    register: (definition: Registration) => {
      registrations.push(definition)
      const dispose = vi.fn()
      disposers.push(dispose)
      return dispose
    },
    catalog: { getSnapshot: () => (options?.held ?? []).map(id => ({ id })) },
  }
  let cleanup: (() => void) | undefined
  let injectedDeps: readonly string[] | undefined
  const ctx = {
    inject: (deps: readonly string[], callback: (ctx: object) => (() => void) | void) => {
      injectedDeps = deps
      cleanup = callback(options?.withService === false ? {} : { shortcuts: service }) ?? undefined
      return {} as never
    },
  } as unknown as Context
  return { ctx, registrations, disposers, injectedDeps: () => injectedDeps, cleanup: () => cleanup?.() }
}

function createDeps(overrides?: Partial<SessionNavigationShortcutDeps>): SessionNavigationShortcutDeps {
  return {
    t: key => `t:${key}`,
    readOrder: () => ['a', 'b', 'c'],
    currentId: () => 'b',
    openSession: vi.fn(),
    ...overrides,
  }
}

test('注册两条命令：等 shortcuts 服务就绪、键位五端齐全、桌面 primary+shift / web primary+alt', () => {
  const harness = createHarness()
  installSessionNavigationShortcuts(harness.ctx, createDeps())
  expect(harness.injectedDeps()).toEqual(['shortcuts'])
  expect(harness.registrations.map(row => row.id)).toEqual(['session.previous', 'session.next'])
  for (const [index, row] of harness.registrations.entries()) {
    const code = index === 0 ? 'BracketLeft' : 'BracketRight'
    expect(row.defaults).toEqual({
      'desktop:macos': { code, modifiers: ['primary', 'shift'] },
      'desktop:windows': { code, modifiers: ['primary', 'shift'] },
      'desktop:linux': { code, modifiers: ['primary', 'shift'] },
      'web:macos': { code, modifiers: ['primary', 'alt'] },
      'web:windows': { code, modifiers: ['primary', 'alt'] },
    })
    expect(row.regions).toEqual(['page', 'editable'])
    expect(row.modals).toEqual([])
  }
  expect(harness.registrations[0].label()).toBe('t:sessions.previous')
  expect(harness.registrations[1].label()).toBe('t:sessions.next')
})

test('resolve 命中：run 打开相邻会话，resolve 阶段无副作用', () => {
  const harness = createHarness()
  const deps = createDeps()
  installSessionNavigationShortcuts(harness.ctx, deps)
  const [previous, next] = harness.registrations

  const previousResult = previous.resolve({ modal: null })
  expect(previousResult.status).toBe('handled')
  expect(deps.openSession).not.toHaveBeenCalled()
  previousResult.run?.()
  expect(deps.openSession).toHaveBeenLastCalledWith('a')

  const nextResult = next.resolve({ modal: null })
  nextResult.run?.()
  expect(deps.openSession).toHaveBeenLastCalledWith('c')
})

test('resolve 边界：没有相邻会话时 blocked 并给本地化理由', () => {
  const harness = createHarness()
  installSessionNavigationShortcuts(harness.ctx, createDeps({ readOrder: () => ['only'], currentId: () => 'only' }))
  for (const row of harness.registrations) {
    const result = row.resolve({ modal: null })
    expect(result.status).toBe('blocked')
    expect(result.reason).toBe('t:sessions.noTarget')
  }
})

test('resolve 模态防御：任何模态打开时不接管', () => {
  const harness = createHarness()
  installSessionNavigationShortcuts(harness.ctx, createDeps())
  const result = harness.registrations[0].resolve({ modal: 'settings' })
  expect(result.status).toBe('blocked')
})

test('宿主已有同名命令时让位：只注册缺的那一条', () => {
  const harness = createHarness({ held: ['session.previous'] })
  installSessionNavigationShortcuts(harness.ctx, createDeps())
  expect(harness.registrations.map(row => row.id)).toEqual(['session.next'])
})

test('服务缺失（旧宿主）时不抛错、零注册', () => {
  const harness = createHarness({ withService: false })
  expect(() => installSessionNavigationShortcuts(harness.ctx, createDeps())).not.toThrow()
  expect(harness.registrations).toEqual([])
})

test('卸载清理：返回的清理函数撤销全部注册', () => {
  const harness = createHarness()
  installSessionNavigationShortcuts(harness.ctx, createDeps())
  harness.cleanup()
  for (const dispose of harness.disposers) expect(dispose).toHaveBeenCalledTimes(1)
})
