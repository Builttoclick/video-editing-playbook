import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Icon, Obj, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { Beats, HeadCopy } from "../components/Head";
import { House, PLOT, PlotLabel } from "../components/Houses";
import { CalendarStrip, Chip, PriceTag, Proposals } from "../components/Kit";
import { Screen } from "../components/Phone";
import { SitePage, TemplatePage } from "../components/Site";
import { WaNotif } from "../components/Wa";
import { clamp01, easeIn, easeInOut, easeOut, lerp, pres, ramp, SNAP, sp } from "../lib/anim";
import { C, PANEL, STAGE_BG } from "../theme";
import copy from "./an05/copy.json";
import cues from "./an05/cues.json";

// AN-05 "La constructora barata": two price tags, two plots. A cheap builder and a good one both hand you a house
// and from outside they look alike; the difference shows when you move in. A page is the same: the cheap one is a
// template with your logo, people come in, do not understand, and leave; ours starts with the plans (the interview),
// every text written so people get it in three seconds and write. Ours LEFT, the cheap one RIGHT (Joaquín's rule).
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const LX = 270;
const RX = 810;
const PLOT_Y = 1110;
const PS = 1.25; // the plots drawn a quarter bigger than their 420 px art

const Tags: React.FC<{ f: number }> = ({ f }) => (
  <>
    <PriceTag f={f} at={F.tagCheap.in} out={F.tagCheap.out} x={RX} y={900} text={copy.tags.cheap} gold={false} angle={18} />
    <PriceTag f={f} at={F.tagOurs.in} out={F.tagOurs.out} x={LX} y={880} text={copy.tags.ours} gold angle={-18} w={400} />
  </>
);

const Plots: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.plots.in || f > F.plots.out + 14) return null;
  const k = pres(f, F.plots.in, F.plots.out, SNAP, 12);
  const fold = ramp(f, F.fold, F.fold + 14, 0, 1, easeInOut);
  const ry = 90 * fold; // the houses fold away like a page turning into the phones
  return (
    <Obj opacity={k}>
      {[0, 1].map((i) => {
        const cheap = i === 1;
        const x = cheap ? RX : LX;
        return (
          <div key={i} style={{ position: "absolute", left: x - PLOT / 2, top: PLOT_Y - PLOT / 2, width: PLOT, height: PLOT, transform: `perspective(1400px) rotateY(${(cheap ? ry : -ry).toFixed(2)}deg) scale(${PS})`, transformOrigin: cheap ? "100% 50%" : "0% 50%", opacity: 1 - ramp(f, F.fold + 8, F.fold + 14) }}>
            <House f={f} build={cheap ? F.buildCheap : F.buildOurs} cheap={cheap} plans={cheap ? undefined : F.plans} truckAt={F.trucks[i]} lightsAt={cheap ? undefined : F.lightsOurs} flicker={cheap ? F.flicker : []} crack={cheap ? F.crack : undefined} doorAt={cheap ? undefined : F.door} drip={cheap ? F.drip : []} shineAt={F.shine.map((t: number) => t + (cheap ? 6 : 0))} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: LX - 150, top: PLOT_Y + 300, width: 300, display: "flex", justifyContent: "center" }}>
        <PlotLabel text={copy.labels.ours} gold k={sp(f, F.plots.in + 6, SNAP) * (1 - fold)} />
      </div>
      <div style={{ position: "absolute", left: RX - 150, top: PLOT_Y + 300, width: 300, display: "flex", justifyContent: "center" }}>
        <PlotLabel text={copy.labels.cheap} gold={false} k={sp(f, F.plots.in + 10, SNAP) * (1 - fold)} />
      </div>
    </Obj>
  );
};

// the two phones: the template on the right (visitors in and out, 0 messages), ours on the left writing itself
const PW = 440;
const PHH = 760;
const PY = 1150;
const Visitor: React.FC<{ f: number; at: number; dur: number; x0: number; y: number; i: number }> = ({ f, at, dur, x0, y, i }) => {
  if (f < at || f > at + dur) return null;
  const p = ramp(f, at, at + dur, 0, 1);
  const inP = Math.min(1, p * 2.2);
  const outP = clamp01((p - 0.55) / 0.45);
  const x = x0 + 150 * easeOut(inP) - 190 * easeIn(outP);
  const flip = outP > 0 ? -1 : 1;
  return (
    <div style={{ position: "absolute", left: x - 30, top: y - 30 + Math.abs(Math.sin(f * 0.9 + i)) * -4, width: 60, height: 60, borderRadius: 30, background: PANEL, border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scaleX(${flip})`, opacity: 1 - ramp(f, at + dur - 6, at + dur) }}>
      <Icon name="solar:user-rounded-bold-duotone" size={40} color={C.gold} />
    </div>
  );
};

const Phones: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phones.in || f > F.phones.out + 14) return null;
  const k = pres(f, F.phones.in, F.phones.out, SNAP, 12);
  const unfold = ramp(f, F.phones.in, F.phones.in + 14, 0, 1, easeOut);
  const bp = pres(f, F.blueprint.in, F.blueprint.out, SNAP, 8);
  const counter = F.msgs.filter((t) => t <= f).length;
  return (
    <>
      {/* ours, left */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `perspective(1400px) rotateY(${(-90 * (1 - unfold)).toFixed(2)}deg)`, transformOrigin: `${LX - PW / 2}px 50%`, opacity: k }}>
        <Screen x={LX - PW / 2} y={PY - PHH / 2} w={PW} h={PHH} r={40} k={1}>
          {bp < 1 && f < F.oursHead[0] && (
            <div style={{ position: "absolute", inset: 0, background: "#F7F8FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: PW * 0.7, height: PW * 0.7, borderRadius: 24, background: "rgba(10,30,63,0.06)", border: "2px dashed rgba(10,30,63,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="solar:ruler-cross-pen-bold-duotone" size={110} color="rgba(10,30,63,0.35)" />
              </div>
            </div>
          )}
          {f >= F.blueprint.in && (
            <div style={{ position: "absolute", inset: 0, opacity: f < F.oursHead[0] ? bp : 1 }}>
              <SitePage f={f} w={PW} h={PHH} copy={copy.ours} at={F.blueprint.in} headAt={F.oursHead} subAt={[F.oursHead[F.oursHead.length - 1] + 10]} buttonAt={F.oursButton} waAt={F.oursWa} tileKind="house" tilesAt={[F.oursButton + 4, F.oursButton + 8, F.oursButton + 12]} accent="gold" />
            </div>
          )}
          {/* the blueprint overlay on ours while the chips land */}
          {bp > 0 && (
            <div style={{ position: "absolute", inset: 0, background: "#1F4E9C", opacity: bp * 0.92, backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }}>
              <div style={{ position: "absolute", left: 40, top: 60, width: PW - 80, height: 260, border: "3px solid rgba(255,255,255,0.8)" }} />
              <div style={{ position: "absolute", left: 40, top: 190, width: PW - 80, height: 3, background: "rgba(255,255,255,0.8)" }} />
              <div style={{ position: "absolute", left: 180, top: 60, width: 3, height: 260, background: "rgba(255,255,255,0.8)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", ...txt(34, 700, { color: "#fff" }) }}>{copy.labels.plans}</div>
            </div>
          )}
        </Screen>
      </div>
      {/* the cheap one, right */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `perspective(1400px) rotateY(${(90 * (1 - unfold)).toFixed(2)}deg)`, transformOrigin: `${RX + PW / 2}px 50%`, opacity: k }}>
        <Screen x={RX - PW / 2} y={PY - PHH / 2} w={PW} h={PHH} r={40} k={1}>
          <TemplatePage f={f} w={PW} h={PHH} at={F.template} loadFrames={8} copy={copy.template} />
          {F.visitors.map((t, i) => (
            <Visitor key={i} f={f} at={t} dur={F.visitorDur} x0={-20} y={PHH * 0.5 + i * 40} i={i} />
          ))}
        </Screen>
      </div>
      {/* labels under the phones, the counters */}
      <Obj opacity={k * unfold}>
        <div style={{ position: "absolute", left: LX - 150, top: PY + PHH / 2 + 22, width: 300, display: "flex", justifyContent: "center" }}>
          <PlotLabel text={copy.labels.ours} gold k={1} />
        </div>
        <div style={{ position: "absolute", left: RX - 150, top: PY + PHH / 2 + 22, width: 300, display: "flex", justifyContent: "center" }}>
          <PlotLabel text={copy.labels.cheap} gold={false} k={1} />
        </div>
      </Obj>
      {f >= F.visitors[0] && (
        <Chip f={f} at={F.visitors[0]} out={F.phones.out} x={RX} y={PY - PHH / 2 - 56} text={copy.counter.zero} icon="solar:chat-round-dots-bold-duotone" tone="dark" size={28} />
      )}
      {counter > 0 && <Chip f={f} at={F.msgs[0]} out={F.phones.out} x={LX} y={PY - PHH / 2 - 56} text={`${counter} ${counter === 1 ? "mensaje" : copy.counter.some}`} icon="solar:chat-round-dots-bold-duotone" tone="gold" size={28} />}
      {copy.chips.map((c, i) => (
        <Chip key={c} f={f} at={F.chips[i]} out={F.blueprint.out} x={LX + (i ? 40 : -20)} y={PY - 120 + i * 100} text={c} icon="solar:chat-round-dots-bold-duotone" size={28} tz={220} />
      ))}
      {copy.messages.map((m, i) => (
        <WaNotif key={i} f={f} at={F.msgs[i]} out={F.phones.out} x={LX + 60} y={PY + 120 + i * 110} w={520} body={m} rot={(i - 1) * 2} s={0.9} />
      ))}
    </>
  );
};

const Moral: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.moralLand - 8) return null;
  const k = sp(f, F.moralLand - 8, { damping: 16, stiffness: 90, mass: 1 });
  return <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #0F2650 0%, #050E20 70%)", opacity: clamp01(k * 1.4) }} />;
};

export const AN05: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <Tags f={f} />
          <Plots f={f} />
          <Phones f={f} />
          <Proposals f={f} at={F.props.in} cards={F.props.cards} pick={F.props.pick} out={F.props.out} y={1120} />
          <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={1120} />
          <Moral f={f} />
          <Beats f={f} beats={BEATS} text={T} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
