import React from "react";
import { C } from "../theme";
import { G3 } from "./base";

// A phone with real thickness: the front face plus a stack of rounded slabs behind it, so the edge shows as a solid
// metal side whenever it turns. Screen content is laid out at SW x SH and scaled to fit.
export const SW = 360;
export const SH = 760;

type Tone = "gold" | "gray";
const EDGE: Record<Tone, [string, string]> = {
  gold: ["#F2C27A", "#5E3A0C"],
  gray: ["#D7DCE4", "#474D59"],
};
const RIM: Record<Tone, string> = {
  gold: "linear-gradient(145deg,#FFE7B5 0%,#E6A548 30%,#9C6216 55%,#F2C27A 78%,#B57524 100%)",
  gray: "linear-gradient(145deg,#FFFFFF 0%,#C9CFD8 30%,#7D8594 55%,#E4E8EE 78%,#9CA4B1 100%)",
};

const mix = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [ar, ag, ab] = ch(pa);
  const [br, bg, bb] = ch(pb);
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return `rgb(${r},${g},${bl})`;
};

export const Phone3D: React.FC<{
  x: number;
  y: number;
  w: number;
  tone: Tone;
  tx?: number;
  ty?: number;
  tz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  glow?: number;
  dim?: number;
  children?: React.ReactNode;
  over?: React.ReactNode; // things that float in front of the screen (toasts, taps), in screen coordinates
}> = ({ x, y, w, tone, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, s = 1, glow = 0, dim = 0, children, over }) => {
  const h = w * (SH / SW) * 1.035;
  const R = w * 0.155;
  const rim = Math.max(3, w * 0.016);
  const bez = w * 0.032;
  const screenW = w - 2 * rim - 2 * bez;
  const k = screenW / SW;
  const N = 14;
  const step = (w * 0.075) / N;
  const [e0, e1] = EDGE[tone];
  // a reflection band that slides with the turn
  const refl = 30 + ry * 1.6;
  return (
    <G3 x={x} y={y} w={w} h={h} tx={tx} ty={ty} tz={tz} rx={rx} ry={ry} rz={rz} s={s}>
      {/* soft shadow on the wall behind */}
      <div
        style={{
          position: "absolute",
          left: w * 0.08,
          top: h * 0.06,
          width: w * 0.95,
          height: h * 0.95,
          borderRadius: R,
          background: "rgba(0,0,0,0.55)",
          filter: `blur(${w * 0.09}px)`,
          transform: `translate3d(${w * 0.06}px,${h * 0.035}px,${-w * 0.5}px)`,
        }}
      />
      {Array.from({ length: N }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: R,
            background: mix(e0, e1, i / (N - 1)),
            transform: `translateZ(${-(i + 1) * step}px)`,
          }}
        />
      ))}
      {/* front: metal rim, black bezel, screen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: R,
          background: RIM[tone],
          padding: rim,
          boxShadow:
            glow > 0
              ? `0 0 ${46 * glow}px ${3 * glow}px rgba(245,168,60,${0.3 * glow}), 0 0 ${12 * glow}px rgba(255,214,140,${0.38 * glow})`
              : undefined,
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: R - rim, background: "#05070C", padding: bez }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: R - rim - bez,
              overflow: "hidden",
              background: tone === "gold" ? C.navyDeep : "#F3F4F7",
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, transform: `scale(${k})`, transformOrigin: "0 0" }}>
              {children}
              {/* island */}
              <div
                style={{
                  position: "absolute",
                  left: SW / 2 - 52,
                  top: 12,
                  width: 104,
                  height: 30,
                  borderRadius: 20,
                  background: "#05070C",
                }}
              />
              {over}
            </div>
            {dim > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(4,8,18,${dim})` }} />}
            {/* glass reflection */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(115deg, rgba(255,255,255,0) ${refl - 18}%, rgba(255,255,255,0.13) ${refl}%, rgba(255,255,255,0) ${refl + 16}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </G3>
  );
};
