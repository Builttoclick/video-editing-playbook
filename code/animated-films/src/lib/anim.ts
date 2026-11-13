import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../theme";

// Generic motion helpers. Every frame a film uses lives in its own cues.json (written by tools/timeline.py); the sound
// script reads the same file, so a sound can never drift from its move.
export { FPS };
export const sec = (frame: number) => frame / FPS;

export type SpringCfg = { damping?: number; stiffness?: number; mass?: number };
const SOFT: SpringCfg = { damping: 16, stiffness: 120, mass: 0.9 };
export const SNAP: SpringCfg = { damping: 13, stiffness: 190, mass: 0.7 };
export const LAZY: SpringCfg = { damping: 20, stiffness: 70, mass: 1 };
export const SWING: SpringCfg = { damping: 9, stiffness: 90, mass: 1 };

// 0 -> 1 spring that starts at frame `at` (overshoots a little with SNAP).
export const sp = (f: number, at: number, cfg: SpringCfg = SOFT) => {
  if (f <= at) return 0;
  return spring({ frame: f - at, fps: FPS, config: { ...SOFT, ...cfg } });
};

// Eased ramp between two frames.
export const ramp = (
  f: number,
  f0: number,
  f1: number,
  from = 0,
  to = 1,
  ease: (x: number) => number = Easing.inOut(Easing.cubic),
) => interpolate(f, [f0, f1], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
export const linear = (x: number) => x;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const between = (f: number, a: number, b: number) => f >= a && f < b;

// Presence 0..1: springs in at `at`, fades out over `outLen` frames from `out`.
export const pres = (f: number, at: number, out?: number, cfg: SpringCfg = SNAP, outLen = 10) => {
  const k = clamp01(sp(f, at, cfg) * 1.5);
  return out === undefined ? k : k * (1 - ramp(f, out, out + outLen));
};
// The raw spring (with overshoot) gated by the same out ramp: for scale.
export const presS = (f: number, at: number, out?: number, cfg: SpringCfg = SNAP, outLen = 10) => {
  const k = Math.min(1.12, sp(f, at, cfg));
  return out === undefined ? k : k * (1 - ramp(f, out, out + outLen));
};
// A quick 0 -> 1 -> 0 press or bounce.
export const bump = (f: number, at: number, up = 2, down = 6) => ramp(f, at, at + up) - ramp(f, at + up, at + up + down);

// The frame each letter of a typed text appears: a gap pattern cycled per letter, one beat more after a space
// (never an even rhythm: earshot hears "drum machine"). tools/films/common.py does the same sum.
export const TYPE_PATTERN = [2, 1, 2, 2, 1, 3, 2, 1, 2, 2, 1, 2];
export const TYPE_AFTER_SPACE = 3;
export const typeFrames = (text: string, start: number, pattern = TYPE_PATTERN, afterSpace = TYPE_AFTER_SPACE) =>
  Array.from(text).reduce<number[]>((out, _, i) => [...out, i === 0 ? start : out[i - 1] + (text[i - 1] === " " ? afterSpace : pattern[i % pattern.length])], []);
export const shown = (frames: number[], f: number) => frames.filter((t) => t <= f).length;
