import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mergeResearchContext, normalizeResearchContext } from "../src/lib/research/researchContext.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const compat = read("src/components/experience2029/Sod2029Shell.jsx");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const css = read("src/components/experience2029/systemFrame2029.css");
const tokens = read("src/lib/designTokens.js");
const app = read("src/App2029.jsx");
const home = read("src/pages/Home2029Page.jsx");

// One implementation owner: old import path is a compatibility export, not a second frame.
assert.match(compat, /single active 2029 frame implementation/i);
assert.match(compat, /SystemFrame2029\.jsx/);
assert.equal(compat.includes("useState("), false, "compatibility shell must not own frame state");
assert.equal(compat.includes("<aside"), false, "compatibility shell must not render a competing frame");

// G3-A isolation remains intact: prose may name retired prototypes, but the native
// frame may not import or render those presentation owners/assets.
const forbiddenImportPatterns = [
  /from\s+["'][^"']*NumberDrawer/i,
  /from\s+["'][^"']*numberDrawer/i,
  /from\s+["'][^"']*BottomBar/i,
  /from\s+["'][^"']*siteUpdates/i,
  /from\s+["'][^"']*AskRaziel/i,
  /from\s+["'][^"']*UserCenter/i,
  /from\s+["'][^"']*SpaceBackground/i,
  /<AskRaziel\b/,
  /<UserCenter\b/,
  /<NumberDrawer\b/,
  /\/logo\.png/,
  /royal-bg\.jpg/,
];
for (const forbidden of forbiddenImportPatterns) {
  assert.equal(forbidden.test(frame), false, `native System Frame must not inherit legacy presentation: ${forbidden}`);
}

// Frame semantics: one transient coordinator, one Research Context, multiple projections.
assert.match(frame, /const \[transient, setTransient\] = useState\(null\)/);
assert.match(frame, /openCommand/);
assert.match(frame, /openInspect/);
assert.match(frame, /openAttention/);
assert.match(frame, /openTools/);
assert.match(frame, /openRaziel/);
assert.match(frame, /openWorkspace/);
assert.match(frame, /closeTransient/);
assert.match(frame, /returnExact/);
assert.match(frame, /useResearch\(\)/);
assert.match(frame, /FrameState/);

// Exact return is semantic restoration, not merely URL/back navigation. The existing
// Research Context owner now carries a bounded return snapshot and the Frame consumes it.
const exact = normalizeResearchContext({
  subject: { id: "1237", type: "number", label: "1237", href: "/world" },
  selection: { entityId: "1237", entityType: "number" },
  lens: "world",
  dimensions: { mode: "overview" },
  journey: { id: "journey-now", kind: "research", position: 9, findingId: "finding-now" },
  returnTo: {
    href: "/books/source-a?chapter=2#verse-4",
    label: "מקור א",
    subject: { id: "source-a", type: "book", label: "מקור א", href: "/books/source-a" },
    selection: { entityId: "verse-4", entityType: "source", locator: "chapter:2:verse:4", versionRef: "v3" },
    lens: "reading",
    dimensions: { chapter: 2, layer: "source" },
    journey: { id: "journey-a", kind: "source-path", position: 4, findingId: "finding-a" },
  },
});
assert.equal(exact.returnTo.href, "/books/source-a?chapter=2#verse-4");
assert.equal(exact.returnTo.subject.id, "source-a");
assert.equal(exact.returnTo.selection.entityId, "verse-4");
assert.equal(exact.returnTo.selection.locator, "chapter:2:verse:4");
assert.equal(exact.returnTo.lens, "reading");
assert.equal(exact.returnTo.dimensions.chapter, 2);
assert.equal(exact.returnTo.dimensions.layer, "source");
assert.equal(exact.returnTo.journey.id, "journey-a");
assert.equal(exact.returnTo.journey.position, 4);

const restored = mergeResearchContext(exact, {
  subject: exact.returnTo.subject,
  selection: exact.returnTo.selection,
  lens: exact.returnTo.lens,
  dimensions: exact.returnTo.dimensions,
  journey: exact.returnTo.journey,
  returnTo: null,
});
assert.deepEqual(restored.dimensions, { chapter: 2, layer: "source" }, "exact return must replace destination dimensions rather than leak-merge them");
assert.equal(restored.dimensions.mode, undefined);
assert.equal(restored.subject.id, "source-a");
assert.equal(restored.selection.locator, "chapter:2:verse:4");
assert.equal(restored.lens, "reading");
assert.equal(restored.journey.position, 4);
assert.equal(restored.returnTo, null);
assert.match(frame, /selection:\s*target\.selection \|\| null/);
assert.match(frame, /lens:\s*target\.lens \|\| null/);
assert.match(frame, /dimensions:\s*target\.dimensions \|\| null/);
assert.match(frame, /journey:\s*target\.journey \|\| null/);
assert.match(frame, /returnTo:\s*null/);

// Quick Inspect and Selection Intelligence are temporary context projections, not a NumberDrawer fork.
assert.match(frame, /TEMPORARY SELECTION/);
assert.match(frame, /selectionchange/);
assert.match(frame, /Selection זמני ≠ Finding ≠ Claim ≠ Canonical/);
assert.match(frame, /Quick Inspect seam פעיל/);
assert.match(frame, /Follow runtime נשאר ב־PR #486/);

// Cross-cutting actions consume canonical capability seams where they already exist.
assert.match(frame, /makeEntity/);
assert.match(frame, /shareOrCopy/);

// Navigation may name World, but Frame operation must not hard-code World as the destination of inspect/search/tools.
const worldLiteralCount = [...frame.matchAll(/"\/world"/g)].length;
assert.equal(worldLiteralCount, 1, "System Frame may list World in global navigation but must not route generic actions through World");

// Raziel is one compact presence with domain-semantic tokens, not truth/status color.
assert.match(tokens, /RAZIEL_PRESENCE/);
assert.match(tokens, /presence\/brand meaning only/i);
assert.match(frame, /RAZIEL_PRESENCE/);
assert.match(css, /sod29-raziel-orb/);
assert.match(css, /sod29-raziel-breathe/);
assert.equal(css.includes("#b94c4c"), false, "status/error styling must not introduce a local semantic color owner");

// Adaptive Command Island is an action surface, not a fixed global-navigation bar.
assert.match(frame, /sod29-command-island/);
assert.match(frame, /role="toolbar"/);
assert.match(css, /position:fixed/);
assert.equal(frame.includes("sod29-command-surface"), false, "superseded fixed command surface must not render");

// Keyboard, focus, safe-area, reduced-motion and direction readiness.
assert.match(frame, /event\.metaKey \|\| event\.ctrlKey/);
assert.match(frame, /event\.key === "Escape"/);
assert.match(frame, /event\.key !== "Tab"/);
assert.match(frame, /aria-modal="true"/);
assert.match(frame, /dir=\{direction\}/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /prefers-reduced-motion:reduce/);
for (const width of [390, 360, 320]) assert.match(css, new RegExp(`max-width:${width}px`));

// Generic native surface exists independently of World-specific data/rendering.
assert.match(app, /path="\/2029"/);
assert.match(home, /<Sod2029Shell/);
assert.equal(frame.includes("fetchEntityHubProjection"), false);
assert.equal(frame.includes("explorerFacets"), false);
assert.equal(frame.includes("TopicConvergenceContent"), false);

console.log("2029 System Frame acceptance: PASS");
