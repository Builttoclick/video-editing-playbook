#!/bin/zsh
# audio-only pass: mix + listen on the existing picture: tools/remix.sh an02 an03 ...
cd "$(dirname "$0")/.."
for film in "$@"; do
  "${EARSHOT_PY:-python3}" tools/sound.py "$film" > "out/$film/sound.log" 2>&1 || { echo "sound failed $film"; continue; }
  num=${film#an}
  zsh tools/listen.sh "out/an-$num-animado.mp4" "audio/$film/cues_earshot.json" "out/$film/qa" > "out/$film/listen.log" 2>&1
  echo "remixed $film $(date +%H:%M)"
done
echo "REMIX ALL DONE"
