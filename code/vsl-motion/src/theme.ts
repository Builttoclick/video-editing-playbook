// One place for the look. BTC video line: Poppins Bold, tight tracking, gold as the protagonist, white as the variant,
// navy surfaces from the landing page. Gray = "la página promedio", gold = "mi página".
export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const C = {
  gold: "#F5A83C",
  goldLight: "#FFD58A",
  goldPale: "#FFF1CF",
  goldDeep: "#C9801F",
  goldDark: "#7A4A10",
  navy: "#0A1E3F",
  navyDeep: "#06142C",
  navyInk: "#040C1C",
  white: "#FFFFFF",
  gray: "#A9B1BF",
  grayLight: "#E9ECF1",
  grayMid: "#C9CFD9",
  grayDark: "#677084",
  grayInk: "#3B4252",
  wa: "#25D366",
  waDeep: "#128C4A",
  waInk: "#05301A",
  stamp: "#E2574C",
};

export const GOLD_GRAD = "linear-gradient(180deg,#FFF3D6 0%,#FFD47E 26%,#F5A83C 56%,#DB8A22 78%,#A9661A 100%)";
export const SILVER_GRAD = "linear-gradient(180deg,#FFFFFF 0%,#E7EAF0 40%,#BFC6D2 75%,#8F98A8 100%)";
export const FONT = "Poppins, sans-serif";

// The camera. Every 3D object sits in a full-frame wrapper with this perspective, so they share one vanishing point
// (a bit above Joaquín's head, where the free wall is).
export const STAGE = { perspective: 2200, origin: "540px 470px" };

// Where Joaquín's head starts in the frame (top of the hair, 1080x1920): the wall above it is free.
export const HEAD_TOP = 625;
