"""Are the sound effects under the voice? Joaquín's rule (03-nov-2026): the effects must never sound louder than the voice.

Reads the voice stem and the effects stem of a mix (same sample rate, mono or stereo), finds every effect, and
compares the effect's loudest 50 ms with the voice's loudest 50 ms around it. Both sides are measured with
earshot's kit.loud_lufs (K-weighted, LUFS scale), the same measure the mixer sets effect levels with.

    "$EARSHOT_HOME/.venv/bin/python" scripts/under_voice.py voice.wav sfx.wav [--margin 6] [--window 1.0] [--at T ...]

  LOUDER  the effect is louder than the voice near it: a bug, fix it (Joaquín's rule)
  CLOSE   under the voice, but by less than --margin dB (default 6: effects at least 6 dB under the dialogue)
  ok      at least --margin dB under
  pause   no speech within --window s of the effect: compared with the voice's typical loud syllable (median of the file)

Effect times: --at with seconds, --at-json with our mixer's audio/mix.json ("placed" rows), or detected on the
effects stem (an onset: a 10 ms frame 12 dB over the 100 ms before it and above -50 dBFS). Exit 1 on any LOUDER.
"""
import argparse
import json
import sys

import numpy as np
import soundfile as sf
from earshot.forge import kit

SPEECH_FLOOR_LUFS = -45.0  # a 50 ms level under this is a pause, not speech


def mono_or_stereo(path):
    y, sr = sf.read(path, always_2d=True)
    return y.astype(np.float64), sr


def detect(sfx, sr, floor_db=-50.0, rise_db=12.0, gap_s=0.12):
    hop = int(0.01 * sr)
    s = sfx.sum(axis=1)
    n = len(s) // hop
    env = 10 * np.log10(np.mean(s[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    times, last = [], -10 ** 9
    for i in range(10, n):
        if env[i] > floor_db and env[i] - env[i - 10:i].min() > rise_db and i - last > gap_s / 0.01:
            times.append(round(i * 0.01, 3))
            last = i
    return times


def level(y, sr, a, b):
    a, b = max(0, int(a * sr)), min(len(y), int(b * sr))
    if b - a < int(0.05 * sr):
        return None
    return kit.loud_lufs(y[a:b], sr)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("voice")
    ap.add_argument("sfx")
    ap.add_argument("--margin", type=float, default=6.0, help="dB the effects stay under the voice (default 6)")
    ap.add_argument("--window", type=float, default=1.0, help="seconds of voice either side of an effect (default 1)")
    ap.add_argument("--at", type=float, nargs="*", help="effect times in seconds")
    ap.add_argument("--at-json", help="our mixer's mix.json: the 'placed' rows' file_start_s")
    a = ap.parse_args()

    voice, sr = mono_or_stereo(a.voice)
    sfx, sr2 = mono_or_stereo(a.sfx)
    if sr != sr2:
        raise SystemExit(f"under_voice: the stems differ in sample rate ({sr} vs {sr2})")
    if a.at_json:
        times = sorted(max(0.0, p["file_start_s"]) for p in json.load(open(a.at_json))["placed"])
    else:
        times = sorted(a.at) if a.at else detect(sfx, sr)

    chunks = [level(voice, sr, t, t + 0.5) for t in np.arange(0, len(voice) / sr - 0.5, 0.5)]
    speech = [c for c in chunks if c is not None and c > SPEECH_FLOOR_LUFS]
    typical = float(np.median(speech)) if speech else None
    print(f"voice: typical loud syllable {typical:.1f} LUFS (median loudest 50 ms of each 0.5 s with speech)"
          if typical is not None else "voice: no speech found in the voice stem")

    worst, bad = None, 0
    print(f"{'time':>8}  {'effect':>8}  {'voice':>8}  {'margin':>7}  status")
    for j, t in enumerate(times):
        nxt = times[j + 1] - 0.005 if j + 1 < len(times) else t + 0.5
        e = level(sfx, sr, t - 0.02, min(t + 0.5, max(nxt, t + 0.05)))  # this effect only, not the next one
        if e is None or e < -60:
            continue
        v = level(voice, sr, t - a.window, t + a.window)
        ref, note = (v, "") if v is not None and v > SPEECH_FLOOR_LUFS else (typical, "pause")
        if ref is None:
            print(f"{t:8.2f}  {e:8.1f}  {'-':>8}  {'-':>7}  no voice to compare")
            continue
        m = ref - e
        status = "LOUDER" if m < 0 else ("CLOSE" if m < a.margin else "ok")
        bad += status == "LOUDER"
        worst = m if worst is None else min(worst, m)
        print(f"{t:8.2f}  {e:8.1f}  {ref:8.1f}  {m:+7.1f}  {status}{(' (' + note + ')') if note else ''}")
    if worst is not None:
        print(f"{len(times)} effects; tightest margin {worst:+.1f} dB; {bad} louder than the voice")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
