import React from "react";
import { clamp01, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, GOLD_GRAD, TEXT } from "../theme";

// The words of the script on screen (no voice in these films, so the text carries it): a headline block that fits
// its widest line into `width`, words springing in one by one, lines leaving upward with a blur. Gold words come
// from the copy (`gold` per word, `goldLines` per line). Word j (counted across all lines) of line l lands at
// at + j*step + l*lineGap; tools/films/common.py does the same sum, so a rewritten line moves its sounds with it.
export type HeadCopy = { lines: string[]; gold?: string[]; goldLines?: number[]; top?: number; max?: number; center?: boolean };
export const WORD_STEP = 2;
export const LINE_GAP = 3;

export const splitWords = (line: string) => line.split(" ").filter(Boolean);
export const wordFrames = (lines: string[], at: number, step = WORD_STEP, lineGap = LINE_GAP) => {
  let j = 0;
  return lines.map((ln, l) => splitWords(ln).map(() => at + j++ * step + l * lineGap));
};
const strip = (w: string) => w.replace(/[.,:;¿?¡!"“”()]/g, "");

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();
// A line's width at 100 px with the film's tracking (-0.03em), measured with the loaded Poppins (Root waits for it).
const width100 = (text: string, weight: number) => {
  const key = weight + "|" + text;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  ctx = ctx || document.createElement("canvas").getContext("2d")!;
  ctx.font = `${weight} 100px Poppins`;
  const w = ctx.measureText(text).width - 3 * Math.max(0, text.length - 1);
  cache.set(key, w);
  return w;
};

export const Head: React.FC<{
  f: number;
  copy: HeadCopy;
  at: number;
  out?: number;
  top?: number;
  max?: number;
  width?: number;
  weight?: number;
  align?: "center" | "left";
  left?: number;
  color?: string;
  center?: boolean; // vertically centre the block on `top`
  step?: number;
  lineGap?: number;
}> = ({ f, copy, at, out, top = TEXT.top, max = TEXT.max, width = TEXT.width, weight = 800, align = "center", left = 60, color = C.white, center = false, step = WORD_STEP, lineGap = LINE_GAP }) => {
  const { lines } = copy;
  if (f < at || (out !== undefined && f > out + 2 * lines.length)) return null;
  const size = Math.min(max, ...lines.map((ln) => (width * 100) / width100(ln, weight)));
  const lh = 1.16;
  const frames = wordFrames(lines, at, step, lineGap);
  const blockH = lines.length * size * lh;
  const y0 = center ? top - blockH / 2 : top;
  return (
    <>
      {lines.map((ln, l) => {
        const lineTop = y0 + l * size * lh;
        const o = out === undefined ? 0 : ramp(f, out - 10 + 2 * l, out - 2 + 2 * l);
        const goldLine = copy.goldLines?.includes(l);
        return (
          <div
            key={l}
            style={{
              position: "absolute",
              left: align === "center" ? 0 : left,
              right: align === "center" ? 0 : undefined,
              top: lineTop,
              display: "flex",
              justifyContent: align === "center" ? "center" : "flex-start",
              gap: size * 0.26,
              opacity: 1 - o,
              transform: `translateY(${(-36 * o).toFixed(2)}px)`,
              filter: o > 0.01 ? `blur(${(6 * o).toFixed(2)}px)` : undefined,
            }}
          >
            {splitWords(ln).map((w, i) => {
              const s = sp(f, frames[l][i], SNAP);
              if (s <= 0) return <div key={i} style={{ fontFamily: FONT, fontWeight: weight, fontSize: size, letterSpacing: "-0.03em", lineHeight: lh, whiteSpace: "nowrap", opacity: 0 }}>{w}</div>;
              const gold = goldLine || copy.gold?.includes(w) || copy.gold?.includes(strip(w));
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: FONT,
                    fontWeight: weight,
                    fontSize: size,
                    letterSpacing: "-0.03em",
                    lineHeight: lh,
                    whiteSpace: "nowrap",
                    opacity: clamp01(s * 1.5),
                    transform: `translateY(${((1 - Math.min(1, s)) * size * 0.42).toFixed(2)}px)`,
                    filter: s < 0.995 ? `blur(${(Math.max(0, 1 - s) * 8).toFixed(2)}px)` : undefined,
                    ...(gold
                      ? { backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                      : { color, textShadow: "0 4px 22px rgba(0,0,0,0.45)" }),
                  }}
                >
                  {w}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

// A headline whose block is centred in the 4:5 band (statements with no graphic under them).
export const BigLine: React.FC<{ f: number; copy: HeadCopy; at: number; out?: number; max?: number; y?: number }> = ({ f, copy, at, out, max = 96, y = 960 }) => (
  <Head f={f} copy={copy} at={at} out={out} top={y} center max={max} width={940} />
);

// Every text beat of a film: the cue sheet's `text` map (in/out frames) over the copy's `beats`.
export const Beats: React.FC<{ f: number; beats: Record<string, HeadCopy>; text: Record<string, { in: number; out: number }> }> = ({ f, beats, text }) => (
  <>
    {Object.entries(text).map(([id, t]) => {
      const b = beats[id];
      if (!b) return null;
      return <Head key={id} f={f} copy={b} at={t.in} out={t.out} top={b.top} max={b.max} center={b.center} />;
    })}
  </>
);
