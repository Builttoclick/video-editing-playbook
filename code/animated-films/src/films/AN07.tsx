import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, Obj, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { GooglePage } from "../components/Google";
import { Beats, HeadCopy } from "../components/Head";
import { Chip, Extrude, Mark } from "../components/Kit";
import { Screen, Tap } from "../components/Phone";
import { EmptyPage, SitePage, TemplatePage } from "../components/Site";
import { WaNotif } from "../components/Wa";
import { clamp01, easeInOut, easeOut, pres, ramp, SNAP, sp } from "../lib/anim";
import { C, PANEL, STAGE_BG } from "../theme";
import copy from "./an07/copy.json";
import cues from "./an07/cues.json";

// AN-07 "La prueba de los tres segundos": a test the viewer runs on their own phone. Search what you sell, open the
// first result, count to three: did you get what they sell and from where, and where do you tap to write? People
// do this with your business every day; if they do not get it they go back and open the next one. Then your page,
// and if you have none, you know who gets the message. Ours opens with one line that says what and where, the
// WhatsApp button always at hand, and the messages arrive.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const PH = { x: 150, y: 640, w: 780, h: 960 };

const Count: React.FC<{ f: number }> = ({ f }) => (
  <>
    {copy.count.map((n, i) => {
      const at = F.count[i];
      const k = sp(f, at, { damping: 12, stiffness: 160, mass: 0.8 });
      if (k <= 0) return null;
      const o = ramp(f, at + 24, at + 30);
      if (o >= 1) return null;
      return (
        <Obj key={i} opacity={clamp01(k * 1.5) * (1 - o)}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1000, display: "flex", justifyContent: "center", transformStyle: "preserve-3d", transform: `translateZ(${((1 - clamp01(k)) * 600).toFixed(1)}px) scale(${(0.6 + 0.4 * Math.min(1.1, k)).toFixed(3)})` }}>
            <Extrude text={n} size={300} depth={40} />
          </div>
        </Obj>
      );
    })}
  </>
);

const Phone: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phone.in || f > F.phone.out + 12) return null;
  const k = pres(f, F.phone.in, F.phone.out, SNAP, 10);
  const page1In = ramp(f, F.page1.in, F.page1.in + 6, 0, 1, easeOut);
  const listBack = f >= F.list2 && f < F.page2.in + 6;
  const page2In = ramp(f, F.page2.in, F.page2.in + 6, 0, 1, easeOut);
  const yoursK = ramp(f, F.yoursCard.in, F.yoursCard.in + 8) * (1 - ramp(f, F.competitorMsg - 14, F.competitorMsg - 6));
  const compBack = ramp(f, F.competitorMsg - 14, F.competitorMsg - 6);
  const showGoogle = f < F.page1.in + 6 || listBack;
  const showPage1 = f >= F.page1.in && f < F.list2;
  const showPage2 = f >= F.page2.in && f < F.yoursCard.in + 8;
  return (
    <>
      <Screen x={PH.x} y={PH.y} w={PH.w} h={PH.h} k={k}>
        {showGoogle && (
          <GooglePage f={f} w={PH.w} h={PH.h} barAt={F.bar} query={copy.query} typed={F.typed} suggestions={copy.suggestions} suggestAt={F.suggest} enterAt={F.enter} results={copy.results} resultsAt={listBack ? [F.list2, F.list2 + 2, F.list2 + 4] : F.results} tapAt={listBack ? F.tap2 : F.tap1} tapIndex={listBack ? 1 : 0} />
        )}
        {showPage1 && (
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${((1 - page1In) * PH.w).toFixed(1)}px)` }}>
            <TemplatePage f={f} w={PH.w} h={PH.h} at={F.page1.in} loadFrames={F.page1.load} copy={copy.template} huntAt={F.hunt} />
            <Tap f={f} at={F.tapBack} x={56} y={48} dark />
          </div>
        )}
        {showPage2 && (
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${((1 - page2In) * PH.w).toFixed(1)}px)` }}>
            <SitePage f={f} w={PH.w} h={PH.h} copy={copy.page2} at={F.page2.in} accent="blue" tileKind="none" />
          </div>
        )}
        {f >= F.yoursCard.in && (
          <>
            <div style={{ position: "absolute", inset: 0, opacity: compBack }}>
              <SitePage f={f} w={PH.w} h={PH.h} copy={copy.page2} at={F.page2.in} accent="blue" tileKind="none" />
            </div>
            <div style={{ position: "absolute", inset: 0, opacity: yoursK }}>
              <EmptyPage f={f} w={PH.w} h={PH.h} qAt={F.yoursCard.in + 10} />
            </div>
          </>
        )}
      </Screen>
      {/* the two crosses over the cluttered page */}
      <Mark f={f} at={F.cross1} x={PH.x + PH.w - 90} y={PH.y + 150} ok={false} size={120} out={F.tapBack} />
      <Mark f={f} at={F.cross2} x={PH.x + PH.w - 90} y={PH.y + PH.h - 150} ok={false} size={120} out={F.tapBack} />
      {/* "Tu página" over the empty one */}
      {f >= F.yoursCard.in && yoursK > 0 && (
        <Obj opacity={yoursK}>
          <div style={{ position: "absolute", left: 0, right: 0, top: PH.y + 44, display: "flex", justifyContent: "center" }}>
            <div style={{ height: 70, padding: "0 30px", borderRadius: 35, background: PANEL, border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 16px 34px rgba(0,0,0,0.45)", ...txt(32, 800, { color: C.white }) }}>
              <Icon name="solar:smartphone-bold-duotone" size={36} color={C.gold} />
              {copy.yours.label}
            </div>
          </div>
        </Obj>
      )}
      <WaNotif f={f} at={F.competitorMsg} out={F.phone.out} x={540} y={PH.y + 500} w={760} body={copy.message} rot={-1.5} />
    </>
  );
};

const Ours: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.ours.in || f > F.ours.out + 12) return null;
  const k = pres(f, F.ours.in, F.ours.out, SNAP, 10);
  const scroll = F.scroll.px * ramp(f, F.scroll.at, F.scroll.at + F.scroll.dur, 0, 1, easeInOut);
  return (
    <>
      <Screen x={PH.x} y={PH.y} w={PH.w} h={PH.h} k={k}>
        <SitePage f={f} w={PH.w} h={PH.h} copy={copy.ourPage} at={F.ours.in} headAt={F.oursHead} subAt={F.oursSub} buttonAt={F.oursSub[F.oursSub.length - 1] + 8} waAt={F.ours.in + 8} tileKind="none" accent="gold" scroll={scroll} tapWaAt={F.tapWa} timer={{ at: F.timer, label: copy.timer }} />
      </Screen>
      {copy.messages.map((m, i) => (
        <WaNotif key={i} f={f} at={F.msgs[i]} out={F.ours.out} x={540} y={1180 + i * 130} w={820} body={m} rot={(i - 1) * 1.5} />
      ))}
      <Chip f={f} at={F.timer} out={F.scroll.at} x={PH.x + 300} y={PH.y + 40} text={copy.ourPage.headline} icon="solar:check-circle-bold" size={26} tz={200} />
    </>
  );
};

export const AN07: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <Phone f={f} />
          <Count f={f} />
          <Ours f={f} />
          <Beats f={f} beats={BEATS} text={T} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
