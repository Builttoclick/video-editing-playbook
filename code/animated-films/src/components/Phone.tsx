import React from "react";
import { clamp01, ramp, SNAP, sp } from "../lib/anim";

// A phone's screen: a rounded panel with a hint of bezel, its children in screen coordinates (0,0 = top-left of the
// screen). `dim` darkens it while a graphic floats in front of it.
export const Screen: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  bg?: string;
  dim?: number;
  k?: number; // presence 0..1 (scale + opacity)
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, r = 54, bg = "#FFFFFF", dim = 0, k = 1, children, style }) => {
  if (k <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: r,
        overflow: "hidden",
        background: bg,
        boxShadow: "0 0 0 2px rgba(255,255,255,0.10), 0 40px 90px rgba(0,0,0,0.55)",
        opacity: clamp01(k * 1.5),
        transform: `scale(${(0.9 + 0.1 * Math.min(1.05, k)).toFixed(3)})`,
        transformOrigin: "50% 50%",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: w, height: h }}>{children}</div>
      {dim > 0.01 && <div style={{ position: "absolute", inset: 0, background: `rgba(3,8,16,${dim.toFixed(3)})` }} />}
    </div>
  );
};

// A finger tap: a soft disc appears, presses at `at`, and two rings ripple out. Coordinates are those of the nearest
// positioned parent (the frame, or a Screen's inside).
export const Tap: React.FC<{ f: number; at: number; x: number; y: number; dark?: boolean }> = ({ f, at, x, y, dark = false }) => {
  if (f < at - 8 || f > at + 18) return null;
  const come = sp(f, at - 8, SNAP);
  const press = ramp(f, at, at + 2) - ramp(f, at + 2, at + 7);
  const gone = ramp(f, at + 6, at + 16);
  const col = dark ? "0,0,0" : "255,255,255";
  const ink = dark ? "rgba(0,0,0,0.26)" : "rgba(255,255,255,0.55)";
  return (
    <div style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, pointerEvents: "none" }}>
      {[0, 1].map((i) => {
        const p = ramp(f, at + i * 3, at + 12 + i * 3);
        return p > 0 && p < 1 ? (
          <div key={i} style={{ position: "absolute", inset: 0, borderRadius: 70, border: `3px solid rgba(${col},${(0.6 * (1 - p)).toFixed(3)})`, transform: `scale(${(0.3 + 0.9 * p).toFixed(3)})` }} />
        ) : null;
      })}
      <div
        style={{
          position: "absolute",
          left: 42,
          top: 42,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: ink,
          boxShadow: `0 0 0 3px rgba(${col},0.35)`,
          opacity: clamp01(come * 1.4) * (1 - gone),
          transform: `scale(${(0.7 + 0.3 * Math.min(1, come) - 0.22 * press).toFixed(3)})`,
        }}
      />
    </div>
  );
};

export const Caret: React.FC<{ f: number; on: boolean; h: number; color: string; ml?: number }> = ({ f, on, h, color, ml = 2 }) =>
  on && Math.floor(f / 14) % 2 === 0 ? <div style={{ width: 3, height: h, background: color, marginLeft: ml, flexShrink: 0 }} /> : null;

// The phone's keyboard while something is typed: three rows of keys and the space bar, the key of the last letter
// lighting for three frames. Light (Google) or dark (WhatsApp). Drawn in the coordinates of its parent, width `w`.
const ROWS = [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ñ"], ["z", "x", "c", "v", "b", "n", "m"]];
const BASE: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };
export const KB_H = (w: number) => Math.round(w * 0.5);
export const Keyboard: React.FC<{ f: number; w: number; y: number; typed: number[]; text: string; dark?: boolean; show: boolean }> = ({ f, w, y, typed, text, dark = false, show }) => {
  if (!show) return null;
  const h = KB_H(w);
  const gap = Math.round(w * 0.012);
  const kw = (w - 11 * gap) / 10;
  const kh = (h - 5 * gap - gap * 2) / 4;
  const n = typed.filter((t) => t <= f).length;
  const lastT = n > 0 ? typed[n - 1] : -100;
  const lastC = n > 0 ? text[n - 1].toLowerCase() : "";
  const hot = f - lastT < 3 ? BASE[lastC] ?? lastC : "";
  const bg = dark ? "#10191E" : "#D3D7DE";
  const key = dark ? "#2A3942" : "#FFFFFF";
  const keyHot = dark ? "#5A6E7A" : "#B8C6DA";
  const ink = dark ? "#E9EDEF" : "#1F2937";
  const fs = Math.round(kw * 0.58);
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: w, height: h, background: bg, padding: gap, boxSizing: "border-box" }}>
      {ROWS.map((row, r) => (
        <div key={r} style={{ display: "flex", justifyContent: "center", gap, marginTop: r === 0 ? gap : gap, marginLeft: r === 2 ? kw * 0.5 : 0, marginRight: r === 2 ? kw * 0.5 : 0 }}>
          {row.map((c) => (
            <div key={c} style={{ width: kw, height: kh, borderRadius: Math.round(kw * 0.16), background: hot === c ? keyHot : key, boxShadow: "0 1px 0 rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Roboto, Arial, sans-serif", fontWeight: 400, fontSize: fs, color: ink }}>
              {c}
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "center", gap, marginTop: gap }}>
        <div style={{ width: kw * 1.5 + gap * 0.5, height: kh, borderRadius: Math.round(kw * 0.16), background: dark ? "#1F2C33" : "#B9C1CC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Roboto, Arial, sans-serif", fontSize: fs * 0.7, color: ink }}>?123</div>
        <div style={{ width: kw * 6 + gap * 5, height: kh, borderRadius: Math.round(kw * 0.16), background: hot === " " ? keyHot : key, boxShadow: "0 1px 0 rgba(0,0,0,0.25)" }} />
        <div style={{ width: kw * 2 + gap, height: kh, borderRadius: Math.round(kw * 0.16), background: dark ? "#00A884" : "#1A73E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: kw * 0.5, height: kw * 0.5, borderLeft: `3px solid ${dark ? "#fff" : "#fff"}`, borderBottom: `3px solid #fff`, transform: "translateX(4px) rotate(-45deg) scale(0.8)" }} />
        </div>
      </div>
    </div>
  );
};
