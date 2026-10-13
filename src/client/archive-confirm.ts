import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 行内归档的两步确认（对齐 ZCode TaskListItem 的归档交互）。
 *
 * ZCode 3.15.1 的实际行为（packages/ui/src/TaskListItem.tsx）：
 * - 首次点击只进入确认态：普通归档按钮换成 destructive 的「确认」按钮；
 * - Escape 取消；条目外的任意 pointerdown 取消；
 * - 鼠标离开条目不取消——确认是显式等待用户决策的状态；
 * - 二次点击才真正执行归档。
 *
 * press(id) 一次调用完成两个阶段：首次返回 false（进入确认态，调用方不执行），
 * 再次返回 true（调用方执行归档，同时清掉确认态）。
 */
export function useArchiveConfirm(): {
  confirmingId: string | undefined
  press: (id: string) => boolean
  cancel: () => void
} {
  const confirmingRef = useRef<string>()
  const [confirmingId, setConfirmingId] = useState<string>()

  const cancel = useCallback((): void => {
    if (confirmingRef.current === undefined) return
    confirmingRef.current = undefined
    setConfirmingId(undefined)
  }, [])

  const press = useCallback((id: string): boolean => {
    if (confirmingRef.current === id) {
      cancel()
      return true
    }
    confirmingRef.current = id
    setConfirmingId(id)
    return false
  }, [cancel])

  useEffect(() => {
    if (confirmingId === undefined) return
    const cancelOnKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') cancel()
    }
    const cancelOnPointerDown = (event: Event): void => {
      const target = event.target
      // 条目自身的 pointerdown 不取消（点击确认按钮或行内其他区域都算「条目内」）。
      if (target instanceof Element && target.closest('[data-dcu-session]')?.getAttribute('data-dcu-session') === confirmingId) return
      cancel()
    }
    window.addEventListener('keydown', cancelOnKeyDown, true)
    window.addEventListener('pointerdown', cancelOnPointerDown, true)
    return () => {
      window.removeEventListener('keydown', cancelOnKeyDown, true)
      window.removeEventListener('pointerdown', cancelOnPointerDown, true)
    }
  }, [confirmingId, cancel])

  return { confirmingId, press, cancel }
}
