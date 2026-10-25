"""Sync every phone take to the DJI recording by the waveform.

Result edit/sync.json, per video: DJI_time = movie_time + off(movie_time), off(t) = a + b*t (drift fit over 30 s windows).
"""
import json, sys
import numpy as np
from common import VIDEOS, DJI, EDIT, SCRATCH, SR, decode_mono, envelope, xcorr, audio_start

SCRATCH.mkdir(parents=True, exist_ok=True)
EDIT.mkdir(parents=True, exist_ok=True)


def cached(name, fn):
    p = SCRATCH / f"{name}.npy"
    if p.exists():
        return np.load(p)
    x = fn()
    np.save(p, x)
    return x


dji = cached("dji_main_16k", lambda: decode_mono(DJI, channel=0))
edji = envelope(dji)
print(f"DJI main channel: {len(dji)/SR:.1f} s", flush=True)

out = {}
for name, v in VIDEOS.items():
    x = cached(f"{name}_phone_16k", lambda: decode_mono(v["path"]))
    a0 = audio_start(v["path"])
    ex = envelope(x)
    dur = len(x) / SR
    g = v["guess"] * 1000
    # coarse: 150 s of the take (skip what happened before the DJI started), +-30 s around the guess
    s0 = max(0, -g + 3000)
    s1 = min(len(ex), s0 + 150_000)
    lag, q = xcorr(edji, ex[s0:s1], g + s0 - 30_000, g + s0 + 30_000)
    lag -= s0
    wins = []
    for t0 in range(max(0, int(-g / 1000) + 2), int(dur) - 30 + 1, 45):
        seg = ex[t0 * 1000:(t0 + 30) * 1000]
        c = lag + t0 * 1000
        if c < 0 or c + len(seg) > len(edji):
            continue
        l2, q2 = xcorr(edji, seg, c - 300, c + 300)
        if l2 is not None:
            wins.append((t0 + 15, l2 - t0 * 1000, q2))
    res = {"audio_start": a0, "dur": dur, "coarse_lag_ms": lag, "coarse_q": q, "windows": wins}
    good = [w for w in wins if w[2] > 8]
    if len(good) >= 3:
        t = np.array([w[0] for w in good]); o = np.array([w[1] for w in good])
        for _ in range(3):  # drop outliers, refit
            b, a = np.polyfit(t, o, 1)
            r = o - (a + b * t)
            keep = np.abs(r) < max(3.0, 3 * np.median(np.abs(r)))
            t, o = t[keep], o[keep]
        b, a = np.polyfit(t, o, 1)
        r = o - (a + b * t)
        res.update(fit_a_ms=float(a), fit_b=float(b), n_used=int(len(t)), resid_ms_max=float(np.abs(r).max()),
                   resid_ms_rms=float(np.sqrt((r ** 2).mean())))
        # DJI_time = wav_time + (a + b*wav_time)/1000 ; movie_time = wav_time + a0
        res["off_a"] = float(a / 1000 - a0 * (1 + b / 1000))
        res["off_b"] = float(b / 1000)
    out[name] = res
    print(f"{name}: dur {dur:7.1f}s  a0 {a0:.4f}  coarse {lag/1000:9.3f}s q={q:5.1f}  "
          + (f"fit {res['fit_a_ms']/1000:9.4f}s drift {res['fit_b']*1000:+.2f} ms/1000s  n={res['n_used']}/{len(wins)} "
             f"resid max {res['resid_ms_max']:.2f} ms rms {res['resid_ms_rms']:.2f}" if 'fit_a_ms' in res else f"windows={len(wins)} (no fit)"),
          flush=True)

(EDIT / "sync.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print("wrote", EDIT / "sync.json")
