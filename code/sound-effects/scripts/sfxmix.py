"""sfxmix: the mixer and master chain for sound effects from earshot's bank, as tested on our films.

Extracted on 03-nov-2026 from the sound scripts of two coded films Joaquín approved by ear (a 10 s test: "it's
really good", three times; a 40 s explainer: "the sound effects sound great"; both translated). Their main() bodies are
the same code; this module is that code with the film-specific parts (the events, the LOUD table, the file names) left
to the film. With the 10 s film's settings it reproduces that film's audio/mix.wav sample for sample.

Run it with earshot's venv (it imports earshot, numpy, scipy, soundfile, pyloudnorm):

    "$EARSHOT_HOME/.venv/bin/python" tools/sound.py      # EARSHOT_HOME: your earshot clone (we keep it in ~/tools/earshot)

A film's tools/sound.py (start from ../templates/sound.py) does:

    import sfxmix
    lock = sfxmix.render_kit(ROOT + "/audio/kit.json", ROOT + "/audio/kit")
    out, placed, stats = sfxmix.mix(lock, ROOT + "/audio/kit", events(), fps, frames, LOUD,
                                    highpass=HIGHPASS, clean=CLEAN)
    sfxmix.write(ROOT, out, placed, stats, fps, frames, KIND)
    sfxmix.mux(ROOT + "/out/picture.mp4", ROOT + "/audio/mix.wav", ROOT + "/out/film.mp4")
    print(sfxmix.decoded_levels(ROOT + "/out/film.mp4"))

events() returns tuples (id, role, visual_frame, pick[, loudness]):
  id        a free label ("climb:rank:1"), shown in mix.json, cues_earshot.json and earshot's timeline
  role      a role of audio/kit.json
  frame     the frame the eye sees the event (fractions are fine: a whoosh on the middle of a move)
  pick      a take index (int, wraps) or a pitch label ("E5") matched against the take file's suffix
  loudness  optional: this one event's loudest 50 ms in LUFS, instead of LOUD[role]
"""
import json
import os
import re
import subprocess

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from earshot.features import true_peak_dbtp
from earshot.forge import fx, kit
from scipy import signal

SR = 48000
# Master defaults = the 40 s film's (the newest lessons). The 10 s film used -16.0 / -1.5 / ffmpeg aac 256k, and that
# AAC overshot: a -1.5 dBTP master decoded at +0.5 dBTP on the 40 s film (clips on playback). aac_at = Apple's encoder.
TARGET_LUFS = -15.8   # lands at -16.0 or a hair above once encoded (earshot's web range starts at -16)
CEILING_DBTP = -2.0
CLIP_DB = -4.5        # soft knee for click transients, before the limiter
RISER_FADE_S = 0.012  # a riser stops dead on its peak with this fade (the micro stop-down before the hit)
END_FADE_S = 0.04


def render_kit(kit_json, kit_dir):
    """render (or reuse the cached) takes of a kit; returns the lock: roles -> takes with measured onset/peak/end"""
    return kit.render(str(kit_json), str(kit_dir))


def take_for(role, pick):
    """a take of a locked role: by index (wraps around) or by the pitch label at the end of its file name"""
    takes = role["takes"]
    if isinstance(pick, str):
        for t in takes:
            if os.path.splitext(t["file"])[0].endswith("_" + pick):
                return t
        raise SystemExit(f"no take {pick} in {[t['file'] for t in takes]}")
    return takes[pick % len(takes)]


def soft_clip(x, thresh_db=CLIP_DB, os_factor=4):
    """linear under thresh_db, a tanh knee above it toward 0 dBFS; oversampled so the bent peaks do not alias"""
    t = 10 ** (thresh_db / 20)
    u = signal.resample_poly(x, os_factor, 1, axis=0)
    a = np.abs(u)
    over = a > t
    u[over] = np.sign(u[over]) * (t + (1 - t) * np.tanh((a[over] - t) / (1 - t)))
    return signal.resample_poly(u, 1, os_factor, axis=0)[: len(x)]


def prepare(y, take, rname, highpass=None, cut_at_peak=("riser",), riser_fade_s=RISER_FADE_S, sr=SR):
    """a take as the mix uses it: stereo, high-passed if its role is listed, a riser cut at its peak"""
    if y.shape[1] == 1:
        y = np.repeat(y, 2, axis=1)
    if highpass and rname in highpass:
        y = signal.sosfilt(signal.butter(4, highpass[rname], "highpass", fs=sr, output="sos"), y, axis=0)
    if rname in cut_at_peak:  # stop dead on its peak: a short dip before the hit instead of a build masking its attack
        ip, nf = int(round(take["peak_s"] * sr)), int(riser_fade_s * sr)
        y = y[:ip + nf].copy()
        y[ip:] *= np.linspace(1, 0, nf)[:, None]
    return y


def mix(lock, kit_dir, events, fps, frames, loud, highpass=None, clean=(), cut_at_peak=("riser",),
        target_lufs=TARGET_LUFS, ceiling_dbtp=CEILING_DBTP, clip_db=CLIP_DB, end_fade_s=END_FADE_S, sr=SR,
        verbose=True):
    """place every event's take on its frame (kit.place: the role's align + offset_ms), set its loudest 50 ms to its
    LOUD value, sum into two buses (clean = low tonal bodies that never touch the clipper), master: soft knee on the
    mix bus, earshot's true-peak look-ahead limiter on the sum, make-up gain aimed at target_lufs in up to 3 tries.
    Returns (master, placed, stats); placed rows carry gain_db and limiter_db (how hard the limiter bit each effect)."""
    n = int(round(frames / fps * sr))
    bus = np.zeros((n + sr, 2))
    cbus = np.zeros((n + sr, 2))
    placed = []
    for eid, rname, vf, pick, *over in events:
        role = lock["roles"][rname]
        take = take_for(role, pick)
        y, file_sr = sf.read(os.path.join(str(kit_dir), take["file"]), always_2d=True)
        assert file_sr == sr, (take["file"], file_sr)
        y = prepare(y, take, rname, highpass, cut_at_peak, sr=sr)
        g = round((over[0] if over else loud[rname]) - kit.loud_lufs(y), 2)
        t0 = kit.place(take, role, vf / fps)
        i0 = int(round(t0 * sr))
        if i0 < 0:
            y, i0 = y[-i0:], 0
        (cbus if rname in clean else bus)[i0:i0 + len(y)] += y * 10 ** (g / 20)
        placed.append({"id": eid, "role": rname, "file": take["file"], "visual_s": round(vf / fps, 4),
                       "file_start_s": t0, "gain_db": g})
    bus, cbus = bus[:n], cbus[:n]
    fade = int(end_fade_s * sr)
    bus[-fade:] *= np.linspace(1, 0, fade)[:, None]
    cbus[-fade:] *= np.linspace(1, 0, fade)[:, None]

    meter = pyln.Meter(sr)
    raw_lufs = meter.integrated_loudness(bus + cbus)
    gain = target_lufs - raw_lufs
    for _ in range(3):  # clipping and limiting cost a little loudness: aim again from where it landed
        k = 10 ** (gain / 20)
        pre = (bus + cbus) * k
        out = fx.limit(soft_clip(bus * k, clip_db) + cbus * k, ceiling_db=ceiling_dbtp)
        miss = target_lufs - meter.integrated_loudness(out)
        if abs(miss) < 0.15:
            break
        gain += miss
    tp_before = true_peak_dbtp(pre)
    for p in placed:  # the largest drop of each effect's first 60 ms, in dB
        a = max(0, int(p["file_start_s"] * sr)); b = min(n, a + int(0.06 * sr))
        num, den = np.abs(out[a:b]).max() + 1e-12, np.abs(pre[a:b]).max() + 1e-12
        p["limiter_db"] = round(float(20 * np.log10(num / den)), 1)
    lufs, tp = pyln.Meter(sr).integrated_loudness(out), true_peak_dbtp(out)
    stats = {"raw_lufs": round(raw_lufs, 2), "lufs": round(lufs, 2), "true_peak_before_limit": round(float(tp_before), 2),
             "true_peak": round(float(tp), 2), "makeup_db": round(float(gain), 2)}
    if verbose:
        hard = sorted(placed, key=lambda p: p["limiter_db"])[:5]
        print("limiter, hardest:", ", ".join(f"{p['id']} {p['limiter_db']} dB" for p in hard))
        print(f"{len(placed)} effects placed; raw {raw_lufs:.1f} LUFS -> {lufs:.1f} LUFS, "
              f"true peak {tp_before:.1f} -> {tp:.1f} dBTP")
    return out, placed, stats


def write(root, out, placed, stats, fps, frames, kinds, wav="audio/mix.wav", cues="audio/cues_earshot.json",
          report="audio/mix.json", sr=SR):
    """the master (24-bit WAV), the events in earshot's cue format (for timeline / sheet --cues) and the mix report.
    kinds maps each role to a cue kind (free labels; earshot groups and colours by them)."""
    root = str(root)
    sf.write(os.path.join(root, wav), out.astype(np.float32), sr, subtype="PCM_24")
    json.dump({"fps": fps, "total": frames,
               "events": [{"f": round(p["visual_s"] * fps, 3), "kind": kinds.get(p["role"], p["role"]), "id": p["id"]}
                          for p in placed]},
              open(os.path.join(root, cues), "w"), indent=1)
    json.dump({**stats, "placed": placed}, open(os.path.join(root, report), "w"), indent=1)


def mux(picture, wav, out_mp4, aac="aac_at", bitrate="320k", full_range=True, crf=16, sr=SR):
    """the picture with the mix. full_range: Remotion's JPEG frames come out yuvj420p (full range); re-encode to
    broadcast-range BT.709 yuv420p or the colours shift on phones. aac_at 320k overshoots least (see TARGET_LUFS).
    aac_at (Apple AudioToolbox) exists only in macOS builds of ffmpeg: elsewhere pass aac="aac" and measure the decoded
    true peak (decoded_levels). This mux keeps the MP4 edit list. If you add -use_editlist 0 (an upload check that
    wants no edit list), trim the encoder's priming first or every sound plays late: aac_at writes 2112 samples
    (44 ms at 48 kHz), so put -af atrim=start_sample=2112 before the encoder (docs/19-sound-effects.md)."""
    vf = ["-vf", "scale=in_range=pc:out_range=tv,format=yuv420p"] if full_range else ["-vf", "format=yuv420p"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(picture), "-i", str(wav), "-map", "0:v", "-map", "1:a", *vf,
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           "-c:a", aac, "-b:a", bitrate, "-ar", str(sr), "-movflags", "+faststart", "-shortest", str(out_mp4)]
    subprocess.run(cmd, check=True)
    return str(out_mp4)


def decoded_levels(path):
    """integrated LUFS and true peak of a file as a player decodes it (ffmpeg ebur128). The number that matters for
    clipping is this one, measured on the encoded MP4, not the WAV master's."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True)
    summary = r.stderr[r.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", summary)
    pk = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary)
    return {"lufs": float(i.group(1)) if i else None, "true_peak_dbtp": float(pk.group(1)) if pk else None}
