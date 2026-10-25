import React from "react";
import { useCurrentFrame } from "remotion";
import { G3, Layer, Obj } from "../components/base";
import { ChatCard } from "../components/Misc";
import { clamp01, cue, lerp, ramp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { AVG, Label, LABEL_Y } from "./P1";

// P6a - "Con la página web promedio, vos le escribís a la persona y te responde cuando puede."
// Right side (the average page): you write to whoever made it, one gray tick, and a clock that keeps spinning.
const ID = "P6a";

const Clock: React.FC<{ t: number; size: number }> = ({ t, size }) => (
  <div
    style={{
      position: "relative",
      width: size,
      height: size,
      borderRadius: size / 2,
      background: "radial-gradient(circle at 35% 30%,#5D6575,#2C313B 75%)",
      border: "4px solid rgba(255,255,255,0.3)",
      boxShadow: "0 18px 36px rgba(0,0,0,0.5)",
    }}
  >
    {[0, 1].map((i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: size / 2 - 4,
          top: i === 0 ? size * 0.16 : size * 0.26,
          width: 8,
          height: i === 0 ? size * 0.34 : size * 0.24,
          borderRadius: 4,
          background: "#E3E7EE",
          transformOrigin: `4px ${i === 0 ? size * 0.34 : size * 0.24}px`,
          transform: `rotate(${(i === 0 ? t * 720 : t * 60) % 360}deg)`,
        }}
      />
    ))}
    <div style={{ position: "absolute", left: size / 2 - 9, top: size / 2 - 9, width: 18, height: 18, borderRadius: 9, background: "#E3E7EE" }} />
  </div>
);

export const P6a: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const card = sp(t, cue(ID, 2, -0.1)); // "la página web promedio"
  const lab = sp(t, cue(ID, 3, 0.0), SNAP);
  const msg = sp(t, cue(ID, 7, -0.08), SNAP); // "escribís"
  const clock = sp(t, cue(ID, 13, -0.1), SNAP); // "te responde cuando puede"
  const spin = Math.max(0, t - cue(ID, 13, 0.0));
  return (
    <Layer on="back">
      <Obj opacity={clamp01(card * 1.5)}>
        <G3 x={742} y={350} w={520} h={420} tx={(1 - card) * 240} tz={(1 - card) * -400} ry={lerp(-50, -16, card)} s={1.15}>
          <ChatCard
            tone="gray"
            name="Diseñador"
            w={520}
            out={{ text: "Hola, ¿podés cambiar el número en la página?", k: msg, ticks: "one", time: "09:14" }}
          />
        </G3>
      </Obj>
      <Obj opacity={clamp01(lab * 1.5)}>
        <Label x={AVG.x} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.9)" k={lab} />
      </Obj>
      <Obj opacity={clamp01(clock * 1.6)}>
        <G3 x={292} y={300} w={190} h={190} tz={90} s={0.6 + 0.4 * clock} ry={-12}>
          <Clock t={spin} size={190} />
        </G3>
      </Obj>
    </Layer>
  );
};
