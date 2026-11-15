import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// Replacement contract for the removed experimental Companion (ZURIEL 17.11.2026): the LEFT side of a Post / Topic is the context rail whose role is the two-level
// tree of the Post; the right side is the global rail; both are paired capsules. The Companion stays removed.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const rail = read("src/components/experience2029/SurfaceContextRail2029.jsx");
const spine = read("src/components/experience2029/SurfaceProgressSpine2029.jsx");
const page = read("src/pages/Post2029Page.jsx");
const bar = read("src/components/experience2029/systemFrame2029-unified-bar.css");

test("the experimental Companion is gone: no component, no stylesheet, no mount", () => {
  assert.equal(existsSync(new URL("../src/components/experience2029/CompanionPanel2029.jsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/components/experience2029/companionPanel2029.css", import.meta.url)), false);
  assert.doesNotMatch(frame, /CompanionPanel2029|<CompanionPanel/);
  assert.doesNotMatch(frame, /sod29-companion\b/);
});

test("the left rail is the Post's tree: derived two-level outline, hand-written regions still win, stations walk level 1, rows open closed blocks", () => {
  assert.match(page, /usePostOutline2029\(/);
  assert.match(page, /surfaceSections: useOutline \? postOutline\.map\(\(\{ id, label, targetId, level, parentId \}\)/);
  assert.match(page, /\.\.\.regions\.map\(\(region\) => \(\{\s*id: region\.id/);
  assert.match(rail, /sections\.filter\(\(item\) => item\?\.id && item\?\.label && item\.level !== 2\)/);
  assert.match(spine, /visibleOutlineRows\(/);
  assert.match(spine, /export function revealAndScrollTo/);
  assert.match(rail, /revealAndScrollTo\(/);
});

test("the two side capsules are one pair: same band tokens, same edge gap and radius, same Royal tokens", () => {
  assert.match(bar, /--s29-capsule-top: calc\(var\(--sod-review-offset, 0px\) \+ 78px\); --s29-capsule-bottom: 10px;/);
  assert.match(bar, /\.sod29-root\.closed-shell\.native-frame \.sod29-sidebar \{[^}]*inset-block-start: var\(--s29-capsule-top\) !important; inset-block-end: var\(--s29-capsule-bottom\) !important;/);
  assert.match(bar, /height: calc\(100dvh - var\(--s29-capsule-top\) - var\(--s29-capsule-bottom\)\) !important/);
  assert.equal((bar.match(/border-radius: 28px/g) || []).length >= 2, true);
  // both rails take the SAME three Royal tokens
  assert.match(bar, /\.sod29-sidebar,\s*\n\s*\.sod29-root\.closed-shell\.native-frame:is\(\.surface-post, \.surface-topic\) \.sod29-surface-context-rail \{[^}]*var\(--s29-rail-royal-border\)[^}]*var\(--s29-rail-royal-fill\)[^}]*var\(--s29-rail-royal-shadow\)/);
  // the footer sits between the capsules
  assert.match(bar, /:has\(\.sod29-main-stage\.has-context-rail\) :is\(\.sod29-living-ribbon, footer\.f29\)/);
});

test("one active-unit identity: written by ONE effect into the Research Context, held by an opening intent until a manual scroll, named once in the top bar with a way back to the Post", () => {
  assert.match(page, /activeUnitRef: id, activeUnitLabel: unit \? labelOf\(unit\) : ""/);
  assert.equal((page.match(/activeUnitRef: id/g) || []).length, 1, "a single writer of the active unit");
  // the tree/section writer never carries a stale copy of it back
  assert.match(page, /const \{ activeUnitRef: _unitRef, activeUnitLabel: _unitLabel, \.\.\.currentDimensions \}/);
  // an opening intent (?unit=) and a tree-row press hold the unit; wheel / touch / keys release it
  assert.match(page, /let held = wanted \|\| null;/);
  assert.match(page, /window\.addEventListener\("wheel", release/);
  assert.match(page, /window\.addEventListener\("touchmove", release/);
  assert.match(page, /document\.addEventListener\("click", onRowPress, true\)/);
  // leaving a Post clears it
  assert.match(page, /postUnitSeries: "", postUnitRefs: \[\], postUnitLinkRefs: \[\], activeUnitRef: "", activeUnitLabel: ""/);
  // the top bar: one segment of the existing orientation line (never a second bar), only on the route of that Post, with the way back
  assert.match(frame, /className="sod29-orientation-unit"/);
  assert.match(frame, /contextPath !== location\.pathname/);
  assert.match(frame, /className="sod29-orientation-back"/);
  assert.match(frame, /navigate\(activeUnitScope\.href, \{ state: \{ puWhole: true \} \}\)/);
});
