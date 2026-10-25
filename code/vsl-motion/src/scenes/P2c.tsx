import React from "react";
import { useCurrentFrame } from "remotion";
import { Extrude } from "../components/Bits";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { clamp01, cue, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { Centered } from "./P1";

// P2c - "Este es uno de mis clientes de Caaguazú. En las últimas dos semanas, cuarenta y tres personas hicieron clic en
// el botón de WhatsApp." Proof as UI, the way a good coded explainer's dashboard does it, in 3D on the wall above Joaquín's head.
// Bars = people who tapped WhatsApp per day, 1 to 14 Oct 2026 (GA4, the client's own analytics).
// 43 = the people over those two weeks (what Joaquín says). No client name, no logo.
const ID = "P2c";
const DAYS = [4, 2, 0, 0, 2, 2, 7, 8, 6, 3, 2, 1, 5, 7];
const CW = 960;
const CH = 548;

export const P2c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const card = sp(t, 1.56, { damping: 16, stiffness: 105 });
  const pin = sp(t, cue(ID, 7, -0.06), SNAP); // "Caaguazú"
  const span = sp(t, cue(ID, 10, -0.05), SNAP); // "últimas 2 semanas"
  const countK = ramp(t, cue(ID, 10, 0.05), cue(ID, 13, 0.02), 0, 1, easeOut); // lands on "43"
  const count = Math.round(43 * countK);
  const hit = sp(t, cue(ID, 13, 0.02), { damping: 9, stiffness: 220, mass: 0.6 });
  const ppl = sp(t, cue(ID, 14, -0.04), SNAP); // "personas"
  const pill = sp(t, cue(ID, 15, -0.05), SNAP); // "hicieron clic"
  const waHit = sp(t, cue(ID, 21, -0.05), { damping: 8, stiffness: 240, mass: 0.6 }); // "WhatsApp"
  const rx = lerp(11, 6, ramp(t, 1.6, 7, 0, 1, (x) => x));
  const ry = lerp(-9, 5, ramp(t, 1.6, 7, 0, 1, (x) => x));
  const sheen = ramp(t, cue(ID, 13, 0.1), cue(ID, 13, 0.9), 0, 1, easeOut);
  const maxD = Math.max(...DAYS);

  return (
    <Layer on="back">
      <Obj opacity={Math.min(1, card * 1.6)}>
        <G3 x={540} y={380} w={CW} h={CH} tz={(1 - card) * -650} rx={rx + (1 - card) * 34} ry={ry} s={1 + 0.02 * Math.sin(clamp01(waHit) * Math.PI)}>
          {/* slab thickness */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 40,
                background: `rgb(${Math.round(30 - i * 2.5)},${Math.round(42 - i * 3)},${Math.round(70 - i * 5)})`,
                transform: `translateZ(${-(i + 1) * 2.2}px)`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 40,
              background: "linear-gradient(160deg,#122B57 0%,#0A1E3F 45%,#071630 100%)",
              border: "2px solid rgba(245,168,60,0.55)",
              boxShadow: `0 40px 80px rgba(0,0,0,0.55), 0 0 ${28 + 22 * waHit}px rgba(245,168,60,${0.11 + 0.11 * waHit})`,
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 0%,rgba(255,213,138,0.16),rgba(255,213,138,0) 55%)" }} />
            {/* header */}
            <div style={{ position: "absolute", left: 44, top: 38, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ transform: `translateY(${(1 - pin) * -40}px) scale(${0.4 + 0.6 * pin})`, opacity: clamp01(pin * 2) }}>
                <Icon name="solar:map-point-bold-duotone" size={58} color={C.gold} />
              </div>
              <div style={{ ...txt(44, 700, { color: "#FFFFFF" }), opacity: clamp01(pin * 1.6), transform: `translateX(${(1 - pin) * 30}px)` }}>
                Cliente de Caaguazú
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                right: 40,
                top: 34,
                width: 68,
                height: 68,
                borderRadius: 20,
                background: C.wa,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${1 + 0.18 * Math.sin(clamp01(waHit) * Math.PI)})`,
                boxShadow: `0 0 ${28 * waHit}px rgba(37,211,102,0.8)`,
              }}
            >
              <Icon name="ri:whatsapp-fill" size={46} color="#FFFFFF" />
            </div>
            <div style={{ position: "absolute", left: 44, right: 44, top: 128, height: 2, background: "rgba(255,255,255,0.10)" }} />
            {/* bars */}
            <div style={{ position: "absolute", left: 496, top: 168, width: 420, height: 252, display: "flex", alignItems: "flex-end", gap: 9 }}>
              {DAYS.map((d, i) => {
                const g = sp(t, cue(ID, 10, 0.02 + i * 0.045), { damping: 15, stiffness: 150 });
                const hgt = Math.max(6, (d / maxD) * 236) * g;
                const last = i >= 11;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: hgt,
                      borderRadius: 7,
                      background: last ? "linear-gradient(180deg,#FFE2A6,#F5A83C)" : "linear-gradient(180deg,#F5A83C,#B8741E)",
                      boxShadow: last ? "0 0 12px rgba(245,168,60,0.32)" : "none",
                      opacity: 0.35 + 0.65 * g,
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                position: "absolute",
                left: 496,
                top: 446,
                width: 420,
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: clamp01(span * 1.6),
                transform: `translateY(${(1 - span) * 16}px)`,
              }}
            >
              <Icon name="solar:calendar-bold-duotone" size={40} color="rgba(255,255,255,0.7)" />
              <div style={{ ...txt(34, 600, { color: "rgba(255,255,255,0.82)", letterSpacing: "-0.01em" }) }}>Últimas 2 semanas</div>
            </div>
          </div>
          {/* the number floats off the card, real depth */}
          <G3 x={232} y={262} w={380} h={240} tz={60 + 30 * Math.sin(clamp01(hit) * Math.PI)} s={0.9 + 0.1 * clamp01(span * 1.4) + 0.08 * Math.sin(clamp01(hit) * Math.PI)}>
            <Centered>
              <Extrude
                text={String(count)}
                size={250}
                depth={34}
                layers={18}
                glow={0.34 + 0.24 * hit}
                sheen={sheen > 0 && sheen < 1 ? sheen : -1}
                fade={clamp01(span * 1.6)}
              />
            </Centered>
          </G3>
          <G3 x={232} y={420} w={380} h={56} tz={40} ty={(1 - ppl) * 20}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: clamp01(ppl * 1.6), ...txt(48, 700, { color: "#FFFFFF" }) }}>
              personas
            </div>
          </G3>
          <G3 x={232} y={490} w={380} h={64} tz={50} ty={(1 - pill) * 24} s={0.8 + 0.2 * pill + 0.08 * Math.sin(clamp01(waHit) * Math.PI)}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: clamp01(pill * 1.6) }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 24px 10px 16px",
                  borderRadius: 999,
                  background: C.wa,
                  boxShadow: `0 10px 24px rgba(0,0,0,0.45), 0 0 ${30 * waHit}px rgba(37,211,102,0.8)`,
                }}
              >
                <Icon name="ri:whatsapp-fill" size={38} color={C.waInk} />
                <div style={{ ...txt(32, 700, { color: C.waInk, letterSpacing: "-0.01em" }) }}>clic en WhatsApp</div>
              </div>
            </div>
          </G3>
        </G3>
      </Obj>
    </Layer>
  );
};
