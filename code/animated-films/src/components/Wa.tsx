import React from "react";
import { Img, staticFile } from "remotion";
import { clamp01, easeIn, easeOut, lerp, ramp, shown, SNAP, sp } from "../lib/anim";
import { measure } from "../lib/measure";
import { C, UI_FONT } from "../theme";
import { G3, Icon, Obj, txt } from "./base";
import { Caret, Keyboard, KB_H } from "./Phone";

// WhatsApp, the real thing (dark theme, Roboto, its greens): a thread whose messages stack from the bottom like the
// app and shift up as each one lands, the typing dots that morph into the message, a compose bar that types and
// sends. Rendered at AN-01's native width (1012) and scaled into whatever box it is given. Also a floating bubble, a
// notification card and the icon with its red counter.
export type WaMsg = { id: string; side: "in" | "out"; lines: string[]; list?: string[]; time: string; at: number; dots?: number; video?: { label: string; dur: string }; typed?: string };
const NATIVE_W = 1012;
const BODY = 42;
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
const DOTS_W = 150;
const DOTS_H = 84;
const HEADER_H = 148;
const COMPOSE_H = 132;
const VIDEO_W = 560;
const VIDEO_H = 330;
const bodyFont = `400 ${BODY}px Roboto`;
const timeFont = `400 ${TIME}px Roboto`;
const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", ...extra });

type Geo = { w: number; h: number; inlineTime: boolean };
const geo = (m: WaMsg): Geo => {
  const timeW = measure(m.time, timeFont) + (m.side === "out" ? 40 : 0);
  if (m.video) return { w: VIDEO_W + 2 * 8, h: VIDEO_H + 16 + (m.lines.length ? m.lines.length * LH + 10 : 0) + TIME + 10, inlineTime: false };
  if (m.list) {
    const lineW = Math.max(...m.list.map((s) => measure(s, bodyFont))) + 58;
    return { w: Math.min(MAX_W, Math.max(lineW, timeW) + 2 * PAD_X), h: PAD_T + m.list.length * LIST_LH + 4 + TIME + 6 + PAD_B, inlineTime: false };
  }
  const textW = Math.max(...m.lines.map((s) => measure(s, bodyFont)));
  if (m.lines.length === 1 && textW + timeW + 26 + 2 * PAD_X <= MAX_W) return { w: textW + timeW + 26 + 2 * PAD_X, h: PAD_T + LH + PAD_B, inlineTime: true };
  return { w: Math.max(textW, timeW) + 2 * PAD_X, h: PAD_T + m.lines.length * LH + 4 + TIME + 6 + PAD_B, inlineTime: false };
};

type Row = { m: WaMsg; raw: number; k: number; morph: number; h: number; w: number; y: number; x: number; tail: boolean; dots: boolean; inlineTime: boolean };
const layout = (msgs: WaMsg[], f: number, threadBottom: number, pillH: number): Row[] => {
  let acc = pillH + 16;
  let prevSide: string | null = null;
  const rows = msgs.map((m) => {
    const g = geo(m);
    const start = m.dots ?? m.at;
    const raw = sp(f, start, SNAP);
    const k = clamp01(raw);
    const dots = m.dots !== undefined;
    const morph = dots ? ramp(f, m.at, m.at + 7, 0, 1, easeOut) : 1;
    const h = dots ? lerp(DOTS_H, g.h, morph) : g.h;
    const w = dots ? lerp(DOTS_W, g.w, morph) : g.w;
    const gap = prevSide === m.side ? GAP : GROUP_GAP;
    const top = acc;
    acc += (h + gap) * k;
    const tail = prevSide !== m.side;
    prevSide = m.side;
    const x = m.side === "out" ? NATIVE_W - SIDE - w : SIDE;
    return { m, raw, k, morph, h, w, y: top, x, tail, dots, inlineTime: g.inlineTime };
  });
  const base = threadBottom - 14 - acc;
  return rows.map((r) => ({ ...r, y: base + r.y }));
};

const Ticks: React.FC<{ f: number; at: number; blueAt?: number }> = ({ f, at, blueAt }) => {
  const two = f >= at + 6;
  const blue = f >= (blueAt ?? at + 14);
  return <Icon name={two ? "ri:check-double-line" : "ri:check-line"} size={30} color={blue ? C.waBlue : "rgba(233,237,239,0.55)"} style={{ marginLeft: 6, marginBottom: -2 }} />;
};

const VideoCard: React.FC<{ f: number; label: string; dur: string; playAt?: number }> = ({ f, label, dur, playAt }) => {
  const pressed = playAt !== undefined && f >= playAt;
  return (
    <div style={{ width: VIDEO_W, height: VIDEO_H, borderRadius: 18, overflow: "hidden", position: "relative", background: "linear-gradient(160deg,#17315E 0%,#0A1E3F 100%)" }}>
      {/* a tiny page inside the thumbnail */}
      <div style={{ position: "absolute", left: 60, top: 40, width: 300, height: 250, borderRadius: 12, background: "#F7F8FB" }}>
        <div style={{ margin: "16px 16px 0", height: 10, width: 80, borderRadius: 5, background: C.navy, opacity: 0.6 }} />
        <div style={{ margin: "18px 16px 0", height: 16, width: 200, borderRadius: 8, background: C.navy }} />
        <div style={{ margin: "8px 16px 0", height: 16, width: 150, borderRadius: 8, background: C.navy }} />
        <div style={{ margin: "14px 16px 0", display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 54, borderRadius: 8, background: ["#DCE8F5", "#E8E3D4", "#D8E6E0"][i] }} />
          ))}
        </div>
        <div style={{ margin: "14px 16px 0", height: 26, width: 110, borderRadius: 13, background: C.wa }} />
      </div>
      <Img src={staticFile("avatar.png")} style={{ position: "absolute", right: 28, bottom: 28, width: 120, height: 120, borderRadius: 60, objectFit: "cover", border: "4px solid rgba(255,255,255,0.9)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: pressed ? 0 : 1 }}>
        <div style={{ width: 96, height: 96, borderRadius: 48, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="ri:play-fill" size={60} color={C.white} style={{ marginLeft: 6 }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 16, bottom: 14, height: 40, padding: "0 14px", borderRadius: 20, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", gap: 8, ...ui(24, 500, { color: C.white }) }}>
        <Icon name="solar:videocamera-bold" size={26} color={C.white} />
        {dur}
      </div>
      <div style={{ position: "absolute", left: 16, top: 14, ...ui(26, 500, { color: "rgba(255,255,255,0.85)" }) }}>{label}</div>
    </div>
  );
};

const Bubble: React.FC<{ f: number; r: Row; threadTop: number; listStep: number; blueAt?: number; playAt?: number }> = ({ f, r, threadTop, listStep, blueAt, playAt }) => {
  const { m, raw, morph, h, w } = r;
  const out = m.side === "out";
  const bg = out ? C.waOut : C.waIn;
  const dotsOn = r.dots && morph < 1;
  const textK = r.dots ? clamp01((morph - 0.45) / 0.55) : 1;
  const scale = 0.55 + 0.45 * Math.min(1.12, raw);
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y - threadTop, width: w, height: h, borderRadius: 22, borderTopLeftRadius: !out && r.tail ? 6 : 22, borderTopRightRadius: out && r.tail ? 6 : 22, background: bg, opacity: clamp01(raw * 1.6), transformOrigin: out ? "100% 100%" : "0% 100%", transform: `scale(${scale.toFixed(3)})`, boxShadow: "0 1px 1px rgba(0,0,0,0.35)" }}>
      {r.tail && (
        <svg width={16} height={18} style={{ position: "absolute", top: 0, [out ? "right" : "left"]: -13 }} viewBox="0 0 16 18">
          <path d={out ? "M0 0 L16 0 L0 17 Z" : "M16 0 L0 0 L16 17 Z"} fill={bg} />
        </svg>
      )}
      {dotsOn && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: 1 - clamp01(morph * 2) }}>
          {[0, 1, 2].map((i) => {
            const ph = (f - (m.dots ?? 0)) * 0.42 - i * 0.95;
            const b = Math.max(0, Math.sin(ph));
            return <div key={i} style={{ width: 17, height: 17, borderRadius: 9, background: `rgba(233,237,239,${(0.45 + 0.5 * b).toFixed(3)})`, transform: `translateY(${(-9 * b).toFixed(2)}px)` }} />;
          })}
        </div>
      )}
      {textK > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: textK, padding: m.video ? 8 : `${PAD_T}px ${PAD_X}px ${PAD_B}px`, boxSizing: "border-box" }}>
          {m.video && <VideoCard f={f} label={m.video.label} dur={m.video.dur} playAt={playAt} />}
          {m.video && m.lines.length > 0 && <div style={{ padding: "12px 14px 0" }}>{m.lines.map((line, i) => <div key={i} style={ui(BODY, 400, { color: C.waText, lineHeight: `${LH}px` })}>{line}</div>)}</div>}
          {!m.video && m.list
            ? m.list.map((line, i) => {
                const kk = sp(f, m.at + i * listStep, SNAP);
                if (kk <= 0) return null;
                return (
                  <div key={i} style={{ height: LIST_LH, display: "flex", alignItems: "center", gap: 16, opacity: clamp01(kk * 1.6), transform: `translateX(${((1 - clamp01(kk)) * -18).toFixed(2)}px)` }}>
                    <Icon name="solar:check-circle-bold" size={38} color={C.gold} />
                    <div style={ui(BODY, 400, { color: C.waText })}>{line}</div>
                  </div>
                );
              })
            : !m.video && m.lines.map((line, i) => <div key={i} style={ui(BODY, 400, { color: C.waText, lineHeight: `${LH}px` })}>{line}</div>)}
          <div style={{ position: "absolute", right: m.video ? 18 : PAD_X - 4, bottom: r.inlineTime ? PAD_B + 4 : m.video ? 12 : PAD_B, display: "flex", alignItems: "center", ...ui(TIME, 400, { color: C.waMuted }) }}>
            {m.time}
            {out && <Ticks f={f} at={m.at} blueAt={blueAt} />}
          </div>
        </div>
      )}
    </div>
  );
};

export const WaThread: React.FC<{
  f: number;
  w: number;
  h: number;
  msgs: WaMsg[];
  name: string;
  sub?: string;
  typingSub?: string;
  avatar?: string;
  compose?: { text: string; typed: number[]; sendAt: number };
  pill?: string;
  listStep?: number;
  blueAt?: number;
  playAt?: number;
  hint?: string;
}> = ({ f, w, h, msgs, name, sub = "en línea", typingSub = "escribiendo...", avatar = "avatar.png", compose, pill = "Hoy", listStep = 9, blueAt, playAt, hint = "Mensaje" }) => {
  const s = w / NATIVE_W;
  const H = h / s;
  const threadTop = HEADER_H;
  const kbOn = !!compose && f >= compose.typed[0] - 12 && f < compose.sendAt + 6;
  const kbH = kbOn ? KB_H(NATIVE_W) : 0;
  const threadBottom = H - COMPOSE_H - kbH;
  const rows = layout(msgs, f, threadBottom, PILL_H);
  const typing = msgs.some((m) => m.dots !== undefined && f >= m.dots && f < m.at);
  const n = compose ? shown(compose.typed, f) : 0;
  const sent = compose ? f >= compose.sendAt : false;
  const text = compose && !sent ? compose.text.slice(0, n) : "";
  const press = compose ? ramp(f, compose.sendAt, compose.sendAt + 2) - ramp(f, compose.sendAt + 2, compose.sendAt + 8) : 0;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: NATIVE_W, height: H, transform: `scale(${s})`, transformOrigin: "0 0", background: C.waBg, overflow: "hidden" }}>
      {/* header */}
      <div style={{ position: "absolute", left: 0, top: 0, width: NATIVE_W, height: HEADER_H, background: C.waBar, display: "flex", alignItems: "center", padding: "0 30px 0 22px", boxSizing: "border-box", gap: 18 }}>
        <Icon name="ri:arrow-left-line" size={46} color="#AEBAC1" />
        {avatar ? <Img src={staticFile(avatar)} style={{ width: 88, height: 88, borderRadius: 44, objectFit: "cover", marginLeft: 4 }} /> : <div style={{ width: 88, height: 88, borderRadius: 44, marginLeft: 4, background: "#6B7C85", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="solar:user-bold" size={56} color="#CFD8DC" /></div>}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, marginLeft: 8 }}>
          <div style={ui(38, 500, { color: C.waText })}>{name}</div>
          <div style={ui(28, 400, { color: typing ? C.waGreenUi : "#8696A0" })}>{typing ? typingSub : sub}</div>
        </div>
        <Icon name="ri:vidicon-line" size={44} color="#AEBAC1" />
        <Icon name="ri:phone-line" size={42} color="#AEBAC1" style={{ marginLeft: 26 }} />
        <Icon name="ri:more-2-fill" size={44} color="#AEBAC1" style={{ marginLeft: 22 }} />
      </div>
      {/* thread */}
      <div style={{ position: "absolute", left: 0, top: threadTop, width: NATIVE_W, height: threadBottom - threadTop, overflow: "hidden" }}>
        {rows.length > 0 && rows[0].k > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: rows[0].y - threadTop - PILL_H - 16, display: "flex", justifyContent: "center" }}>
            <div style={{ height: PILL_H, padding: "0 22px", borderRadius: 12, background: C.waDate, display: "flex", alignItems: "center", ...ui(25, 500, { color: "#8696A0", letterSpacing: "0.02em" }) }}>{pill.toUpperCase()}</div>
          </div>
        )}
        {rows.map((r) => (r.k <= 0 || r.y + r.h < threadTop - 20 ? null : <Bubble key={r.m.id} f={f} r={r} threadTop={threadTop} listStep={listStep} blueAt={blueAt} playAt={playAt} />))}
      </div>
      {/* compose */}
      <div style={{ position: "absolute", left: 0, top: H - COMPOSE_H - kbH, width: NATIVE_W, height: COMPOSE_H, background: C.waBg, display: "flex", alignItems: "center", padding: "0 20px", boxSizing: "border-box", gap: 16 }}>
        <div style={{ flex: 1, height: 92, borderRadius: 46, background: "#2A3942", display: "flex", alignItems: "center", padding: "0 26px", boxSizing: "border-box", gap: 18 }}>
          <Icon name="ri:emotion-line" size={42} color="#8696A0" />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            <div style={ui(38, 400, { color: text ? C.waText : "#8696A0" })}>{text || hint}</div>
            <Caret f={f} on={!!compose && !sent && f >= compose.typed[0] - 12} h={44} color={C.waGreenUi} ml={text ? 2 : -2} />
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
      {compose && <Keyboard f={f} w={NATIVE_W} y={H - kbH} typed={compose.typed} text={compose.text} dark show={kbOn} />}
    </div>
  );
};

// A single WhatsApp bubble floating in the stage (a message shown as a quote), with its tail and time.
export const WaBubble: React.FC<{ f: number; at: number; out?: number; x: number; y: number; w?: number; lines: string[]; time: string; side?: "in" | "out"; size?: number; tz?: number; lineAt?: number[] }> = ({ f, at, out, x, y, w = 760, lines, time, side = "in", size = 40, tz = 140, lineAt }) => {
  const k = sp(f, at, { damping: 15, stiffness: 120, mass: 0.9 });
  if (k <= 0) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 10, 0, 1, easeIn);
  if (o >= 1) return null;
  const lh = size * 1.3;
  const h = 20 + lines.length * lh + 14 + 28 + 14;
  const bg = side === "out" ? C.waOut : C.waIn;
  return (
    <Obj opacity={clamp01(k * 1.6) * (1 - o)}>
      <G3 x={x} y={y - 30 * o} w={w} h={h} tz={tz} s={0.8 + 0.2 * Math.min(1.08, k)}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 26, borderTopLeftRadius: side === "in" ? 6 : 26, borderTopRightRadius: side === "out" ? 6 : 26, background: bg, boxShadow: "0 30px 60px rgba(0,0,0,0.55)", padding: "20px 26px 14px", boxSizing: "border-box" }}>
          <svg width={20} height={22} style={{ position: "absolute", top: 0, [side === "out" ? "right" : "left"]: -16 }} viewBox="0 0 16 18">
            <path d={side === "out" ? "M0 0 L16 0 L0 17 Z" : "M16 0 L0 0 L16 17 Z"} fill={bg} />
          </svg>
          {lines.map((l, i) => {
            const lk = lineAt && lineAt[i] !== undefined ? clamp01(sp(f, lineAt[i], SNAP) * 1.5) : 1;
            return (
              <div key={i} style={{ ...ui(size, 400, { color: C.waText, lineHeight: `${lh}px`, whiteSpace: "normal" }), opacity: lk, transform: `translateY(${((1 - lk) * 10).toFixed(1)}px)` }}>
                {l}
              </div>
            );
          })}
          <div style={{ position: "absolute", right: 22, bottom: 12, display: "flex", alignItems: "center", ...ui(26, 400, { color: C.waMuted }) }}>
            {time}
            {side === "out" && <Icon name="ri:check-double-line" size={30} color={C.waBlue} style={{ marginLeft: 6 }} />}
          </div>
        </div>
      </G3>
    </Obj>
  );
};

// A WhatsApp notification card (the lock-screen kind), for messages arriving on a phone seen from outside.
export const WaNotif: React.FC<{ f: number; at: number; out?: number; x: number; y: number; w?: number; body: string; title?: string; time?: string; rot?: number; s?: number; icon?: boolean }> = ({ f, at, out, x, y, w = 860, body, title = "WhatsApp", time = "ahora", rot = 0, s = 1 }) => {
  const k = sp(f, at, SNAP);
  if (k <= 0) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 10, 0, 1, easeIn);
  if (o >= 1) return null;
  const h = 116;
  return (
    <Obj opacity={clamp01(k * 2) * (1 - o)}>
      <G3 x={x} y={y} w={w} h={h} rz={rot} s={s * (1.3 - 0.3 * Math.min(1, k))}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: "rgba(16,27,50,0.97)", border: "1.5px solid rgba(255,255,255,0.14)", boxShadow: "0 18px 36px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 22, padding: "0 28px 0 22px" }}>
          <Img src={staticFile("whatsapp_icono.svg")} style={{ width: 70, height: 70, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={txt(32, 700, { color: C.white })}>{title}</div>
            <div style={txt(28, 500, { color: C.grayMid, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" })}>{body}</div>
          </div>
          <div style={txt(24, 500, { color: "#8A93A6", alignSelf: "flex-start", marginTop: 24 })}>{time}</div>
        </div>
      </G3>
    </Obj>
  );
};

// The WhatsApp icon with its red counter, bumping on every arrival.
export const WaBadge: React.FC<{ f: number; at: number; x: number; y: number; count: string; bumpAt?: number; size?: number; out?: number }> = ({ f, at, x, y, count, bumpAt, size = 132, out }) => {
  const k = sp(f, at, SNAP);
  if (k <= 0) return null;
  const o = out === undefined ? 0 : ramp(f, out, out + 10);
  if (o >= 1) return null;
  const b = bumpAt === undefined ? 0 : ramp(f, bumpAt, bumpAt + 2) - ramp(f, bumpAt + 2, bumpAt + 8);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: clamp01(k * 1.6) * (1 - o), transform: `scale(${(Math.min(1.1, k) * (1 + 0.12 * b)).toFixed(3)})` }}>
      <Img src={staticFile("whatsapp_icono.svg")} style={{ width: size, height: size }} />
      {count !== "0" && (
        <div style={{ position: "absolute", left: size * 0.58, top: -size * 0.12, minWidth: size / 2, height: size / 2, padding: "0 12px", borderRadius: size / 4, background: "#FF3B30", border: "4px solid #0B2042", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", ...txt(size * 0.23, 800, { color: C.white, letterSpacing: 0 }) }}>{count}</div>
      )}
    </div>
  );
};
