# The code

A sanitized snapshot of the scripts we ran on real videos in September and October 2026. Our folders, keys, CapCut
project names and client data were replaced by settings, environment variables or placeholders. Nothing here syncs
with what we run; it is a copy for reading and starting from.

| Folder | What | Runs as is? |
|---|---|---|
| [`edit-pipeline/`](edit-pipeline) | the finished-render path: transcribe, pack, render an EDL to MP4, QA, the synthesized sound-effects kit | yes, with ffmpeg, Python and an ElevenLabs key |
| [`capcut-pre-edit/`](capcut-pre-edit) | the CapCut pre-edit for a shoot: sync, transcribe, repair, read, plan cut points, write the CapCut project, validate, relink for the Mac sandbox | the analysis steps yes; the project writer needs template projects from your own CapCut (see its README) |
| [`vsl-motion/`](vsl-motion) | the Remotion project that made the VSL's motion graphics, the person masks, the compositor, the masters, the CapCut placement | the scenes render in Remotion as is; the rest needs your footage and your CapCut project |
| [`overlays-claude-design/`](overlays-claude-design) | rendering a Claude Design code bundle locally with real alpha; unmixing a magenta video into ProRes 4444 | yes, on a Design export |

## What is not here, on purpose

- **API keys.** Every script reads `ELEVENLABS_API_KEY` (or `ELEVENLABS_KEYS_FILE`) from the environment.
- **Our CapCut template projects.** The project writer clones objects from projects CapCut itself saved. Those contain
  our footage paths, so make your own (a 20-second throwaway project per object, see
  [`capcut-pre-edit/README.md`](capcut-pre-edit/README.md)).
- **Logos.** `vsl-motion/public/` holds placeholder SVGs with the same file names. Drop in your own.
- **Icons.** `vsl-motion/src/data/icons.json` is generated from the Iconify packages with `node tools/icons.cjs`.
- **Fonts.** Poppins comes from Google Fonts or `@fontsource/poppins`.
- **Footage, masks, renders.** Regenerable, and large.

## Conventions you will see

- Every script that writes something has a dry run by default and a `--write` flag, and backs up first.
- Times in CapCut JSON are integer microseconds; times in our JSON are seconds in the take's own clock ("movie time").
- Comments mention Joaquín (the person on camera) and the parts of our VSL (`P1`, `P2a`...). The code is exactly what
  shipped, so the examples are concrete.

The same license as the rest of the repository: CC0 for the code ([LICENSE](../LICENSE)).
