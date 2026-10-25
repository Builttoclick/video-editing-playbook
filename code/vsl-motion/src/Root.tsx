import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Composition, continueRender, delayRender } from "remotion";
import parts from "./data/parts.json";
import { LayerCtx, LayerName } from "./components/base";
import { P1 } from "./scenes/P1";
import { P2a } from "./scenes/P2a";
import { P2b } from "./scenes/P2b";
import { P2c } from "./scenes/P2c";
import { P3a } from "./scenes/P3a";
import { P3b } from "./scenes/P3b";
import { P3c } from "./scenes/P3c";
import { P4a } from "./scenes/P4a";
import { P4b } from "./scenes/P4b";
import { P4c } from "./scenes/P4c";
import { P5a } from "./scenes/P5a";
import { P5b } from "./scenes/P5b";
import { P5c } from "./scenes/P5c";
import { P6a } from "./scenes/P6a";
import { P6b } from "./scenes/P6b";
import { P6c } from "./scenes/P6c";
import { P6d } from "./scenes/P6d";
import { P8a } from "./scenes/P8a";
import { P8b } from "./scenes/P8b";
import { P8c } from "./scenes/P8c";
import { P8d } from "./scenes/P8d";
import { FPS, H, W } from "./theme";

const SCENES: Record<string, React.FC> = { P1, P2a, P2b, P2c, P3a, P3b, P3c, P4a, P4b, P4c, P5a, P5b, P5c, P6a, P6b, P6c, P6d, P8a, P8b, P8c, P8d };

const Fonts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const sample = "¿Qué tal? JOAQUÍN CABALLERO página 43 ÁÉÍÓÚ áéíóú ñ";
    Promise.all(["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px Poppins`, sample)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(h));
  }, [h]);
  return <>{children}</>;
};

const Scene: React.FC<{ id: string; layer: LayerName }> = ({ id, layer }) => {
  const S = SCENES[id];
  return (
    <Fonts>
      <LayerCtx.Provider value={layer}>
        <AbsoluteFill>
          <S />
        </AbsoluteFill>
      </LayerCtx.Provider>
    </Fonts>
  );
};

export const Root: React.FC = () => (
  <>
    {parts
      .filter((p) => SCENES[p.id])
      .flatMap((p) =>
        (["back", "front", "all"] as LayerName[]).map((layer) => (
          <Composition
            key={`${p.id}-${layer}`}
            id={`${p.id}-${layer}`}
            component={Scene}
            durationInFrames={p.frames}
            fps={FPS}
            width={W}
            height={H}
            defaultProps={{ id: p.id, layer }}
          />
        )),
      )}
  </>
);
