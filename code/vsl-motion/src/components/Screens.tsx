import React from "react";
import { C, FONT } from "../theme";
import { Icon, txt } from "./base";
import { SH, SW } from "./Phone3D";

// "La página promedio": a generic template. Gray, tidy, nothing wrong with it, nothing that sells.
export const TemplateScreen: React.FC<{ accent?: string; logo?: number; sparkle?: number }> = ({
  accent = "#6E86B5",
  logo = 0,
  sparkle = 0,
}) => (
  <div style={{ position: "absolute", inset: 0, width: SW, height: SH, background: "#F3F4F7", fontFamily: FONT }}>
    <div
      style={{
        height: 92,
        paddingTop: 44,
        paddingLeft: 22,
        paddingRight: 22,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 0 #E3E6EC",
      }}
    >
      <LogoSlot variant={logo} accent={accent} />
      <Icon name="solar:hamburger-menu-bold" size={30} color="#9AA2B0" />
    </div>
    <div
      style={{
        margin: "18px 18px 0",
        height: 230,
        borderRadius: 16,
        background: "linear-gradient(160deg,#DDE1E8 0%,#C4CAD5 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Icon name="solar:gallery-bold-duotone" size={78} color="#97A0AE" />
      {sparkle > 0 && <Sparkles k={sparkle} />}
    </div>
    <div style={{ padding: "22px 22px 0" }}>
      <div style={{ ...txt(30, 700, { whiteSpace: "normal", color: "#3B4252", lineHeight: 1.12 }) }}>Bienvenidos a nuestra empresa</div>
      {[100, 94, 72].map((wPct, i) => (
        <div key={i} style={{ height: 12, width: `${wPct}%`, borderRadius: 6, background: "#D5D9E0", marginTop: i === 0 ? 18 : 10 }} />
      ))}
      <div
        style={{
          marginTop: 22,
          width: 150,
          height: 50,
          borderRadius: 10,
          background: accent,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...txt(19, 600, { letterSpacing: 0 }),
        }}
      >
        Ver más
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 96, borderRadius: 12, background: "#E3E6EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: accent, opacity: 0.55 }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LogoSlot: React.FC<{ variant: number; accent: string }> = ({ variant, accent }) => {
  if (variant === 0) {
    return (
      <div
        style={{
          width: 104,
          height: 38,
          borderRadius: 8,
          border: "2px dashed #AEB5C2",
          color: "#8E96A4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...txt(17, 700, { letterSpacing: "0.08em" }),
        }}
      >
        LOGO
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 14, height: 14, borderRadius: 4, background: "#FFFFFF", transform: "rotate(45deg)" }} />
      </div>
      <div style={{ ...txt(20, 700, { color: "#3B4252", letterSpacing: "-0.02em" }) }}>Tu marca</div>
    </div>
  );
};

const Sparkles: React.FC<{ k: number }> = ({ k }) => (
  <>
    {[
      [70, 60, 1],
      [255, 48, 0.75],
      [210, 160, 0.9],
      [110, 175, 0.6],
    ].map(([x, y, s], i) => {
      const local = Math.max(0, Math.min(1, k * 1.6 - i * 0.18));
      const sc = Math.sin(local * Math.PI) * (s as number);
      return (
        <div key={i} style={{ position: "absolute", left: x as number, top: y as number, transform: `translate(-50%,-50%) scale(${sc})` }}>
          <Icon name="solar:stars-bold-duotone" size={54} color="#FFFFFF" />
        </div>
      );
    })}
  </>
);

// "Mi página": dark, gold accents, one clear promise and a big WhatsApp button. Generic business, no brand.
export const PremiumScreen: React.FC<{
  highlight?: number;
  tap?: number;
  pulse?: number;
  scroll?: number;
  sparkle?: number;
  eyebrow?: string;
  title?: string;
  sub?: string;
  icon?: "solar:sofa-bold-duotone" | "solar:home-smile-bold-duotone";
}> = ({
  highlight = 0,
  tap = 0,
  pulse = 0,
  scroll = 0,
  sparkle = 0,
  eyebrow = "COCINAS A MEDIDA",
  title = "Tu cocina nueva, lista en 20 días",
  sub = "Medimos en tu casa y te pasamos el presupuesto en 24 horas.",
  icon = "solar:sofa-bold-duotone",
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      width: SW,
      height: SH,
      background: "linear-gradient(180deg,#0C2350 0%,#081A3A 55%,#06142C 100%)",
      fontFamily: FONT,
      overflow: "hidden",
    }}
  >
    <div style={{ position: "absolute", left: 0, top: -scroll, width: SW }}>
      <div style={{ height: 92, paddingTop: 44, paddingLeft: 22, paddingRight: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(145deg,#FFD58A,#F5A83C)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={26} color={C.navy} />
        </div>
        <Icon name="solar:hamburger-menu-bold" size={30} color="rgba(255,255,255,0.75)" />
      </div>
      <div style={{ padding: "16px 22px 0" }}>
        <div style={{ ...txt(15, 600, { color: C.gold, letterSpacing: "0.06em" }) }}>{eyebrow}</div>
        <div style={{ position: "relative", marginTop: 10 }}>
          <div style={{ ...txt(36, 800, { whiteSpace: "normal", color: "#FFFFFF", lineHeight: 1.06, position: "relative", zIndex: 1 }) }}>
            {title}
          </div>
          <div
            style={{
              position: "absolute",
              left: -6,
              bottom: 2,
              height: 16,
              width: `${highlight * 96}%`,
              borderRadius: 8,
              background: "linear-gradient(90deg,rgba(245,168,60,0.95),rgba(255,213,138,0.9))",
              zIndex: 0,
              opacity: 0.9,
            }}
          />
        </div>
        <div style={{ ...txt(17, 500, { whiteSpace: "normal", color: "rgba(255,255,255,0.72)", letterSpacing: 0, lineHeight: 1.35, marginTop: 12 }) }}>
          {sub}
        </div>
        <div style={{ position: "relative", marginTop: 18 }}>
          <div
            style={{
              height: 64,
              borderRadius: 999,
              background: C.wa,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transform: `scale(${1 + 0.05 * pulse - 0.04 * Math.sin(Math.min(1, tap * 2) * Math.PI)})`,
              boxShadow: `0 0 ${30 * pulse}px rgba(37,211,102,${0.7 * pulse})`,
            }}
          >
            <Icon name="ri:whatsapp-fill" size={30} color={C.waInk} />
            <div style={{ ...txt(19, 700, { color: C.waInk, letterSpacing: "-0.01em" }) }}>Escribinos por WhatsApp</div>
          </div>
          {tap > 0 && tap < 1 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 40 + tap * 260,
                height: 40 + tap * 260,
                marginLeft: -(20 + tap * 130),
                marginTop: -(20 + tap * 130),
                borderRadius: "50%",
                border: `4px solid rgba(255,255,255,${0.85 * (1 - tap)})`,
              }}
            />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} name="solar:star-bold" size={20} color={C.gold} />
          ))}
          <div style={{ ...txt(16, 600, { color: "rgba(255,255,255,0.8)", letterSpacing: 0, marginLeft: 4 }) }}>4,9 en Google</div>
        </div>
        <div
          style={{
            marginTop: 20,
            height: 210,
            borderRadius: 18,
            background: "linear-gradient(150deg,#F0C27D 0%,#C98A43 45%,#7A4E22 100%)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 25%,rgba(255,255,255,0.35),rgba(255,255,255,0) 55%)" }} />
          <Icon name={icon} size={110} color="rgba(255,244,225,0.9)" />
          {sparkle > 0 && <Sparkles k={sparkle} />}
        </div>
      </div>
    </div>
  </div>
);
