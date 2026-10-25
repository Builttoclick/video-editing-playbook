#!/bin/zsh
# Full render of 0 to 58.9 s (P1 to P4a): the layers each part needs, then the composite with Joaquín's silhouette.
cd "${0:A:h}/.."
set -e
node tools/render.mjs video P1 back
node tools/render.mjs video P2a both
node tools/render.mjs video P2b both
node tools/render.mjs video P2c back
node tools/render.mjs video P3a back
node tools/render.mjs video P3b both
node tools/render.mjs video P3c both
node tools/render.mjs video P4a both
# composites in parallel, 4 at a time (numpy per frame is the slow part)
printf '%s\n' P1 P2a P2b P2c P3a P3b P3c P4a | xargs -P 4 -I{} python3 tools/compose.py video {}
echo ALL DONE
