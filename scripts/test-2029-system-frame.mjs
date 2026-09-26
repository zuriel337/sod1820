import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mergeResearchContext, normalizeResearchContext } from "../src/lib/research/researchContext.js";
import { resolveContextActions, resolveContextTools } from "../src/lib/research/contextualCapabilities.js";
import { isRazielNextAction } from "../src/lib/research/razielActionContract.js";

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
  /from\s+["\'][^"\']*\/NumberDrawer\.jsx["\']/i,
  /from\s+["\'][^"\']*\/numberDrawer\.js["\']/i,
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
assert.match(frame, /openAction/);
assert.match(frame, /openCapability/);
assert.match(frame, /openInspect/);
assert.match(frame, /openAttention/);
assert.match(frame, /openTools/);
assert.match(frame, /openRaziel/);
assert.match(frame, /openWorkspace/);
assert.match(frame, /closeTransient/);
assert.match(frame, /returnExact/);
assert.match(frame, /useResearch\(\)/);
assert.match(frame, /FrameState/);

// Experience Context is resolved once at the native System Frame seam and exposed
// through the same shell context to all native 2029 surfaces.
assert.match(frame, /resolveExperienceContext/);
assert.match(frame, /const experience = useMemo/);
assert.match(frame, /experience,/);
assert.match(frame, /data-experience-context=\{experience\.version\}/);
assert.match(frame, /data-frame-experience-surface=\{experience\.surface\}/);
assert.match(frame, /data-frame-experience-question=\{experience\.experience\.question\}/);
assert.match(frame, /data-frame-experience-spatial=\{experience\.spatial\.effectiveLevel\}/);
assert.match(frame, /prefers-reduced-motion: reduce/);
assert.match(frame, /experience\.motion\.timing\.duration/);


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

// Quick Inspect and Selection Intelligence stay temporary context projections. The native NumberDrawer2029 may be mounted as a 2029 projection, but the Legacy NumberDrawer/numberDrawer owners remain forbidden above.
assert.match(frame, /בחירה זמנית/);
assert.match(frame, /selectionchange/);
assert.match(frame, /בחירה זמנית אינה הופכת חיבור לעובדה/);
assert.match(frame, /מספר \/ ביטוי · בדיקה מהירה/);
assert.match(frame, /המעקב המלא יחובר בהמשך/);

// Cross-cutting actions consume canonical capability seams where they already exist.
assert.match(frame, /makeEntity/);
assert.match(frame, /ShareActions/);
assert.equal(frame.includes("shareOrCopy"), false, "2029 Frame must not bypass canonical ShareActions telemetry/URL semantics");
assert.match(frame, /channels=\{\["native", "copy"\]\}/);
assert.match(frame, /force/);

// Navigation may name World, but Frame operation must not hard-code World as the destination of inspect/search/tools.
const worldLiteralCount = [...frame.matchAll(/"\/world"/g)].length;
assert.equal(worldLiteralCount, 1, "System Frame may list World in global navigation but must not route generic actions through World");

// Raziel route-action consumer is fail-closed and presentation-only.
const validRazielRoute = {
  action: "raziel_route",
  contract_version: 1,
  route_action: "connect",
  label: "לחבר",
  task_mode: "discover_connections",
  preferred_home: "world",
  synthesis: { state: "composed", message_authority: "bundle.synthesis", local_message: null },
  guards: {
    semantic_action_only: true,
    no_navigation_execution: true,
    no_tool_execution: true,
    no_local_message_generation: true,
  },
};
assert.equal(isRazielNextAction(validRazielRoute), true);
assert.equal(isRazielNextAction({ ...validRazielRoute, route_action: "invented" }), false);
assert.equal(isRazielNextAction({ ...validRazielRoute, synthesis: { ...validRazielRoute.synthesis, local_message: "forbidden" } }), false);
assert.match(frame, /isRazielNextAction/);
assert.match(frame, /payload\?\.razielRouteAction/);
assert.match(frame, /razielRouteAction=\{transient\?\.payload\?\.razielRouteAction \|\| null\}/);
assert.match(frame, /data-raziel-route-action/);
assert.match(frame, /data-raziel-route-home/);
assert.match(frame, /routeActionValid \? <button/);
assert.match(frame, /type="button"\s*\n\s*disabled\s*\n\s*data-raziel-route-action/);

// Raziel is one compact presence with domain-semantic tokens, not truth/status color.
assert.match(tokens, /RAZIEL_PRESENCE/);
assert.match(tokens, /presence\/brand meaning only/i);
assert.match(frame, /RAZIEL_PRESENCE/);
assert.match(css, /sod29-raziel-orb/);
assert.match(css, /sod29-raziel-breathe/);
assert.equal(css.includes("#b94c4c"), false, "status/error styling must not introduce a local semantic color owner");


// Public-language projection: global chrome must not expose laboratory/Research OS jargon.
// Heichal may keep expert language inside its own workbench surface; this assertion is SystemFrame-only.
for (const forbiddenPublicCopy of [
  "קבע כפוקוס מחקר",
  "הוסף למחקר",
  "Research Context",
  "Research OS",
  "מחקר ישיר",
  "נוכחות מחקרית",
  "adapter pending",
  "runtime pending",
]) {
  assert.equal(frame.includes(forbiddenPublicCopy), false, `System Frame public copy must not expose lab jargon: ${forbiddenPublicCopy}`);
}
for (const preferredPublicCopy of [
  "התמקד בזה",
  "＋ שמור",
  "ההקשר שלך",
  "גילוי וכלים",
  "רזיאל · איתך כאן",
  "מה רזיאל רואה עכשיו",
]) {
  assert.equal(frame.includes(preferredPublicCopy), true, `missing public-language projection: ${preferredPublicCopy}`);
}

// Adaptive Command Island is an action surface, not a fixed global-navigation bar.
assert.match(frame, /sod29-command-island/);
assert.match(frame, /role="toolbar"/);
assert.match(frame, /<small>פקודה<\/small>/);
assert.match(frame, /<small>פעולה<\/small>/);
assert.match(frame, /<small>כלים<\/small>/);
assert.equal(frame.includes("<small>מספר</small>"), false, "Number must be a capability projection, not a permanent command-island owner");
assert.equal(frame.includes("<small>בדיקה</small>"), false, "Inspect must route through contextual Action rather than a permanent island slot");
assert.match(frame, /<small>עכשיו<\/small>/);
assert.match(frame, /data-raziel-anchor="center"/);
assert.match(frame, /TRANSIENT\.CAPABILITY/);
assert.match(frame, /TRANSIENT\.ACTION/);
assert.match(frame, /capability === "number"/);
assert.match(frame, /מה שבחרת נשאר איתך כשנפתח כלי או עולם/);
assert.equal(frame.includes('{ to: "/heichal", label: "היכל"'), false, "unopened Heichal must not be a System Frame navigation entry");
assert.match(css, /position:fixed/);
assert.equal(frame.includes("sod29-command-surface"), false, "superseded fixed command surface must not render");

const numberTarget = { type: "number", label: "358" };
const worldActions = resolveContextActions({ surface: "world", target: numberTarget });
const bookActions = resolveContextActions({ surface: "books", target: { type: "book", label: "ספר הפליאה" } });
const elsTools = resolveContextTools({ surface: "els", target: numberTarget });
const numberTools = resolveContextTools({ surface: "number", target: numberTarget });
assert.equal(worldActions.some((action) => action.capability === "number"), true);
assert.equal(worldActions.some((action) => action.href === "/world"), true);
assert.equal(bookActions.some((action) => action.label.includes("היכל")), false, "Book context must not expose unopened Heichal");
assert.equal(elsTools[0].capability, "number", "numeric target keeps Number capability available across surfaces");
assert.equal(elsTools.some((action) => action.href === "/books"), true);
assert.equal(numberTools.some((action) => action.href === "/world"), true);
assert.notDeepEqual(
  elsTools.map((action) => action.id),
  numberTools.map((action) => action.id),
  "tool ordering must adapt to the active surface without minting new capability identities",
);

// Keyboard, focus, safe-area, reduced-motion and direction readiness.
assert.match(frame, /event\.metaKey \|\| event\.ctrlKey/);
assert.match(frame, /event\.key === "Escape"/);
assert.match(frame, /event\.key !== "Tab"/);
assert.match(frame, /aria-modal="true"/);
assert.match(frame, /dir=\{direction\}/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /prefers-reduced-motion:reduce/);
for (const width of [390, 360, 320]) assert.match(css, new RegExp(`max-width:${width}px`));

// Mobile navigation is a real modal navigation projection with its own focus
// containment; it must not leak keyboard focus behind the backdrop.
assert.match(frame, /const navRef = useRef\(null\)/);
assert.match(frame, /const mobileMenuRef = useRef\(null\)/);
assert.match(frame, /if \(!navOpen \|\| !navRef\.current\) return undefined/);
assert.match(frame, /nav\.addEventListener\("keydown", trap\)/);
assert.match(frame, /id="sod29-mobile-navigation"/);
assert.match(frame, /ref=\{navRef\}/);
assert.match(frame, /aria-controls="sod29-mobile-navigation"/);
assert.match(frame, /data-autofocus/);
assert.match(frame, /closeMobileNav\(true\)/);

// Generic native surface exists independently of World-specific data/rendering.
assert.match(app, /path="\/2029"/);
assert.match(home, /<Sod2029Shell/);
assert.equal(frame.includes("fetchEntityHubProjection"), false);
assert.equal(frame.includes("explorerFacets"), false);
assert.equal(frame.includes("TopicConvergenceContent"), false);

console.log("2029 System Frame acceptance: PASS");
