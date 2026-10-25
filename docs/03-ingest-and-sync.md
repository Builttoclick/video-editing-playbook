# 3. Ingest and sync

## Getting the takes off the iPhone

Over USB, with [pymobiledevice3](https://github.com/doronz88/pymobiledevice3) (AFC). It uses the Mac's existing pairing
through usbmuxd: no trust prompt, no extra drivers, no Photos app.

```bash
python3 -m venv ~/venvs/iphone && ~/venvs/iphone/bin/pip install pymobiledevice3
```

Blackmagic Camera saves into the camera roll as `/DCIM/<NNN>APPLE/IMG_####.MOV`. Two small scripts on top of the
library do the rest:

- **list**: each file with its birth time and mtime. Birth time is when the take started and mtime when it ended, so
  `mtime - birth` is the clip length. It matched six takes to the second, which makes it easy to tell real takes from
  tests before copying anything.
- **pull**: copies the chosen files in the background, skips files already complete, keeps the phone's mtime.

Speed on a Lightning iPhone (USB 2): **37.7 MB/s**. Estimate before copying: total GB / 0.0377 = seconds (18.7 GB took
about 8 minutes).

Dead end, so you do not try it: ImageCaptureCore from a command-line binary. `ICDeviceBrowser` never reported the phone
in 4 minutes, and the content authorization call it needs is iOS-only.

## The mic file for the editor

The mic recording keeps both channels as recorded (`RAW/`). For the editor we make one derived file: the main (left)
channel on both sides, 16-bit:

```bash
ffmpeg -i RAW/DJI-MAC-<stamp>.wav -af "pan=stereo|c0=c0|c1=c0" -c:a pcm_s16le AUDIO/DJI-MAC-<stamp>-MAIN.wav
```

The voice sits centred (the raw left and right are 6 dB apart) and the file is a third smaller (614 MB instead of 920 MB
for 53 minutes). Joaquín okayed the drop from 24-bit to 16-bit: "recomprimir no se nota".

## Sync by waveform, no clap

The phone records its own (bad) audio of everything. That track is the reference: we slide the mic recording until
its sound lines up with the phone's.

### 1. A guess from the clocks

Both devices stamp the **start** of a recording (`creation_time` on the phone file, the start time in the mic file
name), with 1-second resolution. `phone_start - mic_start` is the first guess of where each take sits inside the mic
file.

### 2. Envelopes, not samples

Two different microphones in two places never match sample by sample, but their loudness over time does:

- decode both to 16 kHz mono (the mic's left channel only);
- log-RMS envelope at **1 ms** hops;
- subtract a 400 ms moving average, so only the onsets and decays are left (what both mics share).

### 3. Cross-correlate: coarse, then fine

- **Coarse:** 150 s of the take against the mic envelope, within +-30 s of the clock guess, by FFT convolution. A
  parabolic fit around the peak gives sub-millisecond lag. Quality = (peak - mean) / std of the correlation.
- **Fine:** 30 s windows every 45 s along the take, each searched within +-300 ms of the coarse lag. Fit a line
  `offset(t) = a + b*t` through the windows, drop the outliers, refit. That gives the offset and the drift.

The math is ten lines (`xcorr` and `envelope` in [`code/capcut-pre-edit/common.py`](../code/capcut-pre-edit/common.py),
the loop in [`sync.py`](../code/capcut-pre-edit/sync.py)).

### 4. One offset per take, measured on its own span

When the cut plan is built, every chosen take gets its own offset, measured on exactly the span that goes into the
project (+-60 ms around the coarse lag). What we learned about the numbers:

- **The clocks drift.** iPhone against the Mac: **-10 ms per 1000 s**. Over a 3-minute VSL that is 2 ms. A single
  17-minute compound aligned at its middle stays within +-5 ms at both ends. (An iPhone against a Windows laptop: 3 ms
  over 24 minutes.)
- **Low quality scores are not wrong offsets.** The mic's noise gate puts the pauses at -80 to -100 dBFS while the phone
  hears the room, so short windows score low (q 1.6 to 2.4). They still sat on one straight line within 0.5 ms. Trust
  the robust line per file, never one window alone.
- **Result:** every take synced within 1 ms on its span; the generated CapCut projects had every mic offset within
  2 ms of the plan.

### 5. Verify after any render

If a clip is rendered with the mic audio, measure the offset again **inside the rendered file** (mic track against the
phone track, per 30 s window). It catches a concat that squeezed time or an audio stream that started late.
