# 6. Cut points: the waveform decides

Scribe says **which** words. The waveform says **where**. Scribe's times drift 50 to 100 ms on a good day and much
more after a pause ([04](04-transcription.md)), which is the difference between a clean cut and a clipped first
syllable.

## The envelope

Decode the clean mic (16 kHz is enough), compute an RMS envelope with a 10 ms window at **1 ms hops**, in dBFS. Every
decision below is made on that curve, around the edges Scribe gave.

## Thresholds: relative to the speech, not to the floor

Our first version set thresholds from the noise floor of each file: onset = floor + 14 dB, offset = floor + 9 dB
(+12 / +10 in the render tool, gaps under 25 ms bridged). That works on a camera track with room tone.

It broke on the lav mic. The DJI's noise gate puts every pause at **-80 to -100 dBFS**, so any threshold "a bit above
the floor" fired on breaths and on the tail of an "okey". The fix was to hang the thresholds from the speech level:

- `level` = the 95th percentile of the envelope **inside the chosen words**;
- **onset** = the first rising crossing of `level - 25 dB` near the first word, then walk back while the envelope stays
  above `level - 40 dB` (at most 80 ms) to catch the soft start of the consonant;
- **offset** = the last falling crossing of `level - 32 dB` near the last word;
- both bounded: never more than 0.30 s before Scribe's start, never into the previous or the next word;
- if no clean crossing exists, flag it for a human and fall back to Scribe's time plus a margin (+120 ms on the end,
  because Scribe ends words early).

Code: `refine()` in [`code/capcut-pre-edit/plan.py`](../code/capcut-pre-edit/plan.py); the floor-based version is in
[`code/edit-pipeline/scripts/render.py`](../code/edit-pipeline/scripts/render.py).

## Pads: how much air around the words

| Where | Before the onset | After the offset | Why |
|---|---|---|---|
| CapCut tight cut on the timeline | 40 ms | 80 ms | Joaquín's own trims put the out-point 50 to 100 ms after the phrase. Our first version used 200 ms and every cut felt loose |
| Finished render (short-form) | 60 ms | 90 ms | working window 30 to 200 ms; other tools ship 50 / 80 |
| Long-form | 250 ms | 350 ms | a slower feel |

Plus **1.5 s of handles** on each side inside the compound clip in CapCut, so dragging an edge out reveals air and the
breath, never the previous attempt.

## Pauses inside a take

- Short-form: any pause over 0.45 s inside a good run is tightened to about 0.16 s. Breaths of 0.3 to 0.5 s between
  sentences stay: they are the rhythm.
- Long-form: tighten pauses over 0.9 to 1.0 s down to about 0.5 s.
- Keep emphasis pauses (the beat before a number or a punchline) and verbal bridges ("Mirá", "Y ojo", "Entonces").
- If a cut has to happen on silence: 400 ms or more is the cleanest; 150 to 400 ms is usable with a look; under 150 ms
  is mid-phrase, avoid it.

## Frames and clocks

- Snap every span to the frame grid (30 fps): the start floors to a frame, the end ceils to a frame.
- Add the audio stream's `start_time` to every word time (2 to 18 ms on Blackmagic Camera files) before cutting video.
- For a stream-copy cut, the start must be a keyframe. Blackmagic writes a closed GOP every 29 frames, so a lossless clip
  can start on the keyframe before `onset - 1.5 s`. Seek to `keyframe + 0.1 ms` so both tracks start at 0, give
  `-frames:v` the packet count up to the next keyframe, and check the first frame's md5 against the source.
- Put **30 ms audio fades** at every cut in a render, or it pops.

## Check the edges with numbers

After the plan, measure the level of the first 40 ms after every in-point and the last 40 ms before every out-point
against the speech level of that take. **An edge within 20 dB of the speech means a word may be clipped.**
([`qa_cuts.py`](../code/capcut-pre-edit/qa_cuts.py)). On the October shoot it flagged 3 edges across 86 takes, and all
three had a reason: a take that started 100 ms after a restart's last word, a cough, and a deliberately quiet English read.

## One editorial rule that belongs here

When a line is cut, also cut the line that only made sense after it.
