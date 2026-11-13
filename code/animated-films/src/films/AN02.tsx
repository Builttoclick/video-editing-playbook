import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, Obj, G3, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { GooglePage } from "../components/Google";
import { Beats, HeadCopy } from "../components/Head";
import { CalendarStrip, Chip, Panel } from "../components/Kit";
import { Screen } from "../components/Phone";
import { Scan, SitePage } from "../components/Site";
import { WaBadge, WaNotif, WaThread } from "../components/Wa";
import { clamp01, easeIn, easeOut, lerp, pres, ramp, shown, SNAP, sp } from "../lib/anim";
import { C, GOLD_GRAD, PANEL, STAGE_BG, UI_FONT } from "../theme";
import copy from "./an02/copy.json";
import cues from "./an02/cues.json";

// AN-02 "Ahora mismo": PAS from the phone of the person searching. Someone types what you sell into Google, opens
// the first result, understands it in three seconds and writes to that other business; you never know; it happens
// while you work, drive and sleep; the other has a page that tells Google what, where and for whom; we make that
// page in 14 days; next time, the message lands on your phone. No voice: the script is on screen, word by word.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const PH = { x: 150, y: 640, w: 780, h: 960 };
const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", ...extra });

const Texts: React.FC<{ f: number }> = ({ f }) => <Beats f={f} beats={BEATS} text={T} />;

// Scene A: the searcher's phone. Google types the query, the first result opens as a page, the WhatsApp button is
// tapped and the message leaves.
const CHECK_POS = [
  { x: PH.x + 250, y: PH.y + 128 },
  { x: PH.x + 390, y: PH.y + 455 },
  { x: PH.x + PH.w - 210, y: PH.y + PH.h - 150 },
];
const PhoneScene: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phone.in || f > F.phone.out + 12) return null;
  const k = pres(f, F.phone.in, F.phone.out, SNAP, 10);
  const siteK = ramp(f, F.site.in, F.site.in + 6, 0, 1, easeOut);
  const chatK = ramp(f, F.chat.in, F.chat.in + 6, 0, 1, easeOut);
  return (
    <>
      <Screen x={PH.x} y={PH.y} w={PH.w} h={PH.h} k={k}>
        {f < F.site.in + 6 && (
          <GooglePage f={f} w={PH.w} h={PH.h} barAt={F.bar} query={copy.query} typed={F.typed} suggestions={copy.suggestions} suggestAt={F.suggest} enterAt={F.enter} results={copy.results} resultsAt={F.results} tapAt={F.tap1} tapIndex={0} />
        )}
        {f >= F.site.in && f < F.chat.in + 6 && (
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${((1 - siteK) * PH.w).toFixed(1)}px)` }}>
            <SitePage f={f} w={PH.w} h={PH.h} copy={copy.site} at={F.site.in} blocksAt={F.site.blocks} accent="green" tapWaAt={F.tapWa} />
          </div>
        )}
        {f >= F.chat.in && (
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${((1 - chatK) * PH.h).toFixed(1)}px)` }}>
            <WaThread f={f} w={PH.w} h={PH.h} msgs={[{ id: "m1", side: "out", lines: [copy.chat.message], time: copy.chat.time, at: F.msg }]} name={copy.chat.name} avatar="" compose={{ text: copy.chat.message, typed: F.msgTyped, sendAt: F.send }} />
          </div>
        )}
      </Screen>
      {/* three things understood in three seconds: a gold check on each */}
      {copy.checks.map((c, i) => (
        <Chip key={i} f={f} at={F.check[i]} out={F.chat.in - 2} x={CHECK_POS[i].x} y={CHECK_POS[i].y} text={c} icon="solar:check-circle-bold" size={30} tz={160} />
      ))}
    </>
  );
};

// A phone seen from outside: a dark locked screen, a WhatsApp notification when it lights up, a label under it and
// the red counter over its corner.
const MINI = { w: 330, h: 480 };
const PhoneMini: React.FC<{ f: number; x: number; y: number; k: number; label: string; litAt?: number; body?: string; count: string; bumpAt?: number; dimLabel?: boolean }> = ({ f, x, y, k, label, litAt, body, count, bumpAt }) => {
  const lit = litAt !== undefined && f >= litAt;
  const glow = litAt === undefined ? 0 : clamp01(ramp(f, litAt, litAt + 6));
  return (
    <Obj opacity={clamp01(k * 1.5)}>
      <div style={{ position: "absolute", left: x - MINI.w / 2, top: y - MINI.h / 2, width: MINI.w, height: MINI.h, transform: `scale(${(0.92 + 0.08 * Math.min(1.04, k)).toFixed(3)})` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 44, background: `linear-gradient(180deg, rgba(${lit ? "22,36,56" : "6,10,16"},1) 0%, rgba(${lit ? "10,22,40" : "3,5,9"},1) 100%)`, boxShadow: `0 0 0 3px rgba(255,255,255,0.12), 0 30px 70px rgba(0,0,0,0.6)${lit ? `, 0 0 ${60 * glow}px rgba(120,170,255,${0.25 * glow})` : ""}`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 54, textAlign: "center", ...ui(64, 300, { color: lit ? "#E9EDEF" : "rgba(233,237,239,0.25)" }) }}>10:42</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 128, textAlign: "center", ...ui(22, 400, { color: lit ? "rgba(233,237,239,0.7)" : "rgba(233,237,239,0.18)" }) }}>jueves 6 de noviembre</div>
          {lit && body && (
            <div style={{ position: "absolute", left: 16, right: 16, top: 190, transform: "scale(1)", transformOrigin: "0 0" }}>
              <div style={{ position: "relative", width: MINI.w - 32, height: 100 }}>
                <WaNotif f={f} at={litAt!} x={(MINI.w - 32) / 2} y={50} w={MINI.w - 32} body={body} s={0.74} />
              </div>
            </div>
          )}
          <div style={{ position: "absolute", left: MINI.w / 2 - 60, bottom: 14, width: 120, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)" }} />
        </div>
      </div>
      {count !== "0" && litAt !== undefined && <WaBadge f={f} at={litAt} x={x < 540 ? x - MINI.w / 2 + 10 : x + MINI.w / 2 - 10} y={y - MINI.h / 2 + 10} count={count} bumpAt={bumpAt} size={110} />}
      <div style={{ position: "absolute", left: x - 150, top: y + MINI.h / 2 + 26, width: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ height: 62, padding: "0 28px", borderRadius: 31, background: PANEL, border: "1.5px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", ...txt(30, 700, { color: C.white }) }}>{label}</div>
      </div>
    </Obj>
  );
};

// Scene B: two phones on the desk. The other lights up; the searcher between them dissolves; three vignettes send
// one message each, then a burst, while the other's counter climbs.
const TWO = { y: 1000, left: 262, right: 818 };
const VIG = { y: 1480, xs: [250, 540, 830], w: 250, h: 230 };
const arc = (a: { x: number; y: number }, b: { x: number; y: number }, p: number, lift: number) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) - lift * Math.sin(Math.PI * p) });
const TwoPhones: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.two.in || f > F.two.out + 12) return null;
  const k = pres(f, F.two.in, F.two.out, SNAP, 10);
  const badge = { x: TWO.right + MINI.w / 2 - 10, y: TWO.y - MINI.h / 2 + 10 };
  const PY = TWO.y - 150;
  const landed = [...F.dots, ...F.burst].filter((t) => t + F.flyLen <= f);
  const count = 1 + landed.length;
  const bumpAt = landed.length ? Math.max(...landed) + F.flyLen : F.badge1;
  const pg = ramp(f, F.person.gone, F.person.gone + 20);
  const pk = sp(f, F.person.in, SNAP);
  return (
    <>
      <PhoneMini f={f} x={TWO.left} y={TWO.y} k={k} label={copy.phones.you} count="0" />
      <PhoneMini f={f} x={TWO.right} y={TWO.y} k={k} label={copy.phones.other} litAt={F.badge1} body={copy.chat.message} count={f >= F.badge1 ? String(count) : "0"} bumpAt={bumpAt} />
      {/* the searcher, between the phones, dissolving */}
      {pk > 0 && pg < 1 && (
        <Obj opacity={clamp01(pk * 1.6) * (1 - pg) * k} blur={10 * pg}>
          <div style={{ position: "absolute", left: 540 - 64, top: PY - 64, width: 128, height: 128, borderRadius: 64, background: GOLD_GRAD, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(Math.min(1.1, pk) * (1 + 0.25 * pg)).toFixed(3)})`, boxShadow: "0 16px 36px rgba(0,0,0,0.45)" }}>
            <Icon name="solar:user-rounded-bold-duotone" size={84} color={C.navy} />
          </div>
          <div style={{ position: "absolute", left: 540 - 110, top: PY + 78, width: 220, textAlign: "center", ...txt(24, 600, { color: C.grayMid, whiteSpace: "normal", lineHeight: 1.15 }) }}>{copy.phones.person}</div>
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
            <path d={`M ${540 + 72} ${PY - 20} Q ${760} ${PY - 150} ${badge.x - 30} ${badge.y + 50}`} stroke="rgba(245,168,60,0.7)" strokeWidth={5} strokeDasharray="10 14" fill="none" />
          </svg>
        </Obj>
      )}
      {/* three vignettes */}
      {copy.vignettes.map((v, i) => (
        <Panel key={i} f={f} at={F.vignettes[i]} out={F.two.out} x={VIG.xs[i]} y={VIG.y} w={VIG.w} h={VIG.h} r={28}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Icon name={v.icon as "solar:shop-bold-duotone"} size={104} color={C.gold} />
            <div style={txt(30, 700, { color: C.white })}>{v.label}</div>
          </div>
        </Panel>
      ))}
      {/* the messages flying to the other phone */}
      {[...F.dots, ...F.burst].map((t, i) => {
        if (f < t || f > t + F.flyLen) return null;
        const p = ramp(f, t, t + F.flyLen, 0, 1, easeIn);
        const from = { x: VIG.xs[i % 3], y: VIG.y - 40 };
        const pt = arc(from, badge, p, 180);
        const s = 1 - 0.45 * p;
        return (
          <div key={i} style={{ position: "absolute", left: pt.x - 34, top: pt.y - 34, width: 68, height: 68, borderRadius: 34, background: C.wa, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s.toFixed(3)})`, opacity: 1 - ramp(f, t + F.flyLen - 2, t + F.flyLen) }}>
            <Icon name="ri:whatsapp-fill" size={44} color={C.white} />
          </div>
        );
      })}
    </>
  );
};

// Scene C: the other's page, read top to bottom; three lines light up: what, where, for whom.
const PG = { x: 150, y: 660, w: 780, h: 920 };
const PageScene: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.page.in || f > F.page.out + 12) return null;
  const k = pres(f, F.page.in, F.page.out, SNAP, 10);
  return (
    <Screen x={PG.x} y={PG.y} w={PG.w} h={PG.h} k={k}>
      <SitePage f={f} w={PG.w} h={PG.h} copy={copy.site} at={F.page.in} accent="green" marks={{ what: F.reads[0], where: F.reads[1], who: F.reads[2] }} />
      <Scan f={f} at={F.scan.at} dur={F.scan.dur} w={PG.w} h={PG.h} />
    </Screen>
  );
};

// Scene D: the 14-day strip and the four steps under it.
const StepRow: React.FC<{ f: number; at: number; out: number; i: number; day: string; text: string }> = ({ f, at, out, i, day, text }) => {
  const k = sp(f, at, SNAP);
  if (k <= 0) return null;
  const o = ramp(f, out, out + 10, 0, 1, easeIn);
  if (o >= 1) return null;
  const w = 820;
  const h = 84;
  return (
    <Obj opacity={clamp01(k * 1.6) * (1 - o)}>
      <G3 x={540} y={1150 + i * 102 - 40 * o} w={w} h={h} tz={130} s={0.8 + 0.2 * Math.min(1.06, k)}>
        <div style={{ position: "absolute", inset: 0, borderRadius: h / 2, background: PANEL, border: "1.5px solid rgba(255,255,255,0.16)", boxShadow: "0 18px 36px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 20, padding: "0 12px 0 10px", boxSizing: "border-box" }}>
          <div style={{ height: 62, padding: "0 22px", borderRadius: 31, background: GOLD_GRAD, display: "flex", alignItems: "center", ...txt(26, 800, { color: C.navy }) }}>{day}</div>
          <div style={txt(32, 600, { color: C.white })}>{text}</div>
        </div>
      </G3>
    </Obj>
  );
};
const CalScene: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.cal.in || f > F.cal.out + 14) return null;
  return (
    <>
      <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={900} pulse={F.pulse} />
      {copy.steps.map((st, i) => (
        <StepRow key={i} f={f} at={F.steps[i]} out={F.cal.out} i={i} day={st.day} text={st.text} />
      ))}
    </>
  );
};

// Scene E: the callback. The same search, typed fast in a bar over the two phones; the message lands on YOUR phone.
const BACK = { y: 1150, left: 262, right: 818, barY: 800 };
const BackScene: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.back.in || f > F.back.out + 12) return null;
  const k = pres(f, F.back.in, F.back.out, SNAP, 10);
  const n = shown(F.backTyped, f);
  const bar = sp(f, F.back.in + 6, SNAP);
  const p = ramp(f, F.backFly, F.backLand, 0, 1, easeIn);
  const from = { x: 540, y: BACK.barY + 60 };
  const to = { x: BACK.left, y: BACK.y - 120 };
  const pt = arc(from, to, p, 120);
  return (
    <>
      <Obj opacity={clamp01(bar * 1.5) * k}>
        <div style={{ position: "absolute", left: 540 - 360, top: BACK.barY - 48, width: 720, height: 96, borderRadius: 48, background: "#FFFFFF", boxShadow: "0 18px 40px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 20, padding: "0 30px", boxSizing: "border-box", transform: `scale(${(0.9 + 0.1 * Math.min(1.05, bar)).toFixed(3)})` }}>
          <Icon name="ri:search-line" size={38} color={C.gMuted} />
          <div style={ui(34, 400, { color: C.gText })}>{copy.query.slice(0, n)}</div>
          {n < copy.query.length && Math.floor(f / 10) % 2 === 0 && <div style={{ width: 3, height: 42, background: C.gBlue }} />}
        </div>
      </Obj>
      <PhoneMini f={f} x={BACK.left} y={BACK.y} k={k} label={copy.phones.you} litAt={F.backLand} body={copy.chat.message} count={f >= F.backLand ? "1" : "0"} bumpAt={F.backLand} />
      <PhoneMini f={f} x={BACK.right} y={BACK.y} k={k} label={copy.phones.other} count="0" />
      {f >= F.backFly && f < F.backLand && (
        <div style={{ position: "absolute", left: pt.x - 34, top: pt.y - 34, width: 68, height: 68, borderRadius: 34, background: C.wa, boxShadow: "0 8px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${(1 - 0.3 * p).toFixed(3)})` }}>
          <Icon name="ri:whatsapp-fill" size={44} color={C.white} />
        </div>
      )}
    </>
  );
};

export const AN02: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <PhoneScene f={f} />
          <TwoPhones f={f} />
          <PageScene f={f} />
          <CalScene f={f} />
          <BackScene f={f} />
          <Texts f={f} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
