"""Preview MP4 of the parts in parts.json exactly as VSL ARMADO plays them: Joaquín's raw take per part (CapCut's cut points), the
DJI audio, one-word captions in Joaquín's style (Poppins Bold, approximated), and the finished overlays on top.

    python3 tools/preview.py            -> out/PREVIEW-VSL-0-<end>s.mp4 (every part in parts.json)

Needs out/ENTREGA/<part>.mov (tools/compose.py). Read-only on the raw media.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MEDIA = Path.home() / "Movies/VSL-MEDIA"   # your footage: RAW/<take>.MOV and AUDIO/<mic>-MAIN.wav (CapCut Mac reads ~/Movies)
RAW = MEDIA / "RAW/IMG_6245.MOV"
WAV = MEDIA / "AUDIO/DJI-MAC-20261020-202654-MAIN.wav"
# Joaquín's CapCut captions (measured on the exported V6-02, 24-oct-2026): Poppins Bold, size 30 = 128 px em at 1080 wide,
# spacing -1 = -0.05 em, pure white, NO outline, line box centred at y 1497.6 (CapCut y -0.56).
CAP_PX = 128
CAP_TRACK = -0.05
CAP_Y = 1497.6
FONT = ImageFont.truetype(str(Path.home() / "Library/Fonts/Poppins-Bold.otf"), CAP_PX)
W, H, FPS = 1080, 1920, 30
PARTS = json.loads((ROOT / "src/data/parts.json").read_text())
OUT = ROOT / f"out/PREVIEW-VSL-0-{round(PARTS[-1]['timeline'][1])}s.mp4"
TMP = ROOT / "out/_preview"
TMP.mkdir(parents=True, exist_ok=True)


def word_at(p, t):
    ws = p["words"]
    for i, w in enumerate(ws):
        nxt = ws[i + 1]["t0"] if i + 1 < len(ws) else w["t1"] + 0.3
        end = nxt if nxt - w["t1"] < 0.6 else w["t1"] + 0.25
        if w["t0"] <= t < end:
            return w["w"], t - w["t0"]
    return None, 0


def caption(word, age):
    """RGBA band (W x 260) with the word as Joaquín's captions look: white Poppins Bold, -1 spacing, no outline, a quick pop."""
    if not word:
        return None
    s = min(1.0, 0.82 + age / 0.09 * 0.18)
    img = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    track = CAP_TRACK * CAP_PX
    widths = [FONT.getlength(ch) for ch in word]
    total = sum(widths) + track * (len(word) - 1)
    x = (W - total) / 2
    for ch, cw in zip(word, widths):
        d.text((x, 130), ch, font=FONT, fill=(255, 255, 255, 255), anchor="lm")
        x += cw + track
    if s < 1:
        nw, nh = int(W * s), int(260 * s)
        small = img.resize((nw, nh), Image.LANCZOS)
        img = Image.new("RGBA", (W, 260), (0, 0, 0, 0))
        img.paste(small, ((W - nw) // 2, (260 - nh) // 2))
    return np.asarray(img).astype(np.float32) / 255.0


def main():
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                            "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
                            str(TMP / "video.mp4")], stdin=subprocess.PIPE)
    wavs = []
    total = 0
    pieces = [(p, sg["win"]) for p in PARTS for sg in p.get("segs", [{"win": p["win"]}])]
    for p, (w0, w1) in pieces:
        dur = w1 - w0
        n = round(dur * FPS)
        bg = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{p['raw_start'] + w0:.4f}", "-i", str(RAW), "-frames:v", str(n),
                               "-vf", "fps=30,scale=1080:1920:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                              stdout=subprocess.PIPE)
        ov = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{w0:.4f}", "-i", str(ROOT / f"out/ENTREGA/{p['id']}.mov"),
                               "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)
        for i in range(n):
            b = bg.stdout.read(W * H * 3)
            o = ov.stdout.read(W * H * 4)
            if len(b) < W * H * 3:
                b = last_b
            last_b = b
            frame = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0
            if len(o) == W * H * 4:
                oa = np.frombuffer(o, np.uint8).reshape(H, W, 4).astype(np.float32) / 255.0
                frame = frame * (1 - oa[..., 3:4]) + oa[..., :3] * oa[..., 3:4]
            word, age = word_at(p, w0 + i / FPS)
            cap = caption(word, age)
            if cap is not None:
                y0 = int(round(CAP_Y)) - 130
                reg = frame[y0:y0 + 260]
                frame[y0:y0 + 260] = reg * (1 - cap[..., 3:4]) + cap[..., :3] * cap[..., 3:4]
            enc.stdin.write((frame * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())
        bg.wait()
        ov.wait()
        total += n
        seg = TMP / f"a_{p['id']}_{w0:.3f}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{p['wav_start'] + w0:.4f}", "-i", str(WAV), "-t", f"{n / FPS:.4f}",
                        "-ac", "2", "-ar", "48000", str(seg)], check=True)
        wavs.append(seg)
        print(p["id"], n, "frames", flush=True)
    enc.stdin.close()
    enc.wait()
    lst = TMP / "audio.txt"
    lst.write_text("".join(f"file '{w}'\n" for w in wavs))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-ar", "48000", str(TMP / "audio.wav")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(TMP / "video.mp4"), "-i", str(TMP / "audio.wav"), "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(OUT)], check=True)
    print("wrote", OUT, total, "frames")


if __name__ == "__main__":
    main()
