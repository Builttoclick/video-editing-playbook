"""Shared helpers for the seven films' cue sheets (tools/films/anNN.py -> src/films/anNN/cues.json).

Every frame a film uses is computed here once, in seconds turned into frames, and written to cues.json; the picture
(src/films/ANNN.tsx) and the sound (tools/sound.py) read that same file. Text beats are checked against the reading
pace Joaquín asked for (fast: about 4 words a second plus half a second to land), typing runs on a human rhythm, and the
headline word frames follow the same sum as src/components/Head.tsx.
"""
import json
import os
import re

FPS = 30
TYPE_PATTERN = [2, 1, 2, 2, 1, 3, 2, 1, 2, 2, 1, 2]
TYPE_AFTER_SPACE = 3
WORD_STEP = 2
LINE_GAP = 3
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def F(sec):
    return int(round(sec * FPS))


def S(frame):
    return frame / FPS


def words(x):
    if isinstance(x, dict):
        x = x["lines"]
    if isinstance(x, list):
        return sum(words(s) for s in x)
    return len([w for w in re.split(r"\s+", x.strip()) if w])


def reading_s(n_words, base=0.55, rate=4.2, min_s=1.5):
    """how long a block of n words needs on screen (Joaquín's pace: fast)"""
    return max(min_s, base + n_words / rate)


def type_frames(text, start, pattern=TYPE_PATTERN, after_space=TYPE_AFTER_SPACE):
    """the frame each letter appears (anim.ts typeFrames does the same sum)"""
    out = []
    for i in range(len(text)):
        if i == 0:
            out.append(start)
        else:
            gap = after_space if text[i - 1] == " " else pattern[i % len(pattern)]
            out.append(out[-1] + gap)
    return out


def head_frames(lines, at, step=WORD_STEP, line_gap=LINE_GAP):
    """word frames of a headline block, line by line (Head.tsx wordFrames)"""
    out, j = [], 0
    for l, ln in enumerate(lines):
        row = []
        for _ in [w for w in ln.split(" ") if w]:
            row.append(at + j * step + l * line_gap)
            j += 1
        out.append(row)
    return out


def head_last(lines, at):
    rows = head_frames(lines, at)
    return rows[-1][-1] if rows and rows[-1] else at


class Sheet:
    """collects the cues of one film and checks its text beats"""

    def __init__(self, film, copy):
        self.film = film
        self.copy = copy
        self.f = {}
        self.text = {}
        self.warn = []

    def beat(self, bid, at_s, out_s, lines=None):
        lines = lines if lines is not None else self.copy["beats"][bid]["lines"]
        n = words(lines)
        need = reading_s(n)
        have = out_s - at_s
        self.text[bid] = {"in": F(at_s), "out": F(out_s)}
        if have + 0.06 < need:
            self.warn.append(f"{bid}: {n} words need {need:.1f} s, has {have:.1f} s")
        return self.text[bid]

    def write(self, frames, extra=None):
        d = {"fps": FPS, "frames": frames, "text": self.text, "f": self.f}
        if extra:
            d.update(extra)
        path = os.path.join(ROOT, "src/films", self.film, "cues.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump(d, open(path, "w"), indent=1, ensure_ascii=False)
        return path

    def report(self):
        rows = sorted(self.text.items(), key=lambda kv: kv[1]["in"])
        print(f"{self.film}: {len(rows)} text beats")
        for bid, t in rows:
            n = words(self.copy["beats"][bid]["lines"]) if bid in self.copy.get("beats", {}) else 0
            print(f"  {S(t['in']):6.2f} - {S(t['out']):6.2f}  {bid:10s} {n:3d} w  need {reading_s(n):.1f}  has {S(t['out'] - t['in']):.1f}")
        for w in self.warn:
            print("  WARN", w)


def load_copy(film):
    return json.load(open(os.path.join(ROOT, "src/films", film, "copy.json"), encoding="utf-8"))
