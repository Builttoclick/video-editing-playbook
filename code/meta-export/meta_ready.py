#!/usr/bin/env python3
"""Make an ad MP4 match Meta's Ads Guide before upload, without re-encoding (2-nov-2026).

Meta's guide asks for no edit lists in the container and a clean H.264 stream. Our code exports (export_ads.py before
2-nov) carried two edit lists and no colour primaries/transfer in the H.264 VUI; CapCut exports carry two edit lists.
This rewrites the container only: same video and audio bits, full BT.709 tags, no edit lists, moov first.
The B-frame delay that the edit list used to hide goes into negative CTS offsets (ctts v1), so the first frame
still sits at 0 next to the audio; without them the picture started 67 ms after the sound.

    python3 meta_ready.py <files or folder> --out <folder> [--suffix _v2]

Then it checks every output (frames, pts on i/fps, durations, tags, no elst) and exits 1 if anything is off.
The size is decided elsewhere: 1080x1920 is the right upload for Instagram ads (a 1440 or 4K upload got only
H.264 360p/720p from Instagram on 2-nov, a 1080 upload the full VP9 ladder up to 1080p at once).
"""
import argparse
import json
import os
import struct
import subprocess
import sys

BSF = "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0"
SIZES = {(1080, 1920), (1080, 1350), (1080, 1080), (1920, 1080)}  # 1080 wide, the measured rule (a 4K rule lasted 20 minutes on 05-nov-2026: "en 1080 normal como siempre")


def has_elst(path):
    """An edit list inside moov (searched there only: four random bytes in mdat would be a false alarm)."""
    with open(path, "rb") as f:
        while True:
            h = f.read(8)
            if len(h) < 8:
                return False
            size, typ = struct.unpack(">I4s", h)
            hdr = 8
            if size == 1:
                size, hdr = struct.unpack(">Q", f.read(8))[0], 16
            elif size == 0:
                return False
            if typ == b"moov":
                return b"elst" in f.read(size - hdr)
            f.seek(size - hdr, 1)


def spec_problems(path):
    """What keeps a file from being Meta-ready; [] when it is. Our uploader refuses a file with any."""
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,pix_fmt,"
                                   "color_space,color_transfer,color_primaries,r_frame_rate", "-of", "json", path],
                                  capture_output=True, text=True).stdout or "{}")
    streams = j.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not v:
        return ["no video stream"]
    out = []
    if v.get("codec_name") != "h264":
        out.append("codec %s, Meta wants H.264" % v.get("codec_name"))
    if (v.get("width"), v.get("height")) not in SIZES:
        out.append("%sx%s: upload 1080 wide (1080x1920 for 9:16); a 1440 or 4K upload got only H.264 360p/720p from "
                   "Instagram on 2-nov-2026" % (v.get("width"), v.get("height")))
    if v.get("pix_fmt") != "yuv420p":
        out.append("pix_fmt %s, use yuv420p (8-bit SDR)" % v.get("pix_fmt"))
    if [v.get("color_space"), v.get("color_transfer"), v.get("color_primaries")] != ["bt709"] * 3:
        out.append("colour tags %s/%s/%s, need bt709 x3" % (v.get("color_space"), v.get("color_transfer"), v.get("color_primaries")))
    num, den = (v.get("r_frame_rate") or "0/1").split("/")
    if int(num) / max(int(den), 1) > 30.5:
        out.append("%s fps: export 30 (60 fps halves Meta's bits per frame)" % v.get("r_frame_rate"))
    if not any(s.get("codec_type") == "audio" for s in streams):
        out.append("no audio stream")
    if has_elst(path):
        out.append("edit list in the container (Meta's guide: avoid)")
    return out


def probe(path, entries, stream="v:0"):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", entries, "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout
    return [x.strip(",") for x in out.split() if x.strip(",")]


def fix(src, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-map", "0:v:0", "-map", "0:a:0", "-c", "copy", "-bsf:v", BSF,
                    "-map_metadata", "-1", "-use_editlist", "0", "-movflags", "+faststart+negative_cts_offsets", dst], check=True)


def check(src, dst):
    problems = []
    fps_num, fps_den = probe(dst, "stream=r_frame_rate")[0].split("/")
    fps = int(fps_num) / int(fps_den)
    pts = [float(x) for x in probe(dst, "frame=pts_time")]
    n_src = len(probe(src, "frame=pts_time"))
    if len(pts) != n_src:
        problems.append(f"frames {len(pts)} vs source {n_src}")
    dev = max(abs(p - pts[0] - i / fps) for i, p in enumerate(pts)) if pts else 9
    if dev > 0.002:
        problems.append(f"pts off by {dev * 1000:.1f} ms")
    v0 = float(probe(dst, "stream=start_time")[0])
    a0 = float(probe(dst, "stream=start_time", "a:0")[0])
    if abs(v0 - a0) > 0.03:
        problems.append(f"audio starts {(a0 - v0) * 1000:.0f} ms from video")
    tags = sorted(",".join(probe(dst, "stream=color_space,color_transfer,color_primaries,color_range")).split(","))
    if tags != ["bt709", "bt709", "bt709", "tv"]:
        problems.append(f"tags {tags}")
    if has_elst(dst):
        problems.append("still has an edit list")
    return problems, len(pts), v0, a0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--suffix", default="_v2")
    a = ap.parse_args()
    files = []
    for x in a.inputs:
        files += sorted(os.path.join(x, f) for f in os.listdir(x) if f.lower().endswith(".mp4")) if os.path.isdir(x) else [x]
    os.makedirs(a.out, exist_ok=True)
    bad = 0
    for src in files:
        stem = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(a.out, stem + a.suffix + ".mp4")
        fix(src, dst)
        problems, n, v0, a0 = check(src, dst)
        bad += bool(problems)
        print(("BAD  " if problems else "ok   ") + os.path.basename(dst), f"{n} frames, v {v0:.3f} a {a0:.3f}", "; ".join(problems))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
