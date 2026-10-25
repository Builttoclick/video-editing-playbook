import React from "react";
import { useCurrentFrame } from "remotion";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Calendar, ReportCard } from "../components/Misc";
import { clamp01, cue, ramp, SNAP, sp } from "../lib/anim";
import { C, FPS } from "../theme";

// P6c - "Y todos los días mientras armamos la página te envío un reporte: cómo vamos y qué falta y qué yo necesito
// también de tu lado para poder terminar la página."
// A board: the 14 days of the build ticking, and Joaquín's daily report as a WhatsApp message, row by row on Joaquín's words.
// P6d starts from this board (P6Board) and runs the calendar to day 14.
const ID = "P6c";
export const P6C_END = 7.4;

export const P6Board: React.FC<{ done: number; live: number; card: number; cardOut: number; rows: number[] }> = ({
  done,
  live,
  card,
  cardOut,
  rows,
}) => (
  <>
    <Obj>
      <G3 x={540} y={230} w={900} h={80}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Icon name="solar:calendar-mark-bold-duotone" size={58} color={C.gold} />
          <div style={{ ...txt(52, 800, { color: "#FFFFFF" }) }}>14 días</div>
        </div>
      </G3>
    </Obj>
    <Obj>
      <G3 x={540} y={410} w={900} h={210} rx={8}>
        <Calendar done={done} live={live} w={900} />
      </G3>
    </Obj>
    <Obj opacity={clamp01(card * 1.6) * (1 - cardOut)}>
      <G3 x={540} y={900} w={860} h={560} ty={(1 - card) * 80 + cardOut * 120} rx={(1 - card) * -30} s={0.94 + 0.06 * card}>
        <ReportCard day={6} rows={rows} />
      </G3>
    </Obj>
  </>
);

export const p6cState = (t: number) => ({
  done: ramp(t, cue(ID, 1, -0.05), cue(ID, 7, 0.1), 0, 6, (x) => x), // "todos los días mientras armamos la página"
  card: sp(t, cue(ID, 9, -0.12), SNAP), // "te envío un reporte"
  rows: [12, 15, 18].map((i) => sp(t, cue(ID, i, -0.08), SNAP)), // "cómo vamos", "qué falta", "qué yo necesito"
});

export const P6c: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const bIn = sp(t, cue(ID, 1, -0.1), { damping: 18, stiffness: 120 }); // "todos los días"
  const s = p6cState(t);
  return (
    <Layer on="front">
      <Board k={bIn}>
        <P6Board done={s.done} live={0} card={s.card} cardOut={0} rows={s.rows} />
      </Board>
    </Layer>
  );
};
