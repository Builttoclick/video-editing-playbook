#!/usr/bin/env bash
# Pick a bank sound without ears: render candidates, then let earshot rank them against a plain description.
#   audition.sh <dir> "<the sound in plain words>" <id>[@PITCH] [<id>[@PITCH] ...]
#   audition.sh audio/audition/pin "a small soft pop, user interface sound" pro_pop/thup ui_pop/fall drip/drop
#   audition.sh audio/audition/review "a gentle bright notification chime" notify/mid_tine@E6 pro_notify/ding_1822@E6
# Describe the SOUND (source, material, action, character), not its use: "cards scrolling on a phone" scored z ~0 for
# every whoosh; "a fast soft air whoosh" is the kind of query that separates them.
# Read each row's "sounds most like" as much as its z: pro_zip/up won a query at z +3.5 and reads as a record scratch.
# The full ranking prints (row 1 is the third line of the output). The WAVs stay in <dir> for describe / measure.
if (( $# < 3 )); then echo "usage: audition.sh <dir> \"<description>\" <id>[@PITCH] ..." >&2; exit 2; fi
PY="${EARSHOT_PY:-${EARSHOT_HOME:-$HOME/tools/earshot}/.venv/bin/python}"   # earshot's venv (EARSHOT_HOME = your clone)
dir="$1"; q="$2"; shift 2
mkdir -p "$dir"
for cand in "$@"; do
  id="${cand%%@*}"; name="${id//\//__}"; args=()
  if [[ "$cand" == *@* ]]; then args=(--pitch "${cand##*@}"); name="${name}_${cand##*@}"; fi
  "$PY" -m earshot sfx render "$id" -o "$dir/$name.wav" "${args[@]}" >/dev/null 2>&1 \
    || echo "render failed: $cand (ids: es sfx list; a noise sound refuses --pitch)" >&2
done
"$PY" -m earshot rank "$q" "$dir" 2>/dev/null
