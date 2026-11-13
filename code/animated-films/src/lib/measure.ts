// Text widths with the loaded fonts (Root renders nothing until they are in), cached per string.
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export const measure = (text: string, font: string) => {
  const key = font + "|" + text;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  ctx = ctx || document.createElement("canvas").getContext("2d")!;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  cache.set(key, w);
  return w;
};
