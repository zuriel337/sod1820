import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const css = read("src/components/experience2029/systemFrame2029.css");
const post = read("src/pages/Post2029Page.jsx");
const topic = read("src/pages/Topic2029Page.jsx");
const restoreCss = css.slice(css.indexOf("POST_TOPIC_PINNED_CONTEXT_RAIL_RESTORE_V1"));

test("Post and Topic publish sections/active/focus into Research Context", () => {
  for (const page of [post, topic]) {
    assert.match(page, /surfaceSections/);
    assert.match(page, /activeSectionId/);
    assert.match(page, /surfaceFocus/);
  }
});

test("desktop pinned region: sticky ~78px, viewport-bounded internal scroll, Post + Topic", () => {
  assert.match(restoreCss, /\.sod29-root\.surface-post \.sod29-surface-context-rail/);
  assert.match(restoreCss, /\.sod29-root\.surface-topic \.sod29-surface-context-rail/);
  assert.match(restoreCss, /position:sticky;\s*top:78px/);
  assert.match(restoreCss, /max-height:calc\(100vh - 98px\)/);
  assert.match(restoreCss, /overflow-y:auto/);
  assert.match(restoreCss, /overflow-x:clip/);
});

test("single pinned region: one rail mounted by the shared frame, no second drawer/rail", () => {
  // Same component: one pinned desktop mount + its own Bottom Context Sheet projection (sheet mode).
  assert.equal((frame.match(/<SurfaceContextRail2029/g) || []).length, 2);
  assert.equal((frame.match(/<SurfaceContextRail2029\s+sheet/g) || []).length, 1);
  assert.doesNotMatch(post + topic, /<SurfaceContextRail2029|<ContextualInspector2029/);
});

test("page map / section tabs / reading spine are non-sticky", () => {
  assert.match(restoreCss, /\.sod29-surface-tabs,[\s\S]*?\.sod29-reading-spine\{\s*position:static/);
});

test("mobile keeps capability as cue/sheet, rail hidden", () => {
  assert.match(css, /@media\(max-width:980px\)\{\s*\.sod29-main-stage\.has-context-rail\{display:block;padding-inline-end:0\}\s*\.sod29-surface-context-rail\{display:none\}/);
  assert.match(rail, /sod29-surface-context-mobile-cue/);
  assert.match(rail, /onClick=\{onOpenContext\}/);
  assert.doesNotMatch(restoreCss.split("@media(min-width:981px)")[0], /context-rail\{[^}]*position:sticky/);
});

test("REST -> FOCUS -> exact return semantics", () => {
  assert.match(rail, /restMode = documentSurface && !hasMethodContext && subject\?\.type !== "gematria_expression"/);
  assert.match(rail, /data-context-rail-mode=\{documentSurface \? \(restMode \? "rest" : "focus"\) : undefined\}/);
  // FOCUS is the only place the bounded expression block renders; REST never traces by reading.
  assert.match(rail, /restMode \? null : subject\.expression \? <div className="sod29-surface-context-expression"/);
  assert.doesNotMatch(rail, /GematriaReveal2029/);
  assert.match(rail, /const conceptKey = restMode \? null/);
  // Exact return stays the existing returnTo owner; rail reads (not stores) section/focus.
  assert.match(frame, /returnExact/);
  assert.match(rail, /context\?\.dimensions\?\.activeSectionId/);
});

test("rail points to in-body depth but does not duplicate it", () => {
  assert.match(rail, /sod29-surface-context-depth-pointer/);
  assert.match(rail, /scrollIntoView/);
  assert.doesNotMatch(rail, /tier[123]|Tier[123]|dangerouslySetInnerHTML/);
  assert.doesNotMatch(rail, /getElementById\([^)]*\)\??\.(innerHTML|textContent|cloneNode)/);
});

test("Glass Rolling Locator: single mobile affordance over the same rail, opens shared context sheet", () => {
  assert.match(rail, /glass-rolling-locator/);
  assert.match(rail, /useLocator \? <nav/);
  assert.match(rail, /sheet \? null/);
  assert.match(frame, /TRANSIENT\.CONTEXT/);
  assert.match(frame, /onOpenSheet=\{\(\) => openTransient\(TRANSIENT\.CONTEXT\)\}/);
  assert.match(css, /GLASS_ROLLING_LOCATOR_V1/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\s*\.sod29-glass-locator/);
  assert.match(css, /--s29-island-clearance/);
  assert.equal((rail.match(/sod29-glass-locator"/g) || []).length, 1);
});

test("Post/Topic finding focus => FOCUS mode, never REST; depth pointer gated by REST only", () => {
  const decl = rail.indexOf('const focusedFinding = subject?.type === "finding"');
  const rest = rail.indexOf("const restMode =");
  assert.ok(decl > -1 && rest > -1 && decl < rest, "focusedFinding declared before restMode");
  assert.match(rail, /const restMode = documentSurface && !hasMethodContext && subject\?\.type !== "gematria_expression" && !focusedFinding;/);
  assert.equal((rail.match(/const focusedFinding =/g) || []).length, 1);
  assert.match(rail, /\{restMode && activeSection \? <button className="sod29-surface-context-depth-pointer"/);
  assert.match(rail, /data-context-rail-mode=\{documentSurface \? \(restMode \? "rest" : "focus"\) : undefined\}/);
  // gematria-expression focus and normal REST semantics unchanged
  assert.match(rail, /subject\?\.type !== "gematria_expression"/);
  assert.match(rail, /restMode \? null : hasMethodContext/);
});
