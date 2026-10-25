# vsl-motion: the VSL's motion graphics in code

The Remotion project that made every graphic of the VSL in [`examples/`](../../examples), as it shipped. How it works,
step by step: [docs/11](../../docs/11-motion-graphics-in-code.md). Masters: [docs/14](../../docs/14-masters-and-web.md).

## What is where

| Path | What |
|---|---|
| `src/scenes/P1.tsx` ... `P8d.tsx` | one scene per part of the VSL, every cue tied to a word index (`cue(part, i)`) |
| `src/components/` | `Phone3D` (a phone with real thickness), `Screens` (the average page and ours), `Bits` (chips, toasts, the extruded type), `Board` (the full-screen board that swings in like a door), `Proposals`, `Misc`, `SlotChip`, `base` (layers, the 3D wrapper, icons, type) |
| `src/lib/anim.ts` | `cue`, springs, eased ramps |
| `src/theme.ts` | the whole look in one object, and the shared camera |
| `src/data/parts.json` | every part: compound length, raw and mic spans, the visible window, every caption word in compound time (read from the CapCut timeline) |
| `tools/parts_from_capcut.py` | writes `parts.json` from a CapCut 9.5 timeline (read-only) |
| `tools/personmask.swift` | Apple Vision person masks for a folder of frames |
| `tools/render.mjs` | bundle once, then QA stills or ProRes 4444 layers (HD, or native 4K with only the visible frames) |
| `tools/compose.py` | FRONT over (BACK minus the person) into one overlay with real alpha, or QA stills over the real frames |
| `tools/render_list.sh`, `render_all.sh`, `render4k_all.sh` | batches |
| `tools/preview.py` | the footage cut like the timeline + mic + captions + overlays, for review |
| `tools/place_capcut.py` | puts each overlay inside its compound in the CapCut project (CapCut quit, backup first) |
| `tools/export.py` | frame-exact HD and 4K masters |
| `public/` | placeholder logos with the file names the scenes use: replace them with your own |

## Run it

```bash
npm install
node tools/icons.cjs                         # writes src/data/icons.json from the Iconify packages
npx remotion studio src/index.ts             # look at any part, either layer (P4b-back, P4b-front, P4b-all)
```

Rendering on a Mac: Remotion's bundled Chrome hung for us, so `tools/render.mjs` uses Playwright's
`chrome-headless-shell` (set `REMOTION_BROWSER` to its path).

The scenes render on their own (transparent layers). Compositing, previews, placement and masters need your footage:
frames and masks of each part in `cache/`, the raw take and the mic file under `~/Movies/VSL-MEDIA/` (see the top of
each tool), and your CapCut project.

## Licences of what this uses

Remotion has its own licence (free for individuals and companies of up to 3 people; check yours). Poppins is SIL Open
Font License. The icons are Solar (CC BY 4.0, by 480 Design) and Remix Icon (Apache 2.0), generated into
`icons.json` by `tools/icons.cjs`.
