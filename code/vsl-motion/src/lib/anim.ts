import { Easing, interpolate, spring } from "remotion";
import parts from "../data/parts.json";
import { FPS } from "../theme";

export type Part = (typeof parts)[number];
export const part = (id: string): Part => {
  const p = parts.find((x) => x.id === id);
  if (!p) throw new Error("no part " + id);
  return p;
};

// Word onset in compound seconds. Visuals land LEAD seconds before the word: the eye reads it as "on the word".
export const LEAD = 0.07;
export const wd = (id: string, i: number) => part(id).words[i].t0;
export const cue = (id: string, i: number, extra = 0) => part(id).words[i].t0 - LEAD + extra;

type SpringCfg = { damping?: number; stiffness?: number; mass?: number };
const SOFT: SpringCfg = { damping: 16, stiffness: 120, mass: 0.9 };
export const SNAP: SpringCfg = { damping: 13, stiffness: 190, mass: 0.7 };
export const LAZY: SpringCfg = { damping: 20, stiffness: 70, mass: 1 };

// 0 -> 1 spring that starts at second `at`.
export const sp = (t: number, at: number, cfg: SpringCfg = SOFT) => {
  const f = Math.round((t - at) * FPS);
  if (f <= 0) return 0;
  return spring({ frame: f, fps: FPS, config: { ...SOFT, ...cfg } });
};

// Eased ramp between two seconds.
export const ramp = (
  t: number,
  t0: number,
  t1: number,
  from = 0,
  to = 1,
  ease: (x: number) => number = Easing.inOut(Easing.cubic),
) => interpolate(t, [t0, t1], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// A deterministic pseudo-random in [0,1) from an integer seed.
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
