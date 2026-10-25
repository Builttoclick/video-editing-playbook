import React from "react";
import { useCurrentFrame } from "remotion";
import { Board } from "../components/Board";
import { G3, Layer, Obj } from "../components/base";
import { Pill } from "../components/Misc";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen } from "../components/Screens";
import { clamp01, cue, easeIn, lerp, ramp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { SPOT } from "./P2a";
import { P6Board, P6C_END, p6cState } from "./P6c";

// P6d - "Y obviamente en el día catorce tu página también ya va a estar arriba."
// P6c's board carries on: the calendar runs to day 14 and day 14 turns green; the board swings away and Joaquín's page rises
// above Joaquín's head, live.
const ID = "P6d";

export const P6d: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const s = p6cState(P6C_END);
  const done = lerp(6, 14, ramp(t, cue(ID, 1, 0.0), cue(ID, 5, 0.12), 0, 1, (x) => x)); // "obviamente en el día 14"
  const live = ramp(t, cue(ID, 5, 0.1), cue(ID, 5, 0.35));
  const cardOut = ramp(t, cue(ID, 2, -0.1), cue(ID, 4, 0.1), 0, 1, easeIn);
  const bOut = ramp(t, cue(ID, 8, -0.2), cue(ID, 8, 0.15), 0, 1, easeIn); // "también"
  const rise = sp(t, cue(ID, 9, -0.18), { damping: 14, stiffness: 120 }); // "ya va a estar arriba"
  const onl = sp(t, cue(ID, 13, -0.12), SNAP); // "arriba"
  const bob = Math.sin(t * 1.2) * 5;
  return (
    <>
      <Layer on="back">
        <Obj opacity={clamp01(rise * 1.4)}>
          <Phone3D x={SPOT.x} y={SPOT.y} w={280} tone="gold" ty={(1 - rise) * 260 + bob} tz={(1 - rise) * -200} ry={lerp(-20, 4, rise)} glow={0.45}>
            <PremiumScreen pulse={0.5 + 0.5 * Math.sin(t * 8)} />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01(onl * 1.6)}>
          <G3 x={250} y={250} w={330} h={100} tz={80} s={0.6 + 0.4 * onl} ry={14}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Pill icon="solar:rocket-2-bold-duotone" text="En línea" tone="wa" size={40} />
            </div>
          </G3>
        </Obj>
      </Layer>
      <Layer on="front">
        <Board k={1} out={bOut}>
          <P6Board done={done} live={live} card={s.card} cardOut={cardOut} rows={s.rows} />
        </Board>
      </Layer>
    </>
  );
};
