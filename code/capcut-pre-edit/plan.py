"""Resolve every take of the V7 selection to words, cut points on the DJI waveform, a frame-aligned span of the RAW file
with handles, and a local sync offset (DJI = movie + off) measured on that span. No clip files: the compounds reference
the raw MOVs plus the DJI wav directly.

usage: python plan.py [takes module, default takes_example]  ->  edit/plan.json + a printed table to review
"""
import importlib, json, math, re, sys, unicodedata
import numpy as np
from common import VIDEOS, EDIT, SCRATCH, SR, envelope, xcorr

sel = importlib.import_module(sys.argv[1] if len(sys.argv) > 1 else "takes_example")
HANDLE = 1.5                     # seconds of air inside the compound on each side of the words
PAD_IN, PAD_OUT = 0.04, 0.08     # the tight cut on the timeline
FPS = 30

sync = json.loads((EDIT / "sync.json").read_text(encoding="utf-8"))
dji = np.load(SCRATCH / "dji_main_16k.npy", mmap_mode="r")
DJI_ENV = envelope(np.asarray(dji))
TR = {n: json.loads((EDIT / "transcripts" / f"{n}.json").read_text(encoding="utf-8")) for n in VIDEOS}
DUR = {n: sync[n]["dur"] for n in VIDEOS}


def norm(t):
    t = unicodedata.normalize("NFC", t.lower())
    return re.sub(r"[¿?¡!.,;:\"'…“”()\-\u2014%]", "", t).strip()


def words_of(name):
    return [w for w in TR[name]["words"] if w["type"] == "word"]


def find(ws, anchor, lo_pos, hi_pos, which):
    a = anchor.split()
    hits = [p for p in range(lo_pos, hi_pos - len(a) + 2) if [norm(ws[p + k]["text"]) for k in range(len(a))] == a]
    if not hits:
        return None
    return hits[-1] if which == "last" else hits[0]


def rms_db(t0, t1, sr=SR, win=0.010):
    i0, i1 = max(0, int(t0 * sr)), min(len(dji), int(t1 * sr))
    x = np.asarray(dji[i0:i1], dtype=np.float64)
    hop, w = sr // 1000, int(win * sr)
    n = max(0, (len(x) - w) // hop)
    if n == 0:
        return np.array([]), t0
    c = np.concatenate([[0], np.cumsum(x * x)])
    e = (c[np.arange(n) * hop + w] - c[np.arange(n) * hop]) / w
    return 10 * np.log10(e + 1e-12), i0 / sr + win / 2


def refine(off, s0, e_first, s_last, e1, prev_end, next_start, words):
    """Onset/offset of the phrase in MOVIE time from the DJI waveform, bounded by the neighbour words (thresholds hang
    from the speech level inside the words; the DJI gate puts pauses at -80 to -100 dB)."""
    db, base = rms_db(s0 + off - 2.5, e1 + off + 2.5)
    if len(db) == 0:
        return s0, e1, "no audio"
    t = base + np.arange(len(db)) / 1000 - off
    inw = np.zeros(len(db), bool)
    for w in words:
        inw |= (t >= w["start"]) & (t <= w["end"])
    level = np.percentile(db[inw], 95) if inw.any() else np.percentile(db, 95)
    on_thr, off_thr = level - 25, level - 32
    lo = s0 - 0.30 if prev_end is None else max(s0 - 0.30, prev_end + 0.01)
    hi = max(e_first, s0 + 0.15)
    m = np.where((t >= lo) & (t <= hi))[0]
    onset, flag = s0, ""
    for k in m[1:]:
        if db[k - 1] < on_thr <= db[k] and db[k:k + 40].mean() >= on_thr:
            j = k
            while j > m[0] and db[j - 1] > on_thr - 15 and k - j < 80:
                j -= 1
            onset = t[j]
            break
    else:
        flag += " onset?"
    lo2 = s_last
    hi2 = e1 + 0.35 if next_start is None else min(e1 + 0.35, next_start - 0.01)
    m2 = np.where((t >= lo2) & (t <= hi2))[0]
    offset = e1
    for k in m2[::-1][1:]:
        if db[k] >= off_thr > db[k + 1] and db[max(0, k - 40):k].mean() >= off_thr:
            offset = t[k] + 0.01
            break
    else:
        flag += " offset?"
    if onset - s0 > 0.40:
        flag += f" onset+{onset - s0:.2f}"
    if e1 - offset > 0.40:
        flag += f" offset-{e1 - offset:.2f}"
    return float(onset), float(offset), flag.strip()


def local_offset(name, a, b):
    """DJI = movie + off, measured on the phone audio of [a, b] against the DJI envelope (±60 ms around the coarse lag)."""
    s = sync[name]
    a0 = s["audio_start"]
    ph = np.load(SCRATCH / f"{name}_phone_16k.npy", mmap_mode="r")
    i0, i1 = max(0, int((a - a0) * SR)), min(len(ph), int((b - a0) * SR))
    ep = envelope(np.asarray(ph[i0:i1]))
    start_ms = i0 // (SR // 1000)
    c = s["coarse_lag_ms"] + start_ms
    lag, q = xcorr(DJI_ENV, ep, int(c - 60), int(c + 60))
    lag -= start_ms
    return lag / 1000 - a0, q


def fr_floor(t): return math.floor(t * FPS + 1e-6) / FPS
def fr_ceil(t): return math.ceil(t * FPS - 1e-6) / FPS


plan = []
for piece, label, takes in sel.PIECES:
    for ti, (name, lo, hi, sa, ea, opt) in enumerate(takes, 1):
        allw = TR[name]["words"]
        ws = words_of(name)
        lo_pos = min(p for p, w in enumerate(ws) if w["i"] >= lo)
        hi_pos = max(p for p, w in enumerate(ws) if w["i"] <= hi)
        p0 = find(ws, sa, lo_pos, hi_pos, opt.get("start"))
        assert p0 is not None, (piece, ti, name, sa)
        p1 = find(ws, ea, p0, hi_pos, opt.get("end"))
        assert p1 is not None, (piece, ti, name, ea)
        p1 += len(ea.split()) - 1 + opt.get("plus", 0)
        tw = ws[p0:p1 + 1]
        s0, e1 = tw[0]["start"], tw[-1]["end"]
        prev_end = ws[p0 - 1]["end"] if p0 > 0 and ws[p0 - 1]["end"] > s0 - 1.0 else None
        next_start = ws[p1 + 1]["start"] if p1 + 1 < len(ws) and ws[p1 + 1]["start"] < e1 + 1.0 else None
        off_c = sync[name]["coarse_lag_ms"] / 1000 - sync[name]["audio_start"]
        onset, offset, flag = refine(off_c, s0, tw[0]["end"], tw[-1]["start"], e1, prev_end, next_start, tw)
        if "offset?" in flag:                      # no falling crossing found: Scribe ends words early, give the tail 120 ms more
            offset = e1 + 0.12
        a = (s0 if "onset?" in flag else onset) - HANDLE
        b = offset + HANDLE
        kstart = max(0.0, fr_floor(a))
        kend = min(fr_floor(DUR[name]), fr_ceil(b))
        dur = kend - kstart
        off, q = local_offset(name, kstart, kstart + dur)
        ev = [(w["text"], round(w["start"] - e1, 2) if w["start"] > e1 else round(w["start"] - s0, 2))
              for w in allw if w["type"] == "audio_event" and kstart <= w["start"] <= kstart + dur]
        cap_words = [{"t": w["text"], "s": round(w["start"] - kstart, 3), "e": round(w["end"] - kstart, 3)} for w in tw]
        plan.append({
            "piece": piece, "label": label, "take": ti, "n_takes": len(takes), "video": name, "note": opt.get("note", ""),
            "text": " ".join(w["text"] for w in tw), "w0": tw[0]["i"], "w1": tw[-1]["i"],
            "scribe_s": s0, "scribe_e": e1, "onset": onset, "offset": offset, "flag": flag,
            "k_start": round(kstart, 6), "dur": round(dur, 6),
            "in": round(onset - PAD_IN - kstart, 3), "out": round(offset + PAD_OUT - kstart, 3),
            "off": off, "off_coarse": off_c, "sync_q": q, "events": ev, "words": cap_words,
        })

picks = getattr(sel, "PICK", {})
for p in plan:
    p["pick"] = p["take"] == picks.get(p["piece"], p["n_takes"])
    p["file"] = f"{p['piece']}_t{p['take']}"

(EDIT / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
tot = sum(p["dur"] for p in plan)
print(f"{len(plan)} takes, {tot:.0f} s inside the compounds")
for p in plan:
    print(f"{p['file']:12s}{'*' if p['pick'] else ' '} {p['video']} {p['k_start']:8.3f}+{p['dur']:6.3f}  words {p['onset'] - p['k_start']:5.2f}-{p['offset'] - p['k_start']:6.2f}"
          f"  on {p['onset'] - p['scribe_s']:+.2f} off {p['offset'] - p['scribe_e']:+.2f}  sync {(p['off'] - p['off_coarse']) * 1000:+6.1f}ms q{p['sync_q']:4.1f}"
          f"  {p['flag']:10s} {p['events'] if p['events'] else ''}  | {p['text'][:60]}")
