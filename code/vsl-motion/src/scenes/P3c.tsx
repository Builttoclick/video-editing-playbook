import React from "react";
import { useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { clamp01, cue, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS, GOLD_GRAD } from "../theme";
import { BuildStage, P3B_END } from "./P3b";
import icons from "../data/icons.json";

// P3c - "¿Por qué? Y porque si tu negocio es bueno, tu página también tiene que ser buena."
// The page built in P3b stays above Joaquín's head; on Joaquín's chest, "Tu negocio" = "Tu página", both at five stars.
const ID = "P3c";

const Card: React.FC<{ icon: keyof typeof icons; label: string; stars: number }> = ({ icon, label, stars }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 34,
      background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
      border: "2.5px solid rgba(245,168,60,0.85)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Icon name={icon} size={58} color={C.gold} />
      <div style={{ ...txt(46, 700, { color: "#FFFFFF" }) }}>{label}</div>
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const k = clamp01(stars * 5 - i);
        return (
          <div key={i} style={{ position: "relative", width: 40, height: 40 }}>
            <Icon name="solar:star-bold" size={40} color="rgba(255,255,255,0.18)" style={{ position: "absolute", left: 0, top: 0 }} />
            <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${k > 0 ? 0.6 + 0.4 * k + 0.25 * Math.sin(k * Math.PI) : 0})` }}>
              <Icon name="solar:star-bold" size={40} color={C.gold} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const P3c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const left = sp(t, cue(ID, 5, -0.05), SNAP); // "tu negocio"
  const starsL = ramp(t, cue(ID, 7, -0.05), cue(ID, 8, 0.18), 0, 1, (x) => x); // "es bueno"
  const right = sp(t, cue(ID, 9, -0.05), SNAP); // "tu página"
  const eq = sp(t, cue(ID, 11, -0.05), SNAP); // "también"
  const starsR = ramp(t, cue(ID, 13, -0.08), cue(ID, 15, 0.08), 0, 1, (x) => x); // "tiene que ser buena"

  return (
    <>
      <Layer on="back">
        <BuildStage t={P3B_END} />
      </Layer>
      <Layer on="front">
        <Obj opacity={clamp01(left * 1.6)}>
          <G3 x={282} y={1250} w={420} h={200} ty={(1 - left) * 50} rx={(1 - left) * -40}>
            <Card icon="solar:shop-bold-duotone" label="Tu negocio" stars={starsL} />
          </G3>
        </Obj>
        <Obj opacity={clamp01(eq * 1.6)}>
          <G3 x={540} y={1250} w={100} h={120} s={0.5 + 0.5 * eq}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...txt(110, 800, { backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }),
              }}
            >
              =
            </div>
          </G3>
        </Obj>
        <Obj opacity={clamp01(right * 1.6)}>
          <G3 x={798} y={1250} w={420} h={200} ty={(1 - right) * 50} rx={(1 - right) * -40}>
            <Card icon="solar:smartphone-bold-duotone" label="Tu página" stars={starsR} />
          </G3>
        </Obj>
      </Layer>
    </>
  );
};
