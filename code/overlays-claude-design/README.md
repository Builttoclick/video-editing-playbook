# overlays-claude-design: real transparency from Claude Design

Two ways to turn a Claude Design animation into a ProRes 4444 overlay with alpha for CapCut
([docs/10](../../docs/10-overlays-claude-design.md)).

## `render_dc.py`: render Design's code bundle locally (best)

Design's project export is a code bundle: one `.dc.html` page per piece on its animation engine, plus the shared
components and assets. Extract it to `ENTREGA/DC-v2/` next to the script, then:

```bash
python3 -m pip install websocket-client
python3 render_dc.py N1 --test        # one piece: probe frames, alpha stats, speed
python3 render_dc.py                   # every piece -> ENTREGA/PRORES/<piece>.mov, 4 headless Chromium workers
```

It serves the bundle locally, makes the stage transparent (CSS `!important` on the page, the engine root and the SVG
`foreignObject` background, plus the DevTools background override), seeks frame by frame with the engine's own seek
event, screenshots PNGs with alpha and pipes them into ffmpeg's `prores_ks` 4444. Set `CHROME` to your Chromium-based
browser. **Do not open DevTools on a page while it renders.**

## `prores_alfa.py`: a magenta video into alpha (fallback)

For MP4s exported on pure magenta (#FF00FF). Put them in `ENTREGA/`:

```bash
python3 -m pip install numpy scipy
python3 prores_alfa.py N1 B1a          # -> ENTREGA/PRORES/<piece>.mov
```

It estimates alpha by unmixing the known background colour in a band around every edge and removes the magenta left
on edge pixels (despill), because a plain key on a 4:2:0 MP4 leaves a pink line. Check the edge tint in numbers
afterwards.
