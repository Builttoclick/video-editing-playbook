"""Timed line view of every transcript: lines split at pauses > 0.6 s, with word indices, in MOVIE time.

Writes edit/LINES.md (all takes, recording order). This is what gets READ to choose takes.
"""
import json
from common import VIDEOS, EDIT

GAP = 0.6


def fmt(t):
    m, s = divmod(max(0.0, t), 60)
    return f"{int(m):02d}:{s:05.2f}"


out = ["# Timed transcript, every take (movie time of each file, word indices in brackets)\n"]
for name in VIDEOS:
    d = json.loads((EDIT / "transcripts" / f"{name}.json").read_text(encoding="utf-8"))
    ws = [w for w in d["words"] if w["type"] in ("word", "audio_event")]
    out.append(f"\n## {name}\n")
    line, last_end = [], None
    for w in ws:
        if line and (w["start"] - last_end > GAP):
            out.append(f"{fmt(line[0]['start'])}-{fmt(line[-1]['end'])} [{line[0]['i']}-{line[-1]['i']}] "
                       + " ".join(x["text"] for x in line))
            line = []
        line.append(w)
        last_end = w["end"]
    if line:
        out.append(f"{fmt(line[0]['start'])}-{fmt(line[-1]['end'])} [{line[0]['i']}-{line[-1]['i']}] "
                   + " ".join(x["text"] for x in line))
(EDIT / "LINES.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("lines:", len(out))
