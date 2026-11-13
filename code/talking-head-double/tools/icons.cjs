// Copies the Iconify icons the film uses into src/data/icons.json: Remix for the WhatsApp UI (close to its Material
// glyphs), Solar Bold Duotone for the BTC graphics (house rule: no Lucide).
const fs = require("fs");
const path = require("path");
const sets = { solar: require("@iconify-json/solar/icons.json"), ri: require("@iconify-json/ri/icons.json") };
const want = [
  "ri:arrow-left-line", "ri:vidicon-line", "ri:phone-line", "ri:more-2-fill", "ri:emotion-line", "ri:attachment-2",
  "ri:camera-line", "ri:mic-fill", "ri:check-line", "ri:check-double-line", "ri:time-line", "ri:whatsapp-fill", "ri:send-plane-2-fill",
  "solar:calendar-bold-duotone", "solar:document-text-bold-duotone", "solar:check-circle-bold", "solar:pen-new-square-bold-duotone",
  "solar:chat-round-dots-bold-duotone", "solar:global-bold-duotone", "solar:server-bold-duotone", "solar:letter-bold-duotone",
  "solar:magnifer-bold-duotone", "solar:documents-bold-duotone", "solar:home-2-bold-duotone", "solar:alt-arrow-down-bold",
  "solar:user-bold-duotone", "solar:bag-4-bold-duotone",
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
fs.writeFileSync(path.join(__dirname, "../src/data/icons.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "icons");
