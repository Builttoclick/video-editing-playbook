import React from "react";
import copy from "../data/copy.json";
import cues from "../data/cues.json";
import { clamp01, easeIn, lerp, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, GOLD_GRAD } from "../theme";
import { G3, Icon, Obj, txt } from "./base";
import { rowOf } from "./Chat";

// The things that come OUT of the phone while Joaquín answers: two chips, a page that writes itself, the 14-day strip
// and the three proposals. They sit in front of the screen (z toward the camera, a shadow on the chat) so the chat
// stays the real thing and the graphics read as the idea leaving the phone. Gold is the only colour they add.
const F = cues.f;
const SLAB: React.CSSProperties = { position: "absolute", inset: 0, borderRadius: 30 };
const PANEL = "linear-gradient(180deg,#10224A 0%,#0A1A3A 100%)";
const DEPTH = 22;
const N_SLAB = 10;

// a slab with real thickness: the face plus a stack of darker copies behind it
export const Slab: React.FC<{ w: number; h: number; r?: number; children: React.ReactNode; face?: string; border?: string; sides?: [number[], number[]] }> = ({
  w,
  h,
  r = 30,
  children,
  face = PANEL,
  border = "rgba(255,255,255,0.16)",
  sides = [
    [8, 18, 40],
    [18, 28, 60],
  ],
}) => (
  <>
    {Array.from({ length: N_SLAB }).map((_, i) => {
      const k = i / (N_SLAB - 1);
      const c = sides[0].map((a, j) => Math.round(a + (sides[1][j] - a) * k));
      return <div key={i} style={{ ...SLAB, borderRadius: r, background: `rgb(${c[0]},${c[1]},${c[2]})`, transform: `translateZ(${(-(i + 1) * DEPTH) / N_SLAB}px)` }} />;
    })}
    <div style={{ ...SLAB, borderRadius: r, background: face, border: `1.5px solid ${border}`, boxSizing: "border-box", overflow: "hidden", width: w, height: h }}>{children}</div>
  </>
);

export const chipsPresence = (f: number) => clamp01(sp(f, F.chips[0], SNAP) * 1.5) * (1 - ramp(f, F.chipsOut + 6, F.chipsOut + 14));
export const wirePresence = (f: number) => clamp01(sp(f, F.wire.in) * 1.5) * (1 - ramp(f, F.wire.out, F.wire.out + 12));
export const calPresence = (f: number) => clamp01(sp(f, F.cal.in, SNAP) * 1.5) * (1 - ramp(f, F.cal.out, F.cal.out + 10));
export const propsPresence = (f: number) => clamp01(sp(f, F.props.in, SNAP) * 1.5) * (1 - ramp(f, F.props.out, F.props.out + 12));

// Two chips fly out of the "entrevista" bubble, hover above the thread, then fold into the page.
export const Chips: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.chips[0] || f > F.chipsOut + 16) return null;
  const from = rowOf(f, "a2c");
  const targets = [
    { x: 332, y: 650 },
    { x: 722, y: 650 },
  ];
  return (
    <>
      {copy.chips.map((text, i) => {
        const k = sp(f, F.chips[i], { damping: 15, stiffness: 110, mass: 0.9 });
        if (k <= 0) return null;
        const gone = ramp(f, F.chipsOut + i * 3, F.chipsOut + i * 3 + 10, 0, 1, easeIn);
        const x0 = from.x + 120 + i * 110;
        const y0 = from.y + 40;
        const x = lerp(lerp(x0, targets[i].x, k), 540, gone);
        const y = lerp(lerp(y0, targets[i].y, k) - 70 * Math.sin(Math.PI * clamp01(k)), 700, gone);
        const s = lerp(0.6 + 0.4 * Math.min(1.1, k), 0.25, gone);
        return (
          <Obj key={i} opacity={clamp01(k * 1.8) * (1 - gone)}>
            <G3 x={x} y={y} w={380} h={92} tz={150 * clamp01(k)} s={s} rz={(1 - clamp01(k)) * -8}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 46,
                  background: GOLD_GRAD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  boxShadow: "0 18px 36px rgba(0,0,0,0.45)",
                  ...txt(36, 700, { color: C.navy, letterSpacing: "-0.02em" }),
                }}
              >
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

// The page that writes itself: a slab turning in like a tablet, a constructora's home (the house example for Joaquín's own
// marketing), the headline and the line under it word by word, the WhatsApp button last.
export const Wire: React.FC<{ f: number }> = ({ f }) => {
  const p = wirePresence(f);
  if (p <= 0.001) return null;
  const k = sp(f, F.wire.in, { damping: 17, stiffness: 95, mass: 1 });
  const out = ramp(f, F.wire.out, F.wire.out + 12, 0, 1, easeIn);
  const W = 700;
  const Hh = 470;
  const words = copy.wire.headline.split(" ");
  const sub = copy.wire.sub.split(" ");
  const shownW = F.wireWords.filter((t) => t <= f).length;
  const shownS = F.wireSub.filter((t) => t <= f).length;
  const caretHead = shownW < words.length && f >= F.wireWords[0] - 6;
  const caretSub = shownW >= words.length && shownS < sub.length;
  const btn = sp(f, F.wireButton, SNAP);
  return (
    <Obj opacity={p}>
      <G3 x={540} y={790 - 40 * out} w={W} h={Hh} tz={170} ry={lerp(48, -6, clamp01(k)) + 60 * out} rx={lerp(10, 0, clamp01(k))} s={0.9 + 0.1 * clamp01(k)}>
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
            {caretHead && <div style={{ width: 4, height: 48, background: C.gold, marginTop: 4, opacity: Math.floor(f / 8) % 2 ? 0.2 : 1 }} />}
          </div>
          <div style={{ padding: "8px 28px 0", display: "flex", flexWrap: "wrap", gap: "0 8px", minHeight: 40, width: 440 }}>
            {sub.slice(0, shownS).map((w, i) => (
              <div key={i} style={txt(22, 500, { color: "rgba(10,30,63,0.7)", lineHeight: 1.3 })}>
                {w}
              </div>
            ))}
            {caretSub && <div style={{ width: 3, height: 26, background: C.gold, marginTop: 2, opacity: Math.floor(f / 8) % 2 ? 0.2 : 1 }} />}
          </div>
          {btn > 0 && (
            <div
              style={{
                position: "absolute",
                left: 28,
                bottom: 30,
                height: 66,
                padding: "0 26px",
                borderRadius: 33,
                background: C.wa,
                display: "flex",
                alignItems: "center",
                gap: 12,
                transform: `scale(${(0.6 + 0.4 * Math.min(1.1, btn)).toFixed(3)})`,
                transformOrigin: "0% 50%",
                opacity: clamp01(btn * 1.6),
                ...txt(26, 700, { color: "#05301A", letterSpacing: "-0.01em" }),
              }}
            >
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

// 14 days as 14 tiles, two rows of seven: each one flips over in gold when its day comes; the last one gets the check.
export const CalendarStrip: React.FC<{ f: number }> = ({ f }) => {
  const p = calPresence(f);
  if (p <= 0.001) return null;
  const k = sp(f, F.cal.in, SNAP);
  const out = ramp(f, F.cal.out, F.cal.out + 10, 0, 1, easeIn);
  const tile = 96;
  const gap = 12;
  const W = 7 * tile + 6 * gap + 60;
  const Hh = 2 * tile + gap + 60;
  return (
    <Obj opacity={p}>
      <G3 x={540} y={780 - 50 * out} w={W} h={Hh} tz={150} s={0.86 + 0.14 * Math.min(1.08, k)} rx={lerp(16, 0, clamp01(k))}>
        <div style={{ position: "absolute", left: 24, top: 36, width: W - 48, height: Hh - 40, borderRadius: 28, background: "rgba(0,0,0,0.5)", filter: "blur(26px)", transform: "translateZ(-50px)" }} />
        <Slab w={W} h={Hh} r={28}>
          <div style={{ position: "absolute", left: 30, top: 30, display: "grid", gridTemplateColumns: `repeat(7, ${tile}px)`, gap }}>
            {F.cal.tiles.map((t, i) => {
              const kk = sp(f, t, SNAP);
              const on = clamp01(kk);
              const last = i === 13;
              return (
                <div
                  key={i}
                  style={{
                    width: tile,
                    height: tile,
                    borderRadius: 18,
                    background: on > 0.02 ? GOLD_GRAD : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${on > 0.02 ? "rgba(255,230,180,0.5)" : "rgba(255,255,255,0.12)"}`,
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `rotateX(${(90 * (1 - Math.min(1, kk))).toFixed(2)}deg) scale(${(1 + 0.1 * Math.sin(Math.PI * on)).toFixed(3)})`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  {last && on > 0.5 ? (
                    <Icon name="solar:check-circle-bold" size={50} color={C.navy} />
                  ) : (
                    <>
                      <div style={txt(16, 600, { color: on > 0.02 ? "rgba(10,30,63,0.75)" : "rgba(255,255,255,0.5)", letterSpacing: 0 })}>{copy.calendar.day}</div>
                      <div style={txt(38, 800, { color: on > 0.02 ? C.navy : "rgba(255,255,255,0.75)" })}>{i + 1}</div>
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

// Three design directions for the same business, fanned out; the middle one gets the check and comes forward.
type Style = { bg: string; ink: string; accent: string; soft: string; heading: string; weight: number; hero: string; palette: string[] };
const STYLES: Style[] = [
  { bg: "#0F1B2D", ink: "#F3EBDD", accent: "#D4A55A", soft: "#1B2B44", heading: FONT, weight: 700, hero: "linear-gradient(150deg,#2A3D5C 0%,#0F1B2D 100%)", palette: ["#0F1B2D", "#D4A55A", "#F3EBDD", "#6B7A90"] },
  { bg: "#F6F3EC", ink: "#1F2A2A", accent: "#2F6B4F", soft: "#E6EFE8", heading: FONT, weight: 800, hero: "linear-gradient(150deg,#D4E7DA 0%,#8DB89E 100%)", palette: ["#F6F3EC", "#2F6B4F", "#E9B44C", "#1F2A2A"] },
  { bg: "#FFFFFF", ink: "#15213B", accent: "#F5A83C", soft: "#EEF1F6", heading: FONT, weight: 800, hero: "linear-gradient(150deg,#DCE4F2 0%,#9FB3D6 100%)", palette: ["#FFFFFF", "#15213B", "#F5A83C", "#9FB3D6"] },
];
const CW = 300;
const CH = 500;

const Card: React.FC<{ st: Style; chosen: number }> = ({ st, chosen }) => (
  <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: st.bg, overflow: "hidden", boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 0 ${2 + 3 * chosen}px ${chosen > 0.02 ? `rgba(245,168,60,${0.4 + 0.6 * chosen})` : "rgba(255,255,255,0.10)"}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: st.accent }} />
        <div style={{ width: 70, height: 9, borderRadius: 5, background: st.ink, opacity: 0.55 }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 22, height: 5, borderRadius: 3, background: st.ink, opacity: 0.4 }} />
        ))}
      </div>
    </div>
    <div style={{ margin: "16px 16px 0", height: 150, borderRadius: 16, background: st.hero, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, right: -20, top: -30, background: st.accent, opacity: 0.35 }} />
      <div style={{ position: "absolute", width: 80, height: 80, borderRadius: 20, left: 22, bottom: -20, background: st.ink, opacity: 0.25, transform: "rotate(18deg)" }} />
    </div>
    <div style={{ padding: "16px 18px 0" }}>
      <div style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 32, lineHeight: 1.05, color: st.ink, letterSpacing: "-0.02em" }}>Tu negocio</div>
      <div style={{ height: 8, width: "92%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 12 }} />
      <div style={{ height: 8, width: "70%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 7 }} />
      <div style={{ marginTop: 16, width: 130, height: 40, borderRadius: 999, background: st.accent, display: "flex", alignItems: "center", justifyContent: "center", ...txt(16, 700, { color: st.bg === "#0F1B2D" ? "#0F1B2D" : "#FFFFFF", letterSpacing: 0 }) }}>
        Escribinos
      </div>
    </div>
    <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 7 }}>
        {st.palette.map((c, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 9, background: c, border: "1.5px solid rgba(127,127,127,0.35)" }} />
        ))}
      </div>
      <div style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 40, color: st.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>Aa</div>
    </div>
  </div>
);

export const Proposals: React.FC<{ f: number }> = ({ f }) => {
  const p = propsPresence(f);
  if (p <= 0.001) return null;
  const out = ramp(f, F.props.out, F.props.out + 12, 0, 1, easeIn);
  const pick = sp(f, F.props.pick, SNAP);
  const chosen = clamp01(pick);
  return (
    <Obj opacity={p}>
      {STYLES.map((st, i) => {
        const k = sp(f, F.props.cards[i], { damping: 15, stiffness: 120, mass: 0.9 });
        if (k <= 0) return null;
        const mid = i === 1;
        const dx = (i - 1) * 262;
        const ry = (1 - i) * 24;
        const back = mid ? 0 : 60 * chosen;
        return (
          <G3
            key={i}
            x={540 + dx}
            y={790 + (1 - clamp01(k)) * 160 - 60 * out}
            w={CW}
            h={CH}
            s={0.86 * (mid ? 1 + 0.07 * chosen : 1 - 0.05 * chosen)}
            ry={ry + (1 - clamp01(k)) * 50 + 50 * out}
            tz={(mid ? 170 : 90) - back}
            style={{ opacity: clamp01(k * 1.6) * (mid ? 1 : 1 - 0.5 * chosen) }}
          >
            <Card st={st} chosen={mid ? chosen : 0} />
            {mid && chosen > 0 && (
              <div style={{ position: "absolute", right: -30, top: -30, width: 92, height: 92, borderRadius: 46, background: GOLD_GRAD, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.min(1.15, pick).toFixed(3)})`, boxShadow: "0 12px 24px rgba(0,0,0,0.4)" }}>
                <Icon name="solar:check-circle-bold" size={60} color={C.navy} />
              </div>
            )}
          </G3>
        );
      })}
    </Obj>
  );
};

export const Graphics: React.FC<{ f: number }> = ({ f }) => (
  <>
    <Chips f={f} />
    <Wire f={f} />
    <CalendarStrip f={f} />
    <Proposals f={f} />
  </>
);

export const graphicsDim = (f: number) => 0.3 * Math.max(wirePresence(f), calPresence(f), propsPresence(f), 0.6 * chipsPresence(f));
