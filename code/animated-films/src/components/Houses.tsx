import React from "react";
import { clamp01, easeIn, easeOut, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT } from "../theme";
import { Icon } from "./base";

// AN-05's two houses, drawn flat in SVG inside one 420 x 420 plot each: the plot (ground), the plans unrolling on
// ours, walls rising course by course in fast motion, the roof dropping on, door and windows; then the moving
// truck, lights, a crack running up the cheap wall, a drip. Ours on the LEFT, the cheap one on the RIGHT.
export const PLOT = 420;
const BASE_Y = 330; // ground line inside the plot
const WALL_W = 240;
const WALL_H = 150;
const WX = (PLOT - WALL_W) / 2;

export const House: React.FC<{
  f: number;
  build: { at: number; dur: number };
  cheap: boolean;
  plans?: { in: number; out: number };
  truckAt?: number;
  lightsAt?: number;
  flicker?: number[];
  crack?: { at: number; dur: number };
  doorAt?: number;
  drip?: number[];
  shineAt?: number[];
}> = ({ f, build, cheap, plans, truckAt, lightsAt, flicker = [], crack, doorAt, drip = [], shineAt = [] }) => {
  const p = ramp(f, build.at, build.at + build.dur, 0, 1, easeOut);
  const wallH = WALL_H * clamp01(p / 0.72);
  const roofK = ramp(f, build.at + build.dur * 0.72, build.at + build.dur * 0.92, 0, 1, easeOut);
  const detK = ramp(f, build.at + build.dur * 0.9, build.at + build.dur + 4);
  const roofY = -120 * (1 - roofK);
  const flick = flicker.some((t) => f >= t && f < t + 4) ? 1 : 0;
  const lit = lightsAt !== undefined && f >= lightsAt ? 1 : 0;
  const windowOn = cheap ? (truckAt !== undefined && f >= truckAt + 10 ? 1 - flick : 0) : lit;
  const crackP = crack ? ramp(f, crack.at, crack.at + crack.dur, 0, 1, easeIn) : 0;
  const door = doorAt !== undefined ? ramp(f, doorAt, doorAt + 6) : 0;
  const truck = truckAt !== undefined ? sp(f, truckAt, { damping: 18, stiffness: 90, mass: 1 }) : 0;
  const truckX = cheap ? 420 - 150 * truck : -120 + 150 * truck;
  const plan = plans ? clamp01(sp(f, plans.in, SNAP) * 1.4) * (1 - ramp(f, plans.out, plans.out + 8)) : 0;
  const wallFill = cheap ? "#E8E2D6" : "#F5F0E6";
  const roofFill = cheap ? "#8A6A52" : "#3B4B63";
  const shines = shineAt.map((t, i) => ({ p: ramp(f, t, t + 14, 0, 1), x: i % 2 ? WX + 14 : WX + WALL_W - 10, y: i % 2 ? BASE_Y - 40 : BASE_Y - WALL_H - 40 }));
  const courses = Math.floor((wallH / WALL_H) * 6);
  return (
    <svg width={PLOT} height={PLOT} viewBox={`0 0 ${PLOT} ${PLOT}`} style={{ display: "block", overflow: "visible" }}>
      {/* the plot */}
      <ellipse cx={PLOT / 2} cy={BASE_Y + 26} rx={190} ry={44} fill="rgba(0,0,0,0.35)" />
      <ellipse cx={PLOT / 2} cy={BASE_Y + 20} rx={186} ry={40} fill={cheap ? "#8EA17E" : "#9BB68A"} />
      {/* the plans (ours): a blueprint sheet unrolling on the plot */}
      {plan > 0 && (
        <g opacity={plan} transform={`translate(${PLOT / 2 - 120} ${BASE_Y - 60 - 20 * plan})`}>
          <rect width={240 * plan} height={150} rx={8} fill="#1F4E9C" />
          <g stroke="rgba(255,255,255,0.75)" strokeWidth={2.5} fill="none" opacity={plan > 0.9 ? 1 : 0}>
            <rect x={30} y={28} width={180} height={94} />
            <path d="M30 70 H210 M110 28 V122 M150 70 V122" />
            <rect x={48} y={40} width={30} height={18} />
            <rect x={170} y={92} width={26} height={16} />
          </g>
        </g>
      )}
      {/* walls rising, course by course */}
      <rect x={WX} y={BASE_Y - wallH} width={WALL_W} height={wallH} fill={wallFill} />
      {Array.from({ length: courses }).map((_, i) => (
        <line key={i} x1={WX} x2={WX + WALL_W} y1={BASE_Y - (i + 1) * (WALL_H / 6)} y2={BASE_Y - (i + 1) * (WALL_H / 6)} stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
      ))}
      {/* the roof dropping on */}
      {roofK > 0 && (
        <g opacity={roofK} transform={`translate(0 ${roofY})`}>
          {cheap ? <rect x={WX - 10} y={BASE_Y - WALL_H - 22} width={WALL_W + 20} height={26} rx={3} fill={roofFill} /> : <polygon points={`${WX - 18},${BASE_Y - WALL_H + 4} ${PLOT / 2},${BASE_Y - WALL_H - 78} ${WX + WALL_W + 18},${BASE_Y - WALL_H + 4}`} fill={roofFill} />}
        </g>
      )}
      {/* door and windows */}
      {detK > 0 && (
        <g opacity={detK}>
          <rect x={PLOT / 2 - 22} y={BASE_Y - 68} width={44} height={68} rx={3} fill={cheap ? "#6B5343" : "#2B3A52"} />
          {door > 0 && <rect x={PLOT / 2 - 22} y={BASE_Y - 68} width={44 * (1 - door)} height={68} fill="#F5D7A1" opacity={0.9} />}
          <rect x={WX + 26} y={BASE_Y - 112} width={52} height={44} rx={3} fill={windowOn ? "#FFE7A8" : "#8FB7DA"} />
          <rect x={WX + WALL_W - 78} y={BASE_Y - 112} width={52} height={44} rx={3} fill={windowOn ? "#FFE7A8" : "#8FB7DA"} />
          {windowOn === 1 && <rect x={WX + 10} y={BASE_Y - 130} width={WALL_W - 20} height={80} fill="rgba(255,231,168,0.12)" />}
        </g>
      )}
      {/* the crack */}
      {crackP > 0 && <path d={`M ${WX + WALL_W - 40} ${BASE_Y} l -14 -28 l 12 -22 l -16 -26 l 10 -20 l -14 -24 l 8 -14`} stroke="#4A3B30" strokeWidth={4} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - crackP} />}
      {/* the drip */}
      {drip.map((t, i) => {
        const dp = ramp(f, t, t + 14, 0, 1, easeIn);
        if (dp <= 0 || dp >= 1) return null;
        return <circle key={i} cx={WX + 60} cy={BASE_Y - WALL_H + 30 + dp * 110} r={5} fill="#7FB4E0" />;
      })}
      {/* the moving truck */}
      {truck > 0 && (
        <g transform={`translate(${truckX} ${BASE_Y - 10})`} opacity={clamp01(truck * 1.5)}>
          <rect x={0} y={-52} width={80} height={44} rx={5} fill={cheap ? "#9AA3AE" : "#F5A83C"} />
          <rect x={80} y={-38} width={36} height={30} rx={4} fill="#DDE3E9" />
          <circle cx={22} cy={-6} r={10} fill="#2B2F36" />
          <circle cx={98} cy={-6} r={10} fill="#2B2F36" />
        </g>
      )}
      {/* a shine when both look alike */}
      {shines.map((sh, i) =>
        sh.p > 0 && sh.p < 1 ? (
          <g key={i} opacity={Math.sin(Math.PI * sh.p)} transform={`translate(${sh.x} ${sh.y}) rotate(${sh.p * 90})`}>
            <path d="M0 -18 L5 -5 L18 0 L5 5 L0 18 L-5 5 L-18 0 L-5 -5 Z" fill="#FFF1CF" />
          </g>
        ) : null,
      )}
    </svg>
  );
};

// The label over a plot: "La nuestra" (gold) / "La barata" (gray)
export const PlotLabel: React.FC<{ text: string; gold: boolean; k: number }> = ({ text, gold, k }) => (
  <div style={{ height: 58, padding: "0 24px", borderRadius: 29, background: gold ? "linear-gradient(180deg,#FFD98F 0%,#F5A83C 60%,#D98B24 100%)" : "linear-gradient(180deg,#D7DBE2 0%,#B3B9C4 100%)", display: "flex", alignItems: "center", gap: 10, fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: "-0.02em", color: C.navy, boxShadow: "0 12px 26px rgba(0,0,0,0.4)", opacity: clamp01(k * 1.5), transform: `scale(${(0.8 + 0.2 * Math.min(1.06, k)).toFixed(3)})` }}>
    <Icon name="solar:home-2-bold-duotone" size={32} color={C.navy} />
    {text}
  </div>
);
