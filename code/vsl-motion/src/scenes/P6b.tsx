import React from "react";
import { useCurrentFrame } from "remotion";
import { Extrude } from "../components/Bits";
import { G3, Icon, Layer, Obj } from "../components/base";
import { ChatCard } from "../components/Misc";
import { clamp01, cue, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS, SILVER_GRAD } from "../theme";
import { Centered, Label, LABEL_Y, MINE } from "./P1";

// P6b - "Conmigo, mi tiempo promedio de respuesta es seis minutos."
// Left side (mine): the client writes 10:42, I answer 10:48 with blue ticks; "6 min" in 3D gold behind Joaquín's head, like Joaquín's
// name at the start. (The number is the one Joaquín says on camera.)
const ID = "P6b";

export const P6b: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const card = sp(t, cue(ID, 0, -0.06)); // "conmigo"
  const lab = sp(t, cue(ID, 0, 0.1), SNAP);
  const inc = sp(t, cue(ID, 1, -0.05), SNAP);
  const rep = sp(t, cue(ID, 5, -0.1), SNAP); // "respuesta"
  const six = sp(t, cue(ID, 7, -0.1), { damping: 12, stiffness: 170, mass: 0.7 }); // "6 minutos"
  const sheen = ramp(t, cue(ID, 8, -0.05), cue(ID, 8, 0.5), 0, 1, easeOut);
  return (
    <Layer on="back">
      <Obj opacity={clamp01(card * 1.5)}>
        <G3 x={320} y={322} w={480} h={420} tx={(1 - card) * -240} tz={(1 - card) * -400} ry={lerp(50, 16, card)} s={1.08}>
          <ChatCard
            tone="gold"
            name="Joaquín"
            w={480}
            inc={{ text: "Hola, ¿cuánto sale una página?", k: inc, time: "10:42" }}
            out={{ text: "¡Hola! Te paso toda la info", k: rep, ticks: "blue", time: "10:48" }}
          />
        </G3>
      </Obj>
      <Obj opacity={clamp01(lab * 1.5)}>
        <Label x={MINE.x} y={LABEL_Y} text="CONMIGO" color={C.gold} k={lab} glow />
      </Obj>
      {/* 6 min behind Joaquín's head */}
      <Obj opacity={clamp01(six * 1.6)}>
        <G3 x={600} y={600} w={760} h={300} tz={(1 - six) * -260} rx={(1 - six) * 70} ry={-6}>
          <Centered>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, transformStyle: "preserve-3d" }}>
              <div style={{ marginBottom: 46 }}>
                <Icon name="solar:stopwatch-bold-duotone" size={130} color={C.gold} />
              </div>
              <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
                <Extrude text="6" size={300} depth={40} layers={20} glow={0.32} sheen={sheen > 0 && sheen < 1 ? sheen : -1} />
              </div>
              <div style={{ position: "relative", marginBottom: 40, transformStyle: "preserve-3d" }}>
                <Extrude text="min" size={130} depth={22} layers={12} face={SILVER_GRAD} side={["#8C93A1", "#20242C"]} glow={0.2} glowRgb="255,255,255" />
              </div>
            </div>
          </Centered>
        </G3>
      </Obj>
    </Layer>
  );
};
