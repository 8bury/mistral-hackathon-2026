#!/usr/bin/env bash
# Render docs/deck/index.html to 1920x1080 PNGs in docs/deck/slides/ (headless Chrome).
# Usage: bash docs/deck/render.sh
set -e
cd "$(dirname "$0")"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
wpwd() { pwd -W 2>/dev/null || pwd; }
DIR="$(wpwd)"
mkdir -p slides && rm -f slides/slide-*.png
n=$(grep -c '<section class="slide' index.html)
for i in $(seq 1 "$n"); do
  f=$(printf 'slides/slide-%02d.png' "$i")
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1920,1080 --virtual-time-budget=2500 --allow-file-access-from-files \
    --screenshot="$DIR/$f" "file:///$DIR/index.html?static&slide=$i" >/dev/null 2>&1
  echo "wrote $f"
done
