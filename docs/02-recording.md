# 2. Recording

Most editing problems are recording problems that nobody noticed. This is the setup that stopped them.

## The camera: a phone, a free app, SDR

- **iPhone 14 Pro with the Blackmagic Camera app** (free), 4K at 30 fps, H.264 8-bit, **SDR, BT.709**.
- **Why not the native camera app:** it records HEVC Main 10 with HLG and Dolby Vision (HDR). Two things went wrong
  with that. An 8-bit H.264 re-encode for the editor made CapCut render the clips with shifted colours (Joaquín's
  question that day: "vos ajustaste los colores?", did you change the colours?). And Meta shows HDR uploads washed
  out. If a file is HDR, either re-encode it as 10-bit HEVC with the same colour tags, or tone-map it to SDR in the
  render. Better: record SDR.
- What the Blackmagic files look like, which matters later:
  - stored as 3840x2160 with a rotation flag of -90, displayed as 2160x3840;
  - a closed GOP every 29 frames (0.967 s) with 2 B-frames, so a lossless cut can start on any keyframe;
  - the audio track starts 2 to 18 ms after the video. Add the audio stream's `start_time` to every transcript time.

## The mic: a lav into the Mac

- **DJI Mic Mini**, transmitter on the shirt, receiver plugged into the Mac over USB.
- The receiver gives two channels: **left = the main track, right = a safety track 6 dB lower** (correlation 1.000,
  exactly -6.0 dB). We only use the left channel.
- The phone also records its own audio. That track is never used in the final mix, but it is the **sync reference**,
  so no clap is needed (see [03](03-ingest-and-sync.md)).

### The recorder: AVFoundation's own writer, never ffmpeg

On the Mac we record the mic with a tiny Swift command-line tool built on AVFoundation's own file writer (about 60
lines; ours is called `rec_dji`):

```bash
nohup rec_dji "DJI MIC MINI" /path/to/RAW/DJI-MAC-<date>-<time>.wav > /dev/null 2>&1 &
echo $! > RAW/.rec.pid
caffeinate -i -w $(cat RAW/.rec.pid) &          # the Mac must not sleep mid-take
# ... record ...
kill -INT $(cat RAW/.rec.pid)                   # SIGINT closes the WAV header properly
```

**Why not `ffmpeg -f avfoundation`:** on this Mac it silently dropped about 15 % of the audio buffers, evenly, for a
whole 40-minute take: 33:53 of audio for 39:40 of wall time. Its log showed nothing, and its `time=` counter followed
the wall clock while the bytes fell behind. The holes landed inside the mic's noise-gate silences, so the phrases
sounded continuous and the damage only showed up at sync time: a minute of recording came out about 3 s short of real
time. Those takes had to be re-recorded.

**The drop test, before trusting any recorder:** record N seconds of wall clock and compare the file's duration to N.
The Swift recorder gave 8.384 s for 8 s; ffmpeg gave 7.083 s. Over 53 minutes the Swift recorder held exact time to
0.1 s at every 30-second check.

**"Cut and continue" without a gap:** start a new recorder first, then SIGINT the old one. CoreAudio serves the same
input to both, so nothing is lost at the seam.

## Seeing the frame while you talk

- **Zero-install monitor:** QuickTime Player, File, New Movie Recording, click the arrow next to the record button and
  pick the iPhone (connected by cable) as the camera. It mirrors the phone screen live with Blackmagic's interface and
  almost no lag. Put its volume at 0 (echo) and use View, Float on Top.
- **Remote control:** Blackmagic Camera also runs on Apple silicon Macs and can be the Controller of the iPhone
  (Settings, Remote Camera Control, on the phone). If the Mac cannot find the phone, it is the Local Network
  permission, on both devices.

## The room

- Seated at a table, a dark wall behind and above the head, warm light on the face. The empty wall above the head is
  not wasted: it is where the graphics live, and with person masks they can sit **behind** the speaker
  ([11](11-motion-graphics-in-code.md)).
- Measure the room. One room had a little echo, and CapCut's noise reduction made the voice sound worse there, so that
  project went out with no noise reduction at all ([12](12-sound.md)).
- Two formats worked for us: seated in a dark room with overlays (the website ads), and walking outside in daylight
  with the phone in hand (earlier local SEO ads, several of our best hooks ever). The same words in both formats is a
  cheap test.

## The script on set

- **Modular pieces.** An ad is a hook (3 to 5 s) + a body (10 to 25 s) + a closing call to action (5 to 8 s). Pieces
  are recorded once and combined later ([16](16-ads-and-vsl-craft.md)). Keep it to about three hooks per body: building
  every combination blindly gave weak ads.
- **Order of the day:** bodies first (they are the hardest and need the fresh voice), then hooks, then closings, then
  the long piece (the VSL).
- **At least two takes of everything**, and change something at every turn marked in the script.
- **Every written line is a draft.** Each line gets said in the speaker's own words, and the live wording usually beats the script.
  The editing never forces the script back in; a line that was never said never appears, not even as a caption.
- **Keep rolling.** One long file per block, restarts included. Do not stop the camera between attempts: the
  transcript shows every restart (a silence of 1.5 s or more before the line), and the pre-edit finds the takes.
- **The last complete takes are usually the best** ("las últimas son las que pronuncié mejor"). People warm up.
- A one-page shoot board with every line in filming order, on a screen next to the camera, saves a lot of "what was
  next".

## When a recording goes wrong

The first question is always **were takes or minutes lost**, and only then quality. Answer that first, with numbers
(which file, which minutes, which pieces), before explaining anything.
