# 17. Field notes: everything that cost us time

One line each, grouped. Every one of these happened on a real video between September and November 2026. The docs
explain them; this page is for skimming before you start.

## Recording

- `ffmpeg -f avfoundation` on the Mac silently dropped about 15 % of the audio buffers for a whole take, with nothing
  in its log. Record with AVFoundation's own writer and run a drop test on any new recorder ([02](02-recording.md)).
- The iPhone's own camera app records HDR (HLG, Dolby Vision); an 8-bit re-encode shifted the colours in CapCut and
  Meta shows HDR washed out. Record SDR with Blackmagic Camera.
- Blackmagic Camera's audio track starts 2 to 18 ms after the video. Add the audio `start_time` to every word time.
- The lav receiver's right channel is a -6 dB safety copy; the main is the left.
- A rotated phone file reports one size in ffprobe and decodes at the other. Plan crops on an extracted frame.
- AirDrop keeps a recording's own modification time: find a new file by ctime or size, not by mtime.
- A 0-byte file arriving by AirDrop is still transferring while its mode is rw-------. Wait for rw-r--r-- and a stable
  size before moving it.

## Sync and transcription

- No clap needed: the phone's own audio is the sync reference, by envelope cross-correlation.
- Phone and Mac clocks drift -10 ms per 1000 s. One offset per take, measured on its own span.
- Low correlation scores on short windows were still right (the mic's noise gate silences the pauses). Trust a robust
  line per file.
- Scribe glues long silences onto the first word after them (one word lasted 16 s). The waveform onset is the truth.
- Scribe stretches the last word of a take over the following silence. Cap it.
- Scribe can loop a phrase said two or three times into a hallucinated copy squeezed into 50 to 100 ms. Detect runs of
  6+ words under 60 ms apart, re-send that cluster alone, replace, renumber, before choosing takes.
- Forcing `language_code` breaks the English words in mixed Spanish and English speech. Let it auto-detect.
- A subscription with a failed payment still reports credits but refuses speech-to-text with 401.

## Cutting

- The model must pick words, never timecodes. Every hallucinated timestamp is a cut in the middle of a word.
- A lav mic's noise gate puts pauses at -80 to -100 dBFS: thresholds relative to the floor fire on breaths. Hang them
  from the speech level.
- A 200 ms tail after the last word felt loose; the editor's own trims sat at 50 to 100 ms.
- A caption that runs "until the next word" carries the last word of a take onto the next shot. Clamp captions to
  their piece.
- `-t` cuts audio on the AAC packet grid; over a concat the voice creeps ahead. Exact frame counts and audio trimmed
  to N/30 s.
- November: cut where the waveform drops after the last word (a median 22 dB under its peak), not at the end of the
  tail and never on transcript times ([06](06-cut-points.md)).
- A word-final "s" lives above 3 kHz: the full band can read silent while the "s" is still there. Check the high band
  before trusting a borderline out-point.
- A noisy room raises a clip's floor 10 to 15 dB: judge its edges against its own floor, not a fixed line.
- Scribe's language model can rewrite a word from context (it heard a word said earlier). Break a tie with Scribe on a
  raw 5-second slice of the original file, not with Whisper: Whisper smooths stutters and garbles quiet trailing
  speech, so use it only to confirm the first sound of a word at an edge.
- A hyphenated stutter token from Scribe ("de-esté") becomes one glued caption word. Map it.
- Scribe's audio events (a ringing alarm) span the silence around the sound. Map the real event on the waveform.
- A quality check that hears a different word on the processed cut than on the raw take is not proof of a bad edge:
  transcribe the uncut source slice first. Sometimes the take itself is slurred.
- A cut zoom is a level change at the join, never a push that keeps moving after it.
- A stutter at a join was ffmpeg duplicating a frame when reading a concat at a constant rate: `-fps_mode passthrough`.

## CapCut

- CapCut for Mac is sandboxed: a script-written project that points outside `~/Movies` says the media is missing even
  when it is there. Clone the media into `~/Movies` and rewrite the paths.
- CapCut must be quit (Cmd+Q, not just the window) before writing a project; it rescans only at startup.
- A backup of a project inside CapCut's projects folder shows up as a project. Back up outside it.
- Every timeline holds its own copy of each compound: overlays, gain and effects go into every copy.
- After a hand edit of a caption, CapCut can keep the old words in `base_content`: "one or two words look different".
- More than 10 timelines makes the project card claim many gigabytes (it counts each timeline's sources).
- A Windows project opened on the Mac renders a fallback font on every timeline except the first one opened, until
  the effect paths are rewritten.
- Replacing an overlay file in place can show a stale picture (compounds can be pre-rendered). New file name per
  version.
- Never clone a take's audio extras (noise reduction, voice enhancement) onto an overlay.
- When a format object has no sample, ask for a 20-second throwaway project doing exactly that action.
- Moving a folder that a project points at breaks the project.
- CapCut's cache is derived data and can grow to many gigabytes; the projects folder is the only thing to keep.

## Overlays and motion

- A plain chroma key on a 4:2:0 MP4 leaves a pink line on every edge. Unmix the known colour, or better, render the
  design's code bundle with a real alpha channel.
- Attaching a second DevTools client to a rendering page drops the transparent background override: every later frame
  comes out white.
- `ffprobe` reports ProRes 4444 with alpha as `yuva444p12le` even when encoded from 10-bit.
- `-count_frames` on ProRes decodes the whole file; the MOV's `nb_frames` is exact and instant.
- WebM with alpha did not work in CapCut; ProRes 4444 .mov does.
- `opacity` or `filter` inside a CSS `preserve-3d` chain flattens the 3D. Fade the flat wrapper, or every slice.
- Fonts fail silently in browser renderers. Delay the render until the font is loaded for a sample with every accent.
- Remotion's bundled Chrome hung on the Mac; Playwright's `chrome-headless-shell` worked.
- Remotion stills of a fully opaque frame come out as RGB PNGs, no alpha channel.
- Homebrew's ffmpeg 9 has no libass and no drawtext: burn captions with PIL in the frame pipe.
- npm 11 blocks install scripts by default (an esbuild warning); Remotion still bundles fine.
- Run Apple Vision's person masks through one sequence handler for the whole folder: that is what smooths them over
  time.
- A cartoon "puff" that removes the speaker from the frame needs an empty-chair plate: one frame inpainted with LaMa
  over the person mask grown by 28 px.
- Whatever overlaps the speaker goes behind them through the person mask. In front only what sits on the shirt, the
  captions and full-screen B-roll ([21](21-coded-overlays-on-talking-head.md)).
- Meta crops a 9:16 ad to 4:5 for the feed: only y 285 to 1635 of a 1080x1920 frame survives. Every element lives in
  that band; check it with a crop sheet (`crop=1080:1350:0:285`).
- One codebase, many films: every word in a copy file, every frame and sound in a cues module, and one cues file read
  by both the picture and the mixer, so the sound cannot drift from the picture ([20](20-animated-films.md)).
- A coded film with no voice creates silent holes once it gets faster. Fill them with sound on things that already
  move, never with a bed ([19](19-sound-effects.md)).

## Export

- The concat demuxer squeezes time at every MPEG-TS join: a 4K master came out 0.47 s short. Write `duration` lines.
- Check timing with the `pts_time` of every frame, never with `-ss` spot checks.
- Two frames on one timestamp after a concat is squeezed time, not an extra frame. Do not "fix" it with `fps=30`.
- VMAF near 0 over a stretch means misaligned inputs.
- Piping RGB into libx264 uses BT.601 and writes no tags unless told. Say BT.709 on decode and encode.
- A stream-copy concat can drop the colour tags; `h264_metadata` puts them back without re-encoding.
- Decoding and re-encoding through a raw pipe to "fix" timing changed the luma by 2 to 3 steps.
- A CapCut export can carry its audio up to 29 ms off the video, and its true peak can go over 0 dBTP.
- Apple's AAC encoder writes 2112 priming samples. Mux with `-use_editlist 0` (Meta-ready) and the audio plays 44 ms
  late. Trim `atrim=start_sample=2112` before the encoder ([19](19-sound-effects.md)).
- Meta re-encodes every ad into its own 4 copies (360p to 1080p). Upload bitrate, 4K, denoise, frame rate and tags do
  not change what plays; light at the shoot does ([14](14-masters-and-web.md)).
- ffmpeg 8 and later dropped `-vsync`: use `-fps_mode vfr` (a frame sheet with select + tile needs it).
- `pkill -f <pattern>` kills its own shell when the pattern is in the command line. Kill by PID.

## Delivery

- Some static hosts answer range requests with a full 200, and iPhones will not play the video. Serve video from a
  host that answers 206.
- Headless WebKit blocks every muted autoplay over plain http: check the muted preview on a real iPhone.
- The poster must be decoded with the BT.709 matrix or the page shows a colour jump when the video starts.

## Working with the human

- First question when anything goes wrong: were takes or minutes lost? Answer that before anything else.
- Review in batches of 30 to 60 seconds of video. Apply each note to everything already made before adding more.
- Previews must look exactly like the final style (captions included), or the review is about the wrong thing.
- Never regenerate something the human already touched. Diff and edit in place.
- Say what you could not check. "I cannot hear it" is a sentence that belongs in every delivery.
