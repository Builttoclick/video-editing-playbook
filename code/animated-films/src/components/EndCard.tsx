import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { clamp01, easeOut, LAZY, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, STAGE } from "../theme";
import { Icon, txt } from "./base";
import { Extrude } from "./Kit";

// The end card of every film: a navy board swings in over the scene like a door, the closing line of the script
// lands word by word, the price in gold 3D under it, "Tu página, lista en 14 días.", the WhatsApp line and an arrow
// down to Meta's own button. Little glow, by Joaquín's rule. Timings hang off `at` (the board's frame).
export type EndCopy = { lines: string[]; price: string; sub: string; cta: string };
export const END = { price: 24, line: 8, sub: 40, cta: 50, arrow: 62, logo: 72, length: 190 };
const BOARD_BG = "radial-gradient(circle at 50% 16%, #18325F 0%, #0B2042 42%, #050E20 100%)";

export const EndCard: React.FC<{ f: number; at: number; copy: EndCopy }> = ({ f, at, copy }) => {
  const k = sp(f, at, LAZY);
  if (k <= 0.001) return null;
  const angle = (1 - Math.min(1, k)) * 92;
  const shade = Math.min(1, angle / 92);
  const price = sp(f, at + END.price, { damping: 14, stiffness: 150, mass: 0.9 });
  const cta = sp(f, at + END.cta, SNAP);
  const arrow = sp(f, at + END.arrow, SNAP);
  const logo = ramp(f, at + END.logo, at + END.logo + 18, 0, 1, easeOut);
  const bounce = Math.max(0, Math.sin((f - at - END.arrow) * 0.26));
  const subWords = copy.sub.split(" ");
  let j = 0;
  return (
    <AbsoluteFill style={{ perspective: STAGE.perspective, perspectiveOrigin: STAGE.origin }}>
      <AbsoluteFill style={{ transformOrigin: "0% 50%", transform: `rotateY(${angle.toFixed(3)}deg)`, overflow: "hidden", perspective: STAGE.perspective, perspectiveOrigin: "540px 900px", background: BOARD_BG }}>
        <AbsoluteFill
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 75%)",
          }}
        />
        <Img src={staticFile("lockup-horizontal-blanco.svg")} style={{ position: "absolute", left: 540 - 170, top: 340 - 10 * (1 - logo), width: 340, opacity: logo }} />
        {/* the closing line, word by word */}
        {copy.lines.map((ln, l) => (
          <div key={l} style={{ position: "absolute", left: 0, right: 0, top: 500 + l * 74, display: "flex", justifyContent: "center", gap: 16 }}>
            {ln.split(" ").map((w, i) => {
              const kk = sp(f, at + END.line + j++ * 2, SNAP);
              return (
                <div key={i} style={{ ...txt(60, 700, { color: C.white }), opacity: clamp01(kk * 1.5), transform: `translateY(${((1 - clamp01(kk)) * 26).toFixed(2)}px)`, filter: kk < 0.98 ? `blur(${((1 - clamp01(kk)) * 6).toFixed(2)}px)` : undefined }}>
                  {w}
                </div>
              );
            })}
          </div>
        ))}
        {price > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", transformStyle: "preserve-3d", transform: `translateZ(${((1 - clamp01(price)) * 700).toFixed(1)}px) scale(${(0.7 + 0.3 * Math.min(1.1, price)).toFixed(3)})` }}>
            <Extrude text={copy.price} size={128} depth={30} fade={clamp01(price * 1.5)} />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, top: 960, display: "flex", justifyContent: "center", gap: 14 }}>
          {subWords.map((w, i) => {
            const kk = sp(f, at + END.sub + i * 2, SNAP);
            return (
              <div key={i} style={{ ...txt(50, 600, { color: C.grayLight }), opacity: clamp01(kk * 1.5), transform: `translateY(${((1 - clamp01(kk)) * 22).toFixed(2)}px)` }}>
                {w}
              </div>
            );
          })}
        </div>
        {cta > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1100, display: "flex", justifyContent: "center", opacity: clamp01(cta * 1.6), transform: `scale(${(0.7 + 0.3 * Math.min(1.1, cta)).toFixed(3)})` }}>
            <div style={{ height: 112, padding: "0 44px", borderRadius: 56, background: C.wa, display: "flex", alignItems: "center", gap: 18, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", ...txt(42, 700, { color: C.waDark, letterSpacing: "-0.02em" }) }}>
              <Icon name="ri:whatsapp-fill" size={54} color={C.waDark} />
              {copy.cta}
            </div>
          </div>
        )}
        {arrow > 0 && (
          <div style={{ position: "absolute", left: 540 - 60, top: 1300 + 22 * bounce, opacity: clamp01(arrow * 1.6), transform: `scale(${Math.min(1.1, arrow).toFixed(3)})` }}>
            <Icon name="solar:alt-arrow-down-bold" size={120} color={C.gold} />
          </div>
        )}
        {shade > 0.01 && <AbsoluteFill style={{ background: `rgba(0,0,0,${(0.6 * shade).toFixed(3)})` }} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
