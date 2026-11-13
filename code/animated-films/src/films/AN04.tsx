import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { G3, Icon, Obj, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { Beats, HeadCopy } from "../components/Head";
import { BigGold, CalendarStrip, Chip, Panel, Proposals } from "../components/Kit";
import { Screen } from "../components/Phone";
import { SitePage } from "../components/Site";
import { WaNotif } from "../components/Wa";
import { clamp01, easeIn, lerp, pres, ramp, shown, SNAP, sp } from "../lib/anim";
import { C, GOLD_GRAD, PANEL, STAGE_BG, UI_FONT } from "../theme";
import copy from "./an04/copy.json";
import cues from "./an04/cues.json";

// AN-04 "Los 14 días": the price first, then the two weeks on a calendar you watch fill: day 1 the call, days 2-5
// the texts (written for how people search), days 6-7 three designs, days 8-13 eight pages, domain, mail, Google;
// day 14 in the air with every button opening WhatsApp; you tell us your business and pick a design, we do the rest.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1, whiteSpace: "nowrap", ...extra });

const Calendar: React.FC<{ f: number }> = ({ f }) => {
  const y = lerp(1180, 880, ramp(f, F.cal.up[0], F.cal.up[1]));
  return <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={y} />;
};

const CallCard: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.callCard.in || f > F.callCard.out + 12) return null;
  const ring = Math.sin((f - F.callCard.in) * 0.5);
  return (
    <>
      <Panel f={f} at={F.callCard.in} out={F.callCard.out} x={540} y={1130} w={720} h={150} r={34}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 24, padding: "0 30px" }}>
          <Img src={staticFile("avatar.png")} style={{ width: 96, height: 96, borderRadius: 48, objectFit: "cover", border: "3px solid rgba(255,255,255,0.8)" }} />
          <div style={{ flex: 1 }}>
            <div style={txt(36, 700, { color: C.white })}>{copy.callCard.title}</div>
            <div style={txt(26, 500, { color: C.grayMid, marginTop: 8 })}>{copy.callCard.sub}</div>
          </div>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: C.wa, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${(ring * 8).toFixed(1)}deg)` }}>
            <Icon name="solar:phone-calling-bold-duotone" size={50} color={C.waDark} />
          </div>
        </div>
      </Panel>
      {copy.callCard.chips.map((c, i) => (
        <Chip key={i} f={f} at={F.callChips[i]} out={F.callCard.out} x={[330, 750, 540][i]} y={[1330, 1330, 1450][i]} text={c} icon="solar:chat-round-dots-bold-duotone" size={32} />
      ))}
    </>
  );
};

const PAGE = { x: 190, y: 1130, w: 700, h: 440 };
const Writing: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.bar.in || f > F.page.out + 12) return null;
  const k = pres(f, F.bar.in, F.bar.out, SNAP, 8);
  const n = shown(F.barTyped, f);
  const pk = pres(f, F.page.in, F.page.out, SNAP, 10);
  return (
    <>
      <Obj opacity={k * 0.92}>
        <div style={{ position: "absolute", left: 540 - 360, top: 1028, width: 720, height: 84, borderRadius: 42, background: "#FFFFFF", boxShadow: "0 14px 34px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 18, padding: "0 28px", boxSizing: "border-box" }}>
          <Icon name="ri:search-line" size={34} color={C.gMuted} />
          <div style={ui(30, 400, { color: C.gText })}>{copy.query.slice(0, n)}</div>
          {n < copy.query.length && Math.floor(f / 10) % 2 === 0 && <div style={{ width: 3, height: 38, background: C.gBlue }} />}
        </div>
      </Obj>
      <Screen x={PAGE.x} y={PAGE.y} w={PAGE.w} h={PAGE.h} k={pk} r={40}>
        <SitePage f={f} w={PAGE.w} h={PAGE.h} copy={copy.page} at={F.page.in} headAt={F.pageHead} subAt={F.pageSub} buttonAt={F.pageButton} tileKind="none" accent="gold" />
      </Screen>
    </>
  );
};

// eight page cards fanning into a site
const PageFan: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.pages.in || f > F.pages.out + 12) return null;
  const o = ramp(f, F.pages.out, F.pages.out + 10, 0, 1, easeIn);
  return (
    <>
      {copy.pages.map((name, i) => {
        const k = sp(f, F.pages.cards[i], SNAP);
        if (k <= 0) return null;
        const t = i - 3.5;
        return (
          <Obj key={i} opacity={clamp01(k * 1.6) * (1 - o)}>
            <G3 x={540 + t * 96} y={1240 + Math.abs(t) * 14 - 40 * o} w={170} h={220} rz={t * 5} tz={100 + i * 4} s={0.7 + 0.3 * Math.min(1.06, k)}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "#F7F8FB", boxShadow: "0 18px 36px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.9)", overflow: "hidden" }}>
                <div style={{ height: 30, background: C.navy, display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: C.gold }} />
                </div>
                <div style={{ padding: "14px 14px 0" }}>
                  <div style={txt(20, 800, { color: C.navy, whiteSpace: "normal", lineHeight: 1.1 })}>{name}</div>
                  <div style={{ marginTop: 12, height: 8, width: "90%", borderRadius: 4, background: "rgba(10,30,63,0.2)" }} />
                  <div style={{ marginTop: 7, height: 8, width: "70%", borderRadius: 4, background: "rgba(10,30,63,0.2)" }} />
                  <div style={{ marginTop: 16, height: 50, borderRadius: 10, background: "linear-gradient(160deg,#2A3D5C 0%,#0F1F42 100%)" }} />
                  <div style={{ marginTop: 12, width: 70, height: 22, borderRadius: 11, background: C.wa }} />
                </div>
              </div>
            </G3>
          </Obj>
        );
      })}
      {copy.connect.map((c, i) => (
        <Chip key={c} f={f} at={F.connect[i]} out={F.pages.out} x={[300, 540, 780][i]} y={1490} text={c} icon={["solar:global-bold-duotone", "solar:letter-bold-duotone", "solar:magnifer-bold-duotone"][i] as "solar:global-bold-duotone"} size={30} />
      ))}
    </>
  );
};

const LIVE = { x: 260, y: 1040, w: 560, h: 540 };
const Live: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.live.in || f > F.live.out + 12) return null;
  const k = pres(f, F.live.in, F.live.out, SNAP, 10);
  return (
    <>
      <Screen x={LIVE.x} y={LIVE.y} w={LIVE.w} h={LIVE.h} k={k} r={40}>
        <SitePage f={f} w={LIVE.w} h={LIVE.h} copy={copy.page} at={F.live.in} tileKind="none" accent="gold" tapWaAt={F.tapWa} />
      </Screen>
      {copy.messages.map((m, i) => (
        <WaNotif key={i} f={f} at={F.msgs[i]} out={F.live.out} x={540} y={1240 + i * 130} w={760} body={m} rot={i ? 1.5 : -1.5} />
      ))}
    </>
  );
};

const Cols: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.cols.in || f > F.cols.out + 12) return null;
  const k = pres(f, F.cols.in, F.cols.out, SNAP, 10);
  const head = (x: number, text: string, gold: boolean) => (
    <Obj opacity={k}>
      <div style={{ position: "absolute", left: x - 150, top: 850, width: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ height: 76, padding: "0 36px", borderRadius: 38, background: gold ? GOLD_GRAD : PANEL, border: gold ? undefined : "1.5px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", boxShadow: "0 16px 34px rgba(0,0,0,0.4)", ...txt(38, 800, { color: gold ? C.navy : C.white }) }}>{text}</div>
      </div>
    </Obj>
  );
  return (
    <>
      {head(300, copy.you.title, true)}
      {head(780, copy.we.title, false)}
      {copy.you.items.map((it, i) => (
        <Chip key={it} f={f} at={F.youItems[i]} out={F.cols.out} x={300} y={980 + i * 96} text={it} icon="solar:check-circle-bold" size={32} tone="gold" />
      ))}
      {copy.we.items.map((it, i) => (
        <Chip key={it} f={f} at={F.weItems[i]} out={F.cols.out} x={780} y={980 + i * 92} text={it} icon="solar:check-circle-bold" size={30} tone="dark" />
      ))}
    </>
  );
};

export const AN04: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <BigGold f={f} at={F.price.in} out={F.price.out} text={copy.price} size={150} y={720} />
          <Calendar f={f} />
          <CallCard f={f} />
          <Writing f={f} />
          <Proposals f={f} at={F.props.in} cards={F.props.cards} pick={F.props.pick} out={F.props.out} y={1330} s={0.86} />
          <PageFan f={f} />
          <Live f={f} />
          <Cols f={f} />
          <Beats f={f} beats={BEATS} text={T} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
