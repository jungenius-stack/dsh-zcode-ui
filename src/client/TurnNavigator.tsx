import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { conversationAnchor, conversationAnchors, conversationScrollRoot } from './conversation-dom.ts'
import { findSidebarFrame, parseSidebarGrid } from './sidebar-width.ts'
import { NS } from './locales.ts'

type TurnLink = { key: string; summary: string }

type LegacyConversationSnapshot = { readonly chat: ChatSnapshot }
type TurnNavigatorProps = Omit<PropsRuntime<'conversation.session.header.utilities'>, 'useChat' | 'useSession'> & PropsLocale<typeof NS> & {
  useChat?: SnapshotSelectorHook<ChatSnapshot>
  useSession: SnapshotSelectorHook<SessionSnapshot> | SnapshotSelectorHook<LegacyConversationSnapshot>
}

const stylesheet = `
.dcu-turn-navigator{position:fixed;z-index:20;top:50%;left:var(--dcu-turn-left,288px);transform:translateY(-50%);width:16px;max-height:calc(100vh - 120px);overflow:visible;pointer-events:none}
/* 侧栏开合期间与内容列同步位移（2026-10-19）。
   背景：内容列的滑动是「伪造」的——轨道宽度一帧就切到目标，视觉位移由内容列自己的
   transform 补齐。本索引栏是 position:fixed，按 .dcu-root 的真实几何定位，不吃那段
   transform，于是开合期间它一帧到位、内容列还在路上（实测最大偏差 74px），
   用户看到的就是「索引不跟着侧栏走、漂移」。
   修复：sidebar-width.ts 把同一段位移发布成 --dcu-rail-sync-shift（写起点、过渡到 0），
   这里用与内容列**完全相同**的时长与曲线消费它。三者时间轴必须一致，否则会互相追赶。
   translateY(-50%) 是垂直居中，必须保留，不能被位移覆盖。 */
.dcu-turn-navigator[data-dcu-rail-sync]{transform:translateY(-50%) translateX(var(--dcu-rail-sync-shift,0px));transition:transform var(--dcu-motion-move-duration) var(--dcu-motion-move-ease)}
@media (prefers-reduced-motion:reduce){.dcu-turn-navigator[data-dcu-rail-sync]{transition:none}}
.dcu-turn-scroll{width:16px;max-height:inherit;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;pointer-events:none}
.dcu-turn-scroll::-webkit-scrollbar{display:none}
.dcu-turn-list{display:grid;gap:0;margin:0;padding:4px 0;list-style:none;width:16px;pointer-events:none}
.dcu-turn-link{pointer-events:auto;position:relative;display:flex;align-items:center;justify-content:flex-start;width:36px;height:10px;overflow:visible;padding:0;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);font:13px/18px var(--dsw-font-family);text-align:left;cursor:pointer;transition:color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-turn-link::before{width:var(--dcu-tick-w,12px);height:var(--dcu-tick-h,2px);flex:0 0 var(--dcu-tick-w,12px);border-radius:var(--dsw-radius-full,999px);background:currentcolor;content:'';transform-origin:0 50%;opacity:var(--dcu-tick-op,.58);transition:width var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),height var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),flex-basis var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),opacity var(--dcu-motion-move-duration) var(--dcu-motion-move-ease),background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-turn-summary{position:absolute;left:16px;top:var(--dcu-summary-top,50%);transform:translateY(-50%);box-sizing:border-box;width:max-content;max-width:240px;height:32px;padding:0 12px;border-radius:var(--dsw-radius-2xl);background:#3a3d3c;color:#e8ebe9;box-shadow:0 8px 24px rgba(0,0,0,.28);pointer-events:none;z-index:2;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:32px}
.dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link[aria-current=true]::before{width:var(--dcu-tick-w,5px);flex-basis:var(--dcu-tick-w,5px);height:var(--dcu-tick-h,1px)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[aria-current=true]{color:var(--dsw-alias-label-tertiary)}
.dcu-turn-navigator[data-hovering=true] .dcu-turn-link[data-active=true]{color:var(--dsw-alias-label-primary)}
.dcu-turn-link:focus-visible{outline:0;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dcu-focus))}
@media (prefers-reduced-motion:reduce){.dcu-turn-link,.dcu-turn-link::before{transition:none}}
@media (max-width:760px){.dcu-turn-summary{max-width:200px}}
`

/**
 * 刻度尺寸：按 ZCode 3.16.3 的**离散缩放表**复刻（2026-10-26 CDP 实测）。
 *
 * ZCode 的 hover 不是连续高斯曲线，而是一张只有四档的表，且只影响 ±2 条：
 *   距离 0 → scaleX 2.6 / opacity 1.00   （12px × 2.6 = 31.2px）
 *   距离 1 → scaleX 1.7 / opacity 0.86   （20.4px）
 *   距离 2 → scaleX 1.25 / opacity 0.72  （15px）
 *   距离 ≥3 → scaleX 1   / opacity 0.58  （静息 12px）
 * 静息态：12 × 2px，圆角 full，transform-origin 左侧。
 * 实测数据见 优化UI插件区/ZCODE-INDEX-SPEC.md。
 */
const ZCODE_TICK_BASE_W = 12
const ZCODE_TICK_BASE_H = 2
const ZCODE_HOVER_SCALE = [2.6, 1.7, 1.25] as const
const ZCODE_HOVER_OPACITY = [1, 0.86, 0.72] as const
const ZCODE_IDLE_OPACITY = 0.58

export function tickMarkSize(index: number, hoverAt: number | null, _isCurrent: boolean): { width: number; height: number; opacity: number } {
  if (hoverAt === null) return { width: ZCODE_TICK_BASE_W, height: ZCODE_TICK_BASE_H, opacity: ZCODE_IDLE_OPACITY }
  const distance = Math.abs(index - hoverAt)
  const scale = ZCODE_HOVER_SCALE[distance] ?? 1
  const opacity = ZCODE_HOVER_OPACITY[distance] ?? ZCODE_IDLE_OPACITY
  return {
    width: Number((ZCODE_TICK_BASE_W * scale).toFixed(1)),
    height: ZCODE_TICK_BASE_H,
    opacity,
  }
}

function hoverIndexFromPoint(list: HTMLElement, clientY: number, count: number): number {
  const box = list.getBoundingClientRect()
  if (count <= 0 || box.height <= 0) return 0
  const y = Math.min(Math.max(clientY - box.top, 0), box.height)
  return (y / box.height) * count - 0.5
}

/** 轮目摘要上限：整段长文本会同时进入 title、aria-label 与 DOM 文本，必须截断。 */
const TURN_SUMMARY_LIMIT = 72

function textSummary(content: readonly unknown[], fallback: string): string {
  const text = content.flatMap(block => {
    if (typeof block !== 'object' || block === null) return []
    const value = block as { type?: unknown; text?: unknown }
    return value.type === 'text' && typeof value.text === 'string' ? [value.text] : []
  }).join(' ').replace(/\s+/g, ' ').trim()
  const summary = text === '' ? fallback : text
  return summary.length > TURN_SUMMARY_LIMIT ? `${summary.slice(0, TURN_SUMMARY_LIMIT)}…` : summary
}

function userContent(data: unknown): readonly unknown[] {
  if (typeof data !== 'object' || data === null) return []
  const content = (data as { content?: unknown }).content
  return Array.isArray(content) ? content : []
}

function turnLinks(snapshot: ChatSnapshot, fallback: string): readonly TurnLink[] {
  const links: TurnLink[] = []
  for (const key of snapshot.order) {
    const node = snapshot.nodes.get(key)
    if (node?.kind !== 'user') continue
    links.push({ key: node.key, summary: textSummary(userContent(node.data), fallback) })
  }
  return links
}

function equalTurns(left: readonly TurnLink[], right: readonly TurnLink[]): boolean {
  return left.length === right.length && left.every((turn, index) => turn.key === right[index]?.key && turn.summary === right[index]?.summary)
}

function legacyTurnLinks(useSession: TurnNavigatorProps['useSession'], fallback: string): readonly TurnLink[] {
  return (useSession as SnapshotSelectorHook<SessionSnapshot | LegacyConversationSnapshot>)(snapshot => {
    const chat = 'chat' in snapshot ? snapshot.chat : undefined
    return chat === undefined ? [] : turnLinks(chat, fallback)
  }, equalTurns)
}

/** 帧元素缓存：拖拽时 `.dcu-root` 持续 resize，每次重扫 DOM 会在长会话下掉帧。 */
let railFrameCache: HTMLElement | undefined

function railFrame(): HTMLElement | undefined {
  if (railFrameCache !== undefined && railFrameCache.isConnected) return railFrameCache
  railFrameCache = findSidebarFrame(document)
  return railFrameCache
}

function railLeftFromSidebar(): number {
  // 锚点取**网格轨道宽度**，不是 `.dcu-root` 的 rect（2026-10-19）。
  //
  // 侧栏开合期间外壳宽度会被钉在展开宽度、右缘用 clip-path 裁到目标位置（见
  // sidebar-width.ts 的 primeSidebarSlide），此时 `.dcu-root` 的 rect.right 是**未裁剪**的
  // 展开宽度——照它算锚点会让索引栏在收起方向被多推一整段（实测 440px，离侧栏 200px）。
  // 轨道宽度在两端都是目标几何，配合 --dcu-rail-sync-shift 正好还原视觉位置。
  const frame = railFrame()
  const tracks = frame === undefined ? undefined : parseSidebarGrid(frame.style.gridTemplateColumns)
  if (tracks !== undefined) return Math.round(tracks.sidebar) + 16
  const sidebar = document.querySelector<HTMLElement>('.dcu-root')
  if (sidebar === null) return 288
  return Math.round(sidebar.getBoundingClientRect().right) + 16
}

/** 当前会话的轮次导航；只读取原生聊天锚点并滚动，不改写会话数据或消息视图。 */
export function TurnNavigator({ useChat, useSession, t }: TurnNavigatorProps) {
  const fallback = t('turns.untitled')
  const turns = useChat === undefined
    ? legacyTurnLinks(useSession, fallback)
    : useChat(snapshot => turnLinks(snapshot, fallback), equalTurns)
  const [current, setCurrent] = useState<string | null>(turns[0]?.key ?? null)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const [railLeft, setRailLeft] = useState(288)
  const [summaryTop, setSummaryTop] = useState(0)
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const turnKeys = useMemo(() => turns.map(turn => turn.key).join('|'), [turns])
  const activeIndex = hoverAt === null ? -1 : Math.max(0, Math.min(turns.length - 1, Math.round(hoverAt)))
  const activeTurn = activeIndex >= 0 ? turns[activeIndex] : undefined

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('.dcu-root')
    const update = (): void => {
      const next = railLeftFromSidebar()
      setRailLeft(previous => previous === next ? previous : next)
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    if (sidebar !== null) observer?.observe(sidebar)
    window.addEventListener('resize', update)
    update()
    return () => { observer?.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    if (turns.length === 0) return
    let host: HTMLElement | null = null
    let frame: number | null = null
    const update = (): void => {
      frame = null
      if (host === null) return
      const threshold = host.getBoundingClientRect().top + Math.min(180, host.clientHeight * 0.35)
      const anchors = conversationAnchors(host)
      let next = turns[0]?.key ?? null
      for (const turn of turns) {
        const anchor = anchors.get(turn.key)
        if (anchor !== undefined && anchor.getBoundingClientRect().top <= threshold) next = turn.key
      }
      setCurrent(previous => previous === next ? previous : next)
    }
    const schedule = (): void => { if (frame === null) frame = window.requestAnimationFrame(update) }
    const bindHost = (): void => {
      const next = conversationScrollRoot()
      if (next === host) return
      host?.removeEventListener('scroll', schedule)
      host = next
      host?.addEventListener('scroll', schedule, { passive: true })
      schedule()
    }
    const observer = new MutationObserver(() => { if (host === null || !host.isConnected) bindHost() })
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    bindHost()
    return () => {
      observer.disconnect()
      host?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [turnKeys, turns])

  useEffect(() => {
    const nav = navRef.current
    const list = listRef.current
    if (nav === null || list === null || activeIndex < 0) return
    const button = list.querySelectorAll<HTMLElement>('.dcu-turn-link')[activeIndex]
    if (button === undefined) return
    const next = Math.round(button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2 - nav.getBoundingClientRect().top)
    setSummaryTop(previous => previous === next ? previous : next)
  }, [activeIndex, turns.length])

  if (turns.length === 0) return null
  const moveHover = (event: MouseEvent<HTMLElement>): void => {
    setHoverAt(hoverIndexFromPoint(event.currentTarget, event.clientY, turns.length))
  }
  const style = { '--dcu-turn-left': `${railLeft}px`, '--dcu-summary-top': `${summaryTop}px` } as CSSProperties
  return <nav ref={navRef} className="dcu-turn-navigator" data-hovering={hoverAt !== null || undefined} data-dcu-rail-sync="" aria-label={t('turns.label')} style={style}><style>{stylesheet}</style><div className="dcu-turn-scroll"><ol ref={listRef} className="dcu-turn-list" onMouseMove={moveHover} onMouseLeave={() => { setHoverAt(null) }}>{turns.map((turn, index) => {
    const mark = tickMarkSize(index, hoverAt, current === turn.key)
    const active = hoverAt !== null && index === activeIndex
    const tickStyle = { '--dcu-tick-w': `${mark.width}px`, '--dcu-tick-h': `${mark.height}px`, '--dcu-tick-op': `${mark.opacity}` } as CSSProperties
    return <li key={turn.key}><button type="button" className="dcu-turn-link" data-active={active || undefined} aria-current={current === turn.key || undefined} aria-label={t('turns.jump', { index: index + 1, summary: turn.summary })} style={tickStyle} onFocus={() => { setHoverAt(index) }} onBlur={() => { setHoverAt(null) }} onClick={() => {
      const host = conversationScrollRoot()
      const anchor = host === null ? null : conversationAnchor(host, turn.key)
      if (host === null || anchor === null) return
      /*
       * G11b（2026-10-27）：这里原来是 原生 scrollTo smooth，
       * 但**该 API 在本容器完全无效**（实测 20 帧 scrollTop 恒定，宿主接管了滚动）——
       * 所以点击后 target 算得对、onClick 不报错，画面却纹丝不动。
       * 改为直接赋值：跨距离的平滑由 turn-rail-zcode.ts 的 animateScroll 负责
       * （它用的 Chrome 21 点曲线 + 自适应时长，已验证）。
       * 直接赋值还有一个好处：与 G1 的 reduced-motion 语义天然一致（瞬跳）。
       */
      host.scrollTop = host.scrollTop + anchor.getBoundingClientRect().top - host.getBoundingClientRect().top - 12
    }} /></li>
  })}</ol></div>{activeTurn !== undefined && <span className="dcu-turn-summary">{activeTurn.summary}</span>}</nav>
}
