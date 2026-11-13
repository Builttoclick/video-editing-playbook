import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { G3, Icon, Layer, Obj, txt } from "./components/base";
import { Slab } from "./components/Graphics";
import copy from "./data/copy.json";
import th from "./data/th.json";
import thCues from "./data/th_cues.json";
import { clamp01, easeIn, easeOut, LAZY, lerp, ramp, SNAP, sp } from "./lib/anim";
import { measure } from "./lib/measure";
import { C, FONT, GOLD_GRAD, UI_FONT } from "./theme";

// AN-01, the talking-head double: Joaquín plays both sides at the desk (the client's lines come mirrored and cooled from
// tools/th_compose.py). The chat lives on the wall BEHIND Joaquín's head (BACK layer, cut out by Joaquín's silhouette): the
// client's green bubbles on the right, Joaquín's gray ones on the left, stacking up like the real thing. The big moments
// take the wall for themselves (the gold price, the page, the 14 days) and the small things ride in front of Joaquín
// (the client's cheaper quote on a sticker, the chips, the compose bar on Joaquín's chest). Every cue hangs off a word of src/data/th.json.
type Word = { text: string; t: number; f: number; e: number };
type Piece = { id: string; beat: string; role: string; f0: number; n: number; f1: number; words: Word[] };
const P = th.pieces as Piece[];
// a beat can span several pieces (the tightener splits a long breath): its words are all of them, in order
const pieces = (beat: string) => P.filter((p) => p.beat === beat);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
// the frame of the first word of a beat that contains `sub` (accents and punctuation ignored); the beat's second
// frame when the word is not there, so a retake never breaks the film
const wordF = (beat: string, sub: string, nth = 0) => {
  const ps = pieces(beat);
  if (!ps.length) return -10_000;
  const hits = ps.flatMap((p) => p.words).filter((w) => norm(w.text).includes(norm(sub)));
  return hits[nth] ? hits[nth].f : ps[0].f0 + 2;
};
const startF = (beat: string) => pieces(beat)[0]?.f0 ?? -10_000;
type Cue = { beat: string; word: string; nth?: number; off?: number };
// a cue of src/data/th_cues.json: the frame of its word (or its beat's first frame), plus its offset
const cueF = (c: Cue) => (c.word ? wordF(c.beat, c.word, c.nth ?? 0) : startF(c.beat)) + (c.off ?? 0);
const B = thCues.beats as unknown as Record<string, Cue> & { chips: Cue[] };

// Joaquín's frame (05-nov-2026 take, 1080x1920): hair top ~y 800, head x 480-660, shoulders from y 1080, desk from y 1380.
const WALL_TOP = 150;
const WALL_BOTTOM = 800;
const CHEST_Y = 1255;
const COL = { left: 215, right: 865 };

// ---------------------------------------------------------------- the chat on the wall
type WMsg = { id: string; side: "in" | "out"; at: number; lines?: string[]; list?: string[]; listAt?: number[]; ticks?: { one: number; two: number; blue: number } };
const BODY = 44;
const LH = 56;
const LIST_LH = 62;
const PAD_X = 24;
const PAD_T = 14;
const PAD_B = 12;
const TIME = 24;
const MAX_W = 780;
const bodyFont = `400 ${BODY}px Roboto`;
const timeFont = `400 ${TIME}px Roboto`;
const TIMES = ["10:41", "10:41", "10:42", "10:42", "10:42", "10:43", "10:43", "10:44", "10:44", "10:45", "10:45", "10:46", "10:46", "10:47", "10:48"];

type CueMsg = { id: string; side: "in" | "out"; beat: string; word: string; off?: number; lines?: string[]; list?: string[]; listWords?: string[]; ticksBlue?: Cue };
let MSGS: WMsg[] | null = null;
const msgs = (): WMsg[] => {
  if (MSGS) return MSGS;
  MSGS = (thCues.msgs as CueMsg[]).map((c) => {
    const at = cueF(c);
    return {
      id: c.id,
      side: c.side,
      at,
      lines: c.lines,
      list: c.list,
      listAt: c.listWords?.map((w) => wordF(c.beat, w)),
      ticks: c.ticksBlue ? { one: at + 2, two: at + 10, blue: cueF(c.ticksBlue) } : undefined,
    };
  });
  return MSGS;
};

const geo = (m: WMsg) => {
  const timeW = measure(TIMES[0], timeFont) + (m.side === "out" ? 42 : 0);
  if (m.list) {
    const lineW = Math.max(...m.list.map((s) => measure(s, bodyFont))) + 60;
    return { w: Math.min(MAX_W, Math.max(lineW, timeW) + 2 * PAD_X), h: PAD_T + m.list.length * LIST_LH + 4 + TIME + 6 + PAD_B, inline: false };
  }
  const textW = Math.max(...m.lines!.map((s) => measure(s, bodyFont)));
  if (m.lines!.length === 1 && textW + timeW + 26 + 2 * PAD_X <= MAX_W) return { w: textW + timeW + 26 + 2 * PAD_X, h: PAD_T + LH + PAD_B, inline: true };
  return { w: Math.max(textW, timeW) + 2 * PAD_X, h: PAD_T + m.lines!.length * LH + 4 + TIME + 6 + PAD_B, inline: false };
};

const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", ...extra });

const WallThread: React.FC<{ f: number; hide: number }> = ({ f, hide }) => {
  const M = msgs();
  let acc = 0;
  let prev: string | null = null;
  const rows = M.map((m, i) => {
    const g = geo(m);
    // the list bubble grows line by line on Joaquín's words
    const shown = m.list ? m.listAt!.filter((t) => t <= f).length : 0;
    const h = m.list ? PAD_T + Math.max(1, shown) * LIST_LH + 4 + TIME + 6 + PAD_B : g.h;
    const raw = sp(f, m.at, SNAP);
    const k = clamp01(raw);
    const gap = prev === m.side ? 8 : 24;
    const top = acc;
    acc += (h + gap) * k;
    const tail = prev !== m.side;
    prev = m.side;
    return { m, g, h, raw, k, top, tail, i, shown };
  });
  const base = WALL_BOTTOM - acc;
  if (hide >= 0.999) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: WALL_TOP, width: 1080, height: WALL_BOTTOM - WALL_TOP + 60, overflow: "hidden", opacity: 1 - hide, transform: `translateY(${(-140 * hide).toFixed(1)}px)`, maskImage: "linear-gradient(180deg, transparent 0%, black 14%, black 100%)", WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 14%, black 100%)" }}>
      {rows.map(({ m, g, h, raw, k, top, tail, i, shown }) => {
        if (k <= 0) return null;
        const y = base + top - WALL_TOP;
        if (y + h < -20) return null;
        const out = m.side === "out";
        const bg = out ? C.waOut : C.waIn;
        const x = out ? 1020 - g.w : 60;
        const scale = 0.55 + 0.45 * Math.min(1.12, raw);
        const t = m.ticks ?? { one: m.at, two: m.at + 6, blue: m.at + 14 };
        return (
          <div key={m.id} style={{ position: "absolute", left: x, top: y, width: g.w, height: h, borderRadius: 24, borderTopLeftRadius: !out && tail ? 6 : 24, borderTopRightRadius: out && tail ? 6 : 24, background: bg, opacity: clamp01(raw * 1.6), transformOrigin: out ? "100% 100%" : "0% 100%", transform: `scale(${scale.toFixed(3)})`, boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
            {tail && (
              <svg width={16} height={18} style={{ position: "absolute", top: 0, [out ? "right" : "left"]: -13 }} viewBox="0 0 16 18">
                <path d={out ? "M0 0 L16 0 L0 17 Z" : "M16 0 L0 0 L16 17 Z"} fill={bg} />
              </svg>
            )}
            <div style={{ position: "absolute", inset: 0, padding: `${PAD_T}px ${PAD_X}px ${PAD_B}px`, boxSizing: "border-box" }}>
              {m.list
                ? m.list.slice(0, Math.max(1, shown)).map((line, j) => {
                    const kk = sp(f, m.listAt![j], SNAP);
                    return (
                      <div key={j} style={{ height: LIST_LH, display: "flex", alignItems: "center", gap: 16, opacity: clamp01(kk * 1.6), transform: `translateX(${((1 - clamp01(kk)) * -18).toFixed(2)}px)` }}>
                        <Icon name="solar:check-circle-bold" size={40} color={C.gold} />
                        <div style={ui(BODY, 400, { color: C.waText })}>{line}</div>
                      </div>
                    );
                  })
                : m.lines!.map((line, j) => (
                    <div key={j} style={ui(BODY, 400, { color: C.waText, lineHeight: `${LH}px` })}>
                      {line}
                    </div>
                  ))}
              <div style={{ position: "absolute", right: PAD_X - 4, bottom: g.inline ? PAD_B + 4 : PAD_B, display: "flex", alignItems: "center", ...ui(TIME, 400, { color: C.waMuted }) }}>
                {TIMES[i % TIMES.length]}
                {out && <Icon name={f >= t.two ? "ri:check-double-line" : "ri:check-line"} size={30} color={f >= t.blue ? C.waBlue : "rgba(233,237,239,0.55)"} style={{ marginLeft: 6, marginBottom: -2 }} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- the big moments on the wall (BACK)
const Extrude: React.FC<{ text: string; size: number; depth?: number; layers?: number; sheen?: number; fade?: number; face?: string; side?: [string, string] }> = ({ text, size, depth = 26, layers = 14, sheen = -1, fade = 1, face = GOLD_GRAD, side = ["#B9741E", "#3C2306"] }) => {
  const base: React.CSSProperties = { opacity: fade, position: "absolute", left: 0, top: 0, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, whiteSpace: "nowrap" };
  const mixc = (k: number) => {
    const a = parseInt(side[0].slice(1), 16);
    const b = parseInt(side[1].slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  return (
    <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
      <div style={{ ...base, position: "relative", visibility: "hidden" }}>{text}</div>
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} style={{ ...base, color: mixc(i / (layers - 1)), transform: `translateZ(${-((i + 1) * depth) / layers}px)` }}>
          {text}
        </div>
      ))}
      <div style={{ ...base, backgroundImage: face, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: `drop-shadow(0 0 ${size * 0.05}px rgba(245,168,60,0.22))` }}>{text}</div>
      {sheen >= 0 && sheen <= 1 && (
        <div style={{ ...base, backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sheen * 140 - 30}%, rgba(255,255,255,0.8) ${sheen * 140 - 15}%, rgba(255,255,255,0) ${sheen * 140}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", transform: "translateZ(0.5px)" }}>{text}</div>
      )}
    </div>
  );
};

const pricePresence = (f: number) => {
  const at = cueF(B.price);
  const gone = cueF(B.priceGone);
  return clamp01(sp(f, at, SNAP) * 1.5) * (1 - ramp(f, gone, gone + 8));
};
// The spoken price lands in gold 3D behind Joaquín's head; the light crosses it on the price's last word.
const PriceBehind: React.FC<{ f: number }> = ({ f }) => {
  const p = pricePresence(f);
  if (p <= 0.001) return null;
  const at = cueF(B.price);
  const k = sp(f, at, { damping: 14, stiffness: 150, mass: 0.9 });
  const sheen = ramp(f, cueF(B.priceSheen), cueF(B.priceSheen) + 16);
  const gone = ramp(f, cueF(B.priceGone), cueF(B.priceGone) + 8, 0, 1, easeIn);
  return (
    <Obj opacity={p} origin="540px 700px">
      <div style={{ position: "absolute", left: 0, right: 0, top: 560 - 90 * gone, display: "flex", justifyContent: "center", transformStyle: "preserve-3d", transform: `translateZ(${((1 - clamp01(k)) * 600).toFixed(1)}px) scale(${(0.7 + 0.3 * Math.min(1.1, k)).toFixed(3)})` }}>
        <Extrude text={copy.end.price} size={150} depth={34} sheen={sheen > 0 && sheen < 1 ? sheen : -1} />
      </div>
    </Obj>
  );
};

const WIRE_IN = () => cueF(B.wire);
const WIRE_OUT = () => cueF(B.wireOut);
const wirePresence = (f: number) => clamp01(sp(f, WIRE_IN()) * 1.5) * (1 - ramp(f, WIRE_OUT(), WIRE_OUT() + 10));
// "armar una página hecha a la medida": the page turns in on the wall and writes itself while Joaquín says it.
const WireWall: React.FC<{ f: number }> = ({ f }) => {
  const p = wirePresence(f);
  if (p <= 0.001) return null;
  const at = WIRE_IN();
  const k = sp(f, at, { damping: 17, stiffness: 95, mass: 1 });
  const out = ramp(f, WIRE_OUT(), WIRE_OUT() + 10, 0, 1, easeIn);
  const W = 700;
  const Hh = 470;
  const words = copy.wire.headline.split(" ");
  const sub = copy.wire.sub.split(" ");
  const shownW = words.filter((_, i) => at + 10 + i * 3 <= f).length;
  const shownS = sub.filter((_, i) => at + 10 + words.length * 3 + 2 + i * 2 <= f).length;
  const btn = sp(f, cueF(B.wireButton), SNAP);
  return (
    <Obj opacity={p} origin="540px 700px">
      <G3 x={540} y={470 - 60 * out} w={W} h={Hh} tz={60} ry={lerp(48, -5, clamp01(k)) + 60 * out} rx={lerp(10, 0, clamp01(k))} s={0.82 + 0.06 * clamp01(k)}>
        <div style={{ position: "absolute", left: 30, top: 40, width: W - 60, height: Hh - 50, borderRadius: 30, background: "rgba(0,0,0,0.5)", filter: "blur(28px)", transform: "translateZ(-60px)" }} />
        <Slab w={W} h={Hh} face="#F7F8FB" border="rgba(255,255,255,0.9)" sides={[[205, 210, 220], [120, 128, 142]]}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: GOLD_GRAD }} />
              <div style={txt(22, 700, { color: C.navy })}>{copy.wire.brand}</div>
            </div>
            <div style={{ display: "flex", gap: 22 }}>
              {copy.wire.nav.map((n) => (
                <div key={n} style={txt(18, 500, { color: "rgba(10,30,63,0.6)" })}>
                  {n}
                </div>
              ))}
            </div>
          </div>
          <div style={{ margin: "24px 28px 0", height: 1, background: "rgba(10,30,63,0.1)" }} />
          <div style={{ padding: "30px 28px 0", display: "flex", flexWrap: "wrap", gap: "0 12px", minHeight: 120, width: 440 }}>
            {words.slice(0, shownW).map((w, i) => (
              <div key={i} style={txt(46, 800, { color: C.navy, lineHeight: 1.12 })}>
                {w}
              </div>
            ))}
            {shownW < words.length && f >= at + 4 && <div style={{ width: 4, height: 48, background: C.gold, marginTop: 4, opacity: Math.floor(f / 8) % 2 ? 0.2 : 1 }} />}
          </div>
          <div style={{ padding: "8px 28px 0", display: "flex", flexWrap: "wrap", gap: "0 8px", minHeight: 40, width: 440 }}>
            {sub.slice(0, shownS).map((w, i) => (
              <div key={i} style={txt(22, 500, { color: "rgba(10,30,63,0.7)", lineHeight: 1.3 })}>
                {w}
              </div>
            ))}
          </div>
          {btn > 0 && (
            <div style={{ position: "absolute", left: 28, bottom: 30, height: 66, padding: "0 26px", borderRadius: 33, background: C.wa, display: "flex", alignItems: "center", gap: 12, transform: `scale(${(0.6 + 0.4 * Math.min(1.1, btn)).toFixed(3)})`, transformOrigin: "0% 50%", opacity: clamp01(btn * 1.6), ...txt(26, 700, { color: "#05301A", letterSpacing: "-0.01em" }) }}>
              <Icon name="ri:whatsapp-fill" size={34} color="#05301A" />
              {copy.wire.button}
            </div>
          )}
          <div style={{ position: "absolute", right: 28, top: 118, width: 190, height: 300, borderRadius: 18, background: "linear-gradient(160deg,#2A3D5C 0%,#0F1F42 100%)", overflow: "hidden" }}>
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, right: -30, top: -34, background: C.gold, opacity: 0.4 }} />
            <div style={{ position: "absolute", left: 18, bottom: 22, width: 110, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.35)" }} />
            <div style={{ position: "absolute", left: 18, bottom: 40, width: 70, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.25)" }} />
          </div>
        </Slab>
      </G3>
    </Obj>
  );
};

const CAL_IN = () => cueF(B.cal);
const CAL_OUT = () => cueF(B.calOut);
const calPresence = (f: number) => clamp01(sp(f, CAL_IN(), SNAP) * 1.5) * (1 - ramp(f, CAL_OUT(), CAL_OUT() + 8));
export const calTiles = () => Array.from({ length: 14 }, (_, i) => CAL_IN() + 4 + Math.round(i * 2.3));
// "catorce días": the strip flips its 14 tiles over on the wall, fast, the last one with the check.
const CalendarWall: React.FC<{ f: number }> = ({ f }) => {
  const p = calPresence(f);
  if (p <= 0.001) return null;
  const k = sp(f, CAL_IN(), SNAP);
  const out = ramp(f, CAL_OUT(), CAL_OUT() + 8, 0, 1, easeIn);
  const tile = 100;
  const gap = 12;
  const W = 7 * tile + 6 * gap + 60;
  const Hh = 2 * tile + gap + 60;
  const tiles = calTiles();
  return (
    <Obj opacity={p} origin="540px 700px">
      <G3 x={540} y={520 - 60 * out} w={W} h={Hh} tz={60} s={0.86 + 0.14 * Math.min(1.08, k)} rx={lerp(16, 0, clamp01(k))}>
        <div style={{ position: "absolute", left: 24, top: 36, width: W - 48, height: Hh - 40, borderRadius: 28, background: "rgba(0,0,0,0.5)", filter: "blur(26px)", transform: "translateZ(-50px)" }} />
        <Slab w={W} h={Hh} r={28}>
          <div style={{ position: "absolute", left: 30, top: 30, display: "grid", gridTemplateColumns: `repeat(7, ${tile}px)`, gap }}>
            {tiles.map((t, i) => {
              const kk = sp(f, t, SNAP);
              const on = clamp01(kk);
              const last = i === 13;
              return (
                <div key={i} style={{ width: tile, height: tile, borderRadius: 18, background: on > 0.02 ? GOLD_GRAD : "rgba(255,255,255,0.06)", border: `1.5px solid ${on > 0.02 ? "rgba(255,230,180,0.5)" : "rgba(255,255,255,0.12)"}`, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `rotateX(${(90 * (1 - Math.min(1, kk))).toFixed(2)}deg) scale(${(1 + 0.1 * Math.sin(Math.PI * on)).toFixed(3)})`, transformStyle: "preserve-3d" }}>
                  {last && on > 0.5 ? (
                    <Icon name="solar:check-circle-bold" size={52} color={C.navy} />
                  ) : (
                    <>
                      <div style={txt(16, 600, { color: on > 0.02 ? "rgba(10,30,63,0.75)" : "rgba(255,255,255,0.5)", letterSpacing: 0 })}>{copy.calendar.day}</div>
                      <div style={txt(40, 800, { color: on > 0.02 ? C.navy : "rgba(255,255,255,0.75)" })}>{i + 1}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Slab>
      </G3>
    </Obj>
  );
};

// ---------------------------------------------------------------- the small things in front of Joaquín (FRONT)
// The client's cheaper quote ("my nephew charges me ...") slaps on as a gray sticker beside Joaquín, then drops when Joaquín answers.
const Sticker: React.FC<{ f: number }> = ({ f }) => {
  const at = cueF(B.sticker);
  const gone = cueF(B.stickerGone);
  const k = sp(f, at, { damping: 12, stiffness: 220, mass: 0.7 });
  const out = ramp(f, gone, gone + 10, 0, 1, easeIn);
  if (k <= 0 || out >= 1) return null;
  return (
    <Obj opacity={clamp01(k * 1.8) * (1 - out)}>
      <G3 x={COL.right} y={930 + 260 * out} w={330} h={150} rz={-7 + 30 * out} s={1.25 - 0.25 * Math.min(1.1, k)}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "linear-gradient(180deg,#F2F4F8 0%,#CDD3DD 100%)", boxShadow: "0 16px 34px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <div style={txt(22, 600, { color: "#5B6475", letterSpacing: "0.02em" })}>PÁGINA WEB</div>
          <div style={txt(52, 800, { color: "#2B3344" })}>XXX.XXX</div>
        </div>
      </G3>
    </Obj>
  );
};

// "qué es lo que ellos venden": the two chips come out into the columns beside Joaquín, then fold into the page.
const ChipsTH: React.FC<{ f: number }> = ({ f }) => {
  const at = B.chips.map(cueF);
  const fold = WIRE_IN() + 6;
  if (f < at[0] || f > fold + 16) return null;
  const targets = [
    { x: COL.left, y: 980 },
    { x: COL.right, y: 980 },
  ];
  return (
    <>
      {copy.chips.map((text, i) => {
        const k = sp(f, at[i], { damping: 15, stiffness: 110, mass: 0.9 });
        if (k <= 0) return null;
        const gone = ramp(f, fold + i * 3, fold + i * 3 + 10, 0, 1, easeIn);
        const x = lerp(lerp(540, targets[i].x, clamp01(k)), 540, gone);
        const y = lerp(lerp(1150, targets[i].y, clamp01(k)) - 60 * Math.sin(Math.PI * clamp01(k)), 470, gone);
        const s = lerp(0.6 + 0.4 * Math.min(1.1, k), 0.25, gone);
        return (
          <Obj key={i} opacity={clamp01(k * 1.8) * (1 - gone)}>
            <G3 x={x} y={y} w={380} h={92} s={s} rz={(1 - clamp01(k)) * -8}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 46, background: GOLD_GRAD, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, boxShadow: "0 18px 36px rgba(0,0,0,0.45)", ...txt(36, 700, { color: C.navy, letterSpacing: "-0.02em" }) }}>
                <Icon name="solar:chat-round-dots-bold-duotone" size={40} color={C.navy} />
                {text}
              </div>
            </G3>
          </Obj>
        );
      })}
    </>
  );
};

// "Escribime por WhatsApp el nombre de tu empresa": the compose bar on Joaquín's chest types the name and sends it.
const ComposeTH: React.FC<{ f: number }> = ({ f }) => {
  const at = cueF(B.compose);
  const type0 = cueF(B.composeType);
  const send = cueF(B.composeSend);
  const gone = cueF(B.composeOut);
  const k = sp(f, at, SNAP);
  const out = ramp(f, gone, gone + 8, 0, 1, easeIn);
  if (k <= 0 || out >= 1) return null;
  const name = copy.wire.brand;
  const n = Math.max(0, Math.min(name.length, Math.floor((f - type0) / 2)));
  const text = f >= send ? "" : name.slice(0, n);
  const press = ramp(f, send, send + 2) - ramp(f, send + 2, send + 8);
  const caret = f >= type0 - 6 && f < send && Math.floor((f - type0) / 12) % 2 === 0;
  return (
    <Obj opacity={clamp01(k * 1.6) * (1 - out)}>
      <G3 x={540} y={CHEST_Y + 50 * out} w={900} h={104} s={0.8 + 0.2 * Math.min(1.08, k)}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 96, borderRadius: 48, background: "#2A3942", display: "flex", alignItems: "center", padding: "0 26px", boxSizing: "border-box", gap: 18, boxShadow: "0 16px 34px rgba(0,0,0,0.5)" }}>
            <Icon name="ri:emotion-line" size={42} color="#8696A0" />
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={ui(40, 400, { color: text ? C.waText : "#8696A0" })}>{text || copy.composeHint}</div>
              {caret && <div style={{ width: 3, height: 46, background: C.waGreenUi, marginLeft: text ? 2 : -2 }} />}
            </div>
          </div>
          <div style={{ width: 96, height: 96, borderRadius: 48, background: C.waGreenUi, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 34px rgba(0,0,0,0.5)", transform: `scale(${(1 - 0.14 * press).toFixed(3)})` }}>
            <Icon name={text || press > 0 ? "ri:send-plane-2-fill" : "ri:mic-fill"} size={48} color={C.white} style={text || press > 0 ? { marginLeft: 6 } : undefined} />
          </div>
        </div>
      </G3>
    </Obj>
  );
};

// "aparece un puff y yo desaparezco": a cartoon cloud bursts over Joaquín on the visto. Under it the footage switches to
// the empty chair (RAW/edit/append/visto-vacio.mp4: 0.8 s of Joaquín, then the LaMa plate), so when the smoke thins the
// chair is empty. Ten soft discs bloom from Joaquín's chest, drift up and out, and fade.
const PUFFS: [number, number, number][] = [
  [0, 0, 1.0],
  [270, 230, 0.8], // Joaquín's hand with the mic and Joaquín's arms on the desk sit here: these bloom first, before the switch
  [0, 350, 0.95],
  [-220, 340, 0.78],
  [240, 340, 0.78],
  [120, 280, 0.7],
  [-250, 210, 0.62],
  [-150, -60, 0.8],
  [150, -40, 0.85],
  [-90, 120, 0.78],
  [110, 130, 0.8],
  [0, -170, 0.7],
  [-200, 40, 0.62],
  [200, 60, 0.66],
  [-120, 260, 0.7],
  [300, 90, 0.6],
];
const Puff: React.FC<{ f: number }> = ({ f }) => {
  const at = cueF(B.puff);
  if (f < at || f > at + 30) return null;
  const t = f - at;
  return (
    <>
      {PUFFS.map(([dx, dy, sz], i) => {
        const d = i * 0.4;
        const k = clamp01((t - d) / 4);
        const g = 1 - (1 - k) ** 3;
        const fade = 1 - clamp01((t - d - 9) / 15);
        const op = Math.min(1, k * 1.6) * fade;
        if (op <= 0.01) return null;
        const r = (70 + 190 * g) * sz;
        const drift = clamp01((t - d) / 26);
        const x = 540 + dx * (0.4 + 0.6 * g) + Math.sign(dx) * 36 * drift;
        const y = 980 + dy * (0.4 + 0.6 * g) - 60 * drift;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: 2 * r,
              height: 2 * r,
              borderRadius: "50%",
              background: "radial-gradient(circle at 42% 38%, rgba(252,252,255,0.98) 0%, rgba(236,239,246,0.94) 38%, rgba(214,219,231,0.6) 70%, rgba(210,215,228,0) 100%)",
              opacity: op,
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </>
  );
};

// Joaquín's captions, one word at a time, the edit-pipeline renderer's word style (Poppins, white, a small pop, y 1515): a
// word holds until the next one starts if that is less than 0.35 s away, else 0.15 s past its end, never past its cut.
const CAP_Y = 1515;
const CAP_SIZE = 96;
const clean = (s: string) => s.replace(/[.,;:]+$/g, "").replace(/^[,.;:]+/g, "");
type Cap = { text: string; f0: number; f1: number };
let CAPS: Cap[] | null = null;
const caps = (): Cap[] => {
  if (CAPS) return CAPS;
  const out: Cap[] = [];
  for (const p of P) {
    if (p.role === "client" && p.beat === "VISTO") continue;
    p.words.forEach((w, i) => {
      const nxt = p.words[i + 1];
      let end = nxt && nxt.t - w.e < 0.35 ? nxt.t : w.e + 0.15;
      end = Math.max(end, w.t + 0.1);
      const f1 = Math.min(Math.round(end * th.fps), p.f1 - 1);
      const text = clean(w.text);
      if (text) out.push({ text, f0: w.f, f1 });
    });
  }
  CAPS = out;
  return out;
};
const Captions: React.FC<{ f: number }> = ({ f }) => {
  const c = caps().find((x) => f >= x.f0 && f < x.f1);
  if (!c) return null;
  const k = ramp(f, c.f0, c.f0 + 3, 0.86, 1);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: CAP_Y - CAP_SIZE * 0.6, display: "flex", justifyContent: "center", transform: `scale(${k.toFixed(3)})` }}>
      <div style={{ ...txt(CAP_SIZE, 700, { color: C.white, letterSpacing: "-0.03em", textShadow: "0 2px 18px rgba(0,0,0,0.55)" }) }}>{c.text}</div>
    </div>
  );
};

export const wallHide = (f: number) => Math.max(pricePresence(f), wirePresence(f), calPresence(f));

export const TH: React.FC = () => {
  const f = useCurrentFrame();
  if (P.length === 0) return null;
  const endAt = startF("END");
  if (f >= endAt - 1) return null;
  return (
    <AbsoluteFill>
      <Layer on="back">
        <WallThread f={f} hide={wallHide(f)} />
        <PriceBehind f={f} />
        <WireWall f={f} />
        <CalendarWall f={f} />
      </Layer>
      <Layer on="front">
        <Sticker f={f} />
        <ChipsTH f={f} />
        <ComposeTH f={f} />
        <Puff f={f} />
        <Captions f={f} />
      </Layer>
    </AbsoluteFill>
  );
};

export { easeOut, LAZY };
