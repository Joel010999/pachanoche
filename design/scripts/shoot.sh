#!/usr/bin/env bash
# Captura http://localhost:3000 a 1600x1000 y la compara con el mockup.
set -e
cd "$(dirname "$0")/../.."
OUT=${1:-design/mockups/.captura.png}
E="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
MSYS_NO_PATHCONV=1 "$E" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1600,1000 --screenshot="$(cygpath -w "$PWD/$OUT")" "${URL:-http://localhost:3000/}" 2>/dev/null | tail -1
uv run --offline --quiet --with pillow --with numpy python design/scripts/compare.py design/mockups/visor-salina.png "$OUT" design/mockups/.diff.png
