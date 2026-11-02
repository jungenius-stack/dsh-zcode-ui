import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clampHoverCardPosition } from './hover-tip.ts'

export type HoverCardTip = {
  title: string
  project?: string
  branch?: string
  time?: string
  left: number
  top: number
  kind?: 'workspace' | 'session'
  id?: string
  path?: string
  count?: number
  unreadCount?: number
  pinned?: boolean
}

export const HOVER_TIP_SHOW_DELAY_MS = 300
export const HOVER_TIP_HIDE_DELAY_MS = 120
/** 退场动画时长（night2 surface-2 #3）：ZCode data-closed:animate-out = 150ms 对称退出。 */
export const HOVER_TIP_EXIT_MS = 150
export const WORKSPACE_HOVER_CARD_WIDTH = 316
const WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT = 152

export type HoverDispatch = {
  showTip: (tip: HoverCardTip, options?: { immediate?: boolean }) => void
  hideTip: () => void
  dismissTip: () => void
  keepTip: () => void
  isShowing: (kind: 'workspace' | 'session', id: string) => boolean
}

const noopDispatch: HoverDispatch = {
  showTip: () => {},
  hideTip: () => {},
  dismissTip: () => {},
  keepTip: () => {},
  isShowing: () => false,
}

const HoverDispatchContext = createContext<HoverDispatch>(noopDispatch)
const HoverValueContext = createContext<HoverCardTip | undefined>(undefined)
const HoverExitContext = createContext(false)

/** 卡片是否正在播退场动画（供卡片根节点挂 data-exit 进 CSS 退场关键帧）。 */
export function useHoverExiting(): boolean {
  return useContext(HoverExitContext)
}

/** 悬停状态放在独立 Provider 里，读 tip 的卡片会更新，树组件只拿稳定的 dispatch。 */
export function HoverShell({ blocked = false, children }: { blocked?: boolean; children: ReactNode }) {
  const [hoverTip, setHoverTip] = useState<HoverCardTip>()
  const [exiting, setExiting] = useState(false)
  const hideTipTimer = useRef<number>()
  const showTipTimer = useRef<number>()
  const exitTipTimer = useRef<number>()
  const pendingTip = useRef<HoverCardTip>()
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked
  const tipRef = useRef(hoverTip)
  tipRef.current = hoverTip
  const cancelExit = (): void => {
    if (exitTipTimer.current !== undefined) { window.clearTimeout(exitTipTimer.current); exitTipTimer.current = undefined }
    setExiting(false)
  }
  const place = (tip: HoverCardTip): HoverCardTip => ({
    ...tip,
    ...clampHoverCardPosition(
      tip.left,
      tip.top,
      tip.kind === 'workspace' ? WORKSPACE_HOVER_CARD_WIDTH : 248,
      tip.kind === 'workspace' ? WORKSPACE_HOVER_CARD_ESTIMATED_HEIGHT : 148,
      window.innerWidth,
      window.innerHeight,
    ),
  })
  const dispatch = useMemo<HoverDispatch>(() => ({
    showTip: (tip, options) => {
      if (blockedRef.current) return
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
      pendingTip.current = tip
      // night2 surface-2 #4：对齐 ZCode Provider 的 alwaysDelay+skipDelayDuration:0——
      // 每个 tooltip 都吃满 300ms 显示延迟，已开卡换行不再秒切（显式 immediate 除外）。
      // 划过空行必须停满 300ms 才出现，避免闪现。
      if (options?.immediate === true) {
        if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
        cancelExit()
        setHoverTip(place(tip))
        return
      }
      if (showTipTimer.current !== undefined) window.clearTimeout(showTipTimer.current)
      showTipTimer.current = window.setTimeout(() => {
        showTipTimer.current = undefined
        const next = pendingTip.current
        if (blockedRef.current || next === undefined) return
        cancelExit()
        setHoverTip(place(next))
      }, HOVER_TIP_SHOW_DELAY_MS)
    },
    hideTip: () => {
      pendingTip.current = undefined
      if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
      if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
      // night2 surface-2 #3：120ms hide 延迟保留（快速划回不闪），此后不再瞬时卸载，
      // 而是播 150ms 对称退场（fade + scale .95 + 8px 回滑）再卸载。
      hideTipTimer.current = window.setTimeout(() => {
        hideTipTimer.current = undefined
        setExiting(true)
        exitTipTimer.current = window.setTimeout(() => {
          exitTipTimer.current = undefined
          setHoverTip(undefined)
          setExiting(false)
        }, HOVER_TIP_EXIT_MS)
      }, HOVER_TIP_HIDE_DELAY_MS)
    },
    dismissTip: () => {
      pendingTip.current = undefined
      if (showTipTimer.current !== undefined) { window.clearTimeout(showTipTimer.current); showTipTimer.current = undefined }
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
      cancelExit()
      setHoverTip(undefined)
    },
    keepTip: () => {
      if (hideTipTimer.current !== undefined) { window.clearTimeout(hideTipTimer.current); hideTipTimer.current = undefined }
    },
    isShowing: (kind, id) => tipRef.current?.kind === kind && tipRef.current.id === id,
  }), [])
  useEffect(() => () => {
    if (hideTipTimer.current !== undefined) window.clearTimeout(hideTipTimer.current)
    if (showTipTimer.current !== undefined) window.clearTimeout(showTipTimer.current)
    if (exitTipTimer.current !== undefined) window.clearTimeout(exitTipTimer.current)
  }, [])
  return <HoverDispatchContext.Provider value={dispatch}><HoverValueContext.Provider value={hoverTip}><HoverExitContext.Provider value={exiting}>{children}</HoverExitContext.Provider></HoverValueContext.Provider></HoverDispatchContext.Provider>
}

export function useHoverDispatch(): HoverDispatch {
  return useContext(HoverDispatchContext)
}

export function useHoverValue(): HoverCardTip | undefined {
  return useContext(HoverValueContext)
}
