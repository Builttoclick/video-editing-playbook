// One place for the look. The chat is WhatsApp's own dark theme (the viewer's phone, so it has to read as the real
// thing: Roboto, its greens, its grays). The BTC line only enters through the graphics that come out of the screen
// (Poppins Bold, gold as the protagonist, navy stage) and the end card. Same palette as our 40 s local SEO explainer.
export const W = 1080;
export const H = 1920;

export const C = {
  gold: "#F5A83C",
  goldLight: "#FFD58A",
  goldPale: "#FFF1CF",
  goldDeep: "#C9801F",
  navy: "#0A1E3F",
  navyDeep: "#06142C",
  white: "#FFFFFF",
  gray: "#A9B1BF",
  grayLight: "#E9ECF1",
  grayMid: "#C9CFD9",
  grayDark: "#677084",
  wa: "#25D366",
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
};

export const GOLD_GRAD = "linear-gradient(180deg,#FFF3D6 0%,#FFD47E 26%,#F5A83C 56%,#DB8A22 78%,#A9661A 100%)";
export const FONT = "Poppins, sans-serif";
export const UI_FONT = "Roboto, 'Helvetica Neue', Arial, sans-serif";
export const STAGE = { perspective: 2200, origin: "540px 900px" };

// The phone's screen inside the frame: a hint of bezel, the chat full width. Everything that matters stays inside
// Meta's safe area (y 200-1520 in 9:16), so the 4:5 feed cut is the same film with less stage above and below.
export const SCREEN = { x0: 34, x1: 1046, y0: 150, y1: 1560, r: 58 };
export const HEADER_H = 148;
export const COMPOSE_H = 132;
