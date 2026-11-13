# 20. Animated films: an ad with no camera

In November we made eight ad scripts twice: once with Joaquín on camera, once as a film with nobody on camera and no
voice. The second kind is this doc: a vertical film (1080x1920, 30 fps, 37 to 49 s) made only of coded graphics, the
script itself on screen word by word, and sound effects made in code. Seven of them came out of one Remotion project
in one night, so an ad test can compare the format and not the words.

| | | | |
|---|---|---|---|
| [![Right now](../examples/images/poster-animated-right-now.jpg)](../examples/videos/animated-right-now.mp4) | [![The man from Brazil](../examples/images/poster-animated-chatgpt-story.jpg)](../examples/videos/animated-chatgpt-story.mp4) | [![The three-second test](../examples/images/poster-animated-three-second-test.jpg)](../examples/videos/animated-three-second-test.mp4) | [![The night shift](../examples/images/poster-animated-night-shift.jpg)](../examples/videos/animated-night-shift.mp4) |
| problem, agitation, solution | hook, story, offer | a challenge | a number and a day in the life |

![Moments of the animated films](../examples/images/animated-strip.jpg)

The example copies stop right before the end card, which carries our price. The code is in
[`code/animated-films/`](../code/animated-films), with every price replaced by a placeholder. The chat film that
started the kit, and its talking-head double, are in [`code/talking-head-double/`](../code/talking-head-double).
The sound side has its own doc: [19. Sound effects](19-sound-effects.md).

## One codebase, seven films

Each film is three files of its own, and everything else is shared:

```
src/films/anNN/copy.json     every word on screen: the text beats, the queries, pages and messages, the end card
tools/films/anNN.py          cues(copy): every frame, written in seconds; events(cues, copy, LOUD): every sound
src/films/ANNN.tsx           the film: scenes gated by the cue frames, drawn with the shared kit
```

`tools/timeline.py anNN` runs the cue module and writes `src/films/anNN/cues.json`. **The picture and the mixer read
that same file**, so a sound cannot drift from its move: rewrite a line, re-run the timeline, and the words, the
graphics and the sounds all move together.

A cue module reads like a shot list with numbers:

```python
s.beat("name", 3.3, 5.6)                                     # a text beat: in and out, in seconds
f["nameTyped"] = type_frames(copy["business"], F(3.7))       # the business name typed into WhatsApp
f["send"] = F(5.2)
f["cards"] = {"in": F(5.9), "out": F(9.5), "at": [F(6.0), F(6.5), F(7.0), F(7.4)]}   # four cards, one by one
f["lens"] = {"at": F(6.2), "dur": F(2.8)}                    # a magnifier passing over them
```

and the film reads the frames back (`const F = cues.f`), never a typed number of its own. A new film is a copy of the
closest of the seven, a new `copy.json`, new seconds in the cue module and a new scene file.

## The script is on screen

With no voice, the text carries the script. `Head` draws one text beat: it fits the widest line into 960 px, the
words spring in two frames apart (three more frames at each new line), gold words come from the copy, and the lines
leave upward with a blur. `Beats` draws every beat of a film from the cue sheet.

**How long a beat stays.** At least `0.55 s + words / 4.2`, with a floor of 1.5 s. `timeline.py` prints the table and
warns when a beat is short:

```
an06: 11 text beats
    0.10 -   3.30  hook        10 w  need 2.9  has 3.2
    3.30 -   5.60  name         7 w  need 2.2  has 2.3
    5.60 -   9.50  look        14 w  need 3.9  has 3.9
```

The rule came from Joaquín's review of our first coded explainer, which held each headline two or three seconds after
it was fully on screen: "el humano puede leer más rápido" (people read faster than that), compress it and explain
more things. So a headline holds about its reading time and moves on, and **the saved seconds carry another idea**:
the real searches people type, a one-line meaning under a point, a before and after. Joaquín reads fast; the films
are written for that.

**Typing like a person.** Every typed text (a search, a message, a name) uses one rhythm: a pattern of gaps cycled per
letter (`2, 1, 2, 2, 1, 3, 2, 1, 2, 2, 1, 2` frames) and three frames after a space. An even rhythm sounds like a drum
machine once each letter has its key click. The same sum lives in `src/lib/anim.ts` (`typeFrames`) and in
`tools/films/common.py` (`type_frames`), so every click lands on its letter.

## The kit

| Piece | Where | What it is for |
|---|---|---|
| Google page with keyboard | `Google.tsx`, `Phone.tsx` | the search bar typing a query, suggestions dropping under it, Enter, three invented results, a tap. A search is shown as the bar typing, never with a logo |
| The generic premium page | `Site.tsx` `SitePage` | an invented business: a headline that writes itself, three house or truck "photos", services, the WhatsApp button that stays while the page scrolls, gold callouts for what it does, where and for whom |
| The cheap template page | `Site.tsx` `TemplatePage` | a slider, "Bienvenidos" (welcome), a paragraph that says nothing, no button in sight |
| The empty page | `Site.tsx` `EmptyPage` | dashed placeholders where the words should be, and a question mark |
| Scan line | `Site.tsx` `Scan` | a gold line reading a page top to bottom (what Google or ChatGPT does) |
| WhatsApp | `Wa.tsx` | the thread (dark theme, Roboto, its own greens), a floating bubble, the lock-screen notification, the icon with its red counter |
| The flood | `AN02.tsx` | messages flying from three scenes of a day into one phone, then a burst, the counter climbing on each arrival. The explainer's version ends on a 99+ counter ([GIF](../examples/images/whatsapp-flood.gif)) |
| Calendar strip | `Kit.tsx` `CalendarStrip` | 14 tiles that flip over in gold one by one, a check on the last, a `pulse` ring on a day |
| Proposals | `Kit.tsx` `Proposals` | three design directions fanned out, the middle one picked |
| Panels, chips, marks, price tags, gold 3D type | `Kit.tsx` | slabs with real thickness, gold pills, a check or a red cross, a tag swinging from a pin, extruded numbers |
| End card | `EndCard.tsx` | a board that swings in like a door, the closing line word by word, the price, the WhatsApp pill, an arrow down to Meta's button, the logo |
| A real globe | `Globe.tsx` | Natural Earth coastlines (`world-atlas` 110m) in an orthographic projection with `d3-geo`, two countries lit, a route from Europe that draws itself with a cargo icon riding it, pins |
| A ChatGPT-like box | `Gpt.tsx` | dark, no logo: the question typing itself and the answer writing back with a gold underline |
| Houses | `Houses.tsx` | two houses built course by course, then the move in |

The 3D rules of [doc 11](11-motion-graphics-in-code.md) hold here: one shared camera, opacity and blur only on the flat
wrapper (`Obj`), never inside a 3D group.

## Everything inside Meta's 4:5 band

A 9:16 ad also runs in the feed, where Meta crops the 1080x1920 master to 1080x1350: only **y 285 to 1635** survives.
Joaquín's rule since that review: every element of every film lives inside that band, so the 4:5 cut is the same film
with less stage above and below. It is one constant in `src/theme.ts`:

```ts
export const SAFE = { y0: 285, y1: 1635 };
export const TEXT = { top: 336, width: 960, max: 64 };   // the headline block, at the top of the band
export const ZONE = { y0: 640, y1: 1600 };               // the graphic under it
```

`tools/qa.py` proves it on the finished file, not on the code: it takes a frame every 0.6 s and, for each frame, the
strongest horizontal edge in every row above y 285 and below y 1635. The stage behind everything is a smooth gradient,
so its edges are tiny; text, cards and icons are not. Any frame with an edge over 24 outside the band is listed. It
also writes the contact sheet with the two cut lines drawn, and the same frames cropped the way the feed shows them
(`crop45.png`). All seven films came out clean.

## The chat film's tricks

The first film of the set ([`code/talking-head-double/`](../code/talking-head-double), composition `AN01`) is the
viewer's own WhatsApp: questions on the right, answers on the left, ideas coming out of the phone in gold. Three
things make it read as the real app:

- **Messages stack from the bottom.** Every message's height counts from its first frame, scaled by its spring, and
  the thread is laid out from the compose bar upward, so the messages above slide up as a new one lands, the way the
  app does it (`layout()` in `Chat.tsx`).
- **The typing dots become the message.** An answer first appears as the three bouncing dots in a 150x84 bubble; at its
  frame the bubble grows to the message's size over 7 frames, the dots fade in the first half and the text fades in
  from 45 %. The header says "escribiendo..." (typing) while any dots are up.
- **The "seen" gag, made big.** At the end the viewer haggles, the two ticks turn blue, and nothing comes back. On a
  phone the ticks are a few pixels, and Joaquín asked twice for more: first "más evidente" (more obvious), then "ese
  zoom esfera de la imagen, bien grande, y que tenga un sonidito" (that sphere zoom, really big, with a little sound).
  So a 560 px glass lens springs in next to the ticks and shows the bubble's corner at **4.4x**: the corner is rebuilt
  inside the lens at that scale with the same `Ticks` component, so the blue and the pop happen in both places, under
  a radial highlight and a shade for the glass. The lens is drawn above the phone, so it may overflow the bezel. Then
  a hard cut back to the whole chat, where the header reads "escribiendo..." for 0.7 s and then "últ. vez hoy a las
  10:49" (last seen today at 10:49). The sound is one soft swish as the lens comes in and **one dry wood knock** as
  the ticks turn blue; the header changes stay silent.

The same chat, stacked on the wall behind Joaquín's head, is the talking-head version: [doc 21](21-coded-overlays-on-talking-head.md).

## What each film shows

The on-screen copy is Spanish (Paraguay). Every business on screen is invented, and premium on purpose: a builder, an
accounting firm, a truck importer.

| Film | Framework | What happens on screen |
|---|---|---|
| AN-02 "Ahora mismo" (right now), 44.7 s | problem, agitation, solution, from the phone of the person searching | Google types "constructora en asunción" (builder in Asunción) with the keyboard and the suggestions; the first result opens and three gold checks land in three seconds (what they do, the houses they finished, the WhatsApp button); the message types itself and leaves. Pull back: two phones, "Vos" (you) dark, "El otro" (the other one) lighting up; three scenes of a day (at work, driving, asleep) each send a message to the other phone, then a burst. Why: the other's page, scanned, lights up what, where and for whom. The 14-day strip with four steps. The callback: the same search, and this time the message lands on your phone |
| AN-03 "El señor de Brasil" (the man from Brazil), 44.3 s | hook, story, offer | a globe turning over the Atlantic; a ChatGPT-like box types the question in Portuguese (with a Spanish caption) and answers with a truck importer in Limpio, Paraguay (one of our clients, by trade only); a route from Europe draws itself; a WhatsApp dot hops from Brazil to Limpio; the client's own message lands line by line; the client's page scanned with three callouts; then an empty page that gives ChatGPT nothing; our page writes itself with Google and ChatGPT checked; three designs, 14 days |
| AN-04 "Los 14 días" (the 14 days), 39.5 s | the process, price first | "¿Cuánto cuesta una página web?" (how much is a website?), the price in gold 3D, and the calendar drops under it; day 1 a call card with three question chips; days 2 to 5 a search typed behind a page that writes its own copy; days 6 and 7 three designs; days 8 to 13 eight page cards fanning out with domain, mail and Google; day 14 the page live, a tap on WhatsApp, messages arriving; then two columns, what you do and what we do |
| AN-05 "La constructora barata" (the cheap builder), 49.1 s | an analogy (Joaquín's own, from the sales videos) | two price tags swing in, the cheap one gray on the right, ours gold on the left; two plots, plans unroll on ours, both houses rise and look alike; moving day: the cheap one flickers, cracks and drips, ours lights up; the houses fold into two phones: a template page where visitors come in and leave ("0 mensajes"), ours starting from a blueprint, then the headline, the button and messages; three designs, 14 days; "Más barato puede salir caro" (cheaper can come out expensive) |
| AN-06 "Tu página antes de pagar" (your page before you pay), 37.1 s | risk reversal | a video message in WhatsApp with a page building itself inside; the viewer types the business name; cards of how they show up today (a Google profile with no website, an Instagram, two competitors) under a passing magnifier; the video: a face in a circle over the sketch with the name and photos pointed at; two buttons, "Arrancamos" (let's start) and "Lo pienso" (I'll think about it); the price and 14 days; the video saved in the chat either way; the sketch and the live page side by side |
| AN-07 "La prueba de los tres segundos" (the three-second test), 45.3 s | a challenge the viewer runs | search "estudio contable en luque" (accounting firm in Luque), open the first result: a cluttered template; a 1, 2, 3 count in gold 3D; two red crosses (did you get what they sell and where? where do you tap to write?); back, the next result; "Tu página" (your page) as an empty page while a competitor gets the message; then ours: one line that says what and where, a "1 s" timer, the WhatsApp button following the scroll, messages arriving |
| AN-08 "El turno de noche" (the night shift), 42.1 s | our own number, then a day in the life | ten people, four turn gold: "4 de cada 10" (4 in 10 contacts arrive outside business hours); a clock spins from Sunday afternoon to Tuesday 2 a.m. while the sky turns to night; the shop's shutter comes down and the page in its window stays lit; a visitor at 02:14 reads it and taps WhatsApp; the owner's phone lights up in silence; morning, three messages waiting; 14 days, 24 hours; the reply typing |

## Render and QA

```bash
python3 tools/timeline.py an02                                   # the cue sheet + the beat table (fix every WARN)
COMP=AN02 node tools/render.mjs stills 30,120,400 out/an02/stills  # stills of the moments
python3 tools/sheet.py out/an02/stills out/an02/sheet.png 3 270 --crop45
COMP=AN02 node tools/render.mjs video                            # the silent picture, 50 to 70 s per film
"$EARSHOT_PY" tools/sound.py an02                                # mix, master, Meta-ready mux
zsh tools/listen.sh out/an-02-animado.mp4 audio/an02/cues_earshot.json out/an02/qa   # earshot's listening pass
python3 tools/qa.py an02                                         # frames, the 4:5 crop sheet, the safe-band check
zsh tools/finish.sh an02 an03 an04                               # render + mix + listen, one film after another
```

The order we used: key-frame contact sheets of every film first (they caught a crowded two-phone layout, a missing
keyboard while typing, houses too small, callouts in the wrong place, and a headline overlapping the next one), then
the pictures, the mixes and the listening pass on every film, then `qa.py` on every master. `render.mjs` bundles from
a snapshot of `src/`, so the next film can be written while one renders.

**The listening pass is also a picture check.** earshot lists every silent hole in an effects-only mix, and a hole is
almost always a stretch where nothing moves on screen. Every fill was a picture change, never a music bed: the four
steps of AN-02 spread over the beat and a pulse on day 14, the client's message landing line by line in AN-03, a
swish on each slider change of the cheap page in AN-05, the sketch building itself inside the video in AN-06.

## The numbers

| Film | Length | Effects | Within 1 frame | Within 100 ms | Loudness | Longest silent hole |
|---|---|---|---|---|---|---|
| AN-02 | 44.7 s | 191 | 87 % | 100 % | -16.6 LUFS | 1.56 s |
| AN-03 | 44.3 s | 198 | 83 % | 100 % | -16.7 LUFS | 2.26 s |
| AN-04 | 39.5 s | 136 | 77 % | 98 % | -16.6 LUFS | 1.78 s |
| AN-05 | 49.1 s | 151 | 86 % | 97 % | -16.7 LUFS | 2.02 s |
| AN-06 | 37.1 s | 106 | 85 % | 99 % | -16.7 LUFS | 1.78 s |
| AN-07 | 45.3 s | 107 | 83 % | 99 % | -16.7 LUFS | 1.88 s |
| AN-08 | 42.1 s | 122 | 83 % | 96 % | -16.7 LUFS | 2.00 s |

Sync is earshot's reading of each effect's onset against its visual event, on the decoded file. Every master: 1080x1920,
30 fps, H.264 BT.709 with the colour written into the stream, no edit list, moov first, AAC 320k, master at -16.5 LUFS
and -2 dBTP. The 4:5 band: clean on all seven. One night for the seven, from the scripts to the checked masters.

## Rules from Joaquín's reviews

- **Every word on screen is a draft** until Joaquín approves it, and every business on screen is invented, no logos.
- **Little glow.** Soft gold, no halos, no sheen sweeps.
- **Ours on the left, the cheap one on the right** (from the VSL, [doc 11](11-motion-graphics-in-code.md)).
- **High-end examples:** a builder or an accounting firm, never the cheapest trade.
- **One WhatsApp tone, the same every time, and no melody** ([doc 19](19-sound-effects.md)).

## What cost us time

- `Head`'s exit started at the beat's `out`, so the next beat's first words landed over the old ones for eight frames.
  The exit now ends at `out`.
- The end card was 190 frames long, copied from the chat film: 3.6 s of dead air after the logo. 130 frames.
- A "wait for the other queue to finish" loop built on `pgrep -f "finish.sh an05"` never fired: the waiter's own
  command line contains that string, so it matched itself. One sequential `finish.sh a b c` instead.
- **The audio was 44 ms late in every Meta-ready file.** Apple's AAC encoder writes 2112 priming samples, a normal MP4
  skips them through its edit list, and Meta wants no edit list. Found by earshot reading every soft tick "+44 ms",
  confirmed by cross-correlating the decoded file with the mix (a lag of exactly 2112 samples), fixed by trimming them
  before the encoder (`-af atrim=start_sample=2112` in `tools/sound.py`). AN-02 went from 47 % to about 90 % of cues
  within one frame ([doc 14](14-masters-and-web.md), [doc 19](19-sound-effects.md)).
- The text measures itself with the loaded fonts, so `Root.tsx` delays the render until Poppins and Roboto are in, for
  a sample string with every accent the copy uses.
- `npm install` of the globe's packages into a cloned `node_modules` kept the bundler working (npm 11 warns about
  blocked install scripts; the existing binary stayed).
