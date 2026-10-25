import React from "react";
import { C, FONT } from "../theme";
import { CheckBadge } from "./Bits";
import { Icon, txt } from "./base";
import { SH, SW } from "./Phone3D";
import icons from "../data/icons.json";

type IconName = keyof typeof icons;

export const GLASS = "linear-gradient(180deg,rgba(14,22,40,0.93),rgba(5,10,22,0.9))";

// Dark glass pill: icon + text (+ optional check). gold = mine, gray = the average page.
export const Pill: React.FC<{ icon: IconName; text: string; tone: "gold" | "gray" | "wa"; size?: number; check?: number }> = ({
  icon,
  text,
  tone,
  size = 40,
  check = -1,
}) => {
  const col = tone === "gold" ? C.gold : tone === "wa" ? C.wa : "rgba(225,229,236,0.9)";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.35,
        padding: `${size * 0.32}px ${size * 0.7}px ${size * 0.32}px ${size * 0.42}px`,
        borderRadius: 999,
        background: GLASS,
        border: `2.5px solid ${tone === "gold" ? "rgba(245,168,60,0.9)" : tone === "wa" ? "rgba(37,211,102,0.9)" : "rgba(255,255,255,0.22)"}`,
        boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
      }}
    >
      <Icon name={icon} size={size * 1.3} color={col} />
      <div style={{ ...txt(size, 700, { color: tone === "gray" ? "rgba(255,255,255,0.9)" : "#FFFFFF" }) }}>{text}</div>
      {check >= 0 && <CheckBadge k={check} tone={tone === "wa" ? "wa" : tone} size={size * 1.2} />}
    </div>
  );
};

// Technical SEO, seen from inside the page: structured data and the head tags. Generic business, no name.
const CODE: [string, string][][] = [
  [["#7AA2F7", "<script"], ["#9ECE6A", ' type="application/ld+json"'], ["#7AA2F7", ">"]],
  [["#C0CAF5", "{"]],
  [["#BB9AF7", '  "@type"'], ["#C0CAF5", ": "], ["#E0AF68", '"LocalBusiness"'], ["#C0CAF5", ","]],
  [["#BB9AF7", '  "areaServed"'], ["#C0CAF5", ": "], ["#E0AF68", '"San Lorenzo"'], ["#C0CAF5", ","]],
  [["#BB9AF7", '  "openingHours"'], ["#C0CAF5", ": "], ["#E0AF68", '"Mo-Sa 08:00-18:00"'], ["#C0CAF5", ","]],
  [["#BB9AF7", '  "telephone"'], ["#C0CAF5", ": "], ["#E0AF68", '"+595..."']],
  [["#C0CAF5", "}"]],
  [["#7AA2F7", "</script>"]],
  [["#7AA2F7", "<title>"], ["#C0CAF5", "Vidriería en San Lorenzo"], ["#7AA2F7", "</title>"]],
  [["#7AA2F7", "<meta"], ["#9ECE6A", ' name="description"'], ["#7AA2F7", " />"]],
  [["#7AA2F7", "<link"], ["#9ECE6A", ' rel="canonical"'], ["#7AA2F7", " />"]],
  [["#565F89", "<!-- sitemap.xml, robots.txt -->"]],
];

export const CodeScreen: React.FC<{ lines: number }> = ({ lines }) => (
  <div style={{ position: "absolute", inset: 0, width: SW, height: SH, background: "#0E1424", paddingTop: 64 }}>
    {CODE.map((row, i) => {
      const k = Math.max(0, Math.min(1, lines - i));
      if (k <= 0) return null;
      return (
        <div key={i} style={{ display: "flex", gap: 10, padding: "5px 14px", opacity: k, transform: `translateX(${(1 - k) * 16}px)` }}>
          <div style={{ width: 22, textAlign: "right", fontFamily: "Menlo, monospace", fontSize: 15, color: "#3B4261" }}>{i + 1}</div>
          <div style={{ fontFamily: "Menlo, monospace", fontSize: 16.5, whiteSpace: "nowrap", letterSpacing: 0 }}>
            {row.map(([c, s], j) => (
              <span key={j} style={{ color: c }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

// Generic person (whoever is behind a page).
export const Person: React.FC<{ size: number; tone: "gray" | "gold" }> = ({ size, tone }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: tone === "gold" ? "radial-gradient(circle at 35% 30%,#22365F,#0A1730 75%)" : "radial-gradient(circle at 35% 30%,#5D6575,#2C313B 75%)",
      border: `3px solid ${tone === "gold" ? "rgba(245,168,60,0.85)" : "rgba(255,255,255,0.25)"}`,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
    }}
  >
    <Icon name="solar:user-rounded-bold-duotone" size={size * 0.86} color={tone === "gold" ? C.gold : "#C9CFD9"} />
  </div>
);

// A skill with a level bar (P5a: "programación" full, "un poquito de diseño").
export const SkillBar: React.FC<{ icon: IconName; text: string; level: number; fill: number }> = ({ icon, text, level, fill }) => (
  <div
    style={{
      width: 380,
      padding: "18px 24px",
      borderRadius: 26,
      background: GLASS,
      border: "2px solid rgba(255,255,255,0.18)",
      boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
      boxSizing: "border-box",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Icon name={icon} size={48} color="rgba(225,229,236,0.9)" />
      <div style={{ ...txt(38, 700, { color: "rgba(255,255,255,0.92)" }) }}>{text}</div>
    </div>
    <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", marginTop: 14, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${level * fill * 100}%`, borderRadius: 7, background: "linear-gradient(90deg,#9AA3B2,#E3E7EE)" }} />
    </div>
  </div>
);

// WhatsApp-style chat card. tone gray = the average page's maker, gold = me.
export const ChatCard: React.FC<{
  tone: "gray" | "gold";
  name: string;
  w: number;
  out?: { text: string; k: number; ticks: "one" | "blue"; time: string };
  inc?: { text: string; k: number; time: string };
  reply?: { text: string; k: number; time: string };
}> = ({ tone, name, w, out, inc, reply }) => {
  const head = tone === "gold" ? C.gold : "#9AA3B2";
  const bubble = (side: "in" | "out", text: string, time: string, k: number, ticks?: "one" | "blue") => (
    <div
      style={{
        alignSelf: side === "out" ? "flex-end" : "flex-start",
        maxWidth: w * 0.8,
        padding: "16px 22px 12px",
        borderRadius: side === "out" ? "26px 26px 8px 26px" : "26px 26px 26px 8px",
        background: side === "out" ? "#005C4B" : "#202C33",
        opacity: k,
        transform: `translateY(${(1 - k) * 20}px) scale(${0.9 + 0.1 * k})`,
        transformOrigin: side === "out" ? "100% 100%" : "0% 100%",
      }}
    >
      <div style={{ ...txt(30, 600, { color: "#E9EDEF", whiteSpace: "normal", lineHeight: 1.2, letterSpacing: "-0.01em" }) }}>{text}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginTop: 6 }}>
        <div style={{ ...txt(19, 500, { color: "rgba(233,237,239,0.6)", letterSpacing: 0 }) }}>{time}</div>
        {ticks && (
          <Icon
            name={ticks === "blue" ? "solar:check-read-linear" : "solar:check-circle-bold"}
            size={ticks === "blue" ? 28 : 20}
            color={ticks === "blue" ? "#53BDEB" : "rgba(233,237,239,0.45)"}
          />
        )}
      </div>
    </div>
  );
  return (
    <div
      style={{
        width: w,
        borderRadius: 34,
        background: "#0B141A",
        border: `2.5px solid ${tone === "gold" ? "rgba(245,168,60,0.8)" : "rgba(255,255,255,0.16)"}`,
        boxShadow: "0 26px 50px rgba(0,0,0,0.55)",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", background: "#1F2C34" }}>
        <div style={{ width: 54, height: 54, borderRadius: 27, background: head, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="solar:user-rounded-bold-duotone" size={40} color={tone === "gold" ? C.navy : "#2C313B"} />
        </div>
        <div style={{ ...txt(32, 700, { color: "#E9EDEF" }) }}>{name}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 18px 24px", minHeight: 200 }}>
        {inc && inc.k > 0 && bubble("in", inc.text, inc.time, inc.k)}
        {out && out.k > 0 && bubble("out", out.text, out.time, out.k, out.ticks)}
        {reply && reply.k > 0 && bubble("in", reply.text, reply.time, reply.k)}
      </div>
    </div>
  );
};

// 14-day calendar (two rows of seven): days up to `done` get a gold check, `live` (0..1) lights day 14 green.
export const Calendar: React.FC<{ done: number; live?: number; w?: number }> = ({ done, live = 0, w = 900 }) => {
  const cell = (w - 6 * 14) / 7;
  return (
    <div style={{ width: w, display: "grid", gridTemplateColumns: `repeat(7, ${cell}px)`, gap: 14 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const k = Math.max(0, Math.min(1, done - i));
        const last = i === 13;
        const green = last ? live : 0;
        return (
          <div
            key={i}
            style={{
              height: cell * 0.86,
              borderRadius: 18,
              background: green > 0.05 ? `rgba(37,211,102,${0.25 + 0.6 * green})` : k > 0 ? `rgba(245,168,60,${0.18 + 0.5 * k})` : "rgba(255,255,255,0.07)",
              border: `2px solid ${green > 0.05 ? C.wa : k > 0 ? "rgba(245,168,60,0.85)" : "rgba(255,255,255,0.12)"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${1 + 0.12 * Math.sin(k * Math.PI)})`,
            }}
          >
            <div style={{ ...txt(20, 600, { color: "rgba(255,255,255,0.6)", letterSpacing: 0 }) }}>Día</div>
            <div style={{ ...txt(38, 800, { color: "#FFFFFF" }) }}>{i + 1}</div>
          </div>
        );
      })}
    </div>
  );
};

// The daily report as a WhatsApp message from Joaquín.
export const ReportCard: React.FC<{ day: number; rows: number[]; w?: number }> = ({ day, rows, w = 860 }) => {
  const R: { icon: IconName; col: string; title: string; body: string }[] = [
    { icon: "solar:check-circle-bold", col: C.wa, title: "Cómo vamos", body: "Inicio y servicios listos" },
    { icon: "solar:hourglass-bold-duotone", col: C.gold, title: "Qué falta", body: "Galería y contacto" },
    { icon: "solar:chat-round-line-bold-duotone", col: "#53BDEB", title: "Necesito de vos", body: "Fotos del local" },
  ];
  return (
    <div style={{ width: w, borderRadius: 36, background: "#005C4B", padding: "28px 34px 22px", boxSizing: "border-box", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Icon name="solar:document-text-bold-duotone" size={50} color="#E9EDEF" />
        <div style={{ ...txt(42, 800, { color: "#FFFFFF" }) }}>{`Reporte del día ${day}`}</div>
      </div>
      {R.map((r, i) => {
        const k = rows[i] ?? 0;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginTop: 22,
              padding: "16px 20px",
              borderRadius: 22,
              background: "rgba(0,0,0,0.18)",
              opacity: k,
              transform: `translateX(${(1 - k) * 30}px)`,
            }}
          >
            <Icon name={r.icon} size={48} color={r.col} />
            <div>
              <div style={{ ...txt(30, 700, { color: "rgba(233,237,239,0.7)" }) }}>{r.title}</div>
              <div style={{ ...txt(38, 700, { color: "#FFFFFF", marginTop: 4 }) }}>{r.body}</div>
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 14 }}>
        <div style={{ ...txt(22, 500, { color: "rgba(233,237,239,0.7)", letterSpacing: 0 }) }}>18:30</div>
        <Icon name="solar:check-read-linear" size={32} color="#53BDEB" />
      </div>
    </div>
  );
};

// A page with what we measure on it: where people tap (heat), where they go (a replay cursor), and a block that gets
// better (A -> B).
export const HeatPage: React.FC<{ heat: number; replay: number; better: number }> = ({ heat, replay, better }) => {
  const blobs = [
    [180, 300, 120, 1],
    [120, 470, 90, 0.8],
    [250, 610, 110, 0.95],
    [200, 140, 70, 0.6],
  ];
  const path = [
    [60, 120],
    [220, 260],
    [170, 420],
    [260, 560],
    [200, 640],
  ];
  const seg = replay * (path.length - 1);
  const i0 = Math.min(path.length - 2, Math.floor(seg));
  const f = seg - i0;
  const cx = path[i0][0] + (path[i0 + 1][0] - path[i0][0]) * f;
  const cy = path[i0][1] + (path[i0 + 1][1] - path[i0][1]) * f;
  return (
    <div style={{ position: "absolute", inset: 0, width: SW, height: SH, background: "#F6F3EC", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ height: 64, margin: "54px 16px 14px", borderRadius: 14, background: "#E6EFE8" }} />
      <div style={{ height: 230, margin: "0 16px 14px", borderRadius: 16, background: "linear-gradient(150deg,#D4E7DA,#8DB89E)" }} />
      <div style={{ height: 110, margin: "0 16px 14px", borderRadius: 16, background: "#E6EFE8" }} />
      <div style={{ position: "relative", height: 110, margin: "0 16px 14px" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: "#E6EFE8", opacity: 1 - better }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            background: "#2F6B4F",
            opacity: better,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...txt(22, 700, { color: "#FFFFFF", letterSpacing: 0 }),
          }}
        >
          Escribinos por WhatsApp
        </div>
      </div>
      {blobs.map(([x, y, r, s], i) => {
        const k = Math.max(0, Math.min(1, heat * 1.6 - i * 0.2));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              background: "radial-gradient(circle, rgba(255,40,40,0.75) 0%, rgba(255,170,0,0.55) 40%, rgba(255,230,0,0.25) 65%, rgba(255,230,0,0) 72%)",
              transform: `scale(${k * (s as number)})`,
            }}
          />
        );
      })}
      {replay > 0 && replay < 1.2 && (
        <div style={{ position: "absolute", left: cx - 6, top: cy - 4 }}>
          <Icon name="solar:cursor-bold-duotone" size={52} color="#111827" />
        </div>
      )}
    </div>
  );
};

// The landing's own form (BRANDING/WEBSITE/LANDING-VSL-PY: "Contanos de tu negocio"), fields typed on Joaquín's words.
export const FormCard: React.FC<{ fields: { label: string; value: string; k: number }[]; send: number; w?: number }> = ({ fields, send, w = 860 }) => (
  <div
    style={{
      width: w,
      borderRadius: 40,
      background: "#FFFFFF",
      padding: "40px 44px 36px",
      boxSizing: "border-box",
      boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
      fontFamily: FONT,
    }}
  >
    <div style={{ ...txt(50, 800, { color: C.navy }) }}>Contanos de tu negocio</div>
    {fields.map((f, i) => {
      const n = Math.round(f.value.length * Math.max(0, Math.min(1, f.k)));
      const active = f.k > 0 && f.k < 1;
      const done = f.k >= 1;
      return (
        <div key={i} style={{ marginTop: 24 }}>
          <div style={{ ...txt(28, 600, { color: "#5B6475", letterSpacing: 0 }) }}>{f.label}</div>
          <div
            style={{
              marginTop: 8,
              height: 78,
              borderRadius: 18,
              border: `3px solid ${active ? C.gold : done ? "rgba(37,211,102,0.8)" : "#D5DAE2"}`,
              background: "#F7F8FA",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 22px",
            }}
          >
            <div style={{ ...txt(34, 600, { color: "#111827", letterSpacing: "-0.01em" }), display: "flex", alignItems: "center" }}>
              {f.value.slice(0, n)}
              {active && <span style={{ display: "inline-block", width: 3, height: 38, marginLeft: 3, background: C.navy }} />}
            </div>
            {done && <Icon name="solar:check-circle-bold" size={40} color={C.wa} />}
          </div>
        </div>
      );
    })}
    <div
      style={{
        marginTop: 32,
        height: 88,
        borderRadius: 999,
        background: "linear-gradient(180deg,#FFC66B,#F5A83C)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${1 + 0.05 * Math.sin(Math.min(1, send) * Math.PI)})`,
        boxShadow: `0 0 ${24 * send}px rgba(245,168,60,${0.5 * send})`,
        ...txt(38, 800, { color: C.navy, letterSpacing: "-0.01em" }),
      }}
    >
      Enviar mis datos
    </div>
  </div>
);

// Cascading chevrons pointing down (to the form under the video).
export const DownArrows: React.FC<{ t: number; k: number; size?: number; color?: string }> = ({ t, k, size = 90, color = C.gold }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: k }}>
    {[0, 1, 2].map((i) => {
      const ph = (t * 1.6 - i * 0.22) % 1;
      const a = Math.max(0, Math.sin(Math.max(0, ph) * Math.PI));
      return (
        <div key={i} style={{ marginTop: i === 0 ? 0 : -size * 0.42, opacity: 0.25 + 0.75 * a, transform: `translateY(${a * 10}px)` }}>
          <Icon name="solar:alt-arrow-down-bold" size={size} color={color} />
        </div>
      );
    })}
  </div>
);

// Joaquín's video analysis, Loom-style: a 9:16 card with Joaquín's bubble, REC while recording, then a play bar.
export const VideoCard: React.FC<{ rec: number; play: number; w?: number }> = ({ rec, play, w = 300 }) => {
  const h = w * 1.6;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 30, background: "linear-gradient(160deg,#16305C,#081A3A)", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.5)", border: "2.5px solid rgba(245,168,60,0.8)" }}>
      <div style={{ position: "absolute", left: 22, top: 26, right: 22, height: h * 0.42, borderRadius: 18, background: "rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10, padding: 16, boxSizing: "border-box" }}>
        {[0.9, 0.7, 0.8, 0.5].map((x, i) => (
          <div key={i} style={{ height: 14, width: `${x * 100}%`, borderRadius: 7, background: "rgba(255,255,255,0.18)" }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: "50%", bottom: h * 0.16, transform: "translateX(-50%)" }}>
        <div style={{ width: w * 0.42, height: w * 0.42, borderRadius: "50%", border: `4px solid ${C.gold}`, overflow: "hidden", background: "radial-gradient(circle at 35% 30%,#22365F,#0A1730 75%)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <Icon name="solar:user-rounded-bold-duotone" size={w * 0.36} color={C.gold} />
        </div>
      </div>
      {rec > 0 && rec < 1 && (
        <div style={{ position: "absolute", right: 18, top: 18, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(0,0,0,0.55)", ...txt(22, 700, { color: "#FFFFFF", letterSpacing: "0.04em" }) }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#FF3B30" }} />
          REC
        </div>
      )}
      {play > 0 && (
        <>
          <div style={{ position: "absolute", left: "50%", top: h * 0.3, transform: `translate(-50%,-50%) scale(${Math.max(0, 1 - play * 3)})`, width: 96, height: 96, borderRadius: 48, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="solar:play-bold" size={52} color={C.navy} />
          </div>
          <div style={{ position: "absolute", left: 20, right: 20, bottom: 18, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.2)" }}>
            <div style={{ width: `${Math.min(1, play) * 100}%`, height: "100%", borderRadius: 4, background: C.gold }} />
          </div>
        </>
      )}
    </div>
  );
};
