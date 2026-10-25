# 18. Tools, versions and costs

Everything we run, with the versions that were in use in October 2026. Almost all of it is free; the exceptions are
marked.

## Hardware

| | |
|---|---|
| Computer | MacBook Pro, M1 Pro (earlier: a Windows laptop with an 11th-gen Intel i7, no GPU) |
| Camera | iPhone 14 Pro (Lightning, so USB 2 for transfers) |
| Mic | DJI Mic Mini (one transmitter, the USB receiver on the Mac) |

## Software

| Tool | Version | For | Cost |
|---|---|---|---|
| Blackmagic Camera | iOS app | recording 4K SDR on the phone | free |
| A small Swift recorder on AVFoundation | ours | recording the mic on the Mac without dropped buffers | free |
| pymobiledevice3 | 11.40 | copying the takes off the iPhone over USB | free |
| ffmpeg | 9.0 (Homebrew: has libx264, prores_ks, aac_at; no libass, no drawtext) | everything video and audio | free |
| Python | 3, with numpy, scipy, OpenCV, Pillow, soundfile | sync, cut points, compositing, QA, CapCut JSON | free |
| ElevenLabs Scribe v2 | API | word-level transcription | Starter plan, about US$5 to 6 a month |
| Claude Code | | the editor: reading, choosing, writing every script, running every step | Claude subscription |
| CapCut desktop | Windows 9.3 and 9.4, Mac 9.5 | the human edit | free |
| Claude Design | | designed overlays for the ad series | Claude subscription |
| Remotion | 4.0.538, with React 18.3 | coded motion graphics | free for individuals and companies of up to 3 people |
| Node.js | 22 | Remotion | free |
| Playwright's `chrome-headless-shell` | 145 | the browser Remotion renders with on the Mac | free |
| Apple Vision | macOS | person segmentation masks | free |
| `@fontsource/poppins` | 5.2 | Poppins inside the renders (SIL Open Font License) | free |
| Iconify icon sets | Solar (CC BY 4.0), Remix Icon (Apache 2.0) | icons in the graphics | free |
| VMAF (libvmaf in ffmpeg) | | measuring the web encode | free |
| Cloudflare R2 | | hosting the landing's video, range requests answered with 206 | free tier |

## Speeds we measured

| Step | Speed |
|---|---|
| iPhone to Mac over USB 2 | 37.7 MB/s (18.7 GB in about 8 min) |
| Scribe | a 44-minute file in 59 s; 21 short takes in parallel in 6.5 s |
| Apple Vision person masks | about 10 frames/s on the M1 Pro |
| Remotion layers, 1080x1920 | 5 parts (32 s of video) in about 5 min, composites in about 8 min |
| Remotion layers, native 4K | 2.4 to 4.7 frames/s per layer; 34 layers in about 35 min |
| Claude Design code bundle, local render with alpha | 21 frames/s in total with 4 workers on the M1 Pro |
| HD master (2:23) | about 4 min with 4 workers |

## Setup, from zero

```bash
brew install ffmpeg node python
python3 -m pip install numpy scipy opencv-python pillow soundfile websocket-client
(cd code/vsl-motion && npm install && node tools/icons.cjs)   # Remotion and the icons
npx playwright install chromium                               # Chromium + its headless shell, for Remotion on the Mac
export REMOTION_BROWSER="$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)"
swiftc -O code/vsl-motion/tools/personmask.swift -o code/vsl-motion/tools/personmask
export ELEVENLABS_API_KEY=...                                 # for transcription
```

Fonts: download Poppins from Google Fonts. The render tool expects `code/edit-pipeline/assets/fonts/Poppins-Bold.ttf`;
the VSL export expects Poppins Bold in `~/Library/Fonts`.
