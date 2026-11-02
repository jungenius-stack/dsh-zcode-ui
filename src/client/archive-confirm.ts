import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

/**
 * 归档确认弹窗（对齐 ZCode 的归档交互）。
 *
 * ZCode 的实际行为（asar 调用现场，2026-10-30 提取）：
 *   await L({
 *     title:   `confirmDialog.taskArchiveTitle`           → 「归档这个任务？」
 *     description: `confirmDialog.taskArchiveDescription` → 「任务“{taskTitle}”会移入归档列表，之后仍可恢复。」
 *     confirmLabel: `taskList.archive`                    → 「归档任务」
 *   }) && archiveTask(...)
 * 即：点击归档 → 弹出确认对话框 → 用户确认后才执行。
 *
 * 历史更正：本模块此前的实现是「行内两步确认」（按钮换成红色确认钮、再点一次），
 * 当时引的依据是我们自己代码里的注释，属循环论证。批次 11 从 asar 挖到调用现场后改回弹窗。
 * 弹窗比行内两步多给一条关键信息——「之后仍可恢复」——这是行内形态放不下的。
 *
 * 交互细节：Escape 取消；点击遮罩取消；打开时焦点落在确认按钮上；关闭后焦点还给触发元素。
 */

const ARCHIVE_CONFIRM_STYLE = `
/* night2 surface-3（M1-M9/M11-M12）：对齐 ZCode confirmDialog 标准档（c0n）——
   遮罩 bg-black/60 + backdrop-blur-xs(4px)；壳 448（sm:max-w-md）/ rounded-2xl(16px) /
   shadow-2xl / border-none（分离感靠底色+大柔影，ring-border 未配 .ring 宽度 = 无环）；
   标题 text-ui-lg 16px/行高 1.625（继承基座 relaxed）/600；描述 14px/24px（leading-6）；
   动画 100ms + tailwindcss-animate 默认 ease，内容 fade+zoom-in-95 无位移。
   M10 浅色确认钮不随（surface-4 §6 交叉核对：ZCode destructive 浅色实为 #e03131，
   与本仓 --dcu-state-error-fill 精确一致，原报告 #e7000b 系取错基座档，作废）。 */
.dcu-archive-scrim{position:fixed;inset:0;z-index:10060;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.6);animation:dcu-archive-fade var(--dcu-tw-anim-duration) ease}
@supports (backdrop-filter: blur(4px)){.dcu-archive-scrim{backdrop-filter:blur(4px)}}
@keyframes dcu-archive-fade{from{opacity:0}to{opacity:1}}
.dcu-archive-dialog{box-sizing:border-box;width:min(448px,100%);padding:20px;border-radius:var(--dsw-radius-2xl);background:var(--dcu-dialog-bg);color:var(--dcu-tip-primary);box-shadow:0 25px 50px -12px rgba(0,0,0,.25);animation:dcu-archive-in var(--dcu-tw-anim-duration) ease}
@keyframes dcu-archive-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
.dcu-archive-title{margin:0;font-size:var(--dsw-font-size-lg);line-height:26px;font-weight:600}
.dcu-archive-desc{margin:8px 0 0;color:var(--dcu-tip-secondary);font-size:var(--dsw-font-size-base);line-height:24px}
.dcu-archive-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.dcu-archive-btn{appearance:none;min-height:36px;padding:0 16px;border:0;border-radius:var(--dsw-radius-lg);background:var(--dcu-secondary-bg);color:inherit;font:inherit;font-size:var(--dsw-font-size-base);cursor:pointer;transition:background-color var(--dcu-motion-feedback-duration) var(--dcu-motion-feedback-ease)}
.dcu-archive-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dcu-secondary-bg) 80%,transparent)}
.dcu-archive-btn:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dcu-focus));outline-offset:2px}
.dcu-archive-confirm{background:var(--dcu-state-error-fill);color:#fff;font-weight:500}
.dcu-archive-confirm:hover:not(:disabled){background:var(--dcu-state-error-fill-hover)}
@media (prefers-reduced-motion:reduce){.dcu-archive-scrim,.dcu-archive-dialog{animation:none}}
`

type Translate = TranslateNS<typeof NS>

interface PendingArchive {
  id: string
  title: string
  run: () => void
}

export function useArchiveConfirm(t: Translate): {
  /** 打开确认弹窗；用户确认后执行 run()，取消则什么都不做。 */
  request: (id: string, title: string, run: () => void) => void
  /** 需要渲染进组件树的弹窗节点（未打开时为 null）。 */
  dialog: ReactNode
} {
  const [pending, setPending] = useState<PendingArchive>()
  const restoreFocus = useRef<Element | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback((): void => {
    setPending(undefined)
    const target = restoreFocus.current
    restoreFocus.current = null
    if (target instanceof HTMLElement) target.focus()
  }, [])

  const request = useCallback((id: string, title: string, run: () => void): void => {
    restoreFocus.current = document.activeElement
    setPending({ id, title, run })
  }, [])

  useEffect(() => {
    if (pending === undefined) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      // night2 surface-3 M13：ZCode 标准档（非破坏型确认框）window 级 Enter 直接确认
      // （capture）。焦点本就落在确认钮上；preventDefault 挡掉按钮的原生 Enter 激活，
      // 确认只走这一条路，避免双重触发。
      if (event.key === 'Enter') {
        event.preventDefault()
        const run = pending.run
        close()
        run()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    confirmRef.current?.focus()
    return () => { window.removeEventListener('keydown', onKeyDown, true) }
  }, [pending, close])

  const dialog: ReactNode = pending === undefined
    ? null
    : createElement(
        'div',
        {
          className: 'dcu-archive-scrim',
          onMouseDown: (event: { target: EventTarget; currentTarget: EventTarget }) => {
            if (event.target === event.currentTarget) close()
          },
        },
        createElement('style', null, ARCHIVE_CONFIRM_STYLE),
        createElement(
          'div',
          {
            className: 'dcu-archive-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dcu-archive-title',
            'aria-describedby': 'dcu-archive-desc',
          },
          createElement('h2', { className: 'dcu-archive-title', id: 'dcu-archive-title' }, t('sessions.archiveConfirmTitle')),
          createElement('p', { className: 'dcu-archive-desc', id: 'dcu-archive-desc' }, t('sessions.archiveConfirmDescription', { title: pending.title })),
          createElement(
            'div',
            { className: 'dcu-archive-actions' },
            createElement('button', { type: 'button', className: 'dcu-archive-btn', onClick: close }, t('sessions.cancel')),
            createElement(
              'button',
              {
                type: 'button',
                className: 'dcu-archive-btn dcu-archive-confirm',
                ref: confirmRef,
                onClick: () => { const run = pending.run; close(); run() },
              },
              t('sessions.archive'),
            ),
          ),
        ),
      )

  return { request, dialog }
}
