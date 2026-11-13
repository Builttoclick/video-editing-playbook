import React from "react";
import { clamp01, easeInOut, ramp, shown, SNAP, sp } from "../lib/anim";
import { C, FONT, UI_FONT } from "../theme";
import { Icon } from "./base";
import { Tap } from "./Phone";

// Web pages inside a Screen. SitePage is the generic premium page we would make (no brand of a client: an invented
// business, its headline writing itself, three finished-house photos, the WhatsApp button always at hand).
// TemplatePage is the cheap one (a slider, "Bienvenidos", a paragraph that says nothing, no button in sight).
// EmptyPage is a page with nothing written on it. Scan is the gold line that reads a page top to bottom.
export type SiteCopy = { brand: string; nav: string[]; headline: string; sub: string; button: string; services?: string[] };
const ACCENTS = {
  gold: { a: C.gold, b: "#2A3D5C", c: "#0F1F42", ink: C.navy },
  green: { a: "#2F6B4F", b: "#8DB89E", c: "#2F6B4F", ink: "#1F2A2A" },
  blue: { a: "#1F4E9C", b: "#9FB3D6", c: "#15213B", ink: "#15213B" },
  terra: { a: "#B4552A", b: "#E0A98A", c: "#5A2A14", ink: "#2A1A12" },
};
export type Accent = keyof typeof ACCENTS;

const House: React.FC<{ i: number; w: number; h: number }> = ({ i, w, h }) => {
  const skies = ["#DCE8F5", "#E8E3D4", "#D8E6E0"];
  const walls = ["#F6F1E8", "#EDE6DA", "#F2EEE6"];
  const roofs = ["#3B4B63", "#6B4F3A", "#2E3E4F"];
  const sky = skies[i % 3];
  return (
    <svg width={w} height={h} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sky${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky} />
          <stop offset="1" stopColor="#F4F6F9" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#sky${i})`} />
      <rect y="112" width="200" height="38" fill="#B9C9A8" />
      <rect x="0" y="126" width="200" height="24" fill="#A7B894" />
      {i === 1 ? <circle cx="168" cy="96" r="22" fill="#7FA66E" /> : <circle cx="30" cy="92" r="26" fill="#86AD74" />}
      <rect x={i === 2 ? 40 : 56} y="66" width={i === 2 ? 118 : 96} height="50" fill={walls[i % 3]} />
      {i === 2 ? <rect x="40" y="56" width="118" height="12" fill={roofs[i % 3]} /> : <polygon points={`${48},68 ${104},36 ${160},68`} fill={roofs[i % 3]} />}
      <rect x={i === 2 ? 92 : 96} y="88" width="16" height="28" fill={roofs[i % 3]} />
      <rect x={i === 2 ? 56 : 66} y="78" width="18" height="16" fill="#8FB7DA" />
      <rect x={i === 2 ? 126 : 118} y="78" width="18" height="16" fill="#8FB7DA" />
      {i === 2 && <rect x="56" y="100" width="18" height="12" fill="#8FB7DA" />}
    </svg>
  );
};

const Truck: React.FC<{ i: number; w: number; h: number }> = ({ i, w, h }) => {
  const skies = ["#E3E9F1", "#EDE6DA", "#DCE4EA"];
  const bodies = ["#2F5A9E", "#B4552A", "#3B4B63"];
  return (
    <svg width={w} height={h} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
      <rect width="200" height="150" fill={skies[i % 3]} />
      <rect y="116" width="200" height="34" fill="#B7BCC4" />
      <rect y="112" width="200" height="6" fill="#8E949C" />
      {i === 1 ? (
        <>
          <rect x="30" y="78" width="120" height="34" rx="3" fill={bodies[i]} />
          <path d="M60 78 L150 34 L156 40 L68 82 Z" fill="#8E949C" />
          <rect x="146" y="30" width="14" height="14" fill="#F5A83C" />
          <rect x="150" y="44" width="3" height="30" fill="#555" />
          <rect x="140" y="72" width="22" height="12" fill="#F5A83C" />
        </>
      ) : (
        <>
          <rect x="22" y="60" width="104" height="52" rx="4" fill={bodies[i]} />
          <rect x="126" y="76" width="50" height="36" rx="4" fill={i === 2 ? "#DDE3E9" : "#F6F1E8"} />
          <rect x="134" y="82" width="22" height="14" rx="2" fill="#8FB7DA" />
        </>
      )}
      <circle cx="54" cy="116" r="12" fill="#2B2F36" />
      <circle cx="54" cy="116" r="5" fill="#9AA0A8" />
      <circle cx={i === 1 ? 128 : 150} cy="116" r="12" fill="#2B2F36" />
      <circle cx={i === 1 ? 128 : 150} cy="116" r="5" fill="#9AA0A8" />
    </svg>
  );
};

const ui = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  ...extra,
});

export const SitePage: React.FC<{
  f: number;
  w: number;
  h: number;
  copy: SiteCopy;
  at: number;
  headAt?: number[];
  subAt?: number[];
  tilesAt?: number[];
  waAt?: number;
  buttonAt?: number;
  scroll?: number;
  accent?: Accent;
  tapWaAt?: number;
  marks?: { what?: number; where?: number; who?: number };
  blocksAt?: number[]; // the page building itself block by block (nav, hero, tiles, services, button)
  dim?: number;
  timer?: { at: number; label: string };
  tileKind?: "house" | "truck" | "none";
  markLabels?: { what: string; where: string; who: string };
}> = ({ f, w, h, copy, at, headAt, subAt, tilesAt, waAt, buttonAt, scroll = 0, accent = "gold", tapWaAt, marks, blocksAt, dim = 0, timer, tileKind = "house", markLabels = { what: "qué hace", where: "dónde", who: "para quién" } }) => {
  const A = ACCENTS[accent];
  const pad = Math.round(w * 0.045);
  const blk = (i: number) => (blocksAt ? clamp01(sp(f, blocksAt[i], SNAP) * 1.5) : f >= at ? 1 : 0);
  const words = copy.headline.split(" ");
  const nHead = headAt ? shown(headAt, f) : words.length;
  const subWords = copy.sub.split(" ");
  const nSub = subAt ? shown(subAt, f) : subWords.length;
  const headSize = Math.round(w * 0.058);
  const bk = buttonAt === undefined ? blk(1) : clamp01(sp(f, buttonAt, SNAP) * 1.5);
  const wa = waAt === undefined ? 1 : sp(f, waAt, SNAP);
  const bob = Math.sin(f * 0.12) * 2;
  const block = (i: number, extra?: React.CSSProperties): React.CSSProperties => ({ opacity: blk(i), transform: `translateY(${((1 - blk(i)) * 18).toFixed(1)}px)`, ...extra });
  const tileW = (w - 2 * pad - 2 * 14) / 3;
  const markChip = (on: number | undefined, text: string, x: number, y: number) => {
    if (on === undefined) return null;
    const k = sp(f, on, SNAP);
    if (k <= 0) return null;
    return (
      <div style={{ position: "absolute", left: x, top: y, height: 54, padding: "0 20px 0 14px", borderRadius: 27, background: "linear-gradient(180deg,#FFD98F 0%,#F5A83C 60%,#D98B24 100%)", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 24px rgba(0,0,0,0.35)", opacity: clamp01(k * 1.6), transform: `scale(${Math.min(1.1, k).toFixed(3)})`, transformOrigin: "0 50%", ...ui(24, 700, { color: C.navy }) }}>
        <Icon name="solar:check-circle-bold" size={30} color={C.navy} />
        {text}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F7F8FB", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${(-scroll).toFixed(1)}px)` }}>
        {/* nav */}
        <div style={{ height: 86, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad}px`, ...block(0) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: A.a }} />
            <div style={ui(24, 700, { color: A.ink })}>{copy.brand}</div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            {copy.nav.map((n) => (
              <div key={n} style={ui(18, 500, { color: "rgba(10,30,63,0.6)" })}>
                {n}
              </div>
            ))}
          </div>
        </div>
        <div style={{ margin: `0 ${pad}px`, height: 1, background: "rgba(10,30,63,0.1)" }} />
        {/* hero */}
        <div style={{ padding: `${pad + 6}px ${pad}px 0`, position: "relative", ...block(1) }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: `0 ${headSize * 0.25}px`, minHeight: headSize * 1.15 * 2, width: w * 0.86 }}>
            {words.slice(0, nHead).map((wd, i) => (
              <div key={i} style={ui(headSize, 800, { color: A.ink, lineHeight: 1.12 })}>
                {wd}
              </div>
            ))}
            {headAt && nHead < words.length && f >= headAt[0] - 6 && <div style={{ width: 4, height: headSize, background: A.a, marginTop: 4, opacity: Math.floor(f / 8) % 2 ? 0.2 : 1 }} />}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", minHeight: 34, width: w * 0.8, marginTop: 10 }}>
            {subWords.slice(0, nSub).map((wd, i) => (
              <div key={i} style={ui(22, 500, { color: "rgba(10,30,63,0.7)", lineHeight: 1.3 })}>
                {wd}
              </div>
            ))}
          </div>
          {bk > 0 && (
            <div style={{ marginTop: 18, height: 64, width: "fit-content", padding: "0 26px", borderRadius: 32, background: C.wa, display: "flex", alignItems: "center", gap: 12, transform: `scale(${(0.6 + 0.4 * Math.min(1.1, bk)).toFixed(3)})`, transformOrigin: "0% 50%", opacity: clamp01(bk * 1.6), ...ui(26, 700, { color: C.waDark }) }}>
              <Icon name="ri:whatsapp-fill" size={34} color={C.waDark} />
              {copy.button}
            </div>
          )}
          {markChip(marks?.what, markLabels.what, pad - 8, -8)}
          {markChip(marks?.where, markLabels.where, w * 0.46, headSize * 1.15 * 2 + 58)}
        </div>
        {/* tiles */}
        {tileKind !== "none" && <div style={{ display: "flex", gap: 14, padding: `${pad}px ${pad}px 0`, ...block(2) }}>
          {[0, 1, 2].map((i) => {
            const k = tilesAt ? sp(f, tilesAt[i], SNAP) : 1;
            if (k <= 0) return <div key={i} style={{ width: tileW, height: tileW * 0.75 }} />;
            return (
              <div key={i} style={{ width: tileW, height: tileW * 0.75, borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 20px rgba(10,30,63,0.18)", opacity: clamp01(k * 1.5), transform: `scale(${(0.85 + 0.15 * Math.min(1.06, k)).toFixed(3)})` }}>
                {tileKind === "truck" ? <Truck i={i} w={tileW} h={tileW * 0.75} /> : <House i={i} w={tileW} h={tileW * 0.75} />}
              </div>
            );
          })}
        </div>}
        {/* services */}
        <div style={{ padding: `${pad}px ${pad}px 0`, display: "flex", flexDirection: "column", gap: 14, position: "relative", ...block(3) }}>
          {(copy.services ?? ["Obra llave en mano", "Reformas y ampliaciones", "Dirección de obra"]).map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 56, borderRadius: 16, background: "#FFFFFF", border: "1px solid rgba(10,30,63,0.08)", padding: "0 18px" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: A.a, opacity: 0.9 }} />
              <div style={ui(22, 600, { color: A.ink })}>{s}</div>
            </div>
          ))}
          {markChip(marks?.who, markLabels.who, pad - 8, -6)}
        </div>
        <div style={{ padding: `${pad}px ${pad}px ${pad * 2}px`, display: "flex", gap: 14, ...block(3) }}>
          <div style={{ flex: 1, height: 120, borderRadius: 16, background: `linear-gradient(160deg,${A.b} 0%,${A.c} 100%)` }} />
          <div style={{ flex: 1, height: 120, borderRadius: 16, background: "#FFFFFF", border: "1px solid rgba(10,30,63,0.08)" }} />
        </div>
      </div>
      {/* the floating WhatsApp button stays while the page scrolls */}
      {wa > 0 && blk(4) > 0 && (
        <div style={{ position: "absolute", right: pad, bottom: pad + bob, width: 84, height: 84, borderRadius: 42, background: C.wa, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 26px rgba(0,0,0,0.3)", opacity: clamp01(wa * 1.6) * blk(4), transform: `scale(${Math.min(1.12, wa).toFixed(3)})` }}>
          <Icon name="ri:whatsapp-fill" size={52} color={C.white} />
        </div>
      )}
      {timer && f >= timer.at && (
        <div style={{ position: "absolute", left: pad, bottom: pad, height: 58, padding: "0 20px", borderRadius: 29, background: C.navy, display: "flex", alignItems: "center", gap: 10, opacity: clamp01(sp(f, timer.at, SNAP) * 1.6), ...ui(26, 700, { color: C.white }) }}>
          <Icon name="solar:clock-circle-bold-duotone" size={32} color={C.gold} />
          {timer.label}
        </div>
      )}
      {tapWaAt !== undefined && <Tap f={f} at={tapWaAt} x={w - pad - 42} y={h - pad - 42} />}
      {dim > 0.01 && <div style={{ position: "absolute", inset: 0, background: `rgba(3,8,16,${dim.toFixed(3)})` }} />}
    </div>
  );
};

// The cheap page: a template with a slider, a welcome line and a paragraph that says nothing; the only way to write
// is a tiny "Contacto" in the footer. Invented, never a real business.
export const TemplatePage: React.FC<{ f: number; w: number; h: number; at: number; loadFrames?: number; copy: { welcome: string; para: string; more: string; footer: string[]; brand?: string }; scroll?: number; huntAt?: number[]; dim?: number }> = ({ f, w, h, at, loadFrames = 14, copy, scroll = 0, huntAt, dim = 0 }) => {
  const loading = f < at + loadFrames;
  const spin = ((f - at) * 24) % 360;
  const pad = Math.round(w * 0.045);
  const k = clamp01(ramp(f, at + loadFrames, at + loadFrames + 6));
  const sys = (size: number, weight = 400, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: UI_FONT, fontWeight: weight, fontSize: size, lineHeight: 1.3, ...extra });
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F1F1F1", overflow: "hidden" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, border: "7px solid #D5D5D5", borderTopColor: "#7A7A7A", transform: `rotate(${spin}deg)` }} />
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: k, transform: `translateY(${(-scroll).toFixed(1)}px)` }}>
        <div style={{ height: 78, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${pad}px`, borderBottom: "1px solid #DDD" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: "#C9C9C9" }} />
            <div style={{ width: 120, height: 14, borderRadius: 7, background: "#BDBDBD" }} />
          </div>
          <Icon name="ri:menu-line" size={36} color="#777" />
        </div>
        <div style={{ margin: `${pad}px ${pad}px 0`, height: 250, borderRadius: 6, background: "linear-gradient(135deg,#B8BCC4 0%,#8E939C 100%)", position: "relative" }}>
          <div style={{ position: "absolute", left: 16, top: 105, width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="ri:arrow-left-s-line" size={30} color="#555" />
          </div>
          <div style={{ position: "absolute", right: 16, top: 105, width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="ri:arrow-right-s-line" size={30} color="#555" />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, display: "flex", justifyContent: "center", gap: 10 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: i === Math.floor((f - at) / 40) % 4 ? "#FFF" : "rgba(255,255,255,0.45)" }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 60, textAlign: "center", ...sys(34, 700, { color: "#FFFFFF", textShadow: "0 2px 4px rgba(0,0,0,0.4)" }) }}>{copy.welcome}</div>
        </div>
        <div style={{ padding: `${pad}px ${pad}px 0`, textAlign: "center", ...sys(21, 400, { color: "#555" }) }}>{copy.para}</div>
        <div style={{ margin: `${pad * 0.8}px auto 0`, width: 160, height: 46, borderRadius: 4, background: "#9A9A9A", display: "flex", alignItems: "center", justifyContent: "center", ...sys(20, 700, { color: "#FFF" }) }}>{copy.more}</div>
        <div style={{ display: "flex", gap: 14, padding: `${pad}px ${pad}px 0` }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ flex: 1, height: 140, borderRadius: 6, background: i ? "#D9D9D9" : "#CFCFCF" }} />
          ))}
        </div>
        <div style={{ marginTop: pad, padding: `${pad * 0.7}px ${pad}px`, background: "#2B2B2B", display: "flex", justifyContent: "center", gap: 18 }}>
          {copy.footer.map((t) => (
            <div key={t} style={sys(16, 400, { color: "#AAA" })}>
              {t}
            </div>
          ))}
        </div>
      </div>
      {huntAt?.map((t, i) => (
        <Tap key={i} f={f} at={t} x={[w * 0.3, w * 0.7, w * 0.5][i % 3]} y={[h * 0.42, h * 0.62, h * 0.82][i % 3]} dark />
      ))}
      {dim > 0.01 && <div style={{ position: "absolute", inset: 0, background: `rgba(3,8,16,${dim.toFixed(3)})` }} />}
    </div>
  );
};

// A page with nothing written on it: dashed placeholders where the words should be.
export const EmptyPage: React.FC<{ f: number; w: number; h: number; qAt?: number }> = ({ f, w, h, qAt }) => {
  const pad = Math.round(w * 0.045);
  const q = qAt === undefined ? 0 : sp(f, qAt, SNAP);
  const dash = "2px dashed rgba(10,30,63,0.22)";
  return (
    <div style={{ position: "absolute", inset: 0, background: "#F7F8FB" }}>
      <div style={{ height: 86, display: "flex", alignItems: "center", gap: 12, padding: `0 ${pad}px` }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, border: dash }} />
        <div style={{ width: 150, height: 18, borderRadius: 9, border: dash }} />
      </div>
      <div style={{ padding: `${pad}px ${pad}px 0`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: "86%", height: 50, borderRadius: 12, border: dash }} />
        <div style={{ width: "62%", height: 50, borderRadius: 12, border: dash }} />
        <div style={{ width: "74%", height: 24, borderRadius: 12, border: dash, marginTop: 8 }} />
        <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 120, borderRadius: 16, border: dash }} />
          ))}
        </div>
        <div style={{ width: "100%", height: 56, borderRadius: 16, border: dash, marginTop: 6 }} />
        <div style={{ width: "100%", height: 56, borderRadius: 16, border: dash }} />
      </div>
      {q > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.3, display: "flex", justifyContent: "center", opacity: clamp01(q * 1.5), transform: `scale(${Math.min(1.1, q).toFixed(3)})` }}>
          <div style={{ width: 180, height: 180, borderRadius: 90, background: "rgba(10,30,63,0.08)", display: "flex", alignItems: "center", justifyContent: "center", ...ui(120, 800, { color: "rgba(10,30,63,0.35)" }) }}>?</div>
        </div>
      )}
    </div>
  );
};

// The gold line that reads a page from top to bottom (what Google or ChatGPT does), with a translucent band above it.
export const Scan: React.FC<{ f: number; at: number; dur: number; w: number; h: number }> = ({ f, at, dur, w, h }) => {
  if (f < at || f > at + dur + 6) return null;
  const p = ramp(f, at, at + dur, 0, 1, easeInOut);
  const y = p * h;
  const fade = 1 - ramp(f, at + dur, at + dur + 6);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden", pointerEvents: "none", opacity: fade }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 140, height: 140, background: "linear-gradient(180deg, rgba(245,168,60,0) 0%, rgba(245,168,60,0.22) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: y - 3, height: 6, background: C.gold, boxShadow: "0 0 18px rgba(245,168,60,0.8)" }} />
    </div>
  );
};
