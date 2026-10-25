# 13. The finished-render path

When someone wants finished MP4s without opening an editor, the same reading and choosing ends in an **edit decision
list (EDL)** instead of a CapCut project, and code renders it. We built this path first, from a study of how the best
open-source AI editors work (sources in [`research.md`](research.md)).

```
transcribe.py -> pack.py -> [the model writes the EDL] -> render.py --preview -> qa.py -> fix -> render.py -> qa.py
```

Code: [`code/edit-pipeline/scripts/`](../code/edit-pipeline/scripts).

## The EDL

One JSON per output video. Segments point at word indices from the packed transcript; no time is typed by hand.

```json
{
  "name": "V5-04-NEW_H4+A+CTA2",
  "sources": {"H": "takes/hook.MOV", "A": "takes/body.MOV", "CTA": "takes/close.MOV"},
  "segments": [
    {"src": "H",   "words": [0, 24],  "beat": "HOOK", "push": [{"word": 20, "to": 1.14, "dur": 0.5}],
     "reason": "only take; push on the payoff line"},
    {"src": "A",   "words": [0, 53],  "beat": "BODY", "punch": [10], "push": [{"word": 44, "to": 1.14}]},
    {"src": "CTA", "words": [14, 40], "beat": "CTA",  "reason": "second attempt; the first restarts with 'okay'"}
  ],
  "overlays": [{"file": "overlays/hook-H4.mp4", "follows": "H", "src_start": 1.026}],
  "callouts": [{"text": "QUE TE ESCRIBAN", "style": "badge", "at_word": ["A", 16], "until_word": ["A", 20], "y": 430}],
  "sfx": {"auto": true, "words": {"whatsapp": "notify"},
          "cues": [{"name": "thud", "at_word": ["H", 23], "why": "the slam on the last words of the hook"}]},
  "append": [{"file": "plates/closing-plate.mp4", "beat": "END"}],
  "outputs": ["9x16", "4x5"]
}
```

The main fields:

- `segments`: in output order. `src` + `words: [i, j]` (inclusive). `beat` (a beat change gets an automatic whoosh,
  and callouts never cross it). `punch`, `push`, `zoom`, `tighten`, `pad_in`, `pad_out` per segment. `quote` and
  `reason` are for humans and for the next session.
- `overlays`: take-synced overlays. `follows` names the source and `src_start` is the source second that the overlay's
  frame 0 belongs to, so the overlay is cut with the same in and out points as the take: a tightened pause cuts the
  overlay too. Chroma is detected from the corner.
- `callouts`: quick text cards without a design round-trip (`badge`, `dark`, `label`), each with a pop unless told not to.
- `sfx`: automatic placement plus explicit cues, every one with a `why`.
- `music`, `captions`, `origin` (the face position per source), `zoom`, `tighten`, `loudness`, `voice_fx`, `hdr`.

Full field list in the header of [`render.py`](../code/edit-pipeline/scripts/render.py).

## What the renderer does

1. **Resolve:** word indices to source times, snapped to the waveform ([06](06-cut-points.md)), pads, tightened pauses.
2. **Zoom plan:** the jump-cut grammar below.
3. **Extract each piece** with ffmpeg at its exact frame count, audio as PCM.
4. **Overlays** that follow their takes, keyed or with alpha.
5. **Callouts** and then **captions, last**, in output time, clamped to their pieces.
6. **Sound:** effects at their hit points, music ducked under the voice, the voice chain, two-pass loudnorm.
7. **Concat**, AAC at the end, the 4:5 crop, the end plate, and a report JSON with every piece, cut, caption word and
   sound cue in output time.

### Zoom grammar: how jump cuts become a style

- **Snap** at every cut: an instant framing change, alternating 1.0 and 1.1. Inside a long take, more snaps at sentence
  or breath starts, one every 2.4 to 4.2 s at **varied** intervals: a zoom every exact 3 s is learned by the brain and
  stops working.
- **Punch:** an instant 1.12 on the line that matters (the thesis, a number).
- **Push:** a slow push-in to 1.12 to 1.15 over about 0.5 s on the payoff line, held to the end of the take. One to
  three per ad.
- The origin is the face (0.5, 0.42 of the frame by default, per source in the EDL).
- **Snaps replace crossfades.** A crossfade between two takes of the same sentence reads as a mistake; a framing change
  reads as a second camera.
- Smooth push-ins in ffmpeg without the `zoompan` jitter: `scale` with `eval=frame` and an expression for the zoom over
  time, then a `crop` back to 1080x1920 around the face.

### The traps that make audio drift

- **Every per-piece intermediate needs an exact frame count** (`-frames:v N`) **and audio trimmed or padded to exactly
  N/30 s** (`atrim` + `apad`). `-t` cuts on the AAC packet grid (up to 20 ms short), the concat squeezes the gap, and
  over a dozen pieces the voice creeps ahead of the mouth.
- Keep intermediates in PCM; encode AAC once, at the end.
- Put 30 ms fades at every cut.
- **HDR sources** (iPhone HLG) are tone-mapped to SDR in the render (`mobius` by default; `hable` is darker, `direct` is
  brightest and clips highlights). Better to record SDR.

## Modular ads: choose once, render every combination

An ad is a hook + a body + a closing, and the same body is used in several ads. So:

- `edit/pieces.json` holds the chosen takes of **every piece, once** (with its callouts, overlays and sound cues);
- each ad's EDL is just a list of pieces: `{"name": "V6-01_N1+B1+C1", "segments": [{"piece": "N1"}, {"piece": "B1"},
  {"piece": "C1"}]}`, named like the upload title;
- the same body is then byte-identical in every ad that uses it.

### Which combinations to build

Not all of them. From one series: 10 hooks x 2 bodies x 2 closings = 40 possible ads, and 16 were built, by rules:

1. **A key fact is said once per ad.** If the hook says the price, the closing that repeats it is out. Same for "14
   días" (the delivery time).
2. **A hook that opens a fear needs the body that answers it.** The hook about being afraid of the process only goes
   with the body that IS the process.
3. **A hook that opens a scene needs the outcome body**, not the inventory one: the tone breaks at the cut otherwise.
4. **Order matters when two bodies are glued:** A then B joined better than B then A, because A's last line was B's
   way in.
5. Pairs that only swap the closing and change nothing else do not earn their budget.

### Gluing pieces that were exported from CapCut

When Joaquín exports finished pieces (captions and overlays burned in), the combinations are glued with ffmpeg:
pieces back to back, jump cuts, no transitions, nothing trimmed. Two things to check first:

- **CapCut exports can carry their audio up to 29 ms off the video.** Measure each piece before gluing.
- **A closing plate made elsewhere broke a stream-copy concat** (it lost 3 frames and decoded wrong): re-encode the
  plate to the exact format of the pieces first, then concat.

## Outputs and upload specs

| | |
|---|---|
| Master | 1080x1920, 30 fps, H.264 High, yuv420p, BT.709 SDR, CRF 17 capped at 20 Mbps, AAC 192 kbps 48 kHz, `+faststart` |
| Feed | 4:5 1080x1350 = the centre crop `crop=1080:1350:0:285` of the master |
| Loudness | -14 LUFS integrated, true peak -1.5 dBTP |
| HDR | off |
| Bitrate floor | under about 5 Mbps the platforms visibly downgrade the picture |
| File name | the ad's title (`V6-01_N1+B1+C1.mp4`), so the upload and the reports find it by name |

Before cutting a vertical to 4:5, look at the safe-zone sheet: anything important outside y 285 to 1635 is lost.

## The test that tells you whether the grammar pays

Re-cut a winning ad from its raw takes with this grammar (cuts, zooms, sound, loudness) and run it against the
original in the same ad set: same script, same take, same overlays, only the edit differs. Hook rate and hold rate
answer it ([16](16-ads-and-vsl-craft.md)).
