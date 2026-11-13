import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import React, { useEffect, useState } from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { AbsoluteFill } from "remotion";
import { LayerCtx, LayerName } from "./components/base";
import cues from "./data/cues.json";
import th from "./data/th.json";
import { Film } from "./Film";
import { TH } from "./TH";
import { H, W } from "./theme";

// The bubbles measure their lines with the loaded Roboto, so nothing renders until the fonts are in.
const Fonts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sample = "¿Y cuánto tarda? X.XXX.XXX Ññ áéíóú 0123456789";
    Promise.all([
      ...["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px Poppins`, sample)),
      ...["400", "500"].map((w) => document.fonts.load(`${w} 40px Roboto`, sample)),
    ])
      .then(() => document.fonts.ready)
      .then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(h);
  }, [ready, h]);
  return ready ? <>{children}</> : null;
};

const Main: React.FC = () => (
  <Fonts>
    <Film />
  </Fonts>
);

// The talking-head double: one composition per layer (back = on the wall behind Joaquín, front = on top of Joaquín).
const THScene: React.FC<{ layer: LayerName }> = ({ layer }) => (
  <Fonts>
    <LayerCtx.Provider value={layer}>
      <AbsoluteFill>
        <TH />
      </AbsoluteFill>
    </LayerCtx.Provider>
  </Fonts>
);

export const Root: React.FC = () => (
  <>
    <Composition id="AN01" component={Main} durationInFrames={cues.frames} fps={cues.fps} width={W} height={H} />
    {(["back", "front", "all"] as LayerName[]).map((layer) => (
      <Composition key={layer} id={`TH-${layer}`} component={THScene} durationInFrames={th.frames} fps={th.fps} width={W} height={H} defaultProps={{ layer }} />
    ))}
  </>
);
