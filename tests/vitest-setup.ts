/**
 * vitest 全局 setup。
 *
 * jsdom 没有实现 Storage：直接访问 window.localStorage 会抛错，而本插件的
 * 侧栏展开偏好、输入历史等状态都写在 localStorage 上。这里补一个内存实现，
 * 让任何 *.spec.ts 都能直接用，不必各自抄一份内联 shim。
 *
 * 与上游 dsh-codex-ui 1.1.35 同名文件的差异：`length` 改为读 store.size 的取值器。
 * 上游把 length 写成字面量 0，`Storage#length` 会永远报 0（写入多少都是 0），
 * 任何按 length 判断"有没有存过"的用例都会静默走错分支。
 */
if (typeof window !== 'undefined') {
  const store = new Map<string, string>()
  const mockStorage: Storage = {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: mockStorage,
    writable: true,
  })
}
