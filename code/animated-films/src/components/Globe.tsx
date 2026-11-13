import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import React from "react";
import * as topojson from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { clamp01, easeInOut, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, GOLD_GRAD } from "../theme";
import { Icon } from "./base";

// A globe seen from the Atlantic (Europe up right, South America centre), turning slowly: real coastlines from
// Natural Earth (world-atlas 110m), Brazil and Paraguay highlighted, a route from Europe to Paraguay that draws
// itself with a cargo icon riding it, a WhatsApp dot hopping from Brazil to Limpio, and gold pins with labels.
type Pt = [number, number];
export const PLACES: Record<"br" | "py" | "eu", Pt> = { br: [-46.6, -23.5], py: [-57.6, -25.3], eu: [9.99, 53.55] };
const CENTER: Pt = [-38, -8];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const W: any = world;
const countries = (topojson.feature(W, W.objects.countries) as unknown as { features: { id: string; type: string; geometry: unknown }[] }).features;
const graticule = geoGraticule10();
const sample = (a: Pt, b: Pt, n = 90): Pt[] => {
  const it = geoInterpolate(a, b);
  return Array.from({ length: n + 1 }, (_, i) => it(i / n) as Pt);
};
const ROUTE = sample(PLACES.eu, PLACES.py);
const HOP = sample(PLACES.br, PLACES.py, 40);

export const Globe: React.FC<{
  f: number;
  cx: number;
  cy: number;
  r: number;
  rot: number;
  opacity: number;
  dim?: number;
  route?: { at: number; dur: number };
  hop?: { at: number; dur: number };
  pins: { br?: number; py?: number; eu?: number };
  labels: { br: string; py: string; eu: string };
  badgeAt?: number;
  badgePulse?: number[];
}> = ({ f, cx, cy, r, rot, opacity, dim = 0, route, hop, pins, labels, badgeAt, badgePulse = [] }) => {
  if (opacity <= 0.001) return null;
  const projection = geoOrthographic().scale(r).translate([cx, cy]).rotate([-CENTER[0] + rot, -CENTER[1], 0]).clipAngle(90);
  const path = geoPath(projection);
  const center: Pt = [CENTER[0] - rot, CENTER[1]];
  const visible = (p: Pt) => geoDistance(p, center) < Math.PI / 2 - 0.02;
  const proj = (p: Pt) => projection(p) as [number, number];
  const rp = route ? ramp(f, route.at, route.at + route.dur, 0, 1, easeInOut) : 0;
  const hp = hop ? ramp(f, hop.at, hop.at + hop.dur, 0, 1, easeInOut) : 0;
  const routeD = rp > 0 ? path({ type: "LineString", coordinates: ROUTE.slice(0, Math.max(2, Math.round(rp * ROUTE.length))) }) : null;
  const rider = rp > 0 && rp < 1 ? ROUTE[Math.min(ROUTE.length - 1, Math.round(rp * ROUTE.length))] : null;
  const hopPt = hp > 0 && hp < 1 ? HOP[Math.min(HOP.length - 1, Math.round(hp * HOP.length))] : null;
  const pinList = (Object.keys(pins) as ("br" | "py" | "eu")[]).filter((k) => pins[k] !== undefined && f >= pins[k]!);
  return (
    <div style={{ position: "absolute", inset: 0, opacity, filter: dim > 0.01 ? `brightness(${(1 - 0.55 * dim).toFixed(3)})` : undefined }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <radialGradient id="sea" cx="38%" cy="32%" r="78%">
            <stop offset="0" stopColor="#1C3B70" />
            <stop offset="0.55" stopColor="#0E2650" />
            <stop offset="1" stopColor="#061330" />
          </radialGradient>
          <radialGradient id="rim" cx="50%" cy="50%" r="50%">
            <stop offset="0.86" stopColor="rgba(255,255,255,0)" />
            <stop offset="1" stopColor="rgba(140,180,255,0.35)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 26} fill="rgba(60,110,200,0.08)" />
        <circle cx={cx} cy={cy} r={r} fill="url(#sea)" />
        <path d={path(graticule) ?? ""} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        {countries.map((c) => {
          const d = path(c as never);
          if (!d) return null;
          const br = c.id === "076";
          const py = c.id === "600";
          return <path key={c.id} d={d} fill={py ? "#D9A24A" : br ? "#2F5A9E" : "#1E3C6E"} stroke={py ? "#FFE1A8" : "rgba(6,19,48,0.9)"} strokeWidth={py ? 1.5 : 0.8} />;
        })}
        <circle cx={cx} cy={cy} r={r} fill="url(#rim)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
        {routeD && <path d={routeD} fill="none" stroke="#F5A83C" strokeWidth={6} strokeLinecap="round" strokeDasharray="2 16" opacity={0.95} />}
        {hopPt && visible(hopPt) && (() => {
          const [x, y] = proj(hopPt);
          return <circle cx={x} cy={y} r={14} fill={C.wa} stroke="#fff" strokeWidth={3} />;
        })()}
      </svg>
      {rider && visible(rider) && (() => {
        const [x, y] = proj(rider);
        return (
          <div style={{ position: "absolute", left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, background: GOLD_GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(0,0,0,0.5)" }}>
            <Icon name="solar:delivery-bold-duotone" size={42} color={C.navy} />
          </div>
        );
      })()}
      {pinList.map((k) => {
        const p = PLACES[k];
        if (!visible(p)) return null;
        const [x, y] = proj(p);
        const s = sp(f, pins[k]!, SNAP);
        const side = k === "py" ? -1 : 1;
        const gold = k === "py";
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, opacity: clamp01(s * 1.6), transform: `scale(${Math.min(1.1, s).toFixed(3)})`, transformOrigin: "0 0" }}>
            <div style={{ position: "absolute", left: -16, top: -16, width: 32, height: 32, borderRadius: 16, background: gold ? C.gold : "#fff", border: `4px solid ${gold ? "#fff" : C.gBlue}`, boxSizing: "border-box", boxShadow: "0 6px 14px rgba(0,0,0,0.5)" }} />
            <div style={{ position: "absolute", left: -2, top: -2, width: 4, height: 4 }} />
            <div style={{ position: "absolute", top: k === "py" ? -82 : 24, left: side > 0 ? 22 : undefined, right: side < 0 ? -40 : undefined, height: 54, padding: "0 20px", borderRadius: 27, background: gold ? GOLD_GRAD : "rgba(10,30,63,0.92)", border: gold ? undefined : "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: gold ? C.navy : C.white, boxShadow: "0 10px 24px rgba(0,0,0,0.45)" }}>
              <Icon name="solar:map-point-bold-duotone" size={30} color={gold ? C.navy : C.gold} />
              {labels[k]}
            </div>
            {k === "py" && badgeAt !== undefined && f >= badgeAt && (() => {
              const b = sp(f, badgeAt, SNAP);
              const pulse = badgePulse.reduce((m, t) => Math.max(m, ramp(f, t, t + 3) - ramp(f, t + 3, t + 10)), 0);
              return (
                <div style={{ position: "absolute", left: 18, top: -58, width: 64, height: 64, borderRadius: 32, background: C.wa, border: "4px solid #fff", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(Math.min(1.15, b) * (1 + 0.25 * pulse)).toFixed(3)})`, boxShadow: `0 8px 20px rgba(0,0,0,0.5), 0 0 0 ${(14 * pulse).toFixed(1)}px rgba(37,211,102,${(0.45 * (1 - pulse)).toFixed(2)})` }}>
                  <Icon name="ri:whatsapp-fill" size={38} color="#fff" />
                  <div style={{ position: "absolute", right: -14, top: -14, width: 34, height: 34, borderRadius: 17, background: "#FF3B30", border: "3px solid #0B2042", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 18, color: "#fff" }}>1</div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};
