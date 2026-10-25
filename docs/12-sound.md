# 12. Sound

"Sound is where generated videos sound cheap" (from the video-use playbook, and true). And the uncomfortable fact for
an AI editor: **Claude cannot hear.** So every rule here is either a placement rule tied to something on screen, or a
number that can be measured. Everything else is said out loud: "these are the numbers, the sound needs your ears".

## The voice

- **The voice is always the lav mic**, synced inside the compound ([03](03-ingest-and-sync.md)). The phone's own audio
  stays muted.
- **CapCut's Reduce noise: on by default.** Joaquín set it for every clip of the ad shoots.
- **Enhance voice: off.** It was on at 25 % for one series; after living with it Joaquín said "no me gusta al final".
- **Measure the room before deciding.** The VSL was recorded in a room with a little echo, and noise reduction made the
  voice sound worse there: "es en este proyecto nomás porque tiene un poquito de eco la habitación". That project went
  out with noise reduction off on all 88 clips (flipped in the JSON, CapCut quit, backup first). For a new recording in
  that room, ask before turning it on.
- **Be honest about what was approved.** The VSL preview used the mic file cut on the exact edit points plus one loudness
  pass by code, with none of CapCut's processing. Joaquín approved that sound thinking it was CapCut's. We said so,
  and the masters used exactly the sound that was approved.
- In the render path, a light voice chain by default: high-pass at 80 Hz and a gentle compressor (about 3:1, 6 ms
  attack, 90 ms release). If something sounds wrong, compare against the pauses in the same file (the pauses are the
  room, not the voice): hum, high-pass 80 Hz; boomy, cut around 200 Hz; muffled, cut around 250 Hz; words unclear,
  +2 to 3 dB at 3 kHz; harsh, cut around 3.2 kHz; uneven, compress; room tone between sentences, gate. Subtract before
  you add.

## Sound effects

History, because it changed: in September Joaquín said "efectos de sonido no hagas vos todavía" (no sound effects from
you yet), then two weeks later asked for them explicitly. Both were right at the time. When they are wanted:

1. **Every cue is tied to something visible or said**: a cut, a card landing, a snap zoom, the word "WhatsApp". Nothing
   for decoration. Every cue in the edit list carries a `why`.
2. **Fewer.** About one cue every 2 to 3 seconds at most. About 8 in 20 seconds reads designed; about 20 reads cheap.
   Silence around a cue is what makes it land.
3. **Hit on the frame.** Each sound in the kit knows where its peak is (`hit_ms`), and the renderer starts it that much
   before the moment. A whoosh's energy peak goes on the moment of greatest visual change, and the sound starts 10 to
   20 ms before the picture (the ear is faster than the eye). A riser ends on the reveal.
4. **One sound per moment.** Two cues within 0.5 s fight; drop the second.
5. **Say it, hear it:** "WhatsApp" gets a notification chime once per ad, the first time it means a message arriving. A
   number that matters gets a pop or an impact, never both.
6. Nothing on the first frame except the first card's pop. No riser into frame 1.
7. A soft whoosh into the end plate; music (if any) fades out **before** the plate.

What Joaquín's own past edits looked like (read from those CapCut projects): about 5 whooshes in 25 s, the library's
"Woosh" (0.4 s) on every transition at 63 % volume, mouse clicks on interface moments, typing sounds on a search box, a
"Deep woosh" on big transitions. Sparse and tied to events, the same philosophy.

### Levels, relative to the voice

Never absolute: the raw level changes from take to take. `gain = voice_level - sfx_level + rel_db`, where the voice
level is the median 100 ms RMS of the speech in that cut.

| Sound | For | Level vs the voice |
|---|---|---|
| tap | a snap zoom, barely felt | -20 dB |
| tick | a list item, typing | -18 dB |
| click | a button on screen | -14 dB |
| swipe | a line or a screen sliding in | -14 dB |
| pop | a card, a chip, a number appearing | -12 dB |
| whoosh (short) | the cut between two beats | -12 dB |
| whoosh | a big full-screen card in or out | -11 dB |
| ding | a win: a result, a check | -11 dB |
| thud | a stamp, a strike-through | -10 dB |
| notify | a message arriving (a generic chime, not an app's real sound) | -9 dB |
| impact | the reveal: the big number, 1 or 2 per ad at most | -8 dB |

### Where the sounds come from

- **Our kit is synthesized in code** ([`sfx_kit.py`](../code/edit-pipeline/scripts/sfx_kit.py)): noise, sines and
  filters, so there is no licence question in a paid ad. `catalog.json` stores each sound's duration, `hit_ms`, its
  own loudness and its default level.
- Libraries that allow commercial use: Pixabay sound effects, Mixkit (check each item), CapCut's library (only items
  marked for commercial use), Meta's Sound Collection (free inside Meta ads, platform-bound).
- Generated effects (ElevenLabs Sound Effects) are commercially usable only on a paid plan.

## Music

Optional, and the person on camera's call. Instrumental only under a voice, even tracks with no drops under the talk.
Duck it with a sidechain on the voice, 18 to 20 dB under the dialogue while someone talks, and cut 2 to 4 kHz on the
bed to clear the voice band. For Meta ads the cleanest route is often no music in the file and a Sound Collection
track added in Ads Manager.

## Loudness

- Master to **-14 LUFS integrated, true peak -1.5 dBTP** (LRA 11): two-pass `loudnorm` on the full mix in the render
  path; one dynamic `loudnorm=I=-14:TP=-1.5:LRA=11` on the concatenated mic audio for the VSL masters (they came out at
  -14.3 LUFS).
- **Measure every export.** Running our QA on one of the ads exported from CapCut gave -13.2 LUFS and a **true peak of
  +0.1 dBTP**: over full scale, because the export has no limiter. Platforms will turn it down and may clip it. The fix
  is a limiter or a loudnorm pass before upload. That is exactly why every file gets measured.

## Keeping sound consistent across ads

In CapCut every ad holds its own copy of each piece ([08](08-capcut-draft-format.md)), so a gain change or a sound
effect added to a piece in one ad is missing from the others. After Joaquín edits one ad, a sync step copies the
compound gain, the take gain, the noise-reduction state and the sound-effect tracks to every other copy of that piece
([07](07-capcut-pre-edit.md)).
