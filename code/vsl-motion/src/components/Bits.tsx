import React from "react";
import { C, FONT, GOLD_GRAD } from "../theme";
import { Icon, txt } from "./base";
import icons from "../data/icons.json";

type IconName = keyof typeof icons;

// A pill that lives on Joaquín's chest (FRONT layer). Dark glass so it reads on the light shirt.
export const Chip: React.FC<{
  icon: IconName;
  text: string;
  tone: "gray" | "gold" | "wa";
  size?: number;
  check?: number; // 0..1 draws the check badge
}> = ({ icon, text, tone, size = 46, check = -1 }) => {
  const border = tone === "gold" ? "rgba(245,168,60,0.95)" : tone === "wa" ? "rgba(37,211,102,0.95)" : "rgba(255,255,255,0.22)";
  const ic = tone === "gold" ? C.gold : tone === "wa" ? C.wa : C.grayMid;
  const glow = tone === "gold" ? "0 0 22px rgba(245,168,60,0.22)" : tone === "wa" ? "0 0 22px rgba(37,211,102,0.24)" : "none";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.38,
        padding: `${size * 0.42}px ${size * 0.72}px ${size * 0.42}px ${size * 0.5}px`,
        borderRadius: 999,
        background: "linear-gradient(180deg,rgba(14,22,40,0.90),rgba(5,10,22,0.88))",
        border: `2.5px solid ${border}`,
        boxShadow: `0 18px 40px rgba(0,0,0,0.45), ${glow}`,
      }}
    >
      {check >= 0 ? <CheckBadge k={check} tone={tone} size={size * 1.25} /> : <Icon name={icon} size={size * 1.25} color={ic} />}
      <div style={{ ...txt(size, 700, { color: tone === "gray" ? "rgba(255,255,255,0.88)" : "#FFFFFF" }) }}>{text}</div>
    </div>
  );
};

// A check that draws itself: ring fills, then the tick strokes in.
export const CheckBadge: React.FC<{ k: number; tone: "gray" | "gold" | "wa"; size: number }> = ({ k, tone, size }) => {
  const col = tone === "gold" ? C.gold : tone === "wa" ? C.wa : C.grayMid;
  const ring = Math.min(1, k * 1.8);
  const tick = Math.max(0, Math.min(1, (k - 0.35) / 0.5));
  const L = 30;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="24" cy="24" r="21" fill={col} opacity={0.22 * ring} />
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke={col}
        strokeWidth="3.5"
        strokeDasharray={`${132 * ring} 140`}
        transform="rotate(-90 24 24)"
        strokeLinecap="round"
      />
      <path
        d="M14.5 24.5 L21 31 L34 17.5"
        fill="none"
        stroke={tone === "gray" ? "#FFFFFF" : col}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${L * tick} ${L}`}
      />
    </svg>
  );
};

// WhatsApp notification card.
export const Toast: React.FC<{ msg: string; w?: number; when?: string }> = ({ msg, w = 470, when = "ahora" }) => (
  <div
    style={{
      width: w,
      padding: "20px 24px",
      borderRadius: 30,
      background: "linear-gradient(180deg,rgba(255,255,255,0.97),rgba(238,241,246,0.96))",
      boxShadow: "0 22px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.6) inset",
      display: "flex",
      alignItems: "center",
      gap: 18,
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 66,
        height: 66,
        borderRadius: 18,
        background: C.wa,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name="ri:whatsapp-fill" size={44} color="#FFFFFF" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ ...txt(22, 600, { color: "#6B7280", letterSpacing: 0 }) }}>WhatsApp</div>
        <div style={{ ...txt(20, 500, { color: "#9CA3AF", letterSpacing: 0 }) }}>{when}</div>
      </div>
      <div style={{ ...txt(29, 700, { color: "#111827", marginTop: 4, letterSpacing: "-0.02em" }) }}>{msg}</div>
    </div>
  </div>
);

// Chat bubble (incoming message), WhatsApp style.
export const Bubble: React.FC<{ msg: string; w?: number }> = ({ msg, w }) => (
  <div
    style={{
      display: "inline-block",
      maxWidth: w,
      padding: "22px 30px 24px",
      borderRadius: "30px 30px 30px 8px",
      background: "#FFFFFF",
      boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
      fontFamily: FONT,
    }}
  >
    <div style={{ ...txt(36, 700, { color: "#111827", letterSpacing: "-0.02em", whiteSpace: "normal", lineHeight: 1.15 }) }}>{msg}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{ ...txt(20, 500, { color: "#9CA3AF", letterSpacing: 0 }) }}>10:42</div>
    </div>
  </div>
);

// Text with real depth: N copies stacked back in z, the face in metallic gold (or white), the sides darker.
export const Extrude: React.FC<{
  text: string;
  size: number;
  weight?: number;
  depth?: number;
  layers?: number;
  face?: string; // css background-image for the face
  side?: [string, string];
  glow?: number;
  glowRgb?: string;
  tracking?: string;
  sheen?: number; // 0..1 position of a light sweep across the face (-1 = off)
  fade?: number; // opacity applied to every slice (a wrapper opacity would flatten the depth)
}> = ({
  text,
  size,
  weight = 800,
  depth = 26,
  layers = 16,
  face = GOLD_GRAD,
  side = ["#B9741E", "#3C2306"],
  glow = 0.5,
  glowRgb = "245,168,60",
  tracking = "-0.035em",
  sheen = -1,
  fade = 1,
}) => {
  const base: React.CSSProperties = {
    opacity: fade,
    position: "absolute",
    left: 0,
    top: 0,
    fontFamily: FONT,
    fontWeight: weight,
    fontSize: size,
    letterSpacing: tracking,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
  const mixc = (k: number) => {
    const a = parseInt(side[0].slice(1), 16);
    const b = parseInt(side[1].slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  return (
    <div style={{ position: "relative", transformStyle: "preserve-3d" }}>
      {/* sizer */}
      <div style={{ ...base, position: "relative", visibility: "hidden" }}>{text}</div>
      {Array.from({ length: layers }).map((_, i) => (
        <div key={i} style={{ ...base, color: mixc(i / (layers - 1)), transform: `translateZ(${-((i + 1) * depth) / layers}px)` }}>
          {text}
        </div>
      ))}
      <div
        style={{
          ...base,
          backgroundImage: face,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: glow > 0 ? `drop-shadow(0 0 ${size * 0.12 * glow}px rgba(${glowRgb},${0.55 * glow}))` : undefined,
        }}
      >
        {text}
      </div>
      {sheen >= 0 && sheen <= 1 && (
        <div
          style={{
            ...base,
            backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sheen * 140 - 30}%, rgba(255,255,255,0.85) ${sheen * 140 - 15}%, rgba(255,255,255,0) ${sheen * 140}%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            transform: "translateZ(0.5px)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};
