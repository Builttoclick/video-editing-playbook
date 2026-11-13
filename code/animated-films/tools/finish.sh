#!/bin/zsh
# One film from picture to listened master: tools/finish.sh an03 [an04 ...]
#   out/<film>/picture.mp4 -> out/an-NN-animado.mp4 (sound.py) -> out/<film>/qa (earshot's listening pass)
cd "$(dirname "$0")/.."
for film in "$@"; do
  up=$(echo "$film" | tr a-z A-Z)
  mkdir -p "out/$film"
  COMP=$up node tools/render.mjs video > "out/$film/render.log" 2>&1 || { echo "render failed $film"; continue; }
  "${EARSHOT_PY:-python3}" tools/sound.py "$film" > "out/$film/sound.log" 2>&1 || { echo "sound failed $film"; continue; }
  num=${film#an}
  zsh tools/listen.sh "out/an-$num-animado.mp4" "audio/$film/cues_earshot.json" "out/$film/qa" > "out/$film/listen.log" 2>&1
  echo "done $film $(date +%H:%M)"
done
