// @vitest-environment jsdom
import { beforeEach, expect, test } from 'vitest'
import { syncUserBubble } from '../src/client/user-bubble-collapse.ts'

interface Fixture {
  bubble: HTMLElement
  content: HTMLElement
}

/** 宿主结构：.IzP3Va_userStack > .IzP3Va_bubble > span(display:contents) > 正文。 */
function fixture(text: string, scrollHeight: number, stack = true): Fixture {
  const holder = document.createElement('div')
  if (stack) holder.className = 'IzP3Va_userStack'
  const bubble = document.createElement('div')
  bubble.className = 'IzP3Va_bubble'
  const content = document.createElement('span')
  content.textContent = text
  Object.defineProperty(content, 'scrollHeight', { configurable: true, get: () => scrollHeight })
  bubble.append(content)
  holder.append(bubble)
  document.body.append(holder)
  return { bubble, content }
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.lang = 'zh-CN'
})

test('短气泡不折叠、不注入按钮', () => {
  const { bubble, content } = fixture('你好', 46)
  syncUserBubble(bubble)
  expect(bubble.hasAttribute('data-dcu-bubble-overflow')).toBe(false)
  expect(bubble.hasAttribute('data-dcu-bubble-state')).toBe(false)
  expect(content.style.maxHeight).toBe('')
  expect(bubble.querySelector('.dcu-bubble-toggle')).toBeNull()
})

test('长气泡折叠到 120px 并出现「展开」钮', () => {
  const { bubble, content } = fixture('很长', 1580)
  syncUserBubble(bubble)
  expect(bubble.getAttribute('data-dcu-bubble-overflow')).toBe('')
  expect(bubble.getAttribute('data-dcu-bubble-state')).toBe('collapsed')
  expect(content.style.maxHeight).toBe('120px')
  const toggle = bubble.querySelector<HTMLButtonElement>('.dcu-bubble-toggle')
  expect(toggle).not.toBeNull()
  expect(toggle?.getAttribute('aria-expanded')).toBe('false')
  expect(toggle?.getAttribute('aria-label')).toBe('展开')
})

test('点击展开取 max(scrollHeight,120)，再点收起', () => {
  const { bubble, content } = fixture('很长', 1580)
  syncUserBubble(bubble)
  const toggle = bubble.querySelector<HTMLButtonElement>('.dcu-bubble-toggle')!

  toggle.click()
  expect(bubble.getAttribute('data-dcu-bubble-state')).toBe('expanded')
  expect(content.style.maxHeight).toBe('1580px')
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(toggle.getAttribute('aria-label')).toBe('收起')

  toggle.click()
  expect(bubble.getAttribute('data-dcu-bubble-state')).toBe('collapsed')
  expect(content.style.maxHeight).toBe('120px')
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
})

test('溢出阈值是 120+1：121 折叠，120 不折叠', () => {
  const exact = fixture('刚好', 120)
  syncUserBubble(exact.bubble)
  expect(exact.bubble.hasAttribute('data-dcu-bubble-overflow')).toBe(false)

  const over = fixture('多一像素', 121)
  syncUserBubble(over.bubble)
  expect(over.bubble.hasAttribute('data-dcu-bubble-overflow')).toBe(false)

  const over2 = fixture('多两像素', 122)
  syncUserBubble(over2.bubble)
  expect(over2.bubble.hasAttribute('data-dcu-bubble-overflow')).toBe(true)
})

test('只处理用户轮：应答尾部（无 userStack）不折叠、不标记', () => {
  const { bubble, content } = fixture('回答尾部', 1580, false)
  syncUserBubble(bubble)
  expect(bubble.hasAttribute('data-dcu-bubble-overflow')).toBe(false)
  expect(bubble.hasAttribute('data-dcu-bubble-state')).toBe(false)
  expect(content.style.maxHeight).toBe('')
  expect(bubble.querySelector('.dcu-bubble-toggle')).toBeNull()
})

test('正文变化后回到折叠态', () => {
  const { bubble, content } = fixture('很长', 1580)
  syncUserBubble(bubble)
  bubble.querySelector<HTMLButtonElement>('.dcu-bubble-toggle')!.click()
  expect(bubble.getAttribute('data-dcu-bubble-state')).toBe('expanded')

  content.textContent = '很长，而且改了'
  syncUserBubble(bubble)
  expect(bubble.getAttribute('data-dcu-bubble-state')).toBe('collapsed')
  expect(content.style.maxHeight).toBe('120px')
})
