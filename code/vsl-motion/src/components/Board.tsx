import React from "react";
import { AbsoluteFill } from "remotion";
import { STAGE } from "../theme";

// Full-screen B-roll board (Joaquín's 24-oct idea: "una transición a un board... cubrir toda mi cara si necesitás espacio
// gráfico"). An opaque navy panel swings in like a door hinged on the left, holds, then swings away on the right.
// Its content keeps the stage camera, so an object can leave the board and stay exactly where it was.
export const BOARD_BG =
  "radial-gradient(circle at 50% 16%, #18325F 0%, #0B2042 42%, #050E20 100%)";

export const Board: React.FC<{ k: number; out?: number; children?: React.ReactNode }> = ({ k, out = 0, children }) => {
  if (k <= 0.001 || out >= 0.999) return null;
  const leaving = out > 0;
  const angle = leaving ? -out * 92 : (1 - Math.min(1, k)) * 92;
  const shade = Math.min(1, Math.abs(angle) / 92);
  return (
    <AbsoluteFill style={{ perspective: STAGE.perspective, perspectiveOrigin: STAGE.origin }}>
      <AbsoluteFill
        style={{
          transformOrigin: leaving ? "100% 50%" : "0% 50%",
          transform: `rotateY(${angle.toFixed(3)}deg)`,
          overflow: "hidden",
          perspective: STAGE.perspective,
          perspectiveOrigin: STAGE.origin,
          background: BOARD_BG,
        }}
      >
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(circle at 50% 40%, black 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 0%, transparent 75%)",
          }}
        />
        {children}
        {shade > 0.01 && <AbsoluteFill style={{ background: `rgba(0,0,0,${(0.6 * shade).toFixed(3)})` }} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
