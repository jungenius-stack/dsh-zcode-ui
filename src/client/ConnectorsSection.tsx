import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ZIconConnectors } from './zcode-icons.tsx'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { CODEX_UI_API_ENDPOINTS } from '../business-api.ts'
import { NS } from './locales.ts'
import { currentSessionId } from './session-host.ts'
import { userErrorText } from './user-error.ts'
import { BusinessRequestError, businessRequestErrorKey } from './business-request-error.ts'

type SnapshotStore<T> = { getSnapshot: () => T; subscribe: (listener: () => void) => () => void }
type Connector = { name: string; tools: readonly { name: string; description: string }[] }

export type ConnectorsSectionProps = {
  sessionStore: SnapshotStore<SessionListState>
  startPromptSession: (prompt: string) => Promise<void>
  t: TranslateNS<typeof NS>
}

const MCP_CONNECTOR_UI = '/mcp-connector/ui/'
const PROMPT_REQUEST_TYPE = 'mcp-connector:start-session'
const PROMPT_RESULT_TYPE = 'mcp-connector:start-session-result'

const stylesheet = `
.dcu-connectors{color:var(--dsw-alias-label-primary)}.dcu-connectors h2{margin:0;font-size:var(--dsw-font-size-xl)}.dcu-connectors p{margin:6px 0 var(--dcu-space-4);color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm)}.dcu-connector-frame{display:block;width:100%;height:clamp(420px,calc(100vh - 160px),700px);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-bg-base);color-scheme:light dark}.dcu-connector-list{overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl)}.dcu-connector{padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dcu-connector:last-child{border-bottom:0}.dcu-connector-head{display:flex;align-items:center;gap:8px;font-weight:600}.dcu-connector-meta{margin:var(--dcu-space-1) 0 var(--dcu-space-2);color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm)}.dcu-connector-tool{padding:var(--dcu-space-1) 0 0 24px;color:var(--dsw-alias-label-secondary);font-size:var(--dsw-font-size-sm)}.dcu-connector-tool span{display:block;margin-top:1px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsw-font-size-sm)}.dcu-connector-empty{padding:20px 8px;color:var(--dsw-alias-label-secondary);text-align:center}
`

/**
 * 连接器面板的宿主主题注入。
 *
 * ⚠ **这里必须写字面量，不能改写成 `var(--dcu-sidebar-*)`**（2026-10-18 设计审计 P0-3 复核）。
 * 这两段字符串不是页面样式，而是 `syncFrameTheme()` 塞进 iframe `<style>` 的内容
 * （见下方 `doc.head.append(style)`）。CSS 自定义属性**不跨 document 继承**——实测在父页
 * 设 `--dcu-sidebar-tertiary=#686868` 后，iframe 内 `color:var(--dcu-sidebar-tertiary)`
 * 的 computed 值是 `rgb(0, 0, 0)`（解析失败 → 回退继承色），而字面量正常生效。
 * 若按「有 hex 就换令牌」的直觉改，会把一处不达标的灰换成静默黑字，比现状更糟。
 * （同源旁证：docs/KNOWN-ISSUES.md 第 8 条已记录该 iframe「CSS 对宿主令牌引用 0 处」。）
 *
 * 因此此处只做**数值对齐**：让亮色档的二级/三级灰与侧栏色阶取同值，
 * 顺手修掉 `--muted` 的原值 `#777777`——它正是 zcode-theme 里已判死并删除的
 * 修复前旧值（on `#f8f8f8` 仅 4.22:1，低于 AA）。暗色档保持不动：现值在 `#161616`
 * 上是 5.60 / 5.10，已达标，而换成侧栏暗色档（`#828282`）反而会掉到 3.68。
 */
const frameLightTheme = `:root{color-scheme:light;--bg:#f8f8f8;--card:#ffffff;--line:rgba(13,13,13,.1);--text:#262626;--text-2:#5c5c5c;--muted:#686868;--accent:#000000;--accent-hover:#404040;--accent-light:rgba(13,13,13,.05);--dcu-action:#000000;--dcu-action-hover:#404040;--dcu-on-action:#ffffff;--ok:#1e8a3e;--ok-bg:#eaf7ee;--warn:#e07b00;--warn-bg:#fff4eb;--bad:#e03131;--bad-bg:#fdecec;--shadow:0 1px 3px rgba(13,13,13,.08),0 1px 2px rgba(13,13,13,.06);--shadow-lg:0 10px 25px rgba(13,13,13,.1)}`
const frameDarkTheme = `:root{color-scheme:dark;--bg:#161616;--card:#2b2b2b;--line:rgba(255,255,255,.1);--text:#d4d4d4;--text-2:#8f8f8f;--muted:#888888;--accent:#ffffff;--accent-hover:#d4d4d4;--accent-light:rgba(255,255,255,.05);--dcu-action:#ffffff;--dcu-action-hover:#d4d4d4;--dcu-on-action:#000000;--ok:#46bf72;--ok-bg:#12291b;--warn:#ff8a30;--warn-bg:#331d0d;--bad:#ff5c5c;--bad-bg:#3b1717;--shadow:0 1px 3px rgba(0,0,0,.35);--shadow-lg:0 16px 35px rgba(0,0,0,.45)}`

// 仅注入本设置页承载的连接器 iframe；推荐边框不是告警，状态色仍由原页保留。
const frameSurfaceTheme = `
.card.featured{border-color:var(--line)}
.card:hover,.card.featured:hover{border-color:var(--muted)}
.btn:not(.ghost):not(.danger):not(.status-warning):not(.status-bad),.icon-btn.primary,.btn-primary,.prompt-item .send-btn{background:var(--dcu-action);border-color:var(--dcu-action);color:var(--dcu-on-action)}
.btn:not(.ghost):not(.danger):not(.status-warning):not(.status-bad):hover,.icon-btn.primary:hover,.btn-primary:hover,.prompt-item .send-btn:hover{background:var(--dcu-action-hover);border-color:var(--dcu-action-hover)}
`

function isConnector(value: unknown): value is Connector {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string' && Array.isArray(item.tools)
    && item.tools.every(tool => tool !== null && typeof tool === 'object'
      && typeof (tool as Record<string, unknown>).name === 'string'
      && typeof (tool as Record<string, unknown>).description === 'string')
}

function isPromptRequest(value: unknown): value is { type: typeof PROMPT_REQUEST_TYPE; requestId: string; prompt: string } {
  if (value === null || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return item.type === PROMPT_REQUEST_TYPE && typeof item.requestId === 'string' && item.requestId !== ''
    && typeof item.prompt === 'string' && item.prompt.trim() !== ''
}

function syncFrameTheme(frame: HTMLIFrameElement | null): void {
  const doc = frame?.contentDocument
  if (doc === null || doc === undefined) return
  let style = doc.head.querySelector<HTMLStyleElement>('style[data-michengai-host-theme]')
  if (style === null) {
    style = doc.createElement('style')
    style.dataset.michengaiHostTheme = 'true'
    doc.head.append(style)
  }
  style.textContent = (document.body.hasAttribute('data-ds-dark-theme') ? frameDarkTheme : frameLightTheme) + frameSurfaceTheme
}

function ConnectorMarket({ startPromptSession, t }: Pick<ConnectorsSectionProps, 'startPromptSession' | 't'>) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const frameWindow = frameRef.current?.contentWindow
      if (event.origin !== window.location.origin || frameWindow === null || frameWindow === undefined || event.source !== frameWindow) return
      if (!isPromptRequest(event.data)) return
      const { requestId, prompt } = event.data
      const reply = (ok: boolean, message: string): void => {
        frameWindow.postMessage({ type: PROMPT_RESULT_TYPE, requestId, ok, message }, window.location.origin)
      }
      void startPromptSession(prompt).then(
        () => { reply(true, t('connectors.promptReady')) },
        error => { reply(false, userErrorText(error, t)) },
      )
    }
    const syncTheme = (): void => { syncFrameTheme(frameRef.current) }
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    window.addEventListener('message', onMessage)
    return () => {
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    }
  }, [startPromptSession, t])
  return <iframe
    ref={frameRef}
    className="dcu-connector-frame"
    src={MCP_CONNECTOR_UI}
    title={t('connectors.title')}
    onLoad={() => { syncFrameTheme(frameRef.current) }}
  />
}

function NativeConnectorList({ sessionStore, t }: Pick<ConnectorsSectionProps, 'sessionStore' | 't'>) {
  const sessionId = useSyncExternalStore(sessionStore.subscribe, () => currentSessionId(sessionStore.getSnapshot()))
  const [connectors, setConnectors] = useState<readonly Connector[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [failure, setFailure] = useState<unknown>()
  useEffect(() => {
    if (sessionId === undefined) { setConnectors([]); setState('ready'); return }
    const controller = new AbortController()
    setState('loading')
    void fetch(`${CODEX_UI_API_ENDPOINTS.connectors}?sessionId=${encodeURIComponent(sessionId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new BusinessRequestError(response.status)
        const payload = await response.json() as { connectors?: unknown }
        if (!Array.isArray(payload.connectors) || !payload.connectors.every(isConnector)) throw new Error('连接器目录返回格式无效。')
        if (!controller.signal.aborted) setConnectors(payload.connectors)
      })
      .then(() => { if (!controller.signal.aborted) setState('ready') })
      .catch(error => { if (!controller.signal.aborted) { setFailure(error); setState('failed') } })
    return () => { controller.abort() }
  }, [sessionId])
  if (sessionId === undefined) return <div className="dcu-connector-empty">{t('connectors.openSession')}</div>
  if (state === 'loading') return <div className="dcu-connector-empty">{t('connectors.loading')}</div>
  if (state === 'failed') return <div className="dcu-connector-empty" role="alert">{t(businessRequestErrorKey(failure) ?? 'connectors.failed')}</div>
  return <div className="dcu-connector-list">{connectors.map(connector => <article className="dcu-connector" key={connector.name}><div className="dcu-connector-head"><ZIconConnectors size={16} />{connector.name}</div><div className="dcu-connector-meta">{t('connectors.toolCount', { count: connector.tools.length })}</div>{connector.tools.map(tool => <div className="dcu-connector-tool" key={tool.name}>{tool.name}{tool.description !== '' && <span>{tool.description}</span>}</div>)}</article>)}{connectors.length === 0 && <div className="dcu-connector-empty">{t('connectors.empty')}</div>}</div>
}

/** 安装 dsh-mcp-connector 时显示完整市场，否则回退到当前会话的 MCP 工具目录。 */
export function ConnectorsSection({ sessionStore, startPromptSession, t }: ConnectorsSectionProps) {
  const [marketAvailable, setMarketAvailable] = useState<boolean | undefined>()
  useEffect(() => {
    const controller = new AbortController()
    void fetch(MCP_CONNECTOR_UI, { method: 'GET', cache: 'no-store', signal: controller.signal })
      .then(response => {
        void response.body?.cancel().catch(() => {})
        if (!controller.signal.aborted) setMarketAvailable(response.ok)
      })
      .catch(() => { if (!controller.signal.aborted) setMarketAvailable(false) })
    return () => { controller.abort() }
  }, [])
  return <section className="dcu-connectors" aria-label={t('connectors.title')}>
    <style>{stylesheet}</style>
    {marketAvailable === undefined
      ? <div className="dcu-connector-empty">{t('connectors.loading')}</div>
      : marketAvailable
        ? <ConnectorMarket startPromptSession={startPromptSession} t={t} />
        : <><h2>{t('connectors.title')}</h2><p>{t('connectors.description')}</p><NativeConnectorList sessionStore={sessionStore} t={t} /></>}
  </section>
}
