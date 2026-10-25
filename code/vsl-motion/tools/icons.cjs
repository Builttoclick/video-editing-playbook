// Copies the few Iconify icons the scenes use into src/data/icons.json (Solar Bold Duotone = BTC default, Remix for WhatsApp).
const fs = require("fs");
const path = require("path");
const sets = { solar: require("@iconify-json/solar/icons.json"), ri: require("@iconify-json/ri/icons.json") };
const want = [
  "solar:map-point-bold-duotone", "solar:check-circle-bold-duotone", "solar:check-circle-bold", "solar:stars-bold-duotone",
  "solar:magic-stick-3-bold-duotone", "solar:user-bold-duotone", "solar:cursor-bold-duotone", "solar:lightbulb-bolt-bold-duotone",
  "solar:chat-round-dots-bold-duotone", "solar:palette-bold-duotone", "solar:gallery-bold-duotone", "solar:like-bold-duotone",
  "solar:star-bold", "solar:eye-bold-duotone", "solar:users-group-rounded-bold-duotone", "solar:box-bold-duotone",
  "solar:copy-bold-duotone", "solar:layers-bold-duotone", "solar:bell-bing-bold-duotone", "solar:graph-up-bold-duotone",
  "solar:calendar-bold-duotone", "solar:hamburger-menu-bold", "solar:phone-calling-rounded-bold-duotone",
  "solar:home-smile-bold-duotone", "solar:verified-check-bold", "solar:sofa-bold-duotone", "ri:whatsapp-fill",
  "solar:shop-bold-duotone", "solar:smartphone-bold-duotone", "solar:global-bold-duotone", "solar:magnifer-bold-duotone", "solar:heart-bold", "solar:text-bold-duotone", "solar:question-circle-bold-duotone", "solar:ruler-pen-bold-duotone", "solar:check-read-linear", "solar:map-point-search-bold-duotone", "solar:pen-new-square-bold-duotone",
  "solar:volume-loud-bold-duotone", "solar:filter-bold-duotone", "solar:dollar-minimalistic-bold-duotone", "solar:code-square-bold-duotone", "solar:stopwatch-bold-duotone", "solar:clock-circle-bold-duotone", "solar:calendar-mark-bold-duotone", "solar:document-text-bold-duotone", "solar:graph-new-up-bold-duotone", "solar:rocket-2-bold-duotone", "solar:user-rounded-bold-duotone", "solar:programming-bold-duotone", "solar:cup-first-bold-duotone", "solar:fire-bold-duotone", "solar:pen-bold-duotone", "solar:checklist-bold-duotone", "solar:hourglass-bold-duotone", "solar:chat-round-line-bold-duotone", "solar:arrow-right-up-bold", "solar:bolt-bold-duotone", "solar:medal-ribbon-star-bold-duotone", "solar:double-alt-arrow-down-bold-duotone", "solar:hand-shake-bold-duotone", "solar:videocamera-record-bold-duotone", "solar:play-bold", "solar:alt-arrow-down-bold", "solar:radar-bold-duotone", "solar:pen-2-bold-duotone", "solar:widget-5-bold-duotone",
];
const out = {};
for (const full of want) {
  const [p, n] = full.split(":");
  const s = sets[p];
  const ic = s.icons[n];
  if (!ic) throw new Error("missing " + full);
  out[full] = { body: ic.body, w: ic.width || s.width || 24, h: ic.height || s.height || 24 };
}
fs.writeFileSync(path.join(__dirname, "../src/data/icons.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "icons");
