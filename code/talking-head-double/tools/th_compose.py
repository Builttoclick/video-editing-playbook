"""The talking-head picture: Joaquín's cut + the two Remotion layers, with the client's lines mirrored.

    python3 tools/th_compose.py            -> out/th/picture.mp4 (silent; the captions come in the FRONT layer)
    python3 tools/th_compose.py stills 40,300,700   -> out/th/qa/f<frame>.jpg

Frame by frame: the footage of the edit-pipeline cut (RAW/edit/render/AN-01-TH/base.mkv, already SDR 1080x1920); on the
client's pieces (beats Q* and VISTO) it is flipped and cooled so the viewer reads another person; the BACK layer goes
behind Joaquín (its alpha cut by the Apple Vision mask of the same frame, flipped with the footage); a snap zoom on every
second piece of Joaquín's, footage + wall together (the camera sits closer, the wall graphics with it); the FRONT layer on top,
unzoomed; Joaquín's captions last (the ASS the renderer wrote, in output time). Masks: tools/personmask on the frames of
base.mkv, cached in ~/Library/Caches/talking-head-double/ (or TH_CACHE).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "RAW/edit/render/AN-01-TH"
BASE = WORK / "base.mkv"
CACHE = Path(os.environ.get("TH_CACHE", Path.home() / "Library/Caches/talking-head-double"))  # frames + masks, regenerable
OUT = ROOT / "out/th"
# SCALE=2: the whole composite at 2160x3840 (a 4K master we tried once; the ads went out in 1080). The cut is HD (Joaquín's take is
# 1080x1920), so footage and masks are upscaled; the layers come from Remotion at 4K (SCALE=2 in render.mjs), so the
# chat, the graphics and the captions are drawn sharp at that size.
SCALE = int(os.environ.get("SCALE", "1"))
W, H, FPS = 1080 * SCALE, 1920 * SCALE, 30
TH = json.loads((ROOT / "src/data/th.json").read_text(encoding="utf-8"))
PIECES = TH["pieces"]
N = TH["frames"]
FACE = (540.0 * SCALE, 900.0 * SCALE)
SNAP_Z = 1.08
_ME = [q["id"] for q in PIECES if q["role"] == "me" and q["beat"] not in ("END", "VISTO")]


def snap_on(p):
    """every second one of Joaquín's pieces sits closer"""
    return _ME.index(p["id"]) % 2 == 1
COOL = np.array([0.86, 1.0, 1.14], np.float32)  # the client's grade: cooler and a touch darker, so the colour change reads on a phone
COOL_GAIN = 0.92
KER = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4 * SCALE + 1, 4 * SCALE + 1))


def piece_at(i):
    for p in PIECES:
        if p["f0"] <= i < p["f1"]:
            return p
    return PIECES[-1]


def ensure_masks():
    fr, ms = CACHE / "frames", CACHE / "masks"
    if len(list(ms.glob("*.png"))) >= N - 1:
        return
    fr.mkdir(parents=True, exist_ok=True)
    ms.mkdir(parents=True, exist_ok=True)
    if len(list(fr.glob("*.jpg"))) < N:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(BASE), "-fps_mode", "passthrough", "-frames:v", str(N), "-q:v", "2", str(fr / "f_%05d.jpg")], check=True)
    print("frames:", len(list(fr.glob("*.jpg"))), flush=True)
    subprocess.run([str(ROOT / "tools/personmask"), str(fr), str(ms)], check=True)
    print("masks:", len(list(ms.glob("*.png"))), flush=True)


def person(i):
    m = cv2.imread(str(CACHE / f"masks/f_{i + 1:05d}.png"), cv2.IMREAD_GRAYSCALE)
    if m is None:
        return np.zeros((H, W), np.float32)
    if m.shape != (H, W):
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
    m = cv2.dilate(m, KER, iterations=1)
    m = cv2.GaussianBlur(m, (0, 0), 1.3 * SCALE)
    return m.astype(np.float32) / 255.0


def reader(path, pix, ch, extra=()):
    size = W * H * ch
    # passthrough, always: the concatenated cut carries a one-frame timestamp hole at some joins, and ffmpeg's default
    # constant-rate mode fills each with a duplicated frame (dup=5 on draft 2: the stutter Joaquín saw, and the picture
    # drifting late against the voice). Every piece has exactly its n frames; the frames are the truth, not the pts.
    p = subprocess.Popen(["ffmpeg", "-v", "error", *extra, "-i", str(path), "-fps_mode", "passthrough", "-vf", f"scale={W}:{H}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", pix, "-"], stdout=subprocess.PIPE, bufsize=size * 4)

    def frames():
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(H, W, ch)
        p.stdout.close()
        p.wait()

    return frames()


def ease(x):
    return 1 - (1 - x) ** 3


def zoom_crop(img, z):
    if z <= 1.0005:
        return img
    zw, zh = int(round(W * z)), int(round(H * z))
    big = cv2.resize(img, (zw, zh), interpolation=cv2.INTER_LINEAR)
    x0 = int(round(FACE[0] * z - FACE[0]))
    y0 = int(round(FACE[1] * z - FACE[1]))
    x0 = min(max(0, x0), zw - W)
    y0 = min(max(0, y0), zh - H)
    return big[y0:y0 + H, x0:x0 + W]


def composite(i, foot, back, front):
    p = piece_at(i)
    client = p["role"] == "client"
    m = person(i)
    f = foot.astype(np.float32) / 255.0
    if client:
        f = f[:, ::-1]
        m = m[:, ::-1]
        f = np.clip(f * COOL * COOL_GAIN, 0, 1)
    if back is not None:
        b = back.astype(np.float32) / 255.0
        a = b[..., 3:4] * (1.0 - m[..., None])
        f = f * (1 - a) + b[..., :3] * a
    # the cut carries a snap zoom (Joaquín's note on draft 1: the release push read as the picture sliding after the cut;
    # the house style is an instant level change at the cut, no motion): Joaquín's pieces alternate 1.0 / 1.08 about Joaquín's
    # face, the client's and the end card stay at 1.0
    z = SNAP_Z if (p["role"] == "me" and p["beat"] not in ("END", "VISTO") and snap_on(p)) else 1.0
    f = zoom_crop(f, z)
    if front is not None:
        fr = front.astype(np.float32) / 255.0
        a = fr[..., 3:4]
        f = f * (1 - a) + fr[..., :3] * a
    return (np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8)


def layers():
    back = ROOT / "out/layers/TH-back.mov"
    front = ROOT / "out/layers/TH-front.mov"
    return (reader(back, "rgba", 4) if back.exists() else None, reader(front, "rgba", 4) if front.exists() else None)


def stills(frames):
    (OUT / "qa").mkdir(parents=True, exist_ok=True)
    ensure_masks()
    foot = reader(BASE, "rgb24", 3)
    bk, fr = layers()
    want = set(frames)
    for i, f in enumerate(foot):
        b = next(bk, None) if bk else None
        fo = next(fr, None) if fr else None
        if i in want:
            img = composite(i, f, b, fo)
            cv2.imwrite(str(OUT / f"qa/f{i:04d}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
            want.discard(i)
        if not want or i > max(frames):
            break
    print("stills in", OUT / "qa")


def video():
    OUT.mkdir(parents=True, exist_ok=True)
    ensure_masks()
    foot = reader(BASE, "rgb24", 3)
    bk, fr = layers()
    pic = OUT / "picture.mp4"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                            "-color_trc", "bt709", "-color_range", "tv", "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709",
                            str(pic)], stdin=subprocess.PIPE)
    n = 0
    for i, f in enumerate(foot):
        if i >= N:
            break
        b = next(bk, None) if bk else None
        fo = next(fr, None) if fr else None
        enc.stdin.write(composite(i, f, b, fo).tobytes())
        n += 1
        if n % 150 == 0:
            print(f"{n}/{N}", flush=True)
    enc.stdin.close()
    enc.wait()
    print("picture:", pic, n, "frames")
    # the captions ride in the FRONT layer (src/TH.tsx): this Mac's ffmpeg 9 has no libass to burn an ASS file


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stills":
        stills([int(x) for x in sys.argv[2].split(",")])
    else:
        video()
