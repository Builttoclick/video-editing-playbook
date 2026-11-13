import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EndCard } from "../components/EndCard";
import { Globe } from "../components/Globe";
import { GptBox } from "../components/Gpt";
import { Beats, HeadCopy } from "../components/Head";
import { CalendarStrip, Chip, Proposals } from "../components/Kit";
import { Screen } from "../components/Phone";
import { EmptyPage, Scan, SitePage } from "../components/Site";
import { WaBubble } from "../components/Wa";
import { clamp01, pres, ramp, SNAP, sp } from "../lib/anim";
import { C, PANEL, STAGE_BG } from "../theme";
import { txt } from "../components/base";
import copy from "./an03/copy.json";
import cues from "./an03/cues.json";

// AN-03 "El señor de Brasil": hook, story, offer. A man in Brazil asks ChatGPT who can bring a crane from Europe to
// Paraguay; ChatGPT names our client, a truck importer in Limpio; the client's own message; why it appeared (the
// page says what, for whom, from where); a page with nothing written gives ChatGPT nothing; our offer.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const GLOBE = { cx: 540, cy: 1120, r: 430 };
const PG = { x: 150, y: 690, w: 780, h: 880 };

const Texts: React.FC<{ f: number }> = ({ f }) => <Beats f={f} beats={BEATS} text={T} />;

const World: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.globe.in || f > F.globe.out + 14) return null;
  const k = pres(f, F.globe.in, F.globe.out, { damping: 18, stiffness: 80, mass: 1 }, 14);
  const dim = ramp(f, F.globe.dim, F.globe.dim + 12);
  return (
    <>
      <Globe f={f} cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} rot={(f - F.globe.in) * 0.02} opacity={k} dim={dim} route={F.route} hop={F.hop} pins={{ br: F.pinBr, eu: F.pinEu, py: F.pinPy }} labels={copy.pins} badgeAt={F.hopLand} badgePulse={F.badgePulse} />
      <GptBox f={f} at={F.gpt.in} out={F.gpt.out} x={540} y={1400} w={920} h={340} title={copy.gpt.title} question={copy.gpt.question} qTyped={F.qTyped} caption={copy.gpt.caption} answerAt={F.answer} answer={copy.gpt.answer} aTyped={F.aTyped} answerSub={copy.gpt.answerSub} answerSubAt={F.answerSub} />
    </>
  );
};

const Message: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.bubble.in || f > F.bubble.out + 12) return null;
  const k = sp(f, F.bubble.in - 4, SNAP);
  const o = ramp(f, F.bubble.out, F.bubble.out + 10);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", opacity: clamp01(k * 1.5) * (1 - o) }}>
        <div style={{ height: 60, padding: "0 26px", borderRadius: 30, background: PANEL, border: "1.5px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", ...txt(28, 600, { color: C.grayLight }) }}>{copy.message.name}</div>
      </div>
      <WaBubble f={f} at={F.bubble.in} out={F.bubble.out} x={540} y={600} w={900} lines={copy.message.lines} time={copy.message.time} side="in" size={40} lineAt={F.bubbleLines} />
    </>
  );
};

const PageScene: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.page.in || f > F.page.out + 12) return null;
  const k = pres(f, F.page.in, F.page.out, SNAP, 10);
  const emptyK = ramp(f, F.empty, F.empty + 8);
  return (
    <Screen x={PG.x} y={PG.y} w={PG.w} h={PG.h} k={k}>
      {emptyK < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - emptyK }}>
          <SitePage f={f} w={PG.w} h={PG.h} copy={copy.site} at={F.page.in} accent="terra" tileKind="truck" marks={{ what: F.reads[0], who: F.reads[1], where: F.reads[2] }} markLabels={copy.marks} />
          <Scan f={f} at={F.scan.at} dur={F.scan.dur} w={PG.w} h={PG.h} />
        </div>
      )}
      {emptyK > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: emptyK }}>
          <EmptyPage f={f} w={PG.w} h={PG.h} qAt={F.question} />
          <Scan f={f} at={F.scan2.at} dur={F.scan2.dur} w={PG.w} h={PG.h} />
        </div>
      )}
    </Screen>
  );
};

const OURS = { x: 150, y: 700, w: 780, h: 820 };
const Ours: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.ours.in || f > F.ours.out + 12) return null;
  const k = pres(f, F.ours.in, F.ours.out, SNAP, 10);
  return (
    <>
      <Screen x={OURS.x} y={OURS.y} w={OURS.w} h={OURS.h} k={k}>
        <SitePage f={f} w={OURS.w} h={OURS.h} copy={copy.ours} at={F.ours.in} headAt={F.oursHead} subAt={F.oursSub} buttonAt={F.oursButton} tileKind="none" accent="gold" />
      </Screen>
      {copy.engines.map((e, i) => (
        <Chip key={e} f={f} at={F.engines[i]} out={F.ours.out} x={[330, 750][i]} y={1540} text={e} icon="solar:check-circle-bold" size={34} />
      ))}
    </>
  );
};

export const AN03: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <World f={f} />
          <Message f={f} />
          <PageScene f={f} />
          <Ours f={f} />
          <Proposals f={f} at={F.props.in} cards={F.props.cards} pick={F.props.pick} out={F.props.out} y={1120} />
          <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={1120} />
          <Texts f={f} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
