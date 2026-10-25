import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Chip, Extrude } from "../components/Bits";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { Centered } from "./P1";
import { P4aBoardContent, P4A_END } from "./P4a";

// P4b - "Yo sí sé de SEO, que de hecho es una de las cosas principales que yo hago. Yo puedo hacer que tu negocio
// aparezca entre los primeros resultados de búsqueda, ponele, cuando alguien busque vidriería cerca de mí, que es uno
// de mis casos de estudio."
// P4a's Google board swings away on "Yo"; SEO in 3D gold behind Joaquín's head; a results stack where my client's card climbs
// into the top 3 (the vidriería averages position ~3 on its searches: Search Console, 21-oct pull); the search box
// types "vidriería cerca de mí" low on Joaquín's chest; "Caso de estudio".
const ID = "P4b";
const QUERY = "vidriería cerca de mí";
const STACK = { x: 540, y0: 150, step: 118, w: 760 };

const typed = (t: number) => {
  const segs: [number, number, number, number][] = [
    [cue(ID, 34, -0.06), cue(ID, 34, 0.34), 0, 9], // "vidriería"
    [cue(ID, 35, -0.06), cue(ID, 35, 0.2), 9, 15], // " cerca"
    [cue(ID, 36, -0.04), cue(ID, 37, 0.12), 15, QUERY.length], // " de mí"
  ];
  let n = 0;
  for (const [a, b, c0, c1] of segs) if (t >= a) n = Math.round(lerp(c0, c1, clamp01((t - a) / (b - a))));
  return n;
};

const Row: React.FC<{ gold?: boolean; label?: string }> = ({ gold, label }) => (
  <div
    style={{
      width: STACK.w,
      height: 100,
      borderRadius: 24,
      background: gold ? "linear-gradient(180deg,#14284F,#0A1A38)" : "rgba(255,255,255,0.94)",
      border: gold ? "3px solid rgba(245,168,60,0.95)" : "none",
      boxShadow: gold ? "0 18px 40px rgba(0,0,0,0.5), 0 0 16px rgba(245,168,60,0.22)" : "0 14px 30px rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "0 26px",
      boxSizing: "border-box",
    }}
  >
    {gold ? (
      <>
        <Icon name="solar:map-point-bold-duotone" size={54} color={C.gold} />
        <div style={{ ...txt(40, 700, { color: "#FFFFFF" }) }}>{label}</div>
      </>
    ) : (
      <>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "#E3E7EE" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, width: "55%", borderRadius: 8, background: "#1A0DAB", opacity: 0.5 }} />
          <div style={{ height: 11, width: "80%", borderRadius: 6, background: "#C9CED6", marginTop: 12 }} />
        </div>
      </>
    )}
  </div>
);

export const P4B_END = 9.833;

export const P4bStage: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  if (exit >= 0.999) return null;
  const wrap = (children: React.ReactNode) =>
    exit > 0 ? (
      <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${-exit * 60}px) scale(${1 - 0.08 * exit})`, filter: `blur(${exit * 6}px)` }}>
        {children}
      </AbsoluteFill>
    ) : (
      <>{children}</>
    );
  const bOut = ramp(t, cue(ID, 0, -0.05), cue(ID, 0, 0.32), 0, 1, easeIn); // P4a's board leaves on "Yo"
  const seo = sp(t, cue(ID, 4, -0.12), SNAP); // "SEO"
  const seoOut = ramp(t, cue(ID, 17, -0.1), cue(ID, 17, 0.3), 0, 1, easeIn); // "yo puedo hacer"
  const sheen = ramp(t, cue(ID, 13, -0.1), cue(ID, 13, 0.6), 0, 1, easeOut); // "principales"
  const stack = [0, 1, 2, 3].map((i) => sp(t, cue(ID, 18, 0.0 + i * 0.07), SNAP));
  const climb = sp(t, cue(ID, 23, -0.08), { damping: 17, stiffness: 120 }); // "aparezca entre los primeros"
  const top3 = sp(t, cue(ID, 26, -0.05), SNAP); // "primeros resultados"
  const search = sp(t, cue(ID, 31, -0.1), SNAP); // "cuando alguien busque"
  const n = typed(t);
  const relabel = ramp(t, cue(ID, 34, -0.05), cue(ID, 34, 0.25)); // the card becomes "Vidriería"
  const caso = sp(t, cue(ID, 43, -0.08), SNAP); // "casos de estudio"
  const caret = Math.floor(t * 2.2) % 2 === 0 || (n > 0 && n < QUERY.length);
  const drift = Math.sin(t * 0.9) * 3;

  // the gold card climbs from slot 4 to slot 2 (top 3)
  const goldSlot = lerp(4.4, 1, climb);
  const slotY = (slot: number) => STACK.y0 + slot * STACK.step;
  const plain = [0, 1, 2].map((i) => {
    const pushed = i >= 1 ? climb : 0; // rows below slot 1 move down one when the card passes them
    return slotY(i + pushed);
  });

  return (
    <>
      <Layer on="back">
       {wrap(<>
        {/* SEO in gold behind Joaquín's head */}
        <Obj opacity={clamp01(seo * 1.5) * (1 - seoOut)} blur={seoOut * 8}>
          <G3 x={540} y={540} w={900} h={280} tz={(1 - seo) * -260 - seoOut * 400} rx={(1 - seo) * 70} ry={-4 + 6 * ramp(t, 2.3, 4.5, 0, 1, (x) => x)}>
            <Centered>
              <Extrude text="SEO" size={300} depth={40} layers={20} glow={0.32} sheen={sheen > 0 && sheen < 1 ? sheen : -1} />
            </Centered>
          </G3>
        </Obj>

        {/* results: my client's card climbs into the top 3 */}
        {[0, 1, 2].map((i) => (
          <Obj key={i} opacity={clamp01(stack[i] * 1.6) * (1 - 0.35 * climb * (i >= 1 ? 1 : 0))}>
            <G3 x={STACK.x} y={plain[i]} w={STACK.w} h={100} ty={(1 - stack[i]) * 40} tz={-30} ry={drift} rx={6}>
              <Row />
            </G3>
          </Obj>
        ))}
        <Obj opacity={clamp01(stack[3] * 1.6)} z={30}>
          <G3 x={STACK.x} y={slotY(goldSlot)} w={STACK.w} h={100} tz={40 + 80 * Math.sin(clamp01(climb) * Math.PI)} s={1 + 0.04 * climb} ry={drift} rx={6}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - relabel }}>
              <Row gold label="Tu negocio" />
            </div>
            <div style={{ position: "absolute", inset: 0, opacity: relabel }}>
              <Row gold label="Vidriería en San Lorenzo" />
            </div>
          </G3>
        </Obj>
        <Obj opacity={clamp01(top3 * 1.6)} z={31}>
          <G3 x={STACK.x + STACK.w / 2 - 40} y={slotY(1) - 52} w={170} h={64} tz={120} s={0.6 + 0.4 * top3} ry={drift}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "linear-gradient(180deg,#FFD58A,#F5A83C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                ...txt(34, 800, { color: C.navy, letterSpacing: "-0.01em" }),
              }}
            >
              <Icon name="solar:cup-first-bold-duotone" size={36} color={C.navy} />
              Top 3
            </div>
          </G3>
        </Obj>
       </>)}
      </Layer>

      <Layer on="front">
       {wrap(<>
        {/* P4a's board, frozen at its last frame, swings away on "Yo" */}
        <Board k={1} out={bOut}>
          <P4aBoardContent t={P4A_END} />
        </Board>

        {/* the search, low on Joaquín's chest */}
        <Obj opacity={clamp01(search * 1.6)}>
          <G3 x={540} y={1210} w={900} h={116} ty={(1 - search) * 60} rx={(1 - search) * -30}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "#FFFFFF",
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "0 36px",
              }}
            >
              <Icon name="solar:magnifer-bold-duotone" size={50} color="#5F6368" />
              <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 50, color: "#202124", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
                {QUERY.slice(0, n)}
                {caret && <span style={{ display: "inline-block", width: 4, height: 52, marginLeft: 4, background: "#1A73E8" }} />}
              </div>
            </div>
          </G3>
        </Obj>
        <Obj opacity={clamp01(caso * 1.6)}>
          <G3 x={540} y={1344} w={520} h={100} ty={(1 - caso) * 30} s={0.8 + 0.2 * caso}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <Chip icon="solar:medal-ribbon-star-bold-duotone" text="Caso de estudio" tone="gold" size={40} />
            </div>
          </G3>
        </Obj>
       </>)}
      </Layer>
    </>
  );
};

export const P4b: React.FC = () => <P4bStage t={useCurrentFrame() / FPS} />;
