import React from "react";
import { useCurrentFrame } from "remotion";
import { G3, Layer, Obj } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen, TemplateScreen } from "../components/Screens";
import { SlotChip } from "../components/SlotChip";
import { cue, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { AVG, GLOW_BURST, GLOW_MINE, Label, LABEL_Y, MINE, P1_END, ToastStack } from "./P1";

// P2a - "La página web promedio está hecha para dos cosas: para que el cliente esté conforme y para que se vea linda."
// Starts exactly where P1 ends (same phones, same messages), then the average page takes the spotlight.
const ID = "P2a";
const WIN0 = 1.533;

// spotlight spot, shared with P2b
// the average page arrives from the right, so it keeps a slight turn to the left; mine (P2b) mirrors it
export const SPOT = { x: 540, y: 432, s: 1.0, ry: -8, tz: 40 };
export const CHIP_Y = [1196, 1324];

export const P2a: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const toastsOut = ramp(t, WIN0 + 0.02, WIN0 + 0.38, 0, 1, easeOut);
  const go = sp(t, cue(ID, 1, -0.05), { damping: 17, stiffness: 95 }); // "página web promedio"
  const f1 = sp(t, cue(ID, 12, -0.08), SNAP); // "cliente"
  const c1 = ramp(t, cue(ID, 14, -0.12), cue(ID, 14) + 0.32);
  const f2 = sp(t, cue(ID, 18, -0.06), SNAP); // "se vea"
  const c2 = ramp(t, cue(ID, 20, -0.14), cue(ID, 20) + 0.2);
  const spark = ramp(t, cue(ID, 20, -0.2), cue(ID, 20) + 0.45, 0, 1, (x) => x);
  const bob = Math.sin(t * 1.25) * 5;

  return (
    <>
      <Layer on="back">
        {/* my page steps back */}
        <Obj opacity={lerp(1, 0.32, go)} blur={go * 2.5}>
          <Phone3D
            {...MINE}
            tone="gold"
            tz={lerp(40, -460, go)}
            ry={lerp(32, 40, go)}
            glow={lerp(GLOW_MINE + GLOW_BURST, 0.12, go)}
          >
            <PremiumScreen pulse={(1 - go) * 0.8} />
          </Phone3D>
        </Obj>
        <Obj opacity={1 - go}>
          <Label x={MINE.x} y={LABEL_Y} text="MI PÁGINA" color={C.gold} k={1} glow />
        </Obj>
        <ToastStack t={P1_END} exit={toastsOut} />

        {/* the average page comes forward, centre stage */}
        <Obj>
          <Phone3D
            {...AVG}
            tone="gray"
            tx={lerp(0, SPOT.x - AVG.x, go)}
            ty={lerp(0, SPOT.y - AVG.y, go) + bob * go}
            tz={lerp(-60, SPOT.tz, go)}
            ry={lerp(-30, SPOT.ry, go) + Math.sin(t * 0.9) * 2 * go}
            s={lerp(0.96, SPOT.s, go)}
            dim={lerp(0.5, 0, go)}
          >
            <TemplateScreen sparkle={spark > 0 && spark < 1 ? spark : 0} />
          </Phone3D>
        </Obj>
        <Obj>
          <Label x={lerp(AVG.x, SPOT.x, go)} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.92)" k={1} />
        </Obj>
      </Layer>

      <Layer on="front">
        {[0, 1].map((i) => {
          const k = sp(t, cue(ID, 7, -0.05 + i * 0.09), SNAP);
          return (
            <Obj key={i} opacity={Math.min(1, k * 1.6)}>
              <G3 x={540} y={CHIP_Y[i]} w={660} h={108} ty={(1 - k) * 60} rx={(1 - k) * -50}>
                <SlotChip
                  n={i + 1}
                  tone="gray"
                  text={i === 0 ? "Cliente conforme" : "Se ve linda"}
                  fill={i === 0 ? f1 : f2}
                  check={i === 0 ? c1 : c2}
                />
              </G3>
            </Obj>
          );
        })}
      </Layer>
    </>
  );
};
