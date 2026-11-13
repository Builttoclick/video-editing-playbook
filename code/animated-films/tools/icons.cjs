// Copies the Iconify icons the films use into src/data/icons.json: Remix for the WhatsApp / Google UI (close to their
// Material glyphs), Solar Bold Duotone for the BTC graphics (house rule: no Lucide).
const fs = require("fs");
const path = require("path");
const sets = { solar: require("@iconify-json/solar/icons.json"), ri: require("@iconify-json/ri/icons.json") };
const want = [
  "ri:arrow-left-line", "ri:vidicon-line", "ri:phone-line", "ri:more-2-fill", "ri:emotion-line", "ri:attachment-2",
  "ri:camera-line", "ri:mic-fill", "ri:check-line", "ri:check-double-line", "ri:time-line", "ri:whatsapp-fill", "ri:send-plane-2-fill",
  "ri:search-line", "ri:arrow-left-s-line", "ri:arrow-right-s-line", "ri:close-line", "ri:play-fill", "ri:menu-line", "ri:bookmark-fill",
  "ri:instagram-line", "ri:star-fill", "ri:map-pin-2-fill", "ri:refresh-line", "ri:arrow-up-line", "ri:send-plane-fill",
  "solar:calendar-bold-duotone", "solar:document-text-bold-duotone", "solar:check-circle-bold", "solar:pen-new-square-bold-duotone",
  "solar:chat-round-dots-bold-duotone", "solar:global-bold-duotone", "solar:server-bold-duotone", "solar:letter-bold-duotone",
  "solar:magnifer-bold-duotone", "solar:documents-bold-duotone", "solar:home-2-bold-duotone", "solar:alt-arrow-down-bold",
  "solar:user-bold-duotone", "solar:user-bold", "solar:bag-4-bold-duotone", "solar:shop-bold-duotone", "solar:wheel-bold-duotone",
  "solar:moon-stars-bold-duotone", "solar:moon-bold-duotone", "solar:bed-bold-duotone", "solar:bedside-table-bold-duotone", "solar:sun-bold-duotone",
  "solar:sunrise-bold-duotone", "solar:clock-circle-bold-duotone", "solar:bus-bold-duotone", "solar:delivery-bold-duotone",
  "solar:smartphone-bold-duotone", "solar:cursor-bold-duotone", "solar:star-bold-duotone", "solar:map-point-bold-duotone",
  "solar:point-on-map-bold-duotone", "solar:buildings-2-bold-duotone", "solar:city-bold-duotone", "solar:garage-bold-duotone",
  "solar:bookmark-bold-duotone", "solar:play-circle-bold-duotone", "solar:videocamera-bold", "solar:videocamera-bold-duotone",
  "solar:lamp-bold-duotone", "solar:lightbulb-bold-duotone", "solar:eye-bold-duotone", "solar:question-circle-bold-duotone",
  "solar:close-circle-bold", "solar:danger-triangle-bold-duotone", "solar:streets-bold-duotone", "solar:routing-bold-duotone",
  "solar:earth-bold-duotone", "solar:users-group-rounded-bold-duotone", "solar:user-rounded-bold-duotone", "solar:hand-shake-bold-duotone",
  "solar:ruler-cross-pen-bold-duotone", "solar:ruler-pen-bold-duotone", "solar:phone-calling-bold-duotone", "solar:incoming-call-bold-duotone",
  "solar:notification-unread-bold-duotone", "solar:tag-price-bold-duotone", "solar:box-bold-duotone", "solar:sleeping-bold-duotone",
  "solar:waterdrop-bold-duotone", "solar:key-bold-duotone", "solar:letter-unread-bold-duotone", "solar:chat-round-unread-bold-duotone",
  "solar:list-check-bold-duotone", "solar:bolt-bold-duotone", "solar:gallery-bold-duotone", "solar:camera-bold-duotone",
  "solar:microphone-bold-duotone", "solar:arrow-right-bold", "solar:arrow-left-bold", "solar:alt-arrow-right-bold", "solar:alt-arrow-left-bold",
  "solar:widget-bold-duotone", "solar:layers-bold-duotone", "solar:palette-bold-duotone", "solar:pen-bold-duotone", "solar:keyboard-bold-duotone",
  "solar:cup-hot-bold-duotone", "solar:signpost-bold-duotone", "solar:pin-bold-duotone", "solar:stars-bold-duotone", "solar:check-read-bold",
  "solar:eye-scan-bold-duotone", "solar:magnifer-zoom-in-bold-duotone", "solar:smartphone-2-bold-duotone", "solar:heart-bold-duotone",
  "solar:hand-money-bold-duotone", "solar:wallet-bold-duotone", "solar:dollar-bold-duotone", "solar:crown-bold-duotone",
];
const out = {};
const miss = [];
for (const full of want) {
  const [p, n] = full.split(":");
  const s = sets[p];
  const ic = s.icons[n] || (s.aliases && s.aliases[n] && s.icons[s.aliases[n].parent]);
  if (!ic) { miss.push(full); continue; }
  out[full] = { body: ic.body, w: ic.width || s.width || 24, h: ic.height || s.height || 24 };
}
if (miss.length) {
  for (const m of miss) {
    const [p, n] = m.split(":");
    const stem = n.split("-")[0];
    console.error("missing", m, "->", Object.keys(sets[p].icons).filter((k) => k.startsWith(stem)).slice(0, 12).join(" "));
  }
  process.exit(1);
}
fs.mkdirSync(path.join(__dirname, "../src/data"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../src/data/icons.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "icons");
