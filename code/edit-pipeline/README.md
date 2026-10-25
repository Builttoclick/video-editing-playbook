# edit-pipeline: from a recording to finished MP4s

The finished-render path ([docs/13](../../docs/13-finished-render.md)): the model reads a word-level transcript and
writes an edit decision list; these scripts do everything else.

```
transcribe.py -> pack.py -> [you or the model write the EDL] -> render.py --preview -> qa.py -> render.py -> qa.py
```

## Setup

```bash
brew install ffmpeg            # needs libass for burned captions (check: ffmpeg -filters | grep subtitles)
python3 -m pip install numpy scipy pillow
export ELEVENLABS_API_KEY=...
# Poppins Bold from Google Fonts into assets/fonts/Poppins-Bold.ttf
python3 scripts/sfx_kit.py     # synthesizes the sound-effects kit into assets/sfx/ (catalog.json is already here)
```

## Run

```bash
cd scripts
python3 transcribe.py "<folder or files>" --edit-dir "<videos>/edit"     # Scribe, cached per source
python3 pack.py --edit-dir "<videos>/edit"                               # -> takes_packed.md, word indices per phrase
# write <videos>/edit/edl/<name>.json (see EDL.md)
python3 render.py "<videos>/edit/edl/<name>.json" --preview              # quick look
python3 qa.py "<videos>/edit/out/<name>_preview.mp4"                     # numbers + cuts.png + safe.png
python3 render.py "<videos>/edit/edl/<name>.json"                        # final 1080x1920 (+ 4:5)
python3 qa.py "<videos>/edit/out/<name>.mp4"
```

## Files

| File | What |
|---|---|
| `scripts/common.py` | paths, ffprobe, the ElevenLabs key (env, or the account with most credits from a keys file), audio envelopes |
| `scripts/transcribe.py` | Scribe v2 word-level transcripts, cached by size and mtime, parallel |
| `scripts/pack.py` | `takes_packed.md`: one line per phrase with word indices, long silences on their own line |
| `scripts/render.py` | EDL to MP4: resolve words to the waveform, tighten pauses, zoom plan, overlays, callouts, captions, sound effects, music, loudness, 4:5, end plate, report |
| `scripts/qa.py` | the self-check of a render |
| `scripts/sfx_kit.py` | synthesizes the kit (no samples, no licence question) |
| `assets/sfx/catalog.json` | every sound: duration, `hit_ms`, own loudness, default level against the voice |
| `EDL.md` | every field of the EDL, with examples |

Paths in an EDL are absolute or relative to where you run `render.py`. Never point an EDL at a file you are not
willing to read from: the scripts only read sources and write under `edit/`.
