import React from "react";
import { useCurrentFrame } from "remotion";
import { Board } from "../components/Board";
import { G3, Icon, Layer, Obj, txt } from "../components/base";
import { Pill, VideoCard } from "../components/Misc";
import { Phone3D } from "../components/Phone3D";
import { BuildScreen, STYLES } from "../components/Proposals";
import { clamp01, cue, easeIn, easeOut, lerp, ramp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { P8A_END, P8aGlobe } from "./P8a";

// P8b - "Voy a hacer un demo de una estructura de cómo yo haría una página para tu negocio y voy a grabar un video
// análisis. Te voy a enviar eso donde yo explico por qué yo decidí esa estructura para tu negocio."
// A board: the demo builds itself (left), the video analysis records (right); both go out in one WhatsApp message;
// then the video plays next to the demo and the structure lights up on "esa estructura". P8c swings the board away.
const ID = "P8b";
export const P8B_END = 10.0;
const DEMO = { x: 290, y: 800 };
const VID = { x: 790, y: 800 };

export const p8bState = (t: number) => ({
  blocks: [4, 7, 13, 16, 16].reduce((acc, i, j) => acc + sp(t, cue(ID, i, -0.05 + j * 0.12), { damping: 15, stiffness: 150 }), 0),
  type: ramp(t, cue(ID, 13, -0.05), cue(ID, 13, 0.3)),
  color: ramp(t, cue(ID, 15, -0.1), cue(ID, 16, 0.3), 0, 1, (x) => x),
  demoIn: sp(t, cue(ID, 4, -0.12), SNAP),
  vidIn: sp(t, cue(ID, 20, -0.1), SNAP), // "grabar"
  rec: ramp(t, cue(ID, 20, 0.0), cue(ID, 26, 0.0), 0, 1, (x) => x),
  send: sp(t, cue(ID, 27, -0.1), { damping: 16, stiffness: 140 }) * (1 - ramp(t, cue(ID, 29, -0.05), cue(ID, 29, 0.3), 0, 1, easeOut)), // "enviar" .. "donde"
  read: ramp(t, cue(ID, 28, -0.05), cue(ID, 28, 0.15)),
  play: ramp(t, cue(ID, 30, 0.0), cue(ID, 40, 0.3), 0, 1, (x) => x), // "yo explico" .. "negocio"
  struct: Math.sin(clamp01((t - cue(ID, 36, -0.1)) / 0.9) * Math.PI), // "esa estructura"
});

export const P8bBoard: React.FC<{ t: number }> = ({ t }) => {
  const s = p8bState(t);
  const sk = s.send;
  const dx = lerp(DEMO.x, 420, sk);
  const vx = lerp(VID.x, 660, sk);
  const yy = lerp(DEMO.y, 760, sk);
  const sc = lerp(1, 0.62, sk);
  return (
    <>
      {/* the WhatsApp message they go out in */}
      <Obj opacity={clamp01(sk * 1.6)}>
        <G3 x={540} y={760} w={800} h={620} s={0.85 + 0.15 * sk}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "34px 34px 10px 34px", background: "#005C4B", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", right: 24, bottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ ...txt(24, 500, { color: "rgba(255,255,255,0.7)", letterSpacing: 0 }) }}>16:05</div>
            <Icon name="solar:check-read-linear" size={34} color={s.read > 0.5 ? "#53BDEB" : "rgba(255,255,255,0.7)"} />
          </div>
        </G3>
      </Obj>
      <Obj opacity={clamp01(s.demoIn * 1.5)}>
        <Phone3D x={dx} y={yy} w={330} tone="gold" glow={0.3} tz={(1 - s.demoIn) * -300} ry={lerp(lerp(40, 10, s.demoIn), 0, sk)} s={sc}>
          <BuildScreen st={STYLES[2]} blocks={s.blocks} type={s.type} logo={1} color={s.color} />
        </Phone3D>
      </Obj>
      {/* the structure lights up on "esa estructura" */}
      <Obj opacity={s.struct > 0 ? s.struct : 0}>
        <G3 x={DEMO.x} y={DEMO.y - 20} w={296} h={596} tz={70}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, border: "4px dashed rgba(245,168,60,0.95)" }} />
        </G3>
      </Obj>
      <Obj opacity={clamp01(s.vidIn * 1.5)}>
        <G3 x={vx} y={yy} w={350} h={560} tz={(1 - s.vidIn) * -300} ry={lerp(lerp(-40, -10, s.vidIn), 0, sk)} s={sc}>
          <VideoCard rec={s.rec} play={s.play} w={350} />
        </G3>
      </Obj>
      <Obj opacity={clamp01(s.demoIn * 1.6) * (1 - sk)}>
        <G3 x={DEMO.x} y={1232} w={360} h={96}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
            <Pill icon="solar:widget-5-bold-duotone" text="Demo" tone="gold" size={40} />
          </div>
        </G3>
      </Obj>
      <Obj opacity={clamp01(s.vidIn * 1.6) * (1 - sk)}>
        <G3 x={VID.x} y={1232} w={420} h={96}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
            <Pill icon="solar:videocamera-record-bold-duotone" text="Video análisis" tone="gold" size={40} />
          </div>
        </G3>
      </Obj>
    </>
  );
};

export const P8b: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const bIn = sp(t, cue(ID, 0, -0.06), { damping: 18, stiffness: 120 }); // "voy a hacer un demo"
  const globeOut = ramp(t, 1.6, 2.0, 0, 1, easeIn);
  return (
    <>
      <Layer on="back">
        <P8aGlobe t={P8A_END} exit={globeOut} />
      </Layer>
      <Layer on="front">
        <Board k={bIn}>
          <P8bBoard t={t} />
        </Board>
      </Layer>
    </>
  );
};
