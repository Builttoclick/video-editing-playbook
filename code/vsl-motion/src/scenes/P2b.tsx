import React from "react";
import { useCurrentFrame } from "remotion";
import { Bubble } from "../components/Bits";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen, TemplateScreen } from "../components/Screens";
import { SlotChip } from "../components/SlotChip";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { AVG, Label, LABEL_Y, MINE } from "./P1";
import { CHIP_Y, SPOT } from "./P2a";
import icons from "../data/icons.json";

// P2b - "Está bien, mis páginas también son lindas, pero mis páginas están hechas como para que la gente entre y así
// entienda qué es lo que vos hacés y te contacte ya por WhatsApp."
// Starts where P2a ends; my page swaps into the spotlight, then the three steps light up on Joaquín's chest.
const ID = "P2b";

const NODES: { x: number; icon: keyof typeof icons; label: string; at: number; tone: "gold" | "wa" }[] = [
  { x: 230, icon: "solar:users-group-rounded-bold-duotone", label: "Entra", at: cue(ID, 17, -0.02), tone: "gold" },
  { x: 540, icon: "solar:lightbulb-bolt-bold-duotone", label: "Entiende", at: cue(ID, 20, -0.02), tone: "gold" },
  { x: 850, icon: "ri:whatsapp-fill", label: "Te escribe", at: cue(ID, 29, -0.02), tone: "wa" },
];
const ROW_Y = 1250;

export const P2b: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const out1 = ramp(t, cue(ID, 1, -0.05), cue(ID, 1) + 0.3, 0, 1, easeIn); // "bien"
  const swap = sp(t, cue(ID, 2, -0.08), { damping: 17, stiffness: 95 }); // "mis páginas"
  const gold2 = ramp(t, cue(ID, 4, -0.05), cue(ID, 4) + 0.3); // "también"
  const out2 = ramp(t, cue(ID, 7, -0.02), cue(ID, 7) + 0.32, 0, 1, easeIn); // "pero"
  const spark = ramp(t, cue(ID, 6, -0.15), cue(ID, 6) + 0.5, 0, 1, (x) => x);
  const row = sp(t, cue(ID, 12, -0.05), SNAP); // "como para que"
  const scroll = ramp(t, NODES[0].at, NODES[0].at + 0.6, 0, 70, easeOut);
  const hl = ramp(t, NODES[1].at, NODES[1].at + 0.45, 0, 1, easeOut);
  const tap = ramp(t, NODES[2].at, NODES[2].at + 0.5, 0, 1, (x) => x);
  const pulse = clamp01((t - NODES[2].at - 0.15) * 3) * (0.7 + 0.3 * Math.sin(t * 10));
  const bub = sp(t, cue(ID, 30, -0.04), SNAP); // "ya por WhatsApp"
  const line1 = ramp(t, NODES[0].at + 0.15, NODES[1].at, 0, 1, easeOut);
  const line2 = ramp(t, NODES[2].at - 0.45, NODES[2].at, 0, 1, easeOut);
  const bob = Math.sin(t * 1.25) * 5;

  return (
    <>
      <Layer on="back">
        {/* the average page steps back to its side */}
        <Obj opacity={lerp(1, 0.3, swap)} blur={swap * 2.5}>
          <Phone3D
            {...AVG}
            tone="gray"
            tx={lerp(SPOT.x - AVG.x, 0, swap)}
            ty={lerp(SPOT.y - AVG.y, 0, swap)}
            tz={lerp(SPOT.tz, -460, swap)}
            ry={lerp(SPOT.ry, -40, swap)}
            s={lerp(SPOT.s, 0.96, swap)}
          >
            <TemplateScreen />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01(1 - swap * 2.2)}>
          <Label x={lerp(SPOT.x, AVG.x, swap)} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.92)" k={1} />
        </Obj>

        {/* my page takes the spotlight */}
        <Obj opacity={lerp(0.32, 1, swap)} blur={(1 - swap) * 2.5}>
          <Phone3D
            {...MINE}
            tone="gold"
            tx={lerp(0, SPOT.x - MINE.x, swap)}
            ty={lerp(0, SPOT.y - MINE.y, swap) + bob * swap}
            tz={lerp(-460, SPOT.tz, swap)}
            ry={lerp(40, -SPOT.ry, swap) + Math.sin(t * 0.9) * 2 * swap}
            s={lerp(1, SPOT.s, swap)}
            glow={lerp(0.12, 0.6, swap) + 0.12 * pulse}
          >
            <PremiumScreen
              scroll={scroll}
              highlight={hl}
              tap={tap > 0 && tap < 1 ? tap : 0}
              pulse={pulse}
              sparkle={spark > 0 && spark < 1 ? spark : 0}
            />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01((swap - 0.45) * 2.2)}>
          <Label x={SPOT.x} y={LABEL_Y} text="MI PÁGINA" color={C.gold} k={clamp01((swap - 0.45) * 2.2)} glow />
        </Obj>

        {/* the message that arrives */}
        <Obj opacity={Math.min(1, bub * 1.8)} z={30}>
          <G3
            x={lerp(520, 288, bub)}
            y={lerp(560, 300, bub)}
            w={440}
            h={190}
            tz={lerp(-40, 150, bub)}
            s={lerp(0.3, 0.9, bub)}
            ry={lerp(10, 14, bub)}
            rx={lerp(20, 4, bub)}
          >
            <Bubble msg="Hola, quiero una cotización" w={440} />
          </G3>
        </Obj>
      </Layer>

      <Layer on="front">
        {/* P2a's checklist leaves: "conforme" first, "linda" turns gold ("también"), then goes */}
        <Obj opacity={1 - out1}>
          <G3 x={540} y={CHIP_Y[0]} w={660} h={108} tz={-out1 * 160} rx={out1 * -70}>
            <SlotChip n={1} tone="gray" text="Cliente conforme" fill={1} check={1} />
          </G3>
        </Obj>
        <Obj opacity={1 - out2}>
          <G3 x={540} y={lerp(CHIP_Y[1], CHIP_Y[0] + 40, ramp(t, cue(ID, 1) + 0.22, cue(ID, 3) + 0.15, 0, 1))} w={660} h={108} ty={out2 * 80} rx={out2 * 40} s={1 + 0.05 * Math.sin(gold2 * Math.PI)}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - gold2 }}>
              <SlotChip n={2} tone="gray" text="Se ve linda" fill={1} check={1} />
            </div>
            <div style={{ position: "absolute", inset: 0, opacity: gold2 }}>
              <SlotChip n={2} tone="gold" text="Se ve linda" fill={1} check={1} />
            </div>
          </G3>
        </Obj>

        {/* entra -> entiende -> te escribe */}
        <Obj opacity={Math.min(1, row * 1.5)}>
          <G3 x={540} y={ROW_Y} w={1000} h={10} ty={(1 - row) * 40}>
            <div style={{ position: "absolute", left: 190, top: 0, width: 620, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.16)" }} />
            <div
              style={{
                position: "absolute",
                left: 190,
                top: 0,
                width: 310 * line1,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg,#F5A83C,#FFD58A)",
                boxShadow: "0 0 10px rgba(245,168,60,0.4)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 500,
                top: 0,
                width: 310 * line2,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg,#FFD58A,#25D366)",
                boxShadow: "0 0 10px rgba(37,211,102,0.4)",
              }}
            />
          </G3>
        </Obj>
        {NODES.map((n, i) => {
          const base = sp(t, cue(ID, 12, -0.05 + i * 0.07), SNAP);
          const lit = sp(t, n.at, SNAP);
          const col = n.tone === "wa" ? C.wa : C.gold;
          return (
            <Obj key={i} opacity={Math.min(1, base * 1.5)}>
              <G3 x={n.x} y={ROW_Y} w={132} h={132} ty={(1 - base) * 50} s={0.85 + 0.15 * base + 0.12 * Math.sin(clamp01(lit) * Math.PI)}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 66,
                    background: "radial-gradient(circle at 35% 30%,#1A2C52 0%,#0A1730 70%)",
                    border: `3px solid ${lit > 0.05 ? col : "rgba(255,255,255,0.2)"}`,
                    boxShadow: `0 16px 34px rgba(0,0,0,0.5), 0 0 ${28 * lit}px ${n.tone === "wa" ? "rgba(37,211,102,0.38)" : "rgba(245,168,60,0.34)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={n.icon} size={70} color={lit > 0.05 ? col : "rgba(255,255,255,0.35)"} />
                </div>
              </G3>
              <G3 x={n.x} y={ROW_Y + 112} w={300} h={56} ty={(1 - lit) * 20}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    justifyContent: "center",
                    opacity: clamp01(lit * 1.5),
                    ...txt(44, 700, { color: "#FFFFFF", textShadow: "0 4px 16px rgba(0,0,0,0.8)" }),
                  }}
                >
                  {n.label}
                </div>
              </G3>
            </Obj>
          );
        })}
      </Layer>
    </>
  );
};
