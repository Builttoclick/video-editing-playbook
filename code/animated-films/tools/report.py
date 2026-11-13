"""One line per film from the latest listening pass and QA: python3 tools/report.py [an02 ...]"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
films = sys.argv[1:] or ["an02", "an03", "an04", "an05", "an06", "an07", "an08"]
rows = []
for film in films:
    num = film[2:]
    mp4 = os.path.join(ROOT, "out", f"an-{num}-animado.mp4")
    if not os.path.exists(mp4):
        rows.append((film, "no master"))
        continue
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout.strip() or 0)
    mix = json.load(open(os.path.join(ROOT, "audio", film, "mix.json")))
    qa = os.path.join(ROOT, "out", film, "qa")
    tl = open(os.path.join(qa, "timeline.txt")).read() if os.path.exists(os.path.join(qa, "timeline.txt")) else ""
    cr = open(os.path.join(qa, "critique.txt")).read() if os.path.exists(os.path.join(qa, "critique.txt")) else ""
    dec = open(os.path.join(qa, "decoded.txt")).read() if os.path.exists(os.path.join(qa, "decoded.txt")) else ""
    m = re.search(r"Sync to (\d+) cues: (\d+)% have an onset within 1 frame.*?(\d+)% within 100 ms, median \|offset\| (\d+) ms", tl)
    v = re.search(r"VERDICT: .*? - (\d+ of 23) scored metrics in range \(weighted (\d+)%\)", cr)
    hole = re.search(r"longest silent gap inside\s+([\d.]+) s", cr)
    dead = re.search(r"dead air at the end\s+([\d.]+) s", cr)
    lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", dec)
    peak = re.search(r"Peak:\s+(-?[\d.]+) dBFS", dec)
    rows.append((film, f"{dur:.1f} s | {len(mix['placed'])} fx | {lufs.group(1) if lufs else '?'} LUFS, peak {peak.group(1) if peak else '?'} dBFS | "
                 f"sync {m.group(2) if m else '?'}% in 1 frame, {m.group(3) if m else '?'}% in 100 ms, median {m.group(4) if m else '?'} ms | "
                 f"critique {v.group(1) if v else '?'} ({v.group(2) if v else '?'}%) | longest hole {hole.group(1) if hole else '?'} s, tail {dead.group(1) if dead else '?'} s"))
for r in rows:
    print(f"{r[0]}: {r[1]}")
