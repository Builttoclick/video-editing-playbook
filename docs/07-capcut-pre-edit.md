# 7. The CapCut pre-edit

The pre-edit is the default for every ad shoot: code does the hours of syncing, finding takes and captioning, and
hands over a CapCut project where only the creative work is left. The way Joaquín put it when it became the default: the
pre-edit removes the boring part, and the creative control (the trims, the overlays, the feel) stays with the editor.

## Why CapCut, and why it can be written by code

- It is free and it is the editor Joaquín is fastest in.
- **CapCut desktop keeps every project as plain JSON** in a folder (CapCut for Windows 9.3 and 9.4, CapCut for Mac
  9.5). Not encrypted (unlike JianYing 6 and later, the Chinese version). So a Python script can write a complete
  project, and CapCut opens it as if a person had built it. The format is in [08](08-capcut-draft-format.md).
- There is no official editing API. Everything we know about the format we learned by reading projects CapCut wrote
  itself, and by asking Joaquín for tiny throwaway projects that do exactly one thing (more on that below).

## What the project holds (the current flow, CapCut 9.5 on the Mac)

**The ads project:**

| Timeline | Content |
|---|---|
| BANCO HOOKS | every hook take, script order, the last 2 or 3 complete takes per hook, a star on the last one |
| BANCO CUERPOS | the same for the bodies |
| BANCO CTAS | the same for the closing lines |
| SONIDOS | the sound effects of past ads, one after another with 1 s of air, to copy from |

**Every take is a compound clip** (CapCut's nested sequence) holding:

- the **raw phone file**, the span of the take plus **1.5 s of handles** on each side, with the phone's own audio
  inside at **volume 0** (muted, but the slider is there if it is ever wanted);
- the **clean mic audio** under it, synced for that take within 1 ms ([03](03-ingest-and-sync.md)), with CapCut's
  **Reduce noise** on (unless the room says otherwise, [12](12-sound.md));
- **native CapCut captions** inside, in the house style, one word at a time ([09](09-captions.md)).

On the timeline the compound is **cut tight**: 40 ms before the first word, 80 ms after the last. Drag an edge out and
the handles show air and the breath, and because the captions live inside the compound they stay on the words.

**The VSL project:**

| Timeline | Content |
|---|---|
| VSL RAW | the whole raw VSL take (17:50) as **one** compound with all 466 captions inside, and a **marker** at the pick of every part |
| VSL ARMADO | the pick of every part, cut tight, in script order: a starting point for the edit |

**No clip files are written.** Every compound points at the real raw file and the real mic file. The whole pre-edit
is a few megabytes of JSON.

## The rules Joaquín set (each one came from a real mistake)

1. **The same raw file goes into the project.** No new file, no re-encode, no export. A re-encode once shifted the
   colours; since then the rule is absolute.
2. **Do not touch colour.** Segments are clones of what CapCut wrote in one of Joaquín's own projects; no LUT, no adjustment,
   no HDR field changed. The validator asserts it.
3. **Cuts are made in the project, not in the video**, as in and out points, so either edge can be dragged.
4. **The cut sits on the exact millisecond** the phrase starts and ends on the waveform ([06](06-cut-points.md)).
5. **Synced sources live inside one compound, and every cut is a cut of the compound.** With two sources cut side by
   side on two tracks, changing the layout means moving one clip and matching the other by hand, cut after cut. With a
   compound, open it once, move things, and every cut follows.
6. **At most 10 timelines per project.** Each timeline re-counts its source files on the project card, which reads as
   disk use (13 timelines cutting one compound on 5.5 GB of footage showed "66.9G" for a 1.3 MB folder). More variants
   go into a bank timeline.
7. **Social clips are vertical. Always, without asking.**
8. **Never regenerate a project that has been opened.** Diff the live JSON against what was generated and edit in
   place. The human edits (trims, compounds, voice isolation, a fixed caption) are the source of truth.
9. **Ping when it is ready** (we use a Telegram bot), with what is where.

## The Mac trap: the sandbox

CapCut for Mac is the App Store build, and it is **sandboxed**. It reads `~/Movies` on its own; anything else only
through its own file dialog, saved as security-scoped bookmarks that cannot be created from outside the app.

So a script-written project that points at `~/Documents/...` opens with **"Couldn't find some of the imported media
files. Link the media files then edit."**, although the files are exactly there. The fix:
[`relink_movies.py`](../code/capcut-pre-edit/relink_movies.py) clones the media into `~/Movies/<same relative path>`
with APFS clones (`cp -c`: zero extra disk, 12 GB in under a second) and rewrites every path in every file of the
project. Two details: an APFS clone does not follow later edits to the original (re-export a file, clone it again),
and a hard link is worse than a clone here (it can resolve to its other name in the sandbox check).

## Writing a project safely

- **CapCut must be quit** (Cmd+Q; closing the window keeps the project loaded). It rescans the projects folder only at
  startup and rewrites its own cache file on exit. A `.locked` file in a project folder means it is open.
- **Back up first**, by APFS clone, to a folder **outside** CapCut's projects folder, or CapCut lists the backup as a
  project.
- **Dry run first.** Every writer prints the plan without `--write`.
- **Validate after.** The validator must print `ALL CHECKS PASSED`: compounds, captions, mic offsets within 2 ms of the
  plan, mutes, noise reduction, wrappers identical to their parents, media list, markers
  ([`validate_v7.py`](../code/capcut-pre-edit/validate_v7.py)).
- **Write the README** for the editor: what is in every timeline, where every part sits in the raw, the alternatives
  worth rescuing, what changed against the script.

## Templates: ask for a 20-second throwaway project

The writer clones every object from a real project CapCut saved (a compound, a caption, a marker, a local audio file
with Reduce noise on it). When an object had no sample in any existing project, we asked Joaquín for a 20-second
throwaway project doing exactly that one action ("import a wav and an mp3, turn on Reduce noise on the wav, add a
marker, quit"). It takes a minute and gives the exact format CapCut writes. Much better than guessing.

## After the human edit

- **Audio edits do not travel between ads.** Every timeline holds its own copy of each compound, so a gain change or a
  sound effect added inside a body in one ad is missing in the others. We wrote a sync step that copies compound gain,
  take gain, the noise reduction state and the sound-effect tracks from the edited ad to every other copy (never into
  the bank).
- **Transitions too:** Joaquín's own cut decisions (a 0.333 s "Pull in" plus a whoosh centred on the cut) copied to the
  ads that had none. No transition where two overlays both cover more than 30 % of the frame at the cut (measured
  with `alphaextract` on the overlay frames).
- **Combinations are glued in code, not in CapCut.** Once Joaquín exports the finished pieces, building every ad
  (hook + body + closing) is ffmpeg ([13](13-finished-render.md)). In Joaquín's words: "capcut no importa, no lo uses, podés
  pegamentar las partes con tu propio código, si ya exporté en mp4".
- **Transcribe the exports again** (they are the truth now) before writing any overlay brief.

## How the flow evolved (so you can skip our mistakes)

1. **Long-form, September:** screen recording + phone camera, synced, rendered as pre-cuts, two compounds (16:9 for
   YouTube with the camera as a slice on the side, 9:16 stacked for social), one timeline per clip. Lesson: put the
   synced sources inside one compound.
2. **First ad shoot:** single-camera takes referenced in place, one timeline per ad. Lesson: raw files in place, cuts
   in the project, max 10 timelines.
3. **Second ad shoot (Windows):** lossless take clips with 1.5 s handles cut by stream copy from the keyframe, every
   take a compound with captions. Worked, but wrote gigabytes of clips.
4. **Now (Mac):** the raw file and the mic file inside every compound, nothing written but JSON.

## Housekeeping

- CapCut's cache is all derived data and can grow to many gigabytes (720p proxies of every long source, about 60 % of
  the source size, plus speech models, thumbnails and pre-renders). With CapCut closed, the whole cache folder can go;
  the projects folder is the only thing to keep.
- Moving a folder that a project points at breaks that project. Move media before building the project, never after.
- A CapCut export can carry its audio up to 29 ms off its video. Measure it before gluing exports together.
