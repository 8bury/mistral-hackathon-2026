#!/usr/bin/env bash
# Render mockup HTML -> PNG with headless Chrome (2x for phone screens).
# Usage: bash docs/design/appllama/src/render.sh [name ...]   (default: all *.html)
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
wpwd() { pwd -W 2>/dev/null || pwd; }
SRC="$(wpwd)"
OUT="$(cd .. && wpwd)"
names=("$@"); [ ${#names[@]} -eq 0 ] && names=($(ls *.html | sed 's/\.html$//'))
for n in "${names[@]}"; do
  if [[ "$n" == share-* ]]; then size=1080,1920; scale=1; else size=390,844; scale=2; fi
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=$scale \
    --window-size=$size --virtual-time-budget=2000 --allow-file-access-from-files \
    --screenshot="$OUT/$n.png" "file:///$SRC/$n.html" >/dev/null 2>&1
  echo "rendered $n.png"
done
