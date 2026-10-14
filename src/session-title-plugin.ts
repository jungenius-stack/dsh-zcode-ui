import type { Context } from '@deepseek-ai/cordis'
import { startSessionTitleLifecycle } from './session-title-lifecycle.ts'

export const name = 'zcode-ui-session-title'
export const inject = ['sessionTitle', 'llm', 'loader']

/** Register teardown before asynchronous official-provider draining. */
export function apply(ctx: Context): Promise<void> {
  const lifecycle = startSessionTitleLifecycle(ctx)
  ctx.effect(() => lifecycle.dispose, 'zcode-ui-for-dsh: session title')
  return lifecycle.ready
}
