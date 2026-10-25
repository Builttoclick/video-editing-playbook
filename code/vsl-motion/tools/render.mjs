// Bundle once, then render stills (QA) or the full layers (ProRes 4444 with alpha).
//   node tools/render.mjs stills P1 60,75,150 [outDir]     -> <outDir>/<id>-<layer>-<frame>.png for back and front
//   node tools/render.mjs video P1 [back|front|both]         -> out/layers/<id>-<layer>.mov
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [mode, ids, arg3, arg4] = process.argv.slice(2);
// Remotion's own Chrome (157 dev build) stalls on "Waiting for root component" on this Mac (24-oct-2026);
// Playwright's chrome-headless-shell 145 works.
const browserExecutable =
  process.env.REMOTION_BROWSER ||
  path.join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

for (const id of ids.split(",")) {
  if (mode === "stills") {
    const frames = arg3.split(",").map(Number);
    const outDir = arg4 || path.join(root, "out/stills");
    fs.mkdirSync(outDir, { recursive: true });
    for (const layer of ["back", "front"]) {
      const composition = await selectComposition({ serveUrl, id: `${id}-${layer}`, browserExecutable });
      for (const frame of frames) {
        const output = path.join(outDir, `${id}-${layer}-${String(frame).padStart(5, "0")}.png`);
        await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", browserExecutable });
      }
      console.log(`${id}-${layer}: ${frames.length} stills`);
    }
  } else if (mode === "video4k") {
    // native 4K layers for the 4K master: scale 2, only the frames that are ever visible (+2 each side)
    const parts = JSON.parse(fs.readFileSync(path.join(root, "src/data/parts.json"), "utf8"));
    const p = parts.find((q) => q.id === id);
    const wins = (p.segs || [{ win: p.win }]).map((sg) => sg.win);
    const from = Math.max(0, Math.round(Math.min(...wins.map((w) => w[0])) * 30) - 2);
    const to = Math.min(p.frames - 1, Math.round(Math.max(...wins.map((w) => w[1])) * 30) + 2);
    const which = !arg3 || arg3 === "both" ? ["back", "front"] : [arg3];
    const outDir = path.join(root, "out/layers4k");
    fs.mkdirSync(outDir, { recursive: true });
    const rangesPath = path.join(outDir, "ranges.json");
    const ranges = fs.existsSync(rangesPath) ? JSON.parse(fs.readFileSync(rangesPath, "utf8")) : {};
    ranges[id] = { from, to, back: which.includes("back"), front: which.includes("front") };
    for (const layer of which) {
      const composition = await selectComposition({ serveUrl, id: `${id}-${layer}`, browserExecutable });
      const outputLocation = path.join(outDir, `${id}-${layer}.mov`);
      const t1 = Date.now();
      await renderMedia({
        composition,
        serveUrl,
        codec: "prores",
        proResProfile: "4444",
        pixelFormat: "yuva444p10le",
        imageFormat: "png",
        outputLocation,
        scale: 2,
        frameRange: [from, to],
        concurrency: 4,
        browserExecutable,
      });
      console.log(`${id}-${layer} 4K: ${to - from + 1} frames in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
    }
    fs.writeFileSync(rangesPath, JSON.stringify(ranges, null, 1));
  } else if (mode === "video") {
    const which = !arg3 || arg3 === "both" ? ["back", "front"] : [arg3];
    const outDir = path.join(root, "out/layers");
    fs.mkdirSync(outDir, { recursive: true });
    for (const layer of which) {
      const composition = await selectComposition({ serveUrl, id: `${id}-${layer}`, browserExecutable });
      const outputLocation = path.join(outDir, `${id}-${layer}.mov`);
      const t1 = Date.now();
      let last = -1;
      await renderMedia({
        composition,
        serveUrl,
        codec: "prores",
        proResProfile: "4444",
        pixelFormat: "yuva444p10le",
        imageFormat: "png",
        outputLocation,
        concurrency: 6,
        browserExecutable,
        onProgress: ({ progress }) => {
          const p = Math.floor(progress * 10);
          if (p !== last) {
            last = p;
            process.stdout.write(`${id}-${layer} ${p * 10}%  `);
          }
        },
      });
      console.log(`\n${id}-${layer}: ${composition.durationInFrames} frames in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
    }
  }
}
