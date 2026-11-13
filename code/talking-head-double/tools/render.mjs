// Bundle once, then render stills (QA) or the silent picture (H.264) that tools/sound.py muxes with the mix.
//   node tools/render.mjs stills 10,60,120 [outDir]   -> <outDir>/f<frame>.png
//   node tools/render.mjs video                        -> out/picture.mp4
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [mode, arg2, arg3] = process.argv.slice(2);
// Remotion's own Chrome (157 dev build) stalls on "Waiting for root component" on this Mac (24-oct-2026);
// Playwright's chrome-headless-shell 145 works.
const PW = path.join(process.env.HOME, "Library/Caches/ms-playwright");
const shells = (fs.existsSync(PW) ? fs.readdirSync(PW) : [])
  .filter((d) => d.startsWith("chromium_headless_shell-"))
  .sort();
// REMOTION_BROWSER, else the newest Playwright headless shell, else (undefined) Remotion's own browser
const browserExecutable =
  process.env.REMOTION_BROWSER ||
  (shells.length ? path.join(PW, shells[shells.length - 1], "chrome-headless-shell-mac-arm64/chrome-headless-shell") : undefined);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const compId = process.env.COMP || "AN01";
// SCALE=2 renders at 2160x3840 (a 4K master we tried once; the ads went out in 1080)
const scale = Number(process.env.SCALE || 1);
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable });

if (mode === "stills") {
  const outDir = arg3 || path.join(root, "out/stills");
  fs.mkdirSync(outDir, { recursive: true });
  for (const frame of arg2.split(",").map(Number)) {
    const output = path.join(outDir, `f${String(frame).padStart(3, "0")}.png`);
    await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", browserExecutable });
  }
  console.log(`${arg2.split(",").length} stills in ${outDir}`);
} else if (mode === "video") {
  const outputLocation = path.join(root, "out/picture.mp4");
  const t1 = Date.now();
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 14,
    pixelFormat: "yuv420p",
    imageFormat: "jpeg",
    jpegQuality: 95,
    muted: true,
    outputLocation,
    scale,
    concurrency: 4,
    browserExecutable,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        process.stdout.write(`${p * 10}% `);
      }
    },
  });
  console.log(`\npicture: ${outputLocation} in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
} else if (mode === "layers") {
  // the talking-head double: both layers as ProRes 4444 with alpha, for tools/th_compose.py
  const outDir = path.join(root, "out/layers");
  fs.mkdirSync(outDir, { recursive: true });
  for (const layer of (arg2 || "back,front").split(",")) {
    const comp = await selectComposition({ serveUrl, id: `TH-${layer}`, browserExecutable });
    const outputLocation = path.join(outDir, `TH-${layer}.mov`);
    const t1 = Date.now();
    let last = -1;
    await renderMedia({
      composition: comp,
      serveUrl,
      codec: "prores",
      proResProfile: "4444",
      pixelFormat: "yuva444p10le",
      imageFormat: "png",
      outputLocation,
      scale,
      concurrency: 6,
      browserExecutable,
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10);
        if (p !== last) {
          last = p;
          process.stdout.write(`${layer} ${p * 10}%  `);
        }
      },
    });
    console.log(`\nTH-${layer}: ${comp.durationInFrames} frames in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  }
} else {
  console.error("usage: node tools/render.mjs stills <frames> [outDir] | video | layers [back,front]  (COMP=<id> picks the composition for stills/video)");
  process.exit(1);
}
