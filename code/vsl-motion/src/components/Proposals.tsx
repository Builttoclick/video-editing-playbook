import React from "react";
import { C, FONT } from "../theme";
import { Icon, txt } from "./base";
import { SH, SW } from "./Phone3D";

// Three design directions for the same generic business ("Tu negocio"): what a client gets before any page exists.
// No real client, no brand. #2 is the one the client picks in P3b and the page is then built in its style.
export type Style = {
  bg: string;
  ink: string;
  accent: string;
  alt: string;
  soft: string;
  heading: string;
  weight: number;
  hero: string;
  palette: string[];
};

export const STYLES: Style[] = [
  {
    bg: "#0F1B2D",
    ink: "#F3EBDD",
    accent: "#D4A55A",
    alt: "#6B7A90",
    soft: "#1B2B44",
    heading: "Georgia, 'Times New Roman', serif",
    weight: 700,
    hero: "linear-gradient(150deg,#2A3D5C 0%,#0F1B2D 100%)",
    palette: ["#0F1B2D", "#D4A55A", "#F3EBDD", "#6B7A90"],
  },
  {
    bg: "#F6F3EC",
    ink: "#1F2A2A",
    accent: "#2F6B4F",
    alt: "#E9B44C",
    soft: "#E6EFE8",
    heading: FONT,
    weight: 800,
    hero: "linear-gradient(150deg,#D4E7DA 0%,#8DB89E 100%)",
    palette: ["#F6F3EC", "#2F6B4F", "#E9B44C", "#1F2A2A"],
  },
  {
    bg: "#FFF4EC",
    ink: "#2B2D42",
    accent: "#E0603A",
    alt: "#8D99AE",
    soft: "#FFE6D8",
    heading: "'Avenir Next', 'Helvetica Neue', Arial, sans-serif",
    weight: 800,
    hero: "linear-gradient(150deg,#FFD8C6 0%,#F08A68 100%)",
    palette: ["#FFF4EC", "#E0603A", "#2B2D42", "#8D99AE"],
  },
];

export const CARD_W = 300;
export const CARD_H = 520;

export const ProposalCard: React.FC<{ st: Style; chosen?: number; heart?: number; pop?: number }> = ({ st, chosen = 0, heart = 0, pop = 0 }) => (
  <div
    style={{
      position: "relative",
      width: CARD_W,
      height: CARD_H,
      borderRadius: 26,
      background: st.bg,
      overflow: "hidden",
      boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 0 ${2 + 3 * chosen}px ${chosen > 0.02 ? `rgba(245,168,60,${0.4 + 0.6 * chosen})` : "rgba(255,255,255,0.10)"}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: st.accent }} />
        <div style={{ width: 60, height: 9, borderRadius: 5, background: st.ink, opacity: 0.55 }} />
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 16, height: 4, borderRadius: 2, background: st.ink, opacity: 0.4 }} />
        ))}
      </div>
    </div>
    <div style={{ margin: "16px 16px 0", height: 150, borderRadius: 16, background: st.hero, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, right: -20, top: -30, background: st.accent, opacity: 0.35 }} />
      <div style={{ position: "absolute", width: 80, height: 80, borderRadius: 20, left: 22, bottom: -20, background: st.alt, opacity: 0.45, transform: "rotate(18deg)" }} />
    </div>
    <div style={{ padding: "16px 18px 0" }}>
      <div style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 34, lineHeight: 1.05, color: st.ink, letterSpacing: "-0.02em" }}>Tu negocio</div>
      <div style={{ height: 8, width: "92%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 12 }} />
      <div style={{ height: 8, width: "70%", borderRadius: 4, background: st.ink, opacity: 0.25, marginTop: 7 }} />
      <div
        style={{
          marginTop: 16,
          width: 130,
          height: 40,
          borderRadius: 999,
          background: st.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...txt(16, 700, { color: st.bg === "#0F1B2D" ? "#0F1B2D" : "#FFFFFF", letterSpacing: 0 }),
        }}
      >
        Escribinos
      </div>
    </div>
    <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 7 }}>
        {st.palette.map((c, i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: c,
              border: "1.5px solid rgba(127,127,127,0.35)",
              transform: `translateY(${-10 * Math.max(0, Math.sin(Math.min(1, Math.max(0, pop * 1.6 - i * 0.18)) * Math.PI))}px)`,
            }}
          />
        ))}
      </div>
      <div style={{ fontFamily: st.heading, fontWeight: st.weight, fontSize: 40, color: st.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>Aa</div>
    </div>
    {heart > 0 && (
      <div style={{ position: "absolute", right: 16, top: 190, transform: `scale(${Math.sin(Math.min(1, heart) * Math.PI) * 1.25})` }}>
        <Icon name="solar:heart-bold" size={54} color="#FF4D6D" />
      </div>
    )}
  </div>
);

// The page being built in the chosen style: wireframe blocks drop in, then the type, the logo and the colours.
export const BuildScreen: React.FC<{ st: Style; blocks: number; type: number; logo: number; color: number }> = ({
  st,
  blocks,
  type,
  logo,
  color,
}) => {
  const ck = (i: number) => Math.max(0, Math.min(1, color * 1.5 - i * 0.12));
  const mix = (a: string, b: string, k: number) => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  const WIRE = "#E9ECF1";
  const LINE = "#B9C0CC";
  const block = (i: number, h: number, content: React.ReactNode, extra: React.CSSProperties = {}) => {
    const k = Math.max(0, Math.min(1, blocks - i));
    if (k <= 0) return null;
    const c = ck(i);
    return (
      <div
        style={{
          height: h,
          margin: "0 16px 14px",
          borderRadius: 16,
          border: `2px dashed ${c > 0.5 ? "transparent" : LINE}`,
          background: mix(WIRE, st.soft, c),
          opacity: k,
          transform: `translateY(${(1 - k) * -30}px) scale(${0.94 + 0.06 * k})`,
          position: "relative",
          overflow: "hidden",
          ...extra,
        }}
      >
        {content}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, width: SW, height: SH, background: mix("#F7F8FA", st.bg, ck(0)), fontFamily: FONT, paddingTop: 50 }}>
      {block(
        0,
        64,
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: "0 16px" }}>
          <div style={{ position: "relative", width: 44, height: 44 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 22, border: `2px dashed ${LINE}`, opacity: 1 - logo }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 22,
                background: st.accent,
                transform: `scale(${logo > 0 ? 0.6 + 0.4 * Math.min(1, logo) + 0.25 * Math.sin(Math.min(1, logo) * Math.PI) : 0})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, background: st.bg, transform: "rotate(45deg)" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{ width: 22, height: 5, borderRadius: 3, background: mix(LINE, st.ink, ck(0)) }} />
            ))}
          </div>
        </div>,
        { borderRadius: 14 },
      )}
      {block(
        1,
        250,
        <>
          <div style={{ position: "absolute", inset: 0, background: st.hero, opacity: ck(1) }} />
          <div style={{ position: "absolute", left: 18, bottom: 18, right: 18 }}>
            <div style={{ position: "relative", height: 72 }}>
              {[0, 1].map((j) => (
                <div
                  key={j}
                  style={{ height: 22, width: j === 0 ? "88%" : "60%", borderRadius: 8, background: LINE, opacity: 1 - type, marginBottom: 10 }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  fontFamily: st.heading,
                  fontWeight: st.weight,
                  fontSize: 34,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: mix("#3B4252", st.ink, ck(1)),
                  opacity: type,
                  transform: `translateY(${(1 - type) * 12}px)`,
                }}
              >
                Tu negocio, en su mejor versión
              </div>
            </div>
          </div>
        </>,
      )}
      {block(
        2,
        112,
        <div style={{ display: "flex", gap: 10, padding: 12, height: "100%", boxSizing: "border-box" }}>
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ flex: 1, borderRadius: 12, background: mix("#FFFFFF", st.bg, ck(2)), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: mix(LINE, j === 1 ? st.alt : st.accent, ck(2)) }} />
            </div>
          ))}
        </div>,
      )}
      {block(
        3,
        96,
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4].map((j) => (
              <Icon key={j} name="solar:star-bold" size={18} color={mix(LINE, C.gold, ck(3))} />
            ))}
          </div>
          <div style={{ height: 9, width: "85%", borderRadius: 5, background: mix(LINE, st.ink, ck(3)), opacity: 0.5, marginTop: 12 }} />
          <div style={{ height: 9, width: "60%", borderRadius: 5, background: mix(LINE, st.ink, ck(3)), opacity: 0.5, marginTop: 8 }} />
        </div>,
      )}
      {block(
        4,
        60,
        <div
          style={{
            height: "100%",
            borderRadius: 999,
            background: mix(LINE, st.accent, ck(4)),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...txt(19, 700, { color: "#FFFFFF", letterSpacing: 0, opacity: ck(4) }),
          }}
        >
          Pedí tu presupuesto
        </div>,
        { borderRadius: 999, border: "none", background: "transparent" },
      )}
    </div>
  );
};
