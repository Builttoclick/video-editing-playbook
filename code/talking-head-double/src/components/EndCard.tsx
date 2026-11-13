import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import copy from "../data/copy.json";
import cues from "../data/cues.json";
import { clamp01, easeOut, LAZY, ramp, SNAP, sp } from "../lib/anim";
import { C, FONT, GOLD_GRAD, STAGE } from "../theme";
import { Icon, txt } from "./base";

// The end card: a navy board swings in over the chat like a door (Joaquín's VSL idea), the price lands in gold 3D, the
// line under it, the WhatsApp line and an arrow down to Meta's own button. Little glow, by Joaquín's rule.
const F = cues.f;
const BOARD_BG = "radial-gradient(circle at 50% 16%, #18325F 0%, #0B2042 42%, #050E20 100%)";

// Text with real depth: slices stacked back in z, the face in metallic gold (from the VSL overlays).
const Extrude: React.FC<{ text: string; size: number; depth?: number; layers?: number; sheen?: number; fade?: number }> = ({ text, size, depth = 26, layers = 14, sheen = -1, fade = 1 }) => {
  const base: React.CSSProperties = { opacity: fade, position: "absolute", left: 0, top: 0, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1, whiteSpace: "nowrap" };
  const side = ["#B9741E", "#3C2306"];
  const mixc = (k: number) => {
    const a = parseInt(side[0].slice(1), 16);
    const b = parseInt(side[1].slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  return (
    <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
      <div style={{ ...base, position: "relative", visibility: "hidden" }}>{text}</div>
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} style={{ ...base, color: mixc(i / (layers - 1)), transform: `translateZ(${-((i + 1) * depth) / layers}px)` }}>
          {text}
        </div>
      ))}
      <div style={{ ...base, backgroundImage: GOLD_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: `drop-shadow(0 0 ${size * 0.05}px rgba(245,168,60,0.25))` }}>{text}</div>
      {sheen >= 0 && sheen <= 1 && (
        <div style={{ ...base, backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sheen * 140 - 30}%, rgba(255,255,255,0.8) ${sheen * 140 - 15}%, rgba(255,255,255,0) ${sheen * 140}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", transform: "translateZ(0.5px)" }}>{text}</div>
      )}
    </div>
  );
};

export const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const k = sp(f, F.board, LAZY);
  if (k <= 0.001) return null;
  const angle = (1 - Math.min(1, k)) * 92;
  const shade = Math.min(1, angle / 92);
  const price = sp(f, F.price, { damping: 14, stiffness: 150, mass: 0.9 });
  const sheen = ramp(f, F.price + 12, F.price + 34);
  const cta = sp(f, F.cta, SNAP);
  const arrow = sp(f, F.arrow, SNAP);
  const logo = ramp(f, F.logo, F.logo + 18, 0, 1, easeOut);
  const bounce = Math.max(0, Math.sin((f - F.arrow) * 0.26));
  const words = copy.end.line.split(" ");
  return (
    <AbsoluteFill style={{ perspective: STAGE.perspective, perspectiveOrigin: STAGE.origin }}>
      <AbsoluteFill style={{ transformOrigin: "0% 50%", transform: `rotateY(${angle.toFixed(3)}deg)`, overflow: "hidden", perspective: STAGE.perspective, perspectiveOrigin: "540px 780px", background: BOARD_BG }}>
        <AbsoluteFill
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(circle at 50% 40%, black 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 0%, transparent 75%)",
          }}
        />
        <Img src={staticFile("lockup-horizontal-blanco.svg")} style={{ position: "absolute", left: 540 - 190, top: 330 - 10 * (1 - logo), width: 380, opacity: logo }} />
        {price > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", transformStyle: "preserve-3d", transform: `translateZ(${((1 - clamp01(price)) * 700).toFixed(1)}px) scale(${(0.7 + 0.3 * Math.min(1.1, price)).toFixed(3)})` }}>
            <Extrude text={copy.end.price} size={132} depth={30} sheen={sheen < 1 ? sheen : -1} fade={clamp01(price * 1.5)} />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, top: 890, display: "flex", justifyContent: "center", gap: 16 }}>
          {words.map((w, i) => {
            const kk = sp(f, F.line + i * 2, SNAP);
            return (
              <div key={i} style={{ ...txt(58, 600, { color: C.white }), opacity: clamp01(kk * 1.5), transform: `translateY(${((1 - clamp01(kk)) * 26).toFixed(2)}px)`, filter: kk < 0.98 ? `blur(${((1 - clamp01(kk)) * 6).toFixed(2)}px)` : undefined }}>
                {w}
              </div>
            );
          })}
        </div>
        {cta > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center", opacity: clamp01(cta * 1.6), transform: `scale(${(0.7 + 0.3 * Math.min(1.1, cta)).toFixed(3)})` }}>
            <div style={{ height: 112, padding: "0 44px", borderRadius: 56, background: C.wa, display: "flex", alignItems: "center", gap: 18, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", ...txt(42, 700, { color: "#05301A", letterSpacing: "-0.02em" }) }}>
              <Icon name="ri:whatsapp-fill" size={54} color="#05301A" />
              {copy.end.cta}
            </div>
          </div>
        )}
        {arrow > 0 && (
          <div style={{ position: "absolute", left: 540 - 60, top: 1260 + 22 * bounce, opacity: clamp01(arrow * 1.6), transform: `scale(${Math.min(1.1, arrow).toFixed(3)})` }}>
            <Icon name="solar:alt-arrow-down-bold" size={120} color={C.gold} />
          </div>
        )}
        {shade > 0.01 && <AbsoluteFill style={{ background: `rgba(0,0,0,${(0.6 * shade).toFixed(3)})` }} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
