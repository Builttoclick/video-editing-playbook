#!/bin/zsh
# The listening pass on a finished render: timeline (what sounds when + sync per cue), sheet (an annotated PNG: open
# it), critique (scorecard against 7 pro launch films) and the decoded loudness / true peak of the file itself.
#   listen.sh <film.mp4> [cues_earshot.json] [qa_dir]        (qa_dir defaults to <film dir>/qa)
# A previous pass in qa_dir moves to qa_dir/vN first, so every version stays there to compare.
# Each earshot command loads its models (20-60 s); the three take ~1.5 min on a 10 s film, 3-5 min on a 40 s one.
# Run it in the background and read the summary when it lands.
if (( $# < 1 )); then print -u2 "usage: listen.sh <film.mp4> [cues_earshot.json] [qa_dir]"; exit 2; fi
PY="${EARSHOT_PY:-python3}"   # a Python with earshot installed (github.com/Leonxlnx/earshot)
film="$1"; cues="${2:-}"; qa="${3:-${film:h}/qa}"
mkdir -p "$qa"
if [[ -e "$qa/timeline.txt" ]]; then
  n=1; while [[ -e "$qa/v$n" ]]; do (( n++ )); done
  mkdir "$qa/v$n"; mv "$qa"/(timeline|sheet|critique|decoded).*(N) "$qa/v$n"/
  print "previous pass moved to $qa/v$n"
fi
c=(); [[ -n "$cues" ]] && c=(--cues "$cues")
"$PY" -m earshot timeline "$film" "${c[@]}" --detail high --out "$qa/timeline.json" > "$qa/timeline.txt" 2>/dev/null
"$PY" -m earshot sheet "$film" "${c[@]}" -o "$qa/sheet.png" > "$qa/sheet.txt" 2>/dev/null
"$PY" -m earshot critique "$film" --out "$qa/critique.json" > "$qa/critique.txt" 2>/dev/null
ffmpeg -hide_banner -nostats -i "$film" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' > "$qa/decoded.txt"
print "== critique";   sed -n 2,6p "$qa/critique.txt"
print "== sync";       head -1 "$qa/timeline.txt" | grep -o -E 'Sync to [0-9]+ (cues|cuts)[^;]*;[^;]*' | head -2
print "== decoded";    grep -E '^\s+(I|Peak):' "$qa/decoded.txt" | tr -s ' '
print "== near / missed cues (fix these first)"
grep -E '\| .*(near|late|early|no sound|missed)' "$qa/timeline.txt" | head -12
print "sheet: $qa/sheet.png  (open it)"
