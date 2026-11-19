// The global command island: one bar that expands upward (preview, ZURIEL 19.11.2026).
// Order כאן · שיתוף · רזיאל · עכשיו · עוד. "שיתוף" took the gimatria slot; gimatria is a direct tile inside "עוד".
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
const panel = readFileSync(new URL("../src/components/experience2029/MorePanel2029.jsx", import.meta.url), "utf8");
const global = frame.slice(frame.indexOf("is-single-command-bar"), frame.indexOf("data-command-mode=\"tool\""));

test("global dock: exactly five controls in the order כאן, שיתוף, רזיאל, עכשיו, עוד", () => {
  const at = (re) => { const m = global.match(re); assert.ok(m, String(re)); return m.index; };
  const order = [at(/<small>כאן<\/small>/), at(/<small>שיתוף<\/small>/), at(/<RazielOrb/), at(/"עכשיו"/), at(/<small>עוד<\/small>/)];
  assert.deepEqual([...order].sort((a, b) => a - b), order, "bar order");
  assert.match(global, /className="sod29-dock-share" onClick=\{openShare\}/);
  assert.match(global, /aria-label="עוד · פעולות, כלים, חיפוש ואזור אישי"/); assert.match(global, /onClick=\{openMore\}/);
  assert.doesNotMatch(global, /<small>גימטריה<\/small>/, "gimatria left the bar for a direct tile in עוד");
  assert.equal((global.match(/<button\b/g) || []).length + (global.match(/<RazielOrb/g) || []).length, 5);
});

test("each bar entry says whether its expansion is open; one expansion at a time", () => {
  assert.match(frame, /const barExpansion = transientKind === TRANSIENT\.MORE \? \(transient\?\.payload\?\.shareOnly \? "share" : "more"\) : transientKind === TRANSIENT\.CONTEXT \? "here" : null;/);
  assert.match(global, /aria-expanded=\{barExpansion === "here"\}/);
  assert.match(global, /aria-expanded=\{barExpansion === "share"\}/);
  assert.match(global, /aria-expanded=\{barExpansion === "more"\}/);
  assert.match(frame, /expansion="here"/); assert.match(frame, /expansion=\{shareOnly \? "share" : "more"\}/);
});

test("gimatria stays open to everyone: a direct tile in עוד with its own lock_number state, not behind כלים", () => {
  assert.match(frame, /onNumber=\{openGimatria\} numberLocked=\{numberLocked\}/);
  assert.match(frame, /const numberLocked = numberFeature\.loading \|\| numberFeature\.blocked;/);
  assert.match(panel, /<RoyalTile2029 icon="number" title="גימטריה"[^>]*onClick=\{onNumber\} disabled=\{numberLocked\}/);
  // "כאן" keeps its administrator lock; the redesign opens nothing new.
  assert.match(global, /className="sod29-dock-here" disabled=\{contextLocked\}/);
});

test("the full עוד panel keeps actions, tools, search and the personal area; sharing is the share-only panel", () => {
  const more = frame.slice(frame.indexOf("transientKind === TRANSIENT.MORE)"), frame.indexOf("transientKind === TRANSIENT.TOOLS)"));
  assert.match(more, /<MorePanel2029/); assert.match(more, /openAction\(inspectTarget\)/); assert.match(more, /onTools=\{openTools\}/); assert.match(more, /onSearch=\{openSiteSearch\}/);
  assert.match(panel, /data-share-owner="ShareActions"/); assert.match(panel, /onClick=\{onAction\}/); assert.match(panel, /onClick=\{onTools\}/);
  assert.match(panel, /\{!shareOnly \? null : share\?\.href \?/, "share appears only in the share-only expansion");
  assert.match(panel, /data-share-subject="true"/, "the share expansion names what is shared");
  const tools = frame.slice(frame.indexOf("transientKind === TRANSIENT.TOOLS)"), frame.indexOf("transientKind === TRANSIENT.RAZIEL_LOCKED)"));
  assert.match(tools, /חיפוש באתר/); assert.match(tools, /חזרה לעוד/);
});

test("research indicator: loaded on demand from the existing operation only, no store or poller of its own", () => {
  assert.match(frame, /const ResearchActivity2029 = React\.lazy\(\(\) => import\("\.\/ResearchActivity2029\.jsx"\)\);/);
  assert.match(frame, /const researchTask = research\.elsResearchOperation\?\.task \|\| null;/);
  const chip = readFileSync(new URL("../src/components/experience2029/ResearchActivity2029.jsx", import.meta.url), "utf8");
  assert.match(chip, /canonicalProgressPercent\(\{ current, total \}\)/);
  assert.doesNotMatch(chip, /localStorage|sessionStorage|indexedDB|fetch\(|supabase/);
  assert.match(chip, /role="progressbar"/); assert.match(chip, /aria-live="polite"/);
});
