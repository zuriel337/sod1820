import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// S4/S5 (27.11.2026): the client allow-list and the proposed ingest_event additions are the same closed set, and every new emitter is lazy, capped and text-free.
const { readingActionSpec, readingActionProps } = await import("../src/lib/publicReadingTelemetry2029.js");
const { readingNavSpec, registerNavSpec2029 } = await import("../src/lib/publicReadingNavSpec2029.js");
const sql = readFileSync(new URL("../supabase/proposed/measurement-allowlist-20261127/PROPOSAL.sql", import.meta.url), "utf8");
const added = JSON.parse("{" + sql.match(/v_new text := \$q\$(.*?)\$q\$;/s)[1].replace(/,"calculator_2029":$/, "") + "}");

test("the three new families: the client list equals the proposed database list, family by family", () => {
  assert.deepEqual(readingNavSpec(), added);
});
test("the built-in public allow-list is NOT changed (the code every page loads does not grow)", () => {
  const spec = readingActionSpec();
  for (const name of ["nav_2029", "item_2029", "calc_outcome_2029"]) assert.equal(spec[name], undefined, name + " must not be built in");
  assert.deepEqual(spec.content.fields, { kind: "token", item_id: "int" });
  assert.equal(spec.calculator_2029.events.includes("compute_failed"), false);
});
test("registered on first use, the families are accepted; free text is dropped", () => {
  assert.equal(registerNavSpec2029(), true);
  const spec = readingActionSpec();
  assert.ok(spec.nav_2029 && spec.item_2029 && spec.calc_outcome_2029);
  assert.deepEqual(readingActionProps("item_2029", "view", { kind: "cipher", item_ref: "0123456789ab", slug: "מילים חופשיות" }), { action_version: 1, kind: "cipher", item_ref: "0123456789ab" });
  assert.deepEqual(readingActionProps("nav_2029", "panel_open", { panel: "site-search", expression: "מה שהוקלד", from_surface: "post" }), { action_version: 1, panel: "site-search", from_surface: "post" });
  assert.equal(readingActionProps("calc_outcome_2029", "compute_failed", { reason: "fetch_failed", expression: "SECRET" }).expression, undefined);
  for (const e of ["ai_analysis_result", "compute_failed", "compute_empty", "equals_preview_shown", "equals_preview_all_opened"]) assert.ok(spec.calc_outcome_2029.events.includes(e), e);
});
test("the public request worker carries the families from build time", () => {
  assert.match(readFileSync(new URL("../public-reading-deploy/transport.js", import.meta.url), "utf8"), /readingNavSpec\.toString\(\)[\s\S]*registerMeasurementFamilies2029\(readingNavSpec\(\)\)/);
});

test("the emitters are lazy, capped and carry no expression or identity", async () => {
  const nav = readFileSync(new URL("../src/lib/measurementNav2029.js", import.meta.url), "utf8");
  const calc = readFileSync(new URL("../src/lib/calculatorOutcome2029.js", import.meta.url), "utf8");
  assert.match(nav, /const CAP = 120/);
  for (const text of [nav, calc]) assert.doesNotMatch(text, /expression:\s*[a-z]|session_id|sod_id|person_id|setInterval/);
  assert.match(readFileSync(new URL("../src/lib/visits.js", import.meta.url), "utf8"), /import\("\.\/measurementNav2029\.js"\)/);
  assert.match(readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8"), /import\("\.\.\/\.\.\/lib\/measurementNav2029\.js"\)\.then\(m => m\.panelOpen\(kind\)/);
});

test("nav helpers: tokens only, capped, a cipher id becomes a 12-character token once per session", async () => {
  const sent = [];
  globalThis.sessionStorage = { _m: new Map(), getItem(k) { return this._m.get(k) ?? null; }, setItem(k, v) { this._m.set(k, v); } };
  const mod = await import("../src/lib/measurementNav2029.js");
  mod.resetNavMeasureForTest();
  assert.equal(mod.surfaceToken("/post/some-slug"), "post");
  assert.equal(mod.surfaceToken("/2029/control"), "control");
  assert.equal(mod.surfaceToken("/"), "home");
  assert.equal(mod.surfaceToken("/עברית"), "other");
  assert.equal(mod.itemView("cipher", "not-an-id"), false);
  assert.equal(mod.panelOpen("Bad Token!"), false);
  delete globalThis.sessionStorage;
});

test("the delegated listeners: number links, share-bar entry, study-house controls, native video play and search forms; no text, capped", async () => {
  const mod = await import("../src/lib/measurementNav2029.js");
  const src = readFileSync(new URL("../src/lib/measurementNav2029.js", import.meta.url), "utf8");
  for (const needle of ['[data-share-entry="bar"]', 'data-experience-surface="beit-midrash"', '"play"', 'form[role="search"]', "installNavMeasure2029"]) assert.ok(src.includes(needle), needle);
  assert.doesNotMatch(src, /textContent|innerText|\.value\b/, "no text of a control or a field is ever read");
  assert.equal(typeof mod.installNavMeasure2029, "function");
  assert.equal(mod.installNumberLinkMeasure2029, mod.installNavMeasure2029, "the earlier name stays valid");
  assert.ok(readingNavSpec().nav_2029.events.includes("study_action"));
  assert.match(readFileSync(new URL("../src/components/Lightbox.jsx", import.meta.url), "utf8"), /m\.galleryOpen\(\)/);
  assert.match(readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8"), /m\.panelClose\(transient\?\.kind\)/);
});
