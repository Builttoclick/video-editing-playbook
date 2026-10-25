# capcut-pre-edit: phone takes + an external mic, into a CapCut project

The scripts of the pre-edit ([docs/07](../../docs/07-capcut-pre-edit.md)), as they ran on the October shoot, on a Mac
with CapCut 9.5. Set the shoot in the CONFIG block of `common.py` (or the `PRECUT_PROJECT` environment variable): the
project folder with `RAW/` (the phone `.MOV` files and the mic `.wav`), `AUDIO/` and `edit/`.

## The chain

| # | Script | Writes | Notes |
|---|---|---|---|
| 1 | `sync.py` | `edit/sync.json` | mic against every phone take by envelope cross-correlation, with drift ([docs/03](../../docs/03-ingest-and-sync.md)) |
| 2 | `transcribe.py` | `edit/transcripts/<take>.json` | Scribe v2 on the mic audio cut to each take, words in the take's clock; needs `ELEVENLABS_API_KEY` |
| 3 | `fix_bunched.py` | the same transcripts, repaired | Scribe's looped phrases; run before choosing takes ([docs/04](../../docs/04-transcription.md)) |
| 4 | `lines.py` | `edit/LINES.md` | the whole shoot as timed lines with word indices: **read it all** |
| 5 | you write `takes_example.py` | | the selection, as word anchors ([docs/05](../../docs/05-choosing-takes.md)) |
| 6 | `plan.py` | `edit/plan.json` | anchors to words, onset and offset on the waveform, frame-aligned spans with 1.5 s handles, one sync offset per take ([docs/06](../../docs/06-cut-points.md)) |
| 7 | `capcut_v7.py` | the CapCut projects | dry run first, then `--write` with CapCut quit |
| 8 | `validate_v7.py` | | must print `ALL CHECKS PASSED` |
| 9 | `qa_cuts.py` | | flags cut edges within 20 dB of the speech |
| 10 | `relink_movies.py` | | the Mac sandbox: media cloned under `~/Movies`, every path rewritten |

`captions.py` holds the caption text rules (lowercase, digits, glue words) that `capcut_v7.py` uses.

## The project writer needs templates

`capcut_v7.py` builds nothing from scratch: it clones every object (a compound with its wrapper, a caption with its
animation, a marker, a local audio file with Reduce noise on it, a sound from the library) from projects that CapCut
itself saved. Ours contain our footage, so they are not here. Make your own, one small project per object:

1. **`1020`-style template:** a project with one compound clip in it (select a clip, create compound clip), saved.
   It gives the root skeleton, the compound parent, inner draft, wrapper and the meta groups.
2. **`1021`-style template:** import a `.wav` and an `.mp3`, turn on Reduce noise on the wav, press M for a marker,
   import a 4K phone clip, quit.
3. **Captions template (`ADS V6 0924` in the script):** a project with auto captions on a clip, in your style, with
   your caption animation, plus the library sounds you want in the sounds timeline.

Then point `T20`, `T21` and `V6` at them. Twenty seconds of clicking each; the exact format is worth it.

## The parts that are useful anywhere

- `common.py`: `envelope()` (log-RMS at 1 ms with the trend removed) and `xcorr()` (FFT cross-correlation with a
  parabolic peak and a quality score). That is the whole sync.
- `plan.py`: `refine()`, onset and offset of a phrase relative to the speech level.
- `fix_bunched.py`: the looped-phrase detector and repair.
- `relink_movies.py`: works on any CapCut Mac project (`RELINK_FROM`, `RELINK_TO`).
