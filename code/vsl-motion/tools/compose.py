"""Composite the two rendered layers into the overlay CapCut gets, using Joaquín's silhouette.

    python3 tools/compose.py stills P1 60,75,150      -> out/qa/P1-<frame>.jpg  (over Joaquín's real frame) + out/qa/P1-sheet.jpg
    python3 tools/compose.py video P1                 -> out/ENTREGA/P1.mov  (ProRes 4444, real alpha)

final = FRONT over (BACK with Joaquín's silhouette cut out). The silhouette is the Vision person mask of the same frame
(cache/masks/<id>/f_NNNNN.png, frame N = overlay frame N-1), grown 2 px and feathered so nothing creeps onto Joaquín's hair.
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PARTS = {p["id"]: p for p in json.loads((ROOT / "src/data/parts.json").read_text())}
W, H = 1080, 1920
KER = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))


def person(pid, i):
    m = cv2.imread(str(ROOT / f"cache/masks/{pid}/f_{i + 1:05d}.png"), cv2.IMREAD_GRAYSCALE)
    if m is None:
        return np.zeros((H, W), np.float32)
    if m.shape != (H, W):
        m = cv2.resize(m, (W, H), interpolation=cv2.INTER_LINEAR)
    m = cv2.dilate(m, KER, iterations=1)
    m = cv2.GaussianBlur(m, (0, 0), 1.3)
    return m.astype(np.float32) / 255.0


def over(front, back, m):
    """front/back: float32 HxWx4 straight alpha in 0..1. Returns straight-alpha result."""
    fa = front[..., 3:4]
    ba = back[..., 3:4] * (1.0 - m[..., None])
    oa = fa + ba * (1.0 - fa)
    rgb = (front[..., :3] * fa + back[..., :3] * ba * (1.0 - fa)) / np.maximum(oa, 1e-6)
    return np.concatenate([np.where(oa > 0, rgb, 0), oa], axis=-1)


def stills(pid, frames):
    qa = ROOT / "out/qa"
    qa.mkdir(parents=True, exist_ok=True)
    tiles = []
    for f in frames:
        b = cv2.imread(str(ROOT / f"out/stills/{pid}-back-{f:05d}.png"), cv2.IMREAD_UNCHANGED)
        if b is None:
            b = np.zeros((H, W, 4), np.uint8)
        fr = cv2.imread(str(ROOT / f"out/stills/{pid}-front-{f:05d}.png"), cv2.IMREAD_UNCHANGED)
        if fr is None:
            fr = np.zeros((H, W, 4), np.uint8)
        # a fully opaque frame (the board) comes out of the screenshot as plain RGB
        if fr.shape[2] == 3:
            fr = np.dstack([fr, np.full((H, W), 255, np.uint8)])
        if b.shape[2] == 3:
            b = np.dstack([b, np.full((H, W), 255, np.uint8)])
        bg = cv2.imread(str(ROOT / f"cache/frames/{pid}/f_{f + 1:05d}.jpg"))
        to = lambda x: x.astype(np.float32) / 255.0
        o = over(to(fr), to(b), person(pid, f))
        comp = to(bg) * (1 - o[..., 3:4]) + o[..., :3] * o[..., 3:4]
        img = (comp * 255).clip(0, 255).astype(np.uint8)
        t = f / 30
        cv2.putText(img, f"{pid} f{f} t={t:.2f}s", (24, 1890), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 3)
        cv2.imwrite(str(qa / f"{pid}-{f:05d}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        tiles.append(cv2.resize(img, (360, 640), interpolation=cv2.INTER_AREA))
    rows = [np.hstack(tiles[i:i + 6] + [np.zeros_like(tiles[0])] * (6 - len(tiles[i:i + 6]))) for i in range(0, len(tiles), 6)]
    cv2.imwrite(str(qa / f"{pid}-sheet.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    print("sheet", qa / f"{pid}-sheet.jpg")


def reader(path):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgba64le", "-"],
                            stdout=subprocess.PIPE)


def video(pid):
    p = PARTS[pid]
    n = p["frames"]
    out = ROOT / "out/ENTREGA"
    out.mkdir(parents=True, exist_ok=True)
    back_p, front_p = ROOT / f"out/layers/{pid}-back.mov", ROOT / f"out/layers/{pid}-front.mov"
    # parts with nothing on Joaquín's chest have no FRONT render: treat it as empty
    rb = reader(back_p) if back_p.exists() else None
    rf = reader(front_p) if front_p.exists() else None
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba64le", "-s", f"{W}x{H}",
                            "-r", "30", "-i", "-", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
                            "-alpha_bits", "16", "-vendor", "apl0", str(out / f"{pid}.mov")], stdin=subprocess.PIPE)
    sz = W * H * 4 * 2
    for i in range(n):
        bb = rb.stdout.read(sz) if rb else bytes(sz)
        fb = rf.stdout.read(sz) if rf else bytes(sz)
        if len(bb) < sz or len(fb) < sz:
            print("short read at", i)
            break
        b = np.frombuffer(bb, np.uint16).reshape(H, W, 4).astype(np.float32) / 65535.0
        f = np.frombuffer(fb, np.uint16).reshape(H, W, 4).astype(np.float32) / 65535.0
        o = over(f, b, person(pid, i))
        enc.stdin.write((o * 65535.0 + 0.5).clip(0, 65535).astype(np.uint16).tobytes())
        if i % 60 == 0:
            print(f"{pid} {i}/{n}", flush=True)
    enc.stdin.close()
    enc.wait()
    for r in (rb, rf):
        if r:
            r.wait()
    print("wrote", out / f"{pid}.mov")


if __name__ == "__main__":
    mode, pid = sys.argv[1], sys.argv[2]
    if mode == "stills":
        stills(pid, [int(x) for x in sys.argv[3].split(",")])
    else:
        video(pid)
