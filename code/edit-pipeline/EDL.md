# The EDL (edit decision list), reference

One JSON per output video in `<videos_dir>/edit/edl/<name>.json`. `render.py` reads it; the output lands in
`edit/out/<name>.mp4` with `<name>.report.json` (every piece, cut, caption word and SFX cue in output time).
Times are never typed: segments point at word indices from `takes_packed.md`.

## Full example (the V5-04 re-cut)

```json
{
  "version": 1,
  "name": "V5-04-NEW_H4+A+CTA2",
  "sources": {"H": "takes/hook.MOV", "A": "takes/body.MOV", "CTA": "takes/close.MOV"},
  "segments": [
    {"src": "H",   "words": [0, 24],  "beat": "HOOK", "push": [{"word": 20, "to": 1.14, "dur": 0.5}],
     "quote": "Son las dos de la mañana ...", "reason": "only take; push on the payoff line"},
    {"src": "A",   "words": [0, 53],  "beat": "BODY", "punch": [10], "push": [{"word": 44, "to": 1.14}]},
    {"src": "CTA", "words": [14, 40], "beat": "CTA",  "reason": "second attempt; the first restarts with 'okay'"}
  ],
  "overlays": [{"file": "overlays/hook-H4.mp4", "follows": "H", "src_start": 1.026}],
  "callouts": [{"text": "QUE TE ESCRIBAN", "style": "badge", "at_word": ["A", 16], "until_word": ["A", 20], "y": 430}],
  "sfx": {"auto": true, "words": {"whatsapp": "notify"},
          "cues": [{"name": "thud", "at_word": ["H", 23], "why": "the slam on the last words of the hook"}]},
  "append": [{"file": "plates/closing-plate.mp4", "beat": "END"}],
  "outputs": ["9x16", "4x5"]
}
```

## Fields

**Top level**
- `name`: output file name. For ads, the upload title (`V6-01_N1+B5+C1`).
- `sources`: key -> absolute path. The key is how segments, callouts and cues refer to a file.
- `segments`: in output order. See below.
- `overlays`: take-synced overlays: `file`, `follows` (source key), `src_start` (source second of the overlay's
  frame 0), optional `chroma` ("0x00FF00"; auto-detected from the corner otherwise), `similarity` (0.32), `blend` (0.08).
- `callouts`: ASS text cards: `text`, `style` (badge | dark | label), `at_word` [src, i], `until_word` [src, i] or
  `dur`, `y` (centre), `offset` (default -0.04 s), `sfx` (default "pop"; null for silence).
- `sfx`: `"auto"`, or `{"auto": bool, "words": {"word": "sound"}, "cues": [...]}`, or a plain list of cues. A cue:
  `name` (kit sound), one of `at_word` [src, i] | `at_beat` "CTA" | `at_cut` n | `at` (output seconds, avoid),
  optional `offset`, `rel_db` (level vs the voice; default from the catalog), and a `why`.
- `music`: `file`, `gain_db` (-18), `start` (s into the track), `duck_threshold` (0.03), `duck_ratio` (8), `fade_out` (1.2).
- `append`: clips added after the cut (end plate, CTA card): `file`, `beat` ("END"). Silent audio is added if they have none.
- `captions`: false, or overrides: `style` (word | chunk), `size`, `y`, `spacing`, `color`, `accent`, `keywords`, `chunk`, `pop`.
- `origin`: per-source zoom origin `{"A": [0.5, 0.40]}` (face centre as fractions of the frame).
- `zoom`: `snap` ([1.0, 1.1]), `punch` (1.12), `inner_every` ([2.4, 4.2] s).
- `tighten`: `{"gap": 0.45, "keep": 0.16}` (pauses longer than gap inside a segment are cut down to keep); false = off.
- `pad_in` / `pad_out`: seconds around the sound (0.06 / 0.09).
- `loudness`: `{"I": -14, "TP": -1.5, "LRA": 11}`. `voice_fx`: true/false. `outputs`: ["9x16"] or ["9x16", "4x5"].
- `hdr`: how HDR (HLG/PQ) sources become SDR: `mobius` (default, natural), `hable` (darker), `direct` (brightest).

**A segment**
- `src` + `words: [i, j]` (inclusive, spoken-word indices). Or `start`/`end` in source seconds as a last resort.
- `beat`: HOOK / BODY / CTA / ... (a beat change gets an auto whoosh; callouts never cross it).
- `zoom`: force this segment's base zoom. `punch`: [word indices] for instant 1.12. `push`: [{"word", "to", "dur"}].
- `inner_snaps`: false to keep one framing for the whole segment.
- `tighten`, `pad_in`, `pad_out`: per-segment overrides.
- `quote`, `reason`: free text for the humans (and the next session).
- `piece`: instead of all of the above, the name of a piece in `edit/pieces.json` (modular ads).

## pieces.json (modular ads)

```json
{
  "sources": {"T1": "takes/long-recording.MOV"},
  "pieces": {
    "N1": {"beat": "HOOK", "segments": [{"src": "T1", "words": [812, 840], "push": [{"word": 835}]}],
           "overlays": [...], "callouts": [...], "sfx": [...]},
    "B5": {"beat": "BODY", "segments": [{"src": "T1", "words": [1201, 1260]}, {"src": "T1", "words": [1302, 1330]}]},
    "C1": {"beat": "CTA",  "segments": [{"src": "T1", "words": [1502, 1540]}]}
  }
}
```

An ad EDL is then `{"name": "V6-01_N1+B5+C1", "segments": [{"piece": "N1"}, {"piece": "B5"}, {"piece": "C1"}],
"sfx": {"auto": true}, "append": [...], "outputs": ["9x16", "4x5"]}`. Choose takes once, render every combination.
