# Sound effects in code

The tools we use to put sound effects from [earshot](https://github.com/Leonxlnx/earshot)'s code-made bank on coded
films and under a voice, and to check the result without ears. A sanitized copy of what we ran in November 2026: our
folder paths became environment variables, nothing else changed. How and why: [docs/19](../../docs/19-sound-effects.md).
The sounds themselves, already rendered: [`sounds/`](../../sounds).

## Install earshot

earshot is an MIT tool by Leon Lin (not `pykeio/earshot`, which is a voice-activity detector). We ran 0.4.0 on a
MacBook with Python 3.14 and torch 2.15.

```bash
git clone https://github.com/Leonxlnx/earshot ~/tools/earshot
cd ~/tools/earshot && python3 -m venv .venv
.venv/bin/pip install torch
.venv/bin/pip install -e .                 # or -e ".[mcp]" for its MCP server
.venv/bin/python -m earshot doctor --fetch  # about 1.1 GB of models (CLAP + AST), only for the listening commands
.venv/bin/python -m earshot doctor          # packages, ffmpeg, models, the bank (252 sounds)
export EARSHOT_HOME=~/tools/earshot         # every script here reads it (default: ~/tools/earshot)
```

You also need ffmpeg. On a Mac, Homebrew's ffmpeg has Apple's AAC encoder (`aac_at`), which the mixer uses by default
because it overshoots least; elsewhere pass `aac="aac"` to `sfxmix.mux` and measure the decoded file.

Rendering sounds (`sfx`, `kit`) loads no models and takes under a second. Every listening command (`rank`, `describe`,
`realness`, `timeline`, `sheet`, `critique`) loads two models first: about 10 s per call on our MacBook once warm, up
to a minute cold. Results are cached per file.

## What is here

| path | what |
|---|---|
| [`scripts/es`](scripts/es) | earshot from its venv with the log noise filtered: `scripts/es sfx list --category ui_pop` |
| [`scripts/audition.sh`](scripts/audition.sh) | render 5 to 9 candidates and rank them against a description of the sound |
| [`scripts/listen.sh`](scripts/listen.sh) | the listening pass on a finished film: timeline, sheet, critique, decoded loudness, each pass kept in `qa/vN` |
| [`scripts/sfxmix.py`](scripts/sfxmix.py) | the mixer and master chain: place each take on its frame, level by loudness, two buses, soft knee, true-peak limiter, write, mux, decoded levels |
| [`scripts/under_voice.py`](scripts/under_voice.py) | every effect against the voice around it, from the two stems: LOUDER / CLOSE / ok |
| [`scripts/balance.py`](scripts/balance.py) | a new mix against an approved one, effect by effect after the master |
| [`templates/sound.py`](templates/sound.py) | a film's sound script to copy: the approved 10 s test as the worked example, four EDIT blocks |
| [`kits/explainer-40s-approved.json`](kits/explainer-40s-approved.json) | the 40 s explainer's kit, version 4: the sounds Joaquín approved, revised by Joaquín's notes on versions 2 and 3 |
| [`kits/ads-grown-2026-11.json`](kits/ads-grown-2026-11.json) | the same kit grown for seven animated ads (send, read receipt, cross, crack, drip, shutter, sunrise, clock); its takes are [`sounds/kit/`](../../sounds/kit) |
| [`examples/test-10s/`](examples/test-10s) | the 10 s test's cue sheet and kit: the data `templates/sound.py` reads. Its kit still has the chip triad and the glock that Joaquín later ruled out |
| [`examples/explainer-40s/`](examples/explainer-40s) | the 40 s explainer's cue sheet in frames (`src/data/cues.json`) and what the mixer made of it: every placed effect with its gain and limiter load (`audio/mix.json`), the events in earshot's cue format (`audio/cues_earshot.json`) |

A film folder looks like this, and every script assumes it:

```
<film>/src/data/cues.json        every event in frames: the picture reads it, and so does tools/sound.py
<film>/audio/kit.json            one bank sound per role
<film>/audio/kit/                the rendered takes + kit.lock.json (written by earshot kit render)
<film>/tools/sound.py            from templates/sound.py
<film>/out/picture.mp4           the silent render of the picture
```

## Run each one

```bash
export EARSHOT_HOME=~/tools/earshot
SE=<this repo>/code/sound-effects

# the bank
$SE/scripts/es sfx list --kind whoosh.short
$SE/scripts/es sfx render whoosh_fast/crisp -o w.wav --dur 0.6 --apex 0.25

# pick a sound for a new moment: describe the SOUND, not its use; read the "sounds most like" column, not only z
bash $SE/scripts/audition.sh audio/audition/puff "a soft puff of air, a cartoon poof of smoke" \
  whoosh_fast/sleeve pro_whoosh_big/windy cut_hit/air swish/soft

# a film's kit
$SE/scripts/es kit render audio/kit.json --out audio/kit
$SE/scripts/es kit check audio/kit.json --out audio/kit

# the mix (copy the template first, edit its four EDIT blocks)
cp $SE/templates/sound.py tools/sound.py
SFXMIX_DIR=$SE/scripts "$EARSHOT_HOME/.venv/bin/python" tools/sound.py

# listen back (28 s on a 10 s film, 1.5 to 5 min on a 40 s one), then open qa/sheet.png
bash $SE/scripts/listen.sh out/film.mp4 audio/cues_earshot.json out/qa

# effects under a voice: both stems, same sample rate; exit 1 if any effect is louder than the voice
"$EARSHOT_HOME/.venv/bin/python" $SE/scripts/under_voice.py voice.wav sfx.wav --at-json audio/mix.json

# a revision against the approved mix
"$EARSHOT_HOME/.venv/bin/python" $SE/scripts/balance.py old/mix.wav old/mix.json audio/mix.wav audio/mix.json
```

| variable | what | default |
|---|---|---|
| `EARSHOT_HOME` | your earshot clone | `~/tools/earshot` |
| `EARSHOT_PY` | the Python to run earshot with, if not the clone's `.venv` | `$EARSHOT_HOME/.venv/bin/python` |
| `SFXMIX_DIR` | where `sfxmix.py` lives, for a `tools/sound.py` copied out of this folder | `../scripts` next to the template |

## Test the chain: rebuild the approved 10 s mix

The template, the kit and the cue sheet here rebuild the mix Joaquín approved, sample for sample. We ran this on the
public copy and got `max diff 0.0` (35 effects, raw -22.8 LUFS to -16.0, true peak 4.7 to -1.5 dBTP):

```bash
F=/tmp/test-10s; rm -rf $F && cp -R $SE/examples/test-10s $F && mkdir -p $F/tools $F/out
sed -e 's|^MASTER = .*|MASTER = dict(target_lufs=-16.0, ceiling_dbtp=-1.5)|' $SE/templates/sound.py > $F/tools/sound.py
cd $F && SFXMIX_DIR=$SE/scripts "$EARSHOT_HOME/.venv/bin/python" tools/sound.py
```

It renders the kit, writes `audio/mix.wav`, `audio/mix.json` and `audio/cues_earshot.json`, then the mux fails
unless you put a 10 s, 30 fps `out/picture.mp4` there (the WAV is already written by then). The 10 s film used
-16.0 LUFS and -1.5 dBTP; the defaults are now -15.8 and -2 ([docs/19](../../docs/19-sound-effects.md), the master
chain). Run the same test after any change to `sfxmix.py`.

## Notes

- The shell scripts are bash. We ran them in zsh; these copies were converted and tested under bash.
- `audition.sh` prints the whole ranking: row 1 is the third line of earshot's output (cutting from line 4 once hid the
  winner from us).
- Comments name Joaquín and our films (the 10 s test, the 40 s explainer, the ads). The code is what shipped.
- Same license as the rest of the repository: CC0 for this code ([LICENSE](../../LICENSE)). earshot itself is MIT.
