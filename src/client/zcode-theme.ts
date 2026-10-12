/**
 * ZCode 视觉规范落点：Zai Light / Zai Dark 双色板与主题同步。
 * 色值提取自 zai-org/ZCode 的 packages/ui/src/styles.css（.theme-zai-light / .theme-zai-dark 覆盖层），
 * 机制参照其 useTheme.ts：明暗由根节点 class 表达，system 档跟随 prefers-color-scheme。
 *
 * DSH 宿主以 body[data-ds-dark-theme] 表达暗色（宿主自己的主题设置），本模块把它镜像到
 * documentElement 的 theme-zai-light / theme-zai-dark class，与 ZCode 的语义保持一致；
 * 样式表同时认两个信号，未同步时（首帧、无 JS）也不丢主题。
 */

/** Zai 双色板：供 <style> 注入，覆盖 dcu-* 变量；选择器与宿主暗色属性、ZCode class 双兼容。 */
export const ZCODE_THEME_STYLE = `
:root{color-scheme:light}
body[data-ds-dark-theme],.theme-zai-dark{color-scheme:dark}
/* 主色属**全局语义色**，不能只挂在下述侧栏作用域里：输入区的发送键也用它填充
   （[data-composer-card] 下的 button[class$=_primary]），而输入区不在 .dcu-root 内，
   挂在侧栏作用域会让该 var() 解析失败并静默失效——详见 docs/KNOWN-ISSUES.md §8。 */
:root{--dcu-primary:#000000;--dcu-primary-foreground:#ffffff}
body[data-ds-dark-theme],.theme-zai-dark{--dcu-primary:#ffffff;--dcu-primary-foreground:#000000}
/* Zai Light —— 默认浅色，全部语义角色取自 .theme-zai-light 覆盖层。 */
.dcu-root,.dcu-settings-page,.dcu-home{
  --dcu-sidebar-background:#f0f0f0;--dcu-sidebar-primary:#262626;--dcu-sidebar-secondary:#5c5c5c;
  --dcu-sidebar-tertiary:#686868;--dcu-sidebar-navigation:#262626;--dcu-sidebar-icon:#525252;
  --dcu-sidebar-hover:rgba(13,13,13,.05);--dcu-sidebar-selected:rgba(13,13,13,.05);
  --dcu-sidebar-border:rgba(13,13,13,.1);--dcu-tip-bg:#ffffff;--dcu-tip-border:rgba(13,13,13,.1);
  --dcu-tip-shadow:0 8px 24px rgba(13,13,13,.12);--dcu-focus:#0b7fff;
  --dcu-surface:rgba(13,13,13,.03);
}
/* Zai Dark —— 宿主暗色属性或 ZCode 暗色 class 命中任一即切换。 */
body[data-ds-dark-theme] .dcu-root,body[data-ds-dark-theme] .dcu-settings-page,body[data-ds-dark-theme] .dcu-home,
.theme-zai-dark .dcu-root,.theme-zai-dark .dcu-settings-page,.theme-zai-dark .dcu-home{
  --dcu-sidebar-background:#161616;--dcu-sidebar-primary:#d4d4d4;--dcu-sidebar-secondary:#888888;
  --dcu-sidebar-tertiary:#828282;--dcu-sidebar-navigation:#d4d4d4;--dcu-sidebar-icon:#a3a3a3;
  --dcu-sidebar-hover:rgba(255,255,255,.05);--dcu-sidebar-selected:rgba(255,255,255,.1);
  --dcu-sidebar-border:rgba(255,255,255,.1);--dcu-tip-bg:#2b2b2b;--dcu-tip-border:rgba(255,255,255,.1);
  --dcu-tip-shadow:0 8px 24px rgba(0,0,0,.4);--dcu-focus:#4099ff;
  --dcu-surface:rgba(255,255,255,.05);
}
`

/**
 * 把宿主暗色属性镜像为 ZCode 的 theme-zai-* class。
 * 返回 dispose；宿主用 MutationObserver 监听 body 属性。
 * 宿主属性是已解析主题的唯一真源（宿主自身处于 system 档时也由宿主解析后再落属性），
 * 不读 prefers-color-scheme——否则宿主显式浅色 + 系统深色时侧栏会被误判成暗色，与内容区撕裂。
 */
export function syncZCodeTheme(): () => void {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const body = document.body

  const resolveZai = (): 'zai-light' | 'zai-dark' => {
    const hostDark = body?.hasAttribute?.('data-ds-dark-theme') === true
      || root.hasAttribute('data-ds-dark-theme') === true
    return hostDark ? 'zai-dark' : 'zai-light'
  }
  const apply = (): void => {
    const theme = resolveZai()
    root.classList.toggle('theme-zai-light', theme === 'zai-light')
    root.classList.toggle('theme-zai-dark', theme === 'zai-dark')
    root.classList.toggle('dark', theme === 'zai-dark')
  }
  apply()

  const observer = new MutationObserver(apply)
  if (body !== undefined && body !== null) {
    observer.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  }
  observer.observe(root, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class'] })
  return () => {
    observer.disconnect()
  }
}
