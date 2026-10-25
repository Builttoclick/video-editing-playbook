"""Design's magenta MP4s -> ProRes 4444 with a real alpha channel, so CapCut needs no chroma key and no text gets a
coloured rim.

Per frame (numpy): decode with BT.709 limited range (what Design encodes with, untagged: that matrix gives back
#FF00FF, the brand navy and amber exactly). m = min(R, B) - G is 255 on the key and <= 0 on everything we draw.
- pure key (m >= 230) -> transparent.
- the 6 px band around anything >= 70 % magenta (where H.264's half-resolution colour smears magenta into the
  edges; next to navy the key itself decodes darker, so a 230 seed missed arrow tips and outlines): magenta fraction
  t = m / 255, alpha = 1 - t (below 0.08 -> 0, no speckle), colour unmixed F = (C - t*K) / (1 - t), and any magenta
  left on a coloured edge is subtracted from R and B (despill).
- everything else -> fully opaque, untouched (so a purple-ish pixel inside a screenshot never goes see-through).
Measured on the 6 V6-01 overlays, 10 moments each: magenta tint on edge pixels max 6/255, none over 8 (a plain key
left up to 40, and 125 on B1a's arrow tips). Encoded as ProRes 4444 with 16-bit
alpha, tagged BT.709.

usage: python _prores_alfa.py [piece ...]      (default: every ENTREGA/*.mp4)  -> ENTREGA/PRORES/<piece>.mov
"""
import glob, os, shutil, subprocess, sys
import numpy as np
from scipy import ndimage

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
FF, FP = shutil.which("ffmpeg") or "ffmpeg", shutil.which("ffprobe") or "ffprobe"
W, H = 1080, 1920
K = np.array([255.0, 0.0, 255.0], np.float32)
DISK = np.add.outer(np.arange(-6, 7) ** 2, np.arange(-6, 7) ** 2) <= 36      # 6 px radius


def key(rgb):
    c = rgb.astype(np.float32)
    m = np.minimum(c[..., 0], c[..., 2]) - c[..., 1]
    pure = m >= 230
    band = ndimage.binary_dilation(m >= 180, DISK) & ~pure      # seeded by >= 70 % magenta: next to dark colours the key decodes darker
    t = np.where(pure, 1.0, np.where(band, np.clip(m / 255.0, 0, 1), 0.0)).astype(np.float32)
    a = 1.0 - t
    a[a < 0.08] = 0.0
    f = (c - t[..., None] * K) / np.maximum(1.0 - t[..., None], 1e-3)
    e = np.maximum(0.0, np.minimum(f[..., 0], f[..., 2]) - f[..., 1]) * band
    f[..., 0] -= e
    f[..., 2] -= e
    f[a == 0] = 0
    out = np.empty((H, W, 4), np.uint8)
    out[..., :3] = np.clip(f, 0, 255).round()
    out[..., 3] = np.round(a * 255)
    return out


def convert(src, dst):
    n = int(subprocess.run([FP, "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                            "stream=nb_read_frames", "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip())
    dec = subprocess.Popen([FF, "-v", "error", "-i", src, "-vf", "scale=in_color_matrix=bt709:in_range=tv,format=rgb24",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen([FF, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", "%dx%d" % (W, H), "-r", "30",
                            "-i", "-", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le",
                            "-c:v", "prores_ks", "-profile:v", "4444", "-alpha_bits", "16", "-vendor", "apl0",
                            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
                            "-r", "30", dst], stdin=subprocess.PIPE)
    done = 0
    while True:
        buf = dec.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        enc.stdin.write(key(np.frombuffer(buf, np.uint8).reshape(H, W, 3)).tobytes())
        done += 1
    enc.stdin.close(); enc.wait(); dec.wait()
    return n, done


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "ENTREGA", "PRORES"), exist_ok=True)
    names = sys.argv[1:] or [os.path.splitext(os.path.basename(p))[0] for p in sorted(glob.glob(os.path.join(HERE, "ENTREGA", "*.mp4")))]
    for nm in names:
        src = os.path.join(HERE, "ENTREGA", nm + ".mp4")
        dst = os.path.join(HERE, "ENTREGA", "PRORES", nm + ".mov")
        n, done = convert(src, dst)
        print("%-4s %d/%d frames -> %s (%.0f MB)" % (nm, done, n, os.path.relpath(dst, HERE), os.path.getsize(dst) / 1e6))
