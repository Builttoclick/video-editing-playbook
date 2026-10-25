#!/bin/zsh
# Native 4K: every part's layers at scale 2 (visible frames only), then the 4K master.
cd "${0:A:h}/.."
set -e
for spec in P1:back P2a:both P2b:both P2c:back P3a:back P3b:both P3c:both P4a:both P4b:both P4c:both P5a:back P5b:both \
            P5c:both P6a:back P6b:back P6c:front P6d:both P8a:both P8b:both P8c:front P8d:both; do
  node tools/render.mjs video4k ${spec%%:*} ${spec#*:}
done
python3 tools/export.py 4k
echo ALL DONE
