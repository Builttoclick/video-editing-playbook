# 10. Overlays made with Claude Design

For the ad series of September and October, the animated overlays (search bars typing, chat bubbles, numbers that
count, screenshots that point at a button) were made in **Claude Design**, Anthropic's design tool, and placed inside
the CapCut project by code. The three ads in [`examples/`](../examples) were made this way. This doc is how to brief
it, how to get real transparency out of it, and where they go in the edit.

## Overlays by piece, not by ad

Joaquín's format, set on the first big batch: "no lo haremos por anuncio, haremos por pieza" (not per ad, per piece).

- An ad is a hook + a body + a closing, and the same body appears in several ads. So **one overlay per piece**
  (28 pieces made the 9 ads of that series), not one per ad.
- **Each overlay is as long as the whole take**, handles included, and goes **inside that take's compound clip, at
  00:00, on a track above the video**. Compound time = take time = the caption word times, so the overlay lands on the
  words in every ad that uses the piece, and it survives any re-trim.
- The overlay keeps everything inside the piece's **window**: the tightest cut of that piece across all the ads. Outside
  the window it is empty.
- Every ad has its own copy of each compound ([08](08-capcut-draft-format.md)), so the overlay goes into each copy.
  That is a script, with the project closed.

## The kit, generated from the live project

A script reads the CapCut project (read-only) and writes a folder to drag into Design:

- `BRIEF.md`: the rules for every piece (below).
- `PIEZAS/<piece>/`: per piece, a sheet with what is said, **the second of every word** (from the captions), how it
  should be shown, the verified numbers, and the screenshots and logos it needs.
- `PROMPTS.md`, or one single prompt for all pieces in a table: name, what it is, duration, and the window
  ("everything enters and leaves between 1.600 s and 7.167 s").

Because the kit is generated from the project, a re-trim means re-running one script, not re-writing briefs.

## The content rules (Joaquín's, after watching the first version)

1. **No client logo and no company name on screen. That is the only thing hidden.** Not in a text, not in a logo, not
   inside a chat ("Hola, quiero una cotización.", never a greeting with the business name). Screenshots of client pages
   are fine with the logo cropped and the name blurred. Phones, addresses and cities can show. Anything that carries a
   name (a ChatGPT answer, a Google result) gets the name covered.
2. **A search is shown as a search:** the Google bar with the query being typed ("negocio cerca de mí"), never a
   results page. Same for ChatGPT: its box, with the question being typed.
3. **Not one client everywhere.** Each client appears once, in its own case, as "uno de mis clientes". When the line
   talks about "a website" in general, the site is generic: Design builds a page for no brand at all.
4. **Raw phone screenshots over the video.** They can cover the face for a moment when they need the room, and they
   can be cut off at the bottom; the thing that matters (the contact button, the floating WhatsApp bubble) gets pointed
   at or enlarged. "Una edición un poco más raw." But generic elements (a chat, a chip) go in the free zones, never as
   a big card over the face ("está bien tapar la cara, pero no exagerar").
5. **When something needs most of the frame, make it a real full-screen B-roll**: an opaque branded backdrop edge to
   edge, captions still on top, never a big card with the speaker peeking around it. A big capture of a website is
   full-screen by default.
6. **Never crop bits of a client's copy into a headline.** Show the whole capture and point.
7. **What worked and stays:** WhatsApp chips with a count ("111 veces"), numbers that count up, the chat that types
   itself.
8. The text on screen comes from what is said and from verified data. No added promises, no emojis, no hashtags, no
   em dashes. The captions already show every word, so the overlay shows what the voice cannot (the search, the
   capture, the button, the number), not the sentence again.

Where things can go on the frame (measured on the real footage, 1080x1920):

| What | Where |
|---|---|
| The face | x 280 to 800, y 360 to 1100 (varies a little per take) |
| Captions | the band from y 1420 to 1580 |
| Free space | the chest (x 60 to 1020, y 1110 to 1400) and the columns beside the face (x 40 to 270 and x 810 to 1040, y 300 to 1080) |
| A search or chat box | low: bottom edge around y 1620 (it may cover the captions), top edge never above y 1110 |
| 4:5 feed crop | nothing important above y 285 or below y 1635 |

One measured result: the same hook with the overlay moved **above the head** hooked 16.7 % against 13.7 % with it low
(about 1,750 impressions each, so roughly two standard errors apart). Small samples, but it moved our default up.

## Prompting Design

- "Make the animation with your own animation engine, on your timeline, so it plays here on the canvas. Do not write
  code." Design makes animations natively, even when it does not seem to know it.
- **Never ask it for exact frames or to measure the file.** That sends it into writing an exporter instead of
  animating.
- Settings in the prompt: canvas 1080x1920, 30 fps, the piece's duration in seconds, second 0 = the first frame of the
  clip.

## Getting real transparency out

### Best: render Design's code bundle locally

Design's project export is a code bundle (HTML pages on its animation engine plus the components). Rendering it
ourselves gives a **real alpha channel** and no colour key at all:

1. Serve the bundle locally and open each page in headless Chromium with the DevTools protocol.
2. Make the stage transparent: a `<style>` with `!important` backgrounds on `html`, `body`, the engine's root, and the
   SVG `foreignObject` div where the engine paints its background; plus CDP
   `Emulation.setDefaultBackgroundColorOverride` with alpha 0.
3. Seek frame by frame with the engine's own seek event, screenshot each frame as PNG (alpha carried), pipe the PNGs
   into ffmpeg: `prores_ks -profile:v 4444 -alpha_bits 16`.
4. Warm each page up first by seeking through its whole duration once, so every image is already loaded.
5. Frames = round(duration x 30), with the duration read from the page itself.
6. Refuse a piece whose first or last frame is not empty.

**Never attach a second DevTools client to a page while it renders**, not even to peek. When it disconnects, Chrome
drops the background override and every later frame comes out on opaque white. One peek spoiled four workers once.

Speed: four workers, 4.4 frames/s in total on a Windows laptop (28 pieces, about 8,000 frames, about 30 minutes);
21 frames/s on an M1 Pro (21 pieces in 5 minutes). Code: [`render_dc.py`](../code/overlays-claude-design/render_dc.py).

### Fallback: a magenta video, unmixed

If Design exports MP4s, brief them on pure magenta (#FF00FF), and follow rules that are not about design but about
the key not breaking:

1. Magenta, opaque, edge to edge, all the time. Flat: no vignette, gradient, noise or texture.
2. Nothing magenta, pink or violet in the artwork (the Instagram logo goes in its white or black glyph).
3. No semi-transparent edges against the background: glow, soft shadows, blur, motion blur and fades leave a pink halo.
   Entrances and exits by movement, scale or cut.
4. Nothing thinner than 4 px.
5. The first and the last instant: empty magenta. No audio.

Then **unmix, do not key**: Design's MP4 is 4:2:0, so a plain chroma key leaves a pink line on every edge. Our tool
([`prores_alfa.py`](../code/overlays-claude-design/prores_alfa.py)) estimates alpha in an edge band by unmixing the
known background colour, subtracts what is left of the magenta from the edge pixels (despill), and writes ProRes 4444
with alpha. Check the edge tint **numerically**: we measured at most 6/255 on edge pixels.

Transparent files for CapCut are **ProRes 4444 .mov**. WebM with alpha did not work in CapCut.

## QA and placement

- Per piece: frames against the table, pixel format, empty outside the window, zero magenta pixels, and a contact sheet
  of the overlay over the real take. Note: `ffprobe` reports ProRes 4444 with alpha as `yuva444p12le` even when it was
  encoded from 10-bit; a check that expects `10le` fails on every file.
- `-count_frames` on ProRes decodes the whole file (minutes for 2 GB); the MOV's `nb_frames` is exact and instant.
- Placement: a script puts each .mov inside its compound at 00:00 in every listed ad, with a backup first, the project
  closed ([08](08-capcut-draft-format.md)).

## Why the VSL went further

Design's overlays are flat and sit on top of everything. For the VSL Joaquín asked for something better, "capaz un poco
3D" (maybe a bit 3D), and the answer was to code the graphics ourselves, with things behind the speaker. That is
[11](11-motion-graphics-in-code.md).

Tools move fast: when we went back to Design in mid-October, the animation features we had used were no longer in
the same canvas. Check what your version offers before planning a series around it. Code does not move under you.
