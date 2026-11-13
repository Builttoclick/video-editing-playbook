import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import React, { useEffect, useState } from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { AN02 } from "./films/AN02";
import an02 from "./films/an02/cues.json";
import { AN03 } from "./films/AN03";
import an03 from "./films/an03/cues.json";
import { AN04 } from "./films/AN04";
import an04 from "./films/an04/cues.json";
import { AN05 } from "./films/AN05";
import an05 from "./films/an05/cues.json";
import { AN06 } from "./films/AN06";
import an06 from "./films/an06/cues.json";
import { AN07 } from "./films/AN07";
import an07 from "./films/an07/cues.json";
import { AN08 } from "./films/AN08";
import an08 from "./films/an08/cues.json";
import { H, W } from "./theme";

// The text measures itself with the loaded fonts, so nothing renders until they are in.
const Fonts: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [h] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sample = "¿Y cuánto tarda? X.XXX.XXX Ññ áéíóú 0123456789";
    Promise.all([
      ...["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 40px Poppins`, sample)),
      ...["300", "400", "500"].map((w) => document.fonts.load(`${w} 40px Roboto`, sample)),
    ])
      .then(() => document.fonts.ready)
      .then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) continueRender(h);
  }, [ready, h]);
  return ready ? <>{children}</> : null;
};

const wrap = (Film: React.FC) => {
  const Wrapped: React.FC = () => (
    <Fonts>
      <Film />
    </Fonts>
  );
  return Wrapped;
};

const FILMS: { id: string; film: React.FC; frames: number; fps: number }[] = [
  { id: "AN02", film: wrap(AN02), frames: an02.frames, fps: an02.fps },
  { id: "AN03", film: wrap(AN03), frames: an03.frames, fps: an03.fps },
  { id: "AN04", film: wrap(AN04), frames: an04.frames, fps: an04.fps },
  { id: "AN05", film: wrap(AN05), frames: an05.frames, fps: an05.fps },
  { id: "AN06", film: wrap(AN06), frames: an06.frames, fps: an06.fps },
  { id: "AN07", film: wrap(AN07), frames: an07.frames, fps: an07.fps },
  { id: "AN08", film: wrap(AN08), frames: an08.frames, fps: an08.fps },
];

export const Root: React.FC = () => (
  <>
    {FILMS.map((c) => (
      <Composition key={c.id} id={c.id} component={c.film} durationInFrames={c.frames} fps={c.fps} width={W} height={H} />
    ))}
  </>
);
