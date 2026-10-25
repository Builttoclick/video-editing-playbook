"""Shared paths and helpers for the pre-clipping flow (phone video + external DJI audio -> take clips -> CapCut).

Edit the CONFIG block for each shoot: the project folder, the external mic recording and the phone takes.
"""
import json, os, subprocess
from pathlib import Path
import numpy as np

FFMPEG, FFPROBE = "ffmpeg", "ffprobe"                      # Homebrew ffmpeg 9 on PATH

# ---- CONFIG -------------------------------------------------------------------------------------------------
PROJ = Path(os.environ.get("PRECUT_PROJECT", Path.home() / "Movies/SHOOTS/my-shoot"))   # RAW/, AUDIO/, edit/ live here
RAW = PROJ / "RAW"
DJI = RAW / "DJI-MAC-20261020-202654.wav"                   # the external mic file (left = main channel)
DJI_START_UTC = "2026-10-20T23:26:54"                       # when that recording started, UTC (the file name says it)
EDIT = PROJ / "edit"
CLIPS = PROJ / "CLIPS"
SCRATCH = Path(os.environ.get("PRECUT_SCRATCH") or Path.home() / "Library/Caches/precut")   # decoded audio caches
CAPCUT_DRAFTS = Path.home() / "Movies/CapCut/User Data/Projects/com.lveditor.draft"
SR = 16000  # correlation / transcription rate

# the phone files that count (RAW/<name>.MOV), in recording order
TAKE_FILES = ["IMG_6243", "IMG_6244", "IMG_6245"]
# ---- end of CONFIG ------------------------------------------------------------------------------------------
BTC = PROJ  # older scripts call the project root BTC


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed: {r.stderr.decode('utf-8', 'replace')[-800:]}")
    return r


def probe(path):
    r = run([FFPROBE, "-v", "error", "-show_entries",
             "format=duration:format_tags=creation_time:stream=index,codec_type,codec_name,start_time,duration,nb_frames,width,height",
             "-of", "json", str(path)])
    return json.loads(r.stdout)


def _guesses():
    """start of each video in DJI seconds, from creation_time (both clocks stamp the START; 1 s resolution). Cached."""
    SCRATCH.mkdir(parents=True, exist_ok=True)
    cache = SCRATCH / "guesses.json"
    if cache.exists():
        return json.loads(cache.read_text())
    from datetime import datetime
    t0 = datetime.fromisoformat(DJI_START_UTC)
    out = {}
    for n in TAKE_FILES:
        ct = probe(RAW / f"{n}.MOV")["format"]["tags"]["creation_time"][:19]
        out[n] = (datetime.fromisoformat(ct) - t0).total_seconds()
    cache.write_text(json.dumps(out))
    return out


VIDEOS = {n: {"path": RAW / f"{n}.MOV", "guess": g, "test": False} for n, g in _guesses().items()}


def audio_start(path):
    for s in probe(path)["streams"]:
        if s["codec_type"] == "audio":
            return float(s.get("start_time", 0) or 0)
    return 0.0


def decode_mono(path, sr=SR, channel=None, start=None, dur=None):
    """float32 mono samples. channel=None mixes down, 0/1 picks L/R."""
    cmd = [FFMPEG, "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.6f}"]
    cmd += ["-i", str(path)]
    if dur is not None:
        cmd += ["-t", f"{dur:.6f}"]
    cmd += ["-vn"]
    if channel is not None:
        cmd += ["-af", f"pan=mono|c0=c{channel}"]
    else:
        cmd += ["-ac", "1"]
    cmd += ["-ar", str(sr), "-f", "f32le", "-"]
    return np.frombuffer(run(cmd).stdout, dtype="<f4").copy()


def envelope(x, sr=SR, hop_ms=1):
    """log-RMS per 1 ms, slow trend removed: an onset-ish curve that correlates across mics."""
    hop = int(sr * hop_ms / 1000)
    n = len(x) // hop
    e = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-10)
    e = np.log(e + 1e-4)
    k = 400
    e = e - np.convolve(e, np.ones(k) / k, "same")
    return e.astype(np.float32)


def xcorr(ref, seg, lo, hi):
    """lag L in [lo, hi] maximising sum ref[t+L]*seg[t]. Returns (lag_float, quality)."""
    from scipy.signal import fftconvolve
    a = ref - ref.mean()
    b = seg - seg.mean()
    full = fftconvolve(a, b[::-1], mode="full")
    lags = np.arange(-(len(b) - 1), len(a))
    m = (lags >= lo) & (lags <= hi)
    c, l = full[m], lags[m]
    if len(c) < 3:
        return None, 0.0
    k = int(np.argmax(c))
    q = float((c[k] - c.mean()) / (c.std() + 1e-9))
    frac = 0.0
    if 0 < k < len(c) - 1:  # parabolic peak
        y0, y1, y2 = c[k - 1], c[k], c[k + 1]
        d = y0 - 2 * y1 + y2
        if d != 0:
            frac = 0.5 * (y0 - y2) / d
    return float(l[k] + frac), q
