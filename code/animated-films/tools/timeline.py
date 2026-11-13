"""Writes src/films/<film>/cues.json from tools/films/<film>.py and prints the beat table.
    python3 tools/timeline.py an02 [an03 ...]        (all seven with no argument)
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from films.common import load_copy  # noqa: E402

films = sys.argv[1:] or ["an02", "an03", "an04", "an05", "an06", "an07", "an08"]
for film in films:
    mod = importlib.import_module(f"films.{film}")
    copy = load_copy(film)
    sheet, frames = mod.cues(copy)
    path = sheet.write(frames)
    sheet.report()
    print(f"  -> {path}  ({frames} frames, {frames / 30:.1f} s)")
