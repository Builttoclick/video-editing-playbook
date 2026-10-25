"""Final masters of the VSL, exactly as the approved preview, in HD and in native 4K.

    python3 tools/export.py hd    -> EXPORT/VSL-V2-1080x1920.mp4   overlays from out/ENTREGA (1080, already composited)
    python3 tools/export.py 4k    -> EXPORT/VSL-V2-2160x3840.mp4   raw 4K footage + overlays rendered at 4K
                                     (out/layers4k, `node tools/render.mjs video4k ...`) composited here with Joaquín's
                                     silhouette (the 1080 masks, scaled up)

Footage cut like VSL ARMADO (every visible piece of every part, P8a's two included), Joaquín's captions in Joaquín's style
(Poppins Bold, -1 spacing, no outline; 128 px at HD, 256 px at 4K), and the audio Joaquín approved on 24-oct: the DJI MAIN
wav per piece, concatenated, loudnorm I=-14 TP=-1.5 LRA=11 (dynamic). Colour: the raw is BT.709 limited; both the
decode and the encode say so explicitly and the file is tagged BT.709 (the preview was untagged).
Pieces render in parallel as MPEG-TS segments with identical x264 settings, then concat by stream copy.
"""
import json
import subprocess
import sys
from multiprocessing import Pool
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MEDIA = Path.home() / "Movies/VSL-MEDIA"   # your footage: RAW/<take>.MOV and AUDIO/<mic>-MAIN.wav (CapCut Mac reads ~/Movies)
RAW = MEDIA / "RAW/IMG_6245.MOV"
WAV = MEDIA / "AUDIO/DJI-MAC-20261020-202654-MAIN.wav"
PARTS = json.loads((ROOT / "src/data/parts.json").read_text())
LAYERS4K = json.loads((ROOT / "out/layers4k/ranges.json").read_text()) if (ROOT / "out/layers4k/ranges.json").exists() else {}
FPS = 30
RES = sys.argv[1] if len(sys.argv) > 1 else "hd"
K = 1 if RES == "hd" else 2
W, H = 1080 * K, 1920 * K
OUT = ROOT / "EXPORT" / f"VSL-V2-{W}x{H}.mp4"
SEG = ROOT / f"EXPORT/_seg_{RES}"
X264 = (["-preset", "slow", "-crf", "16", "-profile:v", "high", "-level:v", "4.2"] if K == 1
        else ["-preset", "medium", "-crf", "17", "-profile:v", "high", "-level:v", "5.2"])
TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
CAP_PX, CAP_TRACK, CAP_Y = 128 * K, -0.05, 1497.6 * K
BAND = 260 * K


def font():
    return ImageFont.truetype(str(Path.home() / "Library/Fonts/Poppins-Bold.otf"), CAP_PX)


def word_at(p, t):
    ws = p["words"]
    for i, w in enumerate(ws):
        nxt = ws[i + 1]["t0"] if i + 1 < len(ws) else w["t1"] + 0.3
        end = nxt if nxt - w["t1"] < 0.6 else w["t1"] + 0.25
        if w["t0"] <= t < end:
            return w["w"], t - w["t0"]
    return None, 0


def caption(F, word, age):
    if not word:
        return None
    s = min(1.0, 0.82 + age / 0.09 * 0.18)
    img = Image.new("RGBA", (W, BAND), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    track = CAP_TRACK * CAP_PX
    widths = [F.getlength(ch) for ch in word]
    x = (W - (sum(widths) + track * (len(word) - 1))) / 2
    for ch, cw in zip(word, widths):
        d.text((x, BAND / 2), ch, font=F, fill=(255, 255, 255, 255), anchor="lm")
        x += cw + track
    if s < 1:
        nw, nh = int(W * s), int(BAND * s)
        small = img.resize((nw, nh), Image.LANCZOS)
        img = Image.new("RGBA", (W, BAND), (0, 0, 0, 0))
        img.paste(small, ((W - nw) // 2, (BAND - nh) // 2))
    return np.asarray(img).astype(np.float32) / 255.0


def person4k(pid, f):
    m = cv2.imread(str(ROOT / f"cache/masks/{pid}/f_{f + 1:05d}.png"), cv2.IMREAD_GRAYSCALE)
    if m is None:
        return np.zeros((H, W), np.float32)
    m = cv2.resize(m, (W, H), interpolation=cv2.INTER_CUBIC)
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)), iterations=1)
    m = cv2.GaussianBlur(m, (0, 0), 2.6)
    return m.astype(np.float32) / 255.0


def reader(args):
    return subprocess.Popen(["ffmpeg", "-v", "error"] + args + ["-f", "rawvideo", "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)


def piece(job):
    k, pid, w0, w1 = job
    p = next(q for q in PARTS if q["id"] == pid)
    F = font()
    n = round((w1 - w0) * FPS)
    f0 = round(w0 * FPS)
    scale = "scale=1080:1920:flags=lanczos:in_color_matrix=bt709:in_range=tv" if K == 1 else "scale=in_color_matrix=bt709:in_range=tv"
    bg = reader(["-ss", f"{p['raw_start'] + w0:.4f}", "-i", str(RAW), "-frames:v", str(n), "-vf", f"fps=30,{scale}"])
    if K == 1:
        ov = reader(["-ss", f"{w0:.4f}", "-i", str(ROOT / f"out/ENTREGA/{pid}.mov"), "-frames:v", str(n)])
        lb = lf = None
    else:
        a = LAYERS4K[pid]["from"]
        ov = None
        off = f"{(f0 - a) / FPS:.4f}"  # layer time 0 = compound frame a (rendered range); ProRes seeks frame-exact
        lb = reader(["-ss", off, "-i", str(ROOT / f"out/layers4k/{pid}-back.mov"), "-frames:v", str(n)]) if LAYERS4K[pid].get("back") else None
        lf = reader(["-ss", off, "-i", str(ROOT / f"out/layers4k/{pid}-front.mov"), "-frames:v", str(n)]) if LAYERS4K[pid].get("front") else None
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", *X264, *TAGS,
                            "-f", "mpegts", str(SEG / f"{k:02d}.ts")], stdin=subprocess.PIPE)
    sz3, sz4 = W * H * 3, W * H * 4
    last = None
    for i in range(n):
        b = bg.stdout.read(sz4)
        if len(b) < sz4:
            b = last
        last = b
        frame = np.frombuffer(b, np.uint8).reshape(H, W, 4)[..., :3].astype(np.float32) / 255.0
        if K == 1:
            o = ov.stdout.read(sz4)
            if len(o) == sz4:
                oa = np.frombuffer(o, np.uint8).reshape(H, W, 4).astype(np.float32) / 255.0
                frame = frame * (1 - oa[..., 3:4]) + oa[..., :3] * oa[..., 3:4]
        else:
            zero = np.zeros((H, W, 4), np.float32)
            bk = np.frombuffer(lb.stdout.read(sz4), np.uint8).reshape(H, W, 4).astype(np.float32) / 255.0 if lb else zero
            fr = np.frombuffer(lf.stdout.read(sz4), np.uint8).reshape(H, W, 4).astype(np.float32) / 255.0 if lf else zero
            if lb is not None:
                bk = bk.copy()
                bk[..., 3] *= 1.0 - person4k(pid, f0 + i)
            # front over back over footage
            frame = frame * (1 - bk[..., 3:4]) + bk[..., :3] * bk[..., 3:4]
            frame = frame * (1 - fr[..., 3:4]) + fr[..., :3] * fr[..., 3:4]
        word, age = word_at(p, w0 + i / FPS)
        cap = caption(F, word, age)
        if cap is not None:
            y0 = int(round(CAP_Y)) - BAND // 2
            reg = frame[y0:y0 + BAND]
            frame[y0:y0 + BAND] = reg * (1 - cap[..., 3:4]) + cap[..., :3] * cap[..., 3:4]
        enc.stdin.write((frame * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())
    enc.stdin.close()
    enc.wait()
    for r in (bg, ov, lb, lf):
        if r:
            r.stdout.close()
            r.wait()
    return k, pid, n


def main():
    SEG.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    jobs = []
    for p in PARTS:
        for sg in p.get("segs", [{"win": p["win"]}]):
            jobs.append((len(jobs), p["id"], sg["win"][0], sg["win"][1]))
    with Pool(4 if K == 1 else 3) as pool:
        for k, pid, n in pool.imap_unordered(piece, jobs):
            print(f"{RES} piece {k:02d} {pid}: {n} frames", flush=True)
    total = 0
    wavs = []
    for k, pid, w0, w1 in jobs:
        p = next(q for q in PARTS if q["id"] == pid)
        n = round((w1 - w0) * FPS)
        total += n
        seg = SEG / f"a_{k:02d}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{p['wav_start'] + w0:.4f}", "-i", str(WAV), "-t", f"{n / FPS:.4f}",
                        "-ac", "2", "-ar", "48000", str(seg)], check=True)
        wavs.append(seg)
    (SEG / "audio.txt").write_text("".join(f"file '{w}'\n" for w in wavs))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(SEG / "audio.txt"),
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", str(SEG / "audio.wav")], check=True)
    # exact duration per piece: without it the concat demuxer squeezes the timestamps at the joins (0.47 s over the 4K
    # master on 24-oct, picture ahead of the voice by the end); with it every frame sits on i/30
    (SEG / "video.txt").write_text("".join(f"file '{SEG / f'{k:02d}.ts'}'\nduration {round((w1 - w0) * FPS) / FPS:.6f}\n"
                                           for k, pid, w0, w1 in jobs))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(SEG / "video.txt"), "-i", str(SEG / "audio.wav"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0",
                    "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart",
                    str(OUT)], check=True)
    print("wrote", OUT, total, "frames")


if __name__ == "__main__":
    main()
