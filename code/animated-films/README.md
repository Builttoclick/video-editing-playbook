# animated-films: seven effects-only ads in one Remotion project

Seven vertical films (1080x1920, 30 fps, 37 to 49 s) with nobody on camera and no voice: the script is on screen word
by word, every graphic is React code, every sound is an effect made in code. Built in one night in November 2026 from
seven ad scripts, as one codebase. How and why, step by step: [docs/20](../../docs/20-animated-films.md). The sound:
[docs/19](../../docs/19-sound-effects.md), and the rendered effects of this kit in [`../../sounds/kit/`](../../sounds/kit/).

The on-screen copy is Spanish (Paraguay), as it shipped, with three changes for this copy: **every price is a
placeholder** (`X.XXX.XXX`, `XXX.XXX`), and our logo, Joaquín's photo and the WhatsApp icon in `public/` are
placeholders with the same file names and sizes. Every business on screen is invented.

## The seven films

| Composition | Title on screen | Framework | Length |
|---|---|---|---|
| `AN02` | "Ahora mismo" (right now) | problem, agitation, solution, told from the phone of the person searching | 44.7 s |
| `AN03` | "El señor de Brasil" (the man from Brazil) | hook, story, offer | 44.3 s |
| `AN04` | "Los 14 días" (the 14 days) | the process, price first | 39.5 s |
| `AN05` | "La constructora barata" (the cheap builder) | an analogy | 49.1 s |
| `AN06` | "Tu página antes de pagar" (your page before you pay) | risk reversal | 37.1 s |
| `AN07` | "La prueba de los tres segundos" (the three-second test) | a challenge the viewer runs | 45.3 s |
| `AN08` | "El turno de noche" (the night shift) | our own number and a day in the life | 42.1 s |

## What is where

| Path | What |
|---|---|
| `src/films/anNN/copy.json` | every word on screen: the text beats (lines, gold words), the UI copy (queries, pages, messages), the end card |
| `tools/films/anNN.py` | `cues(copy)`: every frame of the film, written in seconds; `events(cues, copy, LOUD)`: every sound |
| `tools/timeline.py` | runs the module above and writes `src/films/anNN/cues.json`; prints every text beat with the time it needs and the time it has (WARN when short) |
| `src/films/anNN/cues.json` | generated, included so the project renders as is; the picture and the mixer both read it |
| `src/films/ANNN.tsx` | the film: scenes gated by the cue frames, built from `src/components` |
| `src/components/` | the kit (table below) |
| `src/theme.ts` | the palette, `SAFE` (Meta's 4:5 band, y 285 to 1635), `TEXT` (the headline block), `ZONE` (the graphic under it) |
| `src/lib/anim.ts` | springs, eased ramps, presence, the typing rhythm (`typeFrames`, the same sum as `tools/films/common.py`) |
| `tools/render.mjs` | bundle once, then QA stills, a contact-sheet run or the silent picture (`COMP=AN02`) |
| `tools/sound.py` | the mix: the kit rendered by earshot, every effect on its frame at its loudness, master, mux |
| `tools/qa.py` | frames every 0.6 s, the 4:5 crop sheet and the safe-band check on the finished file |
| `tools/sheet.py` | contact sheets (`--crop45` shows only what the 4:5 feed keeps) |
| `tools/finish.sh` | render, mix and listen, one film after another |
| `tools/remix.sh`, `tools/listen.sh`, `tools/report.py` | sound only on the existing picture; earshot's listening pass; one line per film |
| `audio/kit.json` | the sound kit: one role per kind of event, the earshot sound behind it, its sync point, level and offset |
| `public/` | placeholders: `lockup-horizontal-blanco.svg` (a logo), `avatar.png` (a person), `whatsapp_icono.svg` (a chat icon) |

## The kit

| File | What |
|---|---|
| `Head.tsx` | the script on screen: `Head` fits its widest line into 960 px, words spring in two frames apart, lines leave upward with a blur; `Beats` draws every text beat of a film from `cues.text` |
| `Phone.tsx` | `Screen` (a phone screen, children in screen coordinates), `Tap` (a finger's ripple), `Keyboard` (the keyboard while something types, the last key lit), `Caret` |
| `Google.tsx` | `GooglePage`: the search bar typing on a human rhythm, suggestions, Enter, three invented results, a tap. No logo: a search is a search bar |
| `Site.tsx` | `SitePage` (the generic premium page: a headline that writes itself, house or truck "photos", services, the WhatsApp button that stays while the page scrolls, gold callouts for what, where and for whom), `TemplatePage` (the cheap one), `EmptyPage`, `Scan` (a gold line reading a page) |
| `Wa.tsx` | `WaThread` (a WhatsApp dark-theme thread: messages stack from the bottom, typing dots morph into the message, a video message, a compose bar that types and sends, the keyboard), `WaBubble`, `WaNotif`, `WaBadge` |
| `Kit.tsx` | `Slab` (real thickness), `Extrude` and `BigGold` (gold 3D type), `Chip`, `Mark`, `CalendarStrip` (14 tiles, with `pulse`), `Proposals` (three designs, one picked), `PriceTag`, `Panel` |
| `EndCard.tsx` | the board that swings in like a door, the closing line word by word, the price, the WhatsApp pill, an arrow down to Meta's button; 130 frames |
| `Globe.tsx` | an orthographic globe from Natural Earth (`world-atlas` 110m, `d3-geo`), two countries highlighted, a route that draws itself, pins |
| `Gpt.tsx` | a ChatGPT-like box (dark, no logo) typing the question and writing the answer |
| `Houses.tsx` | two houses built course by course, then the move in: lights, a flicker, a crack, a drip |
| `base.tsx` | `Obj` (the flat full-frame wrapper with the shared camera: opacity and blur live here so they never flatten the 3D inside), `G3`, `Icon`, `txt` |

## Run it

```bash
npm install                                  # its postinstall writes src/data/icons.json (node tools/icons.cjs)
npx tsc -p .                                 # types
npx remotion studio src/index.ts             # look at any film

python3 tools/timeline.py an02               # after editing the copy or the cue module: new cues.json + the beat table
COMP=AN02 node tools/render.mjs stills 30,120,400 out/an02/stills
python3 tools/sheet.py out/an02/stills out/an02/sheet.png 3 270 --crop45
COMP=AN02 node tools/render.mjs video        # out/an02/picture.mp4, silent, about 50 to 70 s per film on our MacBook
"$EARSHOT_PY" tools/sound.py an02            # audio/an02/mix.wav + out/an-02-animado.mp4
zsh tools/listen.sh out/an-02-animado.mp4 audio/an02/cues_earshot.json out/an02/qa
python3 tools/qa.py an02                     # frames, the 4:5 crop sheet, the safe-band check
zsh tools/finish.sh an02 an03                # render + mix + listen, one film after another
python3 tools/report.py                      # one line per film
```

- **Rendering on a Mac:** Remotion's own Chrome hung for us, so `tools/render.mjs` uses Playwright's
  `chrome-headless-shell` when it finds one under `~/Library/Caches/ms-playwright` (or the path in `REMOTION_BROWSER`).
  `render.mjs` bundles from a snapshot of `src/` in `.snap/`, so the next film can be edited while one renders.
- **The sound** needs [earshot](https://github.com/Leonxlnx/earshot) (MIT; we ran 0.4.0) in a Python environment, and
  `EARSHOT_PY` pointing at that Python (`tools/finish.sh`, `remix.sh` and `listen.sh` use it). The first run of
  `tools/sound.py` renders `audio/kit.json` into `audio/kit/` from earshot's bank (made in code, no recordings) and
  caches it. To hear the kit first, the same takes are in [`../../sounds/kit/`](../../sounds/kit/).
- **The mux uses Apple's AAC encoder** (`aac_at`, macOS) and trims its 2112 priming samples, because the file is
  written with no edit list for Meta and the sound would otherwise play 44 ms late. On another encoder, measure its
  priming once (decode the MP4 and cross-correlate it with `mix.wav`) and trim that instead.

## Make a new film

1. Copy the closest of the seven: `src/films/anNN/copy.json`, `tools/films/anNN.py`, `src/films/ANNN.tsx`.
2. Write the copy. Write the cue sheet in seconds (`s.beat(id, in, out)` for every text beat, `f[...]` for every move).
3. `python3 tools/timeline.py anNN`: fix every WARN (a beat needs 0.55 s plus one second per 4.2 words).
4. Add the composition to `src/Root.tsx`, stills, a contact sheet, look, then the render, the mix, the listening pass
   and `tools/qa.py`.

## Licences of what this uses

Remotion has its own licence (free for individuals and companies of up to 3 people; check yours). Poppins is SIL Open
Font License, Roboto is Apache 2.0, both from `@fontsource`. The icons are Solar (CC BY 4.0, by 480 Design) and Remix
Icon (Apache 2.0), copied into `icons.json` by `tools/icons.cjs`. `d3-geo`, `topojson-client` and `world-atlas` are
ISC; the map data is Natural Earth (public domain). earshot is MIT.

## What is not here

`node_modules/`, `out/` (renders), `audio/kit/` and the mixes (regenerable; the takes are in `../../sounds/kit/`),
`src/data/icons.json` (generated), our logo, Joaquín's photo, the WhatsApp icon, and the prices.
