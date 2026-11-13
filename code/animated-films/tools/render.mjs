// Bundle once, then render stills (QA) or the silent picture (H.264) that tools/sound.py muxes with the mix.
//   COMP=AN02 node tools/render.mjs stills 10,60,120 [outDir]   -> <outDir>/f<frame>.png
//   COMP=AN02 node tools/render.mjs video                        -> out/an02/picture.mp4
//   COMP=AN02 node tools/render.mjs every 15 [outDir]            -> one still every 15 frames (contact sheets)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [mode, arg2, arg3] = process.argv.slice(2);
// Remotion's own Chrome stalls on "Waiting for root component" on this Mac (24-oct-2026); Playwright's shell works.
const PW = path.join(process.env.HOME, "Library/Caches/ms-playwright");
const shells = (fs.existsSync(PW) ? fs.readdirSync(PW) : [])
  .filter((d) => d.startsWith("chromium_headless_shell-"))
  .sort();
// REMOTION_BROWSER, else the newest Playwright headless shell, else (undefined) Remotion's own browser
const browserExecutable =
  process.env.REMOTION_BROWSER ||
  (shells.length ? path.join(PW, shells[shells.length - 1], "chrome-headless-shell-mac-arm64/chrome-headless-shell") : undefined);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compId = process.env.COMP || "AN02";
const film = compId.toLowerCase();
const t0 = Date.now();
// bundle from a snapshot of src, so the sources can change while a long render runs
const snap = path.join(root, ".snap", `${film}-${process.pid}`);
fs.rmSync(path.join(root, ".snap"), { recursive: true, force: true });
fs.mkdirSync(snap, { recursive: true });
fs.cpSync(path.join(root, "src"), path.join(snap, "src"), { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(snap, "src/index.ts"), publicDir: path.join(root, "public") });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const scale = Number(process.env.SCALE || 1);
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable });

const stills = async (frames, outDir) => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const frame of frames) {
    const output = path.join(outDir, `f${String(frame).padStart(4, "0")}.png`);
    await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", browserExecutable });
  }
  console.log(`${frames.length} stills in ${outDir}`);
};

if (mode === "stills") {
  await stills(arg2.split(",").map(Number), arg3 || path.join(root, `out/${film}/stills`));
} else if (mode === "every") {
  const step = Number(arg2 || 15);
  const frames = [];
  for (let i = 0; i < composition.durationInFrames; i += step) frames.push(i);
  await stills(frames, arg3 || path.join(root, `out/${film}/every`));
} else if (mode === "video") {
  const outputLocation = path.join(root, `out/${film}/picture.mp4`);
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });
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
  console.log(`\npicture: ${outputLocation} (${composition.durationInFrames} frames) in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
} else {
  console.error("usage: COMP=AN0N node tools/render.mjs stills <frames> [outDir] | every <step> [outDir] | video");
  process.exit(1);
}
