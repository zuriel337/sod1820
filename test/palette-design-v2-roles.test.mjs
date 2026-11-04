import assert from "node:assert/strict";
import { DESIGN_V2_PALETTES } from "../src/lib/palette.js";
import { findingColorChoices, projectFindingColor } from "../src/components/experience2029/elsFindingColors2029.js";

// Design V2 §4: the same semantic roles in Day, Parchment and Night.
const SPEC = {
  light: { accent: "#315DD5", accentText: "#2454B8", accentSecondary: "#7249A5", accentDiscovery: "#086C70", ink: "#172B46" },
  parchment: { accent: "#315DD5", accentText: "#284E9F", accentSecondary: "#764B87", accentDiscovery: "#176965", ink: "#312B23" },
  dark: { accent: "#315DD5", accentText: "#A8C7FF", accentSecondary: "#C2A8FA", accentDiscovery: "#69DED7", ink: "#F5F5F0" },
};
for (const [preset, roles] of Object.entries(SPEC)) {
  for (const [role, value] of Object.entries(roles)) assert.equal(DESIGN_V2_PALETTES[preset][role].toUpperCase(), value, `${preset}.${role}`);
}
const night = DESIGN_V2_PALETTES.dark;
assert.equal(night.focusRing.toUpperCase(), night.accentDiscovery.toUpperCase(), "focus follows the discovery role in every preset");
assert.equal(DESIGN_V2_PALETTES.light.focusRing.toUpperCase(), DESIGN_V2_PALETTES.light.accentDiscovery.toUpperCase());
assert.equal(night.onAccent.toUpperCase(), "#FFFFFF");
// The approved warm black-brown atmosphere and Crown gold identity are untouched.
assert.equal(night.pageBg, "#0B0907");
assert.equal(night.card, "#17120E");
assert.equal(night.brandGold, "#F9BA3F");
assert.equal(night.brandSapphire, "#1957D9");
assert.match(night.border, /212,175,55/);

// WCAG contrast of the Night text roles on the Night card (relative luminance).
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const role of ["accentText", "accentSecondary", "accentDiscovery", "ink", "inkSoft"]) assert.ok(ratio(night[role], night.card) >= 4.5, `${role} on Night card`);
assert.ok(ratio(night.onAccent, "#315DD5") >= 4.5, "white on the royal-blue action fill");

// Finding colors saved with the former Night role values keep exactly the slots they had.
const choices = findingColorChoices(night);
assert.equal(projectFindingColor("#D4AF37", night), choices[0].color);
assert.equal(projectFindingColor("#d3b88e", night), choices[1].color);
assert.equal(projectFindingColor("#E3B77D", night), choices[2].color);
assert.equal(projectFindingColor("#F9BA3F", night), choices[3].color, "Brand gold still maps to its slot");
console.log("design v2 palette roles: PASS");
