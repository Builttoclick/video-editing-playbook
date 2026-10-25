# 14. Masters and the web file

How the VSL went from Joaquín's approved preview to an HD master, a native 4K master and a 41 MB file that plays well
on a phone. Two of the bugs below cost us a wrong file each, and both are invisible unless you measure.

## Export outside CapCut, from the same data

Once the overlays are code, every piece of the final video is known exactly: which span of the raw file, which
overlay frames, which caption word at which frame, which span of the mic recording. So the masters are rendered by
code ([`export.py`](../code/vsl-motion/tools/export.py)) instead of exporting from CapCut:

- the footage cut like the CapCut timeline, every visible piece (a part used twice included);
- the overlays composited over it (HD: the finished 1080 overlays; 4K: overlays re-rendered at 4K, composited with the
  person masks scaled up);
- the captions drawn in the house style, 128 px at HD and 256 px at 4K;
- the audio Joaquín approved: the mic's main channel per piece, concatenated, one `loudnorm` to -14 LUFS.

Before exporting outside the editor, check what the timeline would add that the code does not have: here one video
track, the clip volumes, noise reduction inside the compounds, no music, no effects. Nothing was lost.

## Parallel export without re-encoding seams

Each visible piece renders on its own (4 workers) to an **MPEG-TS segment with identical x264 settings**, and the
segments are joined by stream copy:

| Master | x264 | Result |
|---|---|---|
| HD 1080x1920 | `-preset slow -crf 16 -profile:v high -level:v 4.2` | 211 MB, 2:23.4, 4302 frames |
| 4K 2160x3840 | `-preset medium -crf 17 -profile:v high -level:v 5.2` | 624 MB, same frames |

Native 4K is worth it when the camera is native 4K: nothing is upscaled. The overlays were re-rendered at scale 2
(`renderMedia({ scale: 2, frameRange: [from, to] })`, only the frames ever visible plus 2 on each side, which saves
about a third of the work): 34 layer renders in about 35 minutes on an M1 Pro, then the assembly.

## Bug 1: the concat squeezed time

The first 4K master had all 4302 frames, but its video lasted **142.93 s instead of 143.40 s**: by the end the picture
ran almost half a second ahead of the voice. The HD master had the same bug at one frame.

**Cause:** ffmpeg's concat demuxer cannot see the duration of the last frame of each MPEG-TS piece, so it squeezes the
timestamps at every join.

**Fix, no re-encode:** write the exact duration of every piece into the concat list:

```
file '/path/_seg_hd/00.ts'
duration 9.866667
file '/path/_seg_hd/01.ts'
duration 4.300000
...
```

**How to check it**, and how not to:

```bash
ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -of csv=p=0 master.mp4 | awk '{d=$1-(NR-1)/30; if (d<0) d=-d; if (d>m) m=d} END {print NR " frames, max deviation " m " s"}'
```

Every frame `i` must sit at `i/30`. Never check with `-ss` spot checks: seeking lands one frame off and hides it.

What did not work, so you do not try it: a raw H.264 re-join with `-framerate 30` (still 2 frames off with B-frames),
and a single-pass re-encode of the whole thing (exact timing, but the levels came out 2 to 3 luma steps darker).

## Bug 2: the wrong fix for a squeezed master

Before bug 1 was understood, the web encode was made from the squeezed HD master. Its VMAF against the master read 69,
with zeros from 0:32 on, and the frame list showed two frames on the same timestamp at 32.2667 s (the seam where a
parallel piece started). It looked like an extra frame, so a `-vf fps=30` dropped it. **That was wrong**: the frame was
real, time had been squeezed, and dropping it made the web copy run one frame early from 0:32. The fix was the
frame-exact master above and a plain encode with no fps filter: 4302 frames, all at `i/30`, audio offset 0.00 ms at
5, 60 and 130 s.

Two lessons:
- **Two frames on one timestamp after a concat means squeezed time, not an extra frame.** Re-join the master; never
  patch it with an fps filter.
- **VMAF near 0 over whole stretches means misaligned frames, not a bad encode.** Compare the `pts_time` lists of both
  files first. (If you must compare against a reference with a duplicate timestamp, put `fps=30,setpts=PTS-STARTPTS` on
  the reference too.)

## Colour: say BT.709 out loud

- **Piping RGB frames into libx264 silently uses BT.601 and writes no colour tags.** The first preview was encoded like
  that. Say it explicitly on both ends:

```bash
# decode the BT.709 source to RGB
-vf "scale=in_color_matrix=bt709:in_range=tv"
# encode RGB to YUV
-vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv
```

- **A concat by stream copy can lose the colour tags** (the VUI). Put them back without re-encoding:

```bash
-c:v copy -bsf:v h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0
```

## The web file: 211 MB to 41 MB

The request was "comprimí eso... para que no sea tan pesado de celulares" (compress it so it is not heavy on phones).
The lightest file that still looks the same on a phone:

```bash
ffmpeg -i VSL-V2-1080x1920.mp4 \
  -c:v libx264 -preset slow -crf 23 -maxrate 2500k -bufsize 5000k -profile:v high -level:v 4.1 \
  -g 90 -x264-params aq-mode=3 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac_at -b:a 128k -movflags +faststart vsl-web.mp4
```

| Variant | Size | VMAF mean (5th percentile) |
|---|---|---|
| CRF 23 capped at 4.5 Mbps | 67.6 MB | (measured on a misaligned reference, see bug 2) |
| CRF 23 capped at 3.0 Mbps | 48.0 MB | 95.8 (92.1) |
| **CRF 23 capped at 2.5 Mbps** | **41.1 MB** | **94.9 (90.7)** |

On a talking head with motion graphics the **cap** sets the quality (under a 4.5 Mbps cap x264 sat at q 29 to 31
anyway). Audio kept at -14.3 LUFS, `moov` before `mdat` (faststart), BT.709 tagged, High@4.1.

The copies in this repo's [`examples/`](../examples) are smaller still (720x1280, CRF 23 capped at 1.5 Mbps), to keep
the repository light.

## The poster frame

The poster is the first frame of the hook, and it is what a phone shows first (the page's largest paint). To avoid a
colour jump when the video starts, decode it with the same matrix:

```bash
ffmpeg -i vsl-web.mp4 -frames:v 1 -vf "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24" poster.png
# then Pillow: JPEG quality 78, progressive  -> 111 KB at 1080x1920
```

## Hosting and the player

- **Serve the MP4 from a host that answers range requests with 206** (we use Cloudflare R2 on its own subdomain).
  Some static hosts answer a range request with a full 200, and **iPhones will not play the video** then.
- The landing's player is ours, no paid player: the video starts **muted, looping its first 10 seconds** behind a card
  ("Tu video ya empezó / Tocá para escucharlo"); a tap **restarts it at 0:00 with sound**. The progress bar runs ahead
  of the real time (`0.75*log(1+180p)/log(181) + 0.25p`: at 10 % real it shows 45 %) while the video clock stays real.
  It fires events for the ad pixel: start (the tap, a real view), 25/50/75/95 % on real time, end.
- Check it live, not just locally: `currentSrc` is the CDN URL, `readyState` 4, seconds buffered after a few seconds, a
  seek near the end plays, the muted preview loops, the tap restarts with sound. The muted autoplay must be checked on
  a real iPhone: headless WebKit blocks every muted autoplay over plain http.
