import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, Obj, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { Beats, HeadCopy } from "../components/Head";
import { BigGold, CalendarStrip, Chip, Panel } from "../components/Kit";
import { Screen, Tap } from "../components/Phone";
import { SitePage } from "../components/Site";
import { WaBubble, WaNotif, WaThread } from "../components/Wa";
import { clamp01, easeIn, easeInOut, easeOut, lerp, pres, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, GOLD_GRAD, PANEL, STAGE_BG } from "../theme";
import copy from "./an08/copy.json";
import cues from "./an08/cues.json";

// AN-08 "El turno de noche": almost four of every ten contacts arrive outside hours. The sky crosses to night, the
// shop closes, the page in the window stays lit; someone walks up at 02:14, reads what you do and where, taps
// WhatsApp; the owner's phone lights in silence; in the morning the messages are there. 14 days, 24 hours.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const SKY = { x: 60, y: 640, w: 960, h: 960, r: 44 };

// 0 = day, 1 = night
const nightK = (f: number) => {
  const n1 = ramp(f, F.sky.night[0], F.sky.night[1], 0, 1, easeInOut);
  const dawn = ramp(f, F.sky.dawn[0], F.sky.dawn[1], 0, 1, easeInOut);
  const cp = ramp(f, F.sky.cycle.at, F.sky.cycle.at + F.sky.cycle.dur);
  const cyc = cp > 0 && cp < 1 ? (1 - Math.cos(Math.PI * 2 * 2 * cp)) / 2 : 0;
  return clamp01(n1 - dawn + cyc);
};

const STARS = Array.from({ length: 60 }, (_, i) => ({ x: (i * 173) % SKY.w, y: ((i * 97) % (SKY.h * 0.55)) + 20, r: 1.5 + ((i * 7) % 3), tw: (i * 13) % 20 }));

const Sky: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.sky.in) return null;
  const k = pres(f, F.sky.in, F.sky.out, { damping: 18, stiffness: 80, mass: 1 }, 14);
  const n = nightK(f);
  const sunX = SKY.x + 120 + (SKY.w - 240) * n;
  const sunY = SKY.y + 170 - 90 * Math.sin(Math.PI * n);
  return (
    <Obj opacity={k}>
      <div style={{ position: "absolute", left: SKY.x, top: SKY.y, width: SKY.w, height: SKY.h, borderRadius: SKY.r, overflow: "hidden", boxShadow: "0 0 0 2px rgba(255,255,255,0.08), 0 40px 90px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#9CC4EC 0%,#D7E7F6 55%,#EEF3F8 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#07122B 0%,#0C1F45 60%,#132A55 100%)", opacity: n }} />
        {STARS.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: s.r, background: "#fff", opacity: n * (0.5 + 0.5 * Math.abs(Math.sin((f + s.tw) * 0.15))) }} />
        ))}
        {/* sun / moon */}
        <div style={{ position: "absolute", left: sunX - SKY.x - 54, top: sunY - SKY.y - 54, width: 108, height: 108, borderRadius: 54, background: n < 0.5 ? "radial-gradient(circle at 40% 40%, #FFF2C2 0%, #F5A83C 70%)" : "radial-gradient(circle at 40% 40%, #FFFFFF 0%, #D9E3F2 70%)", boxShadow: n < 0.5 ? "0 0 60px rgba(245,168,60,0.55)" : "0 0 40px rgba(220,230,255,0.4)", opacity: 0.6 + 0.4 * Math.abs(1 - 2 * n) }} />
        {/* ground */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: lerpColor("#B9C9A8", "#1B2A3D", n) }} />
      </div>
    </Obj>
  );
};

const lerpColor = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// ten people, four of them gold, and the number
const People: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.people[0] || f > F.stat.out + 12) return null;
  const o = ramp(f, F.stat.out, F.stat.out + 10, 0, 1, easeIn);
  return (
    <Obj opacity={1 - o}>
      {F.people.map((t, i) => {
        const k = sp(f, t, SNAP);
        if (k <= 0) return null;
        const gi = F.goldPeople[i];
        const g = gi !== undefined ? clamp01(sp(f, gi, SNAP)) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 136 + i * 82, top: 1400 - 40 * o, width: 74, height: 74, borderRadius: 37, background: g > 0.02 ? GOLD_GRAD : PANEL, border: `2px solid ${g > 0.02 ? "rgba(255,230,180,0.7)" : "rgba(255,255,255,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: clamp01(k * 1.5), transform: `scale(${(Math.min(1.08, k) * (1 + 0.15 * Math.sin(Math.PI * g))).toFixed(3)})`, boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>
            <Icon name="solar:user-rounded-bold-duotone" size={48} color={g > 0.02 ? C.navy : C.grayMid} />
          </div>
        );
      })}
      <BigGold f={f} at={F.stat.in} text={copy.stat.big} size={118} y={1090} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1180, textAlign: "center", opacity: clamp01(sp(f, F.stat.in + 6, SNAP) * 1.5), ...txt(40, 600, { color: C.grayLight }) }}>{copy.stat.sub}</div>
    </Obj>
  );
};

// an analog clock on a card, its hands spinning between two times, the label switching at the end of the spin
const Clock: React.FC<{ f: number; at: number; out: number; x: number; y: number; from: number; to: number; spin: number[]; label: string; label2?: string; spin2?: number[]; to2?: number; label3?: string }> = ({ f, at, out, x, y, from, to, spin, label, label2, spin2, to2, label3 }) => {
  const p1 = ramp(f, spin[0], spin[1], 0, 1, easeInOut);
  const p2 = spin2 ? ramp(f, spin2[0], spin2[1], 0, 1, easeInOut) : 0;
  const t = lerp(lerp(from, to, p1), to2 ?? to, p2);
  const ha = (t % 12) * 30;
  const ma = ((t * 60) % 60) * 6;
  const lbl = spin2 && f >= spin2[1] - 4 ? label3 ?? label2 : f >= spin[1] - 4 ? label2 ?? label : label;
  const W = 520;
  const H = 220;
  return (
    <Panel f={f} at={at} out={out} x={x} y={y} w={W} h={H} r={34}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 28, padding: "0 30px" }}>
        <svg width={150} height={150} viewBox="0 0 150 150">
          <circle cx={75} cy={75} r={70} fill="#F7F8FB" stroke="rgba(255,255,255,0.5)" strokeWidth={3} />
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={i} x1={75} y1={12} x2={75} y2={i % 3 === 0 ? 24 : 18} stroke={C.navy} strokeWidth={i % 3 === 0 ? 4 : 2} transform={`rotate(${i * 30} 75 75)`} />
          ))}
          <line x1={75} y1={75} x2={75} y2={38} stroke={C.navy} strokeWidth={7} strokeLinecap="round" transform={`rotate(${ha} 75 75)`} />
          <line x1={75} y1={75} x2={75} y2={22} stroke={C.navy} strokeWidth={4} strokeLinecap="round" transform={`rotate(${ma} 75 75)`} />
          <circle cx={75} cy={75} r={6} fill={C.gold} />
        </svg>
        <div style={txt(38, 700, { color: C.white, whiteSpace: "normal", lineHeight: 1.15 })}>{lbl}</div>
      </div>
    </Panel>
  );
};

// the shop at the bottom of the sky: a facade, the lit page standing in the window, the door with its shutter,
// two street lamps, the visitor who walks up at night
const SHOP = { x: 190, y: 1080, w: 700, h: 480 };
const WIN = { x: SHOP.x + 40, y: SHOP.y + 76, w: 380, h: 360 };
const DOOR = { x: SHOP.x + 500, y: SHOP.y + 200, w: 150, h: 280 };
const Shop: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.shop.in || f > F.shop.out + 12) return null;
  const k = pres(f, F.shop.in, F.shop.out, SNAP, 10);
  const n = nightK(f);
  const sh = ramp(f, F.shutter.at, F.shutter.at + F.shutter.dur, 0, 1, easeIn);
  const lamps = f >= F.lamps ? 0 : 1;
  const lit = f >= F.pageLit;
  const vp = ramp(f, F.visitor.at, F.visitor.at + F.visitor.dur, 0, 1, easeOut);
  const vx = lerp(1040, WIN.x + WIN.w + 50, vp);
  const bob = vp > 0 && vp < 1 ? Math.abs(Math.sin(f * 0.8)) * 6 : 0;
  return (
    <Obj opacity={k}>
      {/* lamps */}
      {[110, 970].map((lx, i) => (
        <div key={i} style={{ position: "absolute", left: lx - 6, top: SHOP.y + 120, width: 12, height: 416, background: "#3A4556", borderRadius: 6 }}>
          <div style={{ position: "absolute", left: -22, top: -30, width: 56, height: 40, borderRadius: "28px 28px 8px 8px", background: lamps || n < 0.5 ? "#F8E7B5" : "#55606E", boxShadow: lamps && n > 0.3 ? "0 0 60px 20px rgba(248,231,181,0.35)" : "none" }} />
        </div>
      ))}
      {/* facade */}
      <div style={{ position: "absolute", left: SHOP.x, top: SHOP.y, width: SHOP.w, height: SHOP.h, borderRadius: "22px 22px 0 0", background: lerpColor("#D9CFBD", "#2B3448", n), boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, borderRadius: "22px 22px 0 0", background: lerpColor("#B5523A", "#4A2A24", n), display: "flex", alignItems: "center", justifyContent: "center", ...txt(28, 800, { color: "rgba(255,255,255,0.92)" }) }}>{copy.shop.name}</div>
        {/* window with the page standing in it */}
        <div style={{ position: "absolute", left: WIN.x - SHOP.x, top: WIN.y - SHOP.y, width: WIN.w, height: WIN.h, borderRadius: 14, background: lerpColor("#CFE3F3", "#0B1526", n), border: `10px solid ${lerpColor("#F2EBDD", "#1A2235", n)}`, boxSizing: "border-box", overflow: "hidden", boxShadow: lit ? "inset 0 0 60px rgba(245,168,60,0.25)" : "none" }}>
          <div style={{ position: "absolute", left: 40, top: 16, width: 280, height: 320, borderRadius: 18, overflow: "hidden", boxShadow: lit ? "0 0 40px rgba(245,168,60,0.45)" : "0 6px 20px rgba(0,0,0,0.3)", filter: lit ? "none" : `brightness(${(1 - 0.5 * n).toFixed(2)})` }}>
            <SitePage f={f} w={280} h={320} copy={copy.page} at={F.shop.in} accent="gold" tileKind="house" marks={{ what: F.reads[0], where: F.reads[1] }} markLabels={{ what: copy.reads[0], where: copy.reads[1], who: "" }} tapWaAt={F.tapWa} />
          </div>
        </div>
        {/* door and its shutter */}
        <div style={{ position: "absolute", left: DOOR.x - SHOP.x, top: DOOR.y - SHOP.y, width: DOOR.w, height: DOOR.h, borderRadius: "10px 10px 0 0", background: lerpColor("#6B4F3A", "#2A2119", n), overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: DOOR.h * sh, background: "repeating-linear-gradient(180deg,#8A94A3 0px,#8A94A3 14px,#5E6878 14px,#5E6878 20px)" }} />
          {sh >= 1 && (
            <div style={{ position: "absolute", left: 14, right: 14, top: 110, height: 44, borderRadius: 8, background: "#F7F8FB", display: "flex", alignItems: "center", justifyContent: "center", ...txt(22, 800, { color: "#B3262B" }) }}>{copy.shop.sign}</div>
          )}
        </div>
      </div>
      {/* the visitor */}
      {vp > 0 && (
        <div style={{ position: "absolute", left: vx - 40, top: SHOP.y + SHOP.h - 110 - bob, width: 80, height: 80, borderRadius: 40, background: PANEL, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 26px rgba(0,0,0,0.5)" }}>
          <Icon name="solar:user-rounded-bold-duotone" size={52} color={C.gold} />
        </div>
      )}
      {f >= F.visitor.at + F.visitor.dur && f < F.tapWa + 20 && <Tap f={f} at={F.tapWa} x={WIN.x + WIN.w - 46} y={WIN.y + WIN.h - 50} />}
    </Obj>
  );
};

// the owner's nightstand: the phone face up, dark, then one notification in silence
const Nightstand: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.nightstand.in || f > F.nightstand.out + 12) return null;
  const on = f >= F.silentNotif;
  return (
    <>
      <Panel f={f} at={F.nightstand.in} out={F.nightstand.out} x={870} y={880} w={280} h={240} r={30}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon name="solar:sleeping-bold-duotone" size={54} color={C.grayMid} />
          <div style={{ width: 110, height: 150, borderRadius: 16, background: on ? "#16243A" : "#05080C", border: "3px solid rgba(255,255,255,0.18)", boxSizing: "border-box", position: "relative", boxShadow: on ? "0 0 30px rgba(120,170,255,0.35)" : "none", overflow: "hidden" }}>
            {on && (
              <div style={{ position: "absolute", left: 8, right: 8, top: 40, height: 44, borderRadius: 10, background: "rgba(16,27,50,0.97)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                <Icon name="ri:whatsapp-fill" size={18} color={C.wa} />
                <div style={{ height: 8, flex: 1, borderRadius: 4, background: "rgba(255,255,255,0.5)" }} />
              </div>
            )}
          </div>
        </div>
      </Panel>
      <Chip f={f} at={F.nightClock} out={F.nightstand.out} x={210} y={880} text={copy.clock.night} icon="solar:clock-circle-bold-duotone" tone="dark" size={34} />
    </>
  );
};

const Morning: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phone.in || f > F.phone.out + 12) return null;
  const k = pres(f, F.phone.in, F.phone.out, SNAP, 10);
  const msgs = copy.messages.map((m, i) => ({ id: `m${i}`, side: "in" as const, lines: [m], time: copy.times[i], at: F.msgs[i] }));
  return (
    <Screen x={230} y={760} w={620} h={800} k={k} bg={C.waBg}>
      <WaThread f={f} w={620} h={800} msgs={msgs} name="WhatsApp" avatar="" sub="3 chats nuevos" pill="Hoy" />
    </Screen>
  );
};

const Offer: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.cal.in || f > F.cal.out + 14) return null;
  const b = sp(f, F.badge, SNAP);
  const o = ramp(f, F.cal.out, F.cal.out + 10);
  const n = nightK(f);
  return (
    <>
      <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={900} />
      {copy.steps.map((s, i) => (
        <Chip key={s} f={f} at={F.steps[i]} out={F.cal.out} x={[270, 540, 810][i]} y={1130} text={s} icon="solar:check-circle-bold" size={28} />
      ))}
      {b > 0 && (
        <Obj opacity={clamp01(b * 1.5) * (1 - o)}>
          <div style={{ position: "absolute", left: 540 - 110, top: 1300, width: 220, height: 220, borderRadius: 110, background: GOLD_GRAD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 24px 50px rgba(0,0,0,0.5), 0 0 ${(40 * n).toFixed(0)}px rgba(245,168,60,0.45)`, transform: `scale(${Math.min(1.1, b).toFixed(3)})` }}>
            <Icon name={n > 0.5 ? "solar:moon-stars-bold-duotone" : "solar:sun-bold-duotone"} size={64} color={C.navy} />
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 56, color: C.navy, letterSpacing: "-0.03em", lineHeight: 1 }}>{copy.badge}</div>
          </div>
        </Obj>
      )}
    </>
  );
};

const Reply: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.clock2.in || f > F.clock2.out + 12) return null;
  const d = f >= F.dots && f < F.reply ? clamp01(sp(f, F.dots, SNAP) * 1.5) : 0;
  return (
    <>
      <Clock f={f} at={F.clock2.in} out={F.clock2.out} x={540} y={1150} from={2} to={7.5} spin={F.clock2.spin} label={copy.clock.tuesday} label2={copy.clock.morning} />
      {d > 0 && (
        <div style={{ position: "absolute", left: 540 - 90, top: 1360, width: 180, height: 84, borderRadius: 22, borderTopLeftRadius: 6, background: C.waIn, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: d, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
          {[0, 1, 2].map((i) => {
            const ph = (f - F.dots) * 0.42 - i * 0.95;
            const bb = Math.max(0, Math.sin(ph));
            return <div key={i} style={{ width: 17, height: 17, borderRadius: 9, background: `rgba(233,237,239,${(0.45 + 0.5 * bb).toFixed(3)})`, transform: `translateY(${(-9 * bb).toFixed(2)}px)` }} />;
          })}
        </div>
      )}
      <WaBubble f={f} at={F.reply} out={F.clock2.out} x={540} y={1410} w={760} lines={[copy.reply]} time="07:31" side="in" size={38} />
    </>
  );
};

export const AN08: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <Sky f={f} />
          <People f={f} />
          <Clock f={f} at={F.clock.in} out={F.clock.out} x={540} y={780} from={9} to={14.5} spin={F.clock.spin1} label={copy.clock.sunday} label2={copy.clock.tuesday} spin2={F.clock.spin2} to2={26} label3={copy.clock.tuesday} />
          <Shop f={f} />
          <Nightstand f={f} />
          <Morning f={f} />
          <Offer f={f} />
          <Reply f={f} />
          <Beats f={f} beats={BEATS} text={T} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
