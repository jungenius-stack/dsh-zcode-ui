import { expect, test } from 'vitest'
import { installSkin, SKIN_ATTRIBUTE, SKIN_VERSION } from '../src/client/zcode-skin.ts'

/**
 * `installSkin` 的**安装与恢复语义**。
 *
 * 为什么补这个测试：这个函数是全插件唯一直接写宿主 `<html>` 属性的地方，
 * 而它的卸载路径此前**没有任何测试**——`previous` 的保存/还原、样式标签的幂等复用，
 * 两条语义都只靠读代码确认。它们坏掉时的表现是「禁用插件后宿主残留皮肤标记」，
 * 属于典型的静默失效（不会报错、界面看着也正常）。
 *
 * 覆盖三件事：
 *   1. 安装会挂上标记属性与样式标签，且样式内容含皮肤版本号；
 *   2. 重复安装**复用同一个标签**（不重复插入 DOM）；
 *   3. 卸载**按安装前的真实状态**还原：原本没有属性就删掉，原本有值就恢复原值。
 */

const styleTags = (): HTMLStyleElement[] =>
  [...document.querySelectorAll('style[data-plugin-css]')] as HTMLStyleElement[]

test('安装会写入标记属性与含版本号的样式标签', () => {
  const dispose = installSkin(document)
  try {
    expect(document.documentElement.getAttribute(SKIN_ATTRIBUTE)).toBe(SKIN_VERSION)
    const tags = styleTags()
    expect(tags).toHaveLength(1)
    expect(tags[0].textContent).toContain(`ZCode 皮肤 v${SKIN_VERSION}`)
  } finally {
    dispose()
  }
})

test('重复安装复用同一个样式标签，不重复插入 DOM', () => {
  const disposeFirst = installSkin(document)
  const disposeSecond = installSkin(document)
  try {
    // 同一个 STYLE_TAG_ID 必须复用：每次挂载都插一个新标签会让样式表在 DOM 里堆积。
    expect(styleTags()).toHaveLength(1)
    expect(document.documentElement.getAttribute(SKIN_ATTRIBUTE)).toBe(SKIN_VERSION)
  } finally {
    disposeSecond()
    disposeFirst()
  }
})

test('卸载删除样式标签，并在原本无属性时移除标记', () => {
  document.documentElement.removeAttribute(SKIN_ATTRIBUTE)
  const dispose = installSkin(document)
  expect(document.documentElement.getAttribute(SKIN_ATTRIBUTE)).toBe(SKIN_VERSION)
  dispose()
  expect(styleTags()).toHaveLength(0)
  expect(document.documentElement.hasAttribute(SKIN_ATTRIBUTE)).toBe(false)
})

test('卸载恢复安装前的原值，而不是一律删除', () => {
  // 宿主（或另一个皮肤）可能已经写过这个属性；卸载时必须还原它，不能抹掉别人的状态。
  document.documentElement.setAttribute(SKIN_ATTRIBUTE, '宿主原值')
  const dispose = installSkin(document)
  expect(document.documentElement.getAttribute(SKIN_ATTRIBUTE)).toBe(SKIN_VERSION)
  dispose()
  expect(document.documentElement.getAttribute(SKIN_ATTRIBUTE)).toBe('宿主原值')
  document.documentElement.removeAttribute(SKIN_ATTRIBUTE)
})

test('无文档环境（SSR / 测试）返回空操作且不抛错', () => {
  const dispose = installSkin(undefined)
  expect(() => dispose()).not.toThrow()
})
