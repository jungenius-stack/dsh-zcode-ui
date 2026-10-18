#!/usr/bin/env python3
"""从真实会话 .jsonl.zstd 提取可回放的消息列表。

用法：python3 scripts/extract-session-replay.py <session.v4.jsonl.zstd> [输出json]

真实会话是 zstd 压缩的多行 JSON（v4 格式）。本脚本抽出
assistant/message 与 tool/result 的文本，用于 perf-replay 系列脚本。

需要 `zstandard` 模块（系统 python 已装；DSH 自带 python 没有）。
"""
import sys, json, os
try:
    import zstandard
except ImportError:
    sys.exit("需要 zstandard 模块：pip install zstandard（或用系统 python3 运行）")

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else '/tmp/replay/messages.json'
os.makedirs(os.path.dirname(dst), exist_ok=True)

dctx = zstandard.ZstdDecompressor()
rows = []
with open(src, 'rb') as f:
    reader = dctx.stream_reader(f)
    buf = b''
    while True:
        chunk = reader.read(1 << 20)
        if not chunk:
            break
        buf += chunk
        while b'\n' in buf:
            line, buf = buf.split(b'\n', 1)
            if line.strip():
                try:
                    rows.append(json.loads(line))
                except Exception:
                    pass

out = []
for o in rows:
    t = o.get('type')
    d = o.get('data') or {}
    m = d.get('message') or {}
    if not isinstance(m, dict) or t not in ('assistant/message', 'tool/result'):
        continue
    parts = [c.get('text') or '' for c in (m.get('content') or []) if isinstance(c, dict)]
    txt = '\n'.join(p for p in parts if p)
    if not txt:
        continue
    out.append({
        'r': 'assistant' if t == 'assistant/message' else 'tool',
        't': txt[:2000],
        'n': len(txt),
    })

json.dump(out, open(dst, 'w'), ensure_ascii=False)
print(f"提取 {len(out)} 条消息 → {dst}")
print(f"截断后文本 {sum(len(x['t']) for x in out):,} 字符 / 原始 {sum(x['n'] for x in out):,} 字符")
