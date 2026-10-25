import React from "react";
import { useCurrentFrame } from "remotion";
import { Toast } from "../components/Bits";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { GLASS, HeatPage, Pill } from "../components/Misc";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen } from "../components/Screens";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS, GOLD_GRAD } from "../theme";
import icons from "../data/icons.json";
import { GLOW_MINE, Label, LABEL_Y, MINE } from "./P1";
import { P5A_END, P5aStage } from "./P5a";

// P5b - "Detrás de mis páginas vos me tenés a mí, que yo sé de anuncios, yo sé de funnels, yo sé de SEO, yo sé de
// ventas. Yo sé realmente cómo hacer unas páginas que convierten más. Yo sé cómo incluso medir la información, ver qué
// gente está entrando en la página para ir optimizando, para que a vos te traiga más clientes."
// My page (left) and Joaquín; Joaquín's four skills arch over Joaquín's head; the vidriería's contacts per month (GA4, 21-oct pull:
// Jul 13, Aug 47, Sep 65, Oct 68 by the 21st); a board for the measuring (heat map, recordings, a better block); then
// clients writing.
const ID = "P5b";
export const P5B_END = 15.767;

const SKILLS: { w: number; text: string; icon: keyof typeof icons; x: number; y: number; ry: number }[] = [
  { w: 13, text: "Anuncios", icon: "solar:volume-loud-bold-duotone", x: 232, y: 340, ry: 18 },
  { w: 17, text: "Funnels", icon: "solar:filter-bold-duotone", x: 402, y: 196, ry: 8 },
  { w: 21, text: "SEO", icon: "solar:magnifer-bold-duotone", x: 678, y: 196, ry: -8 },
  { w: 25, text: "Ventas", icon: "solar:dollar-minimalistic-bold-duotone", x: 848, y: 340, ry: -18 },
];
const MONTHS = [
  { m: "Jul", v: 13 },
  { m: "Ago", v: 47 },
  { m: "Sep", v: 65 },
  { m: "Oct", v: 68 },
];
const TOASTS = ["Hola, quiero una cotización", "¿Pueden venir a medir?", "Vi su página, ¿precio?"];

// The three messages at the end (P5c starts from them and throws them away).
export const P5bToasts: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  const tst = TOASTS.map((_, i) => sp(t, cue(ID, 58, -0.15 + i * 0.22), SNAP));
  return (
    <>
      {TOASTS.map((m, i) => {
        const a = tst[i];
        if (a <= 0) return null;
        const n = tst.slice(i + 1).reduce((acc, v) => acc + v, 0);
        return (
          <Obj key={i} opacity={clamp01(a * 2) * (1 - exit)} z={20 + i} blur={exit * 6}>
            <G3
              x={330 - (1 - a) * 50}
              y={580 - n * 104 + (1 - a) * 60 - exit * (240 + i * 30)}
              w={470}
              h={116}
              tz={120 - n * 70 + exit * 160}
              s={(0.86 - n * 0.035) * (0.62 + 0.38 * a)}
              rx={lerp(-24, 6, a)}
              ry={10}
            >
              <Toast msg={m} />
            </G3>
          </Obj>
        );
      })}
    </>
  );
};

export const P5b: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const prevOut = ramp(t, 1.56, 1.95, 0, 1, easeIn);
  const ph = sp(t, cue(ID, 2, -0.1)); // "mis páginas"
  const phOut = ramp(t, cue(ID, 9, 0.0), cue(ID, 9, 0.35), 0, 1, easeIn); // "que yo sé"
  const me = sp(t, cue(ID, 5, -0.08), SNAP); // "me tenés a mí"
  const meOut = ramp(t, cue(ID, 26, -0.1), cue(ID, 26, 0.25), 0, 1, easeIn); // "yo sé realmente"
  const sk = SKILLS.map((s) => sp(t, cue(ID, s.w, -0.1), SNAP));
  const skOut = meOut;
  const chart = sp(t, cue(ID, 28, -0.05), SNAP); // "realmente"
  const grow = ramp(t, cue(ID, 33, -0.15), cue(ID, 35, 0.15), 0, 1, easeOut); // "que convierten más"
  const chartOut = ramp(t, cue(ID, 37, -0.2), cue(ID, 37, 0.1), 0, 1, easeIn);
  const bIn = sp(t, cue(ID, 37, -0.08), { damping: 18, stiffness: 120 }); // "yo sé cómo incluso medir"
  const bOut = ramp(t, cue(ID, 54, -0.34), cue(ID, 54, 0.02), 0, 1, easeIn); // "para que a vos"
  const heat = ramp(t, cue(ID, 40, -0.1), cue(ID, 42, 0.2), 0, 1, (x) => x); // "medir la información"
  const replay = ramp(t, cue(ID, 43, -0.05), cue(ID, 50, 0.1), 0, 1, (x) => x); // "ver qué gente está entrando"
  const better = ramp(t, cue(ID, 53, -0.1), cue(ID, 53, 0.25)); // "optimizando"
  const c1 = sp(t, cue(ID, 40, -0.1), SNAP);
  const c2 = sp(t, cue(ID, 43, -0.08), SNAP);
  const c3 = sp(t, cue(ID, 53, -0.1), SNAP);
  const back = sp(t, cue(ID, 54, -0.1)); // my page again, "para que a vos te traiga más clientes"
  const bob = Math.sin(t * 1.25) * 5;

  return (
    <>
      <Layer on="back">
        <P5aStage t={P5A_END} exit={prevOut} />

        {/* my page */}
        <Obj opacity={clamp01(ph * 1.4) * (1 - phOut)} blur={phOut * 5}>
          <Phone3D {...MINE} tone="gold" tx={(1 - ph) * -260} tz={(1 - ph) * -500 - phOut * 300} ry={lerp(62, MINE.ry, ph)} ty={bob} glow={GLOW_MINE}>
            <PremiumScreen />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01(ph * 1.5) * (1 - phOut)}>
          <Label x={MINE.x} y={LABEL_Y} text="MI PÁGINA" color={C.gold} k={ph} glow />
        </Obj>

        {/* "me tenés a mí": Joaquín's name over Joaquín's head, the skills arch around it */}
        <Obj opacity={clamp01(me * 1.6) * (1 - meOut)}>
          <G3 x={540} y={520} w={420} h={150} tz={40} ty={(1 - me) * 30}>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ ...txt(54, 800, { backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }) }}>
                Joaquín
              </div>
              <div style={{ transform: `translateY(${Math.sin(t * 6) * 6}px)` }}>
                <Icon name="solar:double-alt-arrow-down-bold-duotone" size={56} color={C.gold} />
              </div>
            </div>
          </G3>
        </Obj>
        {SKILLS.map((s, i) => (
          <Obj key={i} opacity={clamp01(sk[i] * 1.6) * (1 - skOut)} blur={skOut * 4}>
            <G3 x={s.x} y={s.y} w={340} h={100} tz={(1 - sk[i]) * -200} rx={(1 - sk[i]) * 60} ry={s.ry} s={1 - 0.2 * skOut}>
              <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Pill icon={s.icon} text={s.text} tone="gold" size={45} />
              </div>
            </G3>
          </Obj>
        ))}

        {/* pages that convert: the vidriería's contacts per month */}
        <Obj opacity={clamp01(chart * 1.6) * (1 - chartOut)}>
          <G3 x={540} y={330} w={640} h={420} tz={(1 - chart) * -300} rx={8} ry={lerp(-8, 6, ramp(t, 7, 9.6, 0, 1, (x) => x))}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 36,
                background: "linear-gradient(160deg,#122B57 0%,#0A1E3F 50%,#071630 100%)",
                border: "2px solid rgba(245,168,60,0.5)",
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
                padding: "30px 40px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="ri:whatsapp-fill" size={44} color={C.wa} />
                <div style={{ ...txt(38, 700, { color: "#FFFFFF" }) }}>Contactos por mes</div>
                <div style={{ marginLeft: "auto", opacity: grow }}>
                  <Icon name="solar:graph-new-up-bold-duotone" size={52} color={C.gold} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 34, height: 230, marginTop: 24 }}>
                {MONTHS.map((m, i) => {
                  const g = clamp01(grow * 1.6 - i * 0.2);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ ...txt(32, 800, { color: i === 3 ? C.gold : "#FFFFFF", opacity: g }) }}>{Math.round(m.v * g)}</div>
                      <div
                        style={{
                          width: "100%",
                          height: Math.max(6, (m.v / 68) * 160 * g),
                          borderRadius: 12,
                          background: i === 3 ? "linear-gradient(180deg,#FFE2A6,#F5A83C)" : "linear-gradient(180deg,#F5A83C,#B8741E)",
                        }}
                      />
                      <div style={{ ...txt(28, 600, { color: "rgba(255,255,255,0.7)" }) }}>{m.m}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </G3>
        </Obj>

        {/* back to my page: clients writing */}
        <Obj opacity={clamp01(back * 1.4)}>
          <Phone3D {...MINE} tone="gold" tx={(1 - back) * -260} tz={(1 - back) * -500} ry={lerp(62, MINE.ry, back)} ty={bob} glow={GLOW_MINE}>
            <PremiumScreen pulse={0.5 + 0.5 * Math.sin(t * 9)} />
          </Phone3D>
        </Obj>
        <P5bToasts t={t} />
      </Layer>

      <Layer on="front">
        <Board k={bIn} out={bOut}>
          <Obj>
            <Phone3D x={540} y={690} w={300} tone="gold" glow={0.25} ry={Math.sin(t * 0.8) * 5}>
              <HeatPage heat={heat} replay={replay} better={better} />
            </Phone3D>
          </Obj>
          {[
            { k: c1, icon: "solar:fire-bold-duotone" as const, text: "Mapa de calor", y: 1150 },
            { k: c2, icon: "solar:eye-bold-duotone" as const, text: "Grabaciones de visitas", y: 1252 },
            { k: c3, icon: "solar:graph-new-up-bold-duotone" as const, text: "Mejoras", y: 1354 },
          ].map((c, i) => (
            <Obj key={i} opacity={clamp01(c.k * 1.6)}>
              <G3 x={540} y={c.y} w={700} h={96} ty={(1 - c.k) * 30} rx={(1 - c.k) * -40}>
                <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
                  <Pill icon={c.icon} text={c.text} tone="gold" size={38} />
                </div>
              </G3>
            </Obj>
          ))}
          {/* a small live dot while the recording plays */}
          <Obj opacity={replay > 0 && replay < 1 ? 1 : 0}>
            <G3 x={760} y={420} w={150} h={56} tz={120}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: GLASS,
                  border: "2px solid rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  ...txt(26, 700, { color: "#FFFFFF", letterSpacing: "0.04em" }),
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 8, background: "#FF3B30", opacity: 0.5 + 0.5 * Math.sin(t * 10) }} />
                REC
              </div>
            </G3>
          </Obj>
        </Board>
      </Layer>
    </>
  );
};
