import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { TemplateScreen } from "../components/Screens";
import { clamp01, cue, easeOut, lerp, ramp, rnd, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { Label, LABEL_Y } from "./P1";

// P3a - "Otra cosa, la página web promedio usualmente se saca una plantilla, se le cambia el logo, se le cambia un
// poquito los colores y eso ya se entrega." Five identical template phones; one gets pulled out, gets another logo,
// other colours, and a stamp.
const ID = "P3a";
const FAN = [
  { dx: -300, ry: 34, tz: -230, rz: -4 },
  { dx: -152, ry: 18, tz: -95, rz: -2 },
  { dx: 152, ry: -18, tz: -95, rz: 2 },
  { dx: 300, ry: -34, tz: -230, rz: 4 },
  { dx: 0, ry: 0, tz: 0, rz: 0 }, // the one that gets pulled out, drawn last
];
const ACCENTS = ["#6E86B5", "#3E9E77", "#C9654A"];
const mixHex = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

export const P3A_END = 7.467;

// The whole stage at second t. P3b starts from P3aStage(P3A_END) and sends it away with `exit`.
export const P3aStage: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  const lab = sp(t, 1.63, SNAP);
  const swapLab = ramp(t, cue(ID, 10, -0.12), cue(ID, 10, 0.12)); // "plantilla": PROMEDIO -> PLANTILLA
  const pull = sp(t, cue(ID, 8, -0.06), { damping: 15, stiffness: 120 }); // "saca"
  const logoK = ramp(t, cue(ID, 15, -0.12), cue(ID, 15, 0.12)); // "logo"
  const logoFlash = Math.sin(clamp01((t - cue(ID, 15, -0.1)) / 0.45) * Math.PI);
  const colK = ramp(t, cue(ID, 20, -0.05), cue(ID, 22, 0.2), 0, 1, (x) => x); // "poquito los colores"
  const accent = colK < 0.5 ? mixHex(ACCENTS[0], ACCENTS[1], colK * 2) : mixHex(ACCENTS[1], ACCENTS[2], colK * 2 - 1);
  const pal = sp(t, cue(ID, 20, -0.1), SNAP);
  const stamp = sp(t, cue(ID, 27, -0.1), { damping: 11, stiffness: 260, mass: 0.7 }); // "entrega"
  const thump = Math.sin(clamp01((t - cue(ID, 27, -0.1)) / 0.22) * Math.PI);

  if (exit >= 0.999) return null;
  return (
    <Layer on="back">
     <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${exit * 70}px) scale(${1 - 0.1 * exit})`, filter: exit > 0 ? `blur(${exit * 6}px)` : undefined }}>
      {/* label on top: PROMEDIO, flips to PLANTILLA on the word */}
      <Obj opacity={Math.min(1, lab * 1.5) * (1 - swapLab)}>
        <G3 x={540} y={LABEL_Y} w={420} h={60} rx={swapLab * 90}>
          <Label x={210} y={30} text="PROMEDIO" color="rgba(225,229,236,0.92)" k={lab} />
        </G3>
      </Obj>
      <Obj opacity={swapLab}>
        <G3 x={540} y={LABEL_Y} w={420} h={60} rx={(1 - swapLab) * -90}>
          <Label x={210} y={30} text="PLANTILLA" color="rgba(225,229,236,0.92)" k={1} />
        </G3>
      </Obj>

      {FAN.map((f, i) => {
        const inK = sp(t, 2.0 + i * 0.07 + (i === 4 ? -0.28 : 0), { damping: 16, stiffness: 110 });
        const hero = i === 4;
        const back = hero ? 0 : pull;
        const shake = hero ? thump * Math.sin(t * 70) * 4 : 0;
        return (
          <Obj key={i} opacity={Math.min(1, inK * 1.5) * (1 - 0.5 * back)} blur={back * 1.8}>
            <Phone3D
              x={540 + f.dx}
              y={432}
              w={232}
              tone="gray"
              tx={(rnd(i + 3) - 0.5) * 30 * (1 - inK) + shake}
              ty={(1 - inK) * 140 + (hero ? 12 * pull : 0)}
              tz={f.tz - (1 - inK) * 380 + (hero ? 165 * pull : -110 * back)}
              ry={f.ry + (1 - inK) * (f.dx >= 0 ? -30 : 30)}
              rz={f.rz}
              s={hero ? 1 + 0.08 * pull : 1}
              dim={back * 0.35}
            >
              <TemplateScreen accent={hero ? accent : ACCENTS[0]} logo={hero ? (logoK > 0.5 ? 1 : 0) : 0} />
            </Phone3D>
          </Obj>
        );
      })}

      {/* logo swap ring, over the hero's header */}
      <Obj opacity={logoFlash > 0 ? logoFlash : 0} z={40}>
        <G3 x={470} y={236} w={170} h={78} tz={240}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              border: "4px solid rgba(255,255,255,0.95)",
              boxShadow: "0 0 30px rgba(255,255,255,0.6)",
              transform: `scale(${0.85 + 0.25 * logoFlash})`,
            }}
          />
        </G3>
      </Obj>

      {/* palette that shuffles on "colores" */}
      <Obj opacity={Math.min(1, pal * 1.5) * (1 - stamp * 0.6)} z={41}>
        <G3 x={862} y={262} w={250} h={96} tz={120} ry={-16} s={0.7 + 0.3 * pal}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 48,
              background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
              border: "2px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              boxShadow: "0 18px 36px rgba(0,0,0,0.5)",
            }}
          >
            <Icon name="solar:palette-bold-duotone" size={48} color="rgba(255,255,255,0.8)" />
            {ACCENTS.map((a, j) => {
              const on = clamp01(colK * 3 - j);
              return (
                <div
                  key={j}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: a,
                    border: `3px solid rgba(255,255,255,${0.25 + 0.7 * on})`,
                    transform: `scale(${0.8 + 0.3 * Math.sin(on * Math.PI) + 0.1 * on})`,
                  }}
                />
              );
            })}
          </div>
        </G3>
      </Obj>

      {/* the stamp */}
      <Obj opacity={clamp01(stamp * 4)} z={50}>
        <G3 x={548} y={452} w={420} h={130} tz={300} rz={-11} s={lerp(1.9, 1, stamp)}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              border: `7px solid ${C.stamp}`,
              background: "rgba(226,87,76,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              ...txt(64, 800, { color: C.stamp, letterSpacing: "0.06em" }),
            }}
          >
            ENTREGADO
          </div>
        </G3>
      </Obj>
     </AbsoluteFill>
    </Layer>
  );
};

export const P3a: React.FC = () => <P3aStage t={useCurrentFrame() / FPS} />;
