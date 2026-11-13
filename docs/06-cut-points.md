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
| Talking-head ad rendered in code (November) | 40 ms | 60 ms | Joaquín's notes on the first fully coded talking-head edit: "you can make the cuts a little smaller" |
| A join Joaquín names ("shorten this one") | 20 ms | 20 ms | per segment, only on the joins where Joaquín hears the room between two takes |

Plus **1.5 s of handles** on each side inside the compound clip in CapCut, so dragging an edge out reveals air and the
breath, never the previous attempt.

## Pauses inside a take

- Short-form: any pause over 0.45 s inside a good run is tightened to about 0.16 s. Breaths of 0.3 to 0.5 s between
  sentences stay: they are the rhythm. On the coded talking-head ads (November) Joaquín wanted it tighter: pauses over
  0.32 s down to 0.11 s, and in a list ("what it includes: the texts, the design, the domain") over 0.22 s down to
  0.08 s.
- A daily short-form series cut on Joaquín's own phone takes: every pause of 0.20 s or more goes. A restart after a short
  pause goes; a fast stutter stays ("the stutter doesn't need cutting"); an emphatic repeat (a double, a triplet)
  stays.
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

## The edge Joaquín actually wants (November 2026)

The thresholds above find the speech. Where exactly to put the edge inside that speech is a taste, and Joaquín named it
after re-trimming every join of an ad series by hand: "look at the shape of the audio... when I finish saying a word,
when the curve drops, cut there. Don't look only at the timestamps."

We measured those 24 hand trims against the mic's waveform:

- **In-point:** the first frame of the word, 0 to 2 frames after the sound starts.
- **Out-point:** a median **22 dB under the last word's peak**, about **70 ms before the tail reaches the room tone**.
  Not the end of the tail: the drop.

How to find it in code:

1. The out-point is the **last downward crossing inside the word**, confirmed by a 40 ms sustain check (the level must
   stay under the line for 40 ms, or it was a dip between syllables). The first version without the sustain check
   clipped the last syllable of one word and caught lip clicks 0.4 s early.
2. **Check the band above 3 kHz before trusting a borderline out.** A word-final "s" lives only there: on two words the
   full band read -45 dB at the cut while the 10 ms RMS over 3 kHz still sat at -46 to -51 dB for 50 ms past it. The
   fix is an explicit out where the high band falls under -60 dB.
3. Keep an "s" tail joined to its word; drop the breath after a gap.
4. **Judge each edge against that clip's own floor.** A clip with a noisy room (a floor of -50 dB against the usual -61
   to -66) made a fixed -45 dB line flag nearly every edge. Use the clip's own 10th percentile.
5. **A restart said in one breath with the kept words cannot be cut clean** ("me duermo a la, a las once": the level
   never dips under -30 dB). Keep the restart words, cut only the pause after them so it plays as a fast stutter, and
   tell the editor which one it is.
6. If your plan format lets a human override an out-point per range, make sure it applies where they think it does.
   Ours applied only to the last run of a range: to fix one word in the middle, split the range there (splitting at an
   existing pause adds no cut).

Look at a waveform image of every edge before shipping. It is the one check the transcript cannot do for you.

## A join is a snap, never a drift

In the finished-render path ([13](13-finished-render.md)) every join can carry a zoom change to hide the jump. Our
renderer used to add a slow 1.07 release push after each cut. Joaquín read it as "it moves sideways": the picture
changing after the transition. "Change the image first and then the transition appears." So the cut is instant and
any zoom is a **level change at the cut** (1.0 and 1.08 alternating), never motion after it.

A stutter Joaquín saw at one join ("I see a frame and then the movement changes again") was not the edit: ffmpeg had
duplicated a frame while reading the concatenated cut at a constant rate. Read a concat with `-fps_mode passthrough`.

## One editorial rule that belongs here

When a line is cut, also cut the line that only made sense after it.
