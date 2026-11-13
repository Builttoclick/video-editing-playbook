import React from "react";
import { clamp01, easeIn, lerp, pres, presS, ramp, SNAP, sp, SWING } from "../lib/anim";
import { C, FONT, GOLD_GRAD, PANEL } from "../theme";
import { G3, Icon, Obj, txt } from "./base";
import icons from "../data/icons.json";

// The pieces that come out of the screen in every film: slabs with real thickness, gold chips, the 14-day strip,
// the three proposals, price tags, check and cross marks, extruded gold type. Gold is the only colour they add.
const SLAB: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: 30 };
const DEPTH = 22;
const N_SLAB = 10;

// a slab with real thickness: the face plus a stack of darker copies behind it
export const Slab: React.FC<{ w: number; h: number; r?: number; children?: React.ReactNode; face?: string; border?: string; sides?: [number[], number[]] }> = ({
  w,
  h,
  r = 30,
  children,
  face = PANEL,
  border = "rgba(255,255,255,0.16)",
  sides = [
    [8, 18, 40],
    [18, 28, 60],
  ],
}) => (
  <>
    {Array.from({ length: N_SLAB }).map((_, i) => {
      const k = i / (N_SLAB - 1);
      const c = sides[0].map((a, j) => Math.round(a + (sides[1][j] - a) * k));
      return <div key={i} style={{ ...SLAB, borderRadius: r, background: `rgb(${c[0]},${c[1]},${c[2]})`, transform: `translateZ(${(-(i + 1) * DEPTH) / N_SLAB}px)` }} />;
    })}
    <div style={{ ...SLAB, borderRadius: r, background: face, border: `1.5px solid ${border}`, boxSizing: "border-box", overflow: "hidden", width: w, height: h }}>{children}</div>
  </>
);
export const LIGHT_SIDES: [number[], number[]] = [
  [205, 210, 220],
  [120, 128, 142],
];

// the soft shadow a floating slab throws on what is behind it
export const Shade: React.FC<{ w: number; h: number; r?: number }> = ({ w, h, r = 30 }) => (
  <div style={{ position: "absolute", left: 30, top: 40, width: w - 60, height: h - 50, borderRadius: r, background: "rgba(0,0,0,0.5)", filter: "blur(28px)", transform: "translateZ(-60px)" }} />
);

// Text with real depth: slices stacked back in z, the face in metallic gold (from the VSL overlays).
export const Extrude: React.FC<{ text: string; size: number; depth?: number; layers?: number; fade?: number; weight?: number }> = ({ text, size, depth = 26, layers = 14, fade = 1, weight = 800 }) => {
  const base: React.CSSProperties = { opacity: fade, position: "absolute", left: 0, top: 0, fontFamily: FONT, fontWeight: weight, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, whiteSpace: "nowrap" };
  const side = ["#B9741E", "#3C2306"];
  const mixc = (k: number) => {
    const a = parseInt(side[0].slice(1), 16);
    const b = parseInt(side[1].slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  return (
    <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
      <div style={{ ...base, position: "relative", visibility: "hidden" }}>{text}</div>
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} style={{ ...base, color: mixc(i / (layers - 1)), transform: `translateZ(${-((i + 1) * depth) / layers}px)` }}>
          {text}
        </div>
      ))}
      <div style={{ ...base, backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{text}</div>
    </div>
  );
};

// A big gold price (or any number) landing from the camera with the slight 3D of the end card.
export const BigGold: React.FC<{ f: number; at: number; out?: number; text: string; size?: number; y: number; x?: number }> = ({ f, at, out, text, size = 132, y, x = 540 }) => {
  const k = sp(f, at, { damping: 14, stiffness: 150, mass: 0.9 });
  if (k <= 0.001) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 10);
  if (o >= 1) return null;
  return (
    <Obj opacity={clamp01(k * 1.5) * (1 - o)}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - size / 2, display: "flex", justifyContent: "center", transformStyle: "preserve-3d", transform: `translateX(${x - 540}px) translateZ(${((1 - clamp01(k)) * 700).toFixed(1)}px) scale(${(0.7 + 0.3 * Math.min(1.1, k)).toFixed(3)})` }}>
        <Extrude text={text} size={size} depth={30} />
      </div>
    </Obj>
  );
};

type Tone = "gold" | "dark" | "green" | "red" | "light";
const TONES: Record<Tone, { bg: string; fg: string; border?: string; icon?: string }> = {
  gold: { bg: GOLD_GRAD, fg: C.navy },
  dark: { bg: PANEL, fg: C.white, border: "rgba(255,255,255,0.18)", icon: C.gold },
  green: { bg: C.wa, fg: C.waDark },
  red: { bg: "linear-gradient(180deg,#F26B70 0%,#D9363C 100%)", fg: C.white },
  light: { bg: "#F7F8FB", fg: C.navy, border: "rgba(10,30,63,0.12)", icon: C.goldDeep },
};

// A pill that springs in at (x, y) and leaves by shrinking. `from` lets it fly in from another point.
export const Chip: React.FC<{
  f: number;
  at: number;
  out?: number;
  x: number;
  y: number;
  text: string;
  icon?: keyof typeof icons;
  tone?: Tone;
  size?: number;
  from?: { x: number; y: number };
  tz?: number;
  rz?: number;
  weight?: number;
}> = ({ f, at, out, x, y, text, icon, tone = "gold", size = 36, from, tz = 120, rz = 0, weight = 700 }) => {
  const k = sp(f, at, { damping: 15, stiffness: 120, mass: 0.9 });
  if (k <= 0) return null;
  const gone = out === undefined ? 0 : ramp(f, out, out + 10, 0, 1, easeIn);
  if (gone >= 1) return null;
  const t = TONES[tone];
  const h = size * 2.5;
  const px = from ? lerp(from.x, x, clamp01(k)) : x;
  const py = (from ? lerp(from.y, y, clamp01(k)) : y) - (from ? 60 * Math.sin(Math.PI * clamp01(k)) : 0);
  const s = lerp(0.6 + 0.4 * Math.min(1.1, k), 0.3, gone);
  return (
    <Obj opacity={clamp01(k * 1.8) * (1 - gone)}>
      <G3 x={px} y={py} w={10} h={h} tz={tz * clamp01(k)} s={s} rz={rz + (1 - clamp01(k)) * -8}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: h,
            transform: "translateX(-50%)",
            padding: `0 ${size * 0.8}px`,
            borderRadius: h / 2,
            background: t.bg,
            border: t.border ? `1.5px solid ${t.border}` : undefined,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: size * 0.4,
            boxShadow: "0 18px 36px rgba(0,0,0,0.45)",
            ...txt(size, weight, { color: t.fg, letterSpacing: "-0.02em" }),
          }}
        >
          {icon && <Icon name={icon} size={size * 1.15} color={t.icon ?? t.fg} />}
          {text}
        </div>
      </G3>
    </Obj>
  );
};

// A check (gold) or a cross (red) popping in.
export const Mark: React.FC<{ f: number; at: number; x: number; y: number; ok: boolean; size?: number; out?: number }> = ({ f, at, x, y, ok, size = 76, out }) => {
  const k = sp(f, at, SNAP);
  if (k <= 0) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 8);
  if (o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        background: ok ? GOLD_GRAD : TONES.red.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 12px 26px rgba(0,0,0,0.4)",
        opacity: clamp01(k * 1.6) * (1 - o),
        transform: `scale(${Math.min(1.15, k).toFixed(3)}) rotate(${((1 - Math.min(1, k)) * (ok ? -40 : 40)).toFixed(1)}deg)`,
      }}
    >
      <Icon name={ok ? "ri:check-line" : "ri:close-line"} size={size * 0.68} color={ok ? C.navy : C.white} />
    </div>
  );
};

// 14 days as 14 tiles, two rows of seven: each one flips over in gold when its day comes; the last one gets the check.
export const TILE = 96;
export const TILE_GAP = 12;
export const CAL_W = 7 * TILE + 6 * TILE_GAP + 60;
export const CAL_H = 2 * TILE + TILE_GAP + 60;
export const CalendarStrip: React.FC<{ f: number; at: number; tiles: number[]; out?: number; x?: number; y?: number; s?: number; label?: string; last?: number; pulse?: number[] }> = ({ f, at, tiles, out, x = 540, y = 1100, s = 1, label = "Día", last = 13, pulse = [] }) => {
  const p = pres(f, at, out);
  if (p <= 0.001) return null;
  const k = sp(f, at, SNAP);
  const o = out === undefined ? 0 : ramp(f, out, out + 10, 0, 1, easeIn);
  return (
    <Obj opacity={p}>
      <G3 x={x} y={y - 50 * o} w={CAL_W} h={CAL_H} tz={150} s={s * (0.86 + 0.14 * Math.min(1.08, k))} rx={lerp(16, 0, clamp01(k))}>
        <Shade w={CAL_W} h={CAL_H} r={28} />
        <Slab w={CAL_W} h={CAL_H} r={28}>
          {pulse.map((t, i) => {
            const pp = ramp(f, t, t + 24);
            if (pp <= 0 || pp >= 1) return null;
            const cx = 30 + 6 * (TILE + TILE_GAP) + TILE / 2;
            const cy = 30 + TILE + TILE_GAP + TILE / 2;
            return <div key={i} style={{ position: "absolute", left: cx - TILE / 2, top: cy - TILE / 2, width: TILE, height: TILE, borderRadius: 18, border: `4px solid rgba(255,214,138,${(0.9 * (1 - pp)).toFixed(3)})`, transform: `scale(${(1 + 1.1 * pp).toFixed(3)})` }} />;
          })}
          <div style={{ position: "absolute", left: 30, top: 30, display: "grid", gridTemplateColumns: `repeat(7, ${TILE}px)`, gap: TILE_GAP }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const t = tiles[i];
              const kk = t === undefined ? 0 : sp(f, t, SNAP);
              const on = clamp01(kk);
              const isLast = i === last;
              return (
                <div
                  key={i}
                  style={{
                    width: TILE,
                    height: TILE,
                    borderRadius: 18,
                    background: on > 0.02 ? GOLD_GRAD : "rgba(255,255,255,0.10)",
                    border: `1.5px solid ${on > 0.02 ? "rgba(255,230,180,0.5)" : "rgba(255,255,255,0.22)"}`,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `rotateX(${(90 * (1 - Math.min(1, kk))).toFixed(2)}deg) scale(${(1 + 0.1 * Math.sin(Math.PI * on)).toFixed(3)})`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  {isLast && on > 0.5 ? (
                    <Icon name="solar:check-circle-bold" size={50} color={C.navy} />
                  ) : (
                    <>
                      <div style={txt(16, 600, { color: on > 0.02 ? "rgba(10,30,63,0.75)" : "rgba(255,255,255,0.5)", letterSpacing: 0 })}>{label}</div>
                      <div style={txt(38, 800, { color: on > 0.02 ? C.navy : "rgba(255,255,255,0.75)" })}>{i + 1}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Slab>
      </G3>
    </Obj>
  );
};

// Three design directions for the same business, fanned out; the middle one gets the check and comes forward.
type Style = { bg: string; ink: string; accent: string; hero: string; palette: string[]; weight: number };
const STYLES: Style[] = [
  { bg: "#0F1B2D", ink: "#F3EBDD", accent: "#D4A55A", weight: 700, hero: "linear-gradient(150deg,#2A3D5C 0%,#0F1B2D 100%)", palette: ["#0F1B2D", "#D4A55A", "#F3EBDD", "#6B7A90"] },
  { bg: "#F6F3EC", ink: "#1F2A2A", accent: "#2F6B4F", weight: 800, hero: "linear-gradient(150deg,#D4E7DA 0%,#8DB89E 100%)", palette: ["#F6F3EC", "#2F6B4F", "#E9B44C", "#1F2A2A"] },
  { bg: "#FFFFFF", ink: "#15213B", accent: "#F5A83C", weight: 800, hero: "linear-gradient(150deg,#DCE4F2 0%,#9FB3D6 100%)", palette: ["#FFFFFF", "#15213B", "#F5A83C", "#9FB3D6"] },
];
const CW = 300;
const CH = 500;
const Card: React.FC<{ st: Style; chosen: number; name: string }> = ({ st, chosen, name }) => (
  <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: st.bg, overflow: "hidden", boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 0 ${2 + 3 * chosen}px ${chosen > 0.02 ? `rgba(245,168,60,${0.4 + 0.6 * chosen})` : "rgba(255,255,255,0.10)"}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: st.accent }} />
        <div style={{ width: 70, height: 9, borderRadius: 5, background: st.ink, opacity: 0.55 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 22, height: 5, borderRadius: 3, background: st.ink, opacity: 0.4 }} />
        ))}
      </div>
    </div>
    <div style={{ margin: "16px 16px 0", height: 150, borderRadius: 16, background: st.hero, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, right: -20, top: -30, background: st.accent, opacity: 0.35 }} />
      <div style={{ position: "absolute", width: 80, height: 80, borderRadius: 20, left: 22, bottom: -20, background: st.ink, opacity: 0.25, transform: "rotate(18deg)" }} />
    </div>
    <div style={{ padding: "16px 18px 0" }}>
      <div style={{ fontFamily: FONT, fontWeight: st.weight, fontSize: 30, lineHeight: 1.05, color: st.ink, letterSpacing: "-0.02em" }}>{name}</div>
      <div style={{ height: 8, width: "92%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 12 }} />
      <div style={{ height: 8, width: "70%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 7 }} />
      <div style={{ marginTop: 16, width: 130, height: 40, borderRadius: 999, background: st.accent, display: "flex", alignItems: "center", justifyContent: "center", ...txt(16, 700, { color: st.bg === "#0F1B2D" ? "#0F1B2D" : "#FFFFFF", letterSpacing: 0 }) }}>
        Escribinos
      </div>
    </div>
    <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 7 }}>
        {st.palette.map((c, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: c, border: "1.5px solid rgba(127,127,127,0.35)" }} />
        ))}
      </div>
      <div style={{ fontFamily: FONT, fontWeight: st.weight, fontSize: 40, color: st.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>Aa</div>
    </div>
  </div>
);

export const Proposals: React.FC<{ f: number; at: number; cards: number[]; pick: number; out?: number; y?: number; s?: number; name?: string; x?: number }> = ({ f, at, cards, pick, out, y = 1100, s = 1, name = "Tu negocio", x = 540 }) => {
  const p = pres(f, at, out, SNAP, 12);
  if (p <= 0.001) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 12, 0, 1, easeIn);
  const pk = sp(f, pick, SNAP);
  const chosen = clamp01(pk);
  return (
    <Obj opacity={p}>
      {STYLES.map((st, i) => {
        const k = sp(f, cards[i], { damping: 15, stiffness: 120, mass: 0.9 });
        if (k <= 0) return null;
        const mid = i === 1;
        const dx = (i - 1) * 262 * s;
        const ry = (1 - i) * 24;
        const back = mid ? 0 : 60 * chosen;
        return (
          <G3
            key={i}
            x={x + dx}
            y={y + (1 - clamp01(k)) * 160 - 60 * o}
            w={CW}
            h={CH}
            s={s * 0.86 * (mid ? 1 + 0.07 * chosen : 1 - 0.05 * chosen)}
            ry={ry + (1 - clamp01(k)) * 50 + 50 * o}
            tz={(mid ? 170 : 90) - back}
            style={{ opacity: clamp01(k * 1.6) * (mid ? 1 : 1 - 0.5 * chosen) }}
          >
            <Card st={st} chosen={mid ? chosen : 0} name={name} />
            {mid && chosen > 0 && (
              <div style={{ position: "absolute", right: -30, top: -30, width: 92, height: 92, borderRadius: 46, background: GOLD_GRAD, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.min(1.15, pk).toFixed(3)})`, boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}>
                <Icon name="solar:check-circle-bold" size={60} color={C.navy} />
              </div>
            )}
          </G3>
        );
      })}
    </Obj>
  );
};

// A price tag hanging from a pin, swinging in: gold (ours) or gray (the cheap one).
export const PriceTag: React.FC<{ f: number; at: number; out?: number; x: number; y: number; text: string; gold: boolean; w?: number; angle?: number }> = ({ f, at, out, x, y, text, gold, w = 360, angle = -16 }) => {
  const k = sp(f, at, SWING);
  if (k <= 0) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 10, 0, 1, easeIn);
  if (o >= 1) return null;
  const h = 128;
  const rot = angle * (1 - k);
  return (
    <Obj opacity={clamp01(k * 1.8) * (1 - o)}>
      <div style={{ position: "absolute", left: x, top: y - 90, transformOrigin: "0 0", transform: `rotate(${rot.toFixed(2)}deg) scale(${(1 - 0.4 * o).toFixed(3)})` }}>
        <div style={{ position: "absolute", left: -1.5, top: 0, width: 3, height: 90, background: "rgba(255,255,255,0.55)" }} />
        <div style={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: 7, background: C.white, boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }} />
        <div
          style={{
            position: "absolute",
            left: -w / 2,
            top: 90,
            width: w,
            height: h,
            borderRadius: 22,
            background: gold ? GOLD_GRAD : "linear-gradient(180deg,#D7DBE2 0%,#B3B9C4 100%)",
            boxShadow: "0 24px 50px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...txt(gold ? 52 : 50, 800, { color: C.navy, letterSpacing: "-0.03em" }),
          }}
        >
          <div style={{ position: "absolute", left: w / 2 - 11, top: -8, width: 22, height: 22, borderRadius: 11, background: "#050E20", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)" }} />
          {text}
        </div>
      </div>
    </Obj>
  );
};

// A floating navy board (a slab) carrying anything: the base of most graphic cards.
export const Panel: React.FC<{ f: number; at: number; out?: number; x: number; y: number; w: number; h: number; r?: number; children?: React.ReactNode; light?: boolean; rx?: number; tz?: number; outDy?: number }> = ({ f, at, out, x, y, w, h, r = 30, children, light = false, rx = 14, tz = 140, outDy = -40 }) => {
  const p = pres(f, at, out, SNAP, 12);
  if (p <= 0.001) return null;
  const k = sp(f, at, { damping: 17, stiffness: 110, mass: 1 });
  const o = out === undefined ? 0 : ramp(f, out, out + 12, 0, 1, easeIn);
  return (
    <Obj opacity={p}>
      <G3 x={x} y={y + outDy * o} w={w} h={h} tz={tz} s={0.9 + 0.1 * clamp01(k)} rx={lerp(rx, 0, clamp01(k))}>
        <Shade w={w} h={h} r={r} />
        <Slab w={w} h={h} r={r} face={light ? "#F7F8FB" : PANEL} border={light ? "rgba(255,255,255,0.9)" : undefined} sides={light ? LIGHT_SIDES : undefined}>
          {children}
        </Slab>
      </G3>
    </Obj>
  );
};

export { presS };
