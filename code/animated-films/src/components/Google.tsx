import React from "react";
import { clamp01, ramp, shown, SNAP, sp } from "../lib/anim";
import { C, UI_FONT } from "../theme";
import { Icon } from "./base";
import { Caret, Keyboard, KB_H, Tap } from "./Phone";

// Google on the searcher's phone, light theme, inside a Screen: the search bar typing a query on a human rhythm,
// the suggestions dropping under it, then (after Enter) three generic results and a tap on one of them. No logo:
// a search is shown as a search bar (house rule), the results are invented, no real business.
const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: UI_FONT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.25,
  ...extra,
});

export type GResult = { name: string; title: string; snippet: string; color: string };

export const GooglePage: React.FC<{
  f: number;
  w: number;
  h: number;
  barAt: number;
  query: string;
  typed: number[];
  suggestions?: string[];
  suggestAt?: number[];
  enterAt?: number;
  results?: GResult[];
  resultsAt?: number[];
  tapAt?: number;
  tapIndex?: number;
  hint?: string;
}> = ({ f, w, h, barAt, query, typed, suggestions = [], suggestAt = [], enterAt, results = [], resultsAt = [], tapAt, tapIndex = 0, hint = "Buscar" }) => {
  const bar = sp(f, barAt, SNAP);
  const n = shown(typed, f);
  const entered = enterAt !== undefined && f >= enterAt;
  const text = query.slice(0, n);
  const press = enterAt === undefined ? 0 : ramp(f, enterAt, enterAt + 2) - ramp(f, enterAt + 2, enterAt + 8);
  const pad = 28;
  const barH = 104;
  const listTop = pad + 22 + barH + 18;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#FFFFFF" }}>
      {/* status bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", ...ui(22, 500, { color: C.gText }) }}>
        <div>10:41</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 20, height: 12, borderRadius: 2, border: `2px solid ${C.gText}`, position: "relative" }}>
            <div style={{ position: "absolute", left: 2, top: 2, bottom: 2, width: 10, background: C.gText }} />
          </div>
        </div>
      </div>
      {/* the bar */}
      {bar > 0 && (
        <div
          style={{
            position: "absolute",
            left: pad,
            right: pad,
            top: pad + 22,
            height: barH,
            borderRadius: barH / 2,
            background: entered ? "#F1F3F4" : "#FFFFFF",
            boxShadow: entered ? "none" : "0 2px 10px rgba(32,33,36,0.22)",
            display: "flex",
            alignItems: "center",
            padding: "0 30px",
            boxSizing: "border-box",
            gap: 22,
            opacity: clamp01(bar * 1.5),
            transform: `scale(${(0.9 + 0.1 * Math.min(1.05, bar) - 0.02 * press).toFixed(3)})`,
          }}
        >
          <Icon name="ri:search-line" size={40} color={C.gMuted} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
            <div style={ui(36, 400, { color: text ? C.gText : "#9AA0A6", whiteSpace: "nowrap" })}>{text || hint}</div>
            <Caret f={f} on={!entered && f >= typed[0] - 10} h={44} color={C.gBlue} />
          </div>
          <Icon name="ri:mic-fill" size={38} color={C.gBlue} />
        </div>
      )}
      {/* suggestions while typing */}
      {!entered &&
        suggestions.map((s, i) => {
          const k = sp(f, suggestAt[i] ?? 10 ** 6, SNAP);
          if (k <= 0) return null;
          return (
            <div key={i} style={{ position: "absolute", left: pad + 8, right: pad + 8, top: listTop + i * 84, height: 84, display: "flex", alignItems: "center", gap: 24, opacity: clamp01(k * 1.5), transform: `translateY(${((1 - clamp01(k)) * -10).toFixed(1)}px)` }}>
              <Icon name="ri:search-line" size={32} color="#9AA0A6" />
              <div style={ui(32, 400, { color: C.gText, whiteSpace: "nowrap" })}>
                {s.startsWith(query.slice(0, n)) ? (
                  <>
                    <span>{s.slice(0, n)}</span>
                    <span style={{ fontWeight: 500 }}>{s.slice(n)}</span>
                  </>
                ) : (
                  s
                )}
              </div>
            </div>
          );
        })}
      {/* results */}
      {entered &&
        results.map((r, i) => {
          const k = sp(f, resultsAt[i] ?? 10 ** 6, SNAP);
          if (k <= 0) return null;
          const top = listTop + 10 + i * 258;
          return (
            <div key={i} style={{ position: "absolute", left: pad + 8, right: pad + 8, top, height: 232, opacity: clamp01(k * 1.5), transform: `translateY(${((1 - clamp01(k)) * 24).toFixed(1)}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 26, background: "#F1F3F4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: r.color }} />
                </div>
                <div>
                  <div style={ui(26, 400, { color: C.gText })}>{r.name}</div>
                  <div style={ui(22, 400, { color: C.gMuted })}>{r.name.toLowerCase().replace(/\s+/g, "") + ".com.py"}</div>
                </div>
              </div>
              <div style={{ ...ui(34, 400, { color: "#1A0DAB", marginTop: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) }}>{r.title}</div>
              <div style={{ ...ui(26, 400, { color: "#4D5156", marginTop: 8 }) }}>{r.snippet}</div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: -12, height: 1, background: "#ECEEF1" }} />
            </div>
          );
        })}
      {tapAt !== undefined && entered && <Tap f={f} at={tapAt} x={w / 2 - 40} y={listTop + 10 + tapIndex * 258 + 110} dark />}
      <Keyboard f={f} w={w} y={h - KB_H(w)} typed={typed} text={query} show={!entered && f >= typed[0] - 10} />
    </div>
  );
};
