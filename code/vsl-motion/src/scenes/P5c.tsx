import React from "react";
import { useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { BuildScreen, STYLES } from "../components/Proposals";
import { SlotChip } from "../components/SlotChip";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { MINE } from "./P1";
import { SPOT } from "./P2a";
import { P5B_END, P5bToasts } from "./P5b";

// P5c - "Justamente por eso yo te propongo textos, te propongo la estructura, te digo qué poner acá, porque yo realmente
// sé qué tipo de páginas web venden más."
// My page comes to the centre as a wireframe; the texts write themselves, the structure lights up, a pointer says
// "this goes here", and on "venden más" it fills with colour. On Joaquín's chest, the three things Joaquín proposes, checked.
const ID = "P5c";
const ROWS = [
  { n: 1, text: "Textos", w: 6, check: 6 },
  { n: 2, text: "Estructura", w: 10, check: 10 },
  { n: 3, text: "Qué poner y dónde", w: 13, check: 15 },
];
const ROW_Y = [1120, 1236, 1352];

export const P5c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const toastsOut = ramp(t, 1.55, 1.95, 0, 1, easeOut);
  const go = sp(t, cue(ID, 0, -0.02), { damping: 17, stiffness: 100 }); // "justamente": to the centre
  const type = ramp(t, cue(ID, 6, -0.1), cue(ID, 6, 0.3)); // "textos"
  const struct = Math.sin(clamp01((t - cue(ID, 10, -0.1)) / 0.9) * Math.PI); // "estructura": outline pulse
  const point = sp(t, cue(ID, 13, -0.05), SNAP); // "qué poner acá"
  const tap = ramp(t, cue(ID, 15, -0.05), cue(ID, 15, 0.4), 0, 1, (x) => x);
  const color = ramp(t, cue(ID, 25, -0.2), cue(ID, 26, 0.1), 0, 1, (x) => x); // "venden más"
  const sell = sp(t, cue(ID, 25, -0.05), SNAP);
  const bob = Math.sin(t * 1.2) * 5;
  const x = lerp(MINE.x, SPOT.x, go);
  const y = lerp(MINE.y, SPOT.y, go);

  return (
    <>
      <Layer on="back">
        <P5bToasts t={P5B_END} exit={toastsOut} />
        <Obj>
          <Phone3D x={x} y={y} w={MINE.w} tone="gold" ry={lerp(MINE.ry, 4, go) + Math.sin(t * 0.9) * 2} tz={30 * go} ty={bob} glow={0.4}>
            <BuildScreen st={STYLES[1]} blocks={5} type={type} logo={1} color={color} />
          </Phone3D>
        </Obj>
        {/* the structure lights up */}
        <Obj opacity={struct > 0 ? struct : 0}>
          <G3 x={x} y={y - 20} w={250} h={500} tz={60}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, border: "4px dashed rgba(245,168,60,0.95)", boxShadow: "0 0 12px rgba(245,168,60,0.3)" }} />
          </G3>
        </Obj>
        {/* "te digo qué poner acá" */}
        <Obj opacity={clamp01(point * 1.6) * (1 - color)}>
          <G3 x={x + 150} y={y - 40} w={120} h={120} tz={140} s={0.6 + 0.4 * point - 0.1 * Math.sin(clamp01(tap * 2) * Math.PI)}>
            {tap > 0 && tap < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: -50 * tap,
                  top: -50 * tap,
                  width: 100 + 100 * tap,
                  height: 100 + 100 * tap,
                  borderRadius: "50%",
                  border: `4px solid rgba(245,168,60,${0.9 * (1 - tap)})`,
                }}
              />
            )}
            <Icon name="solar:cursor-bold-duotone" size={100} color={C.gold} style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.5))", transform: "scaleX(-1)" }} />
          </G3>
        </Obj>
        {/* "venden más" */}
        <Obj opacity={clamp01(sell * 1.6)}>
          <G3 x={x + 170} y={y - 250} w={270} h={84} tz={120} s={0.6 + 0.4 * sell} ry={-10}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "linear-gradient(180deg,#FFD58A,#F5A83C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 12px 26px rgba(0,0,0,0.45)",
                ...txt(34, 800, { color: C.navy, letterSpacing: "-0.01em" }),
              }}
            >
              <Icon name="solar:graph-new-up-bold-duotone" size={42} color={C.navy} />
              Vende más
            </div>
          </G3>
        </Obj>
      </Layer>

      <Layer on="front">
        {ROWS.map((r, i) => {
          const k = sp(t, cue(ID, r.w, -0.12), SNAP);
          const chk = ramp(t, cue(ID, r.check, 0.0), cue(ID, r.check, 0.35));
          return (
            <Obj key={i} opacity={clamp01(k * 1.6)}>
              <G3 x={540} y={ROW_Y[i]} w={660} h={108} ty={(1 - k) * 50} rx={(1 - k) * -50}>
                <SlotChip n={r.n} text={r.text} tone="gold" fill={k} check={chk} />
              </G3>
            </Obj>
          );
        })}
      </Layer>
    </>
  );
};
