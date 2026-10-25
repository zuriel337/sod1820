import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Source-level guards for the variant seam (behaviour is covered by the browser tests).
const watch = readFileSync("src/components/WatchButton.jsx", "utf8");
const view = readFileSync("src/components/followCenter2029/WatchControl2029.jsx", "utf8");
const css = readFileSync("src/components/followCenter2029/watchControl2029.css", "utf8");
// The 2029 branch exists once, before the other variants, and does not touch IO/consent logic.
assert.equal((watch.match(/variant === "2029"/g) || []).length, 1);
assert.ok(watch.indexOf('variant === "2029"') < watch.indexOf('variant === "mini"'));
assert.ok(watch.includes("<WatchControl2029"));
// Other variants and the default keep their rendering: legacy emoji icon default and mini branch remain.
assert.ok(watch.includes('icon = "🔔"') && watch.includes('variant === "mini"'));
// The view: no emoji, shared treatment only, no IO/consent calls, visible status text.
assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(view), "no emoji in the 2029 view");
assert.ok(view.includes("treatmentVars") && view.includes("NavigationIcon2029"));
for (const forbidden of ["watchToggle", "enablePush", "saveNotificationPrefs", "supabase", "subscribeEmail"]) assert.ok(!view.includes(forbidden), forbidden);
for (const text of ["בודק את מצב המעקב", "המעקב אושר", "אימות חשבון", "ניסיון נוסף"]) assert.ok(view.includes(text), text);
// Design V2 floors in the stylesheet: no font-size below 14px, 44px targets, no hard-coded brand colours.
for (const [, size] of css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)) assert.ok(Number(size) >= 14, `font-size ${size}`);
assert.equal((css.match(/min-height:44px/g) || []).length >= 2, true);
assert.ok(!/#[0-9a-f]{3,6}\b/i.test(css.replace("var(--s29-on-accent,#fff)", "")), "no literal colour besides the on-accent fallback");
console.log("watch button 2029: PASS");
