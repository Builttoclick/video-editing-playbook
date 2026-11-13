"""Picture QA of a finished film: python3 tools/qa.py an02
 - a contact sheet of one frame every 0.6 s with Meta's 4:5 cut lines (out/<film>/qa/frames.png)
 - the same frames as the 4:5 feed would show them (out/<film>/qa/crop45.png)
 - the safe-band check: any frame whose rows above y 285 or below y 1635 carry content (edges stronger than the
   stage gradient) is listed; the 4:5 crop must lose nothing
 - duration, fps, size, audio stream of the delivered file
"""
import glob
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
film = sys.argv[1]
num = film[2:]
mp4 = os.path.join(ROOT, "out", f"an-{num}-animado.mp4")
qa = os.path.join(ROOT, "out", film, "qa")
frames = os.path.join(qa, "frames")
os.makedirs(frames, exist_ok=True)
for p in glob.glob(os.path.join(frames, "*.png")):
    os.remove(p)
subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "fps=1/0.6", os.path.join(frames, "f%04d.png")], check=True)
files = sorted(glob.glob(os.path.join(frames, "*.png")))
bad = []
for p in files:
    a = np.asarray(Image.open(p).convert("L"), dtype=np.float32)
    # horizontal edges per row: the stage gradient is smooth (tiny), text and cards are not
    dx = np.abs(np.diff(a, axis=1)).max(axis=1)
    top = dx[:285].max()
    bot = dx[1636:].max()
    if top > 24 or bot > 24:
        bad.append((os.path.basename(p), round(float(top), 1), round(float(bot), 1)))
sheet = subprocess.run([sys.executable, os.path.join(ROOT, "tools/sheet.py"), frames, os.path.join(qa, "frames.png"), "8", "200"], capture_output=True, text=True)
crop = subprocess.run([sys.executable, os.path.join(ROOT, "tools/sheet.py"), frames, os.path.join(qa, "crop45.png"), "8", "200", "--crop45"], capture_output=True, text=True)
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,duration,sample_rate,channels", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout.strip().replace("\n", " | ")
print(f"{film}: {len(files)} frames checked; {probe}")
print("safe band (y 285..1635):", "clean" if not bad else f"{len(bad)} frames with content outside: {bad[:6]}")
print(sheet.stdout.strip(), "|", crop.stdout.strip())
