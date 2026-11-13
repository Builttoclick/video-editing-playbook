"""The empty chair for the visto: Joaquín erased from one frame of Joaquín's take with LaMa (Joaquín's ask on draft 1, 05-nov-2026:
"cuando le hago el visto no me muestres a mí... pedir con IA que me saquen a mí y ya no aparece más el tipo").

    python3 tools/th_plate.py [frame_jpg mask_png]   -> RAW/edit/append/plate.png, RAW/edit/append/visto-vacio.mp4

Frame and mask default to a visto frame of the cut (th_compose.py's cache, upright, un-mirrored).
The Apple Vision mask grown 28 px (hair, the mic, Joaquín's shadow on the desk) feeds big-lama (TorchScript in
~/.cache/big-lama: the big-lama checkpoint exported to TorchScript), full scale; the result is pasted
with a blurred alpha. The clip: 1.5 s of the plate with a slow 1.0 -> 1.025 push, the take's own room tone under it.
"""
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(os.environ.get("TH_CACHE", Path.home() / "Library/Caches/talking-head-double"))
OUT = ROOT / "RAW/edit/append"
MODEL = Path.home() / ".cache/big-lama/big-lama.pt"
GROW = 28
DUR, FPS = 1.5, 30
TAKE = Path(os.environ.get("TH_TAKE", ROOT / "RAW/take.MOV"))   # the raw take: its room tone goes under the plate
ROOM_AT = float(os.environ.get("TH_ROOM_AT", "20.0"))         # a second of the take where nobody speaks


def lama(model, img, mask):
    a = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255.0).permute(2, 0, 1).unsqueeze(0)
    k = torch.from_numpy((np.asarray(mask) > 127).astype(np.float32)).unsqueeze(0).unsqueeze(0)
    with torch.no_grad():
        out = model(a, k)
    arr = (out[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255).astype(np.uint8)
    return Image.fromarray(arr)


def main():
    frame = Path(sys.argv[1]) if len(sys.argv) > 2 else CACHE / "frames/f_01150.jpg"
    mask_p = Path(sys.argv[2]) if len(sys.argv) > 2 else CACHE / "masks/f_01150.png"
    img = Image.open(frame).convert("RGB")
    m = cv2.imread(str(mask_p), cv2.IMREAD_GRAYSCALE)
    m = cv2.dilate((m > 127).astype(np.uint8) * 255, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * GROW + 1, 2 * GROW + 1)))
    mask = Image.fromarray(m)
    W, H = img.size
    assert W % 8 == 0 and H % 8 == 0, (W, H)
    model = torch.jit.load(str(MODEL), map_location="cpu").eval()
    filled = lama(model, img, mask)
    alpha = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(mask.filter(ImageFilter.GaussianBlur(6)))))
    plate = Image.composite(filled, img, alpha)
    OUT.mkdir(parents=True, exist_ok=True)
    plate.save(OUT / "plate.png")
    print("plate:", OUT / "plate.png")
    # the clip: the plate with a slow push, the take's room tone (ROOM_AT s into the raw take, where Joaquín is quiet)
    n = int(DUR * FPS)
    vf = (f"scale=w='2*trunc(iw*(1+0.025*n/{n})/2)':h='2*trunc(ih*(1+0.025*n/{n})/2)':eval=frame,"
          f"crop=1080:1920:'(iw-1080)*0.5':'(ih-1920)*0.47',format=yuv420p")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-t", str(DUR), "-i", str(OUT / "plate.png"),
                    "-ss", str(ROOM_AT), "-t", str(DUR), "-i", str(TAKE),
                    "-map", "0:v", "-map", "1:a", "-vf", vf, "-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "12",
                    "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", str(OUT / "visto-vacio.mp4")], check=True)
    print("clip:", OUT / "visto-vacio.mp4")


if __name__ == "__main__":
    main()
