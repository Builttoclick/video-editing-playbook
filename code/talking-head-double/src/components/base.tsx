import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";
import icons from "../data/icons.json";
import { FONT, STAGE } from "../theme";

// Each scene renders twice: the BACK layer (objects on the wall, which Joaquín's head and hands pass in front of: the
// compositor cuts Joaquín's silhouette out of it) and the FRONT layer (things on top of Joaquín, like the chips on Joaquín's chest).
export type LayerName = "back" | "front" | "all";
export const LayerCtx = createContext<LayerName>("all");
export const Layer: React.FC<{ on: "back" | "front"; children: React.ReactNode }> = ({ on, children }) => {
  const cur = useContext(LayerCtx);
  if (cur !== "all" && cur !== on) return null;
  return <>{children}</>;
};

// Full-frame wrapper with the shared camera. Opacity and blur live here, on a flat element, so they never break the
// 3D of what is inside.
export const Obj: React.FC<{
  children: React.ReactNode;
  opacity?: number;
  blur?: number;
  z?: number;
  origin?: string;
}> = ({ children, opacity = 1, blur = 0, z, origin = STAGE.origin }) => {
  if (opacity <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        perspective: STAGE.perspective,
        perspectiveOrigin: origin,
        opacity,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
        zIndex: z,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// A positioned 3D group (centre at x,y).
export const G3: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  tx?: number;
  ty?: number;
  tz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, s = 1, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      transformStyle: "preserve-3d",
      transform: `translate3d(${tx}px,${ty}px,${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Icon: React.FC<{ name: keyof typeof icons; size: number; color?: string; style?: React.CSSProperties }> = ({
  name,
  size,
  color = "currentColor",
  style,
}) => {
  const ic = icons[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ic.w} ${ic.h}`}
      style={{ color, display: "block", flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: ic.body }}
    />
  );
};

export const txt = (size: number, weight = 700, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontSize: size,
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
  whiteSpace: "nowrap",
  ...extra,
});
