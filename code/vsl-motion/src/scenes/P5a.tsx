import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { G3, Layer, Obj } from "../components/base";
import { Person, SkillBar } from "../components/Misc";
import { Phone3D } from "../components/Phone3D";
import { TemplateScreen } from "../components/Screens";
import { clamp01, cue, lerp, SNAP, sp } from "../lib/anim";
import { FPS } from "../theme";
import { AVG, Label, LABEL_Y } from "./P1";

// P5a - "Detrás de la página promedio vos seguramente tenés a alguien que sabe de programación y un poquito de diseño."
// The average page (right), someone peeking from behind it, and their two skills: programming full, design a little.
const ID = "P5a";
export const P5A_END = 5.567;

export const P5aStage: React.FC<{ t: number; exit?: number }> = ({ t, exit = 0 }) => {
  if (exit >= 0.999) return null;
  const ph = sp(t, cue(ID, 2, -0.12)); // "la página promedio"
  const lab = sp(t, cue(ID, 3, 0.0), SNAP);
  const who = sp(t, cue(ID, 9, -0.1), { damping: 14, stiffness: 120 }); // "alguien"
  const prog = sp(t, cue(ID, 13, -0.1), SNAP); // "programación"
  const progBar = clamp01((t - cue(ID, 13, 0.05)) / 0.5);
  const dis = sp(t, cue(ID, 16, -0.08), SNAP); // "un poquito de diseño"
  const disBar = clamp01((t - cue(ID, 18, -0.15)) / 0.4);
  const bob = Math.sin(t * 1.25) * 5;
  return (
    <Layer on="back">
      <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateX(${exit * 80}px) scale(${1 - 0.06 * exit})`, filter: exit > 0 ? `blur(${exit * 6}px)` : undefined }}>
        {/* whoever is behind it, peeking out */}
        <Obj opacity={clamp01(who * 1.5)}>
          <G3 x={AVG.x - 175} y={AVG.y - 175} w={250} h={250} tz={-160} ty={(1 - who) * 140} ry={-20}>
            <Person size={250} tone="gray" />
          </G3>
        </Obj>
        <Obj opacity={clamp01(ph * 1.4)}>
          <Phone3D {...AVG} tone="gray" tx={(1 - ph) * 260} tz={(1 - ph) * -500} ry={lerp(-62, AVG.ry, ph)} ty={bob}>
            <TemplateScreen />
          </Phone3D>
        </Obj>
        <Obj opacity={clamp01(lab * 1.5)}>
          <Label x={AVG.x} y={LABEL_Y} text="PROMEDIO" color="rgba(225,229,236,0.9)" k={lab} />
        </Obj>
        <Obj opacity={clamp01(prog * 1.6)}>
          <G3 x={392} y={250} w={380} h={130} tz={50} ry={-10} ty={(1 - prog) * 30}>
            <SkillBar icon="solar:programming-bold-duotone" text="Programación" level={0.92} fill={progBar} />
          </G3>
        </Obj>
        <Obj opacity={clamp01(dis * 1.6)}>
          <G3 x={392} y={410} w={380} h={130} tz={50} ry={-10} ty={(1 - dis) * 30}>
            <SkillBar icon="solar:palette-bold-duotone" text="Diseño" level={0.28} fill={disBar} />
          </G3>
        </Obj>
      </AbsoluteFill>
    </Layer>
  );
};

export const P5a: React.FC = () => <P5aStage t={useCurrentFrame() / FPS} />;
