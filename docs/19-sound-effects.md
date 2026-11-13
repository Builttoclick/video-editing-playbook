# 19. Sound effects made in code

Every sound effect in our coded films and animated ads is computed by code: no samples, no library, no licence
question. The bank, the mixer's building blocks and the "ears" come from [earshot](https://github.com/Leonxlnx/earshot),
an MIT tool by Leon Lin that renders 252 sound effects by id and listens to a finished film. Our tools around it are
in [`code/sound-effects/`](../code/sound-effects), and the sounds, already rendered, are in [`sounds/`](../sounds):
take them.

Claude cannot hear ([12](12-sound.md)). earshot is how it gets close: it says what each sound reads as, whether it
lands on its frame, how loud the mix is and how it compares with professional films. Taste stays with Joaquín's ear.
The first 10-second test came back with "it's really good", three times; the 40-second explainer after it with "the
sound effects sound great" (Joaquín's words, translated).

## Why a bank made in code

- **No licence question.** 237 sounds are recipes (noise, modal resonators, filters, a computed room). 15, the `fit/`
  family, are recipes fitted from CC0 recordings: the structure (modes, partials, envelopes) is measured from the
  recording and every sample is computed. A paid ad can carry any of them.
- **By id, in under a second, identical every time.** `earshot sfx render ui_pop/soft -o x.wav` writes the same samples
  on every run. The 54 takes of our kit re-render identical to the files we mixed, and the approved 10 s mix rebuilds
  sample for sample from its cue sheet and kit ([`code/sound-effects/`](../code/sound-effects), "Test the chain").
- **Knobs instead of hunting:** `--seed` for another take of the same sound, `--dur`, `--apex` (seconds to a whoosh's
  loudest moment, so one render fits the move's timing), `--pitch` for the tonal families.
- **The honest limit.** None of the 252 was chosen by a human listening test (upstream says so), and they read as
  code-made to earshot's own realness model: our films scored 0.47 to 0.55 overall, 0.14 in the densest stretch. The
  fitted ones read the most real (a click 0.81, a switch 0.89, a bamboo tok 0.92): reach for them first.

## earshot in one table

Install: [`code/sound-effects/README.md`](../code/sound-effects/README.md). We ran 0.4.0 on a MacBook.

| command | what we use it for |
|---|---|
| `sfx list [--category ui_pop] [--kind whoosh.short]` | the bank: id, length, peak time, the roles it serves, its knobs |
| `sfx render <id> -o x.wav [--seed] [--dur] [--apex] [--pitch]` | one take |
| `kit render kit.json --out audio/kit` | every take of a film's kit, cached, plus `kit.lock.json` with each take's measured onset, peak and end |
| `kit check kit.json --out audio/kit` | the audit: clicks, cut tails, rings, a pitch that missed, a hit with two attacks |
| `rank "<the sound in plain words>" <folder>` | pick a sound without ears |
| `describe x.wav`, `realness x.wav` | what one sound reads as; real or code-made |
| `timeline film.mp4 --cues cues.json` | the listening transcript: every event with its tag and level, sync per cue |
| `sheet film.mp4 --cues cues.json -o sheet.png` | an annotated PNG of the mix: open it and look |
| `critique film.mp4` | a scorecard against 7 professional launch films |
| `measure mix.wav` | LUFS, true peak, loudness range, bands |

`sfx` and `kit` load no models and take under a second. The listening commands load two models first (CLAP and AST,
about 1.1 GB): about 10 s per call on our MacBook once warm, up to a minute cold, cached per file. For many calls,
use one Python process (`from earshot import api`), never a loop of CLI calls. The whole listening pass took 28 to 35 s
on a 10 s film and 1.5 to 5 minutes on a 40 to 50 s one.

## Pick the mode first

It decides how dense the sound is, how levels are set and how the file is mastered.

| mode | what | density | levels | master |
|---|---|---|---|---|
| **A. Effects only** | coded explainers and animated ads ([20](20-animated-films.md)), no voice, no music | every meaningful move sounded, 2 to 4 onsets a second, no silent hole over about 1.7 s | the loudness ladder: effects against each other | -16 to -16.5 LUFS (-17.5 for a thinned revision, below), -2 dBTP |
| **B. Under a voice** | ads, reels, a talking head ([21](21-coded-overlays-on-talking-head.md)) | one cue every 2 to 3 s, tied to what is seen or said | each effect against the voice around it, 6 dB or more under | voice to -14 LUFS, -1.5 to -2 dBTP |
| **C. Music-led** | a film cut to a track | the music carries the rhythm; accents on the reveal and the logo | effects 3 to 10 dB over the music, measured per cue | -14 LUFS, -1 dBTP |
| **VSL** | Joaquín's sales video | no effects, Joaquín's call | | |

## The workflow, mode A

### 1. One cue sheet in frames drives the picture and the mixer

Every event lives in one JSON file, in frames. The picture ([11](11-motion-graphics-in-code.md)) reads it, and so does
the sound script, so a sound cannot drift from its move, and a rewritten headline moves its sounds with it. The
10 s test's whole sheet ([`cues.json`](../code/sound-effects/examples/test-10s/src/data/cues.json); the query is the
Spanish word typed into the search bar, "construction company"):

```json
{"fps": 30, "frames": 300, "query": "constructora",
 "f": {"barIn": 6, "type0": 15, "charStep": 3, "enter": 54, "rows": [60, 64, 68], "mine": 76,
       "chips": [96, 132, 165], "jumps": [[105, 117], [141, 149], [178, 186]], "notifs": [207, 222],
       "words": [243, 248, 253, 258], "logo": 273}}
```

Never time a sound by estimate. The 40 s explainer's sheet adds a typing rhythm, 28 message arrivals and the heatmap's
rings: [`examples/explainer-40s/`](../code/sound-effects/examples/explainer-40s).

### 2. Start from the approved kit

Do not re-pick sounds that Joaquín already heard and liked. Copy the last approved kit
([`kits/explainer-40s-approved.json`](../code/sound-effects/kits/explainer-40s-approved.json), or the grown one with
the newer roles, [`kits/ads-grown-2026-11.json`](../code/sound-effects/kits/ads-grown-2026-11.json)) and add a role
only for a new kind of moment. The kit, role by role, is below.

### 3. Pick a sound for a new moment, without ears

Render 5 to 9 candidates, then let earshot rank them against a plain description of the sound:

```bash
bash code/sound-effects/scripts/audition.sh audio/audition/puff "a soft puff of air, a cartoon poof of smoke" \
  whoosh_fast/sleeve pro_whoosh_big/windy cut_hit/air pro_impact/air swish/soft
```

Read each row's **"sounds most like"** column as much as its score. A high score with the wrong reading loses:

| moment | winner, and what it reads as | the trap next to it |
|---|---|---|
| a gold outline drawing itself | `swish/bright`, z +3.3, "fast whoosh" | `pro_zip/up` scored higher (+3.5) and reads as a record scratch |
| cards scrolling away | `whoosh_fast/tight`, "fast whoosh" | `swipe/paper`, `cloth` and `velvet` read as a punchy impact hit |
| the one click voice | `fit/click/floss_lid`, z +4.0, "soft key release click", realness 0.81 | the pitched `ui_pop/wide` read as a snare hit, realness 0.14 |
| a puff of smoke | `whoosh_fast/sleeve`, z +3.3, "fast whoosh" | `cut_hit/air` and `pro_impact/air` read as kicks |
| a block snapping off a bar | `toggle/latch`, z +3.4, "a quick swipe" | `knock/snap` reads as a keyboard key, `shutter/quick` as a wooden block |
| a review chime | `notify/mid_tine` at E6, "success chime" | `pro_notify/ding_1822` pitched to E6 turns into a wooden block hit |
| a headline line rising | `fit/whoosh.short/bamboo_swish`, first of 12, "fast whoosh", realness 0.98 | the finger tap it replaced read as a snare drum in the mix |

- **Describe the sound, not its use**: source, material, action, character. "A soft quick whoosh of cards scrolling
  away on a phone screen" scored about zero for all 7 whooshes; "a fast soft air whoosh" separates them.
- For short UI sounds most scores land weak or "no match" (z under 2.5). The rank and the reading decide, not the
  absolute number.
- Run `realness` on the candidates next to `rank`.
- `--pitch` can change what a sound is. Audition pitched takes too.
- Some moments have no good match in the bank (a crack: best of 18 read as "a can opening"). Say so; that is where a
  recording earns its place (last section).

### 4. Render and check the kit

```bash
code/sound-effects/scripts/es kit render audio/kit.json --out audio/kit
code/sound-effects/scripts/es kit check audio/kit.json --out audio/kit
```

Swap the sound or the knob on any warned take rather than keeping it. Two notes show on every kit of ours and are
fine: a role name that is not one of earshot's shared roles (our mixer places it), and "riser is sounded" (the one
build into the climax). A riser and a swell both sounded means one build too many: one build per film.

### 5. Write the events on the frame the eye sees

One tuple per sound: `(id, role, frame, pick[, loudness])`, where `pick` is a take index or a pitch label and the
optional loudness overrides the role's level for that one event. The frame is when the eye sees the event, not when
the animation starts:

| on screen | the sound's frame | why |
|---|---|---|
| an element springs in (damping 13, stiffness 190, mass 0.7) | spring start + 2 frames | the spring is 38 % of its travel at 2 frames: the eye reads "there" at about half |
| a letter typed | the frame it appears | one take per letter, never the same take twice in a row |
| Enter | the press + 1 frame | the bar dips on the press |
| a move with an in-out ease | its middle, on the whoosh's peak | an in-out ease is fastest at its middle |
| a line drawn with an ease-out | start + 3 frames, on the peak | an ease-out is fastest in its first frames |
| an exit with an ease-in | end - 6 frames, on the peak | an ease-in is fastest at its end |
| a staggered group leaving | first exit + 7 frames, one softer whoosh | one sound for the group |
| the build into the climax | the move accelerates and stops dead on a contact frame | the hit needs a contact frame |
| a headline line | its first word + 1 frame, one soft swish per line | per word was too many |

On top of that frame, each role carries its own offset (medians measured on professional launch films, from
earshot's presets): a knock 40 ms early, a bell 20 ms early, keys 8 ms late, pops 4 ms late, a card's thud 30 ms
late, the peak of a whoosh 37 ms after its frame. The riser's peak sits 67 ms (2 frames) before the hit.

### 6. Mix and master

`tools/sound.py`, copied from [`templates/sound.py`](../code/sound-effects/templates/sound.py), reads the cue sheet,
renders the kit and calls the mixer ([`sfxmix.py`](../code/sound-effects/scripts/sfxmix.py)): the loudness ladder and
the master chain below. Read its "limiter, hardest" line after every change: up to 5 or 6 dB off a click is normal
(the approved 10 s mix: the knock -6.2, a key -5.2, the hit -5.1); more than that on one role means its level is too
high for this film.

### 7. Listen back

```bash
bash code/sound-effects/scripts/listen.sh out/film.mp4 audio/cues_earshot.json out/qa
```

It runs `timeline --cues`, `sheet`, `critique` and the decoded loudness of the MP4, and keeps every earlier pass in
`qa/vN`. Then **open `qa/sheet.png`**: holes, pile-ups, a band running under a passage and a late hit show at a glance.
Read the sync line against chance: "Sync to 35 cues: 97% have an onset within 1 frame (chance 26%), 100% within
100 ms, median 17 ms" means something; a number near chance does not.

| what to reach, effects only | our approved films | earshot's own range |
|---|---|---|
| integrated loudness | -16 LUFS | -16 to -9 for the web |
| decoded true peak | -0.3 to -1.5 dBTP | under 0 dBTP |
| cues within one frame / within 100 ms | 93 to 97 % / 99 to 100 % | |
| longest silent hole | under 1.7 s | flagged over 1.91 s |
| dead air at the end | under 0.5 s | |
| onsets per second | 2.2 to 3.9 | |

Flags that stay by design in an effects-only film, and are reported as such: music presence 0 % (critical: the
references are films cut to music), realness about 0.5 (the bank is code-made), mids 1 to 4 kHz high (no music under
them). With a voice, "too many salient hits" counts the speaker's consonants.

### 8. Fix one thing at a time

Two to four passes is normal. What earshot heard, what it was, and the fix that worked:

| earshot heard | it was | fix |
|---|---|---|
| "chiptune video game music, plucked synth arpeggio" | one tuned pluck per word | no notes on text: a soft air swish per line |
| "glitch hop music, drum machine" | typing at an even 100 ms | a human rhythm (below) |
| "kick drum", "small soft footsteps" (55 Hz) | 19 word taps high-passed at 160 Hz | 400 Hz, one tap per line, later a swish |
| the hit "-52 ms near", only 10.9 dB over the bed | the riser covering the hit's attack | riser cut at its peak, 2 frames early |
| "drum hit", the loudest accent of the outro | a finger tap on the logo | a glock note at first; a thud once melody was out |
| a band near 100 Hz under the typing (on the sheet) | the key bodies | 4th-order high-pass at 180 Hz (60 to 140 Hz went from 17.5 to 33.1 dB under the clicks) |
| a 71 Hz thump on Enter | `typing_key/deep` | the same key as the letters, on its own seed |
| "upbeat corporate pop music, glockenspiel" over a whole section | pitched pops, a bell climb and a flood on one scale | no melody (Joaquín's taste, below) |
| no onset for 12 message arrivals | one pitch repeated 2 frames apart fused into a held note | a 0.12 s ring for packed arrivals |
| "telephone dialing, dtmf" under the voice | typing keys under speech | cut texture under speech |

## The approved kit, role by role

The 40 s explainer's kit (version 4) plus the roles the animated ads added. `align` is the point of the take that
lands on the frame. The rendered takes of the grown kit are [`sounds/kit/`](../sounds/kit).

| role | sound | knobs | align, offset | moment |
|---|---|---|---|---|
| land | `pro_pop_in/round` | | onset, +30 ms | a search bar, a card, the logo landing |
| land.big | `pro_pop_in/deep` | | onset, +30 ms | a bigger card (a map) |
| key | `typing_key/clicky` | 12 takes, at least 87 ms apart | onset, +8 ms | one letter |
| key.return | `typing_key/clicky` | its own seed | onset, +8 ms | Enter |
| pop | `ui_pop/soft` | 3 takes, at least 114 ms apart | onset, +4 ms | results arriving |
| chip, tag | `fit/click/floss_lid` | 5 takes; the tag its own seed | onset, +4 ms | chips, a new rank, a flip: one dry click voice |
| tock | `knock/wood` | | onset, -40 ms | "your business" appears; a read receipt |
| whoosh.short | `whoosh_fast/crisp` | dur 0.6, apex 0.25 | peak, +37 ms | the long move |
| swish | `swish/flick` | dur 0.4, apex 0.14 | peak, +37 ms | the short move |
| scroll, exit, zip | `whoosh_fast/tight`, `swipe/glide`, `swish/bright` | | peak, +37 ms | a page scrolling, a list leaving, a line drawing itself |
| riser | `riser/dark` | dur 0.8, cut at its peak | peak, -67 ms | the one build, into the climax |
| hit | `cut_hit/punch` | pitch C2 | onset, 0 | the climax (a card reaching #1) |
| ding.wa | `notify/mid_wood` | pitch C6 | onset, 0 | a message arriving, always the same tone |
| flood | `notify/mid_wood` | pitch C6, dur 0.12 | onset, 0 | arrivals packed closer than 5 frames |
| text, text.long | `fit/whoosh.short/bamboo_swish` | dur 0.3; 0.45 for 4+ words | peak, +37 ms | a headline line rising, high-passed at 400 Hz |
| tick | `pro_hover_tick/soft` | 3 takes | onset, 0 | suggestions, typing dots, rings filling |
| send | `fit/pop/mouth_plop` | | onset, +4 ms | the viewer's own message leaving |
| clock, cross, crack, drip, shutter, swell | `fit/tick/domino`, `knock/plastic`, `shutter/snap`, `drip/bubble`, `whoosh_big/deep`, `reverse_swell/dark` | | | the animated ads' new moments |
| off | shimmers, logo stings, bells, a second build | | | Joaquín's taste, below |

## The loudness ladder

**Levels by loudness, never by peak.** Each role has a level for its loudest 50 ms, K-weighted, on the LUFS scale
(earshot's `kit.loud_lufs`), and each take's gain is that level minus the take's own. A click with a huge crest and a
long soft whoosh then sit where the ear puts them.

**With no music bed, never use earshot's launch preset levels** (`level_db`). Those balance effects that ride over
music. On the 10 s test with no bed they made the 12 key presses as loud as the climax hit, and the limiter took 6.9 dB
off the keys. The order that works comes from earshot's effects-only presets: **the hit loudest, the keys about 11 dB
under it.**

| role | 10 s test (approved) | 40 s explainer v4 and the animated ads |
|---|---|---|
| hit | -10 | -22 (ads -24) |
| riser | -14 | -19 |
| whoosh.short, swish | -15, -16 | -18 |
| land, land.big | -16 (no land.big) | -21, -19.5 |
| tock (knock) | -16 | -21 |
| pop | -17 | -18.2 |
| chip | -16.5 | -26 (ads -27.5) |
| ding.wa | -15 | -16.7 |
| key, key.return | -21, -18.5 | -26.5, -24 |
| text | -22 (taps) | -28.5 (swishes) |
| tick | | -32 |
| master | -16.0 LUFS, -1.5 dBTP | -17.5 LUFS (ads -16.5), -2 dBTP |

These numbers are before the master and are not comparable from film to film: what you hear is the balance after the
master. In the 10 s mix the limiter took 5.1 dB off the hit and 3.6 dB off the keys; in the 40 s v4 mix it took 0.4 dB
off the hit and 3.8 off the keys. So from version 3 of the 40 s film on, we set the levels by measuring the balance
after the master against the approved mix ([`balance.py`](../code/sound-effects/scripts/balance.py)), and the
pre-master numbers in the right column are what that produced.

A sparser film needs more make-up gain to reach the same loudness, which pushes the transients into the limiter: on
the 40 s film at the 10 s values, the limiter took 8 dB off the hit. Lower the hit, the knock, the card thuds and the
keys 1.5 to 2 dB.

### Why a version with fewer sounds plays at -17.5 LUFS on purpose

Version 3 of the 40 s film removed every bell and thinned the message flood. The raw program fell from -25.1 to
-29.8 LUFS, so holding the old -15.8 LUFS target turned every remaining effect up about 2.6 dB: the hit came out
0.6 dB louder than before even after its level went down 2 dB, and 30 click takes were squashed by more than 6 dB.
Matching each effect against the integrated loudness cannot converge either (once the sustained bells are gone, every
effect stands about 1.6 dB further out; a 6-pass solver drove every level down 10 dB). What worked: compare the
balance between effects with the approved mix, set the levels from it, and let the master target follow. At -17.5
LUFS every effect sat within about 1 dB of the approved balance except the hit (-1.9 dB) and the riser (-2.5 dB),
both lowered on purpose after a note from Joaquín (below). earshot then flags the loudness as low for the web: report
it as the price of keeping the approved balance, and offer to raise it if it plays too quiet on a phone.

## The master chain

All of it is in [`sfxmix.py`](../code/sound-effects/scripts/sfxmix.py), and with the 10 s film's settings it rebuilds
that approved mix sample for sample.

1. **Each take as the mix uses it:** stereo, a 4th-order high-pass on the roles that own no low end (keys 180 Hz, text
   400 Hz, the clock 300 Hz; a 2nd-order filter at 140 Hz did not clear the band under the typing), the riser cut at
   its measured peak with a 12 ms fade.
2. **Two buses.** Low tonal bodies (the hit, the card thuds; in the ads also the riser, the swell and the shutter) go
   on a clean bus that only the limiter touches. The first try ran the hit through the soft knee and bent its sub for
   26 ms.
3. **A soft knee on the clicks.** Set by loudness, clicks overshoot by 5 to 6 dB in their first millisecond. A tanh knee
   above -4.5 dBFS, 4x oversampled so the bent peaks do not alias, shaves 1 to 3 ms per click before the limiter.
4. **A true-peak limiter** on the sum: earshot's look-ahead limiter (2.5 ms look-ahead, 80 ms release) at -2 dBTP.
5. **Make-up gain** aimed at the target, re-aimed up to 3 times until within 0.15 LU (clipping and limiting cost a
   little loudness). A 40 ms fade on the last samples, so the file never ends on a click. A 24-bit WAV.
6. **The mux:** H.264 tagged BT.709, broadcast range (Remotion's frames come out full range and the colours shift on
   phones otherwise), and **AAC that does not clip**.

AAC overshoots sharp sounds. Measured on the 40 s film with a -1.5 dBTP master, the decoded true peak was:

| encoder | decoded true peak |
|---|---|
| ffmpeg `aac`, 256k | +0.5 dBTP (clips on playback) |
| ffmpeg `aac`, 320k | +0.1 |
| Apple `aac_at`, 256k | +0.1 |
| Apple `aac_at`, 320k | -0.1 |

So: master at -2 dBTP and encode with `aac_at` at 320k (the 40 s film then decoded at -0.3 dBTP), and always measure
the encoded file, not the WAV (`listen.sh` writes it to `qa/decoded.txt`). `aac_at` exists only in macOS builds of
ffmpeg; elsewhere, use `aac` at 320k with the -2 master and measure.

| target | integrated | master true peak | decoded |
|---|---|---|---|
| effects only | -16 LUFS (master target -15.8, lands at -16.0 once encoded); the ads -16.5 by Joaquín's ear | -2 dBTP | under 0 dBTP |
| under a voice | -14 LUFS | -1.5 to -2 dBTP | under 0 dBTP |
| music-led | -14 LUFS | -1 dBTP | under 0 dBTP |

Instagram, TikTok and YouTube normalise playback near -14 LUFS and only turn loud uploads down; Apple's players aim
near -16; X, LinkedIn and autoplay on a website do not normalise at all.

## Joaquín's taste, as rules

These beat any metric. Each came from a version Joaquín heard.

1. **No melody.** On version 2 of the 40 s film: "it sounds a lot like a toy keyboard... very piano, very keyboard,
   very sweet, very soft". The chip triad, a bell climbing a scale on each new rank, the message flood walking a
   pentatonic and a glock on the logo had added up to a tune; earshot had tagged that stretch "upbeat corporate pop
   music, glockenspiel" (music 0.34) and nobody read it as a problem. **A section tagged as music in an effects-only
   film is the alarm.** After the fix the same stretch read "plop, whack, thwack, whoosh, swish" (music 0.02). The
   pitched sounds were also the least real of the bank (the glock 0.07).
2. **No shimmer, no sparkle, no fairy sounds.** "I don't like that kind of fairy sound at the end." The `shimmer`,
   `pro_shimmer`, `logo_sting` and `pro_logo_sting` families are out.
3. **A repeated event repeats the SAME sound at the same pitch.** "A message tone that is monotonous, always the
   same." One ding, one pitch, every message, like a real phone. A single tonal sound on its own (the message ding,
   the hit on its root) is fine.
4. **One ding per message, even when they blend into a roll.** Version 3 kept at least 4 frames between dings (19
   dings for 28 cards) so each had its own onset; Joaquín asked for "a ding for each one of the messages", all 28. The
   last 12, 2 frames apart, blend into one fast roll (earshot finds no separate onset for 11, and the sync line drops
   to 84 % within one frame). Report it, keep it: it is the taste.
5. **Dry clicks and thuds over mallets.** One click voice (`fit/click/floss_lid`) for every chip, tag and flip.
6. **End on a thud.** The logo lands on the card thud with an end card that moves, not on a glock.
7. **Typing on an uneven rhythm.** Even 100 ms keys read as "glitch hop music, drum machine". A gap pattern in frames
   (the 40 s film: `[2, 2, 1, 2, 3, 2, 2, 1, 2, 2]`, cycled) plus one beat more after a space; the picture types on
   the same frames.
8. **Word taps, if any, high-passed at 400 Hz.** At 160 Hz, 19 of them read as a kick drum. On a short film with 4
   taps, 160 Hz was right: 400 Hz pushed the critique's low-band share out of range there.
9. **Text that moves gets a swish, not a tap.** One soft air swish per headline line (`fit/whoosh.short/bamboo_swish`,
   0.3 s, 0.45 s for lines of 4 words or more), its peak while the first word rises, none on a line whose rise meets a
   whoosh already moving. Heard as "fast air whoosh / whip pan" on 18 of 21 lines, all on time, and it lifted the
   whole film's realness from 0.50 to 0.82.
10. **No silent hole over about 1.7 s and no dead air at the end**, in an effects-only film. Fill a hole with sound on
    something that already moves on screen (a pulse, a wave through the dots, a late message, an end card that
    glides), never with a bed. earshot's list of holes is the quickest map of beats where nothing moves: the fix is
    usually in the picture, and the sound follows. An end card of 190 frames left 3.6 s of dead air; 130 frames was
    right.
11. **When something feels over the top, take it down 2 to 3 dB and ask which moment.** "Sometimes one effect is a
    bit exaggerated" (no moment named): the riser and the hit went down against the other effects.
12. **Pace:** Joaquín reads fast. A faster cut opens silent holes: rule 10 still holds.
13. **The VSL has no effects.** In CapCut, the volume Joaquín sets by ear is final.

## Mode B: effects under a voice

Joaquín's rule: the effects never sound louder than the voice, and the voice is raised or lowered with almost no
distortion.

- **Placement** follows [12](12-sound.md): every effect tied to something seen or said, one cue every 2 to 3 s, one
  sound per moment, at most 1 or 2 impacts per ad.
- **Levels against the voice, never the ladder.** The ladder balances effects against each other with nothing else
  playing; under a voice it would bury the speaker. Each effect's loudest 50 ms is set at the speaker's median 50 ms
  speech level plus a per-role offset. The set that held on ten ads: impact -6, message ding -8, knock -9, card thud
  -12, click -12 to -13, whoosh and swish -13, pop and zip -14, tap -16, tick -21; a message flood from -9 fading to
  -18. On the talking-head version of an animated ad: ding -9, send -12, hit -8, land -10, pop -12, chip -14,
  whoosh -14, exit -15, key -18, tick -21. earshot's own over-the-music model (`bed_db`) does not apply here: it can
  only put an effect over a bed.
- **Prove it with the stems:** [`under_voice.py`](../code/sound-effects/scripts/under_voice.py) compares every effect
  with the voice's loudest 50 ms around it and exits 1 on any effect louder than the voice. On ten finished ads: 0
  louder, the tightest margins 11.9 to 14.7 dB. A first pass 2 to 3 dB quieter sat 14 to 29 dB under: safe, but
  likely lost on a phone speaker.
- **The voice, without distortion:** a high-pass at 80 Hz, a phrase rider (each phrase toward the median, within 4 dB,
  smoothed over 0.3 s), a 2.5:1 compressor, make-up to -14 LUFS, then earshot's limiter at -2 dBTP. The limiter's work,
  measured per 10 ms block: 2.9 dB at most, on 2.5 % of the loud blocks; the crest went from 21.4 to 14.7 dB. If more
  than 5 % of the loud blocks lose over 1 dB at -14 LUFS, lower the target 0.5 dB at a time (to -15 at most): one hot
  take needed it.
- **Cut texture under speech.** Typing keys under "write to me on WhatsApp" read as "telephone dialing, dtmf"; cutting
  them with the small pops under the voice took one ad from 62 effects to 42.
- **Pan each effect with its element** (constant power, at most 0.6): critique's "nearly mono" was real. The voice
  stays in the middle.
- **Sync reads lower with a voice:** 57 % of 42 cues within one frame (chance 46 %), 95 % within 100 ms, median 23 ms.
  The speech onsets crowd the matcher: read the sheet, not only the percentage.
- **Into CapCut:** render each effect as its own WAV named by its moment, start it on a frame with the sub-frame lead
  as silence inside the file, and let Joaquín set the volume by ear. Then run `listen.sh` on the export anyway.

## Mode C: music

earshot's launch preset is built for films cut to music: effects ride 3 to 10 dB over the music and read by timing and
spectrum. Per cue, `kit.bed_level(music, t)` measures the music in the second before and `kit.gain_db(take, role,
bed)` sets the take; the music dips 6 to 12 dB for 0.3 to 0.5 s before a hit or a big whoosh, never under every
effect. We have not shipped a film cut to music yet.

What we did ship is **music under a voice**, on a client's ten ads. Two stock tracks were picked by asking earshot
how well each matched what we wanted against what we did not (piano, bells, sweet corporate, dark trailer); one more
was rejected because earshot heard speech in it (vocals). Joaquín heard both finalists and picked the trap beat over
the tech-house track, although the second scored a point higher on the critique. The recipe that went on all ten:

- the bed 15 LU under the voice, plus a 4 dB sidechain duck while the voice talks: 19.5 to 20.6 dB under the voice
  (median) on every ad, the closest 5 % 13.4 to 16.3 dB, every music transient 14 dB or more under the voice;
- the track's drop on the ad's payoff, or opening the ad when there is none; map the track first (1 s loudness plus
  a low band) and check every ad's span fits inside the usable part;
- critique went from 16 to 19 of 23 metrics in range, music presence from 0 % to 75 to 100 %.

## When sync "felt off"

On version 3 of the 40 s film Joaquín said of the text sound: "I can't tell if it is out of sync or just not a good
match". The timing was fine: every text tap sat within 5 ms of its frame (the per-cue offsets in earshot's
`timeline.json`). The sound was wrong: in the mix earshot heard 12 of the 22 taps as "a snare drum hit". The words
rise with a blur, so a contact sound had nothing on screen to match. A swish per line fixed it (rule 9).

**When someone says the sound is out of sync, check the per-cue offsets first. If they are within a frame, it is the
sound, not the timing:** read the event labels on those cues. A drum label on text is the mismatch the ear hears.

## The 44 ms AAC priming trap

Apple's AAC encoder (`aac_at`) writes 2112 priming samples in front of the audio: 44.0 ms at 48 kHz (47.9 ms at
44.1 kHz). A normal MP4 hides them with an edit list. Meta's video guide asks for no edit list in the container, so
our Meta-ready files are muxed with `-use_editlist 0` ([14](14-masters-and-web.md),
[`code/meta-export/`](../code/meta-export)), and then nothing hides them: **every player starts the sound 44 ms after
the picture.**

How it showed: earshot read the first mix of an animated ad as 47 % of cues within one frame, with every soft tick
"+44 ms near". The dense typing runs still read OK, because each onset matched the next key: the clean signal of a
constant delay is the soft single sounds (ticks, pops, thuds) all late by the same amount. Cross-correlating the
decoded MP4 against `mix.wav` gave a lag of exactly 2112 samples.

The fixes, by case:

- **Nothing sounds in the first 44 ms** (our effects-only films): trim the priming off the mix before the encoder.
  That ad went from 47 % to 90 % of cues within one frame, median 17 ms.
  ```bash
  # the trim and the flag that matter here; add the colour tags and the rest of the Meta flags from 14
  ffmpeg -i out/picture.mp4 -i audio/mix.wav -map 0:v -map 1:a -af atrim=start_sample=2112 \
    -c:v libx264 -crf 16 -c:a aac_at -b:a 320k -ar 48000 -use_editlist 0 -movflags +faststart -shortest out/film.mp4
  ```
- **A voice from the first frame:** nothing can be trimmed. Hold the first frame 2 frames longer and pad the mix with
  1088 samples (2 frames are 3200 samples at 48 kHz, minus the 2112 of priming): the decoded audio then lands exactly
  on its frame, with no edit list and nothing cut.
- **When the platform does not need it, keep the edit list:** the lag measured 0.0 ms.

**Check every new chain once by cross-correlation, never by ear.** Decode the MP4 and compare it with the mix at 3 or
4 points. On the 10 s test, a remux with `-c copy -use_editlist 0` printed 2112 samples, 44.0 ms late, at every
point; the command above printed 0.

```python
import subprocess, numpy as np, soundfile as sf
mix, sr = sf.read("audio/mix.wav", always_2d=True)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "out/film.mp4", "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"],
                     capture_output=True, check=True).stdout
dec = np.frombuffer(raw, np.float32)
for t in (2, 12, 22):                                      # seconds into the film
    a, b = mix[t * sr:(t + 1) * sr].mean(axis=1), dec[t * sr - 4000:(t + 1) * sr + 4000]
    lag = int(np.argmax(np.correlate(b, a, mode="valid"))) - 4000
    print(t, "s:", lag, "samples", round(lag / sr * 1000, 1), "ms late")
```

## Numbers from real runs

| film | effects | loudness | sync, within 1 frame / 100 ms | critique | longest hole |
|---|---|---|---|---|---|
| 10 s test (approved) | 35 | -16.0 LUFS, -1.5 dBTP master | 97 % / 100 %, median 17 ms | 20 of 23 (86 %) | |
| 40 s explainer, first pass | | | | 16 of 23 (60 %), 2.0 onsets/s | five holes of 2.5 to 2.9 s, 2.6 s of dead air |
| 40 s, version 1 final (approved) | 88 cues | -15.9 LUFS, decoded -0.3 dBTP | 93 % | 19 of 23 (80 %), 0 major | 1.52 s |
| 40 s, version 2 | 131 cues | -15.8 LUFS, decoded -1.4 dBTP | 91 % / 100 %, median 14 ms | 19 of 23 (80 %) | 1.66 s |
| 40 s, version 3 | 121 cues | -17.5 LUFS, decoded -1.0 dBTP | 92 % / 100 %, 0 missed | 19 of 23 (81 %) | 1.68 s |
| 40 s, version 4 | 129 cues | -17.5 LUFS, decoded -0.7 dBTP | 84 % / 89 % (the blended roll) | 19 of 23 (82 %) | 1.72 s |
| seven animated ads, 37 to 49 s | 106 to 198 | -16.6 to -16.7 LUFS, peaks -0.8 to -1.6 dBFS | 77 to 87 % / 96 to 100 %, median 1 to 18 ms | 18 to 20 of 23 (74 to 84 %) | 1.56 to 2.26 s |
| ten ads with a voice | 7 to 51 each | voice -14 LUFS (one hot take -15), every effect 11.9 dB or more under it | 57 % / 95 %, median 23 ms (one ad) | 16 of 23 without music, 18 and 19 with a bed (one ad) | |

## Field notes

- earshot is `github.com/Leonxlnx/earshot`, not `pykeio/earshot` (a voice-activity detector with the same name).
- In zsh, `E="python -m earshot"; $E measure` fails: zsh does not split a variable into words. Write
  `"$PY" -m earshot ...` or use the `es` wrapper.
- earshot's stderr carries log noise (lines like `W1103 18:02:11...`); the `es` wrapper filters it.
- `earshot rank` prints the winner on the third line. Cutting the output from line 4 hid it from us once.
- Picking a sound without ears works: 5 to 9 candidates, a description of the sound, the "sounds most like" column.
- earshot's tags are hints and its z scores are relative. A tag that names a different class of thing (a drum, music,
  speech) is the real signal.
- `kit check` after every `--dur` change: at 0.10 s the message ding's tail was cut at -5 dB (a click); at 0.12 s it
  still reads "ring, truncated", so the mixer fades its last 20 ms.
- The SAME tonal hit repeated closer than about 5 frames fuses into one held note. A short ring for the packed ones.
- A sound that fused also made the message flood the loudest 3 s of the film by 5.5 LU: ease a flood down 6 dB.
- A riser masks the hit: cut it at its peak and put the peak 2 frames before the hit (a micro stop-down).
- One build per film: a riser or a swell, never both.
- Never stack a second accent on the hit's attack frame.
- A new click voice set by loudness peaked so hard the limiter took 12 dB off it, and a squashed click reads soft.
  Read the "limiter, hardest" line after every role swap.
- Measured over 50 ms, a 10 ms click reads 8 to 10 dB under a 190 ms pop at the same peak: compare a click's balance
  with another click (the keys), not with the sound it replaced.
- Removing sounds makes the master turn the rest up. Compare the balance with the approved mix, let the target follow.
- With no music bed, earshot's launch levels made the keys as loud as the hit. Levels by loudness.
- The clipper bent the hit's sub for 26 ms. Low tonal bodies go on a clean bus.
- `typing_key/deep` for Enter is a 71 Hz thump; Enter is the same key on its own seed.
- `swipe/paper`, `cloth` and `velvet` read as impact hits. A finger tap on a logo read as the loudest drum hit of the
  outro.
- `--pitch` can turn a chime into a wooden block. Audition pitched takes.
- 21 soft swishes on the text lifted the whole film's realness from 0.50 to 0.82: a few `fit/` sounds change how the
  whole bank reads.
- The fitted sounds (`fit/`) are the bank's most real (0.81 to 0.92); the glock read 0.07, the pitched pop 0.14 and
  even the approved soft pop 0.03.
- AAC overshoots clicks: ffmpeg's `aac` at 256k took a -1.5 dBTP master to +0.5 decoded. Master at -2, `aac_at` 320k.
- Remotion's frames are full range (yuvj420p): convert to broadcast range BT.709 in the mux.
- A file with no edit list plays its AAC 44 ms late (above). On other chains the same trap measured 48 to 50 ms
  (2112 samples at 44.1 kHz are 47.9 ms): measure each chain once.
- A constant offset in every window of a cross-correlation is the codec's priming, not an edit.
- With a voice, critique's "too many salient hits" counts the consonants (1.91 per second barely moved after cutting
  20 of 62 effects): it is not a density alarm.
- With a quiet bed under continuous speech, critique can say music is heard in only 50 % of windows: check the music
  stem, it is detection, not absence.
- A hole can be the point: a message left on read, 2.3 s with nothing arriving. Critique flags it; keep it and say so.
- A sound with two onsets (`toggle/latch`: a soft swipe, then the click 0.13 s later) aligns on its peak, the click,
  at the visual snap; `under_voice.py` lists both onsets.
- `--dur` and `--apex` fit one render to a move: a fill that eases out is fastest at its start, so a 0.7 s swish with
  its apex at 0.12 s.
- A chat film needs two voices, not a melody: the same ding for every incoming message, a soft pop for the viewer's
  own message leaving, three ticks on the typing dots' first wave only.
- To change the music on files already delivered, copy the video stream and swap only the audio: frames and timestamps
  stay identical to what is already uploaded.

## Recorded sound, when a brief needs it

The bank is code. When a brief asks for recorded sound (or a moment has no good match, like the crack), these are the
sources we checked for paid work. None of their files are in this repo.

- Kenney's audio packs: [UI Audio](https://kenney.nl/assets/ui-audio) (50 sounds),
  [Interface Sounds](https://kenney.nl/assets/interface-sounds) (100),
  [Impact Sounds](https://kenney.nl/assets/impact-sounds) (130). CC0, free in commercial projects, no attribution, no
  account.
- [Remotion's own sound effects](https://www.remotion.dev/docs/sfx), only the ones marked CC0 (a whoosh, a whip, a
  mouse click, a switch, a page turn, two shutters); the others are not free.
- [Freesound](https://freesound.org), items marked CC0, downloaded by hand from the website (we read its API terms as
  non-commercial).
- [Stable Audio 3 Small SFX](https://huggingface.co/stabilityai/stable-audio-3-small-sfx) (Stability AI): text to
  sound effect, a few seconds on a recent MacBook, MLX builds exist. Gated, and commercial use needs Stability's
  community licence (read its terms).
- [audiobox-aesthetics](https://github.com/facebookresearch/audiobox-aesthetics) (Meta, CC-BY 4.0): not a source but a
  judge earshot lacks, scoring production quality, complexity, enjoyment and usefulness from 1 to 10.
- earshot's own `skills/real-sound`, in its repository: a whole soundtrack from licensed real recordings, with a licence
  audit and credits.

Check every candidate with `earshot realness` and the same `rank` as the bank.

## Files

| | |
|---|---|
| [`code/sound-effects/`](../code/sound-effects) | the scripts (mixer, listening pass, audition, the under-the-voice and balance checks), the template, both kits, two real cue sheets |
| [`sounds/kit/`](../sounds/kit) | the grown kit as the 54 WAV takes we mixed, with the role table |
| [`sounds/bank/`](../sounds/bank) | all 252 sounds of the bank as MP3, with a catalog |
