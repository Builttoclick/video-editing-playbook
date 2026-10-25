import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Board } from "../components/Board";
import { G3, Layer, Obj } from "../components/base";
import { Pill } from "../components/Misc";
import { clamp01, cue, easeIn, ramp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { P8B_END, P8bBoard } from "./P8b";

// P8c - "Y después ya podemos avanzar como sea." (1.4 s) P8b's board swings away on "Y después"; "Avanzamos" on
// "avanzar". P8d starts from this chip.
const ID = "P8c";
export const P8C_END = 2.967;

export const P8cChip: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  const k = sp(t, cue(ID, 4, -0.1), SNAP); // "avanzar"
  if (k <= 0.001 || exit >= 0.999) return null;
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${exit * 40}px)` }}>
      <Obj opacity={clamp01(k * 1.6)}>
        <G3 x={540} y={1240} w={520} h={110} ty={(1 - k) * 40} rx={(1 - k) * -40}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
            <Pill icon="solar:hand-shake-bold-duotone" text="Avanzamos" tone="gold" size={46} />
          </div>
        </G3>
      </Obj>
    </AbsoluteFill>
  );
};

export const P8c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const bOut = ramp(t, cue(ID, 0, -0.04), cue(ID, 1, 0.22), 0, 1, easeIn); // "Y después"
  return (
    <Layer on="front">
      <Board k={1} out={bOut}>
        <P8bBoard t={P8B_END} />
      </Board>
      <P8cChip t={t} />
    </Layer>
  );
};
