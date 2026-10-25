# Research: what we read before building the editing tools (September 2026)

Method: 105 GitHub searches through the API, 6,622 unique repositories, 5,801 relevant, ranked by category. The
working playbooks were then read file by file, plus the write-ups and threads below. This is where the rules in
[05](05-choosing-takes.md), [06](06-cut-points.md), [12](12-sound.md), [13](13-finished-render.md) and [15](15-qa.md)
came from.

## What each source gave us

| source | stars / date | what we took |
|---|---|---|
| [browser-use/video-use](https://github.com/browser-use/video-use) | 26.8k, pushed 2026-09-24 | The architecture: the LLM reads a word transcript (Scribe) + looks at frames only at decision points; phrase-packed transcript; EDL JSON; per-segment extract then lossless concat; 30 ms fades; subtitles last; pad 30-200 ms; self-eval on the RENDER at every cut; a critic pass for anything published; SFX: fewer, tied to visible events, hit on the frame, -14 LUFS master; "you cannot listen: report the numbers" |
| [mariagorskikh/talking-head-reel](https://github.com/mariagorskikh/talking-head-reel) | 45, 2026-09-22 | Our exact case (phone take full of retakes -> reel). Take-selection procedure (script, tag, later over earlier, runs as one segment); snap-zoom grammar 1.0/1.1 + pushes; overlay grammar ("show what the speaker made you imagine, on the word"); SFX map and volumes; synthesized SFX kit idea; IG safe zones; QA with silencedetect over the output |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 52.9k, 2026-09-24 | HTML/GSAP overlays rendered for agents (transparent WebM); card pacing by duration and density; audio: "a mix is a set of relationships", symptom -> fix table, voiceover carve instead of full ducking |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 61.2k, 2026-09-06 | Sourced reference cards: short-form pacing (change every 1-3 s, hook rules, word counts, retention checkpoints), captions spec, platform safe zones, sound design levels (music 18-20 dB under voice, SFX 6 dB under, whoosh 10-20 ms early), what to cut / keep in a talking head, J/L cuts, overlay density 3-6 per minute |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | 4.7k, 2026-09-24 | Adaptive silence detection (loudnorm `input_thresh` as the silencedetect threshold); hosted SFX set; editable-clip conventions; text highlights |
| [barefootford/buttercut](https://github.com/barefootford/buttercut) | 596, 2026-09-23 | Library per shoot (summary + contact sheet + word transcript, grep the JSON for boundary words); "coherent dialogue wins over visual timing"; review pass: beat length for the format, word-level trims inside a segment, redundancy; export to FCPXML / Premiere / Resolve |
| [GuanYixuan/pyCapCut](https://github.com/GuanYixuan/pyCapCut), [pyJianYingDraft](https://github.com/GuanYixuan/pyJianYingDraft), [sun-guannan/VectCutAPI](https://github.com/sun-guannan/VectCutAPI) | 676 / 4.4k / 2.2k | CapCut draft generation: keyframe JSON (`UNIFORM_SCALE`, positions), audio segments, text animations (for a future CapCut hand-off) |
| [WyattBlue/auto-editor](https://github.com/WyattBlue/auto-editor) | 5.4k | Silence/motion-based cutting with NLE exports: the pre-LLM baseline; we cut on words instead |
| [slhck: From Transcripts to Timelines](https://slhck.info/video/2026/09/17/buttercut-davinci-resolve.html) | 2026-09-17 | Word timestamps are mandatory; add the audio stream start_time; correction list for jargon; -16 to -14 LUFS |
| [cutback.video: editing with an LLM](https://cutback.video/blog/how-to-edit-videos-using-an-llm-chatgpt-vs-claude-vs-selects) | | The failure mode: transcript pasted into a chatbot -> "93% target miss, 11 of 11 cuts mid-sentence, hallucinated arithmetic" |
| [dev.to: chapters without hallucinated timestamps](https://dev.to/masonwritescode/auto-generate-video-chapters-with-whisper-an-llm-without-hallucinated-timestamps-1oej) | | Let the LLM pick by index, map to times in code |
| [LearnWithHasan: Claude Code video editing](https://learnwithhasan.com/guide/claude-code-video-editing/) | | SFX plan from the word transcript, "on the word, not near it", audited before mixing; SFX library with tags and loudness, reused across projects; verify words cut in half and A/V drift |
| Retention and SFX editor guides (CapCut, Sovran, a4b, esecut, creatorsfx, Pixabay blog) | 2026 | Vary the zoom interval; 10 % zoom as the cheapest reset; whoosh / pop / riser / impact placement and levels; "a sound on every cut feels chaotic" |
| Meta ads spec guides (benly, billo, 1clickreport, marketertools) | 2026 | Reels-ad dead zones: top 14 %, bottom 35 % |
| ElevenLabs docs, Pixabay / Mixkit licences, Meta Sound Collection | | Where sounds can legally come from for a paid ad |
| Hacker News threads (Show HN ButterCut, Ask HN Claude Code in a video editor, shorz.ai MCP) | | Thin: what people ask for is subtitles, text effects, grading, silence removal |

## Other notable repos from the scan (not used, worth knowing)

MoneyPrinterTurbo (125k, topic-to-short generator), Pixelle-Video (28k), hypit (16k, clone viral videos), palmier-pro
(14k, macOS AI editor), NarratoAI (11k), video-shotcraft (9.4k, Remotion shot recipes for Claude Code), autoclip (8.9k,
highlight clipping), Hao0321/video-autopilot-kit (2.1k, CapCut JSON + ffmpeg), capcut-mate (1.9k), OpenCut / Shotcut /
Olive (open-source NLEs), OpenTimelineIO (2k, timeline interchange), MMAudio and HunyuanVideo-Foley (video-to-audio SFX
models, need a GPU), Remotion (60k), Motion Canvas (19k), MoviePy (15k), editly (5.5k).

## Our own data points

- Our best ad at the time (measured on the published file): captions in Poppins Bold at about 126 px em, one word at
  a time, centred near y 1500; overlays from Claude Design; no zooms. The editor's own CapCut projects showed sparse
  sound effects (5 whooshes in 25 s at about 0.31 volume) and no keyframes.
- A creator's published method we studied: a transcript-based editor to clean the talk, Claude Code + Remotion to
  animate. The same family as everything above.
- CapCut has no official editing API, but its desktop projects are plain JSON. DaVinci Resolve's scripting needs the
  paid Studio version.
