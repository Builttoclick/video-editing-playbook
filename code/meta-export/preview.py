"""Preview MP4 of each body exactly as Joaquín's trims play it: the raw take per piece (CapCut's cut points from parts.json),
the DJI audio at Joaquín's own volumes (the segment volume Joaquín set in CapCut, applied as is), one-word captions in Joaquín's style, and
the finished overlays on top.

    python3 tools/preview.py                 -> every preview in PREVIEWS (the three bodies, the hook reel, the closer
                                                reel, three sample ads)
    python3 tools/preview.py B HOOKS         -> only those

Audio: DJI MAIN wav x Joaquín's gain per piece, joined sample-exact, a 4 ms fade at each join (no clicks), then only a peak
limiter at -1 dBFS so Joaquín's boosts do not clip. No loudness normalization and no noise reduction (same room as the VSL).
Colour: BT.709 in and out, tagged. Needs out/ENTREGA/<piece>.mov (tools/compose.py). Read-only on the raw media.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MEDIA = Path(os.environ.get("ADS_MEDIA", Path.home() / "Movies/ADS-MEDIA"))   # your footage: RAW/<take>.MOV and AUDIO/<mic>-MAIN.wav
WAV = MEDIA / os.environ.get("ADS_MIC", "AUDIO/DJI-MAC-20261020-202654-MAIN.wav")   # the external mic of the shoot
HOOKS = ["H11", "H12", "H7", "H1", "H2", "H3", "H13", "H4", "H5", "H6", "H10"]
CTAS = ["C-WA1", "C-WA2", "C-VIDEO", "C-PRECIO"]
A_LARGO = ["AL1", "AL2", "AL3", "AL4"]
B_BODY = ["B1", "B2", "B3", "B4"]
PREVIEWS = {
    "A-corto": ["A-corto"],
    "A-largo": A_LARGO,
    "B": B_BODY,
    "HOOKS": HOOKS,  # reels carry a small label per piece, bottom left, outside the 4:5 area
    "CTAS": CTAS,
    "V7-01-WA2_H1+Acorto+CWA2": ["H1", "A-corto", "C-WA2"],
    "V7-11-WA1_H11+Alargo+CWA1": ["H11"] + A_LARGO + ["C-WA1"],
    "V7-02-VID_H2+B+CVIDEO": ["H2"] + B_BODY + ["C-VIDEO"],
}
REELS = {"HOOKS", "CTAS"}
LABEL_FONT = ImageFont.truetype(str(Path.home() / "Library/Fonts/Poppins-Bold.otf"), 44)
# Joaquín's trims, with one exception: B1's out-point (11.233 s) cuts "página" after "pá" (the "-gina" is still loud right
# after it), so the preview lets the word finish. Joaquín's CapCut project keeps Joaquín's trim; change it there if Joaquín agrees.
WIN_OVERRIDE = {"B1": (None, 11.50)}
# Joaquín's CapCut captions (measured on the exported V6-02, 24-oct-2026): Poppins Bold, size 30 = 128 px em at 1080 wide,
# spacing -1 = -0.05 em, pure white, NO outline, line box centred at y 1497.6 (CapCut y -0.56).
CAP_PX, CAP_TRACK, CAP_Y, BAND = 128, -0.05, 1497.6, 260
FONT = ImageFont.truetype(str(Path.home() / "Library/Fonts/Poppins-Bold.otf"), CAP_PX)
W, H, FPS, SR = 1080, 1920, 30, 48000
PARTS = {p["id"]: p for p in json.loads((ROOT / "src/data/parts.json").read_text())}
TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]


def window(p):
    a, b = WIN_OVERRIDE.get(p["id"], (None, None))
    return (p["win"][0] if a is None else a), (p["win"][1] if b is None else b)


def word_at(p, t):
    """The word on screen at t, as CapCut shows Joaquín's captions: a word stays up until the next word of its caption, the
    last one until its caption ends (s1, from parts_from_capcut.py)."""
    ws = p["words"]
    for i, w in enumerate(ws):
        nxt = ws[i + 1]["t0"] if i + 1 < len(ws) else None
        end = min(nxt, w["s1"]) if nxt is not None else w["s1"]
        if w["t0"] <= t < end:
            return w["w"], t - w["t0"]
    return None, 0


def caption(word, age):
    """RGBA band (W x BAND) with the word as Joaquín's captions look: white Poppins Bold, -1 spacing, no outline, a quick pop."""
    if not word:
        return None
    s = min(1.0, 0.82 + age / 0.09 * 0.18)
    img = Image.new("RGBA", (W, BAND), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    track = CAP_TRACK * CAP_PX
    widths = [FONT.getlength(ch) for ch in word]
    x = (W - (sum(widths) + track * (len(word) - 1))) / 2
    for ch, cw in zip(word, widths):
        d.text((x, BAND / 2), ch, font=FONT, fill=(255, 255, 255, 255), anchor="lm")
        x += cw + track
    if s < 1:
        nw, nh = int(W * s), int(BAND * s)
        small = img.resize((nw, nh), Image.LANCZOS)
        img = Image.new("RGBA", (W, BAND), (0, 0, 0, 0))
        img.paste(small, ((W - nw) // 2, (BAND - nh) // 2))
    return np.asarray(img).astype(np.float32) / 255.0


def audio(p, w0, n):
    """Joaquín's audio for the piece: DJI MAIN at Joaquín's gain, float, exactly n frames long."""
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
    return a


def label(frame, text):
    """The piece id, small, bottom left (y 1840, outside what the 4:5 feed shows), so Joaquín can name what Joaquín saw."""
    img = Image.new("RGBA", (360, 70), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((0, 35), text, font=LABEL_FONT, fill=(255, 255, 255, 170), anchor="lm")
    a = np.asarray(img).astype(np.float32) / 255.0
    reg = frame[1805:1875, 40:400]
    frame[1805:1875, 40:400] = reg * (1 - a[..., 3:4]) + a[..., :3] * a[..., 3:4]


def build(body):
    ids = PREVIEWS[body]
    tmp = ROOT / "out/_preview"
    tmp.mkdir(parents=True, exist_ok=True)
    out = ROOT / f"out/PREVIEW-{body}.mp4"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
                            "-crf", "18", *TAGS, str(tmp / f"{body}-video.mp4")], stdin=subprocess.PIPE)
    sound = []
    total = 0
    for pid in ids:
        p = PARTS[pid]
        w0, w1 = window(p)
        n = round((w1 - w0) * FPS)
        bg = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{p['raw_start'] + w0:.4f}", "-i", str(MEDIA / "RAW" / p["raw"]), "-frames:v", str(n),
                               "-vf", "fps=30,scale=1080:1920:flags=lanczos:in_color_matrix=bt709:in_range=tv", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                              stdout=subprocess.PIPE)
        ov = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{w0:.4f}", "-i", str(ROOT / f"out/ENTREGA/{pid}.mov"), "-frames:v", str(n),
                               "-f", "rawvideo", "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)
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
            if body in REELS:
                label(frame, pid)
            enc.stdin.write((frame * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())
        bg.stdout.close()
        ov.stdout.close()
        bg.wait()
        ov.wait()
        sound.append(audio(p, w0, n))
        total += n
        print(f"{body}: {pid} {n} frames ({w0:.3f}-{w1:.3f} s, gain {p['gain']:.3f})", flush=True)
    enc.stdin.close()
    enc.wait()
    a = np.concatenate(sound)
    (tmp / f"{body}-audio.f32").write_bytes(a.astype(np.float32).tobytes())
    peak = 20 * np.log10(np.abs(a).max() + 1e-9)
    # Joaquín's levels as they are; only the peaks Joaquín's boosts push over -1 dBFS get limited
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(tmp / f"{body}-audio.f32"),
                    "-af", "alimiter=limit=0.891:attack=3:release=60:level=false", "-c:a", "pcm_s24le", str(tmp / f"{body}-audio.wav")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / f"{body}-video.mp4"), "-i", str(tmp / f"{body}-audio.wav"), "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    lufs = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = lufs[lufs.rfind("Summary:"):]
    i_line = next((l.strip() for l in summ.splitlines() if l.strip().startswith("I:")), "?")
    tp_line = next((l.strip() for l in summ.splitlines() if l.strip().startswith("Peak:")), "?")
    print(f"wrote {out.name}: {total} frames = {total / FPS:.2f} s; before the limiter peak {peak:+.1f} dBFS; loudness {i_line}; true peak {tp_line}")


if __name__ == "__main__":
    for b in (sys.argv[1:] or list(PREVIEWS)):
        build(b)
