import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Extrude, Toast } from "../components/Bits";
import { G3, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { PremiumScreen, TemplateScreen } from "../components/Screens";
import { cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS, SILVER_GRAD } from "../theme";

// P1 - Apertura. "Yo soy Joaquín Caballero, de Built to Click... la diferencia entre una página web promedio paraguaya
// y una página web que yo hago... todo se nota en la cantidad de gente que te escribe al final."
const ID = "P1";

// The two phones that carry the whole comparison (same spots at the start of P2a).
// Joaquín's call (24-oct): the average page lives on the RIGHT of the screen, where Joaquín's hands point; mine on the LEFT.
export const AVG = { x: 865, y: 405, w: 280, ry: -26 };
export const MINE = { x: 215, y: 405, w: 280, ry: 26 };
export const LABEL_Y = 58;
export const P1_END = 11.467;

const TOASTS = [
  { at: cue(ID, 41), msg: "Hola, quiero una cotización" },
  { at: cue(ID, 43, 0.06), msg: "¿Hacen envíos a Luque?" },
  { at: cue(ID, 46), msg: "Buenas, ¿qué precio tiene?" },
  { at: cue(ID, 48), msg: "Quiero info, por favor" },
  { at: cue(ID, 51), msg: "¿Atienden hoy?" },
  { at: cue(ID, 52, 0.04), msg: "Hola, vi su página" },
];

// The WhatsApp messages: each new one pops into the bottom slot and pushes the older ones up and back.
export const ToastStack: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => (
  <>
    {TOASTS.map((ts, i) => {
      const a = sp(t, ts.at, SNAP);
      if (a <= 0) return null;
      const n = TOASTS.slice(i + 1).reduce((acc, o) => acc + sp(t, o.at, { damping: 18, stiffness: 140 }), 0);
      const x = 322 - (1 - a) * 50;
      const y = 600 - n * 102 + (1 - a) * 70 - exit * (260 + i * 30);
      const z = 120 - n * 70 - (1 - a) * 90 + exit * 160;
      const sc = (0.86 - n * 0.035) * (0.62 + 0.38 * a);
      const op = Math.min(1, a * 2) * (1 - Math.max(0, n - 3.4) * 0.9) * (1 - exit);
      return (
        <Obj key={i} opacity={op} z={20 + i} blur={exit * 6}>
          <G3 x={x} y={y} w={470} h={116} tz={z} s={sc} rx={lerp(-24, 6, a)} ry={10}>
            <Toast msg={ts.msg} />
          </G3>
        </Obj>
      );
    })}
  </>
);

// Glow levels for my (gold) phone: toned down on 24-oct ("no le pongas tanto glow").
export const GLOW_MINE = 0.55;
export const GLOW_BURST = 0.2;

export const P1: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  // ---- name card ------------------------------------------------------------------------------------------------
  const nIn1 = sp(t, cue(ID, 4, -0.08), SNAP); // JOAQUÍN
  const nIn2 = sp(t, cue(ID, 5, -0.06), SNAP); // CABALLERO
  const lIn = sp(t, cue(ID, 7, -0.1), SNAP); // Built to Click
  const nOut = ramp(t, cue(ID, 19), cue(ID, 19) + 0.5, 0, 1, easeIn); // "explicar"
  const drift = ramp(t, 1.7, 5, -7, 3, (x) => x);
  const push = ramp(t, 1.7, 5, 1, 1.05, (x) => x);
  const sheen = ramp(t, cue(ID, 9), cue(ID, 9) + 0.75, 0, 1, easeOut);

  // ---- the divide ---------------------------------------------------------------------------------------------
  const beam = ramp(t, cue(ID, 23, -0.05), cue(ID, 23) + 0.42, 0, 1, easeOut);
  const vs = sp(t, cue(ID, 39, -0.05), SNAP);

  // ---- phones -------------------------------------------------------------------------------------------------
  const ap = sp(t, cue(ID, 28, -0.12)); // average page in, on "promedio"
  const mp = sp(t, cue(ID, 35, -0.16)); // mine in, on "que yo hago"
  const burst = ramp(t, cue(ID, 41) - 0.1, cue(ID, 41) + 0.5, 0, 1);
  const bob = (ph: number) => Math.sin(t * 1.25 + ph) * 6;
  const labA = sp(t, cue(ID, 28, 0.18), SNAP);
  const labM = sp(t, cue(ID, 36, 0.0), SNAP);

  return (
    <Layer on="back">
      {/* name card: sits on the wall, Joaquín's head passes in front of CABALLERO. Opacity lives on the flat wrappers so
          the extrusion keeps its depth while it fades. */}
      <Obj opacity={(1 - nOut) * Math.min(1, lIn * 1.6)} blur={nOut * 9}>
        <G3 x={540} y={342} w={480} h={100} tz={-nOut * 520 + (1 - lIn) * -120} rx={(1 - lIn) * -88} ry={drift} s={push}>
          <Img src={staticFile("lockup-horizontal-blanco.svg")} style={{ width: 430, position: "absolute", left: 25, top: 7 }} />
        </G3>
      </Obj>
      <Obj opacity={(1 - nOut) * Math.min(1, nIn1 * 1.5)} blur={nOut * 9}>
        <G3 x={540} y={486} w={1000} h={160} tz={-nOut * 520 + (1 - nIn1) * -220} rx={(1 - nIn1) * 82} ry={drift} s={push}>
          <Centered>
            <Extrude
              text="JOAQUÍN"
              size={150}
              face={SILVER_GRAD}
              side={["#8C93A1", "#20242C"]}
              glow={0.22}
              glowRgb="255,255,255"
              sheen={sheen > 0 && sheen < 1 ? sheen : -1}
            />
          </Centered>
        </G3>
      </Obj>
      <Obj opacity={(1 - nOut) * Math.min(1, nIn2 * 1.5)} blur={nOut * 9}>
        <G3 x={540} y={642} w={1000} h={160} tz={-nOut * 520 + (1 - nIn2) * -220} rx={(1 - nIn2) * 82} ry={drift} s={push}>
          <Centered>
            <Extrude text="CABALLERO" size={150} glow={0.38} sheen={sheen > 0 && sheen < 1 ? sheen : -1} />
          </Centered>
        </G3>
      </Obj>

      {/* the divide: a beam of light between the two sides, VS on "diferencias" */}
      <Obj opacity={beam * (1 - 0.45 * burst)}>
        <div
          style={{
            position: "absolute",
            left: 538,
            top: 70,
            width: 4,
            height: 520 * beam,
            borderRadius: 2,
            background: "linear-gradient(180deg,rgba(255,213,138,0) 0%,rgba(255,213,138,0.9) 25%,rgba(245,168,60,0.85) 75%,rgba(245,168,60,0) 100%)",
            boxShadow: "0 0 14px 2px rgba(245,168,60,0.28)",
          }}
        />
      </Obj>
      <Obj opacity={Math.min(1, vs * 1.5) * (1 - 0.6 * burst)}>
        <G3 x={540} y={318} w={120} h={120} s={0.6 + 0.4 * vs} rx={(1 - vs) * 70}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 60,
              background: "radial-gradient(circle at 35% 30%,#183463 0%,#0A1E3F 60%,#06142C 100%)",
              border: "3px solid rgba(245,168,60,0.9)",
              boxShadow: "0 0 16px rgba(245,168,60,0.25), 0 14px 30px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...txt(46, 800, { color: "#FFFFFF", letterSpacing: "-0.02em" }),
            }}
          >
            VS
          </div>
        </G3>
      </Obj>

      {/* right: the average page */}
      <Obj opacity={Math.min(1, ap * 1.4)}>
        <Phone3D
          {...AVG}
          tone="gray"
          tx={(1 - ap) * 280}
          tz={(1 - ap) * -520 - burst * 60}
          ry={lerp(-64, AVG.ry, ap) - burst * 4}
          ty={bob(0)}
          s={1 - burst * 0.04}
          dim={burst * 0.5}
        >
          <TemplateScreen />
        </Phone3D>
      </Obj>
      <Obj opacity={Math.min(1, labA * 1.5) * (1 - burst * 0.5)}>
        <Label x={AVG.x} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.9)" k={labA} />
      </Obj>

      {/* left: my page, and the people writing */}
      <Obj opacity={Math.min(1, mp * 1.4)}>
        <Phone3D
          {...MINE}
          tone="gold"
          tx={(1 - mp) * -280}
          tz={(1 - mp) * -520 + burst * 40}
          ry={lerp(64, MINE.ry, mp) + burst * 6}
          ty={bob(1.7)}
          glow={mp * (GLOW_MINE + GLOW_BURST * burst)}
        >
          <PremiumScreen pulse={burst * (0.6 + 0.4 * Math.sin(t * 9))} />
        </Phone3D>
      </Obj>
      <Obj opacity={Math.min(1, labM * 1.5)}>
        <Label x={MINE.x} y={LABEL_Y} text="MI PÁGINA" color={C.gold} k={labM} glow />
      </Obj>

      <ToastStack t={t} />
    </Layer>
  );
};

export const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", transformStyle: "preserve-3d" }}>{children}</div>
);

export const Label: React.FC<{ x: number; y: number; text: string; color: string; k: number; glow?: boolean }> = ({ x, y, text, color, k, glow }) => (
  <G3 x={x} y={y} w={340} h={60} ty={(1 - k) * 24} rx={(1 - k) * 60}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...txt(36, 800, {
          color,
          letterSpacing: "0.14em",
          textShadow: glow ? "0 0 10px rgba(245,168,60,0.28)" : "0 2px 10px rgba(0,0,0,0.6)",
        }),
      }}
    >
      {text}
    </div>
  </G3>
);
