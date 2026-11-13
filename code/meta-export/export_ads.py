"""The 37 V7 ads, finished, in code (the VSL route): every piece rendered once on Joaquín's trim, at Joaquín's volume, with its
overlay and Joaquín's captions; then each ad joined frame-exact, with Joaquín's V6 transition at the hook -> body and body ->
closer joins ("Pull in" 0.333 s + the CapCut "Woosh" at 63 %, starting half a transition before the cut). Body-internal
cuts stay hard: the overlays carry across them. BT.709 in and out, peak limit -1 dBFS, no loudness normalization.

    python3 tools/export_ads.py pieces          -> out/_pieces/<id>.mov (ProRes 4444) + <id>.f32 (Joaquín's audio), 24 pieces
    python3 tools/export_ads.py ads [names...]  -> ../EXPORTADOS/<name>.mp4 (all 37 by default, 3 at a time) + INDEX.md
    python3 tools/export_ads.py check           -> frames, pts on i/30, durations, loudness of every export
    python3 tools/export_ads.py list            -> the 37 names and their pieces

The pairing rules are the ones of ../AD-MATRIX-V7.md (each hook with the body it was written for; the price said once;
"14 días" said once; C-WA2 never after B). B1's out-point is extended to 11.50 s like the previews (Joaquín's trim cut "página").
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from preview import CAP_Y, BAND, MEDIA, PARTS, WAV, caption, window, word_at  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PIECES = ROOT / "out/_pieces"
OUT = ROOT.parent / "EXPORTADOS"
W, H, FPS, SR = 1080, 1920, 30, 48000
TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
WOOSH = Path(os.environ.get("WOOSH_FILE", ROOT / "sfx/woosh.wav"))  # any short whoosh (ours came from CapCut's library)
WOOSH_GAIN = 0.634  # Joaquín's level on V6-01 (63 %)
TR_FRAMES = 5  # each side of the cut: 5 + 5 frames = 0.333 s

BODIES = {"Acorto": ["A-corto"], "Alargo": ["AL1", "AL2", "AL3", "AL4"], "B": ["B1", "B2", "B3", "B4"]}
PRICE_HOOKS = {"H1", "H2", "H3", "H4", "H10"}
PAIRS = [("H1", "Acorto", "01"), ("H7", "Acorto", "05"), ("H12", "Acorto", "12"),
         ("H3", "Alargo", "03"), ("H11", "Alargo", "11"), ("H13", "Alargo", "13"),
         ("H5", "Alargo", "06"), ("H6", "Alargo", "07"), ("H10", "Alargo", "10"),
         ("H2", "B", "02"), ("H4", "B", "08")]
CTAS = [("C-WA1", "WA1"), ("C-WA2", "WA2"), ("C-VIDEO", "VID"), ("C-PRECIO", "PRE")]


def allowed(h, b, c):
    if c == "C-PRECIO" and (h in PRICE_HOOKS or b == "B"):
        return False
    if c == "C-WA2" and b == "B":
        return False
    return True


def ads():
    out = []
    for h, b, num in PAIRS:
        for c, tag in CTAS:
            if allowed(h, b, c):
                out.append((f"V7-{num}-{tag}_{h}+{b}+{c.replace('-', '')}", [h] + BODIES[b] + [c], b))
    return out


# ----------------------------------------------------------------------------------------------------------- pieces

def render_piece(pid):
    p = PARTS[pid]
    w0, w1 = window(p)
    n = round((w1 - w0) * FPS)
    PIECES.mkdir(parents=True, exist_ok=True)
    bg = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{p['raw_start'] + w0:.4f}", "-i", str(MEDIA / "RAW" / p["raw"]), "-frames:v", str(n),
                           "-vf", "fps=30,scale=1080:1920:flags=lanczos:in_color_matrix=bt709:in_range=tv", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                          stdout=subprocess.PIPE)
    ov = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{w0:.4f}", "-i", str(ROOT / f"out/ENTREGA/{pid}.mov"), "-frames:v", str(n),
                           "-f", "rawvideo", "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv444p10le", "-c:v", "prores_ks", "-profile:v", "4",
                            *TAGS, str(PIECES / f"{pid}.mov")], stdin=subprocess.PIPE)
    last = None
    for i in range(n):
        b = bg.stdout.read(W * H * 3)
        o = ov.stdout.read(W * H * 4)
        if len(b) < W * H * 3:
            b = last
        last = b
        frame = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0
        if len(o) == W * H * 4:
            oa = np.frombuffer(o, np.uint8).reshape(H, W, 4).astype(np.float32) / 255.0
            frame = frame * (1 - oa[..., 3:4]) + oa[..., :3] * oa[..., 3:4]
        word, age = word_at(p, w0 + i / FPS)
        cap = caption(word, age)
        if cap is not None:
            y0 = int(round(CAP_Y)) - BAND // 2
            reg = frame[y0:y0 + BAND]
            frame[y0:y0 + BAND] = reg * (1 - cap[..., 3:4]) + cap[..., :3] * cap[..., 3:4]
        enc.stdin.write((frame * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())
    enc.stdin.close()
    enc.wait()
    for r in (bg, ov):
        r.stdout.close()
        r.wait()
    # Joaquín's audio for the piece: DJI MAIN x Joaquín's CapCut volume, float, exactly n frames long, 4 ms fades at the ends
    ns = n * SR // FPS
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{p['wav_start'] + w0:.5f}", "-i", str(WAV), "-t", f"{ns / SR + 0.05:.5f}",
                          "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2)[:ns].copy()
    if len(a) < ns:
        a = np.vstack([a, np.zeros((ns - len(a), 2), np.float32)])
    a *= float(p["gain"])
    f = int(0.004 * SR)
    ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
    a[:f] *= ramp
    a[-f:] *= ramp[::-1]
    (PIECES / f"{pid}.f32").write_bytes(a.astype(np.float32).tobytes())
    return pid, n


# -------------------------------------------------------------------------------------------------------------- ads

def zoom(frame, s, blur):
    """Scale the frame by s about its centre (a camera pushing in), with a short zoom blur."""
    out = np.zeros_like(frame, dtype=np.float32)
    taps = [0.0, 0.025, 0.05, 0.075] if blur > 0.05 else [0.0]
    for d in taps:
        k = s * (1 + d * blur)
        M = np.float32([[k, 0, (1 - k) * W / 2], [0, k, (1 - k) * H / 2]])
        out += cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return (out / len(taps)).clip(0, 255).astype(np.uint8)


def ease_in(x):
    return x * x


def frames_of(pid):
    """Joaquín's piece, frame by frame (rgb24), from the ProRes intermediate."""
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(PIECES / f"{pid}.mov"), "-vf", "scale=in_color_matrix=bt709:in_range=tv",
                           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    while True:
        b = pr.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
    pr.stdout.close()
    pr.wait()


def piece_frames(pid):
    p = PARTS[pid]
    w0, w1 = window(p)
    return round((w1 - w0) * FPS)


def export_ad(job):
    name, pieces, body = job
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = PIECES / f"_ad_{name}"
    tmp.mkdir(parents=True, exist_ok=True)
    joins = {1, len(pieces) - 1}  # index of the piece that starts after a transition: the body's first, the closer
    counts = [piece_frames(q) for q in pieces]
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            # setparams: ffmpeg 9 takes the VUI from the frames, so -color_trc/-color_primaries alone came out "unknown"
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,"
                                   "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv", "-c:v", "libx264", "-preset", "medium",
                            "-crf", "17", "-profile:v", "high", "-level:v", "4.2", *TAGS, "-an", str(tmp / "video.mp4")], stdin=subprocess.PIPE)
    for k, pid in enumerate(pieces):
        n = counts[k]
        tail = (k + 1) in joins  # this piece ends at a transition
        head = k in joins  # this piece starts after one
        for i, fr in enumerate(frames_of(pid)):
            if i >= n:
                break
            if tail and i >= n - TR_FRAMES:
                x = (i - (n - TR_FRAMES) + 1) / TR_FRAMES  # 0.2 .. 1.0 into the cut
                fr = zoom(fr, 1 + 0.22 * ease_in(x), x)
            elif head and i < TR_FRAMES:
                x = 1 - (i + 1) / TR_FRAMES  # 0.8 .. 0.0 out of the cut
                fr = zoom(fr, 1 + 0.22 * ease_in(x), x)
            enc.stdin.write(np.ascontiguousarray(fr).tobytes())
    enc.stdin.close()
    enc.wait()
    # audio: the pieces joined sample-exact, the woosh at each transition, a peak limiter only
    a = np.concatenate([np.frombuffer((PIECES / f"{q}.f32").read_bytes(), np.float32).reshape(-1, 2) for q in pieces])
    woosh = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(WOOSH), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                                         capture_output=True, check=True).stdout, np.float32).reshape(-1, 2) * WOOSH_GAIN
    starts = np.cumsum([0] + counts)
    for j in joins:
        at = int(starts[j] * SR // FPS - TR_FRAMES * SR // FPS)  # cut minus half the transition
        end = min(len(a), at + len(woosh))
        a[at:end] += woosh[: end - at]
    (tmp / "audio.f32").write_bytes(a.astype(np.float32).tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(tmp / "audio.f32"),
                    "-af", "alimiter=limit=0.891:attack=3:release=60:level=false", "-c:a", "pcm_s24le", str(tmp / "audio.wav")], check=True)
    out = OUT / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "video.mp4"), "-i", str(tmp / "audio.wav"), "-map", "0:v", "-map", "1:a",
                    # Meta's Ads Guide: no edit lists; negative CTS offsets keep frame 0 at t=0 without one (2-nov-2026)
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-use_editlist", "0",
                    "-movflags", "+faststart+negative_cts_offsets", str(out)], check=True)
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()
    return name, sum(counts)


def check():
    rows = []
    for name, pieces, body in ads():
        f = OUT / f"{name}.mp4"
        if not f.exists():
            rows.append((name, "MISSING"))
            continue
        want = sum(piece_frames(q) for q in pieces)
        pts = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "frame=pts_time", "-of", "csv=p=0", str(f)],
                             capture_output=True, text=True).stdout.split()
        pts = [x.strip(",") for x in pts if x.strip(",")]
        dev = max(abs(float(x) - i / FPS) for i, x in enumerate(pts)) if pts else 9
        dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "csv=p=0", str(f)],
                             capture_output=True, text=True).stdout.split()
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(f), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        summ = r[r.rfind("Summary:"):]
        i_ = next((l.split()[1] for l in summ.splitlines() if l.strip().startswith("I:")), "?")
        tp = next((l.split()[1] for l in summ.splitlines() if l.strip().startswith("Peak:")), "?")
        ok = len(pts) == want and dev < 0.001
        rows.append((name, f"{'ok ' if ok else 'BAD'} {len(pts)}/{want} frames, pts dev {dev * 1000:.1f} ms, {' '.join(dur)}, {i_} LUFS, peak {tp}"))
    for r in rows:
        print(*r)
    return rows


def index():
    lines = ["# V7 ads, exported 26-oct-2026", "",
             "37 ads, 9:16, 1080x1920, 30 fps, H.264 + AAC, BT.709. Made by `tools/export_ads.py` from Joaquín's picks",
             "(`PICKS-V7.md`), Joaquín's trims and volumes in the CapCut project, the coded overlays, Joaquín's captions. The pairs follow",
             "`AD-MATRIX-V7.md`. Transitions (Pull in + woosh) at hook -> body and body -> closer.", "",
             "| Ad | Pieces | Seconds |", "|---|---|---|"]
    for name, pieces, body in ads():
        lines.append(f"| `{name}.mp4` | {' + '.join(pieces)} | {sum(piece_frames(q) for q in pieces) / FPS:.1f} |")
    (OUT / "INDEX.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "list"
    if mode == "list":
        for name, pieces, body in ads():
            print(name, pieces)
        print(len(ads()), "ads")
    elif mode == "pieces":
        ids = sys.argv[2:] or list(PARTS)
        with Pool(4) as pool:
            for pid, n in pool.imap_unordered(render_piece, ids):
                print(f"piece {pid}: {n} frames", flush=True)
    elif mode == "ads":
        want = set(sys.argv[2:])
        jobs = [j for j in ads() if not want or j[0] in want]
        with Pool(3) as pool:
            for name, n in pool.imap_unordered(export_ad, jobs):
                print(f"ad {name}: {n} frames", flush=True)
        index()
    elif mode == "check":
        check()
