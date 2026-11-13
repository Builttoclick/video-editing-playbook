import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Chat, Lens } from "./components/Chat";
import { EndCard } from "./components/EndCard";
import { Graphics, graphicsDim } from "./components/Graphics";
import cues from "./data/cues.json";

// AN-01 "Ya sé tus preguntas": the viewer's own WhatsApp. Their questions land on the right, Joaquín answers on the
// left, and while Joaquín answers the ideas come out of the phone (two chips, a page writing itself, the 14-day strip, the
// three proposals). The viewer haggles, the ticks turn blue, nothing comes back: cut to the price.
// Effects only, no voice: every frame in src/data/cues.json, every word in src/data/copy.json.
const Stage: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 30%, #15305C 0%, #0A1E3F 45%, #050E20 100%)" }} />
);

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const endOnly = f > cues.f.board + 24;
  return (
    <AbsoluteFill style={{ background: "#050E20" }}>
      {!endOnly && (
        <>
          <Stage />
          <Chat f={f} dim={graphicsDim(f)} />
          <Lens f={f} />
          <Graphics f={f} />
        </>
      )}
      <EndCard f={f} />
    </AbsoluteFill>
  );
};
