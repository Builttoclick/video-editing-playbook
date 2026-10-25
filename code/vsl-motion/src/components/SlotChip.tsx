import React from "react";
import { C } from "../theme";
import { CheckBadge } from "./Bits";
import { txt } from "./base";

// A checklist row on Joaquín's chest: an empty numbered slot that fills with its text, then checks itself.
export const SlotChip: React.FC<{
  n: number;
  text: string;
  tone: "gray" | "gold";
  fill: number; // 0 = empty slot, 1 = text in
  check: number; // 0..1 check draw
  width?: number;
}> = ({ n, text, tone, fill, check, width = 660 }) => {
  const border = tone === "gold" ? `rgba(245,168,60,${0.35 + 0.6 * fill})` : `rgba(255,255,255,${0.16 + 0.14 * fill})`;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: 108,
        borderRadius: 999,
        background: "linear-gradient(180deg,rgba(14,22,40,0.90),rgba(5,10,22,0.88))",
        border: `2.5px solid ${border}`,
        boxShadow: `0 18px 40px rgba(0,0,0,0.45)${tone === "gold" ? `, 0 0 ${22 * fill}px rgba(245,168,60,${0.22 * fill})` : ""}`,
        display: "flex",
        alignItems: "center",
        paddingLeft: 22,
        gap: 22,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 32,
            border: `3px solid ${tone === "gold" ? C.gold : "rgba(255,255,255,0.35)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 1 - Math.min(1, check * 3),
            ...txt(32, 800, { color: tone === "gold" ? C.gold : "rgba(255,255,255,0.7)", letterSpacing: 0 }),
          }}
        >
          {n}
        </div>
        {check > 0 && (
          <div style={{ position: "absolute", left: -6, top: -6 }}>
            <CheckBadge k={check} tone={tone} size={76} />
          </div>
        )}
      </div>
      <div
        style={{
          ...txt(46, 700, { color: tone === "gold" ? "#FFFFFF" : "rgba(255,255,255,0.9)" }),
          opacity: fill,
          transform: `translateX(${(1 - fill) * 40}px)`,
        }}
      >
        {text}
      </div>
      {fill < 1 && (
        <div
          style={{
            position: "absolute",
            left: 112,
            top: 47,
            height: 14,
            width: (width - 180) * (1 - fill),
            borderRadius: 7,
            background: "rgba(255,255,255,0.10)",
          }}
        />
      )}
    </div>
  );
};
