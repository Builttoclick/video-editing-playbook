# meta-export: ads joined frame-exact, and files Meta accepts as they are

Two tools from the ad series of October 2026 (24 coded pieces of Joaquín's takes that make 37 ads) and the gate every
ad file goes through before the upload. Context: [docs/21](../../docs/21-coded-overlays-on-talking-head.md) (the
export section) and [docs/14](../../docs/14-masters-and-web.md) (what Meta does with the file).

| File | What |
|---|---|
| `export_ads.py` | every piece rendered once (footage on its trim, the coded overlay, the captions) to ProRes 4444 plus its audio as float; then every ad joined frame-exact from those pieces, with the hook -> body and body -> closer transition rebuilt in code as a push-in |
| `preview.py` | what `export_ads.py` imports (the piece table, the trim windows, the caption renderer), and review previews of the bodies and reels |
| `meta_ready.py` | rewrites any MP4 without re-encoding so it matches Meta's Ads Guide (no edit list, BT.709 written into the H.264 stream, moov first), then checks every output and exits 1 if anything is off |

## export_ads.py

`export_ads.py` and `preview.py` go in the `tools/` folder of an overlay project like [`../vsl-motion/`](../vsl-motion/):
they take the folder above `tools/` as the project root.

```bash
python3 tools/export_ads.py list                 # the ads and their pieces
python3 tools/export_ads.py pieces [ids...]      # out/_pieces/<id>.mov (ProRes 4444) + <id>.f32 (its audio), 4 at a time
python3 tools/export_ads.py ads [names...]       # ../EXPORTADOS/<name>.mp4, 3 at a time, + INDEX.md
python3 tools/export_ads.py check                # frames, pts on i/30, durations, loudness of every export
```

- **Pieces once, ads many.** 24 pieces make 37 ads: each hook with the body it was written for, each of up to four
  closers, minus the pairs that would say the price twice (`PAIRS`, `CTAS`, `allowed()`). A piece is decoded,
  composited and captioned once; every ad after that only reads ProRes and writes H.264. All 37 took about 10 minutes.
- **Frame-exact joins.** Each piece has exactly `round((w1 - w0) * 30)` frames and exactly that many frames' worth of
  audio samples (`n * 48000 / 30`), with a 4 ms fade at both ends. The ad is the pieces back to back: no concat demuxer, no
  timestamps to drift. `check` proves it: the frame count, and every frame's pts within 1 ms of `i / 30`.
- **The transition in code.** Joaquín's hand edits used CapCut's "Pull in" at the hook -> body and body -> closer
  joins. Rebuilt as `zoom()`: the last 5 frames before the cut push in to 1.22 (eased in) with a four-tap zoom blur,
  the first 5 after it come back out from 1.22, and a whoosh starts half a transition before the cut at 63 %
  (`WOOSH_FILE`: any short whoosh; earshot makes them in code). Joins inside a body stay hard cuts, because the
  overlays carry across them.
- **Sound:** the levels Joaquín set in the CapCut edit (`gain` per piece), joined sample-exact, a peak limiter at -1 dBFS,
  no loudness normalization.
- **The file:** H.264 high, CRF 17, BT.709 (with `setparams`: ffmpeg 9 takes the colour tags from the frames, so the
  `-color_*` flags alone came out "unknown"), AAC 256k, `-use_editlist 0` and `negative_cts_offsets` so frame 0 sits
  at t=0 without an edit list, moov first.

It reads `src/data/parts.json` (the format of [`../vsl-motion/`](../vsl-motion/), plus `gain` and each word's caption
end `s1`), the overlays in `out/ENTREGA/<piece>.mov` (made by `../vsl-motion/tools/compose.py`) and the footage under
`ADS_MEDIA` (see the top of `preview.py`). It is the script we ran for one series: a reference, not a library.

## meta_ready.py

```bash
python3 meta_ready.py <files or folder> --out <folder> [--suffix _v2]
```

`ffmpeg -c copy` with the `h264_metadata` filter (BT.709 primaries, transfer and matrix written into the stream),
`-use_editlist 0`, `negative_cts_offsets` (the B-frame delay the edit list used to hide; without it the picture
started 67 ms after the sound) and `+faststart`. Then it checks each output against its source: the same number of
frames, pts on `i / fps`, video and audio starting together, the four colour tags, no edit list. Our first 37 exports
had two edit lists and untagged colour; this rewrote them with the frames bit-identical.

`spec_problems()` is the gate our uploader calls before it sends a file: H.264, 1080 wide (1080x1920 for 9:16),
yuv420p, BT.709 tags, at most 30 fps, an audio stream, no edit list.

**What a container rewrite cannot fix: the AAC priming.** An AAC encoder writes silent priming samples in front of the
audio (Apple's `aac_at`: 2112 samples, 44 ms at 48 kHz) and an ordinary MP4 skips them through its edit list. With
the edit list gone, players play them, so the sound starts late by that much. `meta_ready.py` copies the audio bits,
so it keeps that lag. Trim the priming when you encode (`-af atrim=start_sample=2112` before `aac_at`, as the sound
scripts in [`../animated-films/`](../animated-films/) and [`../talking-head-double/`](../talking-head-double/) do),
and measure your chain once by cross-correlating the decoded file with the mix
([docs/19](../../docs/19-sound-effects.md)). `export_ads.py` as it shipped encodes with ffmpeg's own `aac` and no
edit list, so its files carry that encoder's priming (1024 samples, 21 ms, under one frame): trim it too if you
reuse the script.

## What is not here

Our uploader and anything that talks to Meta's API (account, page and video ids, tokens), our footage, the
`parts.json` of our series, the CapCut whoosh.
