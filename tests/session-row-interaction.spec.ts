import { createRequire } from 'node:module'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { act, createElement, type ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { CodexWorkspaceBrowser } from '../src/client/CodexWorkspaceBrowser.tsx'
import type { PendingInteractionSnapshot, UseSessionPendingInteraction } from '../src/client/session-pending.ts'

const createRoot = (createRequire(import.meta.url)('react-dom/client') as {
  createRoot: (container: Element) => { render: (node: ReactNode) => void; unmount: () => void }
}).createRoot

const t = (key: string): string => key
const EMPTY_PENDING_INTERACTIONS: PendingInteractionSnapshot = new Map()
const useEmptyPendingInteractions: UseSessionPendingInteraction = selector => selector(EMPTY_PENDING_INTERACTIONS)

function createSession(id: string, displayTitle: string): SessionSummary {
  return {
    id: id as SessionId,
    displayTitle,
    running: false,
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
) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const session = createSession(sessionId, displayTitle)
  const state: SessionListState = {
    ids: [session.id],
    byId: { [session.id]: session },
    phase: 'ready',

    projectionsBySession: {},
  }
  const workspaces = {
    baselinesReady: true,
    archivedSessionIds: [],
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
    expect(row.getAttribute('tabindex')).toBe('0')
    await act(async () => { row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(openSession).toHaveBeenCalledWith('row-keys')
    await act(async () => { row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })) })
    expect(openSession).toHaveBeenCalledTimes(2)
    // 行内按钮（快捷操作）上的 Enter 由按钮自己消费，不得再触发行打开。
    const innerButton = row.querySelector<HTMLElement>('.dcu-wb-quick-actions button')!
    await act(async () => { innerButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(openSession).toHaveBeenCalledTimes(2)
  } finally {
    await view.dispose()
  }
})
