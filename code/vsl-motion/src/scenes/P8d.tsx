import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { DownArrows } from "../components/Misc";
import { clamp01, cue, easeOut, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { P8C_END, P8cChip } from "./P8c";

// P8d - "Llená el formulario de acá abajo y espero tu contacto." The last call: the form button on Joaquín's chest, arrows
// at the very bottom on "acá abajo", and the Built to Click logo over Joaquín's head as the sign-off.
const ID = "P8d";

export const P8d: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const chipOut = ramp(t, 1.67, 1.95, 0, 1, easeOut);
  const btn = sp(t, cue(ID, 0, -0.06), SNAP); // "llená el formulario"
  const arrows = ramp(t, cue(ID, 4, -0.15), cue(ID, 4, 0.15)); // "acá abajo"
  const logo = sp(t, cue(ID, 7, -0.1), { damping: 16, stiffness: 120 }); // "espero tu contacto"
  const pulse = 0.5 + 0.5 * Math.sin(t * 6);
  return (
    <>
      <Layer on="back">
        <Obj opacity={clamp01(logo * 1.5)}>
          <G3 x={540} y={360} w={560} h={120} tz={(1 - logo) * -260} rx={(1 - logo) * -70} ry={Math.sin(t * 1.1) * 4}>
            <Img src={staticFile("lockup-horizontal-blanco.svg")} style={{ width: 540, position: "absolute", left: 10, top: 6 }} />
          </G3>
        </Obj>
      </Layer>
      <Layer on="front">
        <P8cChip t={P8C_END} exit={chipOut} />
        <Obj opacity={clamp01(btn * 1.6)}>
          <G3 x={540} y={1250} w={720} h={120} ty={(1 - btn) * 50} rx={(1 - btn) * -40} s={1 + 0.03 * pulse * clamp01(btn)}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: "linear-gradient(180deg,#FFC66B,#F5A83C)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                boxShadow: `0 20px 40px rgba(0,0,0,0.45), 0 0 ${16 + 10 * pulse}px rgba(245,168,60,0.3)`,
                ...txt(50, 800, { color: C.navy, letterSpacing: "-0.02em" }),
              }}
            >
              <Icon name="solar:pen-2-bold-duotone" size={58} color={C.navy} />
              Llená el formulario
            </div>
          </G3>
        </Obj>
        <Obj opacity={arrows}>
          <G3 x={540} y={1735} w={200} h={240}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <DownArrows t={t} k={1} size={110} />
            </div>
          </G3>
        </Obj>
      </Layer>
    </>
  );
};
