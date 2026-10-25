# 1. The pipeline, end to end

This is the map. Every later doc zooms into one box of it.

## Who does what

- **Joaquín** writes the idea, records, and makes every creative call: which take feels right, how long a pause
  breathes, what a graphic should say, when the sound is good. The editing happens in CapCut, because that is where Joaquín
  is fast.
- **Claude** (Claude Code, Anthropic's coding agent, running on the same Mac) does everything that is measurable or
  repetitive: pulling the files off the phone, syncing the mic, transcribing, reading the whole transcript and choosing
  takes, finding cut points on the waveform, writing the CapCut project as JSON, coding the motion graphics, rendering,
  exporting masters, encoding for the web and checking every file before anyone watches it.

The split matters. The first version of our tooling tried to deliver finished MP4s straight from code. It worked, and
Joaquín still said no for the ad shoots: "seguí estos pasos porque yo sé que esto es lo que funciona" (follow my steps,
I know this is what works). So the default became: code does the pre-edit, the human does the edit. The finished-MP4
path is still there for when someone asks for it.

## The one idea underneath everything

**The model never watches the video. It reads it.** A word-level transcript is the map, the waveform gives the exact
millisecond of every cut, and frames are looked at only at decision points and in QA.

**The model picks words, never timecodes.** The most common failure of "AI editing" is a model that types timestamps
it does not have: paste a transcript into a chatbot and ask for cuts, and you get cuts in the middle of words. So every
choice is written as word indices or word anchors ("from 'son las dos de la mañana' to 'durmiendo contigo'"), and code
turns words into times and snaps them to the sound.

## Three ways out of the same recording

| Path | When | What comes out | Doc |
|---|---|---|---|
| **A. CapCut pre-edit** (the default for ad shoots) | Joaquín will edit | a CapCut project: every take as a compound clip with 1.5 s handles, the clean mic synced inside, captions one word at a time in the house style, banks of takes, markers | [07](07-capcut-pre-edit.md), [08](08-capcut-draft-format.md) |
| **B. Finished render** | someone wants MP4s without opening an editor | finished 9:16 and 4:5 MP4s from an edit decision list: snap zooms, captions, callouts, sound effects, -14 LUFS | [13](13-finished-render.md) |
| **C. Coded motion graphics** | a piece needs real graphics (the VSL) | transparent overlays rendered from React code, placed inside the CapCut compounds, then frame-exact masters | [11](11-motion-graphics-in-code.md), [14](14-masters-and-web.md) |

Paths A and C combine: the VSL was pre-edited in CapCut (path A), Joaquín cut it, then the overlays were coded and put
back inside that same timeline (path C), and the masters were exported in code from that exact cut.

## The steps

```
record ──► transfer ──► sync ──► transcribe ──► read + choose ──► cut points ──► CapCut project
                                                                                   │
                                                          Joaquín trims, fixes captions, decides
                                                                                   │
                                         overlays (Claude Design or Remotion) ◄────┘
                                                      │
                                     sound ──► export masters ──► web encode ──► QA ──► upload
```

| # | Step | Tools | Doc |
|---|---|---|---|
| 1 | Record: phone camera app in 4K SDR, the lav mic recorded on the Mac | Blackmagic Camera, DJI Mic Mini, a tiny AVFoundation recorder | [02](02-recording.md) |
| 2 | Transfer the takes off the phone over USB | pymobiledevice3 | [03](03-ingest-and-sync.md) |
| 3 | Sync the mic to every take by waveform | numpy, scipy (cross-correlation) | [03](03-ingest-and-sync.md) |
| 4 | Transcribe every word with its time | ElevenLabs Scribe v2 | [04](04-transcription.md) |
| 5 | Read the whole transcript, choose takes | Claude, a timed line view | [05](05-choosing-takes.md) |
| 6 | Find the real start and end of each phrase | RMS envelope at 1 ms | [06](06-cut-points.md) |
| 7 | Write the CapCut project | Python writing CapCut's JSON | [07](07-capcut-pre-edit.md), [08](08-capcut-draft-format.md) |
| 8 | Captions | CapCut native captions, or our own burn-in | [09](09-captions.md) |
| 9 | Overlays | Claude Design, or Remotion + Apple Vision masks | [10](10-overlays-claude-design.md), [11](11-motion-graphics-in-code.md) |
| 10 | Sound | CapCut, ffmpeg, a synthesized SFX kit | [12](12-sound.md) |
| 11 | Masters and the web file | ffmpeg, x264 | [14](14-masters-and-web.md) |
| 12 | QA | our qa script, ffprobe, VMAF, contact sheets | [15](15-qa.md) |

## How a shoot folder looks

One folder per shoot (we call a shoot a "push"):

```
<shoot>/
  RAW/              the phone files and the mic recording, untouched forever
  AUDIO/            the mic's main channel as dual mono 16-bit (what goes into CapCut)
  edit/
    sync.json       per take: offset and drift of the mic against the phone
    transcripts/    one Scribe JSON per take, words in the take's own time
    LINES.md        the whole shoot as timed lines with word indices (what gets read)
    plan.json       every chosen take: words, cut points, span with handles, sync offset
  PRE-EDIT-README.md   generated: what is in the CapCut project and where every part sits
  VSL-MOTION/       the coded overlays project, when there is one
  EXPORTADOS/       Joaquín's exports, renamed to the ad name
```

Raw files are never modified, re-encoded or moved after the project points at them. Everything derived lives next to
them and can be regenerated.

## A real run, for scale

The October shoot that produced the VSL in this repo:

- One evening of recording: three phone files that count (a setup file, one with every ad piece, one with the VSL),
  about 17:50 of raw take for the VSL alone, plus 53 minutes of mic audio.
- The pre-edit: 86 takes chosen, 65 for the ads (the last 2 or 3 complete takes of every hook, body part and closing
  line) and one pick for each of the 21 VSL parts. Two CapCut projects written by code: 65 and 22 compound clips, 307 and 586 native
  captions, every mic offset within 2 ms of the plan.
- Joaquín cut the VSL in CapCut to 2:23.
- The motion graphics for the whole VSL were coded the next morning in four batches, each one reviewed by Joaquín
  before the next ("súper sólido", then "continúa"), placed inside the CapCut compounds of that cut, and exported the same
  afternoon as an HD master, a native 4K master and a 41 MB web file.

## The rules that hold across every step

1. Never touch the raw files. No re-encode, no colour change, no move once a project points at them.
2. The model reads, code measures. Words in, times out.
3. Every cut lands on the waveform, never inside a word.
4. Exact frame counts everywhere, or audio drifts against video over a concat.
5. Never regenerate a project Joaquín has opened: diff the file and edit it in place. The human edits are the truth.
6. Check every render before showing it, with numbers and with eyes on contact sheets.
7. Say what cannot be checked. Claude cannot hear, so the mix and the sound design always need human ears.
8. When something fails, find out whether takes or minutes were lost first. That is the first question every time.
