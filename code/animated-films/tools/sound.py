"""The sound of one film, every effect from earshot's bank (made in code, no recordings, no voice, no music).

    "$EARSHOT_PY" tools/sound.py an02           (EARSHOT_PY = a Python with earshot installed)
      -> audio/an02/mix.wav, audio/an02/cues_earshot.json, audio/an02/mix.json, out/an-02-animado.mp4

Same pipeline as AN-01 and our 40 s local SEO explainer (the films Joaquín approved): reads src/films/<film>/cues.json and
copy.json (the same frames and words the picture is built from), takes the film's event list from
tools/films/<film>.py (events), renders audio/kit.json with earshot (cached takes + audio/kit/kit.lock.json with each
take's measured onset / peak), places each take so its sync point lands on its visual event shifted by the role's
offset_ms, sets it to its loudness in LOUD, sums, masters (true peak -2 dBTP with earshot's own look-ahead limiter)
and muxes over out/<film>/picture.mp4 with Meta-ready flags.
"""
import importlib
import json
import os
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from earshot.features import true_peak_dbtp
from earshot.forge import fx, kit
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
KIT = os.path.join(ROOT, "audio/kit")
SR = 48000
# AN-01 (approved 05-nov) played at -16.5 LUFS; these films have the same density, so the same target. The "limiter,
# hardest" line says whether a role is set too high for a film.
TARGET_LUFS = -16.5
# AAC overshoots clicks by 1.4-2 dB even at 320k: master at -2 and encode with Apple's aac_at.
CEILING_DBTP = -2.0
# Each role's loudest 50 ms before the master (LUFS scale): AN-01's ladder plus the new roles of these films.
LOUD = {"hit": -24, "whoosh.short": -18, "swish": -18, "land": -21, "land.big": -19.5, "chip": -27.5, "pop": -18.2,
        "tag": -27, "scroll": -20, "exit": -21, "ding.wa": -16.7, "flood": -17.5, "send": -20.5, "key": -26.5, "key.return": -24,
        "text": -28.5, "text.long": -28.5, "tick": -32, "tock": -21, "zip": -22, "puff": -20, "riser": -24, "swell": -25,
        "cross": -22, "crack": -21, "drip": -23, "shutter": -20, "flicker": -30, "clock": -29}
HIGHPASS = {"key": 180, "key.return": 180, "text": 400, "text.long": 400, "clock": 300, "flicker": 500}
CLIP_DB = -4.5
CLEAN = {"hit", "land", "land.big", "riser", "swell", "shutter"}
KIND = {"land": "land", "land.big": "land", "key": "key", "key.return": "key", "pop": "pop", "tag": "pop", "chip": "pop",
        "whoosh.short": "whoosh", "swish": "whoosh", "scroll": "whoosh", "exit": "whoosh", "hit": "hit", "riser": "riser", "swell": "riser",
        "ding.wa": "click", "flood": "click", "send": "pop", "text": "whoosh", "text.long": "whoosh", "tick": "tick", "tock": "tock",
        "zip": "whoosh", "puff": "whoosh", "cross": "tock", "crack": "tock", "drip": "pop", "shutter": "whoosh", "flicker": "tick", "clock": "tick"}


def soft_clip(x, thresh_db=CLIP_DB, os_=4):
    """linear under thresh_db, a tanh knee above it toward 0 dBFS; oversampled so the bent peaks do not alias"""
    t = 10 ** (thresh_db / 20)
    u = signal.resample_poly(x, os_, 1, axis=0)
    a = np.abs(u)
    over = a > t
    u[over] = np.sign(u[over]) * (t + (1 - t) * np.tanh((a[over] - t) / (1 - t)))
    return signal.resample_poly(u, 1, os_, axis=0)[: len(x)]


def take_for(role, pick):
    takes = role["takes"]
    if isinstance(pick, str):
        for t in takes:
            if os.path.splitext(t["file"])[0].endswith("_" + pick):
                return t
        raise SystemExit(f"no take {pick} in {[t['file'] for t in takes]}")
    return takes[pick % len(takes)]


def main(film, mux=True):
    cues = json.load(open(os.path.join(ROOT, "src/films", film, "cues.json"), encoding="utf-8"))
    copy = json.load(open(os.path.join(ROOT, "src/films", film, "copy.json"), encoding="utf-8"))
    fps = cues["fps"]
    N = int(round(cues["frames"] / fps * SR))
    mod = importlib.import_module(f"films.{film}")
    events = mod.events(cues, copy, LOUD)
    lock = kit.render(os.path.join(ROOT, "audio/kit.json"), KIT)
    mix = np.zeros((N + SR, 2))
    clean = np.zeros((N + SR, 2))
    placed = []
    for eid, rname, vf, pick, *loud in events:
        if rname not in lock["roles"]:
            raise SystemExit(f"{eid}: role {rname} is not in audio/kit.json")
        role = lock["roles"][rname]
        take = take_for(role, pick)
        y, sr = sf.read(os.path.join(KIT, take["file"]), always_2d=True)
        assert sr == SR, (take["file"], sr)
        if y.shape[1] == 1:
            y = np.repeat(y, 2, axis=1)
        if rname in HIGHPASS:
            y = signal.sosfilt(signal.butter(4, HIGHPASS[rname], "highpass", fs=SR, output="sos"), y, axis=0)
        g = round((loud[0] if loud else LOUD[rname]) - kit.loud_lufs(y), 2)
        t0 = kit.place(take, role, vf / fps)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            y, i0 = y[-i0:], 0
        if i0 >= N + SR:
            continue
        seg = y[: N + SR - i0]
        (clean if rname in CLEAN else mix)[i0:i0 + len(seg)] += seg * 10 ** (g / 20)
        placed.append({"id": eid, "role": rname, "file": take["file"], "visual_s": round(vf / fps, 4), "file_start_s": t0, "gain_db": g})
    mix, clean = mix[:N], clean[:N]
    fade = int(0.04 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    clean[-fade:] *= np.linspace(1, 0, fade)[:, None]

    meter = pyln.Meter(SR)
    raw_lufs = meter.integrated_loudness(mix + clean)
    gain = TARGET_LUFS - raw_lufs
    pre = out = None
    for _ in range(3):
        k = 10 ** (gain / 20)
        pre = (mix + clean) * k
        out = fx.limit(soft_clip(mix * k) + clean * k, ceiling_db=CEILING_DBTP)
        miss = TARGET_LUFS - meter.integrated_loudness(out)
        if abs(miss) < 0.15:
            break
        gain += miss
    tp_before = true_peak_dbtp(pre)
    mix = out
    for p in placed:
        a = max(0, int(p["file_start_s"] * SR)); b = min(N, a + int(0.06 * SR))
        num, den = np.abs(mix[a:b]).max() + 1e-12, np.abs(pre[a:b]).max() + 1e-12
        p["limiter_db"] = round(float(20 * np.log10(num / den)), 1)
    hard = sorted(placed, key=lambda p: p["limiter_db"])[:5]
    print("limiter, hardest:", ", ".join(f"{p['id']} {p['limiter_db']} dB" for p in hard))
    lufs, tp = pyln.Meter(SR).integrated_loudness(mix), true_peak_dbtp(mix)
    adir = os.path.join(ROOT, "audio", film)
    os.makedirs(adir, exist_ok=True)
    out_wav = os.path.join(adir, "mix.wav")
    sf.write(out_wav, mix.astype(np.float32), SR, subtype="PCM_24")
    json.dump({"fps": fps, "total": cues["frames"], "events": [{"f": round(p["visual_s"] * fps, 3), "kind": KIND[p["role"]], "id": p["id"]} for p in placed]},
              open(os.path.join(adir, "cues_earshot.json"), "w"), indent=1)
    json.dump({"raw_lufs": round(raw_lufs, 2), "lufs": round(lufs, 2), "true_peak_before_limit": round(float(tp_before), 2), "true_peak": round(float(tp), 2), "placed": placed},
              open(os.path.join(adir, "mix.json"), "w"), indent=1)
    # the longest silence (effects only) is what earshot's critique will flag: say it now
    env = np.abs(mix).max(axis=1)
    blk = int(0.05 * SR)
    quiet = [float(np.sqrt(np.mean(env[i:i + blk] ** 2))) < 10 ** (-50 / 20) for i in range(0, N - blk, blk)]
    longest, run, where = 0, 0, 0
    for i, q in enumerate(quiet):
        run = run + 1 if q else 0
        if run > longest:
            longest, where = run, i - run + 1
    print(f"{len(placed)} effects placed; raw {raw_lufs:.1f} LUFS -> {lufs:.1f} LUFS, true peak {tp_before:.1f} -> {tp:.1f} dBTP; "
          f"longest quiet stretch {longest * 0.05:.2f} s at {where * 0.05:.2f} s")
    if not mux:
        return
    num = film[2:]
    out_mp4 = os.path.join(ROOT, "out", f"an-{num}-animado.mp4")
    # Apple's AAC encoder puts 2112 priming samples (44 ms) in front of the audio; with no edit list (Meta's gate)
    # the player does not skip them and every sound plays 44 ms late (measured 06-nov-2026 on AN-02: the mp4 lagged
    # the wav by exactly 2112 samples). Trim them off the mix first: no film has a sound in its first 44 ms.
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", os.path.join(ROOT, "out", film, "picture.mp4"), "-i", out_wav,
           "-map", "0:v", "-map", "1:a", "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-af", "atrim=start_sample=2112",
           "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-profile:v", "high",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0",
           "-c:a", "aac_at", "-b:a", "320k", "-ar", str(SR), "-use_editlist", "0", "-movflags", "+faststart+negative_cts_offsets", "-shortest", out_mp4]
    subprocess.run(cmd, check=True)
    print(out_mp4)


if __name__ == "__main__":
    main(sys.argv[1], mux="--no-mux" not in sys.argv)
