import React from "react";
import { clamp01, easeIn, lerp, pres, ramp, shown, SNAP, sp } from "../lib/anim";
import { C, UI_FONT } from "../theme";
import { G3, Icon, Obj } from "./base";
import { Caret } from "./Phone";
import { Slab, Shade } from "./Kit";

// A ChatGPT-like box (dark, no logo: the word is enough), the question typing itself and the answer writing back.
const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1.3, ...extra });
export const GptBox: React.FC<{
  f: number;
  at: number;
  out?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  question: string;
  qTyped: number[];
  caption?: string;
  answerAt?: number;
  answer?: string;
  aTyped?: number[];
  answerSub?: string;
  answerSubAt?: number;
  nothingAt?: number;
  nothing?: string;
}> = ({ f, at, out, x, y, w, h, title, question, qTyped, caption, answerAt, answer = "", aTyped, answerSub, answerSubAt, nothingAt, nothing }) => {
  const p = pres(f, at, out, SNAP, 12);
  if (p <= 0.001) return null;
  const k = sp(f, at, { damping: 17, stiffness: 110, mass: 1 });
  const o = out === undefined ? 0 : ramp(f, out, out + 12, 0, 1, easeIn);
  const nq = shown(qTyped, f);
  const qDone = nq >= question.length;
  const na = aTyped ? shown(aTyped, f) : answerAt !== undefined && f >= answerAt ? answer.length : 0;
  const sub = answerSubAt !== undefined ? sp(f, answerSubAt, SNAP) : 0;
  const no = nothingAt !== undefined ? sp(f, nothingAt, SNAP) : 0;
  const pad = 34;
  return (
    <Obj opacity={p}>
      <G3 x={x} y={y + 40 * o} w={w} h={h} tz={160} s={0.92 + 0.08 * clamp01(k)} rx={lerp(14, 0, clamp01(k))}>
        <Shade w={w} h={h} r={36} />
        <Slab w={w} h={h} r={36} face={C.gptBg} border="rgba(255,255,255,0.12)" sides={[[16, 16, 16], [36, 36, 36]]}>
          <div style={{ position: "absolute", left: pad, top: 26, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid #ECECEC", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ECECEC" }} />
            </div>
            <div style={ui(30, 500, { color: C.gptText })}>{title}</div>
          </div>
          {/* the composer */}
          <div style={{ position: "absolute", left: pad, right: pad, top: 86, minHeight: 92, borderRadius: 30, background: C.gptCard, border: "1.5px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "16px 24px 16px 30px", boxSizing: "border-box", gap: 18 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", flexWrap: "wrap", minWidth: 0, ...ui(32, 400, { color: nq ? C.gptText : C.gptMuted }) }}>
              <span>{nq ? question.slice(0, nq) : "Pregunta lo que quieras"}</span>
              <Caret f={f} on={nq > 0 && !qDone} h={36} color={C.gptText} />
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: qDone ? "#ECECEC" : "#4A4A4A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="ri:arrow-up-line" size={34} color={qDone ? "#1E1E1E" : "#9A9A9A"} />
            </div>
          </div>
          {caption && qDone && <div style={{ position: "absolute", left: pad + 8, top: 190, ...ui(23, 400, { color: C.gptMuted, opacity: clamp01(sp(f, qTyped[qTyped.length - 1] + 4, SNAP) * 1.5) }) }}>{caption}</div>}
          {/* the answer */}
          {na > 0 && (
            <div style={{ position: "absolute", left: pad, right: pad, top: 232, display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, border: "3px solid #ECECEC", boxSizing: "border-box", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                <div style={{ width: 13, height: 13, borderRadius: 7, background: "#ECECEC" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={ui(34, 500, { color: C.gptText })}>
                  <span style={{ backgroundImage: "linear-gradient(transparent 62%, rgba(245,168,60,0.55) 62%)" }}>{answer.slice(0, na)}</span>
                  <Caret f={f} on={na < answer.length} h={36} color={C.gptText} />
                </div>
                {answerSub && sub > 0 && <div style={{ ...ui(25, 400, { color: C.gptMuted, marginTop: 10 }), opacity: clamp01(sub * 1.5) }}>{answerSub}</div>}
              </div>
            </div>
          )}
          {nothing && no > 0 && (
            <div style={{ position: "absolute", left: pad, right: pad, top: 232, display: "flex", gap: 18, alignItems: "center", opacity: clamp01(no * 1.5) }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, border: "3px solid #ECECEC", boxSizing: "border-box", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 13, height: 13, borderRadius: 7, background: "#ECECEC" }} />
              </div>
              <div style={ui(32, 400, { color: C.gptText })}>{nothing}</div>
            </div>
          )}
        </Slab>
      </G3>
    </Obj>
  );
};
