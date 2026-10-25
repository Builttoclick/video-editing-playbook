import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { CodeScreen, GLASS, Pill } from "../components/Misc";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen } from "../components/Screens";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, rnd, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { MINE } from "./P1";
import { SPOT } from "./P2a";
import { P4B_END, P4bStage } from "./P4b";

// P4c - "Incluso ahora tengo un cliente que está recibiendo gente de ChatGPT. Todo eso gracias al trabajo que yo hago
// del SEO técnico dentro de la página."
// People stream from ChatGPT into my client's page (left, mine): 120 people came from ChatGPT and Gemini and 39 wrote
// (GA4, 21-oct pull). Then the page turns around and shows what's inside: the technical SEO.
const ID = "P4c";
const SRC = { x: 830, y: 300 };

export const P4c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const prevOut = ramp(t, 1.62, 2.0, 0, 1, easeIn);
  const ph = sp(t, cue(ID, 2, -0.1)); // "tengo un cliente"
  const ai = sp(t, cue(ID, 7, -0.12), SNAP); // "recibiendo"
  const flow = ramp(t, cue(ID, 7, 0.0), cue(ID, 11, 0.25), 0, 1, (x) => x); // people streaming until "todo"
  const cnt = ramp(t, cue(ID, 8, -0.05), cue(ID, 10, 0.25), 0, 1, easeOut); // "gente de ChatGPT"
  const statIn = sp(t, cue(ID, 8, -0.1), SNAP);
  const aiOut = ramp(t, cue(ID, 11, -0.05), cue(ID, 11, 0.3), 0, 1, easeIn); // "todo eso"
  const center = sp(t, cue(ID, 13, -0.1), { damping: 17, stiffness: 100 }); // "gracias al trabajo"
  const flip = ramp(t, cue(ID, 19, -0.15), cue(ID, 20, 0.05), 0, 1, (x) => x); // "del SEO": the page turns around
  const lines = ramp(t, cue(ID, 20, 0.0), cue(ID, 25, 0.2), 0, 12, (x) => x);
  const chip = sp(t, cue(ID, 20, -0.08), SNAP); // "SEO técnico"
  const bob = Math.sin(t * 1.2) * 5;
  // the turn: 0..90 shows the page, 90..180 the code (drawn mirrored back)
  const ang = flip * 180;
  const showCode = ang > 90;

  const phx = lerp(MINE.x, SPOT.x, center);
  const phy = lerp(MINE.y, SPOT.y, center);
  return (
    <>
      <Layer on="back">
        <P4bStage t={P4B_END} exit={prevOut} />
        <Obj opacity={clamp01(ph * 1.4)}>
          <Phone3D
            x={phx}
            y={phy}
            w={MINE.w}
            tone="gold"
            tx={(1 - ph) * -260}
            tz={(1 - ph) * -500 + 30 * center}
            ty={bob}
            ry={lerp(lerp(60, MINE.ry, ph), 0, center) + (showCode ? ang - 180 : ang)}
            glow={0.45}
          >
            {showCode ? (
              <CodeScreen lines={lines} />
            ) : (
              <PremiumScreen eyebrow="VIDRIERÍA" title="Vidrios y mamparas a medida" sub="Templados, mamparas y barandas. Presupuesto por WhatsApp." icon="solar:home-smile-bold-duotone" />
            )}
          </Phone3D>
        </Obj>

        {/* ChatGPT, and the people it sends */}
        <Obj opacity={clamp01(ai * 1.6) * (1 - aiOut)}>
          <G3 x={SRC.x} y={SRC.y} w={150} h={150} tz={40} s={0.6 + 0.4 * ai} ry={-14}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 38,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <Img src={staticFile("chatgpt_simbolo-2025.svg")} style={{ width: 98, height: 98 }} />
            </div>
          </G3>
        </Obj>
        {Array.from({ length: 16 }).map((_, i) => {
          const start = i / 16;
          const k = clamp01((flow - start * 0.75) / 0.25);
          if (k <= 0 || k >= 1) return null;
          const ex = MINE.x + 40;
          const ey = MINE.y - 60;
          const x = lerp(SRC.x, ex, k);
          const y = lerp(SRC.y, ey, k) - Math.sin(k * Math.PI) * (120 + rnd(i) * 80);
          return (
            <Obj key={i} opacity={Math.sin(k * Math.PI) * (1 - aiOut)}>
              <G3 x={x} y={y} w={56} h={56} tz={60 + rnd(i + 9) * 60} s={0.8 + 0.4 * rnd(i + 3)}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 28,
                    background: "radial-gradient(circle at 35% 30%,#22365F,#0A1730 75%)",
                    border: "2px solid rgba(245,168,60,0.8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="solar:user-rounded-bold-duotone" size={40} color={C.gold} />
                </div>
              </G3>
            </Obj>
          );
        })}
        <Obj opacity={clamp01(statIn * 1.6) * (1 - aiOut)}>
          <G3 x={560} y={560} w={420} h={150} tz={70} ty={(1 - statIn) * 30} ry={-6}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 32,
                background: GLASS,
                border: "2.5px solid rgba(245,168,60,0.85)",
                boxShadow: "0 18px 36px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 30px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div style={{ ...txt(64, 800, { color: C.gold }) }}>{`+${Math.round(120 * cnt)}`}</div>
                <div style={{ ...txt(34, 700, { color: "#FFFFFF" }) }}>personas</div>
              </div>
              <div style={{ ...txt(28, 600, { color: "rgba(255,255,255,0.75)", marginTop: 4 }) }}>llegaron desde la IA</div>
            </div>
          </G3>
        </Obj>
      </Layer>

      <Layer on="front">
        <Obj opacity={clamp01(chip * 1.6)}>
          <G3 x={540} y={1250} w={600} h={110} ty={(1 - chip) * 40} rx={(1 - chip) * -40}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <Pill icon="solar:code-square-bold-duotone" text="SEO técnico" tone="gold" size={46} />
            </div>
          </G3>
        </Obj>
      </Layer>
    </>
  );
};
