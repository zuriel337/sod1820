// The System Frame and Home's width: a wide return must not change the width of Home's content column.
//
// What was wrong (proved with the evidence runner, desktop profile, 1440x900, Back from a Post): the first visit to Home has no context subject (content column 1180px, Home 1112px, slim
// capsule); the return has the subject the person left with (selectPost put the Post in the Research Context), the main stage marked itself `has-context-rail` and reserved an
// empty 286px column for a rail that is drawn in the companion capsule, so the column was 1046px (Home 978px), the capsule opened from 56 to 340px after Home had mounted, and every
// remembered height (settled boxes are keyed to the width they were measured at) was released: return CLS 0.16.
//
// Three layers, each with a control that shows the old behavior failing:
//   1. the two decisions (frameLayout2029.js) against a verbatim copy of the old rules, over every combination of the inputs;
//   2. the frame's real stylesheets in Chromium: whether the reservation changes the width the content column gets (relative: the wrappers here are a replica of the frame's, so the absolute
//      widths of the real app, 1180 -> 1046 at 1440, are the evidence runner's, recorded in docs/perf-evidence-20261016/closing-round/);
//   3. the frame source: it uses the decisions (a reverted inline rule fails here).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { autoPeekForSubject, stageReservesRail } from "../src/components/experience2029/frameLayout2029.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = (p) => readFileSync(join(here, "../src/components/experience2029", p), "utf8");

// ---- the old rules, verbatim (SystemFrame2029.jsx at f60d0788) -------------------------------------------------------------------------------------------------------
const legacyStageClass = ({ showContextRail }) => showContextRail;                                          // `sod29-main-stage${showContextRail ? " has-context-rail" : ""}`
const legacyAutoPeek = ({ companionHasContext, contextSubjectKey }) => Boolean(companionHasContext && contextSubjectKey);   // if (!companionHasContext) {...return} ... if (contextSubjectKey) setCompanionPeek(true)

const SURFACES = ["home", "post", "topic", "world", "number", "els", "books", "heichal", "calculator", "control", "community"];
const bools = [false, true];
const combos = () => SURFACES.flatMap((surface) => bools.flatMap((showContextRail) => bools.flatMap((companionActive) => bools.map((companionHasContext) => ({ surface, showContextRail, companionActive, companionHasContext })))));

test("Home with the rail in the capsule reserves no column; the old rule did (the failing control)", () => {
  const home = { surface: "home", showContextRail: true, companionActive: true, companionHasContext: true };
  assert.equal(legacyStageClass(home), true, "control: the old rule reserved the column");
  assert.equal(stageReservesRail(home), false);
  // Home's stage is the same with and without a subject on a wide screen: nothing a return adds changes the formatting context
  const without = { ...home, showContextRail: false, companionHasContext: false };
  assert.equal(stageReservesRail(home), stageReservesRail(without));
  assert.notEqual(legacyStageClass(home), legacyStageClass(without), "control: the old rule changed it");
});

test("every other surface and every other state keeps exactly the old stage rule", () => {
  for (const input of combos()) {
    const changed = input.surface === "home" && input.showContextRail && input.companionActive && input.companionHasContext;
    assert.equal(stageReservesRail(input), changed ? false : legacyStageClass(input), JSON.stringify(input));
  }
});

test("Home still reserves the column where the rail IS drawn in the stage (no capsule, or a surface without capsule context)", () => {
  assert.equal(stageReservesRail({ surface: "home", showContextRail: true, companionActive: false, companionHasContext: true }), true);    // under 981px the stage keeps its rule (the rail is hidden there)
  assert.equal(stageReservesRail({ surface: "home", showContextRail: true, companionActive: true, companionHasContext: false }), true);    // the capsule does not carry the context here
  assert.equal(stageReservesRail({ surface: "post", showContextRail: true, companionActive: true, companionHasContext: true }), true);     // Post / Topic / the rest: unchanged
});

test("a subject that Home was entered with does not open the capsule; a subject that appears while Home is shown still does", () => {
  const entered = { surface: "home", companionHasContext: true, contextSubjectKey: "post:slug", inheritedSubjectKey: "post:slug" };
  assert.equal(legacyAutoPeek(entered), true, "control: the old rule opened the capsule on a return");
  assert.equal(autoPeekForSubject(entered), false);
  assert.equal(autoPeekForSubject({ ...entered, inheritedSubjectKey: "" }), true);                       // it appeared after the frame mounted
  assert.equal(autoPeekForSubject({ ...entered, inheritedSubjectKey: "topic:other" }), true);           // it changed while Home was shown
  assert.equal(autoPeekForSubject({ ...entered, contextSubjectKey: "" }), false);                       // no subject, nothing to open for
  assert.equal(autoPeekForSubject({ ...entered, companionHasContext: false }), false);
});

test("every other surface keeps exactly the old auto-open rule (an inherited subject still opens the capsule there)", () => {
  for (const surface of SURFACES.filter((s) => s !== "home")) for (const companionHasContext of bools) for (const contextSubjectKey of ["", "post:a"]) for (const inheritedSubjectKey of ["", "post:a", "x:y"]) {
    const input = { surface, companionHasContext, contextSubjectKey, inheritedSubjectKey };
    assert.equal(autoPeekForSubject(input), legacyAutoPeek(input), JSON.stringify(input));
  }
});

test("the frame uses the decisions (an inline rule put back would fail here)", () => {
  const frame = src("SystemFrame2029.jsx");
  assert.match(frame, /import \{ autoPeekForSubject, stageReservesRail \} from "\.\/frameLayout2029\.js"/);
  assert.match(frame, /className=\{`sod29-main-stage\$\{stageReservesRail\(\{ surface, showContextRail, companionActive, companionHasContext \}\) \?/);
  assert.match(frame, /const inheritedSubjectKey = useRef\(contextSubjectKey\)/);
  assert.match(frame, /if \(autoPeekForSubject\(\{ surface, companionHasContext, contextSubjectKey, inheritedSubjectKey: inheritedSubjectKey\.current \}\)\) setCompanionPeek\(true\)/);
  assert.doesNotMatch(frame, /className=\{`sod29-main-stage\$\{showContextRail \?/);
  // the rail itself is still mounted in the stage only when the capsule does not carry it, and in the capsule when it does (the abilities are unchanged)
  assert.match(frame, /showContextRail && !\(companionActive && companionHasContext\) \? <SurfaceContextRail2029/);
  assert.match(frame, /contextNode=\{companionHasContext \? <SurfaceContextRail2029/);
});

// ---- the frame's real stylesheets: the width the content column gets ---------------------------------------------------------------------------------------------------
let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const skip = !chromium || !executablePath;
// the order the frame imports them in (SystemFrame2029.jsx, then CompanionPanel2029.jsx)
const CSS = ["sod2029.css", "sod2029-closed.css", "systemFrame2029.css", "myWorkspace2029.css", "discoveryGate2029.css", "systemToolDock2029.css", "systemFrame2029-unified-bar.css", "googleEntry2029.css", "companionPanel2029.css"]
  .map((name) => src(name).replace(/@import[^;]+;/g, "")).join("\n");
let browser = null;
test.before(async () => { if (!skip) browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] }); });
test.after(async () => { await browser?.close(); });

// the frame's own wrappers around the content column, with the classes the frame sets for a given assembly
async function measure(width, { reserve, mode = "slim", surface = "home" }) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.setContent(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>${CSS}\nbody{margin:0}</style></head><body>
      <div class="sod29-root closed-shell native-frame surface-${surface} sidebar-collapsed has-companion companion-${mode}" dir="rtl" data-frame-theme-preset="dark">
        <aside class="sod29-sidebar"></aside>
        <div class="sod29-main"><header class="sod29-header closed-orientation"></header>
          <div class="sod29-main-stage${reserve ? " has-context-rail" : ""}"><main class="sod29-content"><div id="probe" style="block-size:300px">content</div></main></div>
        </div>
        <aside class="sod29-companion is-${mode}"></aside>
      </div></body></html>`);
    return await page.evaluate(() => { const c = document.querySelector(".sod29-content").getBoundingClientRect(); return { w: Math.round(c.width), x: Math.round(c.left) }; });
  } finally { await page.close(); }
}

test("1440: the reservation narrows the content column; without it the column is at its full width", { skip }, async () => {
  const free = (await measure(1440, { reserve: false })).w, reserved = (await measure(1440, { reserve: true })).w;
  assert.equal(free, 1180);
  assert.ok(reserved < free - 100, `the reservation costs width at 1440 (${reserved} against ${free})`);
});

test("1440: Home's column is the same width on the first visit and on a return (control: it was 1180 then 1046)", { skip }, async () => {
  const firstVisit = { reserve: stageReservesRail({ surface: "home", showContextRail: false, companionActive: true, companionHasContext: false }) };
  const aReturn = { reserve: stageReservesRail({ surface: "home", showContextRail: true, companionActive: true, companionHasContext: true }) };
  const old = { first: { reserve: legacyStageClass({ showContextRail: false }) }, back: { reserve: legacyStageClass({ showContextRail: true }) } };
  assert.equal((await measure(1440, firstVisit)).w, (await measure(1440, aReturn)).w);
  assert.notEqual((await measure(1440, old.first)).w, (await measure(1440, old.back)).w, "control: the old assembly changed the width");
});

test("1920: the width never depended on the reservation there (this is why only the middle of the wide range failed); the frame is unchanged", { skip }, async () => {
  assert.equal((await measure(1920, { reserve: false })).w, 1180);
  assert.equal((await measure(1920, { reserve: true })).w, 1180);
});

test("Post keeps its reservation: its column at 1440 is as narrow as it was", { skip }, async () => {
  const post = stageReservesRail({ surface: "post", showContextRail: true, companionActive: true, companionHasContext: true });
  assert.equal(post, true);
  assert.equal((await measure(1440, { reserve: post, surface: "post" })).w, (await measure(1440, { reserve: true, surface: "post" })).w);
  assert.ok((await measure(1440, { reserve: post, surface: "post" })).w < (await measure(1440, { reserve: false, surface: "post" })).w - 100);
});
