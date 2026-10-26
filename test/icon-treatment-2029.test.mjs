import assert from "node:assert/strict";
import { DESIGN_V2_PALETTES, resolveTreatment, treatmentVars, TREATMENT_PURPOSES, TREATMENT_STATES } from "../src/lib/palette.js";
import { readFileSync } from "node:fs";

// Owner-resolved role and state (Design V2 "Shared icon and surface color resolution"), not a count of distinct hues.
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const hex = (value) => /^#[0-9a-f]{6}$/i.test(value);

for (const [preset, palette] of Object.entries(DESIGN_V2_PALETTES)) {
  const tag = (p, s) => `${preset}/${p}/${s}`;
  // Purposes resolve to the approved role meanings.
  assert.equal(resolveTreatment(palette, { purpose: "ordinary" }).fg, palette.ink, tag("ordinary"));
  assert.equal(resolveTreatment(palette, { purpose: "action" }).fg, palette.accentText, tag("action"));
  assert.equal(resolveTreatment(palette, { purpose: "discovery" }).fg, palette.accentDiscovery, tag("discovery"));
  assert.equal(resolveTreatment(palette, { purpose: "secondary" }).fg, palette.accentSecondary, tag("secondary"));
  assert.equal(resolveTreatment(palette, { purpose: "identity" }).line, palette.brandGold, tag("identity"));
  // Every active foreground role is readable on the card (3:1 non-text; text roles are also held to 4.5:1).
  for (const purpose of TREATMENT_PURPOSES) {
    const t = resolveTreatment(palette, { purpose });
    assert.ok(ratio(t.fg, palette.card) >= 4.5, `${tag(purpose, "active")} fg ${t.fg}`);
  }
  // The same glyph purpose, available vs unavailable: unavailable/disabled/loading/unknown always wins over the accent.
  for (const purpose of TREATMENT_PURPOSES) {
    const active = resolveTreatment(palette, { purpose, state: "active" });
    for (const state of TREATMENT_STATES.filter((value) => value !== "active")) {
      const muted = resolveTreatment(palette, { purpose, state });
      assert.equal(muted.muted, true, tag(purpose, state));
      assert.equal(muted.fg, palette.inkSoft, tag(purpose, state)); assert.notEqual(muted.fg, active.fg === palette.inkSoft ? null : active.fg, tag(purpose, state));
      assert.equal(muted.bg, "transparent"); assert.equal(muted.border, palette.border);
      assert.ok(ratio(muted.fg, palette.card) >= 4.5, `${tag(purpose, state)} muted fg readable`);
    }
  }
  // The treatment is a function of purpose and state only: a glyph name or subject kind cannot change it.
  const base = treatmentVars(palette, { purpose: "action", state: "active" });
  assert.deepEqual(treatmentVars(palette, { purpose: "action", state: "active", glyph: "layers", kind: "category" }), base, "glyph and kind are ignored");
  // Unknown input falls back safely instead of inventing a colour.
  assert.equal(resolveTreatment(palette, { purpose: "nope", state: "weird" }).muted, true);
  assert.ok(hex(palette.accentText));
}

// No consumer stylesheet may keep its own glyph-name colour table.
for (const file of ["src/components/followCenter2029/followCenter2029.css", "src/components/experience2029/iconTile2029.css"]) {
  assert.ok(!/data-icon/.test(readFileSync(file, "utf8")), `${file} must not map glyph names to colour`);
}
console.log("icon treatment 2029: PASS");
