import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DESIGN_V2_PALETTES } from "../src/lib/palette.js";

// `--s29-accent` is the action FILL role (royal blue). In Night it is only about 3:1 on the card, so it may
// not be used as a text colour. Text uses `--s29-accent-text`. Graphic glyphs may keep the fill role (3:1).
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
for (const [preset, palette] of Object.entries(DESIGN_V2_PALETTES)) {
  for (const surface of [palette.card, palette.cardSoft, palette.pageBg]) assert.ok(ratio(palette.accentText, surface) >= 4.5, `${preset} accentText on ${surface}`);
  // The one allowed graphic use (the large glyph outline) sits on the page or card panel, never on the soft inset.
  for (const surface of [palette.card, palette.pageBg]) assert.ok(ratio(palette.accent, surface) >= 3, `${preset} accent as graphic on ${surface}`);
}
assert.ok(ratio(DESIGN_V2_PALETTES.dark.accent, DESIGN_V2_PALETTES.dark.card) < 4.5, "the Night fill role is not a text role (guard premise)");

const GRAPHIC_ALLOWLIST = [/^\.sod29-glyph-flat\s*\{/];
const files = [];
const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (path.endsWith(".css")) files.push(path); } };
walk("src");
const offenders = [];
for (const file of files) {
  readFileSync(file, "utf8").split("\n").forEach((line, index) => {
    if (GRAPHIC_ALLOWLIST.some((rule) => rule.test(line.trim()))) return;
    if (/(^|[^-\w])color\s*:\s*var\(--s29-accent\)/.test(line)) offenders.push(`${file}:${index + 1}`);
  });
}
assert.deepEqual(offenders, [], "text colour must use var(--s29-accent-text), not the fill role var(--s29-accent)");
console.log("accent text contrast 2029: PASS");
