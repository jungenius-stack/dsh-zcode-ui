import { expect, test, vi, afterEach } from 'vitest'
import { installDocumentHiddenMotionPause, DOCUMENT_HIDDEN_ATTRIBUTE } from '../src/client/document-hidden-motion-pause.ts'

/**
 * `installDocumentHiddenMotionPause` 的行为契约。
 *
 * 为什么补这个测试：本轮从 ZCode 移植了这个机制（上游根因是「窗口 hidden 时动画无法结算，
 * DocumentTimeline 持续持有被移除的子树，后台流式输出时内存无上限累积」），
 * 但**移植后只验证了"代码进了产物、属性存在"**——那正是 CODE-002「幻觉式完成」的形状：
 * 文件在、字符串在，不等于行为生效。
 *
 * 为什么分两层验：
 *   · **CSS 层**（`html[data-document-hidden] *{animation:none!important}` 真的会停动画）
 *     已在真实宿主里量过（探针动画 animationName 由 probe-spin → none、duration 1s → 0s）。
 *   · **JS 层**（本文件）：何时挂属性、何时撤、卸载是否清理干净。这层必须用受控
 *     `visibilityState` 才能精确触发——headless 浏览器里新开标签页并不会让
 *     `visibilityState` 变成 hidden（实测确认），所以只能在这里验。
 */

/** 造一个可控制 visibilityState 的假 document。 */
function fakeDoc(initial: 'visible' | 'hidden') {
  const listeners = new Set<() => void>()
  let state = initial
  const root = { attrs: new Set<string>() }
  const doc = {
    get visibilityState() { return state },
    documentElement: {
      toggleAttribute: (name: string, force?: boolean) => {
        const on = force === undefined ? !root.attrs.has(name) : force
        if (on) root.attrs.add(name)
        else root.attrs.delete(name)
        return on
      },
      removeAttribute: (name: string) => { root.attrs.delete(name) },
      hasAttribute: (name: string) => root.attrs.has(name),
    },
    addEventListener: (type: string, fn: () => void) => { if (type === 'visibilitychange') listeners.add(fn) },
    removeEventListener: (type: string, fn: () => void) => { if (type === 'visibilitychange') listeners.delete(fn) },
  }
  return {
    doc: doc as unknown as Document,
    setVisibility(next: 'visible' | 'hidden') {
      state = next
      for (const fn of listeners) fn()
    },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => { vi.restoreAllMocks() })

test('加载时页面已隐藏 ⇒ 立即挂上标记（不能等到下次 visibilitychange）', () => {
  const { doc } = fakeDoc('hidden')
  const dispose = installDocumentHiddenMotionPause(doc)
  try {
    expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(true)
  } finally { dispose() }
})

test('加载时页面可见 ⇒ 不挂标记', () => {
  const { doc } = fakeDoc('visible')
  const dispose = installDocumentHiddenMotionPause(doc)
  try {
    expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(false)
  } finally { dispose() }
})

test('可见 → 隐藏 → 可见：标记随 visibilitychange 双向同步', () => {
  const { doc, setVisibility } = fakeDoc('visible')
  const dispose = installDocumentHiddenMotionPause(doc)
  try {
    expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(false)
    setVisibility('hidden')
    expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(true)
    setVisibility('visible')
    expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(false)
  } finally { dispose() }
})

test('卸载必须撤掉标记且摘掉监听——否则页面会永久停在"动画被禁用"', () => {
  const { doc, listenerCount } = fakeDoc('hidden')
  const dispose = installDocumentHiddenMotionPause(doc)
  expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(true)
  expect(listenerCount()).toBe(1)
  dispose()
  // 两条都要：属性撤掉（否则插件已不在场、没人会再清它）+ 监听摘掉（否则泄漏）
  expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(false)
  expect(listenerCount()).toBe(0)
})

test('卸载后再变化不再影响文档（监听确已失效）', () => {
  const { doc, setVisibility } = fakeDoc('visible')
  const dispose = installDocumentHiddenMotionPause(doc)
  dispose()
  setVisibility('hidden')
  expect(doc.documentElement.hasAttribute(DOCUMENT_HIDDEN_ATTRIBUTE)).toBe(false)
})

test('无 document 环境（SSR / 测试）返回空操作，不抛异常', () => {
  const dispose = installDocumentHiddenMotionPause(undefined)
  expect(typeof dispose).toBe('function')
  expect(() => dispose()).not.toThrow()
})
