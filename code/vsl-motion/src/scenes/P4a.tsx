import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { CheckBadge } from "../components/Bits";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { TemplateScreen } from "../components/Screens";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { AVG, Label, LABEL_Y } from "./P1";

// P4a - "Esto es lo que me parece más interesante. La página web promedio sí está en Internet, pero cuando vos buscas
// en Google 'negocios cerca de mí', probablemente no aparezcas."
// The average page (right side, as always) is online; then a board: the search typed word by word, the results come
// in, and the average page sinks out of them.
const ID = "P4a";
const QUERY = "negocios cerca de mí";

// how many characters are typed at second t, word by word with Joaquín's voice
const typed = (t: number) => {
  const segs: [number, number, number, number][] = [
    [cue(ID, 22, -0.06), cue(ID, 22, 0.42), 0, 8], // "negocios"
    [cue(ID, 23, -0.06), cue(ID, 23, 0.22), 8, 14], // " cerca"
    [cue(ID, 24, -0.04), cue(ID, 25, 0.12), 14, QUERY.length], // " de mí"
  ];
  let n = 0;
  for (const [a, b, c0, c1] of segs) {
    if (t >= a) n = Math.round(lerp(c0, c1, clamp01((t - a) / (b - a))));
  }
  return n;
};

const Result: React.FC<{ w: number }> = ({ w }) => (
  <div
    style={{
      width: w,
      height: 132,
      borderRadius: 26,
      background: "rgba(255,255,255,0.96)",
      boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "0 28px",
      boxSizing: "border-box",
    }}
  >
    <div style={{ width: 60, height: 60, borderRadius: 30, background: "#E3E7EE" }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: 18, width: "58%", borderRadius: 9, background: "#1A0DAB", opacity: 0.55 }} />
      <div style={{ height: 12, width: "38%", borderRadius: 6, background: "#188038", opacity: 0.5, marginTop: 12 }} />
      <div style={{ height: 11, width: "86%", borderRadius: 6, background: "#C9CED6", marginTop: 12 }} />
    </div>
  </div>
);

export const P4A_END = 8.4;

// The Google board's content at second t (P4b starts from its last frame).
export const P4aBoardContent: React.FC<{ t: number; bIn?: number }> = ({ t, bIn = 1 }) => {
  const focus = ramp(t, cue(ID, 19, -0.05), cue(ID, 21, 0.2)); // "buscas en Google"
  const n = typed(t);
  const res = [0, 1, 2].map((i) => sp(t, cue(ID, 26, -0.08 + i * 0.09), SNAP)); // "probablemente"
  const mine = sp(t, cue(ID, 26, 0.3), SNAP);
  const sink = ramp(t, cue(ID, 28, -0.14), cue(ID, 28, 0.42), 0, 1, easeIn); // "no aparezcas"
  const caret = Math.floor(t * 2.2) % 2 === 0 || (n > 0 && n < QUERY.length);
  return (
    <>
      <Obj>
        <G3 x={540} y={470} w={400} h={140} ty={(1 - clamp01(bIn)) * 40}>
          <Img src={staticFile("google_wordmark.svg")} style={{ position: "absolute", left: 0, top: 4, width: 400 }} />
        </G3>
      </Obj>
      <Obj>
        <G3 x={540} y={672} w={940} h={128} s={1 + 0.03 * Math.sin(focus * Math.PI)}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background: "#FFFFFF",
              boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 0 ${4 * focus}px rgba(138,180,248,${0.7 * focus})`,
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "0 40px",
            }}
          >
            <Icon name="solar:magnifer-bold-duotone" size={54} color="#5F6368" />
            <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 54, color: "#202124", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
              {QUERY.slice(0, n)}
              {caret && <span style={{ display: "inline-block", width: 4, height: 54, marginLeft: 4, background: "#1A73E8" }} />}
            </div>
          </div>
        </G3>
      </Obj>
      {res.map((k, i) => (
        <Obj key={i} opacity={clamp01(k * 1.6)}>
          <G3 x={540} y={860 + i * 152} w={900} h={132} ty={(1 - k) * 40} rx={(1 - k) * -30}>
            <Result w={900} />
          </G3>
        </Obj>
      ))}
      {/* the average page tries to show up, and sinks */}
      <Obj opacity={clamp01(mine * 1.6) * (1 - sink)}>
        <G3 x={540} y={lerp(1316, 1700, sink)} w={900} h={132} rz={lerp(0, 4, sink)} s={1 - 0.08 * sink}>
          <div
            style={{
              width: 900,
              height: 132,
              borderRadius: 26,
              background: "rgba(214,219,227,0.9)",
              border: "2px dashed rgba(90,99,115,0.6)",
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "0 28px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "#AEB5C2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="solar:question-circle-bold-duotone" size={44} color="#FFFFFF" />
            </div>
            <div style={{ ...txt(40, 700, { color: "#4B5363" }) }}>La página promedio</div>
          </div>
        </G3>
      </Obj>
    </>
  );
};

export const P4a: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const ap = sp(t, cue(ID, 9, -0.12)); // "la página web promedio"
  const lab = sp(t, cue(ID, 9, 0.05), SNAP);
  const net = sp(t, cue(ID, 13, -0.05), SNAP); // "sí está en Internet"
  const netCheck = ramp(t, cue(ID, 15, -0.1), cue(ID, 15, 0.3));
  const bIn = sp(t, cue(ID, 16, -0.04), { damping: 18, stiffness: 120 }); // "pero cuando vos buscas"
  const bob = Math.sin(t * 1.25) * 5;

  return (
    <>
      <Layer on="back">
        <Obj opacity={clamp01(ap * 1.4)}>
          <Phone3D {...AVG} tone="gray" tx={(1 - ap) * 260} tz={(1 - ap) * -500} ry={lerp(-62, AVG.ry, ap)} ty={bob}>
            <TemplateScreen />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01(lab * 1.5)}>
          <Label x={AVG.x} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.9)" k={lab} />
        </Obj>
        <Obj opacity={clamp01(net * 1.6)}>
          <G3 x={470} y={300} w={400} h={96} tz={60} ry={-12} s={0.7 + 0.3 * net}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 30px 14px 18px",
                  borderRadius: 999,
                  background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
                  border: "2.5px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
                }}
              >
                <Icon name="solar:global-bold-duotone" size={52} color="rgba(225,229,236,0.9)" />
                <div style={{ ...txt(40, 700, { color: "rgba(255,255,255,0.9)" }) }}>En internet</div>
                <CheckBadge k={netCheck} tone="gray" size={50} />
              </div>
            </div>
          </G3>
        </Obj>
      </Layer>

      <Layer on="front">
        <Board k={bIn}>
          <P4aBoardContent t={t} bIn={bIn} />
        </Board>
      </Layer>
    </>
  );
};
