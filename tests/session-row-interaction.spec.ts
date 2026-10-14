import { createRequire } from 'node:module'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { CodexWorkspaceBrowser } from '../src/client/CodexWorkspaceBrowser.tsx'
import { SESSION_UNREAD_STORAGE_KEY } from '../src/client/session-manager.ts'
import { installTreeKeyboard } from '../src/client/tree-keyboard.ts'
import type { PendingInteractionSnapshot, UseSessionPendingInteraction } from '../src/client/session-pending.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

const t = (key: string): string => key
const EMPTY_PENDING_INTERACTIONS: PendingInteractionSnapshot = new Map()
const useEmptyPendingInteractions: UseSessionPendingInteraction = selector => selector(EMPTY_PENDING_INTERACTIONS)

function createSession(id: string, displayTitle: string, running = false): SessionSummary {
  return {
    id: id as SessionId,
    displayTitle,
    running,
    blank: false,
    updatedAt: Date.parse('2026-09-01T00:00:00.000Z'),
    retainedBy: {},
  }
}

/** 最小任务树夹具：一个项目 + 一条会话，供行级交互测试使用。 */
async function renderTree(
  sessionId: string,
  displayTitle: string,
  archiveSession: (id: string) => Promise<void>,
  openSession: (id: string) => void,
  options: { running?: boolean; unread?: boolean; pinned?: boolean; pinSession?: (id: string) => Promise<void>; unpinSession?: (id: string) => Promise<void> } = {},
) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const session = createSession(sessionId, displayTitle, options.running === true)
  // 未读来自本地存储（组件用 useState 初始化只读一次，必须在挂载前种好）。
  if (options.unread === true) window.localStorage.setItem(SESSION_UNREAD_STORAGE_KEY, JSON.stringify({ version: 1, ids: [sessionId] }))
  const state: SessionListState = {
    ids: [session.id],
    byId: { [session.id]: session },
    phase: 'ready',

    projectionsBySession: {},
  }
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
    pinnedSessionIds: options.pinned === true ? [session.id] : [],
    items: [{ workspaceId: 'row-workspace', title: '交互测试项目', path: 'D:\\Workspace\\row', sessionIds: [session.id] }],
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(CodexWorkspaceBrowser, {
      openSession,
      archiveSession,
      deleteSession: async () => {},
      forkSession: async () => {},
      renameSession: async () => {},
      wide: true,
      useSessions: (selector: (snapshot: SessionListState) => unknown) => selector(state),
      useSessionPendingInteraction: useEmptyPendingInteractions,
      useWorkspaces: (selector: (snapshot: typeof workspaces) => unknown) => selector(workspaces),
      t,
      deleteWorkspace: async () => {},
      insertSessionBefore: async () => {},
      insertWorkspaceBefore: async () => {},
      openPath: async () => {},
      renameWorkspace: async () => {},
      startSession: () => {},
      ...(options.pinSession === undefined ? {} : { pinSession: (id: string) => options.pinSession!(id), unpinSession: (id: string) => options.unpinSession!(id) }),
    } as never))
    await Promise.resolve()
    await Promise.resolve()
  })
  const row = container.querySelector<HTMLElement>(`[data-dcu-session="${sessionId}"]`)
  expect(row).not.toBeNull()
  return {
    container,
    row: row!,
    dispose: async () => {
      await act(async () => { root.unmount() })
      container.remove()
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

test('会话行归档为两步确认：首击进确认态、Escape 取消、二次点击才执行一次', async () => {
  const archiveSession = vi.fn(async () => {})
  const openSession = vi.fn()
  const view = await renderTree('row-confirm', '确认会话', archiveSession, openSession)
  try {
    const { row } = view
    const archiveButton = () => row.querySelector<HTMLButtonElement>('.dcu-wb-quick-actions button')!
    // 首击：只进入确认态，不执行、不触发行打开。
    await act(async () => { archiveButton().click() })
    expect(archiveSession).not.toHaveBeenCalled()
    expect(openSession).not.toHaveBeenCalled()
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(true)
    expect(row.querySelector('.dcu-wb-confirm')?.textContent).toBe('sessions.confirm')
    // Escape 取消后回到普通归档按钮。
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(false)
    expect(row.querySelector('.dcu-wb-confirm')).toBeNull()
    // 再进确认态后点确认按钮：恰好执行一次。
    await act(async () => { archiveButton().click() })
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(true)
    await act(async () => { row.querySelector<HTMLButtonElement>('.dcu-wb-confirm')!.click() })
    expect(archiveSession).toHaveBeenCalledTimes(1)
    expect(archiveSession).toHaveBeenCalledWith('row-confirm')
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(false)
  } finally {
    await view.dispose()
  }
})

test('归档确认态按条目边界取消：条目内 pointerdown 不取消，条目外取消', async () => {
  const archiveSession = vi.fn(async () => {})
  const view = await renderTree('row-outside', '边界会话', archiveSession, vi.fn())
  try {
    const { row } = view
    await act(async () => { row.querySelector<HTMLButtonElement>('.dcu-wb-quick-actions button')!.click() })
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(true)
    // 条目内的 pointerdown（如点在标题上）不取消——ZCode 同款边界语义。
    await act(async () => { row.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(true)
    // 条目外的 pointerdown 取消。
    await act(async () => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
    expect(row.classList.contains('dcu-wb-archive-confirming')).toBe(false)
    expect(archiveSession).not.toHaveBeenCalled()
  } finally {
    await view.dispose()
  }
})

test('会话行可聚焦，Enter 与空格打开会话；行内按钮上的 Enter 不触发行打开', async () => {
  const openSession = vi.fn()
  const view = await renderTree('row-keys', '键盘会话', vi.fn(async () => {}), openSession)
  try {
    const { row } = view
    // tabIndex 由 tree-keyboard 的 roving 统一管理，JSX 里不再写死 0。
    // 这里只断言「行仍是可编程聚焦的」——roving 选中哪一项取决于树里还有哪些可见项，
    // 那不是本测试关心的事（roving 与 aria-level 由 tree-keyboard.spec.ts 专门覆盖）。
    const stop = installTreeKeyboard(row.closest('[role="tree"]') as HTMLElement)
    try {
      const tabIndex = row.getAttribute('tabindex')
      expect(tabIndex === '0' || tabIndex === '-1').toBe(true)
      row.focus()
      expect(document.activeElement).toBe(row)
      await act(async () => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
      expect(openSession).toHaveBeenCalledWith('row-keys')
      await act(async () => { row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })) })
      expect(openSession).toHaveBeenCalledTimes(2)
      // 行内按钮（快捷操作）上的 Enter 由按钮自己消费，不得再触发行打开。
      const innerButton = row.querySelector<HTMLElement>('.dcu-wb-quick-actions button')!
      await act(async () => { innerButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
      expect(openSession).toHaveBeenCalledTimes(2)
    } finally {
      stop()
    }
  } finally {
    await view.dispose()
  }
})

test('状态槽优先级：未读优先于运行中（同一时刻行首只出一个指示）', async () => {
  const view = await renderTree('row-slot', '状态槽会话', vi.fn(async () => {}), vi.fn(), { running: true, unread: true })
  try {
    const { row } = view
    expect(row.querySelector('.dcu-wb-unread')).not.toBeNull()
    expect(row.querySelector('.dcu-wb-running')).toBeNull()
  } finally {
    await view.dispose()
  }
})

test('仅在运行中（无未读）的会话在行首状态槽画转圈', async () => {
  const view = await renderTree('row-spin', '运行中会话', vi.fn(async () => {}), vi.fn(), { running: true })
  try {
    const { row } = view
    expect(row.querySelector('.dcu-wb-running')).not.toBeNull()
    expect(row.querySelector('.dcu-wb-unread')).toBeNull()
  } finally {
    await view.dispose()
  }
})

test('会话行置顶按钮：状态来自宿主快照、点击调用对应宿主 API', async () => {
  const pinSession = vi.fn(async () => {})
  const unpinSession = vi.fn(async () => {})
  // 未置顶：行无 data-pinned，按钮 aria-label 为置顶，点击调 pinSession。
  const unpinned = await renderTree('row-pin-a', '未置顶会话', vi.fn(async () => {}), vi.fn(), { pinSession, unpinSession })
  try {
    const button = unpinned.row.querySelector<HTMLButtonElement>('.dcu-wb-pin')
    expect(button).not.toBeNull()
    expect(unpinned.row.dataset.pinned).toBeUndefined()
    expect(button!.getAttribute('aria-label')).toBe('sessions.pin')
    await act(async () => { button!.click() })
    expect(pinSession).toHaveBeenCalledWith('row-pin-a')
    expect(unpinSession).not.toHaveBeenCalled()
  } finally {
    await unpinned.dispose()
  }
  // 已置顶：data-pinned 上到行，按钮 aria-label 为取消置顶，点击调 unpinSession。
  const pinned = await renderTree('row-pin-b', '已置顶会话', vi.fn(async () => {}), vi.fn(), { pinned: true, pinSession, unpinSession })
  try {
    const button = pinned.row.querySelector<HTMLButtonElement>('.dcu-wb-pin')
    expect(pinned.row.dataset.pinned).toBe('true')
    expect(button!.getAttribute('aria-label')).toBe('sessions.unpin')
    await act(async () => { button!.click() })
    expect(unpinSession).toHaveBeenCalledWith('row-pin-b')
    expect(pinSession).toHaveBeenCalledTimes(1)
  } finally {
    await pinned.dispose()
  }
})

test('旧宿主（无 pin 能力）不渲染置顶按钮，行也不带置顶态', async () => {
  const view = await renderTree('row-pin-c', '无能力会话', vi.fn(async () => {}), vi.fn())
  try {
    expect(view.row.querySelector('.dcu-wb-pin')).toBeNull()
    expect(view.row.dataset.pinned).toBeUndefined()
  } finally {
    await view.dispose()
  }
})

test('置顶顺序：置顶会话排到项目内最前（与侧栏渲染一致）', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessions = [createSession('row-order-a', '甲'), createSession('row-order-b', '乙'), createSession('row-order-c', '丙')]
  const state: SessionListState = { ids: sessions.map(row => row.id), byId: Object.fromEntries(sessions.map(row => [row.id, row])), phase: 'ready', projectionsBySession: {} }
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
    pinnedSessionIds: ['row-order-c'],
    items: [{ workspaceId: 'row-workspace', title: '排序项目', path: 'D:\\Workspace\\order', sessionIds: ['row-order-a', 'row-order-b', 'row-order-c'] }],
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ exists: true, pinnedWorkspaceIds: [] }), { status: 200, headers: { 'content-type': 'application/json' } })))
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(CodexWorkspaceBrowser, {
      openSession: () => {},
      archiveSession: async () => {},
      deleteSession: async () => {},
      forkSession: async () => {},
      renameSession: async () => {},
      wide: true,
      useSessions: (selector: (snapshot: SessionListState) => unknown) => selector(state),
      useSessionPendingInteraction: useEmptyPendingInteractions,
      useWorkspaces: (selector: (snapshot: typeof workspaces) => unknown) => selector(workspaces),
      t,
      deleteWorkspace: async () => {},
      insertSessionBefore: async () => {},
      insertWorkspaceBefore: async () => {},
      openPath: async () => {},
      renameWorkspace: async () => {},
      startSession: () => {},
    } as never))
    await Promise.resolve()
    await Promise.resolve()
  })
  try {
    const ids = [...container.querySelectorAll('[data-dcu-session]')].map(node => (node as HTMLElement).dataset.dcuSession)
    expect(ids).toEqual(['row-order-c', 'row-order-a', 'row-order-b'])
  } finally {
    await act(async () => { root.unmount() })
    container.remove()
  }
})
