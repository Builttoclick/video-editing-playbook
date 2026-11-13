"""The talking-head double's sound: Joaquín's voice (the edit-pipeline renderer's chain and loudnorm, RAW/edit/render/AN-01-TH/mix.wav)
plus earshot's bank effects under it, every one tied to a word through src/data/th_cues.json, the same file src/TH.tsx
reads. Voice-led: levels relative to Joaquín's speech, never the effects-only ladder, every
effect under Joaquín's voice; then the true-peak limiter and Apple AAC.

    "$EARSHOT_PY" tools/th_sound.py           (EARSHOT_PY = a Python with earshot installed)
      -> audio/th/voice.wav, audio/th/sfx.wav (stems for under_voice.py), audio/th/mix.wav, audio/th/cues_earshot.json,
         out/an-01-hablado.mp4 (over out/th/picture.mp4)
"""
import json
import os
import subprocess
import sys
import unicodedata

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from earshot.features import true_peak_dbtp
from earshot.forge import fx, kit
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, "RAW/edit/render/AN-01-TH")
KIT = os.path.join(ROOT, "audio/kit")
OUT = os.path.join(ROOT, "audio/th")
SR, FPS = 48000, 30
TARGET_LUFS, CEILING_DBTP = -14.0, -1.5
# each role's loudest 50 ms against Joaquín's median 50 ms speech level (edit-pipeline's rel_db table, extended by role)
REL = {"ding.wa": -9, "send": -12, "hit": -8, "land": -10, "land.big": -10, "pop": -12, "chip": -14, "tag": -13,
       "tick": -21, "tock": -9, "puff": -8, "key": -18, "key.return": -16, "swish": -13, "whoosh.short": -14, "exit": -15, "text": -16, "text.long": -16}
HIGHPASS = {"key": 180, "key.return": 180, "text": 400, "text.long": 400}
POP = 2

TH = json.load(open(os.path.join(ROOT, "src/data/th.json"), encoding="utf-8"))
CUES = json.load(open(os.path.join(ROOT, "src/data/th_cues.json"), encoding="utf-8"))
COPY = json.load(open(os.path.join(ROOT, "src/data/copy.json"), encoding="utf-8"))
PIECES = TH["pieces"]
N = int(round(TH["frames"] / FPS * SR))


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(ch for ch in s if ch.isalnum() and not unicodedata.combining(ch))


def pieces(beat):
    return [p for p in PIECES if p["beat"] == beat]


def word_f(beat, sub, nth=0):
    """src/TH.tsx wordF: the frame of the nth word of the beat containing sub, else the beat's second frame"""
    ps = pieces(beat)
    if not ps:
        return -10_000
    hits = [w for p in ps for w in p["words"] if norm(sub) in norm(w["text"])]
    return hits[nth]["f"] if len(hits) > nth else ps[0]["f0"] + 2


def start_f(beat):
    ps = pieces(beat)
    return ps[0]["f0"] if ps else -10_000


def cue_f(c):
    return (word_f(c["beat"], c["word"], c.get("nth", 0)) if c["word"] else start_f(c["beat"])) + c.get("off", 0)


def events():
    """(id, role, visual frame, pick[, rel]): rel overrides REL"""
    ev = []
    for m in CUES["msgs"]:
        at = cue_f(m)
        if m["side"] == "out":
            ev.append((f"msg:{m['id']}", "send", at + POP, 0))
        else:
            ev.append((f"msg:{m['id']}", "ding.wa", at + 1, 0))
        for j, w in enumerate(m.get("listWords", [])[1:], 1):  # the receipt lines after the first, on Joaquín's words
            ev.append((f"list:{m['id']}:{j}", "chip", word_f(m["beat"], w) + 1, j))
    B = CUES["beats"]
    ev.append(("price:hit", "hit", cue_f(B["price"]) + 3, 0))
    ev.append(("price:sheen", "text.long", cue_f(B["priceSheen"]) + 2, 0))
    ev.append(("sticker:slap", "land", cue_f(B["sticker"]) + 2, 0))
    ev.append(("sticker:drop", "exit", cue_f(B["stickerGone"]) + 6, 0, REL["exit"] - 3))
    for i, c in enumerate(B["chips"]):
        ev.append((f"chip:fly:{i}", "swish", cue_f(c) + 4, 0))
        ev.append((f"chip:land:{i}", "chip", cue_f(c) + 9, i))
    wi = cue_f(B["wire"])
    ev.append(("chips:fold", "swish", wi + 10, 0, REL["swish"] - 4))
    ev.append(("wire:in", "land.big", wi + 8, 0))
    ev += [(f"wire:word:{i}", "key", wi + 10 + i * 3, i) for i in range(len(COPY["wire"]["headline"].split()))]
    ev.append(("wire:button", "pop", cue_f(B["wireButton"]) + POP, 0))
    ev.append(("wire:out", "exit", cue_f(B["wireOut"]) + 8, 0, REL["exit"] - 3))
    ci = cue_f(B["cal"])
    tiles = [ci + 4 + int(round(i * 2.3)) for i in range(14)]  # src/TH.tsx calTiles
    ev.append(("cal:in", "land.big", ci + POP, 0))
    ev += [(f"cal:tile:{i}", "tick", t + 1, i) for i, t in enumerate(tiles[:-1])]
    ev.append(("cal:tile:13", "tag", tiles[-1] + POP, 0))
    ev.append(("cal:out", "exit", cue_f(B["calOut"]) + 6, 0, REL["exit"] - 3))
    co = cue_f(B["compose"])
    ev.append(("compose:in", "pop", co + POP, 0))
    t0 = cue_f(B["composeType"])
    ev += [(f"compose:key:{i}", "key", t0 + 2 * i, i) for i in range(len(COPY["wire"]["brand"]))]
    ev.append(("compose:send", "key.return", cue_f(B["composeSend"]) + 1, 0))
    # the visto: Joaquín vanishes in a puff of smoke (its peak on the cloud's fullest frame), then the ticks turn blue on
    # the wall over the empty chair with a dry knock (Joaquín's asks: "un sonidito el clavado", "que se escuche el puff")
    ev.append(("visto:puff", "puff", cue_f(B["puff"]) + 5, 0))
    q7 = next(m for m in CUES["msgs"] if m["id"] == "q7")
    ev.append(("visto:tock", "tock", cue_f(q7["ticksBlue"]) + 1, 0))
    # the joins: a soft whoosh on every cut between takes, none into the visto (the knock owns it) or the end card
    for p in PIECES[1:]:
        if p["beat"] not in ("VISTO", "END"):
            ev.append((f"join:{p['id']}", "whoosh.short", p["f0"] + 1, 0))
    return sorted(ev, key=lambda e: e[2])


KIND = {"land": "land", "land.big": "land", "key": "key", "key.return": "key", "pop": "pop", "tag": "pop", "chip": "pop",
        "whoosh.short": "whoosh", "swish": "whoosh", "exit": "whoosh", "hit": "hit", "ding.wa": "click", "send": "pop",
        "text": "whoosh", "text.long": "whoosh", "tick": "tick", "tock": "tock", "puff": "whoosh"}


def rms_db(x, win=0.05, hop=0.01):
    """RMS in dBFS per window (mono sum)"""
    m = x.mean(axis=1) if x.ndim == 2 else x
    w, h = int(win * SR), int(hop * SR)
    if len(m) < w:
        return np.array([20 * np.log10(np.sqrt(np.mean(m ** 2)) + 1e-9)])
    n = (len(m) - w) // h + 1
    idx = np.arange(w)[None, :] + h * np.arange(n)[:, None]
    return 20 * np.log10(np.sqrt(np.mean(m[idx] ** 2, axis=1)) + 1e-9)


def speech_level(v):
    """Joaquín's median 50 ms level over the spoken pieces (the appended clips left out)"""
    parts = []
    for p in PIECES:
        if p["beat"] in ("VISTO", "END"):
            continue
        a, b = int(p["f0"] / FPS * SR), int(p["f1"] / FPS * SR)
        parts.append(v[a:b])
    d = rms_db(np.concatenate(parts))
    top = np.percentile(d, 97)
    return float(np.median(d[d > top - 20]))


def take_for(role, pick):
    return role["takes"][pick % len(role["takes"])]


def main():
    os.makedirs(OUT, exist_ok=True)
    lock = kit.render(os.path.join(ROOT, "audio/kit.json"), KIT)
    v, sr = sf.read(os.path.join(WORK, "mix.wav"), always_2d=True)
    assert sr == SR, sr
    if v.shape[1] == 1:
        v = np.repeat(v, 2, axis=1)
    v = v[:N] if len(v) >= N else np.vstack([v, np.zeros((N - len(v), 2))])
    ref = speech_level(v)
    print(f"Joaquín's speech, median 50 ms: {ref:.1f} dBFS")
    sfx = np.zeros((N + SR, 2))
    placed = []
    for eid, rname, vf, pick, *rel in events():
        role = lock["roles"][rname]
        take = take_for(role, pick)
        y, sr2 = sf.read(os.path.join(KIT, take["file"]), always_2d=True)
        assert sr2 == SR
        if y.shape[1] == 1:
            y = np.repeat(y, 2, axis=1)
        if rname in HIGHPASS:
            y = signal.sosfilt(signal.butter(4, HIGHPASS[rname], "highpass", fs=SR, output="sos"), y, axis=0)
        want = ref + (rel[0] if rel else REL[rname])
        g = round(want - float(rms_db(y).max()), 2)
        t0 = kit.place(take, role, vf / FPS)
        i0 = int(round(t0 * SR))
        if i0 < 0:
            y, i0 = y[-i0:], 0
        sfx[i0:i0 + len(y)] += y * 10 ** (g / 20)
        placed.append({"id": eid, "role": rname, "file": take["file"], "visual_s": round(vf / FPS, 4), "file_start_s": t0, "gain_db": g})
    sfx = sfx[:N]
    meter = pyln.Meter(SR)
    raw = v + sfx
    lufs0 = meter.integrated_loudness(raw)
    k = 10 ** ((TARGET_LUFS - lufs0) / 20)
    mix = fx.limit(raw * k, ceiling_db=CEILING_DBTP)
    lufs, tp = meter.integrated_loudness(mix), true_peak_dbtp(mix)
    sf.write(os.path.join(OUT, "voice.wav"), (v * k).astype(np.float32), SR, subtype="PCM_24")
    sf.write(os.path.join(OUT, "sfx.wav"), (sfx * k).astype(np.float32), SR, subtype="PCM_24")
    sf.write(os.path.join(OUT, "mix.wav"), mix.astype(np.float32), SR, subtype="PCM_24")
    json.dump({"fps": FPS, "total": TH["frames"], "events": [{"f": round(p["visual_s"] * FPS, 3), "kind": KIND[p["role"]], "id": p["id"]} for p in placed]},
              open(os.path.join(OUT, "cues_earshot.json"), "w"), indent=1)
    json.dump({"speech_db": round(ref, 2), "lufs_before": round(lufs0, 2), "lufs": round(lufs, 2), "true_peak": round(float(tp), 2), "placed": placed},
              open(os.path.join(OUT, "mix.json"), "w"), indent=1)
    print(f"{len(placed)} effects; {lufs0:.1f} -> {lufs:.1f} LUFS, true peak {tp:.1f} dBTP")
    out_mp4 = os.path.join(ROOT, "out/an-01-hablado.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(ROOT, "out/th/picture.mp4"), "-i", os.path.join(OUT, "mix.wav"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    # aac_at puts 2112 priming samples first; with no edit list (Meta) players play them: trim, or every sound is 44 ms late
                    "-af", "atrim=start_sample=2112",
                    "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0",
                    "-c:a", "aac_at", "-b:a", "320k", "-ar", str(SR), "-use_editlist", "0", "-movflags", "+faststart+negative_cts_offsets", "-shortest", out_mp4], check=True)
    print(out_mp4)


if __name__ == "__main__":
    sys.exit(main())
