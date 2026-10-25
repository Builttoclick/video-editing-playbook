import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Extrude } from "../components/Bits";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj } from "../components/base";
import { DownArrows, FormCard } from "../components/Misc";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";
import { Centered } from "./P1";

// P8a - "Bueno, Joaquín, ya me convenciste. ¿Qué tengo que hacer para trabajar contigo? Yo acá abajo te voy a dejar un
// formulario, vos tenés que llenar nomás algunos datos de tu negocio, te voy a pedir tu nombre, te voy a pedir el nombre
// de tu negocio, te voy a pedir tu nicho, incluso si es que me puedes dejar algún perfil en las redes. Yo lo que voy a
// hacer es voy a agarrar toda esa información, voy a hacer una búsqueda global de qué es lo que vos tenés en el Internet
// sobre tu negocio."
// Joaquín cut 11.4-11.767 out of this take (a pause after "nicho"): nothing happens in that gap.
// A 3D "?" behind Joaquín's head; arrows down on "acá abajo"; a board with the landing's own form, typed on Joaquín's words; the
// form leaves the board and becomes a global search: the places where a business lives online light up.
const ID = "P8a";
export const P8A_END = 20.467;
const GLOBE = { x: 540, y: 330 };
const LOGOS: { src: string; w: number; at: number }[] = [
  { src: "google_G.svg", w: 86, at: cue(ID, 81, -0.1) }, // "búsqueda"
  { src: "google-maps_pin.svg", w: 62, at: cue(ID, 82, -0.1) }, // "global"
  { src: "instagram_icono-2022.svg", w: 86, at: cue(ID, 84, -0.05) },
  { src: "whatsapp_icono.svg", w: 86, at: cue(ID, 87, -0.05) },
  { src: "chatgpt_simbolo-2025.svg", w: 74, at: cue(ID, 89, -0.05) },
];

export const P8aGlobe: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  const g = sp(t, cue(ID, 77, -0.1), { damping: 15, stiffness: 120 }); // "voy a hacer una búsqueda global"
  if (g <= 0.001 || exit >= 0.999) return null;
  const found = ramp(t, cue(ID, 90, -0.05), cue(ID, 92, 0.25)); // "en el Internet"
  const spin = t * 50;
  return (
    <>
      <Obj opacity={clamp01(g * 1.5) * (1 - exit)} blur={exit * 6}>
        <G3 x={GLOBE.x} y={GLOBE.y} w={250} h={250} tz={(1 - g) * -300 - exit * 300} s={0.7 + 0.3 * g}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 125,
              background: "radial-gradient(circle at 35% 30%,#1E3A6B 0%,#0A1E3F 60%,#06142C 100%)",
              border: "3px solid rgba(245,168,60,0.85)",
              boxShadow: "0 24px 50px rgba(0,0,0,0.5), 0 0 18px rgba(245,168,60,0.22)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="solar:global-bold-duotone" size={170} color={C.gold} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "conic-gradient(from 0deg, rgba(255,213,138,0.55), rgba(255,213,138,0) 25%, rgba(255,213,138,0) 100%)",
                transform: `rotate(${(t * 220) % 360}deg)`,
                mixBlendMode: "screen",
              }}
            />
          </div>
        </G3>
      </Obj>
      {LOGOS.map((l, i) => {
        const k = sp(t, l.at, SNAP);
        if (k <= 0) return null;
        const ang = ((i / LOGOS.length) * 360 + spin) * (Math.PI / 180);
        const x = GLOBE.x + Math.cos(ang) * 330;
        const y = GLOBE.y + Math.sin(ang) * 120;
        const z = Math.sin(ang) * 140;
        const ok = clamp01(found * 1.5 - i * 0.12);
        return (
          <Obj key={i} opacity={clamp01(k * 1.6) * (1 - exit)} z={z > 0 ? 30 : 5}>
            <G3 x={x} y={y} w={120} h={120} tz={z} s={(0.6 + 0.4 * k) * (0.85 + 0.15 * (z / 140))}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 32,
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 16px 30px rgba(0,0,0,0.45)",
                }}
              >
                <Img src={staticFile(l.src)} style={{ width: l.w, height: l.w, objectFit: "contain" }} />
              </div>
              {ok > 0 && (
                <div style={{ position: "absolute", right: -12, top: -12, transform: `scale(${ok})` }}>
                  <Icon name="solar:check-circle-bold" size={46} color={C.wa} />
                </div>
              )}
            </G3>
          </Obj>
        );
      })}
    </>
  );
};

export const P8a: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const q = sp(t, cue(ID, 5, -0.1), { damping: 12, stiffness: 160, mass: 0.7 }); // "¿qué tengo que hacer"
  const qOut = ramp(t, cue(ID, 12, -0.05), cue(ID, 12, 0.3), 0, 1, easeIn); // "yo acá abajo"
  const arrows = ramp(t, cue(ID, 13, -0.1), cue(ID, 13, 0.2)) * (1 - ramp(t, cue(ID, 25, 0), cue(ID, 25, 0.4))); // "acá abajo" until "nomás"
  const bIn = sp(t, cue(ID, 20, -0.15), { damping: 18, stiffness: 120 }); // "formulario"
  const fields = [
    { label: "Tu nombre", value: "Carlos Benítez", k: ramp(t, cue(ID, 35, -0.05), cue(ID, 36, 0.3), 0, 1, (x) => x) },
    { label: "Nombre del negocio", value: "Constructora Altura", k: ramp(t, cue(ID, 41, -0.05), cue(ID, 45, 0.22), 0, 1, (x) => x) },
    { label: "¿Qué vendés?", value: "Casas de alta gama", k: ramp(t, cue(ID, 50, -0.05), cue(ID, 51, 0.22), 0, 1, (x) => x) },
    { label: "Instagram o página", value: "@constructoraaltura", k: ramp(t, cue(ID, 59, -0.05), cue(ID, 63, 0.2), 0, 1, (x) => x) },
  ];
  const send = ramp(t, cue(ID, 63, 0.25), cue(ID, 66, 0.1)); // after "redes"
  const pack = sp(t, cue(ID, 70, -0.1), { damping: 18, stiffness: 110 }); // "es voy a agarrar": the form packs up
  const bOut = ramp(t, cue(ID, 73, -0.25), cue(ID, 73, 0.12), 0, 1, easeIn); // "agarrar"
  const packOut = ramp(t, cue(ID, 77, -0.1), cue(ID, 77, 0.25), 0, 1, easeOut); // the globe takes over
  const sheen = ramp(t, cue(ID, 8, -0.05), cue(ID, 8, 0.6), 0, 1, easeOut);

  return (
    <>
      <Layer on="back">
        {/* the question, behind Joaquín's head */}
        <Obj opacity={clamp01(q * 1.6) * (1 - qOut)} blur={qOut * 6}>
          <G3 x={540} y={560} w={300} h={340} tz={(1 - q) * -260 - qOut * 300} rx={(1 - q) * 70} ry={Math.sin(t * 1.3) * 10}>
            <Centered>
              <Extrude text="?" size={320} depth={44} layers={20} glow={0.3} sheen={sheen > 0 && sheen < 1 ? sheen : -1} />
            </Centered>
          </G3>
        </Obj>
        <P8aGlobe t={t} />
      </Layer>

      <Layer on="front">
        {/* the form, on a board */}
        <Board k={bIn} out={bOut}>
          {pack < 0.02 && (
            <Obj>
              <G3 x={540} y={830} w={860} h={900}>
                <FormCard fields={fields} send={send} />
              </G3>
            </Obj>
          )}
        </Board>
        {/* the form packs up and rides to where the search will be (outside the board, same camera) */}
        {pack >= 0.02 && packOut < 0.999 && (
          <Obj opacity={1 - packOut} z={70}>
            <G3 x={540} y={lerp(830, GLOBE.y, pack)} w={860} h={900} s={lerp(1, 0.22, pack) * (1 - 0.4 * packOut)} rz={pack * -6}>
              <FormCard fields={fields} send={send} />
            </G3>
          </Obj>
        )}
        {/* "acá abajo": arrows at the very bottom, where the form is on the page */}
        <Obj opacity={arrows}>
          <G3 x={540} y={1735} w={200} h={240}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <DownArrows t={t} k={1} size={110} />
            </div>
          </G3>
        </Obj>
      </Layer>
    </>
  );
};
