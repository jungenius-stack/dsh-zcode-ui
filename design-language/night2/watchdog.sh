#!/bin/bash
# night2 25 分钟巡检：DSH 活性（死则按铁律备份后重载）+ 9223/9224 状态 + 记录。
# 退出条件：见到 morning 标记文件或超过 12 小时。
set -u
DIR="/Users/m1/Downloads/优化UI插件区/design-language/night2"
LOG="$DIR/watchdog.log"
BIN="/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
START=$(date +%s)
echo "[$(date '+%F %T')] watchdog 启动" >> "$LOG"
while true; do
  NOW=$(date +%s)
  if [ -f "$DIR/morning" ] || [ $((NOW-START)) -gt 43200 ]; then echo "[$(date '+%F %T')] watchdog 退出" >> "$LOG"; exit 0; fi
  PIDS=$(ps -Ao args= 2>/dev/null | grep -c "^$BIN" || true)
  if [ "$PIDS" -eq 0 ]; then
    echo "[$(date '+%F %T')] DSH 已死，按铁律备份后重载" >> "$LOG"
    cd ~/.dsh/profiles/desktop && TS=$(date +%Y%m%d-%H%M%S) && cp package.json "package.json.bak-night2-$TS" && cp cordis.patch.yml "cordis.patch.yml.bak-night2-$TS"
    bash "/Users/m1/Downloads/优化UI插件区/restart-with-debug.sh" >> "$LOG" 2>&1
  fi
  P9223=$(curl -s -m 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:9223/json/version 2>/dev/null)
  P9224=$(curl -s -m 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:9224/json/version 2>/dev/null)
  echo "[$(date '+%F %T')] dsh=$(pgrep -f 'DeepSeek Harness.app/Contents/MacOS' | head -1) 9223=$P9223 9224=$P9224" >> "$LOG"
  sleep 1500
done
