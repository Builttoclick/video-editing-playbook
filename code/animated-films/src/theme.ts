// One place for the look of the seven films (AN-02 to AN-08). Same palette as AN-01 and our 40 s local SEO explainer:
// Poppins for every word of ours, gold as the only accent, a navy stage. WhatsApp and Google screens use their own
// colours so they read as the real thing (Roboto).
export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Meta's 4:5 feed placement crops the 1080x1920 master to y 285..1635 (Joaquín's rule, 05-nov-2026): every element of
// every film lives inside this band, so the 4:5 cut is the same film with less stage above and below.
export const SAFE = { y0: 285, y1: 1635 };
// The headline block sits at the top of the band, the graphic under it.
export const TEXT = { top: 336, width: 960, max: 64 };
export const ZONE = { y0: 640, y1: 1600 };

export const C = {
  gold: "#F5A83C",
  goldLight: "#FFD58A",
  goldPale: "#FFF1CF",
  goldDeep: "#C9801F",
  navy: "#0A1E3F",
  navyDeep: "#06142C",
  navyMid: "#10224A",
  white: "#FFFFFF",
  gray: "#A9B1BF",
  grayLight: "#E9ECF1",
  grayMid: "#C9CFD9",
  grayDark: "#677084",
  ink: "#1F2937",
  red: "#E5484D",
  green: "#2FB36A",
  wa: "#25D366",
  waDark: "#05301A",
  // WhatsApp dark theme, measured on the Android app
  waBg: "#0B141A",
  waBar: "#1F2C33",
  waIn: "#202C33",
  waOut: "#005C4B",
  waText: "#E9EDEF",
  waMuted: "rgba(233,237,239,0.6)",
  waBlue: "#53BDEB",
  waGreenUi: "#00A884",
  waDate: "#182229",
  // Google's light theme
  gBlue: "#1A73E8",
  gRed: "#EA4335",
  gYellow: "#FBBC04",
  gGreen: "#34A853",
  gText: "#202124",
  gMuted: "#5F6368",
  gLine: "#DADCE0",
  gUrl: "#1F6B2E",
  // a ChatGPT-like dark box (no logo, no name on screen beyond the word)
  gptBg: "#1E1E1E",
  gptCard: "#2C2C2C",
  gptText: "#ECECEC",
  gptMuted: "#A9A9A9",
};

export const GOLD_GRAD = "linear-gradient(180deg,#FFF3D6 0%,#FFD47E 26%,#F5A83C 56%,#DB8A22 78%,#A9661A 100%)";
export const GOLD_FLAT = "linear-gradient(180deg,#FFD98F 0%,#F5A83C 60%,#D98B24 100%)";
export const PANEL = "linear-gradient(180deg,#10224A 0%,#0A1A3A 100%)";
export const STAGE_BG = "radial-gradient(circle at 50% 42%, #15305C 0%, #0A1E3F 45%, #050E20 100%)";
export const FONT = "Poppins, sans-serif";
export const UI_FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif";
export const STAGE = { perspective: 2200, origin: "540px 960px" };
