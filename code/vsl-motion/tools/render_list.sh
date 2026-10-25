#!/bin/zsh
# Render only the parts given, each with its layers, then composite them 4 at a time.
#   ./tools/render_list.sh P4b:both P5a:back P6c:front ...
cd "${0:A:h}/.."
set -e
ids=()
for spec in "$@"; do
  id=${spec%%:*}; layers=${spec#*:}
  node tools/render.mjs video $id $layers
  ids+=($id)
done
printf '%s\n' "${ids[@]}" | xargs -P 4 -I{} python3 tools/compose.py video {}
echo ALL DONE
