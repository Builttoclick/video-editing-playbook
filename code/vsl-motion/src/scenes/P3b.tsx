import React from "react";
import { useCurrentFrame } from "remotion";
import { CheckBadge } from "../components/Bits";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Phone3D } from "../components/Phone3D";
import { BuildScreen, CARD_H, CARD_W, ProposalCard, STYLES, Style } from "../components/Proposals";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS, GOLD_GRAD } from "../theme";
import { P3A_END, P3aStage } from "./P3a";

// P3b - "Yo opero de una forma totalmente diferente. Yo lo que armo son tres propuestas gráficas... te envío eso a vos
// como cliente, vos vas a elegir la línea visual que más te guste. Vamos a ajustar esa parte visual hasta que a vos te
// convenza y luego ya empezamos a armar la estructura de la página... con tus logos y con tus colores."
// The middle is a full-screen board (the three proposals, sent by WhatsApp, the pick); the chosen one leaves the board,
// gets adjusted above Joaquín's head, and becomes the page that builds itself.
const ID = "P3b";
export const P3B_END = 18.433;
const CHOSEN = 1;
const ROW = [
  { x: 198, ry: 16, rz: -3 },
  { x: 540, ry: 0, rz: 0 },
  { x: 882, ry: -16, rz: 3 },
];
const ROW_Y = 960;
const CARD_S = 1.15; // cards on the board
const SEND_S = 0.56; // cards inside the WhatsApp bubble
const PICK_S = CARD_S * 1.12; // the chosen one
const TOP = { x: 540, y: 352, s: 0.62 };
const PHONE = { x: 540, y: 430, w: 280 };

const mixHex = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

// The page building itself, at second t of P3b (P3c starts from its last frame).
export const BuildStage: React.FC<{ t: number }> = ({ t }) => {
  const appear = ramp(t, cue(ID, 50, -0.05), cue(ID, 50, 0.4), 0, 1, easeOut); // "y luego"
  if (appear <= 0) return null;
  const blocks = [55, 57, 60, 62, 63].reduce((acc, i) => acc + sp(t, cue(ID, i, -0.05), { damping: 15, stiffness: 150 }), 0);
  const type = ramp(t, cue(ID, 65, -0.05), cue(ID, 65, 0.3));
  const logo = sp(t, cue(ID, 69, -0.08), { damping: 10, stiffness: 200, mass: 0.6 });
  const color = ramp(t, cue(ID, 73, -0.2), cue(ID, 73, 0.32), 0, 1, (x) => x);
  const st = STYLES[CHOSEN];
  const toolA = sp(t, cue(ID, 57, -0.05), SNAP);
  const toolB = sp(t, cue(ID, 73, -0.15), SNAP);
  const bob = Math.sin(t * 1.2) * 5;
  return (
    <>
      <Obj opacity={appear}>
        <Phone3D
          x={PHONE.x}
          y={PHONE.y}
          w={PHONE.w}
          tone="gold"
          ty={(1 - appear) * 40 + bob}
          tz={(1 - appear) * -200}
          ry={lerp(-14, 6, ramp(t, 13.2, 18.4, 0, 1, (x) => x))}
          glow={0.32}
        >
          <BuildScreen st={st} blocks={blocks} type={type} logo={logo} color={color} />
        </Phone3D>
      </Obj>
      {/* two tool bubbles: the structure on "estructura", the colours on "colores" */}
      <Obj opacity={clamp01(toolA * 1.5)}>
        <G3 x={268} y={300} w={110} h={110} tz={60} s={0.6 + 0.4 * toolA} ry={16}>
          <ToolBubble icon="solar:ruler-pen-bold-duotone" />
        </G3>
      </Obj>
      <Obj opacity={clamp01(toolB * 1.5)}>
        <G3 x={812} y={300} w={110} h={110} tz={60} s={0.6 + 0.4 * toolB} ry={-16}>
          <ToolBubble icon="solar:palette-bold-duotone" />
        </G3>
      </Obj>
    </>
  );
};

const ToolBubble: React.FC<{ icon: "solar:ruler-pen-bold-duotone" | "solar:palette-bold-duotone" }> = ({ icon }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 55,
      background: "radial-gradient(circle at 35% 30%,#1A2C52 0%,#0A1730 75%)",
      border: "2.5px solid rgba(245,168,60,0.85)",
      boxShadow: "0 16px 30px rgba(0,0,0,0.5), 0 0 14px rgba(245,168,60,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon name={icon} size={58} color={C.gold} />
  </div>
);

export const P3b: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  // P3a's deck leaves on "opero"
  const deckOut = ramp(t, 1.52, 2.02, 0, 1, easeIn);

  // the board
  const bIn = sp(t, cue(ID, 10, -0.1), { damping: 18, stiffness: 115 }); // "armo"
  const bOut = ramp(t, cue(ID, 38, -0.32), cue(ID, 38, 0.06), 0, 1, easeIn); // "vamos"
  const head = sp(t, cue(ID, 12, -0.05), SNAP); // "3 propuestas"
  const pop = ramp(t, cue(ID, 16, -0.05), cue(ID, 16, 0.75), 0, 1, (x) => x);
  const send = sp(t, cue(ID, 21, -0.05), { damping: 16, stiffness: 140 }); // "envío"
  const read = ramp(t, cue(ID, 26, -0.1), cue(ID, 26, 0.1)); // "cliente": blue double check
  const unsend = ramp(t, cue(ID, 27, -0.12), cue(ID, 27, 0.2), 0, 1, easeOut); // "vos vas a elegir"
  const sendK = send * (1 - unsend);
  const cursorK = ramp(t, cue(ID, 30, -0.45), cue(ID, 30, -0.02), 0, 1, easeOut);
  const tap = ramp(t, cue(ID, 30, 0.0), cue(ID, 30, 0.45), 0, 1, (x) => x);
  const chosen = sp(t, cue(ID, 30, 0.04), SNAP);
  const tagK = sp(t, cue(ID, 32, -0.05), SNAP); // "línea visual"
  const heart = ramp(t, cue(ID, 37, -0.1), cue(ID, 37, 0.45));

  // the chosen card leaves the board and goes above Joaquín's head
  const lift = sp(t, cue(ID, 38, -0.55), { damping: 18, stiffness: 105 });
  const adjust = sp(t, cue(ID, 40, -0.1), SNAP); // "ajustar"
  const revs = [cue(ID, 40, 0.05), cue(ID, 43, 0.0), cue(ID, 46, 0.0)].map((a) => sp(t, a, SNAP));
  const accentK = ramp(t, cue(ID, 41, 0), cue(ID, 43, 0.1));
  const ok = sp(t, cue(ID, 49, -0.05), SNAP); // "convenza"
  const toPhone = ramp(t, cue(ID, 50, -0.08), cue(ID, 50, 0.32), 0, 1, easeIn); // "y luego": card becomes the page
  const st: Style = { ...STYLES[CHOSEN], accent: mixHex(STYLES[CHOSEN].accent, "#1F4F38", accentK) };

  const cardInBoard = (i: number) => {
    const k = sp(t, cue(ID, 12, 0.05 + i * 0.17), { damping: 15, stiffness: 120 });
    if (i === CHOSEN && lift > 0.001) return null; // from here the outside copy carries it
    const r = ROW[i];
    const isC = i === CHOSEN;
    const dimK = isC ? 0 : chosen;
    const sx = lerp(r.x, 540 + (i - 1) * 262, sendK);
    const sy = lerp(ROW_Y, 900, sendK);
    return (
      <Obj key={i} opacity={clamp01(k * 1.6) * (1 - 0.62 * dimK)}>
        <G3
          x={sx}
          y={sy}
          w={CARD_W}
          h={CARD_H}
          tz={(1 - k) * -420 + (isC ? 140 * chosen : -110 * dimK)}
          ry={lerp(r.ry + (1 - k) * (i === 0 ? 60 : i === 2 ? -60 : 0), 0, sendK)}
          rx={(1 - k) * 30}
          rz={lerp(r.rz, 0, sendK)}
          s={lerp(CARD_S, SEND_S, sendK) * (isC ? 1 + 0.12 * chosen : 1)}
        >
          <ProposalCard st={STYLES[i]} chosen={isC ? chosen : 0} heart={isC ? heart : 0} pop={pop} />
        </G3>
      </Obj>
    );
  };

  // outside copy of the chosen card: same camera as the board, so the hand-off is invisible
  const cx = lerp(ROW[CHOSEN].x, TOP.x, lift);
  const cy = lerp(ROW_Y, TOP.y, lift);
  const cs = lerp(PICK_S, TOP.s, lift) * (1 - 0.25 * toPhone);

  return (
    <>
      <Layer on="back">
        <P3aStage t={P3A_END} exit={deckOut} />
        <BuildStage t={t} />
      </Layer>

      <Layer on="front">
        <Board k={bIn} out={bOut}>
          <Obj opacity={clamp01(head * 1.5) * (1 - sendK * 0.6)}>
            <G3 x={540} y={380} w={900} h={120} ty={(1 - head) * 30}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <div style={{ ...txt(110, 800, { backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }) }}>3</div>
                <div style={{ ...txt(66, 700, { color: "#FFFFFF" }) }}>propuestas de diseño</div>
              </div>
            </G3>
          </Obj>

          {/* the WhatsApp bubble they go out in */}
          <Obj opacity={clamp01(sendK * 1.6)}>
            <G3 x={540} y={900} w={880} h={600} s={0.85 + 0.15 * sendK}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "34px 34px 10px 34px",
                  background: "#005C4B",
                  boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
                }}
              />
              <div style={{ position: "absolute", right: 22, bottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ ...txt(24, 500, { color: "rgba(255,255,255,0.7)", letterSpacing: 0 }) }}>10:42</div>
                <Icon name="solar:check-read-linear" size={34} color={read > 0.5 ? "#53BDEB" : "rgba(255,255,255,0.7)"} />
              </div>
            </G3>
          </Obj>

          {[0, 1, 2].map((i) => cardInBoard(i))}

          {/* the client's tap */}
          <Obj opacity={clamp01(cursorK * 2) * (1 - clamp01((t - cue(ID, 30, 0.6)) * 3))} z={60}>
            <G3 x={lerp(840, 600, cursorK)} y={lerp(1450, 1030, cursorK)} w={90} h={90} tz={260} s={1 - 0.12 * Math.sin(clamp01(tap * 2) * Math.PI)}>
              {tap > 0 && tap < 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: -60 * tap - 10,
                    top: -60 * tap - 10,
                    width: 110 + 120 * tap,
                    height: 110 + 120 * tap,
                    borderRadius: "50%",
                    border: `4px solid rgba(255,255,255,${0.8 * (1 - tap)})`,
                  }}
                />
              )}
              <Icon name="solar:cursor-bold-duotone" size={90} color="#FFFFFF" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.5))" }} />
            </G3>
          </Obj>

          <Obj opacity={clamp01(tagK * 1.6) * (1 - lift)}>
            <G3 x={540} y={1352} w={360} h={90} ty={(1 - tagK) * 24}>
              <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 28px 12px 16px",
                    borderRadius: 999,
                    background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
                    border: "2.5px solid rgba(245,168,60,0.9)",
                  }}
                >
                  <CheckBadge k={tagK} tone="gold" size={54} />
                  <div style={{ ...txt(40, 700, { color: "#FFFFFF" }) }}>Elegida</div>
                </div>
              </div>
            </G3>
          </Obj>
        </Board>

        {/* the chosen design, outside the board: rides up, gets adjusted, then turns into the page */}
        {lift > 0.001 && toPhone < 0.999 && (
          <Obj opacity={1 - toPhone} z={70}>
            <G3 x={cx} y={cy} w={CARD_W} h={CARD_H} tz={lerp(140, 40, lift)} s={cs} ry={Math.sin(t * 0.9) * 3 * lift}>
              <ProposalCard st={st} chosen={Math.max(chosen, ok)} heart={heart < 1 ? heart : 0} />
            </G3>
          </Obj>
        )}
        {/* adjustment rounds and the approval */}
        <Obj opacity={clamp01(adjust * 1.5) * (1 - toPhone)}>
          <G3 x={262} y={300} w={150} h={300} tz={40} ry={14} s={0.7 + 0.3 * adjust}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 30,
                background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
                border: "2px solid rgba(255,255,255,0.16)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                boxShadow: "0 18px 36px rgba(0,0,0,0.5)",
              }}
            >
              <Icon name="solar:palette-bold-duotone" size={46} color="rgba(255,255,255,0.85)" />
              {[STYLES[CHOSEN].accent, "#24573F", STYLES[CHOSEN].alt].map((c, j) => (
                <div
                  key={j}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    background: c,
                    border: `3px solid rgba(255,255,255,${j === 1 ? 0.25 + 0.7 * accentK : 0.3})`,
                    transform: `scale(${j === 1 ? 1 + 0.25 * Math.sin(accentK * Math.PI) : 1})`,
                  }}
                />
              ))}
            </div>
          </G3>
        </Obj>
        {revs.map((k, j) => (
          <Obj key={j} opacity={clamp01(k * 1.6) * (1 - toPhone)}>
            <G3 x={820} y={190 + j * 92} w={170} h={70} tz={40} ry={-14} ty={(1 - k) * 20}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "linear-gradient(180deg,rgba(14,22,40,0.92),rgba(5,10,22,0.9))",
                  border: `2px solid ${j === 2 && ok > 0.05 ? "rgba(245,168,60,0.9)" : "rgba(255,255,255,0.18)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  ...txt(34, 700, { color: "#FFFFFF", letterSpacing: "-0.01em" }),
                }}
              >
                <Icon name="solar:pen-new-square-bold-duotone" size={34} color={j === 2 && ok > 0.05 ? C.gold : "rgba(255,255,255,0.7)"} />
                {`v${j + 1}`}
              </div>
            </G3>
          </Obj>
        ))}
        <Obj opacity={clamp01(ok * 1.6) * (1 - toPhone)} z={80}>
          <G3 x={540} y={562} w={380} h={90} tz={120} s={0.7 + 0.3 * ok}>
            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 28px 12px 16px",
                  borderRadius: 999,
                  background: "linear-gradient(180deg,rgba(14,22,40,0.94),rgba(5,10,22,0.92))",
                  border: "2.5px solid rgba(245,168,60,0.9)",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
                }}
              >
                <CheckBadge k={ok} tone="gold" size={54} />
                <div style={{ ...txt(40, 700, { color: "#FFFFFF" }) }}>Aprobada</div>
              </div>
            </div>
          </G3>
        </Obj>
      </Layer>
    </>
  );
};
