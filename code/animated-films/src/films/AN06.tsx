import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Icon, Obj, txt } from "../components/base";
import { EndCard } from "../components/EndCard";
import { Beats, HeadCopy } from "../components/Head";
import { BigGold, CalendarStrip, Chip, Mark, Panel } from "../components/Kit";
import { Screen, Tap } from "../components/Phone";
import { SitePage } from "../components/Site";
import { WaMsg, WaThread } from "../components/Wa";
import { clamp01, easeIn, easeInOut, lerp, pres, ramp, SNAP, sp } from "../lib/anim";
import { C, GOLD_GRAD, PANEL, STAGE_BG } from "../theme";
import copy from "./an06/copy.json";
import cues from "./an06/cues.json";

// AN-06 "Tu página antes de pagar": risk reversal with a demo. A video message lands in WhatsApp and a page builds
// itself inside it; you type the name of your business; I look at how people find you today and at your
// competitors; the 5-minute video with the sketch that already has your name and photos; Arrancamos or Lo pienso;
// the analysis stays either way; sketch and live page side by side.
const F = cues.f;
const T = cues.text as Record<string, { in: number; out: number }>;
const BEATS = copy.beats as Record<string, HeadCopy>;
const PH = { x: 150, y: 640, w: 780, h: 960 };
const MSGS: WaMsg[] = [
  { id: "v", side: "in", lines: copy.chat.videoCaption, time: copy.chat.times[0], at: F.videoMsg, video: { label: copy.chat.videoLabel, dur: copy.chat.videoDur } },
  { id: "n", side: "out", lines: [copy.business], time: copy.chat.times[1], at: F.nameMsg },
];

const Chat1: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phone.in || f > F.phone.out + 12) return null;
  const k = pres(f, F.phone.in, F.phone.out, SNAP, 10);
  const pv = clamp01(ramp(f, F.preview.in, F.preview.in + 6)) * (1 - ramp(f, F.preview.out, F.preview.out + 6));
  return (
    <Screen x={PH.x} y={PH.y} w={PH.w} h={PH.h} k={k} bg={C.waBg}>
      <WaThread f={f} w={PH.w} h={PH.h} msgs={MSGS} name={copy.chat.name} compose={{ text: copy.business, typed: F.nameTyped, sendAt: F.send }} playAt={F.play} />
      <Tap f={f} at={F.play} x={PH.w * 0.36} y={PH.h * 0.5} />
      {pv > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: pv, background: "#F7F8FB" }}>
          <SitePage f={f} w={PH.w} h={PH.h} copy={copy.sketch} at={F.preview.in} blocksAt={F.preview.blocks} accent="gold" tileKind="house" />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, background: "rgba(10,30,63,0.9)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, ...txt(24, 600, { color: C.white }) }}>
            <Icon name="solar:play-circle-bold-duotone" size={30} color={C.gold} />
            {copy.chat.videoLabel} - {copy.chat.videoDur}
          </div>
        </div>
      )}
    </Screen>
  );
};

// how they show up today: the Google profile, the Instagram, two competitors, a magnifier passing over them
const CARD = { w: 460, h: 250 };
const CPOS = [
  { x: 300, y: 830 },
  { x: 780, y: 830 },
  { x: 300, y: 1190 },
  { x: 780, y: 1190 },
];
const Cards: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.cards.in || f > F.cards.out + 12) return null;
  const lp = ramp(f, F.lens.at, F.lens.at + F.lens.dur, 0, 1, easeInOut);
  const seg = Math.min(2, Math.floor(lp * 3));
  const t = lp * 3 - seg;
  const a = CPOS[seg];
  const b = CPOS[seg + 1];
  const lens = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  const lk = clamp01(sp(f, F.lens.at - 6, SNAP) * 1.5) * (1 - ramp(f, F.lens.at + F.lens.dur + 10, F.lens.at + F.lens.dur + 20));
  const g = copy.cards.google;
  return (
    <>
      <Panel f={f} at={F.cards.at[0]} out={F.cards.out} x={CPOS[0].x} y={CPOS[0].y} w={CARD.w} h={CARD.h} r={30} light>
        <div style={{ position: "absolute", inset: 0, padding: "24px 26px" }}>
          <div style={txt(26, 700, { color: C.navy })}>{g.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="ri:star-fill" size={30} color={C.gold} style={{ opacity: i === 4 ? 0.55 : 1 }} />
            ))}
            <div style={txt(28, 700, { color: C.navy, marginLeft: 8 })}>{g.rating}</div>
            <div style={txt(22, 500, { color: C.grayDark, marginLeft: 8 })}>{g.reviews}</div>
          </div>
          <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 10, height: 50, padding: "0 18px", borderRadius: 25, background: "rgba(229,72,77,0.12)", border: "1.5px solid rgba(229,72,77,0.5)", ...txt(22, 700, { color: "#B3262B" }) }}>
            <Icon name="solar:close-circle-bold" size={26} color="#B3262B" />
            {g.sub}
          </div>
        </div>
      </Panel>
      <Panel f={f} at={F.cards.at[1]} out={F.cards.out} x={CPOS[1].x} y={CPOS[1].y} w={CARD.w} h={CARD.h} r={30} light>
        <div style={{ position: "absolute", inset: 0, padding: "24px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="ri:instagram-line" size={30} color={C.navy} />
            <div style={txt(26, 700, { color: C.navy })}>{copy.cards.instagram.title}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 56px)", gap: 8, marginTop: 16 }}>
            {["#DCE8F5", "#E8E3D4", "#D8E6E0", "#C9D6EA", "#E6D8C8", "#D2E0D6", "#B9C9A8", "#E3D9CF", "#CBD8E6", "#DCE8F5", "#D8E6E0", "#E8E3D4"].map((c, i) => (
              <div key={i} style={{ width: 56, height: 56, borderRadius: 8, background: c }} />
            ))}
          </div>
          <div style={txt(22, 500, { color: C.grayDark, marginTop: 12 })}>{copy.cards.instagram.sub}</div>
        </div>
      </Panel>
      {copy.cards.competitors.map((name, i) => (
        <Panel key={name} f={f} at={F.cards.at[2 + i]} out={F.cards.out} x={CPOS[2 + i].x} y={CPOS[2 + i].y} w={CARD.w} h={CARD.h} r={30}>
          <div style={{ position: "absolute", inset: 0, padding: "22px 26px" }}>
            <div style={txt(24, 600, { color: C.grayMid })}>{name}</div>
            <div style={{ marginTop: 14, height: 150, borderRadius: 16, background: "#F7F8FB", position: "relative", overflow: "hidden" }}>
              <div style={{ margin: "14px 16px 0", height: 12, width: 90, borderRadius: 6, background: C.navy, opacity: 0.55 }} />
              <div style={{ margin: "16px 16px 0", height: 18, width: 250, borderRadius: 9, background: C.navy }} />
              <div style={{ margin: "8px 16px 0", height: 18, width: 180, borderRadius: 9, background: C.navy }} />
              <div style={{ position: "absolute", right: 16, bottom: 14, width: 48, height: 48, borderRadius: 24, background: C.wa, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="ri:whatsapp-fill" size={30} color={C.white} />
              </div>
              <div style={{ position: "absolute", left: 16, bottom: 18, height: 34, padding: "0 12px", borderRadius: 17, background: C.wa, ...txt(16, 700, { color: C.waDark }), display: "flex", alignItems: "center" }}>Escribinos</div>
            </div>
          </div>
        </Panel>
      ))}
      {lk > 0 && (
        <div style={{ position: "absolute", left: lens.x - 80, top: lens.y - 80, width: 160, height: 160, opacity: lk, transform: `scale(${(0.8 + 0.2 * lk).toFixed(3)})` }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 80, border: "8px solid #F5A83C", background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.06) 40%, rgba(0,0,0,0.12) 100%)", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", left: 118, top: 118, width: 70, height: 20, borderRadius: 10, background: "#C9801F", transform: "rotate(45deg)", transformOrigin: "0 50%" }} />
        </div>
      )}
    </>
  );
};

// the video: Joaquín's face in a circle over the sketch, a player bar, the name and the photos pointed at
const PG = { x: 150, y: 660, w: 780, h: 920 };
const Player: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.player.in || f > F.player.out + 12) return null;
  const k = pres(f, F.player.in, F.player.out, SNAP, 10);
  const prog = ramp(f, F.player.in + 8, F.player.out, 0, 0.22);
  const scroll = F.scroll.px * ramp(f, F.scroll.at, F.scroll.at + F.scroll.dur, 0, 1, easeInOut);
  const ring = 1 + 0.08 * Math.max(0, Math.sin(f * 0.35));
  const barH = 110;
  return (
    <>
      <Screen x={PG.x} y={PG.y} w={PG.w} h={PG.h} k={k} bg="#0B1220">
        <div style={{ position: "absolute", left: 0, top: 0, width: PG.w, height: PG.h - barH, overflow: "hidden" }}>
          <SitePage f={f} w={PG.w} h={PG.h - barH} copy={copy.sketch} at={F.player.in} blocksAt={F.playerBlocks} accent="gold" tileKind="house" scroll={scroll} />
        </div>
        <div style={{ position: "absolute", left: 28, top: PG.h - barH - 210, width: 180, height: 180, borderRadius: 90, border: "5px solid rgba(255,255,255,0.9)", boxShadow: `0 0 0 ${(10 * (ring - 1) * 12).toFixed(1)}px rgba(245,168,60,0.35), 0 20px 40px rgba(0,0,0,0.5)`, overflow: "hidden", transform: `scale(${ring.toFixed(3)})` }}>
          <Img src={staticFile("avatar.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: barH, background: "#0B1220", display: "flex", alignItems: "center", gap: 20, padding: "0 28px" }}>
          <Icon name="ri:play-fill" size={44} color={C.white} />
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(prog * 100).toFixed(2)}%`, borderRadius: 4, background: GOLD_GRAD }} />
            <div style={{ position: "absolute", left: `${(prog * 100).toFixed(2)}%`, top: -8, width: 24, height: 24, borderRadius: 12, background: C.gold, transform: "translateX(-12px)" }} />
          </div>
          <div style={txt(24, 600, { color: C.grayMid })}>{`${Math.floor(prog * 312 / 60)}:${String(Math.floor((prog * 312) % 60)).padStart(2, "0")} / ${copy.chat.videoDur}`}</div>
        </div>
      </Screen>
      <Chip f={f} at={F.pointName} out={F.player.out} x={PG.x + 330} y={PG.y + 44 - scroll} text={copy.labels.name} icon="solar:pen-bold-duotone" size={30} tz={220} />
      <Chip f={f} at={F.pointPhotos} out={F.player.out} x={PG.x + 400} y={PG.y + 470 - scroll} text={copy.labels.photos} icon="solar:gallery-bold-duotone" size={30} tz={220} />
    </>
  );
};

const Buttons: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.buttons.in || f > F.buttons.out + 12) return null;
  const k1 = sp(f, F.buttons.in, SNAP);
  const k2 = sp(f, F.buttons.in + 5, SNAP);
  const o = ramp(f, F.buttons.out, F.buttons.out + 10, 0, 1, easeIn);
  const tapped = ramp(f, F.tapYes + 4, F.tapYes + 14);
  const press = ramp(f, F.tapYes, F.tapYes + 2) - ramp(f, F.tapYes + 2, F.tapYes + 8);
  const pill = (y: number, text: string, gold: boolean, k: number, fade: number): React.ReactNode => (
    <div style={{ position: "absolute", left: 540 - 260, top: y - 60 - (gold ? 90 * tapped : 0), width: 520, height: 120, borderRadius: 60, background: gold ? GOLD_GRAD : "linear-gradient(180deg,#5C6678 0%,#3B4557 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 44px rgba(0,0,0,0.45)", opacity: clamp01(k * 1.5) * (1 - o) * fade, transform: `scale(${(0.8 + 0.2 * Math.min(1.06, k) - (gold ? 0.06 * press : 0)).toFixed(3)})`, ...txt(44, 800, { color: gold ? C.navy : C.grayLight }) }}>
      {text}
    </div>
  );
  return (
    <>
      {pill(880, copy.buttons.yes, true, k1, 1)}
      {pill(1040, copy.buttons.no, false, k2, 1 - tapped)}
      <Tap f={f} at={F.tapYes} x={540 + 120} y={880} />
    </>
  );
};

const Chat2: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.phone2.in || f > F.phone2.out + 12) return null;
  const k = pres(f, F.phone2.in, F.phone2.out, SNAP, 10);
  const msgs: WaMsg[] = MSGS.map((m) => ({ ...m, at: F.phone2.in - 60 }));
  return (
    <>
      <Screen x={150} y={700} w={780} h={780} k={k} bg={C.waBg}>
        <WaThread f={f} w={780} h={780} msgs={msgs} name={copy.chat.name} />
      </Screen>
      <Chip f={f} at={F.savedChip} out={F.phone2.out} x={540} y={1515} text={copy.chat.saved} icon="solar:bookmark-bold-duotone" size={32} tz={200} />
    </>
  );
};

const PAIR = { y: 790, w: 450, h: 700 };
const Pair: React.FC<{ f: number }> = ({ f }) => {
  if (f < F.pair.in || f > F.pair.out + 12) return null;
  const k = pres(f, F.pair.in, F.pair.out, SNAP, 10);
  const live = pres(f, F.pairLive, F.pair.out, SNAP, 10);
  const label = (x: number, text: string, gold: boolean, kk: number) => (
    <div style={{ position: "absolute", left: x - 150, top: PAIR.y - 76, width: 300, display: "flex", justifyContent: "center", opacity: clamp01(kk * 1.5) }}>
      <div style={{ height: 58, padding: "0 26px", borderRadius: 29, background: gold ? GOLD_GRAD : PANEL, border: gold ? undefined : "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", ...txt(28, 800, { color: gold ? C.navy : C.white }) }}>{text}</div>
    </div>
  );
  return (
    <>
      <Obj opacity={k}>
        {label(295, copy.labels.sketch, false, k)}
        {label(785, copy.labels.live, true, live)}
      </Obj>
      <Screen x={70} y={PAIR.y} w={PAIR.w} h={PAIR.h} k={k} r={36} style={{ filter: "grayscale(1)", opacity: 0.8 * clamp01(k * 1.5) }}>
        <SitePage f={f} w={PAIR.w} h={PAIR.h} copy={copy.sketch} at={F.pair.in} accent="gold" tileKind="house" />
        <div style={{ position: "absolute", inset: 10, border: "3px dashed rgba(10,30,63,0.35)", borderRadius: 28, pointerEvents: "none" }} />
      </Screen>
      <Screen x={560} y={PAIR.y} w={PAIR.w} h={PAIR.h} k={live} r={36}>
        <SitePage f={f} w={PAIR.w} h={PAIR.h} copy={copy.sketch} at={F.pairLive} accent="gold" tileKind="house" />
      </Screen>
      <Mark f={f} at={F.pairCheck} x={1000} y={PAIR.y + 16} ok size={110} out={F.pair.out} />
    </>
  );
};

export const AN06: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > F.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <AbsoluteFill style={{ background: STAGE_BG }} />
          <Chat1 f={f} />
          <Cards f={f} />
          <Player f={f} />
          <Buttons f={f} />
          <BigGold f={f} at={F.priceChip} out={F.buttons.out} text={copy.price} size={120} y={1230} />
          <CalendarStrip f={f} at={F.cal.in} tiles={F.cal.tiles} out={F.cal.out} y={1430} />
          <Chat2 f={f} />
          <Pair f={f} />
          <Beats f={f} beats={BEATS} text={T} />
        </>
      )}
      <EndCard f={f} at={F.board} copy={copy.end} />
    </AbsoluteFill>
  );
};
