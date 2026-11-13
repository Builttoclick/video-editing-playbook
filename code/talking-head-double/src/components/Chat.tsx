import React from "react";
import { Img, staticFile } from "remotion";
import copy from "../data/copy.json";
import cues from "../data/cues.json";
import { clamp01, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { measure } from "../lib/measure";
import { C, COMPOSE_H, HEADER_H, SCREEN, UI_FONT } from "../theme";
import { Icon } from "./base";

// The viewer's own WhatsApp (dark theme, as on an Android phone): their questions on the right, Joaquín's answers on
// the left. Messages stack from the bottom like the real app and the thread shifts up as each one lands. Every
// message's frame lives in src/data/cues.json (`msg`), its words in src/data/copy.json.
export type Msg = { id: string; side: "in" | "out"; lines: string[]; list?: string[]; time: string; typed?: string };
const MSG = copy.messages as Msg[];
const M = cues.msg as Record<string, { dots?: number; at: number }>;
const F = cues.f;

export const BODY = 42;
const LH = 54;
const LIST_LH = 60;
const PAD_X = 22;
const PAD_T = 14;
const PAD_B = 12;
const TIME = 24;
const GAP = 8;
const GROUP_GAP = 22;
const MAX_W = 830;
const SIDE = 24;
const PILL_H = 46;
const NOTE_H = 100;
const DOTS_W = 150;
const DOTS_H = 84;
export const THREAD_TOP = SCREEN.y0 + HEADER_H;
export const THREAD_BOTTOM = SCREEN.y1 - COMPOSE_H;
const bodyFont = `400 ${BODY}px Roboto`;
const timeFont = `400 ${TIME}px Roboto`;
const NOTE_LINES = ["Los mensajes y las llamadas están", "cifrados de extremo a extremo."];

type Geo = { w: number; h: number; inlineTime: boolean };
const geo = (m: Msg): Geo => {
  const timeW = measure(m.time, timeFont) + (m.side === "out" ? 40 : 0);
  if (m.list) {
    const lineW = Math.max(...m.list.map((s) => measure(s, bodyFont))) + 58;
    return { w: Math.min(MAX_W, Math.max(lineW, timeW) + 2 * PAD_X), h: PAD_T + m.list.length * LIST_LH + 4 + TIME + 6 + PAD_B, inlineTime: false };
  }
  const textW = Math.max(...m.lines.map((s) => measure(s, bodyFont)));
  if (m.lines.length === 1 && textW + timeW + 26 + 2 * PAD_X <= MAX_W) {
    return { w: textW + timeW + 26 + 2 * PAD_X, h: PAD_T + LH + PAD_B, inlineTime: true };
  }
  return { w: Math.max(textW, timeW) + 2 * PAD_X, h: PAD_T + m.lines.length * LH + 4 + TIME + 6 + PAD_B, inlineTime: false };
};

type Slot = { id: string; kind: "pill" | "note" | "msg"; m: Msg | null; start: number; at: number; w: number; h: number; dots: boolean; inlineTime: boolean; tail: boolean };
let SLOTS: Slot[] | null = null;
const getSlots = (): Slot[] => {
  if (SLOTS) return SLOTS;
  const out: Slot[] = [
    { id: "pill", kind: "pill", m: null, start: -1, at: -1, w: 0, h: PILL_H, dots: false, inlineTime: false, tail: false },
    { id: "note", kind: "note", m: null, start: -1, at: -1, w: 0, h: NOTE_H, dots: false, inlineTime: false, tail: false },
  ];
  let prev: string | null = null;
  for (const m of MSG) {
    const g = geo(m);
    const t = M[m.id];
    out.push({ id: m.id, kind: "msg", m, start: t.dots ?? t.at, at: t.at, w: g.w, h: g.h, dots: t.dots !== undefined, inlineTime: g.inlineTime, tail: prev !== m.side });
    prev = m.side;
  }
  SLOTS = out;
  return out;
};

export type Row = { s: Slot; raw: number; k: number; morph: number; h: number; w: number; y: number; x: number };
// Where every message sits at frame f: each one's height counts from its first frame (the dots bubble, if it has
// one), scaled by its spring, so the thread above shifts up as it comes in; the dots grow into the message over 7 frames.
export const layout = (f: number): Row[] => {
  const S = getSlots();
  let acc = 0;
  let prevSide: string | null = null;
  const rows = S.map((s) => {
    const raw = s.kind === "msg" ? sp(f, s.start, SNAP) : 1;
    const k = clamp01(raw);
    const morph = s.dots ? ramp(f, s.at, s.at + 7, 0, 1, easeOut) : 1;
    const h = s.dots ? lerp(DOTS_H, s.h, morph) : s.h;
    const w = s.dots ? lerp(DOTS_W, s.w, morph) : s.w;
    const side = s.m ? s.m.side : null;
    const gap = s.kind !== "msg" ? 16 : prevSide === side ? GAP : GROUP_GAP;
    const top = acc;
    acc += (h + gap) * k;
    prevSide = side;
    const x = !s.m ? SCREEN.x0 + (SCREEN.x1 - SCREEN.x0) / 2 : s.m.side === "out" ? SCREEN.x1 - SIDE - w : SCREEN.x0 + SIDE;
    return { s, raw, k, morph, h, w, y: top, x };
  });
  const base = THREAD_BOTTOM - 14 - acc;
  return rows.map((r) => ({ ...r, y: base + r.y }));
};

export const rowOf = (f: number, id: string) => layout(f).find((r) => r.s.id === id)!;
export const typingNow = (f: number) => getSlots().some((s) => s.dots && f >= s.start && f < s.at);

// The letters of the viewer's last message, typed on a human rhythm (a gap pattern, a beat more after a space): the
// same rule the sound script uses, so the clicks land on the letters.
const Q7 = MSG.find((m) => m.id === "q7")!;
export const TYPE_AT = Array.from(Q7.typed!).reduce<number[]>(
  (out, _, i) => [...out, i === 0 ? F.typeStart : out[i - 1] + (Q7.typed![i - 1] === " " ? cues.typeAfterSpace : cues.typePattern[i % cues.typePattern.length])],
  [],
);

const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: UI_FONT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1,
  whiteSpace: "nowrap",
  ...extra,
});

const Ticks: React.FC<{ f: number; m: Msg; at: number }> = ({ f, m, at }) => {
  const t = m.id === "q7" ? F.ticks : { one: at, two: at + 6, blue: at + 14 };
  const blue = f >= t.blue;
  const two = f >= t.two;
  // the last message's ticks turn blue with a small pop: the eye has to catch the visto
  const pop = m.id === "q7" && blue ? 1 + 0.45 * Math.sin(Math.PI * ramp(f, t.blue, t.blue + 9)) : 1;
  return (
    <Icon
      name={two ? "ri:check-double-line" : "ri:check-line"}
      size={30}
      color={blue ? C.waBlue : "rgba(233,237,239,0.55)"}
      style={{ marginLeft: 6, marginBottom: -2, transform: `scale(${pop.toFixed(3)})` }}
    />
  );
};

// The visto, made unmistakable (Joaquín's notes on the first drafts, 05-nov: "más evidente", "ese zoom esfera, bien
// grande, y un sonidito"): two shots. A glass lens springs in over the two ticks and shows them four times bigger
// as they turn blue (a dry knock in the sound); a hard cut back to the whole chat, where the header says
// "escribiendo..." for a beat and then Joaquín goes offline.
const vistoState = (f: number): "typing" | "offline" | null =>
  f >= F.visto.offline ? "offline" : f >= F.visto.typing[0] && f < F.visto.typing[1] ? "typing" : null;
const LENS_D = 560;
const LENS_MAG = 4.4;
// Drawn by Film.tsx above the chat (it may overflow the screen's bezel): the lens sits up-left of the ticks, its
// content is the bubble's corner (the last line, the time, the ticks) at 4.4x, under a glass highlight and rim.
export const Lens: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.visto.lens || f >= F.visto.typing[0]) return null;
  const k = sp(f, F.visto.lens, { damping: 14, stiffness: 150, mass: 0.9 });
  if (k <= 0) return null;
  const r = rowOf(f, "q7");
  const tx = r.x + r.w - 40; // the ticks' point on screen
  const ty = r.y + r.h - 22;
  const cx = tx - 190;
  const cy = ty - 185;
  const s = 0.25 + 0.75 * Math.min(1.08, k);
  const last = Q7.lines[Q7.lines.length - 1];
  return (
    <div style={{ position: "absolute", left: cx - LENS_D / 2, top: cy - LENS_D / 2, width: LENS_D, height: LENS_D, opacity: clamp01(k * 1.8), transform: `scale(${s.toFixed(3)})`, transformOrigin: `${(tx - cx + LENS_D / 2).toFixed(0)}px ${(ty - cy + LENS_D / 2).toFixed(0)}px` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.waOut, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 5px rgba(255,255,255,0.35), 0 0 0 7px rgba(0,0,0,0.25)" }}>
        {/* the bubble's corner, magnified: the last line runs off the top, the time and the ticks sit at the centre */}
        <div style={{ position: "absolute", left: 0, top: 0, width: LENS_D, height: LENS_D, transform: `scale(${LENS_MAG})`, transformOrigin: "0 0" }}>
          <div style={{ position: "absolute", left: 10, top: 6, ...ui(BODY, 400, { color: C.waText, lineHeight: `${LH}px` }) }}>{last}</div>
          <div style={{ position: "absolute", left: 10 + 4, top: 6 + LH + 4, display: "flex", alignItems: "center", ...ui(TIME, 400, { color: C.waMuted }) }}>
            {Q7.time}
            <Ticks f={f} m={Q7} at={M.q7.at} />
          </div>
        </div>
        {/* glass: a highlight up-left, a shade down-right */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)" }} />
      </div>
    </div>
  );
};

const Bubble: React.FC<{ f: number; r: Row }> = ({ f, r }) => {
  const { s, raw, k, morph, h, w } = r;
  const m = s.m!;
  const out = m.side === "out";
  const bg = out ? C.waOut : C.waIn;
  const dotsOn = s.dots && morph < 1;
  const textK = s.dots ? clamp01((morph - 0.45) / 0.55) : 1;
  const scale = 0.55 + 0.45 * Math.min(1.12, raw);
  const listStep = F.listStep;
  return (
    <div
      style={{
        position: "absolute",
        left: r.x - SCREEN.x0,
        top: r.y - THREAD_TOP,
        width: w,
        height: h,
        borderRadius: 22,
        borderTopLeftRadius: !out && s.tail ? 6 : 22,
        borderTopRightRadius: out && s.tail ? 6 : 22,
        background: bg,
        opacity: clamp01(raw * 1.6),
        transformOrigin: out ? "100% 100%" : "0% 100%",
        transform: `scale(${scale.toFixed(3)})`,
        boxShadow: "0 1px 1px rgba(0,0,0,0.35)",
      }}
    >
      {s.tail && (
        <svg width={16} height={18} style={{ position: "absolute", top: 0, [out ? "right" : "left"]: -13 }} viewBox="0 0 16 18">
          <path d={out ? "M0 0 L16 0 L0 17 Z" : "M16 0 L0 0 L16 17 Z"} fill={bg} />
        </svg>
      )}
      {dotsOn && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: 1 - clamp01(morph * 2) }}>
          {[0, 1, 2].map((i) => {
            const ph = (f - s.start) * 0.42 - i * 0.95;
            const b = Math.max(0, Math.sin(ph));
            return <div key={i} style={{ width: 17, height: 17, borderRadius: 9, background: `rgba(233,237,239,${(0.45 + 0.5 * b).toFixed(3)})`, transform: `translateY(${(-9 * b).toFixed(2)}px)` }} />;
          })}
        </div>
      )}
      {textK > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: textK, padding: `${PAD_T}px ${PAD_X}px ${PAD_B}px`, boxSizing: "border-box" }}>
          {m.list
            ? m.list.map((line, i) => {
                const kk = sp(f, s.at + i * listStep, SNAP);
                if (kk <= 0) return null;
                return (
                  <div key={i} style={{ height: LIST_LH, display: "flex", alignItems: "center", gap: 16, opacity: clamp01(kk * 1.6), transform: `translateX(${((1 - clamp01(kk)) * -18).toFixed(2)}px)` }}>
                    <Icon name="solar:check-circle-bold" size={38} color={C.gold} />
                    <div style={ui(BODY, 400, { color: C.waText })}>{line}</div>
                  </div>
                );
              })
            : m.lines.map((line, i) => (
                <div key={i} style={{ ...ui(BODY, 400, { color: C.waText, lineHeight: `${LH}px` }) }}>
                  {line}
                </div>
              ))}
          <div
            style={{
              position: "absolute",
              right: PAD_X - 4,
              bottom: s.inlineTime ? PAD_B + 4 : PAD_B,
              display: "flex",
              alignItems: "center",
              ...ui(TIME, 400, { color: C.waMuted }),
            }}
          >
            {m.time}
            {out && <Ticks f={f} m={m} at={s.at} />}
          </div>
        </div>
      )}
    </div>
  );
};

const Thread: React.FC<{ f: number }> = ({ f }) => {
  const rows = layout(f);
  return (
    <div style={{ position: "absolute", left: SCREEN.x0, top: THREAD_TOP, width: SCREEN.x1 - SCREEN.x0, height: THREAD_BOTTOM - THREAD_TOP, overflow: "hidden" }}>
      {rows.map((r) => {
        if (r.k <= 0 || r.y + r.h < THREAD_TOP - 20) return null;
        if (r.s.kind === "pill")
          return (
            <div key="pill" style={{ position: "absolute", left: 0, right: 0, top: r.y - THREAD_TOP, display: "flex", justifyContent: "center" }}>
              <div style={{ height: PILL_H, padding: "0 22px", borderRadius: 12, background: C.waDate, display: "flex", alignItems: "center", ...ui(25, 500, { color: "#8696A0", letterSpacing: "0.02em" }) }}>
                {copy.datePill.toUpperCase()}
              </div>
            </div>
          );
        if (r.s.kind === "note")
          return (
            <div key="note" style={{ position: "absolute", left: 0, right: 0, top: r.y - THREAD_TOP, display: "flex", justifyContent: "center" }}>
              <div style={{ height: NOTE_H, padding: "0 30px", borderRadius: 14, background: C.waDate, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {NOTE_LINES.map((l, i) => (
                  <div key={i} style={ui(25, 400, { color: "#D9B35A" })}>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          );
        return <Bubble key={r.s.id} f={f} r={r} />;
      })}
    </div>
  );
};

const Header: React.FC<{ f: number }> = ({ f }) => {
  const v = vistoState(f);
  const typing = v === "typing" || (v === null && typingNow(f));
  const sub = typing ? copy.header.typing : v === "offline" ? copy.header.offline : copy.header.online;
  return (
    <div style={{ position: "absolute", left: SCREEN.x0, top: SCREEN.y0, width: SCREEN.x1 - SCREEN.x0, height: HEADER_H, background: C.waBar, display: "flex", alignItems: "center", padding: "0 30px 0 22px", boxSizing: "border-box", gap: 18 }}>
      <Icon name="ri:arrow-left-line" size={46} color="#AEBAC1" />
      <Img src={staticFile("avatar.png")} style={{ width: 88, height: 88, borderRadius: 44, objectFit: "cover", marginLeft: 4 }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, marginLeft: 8 }}>
        <div style={ui(38, 500, { color: C.waText })}>{copy.header.name}</div>
        <div style={ui(28, 400, { color: typing ? C.waGreenUi : "#8696A0" })}>{sub}</div>
      </div>
      <Icon name="ri:vidicon-line" size={44} color="#AEBAC1" />
      <Icon name="ri:phone-line" size={42} color="#AEBAC1" style={{ marginLeft: 26 }} />
      <Icon name="ri:more-2-fill" size={44} color="#AEBAC1" style={{ marginLeft: 22 }} />
    </div>
  );
};

const Compose: React.FC<{ f: number }> = ({ f }) => {
  const n = TYPE_AT.filter((t) => t <= f).length;
  const sent = f >= F.sendPress;
  const text = sent ? "" : Q7.typed!.slice(0, n);
  const focus = f >= F.typeStart - 12 && !sent;
  const caretOn = focus && Math.floor((f - F.typeStart) / 14) % 2 === 0;
  const press = ramp(f, F.sendPress, F.sendPress + 2) - ramp(f, F.sendPress + 2, F.sendPress + 8);
  const w = SCREEN.x1 - SCREEN.x0;
  return (
    <div style={{ position: "absolute", left: SCREEN.x0, top: SCREEN.y1 - COMPOSE_H, width: w, height: COMPOSE_H, background: C.waBg, display: "flex", alignItems: "center", padding: "0 20px", boxSizing: "border-box", gap: 16 }}>
      <div style={{ flex: 1, height: 92, borderRadius: 46, background: "#2A3942", display: "flex", alignItems: "center", padding: "0 26px", boxSizing: "border-box", gap: 18 }}>
        <Icon name="ri:emotion-line" size={42} color="#8696A0" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
          <div style={ui(38, 400, { color: text ? C.waText : "#8696A0" })}>{text || copy.composeHint}</div>
          {caretOn && <div style={{ width: 3, height: 44, background: C.waGreenUi, marginLeft: text ? 2 : -2 }} />}
        </div>
        {!text && (
          <>
            <Icon name="ri:attachment-2" size={40} color="#8696A0" style={{ transform: "rotate(45deg)" }} />
            <Icon name="ri:camera-line" size={40} color="#8696A0" style={{ marginLeft: 6 }} />
          </>
        )}
      </div>
      <div style={{ width: 92, height: 92, borderRadius: 46, background: C.waGreenUi, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(1 - 0.14 * press).toFixed(3)})` }}>
        <Icon name={text || press > 0 ? "ri:send-plane-2-fill" : "ri:mic-fill"} size={46} color={C.white} style={text || press > 0 ? { marginLeft: 6 } : undefined} />
      </div>
    </div>
  );
};

// The phone's screen: a hint of bezel around it, the chat full width inside. `dim` darkens it while a graphic
// floats out in front.
export const Chat: React.FC<{ f: number; dim: number }> = ({ f, dim }) => {
  return (
  <div
    style={{
      position: "absolute",
      left: SCREEN.x0,
      top: SCREEN.y0,
      width: SCREEN.x1 - SCREEN.x0,
      height: SCREEN.y1 - SCREEN.y0,
      borderRadius: SCREEN.r,
      overflow: "hidden",
      background: C.waBg,
      boxShadow: "0 0 0 2px rgba(255,255,255,0.09), 0 40px 90px rgba(0,0,0,0.55)",
    }}
  >
    <div style={{ position: "absolute", left: -SCREEN.x0, top: -SCREEN.y0, width: 1080, height: 1920 }}>
      <Header f={f} />
      <Thread f={f} />
      <Compose f={f} />
    </div>
    {dim > 0.01 && <div style={{ position: "absolute", inset: 0, background: `rgba(3,8,16,${dim.toFixed(3)})` }} />}
  </div>
  );
};
