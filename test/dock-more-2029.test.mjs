// The global command island keeps ONE entry to the full "עוד" panel (context actions, tools, site search, share).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const global = frame.slice(frame.indexOf("is-single-command-bar"), frame.indexOf("data-command-mode=\"tool\""));

test("global dock: exactly five controls — כאן, גימטריה, רזיאל, עכשיו, עוד (share lives inside עוד)", () => {
  assert.match(global, /<small>כאן<\/small>/); assert.match(global, /<small>גימטריה<\/small>/);
  assert.match(global, /<RazielOrb/); assert.match(global, /"עכשיו"/);
  assert.match(global, /aria-label="עוד · פעולות, כלים ושיתוף"/); assert.match(global, /onClick=\{openMore\}/);
  assert.doesNotMatch(global, /aria-label="שיתוף"/, "no separate share button: it is a section of עוד");
  assert.equal((global.match(/<button\b/g) || []).length + (global.match(/<RazielOrb/g) || []).length, 5);
});

test("the עוד panel still carries actions, tools and the share section", () => {
  // The panel body lives in MorePanel2029.jsx (one projection over the frame's own openers); the frame wires them in.
  const more = frame.slice(frame.indexOf("transientKind === TRANSIENT.MORE)"), frame.indexOf("transientKind === TRANSIENT.TOOLS)"));
  const panel = readFileSync(new URL("../src/components/experience2029/MorePanel2029.jsx", import.meta.url), "utf8");
  assert.match(more, /<MorePanel2029/); assert.match(more, /openAction\(inspectTarget\)/); assert.match(more, /onTools=\{openTools\}/); assert.match(more, /onSearch=\{openSiteSearch\}/);
  assert.match(panel, /data-share-owner="ShareActions"/); assert.match(panel, /onClick=\{onAction\}/); assert.match(panel, /onClick=\{onTools\}/);
  const tools = frame.slice(frame.indexOf("transientKind === TRANSIENT.TOOLS)"), frame.indexOf("transientKind === TRANSIENT.RAZIEL_LOCKED)"));
  assert.match(tools, /חיפוש באתר/); assert.match(tools, /חזרה לעוד/);
});
