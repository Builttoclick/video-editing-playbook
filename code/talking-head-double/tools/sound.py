"""AN-01's sound: every effect from earshot's bank (made in code, no recordings, no voice, no music).

Same pipeline as our 40 s local SEO explainer (the film Joaquín approved on 03-nov-2026, version 4): reads
src/data/cues.json and src/data/copy.json, the same frames and words the picture is built from, renders audio/kit.json
with earshot (cached takes + audio/kit/kit.lock.json with each take's measured onset / peak), places each take so its
sync point lands on its visual event shifted by the role's offset_ms, sets it to its loudness in LOUD, sums, masters
(true peak -2 dBTP with earshot's own look-ahead limiter) and muxes over out/picture.mp4.

The film is a chat: the viewer's messages leave with one soft pop (send), every answer arrives with the SAME
WhatsApp tone (Joaquín's rule: one monotone ding, every message), the typing dots tick, the graphics that come out of the
phone carry the approved kit (clicks, pops, swishes, the slab thuds), the visto stays silent on purpose, and the end
card lands on a thud with the price on the one hit of the film.

    "$EARSHOT_PY" tools/sound.py              (EARSHOT_PY = a Python with earshot installed)
      -> audio/mix.wav, audio/cues_earshot.json (for earshot timeline / sheet --cues), out/an-01-animado.mp4
"""
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
KIT = os.path.join(ROOT, "audio/kit")
SR = 48000
# The approved 40 s film plays at -17.5 LUFS by balance (v3/v4). This film has more tonal events (16 dings and sends)
# and no riser, so it starts one notch up; the "limiter, hardest" line says whether a role is set too high.
TARGET_LUFS = -16.5
# AAC overshoots clicks by 1.4-2 dB even at 320k: master at -2 and encode with Apple's aac_at.
CEILING_DBTP = -2.0
# Each role's loudest 50 ms before the master (LUFS scale), the approved ladder of the 40 s film (version 4) plus the
# send pop, set a touch under the results pop so the viewer's own messages sit under Joaquín's dings.
LOUD = {"hit": -24, "whoosh.short": -18, "swish": -18, "land": -21, "land.big": -19.5, "chip": -26, "pop": -18.2,
        "tag": -25.5, "scroll": -20, "exit": -21, "ding.wa": -16.7, "send": -20.5, "key": -26.5, "key.return": -24,
        "text": -28.5, "text.long": -28.5, "tick": -32, "tock": -21}
# Keys own no low end; the text swishes keep only air.
HIGHPASS = {"key": 180, "key.return": 180, "text": 400, "text.long": 400}
# Clicks and knocks have a huge crest: a soft knee above this level (4x oversampled) shaves their first millisecond.
CLIP_DB = -4.5
# Low tonal bodies stay out of the clipper: they ride a bus only the limiter touches.
CLEAN = {"hit", "land", "land.big"}
# A SNAP spring pop-in reads as "there" at about half its travel: 2 frames.
POP = 2

cues = json.load(open(os.path.join(ROOT, "src/data/cues.json"), encoding="utf-8"))
copy = json.load(open(os.path.join(ROOT, "src/data/copy.json"), encoding="utf-8"))
fps, F, MSGF = cues["fps"], cues["f"], cues["msg"]
N = int(round(cues["frames"] / fps * SR))


def type_frames(text, start):
    """the frame each letter appears: a gap pattern cycled per letter, one beat more after a space (Chat.tsx TYPE_AT)"""
    out = []
    for i in range(len(text)):
        gap = cues["typeAfterSpace"] if i and text[i - 1] == " " else cues["typePattern"][i % len(cues["typePattern"])]
        out.append(start if i == 0 else out[-1] + gap)
    return out


def events():
    """(id, role, visual frame, pick[, loudness]): pick = a take index or a pitch label; loudness overrides LOUD."""
    ev = []
    keys = iter(range(10_000))
    for m in copy["messages"]:
        t = MSGF[m["id"]]
        if m["side"] == "out":
            ev.append((f"msg:{m['id']}", "send", t["at"] + POP, 0))
            continue
        if "dots" in t:  # the typing bubble: one soft tick per bounce of its first wave
            ev += [(f"dots:{m['id']}:{i}", "tick", t["dots"] + w, i) for i, w in enumerate(cues["dotsWave"])]
        ev.append((f"msg:{m['id']}", "ding.wa", t["at"] + 1, 0))
        if m.get("list"):  # the receipt: the first line arrives with the ding, every next line prints on a dry click
            ev += [(f"list:{m['id']}:{i}", "chip", t["at"] + i * F["listStep"] + 1, i) for i in range(1, len(m["list"]))]
    # the two chips fly out of the bubble (a swish each, fastest early in their spring) and land (a click)
    for i, f in enumerate(F["chips"]):
        ev.append((f"chip:fly:{i}", "swish", f + 4, 0, LOUD["swish"] - 2))
        ev.append((f"chip:land:{i}", "chip", f + 9, i))
    ev.append(("chips:fold", "swish", F["chipsOut"] + 6, 0, LOUD["swish"] - 5))  # they fold into the page
    # the page slab turns in (a lazier spring: "there" at ~8 frames), the words type, the button pops, it turns away
    w = F["wire"]
    ev.append(("wire:in", "land.big", w["in"] + 8, 0))
    ev += [(f"wire:word:{i}", "key", f, next(keys)) for i, f in enumerate(F["wireWords"] + F["wireSub"])]
    ev.append(("wire:button", "pop", F["wireButton"] + POP, 0))
    ev.append(("wire:out", "exit", w["out"] + 8, 0, LOUD["exit"] - 2.5))
    # the 14-day strip: the panel lands, a soft tick per tile flipping over, the last tile on the click voice
    c = F["cal"]
    ev.append(("cal:in", "land.big", c["in"] + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", f + 1, i) for i, f in enumerate(c["tiles"][:-1])]
    ev.append(("cal:tile:13", "tag", c["tiles"][-1] + POP, 0))
    ev.append(("cal:out", "exit", c["out"] + 6, 0, LOUD["exit"] - 2.5))
    # the three proposals fan out (one whoosh), each card settles (a pop), the pick clicks, they leave
    p = F["props"]
    ev.append(("props:fan", "whoosh.short", p["in"] + 6, 0))
    ev += [(f"props:card:{i}", "pop", f + POP, i) for i, f in enumerate(p["cards"])]
    ev.append(("props:pick", "tag", p["pick"] + POP, 0))
    ev.append(("props:out", "exit", p["out"] + 8, 0, LOUD["exit"] - 2.5))
    # the viewer types the last line (one key per letter, never the same take twice in a row) and presses send
    q7 = next(m for m in copy["messages"] if m["id"] == "q7")
    ev += [(f"type:{i}", "key", f, i) for i, f in enumerate(type_frames(q7["typed"], F["typeStart"]))]
    ev.append(("type:send", "key.return", F["sendPress"] + 1, 0))
    # the visto: the lens springs in over the ticks (a soft swish on its move), the ticks turn blue on a dry knock
    # (Joaquín's ask on draft 2: "un sonidito el clavado"); the header's "escribiendo..." and "últ. vez" stay silent
    ev.append(("visto:lens", "swish", F["visto"]["lens"] + 4, 0, LOUD["swish"] - 3))
    ev.append(("visto:tock", "tock", F["ticks"]["blue"] + 1, 0))
    # the end card: the board swings in (whoosh on its fastest frames) and lands, the price hits, the line rises,
    # the WhatsApp line pops, the arrow and the lockup close it
    ev.append(("board:swing", "whoosh.short", F["board"] + 6, 0, LOUD["whoosh.short"] - 2))
    ev.append(("board:land", "land.big", F["board"] + 14, 0))
    ev.append(("end:price", "hit", F["price"] + 3, 0))
    ev.append(("end:line", "text.long", F["line"] + 1, 0))
    ev.append(("end:cta", "pop", F["cta"] + POP, 0))
    ev.append(("end:arrow", "text", F["arrow"] + 1, 1))
    ev.append(("end:logo", "land", F["logo"] + 4, 0, LOUD["land"] - 3))
    return ev


KIND = {"land": "land", "land.big": "land", "key": "key", "key.return": "key", "pop": "pop", "tag": "pop", "chip": "pop",
        "whoosh.short": "whoosh", "swish": "whoosh", "scroll": "whoosh", "exit": "whoosh", "hit": "hit",
        "ding.wa": "click", "send": "pop", "text": "whoosh", "text.long": "whoosh", "tick": "tick", "tock": "tock"}


def soft_clip(x, thresh_db=CLIP_DB, os=4):
    """linear under thresh_db, a tanh knee above it toward 0 dBFS; oversampled so the bent peaks do not alias"""
    t = 10 ** (thresh_db / 20)
    u = signal.resample_poly(x, os, 1, axis=0)
    a = np.abs(u)
    over = a > t
    u[over] = np.sign(u[over]) * (t + (1 - t) * np.tanh((a[over] - t) / (1 - t)))
    return signal.resample_poly(u, 1, os, axis=0)[: len(x)]


def take_for(role, pick):
    takes = role["takes"]
    if isinstance(pick, str):
        for t in takes:
            if os.path.splitext(t["file"])[0].endswith("_" + pick):
                return t
        raise SystemExit(f"no take {pick} in {[t['file'] for t in takes]}")
    return takes[pick % len(takes)]


def main():
    lock = kit.render(os.path.join(ROOT, "audio/kit.json"), KIT)
    mix = np.zeros((N + SR, 2))
    clean = np.zeros((N + SR, 2))
    placed = []
    for eid, rname, vf, pick, *loud in events():
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
        (clean if rname in CLEAN else mix)[i0:i0 + len(y)] += y * 10 ** (g / 20)
        placed.append({"id": eid, "role": rname, "file": take["file"], "visual_s": round(vf / fps, 4),
                       "file_start_s": t0, "gain_db": g})
    mix, clean = mix[:N], clean[:N]
    fade = int(0.04 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    clean[-fade:] *= np.linspace(1, 0, fade)[:, None]

    meter = pyln.Meter(SR)
    raw_lufs = meter.integrated_loudness(mix + clean)
    gain = TARGET_LUFS - raw_lufs
    for _ in range(3):  # clipping and limiting cost a little loudness: aim again from where it landed
        k = 10 ** (gain / 20)
        pre = (mix + clean) * k
        out = fx.limit(soft_clip(mix * k) + clean * k, ceiling_db=CEILING_DBTP)
        miss = TARGET_LUFS - meter.integrated_loudness(out)
        if abs(miss) < 0.15:
            break
        gain += miss
    tp_before = true_peak_dbtp(pre)
    mix = out
    for p in placed:  # how hard the limiter worked on each effect: the largest drop of its first 60 ms, in dB
        a = max(0, int(p["file_start_s"] * SR)); b = min(N, a + int(0.06 * SR))
        num, den = np.abs(mix[a:b]).max() + 1e-12, np.abs(pre[a:b]).max() + 1e-12
        p["limiter_db"] = round(float(20 * np.log10(num / den)), 1)
    hard = sorted(placed, key=lambda p: p["limiter_db"])[:5]
    print("limiter, hardest:", ", ".join(f"{p['id']} {p['limiter_db']} dB" for p in hard))
    lufs, tp = pyln.Meter(SR).integrated_loudness(mix), true_peak_dbtp(mix)
    out_wav = os.path.join(ROOT, "audio/mix.wav")
    sf.write(out_wav, mix.astype(np.float32), SR, subtype="PCM_24")

    cue_file = os.path.join(ROOT, "audio/cues_earshot.json")
    json.dump({"fps": fps, "total": cues["frames"],
               "events": [{"f": round(p["visual_s"] * fps, 3), "kind": KIND[p["role"]], "id": p["id"]} for p in placed]},
              open(cue_file, "w"), indent=1)
    json.dump({"raw_lufs": round(raw_lufs, 2), "lufs": round(lufs, 2), "true_peak_before_limit": round(float(tp_before), 2),
               "true_peak": round(float(tp), 2), "placed": placed}, open(os.path.join(ROOT, "audio/mix.json"), "w"), indent=1)
    print(f"{len(placed)} effects placed; raw {raw_lufs:.1f} LUFS -> {lufs:.1f} LUFS, true peak {tp_before:.1f} -> {tp:.1f} dBTP")

    # Picture: Remotion's JPEG frames come out full range (yuvj420p); re-encode to broadcast-range BT.709 yuv420p.
    out_mp4 = os.path.join(ROOT, "out/an-01-animado.mp4")
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", os.path.join(ROOT, "out/picture.mp4"), "-i", out_wav,
           "-map", "0:v", "-map", "1:a", "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p",
           # aac_at puts 2112 priming samples first; with no edit list (Meta) players play them: trim, or every sound is 44 ms late
           "-af", "atrim=start_sample=2112",
           "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-profile:v", "high",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           # Meta's gate (code/meta-export/meta_ready.py): BT.709 x3 in the H.264 VUI, no edit list, moov first
           "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0",
           "-c:a", "aac_at", "-b:a", "320k", "-ar", str(SR), "-use_editlist", "0", "-movflags", "+faststart+negative_cts_offsets", "-shortest", out_mp4]
    subprocess.run(cmd, check=True)
    print(out_mp4)


if __name__ == "__main__":
    sys.exit(main())
