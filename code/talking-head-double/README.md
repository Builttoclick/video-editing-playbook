# talking-head-double: the same ad as a chat film and as Joaquín on camera

One ad script, "Ya sé tus preguntas" (I already know your questions: a client asks the usual questions in WhatsApp and
gets the answers), made twice in November 2026 so a test compares the format, not the words:

1. **The chat film** (`AN01`, 39 s, effects only): the viewer's own WhatsApp. The questions land on the right, the
   answers on the left after the typing dots, ideas come out of the phone in gold, and at the end the viewer haggles,
   the ticks turn blue and nothing comes back: the "seen" gag, made big with a glass lens.
2. **The double** (`TH-back` + `TH-front` over the footage, 43 s): Joaquín plays both sides in one take at a desk.
   The client's lines come mirrored and cooled so they read as another person, the same chat stacks on the wall
   **behind Joaquín's head** (an Apple Vision person mask cuts the person out of that layer), the big moments take the
   wall, small things ride in front on the chest, and on the "seen" gag Joaquín vanishes in a cartoon puff of smoke
   over an empty chair (a LaMa plate).

How and why: [docs/21](../../docs/21-coded-overlays-on-talking-head.md) (the double) and
[docs/20](../../docs/20-animated-films.md) (the chat-film tricks). The seven films that grew out of this kit:
[`../animated-films/`](../animated-films/).

Prices on screen are placeholders (`X.XXX.XXX`, `XXX.XXX`); the logo and the photo in `public/` are placeholders with
the same file names.

## What is where

| Path | What |
|---|---|
| `src/Film.tsx` | the chat film: the stage, the phone, the lens, the graphics, the end card |
| `src/components/Chat.tsx` | the WhatsApp screen: messages stack from the bottom like the real app (each one's height scaled by its spring, so the thread above shifts up as it lands), typing dots that morph into the message, the compose bar typing the last line, `Lens` (the 560 px glass lens that shows the ticks 4.4x) |
| `src/components/Graphics.tsx` | what comes out of the phone: two chips, a page slab that writes itself, the 14-tile strip, the three proposals |
| `src/components/EndCard.tsx` | the board that swings in, the price in gold 3D, the line, the WhatsApp pill, the arrow down to Meta's button |
| `src/data/copy.json` | every word on screen of both versions |
| `src/data/cues.json` | every frame of the chat film (hand-timed) |
| `src/TH.tsx` | the double's two layers: on the wall (BACK) the chat, the price, the page, the 14 days; in front (FRONT) the client's quote on a sticker, the chips, the compose bar, the puff and the captions |
| `src/data/th_cues.json` | every cue of the double as `{beat, word, nth?, off?}`: the frame of a spoken word plus an offset. `TH.tsx` and `tools/th_sound.py` both read it |
| `src/data/th.json` | **an empty placeholder.** `tools/th_pieces.py` writes the real one from your cut (every piece with its role and every word in output frames). Until then the TH compositions render nothing |
| `tools/th_pieces.py` | the cut's report + transcript -> `src/data/th.json` |
| `tools/render.mjs` | stills, the chat film's picture, or the double's layers as ProRes 4444 with alpha (`layers`) |
| `tools/personmask.swift` | Apple Vision person masks for a folder of frames (macOS) |
| `tools/th_plate.py` | the empty chair: one frame with the person erased by LaMa, and a 1.5 s clip of it with the take's room tone |
| `tools/th_compose.py` | footage + masks + layers -> the double's picture: client pieces flipped and cooled, BACK behind the person, a snap zoom on every second piece of Joaquín's, FRONT on top |
| `tools/th_sound.py` | Joaquín's voice plus effects under it, every one tied to a word, -14 LUFS, Meta-ready mux |
| `tools/sound.py` | the chat film's sound (effects only, -16.5 LUFS) |
| `audio/kit.json` | the sound kit both films use (earshot roles) |

## The double, step by step

The footage side runs on [`../edit-pipeline/`](../edit-pipeline/) (transcription and the EDL renderer).

1. **Transcribe the take** (`../edit-pipeline/scripts/transcribe.py`) and write an EDL by source times: one segment per
   line, a `beat` on each (`Q1`, `A1`, ... : Q for the client's lines, A for Joaquín's), the cut values from
   Joaquín's notes and `"captions": false` (they are drawn in the FRONT layer):

   ```json
   {"sources": {"J": "RAW/take.MOV"}, "pad_in": 0.04, "pad_out": 0.06, "tighten": {"gap": 0.32, "keep": 0.11},
    "segments": [{"src": "J", "start": 89.0, "end": 93.9, "beat": "A2a", "pad_out": 0.02},
                 {"src": "J", "start": 141.8, "end": 149.55, "beat": "A5", "tighten": {"gap": 0.22, "keep": 0.08}}],
    "append": [{"file": "RAW/edit/append/visto-vacio.mp4", "beat": "VISTO"},
               {"file": "RAW/edit/append/endcard.mp4", "beat": "END"}],
    "captions": false}
   ```

   `render.py <edl> --keep` writes the cut (`RAW/edit/render/<name>/base.mkv`), the voice (`mix.wav`) and a report.
   The tools here look for the name `AN-01-TH`: change it in `th_pieces.py`, `th_compose.py` and `th_sound.py`.
2. `python3 tools/th_pieces.py` -> `src/data/th.json`.
3. Write `src/data/th_cues.json`: every message and every graphic on a spoken word (`{"beat": "A3", "word": "catorce",
   "off": -2}`; an empty word means the beat's first frame). A beat may span several pieces: the word is searched in
   all of them.
4. `node tools/render.mjs layers` -> `out/layers/TH-back.mov` and `TH-front.mov`.
5. The gag: `python3 tools/th_plate.py <frame.jpg> <mask.png>` erases the person from one frame of the cut (the mask
   grown 28 px, big-lama as TorchScript in `~/.cache/big-lama/big-lama.pt`) and writes the plate clip. Append it to the
   EDL and render the cut again (steps 1 to 4).
6. `swiftc -O tools/personmask.swift -o tools/personmask`, then `python3 tools/th_compose.py` -> `out/th/picture.mp4`
   (frames and masks cached in `~/Library/Caches/talking-head-double/`, or `TH_CACHE`). `th_compose.py stills
   40,300,700` writes QA stills first.
7. `"$EARSHOT_PY" tools/th_sound.py` -> `out/an-01-hablado.mp4`.

The chat film: `node tools/render.mjs stills 30,262,470 out/stills`, `node tools/render.mjs video`, then
`"$EARSHOT_PY" tools/sound.py` -> `out/an-01-animado.mp4`.

## Needs

Node and `npm install` (its postinstall runs `node tools/icons.cjs`, which writes `src/data/icons.json`); Python 3 with numpy, OpenCV, Pillow;
torch for `th_plate.py`; [earshot](https://github.com/Leonxlnx/earshot) (MIT, 0.4.0) plus soundfile, pyloudnorm and
scipy for the two sound scripts (`EARSHOT_PY` = that Python); ffmpeg; macOS for the person masks and for `aac_at`.

Two traps from our Mac, both handled here: ffmpeg 9 from Homebrew had no libass (so the captions are drawn by
`TH.tsx`) and no zscale (our iPhone take was HLG; our renderer converted it through VideoToolbox, see docs/21); and a
concatenated cut must be read with `-fps_mode passthrough`, or ffmpeg duplicates frames at the joins (both readers in
`th_compose.py` do).

## What is not here

The raw take, the EDL, the cut, `th.json` (a placeholder), masks, plates and renders; Joaquín's photo and our logo
(placeholders); the prices; `src/data/icons.json` (generated).
