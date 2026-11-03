// probe10：React fiber 诊断——齿轮按钮 onClick 的存在与内容（只读）
import { connect } from './cdp-lib.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = '/Users/m1/Downloads/优化UI插件区/design-language/night2/cdp-'
const c = await connect()
const { evaluate, page } = c

const r = await evaluate(`(() => {
  const gear = document.querySelector('aside button[aria-label="设置"]');
  if (!gear) return { found: false };
  const fk = Object.keys(gear).find(k => k.startsWith('__reactFiber$'));
  const pk = Object.keys(gear).find(k => k.startsWith('__reactProps$'));
  const props = pk ? gear[pk] : null;
  const fiber = fk ? gear[fk] : null;
  // 向上找有 onClick 的祖先 fiber
  const withClick = [];
  let f = fiber;
  for (let i = 0; f && i < 15; i++, f = f.return) {
    const p = f.memoizedProps;
    if (p && (p.onClick || p.onPointerUp || p.onPointerDown || p.onMouseDown)) {
      withClick.push({ depth: i, tag: f.tag, type: typeof f.type === 'function' ? (f.type.name || 'anon') : String(f.type).slice(0, 40),
        handlers: Object.keys(p).filter(k => k.startsWith('on')).join(','),
        onClickSrc: p.onClick ? p.onClick.toString().slice(0, 300) : null });
    }
  }
  return { found: true, propsKeys: props ? Object.keys(props).slice(0, 30) : null,
    onClickOnButton: props && props.onClick ? props.onClick.toString().slice(0, 300) : null,
    disabled: props ? props.disabled : null,
    ancestorsWithHandlers: withClick.slice(0, 5) };
})()`)

writeFileSync(join(OUT, 'cdp-probe10.json'), JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url, probe: r }, null, 2))
console.log(JSON.stringify(r, null, 1).slice(0, 3000))
c.ws.close()
