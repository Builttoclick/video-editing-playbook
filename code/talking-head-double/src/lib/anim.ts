import { Easing, interpolate, spring } from "remotion";
import cues from "../data/cues.json";

export const FPS = cues.fps;
// Every cue lives in src/data/cues.json in frames: the picture reads it here and tools/sound.py reads the same file,
// so a sound can never drift from its move.
export const F = cues.f;
export const sec = (frame: number) => frame / FPS;

type SpringCfg = { damping?: number; stiffness?: number; mass?: number };
const SOFT: SpringCfg = { damping: 16, stiffness: 120, mass: 0.9 };
export const SNAP: SpringCfg = { damping: 13, stiffness: 190, mass: 0.7 };
export const LAZY: SpringCfg = { damping: 20, stiffness: 70, mass: 1 };

// 0 -> 1 spring that starts at frame `at`.
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
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
