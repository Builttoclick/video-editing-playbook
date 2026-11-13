"""Balance of a new mix against an approved one, effect by effect, AFTER the master (clipper + limiter).

Each placed take's loudest 50 ms (RMS, within 150 ms of its start) minus the film's integrated loudness, median per
group, new minus approved, then minus the median shift of all groups. Why the shift: when sounds leave a film (version 3 of
our 40 s explainer lost its bells), every remaining effect stands out more against the average, and holding the old
integrated loudness makes the master turn them ALL up (the hit came out louder than v2 after its LOUD went down 2 dB).
Only the balance between effects is comparable. Also prints the limiter load, from each mix.json's limiter_db.
A role whose SOUND changed is not comparable this way: a 10 ms click reads ~8-10 dB under a 190 ms pop over 50 ms
even at the same peak (chip in v3: -10.0); compare it with a role of the same kind instead (the click vs the keys).

    "$EARSHOT_HOME/.venv/bin/python" balance.py OLD.wav OLD.json NEW.wav NEW.json [--group PREFIX=NAME ...]

mix.json = what tools/sound.py writes ("placed": id, role, file_start_s, limiter_db). Groups default to the role;
--group why:flood=flood puts every take whose id starts with why:flood in one group (repeatable).
"""
import argparse
import json
from collections import defaultdict

import numpy as np
import pyloudnorm as pyln
import soundfile as sf


def levels(wav, mix_json, groups):
    y, sr = sf.read(wav)
    lufs = pyln.Meter(sr).integrated_loudness(y)
    mono = y.mean(axis=1) if y.ndim > 1 else y
    w = int(0.05 * sr)
    out, lim = defaultdict(list), defaultdict(list)
    placed = json.load(open(mix_json))["placed"]
    for p in placed:
        g = next((name for pre, name in groups if p["id"].startswith(pre)), p["role"])
        a = max(0, int(p["file_start_s"] * sr))
        seg = mono[a:a + int(0.15 * sr)]
        if len(seg) < w:
            continue
        rms = max(np.sqrt(np.mean(seg[i:i + w] ** 2)) for i in range(0, len(seg) - w + 1, w // 5))
        out[g].append(20 * np.log10(rms + 1e-12) - lufs)
        lim[g].append(p.get("limiter_db", 0.0))
    worst = min((p.get("limiter_db", 0.0) for p in placed), default=0.0)
    over = sum(1 for p in placed if p.get("limiter_db", 0.0) < -6)
    return lufs, {g: float(np.median(v)) for g, v in out.items()}, worst, over, len(placed)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("old_wav"), ap.add_argument("old_json"), ap.add_argument("new_wav"), ap.add_argument("new_json")
    ap.add_argument("--group", action="append", default=[], help="PREFIX=NAME: ids starting with PREFIX form NAME")
    a = ap.parse_args()
    groups = [tuple(s.split("=", 1)) for s in a.group]
    l0, old, w0, o0, n0 = levels(a.old_wav, a.old_json, groups)
    l1, new, w1, o1, n1 = levels(a.new_wav, a.new_json, groups)
    common = [g for g in new if g in old]
    shift = float(np.median([new[g] - old[g] for g in common]))
    print(f"integrated: old {l0:.1f} LUFS, new {l1:.1f} LUFS; every effect stands {shift:+.1f} dB further out in the new mix")
    print(f"limiter: old worst {w0:.1f} dB, {o0} of {n0} takes over 6 dB; new worst {w1:.1f} dB, {o1} of {n1}")
    print("balance, new vs old (dB, median shift removed; + = louder against the other effects):")
    for g in sorted(common, key=lambda g: new[g] - old[g] - shift):
        print(f"  {g:14s} {new[g] - old[g] - shift:+5.1f}")
    for g in sorted(set(new) - set(old)):
        print(f"  {g:14s} new group (no counterpart in the old mix)")


if __name__ == "__main__":
    main()
