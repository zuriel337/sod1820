// W1 Slice 2 — canonical control family (Scope A).
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTROL_ROLES, CONTROL_STATES, CONTROL_MIN_TOUCH, CONTROL_FOCUS_CSS,
  controlBase, controlVisual, controlA11y,
} from "../src/lib/controls/controlSpec.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// --- the vocabulary the dispatch asked for, in full ---
assert.deepEqual(CONTROL_ROLES, ["primary", "secondary", "ghost", "icon"]);
for (const s of ["hover", "focus", "disabled", "loading", "building", "locked"]) {
  assert.ok(CONTROL_STATES.includes(s), `missing shared state role: ${s}`);
}

// --- mobile: one touch-target floor, >= 44px (research_workspace_law) ---
assert.equal(CONTROL_MIN_TOUCH, 44);
assert.equal(controlBase().minHeight, 44);
assert.equal(controlBase({ compact: true }).minHeight, 44, "compact must not shrink the touch target");

// --- NO hard-coded shared-control palette: every colour comes from the palette object ---
const spec = read("src/lib/controls/controlSpec.js");
const body = spec.replace(/^\s*\/\/.*$/gm, "");                 // strip line comments
assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b/, "controlSpec must not hard-code hex colours");
assert.doesNotMatch(body, /rgba?\(/, "controlSpec must not hard-code rgb/rgba colours");

// two deliberately different palettes prove the visuals are actually derived
const DARK = { mode: "dark", card: "CARD_D", border: "BORDER_D", borderStrong: "BSTRONG_D", ink: "INK_D", accent: "ACC_D", accentText: "ATXT_D", accentBtn: "BTN_D", onAccent: "ON_D", glow: "GLOW_D" };
const LIGHT = { mode: "light", card: "CARD_L", border: "BORDER_L", borderStrong: "BSTRONG_L", ink: "INK_L", accent: "ACC_L", accentText: "ATXT_L", accentBtn: "BTN_L", onAccent: "ON_L", glow: "GLOW_L" };

for (const role of CONTROL_ROLES) {
  const d = JSON.stringify(controlVisual(DARK, role));
  const l = JSON.stringify(controlVisual(LIGHT, role));
  assert.notEqual(d, l, `${role} must differ between palettes — otherwise it is hard-coded`);
  assert.doesNotMatch(d, /_L\b/, `${role} leaked the light palette into the dark one`);
}
assert.equal(controlVisual(DARK, "primary").background, "BTN_D");
assert.equal(controlVisual(DARK, "primary").color, "ON_D", "primary text must use the on-accent token");
assert.equal(controlVisual(LIGHT, "secondary").border, "1px solid BORDER_L");

// an unknown role/state degrades instead of throwing
assert.deepEqual(controlVisual(DARK, "nonsense"), controlVisual(DARK, "secondary"));
assert.deepEqual(controlA11y("nonsense"), {});

// --- state semantics ---
assert.equal(controlVisual(DARK, "primary", "disabled").cursor, "default");
assert.ok(controlVisual(DARK, "primary", "disabled").opacity < 0.5);
// building/locked stay visible enough to read — they are informative, not broken links
assert.ok(controlVisual(DARK, "secondary", "building").opacity > 0.5);
assert.ok(controlVisual(DARK, "secondary", "locked").opacity > 0.5);
assert.match(controlVisual(DARK, "secondary", "locked").border, /dashed/);

// --- accessibility contract ---
assert.deepEqual(controlA11y("loading"), { "aria-busy": true, "aria-disabled": true, disabled: true });
assert.deepEqual(controlA11y("disabled"), { "aria-disabled": true, disabled: true });
// gated/future controls must remain keyboard-discoverable
assert.equal(controlA11y("building").tabIndex, 0);
assert.equal(controlA11y("locked").tabIndex, 0);
assert.ok(!("disabled" in controlA11y("locked")), "locked must stay focusable, not hard-disabled");
assert.deepEqual(controlA11y("default"), {});

// --- keyboard modality: a ring on real Tab, none on mouse click ---
assert.match(CONTROL_FOCUS_CSS, /:focus-visible\{outline:2px solid currentColor/);
assert.match(CONTROL_FOCUS_CSS, /:focus:not\(:focus-visible\)\{outline:none\}/);

// --- the primitive is a primitive: it owns no capability ---
const control = read("src/components/controls/Control.jsx");
assert.doesNotMatch(control, /useResearch|track\(|supabase|taggedShareUrl/,
  "Control must not know what any action means");
assert.match(control, /href \? "a" : "button"/, "a channel link must stay a real anchor");

// --- Scope A verdict: QuickActions and DocActions were NOT merged, and still do not
// duplicate share behavior (DocActions has no share at all; both save via one owner) ---
const quick = read("src/components/QuickActions.jsx");
const doc = read("src/components/DocActions.jsx");
assert.doesNotMatch(doc, /shareOrCopy|taggedShareUrl|ShareActions/,
  "DocActions must remain share-free — merging it with QuickActions would invent an owner");
assert.match(quick, /saveItem/);
assert.match(doc, /saveItem/);

console.log("canonical-controls: ok");
