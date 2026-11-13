"""A coded film's sound: every effect from earshot's bank, placed on the frames the picture is built from.

TEMPLATE. Copy it to <film>/tools/sound.py and edit the four blocks marked EDIT. The example below is the 10 s test
film Joaquín approved on 03-nov-2026 ("it's really good", three times): its events, its LOUD ladder, its kit roles
(its cue sheet and kit are in ../examples/test-10s/). The mix and master chain lives in ../scripts/sfxmix.py, so a
fix there reaches every film.

Joaquín's taste moved on after this film: no melody. The chip triad (C5 E5 G5) and the glock bells below are out
since; a newer film gives every chip one dry click (fit/click/floss_lid), every headline line a soft air swish, and
lands the logo on a thud (../kits/ and docs/19-sound-effects.md).

    export SFXMIX_DIR=<this repo>/code/sound-effects/scripts      # where sfxmix.py lives, once the template is copied
    "$EARSHOT_HOME/.venv/bin/python" tools/sound.py
      -> audio/mix.wav, audio/mix.json, audio/cues_earshot.json, out/<OUT>.mp4   (the mux needs out/picture.mp4)
Then listen to it: bash <this repo>/code/sound-effects/scripts/listen.sh out/<OUT>.mp4 audio/cues_earshot.json out/qa
"""
import json
import os
import sys

sys.path.insert(0, os.environ.get("SFXMIX_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))
import sfxmix  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# EDIT 1: the output name and, only with a reason, the master. Defaults: -15.8 LUFS, -2 dBTP, Apple AAC 320k.
OUT = "out/film.mp4"
MASTER = dict(target_lufs=sfxmix.TARGET_LUFS, ceiling_dbtp=sfxmix.CEILING_DBTP)

# EDIT 2: each role's loudest 50 ms before the master (LUFS scale), effects-only order: the hit on top, keys and
# word taps as texture ~11 dB under it. These are the 10 s film's values (approved). A sparser, longer film needs
# more make-up gain to reach the target, which pushes transients into the limiter: lower the hit, knock, thuds and
# keys 1.5-2 dB (the 40 s film: hit -12, land -17.5, tock -18, key -22.5, text -23). Read the "limiter, hardest"
# line: more than ~5 dB off one effect means its LOUD value is too high for this film.
LOUD = {"hit": -10, "riser": -14, "whoosh.short": -15, "swish": -16, "land": -16, "tock": -16, "bell": -16,
        "chip": -16.5, "pop": -17, "ding": -15, "ding.wa": -15, "key": -21, "key.return": -18.5, "text": -22}
# Keys and taps own no low end: a 4th-order high-pass. Keys 180 Hz (a ~100 Hz band ran under the typing at 140 Hz
# 2nd order). Word taps: 160 Hz here (4 taps, approved). The 40 s film raised them to 400 Hz because earshot heard
# its 19 taps as "kick drum / small soft footstep" at 160; on this short film 400 Hz drops the critique's
# "low 60-250 Hz share" out of range (-8.5 dB). Many taps: 400. A few: 160.
HIGHPASS = {"key": 180, "key.return": 180, "text": 160}
# Low tonal bodies never go through the clipper (it bent the hit's sub for 26 ms): only the limiter touches them.
CLEAN = {"hit", "land"}
# cue kind per role, for earshot's timeline and sheet (free labels)
KIND = {"land": "land", "key": "key", "key.return": "key", "pop": "pop", "tock": "tock", "chip": "pop",
        "whoosh.short": "whoosh", "swish": "whoosh", "bell": "bell", "riser": "riser", "hit": "hit",
        "ding": "click", "ding.wa": "click", "text": "land"}

cues = json.load(open(os.path.join(ROOT, "src/data/cues.json"), encoding="utf-8"))
fps, F = cues["fps"], cues["f"]
# A SNAP spring pop-in (damping 13, stiffness 190, mass 0.7) is 38 % of the way at 2 frames, 65 % at 3: the eye
# reads it as "there" at about half its travel, so its sound goes 2 frames after the spring starts.
POP = 2


def events():
    """EDIT 3: (id, role, visual frame, pick[, loudness]). Read the frames from cues.json, never type them twice.
    pick = take index or pitch label; the optional loudness overrides LOUD for one event."""
    ev = [("search:bar", "land", F["barIn"] + POP, 0)]
    ev += [(f"search:key:{i}", "key", F["type0"] + i * F["charStep"], i) for i in range(len(cues["query"]))]
    ev.append(("search:enter", "key.return", F["enter"] + 1, 0))
    ev += [(f"results:row:{i}", "pop", f + POP, i) for i, f in enumerate(F["rows"])]
    ev.append(("results:mine", "tock", F["mine"] + POP, 0))
    ev += [(f"seo:chip:{i}", "chip", f + POP, n) for i, (f, n) in enumerate(zip(F["chips"], ["C5", "E5", "G5"]))]
    (a1, b1), (a2, b2), (a3, b3) = F["jumps"]
    ev.append(("climb:move:1", "whoosh.short", (a1 + b1) / 2, 0))  # in-out ease: fastest at the middle
    ev.append(("climb:rank:3", "bell", b1, "E5"))                    # bells land on arrival
    ev.append(("climb:move:2", "swish", (a2 + b2) / 2, 0))
    ev.append(("climb:rank:2", "bell", b2, "G5"))
    ev.append(("climb:build", "riser", b3, 0))  # the move into #1 accelerates (ease-in) and stops dead on b3
    ev.append(("climb:rank:1", "hit", b3, 0))
    ev.append(("climb:rank:1:bell", "bell", b3, "C6"))
    ev.append(("payoff:call", "ding", F["notifs"][0] + POP, 0))
    ev.append(("payoff:whatsapp", "ding.wa", F["notifs"][1] + POP, 0))
    ev += [(f"outro:word:{i}", "text", f + POP, i) for i, f in enumerate(F["words"])]
    ev.append(("outro:logo", "bell", F["logo"] + 3, "C5", -18.5))  # the climb's last note an octave down: it resolves
    return ev


def main():
    # EDIT 4 (rarely): the kit file and the picture.
    lock = sfxmix.render_kit(os.path.join(ROOT, "audio/kit.json"), os.path.join(ROOT, "audio/kit"))
    out, placed, stats = sfxmix.mix(lock, os.path.join(ROOT, "audio/kit"), events(), fps, cues["frames"], LOUD,
                                    highpass=HIGHPASS, clean=CLEAN, **MASTER)
    sfxmix.write(ROOT, out, placed, stats, fps, cues["frames"], KIND)
    mp4 = sfxmix.mux(os.path.join(ROOT, "out/picture.mp4"), os.path.join(ROOT, "audio/mix.wav"),
                     os.path.join(ROOT, OUT))
    print(mp4, sfxmix.decoded_levels(mp4))  # decoded true peak must stay under 0 dBTP


if __name__ == "__main__":
    sys.exit(main())
