#!/bin/zsh
# build-and-sync.sh — 一条命令完成「构建 → 校验 → 原子部署」
#
# 为什么要有它：2026-10-27 一天内三次事故，根因都是「构建直接覆写部署文件，
# 恰好此刻页面 reload，宿主读到半截文件 → import failed → web boot 崩」。
# 现在 tsdown 只写 dist/（构建期间 lib/ 始终完整），本脚本串起后半段。
#
# 用法: zsh build-and-sync.sh
set -eu
REPO="$HOME/WorkBuddy AI/2026-10-12-11-04-56/dsh-zcode-ui"
AUTOMATION="$HOME/Downloads/优化UI插件区/design-language/automation"

cd "$REPO"
echo "=== 1/3 构建（输出到 dist/，不碰 lib/）==="
node node_modules/tsdown/dist/run.mjs

echo
echo "=== 2/3 隔离校验（源与部署 inode 必须不同）==="
S=$(stat -f %i dist/client.js)
D=$(stat -f %i lib/client.js)
if [ "$S" = "$D" ]; then
  echo "✗ dist 与 lib 是同一 inode —— outDir 未生效，拒绝继续"
  exit 1
fi
echo "✓ dist inode=$S ≠ lib inode=$D（构建期部署文件未被触碰）"

echo
echo "=== 3/3 校验 + 原子落盘 ==="
zsh "$AUTOMATION/safe-sync.sh"

echo
echo "=== 完成。现在可以 reload 页面。 ==="
